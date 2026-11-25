import React, { useState, useMemo, useEffect } from 'react';
import AttendancePhoto from '../components/AttendancePhoto';
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
  FileEdit,
  LogOut,
  Upload
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { getModuleTone } from '../lib/moduleTheme';
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
import { PaginatedTableRows } from '../components/common/PaginatedTableRows';
import { EmptyState } from '../components/common/EmptyState';
import { emitAppToast } from '../components/common/ToastProvider';
import {
  AttendanceCorrectionHub,
  type CorrectionPrefillSeed,
} from '../components/attendance/AttendanceCorrectionHub';
import { loadAttendanceCorrections } from '../lib/attendanceCorrections';
import { sendEduVerseNotification } from '../lib/pushNotifications';

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
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
  onOpenGpsSettings?: () => void;
  onLoadAttendanceRange?: (startDate?: string | null, endDate?: string | null) => Promise<void> | void;
  lineEnabled?: boolean;
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
  onRecordPeriodAttendance,
  onOpenGpsSettings,
  onLoadAttendanceRange,
  lineEnabled = true,
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
  const [activeTab, setActiveTab] = useState<'gate_scanner' | 'leave_approval' | 'time_corrections' | 'export_reports' | 'period_qr' | 'school_gps'>('gate_scanner');
  const [correctionPrefill, setCorrectionPrefill] = useState<CorrectionPrefillSeed | null>(null);
  const [showRapidScannerModal, setShowRapidScannerModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);

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
          (s.studentIdNumber || '').trim().toLowerCase() === normalizedScannerToken.toLowerCase()
          || (s.id || '').trim().toLowerCase() === normalizedScannerToken.toLowerCase()
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
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (!onLoadAttendanceRange) return;
    if (!startDateFilter && !endDateFilter) {
      void onLoadAttendanceRange(null, null);
      return;
    }
    if (startDateFilter && endDateFilter && startDateFilter > endDateFilter) return;
    void onLoadAttendanceRange(startDateFilter || null, endDateFilter || null);
  }, [startDateFilter, endDateFilter, onLoadAttendanceRange]);

  useEffect(() => {
    if (onLoadAttendanceRange && rollCallDate) void onLoadAttendanceRange(rollCallDate, rollCallDate);
  }, [rollCallDate, onLoadAttendanceRange]);

  useEffect(() => {
    if (!onLoadAttendanceRange || !selectedWeekDate) return;
    const monday = new Date(`${selectedWeekDate}T00:00:00`);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    void onLoadAttendanceRange(getLocalDateString(monday), getLocalDateString(friday));
  }, [selectedWeekDate, onLoadAttendanceRange]);

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
        lineNotificationSent: lineEnabled && stu.lineLinked && stu.lineNotifyEnabled,
        recordedBy: loggedInProfile.userName,
        recordedByRole: currentUser?.role || currentRole,
      };
    });
    handleConfirmAttendanceImport(records);
    setRollCallOverrides({});
    setIsSavingRollCall(false);
    setImportSuccessNotice(
      lang === 'th'
        ? `บันทึกเช็คชื่อห้อง ${effectiveRollCallRoom} ครบ ${records.length} คนเรียบร้อยแล้ว`
        : `Saved roll call for ${records.length} students.`
    );
    setTimeout(() => setImportSuccessNotice(null), 5000);
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
          userId: currentUser?.id || '',
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
          userId: currentUser?.id || '',
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
        `"${log.checkinMethod === 'selfie_geofence' ? 'ถ่ายรูปเซลฟี่+GPS' : log.checkinMethod === 'qr_scanner' ? 'เครื่องสแกน QR' : log.checkinMethod === 'nfc' ? 'แตะบัตร NFC' : log.checkinMethod === 'rfid' ? 'บัตร RFID' : log.checkinMethod === 'teacher_proxy' ? 'ครู/แอดมินลงชื่อ' : 'ระบบบันทึก'}"`,
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
    emitAppToast({
      tone: 'success',
      message: `ส่งออกรายงานเวลาเรียน (${exportRecords.length} รายการ) เป็น CSV แล้ว`,
    });
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
    emitAppToast({
      tone: 'success',
      message: `ส่งออกสรุปการมาเรียนรายเดือน (${monthlySummary.length} คน) เป็น CSV แล้ว`,
    });
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

  const pendingLeaveCount = scopedLeaveRequests.filter((r) => r.status === 'pending').length;
  const activeSchoolId = activeSchool?.id || currentUser?.schoolId || 'sch-1';
  const pendingCorrectionCount = loadAttendanceCorrections(activeSchoolId).filter(
    (r) => r.stage === 'pending_homeroom' || r.stage === 'pending_admin'
  ).length;

  return (
    <div className={`${getModuleTone('attendance')} h-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden space-y-4`}>
      {/* Compact SaaS Top Header */}
      <div className="shrink-0 px-4 py-3 sm:px-5 app-page-header flex flex-wrap items-center justify-between gap-3 text-[var(--color-text-body)]">
        <div className="min-w-0 flex items-center gap-3">
          <span className="tone-chip w-9 h-9 rounded-xl">
            <QrCode className="w-4 h-4 shrink-0" />
          </span>
          <div className="min-w-0">
            <div className="module-category-kicker">04 · เช็กชื่อ กิจการ &amp; สุขภาพ</div>
            <h1 className="type-page-title truncate">
              การเข้าเรียน &amp; สแกนประตู
            </h1>
          </div>
        </div>

        {/* Subtabs Navigation */}
        <nav data-guide-id="attendance-tabs" aria-label="Attendance sections" className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="seg-tab-group overflow-x-auto no-scrollbar">
            <button
              type="button"
              data-active={activeTab === 'gate_scanner'}
              onClick={() => setActiveTab('gate_scanner')}
              className="seg-tab-btn"
              title="สแกนบัตรหน้าประตูและดูบันทึกเวลาแบบเรียลไทม์"
            >
              สแกนประตู
            </button>
            <button
              type="button"
              data-active={activeTab === 'leave_approval'}
              onClick={() => setActiveTab('leave_approval')}
              className="seg-tab-btn"
              title="ตรวจสอบและอนุมัติคำขอลาออนไลน์"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{isRestrictedViewer ? 'ใบลาของฉัน' : 'อนุมัติใบลา'}</span>
              {pendingLeaveCount > 0 && (
                <span className="font-bold tabular-nums text-amber-600 dark:text-amber-300">
                  ({pendingLeaveCount})
                </span>
              )}
            </button>
            <button
              type="button"
              data-active={activeTab === 'time_corrections'}
              onClick={() => setActiveTab('time_corrections')}
              className="seg-tab-btn"
              title="ครูประจำชั้นยืนยันเข้า-ออก และอนุมัติคำขอแก้ไขปรับปรุงเวลาตามลำดับชั้น"
            >
              <FileEdit className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'แก้ไขเวลา / ยืนยัน' : 'Time Corrections'}</span>
              {pendingCorrectionCount > 0 && (
                <span className="font-bold tabular-nums text-amber-600 dark:text-amber-300">
                  ({pendingCorrectionCount})
                </span>
              )}
            </button>
            <button
              type="button"
              data-active={activeTab === 'export_reports'}
              onClick={() => setActiveTab('export_reports')}
              className="seg-tab-btn"
              title="สรุปรายงานสถิติ กราฟแนวโน้ม และส่งออกไฟล์ Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'สถิติและรายงาน' : 'Analytics & Reports'}</span>
            </button>
            {isAdminUser && (
              <button
                type="button"
                data-active={activeTab === 'period_qr'}
                onClick={() => setActiveTab('period_qr')}
                className="seg-tab-btn"
                title="สร้างรหัส QR เช็คชื่อประจำคาบเรียน"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'QR รายคาบ' : 'Period QR'}</span>
              </button>
            )}
            {isAdminUser && (
              <button
                type="button"
                data-active={activeTab === 'school_gps'}
                onClick={() => setActiveTab('school_gps')}
                className="seg-tab-btn"
                title="ตั้งค่าพิกัด GPS และรัศมีประตูโรงเรียน (เฉพาะผู้ดูแลระบบโรงเรียน)"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>GPS</span>
              </button>
            )}
          </div>

          {/* Continuous Rapid Scanner Modal Trigger */}
          <button
            type="button"
            data-guide-id="attendance-rapid-scanner"
            onClick={() => setShowRapidScannerModal(true)}
            className="btn-action-primary h-9 px-3"
            title="เปิดโหมดกล้องสแกน QR / บาร์โค้ดต่อเนื่อง (1 วินาที/คน)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>สแกนรัว</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GATE SCANNER & REALTIME LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'gate_scanner' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-4">
          {/* 1-Row Executive KPI Strip */}
          {(() => {
            const presentCount = displayedFilteredLogs.filter((l) => l.status === 'present').length;
            const lateCount = displayedFilteredLogs.filter((l) => l.status === 'late').length;
            const absenceCount = displayedFilteredLogs.filter((l) => l.status === 'sick' || l.status === 'leave' || l.status === 'absent').length;
            return (
              <div className="saas-kpi-strip">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
                  <div className="saas-kpi-cell">
                    <span className="type-meta block">{lang === 'th' ? 'บันทึกในช่วงนี้' : 'Logs in Range'}</span>
                    <span className="type-kpi-sm tabular-nums mt-0.5 block">{displayedFilteredLogs.length}</span>
                  </div>
                  <div className="saas-kpi-cell">
                    <span className="type-meta block">{lang === 'th' ? 'ตรงเวลา' : 'On-time'}</span>
                    <span className="type-kpi-sm text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5 block">{presentCount}</span>
                  </div>
                  <div className="saas-kpi-cell">
                    <span className="type-meta block">{lang === 'th' ? 'มาสาย' : 'Late'}</span>
                    <span className="type-kpi-sm text-amber-700 dark:text-amber-300 tabular-nums mt-0.5 block">{lateCount}</span>
                  </div>
                  <div className="saas-kpi-cell">
                    <span className="type-meta block">{lang === 'th' ? 'ลา / ขาด' : 'Leave / Absent'}</span>
                    <span className="type-kpi-sm text-rose-700 dark:text-rose-300 tabular-nums mt-0.5 block">{absenceCount}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Scanner Card: Students see ONLY their own locked pass; Teachers enter Student ID first */}
          <div data-guide-id="attendance-scanner-box" className="saas-card text-[var(--color-text-body)]">
            <div className="saas-card-header">
              <h2 className="type-section-title flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>
                  {isRestrictedViewer
                    ? 'เช็คชื่อด้วยบัญชีของคุณ'
                    : 'จุดสแกนประตู'}
                </span>
              </h2>
            </div>

            <div className="saas-card-body space-y-4">
              {/* Operator Identification & Quick Self Check-in (hairline-separated, single elevation) */}
              {!isRestrictedViewer && (
                <div className="pb-3.5 border-b border-[var(--color-border)] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={loggedInProfile.avatarUrl}
                      alt={loggedInProfile.userName}
                      className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{loggedInProfile.userName}</p>
                      <p className="type-meta truncate">
                        {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'teacher' ? 'ครูผู้สอน' : 'เจ้าหน้าที่'} · {loggedInProfile.userRoleLabel}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelfCheckIn}
                    disabled={isSelfCheckingIn}
                    className="btn-action-success px-2.5 py-1.5 shrink-0 disabled:opacity-50"
                    title="บันทึกเวลาเข้าโรงเรียน/ปฏิบัติหน้าที่สำหรับบัญชีของคุณ"
                    aria-label="เช็คชื่อบัญชีฉัน"
                  >
                    {isSelfCheckingIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                    <span>เช็คชื่อฉัน</span>
                  </button>
                </div>
              )}

              <div className="space-y-3 type-body">
                {isRestrictedViewer ? (
                  matchedScannerStudent && (
                    <div className="pb-3 border-b border-[var(--color-border)] flex items-center gap-3">
                      <img
                        src={matchedScannerStudent.avatarUrl}
                        alt={matchedScannerStudent.firstNameTh}
                        className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="type-card-title truncate">
                          {matchedScannerStudent.firstNameTh} {matchedScannerStudent.lastNameTh}
                        </p>
                        <p className="type-meta font-mono truncate">
                          {matchedScannerStudent.studentIdNumber} · {matchedScannerStudent.room}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    <label className="type-label block">
                      รหัสนักเรียน <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={scannerStudentIdInput}
                      onChange={(e) => setScannerStudentIdInput(e.target.value)}
                      placeholder={`เช่น ${students[0]?.studentIdNumber || 'ED-6901'}`}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-mono type-body"
                    />
                    {students.length > 0 && !trimmedScannerId && (
                      <p className="type-meta">
                        ตัวอย่าง: {students.slice(0, 3).map((s) => s.studentIdNumber).join(', ')}
                      </p>
                    )}
                    {trimmedScannerId && matchedScannerStudent && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center gap-2.5">
                        <img
                          src={matchedScannerStudent.avatarUrl}
                          alt={matchedScannerStudent.firstNameTh}
                          className="w-8 h-8 rounded-lg object-cover border border-emerald-300 dark:border-emerald-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="type-card-title text-emerald-950 dark:text-emerald-100 truncate">
                            {matchedScannerStudent.firstNameTh} {matchedScannerStudent.lastNameTh}
                          </p>
                          <p className="type-meta text-emerald-800 dark:text-emerald-200 font-mono">
                            {matchedScannerStudent.studentIdNumber} · {matchedScannerStudent.room}
                          </p>
                        </div>
                      </div>
                    )}
                    {trimmedScannerId && !matchedScannerStudent && (
                      <p className="type-meta text-rose-700 dark:text-rose-300 font-semibold">
                        ไม่พบนักเรียนรหัส "{trimmedScannerId}"
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="type-label block mb-1">สถานะ</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] type-body"
                  >
                    <option value="present">ตรงเวลา</option>
                    <option value="late">มาสาย</option>
                    <option value="absent">ขาดเรียน</option>
                    <option value="sick">ลาป่วย</option>
                  </select>
                </div>

                <div>
                  <label className="type-label block mb-1">จุดประตู / หมายเหตุ</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] type-body"
                  />
                </div>

                {scannerDupReasons.length > 0 && (
                  <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 type-meta flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span>{scannerDupReasons.join(', ')}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSimulateScan}
                  disabled={isScanning || !matchedScannerStudent}
                  className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-card-subtle)] disabled:text-[var(--color-text-muted)] disabled:border disabled:border-[var(--color-border)] disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>{isRestrictedViewer ? 'สแกนบัตรของฉัน' : 'บันทึกเช็คชื่อ'}</span>
                    </>
                  )}
                </button>

                {scannerResult && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 type-meta font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                    <span>{scannerResult}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Realtime Attendance Logs & Filter Component */}
          <div className="lg:col-span-2 saas-card text-[var(--color-text-body)]">
            <div className="saas-card-header">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 className="type-section-title flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span>บันทึกการเข้า-ออก</span>
                </h2>
                <span className="type-meta tabular-nums">
                  ·{' '}
                  {startDateFilter && endDateFilter
                    ? startDateFilter === endDateFilter
                      ? startDateFilter
                      : `${startDateFilter} – ${endDateFilter}`
                    : startDateFilter
                      ? `ตั้งแต่ ${startDateFilter}`
                      : endDateFilter
                        ? `ถึง ${endDateFilter}`
                        : 'ทุกวันที่'}{' '}
                  · {displayedFilteredLogs.length} รายการ
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Daily vs Weekly vs Homeroom Roll-Call Toggle */}
                <div
                  role="group"
                  aria-label={lang === 'th' ? 'สลับมุมมองรายวัน รายสัปดาห์ หรือเช็คชื่อโฮมรูม' : 'Switch attendance mode'}
                  className="seg-tab-group"
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
                    title="ดูสรุปการเข้าเรียนรายสัปดาห์ (จันทร์–ศุกร์)"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'รายสัปดาห์' : 'Weekly'}</span>
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
                      title="เช็คชื่อโฮมรูมทั้งห้องในคลิกเดียว"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'โฮมรูม' : 'Homeroom'}</span>
                    </button>
                  )}
                </div>

                {/* Compact Icon Action Group with Descriptive Tooltips */}
                <div className="saas-control-group">
                  {!isRestrictedViewer && (
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="btn-icon-tool"
                      title="นำเข้าบันทึกการเข้าเรียนจาก Excel / CSV"
                      aria-label="นำเข้าบันทึกการเข้าเรียนจาก Excel หรือ CSV"
                    >
                      <Upload className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportDailyCsv()}
                    className="btn-icon-tool text-emerald-700 dark:text-emerald-300"
                    title="ดาวน์โหลดรายงานเข้า-ออกเป็นไฟล์ CSV (UTF-8)"
                    aria-label="ดาวน์โหลดรายงานเข้า-ออกเป็นไฟล์ CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="saas-card-body space-y-4">
              {importSuccessNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 type-meta font-semibold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {importSuccessNotice}
                  </span>
                  <button
                    type="button"
                    onClick={() => setImportSuccessNotice(null)}
                    className="opacity-70 hover:opacity-100 cursor-pointer"
                    aria-label="ปิดการแจ้งเตือน"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Clean Filter Component: Scope + Presets + Room + Expandable Filters */}
              <div className="app-filter-bar space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {!isRestrictedViewer && (
                      <div className="seg-tab-group">
                        <button
                          type="button"
                          data-active={logScopeFilter === 'all'}
                          onClick={() => setLogScopeFilter('all')}
                          className="seg-tab-btn"
                        >
                          ทั้งหมด ({filteredLogs.length})
                        </button>
                        <button
                          type="button"
                          data-active={logScopeFilter === 'mine'}
                          onClick={() => setLogScopeFilter('mine')}
                          className="seg-tab-btn"
                        >
                          เฉพาะฉัน ({filteredLogs.filter(a => a.studentId === loggedInProfile.targetId || a.userName === loggedInProfile.userName || (currentUser && (a.studentId === currentUser.id || a.studentId === currentUser.studentRecordId))).length})
                        </button>
                      </div>
                    )}

                    <div className="saas-control-group">
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset('today')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${startDateFilter === todayDateStr && endDateFilter === todayDateStr ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'}`}
                      >
                        วันนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset('7d')}
                        className="px-2 py-1 rounded-md hover:bg-[var(--color-card)] text-[11px] font-semibold text-[var(--color-text-body)] cursor-pointer"
                      >
                        7 วัน
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset('month')}
                        className="px-2 py-1 rounded-md hover:bg-[var(--color-card)] text-[11px] font-semibold text-[var(--color-text-body)] cursor-pointer"
                      >
                        เดือนนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickDatePreset('all')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${!startDateFilter && !endDateFilter ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'}`}
                      >
                        ทั้งหมด
                      </button>
                    </div>

                    <select
                      aria-label="กรองตามห้องเรียน"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="h-8 px-2.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] font-medium"
                    >
                      <option value="all">ทุกห้อง ({availableClasses.length})</option>
                      {availableClasses.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      data-active={showMoreFilters || teacherFilter !== 'all' || courseFilter !== 'all'}
                      onClick={() => setShowMoreFilters((v) => !v)}
                      className="btn-tool-neutral h-8 px-2.5"
                      title="ตัวกรองเพิ่มเติม (ช่วงวันที่ ครู รายวิชา)"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ตัวกรอง' : 'Filters'}</span>
                    </button>

                    {(classFilter !== 'all' || teacherFilter !== 'all' || courseFilter !== 'all' || startDateFilter !== todayDateStr || endDateFilter !== todayDateStr) && (
                      <button
                        type="button"
                        onClick={handleResetLogFilters}
                        className="btn-icon-tool text-rose-600 dark:text-rose-300"
                        title="รีเซ็ตตัวกรองเป็นค่าเริ่มต้น"
                        aria-label="รีเซ็ตตัวกรองเป็นค่าเริ่มต้น"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {(showMoreFilters || teacherFilter !== 'all' || courseFilter !== 'all') && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="saas-control-group">
                      <input
                        type="date"
                        aria-label="ตั้งแต่วันที่"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] tabular-nums"
                      />
                      <span className="type-meta px-0.5">–</span>
                      <input
                        type="date"
                        aria-label="ถึงวันที่"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card)] tabular-nums"
                      />
                    </div>

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
                      className="px-2 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card-subtle)] font-medium max-w-[170px]"
                    >
                      <option value="all">ครูทุกคน ({courseTeacherOptions.length})</option>
                      {courseTeacherOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} ({opt.count})
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="กรองตามรายวิชา"
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="px-2 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card-subtle)] font-medium max-w-[200px]"
                    >
                      <option value="all">
                        {teacherFilter === 'all'
                          ? 'ทุกรายวิชา'
                          : `วิชาครู (${teacherFilteredCourses.length})`}
                      </option>
                      {teacherFilteredCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} — {course.titleTh}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {attendanceViewMode === 'homeroom_rollcall' && !isRestrictedViewer ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)]">
                    <div>
                      <h3 className="type-card-title flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>เช็คชื่อโฮมรูมด่วน</span>
                      </h3>
                      <p className="type-meta">
                        ตั้งค่ามาทุกคนเป็นค่าเริ่มต้น และดึงใบลาอนุมัติแล้วให้อัตโนมัติ
                      </p>
                    </div>
                    <div className="saas-control-group">
                      <select
                        aria-label="เลือกห้องเช็คชื่อโฮมรูม"
                        value={effectiveRollCallRoom}
                        onChange={(e) => {
                          setRollCallRoom(e.target.value);
                          setRollCallOverrides({});
                        }}
                        className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-card)] font-semibold text-[var(--color-text-title)]"
                      >
                        {availableClasses.length === 0 ? (
                          <option value="all">นักเรียนทั้งหมด</option>
                        ) : (
                          availableClasses.map((room) => (
                            <option key={room} value={room}>
                              ห้อง {room} ({scopedStudents.filter((s) => s.room === room).length})
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
                        className="px-2 py-1 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setRollCallOverrides({})}
                        className="btn-icon-tool"
                        title="รีเซ็ตค่าเริ่มต้นทั้งหมด"
                        aria-label="รีเซ็ตค่าเริ่มต้นทั้งหมด"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {rollCallStudents.length === 0 ? (
                    <p className="type-meta py-6 text-center">
                      ไม่พบรายชื่อนักเรียนในห้องที่เลือก
                    </p>
                  ) : (
                    <>
                      <div className="max-h-96 overflow-y-auto divide-y divide-[var(--color-border)]">
                        {rollCallStudents.map((stu, idx) => {
                          const def = getDefaultRollCallStatus(stu);
                          const currentStatus = rollCallOverrides[stu.id] || def.status;
                          const statusOptions: { value: AttendanceStatus; label: string; activeCls: string }[] = [
                            { value: 'present', label: 'มา', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
                            { value: 'late', label: 'สาย', activeCls: 'bg-amber-500 text-slate-950 border-amber-500' },
                            { value: 'sick', label: 'ป่วย', activeCls: 'bg-sky-600 text-white border-sky-600' },
                            { value: 'leave', label: 'กิจ', activeCls: 'bg-indigo-600 text-white border-indigo-600' },
                            { value: 'absent', label: 'ขาด', activeCls: 'bg-rose-600 text-white border-rose-600' },
                          ];
                          return (
                            <div key={stu.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-5 type-meta font-mono text-right shrink-0">
                                  {idx + 1}.
                                </span>
                                <img
                                  src={stu.avatarUrl}
                                  alt={stu.firstNameTh}
                                  className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="type-card-title truncate">
                                    {stu.firstNameTh} {stu.lastNameTh}
                                    {def.source === 'leave' && (
                                      <span className="ml-1.5 type-meta text-sky-700 dark:text-sky-300 font-semibold">
                                        · ลาอนุมัติ
                                      </span>
                                    )}
                                    {def.source === 'recorded' && (
                                      <span className="ml-1.5 type-meta text-emerald-700 dark:text-emerald-300 font-semibold">
                                        · เช็คแล้ว
                                      </span>
                                    )}
                                  </div>
                                  <div className="type-meta font-mono">
                                    {stu.studentIdNumber} · {stu.room}
                                  </div>
                                </div>
                              </div>

                                <div className="flex flex-wrap items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onRecordAttendance(
                                        stu.id,
                                        'present',
                                        `ครูประจำชั้นยืนยันออกโรงเรียน (กรณีลืมสแกนออก) โดย ${loggedInProfile.userName}`,
                                        'teacher_proxy',
                                        {
                                          recordType: 'check_out',
                                          userType: 'student',
                                          userName: `${stu.firstNameTh} ${stu.lastNameTh}`,
                                          userRole: `นักเรียน (${stu.gradeLevel})`,
                                          userAvatar: stu.avatarUrl,
                                          userDepartmentOrRoom: stu.room,
                                          date: rollCallDate,
                                          recordedBy: loggedInProfile.userName,
                                          recordedByRole: currentRole,
                                          confirmedByHomeroom: true,
                                          confirmedByTeacherName: loggedInProfile.userName,
                                        }
                                      );
                                      sendEduVerseNotification({
                                        title: `ยืนยันออกโรงเรียน: ${stu.firstNameTh} ${stu.lastNameTh}`,
                                        body: `${loggedInProfile.userName} ยืนยันออกโรงเรียนวันที่ ${rollCallDate} เรียบร้อยแล้ว`,
                                        category: 'attendance',
                                        priority: 'normal',
                                        schoolId: activeSchoolId,
                                        targetStudentIds: [stu.id],
                                        targetRoles: ['student', 'parent', 'teacher', 'admin'],
                                      }).catch((err) => {
                                        console.warn('[AttendanceView] Failed to send checkout notification:', err);
                                      });
                                      emitAppToast({
                                        tone: 'success',
                                        message: `ยืนยันออกโรงเรียนให้ ${stu.firstNameTh} ${stu.lastNameTh} และส่งแจ้งเตือนแล้ว`,
                                      });
                                    }}
                                    className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary-text)] text-[11px] font-bold hover:bg-[var(--color-primary-light)] transition cursor-pointer inline-flex items-center gap-1"
                                    title="กรณีนักเรียนลืมสแกนออกโรงเรียน ให้ครูกดยืนยันออกทันที"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>ยืนยันออก</span>
                                  </button>
                                  {statusOptions.map((opt) => {
                                    const selected = currentStatus === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setRollCallOverrides((prev) => ({ ...prev, [stu.id]: opt.value }))}
                                        className={`px-2 py-1 rounded-md border text-[11px] font-bold transition cursor-pointer ${
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

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                        <div className="type-label tabular-nums">
                          {(() => {
                            const resolvedList = rollCallStudents.map((s) => rollCallOverrides[s.id] || getDefaultRollCallStatus(s).status);
                            const presentN = resolvedList.filter((st) => st === 'present').length;
                            const lateN = resolvedList.filter((st) => st === 'late').length;
                            const leaveN = resolvedList.filter((st) => st === 'sick' || st === 'leave').length;
                            const absentN = resolvedList.filter((st) => st === 'absent').length;
                            return `${rollCallStudents.length} คน · มา ${presentN} · สาย ${lateN} · ลา ${leaveN} · ขาด ${absentN}`;
                          })()}
                        </div>
                        <button
                          type="button"
                          disabled={isSavingRollCall}
                          onClick={handleSaveHomeroomRollCall}
                          className="btn-action-success px-4 py-2 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกทั้งห้อง ({rollCallStudents.length})</span>
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
                    <EmptyState
                      compact
                      icon={QrCode}
                      title={logScopeFilter === 'mine' ? 'ไม่พบบันทึกเช็คชื่อของบัญชีคุณในวันนี้' : 'ไม่พบบันทึกการเข้าเรียนในวันที่เลือก'}
                      description="ลองเปลี่ยนช่วงวันที่ ระดับชั้น หรือสลับดูรายการทั้งหมด"
                    />
                  ) : (
                    <PagedList items={displayedFilteredLogs} pageSize={6} renderItem={(log) => {
                      const student = students.find(s => s.id === log.studentId);
                      const name = log.userName || (student ? `${student.firstNameTh} ${student.lastNameTh}` : log.studentId);
                      const photoSrc = log.photoUrl || log.userAvatar || student?.avatarUrl;
                      const isMyRecord = log.studentId === loggedInProfile.targetId ||
                        log.userName === loggedInProfile.userName ||
                        (currentUser && (log.studentId === currentUser.id || log.studentId === currentUser.studentRecordId));

                      return (
                        <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => log.photoUrl && setSelectedPhotoModal(log)}
                              title={log.photoUrl ? 'คลิกเพื่อดูรูปถ่ายเช็คชื่อ' : undefined}
                              className={`relative w-9 h-9 rounded-lg overflow-hidden bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0 ${
                                log.photoUrl ? 'cursor-pointer ring-2 ring-[var(--color-primary)]/40 hover:opacity-90' : ''
                              }`}
                            >
                              <AttendancePhoto src={photoSrc} fallbackSrc={student?.avatarUrl} alt={name} className="w-full h-full object-cover" />
                              {log.photoUrl && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-1.5">
                                <span className="type-card-title truncate">{name}</span>
                                <span className="type-meta">
                                  · {log.recordType === 'check_out' ? 'ออก' : 'เข้า'} · <span className="font-mono">{log.studentId}</span>
                                  {isMyRecord && <span className="text-emerald-700 dark:text-emerald-300 font-semibold"> · บัญชีคุณ</span>}
                                </span>
                              </div>
                              <div className="type-meta truncate">
                                {log.time} น. · {log.location?.geofenceZoneName || log.remarks || 'สแกนประตู'}
                                {log.location?.distanceMeters !== undefined && ` · GPS ${log.location.distanceMeters} ม.`}
                                {log.recordedBy && ` · โดย ${log.recordedBy}`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 type-label ${
                              log.status === 'present'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : log.status === 'late'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-rose-700 dark:text-rose-300'
                            }`}>
                              {log.status === 'present' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : log.status === 'late' ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                              <span>{log.status === 'present' ? 'ตรงเวลา' : log.status === 'late' ? 'มาสาย' : 'ขาด/ลา'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionPrefill({
                                  targetScope: log.recordType === 'check_out' ? 'gate_checkout' : 'gate_checkin',
                                  issueType: log.status === 'late' ? 'late_arrival' : 'time_mismatch',
                                  date: log.date,
                                  originalTime: (log.time || '').slice(0, 5),
                                  requesterId: log.studentId,
                                });
                                setActiveTab('time_corrections');
                              }}
                              className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[10px] font-bold text-[var(--color-primary-text)] cursor-pointer"
                              title="ส่งคำขอแก้ไขปรับปรุงเวลาสำหรับรายการนี้"
                            >
                              ขอแก้เวลา
                            </button>
                          </div>
                        </div>
                      );
                    }} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Link Banner to Analytics Tab instead of stacking heavy charts on operational screen */}
          <div className="saas-alert-bar">
            <span className="type-meta">
              {lang === 'th'
                ? 'ต้องการดู Heatmap เวลาเข้าเรียน 30 วันและกราฟแนวโน้มรายเดือน?'
                : 'Looking for 30-day check-in heatmap and monthly trend charts?'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('export_reports')}
              className="type-label text-[var(--color-primary-text)] hover:underline cursor-pointer"
            >
              {lang === 'th' ? 'เปิดแท็บสถิติและรายงาน →' : 'Open Analytics & Reports →'}
            </button>
          </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE REQUESTS APPROVAL WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'leave_approval' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <div className="saas-card text-[var(--color-text-body)]">
            <div className="saas-card-header">
              <div>
                <h2 className="type-section-title flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>พิจารณาและอนุมัติใบลาออนไลน์</span>
                </h2>
                <p className="type-meta mt-0.5">
                  เมื่ออนุมัติ ระบบจะอัปเดตสถานะเช็คชื่อประจำวันให้อัตโนมัติ
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
                      setImportSuccessNotice(
                        lang === 'th'
                          ? `อนุมัติใบลาทั้งหมด ${pending.length} รายการ และอัปเดตสถานะเช็คชื่อเรียบร้อยแล้ว`
                          : `Approved ${pending.length} leave requests.`
                      );
                      setTimeout(() => setImportSuccessNotice(null), 5000);
                    }}
                    className="btn-action-success px-3 py-1.5"
                    title="อนุมัติคำขอลาที่รอดำเนินการทั้งหมดพร้อมกัน"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>อนุมัติทั้งหมด ({scopedLeaveRequests.filter((r) => r.status === 'pending').length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLeaveFilter('all')}
                  className={`py-1 border-b-2 transition cursor-pointer ${leaveFilter === 'all' ? 'border-[var(--color-primary)] text-[var(--color-text-title)] font-bold' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'}`}
                >
                  ทั้งหมด ({scopedLeaveRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('pending')}
                  className={`py-1 border-b-2 transition cursor-pointer ${leaveFilter === 'pending' ? 'border-amber-600 dark:border-amber-400 text-amber-800 dark:text-amber-300 font-bold' : 'border-transparent text-[var(--color-text-muted)] hover:text-amber-800 dark:hover:text-amber-300'}`}
                >
                  รออนุมัติ ({scopedLeaveRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('approved')}
                  className={`py-1 border-b-2 transition cursor-pointer ${leaveFilter === 'approved' ? 'border-emerald-600 dark:border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold' : 'border-transparent text-[var(--color-text-muted)] hover:text-emerald-800 dark:hover:text-emerald-300'}`}
                >
                  อนุมัติแล้ว ({scopedLeaveRequests.filter(r => r.status === 'approved').length})
                </button>
              </div>
            </div>

            <div className="saas-card-body">
              {filteredLeaveRequests.length === 0 ? (
                <EmptyState
                  compact
                  icon={FileText}
                  title="ไม่มีรายการใบลาในหมวดนี้"
                  action={leaveFilter !== 'all' ? { label: 'ดูใบลาทั้งหมด', onClick: () => setLeaveFilter('all'), variant: 'neutral' } : undefined}
                />
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  <PagedList items={filteredLeaveRequests} pageSize={4} renderItem={(req) => (
                    <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <h4 className="type-card-title">{req.userName}</h4>
                          <span className="type-meta">
                            · {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'} · {req.gradeLevelOrDepartment}
                          </span>
                        </div>

                        <span className={`inline-flex items-center gap-1 type-label self-start sm:self-auto ${
                          req.status === 'approved'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : req.status === 'pending'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-rose-700 dark:text-rose-300'
                        }`}>
                          {req.status === 'approved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : req.status === 'pending' ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>{req.status === 'approved' ? 'อนุมัติเรียบร้อย' : req.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="type-meta">
                          {req.startDate} – {req.endDate} · ยื่นเมื่อ {req.createdAt}
                        </p>
                        <p className="type-body">"{req.reason}"</p>
                        {req.attachmentUrl && (
                          <div className="pt-1.5">
                            <span className="type-meta block mb-1">เอกสารแนบ</span>
                            <img src={req.attachmentUrl} alt="Certificate" className="w-32 h-20 rounded-lg object-cover border border-[var(--color-border)]" />
                          </div>
                        )}
                      </div>

                      {req.status === 'pending' && onUpdateLeaveStatus && !isRestrictedViewer && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="หมายเหตุการอนุมัติ (ถ้ามี)..."
                            value={approvalNote[req.id] || ''}
                            onChange={(e) => setApprovalNote({ ...approvalNote, [req.id]: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] flex-1 bg-[var(--color-card-subtle)]"
                          />
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => onUpdateLeaveStatus(req.id, 'approved', approvalNote[req.id])}
                              className="btn-action-success px-3 py-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติ</span>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2B: HOMEROOM CONFIRMATION & HIERARCHICAL TIME CORRECTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'time_corrections' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <AttendanceCorrectionHub
            schoolId={activeSchoolId}
            currentUser={currentUser || null}
            currentRole={currentRole}
            students={students}
            teachers={teachers}
            courses={courses}
            attendance={attendance}
            periodAttendance={periodAttendance}
            onRecordAttendance={onRecordAttendance}
            onRecordPeriodAttendance={onRecordPeriodAttendance}
            prefillSeed={correctionPrefill}
            onClearPrefill={() => setCorrectionPrefill(null)}
            showHomeroomMissingConfirm={!isRestrictedViewer}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXPORT REPORTS (EXCEL & PDF ATTENDANCE ENGINE) */}
      {/* ========================================================================= */}
      {activeTab === 'export_reports' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-4">
          <div className="saas-card text-[var(--color-text-body)]">
            <div className="saas-card-header">
              <div>
                <h2 className="type-section-title flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span>ส่งออกรายงานสถิติการเข้าเรียน</span>
                </h2>
                <p className="type-meta mt-0.5">
                  ไฟล์ CSV (UTF-8) รองรับภาษาไทย พร้อมสรุปสิทธิ์สอบ (เกณฑ์ 80%)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="saas-control-group">
                  {!isRestrictedViewer && (
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="btn-icon-tool"
                      title="นำเข้าบันทึกการเข้าเรียนจากไฟล์ Excel / CSV"
                      aria-label="นำเข้าบันทึกการเข้าเรียนจากไฟล์ Excel หรือ CSV"
                    >
                      <Upload className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportDailyCsv()}
                    className="btn-icon-tool"
                    title="ดาวน์โหลดรายการเข้า-ออกรายวัน (CSV)"
                    aria-label="ดาวน์โหลดรายการเข้า-ออกรายวัน CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleExportMonthlySummaryCsv}
                  className="btn-action-success px-3 py-1.5"
                  title="ส่งออกสรุปสิทธิ์สอบ (มส.) รายเดือนเป็นไฟล์ CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ส่งออก Excel รายเดือน</span>
                </button>
              </div>
            </div>

            <div className="saas-card-body space-y-5">
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
              <div className="space-y-2.5">
                <h3 className="type-card-title">
                  ตารางสรุปการเข้าเรียนและสิทธิ์สอบประจำเดือน
                </h3>

                <div className="border border-[var(--color-border)] rounded-xl overflow-x-auto">
                  <table className="table-comfortable w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="p-3">รหัสนักเรียน</th>
                        <th className="p-3">ชื่อ-นามสกุล</th>
                        <th className="p-3">ชั้น / ห้อง</th>
                        <th className="p-3 text-center">มาเรียน</th>
                        <th className="p-3 text-center">มาสาย</th>
                        <th className="p-3 text-center">ลา</th>
                        <th className="p-3 text-center">ขาด</th>
                        <th className="p-3 text-center">อัตรา</th>
                        <th className="p-3 text-center">สิทธิ์สอบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      <PaginatedTableRows items={monthlySummary} colSpan={9} renderRow={(m) => (
                        <tr key={m.student.id} className="hover:bg-[var(--color-card-subtle)] transition">
                          <td className="p-3 font-mono type-meta">{m.student.studentIdNumber}</td>
                          <td className="p-3 type-card-title">{m.student.firstNameTh} {m.student.lastNameTh}</td>
                          <td className="p-3 type-body">{m.student.gradeLevel} {m.student.room}</td>
                          <td className="p-3 text-center text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">{m.presentDays}</td>
                          <td className="p-3 text-center text-amber-800 dark:text-amber-300 font-bold tabular-nums">{m.lateDays}</td>
                          <td className="p-3 text-center text-[var(--color-primary-text)] font-bold tabular-nums">{m.sickDays}</td>
                          <td className="p-3 text-center text-rose-700 dark:text-rose-300 font-bold tabular-nums">{m.absentDays}</td>
                          <td className="p-3 text-center font-mono font-bold text-[var(--color-text-title)] tabular-nums">{m.rate}%</td>
                          <td className="p-3 text-center">
                            {m.isQualified ? (
                              <span className="inline-flex items-center gap-1 type-label text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ผ่านเกณฑ์</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 type-label text-rose-700 dark:text-rose-300">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>เสี่ยง มส.</span>
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
      {/* TAB 5: SCHOOL GPS & GEOFENCE SUMMARY + HUB LINK */}
      {/* ========================================================================= */}
      {isAdminUser && activeTab === 'school_gps' && (
        <div className="space-y-3">
          {onOpenGpsSettings ? (
            <div className="saas-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span>จุดเช็คชื่อพิกัด GPS ประจำโรงเรียน ({campusGates.length} จุด)</span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    การตั้งค่าพิกัดและรัศมี Geofence ถูกรวมไว้ที่ศูนย์ตั้งค่าระบบ (System Settings) เพื่อป้องกันข้อมูลซ้ำซ้อน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenGpsSettings}
                  className="btn-action-primary px-4 py-2 text-xs cursor-pointer"
                >
                  ตั้งค่าพิกัด GPS ในศูนย์ตั้งค่า →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {campusGates.map((gate) => (
                  <div
                    key={gate.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-1"
                  >
                    <div className="font-bold text-[var(--color-text-title)] flex items-center justify-between gap-2">
                      <span className="truncate">{gate.nameTh}</span>
                      {gate.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px]">
                          หลัก
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-[var(--color-text-muted)]">
                      {gate.lat.toFixed(5)}, {gate.lng.toFixed(5)} · รัศมี {gate.radiusMeters} ม.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeSchool ? (
            <SchoolGpsSettingsCard
              activeSchool={activeSchool}
              campusGates={campusGates}
              currentRole={currentRole}
              lang={lang}
              onUpdateCampusGates={onUpdateCampusGates || (() => {})}
              onSaveCampusGates={onSaveCampusGates}
              onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
            />
          ) : null}
        </div>
      )}

      {/* Slide-Over Drawer for Zooming Selfie Photo & GPS Proof */}
      {selectedPhotoModal && (
        <div
          className="saas-drawer-backdrop animate-in fade-in duration-150"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="รูปถ่ายเช็คชื่อตอนผ่านประตู"
            onClick={(e) => e.stopPropagation()}
            className="saas-drawer-panel animate-in slide-in-from-right duration-200 text-[var(--color-text-body)]"
          >
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="type-section-title truncate">{selectedPhotoModal.userName || 'รูปถ่ายเช็คชื่อตอนผ่านประตู'}</h4>
                <p className="type-meta tabular-nums">{selectedPhotoModal.date} · {selectedPhotoModal.time} น.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="btn-icon-tool"
                aria-label="ปิดหน้าต่างรูปถ่าย"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="relative rounded-xl overflow-hidden aspect-4/3 max-h-72 border border-[var(--color-border)] bg-slate-950 flex items-center justify-center">
                <AttendancePhoto
                  src={selectedPhotoModal.photoUrl}
                  alt="Selfie Zoom"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-black/75 backdrop-blur-md text-white type-meta flex items-center justify-between gap-2">
                  <span className="truncate">{selectedPhotoModal.location?.geofenceZoneName || 'ประตูโรงเรียน'}</span>
                  {typeof selectedPhotoModal.location?.distanceMeters === 'number' && (
                    <span className="font-mono shrink-0">ระยะห่าง {selectedPhotoModal.location.distanceMeters} ม.</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] divide-y divide-[var(--color-border)]">
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="type-meta">รหัส / ห้อง</span>
                  <span className="type-card-title font-mono">{selectedPhotoModal.studentId} · {selectedPhotoModal.userDepartmentOrRoom || '-'}</span>
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="type-meta">หมายเหตุ</span>
                  <span className="type-meta text-right">{selectedPhotoModal.remarks || 'สแกนประตู'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="btn-action-primary px-4 py-2"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continuous Rapid Scanner Modal */}
      <ContinuousRapidScannerModal
        isOpen={showRapidScannerModal}
        onClose={() => setShowRapidScannerModal(false)}
        students={students}
        teachers={teachers}
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
