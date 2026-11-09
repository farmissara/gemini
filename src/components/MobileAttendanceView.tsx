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
  FileCheck2
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
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
}) => {
  const [subTab, setSubTab] = useState<'selfie_mobile' | 'leave_request' | 'teacher_proxy' | 'period_checkin'>(
    initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // -------------------------------------------------------------
  // 1. MOBILE SELFIE CHECK-IN/OUT & MULTI-GATE STATE
  // -------------------------------------------------------------
  const [activeUserType, setActiveUserType] = useState<AttendanceUserType>(
    currentUser?.role === 'teacher' ? 'teacher' : 'student'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.find(s => s.id === currentUser?.id)?.id || students[0]?.id || 'stu-1'
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    teachers.find(t => t.id === currentUser?.id)?.id || teachers[0]?.id || 'tch-1'
  );
  const [checkType, setCheckType] = useState<AttendanceCheckType>('check_in');

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
  const [leaveFormStep, setLeaveFormStep] = useState<1 | 2>(1);

  // -------------------------------------------------------------
  // 3. TEACHER PROXY & PERIOD CHECKIN STATE
  // -------------------------------------------------------------
  const [proxyGradeFilter, setProxyGradeFilter] = useState<string>('all');
  const [proxyStatuses, setProxyStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [proxySavedNotification, setProxySavedNotification] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || 'crs-1');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [periodDate, setPeriodDate] = useState<string>(getLocalDateString);
  const [periodStatuses, setPeriodStatuses] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({});
  const [periodSavedNotification, setPeriodSavedNotification] = useState<string | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  const activePersonName = activeUserType === 'teacher' 
    ? selectedTeacher?.fullNameTh || 'อาจารย์' 
    : `${selectedStudent?.firstNameTh} ${selectedStudent?.lastNameTh}`;
  const activePersonRole = activeUserType === 'teacher' 
    ? selectedTeacher?.academicStanding || 'ครูผู้สอน' 
    : `นักเรียน (${selectedStudent?.gradeLevel || 'ม.4'} ห้อง ${selectedStudent?.room || '401'})`;
  const activePersonId = activeUserType === 'teacher' 
    ? selectedTeacher?.teacherIdNumber || selectedTeacher?.id 
    : selectedStudent?.studentIdNumber || selectedStudent?.id;
  const activePersonDefaultAvatar = activeUserType === 'teacher' 
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
    if (!isInGeofence) {
      alert(`คุณอยู่นอกพื้นที่โรงเรียน (เกินรัศมี ${selectedGate.radiusMeters} เมตร) กรุณาเข้ามาในบริเวณโรงเรียน หรือกดปุ่มจำลองให้อยู่ในพื้นที่เพื่อทดสอบ`);
      return;
    }

    const photoToSave = capturedPhotoUrl || activePersonDefaultAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const targetId = activeUserType === 'teacher' ? (selectedTeacher?.id || 'tch-1') : (selectedStudent?.id || 'stu-1');
    const remarks = `${activeUserType === 'teacher' ? 'ครู' : 'นักเรียน'}ถ่ายรูปเซลฟี่${checkType === 'check_in' ? 'เช็กชื่อเข้า' : 'เช็กชื่อออก'}ผ่านมือถือ ที่${selectedGate.nameTh} (ระยะ GPS: ${currentGpsDistance} ม.)`;

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
        userType: activeUserType,
        teacherId: activeUserType === 'teacher' ? targetId : undefined,
        userName: activePersonName,
        userRole: activePersonRole,
        userAvatar: photoToSave,
        userDepartmentOrRoom: activeUserType === 'teacher' ? selectedTeacher?.department : selectedStudent?.room,
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
    if (!leaveReason.trim()) {
      alert('กรุณากรอกเหตุผลการลา');
      return;
    }

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId: activeUserType === 'teacher' ? (selectedTeacher?.id || 'tch-1') : (selectedStudent?.id || 'stu-1'),
      userName: activePersonName,
      userRole: activeUserType,
      gradeLevelOrDepartment: activeUserType === 'teacher' ? selectedTeacher?.department : selectedStudent?.room,
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

  // Teacher Proxy Batch Save
  const handleSaveProxyAttendance = () => {
    let savedCount = 0;
    Object.entries(proxyStatuses).forEach(([stuId, status]) => {
      const student = students.find(s => s.id === stuId);
      if (student) {
        onRecordAttendance(
          stuId, 
          status, 
          `ครูลงชื่อแทน (${currentUser?.fullNameTh || currentUser?.fullNameEn || 'อาจารย์ประจำชั้น'}) - นักเรียนไม่มีมือถือ/ลืมพกมา`,
          'teacher_proxy'
        );
        savedCount++;
      }
    });

    setProxySavedNotification(`บันทึกการเช็คชื่อแทนโดยครูเรียบร้อยแล้ว จำนวน ${savedCount} คน`);
    setTimeout(() => setProxySavedNotification(null), 5000);
  };

  // Period Attendance Save
  const handleSavePeriodAttendance = () => {
    const currentPeriodInfo = periodsList.find(p => p.period === selectedPeriod);
    const newRecords: PeriodAttendanceRecord[] = selectedCourse.enrolledStudentIds.map(stuId => {
      const status = periodStatuses[stuId] || 'present';
      return {
        id: `patt-${Date.now()}-${stuId}`,
        schoolId: selectedCourse.schoolId,
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        periodNumber: selectedPeriod,
        timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
        date: periodDate,
        studentId: stuId,
        status,
        verifiedByTeacherId: currentUser?.id || 'usr-teacher',
        verifiedByTeacherName: currentUser?.fullNameTh || currentUser?.fullNameEn || selectedCourse.teacherName,
        checkMethod: 'teacher_proxy',
        remarks: `เช็คชื่อรายคาบ ${selectedCourse.code} คาบที่ ${selectedPeriod}`
      };
    });

    onRecordPeriodAttendance(newRecords);
    setPeriodSavedNotification(`บันทึกการเช็คชื่อเข้าเรียนรายคาบ ${selectedCourse.code} (คาบที่ ${selectedPeriod}) สำเร็จ`);
    setTimeout(() => setPeriodSavedNotification(null), 5000);
  };

  const filteredProxyStudents = proxyGradeFilter === 'all' 
    ? students 
    : students.filter(s => s.gradeLevel === proxyGradeFilter);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Smart Attendance Ecosystem • GPS Geofence & LINE Flex Alert</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black">
            {lang === 'th' ? 'ระบบเช็กชื่อเข้า-ออกผ่านโทรศัพท์มือถือ' : 'Mobile Selfie Check-in/out Hub'}
          </h1>
          <p className="text-slate-400 text-xs">
            {lang === 'th' 
              ? 'นักเรียนและครูเปิดเข้าระบบจากเครื่องตัวเอง ถ่ายรูปยืนยันตัวตนในเขตพื้นที่โรงเรียนหลายจุด (Multi-Gate Geofence) พร้อมแจ้งเตือน LINE ผู้ปกครอง'
              : 'Self check-in and out for students & teachers with phone camera snapshot, multi-gate GPS radius, and LINE parent notifications.'}
          </p>
        </div>

        {/* Live Clock & Sound Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
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

      {/* Navigation Sub Tabs (Now includes Online Leave Tab) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('selfie_mobile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'selfie_mobile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{lang === 'th' ? '1. ถ่ายรูปเช็กชื่อเข้า-ออก (มือถือ)' : '1. Selfie Check-in/out'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLeaveFormStep(1);
            setSubTab('leave_request');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'leave_request'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{lang === 'th' ? '2. ยื่นใบลาออนไลน์ (Online Leave)' : '2. Online Leave Request'}</span>
          {leaveRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
              {leaveRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('teacher_proxy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'teacher_proxy'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{lang === 'th' ? '3. ครูลงชื่อแทนนักเรียน (Proxy)' : '3. Teacher Proxy'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('period_checkin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'period_checkin'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'th' ? '4. เช็คชื่อรายคาบ (Period)' : '4. Period Attendance'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SELFIE CHECK-IN/OUT (SELF PHONE) FOR STUDENTS & TEACHERS */}
      {/* ========================================================================= */}
      {subTab === 'selfie_mobile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Phone Frame with Camera Live Viewfinder */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Realistic Mobile Device Mockup Frame */}
            <div className="w-full max-w-sm rounded-[40px] bg-slate-900 p-4 shadow-2xl border-4 border-slate-800 relative">
              {/* Dynamic Island */}
              <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-blue-900" />
              </div>

              {/* Screen Inner */}
              <div className="rounded-[30px] bg-slate-950 overflow-hidden relative flex flex-col border border-slate-800 aspect-9/16 sm:aspect-auto sm:min-h-[580px]">
                {/* Status Bar */}
                <div className="px-4 py-2.5 flex items-center justify-between text-[11px] text-white/70 font-semibold bg-black/40 backdrop-blur-xs">
                  <span>{new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-400 font-bold">5G Campus</span>
                    <div className="w-4 h-2 rounded-xs border border-white/60 p-0.5 flex">
                      <div className="w-full h-full bg-emerald-400 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* Event Selector: Check-in vs Check-out */}
                <div className="p-3 bg-black/40 border-b border-white/10">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setCheckType('check_in')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        checkType === 'check_in'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>เช็กชื่อเข้า (IN)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckType('check_out')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        checkType === 'check_out'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>เช็กชื่อออก (OUT)</span>
                    </button>
                  </div>
                </div>

                {/* Gate Location Selector Pill */}
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>จุดประตู:</span>
                  </span>
                  <select
                    value={selectedGateId}
                    onChange={(e) => setSelectedGateId(e.target.value)}
                    className="bg-slate-800 text-white text-[11px] font-semibold rounded-lg px-2 py-0.5 border border-slate-700 focus:outline-hidden"
                  >
                    {campusGates.map(gate => (
                      <option key={gate.id} value={gate.id}>{gate.nameTh}</option>
                    ))}
                  </select>
                </div>

                {/* Camera Viewfinder Box with Face Outline Guide */}
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px]">
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
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-cyan-400/70 shadow-lg shadow-cyan-500/20 flex flex-col items-center justify-center relative animate-pulse">
                        <div className="absolute top-2 w-12 h-1 bg-cyan-400/60 rounded-full" />
                        <div className="text-center px-4 space-y-1">
                          <p className="text-[11px] font-bold text-cyan-200 drop-shadow">
                            วางใบหน้าให้อยู่ในกรอบ
                          </p>
                          <p className="text-[9px] text-cyan-300/80">
                            ถ่ายภาพหน้าตัวเองเพื่อยืนยัน
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floating GPS & Time Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono flex items-center gap-1.5 border border-white/20">
                      <Clock className="w-3 h-3 text-cyan-300" />
                      <span>{new Date().toLocaleTimeString('th-TH')}</span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border backdrop-blur-md ${
                      isInGeofence 
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                        : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      <span>{isInGeofence ? `ในเขต (${currentGpsDistance} ม.)` : `นอกเขต (${currentGpsDistance} ม.)`}</span>
                    </div>
                  </div>

                  {cameraError && !capturedPhotoUrl && (
                    <div className="absolute inset-x-4 bottom-14 p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs backdrop-blur-md text-center space-y-2">
                      <p>{cameraError}</p>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                      >
                        กดถ่ายภาพจำลองทันที
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Camera Controls & Shutter */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                  {capturedPhotoUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCapturedPhotoUrl(null)}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>ถ่ายใหม่</span>
                        </button>
                        <button
                          type="button"
                          disabled={!isInGeofence}
                          onClick={handleConfirmCheckin}
                          className={`flex-2 py-2.5 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition ${
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
                      <p className="text-[10px] text-center text-slate-400">
                        {isInGeofence ? '✅ ถ่ายรูปเรียบร้อย พร้อมส่ง LINE หาผู้ปกครอง' : '⚠️ ไม่สามารถบันทึกได้เนื่องจากอยู่นอกพื้นที่โรงเรียน'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-4 py-1">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="เปิด/รีเฟรชกล้อง"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        disabled={isCapturing}
                        className="w-16 h-16 rounded-full bg-white p-1 shadow-lg shadow-white/20 hover:scale-105 active:scale-95 transition flex items-center justify-center focus:outline-hidden"
                      >
                        <div className="w-full h-full rounded-full border-2 border-slate-900 bg-red-600 hover:bg-red-500 flex items-center justify-center transition">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleRefreshGps}
                        className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="รีเฟรชสัญญาณ GPS"
                      >
                        <Navigation className={`w-4 h-4 ${isGpsLoading ? 'animate-spin text-blue-400' : ''}`} />
                      </button>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-[11px] text-slate-400">
                      ผู้ใช้งาน: <span className="text-white font-bold">{activePersonName}</span> ({activePersonRole})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Settings, Multi-Gate Coordinates & User Switcher */}
          <div className="lg:col-span-5 space-y-5">
            {/* User Profile Card & Role Switcher */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">ระบุตัวตนผู้ใช้โทรศัพท์</h3>
                </div>
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveUserType('student')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeUserType === 'student' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    นักเรียน
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUserType('teacher')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeUserType === 'teacher' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    ครู / บุคลากร
                  </button>
                </div>
              </div>

              {activeUserType === 'student' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">เลือกรายชื่อนักเรียน (จำลองเครื่องตัวเอง):</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber}) - ชั้น {st.gradeLevel} {st.room}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">เลือกรายชื่อครู (จำลองเครื่องตัวเอง):</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {teachers.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.fullNameTh} ({tc.teacherIdNumber}) - {tc.academicStanding} ({tc.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <img
                  src={activePersonDefaultAvatar}
                  alt={activePersonName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                  <p className="font-bold text-slate-900 truncate">{activePersonName}</p>
                  <p className="text-slate-500 truncate text-[11px]">{activePersonRole}</p>
                  <p className="font-mono text-slate-400 text-[10px]">ID: {activePersonId}</p>
                </div>
              </div>
            </div>

            {/* Multi-Gate Geofence Radar */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">จุดเช็กชื่อพิกัด Geofence ({campusGates.length} จุด)</h3>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
                  <span>ตรวจพิกัด</span>
                </button>
              </div>

              {/* Multi-gate Selector List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">เลือกประตูหรือจุดเช็กชื่อ:</label>
                <div className="grid grid-cols-1 gap-2">
                  <PagedList items={campusGates} pageSize={3} renderItem={(gate) => {
                    const isSelected = gate.id === selectedGateId;
                    return (
                      <button
                        key={gate.id}
                        type="button"
                        onClick={() => setSelectedGateId(gate.id)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                          isSelected 
                            ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs ring-1 ring-blue-400' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs">{gate.nameTh}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
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
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {isInGeofence ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs">
                  <p className="font-bold">
                    {isInGeofence 
                      ? `คุณอยู่ในเขต: ${selectedGate.nameTh}` 
                      : `คุณอยู่นอกเขต: ${selectedGate.nameTh}`}
                  </p>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    ระยะห่าง: <strong className="font-mono">{currentGpsDistance} เมตร</strong> (รัศมีที่อนุญาต {selectedGate.radiusMeters} ม.)
                  </p>
                </div>
              </div>

              {/* Testing Presets for Location */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700">จำลองระยะห่างเพื่อทดสอบระบบ:</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentGpsDistance(15)}
                    className={`py-1.5 rounded-lg border font-semibold transition ${
                      currentGpsDistance === 15 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    15 ม. (ในเขต)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentGpsDistance(35)}
                    className={`py-1.5 rounded-lg border font-semibold transition ${
                      currentGpsDistance === 35 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    35 ม. (ในเขต)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentGpsDistance(120)}
                    className={`py-1.5 rounded-lg border font-semibold transition ${
                      currentGpsDistance === 120 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    120 ม. (ในเขต)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentGpsDistance(450)}
                    className={`py-1.5 rounded-lg border font-semibold transition ${
                      currentGpsDistance === 450 
                        ? 'bg-rose-600 text-white border-rose-600' 
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    450 ม. (นอกเขต)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONLINE LEAVE REQUEST SUBMISSION (ใบลาออนไลน์) */}
      {/* ========================================================================= */}
      {subTab === 'leave_request' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยื่นใบลาออนไลน์ผ่านโทรศัพท์</h3>
                <p className="text-xs text-slate-500">
                  สำหรับนักเรียน, ผู้ปกครอง และครู ยื่นขอลาป่วย/ลากิจพร้อมแนบหลักฐาน
                </p>
              </div>
            </div>

            {leaveSuccessNotice && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{leaveSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <span className={leaveFormStep === 1 ? 'font-bold text-emerald-700' : ''}>1. Leave details</span>
                <span>→</span>
                <span className={leaveFormStep === 2 ? 'font-bold text-emerald-700' : ''}>2. Reason & evidence</span>
              </div>
              {leaveFormStep === 1 && (
                <div className="space-y-4">
              {/* Person Switcher */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700">ผู้ขอยื่นใบลา:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveUserType('student')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      activeUserType === 'student' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    นักเรียน: {selectedStudent?.firstNameTh} ({selectedStudent?.room})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUserType('teacher')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      activeUserType === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    ครู: {selectedTeacher?.fullNameTh}
                  </button>
                </div>
              </div>

              {/* Leave Type */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">ประเภทการลา:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('sick')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      leaveType === 'sick' 
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🤒 ลาป่วย (Sick)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('personal')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      leaveType === 'personal' 
                        ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🚗 ลากิจ (Personal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('official')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      leaveType === 'official' 
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🏛️ ไปราชการ/อบรม
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">ตั้งแต่วันที่:</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">ถึงวันที่:</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                    required
                  />
                </div>
              </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (leaveStartDate && leaveEndDate) setLeaveFormStep(2);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
                  >
                    Continue to reason and evidence
                  </button>
                </div>
              )}

              {leaveFormStep === 2 && (
                <div className="space-y-4">
              {/* Reason */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">เหตุผลประกอบการลา:</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="ระบุอาการเจ็บป่วย หรือภารกิจจำเป็น..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Medical certificate / Document attachment */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700">แนบรูปใบรับรองแพทย์ / เอกสารหลักฐาน (ถ้ามี):</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sampleCert = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500';
                      setLeaveAttachmentUrl(sampleCert);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบรูปใบรับรองแพทย์ตัวอย่าง</span>
                  </button>
                  {leaveAttachmentUrl && (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>แนบเอกสารแล้ว</span>
                    </span>
                  )}
                </div>

                {leaveAttachmentUrl && (
                  <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-slate-300 mt-2">
                    <img src={leaveAttachmentUrl} alt="Medical Certificate" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setLeaveAttachmentUrl('')}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>ส่งคำขอใบลาให้อาจารย์ประจำชั้น</span>
              </button>
                  <button
                    type="button"
                    onClick={() => setLeaveFormStep(1)}
                    className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Back to leave details
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right: History of Leave Requests */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>ประวัติและสถานะใบลาล่าสุด ({leaveRequests.length})</span>
            </h4>

            <div className="space-y-3">
              <PagedList items={leaveRequests} pageSize={2} renderItem={(req) => (
                <div key={req.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.leaveType === 'sick' ? 'bg-rose-100 text-rose-700' :
                      req.leaveType === 'personal' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">{req.userName}</p>
                    <p className="text-[11px] text-slate-500">{req.gradeLevelOrDepartment} • วันที่ {req.startDate} ถึง {req.endDate}</p>
                  </div>

                  <p className="text-slate-600 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                    "{req.reason}"
                  </p>

                  {req.attachmentUrl && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-semibold">
                      <FileText className="w-3 h-3" />
                      <span>มีรูปใบรับรองแพทย์แนบ</span>
                    </div>
                  )}

                  {req.approvalRemarks && (
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                      ผู้อนุมัติ: {req.approvedBy} ({req.approvalRemarks})
                    </div>
                  )}

                  {req.status === 'pending' && onUpdateLeaveStatus && (currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
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
                        className="py-1.5 px-3 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold text-xs transition cursor-pointer"
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
      {/* TAB 3: TEACHER PROXY BATCH CHECK-IN */}
      {/* ========================================================================= */}
      {subTab === 'teacher_proxy' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">ครูลงชื่อแทนนักเรียน (Teacher Proxy)</h3>
                <p className="text-xs text-slate-500">กรณีนักเรียนไม่มีสมาร์ตโฟน, แบตหมด, หรือลืมโทรศัพท์</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={proxyGradeFilter}
                  onChange={(e) => setProxyGradeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-slate-50"
                >
                  <option value="all">ทุกระดับชั้น</option>
                  <option value="มัธยมศึกษาปีที่ 4 (M.4)">มัธยมศึกษาปีที่ 4 (M.4)</option>
                  <option value="มัธยมศึกษาปีที่ 5 (M.5)">มัธยมศึกษาปีที่ 5 (M.5)</option>
                  <option value="มัธยมศึกษาปีที่ 6 (M.6)">มัธยมศึกษาปีที่ 6 (M.6)</option>
                </select>
                <button
                  type="button"
                  onClick={handleSaveProxyAttendance}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                >
                  บันทึกการเช็คชื่อแทน
                </button>
              </div>
            </div>

            {proxySavedNotification && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{proxySavedNotification}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              <PagedList items={filteredProxyStudents} pageSize={4} renderItem={(st) => {
                const currentStatus = proxyStatuses[st.id] || 'present';
                return (
                  <div key={st.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={st.avatarUrl}
                        alt={st.firstNameEn}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{st.firstNameTh} {st.lastNameTh}</p>
                        <p className="text-slate-500 text-[11px] font-mono">
                          ID: {st.studentIdNumber} • ชั้น {st.gradeLevel} {st.room}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {(['present', 'late', 'sick', 'absent'] as AttendanceStatus[]).map((stt) => (
                        <button
                          key={stt}
                          type="button"
                          onClick={() => setProxyStatuses(prev => ({ ...prev, [st.id]: stt }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            currentStatus === stt
                              ? stt === 'present' ? 'bg-emerald-600 text-white' :
                                stt === 'late' ? 'bg-amber-500 text-white' :
                                stt === 'sick' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {stt === 'present' ? 'มา' : stt === 'late' ? 'สาย' : stt === 'sick' ? 'ลา' : 'ขาด'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PERIOD ATTENDANCE (รายคาบ) */}
      {/* ========================================================================= */}
      {subTab === 'period_checkin' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">เช็คชื่อเข้าเรียนรายวิชา / รายคาบ</h3>
                <p className="text-xs text-slate-500">บันทึกสถิติการเข้าเรียนในแต่ละคาบสอนตามตารางสอน</p>
              </div>
              <button
                type="button"
                onClick={handleSavePeriodAttendance}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
              >
                บันทึกการเช็คชื่อรายคาบ
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600">เลือกรายวิชา:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} {c.titleTh}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">เลือกคาบเรียน:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                >
                  {periodsList.map(p => (
                    <option key={p.period} value={p.period}>{p.label} ({p.time})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">วันที่:</label>
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>
            </div>

            {periodSavedNotification && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{periodSavedNotification}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              <PagedList items={selectedCourse.enrolledStudentIds} pageSize={4} renderItem={(stuId) => {
                const st = students.find(s => s.id === stuId);
                if (!st) return null;
                const status = periodStatuses[st.id] || 'present';

                return (
                  <div key={st.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={st.avatarUrl}
                        alt={st.firstNameEn}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{st.firstNameTh} {st.lastNameTh}</p>
                        <p className="text-slate-500 text-[11px] font-mono">
                          ID: {st.studentIdNumber} • ชั้น {st.gradeLevel} {st.room}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {(['present', 'late', 'absent', 'excused'] as const).map((pst) => (
                        <button
                          key={pst}
                          type="button"
                          onClick={() => setPeriodStatuses(prev => ({ ...prev, [st.id]: pst }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            status === pst
                              ? pst === 'present' ? 'bg-emerald-600 text-white' :
                                pst === 'late' ? 'bg-amber-500 text-white' :
                                pst === 'excused' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {pst === 'present' ? 'เข้าเรียน' : pst === 'late' ? 'มาสาย' : pst === 'excused' ? 'ลาป่วย/กิจ' : 'ขาดเรียน'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS CONFIRMATION MODAL & LINE FLEX MESSAGE PREVIEW POPUP */}
      {/* ========================================================================= */}
      {checkinSuccessFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
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
              <p className="text-xs text-slate-500">{checkinSuccessFeedback.userRole}</p>
            </div>

            {/* Captured Selfie Snapshot preview */}
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-48 mx-auto border-2 border-slate-200 bg-slate-100 shadow-sm">
              <img
                src={checkinSuccessFeedback.photoUrl}
                alt="Verified snapshot"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white text-[9px] font-mono flex items-center justify-between">
                <span>{checkinSuccessFeedback.gateName}</span>
                <span>{checkinSuccessFeedback.time} น.</span>
              </div>
            </div>

            {/* Toggle Button for LINE Flex Preview */}
            <button
              type="button"
              onClick={() => setShowLineFlexPreview(!showLineFlexPreview)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{showLineFlexPreview ? 'ซ่อนการ์ดจำลอง LINE' : 'ดูการ์ด LINE Flex Message ที่ส่งหาผู้ปกครอง'}</span>
            </button>

            {/* REALISTIC LINE FLEX MESSAGE CHAT CARD SIMULATOR */}
            {showLineFlexPreview && (
              <div className="p-4 rounded-2xl bg-[#7289DA]/10 border border-[#06C755]/30 text-left space-y-2 animate-fade-in">
                {/* LINE Chat Bubble */}
                <div className="rounded-2xl overflow-hidden bg-white shadow-md border border-slate-200">
                  {/* Green Top Header */}
                  <div className="bg-[#06C755] text-white p-3 flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โรงเรียนเอ็ดดูเวิร์สวิทยานุสรณ์ (LINE OA)</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-80">{checkinSuccessFeedback.time}</span>
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
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ชื่อนักเรียน:</span>
                        <span className="font-bold text-slate-800">{checkinSuccessFeedback.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">เวลาบันทึก:</span>
                        <span className="font-mono text-slate-800">{checkinSuccessFeedback.time} น.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">จุดผ่านเข้า-ออก:</span>
                        <span className="text-slate-800">{checkinSuccessFeedback.gateName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">สถานะ GPS:</span>
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
