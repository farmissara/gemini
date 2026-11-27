import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Coins,
  Droplets,
  Gift,
  Hand,
  HelpCircle,
  Home,
  LockOpen,
  Shovel,
  Sparkles,
  Sprout,
  Star,
  Store,
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
  applyQuizBoostReward,
  BUILDING_CATALOG,
  BUILDING_MAP,
  buySeedPack,
  calculateTownProsperity,
  claimDisciplineSupplies,
  clearWeedOnTile,
  collectBuildingYield,
  computeDisciplineChestSummary,
  constructBuildingOnTile,
  createInitialFarmState,
  CROP_CATALOG,
  CROP_MAP,
  fertilizeTile,
  fulfillMarketOrder,
  getCropSellMultiplier,
  getPlotUnlockStarCost,
  getTodayBangkokDate,
  getTownLevelFromXp,
  grantTeacherBonusToFarm,
  harvestTile,
  helpNeighborFarm,
  isCropUnlocked,
  normalizeFarmState,
  plantCropOnTile,
  resetDailyWaterFlagsIfNeeded,
  resolveStudentForUser,
  sellCropFromBarn,
  syncBehaviorWeedsOntoFarm,
  unlockPlotTile,
  waterTile,
  type BuildingId,
  type CropId,
  type FarmTool,
  type SchoolFarmState,
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

type FarmModalKind = 'market' | 'quiz' | 'town' | 'guide' | null;

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
const playFarmChime = (type: 'water' | 'plant' | 'harvest' | 'coin' | 'build' | 'weed', muted: boolean) => {
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
    } else if (type === 'plant') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
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
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(14);
  const [activeModal, setActiveModal] = useState<FarmModalKind>(null);
  const [marketSubTab, setMarketSubTab] = useState<'orders' | 'shop' | 'barn'>('orders');
  const [feedbacks, setFeedbacks] = useState<FloatingFeedback[]>([]);
  const [neighborSyncTick, setNeighborSyncTick] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [visitingNeighbor, setVisitingNeighbor] = useState<SchoolFarmState | null>(null);

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
    if (disciplineSummary.unresolvedDemeritIds.length === 0) return;
    const synced = syncBehaviorWeedsOntoFarm(farmState, disciplineSummary.unresolvedDemeritIds);
    if (synced !== farmState) {
      persistFarm(synced);
    }
  }, [disciplineSummary.unresolvedDemeritIds]);

  const townLevelInfo = useMemo(() => getTownLevelFromXp(farmState.farmXp), [farmState.farmXp]);
  const prosperityScore = useMemo(() => calculateTownProsperity(farmState), [farmState]);
  const sellMultiplier = useMemo(() => getCropSellMultiplier(farmState), [farmState]);

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
    emitAppToast({
      title: lang === 'th' ? 'เปิดกล่องเสบียงวินัยสำเร็จ!' : 'Discipline Chest Claimed!',
      message: `💧 +${disciplineSummary.claimableWater} · ✨ +${disciplineSummary.claimableFertilizer} · ⭐ +${disciplineSummary.claimableStars} · 🪙 +${disciplineSummary.claimableCoins}`,
      tone: 'success',
    });
  };

  const executeTileAction = (tileIndex: number) => {
    setSelectedTileIndex(tileIndex);
    const tile = farmState.tiles[tileIndex];
    if (!tile) return;

    // Smart Inspect mode: performs the most intuitive helpful action on tap!
    let toolToRun: FarmTool = activeTool;
    if (activeTool === 'inspect') {
      if (!tile.unlocked) {
        toolToRun = 'unlock';
      } else if (tile.kind === 'weed') {
        toolToRun = 'clear_weed';
      } else if (tile.kind === 'building') {
        if (tile.lastCollectedDate !== todayDate) {
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
          }
        }
        return;
      } else if (tile.kind === 'crop' && tile.cropId) {
        const def = CROP_MAP[tile.cropId];
        toolToRun = (tile.growthProgress || 0) >= def.watersNeeded ? 'harvest' : 'water';
      } else if (tile.kind === 'empty') {
        if ((farmState.seeds[selectedCropId] || 0) > 0) {
          toolToRun = 'plant';
        } else {
          return;
        }
      }
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

    if (toolToRun === 'fertilize') {
      const res = fertilizeTile(farmState, tileIndex);
      if (!res.ok) {
        emitAppToast({ title: lang === 'th' ? 'ใส่ปุ๋ยไม่สำเร็จ' : 'Cannot fertilize', message: res.errorTh || 'ใส่ปุ๋ยไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('harvest', farmState.soundMuted);
      pushFeedback(tileIndex, 'โตเต็มที่ x2 ✨', 'amber');
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
        emitAppToast({ title: lang === 'th' ? 'ถอนวัชพืชไม่สำเร็จ' : 'Cannot clear weed', message: res.errorTh || 'ถอนวัชพืชไม่สำเร็จ', tone: 'warning' });
        return;
      }
      persistFarm(res.state);
      playFarmChime('weed', farmState.soundMuted);
      pushFeedback(tileIndex, 'เคลียร์ดินสะอาดแล้ว!', 'emerald');
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

  const handleFulfillOrder = (orderId: string) => {
    const res = fulfillMarketOrder(farmState, orderId);
    if (!res.ok || !res.order) {
      emitAppToast({ title: lang === 'th' ? 'ส่งออเดอร์ไม่สำเร็จ' : 'Order incomplete', message: res.errorTh || 'ส่งออเดอร์ไม่สำเร็จ', tone: 'warning' });
      return;
    }
    persistFarm(res.state);
    playFarmChime('coin', farmState.soundMuted);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, res.order.rewardXp, res.order.rewardGems, true);
    }
    emitAppToast({
      title: lang === 'th' ? 'ส่งออเดอร์โรงเรียนสำเร็จ!' : 'Order Delivered!',
      message: `+${res.order.rewardCoins} 🪙 · +1 ⭐ · +${res.order.rewardGems} Gems`,
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

  const handleHelpNeighbor = (neighbor: SchoolFarmState) => {
    const res = helpNeighborFarm(farmState, neighbor, todayDate);
    if (!res.ok) {
      emitAppToast({ title: lang === 'th' ? 'ช่วยรดน้ำไม่สำเร็จ' : 'Cannot help', message: res.errorTh || 'ช่วยรดน้ำไม่สำเร็จ', tone: 'info' });
      return;
    }
    persistFarm(res.helperState);
    saveSchoolFarmState(schoolId, neighbor.userId, res.neighborState, neighbor.studentId);
    setVisitingNeighbor(res.neighborState);
    playFarmChime('water', farmState.soundMuted);
    emitAppToast({
      title: lang === 'th' ? `ช่วยรดน้ำฟาร์มของ ${neighbor.ownerName} แล้ว!` : 'Helped neighbor farm!',
      message: lang === 'th' ? 'เพื่อนได้ +2 💧 และคุณได้ +15 🪙' : 'Friend +2 water & you +15 coins',
      tone: 'success',
    });
  };

  const handleTeacherSendGift = (neighbor: SchoolFarmState) => {
    const gifted = grantTeacherBonusToFarm(neighbor, { water: 3, fertilizer: 2, stars: 1, coins: 30 });
    saveSchoolFarmState(schoolId, neighbor.userId, gifted, neighbor.studentId);
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
  const weedCount = farmState.tiles.filter((t) => t.kind === 'weed').length;
  const readyCropCount = farmState.tiles.filter(
    (t) => t.kind === 'crop' && t.cropId && (t.growthProgress || 0) >= CROP_MAP[t.cropId].watersNeeded
  ).length;
  const readyBuildingCount = farmState.tiles.filter(
    (t) => t.kind === 'building' && t.lastCollectedDate !== todayDate
  ).length;

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
      id: 'plant',
      labelTh: 'ปลูกพืช',
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
      id: 'fertilize',
      labelTh: 'ปุ๋ยทอง',
      labelEn: 'Fertilize',
      icon: Sparkles,
      badge: farmState.fertilizer,
      toneClass: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'clear_weed',
      labelTh: 'ถอนวัชพืช',
      labelEn: 'Weed',
      icon: Shovel,
      badge: weedCount > 0 ? weedCount : undefined,
      toneClass: 'text-rose-700 dark:text-rose-300',
    },
    {
      id: 'build',
      labelTh: 'สร้างเมือง',
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

  return (
    <div className={`h-full flex flex-col min-h-0 overflow-y-auto space-y-4 pb-6 ${getModuleTone('school_farm')}`}>
      {/* Header: Mobile Fullscreen HUD or Desktop PageHeader */}
      {onExit ? (
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'th' ? 'ออก' : 'Exit'}</span>
          </button>
          <div className="text-center min-w-0">
            <h1 className="text-sm font-black text-[var(--color-text-title)] truncate">
              {farmState.farmName} · Lv.{townLevelInfo.level}
            </h1>
            <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              🪙 {farmState.coins} · 💧 {farmState.water} · ✨ {farmState.fertilizer} · ⭐ {farmState.townStars}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
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
              ? 'มาเรียนตรงเวลา ส่งการบ้านครบ และสะสมความดี เพื่อปลดล็อกน้ำ ปุ๋ย เมล็ดพันธุ์ และสร้างเมืองโรงเรียน'
              : 'Earn water, fertilizer, seeds, and town stars directly from attendance, homework, and merits.'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMarketSubTab('orders');
                  setActiveModal('market');
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <Store className="w-4 h-4" />
                <span>{lang === 'th' ? `ตลาด & ยุ้งฉาง (${totalBarnItems})` : `Market (${totalBarnItems})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('town')}
                className="min-h-[40px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'th' ? 'เมืองเพื่อนร่วมห้อง' : 'Class Town'}</span>
              </button>
              <button
                type="button"
                onClick={() => persistFarm({ ...farmState, soundMuted: !farmState.soundMuted })}
                aria-label="Toggle sound"
                className="min-h-[40px] min-w-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
              >
                {farmState.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('guide')}
                aria-label="How to play"
                className="min-h-[40px] min-w-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2.5">
                <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">เมือง Lv.{townLevelInfo.level}</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">
                    {prosperityScore} แต้ม
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">เหรียญฟาร์ม</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.coins}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2.5">
                <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">น้ำรดต้นไม้</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.water}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">ปุ๋ยทองคำ</p>
                  <p className="text-sm font-black text-[var(--color-text-title)] tabular-nums">{farmState.fertilizer}</p>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 flex items-center gap-2.5">
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
            feedbacks={feedbacks}
            lang={lang}
            onTileActivate={executeTileAction}
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
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition cursor-pointer ${
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
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: crop.accentColor }}
                        />
                        <span>{lang === 'th' ? crop.nameTh : crop.nameEn}</span>
                        <span className="font-mono text-[11px] opacity-80">x{owned}</span>
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        {unlocked
                          ? `💧${crop.watersNeeded} · ขาย ${crop.sellPrice}🪙`
                          : `ปลดล็อก Lv.${crop.unlockTownLevel}${crop.minHomeworkCount ? ` & การบ้าน ${crop.minHomeworkCount}` : ''}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Contextual Building Picker when Build tool is active */}
            {activeTool === 'build' && (
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {BUILDING_CATALOG.map((b) => {
                  const locked = townLevelInfo.level < b.unlockTownLevel;
                  const selected = selectedBuildingId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedBuildingId(b.id)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-left shrink-0 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100'
                          : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <div className="text-xs font-bold">{lang === 'th' ? b.nameTh : b.nameEn}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                        {locked
                          ? `ต้องใช้เมือง Lv.${b.unlockTownLevel}`
                          : `${b.coinCost}🪙 · ${b.starCost}★ · +${b.dailyCoins}🪙/วัน`}
                      </div>
                    </button>
                  );
                })}
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
                    {lang === 'th' ? 'ดึงข้อมูลจริงจากเช็กชื่อ การบ้าน & ความดี' : 'Synced live with school records'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-card-subtle)] px-3 py-2">
                <span className="text-[var(--color-text-body)]">เช็กชื่อเข้าเรียนวันนี้</span>
                <span
                  className={`font-bold ${
                    disciplineSummary.attendanceStatusToday === 'present'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : disciplineSummary.attendanceStatusToday === 'late'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {disciplineSummary.attendanceStatusToday === 'present'
                    ? `ตรงเวลา (${disciplineSummary.attendanceStreakDays} วันติด)`
                    : disciplineSummary.attendanceStatusToday === 'late'
                      ? 'มาสาย (ได้เสบียงครึ่งหนึ่ง)'
                      : 'ยังไม่มีบันทึกวันนี้'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-card-subtle)] px-3 py-2">
                <span className="text-[var(--color-text-body)]">การบ้านที่ส่งแล้ว</span>
                <span className="font-bold text-[var(--color-text-title)] tabular-nums">
                  {disciplineSummary.submittedHomeworkCount} งาน
                  {disciplineSummary.pendingHomeworkCount > 0 && (
                    <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                      (ค้าง {disciplineSummary.pendingHomeworkCount})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--color-card-subtle)] px-3 py-2">
                <span className="text-[var(--color-text-body)]">ความดีสะสม</span>
                <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  +{disciplineSummary.totalMeritPoints} แต้ม
                </span>
              </div>
            </div>

            {disciplineSummary.pendingHomeworkCount > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                งานค้างส่ง: {disciplineSummary.pendingHomeworkTitles.join(', ')} — ส่งงานแล้วมารับเมล็ดพันธุ์พิเศษฟรี!
              </div>
            )}

            <button
              type="button"
              onClick={handleClaimDisciplineChest}
              className={`w-full min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
                disciplineSummary.hasAnythingToClaim
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {disciplineSummary.hasAnythingToClaim
                  ? `เปิดรับเสบียง (+${disciplineSummary.claimableWater}💧 +${disciplineSummary.claimableFertilizer}✨ +${disciplineSummary.claimableStars}★)`
                  : 'รับเสบียงล่าสุดครบแล้ว (เช็กชื่อ/ส่งงานเพิ่มเพื่อรับใหม่)'}
              </span>
            </button>
          </section>

          {/* Selected Plot Inspector */}
          {selectedTile && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-[var(--color-text-title)]">
                  แปลงที่ #{selectedTile.index + 1} (แถว {selectedTile.row + 1}, ช่อง {selectedTile.col + 1})
                </h3>
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {!selectedTile.unlocked
                    ? 'ยังไม่ปลดล็อก'
                    : selectedTile.kind === 'crop' && selectedTile.cropId
                      ? CROP_MAP[selectedTile.cropId].nameTh
                      : selectedTile.kind === 'building' && selectedTile.buildingId
                        ? BUILDING_MAP[selectedTile.buildingId].nameTh
                        : selectedTile.kind === 'weed'
                          ? 'มีวัชพืช'
                          : 'ดินว่างพร้อมใช้งาน'}
                </span>
              </div>

              {selectedTile.kind === 'crop' && selectedTile.cropId && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                    <span>ความคืบหน้าการโต</span>
                    <span className="font-mono font-bold">
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
                </div>
              )}

              {selectedTile.kind === 'building' && selectedTile.buildingId && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {BUILDING_MAP[selectedTile.buildingId].descTh} ·{' '}
                  {selectedTile.lastCollectedDate === todayDate ? 'วันนี้เก็บผลผลิตแล้ว' : 'แตะที่ตัวอาคารบนแผนที่เพื่อรับรายได้วันนี้!'}
                </p>
              )}

              {!selectedTile.unlocked && (
                <button
                  type="button"
                  onClick={() => executeTileAction(selectedTile.index)}
                  className="w-full min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <LockOpen className="w-4 h-4" />
                  <span>
                    ปลดล็อกแปลงนี้ ({getPlotUnlockStarCost(farmState.tiles.filter((t) => t.unlocked).length)} ⭐)
                  </span>
                </button>
              )}
            </section>
          )}

          {/* Quick Secondary Panels (Market, Study Quiz Boost, Class Town) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setMarketSubTab('orders');
                setActiveModal('market');
              }}
              className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-left cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Store className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-text-title)] truncate">ตลาดเกษตร & ซื้อเมล็ด</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    ในยุ้งฉาง {totalBarnItems} ชิ้น · ออเดอร์ {farmState.marketOrders.length}
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
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
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
                    {isStaff ? 'เมืองห้องเรียน & มอบรางวัลครู' : 'เยี่ยมฟาร์มเพื่อนร่วมโรงเรียน'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    มีฟาร์มในโรงเรียน {Math.max(1, neighbors.length)} แห่ง
                  </p>
                </div>
              </div>
              <Award className="w-4 h-4 text-emerald-500 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Farm Market, Seed Shop & Barn */}
      <BaseModal
        isOpen={activeModal === 'market'}
        onClose={() => setActiveModal(null)}
        maxWidthClass="max-w-2xl"
        title={lang === 'th' ? 'ตลาดเกษตรโรงเรียน & ยุ้งฉาง' : 'School Farm Market & Barn'}
        subtitle={
          lang === 'th'
            ? `เหรียญฟาร์มของคุณ: ${farmState.coins} 🪙${sellMultiplier > 1 ? ` · โบนัสเบเกอรี่ +${Math.round((sellMultiplier - 1) * 100)}%` : ''}`
            : `Coins: ${farmState.coins}`
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            {(
              [
                { id: 'orders', label: 'ออเดอร์โรงเรียน' },
                { id: 'shop', label: 'ซื้อเมล็ดพันธุ์' },
                { id: 'barn', label: `ยุ้งฉาง (${totalBarnItems})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMarketSubTab(tab.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold cursor-pointer transition ${
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
                const owned = farmState.barn[order.cropId] || 0;
                const ready = owned >= order.quantity;
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-title)]">{order.titleTh}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        ต้องการ {crop.nameTh} {order.quantity} ชิ้น (มีในยุ้งฉาง {owned}) · รางวัล +{order.rewardCoins}🪙 +1⭐ +{order.rewardGems} Gems
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => handleFulfillOrder(order.id)}
                      className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 cursor-pointer transition"
                    >
                      {ready ? 'ส่งออเดอร์รับรางวัล' : 'ผลผลิตยังไม่พอ'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {marketSubTab === 'shop' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CROP_CATALOG.map((crop) => {
                const unlocked = isCropUnlocked(crop.id, farmState, disciplineSummary.submittedHomeworkCount);
                return (
                  <div
                    key={crop.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                        {crop.nameTh} (มี {farmState.seeds[crop.id] || 0})
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{crop.descTh}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!unlocked || farmState.coins < crop.seedCost}
                      onClick={() => handleBuySeed(crop.id)}
                      className="min-h-[40px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 cursor-pointer transition"
                    >
                      {unlocked ? `${crop.seedCost}🪙` : `Lv.${crop.unlockTownLevel}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {marketSubTab === 'barn' && (
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
                      <p className="text-xs text-[var(--color-text-muted)]">คงเหลือ {qty} ชิ้น · ขายได้ {price}🪙/ชิ้น</p>
                    </div>
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => handleSellBarn(crop.id)}
                      className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 cursor-pointer transition"
                    >
                      ขาย 1 ชิ้น
                    </button>
                  </div>
                );
              })}
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

      {/* MODAL 3: Class Town Leaderboard, Visit & Teacher Bonus */}
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
            ? `ความเจริญเมือง ${calculateTownProsperity(visitingNeighbor)} แต้ม`
            : 'เยี่ยมฟาร์มเพื่อนเพื่อช่วยรดน้ำวันละ 1 ครั้ง/คน (เพื่อนได้ +2💧 คุณได้ +15🪙)'
        }
      >
        {visitingNeighbor ? (
          <div className="space-y-3">
            <IsometricFarmBoard
              tiles={visitingNeighbor.tiles}
              selectedTileIndex={null}
              activeTool="inspect"
              todayDate={todayDate}
              readOnly
              feedbacks={[]}
              lang={lang}
              onTileActivate={() => undefined}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisitingNeighbor(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold cursor-pointer"
              >
                ← กลับหน้ารวมเมือง
              </button>
              <div className="flex items-center gap-2">
                {visitingNeighbor.userId !== userId && (
                  <button
                    type="button"
                    disabled={farmState.helpedNeighborDates[visitingNeighbor.userId] === todayDate}
                    onClick={() => handleHelpNeighbor(visitingNeighbor)}
                    className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition"
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
                    className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition"
                  >
                    มอบโบนัสครู (+3💧 +2✨ +1★)
                  </button>
                )}
              </div>
            </div>
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
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {n.ownerRoom ? `${n.ownerRoom} · ` : ''}Lv.{lv} · ความเจริญ {score} แต้ม · เก็บเกี่ยว {n.totalHarvested} ครั้ง
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setVisitingNeighbor(n)}
                      className="min-h-[40px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-xs font-bold cursor-pointer transition"
                    >
                      เยี่ยมชมฟาร์ม
                    </button>
                    {isStaff && !isMe && (
                      <button
                        type="button"
                        onClick={() => handleTeacherSendGift(n)}
                        className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition"
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
            <p>• เช็กชื่อมาเรียนตรงเวลา: รับบัวรดน้ำ 💧 และปุ๋ยทองคำ ✨ ทุกวัน (มาติดกันได้โบนัสเพิ่ม)</p>
            <p>• ส่งการบ้านตรงเวลา: ปลดล็อกเมล็ดพืชหายาก (สตรอว์เบอร์รี / เมล่อนทองคำ) และรับเมล็ดฟรี</p>
            <p>• คะแนนความดี: รับดาวเมือง ⭐ เพื่อขยายแปลงและสร้างเล้าไก่/คอกวัว/โรงสี</p>
          </div>
          <div className="rounded-xl bg-[var(--color-card-subtle)] p-3 space-y-1">
            <p className="font-bold text-[var(--color-text-title)]">2. การดูแลฟาร์มแบบ 1-Tap</p>
            <p>• ใช้โหมด &ldquo;แตะอัจฉริยะ&rdquo; แตะที่พืชสุกเพื่อเก็บเกี่ยว แตะต้นที่กระหายเพื่อรดน้ำ หรือแตะอาคารเพื่อเก็บรายได้ประจำวัน</p>
            <p>• นำผลผลิตไปส่งออเดอร์ในตลาดเกษตรเพื่อรับเหรียญฟาร์มและ Gems เข้าโปรไฟล์ EduVerse</p>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
