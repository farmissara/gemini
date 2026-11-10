import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  UserCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  ShieldCheck, 
  Users, 
  Check, 
  Camera,
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
  Search
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import {
  filterLeaveRequestsForUser,
  filterPeriodAttendanceForUser,
  getAllowedStudentScope,
  isRestrictedAttendanceViewer,
  resolveOwnStudent,
  resolveOwnTeacher,
} from '../lib/attendanceScope';
import { QrCodeMatrix } from './QrCodeMatrix';
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
  LeaveStatus
} from '../types';
import { DEFAULT_CAMPUS_GATES } from '../data/mockData';
import { PagedList } from './PagedList';

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
    }
  ) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddLeaveRequest?: (req: LeaveRequest) => void;
  onUpdateLeaveStatus?: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  initialSubTab?: 'selfie_mobile' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  embeddedMobile?: boolean;
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
}

export const MobileAttendanceView: React.FC<MobileAttendanceViewProps> = ({
  students,
  teachers = [],
  courses,
  attendance: _attendance,
  periodAttendance,
  currentUser,
  school: _school,
  campusGates = DEFAULT_CAMPUS_GATES,
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
}) => {
  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const isStudentOnly = currentUser?.role === 'student';
  const isStaffUser = !isRestrictedViewer;
  const studentScope = getAllowedStudentScope(currentUser, students);
  const ownStudent = resolveOwnStudent(currentUser, students);
  const ownTeacher = resolveOwnTeacher(currentUser, teachers);
  const scopedStudents = isRestrictedViewer ? studentScope.allowedStudents : students;
  const scopedLeaveRequests = filterLeaveRequestsForUser(leaveRequests, currentUser, students);
  const scopedPeriodAttendance = filterPeriodAttendanceForUser(periodAttendance, currentUser, students);

  const safeInitialSubTab =
    !isStaffUser && initialSubTab === 'teacher_proxy' ? 'selfie_mobile' : initialSubTab;

  const [subTab, setSubTab] = useState<'selfie_mobile' | 'leave_request' | 'teacher_proxy' | 'period_checkin'>(
    safeInitialSubTab
  );
  const [compactPane, setCompactPane] = useState<'camera' | 'identity' | 'geofence'>('camera');

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(!isStaffUser && initialSubTab === 'teacher_proxy' ? 'selfie_mobile' : initialSubTab);
    }
  }, [initialSubTab, isStaffUser]);

  // -------------------------------------------------------------
  // 1. MOBILE SELFIE CHECK-IN/OUT & MULTI-GATE STATE
  // -------------------------------------------------------------
  const [activeUserType, setActiveUserType] = useState<AttendanceUserType>(
    isRestrictedViewer ? 'student' : currentUser?.role === 'teacher' ? 'teacher' : 'student'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    ownStudent?.id || scopedStudents[0]?.id || students[0]?.id || 'stu-1'
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    ownTeacher?.id || teachers[0]?.id || 'tch-1'
  );
  const [checkType, setCheckType] = useState<AttendanceCheckType>('check_in');
  const [selfieActionError, setSelfieActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isRestrictedViewer) {
      setActiveUserType('student');
      if (ownStudent && !scopedStudents.some((s) => s.id === selectedStudentId)) {
        setSelectedStudentId(ownStudent.id);
      }
    } else if (currentUser?.role === 'teacher' && ownTeacher) {
      setActiveUserType('teacher');
      setSelectedTeacherId(ownTeacher.id);
    }
  }, [isRestrictedViewer, currentUser?.role, ownStudent, ownTeacher, scopedStudents, selectedStudentId]);

  // Selected or nearest gate
  const [selectedGateId, setSelectedGateId] = useState<string>(campusGates[0]?.id || 'gate-1');
  const selectedGate = campusGates.find(g => g.id === selectedGateId) || campusGates[0];

  const [currentGpsDistance, setCurrentGpsDistance] = useState<number>(18); // Default: 18m inside campus
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [realGpsCoords, setRealGpsCoords] = useState<{ lat: number; lng: number } | null>({
    lat: selectedGate.lat + 0.0001,
    lng: selectedGate.lng + 0.0001
  });

  // Camera Live Feed & Selfie Snapshot
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
    academicYear: '2569',
    room: 'ห้องเรียนรวม',
    schedule: 'จันทร์-ศุกร์ 08:30 - 15:30',
    teacherName: currentUser?.fullNameTh || 'อาจารย์ผู้สอน',
    teacherEmail: currentUser?.email || 'teacher@eduverse.school',
    description: 'วิชาเรียนรวมพื้นฐานระดับชั้น',
    enrolledStudentIds: students.map(s => s.id)
  };

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialPeriodCourseId || courses[0]?.id || fallbackCourse.id
  );
  const selectedCourse: Course = courses.find(c => c.id === selectedCourseId) || courses[0] || fallbackCourse;
  const [selectedPeriod, setSelectedPeriod] = useState<number>(initialPeriodNumber || 1);
  const [periodDate, setPeriodDate] = useState<string>(initialPeriodDate || getLocalDateString());
  const [periodStatuses, setPeriodStatuses] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({});
  const [periodSavedNotification, setPeriodSavedNotification] = useState<string | null>(null);
  const [periodQrCopied, setPeriodQrCopied] = useState<boolean>(false);
  const [showPeriodQrModal, setShowPeriodQrModal] = useState<boolean>(false);
  const [studentPeriodCodeInput, setStudentPeriodCodeInput] = useState<string>(initialPeriodCode || '');
  const [studentPeriodCheckinMsg, setStudentPeriodCheckinMsg] = useState<string | null>(null);
  const [studentPeriodCheckinError, setStudentPeriodCheckinError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPeriodCourseId) setSelectedCourseId(initialPeriodCourseId);
    if (initialPeriodNumber) setSelectedPeriod(initialPeriodNumber);
    if (initialPeriodDate) setPeriodDate(initialPeriodDate);
    if (initialPeriodCode) setStudentPeriodCodeInput(initialPeriodCode);
  }, [initialPeriodCourseId, initialPeriodNumber, initialPeriodDate, initialPeriodCode]);

  const periodStudentIds: string[] = (selectedCourse.enrolledStudentIds && selectedCourse.enrolledStudentIds.length > 0)
    ? selectedCourse.enrolledStudentIds
    : students.map(s => s.id);

  const selectedStudent = isStudentOnly
    ? (ownStudent || students[0])
    : (scopedStudents.find(s => s.id === selectedStudentId) || scopedStudents[0] || students[0]);
  const selectedTeacher = currentUser?.role === 'teacher'
    ? (ownTeacher || teachers[0])
    : (teachers.find(t => t.id === selectedTeacherId) || teachers[0]);

  const effectiveUserType: AttendanceUserType = isRestrictedViewer
    ? 'student'
    : currentUser?.role === 'teacher'
      ? 'teacher'
      : activeUserType;

  const activePersonName = effectiveUserType === 'teacher' 
    ? selectedTeacher?.fullNameTh || 'อาจารย์' 
    : `${selectedStudent?.firstNameTh || 'นักเรียน'} ${selectedStudent?.lastNameTh || ''}`.trim();
  const activePersonRole = effectiveUserType === 'teacher' 
    ? selectedTeacher?.academicStanding || 'ครูผู้สอน' 
    : `นักเรียน (${selectedStudent?.gradeLevel || 'ม.4'} ห้อง ${selectedStudent?.room || '401'})`;
  const activePersonId = effectiveUserType === 'teacher' 
    ? selectedTeacher?.teacherIdNumber || selectedTeacher?.id 
    : selectedStudent?.studentIdNumber || selectedStudent?.id;
  const activePersonDefaultAvatar = effectiveUserType === 'teacher' 
    ? selectedTeacher?.avatarUrl 
    : selectedStudent?.avatarUrl;

  const isInGeofence = currentGpsDistance <= selectedGate.radiusMeters;

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

  // Start live webcam feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsCameraActive(true);
        }
      } else {
        setCameraError('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้องหน้า');
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable, fallback active:', err);
      setCameraError('ไม่สามารถเปิดกล้องได้ (กรุณาอนุญาตสิทธิ์การเข้าถึงกล้อง หรือใช้ปุ่มถ่ายภาพจำลอง)');
      setIsCameraActive(false);
    }
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
      startCamera();
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
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
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

  // Refresh GPS location and detect nearest gate
  const handleRefreshGps = () => {
    setIsGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setRealGpsCoords({ lat, lng });

          // Calculate distance to selected gate
          const R = 6371e3;
          const φ1 = (selectedGate.lat * Math.PI) / 180;
          const φ2 = (lat * Math.PI) / 180;
          const Δφ = ((lat - selectedGate.lat) * Math.PI) / 180;
          const Δλ = ((lng - selectedGate.lng) * Math.PI) / 180;
          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = Math.round(R * c);

          setCurrentGpsDistance(d > 5000 ? 18 : d);
          setIsGpsLoading(false);
        },
        () => {
          setIsGpsLoading(false);
          setCurrentGpsDistance(18);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsGpsLoading(false);
      setCurrentGpsDistance(18);
    }
  };

  // Submit and Save Attendance Record with Selfie Snapshot
  const handleConfirmCheckin = () => {
    setSelfieActionError(null);
    if (!isInGeofence) {
      setSelfieActionError(`คุณอยู่นอกพื้นที่โรงเรียน (เกินรัศมี ${selectedGate.radiusMeters} เมตร) กรุณาเข้ามาในบริเวณโรงเรียน หรือกดจำลองระยะห่างให้อยู่ในพื้นที่`);
      return;
    }

    const photoToSave = capturedPhotoUrl || activePersonDefaultAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const targetId = effectiveUserType === 'teacher' ? (selectedTeacher?.id || 'tch-1') : (selectedStudent?.id || 'stu-1');
    const remarks = `${effectiveUserType === 'teacher' ? 'ครู' : 'นักเรียน'}ถ่ายรูปเซลฟี่${checkType === 'check_in' ? 'เช็กชื่อเข้า' : 'เช็กชื่อออก'}ผ่านมือถือ ที่${selectedGate.nameTh} (ระยะ GPS: ${currentGpsDistance} ม.)`;

    const [h, m] = nowTime.split(':').map(Number);
    const minutes = (h || 0) * 60 + (m || 0);
    const isLate = checkType === 'check_in' && minutes > 8 * 60;
    const status: AttendanceStatus = isLate ? 'late' : 'present';

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
        userDepartmentOrRoom: effectiveUserType === 'teacher' ? selectedTeacher?.department : selectedStudent?.room,
        location: {
          lat: realGpsCoords?.lat || selectedGate.lat,
          lng: realGpsCoords?.lng || selectedGate.lng,
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

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId: effectiveUserType === 'teacher' ? (selectedTeacher?.id || 'tch-1') : (selectedStudent?.id || 'stu-1'),
      userName: activePersonName,
      userRole: effectiveUserType,
      gradeLevelOrDepartment: effectiveUserType === 'teacher' ? selectedTeacher?.department : selectedStudent?.room,
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason,
      attachmentUrl: leaveAttachmentUrl || undefined,
      status: 'pending',
      createdAt: `${getLocalDateString()} ${new Date().toLocaleTimeString('th-TH')}`
    };

    if (onAddLeaveRequest) {
      onAddLeaveRequest(newLeave);
    }

    setLeaveSuccessNotice(`ส่งใบ${leaveType === 'sick' ? 'ลาป่วย' : 'ลากิจ'}เรียบร้อยแล้ว รอครูประจำชั้นหรือฝ่ายวิชาการอนุมัติ`);
    setLeaveReason('');
    setLeaveAttachmentUrl('');
    setTimeout(() => setLeaveSuccessNotice(null), 5000);
  };

  // Periods list
  const periodsList = [
    { period: 1, time: '08:30 - 09:20', label: 'คาบที่ 1 (Period 1)' },
    { period: 2, time: '09:25 - 10:15', label: 'คาบที่ 2 (Period 2)' },
    { period: 3, time: '10:20 - 11:10', label: 'คาบที่ 3 (Period 3)' },
    { period: 4, time: '11:15 - 12:05', label: 'คาบที่ 4 (Period 4 - พักเที่ยง)' },
    { period: 5, time: '13:00 - 13:50', label: 'คาบที่ 5 (Period 5)' },
    { period: 6, time: '13:55 - 14:45', label: 'คาบที่ 6 (Period 6)' },
    { period: 7, time: '14:50 - 15:40', label: 'คาบที่ 7 (Period 7)' }
  ];

  // Matched student from mandatory Student ID input for Teacher Proxy Check-in
  const trimmedProxyStudentId = proxyStudentIdInput.trim();
  const matchedProxyStudent = trimmedProxyStudentId
    ? students.find((s) => s.studentIdNumber.trim().toLowerCase() === trimmedProxyStudentId.toLowerCase())
    : undefined;

  const handleConfirmProxySingleCheckin = () => {
    if (!matchedProxyStudent) return;
    const actionLabel = proxyCheckType === 'check_in' ? 'เช็กชื่อเข้า' : 'เช็กชื่อออก';
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

  // Period Check-in Code + Shareable Link (QR Code & URL)
  const expectedPeriodCode = `${selectedCourse.code || 'GEN-101'}-P${selectedPeriod}-${periodDate.replace(/-/g, '')}`;
  const periodCheckinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?tab=mobile_checkin&subTab=period_checkin&courseId=${encodeURIComponent(selectedCourse.id)}&period=${selectedPeriod}&date=${encodeURIComponent(periodDate)}&code=${encodeURIComponent(expectedPeriodCode)}`
      : `https://eduverse.school/?tab=mobile_checkin&subTab=period_checkin&courseId=${encodeURIComponent(selectedCourse.id)}&period=${selectedPeriod}&date=${encodeURIComponent(periodDate)}&code=${encodeURIComponent(expectedPeriodCode)}`;

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

    if (rawInput) {
      try {
        if (rawInput.includes('courseId=') || rawInput.startsWith('http') || rawInput.startsWith('/?')) {
          const parsed = new URL(rawInput.startsWith('http') ? rawInput : `https://eduverse.school${rawInput.startsWith('/') ? '' : '/'}${rawInput}`);
          const qCourse = parsed.searchParams.get('courseId');
          const qPeriod = parsed.searchParams.get('period');
          const qDate = parsed.searchParams.get('date');
          const qCode = parsed.searchParams.get('code');
          if (qCourse) resolvedCourseId = qCourse;
          if (qPeriod && !Number.isNaN(Number(qPeriod))) resolvedPeriodNum = Number(qPeriod);
          if (qDate) resolvedDate = qDate;
          if (qCode) resolvedCode = qCode;
        } else {
          resolvedCode = rawInput;
          const matchingCourse = courses.find((c) => rawInput.toUpperCase().startsWith((c.code || '').toUpperCase()));
          if (matchingCourse) {
            resolvedCourseId = matchingCourse.id;
          }
          const periodMatch = rawInput.match(/-P(\d+)/i);
          if (periodMatch?.[1]) {
            resolvedPeriodNum = Number(periodMatch[1]);
          }
        }
      } catch {
        setStudentPeriodCheckinError('รูปแบบลิงก์หรือรหัส QR ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        return;
      }
    }

    const targetCourse = courses.find((c) => c.id === resolvedCourseId) || selectedCourse;
    const currentPeriodInfo = periodsList.find((p) => p.period === resolvedPeriodNum);

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
      verifiedByTeacherId: 'qr-self-checkin',
      verifiedByTeacherName: targetCourse.teacherName || 'ระบบ QR รายคาบ',
      checkMethod: 'qr_code',
      remarks: `นักเรียนสแกน QR/ลิงก์เช็กชื่อรายคาบ (${resolvedCode})`,
    };

    onRecordPeriodAttendance([record]);
    setSelectedCourseId(targetCourse.id);
    setSelectedPeriod(resolvedPeriodNum);
    setPeriodDate(resolvedDate);
    playChime();
    setStudentPeriodCheckinMsg(
      `เช็กชื่อเข้าเรียนวิชา ${targetCourse.code} คาบที่ ${resolvedPeriodNum} วันที่ ${resolvedDate} สำเร็จแล้ว!`
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

  return (
    <div className={embeddedMobile ? 'h-full min-h-0 flex flex-col gap-1.5 overflow-x-hidden w-full max-w-full' : 'space-y-5 max-w-5xl mx-auto overflow-x-hidden w-full'}>
      {/* Top Header - Compact for mobile */}
      {embeddedMobile ? (
        <div className="shrink-0 flex items-center justify-between px-1 py-1 text-slate-800 dark:text-white">
          <div className="flex items-center gap-1.5 min-w-0">
            <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h1 className="text-xs font-black truncate">
              {lang === 'th' ? 'เช็กชื่อเข้า-ออก' : 'Check in / out'}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
              GPS Geofence
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />}
            </button>
            <span className="text-[10px] font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Smart Attendance Ecosystem • GPS Geofence & LINE Flex Alert</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black">
              {lang === 'th' ? 'ระบบเช็กชื่อเข้า-ออกผ่านโทรศัพท์มือถือ' : 'Mobile Selfie Check-in/out Hub'}
            </h1>
            <p className="text-slate-300 text-xs">
              {lang === 'th' 
                ? 'นักเรียนและครูเปิดเข้าระบบจากเครื่องตัวเอง ถ่ายรูปยืนยันตัวตนในเขตพื้นที่โรงเรียนหลายจุด (Multi-Gate Geofence) พร้อมแจ้งเตือน LINE ผู้ปกครอง'
                : 'Self check-in and out for students & teachers with phone camera snapshot, multi-gate GPS radius, and LINE parent notifications.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition"
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-300" />}
            </button>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 shrink-0">
              <Clock className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-white">
                  {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono font-semibold">
                  เวลาทำการ 06:30 - 18:00 น.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub Tabs - Compact Underlined Text Links (Never overflows container edges) */}
      <nav aria-label="Attendance sub-navigation" className="shrink-0 flex flex-wrap items-center gap-x-3.5 gap-y-1 px-0.5 py-1 border-b border-slate-200 dark:border-slate-800 text-xs">
        {[
          { id: 'selfie_mobile', icon: Camera, labelTh: 'เช็กชื่อมือถือ', labelEn: 'Selfie', staffOnly: false },
          { id: 'leave_request', icon: FileText, labelTh: 'ใบลา', labelEn: 'Leave', badge: scopedLeaveRequests.filter(r => r.status === 'pending').length, staffOnly: false },
          { id: 'teacher_proxy', icon: UserCheck, labelTh: 'ครูลงชื่อแทน', labelEn: 'Proxy', staffOnly: true },
          { id: 'period_checkin', icon: Users, labelTh: 'รายคาบ (QR)', labelEn: 'Periods (QR)', staffOnly: false }
        ]
          .filter((tab) => isStaffUser || !tab.staffOnly)
          .map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSubTab(tab.id as any);
              if (tab.id === 'leave_request') setLeaveFormStep(1);
            }}
            className={`flex items-center gap-1 px-1 py-1 border-b-2 font-bold transition text-xs cursor-pointer whitespace-nowrap ${
              subTab === tab.id
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-white hover:underline underline-offset-4'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? tab.labelTh : tab.labelEn}</span>
            {tab.badge ? (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[9px]">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Pane Switcher for Mobile Selfie - Compact Underlined Text Links */}
      {embeddedMobile && subTab === 'selfie_mobile' && (
        <div className="shrink-0 flex items-center justify-around gap-2 px-1 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px]">
          {([
            ['camera', '📷 กล้อง'],
            ['identity', '👤 ผู้ใช้'],
            ['geofence', '📍 จุด GPS']
          ] as const).map(([pane, label]) => (
            <button
              key={pane}
              type="button"
              onClick={() => setCompactPane(pane)}
              className={`px-2 py-0.5 font-bold transition text-center cursor-pointer border-b-2 whitespace-nowrap ${
                compactPane === pane
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-300 hover:text-white hover:underline underline-offset-4'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SELFIE CHECK-IN/OUT (SELF PHONE) FOR STUDENTS & TEACHERS */}
      {/* ========================================================================= */}
      {subTab === 'selfie_mobile' && (
        <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col gap-1.5' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}`}>
          {/* CAMERA COLUMN: Optimized for mobile screen height without overflow */}
          {(!embeddedMobile || compactPane === 'camera') && <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'lg:col-span-7 flex flex-col items-center'}`}>
            <div className={`${embeddedMobile ? 'flex-1 min-h-0 w-full rounded-2xl border' : 'w-full max-w-sm rounded-[40px] p-4 border-4'} bg-slate-900 shadow-xl border-slate-800 relative flex flex-col overflow-hidden`}>

              {/* Event Selector: Check-in vs Check-out + Gate Selector (Wraps safely on narrow phones) */}
              <div className="p-1.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCheckType('check_in')}
                    className={`flex items-center gap-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      checkType === 'check_in'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3 h-3 text-emerald-300 shrink-0" />
                    <span>เข้า (IN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckType('check_out')}
                    className={`flex items-center gap-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      checkType === 'check_out'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <LogOut className="w-3 h-3 text-purple-300 shrink-0" />
                    <span>ออก (OUT)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  <select
                    value={selectedGateId}
                    onChange={(e) => setSelectedGateId(e.target.value)}
                    className="bg-slate-800 text-white text-[11px] font-semibold rounded-lg px-2 py-1 border border-slate-600 truncate min-w-0 max-w-full"
                  >
                    {campusGates.map(gate => (
                      <option key={gate.id} value={gate.id} className="bg-slate-800 text-white">{gate.nameTh}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Camera Viewfinder Box with Responsive Centered Face Outline Guide */}
              <div className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden ${embeddedMobile ? 'min-h-[170px]' : 'min-h-[320px]'}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
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
                          ถ่ายยืนยันตัวตน
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating GPS & Time Badge */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[10px]">
                  <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white font-mono flex items-center gap-1 border border-white/20">
                    <Clock className="w-3 h-3 text-cyan-300" />
                    <span>{new Date().toLocaleTimeString('th-TH')}</span>
                  </div>

                  <div className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border backdrop-blur-md ${
                    isInGeofence 
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                      : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                  }`}>
                    <MapPin className="w-3 h-3" />
                    <span>{isInGeofence ? `ในเขต (${currentGpsDistance}ม.)` : `นอกเขต (${currentGpsDistance}ม.)`}</span>
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
                        disabled={!isInGeofence}
                        onClick={handleConfirmCheckin}
                        className={`flex-[2] py-2 rounded-xl text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${
                          isInGeofence 
                            ? checkType === 'check_in' 
                              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' 
                              : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30'
                            : 'bg-slate-700 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>ยืนยัน {checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-center text-slate-300">
                      {isInGeofence ? '✅ ถ่ายรูปเรียบร้อย พร้อมส่ง LINE หาผู้ปกครอง' : '⚠️ อยู่นอกพื้นที่โรงเรียน'}
                    </p>
                    {selfieActionError && (
                      <p className="text-[10px] text-center text-rose-300 font-semibold">{selfieActionError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-5 py-0.5">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                      title="เปิด/รีเฟรชกล้อง"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      disabled={isCapturing}
                      className="w-12 h-12 rounded-full bg-white p-0.5 shadow-lg shadow-white/20 hover:scale-105 active:scale-95 transition flex items-center justify-center focus:outline-hidden cursor-pointer"
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
                    >
                      <Navigation className={`w-4 h-4 ${isGpsLoading ? 'animate-spin text-blue-400' : ''}`} />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-center py-1">
                <p className={`text-[11px] text-slate-300 ${embeddedMobile ? 'hidden' : ''}`}>
                  ผู้ใช้งาน: <span className="text-white font-bold">{activePersonName}</span> ({activePersonRole})
                </p>
              </div>
            </div>
          </div>}

          {/* RIGHT COLUMN: Settings, Multi-Gate Coordinates & Identity */}
          {(!embeddedMobile || compactPane !== 'camera') && <div className={`${embeddedMobile ? 'h-full min-h-0 overflow-hidden' : 'lg:col-span-5 space-y-5'}`}>
            {/* User Profile Card: Strictly locked for students/teachers; switchable only for admin */}
            {(!embeddedMobile || compactPane === 'identity') && <div className={`${embeddedMobile ? 'h-full p-3 space-y-3 flex flex-col justify-center' : 'p-5 space-y-4'} rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs`}>
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {isRestrictedViewer ? 'ข้อมูลผู้เช็กชื่อของคุณ' : 'ระบุตัวตนผู้ใช้โทรศัพท์'}
                  </h3>
                </div>
                {!isRestrictedViewer && currentUser?.role !== 'teacher' ? (
                  <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveUserType('student')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        effectiveUserType === 'student' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      นักเรียน
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveUserType('teacher')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        effectiveUserType === 'teacher' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ครู / บุคลากร
                    </button>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                    {currentUser?.role === 'teacher' ? 'บัญชีครู' : 'บัญชีของฉัน'}
                  </span>
                )}
              </div>

              {isStudentOnly || currentUser?.role === 'teacher' ? (
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {isStudentOnly
                    ? 'แสดงเฉพาะข้อมูลบัญชีนักเรียนของคุณ เพื่อความเป็นส่วนตัวขณะเช็กชื่อ'
                    : 'ผูกข้อมูลการเช็กชื่อกับบัญชีครูผู้ใช้งานปัจจุบัน'}
                </p>
              ) : effectiveUserType === 'student' ? (
                scopedStudents.length > 1 ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {currentUser?.role === 'parent' ? 'เลือกบุตรหลานในความดูแล:' : 'เลือกรายชื่อนักเรียน:'}
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {scopedStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber}) - ชั้น {st.gradeLevel} {st.room}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">เลือกรายชื่อครู:</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {teachers.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.fullNameTh} ({tc.teacherIdNumber}) - {tc.academicStanding} ({tc.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <img
                  src={activePersonDefaultAvatar}
                  alt={activePersonName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{activePersonName}</p>
                  <p className="text-slate-600 dark:text-slate-300 truncate text-[11px]">{activePersonRole}</p>
                  <p className="font-mono text-slate-600 dark:text-slate-300 text-[10px]">รหัสประจำตัว: {activePersonId}</p>
                </div>
              </div>
            </div>}

            {/* Multi-Gate Geofence Radar */}
            {(!embeddedMobile || compactPane === 'geofence') && <div className={`${embeddedMobile ? 'h-full p-3 space-y-3 overflow-hidden' : 'p-5 space-y-4'} rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-slate-900 dark:text-slate-100`}>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">จุดเช็กชื่อพิกัด Geofence ({campusGates.length} จุด)</h3>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
                  <span>ตรวจพิกัด</span>
                </button>
              </div>

              {/* Multi-gate Selector List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">เลือกประตูหรือจุดเช็กชื่อ:</label>
                <div className="grid grid-cols-1 gap-2">
                  <PagedList items={campusGates} pageSize={3} renderItem={(gate) => {
                    const isSelected = gate.id === selectedGateId;
                    return (
                      <button
                        key={gate.id}
                        type="button"
                        onClick={() => setSelectedGateId(gate.id)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-500 text-blue-950 dark:text-blue-100 shadow-2xs ring-1 ring-blue-400' 
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs">{gate.nameTh}</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                              รัศมี {gate.radiusMeters} ม. • พิกัด {gate.lat.toFixed(4)}, {gate.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                            จุดปัจจุบัน
                          </span>
                        )}
                      </button>
                    );
                  }} />
                </div>
              </div>

              {/* Status Badge */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isInGeofence 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-700 text-rose-900 dark:text-rose-200'
              }`}>
                {isInGeofence ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs">
                  <p className="font-bold">
                    {isInGeofence 
                      ? `คุณอยู่ในเขต: ${selectedGate.nameTh}` 
                      : `คุณอยู่นอกเขต: ${selectedGate.nameTh}`}
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    ระยะห่าง: <strong className="font-mono">{currentGpsDistance} เมตร</strong> (รัศมีที่อนุญาต {selectedGate.radiusMeters} ม.)
                  </p>
                </div>
              </div>

              {/* Testing Presets for Location - Compact Text Links */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">จำลองระยะห่าง:</label>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {[
                    { dist: 15, label: '15 ม. (ในเขต)', inZone: true },
                    { dist: 35, label: '35 ม. (ในเขต)', inZone: true },
                    { dist: 120, label: '120 ม. (ในเขต)', inZone: true },
                    { dist: 450, label: '450 ม. (นอกเขต)', inZone: false },
                  ].map((preset) => (
                    <button
                      key={preset.dist}
                      type="button"
                      onClick={() => setCurrentGpsDistance(preset.dist)}
                      className={`font-semibold underline underline-offset-4 cursor-pointer transition ${
                        currentGpsDistance === preset.dist
                          ? preset.inZone ? 'text-emerald-700 dark:text-emerald-300 font-black' : 'text-rose-700 dark:text-rose-300 font-black'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>}
          </div>}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONLINE LEAVE REQUEST SUBMISSION (ใบลาออนไลน์) */}
      {/* ========================================================================= */}
      {subTab === 'leave_request' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">ยื่นใบลาออนไลน์ผ่านโทรศัพท์</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  สำหรับนักเรียน, ผู้ปกครอง และครู ยื่นขอลาป่วย/ลากิจพร้อมแนบหลักฐาน
                </p>
              </div>
            </div>

            {leaveSuccessNotice && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{leaveSuccessNotice}</span>
              </div>
            )}

            {leaveErrorNotice && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{leaveErrorNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <span className={leaveFormStep === 1 ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}>1. Leave details</span>
                <span>→</span>
                <span className={leaveFormStep === 2 ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}>2. Reason & evidence</span>
              </div>
              {leaveFormStep === 1 && (
                <div className="space-y-4">
              {/* Person Summary / Switcher (Admin only; Student & Teacher locked to own profile) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">ผู้ขอยื่นใบลา:</span>
                {!isRestrictedViewer && currentUser?.role !== 'teacher' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveUserType('student')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition max-w-full truncate cursor-pointer ${
                        effectiveUserType === 'student' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      นักเรียน: {selectedStudent?.firstNameTh} ({selectedStudent?.room})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveUserType('teacher')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition max-w-full truncate cursor-pointer ${
                        effectiveUserType === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      ครู: {selectedTeacher?.fullNameTh}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white truncate">
                      {activePersonName} ({activePersonId})
                    </span>
                  </div>
                )}
              </div>

              {/* Leave Type */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200">ประเภทการลา:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('sick')}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                      leaveType === 'sick' 
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-600 text-rose-800 dark:text-rose-200 shadow-2xs' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    🤒 ลาป่วย
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('personal')}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                      leaveType === 'personal' 
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 shadow-2xs' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    🚗 ลากิจ
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('official')}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                      leaveType === 'official' 
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200 shadow-2xs' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    🏛️ ไปราชการ
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">ตั้งแต่วันที่:</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">ถึงวันที่:</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (leaveStartDate && leaveEndDate) setLeaveFormStep(2);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                  >
                    Continue to reason and evidence
                  </button>
                </div>
              )}

              {leaveFormStep === 2 && (
                <div className="space-y-4">
              {/* Reason */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-200">เหตุผลประกอบการลา:</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="ระบุอาการเจ็บป่วย หรือภารกิจจำเป็น..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Medical certificate / Document attachment */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-200">แนบรูปใบรับรองแพทย์ / เอกสารหลักฐาน (ถ้ามี):</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sampleCert = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500';
                      setLeaveAttachmentUrl(sampleCert);
                    }}
                    className="text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบรูปใบรับรองแพทย์ตัวอย่าง</span>
                  </button>
                  {leaveAttachmentUrl && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>แนบเอกสารแล้ว</span>
                    </span>
                  )}
                </div>

                {leaveAttachmentUrl && (
                  <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 mt-2">
                    <img src={leaveAttachmentUrl} alt="Medical Certificate" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setLeaveAttachmentUrl('')}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งคำขอใบลาให้อาจารย์ประจำชั้น</span>
              </button>
                  <button
                    type="button"
                    onClick={() => setLeaveFormStep(1)}
                    className="w-full py-1 text-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs underline underline-offset-4 cursor-pointer"
                  >
                    ← ย้อนกลับแก้ไขรายละเอียดวันลา
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right: History of Leave Requests (Scoped for students/parents) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-slate-900 dark:text-slate-100">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                {isRestrictedViewer
                  ? `ประวัติใบลาของคุณ (${scopedLeaveRequests.length})`
                  : `ประวัติและสถานะใบลาล่าสุด (${scopedLeaveRequests.length})`}
              </span>
            </h4>

            <div className="space-y-3">
              <PagedList items={scopedLeaveRequests} pageSize={2} emptyState={<p className="text-xs text-slate-600 dark:text-slate-300 py-4 text-center">ยังไม่มีประวัติใบลาของคุณ</p>} renderItem={(req) => (
                <div key={req.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.leaveType === 'sick' ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-200' :
                      req.leaveType === 'personal' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200' : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200'
                    }`}>
                      {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200' :
                      req.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200' : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200'
                    }`}>
                      {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{req.userName}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{req.gradeLevelOrDepartment} • วันที่ {req.startDate} ถึง {req.endDate}</p>
                  </div>

                  <p className="text-slate-700 dark:text-slate-200 text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    "{req.reason}"
                  </p>

                  {req.attachmentUrl && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-400 font-semibold">
                      <FileText className="w-3 h-3" />
                      <span>มีรูปใบรับรองแพทย์แนบ</span>
                    </div>
                  )}

                  {req.approvalRemarks && (
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                      ผู้อนุมัติ: {req.approvedBy} ({req.approvalRemarks})
                    </div>
                  )}

                  {req.status === 'pending' && onUpdateLeaveStatus && (currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติผ่านระบบมือถือ')}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        ✓ อนุมัติใบลา
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ')}
                        className="py-1.5 px-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-200 font-semibold text-xs transition cursor-pointer"
                      >
                        ✕ ปฏิเสธ
                      </button>
                    </div>
                  )}
                </div>
              )} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEACHER PROXY CHECK-IN (REQUIRES STUDENT ID BEFORE CHECK-IN) */}
      {/* ========================================================================= */}
      {subTab === 'teacher_proxy' && isStaffUser && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>ครูเช็กชื่อให้นักเรียน (กรอกรหัสนักเรียนก่อนเช็กชื่อ)</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  กรุณาระบุรหัสนักเรียนเพื่อตรวจสอบตัวตนก่อนบันทึกเวลาเข้า-ออกแทนนักเรียน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProxyShowRosterHint(!proxyShowRosterHint)}
                className="text-xs font-bold text-blue-700 dark:text-blue-400 underline underline-offset-4 cursor-pointer self-start sm:self-auto"
              >
                {proxyShowRosterHint ? 'ซ่อนตารางรหัสนักเรียน' : 'ดูรายชื่อและรหัสนักเรียน'}
              </button>
            </div>

            {proxySavedNotification && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{proxySavedNotification}</span>
              </div>
            )}

            {/* Step 1: Required Student ID Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-100 block">
                  1. กรอกรหัสนักเรียน (Student ID) <span className="text-rose-600">*จำเป็น</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={proxyStudentIdInput}
                      onChange={(e) => setProxyStudentIdInput(e.target.value)}
                      placeholder={`เช่น ${students[0]?.studentIdNumber || 'ED-6901'}`}
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    {proxyStudentIdInput && (
                      <button
                        type="button"
                        onClick={() => setProxyStudentIdInput('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        aria-label="ล้างรหัสนักเรียน"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {students.length > 0 && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    ตัวอย่างรหัสในระบบ: {students.slice(0, 3).map((s) => s.studentIdNumber).join(', ')}
                  </p>
                )}
              </div>

              {/* Verification Feedback & Check-in Controls */}
              {!trimmedProxyStudentId ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>กรุณาใส่รหัสนักเรียนด้านบนก่อนจึงจะสามารถเช็กชื่อให้นักเรียนได้</span>
                </div>
              ) : !matchedProxyStudent ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>ไม่พบนักเรียนรหัส "{trimmedProxyStudentId}" กรุณาตรวจสอบรหัสนักเรียนให้ถูกต้อง</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={matchedProxyStudent.avatarUrl}
                      alt={matchedProxyStudent.firstNameTh}
                      className="w-11 h-11 rounded-xl object-cover border border-emerald-300 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {matchedProxyStudent.firstNameTh} {matchedProxyStudent.lastNameTh}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                          ยืนยันรหัสถูกต้อง ✓
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        รหัส: {matchedProxyStudent.studentIdNumber} • {matchedProxyStudent.gradeLevel} {matchedProxyStudent.room}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Check-in / Check-out & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">ประเภทบันทึก:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProxyCheckType('check_in')}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                            proxyCheckType === 'check_in'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          เข้าโรงเรียน (IN)
                        </button>
                        <button
                          type="button"
                          onClick={() => setProxyCheckType('check_out')}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                            proxyCheckType === 'check_out'
                              ? 'bg-purple-600 text-white'
                              : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          ออกโรงเรียน (OUT)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">สถานะการเข้าเรียน:</span>
                      <div className="flex flex-wrap gap-1">
                        {(['present', 'late', 'sick', 'absent'] as AttendanceStatus[]).map((stt) => (
                          <button
                            key={stt}
                            type="button"
                            onClick={() => setProxySingleStatus(stt)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              proxySingleStatus === stt
                                ? stt === 'present' ? 'bg-emerald-600 text-white' :
                                  stt === 'late' ? 'bg-amber-500 text-slate-950' :
                                  stt === 'sick' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
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
                    onClick={handleConfirmProxySingleCheckin}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>ยืนยันเช็กชื่อให้นักเรียน ({matchedProxyStudent.studentIdNumber})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Optional Reference Roster (Read-only ID lookup so teachers always verify ID above before check-in) */}
          {proxyShowRosterHint && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  รายชื่ออ้างอิงสำหรับตรวจสอบรหัสนักเรียน ({filteredProxyStudents.length} คน)
                </span>
                <select
                  value={proxyGradeFilter}
                  onChange={(e) => setProxyGradeFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="all">ทุกระดับชั้น</option>
                  <option value="มัธยมศึกษาปีที่ 4 (M.4)">ม.4</option>
                  <option value="มัธยมศึกษาปีที่ 5 (M.5)">ม.5</option>
                  <option value="มัธยมศึกษาปีที่ 6 (M.6)">ม.6</option>
                </select>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <PagedList items={filteredProxyStudents} pageSize={4} renderItem={(st) => (
                  <div key={st.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={st.avatarUrl} alt={st.firstNameTh} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{st.firstNameTh} {st.lastNameTh}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{st.gradeLevel} {st.room}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0">
                      {st.studentIdNumber}
                    </span>
                  </div>
                )} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PERIOD ATTENDANCE (รายคาบ) - WITH QR CODE & CHECK-IN LINK */}
      {/* ========================================================================= */}
      {subTab === 'period_checkin' && (
        <div className={`${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto space-y-2.5 p-0.5' : 'space-y-4'}`}>
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>เช็กชื่อเข้าเรียนรายคาบ (QR Code &amp; Link)</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isRestrictedViewer
                    ? 'สแกน QR Code หรือเปิดลิงก์จากอาจารย์เพื่อเช็กชื่อเข้าคาบเรียนของตนเอง'
                    : `สร้าง QR Code และลิงก์ให้นักเรียนสแกนเช็กชื่อเข้าคาบ (${periodStudentIds.length} นักเรียน)`}
                </p>
              </div>
              {isStaffUser && (
                <button
                  type="button"
                  onClick={handleSavePeriodAttendance}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  บันทึกรายชื่อทั้งคาบ
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">เลือกรายวิชา:</label>
                <select
                  value={selectedCourse.id}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
                >
                  {(courses.length > 0 ? courses : [fallbackCourse]).map(c => (
                    <option key={c.id} value={c.id}>{c.code} {c.titleTh}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">เลือกคาบเรียน:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
                >
                  {periodsList.map(p => (
                    <option key={p.period} value={p.period}>{p.label} ({p.time})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">วันที่:</label>
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
                />
              </div>
            </div>

            {periodSavedNotification && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{periodSavedNotification}</span>
              </div>
            )}
          </div>

          {/* QR CODE & SHAREABLE CHECK-IN LINK CARD (Available for teachers to share AND accessible for QR check-in) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <QrCodeMatrix
                  value={periodCheckinUrl}
                  size={embeddedMobile ? 132 : 148}
                  label={`QR Code เช็กชื่อคาบเรียน ${selectedCourse.code} คาบที่ ${selectedPeriod}`}
                />
                <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                  {expectedPeriodCode}
                </span>
              </div>

              <div className="flex-1 min-w-0 w-full space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                    <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>QR Code &amp; ลิงก์เช็กชื่อรายคาบ</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPeriodQrModal(true)}
                    className="text-xs font-bold text-indigo-700 dark:text-indigo-300 underline underline-offset-4 flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>ขยาย QR เต็มจอ</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  วิชา <strong>{selectedCourse.code} {selectedCourse.titleTh}</strong> • คาบที่ {selectedPeriod} • วันที่ {periodDate}
                </p>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={periodCheckinUrl}
                    aria-label="ลิงก์เช็กชื่อรายคาบ"
                    className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-slate-700 dark:text-slate-200 focus:outline-hidden truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPeriodLink}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {periodQrCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{periodQrCopied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-0.5">
                  <a
                    href={periodCheckinUrl}
                    onClick={(e) => {
                      if (isRestrictedViewer) {
                        e.preventDefault();
                        handleStudentSelfPeriodCheckin(periodCheckinUrl);
                      }
                    }}
                    className="font-bold text-blue-700 dark:text-blue-400 underline underline-offset-4 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isRestrictedViewer ? 'กดลิงก์เช็กชื่อเข้าคาบนี้ทันที' : 'เปิดลิงก์เช็กชื่อรายคาบ'}</span>
                  </a>
                  {isStaffUser && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      สแกน/เช็กชื่อแล้ว: {
                        periodAttendance.filter(
                          (p) => p.courseId === selectedCourse.id && p.periodNumber === selectedPeriod && p.date === periodDate && (p.status === 'present' || p.status === 'late')
                        ).length
                      } / {periodStudentIds.length} คน
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STUDENT VIEW: SELF CHECK-IN VIA QR/CODE + OWN RECORD ONLY (NEVER SHOW OTHER STUDENTS) */}
          {isRestrictedViewer ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={selectedStudent?.avatarUrl}
                      alt={selectedStudent?.firstNameTh}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {selectedStudent?.firstNameTh} {selectedStudent?.lastNameTh}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        รหัส {selectedStudent?.studentIdNumber} • {selectedStudent?.room}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                    เห็นเฉพาะข้อมูลของฉัน
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                    วางลิงก์เช็กชื่อ หรือกรอกรหัสจากการสแกน QR คาบเรียน:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <ScanLine className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={studentPeriodCodeInput}
                        onChange={(e) => setStudentPeriodCodeInput(e.target.value)}
                        placeholder={`วางลิงก์หรือรหัส เช่น ${expectedPeriodCode}`}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStudentSelfPeriodCheckin()}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>ยืนยันเช็กชื่อเข้าคาบ</span>
                    </button>
                  </div>
                </div>

                {studentPeriodCheckinMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{studentPeriodCheckinMsg}</span>
                  </div>
                )}

                {studentPeriodCheckinError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{studentPeriodCheckinError}</span>
                  </div>
                )}
              </div>

              {/* Only this student's own period check-in history */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  ประวัติเช็กชื่อรายคาบของคุณ ({scopedPeriodAttendance.length})
                </h4>
                {scopedPeriodAttendance.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-300 text-center py-4">
                    ยังไม่มีบันทึกเช็กชื่อรายคาบของคุณ
                  </p>
                ) : (
                  <PagedList
                    items={scopedPeriodAttendance}
                    pageSize={4}
                    renderItem={(rec) => (
                      <div key={rec.id} className="py-2 flex items-center justify-between gap-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {rec.courseCode} • คาบที่ {rec.periodNumber}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            {rec.date} ({rec.timeSlot}) • {rec.checkMethod === 'qr_code' ? 'สแกน QR/ลิงก์' : 'อาจารย์เช็กชื่อ'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          rec.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                          rec.status === 'late' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200' :
                          rec.status === 'excused' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {rec.status === 'present' ? 'เข้าเรียน' : rec.status === 'late' ? 'สาย' : rec.status === 'excused' ? 'ลา' : 'ขาด'}
                        </span>
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          ) : periodStudentIds.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs">
              ยังไม่มีรายชื่อนักเรียนในโรงเรียนนี้
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <PagedList items={periodStudentIds} pageSize={4} renderItem={(stuId) => {
                  const st = students.find(s => s.id === stuId);
                  if (!st) return null;
                  const savedRecord = periodAttendance.find(
                    (p) => p.studentId === stuId && p.courseId === selectedCourse.id && p.date === periodDate && p.periodNumber === selectedPeriod
                  );
                  const status = periodStatuses[st.id] || savedRecord?.status || 'present';

                  return (
                    <div key={st.id} className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={st.avatarUrl}
                          alt={st.firstNameEn}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{st.firstNameTh} {st.lastNameTh}</p>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] font-mono truncate">
                            ID: {st.studentIdNumber} • ชั้น {st.gradeLevel} {st.room}
                            {savedRecord?.checkMethod === 'qr_code' ? ' • สแกน QR แล้ว' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto max-w-full flex-wrap justify-end">
                        {(['present', 'late', 'absent', 'excused'] as const).map((pst) => (
                          <button
                            key={pst}
                            type="button"
                            onClick={() => setPeriodStatuses(prev => ({ ...prev, [st.id]: pst }))}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                              status === pst
                                ? pst === 'present' ? 'bg-emerald-600 text-white' :
                                  pst === 'late' ? 'bg-amber-500 text-slate-950' :
                                  pst === 'excused' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
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
            </div>
          )}

          {/* Fullscreen QR Code Modal for classroom display */}
          {showPeriodQrModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    QR Code เช็กชื่อเข้าคาบเรียน
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPeriodQrModal(false)}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
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
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedCourse.code} {selectedCourse.titleTh}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    คาบที่ {selectedPeriod} • วันที่ {periodDate}
                  </p>
                  <p className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    รหัสคาบ: {expectedPeriodCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPeriodLink}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {periodQrCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{periodQrCopied ? 'คัดลอกลิงก์เช็กชื่อแล้ว ✓' : 'คัดลอกลิงก์ส่งให้นักเรียน'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                checkinSuccessFeedback.checkType === 'check_in' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {checkinSuccessFeedback.checkType === 'check_in' ? 'เช็กชื่อเข้าโรงเรียนสำเร็จ' : 'เช็กชื่อออกจากโรงเรียนสำเร็จ'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 pt-1">
                {checkinSuccessFeedback.userName}
              </h3>
              <p className="text-xs text-slate-600">{checkinSuccessFeedback.userRole}</p>
            </div>

            {/* Captured Selfie Snapshot preview */}
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-48 mx-auto border-2 border-slate-200 bg-slate-100 shadow-sm">
              <img
                src={checkinSuccessFeedback.photoUrl}
                alt="Verified snapshot"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 p-1 rounded-lg bg-black/75 text-white text-[9px] font-mono flex items-center justify-between">
                <span>{checkinSuccessFeedback.gateName}</span>
                <span>{checkinSuccessFeedback.time} น.</span>
              </div>
            </div>

            {/* Toggle Button for LINE Flex Preview */}
            <button
              type="button"
              onClick={() => setShowLineFlexPreview(!showLineFlexPreview)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{showLineFlexPreview ? 'ซ่อนการ์ดจำลอง LINE' : 'ดูการ์ด LINE Flex Message ที่ส่งหาผู้ปกครอง'}</span>
            </button>

            {/* REALISTIC LINE FLEX MESSAGE CHAT CARD SIMULATOR */}
            {showLineFlexPreview && (
              <div className="p-4 rounded-2xl bg-[#7289DA]/10 border border-[#06C755]/30 text-left space-y-2 animate-fade-in">
                {/* LINE Chat Bubble */}
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
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow">
                      VERIFIED
                    </div>
                  </div>

                  {/* Bubble Content */}
                  <div className="p-3.5 space-y-2 text-xs">
                    <h5 className="font-extrabold text-slate-900 text-sm">
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
                  <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                    <span className="text-[11px] font-bold text-[#06C755] flex items-center justify-center gap-1">
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
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
            >
              ตกลงและปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
