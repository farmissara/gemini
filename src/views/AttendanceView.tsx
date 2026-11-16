import React, { useState, useMemo } from 'react';
import { 
  Student, 
  Teacher,
  AttendanceRecord, 
  AttendanceStatus, 
  LeaveRequest, 
  LeaveStatus, 
  CampusGateGeofence,
  School,
  AppLanguage,
  AuthUser,
  UserRole,
  Course,
  SchoolPeriodTime,
  TimetableSlot,
  PeriodAttendanceRecord
} from '../types';
import { 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  MessageSquare, 
  Filter,
  Camera,
  RefreshCw,
  Sparkles,
  UserCheck,
  FileSpreadsheet,
  Download,
  FileText,
  Check,
  X,
  MapPin,
  Eye,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Compass,
  Upload
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { useQuickActionListener } from '../lib/quickActionEvents';
import { emitMascotDashboardEvent } from '../components/guide/InteractiveMascotGuide';
import { getModuleGroupMeta, getModuleTone } from '../lib/moduleTheme';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  getAllowedStudentScope,
  isRestrictedAttendanceViewer,
  resolveOwnStudent,
  resolveCurrentUserAttendanceProfile,
} from '../lib/attendanceScope';
import { SchoolGpsSettingsCard } from '../components/SchoolGpsSettingsCard';
import { PagedList } from '../components/PagedList';
import { ContinuousRapidScannerModal } from '../components/modals/ContinuousRapidScannerModal';
import { AttendanceImportModal } from '../components/modals/AttendanceImportModal';
import { AttendanceMonthlyTrendLineChart } from '../components/AttendanceMonthlyTrendLineChart';
import { AttendanceCheckinHeatmap } from '../components/AttendanceCheckinHeatmap';
import { WeeklyAttendanceGrid } from '../components/WeeklyAttendanceGrid';
import { PeriodQrGeneratorPanel } from '../components/PeriodQrGeneratorPanel';
import { enqueueOfflineAction, isOnlineNow } from '../lib/offlineSync';
import { getAttendanceDuplicateReasons } from '../lib/duplicateRecords';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';

const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 15
}: {
  items: readonly T[];
  colSpan: number;
  renderRow: (item: T) => React.ReactNode;
  pageSize?: number;
}) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <>
      {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(renderRow)}
      {pageCount > 1 && (
        <tr>
          <td colSpan={colSpan} className="p-2">
            <div className="flex items-center justify-between">
              <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
              <span className="text-[11px] text-[var(--color-text-muted)]">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface AttendanceViewProps {
  students: Student[];
  teachers?: Teacher[];
  attendance: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  campusGates?: CampusGateGeofence[];
  activeSchool?: School;
  currentUser?: AuthUser | null;
  currentRole?: UserRole;
  lang?: AppLanguage;
  onRecordAttendance: (
    studentId: string, 
    status: AttendanceStatus, 
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: any
  ) => void;
  onBulkImportAttendance?: (records: AttendanceRecord[]) => void;
  onUpdateLeaveStatus?: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
  courses?: Course[];
  schoolPeriods?: SchoolPeriodTime[];
  timetableSlots?: TimetableSlot[];
  periodAttendance?: PeriodAttendanceRecord[];
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  teachers = [],
  attendance,
  leaveRequests = [],
  campusGates = [],
  activeSchool,
  currentUser,
  currentRole = 'student',
  lang = 'th',
  onRecordAttendance,
  onBulkImportAttendance,
  onUpdateLeaveStatus,
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
  courses = [],
  schoolPeriods = [],
  timetableSlots = [],
  periodAttendance = [],
}) => {
  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const isAdminUser = currentRole === 'admin' || currentRole === 'super_admin';
  const studentScope = getAllowedStudentScope(currentUser, students);
  const ownStudent = resolveOwnStudent(currentUser, students);
  const scopedStudents = isRestrictedViewer ? studentScope.allowedStudents : students;
  const scopedAttendance = useMemo(
    () => filterAttendanceForUser(attendance, currentUser, students),
    [attendance, currentUser, students]
  );
  const scopedLeaveRequests = useMemo(
    () => filterLeaveRequestsForUser(leaveRequests, currentUser, students),
    [leaveRequests, currentUser, students]
  );

  const loggedInProfile = resolveCurrentUserAttendanceProfile(currentUser, teachers, students);
  const [activeTab, setActiveTab] = useState<'gate_scanner' | 'leave_approval' | 'export_reports' | 'period_qr' | 'school_gps'>('gate_scanner');
  const [showRapidScannerModal, setShowRapidScannerModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);

  useQuickActionListener('attendance', (action) => {
    if (action === 'open_rapid_scanner') {
      setActiveTab('gate_scanner');
      setShowRapidScannerModal(true);
    } else if (action === 'tab_leave_approval') {
      setActiveTab('leave_approval');
    } else if (action === 'tab_period_qr') {
      setActiveTab('period_qr');
    } else if (action === 'tab_export_reports') {
      setActiveTab('export_reports');
    }
  });

  // Scanner state (Staff must enter Student ID before check-in; Students only see themselves)
  const [scannerStudentIdInput, setScannerStudentIdInput] = useState<string>('');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [remarks, setRemarks] = useState('ประตูใหญ่ด้านหน้า (Smart Turnstile Scanner)');
  const [isScanning, setIsScanning] = useState(false);
  const [isSelfCheckingIn, setIsSelfCheckingIn] = useState(false);
  const [scannerResult, setScannerResult] = useState<string | null>(null);

  const trimmedScannerId = scannerStudentIdInput.trim();
  const normalizedScannerToken = trimmedScannerId.replace(/^EDUVERSE:STU:/i, '').split(':')[0].trim();
  const matchedScannerStudent = isRestrictedViewer
    ? (ownStudent || scopedStudents[0])
    : normalizedScannerToken
      ? students.find((s) => (
          s.studentIdNumber.trim().toLowerCase() === normalizedScannerToken.toLowerCase()
          || s.id.trim().toLowerCase() === normalizedScannerToken.toLowerCase()
        ))
      : undefined;

  const todayDateStr = getLocalDateString();
  const scannerDupReasons = matchedScannerStudent
    ? getAttendanceDuplicateReasons({ studentId: matchedScannerStudent.id, date: todayDateStr, recordType: 'check_in' }, attendance)
    : [];

  // Filter logs by date range, class/room, course, and scope
  const [attendanceViewMode, setAttendanceViewMode] = useState<'daily' | 'weekly' | 'homeroom_rollcall'>('daily');
  const [rollCallDate, setRollCallDate] = useState<string>(getLocalDateString());
  const [rollCallRoom, setRollCallRoom] = useState<string>('all');
  const [rollCallOverrides, setRollCallOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [isSavingRollCall, setIsSavingRollCall] = useState(false);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(getLocalDateString());
  const [startDateFilter, setStartDateFilter] = useState(getLocalDateString());
  const [endDateFilter, setEndDateFilter] = useState(getLocalDateString());
  const [classFilter, setClassFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [logScopeFilter, setLogScopeFilter] = useState<'all' | 'mine'>('all');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<AttendanceRecord | null>(null);

  const courseTeacherOptions = useMemo(
    () => buildCourseTeacherOptions(courses, teachers),
    [courses, teachers]
  );

  const teacherFilteredCourses = useMemo(
    () => courses.filter((c) => courseMatchesTeacherFilter(c, teacherFilter, courseTeacherOptions)),
    [courses, teacherFilter, courseTeacherOptions]
  );

  const availableClasses = useMemo(() => {
    const rooms = new Set<string>();
    scopedStudents.forEach((s) => {
      if (s.room?.trim()) rooms.add(s.room.trim());
    });
    attendance.forEach((a) => {
      if (a.userDepartmentOrRoom?.trim()) rooms.add(a.userDepartmentOrRoom.trim());
    });
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, 'th'));
  }, [scopedStudents, attendance]);

  const effectiveRollCallRoom = rollCallRoom === 'all' ? (availableClasses[0] || 'all') : rollCallRoom;
  const rollCallStudents = useMemo(() => {
    const base = effectiveRollCallRoom === 'all'
      ? scopedStudents
      : scopedStudents.filter((s) => s.room === effectiveRollCallRoom);
    return base.slice().sort((a, b) => a.studentIdNumber.localeCompare(b.studentIdNumber, 'th'));
  }, [scopedStudents, effectiveRollCallRoom]);

  const getDefaultRollCallStatus = (student: Student): { status: AttendanceStatus; source: 'recorded' | 'leave' | 'default' } => {
    const existing = attendance.find(
      (rec) => rec.date === rollCallDate && rec.studentId === student.id && rec.recordType !== 'check_out'
    );
    if (existing) return { status: existing.status, source: 'recorded' };
    const approvedLeave = leaveRequests.find(
      (req) =>
        req.userRole === 'student' &&
        req.status === 'approved' &&
        (req.userId === student.id || req.userName === `${student.firstNameTh} ${student.lastNameTh}`) &&
        req.startDate <= rollCallDate &&
        req.endDate >= rollCallDate
    );
    if (approvedLeave) {
      return {
        status: approvedLeave.leaveType === 'sick' ? 'sick' : 'leave',
        source: 'leave',
      };
    }
    return { status: 'present', source: 'default' };
  };

  const handleSaveHomeroomRollCall = () => {
    if (rollCallStudents.length === 0 || isSavingRollCall) return;
    setIsSavingRollCall(true);
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const records: AttendanceRecord[] = rollCallStudents.map((stu, idx) => {
      const resolved = rollCallOverrides[stu.id] || getDefaultRollCallStatus(stu).status;
      return {
        id: `roll-${rollCallDate}-${stu.id}-${Date.now()}-${idx}`,
        schoolId: activeSchool?.id || stu.schoolId,
        studentId: stu.id,
        userType: 'student',
        userName: `${stu.firstNameTh} ${stu.lastNameTh}`,
        userRole: `นักเรียน (${stu.gradeLevel})`,
        userAvatar: stu.avatarUrl,
        userDepartmentOrRoom: stu.room,
        recordType: 'check_in',
        date: rollCallDate,
        time: nowTime,
        status: resolved,
        checkinMethod: 'teacher_proxy',
        remarks: `เช็คชื่อโฮมรูมห้อง ${stu.room} (${loggedInProfile.userName})`,
        lineNotificationSent: stu.lineLinked && stu.lineNotifyEnabled,
        recordedBy: loggedInProfile.userName,
        recordedByRole: currentUser?.role || currentRole,
      };
    });
    handleConfirmAttendanceImport(records);
    setRollCallOverrides({});
    setIsSavingRollCall(false);
    const presentCount = records.filter((r) => r.status === 'present').length;
    const exceptionCount = records.length - presentCount;
    emitMascotDashboardEvent({
      type: 'success',
      titleTh: `บันทึกเช็คชื่อห้อง ${effectiveRollCallRoom} สำเร็จ`,
      titleEn: `Saved roll call (${records.length})`,
      messageTh: `บันทึกครบ ${records.length} คน (มาเรียน ${presentCount} คน · สาย/ลา/ขาด ${exceptionCount} คน) ในคลิกเดียว`,
      messageEn: `Recorded ${records.length} students (${presentCount} present, ${exceptionCount} exceptions).`,
    });
  };

  const selectedCourseObj = useMemo(
    () => teacherFilteredCourses.find((c) => c.id === courseFilter) || null,
    [teacherFilteredCourses, courseFilter]
  );

  // Unified log entries: gate logs + matching period attendance logs when a course or teacher is selected
  const filteredLogs = useMemo(() => {
    const targetCourses = selectedCourseObj
      ? [selectedCourseObj]
      : teacherFilter !== 'all'
      ? teacherFilteredCourses
      : [];

    const hasCourseScope = selectedCourseObj !== null || teacherFilter !== 'all';
    const enrolledSet = hasCourseScope
      ? new Set(targetCourses.flatMap((c) => c.enrolledStudentIds || []))
      : null;
    const roomSet = hasCourseScope
      ? new Set(targetCourses.map((c) => c.room).filter(Boolean))
      : null;
    const targetCourseById = new Map(targetCourses.map((c) => [c.id, c]));

    const studentById = new Map(students.map((s) => [s.id, s]));

    const matchesDateRange = (dateStr: string) => {
      if (startDateFilter && dateStr < startDateFilter) return false;
      if (endDateFilter && dateStr > endDateFilter) return false;
      return true;
    };

    const matchesClass = (roomOrDept?: string, studentId?: string) => {
      if (classFilter === 'all') return true;
      const stu = studentId ? studentById.get(studentId) : undefined;
      return roomOrDept === classFilter || stu?.room === classFilter || stu?.gradeLevel === classFilter;
    };

    const matchesCourseGate = (log: AttendanceRecord) => {
      if (!hasCourseScope) return true;
      if (targetCourses.length === 0) return false;
      if (enrolledSet && enrolledSet.size > 0 && enrolledSet.has(log.studentId)) {
        return true;
      }
      if (roomSet && roomSet.size > 0) {
        const stu = studentById.get(log.studentId);
        return Boolean(
          (log.userDepartmentOrRoom && roomSet.has(log.userDepartmentOrRoom)) ||
          (stu?.room && roomSet.has(stu.room))
        );
      }
      return enrolledSet ? enrolledSet.size === 0 : false;
    };

    const gateMatches = scopedAttendance.filter(
      (a) => matchesDateRange(a.date) && matchesClass(a.userDepartmentOrRoom, a.studentId) && matchesCourseGate(a)
    );

    if (!hasCourseScope || periodAttendance.length === 0) {
      return gateMatches;
    }

    // Also include per-period attendance records for the selected course or teacher's courses
    const allowedStudentIds = isRestrictedViewer
      ? new Set(scopedStudents.map((s) => s.id))
      : null;

    const periodMapped: AttendanceRecord[] = periodAttendance
      .filter((pa) => {
        if (!targetCourseById.has(pa.courseId)) return false;
        if (!matchesDateRange(pa.date)) return false;
        if (allowedStudentIds && !allowedStudentIds.has(pa.studentId)) return false;
        const stu = studentById.get(pa.studentId);
        return matchesClass(stu?.room, pa.studentId);
      })
      .map((pa) => {
        const stu = studentById.get(pa.studentId);
        const matchedCourse = targetCourseById.get(pa.courseId);
        const mappedStatus: AttendanceStatus = pa.status === 'excused' ? 'leave' : pa.status;
        const mappedMethod: AttendanceRecord['checkinMethod'] =
          pa.checkMethod === 'qr_code'
            ? 'qr_scanner'
            : pa.checkMethod === 'teacher_proxy'
            ? 'teacher_proxy'
            : 'mobile_geofence';
        return {
          id: `pa-${pa.id}`,
          schoolId: pa.schoolId,
          studentId: pa.studentId,
          userType: 'student' as const,
          userName: stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : pa.studentId,
          userRole: stu ? `นักเรียน (${stu.gradeLevel})` : 'นักเรียน',
          userAvatar: stu?.avatarUrl,
          userDepartmentOrRoom: stu?.room || matchedCourse?.room || '-',
          recordType: pa.recordType || ('check_in' as const),
          date: pa.date,
          time: pa.timeSlot || `คาบ ${pa.periodNumber}`,
          status: mappedStatus,
          remarks: `รายวิชา ${matchedCourse?.code || ''} ${matchedCourse?.titleTh || ''} (คาบ ${pa.periodNumber})${pa.remarks ? ` - ${pa.remarks}` : ''}`.trim(),
          checkinMethod: mappedMethod,
          lineNotificationSent: false,
          recordedBy: pa.verifiedByTeacherName,
        };
      });

    return [...periodMapped, ...gateMatches];
  }, [
    scopedAttendance,
    periodAttendance,
    students,
    scopedStudents,
    isRestrictedViewer,
    startDateFilter,
    endDateFilter,
    classFilter,
    selectedCourseObj,
    teacherFilter,
    teacherFilteredCourses,
  ]);

  const displayedFilteredLogs = useMemo(() => {
    if (logScopeFilter === 'mine') {
      return filteredLogs.filter(a =>
        a.studentId === loggedInProfile.targetId ||
        a.userName === loggedInProfile.userName ||
        (currentUser && (a.studentId === currentUser.id || a.studentId === currentUser.studentRecordId))
      );
    }
    return filteredLogs;
  }, [filteredLogs, logScopeFilter, loggedInProfile, currentUser]);

  const applyQuickDatePreset = (preset: 'today' | '7d' | 'month' | 'all') => {
    const today = getLocalDateString();
    if (preset === 'today') {
      setStartDateFilter(today);
      setEndDateFilter(today);
      return;
    }
    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDateFilter(getLocalDateString(d));
      setEndDateFilter(today);
      return;
    }
    if (preset === 'month') {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDateFilter(firstOfMonth);
      setEndDateFilter(today);
      return;
    }
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleResetLogFilters = () => {
    const today = getLocalDateString();
    setStartDateFilter(today);
    setEndDateFilter(today);
    setClassFilter('all');
    setTeacherFilter('all');
    setCourseFilter('all');
    setLogScopeFilter('all');
  };

  // Leave approval remarks input
  const [approvalNote, setApprovalNote] = useState<Record<string, string>>({});
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Monthly Summary calculation (scoped for student/parent)
  const monthlySummary = useMemo(() => {
    return scopedStudents.map(student => {
      const records = scopedAttendance.filter(a => a.studentId === student.id);
      const totalDays = records.length;
      const presentDays = records.filter(a => a.status === 'present').length;
      const lateDays = records.filter(a => a.status === 'late').length;
      const sickDays = records.filter(a => a.status === 'sick' || a.status === 'leave').length;
      const absentDays = records.filter(a => a.status === 'absent').length;
      const rate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100;

      return {
        student,
        totalDays: totalDays || 1,
        presentDays,
        lateDays,
        sickDays,
        absentDays,
        rate,
        isQualified: rate >= 80 // 80% threshold for exam qualification (มส.)
      };
    });
  }, [scopedStudents, scopedAttendance]);

  // Quick Self Check-in for the logged-in staff/teacher/admin
  const handleSelfCheckIn = () => {
    setIsSelfCheckingIn(true);
    setScannerResult(null);

    setTimeout(() => {
      const extraPayload = {
        recordType: 'check_in' as const,
        userType: loggedInProfile.userType,
        userName: loggedInProfile.userName,
        userRole: loggedInProfile.userRoleLabel,
        userAvatar: loggedInProfile.avatarUrl,
        userDepartmentOrRoom: loggedInProfile.departmentOrRoom,
        teacherId: loggedInProfile.userType === 'teacher' ? loggedInProfile.targetId : undefined,
        recordedBy: currentUser?.fullNameTh,
        recordedByRole: currentUser?.role,
      };
      const offline = !isOnlineNow();
      if (offline) {
        enqueueOfflineAction({
          actionType: 'attendance',
          schoolId: activeSchool?.id || currentUser?.schoolId || 'school-1',
          description: `เช็คชื่อตนเอง (ออฟไลน์) ${loggedInProfile.userName}`,
          payload: {
            studentId: loggedInProfile.targetId,
            status,
            remarks: remarks || 'เช็คชื่อผ่านระบบหน้าเว็บโดยบัญชีตนเอง',
            method: 'qr_scanner',
            extra: extraPayload,
          },
        });
      }
      onRecordAttendance(
        loggedInProfile.targetId,
        status,
        remarks || 'เช็คชื่อผ่านระบบหน้าเว็บโดยบัญชีตนเอง',
        'qr_scanner',
        extraPayload
      );
      setIsSelfCheckingIn(false);
      setScannerResult(
        `เช็คชื่อบัญชีของคุณสำเร็จ: ${loggedInProfile.userName} (${loggedInProfile.userRoleLabel})${offline ? ' · บันทึกคิวออฟไลน์แล้ว' : ' - บันทึกเวลาแล้ว'}`
      );
      setTimeout(() => setScannerResult(null), 4000);
    }, 400);
  };

  // Simulate Turnstile Scan
  const handleSimulateScan = () => {
    if (!matchedScannerStudent) return;
    setIsScanning(true);
    setScannerResult(null);

    setTimeout(() => {
      const extraPayload = {
        recordType: 'check_in' as const,
        userName: `${matchedScannerStudent.firstNameTh} ${matchedScannerStudent.lastNameTh}`,
        userRole: `นักเรียน (${matchedScannerStudent.gradeLevel})`,
        userDepartmentOrRoom: matchedScannerStudent.room,
        userAvatar: matchedScannerStudent.avatarUrl,
        recordedBy: currentUser?.fullNameTh,
        recordedByRole: currentUser?.role,
      };
      const offline = !isOnlineNow();
      if (offline) {
        enqueueOfflineAction({
          actionType: 'attendance',
          schoolId: matchedScannerStudent.schoolId || activeSchool?.id || 'school-1',
          description: `สแกนเข้าเรียน (ออฟไลน์) ${matchedScannerStudent.firstNameTh} ${matchedScannerStudent.lastNameTh}`,
          payload: {
            studentId: matchedScannerStudent.id,
            status,
            remarks,
            method: 'qr_scanner',
            extra: extraPayload,
          },
        });
      }
      onRecordAttendance(
        matchedScannerStudent.id, 
        status, 
        remarks, 
        'qr_scanner',
        extraPayload
      );
      setIsScanning(false);
      setScannerResult(
        `สแกนสำเร็จ: ${matchedScannerStudent.firstNameTh} (${matchedScannerStudent.studentIdNumber}) - สถานะ ${status.toUpperCase()}${offline ? ' · บันทึกคิวออฟไลน์แล้ว' : ' บันทึกลงระบบแล้ว'}`
      );
      if (!isRestrictedViewer) {
        setScannerStudentIdInput('');
      }
      setTimeout(() => setScannerResult(null), 4000);
    }, 600);
  };

  // Export Daily / Filtered Attendance Report to CSV with UTF-8 BOM
  const handleExportDailyCsv = (customRange?: { start: string; end: string }) => {
    const activeStart = customRange ? customRange.start : startDateFilter;
    const activeEnd = customRange ? customRange.end : endDateFilter;

    const exportRecords = customRange
      ? scopedAttendance.filter((a) => {
          if (activeStart && a.date < activeStart) return false;
          if (activeEnd && a.date > activeEnd) return false;
          const stu = students.find((s) => s.id === a.studentId);
          if (classFilter !== 'all' && a.userDepartmentOrRoom !== classFilter && stu?.room !== classFilter && stu?.gradeLevel !== classFilter) {
            return false;
          }
          if (selectedCourseObj) {
            const enrolled = selectedCourseObj.enrolledStudentIds || [];
            if (enrolled.length > 0 && !enrolled.includes(a.studentId)) return false;
            if (enrolled.length === 0 && selectedCourseObj.room && a.userDepartmentOrRoom !== selectedCourseObj.room && stu?.room !== selectedCourseObj.room) {
              return false;
            }
          }
          return true;
        })
      : displayedFilteredLogs;

    const headers = [
      'วันที่',
      'เวลา',
      'รหัสประจำตัว',
      'ชื่อ-นามสกุล (ไทย)',
      'Student Name (EN)',
      'บทบาท',
      'ชั้น/ห้อง/กลุ่มสาระ',
      'รายวิชาที่กรอง',
      'ประเภทการบันทึก',
      'สถานะ (Status)',
      'วิธีการเช็คชื่อ',
      'จุดตรวจ/ประตู',
      'ระยะห่าง GPS (ม.)',
      'มีรูปถ่ายเซลฟี่',
      'หมายเหตุ'
    ];

    const courseLabel = selectedCourseObj ? `${selectedCourseObj.code} ${selectedCourseObj.titleTh}` : 'ทุกวิชา (ประตูโรงเรียน)';
    const rows = exportRecords.map(log => {
      const stu = students.find(s => s.id === log.studentId);
      const displayName = log.userName || (stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : 'ผู้ใช้งาน');
      const displayNameEn = stu ? `${stu.firstNameEn} ${stu.lastNameEn}` : displayName;
      const displayId = stu?.studentIdNumber || log.studentId;
      const statusLabel =
        log.status === 'present'
          ? 'ตรงเวลา (Present)'
          : log.status === 'late'
          ? 'มาสาย (Late)'
          : log.status === 'sick'
          ? 'ลาป่วย (Sick)'
          : log.status === 'leave'
          ? 'ลากิจ (Leave)'
          : 'ขาดเรียน (Absent)';
      return [
        `"${log.date}"`,
        `"${log.time}"`,
        `"${displayId}"`,
        `"${displayName}"`,
        `"${displayNameEn}"`,
        `"${log.userType === 'teacher' ? 'ครู' : 'นักเรียน'}"`,
        `"${log.userDepartmentOrRoom || stu?.room || '-'}"`,
        `"${courseLabel}"`,
        `"${log.recordType === 'check_out' ? 'ออกโรงเรียน' : 'เข้าโรงเรียน'}"`,
        `"${statusLabel}"`,
        `"${log.checkinMethod === 'selfie_geofence' ? 'ถ่ายรูปเซลฟี่+GPS' : log.checkinMethod === 'qr_scanner' ? 'เครื่องสแกน QR' : 'ระบบบันทึก'}"`,
        `"${log.location?.geofenceZoneName || 'ประตูโรงเรียน'}"`,
        log.location?.distanceMeters !== undefined ? `${log.location.distanceMeters}` : '-',
        `"${log.photoUrl ? 'ใช่' : 'ไม่ใช่'}"`,
        `"${(log.remarks || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rangeTag = activeStart && activeEnd
      ? (activeStart === activeEnd ? activeStart : `${activeStart}_to_${activeEnd}`)
      : 'all';
    link.download = `attendance_report_${rangeTag}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Export Monthly Attendance Summary to CSV
  const handleExportMonthlySummaryCsv = () => {
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ระดับชั้น',
      'ห้อง',
      'จำนวนวันทั้งหมด',
      'มาตรงเวลา (วัน)',
      'มาสาย (วัน)',
      'ลาป่วย/กิจ (วัน)',
      'ขาดเรียน (วัน)',
      'อัตราการมาเรียน (%)',
      'ผลการประเมินสิทธิ์สอบ'
    ];

    const rows = monthlySummary.map(m => [
      m.student.studentIdNumber,
      `"${m.student.firstNameTh} ${m.student.lastNameTh}"`,
      m.student.gradeLevel,
      m.student.room,
      m.totalDays,
      m.presentDays,
      m.lateDays,
      m.sickDays,
      m.absentDays,
      `${m.rate}%`,
      m.isQualified ? 'มีสิทธิ์สอบ (ผ่านเกณฑ์)' : 'เสี่ยง มส. (ต่ำกว่า 80%)'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly_attendance_summary_${new Date().getFullYear()}_${new Date().getMonth() + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmAttendanceImport = (records: AttendanceRecord[]) => {
    if (records.length === 0) return;
    if (onBulkImportAttendance) {
      onBulkImportAttendance(records);
    } else {
      records.forEach((rec) => {
        onRecordAttendance(rec.studentId, rec.status, rec.remarks || 'นำเข้าจาก Excel/CSV', rec.checkinMethod, {
          recordType: rec.recordType,
          date: rec.date,
          userName: rec.userName,
          userRole: rec.userRole,
          userAvatar: rec.userAvatar,
          userDepartmentOrRoom: rec.userDepartmentOrRoom,
          recordedBy: rec.recordedBy,
          recordedByRole: rec.recordedByRole,
        });
      });
    }
    setImportSuccessNotice(
      lang === 'th'
        ? `นำเข้าข้อมูลการเข้าเรียนสำเร็จ ${records.length} รายการเรียบร้อยแล้ว`
        : `Successfully imported ${records.length} attendance records.`
    );
    setTimeout(() => setImportSuccessNotice(null), 6000);
  };

  const filteredLeaveRequests = scopedLeaveRequests.filter(req => {
    if (leaveFilter === 'all') return true;
    return req.status === leaveFilter;
  });

  const attendanceGroup = getModuleGroupMeta('attendance');

  return (
    <div className={`${getModuleTone('attendance')} h-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden space-y-2`}>
      {/* Compact Top Header */}
      <div className="shrink-0 px-3 py-1.5 app-page-header flex flex-wrap items-center justify-between gap-2 text-[var(--color-text-body)]">
        <div className="min-w-0 flex items-center gap-2">
          <span className="tone-chip w-6 h-6 rounded-lg">
            <QrCode className="w-3.5 h-3.5 shrink-0" />
          </span>
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-[var(--color-text-title)] leading-tight truncate">
              การเข้าเรียน &amp; สแกนประตู
            </h1>
            <span className="hidden xl:inline module-category-kicker">
              {lang === 'th' ? attendanceGroup.labelTh : attendanceGroup.labelEn}
            </span>
          </div>
          <ModuleTourTrigger moduleId="attendance" lang={lang} />
        </div>

        {/* Subtabs Navigation */}
        <nav data-guide-id="attendance-tabs" aria-label="Attendance sections" className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="seg-tab-group overflow-x-auto no-scrollbar">
            <button
              type="button"
              data-active={activeTab === 'gate_scanner'}
              onClick={() => setActiveTab('gate_scanner')}
              className="seg-tab-btn"
            >
              1. สแกนประตู
            </button>
            <button
              type="button"
              data-active={activeTab === 'leave_approval'}
              onClick={() => setActiveTab('leave_approval')}
              className="seg-tab-btn flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{isRestrictedViewer ? '2. ใบลาของฉัน' : '2. อนุมัติใบลา'}</span>
              {scopedLeaveRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] tabular-nums">
                  {scopedLeaveRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              type="button"
              data-active={activeTab === 'export_reports'}
              onClick={() => setActiveTab('export_reports')}
              className="seg-tab-btn flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>3. ส่งออก</span>
            </button>
            {isAdminUser && (
              <button
                type="button"
                data-active={activeTab === 'period_qr'}
                onClick={() => setActiveTab('period_qr')}
                className="seg-tab-btn flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? '4. QR รายคาบ' : '4. Period QR'}</span>
              </button>
            )}
            {!isRestrictedViewer && (
              <button
                type="button"
                data-active={activeTab === 'school_gps'}
                onClick={() => setActiveTab('school_gps')}
                className="seg-tab-btn flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'GPS' : 'GPS'}</span>
              </button>
            )}
          </div>

          {/* Continuous Rapid Scanner Modal Trigger */}
          <button
            type="button"
            data-guide-id="attendance-rapid-scanner"
            onClick={() => setShowRapidScannerModal(true)}
            className="btn-action-primary px-3 py-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>สแกนรัว 1วิ/คน</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GATE SCANNER & REALTIME LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'gate_scanner' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Scanner Card: Students see ONLY their own locked pass; Teachers enter Student ID first */}
          <div data-guide-id="attendance-scanner-box" className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-body)]">
            <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>
                {isRestrictedViewer
                  ? 'เช็คชื่อผ่านประตูด้วยบัญชีของคุณ'
                  : 'ศูนย์สแกนประตู & เช็คชื่อประจำจุด'}
              </span>
            </h2>

            {/* Operator Identification & Quick Self Check-in */}
            {!isRestrictedViewer && (
              <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    ผู้ปฏิบัติงาน / บัญชีปัจจุบัน
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
                    {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'teacher' ? 'ครูผู้สอน' : 'เจ้าหน้าที่'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={loggedInProfile.avatarUrl}
                      alt={loggedInProfile.userName}
                      className="w-9 h-9 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-title)] truncate text-xs">{loggedInProfile.userName}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate">{loggedInProfile.userRoleLabel}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelfCheckIn}
                    disabled={isSelfCheckingIn}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                    title="บันทึกเวลาเข้าโรงเรียน/ปฏิบัติหน้าที่สำหรับตัวคุณเอง"
                  >
                    {isSelfCheckingIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                    <span>เช็คชื่อบัญชีฉัน</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {isRestrictedViewer ? (
                matchedScannerStudent && (
                  <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center gap-3">
                    <img
                      src={matchedScannerStudent.avatarUrl}
                      alt={matchedScannerStudent.firstNameTh}
                      className="w-10 h-10 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-title)] truncate">
                        {matchedScannerStudent.firstNameTh} {matchedScannerStudent.lastNameTh}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                        รหัส: {matchedScannerStudent.studentIdNumber} • {matchedScannerStudent.room}
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
                  <label className="text-[var(--color-text-body)] font-bold block">
                    สแกนเช็คชื่อให้นักเรียน (กรอกรหัส Student ID) <span className="text-rose-700 dark:text-rose-300">*</span>
                  </label>
                  <input
                    type="text"
                    value={scannerStudentIdInput}
                    onChange={(e) => setScannerStudentIdInput(e.target.value)}
                    placeholder={`เช่น ${students[0]?.studentIdNumber || 'ED-6901'}`}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-mono text-xs"
                  />
                  {students.length > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      ตัวอย่าง: {students.slice(0, 3).map((s) => s.studentIdNumber).join(', ')}
                    </p>
                  )}
                  {trimmedScannerId && matchedScannerStudent && (
                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 flex items-center gap-2.5">
                      <img
                        src={matchedScannerStudent.avatarUrl}
                        alt={matchedScannerStudent.firstNameTh}
                        className="w-8 h-8 rounded-lg object-cover border border-emerald-300 dark:border-emerald-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-emerald-950 dark:text-emerald-100 truncate">
                          {matchedScannerStudent.firstNameTh} {matchedScannerStudent.lastNameTh}
                        </p>
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-200 font-mono">
                          ยืนยันรหัส {matchedScannerStudent.studentIdNumber} • {matchedScannerStudent.room}
                        </p>
                      </div>
                    </div>
                  )}
                  {trimmedScannerId && !matchedScannerStudent && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                      ไม่พบนักเรียนรหัส "{trimmedScannerId}" กรุณาตรวจสอบอีกครั้ง
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-[var(--color-text-body)] font-semibold block mb-1">สถานะการเข้าเรียน:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                >
                  <option value="present">ตรงเวลา (Present)</option>
                  <option value="late">มาสาย (Late)</option>
                  <option value="absent">ขาดเรียน (Absent)</option>
                  <option value="sick">ลาป่วย (Sick Leave)</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--color-text-body)] font-semibold block mb-1">จุดประตู:</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
              </div>

              {scannerDupReasons.length > 0 && (
                <div className="p-2.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 text-[11px] flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                  <span>{scannerDupReasons.join(', ')} (หากสแกนซ้ำจะเป็นการบันทึกซ้ำ)</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isScanning || !matchedScannerStudent}
                className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-card-subtle)] disabled:text-[var(--color-text-muted)] disabled:border disabled:border-[var(--color-border)] disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลเซนเซอร์...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>{isRestrictedViewer ? 'สแกนบัตรของฉัน' : 'สแกนเช็คชื่อให้นักเรียน'}</span>
                  </>
                )}
              </button>

              {scannerResult && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <span>{scannerResult}</span>
                </div>
              )}
            </div>
          </div>

          {/* Realtime Attendance Logs & Filter Component */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-body)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span>
                    บันทึกการเข้า-ออกโรงเรียน (
                    {startDateFilter && endDateFilter
                      ? startDateFilter === endDateFilter
                        ? startDateFilter
                        : `${startDateFilter} ถึง ${endDateFilter}`
                      : startDateFilter
                        ? `ตั้งแต่ ${startDateFilter}`
                        : endDateFilter
                          ? `ถึง ${endDateFilter}`
                          : 'ทุกวันที่'}
                    )
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">พบ {displayedFilteredLogs.length} รายการ</span>
                  {!isRestrictedViewer && (
                    <div className="seg-tab-group text-[11px]">
                      <button
                        type="button"
                        data-active={logScopeFilter === 'all'}
                        onClick={() => setLogScopeFilter('all')}
                        className="seg-tab-btn px-2 py-0.5 text-[11px]"
                      >
                        ทั้งหมด ({filteredLogs.length})
                      </button>
                      <button
                        type="button"
                        data-active={logScopeFilter === 'mine'}
                        onClick={() => setLogScopeFilter('mine')}
                        className="seg-tab-btn px-2 py-0.5 text-[11px]"
                      >
                        เฉพาะบัญชีฉัน ({filteredLogs.filter(a => a.studentId === loggedInProfile.targetId || a.userName === loggedInProfile.userName || (currentUser && (a.studentId === currentUser.id || a.studentId === currentUser.studentRecordId))).length})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Daily vs Weekly vs Homeroom Roll-Call Toggle */}
                <div
                  role="group"
                  aria-label={lang === 'th' ? 'สลับมุมมองรายวัน รายสัปดาห์ หรือเช็คชื่อโฮมรูม' : 'Switch attendance mode'}
                  className="seg-tab-group text-xs"
                >
                  <button
                    type="button"
                    data-active={attendanceViewMode === 'daily'}
                    onClick={() => setAttendanceViewMode('daily')}
                    className="seg-tab-btn"
                  >
                    {lang === 'th' ? 'รายวัน' : 'Daily'}
                  </button>
                  <button
                    type="button"
                    data-active={attendanceViewMode === 'weekly'}
                    onClick={() => {
                      if (startDateFilter) setSelectedWeekDate(startDateFilter);
                      setAttendanceViewMode('weekly');
                    }}
                    className="seg-tab-btn flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'รายสัปดาห์ (จ.–ศ.)' : 'Weekly (Mon–Fri)'}</span>
                  </button>
                  {!isRestrictedViewer && (
                    <button
                      type="button"
                      data-active={attendanceViewMode === 'homeroom_rollcall'}
                      onClick={() => {
                        if (classFilter !== 'all') setRollCallRoom(classFilter);
                        setAttendanceViewMode('homeroom_rollcall');
                      }}
                      className="seg-tab-btn flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'เช็คชื่อทั้งห้อง (มาทุกคน)' : 'Homeroom Roll Call'}</span>
                    </button>
                  )}
                </div>

                {!isRestrictedViewer && (
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="btn-tool-tone px-3 py-1.5"
                    title="นำเข้าบันทึกการเข้าเรียนจากไฟล์ Excel (.xlsx) หรือ CSV สำหรับห้องเรียนขนาดใหญ่"
                  >
                    <Upload className="w-3.5 h-3.5 tone-text" />
                    <span>Import Excel/CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExportDailyCsv()}
                  className="btn-action-success px-3 py-1.5"
                  title="ส่งออกรายงานการเข้าเรียนประจำวัน/ช่วงวันที่ที่กรองเป็นไฟล์ CSV พร้อมชื่อนักเรียนและสถานะ"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {importSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {importSuccessNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setImportSuccessNotice(null)}
                  className="opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Filter Component: Functional Groups (Date Range vs Room & Course/Teacher) */}
            <div className="toolbar-filter-zone space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="fn-group-tone w-full lg:w-auto">
                  <span className="fn-group-label">
                    <Filter className="w-3 h-3" />
                    <span>ช่วงวันที่</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyQuickDatePreset('today')}
                      className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--tone-soft)] text-[11px] font-semibold cursor-pointer"
                    >
                      วันนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickDatePreset('7d')}
                      className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--tone-soft)] text-[11px] font-semibold cursor-pointer"
                    >
                      7 วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickDatePreset('month')}
                      className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--tone-soft)] text-[11px] font-semibold cursor-pointer"
                    >
                      เดือนนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickDatePreset('all')}
                      className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--tone-soft)] text-[11px] font-semibold cursor-pointer"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                  <input
                    type="date"
                    aria-label="ตั้งแต่วันที่"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)]"
                  />
                  <span className="text-[11px] text-[var(--color-text-muted)]">ถึง</span>
                  <input
                    type="date"
                    aria-label="ถึงวันที่"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)]"
                  />
                </div>

                <div className="fn-group flex-1">
                  <span className="fn-group-label text-[var(--color-text-muted)]">ห้องเรียน &amp; วิชา/ครู</span>
                  <select
                    aria-label="กรองตามห้องเรียน"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] font-medium"
                  >
                    <option value="all">ทุกห้องเรียน ({availableClasses.length})</option>
                    {availableClasses.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="กรองวิชาตามรายชื่อครู"
                    value={teacherFilter}
                    onChange={(e) => {
                      const nextTeacher = e.target.value;
                      setTeacherFilter(nextTeacher);
                      if (courseFilter !== 'all') {
                        const cur = courses.find((c) => c.id === courseFilter);
                        if (cur && !courseMatchesTeacherFilter(cur, nextTeacher, courseTeacherOptions)) {
                          setCourseFilter('all');
                        }
                      }
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] font-medium max-w-[180px]"
                  >
                    <option value="all">ครูผู้สอนทุกคน ({courseTeacherOptions.length})</option>
                    {courseTeacherOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count} วิชา)
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="กรองตามรายวิชา"
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] font-medium max-w-[200px]"
                  >
                    <option value="all">
                      {teacherFilter === 'all'
                        ? 'ทุกรายวิชา (เช็คชื่อประตูรวม)'
                        : `ทุกวิชาของครูที่เลือก (${teacherFilteredCourses.length})`}
                    </option>
                    {teacherFilteredCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.titleTh}
                      </option>
                    ))}
                  </select>

                  {(classFilter !== 'all' || teacherFilter !== 'all' || courseFilter !== 'all' || startDateFilter !== todayDateStr || endDateFilter !== todayDateStr) && (
                    <button
                      type="button"
                      onClick={handleResetLogFilters}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      รีเซ็ต
                    </button>
                  )}
                </div>
              </div>
            </div>

            {attendanceViewMode === 'homeroom_rollcall' && !isRestrictedViewer ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-2.5">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>เช็คชื่อโฮมรูมด่วน — มาทุกคนเป็นค่าเริ่มต้น (ติ๊กเฉพาะคนขาด/สาย/ลา)</span>
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      ระบบดึงใบลาที่อนุมัติแล้วมาเติมให้อัตโนมัติ ลดเวลาเช็คชื่อเหลือไม่ถึง 30 วินาทีต่อห้อง
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="เลือกห้องเช็คชื่อโฮมรูม"
                      value={effectiveRollCallRoom}
                      onChange={(e) => {
                        setRollCallRoom(e.target.value);
                        setRollCallOverrides({});
                      }}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold text-[var(--color-text-title)]"
                    >
                      {availableClasses.length === 0 ? (
                        <option value="all">นักเรียนทั้งหมด</option>
                      ) : (
                        availableClasses.map((room) => (
                          <option key={room} value={room}>
                            ห้อง {room} ({scopedStudents.filter((s) => s.room === room).length} คน)
                          </option>
                        ))
                      )}
                    </select>
                    <input
                      type="date"
                      aria-label="วันที่เช็คชื่อโฮมรูม"
                      value={rollCallDate}
                      onChange={(e) => {
                        setRollCallDate(e.target.value);
                        setRollCallOverrides({});
                      }}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                    />
                    <button
                      type="button"
                      onClick={() => setRollCallOverrides({})}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] font-semibold text-[var(--color-text-body)] cursor-pointer"
                    >
                      รีเซ็ตค่าเริ่มต้น
                    </button>
                  </div>
                </div>

                {rollCallStudents.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
                    ไม่พบรายชื่อนักเรียนในห้องที่เลือก
                  </p>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                      {rollCallStudents.map((stu, idx) => {
                        const def = getDefaultRollCallStatus(stu);
                        const currentStatus = rollCallOverrides[stu.id] || def.status;
                        const statusOptions: { value: AttendanceStatus; label: string; activeCls: string }[] = [
                          { value: 'present', label: 'มาเรียน', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
                          { value: 'late', label: 'มาสาย', activeCls: 'bg-amber-500 text-slate-950 border-amber-500' },
                          { value: 'sick', label: 'ลาป่วย', activeCls: 'bg-sky-600 text-white border-sky-600' },
                          { value: 'leave', label: 'ลากิจ', activeCls: 'bg-indigo-600 text-white border-indigo-600' },
                          { value: 'absent', label: 'ขาด', activeCls: 'bg-rose-600 text-white border-rose-600' },
                        ];
                        return (
                          <div key={stu.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 text-[11px] font-mono text-[var(--color-text-muted)] text-right shrink-0">
                                {idx + 1}.
                              </span>
                              <img
                                src={stu.avatarUrl}
                                alt={stu.firstNameTh}
                                className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-[var(--color-text-title)] truncate">
                                  {stu.firstNameTh} {stu.lastNameTh}
                                  {def.source === 'leave' && (
                                    <span className="ml-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                      (มีใบลาอนุมัติ)
                                    </span>
                                  )}
                                  {def.source === 'recorded' && (
                                    <span className="ml-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                      (เช็คแล้ว)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                  {stu.studentIdNumber} · {stu.room}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 shrink-0">
                              {statusOptions.map((opt) => {
                                const selected = currentStatus === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRollCallOverrides((prev) => ({ ...prev, [stu.id]: opt.value }))}
                                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                                      selected
                                        ? opt.activeCls
                                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs font-semibold text-[var(--color-text-body)] tabular-nums">
                        {(() => {
                          const resolvedList = rollCallStudents.map((s) => rollCallOverrides[s.id] || getDefaultRollCallStatus(s).status);
                          const presentN = resolvedList.filter((st) => st === 'present').length;
                          const lateN = resolvedList.filter((st) => st === 'late').length;
                          const leaveN = resolvedList.filter((st) => st === 'sick' || st === 'leave').length;
                          const absentN = resolvedList.filter((st) => st === 'absent').length;
                          return `รวม ${rollCallStudents.length} คน: มาเรียน ${presentN} · สาย ${lateN} · ลา ${leaveN} · ขาด ${absentN}`;
                        })()}
                      </div>
                      <button
                        type="button"
                        disabled={isSavingRollCall}
                        onClick={handleSaveHomeroomRollCall}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>บันทึกเช็คชื่อทั้งห้อง ({rollCallStudents.length} คน)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : attendanceViewMode === 'weekly' ? (
              <WeeklyAttendanceGrid
                students={scopedStudents}
                attendance={scopedAttendance}
                periodAttendance={periodAttendance}
                leaveRequests={scopedLeaveRequests}
                selectedWeekDate={selectedWeekDate}
                onChangeWeekDate={setSelectedWeekDate}
                selectedCourse={selectedCourseObj}
                classFilter={classFilter}
                lang={lang}
                onSyncDateRangeToWeek={(monIso, friIso) => {
                  setStartDateFilter(monIso);
                  setEndDateFilter(friIso);
                  handleExportDailyCsv({ start: monIso, end: friIso });
                }}
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {displayedFilteredLogs.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">
                    {logScopeFilter === 'mine' ? 'ไม่พบบันทึกเช็คชื่อของบัญชีคุณในวันนี้' : 'ไม่พบบันทึกการเข้าเรียนในวันที่เลือก'}
                  </p>
                ) : (
                  <PagedList items={displayedFilteredLogs} pageSize={6} renderItem={(log) => {
                    const student = students.find(s => s.id === log.studentId);
                    const name = log.userName || (student ? `${student.firstNameTh} ${student.lastNameTh}` : log.studentId);
                    const photoSrc = log.photoUrl || log.userAvatar || student?.avatarUrl;
                    const isMyRecord = log.studentId === loggedInProfile.targetId ||
                      log.userName === loggedInProfile.userName ||
                      (currentUser && (log.studentId === currentUser.id || log.studentId === currentUser.studentRecordId));

                    return (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => log.photoUrl && setSelectedPhotoModal(log)}
                            className={`relative w-10 h-10 rounded-xl overflow-hidden bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0 ${
                              log.photoUrl ? 'cursor-pointer ring-2 ring-[var(--color-primary)]/50 hover:opacity-90' : ''
                            }`}
                          >
                            <img src={photoSrc} alt={name} className="w-full h-full object-cover" />
                            {log.photoUrl && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--color-text-title)]">{name}</span>
                              {isMyRecord && (
                                <span className="px-1.5 py-0.2 rounded-sm bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[9px] border border-emerald-300 dark:border-emerald-700">
                                  บัญชีของคุณ
                                </span>
                              )}
                              {log.recordType === 'check_out' ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-bold">ออก</span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">เข้า</span>
                              )}
                              <span className="text-[var(--color-text-muted)] font-mono text-[11px]">({log.studentId})</span>
                            </div>
                            <div className="text-[11px] text-[var(--color-text-muted)]">
                              เวลา {log.time} น. • {log.location?.geofenceZoneName || log.remarks || 'สแกนประตู'}
                              {log.location?.distanceMeters !== undefined && ` (GPS ${log.location.distanceMeters} ม.)`}
                              {log.recordedBy && ` • บันทึกโดย: ${log.recordedBy}`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            log.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' :
                            log.status === 'late' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                          }`}>
                            {log.status === 'present' ? 'ตรงเวลา' : log.status === 'late' ? 'มาสาย' : 'ขาด/ลา'}
                          </span>
                        </div>
                      </div>
                    );
                  }} />
                )}
              </div>
            )}
          </div>
        </div>

          {/* 30-Day Check-in Heatmap (Peak Times & Popular Entry Gates) */}
          <div className="mt-5">
            <AttendanceCheckinHeatmap
              attendance={scopedAttendance}
              campusGates={campusGates}
              lang={lang}
            />
          </div>

          {/* Monthly Attendance Trends Recharts LineChart */}
          <div className="mt-5">
            <AttendanceMonthlyTrendLineChart
              attendance={scopedAttendance}
              students={scopedStudents}
              lang={lang}
              selectedRoom={classFilter}
            />
          </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE REQUESTS APPROVAL WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'leave_approval' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-body)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ระบบพิจารณาและอนุมัติใบลาออนไลน์</span>
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  เมื่ออนุมัติใบลา ระบบจะปรับสถานะในระบบเช็คชื่อประจำวันให้เป็น 'ลาป่วย' หรือ 'ลากิจ' โดยอัตโนมัติ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
                {!isRestrictedViewer && onUpdateLeaveStatus && scopedLeaveRequests.some((r) => r.status === 'pending') && (
                  <button
                    type="button"
                    onClick={() => {
                      const pending = scopedLeaveRequests.filter((r) => r.status === 'pending');
                      pending.forEach((req) => {
                        onUpdateLeaveStatus(req.id, 'approved', approvalNote[req.id] || 'อนุมัติแบบรวมรายการโดยครู/ผู้ดูแล');
                      });
                      emitMascotDashboardEvent({
                        type: 'success',
                        titleTh: `อนุมัติใบลาทั้งหมด ${pending.length} รายการ`,
                        titleEn: `Approved ${pending.length} leave requests`,
                        messageTh: 'อัปเดตสถานะในระบบเช็คชื่อประจำวันให้อัตโนมัติเรียบร้อยแล้ว',
                        messageEn: 'Daily attendance leave statuses updated automatically.',
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>อนุมัติใบลาที่รอทั้งหมด ({scopedLeaveRequests.filter((r) => r.status === 'pending').length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLeaveFilter('all')}
                  className={`py-1 border-b-2 transition cursor-pointer ${leaveFilter === 'all' ? 'border-[var(--color-primary)] text-[var(--color-text-title)] font-bold' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:underline'}`}
                >
                  ทั้งหมด ({scopedLeaveRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('pending')}
                  className={`py-1 border-b-2 transition cursor-pointer ${leaveFilter === 'pending' ? 'border-amber-600 dark:border-amber-400 text-amber-800 dark:text-amber-300 font-bold' : 'border-transparent text-[var(--color-text-muted)] hover:text-amber-800 dark:hover:text-amber-300 hover:underline'}`}
                >
                  รออนุมัติ ({scopedLeaveRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('approved')}
                  className={`py-1 border-b-2 transition cursor-pointer ${leaveFilter === 'approved' ? 'border-emerald-600 dark:border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold' : 'border-transparent text-[var(--color-text-muted)] hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline'}`}
                >
                  อนุมัติแล้ว ({scopedLeaveRequests.filter(r => r.status === 'approved').length})
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredLeaveRequests.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">ไม่มีรายการใบลาในหมวดนี้</p>
              ) : (
                <PagedList items={filteredLeaveRequests} pageSize={2} renderItem={(req) => (
                  <div key={req.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          req.leaveType === 'sick' ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700' :
                          req.leaveType === 'personal' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' : 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                        }`}>
                          {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}
                        </span>
                        <h4 className="font-bold text-[var(--color-text-title)] text-sm">{req.userName}</h4>
                        <span className="text-[var(--color-text-muted)]">({req.gradeLevelOrDepartment})</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border self-start sm:self-auto ${
                        req.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' :
                        req.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                      }`}>
                        {req.status === 'approved' ? 'อนุมัติเรียบร้อย' : req.status === 'pending' ? 'รอการพิจารณา' : 'ไม่อนุมัติ'}
                      </span>
                    </div>

                    <div className="p-3 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] space-y-1">
                      <p className="text-[var(--color-text-muted)] text-[11px]">
                        ระยะเวลาลา: <strong className="text-[var(--color-text-title)]">{req.startDate} ถึง {req.endDate}</strong> • วันที่ยื่น: {req.createdAt}
                      </p>
                      <p className="text-[var(--color-text-body)] font-medium">"{req.reason}"</p>
                      {req.attachmentUrl && (
                        <div className="pt-2">
                          <span className="text-[10px] text-[var(--color-text-muted)] block mb-1">เอกสาร/ใบรับรองแพทย์แนบ:</span>
                          <img src={req.attachmentUrl} alt="Certificate" className="w-32 h-20 rounded-lg object-cover border border-[var(--color-border)]" />
                        </div>
                      )}
                    </div>

                    {req.status === 'pending' && onUpdateLeaveStatus && !isRestrictedViewer && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="ข้อความหมายเหตุการอนุมัติ..."
                          value={approvalNote[req.id] || ''}
                          onChange={(e) => setApprovalNote({ ...approvalNote, [req.id]: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] flex-1 bg-[var(--color-card)]"
                        />
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(req.id, 'approved', approvalNote[req.id])}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติใบลา</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(req.id, 'rejected', approvalNote[req.id])}
                            className="text-rose-700 dark:text-rose-300 hover:underline font-bold text-xs underline-offset-4 flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>ปฏิเสธ</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXPORT REPORTS (EXCEL & PDF ATTENDANCE ENGINE) */}
      {/* ========================================================================= */}
      {activeTab === 'export_reports' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-5 text-[var(--color-text-body)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--color-primary-text)]" />
                  <span>ศูนย์ส่งออกรายงานสถิติการเข้าเรียน (Attendance Export Engine)</span>
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  ดาวน์โหลดไฟล์ Excel (.csv รองรับภาษาไทย UTF-8) หรือสั่งพิมพ์รายงานสรุปสิทธิ์สอบ (มส.)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {!isRestrictedViewer && (
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <span>นำเข้า Excel/CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExportDailyCsv()}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportMonthlySummaryCsv}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ส่งออก Excel รายเดือน</span>
                </button>
              </div>
            </div>

            <AttendanceCheckinHeatmap
              attendance={scopedAttendance}
              campusGates={campusGates}
              lang={lang}
            />

            <AttendanceMonthlyTrendLineChart
              attendance={scopedAttendance}
              students={scopedStudents}
              lang={lang}
              selectedRoom={classFilter}
            />

            {/* Monthly Summary Table Preview */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                ตัวอย่างตารางสรุปการเข้าเรียนประจำเดือน (Student Attendance &amp; Qualification Matrix)
              </h3>

              <div className="border border-[var(--color-border)] rounded-xl overflow-x-auto shadow-2xs">
                <table className="table-comfortable w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="p-3">รหัสนักเรียน</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">ชั้น / ห้อง</th>
                      <th className="p-3 text-center">มาเรียน</th>
                      <th className="p-3 text-center">มาสาย</th>
                      <th className="p-3 text-center">ลาป่วย/กิจ</th>
                      <th className="p-3 text-center">ขาดเรียน</th>
                      <th className="p-3 text-center">เปอร์เซ็นต์</th>
                      <th className="p-3 text-center">สถานะสิทธิ์สอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    <PaginatedTableRows items={monthlySummary} colSpan={9} renderRow={(m) => (
                      <tr key={m.student.id} className="hover:bg-[var(--color-card-subtle)] transition">
                        <td className="p-3 font-mono text-[var(--color-text-muted)]">{m.student.studentIdNumber}</td>
                        <td className="p-3 font-bold text-[var(--color-text-title)]">{m.student.firstNameTh} {m.student.lastNameTh}</td>
                        <td className="p-3 text-[var(--color-text-body)]">{m.student.gradeLevel} {m.student.room}</td>
                        <td className="p-3 text-center text-emerald-700 dark:text-emerald-300 font-bold">{m.presentDays}</td>
                        <td className="p-3 text-center text-amber-800 dark:text-amber-300 font-bold">{m.lateDays}</td>
                        <td className="p-3 text-center text-[var(--color-primary-text)] font-bold">{m.sickDays}</td>
                        <td className="p-3 text-center text-rose-700 dark:text-rose-300 font-bold">{m.absentDays}</td>
                        <td className="p-3 text-center font-mono font-bold text-[var(--color-text-title)]">{m.rate}%</td>
                        <td className="p-3 text-center">
                          {m.isQualified ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                              ผ่านเกณฑ์
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-[10px] font-bold">
                              เสี่ยง มส.
                            </span>
                          )}
                        </td>
                      </tr>
                    )} />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ADMIN EXPIRING CLASS-PERIOD QR CODE UTILITY */}
      {/* ========================================================================= */}
      {activeTab === 'period_qr' && isAdminUser && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <PeriodQrGeneratorPanel
            schoolId={activeSchool?.id || currentUser?.schoolId || 'sch-1'}
            courses={courses}
            teachers={teachers}
            students={students}
            schoolPeriods={schoolPeriods}
            timetableSlots={timetableSlots}
            periodAttendance={periodAttendance}
            lang={lang}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SCHOOL GPS & GEOFENCE SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'school_gps' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <SchoolGpsSettingsCard
            activeSchool={activeSchool || {
              id: 'sch-1',
              code: 'SCH-BKK01',
              nameTh: 'โรงเรียนเตรียมอุดมศึกษานวัตกรรม',
              nameEn: 'Triam Udom Suksa Innovation Academy',
              slug: 'triam-udom-innovation',
              type: 'public',
              province: 'กรุงเทพมหานคร',
              address: 'ถนนพญาไท เขตปทุมวัน กรุงเทพฯ 10330',
              phone: '02-218-1234',
              email: 'info@triamudom.ac.th',
              primaryColor: '#1e40af',
              studentsCount: 2450,
              teachersCount: 142,
              academicYear: '2569',
              currentSemester: '1',
              lineOaId: '@triamudom_sis',
              createdAt: '2025-01-01',
              status: 'active'
            }}
            campusGates={campusGates}
            currentRole={currentRole}
            lang={lang}
            onUpdateCampusGates={onUpdateCampusGates || (() => {})}
            onSaveCampusGates={onSaveCampusGates}
            onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
          />
        </div>
      )}

      {/* Lightbox Modal for Zooming Selfie Photo in Attendance Logs */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-[var(--color-text-body)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--color-text-title)]">รูปถ่ายเช็คชื่อตอนผ่านประตู</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedPhotoModal.date} • {selectedPhotoModal.time} น.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-72 mx-auto border border-[var(--color-border)] bg-slate-950 flex items-center justify-center">
              <img
                src={selectedPhotoModal.photoUrl}
                alt="Selfie Zoom"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/75 backdrop-blur-md text-white text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{selectedPhotoModal.userName}</span>
                  <span>{selectedPhotoModal.time} น.</span>
                </div>
                <div className="text-slate-200 text-[9px]">
                  {selectedPhotoModal.location?.geofenceZoneName || 'ประตูโรงเรียน'} • ในรัศมี {selectedPhotoModal.location?.distanceMeters || 18} ม.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPhotoModal(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Continuous Rapid Scanner Modal */}
      <ContinuousRapidScannerModal
        isOpen={showRapidScannerModal}
        onClose={() => setShowRapidScannerModal(false)}
        students={students}
        schoolId={activeSchool?.id || currentUser?.schoolId || 'school-1'}
        currentUser={currentUser}
        onRecordAttendance={onRecordAttendance}
        lang={lang}
      />

      {/* Excel / CSV Attendance Batch Import Modal */}
      <AttendanceImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        students={students}
        existingAttendance={attendance}
        schoolId={activeSchool?.id || currentUser?.schoolId || 'school-1'}
        currentUser={currentUser}
        lang={lang}
        initialRoomFilter={classFilter}
        onConfirmImport={handleConfirmAttendanceImport}
      />
    </div>
  );
};
