import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpCircle,
  Building2,
  ChefHat,
  Grid2X2Plus,
  HelpCircle,
  LayoutGrid,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Music,
  Pencil,
  RotateCw,
  Settings,
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
  buyCapitalToken,
  buyDailyDirtBargain,
  buyFromNeighborRoadsideShop,
  buySeedPack,
  calculateTownProsperity,
  CAPITAL_TOKEN_BUY_COST,
  CAREER_MAP,
  claimBeginnerPracticePack,
  claimCareerStartupGrant,
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
  EXTRA_LUCKY_WHEEL_COST,
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
  spinExtraLuckyWheel,
  switchCareerPath,
  syncBehaviorWeedsOntoFarm,
  tillPlotTile,
  unlockPlotTile,
  updateFarmOwnerCharacter,
  upgradeBuildingOnTile,
  waterTile,
  type BuildingId,
  type CareerPathId,
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
  GardenCapitalTokenIcon,
  GardenCareerIcon,
  GardenCoinCrest,
  GardenEventsIcon,
  GardenGazetteIcon,
  GardenGemCrest,
  GardenGiftBasketIcon,
  GardenItemIcon,
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
  shuffleOptionsForDate,
  type LifeChallengeScenario,
  type LifeSubjectId,
} from '../lib/farmLifeSubjects';
import { LifeCitySimulationView } from '../components/games/LifeCitySimulationView';
import {
  loadLifeCityState,
  saveLifeCityState,
  type CityActionResult,
  type LifeCityState,
} from '../lib/lifeCityEngine';

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
  'lotus_fish_pond',
  'fishery_pier',
  'garden_cafe',
  'herbal_pavilion',
  'thai_kitchen',
  'craft_studio',
  'digital_hub',
  'chicken_coop',
  'dairy_barn',
  'sheep_pen',
  'juice_stand',
  'windmill_bakery',
]);

const CARE_TOOLS: Array<{
  id: FarmTool;
  labelTh: string;
  labelEn: string;
  descTh: string;
  descEn: string;
}> = [
  { id: 'water', labelTh: 'รดน้ำ', labelEn: 'Water', descTh: 'เติมน้ำให้พืชเติบโต +1 ขั้น', descEn: 'Water crops +1 stage' },
  { id: 'till', labelTh: 'พรวนดิน', labelEn: 'Till', descTh: 'เตรียมแปลงหญ้าให้พร้อมปลูก', descEn: 'Prepare grass plot for planting' },
  { id: 'daily_fertilize', labelTh: 'ปุ๋ยวัน', labelEn: 'Compost', descTh: 'เร่งโต +1 ขั้น โดยไม่ใช้น้ำ', descEn: 'Grow +1 stage without water' },
  { id: 'fertilize', labelTh: 'ปุ๋ยทอง ×2', labelEn: 'Gold×2', descTh: 'สุกทันที และได้ผลผลิต ×2', descEn: 'Instant mature & 2x harvest' },
  { id: 'clear_weed', labelTh: 'ถอนวัชพืช', labelEn: 'Weed', descTh: 'กำจัดวัชพืชที่ขวางแปลง (-1💧)', descEn: 'Remove weeds (-1 water)' },
];

type DockMenuKind = 'none' | 'inspect' | 'plant' | 'care' | 'build' | 'hub' | 'profile' | 'supplies' | 'settings';

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
  {
    id: 'farm-q4',
    subject: 'การงานอาชีพ (ประมง)',
    gradeLevel: 'ทั่วไป',
    questionTh: 'การเลี้ยงปลานิลในบ่อเกษตรผสมผสานควรดูแลคุณภาพน้ำข้อใดสำคัญที่สุดเพื่อไม่ให้ปลาขาดอากาศ?',
    questionEn: 'What water quality factor is most critical to prevent pond fish suffocation?',
    options: [
      'รักษาระดับออกซิเจนละลายน้ำและไม่ให้อาหารเหลือเน่าเสีย',
      'ปิดผิวน้ำให้สนิทไม่ให้โดนอากาศเลย',
      'เทน้ำสบู่ลงในบ่อทุกวัน',
      'ปล่อยน้ำจนแห้งขอดตลอดเวลา',
    ],
    correctIndex: 0,
    explanationTh: 'ออกซิเจนละลายน้ำ (DO) ที่เพียงพอและน้ำสะอาดช่วยให้ปลาโตไว แข็งแรง',
    category: 'review',
    points: 10,
  },
  {
    id: 'farm-q5',
    subject: 'การงานอาชีพ (สร้างกิจการ)',
    gradeLevel: 'ทั่วไป',
    questionTh: 'เมื่อต้องการนำเงินทุนสร้างกิจการไปเปิดร้านใหม่ ข้อใดช่วยลดความเสี่ยงขาดทุนได้ดีที่สุด?',
    questionEn: 'When starting a new business with startup capital, what reduces financial risk best?',
    options: [
      'คำนวณต้นทุน-กำไร และกันเงินทุนหมุนเวียนสำรองไว้',
      'ใช้เงินทั้งหมดในวันแรกโดยไม่วางแผน',
      'ตั้งราคาขายต่ำกว่าต้นทุนทุกชิ้น',
      'ไม่ดูความต้องการของลูกค้าเลย',
    ],
    correctIndex: 0,
    explanationTh: 'การวางแผนต้นทุนและมีทุนหมุนเวียนช่วยให้กิจการเดินต่อได้มั่นคงแม้เริ่มทดลองอาชีพใหม่',
    category: 'review',
    points: 10,
  },
  {
    id: 'farm-q6',
    subject: 'สุขศึกษา',
    gradeLevel: 'ทั่วไป',
    questionTh: 'ผลไม้เมืองร้อนอย่างกล้วยหอมทองอุดมไปด้วยแร่ธาตุใดที่ช่วยป้องกันตะคริว?',
    questionEn: 'Which mineral rich in bananas helps prevent muscle cramps?',
    options: ['โพแทสเซียม', 'ปรอท', 'ตะกั่ว', 'กำมะถัน'],
    correctIndex: 0,
    explanationTh: 'โพแทสเซียมในกล้วยช่วยให้กล้ามเนื้อและระบบประสาททำงานสมดุล',
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
  const [worldMode, setWorldMode] = useState<'farm' | 'city'>('farm');
  const [cityState, setCityState] = useState<LifeCityState>(() => loadLifeCityState(schoolId, userId, students));
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissedPortraitHint, setDismissedPortraitHint] = useState(false);

  const [activeTool, setActiveTool] = useState<FarmTool>('inspect');
  const [lastCareTool, setLastCareTool] = useState<FarmTool>('water');
  const [openMenu, setOpenMenu] = useState<DockMenuKind>('none');
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
  const latestFarmStateRef = useRef(farmState);
  latestFarmStateRef.current = farmState;
  const wheelSpinningRef = useRef(false);
  const wheelTimersRef = useRef<number[]>([]);

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
    setOpenMenu('none');
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
      setCityState(loadLifeCityState(schoolId, userId, students));
      setNeighborSyncTick((t) => t + 1);
    };
    hydrateFromStore();
    window.addEventListener(CAMPUS_DATA_UPDATED_EVENT, hydrateFromStore);
    return () => window.removeEventListener(CAMPUS_DATA_UPDATED_EVENT, hydrateFromStore);
  }, [schoolId, userId, matchedStudent?.id, currentUser?.studentRecordId, ownerName, ownerRoom, students]);

  const handleApplyCityResult = (result: CityActionResult) => {
    setCityState(result.state);
    saveLifeCityState(schoolId, userId, result.state);

    const hasFarmSync =
      result.coinDelta !== 0 ||
      Boolean(result.xpGain) ||
      Boolean(result.barnDelta) ||
      Boolean(result.goodsDelta);

    if (hasFarmSync) {
      const nextBarn = { ...farmState.barn };
      if (result.barnDelta) {
        (Object.entries(result.barnDelta) as Array<[CropId, number]>).forEach(([k, delta]) => {
          nextBarn[k] = Math.max(0, (nextBarn[k] || 0) + delta);
        });
      }
      const nextGoods = { ...farmState.goods };
      if (result.goodsDelta) {
        (Object.entries(result.goodsDelta) as Array<[ProductId, number]>).forEach(([k, delta]) => {
          nextGoods[k] = Math.max(0, (nextGoods[k] || 0) + delta);
        });
      }
      persistFarm({
        ...farmState,
        coins: Math.max(0, farmState.coins + result.coinDelta),
        farmXp: farmState.farmXp + (result.xpGain || 0),
        barn: nextBarn,
        goods: nextGoods,
        updatedAt: new Date().toISOString(),
      });
    }

    if (onEarnRewards && currentUser?.id && ((result.xpGain || 0) > 0 || (result.gemGain || 0) > 0)) {
      onEarnRewards(currentUser.id, result.xpGain || 0, result.gemGain || 0, true);
    }
  };

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
          setActiveChallenge(
            generateCropScienceChallenge(wateredCropId, fieldActionCountRef.current, todayDate)
          );
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
          setActiveChallenge(
            generateCropScienceChallenge(cropId, fieldActionCountRef.current, todayDate)
          );
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
          setActiveChallenge(
            generateCropScienceChallenge(res.cropId, fieldActionCountRef.current, todayDate)
          );
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
            tileIndex,
            todayDate
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
        setActiveChallenge(
          generateCraftLifeChallenge(productId, craftActionCountRef.current, todayDate)
        );
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
    setOpenMenu('none');
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
        generateTradeMathChallenge(
          cropName,
          res.order.quantity,
          unitPrice,
          tradeActionCountRef.current,
          todayDate
        )
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
        setActiveChallenge(
          generateTradeMathChallenge(itemName, res.visitor.quantity, unitPrice, c, todayDate)
        );
      } else {
        const commBranches: Array<'foreign_lang' | 'thai' | 'social'> = ['foreign_lang', 'thai', 'social'];
        setActiveChallenge(
          generateSocialCommChallenge(commBranches[c % commBranches.length], c, todayDate)
        );
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
            tradeActionCountRef.current,
            todayDate
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
    setActiveChallenge(generateScenarioForSubject(subjectId, farmState, nextIdx, todayDate));
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

  const quizPool = useMemo(() => {
    const source = questions.length > 0 ? questions : FALLBACK_BOOST_QUESTIONS;
    return source.map((q, idx) => {
      const shuffled = shuffleOptionsForDate(
        q.options,
        q.correctIndex,
        todayDate,
        `boost-${q.id || idx}-${q.questionTh}`
      );
      return {
        ...q,
        options: shuffled.options,
        correctIndex: shuffled.correctIndex,
      };
    });
  }, [questions, todayDate]);
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

  useEffect(() => {
    return () => {
      wheelTimersRef.current.forEach((id) => window.clearTimeout(id));
      wheelTimersRef.current = [];
    };
  }, []);

  const handleSpinWheel = () => {
    if (wheelSpinning || wheelSpinningRef.current) return;
    const isFreeSpin = latestFarmStateRef.current.lastSpinWheelDate !== todayDate;
    const previewRes = isFreeSpin
      ? spinDailyLuckyWheel(latestFarmStateRef.current, todayDate)
      : spinExtraLuckyWheel(latestFarmStateRef.current);

    if (!previewRes.ok || !previewRes.slot) {
      emitAppToast({
        title: lang === 'th' ? 'หมุนวงล้อไม่ได้' : 'Cannot spin wheel',
        message: previewRes.errorTh || `ต้องใช้ ${EXTRA_LUCKY_WHEEL_COST} เหรียญเพื่อหมุนเพิ่ม`,
        tone: 'info',
      });
      return;
    }

    wheelSpinningRef.current = true;
    setWheelSpinning(true);
    setWheelWonSlot(null);

    const sliceAngle = 360 / LUCKY_WHEEL_REWARDS.length;
    const desiredMod = ((360 - previewRes.slotIndex * sliceAngle - sliceAngle / 2) % 360 + 360) % 360;
    setWheelAngle((prev) => {
      const currentMod = ((prev % 360) + 360) % 360;
      const delta = (desiredMod - currentMod + 360) % 360;
      return prev + 360 * 5 + delta;
    });

    wheelTimersRef.current.forEach((id) => window.clearTimeout(id));
    wheelTimersRef.current = [];

    for (let i = 0; i < 12; i += 1) {
      const tid = window.setTimeout(() => farmAudio.playSfx('wheelTick'), i * 195);
      wheelTimersRef.current.push(tid);
    }

    const doneTimer = window.setTimeout(() => {
      wheelSpinningRef.current = false;
      setWheelSpinning(false);
      const latest = latestFarmStateRef.current;
      const finalRes = isFreeSpin
        ? spinDailyLuckyWheel(latest, todayDate, previewRes.slotIndex)
        : spinExtraLuckyWheel(latest, previewRes.slotIndex);
      if (finalRes.ok && finalRes.slot) {
        persistFarm(finalRes.state);
        setWheelWonSlot(finalRes.slot);
        farmAudio.playSfx('gift');
        emitAppToast({
          title: lang === 'th' ? `วงล้อนำโชค: ${finalRes.slot.labelTh}!` : `Lucky Wheel: ${finalRes.slot.labelTh}!`,
          message: lang === 'th' ? 'ส่งเข้าคลังสวนแล้ว' : 'Added to your garden!',
          tone: 'success',
        });
      }
    }, 2650);
    wheelTimersRef.current.push(doneTimer);
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
      message: '+12💧 · +200🪙 · +2 บัตรทุนสร้างกิจการ · +4🌱 · +3★ เข้าคลังแล้ว',
      tone: 'success',
    });
  };

  const handleSwitchCareer = (careerId: CareerPathId) => {
    const next = switchCareerPath(farmState, careerId);
    persistFarm(next);
    farmAudio.playSfx('tap');
    emitAppToast({
      title: lang === 'th' ? `เปลี่ยนสายอาชีพเป็น "${CAREER_MAP[careerId].nameTh}"` : `Switched career!`,
      message: CAREER_MAP[careerId].perkTh,
      tone: 'success',
    });
  };

  const handleBuyCapitalToken = () => {
    const res = buyCapitalToken(farmState);
    if (!res.ok) {
      emitAppToast({
        title: lang === 'th' ? 'แลกบัตรทุนไม่สำเร็จ' : 'Cannot buy token',
        message: res.errorTh || '',
        tone: 'warning',
      });
      return;
    }
    persistFarm(res.state);
    farmAudio.playSfx('coin');
    emitAppToast({
      title: lang === 'th' ? 'แลกบัตรทุนสร้างกิจการ +1 ใบแล้ว!' : '+1 Startup Capital Token!',
      message: `-${CAPITAL_TOKEN_BUY_COST}🪙 สำหรับนำไปสร้างอาชีพและกิจการใหม่`,
      tone: 'success',
    });
  };

  const handleClaimCareerGrant = (careerId: CareerPathId) => {
    const res = claimCareerStartupGrant(farmState, careerId);
    if (!res.ok || !res.career) {
      emitAppToast({
        title: lang === 'th' ? 'รับทุนตั้งต้นไม่ได้' : 'Cannot claim startup grant',
        message: res.errorTh || '',
        tone: 'warning',
      });
      return;
    }
    persistFarm(res.state);
    farmAudio.playSfx('gift');
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 35, 1, true);
    }
    emitAppToast({
      title: lang === 'th' ? `เปิดกิจการ "${res.career.nameTh}" สำเร็จ!` : `Launched ${res.career.nameEn}!`,
      message: `+${res.career.grantCoins}🪙 · +${res.career.grantStars}★ · พิมพ์เขียวและวัตถุดิบตั้งต้นพร้อมลุย!`,
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
      {worldMode === 'city' ? (
        <LifeCitySimulationView
          lang={lang}
          farmState={farmState}
          cityState={cityState}
          playerGems={playerGems}
          students={students}
          onApplyCityResult={handleApplyCityResult}
          onSwitchToFarm={() => setWorldMode('farm')}
          onExitGame={onExit}
        />
      ) : (
        <>
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
        onTileActivate={(idx) => {
          if (openMenu !== 'none') setOpenMenu('none');
          executeTileAction(idx);
        }}
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

      {/* TOP-LEFT COMPACT PLAYER CREST (TAP TO VIEW PROFILE / LEVEL / RENAME) */}
      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-auto">
        <div className="h-9 px-1.5 rounded-full bg-[#241b11]/78 backdrop-blur-md border border-[#d6b37c]/60 text-amber-50 shadow-lg flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (onExit) onExit();
              else setIsFullscreen((prev) => !prev);
            }}
            aria-label={onExit ? 'ออกจากสวน' : 'สลับเต็มจอ'}
            className="w-7 h-7 rounded-full bg-amber-100/15 hover:bg-amber-100/25 text-amber-100 flex items-center justify-center cursor-pointer transition shrink-0"
          >
            {onExit ? (
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            ) : isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setOpenMenu((p) => (p === 'profile' ? 'none' : 'profile'));
            }}
            aria-label="ข้อมูลเจ้าของสวนและเลเวล"
            className="flex items-center gap-1.5 pr-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <FarmOwnerPortraitSvg character={farmState.ownerCharacter} className="w-6 h-6 rounded-full border border-amber-300/70 shrink-0" />
            <span className="text-[11px] font-black text-amber-300 tabular-nums whitespace-nowrap">
              Lv.{townLevelInfo.level}
            </span>
            <span className="hidden sm:inline text-xs font-bold text-amber-50 truncate max-w-[130px]">
              {farmState.farmName}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            farmAudio.playSfx('open');
            setOpenMenu('none');
            setWorldMode('city');
          }}
          className="h-9 px-3 rounded-full bg-indigo-600/95 hover:bg-indigo-500 border border-indigo-300/60 text-white text-xs font-bold shadow-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>เมืองจำลอง</span>
        </button>
      </div>

      {/* TOP-RIGHT COMPACT CURRENCY & SETTINGS (TAP TO REVEAL SUPPLIES / AUDIO) */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            farmAudio.playSfx('tap');
            setOpenMenu((p) => (p === 'supplies' ? 'none' : 'supplies'));
          }}
          aria-label="ดูคลังเหรียญ เพชร น้ำ และปุ๋ย"
          className="relative h-9 px-2.5 rounded-full bg-[#241b11]/78 backdrop-blur-md border border-[#d6b37c]/60 text-white shadow-lg flex items-center gap-2 hover:bg-[#332618]/85 cursor-pointer transition"
        >
          <span className="flex items-center gap-1 text-xs font-black tabular-nums">
            {farmState.coins.toLocaleString()}
            <GardenCoinCrest className="w-4 h-4" />
          </span>
          <span className="w-px h-3.5 bg-amber-200/30" />
          <span className="flex items-center gap-1 text-xs font-black tabular-nums">
            {playerGems.toLocaleString()}
            <GardenGemCrest className="w-4 h-4" />
          </span>
          {(disciplineSummary.hasAnythingToClaim || !farmState.claimedBeginnerPack) && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            farmAudio.playSfx('tap');
            setOpenMenu((p) => (p === 'settings' ? 'none' : 'settings'));
          }}
          aria-label="ตั้งค่าเสียงและคู่มือ"
          className={`w-9 h-9 rounded-full backdrop-blur-md border shadow-lg flex items-center justify-center cursor-pointer transition ${
            openMenu === 'settings'
              ? 'bg-amber-200 border-amber-400 text-[#45270f]'
              : 'bg-[#241b11]/78 border-[#d6b37c]/60 text-amber-100 hover:bg-[#332618]/85'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* TOP-LEFT TAP POPOVER: PROFILE & FARM INFO */}
      {openMenu === 'profile' && (
        <div className="absolute top-13 left-2.5 z-30 w-[264px] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-3 shadow-2xl space-y-2.5 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FarmOwnerPortraitSvg character={farmState.ownerCharacter} className="w-9 h-9 rounded-full border border-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-[#45270f] truncate">{farmState.farmName}</p>
              <p className="text-[11px] text-[#7c5c3e] truncate tabular-nums">
                {farmState.ownerName} · Lv.{townLevelInfo.level}
              </p>
              <p className="text-[10px] font-bold text-emerald-700 truncate">
                อาชีพ: {CAREER_MAP[farmState.activeCareerId || 'agri_farmer']?.nameTh}
              </p>
            </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenMenu('none')}
              aria-label="ปิด"
              className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#7c5c3e] tabular-nums">
              <span>ค่าประสบการณ์เมืองอาชีพ</span>
              <span>{townLevelInfo.currentIntoLevel}/{townLevelInfo.nextLevelNeed} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-amber-200/70 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-400"
                style={{ width: `${xpProgressPct}%` }}
              />
            </div>
            {hasGoldenStreakBuff && (
              <p className="text-[11px] font-bold text-amber-700">✨ โบนัสเข้าเรียนติดกัน: ปุ๋ยทองโตไว ×2 ทำงานอยู่</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFarmNameDraft(farmState.farmName);
                setIsEditingFarmName(true);
                setOpenMenu('none');
              }}
              className="min-h-[34px] px-2 rounded-xl border border-[#d6b37c] bg-white text-[11px] font-bold text-[#45270f] flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-50"
            >
              <Pencil className="w-3 h-3" />
              <span>ตั้งชื่อเมือง</span>
            </button>
            <button
              type="button"
              onClick={() => openBoardWithSfx('careers')}
              className="min-h-[34px] px-2 rounded-xl bg-[#15803d] text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#166534]"
            >
              <span>สายอาชีพ & ทุน</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => openBoardWithSfx('character')}
            className="w-full min-h-[32px] px-2 rounded-xl border border-[#d6b37c] bg-amber-50 text-[11px] font-bold text-[#45270f] cursor-pointer hover:bg-amber-100"
          >
            แต่งตัวละครเจ้าของกิจการ
          </button>
        </div>
      )}

      {/* TOP-RIGHT TAP POPOVER: SUPPLIES & RESOURCES */}
      {openMenu === 'supplies' && (
        <div className="absolute top-13 right-2.5 z-30 w-[272px] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-3 shadow-2xl space-y-2.5 pointer-events-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#45270f]">ทรัพยากร & ทุนสร้างกิจการ</p>
            <button
              type="button"
              onClick={() => setOpenMenu('none')}
              aria-label="ปิด"
              className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
            <div className="rounded-xl bg-white border border-[#d6b37c]/60 px-2.5 py-1.5">
              <span className="font-bold text-sky-700">💧 น้ำ: {farmState.water}</span>
              <p className="text-[10px] text-[#7c5c3e]">ใช้รดน้ำให้พืชโต</p>
            </div>
            <div className="rounded-xl bg-white border border-[#d6b37c]/60 px-2.5 py-1.5">
              <span className="font-bold text-emerald-700">🌱 ปุ๋ยวัน: {farmState.dailyFertilizer || 0}</span>
              <p className="text-[10px] text-[#7c5c3e]">เร่งโต +1 ไม่ใช้น้ำ</p>
            </div>
            <div className="rounded-xl bg-white border border-[#d6b37c]/60 px-2.5 py-1.5">
              <span className="font-bold text-amber-700">✨ ปุ๋ยทอง: {farmState.fertilizer}</span>
              <p className="text-[10px] text-[#7c5c3e]">สุกทันที + ผลผลิต ×2</p>
            </div>
            <div className="rounded-xl bg-white border border-[#d6b37c]/60 px-2.5 py-1.5">
              <span className="font-bold text-violet-700">★ ดาวเมือง: {farmState.townStars}</span>
              <p className="text-[10px] text-[#7c5c3e]">ใช้ปลดล็อกแปลง/สร้าง</p>
            </div>
            <div className="col-span-2 rounded-xl bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <GardenCapitalTokenIcon className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-black text-emerald-800">บัตรทุนสร้างกิจการ: {farmState.capitalTokens ?? 0} ใบ</p>
                  <p className="text-[10px] text-emerald-700">เปิดรับทุนลองอาชีพใหม่</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openBoardWithSfx('careers')}
                className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black cursor-pointer shrink-0"
              >
                เปิดดู
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => openBoardWithSfx('chest')}
              className={`w-full min-h-[36px] px-3 rounded-xl text-xs font-black flex items-center justify-between cursor-pointer transition ${
                disciplineSummary.hasAnythingToClaim
                  ? 'bg-[#15803d] text-white shadow'
                  : 'bg-white border border-[#d6b37c] text-[#45270f] hover:bg-amber-50'
              }`}
            >
              <span>กล่องเสบียงวินัยเรียน</span>
              <span className="text-[10px] opacity-90">
                {disciplineSummary.hasAnythingToClaim ? 'พร้อมเปิดรับ!' : 'ดูรายละเอียด'}
              </span>
            </button>

            {!farmState.claimedBeginnerPack && (
              <button
                type="button"
                onClick={() => {
                  handleClaimBeginnerPack();
                  setOpenMenu('none');
                }}
                className="w-full min-h-[36px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black cursor-pointer transition"
              >
                รับชุดฝึกหัดฟรี (+12💧 +200🪙 +2บัตรทุน)
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOP-RIGHT TAP POPOVER: AUDIO, SCREEN & GUIDE */}
      {openMenu === 'settings' && (
        <div className="absolute top-13 right-2.5 z-30 w-[240px] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-2.5 shadow-2xl space-y-1.5 pointer-events-auto">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-[#d6b37c]/40">
            <span className="text-xs font-black text-[#45270f]">ตั้งค่า & คู่มือ</span>
            <button
              type="button"
              onClick={() => setOpenMenu('none')}
              aria-label="ปิด"
              className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextMuted = !farmState.musicMuted;
              persistFarm({ ...farmState, musicMuted: nextMuted });
              farmAudio.setMutedState(farmState.soundMuted, nextMuted);
              if (!nextMuted) farmAudio.playSfx('tap');
            }}
            className="w-full min-h-[36px] px-2.5 rounded-xl bg-white border border-[#d6b37c]/60 hover:bg-amber-50 flex items-center justify-between text-xs font-bold text-[#45270f] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-700" />
              <span>เพลงแนวคันทรี</span>
            </span>
            <span className={`text-[11px] font-black ${farmState.musicMuted ? 'text-stone-400' : 'text-emerald-700'}`}>
              {farmState.musicMuted ? 'ปิดอยู่' : 'เปิดอยู่'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextMuted = !farmState.soundMuted;
              persistFarm({ ...farmState, soundMuted: nextMuted });
              farmAudio.setMutedState(nextMuted, farmState.musicMuted);
              if (!nextMuted) farmAudio.playSfx('tap');
            }}
            className="w-full min-h-[36px] px-2.5 rounded-xl bg-white border border-[#d6b37c]/60 hover:bg-amber-50 flex items-center justify-between text-xs font-bold text-[#45270f] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {farmState.soundMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-emerald-700" />}
              <span>เสียงประกอบ</span>
            </span>
            <span className={`text-[11px] font-black ${farmState.soundMuted ? 'text-stone-400' : 'text-emerald-700'}`}>
              {farmState.soundMuted ? 'ปิดอยู่' : 'เปิดอยู่'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFullscreen((prev) => !prev);
              setOpenMenu('none');
            }}
            className="w-full min-h-[36px] px-2.5 rounded-xl bg-white border border-[#d6b37c]/60 hover:bg-amber-50 flex items-center justify-between text-xs font-bold text-[#45270f] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-700" /> : <Maximize2 className="w-4 h-4 text-amber-700" />}
              <span>ขนาดหน้าจอ</span>
            </span>
            <span className="text-[11px] text-[#7c5c3e]">{isFullscreen ? 'เต็มจอ' : 'ปกติ'}</span>
          </button>

          <button
            type="button"
            onClick={() => openBoardWithSfx('guide')}
            className="w-full min-h-[36px] px-2.5 rounded-xl bg-white border border-[#d6b37c]/60 hover:bg-amber-50 flex items-center justify-between text-xs font-bold text-[#45270f] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-700" />
              <span>วิธีเล่นฟาร์ม & คาเฟ่</span>
            </span>
            <span className="text-[11px] text-[#7c5c3e]">เปิดดู</span>
          </button>
        </div>
      )}

      {/* COMPACT MOBILE LANDSCAPE PROMPT */}
      {isPortraitMobile && !dismissedPortraitHint && (
        <div className="absolute top-14 inset-x-3 z-20 rounded-2xl border border-[#d6b37c] bg-[#2c2116]/90 backdrop-blur-md text-amber-50 px-3 py-2 flex items-center justify-between gap-2 shadow-xl">
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
        <div className="absolute top-14 left-3 z-30 rounded-2xl border-2 border-[#c8a165] bg-[#fcf7ec] p-2.5 shadow-xl flex items-center gap-2">
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

      {/* SLIM FLOATING SELECTED TILE POPOVER */}
      {selectedTile && openMenu === 'none' && activeTool !== 'plant' && activeTool !== 'build' && (
        <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 z-20 w-[256px] rounded-2xl border border-[#c8a165] bg-[#fcf7ec]/96 backdrop-blur-md p-2.5 shadow-xl space-y-2 pointer-events-auto">
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
                onClick={() => {
                  setActiveTool('plant');
                  setOpenMenu('plant');
                }}
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

      {/* MINIMAL ICON-FIRST BOTTOM DOCK + TAP-TO-SHOW ACTION POPOVERS */}
      <div className="absolute bottom-2.5 inset-x-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {/* POPOVER 1: INSPECT / HARVEST EXPLAINER */}
        {openMenu === 'inspect' && (
          <div className="pointer-events-auto w-[280px] max-w-[92vw] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-[#45270f]">โหมดแตะ & เก็บเกี่ยว</p>
              <button
                type="button"
                onClick={() => setOpenMenu('none')}
                aria-label="ปิด"
                className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="text-[11px] text-[#5c4026] space-y-1">
              <li>• แตะพืชที่สุกแล้ว เพื่อเก็บผลผลิตเข้าคลังทันที</li>
              <li>• แตะบนอาคาร เพื่อรับรายได้ประจำวันหรือสั่งแปรรูป</li>
              <li>• แตะแปลงดินว่างหรือต้นที่กำลังโต เพื่อดูคำสั่งด่วน</li>
            </ul>
          </div>
        )}

        {/* POPOVER 2: PLANT SEEDS (TAP TO PICK + EXPLANATION) */}
        {openMenu === 'plant' && (
          <div className="pointer-events-auto w-[320px] max-w-[94vw] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-[#45270f]">ปลูกพืชลงแปลง</p>
                <p className="text-[10px] text-[#7c5c3e]">เลือกเมล็ด แล้วแตะบนแปลงดินว่างเพื่อหว่านเมล็ด</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu('none')}
                aria-label="ปิด"
                className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-[210px] overflow-y-auto no-scrollbar">
              {CROP_CATALOG.map((crop) => {
                const owned = farmState.seeds[crop.id] || 0;
                const unlocked = isCropUnlocked(crop.id, farmState, disciplineSummary.submittedHomeworkCount);
                const selected = selectedCropId === crop.id;
                return (
                  <button
                    key={crop.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      farmAudio.playSfx('tap');
                      setSelectedCropId(crop.id);
                      setActiveTool('plant');
                      setOpenMenu('none');
                    }}
                    className={`p-1.5 rounded-xl border text-left flex flex-col items-center gap-0.5 cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                        : 'border-[#d6b37c]/60 bg-white text-[#45270f] hover:bg-amber-50'
                    }`}
                  >
                    <GardenItemIcon kind="crop" id={crop.id} className="w-6 h-6" />
                    <span className="text-[10px] font-black truncate w-full text-center">
                      {lang === 'th' ? crop.nameTh : crop.nameEn}
                    </span>
                    <span className="text-[9px] text-[#7c5c3e] tabular-nums">
                      {unlocked ? `มี ${owned} · 💧${crop.watersNeeded}` : `Lv.${crop.unlockTownLevel}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setTradeTab('seeds_barn');
                openBoardWithSfx('trade');
              }}
              className="w-full min-h-[32px] rounded-xl bg-amber-100 hover:bg-amber-200 text-[#78350f] text-[11px] font-black cursor-pointer"
            >
              ไปร้านค้าซื้อเมล็ดพันธุ์เพิ่ม
            </button>
          </div>
        )}

        {/* POPOVER 3: CARE TOOLS WITH CLEAR "WHAT IT DOES" LIST */}
        {openMenu === 'care' && (
          <div className="pointer-events-auto w-[280px] max-w-[92vw] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-black text-[#45270f]">ดูแลสวน (เลือกแล้วแตะแปลง)</p>
              <button
                type="button"
                onClick={() => setOpenMenu('none')}
                aria-label="ปิด"
                className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
                    setOpenMenu('none');
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2 text-left cursor-pointer transition ${
                    selected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                      : 'border-[#d6b37c]/55 bg-white text-[#45270f] hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GardenToolIcon tool={tool.id} className="w-5 h-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black truncate">{lang === 'th' ? tool.labelTh : tool.labelEn}</p>
                      <p className="text-[10px] text-[#7c5c3e] truncate">{lang === 'th' ? tool.descTh : tool.descEn}</p>
                    </div>
                  </div>
                  {badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[#78350f] text-[10px] font-black tabular-nums shrink-0">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* POPOVER 4: BUILD & EXPAND LAND */}
        {openMenu === 'build' && (
          <div className="pointer-events-auto w-[328px] max-w-[94vw] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-[#45270f]">สร้างสวน & ขยายพื้นที่</p>
                <p className="text-[10px] text-[#7c5c3e]">เลือกสิ่งก่อสร้าง แล้วแตะช่องว่างเพื่อวางบนสวน</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenMenu('none')}
                aria-label="ปิด"
                className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'production', label: 'คาเฟ่/แปรรูป' },
                  { id: 'landmark', label: 'แลนด์มาร์ก' },
                  { id: 'decor', label: 'ตกแต่ง' },
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

            <div className="grid grid-cols-2 gap-1.5 max-h-[190px] overflow-y-auto no-scrollbar">
              {filteredBuildings.map((b) => {
                const unlocked = isBuildingUnlocked(b.id, farmState);
                const selected = selectedBuildingId === b.id && activeTool === 'build';
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      farmAudio.playSfx('tap');
                      setSelectedBuildingId(b.id);
                      setActiveTool('build');
                      setOpenMenu('none');
                    }}
                    className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      selected
                        ? 'border-amber-600 bg-amber-50 text-[#45270f]'
                        : 'border-[#d6b37c]/60 bg-white text-[#45270f] hover:bg-amber-50'
                    }`}
                  >
                    <GardenBuildingBadgeIcon buildingId={b.id} className="w-6 h-6 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black truncate flex items-center gap-0.5">
                        {!unlocked && <Lock className="w-2.5 h-2.5 shrink-0" />}
                        <span className="truncate">{lang === 'th' ? b.nameTh : b.nameEn}</span>
                      </p>
                      <p className="text-[9px] text-[#7c5c3e] tabular-nums">
                        {unlocked ? `${b.coinCost}🪙 · ${b.starCost}★` : `Lv.${b.unlockTownLevel}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  farmAudio.playSfx('tap');
                  setActiveTool('unlock');
                  setOpenMenu('none');
                }}
                className="flex-1 min-h-[34px] px-2.5 rounded-xl border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-900 text-[11px] font-black inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <LockOpen className="w-3.5 h-3.5" />
                <span>ปลดล็อกช่องขอบสวน</span>
              </button>
              {gridSize === 6 && (
                <button
                  type="button"
                  onClick={() => {
                    handleExpandTo8x8();
                    setOpenMenu('none');
                  }}
                  className="min-h-[34px] px-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Grid2X2Plus className="w-3.5 h-3.5" />
                  <span>ขยาย 8×8 (4★)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* POPOVER 5: GARDEN HUB MENU (REPLACES 6 SIDE MEDALLIONS — TAP TO SEE WHAT EACH MENU DOES) */}
        {openMenu === 'hub' && (
          <div className="pointer-events-auto w-[328px] max-w-[94vw] rounded-2xl border border-[#c8a165]/90 bg-[#fcf7ec]/96 backdrop-blur-xl p-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-black text-[#45270f]">เมืองอาชีพแสนสนุก · เมนูกิจการ</p>
              <button
                type="button"
                onClick={() => setOpenMenu('none')}
                aria-label="ปิด"
                className="w-6 h-6 rounded-full bg-amber-200/70 text-[#78350f] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-[60dvh] overflow-y-auto no-scrollbar">
              {[
                {
                  id: 'life_city' as const,
                  icon: <Building2 className="w-5 h-5 text-indigo-700" />,
                  title: 'เข้าชมเมืองจำลองชุมชน (ครบทุกสถานที่)',
                  desc: 'เยี่ยมสวนเพื่อน ร้านค้า บริษัท ตลาด ธนาคาร(กู้ยืม) โรงพยาบาล(เจ็บป่วย) ตำรวจ วัด และเลือกอาชีพ',
                  badge: cityState.illness !== 'none' || cityState.wantedLevel > 0 ? 1 : undefined,
                  onClick: () => {
                    farmAudio.playSfx('open');
                    setOpenMenu('none');
                    setWorldMode('city');
                  },
                },
                {
                  id: 'careers' as const,
                  icon: <GardenCareerIcon className="w-6 h-6" />,
                  title: 'สายอาชีพ & ทุนสร้างกิจการ',
                  desc: `อาชีพ: ${CAREER_MAP[farmState.activeCareerId || 'agri_farmer']?.nameTh} · รับทุนลองทำอาชีพใหม่`,
                  badge: farmState.capitalTokens ?? 0,
                  onClick: () => openBoardWithSfx('careers'),
                },
                {
                  id: 'cafe' as const,
                  icon: <GardenCafeCupIcon className="w-6 h-6" />,
                  title: 'คาเฟ่ & ส่งออเดอร์ตลาด',
                  desc: 'เสิร์ฟลูกค้าในสวน และส่งรถบรรทุกตลาดรับเหรียญ-เพชร',
                  badge: farmState.visitorQueue.length + farmState.marketOrders.length,
                  onClick: () => openBoardWithSfx('cafe'),
                },
                {
                  id: 'craft' as const,
                  icon: <GardenMortarCraftIcon className="w-6 h-6" />,
                  title: 'ประมง ครัวแปรรูป & สตูดิโอ',
                  desc: 'เลี้ยงปลา-กุ้ง ทอผ้า ทำต้มยำกุ้ง เครื่องดื่ม และกระเช้าออนไลน์',
                  badge: readyQueueCount > 0 ? readyQueueCount : activeQueueCount > 0 ? activeQueueCount : undefined,
                  onClick: () => {
                    setFocusBuildingId(null);
                    openBoardWithSfx('craft');
                  },
                },
                {
                  id: 'trade' as const,
                  icon: <GardenStallIcon className="w-6 h-6" />,
                  title: 'ร้านเมล็ด & คลังผลผลิต',
                  desc: 'ซื้อเมล็ดพันธุ์ ขายผลผลิต วางซุ้มหน้าสวน และแลกรางวัลครู',
                  badge: activeRoadsideCount > 0 ? activeRoadsideCount : undefined,
                  onClick: () => openBoardWithSfx('trade'),
                },
                {
                  id: 'events' as const,
                  icon: <GardenEventsIcon className="w-6 h-6" />,
                  title: '8 วิชาชีวิต วงล้อ & เควสต์',
                  desc: 'ฝึกโจทย์ 8 วิชาในชีวิตประจำวัน หมุนวงล้อ และรับรางวัลภารกิจ',
                  badge: unclaimedAchievementCount > 0 ? unclaimedAchievementCount : undefined,
                  onClick: () => openBoardWithSfx('events'),
                },
                {
                  id: 'newspaper' as const,
                  icon: <GardenGazetteIcon className="w-6 h-6" />,
                  title: 'ข่าวตลาดชุมชน',
                  desc: 'ดูสินค้าลดราคาประจำวันจากสวนเพื่อนบ้าน',
                  badge: dailyDirtAds.length,
                  onClick: () => openBoardWithSfx('newspaper'),
                },
                {
                  id: 'town' as const,
                  icon: <GardenNeighborsIcon className="w-6 h-6" />,
                  title: 'เยี่ยมเมืองเพื่อนร่วมโรงเรียน',
                  desc: 'ช่วยเพื่อนรดน้ำต้นไม้และอุดหนุนซุ้มขายของ',
                  onClick: () => {
                    setVisitingNeighbor(null);
                    openBoardWithSfx('town');
                  },
                },
                {
                  id: 'chest' as const,
                  icon: <GardenGiftBasketIcon className="w-6 h-6" />,
                  title: 'กล่องเสบียง & ชุดมือใหม่',
                  desc: 'รับน้ำ ปุ๋ย บัตรทุน เมล็ดฟรีจากวินัยการเรียนและชุดเริ่มต้น',
                  badge: disciplineSummary.hasAnythingToClaim ? 1 : undefined,
                  onClick: () => openBoardWithSfx('chest'),
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#d6b37c]/55 bg-white hover:bg-amber-50 flex items-center justify-between gap-2 text-left cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-[#d6b37c]/40 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#45270f] truncate">{item.title}</p>
                      <p className="text-[10px] text-[#7c5c3e] truncate">{item.desc}</p>
                    </div>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#15803d] text-white text-[10px] font-black flex items-center justify-center tabular-nums shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMPACT ACTIVE TOOL CHIP (ONLY WHEN PLANTING, CARING, BUILDING, OR UNLOCKING WITH POPOVER CLOSED) */}
        {openMenu === 'none' && activeTool !== 'inspect' && (
          <div className="pointer-events-auto h-7 px-3 rounded-full bg-[#241b11]/80 backdrop-blur-md border border-[#d6b37c]/55 text-[11px] font-bold text-amber-100 flex items-center gap-2 shadow">
            <span>
              {activeTool === 'plant'
                ? `ปลูก: ${CROP_MAP[selectedCropId].nameTh} (มี ${farmState.seeds[selectedCropId] || 0})`
                : activeTool === 'build'
                  ? `สร้าง: ${BUILDING_MAP[selectedBuildingId].nameTh}`
                  : activeTool === 'unlock'
                    ? 'แตะช่องขอบสวนที่ล็อกเพื่อปลดล็อก'
                    : `ใช้เครื่องมือ: ${CARE_TOOLS.find((t) => t.id === activeTool)?.labelTh || ''}`}
            </span>
            <button
              type="button"
              onClick={() => setActiveTool('inspect')}
              aria-label="กลับโหมดแตะปกติ"
              className="text-amber-300 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* COMPACT 5-ICON FLOATING GAME DOCK (ICON-ONLY, ZERO CLUTTER) */}
        <div
          role="toolbar"
          aria-label="แถบเครื่องมือหลักของสวน"
          className="pointer-events-auto rounded-full border border-[#c8a165]/85 bg-[#2d1e0f]/86 backdrop-blur-md shadow-[0_8px_22px_rgba(10,18,8,0.5)] px-2 py-1.5 flex items-center gap-1.5"
        >
          {/* 1. Tap / Harvest */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setActiveTool('inspect');
              setOpenMenu((p) => (p === 'inspect' ? 'none' : 'inspect'));
            }}
            aria-label="แตะเก็บเกี่ยว"
            title="แตะเก็บเกี่ยว — แตะเพื่อดูวิธีใช้"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition ${
              activeTool === 'inspect'
                ? 'bg-gradient-to-b from-[#fef3c7] to-[#fde68a] text-[#45270f] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool="inspect" className="w-5 h-5" />
            {readyCropCount + readyBuildingCount + readyQueueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-500 border border-white text-[9px] font-black text-white flex items-center justify-center tabular-nums">
                {readyCropCount + readyBuildingCount + readyQueueCount}
              </span>
            )}
          </button>

          {/* 2. Plant Seeds */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setActiveTool('plant');
              setOpenMenu((p) => (p === 'plant' ? 'none' : 'plant'));
            }}
            aria-label="ปลูกพืช"
            title="ปลูกพืช — แตะเพื่อเลือกเมล็ดพันธุ์"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition ${
              activeTool === 'plant' || openMenu === 'plant'
                ? 'bg-gradient-to-b from-[#dcfce7] to-[#86efac] text-[#064e3b] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool="plant" className="w-5 h-5" />
          </button>

          {/* 3. Care (Water / Till / Fertilizer / Weed) */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              if (!isCareActive) setActiveTool(lastCareTool);
              setOpenMenu((p) => (p === 'care' ? 'none' : 'care'));
            }}
            aria-label="ดูแลสวน"
            title="ดูแลสวน — แตะเพื่อเลือกรดน้ำ พรวนดิน ใส่ปุ๋ย"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition ${
              isCareActive || openMenu === 'care'
                ? 'bg-gradient-to-b from-[#e0f2fe] to-[#7dd3fc] text-[#0c4a6e] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool={isCareActive ? activeTool : lastCareTool} className="w-5 h-5" />
            {weedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 border border-white text-[9px] font-black text-white flex items-center justify-center tabular-nums">
                {weedCount}
              </span>
            )}
          </button>

          {/* 4. Build & Expand */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              if (activeTool !== 'unlock') setActiveTool('build');
              setOpenMenu((p) => (p === 'build' ? 'none' : 'build'));
            }}
            aria-label="สร้างและขยายสวน"
            title="สร้างและขยายสวน — แตะเพื่อเลือกอาคารหรือขยายที่ดิน"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition ${
              activeTool === 'build' || activeTool === 'unlock' || openMenu === 'build'
                ? 'bg-gradient-to-b from-[#fef3c7] to-[#fcd34d] text-[#78350f] shadow'
                : 'text-amber-50 hover:bg-white/10'
            }`}
          >
            <GardenToolIcon tool={activeTool === 'unlock' ? 'unlock' : 'build'} className="w-5 h-5" />
          </button>

          <span className="w-px h-5 bg-amber-200/25 mx-0.5" aria-hidden="true" />

          {/* 5. Main Garden & Cafe Menu Hub */}
          <button
            type="button"
            onClick={() => {
              farmAudio.playSfx('tap');
              setOpenMenu((p) => (p === 'hub' ? 'none' : 'hub'));
            }}
            aria-label="เมนูสวนและคาเฟ่"
            title="เมนูสวนและคาเฟ่ — แตะเพื่อดูว่าทำอะไรได้บ้าง"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition ${
              openMenu === 'hub'
                ? 'bg-gradient-to-b from-[#bbf7d0] to-[#4ade80] text-[#064e3b] shadow'
                : 'bg-[#15803d] text-white hover:bg-[#166534] shadow'
            }`}
          >
            <LayoutGrid className="w-4.5 h-4.5" />
            {farmState.visitorQueue.length + farmState.marketOrders.length + readyQueueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-400 border border-[#2d1e0f] text-[9px] font-black text-[#45270f] flex items-center justify-center tabular-nums">
                {farmState.visitorQueue.length + farmState.marketOrders.length + readyQueueCount}
              </span>
            )}
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
            title: lang === 'th' ? 'บันทึกสไตล์เจ้าของกิจการแล้ว!' : 'Character Updated!',
            message: lang === 'th' ? 'ตัวละครใหม่เดินดูแลเมืองอาชีพของคุณแล้ว' : 'Your character look is live on the board.',
            tone: 'success',
          });
        }}
        onSwitchCareer={handleSwitchCareer}
        onClaimCareerGrant={handleClaimCareerGrant}
        onBuyCapitalToken={handleBuyCapitalToken}
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
        </>
      )}
    </div>
  );
};
