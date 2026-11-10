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
  Target,
  Compass,
  Utensils,
  Bot,
  Scroll,
  Globe,
  Rocket
} from 'lucide-react';

interface SubjectLabSimulationViewProps {
  currentUserRole?: UserRole;
  currentUserName?: string;
  lang: AppLanguage;
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onBackToGames?: () => void;
}

interface SubjectThemeConfig {
  id: LabSubjectCategory;
  nameTh: string;
  nameEn: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  stageTitleTh: string;
  stageTitleEn: string;
  avatarTitleTh: string;
  avatarTitleEn: string;
  trayLabelTh: string;
  trayHintTh: string;
  shelfLabelTh: string;
  shelfBadgeTh: string;
  tool1LabelTh: string;
  tool1LabelEn: string;
  tool2LabelTh: string;
  tool2LabelEn: string;
  actionButtonLabelTh: string;
  actionButtonLabelEn: string;
}

const SUBJECT_CONFIGS: Record<LabSubjectCategory, SubjectThemeConfig> = {
  chemistry: {
    id: 'chemistry',
    nameTh: 'เคมี & วิทยาศาสตร์',
    nameEn: 'Chemistry',
    icon: FlaskConical,
    accentColor: '#38bdf8',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    stageTitleTh: 'ห้องแล็บเคมี & วิทยาศาสตร์',
    stageTitleEn: 'Chemistry Lab',
    avatarTitleTh: 'ดร.นักเคมี',
    avatarTitleEn: 'Chemist',
    trayLabelTh: 'ในขวดรูปชมพู่:',
    trayHintTh: 'แตะสารเคมีด้านล่างเพื่อหยดลงขวด',
    shelfLabelTh: 'คลังสารเคมี & สารละลาย',
    shelfBadgeTh: 'สารเคมี',
    tool1LabelTh: 'คนสารละลาย',
    tool1LabelEn: 'Stir Reagents',
    tool2LabelTh: 'ตะเกียงบุนเซน',
    tool2LabelEn: 'Bunsen Burner',
    actionButtonLabelTh: 'วิเคราะห์ปฏิกิริยาเคมี',
    actionButtonLabelEn: 'Analyze Reaction',
  },
  math: {
    id: 'math',
    nameTh: 'ฟิสิกส์ & อวกาศ',
    nameEn: 'Physics',
    icon: Rocket,
    accentColor: '#f97316',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    stageTitleTh: 'ฐานปล่อยจรวด & ฟิสิกส์วงโคจร',
    stageTitleEn: 'Orbital Physics',
    avatarTitleTh: 'ผู้การอวกาศ',
    avatarTitleEn: 'Flight Director',
    trayLabelTh: 'บนแท่นปล่อยจรวด:',
    trayHintTh: 'เลือกมุมยิง, เชื้อเพลิง และบูสเตอร์',
    shelfLabelTh: 'คลังเวกเตอร์ & ระบบขับเคลื่อน',
    shelfBadgeTh: 'ปัจจัยฟิสิกส์',
    tool1LabelTh: 'ล็อกมุม 45°',
    tool1LabelEn: 'Lock 45° Angle',
    tool2LabelTh: 'จุดระเบิดบูสเตอร์',
    tool2LabelEn: 'Ignite Thrusters',
    actionButtonLabelTh: 'ปล่อยจรวด LAUNCH!',
    actionButtonLabelEn: 'Launch Rocket!',
  },
  english: {
    id: 'english',
    nameTh: 'ภาษาอังกฤษ & ไวยากรณ์',
    nameEn: 'English',
    icon: Utensils,
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    stageTitleTh: 'ครัวไวยากรณ์ภาษาอังกฤษ',
    stageTitleEn: 'Grammar Kitchen',
    avatarTitleTh: 'เชฟมิชลินไวยากรณ์',
    avatarTitleEn: 'Master Chef',
    trayLabelTh: 'ในหม้อปรุงอาหาร:',
    trayHintTh: 'เลือกประธาน กริยา และ Tense ลงหม้อ',
    shelfLabelTh: 'ตู้เครื่องปรุงไวยากรณ์ & คำศัพท์',
    shelfBadgeTh: 'เครื่องปรุงภาษา',
    tool1LabelTh: 'คลุกเคล้าส่วนผสม',
    tool1LabelEn: 'Blend Recipe',
    tool2LabelTh: 'เคี่ยวไฟไวยากรณ์',
    tool2LabelEn: 'Simmer Pot',
    actionButtonLabelTh: 'เสิร์ฟจานเด็ด GOURMET',
    actionButtonLabelEn: 'Serve Gourmet',
  },
  computer: {
    id: 'computer',
    nameTh: 'โค้ดดิ้ง & หุ่นยนต์',
    nameEn: 'Robotics',
    icon: Bot,
    accentColor: '#6366f1',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    stageTitleTh: 'สตูดิโอหุ่นยนต์ & โค้ดดิ้ง',
    stageTitleEn: 'Robo-Logic Studio',
    avatarTitleTh: 'วิศวกรไซเบอร์',
    avatarTitleEn: 'Cyber Engineer',
    trayLabelTh: 'ในคิวคำสั่งหุ่นยนต์:',
    trayHintTh: 'จัดเรียงบล็อกคำสั่งอัลกอริทึม',
    shelfLabelTh: 'กล่องบล็อกคำสั่ง & อัลกอริทึม',
    shelfBadgeTh: 'บล็อกคำสั่ง',
    tool1LabelTh: 'ตรวจลูปอัลกอริทึม',
    tool1LabelEn: 'Check Loop',
    tool2LabelTh: 'สวิตช์โอเวอร์คล็อก',
    tool2LabelEn: 'Overclock Core',
    actionButtonLabelTh: 'รันโปรแกรม RUN CODE!',
    actionButtonLabelEn: 'Run Algorithm!',
  },
  thai: {
    id: 'thai',
    nameTh: 'ภาษาไทย & วรรณศิลป์',
    nameEn: 'Thai Wisdom',
    icon: Scroll,
    accentColor: '#eab308',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    stageTitleTh: 'ศาลากวีไทย & ปริศนาโบราณ',
    stageTitleEn: 'Thai Wisdom Vault',
    avatarTitleTh: 'กวีเอกแห่งสยาม',
    avatarTitleEn: 'Poet Laureate',
    trayLabelTh: 'บนแท่นศิลาจารึก:',
    trayHintTh: 'เลือกศิลาสำนวนและคำคล้องจอง',
    shelfLabelTh: 'คลังศิลาสำนวน & ถ้อยคำภูมิปัญญา',
    shelfBadgeTh: 'สำนวนไทย',
    tool1LabelTh: 'สลักถอดรหัสจารึก',
    tool1LabelEn: 'Decode Inscription',
    tool2LabelTh: 'จุดประทีปนำทาง',
    tool2LabelEn: 'Light Wisdom Lamp',
    actionButtonLabelTh: 'ปลดล็อกประตูกลสมบัติ',
    actionButtonLabelEn: 'Unlock Vault',
  },
  social: {
    id: 'social',
    nameTh: 'สังคม & แผนที่โลก',
    nameEn: 'Social Studies',
    icon: Globe,
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    stageTitleTh: 'หอนักสำรวจ & แผนที่อารยธรรม',
    stageTitleEn: 'Cartography Hall',
    avatarTitleTh: 'นักสำรวจอารยธรรม',
    avatarTitleEn: 'World Explorer',
    trayLabelTh: 'บนโต๊ะสำรวจหลักฐาน:',
    trayHintTh: 'เลือกหลักฐานประวัติศาสตร์และพิกัด',
    shelfLabelTh: 'คลังหลักฐานประวัติศาสตร์ & พิกัดแผนที่',
    shelfBadgeTh: 'หลักฐานสำรวจ',
    tool1LabelTh: 'ตรวจสอบหลักฐาน',
    tool1LabelEn: 'Inspect Artifact',
    tool2LabelTh: 'ปรับพิกัดเข็มทิศ',
    tool2LabelEn: 'Calibrate Compass',
    actionButtonLabelTh: 'บันทึกการค้นพบ EXPEDITION',
    actionButtonLabelEn: 'Log Discovery',
  },
};

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
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('eduverse_completed_lab_quests') : null;
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Smooth Zoom state: min 0.7x to max 1.4x
  const [labZoom, setLabZoom] = useState<number>(1.0);

  // Quest Story Pop-up Modal State
  const [showQuestModal, setShowQuestModal] = useState(false);

  // Teacher Custom Lab Creator Modal State
  const [showTeacherBuilder, setShowTeacherBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState<0 | 1>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<LabSubjectCategory>('chemistry');
  const [newConcept, setNewConcept] = useState('');
  const [newScenario, setNewScenario] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  // Selected Quest & Subject
  const activeQuest = quests.find(q => q.id === selectedQuestId) || quests[0];
  const subjectQuests = quests.filter(q => q.subject === activeSubject);
  const activeConfig = SUBJECT_CONFIGS[activeSubject] || SUBJECT_CONFIGS.chemistry;

  // Bubbling / Sparkle animation on reacting
  useEffect(() => {
    if (reactionState === 'reacting' || reactionState === 'success') {
      const bArray = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: 20 + Math.random() * 60,
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

  // Add reagent to tray
  const handleAddItemToBeaker = (item: LabChemicalItem) => {
    if (reactionState === 'success' || reactionState === 'exploded') return;
    if (beakerItems.some(i => i.id === item.id)) return;

    triggerSound(playPourSound);
    setReactionState('pouring');
    setTimeout(() => {
      setBeakerItems(prev => [...prev, item]);
      setReactionState('idle');
      triggerSound(playBubbleSound);
    }, 250);
  };

  // Remove item from tray
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
      setReactionMessage(
        lang === 'th' 
          ? `กรุณาเลือกรายการจากคลังเข้าสู่${activeConfig.trayLabelTh.replace(':', '')}ก่อนเริ่มการทดสอบ`
          : 'Please add items to the stage first.'
      );
      return;
    }

    setReactionState('reacting');
    triggerSound(activeSubject === 'computer' || activeSubject === 'math' ? playSparkSound : playBubbleSound);

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
          ? (activeQuest.successMessageTh || activeQuest.successDescTh || 'การทดสอบสำเร็จสมบูรณ์แบบ!')
          : (activeQuest.successMessageEn || activeQuest.successDescEn || 'Mission accomplished!');
        setReactionMessage(`🎉 ${successMsg}`);
        triggerSound(playSuccessSound);

        if (!completedQuestIds.includes(activeQuest.id)) {
          const nextCompleted = [...completedQuestIds, activeQuest.id];
          setCompletedQuestIds(nextCompleted);
          try {
            localStorage.setItem('eduverse_completed_lab_quests', JSON.stringify(nextCompleted));
          } catch {}
          if (onEarnRewards) {
            onEarnRewards('student', activeQuest.expReward, activeQuest.gemReward, true);
          }
        }
      } else {
        // Failure / Comic Explosion
        setReactionState('exploded');
        triggerSound(playExplosionSound);

        let failDetail = '';
        if (!itemsMatch) {
          if (activeSubject === 'chemistry') {
            failDetail = 'อัตราส่วนสารเคมียังไม่สมดุลตามปฏิกิริยา!';
          } else if (activeSubject === 'math') {
            failDetail = 'คำนวณมุมยิงหรือสัดส่วนเชื้อเพลิงไม่ตรงกับความสูงวงโคจร!';
          } else if (activeSubject === 'english') {
            failDetail = 'เลือกคำกริยาหรือ Tense ไม่สอดคล้องกับประธาน!';
          } else if (activeSubject === 'computer') {
            failDetail = 'อัลกอริทึมเกิดบั๊กลูปไม่รู้จบ หรือคำสั่งหลุดพิกัด!';
          } else if (activeSubject === 'thai') {
            failDetail = 'เลือกสำนวนผิดบริบทความหมายของโจทย์!';
          } else if (activeSubject === 'social') {
            failDetail = 'เลือกหลักฐานทางประวัติศาสตร์หรือพิกัดเวลาไม่สอดคล้องกัน!';
          }
        } else if (requiresHeat && !isBurnerActive) {
          failDetail = `ลืมเปิดใช้งาน [${activeConfig.tool2LabelTh}]!`;
        } else if (requiresStir && !isStirred) {
          failDetail = `ลืมกด [${activeConfig.tool1LabelTh}] ให้เข้ากัน!`;
        }

        const defaultFailTitle = lang === 'th'
          ? `${activeQuest.failTitleTh || '💥 การทดสอบคลาดเคลื่อน!'} ${failDetail}`
          : `💥 Trial failed! ${failDetail}`;

        setReactionMessage(defaultFailTitle);
      }
    }, 1200);
  };

  // Fluid/Energy Color
  const getFluidColor = () => {
    if (reactionState === 'exploded') return '#1e293b';
    if (reactionState === 'success') return activeQuest.resultingColor || activeQuest.successProductColor || '#10b981';
    if (beakerItems.length === 0) return 'rgba(255,255,255,0.08)';
    const lastItem = beakerItems[beakerItems.length - 1];
    return lastItem.color || activeConfig.accentColor;
  };

  const liquidLevelPct = Math.min(100, beakerItems.length * 28 + (beakerItems.length > 0 ? 25 : 0));

  // Zoom helpers
  const handleZoomIn = () => {
    setLabZoom(prev => Math.min(1.4, Number((prev + 0.15).toFixed(2))));
  };
  const handleZoomOut = () => {
    setLabZoom(prev => Math.max(0.7, Number((prev - 0.15).toFixed(2))));
  };

  // Render bespoke character avatar
  const renderSubjectAvatar = () => {
    const isExploded = reactionState === 'exploded';
    const isSuccess = reactionState === 'success';

    return (
      <div className="flex flex-col items-center shrink-0">
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 shadow-sm transition-colors border ${
          isExploded ? 'bg-rose-950 text-rose-300 border-rose-500' :
          isSuccess ? 'bg-emerald-950 text-emerald-300 border-emerald-500' :
          reactionState === 'reacting' ? 'bg-amber-950 text-amber-300 border-amber-500' :
          'bg-slate-800 text-slate-300 border-slate-700'
        }`}>
          {isExploded ? '😱 ว๊ากกก!' :
           isSuccess ? '✨ สุดยอด!' :
           reactionState === 'reacting' ? '⚡ ประมวลผล...' : activeConfig.avatarTitleTh}
        </div>

        {/* 1. CHEMISTRY: Scientist in Lab Coat & Safety Goggles */}
        {activeSubject === 'chemistry' && (
          <svg width="72" height="96" viewBox="0 0 120 150" className="overflow-visible">
            {isExploded ? (
              <path d="M20 50 Q10 20 25 10 Q40 0 60 5 Q80 -5 95 12 Q115 25 100 55 Q115 50 110 65 Q95 70 95 55 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
            ) : (
              <path d="M30 45 Q25 25 40 15 Q60 10 80 15 Q95 25 90 45 Z" fill="#64748b" />
            )}
            <circle cx="60" cy="55" r="30" fill={isExploded ? '#475569' : '#fcd34d'} />
            <circle cx="48" cy="52" r="11" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="72" cy="52" r="11" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <line x1="59" y1="52" x2="61" y2="52" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="48" cy="52" r="4" fill="#0f172a" />
            <circle cx="72" cy="52" r="4" fill="#0f172a" />
            {isExploded ? (
              <ellipse cx="60" cy="72" rx="9" ry="6" fill="#0f172a" />
            ) : isSuccess ? (
              <path d="M50 68 Q60 80 70 68" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            ) : (
              <line x1="53" y1="70" x2="67" y2="70" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            )}
            <path d="M35 85 L85 85 L95 145 L25 145 Z" fill={isExploded ? '#94a3b8' : '#ffffff'} stroke="#cbd5e1" strokeWidth="2" />
            <polygon points="58,85 62,85 60,105" fill="#3b82f6" />
          </svg>
        )}

        {/* 2. MATH & PHYSICS: Astronaut */}
        {activeSubject === 'math' && (
          <svg width="72" height="96" viewBox="0 0 120 150" className="overflow-visible">
            <circle cx="60" cy="50" r="34" fill={isExploded ? '#334155' : '#e2e8f0'} stroke="#64748b" strokeWidth="3" />
            <ellipse cx="60" cy="50" rx="24" ry="18" fill={isExploded ? '#1e293b' : isSuccess ? '#38bdf8' : '#f59e0b'} opacity="0.9" />
            <path d="M48 40 Q60 36 72 40" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" />
            <path d="M30 82 L90 82 L98 145 L22 145 Z" fill={isExploded ? '#475569' : '#f8fafc'} stroke="#94a3b8" strokeWidth="2.5" />
            <circle cx="45" cy="98" r="6" fill="#3b82f6" />
            <rect x="65" y="94" width="16" height="8" rx="2" fill="#ef4444" />
            <line x1="60" y1="82" x2="60" y2="145" stroke="#cbd5e1" strokeWidth="2" />
          </svg>
        )}

        {/* 3. ENGLISH: Master Chef */}
        {activeSubject === 'english' && (
          <svg width="72" height="96" viewBox="0 0 120 150" className="overflow-visible">
            <path d="M40 38 C35 15, 85 15, 80 38 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
            <path d="M35 38 L85 38 L83 48 L37 48 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="60" cy="62" r="22" fill={isExploded ? '#64748b' : '#fcd34d'} />
            <circle cx="52" cy="59" r="3.5" fill="#0f172a" />
            <circle cx="68" cy="59" r="3.5" fill="#0f172a" />
            <path d="M46 68 Q56 64 60 68 Q64 64 74 68 Q60 74 46 68 Z" fill="#78350f" />
            <polygon points="56,76 64,76 60,88" fill="#dc2626" />
            <path d="M32 82 L88 82 L95 145 L25 145 Z" fill={isExploded ? '#475569' : '#ffffff'} stroke="#cbd5e1" strokeWidth="2.5" />
            <circle cx="52" cy="96" r="2.5" fill="#0f172a" />
            <circle cx="68" cy="96" r="2.5" fill="#0f172a" />
          </svg>
        )}

        {/* 4. CODING: Robo-Bit */}
        {activeSubject === 'computer' && (
          <svg width="72" height="96" viewBox="0 0 120 150" className="overflow-visible">
            <line x1="60" y1="20" x2="60" y2="40" stroke="#94a3b8" strokeWidth="3" />
            <circle cx="60" cy="18" r="6" fill={isExploded ? '#ef4444' : isSuccess ? '#10b981' : '#38bdf8'} className="animate-pulse" />
            <rect x="35" y="38" width="50" height="42" rx="8" fill={isExploded ? '#334155' : '#1e293b'} stroke="#6366f1" strokeWidth="3" />
            {isExploded ? (
              <g stroke="#ef4444" strokeWidth="2.5">
                <line x1="45" y1="52" x2="53" y2="60" />
                <line x1="53" y1="52" x2="45" y2="60" />
                <line x1="67" y1="52" x2="75" y2="60" />
                <line x1="75" y1="52" x2="67" y2="60" />
              </g>
            ) : isSuccess ? (
              <g fill="#10b981">
                <path d="M46 54 A3,3 0 0,0 52,54 A3,3 0 0,0 58,54 Q58,60 52,64 Q46,60 46,54 Z" fill="#ec4899" />
                <path d="M62 54 A3,3 0 0,0 68,54 A3,3 0 0,0 74,54 Q74,60 68,64 Q62,60 62,54 Z" fill="#ec4899" />
              </g>
            ) : (
              <g fill="#38bdf8">
                <rect x="46" y="52" width="10" height="8" rx="2" />
                <rect x="64" y="52" width="10" height="8" rx="2" />
              </g>
            )}
            <rect x="48" y="68" width="24" height="4" rx="2" fill={isSuccess ? '#10b981' : '#6366f1'} />
            <path d="M30 84 L90 84 L96 145 L24 145 Z" fill={isExploded ? '#1e293b' : '#312e81'} stroke="#818cf8" strokeWidth="2.5" />
            <circle cx="60" cy="110" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          </svg>
        )}

        {/* 5. THAI: Classical Poet */}
        {activeSubject === 'thai' && (
          <svg width="72" height="96" viewBox="0 0 120 150" className="overflow-visible">
            <polygon points="60,15 65,35 55,35" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="60" cy="38" r="8" fill="#ca8a04" />
            <circle cx="60" cy="58" r="23" fill={isExploded ? '#64748b' : '#fcd34d'} />
            <circle cx="52" cy="56" r="3.5" fill="#0f172a" />
            <circle cx="68" cy="56" r="3.5" fill="#0f172a" />
            {isExploded ? (
              <ellipse cx="60" cy="72" rx="7" ry="5" fill="#0f172a" />
            ) : isSuccess ? (
              <path d="M52 68 Q60 76 68 68" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <path d="M54 69 Q60 73 66 69" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            )}
            <path d="M32 84 L88 84 L96 145 L24 145 Z" fill={isExploded ? '#475569' : '#ca8a04'} stroke="#eab308" strokeWidth="2" />
            <polygon points="36,84 56,84 84,145 64,145" fill="#facc15" opacity="0.9" />
          </svg>
        )}

        {/* 6. SOCIAL: Explorer with Fedora */}
        {activeSubject === 'social' && (
          <svg width="72" height="96" viewBox="0 0 120 150" className="overflow-visible">
            <ellipse cx="60" cy="40" rx="38" ry="8" fill="#78350f" stroke="#451a03" strokeWidth="2" />
            <path d="M38 38 C38 18, 82 18, 82 38 Z" fill="#92400e" stroke="#78350f" strokeWidth="2" />
            <rect x="38" y="34" width="44" height="4" fill="#d97706" />
            <circle cx="60" cy="62" r="22" fill={isExploded ? '#64748b' : '#fcd34d'} />
            <circle cx="52" cy="60" r="3.5" fill="#0f172a" />
            <circle cx="68" cy="60" r="3.5" fill="#0f172a" />
            {isExploded ? (
              <line x1="52" y1="72" x2="68" y2="72" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            ) : (
              <path d="M52 68 Q60 76 68 68" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            )}
            <path d="M32 84 L88 84 L95 145 L25 145 Z" fill={isExploded ? '#475569' : '#b45309'} stroke="#78350f" strokeWidth="2" />
            <rect x="38" y="94" width="16" height="16" rx="3" fill="#78350f" />
            <rect x="66" y="94" width="16" height="16" rx="3" fill="#78350f" />
          </svg>
        )}
      </div>
    );
  };

  // Render bespoke subject apparatus stage
  const renderSubjectApparatus = () => {
    return (
      <div className="flex flex-col items-center relative shrink-0">
        {/* CHEMISTRY */}
        {activeSubject === 'chemistry' && (
          <div className="relative w-32 h-40 flex items-center justify-center">
            {beakerItems.length > 0 && reactionState !== 'exploded' && (
              <div className="absolute -top-6 flex gap-1 pointer-events-none">
                <div className="w-1.5 h-4 rounded-full bg-cyan-300/40 blur-2xs animate-pulse" />
                <div className="w-2 h-6 rounded-full bg-blue-300/40 blur-2xs animate-bounce" />
              </div>
            )}

            <svg width="120" height="150" viewBox="0 0 180 230">
              <defs>
                <clipPath id="flaskClipSubjectClean">
                  <polygon points="76,40 104,40 104,80 156,195 24,195 76,80" />
                </clipPath>
              </defs>

              <g clipPath="url(#flaskClipSubjectClean)">
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
                  <ellipse cx="90" cy={200 - liquidLevelPct * 1.3} rx="30" ry="7" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.6" className="animate-spin" />
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

            {isBurnerActive && (
              <div className="absolute -bottom-2 flex flex-col items-center">
                <div className="w-5 h-7 bg-gradient-to-t from-amber-500 via-orange-400 to-yellow-200 rounded-full animate-bounce blur-2xs" />
              </div>
            )}
          </div>
        )}

        {/* MATH & PHYSICS */}
        {activeSubject === 'math' && (
          <div className="relative w-36 h-40 flex items-center justify-center">
            <svg width="130" height="155" viewBox="0 0 180 230">
              <line x1="30" y1="20" x2="30" y2="210" stroke="#475569" strokeWidth="3" />
              <line x1="30" y1="50" x2="55" y2="50" stroke="#64748b" strokeWidth="2" />
              <line x1="30" y1="90" x2="55" y2="90" stroke="#64748b" strokeWidth="2" />
              <line x1="30" y1="130" x2="55" y2="130" stroke="#64748b" strokeWidth="2" />
              <line x1="30" y1="170" x2="55" y2="170" stroke="#64748b" strokeWidth="2" />

              {isStirred && (
                <g opacity="0.8">
                  <path d="M85 200 Q130 140 170 110" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 3" />
                  <text x="110" y="150" fill="#38bdf8" fontSize="11" fontWeight="bold">θ = 45°</text>
                </g>
              )}

              <g className={`transition-transform duration-300 ${isBurnerActive ? 'translate-y-[-6px]' : ''}`}>
                <polygon points="90,30 108,70 72,70" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
                <rect x="72" y="70" width="36" height="100" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="90" cy="90" r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                <polygon points="72,140 50,175 72,170" fill="#f97316" />
                <polygon points="108,140 130,175 108,170" fill="#f97316" />
                <rect
                  x="76"
                  y={165 - liquidLevelPct * 0.65}
                  width="28"
                  height={liquidLevelPct * 0.65}
                  fill={getFluidColor()}
                  opacity="0.8"
                  rx="2"
                />
              </g>

              {isBurnerActive && (
                <g>
                  <polygon points="82,172 90,215 98,172" fill="#f59e0b" className="animate-pulse" />
                  <polygon points="86,172 90,198 94,172" fill="#ffffff" />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* ENGLISH */}
        {activeSubject === 'english' && (
          <div className="relative w-36 h-40 flex items-center justify-center">
            <svg width="130" height="155" viewBox="0 0 180 230">
              {beakerItems.length > 0 && reactionState !== 'exploded' && (
                <g stroke="#10b981" strokeWidth="2" fill="none" opacity="0.7">
                  <path d="M75 60 Q65 45 75 30" className="animate-pulse" />
                  <path d="M90 65 Q100 48 90 32" className="animate-bounce" />
                  <path d="M105 60 Q95 45 105 28" className="animate-pulse" />
                </g>
              )}

              <path d="M30 115 C15 115, 15 145, 30 145" fill="none" stroke="#d97706" strokeWidth="4" />
              <path d="M150 115 C165 115, 165 145, 150 145" fill="none" stroke="#d97706" strokeWidth="4" />
              <ellipse cx="90" cy="110" rx="58" ry="14" fill="#451a03" stroke="#b45309" strokeWidth="3" />
              <path d="M32 110 C32 175, 148 175, 148 110 Z" fill="#78350f" stroke="#b45309" strokeWidth="3" />

              <ellipse
                cx="90"
                cy={150 - liquidLevelPct * 0.35}
                rx="48"
                ry="12"
                fill={getFluidColor()}
                opacity="0.9"
              />

              {isStirred && (
                <g className="animate-spin" style={{ transformOrigin: '90px 125px' }}>
                  <line x1="90" y1="70" x2="90" y2="125" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
                  <ellipse cx="90" cy="125" rx="8" ry="5" fill="#94a3b8" />
                </g>
              )}

              {isBurnerActive && (
                <g>
                  <ellipse cx="90" cy="178" rx="35" ry="6" fill="#f59e0b" opacity="0.8" className="animate-pulse" />
                  <polygon points="65,178 72,168 80,178" fill="#ef4444" />
                  <polygon points="85,178 90,165 95,178" fill="#eab308" />
                  <polygon points="100,178 108,168 115,178" fill="#ef4444" />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* CODING */}
        {activeSubject === 'computer' && (
          <div className="relative w-36 h-40 flex items-center justify-center">
            <svg width="135" height="155" viewBox="0 0 190 220">
              <rect x="25" y="45" width="140" height="140" rx="10" fill="#0f172a" stroke="#6366f1" strokeWidth="3" />
              <g stroke="#4338ca" strokeWidth="1.5" fill="none">
                <path d="M40 60 L70 60 L70 90 L120 90" />
                <path d="M150 70 L130 70 L130 110" />
                <path d="M40 160 L80 160 L80 130" />
                <path d="M150 160 L110 160" />
              </g>

              <rect x="65" y="85" width="60" height="60" rx="6" fill={getFluidColor()} stroke="#818cf8" strokeWidth="2.5" opacity="0.9" />
              <text x="95" y="120" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black" fontFamily="monospace">
                CPU {isBurnerActive ? '4.8G' : '2.4G'}
              </text>

              <g>
                {[0, 1, 2, 3].map((slotIdx) => {
                  const hasItem = beakerItems.length > slotIdx;
                  return (
                    <rect
                      key={slotIdx}
                      x={38 + slotIdx * 30}
                      y="152"
                      width="24"
                      height="12"
                      rx="2"
                      fill={hasItem ? '#10b981' : '#1e293b'}
                      stroke={hasItem ? '#34d399' : '#475569'}
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>

              {isBurnerActive && (
                <g stroke="#38bdf8" strokeWidth="2" fill="none" className="animate-pulse">
                  <path d="M55 75 L62 82 L58 86 L66 94" />
                  <path d="M135 75 L128 82 L132 86 L124 94" />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* THAI */}
        {activeSubject === 'thai' && (
          <div className="relative w-36 h-40 flex items-center justify-center">
            <svg width="130" height="155" viewBox="0 0 180 230">
              <ellipse cx="90" cy="185" rx="55" ry="14" fill="#ca8a04" stroke="#eab308" strokeWidth="2.5" />
              <path
                d="M50 180 L50 70 C50 35, 130 35, 130 70 L130 180 Z"
                fill="#1e293b"
                stroke="#eab308"
                strokeWidth="3"
              />
              <g stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" opacity="0.8">
                <line x1="68" y1="80" x2="112" y2="80" />
                <line x1="64" y1="96" x2="116" y2="96" />
                <line x1="68" y1="112" x2="112" y2="112" />
                <line x1="64" y1="128" x2="116" y2="128" />
              </g>

              <circle cx="90" cy="150" r="10" fill={getFluidColor()} stroke="#eab308" strokeWidth="2" />

              {isBurnerActive && (
                <g className="animate-pulse">
                  <polygon points="86,30 90,12 94,30" fill="#f59e0b" />
                  <circle cx="90" cy="22" r="12" fill="#facc15" opacity="0.4" className="animate-ping" />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* SOCIAL */}
        {activeSubject === 'social' && (
          <div className="relative w-36 h-40 flex items-center justify-center">
            <svg width="135" height="155" viewBox="0 0 180 230">
              <ellipse cx="90" cy="190" rx="45" ry="10" fill="#451a03" stroke="#92400e" strokeWidth="2" />
              <line x1="90" y1="155" x2="90" y2="190" stroke="#b45309" strokeWidth="5" />
              <path d="M40 95 A55 55 0 0 0 140 95" fill="none" stroke="#d97706" strokeWidth="4" />
              <circle cx="90" cy="95" r="42" fill="#0284c7" stroke="#0369a1" strokeWidth="2.5" />
              <path
                d="M75 75 Q85 70 95 80 Q105 90 90 105 Q80 115 75 100 Z"
                fill="#10b981"
                opacity="0.8"
              />
              <path
                d="M105 85 Q115 95 120 110 Q110 115 102 100 Z"
                fill="#10b981"
                opacity="0.8"
              />
              <ellipse cx="90" cy="95" rx="20" ry="42" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
              <line x1="48" y1="95" x2="132" y2="95" stroke="#ffffff" strokeWidth="1" opacity="0.4" />

              {isBurnerActive && (
                <g className="animate-spin" style={{ transformOrigin: '90px 95px' }}>
                  <polygon points="90,65 94,95 90,92 86,95" fill="#ef4444" />
                  <polygon points="90,125 94,95 90,98 86,95" fill="#e2e8f0" />
                </g>
              )}
            </svg>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER BAR: Compact, Single-line, No Multi-line Wrapping */}
      {/* ========================================================= */}
      <header className="shrink-0 h-12 px-3 sm:px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 z-20">
        
        {/* Left: Compact Exit Button & Title Badge */}
        <div className="flex items-center gap-2 min-w-0">
          {onBackToGames && (
            <button
              type="button"
              onClick={onBackToGames}
              className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer active:scale-95"
              title="ออกจากเวิร์กช็อป กลับสู่หน้าหลัก"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>ออก</span>
            </button>
          )}

          <div className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 ${activeConfig.badgeBg}`}>
            <activeConfig.icon className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span className="font-extrabold whitespace-nowrap">{activeConfig.stageTitleTh}</span>
          </div>
        </div>

        {/* Right: Progress Tracker, Sound Toggle, Zoom & Teacher Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Progress Tracker Pill */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-300 text-[11px] hidden xs:inline">ผ่าน:</span>
            <span className="font-bold text-amber-300 font-mono text-xs">{completedQuestIds.length}/{quests.length}</span>
          </div>

          {/* Zoom Buttons (Hidden on smallest mobile to prevent crowding) */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 hover:text-white text-xs cursor-pointer"
              title="ย่อขนาด"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-200 font-bold">
              {Math.round(labZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-slate-700 text-slate-200 hover:text-white text-xs cursor-pointer"
              title="ขยายขนาด"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition shrink-0 cursor-pointer"
            title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-300" />}
          </button>

          {/* Teacher Custom Quest Creator */}
          {(currentUserRole === 'teacher' || currentUserRole === 'admin') && (
            <button
              type="button"
              onClick={() => {
                setBuilderStep(0);
                setNewSubject(activeSubject);
                setShowTeacherBuilder(true);
              }}
              className="hidden md:flex items-center gap-1 h-8 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>สร้างโจทย์</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. SECONDARY SUB-NAV: Dedicated Horizontal Subject Tabs */}
      {/* ========================================================= */}
      <nav className="shrink-0 bg-slate-950 border-b border-slate-800/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-10">
        {(Object.keys(SUBJECT_CONFIGS) as LabSubjectCategory[]).map(subjKey => {
          const cfg = SUBJECT_CONFIGS[subjKey];
          const Icon = cfg.icon;
          const isActive = activeSubject === subjKey;

          return (
            <button
              key={subjKey}
              type="button"
              onClick={() => {
                setActiveSubject(subjKey);
                const firstQuest = quests.find(q => q.subject === subjKey);
                if (firstQuest) setSelectedQuestId(firstQuest.id);
                handleResetLab();
              }}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cfg.nameTh}</span>
            </button>
          );
        })}
      </nav>

      {/* ========================================================= */}
      {/* 3. MAIN WORKSPACE: Standard Flow, No Text Collisions, Smooth Scroll */}
      {/* ========================================================= */}
      <main className="flex-1 min-h-0 w-full p-2.5 sm:p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pb-6">
          
          {/* ========================================================= */}
          {/* ZONE 1: APPARATUS STAGE, TOOLS & FEEDBACK (Left 6 cols) */}
          {/* ========================================================= */}
          <section className="md:col-span-6 flex flex-col gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-3 sm:p-4 shadow-xl">
            
            {/* Top of stage: Items currently on stage */}
            <div className="pb-2 border-b border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span>{activeConfig.trayLabelTh}</span>
                </span>
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>+{activeQuest.expReward} EXP</span>
                </span>
              </div>

              {/* Items chips */}
              <div className="min-h-7 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {beakerItems.length === 0 ? (
                  <span className="text-[11px] text-slate-300 italic">
                    ยังไม่มีรายการ — แตะเลือกจากคลังด้านล่าง
                  </span>
                ) : (
                  beakerItems.map(item => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-cyan-200 shrink-0 shadow-xs"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-white/20" style={{ backgroundColor: item.color }} />
                      <span className="font-mono text-[11px]">{item.formula}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-400 hover:text-rose-200 ml-0.5 cursor-pointer text-xs font-black p-0.5"
                        title="ลบออก"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Visual Stage Container: Frame with Balanced Height */}
            <div className="w-full h-44 sm:h-52 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-end justify-center relative overflow-hidden py-2 px-4 shadow-inner">
              
              {/* Comic Failure/Explosion Overlay */}
              {reactionState === 'exploded' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none bg-slate-950/80 animate-in zoom-in-75 duration-200 p-2">
                  <div className="text-3xl sm:text-4xl font-black text-rose-500 tracking-wider font-mono animate-bounce drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                    💥 BOOM!!
                  </div>
                  <div className="text-amber-300 font-bold text-xs mt-1 text-center bg-slate-900/90 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                    {activeQuest.failTitleTh || 'การทดสอบคลาดเคลื่อน!'}
                  </div>
                </div>
              )}

              {/* Success Celebration Overlay */}
              {reactionState === 'success' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none bg-slate-950/80 animate-in zoom-in-75 duration-300 p-2">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-wide text-center animate-pulse drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">
                    ✨ สำเร็จสมบูรณ์แบบ!
                  </div>
                  <div className="text-cyan-200 font-bold text-xs mt-1 text-center bg-slate-900/90 px-2.5 py-0.5 rounded-md border border-cyan-500/30">
                    {activeQuest.successTitleTh || 'ภารกิจสำเร็จ!'}
                  </div>
                </div>
              )}

              {/* Scalable Stage Actors */}
              <div 
                style={{ transform: `scale(${labZoom})`, transformOrigin: 'bottom center' }}
                className="flex items-end justify-center gap-4 transition-transform duration-200"
              >
                {renderSubjectAvatar()}
                {renderSubjectApparatus()}
              </div>
            </div>

            {/* Controls & Action Row - Slim Inline Controls */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Tool 1 (Stir / Angle / Blend / Loop / Inscribe / Inspect) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsStirred(!isStirred);
                      triggerSound(playBubbleSound);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isStirred 
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title={activeConfig.tool1LabelTh}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isStirred ? 'animate-spin' : ''}`} />
                    <span>{activeConfig.tool1LabelTh}</span>
                  </button>

                  {/* Tool 2 (Burner / Thruster / Simmer / Overclock / Lamp / Compass) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsBurnerActive(!isBurnerActive);
                      triggerSound(playSparkSound);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isBurnerActive 
                        ? 'bg-amber-600 text-white border-amber-400 shadow-xs animate-pulse' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title={activeConfig.tool2LabelTh}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeConfig.tool2LabelTh}</span>
                  </button>

                  {/* Reset Button */}
                  <button
                    type="button"
                    onClick={handleResetLab}
                    className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-200 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 transition flex items-center justify-center cursor-pointer shrink-0 text-xs"
                    title="ล้างแท่นทดลอง"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1">ล้าง</span>
                  </button>
                </div>

                {/* Main Action Button */}
                <button
                  type="button"
                  disabled={reactionState === 'reacting'}
                  onClick={handleAnalyzeReaction}
                  className="flex-1 min-w-[130px] h-8 px-3 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                  <span className="truncate">
                    {reactionState === 'reacting'
                      ? 'กำลังประมวลผล...'
                      : activeConfig.actionButtonLabelTh}
                  </span>
                </button>
              </div>

              {/* Reaction Feedback Box */}
              {reactionMessage && (
                <div className={`p-2.5 rounded-xl text-xs border leading-relaxed animate-in fade-in duration-200 shadow-md ${
                  reactionState === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100'
                    : reactionState === 'exploded'
                    ? 'bg-rose-950/90 border-rose-500 text-rose-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}>
                  <div className="font-bold flex items-center gap-1.5 mb-0.5 text-xs">
                    {reactionState === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {reactionState === 'exploded' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{reactionMessage}</span>
                  </div>
                  {(reactionState === 'success' || reactionState === 'exploded') && (
                    <p className="text-[11px] text-slate-200 mt-1 pl-5">
                      💡 <strong className="text-white">สาระองค์ความรู้:</strong> {activeQuest.scientificExplanationTh}
                    </p>
                  )}
                </div>
              )}
            </div>

          </section>

          {/* ========================================================= */}
          {/* ZONE 2: QUEST MISSION & SUBJECT ITEM SHELF (Right 6 cols) */}
          {/* ========================================================= */}
          <section className="md:col-span-6 flex flex-col gap-2.5 rounded-2xl bg-slate-900 border border-slate-800 p-3 sm:p-4 shadow-xl">
            
            {/* Space-Saving Mission HUD with Pop-up Story Modal Trigger */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs truncate">{activeQuest.titleTh}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 shrink-0">
                      {activeQuest.gradeLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    <strong className="text-amber-300">เป้าหมาย:</strong> {activeQuest.targetGoalTh}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQuestModal(true)}
                className="shrink-0 h-7 px-2.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold border border-blue-400/40 flex items-center gap-1 cursor-pointer transition active:scale-95 whitespace-nowrap shadow-xs"
                title="กดดูโจทย์และคำอธิบายฉบับเต็ม"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>ดูโจทย์เต็ม</span>
              </button>
            </div>

            {/* Item Shelf Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Atom className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{activeConfig.shelfLabelTh}</span>
                </span>
                <span className="text-[11px] text-slate-300">{activeConfig.trayHintTh}</span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeQuest.availableItems.map(item => {
                  const isSelected = beakerItems.some(i => i.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSelected || reactionState === 'reacting'}
                      onClick={() => handleAddItemToBeaker(item)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                          : 'bg-slate-800 hover:bg-slate-700 hover:border-blue-400 border-slate-700 active:scale-95 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-4 h-4 rounded-full shrink-0 border border-white/30 shadow-xs" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold text-white truncate">
                            {item.formula}
                          </div>
                          <div className="text-[11px] text-slate-300 truncate mt-0.5">
                            {item.nameTh}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap ${
                        isSelected 
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      }`}>
                        {isSelected ? '✓ ในแท่นแล้ว' : '+ เลือก'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quest Pagination Switcher */}
            {subjectQuests.length > 1 && (
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>สลับโจทย์ในหมวดนี้:</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {subjectQuests.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuestId(q.id);
                        handleResetLab();
                      }}
                      className={`h-7 px-3 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                        q.id === activeQuest.id
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white'
                      }`}
                    >
                      {completedQuestIds.includes(q.id) ? '✓ ' : ''}ข้อ {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </section>

        </div>
      </main>

      {/* ========================================================= */}
      {/* TEACHER CUSTOM LAB BUILDER MODAL */}
      {/* ========================================================= */}
      {showTeacherBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 text-white space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>สร้างโจทย์จำลองใหม่ (ครูผู้สอน)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTeacherBuilder(false)}
                className="text-slate-300 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {builderStep === 0 && (
                <>
                  <div>
                    <label className="font-bold text-slate-300">กลุ่มสาระการเรียนรู้:</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value as LabSubjectCategory)}
                      className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    >
                      {(Object.keys(SUBJECT_CONFIGS) as LabSubjectCategory[]).map(key => (
                        <option key={key} value={key}>
                          {SUBJECT_CONFIGS[key].nameTh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300">ชื่อโจทย์ / ภารกิจ:</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="เช่น การสังเคราะห์ด้วยแสง หรือ กฎข้อที่ 1 ของนิวตัน"
                      className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300">สถานการณ์ / เนื้อเรื่องนำเข้าสู่บทเรียน:</label>
                    <textarea
                      value={newScenario}
                      onChange={(e) => setNewScenario(e.target.value)}
                      rows={2}
                      placeholder="อธิบายสถานการณ์จำลองที่นักเรียนต้องแก้ปัญหา"
                      className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </>
              )}

              {builderStep === 1 && (
                <>
                  <div>
                    <label className="font-bold text-slate-300">เป้าหมาย/คำถามสำหรับนักเรียน:</label>
                    <input
                      type="text"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="เช่น เลือก 3 องค์ประกอบที่ถูกต้องเพื่อให้ระบบทำงานสมบูรณ์"
                      className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300">สาระความรู้ / เฉลยทางวิชาการเมื่อนักเรียนทำสำเร็จ:</label>
                    <textarea
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      rows={3}
                      placeholder="อธิบายทฤษฎีหรือหลักการเบื้องหลังคำตอบที่ถูกต้อง"
                      className="w-full mt-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-300">ขั้นตอน {builderStep + 1} / 2</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => builderStep === 1 ? setBuilderStep(0) : setShowTeacherBuilder(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    {builderStep === 1 ? 'ย้อนกลับ' : 'ยกเลิก'}
                  </button>

                  {builderStep === 0 ? (
                    <button 
                      type="button" 
                      onClick={() => setBuilderStep(1)} 
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                    >
                      ถัดไป
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const subjectTemplate = quests.find(q => q.subject === newSubject) || activeQuest;
                        const subjectItems = subjectTemplate.availableItems;
                        const customQuest: LabSimulationQuest = {
                          id: `custom-${Date.now()}`,
                          subject: newSubject,
                          titleTh: newTitle,
                          titleEn: newTitle,
                          conceptTh: newConcept || 'โจทย์การเรียนรู้สร้างสรรค์โดยอาจารย์',
                          conceptEn: 'Teacher Custom Workshop',
                          gradeLevel: 'ม.1 - ม.6',
                          difficulty: 'medium',
                          scenarioTh: newScenario || newTitle,
                          scenarioEn: newScenario || newTitle,
                          targetGoalTh: newGoal || 'เลือกองค์ประกอบที่ถูกต้อง',
                          goalTh: newGoal || 'เลือกองค์ประกอบที่ถูกต้อง',
                          goalEn: newGoal || 'Select correct items',
                          availableItems: subjectItems,
                          correctItemIds: [subjectItems[0]?.id || 'chem-hcl'],
                          requiredTool: 'none',
                          resultingColor: SUBJECT_CONFIGS[newSubject]?.accentColor || '#06b6d4',
                          successProductColor: SUBJECT_CONFIGS[newSubject]?.accentColor || '#06b6d4',
                          successTitleTh: 'ภารกิจสำเร็จสมบูรณ์แบบ!',
                          successMessageTh: 'ภารกิจสำเร็จสมบูรณ์แบบ!',
                          successMessageEn: 'Mission completed successfully!',
                          successDescTh: 'เชื่อมโยงองค์ความรู้ได้ถูกต้องตรงตามมาตรฐานการเรียนรู้',
                          successDescEn: 'Completed learning objectives',
                          successAnimation: newSubject === 'math' ? 'rocket_orbit' : newSubject === 'english' ? 'gourmet_dish' : newSubject === 'computer' ? 'robot_dance' : newSubject === 'thai' ? 'lotus_aura' : newSubject === 'social' ? 'world_discovery' : 'bubbling_glow',
                          failTitleTh: 'ยังไม่ตรงตามเป้าหมายการเรียนรู้',
                          failDescTh: 'ลองทบทวนหลักการและเลือกองค์ประกอบใหม่อีกครั้ง',
                          failDescEn: 'Please review and try again',
                          failAnimation: newSubject === 'math' ? 'rocket_crash' : newSubject === 'english' ? 'burnt_food' : newSubject === 'computer' ? 'short_circuit' : newSubject === 'thai' ? 'banana_slip' : newSubject === 'social' ? 'lost_explorer' : 'lab_explosion',
                          scientificExplanationTh: newExplanation || 'การเรียนรู้ผ่านการทดลองช่วยสร้างความเข้าใจที่คงทน',
                          expReward: 200,
                          gemReward: 30,
                          createdByTeacherName: currentUserName,
                        };
                        setQuests(prev => [customQuest, ...prev]);
                        setActiveSubject(newSubject);
                        setSelectedQuestId(customQuest.id);
                        setShowTeacherBuilder(false);
                        setBuilderStep(0);
                      }}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                    >
                      บันทึกโจทย์
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUEST STORY & OBJECTIVES POP-UP MODAL (กดซ่อน/กดโชว์ ไม่ล้นจอ) */}
      {/* ========================================================= */}
      {showQuestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 text-white space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-300">
                  โจทย์ & เป้าหมายภารกิจ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestModal(false)}
                className="text-slate-200 hover:text-white text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                ✕ ซ่อน / ปิด
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
              {/* Title & Grade */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div>
                  <h4 className="font-extrabold text-sm text-white">{activeQuest.titleTh}</h4>
                  <p className="text-[11px] text-cyan-300 font-mono mt-0.5">{activeQuest.titleEn}</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 shrink-0">
                  {activeQuest.gradeLevel}
                </span>
              </div>

              {/* Goal */}
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 space-y-1">
                <div className="font-black text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>🎯</span>
                  <span>เป้าหมายภารกิจ (Mission Goal)</span>
                </div>
                <p className="text-white font-medium text-xs">
                  {activeQuest.targetGoalTh}
                </p>
              </div>

              {/* Story / Scenario */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-1.5">
                <div className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>สถานการณ์จำลอง (Scenario & Lore)</span>
                </div>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {activeQuest.scenarioTh}
                </p>
              </div>

              {/* Scientific / Learning Concept */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 space-y-1">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                  <span>💡</span>
                  <span>สาระการเรียนรู้ & เกร็ดความรู้</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {activeQuest.scientificExplanationTh}
                </p>
              </div>

              {/* Rewards info */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-[11px]">
                <span className="text-slate-300">รางวัลเมื่อผ่านการทดลอง:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>+{activeQuest.expReward} EXP • +{activeQuest.gemReward} Gems</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQuestModal(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                เข้าใจแล้ว เริ่มทดลองเลย!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
