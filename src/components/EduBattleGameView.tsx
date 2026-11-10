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
  ArrowLeft
} from 'lucide-react';
import { QuizQuestion, PlayerScore, RewardItem, AuthUser, AppLanguage } from '../types';
import { EduBattleRoyale3DView } from './EduBattleRoyale3DView';
import { SubjectLabSimulationView } from './SubjectLabSimulationView';
import { PagedList } from './PagedList';
import { playHeavyImpactSound, playComboStreakSound, playGrandVictoryFanfare } from '../lib/labSoundEffects';

interface EduBattleGameViewProps {
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  initialSubTab?: 'battle_royale_3d' | 'subject_labs' | 'arena' | 'bank' | 'leaderboard' | 'shop';
  isMobileMode?: boolean;
  onGamePlayingChange?: (isPlaying: boolean) => void;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
  onExit?: () => void;
}

export const EduBattleGameView: React.FC<EduBattleGameViewProps> = ({
  questions,
  playerScores,
  rewardItems,
  currentUser,
  lang,
  initialSubTab,
  isMobileMode = false,
  onAddQuestion,
  onImportQuestions,
  onEarnRewards,
  onRedeemReward,
  onGamePlayingChange,
  onExit
}) => {
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = isMobileMode || isMobileScreen;

  const [activeSubTab, setActiveSubTab] = useState<'battle_royale_3d' | 'subject_labs' | 'arena' | 'bank' | 'leaderboard' | 'shop'>(
    initialSubTab || (isMobile ? 'arena' : 'battle_royale_3d')
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [examSource, setExamSource] = useState<'all' | 'teacher_created' | 'standard'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchBankQuery, setSearchBankQuery] = useState('');

  // 1v1 Battle State
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

  // Separate teacher-created/imported exams vs standard bank
  const teacherCreatedQuestions = questions.filter(
    q => q.id.startsWith('q-custom-') || q.id.startsWith('csv-') || q.category === 'exam'
  );

  // Active Questions for Battle (filtered by exam source & subject)
  const sourceFilteredQuestions =
    examSource === 'teacher_created'
      ? (teacherCreatedQuestions.length > 0 ? teacherCreatedQuestions : questions)
      : examSource === 'standard'
      ? questions.filter(q => q.category === 'standard_exam' || q.category === 'onet')
      : questions;

  const subjectFilteredQuestions =
    selectedSubject === 'all'
      ? sourceFilteredQuestions
      : sourceFilteredQuestions.filter(q => q.subject.includes(selectedSubject));

  const battleQuestions = subjectFilteredQuestions.length > 0 ? subjectFilteredQuestions : sourceFilteredQuestions;
  const currentQ = battleQuestions[currentQuestionIndex % Math.max(1, battleQuestions.length)] || questions[0];

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
    setBattleState('playing');
  };

  const handleTimeOut = () => {
    playArcadeSound(180, 'sawtooth', 0.3);
    setPlayerHp(prev => Math.max(0, prev - 25));
    setStreak(0);
    setBattleFeedback('⏰ หมดเวลา! ได้รับดาเมจ 25 HP');
    checkBattleEnd(playerHp - 25, opponentHp);
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || battleState !== 'playing') return;
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
        if (currentUser) {
          onEarnRewards(currentUser.id, expGained, gemsGained, isWin);
        }
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
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
    const matchesSubject = selectedSubject === 'all' || q.subject.includes(selectedSubject);
    const matchesSearch = !searchBankQuery || 
      q.questionTh.toLowerCase().includes(searchBankQuery.toLowerCase()) || 
      q.subject.toLowerCase().includes(searchBankQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Current user's player stats
  const currentPlayerStats = playerScores.find(p => p.userId === currentUser?.id) || {
    userId: currentUser?.id || 'temp',
    name: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เล่น EduVerse',
    role: currentUser?.role || 'student',
    avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    exp: 3450,
    gems: 240,
    rankTitle: 'Gold Scholar ⭐',
    battleWins: 18,
    streak: 4
  };

  const isFullHeightGameView = ['arena', 'battle_royale_3d', 'subject_labs'].includes(activeSubTab);

  return (
    <div className={`w-full ${isMobile || isFullHeightGameView ? 'h-full min-h-0 flex flex-col overflow-hidden bg-slate-950 text-white select-none' : 'space-y-6'}`}>
      {/* Mobile Top Arcade HUD */}
      {isMobile ? (
        <header className="shrink-0 px-3 py-2 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 min-w-0">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                title="ออกจากเกม"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentPlayerStats.avatarUrl}
                alt={currentPlayerStats.name}
                className="w-8 h-8 rounded-xl object-cover border border-amber-400 shrink-0 shadow-xs"
              />
              <div className="truncate text-left leading-tight">
                <div className="text-xs font-black text-white truncate max-w-[110px] sm:max-w-[180px]">
                  {currentPlayerStats.name}
                </div>
                <div className="text-[10px] text-amber-300 font-semibold truncate">
                  {currentPlayerStats.rankTitle}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{currentPlayerStats.exp.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black">
              <Coins className="w-3.5 h-3.5 text-cyan-300" />
              <span>{currentPlayerStats.gems}</span>
            </div>
          </div>
        </header>
      ) : (
        /* Desktop Top Marketing Banner (Only on desktop bank/leaderboard/shop) */
        (!isMobile && battleState !== 'playing' && (activeSubTab === 'bank' || activeSubTab === 'leaderboard' || activeSubTab === 'shop')) && (
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 text-white shadow-xl shadow-rose-950/20 border border-white/10">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/45 border border-white/25 backdrop-blur-md text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>EduVerse Gamification Engine • คลังโจทย์ฝึกหัด & แบทเทิล 1v1</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {lang === 'th' ? 'สนามประลองความรู้ & คลังข้อสอบอัจฉริยะ' : 'EduBattle Arena & Question Bank'}
                </h1>
                <p className="text-slate-100 text-sm max-w-2xl">
                  {lang === 'th'
                    ? 'ฝึกฝนโจทย์ตัวอย่างและบทเรียนประจำคาบผ่านเกมประลองแบบ 1v1 พร้อมสะสมคะแนน EXP และเพชร (Gems) เพื่อแลกรางวัลในร้านค้า'
                    : 'Interactive 1v1 knowledge battles and comprehensive national exam quests with real EXP & Gem rewards.'}
                </p>
              </div>

              {/* User Score Summary Card */}
              <div className="bg-slate-950/55 backdrop-blur-md border border-white/25 rounded-2xl p-4 flex items-center gap-4 shrink-0">
                <img 
                  src={currentPlayerStats.avatarUrl} 
                  alt={currentPlayerStats.name} 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{currentPlayerStats.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 font-semibold">
                      {currentPlayerStats.rankTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{currentPlayerStats.exp.toLocaleString()} EXP</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <Coins className="w-4 h-4 text-cyan-300" />
                      <span>{currentPlayerStats.gems} Gems</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-200">
                    สถิติชนะ {currentPlayerStats.battleWins} ครั้ง • สตรีค {currentPlayerStats.streak} ติดต่อกัน
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Keep game modes visible; place supporting tools behind one compact menu. */}
      {battleState !== 'playing' && !is3DBattlePlaying && (
        <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 bg-slate-900/90 border-b border-slate-800/80 z-10">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'arena' as const, label: isMobile ? '1v1' : (lang === 'th' ? '1v1 ดวลตอบสด' : '1v1 Arena'), icon: Swords },
              { id: 'battle_royale_3d' as const, label: isMobile ? '3D Arena' : '3D EduArena', icon: Gamepad2 },
              { id: 'subject_labs' as const, label: isMobile ? 'เวิร์กช็อป' : (lang === 'th' ? 'เวิร์กช็อปจำลอง 6 สาระ' : 'Subject Workshops'), icon: FlaskConical },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSubTab(id);
                  setShowUtilitiesMenu(false);
                }}
                aria-pressed={activeSubTab === id}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                  activeSubTab === id
                    ? 'bg-indigo-700 text-white shadow-md'
                    : 'bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="shrink-0 px-2 py-1 text-xs font-bold text-slate-200 hover:text-white underline underline-offset-4 cursor-pointer"
            >
              {lang === 'th' ? '← กลับหน้าหลัก' : '← Exit'}
            </button>
          )}

          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setShowUtilitiesMenu(prev => !prev)}
              aria-expanded={showUtilitiesMenu}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                ['bank', 'leaderboard', 'shop'].includes(activeSubTab)
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เครื่องมือ' : 'Tools'}</span>
            </button>
            {showUtilitiesMenu && (
              <div className="absolute right-0 top-full mt-2 z-30 min-w-48 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
                {[
                  { id: 'bank' as const, label: lang === 'th' ? `คลังโจทย์ (${questions.length})` : `Question Bank (${questions.length})`, icon: BookOpen },
                  { id: 'leaderboard' as const, label: lang === 'th' ? 'ตารางอันดับ' : 'Leaderboard', icon: Trophy },
                  { id: 'shop' as const, label: lang === 'th' ? 'ร้านค้ารางวัล' : 'Reward Store', icon: ShoppingBag },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveSubTab(id);
                      setShowUtilitiesMenu(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      activeSubTab === id ? 'bg-indigo-700 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {importNotification && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>{importNotification}</span>
            </div>
          )}
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
            onExit={() => {
              setIs3DBattlePlaying(false);
              setActiveSubTab('arena');
            }}
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
            onBackToGames={() => setActiveSubTab('arena')}
          />
        </div>
      )}

      {/* TAB 1: 1v1 Battle Arena */}
      {activeSubTab === 'arena' && (
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto">
          {/* LOBBY / PRE-BATTLE MATCHUP SCREEN */}
          {battleState === 'idle' && (
            <div className="w-full flex-1 min-h-0 flex flex-col p-3 sm:p-5 max-w-4xl mx-auto overflow-y-auto space-y-4">
              {/* Left / Main Match Launcher Card */}
              <div className="space-y-4 w-full rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {onExit && (
                        <button
                          type="button"
                          onClick={onExit}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          title="ออกจากเกม กลับสู่หน้าหลัก"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>กลับหน้าหลัก</span>
                        </button>
                      )}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black">
                        <Swords className="w-3.5 h-3.5" />
                        <span>1v1 Speed Duel Arena</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                      {battleQuestions.length} ข้อในหมวดนี้
                    </span>
                  </div>

                  <h2 className={`${isMobile ? 'text-lg text-center font-black text-white' : 'text-2xl font-black text-white'}`}>
                    {lang === 'th' ? 'ประลองตอบสด 1v1 ดวลความเร็ว' : '1v1 Live Knowledge Duel'}
                  </h2>

                  {/* VS MATCHUP SHOWCASE (ARCADE GAMING STYLE) */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 flex items-center justify-between shadow-2xl">
                    {/* You (Player) */}
                    <div className="flex flex-col items-center gap-1 w-5/12 text-center">
                      <div className="relative">
                        <img
                          src={currentPlayerStats.avatarUrl}
                          alt="You"
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400 shadow-lg shadow-emerald-500/20"
                        />
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[9px] font-black">
                          YOU
                        </span>
                      </div>
                      <div className="text-xs font-black text-white truncate w-full">
                        {currentPlayerStats.name}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        100 HP
                      </div>
                    </div>

                    {/* VS Center Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-2/12">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-rose-600/40 animate-pulse">
                        VS
                      </div>
                      <span className="text-[9px] text-slate-300 font-mono mt-1">15s / ข้อ</span>
                    </div>

                    {/* Rival Bot */}
                    <div className="flex flex-col items-center gap-1 w-5/12 text-center">
                      <div className="relative">
                        <img
                          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80"
                          alt="Rival"
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-400 shadow-lg shadow-rose-500/20"
                        />
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-black">
                          RIVAL
                        </span>
                      </div>
                      <div className="text-xs font-black text-white truncate w-full">
                        กัญญา วงศ์สวัสดิ์
                      </div>
                      <div className="text-[10px] text-rose-300 font-bold bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                        100 HP
                      </div>
                    </div>
                  </div>

                  {/* Exam Source Selector (Teacher-Created Exams vs All Banks) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-amber-300 block">
                        {lang === 'th' ? 'เลือกชุดข้อสอบที่ใช้เล่น:' : 'Exam Source:'}
                      </label>
                      {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => setActiveSubTab('bank')}
                          className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 underline underline-offset-2 cursor-pointer"
                        >
                          {lang === 'th' ? '+ จัดการข้อสอบที่ครูสร้าง' : '+ Manage Teacher Exams'}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all' as const, label: `📚 ทั้งหมด (${questions.length} ข้อ)` },
                        {
                          id: 'teacher_created' as const,
                          label: teacherCreatedQuestions.length > 0
                            ? `👨‍🏫 ข้อสอบที่ครูสร้าง (${teacherCreatedQuestions.length} ข้อ)`
                            : `👨‍🏫 ข้อสอบโรงเรียน/ครู (${questions.length} ข้อ)`,
                        },
                        { id: 'standard' as const, label: '📘 ข้อสอบมาตรฐาน' },
                      ].map(src => (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => {
                            setExamSource(src.id);
                            setCurrentQuestionIndex(0);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            examSource === src.id
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {src.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Filter Links */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-200 block">
                      {lang === 'th' ? `เลือกหมวดวิชา (พบ ${battleQuestions.length} ข้อ):` : `Subject (${battleQuestions.length}):`}
                    </label>
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {[
                        { id: 'all', label: '⭐ ทุกวิชา' },
                        { id: 'คณิตศาสตร์', label: '📐 คณิต' },
                        { id: 'วิทยาศาสตร์', label: '🔬 วิทย์' },
                        { id: 'วิทยาการคำนวณ', label: '💻 คอมฯ' },
                        { id: 'ภาษาอังกฤษ', label: '🇬🇧 อังกฤษ' },
                        { id: 'ภาษาไทย', label: '🇹🇭 ไทย' }
                      ].map(subj => (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubject(subj.id);
                            setCurrentQuestionIndex(0);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
                            selectedSubject === subj.id
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {subj.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Big Glowing Start Duel Button */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleStartBattle}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>{lang === 'th' ? `เริ่มประลอง 1v1 (${battleQuestions.length} ข้อ)` : 'Launch 1v1 Battle Now'}</span>
                    </button>

                    <p className="text-[11px] text-center text-slate-300">
                      ⚡ ตอบถูกทำดาเมจ 25+ HP • สตรีคคอมโบแรงขึ้น • รับ EXP & Gems
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Rules Side Card (Only on desktop) */}
              {!isMobile && (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 text-xs text-indigo-200 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>กติกาการแข่งขัน</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                      <li>เวลา 15 วินาทีต่อข้อ ยิ่งตอบไวยิ่งได้แต้มเยอะ</li>
                      <li>ตอบถูกทำดาเมจ 25+ HP ใส่คู่ต่อสู้</li>
                      <li>ลด HP ฝั่งตรงข้ามเหลือ 0 หรือทำคะแนนสูงสุดเพื่อรับชัยชนะ</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE BATTLE PLAYING SCREEN - TRUE ARCADE SCROLLABLE & RESPONSIVE LAYOUT */}
          {battleState === 'playing' && (
            <div className="flex-1 min-h-0 flex flex-col justify-start p-3 sm:p-5 max-w-xl mx-auto w-full overflow-y-auto space-y-3 select-none">
              {/* TOP DUAL HP GAUGES */}
              <div className="shrink-0 space-y-1.5">
                <div className="grid grid-cols-2 gap-2 items-center">
                  {/* Player HP */}
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="font-black text-white truncate text-xs">{currentPlayerStats.name}</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-black text-xs shrink-0">{playerHp} HP</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, playerHp)}%` }}
                      />
                    </div>
                  </div>

                  {/* Opponent HP */}
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-rose-400 font-black text-xs shrink-0">{opponentHp} HP</span>
                      <div className="flex items-center gap-1.5 min-w-0 justify-end">
                        <span className="font-black text-white truncate text-xs">กัญญา (Rival)</span>
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, opponentHp)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* MATCH HUD BAR */}
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-300 text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30">
                      ข้อ {currentQuestionIndex + 1}/{battleQuestions.length}
                    </span>
                    {streak > 1 && (
                      <span className="flex items-center gap-1 font-black text-amber-400 text-xs animate-bounce">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        {streak}x Combo!
                      </span>
                    )}
                  </div>

                  {/* Center Pulse Countdown Badge */}
                  <div className={`flex items-center gap-1 font-mono font-black text-xs px-2.5 py-0.5 rounded-full shrink-0 ${
                    timer <= 5 
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse' 
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>00:{timer < 10 ? `0${timer}` : timer}</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="font-bold text-amber-300 text-xs font-mono">{roundScore} pts</span>
                    <button
                      type="button"
                      onClick={() => setBattleState('idle')}
                      className="text-[11px] text-slate-300 hover:text-rose-300 font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                    >
                      ยอมแพ้
                    </button>
                  </div>
                </div>
              </div>

              {/* CENTER: HIGH VISIBILITY QUESTION CARD */}
              <div className="py-1 space-y-2 shrink-0">
                <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/95 border border-slate-800 shadow-xl space-y-1.5 text-center">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200">
                    {currentQ.subject} • ระดับ {currentQ.gradeLevel}
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-black text-white leading-relaxed break-words">
                    {currentQ.questionTh}
                  </h3>
                  {currentQ.questionEn && currentQ.questionEn !== currentQ.questionTh && (
                    <p className="text-xs text-slate-300 italic break-words">
                      {currentQ.questionEn}
                    </p>
                  )}
                </div>

                {/* Floating Damage & Explanation Feedback Banner */}
                {battleFeedback && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-1 animate-in fade-in slide-in-from-top-1 text-center">
                    <p className="font-black text-xs text-amber-300">{battleFeedback}</p>
                    {currentQ.explanationTh && (
                      <p className="text-[11px] text-slate-300 leading-tight break-words">
                        💡 {currentQ.explanationTh}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* BOTTOM: 4 LARGE ARCADE BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pb-2 shrink-0">
                {currentQ.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const letterColors = [
                    'bg-blue-500/20 text-blue-300 border-blue-500/40',
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  ];

                  let btnStyle = 'bg-slate-900 hover:bg-slate-800 active:bg-slate-800 border-slate-700 text-slate-100';
                  if (selectedAnswer !== null) {
                    if (idx === currentQ.correctIndex) {
                      btnStyle = 'bg-emerald-800/80 border-emerald-400 text-white font-black shadow-lg shadow-emerald-500/30 scale-[1.01]';
                    } else if (idx === selectedAnswer) {
                      btnStyle = 'bg-rose-800/80 border-rose-400 text-white font-bold';
                    } else {
                      btnStyle = 'bg-slate-900/90 border-slate-700 text-slate-300';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswer(idx)}
                      className={`min-h-[50px] sm:min-h-[56px] p-2.5 sm:p-3 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center gap-2.5 sm:gap-3 cursor-pointer active:scale-98 ${btnStyle}`}
                    >
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black font-mono border ${letterColors[idx % 4]}`}>
                        {letters[idx]}
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
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 max-w-sm mx-auto text-center space-y-4 animate-in zoom-in-95">
              <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl ${
                playerHp > opponentHp 
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/30 animate-bounce' 
                  : 'bg-gradient-to-tr from-slate-700 to-slate-600 text-slate-300'
              }`}>
                {playerHp > opponentHp ? (
                  <Trophy className="w-10 h-10" />
                ) : (
                  <RotateCcw className="w-10 h-10" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  {playerHp > opponentHp ? '🎉 ได้รับชัยชนะ!' : '⚔️ จบการประลองรอบนี้'}
                </h3>
                <p className="text-xs text-slate-300">
                  {playerHp > opponentHp 
                    ? 'ตอบคำถามได้อย่างยอดเยี่ยม ทำดาเมจชนะคู่แข่ง!' 
                    : 'คะแนนดีมากแล้ว ฝึกฝนโจทย์เพิ่มเติมเพื่อคว้าชัยในรอบถัดไป'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 w-full">
                <div className="space-y-0.5 text-center">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">EXP สะสม</span>
                  <div className="text-lg font-black text-amber-400">
                    +{playerHp > opponentHp ? 250 : 80} EXP
                  </div>
                </div>
                <div className="space-y-0.5 text-center">
                  <span className="text-[10px] text-slate-300 font-bold uppercase">เพชร Gems</span>
                  <div className="text-lg font-black text-cyan-300">
                    +{playerHp > opponentHp ? 30 : 10} Gems
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartBattle}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ดวลใหม่อีกรอบ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBattleState('idle')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  กลับสู่ห้องล็อบบี้
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Question Bank Management (คลังข้อสอบ & Import/Export) */}
      {activeSubTab === 'bank' && (
        <div className="space-y-6">
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
                <option value="all">ทุกหมวดวิชา (All Subjects)</option>
                <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                <option value="วิทยาศาสตร์">วิทยาศาสตร์</option>
                <option value="วิทยาการคำนวณ">วิทยาการคำนวณ</option>
                <option value="ภาษาอังกฤษ">ภาษาอังกฤษ</option>
                <option value="ภาษาไทย">ภาษาไทย</option>
              </select>
            </div>

            {/* Action Buttons: Import / Export / Add Question */}
            <div className="flex items-center gap-2 shrink-0">
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
      )}

      {/* TAB 3: Leaderboard & Hall of Fame */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {playerScores.slice(0, 3).map((player, idx) => (
              <div 
                key={player.userId}
                className={`relative rounded-3xl p-6 border text-center space-y-3 overflow-hidden text-white ${
                  idx === 0 
                    ? 'bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 border-amber-500/50 shadow-xl shadow-amber-500/10'
                    : idx === 1
                    ? 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-slate-500/40'
                    : 'bg-gradient-to-b from-amber-900/90 via-slate-900 to-slate-950 border-amber-700/40'
                }`}
              >
                <div className="absolute top-3 right-3 text-2xl font-black text-white/50">
                  #{idx + 1}
                </div>

                <div className="relative mx-auto w-20 h-20">
                  <img 
                    src={player.avatarUrl} 
                    alt={player.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/25 shadow-lg mx-auto"
                  />
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                    {idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{player.name}</h4>
                  <p className="text-[11px] text-amber-300 font-semibold">{player.rankTitle}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-slate-300 block">EXP รวม</span>
                    <span className="font-extrabold text-amber-400">{player.exp.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-300 block">ชนะประลอง</span>
                    <span className="font-extrabold text-white">{player.battleWins} ครั้ง</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Rank Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden text-white">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300 uppercase tracking-wider">
              ทำเนียบผู้เรียนและอาจารย์คะแนนสูงสุด (Hall of Fame)
            </div>
            <div>
              <PagedList items={playerScores} pageSize={5} renderItem={(p, rank) => (
                <div key={p.userId} className="p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-black text-sm text-slate-300">
                      #{rank + 1}
                    </span>
                    <img 
                      src={p.avatarUrl} 
                      alt={p.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {p.role === 'teacher' ? 'อาจารย์' : 'นักเรียน'}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-300 font-semibold">{p.rankTitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <span className="font-bold text-amber-400 block">{p.exp.toLocaleString()} EXP</span>
                      <span className="text-[10px] text-slate-300">{p.gems} Gems</span>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="font-bold text-white">{p.battleWins} ชนะ</span>
                      <span className="text-[10px] text-rose-300">{p.streak} สตรีค</span>
                    </div>
                  </div>
                </div>
              )} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Reward Item Store */}
      {activeSubTab === 'shop' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Coins className="w-6 h-6 text-cyan-400" />
              <div>
                <h4 className="text-sm font-bold text-white">ยอดเพชรของคุณในกระเป๋า</h4>
                <p className="text-xs text-slate-300">สะสมได้จากการชนะแบทเทิลและการทำแบบทดสอบความรู้</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-black text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-300" />
              <span>{currentPlayerStats.gems} Gems</span>
            </div>
          </div>

          <div>
            <PagedList items={rewardItems} pageSize={1} renderItem={(item) => {
              const canAfford = currentPlayerStats.gems >= item.costGems;
              return (
                <div 
                  key={item.id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all group text-white"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                      <Medal className="w-6 h-6 text-indigo-300" />
                    </div>

                    <div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        item.category === 'skin' 
                          ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' 
                          : item.category === 'boost'
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-200'
                      }`}>
                        {item.category === 'skin' ? '🎮 สกินตัวละคร 3D' : item.category === 'boost' ? '⚡ บูสเตอร์ช่วยเล่น' : item.category}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{item.titleTh}</h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {item.descriptionTh}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">คงเหลือ {item.stock} ชิ้น</span>
                      <span className="font-extrabold text-cyan-300 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        {item.costGems} Gems
                      </span>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => onRedeemReward(item.id, item.costGems)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-900/40 cursor-pointer'
                          : 'bg-slate-800 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{canAfford ? 'แลกของรางวัลนี้' : 'เพชรไม่เพียงพอ'}</span>
                    </button>
                  </div>
                </div>
              );
            }} />
          </div>
        </div>
      )}

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
