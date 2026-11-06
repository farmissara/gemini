import React, { useState, useEffect } from 'react';
import {
  AppLanguage,
  LabChemicalItem,
  LabSimulationQuest,
  LabSubjectCategory,
  UserRole
} from '../types';
import { INITIAL_LAB_QUESTS } from '../data/labQuestsData';
import {
  playPourSound,
  playBubbleSound,
  playBoomExplosionSound,
  playSuccessChimeSound,
  playSparkSound
} from '../lib/labSoundEffects';
import {
  FlaskConical,
  Atom,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Plus,
  Play,
  Volume2,
  VolumeX,
  Award,
  ChevronRight,
  Info,
  Beaker,
  Zap,
  Trash2,
  HelpCircle,
  GraduationCap
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

  // Teacher Custom Lab Creator Modal State
  const [showTeacherBuilder, setShowTeacherBuilder] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<LabSubjectCategory>('chemistry');
  const [newConcept, setNewConcept] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  // Selected Quest
  const activeQuest = quests.find(q => q.id === selectedQuestId) || quests[0];

  // Filtered Quests by Active Subject
  const subjectQuests = quests.filter(q => q.subject === activeSubject);

  // Generate bubbling animation on reacting
  useEffect(() => {
    if (reactionState === 'reacting' || reactionState === 'success') {
      const bArray = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: 20 + Math.random() * 60,
        delay: Math.random() * 1.5,
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
      } catch {
        // audio context fallback
      }
    }
  };

  // Add reagent to beaker
  const handleAddItemToBeaker = (item: LabChemicalItem) => {
    if (reactionState === 'success' || reactionState === 'exploded') return;
    if (beakerItems.some(i => i.id === item.id)) return; // don't duplicate identical item

    triggerSound(playPourSound);
    setReactionState('pouring');
    setTimeout(() => {
      setBeakerItems(prev => [...prev, item]);
      setReactionState('idle');
      triggerSound(playBubbleSound);
    }, 450);
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
      // Evaluation logic:
      const selectedIds = beakerItems.map(i => i.id).sort();
      const targetIds = [...activeQuest.correctItemIds].sort();

      const itemsMatch = selectedIds.length === targetIds.length &&
        selectedIds.every((val, index) => val === targetIds[index]);

      const heatingMatch = activeQuest.requiresHeating ? isBurnerActive : true;
      const stirringMatch = activeQuest.requiresStirring ? isStirred : true;

      // Check if any hazard/toxic item was selected
      const hasHazard = beakerItems.some(i => i.hazard && i.hazard.length > 0);

      if (itemsMatch && heatingMatch && stirringMatch && !hasHazard) {
        // SUCCESS!
        setReactionState('success');
        triggerSound(playSuccessChimeSound);
        setReactionMessage(activeQuest.successTitleTh);
        if (!completedQuestIds.includes(activeQuest.id)) {
          setCompletedQuestIds(prev => [...prev, activeQuest.id]);
          onEarnRewards?.(currentUserName || 'player-1', activeQuest.expReward, activeQuest.gemReward, true);
        }
      } else {
        // FAIL -> BOOM! EXPLOSION!
        setReactionState('exploded');
        triggerSound(playBoomExplosionSound);
        setReactionMessage(activeQuest.failTitleTh);
      }
    }, 1200);
  };

  // Color calculation for mixed fluid in the flask
  const getFluidColor = () => {
    if (reactionState === 'exploded') return '#1e293b'; // burnt black ash
    if (reactionState === 'success') return activeQuest.successProductColor;
    if (beakerItems.length === 0) return 'transparent';
    const lastItem = beakerItems[beakerItems.length - 1];
    return lastItem.color || '#93c5fd';
  };

  // Liquid level percentage
  const liquidLevelPct = Math.min(85, beakerItems.length * 25);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Subject Selector */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-500/30 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-bold text-blue-300">
              <FlaskConical className="w-3.5 h-3.5 text-blue-300 animate-spin" />
              <span>{lang === 'th' ? 'ห้องปฏิบัติการเสมือนจริง & เคมีระเบิดจำลอง' : 'Interactive Subject Science Labs & Explosions'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{lang === 'th' ? 'แล็บจำลองรายวิชา & คำนวณสูตรแอนิเมชัน' : 'Subject Lab Simulations & Chemistry'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {lang === 'th'
                ? 'ผสมสารเคมี คำนวณสูตรฟิสิกส์ ปรุงไวยากรณ์ และเขียนโค้ดตรรกะเสมือนจริง! ถ้าผสมสูตรถูกจะเกิดผลลัพธ์ที่งดงาม แต่ถ้าผสมผิด ห้องแล็บจะระเบิดตูมตามสุดฮา!'
                : 'Mix chemicals, calculate rocket trajectories, gourmet grammar, and code algorithms! Proper combinations succeed; errors trigger funny comic lab explosions!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-blue-600/30 border-blue-400/40 text-blue-200' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
            </button>

            {/* Teacher Customizer Button */}
            {(currentUserRole === 'teacher' || currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
              <button
                type="button"
                onClick={() => setShowTeacherBuilder(true)}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'สร้างโจทย์แล็บใหม่ (ครู)' : 'Create Lab Quest'}</span>
              </button>
            )}

            {onBackToGames && (
              <button
                type="button"
                onClick={onBackToGames}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                {lang === 'th' ? 'กลับเมนูเกม' : 'Back to Games'}
              </button>
            )}
          </div>
        </div>

        {/* 5 Subject Tabs Navigation */}
        <div className="mt-5 pt-4 border-t border-blue-800/40 flex flex-wrap gap-2">
          {[
            { id: 'chemistry' as LabSubjectCategory, labelTh: '🧪 วิทยาศาสตร์ & เคมีคำนวณ', labelEn: 'Chemistry Lab', badge: 'BOOM!' },
            { id: 'math' as LabSubjectCategory, labelTh: '🚀 ฟิสิกส์ & คำนวณมุมยิงจรวด', labelEn: 'Math Rocket', badge: 'Trajectory' },
            { id: 'english' as LabSubjectCategory, labelTh: '🍲 ภาษาอังกฤษ & ครัวไวยากรณ์', labelEn: 'English Gourmet', badge: 'Tense' },
            { id: 'computer' as LabSubjectCategory, labelTh: '🤖 วิทยาการคำนวณ & ตรรกะหุ่นยนต์', labelEn: 'Robo-Logic', badge: 'Algorithm' },
            { id: 'thai' as LabSubjectCategory, labelTh: '📜 ภาษาไทย & ถอดรหัสสำนวน', labelEn: 'Thai Wisdom', badge: 'Riddle' },
          ].map((subj) => (
            <button
              key={subj.id}
              type="button"
              onClick={() => {
                setActiveSubject(subj.id);
                const firstQuest = quests.find(q => q.subject === subj.id);
                if (firstQuest) setSelectedQuestId(firstQuest.id);
                handleResetLab();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubject === subj.id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 font-black'
                  : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>{lang === 'th' ? subj.labelTh : subj.labelEn}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 text-blue-200 font-semibold">
                {subj.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quest Selector Strip if multiple quests in subject */}
      {subjectQuests.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold shrink-0">{lang === 'th' ? 'เลือกหัวข้อการทดลอง:' : 'Select Lab Quest:'}</span>
          {subjectQuests.map((q) => {
            const isCompleted = completedQuestIds.includes(q.id);
            const isSelected = q.id === activeQuest.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setSelectedQuestId(q.id);
                  handleResetLab();
                }}
                className={`px-3 py-1.5 rounded-xl border shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-xs'
                    : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{lang === 'th' ? q.titleTh : q.titleEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main 2-Zone Laboratory Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        
        {/* ========================================================= */}
        {/* ZONE 1: THE INTERACTIVE ANIMATION LAB STAGE */}
        {/* ========================================================= */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[540px]">
          
          {/* Ambient Lighting Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
          
          {/* Top Status & Quest Kicker */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {activeQuest.gradeLevel}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {activeQuest.conceptTh}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                <span>+{activeQuest.expReward} EXP</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+{activeQuest.gemReward} Gems</span>
              </div>
            </div>
          </div>

          {/* Center Stage: Cartoon Scientist & Animated Chemical Flask */}
          <div className="relative z-10 my-6 flex flex-col items-center justify-center">
            
            {/* Comic Explosion Overlay if reactionState === 'exploded' */}
            {reactionState === 'exploded' && (
              <div className="absolute inset-0 -top-8 flex flex-col items-center justify-center z-30 pointer-events-none animate-in zoom-in duration-300">
                {/* Explosion Cloud Text */}
                <div className="relative">
                  <div className="text-5xl sm:text-7xl font-black text-rose-500 tracking-wider drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-bounce font-mono">
                    💥 BOOM!!
                  </div>
                  <div className="absolute -top-3 -right-6 text-xl font-black text-amber-300 rotate-12">
                    POOF!
                  </div>
                </div>

                {/* Smoke Puffs */}
                <div className="w-64 h-32 relative mt-2">
                  <div className="absolute inset-0 bg-slate-900/90 rounded-full blur-xl animate-pulse" />
                  <div className="absolute top-2 left-6 w-20 h-20 bg-slate-700/80 rounded-full blur-md animate-ping" />
                  <div className="absolute top-4 right-8 w-24 h-24 bg-slate-800/80 rounded-full blur-lg animate-ping" />
                </div>
              </div>
            )}

            {/* Cartoon Scientist Avatar + Lab Bench */}
            <div className="flex items-end justify-center gap-8 w-full max-w-md">
              
              {/* Animated Cartoon Scientist (SVG Based) */}
              <div className="flex flex-col items-center relative transition-transform duration-300">
                
                {/* Floating Expression Bubble */}
                <div className={`mb-2 px-3 py-1 rounded-xl text-[11px] font-bold shadow-lg transition-all ${
                  reactionState === 'exploded'
                    ? 'bg-rose-950 text-rose-200 border border-rose-500 animate-bounce'
                    : reactionState === 'success'
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-500 animate-pulse'
                    : reactionState === 'reacting'
                    ? 'bg-amber-950 text-amber-200 border border-amber-500'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {reactionState === 'exploded' && '😱 อ๊ากกก! หน้าดำผมชี้ฟู!'}
                  {reactionState === 'success' && '✨ ไชโย! สารละลายเปลี่ยนสีสวยงาม!'}
                  {reactionState === 'reacting' && '🧪 ปฏิกิริยากำลังเกิดขึ้น...'}
                  {reactionState === 'pouring' && '💧 ค่อยๆ เทสารเคมีลงไป...'}
                  {reactionState === 'idle' && '👨‍🔬 ดร.ไซเบอร์: พร้อมทดลองครับ!'}
                </div>

                {/* SVG Character */}
                <svg width="120" height="150" viewBox="0 0 120 150" className="overflow-visible">
                  {/* Hair */}
                  {reactionState === 'exploded' ? (
                    // Frizzy Exploded Hair (Spiky / Burnt)
                    <path
                      d="M20 50 Q10 20 25 10 Q40 0 60 5 Q80 -5 95 12 Q115 25 100 55 Q115 50 110 65 Q95 70 95 55 Z"
                      fill="#1e293b"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  ) : (
                    // Neat Scientist Hair
                    <path
                      d="M30 45 Q35 15 60 15 Q85 15 90 45 Q80 35 60 35 Q40 35 30 45 Z"
                      fill="#475569"
                    />
                  )}

                  {/* Head */}
                  <circle
                    cx="60"
                    cy="52"
                    r="26"
                    fill={reactionState === 'exploded' ? '#64748b' : '#fcd34d'}
                    stroke={reactionState === 'exploded' ? '#334155' : '#f59e0b'}
                    strokeWidth="2"
                  />

                  {/* Soot smudges on face if exploded */}
                  {reactionState === 'exploded' && (
                    <>
                      <ellipse cx="50" cy="56" rx="6" ry="4" fill="#0f172a" opacity="0.8" />
                      <ellipse cx="72" cy="58" rx="8" ry="5" fill="#0f172a" opacity="0.8" />
                      <ellipse cx="60" cy="42" rx="7" ry="3" fill="#0f172a" opacity="0.7" />
                    </>
                  )}

                  {/* Safety Goggles / Glasses */}
                  <g transform={reactionState === 'exploded' ? 'rotate(-12 60 48)' : ''}>
                    <rect x="42" y="44" width="16" height="12" rx="3" fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="2" />
                    <rect x="62" y="44" width="16" height="12" rx="3" fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="2" />
                    <line x1="58" y1="50" x2="62" y2="50" stroke="#0284c7" strokeWidth="2" />
                    {/* Eyes */}
                    {reactionState === 'exploded' ? (
                      // Spiral dizzy eyes
                      <>
                        <circle cx="50" cy="50" r="2" fill="#0f172a" />
                        <circle cx="70" cy="50" r="2" fill="#0f172a" />
                      </>
                    ) : reactionState === 'success' ? (
                      // Star happy eyes
                      <>
                        <text x="46" y="53" fontSize="10" fill="#f59e0b">★</text>
                        <text x="66" y="53" fontSize="10" fill="#f59e0b">★</text>
                      </>
                    ) : (
                      // Normal friendly eyes
                      <>
                        <circle cx="50" cy="50" r="2" fill="#0f172a" />
                        <circle cx="70" cy="50" r="2" fill="#0f172a" />
                      </>
                    )}
                  </g>

                  {/* Mouth */}
                  {reactionState === 'exploded' ? (
                    // Open shocked mouth
                    <ellipse cx="60" cy="68" rx="5" ry="7" fill="#0f172a" />
                  ) : reactionState === 'success' ? (
                    // Big smile
                    <path d="M50 64 Q60 74 70 64" stroke="#0f172a" strokeWidth="2.5" fill="#ef4444" strokeLinecap="round" />
                  ) : (
                    // Gentle smile
                    <path d="M52 64 Q60 70 68 64" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
                  )}

                  {/* Lab Coat / Body */}
                  <path
                    d="M35 78 L85 78 L95 140 L25 140 Z"
                    fill={reactionState === 'exploded' ? '#cbd5e1' : '#ffffff'}
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                  {/* Tie / ID badge */}
                  <polygon points="58,78 62,78 60,95" fill="#3b82f6" />
                  <rect x="70" y="88" width="10" height="12" rx="1" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />

                  {/* Arms */}
                  {reactionState === 'success' ? (
                    // Arms raised in victory
                    <>
                      <line x1="35" y1="85" x2="15" y2="55" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                      <line x1="85" y1="85" x2="105" y2="55" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                      <circle cx="15" cy="55" r="5" fill="#fcd34d" />
                      <circle cx="105" cy="55" r="5" fill="#fcd34d" />
                    </>
                  ) : (
                    // Arms holding beaker
                    <>
                      <line x1="35" y1="88" x2="22" y2="115" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                      <line x1="85" y1="88" x2="98" y2="115" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                      <circle cx="22" cy="115" r="5" fill={reactionState === 'exploded' ? '#64748b' : '#fcd34d'} />
                      <circle cx="98" cy="115" r="5" fill={reactionState === 'exploded' ? '#64748b' : '#fcd34d'} />
                    </>
                  )}
                </svg>
              </div>

              {/* Animated Laboratory Flask Apparatus */}
              <div className="flex flex-col items-center relative">
                
                {/* Steam / Vapor rising from flask */}
                {beakerItems.length > 0 && reactionState !== 'exploded' && (
                  <div className="absolute -top-12 flex gap-1 pointer-events-none">
                    <div className="w-1.5 h-6 rounded-full bg-blue-300/40 blur-xs animate-pulse" />
                    <div className="w-2 h-8 rounded-full bg-cyan-300/40 blur-xs animate-bounce" />
                    <div className="w-1.5 h-5 rounded-full bg-indigo-300/40 blur-xs animate-pulse" />
                  </div>
                )}

                {/* Large Erlenmeyer Flask SVG Container */}
                <div className="relative w-44 h-56 flex items-center justify-center">
                  <svg width="180" height="230" viewBox="0 0 180 230" className="drop-shadow-2xl">
                    
                    {/* Flask Glass Body Clip Path */}
                    <defs>
                      <clipPath id="flaskClip">
                        <polygon points="76,40 104,40 104,80 156,195 24,195 76,80" />
                      </clipPath>
                    </defs>

                    {/* Flask Background Liquid Layer */}
                    <g clipPath="url(#flaskClip)">
                      {/* Fluid Fill with smooth height animation */}
                      <rect
                        x="0"
                        y={200 - liquidLevelPct * 1.3}
                        width="180"
                        height={liquidLevelPct * 1.5}
                        fill={getFluidColor()}
                        opacity="0.85"
                        className="transition-all duration-500"
                      />

                      {/* Bubbles floating in fluid */}
                      {bubbles.map(b => (
                        <circle
                          key={b.id}
                          cx={b.left * 1.8}
                          cy="170"
                          r="3"
                          fill="#ffffff"
                          opacity="0.7"
                          className="animate-ping"
                          style={{ animationDuration: `${0.8 + b.delay}s` }}
                        />
                      ))}

                      {/* Stirring vortex effect if stirred */}
                      {isStirred && (
                        <ellipse
                          cx="90"
                          cy={200 - liquidLevelPct * 1.3}
                          rx="35"
                          ry="8"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                          opacity="0.5"
                          className="animate-spin"
                        />
                      )}
                    </g>

                    {/* Glass Flask Outer Outline */}
                    <polygon
                      points="76,40 104,40 104,80 156,195 24,195 76,80"
                      fill="none"
                      stroke={reactionState === 'exploded' ? '#475569' : '#38bdf8'}
                      strokeWidth="4"
                      strokeLinejoin="round"
                    />

                    {/* Flask Rim / Neck */}
                    <rect x="70" y="32" width="40" height="8" rx="3" fill="none" stroke="#38bdf8" strokeWidth="3" />

                    {/* Measurement markings */}
                    <line x1="56" y1="165" x2="70" y2="165" stroke="#94a3b8" strokeWidth="1.5" />
                    <text x="74" y="168" fontSize="8" fill="#94a3b8" fontFamily="monospace">100ml</text>

                    <line x1="68" y1="135" x2="80" y2="135" stroke="#94a3b8" strokeWidth="1.5" />
                    <text x="84" y="138" fontSize="8" fill="#94a3b8" fontFamily="monospace">200ml</text>

                    <line x1="80" y1="105" x2="90" y2="105" stroke="#94a3b8" strokeWidth="1.5" />
                    <text x="94" y="108" fontSize="8" fill="#94a3b8" fontFamily="monospace">300ml</text>

                    {/* Glass Reflection Highlight */}
                    <path
                      d="M80,82 L38,185"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                  </svg>
                </div>

                {/* Bunsen Burner Stand under the Flask */}
                <div className="relative -mt-2 flex flex-col items-center">
                  
                  {/* Animated Flame if Burner is Active */}
                  {isBurnerActive && (
                    <div className="relative -top-4 flex items-center justify-center">
                      <div className="w-6 h-10 bg-gradient-to-t from-blue-600 via-amber-400 to-yellow-200 rounded-full blur-xs animate-bounce" />
                      <div className="absolute w-3 h-6 bg-cyan-200 rounded-full blur-xs animate-pulse" />
                    </div>
                  )}

                  {/* Burner Base Metal Chimney */}
                  <div className="w-10 h-6 bg-slate-700 border border-slate-600 rounded-t-md" />
                  <div className="w-20 h-3 bg-slate-800 border border-slate-600 rounded-md" />
                </div>

              </div>

            </div>
          </div>

          {/* Bottom Action Controls Strip */}
          <div className="relative z-10 pt-4 border-t border-slate-800 space-y-3">
            
            {/* Reaction Feedback Bar */}
            {reactionMessage && (
              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-300 ${
                reactionState === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : reactionState === 'exploded'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {reactionState === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {reactionState === 'exploded' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  <span>{reactionMessage}</span>
                </div>
                {reactionState === 'success' && (
                  <p className="text-[11px] text-emerald-300">
                    {activeQuest.successDescTh}
                  </p>
                )}
                {reactionState === 'exploded' && (
                  <p className="text-[11px] text-rose-300">
                    {activeQuest.failDescTh}
                  </p>
                )}
              </div>
            )}

            {/* Interactive Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              
              <div className="flex items-center gap-2">
                {/* Stir Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsStirred(true);
                    triggerSound(playBubbleSound);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isStirred
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isStirred ? 'animate-spin' : ''}`} />
                  <span>{lang === 'th' ? 'คนสารละลาย' : 'Stir Mixture'}</span>
                </button>

                {/* Bunsen Burner Flame Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBurnerActive(!isBurnerActive);
                    triggerSound(playSparkSound);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isBurnerActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isBurnerActive ? (lang === 'th' ? 'ดับไฟ' : 'Extinguish') : (lang === 'th' ? 'จุดไฟต้มสาร' : 'Ignite Burner')}</span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleResetLab}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
                  title="ล้างขวดทดลอง"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Big Action: Test & React */}
              <button
                type="button"
                disabled={reactionState === 'reacting'}
                onClick={handleAnalyzeReaction}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>
                  {reactionState === 'reacting'
                    ? (lang === 'th' ? 'กำลังทำปฏิกิริยา...' : 'Reacting...')
                    : (lang === 'th' ? '⚡ ทดสอบปฏิกิริยา / ยืนยันผล' : '⚡ React & Test Result')}
                </span>
              </button>

            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* ZONE 2: CHEMICAL SHELF & QUEST FORMULA WORKBENCH */}
        {/* ========================================================= */}
        <div className="space-y-4">
          
          {/* Quest Scenario & Objective Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {lang === 'th' ? 'ภารกิจการทดลองประจำคาบ' : 'Lab Quest Objective'}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {lang === 'th' ? activeQuest.titleTh : activeQuest.titleEn}
                </h2>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                activeQuest.difficulty === 'hard'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : activeQuest.difficulty === 'medium'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {activeQuest.difficulty}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeQuest.scenarioTh}
            </p>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 font-semibold flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{activeQuest.targetGoalTh}</span>
            </div>

            {activeQuest.createdByTeacherName && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'th' ? 'โจทย์สร้างโดย:' : 'Designed by:'} {activeQuest.createdByTeacherName}</span>
              </div>
            )}
          </div>

          {/* Current Ingredients in Beaker */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Beaker className="w-4 h-4 text-blue-600" />
                <span>{lang === 'th' ? 'สารที่อยู่ในขวดขณะนี้:' : 'Current Flask Contents:'}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {beakerItems.length} / 4 {lang === 'th' ? 'ชนิด' : 'items'}
              </span>
            </div>

            {beakerItems.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                {lang === 'th' ? 'ขวดทดลองยังว่างเปล่า โปรดเลือกสารเคมีจากชั้นวางด้านล่าง' : 'Flask is empty. Pick items from the shelf below.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {beakerItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: item.color }} />
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white mr-1.5">{item.nameTh}</span>
                        <span className="text-[11px] font-mono text-slate-500">{item.formula}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-rose-500 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chemical Shelf / Available Items */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Atom className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'th' ? 'ชั้นวางสารเคมี & อุปกรณ์ที่พร้อมใช้งาน:' : 'Chemical Shelf & Apparatus:'}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {lang === 'th' ? 'แตะ [+] เพื่อเทลงขวด' : 'Tap [+] to add'}
              </span>
            </div>

            <div className="space-y-2">
              {activeQuest.availableItems.map((item) => {
                const isSelected = beakerItems.some(i => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-blue-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: item.color }} />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.nameTh}
                        </h4>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                          {item.formula}
                        </span>
                        {item.hazard && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30">
                            ⚠️ {item.hazard}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {item.descriptionTh}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddItemToBeaker(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                      }`}
                    >
                      {isSelected ? (lang === 'th' ? 'ในขวดแล้ว' : 'Added') : (lang === 'th' ? '+ เทลงขวด' : '+ Add')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scientific Explanation Card (Visible upon victory or explosion) */}
          {(reactionState === 'success' || reactionState === 'exploded') && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <BookOpen className="w-4 h-4" />
                <span>{lang === 'th' ? 'สรุปสาระสำคัญทางวิทยาศาสตร์ & เฉลยสูตร' : 'Scientific Formula Breakdown'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeQuest.scientificExplanationTh}
              </p>
            </div>
          )}

        </div>

      </div>

      {/* ========================================================= */}
      {/* TEACHER CUSTOM LAB BUILDER MODAL */}
      {/* ========================================================= */}
      {showTeacherBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white my-auto max-h-[90vh] overflow-y-auto space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {lang === 'th' ? 'สร้างโจทย์ปฏิบัติการเสมือนจริงประจำวิชา' : 'Create Custom Lab Quest'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'th' ? 'คุณครูกำหนดสูตร สารเคมี และเอฟเฟกต์ผลลัพธ์เพื่อให้นักเรียนฝึกทดลอง' : 'Define chemical formulas, items, and funny reaction consequences'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherBuilder(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const customQuest: LabSimulationQuest = {
                  id: `custom-lab-${Date.now()}`,
                  subject: newSubject,
                  titleTh: newTitle || 'การทดลองเคมีปฏิบัติการสร้างโดยครู',
                  titleEn: 'Teacher Custom Chemistry Lab',
                  gradeLevel: 'ม.ต้น - ม.ปลาย',
                  conceptTh: newConcept || 'การสังเคราะห์และปฏิกิริยาเคมี',
                  difficulty: 'medium',
                  scenarioTh: newScenario || 'ทำการทดลองตามข้อกำหนดของครูผู้สอน',
                  targetGoalTh: newGoal || 'เลือกสารเคมีที่ถูกต้องแล้วกดทดสอบปฏิกิริยา',
                  availableItems: [
                    {
                      id: `item-${Date.now()}-1`,
                      nameTh: 'สารละลายตัวอย่าง A',
                      nameEn: 'Sample Solution A',
                      formula: 'Sol A',
                      color: '#60a5fa',
                      state: 'liquid',
                      descriptionTh: 'สารเคมีหลักสำหรับปฏิกิริยา',
                    },
                    {
                      id: `item-${Date.now()}-2`,
                      nameTh: 'สารละลายตัวอย่าง B',
                      nameEn: 'Sample Solution B',
                      formula: 'Sol B',
                      color: '#f43f5e',
                      state: 'liquid',
                      descriptionTh: 'ตัวเร่งปฏิกิริยาเคมี',
                    },
                    {
                      id: `item-${Date.now()}-3`,
                      nameTh: 'สารไวไฟสูงอันตราย (หลอก)',
                      nameEn: 'Combustible Hazard',
                      formula: 'Danger X',
                      color: '#fbbf24',
                      state: 'solid',
                      hazard: 'EXPLOSIVE',
                      descriptionTh: 'สารอันตราย ห้ามผสมเด็ดขาด!',
                    },
                  ],
                  correctItemIds: [`item-${Date.now()}-1`, `item-${Date.now()}-2`],
                  requiresStirring: true,
                  successTitleTh: '🎉 การทดลองของครูสำเร็จลุล่วง!',
                  successDescTh: 'สารละลายทำปฏิกิริยาสมบูรณ์แบบ ได้ผลผลิตตามที่กำหนดไว้',
                  successProductColor: '#10b981',
                  successAnimation: 'bubbling_glow',
                  failTitleTh: '💥 ห้องแล็บระเบิดควันตลบ!',
                  failDescTh: 'ผสมสารผิดสูตรจนเกิดการระเบิด ดร.หน้าดำผมฟู!',
                  failAnimation: 'lab_explosion',
                  scientificExplanationTh: newExplanation || 'เมื่อผสมสาร A และ B ในสัดส่วนที่ถูกต้อง ปฏิกิริยาจะดำเนินไปข้างหน้าอย่างสมบูรณ์',
                  expReward: 250,
                  gemReward: 40,
                  createdByTeacherName: currentUserName,
                };

                setQuests(prev => [customQuest, ...prev]);
                setSelectedQuestId(customQuest.id);
                setActiveSubject(newSubject);
                setShowTeacherBuilder(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-slate-300 block mb-1">กลุ่มสาระการเรียนรู้</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as LabSubjectCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold"
                >
                  <option value="chemistry">🧪 วิทยาศาสตร์ & เคมีคำนวณสูตร</option>
                  <option value="math">🚀 คณิตศาสตร์ & ฟิสิกส์วิถีจรวด</option>
                  <option value="english">🍲 ภาษาอังกฤษ & ไวยากรณ์</option>
                  <option value="computer">🤖 วิทยาการคำนวณ & อัลกอริทึม</option>
                  <option value="thai">📜 ภาษาไทย & สำนวนวรรณคดี</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ชื่อกิจกรรมการทดลอง *</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ปฏิกิริยาการเกิดก๊าซไฮโดรเจน หรือ การตกตะกอนเกลือ"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">คอนเซปต์และทฤษฎีหลัก</label>
                <input
                  type="text"
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  placeholder="เช่น กฎทรงมวล และอัตราการเกิดปฏิกิริยาเคมี"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">สถานการณ์และโจทย์คำถาม</label>
                <textarea
                  rows={2}
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  placeholder="อธิบายสถานการณ์ที่นักเรียนต้องแก้โจทย์หรือสารที่ต้องผสม"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">คำอธิบายเฉลยและสมการเคมีเมื่อทำเสร็จ</label>
                <textarea
                  rows={2}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="เช่น สมการ A + B -> C + D เป็นปฏิกิริยาคายความร้อน..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTeacherBuilder(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  บันทึกและเปิดให้นักเรียนทดลอง
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
