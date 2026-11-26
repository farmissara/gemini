import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileEdit,
  FileText,
  Fingerprint,
  Lock,
  MapPin,
  Nfc,
  ScanLine,
  Smartphone,
  User,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { getBangkokClockSnapshot } from '../lib/timetableCalendar';
import { loadSavedPeriodQrSessions, validatePeriodQrTokenState } from '../lib/periodQrTokens';
import {
  filterLeaveRequestsForUser,
  filterPeriodAttendanceForUser,
  filterPeriodAttendanceForCourses,
  getAllowedStudentScope,
  getCourseRosterStudentIds,
  getTeacherHomeroomStudents,
  isRestrictedAttendanceViewer,
  resolveCurrentUserAttendanceProfile,
  resolveOwnStudent,
  resolveOwnTeacher,
} from '../lib/attendanceScope';
import type {
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  CampusGateGeofence,
  ClassroomGpsConfig,
  Course,
  LeaveRequest,
  LeaveType,
  PeriodAttendanceRecord,
  Student,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../types';
import { saveStudentSelfAttendance } from '../lib/supabase';
import { sendEduVerseNotification } from '../lib/pushNotifications';
import { getModuleTone } from '../lib/moduleTheme';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import {
  buildCourseTeacherOptions,
  courseMatchesTeacherFilter,
  slotMatchesLoggedInTeacher,
  userMatchesCourse,
} from '../lib/courseTeacherFilter';
import { getHolidayForDate } from '../lib/thaiHolidays';
import {
  buildDailyPeriodReportSessions,
  buildGateAttendanceReportRows,
} from '../lib/attendanceDailyReport';
import type { DailyPeriodReportSession } from '../lib/attendanceDailyReport';
import {
  buildPrimaryGateFromSchool,
  calculateHaversineDistanceMeters,
  isValidCoordinatePair,
  sanitizeSchoolCampusGates,
} from '../lib/schoolGps';
import {
  checkDistanceToClassroomGps,
  findClassroomGpsConfig,
  saveClassroomGpsConfig,
} from '../lib/classroomGps';
import { resolveStudentLeaveApprovers } from '../lib/leaveApprovalRouting';
import {
  formatNfcUidDisplay,
  getNdefReaderConstructor,
  isSecureNfcContext,
  isWebNfcSupported,
  loadNfcBindings,
  parseNfcReadingEvent,
  resolveNfcTap,
  saveNfcBinding,
  type NfcCardBinding,
  type WebNdefReadingEvent,
} from '../lib/nfcAttendance';
import {
  formatCameraErrorTh,
  openCameraStream,
  stopCameraStream,
  type CameraFacingMode,
} from '../lib/cameraStream';
import {
  composeLiveVideoSnapshot,
  composeSimulatedStudioSnapshot,
  type PlacedSticker,
  type SelfieCameraEffectId,
  type SelfieFilterId,
  type SelfieFrameId,
} from '../lib/selfieStickerStudio';
import {
  evaluatePeriodTimingStatus,
  loadAttendanceCorrections,
  loadPeriodFlexConfig,
  savePeriodFlexConfig,
  type PeriodFlexConfig,
} from '../lib/attendanceCorrections';
import {
  AttendanceCorrectionHub,
  type CorrectionPrefillSeed,
} from '../components/attendance/AttendanceCorrectionHub';
import { AttendanceAudienceSwitch } from '../components/attendance/AttendanceAudienceSwitch';
import {
  AttendanceModalsAndSheets,
  DailyAttendanceReportTab,
  LeaveRequestTab,
  NfcTapAttendanceTab,
  PeriodCheckinTab,
  SelfieAttendanceTab,
  TeacherProxyTab,
  useBiometricQuickGuard,
  type AttendanceSubTab,
  type CheckinSuccessFeedback,
  type MobileAttendanceViewProps,
  type NfcRecentLogEntry,
  type PeriodRosterFilter,
} from '../features/attendance';

export type { MobileAttendanceViewProps };

export const MobileAttendanceView: React.FC<MobileAttendanceViewProps> = ({
  students,
  teachers = [],
  courses,
  attendance,
  periodAttendance,
  currentUser,
  school: _school,
  campusGates = [],
  leaveRequests = [],
  lang,
  onRecordAttendance,
  onRecordPeriodAttendance,
  onAddLeaveRequest,
  onUpdateLeaveStatus,
  initialSubTab = 'selfie_mobile',
  embeddedMobile = false,
  initialPeriodCourseId,
  initialPeriodNumber,
  initialPeriodDate,
  initialPeriodCode,
  initialPeriodCheckType,
  initialPeriodExpiresAt,
  initialPeriodToken,
  currentRole,
  showAttendanceAudienceSwitch = false,
  onAttendanceAudienceChange,
  filterTabsByAudience = false,
  hideStaffOverviewTabs = false,
  schoolPeriods = [],
  timetableSlots = [],
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
  isDemoMode = false,
}) => {
  const effectiveRole: UserRole = currentUser?.role || currentRole || 'student';
  const isSchoolAdmin = effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const canViewDailyReport = ['teacher', 'admin', 'super_admin'].includes(effectiveRole);
  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const isStudentOnly = effectiveRole === 'student';
  const isStaffUser = !isRestrictedViewer;
  const studentScope = getAllowedStudentScope(currentUser, students);
  const ownStudent = resolveOwnStudent(currentUser, students);
  const ownTeacher = resolveOwnTeacher(currentUser, teachers);
  const scopedStudents = isRestrictedViewer ? studentScope.allowedStudents : students;
  const teacherHomeroomStudents = useMemo(
    () => getTeacherHomeroomStudents(currentUser, teachers, students),
    [currentUser, teachers, students]
  );
  const gateRosterStudents = effectiveRole === 'teacher' ? teacherHomeroomStudents : scopedStudents;
  const attendanceStudentScope = effectiveRole === 'teacher' ? gateRosterStudents : scopedStudents;
  const scopedLeaveRequests = filterLeaveRequestsForUser(leaveRequests, currentUser, students);
  const scopedPeriodAttendance = filterPeriodAttendanceForUser(periodAttendance, currentUser, students);

  const safeInitialSubTab: AttendanceSubTab =
    (!isStaffUser && initialSubTab === 'teacher_proxy') ||
    (!canViewDailyReport && initialSubTab === 'daily_report') ||
    (hideStaffOverviewTabs && isStaffUser && (initialSubTab === 'daily_report' || initialSubTab === 'corrections'))
      ? 'selfie_mobile'
      : initialSubTab;

  const [subTab, setSubTab] = useState<AttendanceSubTab>(safeInitialSubTab);
  const isStudentAttendanceSubTab = (
    tab: AttendanceSubTab
  ): boolean => ['teacher_proxy', 'period_checkin', 'daily_report', 'corrections'].includes(tab);
  const activeAttendanceAudience = isStudentAttendanceSubTab(subTab) ? 'students' : 'staff';
  const isSimpleStaffCheckin =
    showAttendanceAudienceSwitch &&
    subTab === 'selfie_mobile' &&
    activeAttendanceAudience === 'staff';
  const handleAttendanceAudienceChange = (audience: 'students' | 'staff') => {
    setSubTab(audience === 'students' ? 'teacher_proxy' : 'selfie_mobile');
    onAttendanceAudienceChange?.(audience);
  };
  const [showIdentitySheet, setShowIdentitySheet] = useState(false);
  const [showGeofenceSheet, setShowGeofenceSheet] = useState(false);
  const [nfcDrawerMode, setNfcDrawerMode] = useState<null | 'quick_tap' | 'recent_logs'>(null);
  const [showRapidScanner, setShowRapidScanner] = useState(false);
  const [showQuickRosterSheet, setShowQuickRosterSheet] = useState(false);
  const [rosterSheetQuery, setRosterSheetQuery] = useState('');
  const [rosterSheetGradeFilter, setRosterSheetGradeFilter] = useState('all');
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [rosterToast, setRosterToast] = useState<string | null>(null);

  const activeSchoolId = _school?.id || currentUser?.schoolId || 'sch-1';

  // Biometric (WebAuthn / FaceID / TouchID) Quick-Action Guard
  const {
    userPasskey,
    biometricUnlockMinutes,
    biometricBusy,
    biometricError,
    biometricNotice,
    showBiometricUnlockModal,
    isQuickAttendanceLocked,
    runWithBiometricGuard,
    handleBiometricVerify,
    handleLockQuickAttendanceNow,
    handleCancelBiometricModal,
  } = useBiometricQuickGuard({
    currentUser,
    activeSchoolId,
    isStaffUser,
    lang,
  });

  // NFC Attendance Tap State
  const webNfcAvailable = isWebNfcSupported();
  const secureNfc = isSecureNfcContext();
  const [nfcCheckType, setNfcCheckType] = useState<AttendanceCheckType>('check_in');
  const [nfcStatusMode, setNfcStatusMode] = useState<AttendanceStatus>('present');
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcStatusMessage, setNfcStatusMessage] = useState<string | null>(null);
  const [nfcErrorMessage, setNfcErrorMessage] = useState<string | null>(null);
  const [nfcManualUidInput, setNfcManualUidInput] = useState('');
  const [nfcBindings, setNfcBindings] = useState<NfcCardBinding[]>(() =>
    loadNfcBindings(activeSchoolId)
  );
  const [unregisteredNfcTag, setUnregisteredNfcTag] = useState<{
    uid: string;
    payloadText: string;
  } | null>(null);
  const [bindTargetType, setBindTargetType] = useState<'student' | 'teacher'>('student');
  const [bindTargetId, setBindTargetId] = useState<string>(attendanceStudentScope[0]?.id || teachers[0]?.id || '');
  const [nfcRecentLogs, setNfcRecentLogs] = useState<NfcRecentLogEntry[]>([]);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const nfcLastTapRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  useEffect(() => {
    setNfcBindings(loadNfcBindings(activeSchoolId));
  }, [activeSchoolId]);

  useEffect(() => {
    if (bindTargetType === 'student') {
      if (!attendanceStudentScope.some((s) => s.id === bindTargetId)) {
        setBindTargetId(attendanceStudentScope[0]?.id || '');
      }
    } else {
      if (!teachers.some((t) => t.id === bindTargetId)) {
        setBindTargetId(teachers[0]?.id || '');
      }
    }
  }, [bindTargetType, bindTargetId, attendanceStudentScope, teachers]);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(
        (!isStaffUser && initialSubTab === 'teacher_proxy') ||
        (!canViewDailyReport && initialSubTab === 'daily_report')
          ? 'selfie_mobile'
          : initialSubTab
      );
    }
  }, [initialSubTab, isStaffUser, canViewDailyReport]);

  // 1. Mobile Selfie Check-in/out & Multi-Gate State
  const loggedInProfile = resolveCurrentUserAttendanceProfile(currentUser, teachers, students);
  const [attendanceMode, setAttendanceMode] = useState<'self' | 'proxy'>('self');
  const [activeUserType, setActiveUserType] = useState<AttendanceUserType>(
    currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
      ? 'teacher'
      : 'student'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    ownStudent?.id || attendanceStudentScope[0]?.id || ''
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    ownTeacher?.id || teachers[0]?.id || ''
  );
  const [checkType, setCheckType] = useState<AttendanceCheckType>('check_in');
  const [selfieActionError, setSelfieActionError] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  useEffect(() => {
    if (isRestrictedViewer) {
      setAttendanceMode('self');
      setActiveUserType('student');
      if (ownStudent && !scopedStudents.some((s) => s.id === selectedStudentId)) {
        setSelectedStudentId(ownStudent.id);
      }
    } else if (currentUser?.role === 'teacher') {
      setActiveUserType('teacher');
      if (ownTeacher) setSelectedTeacherId(ownTeacher.id);
      if (!attendanceStudentScope.some((student) => student.id === selectedStudentId)) {
        setSelectedStudentId(attendanceStudentScope[0]?.id || '');
      }
    }
  }, [isRestrictedViewer, currentUser?.role, ownStudent, ownTeacher, attendanceStudentScope, selectedStudentId]);

  const normalizedGates = useMemo<CampusGateGeofence[]>(() => {
    const cleaned = sanitizeSchoolCampusGates(campusGates, _school?.id);
    if (cleaned.length > 0) return cleaned;
    const primaryFromSchool = buildPrimaryGateFromSchool(_school);
    return primaryFromSchool ? [primaryFromSchool] : [];
  }, [campusGates, _school]);

  const [selectedGateId, setSelectedGateId] = useState<string>(() => {
    const primary = normalizedGates.find((g) => g.isPrimary) || normalizedGates[0];
    return primary?.id || '';
  });

  useEffect(() => {
    if (normalizedGates.length === 0) {
      if (selectedGateId !== '') setSelectedGateId('');
      return;
    }
    if (!normalizedGates.some((g) => g.id === selectedGateId)) {
      const primary = normalizedGates.find((g) => g.isPrimary) || normalizedGates[0];
      setSelectedGateId(primary.id);
    }
  }, [normalizedGates, selectedGateId]);

  const selectedGate: CampusGateGeofence | null =
    normalizedGates.find((g) => g.id === selectedGateId) || normalizedGates[0] || null;

  const [currentGpsDistance, setCurrentGpsDistance] = useState<number | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [realGpsCoords, setRealGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Camera Live Feed & Selfie Snapshot
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const facingModeRef = useRef<CameraFacingMode>('user');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraSwitching, setIsCameraSwitching] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isSimulatedPhoto, setIsSimulatedPhoto] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selfieFilterId, setSelfieFilterId] = useState<SelfieFilterId>('normal');
  const [selfieEffectId, setSelfieEffectId] = useState<SelfieCameraEffectId>('sparkles');
  const [selfieFrameId, setSelfieFrameId] = useState<SelfieFrameId>('mascot_duo');
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([
    { uid: 'init-1', stickerId: 'sparkle_heart', xPct: 77, yPct: 26, rotation: 10 },
  ]);
  const [selfieTimerSeconds, setSelfieTimerSeconds] = useState<0 | 3>(0);
  const [selfieCountdown, setSelfieCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSimpleStaffCheckin) return;
    setAttendanceMode('self');
    setSelfieTimerSeconds(0);
    setSelfieCountdown(null);
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [isSimpleStaffCheckin]);

  const [checkinSuccessFeedback, setCheckinSuccessFeedback] = useState<CheckinSuccessFeedback | null>(null);
  const [showLineFlexPreview, setShowLineFlexPreview] = useState(false);

  // 2. Online Leave Request State
  const [leaveType, setLeaveType] = useState<LeaveType>('sick');
  const [leaveStartDate, setLeaveStartDate] = useState(getLocalDateString());
  const [leaveEndDate, setLeaveEndDate] = useState(getLocalDateString());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState('');
  const [leaveSuccessNotice, setLeaveSuccessNotice] = useState<string | null>(null);
  const [leaveErrorNotice, setLeaveErrorNotice] = useState<string | null>(null);
  const [leaveFormStep, setLeaveFormStep] = useState<1 | 2>(1);

  // 3. Teacher Proxy & Period Check-in State
  const [proxyStudentIdInput, setProxyStudentIdInput] = useState<string>('');
  const [proxyDate, setProxyDate] = useState<string>(getLocalDateString());
  const [proxyTime, setProxyTime] = useState<string>(() =>
    new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [proxyCheckType, setProxyCheckType] = useState<AttendanceCheckType>('check_in');
  const [proxySingleStatus, setProxySingleStatus] = useState<AttendanceStatus>('present');
  const [proxyShowRosterHint, setProxyShowRosterHint] = useState<boolean>(false);
  const [proxyRoomFilter, setProxyRoomFilter] = useState<string>('all');
  const [proxySearch, setProxySearch] = useState('');
  const [proxySavedNotification, setProxySavedNotification] = useState<string | null>(null);

  const fallbackCourse: Course = {
    id: 'crs-gen',
    schoolId: _school?.id || 'sch-1',
    code: 'GEN-101',
    titleTh: 'วิชาเรียนรวมพื้นฐาน (General Class)',
    titleEn: 'General Classroom',
    category: 'core',
    credits: 1.5,
    department: 'วิชาการ',
    semester: '1',
    academicYear: _school?.academicYear || '2569',
    room: 'ห้องเรียนรวม',
    schedule: 'จันทร์-ศุกร์ 08:30 - 15:30',
    teacherName: currentUser?.fullNameTh || 'อาจารย์ผู้สอน',
    teacherEmail: currentUser?.email || 'teacher@eduverse.school',
    description: 'วิชาเรียนรวมพื้นฐานระดับชั้น',
    enrolledStudentIds: students.map((s) => s.id),
  };

  const courseTeacherOptions = useMemo(
    () => buildCourseTeacherOptions(courses, teachers),
    [courses, teachers]
  );
  const [periodTeacherFilter, setPeriodTeacherFilter] = useState<string>('all');
  const periodFilteredCourses = useMemo(() => {
    if (effectiveRole === 'teacher') {
      return courses.filter((course) => userMatchesCourse(currentUser, ownTeacher, course));
    }
    const base = courses.length > 0 ? courses : [fallbackCourse];
    const filtered = base.filter((c) =>
      courseMatchesTeacherFilter(c, periodTeacherFilter, courseTeacherOptions)
    );
    return filtered.length > 0 ? filtered : base;
  }, [courses, fallbackCourse, periodTeacherFilter, courseTeacherOptions, effectiveRole, currentUser, ownTeacher]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialPeriodCourseId || courses[0]?.id || fallbackCourse.id
  );
  const selectedCourse: Course =
    periodFilteredCourses.find((c) => c.id === selectedCourseId) ||
    (effectiveRole === 'teacher' ? undefined : courses.find((c) => c.id === selectedCourseId)) ||
    periodFilteredCourses[0] ||
    fallbackCourse;
  const visiblePeriodAttendance = useMemo(
    () =>
      effectiveRole === 'teacher'
        ? filterPeriodAttendanceForCourses(periodAttendance, periodFilteredCourses, students)
        : scopedPeriodAttendance,
    [effectiveRole, periodAttendance, periodFilteredCourses, students, scopedPeriodAttendance]
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number>(initialPeriodNumber || 1);
  const [periodDate, setPeriodDate] = useState<string>(initialPeriodDate || getLocalDateString());
  const [dailyReportDate, setDailyReportDate] = useState<string>(getLocalDateString());
  const [periodStatuses, setPeriodStatuses] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({});
  const [periodSavedNotification, setPeriodSavedNotification] = useState<string | null>(null);
  const [periodQrCopied, setPeriodQrCopied] = useState<boolean>(false);
  const [showPeriodQrModal, setShowPeriodQrModal] = useState<boolean>(false);
  const [studentPeriodCodeInput, setStudentPeriodCodeInput] = useState<string>(initialPeriodCode || '');
  const [studentPeriodCheckinMsg, setStudentPeriodCheckinMsg] = useState<string | null>(null);
  const [studentPeriodCheckinError, setStudentPeriodCheckinError] = useState<string | null>(null);
  const [periodCheckType, setPeriodCheckType] = useState<'check_in' | 'check_out'>(
    initialPeriodCheckType || 'check_in'
  );

  // Classroom GPS config for Period Check-in
  const [classroomGps, setClassroomGps] = useState<ClassroomGpsConfig | null>(() =>
    findClassroomGpsConfig(activeSchoolId, {
      courseId: selectedCourse.id,
      room: selectedCourse.room,
    })
  );
  const [roomLatInput, setRoomLatInput] = useState<string>(() =>
    classroomGps ? classroomGps.lat.toFixed(6) : ''
  );
  const [roomLngInput, setRoomLngInput] = useState<string>(() =>
    classroomGps ? classroomGps.lng.toFixed(6) : ''
  );
  const [roomRadiusInput, setRoomRadiusInput] = useState<number>(() =>
    classroomGps?.radiusMeters ?? 40
  );
  const [isLocatingRoom, setIsLocatingRoom] = useState(false);
  const [roomGpsNotice, setRoomGpsNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [periodRosterFilter, setPeriodRosterFilter] = useState<PeriodRosterFilter>('all');
  const [periodRosterSearch, setPeriodRosterSearch] = useState('');
  const [periodRosterRoomFilter, setPeriodRosterRoomFilter] = useState('all');
  const [periodFlexConfig, setPeriodFlexConfig] = useState<PeriodFlexConfig>(() =>
    loadPeriodFlexConfig(activeSchoolId, selectedCourse.id)
  );
  const [periodCustomTimes, setPeriodCustomTimes] = useState<
    Record<string, { checkIn?: string; checkOut?: string; reason?: string }>
  >({});
  const [correctionPrefill, setCorrectionPrefill] = useState<CorrectionPrefillSeed | null>(null);

  const pendingCorrectionCount = useMemo(() => {
    const all = loadAttendanceCorrections(activeSchoolId);
    if (isStaffUser) {
      return all.filter((r) => r.stage === 'pending_homeroom' || r.stage === 'pending_admin').length;
    }
    const myIds = new Set(
      [currentUser?.id, currentUser?.studentRecordId, ownStudent?.id].filter(Boolean) as string[]
    );
    return all.filter(
      (r) => myIds.has(r.requesterId) && (r.stage === 'pending_homeroom' || r.stage === 'pending_admin')
    ).length;
  }, [activeSchoolId, isStaffUser, currentUser?.id, currentUser?.studentRecordId, ownStudent?.id, subTab]);

  useEffect(() => {
    setPeriodFlexConfig(loadPeriodFlexConfig(activeSchoolId, selectedCourse.id));
    setPeriodCustomTimes({});
  }, [activeSchoolId, selectedCourse.id]);

  const handleUpdatePeriodFlexConfig = (next: PeriodFlexConfig) => {
    const saved = savePeriodFlexConfig(activeSchoolId, selectedCourse.id, {
      ...next,
      updatedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
    });
    setPeriodFlexConfig(saved);
  };

  const handleSetStudentPeriodCustomTime = (
    studentId: string,
    patch: { checkIn?: string; checkOut?: string; reason?: string }
  ) => {
    setPeriodCustomTimes((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch },
    }));
  };

  useEffect(() => {
    const found = findClassroomGpsConfig(activeSchoolId, {
      courseId: selectedCourse.id,
      room: selectedCourse.room,
    });
    setClassroomGps(found);
    setRoomLatInput(found ? found.lat.toFixed(6) : '');
    setRoomLngInput(found ? found.lng.toFixed(6) : '');
    setRoomRadiusInput(found?.radiusMeters ?? 40);
    setRoomGpsNotice(null);
  }, [activeSchoolId, selectedCourse.id, selectedCourse.room]);

  const handleDetectRoomGps = () => {
    if (!navigator.geolocation) {
      setRoomGpsNotice({ type: 'err', text: 'เบราว์เซอร์ไม่รองรับการอ่านพิกัด GPS' });
      return;
    }
    setIsLocatingRoom(true);
    setRoomGpsNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setRoomLatInput(lat.toFixed(6));
        setRoomLngInput(lng.toFixed(6));
        const roomLabel = selectedCourse.room || selectedCourse.code || 'ห้องเรียน';
        const savedList = saveClassroomGpsConfig(activeSchoolId, {
          courseId: selectedCourse.id,
          roomKey: roomLabel,
          roomLabel,
          lat,
          lng,
          radiusMeters: roomRadiusInput || 40,
          updatedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
        });
        const saved =
          findClassroomGpsConfig(activeSchoolId, {
            courseId: selectedCourse.id,
            room: selectedCourse.room,
          }) ||
          savedList[0] ||
          null;
        setClassroomGps(saved);
        setIsLocatingRoom(false);
        setRoomGpsNotice({
          type: 'ok',
          text: `บันทึกพิกัดห้อง ${saved?.roomLabel || roomLabel} สำเร็จ (${lat.toFixed(5)}, ${lng.toFixed(5)} · รัศมี ${saved?.radiusMeters ?? (roomRadiusInput || 40)} ม.)`,
        });
      },
      () => {
        setIsLocatingRoom(false);
        setRoomGpsNotice({
          type: 'err',
          text: 'อ่านพิกัด GPS ไม่สำเร็จ กรุณาอนุญาตตำแหน่ง (Location) หรือกรอก Lat/Lng ด้วยตนเอง',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSaveManualRoomGps = () => {
    const lat = Number(roomLatInput.trim());
    const lng = Number(roomLngInput.trim());
    if (!isValidCoordinatePair(lat, lng)) {
      setRoomGpsNotice({
        type: 'err',
        text: 'พิกัด Lat / Lng ไม่ถูกต้อง กรุณากรอกค่าละติจูด/ลองจิจูดให้ครบถ้วน',
      });
      return;
    }
    const roomLabel = selectedCourse.room || selectedCourse.code || 'ห้องเรียน';
    const nextRadius = Math.max(15, Math.min(300, Number(roomRadiusInput) || 40));
    const savedList = saveClassroomGpsConfig(activeSchoolId, {
      courseId: selectedCourse.id,
      roomKey: roomLabel,
      roomLabel,
      lat,
      lng,
      radiusMeters: nextRadius,
      updatedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
    });
    const saved =
      findClassroomGpsConfig(activeSchoolId, {
        courseId: selectedCourse.id,
        room: selectedCourse.room,
      }) ||
      savedList[0] ||
      null;
    setClassroomGps(saved);
    setRoomGpsNotice({
      type: 'ok',
      text: `บันทึกพิกัดห้อง ${saved?.roomLabel || roomLabel} แล้ว (รัศมี ${saved?.radiusMeters ?? nextRadius} ม.)`,
    });
  };

  // Teacher hourly/period leave state
  const [leaveScope, setLeaveScope] = useState<'full_day' | 'period_hourly'>('full_day');
  const [leavePeriodNum, setLeavePeriodNum] = useState<number>(1);
  const [leaveTeacherFilter, setLeaveTeacherFilter] = useState<string>('all');
  const leaveFilteredCourses = useMemo(() => {
    const base = courses.length > 0 ? courses : [fallbackCourse];
    const filtered = base.filter((c) =>
      courseMatchesTeacherFilter(c, leaveTeacherFilter, courseTeacherOptions)
    );
    return filtered.length > 0 ? filtered : base;
  }, [courses, fallbackCourse, leaveTeacherFilter, courseTeacherOptions]);
  const [leaveCourseId, setLeaveCourseId] = useState<string>(courses[0]?.id || '');
  const [leaveSubstituteTeacherId, setLeaveSubstituteTeacherId] = useState<string>('');
  const [leaveCcRoles, setLeaveCcRoles] = useState<string>('หัวหน้ากลุ่มสาระฯ, รอง ผอ. ฝ่ายวิชาการ');
  const [leaveMissionNumber, setLeaveMissionNumber] = useState<string>('');

  const [showGpsAdminModal, setShowGpsAdminModal] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      const safe =
        (!isStaffUser && initialSubTab === 'teacher_proxy') ||
        (!canViewDailyReport && initialSubTab === 'daily_report')
          ? 'selfie_mobile'
          : initialSubTab;
      setSubTab(safe);
    }
    if (initialPeriodCourseId) setSelectedCourseId(initialPeriodCourseId);
    if (initialPeriodNumber) setSelectedPeriod(initialPeriodNumber);
    if (initialPeriodDate) setPeriodDate(initialPeriodDate);
    if (initialPeriodCode) setStudentPeriodCodeInput(initialPeriodCode);
    if (initialPeriodCheckType) setPeriodCheckType(initialPeriodCheckType);
  }, [
    isStaffUser,
    canViewDailyReport,
    initialSubTab,
    initialPeriodCourseId,
    initialPeriodNumber,
    initialPeriodDate,
    initialPeriodCode,
    initialPeriodCheckType,
  ]);

  const periodStudentIds: string[] = useMemo(() => {
    if (effectiveRole === 'teacher') {
      if (!periodFilteredCourses.some((course) => course.id === selectedCourse.id)) return [];
      return getCourseRosterStudentIds(selectedCourse, students);
    }
    if (selectedCourse.enrolledStudentIds && selectedCourse.enrolledStudentIds.length > 0) {
      return selectedCourse.enrolledStudentIds;
    }
    if (selectedCourse.room) {
      const targetRoom = selectedCourse.room.trim().toLowerCase();
      const roomStudents = students.filter((s) => (s.room || '').trim().toLowerCase() === targetRoom);
      if (roomStudents.length > 0) return roomStudents.map((s) => s.id);
    }
    if (selectedCourse.category) {
      const targetCategory = selectedCourse.category.toLowerCase();
      const gradeStudents = students.filter((s) =>
        (s.gradeLevel || '').toLowerCase().includes(targetCategory)
      );
      if (gradeStudents.length > 0) return gradeStudents.map((s) => s.id);
    }
    return [];
  }, [effectiveRole, periodFilteredCourses, selectedCourse, students]);

  const gateDailyReportRows = useMemo(
    () => buildGateAttendanceReportRows(gateRosterStudents, attendance, dailyReportDate),
    [gateRosterStudents, attendance, dailyReportDate]
  );
  const dailyReportHoliday = useMemo(
    () => getHolidayForDate(dailyReportDate, activeSchoolId),
    [dailyReportDate, activeSchoolId]
  );
  const dailyPeriodReportSessions = useMemo<DailyPeriodReportSession[]>(() => {
    return buildDailyPeriodReportSessions({
      date: dailyReportDate,
      schoolId: activeSchoolId,
      timetableSlots,
      courses: periodFilteredCourses,
      students,
      records: visiblePeriodAttendance,
      schoolDayOff: dailyReportHoliday?.isSchoolDayOff,
      isSlotInScope: effectiveRole === 'teacher'
        ? (slot) => slotMatchesLoggedInTeacher(slot, currentUser, ownTeacher, periodFilteredCourses)
        : undefined,
    });
  }, [
    timetableSlots,
    dailyReportDate,
    dailyReportHoliday,
    activeSchoolId,
    effectiveRole,
    currentUser,
    ownTeacher,
    periodFilteredCourses,
    students,
    visiblePeriodAttendance,
  ]);

  const quickRosterStudents = effectiveRole === 'teacher' ? gateRosterStudents : scopedStudents;

  useEffect(() => {
    setPeriodRosterRoomFilter('all');
  }, [selectedCourseId, selectedPeriod, periodDate]);

  const isSelfCheckin = isRestrictedViewer || attendanceMode === 'self';

  const selectedStudent = isStudentOnly
    ? ownStudent || loggedInProfile.linkedStudent
    : attendanceStudentScope.find((s) => s.id === selectedStudentId) || attendanceStudentScope[0];
  const selectedTeacher =
    currentUser?.role === 'teacher'
      ? ownTeacher || loggedInProfile.linkedTeacher
      : teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

  const effectiveUserType: AttendanceUserType = isSelfCheckin
    ? loggedInProfile.userType
    : activeUserType;

  const activePersonName = isSelfCheckin
    ? loggedInProfile.userName
    : effectiveUserType === 'teacher'
      ? selectedTeacher?.fullNameTh || 'อาจารย์'
      : `${selectedStudent?.firstNameTh || 'นักเรียน'} ${selectedStudent?.lastNameTh || ''}`.trim();

  const activePersonRole = isSelfCheckin
    ? loggedInProfile.userRoleLabel
    : effectiveUserType === 'teacher'
      ? selectedTeacher?.academicStanding || 'ครูผู้สอน'
      : `นักเรียน (${selectedStudent?.gradeLevel || 'ม.4'} ห้อง ${selectedStudent?.room || '401'})`;

  const activePersonId = isSelfCheckin
    ? loggedInProfile.idNumber
    : effectiveUserType === 'teacher'
      ? selectedTeacher?.teacherIdNumber || selectedTeacher?.id
      : selectedStudent?.studentIdNumber || selectedStudent?.id;

  const activePersonDefaultAvatar = isSelfCheckin
    ? loggedInProfile.avatarUrl
    : effectiveUserType === 'teacher'
      ? selectedTeacher?.avatarUrl
      : selectedStudent?.avatarUrl;

  const activeDepartmentOrRoom = isSelfCheckin
    ? loggedInProfile.departmentOrRoom
    : effectiveUserType === 'teacher'
      ? selectedTeacher?.department
      : selectedStudent?.room;

  const hasSchoolGpsConfigured = Boolean(selectedGate);
  const isInGeofence = Boolean(
    selectedGate && currentGpsDistance !== null && currentGpsDistance <= selectedGate.radiusMeters
  );
  const gpsStatusShortLabel = !selectedGate
    ? lang === 'th'
      ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน'
      : 'School GPS not set'
    : isGpsLoading
      ? lang === 'th'
        ? 'กำลังระบุพิกัด GPS...'
        : 'Locating GPS...'
      : gpsError || currentGpsDistance === null
        ? lang === 'th'
          ? 'รอสัญญาณ GPS'
          : 'Awaiting GPS'
        : isInGeofence
          ? lang === 'th'
            ? `ในเขต · ${currentGpsDistance.toLocaleString()} ม.`
            : `In range · ${currentGpsDistance.toLocaleString()}m`
          : lang === 'th'
            ? `นอกเขต · ${currentGpsDistance.toLocaleString()} ม.`
            : `Out of range · ${currentGpsDistance.toLocaleString()}m`;

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio fallback
    }
  };

  const startCamera = async (
    targetFacingMode: CameraFacingMode = facingModeRef.current,
    preferredDeviceId?: string | null
  ) => {
    const requestId = ++cameraRequestRef.current;
    facingModeRef.current = targetFacingMode;
    setFacingMode(targetFacingMode);
    setCameraError(null);
    setCameraNotice(null);
    setIsCameraSwitching(true);

    try {
      const result = await openCameraStream({
        facingMode: targetFacingMode,
        currentStream: cameraStreamRef.current,
        videoEl: videoRef.current,
        preferredDeviceId,
        idealWidth: 1280,
        idealHeight: 720,
        allowAnyFallback: true,
        isCancelled: () => cameraRequestRef.current !== requestId,
      });

      if (cameraRequestRef.current !== requestId) {
        stopCameraStream(result.stream, null);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stopCameraStream(result.stream, null);
        setIsCameraActive(false);
        return;
      }

      cameraStreamRef.current = result.stream;
      video.srcObject = result.stream;
      try {
        await video.play();
      } catch {
        // Autoplay attribute keeps stream running
      }

      if (cameraRequestRef.current !== requestId) {
        stopCameraStream(result.stream, video);
        return;
      }

      facingModeRef.current = result.resolvedFacingMode;
      setFacingMode(result.resolvedFacingMode);
      setAvailableCameras(result.devices);
      setActiveCameraId(result.deviceId);
      setIsCameraActive(true);

      if (result.requestedUnavailable) {
        setCameraNotice(
          result.devices.length <= 1
            ? 'อุปกรณ์นี้มีกล้องเพียง 1 ตัว จึงแสดงภาพจากกล้องที่มีอยู่'
            : targetFacingMode === 'environment'
              ? 'ไม่สามารถเปิดกล้องหลังได้ จึงแสดงภาพจากกล้องที่พร้อมใช้งาน'
              : 'ไม่สามารถเปิดกล้องหน้าได้ จึงแสดงภาพจากกล้องที่พร้อมใช้งาน'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'CAMERA_CANCELLED') {
        return;
      }
      if (cameraRequestRef.current !== requestId) return;
      console.warn('Camera access denied or unavailable, fallback active:', err);
      setCameraError(formatCameraErrorTh(err, targetFacingMode));
      setIsCameraActive(false);
    } finally {
      if (cameraRequestRef.current === requestId) {
        setIsCameraSwitching(false);
      }
    }
  };

  const handleToggleFacingMode = () => {
    if (isCameraSwitching) return;
    const nextMode: CameraFacingMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    void startCamera(nextMode);
  };

  const stopCamera = () => {
    cameraRequestRef.current++;
    stopCameraStream(cameraStreamRef.current, videoRef.current);
    cameraStreamRef.current = null;
    setIsCameraActive(false);
    setIsCameraSwitching(false);
  };

  useEffect(() => {
    if (subTab === 'selfie_mobile') {
      void startCamera(facingModeRef.current);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [subTab]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const executeSnapshotCapture = () => {
    setIsCapturing(true);
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const studioOptions = {
      frameId: isSimpleStaffCheckin ? 'clean' : selfieFrameId,
      filterId: isSimpleStaffCheckin ? 'normal' : selfieFilterId,
      effectId: isSimpleStaffCheckin ? 'none' : selfieEffectId,
      stickers: isSimpleStaffCheckin ? [] : placedStickers,
      personName: activePersonName || 'ผู้ใช้งาน',
      gateName: selectedGate?.nameTh || 'จุดเช็คชื่อโรงเรียน',
      checkTypeLabel: checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน',
      timeText: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    if (videoRef.current && isCameraActive) {
      try {
        const composited = composeLiveVideoSnapshot(
          videoRef.current,
          facingMode === 'user',
          studioOptions
        );
        if (composited) {
          setIsSimulatedPhoto(false);
          setCapturedPhotoUrl(composited);
          setIsCapturing(false);
          return;
        }
      } catch (e) {
        console.error('Canvas capture failed:', e);
      }
    }

    if (isSelfCheckin && !isDemoMode) {
      setIsSimulatedPhoto(false);
      setCapturedPhotoUrl('');
      setIsCapturing(false);
      setSelfieActionError('ยังไม่มีภาพจากกล้องจริง กรุณาเปิดกล้องและอนุญาตสิทธิ์กล้องก่อนถ่ายภาพเช็คอิน');
      return;
    }

    setIsSimulatedPhoto(true);
    if (currentUser?.role !== 'student') {
      try {
        const simulatedStudioUrl = composeSimulatedStudioSnapshot(
          activePersonName || 'ผู้ใช้งาน',
          studioOptions
        );
        if (simulatedStudioUrl) {
          setCapturedPhotoUrl(simulatedStudioUrl);
          setIsCapturing(false);
          return;
        }
      } catch (e) {
        console.error('Simulated studio capture failed:', e);
      }
    }

    const fallbackPhoto =
      activePersonDefaultAvatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    setCapturedPhotoUrl(fallbackPhoto);
    setIsCapturing(false);
  };

  const handleCaptureSnapshot = () => {
    if (selfieCountdown !== null) return;
    if (selfieTimerSeconds > 0 && !isSimpleStaffCheckin) {
      let remaining: number = selfieTimerSeconds;
      setSelfieCountdown(remaining);
      countdownIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current !== null) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setSelfieCountdown(null);
          executeSnapshotCapture();
        } else {
          setSelfieCountdown(remaining);
        }
      }, 1000);
      return;
    }
    executeSnapshotCapture();
  };

  const handleRefreshGps = () => {
    if (normalizedGates.length === 0) {
      setIsGpsLoading(false);
      setCurrentGpsDistance(null);
      setGpsError(
        lang === 'th'
          ? 'โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ กรุณาแจ้งผู้ดูแลระบบโรงเรียน'
          : 'School GPS coordinates have not been configured yet.'
      );
      return;
    }

    if (!navigator.geolocation) {
      setIsGpsLoading(false);
      setCurrentGpsDistance(null);
      setRealGpsCoords(null);
      setGpsError(
        lang === 'th'
          ? 'อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการอ่านพิกัด GPS'
          : 'Geolocation is not supported on this device.'
      );
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setRealGpsCoords({ lat, lng });

        let nearestGate = selectedGate || normalizedGates[0];
        let minDist = calculateHaversineDistanceMeters(lat, lng, nearestGate.lat, nearestGate.lng);
        for (const gate of normalizedGates) {
          const dGate = calculateHaversineDistanceMeters(lat, lng, gate.lat, gate.lng);
          if (dGate < minDist) {
            minDist = dGate;
            nearestGate = gate;
          }
        }
        if (nearestGate && nearestGate.id !== selectedGate?.id) {
          setSelectedGateId(nearestGate.id);
        }

        setCurrentGpsDistance(minDist);
        setGpsError(null);
        setIsGpsLoading(false);
      },
      (error) => {
        setIsGpsLoading(false);
        setCurrentGpsDistance(null);
        setRealGpsCoords(null);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError(
            lang === 'th'
              ? 'กรุณาอนุญาตสิทธิ์เข้าถึงตำแหน่ง GPS (Location) ในเบราว์เซอร์แล้วกดอัปเดตพิกัด'
              : 'Please allow Location access in your browser and refresh GPS.'
          );
        } else if (error.code === error.TIMEOUT) {
          setGpsError(
            lang === 'th'
              ? 'หมดเวลาการค้นหาสัญญาณ GPS กรุณากดอัปเดตพิกัดอีกครั้ง'
              : 'GPS lookup timed out. Please try again.'
          );
        } else {
          setGpsError(
            lang === 'th'
              ? 'ไม่สามารถอ่านตำแหน่ง GPS ปัจจุบันได้ กรุณาตรวจสอบสัญญาณตำแหน่งของเครื่อง'
              : 'Unable to determine current GPS position.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (subTab === 'selfie_mobile' && normalizedGates.length > 0) {
      handleRefreshGps();
    } else if (subTab === 'period_checkin' && isRestrictedViewer && navigator.geolocation) {
      setIsGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRealGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsError(null);
          setIsGpsLoading(false);
        },
        () => {
          setIsGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    } else if (normalizedGates.length === 0) {
      setCurrentGpsDistance(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, normalizedGates.length, _school?.id, isRestrictedViewer]);

  useEffect(() => {
    if (realGpsCoords && selectedGate) {
      setCurrentGpsDistance(
        calculateHaversineDistanceMeters(
          realGpsCoords.lat,
          realGpsCoords.lng,
          selectedGate.lat,
          selectedGate.lng
        )
      );
    }
  }, [realGpsCoords, selectedGate]);

  const handleConfirmCheckin = async () => {
    if (isSavingAttendance) return;
    setSelfieActionError(null);
    if (!isSelfCheckin && effectiveUserType === 'student' && !selectedStudent) {
      setSelfieActionError('ไม่พบข้อมูลนักเรียนสำหรับบันทึกเช็คชื่อ กรุณาเลือกนักเรียนก่อน');
      return;
    }
    if (
      isSelfCheckin &&
      currentUser?.role === 'student' &&
      !selectedStudent &&
      !loggedInProfile.isLinkedToStudentRecord
    ) {
      setSelfieActionError('บัญชีนี้ยังไม่ได้ผูกกับระเบียนนักเรียนที่ยืนยันได้ กรุณาติดต่อผู้ดูแลระบบก่อนเช็คอิน');
      return;
    }
    if (!isSelfCheckin && effectiveUserType === 'teacher' && !selectedTeacher) {
      setSelfieActionError('ไม่พบข้อมูลครูสำหรับบันทึกเช็คชื่อ กรุณาเลือกครูก่อน');
      return;
    }
    const attendancePerson = isSelfCheckin
      ? { id: loggedInProfile.targetId }
      : effectiveUserType === 'teacher'
        ? selectedTeacher
        : selectedStudent;
    if (!attendancePerson) {
      setSelfieActionError('ไม่พบข้อมูลผู้ใช้งานสำหรับเช็คอิน กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }
    if (
      ((currentUser?.role === 'student') || (isSelfCheckin && !isDemoMode)) &&
      (isSimulatedPhoto || !capturedPhotoUrl?.startsWith('data:image/jpeg;base64,'))
    ) {
      setSelfieActionError('ยังไม่มีภาพถ่ายจากกล้องจริง กรุณาเปิดกล้องและถ่ายภาพก่อนยืนยันเช็คอิน');
      return;
    }
    if (!selectedGate) {
      setSelfieActionError(
        isSchoolAdmin
          ? 'ยังไม่ได้ตั้งค่าพิกัด GPS ของโรงเรียน กรุณากำหนดพิกัดและจุดประตูเช็คชื่อของโรงเรียนก่อนใช้งาน'
          : 'โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ กรุณาแจ้งผู้ดูแลระบบโรงเรียน'
      );
      return;
    }
    if (currentGpsDistance === null || !realGpsCoords) {
      setSelfieActionError(
        gpsError || 'ยังไม่ได้รับพิกัด GPS ปัจจุบัน กรุณาอนุญาตตำแหน่ง (Location) แล้วกดอัปเดตพิกัด GPS'
      );
      return;
    }
    if (!isInGeofence) {
      setSelfieActionError(
        `คุณอยู่นอกพื้นที่โรงเรียน (ระยะห่าง ${currentGpsDistance.toLocaleString()} ม. เกินรัศมี ${selectedGate.radiusMeters} ม. ที่โรงเรียนกำหนด) กรุณาเข้ามาในบริเวณโรงเรียนแล้วกดอัปเดตพิกัด GPS`
      );
      return;
    }

    const photoToSave =
      capturedPhotoUrl ||
      activePersonDefaultAvatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    const nowTime = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const targetId = attendancePerson.id;
    const remarks = isSelfCheckin
      ? `${activePersonRole} (${activePersonName}) ถ่ายรูปเซลฟี่${checkType === 'check_in' ? 'เช็คชื่อเข้า' : 'เช็คชื่อออก'}ผ่านมือถือ ที่${selectedGate.nameTh} (ระยะ GPS: ${currentGpsDistance} ม.)`
      : `เจ้าหน้าที่ ${currentUser?.fullNameTh || 'ครูเวร'} บันทึกเช็คชื่อแทน${effectiveUserType === 'teacher' ? 'ครู' : 'นักเรียน'} (${activePersonName}) ที่${selectedGate.nameTh} (ระยะ GPS: ${currentGpsDistance} ม.)`;

    const [h, m] = nowTime.split(':').map(Number);
    const minutes = (h || 0) * 60 + (m || 0);
    const isLate = checkType === 'check_in' && minutes > 8 * 60;
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const recordId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const attendanceRecord: AttendanceRecord = {
      id: recordId,
      schoolId: _school?.id,
      studentId: targetId,
      teacherId: effectiveUserType === 'teacher' ? targetId : undefined,
      userType: effectiveUserType,
      userName: activePersonName,
      userRole: activePersonRole,
      userAvatar: photoToSave,
      userDepartmentOrRoom: activeDepartmentOrRoom,
      recordType: checkType,
      date: getLocalDateString(),
      time: nowTime,
      status,
      remarks,
      checkinMethod: 'selfie_geofence',
      photoUrl: photoToSave,
      location: {
        lat: realGpsCoords.lat,
        lng: realGpsCoords.lng,
        distanceMeters: currentGpsDistance,
        inGeofence: true,
        geofenceZoneName: selectedGate.nameTh,
      },
      lineNotificationSent: false,
      recordedBy: isSelfCheckin ? undefined : currentUser?.fullNameTh || 'เจ้าหน้าที่',
      recordedByRole: isSelfCheckin ? undefined : currentUser?.role || 'staff',
    };

    let photoStoragePath: string | undefined;
    if (currentUser?.role === 'student' && currentUser.studentRecordId) {
      setIsSavingAttendance(true);
      try {
        photoStoragePath = await saveStudentSelfAttendance(attendanceRecord, currentUser.id);
      } catch (error) {
        setSelfieActionError(error instanceof Error ? error.message : 'บันทึกการเช็คอินไม่สำเร็จ');
        setIsSavingAttendance(false);
        return;
      }
      setIsSavingAttendance(false);
    }

    onRecordAttendance(targetId, status, remarks, 'selfie_geofence', {
      recordType: checkType,
      photoUrl: photoToSave,
      userType: effectiveUserType,
      teacherId: effectiveUserType === 'teacher' ? targetId : undefined,
      userName: activePersonName,
      userRole: activePersonRole,
      userAvatar: photoToSave,
      userDepartmentOrRoom: activeDepartmentOrRoom,
      recordId,
      photoStoragePath,
      recordedBy: isSelfCheckin ? undefined : currentUser?.fullNameTh || 'เจ้าหน้าที่',
      recordedByRole: isSelfCheckin ? undefined : currentUser?.role || 'staff',
      location: {
        lat: realGpsCoords.lat,
        lng: realGpsCoords.lng,
        distanceMeters: currentGpsDistance,
        inGeofence: true,
        geofenceZoneName: selectedGate.nameTh,
      },
    });

    playChime();

    setCheckinSuccessFeedback({
      userName: activePersonName,
      userRole: activePersonRole,
      checkType,
      time: nowTime,
      distance: currentGpsDistance,
      photoUrl: photoToSave,
      gateName: selectedGate.nameTh,
    });

    setCapturedPhotoUrl(null);
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveErrorNotice(null);
    if (!leaveReason.trim()) {
      setLeaveErrorNotice('กรุณากรอกเหตุผลการลาก่อนส่งคำขอ');
      return;
    }

    const selectedCourseObj = courses.find((c) => c.id === leaveCourseId);
    const substituteTeacherObj = teachers.find((t) => t.id === leaveSubstituteTeacherId);

    const targetLeaveUserId = isSelfCheckin
      ? loggedInProfile.targetId
      : effectiveUserType === 'teacher'
        ? selectedTeacher?.id || ''
        : selectedStudent?.id || '';

    if (!targetLeaveUserId) {
      setLeaveErrorNotice(
        effectiveUserType === 'teacher'
          ? 'กรุณาเลือกบุคลากรก่อนส่งคำขอลา'
          : 'กรุณาเลือกนักเรียนก่อนส่งคำขอลา'
      );
      return;
    }

    const resolvedLeaveUserRole: 'student' | 'teacher' = isSelfCheckin
      ? loggedInProfile.userType === 'student'
        ? 'student'
        : 'teacher'
      : effectiveUserType;
    const leaveTargetStudent =
      resolvedLeaveUserRole === 'student'
        ? students.find((s) => s.id === targetLeaveUserId) || selectedStudent || ownStudent
        : undefined;
    const dualApprovers =
      resolvedLeaveUserRole === 'student'
        ? resolveStudentLeaveApprovers({
            student: leaveTargetStudent,
            teachers,
            courses,
            courseId: leaveScope === 'period_hourly' ? leaveCourseId : undefined,
          })
        : null;

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId: targetLeaveUserId,
      userName: isSelfCheckin ? loggedInProfile.userName : activePersonName,
      userRole: resolvedLeaveUserRole,
      gradeLevelOrDepartment: isSelfCheckin ? loggedInProfile.departmentOrRoom : activeDepartmentOrRoom,
      leaveType,
      leaveScope,
      periodNumber: leaveScope === 'period_hourly' ? leavePeriodNum : undefined,
      courseId: leaveScope === 'period_hourly' ? leaveCourseId : undefined,
      courseCode: leaveScope === 'period_hourly' ? selectedCourseObj?.code || 'GEN-101' : undefined,
      courseTitle:
        leaveScope === 'period_hourly'
          ? selectedCourseObj?.titleTh || selectedCourseObj?.titleEn
          : undefined,
      substituteTeacherId: leaveScope === 'period_hourly' ? leaveSubstituteTeacherId : undefined,
      substituteTeacherName:
        leaveScope === 'period_hourly'
          ? substituteTeacherObj?.fullNameTh || 'ระบุครูสอนแทนแล้ว'
          : undefined,
      ccEmailsOrRoles:
        resolvedLeaveUserRole === 'student' && dualApprovers
          ? `ครูประจำชั้น: ${dualApprovers.homeroomTeacherName} | ครูประจำวิชา: ${dualApprovers.subjectTeacherNames.join(', ')}`
          : leaveScope === 'period_hourly'
            ? leaveCcRoles || 'ฝ่ายวิชาการ, หัวหน้ากลุ่มสาระฯ'
            : undefined,
      homeroomTeacherName: dualApprovers?.homeroomTeacherName,
      homeroomApprovalStatus: dualApprovers ? 'pending' : undefined,
      subjectTeacherNames: dualApprovers?.subjectTeacherNames,
      subjectApprovals: dualApprovers?.subjectApprovals,
      startDate: leaveStartDate,
      endDate: leaveScope === 'period_hourly' ? leaveStartDate : leaveEndDate,
      reason:
        leaveScope === 'period_hourly' && leaveMissionNumber
          ? `[เลขที่คำสั่ง/ภารกิจ: ${leaveMissionNumber}] ${leaveReason}`
          : leaveReason,
      attachmentUrl: leaveAttachmentUrl || undefined,
      status: 'pending',
      createdAt: `${getLocalDateString()} ${new Date().toLocaleTimeString('th-TH')}`,
    };

    if (onAddLeaveRequest) {
      onAddLeaveRequest(newLeave);
    }

    if (leaveScope === 'period_hourly') {
      sendEduVerseNotification({
        title: `📋 แจ้งเตือน${resolvedLeaveUserRole === 'student' ? 'นักเรียนลาเรียนรายคาบ' : 'ครูลาสอนรายคาบ'}: ${newLeave.userName}`,
        body: `ลาคาบที่ ${leavePeriodNum} (${newLeave.courseCode || 'วิชาเรียน'}) ${newLeave.substituteTeacherName ? `มอบหมายสอนแทน: ${newLeave.substituteTeacherName}` : ''} | CC: ${newLeave.ccEmailsOrRoles || 'วิชาการ'}`,
        category: 'announcement',
        priority: 'urgent',
      }).catch((err) => {
        console.warn('[MobileAttendance] Failed to send hourly leave notification:', err);
      });
    } else if (resolvedLeaveUserRole === 'student' && dualApprovers) {
      sendEduVerseNotification({
        title: `📩 คำขอใบลานักเรียนใหม่: ${newLeave.userName}`,
        body: `ส่งอนุมัติทั้งครูประจำชั้น (${dualApprovers.homeroomTeacherName}) และครูประจำวิชา (${dualApprovers.subjectTeacherNames.slice(0, 3).join(', ')})`,
        category: 'announcement',
        priority: 'urgent',
      }).catch((err) => {
        console.warn('[MobileAttendance] Failed to send student leave notification:', err);
      });
    }

    setLeaveSuccessNotice(
      resolvedLeaveUserRole === 'student' && dualApprovers
        ? `ส่งใบ${leaveType === 'sick' ? 'ลาป่วย' : leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}เรียบร้อยแล้ว — ส่งอนุมัติทั้งครูประจำชั้น (${dualApprovers.homeroomTeacherName}) และครูประจำวิชา (${dualApprovers.subjectTeacherNames.length} ท่าน) แล้ว`
        : leaveScope === 'period_hourly'
          ? `ส่งใบลาสอนคาบที่ ${leavePeriodNum} (${newLeave.courseCode}) เรียบร้อยแล้ว ระบบได้แจ้งเตือนครูผู้สอนแทน (${newLeave.substituteTeacherName || '-'}) และ CC บุคลากรที่เกี่ยวข้องแล้ว`
          : `ส่งใบ${leaveType === 'sick' ? 'ลาป่วย' : leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}เรียบร้อยแล้ว รอครูประจำชั้นและครูประจำวิชาอนุมัติ`
    );
    setLeaveReason('');
    setLeaveAttachmentUrl('');
    setLeaveMissionNumber('');
    setLeaveFormStep(1);
    setTimeout(() => setLeaveSuccessNotice(null), 6000);
  };

  const periodsList = useMemo(() => {
    const lessonPeriods = (schoolPeriods || [])
      .filter((p) => !p.isBreak && p.periodNumber > 0)
      .sort((a, b) => a.periodNumber - b.periodNumber);
    if (lessonPeriods.length > 0) {
      return lessonPeriods.map((p) => ({
        period: p.periodNumber,
        time: `${p.startTime} - ${p.endTime}`,
        label: p.labelTh || `คาบที่ ${p.periodNumber}`,
      }));
    }
    return [
      { period: 1, time: '08:30 - 09:20', label: 'คาบที่ 1' },
      { period: 2, time: '09:25 - 10:15', label: 'คาบที่ 2' },
      { period: 3, time: '10:20 - 11:10', label: 'คาบที่ 3' },
      { period: 4, time: '11:15 - 12:05', label: 'คาบที่ 4' },
      { period: 5, time: '13:00 - 13:50', label: 'คาบที่ 5' },
      { period: 6, time: '13:55 - 14:45', label: 'คาบที่ 6' },
      { period: 7, time: '14:50 - 15:40', label: 'คาบที่ 7' },
    ];
  }, [schoolPeriods]);

  const currentBangkokNow = getBangkokClockSnapshot();
  const selectedPeriodMeta = periodsList.find((p) => p.period === selectedPeriod);
  const selectedPeriodTimeActivity = (() => {
    if (!selectedPeriodMeta || periodDate !== currentBangkokNow.dateStr) {
      return { isActive: false, remainingMinutes: null as number | null };
    }
    const [startStr, endStr] = selectedPeriodMeta.time.split('-').map((s) => s.trim());
    const toMins = (t?: string) => {
      if (!t) return null;
      const m = /^(\d{1,2}):(\d{2})$/.exec(t);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const startM = toMins(startStr);
    const endM = toMins(endStr);
    if (startM === null || endM === null) {
      return { isActive: false, remainingMinutes: null as number | null };
    }
    const isActive = currentBangkokNow.minutes >= startM && currentBangkokNow.minutes < endM;
    return {
      isActive,
      remainingMinutes: isActive ? Math.max(1, endM - currentBangkokNow.minutes) : null,
    };
  })();

  const trimmedProxyStudentId = proxyStudentIdInput.trim();
  const matchedProxyStudent = trimmedProxyStudentId
    ? gateRosterStudents.find((s) => (s.studentIdNumber || '').trim().toLowerCase() === trimmedProxyStudentId.toLowerCase())
    : undefined;

  const handleConfirmProxySingleCheckin = () => {
    if (!matchedProxyStudent) return;
    if (!gateRosterStudents.some((student) => student.id === matchedProxyStudent.id)) return;
    const actionLabel = proxyCheckType === 'check_in' ? 'เช็คชื่อเข้า' : 'เช็คชื่อออก';
    onRecordAttendance(
      matchedProxyStudent.id,
      proxySingleStatus,
      `ครู${actionLabel}แทนโดยระบุรหัสนักเรียน ${matchedProxyStudent.studentIdNumber} (${currentUser?.fullNameTh || currentUser?.fullNameEn || 'อาจารย์'})`,
      'teacher_proxy',
      {
        recordType: proxyCheckType,
        date: proxyDate,
        time: proxyTime,
        userType: 'student',
        userName: `${matchedProxyStudent.firstNameTh} ${matchedProxyStudent.lastNameTh}`,
        userRole: `นักเรียน (${matchedProxyStudent.gradeLevel})`,
        userAvatar: matchedProxyStudent.avatarUrl,
        userDepartmentOrRoom: matchedProxyStudent.room,
      }
    );
    playChime();
    setProxySavedNotification(
      `บันทึก${actionLabel}ให้นักเรียน ${matchedProxyStudent.firstNameTh} ${matchedProxyStudent.lastNameTh} (รหัส ${matchedProxyStudent.studentIdNumber}) สำเร็จ`
    );
    setProxyStudentIdInput('');
    setTimeout(() => setProxySavedNotification(null), 5000);
  };

  const handlePrepareProxyStudentEdit = (student: Student, checkType: AttendanceCheckType) => {
    if (!gateRosterStudents.some((allowedStudent) => allowedStudent.id === student.id)) return;
    setProxyStudentIdInput(student.studentIdNumber);
    setProxyCheckType(checkType);
    setProxyShowRosterHint(false);
  };

  const handleOpenDailyGateEdit = (student: Student, checkType: AttendanceCheckType) => {
    if (!gateRosterStudents.some((allowedStudent) => allowedStudent.id === student.id)) return;
    const reportRow = gateDailyReportRows.find((row) => row.student.id === student.id);
    const existingTime = checkType === 'check_in' ? reportRow?.checkIn?.time : reportRow?.checkOut?.time;
    setProxyDate(dailyReportDate);
    setProxyTime(
      existingTime?.slice(0, 5) ||
      new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
    setProxyStudentIdInput(student.studentIdNumber);
    setProxyCheckType(checkType);
    setProxyShowRosterHint(false);
    setSubTab('teacher_proxy');
  };

  const handleOpenDailyPeriodEdit = (student: Student, session: DailyPeriodReportSession) => {
    const course = periodFilteredCourses.find((candidate) => candidate.id === session.courseId);
    if (!course || !getCourseRosterStudentIds(course, students).includes(student.id)) return;

    setSelectedCourseId(session.courseId);
    setSelectedPeriod(session.periodNumber);
    setPeriodDate(dailyReportDate);
    setPeriodCheckType('check_in');
    setPeriodRosterFilter('all');
    setPeriodRosterRoomFilter('all');
    setPeriodRosterSearch(student.studentIdNumber);
    setPeriodStatuses({});
    setPeriodCustomTimes({});
    setSubTab('period_checkin');
  };

  const expectedPeriodCode = `${selectedCourse.code || 'GEN-101'}-P${selectedPeriod}-${periodDate.replace(/-/g, '')}`;
  const periodClassroomGpsParams = classroomGps
    ? `&clat=${classroomGps.lat.toFixed(6)}&clng=${classroomGps.lng.toFixed(6)}&crad=${classroomGps.radiusMeters}&croom=${encodeURIComponent(classroomGps.roomLabel)}`
    : '';
  const periodCheckinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?tab=mobile_checkin&subTab=period_checkin&courseId=${encodeURIComponent(selectedCourse.id)}&period=${selectedPeriod}&date=${encodeURIComponent(periodDate)}&code=${encodeURIComponent(expectedPeriodCode)}${periodClassroomGpsParams}`
      : `https://eduverse.school/?tab=mobile_checkin&subTab=period_checkin&courseId=${encodeURIComponent(selectedCourse.id)}&period=${selectedPeriod}&date=${encodeURIComponent(periodDate)}&code=${encodeURIComponent(expectedPeriodCode)}${periodClassroomGpsParams}`;

  const handleCopyPeriodLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(periodCheckinUrl);
      }
      setPeriodQrCopied(true);
      setTimeout(() => setPeriodQrCopied(false), 3000);
    } catch {
      setPeriodQrCopied(true);
      setTimeout(() => setPeriodQrCopied(false), 3000);
    }
  };

  const handleTeacherProxyPeriodCheckin = (
    student: Student,
    status: 'present' | 'late' | 'absent' | 'excused' = 'present',
    isNoPhoneProxy = false
  ) => {
    if (!periodStudentIds.includes(student.id)) return;
    const currentPeriodInfo = periodsList.find((p) => p.period === selectedPeriod);
    const existing = periodAttendance.find(
      (p) =>
        p.studentId === student.id &&
        p.courseId === selectedCourse.id &&
        p.date === periodDate &&
        p.periodNumber === selectedPeriod &&
        (p.recordType || 'check_in') === periodCheckType
    );
    const customTime = periodCustomTimes[student.id];
    const nowHm = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const actualCheckIn =
      customTime?.checkIn ||
      existing?.actualCheckInTime ||
      (periodCheckType === 'check_in' ? nowHm : undefined);
    const actualCheckOut =
      customTime?.checkOut ||
      existing?.actualCheckOutTime ||
      (periodCheckType === 'check_out' ? nowHm : undefined);
    const flexReason =
      customTime?.reason ||
      existing?.flexReason ||
      (customTime?.checkIn || customTime?.checkOut
        ? `ครูปรับเวลาเข้า-ออกคาบ (${actualCheckIn || '-'} / ${actualCheckOut || '-'})`
        : undefined);
    const record: PeriodAttendanceRecord = {
      id: existing?.id || `patt-proxy-${Date.now()}-${student.id}`,
      schoolId: selectedCourse.schoolId || activeSchoolId,
      courseId: selectedCourse.id,
      courseCode: selectedCourse.code || 'GEN-101',
      periodNumber: selectedPeriod,
      timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
      date: periodDate,
      studentId: student.id,
      status,
      recordType: periodCheckType,
      actualCheckInTime: actualCheckIn,
      actualCheckOutTime: actualCheckOut,
      graceMinutes: periodFlexConfig.graceMinutes,
      flexReason,
      verifiedByTeacherId: currentUser?.id || 'usr-teacher',
      verifiedByTeacherName:
        currentUser?.fullNameTh || currentUser?.fullNameEn || selectedCourse.teacherName || 'ครูผู้สอน',
      checkMethod: 'teacher_proxy',
      remarks: flexReason
        ? `${flexReason} · คาบที่ ${selectedPeriod}`
        : isNoPhoneProxy
          ? `ครูกดรับเช็คชื่อแทน (นักเรียนไม่มีมือถือ) คาบที่ ${selectedPeriod}`
          : `ครูบันทึกเช็คชื่อคาบที่ ${selectedPeriod} (${selectedCourse.code})`,
    };
    onRecordPeriodAttendance([record]);
    setPeriodStatuses((prev) => ({ ...prev, [student.id]: status }));
    playChime();
    setPeriodSavedNotification(
      isNoPhoneProxy
        ? `ครูกดรับเช็คชื่อแทน ${student.firstNameTh} ${student.lastNameTh} (ไม่มีมือถือ) คาบที่ ${selectedPeriod} เรียบร้อยแล้ว`
        : `บันทึกสถานะและเวลา ${student.firstNameTh} ${student.lastNameTh} คาบที่ ${selectedPeriod} แล้ว`
    );
    setTimeout(() => setPeriodSavedNotification(null), 4000);
  };

  const handleStudentSelfPeriodCheckin = (overrideCode?: string) => {
    setStudentPeriodCheckinError(null);
    setStudentPeriodCheckinMsg(null);
    const targetStudent = selectedStudent || ownStudent;
    if (!targetStudent) {
      setStudentPeriodCheckinError('ไม่พบข้อมูลบัญชีนักเรียนของคุณ');
      return;
    }

    const rawInput = (overrideCode ?? studentPeriodCodeInput).trim();
    let resolvedCourseId = selectedCourse.id;
    let resolvedPeriodNum = selectedPeriod;
    let resolvedDate = periodDate;
    let resolvedCode = expectedPeriodCode;
    let resolvedExpiresAt: number | null = initialPeriodExpiresAt ?? null;
    let resolvedToken: string | null = initialPeriodToken ?? null;
    let resolvedCheckType: 'check_in' | 'check_out' = periodCheckType;
    let urlRoomLat: number | null = null;
    let urlRoomLng: number | null = null;
    let urlRoomRadius: number | null = null;
    let urlRoomName: string | null = null;

    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      const pLat = Number(currentParams.get('clat'));
      const pLng = Number(currentParams.get('clng'));
      const pRad = Number(currentParams.get('crad'));
      const pRoom = currentParams.get('croom');
      if (isValidCoordinatePair(pLat, pLng)) {
        urlRoomLat = pLat;
        urlRoomLng = pLng;
        urlRoomRadius = !Number.isNaN(pRad) && pRad > 0 ? pRad : 40;
        urlRoomName = pRoom || null;
      }
    }

    if (rawInput) {
      try {
        if (rawInput.includes('courseId=') || rawInput.startsWith('http') || rawInput.startsWith('/?')) {
          const parsed = new URL(
            rawInput.startsWith('http')
              ? rawInput
              : `https://eduverse.school${rawInput.startsWith('/') ? '' : '/'}${rawInput}`
          );
          const qCourse = parsed.searchParams.get('courseId');
          const qPeriod = parsed.searchParams.get('period');
          const qDate = parsed.searchParams.get('date');
          const qCode = parsed.searchParams.get('code');
          const qExp = parsed.searchParams.get('exp');
          const qToken = parsed.searchParams.get('token');
          const qType = parsed.searchParams.get('type');
          const qClat = Number(parsed.searchParams.get('clat'));
          const qClng = Number(parsed.searchParams.get('clng'));
          const qCrad = Number(parsed.searchParams.get('crad'));
          const qCroom = parsed.searchParams.get('croom');
          if (qCourse) resolvedCourseId = qCourse;
          if (qPeriod && !Number.isNaN(Number(qPeriod))) resolvedPeriodNum = Number(qPeriod);
          if (qDate) resolvedDate = qDate;
          if (qCode) resolvedCode = qCode;
          if (qExp && !Number.isNaN(Number(qExp))) resolvedExpiresAt = Number(qExp);
          if (qToken) resolvedToken = qToken;
          if (qType === 'check_in' || qType === 'check_out') resolvedCheckType = qType;
          if (isValidCoordinatePair(qClat, qClng)) {
            urlRoomLat = qClat;
            urlRoomLng = qClng;
            urlRoomRadius = !Number.isNaN(qCrad) && qCrad > 0 ? qCrad : 40;
            urlRoomName = qCroom || null;
          }
        } else {
          resolvedCode = rawInput;
          const savedSession = loadSavedPeriodQrSessions(activeSchoolId).find(
            (s) =>
              s.shortCode.toUpperCase() === rawInput.toUpperCase() ||
              s.token.toUpperCase() === rawInput.toUpperCase()
          );
          if (savedSession) {
            resolvedCourseId = savedSession.courseId;
            resolvedPeriodNum = savedSession.periodNumber;
            resolvedDate = savedSession.date;
            resolvedCode = savedSession.shortCode;
            resolvedToken = savedSession.token;
            resolvedExpiresAt = savedSession.revokedAt ? 1 : savedSession.expiresAt;
            resolvedCheckType = savedSession.checkType;
            if (
              typeof savedSession.classroomLat === 'number' &&
              typeof savedSession.classroomLng === 'number' &&
              isValidCoordinatePair(savedSession.classroomLat, savedSession.classroomLng)
            ) {
              urlRoomLat = savedSession.classroomLat;
              urlRoomLng = savedSession.classroomLng;
              urlRoomRadius = savedSession.classroomRadiusMeters || 40;
              urlRoomName = savedSession.roomLabel || null;
            }
          } else {
            const matchingCourse = courses.find((c) =>
              rawInput.toUpperCase().startsWith((c.code || '').toUpperCase())
            );
            if (matchingCourse) {
              resolvedCourseId = matchingCourse.id;
            }
            const periodMatch = rawInput.match(/-P(\d+)/i);
            if (periodMatch?.[1]) {
              resolvedPeriodNum = Number(periodMatch[1]);
            }
          }
        }
      } catch {
        setStudentPeriodCheckinError('รูปแบบลิงก์หรือรหัส QR ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        return;
      }
    }

    const tokenValidation = validatePeriodQrTokenState({
      schoolId: activeSchoolId,
      token: resolvedToken,
      code: resolvedCode,
      expiresAt: resolvedExpiresAt,
    });
    if (!tokenValidation.valid) {
      setStudentPeriodCheckinError(
        lang === 'th'
          ? tokenValidation.reasonTh || 'QR Code หมดอายุหรือไม่ถูกต้อง'
          : tokenValidation.reasonEn || 'QR Code has expired or is invalid'
      );
      return;
    }

    const targetCourse = courses.find((c) => c.id === resolvedCourseId) || selectedCourse;

    const storedRoomGps = findClassroomGpsConfig(activeSchoolId, {
      courseId: targetCourse.id,
      room: targetCourse.room,
    });
    const effectiveRoomGps: ClassroomGpsConfig | null =
      urlRoomLat !== null && urlRoomLng !== null
        ? {
            roomKey: storedRoomGps?.roomKey || `url-room-${targetCourse.id}`,
            roomLabel: urlRoomName || targetCourse.room || targetCourse.code || 'ห้องเรียน',
            courseId: targetCourse.id,
            lat: urlRoomLat,
            lng: urlRoomLng,
            radiusMeters: urlRoomRadius || 40,
            updatedAt: new Date().toISOString(),
          }
        : storedRoomGps;

    if (!effectiveRoomGps) {
      setStudentPeriodCheckinError(
        `ยังไม่ได้ตั้งค่าพิกัด GPS ห้องเรียน (${targetCourse.room || targetCourse.code}) กรุณาแจ้งครูผู้สอนตั้งค่าพิกัดห้องเรียนก่อนเช็คชื่อรายคาบ`
      );
      return;
    }

    if (!realGpsCoords) {
      if (navigator.geolocation) {
        setIsGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setRealGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsGpsLoading(false);
          },
          () => setIsGpsLoading(false),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
      setStudentPeriodCheckinError(
        'ยังไม่ได้รับสัญญาณ GPS ปัจจุบันเพื่อตรวจสอบพิกัดห้องเรียน กรุณาอนุญาตตำแหน่ง (Location) แล้วกดเช็คชื่ออีกครั้ง'
      );
      return;
    }

    const roomGpsCheck = checkDistanceToClassroomGps(realGpsCoords, effectiveRoomGps);
    if (!roomGpsCheck.inRange) {
      setStudentPeriodCheckinError(
        `อยู่นอกพิกัดห้องเรียน ${effectiveRoomGps.roomLabel} (ห่าง ${(roomGpsCheck.distanceMeters ?? 0).toLocaleString()} ม. เกินรัศมีที่กำหนด ${roomGpsCheck.radiusMeters} ม.) กรุณาเข้าห้องเรียนแล้วลองใหม่ หรือแจ้งครูผู้สอนหากไม่มีสัญญาณ`
      );
      return;
    }

    let isStudentEnrolledInClass = false;
    if (targetCourse.enrolledStudentIds && targetCourse.enrolledStudentIds.length > 0) {
      isStudentEnrolledInClass = targetCourse.enrolledStudentIds.includes(targetStudent.id);
    } else if (targetCourse.room && targetStudent.room) {
      isStudentEnrolledInClass =
        targetCourse.room.trim().toLowerCase() === targetStudent.room.trim().toLowerCase();
    } else if (targetCourse.category && targetStudent.gradeLevel) {
      isStudentEnrolledInClass = (targetStudent.gradeLevel || '')
        .toLowerCase()
        .includes((targetCourse.category || '').toLowerCase());
    }

    if (!isStudentEnrolledInClass) {
      setStudentPeriodCheckinError(
        `⛔ ปฏิเสธการเช็คชื่อ: นักเรียน ${targetStudent.firstNameTh} ${targetStudent.lastNameTh} (ชั้น ${targetStudent.gradeLevel} ห้อง ${targetStudent.room || '-'}) ไม่ได้อยู่ในรายชื่อหรือห้องเรียนของวิชานี้ (${targetCourse.code || ''} ${targetCourse.titleTh || ''} ${targetCourse.room ? 'ห้อง ' + targetCourse.room : ''}) สิทธิ์เช็คชื่อรายคาบอนุญาตเฉพาะเด็กในชั้นเรียนนี้เท่านั้น`
      );
      return;
    }

    const currentPeriodInfo = periodsList.find((p) => p.period === resolvedPeriodNum);
    const courseFlexConfig = loadPeriodFlexConfig(activeSchoolId, targetCourse.id);
    const bkkClock = getBangkokClockSnapshot();
    const actualHm = bkkClock.timeLabel;
    const timingEval = evaluatePeriodTimingStatus({
      timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
      checkType: resolvedCheckType,
      actualMinutes: bkkClock.minutes,
      graceMinutes: courseFlexConfig.graceMinutes,
      allowFlexibleCheckout: courseFlexConfig.allowFlexibleCheckout,
    });
    const actionLabel =
      resolvedCheckType === 'check_in' ? 'เช็คชื่อเข้าเรียน (Check-in)' : 'เช็คชื่อออกคาบเรียน (Check-out)';

    const record: PeriodAttendanceRecord = {
      id: `patt-qr-${Date.now()}-${targetStudent.id}`,
      schoolId: targetCourse.schoolId || _school?.id || 'sch-1',
      courseId: targetCourse.id,
      courseCode: targetCourse.code || 'GEN-101',
      periodNumber: resolvedPeriodNum,
      timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
      date: resolvedDate,
      studentId: targetStudent.id,
      status: timingEval.status,
      recordType: resolvedCheckType,
      actualCheckInTime: resolvedCheckType === 'check_in' ? actualHm : undefined,
      actualCheckOutTime: resolvedCheckType === 'check_out' ? actualHm : undefined,
      graceMinutes: courseFlexConfig.graceMinutes,
      flexReason: timingEval.timingTagTh,
      verifiedByTeacherId: 'qr-self-checkin',
      verifiedByTeacherName: targetCourse.teacherName || 'ระบบ Barcode/QR รายคาบ',
      checkMethod: 'qr_code',
      remarks: `นักเรียนสแกน Barcode/QR ${actionLabel} (${actualHm} น. · ${timingEval.timingTagTh}) · พิกัดห้อง ${effectiveRoomGps.roomLabel} (ห่าง ${roomGpsCheck.distanceMeters ?? 0} ม.)`,
    };

    onRecordPeriodAttendance([record]);
    setSelectedCourseId(targetCourse.id);
    setSelectedPeriod(resolvedPeriodNum);
    setPeriodDate(resolvedDate);
    setPeriodCheckType(resolvedCheckType);
    playChime();
    setStudentPeriodCheckinMsg(
      `${resolvedCheckType === 'check_in' ? '🟢 เช็คชื่อเข้าเรียน' : '🔴 เช็คชื่อออกคาบ'} (${timingEval.timingTagTh}) วิชา ${targetCourse.code} คาบที่ ${resolvedPeriodNum} เวลา ${actualHm} น. สำเร็จ!`
    );
    setTimeout(() => setStudentPeriodCheckinMsg(null), 5000);
  };

  const handleSavePeriodAttendance = () => {
    const currentPeriodInfo = periodsList.find((p) => p.period === selectedPeriod);
    const newRecords: PeriodAttendanceRecord[] = periodStudentIds.map((stuId) => {
      const existing = periodAttendance.find(
        (p) =>
          p.studentId === stuId &&
          p.courseId === selectedCourse.id &&
          p.date === periodDate &&
          p.periodNumber === selectedPeriod
      );
      const customTime = periodCustomTimes[stuId];
      const status = periodStatuses[stuId] || existing?.status || 'present';
      return {
        id: existing?.id || `patt-${Date.now()}-${stuId}`,
        schoolId: selectedCourse.schoolId || 'sch-1',
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code || 'GEN-101',
        periodNumber: selectedPeriod,
        timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
        date: periodDate,
        studentId: stuId,
        status,
        actualCheckInTime: customTime?.checkIn || existing?.actualCheckInTime,
        actualCheckOutTime: customTime?.checkOut || existing?.actualCheckOutTime,
        graceMinutes: periodFlexConfig.graceMinutes,
        flexReason: customTime?.reason || existing?.flexReason,
        verifiedByTeacherId: currentUser?.id || 'usr-teacher',
        verifiedByTeacherName:
          currentUser?.fullNameTh || currentUser?.fullNameEn || selectedCourse.teacherName || 'อาจารย์',
        checkMethod: existing?.checkMethod || 'teacher_proxy',
        remarks:
          customTime?.reason ||
          existing?.remarks ||
          `เช็คชื่อรายคาบ ${selectedCourse.code || 'GEN-101'} คาบที่ ${selectedPeriod}`,
      };
    });

    onRecordPeriodAttendance(newRecords);
    setPeriodSavedNotification(
      `บันทึกการเช็คชื่อเข้าเรียนรายคาบ ${selectedCourse.code || 'GEN-101'} (คาบที่ ${selectedPeriod}) สำเร็จ (${newRecords.length} คน)`
    );
    setTimeout(() => setPeriodSavedNotification(null), 5000);
  };

  const filteredProxyStudents =
    gateRosterStudents.filter((student) => {
      if (proxyRoomFilter !== 'all' && `${student.gradeLevel} ${student.room}`.trim() !== proxyRoomFilter) return false;
      const query = proxySearch.trim().toLowerCase();
      if (!query) return true;
      return (
        `${student.firstNameTh} ${student.lastNameTh}`.toLowerCase().includes(query) ||
        `${student.firstNameEn} ${student.lastNameEn}`.toLowerCase().includes(query) ||
        student.studentIdNumber.toLowerCase().includes(query)
      );
    });

  const todayDateStr = getLocalDateString();
  const todayAttendanceByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of attendance) {
      if (rec.date !== todayDateStr || rec.userType === 'teacher') continue;
      const prev = map.get(rec.studentId);
      if (!prev || rec.recordType === 'check_in') {
        map.set(rec.studentId, rec);
      }
    }
    return map;
  }, [attendance, todayDateStr]);

  const rosterGradeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of quickRosterStudents) {
      if (s.gradeLevel) set.add(s.gradeLevel);
    }
    return Array.from(set);
  }, [quickRosterStudents]);

  const filteredRosterStudents = useMemo(() => {
    const q = rosterSheetQuery.trim().toLowerCase();
    return quickRosterStudents.filter((s) => {
      if (rosterSheetGradeFilter !== 'all' && s.gradeLevel !== rosterSheetGradeFilter) return false;
      if (!q) return true;
      return (
        `${s.firstNameTh} ${s.lastNameTh}`.toLowerCase().includes(q) ||
        `${s.firstNameEn} ${s.lastNameEn}`.toLowerCase().includes(q) ||
        s.studentIdNumber.toLowerCase().includes(q) ||
        `${s.gradeLevel}/${s.room}`.toLowerCase().includes(q)
      );
    });
  }, [quickRosterStudents, rosterSheetGradeFilter, rosterSheetQuery]);

  const rosterTodayStats = useMemo(() => {
    let checkedIn = 0;
    let late = 0;
    for (const s of quickRosterStudents) {
      const rec = todayAttendanceByStudent.get(s.id);
      if (rec?.status === 'present') checkedIn += 1;
      else if (rec?.status === 'late') late += 1;
    }
    return {
      checkedIn,
      late,
      pending: Math.max(0, quickRosterStudents.length - checkedIn - late),
    };
  }, [quickRosterStudents, todayAttendanceByStudent]);

  const stopNfcScanning = () => {
    if (nfcAbortRef.current) {
      try {
        nfcAbortRef.current.abort();
      } catch {
        // ignore abort errors
      }
      nfcAbortRef.current = null;
    }
    setIsNfcScanning(false);
  };

  useEffect(() => {
    if (subTab !== 'nfc_tap') {
      stopNfcScanning();
    }
    return () => {
      stopNfcScanning();
    };
  }, [subTab]);

  const logResolvedNfcAttendance = (params: {
    userType: 'student' | 'teacher';
    student?: Student;
    teacher?: Teacher;
    uid: string;
  }) => {
    const { userType, student, teacher, uid } = params;
    const nowTime = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const [h, m] = nowTime.split(':').map(Number);
    const minutes = (h || 0) * 60 + (m || 0);
    const resolvedStatus: AttendanceStatus = isStaffUser
      ? nfcStatusMode
      : nfcCheckType === 'check_in' && minutes > 8 * 60
        ? 'late'
        : 'present';

    const actionWord = nfcCheckType === 'check_in' ? 'เช็คชื่อเข้า' : 'เช็คชื่อออก';
    const personName =
      userType === 'student'
        ? `${student?.firstNameTh || ''} ${student?.lastNameTh || ''}`.trim()
        : teacher?.fullNameTh || 'บุคลากร';
    const targetId = userType === 'student' ? student?.id || '' : teacher?.id || '';
    const roleLabel =
      userType === 'student'
        ? `นักเรียน (${student?.gradeLevel || ''} ${student?.room || ''})`.trim()
        : teacher?.academicStanding || 'ครู / บุคลากร';

    onRecordAttendance(
      targetId,
      resolvedStatus,
      `แตะบัตร NFC (${uid}) ${actionWord}${selectedGate ? ` ที่${selectedGate.nameTh}` : ''}`,
      'nfc',
      {
        recordType: nfcCheckType,
        userType,
        teacherId: userType === 'teacher' ? targetId : undefined,
        userName: personName,
        userRole: roleLabel,
        userAvatar: userType === 'student' ? student?.avatarUrl : teacher?.avatarUrl,
        userDepartmentOrRoom: userType === 'student' ? student?.room : teacher?.department,
        date: todayDateStr,
        recordedBy: isStaffUser ? currentUser?.fullNameTh || 'เจ้าหน้าที่จุดสแกน NFC' : personName,
        recordedByRole: currentUser?.role || userType,
        ...(selectedGate && currentGpsDistance !== null
          ? {
              location: {
                lat: realGpsCoords?.lat ?? selectedGate.lat,
                lng: realGpsCoords?.lng ?? selectedGate.lng,
                distanceMeters: currentGpsDistance,
                inGeofence: isInGeofence,
                geofenceZoneName: selectedGate.nameTh,
              },
            }
          : {}),
      }
    );

    playChime();
    setNfcRecentLogs((prev) => [
      {
        id: `nfc-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        uid,
        name: personName,
        roleLabel,
        userType,
        checkType: nfcCheckType,
        status: resolvedStatus,
        time: nowTime,
        gateName: selectedGate?.nameTh || _school?.nameTh || 'จุดสแกน NFC',
      },
      ...prev.slice(0, 14),
    ]);
    setNfcErrorMessage(null);
    setUnregisteredNfcTag(null);
    setNfcStatusMessage(
      lang === 'th'
        ? `แตะบัตร NFC สำเร็จ: ${personName} (${actionWord} • ${nowTime} น.)`
        : `NFC Tap logged: ${personName} (${nfcCheckType} • ${nowTime})`
    );
    window.setTimeout(() => setNfcStatusMessage(null), 5000);
  };

  const handleProcessNfcCardInput = (rawUid: string, payloadText = '') => {
    const clean = rawUid.trim() || payloadText.trim();
    if (!clean) {
      setNfcErrorMessage(lang === 'th' ? 'ไม่พบรหัสบัตร NFC กรุณาลองแตะใหม่อีกครั้ง' : 'Empty NFC tag UID');
      return;
    }

    const dedupeKey = `${clean.toUpperCase()}:${nfcCheckType}`;
    const now = Date.now();
    if (nfcLastTapRef.current.key === dedupeKey && now - nfcLastTapRef.current.at < 2500) {
      return;
    }
    nfcLastTapRef.current = { key: dedupeKey, at: now };

    if (isStaffUser && isQuickAttendanceLocked) {
      runWithBiometricGuard(() => handleProcessNfcCardInput(rawUid, payloadText));
      return;
    }

    const match = resolveNfcTap({
      schoolId: activeSchoolId,
      rawInput: clean,
      payloadText,
      students: attendanceStudentScope,
      teachers: isRestrictedViewer ? (ownTeacher ? [ownTeacher] : []) : teachers,
    });

    if (!match.matched) {
      if (isRestrictedViewer && ownStudent) {
        setUnregisteredNfcTag({ uid: match.uid, payloadText: match.payloadText });
        setNfcErrorMessage(
          lang === 'th'
            ? `บัตร UID ${match.uid} ยังไม่ผูกกับบัญชีของคุณ กดปุ่มด้านล่างเพื่อผูกกับบัตรนักเรียนของ ${ownStudent.firstNameTh} และเช็คชื่อทันที`
            : `Card UID ${match.uid} is not bound yet. Bind it to your student profile below.`
        );
        return;
      }
      setUnregisteredNfcTag({ uid: match.uid, payloadText: match.payloadText });
      setNfcErrorMessage(
        lang === 'th'
          ? `บัตร NFC UID "${match.uid}" ยังไม่ได้ลงทะเบียนในระบบ กรุณาเลือกเจ้าของบัตรเพื่อจับคู่และเช็คชื่อ`
          : `Unregistered NFC card UID "${match.uid}". Pair it to a student or teacher below.`
      );
      return;
    }

    if (isRestrictedViewer && ownStudent && match.userType === 'student' && match.student.id !== ownStudent.id) {
      setNfcErrorMessage(
        lang === 'th'
          ? 'บัตรนี้ไม่ใช่บัตรประจำตัวของคุณ ระบบไม่อนุญาตให้แตะบัตรแทนผู้อื่น'
          : 'This NFC card does not belong to your account.'
      );
      return;
    }

    logResolvedNfcAttendance({
      userType: match.userType,
      student: match.userType === 'student' ? match.student : undefined,
      teacher: match.userType === 'teacher' ? match.teacher : undefined,
      uid: match.uid,
    });
  };

  const handleBindUnregisteredNfcCard = () => {
    if (!unregisteredNfcTag) return;
    if (isRestrictedViewer && ownStudent) {
      const updated = saveNfcBinding(activeSchoolId, {
        uid: unregisteredNfcTag.uid,
        targetType: 'student',
        targetId: ownStudent.id,
        displayId: ownStudent.studentIdNumber,
        label: `${ownStudent.firstNameTh} ${ownStudent.lastNameTh}`,
      });
      setNfcBindings(updated);
      logResolvedNfcAttendance({
        userType: 'student',
        student: ownStudent,
        uid: formatNfcUidDisplay(unregisteredNfcTag.uid),
      });
      return;
    }

    if (bindTargetType === 'student') {
      const stu = attendanceStudentScope.find((s) => s.id === bindTargetId);
      if (!stu) return;
      const updated = saveNfcBinding(activeSchoolId, {
        uid: unregisteredNfcTag.uid,
        targetType: 'student',
        targetId: stu.id,
        displayId: stu.studentIdNumber,
        label: `${stu.firstNameTh} ${stu.lastNameTh}`,
      });
      setNfcBindings(updated);
      logResolvedNfcAttendance({
        userType: 'student',
        student: stu,
        uid: formatNfcUidDisplay(unregisteredNfcTag.uid),
      });
    } else {
      const tch = teachers.find((t) => t.id === bindTargetId);
      if (!tch) return;
      const updated = saveNfcBinding(activeSchoolId, {
        uid: unregisteredNfcTag.uid,
        targetType: 'teacher',
        targetId: tch.id,
        displayId: tch.teacherIdNumber,
        label: tch.fullNameTh,
      });
      setNfcBindings(updated);
      logResolvedNfcAttendance({
        userType: 'teacher',
        teacher: tch,
        uid: formatNfcUidDisplay(unregisteredNfcTag.uid),
      });
    }
  };

  const handleStartWebNfcScan = async () => {
    if (isStaffUser && isQuickAttendanceLocked) {
      runWithBiometricGuard(() => {
        void handleStartWebNfcScan();
      });
      return;
    }

    const NdefCtor = getNdefReaderConstructor();
    if (!NdefCtor) {
      setNfcErrorMessage(
        lang === 'th'
          ? 'เบราว์เซอร์นี้ไม่รองรับ Web NFC (NDEFReader) ใช้ได้บน Android Chrome ผ่าน HTTPS — คุณสามารถใช้เครื่องอ่าน NFC แบบ USB หรือกรอก UID ด้านล่างแทนได้'
          : 'Web NFC (NDEFReader) is only supported on Android Chrome over HTTPS. Use USB reader or manual UID input below.'
      );
      return;
    }

    stopNfcScanning();
    setNfcErrorMessage(null);
    const controller = new AbortController();
    nfcAbortRef.current = controller;

    try {
      const reader = new NdefCtor();
      await reader.scan({ signal: controller.signal });
      setIsNfcScanning(true);
      setNfcStatusMessage(
        lang === 'th'
          ? 'เปิดเครื่องอ่าน NFC แล้ว: แตะบัตรนักเรียน/ครูที่ด้านหลังมือถือ'
          : 'NFC Reader active: hold an ID card against the back of your device'
      );

      reader.addEventListener('reading', (event: Event) => {
        const parsed = parseNfcReadingEvent(event as WebNdefReadingEvent);
        handleProcessNfcCardInput(parsed.serialNumber, parsed.payloadText);
      });

      reader.addEventListener('readingerror', () => {
        setNfcErrorMessage(
          lang === 'th'
            ? 'อ่านข้อมูลจากบัตร NFC ไม่สำเร็จ กรุณาขยับบัตรให้ตรงตำแหน่งเสาสัญญาณด้านหลังเครื่อง'
            : 'Could not read NFC tag. Hold the card steady near the back antenna.'
        );
      });
    } catch (err) {
      stopNfcScanning();
      const msg = err instanceof Error ? err.message : String(err);
      if ((err as { name?: string })?.name === 'NotAllowedError') {
        setNfcErrorMessage(
          lang === 'th'
            ? 'ไม่ได้รับอนุญาตให้ใช้งาน NFC บนเบราว์เซอร์ กรุณาตรวจสอบสิทธิ์ NFC ในการตั้งค่าเว็บไซต์'
            : 'NFC permission was denied by browser settings.'
        );
      } else {
        setNfcErrorMessage(
          lang === 'th' ? `ไม่สามารถเปิดเครื่องอ่าน NFC ได้ (${msg})` : `Could not start NFC reader (${msg})`
        );
      }
    }
  };

  const handleQuickRosterCheckin = (st: Student, status: AttendanceStatus = 'present') => {
    if (!quickRosterStudents.some((student) => student.id === st.id)) return;
    runWithBiometricGuard(() => {
      const statusLabel = status === 'present' ? 'มาเรียน' : status === 'late' ? 'มาสาย' : 'ลา';
      onRecordAttendance(
        st.id,
        status,
        `เช็คชื่อด่วนด้วยมือเดียว (${statusLabel}) โดย ${currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครู/ผู้ดูแล'}`,
        'teacher_proxy',
        {
          recordType: 'check_in',
          userType: 'student',
          userName: `${st.firstNameTh} ${st.lastNameTh}`,
          userRole: `นักเรียน (${st.gradeLevel})`,
          userAvatar: st.avatarUrl,
          userDepartmentOrRoom: st.room,
          date: todayDateStr,
          recordedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'เจ้าหน้าที่',
          recordedByRole: currentUser?.role || 'staff',
        }
      );
      playChime();
      setRosterToast(
        lang === 'th'
          ? `เช็คชื่อ ${st.firstNameTh} (${statusLabel}) เรียบร้อย`
          : `Checked in ${st.firstNameEn} (${status})`
      );
      window.setTimeout(() => setRosterToast(null), 2600);
    });
  };

  const handleSelectRosterStudentForCurrentTab = (st: Student) => {
    if (!quickRosterStudents.some((student) => student.id === st.id)) return;
    if (subTab === 'teacher_proxy') {
      setProxyStudentIdInput(st.studentIdNumber);
      setShowQuickRosterSheet(false);
      return;
    }
    if (subTab === 'nfc_tap') {
      setNfcManualUidInput(st.nfcCardUid || st.studentIdNumber);
      setShowQuickRosterSheet(false);
      return;
    }
    if (subTab === 'period_checkin' && isStaffUser) {
      const existing = periodAttendance.find(
        (p) =>
          p.studentId === st.id &&
          p.courseId === selectedCourse.id &&
          p.date === periodDate &&
          p.periodNumber === selectedPeriod
      );
      const current = periodStatuses[st.id] || existing?.status || 'present';
      const next: AttendanceStatus = current === 'present' ? 'late' : current === 'late' ? 'absent' : 'present';
      setPeriodStatuses((prev) => ({ ...prev, [st.id]: next }));
      setRosterToast(
        `${st.firstNameTh}: ${next === 'present' ? 'เข้าเรียน' : next === 'late' ? 'สาย' : 'ขาด'} (คาบ ${selectedPeriod})`
      );
      window.setTimeout(() => setRosterToast(null), 2200);
      return;
    }
    if (isStaffUser) {
      setAttendanceMode('proxy');
      setActiveUserType('student');
      setSelectedStudentId(st.id);
      setSubTab('selfie_mobile');
      setShowIdentitySheet(false);
      setShowQuickRosterSheet(false);
    } else {
      setSubTab('selfie_mobile');
      setShowIdentitySheet(false);
      setShowQuickRosterSheet(false);
    }
  };

  const handlePrimaryFabCheckin = () => {
    setFabMenuOpen(false);
    if (subTab === 'selfie_mobile') {
      setShowIdentitySheet(false);
      setShowGeofenceSheet(false);
      if (capturedPhotoUrl) {
        void handleConfirmCheckin();
      } else {
        handleCaptureSnapshot();
      }
      return;
    }
    if (subTab === 'nfc_tap') {
      if (isNfcScanning) {
        stopNfcScanning();
      } else if (webNfcAvailable && secureNfc) {
        void handleStartWebNfcScan();
      } else if (nfcManualUidInput.trim()) {
        handleProcessNfcCardInput(nfcManualUidInput);
        setNfcManualUidInput('');
      } else if (isRestrictedViewer && ownStudent) {
        handleProcessNfcCardInput(ownStudent.nfcCardUid || ownStudent.studentIdNumber);
      } else {
        setShowQuickRosterSheet(true);
      }
      return;
    }
    if (subTab === 'teacher_proxy') {
      if (matchedProxyStudent) {
        runWithBiometricGuard(() => handleConfirmProxySingleCheckin());
      } else {
        runWithBiometricGuard(() => setShowRapidScanner(true));
      }
      return;
    }
    if (subTab === 'period_checkin') {
      if (isStaffUser) {
        runWithBiometricGuard(() => handleSavePeriodAttendance());
      } else {
        handleStudentSelfPeriodCheckin();
      }
      return;
    }
    setSubTab('selfie_mobile');
  };

  const primaryFabLabel = (() => {
    if (subTab === 'selfie_mobile') {
      if (capturedPhotoUrl) {
        return lang === 'th' ? 'ยืนยันเช็คชื่อ' : 'Confirm';
      }
      return lang === 'th' ? 'ถ่ายเช็คชื่อ' : 'Snap Check-in';
    }
    if (subTab === 'nfc_tap') {
      if (isNfcScanning) return lang === 'th' ? 'หยุดสแกน NFC' : 'Stop NFC';
      if (webNfcAvailable && secureNfc) return lang === 'th' ? 'เริ่มแตะบัตร NFC' : 'Start NFC';
      if (nfcManualUidInput.trim()) return lang === 'th' ? 'เช็คชื่อด้วยบัตร' : 'Tap Card';
      return lang === 'th' ? 'แตะบัตรเช็คชื่อ' : 'Tap NFC';
    }
    if (subTab === 'teacher_proxy') {
      if (matchedProxyStudent) {
        return lang === 'th' ? 'เช็คชื่อคนนี้' : 'Confirm';
      }
      return lang === 'th' ? 'สแกน QR รัว' : 'Rapid Scan';
    }
    if (subTab === 'period_checkin') {
      return isStaffUser
        ? lang === 'th'
          ? 'บันทึกทั้งคาบ'
          : 'Save Period'
        : lang === 'th'
          ? 'เช็คชื่อคาบนี้'
          : 'Check Period';
    }
    return lang === 'th' ? 'ไปเช็คชื่อ' : 'Check-in';
  })();

  const hideFloatingToolbar =
    subTab === 'selfie_mobile' ||
    showRapidScanner ||
    showPeriodQrModal ||
    showGpsAdminModal ||
    showQuickRosterSheet ||
    showIdentitySheet ||
    showGeofenceSheet ||
    Boolean(nfcDrawerMode) ||
    showBiometricUnlockModal ||
    Boolean(checkinSuccessFeedback);

  return (
    <div
      className={`${getModuleTone('mobile_checkin')} ${embeddedMobile ? 'h-full min-h-0 flex flex-col gap-1.5 overflow-hidden w-full max-w-full pb-0' : 'space-y-4 max-w-5xl mx-auto overflow-x-hidden w-full pb-24'}`}
    >
      {/* Top Header (Desktop Only — Mobile merges tabs & actions into 1 compact top bar) */}
      {!embeddedMobile && (
        <div className="space-y-0 border-b border-[var(--color-border)]">
          <div className="pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary-text)] flex items-center justify-center shrink-0">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight text-[var(--color-text-title)] truncate">
                    {showAttendanceAudienceSwitch
                      ? lang === 'th' ? 'เช็คชื่อครู/บุคลากร' : 'Staff Attendance'
                      : lang === 'th' ? 'เช็คชื่อมือถือ & แตะบัตร NFC' : 'Mobile Attendance & NFC'}
                  </h1>
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                    · {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showAttendanceAudienceSwitch && onAttendanceAudienceChange && (
                <AttendanceAudienceSwitch
                  active="staff"
                  lang={lang}
                  onChange={handleAttendanceAudienceChange}
                />
              )}
              <ModuleTourTrigger moduleId="mobile_checkin" lang={lang} />
              {isStaffUser && userPasskey?.protectQuickAttendance && (
                <button
                  type="button"
                  onClick={() => {
                    if (isQuickAttendanceLocked) {
                      void handleBiometricVerify();
                    } else {
                      handleLockQuickAttendanceNow();
                    }
                  }}
                  disabled={biometricBusy}
                  className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shrink-0 ${
                    isQuickAttendanceLocked
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      : 'bg-[var(--color-card)] border-[var(--color-border)] text-emerald-700 dark:text-emerald-400 hover:bg-[var(--color-card-subtle)]'
                  }`}
                  title={
                    isQuickAttendanceLocked
                      ? lang === 'th'
                        ? 'แตะเพื่อปลดล็อกด้วย FaceID / TouchID'
                        : 'Unlock with FaceID / TouchID'
                      : lang === 'th'
                        ? 'แตะเพื่อล็อกเช็คชื่อด่วน'
                        : 'Lock quick attendance'
                  }
                >
                  {isQuickAttendanceLocked ? (
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="tabular-nums">
                    {isQuickAttendanceLocked
                      ? lang === 'th'
                        ? 'ล็อก'
                        : 'Locked'
                      : `${biometricUnlockMinutes}${lang === 'th' ? 'น.' : 'm'}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-9 w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-center transition cursor-pointer"
                title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
                aria-label={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[var(--color-primary-text)]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => runWithBiometricGuard(() => setShowRapidScanner(true))}
                className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                title="สแกน QR / บาร์โค้ดต่อเนื่อง (1 วินาที/คน)"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'สแกน QR รัว' : 'Rapid Scan'}</span>
              </button>
            </div>
          </div>

          <nav
            data-guide-id="mobile-checkin-tabs"
            aria-label="Attendance sub-navigation"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px"
          >
            {[
              { id: 'selfie_mobile', icon: Camera, labelTh: 'เซลฟี่', labelEn: 'Selfie', staffOnly: false },
              { id: 'nfc_tap', icon: Nfc, labelTh: 'แตะ NFC', labelEn: 'NFC', staffOnly: false },
              {
                id: 'leave_request',
                icon: FileText,
                labelTh: 'ใบลา',
                labelEn: 'Leave',
                badge: scopedLeaveRequests.filter((r) => r.status === 'pending').length,
                staffOnly: false,
              },
              { id: 'teacher_proxy', icon: UserCheck, labelTh: 'ลงชื่อแทน', labelEn: 'Proxy', staffOnly: true },
              { id: 'daily_report', icon: ClipboardCheck, labelTh: 'รายงานรายวัน', labelEn: 'Daily report', staffOnly: true },
              { id: 'period_checkin', icon: Users, labelTh: 'รายคาบ', labelEn: 'Periods', staffOnly: false },
              {
                id: 'corrections',
                icon: FileEdit,
                labelTh: 'แก้เวลา/ยืนยัน',
                labelEn: 'Adjust',
                badge: pendingCorrectionCount,
                staffOnly: false,
              },
            ]
              .filter((tab) => {
                if (hideStaffOverviewTabs && isStaffUser && (tab.id === 'daily_report' || tab.id === 'corrections')) {
                  return false;
                }
                return tab.id === 'daily_report'
                  ? canViewDailyReport
                  : isStaffUser || !tab.staffOnly;
              })
              .map((tab) => {
                const isActive = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-active={isActive}
                    onClick={() => {
                      setSubTab(tab.id as AttendanceSubTab);
                      if (tab.id === 'leave_request') setLeaveFormStep(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-[var(--color-primary)] text-[var(--color-text-title)] font-semibold'
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                    }`}
                  >
                    <tab.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--color-primary-text)]' : ''}`} />
                    <span>{lang === 'th' ? tab.labelTh : tab.labelEn}</span>
                    {tab.badge ? (
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${
                          isActive ? 'text-[var(--color-primary-text)]' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        ({tab.badge})
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </nav>
        </div>
      )}

      {/* Mobile Sub-Navigation & Compact Action Buttons (Embedded Mobile Only) */}
      {embeddedMobile && (
        <div className="shrink-0 flex flex-col gap-1.5">
          {showAttendanceAudienceSwitch && onAttendanceAudienceChange && (
            <div className="flex justify-center">
              <AttendanceAudienceSwitch
                active={activeAttendanceAudience}
                lang={lang}
                onChange={handleAttendanceAudienceChange}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-1.5">
          <nav
            data-guide-id="mobile-checkin-tabs"
            aria-label="Attendance sub-navigation"
            className="flex-1 min-w-0 flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] overflow-x-auto no-scrollbar"
          >
            {[
              { id: 'selfie_mobile', icon: Camera, labelTh: 'เซลฟี่', labelEn: 'Selfie', staffOnly: false },
              { id: 'nfc_tap', icon: Nfc, labelTh: 'NFC', labelEn: 'NFC', staffOnly: false },
              {
                id: 'leave_request',
                icon: FileText,
                labelTh: 'ใบลา',
                labelEn: 'Leave',
                badge: scopedLeaveRequests.filter((r) => r.status === 'pending').length,
                staffOnly: false,
              },
              { id: 'teacher_proxy', icon: UserCheck, labelTh: 'ลงแทน', labelEn: 'Proxy', staffOnly: true },
              { id: 'daily_report', icon: ClipboardCheck, labelTh: 'รายงาน', labelEn: 'Daily', staffOnly: true },
              { id: 'period_checkin', icon: Users, labelTh: 'รายคาบ', labelEn: 'Periods', staffOnly: false },
              {
                id: 'corrections',
                icon: FileEdit,
                labelTh: 'แก้เวลา',
                labelEn: 'Adjust',
                badge: pendingCorrectionCount,
                staffOnly: false,
              },
            ]
              .filter((tab) => {
                if (
                  filterTabsByAudience &&
                  showAttendanceAudienceSwitch &&
                  isStaffUser &&
                  !(
                    activeAttendanceAudience === 'students'
                      ? ['teacher_proxy', 'daily_report', 'period_checkin', 'corrections'].includes(tab.id)
                      : ['selfie_mobile', 'nfc_tap', 'leave_request'].includes(tab.id)
                  )
                ) {
                  return false;
                }
                if (hideStaffOverviewTabs && isStaffUser && (tab.id === 'daily_report' || tab.id === 'corrections')) {
                  return false;
                }
                return tab.id === 'daily_report'
                  ? canViewDailyReport
                  : isStaffUser || !tab.staffOnly;
              })
              .map((tab) => {
                const isActive = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-active={isActive}
                    onClick={() => {
                      setSubTab(tab.id as AttendanceSubTab);
                      if (tab.id === 'leave_request') setLeaveFormStep(1);
                    }}
                    className={`inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[11px] whitespace-nowrap shrink-0 cursor-pointer transition active:scale-[0.97] ${
                      isActive
                        ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] font-bold border border-[var(--color-border)] shadow-2xs'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium border border-transparent'
                    }`}
                  >
                    <tab.icon className="w-3 h-3 shrink-0" />
                    <span>{lang === 'th' ? tab.labelTh : tab.labelEn}</span>
                    {tab.badge ? (
                      <span
                        className={`text-[10px] font-bold tabular-nums ${
                          isActive ? 'text-[var(--color-primary-text)]' : 'text-amber-600 dark:text-amber-300'
                        }`}
                      >
                        ({tab.badge})
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </nav>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 shadow-2xs"
            title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            aria-label={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[var(--tone)]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            )}
          </button>

          {isStaffUser && userPasskey?.protectQuickAttendance && (
            <button
              type="button"
              onClick={() => {
                if (isQuickAttendanceLocked) {
                  void handleBiometricVerify();
                } else {
                  handleLockQuickAttendanceNow();
                }
              }}
              disabled={biometricBusy}
              className={`h-8 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0 shadow-2xs ${
                isQuickAttendanceLocked
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-[var(--color-card)] border-[var(--color-border)] text-emerald-700 dark:text-emerald-400'
              }`}
              title={
                isQuickAttendanceLocked
                  ? lang === 'th'
                    ? 'แตะเพื่อปลดล็อกด้วย FaceID / TouchID'
                    : 'Unlock with FaceID / TouchID'
                  : lang === 'th'
                    ? 'แตะเพื่อล็อกเช็คชื่อด่วน'
                    : 'Lock quick attendance'
              }
            >
              {isQuickAttendanceLocked ? (
                <Lock className="w-3 h-3 shrink-0" />
              ) : (
                <Fingerprint className="w-3 h-3 shrink-0" />
              )}
              <span className="tabular-nums">
                {isQuickAttendanceLocked
                  ? lang === 'th'
                    ? 'ล็อก'
                    : 'Locked'
                  : `${biometricUnlockMinutes}${lang === 'th' ? 'น.' : 'm'}`}
              </span>
            </button>
          )}
          </div>
        </div>
      )}

      {/* Slim Biometric Status / Lock Bar */}
      {isStaffUser &&
        (biometricNotice ||
          biometricError ||
          (isQuickAttendanceLocked &&
            (subTab === 'nfc_tap' || subTab === 'teacher_proxy' || subTab === 'period_checkin'))) && (
          <div className="shrink-0 space-y-1.5">
            {biometricNotice && (
              <div
                role="status"
                className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{biometricNotice}</span>
              </div>
            )}
            {biometricError && (
              <div
                role="alert"
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{biometricError}</span>
              </div>
            )}

            {isQuickAttendanceLocked &&
              (subTab === 'nfc_tap' || subTab === 'teacher_proxy' || subTab === 'period_checkin') && (
                <div className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span className="font-semibold text-amber-950 dark:text-amber-100 truncate">
                      {lang === 'th' ? 'ล็อกเช็คชื่อด่วนด้วยไบโอเมตริกซ์' : 'Quick Attendance Locked'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={biometricBusy}
                    onClick={handleBiometricVerify}
                    className="min-h-[40px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{biometricBusy ? '...' : lang === 'th' ? 'ปลดล็อก' : 'Unlock'}</span>
                  </button>
                </div>
              )}
          </div>
        )}

      {/* Compact Single-Line Context Bar for Mobile Selfie (clearly clickable bordered buttons) */}
      {embeddedMobile && subTab === 'selfie_mobile' && !isSimpleStaffCheckin && (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowIdentitySheet(true)}
            className="h-8 flex-1 min-w-0 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center gap-1 text-left cursor-pointer transition active:scale-[0.98] shadow-2xs"
          >
            <User className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
            <span className="text-[11px] font-semibold text-[var(--color-text-title)] truncate">
              {activePersonName}
            </span>
            <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] shrink-0 ml-auto" />
          </button>

          <button
            type="button"
            onClick={() => setShowGeofenceSheet(true)}
            className="h-8 flex-1 min-w-0 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center gap-1 text-left cursor-pointer transition active:scale-[0.98] shadow-2xs"
          >
            <MapPin
              className={`w-3 h-3 shrink-0 ${
                !hasSchoolGpsConfigured || isGpsLoading
                  ? 'text-amber-600 dark:text-amber-400'
                  : isInGeofence
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
              }`}
            />
            <span
              className={`text-[11px] font-semibold tabular-nums truncate ${
                !hasSchoolGpsConfigured || isGpsLoading
                  ? 'text-amber-700 dark:text-amber-300'
                  : isInGeofence
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {gpsStatusShortLabel}
            </span>
            <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] shrink-0 ml-auto" />
          </button>

          {isStaffUser && (
            <button
              type="button"
              onClick={() => setShowQuickRosterSheet(true)}
              className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary-text)] cursor-pointer transition active:scale-[0.98] shrink-0 shadow-2xs"
              title={lang === 'th' ? 'เปิดรายชื่อนักเรียน' : 'Open Student Roster'}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>{lang === 'th' ? 'รายชื่อ' : 'Roster'}</span>
            </button>
          )}
        </div>
      )}

      {/* TAB 1: SELFIE CHECK-IN/OUT */}
      {subTab === 'selfie_mobile' && (
        <SelfieAttendanceTab
          embeddedMobile={embeddedMobile}
          simpleStaffCheckin={isSimpleStaffCheckin}
          lang={lang}
          checkType={checkType}
          setCheckType={setCheckType}
          normalizedGates={normalizedGates}
          selectedGate={selectedGate}
          setSelectedGateId={setSelectedGateId}
          videoRef={videoRef}
          facingMode={facingMode}
          facingModeRef={facingModeRef}
          capturedPhotoUrl={capturedPhotoUrl}
          setCapturedPhotoUrl={setCapturedPhotoUrl}
          handleRefreshGps={handleRefreshGps}
          isGpsLoading={isGpsLoading}
          isFlashActive={isFlashActive}
          hasSchoolGpsConfigured={hasSchoolGpsConfigured}
          currentGpsDistance={currentGpsDistance}
          isInGeofence={isInGeofence}
          gpsStatusShortLabel={gpsStatusShortLabel}
          cameraNotice={cameraNotice}
          cameraError={cameraError}
          startCamera={startCamera}
          handleCaptureSnapshot={handleCaptureSnapshot}
          isCameraActive={isCameraActive}
          isSavingAttendance={isSavingAttendance}
          handleConfirmCheckin={handleConfirmCheckin}
          gpsError={gpsError}
          selfieActionError={selfieActionError}
          isCameraSwitching={isCameraSwitching}
          isCapturing={isCapturing}
          handleToggleFacingMode={handleToggleFacingMode}
          availableCameras={availableCameras}
          activeCameraId={activeCameraId}
          isSelfCheckin={isSelfCheckin}
          activePersonName={activePersonName}
          activePersonRole={activePersonRole}
          activePersonId={activePersonId}
          activePersonDefaultAvatar={activePersonDefaultAvatar}
          activeDepartmentOrRoom={activeDepartmentOrRoom}
          isRestrictedViewer={isRestrictedViewer}
          currentUser={currentUser}
          loggedInUserName={loggedInProfile.userName}
          setAttendanceMode={setAttendanceMode}
          effectiveUserType={effectiveUserType}
          setActiveUserType={setActiveUserType}
          selectedStudentId={selectedStudentId}
          setSelectedStudentId={setSelectedStudentId}
          selectedTeacherId={selectedTeacherId}
          setSelectedTeacherId={setSelectedTeacherId}
          scopedStudents={scopedStudents}
          teachers={teachers}
          isSchoolAdmin={isSchoolAdmin}
          setShowGpsAdminModal={setShowGpsAdminModal}
          selfieFilterId={selfieFilterId}
          setSelfieFilterId={setSelfieFilterId}
          selfieEffectId={selfieEffectId}
          setSelfieEffectId={setSelfieEffectId}
          selfieFrameId={selfieFrameId}
          setSelfieFrameId={setSelfieFrameId}
          placedStickers={placedStickers}
          setPlacedStickers={setPlacedStickers}
          selfieTimerSeconds={selfieTimerSeconds}
          setSelfieTimerSeconds={setSelfieTimerSeconds}
          selfieCountdown={selfieCountdown}
        />
      )}

      {subTab === 'daily_report' && canViewDailyReport && (
        <DailyAttendanceReportTab
          date={dailyReportDate}
          setDate={setDailyReportDate}
          gateRows={gateDailyReportRows}
          periodSessions={dailyPeriodReportSessions}
          lang={lang}
          holidayLabel={dailyReportHoliday?.isSchoolDayOff
            ? (lang === 'th' ? dailyReportHoliday.nameTh : dailyReportHoliday.nameEn)
            : null}
          onEditGateRecord={handleOpenDailyGateEdit}
          onEditPeriodRecord={handleOpenDailyPeriodEdit}
        />
      )}

      {/* TAB 2: ONLINE LEAVE REQUEST */}
      {subTab === 'leave_request' && (
        <LeaveRequestTab
          embeddedMobile={embeddedMobile}
          activeSchoolId={activeSchoolId}
          currentUser={currentUser}
          students={students}
          teachers={teachers}
          courses={courses}
          fallbackCourse={fallbackCourse}
          ownStudent={ownStudent}
          selectedStudent={selectedStudent}
          selectedTeacher={selectedTeacher}
          isSelfCheckin={isSelfCheckin}
          isRestrictedViewer={isRestrictedViewer}
          isSchoolAdmin={isSchoolAdmin}
          loggedInUserType={loggedInProfile.userType}
          effectiveUserType={effectiveUserType}
          setActiveUserType={setActiveUserType}
          activePersonName={activePersonName}
          activePersonRole={activePersonRole}
          leaveFormStep={leaveFormStep}
          setLeaveFormStep={setLeaveFormStep}
          leaveSuccessNotice={leaveSuccessNotice}
          leaveErrorNotice={leaveErrorNotice}
          handleSubmitLeave={handleSubmitLeave}
          leaveScope={leaveScope}
          setLeaveScope={setLeaveScope}
          leavePeriodNum={leavePeriodNum}
          setLeavePeriodNum={setLeavePeriodNum}
          periodsList={periodsList}
          courseTeacherOptions={courseTeacherOptions}
          leaveTeacherFilter={leaveTeacherFilter}
          setLeaveTeacherFilter={setLeaveTeacherFilter}
          leaveCourseId={leaveCourseId}
          setLeaveCourseId={setLeaveCourseId}
          leaveFilteredCourses={leaveFilteredCourses}
          leaveSubstituteTeacherId={leaveSubstituteTeacherId}
          setLeaveSubstituteTeacherId={setLeaveSubstituteTeacherId}
          leaveCcRoles={leaveCcRoles}
          setLeaveCcRoles={setLeaveCcRoles}
          leaveMissionNumber={leaveMissionNumber}
          setLeaveMissionNumber={setLeaveMissionNumber}
          leaveType={leaveType}
          setLeaveType={setLeaveType}
          leaveStartDate={leaveStartDate}
          setLeaveStartDate={setLeaveStartDate}
          leaveEndDate={leaveEndDate}
          setLeaveEndDate={setLeaveEndDate}
          leaveReason={leaveReason}
          setLeaveReason={setLeaveReason}
          leaveAttachmentUrl={leaveAttachmentUrl}
          setLeaveAttachmentUrl={setLeaveAttachmentUrl}
          scopedLeaveRequests={scopedLeaveRequests}
          onUpdateLeaveStatus={onUpdateLeaveStatus}
        />
      )}

      {/* TAB 2B: NFC SCHOOL ID CARD TAP */}
      {subTab === 'nfc_tap' && (
        <NfcTapAttendanceTab
          embeddedMobile={embeddedMobile}
          lang={lang}
          activeSchoolId={activeSchoolId}
          isStaffUser={isStaffUser}
          isRestrictedViewer={isRestrictedViewer}
          ownStudent={ownStudent}
          students={effectiveRole === 'teacher' ? gateRosterStudents : students}
          teachers={teachers}
          isNfcScanning={isNfcScanning}
          webNfcAvailable={webNfcAvailable}
          secureNfc={secureNfc}
          nfcCheckType={nfcCheckType}
          setNfcCheckType={setNfcCheckType}
          normalizedGates={normalizedGates}
          selectedGate={selectedGate}
          setSelectedGateId={setSelectedGateId}
          nfcStatusMode={nfcStatusMode}
          setNfcStatusMode={setNfcStatusMode}
          stopNfcScanning={stopNfcScanning}
          handleStartWebNfcScan={handleStartWebNfcScan}
          handleProcessNfcCardInput={handleProcessNfcCardInput}
          nfcStatusMessage={nfcStatusMessage}
          nfcErrorMessage={nfcErrorMessage}
          nfcManualUidInput={nfcManualUidInput}
          setNfcManualUidInput={setNfcManualUidInput}
          unregisteredNfcTag={unregisteredNfcTag}
          setUnregisteredNfcTag={setUnregisteredNfcTag}
          bindTargetType={bindTargetType}
          setBindTargetType={setBindTargetType}
          bindTargetId={bindTargetId}
          setBindTargetId={setBindTargetId}
          handleBindUnregisteredNfcCard={handleBindUnregisteredNfcCard}
          nfcBindings={nfcBindings}
          setNfcBindings={setNfcBindings}
          nfcRecentLogs={nfcRecentLogs}
          setNfcDrawerMode={setNfcDrawerMode}
        />
      )}

      {/* TAB 3: TEACHER PROXY CHECK-IN */}
      {subTab === 'teacher_proxy' && isStaffUser && (
        <TeacherProxyTab
          embeddedMobile={embeddedMobile}
          students={gateRosterStudents}
          proxyShowRosterHint={proxyShowRosterHint}
          setProxyShowRosterHint={setProxyShowRosterHint}
          proxySavedNotification={proxySavedNotification}
          proxyStudentIdInput={proxyStudentIdInput}
          setProxyStudentIdInput={setProxyStudentIdInput}
          proxyDate={proxyDate}
          setProxyDate={setProxyDate}
          proxyTime={proxyTime}
          setProxyTime={setProxyTime}
          trimmedProxyStudentId={trimmedProxyStudentId}
          matchedProxyStudent={matchedProxyStudent}
          proxyCheckType={proxyCheckType}
          setProxyCheckType={setProxyCheckType}
          proxySingleStatus={proxySingleStatus}
          setProxySingleStatus={setProxySingleStatus}
          runWithBiometricGuard={runWithBiometricGuard}
          handleConfirmProxySingleCheckin={handleConfirmProxySingleCheckin}
          filteredProxyStudents={filteredProxyStudents}
          proxySearch={proxySearch}
          setProxySearch={setProxySearch}
          proxyRoomFilter={proxyRoomFilter}
          setProxyRoomFilter={setProxyRoomFilter}
          onEditStudent={handlePrepareProxyStudentEdit}
        />
      )}

      {/* TAB 4: PERIOD ATTENDANCE (รายคาบ) */}
      {subTab === 'period_checkin' && (
        <PeriodCheckinTab
          embeddedMobile={embeddedMobile}
          isRestrictedViewer={isRestrictedViewer}
          isStaffUser={isStaffUser}
          isTeacher={effectiveRole === 'teacher'}
          students={students}
          courses={courses}
          fallbackCourse={fallbackCourse}
          courseTeacherOptions={courseTeacherOptions}
          periodTeacherFilter={periodTeacherFilter}
          setPeriodTeacherFilter={setPeriodTeacherFilter}
          periodFilteredCourses={periodFilteredCourses}
          selectedCourse={selectedCourse}
          selectedCourseId={selectedCourseId}
          setSelectedCourseId={setSelectedCourseId}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          periodsList={periodsList}
          periodDate={periodDate}
          setPeriodDate={setPeriodDate}
          periodStudentIds={periodStudentIds}
          runWithBiometricGuard={runWithBiometricGuard}
          handleSavePeriodAttendance={handleSavePeriodAttendance}
          periodSavedNotification={periodSavedNotification}
          classroomGps={classroomGps}
          roomLatInput={roomLatInput}
          setRoomLatInput={setRoomLatInput}
          roomLngInput={roomLngInput}
          setRoomLngInput={setRoomLngInput}
          roomRadiusInput={roomRadiusInput}
          setRoomRadiusInput={setRoomRadiusInput}
          isLocatingRoom={isLocatingRoom}
          handleDetectRoomGps={handleDetectRoomGps}
          handleSaveManualRoomGps={handleSaveManualRoomGps}
          roomGpsNotice={roomGpsNotice}
          periodCheckinUrl={periodCheckinUrl}
          expectedPeriodCode={expectedPeriodCode}
          setShowPeriodQrModal={setShowPeriodQrModal}
          showPeriodQrModal={showPeriodQrModal}
          handleCopyPeriodLink={handleCopyPeriodLink}
          periodQrCopied={periodQrCopied}
          periodAttendance={periodAttendance}
          scopedPeriodAttendance={visiblePeriodAttendance}
          selectedStudent={selectedStudent}
          periodCheckType={periodCheckType}
          setPeriodCheckType={setPeriodCheckType}
          selectedPeriodTimeActivity={selectedPeriodTimeActivity}
          selectedPeriodMeta={selectedPeriodMeta}
          realGpsCoords={realGpsCoords}
          setRealGpsCoords={setRealGpsCoords}
          isGpsLoading={isGpsLoading}
          setIsGpsLoading={setIsGpsLoading}
          handleStudentSelfPeriodCheckin={handleStudentSelfPeriodCheckin}
          studentPeriodCodeInput={studentPeriodCodeInput}
          setStudentPeriodCodeInput={setStudentPeriodCodeInput}
          studentPeriodCheckinMsg={studentPeriodCheckinMsg}
          studentPeriodCheckinError={studentPeriodCheckinError}
          periodRosterFilter={periodRosterFilter}
          setPeriodRosterFilter={setPeriodRosterFilter}
          periodRosterSearch={periodRosterSearch}
          setPeriodRosterSearch={setPeriodRosterSearch}
          periodRosterRoomFilter={periodRosterRoomFilter}
          setPeriodRosterRoomFilter={setPeriodRosterRoomFilter}
          periodStatuses={periodStatuses}
          handleTeacherProxyPeriodCheckin={handleTeacherProxyPeriodCheckin}
          periodFlexConfig={periodFlexConfig}
          onUpdatePeriodFlexConfig={handleUpdatePeriodFlexConfig}
          periodCustomTimes={periodCustomTimes}
          onSetStudentPeriodCustomTime={handleSetStudentPeriodCustomTime}
          onOpenPeriodCorrection={({ targetScope, issueType, originalTime }) => {
            setCorrectionPrefill({
              targetScope,
              issueType,
              courseId: selectedCourse.id,
              periodNumber: selectedPeriod,
              date: periodDate,
              originalTime,
              requesterId: selectedStudent?.id || ownStudent?.id,
            });
            setSubTab('corrections');
          }}
        />
      )}

      {/* TAB 5: HOMEROOM CONFIRMATION & HIERARCHICAL TIME CORRECTIONS */}
      {subTab === 'corrections' && (
        <div className={embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}>
          <AttendanceCorrectionHub
            schoolId={activeSchoolId}
            currentUser={currentUser}
            currentRole={effectiveRole}
            students={students}
            teachers={teachers}
            courses={courses}
            attendance={attendance}
            periodAttendance={periodAttendance}
            onRecordAttendance={onRecordAttendance}
            onRecordPeriodAttendance={onRecordPeriodAttendance}
            prefillSeed={correctionPrefill}
            onClearPrefill={() => setCorrectionPrefill(null)}
            showHomeroomMissingConfirm={isStaffUser}
            embeddedMobile={embeddedMobile}
          />
        </div>
      )}

      {/* MODALS, SHEETS & FLOATING ACTION TOOLBAR */}
      <AttendanceModalsAndSheets
        embeddedMobile={embeddedMobile}
        lang={lang}
        activeSchoolId={activeSchoolId}
        currentUser={currentUser}
        school={_school}
        campusGates={campusGates}
        effectiveRole={effectiveRole}
        isSchoolAdmin={isSchoolAdmin}
        isStaffUser={isStaffUser}
        isRestrictedViewer={isRestrictedViewer}
        students={effectiveRole === 'teacher' ? gateRosterStudents : students}
        teachers={teachers}
        scopedStudents={quickRosterStudents}
        subTab={subTab}
        setSubTab={setSubTab}
        setLeaveFormStep={setLeaveFormStep}
        onRecordAttendance={onRecordAttendance}
        checkinSuccessFeedback={checkinSuccessFeedback}
        setCheckinSuccessFeedback={setCheckinSuccessFeedback}
        showLineFlexPreview={showLineFlexPreview}
        setShowLineFlexPreview={setShowLineFlexPreview}
        showRapidScanner={showRapidScanner}
        setShowRapidScanner={setShowRapidScanner}
        showGpsAdminModal={showGpsAdminModal}
        setShowGpsAdminModal={setShowGpsAdminModal}
        onUpdateCampusGates={onUpdateCampusGates}
        onSaveCampusGates={onSaveCampusGates}
        onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
        hideFloatingToolbar={hideFloatingToolbar}
        fabMenuOpen={fabMenuOpen}
        setFabMenuOpen={setFabMenuOpen}
        runWithBiometricGuard={runWithBiometricGuard}
        setShowQuickRosterSheet={setShowQuickRosterSheet}
        handlePrimaryFabCheckin={handlePrimaryFabCheckin}
        isSavingAttendance={isSavingAttendance}
        capturedPhotoUrl={capturedPhotoUrl}
        matchedProxyStudent={matchedProxyStudent}
        primaryFabLabel={primaryFabLabel}
        showQuickRosterSheet={showQuickRosterSheet}
        rosterTodayStats={rosterTodayStats}
        rosterToast={rosterToast}
        rosterSheetQuery={rosterSheetQuery}
        setRosterSheetQuery={setRosterSheetQuery}
        rosterGradeOptions={rosterGradeOptions}
        rosterSheetGradeFilter={rosterSheetGradeFilter}
        setRosterSheetGradeFilter={setRosterSheetGradeFilter}
        filteredRosterStudents={filteredRosterStudents}
        todayAttendanceByStudent={todayAttendanceByStudent}
        handleQuickRosterCheckin={handleQuickRosterCheckin}
        handleSelectRosterStudentForCurrentTab={handleSelectRosterStudentForCurrentTab}
        showIdentitySheet={showIdentitySheet}
        setShowIdentitySheet={setShowIdentitySheet}
        activePersonName={activePersonName}
        activePersonRole={activePersonRole}
        activePersonId={activePersonId}
        activePersonDefaultAvatar={activePersonDefaultAvatar}
        isSelfCheckin={isSelfCheckin}
        setAttendanceMode={setAttendanceMode}
        effectiveUserType={effectiveUserType}
        setActiveUserType={setActiveUserType}
        selectedStudentId={selectedStudentId}
        setSelectedStudentId={setSelectedStudentId}
        selectedTeacherId={selectedTeacherId}
        setSelectedTeacherId={setSelectedTeacherId}
        showGeofenceSheet={showGeofenceSheet}
        setShowGeofenceSheet={setShowGeofenceSheet}
        normalizedGates={normalizedGates}
        selectedGate={selectedGate}
        setSelectedGateId={setSelectedGateId}
        gpsStatusShortLabel={gpsStatusShortLabel}
        handleRefreshGps={handleRefreshGps}
        isGpsLoading={isGpsLoading}
        gpsError={gpsError}
        nfcDrawerMode={nfcDrawerMode}
        setNfcDrawerMode={setNfcDrawerMode}
        nfcBindings={nfcBindings}
        setNfcBindings={setNfcBindings}
        nfcRecentLogs={nfcRecentLogs}
        handleProcessNfcCardInput={handleProcessNfcCardInput}
        showBiometricUnlockModal={showBiometricUnlockModal}
        userPasskey={userPasskey}
        biometricError={biometricError}
        biometricBusy={biometricBusy}
        handleBiometricVerify={handleBiometricVerify}
        handleCancelBiometricModal={handleCancelBiometricModal}
      />
    </div>
  );
};
