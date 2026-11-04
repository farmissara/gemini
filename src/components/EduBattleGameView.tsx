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
  Gamepad2
} from 'lucide-react';
import { QuizQuestion, PlayerScore, RewardItem, AuthUser, AppLanguage } from '../types';
import { EduBattleRoyale3DView } from './EduBattleRoyale3DView';

interface EduBattleGameViewProps {
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
}

export const EduBattleGameView: React.FC<EduBattleGameViewProps> = ({
  questions,
  playerScores,
  rewardItems,
  currentUser,
  lang,
  onAddQuestion,
  onImportQuestions,
  onEarnRewards,
  onRedeemReward
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'battle_royale_3d' | 'arena' | 'bank' | 'leaderboard' | 'shop'>('battle_royale_3d');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchBankQuery, setSearchBankQuery] = useState('');

  // 1v1 Battle State
  const [battleState, setBattleState] = useState<'idle' | 'playing' | 'round_over' | 'finished'>('idle');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);
  const [timer, setTimer] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [battleFeedback, setBattleFeedback] = useState<string | null>(null);

  // New Question Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState('คณิตศาสตร์ (Mathematics)');
  const [newGradeLevel, setNewGradeLevel] = useState('ม.6 (O-NET)');
  const [newCategory, setNewCategory] = useState<'onet' | 'general' | 'review' | 'exam'>('onet');
  const [newQuestionTh, setNewQuestionTh] = useState('');
  const [newQuestionEn, setNewQuestionEn] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanationTh, setNewExplanationTh] = useState('');
  const [newPoints, setNewPoints] = useState(100);

  // Import State
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Active Questions for Battle (filtered by subject)
  const battleQuestions = selectedSubject === 'all' 
    ? questions 
    : questions.filter(q => q.subject.includes(selectedSubject));

  const currentQ = battleQuestions[currentQuestionIndex] || questions[0];

  // Battle Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (battleState === 'playing' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (battleState === 'playing' && timer === 0) {
      handleTimeOut();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [battleState, timer]);

  const handleStartBattle = () => {
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
    setPlayerHp(prev => Math.max(0, prev - 25));
    setStreak(0);
    setBattleFeedback('หมดเวลา! โดนดาเมจ 25 HP');
    checkBattleEnd(playerHp - 25, opponentHp);
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || battleState !== 'playing') return;
    setSelectedAnswer(index);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      const timeBonus = timer * 5;
      const damage = 25 + streak * 5;
      const newOpponentHp = Math.max(0, opponentHp - damage);
      setOpponentHp(newOpponentHp);
      setStreak(prev => prev + 1);
      setRoundScore(prev => prev + currentQ.points + timeBonus);
      setBattleFeedback(`ถูกต้อง! ทำดาเมจ +${damage} HP (โบนัสความเร็ว +${timeBonus})`);
      checkBattleEnd(playerHp, newOpponentHp);
    } else {
      const newPlayerHp = Math.max(0, playerHp - 20);
      setPlayerHp(newPlayerHp);
      setStreak(0);
      setBattleFeedback(`ตอบผิด! เสีย 20 HP (คำตอบที่ถูกต้องคือ: ${currentQ.options[currentQ.correctIndex]})`);
      checkBattleEnd(newPlayerHp, opponentHp);
    }
  };

  const checkBattleEnd = (newPlayerHp: number, newOpponentHp: number) => {
    setTimeout(() => {
      if (newPlayerHp <= 0 || newOpponentHp <= 0 || currentQuestionIndex + 1 >= battleQuestions.length) {
        setBattleState('finished');
        const isWin = newOpponentHp <= 0 || (newPlayerHp > newOpponentHp);
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
    }, 1500);
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
                  category: (cols[3] as any) || 'onet',
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 text-white shadow-xl shadow-rose-950/20 border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>EduVerse Gamification Engine • ข้อสอบ O-NET & แบทเทิล 1v1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === 'th' ? 'สนามประลองความรู้ & คลังข้อสอบอัจฉริยะ' : 'EduBattle Arena & Question Bank'}
            </h1>
            <p className="text-white/80 text-sm max-w-2xl">
              {lang === 'th'
                ? 'ฝึกฝนทบทวนเนื้อหา O-NET และบทเรียนประจำคาบผ่านเกมประลองแบบ 1v1 พร้อมสะสมคะแนน EXP และเพชร (Gems) เพื่อแลกรางวัลในร้านค้า'
                : 'Interactive 1v1 knowledge battles and comprehensive O-NET quest modules with real EXP & Gem rewards.'}
            </p>
          </div>

          {/* User Score Summary Card */}
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 shrink-0">
            <img 
              src={currentPlayerStats.avatarUrl} 
              alt={currentPlayerStats.name} 
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{currentPlayerStats.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
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
              <div className="text-[11px] text-white/70">
                สถิติชนะ {currentPlayerStats.battleWins} ครั้ง • สตรีค {currentPlayerStats.streak} ติดต่อกัน
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Flagship 3D PUBG / Free Fire Battle Royale Button */}
          <button
            onClick={() => setActiveSubTab('battle_royale_3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'battle_royale_3d'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/30 scale-105 border border-yellow-300'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-slate-950 fill-current" />
            <span>🎮 {lang === 'th' ? '3D PUBG ล่าสมบัติ O-NET (แข่งทั้งห้อง)' : '3D Battle Royale (PUBG/Free Fire)'}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-slate-950 font-bold animate-pulse">
              HOT
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('arena')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'arena'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>{lang === 'th' ? '1v1 แบทเทิลสด' : '1v1 Duel Arena'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'bank'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{lang === 'th' ? 'คลังข้อสอบ & นำเข้า/ส่งออก (ครู)' : 'Question Bank & Import/Export'}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300">
              {questions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'leaderboard'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{lang === 'th' ? 'ตารางอันดับเกียรติยศ' : 'Leaderboard'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('shop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'shop'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{lang === 'th' ? 'ร้านค้าแลกรางวัล & ตัวละคร' : 'Reward Store & Skins'}</span>
          </button>
        </div>

        {/* Global Import Notification Banner */}
        {importNotification && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{importNotification}</span>
          </div>
        )}
      </div>

      {/* TAB 0: 3D PUBG / Free Fire Battle Royale & O-NET Treasure Hunt */}
      {activeSubTab === 'battle_royale_3d' && (
        <EduBattleRoyale3DView
          questions={questions}
          currentUser={currentUser}
          lang={lang}
          rewardItems={rewardItems}
          onEarnRewards={onEarnRewards}
          onExit={() => setActiveSubTab('arena')}
        />
      )}

      {/* TAB 1: 1v1 Battle Arena */}
      {activeSubTab === 'arena' && (
        <div className="space-y-6">
          {battleState === 'idle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Start Card */}
              <div className="md:col-span-2 rounded-3xl bg-slate-900/60 border border-slate-800 p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                    <Swords className="w-3.5 h-3.5" />
                    <span>Real-Time Duel Mode • พร้อมคำอธิบายเฉลยละเอียด</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    {lang === 'th' ? 'เลือกวิชาแล้วกด "เริ่มประลอง 1v1"' : 'Select Subject and Start Battle'}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                    ระบบจะจับคู่คำถาม O-NET และข้อสอบทบทวนบทเรียน ตอบถูกเร็วได้โบนัสดาเมจต่อเนื่อง ยิ่งทำคอมโบติดกัน ยิ่งรับ EXP และ Gems เพิ่มเป็นทวีคูณ
                  </p>

                  {/* Subject Filter Pills */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-300">
                      {lang === 'th' ? 'หมวดวิชาที่ต้องการประลอง:' : 'Subject Category:'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'ทุกวิชา (O-NET Mix)' },
                        { id: 'คณิตศาสตร์', label: 'คณิตศาสตร์ (Math)' },
                        { id: 'วิทยาศาสตร์', label: 'วิทยาศาสตร์ (Science)' },
                        { id: 'วิทยาการคำนวณ', label: 'วิทยาการคำนวณ (CS)' },
                        { id: 'ภาษาอังกฤษ', label: 'ภาษาอังกฤษ (English)' },
                        { id: 'ภาษาไทย', label: 'ภาษาไทย (Thai)' }
                      ].map(subj => (
                        <button
                          key={subj.id}
                          onClick={() => setSelectedSubject(subj.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            selectedSubject === subj.id
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {subj.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handleStartBattle}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                    <span>{lang === 'th' ? 'เริ่มประลอง 1v1 เดี๋ยวนี้' : 'Launch 1v1 Battle Now'}</span>
                  </button>

                  <div className="text-xs text-slate-400">
                    มีข้อสอบพร้อมแข่งขัน {battleQuestions.length} ข้อในหมวดนี้
                  </div>
                </div>
              </div>

              {/* Opponent Preview / Bot Match */}
              <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>คู่ต่อสู้ในระบบ (Opponent Match)</span>
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center gap-3">
                    <img 
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80"
                      alt="Opponent"
                      className="w-12 h-12 rounded-xl object-cover border border-rose-400/40"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">กัญญา วงศ์สวัสดิ์ (AI Rival)</h4>
                      <p className="text-[11px] text-slate-400">โรงเรียนสาธิต ม.6/1 • อัตราชนะ 85%</p>
                      <span className="text-[10px] text-amber-300 font-semibold">Diamond Master 💎</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 space-y-2">
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
            </div>
          )}

          {/* Active Battle In Progress */}
          {battleState === 'playing' && (
            <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              {/* Top HP & Duel Header */}
              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Player Health Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-white">{currentPlayerStats.name}</span>
                    </div>
                    <span className="text-emerald-400">{playerHp} / 100 HP</span>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, playerHp)}%` }}
                    />
                  </div>
                </div>

                {/* Opponent Health Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-rose-400">{opponentHp} / 100 HP</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">กัญญา (Rival)</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    </div>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, opponentHp)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Ribbon (Timer, Streak, Points) */}
              <div className="flex items-center justify-between py-2 px-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>Streak: {streak}x Combo</span>
                </div>

                <div className={`flex items-center gap-2 text-sm font-black px-4 py-1 rounded-full ${
                  timer <= 5 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' : 'bg-slate-700 text-cyan-300'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>00:{timer < 10 ? `0${timer}` : timer}</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Trophy className="w-4 h-4" />
                  <span>{roundScore} คะแนน</span>
                </div>
              </div>

              {/* Question Card */}
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    ข้อที่ {currentQuestionIndex + 1} จาก {battleQuestions.length} • {currentQ.subject}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    ระดับ: {currentQ.gradeLevel}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                  {currentQ.questionTh}
                </h3>

                {/* Multiple Choice Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {currentQ.options.map((opt, idx) => {
                    let btnStyle = 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700';
                    if (selectedAnswer !== null) {
                      if (idx === currentQ.correctIndex) {
                        btnStyle = 'bg-emerald-600/40 border-emerald-500 text-emerald-200 font-bold';
                      } else if (idx === selectedAnswer) {
                        btnStyle = 'bg-rose-600/40 border-rose-500 text-rose-200';
                      } else {
                        btnStyle = 'opacity-40 bg-slate-800/40 border-slate-800';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleAnswer(idx)}
                        className={`p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-start gap-3 ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Feedback & Explanation */}
                {battleFeedback && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-2 animate-fadeIn">
                    <p className="font-bold text-sm text-amber-300">{battleFeedback}</p>
                    <p className="text-slate-300 leading-relaxed">
                      💡 <strong>คำอธิบายเฉลย:</strong> {currentQ.explanationTh}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Battle Finished Modal */}
          {battleState === 'finished' && (
            <div className="max-w-md mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-6 shadow-2xl">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-xl shadow-amber-500/20">
                {playerHp > opponentHp ? (
                  <Trophy className="w-10 h-10 animate-bounce" />
                ) : (
                  <RotateCcw className="w-10 h-10" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white">
                  {playerHp > opponentHp ? '🎉 ยินดีด้วย! คุณได้รับชัยชนะ' : 'สู้ต่อไป! ประลองรอบถัดไป'}
                </h3>
                <p className="text-xs text-slate-400">
                  {playerHp > opponentHp 
                    ? 'ทำผลงานได้อย่างยอดเยี่ยม ตอบคำถาม O-NET ได้ถูกต้องแม่นยำ' 
                    : 'ทบทวนคำตอบแล้วลองใหม่อีกครั้งเพื่อรับรางวัลที่สูงขึ้น'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">EXP ที่ได้รับ</span>
                  <div className="text-xl font-black text-amber-400">
                    +{playerHp > opponentHp ? 250 : 80} EXP
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">เพชร Gems</span>
                  <div className="text-xl font-black text-cyan-400">
                    +{playerHp > opponentHp ? 30 : 10} Gems
                  </div>
                </div>
              </div>

              <button
                onClick={() => setBattleState('idle')}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all"
              >
                กลับสู่หน้าหลักเกม
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Question Bank Management (คลังข้อสอบ & Import/Export) */}
      {activeSubTab === 'bank' && (
        <div className="space-y-6">
          {/* Controls Bar: Import / Export / Add */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            {/* Search and Subject Filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'เพิ่มข้อสอบใหม่' : 'Add Question'}</span>
              </button>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-3">
            {filteredBank.map((q, idx) => (
              <div 
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {q.subject}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {q.gradeLevel}
                    </span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                      {q.category}
                    </span>
                  </div>

                  <div className="text-xs text-amber-400 font-bold">
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
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="w-5 h-5 rounded bg-black/40 flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                      {oIdx === q.correctIndex && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>เฉลยและเหตุผล:</strong> {q.explanationTh}</span>
                </div>
              </div>
            ))}
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
                className={`relative rounded-3xl p-6 border text-center space-y-3 overflow-hidden ${
                  idx === 0 
                    ? 'bg-gradient-to-b from-amber-500/20 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/10'
                    : idx === 1
                    ? 'bg-gradient-to-b from-slate-400/20 to-slate-900 border-slate-400/30'
                    : 'bg-gradient-to-b from-amber-700/20 to-slate-900 border-amber-700/30'
                }`}
              >
                <div className="absolute top-3 right-3 text-2xl font-black opacity-30">
                  #{idx + 1}
                </div>

                <div className="relative mx-auto w-20 h-20">
                  <img 
                    src={player.avatarUrl} 
                    alt={player.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg mx-auto"
                  />
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-md">
                    {idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{player.name}</h4>
                  <p className="text-[11px] text-amber-300 font-semibold">{player.rankTitle}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">EXP รวม</span>
                    <span className="font-extrabold text-amber-400">{player.exp.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">ชนะประลอง</span>
                    <span className="font-extrabold text-white">{player.battleWins} ครั้ง</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Rank Table */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-400 uppercase tracking-wider">
              ทำเนียบผู้เรียนและอาจารย์คะแนนสูงสุด (Hall of Fame)
            </div>
            <div className="divide-y divide-slate-800">
              {playerScores.map((p, rank) => (
                <div key={p.userId} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-black text-sm text-slate-400">
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
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {p.role === 'teacher' ? 'อาจารย์' : 'นักเรียน'}
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-300 font-semibold">{p.rankTitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <span className="font-bold text-amber-400 block">{p.exp.toLocaleString()} EXP</span>
                      <span className="text-[10px] text-slate-400">{p.gems} Gems</span>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="font-bold text-white">{p.battleWins} ชนะ</span>
                      <span className="text-[10px] text-rose-400">{p.streak} สตรีค</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Reward Item Store */}
      {activeSubTab === 'shop' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="w-6 h-6 text-cyan-400" />
              <div>
                <h4 className="text-sm font-bold text-white">ยอดเพชรของคุณในกระเป๋า</h4>
                <p className="text-xs text-slate-400">สะสมได้จากการชนะแบทเทิลและการทำแบบทดสอบ O-NET</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-300" />
              <span>{currentPlayerStats.gems} Gems</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rewardItems.map((item) => {
              const canAfford = currentPlayerStats.gems >= item.costGems;
              return (
                <div 
                  key={item.id}
                  className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <Medal className="w-6 h-6 text-indigo-400" />
                    </div>

                    <div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        item.category === 'skin' 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                          : item.category === 'boost'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.category === 'skin' ? '🎮 สกินตัวละคร 3D' : item.category === 'boost' ? '⚡ บูสเตอร์ช่วยเล่น' : item.category}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{item.titleTh}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.descriptionTh}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">คงเหลือ {item.stock} ชิ้น</span>
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
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{canAfford ? 'แลกของรางวัลนี้' : 'เพชรไม่เพียงพอ'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>เพิ่มข้อสอบใหม่เข้าคลังข้อสอบโรงเรียน</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewQuestion} className="space-y-4">
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
                    <option value="onet">ข้อสอบ O-NET</option>
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
                    <span className="w-6 text-xs font-bold text-slate-400 text-center">
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

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-600/30"
                >
                  บันทึกข้อสอบเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
