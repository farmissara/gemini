import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Trophy, 
  Upload, 
  Download, 
  Plus, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  Coins, 
  Medal, 
  Search,
  Filter,
  Check,
  Zap,
  RotateCcw,
  BookOpen,
  Gamepad2,
  FlaskConical,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Rocket,
  Grid2x2,
  SpellCheck2,
  GitBranch,
  LayoutGrid,
  Shield,
  Split,
  Timer,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bot,
  Play,
  Radio,
  Gift,
  Palette,
  ClipboardCheck,
} from 'lucide-react';
import { QuizQuestion, PlayerScore, RewardItem, RewardRedemptionRequest, AuthUser, AppLanguage } from '../types';
import { COMPREHENSIVE_QUESTION_BANK } from '../data/examQuestionBanks';
import { EduBattleRoyale3DView } from './EduBattleRoyale3DView';
import { SubjectLabSimulationView } from './SubjectLabSimulationView';
import { LiveClassroomArenaView } from './LiveClassroomArenaView';
import { MeteorMathBlasterGame } from '../components/games/MeteorMathBlasterGame';
import { ConceptMatchBlitzGame } from '../components/games/ConceptMatchBlitzGame';
import { WordBuilderPuzzleGame } from '../components/games/WordBuilderPuzzleGame';
import { ChronoSortTowerGame } from '../components/games/ChronoSortTowerGame';
import {
  DAILY_ARCADE_MISSIONS,
  DailyArcadeMission,
  ArcadeMissionProgress,
  loadDailyArcadeMissions,
  incrementArcadeMissionProgress,
  claimArcadeMissionReward,
} from '../data/arcadeGamesData';
import { PagedList } from '../components/PagedList';
import {
  playHeavyImpactSound,
  playComboStreakSound,
  playGrandVictoryFanfare,
  playPowerupChimeSound,
} from '../lib/labSoundEffects';
import { getProfileFrame, triggerHaptic } from '../lib/arcadeStore';

export type EduGameSubTab =
  | 'hub'
  | 'live_room'
  | 'meteor_blaster'
  | 'concept_match'
  | 'word_builder'
  | 'chrono_sort'
  | 'battle_royale_3d'
  | 'subject_labs'
  | 'arena'
  | 'bank'
  | 'leaderboard'
  | 'shop';

interface EduBattleGameViewProps {
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  rewardRedemptions?: RewardRedemptionRequest[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  initialSubTab?: EduGameSubTab;
  isMobileMode?: boolean;
  onGamePlayingChange?: (isPlaying: boolean) => void;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
  onEquipCosmetic?: (payload: { frameId?: string; title?: string }) => void;
  onReviewRedemption?: (requestId: string, status: 'approved' | 'rejected', teacherNote?: string) => void;
  onCreateCustomReward?: (item: RewardItem) => void;
  onOpenCentralExamHub?: () => void;
  onExit?: () => void;
}

export const EduBattleGameView: React.FC<EduBattleGameViewProps> = ({
  questions,
  playerScores,
  rewardItems,
  rewardRedemptions = [],
  currentUser,
  lang,
  initialSubTab,
  isMobileMode = false,
  onAddQuestion,
  onImportQuestions,
  onEarnRewards,
  onRedeemReward,
  onEquipCosmetic,
  onReviewRedemption,
  onCreateCustomReward,
  onGamePlayingChange,
  onOpenCentralExamHub,
  onExit
}) => {
  const effectiveUserId = currentUser?.id || 'temp';
  const canManageBank =
    currentUser?.role === 'teacher' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  const [activeSubTab, setActiveSubTab] = useState<EduGameSubTab>(
    initialSubTab || 'hub'
  );
  const [hubCategory, setHubCategory] = useState<'all' | 'arcade' | 'battle' | 'lab'>('all');
  const [showMissionsDrawer, setShowMissionsDrawer] = useState(false);
  const [shopSection, setShopSection] = useState<'perks' | 'cosmetics' | 'history' | 'approvals'>('perks');
  const [showCreateRewardForm, setShowCreateRewardForm] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDesc, setNewRewardDesc] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(80);
  const [newRewardStock, setNewRewardStock] = useState(20);
  const [shopNotice, setShopNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleBackFromGame = () => {
    setIs3DBattlePlaying(false);
    setBattleState('idle');
    if (isMobileMode && initialSubTab && initialSubTab !== 'hub' && onExit) {
      onExit();
      return;
    }
    setActiveSubTab('hub');
  };

  // Daily Arcade Missions Progress
  const [missionProgress, setMissionProgress] = useState<ArcadeMissionProgress>(() =>
    loadDailyArcadeMissions(effectiveUserId)
  );

  useEffect(() => {
    setMissionProgress(loadDailyArcadeMissions(effectiveUserId));
  }, [effectiveUserId]);

  const recordMissionProgress = (missionId: DailyArcadeMission['id'], delta = 1) => {
    setMissionProgress(incrementArcadeMissionProgress(effectiveUserId, missionId, delta));
  };

  const handleClaimMission = (mission: DailyArcadeMission) => {
    const count = missionProgress.counts[mission.id] || 0;
    const alreadyClaimed = missionProgress.claimed[mission.id];
    if (alreadyClaimed || count < mission.target) return;
    playPowerupChimeSound();
    setMissionProgress(claimArcadeMissionReward(effectiveUserId, mission.id));
    onEarnRewards(effectiveUserId, mission.rewardExp, mission.rewardGems, false);
  };

  const [examSource, setExamSource] = useState<'all' | 'teacher_created' | 'standard'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchBankQuery, setSearchBankQuery] = useState('');

  // 1v1 Battle State & Tactical Lifelines
  const [battleState, setBattleState] = useState<'idle' | 'playing' | 'round_over' | 'finished'>('idle');
  const [lobbyStep, setLobbyStep] = useState<0 | 1>(0);
  const [is3DBattlePlaying, setIs3DBattlePlaying] = useState(false);
  const [showUtilitiesMenu, setShowUtilitiesMenu] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [timer, setTimer] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [battleFeedback, setBattleFeedback] = useState<string | null>(null);
  const [arenaZoom, setArenaZoom] = useState<number>(1.0);
  const [fiftyFiftyLeft, setFiftyFiftyLeft] = useState(1);
  const [timeBoostLeft, setTimeBoostLeft] = useState(1);
  const [shieldCharges, setShieldCharges] = useState(1);
  const [shieldActive, setShieldActive] = useState(false);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);

  useEffect(() => {
    onGamePlayingChange?.(battleState === 'playing' || is3DBattlePlaying);
  }, [battleState, is3DBattlePlaying, onGamePlayingChange]);

  // New Question Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionFormStep, setQuestionFormStep] = useState<0 | 1>(0);
  const [newSubject, setNewSubject] = useState('คณิตศาสตร์ (Mathematics)');
  const [newGradeLevel, setNewGradeLevel] = useState('ม.6');
  const [newCategory, setNewCategory] = useState<'standard_exam' | 'onet' | 'general' | 'review' | 'exam'>('standard_exam');
  const [newQuestionTh, setNewQuestionTh] = useState('');
  const [newQuestionEn, setNewQuestionEn] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanationTh, setNewExplanationTh] = useState('');
  const [newPoints, setNewPoints] = useState(100);

  // Import State
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Combine real school questions + built-in curriculum bank so 1v1 Arena NEVER crashes on empty school bank
  const combinedQuestionPool: QuizQuestion[] = React.useMemo(() => {
    const seen = new Set<string>();
    const list: QuizQuestion[] = [];
    for (const q of [...questions, ...COMPREHENSIVE_QUESTION_BANK]) {
      if (q && q.id && !seen.has(q.id) && Array.isArray(q.options) && q.options.length >= 2) {
        seen.add(q.id);
        list.push(q);
      }
    }
    return list;
  }, [questions]);

  // Separate teacher-created/imported exams vs standard bank
  const teacherCreatedQuestions = questions.filter(
    q => q.id.startsWith('q-custom-') || q.id.startsWith('csv-') || q.category === 'exam'
  );

  // Active Questions for Battle (filtered by exam source & subject)
  const sourceFilteredQuestions =
    examSource === 'teacher_created'
      ? (teacherCreatedQuestions.length > 0 ? teacherCreatedQuestions : questions.length > 0 ? questions : combinedQuestionPool)
      : examSource === 'standard'
      ? combinedQuestionPool.filter(q => q.category === 'standard_exam' || q.category === 'onet')
      : combinedQuestionPool;

  const matchesSubjectFilter = (q: QuizQuestion, subjFilter: string) => {
    if (subjFilter === 'all') return true;
    if (subjFilter === 'ภาษาไทย') return q.strand === 'thai' || q.subject.includes('ไทย');
    if (subjFilter === 'คณิตศาสตร์') return q.strand === 'math' || q.subject.includes('คณิต');
    if (subjFilter === 'วิทยาศาสตร์') return q.strand === 'science_tech' || q.subject.includes('วิทย์') || q.subject.includes('คำนวณ') || q.subject.includes('ฟิสิกส์') || q.subject.includes('เคมี') || q.subject.includes('ชีว');
    if (subjFilter === 'สังคมศึกษา') return q.strand === 'social' || q.subject.includes('สังคม') || q.subject.includes('ประวัติ') || q.subject.includes('ภูมิศาสตร์');
    if (subjFilter === 'สุขศึกษา') return q.strand === 'health_pe' || q.subject.includes('สุข') || q.subject.includes('พลศึกษา') || q.subject.includes('ปฐมพยาบาล');
    if (subjFilter === 'ศิลปะ') return q.strand === 'arts' || q.subject.includes('ศิลป') || q.subject.includes('ดนตรี') || q.subject.includes('นาฏศิลป');
    if (subjFilter === 'การงานอาชีพ') return q.strand === 'career_tech' || q.subject.includes('การงาน') || q.subject.includes('อาชีพ');
    if (subjFilter === 'ภาษาอังกฤษ') return q.strand === 'foreign_lang' || q.subject.includes('อังกฤษ') || q.subject.includes('ภาษาต่างประเทศ');
    return q.subject.includes(subjFilter);
  };

  const subjectFilteredQuestions =
    selectedSubject === 'all'
      ? sourceFilteredQuestions
      : sourceFilteredQuestions.filter(q => matchesSubjectFilter(q, selectedSubject));

  const battleQuestions =
    subjectFilteredQuestions.length > 0
      ? subjectFilteredQuestions
      : sourceFilteredQuestions.length > 0
      ? sourceFilteredQuestions
      : combinedQuestionPool;
  const currentQ = battleQuestions[currentQuestionIndex % Math.max(1, battleQuestions.length)];

  // Synthesized Arcade Sound Effects
  const playArcadeSound = (freq: number, type: OscillatorType = 'sine', duration = 0.15) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context policy safe ignore
    }
  };

  // Battle Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (battleState === 'playing' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 4 && prev > 1) {
            playArcadeSound(440, 'triangle', 0.08);
          }
          return prev - 1;
        });
      }, 1000);
    } else if (battleState === 'playing' && timer === 0) {
      handleTimeOut();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [battleState, timer]);

  const handleStartBattle = () => {
    if (battleQuestions.length === 0) return;
    playArcadeSound(523, 'triangle', 0.12);
    setTimeout(() => playArcadeSound(659, 'triangle', 0.12), 100);
    setTimeout(() => playArcadeSound(784, 'sine', 0.25), 200);
    setCurrentQuestionIndex(0);
    setPlayerHp(100);
    setOpponentHp(100);
    setTimer(15);
    setSelectedAnswer(null);
    setStreak(0);
    setRoundScore(0);
    setBattleFeedback(null);
    setFiftyFiftyLeft(1);
    setTimeBoostLeft(1);
    setShieldCharges(1);
    setShieldActive(false);
    setEliminatedIndices([]);
    setBattleState('playing');
  };

  const handleUseFiftyFifty = () => {
    if (!currentQ || battleState !== 'playing' || selectedAnswer !== null || fiftyFiftyLeft <= 0) return;
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter((i) => i !== currentQ.correctIndex && !eliminatedIndices.includes(i));
    const picked = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminatedIndices(picked);
    setFiftyFiftyLeft((prev) => prev - 1);
    playPowerupChimeSound();
  };

  const handleUseTimeBoost = () => {
    if (battleState !== 'playing' || selectedAnswer !== null || timeBoostLeft <= 0) return;
    setTimer((prev) => prev + 7);
    setTimeBoostLeft((prev) => prev - 1);
    playPowerupChimeSound();
  };

  const handleUseShield = () => {
    if (battleState !== 'playing' || selectedAnswer !== null || shieldCharges <= 0 || shieldActive) return;
    setShieldActive(true);
    setShieldCharges((prev) => prev - 1);
    playPowerupChimeSound();
  };

  const handleTimeOut = () => {
    if (shieldActive) {
      playPowerupChimeSound();
      setShieldActive(false);
      setStreak(0);
      setBattleFeedback('🛡️ หมดเวลาแต่โล่กันดาเมจช่วยป้องกัน 25 HP ไว้ได้!');
      checkBattleEnd(playerHp, opponentHp);
      return;
    }
    playArcadeSound(180, 'sawtooth', 0.3);
    const newHp = Math.max(0, playerHp - 25);
    setPlayerHp(newHp);
    setStreak(0);
    setBattleFeedback('⏰ หมดเวลา! ได้รับดาเมจ 25 HP');
    checkBattleEnd(newHp, opponentHp);
  };

  const handleAnswer = (index: number) => {
    if (!currentQ || selectedAnswer !== null || battleState !== 'playing' || eliminatedIndices.includes(index)) return;
    setSelectedAnswer(index);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      playHeavyImpactSound();
      playComboStreakSound(streak + 1);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
      const timeBonus = timer * 5;
      const damage = 25 + streak * 5;
      const newOpponentHp = Math.max(0, opponentHp - damage);
      setOpponentHp(newOpponentHp);
      setStreak(prev => prev + 1);
      setRoundScore(prev => prev + currentQ.points + timeBonus);
      setBattleFeedback(`💥 คริติคอลสตริก! โจมตี +${damage} HP (โบนัสความเร็ว +${timeBonus})`);
      checkBattleEnd(playerHp, newOpponentHp);
    } else if (shieldActive) {
      playPowerupChimeSound();
      setShieldActive(false);
      setStreak(0);
      setBattleFeedback(`🛡️ โล่กันดาเมจทำงาน! ป้องกัน 20 HP สำเร็จ (เฉลยข้อ ${String.fromCharCode(65 + currentQ.correctIndex)}: ${currentQ.options[currentQ.correctIndex]})`);
      checkBattleEnd(playerHp, opponentHp);
    } else {
      playArcadeSound(200, 'sawtooth', 0.25);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(120);
      }
      const newPlayerHp = Math.max(0, playerHp - 20);
      setPlayerHp(newPlayerHp);
      setStreak(0);
      setBattleFeedback(`⚠️ ตอบผิด! เสีย 20 HP (เฉลยข้อ ${String.fromCharCode(65 + currentQ.correctIndex)}: ${currentQ.options[currentQ.correctIndex]})`);
      checkBattleEnd(newPlayerHp, opponentHp);
    }
  };

  const checkBattleEnd = (newPlayerHp: number, newOpponentHp: number) => {
    setTimeout(() => {
      if (newPlayerHp <= 0 || newOpponentHp <= 0 || currentQuestionIndex + 1 >= battleQuestions.length) {
        setBattleState('finished');
        const isWin = newOpponentHp <= 0 || (newPlayerHp > newOpponentHp);
        if (isWin) {
          playGrandVictoryFanfare();
        }
        const expGained = isWin ? 250 : 80;
        const gemsGained = isWin ? 30 : 10;
        onEarnRewards(effectiveUserId, expGained, gemsGained, isWin);
        recordMissionProgress('duel', 1);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setEliminatedIndices([]);
        setTimer(15);
        setBattleFeedback(null);
      }
    }, 1100);
  };

  // Export Question Bank as JSON
  const handleExportQuestionsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `EduVerse_QuestionBank_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Question Bank as CSV
  const handleExportQuestionsCSV = () => {
    const headers = ['id', 'subject', 'gradeLevel', 'category', 'questionTh', 'option1', 'option2', 'option3', 'option4', 'correctIndex', 'explanationTh', 'points'];
    const rows = questions.map(q => [
      q.id,
      `"${q.subject.replace(/"/g, '""')}"`,
      `"${q.gradeLevel.replace(/"/g, '""')}"`,
      q.category,
      `"${q.questionTh.replace(/"/g, '""')}"`,
      `"${(q.options[0] || '').replace(/"/g, '""')}"`,
      `"${(q.options[1] || '').replace(/"/g, '""')}"`,
      `"${(q.options[2] || '').replace(/"/g, '""')}"`,
      `"${(q.options[3] || '').replace(/"/g, '""')}"`,
      q.correctIndex,
      `"${(q.explanationTh || '').replace(/"/g, '""')}"`,
      q.points
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduVerse_Questions_O_NET_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Handle File Upload Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text) as QuizQuestion[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            onImportQuestions(parsed);
            setImportNotification(`นำเข้าข้อสอบ JSON สำเร็จจำนวน ${parsed.length} ข้อ`);
          }
        } else if (file.name.endsWith('.csv')) {
          // Simple CSV parser
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            const parsedQuestions: QuizQuestion[] = [];
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              if (cols.length >= 8) {
                parsedQuestions.push({
                  id: `csv-${Date.now()}-${i}`,
                  subject: cols[1] || 'วิชาทั่วไป',
                  gradeLevel: cols[2] || 'ม.6',
                  category: (cols[3] as any) || 'standard_exam',
                  questionTh: cols[4] || '',
                  questionEn: cols[4] || '',
                  options: [cols[5] || 'ก', cols[6] || 'ข', cols[7] || 'ค', cols[8] || 'ง'],
                  correctIndex: parseInt(cols[9] || '0', 10) || 0,
                  explanationTh: cols[10] || 'คำอธิบายเฉลย',
                  points: 100
                });
              }
            }
            if (parsedQuestions.length > 0) {
              onImportQuestions(parsedQuestions);
              setImportNotification(`นำเข้าข้อสอบ CSV สำเร็จจำนวน ${parsedQuestions.length} ข้อ`);
            }
          }
        }
      } catch (err) {
        console.error('Import error:', err);
        setImportNotification('เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ JSON/CSV');
      }
    };
    reader.readAsText(file);
    setTimeout(() => setImportNotification(null), 5000);
  };

  const handleSaveNewQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionTh.trim()) return;

    const newQ: QuizQuestion = {
      id: `q-custom-${Date.now()}`,
      subject: newSubject,
      gradeLevel: newGradeLevel,
      category: newCategory,
      questionTh: newQuestionTh,
      questionEn: newQuestionEn || newQuestionTh,
      options: newOptions,
      correctIndex: newCorrectIndex,
      explanationTh: newExplanationTh,
      points: newPoints
    };

    onAddQuestion(newQ);
    setShowAddModal(false);
    setQuestionFormStep(0);
    setNewQuestionTh('');
    setNewQuestionEn('');
    setNewOptions(['', '', '', '']);
    setNewExplanationTh('');
  };

  const filteredBank = questions.filter(q => {
    const matchesSubject = matchesSubjectFilter(q, selectedSubject);
    const matchesSearch = !searchBankQuery || 
      q.questionTh.toLowerCase().includes(searchBankQuery.toLowerCase()) || 
      q.subject.toLowerCase().includes(searchBankQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Current user's real player stats (zero fake numbers when starting fresh)
  const currentPlayerStats: PlayerScore = playerScores.find(p => p.userId === currentUser?.id) || {
    userId: currentUser?.id || 'temp',
    name: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เล่น',
    role: currentUser?.role === 'teacher' ? 'teacher' : 'student',
    avatarUrl: currentUser?.avatarUrl || '',
    exp: 0,
    gems: 0,
    rankTitle: 'Rookie Explorer',
    battleWins: 0,
    streak: 0,
    dailyStreak: 0,
    equippedFrameId: 'frame-default',
    unlockedItemIds: [],
  };

  const currentFrame = getProfileFrame(currentPlayerStats.equippedFrameId);
  const pendingApprovalCount = rewardRedemptions.filter((r) => r.status === 'pending').length;
  const myRedemptions = rewardRedemptions.filter((r) => r.userId === effectiveUserId);

  const playerLevel = Math.floor(currentPlayerStats.exp / 500) + 1;
  const levelProgressPct = Math.round(((currentPlayerStats.exp % 500) / 500) * 100);

  const ARCADE_GAME_CARDS: {
    id: EduGameSubTab;
    category: 'arcade' | 'battle' | 'lab';
    titleTh: string;
    tagEn: string;
    descriptionTh: string;
    strandsTh: string;
    accentBg: string;
    accentText: string;
    accentBorder: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'meteor_blaster',
      category: 'arcade',
      titleTh: 'Meteor Math Blaster',
      tagEn: 'SPACE SHOOTER',
      descriptionTh: 'ยิงอุกกาบาตสมการคณิตและสูตรฟิสิกส์กลางอวกาศ พร้อมสกิล Freeze & Nova',
      strandsTh: 'คณิต · ฟิสิกส์',
      accentBg: 'bg-cyan-500/15',
      accentText: 'text-cyan-400',
      accentBorder: 'hover:border-cyan-400/70',
      icon: Rocket,
    },
    {
      id: 'concept_match',
      category: 'arcade',
      titleTh: 'Match & Memory Blitz',
      tagEn: 'SPEED & MEMORY',
      descriptionTh: 'จับคู่ความรู้ความเร็วสูงและพลิกการ์ดความจำ 12 ใบ ครบทุกกลุ่มสาระ',
      strandsTh: '8 กลุ่มสาระ',
      accentBg: 'bg-violet-500/15',
      accentText: 'text-violet-400',
      accentBorder: 'hover:border-violet-400/70',
      icon: Grid2x2,
    },
    {
      id: 'word_builder',
      category: 'arcade',
      titleTh: 'Word Builder Puzzle',
      tagEn: 'VOCAB TILES',
      descriptionTh: 'ต่อคำศัพท์สองภาษาจากคำใบ้ สะสมสตรีคและใช้ตัวช่วยเปิดตัวอักษร',
      strandsTh: 'อังกฤษ · วิทย์',
      accentBg: 'bg-amber-500/15',
      accentText: 'text-amber-400',
      accentBorder: 'hover:border-amber-400/70',
      icon: SpellCheck2,
    },
    {
      id: 'chrono_sort',
      category: 'arcade',
      titleTh: 'ChronoSort Rush',
      tagEn: 'LOGIC & TIMELINE',
      descriptionTh: 'แยกหมวดสายพานซ้าย-ขวาสุดไว และเรียงลำดับไทม์ไลน์-อัลกอริทึม',
      strandsTh: 'ไทย · สังคม · โค้ด',
      accentBg: 'bg-emerald-500/15',
      accentText: 'text-emerald-400',
      accentBorder: 'hover:border-emerald-400/70',
      icon: GitBranch,
    },
    {
      id: 'arena',
      category: 'battle',
      titleTh: '1v1 Speed Duel',
      tagEn: 'LIVE HP DUEL',
      descriptionTh: 'ดวลตอบคำถามจับเวลา 15 วิ พร้อมตัวช่วย 50/50, +7s และโล่กันพลาด',
      strandsTh: `${combinedQuestionPool.length} ข้อสอบ`,
      accentBg: 'bg-rose-500/15',
      accentText: 'text-rose-400',
      accentBorder: 'hover:border-rose-400/70',
      icon: Swords,
    },
    {
      id: 'battle_royale_3d',
      category: 'battle',
      titleTh: '3D Battle Royale',
      tagEn: '3D EXPLORE',
      descriptionTh: 'วิ่งสำรวจเกาะ 3 มิติ ล่าหีบความรู้และแอร์ดรอปคูณคะแนน 2 เท่า',
      strandsTh: '8 กลุ่มสาระ',
      accentBg: 'bg-indigo-500/15',
      accentText: 'text-indigo-400',
      accentBorder: 'hover:border-indigo-400/70',
      icon: Gamepad2,
    },
    {
      id: 'subject_labs',
      category: 'lab',
      titleTh: 'Interactive Subject Labs',
      tagEn: '6D SIMULATION',
      descriptionTh: 'ทดลองผสมสารเคมี ยิงจรวดฟิสิกส์ ครัวไวยากรณ์ บล็อกโค้ด และแผนที่โลก',
      strandsTh: 'STEM · ภาษา · สังคม',
      accentBg: 'bg-sky-500/15',
      accentText: 'text-sky-400',
      accentBorder: 'hover:border-sky-400/70',
      icon: FlaskConical,
    },
  ];

  const visibleGameCards =
    hubCategory === 'all'
      ? ARCADE_GAME_CARDS
      : ARCADE_GAME_CARDS.filter((c) => c.category === hubCategory);

  const missionTargetTabMap: Record<DailyArcadeMission['id'], EduGameSubTab> = {
    meteor: 'meteor_blaster',
    match: 'concept_match',
    word: 'word_builder',
    sort: 'chrono_sort',
    duel: 'arena',
  };

  const readyMissionCount = DAILY_ARCADE_MISSIONS.filter((m) => {
    const count = missionProgress.counts[m.id] || 0;
    return count >= m.target && !missionProgress.claimed[m.id];
  }).length;

  const completedMissionCount = DAILY_ARCADE_MISSIONS.filter(
    (m) => missionProgress.claimed[m.id]
  ).length;

  // Hide ALL outer chrome while inside any playable game so there is NEVER a double/triple header!
  const isInActiveGame =
    ['live_room', 'meteor_blaster', 'concept_match', 'word_builder', 'chrono_sort', 'battle_royale_3d', 'subject_labs'].includes(
      activeSubTab
    ) ||
    (activeSubTab === 'arena' && battleState === 'playing');

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-[#09090B] text-white select-none font-sans">
      {/* SINGLE CRISP GEN Z TOP BAR (Only shown on Hub / 1v1 Lobby / Leaderboard / Shop / Bank) */}
      {!isInActiveGame && (
        <header className="shrink-0 h-14 px-3 sm:px-5 bg-[#09090B] border-b border-zinc-800/80 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="min-h-[40px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">ออก</span>
              </button>
            )}

            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto no-scrollbar">
              {[
                { id: 'hub' as const, label: 'เกม', icon: LayoutGrid },
                { id: 'leaderboard' as const, label: 'อันดับ', icon: Trophy },
                { id: 'shop' as const, label: 'แลกของ', icon: ShoppingBag },
                ...(canManageBank
                  ? [{ id: 'bank' as const, label: 'คลังข้อสอบ', icon: BookOpen }]
                  : []),
              ].map(({ id, label, icon: Icon }) => {
                const isActive = activeSubTab === id || (id === 'hub' && activeSubTab === 'arena');
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setBattleState('idle');
                      setActiveSubTab(id);
                    }}
                    className={`min-h-[34px] px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 tabular-nums">
            {(currentPlayerStats.dailyStreak || 0) > 0 && (
              <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-orange-500/40 text-orange-400 text-xs font-black font-mono">
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>{currentPlayerStats.dailyStreak} วัน</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 text-xs font-black font-mono">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>{currentPlayerStats.exp.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 text-xs font-black font-mono">
              <Coins className="w-3.5 h-3.5" />
              <span>{currentPlayerStats.gems}</span>
            </div>
          </div>
        </header>
      )}

      {importNotification && !isInActiveGame && (
        <div className="shrink-0 mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{importNotification}</span>
        </div>
      )}

      {/* TAB: ARCADE STUDIO HUB */}
      {activeSubTab === 'hub' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-5xl mx-auto space-y-5">
            {/* Compact Gen Z Player Strip with Equipped Frame, Title & Daily Streak */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {currentPlayerStats.avatarUrl ? (
                  <img
                    src={currentPlayerStats.avatarUrl}
                    alt={currentPlayerStats.name}
                    className={`w-12 h-12 rounded-2xl object-cover shrink-0 ${currentFrame.ringClass}`}
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 font-black text-sm flex items-center justify-center shrink-0 ${currentFrame.ringClass}`}
                  >
                    Lv.{playerLevel}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                    <h1 className="text-sm sm:text-base font-black text-white truncate">
                      {currentPlayerStats.name}
                    </h1>
                    <span className="text-[11px] font-mono font-bold text-amber-400 shrink-0 tabular-nums">
                      Lv.{playerLevel} · {currentPlayerStats.exp.toLocaleString()} XP
                    </span>
                    <span className="text-[11px] font-mono font-bold text-orange-400 shrink-0 tabular-nums">
                      🔥 {currentPlayerStats.dailyStreak || 0} วันติด
                    </span>
                  </div>
                  <div className="flex items-center gap-2 max-w-xs">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, levelProgressPct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0 tabular-nums">
                      {currentPlayerStats.equippedTitle || currentPlayerStats.rankTitle}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMissionsDrawer((v) => !v)}
                  className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    readyMissionCount > 0
                      ? 'bg-amber-400 text-zinc-950 border-amber-300'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>
                    ภารกิจ ({completedMissionCount}/{DAILY_ARCADE_MISSIONS.length})
                  </span>
                  {showMissionsDrawer ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {onOpenCentralExamHub && canManageBank && (
                  <button
                    type="button"
                    onClick={onOpenCentralExamHub}
                    className="min-h-[40px] px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ข้อสอบกลาง</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Daily Missions Drawer */}
            {showMissionsDrawer && (
              <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {DAILY_ARCADE_MISSIONS.map((mission) => {
                  const currentCount = missionProgress.counts[mission.id] || 0;
                  const clamped = Math.min(currentCount, mission.target);
                  const pct = Math.round((clamped / mission.target) * 100);
                  const isReady = currentCount >= mission.target;
                  const isClaimed = missionProgress.claimed[mission.id];

                  return (
                    <div
                      key={mission.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-zinc-100 leading-snug">
                            {mission.titleTh}
                          </span>
                          <span className="text-[11px] font-mono font-black text-amber-400 shrink-0 tabular-nums">
                            {clamped}/{mission.target}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isClaimed ? 'bg-emerald-400' : isReady ? 'bg-amber-400' : 'bg-cyan-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-zinc-400">
                          +{mission.rewardExp} XP · +{mission.rewardGems}
                        </span>
                        {isClaimed ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> รับแล้ว
                          </span>
                        ) : isReady ? (
                          <button
                            type="button"
                            onClick={() => handleClaimMission(mission)}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[11px] font-black cursor-pointer"
                          >
                            รับรางวัล
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveSubTab(missionTargetTabMap[mission.id])}
                            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                          >
                            เล่นเลย
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Featured Real-Time 6-Digit PIN Classroom Arena Banner */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSubTab('live_room');
              }}
              className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-600/20 via-zinc-900 to-cyan-500/20 border border-rose-500/40 hover:border-rose-400 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Radio className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono font-bold text-rose-300 uppercase tracking-wider">
                    Live Classroom · 6-Digit PIN
                  </p>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    ห้องแข่งสดทั้งห้อง (Quiz Race & Live Boss Raid)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {canManageBank
                      ? 'เปิดห้องสร้างรหัส PIN 6 หลักขึ้นจอโปรเจกเตอร์ ให้นักเรียนแข่งตอบสดพร้อมกันทั้งห้อง'
                      : 'กรอกรหัส PIN 6 หลักจากหน้าจอคุณครู เพื่อแข่งความเร็วและร่วมตีบอสกับเพื่อนแบบเรียลไทม์'}
                  </p>
                </div>
              </div>
              <span className="min-h-[42px] px-4 rounded-xl bg-rose-500 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shrink-0">
                <span>{canManageBank ? 'เปิดห้อง / กรอก PIN' : 'กรอก PIN เข้าร่วม'}</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>

            {/* Category Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {([
                { id: 'all', label: 'ทั้งหมด (7)' },
                { id: 'arcade', label: 'Arcade ไวๆ' },
                { id: 'battle', label: 'ดวล & 3D' },
                { id: 'lab', label: 'แล็บจำลอง' },
              ] as const).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setHubCategory(cat.id)}
                  className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                    hubCategory === cat.id
                      ? 'bg-amber-400 text-zinc-950'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Clean Gen Z Game Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
              {visibleGameCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setActiveSubTab(card.id)}
                    className={`group text-left rounded-2xl p-4 sm:p-5 bg-zinc-900 border border-zinc-800 ${card.accentBorder} transition-all active:scale-[0.98] flex flex-col justify-between gap-4 cursor-pointer`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl ${card.accentBg} ${card.accentText} flex items-center justify-center shrink-0`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                          {card.tagEn}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white tracking-tight">
                          {card.titleTh}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                          {card.descriptionTh}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400">{card.strandsTh}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                        <span>เล่นเลย</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: REAL-TIME 6-DIGIT PIN LIVE CLASSROOM ARENA */}
      {activeSubTab === 'live_room' && (
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <LiveClassroomArenaView
            questions={questions}
            currentUser={currentUser}
            currentPlayerProfile={currentPlayerStats}
            lang={lang}
            onEarnRewards={onEarnRewards}
            onBack={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB: METEOR EQUATION BLASTER */}
      {activeSubTab === 'meteor_blaster' && (
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <MeteorMathBlasterGame
            userId={effectiveUserId}
            onEarnRewards={onEarnRewards}
            onMissionProgress={(count) => recordMissionProgress('meteor', count)}
            onBack={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB: 8-STRAND CONCEPT MATCH & MEMORY BLITZ */}
      {activeSubTab === 'concept_match' && (
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <ConceptMatchBlitzGame
            userId={effectiveUserId}
            onEarnRewards={onEarnRewards}
            onMissionProgress={() => recordMissionProgress('match', 1)}
            onBack={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB: BILINGUAL WORD BUILDER */}
      {activeSubTab === 'word_builder' && (
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <WordBuilderPuzzleGame
            userId={effectiveUserId}
            onEarnRewards={onEarnRewards}
            onMissionProgress={(solvedCount) => recordMissionProgress('word', solvedCount)}
            onBack={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB: CHRONOSORT & CONVEYOR LOGIC */}
      {activeSubTab === 'chrono_sort' && (
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <ChronoSortTowerGame
            userId={effectiveUserId}
            onEarnRewards={onEarnRewards}
            onMissionProgress={() => recordMissionProgress('sort', 1)}
            onBack={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB 0: 3D EduArena Battle Royale */}
      {activeSubTab === 'battle_royale_3d' && (
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <EduBattleRoyale3DView
            questions={questions}
            currentUser={currentUser}
            lang={lang}
            rewardItems={rewardItems}
            onEarnRewards={onEarnRewards}
            onGamePhaseChange={setIs3DBattlePlaying}
            onExit={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB 0.5: Subject Labs Simulation */}
      {activeSubTab === 'subject_labs' && (
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <SubjectLabSimulationView
            currentUserRole={currentUser?.role}
            currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
            lang={lang}
            onEarnRewards={onEarnRewards}
            onBackToGames={handleBackFromGame}
          />
        </div>
      )}

      {/* TAB 1: 1v1 Speed Duel Arena */}
      {activeSubTab === 'arena' && (
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto bg-[#09090B]">
          {/* PRE-BATTLE LOBBY */}
          {battleState === 'idle' && (
            <div className="w-full flex-1 min-h-0 flex flex-col p-3 sm:p-6 max-w-2xl mx-auto justify-start space-y-4">
              <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
                      1v1 SPEED DUEL
                    </p>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {lang === 'th' ? 'ดวลตอบสด 1v1 ความเร็ว' : '1v1 Live Knowledge Duel'}
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-400 tabular-nums">
                    {battleQuestions.length} ข้อพร้อมดวล
                  </span>
                </div>

                {/* Clean VS Matchup Card */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-sm flex items-center justify-center">
                      YOU
                    </div>
                    <p className="text-xs font-black text-white truncate w-full">
                      {currentPlayerStats.name}
                    </p>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">100 HP</span>
                  </div>

                  <div className="flex flex-col items-center shrink-0 px-2">
                    <div className="w-10 h-10 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                      VS
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 mt-1">15s / ข้อ</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                      <Bot className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-white truncate w-full">AI Speed Bot</p>
                    <span className="text-[11px] font-mono font-bold text-rose-400">100 HP</span>
                  </div>
                </div>

                {/* Exam Source (Only show toggle if school has custom questions) */}
                {questions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      ชุดข้อสอบ
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                      {[
                        { id: 'all' as const, label: `ทั้งหมด (${combinedQuestionPool.length})` },
                        {
                          id: 'teacher_created' as const,
                          label: `ข้อสอบครู (${teacherCreatedQuestions.length || questions.length})`,
                        },
                        { id: 'standard' as const, label: 'ข้อสอบกลาง' },
                      ].map((src) => (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => {
                            setExamSource(src.id);
                            setCurrentQuestionIndex(0);
                          }}
                          className={`min-h-[38px] px-2 rounded-lg text-xs font-bold transition cursor-pointer truncate ${
                            examSource === src.id
                              ? 'bg-amber-400 text-zinc-950'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {src.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject Filter */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    หมวดวิชา
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'ทั้ง 8 สาระ' },
                      { id: 'ภาษาไทย', label: 'ไทย' },
                      { id: 'คณิตศาสตร์', label: 'คณิต' },
                      { id: 'วิทยาศาสตร์', label: 'วิทย์/AI' },
                      { id: 'สังคมศึกษา', label: 'สังคม' },
                      { id: 'สุขศึกษา', label: 'สุขศึกษา' },
                      { id: 'ศิลปะ', label: 'ศิลปะ' },
                      { id: 'การงานอาชีพ', label: 'การงาน' },
                      { id: 'ภาษาอังกฤษ', label: 'อังกฤษ' },
                    ].map((subj) => (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubject(subj.id);
                          setCurrentQuestionIndex(0);
                        }}
                        className={`min-h-[36px] px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          selectedSubject === subj.id
                            ? 'bg-rose-500 text-white'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {subj.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Start CTA */}
                <button
                  type="button"
                  onClick={handleStartBattle}
                  disabled={battleQuestions.length === 0}
                  className="w-full min-h-[52px] rounded-2xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>เริ่มดวล 1v1 ทันที</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE BATTLE PLAYING SCREEN (Full viewport, zero stacked headers) */}
          {battleState === 'playing' && currentQ && (
            <div className="flex-1 min-h-0 flex flex-col max-w-3xl mx-auto w-full px-3 sm:px-5 py-3 space-y-3 overflow-y-auto">
              {/* Single Compact Match HUD */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setBattleState('idle')}
                  className="min-h-[38px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ออก</span>
                </button>

                <div
                  className={`min-h-[38px] px-3.5 rounded-xl border font-mono font-black text-sm flex items-center gap-1.5 tabular-nums ${
                    timer <= 5
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-cyan-400'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>00:{timer < 10 ? `0${timer}` : timer}</span>
                </div>

                <div className="min-h-[38px] px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-black text-amber-400 flex items-center gap-2 tabular-nums">
                  {streak > 1 && (
                    <span className="flex items-center gap-0.5 text-rose-400">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {streak}x
                    </span>
                  )}
                  <span>{roundScore} pts</span>
                </div>
              </div>

              {/* Dual HP Gauges */}
              <div className="grid grid-cols-2 gap-2.5 shrink-0">
                <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-bold text-white truncate">{currentPlayerStats.name}</span>
                    <span className="font-mono font-black text-emerald-400 shrink-0">{playerHp} HP</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, playerHp)}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-mono font-black text-rose-400 shrink-0">{opponentHp} HP</span>
                    <span className="font-bold text-white truncate">AI Speed Bot</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, opponentHp)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Question Card */}
              <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-2 text-center shrink-0">
                <p className="text-[11px] font-bold text-zinc-400">
                  ข้อ {currentQuestionIndex + 1}/{battleQuestions.length} · {currentQ.subject}
                </p>
                <h3 className="text-base sm:text-lg font-black text-white leading-relaxed break-words">
                  {currentQ.questionTh}
                </h3>
                {battleFeedback && (
                  <div className="pt-2 border-t border-zinc-800 space-y-1">
                    <p className="font-black text-xs text-amber-400">{battleFeedback}</p>
                    {currentQ.explanationTh && (
                      <p className="text-[11px] text-zinc-400 leading-snug">{currentQ.explanationTh}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Lifelines */}
              <div className="grid grid-cols-3 gap-2 shrink-0">
                <button
                  type="button"
                  disabled={fiftyFiftyLeft <= 0 || selectedAnswer !== null}
                  onClick={handleUseFiftyFifty}
                  className={`min-h-[42px] px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    fiftyFiftyLeft > 0 && selectedAnswer === null
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-cyan-500/40 text-cyan-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>50/50 ({fiftyFiftyLeft})</span>
                </button>

                <button
                  type="button"
                  disabled={timeBoostLeft <= 0 || selectedAnswer !== null}
                  onClick={handleUseTimeBoost}
                  className={`min-h-[42px] px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    timeBoostLeft > 0 && selectedAnswer === null
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>+7 วิ ({timeBoostLeft})</span>
                </button>

                <button
                  type="button"
                  disabled={shieldCharges <= 0 || shieldActive || selectedAnswer !== null}
                  onClick={handleUseShield}
                  className={`min-h-[42px] px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    shieldActive
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : shieldCharges > 0 && selectedAnswer === null
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{shieldActive ? 'โล่ทำงาน' : `โล่ (${shieldCharges})`}</span>
                </button>
              </div>

              {/* 4 Tactile Answer Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-4 shrink-0">
                {currentQ.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const isEliminated = eliminatedIndices.includes(idx);

                  let btnStyle =
                    'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-600 text-zinc-100';
                  if (isEliminated && selectedAnswer === null) {
                    btnStyle =
                      'bg-zinc-950 border-zinc-900 text-zinc-700 line-through opacity-40 cursor-not-allowed';
                  } else if (selectedAnswer !== null) {
                    if (idx === currentQ.correctIndex) {
                      btnStyle = 'bg-emerald-600/25 border-emerald-400 text-emerald-200 font-black';
                    } else if (idx === selectedAnswer) {
                      btnStyle = 'bg-rose-600/25 border-rose-500 text-rose-200 font-bold';
                    } else {
                      btnStyle = 'bg-zinc-950/60 border-zinc-800 text-zinc-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedAnswer !== null || isEliminated}
                      onClick={() => handleAnswer(idx)}
                      className={`min-h-[54px] px-3.5 py-3 rounded-2xl border text-left text-sm font-bold transition active:scale-[0.98] flex items-center gap-3 cursor-pointer ${btnStyle}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center shrink-0 text-xs font-black font-mono text-zinc-300">
                        {letters[idx] || idx + 1}
                      </span>
                      <span className="flex-1 leading-snug break-words">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BATTLE FINISHED SCREEN */}
          {battleState === 'finished' && (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 max-w-sm mx-auto text-center space-y-5">
              <div
                className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                  playerHp > opponentHp
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {playerHp > opponentHp ? (
                  <Trophy className="w-8 h-8" />
                ) : (
                  <RotateCcw className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  {playerHp > opponentHp ? 'ชนะการดวล 1v1!' : 'จบการดวลรอบนี้'}
                </h3>
                <p className="text-xs text-zinc-400">
                  คะแนนรอบนี้ {roundScore.toLocaleString()} pts
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 w-full tabular-nums">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">EXP</span>
                  <div className="text-lg font-black font-mono text-amber-400">
                    +{playerHp > opponentHp ? 250 : 80}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">GEMS</span>
                  <div className="text-lg font-black font-mono text-cyan-400">
                    +{playerHp > opponentHp ? 30 : 10}
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={handleStartBattle}
                  className="w-full min-h-[48px] rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ดวลใหม่อีกรอบ</span>
                </button>
                <button
                  type="button"
                  onClick={handleBackFromGame}
                  className="w-full min-h-[44px] rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  กลับหน้าเกม
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Question Bank Management (คลังข้อสอบ & Import/Export) */}
      {activeSubTab === 'bank' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls Bar: Import / Export / Add */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            {/* Search and Subject Filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'th' ? 'ค้นหาโจทย์ หรือวิชา...' : 'Search questions or subject...'}
                  value={searchBankQuery}
                  onChange={(e) => setSearchBankQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">ทุกกลุ่มสาระฯ (ทั้ง 8 สาระ)</option>
                <option value="ภาษาไทย">1. ภาษาไทย</option>
                <option value="คณิตศาสตร์">2. คณิตศาสตร์</option>
                <option value="วิทยาศาสตร์">3. วิทยาศาสตร์และเทคโนโลยี</option>
                <option value="สังคมศึกษา">4. สังคมศึกษา ศาสนา และวัฒนธรรม</option>
                <option value="สุขศึกษา">5. สุขศึกษาและพลศึกษา</option>
                <option value="ศิลปะ">6. ศิลปะ (ทัศนศิลป์ ดนตรี นาฏศิลป์)</option>
                <option value="การงานอาชีพ">7. การงานอาชีพ</option>
                <option value="ภาษาอังกฤษ">8. ภาษาต่างประเทศ (English)</option>
              </select>
            </div>

            {/* Action Buttons: Central Hub / Import / Export / Add Question */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onOpenCentralExamHub && (currentUser?.role === 'admin' || currentUser?.role === 'teacher' || currentUser?.role === 'super_admin') && (
                <button
                  type="button"
                  onClick={onOpenCentralExamHub}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'คลังข้อสอบกลาง 8 สาระ' : 'Central Exam Hub'}</span>
                </button>
              )}
              {/* Import Button */}
              <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'th' ? 'นำเข้า (JSON/CSV)' : 'Import'}</span>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Export JSON */}
              <button
                onClick={handleExportQuestionsJSON}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
                title="Export Question Bank as JSON"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON</span>
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportQuestionsCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
                title="Export Question Bank as CSV (Excel)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>

              {/* Add Question Button */}
              <button
                onClick={() => {
                  setQuestionFormStep(0);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-900/40 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'เพิ่มข้อสอบใหม่' : 'Add Question'}</span>
              </button>
            </div>
          </div>

          {/* Question List Cards */}
          <div>
            <PagedList items={filteredBank} pageSize={6} renderItem={(q, idx) => (
              <div 
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3 text-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {q.subject}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {q.gradeLevel}
                    </span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {q.category}
                    </span>
                  </div>

                  <div className="text-xs text-amber-300 font-bold">
                    +{q.points} แต้ม
                  </div>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white">
                  {idx + 1}. {q.questionTh}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, oIdx) => (
                    <div 
                      key={oIdx}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        oIdx === q.correctIndex
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span className="w-5 h-5 rounded bg-slate-950/70 flex items-center justify-center text-[10px] font-bold text-slate-200">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                      {oIdx === q.correctIndex && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 flex items-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">เฉลยและเหตุผล:</strong> {q.explanationTh}</span>
                </div>
              </div>
            )} />
          </div>
          </div>
        </div>
      )}

      {/* TAB 3: Real School Leaderboard with Frames, Titles & Daily Streaks */}
      {activeSubTab === 'leaderboard' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {playerScores.length === 0 ? (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <h3 className="text-sm font-black text-white">ยังไม่มีคะแนนในตารางอันดับโรงเรียน</h3>
                <p className="text-xs text-zinc-400">
                  เริ่มเล่นเกมหรือเข้าร่วมห้องแข่งสด 6 หลักเพื่อสะสม EXP และบันทึกสถิติจริงลงระบบ
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {playerScores.slice(0, 3).map((player, idx) => {
                    const pFrame = getProfileFrame(player.equippedFrameId);
                    return (
                      <div
                        key={player.userId}
                        className={`rounded-2xl p-4 border text-center space-y-2.5 ${
                          idx === 0
                            ? 'bg-zinc-900 border-amber-400/60'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono font-black">
                          <span className={idx === 0 ? 'text-amber-400' : 'text-zinc-400'}>
                            #{idx + 1}
                          </span>
                          <span className="text-amber-400 tabular-nums">
                            {player.exp.toLocaleString()} XP
                          </span>
                        </div>
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.name}
                            className={`w-14 h-14 rounded-2xl object-cover mx-auto ${pFrame.ringClass}`}
                          />
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-2xl bg-zinc-800 text-sm font-black text-white flex items-center justify-center mx-auto ${pFrame.ringClass}`}
                          >
                            {player.name.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-white truncate">{player.name}</h4>
                          <p className={`text-[11px] font-semibold truncate ${pFrame.badgeTextClass}`}>
                            {player.equippedTitle || player.rankTitle}
                          </p>
                          {(player.dailyStreak || 0) > 0 && (
                            <p className="text-[10px] font-mono text-orange-400 mt-0.5 tabular-nums">
                              🔥 สตรีค {player.dailyStreak} วันติด
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between font-bold text-xs text-zinc-400 uppercase tracking-wider">
                    <span>ตารางอันดับจริงของโรงเรียน</span>
                    <span className="font-mono text-zinc-300 tabular-nums">
                      {playerScores.length} คน
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-800/80">
                    {playerScores.map((p, rank) => {
                      const pFrame = getProfileFrame(p.equippedFrameId);
                      const isMe = p.userId === currentUser?.id;
                      return (
                        <div
                          key={p.userId}
                          className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                            isMe ? 'bg-amber-400/5' : 'hover:bg-zinc-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 font-mono font-black text-xs text-zinc-400 shrink-0 tabular-nums">
                              #{rank + 1}
                            </span>
                            {p.avatarUrl ? (
                              <img
                                src={p.avatarUrl}
                                alt={p.name}
                                className={`w-9 h-9 rounded-xl object-cover shrink-0 ${pFrame.ringClass}`}
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-xl bg-zinc-800 text-xs font-black text-white flex items-center justify-center shrink-0 ${pFrame.ringClass}`}
                              >
                                {p.name.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {p.name} {isMe ? '(คุณ)' : ''}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate">
                                {p.equippedTitle || p.rankTitle}
                                {(p.dailyStreak || 0) > 0 ? ` · 🔥 ${p.dailyStreak} วัน` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 tabular-nums">
                            <span className="font-mono font-black text-xs text-amber-400 block">
                              {p.exp.toLocaleString()} XP
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400">{p.gems} Gems</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Upgraded Reward Shop (Real School Perks + Instant Cosmetics + Teacher Approvals) */}
      {activeSubTab === 'shop' && (() => {
        const perkItems = rewardItems.filter(
          (item) => item.category !== 'frame' && item.category !== 'title'
        );
        const cosmeticItems = rewardItems.filter(
          (item) => item.category === 'frame' || item.category === 'title'
        );
        const unlockedSet = new Set(currentPlayerStats.unlockedItemIds || []);

        const handleSubmitNewReward = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newRewardTitle.trim() || !onCreateCustomReward) return;
          onCreateCustomReward({
            id: `perk-school-${Date.now()}`,
            titleTh: newRewardTitle.trim(),
            titleEn: newRewardTitle.trim(),
            costGems: Math.max(10, Number(newRewardCost) || 50),
            category: 'perk',
            stock: Math.max(1, Number(newRewardStock) || 10),
            iconName: 'gift',
            descriptionTh: newRewardDesc.trim() || 'สิทธิพิเศษของโรงเรียน (ครูอนุมัติเมื่อนักเรียนแลก)',
            requiresApproval: true,
          });
          setNewRewardTitle('');
          setNewRewardDesc('');
          setNewRewardCost(80);
          setNewRewardStock(20);
          setShowCreateRewardForm(false);
          setShopNotice('เพิ่มรางวัลสิทธิพิเศษเข้าหน้าร้านของโรงเรียนเรียบร้อยแล้ว');
          setTimeout(() => setShopNotice(null), 3500);
        };

        return (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Wallet Header */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white">ร้านค้าสิทธิพิเศษ & แต่งโปรไฟล์</h4>
                    <p className="text-xs text-zinc-400 truncate">
                      นำ Gems จากการเล่นเกมมาแลกสิทธิ์จริงในโรงเรียน หรือกรอบโปรไฟล์และฉายา
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-400 font-mono font-black text-base tabular-nums">
                    {currentPlayerStats.gems} Gems
                  </div>
                  {canManageBank && onCreateCustomReward && (
                    <button
                      type="button"
                      onClick={() => setShowCreateRewardForm((v) => !v)}
                      className="min-h-[42px] px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มรางวัล</span>
                    </button>
                  )}
                </div>
              </div>

              {shopNotice && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{shopNotice}</span>
                </div>
              )}

              {/* Teacher Custom School Perk Creator */}
              {showCreateRewardForm && canManageBank && (
                <form
                  onSubmit={handleSubmitNewReward}
                  className="p-4 rounded-2xl bg-zinc-900 border border-amber-400/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-amber-300">สร้างรางวัลสิทธิพิเศษของโรงเรียน</h5>
                    <button
                      type="button"
                      onClick={() => setShowCreateRewardForm(false)}
                      className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="ชื่อรางวัล เช่น คูปองน้ำฟรี 1 แก้ว"
                      value={newRewardTitle}
                      onChange={(e) => setNewRewardTitle(e.target.value)}
                      className="sm:col-span-2 min-h-[42px] px-3 rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white placeholder-zinc-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={10}
                        value={newRewardCost}
                        onChange={(e) => setNewRewardCost(Number(e.target.value))}
                        placeholder="Gems"
                        className="min-h-[42px] px-3 rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        min={1}
                        value={newRewardStock}
                        onChange={(e) => setNewRewardStock(Number(e.target.value))}
                        placeholder="จำนวน"
                        className="min-h-[42px] px-3 rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="เงื่อนไขการใช้สิทธิ์..."
                      value={newRewardDesc}
                      onChange={(e) => setNewRewardDesc(e.target.value)}
                      className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#09090B] border border-zinc-800 text-xs text-white placeholder-zinc-500"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs cursor-pointer"
                    >
                      บันทึกรางวัล
                    </button>
                  </div>
                </form>
              )}

              {/* Shop Section Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'perks' as const, label: 'สิทธิพิเศษโรงเรียน', icon: Gift },
                  { id: 'cosmetics' as const, label: 'กรอบ & ฉายาโปรไฟล์', icon: Palette },
                  { id: 'history' as const, label: `ประวัติของฉัน (${myRedemptions.length})`, icon: Clock },
                  ...(canManageBank
                    ? [
                        {
                          id: 'approvals' as const,
                          label: `อนุมัติคำขอ (${pendingApprovalCount})`,
                          icon: ClipboardCheck,
                        },
                      ]
                    : []),
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setShopSection(id)}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                      shopSection === id
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* SECTION 1: REAL SCHOOL PERKS (Teacher Approval) */}
              {shopSection === 'perks' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perkItems.map((item) => {
                    const canAfford = currentPlayerStats.gems >= item.costGems && item.stock > 0;
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center">
                              <Gift className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-mono font-black text-cyan-400 tabular-nums">
                              {item.costGems} Gems
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{item.titleTh}</h4>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.descriptionTh}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono tabular-nums">
                            <span>คงเหลือ {item.stock} สิทธิ์</span>
                            <span className="text-amber-300">ครูอนุมัติ</span>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => {
                              onRedeemReward(item.id, item.costGems);
                              setShopNotice(`ส่งคำขอแลก "${item.titleTh}" ให้คุณครูตรวจสอบแล้ว`);
                              setTimeout(() => setShopNotice(null), 3500);
                            }}
                            className={`w-full min-h-[44px] rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                              canAfford
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>
                              {item.stock <= 0
                                ? 'หมดชั่วคราว'
                                : canAfford
                                  ? 'ส่งคำขอแลกสิทธิ์'
                                  : 'Gems ไม่พอ'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: INSTANT-EQUIP PROFILE FRAMES & TITLES */}
              {shopSection === 'cosmetics' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cosmeticItems.map((item) => {
                    const isOwned = unlockedSet.has(item.id);
                    const isEquipped =
                      (item.frameId && currentPlayerStats.equippedFrameId === item.frameId) ||
                      (item.titleLabel && currentPlayerStats.equippedTitle === item.titleLabel);
                    const canAfford = currentPlayerStats.gems >= item.costGems;
                    const previewFrame = item.frameId ? getProfileFrame(item.frameId) : null;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl bg-zinc-900 border p-4 flex flex-col justify-between gap-4 ${
                          isEquipped ? 'border-cyan-400' : 'border-zinc-800'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            {previewFrame ? (
                              <div
                                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${previewFrame.previewGradient} p-0.5`}
                              >
                                <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center text-xs font-black text-white">
                                  VIP
                                </div>
                              </div>
                            ) : (
                              <div className="w-11 h-11 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center">
                                <Award className="w-5 h-5" />
                              </div>
                            )}
                            <span className="text-xs font-mono font-black text-cyan-400 tabular-nums">
                              {isOwned ? 'เป็นเจ้าของแล้ว' : `${item.costGems} Gems`}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{item.titleTh}</h4>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.descriptionTh}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!isOwned && !canAfford}
                          onClick={() => {
                            if (isOwned && onEquipCosmetic) {
                              onEquipCosmetic({
                                frameId: item.frameId,
                                title: item.titleLabel,
                              });
                              setShopNotice(`สวมใส่ "${item.titleTh}" เรียบร้อยแล้ว`);
                              setTimeout(() => setShopNotice(null), 2500);
                            } else {
                              onRedeemReward(item.id, item.costGems);
                              setShopNotice(`ปลดล็อกและสวมใส่ "${item.titleTh}" แล้ว!`);
                              setTimeout(() => setShopNotice(null), 3000);
                            }
                          }}
                          className={`w-full min-h-[44px] rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                            isEquipped
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 cursor-default'
                              : isOwned
                                ? 'bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer'
                                : canAfford
                                  ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 cursor-pointer'
                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <span>
                            {isEquipped
                              ? 'กำลังสวมใส่อยู่'
                              : isOwned
                                ? 'สวมใส่เลย'
                                : canAfford
                                  ? 'ปลดล็อก & สวมใส่ทันที'
                                  : 'Gems ไม่พอ'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 3: MY REDEMPTION REQUESTS HISTORY */}
              {shopSection === 'history' && (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                  {myRedemptions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-400">
                      ยังไม่มีประวัติการส่งคำขอแลกสิทธิพิเศษในโรงเรียน
                    </div>
                  ) : (
                    myRedemptions.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{req.itemTitleTh}</p>
                          <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                            ใช้ {req.costGems} Gems · {new Date(req.requestedAt).toLocaleDateString('th-TH')}
                            {req.reviewedBy ? ` · ตรวจโดย ${req.reviewedBy}` : ''}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-black shrink-0 ${
                            req.status === 'approved'
                              ? 'text-emerald-400'
                              : req.status === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {req.status === 'approved'
                            ? 'อนุมัติแล้ว — ใช้สิทธิ์ได้'
                            : req.status === 'rejected'
                              ? 'ไม่อนุมัติ (คืน Gems แล้ว)'
                              : 'รอคุณครูอนุมัติ'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION 4: TEACHER / ADMIN APPROVAL QUEUE */}
              {shopSection === 'approvals' && canManageBank && (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                  {rewardRedemptions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-400">
                      ยังไม่มีคำขอแลกสิทธิพิเศษจากนักเรียนในโรงเรียน
                    </div>
                  ) : (
                    rewardRedemptions.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-black text-white truncate">
                            {req.studentName}{' '}
                            {req.gradeRoom ? (
                              <span className="text-xs font-normal text-zinc-400">
                                ({req.gradeRoom})
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs font-bold text-amber-300 truncate">
                            ขอแลก: {req.itemTitleTh} ({req.costGems} Gems)
                          </p>
                          <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                            {new Date(req.requestedAt).toLocaleString('th-TH')}
                            {req.reviewedBy ? ` · โดย ${req.reviewedBy}` : ''}
                          </p>
                        </div>

                        {req.status === 'pending' && onReviewRedemption ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onReviewRedemption(req.id, 'approved')}
                              className="min-h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs cursor-pointer"
                            >
                              อนุมัติสิทธิ์
                            </button>
                            <button
                              type="button"
                              onClick={() => onReviewRedemption(req.id, 'rejected')}
                              className="min-h-[42px] px-4 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs cursor-pointer"
                            >
                              ปฏิเสธ & คืน Gems
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-black shrink-0 ${
                              req.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Add New Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>เพิ่มข้อสอบใหม่เข้าคลังข้อสอบโรงเรียน</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setQuestionFormStep(0);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewQuestion} className="space-y-4">
              <p className="text-[11px] text-slate-300">{questionFormStep + 1} / 2</p>
              {questionFormStep === 0 && <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">กลุ่มสาระวิชา</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ระดับชั้น</label>
                  <input
                    type="text"
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ประเภท</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="standard_exam">โจทย์ฝึกหัดตัวอย่าง</option>
                    <option value="review">ทบทวนบทเรียน</option>
                    <option value="exam">ข้อสอบกลางภาค/ปลายภาค</option>
                    <option value="general">ความรู้ทั่วไป</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">โจทย์คำถาม (ภาษาไทย)</label>
                <textarea
                  value={newQuestionTh}
                  onChange={(e) => setNewQuestionTh(e.target.value)}
                  rows={3}
                  placeholder="พิมพ์โจทย์ข้อสอบ..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400"
                  required
                />
              </div>
              </>}
              {questionFormStep === 1 && <>
              {/* 4 Choices */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  ตัวเลือกคำตอบ 4 ตัวเลือก (เลือกข้อที่ถูก):
                </label>
                {newOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={newCorrectIndex === idx}
                      onChange={() => setNewCorrectIndex(idx)}
                      className="text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="w-6 text-xs font-bold text-slate-300 text-center">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      placeholder={`ตัวเลือกข้อ ${String.fromCharCode(65 + idx)}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newOptions];
                        copy[idx] = e.target.value;
                        setNewOptions(copy);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">คำอธิบายเฉลยและวิธีคิด</label>
                <textarea
                  value={newExplanationTh}
                  onChange={(e) => setNewExplanationTh(e.target.value)}
                  rows={2}
                  placeholder="เขียนอธิบายเหตุผลและวิธีคิดให้ผู้เรียนเข้าใจ..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400"
                  required
                />
              </div>
              </>}

              <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (questionFormStep === 1) setQuestionFormStep(0);
                    else {
                      setShowAddModal(false);
                      setQuestionFormStep(0);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  {questionFormStep === 1 ? 'ย้อนกลับ' : 'ยกเลิก'}
                </button>
                {questionFormStep === 0 ? (
                  <button type="button" onClick={() => setQuestionFormStep(1)} className="px-6 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold text-white shadow-md shadow-indigo-900/40 cursor-pointer">
                    ถัดไป
                  </button>
                ) : <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold text-white shadow-md shadow-indigo-900/40 cursor-pointer"
                >
                  บันทึกข้อสอบเข้าคลัง
                </button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
