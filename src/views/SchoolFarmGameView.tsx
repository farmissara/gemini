import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpCircle,
  ChefHat,
  Gift,
  Grid2X2Plus,
  HelpCircle,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCw,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  HomeworkSubmission,
  PeriodAttendanceRecord,
  PlayerScore,
  QuizQuestion,
  RewardItem,
  School,
  Student,
  UserRole,
} from '../types';
import { BaseModal } from '../components/common/BaseModal';
import { emitAppToast } from '../components/common/ToastProvider';
import { getModuleTone } from '../lib/moduleTheme';
import {
  CAMPUS_DATA_UPDATED_EVENT,
  listSchoolFarmSnapshots,
  loadSchoolFarmState,
  saveSchoolFarmState,
} from '../lib/campusDataStore';
import {
  applyDailyFertilizerTile,
  applyQuizBoostReward,
  BUILDING_CATALOG,
  BUILDING_MAP,
  buyDailyDirtBargain,
  buyFromNeighborRoadsideShop,
  buySeedPack,
  calculateTownProsperity,
  claimDisciplineSupplies,
  claimFarmAchievement,
  clearWeedOnTile,
  collectBuildingYield,
  computeDisciplineChestSummary,
  constructBuildingOnTile,
  convertFarmCoinsToGems,
  craftProductOnFarm,
  CROP_CATALOG,
  CROP_MAP,
  dismissVisitorRequest,
  expandFarmGridTo8x8,
  FARM_CHARACTER_PRESETS,
  fertilizeTile,
  fulfillMarketOrder,
  fulfillVisitorRequest,
  generateDailyDirtListings,
  getBuildingUpgradeCost,
  getCropSellMultiplier,
  getFarmAchievementProgress,
  getFarmGridSize,
  getNpcDailyQuotaStatus,
  getPlotUnlockStarCost,
  getTodayBangkokDate,
  getTownLevelFromXp,
  grantTeacherBonusToFarm,
  harvestTile,
  helpNeighborFarm,
  isBuildingUnlocked,
  isCropUnlocked,
  listItemInRoadsideShop,
  LUCKY_WHEEL_REWARDS,
  normalizeFarmState,
  plantCropOnTile,
  PRODUCT_CATALOG,
  PRODUCT_MAP,
  removeBuildingOnTile,
  resetDailyWaterFlagsIfNeeded,
  resolveStudentForUser,
  sellCropFromBarn,
  spinDailyLuckyWheel,
  syncBehaviorWeedsOntoFarm,
  tillPlotTile,
  unlockPlotTile,
  updateFarmOwnerCharacter,
  upgradeBuildingOnTile,
  waterTile,
  type BuildingId,
  type CropId,
  type DailyDirtAd,
  type FarmOwnerCharacter,
  type FarmTool,
  type LuckyWheelSlot,
  type ProductId,
  type SchoolFarmState,
  type VisitorRequest,
} from '../lib/schoolFarmEngine';
import { farmAudio, type FarmSfxType } from '../lib/farmAudioEngine';
import { IsometricFarmBoard, type FloatingFeedback } from '../components/games/IsometricFarmBoard';
import {
  FarmOwnerPortraitSvg,
  HayDayAchievementIcon,
  HayDayChatBubbleIcon,
  HayDayCoinIcon,
  HayDayFarmBookIcon,
  HayDayFriendsIcon,
  HayDayGemIcon,
  HayDayGiftBoxIcon,
  HayDayItemSprite,
  HayDayLevelStarBadge,
  HayDayMailIcon,
  HayDayMedallionButton,
  HayDayMusicIcon,
  HayDayNewspaperIcon,
  HayDayRegisterIcon,
  HayDaySpinWheelIcon,
  HayDayToolSprite,
  HayDayTruckIcon,
} from '../components/games/HayDayHudIcons';

interface SchoolFarmGameViewProps {
  lang: AppLanguage;
  currentUser: AuthUser | null;
  currentRole: UserRole;
  activeSchool: School;
  students: Student[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  homeworkSubmissions: HomeworkSubmission[];
  assignments: Assignment[];
  behaviorRecords: BehaviorRecord[];
  questions: QuizQuestion[];
  playerScores?: PlayerScore[];
  rewardItems?: RewardItem[];
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward?: (itemId: string, costGems: number) => void;
  onExit?: () => void;
}

type FarmModalKind =
  | 'market'
  | 'visitors'
  | 'quiz'
  | 'town'
  | 'guide'
  | 'chest'
  | 'character'
  | 'newspaper'
  | 'wheel'
  | 'achievements'
  | null;
type MarketSubTabKind = 'marketplace' | 'orders' | 'craft' | 'roadside' | 'shop' | 'barn';

const PRODUCTION_BUILDINGS = new Set<BuildingId>([
  'chicken_coop',
  'dairy_barn',
  'sheep_pen',
  'juice_stand',
  'windmill_bakery',
]);

const NpcPortrait: React.FC<{ npcId: VisitorRequest['npcId'] }> = ({ npcId }) => {
  const shirt =
    npcId === 'aunt_malee'
      ? '#ec4899'
      : npcId === 'uncle_somchai'
        ? '#0284c7'
        : npcId === 'teacher_dao'
          ? '#7c3aed'
          : '#10b981';
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-slate-800 border border-[var(--color-border)] shrink-0">
      <circle cx="24" cy="46" r="16" fill={shirt} />
      <circle cx="24" cy="21" r="10" fill="#fed7aa" stroke="#9a3412" strokeWidth="1.2" />
      <circle cx="20.5" cy="20" r="1.4" fill="#1e293b" />
      <circle cx="27.5" cy="20" r="1.4" fill="#1e293b" />
      <path d="M20.5 24.5 Q24 27 27.5 24.5" stroke="#9a3412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {npcId === 'aunt_malee' && <circle cx="24" cy="10" r="5" fill="#334155" />}
      {npcId === 'uncle_somchai' && (
        <>
          <ellipse cx="24" cy="13" rx="13" ry="3.6" fill="#f59e0b" stroke="#92400e" strokeWidth="1.2" />
          <path d="M16 12 Q24 4 32 12 Z" fill="#eab308" stroke="#92400e" strokeWidth="1" />
        </>
      )}
      {npcId === 'namsai' && (
        <>
          <path d="M14 19 Q24 9 34 19" stroke="#1e293b" strokeWidth="4" fill="none" />
          <circle cx="33" cy="14" r="3" fill="#f43f5e" />
        </>
      )}
      {npcId === 'teacher_dao' && (
        <>
          <rect x="17" y="18" width="6" height="4.5" rx="1.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <rect x="25" y="18" width="6" height="4.5" rx="1.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="23" y1="20" x2="25" y2="20" stroke="#1e293b" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
};

const FALLBACK_BOOST_QUESTIONS: QuizQuestion[] = [
  {
    id: 'farm-q1',
    subject: 'วิทยาศาสตร์',
    gradeLevel: 'ทั่วไป',
    questionTh: 'พืชใช้กระบวนการใดในการสร้างอาหารด้วยแสงแดด น้ำ และแก๊สคาร์บอนไดออกไซด์?',
    questionEn: 'Which process do plants use to make food from sunlight, water, and CO2?',
    options: ['การสังเคราะห์ด้วยแสง', 'การหายใจระดับเซลล์', 'การคายน้ำ', 'การงอกของเมล็ด'],
    correctIndex: 0,
    explanationTh: 'การสังเคราะห์ด้วยแสง (Photosynthesis) เปลี่ยนพลังงานแสงเป็นน้ำตาลและออกซิเจน',
    category: 'review',
    points: 10,
  },
  {
    id: 'farm-q2',
    subject: 'คณิตศาสตร์',
    gradeLevel: 'ทั่วไป',
    questionTh: 'หากเก็บสตรอว์เบอร์รีได้ 6 ตะกร้า ตะกร้าละ 12 ผล จะมีสตรอว์เบอร์รีทั้งหมดกี่ผล?',
    questionEn: 'If you harvest 6 baskets with 12 strawberries each, how many in total?',
    options: ['64 ผล', '72 ผล', '78 ผล', '84 ผล'],
    correctIndex: 1,
    explanationTh: '6 × 12 = 72 ผล',
    category: 'review',
    points: 10,
  },
  {
    id: 'farm-q3',
    subject: 'สังคมศึกษา',
    gradeLevel: 'ทั่วไป',
    questionTh: 'หลักปรัชญาของเศรษฐกิจพอเพียงเน้น 3 ห่วง 2 เงื่อนไข ข้อใดคือ 2 เงื่อนไขสำคัญ?',
    questionEn: 'What are the two core conditions of Sufficiency Economy philosophy?',
    options: ['ความมั่งคั่งและโชคลาภ', 'ความรู้และคุณธรรม', 'ความเร็วและปริมาณ', 'การแข่งขันและกำไร'],
    correctIndex: 1,
    explanationTh: '2 เงื่อนไขสำคัญคือ เงื่อนไขความรู้ และเงื่อนไขคุณธรรม',
    category: 'review',
    points: 10,
  },
];

const playFarmChime = (type: FarmSfxType, muted: boolean) => {
  if (muted) return;
  farmAudio.playSfx(type);
};

const getGrowthStageLabel = (progress: number, watersNeeded: number, lang: AppLanguage): string => {
  if (progress >= watersNeeded) return lang === 'th' ? 'พร้อมเก็บเกี่ยว' : 'Ready to Harvest';
  const ratio = progress / Math.max(1, watersNeeded);
  if (ratio <= 0) return lang === 'th' ? 'หว่านเมล็ดแล้ว' : 'Seedling Stage';
  if (ratio < 0.5) return lang === 'th' ? 'ต้นกล้ากำลังโต' : 'Sprout Stage';
  return lang === 'th' ? 'ออกดอกผลิบาน' : 'Flowering Stage';
};

export const SchoolFarmGameView: React.FC<SchoolFarmGameViewProps> = ({
  lang,
  currentUser,
  currentRole,
  activeSchool,
  students,
  attendance,
  periodAttendance,
  homeworkSubmissions,
  assignments,
  behaviorRecords,
  questions,
  playerScores = [],
  rewardItems = [],
  onEarnRewards,
  onRedeemReward,
  onExit,
}) => {
  const schoolId = activeSchool.id || 'default-school';
  const userId = currentUser?.id || 'guest-farmer';
  const matchedStudent = useMemo(() => resolveStudentForUser(currentUser, students), [currentUser, students]);
  const ownerName =
    (matchedStudent ? `${matchedStudent.firstNameTh} ${matchedStudent.lastNameTh}` : '') ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    'นักเรียน';
  const ownerRoom = matchedStudent ? `${matchedStudent.gradeLevel} ${matchedStudent.room}` : undefined;
  const todayDate = getTodayBangkokDate();
  const isStaff = ['super_admin', 'admin', 'teacher'].includes(currentRole);

  const [farmState, setFarmState] = useState<SchoolFarmState>(() => {
    const saved = loadSchoolFarmState<Partial<SchoolFarmState>>(schoolId, userId);
    const normalized = normalizeFarmState(saved, {
      schoolId,
      userId,
      studentId: matchedStudent?.id || currentUser?.studentRecordId,
      ownerName,
      ownerRoom,
    });
    return resetDailyWaterFlagsIfNeeded(normalized, todayDate);
  });

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissedPortraitHint, setDismissedPortraitHint] = useState(false);

  const [activeTool, setActiveTool] = useState<FarmTool>('inspect');
  const [selectedCropId, setSelectedCropId] = useState<CropId>('corn');
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId>('chicken_coop');
  const [buildCategoryFilter, setBuildCategoryFilter] = useState<'all' | 'production' | 'landmark' | 'decor'>('all');
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<FarmModalKind>(null);
  const [marketSubTab, setMarketSubTab] = useState<MarketSubTabKind>('marketplace');
  const [focusBuildingId, setFocusBuildingId] = useState<BuildingId | null>(null);
  const [truckAnimating, setTruckAnimating] = useState(false);
  const [roadsideItemKey, setRoadsideItemKey] = useState<string>('crop:corn');
  const [roadsideQty, setRoadsideQty] = useState<number>(1);
  const [roadsidePrice, setRoadsidePrice] = useState<number>(35);
  const [feedbacks, setFeedbacks] = useState<FloatingFeedback[]>([]);
  const [neighborSyncTick, setNeighborSyncTick] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [visitingNeighbor, setVisitingNeighbor] = useState<SchoolFarmState | null>(null);
  const [isEditingFarmName, setIsEditingFarmName] = useState(false);
  const [farmNameDraft, setFarmNameDraft] = useState('');
  const [farmerTileIndex, setFarmerTileIndex] = useState<number | null>(null);
  const [charDraft, setCharDraft] = useState<FarmOwnerCharacter>(() => farmState.ownerCharacter);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelWonSlot, setWheelWonSlot] = useState<LuckyWheelSlot | null>(null);

  const openCharacterModal = () => {
    setCharDraft(farmState.ownerCharacter);
    farmAudio.playSfx('open');
    setActiveModal('character');
  };

  const openModalWithSfx = (kind: FarmModalKind) => {
    farmAudio.playSfx(kind ? 'open' : 'close');
    setActiveModal(kind);
  };

  // Sync audio muted state & clean up BGM on unmount
  useEffect(() => {
    farmAudio.setMutedState(farmState.soundMuted, farmState.musicMuted);
  }, [farmState.soundMuted, farmState.musicMuted]);

  useEffect(() => {
    return () => {
      farmAudio.stopMusic();
    };
  }, []);

  const feedbackSeqRef = useRef(1);
  const rootContainerRef = useRef<HTMLDivElement | null>(null);

  // Detect portrait viewport on mobile to nudge landscape play like Hay Day
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      setIsPortraitMobile(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const requestLandscapeFullscreen = async () => {
    setIsFullscreen(true);
    try {
      const targetEl = rootContainerRef.current || document.documentElement;
      if (!document.fullscreenElement && targetEl.requestFullscreen) {
        await targetEl.requestFullscreen();
      }
      const orientationObj = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> } | undefined;
      if (orientationObj?.lock) {
        await orientationObj.lock('landscape').catch(() => undefined);
      }
    } catch {
      // Ignore fullscreen / orientation lock restrictions in embedded browsers
    }
  };

  // Re-load when user/school changes or Supabase hydrates
  useEffect(() => {
    const hydrateFromStore = () => {
      const saved = loadSchoolFarmState<Partial<SchoolFarmState>>(schoolId, userId);
      const normalized = normalizeFarmState(saved, {
        schoolId,
        userId,
        studentId: matchedStudent?.id || currentUser?.studentRecordId,
        ownerName,
        ownerRoom,
      });
      setFarmState(resetDailyWaterFlagsIfNeeded(normalized, getTodayBangkokDate()));
      setNeighborSyncTick((t) => t + 1);
    };
    hydrateFromStore();
    window.addEventListener(CAMPUS_DATA_UPDATED_EVENT, hydrateFromStore);
    return () => window.removeEventListener(CAMPUS_DATA_UPDATED_EVENT, hydrateFromStore);
  }, [schoolId, userId, matchedStudent?.id, currentUser?.studentRecordId, ownerName, ownerRoom]);

  const persistFarm = (nextState: SchoolFarmState) => {
    const prevLv = getTownLevelFromXp(farmState.farmXp).level;
    const nextLv = getTownLevelFromXp(nextState.farmXp).level;
    setFarmState(nextState);
    saveSchoolFarmState(schoolId, userId, nextState, nextState.studentId);
    setNeighborSyncTick((t) => t + 1);
    if (nextLv > prevLv) {
      farmAudio.playSfx('levelUp');
      emitAppToast({
        title: lang === 'th' ? `🎉 อัปเลเวลฟาร์มเป็น Lv.${nextLv}!` : `Farm Level Up: Lv.${nextLv}!`,
        message: lang === 'th' ? 'ปลดล็อกพืชผลและอาคารใหม่ในร้านค้าแล้ว' : 'New crops & town buildings unlocked!',
        tone: 'success',
      });
    }
  };

  const disciplineSummary = useMemo(
    () =>
      computeDisciplineChestSummary({
        farmState,
        currentUser,
        students,
        attendance,
        periodAttendance,
        homeworkSubmissions,
        assignments,
        behaviorRecords,
        todayDate,
      }),
    [farmState, currentUser, students, attendance, periodAttendance, homeworkSubmissions, assignments, behaviorRecords, todayDate]
  );

  // Sync any new unresolved demerits onto empty farm plots gently
  useEffect(() => {
    if (disciplineSummary.unresolvedDemerits.length === 0) return;
    const synced = syncBehaviorWeedsOntoFarm(farmState, disciplineSummary.unresolvedDemerits);
    if (synced !== farmState) {
      persistFarm(synced);
    }
  }, [disciplineSummary.unresolvedDemerits]);

  const townLevelInfo = useMemo(() => getTownLevelFromXp(farmState.farmXp), [farmState.farmXp]);
  const prosperityScore = useMemo(() => calculateTownProsperity(farmState), [farmState]);
  const sellMultiplier = useMemo(() => getCropSellMultiplier(farmState), [farmState]);
  const gridSize = useMemo(() => getFarmGridSize(farmState), [farmState]);

  const currentPlayerScore = useMemo(
    () =>
      playerScores.find(
        (p) =>
          p.userId === userId ||
          (matchedStudent && (p.studentId === matchedStudent.id || p.userId === matchedStudent.id))
      ),
    [playerScores, userId, matchedStudent]
  );
  const playerGems = currentPlayerScore?.gems ?? 0;
  const hasGoldenStreakBuff = Boolean(
    (farmState.goldenFertilizerStatus?.speedMultiplier || 1) >= 2 || disciplineSummary.goldenStreakUnlocked
  );

  const neighbors = useMemo(() => {
    void neighborSyncTick;
    const rawList = listSchoolFarmSnapshots<Partial<SchoolFarmState>>(schoolId);
    const parsed = rawList.map((raw) =>
      normalizeFarmState(raw, {
        schoolId,
        userId: raw.userId || 'neighbor',
        studentId: raw.studentId,
        ownerName: raw.ownerName || 'เพื่อนร่วมโรงเรียน',
        ownerRoom: raw.ownerRoom,
      })
    );
    return parsed.sort((a, b) => calculateTownProsperity(b) - calculateTownProsperity(a));
  }, [schoolId, neighborSyncTick]);

  const pushFeedback = (tileIndex: number, text: string, tone: FloatingFeedback['tone'] = 'emerald') => {
    const id = feedbackSeqRef.current;
    feedbackSeqRef.current += 1;
    setFeedbacks((prev) => [...prev.slice(-4), { id, tileIndex, text, tone }]);
    setTimeout(() => {
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  const handleClaimDisciplineChest = () => {
    if (!disciplineSummary.hasAnythingToClaim) {
      emitAppToast({
        title: lang === 'th' ? 'รับเสบียงของวันนี้ครบแล้ว' : 'Today’s supplies already claimed',
        message: lang === 'th' ? 'เช็กชื่อ ส่งการบ้าน หรือสะสมความดีเพิ่มเพื่อเปิดกล่องรอบถัดไป' : 'Check in, submit homework, or earn merits for more supplies.',
        tone: 'info',
      });
      return;
    }
    const next = claimDisciplineSupplies(farmState, disciplineSummary);
    persistFarm(next);
    playFarmChime('harvest', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 15, disciplineSummary.claimableStars > 0 ? 1 : 0, true);
    }
    const bpText = disciplineSummary.claimableBlueprints.length > 0
      ? ` · 📐 พิมพ์เขียว ${BUILDING_MAP[disciplineSummary.claimableBlueprints[0]].nameTh}`
      : '';
    emitAppToast({
      title: lang === 'th' ? 'เปิดกล่องเสบียงวินัยสำเร็จ!' : 'Discipline Chest Claimed!',
      message: `💧 +${disciplineSummary.claimableWater} · 🌱ปุ๋ย +${disciplineSummary.claimableDailyFertilizer} · ✨ปุ๋ยทอง +${disciplineSummary.claimableFertilizer} · ⭐ +${disciplineSummary.claimableStars}${bpText}`,
      tone: 'success',
    });
  };

  const executeTileAction = (tileIndex: number, overrideTool?: FarmTool) => {
    setSelectedTileIndex(tileIndex);
    setFarmerTileIndex(tileIndex);
    const tile = farmState.tiles[tileIndex];
    if (!tile) return;

    let toolToRun: FarmTool = overrideTool || activeTool;
    if (toolToRun === 'inspect') {
      if (!tile.unlocked) {
        toolToRun = 'unlock';
      } else if (tile.kind === 'weed') {
        toolToRun = 'clear_weed';
      } else if (tile.kind === 'building') {
        const def = tile.buildingId ? BUILDING_MAP[tile.buildingId] : null;
        if (def && (def.dailyCoins > 0 || def.dailyFertilizer) && tile.lastCollectedDate !== todayDate) {
          const collected = collectBuildingYield(farmState, tileIndex, todayDate);
          if (collected.ok) {
            persistFarm(collected.state);
            playFarmChime('coin', farmState.soundMuted);
            pushFeedback(
              tileIndex,
              collected.fertilizerEarned > 0
                ? `+${collected.coinsEarned}🪙 +${collected.fertilizerEarned}✨`
                : `+${collected.coinsEarned}🪙`,
              'amber'
            );
            return;
          }
        }
        if (tile.buildingId === 'farm_cottage') {
          farmAudio.playSfx('open');
          setActiveModal('achievements');
          return;
        }
        if (tile.buildingId === 'chicken_coop') farmAudio.playSfx('chicken');
        else if (tile.buildingId === 'dairy_barn') farmAudio.playSfx('cow');
        else if (tile.buildingId === 'sheep_pen') farmAudio.playSfx('sheep');
        if (tile.buildingId && PRODUCTION_BUILDINGS.has(tile.buildingId)) {
          setFocusBuildingId(tile.buildingId);
          setMarketSubTab('craft');
          setActiveModal('market');
        }
        return;
      } else if (tile.kind === 'crop' && tile.cropId) {
        const def = CROP_MAP[tile.cropId];
        toolToRun = (tile.growthProgress || 0) >= def.watersNeeded ? 'harvest' : 'water';
      } else if (tile.kind === 'empty') {
        if (!tile.tilled) {
          toolToRun = 'till';
        } else if ((farmState.seeds[selectedCropId] || 0) > 0) {
          toolToRun = 'plant';
        } else {
          return;
        }
      }
    }

    if (toolToRun === 'till') {
      const res = tillPlotTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ขุดแปลงไม่สำเร็จ' : 'Cannot till', message: res.errorTh || 'ขุดแปลงไม่สำเร็จ', tone: 'info' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('till', farmState.soundMuted);
      pushFeedback(tileIndex, 'ขุดดินแล้ว +2 XP', 'emerald');
      return;
    }

    if (toolToRun === 'plant') {
      const res = plantCropOnTile(farmState, tileIndex, selectedCropId);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ปลูกไม่สำเร็จ' : 'Cannot plant', message: res.errorTh || 'ปลูกไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('plant', farmState.soundMuted);
      pushFeedback(tileIndex, `ปลูก${CROP_MAP[selectedCropId].nameTh}`, 'emerald');
      return;
    }

    if (toolToRun === 'water') {
      const res = waterTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'รดน้ำไม่สำเร็จ' : 'Cannot water', message: res.errorTh || 'รดน้ำไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('water', farmState.soundMuted);
      pushFeedback(
        tileIndex,
        res.matured ? 'สุกพร้อมเก็บ!' : hasGoldenStreakBuff ? 'รดน้ำ ×2 โตไว!' : 'รดน้ำ +1 💧',
        hasGoldenStreakBuff ? 'amber' : 'sky'
      );
      return;
    }

    if (toolToRun === 'daily_fertilize') {
      const res = applyDailyFertilizerTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ใส่ปุ๋ยไม่สำเร็จ' : 'Cannot fertilize', message: res.errorTh || 'ใส่ปุ๋ยไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('plant', farmState.soundMuted);
      pushFeedback(tileIndex, res.matured ? 'สุกพร้อมเก็บ!' : 'เร่งโต +1 ระยะ 🌱', 'emerald');
      return;
    }

    if (toolToRun === 'fertilize') {
      const res = fertilizeTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ใส่ปุ๋ยทองคำไม่สำเร็จ' : 'Cannot fertilize', message: res.errorTh || 'ใส่ปุ๋ยทองคำไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('harvest', farmState.soundMuted);
      pushFeedback(tileIndex, 'โตเต็มที่ ×2 ✨', 'amber');
      return;
    }

    if (toolToRun === 'harvest') {
      const res = harvestTile(farmState, tileIndex);
      if (!res.ok || !res.cropId) {
        emitAppToast({ title: lang === 'th' ? 'เก็บเกี่ยวไม่สำเร็จ' : 'Cannot harvest', message: res.errorTh || 'เก็บเกี่ยวไม่สำเร็จ', tone: 'info' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('harvest', farmState.soundMuted);
      pushFeedback(tileIndex, `+${res.harvestedQty} ${CROP_MAP[res.cropId].nameTh}`, 'emerald');
      if (onEarnRewards && currentUser?.id) {
        onEarnRewards(currentUser.id, res.xpEarned || 10, 0, false);
      }
      return;
    }

    if (toolToRun === 'clear_weed') {
      const res = clearWeedOnTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ปราบวัชพืชไม่สำเร็จ' : 'Cannot clear weed', message: res.errorTh || 'ปราบวัชพืชไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('weed', farmState.soundMuted);
      pushFeedback(tileIndex, 'ฟื้นฟูแปลงสะอาด!', 'emerald');
      return;
    }

    if (toolToRun === 'unlock') {
      const res = unlockPlotTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ยังปลดล็อกไม่ได้' : 'Cannot unlock plot', message: res.errorTh || 'ยังปลดล็อกไม่ได้', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('build', farmState.soundMuted);
      pushFeedback(tileIndex, `ขยายแปลง (-${res.costStars}★)`, 'amber');
      return;
    }

    if (toolToRun === 'build') {
      const res = constructBuildingOnTile(farmState, tileIndex, selectedBuildingId);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'สร้างสิ่งปลูกสร้างไม่สำเร็จ' : 'Cannot build', message: res.errorTh || 'สร้างสิ่งปลูกสร้างไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('build', farmState.soundMuted);
      pushFeedback(tileIndex, `สร้าง${BUILDING_MAP[selectedBuildingId].nameTh}!`, 'amber');
      if (onEarnRewards && currentUser?.id) {
        onEarnRewards(currentUser.id, 30, 1, true);
      }
    }
  };

  const handleUpgradeBuilding = (tileIndex: number) => {
    const res = upgradeBuildingOnTile(farmState, tileIndex);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'อัปเกรดไม่สำเร็จ' : 'Cannot upgrade', message: res.errorTh || 'อัปเกรดไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('build', farmState.soundMuted);
    pushFeedback(tileIndex, `อัปเกรด Lv.${res.newLevel}!`, 'amber');
  };

  const handleRemoveBuilding = (tileIndex: number) => {
    const res = removeBuildingOnTile(farmState, tileIndex);
    if (!res.ok) return;
    persistFarm(res.state);
    playFarmChime('till', farmState.soundMuted);
    pushFeedback(tileIndex, 'รื้อถอนคืนเหรียญ', 'rose');
  };

  const handleExpandTo8x8 = () => {
    const res = expandFarmGridTo8x8(farmState);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ยังขยายเมือง 8×8 ไม่ได้' : 'Cannot expand to 8x8', message: res.errorTh || 'ยังขยายเมืองไม่ได้', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    setSelectedTileIndex(null);
    playFarmChime('build', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? 'ขยายเมืองเกษตรเป็น 8×8 ช่องสำเร็จ!' : 'Farm Expanded to 8×8!',
      message: lang === 'th' ? 'ปลดล็อกวงแหวนที่ดินรอบใหม่เรียบร้อย' : 'New outer perimeter land ring added.',
      tone: 'success',
    });
  };

  const handleFulfillOrder = (orderId: string) => {
    const res = fulfillMarketOrder(farmState, orderId);
    if (!res.ok || !res.order) {
      emitAppToast({ title: lang === 'th' ? 'ส่งออเดอร์ไม่สำเร็จ' : 'Order incomplete', message: res.errorTh || 'ส่งออเดอร์ไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    setTruckAnimating(true);
    setTimeout(() => setTruckAnimating(false), 1150);
    playFarmChime('truck', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.order.rewardXp, res.order.rewardGems, true);
    }
    emitAppToast({
      title: lang === 'th' ? 'รถบรรทุกส่งออเดอร์สำเร็จ!' : 'Truck Delivery Complete!',
      message: `+${res.order.rewardCoins} 🪙 · +1 ⭐ · +${res.order.rewardGems} 💎`,
      tone: 'success',
    });
  };

  const handleCraftProduct = (productId: ProductId) => {
    const res = craftProductOnFarm(farmState, productId);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'แปรรูปไม่สำเร็จ' : 'Cannot craft', message: res.errorTh || 'วัตถุดิบไม่พอ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('build', farmState.soundMuted);
    const prod = PRODUCT_MAP[productId];
    emitAppToast({
      title: lang === 'th' ? `ผลิต ${prod.nameTh} สำเร็จ!` : `Crafted ${prod.nameEn}`,
      message: `+1 ${prod.nameTh} · +${prod.xpReward} XP`,
      tone: 'success',
    });
  };

  const handleFulfillVisitor = (visitorId: string) => {
    const res = fulfillVisitorRequest(farmState, visitorId, todayDate);
    if (!res.ok || !res.visitor) {
      emitAppToast({ title: lang === 'th' ? 'ยังขายให้ชาวบ้านไม่ได้' : 'Cannot serve visitor', message: res.errorTh || 'สินค้าไม่พอ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    const gemReward = res.visitor.rewardGems ?? 2;
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.visitor.rewardXp, gemReward, true);
    }
    emitAppToast({
      title: lang === 'th' ? `ขายให้ ${res.visitor.nameTh.split(' ')[0]} แล้ว!` : 'Visitor Served!',
      message: `+${res.visitor.rewardCoins} 🪙 · +${res.visitor.rewardXp} XP · +${gemReward} 💎`,
      tone: 'success',
    });
  };

  const handleDismissVisitor = (visitorId: string) => {
    persistFarm(dismissVisitorRequest(farmState, visitorId));
    playFarmChime('till', farmState.soundMuted);
  };

  const handleExchangeCoinsForGems = (coinCost = 50, gemGain = 10) => {
    const res = convertFarmCoinsToGems(farmState, coinCost, gemGain);
    if (!res.ok) {
      emitAppToast({
        title: lang === 'th' ? 'เหรียญฟาร์มยังไม่พอ' : 'Not enough coins',
        message: res.errorTh || `ต้องการ ${coinCost}🪙`,
        tone: 'warning',
      });
      return;
    }
    persistFarm(res.state);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 10, gemGain, false);
    }
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? 'แลกเพชรตลาดกลางสำเร็จ!' : 'Coins Exchanged for Gems!',
      message: `-${coinCost} 🪙 → +${gemGain} 💎`,
      tone: 'success',
    });
  };

  const handleRedeemClassroomReward = (item: RewardItem) => {
    if (item.stock <= 0) {
      emitAppToast({
        title: lang === 'th' ? 'ของรางวัลหมดสต็อก' : 'Out of stock',
        message: lang === 'th' ? 'กรุณารอคุณครูเติมคลังไอเทมรางวัล' : 'Please wait for teacher restock.',
        tone: 'warning',
      });
      return;
    }
    if (playerGems < item.costGems) {
      emitAppToast({
        title: lang === 'th' ? 'เพชร 💎 ยังไม่พอแลก' : 'Not enough Gems',
        message: lang === 'th'
          ? `ขายผลผลิตให้ชาวบ้านรายวัน หรือแลก 50🪙 → +10💎 เพื่อสะสมให้ครบ ${item.costGems}💎`
          : `Need ${item.costGems} Gems`,
        tone: 'warning',
      });
      return;
    }
    if (onRedeemReward) {
      onRedeemReward(item.id, item.costGems);
    }
    const nextHistory = [
      {
        rewardId: item.id,
        titleTh: item.titleTh,
        costCoins: item.costGems,
        redeemedAt: new Date().toISOString(),
      },
      ...(farmState.claimedMarketplaceRewards || []).slice(0, 19),
    ];
    persistFarm({
      ...farmState,
      claimedMarketplaceRewards: nextHistory,
      updatedAt: new Date().toISOString(),
    });
    playFarmChime('harvest', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? `แลก "${item.titleTh}" ในตลาดกลางสำเร็จ!` : `Redeemed ${item.titleTh}!`,
      message: lang === 'th'
        ? `ส่งคำขอให้คุณครูตรวจอนุมัติแล้ว (-${item.costGems} 💎)`
        : `Sent to teacher queue (-${item.costGems} Gems)`,
      tone: 'success',
    });
  };

  const handleListRoadsideItem = () => {
    const [kindRaw, idRaw] = roadsideItemKey.split(':');
    const itemKind = kindRaw === 'product' ? 'product' : 'crop';
    const itemId = idRaw as CropId | ProductId;
    const res = listItemInRoadsideShop(farmState, itemKind, itemId, roadsideQty, roadsidePrice);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'วางขายไม่สำเร็จ' : 'Cannot list item', message: res.errorTh || 'วางขายไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? 'วางขายบนแผงลอยริมทางแล้ว!' : 'Listed in Roadside Shop',
      message: `${roadsideQty} ชิ้น · ราคา ${roadsidePrice} 🪙`,
      tone: 'success',
    });
  };

  const handleBuyFromNeighborShop = (neighbor: SchoolFarmState, listingId: string) => {
    const res = buyFromNeighborRoadsideShop(farmState, neighbor, listingId);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ซื้อสินค้าไม่สำเร็จ' : 'Purchase failed', message: res.errorTh || 'ซื้อสินค้าไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.buyerState);
    saveSchoolFarmState(schoolId, neighbor.userId, res.sellerState, neighbor.studentId);
    setVisitingNeighbor(res.sellerState);
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? `ซื้อสินค้าจากร้านของ ${neighbor.ownerName} สำเร็จ!` : 'Purchased from Neighbor Shop!',
      message: lang === 'th' ? 'เก็บเข้าโรงนา/คลังสินค้าของคุณแล้ว (+8 XP)' : 'Added to your inventory (+8 XP)',
      tone: 'success',
    });
  };

  const handleBuySeed = (cropId: CropId) => {
    const res = buySeedPack(farmState, cropId, 1);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ซื้อเมล็ดไม่สำเร็จ' : 'Cannot buy seed', message: res.errorTh || 'ซื้อเมล็ดไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
  };

  const handleSellBarn = (cropId: CropId) => {
    const res = sellCropFromBarn(farmState, cropId, 1);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ขายผลผลิตไม่สำเร็จ' : 'Cannot sell crop', message: res.errorTh || 'ขายผลผลิตไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 6, 0, false);
    }
    emitAppToast({
      title: lang === 'th' ? `ขาย ${CROP_MAP[cropId].nameTh} แล้ว` : 'Crop Sold',
      message: `+${res.coinsEarned} 🪙 · +6 XP`,
      tone: 'success',
    });
  };

  const quizPool = questions.length > 0 ? questions : FALLBACK_BOOST_QUESTIONS;
  const activeQuestion = quizPool[quizIndex % quizPool.length];
  const quizUsedToday = farmState.lastQuizBoostDate === todayDate ? farmState.quizBoostCountToday : 0;

  const handleAnswerBoostQuiz = (choiceIdx: number) => {
    if (quizPicked !== null) return;
    setQuizPicked(choiceIdx);
    const isCorrect = choiceIdx === activeQuestion.correctIndex;
    if (isCorrect) {
      const res = applyQuizBoostReward(farmState, todayDate);
      if (res.ok) {
        persistFarm(res.state);
        playFarmChime('harvest', farmState.soundMuted);
        if (onEarnRewards && currentUser?.id) {
          onEarnRewards(currentUser.id, 15, 1, true);
        }
        emitAppToast({
          title: lang === 'th' ? 'ตอบถูก! รับปุ๋ยและน้ำเพิ่มแล้ว' : 'Correct! Supplies Added',
          message: '💧 +2 · ✨ +1 · 🪙 +18',
          tone: 'success',
        });
      } else {
        emitAppToast({ title: lang === 'th' ? 'ครบโควตาวันนี้แล้ว' : 'Daily cap reached', message: res.errorTh || 'ครบโควตาวันนี้แล้ว', tone: 'info' });
      }
    } else {
      playFarmChime('weed', farmState.soundMuted);
    }
  };

  const handleHelpNeighbor = (neighbor: SchoolFarmState, targetTileIndex?: number) => {
    const res = helpNeighborFarm(farmState, neighbor, todayDate, targetTileIndex);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ช่วยรดน้ำไม่สำเร็จ' : 'Cannot help', message: res.errorTh || 'ช่วยรดน้ำไม่สำเร็จ', tone: 'info' });
      return;
    }
    persistFarm(res.helperState);
    saveSchoolFarmState(schoolId, neighbor.userId, res.neighborState, neighbor.studentId);
    setVisitingNeighbor(res.neighborState);
    playFarmChime('water', farmState.soundMuted);
    emitAppToast({
      title: res.wateredCropTile
        ? (lang === 'th' ? `ช่วยรดน้ำต้นไม้ให้ ${neighbor.ownerName} แล้ว!` : 'Watered friend’s crop!')
        : (lang === 'th' ? `ช่วยรดน้ำฟาร์มของ ${neighbor.ownerName} แล้ว!` : 'Helped neighbor farm!'),
      message: lang === 'th' ? 'เพื่อนได้ +2 💧 · +10 🪙 และคุณได้ +15 🪙 · +12 XP' : 'Friend +2 water & you +15 coins',
      tone: 'success',
    });
  };

  const handleTeacherSendGift = (neighbor: SchoolFarmState) => {
    const gifted = grantTeacherBonusToFarm(neighbor, { water: 3, fertilizer: 2, stars: 1, coins: 30 });
    saveSchoolFarmState(schoolId, neighbor.userId, gifted, neighbor.studentId);
    if (visitingNeighbor?.userId === neighbor.userId) {
      setVisitingNeighbor(gifted);
    }
    setNeighborSyncTick((t) => t + 1);
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? `ส่งกล่องกำลังใจจากครูให้ ${neighbor.ownerName} แล้ว` : 'Teacher bonus sent!',
      message: '💧 +3 · ✨ +2 · ⭐ +1 · 🪙 +30',
      tone: 'success',
    });
  };

  const selectedTile = selectedTileIndex !== null ? farmState.tiles[selectedTileIndex] : null;
  const totalBarnItems = (Object.values(farmState.barn) as number[]).reduce((a, b) => a + b, 0);
  const totalGoodsItems = (Object.values(farmState.goods || {}) as number[]).reduce((a, b) => a + b, 0);
  const activeRoadsideCount = (farmState.roadsideShop || []).filter((l) => !l.sold).length;
  const weedCount = farmState.tiles.filter((t) => t.kind === 'weed').length;
  const readyCropCount = farmState.tiles.filter(
    (t) => t.kind === 'crop' && t.cropId && (t.growthProgress || 0) >= CROP_MAP[t.cropId].watersNeeded
  ).length;
  const readyBuildingCount = farmState.tiles.filter((t) => {
    if (t.kind !== 'building' || !t.buildingId) return false;
    const def = BUILDING_MAP[t.buildingId];
    return Boolean(def && (def.dailyCoins > 0 || def.dailyFertilizer) && t.lastCollectedDate !== todayDate);
  }).length;

  const dailyDirtAds = useMemo(
    () => generateDailyDirtListings(userId, neighbors, todayDate),
    [userId, neighbors, todayDate]
  );
  const achievementsList = useMemo(() => getFarmAchievementProgress(farmState), [farmState]);
  const unclaimedAchievementCount = achievementsList.filter((a) => a.completed && !a.claimed).length;
  const spinAvailable = farmState.lastSpinWheelDate !== todayDate;

  const handleSpinWheel = () => {
    if (wheelSpinning) return;
    if (!spinAvailable) {
      emitAppToast({
        title: lang === 'th' ? 'หมุนวงล้อวันนี้ครบแล้ว' : 'Already spun today',
        message: lang === 'th' ? 'กลับมาลุ้นรับรางวัลใหม่ได้วันพรุ่งนี้นะ!' : 'Come back tomorrow for another spin!',
        tone: 'info',
      });
      return;
    }
    const res = spinDailyLuckyWheel(farmState, todayDate);
    if (!res.ok || !res.slot) return;
    setWheelSpinning(true);
    setWheelWonSlot(null);
    const sliceAngle = 360 / LUCKY_WHEEL_REWARDS.length;
    const targetAngle = 360 * 5 + (360 - res.slotIndex * sliceAngle - sliceAngle / 2);
    setWheelAngle((prev) => prev + targetAngle);
    for (let i = 0; i < 12; i += 1) {
      setTimeout(() => farmAudio.playSfx('wheelTick'), i * 210);
    }
    setTimeout(() => {
      setWheelSpinning(false);
      setWheelWonSlot(res.slot || null);
      persistFarm(res.state);
      farmAudio.playSfx('gift');
      emitAppToast({
        title: lang === 'th' ? `วงล้อนำโชค: ได้รับ ${res.slot?.labelTh}!` : `Lucky Wheel: ${res.slot?.labelTh}!`,
        message: lang === 'th' ? 'ส่งเข้าคลังฟาร์มของคุณเรียบร้อยแล้ว' : 'Added to your farm inventory!',
        tone: 'success',
      });
    }, 2700);
  };

  const handleClaimAchievement = (achievementId: string) => {
    const res = claimFarmAchievement(farmState, achievementId);
    if (!res.ok || !res.achievement) {
      emitAppToast({ title: lang === 'th' ? 'รับรางวัลไม่ได้' : 'Cannot claim', message: res.errorTh || '', tone: 'info' });
      return;
    }
    persistFarm(res.state);
    farmAudio.playSfx('gift');
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.achievement.rewardXp, 2, true);
    }
    emitAppToast({
      title: lang === 'th' ? `สำเร็จ: ${res.achievement.titleTh}!` : 'Achievement Claimed!',
      message: `+${res.achievement.rewardCoins} 🪙 · +${res.achievement.rewardStars} ★ · +${res.achievement.rewardXp} XP`,
      tone: 'success',
    });
  };

  const handleBuyDailyDirtAd = (ad: DailyDirtAd) => {
    if (ad.isNeighborListing && ad.listingId) {
      const seller = neighbors.find((n) => n.userId === ad.sellerUserId);
      if (seller) {
        handleBuyFromNeighborShop(seller, ad.listingId);
        return;
      }
    }
    const res = buyDailyDirtBargain(farmState, ad);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ซื้อไม่สำเร็จ' : 'Purchase failed', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    farmAudio.playSfx('coin');
    const itemName =
      ad.itemKind === 'crop'
        ? CROP_MAP[ad.itemId as CropId]?.nameTh
        : PRODUCT_MAP[ad.itemId as ProductId]?.nameTh;
    emitAppToast({
      title: lang === 'th' ? `ซื้อ ${itemName} ×${ad.quantity} จากหนังสือพิมพ์แล้ว!` : 'Bought from Daily Dirt!',
      message: `-${ad.priceCoins} 🪙 · +6 XP`,
      tone: 'success',
    });
  };

  const toolButtons: {
    id: FarmTool;
    labelTh: string;
    labelEn: string;
    badge?: number;
  }[] = [
    {
      id: 'inspect',
      labelTh: 'เลื่อน/แตะ',
      labelEn: 'Pan/Tap',
      badge: readyCropCount + readyBuildingCount > 0 ? readyCropCount + readyBuildingCount : undefined,
    },
    {
      id: 'harvest',
      labelTh: 'เคียวเกี่ยว',
      labelEn: 'Sickle',
      badge: readyCropCount > 0 ? readyCropCount : undefined,
    },
    {
      id: 'till',
      labelTh: 'ขุดดิน',
      labelEn: 'Till',
    },
    {
      id: 'plant',
      labelTh: 'ปลูกผัก',
      labelEn: 'Plant',
    },
    {
      id: 'water',
      labelTh: 'รดน้ำ',
      labelEn: 'Water',
      badge: farmState.water,
    },
    {
      id: 'daily_fertilize',
      labelTh: 'ปุ๋ยวัน',
      labelEn: 'Compost',
      badge: farmState.dailyFertilizer || 0,
    },
    {
      id: 'fertilize',
      labelTh: 'ปุ๋ยทอง×2',
      labelEn: 'Gold×2',
      badge: farmState.fertilizer,
    },
    {
      id: 'clear_weed',
      labelTh: 'วัชพืช',
      labelEn: 'Weed',
      badge: weedCount > 0 ? weedCount : undefined,
    },
    {
      id: 'build',
      labelTh: 'สร้าง',
      labelEn: 'Build',
    },
    {
      id: 'unlock',
      labelTh: 'ขยาย',
      labelEn: 'Expand',
    },
  ];

  const filteredBuildings = BUILDING_CATALOG.filter(
    (b) => buildCategoryFilter === 'all' || b.category === buildCategoryFilter
  );

  const wrapperClass = isFullscreen
    ? onExit
      ? `relative w-full h-full overflow-hidden select-none ${getModuleTone('school_farm')}`
      : `fixed inset-0 z-50 h-dvh w-full overflow-hidden select-none ${getModuleTone('school_farm')}`
    : `relative w-full h-[640px] rounded-2xl border border-[var(--color-border)] overflow-hidden select-none ${getModuleTone('school_farm')}`;

  const xpProgressPct = Math.min(
    100,
    Math.round((townLevelInfo.currentIntoLevel / Math.max(1, townLevelInfo.nextLevelNeed)) * 100)
  );

  return (
    <div
      ref={rootContainerRef}
      onPointerDownCapture={() => {
        farmAudio.unlockAndStartMusic(farmState.soundMuted, farmState.musicMuted);
      }}
      className={wrapperClass}
    >
      {/* FULL-SCREEN HAY DAY ISOMETRIC WORLD */}
      <IsometricFarmBoard
        tiles={farmState.tiles}
        selectedTileIndex={selectedTileIndex}
        activeTool={activeTool}
        todayDate={todayDate}
        farmName={farmState.farmName}
        ownerName={farmState.ownerName}
        ownerCharacter={farmState.ownerCharacter}
        farmerTileIndex={farmerTileIndex}
        fullscreenLandscape
        hasGoldenStreakBuff={hasGoldenStreakBuff}
        feedbacks={feedbacks}
        lang={lang}
        ordersCount={farmState.marketOrders.length}
        roadsideCount={activeRoadsideCount}
        visitors={farmState.visitorQueue}
        truckAnimating={truckAnimating}
        spinAvailable={spinAvailable}
        onTileActivate={(idx) => executeTileAction(idx)}
        onOpenMarket={() => {
          setFocusBuildingId(null);
          setMarketSubTab('orders');
          openModalWithSfx('market');
        }}
        onOpenShop={() => {
          setFocusBuildingId(null);
          setMarketSubTab('roadside');
          openModalWithSfx('market');
        }}
        onOpenVisitors={() => openModalWithSfx('visitors')}
        onOpenCharacter={openCharacterModal}
        onOpenWheel={() => openModalWithSfx('wheel')}
        onOpenBarn={() => {
          setFocusBuildingId(null);
          setMarketSubTab('barn');
          openModalWithSfx('market');
        }}
        onOpenMail={() => {
          setQuizPicked(null);
          openModalWithSfx('quiz');
        }}
        onAnimalTap={(kind) => {
          farmAudio.playSfx(kind);
          if (kind === 'duck') {
            emitAppToast({
              title: lang === 'th' ? 'ก้าบ ก้าบ! เป็ดน้อยกำลังว่ายน้ำ' : 'Quack! Ducks splashing in the pond',
              message: lang === 'th' ? 'บรรยากาศฟาร์มสดชื่นเต็มร้อย' : 'Sunny farm vibes!',
              tone: 'info',
            });
          }
        }}
      />

      {/* TOP-LEFT: HAY DAY BLUE STAR LEVEL BADGE + XP PROGRESS BAR + OWNER PORTRAIT + NAMEPLATE */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex items-center gap-1.5 max-w-[60vw] pointer-events-auto">
        <HayDayMedallionButton
          size="sm"
          onClick={() => {
            if (onExit) onExit();
            else setIsFullscreen((prev) => !prev);
          }}
          ariaLabel={onExit ? 'Exit Farm' : 'Toggle Fullscreen'}
          title={onExit ? (lang === 'th' ? 'กลับหน้าหลัก' : 'Exit') : isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}
        >
          {onExit ? (
            <ArrowLeft className="w-5 h-5 text-[#78350f]" strokeWidth={2.8} />
          ) : isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-[#78350f]" strokeWidth={2.6} />
          ) : (
            <Maximize2 className="w-5 h-5 text-[#78350f]" strokeWidth={2.6} />
          )}
        </HayDayMedallionButton>

        <button
          type="button"
          onClick={() => openModalWithSfx('achievements')}
          aria-label="Level and Achievements"
          className="relative flex items-center cursor-pointer active:scale-95 transition shrink-0"
        >
          <HayDayLevelStarBadge level={townLevelInfo.level} className="w-12 h-12 sm:w-14 sm:h-14 relative z-10" />
          <div className="hidden md:flex flex-col -ml-4 pl-5 pr-3 py-1 rounded-r-full bg-[#0f172a]/70 border-2 border-[#fbbf24] shadow">
            <div className="w-24 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-white/30">
              <div
                className="h-full bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#facc15]"
                style={{ width: `${xpProgressPct}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-amber-100 tabular-nums leading-tight mt-0.5">
              XP {townLevelInfo.currentIntoLevel}/{townLevelInfo.nextLevelNeed}
            </span>
          </div>
        </button>

        <HayDayMedallionButton
          size="md"
          onClick={openCharacterModal}
          ariaLabel={lang === 'th' ? 'ตัวละครเจ้าของฟาร์ม' : 'Farm Owner Character'}
          title={lang === 'th' ? 'แต่งตัวละครเจ้าของฟาร์ม' : 'Customize Farm Owner'}
        >
          <FarmOwnerPortraitSvg
            character={farmState.ownerCharacter}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full"
          />
        </HayDayMedallionButton>

        <div className="hidden sm:flex flex-col min-w-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[190px]">
              {farmState.farmName}
            </span>
            <button
              type="button"
              onClick={() => {
                setFarmNameDraft(farmState.farmName);
                setIsEditingFarmName(true);
              }}
              aria-label="Edit farm name"
              className="text-amber-200 hover:text-white cursor-pointer shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          {hasGoldenStreakBuff && (
            <span className="text-[10px] font-black text-yellow-300 whitespace-nowrap">
              ✨ ปุ๋ยทองโตไว ×2
            </span>
          )}
        </div>
      </div>

      {/* TOP-RIGHT: HAY DAY FLOATING OUTLINED COINS & GEMS + PURPLE GIFT + MUSIC & SFX CONTROLS */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex items-start gap-2 pointer-events-auto">
        <div className="flex flex-col items-end gap-0.5 select-none">
          <div className="flex items-center gap-1.5">
            <span
              className="text-base sm:text-xl font-black text-white tabular-nums tracking-tight"
              style={{ textShadow: '0 2px 3px rgba(0,0,0,0.9), 0 0 2px #000' }}
            >
              {farmState.coins.toLocaleString()}
            </span>
            <HayDayCoinIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-sm sm:text-lg font-black text-white tabular-nums tracking-tight"
              style={{ textShadow: '0 2px 3px rgba(0,0,0,0.9), 0 0 2px #000' }}
            >
              {playerGems.toLocaleString()}
            </span>
            <HayDayGemIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div
            className="hidden sm:flex items-center gap-2 text-[11px] font-black text-white tabular-nums pt-0.5"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          >
            <span>💧 {farmState.water}</span>
            <span>🌱 {farmState.dailyFertilizer || 0}</span>
            <span>✨ {farmState.fertilizer}</span>
            <span>★ {farmState.townStars}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <HayDayMedallionButton
            size="md"
            onClick={() => openModalWithSfx('chest')}
            ariaLabel={lang === 'th' ? 'กล่องเสบียงรางวัล' : 'Discipline Supply Gift'}
            pulseDot={disciplineSummary.hasAnythingToClaim}
          >
            <HayDayGiftBoxIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </HayDayMedallionButton>

          <HayDayMedallionButton
            size="sm"
            onClick={() => {
              const nextMuted = !farmState.musicMuted;
              persistFarm({ ...farmState, musicMuted: nextMuted });
              farmAudio.setMutedState(farmState.soundMuted, nextMuted);
              if (!nextMuted) farmAudio.playSfx('tap');
            }}
            ariaLabel={farmState.musicMuted ? 'Enable music' : 'Mute music'}
            title={farmState.musicMuted ? 'เปิดเพลงประกอบ' : 'ปิดเพลงประกอบ'}
          >
            <HayDayMusicIcon muted={farmState.musicMuted} className="w-4 h-4" />
          </HayDayMedallionButton>

          <HayDayMedallionButton
            size="sm"
            onClick={() => {
              const nextMuted = !farmState.soundMuted;
              persistFarm({ ...farmState, soundMuted: nextMuted });
              farmAudio.setMutedState(nextMuted, farmState.musicMuted);
              if (!nextMuted) farmAudio.playSfx('tap');
            }}
            ariaLabel={farmState.soundMuted ? 'Unmute SFX' : 'Mute SFX'}
            title={farmState.soundMuted ? 'เปิดเสียงประกอบ' : 'ปิดเสียงประกอบ'}
          >
            {farmState.soundMuted ? (
              <VolumeX className="w-4 h-4 text-[#78350f]" strokeWidth={2.6} />
            ) : (
              <Volume2 className="w-4 h-4 text-[#78350f]" strokeWidth={2.6} />
            )}
          </HayDayMedallionButton>

          <HayDayMedallionButton
            size="sm"
            onClick={() => openModalWithSfx('guide')}
            ariaLabel="Game Guide"
          >
            <HelpCircle className="w-4 h-4 text-[#78350f]" strokeWidth={2.6} />
          </HayDayMedallionButton>
        </div>
      </div>

      {/* NON-BLOCKING MOBILE PORTRAIT LANDSCAPE PROMPT */}
      {isPortraitMobile && !dismissedPortraitHint && (
        <div className="absolute top-16 inset-x-3 z-20 rounded-2xl border-2 border-[#f59e0b] bg-[#451a03]/92 text-amber-50 px-3 py-2 flex items-center justify-between gap-2 shadow-xl">
          <div className="flex items-center gap-2 min-w-0 text-[11px] font-bold">
            <RotateCw className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="truncate">หมุนโทรศัพท์แนวนอน เพื่อเล่นเมนูแบบ Hay Day เต็มตา</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void requestLandscapeFullscreen()}
              className="min-h-[32px] px-2.5 rounded-xl bg-amber-400 text-amber-950 text-[11px] font-black whitespace-nowrap cursor-pointer"
            >
              เต็มจอแนวนอน
            </button>
            <button
              type="button"
              onClick={() => setDismissedPortraitHint(true)}
              aria-label="Dismiss hint"
              className="min-w-[32px] min-h-[32px] rounded-xl bg-white/10 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* INLINE RENAME POPOVER */}
      {isEditingFarmName && (
        <div className="absolute top-16 left-3 z-30 rounded-2xl border-2 border-[#b45309] bg-[#fffbeb] p-2.5 shadow-xl flex items-center gap-2">
          <input
            type="text"
            maxLength={32}
            value={farmNameDraft}
            onChange={(e) => setFarmNameDraft(e.target.value)}
            placeholder="ตั้งชื่อเมืองฟาร์ม..."
            className="min-h-[36px] px-2.5 rounded-xl border border-[#d97706] bg-white text-xs text-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              const clean = farmNameDraft.trim();
              if (clean) {
                persistFarm({ ...farmState, farmName: clean, updatedAt: new Date().toISOString() });
              }
              setIsEditingFarmName(false);
            }}
            className="min-h-[36px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            บันทึก
          </button>
          <button
            type="button"
            onClick={() => setIsEditingFarmName(false)}
            className="min-h-[36px] px-2 rounded-xl text-xs text-slate-600 cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* LEFT-EDGE HAY DAY FLOATING GLOSSY MEDALLION STACK (Newspaper / Mail / Chat / Farm Book / Bottom-Left Cash Register) */}
      <div className="absolute left-2 sm:left-3.5 top-20 bottom-3 z-20 flex flex-col justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <HayDayMedallionButton
            size="md"
            onClick={() => openModalWithSfx('newspaper')}
            ariaLabel={lang === 'th' ? 'หนังสือพิมพ์ฟาร์ม Daily Dirt' : 'Daily Dirt Newspaper'}
            badgeCount={dailyDirtAds.length}
          >
            <HayDayNewspaperIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </HayDayMedallionButton>

          <HayDayMedallionButton
            size="md"
            onClick={() => {
              setQuizPicked(null);
              openModalWithSfx('quiz');
            }}
            ariaLabel={lang === 'th' ? 'จดหมายควิซรับน้ำฟรี' : 'Study Quiz Mail'}
            badgeCount={Math.max(0, 3 - quizUsedToday)}
          >
            <HayDayMailIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </HayDayMedallionButton>

          <HayDayMedallionButton
            size="md"
            onClick={() => openModalWithSfx('visitors')}
            ariaLabel={lang === 'th' ? 'ออเดอร์ชาวบ้านรายวัน' : 'Villager Orders'}
            badgeCount={farmState.visitorQueue.length}
          >
            <HayDayChatBubbleIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </HayDayMedallionButton>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <HayDayMedallionButton
            size="md"
            active={activeTool === 'build'}
            onClick={() => {
              farmAudio.playSfx('tap');
              setActiveTool((prev) => (prev === 'build' ? 'inspect' : 'build'));
            }}
            ariaLabel={lang === 'th' ? 'สมุดก่อสร้างฟาร์ม' : 'Farm Build Book'}
          >
            <HayDayFarmBookIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          </HayDayMedallionButton>

          <HayDayMedallionButton
            size="lg"
            onClick={() => {
              setFocusBuildingId(null);
              setMarketSubTab('marketplace');
              openModalWithSfx('market');
            }}
            ariaLabel={lang === 'th' ? 'ตลาดกลางห้องเรียน & ร้านเมล็ดพันธุ์' : 'Classroom Marketplace'}
            badgeCount={rewardItems.length > 0 ? rewardItems.length : undefined}
          >
            <HayDayRegisterIcon className="w-9 h-9 sm:w-10 sm:h-10" />
          </HayDayMedallionButton>
        </div>
      </div>

      {/* BOTTOM-RIGHT HAY DAY FLOATING GLOSSY MEDALLIONS (Achievements + Lucky Wheel + Truck + Friends Book) */}
      <div className="absolute right-2 sm:right-3.5 bottom-3 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <HayDayMedallionButton
          size="sm"
          onClick={() => openModalWithSfx('achievements')}
          ariaLabel={lang === 'th' ? 'ภารกิจบ้านความสำเร็จ' : 'Farmhouse Achievements'}
          badgeCount={unclaimedAchievementCount > 0 ? unclaimedAchievementCount : undefined}
        >
          <HayDayAchievementIcon className="w-6 h-6" />
        </HayDayMedallionButton>

        <HayDayMedallionButton
          size="md"
          onClick={() => openModalWithSfx('wheel')}
          ariaLabel={lang === 'th' ? 'วงล้อนำโชคประจำวัน' : 'Daily Lucky Spin Wheel'}
          pulseDot={spinAvailable}
        >
          <HayDaySpinWheelIcon className="w-7 h-7 sm:w-8 sm:h-8" />
        </HayDayMedallionButton>

        <HayDayMedallionButton
          size="md"
          onClick={() => {
            setFocusBuildingId(null);
            setMarketSubTab('orders');
            openModalWithSfx('market');
          }}
          ariaLabel={lang === 'th' ? 'รถบรรทุกส่งออเดอร์' : 'Delivery Truck Orders'}
          badgeCount={farmState.marketOrders.length}
        >
          <HayDayTruckIcon className="w-7 h-7 sm:w-8 sm:h-8" />
        </HayDayMedallionButton>

        <HayDayMedallionButton
          size="lg"
          onClick={() => {
            setVisitingNeighbor(null);
            openModalWithSfx('town');
          }}
          ariaLabel={lang === 'th' ? 'เพื่อนบ้านโรงเรียน' : 'School Neighbors'}
        >
          <HayDayFriendsIcon className="w-9 h-9 sm:w-10 sm:h-10" />
        </HayDayMedallionButton>
      </div>

      {/* FLOATING COMPACT SELECTED PLOT POPOVER */}
      {selectedTile && activeTool !== 'plant' && activeTool !== 'build' && (
        <div className="absolute bottom-[78px] right-20 z-20 w-[256px] rounded-2xl border-2 border-[#78350f] bg-[#fffbeb]/98 backdrop-blur-md p-2.5 shadow-[0_5px_0_#78350f,0_10px_20px_rgba(0,0,0,0.45)] space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-[#451a03] truncate">
              {!selectedTile.unlocked
                ? `แปลง #${selectedTile.index + 1} (ล็อก)`
                : selectedTile.kind === 'crop' && selectedTile.cropId
                  ? CROP_MAP[selectedTile.cropId].nameTh
                  : selectedTile.kind === 'building' && selectedTile.buildingId
                    ? `${BUILDING_MAP[selectedTile.buildingId].nameTh} Lv.${selectedTile.buildingLevel || 1}`
                    : selectedTile.kind === 'weed'
                      ? selectedTile.weedVariant === 'pest'
                        ? 'แมลงศัตรูพืช'
                        : 'วัชพืช'
                      : selectedTile.tilled
                        ? `แปลง #${selectedTile.index + 1} พร้อมปลูก`
                        : `สนามหญ้า #${selectedTile.index + 1}`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTileIndex(null)}
              aria-label="Close plot inspector"
              className="w-6 h-6 rounded-full bg-amber-200 text-[#78350f] flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedTile.kind === 'crop' && selectedTile.cropId && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#78350f] tabular-nums">
                <span>{getGrowthStageLabel(selectedTile.growthProgress || 0, CROP_MAP[selectedTile.cropId].watersNeeded, lang)}</span>
                <span className="font-mono font-bold">
                  {selectedTile.growthProgress || 0}/{CROP_MAP[selectedTile.cropId].watersNeeded}
                </span>
              </div>
              {(selectedTile.growthProgress || 0) < CROP_MAP[selectedTile.cropId].watersNeeded ? (
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => executeTileAction(selectedTile.index, 'water')}
                    className="min-h-[34px] px-1.5 rounded-xl bg-sky-600 text-white text-[10px] font-bold whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    รดน้ำ 💧
                  </button>
                  <button
                    type="button"
                    onClick={() => executeTileAction(selectedTile.index, 'daily_fertilize')}
                    className="min-h-[34px] px-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    ปุ๋ยวัน 🌱
                  </button>
                  <button
                    type="button"
                    onClick={() => executeTileAction(selectedTile.index, 'fertilize')}
                    className="min-h-[34px] px-1.5 rounded-xl bg-amber-500 text-white text-[10px] font-bold whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    ปุ๋ยทอง ✨
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => executeTileAction(selectedTile.index, 'harvest')}
                  className="w-full min-h-[36px] rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  เก็บเกี่ยวเข้ายุ้งฉาง
                </button>
              )}
            </div>
          )}

          {selectedTile.kind === 'weed' && (
            <button
              type="button"
              onClick={() => executeTileAction(selectedTile.index, 'clear_weed')}
              className="w-full min-h-[36px] rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
            >
              ปราบวัชพืช (-1 💧)
            </button>
          )}

          {selectedTile.kind === 'empty' && selectedTile.unlocked && (
            <div className="flex items-center gap-1.5">
              {!selectedTile.tilled ? (
                <button
                  type="button"
                  onClick={() => executeTileAction(selectedTile.index, 'till')}
                  className="flex-1 min-h-[36px] rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                >
                  ขุดดินเตรียมปลูก
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTool('plant')}
                  className="flex-1 min-h-[36px] rounded-xl bg-lime-600 text-white text-xs font-bold cursor-pointer"
                >
                  เลือกเมล็ดลงปลูก
                </button>
              )}
            </div>
          )}

          {selectedTile.kind === 'building' && selectedTile.buildingId && (() => {
            const bDef = BUILDING_MAP[selectedTile.buildingId];
            const curLv = selectedTile.buildingLevel || 1;
            const canUpgrade = curLv < bDef.maxLevel;
            const upgCost = canUpgrade ? getBuildingUpgradeCost(selectedTile.buildingId, curLv) : null;
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                {PRODUCTION_BUILDINGS.has(selectedTile.buildingId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFocusBuildingId(selectedTile.buildingId || null);
                      setMarketSubTab('craft');
                      setActiveModal('market');
                    }}
                    className="flex-1 min-h-[34px] px-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>แปรรูป</span>
                  </button>
                )}
                {canUpgrade && upgCost && (
                  <button
                    type="button"
                    onClick={() => handleUpgradeBuilding(selectedTile.index)}
                    className="flex-1 min-h-[34px] px-2.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>Lv.{curLv + 1} ({upgCost.coinCost}🪙)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveBuilding(selectedTile.index)}
                  aria-label="Remove building"
                  className="min-h-[34px] min-w-[34px] rounded-xl border border-amber-300 bg-white text-rose-600 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}

          {!selectedTile.unlocked && (
            <button
              type="button"
              onClick={() => executeTileAction(selectedTile.index, 'unlock')}
              className="w-full min-h-[36px] rounded-xl bg-violet-600 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <LockOpen className="w-3.5 h-3.5" />
              <span>ปลดล็อก ({getPlotUnlockStarCost(farmState.tiles.filter((t) => t.unlocked).length)} ⭐)</span>
            </button>
          )}
        </div>
      )}

      {/* BOTTOM-CENTER HAY DAY TIMBER TOOL DOCK & POP-UP SEED/BUILD DRAWERS */}
      <div className="absolute bottom-2.5 inset-x-16 sm:inset-x-24 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        {/* Contextual Seed Drawer */}
        {activeTool === 'plant' && (
          <div className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#78350f] bg-[#fffbeb]/96 backdrop-blur-md shadow-[0_5px_0_#78350f,0_8px_16px_rgba(0,0,0,0.4)] p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CROP_CATALOG.map((crop) => {
              const owned = farmState.seeds[crop.id] || 0;
              const unlocked = isCropUnlocked(crop.id, farmState, disciplineSummary.submittedHomeworkCount);
              const selected = selectedCropId === crop.id;
              return (
                <button
                  key={crop.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setSelectedCropId(crop.id)}
                  className={`min-h-[42px] px-2.5 py-1 rounded-xl border-2 text-left shrink-0 transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    selected
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-950'
                      : 'border-amber-300 bg-white text-[#451a03]'
                  }`}
                >
                  <div className="text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: crop.accentColor }} />
                    <span>{lang === 'th' ? crop.nameTh : crop.nameEn}</span>
                    <span className="font-mono tabular-nums">×{owned}</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#78350f] whitespace-nowrap tabular-nums">
                    {unlocked ? `💧${crop.watersNeeded} · ${crop.sellPrice}🪙` : `Lv.${crop.unlockTownLevel}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Contextual Building Drawer */}
        {activeTool === 'build' && (
          <div className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#78350f] bg-[#fffbeb]/96 backdrop-blur-md shadow-[0_5px_0_#78350f,0_8px_16px_rgba(0,0,0,0.4)] p-2 space-y-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'production', label: 'ปศุสัตว์ & โรงงาน' },
                  { id: 'landmark', label: 'บ้าน & ลานเมือง' },
                  { id: 'decor', label: 'รั้ว & ถนน' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setBuildCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black whitespace-nowrap shrink-0 cursor-pointer ${
                    buildCategoryFilter === cat.id
                      ? 'bg-[#b45309] text-white'
                      : 'bg-amber-100 text-[#78350f]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {filteredBuildings.map((b) => {
                const unlocked = isBuildingUnlocked(b.id, farmState);
                const selected = selectedBuildingId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelectedBuildingId(b.id)}
                    className={`min-h-[42px] px-2.5 py-1 rounded-xl border-2 text-left shrink-0 transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-amber-600 bg-amber-100 text-[#451a03]'
                        : 'border-amber-300 bg-white text-[#451a03]'
                    }`}
                  >
                    <div className="text-[11px] font-black whitespace-nowrap">
                      {lang === 'th' ? b.nameTh : b.nameEn}
                    </div>
                    <div className="text-[10px] font-bold text-[#78350f] tabular-nums whitespace-nowrap">
                      {!unlocked ? `Lv.${b.unlockTownLevel}` : `${b.coinCost}🪙 · ${b.starCost}★`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contextual 8x8 Expand Bar */}
        {activeTool === 'unlock' && gridSize === 6 && (
          <div className="pointer-events-auto rounded-2xl border-2 border-[#78350f] bg-[#fffbeb]/96 backdrop-blur-md shadow-[0_4px_0_#78350f] px-3 py-1.5 flex items-center gap-3">
            <span className="text-xs font-black text-[#451a03] whitespace-nowrap">
              ขยายพื้นที่ฟาร์ม 6×6 → 8×8
            </span>
            <button
              type="button"
              onClick={handleExpandTo8x8}
              className="min-h-[34px] px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Grid2X2Plus className="w-3.5 h-3.5" />
              <span>ขยาย (4 ★)</span>
            </button>
          </div>
        )}

        {/* Hay Day Carved Wooden Tool Tray */}
        <div className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#78350f] bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a] shadow-[0_5px_0_#78350f,0_8px_18px_rgba(0,0,0,0.42)] px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {toolButtons.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`relative min-h-[44px] px-2 py-1 rounded-xl border-2 text-[10px] font-black whitespace-nowrap shrink-0 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-white border-[#14532d] shadow-inner -translate-y-0.5'
                    : 'bg-white/90 border-amber-300/90 text-[#451a03] hover:bg-white'
                }`}
              >
                <HayDayToolSprite tool={tool.id} className="w-5 h-5" />
                <span>{lang === 'th' ? tool.labelTh : tool.labelEn}</span>
                {tool.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-black flex items-center justify-center tabular-nums border ${
                      isActive
                        ? 'bg-amber-400 text-amber-950 border-white'
                        : 'bg-[#e11d48] text-white border-white'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL 0: Daily Discipline Supply Chest & >5d Streak Golden Fertilizer Status */}
      <BaseModal
        isOpen={activeModal === 'chest'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-lg"
        title={lang === 'th' ? 'กล่องเสบียงจากวินัยการเรียนจริง' : 'Daily Discipline Supply Chest'}
        subtitle={lang === 'th' ? 'เช็กชื่อต่อเนื่อง > 5 วัน รับปุ๋ยทองคำโตไว ×2 อัตโนมัติ' : 'Check-in > 5 consecutive days unlocks 2x Golden Fertilizer'}
      >
        <div className="space-y-3">
          {hasGoldenStreakBuff && (
            <div className="rounded-xl border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 px-3.5 py-2.5 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-300 shrink-0" />
              <div className="text-xs">
                <p className="font-black text-amber-900 dark:text-yellow-200">
                  สถานะพิเศษ: ปุ๋ยทองคำโตไว ×2 เปิดใช้งานอยู่!
                </p>
                <p className="text-amber-800 dark:text-yellow-300/90">
                  {farmState.goldenFertilizerStatus?.reasonTh || `เข้าเรียนตรงเวลาต่อเนื่อง ${disciplineSummary.attendanceStreakDays} วัน`}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-card-subtle)] px-3 py-2.5">
              <span className="text-[var(--color-text-body)]">1. เช็กชื่อเข้าเรียนวันนี้</span>
              <span
                className={`font-bold text-right tabular-nums ${
                  disciplineSummary.attendanceStatusToday === 'present'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : disciplineSummary.attendanceStatusToday === 'late' || disciplineSummary.attendanceStatusToday === 'absent'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[var(--color-text-muted)]'
                }`}
              >
                {disciplineSummary.attendanceStatusToday === 'present'
                  ? `ตรงเวลา (${disciplineSummary.attendanceStreakDays} วันติด${disciplineSummary.attendanceStreakDays > 5 ? ' · ปุ๋ยทอง ×2!' : disciplineSummary.attendanceStreakDays >= 3 ? ' · ปุ๋ยทอง!' : ''})`
                  : disciplineSummary.attendanceStatusToday === 'late'
                    ? 'มาสาย (ไม่มีโบนัสน้ำฟรีวันนี้)'
                    : disciplineSummary.attendanceStatusToday === 'absent'
                      ? 'ขาดเรียน (ไม่มีโบนัสน้ำฟรีวันนี้)'
                      : 'ยังไม่มีบันทึกวันนี้'}
              </span>
            </div>

            <div className="rounded-xl bg-[var(--color-card-subtle)] px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--color-text-body)]">2. การบ้าน & พิมพ์เขียว</span>
                <span className="font-bold text-[var(--color-text-title)] tabular-nums">
                  ส่งแล้ว {disciplineSummary.submittedHomeworkCount} ชิ้น
                  {disciplineSummary.pendingHomeworkCount > 0
                    ? ` · ค้าง ${disciplineSummary.pendingHomeworkCount} ชิ้น`
                    : ' · ครบทุกชิ้น!'}
                </span>
              </div>
              {disciplineSummary.homeworkBonusLocked && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    เคลียร์งานค้าง ({disciplineSummary.pendingHomeworkTitles.join(', ')}) เพื่อรับเมล็ดชุดพิเศษ
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-card-subtle)] px-3 py-2.5">
              <span className="text-[var(--color-text-body)]">3. ความประพฤติ & จิตอาสา</span>
              <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                ความดี +{disciplineSummary.totalMeritPoints} แต้ม
                {weedCount > 0 ? ` · วัชพืช ${weedCount} ช่อง` : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClaimDisciplineChest}
            className={`w-full min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition ${
              disciplineSummary.hasAnythingToClaim
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {disciplineSummary.hasAnythingToClaim
                ? `เปิดรับเสบียง (+${disciplineSummary.claimableWater}💧 +${disciplineSummary.claimableDailyFertilizer}🌱 +${disciplineSummary.claimableFertilizer}✨ +${disciplineSummary.claimableStars}★)`
                : 'รับเสบียงล่าสุดครบแล้ว (เช็กชื่อ/ส่งงานเพิ่มเพื่อรับใหม่)'}
            </span>
          </button>
        </div>
      </BaseModal>

      {/* MODAL 1: Classroom Marketplace (rewardItems), Truck Orders, Craft Workshop, Roadside Shop, Seed Shop & Barn */}
      <BaseModal
        isOpen={activeModal === 'market'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-3xl"
        title={lang === 'th' ? 'ตลาดกลางห้องเรียน · รถส่งของ & โรงงาน' : 'Classroom Marketplace & Workshop'}
        subtitle={
          lang === 'th'
            ? `เหรียญฟาร์ม: ${farmState.coins} 🪙 · เพชรแลกรางวัล: ${playerGems} 💎${sellMultiplier > 1 ? ` · โบนัสเบเกอรี่ +${Math.round((sellMultiplier - 1) * 100)}%` : ''}`
            : `Coins: ${farmState.coins} · Gems: ${playerGems}`
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--color-border)] pb-2">
            {(
              [
                { id: 'marketplace', label: `ตลาดกลางห้องเรียน (${rewardItems.length})` },
                { id: 'orders', label: 'รถส่งออเดอร์' },
                { id: 'craft', label: `แปรรูป & ปศุสัตว์ (${totalGoodsItems})` },
                { id: 'roadside', label: `แผงริมทาง (${activeRoadsideCount}/6)` },
                { id: 'shop', label: 'ร้านเมล็ดพันธุ์' },
                { id: 'barn', label: `โรงนา & คลัง (${totalBarnItems + totalGoodsItems})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFocusBuildingId(null);
                  setMarketSubTab(tab.id);
                }}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                  marketSubTab === tab.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {marketSubTab === 'marketplace' && (
            <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
              {/* Wallet Exchange Banner */}
              <div className="rounded-2xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-[var(--color-text-title)]">
                    นำผลผลิตในฟาร์มมาขาย แลกเพชร 💎 และรับไอเทมรางวัลของคุณครู
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                    มี {farmState.coins} 🪙 · {playerGems} 💎 · ผลผลิตในยุ้งฉาง {totalBarnItems} ชิ้น
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExchangeCoinsForGems(50, 10)}
                    disabled={farmState.coins < 50}
                    className="min-h-[40px] px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-45 text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                  >
                    แลก 50🪙 → +10💎
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal('visitors')}
                    className="min-h-[40px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                  >
                    ออเดอร์ชาวบ้าน ({farmState.visitorQueue.length})
                  </button>
                </div>
              </div>

              {/* Quick Crop Sell Strip */}
              {totalBarnItems > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-[var(--color-text-title)]">ขายพืชผลเข้าตลาดกลางทันที</p>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {CROP_CATALOG.filter((c) => (farmState.barn[c.id] || 0) > 0).map((crop) => {
                      const qty = farmState.barn[crop.id] || 0;
                      const price = Math.round(crop.sellPrice * sellMultiplier);
                      return (
                        <button
                          key={crop.id}
                          type="button"
                          onClick={() => handleSellBarn(crop.id)}
                          className="min-h-[40px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                        >
                          ขาย {crop.nameTh} (มี {qty}) +{price}🪙
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teacher RewardItems Catalog */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[var(--color-text-title)]">
                    คลังไอเทมรางวัลของคุณครู ({rewardItems.length})
                  </p>
                  <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                    เพชรของคุณ: {playerGems} 💎
                  </span>
                </div>
                {rewardItems.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-6 rounded-xl bg-[var(--color-card-subtle)]">
                    ยังไม่มีรายการรางวัลในคลังของคุณครู
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {rewardItems.map((item) => {
                      const canAfford = playerGems >= item.costGems && item.stock > 0;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-col justify-between gap-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-[var(--color-text-title)] truncate">{item.titleTh}</p>
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-[11px] font-black tabular-nums shrink-0">
                                {item.costGems} 💎
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">{item.descriptionTh}</p>
                            <p className="text-[11px] font-semibold text-[var(--color-text-body)] tabular-nums">
                              คงเหลือ {item.stock} ชิ้น
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleRedeemClassroomReward(item)}
                            className="w-full min-h-[38px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                          >
                            {item.stock <= 0
                              ? 'หมดสต็อก'
                              : playerGems < item.costGems
                                ? `ขาดอีก ${item.costGems - playerGems} 💎`
                                : `แลกรางวัลครู (-${item.costGems} 💎)`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {marketSubTab === 'orders' && (
            <div className="rounded-2xl border-4 border-[#78350f] bg-gradient-to-b from-[#b45309] to-[#92400e] p-3.5 shadow-inner space-y-3">
              <div className="flex items-center justify-between text-amber-100 text-xs font-black">
                <span>กระดานออเดอร์ส่งรถบรรทุก (Truck Order Board)</span>
                <span className="tabular-nums">ส่งแล้วทั้งหมด {farmState.totalOrdersCompleted} เที่ยว</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {farmState.marketOrders.map((order) => {
                  const crop = CROP_MAP[order.cropId];
                  const ownedCrop = farmState.barn[order.cropId] || 0;
                  const prod = order.productId ? PRODUCT_MAP[order.productId] : null;
                  const ownedProd = order.productId ? farmState.goods?.[order.productId] || 0 : 0;
                  const ready =
                    ownedCrop >= order.quantity &&
                    (!order.productId || !order.productQty || ownedProd >= order.productQty);
                  return (
                    <div
                      key={order.id}
                      className={`relative rounded-xl border-2 p-3 flex flex-col justify-between gap-2.5 shadow-md ${
                        ready
                          ? 'border-emerald-500 bg-[#fffbeb]'
                          : 'border-[#d97706] bg-[#fef3c7]'
                      }`}
                    >
                      {/* Red pushpin at top */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shadow-xs shrink-0" />
                        <span className="text-[10px] font-black text-amber-800 truncate">{order.titleTh}</span>
                        {ready && (
                          <span className="text-[11px] font-black text-emerald-600 shrink-0">✓</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1.5 border border-amber-200">
                          <HayDayItemSprite kind="crop" id={order.cropId} className="w-6 h-6 shrink-0" />
                          <div className="text-xs font-bold text-[#451a03] tabular-nums min-w-0 truncate">
                            {crop.nameTh}: {ownedCrop}/{order.quantity}
                          </div>
                        </div>
                        {prod && order.productId && order.productQty && (
                          <div className="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1.5 border border-amber-200">
                            <HayDayItemSprite kind="product" id={order.productId} className="w-6 h-6 shrink-0" />
                            <div className="text-xs font-bold text-[#451a03] tabular-nums min-w-0 truncate">
                              {prod.nameTh}: {ownedProd}/{order.productQty}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[11px] font-black text-amber-900 text-center tabular-nums">
                          +{order.rewardCoins}🪙 · +1⭐ · +{order.rewardGems}💎
                        </p>
                        <button
                          type="button"
                          disabled={!ready}
                          onClick={() => handleFulfillOrder(order.id)}
                          className="w-full min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition"
                        >
                          <Truck className="w-4 h-4" />
                          <span>{ready ? 'ส่งรถบรรทุก!' : 'ของยังไม่ครบ'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {marketSubTab === 'craft' && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {focusBuildingId && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-200">
                    กำลังกรองสูตรของ: {BUILDING_MAP[focusBuildingId].nameTh}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFocusBuildingId(null)}
                    className="text-emerald-700 dark:text-emerald-300 font-bold underline cursor-pointer"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRODUCT_CATALOG.filter((p) => !focusBuildingId || p.sourceBuildingId === focusBuildingId).map((prod) => {
                  const hasBuilt = farmState.tiles.some(
                    (t) => t.kind === 'building' && t.buildingId === prod.sourceBuildingId
                  );
                  const canCraft =
                    hasBuilt &&
                    prod.ingredients.every((ing) =>
                      ing.kind === 'crop'
                        ? (farmState.barn[ing.id as CropId] || 0) >= ing.qty
                        : (farmState.goods?.[ing.id as ProductId] || 0) >= ing.qty
                    );
                  const ownedCount = farmState.goods?.[prod.id] || 0;
                  return (
                    <div
                      key={prod.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[var(--color-text-title)]">
                            {prod.nameTh} <span className="text-xs font-mono text-[var(--color-text-muted)]">({ownedCount})</span>
                          </p>
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            {prod.sellPrice}🪙
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          อาคาร: {BUILDING_MAP[prod.sourceBuildingId].nameTh} {!hasBuilt ? '(ยังไม่ได้สร้าง)' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] tabular-nums">
                          {prod.ingredients.map((ing) => {
                            const have =
                              ing.kind === 'crop'
                                ? farmState.barn[ing.id as CropId] || 0
                                : farmState.goods?.[ing.id as ProductId] || 0;
                            const label =
                              ing.kind === 'crop'
                                ? CROP_MAP[ing.id as CropId].nameTh
                                : PRODUCT_MAP[ing.id as ProductId].nameTh;
                            const ok = have >= ing.qty;
                            return (
                              <span
                                key={`${ing.kind}-${ing.id}`}
                                className={ok ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-rose-600 dark:text-rose-400'}
                              >
                                {label} {have}/{ing.qty}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {hasBuilt ? (
                        <button
                          type="button"
                          disabled={!canCraft}
                          onClick={() => handleCraftProduct(prod.id)}
                          className="w-full min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                        >
                          {canCraft ? `ผลิต (+${prod.xpReward} XP)` : 'วัตถุดิบยังไม่พอ'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBuildingId(prod.sourceBuildingId);
                            setActiveTool('build');
                            setActiveModal(null);
                          }}
                          className="w-full min-h-[38px] px-3 rounded-xl border border-indigo-400 text-indigo-700 dark:text-indigo-300 text-xs font-bold whitespace-nowrap cursor-pointer"
                        >
                          ไปสร้าง {BUILDING_MAP[prod.sourceBuildingId].nameTh}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {marketSubTab === 'roadside' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2.5">
                <p className="text-xs font-black text-[var(--color-text-title)]">ตั้งวางขายสินค้าให้เพื่อนในโรงเรียนมาแวะซื้อ</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={roadsideItemKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRoadsideItemKey(val);
                      const [kind, id] = val.split(':');
                      const unitPrice =
                        kind === 'product'
                          ? PRODUCT_MAP[id as ProductId]?.sellPrice || 50
                          : CROP_MAP[id as CropId]?.sellPrice || 25;
                      setRoadsidePrice(Math.round(unitPrice * roadsideQty * 1.15));
                    }}
                    className="sm:col-span-2 min-h-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                  >
                    {CROP_CATALOG.map((c) => (
                      <option key={`crop:${c.id}`} value={`crop:${c.id}`}>
                        {c.nameTh} (มี {farmState.barn[c.id] || 0})
                      </option>
                    ))}
                    {PRODUCT_CATALOG.map((p) => (
                      <option key={`product:${p.id}`} value={`product:${p.id}`}>
                        {p.nameTh} (มี {farmState.goods?.[p.id] || 0})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={roadsideQty}
                    onChange={(e) => setRoadsideQty(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Quantity"
                    className="min-h-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)] tabular-nums"
                  />
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={roadsidePrice}
                    onChange={(e) => setRoadsidePrice(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Price coins"
                    className="min-h-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)] tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleListRoadsideItem}
                  className="w-full min-h-[40px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>วางขายบนแผงลอยริมทาง ({roadsidePrice} 🪙)</span>
                </button>
              </div>

              <div className="rounded-2xl border-4 border-[#991b1b] bg-gradient-to-b from-[#fef3c7] to-[#fde68a] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-[#78350f]">
                  <span>แผงลังไม้ร้านค้าริมทาง ({activeRoadsideCount}/6 ช่อง)</span>
                  <button
                    type="button"
                    onClick={() => openModalWithSfx('newspaper')}
                    className="text-rose-700 underline cursor-pointer"
                  >
                    เปิดหนังสือพิมพ์ Daily Dirt
                  </button>
                </div>
                {farmState.roadsideShop.length === 0 ? (
                  <p className="text-xs text-[#78350f] text-center py-4">
                    ยังไม่มีสินค้าวางขายบนแผงริมทาง เลือกผลผลิตหรือขนมด้านบนเพื่อเปิดร้านได้เลย!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[38vh] overflow-y-auto pr-1">
                    {farmState.roadsideShop.map((item) => {
                      const label =
                        item.itemKind === 'crop'
                          ? CROP_MAP[item.itemId as CropId]?.nameTh
                          : PRODUCT_MAP[item.itemId as ProductId]?.nameTh;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border-2 border-[#b45309] bg-[#fffbeb] p-2.5 flex flex-col items-center text-center gap-1.5 shadow-sm"
                        >
                          <HayDayItemSprite kind={item.itemKind} id={item.itemId} className="w-8 h-8" />
                          <span className="text-xs font-black text-[#451a03] truncate w-full">
                            {label} ×{item.quantity}
                          </span>
                          <span className="text-xs font-black text-amber-700 tabular-nums">
                            {item.priceCoins}🪙
                          </span>
                          <span className={`text-[10px] font-bold ${item.sold ? 'text-emerald-600' : 'text-amber-700'}`}>
                            {item.sold ? `ขายให้ ${item.buyerName || 'เพื่อน'} แล้ว` : 'กำลังวางขาย'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {marketSubTab === 'shop' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {CROP_CATALOG.map((crop) => {
                const unlocked = isCropUnlocked(crop.id, farmState, disciplineSummary.submittedHomeworkCount);
                return (
                  <div
                    key={crop.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--color-text-title)] truncate tabular-nums">
                        {crop.nameTh} (มี {farmState.seeds[crop.id] || 0})
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{crop.descTh}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!unlocked || farmState.coins < crop.seedCost}
                      onClick={() => handleBuySeed(crop.id)}
                      className="min-h-[40px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition"
                    >
                      {unlocked ? `${crop.seedCost}🪙` : `Lv.${crop.unlockTownLevel}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {marketSubTab === 'barn' && (
            <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
              <p className="text-xs font-black text-[var(--color-text-title)]">พืชผลในยุ้งฉาง ({totalBarnItems})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CROP_CATALOG.map((crop) => {
                  const qty = farmState.barn[crop.id] || 0;
                  const price = Math.round(crop.sellPrice * sellMultiplier);
                  return (
                    <div
                      key={crop.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-title)]">{crop.nameTh}</p>
                        <p className="text-xs text-[var(--color-text-muted)] tabular-nums">คงเหลือ {qty} ชิ้น · ขายได้ {price}🪙/ชิ้น</p>
                      </div>
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => handleSellBarn(crop.id)}
                        className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition"
                      >
                        ขาย 1 ชิ้น
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs font-black text-[var(--color-text-title)] pt-1">สินค้าแปรรูป & ปศุสัตว์ ({totalGoodsItems})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRODUCT_CATALOG.map((prod) => (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-title)]">{prod.nameTh}</p>
                      <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        มีในคลัง {farmState.goods?.[prod.id] || 0} ชิ้น · มูลค่า {prod.sellPrice}🪙
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </BaseModal>

      {/* MODAL 2: Daily Study Review Boost Quiz */}
      <BaseModal
        isOpen={activeModal === 'quiz'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-lg"
        title={lang === 'th' ? 'ทบทวนความรู้รับน้ำ & ปุ๋ยพิเศษ' : 'Daily Study Boost Quiz'}
        subtitle={`โควตาวันนี้: ${quizUsedToday} / 3 ครั้ง · ตอบถูกรับ +2💧 +1✨ +18🪙`}
      >
        {activeQuestion && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--color-card-subtle)] p-3.5 space-y-1.5">
              <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                {activeQuestion.subject} · {activeQuestion.gradeLevel}
              </p>
              <p className="text-sm font-bold text-[var(--color-text-title)]">{activeQuestion.questionTh}</p>
            </div>
            <div className="space-y-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = quizPicked === idx;
                const isCorrect = idx === activeQuestion.correctIndex;
                let btnStyle = 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]';
                if (quizPicked !== null) {
                  if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200';
                  else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200';
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={quizPicked !== null}
                    onClick={() => handleAnswerBoostQuiz(idx)}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer transition ${btnStyle}`}
                  >
                    {idx + 1}. {opt}
                  </button>
                );
              })}
            </div>
            {quizPicked !== null && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-text-muted)]">{activeQuestion.explanationTh}</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuizPicked(null);
                    setQuizIndex((prev) => prev + 1);
                  }}
                  className="w-full min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer transition"
                >
                  ข้อถัดไป
                </button>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      {/* MODAL 3: Class Town Leaderboard, Interactive Neighbor Watering & Teacher Bonus */}
      <BaseModal
        isOpen={activeModal === 'town'}
        onClose={() => {
          setVisitingNeighbor(null);
          setActiveModal(null);
        }}
        maxWidthClass="max-w-3xl"
        title={
          visitingNeighbor
            ? `เยี่ยมชมฟาร์มของ ${visitingNeighbor.ownerName}`
            : isStaff
              ? 'เมืองโรงเรียน & มอบกำลังใจนักเรียน'
              : 'เพื่อนร่วมเมืองในโรงเรียน'
        }
        subtitle={
          visitingNeighbor
            ? `ความเจริญเมือง ${calculateTownProsperity(visitingNeighbor)} แต้ม · แตะที่ต้นไม้ของเพื่อนเพื่อช่วยรดน้ำได้ทันที`
            : 'เยี่ยมฟาร์มเพื่อนเพื่อช่วยรดน้ำวันละ 1 ครั้ง/คน (เพื่อนได้ +2💧 +10🪙 คุณได้ +15🪙)'
        }
      >
        {visitingNeighbor ? (
          <div className="space-y-3">
            <IsometricFarmBoard
              tiles={visitingNeighbor.tiles}
              selectedTileIndex={null}
              activeTool="water"
              todayDate={todayDate}
              farmName={visitingNeighbor.farmName}
              ownerName={visitingNeighbor.ownerName}
              ownerCharacter={visitingNeighbor.ownerCharacter}
              readOnly
              allowNeighborCropWater={
                visitingNeighbor.userId !== userId &&
                farmState.helpedNeighborDates[visitingNeighbor.userId] !== todayDate
              }
              feedbacks={[]}
              lang={lang}
              onTileActivate={(tileIdx) => handleHelpNeighbor(visitingNeighbor, tileIdx)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisitingNeighbor(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                ← กลับหน้ารวมเมือง
              </button>
              <div className="flex items-center gap-2">
                {visitingNeighbor.userId !== userId && (
                  <button
                    type="button"
                    disabled={farmState.helpedNeighborDates[visitingNeighbor.userId] === todayDate}
                    onClick={() => handleHelpNeighbor(visitingNeighbor)}
                    className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                  >
                    {farmState.helpedNeighborDates[visitingNeighbor.userId] === todayDate
                      ? 'ช่วยรดน้ำวันนี้แล้ว'
                      : 'ช่วยรดน้ำฟาร์มเพื่อน (+2💧)'}
                  </button>
                )}
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => handleTeacherSendGift(visitingNeighbor)}
                    className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                  >
                    มอบโบนัสครู (+3💧 +2✨ +1★)
                  </button>
                )}
              </div>
            </div>

            {visitingNeighbor.userId !== userId && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2">
                <p className="text-xs font-black text-[var(--color-text-title)]">
                  แผงร้านค้าริมทางของ {visitingNeighbor.ownerName}
                </p>
                {visitingNeighbor.roadsideShop.filter((l) => !l.sold).length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">ยังไม่มีสินค้าวางขายในร้านริมทางของเพื่อนตอนนี้</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visitingNeighbor.roadsideShop
                      .filter((l) => !l.sold)
                      .map((listing) => {
                        const label =
                          listing.itemKind === 'crop'
                            ? CROP_MAP[listing.itemId as CropId]?.nameTh
                            : PRODUCT_MAP[listing.itemId as ProductId]?.nameTh;
                        return (
                          <div
                            key={listing.id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center justify-between gap-2"
                          >
                            <div className="text-xs">
                              <p className="font-bold text-[var(--color-text-title)]">
                                {label} ×{listing.quantity}
                              </p>
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 tabular-nums">{listing.priceCoins}🪙</p>
                            </div>
                            <button
                              type="button"
                              disabled={farmState.coins < listing.priceCoins}
                              onClick={() => handleBuyFromNeighborShop(visitingNeighbor, listing.id)}
                              className="min-h-[36px] px-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-45 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                            >
                              ซื้อเลย
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {neighbors.map((n, idx) => {
              const score = calculateTownProsperity(n);
              const lv = getTownLevelFromXp(n.farmXp).level;
              const isMe = n.userId === userId;
              return (
                <div
                  key={n.userId}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FarmOwnerPortraitSvg
                      character={n.ownerCharacter}
                      className="w-10 h-10 rounded-full border border-[var(--color-border)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                        #{idx + 1} · {n.ownerName} {isMe ? '(ฟาร์มของคุณ)' : ''}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {n.ownerRoom ? `${n.ownerRoom} · ` : ''}Lv.{lv} · ความเจริญ {score} แต้ม · เก็บเกี่ยว {n.totalHarvested} ครั้ง
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setVisitingNeighbor(n)}
                      className="min-h-[40px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-xs font-bold whitespace-nowrap cursor-pointer transition"
                    >
                      เยี่ยมชมฟาร์ม
                    </button>
                    {isStaff && !isMe && (
                      <button
                        type="button"
                        onClick={() => handleTeacherSendGift(n)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer transition"
                      >
                        ให้โบนัสครู
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BaseModal>

      {/* MODAL 4: Guide */}
      <BaseModal
        isOpen={activeModal === 'guide'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-lg"
        title={lang === 'th' ? 'วิธีเล่นฟาร์มโรงเรียน (สไตล์ Hay Day)' : 'How to Play School Farm & Town'}
      >
        <div className="space-y-3 text-xs text-[var(--color-text-body)] leading-relaxed">
          <div className="rounded-xl bg-[var(--color-card-subtle)] p-3 space-y-1">
            <p className="font-bold text-[var(--color-text-title)]">1. วินัยเรียนจริง = พลังงาน & ปุ๋ยทองคำ ×2</p>
            <p>• เช็กชื่อมาเรียนตรงเวลา: รับบัวรดน้ำ 💧 + ปุ๋ยวัน 🌱 (มาต่อเนื่องเกิน 5 วันรับปุ๋ยทองคำเพิ่มความเร็วโตของพืช ×2!)</p>
            <p>• ส่งการบ้านครบ: ปลดล็อกเมล็ดพันธุ์พิเศษ & พิมพ์เขียวสิ่งปลูกสร้าง</p>
            <p>• คะแนนความประพฤติ: แต้มความดีให้ดาวเมือง ⭐ ไว้อัปเกรด/ขยายเมืองเป็น 8×8 ส่วนคะแนนหักจะเกิดวัชพืชในแปลง</p>
          </div>
          <div className="rounded-xl bg-[var(--color-card-subtle)] p-3 space-y-1">
            <p className="font-bold text-[var(--color-text-title)]">2. ตลาดกลางห้องเรียน & ออเดอร์ชาวบ้านรายวัน</p>
            <p>• ขายผลผลิตให้ออเดอร์ชาวบ้านรายวัน (จำกัดโควตาต่อวัน) เพื่อรับเหรียญ 🪙, XP และเพชร 💎</p>
            <p>• เปิด &quot;ตลาดกลางห้องเรียน&quot; เพื่อนำเพชรและเหรียญฟาร์มไปแลกไอเทมรางวัลของคุณครูได้เลย</p>
          </div>
        </div>
      </BaseModal>

      {/* MODAL 5: Daily NPC Farm Visitors with Per-Day Quotas */}
      <BaseModal
        isOpen={activeModal === 'visitors'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-xl"
        title={lang === 'th' ? 'ออเดอร์รายวันของชาวบ้าน (NPC)' : 'Daily NPC Villager Orders'}
        subtitle={lang === 'th' ? 'ขายผลผลิตตามโควตาความต้องการต่อวัน เพื่อรับเหรียญ XP และเพชรแลกรางวัลครู' : 'Serve daily NPC villager quotas for coins, XP & Gems'}
      >
        <div className="space-y-3">
          {farmState.visitorQueue.map((vis) => {
            const have =
              vis.itemKind === 'crop'
                ? farmState.barn[vis.itemId as CropId] || 0
                : farmState.goods?.[vis.itemId as ProductId] || 0;
            const itemName =
              vis.itemKind === 'crop'
                ? CROP_MAP[vis.itemId as CropId]?.nameTh
                : PRODUCT_MAP[vis.itemId as ProductId]?.nameTh;
            const quota = getNpcDailyQuotaStatus(farmState, vis.npcId, todayDate, vis.dailyQuotaLimit || 3);
            const ready = have >= vis.quantity && quota.remaining > 0;
            const gemGain = vis.rewardGems ?? 2;
            return (
              <div
                key={vis.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <NpcPortrait npcId={vis.npcId} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-[var(--color-text-title)] truncate">{vis.nameTh}</p>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 tabular-nums ${
                          quota.remaining > 0
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        โควตาวันนี้: เหลือ {quota.remaining}/{quota.limit}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-body)]">“{vis.dialogueTh}”</p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums pt-0.5">
                      ขอซื้อ: {itemName} {vis.quantity} ชิ้น (มีอยู่ {have}) · ให้ +{vis.rewardCoins}🪙 +{vis.rewardXp} XP +{gemGain}💎
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleDismissVisitor(vis.id)}
                    className="min-h-[38px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                  >
                    คนถัดไป
                  </button>
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => handleFulfillVisitor(vis.id)}
                    className="min-h-[38px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition"
                  >
                    {quota.remaining <= 0
                      ? 'ครบโควตาวันนี้แล้ว'
                      : have >= vis.quantity
                        ? `ขายให้ (+${vis.rewardCoins}🪙 +${gemGain}💎)`
                        : 'ของยังไม่พอ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </BaseModal>

      {/* MODAL 6: Farm Owner Character Wardrobe */}
      <BaseModal
        isOpen={activeModal === 'character'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-xl"
        title={lang === 'th' ? 'ตัวละครเจ้าของฟาร์ม (Farm Owner)' : 'Farm Owner Character'}
        subtitle={lang === 'th' ? 'เลือกสไตล์หมวกและชุดเจ้าของฟาร์ม ตัวละครจะเดินดูแลแปลงตามที่คุณแตะเล่น!' : 'Customize your farm owner avatar'}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/75 dark:bg-amber-950/30 p-3.5 flex items-center gap-4">
            <FarmOwnerPortraitSvg
              character={charDraft}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 shadow-md shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-base font-black text-[var(--color-text-title)] truncate">
                {farmState.ownerName}
              </p>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {FARM_CHARACTER_PRESETS.find((p) => p.id === charDraft.styleId)?.nameTh || 'เจ้าของฟาร์ม'}
                {farmState.ownerRoom ? ` · ${farmState.ownerRoom}` : ''}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {FARM_CHARACTER_PRESETS.find((p) => p.id === charDraft.styleId)?.descTh}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-[var(--color-text-title)]">เลือกสไตล์ตัวละคร</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FARM_CHARACTER_PRESETS.map((preset) => {
                const selected = charDraft.styleId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCharDraft({ ...preset.defaultCharacter })}
                    className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 cursor-pointer transition ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    <FarmOwnerPortraitSvg
                      character={preset.defaultCharacter}
                      className="w-11 h-11 rounded-full shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[var(--color-text-title)] truncate">{preset.nameTh}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-2">{preset.descTh}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-black text-[var(--color-text-title)]">สีหมวก</p>
              <div className="flex flex-wrap gap-1.5">
                {['#facc15', '#fde047', '#fb923c', '#86efac', '#38bdf8', '#f472b6'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Hat color ${hex}`}
                    onClick={() => setCharDraft((prev) => ({ ...prev, hatColor: hex }))}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer transition ${
                      charDraft.hatColor === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-white/70'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-black text-[var(--color-text-title)]">สีชุดเอี๊ยม / เสื้อ</p>
              <div className="flex flex-wrap gap-1.5">
                {['#2563eb', '#e11d48', '#059669', '#d97706', '#7c3aed', '#0284c7'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Outfit color ${hex}`}
                    onClick={() => setCharDraft((prev) => ({ ...prev, outfitColor: hex }))}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer transition ${
                      charDraft.outfitColor === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-white/70'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-black text-[var(--color-text-title)]">สีผม</p>
              <div className="flex flex-wrap gap-1.5">
                {['#78350f', '#451a03', '#1e293b', '#92400e', '#b45309', '#be185d'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Hair color ${hex}`}
                    onClick={() => setCharDraft((prev) => ({ ...prev, hairColor: hex }))}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer transition ${
                      charDraft.hairColor === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-white/70'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="min-h-[42px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                const updated = updateFarmOwnerCharacter(farmState, charDraft);
                persistFarm(updated);
                playFarmChime('harvest', farmState.soundMuted);
                emitAppToast({
                  title: lang === 'th' ? 'บันทึกตัวละครเจ้าของฟาร์มแล้ว!' : 'Farm Owner Saved!',
                  message: lang === 'th' ? 'ตัวละครใหม่ของคุณพร้อมลงแปลงทำงานแล้ว' : 'Your farmer avatar is ready!',
                  tone: 'success',
                });
                setActiveModal(null);
              }}
              className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black whitespace-nowrap cursor-pointer transition"
            >
              บันทึกชุดเจ้าของฟาร์ม
            </button>
          </div>
        </div>
      </BaseModal>

      {/* MODAL 7: Hay Day Daily Dirt Newspaper */}
      <BaseModal
        isOpen={activeModal === 'newspaper'}
        onClose={() => openModalWithSfx(null)}
        maxWidthClass="max-w-2xl"
        title={lang === 'th' ? 'หนังสือพิมพ์ฟาร์ม (The Daily Dirt)' : 'The Daily Dirt Newspaper'}
        subtitle={lang === 'th' ? 'ประกาศขายพืชผลและสินค้าแปรรูปลดราคาจากเพื่อนบ้านและฟาร์มรอบโรงเรียน' : 'Browse roadside bargains from neighbors and nearby farms'}
      >
        <div className="space-y-3">
          <div className="rounded-xl border-2 border-[#a8a29e] bg-[#fefce8] text-[#292524] p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black tracking-wide">THE DAILY DIRT · ข่าวเกษตรโรงเรียน</p>
              <p className="text-[11px] text-[#57534e]">
                {disciplineSummary.hasAnythingToClaim
                  ? 'กล่องเสบียงวินัยวันนี้พร้อมเปิดรับแล้ว!'
                  : 'เช็กโฆษณาสินค้าราคาประหยัดจากฟาร์มรอบข้างได้เลย'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModalWithSfx('chest')}
              className="min-h-[36px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              เปิดกล่องเสบียงวินัย
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {dailyDirtAds.map((ad) => {
              const itemName =
                ad.itemKind === 'crop'
                  ? CROP_MAP[ad.itemId as CropId]?.nameTh
                  : PRODUCT_MAP[ad.itemId as ProductId]?.nameTh;
              return (
                <div
                  key={ad.id}
                  className="rounded-xl border-2 border-dashed border-[#a8a29e] bg-[#fafaf9] dark:bg-slate-800/90 p-3 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                      <HayDayItemSprite kind={ad.itemKind} id={ad.itemId} className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[var(--color-text-title)] truncate">
                        {itemName} ×{ad.quantity}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {ad.farmName} ({ad.sellerName})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={farmState.coins < ad.priceCoins}
                    onClick={() => handleBuyDailyDirtAd(ad)}
                    className="min-h-[38px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-45 text-white text-xs font-black whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                  >
                    ซื้อ {ad.priceCoins}🪙
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </BaseModal>

      {/* MODAL 8: Daily Lucky Spin Wheel */}
      <BaseModal
        isOpen={activeModal === 'wheel'}
        onClose={() => openModalWithSfx(null)}
        maxWidthClass="max-w-md"
        title={lang === 'th' ? 'วงล้อนำโชคประจำวัน (Lucky Wheel)' : 'Daily Lucky Spin Wheel'}
        subtitle={lang === 'th' ? 'หมุนฟรีวันละ 1 ครั้ง ลุ้นรับเหรียญ บัวรดน้ำ ปุ๋ยทองคำ และเมล็ดพิเศษ' : 'Spin once per day for bonus farm supplies'}
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Pointer Arrow */}
            <div className="absolute -top-2 z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-rose-600 drop-shadow" />
            <svg
              viewBox="0 0 200 200"
              className="w-60 h-60 drop-shadow-xl"
              style={{
                transform: `rotate(${wheelAngle}deg)`,
                transition: wheelSpinning ? 'transform 2.65s cubic-bezier(0.12, 0.88, 0.22, 1)' : 'none',
              }}
            >
              {LUCKY_WHEEL_REWARDS.map((slot, idx) => {
                const n = LUCKY_WHEEL_REWARDS.length;
                const startDeg = idx * (360 / n) - 90;
                const endDeg = (idx + 1) * (360 / n) - 90;
                const startRad = (startDeg * Math.PI) / 180;
                const endRad = (endDeg * Math.PI) / 180;
                const x1 = 100 + 92 * Math.cos(startRad);
                const y1 = 100 + 92 * Math.sin(startRad);
                const x2 = 100 + 92 * Math.cos(endRad);
                const y2 = 100 + 92 * Math.sin(endRad);
                const midRad = (((startDeg + endDeg) / 2) * Math.PI) / 180;
                const tx = 100 + 58 * Math.cos(midRad);
                const ty = 100 + 58 * Math.sin(midRad);
                return (
                  <g key={slot.id}>
                    <path
                      d={`M100,100 L${x1},${y1} A92,92 0 0,1 ${x2},${y2} Z`}
                      fill={slot.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="9"
                      fontWeight="900"
                      fill="#0f172a"
                      transform={`rotate(${(startDeg + endDeg) / 2 + 90}, ${tx}, ${ty})`}
                    >
                      {slot.labelTh.slice(0, 12)}
                    </text>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="18" fill="#fffbeb" stroke="#78350f" strokeWidth="4" />
              <circle cx="100" cy="100" r="6" fill="#f59e0b" />
            </svg>
          </div>

          {wheelWonSlot && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 px-4 py-2 text-center">
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                ยินดีด้วย! คุณได้รับ {wheelWonSlot.labelTh}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!spinAvailable || wheelSpinning}
            onClick={handleSpinWheel}
            className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-black cursor-pointer transition shadow"
          >
            {wheelSpinning
              ? 'กำลังหมุนวงล้อ...'
              : spinAvailable
                ? 'หมุนวงล้อนำโชคฟรี! (1 ครั้ง/วัน)'
                : 'หมุนวงล้อวันนี้ไปแล้ว พรุ่งนี้มาลุ้นใหม่นะ!'}
          </button>
        </div>
      </BaseModal>

      {/* MODAL 9: Farmhouse Achievements Ribbon Board */}
      <BaseModal
        isOpen={activeModal === 'achievements'}
        onClose={() => openModalWithSfx(null)}
        maxWidthClass="max-w-xl"
        title={lang === 'th' ? 'กระดานความสำเร็จบ้านพักชาวสวน' : 'Farmhouse Achievements'}
        subtitle={lang === 'th' ? 'ทำภารกิจเกษตรในโรงเรียนเพื่อรับเหรียญ ดาวพัฒนาเมือง และ XP พิเศษ' : 'Complete farm milestones for coins, stars & XP'}
      >
        <div className="space-y-2.5 max-h-[62vh] overflow-y-auto pr-1">
          {achievementsList.map((ach) => {
            const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
            return (
              <div
                key={ach.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-[var(--color-text-title)] truncate">{ach.titleTh}</p>
                    <span className="text-xs font-bold text-[var(--color-text-muted)] tabular-nums shrink-0">
                      {Math.min(ach.current, ach.target)}/{ach.target}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{ach.descTh}</p>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    รางวัล: +{ach.rewardCoins}🪙 · +{ach.rewardStars}★ · +{ach.rewardXp} XP
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!ach.completed || ach.claimed}
                  onClick={() => handleClaimAchievement(ach.id)}
                  className={`min-h-[40px] px-4 rounded-xl text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition ${
                    ach.claimed
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      : ach.completed
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60'
                  }`}
                >
                  {ach.claimed ? 'รับแล้ว ✓' : ach.completed ? 'รับรางวัล!' : 'ยังไม่ครบ'}
                </button>
              </div>
            );
          })}
        </div>
      </BaseModal>
    </div>
  );
};
