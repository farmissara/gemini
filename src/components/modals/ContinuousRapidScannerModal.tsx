import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  SwitchCamera, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  ScanLine, 
  Users, 
  X, 
  Clock, 
  Sparkles, 
  Keyboard, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Maximize2,
  Minimize2,
  WifiOff,
  Megaphone
} from 'lucide-react';
import { Student, Teacher, AttendanceRecord, AttendanceStatus, AttendanceCheckType, AppLanguage, AuthUser } from '../../types';
import { getLocalDateString } from '../../lib/date';
import { sendEduVerseNotification } from '../../lib/pushNotifications';
import { enqueueOfflineAction, isOnlineNow } from '../../lib/offlineSync';
import {
  openCameraStream,
  stopCameraStream,
  formatCameraErrorTh,
  type CameraFacingMode,
} from '../../lib/cameraStream';

interface ContinuousRapidScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers?: Teacher[];
  schoolId?: string;
  currentUser?: AuthUser | null;
  onRecordAttendance: (
    studentId: string,
    status: AttendanceStatus,
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: 'student' | 'teacher';
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userDepartmentOrRoom?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => void;
  lang?: AppLanguage;
  mode?: AttendanceCheckType;
}

export const ContinuousRapidScannerModal: React.FC<ContinuousRapidScannerModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers = [],
  schoolId = 'school-1',
  currentUser,
  onRecordAttendance,
  lang = 'th',
  mode: initialMode = 'check_in',
}) => {
  const [scanMode, setScanMode] = useState<AttendanceCheckType>(initialMode);
  const [kioskMode, setKioskMode] = useState(false);
  const [gateNotice, setGateNotice] = useState('ยินดีต้อนรับสู่โรงเรียน • สแกนบัตรหน้าประตู 1 เพื่อเข้าเรียน');
  const [editingGateNotice, setEditingGateNotice] = useState(false);
  const [offlineSavedBanner, setOfflineSavedBanner] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraRetry, setCameraRetry] = useState(0);
  const [manualIdInput, setManualIdInput] = useState('');
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [flashWarning, setFlashWarning] = useState<string | null>(null);
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [scannedSessionQueue, setScannedSessionQueue] = useState<Array<{
    student: Student;
    time: string;
    status: AttendanceStatus;
    type: AttendanceCheckType;
  }>>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const lastScannedTimeMapRef = useRef<Map<string, number>>(new Map());

  // Web Audio Synthesizer for Rapid Beep (loud and crisp short alert)
  const playBeep = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isSuccess) {
        // Loud, crisp short ding (987Hz -> 1760Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.06);
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } else {
        // Short, loud warning buzz (340Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      }
      window.setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 240);
    } catch {
      // Audio error ignored
    }
  };

  const triggerHaptic = (isSuccess: boolean) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(isSuccess ? [80] : [100, 50, 100]);
      } catch {
        // Vibrate error ignored
      }
    }
  };

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const requestId = ++cameraRequestRef.current;
    async function startCamera() {
      setCameraError(null);
      setCameraNotice(null);
      setIsCameraStarting(true);
      try {
        const result = await openCameraStream({
          facingMode,
          currentStream: streamRef.current,
          videoEl: videoRef.current,
          idealWidth: 1280,
          idealHeight: 720,
          allowAnyFallback: true,
          isCancelled: () => !active || cameraRequestRef.current !== requestId,
        });

        if (!active || cameraRequestRef.current !== requestId) {
          stopCameraStream(result.stream, null);
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stopCameraStream(result.stream, null);
          throw new Error('CAMERA_VIEW_UNAVAILABLE');
        }

        streamRef.current = result.stream;
        video.srcObject = result.stream;
        try {
          await video.play();
        } catch {
          // Ignore strict autoplay promise interruptions
        }

        if (!active || cameraRequestRef.current !== requestId) {
          stopCameraStream(result.stream, video);
          return;
        }

        if (result.requestedUnavailable) {
          setCameraNotice(
            facingMode === 'environment'
              ? 'อุปกรณ์นี้มีกล้องเพียง 1 ตัว จึงแสดงภาพจากกล้องที่มีอยู่'
              : 'แสดงภาพจากกล้องที่มีอยู่บนอุปกรณ์นี้'
          );
        }
        setIsCameraStarting(false);
      } catch (err) {
        if (err instanceof Error && err.message === 'CAMERA_CANCELLED') {
          return;
        }
        if (!active || cameraRequestRef.current !== requestId) return;
        setCameraError(formatCameraErrorTh(err, facingMode));
        setIsCameraStarting(false);
        stopCameraStream(streamRef.current, videoRef.current);
        streamRef.current = null;
      }
    }

    void startCamera();

    return () => {
      active = false;
      cameraRequestRef.current++;
      stopCameraStream(streamRef.current, videoRef.current);
      streamRef.current = null;
    };
  }, [isOpen, facingMode, cameraRetry]);

  if (!isOpen) return null;

  // Process a scanned student or teacher/staff barcode/QR code
  const processScannedCode = (rawCode: string) => {
    const trimmed = rawCode.trim();
    const isExplicitStaff = /^EDUVERSE:STF:/i.test(trimmed);
    const cleaned = trimmed.replace(/^EDUVERSE:(?:STU|STF):/i, '');
    const tokens = cleaned.split(':');
    const targetIdNumber = (tokens[0] || cleaned).trim();

    const matchedTeacher =
      teachers.find(
        (t) =>
          (t.teacherIdNumber || '').toLowerCase() === targetIdNumber.toLowerCase() ||
          t.id.toLowerCase() === targetIdNumber.toLowerCase()
      ) || null;

    const matchedStudent = !isExplicitStaff
      ? students.find(
          (s) =>
            (s.studentIdNumber || '').toLowerCase() === targetIdNumber.toLowerCase() ||
            s.id.toLowerCase() === targetIdNumber.toLowerCase() ||
            (s.nationalId && s.nationalId === targetIdNumber)
        ) || null
      : null;

    const matched = matchedStudent;

    if (!matched && !matchedTeacher) {
      setFlashWarning(
        lang === 'th' ? `ไม่พบรหัสนักเรียนหรือครู: ${targetIdNumber}` : `ID not found: ${targetIdNumber}`
      );
      playBeep(false);
      triggerHaptic(false);
      setTimeout(() => setFlashWarning(null), 2500);
      return;
    }

    const entityId = matched ? matched.id : matchedTeacher!.id;
    const entityDisplayName = matched
      ? `${matched.firstNameTh} ${matched.lastNameTh}`
      : matchedTeacher!.fullNameTh;

    // Cooldown check: prevent duplicate re-scan within 6 seconds
    const nowMs = Date.now();
    const lastScanMs = lastScannedTimeMapRef.current.get(entityId) || 0;
    if (nowMs - lastScanMs < 6000) {
      setFlashWarning(
        lang === 'th'
          ? `เพิ่งสแกนไปเมื่อสักครู่: ${entityDisplayName} (รอ 6 วินาที)`
          : `Recently scanned: ${entityDisplayName}`
      );
      playBeep(false);
      triggerHaptic(false);
      setTimeout(() => setFlashWarning(null), 2000);
      return;
    }

    lastScannedTimeMapRef.current.set(entityId, nowMs);
    const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const status: AttendanceStatus = 'present';

    if (matchedTeacher && !matched) {
      const remarksText =
        scanMode === 'check_in'
          ? 'สแกนบัตรครู/บุคลากรเข้าปฏิบัติงาน (Rapid Scanner)'
          : 'สแกนบัตรครู/บุคลากรออกงาน (Rapid Checkout)';
      const staffExtra = {
        recordType: scanMode,
        photoUrl: matchedTeacher.avatarUrl,
        userType: 'teacher' as const,
        teacherId: matchedTeacher.id,
        userName: matchedTeacher.fullNameTh,
        userRole: matchedTeacher.positionTitle || matchedTeacher.academicStanding || 'ครู / บุคลากร',
        userDepartmentOrRoom: matchedTeacher.department,
        recordedBy: currentUser?.fullNameTh,
        recordedByRole: currentUser?.role,
      };
      onRecordAttendance(matchedTeacher.id, status, remarksText, 'qr_scanner', staffExtra);
      sendEduVerseNotification({
        title:
          scanMode === 'check_in'
            ? `🔔 [บุคลากรเข้างาน] ${matchedTeacher.fullNameTh}`
            : `🔔 [บุคลากรออกงาน] ${matchedTeacher.fullNameTh}`,
        body: `สแกนบัตรบุคลากรเวลา ${nowTimeStr} (${matchedTeacher.department})`,
        category: 'attendance',
        priority: 'normal',
        schoolId,
        targetUserIds: [matchedTeacher.id],
        targetRoles: ['teacher', 'admin', 'super_admin'],
      });
      setLastScannedStudent({
        id: matchedTeacher.id,
        studentIdNumber: matchedTeacher.teacherIdNumber,
        firstNameTh: matchedTeacher.fullNameTh,
        lastNameTh: '',
        firstNameEn: matchedTeacher.fullNameEn,
        lastNameEn: '',
        gender: matchedTeacher.gender,
        dateOfBirth: '',
        gradeLevel: matchedTeacher.positionTitle || 'บุคลากร',
        room: matchedTeacher.department,
        status: 'active',
        avatarUrl: matchedTeacher.avatarUrl,
        gpa: 0,
        guardianName: '',
        guardianRelation: '',
        guardianPhone: '',
        guardianEmail: '',
        enrolledDate: '',
      });
      setFlashSuccess(true);
      setFlashWarning(null);
      playBeep(true);
      triggerHaptic(true);
      setTimeout(() => setFlashSuccess(false), 900);
      setScannedSessionQueue((prev) => [
        {
          student: {
            id: matchedTeacher.id,
            studentIdNumber: matchedTeacher.teacherIdNumber,
            firstNameTh: matchedTeacher.fullNameTh,
            lastNameTh: '',
            firstNameEn: matchedTeacher.fullNameEn,
            lastNameEn: '',
            gender: matchedTeacher.gender,
            dateOfBirth: '',
            gradeLevel: 'ครู/บุคลากร',
            room: matchedTeacher.department,
            status: 'active',
            avatarUrl: matchedTeacher.avatarUrl,
            gpa: 0,
            guardianName: '',
            guardianRelation: '',
            guardianPhone: '',
            guardianEmail: '',
            enrolledDate: '',
          },
          time: nowTimeStr,
          status: 'present',
          type: scanMode,
        },
        ...prev.slice(0, 24),
      ]);
      return;
    }

    const matchedStu = matched!;
    const remarksText = scanMode === 'check_in'
      ? 'สแกนบัตรต่อเนื่อง ประตูโรงเรียน (Rapid Scanner)'
      : 'สแกนบัตรเลิกเรียน (Rapid Checkout)';
    const extraPayload = {
      recordType: scanMode,
      photoUrl: matchedStu.avatarUrl,
      userType: 'student' as const,
      userName: `${matchedStu.firstNameTh} ${matchedStu.lastNameTh}`,
      userRole: `นักเรียน (${matchedStu.gradeLevel})`,
      userDepartmentOrRoom: matchedStu.room,
      recordedBy: currentUser?.fullNameTh,
      recordedByRole: currentUser?.role,
    };

    if (!isOnlineNow()) {
      enqueueOfflineAction({
        actionType: 'attendance',
        userId: currentUser?.id || '',
        schoolId: matchedStu.schoolId || schoolId,
        description: `${scanMode === 'check_in' ? 'เช็คชื่อเข้าเรียน' : 'ปล่อยกลับบ้าน'} ${matchedStu.firstNameTh} ${matchedStu.lastNameTh} (${matchedStu.studentIdNumber})`,
        payload: {
          studentId: matchedStu.id,
          status,
          remarks: remarksText,
          method: 'qr_scanner',
          extra: extraPayload,
        },
      });
      setOfflineSavedBanner(`ไม่มีอินเทอร์เน็ต · บันทึก ${matchedStu.firstNameTh} ในคิวออฟไลน์แล้ว`);
      setTimeout(() => setOfflineSavedBanner(null), 3000);
    }

    onRecordAttendance(
      matchedStu.id,
      status,
      remarksText,
      'qr_scanner',
      extraPayload
    );

    // Send push notification to parents
    sendEduVerseNotification({
      title: scanMode === 'check_in' 
        ? `🔔 [เข้าโรงเรียน] ${matchedStu.firstNameTh} ${matchedStu.lastNameTh}` 
        : `🔔 [ออกจากโรงเรียน] ${matchedStu.firstNameTh} ${matchedStu.lastNameTh}`,
      body: `สแกนบัตรผ่านประตูแล้ว เวลา ${nowTimeStr} (${matchedStu.room}) สถานะ: เข้าเรียนตรงเวลา`,
      category: 'attendance',
      priority: 'urgent',
    });

    // Visual & Audio Feedback
    setLastScannedStudent(matchedStu);
    setFlashSuccess(true);
    setFlashWarning(null);
    playBeep(true);
    triggerHaptic(true);
    setTimeout(() => setFlashSuccess(false), 900);

    // Prepend to Session Queue
    setScannedSessionQueue(prev => [
      {
        student: matchedStu,
        time: nowTimeStr,
        status: 'present',
        type: scanMode,
      },
      ...prev.slice(0, 24),
    ]);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIdInput.trim()) return;
    processScannedCode(manualIdInput);
    setManualIdInput('');
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs ${kioskMode ? 'p-0' : 'p-2 sm:p-4'} animate-in fade-in duration-150`}>
      <div className={`w-full bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden text-[var(--color-text-body)] ${
        kioskMode ? 'h-screen max-w-none max-h-none rounded-none' : 'max-w-2xl rounded-3xl max-h-[95vh]'
      }`}>
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-card-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-1.5">
                <span>{lang === 'th' ? (kioskMode ? 'Gate Kiosk ประตูโรงเรียน (เต็มหน้าจอ)' : 'สแกนเนอร์บาร์โค้ด & QR ต่อเนื่อง') : 'Continuous Rapid Scanner'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold tabular-nums">
                  {scannedSessionQueue.length} {lang === 'th' ? 'คนแล้ว' : 'scanned'}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {lang === 'th' ? 'สแกนรัว 1-2 วินาที/คน พร้อมเสียงปี๊บ คิวออฟไลน์ และแจ้งเตือนผู้ปกครองทันที' : 'Fast 1-second continuous check-in with beep & offline queue'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setKioskMode((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                kioskMode
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)]'
              }`}
              title="สลับโหมด Kiosk ประตูโรงเรียนเต็มหน้าจอ"
            >
              {kioskMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{kioskMode ? 'ย่อหน้าต่าง' : 'Gate Kiosk'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border border-[var(--color-border)] transition cursor-pointer ${
                soundEnabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-400'
              }`}
              title={soundEnabled ? 'เปิดเสียงปี๊บ' : 'ปิดเสียง'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
              disabled={isCameraStarting}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] transition cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5 text-[11px] font-bold"
              title="สลับกล้องหน้า/หลัง"
            >
              <SwitchCamera className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gate Notice Banner (for Kiosk Display) */}
        <div className="px-3.5 py-2 border-b border-[var(--color-border)] bg-[var(--color-primary-light)]/60 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Megaphone className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
            {editingGateNotice ? (
              <input
                type="text"
                value={gateNotice}
                onChange={(e) => setGateNotice(e.target.value)}
                onBlur={() => setEditingGateNotice(false)}
                autoFocus
                className="w-full px-2 py-0.5 rounded border border-[var(--color-primary)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
              />
            ) : (
              <span className="font-semibold text-[var(--color-text-title)] truncate">{gateNotice}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditingGateNotice((prev) => !prev)}
            className="text-[11px] font-bold text-[var(--color-primary-text)] hover:underline shrink-0 cursor-pointer"
          >
            {editingGateNotice ? 'เสร็จสิ้น' : 'แก้ประกาศประตู'}
          </button>
        </div>

        {offlineSavedBanner && (
          <div className="px-3.5 py-2 bg-amber-100 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 shrink-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>{offlineSavedBanner}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="p-2.5 border-b border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex p-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <button
              type="button"
              onClick={() => setScanMode('check_in')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                scanMode === 'check_in'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'เข้าโรงเรียน (Check-in)' : 'Morning In'}
            </button>
            <button
              type="button"
              onClick={() => setScanMode('check_out')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                scanMode === 'check_out'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'ปล่อยกลับบ้าน (Dismissal)' : 'Dismissal Out'}
            </button>
          </div>
          {!isOnlineNow() && (
            <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-[11px] font-bold flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> ออฟไลน์
            </span>
          )}
        </div>

        {/* Viewfinder Section */}
        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[220px] sm:min-h-[260px] max-h-[300px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          <button
            type="button"
            disabled={isCameraStarting}
            onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
            className="absolute top-3 right-3 z-30 h-9 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white border border-white/25 backdrop-blur-md shadow-lg inline-flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-55"
            title={facingMode === 'environment' ? 'สลับเป็นกล้องหน้า' : 'สลับเป็นกล้องหลัง'}
            aria-label="สลับกล้องหน้าหรือกล้องหลัง"
          >
            <SwitchCamera className={`w-4 h-4 shrink-0 ${isCameraStarting ? 'animate-spin' : ''}`} />
            <span>{lang === 'th' ? `สลับกล้อง · ${facingMode === 'environment' ? 'หลัง' : 'หน้า'}` : `Flip · ${facingMode === 'environment' ? 'Rear' : 'Front'}`}</span>
          </button>
          {cameraNotice && !cameraError && !isCameraStarting && (
            <div className="absolute inset-x-4 bottom-3 z-20 rounded-xl bg-slate-900/85 border border-slate-700 px-3 py-1.5 text-center text-[11px] text-slate-200 backdrop-blur-md">
              {cameraNotice}
            </div>
          )}
          {cameraError && (
            <div role="alert" className="absolute inset-x-4 bottom-4 z-20 rounded-xl bg-slate-900/95 p-3 text-center text-xs text-white shadow-xl border border-slate-700">
              <p className="font-bold">{cameraError}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraRetry(retry => retry + 1)}
                  className="rounded-lg bg-white px-3 py-1.5 font-bold text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  {lang === 'th' ? 'ลองเปิดกล้องอีกครั้ง' : 'Retry camera'}
                </button>
                <button
                  type="button"
                  onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 font-bold text-white hover:bg-slate-600 cursor-pointer"
                >
                  {lang === 'th'
                    ? `สลับใช้${facingMode === 'environment' ? 'กล้องหน้า' : 'กล้องหลัง'}`
                    : 'Switch camera'}
                </button>
              </div>
            </div>
          )}
          {isCameraStarting && (
            <div role="status" className="absolute inset-x-4 bottom-4 z-20 rounded-xl bg-slate-900/80 p-2 text-center text-xs font-semibold text-white">
              {lang === 'th' ? `กำลังเปิด${facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'}...` : 'Starting camera...'}
            </div>
          )}

          {/* Scan Reticle & Guide Box */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            <div className={`relative w-64 h-36 sm:w-72 sm:h-40 rounded-2xl border-2 transition-all duration-300 ${
              flashSuccess 
                ? 'border-emerald-400 bg-emerald-500/25 scale-105 shadow-2xl shadow-emerald-500/50' 
                : flashWarning
                ? 'border-rose-400 bg-rose-500/25 shadow-2xl shadow-rose-500/50'
                : 'border-white/80 shadow-lg'
            }`}>
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />

              {/* Animated scanning laser line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Flash Warning Banner */}
          {flashWarning && (
            <div className="absolute top-4 inset-x-4 z-20 p-2.5 rounded-xl bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xl animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{flashWarning}</span>
            </div>
          )}

          {/* Success Student Banner */}
          {lastScannedStudent && flashSuccess && (
            <div className="absolute bottom-3 inset-x-4 z-20 p-2.5 rounded-2xl bg-emerald-700/95 backdrop-blur-md text-white flex items-center gap-3 shadow-2xl animate-in zoom-in-95">
              <img
                src={lastScannedStudent.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-xl object-cover border border-white/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-emerald-200 font-bold block">
                  {lang === 'th' ? '✓ เช็คชื่อสำเร็จ (ตรงเวลา)' : '✓ Checked in on time'}
                </span>
                <p className="text-xs font-black truncate">
                  {lastScannedStudent.firstNameTh} {lastScannedStudent.lastNameTh} ({lastScannedStudent.room})
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            </div>
          )}
        </div>

        {/* Manual Barcode / ID Input Bar */}
        <form onSubmit={handleManualSubmit} className="p-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center gap-2 shrink-0 text-xs">
          <div className="relative flex-1">
            <Keyboard className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'th' ? 'หรือยิงบาร์โค้ด / พิมพ์รหัสนักเรียน (เช่น STU-001)...' : 'Scan barcode / Enter Student ID...'}
              value={manualIdInput}
              onChange={(e) => setManualIdInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shrink-0 transition cursor-pointer"
          >
            {lang === 'th' ? 'บันทึก' : 'Check'}
          </button>
        </form>

        {/* Scanned Live Session Queue Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-title)] px-1">
            <span>{lang === 'th' ? 'รายการที่สแกนแล้วในรอบนี้' : 'Scanned in this session'}</span>
            <span className="text-[11px] text-[var(--color-text-muted)] font-normal">
              {scannedSessionQueue.length} รายการ
            </span>
          </div>

          {scannedSessionQueue.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--color-text-muted)] space-y-1">
              <ScanLine className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold">{lang === 'th' ? 'พร้อมสแกนต่อเนื่อง' : 'Ready to scan'}</p>
              <p className="text-[11px]">{lang === 'th' ? 'นำกล้องส่องที่บัตรนักเรียน หรือแตะปุ่ม "แตะจำลองสแกน" ด้านบน' : 'Point camera at student QR/barcode'}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {scannedSessionQueue.map((item, idx) => (
                <div
                  key={`${item.student.id}-${item.time}-${idx}`}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-2.5 text-xs shadow-2xs animate-in slide-in-from-top-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.student.avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-title)] truncate">
                        {item.student.firstNameTh} {item.student.lastNameTh}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        {item.student.studentIdNumber} • {item.student.room}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      {item.time}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {item.type === 'check_in' ? (lang === 'th' ? 'เข้าเรียน' : 'Checked In') : (lang === 'th' ? 'กลับบ้าน' : 'Checked Out')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>EduVerse Continuous Scanner Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] font-bold hover:bg-[var(--color-card-subtle)] cursor-pointer text-xs"
          >
            {lang === 'th' ? 'เสร็จสิ้น' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
