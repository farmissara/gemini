import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpCircle,
  ChefHat,
  Grid2X2Plus,
  HelpCircle,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Music,
  Pencil,
  RotateCw,
  Trash2,
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
  claimBeginnerPracticePack,
  claimDisciplineSupplies,
  claimFarmAchievement,
  clearWeedOnTile,
  collectAllReadyForBuilding,
  collectBuildingYield,
  collectReadyProductionJob,
  computeDisciplineChestSummary,
  constructBuildingOnTile,
  convertFarmCoinsToGems,
  CROP_CATALOG,
  CROP_MAP,
  dismissVisitorRequest,
  enqueueProductionJob,
  expandFarmGridTo8x8,
  fertilizeTile,
  fulfillMarketOrder,
  fulfillVisitorRequest,
  generateDailyDirtListings,
  getBuildingUpgradeCost,
  getCropSellMultiplier,
  getFarmAchievementProgress,
  getFarmGridSize,
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
  PRODUCT_MAP,
  removeBuildingOnTile,
  resetDailyWaterFlagsIfNeeded,
  resolveStudentForUser,
  sellCropFromBarn,
  speedUpProductionJob,
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
} from '../lib/schoolFarmEngine';
import { farmAudio, type FarmSfxType } from '../lib/farmAudioEngine';
import { IsometricFarmBoard, type FloatingFeedback } from '../components/games/IsometricFarmBoard';
import { FarmOwnerPortraitSvg } from '../components/games/HayDayHudIcons';
import {
  GardenBuildingBadgeIcon,
  GardenCafeCupIcon,
  GardenCoinCrest,
  GardenEventsIcon,
  GardenGazetteIcon,
  GardenGemCrest,
  GardenGiftBasketIcon,
  GardenHudIconBtn,
  GardenItemIcon,
  GardenLevelCrest,
  GardenMortarCraftIcon,
  GardenNeighborsIcon,
  GardenStallIcon,
  GardenToolIcon,
} from '../components/games/GardenFarmIcons';
import {
  GardenBoardSet,
  type CafeSubTab,
  type EventsSubTab,
  type GardenBoardKind,
  type TradeSubTab,
} from '../components/games/GardenGamePanels';
import { LiveSubjectChallengeCard } from '../components/games/GardenLifeSubjectOverlay';
import {
  generateCraftLifeChallenge,
  generateCropScienceChallenge,
  generateScenarioForSubject,
  generateSocialCommChallenge,
  generateTradeMathChallenge,
  resolveLifeSubjectChallenge,
  type LifeChallengeScenario,
  type LifeSubjectId,
} from '../lib/farmLifeSubjects';

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

const PRODUCTION_BUILDINGS = new Set<BuildingId>([
  'garden_cafe',
  'herbal_pavilion',
  'thai_kitchen',
  'chicken_coop',
  'dairy_barn',
  'sheep_pen',
  'juice_stand',
  'windmill_bakery',
]);

const CARE_TOOLS: Array<{ id: FarmTool; labelTh: string; labelEn: string }> = [
  { id: 'till', labelTh: 'พรวนดิน', labelEn: 'Till' },
  { id: 'water', labelTh: 'รดน้ำ', labelEn: 'Water' },
  { id: 'daily_fertilize', labelTh: 'ปุ๋ยวัน', labelEn: 'Compost' },
  { id: 'fertilize', labelTh: 'ปุ๋ยทอง×2', labelEn: 'Gold×2' },
  { id: 'clear_weed', labelTh: 'วัชพืช', labelEn: 'Weed' },
];

const CARE_TOOL_SET = new Set<FarmTool>(CARE_TOOLS.map((t) => t.id));

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
    questionTh: 'หากชงอัญชันลาเต้ได้วันละ 8 แก้ว เป็นเวลา 7 วัน คาเฟ่ในสวนจะขายได้ทั้งหมดกี่แก้ว?',
    questionEn: 'If your garden cafe serves 8 butterfly-pea lattes a day for 7 days, how many cups total?',
    options: ['48 แก้ว', '54 แก้ว', '56 แก้ว', '64 แก้ว'],
    correctIndex: 2,
    explanationTh: '8 × 7 = 56 แก้ว',
    category: 'review',
    points: 10,
  },
  {
    id: 'farm-q3',
    subject: 'สังคมศึกษา',
    gradeLevel: 'ทั่วไป',
    questionTh: 'เกษตรผสมผสานตามหลักเศรษฐกิจพอเพียงเน้นเรื่องใดมากที่สุด?',
    questionEn: 'What does integrated farming under Sufficiency Economy emphasize most?',
    options: [
      'ปลูกพืชเชิงเดี่ยวชนิดเดียว',
      'พึ่งพาตนเอง ปลูกหลายอย่างเกื้อกูลกัน',
      'ใช้สารเคมีเข้มข้นทุกแปลง',
      'ไม่แปรรูปผลผลิตเลย',
    ],
    correctIndex: 1,
    explanationTh: 'เกษตรผสมผสานช่วยให้ระบบนิเวศสมดุล ลดความเสี่ยง และแปรรูปเพิ่มมูลค่าได้',
    category: 'review',
    points: 10,
  },
];

const playFarmChime = (type: FarmSfxType, muted: boolean) => {
  if (muted) return;
  farmAudio.playSfx(type);
};

const getGrowthStageLabel = (progress: number, watersNeeded: number, lang: AppLanguage): string => {
  if (progress >= watersNeeded) return lang === 'th' ? 'พร้อมเก็บเกี่ยว' : 'Ready';
  const ratio = progress / Math.max(1, watersNeeded);
  if (ratio <= 0) return lang === 'th' ? 'หว่านเมล็ดแล้ว' : 'Seedling';
  if (ratio < 0.5) return lang === 'th' ? 'ต้นกล้ากำลังโต' : 'Sprouting';
  return lang === 'th' ? 'ผลิดอกออกใบ' : 'Flowering';
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

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissedPortraitHint, setDismissedPortraitHint] = useState(false);

  const [activeTool, setActiveTool] = useState<FarmTool>('inspect');
  const [lastCareTool, setLastCareTool] = useState<FarmTool>('water');
  const [careTrayOpen, setCareTrayOpen] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState<CropId>('butterfly_pea');
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId>('dairy_barn');
  const [buildCategoryFilter, setBuildCategoryFilter] = useState<'all' | 'production' | 'landmark' | 'decor'>('all');
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);

  const [activeBoard, setActiveBoard] = useState<GardenBoardKind>(null);
  const [focusBuildingId, setFocusBuildingId] = useState<BuildingId | null>(null);
  const [cafeTab, setCafeTab] = useState<CafeSubTab>('visitors');
  const [tradeTab, setTradeTab] = useState<TradeSubTab>('seeds_barn');
  const [eventsTab, setEventsTab] = useState<EventsSubTab>('subjects');

  const [lifeAutoPromptEnabled, setLifeAutoPromptEnabled] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState<LifeChallengeScenario | null>(null);
  const [challengePicked, setChallengePicked] = useState<number | null>(null);
  const [challengeFromMatrix, setChallengeFromMatrix] = useState(false);

  const [truckAnimating, setTruckAnimating] = useState(false);
  const [roadsideItemKey, setRoadsideItemKey] = useState<string>('crop:butterfly_pea');
  const [roadsideQty, setRoadsideQty] = useState<number>(1);
  const [roadsidePrice, setRoadsidePrice] = useState<number>(40);
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

  const feedbackSeqRef = useRef(1);
  const rootContainerRef = useRef<HTMLDivElement | null>(null);
  const fieldActionCountRef = useRef(0);
  const tradeActionCountRef = useRef(0);
  const craftActionCountRef = useRef(0);
  const riceScienceShownRef = useRef(false);

  // Tick live timer every 1s only while crafting board is open or a building has an active timer
  const hasPendingQueue = useMemo(
    () => (farmState.productionQueue || []).some((j) => j.readyAtMs > nowMs),
    [farmState.productionQueue, nowMs]
  );

  useEffect(() => {
    if (!hasPendingQueue && activeBoard !== 'craft') return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasPendingQueue, activeBoard]);

  const openBoardWithSfx = (board: GardenBoardKind) => {
    if (board === 'craft') setNowMs(Date.now());
    if (board === 'character') setCharDraft(farmState.ownerCharacter);
    if (board === 'events') setQuizPicked(null);
    farmAudio.playSfx(board ? 'open' : 'close');
    setActiveBoard(board);
  };

  useEffect(() => {
    farmAudio.setMutedState(farmState.soundMuted, farmState.musicMuted);
  }, [farmState.soundMuted, farmState.musicMuted]);

  useEffect(() => {
    return () => {
      farmAudio.stopMusic();
    };
  }, []);

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
        title: lang === 'th' ? `อัปเลเวลสวนเป็น Lv.${nextLv}!` : `Garden Level Up: Lv.${nextLv}!`,
        message: lang === 'th' ? 'ปลดล็อกพืชสมุนไพรและอาคารใหม่แล้ว' : 'New Thai crops & cafe buildings unlocked!',
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

  useEffect(() => {
    if (disciplineSummary.unresolvedDemerits.length === 0) return;
    const synced = syncBehaviorWeedsOntoFarm(farmState, disciplineSummary.unresolvedDemerits);
    if (synced !== farmState) {
      persistFarm(synced);
    }
  }, [disciplineSummary.unresolvedDemerits]);

  const townLevelInfo = useMemo(() => getTownLevelFromXp(farmState.farmXp), [farmState.farmXp]);
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
        message: lang === 'th' ? 'เช็กชื่อ ส่งการบ้าน หรือสะสมความดีเพิ่มเพื่อเปิดตะกร้ารอบถัดไป' : 'Check in or submit homework for more supplies.',
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
    const bpText =
      disciplineSummary.claimableBlueprints.length > 0
        ? ` · พิมพ์เขียว ${BUILDING_MAP[disciplineSummary.claimableBlueprints[0]].nameTh}`
        : '';
    emitAppToast({
      title: lang === 'th' ? 'เปิดตะกร้าเสบียงวินัยสำเร็จ!' : 'Discipline Basket Claimed!',
      message: `💧 +${disciplineSummary.claimableWater} · 🌱ปุ๋ย +${disciplineSummary.claimableDailyFertilizer} · ✨ปุ๋ยทอง +${disciplineSummary.claimableFertilizer} · ★ +${disciplineSummary.claimableStars}${bpText}`,
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
        const currentNow = Date.now();
        setNowMs(currentNow);

        // 1. Collect ready queued craft items directly from building tap
        if (tile.buildingId && PRODUCTION_BUILDINGS.has(tile.buildingId)) {
          const readyRes = collectAllReadyForBuilding(farmState, tile.buildingId, currentNow);
          if (readyRes.collectedCount > 0) {
            persistFarm(readyRes.state);
            playFarmChime('harvest', farmState.soundMuted);
            pushFeedback(tileIndex, `รับสินค้า ×${readyRes.collectedCount}!`, 'emerald');
            if (onEarnRewards && currentUser?.id) {
              onEarnRewards(currentUser.id, readyRes.xpEarned, 0, false);
            }
            return;
          }
        }

        // 2. Collect daily coin/fertilizer yield if available
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

        // 3. Open Cottage Achievements or Production Board
        if (tile.buildingId === 'farm_cottage') {
          setEventsTab('achievements');
          openBoardWithSfx('events');
          return;
        }
        if (tile.buildingId === 'chicken_coop') farmAudio.playSfx('chicken');
        else if (tile.buildingId === 'dairy_barn') farmAudio.playSfx('cow');
        else if (tile.buildingId === 'sheep_pen') farmAudio.playSfx('sheep');
        if (tile.buildingId && PRODUCTION_BUILDINGS.has(tile.buildingId)) {
          setFocusBuildingId(tile.buildingId);
          openBoardWithSfx('craft');
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
        emitAppToast({ title: lang === 'th' ? 'พรวนดินไม่สำเร็จ' : 'Cannot till', message: res.errorTh || '', tone: 'info' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('till', farmState.soundMuted);
      pushFeedback(tileIndex, 'พรวนดินแล้ว +2 XP', 'emerald');
      return;
    }

    if (toolToRun === 'plant') {
      const res = plantCropOnTile(farmState, tileIndex, selectedCropId);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ปลูกไม่สำเร็จ' : 'Cannot plant', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('plant', farmState.soundMuted);
      pushFeedback(tileIndex, `ปลูก${CROP_MAP[selectedCropId].nameTh}`, 'emerald');
      return;
    }

    if (toolToRun === 'water') {
      const wateredCropId = tile.cropId;
      const res = waterTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'รดน้ำไม่สำเร็จ' : 'Cannot water', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('water', farmState.soundMuted);
      pushFeedback(
        tileIndex,
        res.matured ? 'พร้อมเก็บแล้ว!' : hasGoldenStreakBuff ? 'รดน้ำ ×2 โตไว!' : 'รดน้ำ +1 💧',
        hasGoldenStreakBuff ? 'amber' : 'sky'
      );
      if (lifeAutoPromptEnabled && !activeChallenge && wateredCropId) {
        fieldActionCountRef.current += 1;
        const hitRiceFirst = wateredCropId === 'jasmine_rice' && !riceScienceShownRef.current;
        if (hitRiceFirst || fieldActionCountRef.current % 3 === 1) {
          if (hitRiceFirst) riceScienceShownRef.current = true;
          setChallengeFromMatrix(false);
          setChallengePicked(null);
          setActiveChallenge(generateCropScienceChallenge(wateredCropId, fieldActionCountRef.current));
        }
      }
      return;
    }

    if (toolToRun === 'daily_fertilize') {
      const cropId = tile.cropId;
      const res = applyDailyFertilizerTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ใส่ปุ๋ยไม่สำเร็จ' : 'Cannot fertilize', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('plant', farmState.soundMuted);
      pushFeedback(tileIndex, res.matured ? 'พร้อมเก็บแล้ว!' : 'โตไว +1 ขั้น 🌱', 'emerald');
      if (lifeAutoPromptEnabled && !activeChallenge && cropId) {
        fieldActionCountRef.current += 1;
        if (fieldActionCountRef.current % 3 === 1) {
          setChallengeFromMatrix(false);
          setChallengePicked(null);
          setActiveChallenge(generateCropScienceChallenge(cropId, fieldActionCountRef.current));
        }
      }
      return;
    }

    if (toolToRun === 'fertilize') {
      const res = fertilizeTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ใส่ปุ๋ยทองคำไม่สำเร็จ' : 'Cannot fertilize', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('harvest', farmState.soundMuted);
      pushFeedback(tileIndex, 'ผลผลิต ×2 ✨', 'amber');
      return;
    }

    if (toolToRun === 'harvest') {
      const res = harvestTile(farmState, tileIndex);
      if (!res.ok || !res.cropId) {
        emitAppToast({ title: lang === 'th' ? 'เก็บเกี่ยวไม่สำเร็จ' : 'Cannot harvest', message: res.errorTh || '', tone: 'info' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('harvest', farmState.soundMuted);
      pushFeedback(tileIndex, `+${res.harvestedQty} ${CROP_MAP[res.cropId].nameTh}`, 'emerald');
      if (onEarnRewards && currentUser?.id) {
        onEarnRewards(currentUser.id, res.xpEarned || 10, 0, false);
      }
      if (lifeAutoPromptEnabled && !activeChallenge) {
        fieldActionCountRef.current += 1;
        if (fieldActionCountRef.current % 4 === 0) {
          setChallengeFromMatrix(false);
          setChallengePicked(null);
          setActiveChallenge(generateCropScienceChallenge(res.cropId, fieldActionCountRef.current));
        }
      }
      return;
    }

    if (toolToRun === 'clear_weed') {
      const res = clearWeedOnTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'กำจัดวัชพืชไม่สำเร็จ' : 'Cannot clear weed', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('weed', farmState.soundMuted);
      pushFeedback(tileIndex, 'สวนสะอาดแล้ว!', 'emerald');
      return;
    }

    if (toolToRun === 'unlock') {
      const res = unlockPlotTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ยังปลดล็อกไม่ได้' : 'Cannot unlock', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('build', farmState.soundMuted);
      pushFeedback(tileIndex, `ขยายสวน (-${res.costStars}★)`, 'amber');
      return;
    }

    if (toolToRun === 'build') {
      const res = constructBuildingOnTile(farmState, tileIndex, selectedBuildingId);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'สร้างไม่สำเร็จ' : 'Cannot build', message: res.errorTh || '', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('build', farmState.soundMuted);
      pushFeedback(tileIndex, `สร้าง${BUILDING_MAP[selectedBuildingId].nameTh}!`, 'amber');
      if (onEarnRewards && currentUser?.id) {
        onEarnRewards(currentUser.id, 30, 1, true);
      }
      if (lifeAutoPromptEnabled && !activeChallenge) {
        setChallengeFromMatrix(false);
        setChallengePicked(null);
        setActiveChallenge(
          generateScenarioForSubject(
            selectedBuildingId === 'lotus_fish_pond' ? 'social' : 'arts',
            res.state,
            tileIndex
          )
        );
      }
    }
  };

  const handleUpgradeBuilding = (tileIndex: number) => {
    const res = upgradeBuildingOnTile(farmState, tileIndex);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'อัปเกรดไม่สำเร็จ' : 'Cannot upgrade', message: res.errorTh || '', tone: 'warning' });
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
      emitAppToast({ title: lang === 'th' ? 'ยังขยายเป็น 8×8 ไม่ได้' : 'Cannot expand', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    setSelectedTileIndex(null);
    playFarmChime('build', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? 'ขยายอาณาเขตสวน 8×8 สำเร็จ!' : 'Garden Expanded to 8×8!',
      message: lang === 'th' ? 'เพิ่มแปลงเกษตรผสมผสานรอบนอกเรียบร้อย' : 'New perimeter plots unlocked.',
      tone: 'success',
    });
  };

  // Timed Production Queue Handlers
  const handleStartProduction = (productId: ProductId) => {
    const currentNow = Date.now();
    setNowMs(currentNow);
    const res = enqueueProductionJob(farmState, productId, currentNow);
    if (!res.ok) {
      emitAppToast({
        title: lang === 'th' ? 'เริ่มผลิตไม่ได้' : 'Cannot start production',
        message: res.errorTh || 'วัตถุดิบไม่พอหรือคิวเต็ม',
        tone: 'warning',
      });
      return;
    }
    persistFarm(res.state);
    playFarmChime('build', farmState.soundMuted);
    const prod = PRODUCT_MAP[productId];
    emitAppToast({
      title: lang === 'th' ? `เริ่มชง/ปรุง ${prod.nameTh}` : `Queued ${prod.nameEn}`,
      message: lang === 'th' ? `ใช้เวลา ${prod.craftTimeSec} วินาที` : `Ready in ${prod.craftTimeSec}s`,
      tone: 'info',
    });
    if (lifeAutoPromptEnabled && !activeChallenge) {
      craftActionCountRef.current += 1;
      if (craftActionCountRef.current % 2 === 1) {
        setChallengeFromMatrix(false);
        setChallengePicked(null);
        setActiveChallenge(generateCraftLifeChallenge(productId, craftActionCountRef.current));
      }
    }
  };

  const handleCollectProductionJob = (jobId: string) => {
    const currentNow = Date.now();
    setNowMs(currentNow);
    const res = collectReadyProductionJob(farmState, jobId, currentNow);
    if (!res.ok || !res.productId) {
      emitAppToast({
        title: lang === 'th' ? 'ยังไม่พร้อมรับ' : 'Not ready yet',
        message: res.errorTh || '',
        tone: 'info',
      });
      return;
    }
    persistFarm(res.state);
    playFarmChime('harvest', farmState.soundMuted);
    const prod = PRODUCT_MAP[res.productId];
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, prod.xpReward, 0, false);
    }
    emitAppToast({
      title: lang === 'th' ? `รับ ${prod.nameTh} ×1 แล้ว!` : `Collected ${prod.nameEn}`,
      message: `+${prod.xpReward} XP`,
      tone: 'success',
    });
  };

  const handleCollectAllBuilding = (buildingId: BuildingId) => {
    const currentNow = Date.now();
    setNowMs(currentNow);
    const res = collectAllReadyForBuilding(farmState, buildingId, currentNow);
    if (res.collectedCount <= 0) return;
    persistFarm(res.state);
    playFarmChime('harvest', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.xpEarned, 0, false);
    }
    emitAppToast({
      title: lang === 'th' ? `รับสินค้าจาก${BUILDING_MAP[buildingId].nameTh} ×${res.collectedCount}` : 'Collected ready items!',
      message: `+${res.xpEarned} XP`,
      tone: 'success',
    });
  };

  const handleSpeedUpJob = (jobId: string) => {
    const res = speedUpProductionJob(farmState, jobId, 10);
    if (!res.ok || !res.productId) {
      emitAppToast({
        title: lang === 'th' ? 'เร่งด่วนไม่สำเร็จ' : 'Speed up failed',
        message: res.errorTh || '',
        tone: 'warning',
      });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    const prod = PRODUCT_MAP[res.productId];
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, prod.xpReward, 0, false);
    }
    emitAppToast({
      title: lang === 'th' ? `เร่งเสิร์ฟ ${prod.nameTh} สำเร็จ!` : `Instant ${prod.nameEn}!`,
      message: `-10 🪙 · +${prod.xpReward} XP`,
      tone: 'success',
    });
  };

  const handleJumpToBuild = (buildingId: BuildingId) => {
    setActiveBoard(null);
    setCareTrayOpen(false);
    setSelectedBuildingId(buildingId);
    setBuildCategoryFilter('production');
    setActiveTool('build');
    emitAppToast({
      title: lang === 'th' ? `เลือกจุดว่างในสวนเพื่อวาง ${BUILDING_MAP[buildingId].nameTh}` : 'Tap an open plot to build',
      message: lang === 'th' ? 'แตะช่องสนามหญ้าที่ปลดล็อกแล้วเพื่อก่อสร้าง' : 'Tap any unlocked empty plot.',
      tone: 'info',
    });
  };

  const handleFulfillOrder = (orderId: string) => {
    const res = fulfillMarketOrder(farmState, orderId);
    if (!res.ok || !res.order) {
      emitAppToast({ title: lang === 'th' ? 'ส่งออเดอร์ไม่สำเร็จ' : 'Order incomplete', message: res.errorTh || '', tone: 'warning' });
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
      title: lang === 'th' ? 'รถส่งของจัดส่งสำเร็จ!' : 'Delivery Complete!',
      message: `+${res.order.rewardCoins} 🪙 · +1 ★ · +${res.order.rewardGems} 💎`,
      tone: 'success',
    });
    if (lifeAutoPromptEnabled && !activeChallenge) {
      tradeActionCountRef.current += 1;
      const cropName = CROP_MAP[res.order.cropId].nameTh;
      const unitPrice = Math.max(15, Math.round(res.order.rewardCoins / Math.max(1, res.order.quantity)));
      setChallengeFromMatrix(false);
      setChallengePicked(null);
      setActiveChallenge(
        generateTradeMathChallenge(cropName, res.order.quantity, unitPrice, tradeActionCountRef.current)
      );
    }
  };

  const handleFulfillVisitor = (visitorId: string) => {
    const res = fulfillVisitorRequest(farmState, visitorId, todayDate);
    if (!res.ok || !res.visitor) {
      emitAppToast({ title: lang === 'th' ? 'ยังเสิร์ฟลูกค้าไม่ได้' : 'Cannot serve guest', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    const gemReward = res.visitor.rewardGems ?? 2;
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.visitor.rewardXp, gemReward, true);
    }
    emitAppToast({
      title: lang === 'th' ? `เสิร์ฟคุณ ${res.visitor.nameTh.split(' ')[0]} แล้ว!` : 'Guest Served!',
      message: `+${res.visitor.rewardCoins} 🪙 · +${res.visitor.rewardXp} XP · +${gemReward} 💎`,
      tone: 'success',
    });
    if (lifeAutoPromptEnabled && !activeChallenge) {
      tradeActionCountRef.current += 1;
      const c = tradeActionCountRef.current;
      const itemName =
        res.visitor.itemKind === 'crop'
          ? CROP_MAP[res.visitor.itemId as CropId]?.nameTh || 'ผลผลิตสวน'
          : PRODUCT_MAP[res.visitor.itemId as ProductId]?.nameTh || 'เมนูคาเฟ่';
      const unitPrice = Math.max(15, Math.round(res.visitor.rewardCoins / Math.max(1, res.visitor.quantity)));
      setChallengeFromMatrix(false);
      setChallengePicked(null);
      if (c % 2 === 1) {
        setActiveChallenge(generateTradeMathChallenge(itemName, res.visitor.quantity, unitPrice, c));
      } else {
        const commBranches: Array<'foreign_lang' | 'thai' | 'social'> = ['foreign_lang', 'thai', 'social'];
        setActiveChallenge(generateSocialCommChallenge(commBranches[c % commBranches.length], c));
      }
    }
  };

  const handleDismissVisitor = (visitorId: string) => {
    persistFarm(dismissVisitorRequest(farmState, visitorId));
    playFarmChime('till', farmState.soundMuted);
  };

  const handleExchangeCoinsForGems = (coinCost = 50, gemGain = 10) => {
    const res = convertFarmCoinsToGems(farmState, coinCost, gemGain);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'เหรียญสวนไม่พอ' : 'Not enough coins', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 10, gemGain, false);
    }
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? 'แลกเพชรสำเร็จ!' : 'Gems Exchanged!',
      message: `-${coinCost} 🪙 → +${gemGain} 💎`,
      tone: 'success',
    });
  };

  const handleRedeemClassroomReward = (item: RewardItem) => {
    if (item.stock <= 0) {
      emitAppToast({ title: lang === 'th' ? 'ของรางวัลหมดสต็อก' : 'Out of stock', message: '', tone: 'warning' });
      return;
    }
    if (playerGems < item.costGems) {
      emitAppToast({
        title: lang === 'th' ? 'เพชร 💎 ยังไม่พอ' : 'Not enough Gems',
        message: lang === 'th' ? `ต้องใช้ ${item.costGems}💎 (ขายให้ลูกค้าคาเฟ่หรือแลก 50🪙→10💎 ได้เลย)` : `Need ${item.costGems} Gems`,
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
      title: lang === 'th' ? `แลก "${item.titleTh}" แล้ว!` : `Redeemed ${item.titleTh}!`,
      message: lang === 'th' ? `ส่งคำขอให้ครูอนุมัติแล้ว (-${item.costGems} 💎)` : `-${item.costGems} Gems`,
      tone: 'success',
    });
  };

  const handleListRoadsideItem = () => {
    const [kindRaw, idRaw] = roadsideItemKey.split(':');
    const itemKind = kindRaw === 'product' ? 'product' : 'crop';
    const itemId = idRaw as CropId | ProductId;
    const res = listItemInRoadsideShop(farmState, itemKind, itemId, roadsideQty, roadsidePrice);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'วางขายไม่สำเร็จ' : 'Cannot list item', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? 'วางขายบนซุ้มหน้าสวนแล้ว!' : 'Listed in Garden Stall!',
      message: `${roadsideQty} ชิ้น · ${roadsidePrice} 🪙`,
      tone: 'success',
    });
  };

  const handleBuyFromNeighborShop = (neighbor: SchoolFarmState, listingId: string) => {
    const res = buyFromNeighborRoadsideShop(farmState, neighbor, listingId);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ซื้อไม่สำเร็จ' : 'Purchase failed', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.buyerState);
    saveSchoolFarmState(schoolId, neighbor.userId, res.sellerState, neighbor.studentId);
    setVisitingNeighbor(res.sellerState);
    playFarmChime('coin', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? `ซื้อจากซุ้มของ ${neighbor.ownerName} สำเร็จ!` : 'Purchased!',
      message: lang === 'th' ? 'เก็บเข้าคลังของคุณแล้ว (+8 XP)' : '+8 XP',
      tone: 'success',
    });
  };

  const handleBuySeed = (cropId: CropId) => {
    const res = buySeedPack(farmState, cropId, 1);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ซื้อเมล็ดไม่สำเร็จ' : 'Cannot buy seed', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
  };

  const handleSellBarn = (cropId: CropId) => {
    const res = sellCropFromBarn(farmState, cropId, 1);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ขายไม่สำเร็จ' : 'Cannot sell', message: res.errorTh || '', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 6, 0, false);
    }
    emitAppToast({
      title: lang === 'th' ? `ขาย ${CROP_MAP[cropId].nameTh} แล้ว` : 'Sold',
      message: `+${res.coinsEarned} 🪙 · +6 XP`,
      tone: 'success',
    });
    if (lifeAutoPromptEnabled && !activeChallenge) {
      tradeActionCountRef.current += 1;
      if (tradeActionCountRef.current % 2 === 1) {
        setChallengeFromMatrix(false);
        setChallengePicked(null);
        setActiveChallenge(
          generateTradeMathChallenge(
            CROP_MAP[cropId].nameTh,
            2,
            res.coinsEarned,
            tradeActionCountRef.current
          )
        );
      }
    }
  };

  const handleLaunchSubjectScenario = (subjectId: LifeSubjectId) => {
    const nextIdx = fieldActionCountRef.current + tradeActionCountRef.current + craftActionCountRef.current + 1;
    fieldActionCountRef.current += 1;
    setChallengeFromMatrix(true);
    setChallengePicked(null);
    setActiveChallenge(generateScenarioForSubject(subjectId, farmState, nextIdx));
  };

  const handleAnswerLifeChallenge = (choiceIdx: number) => {
    if (!activeChallenge || challengePicked !== null) return;
    setChallengePicked(choiceIdx);
    const isCorrect = choiceIdx === activeChallenge.correctIndex;
    const outcome = resolveLifeSubjectChallenge(farmState, activeChallenge, isCorrect, todayDate);
    persistFarm(outcome.state);
    playFarmChime(isCorrect ? 'harvest' : 'weed', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, outcome.xpEarned, isCorrect ? 1 : 0, isCorrect);
    }
  };

  const quizPool = questions.length > 0 ? questions : FALLBACK_BOOST_QUESTIONS;
  const activeQuestion = quizPool[quizIndex % quizPool.length];
  const quizUsedToday = farmState.lastQuizBoostDate === todayDate ? farmState.quizBoostCountToday : 0;

  const handleAnswerBoostQuiz = (choiceIdx: number) => {
    if (quizPicked !== null) return;
    setQuizPicked(choiceIdx);
    if (choiceIdx === activeQuestion.correctIndex) {
      const res = applyQuizBoostReward(farmState, todayDate);
      if (res.ok) {
        persistFarm(res.state);
        playFarmChime('harvest', farmState.soundMuted);
        if (onEarnRewards && currentUser?.id) {
          onEarnRewards(currentUser.id, 15, 1, true);
        }
        emitAppToast({
          title: lang === 'th' ? 'ตอบถูก! รับน้ำและปุ๋ยเพิ่มแล้ว' : 'Correct! Supplies Added',
          message: '💧 +2 · ✨ +1 · 🪙 +18',
          tone: 'success',
        });
      } else {
        emitAppToast({ title: lang === 'th' ? 'ครบโควตาวันนี้แล้ว' : 'Daily cap reached', message: res.errorTh || '', tone: 'info' });
      }
    } else {
      playFarmChime('weed', farmState.soundMuted);
    }
  };

  const handleHelpNeighbor = (neighbor: SchoolFarmState, targetTileIndex?: number) => {
    const res = helpNeighborFarm(farmState, neighbor, todayDate, targetTileIndex);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ช่วยรดน้ำไม่ได้' : 'Cannot help', message: res.errorTh || '', tone: 'info' });
      return;
    }
    persistFarm(res.helperState);
    saveSchoolFarmState(schoolId, neighbor.userId, res.neighborState, neighbor.studentId);
    setVisitingNeighbor(res.neighborState);
    playFarmChime('water', farmState.soundMuted);
    emitAppToast({
      title: res.wateredCropTile
        ? lang === 'th'
          ? `ช่วยรดน้ำต้นไม้ให้ ${neighbor.ownerName} แล้ว!`
          : 'Watered friend’s crop!'
        : lang === 'th'
          ? `ช่วยรดน้ำสวนของ ${neighbor.ownerName} แล้ว!`
          : 'Helped neighbor!',
      message: lang === 'th' ? 'เพื่อนได้ +2 💧 · +10 🪙 และคุณได้ +15 🪙 · +12 XP' : '+15 🪙 · +12 XP',
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
      message: '💧 +3 · ✨ +2 · ★ +1 · 🪙 +30',
      tone: 'success',
    });
  };

  const selectedTile = selectedTileIndex !== null ? farmState.tiles[selectedTileIndex] : null;
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
  const readyQueueCount = (farmState.productionQueue || []).filter((j) => nowMs >= j.readyAtMs).length;
  const activeQueueCount = (farmState.productionQueue || []).length;

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
      emitAppToast({ title: lang === 'th' ? 'หมุนวงล้อวันนี้ครบแล้ว' : 'Already spun today', message: '', tone: 'info' });
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
        title: lang === 'th' ? `วงล้อนำโชค: ${res.slot?.labelTh}!` : `Lucky Wheel: ${res.slot?.labelTh}!`,
        message: lang === 'th' ? 'ส่งเข้าคลังสวนแล้ว' : 'Added to your garden!',
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

  const handleClaimBeginnerPack = () => {
    const res = claimBeginnerPracticePack(farmState);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'รับชุดฝึกหัดแล้ว' : 'Already claimed', message: res.errorTh || '', tone: 'info' });
      return;
    }
    persistFarm(res.state);
    farmAudio.playSfx('gift');
    emitAppToast({
      title: lang === 'th' ? 'รับชุดเสบียงฝึกหัดมือใหม่สำเร็จ!' : 'Starter Pack Claimed!',
      message: '+12💧 · +200🪙 · +4🌱 · +3★ · เมล็ดพันธุ์และผลผลิตเข้าคลังแล้ว',
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
      title: lang === 'th' ? `ซื้อ ${itemName} ×${ad.quantity} แล้ว!` : 'Bought!',
      message: `-${ad.priceCoins} 🪙 · +6 XP`,
      tone: 'success',
    });
  };

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
  const isCareActive = CARE_TOOL_SET.has(activeTool);

  return (
    <div
      ref={rootContainerRef}
      onPointerDownCapture={() => {
        farmAudio.unlockAndStartMusic(farmState.soundMuted, farmState.musicMuted);
      }}
      className={wrapperClass}
    >
      {/* FULL-CANVAS THAI INTEGRATED GARDEN & CAFE WORLD */}
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
        productionQueue={farmState.productionQueue}
        nowMs={nowMs}
        truckAnimating={truckAnimating}
        spinAvailable={spinAvailable}
        onTileActivate={(idx) => executeTileAction(idx)}
        onOpenMarket={() => {
          setCafeTab('orders');
          openBoardWithSfx('cafe');
        }}
        onOpenShop={() => {
          setTradeTab('roadside');
          openBoardWithSfx('trade');
        }}
        onOpenVisitors={() => {
          setCafeTab('visitors');
          openBoardWithSfx('cafe');
        }}
        onOpenProduction={(bId) => {
          setFocusBuildingId(bId || null);
          openBoardWithSfx('craft');
        }}
        onOpenCharacter={() => openBoardWithSfx('character')}
        onOpenWheel={() => {
          setEventsTab('wheel');
          openBoardWithSfx('events');
        }}
        onOpenBarn={() => {
          setTradeTab('seeds_barn');
          openBoardWithSfx('trade');
        }}
        onOpenMail={() => {
          setEventsTab('subjects');
          openBoardWithSfx('events');
        }}
        onAnimalTap={(kind) => {
          farmAudio.playSfx(kind);
          if (kind === 'duck') {
            emitAppToast({
              title: lang === 'th' ? 'ก้าบ ก้าบ! เป็ดน้อยเล่นน้ำในสระบัว' : 'Quack! Ducks in the lotus pond',
              message: lang === 'th' ? 'บรรยากาศสวนธรรมชาติสดชื่นเต็มร้อย' : 'Cozy Thai garden vibes!',
              tone: 'info',
            });
          }
        }}
      />

      {/* TOP-LEFT FLOATING TRANSLUCENT GAME CREST */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex items-center gap-1.5 max-w-[60vw] pointer-events-auto">
        <GardenHudIconBtn
          size="sm"
          tone="bamboo"
          onClick={() => {
            if (onExit) onExit();
            else setIsFullscreen((prev) => !prev);
          }}
          ariaLabel={onExit ? 'ออกจากสวน' : 'สลับเต็มจอ'}
        >
          {onExit ? (
            <ArrowLeft className="w-4 h-4 text-[#45270f]" strokeWidth={2.6} />
          ) : isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-[#45270f]" strokeWidth={2.5} />
          ) : (
            <Maximize2 className="w-4 h-4 text-[#45270f]" strokeWidth={2.5} />
          )}
        </GardenHudIconBtn>

        <button
          type="button"
          onClick={() => {
            setEventsTab('achievements');
            openBoardWithSfx('events');
          }}
          aria-label="เลเวลและความสำเร็จ"
          className="flex items-center cursor-pointer active:scale-95 transition shrink-0"
        >
          <GardenLevelCrest level={townLevelInfo.level} className="w-11 h-11 relative z-10 drop-shadow" />
          <div className="hidden md:flex flex-col -ml-3.5 pl-4.5 pr-2.5 py-1 rounded-r-full bg-[#241b11]/75 backdrop-blur-md border border-[#d6b37c]/70 shadow">
            <div className="w-20 h-2 rounded-full bg-black/45 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4ade80] via-[#a3e635] to-[#facc15]"
                style={{ width: `${xpProgressPct}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-amber-100 tabular-nums leading-tight mt-0.5">
              XP {townLevelInfo.currentIntoLevel}/{townLevelInfo.nextLevelNeed}
            </span>
          </div>
        </button>

        <GardenHudIconBtn
          size="md"
          tone="bamboo"
          onClick={() => openBoardWithSfx('character')}
          ariaLabel="แต่งตัวเจ้าของสวน"
        >
          <FarmOwnerPortraitSvg character={farmState.ownerCharacter} className="w-9 h-9 rounded-xl" />
        </GardenHudIconBtn>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#241b11]/65 backdrop-blur-md border border-[#d6b37c]/55 text-amber-50">
          <span className="text-xs font-black truncate max-w-[140px]">{farmState.farmName}</span>
          <button
            type="button"
            onClick={() => {
              setFarmNameDraft(farmState.farmName);
              setIsEditingFarmName(true);
            }}
            aria-label="เปลี่ยนชื่อสวน"
            className="text-amber-300 hover:text-white cursor-pointer shrink-0"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {hasGoldenStreakBuff && (
            <span className="text-[10px] font-black text-yellow-300 whitespace-nowrap">✨×2</span>
          )}
        </div>
      </div>

      {/* TOP-RIGHT COMPACT CURRENCY & AUDIO BAR */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex items-start gap-2 pointer-events-auto">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#241b11]/72 backdrop-blur-md border border-[#d6b37c]/65 text-white shadow">
            <span className="flex items-center gap-1 text-xs sm:text-sm font-black tabular-nums">
              {farmState.coins.toLocaleString()}
              <GardenCoinCrest className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span className="w-px h-3.5 bg-amber-200/35" />
            <span className="flex items-center gap-1 text-xs sm:text-sm font-black tabular-nums">
              {playerGems.toLocaleString()}
              <GardenGemCrest className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#241b11]/60 backdrop-blur-sm text-[10px] font-black text-amber-100 tabular-nums">
            <span>💧{farmState.water}</span>
            <span>🌱{farmState.dailyFertilizer || 0}</span>
            <span>✨{farmState.fertilizer}</span>
            <span>★{farmState.townStars}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <GardenHudIconBtn
            size="md"
            tone="emerald"
            readyMark={disciplineSummary.hasAnythingToClaim}
            onClick={() => openBoardWithSfx('chest')}
            ariaLabel="ตะกร้าเสบียงวินัยเรียน"
          >
            <GardenGiftBasketIcon className="w-7 h-7" />
          </GardenHudIconBtn>

          <GardenHudIconBtn
            size="sm"
            tone="bamboo"
            onClick={() => {
              const nextMuted = !farmState.musicMuted;
              persistFarm({ ...farmState, musicMuted: nextMuted });
              farmAudio.setMutedState(farmState.soundMuted, nextMuted);
              if (!nextMuted) farmAudio.playSfx('tap');
            }}
            ariaLabel={farmState.musicMuted ? 'เปิดเพลง' : 'ปิดเพลง'}
          >
            <Music className={`w-4 h-4 ${farmState.musicMuted ? 'opacity-40' : 'text-[#15803d]'}`} />
          </GardenHudIconBtn>

          <GardenHudIconBtn
            size="sm"
            tone="bamboo"
            onClick={() => {
              const nextMuted = !farmState.soundMuted;
              persistFarm({ ...farmState, soundMuted: nextMuted });
              farmAudio.setMutedState(nextMuted, farmState.musicMuted);
              if (!nextMuted) farmAudio.playSfx('tap');
            }}
            ariaLabel={farmState.soundMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {farmState.soundMuted ? <VolumeX className="w-4 h-4 opacity-50" /> : <Volume2 className="w-4 h-4 text-[#45270f]" />}
          </GardenHudIconBtn>

          <GardenHudIconBtn
            size="sm"
            tone="bamboo"
            onClick={() => openBoardWithSfx('guide')}
            ariaLabel="คู่มือเล่นสวน"
          >
            <HelpCircle className="w-4 h-4 text-[#45270f]" />
          </GardenHudIconBtn>
        </div>
      </div>

      {/* COMPACT MOBILE LANDSCAPE PROMPT */}
      {isPortraitMobile && !dismissedPortraitHint && (
        <div className="absolute top-16 inset-x-3 z-20 rounded-2xl border border-[#d6b37c] bg-[#2c2116]/90 backdrop-blur-md text-amber-50 px-3 py-2 flex items-center justify-between gap-2 shadow-xl">
          <div className="flex items-center gap-2 min-w-0 text-[11px] font-bold">
            <RotateCw className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="truncate">หมุนจอแนวนอน เพื่อชมวิวสวนคาเฟ่เต็มตา</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void requestLandscapeFullscreen()}
              className="min-h-[30px] px-2.5 rounded-xl bg-amber-400 text-amber-950 text-[11px] font-black cursor-pointer"
            >
              เต็มจอ
            </button>
            <button
              type="button"
              onClick={() => setDismissedPortraitHint(true)}
              aria-label="ปิดคำแนะนำ"
              className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* INLINE FARM RENAME POPOVER */}
      {isEditingFarmName && (
        <div className="absolute top-16 left-3 z-30 rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec] p-2.5 shadow-xl flex items-center gap-2">
          <input
            type="text"
            maxLength={32}
            value={farmNameDraft}
            onChange={(e) => setFarmNameDraft(e.target.value)}
            placeholder="ตั้งชื่อสวนคาเฟ่..."
            className="min-h-[36px] px-2.5 rounded-xl border border-[#d6b37c] bg-white text-xs text-slate-900"
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
            className="min-h-[36px] px-3 rounded-xl bg-[#15803d] text-white text-xs font-black cursor-pointer"
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

      {/* LEFT-SIDE COMPACT 3-MEDALLION GAME RAIL */}
      <div className="absolute left-2.5 sm:left-3.5 bottom-20 sm:bottom-4 z-20 flex flex-col gap-2.5 pointer-events-auto">
        <GardenHudIconBtn
          size="md"
          tone="amber"
          badgeCount={dailyDirtAds.length}
          onClick={() => openBoardWithSfx('newspaper')}
          ariaLabel="ข่าวตลาดชุมชน"
        >
          <GardenGazetteIcon className="w-7 h-7" />
        </GardenHudIconBtn>

        <GardenHudIconBtn
          size="md"
          tone="emerald"
          badgeCount={readyQueueCount > 0 ? readyQueueCount : activeQueueCount > 0 ? activeQueueCount : undefined}
          readyMark={readyQueueCount > 0}
          onClick={() => {
            setFocusBuildingId(null);
            openBoardWithSfx('craft');
          }}
          ariaLabel="โรงชง & ครัวแปรรูป"
        >
          <GardenMortarCraftIcon className="w-7 h-7" />
        </GardenHudIconBtn>

        <GardenHudIconBtn
          size="md"
          tone="rose"
          badgeCount={unclaimedAchievementCount > 0 ? unclaimedAchievementCount : undefined}
          readyMark={spinAvailable || Math.max(0, 3 - quizUsedToday) > 0}
          onClick={() => openBoardWithSfx('events')}
          ariaLabel="กิจกรรม วงล้อ & ควิซ"
        >
          <GardenEventsIcon className="w-7 h-7" />
        </GardenHudIconBtn>
      </div>

      {/* RIGHT-SIDE COMPACT 3-MEDALLION GAME RAIL */}
      <div className="absolute right-2.5 sm:right-3.5 bottom-20 sm:bottom-4 z-20 flex flex-col gap-2.5 items-end pointer-events-auto">
        <GardenHudIconBtn
          size="lg"
          tone="indigo"
          badgeCount={farmState.visitorQueue.length + farmState.marketOrders.length}
          onClick={() => openBoardWithSfx('cafe')}
          ariaLabel="คาเฟ่ในสวน & ออเดอร์ส่ง"
        >
          <GardenCafeCupIcon className="w-8 h-8" />
        </GardenHudIconBtn>

        <GardenHudIconBtn
          size="md"
          tone="amber"
          badgeCount={activeRoadsideCount > 0 ? activeRoadsideCount : undefined}
          onClick={() => openBoardWithSfx('trade')}
          ariaLabel="ตลาดชุมชน & ยุ้งฉาง"
        >
          <GardenStallIcon className="w-7 h-7" />
        </GardenHudIconBtn>

        <GardenHudIconBtn
          size="md"
          tone="emerald"
          onClick={() => {
            setVisitingNeighbor(null);
            openBoardWithSfx('town');
          }}
          ariaLabel="เยี่ยมชมสวนเพื่อนบ้าน"
        >
          <GardenNeighborsIcon className="w-7 h-7" />
        </GardenHudIconBtn>
      </div>

      {/* SLIM FLOATING SELECTED TILE POPOVER */}
      {selectedTile && activeTool !== 'plant' && activeTool !== 'build' && !careTrayOpen && (
        <div className="absolute bottom-[78px] left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-20 z-20 w-[250px] rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec]/95 backdrop-blur-md p-2.5 shadow-[0_8px_22px_rgba(0,0,0,0.4)] space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-[#45270f] truncate">
              {!selectedTile.unlocked
                ? `แปลง #${selectedTile.index + 1} (ล็อก)`
                : selectedTile.kind === 'crop' && selectedTile.cropId
                  ? CROP_MAP[selectedTile.cropId].nameTh
                  : selectedTile.kind === 'building' && selectedTile.buildingId
                    ? `${BUILDING_MAP[selectedTile.buildingId].nameTh} Lv.${selectedTile.buildingLevel || 1}`
                    : selectedTile.kind === 'weed'
                      ? 'วัชพืชกวนสวน'
                      : selectedTile.tilled
                        ? `แปลง #${selectedTile.index + 1} พร้อมปลูก`
                        : `สนามหญ้า #${selectedTile.index + 1}`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTileIndex(null)}
              aria-label="ปิดป๊อปอัป"
              className="w-6 h-6 rounded-full bg-amber-200/80 text-[#78350f] flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedTile.kind === 'crop' && selectedTile.cropId && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#7c5c3e] tabular-nums">
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
                    className="min-h-[34px] rounded-xl bg-sky-600 text-white text-[10px] font-black cursor-pointer"
                  >
                    รดน้ำ 💧
                  </button>
                  <button
                    type="button"
                    onClick={() => executeTileAction(selectedTile.index, 'daily_fertilize')}
                    className="min-h-[34px] rounded-xl bg-emerald-600 text-white text-[10px] font-black cursor-pointer"
                  >
                    ปุ๋ยวัน 🌱
                  </button>
                  <button
                    type="button"
                    onClick={() => executeTileAction(selectedTile.index, 'fertilize')}
                    className="min-h-[34px] rounded-xl bg-amber-500 text-white text-[10px] font-black cursor-pointer"
                  >
                    ปุ๋ยทอง ✨
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => executeTileAction(selectedTile.index, 'harvest')}
                  className="w-full min-h-[36px] rounded-xl bg-[#15803d] text-white text-xs font-black cursor-pointer"
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
              className="w-full min-h-[36px] rounded-xl bg-rose-600 text-white text-xs font-black cursor-pointer"
            >
              ถอนวัชพืช (-1 💧)
            </button>
          )}

          {selectedTile.kind === 'empty' && selectedTile.unlocked && (
            !selectedTile.tilled ? (
              <button
                type="button"
                onClick={() => executeTileAction(selectedTile.index, 'till')}
                className="w-full min-h-[36px] rounded-xl bg-amber-600 text-white text-xs font-black cursor-pointer"
              >
                พรวนดินเตรียมปลูก
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTool('plant')}
                className="w-full min-h-[36px] rounded-xl bg-[#15803d] text-white text-xs font-black cursor-pointer"
              >
                เลือกเมล็ดพันธุ์ลงปลูก
              </button>
            )
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
                      openBoardWithSfx('craft');
                    }}
                    className="flex-1 min-h-[34px] px-2.5 rounded-xl bg-[#15803d] text-white text-[11px] font-black inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>แปรรูป/รับของ</span>
                  </button>
                )}
                {canUpgrade && upgCost && (
                  <button
                    type="button"
                    onClick={() => handleUpgradeBuilding(selectedTile.index)}
                    className="flex-1 min-h-[34px] px-2.5 rounded-xl bg-indigo-600 text-white text-[11px] font-black inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>Lv.{curLv + 1} ({upgCost.coinCost}🪙)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveBuilding(selectedTile.index)}
                  aria-label="รื้อถอนอาคาร"
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
              className="w-full min-h-[36px] rounded-xl bg-violet-600 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
            >
              <LockOpen className="w-3.5 h-3.5" />
              <span>ปลดล็อก ({getPlotUnlockStarCost(farmState.tiles.filter((t) => t.unlocked).length)} ★)</span>
            </button>
          )}
        </div>
      )}

      {/* SLIM 5-ACTION CONTEXTUAL BOTTOM BAMBOO DOCK */}
      <div className="absolute bottom-2.5 inset-x-14 sm:inset-x-24 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        {/* Horizontal Seed Pop-out Strip */}
        {activeTool === 'plant' && (
          <div className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec]/95 backdrop-blur-md shadow-xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                  className={`min-h-[44px] px-2.5 py-1 rounded-xl border-2 flex items-center gap-1.5 shrink-0 cursor-pointer transition disabled:opacity-45 disabled:cursor-not-allowed ${
                    selected
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-950'
                      : 'border-[#d6b37c]/70 bg-white text-[#45270f]'
                  }`}
                >
                  <GardenItemIcon kind="crop" id={crop.id} className="w-6 h-6 shrink-0" />
                  <div className="text-left">
                    <div className="text-[11px] font-black whitespace-nowrap tabular-nums">
                      {lang === 'th' ? crop.nameTh : crop.nameEn} ×{owned}
                    </div>
                    <div className="text-[9px] font-bold text-[#7c5c3e] whitespace-nowrap tabular-nums">
                      {unlocked ? `💧${crop.watersNeeded} · ${crop.sellPrice}🪙` : `Lv.${crop.unlockTownLevel}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Care Sub-Tools Strip */}
        {careTrayOpen && (
          <div className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec]/95 backdrop-blur-md shadow-xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CARE_TOOLS.map((tool) => {
              const selected = activeTool === tool.id;
              const badge =
                tool.id === 'water'
                  ? farmState.water
                  : tool.id === 'daily_fertilize'
                    ? farmState.dailyFertilizer || 0
                    : tool.id === 'fertilize'
                      ? farmState.fertilizer
                      : tool.id === 'clear_weed' && weedCount > 0
                        ? weedCount
                        : undefined;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    farmAudio.playSfx('tap');
                    setLastCareTool(tool.id);
                    setActiveTool(tool.id);
                    setCareTrayOpen(false);
                  }}
                  className={`relative min-h-[42px] px-2.5 py-1 rounded-xl border-2 flex items-center gap-1.5 shrink-0 cursor-pointer transition ${
                    selected
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-950'
                      : 'border-[#d6b37c]/70 bg-white text-[#45270f]'
                  }`}
                >
                  <GardenToolIcon tool={tool.id} className="w-5 h-5" />
                  <span className="text-[11px] font-black whitespace-nowrap">
                    {lang === 'th' ? tool.labelTh : tool.labelEn}
                  </span>
                  {badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-[#78350f] text-[9px] font-black tabular-nums">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Building Pop-out Strip */}
        {activeTool === 'build' && (
          <div className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec]/95 backdrop-blur-md shadow-xl p-1.5 space-y-1.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'production', label: 'คาเฟ่ & แปรรูป' },
                  { id: 'landmark', label: 'แลนด์มาร์กสวน' },
                  { id: 'decor', label: 'รั้ว & ทางเดิน' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setBuildCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                    buildCategoryFilter === cat.id
                      ? 'bg-[#15803d] text-white'
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
                    className={`min-h-[44px] px-2.5 py-1 rounded-xl border-2 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-amber-600 bg-amber-100 text-[#45270f]'
                        : 'border-[#d6b37c]/70 bg-white text-[#45270f]'
                    }`}
                  >
                    <GardenBuildingBadgeIcon buildingId={b.id} className="w-6 h-6 shrink-0" />
                    <div className="text-left">
                      <div className="text-[11px] font-black flex items-center gap-1 whitespace-nowrap">
                        {!unlocked && <Lock className="w-3 h-3" />}
                        <span>{lang === 'th' ? b.nameTh : b.nameEn}</span>
                      </div>
                      <div className="text-[9px] font-bold text-[#7c5c3e] whitespace-nowrap tabular-nums">
                        {unlocked ? `${b.coinCost}🪙 · ${b.starCost}★` : `Lv.${b.unlockTownLevel}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick 8x8 Expand Strip when Unlock tool is active */}
        {activeTool === 'unlock' && gridSize === 6 && (
          <div className="pointer-events-auto rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec]/95 backdrop-blur-md shadow-xl p-1.5 flex items-center gap-2">
            <span className="text-[11px] font-black text-[#45270f] pl-1">
              แตะช่องล็อกเพื่อขยายทีละแปลง หรือ
            </span>
            <button
              type="button"
              onClick={handleExpandTo8x8}
              className="min-h-[36px] px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Grid2X2Plus className="w-3.5 h-3.5" />
              <span>ขยายอาณาเขต 8×8 (4★)</span>
            </button>
          </div>
        )}

        {/* THE 5-ACTION COMPACT BAMBOO GAME DOCK */}
        <div
          role="toolbar"
          aria-label="แถบเครื่องมือดูแลสวน"
          className="pointer-events-auto max-w-full rounded-2xl border-2 border-[#c8a165]/90 bg-[#3a2714]/82 backdrop-blur-md shadow-[0_6px_20px_rgba(10,18,8,0.45)] p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {/* 1. Tap / Harvest */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setCareTrayOpen(false);
              setActiveTool('inspect');
            }}
            className={`relative min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shrink-0 ${
              activeTool === 'inspect'
                ? 'bg-gradient-to-b from-[#fef3c7] to-[#fde68a] text-[#45270f] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool="inspect" className="w-5 h-5" />
            <span className="text-[10px] font-black whitespace-nowrap">แตะ/เก็บ</span>
            {readyCropCount + readyBuildingCount + readyQueueCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-emerald-500 border border-white text-[9px] font-black text-white flex items-center justify-center tabular-nums">
                {readyCropCount + readyBuildingCount + readyQueueCount}
              </span>
            )}
          </button>

          {/* 2. Plant Seeds */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setCareTrayOpen(false);
              setActiveTool((p) => (p === 'plant' ? 'inspect' : 'plant'));
            }}
            className={`relative min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shrink-0 ${
              activeTool === 'plant'
                ? 'bg-gradient-to-b from-[#dcfce7] to-[#86efac] text-[#064e3b] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool="plant" className="w-5 h-5" />
            <span className="text-[10px] font-black whitespace-nowrap">ปลูกพืช</span>
          </button>

          {/* 3. Care (Water / Till / Fertilizer / Weed) */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              if (!isCareActive) {
                setActiveTool(lastCareTool);
                setCareTrayOpen(true);
              } else {
                setCareTrayOpen((p) => !p);
              }
            }}
            className={`relative min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shrink-0 ${
              isCareActive || careTrayOpen
                ? 'bg-gradient-to-b from-[#e0f2fe] to-[#7dd3fc] text-[#0c4a6e] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool={isCareActive ? activeTool : lastCareTool} className="w-5 h-5" />
            <span className="text-[10px] font-black whitespace-nowrap">
              {isCareActive
                ? CARE_TOOLS.find((t) => t.id === activeTool)?.labelTh || 'ดูแล'
                : 'ดูแลสวน'}
            </span>
            {weedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 border border-white text-[9px] font-black text-white flex items-center justify-center tabular-nums">
                {weedCount}
              </span>
            )}
          </button>

          {/* 4. Build Garden / Cafe */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setCareTrayOpen(false);
              setActiveTool((p) => (p === 'build' ? 'inspect' : 'build'));
            }}
            className={`relative min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shrink-0 ${
              activeTool === 'build'
                ? 'bg-gradient-to-b from-[#fef3c7] to-[#fcd34d] text-[#78350f] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool="build" className="w-5 h-5" />
            <span className="text-[10px] font-black whitespace-nowrap">สร้างสวน</span>
          </button>

          {/* 5. Unlock / Expand */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setCareTrayOpen(false);
              setActiveTool((p) => (p === 'unlock' ? 'inspect' : 'unlock'));
            }}
            className={`relative min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shrink-0 ${
              activeTool === 'unlock'
                ? 'bg-gradient-to-b from-[#ede9fe] to-[#c4b5fd] text-[#4c1d95] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool="unlock" className="w-5 h-5" />
            <span className="text-[10px] font-black whitespace-nowrap">ขยายที่</span>
          </button>
        </div>
      </div>

      {/* LIGHTWEIGHT FLOATING COZY GAME BOARDS (NO BULKY OPAQUE ERP MODALS) */}
      <GardenBoardSet
        activeBoard={activeBoard}
        onClose={() => openBoardWithSfx(null)}
        lang={lang}
        farmState={farmState}
        nowMs={nowMs}
        playerGems={playerGems}
        todayDate={todayDate}
        sellMultiplier={sellMultiplier}
        disciplineSummary={disciplineSummary}
        hasGoldenStreakBuff={hasGoldenStreakBuff}
        focusBuildingId={focusBuildingId}
        setFocusBuildingId={setFocusBuildingId}
        cafeTab={cafeTab}
        setCafeTab={setCafeTab}
        tradeTab={tradeTab}
        setTradeTab={setTradeTab}
        eventsTab={eventsTab}
        setEventsTab={setEventsTab}
        onStartProduction={handleStartProduction}
        onCollectJob={handleCollectProductionJob}
        onCollectAllBuilding={handleCollectAllBuilding}
        onSpeedUpJob={handleSpeedUpJob}
        onJumpToBuild={handleJumpToBuild}
        onFulfillVisitor={handleFulfillVisitor}
        onDismissVisitor={handleDismissVisitor}
        onFulfillOrder={handleFulfillOrder}
        roadsideItemKey={roadsideItemKey}
        setRoadsideItemKey={setRoadsideItemKey}
        roadsideQty={roadsideQty}
        setRoadsideQty={setRoadsideQty}
        roadsidePrice={roadsidePrice}
        setRoadsidePrice={setRoadsidePrice}
        onListRoadside={handleListRoadsideItem}
        onBuySeed={handleBuySeed}
        onSellBarn={handleSellBarn}
        onExchangeGems={() => handleExchangeCoinsForGems(50, 10)}
        rewardItems={rewardItems}
        onRedeemReward={handleRedeemClassroomReward}
        wheelSpinning={wheelSpinning}
        wheelAngle={wheelAngle}
        wheelWonSlot={wheelWonSlot}
        spinAvailable={spinAvailable}
        onSpinWheel={handleSpinWheel}
        achievementsList={achievementsList}
        onClaimAchievement={handleClaimAchievement}
        activeQuestion={activeQuestion}
        quizPicked={quizPicked}
        quizUsedToday={quizUsedToday}
        onAnswerQuiz={handleAnswerBoostQuiz}
        onNextQuiz={() => {
          setQuizPicked(null);
          setQuizIndex((prev) => prev + 1);
        }}
        lifeAutoPromptEnabled={lifeAutoPromptEnabled}
        onToggleLifeAutoPrompt={() => setLifeAutoPromptEnabled((prev) => !prev)}
        onLaunchSubjectScenario={handleLaunchSubjectScenario}
        neighbors={neighbors}
        visitingNeighbor={visitingNeighbor}
        setVisitingNeighbor={setVisitingNeighbor}
        isStaff={isStaff}
        onHelpNeighbor={handleHelpNeighbor}
        onBuyFromNeighbor={handleBuyFromNeighborShop}
        onTeacherGift={handleTeacherSendGift}
        onClaimChest={handleClaimDisciplineChest}
        onClaimBeginnerPack={handleClaimBeginnerPack}
        dailyDirtAds={dailyDirtAds}
        onBuyDailyDirtAd={handleBuyDailyDirtAd}
        onOpenChest={() => openBoardWithSfx('chest')}
        charDraft={charDraft}
        setCharDraft={setCharDraft}
        onSaveCharacter={() => {
          persistFarm(updateFarmOwnerCharacter(farmState, charDraft));
          farmAudio.playSfx('gift');
          openBoardWithSfx(null);
          emitAppToast({
            title: lang === 'th' ? 'บันทึกสไตล์เจ้าของสวนแล้ว!' : 'Garden Owner Updated!',
            message: lang === 'th' ? 'ตัวละครใหม่เดินดูแลสวนคาเฟ่ของคุณแล้ว' : 'Your farmer look is live on the board.',
            tone: 'success',
          });
        }}
      />

      {/* REAL-LIFE 8-SUBJECT CONTEXTUAL CHALLENGE POP-UP */}
      <LiveSubjectChallengeCard
        challenge={activeChallenge}
        pickedIndex={challengePicked}
        canNext={challengeFromMatrix}
        onSelectOption={handleAnswerLifeChallenge}
        onNextSameSubject={
          activeChallenge
            ? () => handleLaunchSubjectScenario(activeChallenge.subjectId)
            : undefined
        }
        onClose={() => {
          setActiveChallenge(null);
          setChallengePicked(null);
        }}
      />
    </div>
  );
};
