import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  Settings,
  SwitchCamera,
  User,
  Users,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceCheckType,
  AttendanceUserType,
  AuthUser,
  CampusGateGeofence,
  Student,
  Teacher,
} from '../../types';
import type { CameraFacingMode } from '../../lib/cameraStream';
import { PagedList } from '../../components/PagedList';

interface SelfieAttendanceTabProps {
  embeddedMobile: boolean;
  lang: AppLanguage;
  checkType: AttendanceCheckType;
  setCheckType: (type: AttendanceCheckType) => void;
  normalizedGates: CampusGateGeofence[];
  selectedGate: CampusGateGeofence | null;
  setSelectedGateId: (id: string) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: CameraFacingMode;
  facingModeRef: React.MutableRefObject<CameraFacingMode>;
  capturedPhotoUrl: string | null;
  setCapturedPhotoUrl: (url: string | null) => void;
  handleRefreshGps: () => void;
  isGpsLoading: boolean;
  isFlashActive: boolean;
  hasSchoolGpsConfigured: boolean;
  currentGpsDistance: number | null;
  isInGeofence: boolean;
  gpsStatusShortLabel: string;
  cameraNotice: string | null;
  cameraError: string | null;
  startCamera: (targetFacingMode?: CameraFacingMode, preferredDeviceId?: string | null) => Promise<void>;
  handleCaptureSnapshot: () => void;
  isCameraActive: boolean;
  isSavingAttendance: boolean;
  handleConfirmCheckin: () => Promise<void>;
  gpsError: string | null;
  selfieActionError: string | null;
  isCameraSwitching: boolean;
  isCapturing: boolean;
  handleToggleFacingMode: () => void;
  availableCameras: MediaDeviceInfo[];
  activeCameraId: string | null;
  isSelfCheckin: boolean;
  activePersonName: string;
  activePersonRole: string;
  activePersonId: string | undefined;
  activePersonDefaultAvatar: string | undefined;
  activeDepartmentOrRoom: string | undefined;
  isRestrictedViewer: boolean;
  currentUser: AuthUser | null;
  loggedInUserName: string;
  setAttendanceMode: (mode: 'self' | 'proxy') => void;
  effectiveUserType: AttendanceUserType;
  setActiveUserType: (type: AttendanceUserType) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (id: string) => void;
  scopedStudents: Student[];
  teachers: Teacher[];
  isSchoolAdmin: boolean;
  setShowGpsAdminModal: (show: boolean) => void;
}

export const SelfieAttendanceTab: React.FC<SelfieAttendanceTabProps> = ({
  embeddedMobile,
  lang,
  checkType,
  setCheckType,
  normalizedGates,
  selectedGate,
  setSelectedGateId,
  videoRef,
  facingMode,
  facingModeRef,
  capturedPhotoUrl,
  setCapturedPhotoUrl,
  handleRefreshGps,
  isGpsLoading,
  isFlashActive,
  hasSchoolGpsConfigured,
  currentGpsDistance,
  isInGeofence,
  gpsStatusShortLabel,
  cameraNotice,
  cameraError,
  startCamera,
  handleCaptureSnapshot,
  isCameraActive,
  isSavingAttendance,
  handleConfirmCheckin,
  gpsError,
  selfieActionError,
  isCameraSwitching,
  isCapturing,
  handleToggleFacingMode,
  availableCameras,
  activeCameraId,
  isSelfCheckin,
  activePersonName,
  activePersonRole,
  activePersonId,
  activePersonDefaultAvatar,
  activeDepartmentOrRoom,
  isRestrictedViewer,
  currentUser,
  loggedInUserName,
  setAttendanceMode,
  effectiveUserType,
  setActiveUserType,
  selectedStudentId,
  setSelectedStudentId,
  selectedTeacherId,
  setSelectedTeacherId,
  scopedStudents,
  teachers,
  isSchoolAdmin,
  setShowGpsAdminModal,
}) => {
  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col gap-1.5' : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch'}`}
    >
      {/* CAMERA STUDIO COLUMN */}
      <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'lg:col-span-7 flex flex-col'}`}>
        <div
          className={`${embeddedMobile ? 'flex-1 min-h-0 rounded-2xl' : 'flex-1 rounded-xl'} w-full border border-[var(--color-border)] bg-[var(--color-card)] relative flex flex-col overflow-hidden`}
        >
          {/* Studio Header: Check-in / Check-out Segmented Control + Gate Selector */}
          <div className="px-3.5 py-2.5 bg-[var(--color-card)] border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0">
              <button
                type="button"
                onClick={() => setCheckType('check_in')}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs transition cursor-pointer ${
                  checkType === 'check_in'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                }`}
              >
                <LogIn className={`w-3.5 h-3.5 shrink-0 ${checkType === 'check_in' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>เข้าโรงเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckType('check_out')}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs transition cursor-pointer ${
                  checkType === 'check_out'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                }`}
              >
                <LogOut className={`w-3.5 h-3.5 shrink-0 ${checkType === 'check_out' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span>ออกโรงเรียน</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
              {normalizedGates.length > 1 && selectedGate ? (
                <select
                  aria-label={lang === 'th' ? 'จุดประตูเช็คชื่อ' : 'Check-in gate'}
                  value={selectedGate.id}
                  onChange={(e) => setSelectedGateId(e.target.value)}
                  className="h-8 bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-medium rounded-lg px-2.5 border border-[var(--color-border)] truncate min-w-0 max-w-[240px] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]/30 transition cursor-pointer"
                >
                  {normalizedGates.map((gate) => (
                    <option key={gate.id} value={gate.id}>
                      {gate.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex h-8 items-center bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-medium rounded-lg px-2.5 border border-[var(--color-border)] truncate min-w-0 max-w-[240px]">
                  {selectedGate ? selectedGate.nameTh : lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set'}
                </span>
              )}
            </div>
          </div>

          {/* Camera Viewfinder */}
          <div
            className={`relative flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center overflow-hidden ${embeddedMobile ? 'min-h-[195px]' : 'min-h-[380px]'}`}
          >
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

            {/* Top Viewfinder HUD Bar */}
            {!capturedPhotoUrl && (
              <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium tabular-nums">
                  <span className="inline-flex items-center gap-1 font-mono text-slate-200">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date().toLocaleTimeString('th-TH')}
                  </span>
                  <span className="text-white/25" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    {isGpsLoading ? (
                      <RefreshCw className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
                    ) : !hasSchoolGpsConfigured || currentGpsDistance === null ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : isInGeofence ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                    <span>{gpsStatusShortLabel}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/55 hover:bg-black/75 backdrop-blur-md text-slate-100 text-[11px] font-medium border border-white/15 transition active:scale-95 cursor-pointer"
                  title="รีเฟรชสัญญาณ GPS"
                  aria-label="รีเฟรชสัญญาณ GPS"
                >
                  <Navigation className={`w-3 h-3 text-sky-400 shrink-0 ${isGpsLoading ? 'animate-spin' : ''}`} />
                  <span>พิกัด GPS</span>
                </button>
              </div>
            )}

            {isFlashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />}

            {/* Minimalist Face Alignment Frame — hidden when cameraError card is visible to prevent overlap */}
            {!capturedPhotoUrl && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div
                  className={`${embeddedMobile ? 'w-32 h-40' : 'w-52 h-64'} relative flex flex-col items-center justify-end pb-3 rounded-3xl`}
                >
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/65 rounded-tl-2xl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/65 rounded-tr-2xl" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/65 rounded-bl-2xl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/65 rounded-br-2xl" />

                  <p className="text-[11px] font-medium text-white/85 px-2.5 py-1 rounded-md bg-black/45 backdrop-blur-xs">
                    {facingMode === 'user' ? 'วางใบหน้าในกรอบ · กล้องหน้า' : 'จัดภาพในกรอบ · กล้องหลัง'}
                  </p>
                </div>
              </div>
            )}

            {cameraNotice && !cameraError && !capturedPhotoUrl && (
              <div className="absolute inset-x-4 bottom-3 z-20 px-3 py-1.5 rounded-lg bg-black/70 border border-white/15 text-slate-200 text-[11px] text-center backdrop-blur-md">
                {cameraNotice}
              </div>
            )}

            {/* Clean Centered Studio Error / Fallback Panel (Zero Reticle Collision) */}
            {cameraError && !capturedPhotoUrl && (
              <div className="relative z-30 mx-4 max-w-sm w-full p-5 rounded-xl bg-slate-900/90 border border-white/10 text-slate-100 backdrop-blur-xl shadow-2xl text-center space-y-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-slate-200 flex items-center justify-center mx-auto">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white">ยังไม่สามารถเข้าถึงกล้องได้</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs cursor-pointer border border-white/15 transition"
                  >
                    ลองเปิดกล้องอีกครั้ง
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs cursor-pointer shadow-xs transition"
                  >
                    ถ่ายภาพจำลอง
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Studio Bottom Action Deck */}
          <div className="px-4 py-3 bg-[var(--color-card)] border-t border-[var(--color-border)] shrink-0">
            {capturedPhotoUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      if (!isCameraActive) {
                        void startCamera(facingModeRef.current);
                      }
                    }}
                    className="h-10 px-4 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] font-medium text-xs flex items-center justify-center gap-1.5 border border-[var(--color-border)] transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isInGeofence || isSavingAttendance}
                    onClick={handleConfirmCheckin}
                    className={`flex-1 h-10 px-4 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer ${
                      isInGeofence
                        ? checkType === 'check_in'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSavingAttendance
                        ? 'กำลังบันทึก...'
                        : `ยืนยัน${checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'}`}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-center text-[var(--color-text-muted)] flex items-center justify-center gap-1.5">
                  {!hasSchoolGpsConfigured ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ</span>
                    </>
                  ) : isGpsLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin shrink-0" />
                      <span>กำลังอ่านพิกัด GPS ปัจจุบัน...</span>
                    </>
                  ) : currentGpsDistance === null ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{gpsError || 'กรุณาอนุญาต GPS แล้วกดอัปเดตพิกัด'}</span>
                    </>
                  ) : isInGeofence ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>พร้อมส่งหลักฐานและแจ้งเตือนผู้ปกครอง</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>อยู่นอกพื้นที่โรงเรียน ({currentGpsDistance.toLocaleString()} ม.)</span>
                    </>
                  )}
                </p>
                {selfieActionError && (
                  <p className="text-[11px] text-center text-rose-600 dark:text-rose-400 font-medium">{selfieActionError}</p>
                )}
              </div>
            ) : embeddedMobile ? (
              /* Thumb-Zone Tactile Camera Bar (Mobile Only) */
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="min-h-[44px] px-3 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                    title="เปิด / รีเฟรชกล้อง (Refresh Camera)"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-spin' : ''}`} />
                    <span>รีเฟรชกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={isCapturing || isCameraSwitching}
                    className="w-13 h-13 rounded-full border-2 border-slate-900 dark:border-white p-1 hover:scale-105 active:scale-95 transition flex items-center justify-center focus:outline-hidden cursor-pointer disabled:opacity-60 shrink-0"
                    title="ถ่ายรูปเช็คชื่อ"
                    aria-label="ถ่ายรูปเช็คชื่อ"
                  >
                    <div className="w-full h-full rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center transition">
                      <Camera className="w-5 h-5" />
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={handleToggleFacingMode}
                    className="min-h-[44px] px-3 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                    title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง (Switch to Back Camera)' : 'สลับเป็นกล้องหน้า (Switch to Front Camera)'}
                    aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-pulse' : ''}`} />
                    <span>{isCameraSwitching ? 'กำลังสลับ...' : 'สลับกล้อง'}</span>
                  </button>
                </div>
                {availableCameras.length > 2 && (
                  <div className="flex items-center justify-center">
                    <select
                      aria-label="เลือกเลนส์กล้อง"
                      value={activeCameraId || ''}
                      disabled={isCameraSwitching}
                      onChange={(e) => {
                        const pickedId = e.target.value;
                        if (pickedId) {
                          void startCamera(facingModeRef.current, pickedId);
                        }
                      }}
                      className="max-w-[240px] h-8 px-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] font-medium truncate"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `กล้องที่ ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              /* Clean Modern Studio Action Bar (Desktop) */
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="h-9 px-3 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                    title="เปิด / รีเฟรชกล้อง (Refresh Camera)"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-spin' : ''}`} />
                    <span>รีเฟรชกล้อง</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={handleToggleFacingMode}
                    className="h-9 px-3 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                    title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง (Switch to Back Camera)' : 'สลับเป็นกล้องหน้า (Switch to Front Camera)'}
                    aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-pulse' : ''}`} />
                    <span>{isCameraSwitching ? 'กำลังสลับ...' : 'สลับกล้อง'}</span>
                  </button>

                  {availableCameras.length > 2 && (
                    <select
                      aria-label="เลือกเลนส์กล้อง"
                      value={activeCameraId || ''}
                      disabled={isCameraSwitching}
                      onChange={(e) => {
                        const pickedId = e.target.value;
                        if (pickedId) {
                          void startCamera(facingModeRef.current, pickedId);
                        }
                      }}
                      className="max-w-[180px] h-9 px-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] font-medium truncate"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `กล้องที่ ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={isCapturing || isCameraSwitching}
                  className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-60 shrink-0"
                  title="ถ่ายรูปเช็คชื่อ"
                  aria-label="ถ่ายรูปเช็คชื่อ"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isCapturing ? 'กำลังบันทึก...' : 'ถ่ายรูปเช็คชื่อ'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Desktop Only — on mobile, Identity & Geofence live inside Bottom Sheets) */}
      {!embeddedMobile && (
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* User Profile Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
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

            <div className="p-4 space-y-3.5">
              {!isSelfCheckin && (
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
                        className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] type-body text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
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
                        className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] type-body text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
                      >
                        {teachers.map((tc) => (
                          <option key={tc.id} value={tc.id}>
                            {tc.fullNameTh} ({tc.teacherIdNumber}) - {tc.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <img
                  src={activePersonDefaultAvatar}
                  alt={activePersonName}
                  className="w-11 h-11 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="type-card-title truncate">{activePersonName}</p>
                  <p className="type-meta truncate">
                    {activePersonRole}
                    {isSelfCheckin ? ' · บัญชีของคุณ' : ` · บันทึกโดย ${currentUser?.fullNameTh || 'ผู้ดูแลระบบ'}`}
                  </p>
                  <p className="type-meta font-mono truncate">
                    {activePersonId}
                    {activeDepartmentOrRoom ? ` · ${activeDepartmentOrRoom}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Gate Geofence Radar */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <h3 className="type-section-title truncate">จุดเช็คชื่อ GPS ({normalizedGates.length})</h3>
              </div>
              <div className="inline-flex items-center gap-1 shrink-0">
                {isSchoolAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowGpsAdminModal(true)}
                    className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] flex items-center justify-center transition cursor-pointer"
                    title="ตั้งค่าและแก้ไขพิกัดจุดเช็คชื่อโรงเรียน (Admin)"
                    aria-label="แก้ไขพิกัดจุดเช็คชื่อโรงเรียน"
                  >
                    <Settings className="w-3.5 h-3.5 text-[var(--color-text-title)]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] flex items-center justify-center transition cursor-pointer"
                  title="ตรวจพิกัด GPS ปัจจุบัน"
                  aria-label="ตรวจพิกัด GPS ปัจจุบัน"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-title)] ${isGpsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3.5 flex-1">
              {!selectedGate ? (
                <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
                      className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold text-xs cursor-pointer transition"
                    >
                      ตั้งค่าพิกัด GPS โรงเรียน
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Clean Status Summary */}
                  <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-start gap-2.5">
                    {isGpsLoading ? (
                      <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400 animate-spin shrink-0 mt-0.5" />
                    ) : currentGpsDistance === null ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : isInGeofence ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <p className="type-card-title truncate">
                        {isGpsLoading
                          ? `กำลังอ่านพิกัด GPS · ${selectedGate.nameTh}`
                          : currentGpsDistance === null
                            ? `รอพิกัด GPS · ${selectedGate.nameTh}`
                            : isInGeofence
                              ? `ในเขต · ${selectedGate.nameTh}`
                              : `นอกเขต · ${selectedGate.nameTh}`}
                      </p>
                      <p className="type-meta leading-relaxed">
                        {currentGpsDistance !== null ? (
                          <>
                            ระยะห่างจริง{' '}
                            <strong className="font-mono text-[var(--color-text-title)] tabular-nums">
                              {currentGpsDistance.toLocaleString()} ม.
                            </strong>{' '}
                            · รัศมี {selectedGate.radiusMeters} ม.
                          </>
                        ) : (
                          gpsError || `รัศมีเช็คชื่อ ${selectedGate.radiusMeters} ม. · กดรีเฟรชเพื่ออ่านพิกัด GPS จริง`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Multi-gate Selector List */}
                  {(normalizedGates.length > 1 || isSchoolAdmin) && (
                    <div className="space-y-1.5">
                      <label className="type-label block">
                        {isSchoolAdmin ? 'จุดเช็คชื่อที่กำหนดไว้' : 'เลือกประตูที่ใช้งาน'}
                      </label>
                      <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <PagedList
                          items={normalizedGates}
                          pageSize={3}
                          renderItem={(gate) => {
                            const isSelected = gate.id === selectedGate.id;
                            return (
                              <button
                                key={gate.id}
                                type="button"
                                onClick={() => setSelectedGateId(gate.id)}
                                className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-[var(--color-primary)]/[0.06] text-[var(--color-text-title)]'
                                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <MapPin
                                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`}
                                  />
                                  <div className="min-w-0">
                                    <p className="type-card-title truncate">{gate.nameTh}</p>
                                    <p className="type-meta font-mono truncate">
                                      รัศมี {gate.radiusMeters} ม.
                                      {isSchoolAdmin ? ` · ${Number(gate.lat).toFixed(5)}, ${Number(gate.lng).toFixed(5)}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />}
                              </button>
                            );
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
