import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DoorOpen,
  Download,
  Eye,
  HeartPulse,
  LayoutGrid,
  List,
  LogIn,
  MapPin,
  MessageSquare,
  Phone,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import AttendancePhoto, { resolveAttendancePhotoUrl } from './AttendancePhoto';
import {
  AppLanguage,
  AttendanceRecord,
  Course,
  InfirmaryVisit,
  LeaveRequest,
  PeriodAttendanceRecord,
  School,
  SchoolPeriodTime,
  Student,
  SystemConfig,
  Teacher,
  TimetableSlot,
  TuitionInvoice,
} from '../types';
import { NavTab } from './layout/Sidebar';
import { getLocalDateString } from '../lib/date';
import { getBangkokClockSnapshot, getTimetableSlotActivityStatus } from '../lib/timetableCalendar';
import {
  getSlotAttendanceAndLeaveSummary,
  resolveSlotStudents,
  resolveStudentGateStatusForDate,
  resolveStudentLeaveForSlotDate,
} from '../lib/timetableAttendanceStatus';
import { getSlotTeachers } from '../lib/timetableTeachers';

type DailyRadarMode = 'auto_full' | 'morning_gate' | 'classrooms';
type FaceWallFilter = 'all' | 'window_08_09' | 'present' | 'late' | 'with_photo' | 'teachers';
type FollowupTab = 'absent_unchecked' | 'approved_leave' | 'late_arrivals';
type ClassroomStatusFilter = 'all' | 'ready' | 'unopened' | 'current_period';
type ClassroomViewStyle = 'grid' | 'table';

interface ExecutiveRealtimeDailyPanelProps {
  school?: School;
  systemConfig: SystemConfig;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  leaveRequests?: LeaveRequest[];
  infirmaryVisits?: InfirmaryVisit[];
  invoices?: TuitionInvoice[];
  canViewFinancials?: boolean;
  lang?: AppLanguage;
  isTvMode?: boolean;
  onNavigate?: (tab: NavTab) => void;
  onOpenPhotoRecord?: (rec: AttendanceRecord) => void;
}

const DAY_NAMES_TH: Record<string, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
  sat: 'เสาร์',
  sun: 'อาทิตย์',
};

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getDayKeyFromDateStr(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 'mon';
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[d.getDay()] || 'mon';
}

function getCheckinMethodLabel(method?: string, lang: AppLanguage = 'th'): string {
  switch (method) {
    case 'mobile_selfie_gps':
      return lang === 'th' ? 'Selfie GPS' : 'Selfie GPS';
    case 'qr_scan':
      return lang === 'th' ? 'สแกน QR' : 'QR Scan';
    case 'nfc_card':
      return lang === 'th' ? 'บัตร NFC' : 'NFC Card';
    case 'teacher_proxy':
      return lang === 'th' ? 'ครูเช็กชื่อ' : 'Teacher Roll';
    default:
      return lang === 'th' ? 'เช็กชื่อเข้า' : 'Check-in';
  }
}

export const ExecutiveRealtimeDailyPanel: React.FC<ExecutiveRealtimeDailyPanelProps> = ({
  school,
  systemConfig,
  students,
  teachers,
  courses,
  attendance,
  periodAttendance = [],
  timetableSlots = [],
  schoolPeriods = [],
  leaveRequests = [],
  infirmaryVisits = [],
  invoices = [],
  canViewFinancials = true,
  lang = 'th',
  isTvMode = false,
  onNavigate,
  onOpenPhotoRecord,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const bangkokClock = useMemo(() => getBangkokClockSnapshot(now), [now]);
  const todayStr = bangkokClock.dateStr || getLocalDateString();
  const yesterdayStr = useMemo(
    () => getLocalDateString(new Date(Date.now() - 86400000)),
    []
  );

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [radarMode, setRadarMode] = useState<DailyRadarMode>('auto_full');
  const [faceFilter, setFaceFilter] = useState<FaceWallFilter>('all');
  const [followupTab, setFollowupTab] = useState<FollowupTab>('absent_unchecked');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [faceVisibleLimit, setFaceVisibleLimit] = useState<number>(18);

  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('auto');
  const [classroomStatusFilter, setClassroomStatusFilter] = useState<ClassroomStatusFilter>('all');
  const [classroomViewStyle, setClassroomViewStyle] = useState<ClassroomViewStyle>('grid');

  const [internalPhotoRecord, setInternalPhotoRecord] = useState<AttendanceRecord | null>(null);
  const [selectedClassroomDrawerId, setSelectedClassroomDrawerId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Live clock every 15 seconds so period status & time indicator update in real time
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const fallbackAvatarSvg = (name?: string) => {
    const letter = encodeURIComponent(((name || 'U').trim().charAt(0) || 'U').toUpperCase());
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="%23e2e8f0"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="%23334155">${letter}</text></svg>`;
  };

  const lateCutoffTime = systemConfig.lineNotificationSettings?.lateCutoffTime || '08:00';
  const lateCutoffMinutes = parseTimeToMinutes(lateCutoffTime) ?? 480;
  const isTodaySelected = selectedDate === todayStr;
  const isMorningPhaseNow = bangkokClock.minutes < 540; // Before 09:00

  const activeStudents = useMemo(() => {
    const list = students.filter((s) => s.status === 'active');
    return list.length > 0 ? list : students;
  }, [students]);

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const distinctRooms = useMemo(() => {
    const set = new Set<string>();
    activeStudents.forEach((s) => {
      const label = [s.gradeLevel, s.room].filter(Boolean).join(' · ') || s.room;
      if (label) set.add(label);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [activeStudents]);

  const getStudentRoomLabel = (stu?: Student): string => {
    if (!stu) return '';
    return [stu.gradeLevel, stu.room].filter(Boolean).join(' · ') || stu.room || '';
  };

  // All check-in records for the selected date (newest first)
  const dateGateCheckIns = useMemo(() => {
    return attendance
      .filter(
        (rec) =>
          rec.date === selectedDate &&
          (rec.recordType || 'check_in') === 'check_in'
      )
      .slice()
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  }, [attendance, selectedDate]);

  // Student gate breakdown for selectedDate
  const studentGateOverview = useMemo(() => {
    const presentList: Array<{ student: Student; record?: AttendanceRecord; time: string }> = [];
    const lateList: Array<{
      student: Student;
      record?: AttendanceRecord;
      time: string;
      lateMinutes: number;
    }> = [];
    const approvedLeaveList: Array<{ student: Student; leave?: LeaveRequest; record?: AttendanceRecord }> = [];
    const absentUncheckedList: Array<{ student: Student }> = [];

    const approvedStudentLeaves = leaveRequests.filter(
      (req) =>
        req.userRole === 'student' &&
        req.status === 'approved' &&
        req.startDate <= selectedDate &&
        req.endDate >= selectedDate
    );

    const leaveByStudentId = new Map<string, LeaveRequest>();
    approvedStudentLeaves.forEach((req) => {
      if (req.userId) leaveByStudentId.set(req.userId, req);
    });

    activeStudents.forEach((stu) => {
      if (roomFilter !== 'all' && getStudentRoomLabel(stu) !== roomFilter) return;

      const gate = resolveStudentGateStatusForDate(stu, selectedDate, attendance);
      const leave =
        leaveByStudentId.get(stu.id) ||
        approvedStudentLeaves.find(
          (req) =>
            (stu.studentIdNumber &&
              req.userId.trim().toLowerCase() === stu.studentIdNumber.trim().toLowerCase()) ||
            `${stu.firstNameTh} ${stu.lastNameTh}`.trim().toLowerCase() ===
              (req.userName || '').trim().toLowerCase()
        );

      if (gate.status === 'present') {
        presentList.push({ student: stu, record: gate.record, time: gate.time || '-' });
      } else if (gate.status === 'late') {
        const mins = parseTimeToMinutes(gate.time) ?? lateCutoffMinutes;
        lateList.push({
          student: stu,
          record: gate.record,
          time: gate.time || '-',
          lateMinutes: Math.max(0, mins - lateCutoffMinutes),
        });
      } else if (leave || gate.status === 'leave') {
        approvedLeaveList.push({ student: stu, leave, record: gate.record });
      } else {
        absentUncheckedList.push({ student: stu });
      }
    });

    lateList.sort((a, b) => b.lateMinutes - a.lateMinutes);

    const scopedTotal =
      presentList.length + lateList.length + approvedLeaveList.length + absentUncheckedList.length;
    const attendedCount = presentList.length + lateList.length;
    const attendanceRate = scopedTotal > 0 ? Math.round((attendedCount / scopedTotal) * 100) : 0;
    const onTimeRate = scopedTotal > 0 ? Math.round((presentList.length / scopedTotal) * 100) : 0;

    return {
      scopedTotal,
      attendedCount,
      attendanceRate,
      onTimeRate,
      presentList,
      lateList,
      approvedLeaveList,
      absentUncheckedList,
    };
  }, [activeStudents, attendance, lateCutoffMinutes, leaveRequests, roomFilter, selectedDate]);

  // Teacher daily presence & leave breakdown
  const teacherPresenceSummary = useMemo(() => {
    const teacherCheckInRecords = dateGateCheckIns.filter(
      (rec) => rec.userType === 'teacher' || Boolean(rec.teacherId)
    );
    const checkedIds = new Set<string>();
    const lateTeacherIds = new Set<string>();

    teacherCheckInRecords.forEach((rec) => {
      const id = rec.teacherId || rec.studentId || rec.userName;
      if (id) {
        checkedIds.add(id);
        if (rec.status === 'late') lateTeacherIds.add(id);
      }
    });

    const teacherLeavesToday = leaveRequests.filter(
      (req) =>
        req.userRole === 'teacher' &&
        req.status !== 'rejected' &&
        req.startDate <= selectedDate &&
        req.endDate >= selectedDate
    );

    return {
      totalTeachers: teachers.length,
      checkedInCount: Math.min(teachers.length || checkedIds.size, checkedIds.size),
      lateCount: lateTeacherIds.size,
      leaveCount: teacherLeavesToday.length,
      pendingLeaveCount: leaveRequests.filter((req) => req.status === 'pending').length,
    };
  }, [dateGateCheckIns, leaveRequests, selectedDate, teachers.length]);

  // Live Check-In Face Wall items (students + teachers who checked in today)
  const faceWallRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dateGateCheckIns.filter((rec) => {
      const isTeacher = rec.userType === 'teacher' || Boolean(rec.teacherId);
      const stu = !isTeacher ? studentById.get(rec.studentId) : undefined;
      if (roomFilter !== 'all' && !isTeacher && getStudentRoomLabel(stu) !== roomFilter) {
        return false;
      }
      if (faceFilter === 'teachers' && !isTeacher) return false;
      if (faceFilter === 'present' && rec.status !== 'present') return false;
      if (faceFilter === 'late' && rec.status !== 'late') return false;
      if (faceFilter === 'with_photo' && !rec.photoUrl && !rec.photoStoragePath) return false;
      if (faceFilter === 'window_08_09') {
        const mins = parseTimeToMinutes(rec.time);
        if (mins === null || mins < 480 || mins > 540) return false;
      }
      if (q) {
        const name = (rec.userName || '').toLowerCase();
        const dept = (rec.userDepartmentOrRoom || getStudentRoomLabel(stu) || '').toLowerCase();
        const method = getCheckinMethodLabel(rec.checkinMethod, lang).toLowerCase();
        return name.includes(q) || dept.includes(q) || method.includes(q);
      }
      return true;
    });
  }, [dateGateCheckIns, faceFilter, lang, roomFilter, searchQuery, studentById]);

  const window0809Count = useMemo(() => {
    return dateGateCheckIns.filter((rec) => {
      const mins = parseTimeToMinutes(rec.time);
      return mins !== null && mins >= 480 && mins <= 540;
    }).length;
  }, [dateGateCheckIns]);

  const withPhotoCount = useMemo(
    () => dateGateCheckIns.filter((rec) => Boolean(rec.photoUrl || rec.photoStoragePath)).length,
    [dateGateCheckIns]
  );

  // Classroom & Period Readiness Board (Post-09:00 / All periods for selected date's day of week)
  const selectedDayKey = useMemo(() => getDayKeyFromDateStr(selectedDate), [selectedDate]);
  const isSelectedWeekend = selectedDayKey === 'sat' || selectedDayKey === 'sun';

  const teachingPeriodsMeta = useMemo(() => {
    const nonBreak = schoolPeriods.filter((p) => !p.isBreak);
    if (nonBreak.length > 0) {
      return [...nonBreak].sort((a, b) => a.periodNumber - b.periodNumber);
    }
    const nums = Array.from(new Set(timetableSlots.map((s) => s.periodNumber))).sort((a, b) => a - b);
    return nums.map((num) => {
      const sample = timetableSlots.find((s) => s.periodNumber === num);
      return {
        periodNumber: num,
        startTime: sample?.startTime || `${String(7 + num).padStart(2, '0')}:30`,
        endTime: sample?.endTime || `${String(8 + num).padStart(2, '0')}:20`,
      };
    });
  }, [schoolPeriods, timetableSlots]);

  const classroomReadinessList = useMemo(() => {
    const daySlots = timetableSlots
      .filter((s) => s.dayOfWeek === selectedDayKey)
      .slice()
      .sort((a, b) => a.periodNumber - b.periodNumber || (a.classRoom || a.room || '').localeCompare(b.classRoom || b.room || '', 'th'));

    return daySlots.map((slot) => {
      const summary = getSlotAttendanceAndLeaveSummary({
        slot,
        dateStr: selectedDate,
        courses,
        students,
        teachers,
        attendance,
        periodAttendance,
        leaveRequests,
      });

      const periodMeta = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
      const timeRange =
        slot.startTime && slot.endTime
          ? `${slot.startTime}–${slot.endTime}`
          : periodMeta
            ? `${periodMeta.startTime}–${periodMeta.endTime}`
            : '';

      const slotActivity = isTodaySelected
        ? getTimetableSlotActivityStatus({
            slot,
            schoolPeriods,
            now: bangkokClock,
            schoolId: school?.id,
            targetDateStr: selectedDate,
          })
        : null;
      const activityStatus: 'active' | 'upcoming' | 'past' | 'holiday' | 'other_day' =
        !slotActivity
          ? 'other_day'
          : slotActivity.missionPhase === 'ended'
            ? 'past'
            : slotActivity.missionPhase;

      const isClassroomReady = summary.periodCheckedTotal > 0;
      const missingOrAbsentCount = Math.max(
        0,
        summary.expectedTotal - (summary.periodPresent + summary.periodLate + summary.periodExcused)
      );
      const completenessPercent =
        summary.expectedTotal > 0
          ? Math.min(100, Math.round((summary.periodCheckedTotal / summary.expectedTotal) * 100))
          : 0;
      const attendanceInClassPercent =
        summary.expectedTotal > 0
          ? Math.min(
              100,
              Math.round(((summary.periodPresent + summary.periodLate) / summary.expectedTotal) * 100)
            )
          : 0;

      const hasTeacherLeave = summary.teacherStatuses.some(
        (t) => t.status === 'on_leave_approved' || t.status === 'on_leave_pending'
      );
      const hasTeacherAtSchool = summary.teacherStatuses.some(
        (t) => t.status === 'checked_in' || t.status === 'late'
      );

      return {
        slot,
        summary,
        timeRange,
        activityStatus,
        isClassroomReady,
        missingOrAbsentCount,
        completenessPercent,
        attendanceInClassPercent,
        hasTeacherLeave,
        hasTeacherAtSchool,
      };
    });
  }, [
    attendance,
    bangkokClock,
    courses,
    isTodaySelected,
    leaveRequests,
    periodAttendance,
    schoolPeriods,
    selectedDate,
    selectedDayKey,
    students,
    teachers,
    timetableSlots,
  ]);

  const currentLivePeriodNumber = useMemo(() => {
    const activeItem = classroomReadinessList.find((item) => item.activityStatus === 'active');
    if (activeItem) return activeItem.slot.periodNumber;
    const upcomingItem = classroomReadinessList.find((item) => item.activityStatus === 'upcoming');
    if (upcomingItem) return upcomingItem.slot.periodNumber;
    return null;
  }, [classroomReadinessList]);

  const filteredClassrooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classroomReadinessList.filter((item) => {
      if (selectedPeriodFilter === 'auto') {
        if (classroomStatusFilter === 'current_period' && currentLivePeriodNumber !== null) {
          if (item.slot.periodNumber !== currentLivePeriodNumber) return false;
        }
      } else if (selectedPeriodFilter !== 'all') {
        if (String(item.slot.periodNumber) !== selectedPeriodFilter) return false;
      }

      if (classroomStatusFilter === 'ready' && !item.isClassroomReady) return false;
      if (classroomStatusFilter === 'unopened' && item.isClassroomReady) return false;
      if (classroomStatusFilter === 'current_period' && item.activityStatus !== 'active') return false;

      if (q) {
        const hay = `${item.slot.classRoom} ${item.slot.room} ${item.slot.courseCode} ${item.slot.courseTitleTh} ${getSlotTeachers(item.slot).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [classroomReadinessList, classroomStatusFilter, currentLivePeriodNumber, searchQuery, selectedPeriodFilter]);

  const readinessOverviewStats = useMemo(() => {
    const totalSlots = classroomReadinessList.length;
    const readySlots = classroomReadinessList.filter((r) => r.isClassroomReady).length;
    const unopenedSlots = totalSlots - readySlots;
    const activeNowSlots = classroomReadinessList.filter((r) => r.activityStatus === 'active').length;
    const teacherLeaveSlots = classroomReadinessList.filter((r) => r.hasTeacherLeave).length;
    const avgClassAttendancePct =
      readySlots > 0
        ? Math.round(
            classroomReadinessList
              .filter((r) => r.isClassroomReady)
              .reduce((sum, r) => sum + r.attendanceInClassPercent, 0) / readySlots
          )
        : 0;
    return {
      totalSlots,
      readySlots,
      unopenedSlots,
      activeNowSlots,
      teacherLeaveSlots,
      avgClassAttendancePct,
    };
  }, [classroomReadinessList]);

  // Infirmary & Pending Queue signals
  const operationalSignals = useMemo(() => {
    const restingList = infirmaryVisits.filter((v) => v.status === 'resting');
    const todayVisits = infirmaryVisits.filter((v) => v.visitDate === selectedDate);
    const pendingSlips = canViewFinancials
      ? invoices.filter((inv) => inv.slipStatus === 'pending_review').length
      : 0;
    return {
      restingNow: restingList.length,
      restingList: restingList.slice(0, 4),
      todayInfirmaryCount: todayVisits.length,
      pendingSlips,
    };
  }, [canViewFinancials, infirmaryVisits, invoices, selectedDate]);

  // Drawer Roster Details for selected classroom
  const selectedClassroomDetail = useMemo(() => {
    if (!selectedClassroomDrawerId) return null;
    const matched = classroomReadinessList.find((item) => item.slot.id === selectedClassroomDrawerId);
    if (!matched) return null;

    const roster = resolveSlotStudents(matched.slot, courses, students);
    const resolvedCourseId = matched.slot.courseId || matched.slot.courseCode;
    const slotPeriodLogs = periodAttendance.filter(
      (rec) =>
        rec.date === selectedDate &&
        rec.periodNumber === matched.slot.periodNumber &&
        (rec.recordType || 'check_in') === 'check_in' &&
        (rec.courseId === resolvedCourseId ||
          (matched.slot.courseCode &&
            rec.courseCode.trim().toLowerCase() === matched.slot.courseCode.trim().toLowerCase()))
    );
    const periodMap = new Map<string, PeriodAttendanceRecord>();
    slotPeriodLogs.forEach((rec) => periodMap.set(rec.studentId, rec));

    const rows = roster.map((stu) => {
      const periodRec = periodMap.get(stu.id);
      const gate = resolveStudentGateStatusForDate(stu, selectedDate, attendance);
      const leave = resolveStudentLeaveForSlotDate(stu, matched.slot, selectedDate, leaveRequests);
      return {
        student: stu,
        periodStatus: periodRec?.status || (leave ? 'excused' : 'pending'),
        gateStatus: gate.status,
        gateTime: gate.time,
        leave,
      };
    });

    const sortWeight: Record<string, number> = {
      absent: 0,
      pending: 1,
      late: 2,
      excused: 3,
      present: 4,
    };
    rows.sort(
      (a, b) =>
        (sortWeight[a.periodStatus] ?? 9) - (sortWeight[b.periodStatus] ?? 9) ||
        a.student.firstNameTh.localeCompare(b.student.firstNameTh, 'th')
    );

    return {
      ...matched,
      rows,
    };
  }, [attendance, classroomReadinessList, courses, leaveRequests, periodAttendance, selectedClassroomDrawerId, selectedDate, students]);

  // Filtered Follow-up Rows
  const followupSearchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filterName = (stu: Student) => {
      if (!q) return true;
      return `${stu.firstNameTh} ${stu.lastNameTh} ${stu.studentIdNumber || ''} ${getStudentRoomLabel(stu)}`
        .toLowerCase()
        .includes(q);
    };
    return {
      absent: studentGateOverview.absentUncheckedList.filter((i) => filterName(i.student)),
      leave: studentGateOverview.approvedLeaveList.filter((i) => filterName(i.student)),
      late: studentGateOverview.lateList.filter((i) => filterName(i.student)),
    };
  }, [searchQuery, studentGateOverview]);

  const handleCopyExecutiveBrief = async () => {
    const lines = [
      `รายงานภาพรวมเรียลไทม์ประจำวัน (${selectedDate}) — ${school?.nameTh || systemConfig.schoolNameTh}`,
      `อัปเดตเวลา: ${bangkokClock.timeLabel} น. (ตัดสาย ${lateCutoffTime} น.)`,
      `• มาเรียนหน้าประตู: ${studentGateOverview.attendedCount}/${studentGateOverview.scopedTotal} คน (${studentGateOverview.attendanceRate}%)`,
      `  - มาตรงเวลา ${studentGateOverview.presentList.length} · มาสาย ${studentGateOverview.lateList.length} · ลา ${studentGateOverview.approvedLeaveList.length} · ยังไม่สแกน/ขาด ${studentGateOverview.absentUncheckedList.length}`,
      `• ครูลงเวลาเข้างาน: ${teacherPresenceSummary.checkedInCount}/${teacherPresenceSummary.totalTeachers} คน (ลา ${teacherPresenceSummary.leaveCount} คน)`,
      `• ความพร้อมห้องเรียนวันนี้: เปิดห้องและเช็กชื่อแล้ว ${readinessOverviewStats.readySlots}/${readinessOverviewStats.totalSlots} คาบ`,
      `• ห้องพยาบาล: กำลังพัก ${operationalSignals.restingNow} คน (ใช้บริการวันนี้ ${operationalSignals.todayInfirmaryCount} ครั้ง)`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleExportRealtimeCsv = () => {
    const headers = [
      'วันที่',
      'รหัส',
      'ชื่อ-นามสกุล',
      'ชั้น/ห้อง',
      'สถานะประตู',
      'เวลาเข้า',
      'สถานะใบลา',
      'LINE ผู้ปกครอง',
    ];
    const rows: string[][] = [];
    studentGateOverview.presentList.forEach(({ student, time }) => {
      rows.push([selectedDate, student.studentIdNumber || student.id, `${student.firstNameTh} ${student.lastNameTh}`, getStudentRoomLabel(student), 'มาตรงเวลา', time, '-', student.lineLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม']);
    });
    studentGateOverview.lateList.forEach(({ student, time, lateMinutes }) => {
      rows.push([selectedDate, student.studentIdNumber || student.id, `${student.firstNameTh} ${student.lastNameTh}`, getStudentRoomLabel(student), `มาสาย (+${lateMinutes} นาที)`, time, '-', student.lineLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม']);
    });
    studentGateOverview.approvedLeaveList.forEach(({ student, leave }) => {
      rows.push([selectedDate, student.studentIdNumber || student.id, `${student.firstNameTh} ${student.lastNameTh}`, getStudentRoomLabel(student), 'ลาเรียน', '-', leave?.reason || 'ลาที่อนุมัติ', student.lineLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม']);
    });
    studentGateOverview.absentUncheckedList.forEach(({ student }) => {
      rows.push([selectedDate, student.studentIdNumber || student.id, `${student.firstNameTh} ${student.lastNameTh}`, getStudentRoomLabel(student), 'ยังไม่เช็คอิน/ขาด', '-', '-', student.lineLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม']);
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realtime_daily_status_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenPhoto = (rec: AttendanceRecord) => {
    if (onOpenPhotoRecord) {
      onOpenPhotoRecord(rec);
    } else {
      setInternalPhotoRecord(rec);
    }
  };

  const surfaceCard = isTvMode
    ? 'rounded-xl bg-slate-900 border border-slate-800 text-slate-100'
    : 'saas-card';
  const titleCls = isTvMode ? 'text-white' : 'text-[var(--color-text-title)]';
  const mutedCls = isTvMode ? 'text-slate-400' : 'text-[var(--color-text-muted)]';
  const bodyCls = isTvMode ? 'text-slate-200' : 'text-[var(--color-text-body)]';

  const showMorningSection =
    radarMode === 'morning_gate' || radarMode === 'auto_full';
  const showClassroomSection =
    radarMode === 'classrooms' || radarMode === 'auto_full';

  // In auto_full mode, place the currently most relevant time-of-day section on top!
  const classroomFirst = radarMode === 'auto_full' && !isMorningPhaseNow;

  const renderMorningGateSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT (7 cols): Live Check-In Face Wall */}
        <section className={`${surfaceCard} xl:col-span-7 overflow-hidden`}>
          <div className="saas-card-header flex-wrap gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Camera className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <h3 className={`type-section-title ${titleCls}`}>
                  {lang === 'th'
                    ? 'ภาพใบหน้าผู้เช็คอินวันนี้ (Live Gate Face Wall)'
                    : 'Live Check-In Face Wall'}
                </h3>
                <span className={`type-meta tabular-nums ${mutedCls}`}>
                  · {faceWallRecords.length} {lang === 'th' ? 'คน' : 'people'}
                </span>
              </div>
              <p className={`type-meta mt-0.5 tabular-nums ${mutedCls}`}>
                {lang === 'th'
                  ? `ตัดสายเวลา ${lateCutoffTime} น. · คลิกที่ภาพเพื่อตรวจสอบรูปถ่ายและพิกัด GPS`
                  : `Late cutoff ${lateCutoffTime} · Click a card to inspect photo and GPS`}
              </p>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('mobile_checkin')}
                className="btn-tool-tone px-2.5 py-1 text-xs whitespace-nowrap shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'จุดสแกน/กล้อง' : 'Open Scanner'}</span>
              </button>
            )}
          </div>

          {/* Face Wall Quick Filter Strip */}
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div className="seg-tab-group inline-flex flex-wrap gap-0.5">
              {(
                [
                  { id: 'all', label: `ทั้งหมด (${dateGateCheckIns.length})` },
                  { id: 'window_08_09', label: `08:00–09:00 (${window0809Count})` },
                  { id: 'present', label: 'ตรงเวลา' },
                  { id: 'late', label: 'มาสาย' },
                  { id: 'with_photo', label: `มีรูป (${withPhotoCount})` },
                  { id: 'teachers', label: 'ครู/บุคลากร' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-active={faceFilter === tab.id}
                  onClick={() => {
                    setFaceFilter(tab.id);
                    setFaceVisibleLimit(18);
                  }}
                  className="seg-tab-btn text-[11px] whitespace-nowrap shrink-0"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="saas-card-body">
            {faceWallRecords.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-[var(--color-border)] rounded-xl">
                <Camera className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
                <p className={`text-sm font-semibold ${titleCls}`}>
                  {lang === 'th'
                    ? `ยังไม่มีรายการสแกนเข้าในตัวกรองที่เลือก (${selectedDate})`
                    : `No check-in photos matching filter (${selectedDate})`}
                </p>
                <p className={`type-meta ${mutedCls}`}>
                  {lang === 'th'
                    ? 'เมื่อนักเรียนหรือครูสแกนบัตร/QR หรือเช็คอินกล้อง GPS รูปใบหน้าและเวลาจะขึ้นที่หน้านี้ทันที'
                    : 'Faces and arrival timestamps appear here automatically upon check-in'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {faceWallRecords.slice(0, faceVisibleLimit).map((rec) => {
                    const isTeacher = rec.userType === 'teacher' || Boolean(rec.teacherId);
                    const stu = !isTeacher ? studentById.get(rec.studentId) : undefined;
                    const deptLabel =
                      rec.userDepartmentOrRoom ||
                      (stu ? getStudentRoomLabel(stu) : isTeacher ? 'ครู/บุคลากร' : 'นักเรียน');
                    const isLate = rec.status === 'late';
                    const hasPhoto = Boolean(rec.photoUrl || rec.photoStoragePath);

                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handleOpenPhoto(rec)}
                        className="group text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] overflow-hidden transition cursor-pointer flex flex-col"
                      >
                        <div className="relative aspect-[4/3] w-full bg-slate-900 overflow-hidden">
                          <AttendancePhoto
                            src={
                              rec.photoUrl ||
                              rec.photoStoragePath ||
                              rec.userAvatar ||
                              fallbackAvatarSvg(rec.userName)
                            }
                            alt={rec.userName || 'User'}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono font-semibold tabular-nums">
                            {rec.time ? `${rec.time.slice(0, 5)} น.` : '-'}
                          </div>
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 text-[10px] font-bold text-white">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isLate ? 'text-amber-300' : 'text-emerald-300'
                              }`}
                            >
                              {isLate ? (
                                <Clock className="w-3 h-3 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              )}
                              <span>{isLate ? 'มาสาย' : 'ตรงเวลา'}</span>
                            </span>
                            {hasPhoto && <Camera className="w-3 h-3 text-white/85 shrink-0" />}
                          </div>
                        </div>

                        <div className="p-2 min-w-0 space-y-0.5">
                          <div className={`text-xs font-bold truncate ${titleCls}`}>
                            {rec.userName || 'ผู้ใช้งาน'}
                          </div>
                          <div className={`text-[11px] truncate ${mutedCls}`}>
                            {isTeacher ? 'ครู · ' : ''}
                            {deptLabel}
                          </div>
                          <div className={`text-[10px] truncate flex items-center gap-1 ${mutedCls}`}>
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {getCheckinMethodLabel(rec.checkinMethod, lang)}
                              {rec.location?.distanceMeters !== undefined
                                ? ` · ${rec.location.distanceMeters} ม.`
                                : ''}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {faceWallRecords.length > faceVisibleLimit && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => setFaceVisibleLimit((n) => n + 18)}
                      className="btn-tool-neutral px-4 py-1.5 text-xs"
                    >
                      <span>
                        {lang === 'th'
                          ? `แสดงเพิ่มเติม (${faceWallRecords.length - faceVisibleLimit} คน)`
                          : `Load more (${faceWallRecords.length - faceVisibleLimit})`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT (5 cols): Absent / Leave / Late Follow-Up Board */}
        <section className={`${surfaceCard} xl:col-span-5 overflow-hidden`}>
          <div className="saas-card-header flex-wrap gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <h3 className={`type-section-title ${titleCls}`}>
                  {lang === 'th' ? 'ติดตามคนขาด · ลา · มาสายวันนี้' : 'Absent, Leave & Late Radar'}
                </h3>
              </div>
              <p className={`type-meta mt-0.5 tabular-nums ${mutedCls}`}>
                {lang === 'th'
                  ? `ยังไม่สแกน ${studentGateOverview.absentUncheckedList.length} · ลา ${studentGateOverview.approvedLeaveList.length} · สาย ${studentGateOverview.lateList.length}`
                  : `Missing ${studentGateOverview.absentUncheckedList.length} · Leave ${studentGateOverview.approvedLeaveList.length} · Late ${studentGateOverview.lateList.length}`}
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
              >
                {lang === 'th' ? 'เช็กชื่อประตู →' : 'Attendance →'}
              </button>
            )}
          </div>

          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <div className="seg-tab-group w-full grid grid-cols-3">
              <button
                type="button"
                data-active={followupTab === 'absent_unchecked'}
                onClick={() => setFollowupTab('absent_unchecked')}
                className="seg-tab-btn text-[11px] justify-center whitespace-nowrap"
              >
                ขาด/ยังไม่เช็ก ({followupSearchFiltered.absent.length})
              </button>
              <button
                type="button"
                data-active={followupTab === 'approved_leave'}
                onClick={() => setFollowupTab('approved_leave')}
                className="seg-tab-btn text-[11px] justify-center whitespace-nowrap"
              >
                ลาเรียน ({followupSearchFiltered.leave.length})
              </button>
              <button
                type="button"
                data-active={followupTab === 'late_arrivals'}
                onClick={() => setFollowupTab('late_arrivals')}
                className="seg-tab-btn text-[11px] justify-center whitespace-nowrap"
              >
                มาสาย ({followupSearchFiltered.late.length})
              </button>
            </div>
          </div>

          <div className="saas-card-body max-h-[460px] overflow-y-auto">
            {followupTab === 'absent_unchecked' && (
              followupSearchFiltered.absent.length === 0 ? (
                <div className="py-10 text-center space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className={`text-xs font-semibold ${titleCls}`}>
                    นักเรียนทุกคนสแกนเข้าเรียนหรือแจ้งลาครบแล้ว
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {followupSearchFiltered.absent.slice(0, 40).map(({ student }) => (
                    <div key={student.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${titleCls}`}>
                          {student.firstNameTh} {student.lastNameTh}
                        </div>
                        <div className={`text-[11px] truncate tabular-nums ${mutedCls}`}>
                          {getStudentRoomLabel(student)} · รหัส {student.studentIdNumber || student.id}
                          {student.guardianName ? ` · ผปค. ${student.guardianName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[11px]">
                        {student.guardianPhone && (
                          <span className={`hidden sm:inline-flex items-center gap-1 tabular-nums ${mutedCls}`}>
                            <Phone className="w-3 h-3" />
                            <span>{student.guardianPhone}</span>
                          </span>
                        )}
                        <span
                          className={`font-semibold ${
                            student.lineLinked
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {student.lineLinked ? 'LINE พร้อม' : 'ยังไม่เชื่อม LINE'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {followupSearchFiltered.absent.length > 40 && (
                    <div className={`pt-2 text-center text-[11px] ${mutedCls}`}>
                      แสดง 40 จาก {followupSearchFiltered.absent.length} คน — ใช้ช่องค้นหาหรือกรองห้องด้านบนเพื่อดูรายบุคคล
                    </div>
                  )}
                </div>
              )
            )}

            {followupTab === 'approved_leave' && (
              followupSearchFiltered.leave.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                  ไม่มีรายการลาเรียนที่อนุมัติในวันที่ {selectedDate}
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {followupSearchFiltered.leave.map(({ student, leave }) => (
                    <div key={student.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${titleCls}`}>
                          {student.firstNameTh} {student.lastNameTh}
                        </div>
                        <div className={`text-[11px] truncate ${mutedCls}`}>
                          {getStudentRoomLabel(student)} · {leave?.reason || 'ลาเรียนที่บันทึกในระบบ'}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 shrink-0">
                        {leave?.leaveType === 'sick'
                          ? 'ลาป่วย'
                          : leave?.leaveType === 'personal'
                            ? 'ลากิจ'
                            : 'ลาเรียน'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {followupTab === 'late_arrivals' && (
              followupSearchFiltered.late.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                  ไม่พบนักเรียนมาสายหลังเวลา {lateCutoffTime} น.
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {followupSearchFiltered.late.map(({ student, record, time, lateMinutes }) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => record && handleOpenPhoto(record)}
                      className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {record && (
                          <AttendancePhoto
                            src={
                              record.photoUrl ||
                              record.photoStoragePath ||
                              record.userAvatar ||
                              fallbackAvatarSvg(record.userName)
                            }
                            alt={student.firstNameTh}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${titleCls}`}>
                            {student.firstNameTh} {student.lastNameTh}
                          </div>
                          <div className={`text-[11px] truncate tabular-nums ${mutedCls}`}>
                            {getStudentRoomLabel(student)} · สแกน {time} น.
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums shrink-0">
                        +{lateMinutes} นาที
                      </span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );

  const renderClassroomReadinessSection = () => (
    <section className={`${surfaceCard} overflow-hidden`}>
      <div className="saas-card-header flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <DoorOpen className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
            <h3 className={`type-section-title ${titleCls}`}>
              {lang === 'th'
                ? `ความพร้อมห้องเรียนและสถานะการเข้าสอนรายคาบ (วัน${DAY_NAMES_TH[selectedDayKey] || selectedDayKey})`
                : 'Live Classroom Readiness & Teacher Attendance'}
            </h3>
            {currentLivePeriodNumber !== null && isTodaySelected && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                · กำลังเรียนคาบ {currentLivePeriodNumber}
              </span>
            )}
          </div>
          <p className={`type-meta mt-0.5 tabular-nums ${mutedCls}`}>
            {lang === 'th'
              ? `เปิดห้องและเช็กชื่อแล้ว ${readinessOverviewStats.readySlots}/${readinessOverviewStats.totalSlots} คาบ · ยังไม่เปิดเช็ก ${readinessOverviewStats.unopenedSlots} คาบ · ครูลา ${readinessOverviewStats.teacherLeaveSlots} คาบ · เฉลี่ยมาเรียนในคาบ ${readinessOverviewStats.avgClassAttendancePct}%`
              : `${readinessOverviewStats.readySlots}/${readinessOverviewStats.totalSlots} classes opened · ${readinessOverviewStats.unopenedSlots} pending`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="seg-tab-group inline-flex">
            {(
              [
                { id: 'all', label: `ทุกสถานะ (${classroomReadinessList.length})` },
                { id: 'ready', label: `เปิดเช็กแล้ว (${readinessOverviewStats.readySlots})` },
                { id: 'unopened', label: `ยังไม่เช็ก (${readinessOverviewStats.unopenedSlots})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                data-active={classroomStatusFilter === f.id}
                onClick={() => setClassroomStatusFilter(f.id)}
                className="seg-tab-btn text-[11px] whitespace-nowrap"
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="seg-tab-group inline-flex">
            <button
              type="button"
              data-active={classroomViewStyle === 'grid'}
              onClick={() => setClassroomViewStyle('grid')}
              className="seg-tab-btn px-2 py-1 inline-flex items-center gap-1 text-[11px]"
              title="มุมมองการ์ดห้องเรียน"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>การ์ด</span>
            </button>
            <button
              type="button"
              data-active={classroomViewStyle === 'table'}
              onClick={() => setClassroomViewStyle('table')}
              className="seg-tab-btn px-2 py-1 inline-flex items-center gap-1 text-[11px]"
              title="มุมมองตารางเปรียบเทียบ"
            >
              <List className="w-3.5 h-3.5" />
              <span>ตาราง</span>
            </button>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="btn-tool-neutral px-2.5 py-1 text-xs whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>ตารางสอนเต็ม</span>
            </button>
          )}
        </div>
      </div>

      {/* Period Selector Strip */}
      {teachingPeriodsMeta.length > 0 && (
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center gap-2 overflow-x-auto">
          <span className={`text-[11px] font-semibold shrink-0 ${mutedCls}`}>คาบเรียน:</span>
          <div className="seg-tab-group inline-flex shrink-0">
            <button
              type="button"
              data-active={selectedPeriodFilter === 'auto' || selectedPeriodFilter === 'all'}
              onClick={() => setSelectedPeriodFilter('all')}
              className="seg-tab-btn text-[11px] whitespace-nowrap"
            >
              ทุกคาบวันนี้
            </button>
            {teachingPeriodsMeta.map((p) => {
              const isCurrent = isTodaySelected && currentLivePeriodNumber === p.periodNumber;
              return (
                <button
                  key={p.periodNumber}
                  type="button"
                  data-active={selectedPeriodFilter === String(p.periodNumber)}
                  onClick={() => setSelectedPeriodFilter(String(p.periodNumber))}
                  className="seg-tab-btn text-[11px] whitespace-nowrap tabular-nums"
                >
                  คาบ {p.periodNumber}
                  {isCurrent ? ' (ตอนนี้)' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="saas-card-body">
        {isSelectedWeekend && classroomReadinessList.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 border border-dashed border-[var(--color-border)] rounded-xl">
            <Calendar className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
            <p className={`text-sm font-semibold ${titleCls}`}>
              วันหยุดสุดสัปดาห์ · ไม่มีตารางสอนปกติในวันนี้
            </p>
            <p className={`type-meta ${mutedCls}`}>
              เลือกดูวันเรียนก่อนหน้าจากปฏิทินด้านบน หรือเปิดดูหน้าตารางเรียนรายสัปดาห์
            </p>
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-[var(--color-border)] rounded-xl">
            <BookOpen className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
            <p className={`text-sm font-semibold ${titleCls}`}>
              {classroomReadinessList.length === 0
                ? 'ยังไม่มีตารางคาบสอนที่กำหนดไว้สำหรับวันนี้'
                : 'ไม่พบห้องเรียนตามตัวกรองที่เลือก'}
            </p>
            <p className={`type-meta ${mutedCls}`}>
              {classroomReadinessList.length === 0
                ? 'สามารถเพิ่มหรือนำเข้าตารางสอนได้ในเมนู ตารางเรียน/ตารางสอน'
                : 'ลองเลือก "ทุกคาบวันนี้" หรือล้างตัวกรองสถานะ'}
            </p>
          </div>
        ) : classroomViewStyle === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredClassrooms.map((item) => {
              const { slot, summary, timeRange, activityStatus, isClassroomReady } = item;
              const isLiveNow = activityStatus === 'active';
              const isPastOrLive = activityStatus === 'active' || activityStatus === 'past';
              const primaryTeacher = summary.teacherStatuses[0];

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedClassroomDrawerId(slot.id)}
                  className={`text-left rounded-xl border p-3.5 transition cursor-pointer flex flex-col justify-between gap-3 ${
                    isLiveNow
                      ? 'border-[var(--color-primary)] bg-[var(--color-card-subtle)]'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Meta Line (zero-pill inline text) */}
                    <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                      <span className={`font-semibold ${mutedCls}`}>
                        คาบ {slot.periodNumber} · {timeRange || '-'}
                        {isLiveNow && (
                          <span className="ml-1.5 font-bold text-[var(--color-primary-text)]">
                            · กำลังสอน
                          </span>
                        )}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold shrink-0 ${
                          isClassroomReady
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : isPastOrLive
                              ? 'text-amber-700 dark:text-amber-300'
                              : mutedCls
                        }`}
                      >
                        {isClassroomReady ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>เปิดห้อง &amp; เช็กแล้ว</span>
                          </>
                        ) : isPastOrLive ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>ยังไม่เปิดเช็กชื่อ</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>รอถึงเวลาเรียน</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Subject & Room */}
                    <div>
                      <div className={`text-sm font-bold truncate ${titleCls}`}>
                        {slot.classRoom || slot.room || 'ห้องเรียนรวม'} · {slot.courseTitleTh || slot.courseCode}
                      </div>
                      <div className={`text-xs truncate ${mutedCls}`}>
                        {slot.courseCode}
                        {slot.room && slot.classRoom && slot.room !== slot.classRoom ? ` · ห้อง ${slot.room}` : ''}
                      </div>
                    </div>

                    {/* Teacher Gate Readiness */}
                    <div className="pt-1 border-t border-[var(--color-border)] flex items-center justify-between gap-2 text-[11px]">
                      <span className={`truncate ${bodyCls}`}>
                        ครู: <strong className={titleCls}>{primaryTeacher?.teacherName || slot.teacherName || 'ยังไม่ระบุ'}</strong>
                      </span>
                      {primaryTeacher && (
                        <span
                          className={`font-semibold shrink-0 tabular-nums ${
                            primaryTeacher.status === 'on_leave_approved' ||
                            primaryTeacher.status === 'on_leave_pending'
                              ? 'text-rose-600 dark:text-rose-400'
                              : primaryTeacher.status === 'checked_in'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : primaryTeacher.status === 'late'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : mutedCls
                          }`}
                        >
                          {primaryTeacher.status === 'checked_in'
                            ? `สแกนเข้า ${primaryTeacher.checkInTime || ''} น.`
                            : primaryTeacher.status === 'late'
                              ? `มาสาย ${primaryTeacher.checkInTime || ''} น.`
                              : primaryTeacher.status === 'on_leave_approved' ||
                                  primaryTeacher.status === 'on_leave_pending'
                                ? primaryTeacher.substituteTeacherName
                                  ? `ลา (แทน: ${primaryTeacher.substituteTeacherName})`
                                  : 'ลางาน'
                                : 'ยังไม่สแกนเข้า'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Attendance Completeness */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] tabular-nums">
                      <span className={mutedCls}>
                        {isClassroomReady ? 'เช็กเข้าคาบแล้ว' : 'สแกนประตูวันนี้ (อ้างอิง)'}
                      </span>
                      <span className={`font-bold ${titleCls}`}>
                        {isClassroomReady
                          ? `${summary.periodPresent + summary.periodLate}/${summary.expectedTotal} คน (${item.attendanceInClassPercent}%)`
                          : `${summary.gatePresentCount}/${summary.expectedTotal} คนเข้าโรงเรียน`}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden flex">
                      {isClassroomReady ? (
                        <>
                          <div
                            className="h-full bg-emerald-600"
                            style={{
                              width: `${summary.expectedTotal > 0 ? (summary.periodPresent / summary.expectedTotal) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${summary.expectedTotal > 0 ? (summary.periodLate / summary.expectedTotal) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="h-full bg-sky-500"
                            style={{
                              width: `${summary.expectedTotal > 0 ? (summary.periodExcused / summary.expectedTotal) * 100 : 0}%`,
                            }}
                          />
                        </>
                      ) : (
                        <div
                          className="h-full bg-slate-400 dark:bg-slate-500"
                          style={{
                            width: `${summary.expectedTotal > 0 ? (summary.gatePresentCount / summary.expectedTotal) * 100 : 0}%`,
                          }}
                        />
                      )}
                    </div>
                    <div className={`flex items-center justify-between text-[10px] tabular-nums ${mutedCls}`}>
                      <span>
                        {isClassroomReady
                          ? `มา ${summary.periodPresent} · สาย ${summary.periodLate} · ลา ${summary.periodExcused} · ขาด ${summary.periodAbsent}`
                          : `ลา ${summary.studentLeaveCount} · ยังไม่สแกนประตู ${summary.gateNotCheckedCount}`}
                      </span>
                      <span className="font-semibold text-[var(--color-primary-text)] inline-flex items-center gap-0.5">
                        <span>รายชื่อ</span>
                        <Eye className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-comfortable w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className={`border-b border-[var(--color-border)] text-[11px] font-bold ${mutedCls}`}>
                  <th className="py-2.5 px-3">คาบ / เวลา</th>
                  <th className="py-2.5 px-3">ห้องเรียน &amp; รายวิชา</th>
                  <th className="py-2.5 px-3">ครูผู้สอน / สถานะเข้างาน</th>
                  <th className="py-2.5 px-3 text-right">ความครบถ้วนในคาบ</th>
                  <th className="py-2.5 px-3 text-right">สแกนหน้าประตู</th>
                  <th className="py-2.5 px-3 text-right">สถานะห้องเรียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredClassrooms.map((item) => {
                  const primaryTeacher = item.summary.teacherStatuses[0];
                  return (
                    <tr
                      key={item.slot.id}
                      onClick={() => setSelectedClassroomDrawerId(item.slot.id)}
                      className="hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                        คาบ {item.slot.periodNumber} · {item.timeRange || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={`font-bold ${titleCls}`}>
                          {item.slot.classRoom || item.slot.room} · {item.slot.courseTitleTh}
                        </div>
                        <div className={`text-[11px] ${mutedCls}`}>{item.slot.courseCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={titleCls}>{primaryTeacher?.teacherName || item.slot.teacherName}</div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          {primaryTeacher?.status === 'checked_in'
                            ? `เข้าโรงเรียน ${primaryTeacher.checkInTime || ''} น.`
                            : primaryTeacher?.status === 'late'
                              ? `มาสาย ${primaryTeacher.checkInTime || ''} น.`
                              : primaryTeacher?.status === 'on_leave_approved' ||
                                  primaryTeacher?.status === 'on_leave_pending'
                                ? 'ลางาน'
                                : 'ยังไม่สแกนเข้า'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {item.isClassroomReady
                          ? `${item.summary.periodPresent + item.summary.periodLate}/${item.summary.expectedTotal} (${item.attendanceInClassPercent}%)`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {item.summary.gatePresentCount}/{item.summary.expectedTotal} คน
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                        {item.isClassroomReady ? (
                          <span className="text-emerald-700 dark:text-emerald-300">เปิดเช็กแล้ว</span>
                        ) : item.activityStatus === 'active' || item.activityStatus === 'past' ? (
                          <span className="text-amber-700 dark:text-amber-300">ยังไม่เปิดเช็ก</span>
                        ) : (
                          <span className={mutedCls}>รอถึงเวลา</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-4">
      {/* 1. LIVE DAILY COMMAND CONTROL BAR */}
      <section className={`${surfaceCard} p-4 space-y-3`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className={`flex flex-wrap items-center gap-2 text-xs ${mutedCls}`}>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>เรียลไทม์ประจำวัน</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-mono">{bangkokClock.timeLabel} น.</span>
              <span aria-hidden="true">·</span>
              <span>
                {isMorningPhaseNow
                  ? `ช่วงเช้า 08:00–09:00 (ตัดสาย ${lateCutoffTime} น.)`
                  : currentLivePeriodNumber !== null
                    ? `ช่วงเวลาสอนปกติ · กำลังเรียนคาบ ${currentLivePeriodNumber}`
                    : 'ติดตามความพร้อมห้องเรียนและสรุประหว่างวัน'}
              </span>
            </div>
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${titleCls}`}>
              {lang === 'th'
                ? `ศูนย์ติดตามสถานการณ์โรงเรียนประจำวัน — ${school?.nameTh || systemConfig.schoolNameTh}`
                : `Live School Operations Command — ${school?.nameEn || systemConfig.schoolNameEn}`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="saas-control-group type-meta">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                  selectedDate === yesterdayStr
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                เมื่อวาน
              </button>
              <input
                type="date"
                aria-label="เลือกวันที่ติดตาม"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleCopyExecutiveBrief()}
              className="btn-tool-neutral px-3 py-1.5 text-xs whitespace-nowrap"
            >
              {copiedSummary ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              )}
              <span>{copiedSummary ? 'คัดลอกสรุปแล้ว' : 'คัดลอกสรุปส่ง LINE'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportRealtimeCsv}
              className="btn-tool-neutral px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setNow(new Date())}
              className="btn-icon-tool"
              title="รีเฟรชเวลาปัจจุบัน"
              aria-label="รีเฟรชเวลา"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Phase Lens Switcher + Room & Search Filters */}
        <div className="pt-2.5 border-t border-[var(--color-border)] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="seg-tab-group inline-flex flex-wrap gap-0.5">
            <button
              type="button"
              data-active={radarMode === 'auto_full'}
              onClick={() => setRadarMode('auto_full')}
              className="seg-tab-btn text-xs whitespace-nowrap shrink-0"
            >
              อัตโนมัติตามเวลาจริง ({isMorningPhaseNow ? 'ประตู 08:00 นำ' : 'ห้องเรียน 09:00+ นำ'})
            </button>
            <button
              type="button"
              data-active={radarMode === 'morning_gate'}
              onClick={() => setRadarMode('morning_gate')}
              className="seg-tab-btn text-xs whitespace-nowrap shrink-0"
            >
              08:00–09:00 เช็คอินใบหน้า &amp; ขาด/ลา/สาย
            </button>
            <button
              type="button"
              data-active={radarMode === 'classrooms'}
              onClick={() => setRadarMode('classrooms')}
              className="seg-tab-btn text-xs whitespace-nowrap shrink-0"
            >
              ความพร้อมห้องเรียน &amp; ครูรายคาบ ({readinessOverviewStats.totalSlots})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="กรองตามห้องเรียน"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium text-[var(--color-text-title)]"
            >
              <option value="all">ทุกห้องเรียน ({activeStudents.length} คน)</option>
              {distinctRooms.map((rm) => (
                <option key={rm} value={rm}>
                  {rm}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ นักเรียน ครู วิชา..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] w-48 sm:w-56 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. 6-CELL REAL-TIME KPI STRIP (Single-Elevation Hairline Grid) */}
      <section className="saas-kpi-strip overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
          <div className="saas-kpi-cell space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              <span>มาเรียนหน้าประตู</span>
              <LogIn className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="type-kpi-sm tabular-nums text-[var(--color-text-title)]">
              {studentGateOverview.attendanceRate}%
            </div>
            <div className="type-meta tabular-nums truncate">
              มา {studentGateOverview.attendedCount}/{studentGateOverview.scopedTotal} · ตรงเวลา{' '}
              {studentGateOverview.presentList.length}
            </div>
          </div>

          <div className="saas-kpi-cell space-y-1">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-semibold">
              <span>ขาด · ลา · มาสาย</span>
              <UserX className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="type-kpi-sm tabular-nums text-rose-700 dark:text-rose-300">
              {studentGateOverview.absentUncheckedList.length}
              <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">ยังไม่สแกน</span>
            </div>
            <div className="type-meta tabular-nums truncate">
              ลา {studentGateOverview.approvedLeaveList.length} · สาย {studentGateOverview.lateList.length}
            </div>
          </div>

          <div className="saas-kpi-cell space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold">
              <span>ครูเข้าปฏิบัติงาน</span>
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="type-kpi-sm tabular-nums text-[var(--color-text-title)]">
              {teacherPresenceSummary.checkedInCount}/{teacherPresenceSummary.totalTeachers}
            </div>
            <div className="type-meta tabular-nums truncate">
              สาย {teacherPresenceSummary.lateCount} · ลาวันนี้ {teacherPresenceSummary.leaveCount}
            </div>
          </div>

          <div className="saas-kpi-cell space-y-1">
            <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
              <span>ความพร้อมห้องเรียน</span>
              <DoorOpen className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="type-kpi-sm tabular-nums text-[var(--color-text-title)]">
              {readinessOverviewStats.readySlots}/{readinessOverviewStats.totalSlots}
            </div>
            <div className="type-meta tabular-nums truncate">
              {readinessOverviewStats.unopenedSlots > 0
                ? `รอเช็กชื่อ ${readinessOverviewStats.unopenedSlots} คาบ`
                : 'เปิดเช็กชื่อครบทุกคาบ'}
            </div>
          </div>

          <div className="saas-kpi-cell space-y-1">
            <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
              <span>ห้องพยาบาลตอนนี้</span>
              <HeartPulse className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="type-kpi-sm tabular-nums text-[var(--color-text-title)]">
              {operationalSignals.restingNow}
              <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">คนกำลังพัก</span>
            </div>
            <div className="type-meta tabular-nums truncate">
              ใช้บริการวันนี้ {operationalSignals.todayInfirmaryCount} ครั้ง
            </div>
          </div>

          <div className="saas-kpi-cell space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-semibold">
              <span>คิวอนุมัติด่วน</span>
              <Activity className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="type-kpi-sm tabular-nums text-[var(--color-text-title)]">
              {teacherPresenceSummary.pendingLeaveCount + operationalSignals.pendingSlips}
            </div>
            <div className="type-meta tabular-nums truncate">
              ใบลา {teacherPresenceSummary.pendingLeaveCount}
              {canViewFinancials ? ` · สลิป ${operationalSignals.pendingSlips}` : ''}
            </div>
          </div>
        </div>
      </section>

      {/* 3. TIME-ORDERED OPERATIONS RADAR SECTIONS */}
      {classroomFirst ? (
        <>
          {showClassroomSection && renderClassroomReadinessSection()}
          {showMorningSection && renderMorningGateSection()}
        </>
      ) : (
        <>
          {showMorningSection && renderMorningGateSection()}
          {showClassroomSection && renderClassroomReadinessSection()}
        </>
      )}

      {/* 4. OPERATIONAL FOOTER: INFIRMARY ACTIVE PATIENTS + QUICK ACTION LINKS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${surfaceCard} overflow-hidden`}>
          <div className="saas-card-header">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
              <h3 className={`type-section-title ${titleCls}`}>
                ผู้ป่วยกำลังพักในห้องพยาบาลตอนนี้ ({operationalSignals.restingNow})
              </h3>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('infirmary')}
                className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                เปิดห้องพยาบาล →
              </button>
            )}
          </div>
          <div className="saas-card-body">
            {operationalSignals.restingList.length === 0 ? (
              <p className={`text-xs py-4 text-center ${mutedCls}`}>
                ขณะนี้ไม่มีนักเรียนพักรักษาตัวในห้องพยาบาล
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {operationalSignals.restingList.map((visit) => (
                  <div key={visit.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className={`font-bold truncate ${titleCls}`}>
                        {visit.studentName} ({visit.gradeRoom})
                      </div>
                      <div className={`text-[11px] truncate ${mutedCls}`}>
                        {visit.symptoms} · อุณหภูมิ {visit.temperature}°C
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                      {visit.bedNumber ? `เตียง ${visit.bedNumber} · ` : ''}
                      {visit.visitTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${surfaceCard} overflow-hidden`}>
          <div className="saas-card-header">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <h3 className={`type-section-title ${titleCls}`}>ทางลัดสั่งการด่วนสำหรับผู้บริหาร</h3>
            </div>
          </div>
          <div className="saas-card-body grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('mobile_checkin')}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${titleCls}`}>อนุมัติใบลาออนไลน์</div>
                    <div className={`text-[11px] tabular-nums ${mutedCls}`}>
                      รอพิจารณา {teacherPresenceSummary.pendingLeaveCount} รายการ
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${titleCls}`}>เครื่องสแกน / บันทึกเข้าเรียน</div>
                    <div className={`text-[11px] tabular-nums ${mutedCls}`}>
                      บันทึกย้อนหลังและ QR ประตู
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                </button>
                {canViewFinancials && (
                  <button
                    type="button"
                    onClick={() => onNavigate('billing')}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <div className={`text-xs font-bold ${titleCls}`}>ตรวจสอบสลิปค่าเทอม</div>
                      <div className={`text-[11px] tabular-nums ${mutedCls}`}>
                        รอตรวจ {operationalSignals.pendingSlips} รายการ
                      </div>
                    </div>
                    <Receipt className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('executive_warning')}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${titleCls}`}>ติดตามกลุ่มเสี่ยง (EWS)</div>
                    <div className={`text-[11px] ${mutedCls}`}>คัดกรองเวลาเรียน &amp; GPA</div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SLIDE-OVER DRAWER: CLASSROOM ROSTER COMPLETENESS */}
      {selectedClassroomDetail && (
        <div
          className="saas-drawer-backdrop animate-in fade-in duration-150"
          onClick={() => setSelectedClassroomDrawerId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดความพร้อมห้องเรียน"
            onClick={(e) => e.stopPropagation()}
            className="saas-drawer-panel animate-in slide-in-from-right duration-200"
          >
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between gap-2 bg-[var(--color-card-subtle)]">
              <div className="min-w-0">
                <p className="type-meta font-semibold text-[var(--color-primary-text)] tabular-nums">
                  คาบ {selectedClassroomDetail.slot.periodNumber} ·{' '}
                  {selectedClassroomDetail.timeRange || '-'}
                </p>
                <h3 className="type-section-title truncate">
                  {selectedClassroomDetail.slot.classRoom || selectedClassroomDetail.slot.room} ·{' '}
                  {selectedClassroomDetail.slot.courseTitleTh}
                </h3>
                <p className="type-meta truncate">
                  ครูผู้สอน: {selectedClassroomDetail.slot.teacherName || '-'} · ผู้เรียน{' '}
                  {selectedClassroomDetail.rows.length} คน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassroomDrawerId(null)}
                className="btn-icon-tool"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-4 gap-2 text-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5 tabular-nums">
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">มาในคาบ</div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {selectedClassroomDetail.summary.periodPresent}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">มาสาย</div>
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {selectedClassroomDetail.summary.periodLate}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">ลา</div>
                  <div className="text-sm font-bold text-sky-700 dark:text-sky-300">
                    {selectedClassroomDetail.summary.periodExcused}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">ขาด/รอเช็ก</div>
                  <div className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    {selectedClassroomDetail.missingOrAbsentCount}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-card)]">
                {selectedClassroomDetail.rows.map((row) => (
                  <div
                    key={row.student.id}
                    className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[var(--color-text-title)] truncate">
                        {row.student.firstNameTh} {row.student.lastNameTh}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                        {row.student.studentIdNumber || row.student.id} · ประตูโรงเรียน:{' '}
                        {row.gateStatus === 'present' || row.gateStatus === 'late'
                          ? `สแกน ${row.gateTime || ''} น.`
                          : row.leave
                            ? 'แจ้งลาเรียน'
                            : 'ยังไม่สแกนเข้า'}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold shrink-0 ${
                        row.periodStatus === 'present'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : row.periodStatus === 'late'
                            ? 'text-amber-700 dark:text-amber-300'
                            : row.periodStatus === 'excused'
                              ? 'text-sky-700 dark:text-sky-300'
                              : row.periodStatus === 'absent'
                                ? 'text-rose-700 dark:text-rose-300'
                                : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {row.periodStatus === 'present'
                        ? 'มาเรียน'
                        : row.periodStatus === 'late'
                          ? 'มาสาย'
                          : row.periodStatus === 'excused'
                            ? 'ลาเรียน'
                            : row.periodStatus === 'absent'
                              ? 'ขาดเรียน'
                              : 'ยังไม่เช็กชื่อในคาบ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassroomDrawerId(null);
                    onNavigate('timetable');
                  }}
                  className="btn-tool-tone px-3 py-1.5 text-xs"
                >
                  <span>เปิดในตารางสอนเพื่อเช็กชื่อ</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedClassroomDrawerId(null)}
                className="btn-action-primary px-4 py-1.5 text-xs ml-auto"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERNAL PHOTO PROOF DRAWER (if parent view didn't pass onOpenPhotoRecord) */}
      {internalPhotoRecord && (
        <div
          className="saas-drawer-backdrop animate-in fade-in duration-150"
          onClick={() => setInternalPhotoRecord(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="saas-drawer-panel animate-in slide-in-from-right duration-200"
          >
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between gap-2 bg-[var(--color-card-subtle)]">
              <div className="min-w-0">
                <h3 className="type-section-title truncate">
                  {internalPhotoRecord.userName || 'หลักฐานการเช็คชื่อ'}
                </h3>
                <p className="type-meta tabular-nums truncate">
                  {internalPhotoRecord.date} · {internalPhotoRecord.time} น.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInternalPhotoRecord(null)}
                className="btn-icon-tool"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-4/3 max-h-64 border border-[var(--color-border)] flex items-center justify-center">
                <AttendancePhoto
                  src={
                    internalPhotoRecord.photoUrl ||
                    internalPhotoRecord.photoStoragePath ||
                    internalPhotoRecord.userAvatar ||
                    fallbackAvatarSvg(internalPhotoRecord.userName)
                  }
                  alt={internalPhotoRecord.userName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/75 text-white text-[11px] flex items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {internalPhotoRecord.location?.geofenceZoneName || 'จุดสแกนประตูโรงเรียน'}
                    </span>
                  </span>
                  <span className="font-mono shrink-0">
                    {internalPhotoRecord.location?.distanceMeters ?? 18} ม.
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] divide-y divide-[var(--color-border)] text-xs">
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-[var(--color-text-muted)]">ห้อง / แผนก</span>
                  <span className="font-bold text-[var(--color-text-title)]">
                    {internalPhotoRecord.userDepartmentOrRoom || internalPhotoRecord.userRole}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-[var(--color-text-muted)]">สถานะ &amp; วิธีสแกน</span>
                  <span className="font-semibold text-[var(--color-text-title)]">
                    {internalPhotoRecord.status === 'present' ? 'ตรงเวลา' : 'มาสาย'} ·{' '}
                    {getCheckinMethodLabel(internalPhotoRecord.checkinMethod, lang)}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-[var(--color-text-muted)]">พิกัด GPS</span>
                  <span className="font-mono tabular-nums text-[var(--color-text-body)]">
                    {internalPhotoRecord.location?.lat || '-'}, {internalPhotoRecord.location?.lng || '-'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  const photoUrl = internalPhotoRecord.photoUrl
                    ? await resolveAttendancePhotoUrl(internalPhotoRecord.photoUrl)
                    : internalPhotoRecord.userAvatar;
                  if (!photoUrl) return;
                  const link = document.createElement('a');
                  link.href = photoUrl;
                  link.download = `checkin_${internalPhotoRecord.userName}_${internalPhotoRecord.date}.jpg`;
                  link.click();
                }}
                className="btn-tool-neutral px-3 py-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>บันทึกรูป</span>
              </button>
              <button
                type="button"
                onClick={() => setInternalPhotoRecord(null)}
                className="btn-action-primary px-4 py-1.5 text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
