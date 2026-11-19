import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Smartphone, 
  UserCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Users, 
  User,
  Check, 
  Camera,
  SwitchCamera,
  RefreshCw,
  LogIn,
  LogOut,
  Sparkles,
  Navigation,
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  FileText,
  Send,
  Upload,
  Calendar,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  QrCode,
  Copy,
  Link2,
  ScanLine,
  Maximize2,
  Search,
  Plus,
  Nfc,
  Fingerprint,
  Lock,
  CreditCard,
  Trash2,
  Settings,
  Building2,
  Briefcase,
  HeartPulse,
  LocateFixed,
  SmartphoneOff
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { getBangkokClockSnapshot } from '../lib/timetableCalendar';
import {
  loadSavedPeriodQrSessions,
  validatePeriodQrTokenState,
} from '../lib/periodQrTokens';
import {
  filterLeaveRequestsForUser,
  filterPeriodAttendanceForUser,
  getAllowedStudentScope,
  isRestrictedAttendanceViewer,
  resolveOwnStudent,
  resolveOwnTeacher,
  resolveCurrentUserAttendanceProfile,
} from '../lib/attendanceScope';
import { QrCodeMatrix } from '../components/QrCodeMatrix';
import { 
  Student, 
  Teacher,
  Course, 
  AttendanceRecord, 
  PeriodAttendanceRecord, 
  AttendanceStatus, 
  AuthUser, 
  AppLanguage,
  School,
  AttendanceCheckType,
  AttendanceUserType,
  CampusGateGeofence,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  SchoolPeriodTime,
  UserRole,
  ClassroomGpsConfig
} from '../types';
import { PagedList } from '../components/PagedList';
import { ContinuousRapidScannerModal } from '../components/modals/ContinuousRapidScannerModal';
import { SchoolGpsSettingsCard } from '../components/SchoolGpsSettingsCard';
import { MobileBottomSheet } from '../components/layout/MobileRoleWorkspace';
import { saveStudentSelfAttendance } from '../lib/supabase';
import { sendEduVerseNotification } from '../lib/pushNotifications';
import { getModuleTone } from '../lib/moduleTheme';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';
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
import {
  detectTeacherApprovalRoleForLeave,
  enrichLeaveRequestForDualApproval,
  resolveStudentLeaveApprovers,
  type LeaveApprovalScope,
} from '../lib/leaveApprovalRouting';
import {
  formatNfcUidDisplay,
  getNdefReaderConstructor,
  isSecureNfcContext,
  isWebNfcSupported,
  loadNfcBindings,
  parseNfcReadingEvent,
  removeNfcBinding,
  resolveNfcTap,
  saveNfcBinding,
  type NfcCardBinding,
  type WebNdefReadingEvent,
} from '../lib/nfcAttendance';
import {
  clearBiometricSessionUnlock,
  enrollBiometricPasskey,
  getBiometricUnlockRemainingMinutes,
  getPasskeyForUser,
  getWebAuthnSupportInfo,
  isBiometricSessionUnlocked,
  type EnrolledBiometricPasskey,
  type WebAuthnSupportInfo,
  verifyBiometricPasskey,
} from '../lib/webAuthn';

interface MobileAttendanceViewProps {
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  currentUser: AuthUser | null;
  school?: School;
  campusGates?: CampusGateGeofence[];
  leaveRequests?: LeaveRequest[];
  lang: AppLanguage;
  onRecordAttendance: (
    studentId: string,
    status: AttendanceStatus,
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: AttendanceUserType;
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userAvatar?: string;
      userDepartmentOrRoom?: string;
      date?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddLeaveRequest?: (req: LeaveRequest) => void;
  onUpdateLeaveStatus?: (reqId: string, status: LeaveStatus, remarks?: string, scope?: LeaveApprovalScope) => void;
  initialSubTab?: 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  embeddedMobile?: boolean;
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
  initialPeriodCheckType?: 'check_in' | 'check_out';
  initialPeriodExpiresAt?: number;
  initialPeriodToken?: string;
  currentRole?: UserRole;
  schoolPeriods?: SchoolPeriodTime[];
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
}

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
  schoolPeriods = [],
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
}) => {
  const effectiveRole: UserRole = currentUser?.role || currentRole || 'student';
  const isSchoolAdmin = effectiveRole === 'admin' || effectiveRole === 'super_admin';
  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const isStudentOnly = effectiveRole === 'student';
  const isStaffUser = !isRestrictedViewer;
  const studentScope = getAllowedStudentScope(currentUser, students);
  const ownStudent = resolveOwnStudent(currentUser, students);
  const ownTeacher = resolveOwnTeacher(currentUser, teachers);
  const scopedStudents = isRestrictedViewer ? studentScope.allowedStudents : students;
  const scopedLeaveRequests = filterLeaveRequestsForUser(leaveRequests, currentUser, students);
  const scopedPeriodAttendance = filterPeriodAttendanceForUser(periodAttendance, currentUser, students);

  const safeInitialSubTab =
    !isStaffUser && initialSubTab === 'teacher_proxy' ? 'selfie_mobile' : initialSubTab;

  const [subTab, setSubTab] = useState<'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin'>(
    safeInitialSubTab
  );
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

  // -------------------------------------------------------------
  // BIOMETRIC (WebAuthn / FaceID / TouchID) QUICK-ACTION GUARD
  // -------------------------------------------------------------
  const [userPasskey, setUserPasskey] = useState<EnrolledBiometricPasskey | null>(() =>
    getPasskeyForUser(currentUser?.id)
  );
  const [webAuthnSupport, setWebAuthnSupport] = useState<WebAuthnSupportInfo | null>(null);
  const [biometricUnlocked, setBiometricUnlocked] = useState<boolean>(() => {
    const pk = getPasskeyForUser(currentUser?.id);
    if (!pk || !pk.protectQuickAttendance) return true;
    return isBiometricSessionUnlocked(currentUser?.id);
  });
  const [biometricUnlockMinutes, setBiometricUnlockMinutes] = useState<number>(() =>
    getBiometricUnlockRemainingMinutes(currentUser?.id)
  );
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [biometricNotice, setBiometricNotice] = useState<string | null>(null);
  const [showBiometricUnlockModal, setShowBiometricUnlockModal] = useState(false);
  const pendingBiometricActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getWebAuthnSupportInfo().then(setWebAuthnSupport).catch(() => {});
  }, []);

  useEffect(() => {
    const pk = getPasskeyForUser(currentUser?.id);
    setUserPasskey(pk);
    const unlocked = !isStaffUser || !pk || !pk.protectQuickAttendance || isBiometricSessionUnlocked(currentUser?.id);
    setBiometricUnlocked(unlocked);
    setBiometricUnlockMinutes(getBiometricUnlockRemainingMinutes(currentUser?.id));
  }, [currentUser?.id, isStaffUser]);

  useEffect(() => {
    if (!userPasskey?.protectQuickAttendance || !isStaffUser) return;
    const timer = window.setInterval(() => {
      const mins = getBiometricUnlockRemainingMinutes(currentUser?.id);
      setBiometricUnlockMinutes(mins);
      if (mins <= 0) {
        setBiometricUnlocked(false);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id, userPasskey?.protectQuickAttendance, isStaffUser]);

  const isQuickAttendanceLocked =
    isStaffUser && Boolean(userPasskey?.protectQuickAttendance) && !biometricUnlocked;

  const runWithBiometricGuard = (action: () => void) => {
    if (!isQuickAttendanceLocked) {
      action();
      return;
    }
    setBiometricError(null);
    pendingBiometricActionRef.current = action;
    setShowBiometricUnlockModal(true);
  };

  const handleBiometricVerify = async () => {
    if (!currentUser) return;
    setBiometricBusy(true);
    setBiometricError(null);
    try {
      const res = await verifyBiometricPasskey({ userId: currentUser.id });
      setUserPasskey(res.passkey);
      setBiometricUnlocked(true);
      setBiometricUnlockMinutes(getBiometricUnlockRemainingMinutes(currentUser.id) || 15);
      setShowBiometricUnlockModal(false);
      setBiometricNotice(
        lang === 'th'
          ? 'ยืนยันตัวตน FaceID / TouchID สำเร็จ (ปลดล็อก 15 นาที)'
          : 'Biometric verification succeeded (unlocked for 15 min)'
      );
      window.setTimeout(() => setBiometricNotice(null), 4000);
      const pending = pendingBiometricActionRef.current;
      pendingBiometricActionRef.current = null;
      if (pending) pending();
    } catch (err) {
      setBiometricError(err instanceof Error ? err.message : String(err));
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleEnrollQuickBiometric = async () => {
    if (!currentUser) return;
    setBiometricBusy(true);
    setBiometricError(null);
    try {
      const enrolled = await enrollBiometricPasskey({
        userId: currentUser.id,
        email: currentUser.email,
        fullNameTh: currentUser.fullNameTh,
        fullNameEn: currentUser.fullNameEn,
        role: currentUser.role,
        schoolId: activeSchoolId,
        protectQuickAttendance: isStaffUser,
      });
      setUserPasskey(enrolled);
      setBiometricUnlocked(true);
      setBiometricUnlockMinutes(15);
      setBiometricNotice(
        lang === 'th'
          ? `เปิดใช้งาน ${enrolled.deviceLabel} สำหรับเช็คชื่อด่วนแล้ว`
          : `Enrolled ${enrolled.deviceLabel} for quick attendance`
      );
      window.setTimeout(() => setBiometricNotice(null), 4500);
    } catch (err) {
      setBiometricError(err instanceof Error ? err.message : String(err));
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleLockQuickAttendanceNow = () => {
    if (!currentUser) return;
    clearBiometricSessionUnlock(currentUser.id);
    setBiometricUnlocked(false);
    setBiometricUnlockMinutes(0);
    setBiometricNotice(
      lang === 'th' ? 'ล็อกโมดูลเช็คชื่อด่วนด้วยไบโอเมตริกซ์แล้ว' : 'Quick attendance locked'
    );
    window.setTimeout(() => setBiometricNotice(null), 3000);
  };

  // -------------------------------------------------------------
  // NFC ATTENDANCE TAP STATE (Web NFC NDEFReader + UID Fallback)
  // -------------------------------------------------------------
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
  const [bindTargetId, setBindTargetId] = useState<string>(students[0]?.id || teachers[0]?.id || '');
  const [nfcRecentLogs, setNfcRecentLogs] = useState<
    Array<{
      id: string;
      uid: string;
      name: string;
      roleLabel: string;
      userType: AttendanceUserType;
      checkType: AttendanceCheckType;
      status: AttendanceStatus;
      time: string;
      gateName: string;
    }>
  >([]);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const nfcLastTapRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  useEffect(() => {
    setNfcBindings(loadNfcBindings(activeSchoolId));
  }, [activeSchoolId]);

  useEffect(() => {
    if (bindTargetType === 'student') {
      if (!students.some((s) => s.id === bindTargetId)) {
        setBindTargetId(students[0]?.id || '');
      }
    } else {
      if (!teachers.some((t) => t.id === bindTargetId)) {
        setBindTargetId(teachers[0]?.id || '');
      }
    }
  }, [bindTargetType, bindTargetId, students, teachers]);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(!isStaffUser && initialSubTab === 'teacher_proxy' ? 'selfie_mobile' : initialSubTab);
    }
  }, [initialSubTab, isStaffUser]);

  // -------------------------------------------------------------
  // 1. MOBILE SELFIE CHECK-IN/OUT & MULTI-GATE STATE
  // -------------------------------------------------------------
  const loggedInProfile = resolveCurrentUserAttendanceProfile(currentUser, teachers, students);

  // 'self': Check in as the logged-in user (admin/teacher/student/parent)
  // 'proxy': Staff/duty teacher proxy mode checking in for students or other personnel
  const [attendanceMode, setAttendanceMode] = useState<'self' | 'proxy'>('self');

  const [activeUserType, setActiveUserType] = useState<AttendanceUserType>(
    currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' ? 'teacher' : 'student'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    ownStudent?.id || scopedStudents[0]?.id || (isRestrictedViewer ? '' : students[0]?.id || '')
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
    }
  }, [isRestrictedViewer, currentUser?.role, ownStudent, ownTeacher, scopedStudents, selectedStudentId]);

  // Real school-configured GPS gates ONLY (never fallback to sample/hardcoded coordinates)
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Success Feedback state & LINE Flex Message Preview
  const [checkinSuccessFeedback, setCheckinSuccessFeedback] = useState<{
    userName: string;
    userRole: string;
    checkType: AttendanceCheckType;
    time: string;
    distance: number;
    photoUrl: string;
    gateName: string;
  } | null>(null);
  const [showLineFlexPreview, setShowLineFlexPreview] = useState(false);

  // -------------------------------------------------------------
  // 2. ONLINE LEAVE REQUEST STATE
  // -------------------------------------------------------------
  const [leaveType, setLeaveType] = useState<LeaveType>('sick');
  const [leaveStartDate, setLeaveStartDate] = useState(getLocalDateString());
  const [leaveEndDate, setLeaveEndDate] = useState(getLocalDateString());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState('');
  const [leaveSuccessNotice, setLeaveSuccessNotice] = useState<string | null>(null);
  const [leaveErrorNotice, setLeaveErrorNotice] = useState<string | null>(null);
  const [leaveFormStep, setLeaveFormStep] = useState<1 | 2>(1);

  // -------------------------------------------------------------
  // 3. TEACHER PROXY & PERIOD CHECKIN STATE
  // -------------------------------------------------------------
  const [proxyStudentIdInput, setProxyStudentIdInput] = useState<string>('');
  const [proxyCheckType, setProxyCheckType] = useState<AttendanceCheckType>('check_in');
  const [proxySingleStatus, setProxySingleStatus] = useState<AttendanceStatus>('present');
  const [proxyShowRosterHint, setProxyShowRosterHint] = useState<boolean>(false);
  const [proxyGradeFilter, setProxyGradeFilter] = useState<string>('all');
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
    enrolledStudentIds: students.map(s => s.id)
  };

  const courseTeacherOptions = useMemo(
    () => buildCourseTeacherOptions(courses, teachers),
    [courses, teachers]
  );
  const [periodTeacherFilter, setPeriodTeacherFilter] = useState<string>('all');
  const periodFilteredCourses = useMemo(() => {
    const base = courses.length > 0 ? courses : [fallbackCourse];
    const filtered = base.filter((c) =>
      courseMatchesTeacherFilter(c, periodTeacherFilter, courseTeacherOptions)
    );
    return filtered.length > 0 ? filtered : base;
  }, [courses, fallbackCourse, periodTeacherFilter, courseTeacherOptions]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialPeriodCourseId || courses[0]?.id || fallbackCourse.id
  );
  const selectedCourse: Course =
    periodFilteredCourses.find((c) => c.id === selectedCourseId) ||
    courses.find((c) => c.id === selectedCourseId) ||
    periodFilteredCourses[0] ||
    fallbackCourse;
  const [selectedPeriod, setSelectedPeriod] = useState<number>(initialPeriodNumber || 1);
  const [periodDate, setPeriodDate] = useState<string>(initialPeriodDate || getLocalDateString());
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

  // Classroom GPS config for Period Check-in (Requirement 1)
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
  const [periodRosterFilter, setPeriodRosterFilter] = useState<'all' | 'unchecked' | 'proxy' | 'mobile'>('all');
  const [periodRosterSearch, setPeriodRosterSearch] = useState('');

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
        const saved = saveClassroomGpsConfig(activeSchoolId, {
          courseId: selectedCourse.id,
          courseCode: selectedCourse.code,
          room: selectedCourse.room || selectedCourse.code || 'ห้องเรียน',
          lat,
          lng,
          radiusMeters: roomRadiusInput || 40,
          updatedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
        });
        setClassroomGps(saved);
        setIsLocatingRoom(false);
        setRoomGpsNotice({
          type: 'ok',
          text: `บันทึกพิกัดห้อง ${saved.room} สำเร็จ (${lat.toFixed(5)}, ${lng.toFixed(5)} · รัศมี ${saved.radiusMeters} ม.)`,
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
      setRoomGpsNotice({ type: 'err', text: 'พิกัด Lat / Lng ไม่ถูกต้อง กรุณากรอกค่าละติจูด/ลองจิจูดให้ครบถ้วน' });
      return;
    }
    const saved = saveClassroomGpsConfig(activeSchoolId, {
      courseId: selectedCourse.id,
      courseCode: selectedCourse.code,
      room: selectedCourse.room || selectedCourse.code || 'ห้องเรียน',
      lat,
      lng,
      radiusMeters: Math.max(15, Math.min(300, Number(roomRadiusInput) || 40)),
      updatedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
    });
    setClassroomGps(saved);
    setRoomGpsNotice({
      type: 'ok',
      text: `บันทึกพิกัดห้อง ${saved.room} แล้ว (รัศมี ${saved.radiusMeters} ม.)`,
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

  // GPS Admin edit modal state
  const [showGpsAdminModal, setShowGpsAdminModal] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      const safe = !isStaffUser && initialSubTab === 'teacher_proxy' ? 'selfie_mobile' : initialSubTab;
      setSubTab(safe);
    }
    if (initialPeriodCourseId) setSelectedCourseId(initialPeriodCourseId);
    if (initialPeriodNumber) setSelectedPeriod(initialPeriodNumber);
    if (initialPeriodDate) setPeriodDate(initialPeriodDate);
    if (initialPeriodCode) setStudentPeriodCodeInput(initialPeriodCode);
    if (initialPeriodCheckType) setPeriodCheckType(initialPeriodCheckType);
  }, [
    isStaffUser,
    initialSubTab,
    initialPeriodCourseId,
    initialPeriodNumber,
    initialPeriodDate,
    initialPeriodCode,
    initialPeriodCheckType,
  ]);

  // Strict classroom & enrollment calculation for period attendance
  const periodStudentIds: string[] = useMemo(() => {
    if (selectedCourse.enrolledStudentIds && selectedCourse.enrolledStudentIds.length > 0) {
      return selectedCourse.enrolledStudentIds;
    }
    if (selectedCourse.room) {
      const targetRoom = selectedCourse.room.trim().toLowerCase();
      const roomStudents = students.filter(
        s => (s.room || '').trim().toLowerCase() === targetRoom
      );
      if (roomStudents.length > 0) return roomStudents.map(s => s.id);
    }
    // If course specifies category matching grade level
    if (selectedCourse.category) {
      const targetCategory = selectedCourse.category.toLowerCase();
      const gradeStudents = students.filter(
        s => (s.gradeLevel || '').toLowerCase().includes(targetCategory)
      );
      if (gradeStudents.length > 0) return gradeStudents.map(s => s.id);
    }
    return [];
  }, [selectedCourse, students]);

  const isSelfCheckin = isRestrictedViewer || attendanceMode === 'self';

  const selectedStudent = isStudentOnly
    ? (ownStudent || loggedInProfile.linkedStudent)
    : (scopedStudents.find(s => s.id === selectedStudentId) || scopedStudents[0] || students[0]);
  const selectedTeacher = currentUser?.role === 'teacher'
    ? (ownTeacher || loggedInProfile.linkedTeacher)
    : (teachers.find(t => t.id === selectedTeacherId) || teachers[0]);

  const effectiveUserType: AttendanceUserType = isSelfCheckin
    ? loggedInProfile.userType
    : activeUserType;

  const activePersonName = isSelfCheckin
    ? loggedInProfile.userName
    : (effectiveUserType === 'teacher'
      ? (selectedTeacher?.fullNameTh || 'อาจารย์')
      : `${selectedStudent?.firstNameTh || 'นักเรียน'} ${selectedStudent?.lastNameTh || ''}`.trim());

  const activePersonRole = isSelfCheckin
    ? loggedInProfile.userRoleLabel
    : (effectiveUserType === 'teacher' 
      ? (selectedTeacher?.academicStanding || 'ครูผู้สอน') 
      : `นักเรียน (${selectedStudent?.gradeLevel || 'ม.4'} ห้อง ${selectedStudent?.room || '401'})`);

  const activePersonId = isSelfCheckin
    ? loggedInProfile.idNumber
    : (effectiveUserType === 'teacher' 
      ? (selectedTeacher?.teacherIdNumber || selectedTeacher?.id) 
      : (selectedStudent?.studentIdNumber || selectedStudent?.id));

  const activePersonDefaultAvatar = isSelfCheckin
    ? loggedInProfile.avatarUrl
    : (effectiveUserType === 'teacher' 
      ? selectedTeacher?.avatarUrl 
      : selectedStudent?.avatarUrl);

  const activeDepartmentOrRoom = isSelfCheckin
    ? loggedInProfile.departmentOrRoom
    : (effectiveUserType === 'teacher'
      ? selectedTeacher?.department
      : selectedStudent?.room);

  const hasSchoolGpsConfigured = Boolean(selectedGate);
  const isInGeofence = Boolean(
    selectedGate && currentGpsDistance !== null && currentGpsDistance <= selectedGate.radiusMeters
  );
  const gpsStatusShortLabel = !selectedGate
    ? (lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set')
    : isGpsLoading
      ? (lang === 'th' ? 'กำลังระบุพิกัด GPS...' : 'Locating GPS...')
      : gpsError || currentGpsDistance === null
        ? (lang === 'th' ? 'รอสัญญาณ GPS' : 'Awaiting GPS')
        : isInGeofence
          ? (lang === 'th' ? `ในเขต · ${currentGpsDistance.toLocaleString()} ม.` : `In range · ${currentGpsDistance.toLocaleString()}m`)
          : (lang === 'th' ? `นอกเขต · ${currentGpsDistance.toLocaleString()} ม.` : `Out of range · ${currentGpsDistance.toLocaleString()}m`);

  // Sound chime effect using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
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

  // Start live webcam feed with front/back camera support
  const startCamera = async (targetFacingMode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: targetFacingMode }, 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsCameraActive(true);
        }
      } else {
        setCameraError('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง');
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable, fallback active:', err);
      setCameraError('ไม่สามารถเปิดกล้องได้ (กรุณาอนุญาตสิทธิ์การเข้าถึงกล้อง หรือใช้ปุ่มถ่ายภาพจำลอง)');
      setIsCameraActive(false);
    }
  };

  // Toggle front/back camera (สลับกล้องหน้า / กล้องหลัง)
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Stop camera feed
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (subTab === 'selfie_mobile') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [subTab]);

  // Capture Photo Snapshot from video canvas
  const handleCaptureSnapshot = () => {
    setIsCapturing(true);
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    if (videoRef.current && isCameraActive) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Mirror horizontally only for front selfie camera
          if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedPhotoUrl(dataUrl);
          setIsCapturing(false);
          return;
        }
      } catch (e) {
        console.error('Canvas capture failed:', e);
      }
    }

    // Fallback preset selfie snapshot
    const fallbackPhoto = activePersonDefaultAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    setCapturedPhotoUrl(fallbackPhoto);
    setIsCapturing(false);
  };

  // Refresh real device GPS location and detect nearest school-configured gate (NO fake/simulated fallback)
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

  // Automatically read real device GPS when entering Selfie Check-in or Student Period Check-in
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

  // Recalculate exact distance whenever the user switches to a different real gate
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

  // Submit and Save Attendance Record with Selfie Snapshot
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
      (!selectedStudent && !loggedInProfile.isLinkedToStudentRecord)
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
      : (effectiveUserType === 'teacher' ? selectedTeacher : selectedStudent);
    if (!attendancePerson) {
      setSelfieActionError('ไม่พบข้อมูลผู้ใช้งานสำหรับเช็คอิน กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }
    if (currentUser?.role === 'student' && !capturedPhotoUrl?.startsWith('data:image/jpeg;base64,')) {
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

    const photoToSave = capturedPhotoUrl || activePersonDefaultAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
        geofenceZoneName: selectedGate.nameTh
      },
      lineNotificationSent: false,
      recordedBy: isSelfCheckin ? undefined : (currentUser?.fullNameTh || 'เจ้าหน้าที่'),
      recordedByRole: isSelfCheckin ? undefined : (currentUser?.role || 'staff')
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

    onRecordAttendance(
      targetId,
      status,
      remarks,
      'selfie_geofence',
      {
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
        recordedBy: isSelfCheckin ? undefined : (currentUser?.fullNameTh || 'เจ้าหน้าที่'),
        recordedByRole: isSelfCheckin ? undefined : (currentUser?.role || 'staff'),
        location: {
          lat: realGpsCoords.lat,
          lng: realGpsCoords.lng,
          distanceMeters: currentGpsDistance,
          inGeofence: true,
          geofenceZoneName: selectedGate.nameTh
        }
      }
    );

    playChime();

    setCheckinSuccessFeedback({
      userName: activePersonName,
      userRole: activePersonRole,
      checkType,
      time: nowTime,
      distance: currentGpsDistance,
      photoUrl: photoToSave,
      gateName: selectedGate.nameTh
    });

    setCapturedPhotoUrl(null);
  };

  // Submit Leave Request
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
      ? (selectedTeacher?.id || '')
      : (selectedStudent?.id || '');

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
      courseCode: leaveScope === 'period_hourly' ? (selectedCourseObj?.code || 'GEN-101') : undefined,
      courseTitle: leaveScope === 'period_hourly' ? (selectedCourseObj?.titleTh || selectedCourseObj?.titleEn) : undefined,
      substituteTeacherId: leaveScope === 'period_hourly' ? leaveSubstituteTeacherId : undefined,
      substituteTeacherName: leaveScope === 'period_hourly' ? (substituteTeacherObj?.fullNameTh || 'ระบุครูสอนแทนแล้ว') : undefined,
      ccEmailsOrRoles:
        resolvedLeaveUserRole === 'student' && dualApprovers
          ? `ครูประจำชั้น: ${dualApprovers.homeroomTeacherName} | ครูประจำวิชา: ${dualApprovers.subjectTeacherNames.join(', ')}`
          : leaveScope === 'period_hourly'
            ? (leaveCcRoles || 'ฝ่ายวิชาการ, หัวหน้ากลุ่มสาระฯ')
            : undefined,
      homeroomTeacherName: dualApprovers?.homeroomTeacherName,
      homeroomApprovalStatus: dualApprovers ? 'pending' : undefined,
      subjectTeacherNames: dualApprovers?.subjectTeacherNames,
      subjectApprovals: dualApprovers?.subjectApprovals,
      startDate: leaveStartDate,
      endDate: leaveScope === 'period_hourly' ? leaveStartDate : leaveEndDate,
      reason: leaveScope === 'period_hourly' && leaveMissionNumber
        ? `[เลขที่คำสั่ง/ภารกิจ: ${leaveMissionNumber}] ${leaveReason}`
        : leaveReason,
      attachmentUrl: leaveAttachmentUrl || undefined,
      status: 'pending',
      createdAt: `${getLocalDateString()} ${new Date().toLocaleTimeString('th-TH')}`
    };

    if (onAddLeaveRequest) {
      onAddLeaveRequest(newLeave);
    }

    // Send push notification alert to substitute teacher / homeroom + subject teachers
    if (leaveScope === 'period_hourly') {
      sendEduVerseNotification({
        title: `📋 แจ้งเตือน${resolvedLeaveUserRole === 'student' ? 'นักเรียนลาเรียนรายคาบ' : 'ครูลาสอนรายคาบ'}: ${newLeave.userName}`,
        body: `ลาคาบที่ ${leavePeriodNum} (${newLeave.courseCode || 'วิชาเรียน'}) ${newLeave.substituteTeacherName ? `มอบหมายสอนแทน: ${newLeave.substituteTeacherName}` : ''} | CC: ${newLeave.ccEmailsOrRoles || 'วิชาการ'}`,
        category: 'announcement',
        priority: 'urgent',
      }).catch(() => {});
    } else if (resolvedLeaveUserRole === 'student' && dualApprovers) {
      sendEduVerseNotification({
        title: `📩 คำขอใบลานักเรียนใหม่: ${newLeave.userName}`,
        body: `ส่งอนุมัติทั้งครูประจำชั้น (${dualApprovers.homeroomTeacherName}) และครูประจำวิชา (${dualApprovers.subjectTeacherNames.slice(0, 3).join(', ')})`,
        category: 'announcement',
        priority: 'urgent',
      }).catch(() => {});
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

  // Periods list (driven by school admin period configuration)
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
    const isActive =
      currentBangkokNow.minutes >= startM && currentBangkokNow.minutes < endM;
    return {
      isActive,
      remainingMinutes: isActive ? Math.max(1, endM - currentBangkokNow.minutes) : null,
    };
  })();

  // Matched student from mandatory Student ID input for Teacher Proxy Check-in
  const trimmedProxyStudentId = proxyStudentIdInput.trim();
  const matchedProxyStudent = trimmedProxyStudentId
    ? students.find((s) => (s.studentIdNumber || '').trim().toLowerCase() === trimmedProxyStudentId.toLowerCase())
    : undefined;

  const handleConfirmProxySingleCheckin = () => {
    if (!matchedProxyStudent) return;
    const actionLabel = proxyCheckType === 'check_in' ? 'เช็คชื่อเข้า' : 'เช็คชื่อออก';
    onRecordAttendance(
      matchedProxyStudent.id,
      proxySingleStatus,
      `ครู${actionLabel}แทนโดยระบุรหัสนักเรียน ${matchedProxyStudent.studentIdNumber} (${currentUser?.fullNameTh || currentUser?.fullNameEn || 'อาจารย์'})`,
      'teacher_proxy',
      {
        recordType: proxyCheckType,
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

  // Period Check-in Code + Shareable Link (QR Code & URL with Classroom GPS)
  const expectedPeriodCode = `${selectedCourse.code || 'GEN-101'}-P${selectedPeriod}-${periodDate.replace(/-/g, '')}`;
  const periodClassroomGpsParams = classroomGps
    ? `&clat=${classroomGps.lat.toFixed(6)}&clng=${classroomGps.lng.toFixed(6)}&crad=${classroomGps.radiusMeters}&croom=${encodeURIComponent(classroomGps.room)}`
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

  // Requirement 3: Instant 1-tap teacher proxy check-in for students without mobile phones
  const handleTeacherProxyPeriodCheckin = (
    student: Student,
    status: 'present' | 'late' | 'absent' | 'excused' = 'present',
    isNoPhoneProxy = false
  ) => {
    const currentPeriodInfo = periodsList.find((p) => p.period === selectedPeriod);
    const existing = periodAttendance.find(
      (p) =>
        p.studentId === student.id &&
        p.courseId === selectedCourse.id &&
        p.date === periodDate &&
        p.periodNumber === selectedPeriod
    );
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
      verifiedByTeacherId: currentUser?.id || 'usr-teacher',
      verifiedByTeacherName:
        currentUser?.fullNameTh || currentUser?.fullNameEn || selectedCourse.teacherName || 'ครูผู้สอน',
      checkMethod: 'teacher_proxy',
      remarks: isNoPhoneProxy
        ? `ครูกดรับเช็คชื่อแทน (นักเรียนไม่มีมือถือ) คาบที่ ${selectedPeriod}`
        : `ครูบันทึกเช็คชื่อคาบที่ ${selectedPeriod} (${selectedCourse.code})`,
    };
    onRecordPeriodAttendance([record]);
    setPeriodStatuses((prev) => ({ ...prev, [student.id]: status }));
    playChime();
    setPeriodSavedNotification(
      isNoPhoneProxy
        ? `ครูกดรับเช็คชื่อแทน ${student.firstNameTh} ${student.lastNameTh} (ไม่มีมือถือ) คาบที่ ${selectedPeriod} เรียบร้อยแล้ว`
        : `บันทึกสถานะ ${student.firstNameTh} ${student.lastNameTh} คาบที่ ${selectedPeriod} แล้ว`
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
          const parsed = new URL(rawInput.startsWith('http') ? rawInput : `https://eduverse.school${rawInput.startsWith('/') ? '' : '/'}${rawInput}`);
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
            const matchingCourse = courses.find((c) => rawInput.toUpperCase().startsWith((c.code || '').toUpperCase()));
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

    // Requirement 1: Validate Classroom GPS coordinates before accepting period check-in
    const storedRoomGps = findClassroomGpsConfig(activeSchoolId, {
      courseId: targetCourse.id,
      room: targetCourse.room,
    });
    const effectiveRoomGps: ClassroomGpsConfig | null =
      urlRoomLat !== null && urlRoomLng !== null
        ? {
            id: storedRoomGps?.id || `url-room-${targetCourse.id}`,
            schoolId: activeSchoolId,
            courseId: targetCourse.id,
            courseCode: targetCourse.code,
            room: urlRoomName || targetCourse.room || targetCourse.code || 'ห้องเรียน',
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
        `อยู่นอกพิกัดห้องเรียน ${effectiveRoomGps.room} (ห่าง ${roomGpsCheck.distanceMeters.toLocaleString()} ม. เกินรัศมีที่กำหนด ${roomGpsCheck.radiusMeters} ม.) กรุณาเข้าห้องเรียนแล้วลองใหม่ หรือแจ้งครูผู้สอนหากไม่มีสัญญาณ`
      );
      return;
    }

    // Strict validation: Must belong to targetCourse (enrolledStudentIds or room match)
    let isStudentEnrolledInClass = false;
    if (targetCourse.enrolledStudentIds && targetCourse.enrolledStudentIds.length > 0) {
      isStudentEnrolledInClass = targetCourse.enrolledStudentIds.includes(targetStudent.id);
    } else if (targetCourse.room && targetStudent.room) {
      isStudentEnrolledInClass = targetCourse.room.trim().toLowerCase() === targetStudent.room.trim().toLowerCase();
    } else if (targetCourse.category && targetStudent.gradeLevel) {
      isStudentEnrolledInClass = (targetStudent.gradeLevel || '').toLowerCase().includes((targetCourse.category || '').toLowerCase());
    }

    if (!isStudentEnrolledInClass) {
      setStudentPeriodCheckinError(
        `⛔ ปฏิเสธการเช็คชื่อ: นักเรียน ${targetStudent.firstNameTh} ${targetStudent.lastNameTh} (ชั้น ${targetStudent.gradeLevel} ห้อง ${targetStudent.room || '-'}) ไม่ได้อยู่ในรายชื่อหรือห้องเรียนของวิชานี้ (${targetCourse.code || ''} ${targetCourse.titleTh || ''} ${targetCourse.room ? 'ห้อง ' + targetCourse.room : ''}) สิทธิ์เช็คชื่อรายคาบอนุญาตเฉพาะเด็กในชั้นเรียนนี้เท่านั้น`
      );
      return;
    }

    const currentPeriodInfo = periodsList.find((p) => p.period === resolvedPeriodNum);
    const actionLabel = resolvedCheckType === 'check_in' ? 'เช็คชื่อเข้าเรียน (Check-in)' : 'เช็คชื่อออกคาบเรียน (Check-out)';

    const record: PeriodAttendanceRecord = {
      id: `patt-qr-${Date.now()}-${targetStudent.id}`,
      schoolId: targetCourse.schoolId || _school?.id || 'sch-1',
      courseId: targetCourse.id,
      courseCode: targetCourse.code || 'GEN-101',
      periodNumber: resolvedPeriodNum,
      timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
      date: resolvedDate,
      studentId: targetStudent.id,
      status: 'present',
      recordType: resolvedCheckType,
      verifiedByTeacherId: 'qr-self-checkin',
      verifiedByTeacherName: targetCourse.teacherName || 'ระบบ Barcode/QR รายคาบ',
      checkMethod: 'qr_code',
      remarks: `นักเรียนสแกน Barcode/QR ${actionLabel} (${resolvedCode}) · พิกัดห้อง ${effectiveRoomGps.room} (ห่าง ${roomGpsCheck.distanceMeters} ม.)`,
    };

    onRecordPeriodAttendance([record]);
    setSelectedCourseId(targetCourse.id);
    setSelectedPeriod(resolvedPeriodNum);
    setPeriodDate(resolvedDate);
    setPeriodCheckType(resolvedCheckType);
    playChime();
    setStudentPeriodCheckinMsg(
      `${resolvedCheckType === 'check_in' ? '🟢 เช็คชื่อเข้าเรียน (Check-in)' : '🔴 เช็คชื่อออก (Check-out)'} วิชา ${targetCourse.code} คาบที่ ${resolvedPeriodNum} ห้อง ${effectiveRoomGps.room} (ระยะ ${roomGpsCheck.distanceMeters} ม.) สำเร็จแล้ว!`
    );
    setTimeout(() => setStudentPeriodCheckinMsg(null), 5000);
  };

  // Period Attendance Save (Teacher bulk review/save)
  const handleSavePeriodAttendance = () => {
    const currentPeriodInfo = periodsList.find(p => p.period === selectedPeriod);
    const newRecords: PeriodAttendanceRecord[] = periodStudentIds.map(stuId => {
      const existing = periodAttendance.find(
        (p) => p.studentId === stuId && p.courseId === selectedCourse.id && p.date === periodDate && p.periodNumber === selectedPeriod
      );
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
        verifiedByTeacherId: currentUser?.id || 'usr-teacher',
        verifiedByTeacherName: currentUser?.fullNameTh || currentUser?.fullNameEn || selectedCourse.teacherName || 'อาจารย์',
        checkMethod: existing?.checkMethod || 'teacher_proxy',
        remarks: `เช็คชื่อรายคาบ ${selectedCourse.code || 'GEN-101'} คาบที่ ${selectedPeriod}`
      };
    });

    onRecordPeriodAttendance(newRecords);
    setPeriodSavedNotification(`บันทึกการเช็คชื่อเข้าเรียนรายคาบ ${selectedCourse.code || 'GEN-101'} (คาบที่ ${selectedPeriod}) สำเร็จ (${newRecords.length} คน)`);
    setTimeout(() => setPeriodSavedNotification(null), 5000);
  };

  const filteredProxyStudents = proxyGradeFilter === 'all' 
    ? students 
    : students.filter(s => s.gradeLevel === proxyGradeFilter);

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
    for (const s of scopedStudents) {
      if (s.gradeLevel) set.add(s.gradeLevel);
    }
    return Array.from(set);
  }, [scopedStudents]);

  const filteredRosterStudents = useMemo(() => {
    const q = rosterSheetQuery.trim().toLowerCase();
    return scopedStudents.filter((s) => {
      if (rosterSheetGradeFilter !== 'all' && s.gradeLevel !== rosterSheetGradeFilter) return false;
      if (!q) return true;
      return (
        `${s.firstNameTh} ${s.lastNameTh}`.toLowerCase().includes(q) ||
        `${s.firstNameEn} ${s.lastNameEn}`.toLowerCase().includes(q) ||
        s.studentIdNumber.toLowerCase().includes(q) ||
        `${s.gradeLevel}/${s.room}`.toLowerCase().includes(q)
      );
    });
  }, [scopedStudents, rosterSheetGradeFilter, rosterSheetQuery]);

  const rosterTodayStats = useMemo(() => {
    let checkedIn = 0;
    let late = 0;
    for (const s of scopedStudents) {
      const rec = todayAttendanceByStudent.get(s.id);
      if (rec?.status === 'present') checkedIn += 1;
      else if (rec?.status === 'late') late += 1;
    }
    return {
      checkedIn,
      late,
      pending: Math.max(0, scopedStudents.length - checkedIn - late),
    };
  }, [scopedStudents, todayAttendanceByStudent]);

  // NFC Tap Processing & Live Reader Lifecycle
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
    const resolvedStatus: AttendanceStatus =
      isStaffUser
        ? nfcStatusMode
        : nfcCheckType === 'check_in' && minutes > 8 * 60
          ? 'late'
          : 'present';

    const actionWord = nfcCheckType === 'check_in' ? 'เช็คชื่อเข้า' : 'เช็คชื่อออก';
    const personName =
      userType === 'student'
        ? `${student?.firstNameTh || ''} ${student?.lastNameTh || ''}`.trim()
        : teacher?.fullNameTh || 'บุคลากร';
    const targetId = userType === 'student' ? (student?.id || '') : (teacher?.id || '');
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
        recordedBy: isStaffUser ? (currentUser?.fullNameTh || 'เจ้าหน้าที่จุดสแกน NFC') : personName,
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
        gateName: selectedGate?.nameTh || (_school?.nameTh || 'จุดสแกน NFC'),
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
      students: isRestrictedViewer ? scopedStudents : students,
      teachers: isRestrictedViewer ? (ownTeacher ? [ownTeacher] : []) : teachers,
    });

    if (!match.matched) {
      // Restricted student user tapping their own physical card: allow binding to own student record
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
      const stu = students.find((s) => s.id === bindTargetId);
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
          lang === 'th'
            ? `ไม่สามารถเปิดเครื่องอ่าน NFC ได้ (${msg})`
            : `Could not start NFC reader (${msg})`
        );
      }
    }
  };

  const handleQuickRosterCheckin = (st: Student, status: AttendanceStatus = 'present') => {
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
        (p) => p.studentId === st.id && p.courseId === selectedCourse.id && p.date === periodDate && p.periodNumber === selectedPeriod
      );
      const current = periodStatuses[st.id] || existing?.status || 'present';
      const next: AttendanceStatus =
        current === 'present' ? 'late' : current === 'late' ? 'absent' : 'present';
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
        ? (lang === 'th' ? 'บันทึกทั้งคาบ' : 'Save Period')
        : (lang === 'th' ? 'เช็คชื่อคาบนี้' : 'Check Period');
    }
    return lang === 'th' ? 'ไปเช็คชื่อ' : 'Check-in';
  })();

  const hideFloatingToolbar =
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
    <div className={`${getModuleTone('mobile_checkin')} ${embeddedMobile ? 'h-full min-h-0 flex flex-col gap-2 overflow-x-hidden w-full max-w-full pb-20' : 'space-y-4 max-w-5xl mx-auto overflow-x-hidden w-full pb-24'}`}>
      {/* Top Header */}
      {embeddedMobile ? (
        <div className="shrink-0 flex items-center justify-between px-1 py-1 text-[var(--color-text-title)]">
          <h1 className="type-section-title truncate">
            {lang === 'th' ? 'เช็คชื่อเข้า-ออก' : 'Attendance'}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className="type-meta tabular-nums">
              {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="btn-icon-tool min-h-[36px] min-w-[36px]"
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
              aria-label={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--tone)]" /> : <VolumeX className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="app-page-header px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl tone-chip shrink-0">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="type-page-title truncate">
                {lang === 'th' ? 'เช็คชื่อมือถือ & แตะบัตร NFC' : 'Mobile Attendance & NFC'}
              </h1>
              <p className="type-meta truncate">
                {lang === 'th'
                  ? 'เซลฟี่ GPS · แตะบัตร NFC · ใบลา · เช็คชื่อรายคาบ'
                  : 'Selfie GPS · NFC ID tap · Leave · Period check-in'}
              </p>
            </div>
          </div>

          <div className="saas-control-group shrink-0 self-start sm:self-auto">
            <span className="type-meta px-2 tabular-nums">
              {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="btn-icon-tool"
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
              aria-label={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--color-primary-text)]" /> : <VolumeX className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub Tabs & Contextual Action */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Attendance sub-navigation" className="seg-tab-group overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'selfie_mobile', icon: Camera, labelTh: 'เซลฟี่', labelEn: 'Selfie', staffOnly: false },
            { id: 'nfc_tap', icon: Nfc, labelTh: 'แตะ NFC', labelEn: 'NFC', staffOnly: false },
            { id: 'leave_request', icon: FileText, labelTh: 'ใบลา', labelEn: 'Leave', badge: scopedLeaveRequests.filter(r => r.status === 'pending').length, staffOnly: false },
            { id: 'teacher_proxy', icon: UserCheck, labelTh: 'ลงชื่อแทน', labelEn: 'Proxy', staffOnly: true },
            { id: 'period_checkin', icon: Users, labelTh: 'รายคาบ', labelEn: 'Periods', staffOnly: false }
          ]
            .filter((tab) => isStaffUser || !tab.staffOnly)
            .map(tab => (
            <button
              key={tab.id}
              type="button"
              data-active={subTab === tab.id}
              onClick={() => {
                setSubTab(tab.id as any);
                if (tab.id === 'leave_request') setLeaveFormStep(1);
              }}
              className="seg-tab-btn"
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? tab.labelTh : tab.labelEn}</span>
              {tab.badge ? (
                <span className={`font-bold tabular-nums ${
                  subTab === tab.id ? 'text-white/90' : 'text-amber-600 dark:text-amber-300'
                }`}>
                  ({tab.badge})
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
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
              className={`min-h-[38px] px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shrink-0 ${
                isQuickAttendanceLocked
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-[var(--color-card)] border-[var(--color-border)] text-emerald-700 dark:text-emerald-400'
              }`}
              title={
                isQuickAttendanceLocked
                  ? (lang === 'th' ? 'แตะเพื่อปลดล็อกด้วย FaceID / TouchID' : 'Unlock with FaceID / TouchID')
                  : (lang === 'th' ? 'แตะเพื่อล็อกเช็คชื่อด่วน' : 'Lock quick attendance')
              }
            >
              {isQuickAttendanceLocked ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <Fingerprint className="w-3.5 h-3.5 shrink-0" />}
              <span className="tabular-nums">
                {isQuickAttendanceLocked
                  ? (lang === 'th' ? 'ล็อก' : 'Locked')
                  : `${biometricUnlockMinutes}${lang === 'th' ? 'น.' : 'm'}`}
              </span>
            </button>
          )}

          {/* Show top rapid scanner button only in full desktop layout (on mobile it lives in the bottom thumb FAB) */}
          {!embeddedMobile && (
            <button
              type="button"
              onClick={() => runWithBiometricGuard(() => setShowRapidScanner(true))}
              className="btn-action-primary px-3 py-1.5 shrink-0"
              title="สแกน QR / บาร์โค้ดต่อเนื่อง (1 วินาที/คน)"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'สแกน QR รัว' : 'Rapid Scan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Slim Biometric Status / Lock Bar (only renders on active feedback or when actually locked) */}
      {isStaffUser && (biometricNotice || biometricError || (isQuickAttendanceLocked && (subTab === 'nfc_tap' || subTab === 'teacher_proxy' || subTab === 'period_checkin'))) && (
        <div className="shrink-0 space-y-1.5">
          {biometricNotice && (
            <div role="status" className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{biometricNotice}</span>
            </div>
          )}
          {biometricError && (
            <div role="alert" className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{biometricError}</span>
            </div>
          )}

          {isQuickAttendanceLocked && (subTab === 'nfc_tap' || subTab === 'teacher_proxy' || subTab === 'period_checkin') && (
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
                <span>{biometricBusy ? '...' : (lang === 'th' ? 'ปลดล็อก' : 'Unlock')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1-Line Compact Context Strip for Mobile Selfie (1-Screen = 1-Task, Details in Bottom Sheets) */}
      {embeddedMobile && subTab === 'selfie_mobile' && (
        <div className="shrink-0 saas-kpi-strip grid grid-cols-2 divide-x divide-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setShowIdentitySheet(true)}
            className="px-2.5 py-2 text-left flex items-center justify-between gap-1.5 hover:bg-[var(--color-card-subtle)] cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
              <div className="min-w-0">
                <p className="type-meta truncate">{isSelfCheckin ? (lang === 'th' ? 'บัญชีฉัน' : 'Self') : (lang === 'th' ? 'สแกนแทน' : 'Proxy')}</p>
                <p className="type-label truncate">{activePersonName}</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setShowGeofenceSheet(true)}
            className="px-2.5 py-2 text-left flex items-center justify-between gap-1.5 hover:bg-[var(--color-card-subtle)] cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin
                className={`w-3.5 h-3.5 shrink-0 ${
                  !hasSchoolGpsConfigured || isGpsLoading
                    ? 'text-amber-600 dark:text-amber-400'
                    : isInGeofence
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                }`}
              />
              <div className="min-w-0">
                <p className="type-meta truncate">
                  {selectedGate ? selectedGate.nameTh : (lang === 'th' ? 'พิกัด GPS โรงเรียน' : 'School GPS')}
                </p>
                <p
                  className={`type-label tabular-nums truncate ${
                    !hasSchoolGpsConfigured || isGpsLoading
                      ? 'text-amber-700 dark:text-amber-300'
                      : isInGeofence
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {gpsStatusShortLabel}
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SELFIE CHECK-IN/OUT (SELF PHONE) FOR STUDENTS & TEACHERS */}
      {/* ========================================================================= */}
      {subTab === 'selfie_mobile' && (
        <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col gap-1.5' : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'}`}>
          {/* CAMERA COLUMN: Always primary on mobile (1-Screen = 1-Task) */}
          <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'lg:col-span-7 flex flex-col items-center'}`}>
            <div className={`${embeddedMobile ? 'flex-1 min-h-0 w-full rounded-2xl border' : 'w-full max-w-sm rounded-[36px] p-3.5 border-4'} bg-slate-900 shadow-xl border-slate-800 relative flex flex-col overflow-hidden`}>

              {/* Event Selector: Check-in vs Check-out + Gate Selector */}
              <div className="p-1.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCheckType('check_in')}
                    className={`flex items-center gap-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      checkType === 'check_in'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3 h-3 text-emerald-200 shrink-0" />
                    <span>เข้าเรียน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckType('check_out')}
                    className={`flex items-center gap-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      checkType === 'check_out'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    <LogOut className="w-3 h-3 text-purple-200 shrink-0" />
                    <span>ออกโรงเรียน</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  {normalizedGates.length > 1 && selectedGate ? (
                    <select
                      aria-label={lang === 'th' ? 'จุดประตูเช็คชื่อ' : 'Check-in gate'}
                      value={selectedGate.id}
                      onChange={(e) => setSelectedGateId(e.target.value)}
                      className="bg-slate-800 text-white text-[11px] font-semibold rounded-lg px-2 py-1 border border-slate-600 truncate min-w-0 max-w-full"
                    >
                      {normalizedGates.map(gate => (
                        <option key={gate.id} value={gate.id} className="bg-slate-800 text-white">{gate.nameTh}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="bg-slate-800/90 text-slate-100 text-[11px] font-semibold rounded-lg px-2 py-1 border border-slate-700 truncate min-w-0 max-w-full">
                      {selectedGate ? selectedGate.nameTh : (lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set')}
                    </span>
                  )}
                </div>
              </div>

              {/* Camera Viewfinder Box with Responsive Centered Face Outline Guide */}
              <div className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden ${embeddedMobile ? 'min-h-[170px]' : 'min-h-[320px]'}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${
                    capturedPhotoUrl ? 'hidden' : 'block'
                  }`}
                />

                {capturedPhotoUrl && (
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Refresh Camera Button (ย้ายสลับตำแหน่งมากับปุ่มสลับกล้องหน้า/หลัง) */}
                {!capturedPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => { void startCamera(); }}
                    className="absolute top-2 right-2 z-30 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 pointer-events-auto"
                    title="เปิด / รีเฟรชกล้อง (Refresh Camera)"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                    <span>รีเฟรชกล้อง</span>
                  </button>
                )}

                {isFlashActive && (
                  <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />
                )}

                {!capturedPhotoUrl && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-2">
                    <div className={`${embeddedMobile ? 'w-28 h-36' : 'w-48 h-60'} rounded-[50%] border-2 border-dashed border-cyan-400/80 shadow-md shadow-cyan-500/20 flex flex-col items-center justify-center relative animate-pulse`}>
                      <div className="absolute top-1.5 w-8 h-1 bg-cyan-400/70 rounded-full" />
                      <div className="text-center px-2 space-y-0.5">
                        <p className="text-[10px] font-bold text-cyan-200 drop-shadow">
                          วางใบหน้าในกรอบ
                        </p>
                        <p className="text-[8px] text-cyan-200">
                          {facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'} (กดปุ่มสลับกล้องได้)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating GPS & Time Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none text-[10px]">
                  <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white font-mono flex items-center gap-1 border border-white/20">
                    <Clock className="w-3 h-3 text-cyan-300" />
                    <span>{new Date().toLocaleTimeString('th-TH')}</span>
                  </div>

                  <div className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border backdrop-blur-md tabular-nums ${
                    !hasSchoolGpsConfigured || isGpsLoading || currentGpsDistance === null
                      ? 'bg-amber-950/80 text-amber-200 border-amber-500/40'
                      : isInGeofence 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                        : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                  }`}>
                    <MapPin className="w-3 h-3" />
                    <span>{gpsStatusShortLabel}</span>
                  </div>
                </div>

                {cameraError && !capturedPhotoUrl && (
                  <div className="absolute inset-x-3 bottom-3 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-200 text-xs backdrop-blur-md text-center space-y-1.5">
                    <p className="text-[11px]">{cameraError}</p>
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                    >
                      กดถ่ายภาพจำลองทันที
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Camera Controls & Shutter - Compact */}
              <div className="p-2 bg-slate-950 border-t border-slate-800 shrink-0">
                {capturedPhotoUrl ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCapturedPhotoUrl(null)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>ถ่ายใหม่</span>
                      </button>
                      <button
                        type="button"
                        disabled={!isInGeofence || isSavingAttendance}
                        onClick={handleConfirmCheckin}
                        className={`flex-[2] py-2 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${
                          isInGeofence 
                            ? checkType === 'check_in' 
                              ? 'bg-emerald-700 hover:bg-emerald-600 shadow-emerald-900/30' 
                              : 'bg-[var(--color-primary)] hover:opacity-90 shadow-purple-900/30'
                            : 'bg-slate-700 cursor-not-allowed opacity-70'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSavingAttendance ? 'กำลังบันทึก...' : `ยืนยัน ${checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'}`}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-center text-slate-300 flex items-center justify-center gap-1">
                      {!hasSchoolGpsConfigured ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ</span>
                        </>
                      ) : isGpsLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                          <span>กำลังอ่านพิกัด GPS ปัจจุบัน...</span>
                        </>
                      ) : currentGpsDistance === null ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{gpsError || 'กรุณาอนุญาต GPS แล้วกดอัปเดตพิกัด'}</span>
                        </>
                      ) : isInGeofence ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>พร้อมส่งหลักฐานและแจ้งเตือนผู้ปกครอง</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>อยู่นอกพื้นที่โรงเรียน ({currentGpsDistance.toLocaleString()} ม.)</span>
                        </>
                      )}
                    </p>
                    {selfieActionError && (
                      <p className="text-[10px] text-center text-rose-300 font-semibold">{selfieActionError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-5 py-0.5">
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="px-2.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-bold"
                      title="สลับกล้องหน้า / กล้องหลัง (Switch Front / Back Camera)"
                      aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                    >
                      <SwitchCamera className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="hidden sm:inline">{facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      disabled={isCapturing}
                      className="w-12 h-12 rounded-full bg-white p-0.5 shadow-lg shadow-white/20 hover:scale-105 active:scale-95 transition flex items-center justify-center focus:outline-hidden cursor-pointer"
                      title="ถ่ายรูปเช็คชื่อ"
                      aria-label="ถ่ายรูปเช็คชื่อ"
                    >
                      <div className="w-full h-full rounded-full border-2 border-slate-900 bg-red-600 hover:bg-red-500 flex items-center justify-center transition">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshGps}
                      className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                      title="รีเฟรชสัญญาณ GPS"
                      aria-label="รีเฟรชสัญญาณ GPS"
                    >
                      <Navigation className={`w-4 h-4 ${isGpsLoading ? 'animate-spin text-blue-400' : ''}`} />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-center py-1">
                <p className={`text-[11px] text-slate-300 ${embeddedMobile ? 'hidden' : ''}`}>
                  {isSelfCheckin ? 'บัญชีของคุณ · ' : 'สแกนแทน · '}
                  <span className="text-white font-bold">{activePersonName}</span> ({activePersonRole})
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Desktop Only — on mobile, Identity & Geofence live inside Bottom Sheets) */}
          {!embeddedMobile && <div className="lg:col-span-5 space-y-4">
            {/* User Profile Card: Accurately references loggedIn user in self mode; allows proxy mode for staff */}
            <div className="saas-card">
              <div className="saas-card-header">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <h3 className="type-section-title truncate">
                    {isRestrictedViewer ? 'บัญชีเช็คชื่อ' : 'บัญชีผู้ใช้งาน'}
                  </h3>
                </div>
                {!isRestrictedViewer ? (
                  <div className="seg-tab-group shrink-0">
                    <button
                      type="button"
                      data-active={isSelfCheckin}
                      onClick={() => setAttendanceMode('self')}
                      className="seg-tab-btn flex items-center gap-1"
                      title="เช็คชื่อด้วยบัญชีที่เข้าสู่ระบบของคุณเอง"
                    >
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>บัญชีฉัน</span>
                    </button>
                    <button
                      type="button"
                      data-active={!isSelfCheckin}
                      onClick={() => setAttendanceMode('proxy')}
                      className="seg-tab-btn flex items-center gap-1"
                      title="บันทึกเช็คชื่อแทนนักเรียนหรือบุคลากร"
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>สแกนแทน</span>
                    </button>
                  </div>
                ) : (
                  <span className="type-meta text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                    {currentUser?.role === 'student' ? 'บัญชีนักเรียน' : 'บัญชีของฉัน'}
                  </span>
                )}
              </div>

              <div className="saas-card-body space-y-3">
                {isSelfCheckin ? (
                  <p className="type-meta flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      ผูกตรงกับบัญชี{' '}
                      <strong className="text-[var(--color-text-title)]">{currentUser?.fullNameTh || loggedInProfile.userName}</strong>
                      {' · '}
                      {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน'}
                    </span>
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <div className="seg-tab-group w-full flex">
                      <button
                        type="button"
                        data-active={effectiveUserType === 'student'}
                        onClick={() => setActiveUserType('student')}
                        className="seg-tab-btn flex-1 text-center"
                      >
                        นักเรียน
                      </button>
                      <button
                        type="button"
                        data-active={effectiveUserType === 'teacher'}
                        onClick={() => setActiveUserType('teacher')}
                        className="seg-tab-btn flex-1 text-center"
                      >
                        ครู / บุคลากร
                      </button>
                    </div>
                    {effectiveUserType === 'student' ? (
                      <div className="space-y-1">
                        <label className="type-label block">รายชื่อนักเรียน</label>
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] type-body text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
                        >
                          {scopedStudents.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber}) - {st.gradeLevel} {st.room}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="type-label block">รายชื่อครู</label>
                        <select
                          value={selectedTeacherId}
                          onChange={(e) => setSelectedTeacherId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] type-body text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
                        >
                          {teachers.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              {tc.fullNameTh} ({tc.teacherIdNumber}) - {tc.department}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <p className="type-meta text-amber-700 dark:text-amber-400">
                      บันทึกโดย {currentUser?.fullNameTh || 'ผู้ดูแลระบบ'}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-3">
                  <img
                    src={activePersonDefaultAvatar}
                    alt={activePersonName}
                    className="w-11 h-11 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="type-card-title truncate">{activePersonName}</p>
                      {isSelfCheckin && (
                        <span className="type-meta text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                          · บัญชีคุณ
                        </span>
                      )}
                    </div>
                    <p className="type-meta truncate">{activePersonRole}</p>
                    <p className="type-meta font-mono truncate">
                      {activePersonId} {activeDepartmentOrRoom ? `· ${activeDepartmentOrRoom}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Gate Geofence Radar */}
            <div className="saas-card text-[var(--color-text-body)]">
              <div className="saas-card-header">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <h3 className="type-section-title truncate">จุดเช็คชื่อ GPS ({normalizedGates.length})</h3>
                </div>
                <div className="saas-control-group shrink-0">
                  {isSchoolAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowGpsAdminModal(true)}
                      className="btn-icon-tool"
                      title="ตั้งค่าและแก้ไขพิกัดจุดเช็คชื่อโรงเรียน (Admin)"
                      aria-label="แก้ไขพิกัดจุดเช็คชื่อโรงเรียน"
                    >
                      <Settings className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshGps}
                    className="btn-icon-tool"
                    title="ตรวจพิกัด GPS ปัจจุบัน"
                    aria-label="ตรวจพิกัด GPS ปัจจุบัน"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-primary-text)] ${isGpsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="saas-card-body space-y-3.5">
                {!selectedGate ? (
                  <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="type-card-title">ยังไม่ได้ตั้งค่าพิกัด GPS ของโรงเรียน</p>
                        <p className="type-meta">
                          {isSchoolAdmin
                            ? 'กรุณากดตั้งค่าพิกัด GPS จริงและจุดประตูเช็คชื่อของโรงเรียนก่อนใช้งาน'
                            : 'กรุณาแจ้งผู้ดูแลระบบโรงเรียนให้กำหนดพิกัด GPS จริงของโรงเรียนก่อนเช็คชื่อ'}
                        </p>
                      </div>
                    </div>
                    {isSchoolAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowGpsAdminModal(true)}
                        className="btn-action-primary px-3 py-1.5 text-xs cursor-pointer"
                      >
                        ตั้งค่าพิกัด GPS โรงเรียน
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Status Summary */}
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      isGpsLoading || currentGpsDistance === null
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                        : isInGeofence 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100' 
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                    }`}>
                      {isInGeofence ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <p className="type-card-title">
                          {isGpsLoading
                            ? `กำลังอ่านพิกัด GPS · ${selectedGate.nameTh}`
                            : currentGpsDistance === null
                              ? `รอพิกัด GPS · ${selectedGate.nameTh}`
                              : isInGeofence
                                ? `ในเขต · ${selectedGate.nameTh}`
                                : `นอกเขต · ${selectedGate.nameTh}`}
                        </p>
                        <p className="type-meta">
                          {currentGpsDistance !== null ? (
                            <>
                              ระยะห่างจริง <strong className="font-mono text-[var(--color-text-title)] tabular-nums">{currentGpsDistance.toLocaleString()} ม.</strong> (รัศมี {selectedGate.radiusMeters} ม. · กำหนดโดยโรงเรียน)
                            </>
                          ) : (
                            gpsError || `รัศมีเช็คชื่อ ${selectedGate.radiusMeters} ม. · กรุณากดปุ่มรีเฟรชเพื่ออ่านพิกัด GPS จริง`
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Multi-gate Selector List (only shown when > 1 gate or School Admin) */}
                    {(normalizedGates.length > 1 || isSchoolAdmin) && (
                      <div className="space-y-1.5">
                        <label className="type-label block">
                          {isSchoolAdmin ? 'จุดเช็คชื่อที่กำหนดไว้' : 'เลือกประตูที่ใช้งาน'}
                        </label>
                        <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                          <PagedList items={normalizedGates} pageSize={3} renderItem={(gate) => {
                            const isSelected = gate.id === selectedGate.id;
                            return (
                              <button
                                key={gate.id}
                                type="button"
                                onClick={() => setSelectedGateId(gate.id)}
                                className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-[var(--color-primary-light)] text-[var(--color-text-title)]'
                                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`} />
                                  <div className="min-w-0">
                                    <p className="type-card-title truncate">{gate.nameTh}</p>
                                    <p className="type-meta font-mono truncate">
                                      รัศมี {gate.radiusMeters} ม.{isSchoolAdmin ? ` · ${Number(gate.lat).toFixed(5)}, ${Number(gate.lng).toFixed(5)}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                                )}
                              </button>
                            );
                          }} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONLINE LEAVE REQUEST SUBMISSION (ใบลาออนไลน์) */}
      {/* ========================================================================= */}
      {subTab === 'leave_request' && (
        <div className={`${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 saas-card text-[var(--color-text-body)]">
            <div className="saas-card-header">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="type-section-title">ยื่นใบลาออนไลน์</h3>
                  <p className="type-meta">
                    ขอลาป่วย ลากิจ หรือไปราชการ พร้อมแนบหลักฐาน
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 type-meta">
                <span className={leaveFormStep === 1 ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''}>1. รายละเอียด</span>
                <span>→</span>
                <span className={leaveFormStep === 2 ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''}>2. เหตุผล</span>
              </div>
            </div>

            <div className="saas-card-body space-y-4">
              {leaveSuccessNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <span>{leaveSuccessNotice}</span>
                </div>
              )}

              {leaveErrorNotice && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 type-meta font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0" />
                  <span>{leaveErrorNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmitLeave} className="space-y-4 type-body">
                {leaveFormStep === 1 && (
                  <div className="space-y-4">
                {/* Person Summary / Switcher (hairline-separated, no nested border sandwich) */}
                <div className="pb-3 border-b border-[var(--color-border)] space-y-2">
                  <span className="type-label block">ผู้ขอยื่นใบลา</span>
                  {isSelfCheckin ? (
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="type-card-title">{activePersonName}</span>
                      <span className="type-meta">· {activePersonRole} · บัญชีของคุณ</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveUserType('student')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition max-w-full truncate cursor-pointer ${
                          effectiveUserType === 'student' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        นักเรียน: {selectedStudent?.firstNameTh} ({selectedStudent?.room})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveUserType('teacher')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition max-w-full truncate cursor-pointer ${
                          effectiveUserType === 'teacher' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        ครู: {selectedTeacher?.fullNameTh}
                      </button>
                    </div>
                  )}
                </div>

                {/* Leave Scope Toggle: Full day vs Period / Hourly teaching leave */}
                <div className="space-y-1.5">
                  <label className="type-label block">ขอบเขตการลา</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveScope('full_day')}
                      className={`p-2.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                        leaveScope === 'full_day'
                          ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>ลาเต็มวัน / หลายวัน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveScope('period_hourly')}
                      className={`p-2.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                        leaveScope === 'period_hourly'
                          ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>ลาเฉพาะคาบ / รายชม.</span>
                    </button>
                  </div>
                </div>

                {/* Period / Hourly Specific Selectors */}
                {leaveScope === 'period_hourly' && (
                  <div className="p-3.5 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-border)] space-y-3">
                    <div className="flex items-center gap-2 text-[var(--color-primary-text)] type-card-title">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>ระบุคาบสอนและครูสอนแทน</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="type-meta font-semibold">คาบเรียนที่ลา</label>
                        <select
                          value={leavePeriodNum}
                          onChange={(e) => setLeavePeriodNum(Number(e.target.value))}
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                        >
                          {periodsList.map((p) => (
                            <option key={p.period} value={p.period}>
                              {p.label} ({p.time})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="type-meta font-semibold">วิชาที่ติดสอน</label>
                        {courseTeacherOptions.length > 0 && (
                          <select
                            aria-label="กรองวิชาตามรายชื่อครู"
                            value={leaveTeacherFilter}
                            onChange={(e) => {
                              const nextTeacher = e.target.value;
                              setLeaveTeacherFilter(nextTeacher);
                              const matching = (courses.length > 0 ? courses : [fallbackCourse]).filter((c) =>
                                courseMatchesTeacherFilter(c, nextTeacher, courseTeacherOptions)
                              );
                              if (matching.length > 0 && !matching.some((c) => c.id === leaveCourseId)) {
                                setLeaveCourseId(matching[0].id);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                          >
                            <option value="all">ครูผู้สอนทุกคน ({courseTeacherOptions.length})</option>
                            {courseTeacherOptions.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label} ({opt.count} วิชา)
                              </option>
                            ))}
                          </select>
                        )}
                        <select
                          value={leaveCourseId}
                          onChange={(e) => setLeaveCourseId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                        >
                          {leaveFilteredCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} {c.titleTh} {c.room ? `(ห้อง ${c.room})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="type-meta font-semibold">ครูสอนแทน</label>
                      <select
                        value={leaveSubstituteTeacherId}
                        onChange={(e) => setLeaveSubstituteTeacherId(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                      >
                        <option value="">-- เลือกครูสอนแทน หรือเวรประจำวัน --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullNameTh} ({t.department} · {t.academicStanding})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="type-meta font-semibold">CC บุคคล/ตำแหน่งที่เกี่ยวข้อง</label>
                      <input
                        type="text"
                        value={leaveCcRoles}
                        onChange={(e) => setLeaveCcRoles(e.target.value)}
                        placeholder="เช่น หัวหน้ากลุ่มสาระฯ, รอง ผอ.วิชาการ"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs"
                      />
                    </div>

                    <div>
                      <label className="type-meta font-semibold">เลขที่บันทึกข้อความ / คำสั่ง (ถ้ามี)</label>
                      <input
                        type="text"
                        value={leaveMissionNumber}
                        onChange={(e) => setLeaveMissionNumber(e.target.value)}
                        placeholder="เช่น ศธ 04225/ว1234"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Leave Type */}
                <div className="space-y-1.5">
                  <label className="type-label block">ประเภทการลา</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveType('sick')}
                      className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                        leaveType === 'sick' 
                          ? 'bg-rose-50 dark:bg-rose-950 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200' 
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                      <span>ลาป่วย</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType('personal')}
                      className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                        leaveType === 'personal' 
                          ? 'bg-amber-50 dark:bg-amber-950 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200' 
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      <span>ลากิจ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType('official')}
                      className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                        leaveType === 'official' 
                          ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]' 
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>ไปราชการ</span>
                    </button>
                  </div>
                </div>

                {/* Date Range */}
                <div className={`grid ${leaveScope === 'period_hourly' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  <div className="space-y-1">
                    <label className="type-label block">
                      {leaveScope === 'period_hourly' ? 'วันที่ลา' : 'ตั้งแต่วันที่'}
                    </label>
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => {
                        setLeaveStartDate(e.target.value);
                        if (leaveScope === 'period_hourly') setLeaveEndDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] tabular-nums"
                      required
                    />
                  </div>
                  {leaveScope === 'full_day' && (
                    <div className="space-y-1">
                      <label className="type-label block">ถึงวันที่</label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] tabular-nums"
                        required
                      />
                    </div>
                  )}
                </div>
                    {/* Dual Approval Routing Preview for Student Leave (Requirement 2) */}
                    {((isSelfCheckin && loggedInProfile.userType === 'student') || (!isSelfCheckin && effectiveUserType === 'student')) && (() => {
                      const previewApprovers = resolveStudentLeaveApprovers({
                        student: selectedStudent || ownStudent,
                        teachers,
                        courses,
                        courseId: leaveScope === 'period_hourly' ? leaveCourseId : undefined,
                      });
                      return (
                        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-1.5">
                          <p className="text-[11px] font-bold text-sky-900 dark:text-sky-200">
                            เส้นทางการอนุมัติใบลานักเรียน (ส่งอนุมัติทั้ง 2 ฝ่ายอัตโนมัติ)
                          </p>
                          <div className="text-[11px] text-sky-800 dark:text-sky-300 space-y-0.5">
                            <p>
                              • <strong>ครูประจำชั้น:</strong> {previewApprovers.homeroomTeacherName}
                            </p>
                            <p>
                              • <strong>ครูประจำวิชา ({previewApprovers.subjectTeacherNames.length} ท่าน):</strong>{' '}
                              {previewApprovers.subjectTeacherNames.join(', ')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        if (leaveStartDate) setLeaveFormStep(2);
                      }}
                      className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <span>ถัดไป: ระบุเหตุผลและหลักฐาน</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {leaveFormStep === 2 && (
                  <div className="space-y-4">
                {/* Reason */}
                <div className="space-y-1">
                  <label className="type-label block">
                    {leaveScope === 'period_hourly' ? 'เหตุผลและภารกิจประกอบการลาสอน' : 'เหตุผลประกอบการลา'}
                  </label>
                  <textarea
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder={
                      leaveScope === 'period_hourly'
                        ? 'ระบุภารกิจราชการ หรืออาการป่วยกะทันหัน...'
                        : 'ระบุอาการเจ็บป่วย หรือภารกิจจำเป็น...'
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                {/* Medical certificate / Document attachment */}
                <div className="space-y-2">
                  <label className="type-label block">
                    {leaveScope === 'period_hourly' ? 'แนบคำสั่ง / ใบมอบหมายสอนแทน (ถ้ามี)' : 'แนบใบรับรองแพทย์ / เอกสาร (ถ้ามี)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sampleCert = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500';
                        setLeaveAttachmentUrl(sampleCert);
                      }}
                      className="text-[var(--color-primary-text)] hover:underline font-semibold flex items-center gap-1.5 underline-offset-4 cursor-pointer text-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>แนบเอกสารตัวอย่าง</span>
                    </button>
                    {leaveAttachmentUrl && (
                      <span className="type-meta text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>แนบแล้ว</span>
                      </span>
                    )}
                  </div>

                  {leaveAttachmentUrl && (
                    <div className="relative w-36 h-24 rounded-lg overflow-hidden border border-[var(--color-border)] mt-2">
                      <img src={leaveAttachmentUrl} alt="Document Attachment" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setLeaveAttachmentUrl('')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-black cursor-pointer"
                        aria-label="ลบไฟล์แนบ"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {leaveScope === 'period_hourly' ? 'ยื่นขอลาสอนคาบนี้ (แจ้งเตือน CC)' : 'ส่งคำขอใบลา'}
                  </span>
                </button>
                    <button
                      type="button"
                      onClick={() => setLeaveFormStep(1)}
                      className="w-full py-1 text-center type-meta hover:text-[var(--color-text-title)] font-semibold underline underline-offset-4 cursor-pointer"
                    >
                      ย้อนกลับแก้ไขวันลา
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Right: History of Leave Requests (Single-elevation divide-y list) */}
          <div className="lg:col-span-5 saas-card text-[var(--color-text-body)]">
            <div className="saas-card-header">
              <h4 className="type-section-title flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>
                  {isRestrictedViewer
                    ? `ประวัติใบลา (${scopedLeaveRequests.length})`
                    : `สถานะใบลาล่าสุด (${scopedLeaveRequests.length})`}
                </span>
              </h4>
            </div>

            <div className="saas-card-body">
              <div className="divide-y divide-[var(--color-border)]">
                <PagedList items={scopedLeaveRequests} pageSize={3} emptyState={<p className="type-meta py-4 text-center">ยังไม่มีประวัติใบลา</p>} renderItem={(rawReq) => {
                  const req = enrichLeaveRequestForDualApproval(rawReq, {
                    schoolId: activeSchoolId,
                    students,
                    teachers,
                    courses,
                  });
                  const isStudentLeave = req.userRole === 'student';
                  const subjectList = req.subjectApprovals || [];
                  const approvedSubjects = subjectList.filter((s) => s.status === 'approved').length;
                  const teacherRoleInfo = detectTeacherApprovalRoleForLeave(req, currentUser, teachers, courses);
                  return (
                  <div key={req.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="type-card-title truncate">{req.userName}</p>
                        <p className="type-meta truncate">
                          {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}
                          {' · '}
                          {req.leaveScope === 'period_hourly' ? `คาบที่ ${req.periodNumber || 1}${req.courseCode ? ` (${req.courseCode})` : ''} · ${req.startDate}` : `${req.startDate} – ${req.endDate}`}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1 type-label shrink-0 ${
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
                        <span>{req.status === 'approved' ? 'อนุมัติครบ' : req.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}</span>
                      </span>
                    </div>

                    {/* Dual Approval Status: Homeroom + Subject Teachers */}
                    {isStudentLeave && (
                      <div className="p-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--color-text-muted)] truncate">
                            ครูประจำชั้น: <strong className="text-[var(--color-text-title)]">{req.homeroomTeacherName || 'ครูประจำชั้น'}</strong>
                          </span>
                          <span className={`font-bold shrink-0 ${
                            req.homeroomApprovalStatus === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : req.homeroomApprovalStatus === 'rejected'
                                ? 'text-rose-700 dark:text-rose-300'
                                : 'text-amber-700 dark:text-amber-300'
                          }`}>
                            {req.homeroomApprovalStatus === 'approved' ? 'อนุมัติแล้ว' : req.homeroomApprovalStatus === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--color-text-muted)] truncate">
                            ครูประจำวิชา ({approvedSubjects}/{subjectList.length || 1}):{' '}
                            <strong className="text-[var(--color-text-title)]">
                              {(req.subjectTeacherNames || []).slice(0, 2).join(', ') || 'ครูผู้สอนรายวิชา'}
                            </strong>
                          </span>
                          <span className={`font-bold shrink-0 ${
                            subjectList.length > 0 && approvedSubjects === subjectList.length
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : subjectList.some((s) => s.status === 'rejected')
                                ? 'text-rose-700 dark:text-rose-300'
                                : 'text-amber-700 dark:text-amber-300'
                          }`}>
                            {subjectList.length > 0 && approvedSubjects === subjectList.length
                              ? 'อนุมัติครบ'
                              : subjectList.some((s) => s.status === 'rejected')
                                ? 'ไม่อนุมัติ'
                                : approvedSubjects > 0
                                  ? `อนุมัติแล้ว ${approvedSubjects}`
                                  : 'รออนุมัติ'}
                          </span>
                        </div>
                      </div>
                    )}

                    {req.leaveScope === 'period_hourly' && (
                      <p className="type-meta text-[var(--color-primary-text)]">
                        สอนแทน: {req.substituteTeacherName || 'ยังไม่ระบุ'}
                        {req.ccEmailsOrRoles ? ` · CC: ${req.ccEmailsOrRoles}` : ''}
                      </p>
                    )}

                    <p className="type-body">"{req.reason}"</p>

                    {req.attachmentUrl && (
                      <div className="flex items-center gap-1 type-meta text-[var(--color-primary-text)]">
                        <FileText className="w-3 h-3" />
                        <span>มีเอกสารแนบ</span>
                      </div>
                    )}

                    {req.approvalRemarks && (
                      <p className="type-meta">
                        ผู้อนุมัติ: {req.approvedBy} ({req.approvalRemarks})
                      </p>
                    )}

                    {req.status === 'pending' && onUpdateLeaveStatus && (currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        {isStudentLeave ? (
                          <>
                            {req.homeroomApprovalStatus !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => onUpdateLeaveStatus(req.id, 'approved', 'ครูประจำชั้นอนุมัติผ่านมือถือ', 'homeroom')}
                                className="flex-1 min-w-[118px] py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition cursor-pointer inline-flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติ (ครูประจำชั้น)</span>
                              </button>
                            )}
                            {!(subjectList.length > 0 && approvedSubjects === subjectList.length) && (
                              <button
                                type="button"
                                onClick={() => onUpdateLeaveStatus(req.id, 'approved', 'ครูประจำวิชาอนุมัติผ่านมือถือ', 'subject')}
                                className="flex-1 min-w-[118px] py-1.5 px-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] transition cursor-pointer inline-flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติ (ครูวิชา)</span>
                              </button>
                            )}
                            {(isSchoolAdmin || (teacherRoleInfo.isHomeroom && teacherRoleInfo.isSubject)) && (
                              <button
                                type="button"
                                onClick={() => onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติครบทั้ง 2 ฝ่าย', 'both')}
                                className="py-1.5 px-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] transition cursor-pointer"
                              >
                                อนุมัติทั้ง 2 ฝ่าย
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ', 'both')}
                              className="py-1.5 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold text-[11px] transition cursor-pointer inline-flex items-center justify-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติผ่านระบบมือถือ', 'both')}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ', 'both')}
                              className="py-1.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                }} />
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2B: NFC SCHOOL ID CARD TAP CHECK-IN (TEACHERS & STUDENTS)             */}
      {/* ========================================================================= */}
      {subTab === 'nfc_tap' && (
        <div className={`space-y-4 ${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}`}>
          {/* Top Terminal Card */}
          <div className="saas-card">
            <div className="saas-card-header">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isNfcScanning
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--tone-soft)] text-[var(--tone)]'
                }`}>
                  <Nfc className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="type-section-title truncate">
                    {lang === 'th' ? 'เช็คชื่อด้วยบัตร NFC' : 'NFC ID Card Check-in'}
                  </h2>
                  <p className="type-meta truncate">
                    {isStaffUser
                      ? (lang === 'th'
                        ? 'แตะบัตรนักเรียนหรือครูเพื่อบันทึกเวลาทันที'
                        : 'Tap a student or teacher NFC ID card to log attendance.')
                      : (lang === 'th'
                        ? 'แตะบัตรนักเรียน NFC ของคุณเพื่อลงเวลา'
                        : 'Tap your NFC student ID card to log attendance.')}
                  </p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1 type-meta font-semibold shrink-0 ${
                webNfcAvailable && secureNfc
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-[var(--color-text-muted)]'
              }`}>
                <Nfc className="w-3.5 h-3.5" />
                <span>
                  {webNfcAvailable && secureNfc
                    ? (lang === 'th' ? 'Web NFC พร้อม' : 'Web NFC Ready')
                    : (lang === 'th' ? 'โหมด USB / UID' : 'USB / UID Mode')}
                </span>
              </span>
            </div>

            <div className="saas-card-body space-y-4">

            {/* Mode Controls: IN/OUT + Gate + (Staff Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setNfcCheckType('check_in')}
                  className={`flex-1 min-h-[40px] px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    nfcCheckType === 'check_in'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'เข้าเรียน' : 'Check In'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNfcCheckType('check_out')}
                  className={`flex-1 min-h-[40px] px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    nfcCheckType === 'check_out'
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'ออกโรงเรียน' : 'Check Out'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                {normalizedGates.length > 1 && selectedGate ? (
                  <select
                    aria-label={lang === 'th' ? 'จุดสแกน NFC' : 'NFC Gate'}
                    value={selectedGate.id}
                    onChange={(e) => setSelectedGateId(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-[var(--color-text-title)] focus:outline-hidden"
                  >
                    {normalizedGates.map((gate) => (
                      <option key={gate.id} value={gate.id}>
                        {gate.nameTh}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex-1 min-w-0 text-xs font-semibold text-[var(--color-text-title)] truncate">
                    {selectedGate ? selectedGate.nameTh : (lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set')}
                  </span>
                )}
              </div>

              {isStaffUser && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  {(['present', 'late'] as const).map((stt) => (
                    <button
                      key={stt}
                      type="button"
                      onClick={() => setNfcStatusMode(stt)}
                      className={`flex-1 min-h-[40px] px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                        nfcStatusMode === stt
                          ? stt === 'present'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-amber-500 text-slate-950'
                          : 'text-[var(--color-text-body)]'
                      }`}
                    >
                      {stt === 'present' ? (lang === 'th' ? 'สถานะ: มา' : 'Present') : (lang === 'th' ? 'สถานะ: สาย' : 'Late')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live Web NFC Tap Pad */}
            <div className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-col items-center text-center gap-3 ${
              isNfcScanning
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
            }`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${
                isNfcScanning
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--color-card)] text-[var(--color-primary-text)] border border-[var(--color-border)]'
              }`}>
                <Nfc className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-md">
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  {isNfcScanning
                    ? (lang === 'th' ? 'กำลังรอสัญญาณแตะบัตร NFC...' : 'Listening for NFC Card Tap...')
                    : webNfcAvailable && secureNfc
                      ? (lang === 'th' ? 'แตะปุ่มด้านล่างเพื่อเปิดรับสัญญาณบัตร NFC' : 'Tap below to activate NFC reader')
                      : (lang === 'th' ? 'อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับ Web NFC โดยตรง' : 'Direct Web NFC is unavailable on this browser')}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {webNfcAvailable && secureNfc
                    ? (lang === 'th'
                      ? 'รองรับบัตรนักเรียน/บุคลากร MIFARE, NTAG213/215 และแท็ก NFC ที่มี NDEF หรือ Serial UID'
                      : 'Supports MIFARE, NTAG ID cards, and NDEF student/staff tags.')
                    : (lang === 'th'
                      ? 'Web NFC รองรับบน Chrome สำหรับ Android (HTTPS) — สำหรับ iOS หรือคอมพิวเตอร์ สามารถเสียบเครื่องอ่าน USB/RFID หรือกรอก UID บัตรด้านล่างได้ทันที'
                      : 'Web NFC requires Android Chrome over HTTPS. On iOS/Desktop, connect a USB NFC reader or type card UID below.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                {webNfcAvailable && secureNfc && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isNfcScanning) stopNfcScanning();
                      else void handleStartWebNfcScan();
                    }}
                    className={`min-h-[44px] px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition ${
                      isNfcScanning
                        ? 'bg-rose-700 hover:bg-rose-800 text-white'
                        : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                    }`}
                  >
                    <Nfc className="w-4 h-4" />
                    <span>
                      {isNfcScanning
                        ? (lang === 'th' ? 'หยุดรอรับสัญญาณ NFC' : 'Stop NFC Reader')
                        : (lang === 'th' ? 'เปิดเครื่องอ่าน NFC (แตะบัตร)' : 'Start Web NFC Scan')}
                    </span>
                  </button>
                )}

                {isRestrictedViewer && ownStudent && (
                  <button
                    type="button"
                    onClick={() => handleProcessNfcCardInput(ownStudent.nfcCardUid || ownStudent.studentIdNumber)}
                    className="min-h-[44px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span>
                      {lang === 'th'
                        ? `เช็คชื่อด้วยบัตรของฉัน (${ownStudent.studentIdNumber})`
                        : `Tap My ID (${ownStudent.studentIdNumber})`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {nfcStatusMessage && (
              <div role="status" className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                <span>{nfcStatusMessage}</span>
              </div>
            )}

            {nfcErrorMessage && (
              <div role="alert" className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                <span>{nfcErrorMessage}</span>
              </div>
            )}

            {/* USB / Keyboard-Wedge NFC Reader & Manual Card UID Entry */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nfcManualUidInput.trim()) return;
                handleProcessNfcCardInput(nfcManualUidInput);
                setNfcManualUidInput('');
              }}
              className="space-y-1.5"
            >
              <label className="text-xs font-bold text-[var(--color-text-title)] block">
                {lang === 'th'
                  ? 'แตะผ่านเครื่องอ่าน USB NFC / กรอกเลข UID บัตร หรือรหัสประจำตัว'
                  : 'USB NFC Reader / Card UID or ID Number'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <CreditCard className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nfcManualUidInput}
                    onChange={(e) => setNfcManualUidInput(e.target.value)}
                    placeholder={
                      lang === 'th'
                        ? `สแกน UID บัตร (เช่น 04:A2:19:FA) หรือ ${students[0]?.studentIdNumber || 'ED-6901'}`
                        : 'Card UID (e.g. 04:A2:19:FA) or ID number'
                    }
                    className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-mono text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!nfcManualUidInput.trim()}
                  className="min-h-[44px] px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'th' ? 'บันทึกแตะบัตร' : 'Log Card Tap'}</span>
                </button>
              </div>
            </form>

            {/* Unregistered Card Binding Prompt */}
            {unregisteredNfcTag && (
              <div className="p-3.5 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary)] space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--color-text-title)]">
                    {lang === 'th'
                      ? `ผูกบัตร NFC UID: ${unregisteredNfcTag.uid}`
                      : `Bind NFC Card UID: ${unregisteredNfcTag.uid}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnregisteredNfcTag(null)}
                    className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                    aria-label="ปิด"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isStaffUser ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
                      <button
                        type="button"
                        onClick={() => setBindTargetType('student')}
                        className={`flex-1 py-1.5 rounded-md font-bold text-xs cursor-pointer ${
                          bindTargetType === 'student' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)]'
                        }`}
                      >
                        {lang === 'th' ? 'นักเรียน' : 'Student'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBindTargetType('teacher')}
                        className={`flex-1 py-1.5 rounded-md font-bold text-xs cursor-pointer ${
                          bindTargetType === 'teacher' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)]'
                        }`}
                      >
                        {lang === 'th' ? 'ครู/บุคลากร' : 'Teacher'}
                      </button>
                    </div>

                    <select
                      value={bindTargetId}
                      onChange={(e) => setBindTargetId(e.target.value)}
                      className="sm:col-span-2 min-h-[40px] px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                    >
                      {bindTargetType === 'student'
                        ? students.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber})
                            </option>
                          ))
                        : teachers.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              {tc.fullNameTh} ({tc.teacherIdNumber})
                            </option>
                          ))}
                    </select>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleBindUnregisteredNfcCard}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Link2 className="w-4 h-4" />
                  <span>
                    {lang === 'th'
                      ? 'ผูกบัตรกับบุคคลนี้และเช็คชื่อทันที'
                      : 'Bind Card & Check In Now'}
                  </span>
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Mobile: Compact 2-Button Drawer Triggers; Desktop: Clean 2-Col Secondary Cards */}
          {embeddedMobile ? (
            <div className="saas-kpi-strip grid grid-cols-2 divide-x divide-[var(--color-border)]">
              {isStaffUser && (teachers.length > 0 || students.length > 0) && (
                <button
                  type="button"
                  onClick={() => setNfcDrawerMode('quick_tap')}
                  className="px-3 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer min-w-0"
                >
                  <div className="min-w-0">
                    <p className="type-card-title truncate">{lang === 'th' ? 'แตะบัตรด่วน' : 'Quick ID Tap'}</p>
                    <p className="type-meta tabular-nums truncate">{lang === 'th' ? `ผูกบัตร ${nfcBindings.length} ใบ` : `${nfcBindings.length} bound`}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setNfcDrawerMode('recent_logs')}
                className={`px-3 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer min-w-0 ${!(isStaffUser && (teachers.length > 0 || students.length > 0)) ? 'col-span-2' : ''}`}
              >
                <div className="min-w-0">
                  <p className="type-card-title truncate">{lang === 'th' ? 'ประวัติแตะบัตร' : 'Tap History'}</p>
                  <p className="type-meta tabular-nums truncate">{nfcRecentLogs.length} {lang === 'th' ? 'รายการ' : 'taps'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Staff Quick Card Tap Strip (Teachers & Students) */}
              {isStaffUser && (teachers.length > 0 || students.length > 0) && (
                <div className="saas-card">
                  <div className="saas-card-header">
                    <h3 className="type-card-title">
                      {lang === 'th' ? 'แตะบัตรด่วน' : 'Quick ID Tap'}
                    </h3>
                    <span className="type-meta">
                      {lang === 'th' ? `ผูกบัตร ${nfcBindings.length} ใบ` : `${nfcBindings.length} bound`}
                    </span>
                  </div>

                  <div className="saas-card-body space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {teachers.slice(0, 3).map((tc) => (
                        <button
                          key={tc.id}
                          type="button"
                          onClick={() => handleProcessNfcCardInput(tc.nfcCardUid || tc.teacherIdNumber)}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Nfc className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                          <span className="truncate max-w-[140px]">{tc.fullNameTh}</span>
                          <span className="font-mono type-meta">{tc.teacherIdNumber}</span>
                        </button>
                      ))}
                      {students.slice(0, 4).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleProcessNfcCardInput(st.nfcCardUid || st.studentIdNumber)}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Nfc className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{st.firstNameTh} {st.lastNameTh}</span>
                          <span className="font-mono type-meta">{st.studentIdNumber}</span>
                        </button>
                      ))}
                    </div>

                    {nfcBindings.length > 0 && (
                      <div className="pt-2.5 border-t border-[var(--color-border)] space-y-1.5">
                        <p className="type-meta font-semibold">
                          {lang === 'th' ? 'บัตร NFC ที่จับคู่บนอุปกรณ์นี้' : 'Paired NFC Cards'}
                        </p>
                        <div className="divide-y divide-[var(--color-border)]">
                          {nfcBindings.slice(0, 5).map((b) => (
                            <div key={b.normalizedUid} className="py-1.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="type-card-title">{b.label}</span>
                                <span className="ml-2 font-mono type-meta">
                                  {b.uid} · {b.displayId}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setNfcBindings(removeNfcBinding(activeSchoolId, b.uid))}
                                className="btn-icon-tool text-rose-600 dark:text-rose-300"
                                title={lang === 'th' ? 'ยกเลิกการผูกบัตร' : 'Unbind card'}
                                aria-label={lang === 'th' ? 'ยกเลิกการผูกบัตร' : 'Unbind card'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent NFC Tap Log */}
              <div className="saas-card">
                <div className="saas-card-header">
                  <h3 className="type-card-title">
                    {lang === 'th' ? 'บันทึกการแตะบัตรล่าสุด' : 'Recent NFC Check-ins'}
                  </h3>
                  <span className="type-meta font-mono">
                    {nfcRecentLogs.length} {lang === 'th' ? 'รายการ' : 'taps'}
                  </span>
                </div>

                <div className="saas-card-body">
                  {nfcRecentLogs.length === 0 ? (
                    <p className="type-meta text-center py-4">
                      {lang === 'th' ? 'ยังไม่มีรายการแตะบัตร NFC ในเซสชันนี้' : 'No NFC taps recorded in this session yet.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--color-border)]">
                      {nfcRecentLogs.map((log) => (
                        <div key={log.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="type-card-title truncate">{log.name}</p>
                            <p className="type-meta truncate">
                              {log.roleLabel} · UID {log.uid} · {log.gateName}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`type-label ${
                              log.checkType === 'check_in'
                                ? log.status === 'late'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-emerald-700 dark:text-emerald-300'
                                : 'text-[var(--color-primary-text)]'
                            }`}>
                              {log.checkType === 'check_in' ? (log.status === 'late' ? 'เข้า · สาย' : 'เข้าเรียน') : 'ออกโรงเรียน'}
                            </span>
                            <p className="type-meta font-mono">
                              {log.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEACHER PROXY CHECK-IN (REQUIRES STUDENT ID BEFORE CHECK-IN) */}
      {/* ========================================================================= */}
      {subTab === 'teacher_proxy' && isStaffUser && (
        <div className={`space-y-4 ${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}`}>
          <div className="saas-card">
            <div className="saas-card-header">
              <div>
                <h3 className="type-section-title flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>ลงชื่อเข้า-ออกแทนนักเรียน</span>
                </h3>
                <p className="type-meta mt-0.5">
                  ระบุรหัสนักเรียนเพื่อยืนยันตัวตนก่อนบันทึกเวลา
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProxyShowRosterHint(!proxyShowRosterHint)}
                className="text-xs font-semibold text-[var(--color-primary-text)] underline underline-offset-4 cursor-pointer self-start sm:self-auto"
              >
                {proxyShowRosterHint ? 'ซ่อนรายชื่อ' : 'ดูรายชื่อ & รหัส'}
              </button>
            </div>

            <div className="saas-card-body space-y-3.5">
              {proxySavedNotification && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <span>{proxySavedNotification}</span>
                </div>
              )}

              {/* Step 1: Required Student ID Input (Single elevation, no nested box) */}
              <div className="space-y-3 type-body">
                <div className="space-y-1.5">
                  <label className="type-label block">
                    รหัสนักเรียน <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={proxyStudentIdInput}
                      onChange={(e) => setProxyStudentIdInput(e.target.value)}
                      placeholder={`เช่น ${students[0]?.studentIdNumber || 'ED-6901'}`}
                      className="w-full pl-8 pr-8 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    {proxyStudentIdInput && (
                      <button
                        type="button"
                        onClick={() => setProxyStudentIdInput('')}
                        className="absolute right-2.5 top-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                        aria-label="ล้างรหัสนักเรียน"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {students.length > 0 && !trimmedProxyStudentId && (
                    <p className="type-meta">
                      ตัวอย่าง: {students.slice(0, 3).map((s) => s.studentIdNumber).join(', ')}
                    </p>
                  )}
                </div>

                {/* Verification Feedback & Check-in Controls */}
                {!trimmedProxyStudentId ? (
                  <p className="type-meta flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>กรุณาระบุรหัสนักเรียนด้านบนก่อนบันทึกเวลา</span>
                  </p>
                ) : !matchedProxyStudent ? (
                  <p className="type-meta text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>ไม่พบนักเรียนรหัส "{trimmedProxyStudentId}"</span>
                  </p>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={matchedProxyStudent.avatarUrl}
                        alt={matchedProxyStudent.firstNameTh}
                        className="w-10 h-10 rounded-lg object-cover border border-emerald-400 dark:border-emerald-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="type-card-title text-emerald-950 dark:text-emerald-100">
                            {matchedProxyStudent.firstNameTh} {matchedProxyStudent.lastNameTh}
                          </span>
                          <span className="inline-flex items-center gap-1 type-meta text-emerald-700 dark:text-emerald-300 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ยืนยันแล้ว</span>
                          </span>
                        </div>
                        <p className="type-meta text-emerald-900 dark:text-emerald-200 font-mono">
                          {matchedProxyStudent.studentIdNumber} · {matchedProxyStudent.gradeLevel} {matchedProxyStudent.room}
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Check-in / Check-out & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <span className="type-meta font-semibold block">ประเภทบันทึก</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setProxyCheckType('check_in')}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                              proxyCheckType === 'check_in'
                                ? 'bg-emerald-700 text-white'
                                : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                            }`}
                          >
                            เข้าโรงเรียน
                          </button>
                          <button
                            type="button"
                            onClick={() => setProxyCheckType('check_out')}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                              proxyCheckType === 'check_out'
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                            }`}
                          >
                            ออกโรงเรียน
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="type-meta font-semibold block">สถานะ</span>
                        <div className="flex flex-wrap gap-1">
                          {(['present', 'late', 'sick', 'absent'] as AttendanceStatus[]).map((stt) => (
                            <button
                              key={stt}
                              type="button"
                              onClick={() => setProxySingleStatus(stt)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                proxySingleStatus === stt
                                  ? stt === 'present' ? 'bg-emerald-700 text-white' :
                                    stt === 'late' ? 'bg-amber-500 text-slate-950' :
                                    stt === 'sick' ? 'bg-[var(--color-primary)] text-white' : 'bg-rose-700 text-white'
                                  : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                              }`}
                            >
                              {stt === 'present' ? 'มา' : stt === 'late' ? 'สาย' : stt === 'sick' ? 'ลา' : 'ขาด'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => runWithBiometricGuard(() => handleConfirmProxySingleCheckin())}
                      className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>ยืนยันเช็คชื่อ ({matchedProxyStudent.studentIdNumber})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional Reference Roster */}
          {proxyShowRosterHint && (
            <div className="saas-card">
              <div className="saas-card-header">
                <span className="type-card-title">
                  รายชื่ออ้างอิง ({filteredProxyStudents.length} คน)
                </span>
                <select
                  aria-label="กรองตามระดับชั้น"
                  value={proxyGradeFilter}
                  onChange={(e) => setProxyGradeFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
                >
                  <option value="all">ทุกระดับชั้น</option>
                  <option value="มัธยมศึกษาปีที่ 4 (M.4)">ม.4</option>
                  <option value="มัธยมศึกษาปีที่ 5 (M.5)">ม.5</option>
                  <option value="มัธยมศึกษาปีที่ 6 (M.6)">ม.6</option>
                </select>
              </div>
              <div className="saas-card-body">
                <div className="divide-y divide-[var(--color-border)]">
                  <PagedList items={filteredProxyStudents} pageSize={4} renderItem={(st) => (
                    <div key={st.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={st.avatarUrl} alt={st.firstNameTh} className="w-8 h-8 rounded-lg object-cover border border-[var(--color-border)] shrink-0" />
                        <div className="min-w-0">
                          <p className="type-card-title truncate">{st.firstNameTh} {st.lastNameTh}</p>
                          <p className="type-meta truncate">{st.gradeLevel} {st.room}</p>
                        </div>
                      </div>
                      <span className="font-mono type-meta font-semibold text-[var(--color-text-title)] shrink-0">
                        {st.studentIdNumber}
                      </span>
                    </div>
                  )} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PERIOD ATTENDANCE (รายคาบ) - WITH QR CODE & CHECK-IN LINK */}
      {/* ========================================================================= */}
      {subTab === 'period_checkin' && (
        <div className={`${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto space-y-3 p-0.5' : 'space-y-4'}`}>
          <div className="saas-card">
            <div className="saas-card-header">
              <div>
                <h3 className="type-section-title flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span>เช็คชื่อรายคาบ (QR &amp; Link)</span>
                </h3>
                <p className="type-meta mt-0.5">
                  {isRestrictedViewer
                    ? 'สแกน QR Code หรือเปิดลิงก์เพื่อเช็คชื่อเข้าคาบเรียน'
                    : `${periodStudentIds.length} นักเรียนในรายวิชานี้`}
                </p>
              </div>
              {isStaffUser && (
                <button
                  type="button"
                  onClick={() => runWithBiometricGuard(() => handleSavePeriodAttendance())}
                  className="btn-action-primary px-3.5 py-1.5 self-start sm:self-auto"
                >
                  บันทึกรายชื่อทั้งคาบ
                </button>
              )}
            </div>

            <div className="saas-card-body space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {!isRestrictedViewer && courseTeacherOptions.length > 0 && (
                  <div>
                    <label className="type-meta font-semibold">ครูผู้สอน</label>
                    <select
                      aria-label="กรองวิชาตามรายชื่อครู"
                      value={periodTeacherFilter}
                      onChange={(e) => {
                        const nextTeacher = e.target.value;
                        setPeriodTeacherFilter(nextTeacher);
                        const matching = (courses.length > 0 ? courses : [fallbackCourse]).filter((c) =>
                          courseMatchesTeacherFilter(c, nextTeacher, courseTeacherOptions)
                        );
                        if (matching.length > 0 && !matching.some((c) => c.id === selectedCourseId)) {
                          setSelectedCourseId(matching[0].id);
                        }
                      }}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
                    >
                      <option value="all">ทุกคน ({courseTeacherOptions.length})</option>
                      {courseTeacherOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} ({opt.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={!isRestrictedViewer && courseTeacherOptions.length > 0 ? '' : 'sm:col-span-2 lg:col-span-2'}>
                  <label className="type-meta font-semibold">รายวิชา</label>
                  <select
                    value={selectedCourse.id}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
                  >
                    {periodFilteredCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} {c.titleTh}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="type-meta font-semibold">คาบเรียน (ตามตารางโรงเรียน)</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
                  >
                    {periodsList.map(p => (
                      <option key={p.period} value={p.period}>{p.label} ({p.time})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="type-meta font-semibold">วันที่</label>
                  {isRestrictedViewer ? (
                    <div className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs tabular-nums font-medium">
                      {periodDate} (วันนี้)
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={periodDate}
                      onChange={(e) => setPeriodDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs tabular-nums"
                    />
                  )}
                </div>
              </div>

              {periodSavedNotification && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <span>{periodSavedNotification}</span>
                </div>
              )}

              {/* Requirement 1: Classroom GPS Setup Card for Staff/Teachers */}
              {!isRestrictedViewer && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  classroomGps
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className={`w-4 h-4 shrink-0 ${classroomGps ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <span className="text-xs font-bold text-[var(--color-text-title)]">
                        พิกัด GPS ห้องเรียน ({selectedCourse.room || selectedCourse.code})
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold ${
                      classroomGps ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                    }`}>
                      {classroomGps
                        ? `ตั้งค่าแล้ว · รัศมี ${classroomGps.radiusMeters} ม.`
                        : 'จำเป็นต้องตั้งพิกัดห้องเรียนก่อนเช็คชื่อรายคาบ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">ละติจูด (Lat)</label>
                      <input
                        type="text"
                        value={roomLatInput}
                        onChange={(e) => setRoomLatInput(e.target.value)}
                        placeholder="เช่น 13.756331"
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">ลองจิจูด (Lng)</label>
                      <input
                        type="text"
                        value={roomLngInput}
                        onChange={(e) => setRoomLngInput(e.target.value)}
                        placeholder="เช่น 100.501762"
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">รัศมีห้อง (ม.)</label>
                      <select
                        value={roomRadiusInput}
                        onChange={(e) => setRoomRadiusInput(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                      >
                        <option value={20}>20 ม.</option>
                        <option value={30}>30 ม.</option>
                        <option value={40}>40 ม.</option>
                        <option value={50}>50 ม.</option>
                        <option value={80}>80 ม.</option>
                        <option value={100}>100 ม.</option>
                      </select>
                    </div>
                    <div className="sm:col-span-4 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleDetectRoomGps}
                        disabled={isLocatingRoom}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        <LocateFixed className={`w-3.5 h-3.5 ${isLocatingRoom ? 'animate-spin' : ''}`} />
                        <span>{isLocatingRoom ? 'กำลังดึง...' : 'ดึงพิกัดห้องเรียนนี้'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveManualRoomGps}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>

                  {roomGpsNotice && (
                    <p className={`text-[11px] font-semibold ${
                      roomGpsNotice.type === 'ok'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      {roomGpsNotice.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QR CODE & SHAREABLE CHECK-IN LINK CARD (Staff / Teachers only) */}
          {!isRestrictedViewer && (
            <div className="saas-card bg-[var(--color-primary-light)]">
              <div className="saas-card-body flex flex-col sm:flex-row items-center gap-4">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <QrCodeMatrix
                    value={periodCheckinUrl}
                    size={embeddedMobile ? 132 : 148}
                    label={`QR Code เช็คชื่อคาบเรียน ${selectedCourse.code} คาบที่ ${selectedPeriod}`}
                  />
                  <span className="type-meta font-mono font-bold text-[var(--color-primary-text)]">
                    {expectedPeriodCode}
                  </span>
                </div>

                <div className="flex-1 min-w-0 w-full space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="type-section-title flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                      <span>QR &amp; ลิงก์เช็คชื่อรายคาบ</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPeriodQrModal(true)}
                      className="btn-icon-tool"
                      title="ขยาย QR เต็มจอสำหรับฉายขึ้นโปรเจกเตอร์"
                      aria-label="ขยาย QR เต็มจอ"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    </button>
                  </div>

                  <p className="type-meta text-[var(--color-text-body)]">
                    <strong className="text-[var(--color-text-title)]">{selectedCourse.code} {selectedCourse.titleTh}</strong> · คาบที่ {selectedPeriod} · {periodDate}
                  </p>

                  <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={periodCheckinUrl}
                      aria-label="ลิงก์เช็คชื่อรายคาบ"
                      className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-[var(--color-text-title)] focus:outline-hidden truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPeriodLink}
                      className="btn-icon-tool bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white border-transparent"
                      title={periodQrCopied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์เช็คชื่อ'}
                      aria-label={periodQrCopied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์เช็คชื่อ'}
                    >
                      {periodQrCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-0.5">
                    <a
                      href={periodCheckinUrl}
                      className="font-bold text-[var(--color-primary-text)] underline underline-offset-4 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดลิงก์เช็คชื่อ</span>
                    </a>
                    {isStaffUser && (
                      <span className="type-meta text-emerald-700 dark:text-emerald-300 font-semibold">
                        เช็คแล้ว:{' '}
                        {
                          periodAttendance.filter(
                            (p) => p.courseId === selectedCourse.id && p.periodNumber === selectedPeriod && p.date === periodDate && (p.status === 'present' || p.status === 'late')
                          ).length
                        }{' '}
                        / {periodStudentIds.length} คน
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT VIEW: 1-TAP PERIOD CHECK-IN/OUT + OPTIONAL QR CODE + OWN RECORD ONLY */}
          {isRestrictedViewer ? (
            <div className="space-y-4">
              <div
                className={`saas-card transition ${
                  selectedPeriodTimeActivity.isActive
                    ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/40 dark:bg-rose-950/25'
                    : ''
                }`}
              >
                <div className="saas-card-header">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={selectedStudent?.avatarUrl}
                      alt={selectedStudent?.firstNameTh}
                      className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="type-card-title truncate">
                        {selectedStudent?.firstNameTh} {selectedStudent?.lastNameTh}
                      </p>
                      <p className="type-meta font-mono">
                        {selectedStudent?.studentIdNumber} · {selectedStudent?.room}
                      </p>
                    </div>
                  </div>
                  <div className="seg-tab-group">
                    <button
                      type="button"
                      data-active={periodCheckType === 'check_in'}
                      onClick={() => setPeriodCheckType('check_in')}
                      className="seg-tab-btn flex items-center gap-1"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>เข้าเรียน</span>
                    </button>
                    <button
                      type="button"
                      data-active={periodCheckType === 'check_out'}
                      onClick={() => setPeriodCheckType('check_out')}
                      className="seg-tab-btn flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ออกคาบ</span>
                    </button>
                  </div>
                </div>

                <div className="saas-card-body space-y-3">
                  {selectedPeriodTimeActivity.isActive && (
                    <div className="p-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-between gap-2 tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          ถึงเวลาคาบเรียนที่ {selectedPeriod} ({selectedPeriodMeta?.time})
                        </span>
                      </span>
                      {selectedPeriodTimeActivity.remainingMinutes !== null && (
                        <span>เหลือ {selectedPeriodTimeActivity.remainingMinutes} น.</span>
                      )}
                    </div>
                  )}

                  {/* Requirement 1: Student Classroom GPS Status Strip */}
                  {(() => {
                    const roomCheck =
                      classroomGps && realGpsCoords
                        ? checkDistanceToClassroomGps(realGpsCoords, classroomGps)
                        : null;
                    return (
                      <div className={`p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                        !classroomGps
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                          : roomCheck?.inRange
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-semibold">
                            {!classroomGps
                              ? `ยังไม่ได้ตั้งพิกัดห้องเรียน (${selectedCourse.room || selectedCourse.code}) กรุณาแจ้งครูผู้สอน`
                              : !realGpsCoords
                                ? `ห้อง ${classroomGps.room} (รัศมี ${classroomGps.radiusMeters} ม.) · รออ่านพิกัด GPS ของคุณ`
                                : roomCheck?.inRange
                                  ? `อยู่ในพิกัดห้อง ${classroomGps.room} (ห่าง ${roomCheck.distanceMeters} ม. / รัศมี ${roomCheck.radiusMeters} ม.)`
                                  : `อยู่นอกพิกัดห้อง ${classroomGps.room} (ห่าง ${roomCheck?.distanceMeters.toLocaleString()} ม. / รัศมี ${roomCheck?.radiusMeters} ม.)`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!navigator.geolocation) return;
                            setIsGpsLoading(true);
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setRealGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                                setIsGpsLoading(false);
                              },
                              () => setIsGpsLoading(false),
                              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                            );
                          }}
                          className="px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-current/20 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <LocateFixed className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
                          <span>อัปเดต GPS</span>
                        </button>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleStudentSelfPeriodCheckin()}
                      className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                        selectedPeriodTimeActivity.isActive
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : periodCheckType === 'check_in'
                            ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                            : 'bg-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      {periodCheckType === 'check_in' ? (
                        <LogIn className="w-4 h-4" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      <span>
                        {periodCheckType === 'check_in'
                          ? `ยืนยันเข้าคาบ ${selectedCourse.code} (คาบ ${selectedPeriod})`
                          : `ยืนยันออกคาบ ${selectedCourse.code} (คาบ ${selectedPeriod})`}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
                    <label className="type-label block">
                      หรือกรอกลิงก์/รหัส QR จากครูผู้สอน (ไม่บังคับ)
                    </label>
                    <div className="relative flex-1">
                      <ScanLine className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={studentPeriodCodeInput}
                        onChange={(e) => setStudentPeriodCodeInput(e.target.value)}
                        placeholder={`วางลิงก์หรือรหัสคาบ เช่น ${expectedPeriodCode}`}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {studentPeriodCheckinMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                      <span>{studentPeriodCheckinMsg}</span>
                    </div>
                  )}

                  {studentPeriodCheckinError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 type-meta font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0" />
                      <span>{studentPeriodCheckinError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Only this student's own period check-in history */}
              <div className="saas-card">
                <div className="saas-card-header">
                  <h4 className="type-card-title">
                    ประวัติเช็คชื่อรายคาบ ({scopedPeriodAttendance.length})
                  </h4>
                </div>
                <div className="saas-card-body">
                  {scopedPeriodAttendance.length === 0 ? (
                    <p className="type-meta text-center py-4">
                      ยังไม่มีบันทึกเช็คชื่อรายคาบของคุณ
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--color-border)]">
                      <PagedList
                        items={scopedPeriodAttendance}
                        pageSize={4}
                        renderItem={(rec) => (
                          <div key={rec.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="type-card-title truncate">
                                {rec.courseCode} · คาบที่ {rec.periodNumber}
                              </p>
                              <p className="type-meta truncate">
                                {rec.date} ({rec.timeSlot}) · {rec.checkMethod === 'qr_code' ? 'QR/ลิงก์' : 'อาจารย์เช็คชื่อ'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center gap-1 type-label shrink-0 ${
                              rec.status === 'present'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : rec.status === 'late'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : rec.status === 'excused'
                                    ? 'text-[var(--color-primary-text)]'
                                    : 'text-rose-700 dark:text-rose-300'
                            }`}>
                              {rec.status === 'present' ? 'เข้าเรียน' : rec.status === 'late' ? 'สาย' : rec.status === 'excused' ? 'ลา' : 'ขาด'}
                            </span>
                          </div>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : periodStudentIds.length === 0 ? (
            <div className="saas-card p-6 text-center type-meta">
              ยังไม่มีรายชื่อนักเรียนในโรงเรียนนี้
            </div>
          ) : (
            <div className="saas-card overflow-hidden">
              {(() => {
                const recordByStudent = new Map<string, PeriodAttendanceRecord>();
                for (const p of periodAttendance) {
                  if (p.courseId === selectedCourse.id && p.date === periodDate && p.periodNumber === selectedPeriod) {
                    recordByStudent.set(p.studentId, p);
                  }
                }
                const uncheckedCount = periodStudentIds.filter((id) => !recordByStudent.has(id)).length;
                const proxyCount = periodStudentIds.filter((id) => recordByStudent.get(id)?.checkMethod === 'teacher_proxy').length;
                const mobileCount = periodStudentIds.filter((id) => recordByStudent.get(id)?.checkMethod === 'qr_code').length;
                const q = periodRosterSearch.trim().toLowerCase();
                const filteredIds = periodStudentIds.filter((stuId) => {
                  const st = students.find((s) => s.id === stuId);
                  if (!st) return false;
                  const rec = recordByStudent.get(stuId);
                  if (periodRosterFilter === 'unchecked' && rec) return false;
                  if (periodRosterFilter === 'proxy' && rec?.checkMethod !== 'teacher_proxy') return false;
                  if (periodRosterFilter === 'mobile' && rec?.checkMethod !== 'qr_code') return false;
                  if (!q) return true;
                  return (
                    `${st.firstNameTh} ${st.lastNameTh}`.toLowerCase().includes(q) ||
                    (st.studentIdNumber || '').toLowerCase().includes(q) ||
                    (st.room || '').toLowerCase().includes(q)
                  );
                });

                return (
                  <>
                    <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                          <SmartphoneOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>ตรวจเช็คชื่อรายคาบ · กรณีนักเรียนไม่มีมือถือ กดรับแทนได้ทันที</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          {(
                            [
                              ['all', `ทั้งหมด (${periodStudentIds.length})`],
                              ['unchecked', `ยังไม่เช็ค (${uncheckedCount})`],
                              ['proxy', `ครูรับแทน (${proxyCount})`],
                              ['mobile', `สแกนมือถือ (${mobileCount})`],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setPeriodRosterFilter(key)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer border transition ${
                                periodRosterFilter === key
                                  ? 'bg-[var(--color-primary)] text-white border-transparent'
                                  : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)]'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-2" />
                        <input
                          type="text"
                          value={periodRosterSearch}
                          onChange={(e) => setPeriodRosterSearch(e.target.value)}
                          placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-[var(--color-border)]">
                      <PagedList items={filteredIds} pageSize={8} emptyState={<p className="type-meta text-center py-4">ไม่พบรายชื่อนักเรียนตามตัวกรอง</p>} renderItem={(stuId) => {
                        const st = students.find(s => s.id === stuId);
                        if (!st) return null;
                        const savedRecord = recordByStudent.get(stuId);
                        const status = periodStatuses[st.id] || savedRecord?.status || 'present';

                        return (
                          <div key={st.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={st.avatarUrl}
                                alt={st.firstNameEn}
                                className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="type-card-title truncate">{st.firstNameTh} {st.lastNameTh}</p>
                                  {savedRecord?.checkMethod === 'qr_code' && (
                                    <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-[10px] font-bold">
                                      สแกนมือถือแล้ว
                                    </span>
                                  )}
                                  {savedRecord?.checkMethod === 'teacher_proxy' && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                      ครูกดรับแทน
                                    </span>
                                  )}
                                </div>
                                <p className="type-meta font-mono truncate">
                                  {st.studentIdNumber} · {st.gradeLevel} {st.room}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 self-end sm:self-auto max-w-full flex-wrap justify-end">
                              {(!savedRecord || savedRecord.checkMethod !== 'qr_code') && (
                                <button
                                  type="button"
                                  onClick={() => handleTeacherProxyPeriodCheckin(st, 'present', true)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition cursor-pointer inline-flex items-center gap-1"
                                  title="กรณีนักเรียนไม่มีมือถือ ให้ครูกดรับเช็คชื่อแทนทันที"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>ไม่มีมือถือ · กดรับแทน</span>
                                </button>
                              )}
                              {(['present', 'late', 'absent', 'excused'] as const).map((pst) => (
                                <button
                                  key={pst}
                                  type="button"
                                  onClick={() => handleTeacherProxyPeriodCheckin(st, pst, false)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                    (savedRecord ? savedRecord.status : status) === pst && (savedRecord || periodStatuses[st.id])
                                      ? pst === 'present' ? 'bg-emerald-700 text-white' :
                                        pst === 'late' ? 'bg-amber-500 text-slate-950' :
                                        pst === 'excused' ? 'bg-[var(--color-primary)] text-white' : 'bg-rose-700 text-white'
                                      : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                                  }`}
                                >
                                  {pst === 'present' ? 'เข้าเรียน' : pst === 'late' ? 'สาย' : pst === 'excused' ? 'ลา' : 'ขาด'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }} />
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Fullscreen QR Code Modal for classroom display (staff only) */}
          {!isRestrictedViewer && showPeriodQrModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-[var(--color-card)] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 border border-[var(--color-border)] shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary-text)]">
                    QR Code เช็คชื่อเข้าคาบเรียน
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPeriodQrModal(false)}
                    className="p-1.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] cursor-pointer"
                    aria-label="ปิดหน้าต่าง QR"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-center">
                  <QrCodeMatrix
                    value={periodCheckinUrl}
                    size={240}
                    label={`QR Code ${selectedCourse.code} คาบที่ ${selectedPeriod}`}
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-[var(--color-text-title)] text-sm">
                    {selectedCourse.code} {selectedCourse.titleTh}
                  </p>
                  <p className="text-[var(--color-text-muted)]">
                    คาบที่ {selectedPeriod} • วันที่ {periodDate}
                  </p>
                  <p className="font-mono font-bold text-[var(--color-primary-text)]">
                    รหัสคาบ: {expectedPeriodCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPeriodLink}
                  className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {periodQrCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{periodQrCopied ? 'คัดลอกลิงก์เช็คชื่อแล้ว ✓' : 'คัดลอกลิงก์ส่งให้นักเรียน'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS CONFIRMATION MODAL & LINE FLEX MESSAGE PREVIEW POPUP */}
      {/* ========================================================================= */}
      {checkinSuccessFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-card)] text-[var(--color-text-title)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-[var(--color-border)] text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 mx-auto flex items-center justify-center shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold border ${
                checkinSuccessFeedback.checkType === 'check_in' 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' 
                  : 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
              }`}>
                {checkinSuccessFeedback.checkType === 'check_in' ? 'เช็คชื่อเข้าโรงเรียนสำเร็จ' : 'เช็คชื่อออกจากโรงเรียนสำเร็จ'}
              </span>
              <h3 className="text-base font-semibold text-[var(--color-text-title)] pt-1">
                {checkinSuccessFeedback.userName}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">{checkinSuccessFeedback.userRole}</p>
            </div>

            {/* Captured Selfie Snapshot preview */}
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-48 mx-auto border-2 border-[var(--color-border)] bg-[var(--color-card-subtle)] shadow-sm">
              <img
                src={checkinSuccessFeedback.photoUrl}
                alt="Verified snapshot"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 p-1 rounded-lg bg-black/80 text-white text-[9px] font-mono flex items-center justify-between">
                <span>{checkinSuccessFeedback.gateName}</span>
                <span>{checkinSuccessFeedback.time} น.</span>
              </div>
            </div>

            {/* Toggle Button for LINE Flex Preview */}
            <button
              type="button"
              onClick={() => setShowLineFlexPreview(!showLineFlexPreview)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              <span>{showLineFlexPreview ? 'ซ่อนการ์ดจำลอง LINE' : 'ดูการ์ด LINE Flex Message ที่ส่งหาผู้ปกครอง'}</span>
            </button>

            {/* REALISTIC LINE FLEX MESSAGE CHAT CARD SIMULATOR */}
            {showLineFlexPreview && (
              <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-emerald-400 dark:border-emerald-700 text-left space-y-2 animate-fade-in">
                {/* LINE Chat Bubble (Preserved authentic white chat bubble) */}
                <div className="rounded-2xl overflow-hidden bg-white shadow-md border border-slate-200 text-slate-900">
                  {/* Green Top Header */}
                  <div className="bg-[#06C755] text-slate-950 p-3 flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โรงเรียนเอ็ดดูเวิร์สวิทยานุสรณ์ (LINE OA)</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold">{checkinSuccessFeedback.time}</span>
                  </div>

                  {/* Bubble Image */}
                  <div className="relative aspect-16/9 bg-slate-900 overflow-hidden">
                    <img src={checkinSuccessFeedback.photoUrl} alt="LINE Flex Preview" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold shadow">
                      VERIFIED
                    </div>
                  </div>

                  {/* Bubble Content */}
                  <div className="p-3.5 space-y-2 text-xs">
                    <h5 className="font-semibold text-slate-900 text-sm">
                      {checkinSuccessFeedback.checkType === 'check_in' 
                        ? '🟢 นักเรียนเดินทางถึงโรงเรียนแล้ว' 
                        : '🟣 นักเรียนเดินทางออกจากโรงเรียนแล้ว'}
                    </h5>
                    <div className="space-y-1 text-slate-700 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">ชื่อนักเรียน:</span>
                        <span className="font-bold text-slate-900">{checkinSuccessFeedback.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">เวลาบันทึก:</span>
                        <span className="font-mono text-slate-900">{checkinSuccessFeedback.time} น.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">จุดผ่านเข้า-ออก:</span>
                        <span className="text-slate-900">{checkinSuccessFeedback.gateName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">สถานะ GPS:</span>
                        <span className="text-emerald-700 font-bold">ในรัศมีโรงเรียน ({checkinSuccessFeedback.distance} ม.)</span>
                      </div>
                    </div>
                  </div>

                  {/* Bubble Action Button */}
                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <span>เปิดดูประวัติย้อนหลังใน Parent Portal</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setCheckinSuccessFeedback(null);
                setShowLineFlexPreview(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              ตกลงและปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Continuous Rapid Scanner Modal */}
      <ContinuousRapidScannerModal
        isOpen={showRapidScanner}
        onClose={() => setShowRapidScanner(false)}
        students={students}
        currentUser={currentUser}
        onRecordAttendance={onRecordAttendance}
        lang={lang}
      />

      {/* Admin GPS & Gates Management Modal — Strictly School Admin Only */}
      {isSchoolAdmin && showGpsAdminModal && _school && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-[var(--color-card)] rounded-3xl p-4 sm:p-6 max-w-4xl w-full border border-[var(--color-border)] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="text-base font-bold text-[var(--color-text-title)]">
                  ตั้งค่าและแก้ไขพิกัดจุดเช็คชื่อโรงเรียน (School GPS & Gates Management)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsAdminModal(false)}
                className="p-1.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] cursor-pointer"
                aria-label="ปิดหน้าต่างตั้งค่าพิกัด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <SchoolGpsSettingsCard
              activeSchool={_school}
              campusGates={campusGates}
              currentRole={effectiveRole}
              lang={lang}
              onUpdateCampusGates={onUpdateCampusGates || (() => {})}
              onSaveCampusGates={onSaveCampusGates}
              onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONE-HANDED FLOATING ACTION TOOLBAR (FAB) — THUMB-ZONE ACCESSIBLE          */}
      {/* ========================================================================= */}
      {!hideFloatingToolbar && (
        <div
          className={`fixed ${embeddedMobile ? 'bottom-[74px] right-3' : 'bottom-5 right-4 sm:right-6'} z-30 flex flex-col items-end gap-2 pointer-events-none`}
        >
          {fabMenuOpen && (
            <div className="pointer-events-auto flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  setSubTab('nfc_tap');
                }}
                className="min-h-[44px] px-3.5 rounded-full bg-[var(--color-card)]/95 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text-title)] shadow-lg text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Nfc className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'แตะบัตร NFC' : 'NFC Card Tap'}</span>
              </button>

              {isStaffUser && (
                <button
                  type="button"
                  onClick={() => {
                    setFabMenuOpen(false);
                    runWithBiometricGuard(() => setShowRapidScanner(true));
                  }}
                  className="min-h-[44px] px-3.5 rounded-full bg-[var(--color-card)]/95 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text-title)] shadow-lg text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <ScanLine className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span>{lang === 'th' ? 'สแกน QR รัว (1วิ/คน)' : 'Rapid QR Scanner'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  setSubTab('period_checkin');
                }}
                className="min-h-[44px] px-3.5 rounded-full bg-[var(--color-card)]/95 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text-title)] shadow-lg text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <QrCode className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'เช็คชื่อรายคาบ (QR)' : 'Period Check-in'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  setSubTab('leave_request');
                  setLeaveFormStep(1);
                }}
                className="min-h-[44px] px-3.5 rounded-full bg-[var(--color-card)]/95 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text-title)] shadow-lg text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'ยื่น / ตรวจใบลา' : 'Leave Requests'}</span>
              </button>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-1.5 bg-[var(--color-card)]/95 backdrop-blur-md p-1 rounded-full border border-[var(--color-border)] shadow-xl">
            {/* Quick Roster Drawer Trigger */}
            <button
              type="button"
              onClick={() => {
                setFabMenuOpen(false);
                setShowQuickRosterSheet(true);
              }}
              aria-label={lang === 'th' ? 'ดูรายชื่อนักเรียน' : 'Open Student Roster'}
              className="min-h-[44px] px-3 rounded-full hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
            >
              <Users className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <span>{lang === 'th' ? 'รายชื่อ' : 'Roster'}</span>
            </button>

            {/* Primary Context Check-in FAB */}
            <button
              type="button"
              onClick={handlePrimaryFabCheckin}
              disabled={isSavingAttendance}
              className="min-h-[44px] px-4 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
            >
              {subTab === 'selfie_mobile' && !capturedPhotoUrl ? (
                <Camera className="w-4 h-4 shrink-0" />
              ) : subTab === 'nfc_tap' ? (
                <Nfc className="w-4 h-4 shrink-0" />
              ) : subTab === 'teacher_proxy' && !matchedProxyStudent ? (
                <QrCode className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0" />
              )}
              <span>{primaryFabLabel}</span>
            </button>

            {/* Expandable Quick Tools FAB */}
            <button
              type="button"
              onClick={() => setFabMenuOpen((prev) => !prev)}
              aria-expanded={fabMenuOpen}
              aria-label={lang === 'th' ? 'เมนูลัดเช็คชื่อ' : 'Quick attendance tools'}
              className="min-h-[44px] min-w-[44px] rounded-full bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <Plus className={`w-4 h-4 transition-transform duration-150 ${fabMenuOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONE-HANDED STUDENT ROSTER & QUICK CHECK-IN BOTTOM SHEET                   */}
      {/* ========================================================================= */}
      <MobileBottomSheet
        isOpen={showQuickRosterSheet}
        onClose={() => setShowQuickRosterSheet(false)}
        title={
          isRestrictedViewer
            ? (lang === 'th' ? 'รายชื่อและสถานะเช็คชื่อของคุณ' : 'Your Attendance Status')
            : (lang === 'th' ? 'รายชื่อนักเรียน & เช็คชื่อมือเดียว' : 'Student Roster & 1-Tap Check-in')
        }
        subtitle={
          lang === 'th'
            ? `มา ${rosterTodayStats.checkedIn} · สาย ${rosterTodayStats.late} · ยังไม่เช็ค ${rosterTodayStats.pending} (จาก ${scopedStudents.length} คน)`
            : `${rosterTodayStats.checkedIn} present · ${rosterTodayStats.late} late · ${rosterTodayStats.pending} pending`
        }
      >
        <div className="space-y-3">
          {rosterToast && (
            <div
              role="status"
              className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{rosterToast}</span>
            </div>
          )}

          {/* Search & Grade Filter (when multiple students) */}
          {scopedStudents.length > 1 && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rosterSheetQuery}
                  onChange={(e) => setRosterSheetQuery(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาชื่อ รหัส หรือห้อง...' : 'Search name, ID, or room...'}
                  className="w-full min-h-[44px] pl-9 pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {rosterSheetQuery && (
                  <button
                    type="button"
                    onClick={() => setRosterSheetQuery('')}
                    aria-label={lang === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {rosterGradeOptions.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setRosterSheetGradeFilter('all')}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                      rosterSheetGradeFilter === 'all'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                    }`}
                  >
                    {lang === 'th' ? 'ทุกชั้น' : 'All'}
                  </button>
                  {rosterGradeOptions.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setRosterSheetGradeFilter(g)}
                      className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                        rosterSheetGradeFilter === g
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Student List */}
          {filteredRosterStudents.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
              {lang === 'th' ? 'ไม่พบรายชื่อนักเรียนที่ค้นหา' : 'No matching students found.'}
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredRosterStudents.slice(0, 40).map((st) => {
                const todayRec = todayAttendanceByStudent.get(st.id);
                const statusLabel = !todayRec
                  ? (lang === 'th' ? 'ยังไม่เช็คชื่อ' : 'Pending')
                  : todayRec.status === 'present'
                  ? (lang === 'th' ? `มาเรียน · ${todayRec.time}` : `Present · ${todayRec.time}`)
                  : todayRec.status === 'late'
                  ? (lang === 'th' ? `มาสาย · ${todayRec.time}` : `Late · ${todayRec.time}`)
                  : (lang === 'th' ? 'ลา/ขาด' : todayRec.status);

                const statusCls = !todayRec
                  ? 'text-[var(--color-text-muted)]'
                  : todayRec.status === 'present'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : todayRec.status === 'late'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-rose-700 dark:text-rose-400';

                return (
                  <div
                    key={st.id}
                    className="py-2.5 flex items-center justify-between gap-2 min-h-[60px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={st.avatarUrl}
                        alt={st.firstNameTh}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0 bg-[var(--color-card-subtle)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {st.firstNameTh} {st.lastNameTh}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                          {st.studentIdNumber} · {st.gradeLevel}/{st.room}
                        </p>
                        <p className={`text-[11px] font-semibold truncate tabular-nums ${statusCls}`}>
                          {statusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isStaffUser ? (
                        <>
                          {!todayRec && (
                            <button
                              type="button"
                              onClick={() => handleQuickRosterCheckin(st, 'present')}
                              className="min-h-[44px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>{lang === 'th' ? 'เช็คเข้า' : 'Check in'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectRosterStudentForCurrentTab(st)}
                            className="min-h-[44px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {subTab === 'period_checkin'
                              ? (lang === 'th' ? 'สลับคาบ' : 'Toggle')
                              : (lang === 'th' ? 'เลือก' : 'Select')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectRosterStudentForCurrentTab(st)}
                          className="min-h-[44px] px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          {lang === 'th' ? 'เช็คชื่อ' : 'Check in'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: MOBILE IDENTITY & PROXY SWITCHER */}
      <MobileBottomSheet
        isOpen={showIdentitySheet}
        onClose={() => setShowIdentitySheet(false)}
        title={isRestrictedViewer ? (lang === 'th' ? 'บัญชีเช็คชื่อ' : 'Check-in Account') : (lang === 'th' ? 'เลือกบัญชีผู้เช็คชื่อ' : 'Select Check-in Account')}
        subtitle={activePersonName}
      >
        <div className="space-y-4">
          {!isRestrictedViewer && (
            <div className="seg-tab-group w-full flex">
              <button
                type="button"
                data-active={isSelfCheckin}
                onClick={() => setAttendanceMode('self')}
                className="seg-tab-btn flex-1 text-center"
              >
                {lang === 'th' ? 'บัญชีฉัน' : 'My Account'}
              </button>
              <button
                type="button"
                data-active={!isSelfCheckin}
                onClick={() => setAttendanceMode('proxy')}
                className="seg-tab-btn flex-1 text-center"
              >
                {lang === 'th' ? 'สแกนแทน' : 'Proxy Check-in'}
              </button>
            </div>
          )}

          {!isSelfCheckin && (
            <div className="space-y-3">
              <div className="seg-tab-group w-full flex">
                <button
                  type="button"
                  data-active={effectiveUserType === 'student'}
                  onClick={() => setActiveUserType('student')}
                  className="seg-tab-btn flex-1 text-center"
                >
                  {lang === 'th' ? 'นักเรียน' : 'Student'}
                </button>
                <button
                  type="button"
                  data-active={effectiveUserType === 'teacher'}
                  onClick={() => setActiveUserType('teacher')}
                  className="seg-tab-btn flex-1 text-center"
                >
                  {lang === 'th' ? 'ครู / บุคลากร' : 'Teacher / Staff'}
                </button>
              </div>
              {effectiveUserType === 'student' ? (
                <select
                  aria-label="เลือกนักเรียน"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                >
                  {scopedStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber}) - {st.gradeLevel} {st.room}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  aria-label="เลือกครู"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                >
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.fullNameTh} ({tc.teacherIdNumber}) - {tc.department}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center gap-3">
            <img
              src={activePersonDefaultAvatar}
              alt={activePersonName}
              className="w-11 h-11 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="type-card-title truncate">{activePersonName}</p>
              <p className="type-meta truncate">{activePersonRole}</p>
              <p className="type-meta font-mono truncate">{activePersonId}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIdentitySheet(false)}
            className="w-full min-h-[44px] rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs cursor-pointer"
          >
            {lang === 'th' ? 'กลับไปหน้ากล้อง' : 'Back to Camera'}
          </button>
        </div>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: MOBILE GEOFENCE & GPS STATUS */}
      <MobileBottomSheet
        isOpen={showGeofenceSheet}
        onClose={() => setShowGeofenceSheet(false)}
        title={
          isSchoolAdmin
            ? (lang === 'th' ? `จุดเช็คชื่อ GPS (${normalizedGates.length})` : `GPS Check-in Gates (${normalizedGates.length})`)
            : (lang === 'th' ? 'สถานะพิกัด GPS เช็คชื่อ' : 'GPS Check-in Status')
        }
        subtitle={gpsStatusShortLabel}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRefreshGps}
              className="btn-tool-neutral px-3 py-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'อัปเดตพิกัด GPS' : 'Refresh GPS'}</span>
            </button>
            {isSchoolAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowGeofenceSheet(false);
                  setShowGpsAdminModal(true);
                }}
                className="btn-tool-neutral px-3 py-2"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ตั้งค่าจุดประตู' : 'Manage Gates'}</span>
              </button>
            )}
          </div>

          {gpsError && (
            <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 text-xs">
              {gpsError}
            </div>
          )}

          {!isSchoolAdmin && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {lang === 'th'
                ? 'พิกัด GPS รัศมี และจุดประตูเช็คชื่อทั้งหมดกำหนดโดยผู้ดูแลระบบของโรงเรียน'
                : 'GPS coordinates, radius, and check-in gates are managed by your school administrator.'}
            </p>
          )}

          {normalizedGates.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] text-center space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-title)]">
                {lang === 'th' ? 'โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ' : 'School GPS coordinates not configured'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {isSchoolAdmin
                  ? (lang === 'th' ? 'กดปุ่ม "ตั้งค่าจุดประตู" ด้านบนเพื่อกำหนดพิกัดจริงของโรงเรียน' : 'Tap "Manage Gates" above to configure real school coordinates.')
                  : (lang === 'th' ? 'กรุณาแจ้งผู้ดูแลระบบโรงเรียนให้กำหนดพิกัดโรงเรียนก่อนเช็คชื่อ' : 'Please ask your school administrator to configure campus GPS coordinates.')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              {normalizedGates.map((gate) => {
                const isSelected = selectedGate?.id === gate.id;
                return normalizedGates.length > 1 || isSchoolAdmin ? (
                  <button
                    key={gate.id}
                    type="button"
                    onClick={() => setSelectedGateId(gate.id)}
                    className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-[var(--color-primary-light)]' : 'bg-[var(--color-card)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{gate.nameTh}</p>
                      <p className="type-meta font-mono truncate">
                        รัศมี {gate.radiusMeters} ม.{isSchoolAdmin ? ` · ${Number(gate.lat).toFixed(5)}, ${Number(gate.lng).toFixed(5)}` : ''}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />}
                  </button>
                ) : (
                  <div
                    key={gate.id}
                    className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 bg-[var(--color-primary-light)]"
                  >
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{gate.nameTh}</p>
                      <p className="type-meta tabular-nums truncate">
                        รัศมีเช็คชื่อที่โรงเรียนกำหนด {gate.radiusMeters} ม.
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: MOBILE NFC QUICK TAP / RECENT LOGS */}
      <MobileBottomSheet
        isOpen={Boolean(nfcDrawerMode)}
        onClose={() => setNfcDrawerMode(null)}
        title={
          nfcDrawerMode === 'quick_tap'
            ? (lang === 'th' ? `แตะบัตรด่วน (${nfcBindings.length} ใบ)` : `Quick ID Tap (${nfcBindings.length})`)
            : (lang === 'th' ? `ประวัติแตะบัตรล่าสุด (${nfcRecentLogs.length})` : `Recent NFC Check-ins (${nfcRecentLogs.length})`)
        }
      >
        {nfcDrawerMode === 'quick_tap' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {teachers.slice(0, 4).map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => {
                    handleProcessNfcCardInput(tc.nfcCardUid || tc.teacherIdNumber);
                    setNfcDrawerMode(null);
                  }}
                  className="min-h-[42px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Nfc className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span className="truncate max-w-[140px]">{tc.fullNameTh}</span>
                </button>
              ))}
              {students.slice(0, 6).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    handleProcessNfcCardInput(st.nfcCardUid || st.studentIdNumber);
                    setNfcDrawerMode(null);
                  }}
                  className="min-h-[42px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Nfc className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[140px]">{st.firstNameTh} {st.lastNameTh}</span>
                </button>
              ))}
            </div>

            {nfcBindings.length > 0 && (
              <div className="pt-3 border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {nfcBindings.map((b) => (
                  <div key={b.normalizedUid} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{b.label}</p>
                      <p className="type-meta font-mono truncate">{b.uid} · {b.displayId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNfcBindings(removeNfcBinding(activeSchoolId, b.uid))}
                      className="btn-icon-tool text-rose-600 dark:text-rose-300"
                      aria-label={lang === 'th' ? 'ยกเลิกการผูกบัตร' : 'Unbind'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : nfcRecentLogs.length === 0 ? (
          <p className="type-meta text-center py-6">
            {lang === 'th' ? 'ยังไม่มีรายการแตะบัตร NFC ในเซสชันนี้' : 'No NFC taps recorded in this session yet.'}
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {nfcRecentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="type-card-title truncate">{log.name}</p>
                  <p className="type-meta truncate">{log.roleLabel} · UID {log.uid} · {log.gateName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`type-label ${log.checkType === 'check_in' ? (log.status === 'late' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300') : 'text-[var(--color-primary-text)]'}`}>
                    {log.checkType === 'check_in' ? (log.status === 'late' ? 'เข้า · สาย' : 'เข้าเรียน') : 'ออกโรงเรียน'}
                  </span>
                  <p className="type-meta font-mono">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileBottomSheet>

      {/* Biometric Verification Modal for Quick-Action Attendance */}
      {showBiometricUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center">
              <Fingerprint className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ยืนยันตัวตนก่อนเช็คชื่อด่วน' : 'Biometric Verification Required'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? `แตะเพื่อยืนยัน ${userPasskey?.deviceLabel || 'FaceID / TouchID'} สำหรับปลดล็อกสิทธิ์เจ้าหน้าที่ 15 นาที`
                  : `Verify ${userPasskey?.deviceLabel || 'FaceID / TouchID'} to unlock staff quick attendance for 15 minutes.`}
              </p>
            </div>

            {biometricError && (
              <div role="alert" className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs text-left">
                {biometricError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={biometricBusy}
                onClick={handleBiometricVerify}
                className="w-full min-h-[46px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Fingerprint className="w-4 h-4" />
                <span>
                  {biometricBusy
                    ? (lang === 'th' ? 'กำลังตรวจสแกนไบโอเมตริกซ์...' : 'Verifying...')
                    : (lang === 'th' ? 'ยืนยันด้วย FaceID / TouchID' : 'Verify with FaceID / TouchID')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingBiometricActionRef.current = null;
                  setShowBiometricUnlockModal(false);
                }}
                className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-semibold text-xs cursor-pointer"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
