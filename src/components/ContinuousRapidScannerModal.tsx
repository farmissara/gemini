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
  Zap
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, AttendanceCheckType, AppLanguage, AuthUser } from '../types';
import { getLocalDateString } from '../lib/date';
import { sendEduVerseNotification } from '../lib/pushNotifications';

interface ContinuousRapidScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
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
  currentUser,
  onRecordAttendance,
  lang = 'th',
  mode: initialMode = 'check_in',
}) => {
  const [scanMode, setScanMode] = useState<AttendanceCheckType>(initialMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  // Web Audio Synthesizer for Rapid Beep
  const playBeep = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isSuccess) {
        // High cheerful ding (880Hz -> 1760Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else {
        // Warning buzz (320Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
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
      setIsCameraStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('CAMERA_UNAVAILABLE');
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active || cameraRequestRef.current !== requestId) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach(track => track.stop());
          throw new Error('CAMERA_VIEW_UNAVAILABLE');
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        if (!active || cameraRequestRef.current !== requestId) {
          stream.getTracks().forEach(track => track.stop());
          if (video.srcObject === stream) video.srcObject = null;
          return;
        }
        setIsCameraStarting(false);
      } catch (err) {
        if (!active || cameraRequestRef.current !== requestId) return;
        const errorName = err instanceof Error ? err.name : '';
        const errorMessage = err instanceof Error ? err.message : '';
        const message = errorMessage === 'CAMERA_UNAVAILABLE'
          ? 'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง'
          : errorMessage === 'CAMERA_VIEW_UNAVAILABLE'
          ? 'ไม่พบหน้าต่างแสดงภาพกล้อง กรุณาปิดแล้วเปิดสแกนเนอร์ใหม่'
          : errorName === 'NotAllowedError' || errorName === 'SecurityError'
          ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตสิทธิ์กล้องในเบราว์เซอร์'
          : errorName === 'NotFoundError' || errorName === 'OverconstrainedError'
          ? `ไม่พบ${facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'} กรุณาสลับกล้องหรือเชื่อมต่อกล้อง`
          : errorName === 'NotReadableError'
          ? 'กล้องกำลังถูกใช้งานโดยแอปหรือแท็บอื่น กรุณาปิดแอปที่ใช้กล้องแล้วลองอีกครั้ง'
          : 'เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และลองใหม่';
        setCameraError(message);
        setIsCameraStarting(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    }

    startCamera();

    return () => {
      active = false;
      cameraRequestRef.current++;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [isOpen, facingMode, cameraRetry]);

  if (!isOpen) return null;

  // Process a scanned student code or ID
  const processScannedCode = (rawCode: string) => {
    const cleaned = rawCode.trim().replace(/^EDUVERSE:STU:/i, '');
    const tokens = cleaned.split(':');
    const targetStudentIdNumber = tokens[0] || cleaned;

    const matched = students.find(
      s => s.studentIdNumber.toLowerCase() === targetStudentIdNumber.toLowerCase() ||
           s.id.toLowerCase() === targetStudentIdNumber.toLowerCase() ||
           (s.nationalId && s.nationalId === targetStudentIdNumber)
    );

    if (!matched) {
      setFlashWarning(lang === 'th' ? `ไม่พบรหัสนักเรียน: ${targetStudentIdNumber}` : `Student not found: ${targetStudentIdNumber}`);
      playBeep(false);
      triggerHaptic(false);
      setTimeout(() => setFlashWarning(null), 2500);
      return;
    }

    // Cooldown check: prevent duplicate re-scan within 6 seconds
    const nowMs = Date.now();
    const lastScanMs = lastScannedTimeMapRef.current.get(matched.id) || 0;
    if (nowMs - lastScanMs < 6000) {
      setFlashWarning(lang === 'th' ? `เพิ่งสแกนไปเมื่อสักครู่: ${matched.firstNameTh} (รอ 6 วินาที)` : `Recently scanned: ${matched.firstNameTh}`);
      playBeep(false);
      triggerHaptic(false);
      setTimeout(() => setFlashWarning(null), 2000);
      return;
    }

    // Record attendance
    lastScannedTimeMapRef.current.set(matched.id, nowMs);
    const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const status: AttendanceStatus = 'present';

    onRecordAttendance(
      matched.id,
      status,
      scanMode === 'check_in' ? 'สแกนบัตรต่อเนื่อง ประตูโรงเรียน (Rapid Scanner)' : 'สแกนบัตรเลิกเรียน (Rapid Checkout)',
      'qr_scanner',
      {
        recordType: scanMode,
        photoUrl: matched.avatarUrl,
        userName: `${matched.firstNameTh} ${matched.lastNameTh}`,
        userRole: `นักเรียน (${matched.gradeLevel})`,
        userDepartmentOrRoom: matched.room,
        recordedBy: currentUser?.fullNameTh,
        recordedByRole: currentUser?.role,
      }
    );

    // Send push notification to parents
    sendEduVerseNotification({
      title: scanMode === 'check_in' 
        ? `🔔 [เข้าโรงเรียน] ${matched.firstNameTh} ${matched.lastNameTh}` 
        : `🔔 [ออกจากโรงเรียน] ${matched.firstNameTh} ${matched.lastNameTh}`,
      body: `สแกนบัตรผ่านประตูแล้ว เวลา ${nowTimeStr} (${matched.room}) สถานะ: เข้าเรียนตรงเวลา`,
      category: 'attendance',
      priority: 'urgent',
    });

    // Visual & Audio Feedback
    setLastScannedStudent(matched);
    setFlashSuccess(true);
    setFlashWarning(null);
    playBeep(true);
    triggerHaptic(true);
    setTimeout(() => setFlashSuccess(false), 900);

    // Prepend to Session Queue
    setScannedSessionQueue(prev => [
      {
        student: matched,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-[var(--color-text-body)]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-card-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-1.5">
                <span>{lang === 'th' ? 'สแกนเนอร์บาร์โค้ด & QR ต่อเนื่อง' : 'Continuous Rapid Scanner'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  {scannedSessionQueue.length} {lang === 'th' ? 'คนแล้ว' : 'scanned'}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {lang === 'th' ? 'สแกนรัว 1-2 วินาที/คน พร้อมเสียงปี๊บและแจ้งเตือนผู้ปกครองทันที' : 'Fast 1-second continuous check-in with beep & alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
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
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              title="สลับกล้องหน้า/หลัง"
            >
              <SwitchCamera className="w-4 h-4" />
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

          {/* Quick random simulator button for test demo */}
          <button
            type="button"
            onClick={() => {
              if (students.length > 0) {
                const randomStudent = students[Math.floor(Math.random() * students.length)];
                processScannedCode(randomStudent.studentIdNumber);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-[11px] hover:bg-purple-100 transition cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{lang === 'th' ? 'แตะจำลองสแกน' : 'Simulate Scan'}</span>
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[220px] sm:min-h-[260px] max-h-[300px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {cameraError && (
            <div role="alert" className="absolute inset-x-4 bottom-4 z-20 rounded-xl bg-slate-900/95 p-3 text-center text-xs text-white shadow-xl">
              <p className="font-bold">{cameraError}</p>
              <button
                type="button"
                onClick={() => setCameraRetry(retry => retry + 1)}
                className="mt-2 rounded-lg bg-white px-3 py-1.5 font-bold text-slate-900 hover:bg-slate-100"
              >
                {lang === 'th' ? 'ลองเปิดกล้องอีกครั้ง' : 'Retry camera'}
              </button>
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
