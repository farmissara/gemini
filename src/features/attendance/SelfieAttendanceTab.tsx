import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  Frame,
  Glasses,
  Heart,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  Settings,
  Shuffle,
  Sliders,
  Sparkles,
  Sticker,
  SwitchCamera,
  Timer,
  Trash2,
  User,
  Users,
  X,
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
import {
  getFilterOption,
  getStickerOption,
  SELFIE_FILTERS,
  SELFIE_FRAMES,
  SELFIE_STICKERS,
  type PlacedSticker,
  type SelfieFilterId,
  type SelfieFrameId,
  type SelfieStickerId,
} from '../../lib/selfieStickerStudio';
import { ChacoAvatar, MeeAvatar } from '../../components/guide/MascotNavigator';
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
  selfieFilterId: SelfieFilterId;
  setSelfieFilterId: (id: SelfieFilterId) => void;
  selfieFrameId: SelfieFrameId;
  setSelfieFrameId: (id: SelfieFrameId) => void;
  placedStickers: PlacedSticker[];
  setPlacedStickers: React.Dispatch<React.SetStateAction<PlacedSticker[]>>;
  selfieTimerSeconds: 0 | 3;
  setSelfieTimerSeconds: (secs: 0 | 3) => void;
  selfieCountdown: number | null;
}

const StickerArtwork: React.FC<{ stickerId: SelfieStickerId; compact?: boolean }> = ({
  stickerId,
  compact = false,
}) => {
  const opt = getStickerOption(stickerId);

  if (stickerId === 'chaco_cheer') {
    return (
      <div className="inline-flex flex-col items-center drop-shadow-md select-none">
        <div className={`${compact ? 'p-0.5' : 'p-1'} rounded-full bg-white shadow-md`}>
          <ChacoAvatar size={compact ? 28 : 46} />
        </div>
        {!compact && (
          <span className="-mt-1.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold border-2 border-white shadow-sm whitespace-nowrap">
            ชาโคเชียร์!
          </span>
        )}
      </div>
    );
  }

  if (stickerId === 'mee_hi') {
    return (
      <div className="inline-flex flex-col items-center drop-shadow-md select-none">
        <div className={`${compact ? 'p-0.5' : 'p-1'} rounded-full bg-white shadow-md`}>
          <MeeAvatar size={compact ? 28 : 46} />
        </div>
        {!compact && (
          <span className="-mt-1.5 px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[10px] font-extrabold border-2 border-white shadow-sm whitespace-nowrap">
            หมีสี่ตา
          </span>
        )}
      </div>
    );
  }

  if (stickerId === 'star_crown') {
    return (
      <div className="inline-flex items-center justify-center drop-shadow-md select-none">
        <div className={`${compact ? 'w-7 h-7' : 'w-12 h-12'} rounded-full bg-amber-300/95 border-2 border-white flex items-center justify-center shadow-md`}>
          <Crown className={`${compact ? 'w-4 h-4' : 'w-7 h-7'} text-amber-900 fill-amber-500`} />
        </div>
      </div>
    );
  }

  if (stickerId === 'cool_shades') {
    return (
      <div className="inline-flex items-center justify-center drop-shadow-md select-none">
        <div className={`${compact ? 'px-1.5 py-1' : 'px-3 py-1.5'} rounded-full bg-slate-950 border-2 border-white flex items-center justify-center shadow-md`}>
          <Glasses className={`${compact ? 'w-4 h-4' : 'w-8 h-8'} text-sky-400`} />
        </div>
      </div>
    );
  }

  if (stickerId === 'sparkle_heart') {
    return (
      <div className="inline-flex items-center justify-center drop-shadow-md select-none">
        <div className={`${compact ? 'w-7 h-7' : 'w-11 h-11'} rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-md`}>
          <Heart className={`${compact ? 'w-3.5 h-3.5' : 'w-6 h-6'} text-white fill-white`} />
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-white font-extrabold shadow-md whitespace-nowrap select-none ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
      style={{ backgroundColor: opt.bgColor, color: opt.textColor }}
    >
      <Sparkles className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{opt.labelTh}</span>
    </span>
  );
};

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
  selfieFilterId,
  setSelfieFilterId,
  selfieFrameId,
  setSelfieFrameId,
  placedStickers,
  setPlacedStickers,
  selfieTimerSeconds,
  setSelfieTimerSeconds,
  selfieCountdown,
}) => {
  const [boothTab, setBoothTab] = useState<'stickers' | 'frames' | 'filters'>('stickers');
  const [selectedStickerUid, setSelectedStickerUid] = useState<string | null>(
    placedStickers[0]?.uid ?? null
  );

  const activeFilter = getFilterOption(selfieFilterId);
  const checkTypeLabel = checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน';
  const liveTimeText = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const handleToggleSticker = (stickerId: SelfieStickerId) => {
    const existing = placedStickers.find((s) => s.stickerId === stickerId);
    if (existing) {
      setPlacedStickers((prev) => prev.filter((s) => s.uid !== existing.uid));
      if (selectedStickerUid === existing.uid) {
        setSelectedStickerUid(null);
      }
      return;
    }
    const opt = getStickerOption(stickerId);
    const uid = `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextSticker: PlacedSticker = {
      uid,
      stickerId,
      xPct: opt.defaultPos.xPct,
      yPct: opt.defaultPos.yPct,
      rotation: opt.defaultPos.rotation,
    };
    setPlacedStickers((prev) => [...prev.slice(-4), nextSticker]);
    setSelectedStickerUid(uid);
  };

  const handleViewfinderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (capturedPhotoUrl || !selectedStickerUid) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = Math.max(12, Math.min(88, ((event.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(15, Math.min(82, ((event.clientY - rect.top) / rect.height) * 100));
    setPlacedStickers((prev) =>
      prev.map((s) => (s.uid === selectedStickerUid ? { ...s, xPct, yPct } : s))
    );
  };

  const handleShuffleBooth = () => {
    const framePool: SelfieFrameId[] = ['mascot_duo', 'pastel_cute', 'polaroid'];
    const nextFrame = framePool[Math.floor(Math.random() * framePool.length)];
    const filterPool: SelfieFilterId[] = ['glow', 'warm_film', 'cool_mint', 'normal'];
    const nextFilter = filterPool[Math.floor(Math.random() * filterPool.length)];
    const shuffledStickers = [...SELFIE_STICKERS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((opt, idx) => ({
        uid: `stk-${Date.now()}-${idx}`,
        stickerId: opt.id,
        xPct: idx === 0 ? 22 : 78,
        yPct: idx === 0 ? 28 : 68,
        rotation: idx === 0 ? -8 : 8,
      }));
    setSelfieFrameId(nextFrame);
    setSelfieFilterId(nextFilter);
    setPlacedStickers(shuffledStickers);
    setSelectedStickerUid(shuffledStickers[0]?.uid ?? null);
  };

  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col gap-1.5' : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch'}`}
    >
      {/* CAMERA PHOTO-BOOTH STUDIO COLUMN */}
      <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'lg:col-span-7 flex flex-col'}`}>
        <div
          className={`${embeddedMobile ? 'flex-1 min-h-0 rounded-2xl' : 'flex-1 rounded-xl'} w-full border border-[var(--color-border)] bg-[var(--color-card)] relative flex flex-col overflow-hidden`}
        >
          {/* Studio Top Control Bar: Check-in/Out + Gate */}
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
                  className="h-8 bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-medium rounded-lg px-2.5 border border-[var(--color-border)] truncate min-w-0 max-w-[230px] focus:outline-hidden transition cursor-pointer"
                >
                  {normalizedGates.map((gate) => (
                    <option key={gate.id} value={gate.id}>
                      {gate.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex h-8 items-center bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-medium rounded-lg px-2.5 border border-[var(--color-border)] truncate min-w-0 max-w-[230px]">
                  {selectedGate ? selectedGate.nameTh : lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set'}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Photo-Booth Viewfinder */}
          <div
            onClick={handleViewfinderClick}
            className={`relative flex-1 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden select-none ${
              embeddedMobile ? 'min-h-[210px]' : 'min-h-[360px]'
            } ${
              selfieFrameId === 'polaroid' && !capturedPhotoUrl ? 'p-3 pb-14 bg-white' : ''
            }`}
          >
            {/* Live Video Feed with CSS Filter */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: activeFilter.cssFilter }}
              className={`w-full h-full object-cover ${
                selfieFrameId === 'polaroid' ? 'rounded-sm' : ''
              } ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${
                capturedPhotoUrl ? 'hidden' : 'block'
              }`}
            />

            {/* Captured Composited Image */}
            {capturedPhotoUrl && (
              <img
                src={capturedPhotoUrl}
                alt="Captured selfie"
                className="w-full h-full object-contain bg-slate-950"
              />
            )}

            {/* Stylish Simulated Studio Ambient Backdrop when Webcam is Not Active */}
            {!capturedPhotoUrl && !isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                <div className="w-64 h-64 rounded-full bg-sky-500/15 blur-3xl -translate-x-20 -translate-y-10" />
                <div className="w-72 h-72 rounded-full bg-pink-500/15 blur-3xl translate-x-20 translate-y-12" />
              </div>
            )}

            {/* Top HUD: Time + GPS + Quick Refresh */}
            {!capturedPhotoUrl && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none"
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium tabular-nums">
                  <span className="inline-flex items-center gap-1 font-mono text-slate-200">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {liveTimeText}
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

            {/* Live Frame Overlay (while composing before capture) */}
            {!capturedPhotoUrl && (
              <>
                {selfieFrameId === 'mascot_duo' && (
                  <>
                    <div className="absolute inset-0 pointer-events-none border-[5px] border-amber-400/90 z-10" />
                    <div className="absolute inset-x-3 bottom-2.5 z-20 pointer-events-none rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-400/40 px-3 py-1.5 flex items-center justify-between gap-2 shadow-lg">
                      <ChacoAvatar size={34} />
                      <div className="text-center min-w-0 flex-1">
                        <p className="text-xs font-bold text-amber-200 truncate">
                          {checkTypeLabel} · {activePersonName}
                        </p>
                        <p className="text-[10px] text-slate-300 truncate tabular-nums">
                          {liveTimeText} · {selectedGate?.nameTh || 'โรงเรียน'}
                        </p>
                      </div>
                      <MeeAvatar size={34} />
                    </div>
                  </>
                )}

                {selfieFrameId === 'pastel_cute' && (
                  <>
                    <div className="absolute inset-0 pointer-events-none border-[6px] border-pink-400/80 z-10" />
                    <div className="absolute inset-x-4 bottom-2.5 z-20 pointer-events-none flex justify-center">
                      <div className="px-4 py-1.5 rounded-full bg-white/95 shadow-lg border border-pink-200 text-pink-700 text-[11px] font-bold truncate max-w-full">
                        {checkTypeLabel} · {activePersonName} · {liveTimeText}
                      </div>
                    </div>
                  </>
                )}

                {selfieFrameId === 'polaroid' && (
                  <div className="absolute inset-x-3 bottom-2 z-20 pointer-events-none flex items-center justify-between gap-2 text-slate-900">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {checkTypeLabel} · {activePersonName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate tabular-nums">
                        {liveTimeText} · {selectedGate?.nameTh || 'โรงเรียน'}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 shrink-0">BaanPakKru</span>
                  </div>
                )}

                {selfieFrameId === 'clean' && (
                  <div className="absolute bottom-3 left-3 z-20 pointer-events-none px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">
                    {checkTypeLabel} · {activePersonName} · {liveTimeText}
                  </div>
                )}
              </>
            )}

            {/* Interactive Placed Stickers Layer */}
            {!capturedPhotoUrl &&
              placedStickers.map((stk) => {
                const isSelected = stk.uid === selectedStickerUid;
                return (
                  <div
                    key={stk.uid}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStickerUid(isSelected ? null : stk.uid);
                    }}
                    style={{
                      left: `${stk.xPct}%`,
                      top: `${stk.yPct}%`,
                      transform: `translate(-50%, -50%) rotate(${stk.rotation}deg)`,
                    }}
                    className={`absolute z-30 cursor-pointer transition-transform hover:scale-105 ${
                      isSelected ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-slate-900/50 rounded-full' : ''
                    }`}
                    title="แตะเพื่อเลือก แล้วแตะตำแหน่งบนจอเพื่อย้ายสติกเกอร์"
                  >
                    <StickerArtwork stickerId={stk.stickerId} />
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlacedStickers((prev) => prev.filter((item) => item.uid !== stk.uid));
                          setSelectedStickerUid(null);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md cursor-pointer border border-white"
                        aria-label="ลบสติกเกอร์"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

            {/* Subtle Face Alignment Reticle when camera is active and no error */}
            {!capturedPhotoUrl && !cameraError && selfieCountdown === null && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`${embeddedMobile ? 'w-28 h-36' : 'w-44 h-56'} relative rounded-3xl`}>
                  <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/50 rounded-tl-2xl" />
                  <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/50 rounded-tr-2xl" />
                  <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/50 rounded-bl-2xl" />
                  <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/50 rounded-br-2xl" />
                </div>
              </div>
            )}

            {/* 3-2-1 Countdown Overlay */}
            {selfieCountdown !== null && (
              <div className="absolute inset-0 z-40 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-white/95 text-slate-950 flex items-center justify-center text-5xl font-black shadow-2xl animate-bounce tabular-nums">
                  {selfieCountdown}
                </div>
                <p className="mt-2 text-xs font-semibold text-white drop-shadow">ยิ้มเลย! กำลังถ่าย...</p>
              </div>
            )}

            {isFlashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />}

            {/* Non-overlapping Friendly Camera Error / Sticker Demo Card */}
            {cameraError && !capturedPhotoUrl && selfieCountdown === null && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-30 mx-4 max-w-sm w-full p-4 rounded-xl bg-slate-900/90 border border-white/15 text-slate-100 backdrop-blur-xl shadow-2xl text-center space-y-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center mx-auto">
                  <Camera className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white">โหมดสตูดิโอสติกเกอร์ (ยังไม่พบสิทธิ์กล้อง)</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs cursor-pointer border border-white/15 transition"
                  >
                    ลองเปิดกล้อง
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="h-8 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs cursor-pointer shadow-xs transition"
                  >
                    ลองถ่ายกับสติกเกอร์
                  </button>
                </div>
              </div>
            )}

            {cameraNotice && !cameraError && !capturedPhotoUrl && (
              <div className="absolute inset-x-4 top-14 z-20 px-3 py-1 rounded-lg bg-black/65 border border-white/10 text-slate-200 text-[11px] text-center backdrop-blur-md pointer-events-none">
                {cameraNotice}
              </div>
            )}
          </div>

          {/* Interactive Photo-Booth Creative Tray (Stickers · Frames · Filters) */}
          {!capturedPhotoUrl && (
            <div className="bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] px-3.5 py-2.5 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]">
                  {[
                    { id: 'stickers' as const, icon: Sticker, label: 'สติกเกอร์' },
                    { id: 'frames' as const, icon: Frame, label: 'กรอบรูป' },
                    { id: 'filters' as const, icon: Sliders, label: 'ฟิลเตอร์' },
                  ].map((tab) => {
                    const active = boothTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBoothTab(tab.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-2xs'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                        }`}
                      >
                        <tab.icon className="w-3 h-3 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  {boothTab === 'stickers' && placedStickers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlacedStickers([]);
                        setSelectedStickerUid(null);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--color-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition"
                      title="ล้างสติกเกอร์ทั้งหมด"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">ล้าง</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleShuffleBooth}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-[11px] font-semibold cursor-pointer transition"
                    title="สุ่มกรอบ ฟิลเตอร์ และสติกเกอร์"
                  >
                    <Shuffle className="w-3 h-3 text-[var(--color-primary-text)]" />
                    <span>สุ่มแต่งรูป</span>
                  </button>
                </div>
              </div>

              {/* Creative Swatches Row */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {boothTab === 'stickers' && (
                  <>
                    {SELFIE_STICKERS.map((stk) => {
                      const active = placedStickers.some((item) => item.stickerId === stk.id);
                      return (
                        <button
                          key={stk.id}
                          type="button"
                          onClick={() => handleToggleSticker(stk.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
                            active
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text-title)] font-semibold'
                              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                          }`}
                        >
                          <StickerArtwork stickerId={stk.id} compact />
                          {stk.id !== 'early_bird' && stk.id !== 'full_energy' && <span>{stk.labelTh}</span>}
                          {active && <Check className="w-3 h-3 text-[var(--color-primary-text)]" />}
                        </button>
                      );
                    })}
                  </>
                )}

                {boothTab === 'frames' &&
                  SELFIE_FRAMES.map((frm) => {
                    const active = selfieFrameId === frm.id;
                    return (
                      <button
                        key={frm.id}
                        type="button"
                        onClick={() => setSelfieFrameId(frm.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer ${
                          active
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text-title)] font-semibold'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm border border-black/15 shrink-0"
                          style={{ backgroundColor: frm.accentColor }}
                        />
                        <span>{frm.labelTh}</span>
                      </button>
                    );
                  })}

                {boothTab === 'filters' &&
                  SELFIE_FILTERS.map((flt) => {
                    const active = selfieFilterId === flt.id;
                    return (
                      <button
                        key={flt.id}
                        type="button"
                        onClick={() => setSelfieFilterId(flt.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer ${
                          active
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-text-title)] font-semibold'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${flt.swatchGradient} border border-black/15 shrink-0`} />
                        <span>{flt.labelTh}</span>
                      </button>
                    );
                  })}
              </div>

              {boothTab === 'stickers' && selectedStickerUid && (
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  แตะพื้นที่บนภาพเพื่อย้ายตำแหน่งสติกเกอร์ที่เลือก หรือกด × ที่สติกเกอร์เพื่อลบออก
                </p>
              )}
            </div>
          )}

          {/* Studio Bottom Shutter & Action Deck */}
          <div className="px-4 py-3 bg-[var(--color-card)] border-t border-[var(--color-border)] shrink-0">
            {capturedPhotoUrl ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      if (!isCameraActive) {
                        void startCamera(facingModeRef.current);
                      }
                    }}
                    className="h-10 px-3.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] font-medium text-xs inline-flex items-center justify-center gap-1.5 border border-[var(--color-border)] transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่</span>
                  </button>

                  <a
                    href={capturedPhotoUrl}
                    download={`baanpakkru-selfie-${Date.now()}.jpg`}
                    className="h-10 px-3.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] font-medium text-xs inline-flex items-center justify-center gap-1.5 border border-[var(--color-border)] transition cursor-pointer"
                    title="ดาวน์โหลดภาพเซลฟี่เก็บไว้"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <span>บันทึกรูป</span>
                  </a>

                  <button
                    type="button"
                    disabled={!isInGeofence || isSavingAttendance}
                    onClick={handleConfirmCheckin}
                    className={`flex-1 min-w-[160px] h-10 px-4 rounded-lg text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer ${
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
                      <span>พร้อมส่งรูปสติกเกอร์เช็คชื่อและแจ้งเตือนผู้ปกครอง</span>
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
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className="h-10 px-2.5 sm:px-3 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                    title="เปิด / รีเฟรชกล้อง"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">รีเฟรช</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={handleToggleFacingMode}
                    className="h-10 px-2.5 sm:px-3 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                    title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง' : 'สลับเป็นกล้องหน้า'}
                    aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-pulse' : ''}`} />
                    <span>สลับกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelfieTimerSeconds(selfieTimerSeconds === 0 ? 3 : 0)}
                    className={`h-10 px-2.5 rounded-lg border transition cursor-pointer inline-flex items-center gap-1 text-xs font-medium ${
                      selfieTimerSeconds === 3
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-primary-text)] font-semibold'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                    }`}
                    title="ตั้งเวลานับถอยหลัง 3 วินาทีก่อนถ่าย"
                  >
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    <span className="tabular-nums">{selfieTimerSeconds === 3 ? '3 วิ' : 'ทันที'}</span>
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
                      className="max-w-[140px] h-10 px-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] font-medium truncate"
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
                  disabled={isCapturing || isCameraSwitching || selfieCountdown !== null}
                  className="h-10 px-5 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-60 shrink-0"
                  title="ถ่ายรูปเซลฟี่เช็คชื่อ"
                  aria-label="ถ่ายรูปเช็คชื่อ"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {selfieCountdown !== null
                      ? `กำลังนับถอยหลัง ${selfieCountdown}...`
                      : selfieTimerSeconds === 3
                        ? 'ถ่ายเซลฟี่ (3 วิ)'
                        : 'ถ่ายรูปเช็คชื่อ'}
                  </span>
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
