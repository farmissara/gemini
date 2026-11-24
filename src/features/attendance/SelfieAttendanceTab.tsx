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
          className={`${embeddedMobile ? 'flex-1 min-h-0 w-full rounded-2xl border' : 'w-full max-w-sm rounded-[36px] p-3.5 border-4'} bg-slate-900 shadow-xl border-slate-800 relative flex flex-col overflow-hidden`}
        >
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
                <span>เข้าโรงเรียน</span>
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
                  {normalizedGates.map((gate) => (
                    <option key={gate.id} value={gate.id} className="bg-slate-800 text-white">
                      {gate.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-slate-800/90 text-slate-100 text-[11px] font-semibold rounded-lg px-2 py-1 border border-slate-700 truncate min-w-0 max-w-full">
                  {selectedGate ? selectedGate.nameTh : lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set'}
                </span>
              )}
            </div>
          </div>

          {/* Camera Viewfinder Box with Responsive Centered Face Outline Guide */}
          <div
            className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden ${embeddedMobile ? 'min-h-[170px]' : 'min-h-[320px]'}`}
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
                className="absolute top-2 right-2 z-30 px-2.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md text-white text-[11px] font-bold border border-sky-400/50 shadow-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 pointer-events-auto"
                title="รีเฟรชสัญญาณ GPS"
                aria-label="รีเฟรชสัญญาณ GPS"
              >
                <Navigation className={`w-3.5 h-3.5 text-sky-300 shrink-0 ${isGpsLoading ? 'animate-spin' : ''}`} />
                <span>พิกัด GPS</span>
              </button>
            )}

            {isFlashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />}

            {!capturedPhotoUrl && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-2">
                <div
                  className={`${embeddedMobile ? 'w-28 h-36' : 'w-48 h-60'} rounded-[50%] border-2 border-dashed border-cyan-400/80 shadow-md shadow-cyan-500/20 flex flex-col items-center justify-center relative animate-pulse`}
                >
                  <div className="absolute top-1.5 w-8 h-1 bg-cyan-400/70 rounded-full" />
                  <div className="text-center px-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-cyan-200 drop-shadow">
                      {facingMode === 'user' ? 'วางใบหน้าในกรอบ' : 'ถ่ายภาพเช็คชื่อ (กล้องหลัง)'}
                    </p>
                    <p className="text-[8px] text-cyan-200">
                      {facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'} (กดสลับกล้องด้านล่างได้)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Floating GPS & Time Badge */}
            <div className="absolute top-2 left-2 max-w-[calc(100%-125px)] flex flex-wrap items-center gap-1 pointer-events-none text-[10px]">
              <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white font-mono flex items-center gap-1 border border-white/20">
                <Clock className="w-3 h-3 text-cyan-300" />
                <span>{new Date().toLocaleTimeString('th-TH')}</span>
              </div>

              <div
                className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border backdrop-blur-md tabular-nums ${
                  !hasSchoolGpsConfigured || isGpsLoading || currentGpsDistance === null
                    ? 'bg-amber-950/80 text-amber-200 border-amber-500/40'
                    : isInGeofence
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>{gpsStatusShortLabel}</span>
              </div>
            </div>

            {cameraNotice && !cameraError && !capturedPhotoUrl && (
              <div className="absolute inset-x-3 bottom-2 z-20 px-2.5 py-1.5 rounded-xl bg-slate-900/85 border border-slate-600 text-slate-100 text-[10px] text-center backdrop-blur-md">
                {cameraNotice}
              </div>
            )}

            {cameraError && !capturedPhotoUrl && (
              <div className="absolute inset-x-3 bottom-3 z-30 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-200 text-xs backdrop-blur-md text-center space-y-1.5">
                <p className="text-[11px]">{cameraError}</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] cursor-pointer border border-slate-600"
                  >
                    ลองเปิดกล้องอีกครั้ง
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer shadow-xs"
                  >
                    ถ่ายภาพจำลอง
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Camera Controls & Shutter */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 shrink-0">
            {capturedPhotoUrl ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      if (!isCameraActive) {
                        void startCamera(facingModeRef.current);
                      }
                    }}
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
                    <span>
                      {isSavingAttendance
                        ? 'กำลังบันทึก...'
                        : `ยืนยัน ${checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'}`}
                    </span>
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
              <div className="space-y-1.5 py-0.5">
                <div className="flex items-center justify-between px-2 gap-3">
                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="px-2.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-50"
                    title="เปิด / รีเฟรชกล้อง (Refresh Camera)"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 shrink-0 ${isCameraSwitching ? 'animate-spin' : ''}`} />
                    <span>รีเฟรชกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={isCapturing || isCameraSwitching}
                    className="w-12 h-12 rounded-full bg-white p-0.5 shadow-lg shadow-white/20 hover:scale-105 active:scale-95 transition flex items-center justify-center focus:outline-hidden cursor-pointer disabled:opacity-60 shrink-0"
                    title="ถ่ายรูปเช็คชื่อ"
                    aria-label="ถ่ายรูปเช็คชื่อ"
                  >
                    <div className="w-full h-full rounded-full border-2 border-slate-900 bg-red-600 hover:bg-red-500 flex items-center justify-center transition">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={handleToggleFacingMode}
                    className="px-2.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-amber-400/50 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-60"
                    title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง (Switch to Back Camera)' : 'สลับเป็นกล้องหน้า (Switch to Front Camera)'}
                    aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${isCameraSwitching ? 'animate-pulse' : ''}`} />
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
                      className="max-w-[240px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-200 font-medium truncate"
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
