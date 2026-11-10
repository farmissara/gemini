import React, { useState, useEffect } from 'react';
import { 
  LabSimulationQuest, 
  LabChemicalItem, 
  LabSubjectCategory, 
  AppLanguage, 
  UserRole 
} from '../types';
import { INITIAL_LAB_QUESTS } from '../data/labQuestsData';
import { 
  playPourSound, 
  playBubbleSound, 
  playSparkSound, 
  playExplosionSound, 
  playSuccessSound 
} from '../lib/labSoundEffects';
import { 
  FlaskConical, 
  Flame, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Plus, 
  BookOpen, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Zap, 
  Trash2, 
  ZoomIn, 
  ZoomOut,
  ArrowLeft,
  Atom,
  Target
} from 'lucide-react';

interface SubjectLabSimulationViewProps {
  currentUserRole?: UserRole;
  currentUserName?: string;
  lang: AppLanguage;
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onBackToGames?: () => void;
}

export const SubjectLabSimulationView: React.FC<SubjectLabSimulationViewProps> = ({
  currentUserRole = 'student',
  currentUserName = 'นักเรียน',
  lang,
  onEarnRewards,
  onBackToGames,
}) => {
  // Quest state
  const [quests, setQuests] = useState<LabSimulationQuest[]>(INITIAL_LAB_QUESTS);
  const [activeSubject, setActiveSubject] = useState<LabSubjectCategory>('chemistry');
  const [selectedQuestId, setSelectedQuestId] = useState<string>('chem-1');

  // Active Lab Workspace State
  const [beakerItems, setBeakerItems] = useState<LabChemicalItem[]>([]);
  const [isBurnerActive, setIsBurnerActive] = useState(false);
  const [isStirred, setIsStirred] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Reaction Animation State: 'idle' | 'pouring' | 'reacting' | 'success' | 'exploded'
  const [reactionState, setReactionState] = useState<'idle' | 'pouring' | 'reacting' | 'success' | 'exploded'>('idle');
  const [reactionMessage, setReactionMessage] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<{ id: number; left: number; delay: number }[]>([]);
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  
  // Smooth Zoom state: min 0.6x to max 1.6x
  const [labZoom, setLabZoom] = useState<number>(1.0);

  // Teacher Custom Lab Creator Modal State
  const [showTeacherBuilder, setShowTeacherBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState<0 | 1>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<LabSubjectCategory>('chemistry');
  const [newConcept, setNewConcept] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  // Selected Quest
  const activeQuest = quests.find(q => q.id === selectedQuestId) || quests[0];
  const subjectQuests = quests.filter(q => q.subject === activeSubject);

  // Bubbling animation on reacting
  useEffect(() => {
    if (reactionState === 'reacting' || reactionState === 'success') {
      const bArray = Array.from({ length: 10 }).map((_, i) => ({
        id: i,
        left: 25 + Math.random() * 50,
        delay: Math.random() * 1.2,
      }));
      setBubbles(bArray);
    } else {
      setBubbles([]);
    }
  }, [reactionState]);

  // Sound wrapper
  const triggerSound = (fn: () => void) => {
    if (soundEnabled) {
      try {
        fn();
      } catch {}
    }
  };

  // Add reagent to beaker
  const handleAddItemToBeaker = (item: LabChemicalItem) => {
    if (reactionState === 'success' || reactionState === 'exploded') return;
    if (beakerItems.some(i => i.id === item.id)) return;

    triggerSound(playPourSound);
    setReactionState('pouring');
    setTimeout(() => {
      setBeakerItems(prev => [...prev, item]);
      setReactionState('idle');
      triggerSound(playBubbleSound);
    }, 350);
  };

  // Remove item from beaker
  const handleRemoveItem = (itemId: string) => {
    if (reactionState === 'success' || reactionState === 'exploded') return;
    setBeakerItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Reset experiment
  const handleResetLab = () => {
    setBeakerItems([]);
    setIsBurnerActive(false);
    setIsStirred(false);
    setReactionState('idle');
    setReactionMessage(null);
  };

  // Execute Reaction & Check Formula
  const handleAnalyzeReaction = () => {
    if (beakerItems.length === 0) {
      setReactionMessage(lang === 'th' ? 'กรุณาเลือกสารเคมีลงในขวดทดลองก่อนเริ่มปฏิกิริยา' : 'Please add ingredients to the flask first.');
      return;
    }

    setReactionState('reacting');
    triggerSound(playBubbleSound);

    setTimeout(() => {
      const selectedIds = beakerItems.map(i => i.id).sort();
      const targetIds = [...activeQuest.correctItemIds].sort();

      const itemsMatch = selectedIds.length === targetIds.length &&
        selectedIds.every((val, index) => val === targetIds[index]);

      const requiresHeat = activeQuest.requiredTool === 'burner' || Boolean(activeQuest.requiresHeating);
      const heatMatch = !requiresHeat || isBurnerActive;

      const requiresStir = activeQuest.requiredTool === 'stirrer' || Boolean(activeQuest.requiresStirring);
      const stirMatch = !requiresStir || isStirred;

      if (itemsMatch && heatMatch && stirMatch) {
        // Success
        setReactionState('success');
        const successMsg = lang === 'th'
          ? (activeQuest.successMessageTh || activeQuest.successDescTh || 'การทดลองสำเร็จสมบูรณ์!')
          : (activeQuest.successMessageEn || activeQuest.successDescEn || 'Experiment succeeded!');
        setReactionMessage(`🎉 ${successMsg}`);
        triggerSound(playSuccessSound);

        if (!completedQuestIds.includes(activeQuest.id)) {
          setCompletedQuestIds(prev => [...prev, activeQuest.id]);
          if (onEarnRewards) {
            onEarnRewards('student', activeQuest.expReward, activeQuest.gemReward, true);
          }
        }
      } else {
        // Explosion
        setReactionState('exploded');
        triggerSound(playExplosionSound);

        let failDetail = '';
        if (!itemsMatch) {
          failDetail = lang === 'th' ? 'สารที่เลือกไม่ตรงตามอัตราส่วนเคมีที่สมดุล!' : 'Wrong chemical ratio!';
        } else if (requiresHeat && !isBurnerActive) {
          failDetail = lang === 'th' ? 'ลืมจุดไฟตะเกียงบุนเซนเพื่อเร่งปฏิกิริยา!' : 'Forgot to light the burner!';
        } else if (requiresStir && !isStirred) {
          failDetail = lang === 'th' ? 'ลืมคนสารละลายให้เข้ากันก่อน!' : 'Forgot to stir!';
        }

        setReactionMessage(lang === 'th' ? `💥 ตูมมม! ระเบิดหน้าดำผมฟู! ${failDetail}` : `💥 BOOM! Comic Explosion! ${failDetail}`);
      }
    }, 1200);
  };

  // Calculate liquid color
  const getFluidColor = () => {
    if (reactionState === 'exploded') return '#1e293b'; // burnt charcoal
    if (reactionState === 'success') return activeQuest.resultingColor || activeQuest.successProductColor || '#10b981';
    if (beakerItems.length === 0) return 'rgba(255,255,255,0.08)';
    const lastItem = beakerItems[beakerItems.length - 1];
    return lastItem.color || '#38bdf8';
  };

  const liquidLevelPct = Math.min(100, beakerItems.length * 28 + (beakerItems.length > 0 ? 25 : 0));

  // Zoom helpers
  const handleZoomIn = () => {
    setLabZoom(prev => Math.min(1.6, Number((prev + 0.15).toFixed(2))));
  };
  const handleZoomOut = () => {
    setLabZoom(prev => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans">
      
      {/* ========================================================= */}
      {/* COMPACT TOP HUD / HEADER BAR (Exit, Subjects, Zoom, Sound) */}
      {/* ========================================================= */}
      <header className="shrink-0 px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 z-20">
        
        {/* Left: Exit Game / Back to Hub */}
        <div className="flex items-center gap-2">
          {onBackToGames && (
            <button
              type="button"
              onClick={onBackToGames}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer active:scale-95"
              title="ออกจากเกม กลับสู่หน้าหลัก"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? '❌ ออกจากเกม' : '❌ Exit Game'}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-extrabold text-xs sm:text-sm text-cyan-300 hidden sm:inline">
              {lang === 'th' ? 'ห้องทดลองวิทยาศาสตร์เสมือนจริง' : 'Subject Lab Simulation'}
            </span>
          </div>
        </div>

        {/* Center: Subject Categories (Compact Pills) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'chemistry' as LabSubjectCategory, labelTh: '🧪 เคมี', labelEn: 'Chem' },
            { id: 'math' as LabSubjectCategory, labelTh: '🚀 ฟิสิกส์', labelEn: 'Physics' },
            { id: 'english' as LabSubjectCategory, labelTh: '🍲 อังกฤษ', labelEn: 'English' },
            { id: 'computer' as LabSubjectCategory, labelTh: '🤖 โค้ดดิ้ง', labelEn: 'Code' },
            { id: 'thai' as LabSubjectCategory, labelTh: '📜 ภาษาไทย', labelEn: 'Thai' },
          ].map(subj => (
            <button
              key={subj.id}
              type="button"
              onClick={() => {
                setActiveSubject(subj.id);
                const firstQuest = quests.find(q => q.subject === subj.id);
                if (firstQuest) setSelectedQuestId(firstQuest.id);
                handleResetLab();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSubject === subj.id
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lang === 'th' ? subj.labelTh : subj.labelEn}
            </button>
          ))}
        </div>

        {/* Right: Zoom In/Out, Sound Toggle, Rewards */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom In & Out Controls */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-1 py-0.5 text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-slate-300 hover:text-cyan-300 active:scale-90 transition cursor-pointer"
              title="ซูมออก (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLabZoom(1.0)}
              className="text-[10px] font-mono text-cyan-300 font-bold px-1 hover:underline cursor-pointer"
              title="รีเซ็ต 1.0x"
            >
              {labZoom}x
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-slate-300 hover:text-cyan-300 active:scale-90 transition cursor-pointer"
              title="ซูมเข้า (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
            title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Teacher Creator */}
          {(currentUserRole === 'teacher' || currentUserRole === 'admin') && (
            <button
              type="button"
              onClick={() => {
                setBuilderStep(0);
                setShowTeacherBuilder(true);
              }}
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>โจทย์ใหม่</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN RESPONSIVE WORKSPACE */}
      <main className="flex-1 min-h-0 w-full p-2.5 sm:p-3 grid grid-cols-1 md:grid-cols-12 gap-2.5 overflow-y-auto">
        
        {/* ========================================================= */}
        {/* ZONE 1: APPARATUS STAGE, CONTROLS & REACTION FEEDBACK (Left 6 cols) */}
        {/* ========================================================= */}
        <section className="md:col-span-6 flex flex-col justify-between rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 sm:p-3 relative overflow-hidden shadow-xl">
          
          {/* Top of stage: Beaker item tags */}
          <div className="flex items-center justify-between text-xs z-10 pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">ในขวดทดลอง:</span>
              {beakerItems.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">แตะสารเคมีจากขวามือเพื่อเทลงขวด</span>
              ) : (
                beakerItems.map(item => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 border border-slate-700 text-cyan-200 shrink-0"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.formula}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-rose-400 hover:text-rose-200 ml-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold shrink-0">
              <Trophy className="w-3 h-3" />
              <span>+{activeQuest.expReward} EXP</span>
            </div>
          </div>

          {/* Center Stage: Scientist & Erlenmeyer Flask (Scalable via labZoom) */}
          <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden my-1">
            
            {/* Explosion overlay */}
            {reactionState === 'exploded' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none animate-in zoom-in-75 duration-200">
                <div className="text-4xl sm:text-5xl font-black text-rose-500 tracking-wider drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] font-mono animate-bounce">
                  💥 BOOM!!
                </div>
                <div className="text-amber-300 font-bold text-xs mt-1">หน้าดำผมฟู! ตูมตามสุดฮา</div>
              </div>
            )}

            <div 
              style={{ transform: `scale(${labZoom})`, transformOrigin: 'center' }}
              className="flex items-end justify-center gap-4 transition-transform duration-200"
            >
              {/* Animated Cartoon Scientist */}
              <div className="flex flex-col items-center">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg mb-1 shadow-sm ${
                  reactionState === 'exploded' ? 'bg-rose-950 text-rose-300 border border-rose-500' :
                  reactionState === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' :
                  reactionState === 'reacting' ? 'bg-amber-950 text-amber-300 border border-amber-500' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {reactionState === 'exploded' ? '😱 ว๊ากกก!' :
                   reactionState === 'success' ? '✨ สำเร็จแล้ว!' :
                   reactionState === 'reacting' ? '🧪 ฟู่ๆๆ...' : '👨‍🔬 พร้อมทดลอง'}
                </div>

                <svg width="80" height="105" viewBox="0 0 120 150" className="overflow-visible">
                  {reactionState === 'exploded' ? (
                    <path d="M20 50 Q10 20 25 10 Q40 0 60 5 Q80 -5 95 12 Q115 25 100 55 Q115 50 110 65 Q95 70 95 55 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
                  ) : (
                    <path d="M30 45 Q25 25 40 15 Q60 10 80 15 Q95 25 90 45 Z" fill="#64748b" />
                  )}
                  <circle cx="60" cy="55" r="30" fill={reactionState === 'exploded' ? '#475569' : '#fcd34d'} />
                  {/* Eyes / Goggles */}
                  <circle cx="48" cy="52" r="11" fill="none" stroke="#38bdf8" strokeWidth="3" />
                  <circle cx="72" cy="52" r="11" fill="none" stroke="#38bdf8" strokeWidth="3" />
                  <line x1="59" y1="52" x2="61" y2="52" stroke="#38bdf8" strokeWidth="3" />
                  <circle cx="48" cy="52" r="4" fill="#0f172a" />
                  <circle cx="72" cy="52" r="4" fill="#0f172a" />
                  {/* Mouth */}
                  {reactionState === 'exploded' ? (
                    <ellipse cx="60" cy="72" rx="9" ry="6" fill="#0f172a" />
                  ) : reactionState === 'success' ? (
                    <path d="M50 68 Q60 80 70 68" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                  ) : (
                    <line x1="53" y1="70" x2="67" y2="70" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                  )}
                  {/* Lab Coat */}
                  <path d="M35 85 L85 85 L95 145 L25 145 Z" fill={reactionState === 'exploded' ? '#94a3b8' : '#ffffff'} stroke="#cbd5e1" strokeWidth="2" />
                  <polygon points="58,85 62,85 60,105" fill="#3b82f6" />
                </svg>
              </div>

              {/* Erlenmeyer Flask Apparatus */}
              <div className="flex flex-col items-center relative">
                {/* Steam */}
                {beakerItems.length > 0 && reactionState !== 'exploded' && (
                  <div className="absolute -top-7 flex gap-1 pointer-events-none">
                    <div className="w-1.5 h-5 rounded-full bg-cyan-300/40 blur-xs animate-pulse" />
                    <div className="w-2 h-7 rounded-full bg-blue-300/40 blur-xs animate-bounce" />
                  </div>
                )}

                <div className="relative w-32 h-40 flex items-center justify-center">
                  <svg width="130" height="165" viewBox="0 0 180 230">
                    <defs>
                      <clipPath id="flaskClipCompact">
                        <polygon points="76,40 104,40 104,80 156,195 24,195 76,80" />
                      </clipPath>
                    </defs>

                    <g clipPath="url(#flaskClipCompact)">
                      <rect
                        x="0"
                        y={200 - liquidLevelPct * 1.3}
                        width="180"
                        height={liquidLevelPct * 1.5}
                        fill={getFluidColor()}
                        opacity="0.85"
                        className="transition-all duration-300"
                      />
                      {bubbles.map(b => (
                        <circle
                          key={b.id}
                          cx={b.left * 1.8}
                          cy="175"
                          r="2.5"
                          fill="#ffffff"
                          opacity="0.7"
                          className="animate-ping"
                        />
                      ))}
                      {isStirred && (
                        <ellipse cx="90" cy={200 - liquidLevelPct * 1.3} rx="30" ry="7" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.5" className="animate-spin" />
                      )}
                    </g>

                    <polygon
                      points="76,40 104,40 104,80 156,195 24,195 76,80"
                      fill="none"
                      stroke={reactionState === 'exploded' ? '#475569' : '#38bdf8'}
                      strokeWidth="3.5"
                    />
                    <rect x="73" y="36" width="34" height="6" rx="2" fill="none" stroke="#38bdf8" strokeWidth="3" />
                  </svg>

                  {/* Flame Burner */}
                  {isBurnerActive && (
                    <div className="absolute -bottom-3 flex flex-col items-center">
                      <div className="w-5 h-7 bg-gradient-to-t from-amber-500 via-orange-400 to-yellow-200 rounded-full animate-bounce blur-xs" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row & Test Button */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800 z-10">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                {/* Stir */}
                <button
                  type="button"
                  onClick={() => {
                    setIsStirred(true);
                    triggerSound(playBubbleSound);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isStirred ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="คนสารละลาย"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isStirred ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">คนสาร</span>
                </button>

                {/* Burner */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBurnerActive(!isBurnerActive);
                    triggerSound(playSparkSound);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isBurnerActive ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="จุด/ดับไฟตะเกียง"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{isBurnerActive ? 'ดับไฟ' : 'ต้มไฟ'}</span>
                </button>

                {/* Reset */}
                <button
                  type="button"
                  onClick={handleResetLab}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="ล้างขวดทดลอง"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Big React Button */}
              <button
                type="button"
                disabled={reactionState === 'reacting'}
                onClick={handleAnalyzeReaction}
                className="flex-1 max-w-[220px] py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>
                  {reactionState === 'reacting'
                    ? (lang === 'th' ? 'กำลังทำปฏิกิริยา...' : 'Reacting...')
                    : (lang === 'th' ? '⚡ ทดสอบปฏิกิริยา' : '⚡ Test Formula')}
                </span>
              </button>
            </div>

            {/* Reaction Feedback & Scientific Explanation (Directly below Test button - NO SCROLLING!) */}
            {reactionMessage && (
              <div className={`p-2 rounded-xl text-xs border leading-tight animate-in fade-in duration-200 ${
                reactionState === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                  : reactionState === 'exploded'
                  ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                <div className="font-bold flex items-center gap-1">
                  {reactionState === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {reactionState === 'exploded' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span>{reactionMessage}</span>
                </div>
                {(reactionState === 'success' || reactionState === 'exploded') && (
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                    💡 <strong>เฉลยวิทยาศาสตร์:</strong> {activeQuest.scientificExplanationTh}
                  </p>
                )}
              </div>
            )}
          </div>

        </section>

        {/* ========================================================= */}
        {/* ZONE 2: QUEST OBJECTIVE & CHEMICAL REAGENT SHELF (Right 6 cols) */}
        {/* ========================================================= */}
        <section className="md:col-span-6 flex flex-col justify-between rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 sm:p-3 overflow-hidden shadow-xl">
          
          {/* Quest Scenario Box */}
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1 text-[11px]">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'th' ? activeQuest.titleTh : activeQuest.titleEn}</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                {activeQuest.gradeLevel}
              </span>
            </div>

            <p className="text-xs font-semibold text-white leading-snug">
              🎯 <strong>โจทย์:</strong> {lang === 'th' ? (activeQuest.goalTh || activeQuest.targetGoalTh) : (activeQuest.goalEn || activeQuest.targetGoalTh)}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {lang === 'th' ? activeQuest.scenarioTh : (activeQuest.scenarioEn || activeQuest.scenarioTh)}
            </p>
          </div>

          {/* Chemical Shelf - Grid of Tap-to-Add Buttons */}
          <div className="flex-1 min-h-0 flex flex-col justify-center py-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                <Atom className="w-3.5 h-3.5 text-indigo-400" />
                <span>ชั้นวางสารเคมี & อุปกรณ์ (แตะเพื่อเทลงขวด):</span>
              </span>
              <span className="text-[10px] text-slate-500">เลือกสูตรที่ถูกต้อง</span>
            </div>

            {/* Compact Reagent Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {activeQuest.availableItems.map(item => {
                const isSelected = beakerItems.some(i => i.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSelected || reactionState === 'reacting'}
                    onClick={() => handleAddItemToBeaker(item)}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-600 text-blue-300 opacity-60'
                        : 'bg-slate-800 hover:bg-slate-750 hover:border-blue-400 border-slate-700 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-xs" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-white truncate">
                          {item.formula}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.nameTh}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      isSelected ? 'bg-blue-900/60 text-blue-200' : 'bg-blue-600 text-white'
                    }`}>
                      {isSelected ? '✓ ในขวด' : '+ เท'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Quest Pill Switcher if multiple quests */}
          {subjectQuests.length > 1 && (
            <div className="pt-1.5 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">เปลี่ยนโจทย์:</span>
              {subjectQuests.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setSelectedQuestId(q.id);
                    handleResetLab();
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition shrink-0 cursor-pointer ${
                    q.id === activeQuest.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {completedQuestIds.includes(q.id) ? '✓ ' : ''}ข้อ {idx + 1}
                </button>
              ))}
            </div>
          )}

        </section>

      </main>

      {/* ========================================================= */}
      {/* TEACHER CUSTOM LAB BUILDER MODAL */}
      {/* ========================================================= */}
      {showTeacherBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-cyan-300">สร้างโจทย์แล็บการทดลองใหม่ (ครูผู้สอน)</h3>
              <button
                type="button"
                onClick={() => setShowTeacherBuilder(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {builderStep === 0 && <>
              <div>
                <label className="font-bold text-slate-300">ชื่อโจทย์การทดลอง:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ปฏิกิริยาการสลายตัวของไฮโดรเจนเปอร์ออกไซด์"
                  className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">หมวดวิชา:</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as LabSubjectCategory)}
                  className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="chemistry">เคมี & วิทยาศาสตร์</option>
                  <option value="math">ฟิสิกส์ & คำนวณ</option>
                  <option value="english">ภาษาอังกฤษ</option>
                  <option value="computer">วิทยาการคำนวณ</option>
                  <option value="thai">ภาษาไทย</option>
                </select>
              </div>
              </>}
              {builderStep === 1 && <>
              <div>
                <label className="font-bold text-slate-300">เป้าหมาย/คำถามสำหรับนักเรียน:</label>
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="เช่น ผสม H2O2 กับยีสต์ เพื่อผลิตฟองก๊าซออกซิเจน"
                  className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">เฉลยสาระสำคัญทางวิทยาศาสตร์:</label>
                <textarea
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  rows={2}
                  placeholder="อธิบายกลไกการเกิดปฏิกิริยาเมื่อทำสำเร็จ"
                  className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>
              </>}

              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">{builderStep + 1} / 2</span>
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => builderStep === 1 ? setBuilderStep(0) : setShowTeacherBuilder(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  {builderStep === 1 ? 'ย้อนกลับ' : 'ยกเลิก'}
                </button>
                {builderStep === 0 ? (
                  <button type="button" onClick={() => setBuilderStep(1)} className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                    ถัดไป
                  </button>
                ) : <button
                  type="button"
                  onClick={() => {
                    if (!newTitle.trim()) return;
                    const customQuest: LabSimulationQuest = {
                      id: `custom-${Date.now()}`,
                      subject: newSubject,
                      titleTh: newTitle,
                      titleEn: newTitle,
                      conceptTh: newConcept || 'การทดลองสร้างสรรค์โดยอาจารย์',
                      conceptEn: 'Teacher Custom Lab',
                      gradeLevel: 'ม.ปลาย',
                      difficulty: 'medium',
                      scenarioTh: newScenario || newTitle,
                      scenarioEn: newScenario || newTitle,
                      targetGoalTh: newGoal || 'หาอัตราส่วนสารเคมีที่ถูกต้อง',
                      goalTh: newGoal || 'หาอัตราส่วนสารเคมีที่ถูกต้อง',
                      goalEn: newGoal || 'Find correct reaction',
                      availableItems: activeQuest.availableItems,
                      correctItemIds: [activeQuest.availableItems[0]?.id || 'chem-hcl'],
                      requiredTool: 'none',
                      resultingColor: '#06b6d4',
                      successProductColor: '#06b6d4',
                      successTitleTh: 'ปฏิกิริยาเกิดขึ้นอย่างสมบูรณ์แบบ!',
                      successMessageTh: 'ปฏิกิริยาเกิดขึ้นอย่างสมบูรณ์แบบ!',
                      successMessageEn: 'Reaction completed successfully!',
                      successDescTh: 'ได้รับผลผลิตตามทฤษฎี',
                      successDescEn: 'Yielded expected products',
                      successAnimation: 'bubbling_glow',
                      failTitleTh: 'สารผสมไม่ถูกต้อง เกิดก๊าซควันดำ!',
                      failDescTh: 'สารผสมไม่ถูกต้อง เกิดก๊าซควันดำ!',
                      failDescEn: 'Reaction blew up!',
                      failAnimation: 'lab_explosion',
                      scientificExplanationTh: newExplanation || 'เมื่อสารทำปฏิกิริยาจะเกิดการจัดเรียงอะตอมใหม่',
                      expReward: 100,
                      gemReward: 20
                    };
                    setQuests(prev => [customQuest, ...prev]);
                    setSelectedQuestId(customQuest.id);
                    setShowTeacherBuilder(false);
                    setBuilderStep(0);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  บันทึกโจทย์
                </button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
