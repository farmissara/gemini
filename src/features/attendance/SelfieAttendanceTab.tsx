import React, { useRef, useState } from 'react';
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
  clampStickerPosition,
  getCameraEffectOption,
  getFilterOption,
  getNextFilterId,
  getStickerOption,
  SELFIE_CAMERA_EFFECTS,
  SELFIE_FILTERS,
  SELFIE_FRAMES,
  SELFIE_STICKERS,
  type PlacedSticker,
  type SelfieCameraEffectId,
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
  selfieEffectId: SelfieCameraEffectId;
  setSelfieEffectId: (id: SelfieCameraEffectId) => void;
  placedStickers: PlacedSticker[];
  setPlacedStickers: React.Dispatch<React.SetStateAction<PlacedSticker[]>>;
  selfieTimerSeconds: 0 | 3;
  setSelfieTimerSeconds: (secs: 0 | 3) => void;
  selfieCountdown: number | null;
}

const CameraEffectsOverlay: React.FC<{ effectId: SelfieCameraEffectId }> = ({ effectId }) => {
  if (effectId === 'none') return null;

  if (effectId === 'sparkles') {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <g className="booth-effect-sparkle" style={{ transformOrigin: '56px 54px' }}>
            <path d="M56 36 L60 50 L74 54 L60 58 L56 72 L52 58 L38 54 L52 50 Z" fill="#fde047" />
          </g>
          <g className="booth-effect-sparkle" style={{ transformOrigin: '344px 60px', animationDelay: '0.6s' }}>
            <path d="M344 40 L349 55 L364 60 L349 65 L344 80 L339 65 L324 60 L339 55 Z" fill="#fef08a" />
          </g>
          <g className="booth-effect-sparkle" style={{ transformOrigin: '72px 236px', animationDelay: '1.1s' }}>
            <path d="M72 222 L75 233 L86 236 L75 239 L72 250 L69 239 L58 236 L69 233 Z" fill="#38bdf8" />
          </g>
          <g className="booth-effect-sparkle" style={{ transformOrigin: '334px 222px', animationDelay: '0.3s' }}>
            <path d="M334 206 L338 218 L350 222 L338 226 L334 238 L330 226 L318 222 L330 218 Z" fill="#fde047" />
          </g>
        </svg>
      </div>
    );
  }

  if (effectId === 'hearts_float') {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <g className="booth-effect-heart" style={{ transformOrigin: '64px 80px' }}>
            <path d="M64 90 C50 79 44 65 55 58 C61 54 64 60 64 60 C64 60 67 54 73 58 C84 65 78 79 64 90 Z" fill="#fb7185" stroke="#ffffff" strokeWidth="1.5" />
          </g>
          <g className="booth-effect-heart" style={{ transformOrigin: '336px 76px', animationDelay: '0.9s' }}>
            <path d="M336 88 C320 75 314 60 326 52 C332 48 336 55 336 55 C336 55 340 48 346 52 C358 60 352 75 336 88 Z" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
          </g>
          <g className="booth-effect-heart" style={{ transformOrigin: '78px 232px', animationDelay: '1.6s' }}>
            <path d="M78 240 C66 231 61 219 70 213 C75 210 78 215 78 215 C78 215 81 210 86 213 C95 219 90 231 78 240 Z" fill="#f472b6" stroke="#ffffff" strokeWidth="1.4" />
          </g>
          <g className="booth-effect-heart" style={{ transformOrigin: '322px 232px', animationDelay: '0.4s' }}>
            <path d="M322 242 C308 232 302 218 313 211 C319 208 322 214 322 214 C322 214 325 208 331 211 C342 218 336 232 322 242 Z" fill="#fb7185" stroke="#ffffff" strokeWidth="1.4" />
          </g>
        </svg>
      </div>
    );
  }

  if (effectId === 'neon_pulse') {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 p-2" aria-hidden="true">
        <div className="w-full h-full rounded-2xl border-2 border-sky-400/80 shadow-[inset_0_0_24px_rgba(56,189,248,0.45)] booth-effect-neon flex items-center justify-center">
          <div className="w-[calc(100%-10px)] h-[calc(100%-10px)] rounded-xl border border-pink-400/55" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" aria-hidden="true">
      <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
        <g className="booth-effect-star" style={{ transformOrigin: '52px 54px' }}>
          <polygon points="52,38 56,49 68,49 58,56 62,67 52,60 42,67 46,56 36,49 48,49" fill="#e9d5ff" />
        </g>
        <g className="booth-effect-star" style={{ transformOrigin: '348px 54px', animationDelay: '0.7s' }}>
          <polygon points="348,38 352,49 364,49 354,56 358,67 348,60 338,67 342,56 332,49 344,49" fill="#c084fc" />
        </g>
        <g className="booth-effect-star" style={{ transformOrigin: '60px 244px', animationDelay: '1.2s' }}>
          <polygon points="60,228 64,239 76,239 66,246 70,257 60,250 50,257 54,246 44,239 56,239" fill="#fde047" />
        </g>
        <g className="booth-effect-star" style={{ transformOrigin: '340px 242px', animationDelay: '0.35s' }}>
          <polygon points="340,226 344,237 356,237 346,244 350,255 340,248 330,255 334,244 324,237 336,237" fill="#a855f7" />
        </g>
      </svg>
    </div>
  );
};

const StickerArtwork: React.FC<{ stickerId: SelfieStickerId; compact?: boolean }> = ({
  stickerId,
  compact = false,
}) => {
  const opt = getStickerOption(stickerId);

  if (stickerId === 'chaco_cheer') {
    return (
      <div className="inline-flex flex-col items-center drop-shadow-md select-none">
        <div className={`${compact ? 'p-0.5' : 'p-0.5 sm:p-1'} rounded-full bg-white shadow-md`}>
          {compact ? (
            <ChacoAvatar size={26} />
          ) : (
            <>
              <span className="sm:hidden block">
                <ChacoAvatar size={34} />
              </span>
              <span className="hidden sm:block">
                <ChacoAvatar size={46} />
              </span>
            </>
          )}
        </div>
        {!compact && (
          <span className="-mt-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-extrabold border border-white sm:border-2 shadow-sm whitespace-nowrap">
            ชาโคเชียร์!
          </span>
        )}
      </div>
    );
  }

  if (stickerId === 'mee_hi') {
    return (
      <div className="inline-flex flex-col items-center drop-shadow-md select-none">
        <div className={`${compact ? 'p-0.5' : 'p-0.5 sm:p-1'} rounded-full bg-white shadow-md`}>
          {compact ? (
            <MeeAvatar size={26} />
          ) : (
            <>
              <span className="sm:hidden block">
                <MeeAvatar size={34} />
              </span>
              <span className="hidden sm:block">
                <MeeAvatar size={46} />
              </span>
            </>
          )}
        </div>
        {!compact && (
          <span className="-mt-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[9px] sm:text-[10px] font-extrabold border border-white sm:border-2 shadow-sm whitespace-nowrap">
            หมีสี่ตา
          </span>
        )}
      </div>
    );
  }

  if (stickerId === 'star_crown') {
    return (
      <div className="inline-flex items-center justify-center drop-shadow-md select-none">
        <div
          className={`${
            compact ? 'w-6 h-6' : 'w-9 h-9 sm:w-12 sm:h-12'
          } rounded-full bg-amber-300/95 border-2 border-white flex items-center justify-center shadow-md`}
        >
          <Crown className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5 sm:w-7 sm:h-7'} text-amber-900 fill-amber-500`} />
        </div>
      </div>
    );
  }

  if (stickerId === 'cool_shades') {
    return (
      <div className="inline-flex items-center justify-center drop-shadow-md select-none">
        <div
          className={`${
            compact ? 'px-1.5 py-1' : 'px-2 py-1 sm:px-3 sm:py-1.5'
          } rounded-full bg-slate-950 border-2 border-white flex items-center justify-center shadow-md`}
        >
          <Glasses className={`${compact ? 'w-3.5 h-3.5' : 'w-6 h-6 sm:w-8 sm:h-8'} text-sky-400`} />
        </div>
      </div>
    );
  }

  if (stickerId === 'sparkle_heart') {
    return (
      <div className="inline-flex items-center justify-center drop-shadow-md select-none">
        <div
          className={`${
            compact ? 'w-6 h-6' : 'w-9 h-9 sm:w-11 sm:h-11'
          } rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-md`}
        >
          <Heart className={`${compact ? 'w-3 h-3' : 'w-4.5 h-4.5 sm:w-6 sm:h-6'} text-white fill-white`} />
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-white font-extrabold shadow-md whitespace-nowrap select-none ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs'
      }`}
      style={{ backgroundColor: opt.bgColor, color: opt.textColor }}
    >
      <Sparkles className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0'} />
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
  selfieEffectId,
  setSelfieEffectId,
  placedStickers,
  setPlacedStickers,
  selfieTimerSeconds,
  setSelfieTimerSeconds,
  selfieCountdown,
}) => {
  const [boothTab, setBoothTab] = useState<'stickers' | 'effects' | 'frames' | 'filters'>('stickers');
  const [selectedStickerUid, setSelectedStickerUid] = useState<string | null>(
    placedStickers[0]?.uid ?? null
  );
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ uid: string; startX: number; startY: number; moved: boolean } | null>(null);

  const activeFilter = getFilterOption(selfieFilterId);
  const activeEffect = getCameraEffectOption(selfieEffectId);
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
    const clamped = clampStickerPosition(opt.defaultPos.xPct, opt.defaultPos.yPct);
    const uid = `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextSticker: PlacedSticker = {
      uid,
      stickerId,
      xPct: clamped.xPct,
      yPct: clamped.yPct,
      rotation: opt.defaultPos.rotation,
    };
    setPlacedStickers((prev) => [...prev.slice(-4), nextSticker]);
    setSelectedStickerUid(uid);
  };

  const updateStickerFromClientPoint = (uid: string, clientX: number, clientY: number) => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    const clamped = clampStickerPosition(rawX, rawY);
    setPlacedStickers((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, xPct: clamped.xPct, yPct: clamped.yPct } : s))
    );
  };

  const handleViewfinderClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (capturedPhotoUrl || !selectedStickerUid) return;
    updateStickerFromClientPoint(selectedStickerUid, event.clientX, event.clientY);
  };

  const handleShuffleBooth = () => {
    const framePool: SelfieFrameId[] = ['mascot_duo', 'pastel_cute', 'polaroid'];
    const nextFrame = framePool[Math.floor(Math.random() * framePool.length)];
    const filterPool: SelfieFilterId[] = ['glow', 'warm_film', 'cool_mint', 'mono', 'normal'];
    const nextFilter = filterPool[Math.floor(Math.random() * filterPool.length)];
    const effectPool: SelfieCameraEffectId[] = ['sparkles', 'hearts_float', 'neon_pulse', 'starlight'];
    const nextEffect = effectPool[Math.floor(Math.random() * effectPool.length)];
    const shuffledStickers = [...SELFIE_STICKERS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((opt, idx) => ({
        uid: `stk-${Date.now()}-${idx}`,
        stickerId: opt.id,
        xPct: idx === 0 ? 24 : 76,
        yPct: idx === 0 ? 28 : 70,
        rotation: idx === 0 ? -8 : 8,
      }));
    setSelfieFrameId(nextFrame);
    setSelfieFilterId(nextFilter);
    setSelfieEffectId(nextEffect);
    setPlacedStickers(shuffledStickers);
    setSelectedStickerUid(shuffledStickers[0]?.uid ?? null);
  };

  const frameWrapperClass = (() => {
    if (capturedPhotoUrl) {
      return 'bg-slate-950';
    }
    if (selfieFrameId === 'mascot_duo') {
      return 'bg-slate-950 p-1.5 sm:p-2 border-[3px] border-amber-400';
    }
    if (selfieFrameId === 'pastel_cute') {
      return 'bg-gradient-to-br from-pink-400 via-violet-400 to-sky-400 p-1.5 sm:p-2';
    }
    if (selfieFrameId === 'polaroid') {
      return 'bg-white p-2 sm:p-3';
    }
    return 'bg-slate-950';
  })();

  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'}`}
    >
      {/* CAMERA PHOTO-BOOTH STUDIO COLUMN */}
      <div className={`${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'lg:col-span-7 flex flex-col'}`}>
        <div className={`w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] relative flex flex-col overflow-hidden shadow-xs ${embeddedMobile ? 'flex-1 min-h-0' : ''}`}>
          {/* Studio Top Control Bar: Check-in/Out + Gate (+ Refresh GPS on mobile) */}
          <div className={`bg-[var(--color-card)] border-b border-[var(--color-border)] flex items-center justify-between gap-1.5 shrink-0 ${embeddedMobile ? 'px-2.5 py-1.5' : 'px-3 py-2 flex-wrap gap-2'}`}>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0">
              <button
                type="button"
                onClick={() => setCheckType('check_in')}
                className={`inline-flex items-center gap-1 rounded-md transition cursor-pointer active:scale-[0.97] ${embeddedMobile ? 'h-7 px-2 text-[11px]' : 'py-1.5 px-2.5 sm:px-3 text-xs'} ${
                  checkType === 'check_in'
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                }`}
              >
                <LogIn className="w-3 h-3 shrink-0" />
                <span>เข้าโรงเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckType('check_out')}
                className={`inline-flex items-center gap-1 rounded-md transition cursor-pointer active:scale-[0.97] ${embeddedMobile ? 'h-7 px-2 text-[11px]' : 'py-1.5 px-2.5 sm:px-3 text-xs'} ${
                  checkType === 'check_out'
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                }`}
              >
                <LogOut className="w-3 h-3 shrink-0" />
                <span>ออกโรงเรียน</span>
              </button>
            </div>

            <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
              {normalizedGates.length > 1 && selectedGate ? (
                <select
                  aria-label={lang === 'th' ? 'จุดประตูเช็คชื่อ' : 'Check-in gate'}
                  value={selectedGate.id}
                  onChange={(e) => setSelectedGateId(e.target.value)}
                  className={`${embeddedMobile ? 'h-7 text-[11px] max-w-[115px]' : 'h-8 text-xs max-w-[165px] sm:max-w-[230px]'} bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] font-medium rounded-lg px-2 border border-[var(--color-border)] truncate min-w-0 focus:outline-hidden transition cursor-pointer`}
                >
                  {normalizedGates.map((gate) => (
                    <option key={gate.id} value={gate.id}>
                      {gate.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`inline-flex items-center gap-1 bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-medium rounded-lg px-2 border border-[var(--color-border)] truncate min-w-0 ${embeddedMobile ? 'h-7 text-[11px] max-w-[115px]' : 'h-8 text-xs max-w-[165px] sm:max-w-[230px]'}`}>
                  <MapPin className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
                  <span className="truncate">
                    {selectedGate ? selectedGate.nameTh : lang === 'th' ? 'ยังไม่ตั้งพิกัด' : 'No GPS'}
                  </span>
                </span>
              )}

              {embeddedMobile && (
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-[11px] font-semibold inline-flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                  title="รีเฟรชสัญญาณ GPS"
                  aria-label="รีเฟรชสัญญาณ GPS"
                >
                  <Navigation className={`w-3 h-3 text-[var(--color-primary-text)] shrink-0 ${isGpsLoading ? 'animate-spin' : ''}`} />
                  <span>GPS</span>
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Live Time + GPS Strip ABOVE the sticker stage (Desktop only; mobile integrates GPS button above to save height) */}
          {!capturedPhotoUrl && !embeddedMobile && (
            <div className="px-3 py-1.5 bg-slate-900 text-slate-100 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px] shrink-0">
              <div className="inline-flex items-center gap-2 min-w-0 tabular-nums">
                <span className="inline-flex items-center gap-1 font-mono text-slate-200 shrink-0">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {liveTimeText}
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 truncate">
                  {isGpsLoading ? (
                    <RefreshCw className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
                  ) : !hasSchoolGpsConfigured || currentGpsDistance === null ? (
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : isInGeofence ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  )}
                  <span className="truncate">{gpsStatusShortLabel}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefreshGps}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-medium border border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
                title="รีเฟรชสัญญาณ GPS"
                aria-label="รีเฟรชสัญญาณ GPS"
              >
                <Navigation className={`w-3 h-3 text-sky-400 shrink-0 ${isGpsLoading ? 'animate-spin' : ''}`} />
                <span>พิกัด GPS</span>
              </button>
            </div>
          )}

          {/* Framed Photo-Booth Outer Chrome */}
          <div className={`${frameWrapperClass} transition-colors duration-200 ${embeddedMobile ? 'flex-1 min-h-0 flex flex-col' : 'shrink-0'}`}>
            {/* Unobstructed Photo & Sticker Stage */}
            <div
              ref={stageRef}
              onClick={handleViewfinderClick}
              className={`relative w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden select-none ${
                embeddedMobile ? 'flex-1 min-h-[140px]' : 'aspect-[4/3]'
              } ${
                !capturedPhotoUrl && selfieFrameId !== 'clean' ? 'rounded-lg' : ''
              }`}
            >
              {/* Live Video Feed with CSS Filter */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: activeFilter.cssFilter }}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${
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

              {/* Simulated Studio Ambient Backdrop when Webcam is Not Active */}
              {!capturedPhotoUrl && !isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                  <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-sky-500/15 blur-3xl -translate-x-16 -translate-y-8" />
                  <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-pink-500/15 blur-3xl translate-x-16 translate-y-10" />
                  <div className="flex flex-col items-center gap-1.5 text-center px-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-white/25 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-inner">
                      {(activePersonName || 'BP').trim().slice(0, 2)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-300/90">
                      ลากหรือแตะวางสติกเกอร์ได้ทั่วทั้งภาพ
                    </span>
                  </div>
                </div>
              )}

              {/* Animated Camera Effects SVG Overlay */}
              {!capturedPhotoUrl && <CameraEffectsOverlay effectId={selfieEffectId} />}

              {/* Subtle Face Alignment Reticle when camera is active */}
              {!capturedPhotoUrl && isCameraActive && selfieCountdown === null && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-28 h-36 sm:w-44 sm:h-56 relative rounded-3xl">
                    <span className="absolute top-0 left-0 w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-l-2 border-white/50 rounded-tl-2xl" />
                    <span className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-r-2 border-white/50 rounded-tr-2xl" />
                    <span className="absolute bottom-0 left-0 w-4 h-4 sm:w-5 sm:h-5 border-b-2 border-l-2 border-white/50 rounded-bl-2xl" />
                    <span className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 border-b-2 border-r-2 border-white/50 rounded-br-2xl" />
                  </div>
                </div>
              )}

              {/* Interactive Draggable & Tappable Stickers Layer */}
              {!capturedPhotoUrl &&
                placedStickers.map((stk) => {
                  const isSelected = stk.uid === selectedStickerUid;
                  return (
                    <div
                      key={stk.uid}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {
                          // ignore if synthetic event
                        }
                        dragRef.current = {
                          uid: stk.uid,
                          startX: e.clientX,
                          startY: e.clientY,
                          moved: false,
                        };
                        setSelectedStickerUid(stk.uid);
                      }}
                      onPointerMove={(e) => {
                        const drag = dragRef.current;
                        if (!drag || drag.uid !== stk.uid) return;
                        if (!drag.moved) {
                          if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4) {
                            drag.moved = true;
                          }
                        }
                        if (drag.moved) {
                          updateStickerFromClientPoint(stk.uid, e.clientX, e.clientY);
                        }
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        const drag = dragRef.current;
                        if (drag && drag.uid === stk.uid && !drag.moved) {
                          setSelectedStickerUid(isSelected ? null : stk.uid);
                        }
                        dragRef.current = null;
                        try {
                          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      onPointerCancel={() => {
                        dragRef.current = null;
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        left: `${stk.xPct}%`,
                        top: `${stk.yPct}%`,
                        transform: `translate(-50%, -50%) rotate(${stk.rotation}deg)`,
                      }}
                      className={`absolute z-30 cursor-grab active:cursor-grabbing touch-none select-none transition-transform hover:scale-105 ${
                        isSelected
                          ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-slate-900/50 rounded-full'
                          : ''
                      }`}
                      title="ลากด้วยนิ้ว/เมาส์ หรือแตะพื้นที่บนภาพเพื่อย้ายตำแหน่ง"
                    >
                      <StickerArtwork stickerId={stk.stickerId} />
                      {isSelected && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlacedStickers((prev) => prev.filter((item) => item.uid !== stk.uid));
                            setSelectedStickerUid(null);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md cursor-pointer border border-white"
                          aria-label="ลบสติกเกอร์"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

              {/* 3-2-1 Countdown Overlay */}
              {selfieCountdown !== null && (
                <div className="absolute inset-0 z-40 bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 text-slate-950 flex items-center justify-center text-4xl sm:text-5xl font-black shadow-2xl animate-bounce tabular-nums">
                    {selfieCountdown}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white drop-shadow">ยิ้มเลย! กำลังถ่าย...</p>
                </div>
              )}

              {isFlashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />}

              {cameraNotice && !cameraError && !capturedPhotoUrl && (
                <div className="absolute inset-x-3 top-2.5 z-20 px-3 py-1 rounded-lg bg-black/65 border border-white/10 text-slate-200 text-[11px] text-center backdrop-blur-md pointer-events-none">
                  {cameraNotice}
                </div>
              )}
            </div>

            {/* Dedicated Frame Caption Footer BELOW Stage */}
            {!capturedPhotoUrl && !embeddedMobile && selfieFrameId === 'mascot_duo' && (
              <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-400/35 flex items-center justify-between gap-2">
                <ChacoAvatar size={28} />
                <div className="text-center min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs font-bold text-amber-200 truncate">
                    {checkTypeLabel} · {activePersonName}
                  </p>
                  <p className="text-[10px] text-slate-300 truncate tabular-nums">
                    {liveTimeText} · {selectedGate?.nameTh || 'โรงเรียน'}
                  </p>
                </div>
                <MeeAvatar size={28} />
              </div>
            )}

            {!capturedPhotoUrl && !embeddedMobile && selfieFrameId === 'pastel_cute' && (
              <div className="mt-1.5 flex justify-center">
                <div className="px-3.5 py-1 rounded-full bg-white/95 shadow-sm border border-pink-200 text-pink-700 text-[11px] font-bold truncate max-w-full">
                  {checkTypeLabel} · {activePersonName} · {liveTimeText}
                </div>
              </div>
            )}

            {!capturedPhotoUrl && !embeddedMobile && selfieFrameId === 'polaroid' && (
              <div className="pt-2 pb-0.5 px-1 flex items-center justify-between gap-2 text-slate-900">
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

            {!capturedPhotoUrl && !embeddedMobile && selfieFrameId === 'clean' && (
              <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 text-slate-200 text-[11px] font-medium flex items-center justify-between gap-2">
                <span className="truncate">
                  {checkTypeLabel} · {activePersonName}
                </span>
                <span className="text-slate-400 tabular-nums shrink-0">{liveTimeText}</span>
              </div>
            )}
          </div>

          {/* Non-blocking Camera Permission / Studio Demo Notice Strip */}
          {cameraError && !capturedPhotoUrl && selfieCountdown === null && (
            <div className={`bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-1.5 text-xs shrink-0 ${embeddedMobile ? 'px-2.5 py-1.5' : 'px-3 py-2 flex-wrap gap-2'}`}>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Camera className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                <p className="text-[11px] text-amber-950 dark:text-amber-100 leading-tight truncate">
                  {cameraError}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void startCamera(facingModeRef.current);
                  }}
                  className="h-7 px-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold text-[11px] cursor-pointer border border-amber-400 dark:border-amber-600 shadow-2xs transition active:scale-95"
                >
                  เปิดกล้อง
                </button>
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="h-7 px-2 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] border border-amber-500 shadow-2xs cursor-pointer transition active:scale-95"
                >
                  จำลองถ่าย
                </button>
              </div>
            </div>
          )}

          {/* Interactive Photo-Booth Creative Tray (Stickers · Effects · Frames · Filters) */}
          {!capturedPhotoUrl && (
            <div className={`bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] shrink-0 ${embeddedMobile ? 'px-2.5 py-1.5 space-y-1.5' : 'px-3 py-2.5 space-y-2'}`}>
              <div className="flex items-center justify-between gap-1.5">
                <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] overflow-x-auto no-scrollbar max-w-full">
                  {[
                    { id: 'stickers' as const, icon: Sticker, label: 'สติกเกอร์' },
                    { id: 'effects' as const, icon: Sparkles, label: 'เอฟเฟกต์' },
                    { id: 'frames' as const, icon: Frame, label: 'กรอบรูป' },
                    { id: 'filters' as const, icon: Sliders, label: 'ฟิลเตอร์' },
                  ].map((tab) => {
                    const active = boothTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBoothTab(tab.id)}
                        className={`inline-flex items-center gap-1 rounded-md text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer active:scale-95 ${
                          embeddedMobile ? 'h-7 px-2' : 'px-2.5 py-1.5'
                        } ${
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

                <div className="flex items-center gap-1 shrink-0">
                  {boothTab === 'stickers' && placedStickers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlacedStickers([]);
                        setSelectedStickerUid(null);
                      }}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-rose-300 dark:border-rose-800 bg-[var(--color-card)] text-[11px] font-semibold text-rose-600 dark:text-rose-400 cursor-pointer transition active:scale-95"
                      title="ล้างสติกเกอร์ทั้งหมด"
                    >
                      <Trash2 className="w-3 h-3" />
                      {!embeddedMobile && <span className="hidden sm:inline">ล้าง</span>}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleShuffleBooth}
                    className={`inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-[11px] font-semibold cursor-pointer transition active:scale-95 shrink-0 shadow-2xs ${
                      embeddedMobile ? 'h-7 px-2' : 'px-2.5 py-1.5'
                    }`}
                    title="สุ่มกรอบ เอฟเฟกต์ ฟิลเตอร์ และสติกเกอร์"
                  >
                    <Shuffle className="w-3 h-3 text-[var(--color-primary-text)]" />
                    <span>{embeddedMobile ? 'สุ่ม' : 'สุ่มแต่งรูป'}</span>
                  </button>
                </div>
              </div>

              {/* Creative Swatches Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
                {boothTab === 'stickers' && (
                  <>
                    {SELFIE_STICKERS.map((stk) => {
                      const active = placedStickers.some((item) => item.stickerId === stk.id);
                      return (
                        <button
                          key={stk.id}
                          type="button"
                          onClick={() => handleToggleSticker(stk.id)}
                          className={`inline-flex items-center gap-1 px-2 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 transition cursor-pointer active:scale-95 shadow-2xs ${
                            embeddedMobile ? 'h-7' : 'min-h-[38px] py-1 px-2.5'
                          } ${
                            active
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold'
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

                {boothTab === 'effects' &&
                  SELFIE_CAMERA_EFFECTS.map((eff) => {
                    const active = selfieEffectId === eff.id;
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => setSelfieEffectId(eff.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer active:scale-95 shadow-2xs ${
                          embeddedMobile ? 'h-7' : 'min-h-[38px] py-1 px-3'
                        } ${
                          active
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: eff.accentColor }}
                        />
                        <span>{eff.labelTh}</span>
                        {active && <Check className="w-3 h-3 text-[var(--color-primary-text)]" />}
                      </button>
                    );
                  })}

                {boothTab === 'frames' &&
                  SELFIE_FRAMES.map((frm) => {
                    const active = selfieFrameId === frm.id;
                    return (
                      <button
                        key={frm.id}
                        type="button"
                        onClick={() => setSelfieFrameId(frm.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer active:scale-95 shadow-2xs ${
                          embeddedMobile ? 'h-7' : 'min-h-[38px] py-1 px-3'
                        } ${
                          active
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm border border-black/15 shrink-0"
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
                        className={`inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition cursor-pointer active:scale-95 shadow-2xs ${
                          embeddedMobile ? 'h-7' : 'min-h-[38px] py-1 px-3'
                        } ${
                          active
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full bg-gradient-to-tr ${flt.swatchGradient} border border-black/15 shrink-0`} />
                        <span>{flt.labelTh}</span>
                      </button>
                    );
                  })}
              </div>

              {!embeddedMobile && boothTab === 'stickers' && selectedStickerUid && (
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  ลากสติกเกอร์ด้วยนิ้ว หรือแตะบนภาพเพื่อย้ายตำแหน่ง · กด × ที่สติกเกอร์เพื่อลบ
                </p>
              )}
              {!embeddedMobile && boothTab === 'effects' && activeEffect.id !== 'none' && (
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  กำลังเปิดเอฟเฟกต์กล้อง: {activeEffect.labelTh} (บันทึกติดไปในภาพถ่ายเช็คชื่อด้วย)
                </p>
              )}
            </div>
          )}

          {/* Studio Bottom Shutter & Action Deck */}
          <div className={`bg-[var(--color-card)] border-t border-[var(--color-border)] shrink-0 ${embeddedMobile ? 'px-2.5 py-1.5' : 'px-3 sm:px-4 py-2.5 sm:py-3'}`}>
            {capturedPhotoUrl ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhotoUrl(null);
                      if (!isCameraActive) {
                        void startCamera(facingModeRef.current);
                      }
                    }}
                    className={`${embeddedMobile ? 'h-8 px-2.5 text-[11px]' : 'h-10 px-3 text-xs'} rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold inline-flex items-center justify-center gap-1 border border-[var(--color-border)] shadow-2xs transition active:scale-95 cursor-pointer`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่</span>
                  </button>

                  <a
                    href={capturedPhotoUrl}
                    download={`baanpakkru-selfie-${Date.now()}.jpg`}
                    className={`${embeddedMobile ? 'h-8 px-2.5 text-[11px]' : 'h-10 px-3 text-xs'} rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold inline-flex items-center justify-center gap-1 border border-[var(--color-border)] shadow-2xs transition active:scale-95 cursor-pointer`}
                    title="ดาวน์โหลดภาพเซลฟี่เก็บไว้"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <span>บันทึกรูป</span>
                  </a>

                  <button
                    type="button"
                    disabled={!isInGeofence || isSavingAttendance}
                    onClick={handleConfirmCheckin}
                    className={`flex-1 min-w-[130px] ${embeddedMobile ? 'h-8 px-3 text-[11px]' : 'h-10 px-4 text-xs'} rounded-lg text-white font-bold inline-flex items-center justify-center gap-1 shadow-xs transition active:scale-[0.98] cursor-pointer ${
                      isInGeofence
                        ? checkType === 'check_in'
                          ? 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-700 border border-indigo-700'
                        : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {isSavingAttendance
                        ? 'กำลังบันทึก...'
                        : `ยืนยัน${checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน'}`}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-center text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                  {!hasSchoolGpsConfigured ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ</span>
                    </>
                  ) : isGpsLoading ? (
                    <>
                      <RefreshCw className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin shrink-0" />
                      <span>กำลังอ่านพิกัด GPS ปัจจุบัน...</span>
                    </>
                  ) : currentGpsDistance === null ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{gpsError || 'กรุณาอนุญาต GPS แล้วกดอัปเดตพิกัด'}</span>
                    </>
                  ) : isInGeofence ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>พร้อมบันทึกและแจ้งเตือนผู้ปกครอง</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>อยู่นอกพื้นที่โรงเรียน ({currentGpsDistance.toLocaleString()} ม.)</span>
                    </>
                  )}
                </p>
                {selfieActionError && (
                  <p className="text-[11px] text-center text-rose-600 dark:text-rose-400 font-medium">{selfieActionError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={() => {
                      void startCamera(facingModeRef.current);
                    }}
                    className={`${embeddedMobile ? 'h-8 w-8' : 'h-10 px-2.5 sm:px-3 gap-1.5 text-xs'} rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center justify-center font-semibold disabled:opacity-50 shrink-0`}
                    title="เปิด / รีเฟรชกล้อง"
                    aria-label="เปิดหรือรีเฟรชกล้อง"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-spin' : ''}`} />
                    {!embeddedMobile && <span className="hidden sm:inline">รีเฟรช</span>}
                  </button>

                  <button
                    type="button"
                    disabled={isCameraSwitching}
                    onClick={handleToggleFacingMode}
                    className={`${embeddedMobile ? 'h-8 px-2 text-[11px]' : 'h-10 px-2.5 sm:px-3 text-xs'} rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1 font-semibold disabled:opacity-60 shrink-0`}
                    title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง' : 'สลับเป็นกล้องหน้า'}
                    aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ${isCameraSwitching ? 'animate-pulse' : ''}`} />
                    <span>{embeddedMobile ? 'สลับ' : 'สลับกล้อง'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelfieFilterId(getNextFilterId(selfieFilterId))}
                    className={`${embeddedMobile ? 'h-8 px-2 text-[11px]' : 'h-10 px-2.5 text-xs'} rounded-lg border shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1 font-semibold shrink-0 ${
                      selfieFilterId !== 'normal'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-card)]'
                    }`}
                    title="แตะเพื่อสลับฟิลเตอร์กล้อง"
                    aria-label="สลับฟิลเตอร์กล้อง"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${activeFilter.swatchGradient} border border-black/20 shrink-0`} />
                    <span className="truncate max-w-[52px] sm:max-w-none">{activeFilter.labelTh}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelfieTimerSeconds(selfieTimerSeconds === 0 ? 3 : 0)}
                    className={`${embeddedMobile ? 'h-8 px-2 text-[11px]' : 'h-10 px-2.5 text-xs'} rounded-lg border shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1 font-semibold shrink-0 ${
                      selfieTimerSeconds === 3
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                    }`}
                    title="ตั้งเวลานับถอยหลัง 3 วินาทีก่อนถ่าย"
                  >
                    <Timer className="w-3 h-3 shrink-0" />
                    <span className="tabular-nums">{selfieTimerSeconds === 3 ? '3วิ' : '0วิ'}</span>
                  </button>

                  {!embeddedMobile && availableCameras.length > 2 && (
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
                      className="max-w-[110px] sm:max-w-[140px] h-10 px-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] font-medium truncate"
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
                  className={`${embeddedMobile ? 'h-8 px-3 text-[11px]' : 'h-10 px-4 sm:px-5 text-xs'} rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 border border-indigo-700 text-white font-bold inline-flex items-center gap-1 shadow-sm transition active:scale-[0.97] cursor-pointer disabled:opacity-60 shrink-0 ml-auto`}
                  title="ถ่ายรูปเซลฟี่เช็คชื่อ"
                  aria-label="ถ่ายรูปเช็คชื่อ"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {selfieCountdown !== null
                      ? `${selfieCountdown}...`
                      : selfieTimerSeconds === 3
                        ? 'ถ่าย (3วิ)'
                        : embeddedMobile
                          ? 'ถ่ายรูป'
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
