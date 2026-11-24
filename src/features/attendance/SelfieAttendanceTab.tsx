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
  Smartphone,
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
      className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col gap-1.5' : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'}`}
    >
      {/* CAMERA COLUMN: Always primary on mobile (1-Screen = 1-Task) */}
      <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'lg:col-span-7 flex flex-col items-center'}`}>
        <div
          className={`${embeddedMobile ? 'flex-1 min-h-0 w-full rounded-2xl' : 'w-full max-w-[420px] rounded-2xl shadow-xl shadow-slate-950/15 dark:shadow-black/40'} border border-[var(--color-border)] bg-slate-950 relative flex flex-col overflow-hidden`}
        >
          {/* Event Selector: Check-in vs Check-out + Gate Selector */}
          <div className="px-3 py-2.5 bg-slate-900/95 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.06] border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setCheckType('check_in')}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                  checkType === 'check_in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>เข้าโรงเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckType('check_out')}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                  checkType === 'check_out'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>ออกโรงเรียน</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              {normalizedGates.length > 1 && selectedGate ? (
                <select
                  aria-label={lang === 'th' ? 'จุดประตูเช็คชื่อ' : 'Check-in gate'}
                  value={selectedGate.id}
                  onChange={(e) => setSelectedGateId(e.target.value)}
                  className="bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-medium rounded-xl px-2.5 py-1.5 border border-white/15 truncate min-w-0 max-w-full focus:outline-hidden focus:border-sky-400/60 transition cursor-pointer"
                >
                  {normalizedGates.map((gate) => (
                    <option key={gate.id} value={gate.id} className="bg-slate-900 text-white">
                      {gate.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-white/[0.08] text-slate-100 text-xs font-medium rounded-xl px-2.5 py-1.5 border border-white/15 truncate min-w-0 max-w-full">
                  {selectedGate ? selectedGate.nameTh : lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set'}
                </span>
              )}
            </div>
          </div>

          {/* Camera Viewfinder Box with Modern Biometric Corner-Bracket Guide */}
          <div
            className={`relative flex-1 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.55)_0%,rgba(2,6,23,1)_75%)] flex items-center justify-center overflow-hidden ${embeddedMobile ? 'min-h-[185px]' : 'min-h-[340px]'}`}
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

            {/* GPS Refresh Button */}
            {!capturedPhotoUrl && (
              <button
                type="button"
                onClick={handleRefreshGps}
                className="absolute top-2.5 right-2.5 z-30 px-2.5 py-1 rounded-lg bg-black/45 hover:bg-black/65 backdrop-blur-md text-slate-100 text-[11px] font-medium border border-white/15 shadow-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95 pointer-events-auto"
                title="รีเฟรชสัญญาณ GPS"
                aria-label="รีเฟรชสัญญาณ GPS"
              >
                <Navigation className={`w-3 h-3 text-sky-400 shrink-0 ${isGpsLoading ? 'animate-spin' : ''}`} />
                <span>พิกัด GPS</span>
              </button>
            )}

            {isFlashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />}

            {!capturedPhotoUrl && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div
                  className={`${embeddedMobile ? 'w-32 h-40' : 'w-48 h-60'} relative flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02]`}
                >
                  {/* Minimalist Biometric Corner Brackets */}
                  <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/75 rounded-tl-2xl" />
                  <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/75 rounded-tr-2xl" />
                  <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/75 rounded-bl-2xl" />
                  <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/75 rounded-br-2xl" />

                  <div className="text-center px-3 space-y-1">
                    <p className="text-xs font-medium text-white/90 tracking-tight drop-shadow">
                      {facingMode === 'user' ? 'วางใบหน้าในกรอบ' : 'ถ่ายภาพเช็คชื่อ (กล้องหลัง)'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'} · สลับกล้องได้ด้านล่าง
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Floating GPS & Time HUD */}
            <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-125px)] flex flex-wrap items-center gap-1.5 pointer-events-none text-[11px]">
              <div className="px-2 py-1 rounded-lg bg-black/45 backdrop-blur-md text-slate-100 font-mono flex items-center gap-1.5 border border-white/15 tabular-nums">
                <Clock className="w-3 h-3 text-slate-300" />
                <span>{new Date().toLocaleTimeString('th-TH')}</span>
              </div>

              <div className="px-2 py-1 rounded-lg bg-black/45 backdrop-blur-md text-slate-100 font-medium flex items-center gap-1.5 border border-white/15 tabular-nums">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    !hasSchoolGpsConfigured || isGpsLoading || currentGpsDistance === null
                      ? 'bg-amber-400'
                      : isInGeofence
                        ? 'bg-emerald-400'
                        : 'bg-rose-400'
                  }`}
                />
                <span>{gpsStatusShortLabel}</span>
              </div>
            </div>

            {cameraNotice && !cameraError && !capturedPhotoUrl && (
              <div className="absolute inset-x-3 bottom-2.5 z-20 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-white/15 text-slate-200 text-[11px] text-center backdrop-blur-md">
                {cameraNotice}
              </div>
            )}

            {cameraError && !capturedPhotoUrl && (
              <div className="absolute inset-x-3 bottom-3 z-30 p-3.5 rounded-2xl bg-slate-900/85 border border-white/15 text-slate-100 backdrop-blur-xl shadow-2xl text-center space-y-2.5">
                <div className="flex items-start justify-center gap-2 text-left">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs cursor-pointer border border-white/15 transition"
                  >
                    ลองเปิดกล้องอีกครั้ง
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs cursor-pointer shadow-xs transition"
                  >
                    ถ่ายภาพจำลอง
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Camera Controls & Shutter */}
          <div className="px-4 py-3.5 bg-slate-950 border-t border-white/10 shrink-0">
            {capturedPhotoUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      if (!isCameraActive) {
                        void startCamera(facingModeRef.current);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/15 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isInGeofence || isSavingAttendance}
                    onClick={handleConfirmCheckin}
                    className={`flex-[2] py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${
                      isInGeofence
                        ? checkType === 'check_in'
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
                        : 'bg-slate-700 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSavingAttendance
                        ? 'กำลังบันทึก...'
                        : `ยืนยัน ${checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'}`}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-center text-slate-300 flex items-center justify-center gap-1.5">
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
                  <p className="text-[11px] text-center text-rose-300 font-medium">{selfieActionError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="h-10 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-slate-200 border border-white/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                    title="เปิด / รีเฟรชกล้อง (Refresh Camera)"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-300 shrink-0 ${isCameraSwitching ? 'animate-spin' : ''}`} />
                    <span>รีเฟรชกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={isCapturing || isCameraSwitching}
                    className="w-14 h-14 rounded-full border-[2.5px] border-white/90 p-1 shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition flex items-center justify-center focus:outline-hidden cursor-pointer disabled:opacity-60 shrink-0"
                    title="ถ่ายรูปเช็คชื่อ"
                    aria-label="ถ่ายรูปเช็คชื่อ"
                  >
                    <div className="w-full h-full rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition text-slate-950">
                      <Camera className="w-5 h-5" />
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={handleToggleFacingMode}
                    className="h-10 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-slate-200 border border-white/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                    title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง (Switch to Back Camera)' : 'สลับเป็นกล้องหน้า (Switch to Front Camera)'}
                    aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 text-slate-300 shrink-0 ${isCameraSwitching ? 'animate-pulse' : ''}`} />
                    <span>{isCameraSwitching ? 'กำลังสลับ...' : 'สลับกล้อง'}</span>
                  </button>
                </div>
                {availableCameras.length > 2 && (
                  <div className="flex items-center justify-center gap-1.5">
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
                      className="max-w-[240px] px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] text-slate-200 font-medium truncate"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId} className="bg-slate-900 text-white">
                          {cam.label || `กล้องที่ ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`px-3 py-2 bg-slate-900/75 border-t border-white/5 text-center ${embeddedMobile ? 'hidden' : ''}`}>
            <p className="text-[11px] text-slate-400 truncate">
              {isSelfCheckin ? 'บัญชีของคุณ · ' : 'สแกนแทน · '}
              <span className="text-slate-100 font-semibold">{activePersonName}</span> ({activePersonRole})
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Desktop Only — on mobile, Identity & Geofence live inside Bottom Sheets) */}
      {!embeddedMobile && (
        <div className="lg:col-span-5 space-y-4">
          {/* User Profile Card */}
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
                    <strong className="text-[var(--color-text-title)]">
                      {currentUser?.fullNameTh || loggedInUserName}
                    </strong>
                    {' · '}
                    {currentUser?.role === 'super_admin'
                      ? 'Super Admin'
                      : currentUser?.role === 'admin'
                        ? 'Admin'
                        : currentUser?.role === 'teacher'
                          ? 'ครูผู้สอน'
                          : 'นักเรียน'}
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
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      isGpsLoading || currentGpsDistance === null
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                        : isInGeofence
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                    }`}
                  >
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
                            ระยะห่างจริง{' '}
                            <strong className="font-mono text-[var(--color-text-title)] tabular-nums">
                              {currentGpsDistance.toLocaleString()} ม.
                            </strong>{' '}
                            (รัศมี {selectedGate.radiusMeters} ม. · กำหนดโดยโรงเรียน)
                          </>
                        ) : (
                          gpsError || `รัศมีเช็คชื่อ ${selectedGate.radiusMeters} ม. · กรุณากดปุ่มรีเฟรชเพื่ออ่านพิกัด GPS จริง`
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
                      <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden">
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
                                    ? 'bg-[var(--color-primary-light)] text-[var(--color-text-title)]'
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
