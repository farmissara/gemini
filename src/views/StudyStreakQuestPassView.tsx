import React, { useEffect, useMemo, useState } from 'react';
import { 
  Flame, 
  Sparkles, 
  Gift, 
  Award, 
  CheckCircle2, 
  ShoppingBag, 
  Clock, 
  ChevronRight, 
  ArrowRight, 
  Calendar, 
  Zap, 
  Plus, 
  SlidersHorizontal,
  Coins,
  ShieldCheck,
  Star,
  X,
  FileCheck2,
  Armchair,
  HelpCircle,
  Music
} from 'lucide-react';
import { 
  ClassroomPerk, 
  SeasonPassTier, 
  DailyMicroQuest, 
  AppLanguage, 
  AuthUser,
  PlayerScore,
  UserRole 
} from '../types';
import { 
  INITIAL_CLASSROOM_PERKS, 
  INITIAL_SEASON_PASS_TIERS, 
  INITIAL_DAILY_MICRO_QUESTS 
} from '../data/innovativeFeaturesData';
import { PagedList } from '../components/PagedList';
import { getModuleTone } from '../lib/moduleTheme';
import { getLocalDateString } from '../lib/date';
import {
  CAMPUS_DATA_UPDATED_EVENT,
  loadStudyStreakPassState,
  saveStudyStreakPassState,
  type StudyStreakPassPersistence,
} from '../lib/campusDataStore';

interface StudyStreakQuestPassViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  schoolId?: string;
  currentUser?: AuthUser | null;
  playerScores?: PlayerScore[];
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
}

export const StudyStreakQuestPassView: React.FC<StudyStreakQuestPassViewProps> = ({
  lang = 'th',
  currentRole = 'student',
  currentUserName = 'นักเรียน',
  schoolId = 'default-school',
  currentUser,
  playerScores = [],
  onEarnRewards,
}) => {
  const userId = currentUser?.id || 'guest';
  const studentId = currentUser?.studentRecordId;
  const todayDateStr = getLocalDateString();
  const arcadeProfile = useMemo(
    () => playerScores.find((p) => p.userId === currentUser?.id),
    [playerScores, currentUser?.id]
  );

  const initialPersisted = useMemo(
    () => (currentUser?.id ? loadStudyStreakPassState(schoolId, currentUser.id) : null),
    [schoolId, currentUser?.id]
  );

  const [streakCount, setStreakCount] = useState<number>(
    () => initialPersisted?.streakCount ?? arcadeProfile?.dailyStreak ?? 0
  );
  const [hasCompletedDaily, setHasCompletedDaily] = useState<boolean>(
    () => initialPersisted?.lastQuestDate === todayDateStr
  );
  const [tokens, setTokens] = useState<number>(
    () => initialPersisted?.bonusTokens ?? arcadeProfile?.gems ?? 0
  );
  const [currentXp, setCurrentXp] = useState<number>(
    () => Math.max(initialPersisted?.bonusXp ?? 0, arcadeProfile?.exp ?? 0)
  );
  const [perks, setPerks] = useState<ClassroomPerk[]>(() => {
    const redeemedMap = initialPersisted?.redeemedPerkCounts || {};
    return INITIAL_CLASSROOM_PERKS.map((p) => {
      const used = redeemedMap[p.id] || 0;
      return {
        ...p,
        stock: Math.max(0, p.stock - used),
        redeemedCount: p.redeemedCount + used,
      };
    });
  });
  const [tiers, setTiers] = useState<SeasonPassTier[]>(() => {
    const claimedSet = new Set(initialPersisted?.claimedTierLevels || []);
    return INITIAL_SEASON_PASS_TIERS.map((t) => ({
      ...t,
      isClaimed: claimedSet.has(t.level),
    }));
  });
  const [dailyQuests] = useState<DailyMicroQuest[]>(INITIAL_DAILY_MICRO_QUESTS);

  const persistPassState = (overrides: Partial<StudyStreakPassPersistence>, nextPerks?: ClassroomPerk[], nextTiers?: SeasonPassTier[]) => {
    if (!currentUser?.id) return;
    const activePerks = nextPerks || perks;
    const activeTiers = nextTiers || tiers;
    const redeemedPerkCounts: Record<string, number> = {};
    for (const p of activePerks) {
      const base = INITIAL_CLASSROOM_PERKS.find((item) => item.id === p.id);
      const delta = base ? Math.max(0, p.redeemedCount - base.redeemedCount) : p.redeemedCount;
      if (delta > 0) redeemedPerkCounts[p.id] = delta;
    }
    const claimedTierLevels = activeTiers.filter((t) => t.isClaimed).map((t) => t.level);

    saveStudyStreakPassState(
      schoolId,
      userId,
      {
        streakCount: overrides.streakCount ?? streakCount,
        lastQuestDate: overrides.lastQuestDate ?? (hasCompletedDaily ? todayDateStr : ''),
        bonusTokens: overrides.bonusTokens ?? tokens,
        bonusXp: overrides.bonusXp ?? currentXp,
        claimedTierLevels: overrides.claimedTierLevels ?? claimedTierLevels,
        redeemedPerkCounts: overrides.redeemedPerkCounts ?? redeemedPerkCounts,
      },
      studentId
    );
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    const applyState = (saved: StudyStreakPassPersistence | null) => {
      if (!saved) return;
      setStreakCount(saved.streakCount);
      setHasCompletedDaily(saved.lastQuestDate === todayDateStr);
      setTokens(saved.bonusTokens);
      setCurrentXp((prev) => Math.max(prev, saved.bonusXp, arcadeProfile?.exp ?? 0));
      const claimedSet = new Set(saved.claimedTierLevels || []);
      setTiers(INITIAL_SEASON_PASS_TIERS.map((t) => ({ ...t, isClaimed: claimedSet.has(t.level) })));
      const redeemedMap = saved.redeemedPerkCounts || {};
      setPerks(
        INITIAL_CLASSROOM_PERKS.map((p) => {
          const used = redeemedMap[p.id] || 0;
          return { ...p, stock: Math.max(0, p.stock - used), redeemedCount: p.redeemedCount + used };
        })
      );
    };
    applyState(loadStudyStreakPassState(schoolId, currentUser.id));
    const onUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent<{ schoolId?: string }>).detail;
      if (!detail?.schoolId || detail.schoolId === schoolId) {
        applyState(loadStudyStreakPassState(schoolId, currentUser.id));
      }
    };
    window.addEventListener(CAMPUS_DATA_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CAMPUS_DATA_UPDATED_EVENT, onUpdated);
  }, [schoolId, currentUser?.id, todayDateStr, arcadeProfile?.exp]);

  // Active micro-quest
  const [activeTab, setActiveTab] = useState<'quest_pass' | 'perks_store'>('quest_pass');
  const [questPassStep, setQuestPassStep] = useState<'quest' | 'pass'>('quest');
  const [activeQuestIndex, setActiveQuestIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questResult, setQuestResult] = useState<{ isCorrect: boolean; feedback: string } | null>(null);

  // Perk redeem feedback modal
  const [redeemedPerkToast, setRedeemedPerkToast] = useState<string | null>(null);
  const [redeemErrorToast, setRedeemErrorToast] = useState<string | null>(null);

  // Teacher custom perk modal
  const [showAddPerkModal, setShowAddPerkModal] = useState<boolean>(false);
  const [newPerkTitle, setNewPerkTitle] = useState('');
  const [newPerkCost, setNewPerkCost] = useState(150);
  const [newPerkDesc, setNewPerkDesc] = useState('');

  // Handle answering daily quest
  const handleAnswerQuest = (optionIdx: number) => {
    setSelectedOption(optionIdx);
    const quest = dailyQuests[activeQuestIndex];
    const isCorrect = optionIdx === quest.correctIndex;

    if (isCorrect) {
      setQuestResult({
        isCorrect: true,
        feedback: lang === 'th' ? `ถูกต้องยอดเยี่ยม! ${quest.explanationTh}` : `Correct! ${quest.explanationTh}`
      });
      const nextTokens = tokens + quest.rewardTokens;
      const nextXp = currentXp + quest.rewardXp;
      const nextStreak = hasCompletedDaily ? streakCount : streakCount + 1;
      setTokens(nextTokens);
      setCurrentXp(nextXp);
      if (!hasCompletedDaily) {
        setHasCompletedDaily(true);
        setStreakCount(nextStreak);
      }
      persistPassState({
        streakCount: nextStreak,
        lastQuestDate: todayDateStr,
        bonusTokens: nextTokens,
        bonusXp: nextXp,
      });
      if (onEarnRewards && currentUser?.id) {
        onEarnRewards(currentUser.id, quest.rewardXp, Math.max(2, Math.round(quest.rewardTokens / 5)), true);
      }
    } else {
      setQuestResult({
        isCorrect: false,
        feedback: lang === 'th' ? `ยังไม่ถูกต้อง ลองอ่านคำอธิบาย: ${quest.explanationTh}` : `Incorrect. Note: ${quest.explanationTh}`
      });
    }
  };

  const handleNextQuest = () => {
    setSelectedOption(null);
    setQuestResult(null);
    if (activeQuestIndex < dailyQuests.length - 1) {
      setActiveQuestIndex(prev => prev + 1);
    } else {
      setActiveQuestIndex(0);
    }
  };

  // Redeem Perk
  const handleRedeemPerk = (perk: ClassroomPerk) => {
    setRedeemErrorToast(null);
    if (tokens < perk.costTokens) {
      setRedeemErrorToast(
        lang === 'th' ? 'เหรียญความรู้ไม่เพียงพอ ทำภารกิจรายวันเพื่อสะสมเหรียญเพิ่ม!' : 'Not enough Knowledge Tokens!'
      );
      setTimeout(() => setRedeemErrorToast(null), 4000);
      return;
    }
    if (perk.stock <= 0) {
      setRedeemErrorToast(lang === 'th' ? 'สิทธิ์นี้หมดชั่วคราว' : 'Out of stock!');
      setTimeout(() => setRedeemErrorToast(null), 4000);
      return;
    }

    const nextTokens = tokens - perk.costTokens;
    const nextPerks = perks.map(p => p.id === perk.id ? { ...p, stock: p.stock - 1, redeemedCount: p.redeemedCount + 1 } : p);
    setTokens(nextTokens);
    setPerks(nextPerks);
    persistPassState({ bonusTokens: nextTokens }, nextPerks, tiers);
    setRedeemedPerkToast(
      lang === 'th' 
        ? `${currentUserName} แลกรับ "${perk.titleTh}" สำเร็จแล้ว! แสดงการ์ดนี้ให้คุณครูประจำวิชาเพื่อใช้สิทธิ์` 
        : `Redeemed "${perk.titleEn}" successfully!`
    );
    setTimeout(() => setRedeemedPerkToast(null), 4000);
  };

  // Claim Season Pass Tier Reward
  const handleClaimTier = (level: number) => {
    const nextTiers = tiers.map(t => t.level === level ? { ...t, isClaimed: true } : t);
    const nextTokens = tokens + 50;
    setTiers(nextTiers);
    setTokens(nextTokens);
    persistPassState({ bonusTokens: nextTokens }, perks, nextTiers);
    if (onEarnRewards && currentUser?.id) {
      onEarnRewards(currentUser.id, 30, 10, true);
    }
  };

  // Teacher adds new classroom perk
  const handleCreatePerk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerkTitle.trim()) return;

    const newPerk: ClassroomPerk = {
      id: `perk-${Date.now()}`,
      titleTh: newPerkTitle,
      titleEn: newPerkTitle,
      costTokens: newPerkCost,
      category: 'homework_pass',
      descriptionTh: newPerkDesc || 'สิทธิพิเศษที่ครูกำหนดขึ้นเอง',
      stock: 20,
      iconName: 'Sparkles',
      redeemedCount: 0,
    };

    setPerks(prev => [newPerk, ...prev]);
    setShowAddPerkModal(false);
    setNewPerkTitle('');
    setNewPerkDesc('');
  };

  const getPerkIcon = (name: string) => {
    switch (name) {
      case 'FileCheck2': return <FileCheck2 className="w-5 h-5 text-emerald-500" />;
      case 'Armchair': return <Armchair className="w-5 h-5 text-indigo-500" />;
      case 'ShoppingBag': return <ShoppingBag className="w-5 h-5 text-amber-500" />;
      case 'HelpCircle': return <HelpCircle className="w-5 h-5 text-blue-500" />;
      case 'Music': return <Music className="w-5 h-5 text-purple-500" />;
      default: return <Gift className="w-5 h-5 text-rose-500" />;
    }
  };

  const currentDailyQuest = dailyQuests[activeQuestIndex];

  return (
    <div className={`h-full flex flex-col min-h-0 overflow-hidden space-y-3 ${getModuleTone('study_streak')}`}>
      {/* Toast Alert */}
      {redeemedPerkToast && (
        <div className="fixed top-16 right-6 z-50 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white shadow-lg border border-emerald-500/40 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium">{redeemedPerkToast}</p>
        </div>
      )}

      {/* Top Banner with Flame Streak & Knowledge Token HUD */}
      <div className="shrink-0 app-page-header p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 max-w-xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'ระบบสตรีคความต่อเนื่อง & ร้านค้าสิทธิพิเศษในห้องเรียน' : 'Daily Study Streak & Season Battle Pass'}</span>
              </p>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--color-text-title)]">
                <span>{lang === 'th' ? 'Daily Streak & Classroom Quest Pass' : 'Daily Study Streak Pass'}</span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
                {lang === 'th'
                  ? 'กระตุ้นพฤติกรรมรักการเรียนรู้ทุกวันด้วยภารกิจสั้น 3 นาที รักษาไฟสตรีค และนำเหรียญมาแลกสิทธิพิเศษจริง'
                  : 'Turn consistent learning into a habit with daily 3-minute micro-quests, flame streaks, and classroom perks.'}
              </p>
            </div>
          </div>

          {/* Player Stats Strip */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Streak Counter */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] px-3 py-2 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'สตรีคสะสม' : 'Streak'}</p>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-base font-bold text-[var(--color-text-title)]">{streakCount}</span>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">วัน</span>
                </div>
              </div>
            </div>

            {/* Tokens Balance */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] px-3 py-2 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'เหรียญความรู้' : 'Tokens'}</p>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-base font-bold text-[var(--color-text-title)]">{tokens}</span>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Coins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="shrink-0 seg-tab-group w-fit max-w-full">
        <button
          type="button"
          data-active={activeTab === 'quest_pass'}
          onClick={() => setActiveTab('quest_pass')}
          className="seg-tab-btn"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{lang === 'th' ? '1. เควสต์ประจำวัน & ซีซันพาส' : '1. Daily Quest & Pass'}</span>
        </button>

        <button
          type="button"
          data-active={activeTab === 'perks_store'}
          onClick={() => setActiveTab('perks_store')}
          className="seg-tab-btn"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{lang === 'th' ? '2. ร้านค้าสิทธิพิเศษห้องเรียน (Classroom Perks)' : '2. Perks Store'}</span>
        </button>
      </div>

      {/* Tab Panels Body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      {activeTab === 'quest_pass' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-3">
        <div className="lg:col-span-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuestPassStep('quest')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              questPassStep === 'quest'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] hover:border-indigo-400/50'
            }`}
          >
            {lang === 'th' ? 'ภารกิจรายวัน' : 'Daily Quest'}
          </button>
          <button
            type="button"
            onClick={() => setQuestPassStep('pass')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              questPassStep === 'pass'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] hover:border-indigo-400/50'
            }`}
          >
            {lang === 'th' ? 'ซีซันพาส' : 'Season Pass'}
          </button>
        </div>

        {/* Left Column: Daily 3-Minute Micro-Quest */}
        {questPassStep === 'quest' && <div className="lg:col-span-12 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? 'เควสต์ทบทวนประจำวัน 3 นาที (Daily Micro-Quest)' : 'Daily 3-Min Micro Quest'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                    {lang === 'th' ? `ข้อที่ ${activeQuestIndex + 1} จาก ${dailyQuests.length} ข้อ • วิชา: ${currentDailyQuest.subject}` : `Question ${activeQuestIndex + 1} of ${dailyQuests.length}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold tabular-nums shrink-0">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Coins className="w-3.5 h-3.5" />
                  +{currentDailyQuest.rewardTokens}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">+{currentDailyQuest.rewardXp} XP</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="mt-5 space-y-4 max-w-3xl">
              <div className="p-4 sm:p-5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] ring-1 ring-indigo-500/10 text-[var(--color-text-title)] font-semibold text-sm sm:text-base leading-relaxed">
                {currentDailyQuest.questionTh}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentDailyQuest.options.map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleAnswerQuest(optIdx)}
                      className={`w-full text-left p-3.5 sm:px-4 rounded-xl border transition-all flex items-center justify-between text-xs sm:text-sm font-medium cursor-pointer ${
                        isSelected
                          ? optIdx === currentDailyQuest.correctIndex
                            ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                            : 'bg-rose-600 text-white border-rose-600 font-semibold'
                          : selectedOption !== null && optIdx === currentDailyQuest.correctIndex
                          ? 'bg-emerald-500/10 dark:bg-emerald-950/60 border-emerald-500/50 text-emerald-800 dark:text-emerald-200 font-semibold'
                          : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-indigo-500/60 hover:bg-indigo-500/[0.04] text-[var(--color-text-title)]'
                      }`}
                    >
                      <span>{opt}</span>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Feedback Alert */}
              {questResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  questResult.isCorrect
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/50 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-500/10 dark:bg-rose-950/50 border-rose-500/30 text-rose-900 dark:text-rose-200'
                }`}>
                  <p className="font-semibold mb-1 inline-flex items-center gap-1.5">
                    {questResult.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>ถูกต้อง!</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>คำอธิบาย:</span>
                      </>
                    )}
                  </p>
                  <p className="text-[var(--color-text-body)]">{questResult.feedback}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quest Navigation Button */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-text-muted)] font-medium inline-flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 shrink-0 ${hasCompletedDaily ? 'text-emerald-500' : 'text-indigo-500'}`} />
              <span>
                {hasCompletedDaily ? (lang === 'th' ? 'รักษาสตรีคของวันนี้สำเร็จแล้ว' : 'Today\'s streak secured') : (lang === 'th' ? 'ทำถูก 1 ข้อเพื่อรักษาไฟสตรีค' : 'Answer correctly to keep streak alive')}
              </span>
            </span>

            {selectedOption !== null && (
              <button
                type="button"
                onClick={handleNextQuest}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{activeQuestIndex < dailyQuests.length - 1 ? (lang === 'th' ? 'ข้อถัดไป' : 'Next Question') : (lang === 'th' ? 'เริ่มใหม่' : 'Restart')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>}

        {/* Right Column: Season Battle Pass Progression */}
        {questPassStep === 'pass' && <div className="lg:col-span-12 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ซีซันพาสความรู้ (Season Quest Pass)' : 'Knowledge Season Pass'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ปลดล็อกรางวัลพิเศษตามเลเวล XP สะสม' : 'Unlock exclusive rewards as you earn XP'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:min-w-[200px]">
                <div className="flex-1 h-1.5 bg-[var(--color-card-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((currentXp / 1000) * 100))}%` }}
                  />
                </div>
                <span className="text-xs font-semibold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                  {currentXp} / 1,000 XP
                </span>
              </div>
            </div>

            {/* Pass Tiers List */}
            <div className="mt-4">
              <PagedList items={tiers} pageSize={2} renderItem={(tier) => {
                const canClaim = currentXp >= tier.requiredXp && !tier.isClaimed;
                const isPassed = currentXp >= tier.requiredXp;

                return (
                  <div
                    key={tier.level}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
                      tier.isClaimed
                        ? 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                        : canClaim
                        ? 'bg-indigo-500/[0.06] dark:bg-indigo-500/10 border-indigo-500/40'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs tabular-nums shrink-0 ${
                        isPassed
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]'
                      }`}>
                        Lv.{tier.level}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-semibold text-[var(--color-text-title)] flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate">{tier.freeRewardTh}</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                          {lang === 'th' ? `ต้องการ ${tier.requiredXp} XP` : `Requires ${tier.requiredXp} XP`}
                        </p>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="shrink-0">
                      {tier.isClaimed ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {lang === 'th' ? 'รับแล้ว' : 'Claimed'}
                        </span>
                      ) : canClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaimTier(tier.level)}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          {lang === 'th' ? 'กดรับรางวัล' : 'Claim'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">
                          {lang === 'th' ? 'ยังไม่ปลดล็อก' : 'Locked'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span>{lang === 'th' ? 'ฤดูกาลปัจจุบัน: Season 1 วิทยาการคำนวณ' : 'Current: Season 1 Tech & Sci'}</span>
            <span className="font-medium text-[var(--color-text-body)] tabular-nums">{lang === 'th' ? 'เหลือเวลาอีก 18 วัน' : '18 days left'}</span>
          </div>
        </div>}
      </div>
      )}

      {/* Classroom Perks Store Section */}
      {activeTab === 'perks_store' && (
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 space-y-5">
        {redeemErrorToast && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/60 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between gap-2">
            <span>{redeemErrorToast}</span>
            <button type="button" onClick={() => setRedeemErrorToast(null)} className="text-[11px] underline cursor-pointer">
              {lang === 'th' ? 'ปิด' : 'Close'}
            </button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'th' ? 'ร้านค้าสิทธิพิเศษในห้องเรียน (Classroom Perks Store)' : 'Classroom Perks Exchange'}</span>
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? 'นำเหรียญความรู้ที่ได้จากการทำภารกิจรายวันมาแลกสิทธิพิเศษจริงที่คุณครูอนุมัติ'
                : 'Exchange Knowledge Tokens for real tangible classroom privileges'}
            </p>
          </div>

          {/* Teacher Add Perk Button */}
          {(currentRole === 'teacher' || currentRole === 'admin') && (
            <button
              type="button"
              onClick={() => setShowAddPerkModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'ครูเพิ่มสิทธิ์ใหม่ในห้อง' : 'Add Classroom Perk'}</span>
            </button>
          )}
        </div>

        {/* Perks Grid */}
        <div>
          <PagedList items={perks} pageSize={2} renderItem={(perk) => {
            const canAfford = tokens >= perk.costTokens;
            return (
              <div
                key={perk.id}
                className="p-4 sm:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-indigo-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                      {getPerkIcon(perk.iconName)}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-emerald-700 dark:text-emerald-400 font-semibold text-xs tabular-nums">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{perk.costTokens}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[var(--color-text-title)] mt-3">
                    {perk.titleTh}
                  </h4>
                  <p className="text-xs text-[var(--color-text-body)] mt-1 leading-relaxed">
                    {perk.descriptionTh}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                  <span className="text-xs text-[var(--color-text-muted)] font-medium tabular-nums">
                    {lang === 'th' ? `เหลือ ${perk.stock} สิทธิ์` : `${perk.stock} left`}
                  </span>

                  <button
                    type="button"
                    disabled={!canAfford || perk.stock <= 0}
                    onClick={() => handleRedeemPerk(perk)}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                      canAfford && perk.stock > 0
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                    }`}
                  >
                    <span>{lang === 'th' ? 'แลกสิทธิ์' : 'Redeem'}</span>
                  </button>
                </div>
              </div>
            );
          }} />
        </div>
      </div>
      )}
      </div>

      {/* Teacher Add Perk Modal */}
      {showAddPerkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'สร้างสิทธิพิเศษใหม่ในห้องเรียน' : 'Create Custom Classroom Perk'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPerkModal(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerk} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'ชื่อสิทธิพิเศษ' : 'Perk Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'th' ? 'เช่น สิทธิ์เลือกเพลงเปิดคาบ, การ์ดถามครูใบ้คำตอบ' : 'e.g. DJ opening song pass'}
                  value={newPerkTitle}
                  onChange={(e) => setNewPerkTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'จำนวนเหรียญความรู้ที่ต้องใช้' : 'Cost Tokens'}
                </label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  step="10"
                  value={newPerkCost}
                  onChange={(e) => setNewPerkCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'รายละเอียดและเงื่อนไขการใช้' : 'Description & Rules'}
                </label>
                <textarea
                  rows={3}
                  placeholder={lang === 'th' ? 'ระบุเงื่อนไข เช่น จำกัดสัปดาห์ละ 1 ครั้ง' : 'Rules...'}
                  value={newPerkDesc}
                  onChange={(e) => setNewPerkDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPerkModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] font-semibold cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  {lang === 'th' ? 'สร้างสิทธิ์ทันที' : 'Save Perk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
