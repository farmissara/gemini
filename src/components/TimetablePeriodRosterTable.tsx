import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  LocateFixed,
  LogIn,
  MapPin,
  Search,
  Smartphone,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  ClassroomGpsConfig,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../types';
import {
  findClassroomGpsConfig,
  saveClassroomGpsConfig,
} from '../lib/classroomGps';
import { isValidCoordinatePair } from '../lib/schoolGps';
import { BaseModal } from './common/BaseModal';
import { StatusBadge } from './common/StatusBadge';
import {
  resolveMatchedCourseForSlot,
  resolveSlotStudents,
  resolveStudentGateStatusForDate,
  resolveStudentLeaveForSlotDate,
  resolveTeacherSchoolStatusesForSlotDate,
} from '../lib/timetableAttendanceStatus';

export interface TimetablePeriodRosterTableProps {
  slot: TimetableSlot;
  selectedDate: string;
  onDateChange?: (date: string) => void;
  schoolId: string;
  courses: Course[];
  students: Student[];
  teachers?: Teacher[];
  schoolPeriods: SchoolPeriodTime[];
  attendance?: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  currentUser?: AuthUser | null;
  lang: AppLanguage;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
  showDatePicker?: boolean;
  showGpsEditorToggle?: boolean;
  compactHeader?: boolean;
}

type RosterFilter =
  | 'all'
  | 'unchecked'
  | 'gate_missing'
  | 'absent'
  | 'leave'
  | 'proxy'
  | 'mobile';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  official: 'ไปราชการ',
  vacation: 'ลาพักผ่อน',
};

export const TimetablePeriodRosterTable: React.FC<TimetablePeriodRosterTableProps> = ({
  slot,
  selectedDate,
  onDateChange,
  schoolId,
  courses,
  students,
  teachers = [],
  schoolPeriods,
  attendance = [],
  periodAttendance,
  leaveRequests = [],
  currentUser,
  lang,
  onRecordPeriodAttendance,
  showDatePicker = true,
  showGpsEditorToggle = true,
  compactHeader = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, 'present' | 'late' | 'absent' | 'excused'>
  >({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Classroom GPS editor state
  const [showGpsEditor, setShowGpsEditor] = useState(false);
  const [classroomGps, setClassroomGps] = useState<ClassroomGpsConfig | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [radiusInput, setRadiusInput] = useState(50);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<{
    message: string;
    tone: 'success' | 'error';
  } | null>(null);

  const matchedCourse = useMemo(
    () => resolveMatchedCourseForSlot(slot, courses),
    [courses, slot]
  );

  const resolvedCourseId = slot.courseId || matchedCourse?.id || slot.courseCode || 'course-slot';
  const resolvedRoomLabel = (slot.room || slot.classRoom || matchedCourse?.room || 'ห้องเรียน').trim();

  const periodMeta = useMemo(() => {
    const found = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
    return {
      startTime: found?.startTime || slot.startTime || '08:30',
      endTime: found?.endTime || slot.endTime || '09:20',
    };
  }, [schoolPeriods, slot]);

  const timeSlotText = `${periodMeta.startTime} - ${periodMeta.endTime}`;

  useEffect(() => {
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
  }, [slot.id, selectedDate, schoolId, resolvedCourseId, slot.room, slot.classRoom]);

  const slotStudents = useMemo(
    () => resolveSlotStudents(slot, courses, students),
    [slot, courses, students]
  );

  const recordsByStudentId = useMemo(() => {
    const map = new Map<string, PeriodAttendanceRecord>();
    periodAttendance.forEach((rec) => {
      const courseMatches =
        rec.courseId === resolvedCourseId ||
        (Boolean(slot.courseCode) && rec.courseCode.toLowerCase() === slot.courseCode.toLowerCase());
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
    slotStudents.forEach((st) => {
      const leave = resolveStudentLeaveForSlotDate(st, slot, selectedDate, leaveRequests);
      if (leave) map.set(st.id, leave);
    });
    return map;
  }, [slotStudents, slot, selectedDate, leaveRequests]);

  const gateStatusByStudentId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveStudentGateStatusForDate>>();
    slotStudents.forEach((st) => {
      map.set(st.id, resolveStudentGateStatusForDate(st, selectedDate, attendance));
    });
    return map;
  }, [slotStudents, selectedDate, attendance]);

  const teacherStatuses = useMemo(
    () =>
      resolveTeacherSchoolStatusesForSlotDate(
        slot,
        selectedDate,
        teachers,
        attendance,
        leaveRequests
      ),
    [slot, selectedDate, teachers, attendance, leaveRequests]
  );

  const stats = useMemo(() => {
    let checked = 0;
    let present = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;
    let proxyCount = 0;
    let mobileCount = 0;
    let gateNotChecked = 0;

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

      const gate = gateStatusByStudentId.get(st.id);
      if (!gate || (gate.status !== 'present' && gate.status !== 'late')) {
        gateNotChecked += 1;
      }
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
      gateNotChecked,
    };
  }, [slotStudents, recordsByStudentId, draftStatuses, gateStatusByStudentId]);

  const visibleStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return slotStudents.filter((st) => {
      const saved = recordsByStudentId.get(st.id);
      const leave = leaveByStudentId.get(st.id);
      const gate = gateStatusByStudentId.get(st.id);
      const effectiveStatus = draftStatuses[st.id] || saved?.status;

      if (rosterFilter === 'unchecked' && effectiveStatus) return false;
      if (rosterFilter === 'gate_missing' && (gate?.status === 'present' || gate?.status === 'late')) {
        return false;
      }
      if (rosterFilter === 'absent' && effectiveStatus !== 'absent') return false;
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
  }, [
    slotStudents,
    recordsByStudentId,
    leaveByStudentId,
    gateStatusByStudentId,
    rosterFilter,
    draftStatuses,
    searchQuery,
  ]);

  const teacherDisplayName =
    currentUser?.fullNameTh || currentUser?.fullNameEn || slot.teacherName || 'ครูผู้สอน';

  const handleInstantTeacherAccept = (
    student: Student,
    status: 'present' | 'late' | 'absent' | 'excused',
    isNoPhoneProxy = false
  ) => {
    if (!onRecordPeriodAttendance) return;
    const existing = recordsByStudentId.get(student.id);
    const statusLabelTh =
      status === 'present'
        ? 'มาเรียน'
        : status === 'late'
          ? 'มาสาย'
          : status === 'excused'
            ? 'ลา'
            : 'ขาดเรียน';
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
        : `ครูบันทึกสถานะ "${statusLabelTh}" จากตารางสอน (${slot.courseCode} คาบ ${slot.periodNumber})`,
    };
    onRecordPeriodAttendance([record]);
    setDraftStatuses((prev) => ({ ...prev, [student.id]: status }));
    setFeedbackMsg(
      isNoPhoneProxy
        ? `ครูกดรับเช็คชื่อแทน "${student.firstNameTh} ${student.lastNameTh}" และบันทึกลงฐานข้อมูลแล้ว`
        : `บันทึกสถานะ "${statusLabelTh}" ของ ${student.firstNameTh} ${student.lastNameTh} ลงฐานข้อมูลแล้ว`
    );
    window.setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleBulkMarkUnchecked = (defaultStatus: 'present' | 'absent') => {
    if (!onRecordPeriodAttendance) return;
    const recordsToSave: PeriodAttendanceRecord[] = [];
    const nextDrafts: Record<string, 'present' | 'late' | 'absent' | 'excused'> = { ...draftStatuses };

    slotStudents.forEach((student) => {
      const existing = recordsByStudentId.get(student.id);
      if (existing || draftStatuses[student.id]) return;
      const leave = leaveByStudentId.get(student.id);
      const nextStatus: 'present' | 'late' | 'absent' | 'excused' =
        leave?.status === 'approved' ? 'excused' : defaultStatus;
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
            : nextStatus === 'absent'
              ? `ครูบันทึกขาดเรียนสำหรับนักเรียนที่ยังไม่เช็คชื่อ (${slot.courseCode} คาบ ${slot.periodNumber})`
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
    setFeedbackMsg(
      defaultStatus === 'absent'
        ? `บันทึกขาดเรียน/ลาสำหรับนักเรียนที่เหลือ ${recordsToSave.length} คนลงฐานข้อมูลแล้ว`
        : `บันทึกมาเรียน/ลาสำหรับนักเรียนที่เหลือ ${recordsToSave.length} คนลงฐานข้อมูลแล้ว`
    );
    window.setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleDetectClassroomGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg({
        message: 'อุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS อัตโนมัติ กรุณากรอกละติจูด/ลองจิจูดด้วยตนเอง',
        tone: 'error',
      });
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
        setGpsStatusMsg({
          message: `บันทึกพิกัดห้องเรียน ${resolvedRoomLabel} สำเร็จ (${lat}, ${lng} · รัศมี ${radiusInput} ม.)`,
          tone: 'success',
        });
      },
      () => {
        setIsLocatingGps(false);
        setGpsStatusMsg({
          message: 'ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตสิทธิ์ตำแหน่งหรือกรอกพิกัดด้วยตนเอง',
          tone: 'error',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveManualClassroomGps = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (!isValidCoordinatePair(lat, lng)) {
      setGpsStatusMsg({
        message: 'กรุณากรอกค่าละติจูด/ลองจิจูดที่ถูกต้อง',
        tone: 'error',
      });
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
    setGpsStatusMsg({
      message: `บันทึกพิกัดห้องเรียน ${resolvedRoomLabel} เรียบร้อยแล้ว`,
      tone: 'success',
    });
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Controls + Teacher Status + Summary */}
      <div
        className={`${
          compactHeader ? 'px-3 py-2.5' : 'px-4 sm:px-5 py-3'
        } border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5 shrink-0`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {showDatePicker && onDateChange && (
              <label className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text-body)]">
                <span>วันที่:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value || selectedDate)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs tabular-nums"
                />
              </label>
            )}
            {showGpsEditorToggle && (
              <button
                type="button"
                onClick={() => setShowGpsEditor(true)}
                aria-haspopup="dialog"
                aria-expanded={showGpsEditor}
                title={
                  classroomGps
                    ? `ตั้งค่าพิกัดห้องเรียน ${resolvedRoomLabel} ใหม่`
                    : `ยังไม่ตั้งพิกัดห้องเรียน ${resolvedRoomLabel}`
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
                  classroomGps
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {classroomGps
                    ? `พิกัดตั้งแล้ว · ${classroomGps.radiusMeters} ม.`
                    : 'ตั้งค่าพิกัด GPS'}
                </span>
              </button>
            )}
          </div>

          {onRecordPeriodAttendance && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleBulkMarkUnchecked('present')}
                disabled={stats.unchecked === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>เช็คมาเรียนทั้งหมด ({stats.unchecked})</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkMarkUnchecked('absent')}
                disabled={stats.unchecked === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition"
                title="บันทึกขาดเรียนสำหรับนักเรียนที่ยังไม่เช็คชื่อ (ถ้ามีใบลาอนุมัติจะบันทึกเป็น 'ลา' ให้อัตโนมัติ)"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>เช็คขาดที่เหลือ ({stats.unchecked})</span>
              </button>
            </div>
          )}
        </div>

        {/* Teacher School Check-in & Leave Status Banner */}
        {teacherStatuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs">
            <span className="font-bold text-[var(--color-text-muted)] shrink-0">สถานะครูผู้สอน:</span>
            {teacherStatuses.map((ts, idx) => (
              <div key={`${ts.teacherName}-${idx}`} className="inline-flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-[var(--color-text-title)]">{ts.teacherName}</span>
                {ts.status === 'checked_in' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold tabular-nums">
                    <LogIn className="w-3 h-3" />
                    <span>เข้าโรงเรียนแล้ว{ts.checkInTime ? ` ${ts.checkInTime} น.` : ''}</span>
                  </span>
                )}
                {ts.status === 'late' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-[11px] font-bold tabular-nums">
                    <Clock className="w-3 h-3" />
                    <span>เข้าโรงเรียนสาย{ts.checkInTime ? ` ${ts.checkInTime} น.` : ''}</span>
                  </span>
                )}
                {(ts.status === 'on_leave_approved' || ts.status === 'on_leave_pending') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[11px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      {ts.leave ? LEAVE_TYPE_LABELS[ts.leave.leaveType] || 'ลา' : 'ลา'} (
                      {ts.status === 'on_leave_approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'})
                      {ts.substituteTeacherName ? ` · ครูสอนแทน: ${ts.substituteTeacherName}` : ''}
                    </span>
                  </span>
                )}
                {ts.status === 'absent' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[11px] font-bold">
                    <span>ขาด / ไม่มาปฏิบัติหน้าที่</span>
                  </span>
                )}
                {ts.status === 'not_checked_in' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-semibold">
                    <span>ยังไม่เช็คอินเข้าโรงเรียน</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Classroom GPS Settings Popup */}
        {showGpsEditor && showGpsEditorToggle && (
          <BaseModal
            isOpen={showGpsEditor}
            onClose={() => setShowGpsEditor(false)}
            title="ตั้งค่าพิกัดห้องเรียน"
            subtitle={`${resolvedRoomLabel} · ${classroomGps ? `ตั้งแล้ว รัศมี ${classroomGps.radiusMeters} ม.` : 'ยังไม่ได้ตั้งค่า'}`}
            icon={<MapPin className="h-4 w-4 text-[var(--color-primary-text)]" />}
            maxWidthClass="max-w-xl"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setShowGpsEditor(false)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-4 py-2 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card)] cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualClassroomGps}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                >
                  บันทึกพิกัดห้อง
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div
                className={`rounded-xl border p-3 text-xs font-semibold ${
                  classroomGps
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                }`}
              >
                {classroomGps
                  ? `ตั้งพิกัดห้องเรียนแล้ว · รัศมี ${classroomGps.radiusMeters} เมตร`
                  : 'ยังไม่ตั้งพิกัดห้องเรียน กรุณาตั้งค่าก่อนเช็คชื่อรายคาบ'}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  step="0.000001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  aria-label="ละติจูด"
                  placeholder="ละติจูด (เช่น 13.736717)"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs font-mono text-[var(--color-text-title)]"
                />
                <input
                  type="number"
                  step="0.000001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  aria-label="ลองจิจูด"
                  placeholder="ลองจิจูด (เช่น 100.523186)"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs font-mono text-[var(--color-text-title)]"
                />
                <select
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(Number(e.target.value))}
                  aria-label="รัศมีพิกัดห้องเรียน"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs text-[var(--color-text-title)]"
                >
                  {[20, 30, 50, 80, 100, 150, 200].map((r) => (
                    <option key={r} value={r}>
                      รัศมี {r} เมตร
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleDetectClassroomGps}
                disabled={isLocatingGps}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
              >
                <LocateFixed className={`h-3.5 w-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                <span>{isLocatingGps ? 'กำลังอ่านพิกัด...' : 'ใช้ตำแหน่งปัจจุบันและบันทึก'}</span>
              </button>

              {gpsStatusMsg && (
                <p
                  role={gpsStatusMsg.tone === 'error' ? 'alert' : 'status'}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    gpsStatusMsg.tone === 'error'
                      ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  }`}
                >
                  {gpsStatusMsg.message}
                </p>
              )}
            </div>
          </BaseModal>
        )}

        {/* Summary Strip + Search + Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold tabular-nums">
            <StatusBadge size="xs" status="neutral" label={`ทั้งหมด ${stats.total}`} />
            <StatusBadge size="xs" status="complete" label={`มาเรียน ${stats.present}`} />
            <StatusBadge size="xs" status="pending" label={`สาย ${stats.late}`} />
            <StatusBadge size="xs" status="info" label={`ลา ${stats.excused}`} />
            <StatusBadge size="xs" status="delayed" label={`ขาดเรียน ${stats.absent}`} />
            <StatusBadge size="xs" status="info" label={`รับแทน ${stats.proxyCount}`} />
            <StatusBadge size="xs" status="pending" label={`รอเช็ค ${stats.unchecked}`} />
          </div>

          <div className="relative w-full sm:w-56">
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
              { id: 'gate_missing', label: `ยังไม่เข้า รร. (${stats.gateNotChecked})` },
              { id: 'absent', label: `ขาดเรียน (${stats.absent})` },
              { id: 'leave', label: `มีใบลา (${leaveByStudentId.size})` },
              { id: 'proxy', label: `ครูกดรับแทน (${stats.proxyCount})` },
              { id: 'mobile', label: `สแกนมือถือ/QR (${stats.mobileCount})` },
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

      {/* Structured Roster Table with Explicit 'สถานะการเข้าเรียน' Column */}
      <div className="flex-1 min-h-0 overflow-auto">
        {visibleStudents.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-xs text-[var(--color-text-muted)]">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p>ไม่พบรายชื่อนักเรียนในเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead className="sticky top-0 z-10 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-title)]">
              <tr>
                <th className="py-2.5 pl-4 pr-2 w-10 text-center">#</th>
                <th className="py-2.5 px-2.5">
                  {lang === 'th' ? 'นักเรียน' : 'Student'}
                </th>
                <th className="py-2.5 px-2.5">
                  {lang === 'th' ? 'สถานะการเข้าเรียน (เช็คอิน / ลา)' : 'Attendance Status (Check-in / Leave)'}
                </th>
                {onRecordPeriodAttendance && (
                  <th className="py-2.5 pl-2.5 pr-4 text-right">
                    {lang === 'th' ? 'บันทึกสถานะรายคาบ' : 'Record Period Status'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-card)]">
              {visibleStudents.map((st, idx) => {
                const saved = recordsByStudentId.get(st.id);
                const leave = leaveByStudentId.get(st.id);
                const gate = gateStatusByStudentId.get(st.id);
                const currentStatus = draftStatuses[st.id] || saved?.status;
                const isPhoneChecked =
                  saved?.checkMethod === 'qr_code' || saved?.checkMethod === 'student_mobile';
                const isTeacherProxy = saved?.checkMethod === 'teacher_proxy';

                return (
                  <tr
                    key={st.id}
                    className="hover:bg-[var(--color-card-subtle)]/60 transition align-middle"
                  >
                    <td className="py-2.5 pl-4 pr-2 text-center text-[11px] font-mono font-bold text-[var(--color-text-muted)] tabular-nums">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={st.avatarUrl}
                          alt={st.firstNameTh}
                          className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {st.firstNameTh} {st.lastNameTh}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                            {st.studentIdNumber} · {st.gradeLevel} {st.room}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Automatic Status Column: Gate Check-in + Leave + Period Self Check-in */}
                    <td className="py-2.5 px-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* 1. School gate check-in status */}
                        {gate?.status === 'present' ? (
                          <StatusBadge
                            size="xs"
                            status="complete"
                            className="tabular-nums"
                            label={`เข้า รร.${gate.time ? ` ${gate.time}` : ''}`}
                          />
                        ) : gate?.status === 'late' ? (
                          <StatusBadge
                            size="xs"
                            status="pending"
                            className="tabular-nums"
                            label={`สาย รร.${gate.time ? ` ${gate.time}` : ''}`}
                          />
                        ) : gate?.status === 'absent' ? (
                          <StatusBadge size="xs" status="delayed" label="ขาด รร." />
                        ) : (
                          <StatusBadge size="xs" status="neutral" label="รอเช็คอิน รร." />
                        )}

                        {/* 2. Leave system status */}
                        {leave && (
                          <StatusBadge
                            size="xs"
                            status={leave.status === 'approved' ? 'info' : 'pending'}
                            title={leave.reason}
                            label={`${LEAVE_TYPE_LABELS[leave.leaveType] || 'ลา'} (${leave.status === 'approved' ? 'อนุมัติ' : 'รออนุมัติ'})`}
                          />
                        )}

                        {/* 3. Period check-in method / current status */}
                        {isPhoneChecked && (
                          <StatusBadge size="xs" status="complete" label="สแกน QR" />
                        )}
                        {isTeacherProxy && (
                          <StatusBadge size="xs" status="info" label="ครูบันทึก" />
                        )}
                        {currentStatus && !isPhoneChecked && !isTeacherProxy && (
                          <StatusBadge
                            size="xs"
                            status={
                              currentStatus === 'present'
                                ? 'complete'
                                : currentStatus === 'late'
                                  ? 'pending'
                                  : currentStatus === 'excused'
                                    ? 'info'
                                    : 'delayed'
                            }
                            label={
                              currentStatus === 'present'
                                ? 'มาเรียน'
                                : currentStatus === 'late'
                                  ? 'สาย'
                                  : currentStatus === 'excused'
                                    ? 'ลา'
                                    : 'ขาดเรียน'
                            }
                          />
                        )}
                      </div>
                      {leave?.reason && (
                        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)] truncate max-w-[260px]">
                          เหตุผลการลา: {leave.reason}
                        </p>
                      )}
                    </td>

                    {/* Teacher Action Column: 'มาเรียน' | 'สาย' | 'ลา' | 'ขาดเรียน' */}
                    {onRecordPeriodAttendance && (
                      <td className="py-2.5 pl-2.5 pr-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
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

                          <div className="inline-flex items-center gap-1">
                            {(
                              [
                                { id: 'present', label: 'มาเรียน' },
                                { id: 'late', label: 'สาย' },
                                { id: 'excused', label: 'ลา' },
                                { id: 'absent', label: 'ขาดเรียน' },
                              ] as const
                            ).map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleInstantTeacherAccept(st, option.id, false)}
                                aria-pressed={currentStatus === option.id}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                  currentStatus === option.id
                                    ? option.id === 'present'
                                      ? 'bg-emerald-700 text-white shadow-xs'
                                      : option.id === 'late'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : option.id === 'excused'
                                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                          : 'bg-rose-700 text-white shadow-xs'
                                    : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
