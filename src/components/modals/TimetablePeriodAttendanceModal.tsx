import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Search,
  Smartphone,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AuthUser,
  ClassroomGpsConfig,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  TimetableSlot,
} from '../../types';
import {
  findClassroomGpsConfig,
  saveClassroomGpsConfig,
} from '../../lib/classroomGps';
import { isValidCoordinatePair } from '../../lib/schoolGps';

interface TimetablePeriodAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: TimetableSlot | null;
  initialDate: string;
  schoolId: string;
  courses: Course[];
  students: Student[];
  schoolPeriods: SchoolPeriodTime[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  currentUser?: AuthUser | null;
  lang: AppLanguage;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
}

type RosterFilter = 'all' | 'unchecked' | 'proxy' | 'mobile' | 'leave';

function normalizeRoomToken(value?: string | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^ห้อง\s*/i, '')
    .replace(/^room\s*/i, '')
    .replace(/\s+/g, '');
}

export const TimetablePeriodAttendanceModal: React.FC<TimetablePeriodAttendanceModalProps> = ({
  isOpen,
  onClose,
  slot,
  initialDate,
  schoolId,
  courses,
  students,
  schoolPeriods,
  periodAttendance,
  leaveRequests = [],
  currentUser,
  lang,
  onRecordPeriodAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, 'present' | 'late' | 'absent' | 'excused'>
  >({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Classroom GPS inline editor state
  const [showGpsEditor, setShowGpsEditor] = useState(false);
  const [classroomGps, setClassroomGps] = useState<ClassroomGpsConfig | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [radiusInput, setRadiusInput] = useState(50);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  const matchedCourse = useMemo(() => {
    if (!slot) return undefined;
    return (
      courses.find((c) => slot.courseId && c.id === slot.courseId) ||
      courses.find((c) => c.code && slot.courseCode && c.code.toLowerCase() === slot.courseCode.toLowerCase())
    );
  }, [courses, slot]);

  const resolvedCourseId = slot?.courseId || matchedCourse?.id || slot?.courseCode || 'course-slot';
  const resolvedRoomLabel = (slot?.room || slot?.classRoom || matchedCourse?.room || 'ห้องเรียน').trim();

  const periodMeta = useMemo(() => {
    if (!slot) return null;
    const found = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
    return {
      startTime: found?.startTime || slot.startTime || '08:30',
      endTime: found?.endTime || slot.endTime || '09:20',
    };
  }, [schoolPeriods, slot]);

  const timeSlotText = periodMeta ? `${periodMeta.startTime} - ${periodMeta.endTime}` : '08:30 - 09:20';

  useEffect(() => {
    if (!isOpen || !slot) return;
    setSelectedDate(initialDate);
    setSearchQuery('');
    setRosterFilter('all');
    setDraftStatuses({});
    setFeedbackMsg(null);
    setGpsStatusMsg(null);

    const existingGps = findClassroomGpsConfig(schoolId, {
      courseId: resolvedCourseId,
      room: slot.room,
      classRoom: slot.classRoom,
    });
    setClassroomGps(existingGps);
    setLatInput(existingGps ? String(existingGps.lat) : '');
    setLngInput(existingGps ? String(existingGps.lng) : '');
    setRadiusInput(existingGps?.radiusMeters || 50);
    setShowGpsEditor(false);
  }, [isOpen, slot, initialDate, schoolId, resolvedCourseId]);

  const slotStudents = useMemo(() => {
    if (!slot) return [];
    // 1. Enrolled students in linked course
    if (matchedCourse?.enrolledStudentIds && matchedCourse.enrolledStudentIds.length > 0) {
      const idSet = new Set(matchedCourse.enrolledStudentIds);
      const enrolled = students.filter((s) => idSet.has(s.id));
      if (enrolled.length > 0) return enrolled;
    }

    // 2. Match by classroom / room token
    const slotRoomTokens = [slot.classRoom, slot.room, matchedCourse?.room]
      .map((r) => normalizeRoomToken(r))
      .filter(Boolean);
    if (slotRoomTokens.length > 0) {
      const byRoom = students.filter((s) => {
        const stuRoom = normalizeRoomToken(s.room);
        const stuGradeRoom = normalizeRoomToken(`${s.gradeLevel}${s.room}`);
        const enrolledRooms = (s.enrolledRooms || []).map((r) => normalizeRoomToken(r));
        return slotRoomTokens.some(
          (tok) =>
            (stuRoom && (tok === stuRoom || tok.includes(stuRoom) || stuRoom.includes(tok))) ||
            (stuGradeRoom && (tok.includes(stuGradeRoom) || stuGradeRoom.includes(tok))) ||
            enrolledRooms.some((er) => er && (tok.includes(er) || er.includes(tok)))
        );
      });
      if (byRoom.length > 0) return byRoom;
    }

    // 3. Fallback to all students in school so teachers can always take roll
    return students;
  }, [slot, matchedCourse, students]);

  const recordsByStudentId = useMemo(() => {
    const map = new Map<string, PeriodAttendanceRecord>();
    if (!slot) return map;
    periodAttendance.forEach((rec) => {
      const courseMatches =
        rec.courseId === resolvedCourseId ||
        (slot.courseCode && rec.courseCode.toLowerCase() === slot.courseCode.toLowerCase());
      if (
        courseMatches &&
        rec.periodNumber === slot.periodNumber &&
        rec.date === selectedDate &&
        (rec.recordType || 'check_in') === 'check_in'
      ) {
        map.set(rec.studentId, rec);
      }
    });
    return map;
  }, [periodAttendance, resolvedCourseId, selectedDate, slot]);

  const leaveByStudentId = useMemo(() => {
    const map = new Map<string, LeaveRequest>();
    leaveRequests.forEach((req) => {
      if (req.userRole !== 'student') return;
      if (req.status === 'rejected') return;
      if (req.startDate <= selectedDate && req.endDate >= selectedDate) {
        if (req.leaveScope === 'period_hourly' && req.periodNumber && slot && req.periodNumber !== slot.periodNumber) {
          return;
        }
        map.set(req.userId, req);
      }
    });
    return map;
  }, [leaveRequests, selectedDate, slot]);

  const stats = useMemo(() => {
    let checked = 0;
    let present = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;
    let proxyCount = 0;
    let mobileCount = 0;

    slotStudents.forEach((st) => {
      const saved = recordsByStudentId.get(st.id);
      const effectiveStatus = draftStatuses[st.id] || saved?.status;
      if (effectiveStatus) {
        checked += 1;
        if (effectiveStatus === 'present') present += 1;
        else if (effectiveStatus === 'late') late += 1;
        else if (effectiveStatus === 'excused') excused += 1;
        else if (effectiveStatus === 'absent') absent += 1;
      }
      if (saved?.checkMethod === 'teacher_proxy') proxyCount += 1;
      if (saved?.checkMethod === 'qr_code' || saved?.checkMethod === 'student_mobile') mobileCount += 1;
    });

    return {
      total: slotStudents.length,
      checked,
      unchecked: Math.max(0, slotStudents.length - checked),
      present,
      late,
      excused,
      absent,
      proxyCount,
      mobileCount,
    };
  }, [slotStudents, recordsByStudentId, draftStatuses]);

  const visibleStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return slotStudents.filter((st) => {
      const saved = recordsByStudentId.get(st.id);
      const leave = leaveByStudentId.get(st.id);
      if (rosterFilter === 'unchecked' && (saved || draftStatuses[st.id])) return false;
      if (rosterFilter === 'proxy' && saved?.checkMethod !== 'teacher_proxy') return false;
      if (
        rosterFilter === 'mobile' &&
        saved?.checkMethod !== 'qr_code' &&
        saved?.checkMethod !== 'student_mobile'
      ) {
        return false;
      }
      if (rosterFilter === 'leave' && !leave) return false;

      if (!q) return true;
      return (
        `${st.firstNameTh} ${st.lastNameTh}`.toLowerCase().includes(q) ||
        `${st.firstNameEn} ${st.lastNameEn}`.toLowerCase().includes(q) ||
        (st.studentIdNumber || '').toLowerCase().includes(q) ||
        (st.room || '').toLowerCase().includes(q)
      );
    });
  }, [slotStudents, recordsByStudentId, leaveByStudentId, rosterFilter, draftStatuses, searchQuery]);

  if (!isOpen || !slot) return null;

  const teacherDisplayName =
    currentUser?.fullNameTh || currentUser?.fullNameEn || slot.teacherName || 'ครูผู้สอน';

  const handleInstantTeacherAccept = (
    student: Student,
    status: 'present' | 'late' | 'absent' | 'excused',
    isNoPhoneProxy = false
  ) => {
    if (!onRecordPeriodAttendance) return;
    const existing = recordsByStudentId.get(student.id);
    const record: PeriodAttendanceRecord = {
      id: existing?.id || `patt-tt-${Date.now()}-${student.id}`,
      schoolId,
      courseId: resolvedCourseId,
      courseCode: slot.courseCode,
      periodNumber: slot.periodNumber,
      timeSlot: timeSlotText,
      date: selectedDate,
      studentId: student.id,
      status,
      recordType: 'check_in',
      verifiedByTeacherId: currentUser?.id || 'usr-teacher',
      verifiedByTeacherName: teacherDisplayName,
      checkMethod: 'teacher_proxy',
      remarks: isNoPhoneProxy
        ? `ครูกดรับเช็คชื่อแทน (นักเรียนไม่มีมือถือ) · คาบ ${slot.periodNumber} ${slot.courseCode}`
        : `ครูเช็คชื่อจากหน้าตารางสอน (${slot.courseCode} คาบ ${slot.periodNumber})`,
    };
    onRecordPeriodAttendance([record]);
    setDraftStatuses((prev) => ({ ...prev, [student.id]: status }));
    setFeedbackMsg(
      isNoPhoneProxy
        ? `ครูกดรับเช็คชื่อแทน "${student.firstNameTh} ${student.lastNameTh}" (กรณีไม่มีมือถือ) เรียบร้อยแล้ว`
        : `อัปเดตสถานะ "${student.firstNameTh} ${student.lastNameTh}" เรียบร้อยแล้ว`
    );
    window.setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleMarkAllUncheckedPresent = () => {
    if (!onRecordPeriodAttendance) return;
    const recordsToSave: PeriodAttendanceRecord[] = [];
    const nextDrafts: Record<string, 'present' | 'late' | 'absent' | 'excused'> = { ...draftStatuses };

    slotStudents.forEach((student) => {
      const existing = recordsByStudentId.get(student.id);
      if (existing) return;
      const leave = leaveByStudentId.get(student.id);
      const nextStatus: 'present' | 'late' | 'absent' | 'excused' =
        draftStatuses[student.id] || (leave?.status === 'approved' ? 'excused' : 'present');
      nextDrafts[student.id] = nextStatus;
      recordsToSave.push({
        id: `patt-tt-${Date.now()}-${student.id}`,
        schoolId,
        courseId: resolvedCourseId,
        courseCode: slot.courseCode,
        periodNumber: slot.periodNumber,
        timeSlot: timeSlotText,
        date: selectedDate,
        studentId: student.id,
        status: nextStatus,
        recordType: 'check_in',
        verifiedByTeacherId: currentUser?.id || 'usr-teacher',
        verifiedByTeacherName: teacherDisplayName,
        checkMethod: 'teacher_proxy',
        remarks:
          nextStatus === 'excused' && leave
            ? `ลาตามใบลาอนุมัติ (${leave.reason})`
            : `ครูกดรับเช็คชื่อจากตารางสอน (${slot.courseCode} คาบ ${slot.periodNumber})`,
      });
    });

    if (recordsToSave.length === 0) {
      setFeedbackMsg('นักเรียนทุกคนในคาบนี้ถูกเช็คชื่อเรียบร้อยแล้ว');
      window.setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    onRecordPeriodAttendance(recordsToSave);
    setDraftStatuses(nextDrafts);
    setFeedbackMsg(`บันทึกเช็คชื่อนักเรียนที่เหลือจำนวน ${recordsToSave.length} คนเรียบร้อยแล้ว`);
    window.setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleDetectClassroomGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('อุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณากรอกละติจูด/ลองจิจูดด้วยตนเอง');
      return;
    }
    setIsLocatingGps(true);
    setGpsStatusMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatInput(String(lat));
        setLngInput(String(lng));
        saveClassroomGpsConfig(schoolId, {
          roomLabel: resolvedRoomLabel,
          courseId: resolvedCourseId,
          lat,
          lng,
          radiusMeters: radiusInput,
          updatedBy: teacherDisplayName,
        });
        const fresh = findClassroomGpsConfig(schoolId, {
          courseId: resolvedCourseId,
          room: slot.room,
          classRoom: slot.classRoom,
        });
        setClassroomGps(fresh);
        setIsLocatingGps(false);
        setGpsStatusMsg(`บันทึกพิกัดห้องเรียน ${resolvedRoomLabel} สำเร็จ (${lat}, ${lng} · รัศมี ${radiusInput} ม.)`);
      },
      () => {
        setIsLocatingGps(false);
        setGpsStatusMsg('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตสิทธิ์ตำแหน่งหรือกรอกพิกัดด้วยตนเอง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveManualClassroomGps = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (!isValidCoordinatePair(lat, lng)) {
      setGpsStatusMsg('กรุณากรอกค่าละติจูด/ลองจิจูดที่ถูกต้อง');
      return;
    }
    saveClassroomGpsConfig(schoolId, {
      roomLabel: resolvedRoomLabel,
      courseId: resolvedCourseId,
      lat,
      lng,
      radiusMeters: radiusInput,
      updatedBy: teacherDisplayName,
    });
    const fresh = findClassroomGpsConfig(schoolId, {
      courseId: resolvedCourseId,
      room: slot.room,
      classRoom: slot.classRoom,
    });
    setClassroomGps(fresh);
    setGpsStatusMsg(`บันทึกพิกัดห้องเรียน ${resolvedRoomLabel} เรียบร้อยแล้ว`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-period-roster-title"
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] flex items-start justify-between gap-3 shrink-0 bg-[var(--color-card)]">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                {slot.courseCode}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-bold">
                <Clock className="w-3 h-3" />
                <span>
                  {lang === 'th'
                    ? `คาบที่ ${slot.periodNumber} (${timeSlotText})`
                    : `Period ${slot.periodNumber} (${timeSlotText})`}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                · {slot.classRoom} · {resolvedRoomLabel}
              </span>
            </div>
            <h3
              id="timetable-period-roster-title"
              className="text-base font-bold text-[var(--color-text-title)] truncate"
            >
              {lang === 'th'
                ? `รายชื่อและเช็คชื่อนักเรียน — ${slot.courseTitleTh}`
                : `Period Roster & Attendance — ${slot.courseTitleEn || slot.courseTitleTh}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างเช็คชื่อรายคาบ"
            className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls + Classroom GPS Status */}
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-body)]">
                <span>วันที่:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || initialDate)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowGpsEditor((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
                  classroomGps
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {classroomGps
                    ? `พิกัดห้องเรียน: รัศมี ${classroomGps.radiusMeters} ม.`
                    : 'ยังไม่ตั้งพิกัดห้องเรียน (คลิกตั้งค่า)'}
                </span>
              </button>
            </div>

            {onRecordPeriodAttendance && (
              <button
                type="button"
                onClick={handleMarkAllUncheckedPresent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>เช็คเข้าเรียนทั้งหมด ({stats.unchecked} คนที่เหลือ)</span>
              </button>
            )}
          </div>

          {/* Inline Classroom GPS Setter */}
          {showGpsEditor && (
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>ตั้งค่าพิกัดห้องเรียน ({resolvedRoomLabel}) สำหรับเช็คชื่อคาบนี้</span>
                </span>
                <button
                  type="button"
                  onClick={handleDetectClassroomGps}
                  disabled={isLocatingGps}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGps ? 'กำลังอ่านพิกัด...' : 'ดึงพิกัดห้องเรียนปัจจุบัน'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="number"
                  step="0.000001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="ละติจูด (เช่น 13.736717)"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-mono"
                />
                <input
                  type="number"
                  step="0.000001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="ลองจิจูด (เช่น 100.523186)"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-mono"
                />
                <select
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
                >
                  {[20, 30, 50, 80, 100, 150, 200].map((r) => (
                    <option key={r} value={r}>
                      รัศมี {r} เมตร
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveManualClassroomGps}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                >
                  บันทึกพิกัดห้อง
                </button>
              </div>
              {gpsStatusMsg && (
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{gpsStatusMsg}</p>
              )}
            </div>
          )}

          {/* Summary Strip + Search + Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold tabular-nums">
              <span className="px-2 py-0.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]">
                ทั้งหมด {stats.total}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                เข้าเรียน {stats.present}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                สาย {stats.late}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
                ครูกดรับแทน {stats.proxyCount}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                ยังไม่เช็ค {stats.unchecked}
              </span>
            </div>

            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัสนักเรียน..."
                className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {(
              [
                { id: 'all', label: `ทั้งหมด (${slotStudents.length})` },
                { id: 'unchecked', label: `ยังไม่เช็คชื่อ (${stats.unchecked})` },
                { id: 'proxy', label: `ครูกดรับแทน (${stats.proxyCount})` },
                { id: 'mobile', label: `สแกนมือถือ/QR (${stats.mobileCount})` },
                { id: 'leave', label: `มีใบลา (${leaveByStudentId.size})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRosterFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md border font-semibold cursor-pointer transition ${
                  rosterFilter === tab.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {feedbackMsg && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>

        {/* Roster List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--color-border)] px-4 sm:px-5">
          {visibleStudents.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-xs text-[var(--color-text-muted)]">
              <Users className="w-8 h-8 mx-auto opacity-50" />
              <p>ไม่พบรายชื่อนักเรียนในเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            visibleStudents.map((st, idx) => {
              const saved = recordsByStudentId.get(st.id);
              const leave = leaveByStudentId.get(st.id);
              const currentStatus = draftStatuses[st.id] || saved?.status;
              const isPhoneChecked =
                saved?.checkMethod === 'qr_code' || saved?.checkMethod === 'student_mobile';
              const isTeacherProxy = saved?.checkMethod === 'teacher_proxy';

              return (
                <div
                  key={st.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-center text-[11px] font-mono font-bold text-[var(--color-text-muted)] shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <img
                      src={st.avatarUrl}
                      alt={st.firstNameTh}
                      className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {st.firstNameTh} {st.lastNameTh}
                        </span>
                        {isPhoneChecked && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>สแกนมือถือ</span>
                          </span>
                        )}
                        {isTeacherProxy && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 text-[10px] font-bold">
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>ครูกดรับแทน</span>
                          </span>
                        )}
                        {leave && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>
                              {leave.status === 'approved' ? 'ใบลาอนุมัติแล้ว' : 'ยื่นใบลารออนุมัติ'}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                        {st.studentIdNumber} · {st.gradeLevel} {st.room}
                      </p>
                    </div>
                  </div>

                  {onRecordPeriodAttendance && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      {!isPhoneChecked && (
                        <button
                          type="button"
                          onClick={() => handleInstantTeacherAccept(st, 'present', true)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            isTeacherProxy && currentStatus === 'present'
                              ? 'bg-sky-700 text-white border-sky-700'
                              : 'bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700'
                          }`}
                          title="กรณีนักเรียนไม่มีมือถือเช็คอิน กดปุ่มนี้เพื่อรับเช็คชื่อเข้าคาบแทนทันที"
                        >
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isTeacherProxy && currentStatus === 'present'
                              ? 'รับแทนแล้ว ✓'
                              : 'ไม่มีมือถือ · กดรับแทน'}
                          </span>
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        {(['present', 'late', 'excused', 'absent'] as const).map((pst) => (
                          <button
                            key={pst}
                            type="button"
                            onClick={() => handleInstantTeacherAccept(st, pst, false)}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                              currentStatus === pst
                                ? pst === 'present'
                                  ? 'bg-emerald-700 text-white'
                                  : pst === 'late'
                                    ? 'bg-amber-500 text-slate-950'
                                    : pst === 'excused'
                                      ? 'bg-[var(--color-primary)] text-white'
                                      : 'bg-rose-700 text-white'
                                : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                            }`}
                          >
                            {pst === 'present' ? 'มา' : pst === 'late' ? 'สาย' : pst === 'excused' ? 'ลา' : 'ขาด'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-2 shrink-0 text-xs">
          <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>บันทึกสถานะเช็คชื่อรายคาบแบบเรียลไทม์ทันทีที่กดปุ่ม</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold cursor-pointer"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
