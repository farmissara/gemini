import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpCircle,
  Award,
  BookOpen,
  Building2,
  ChefHat,
  Coins,
  Droplets,
  Gift,
  Grid2X2Plus,
  Hand,
  HelpCircle,
  Home,
  Leaf,
  Lock,
  LockOpen,
  MessageCircleHeart,
  Pencil,
  ShoppingBag,
  Shovel,
  Sparkles,
  Sprout,
  Star,
  Store,
  Trash2,
  Truck,
  Users,
  Volume2,
  VolumeX,
  Wheat,
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
  School,
  Student,
  UserRole,
} from '../types';
import { PageHeader } from '../components/common/PageShell';
import { BaseModal } from '../components/common/BaseModal';
import { FutureNavIcon } from '../components/common/FutureIcon';
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
  buyFromNeighborRoadsideShop,
  buySeedPack,
  calculateTownProsperity,
  claimDisciplineSupplies,
  clearWeedOnTile,
  collectBuildingYield,
  computeDisciplineChestSummary,
  constructBuildingOnTile,
  craftProductOnFarm,
  CROP_CATALOG,
  CROP_MAP,
  dismissVisitorRequest,
  expandFarmGridTo8x8,
  fertilizeTile,
  fulfillMarketOrder,
  fulfillVisitorRequest,
  getBuildingUpgradeCost,
  getCropSellMultiplier,
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
  normalizeFarmState,
  plantCropOnTile,
  PRODUCT_CATALOG,
  PRODUCT_MAP,
  removeBuildingOnTile,
  resetDailyWaterFlagsIfNeeded,
  resolveStudentForUser,
  sellCropFromBarn,
  syncBehaviorWeedsOntoFarm,
  tillPlotTile,
  unlockPlotTile,
  upgradeBuildingOnTile,
  waterTile,
  type BuildingId,
  type CropId,
  type FarmTool,
  type ProductId,
  type SchoolFarmState,
  type VisitorRequest,
} from '../lib/schoolFarmEngine';
import { IsometricFarmBoard, type FloatingFeedback } from '../components/games/IsometricFarmBoard';

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
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onExit?: () => void;
}

type FarmModalKind = 'market' | 'visitors' | 'quiz' | 'town' | 'guide' | null;

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

// Gentle Web Audio chime synthesizer without external MP3 dependencies
const playFarmChime = (type: 'water' | 'plant' | 'harvest' | 'coin' | 'build' | 'weed' | 'till', muted: boolean) => {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'water') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);
    } else if (type === 'plant' || type === 'till') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'till' ? 280 : 360, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.1);
    } else if (type === 'harvest') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587, now);
      osc.frequency.setValueAtTime(784, now + 0.08);
      osc.frequency.setValueAtTime(987, now + 0.16);
    } else if (type === 'coin' || type === 'build') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.09);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.1);
    }
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.start(now);
    osc.stop(now + 0.25);
    setTimeout(() => void ctx.close().catch(() => undefined), 350);
  } catch {
    // ignore Web Audio blocks in strict autoplay contexts
  }
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
  onEarnRewards,
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

  const [activeTool, setActiveTool] = useState<FarmTool>('inspect');
  const [selectedCropId, setSelectedCropId] = useState<CropId>('corn');
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId>('chicken_coop');
  const [buildCategoryFilter, setBuildCategoryFilter] = useState<'all' | 'production' | 'landmark' | 'decor'>('all');
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(14);
  const [activeModal, setActiveModal] = useState<FarmModalKind>(null);
  const [marketSubTab, setMarketSubTab] = useState<'orders' | 'craft' | 'roadside' | 'shop' | 'barn'>('orders');
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

  const feedbackSeqRef = useRef(1);

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

  // Persist farm state cleanly whenever changed
  const persistFarm = (nextState: SchoolFarmState) => {
    setFarmState(nextState);
    saveSchoolFarmState(schoolId, userId, nextState, nextState.studentId);
    setNeighborSyncTick((t) => t + 1);
  };

  // Compute live discipline chest summary from Attendance + Homework + Behavior
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
    const tile = farmState.tiles[tileIndex];
    if (!tile) return;

    // Smart Inspect mode: performs the most intuitive helpful action on tap!
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
      pushFeedback(tileIndex, res.matured ? 'สุกพร้อมเก็บ!' : 'รดน้ำ +1 💧', 'sky');
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
    playFarmChime('coin', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.order.rewardXp, res.order.rewardGems, true);
    }
    emitAppToast({
      title: lang === 'th' ? 'รถบรรทุกส่งออเดอร์สำเร็จ!' : 'Truck Delivery Complete!',
      message: `+${res.order.rewardCoins} 🪙 · +1 ⭐ · +${res.order.rewardGems} Gems`,
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
    const res = fulfillVisitorRequest(farmState, visitorId);
    if (!res.ok || !res.visitor) {
      emitAppToast({ title: lang === 'th' ? 'ยังขายให้ชาวบ้านไม่ได้' : 'Cannot serve visitor', message: res.errorTh || 'สินค้าไม่พอ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.visitor.rewardXp, 1, true);
    }
    emitAppToast({
      title: lang === 'th' ? `ขายให้ ${res.visitor.nameTh.split(' ')[0]} แล้ว!` : 'Visitor Served!',
      message: `+${res.visitor.rewardCoins} 🪙 · +${res.visitor.rewardXp} XP`,
      tone: 'success',
    });
  };

  const handleDismissVisitor = (visitorId: string) => {
    persistFarm(dismissVisitorRequest(farmState, visitorId));
    playFarmChime('till', farmState.soundMuted);
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
    emitAppToast({
      title: lang === 'th' ? `ขาย ${CROP_MAP[cropId].nameTh} แล้ว` : 'Crop Sold',
      message: `+${res.coinsEarned} 🪙`,
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

  const toolButtons: {
    id: FarmTool;
    labelTh: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    toneClass: string;
  }[] = [
    {
      id: 'inspect',
      labelTh: 'แตะอัจฉริยะ',
      labelEn: 'Smart Tap',
      icon: Hand,
      badge: readyCropCount + readyBuildingCount > 0 ? readyCropCount + readyBuildingCount : undefined,
      toneClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'till',
      labelTh: 'ขุดแปลง',
      labelEn: 'Till',
      icon: Shovel,
      toneClass: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'plant',
      labelTh: 'หว่านเมล็ด',
      labelEn: 'Plant',
      icon: Sprout,
      toneClass: 'text-lime-700 dark:text-lime-300',
    },
    {
      id: 'water',
      labelTh: 'รดน้ำ',
      labelEn: 'Water',
      icon: Droplets,
      badge: farmState.water,
      toneClass: 'text-sky-700 dark:text-sky-300',
    },
    {
      id: 'daily_fertilize',
      labelTh: 'ปุ๋ยวัน',
      labelEn: 'Compost',
      icon: Leaf,
      badge: farmState.dailyFertilizer || 0,
      toneClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'fertilize',
      labelTh: 'ปุ๋ยทอง ×2',
      labelEn: 'Gold Fert',
      icon: Sparkles,
      badge: farmState.fertilizer,
      toneClass: 'text-yellow-700 dark:text-yellow-300',
    },
    {
      id: 'clear_weed',
      labelTh: 'ปราบวัชพืช',
      labelEn: 'Weed',
      icon: Shovel,
      badge: weedCount > 0 ? weedCount : undefined,
      toneClass: 'text-rose-700 dark:text-rose-300',
    },
    {
      id: 'build',
      labelTh: 'สร้าง/แต่งเมือง',
      labelEn: 'Build',
      icon: Building2,
      toneClass: 'text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'unlock',
      labelTh: 'ขยายแปลง',
      labelEn: 'Expand',
      icon: LockOpen,
      toneClass: 'text-violet-700 dark:text-violet-300',
    },
  ];

  const filteredBuildings = BUILDING_CATALOG.filter(
    (b) => buildCategoryFilter === 'all' || b.category === buildCategoryFilter
  );

  return (
    <div className={`h-full flex flex-col min-h-0 overflow-y-auto space-y-4 pb-6 ${getModuleTone('school_farm')}`}>
      {/* Header: Mobile Fullscreen HUD or Desktop PageHeader */}
      {onExit ? (
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'th' ? 'ออก' : 'Exit'}</span>
          </button>
          <div className="text-center min-w-0">
            <h1 className="text-sm font-black text-[var(--color-text-title)] truncate">
              {farmState.farmName} · Lv.{townLevelInfo.level}
            </h1>
            <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
              🪙 {farmState.coins} · 💧 {farmState.water} · 🌱 {farmState.dailyFertilizer || 0} · ✨ {farmState.fertilizer} · ⭐ {farmState.townStars}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => persistFarm({ ...farmState, soundMuted: !farmState.soundMuted })}
              aria-label={farmState.soundMuted ? 'Unmute sound' : 'Mute sound'}
              className="min-w-[44px] min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-center text-[var(--color-text-title)] cursor-pointer"
            >
              {farmState.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('guide')}
              aria-label="Game Guide"
              className="min-w-[44px] min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-center text-[var(--color-text-title)] cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <PageHeader
          icon={<FutureNavIcon tab="school_farm" size={20} active />}
          title={lang === 'th' ? 'ฟาร์มโรงเรียนแสนสนุก (School Farm & Town)' : 'School Farm & Town'}
          description={
            lang === 'th'
              ? 'มาเรียนตรงเวลา ส่งการบ้านครบ และสะสมความดี เพื่อปลดล็อกน้ำ ปุ๋ย เมล็ดพันธุ์ และสร้างเมืองเกษตร 2D Isometric'
              : 'Earn water, fertilizer, seeds, and town stars directly from attendance, homework, and merits.'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFocusBuildingId(null);
                  setMarketSubTab('craft');
                  setActiveModal('market');
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                <ChefHat className="w-4 h-4" />
                <span>{lang === 'th' ? `แปรรูป & ปศุสัตว์ (${totalGoodsItems})` : `Workshop (${totalGoodsItems})`}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusBuildingId(null);
                  setMarketSubTab('orders');
                  setActiveModal('market');
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                <Store className="w-4 h-4" />
                <span>{lang === 'th' ? `ตลาด & รถส่งของ (${totalBarnItems})` : `Market (${totalBarnItems})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('visitors')}
                className="min-h-[40px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                <MessageCircleHeart className="w-4 h-4 text-rose-500" />
                <span>{lang === 'th' ? `ชาวบ้าน (${farmState.visitorQueue.length})` : `Visitors (${farmState.visitorQueue.length})`}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisitingNeighbor(null);
                  setActiveModal('town');
                }}
                className="min-h-[40px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'th' ? 'เมืองเพื่อนร่วมห้อง' : 'Class Town'}</span>
              </button>
              <button
                type="button"
                onClick={() => persistFarm({ ...farmState, soundMuted: !farmState.soundMuted })}
                aria-label="Toggle sound"
                className="min-h-[40px] min-w-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center shrink-0 cursor-pointer transition"
              >
                {farmState.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('guide')}
                aria-label="How to play"
                className="min-h-[40px] min-w-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center shrink-0 cursor-pointer transition"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          }
        />
      )}

      {/* Main Responsive Workspace: Isometric Board + Control & Discipline Side Dock */}
      <div className={`grid grid-cols-1 xl:grid-cols-12 gap-4 ${onExit ? 'px-3' : ''}`}>
        {/* Left/Center: Isometric 2D Canvas + Interactive Tool Palette */}
        <div className="xl:col-span-8 space-y-3">
          {/* Compact Resource HUD strip (hidden on mobile fullscreen since header shows it) */}
          {!onExit && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">เมือง Lv.{townLevelInfo.level}</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">
                    {prosperityScore} แต้ม
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">เหรียญฟาร์ม</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.coins}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">บัวรดน้ำ</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.water}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">ปุ๋ยวัน</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.dailyFertilizer || 0}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">ปุ๋ยทอง ×2</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.fertilizer}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-violet-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">ดาวเมือง</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.townStars}</p>
                </div>
              </div>
            </div>
          )}

          {/* Isometric SVG Farm Board */}
          <IsometricFarmBoard
            tiles={farmState.tiles}
            selectedTileIndex={selectedTileIndex}
            activeTool={activeTool}
            todayDate={todayDate}
            farmName={farmState.farmName}
            feedbacks={feedbacks}
            lang={lang}
            ordersCount={farmState.marketOrders.length}
            roadsideCount={activeRoadsideCount}
            visitors={farmState.visitorQueue}
            truckAnimating={truckAnimating}
            onTileActivate={(idx) => executeTileAction(idx)}
            onOpenMarket={() => {
              setFocusBuildingId(null);
              setMarketSubTab('orders');
              setActiveModal('market');
            }}
            onOpenShop={() => {
              setFocusBuildingId(null);
              setMarketSubTab('roadside');
              setActiveModal('market');
            }}
            onOpenVisitors={() => setActiveModal('visitors')}
          />

          {/* Interactive Tool Dock (44px+ touch targets) */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 space-y-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {toolButtons.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setActiveTool(tool.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tool.toneClass}`} />
                    <span>{lang === 'th' ? tool.labelTh : tool.labelEn}</span>
                    {tool.badge !== undefined && (
                      <span
                        className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--color-card)] text-[var(--color-text-title)]'
                        }`}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Contextual Seed Picker when Plant tool is active */}
            {activeTool === 'plant' && (
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-left shrink-0 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100'
                          : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: crop.accentColor }}
                        />
                        <span>{lang === 'th' ? crop.nameTh : crop.nameEn}</span>
                        <span className="font-mono text-[11px] tabular-nums opacity-80">×{owned}</span>
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap tabular-nums">
                        {unlocked
                          ? `💧${crop.watersNeeded} · ขาย ${crop.sellPrice}🪙`
                          : `Lv.${crop.unlockTownLevel}${crop.minHomeworkCount ? ` & การบ้าน ${crop.minHomeworkCount}` : ''}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Contextual Building & Town Decor Picker when Build tool is active */}
            {activeTool === 'build' && (
              <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
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
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                        buildCategoryFilter === cat.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {filteredBuildings.map((b) => {
                    const unlocked = isBuildingUnlocked(b.id, farmState);
                    const selected = selectedBuildingId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setSelectedBuildingId(b.id)}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-left shrink-0 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100'
                            : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <div className="text-xs font-bold whitespace-nowrap">
                          {lang === 'th' ? b.nameTh : b.nameEn}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                          {!unlocked
                            ? `ต้องใช้ Lv.${b.unlockTownLevel} หรือพิมพ์เขียวการบ้าน`
                            : `${b.coinCost}🪙 · ${b.starCost}★${b.dailyCoins > 0 ? ` · +${b.dailyCoins}🪙/วัน` : ` · +${b.prosperityPoints} เจริญ`}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contextual 8x8 Grid Upgrade option when Unlock/Expand tool is active */}
            {activeTool === 'unlock' && gridSize === 6 && (
              <div className="pt-2 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-[var(--color-text-body)]">
                  พื้นที่ปัจจุบัน 6×6 ช่อง · ขยายเขตเมืองเป็น <strong className="text-[var(--color-text-title)]">8×8 (64 ช่อง)</strong> เพื่อสร้างเมืองเกษตรเต็มรูปแบบ
                </p>
                <button
                  type="button"
                  onClick={handleExpandTo8x8}
                  className="min-h-[40px] px-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
                >
                  <Grid2X2Plus className="w-4 h-4" />
                  <span>ขยายฟาร์มเป็น 8×8 (4 ★)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Panel: Daily Discipline Chest + Selected Tile + Quick Actions */}
        <div className="xl:col-span-4 space-y-3">
          {/* Daily School Behavior -> Supplies Chest */}
          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/70 bg-[var(--color-card)] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? 'กล่องเสบียงจากวินัยเรียนวันนี้' : 'Daily Discipline Supply Chest'}
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ดึงสถิติจริงจากเช็กชื่อ การบ้าน & ความดี' : 'Synced live with school records'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-card-subtle)] px-3 py-2">
                <span className="text-[var(--color-text-body)]">1. เช็กชื่อเข้าเรียนวันนี้</span>
                <span
                  className={`font-bold text-right ${
                    disciplineSummary.attendanceStatusToday === 'present'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : disciplineSummary.attendanceStatusToday === 'late' || disciplineSummary.attendanceStatusToday === 'absent'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {disciplineSummary.attendanceStatusToday === 'present'
                    ? `ตรงเวลา (${disciplineSummary.attendanceStreakDays} วันติด${disciplineSummary.attendanceStreakDays >= 3 ? ' · ปุ๋ยทอง!' : ''})`
                    : disciplineSummary.attendanceStatusToday === 'late'
                      ? 'มาสาย (ไม่มีโบนัสน้ำฟรีวันนี้)'
                      : disciplineSummary.attendanceStatusToday === 'absent'
                        ? 'ขาดเรียน (ไม่มีโบนัสน้ำฟรีวันนี้)'
                        : 'ยังไม่มีบันทึกวันนี้'}
                </span>
              </div>

              <div className="rounded-xl bg-[var(--color-card-subtle)] px-3 py-2 space-y-1">
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
                      เคลียร์งานค้าง ({disciplineSummary.pendingHomeworkTitles.join(', ')}) เพื่อรับเมล็ดชุดพิเศษ & พิมพ์เขียว
                    </span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-card-subtle)] px-3 py-2">
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
          </section>

          {/* Selected Plot Inspector */}
          {selectedTile && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-[var(--color-text-title)]">
                  ช่อง #{selectedTile.index + 1} (แถว {selectedTile.row + 1}, คอลัมน์ {selectedTile.col + 1})
                </h3>
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {!selectedTile.unlocked
                    ? 'ยังไม่ปลดล็อก'
                    : selectedTile.kind === 'crop' && selectedTile.cropId
                      ? CROP_MAP[selectedTile.cropId].nameTh
                      : selectedTile.kind === 'building' && selectedTile.buildingId
                        ? `${BUILDING_MAP[selectedTile.buildingId].nameTh} (Lv.${selectedTile.buildingLevel || 1})`
                        : selectedTile.kind === 'weed'
                          ? selectedTile.weedVariant === 'pest'
                            ? 'แมลงศัตรูพืช'
                            : 'วัชพืช'
                          : selectedTile.tilled
                            ? 'ดินขุดแล้วพร้อมปลูก'
                            : 'สนามหญ้าว่าง'}
                </span>
              </div>

              {selectedTile.kind === 'crop' && selectedTile.cropId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                    <span>{getGrowthStageLabel(selectedTile.growthProgress || 0, CROP_MAP[selectedTile.cropId].watersNeeded, lang)}</span>
                    <span className="font-mono font-bold tabular-nums">
                      {selectedTile.growthProgress || 0} / {CROP_MAP[selectedTile.cropId].watersNeeded}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-card-subtle)] overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((selectedTile.growthProgress || 0) / CROP_MAP[selectedTile.cropId].watersNeeded) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  {(selectedTile.growthProgress || 0) < CROP_MAP[selectedTile.cropId].watersNeeded ? (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => executeTileAction(selectedTile.index, 'water')}
                        className="min-h-[38px] px-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
                      >
                        รดน้ำ 💧
                      </button>
                      <button
                        type="button"
                        onClick={() => executeTileAction(selectedTile.index, 'daily_fertilize')}
                        className="min-h-[38px] px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
                      >
                        ปุ๋ยวัน 🌱
                      </button>
                      <button
                        type="button"
                        onClick={() => executeTileAction(selectedTile.index, 'fertilize')}
                        className="min-h-[38px] px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
                      >
                        ปุ๋ยทอง ✨
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => executeTileAction(selectedTile.index, 'harvest')}
                      className="w-full min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      เก็บเกี่ยวเข้ายุ้งฉาง
                    </button>
                  )}
                </div>
              )}

              {selectedTile.kind === 'weed' && (
                <div className="space-y-2">
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {selectedTile.weedReasonTh
                      ? `สาเหตุ: ${selectedTile.weedReasonTh}`
                      : 'เกิดจากบันทึกหักคะแนนความประพฤติ รักษาความดีและใช้น้ำ 1 ถังเพื่อฟื้นฟูดิน'}
                  </p>
                  <button
                    type="button"
                    onClick={() => executeTileAction(selectedTile.index, 'clear_weed')}
                    className="w-full min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    ปราบวัชพืช & ฟื้นฟูแปลง (-1 💧)
                  </button>
                </div>
              )}

              {selectedTile.kind === 'building' && selectedTile.buildingId && (() => {
                const bDef = BUILDING_MAP[selectedTile.buildingId];
                const curLv = selectedTile.buildingLevel || 1;
                const canUpgrade = curLv < bDef.maxLevel;
                const upgCost = canUpgrade ? getBuildingUpgradeCost(selectedTile.buildingId, curLv) : null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {bDef.descTh}
                      {bDef.dailyCoins > 0 || bDef.dailyFertilizer
                        ? ` · ${selectedTile.lastCollectedDate === todayDate ? 'วันนี้เก็บรายได้แล้ว' : 'แตะบนแผนที่เพื่อเก็บรายได้วันนี้!'}`
                        : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {PRODUCTION_BUILDINGS.has(selectedTile.buildingId) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFocusBuildingId(selectedTile.buildingId || null);
                            setMarketSubTab('craft');
                            setActiveModal('market');
                          }}
                          className="flex-1 min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>เปิดโรงงานแปรรูป</span>
                        </button>
                      )}
                      {canUpgrade && upgCost && (
                        <button
                          type="button"
                          onClick={() => handleUpgradeBuilding(selectedTile.index)}
                          className="flex-1 min-h-[40px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>อัปเกรด Lv.{curLv + 1} ({upgCost.coinCost}🪙 {upgCost.starCost}★)</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveBuilding(selectedTile.index)}
                        aria-label="Remove building"
                        className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {!selectedTile.unlocked && (
                <button
                  type="button"
                  onClick={() => executeTileAction(selectedTile.index, 'unlock')}
                  className="w-full min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <LockOpen className="w-4 h-4" />
                  <span>
                    ปลดล็อกแปลงนี้ ({getPlotUnlockStarCost(farmState.tiles.filter((t) => t.unlocked).length)} ⭐)
                  </span>
                </button>
              )}

              {/* Rename farm shortcut */}
              <div className="pt-2 border-t border-[var(--color-border)]">
                {isEditingFarmName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={32}
                      value={farmNameDraft}
                      onChange={(e) => setFarmNameDraft(e.target.value)}
                      placeholder="ตั้งชื่อเมืองฟาร์ม..."
                      className="flex-1 min-h-[36px] px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
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
                      className="min-h-[36px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      บันทึก
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFarmNameDraft(farmState.farmName);
                      setIsEditingFarmName(true);
                    }}
                    className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>เปลี่ยนชื่อเมืองฟาร์ม ({farmState.farmName})</span>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Quick Secondary Panels (Workshop, Visitors, Market, Study Quiz, Class Town) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setFocusBuildingId(null);
                setMarketSubTab('craft');
                setActiveModal('market');
              }}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-left cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChefHat className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-text-title)] truncate">ปศุสัตว์ & โรงงานแปรรูปสินค้า</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                    สินค้าในคลัง {totalGoodsItems} ชิ้น · ผลิตไข่ นม ขนมปัง สมูทตี้
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('visitors')}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-left cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageCircleHeart className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-text-title)] truncate">
                    ชาวบ้านผู้มาเยือนฟาร์ม ({farmState.visitorQueue.length} คนรอซื้อ)
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {farmState.visitorQueue[0]?.nameTh || 'ต้อนรับชาวบ้านหน้าฟาร์มรับเหรียญเพิ่ม'}
                  </p>
                </div>
              </div>
              <Coins className="w-4 h-4 text-amber-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setFocusBuildingId(null);
                setMarketSubTab('orders');
                setActiveModal('market');
              }}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-left cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-text-title)] truncate">รถส่งของ · แผงลอยริมทาง · ซื้อเมล็ด</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                    ออเดอร์ {farmState.marketOrders.length} · แผงริมทาง {activeRoadsideCount}/6 · ยุ้งฉาง {totalBarnItems}
                  </p>
                </div>
              </div>
              <Wheat className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setQuizPicked(null);
                setActiveModal('quiz');
              }}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-left cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-text-title)] truncate">ทบทวนความรู้รับน้ำพิเศษ</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                    วันนี้ใช้ไป {quizUsedToday}/3 ครั้ง (+2💧 +1✨)
                  </p>
                </div>
              </div>
              <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setVisitingNeighbor(null);
                setActiveModal('town');
              }}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-left cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-text-title)] truncate">
                    {isStaff ? 'เมืองห้องเรียน & มอบรางวัลครู' : 'เยี่ยมฟาร์ม & แวะซื้อร้านเพื่อน'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                    มีฟาร์มในโรงเรียน {Math.max(1, neighbors.length)} แห่ง
                  </p>
                </div>
              </div>
              <Award className="w-4 h-4 text-emerald-500 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Farm Market, Craft Workshop, Roadside Shop, Seed Shop & Barn */}
      <BaseModal
        isOpen={activeModal === 'market'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-3xl"
        title={lang === 'th' ? 'ตลาดเกษตร รถส่งของ & โรงงานแปรรูป' : 'Farm Market, Truck & Workshop'}
        subtitle={
          lang === 'th'
            ? `เหรียญฟาร์มของคุณ: ${farmState.coins} 🪙${sellMultiplier > 1 ? ` · โบนัสเบเกอรี่ +${Math.round((sellMultiplier - 1) * 100)}%` : ''}`
            : `Coins: ${farmState.coins}`
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--color-border)] pb-2">
            {(
              [
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

          {marketSubTab === 'orders' && (
            <div className="space-y-2.5">
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
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-title)]">{order.titleTh}</p>
                      <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        ต้องการ {crop.nameTh} {order.quantity} (มี {ownedCrop})
                        {prod && order.productQty ? ` + ${prod.nameTh} ${order.productQty} (มี ${ownedProd})` : ''}
                        {' '}· รางวัล +{order.rewardCoins}🪙 +1⭐ +{order.rewardGems} Gems
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => handleFulfillOrder(order.id)}
                      className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{ready ? 'ขับรถส่งออเดอร์' : 'สินค้ายังไม่พอ'}</span>
                    </button>
                  </div>
                );
              })}
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

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {farmState.roadsideShop.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                    ยังไม่มีสินค้าวางขายบนแผงริมทาง เลือกผลผลิตหรือขนมด้านบนเพื่อเปิดร้านได้เลย!
                  </p>
                ) : (
                  farmState.roadsideShop.map((item) => {
                    const label =
                      item.itemKind === 'crop'
                        ? CROP_MAP[item.itemId as CropId]?.nameTh
                        : PRODUCT_MAP[item.itemId as ProductId]?.nameTh;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-[var(--color-text-title)]">
                            {label} ×{item.quantity}
                          </span>
                          <span className="ml-2 text-[var(--color-text-muted)] tabular-nums">
                            ราคา {item.priceCoins}🪙
                          </span>
                        </div>
                        <span className={`font-bold ${item.sold ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {item.sold ? `ขายให้ ${item.buyerName || 'เพื่อน'} แล้ว` : 'กำลังวางขาย'}
                        </span>
                      </div>
                    );
                  })
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
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                      #{idx + 1} · {n.ownerName} {isMe ? '(ฟาร์มของคุณ)' : ''}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                      {n.ownerRoom ? `${n.ownerRoom} · ` : ''}Lv.{lv} · ความเจริญ {score} แต้ม · เก็บเกี่ยว {n.totalHarvested} ครั้ง
                    </p>
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
        title={lang === 'th' ? 'วิธีเล่นฟาร์มโรงเรียนแสนสนุก' : 'How to Play School Farm & Town'}
      >
        <div className="space-y-3 text-xs text-[var(--color-text-body)] leading-relaxed">
          <div className="rounded-xl bg-[var(--color-card-subtle)] p-3 space-y-1">
            <p className="font-bold text-[var(--color-text-title)]">1. วินัยเรียนจริง = ทรัพยากรในฟาร์ม</p>
            <p>• เช็กชื่อมาเรียนตรงเวลา: รับบัวรดน้ำ 💧 + ปุ๋ยวัน 🌱 (มาติดกัน 3 วันขึ้นไปได้ปุ๋ยทองคำ ×2 ✨ · มาสาย/ขาดเรียนไม่มีโบนัสฟรี)</p>
            <p>• ส่งการบ้านครบ: ปลดล็อกเมล็ดพันธุ์พิเศษ & พิมพ์เขียวสิ่งปลูกสร้าง (หากมีงานค้างจะล็อกกล่องชุดพิเศษไว้)</p>
            <p>• คะแนนความประพฤติ: แต้มความดีให้ดาวเมือง ⭐ ไว้อัปเกรด/ขยายเมืองเป็น 8×8 ส่วนคะแนนหักจะเกิดวัชพืชหรือแมลงในแปลง</p>
          </div>
          <div className="rounded-xl bg-[var(--color-card-subtle)] p-3 space-y-1">
            <p className="font-bold text-[var(--color-text-title)]">2. ทำฟาร์ม แปรรูปสินค้า & ค้าขายสไตล์ Hay Day</p>
            <p>• แตะที่เล้าไก่ คอกวัว คอกแกะ ซุ้มน้ำผลไม้ หรือเบเกอรี่ เพื่อผลิตไข่ไก่ นมสด ขนแกะ ขนมปัง และเค้ก</p>
            <p>• ส่งสินค้าให้รถบรรทุกตลาด คุยขายให้ชาวบ้านหน้าฟาร์ม วางขายที่แผงริมทาง และแวะเยี่ยมช่วยรดน้ำฟาร์มเพื่อนร่วมห้องได้</p>
          </div>
        </div>
      </BaseModal>

      {/* MODAL 5: Hay Day Farm NPC Visitors */}
      <BaseModal
        isOpen={activeModal === 'visitors'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-xl"
        title={lang === 'th' ? 'ชาวบ้านผู้มาเยือนฟาร์ม' : 'Farm Visitors'}
        subtitle={lang === 'th' ? 'ขายผลผลิตหรือสินค้าแปรรูปให้เพื่อนบ้านและคุณครูเพื่อรับเหรียญและ XP พิเศษ' : 'Sell produce directly to town visitors'}
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
            const ready = have >= vis.quantity;
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
                      <span className="text-[11px] font-semibold text-[var(--color-text-muted)] shrink-0">{vis.roleTh}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-body)]">“{vis.dialogueTh}”</p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums pt-0.5">
                      ขอซื้อ: {itemName} {vis.quantity} ชิ้น (มีอยู่ {have}) · ให้ +{vis.rewardCoins}🪙 +{vis.rewardXp} XP
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
                    {ready ? `ขายให้ (+${vis.rewardCoins}🪙)` : 'ของยังไม่พอ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </BaseModal>
    </div>
  );
};
