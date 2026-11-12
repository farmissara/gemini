import React, { useState } from 'react';
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
  UserRole 
} from '../types';
import { 
  INITIAL_CLASSROOM_PERKS, 
  INITIAL_SEASON_PASS_TIERS, 
  INITIAL_DAILY_MICRO_QUESTS 
} from '../data/innovativeFeaturesData';
import { PagedList } from '../components/PagedList';

interface StudyStreakQuestPassViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
}

export const StudyStreakQuestPassView: React.FC<StudyStreakQuestPassViewProps> = ({
  lang = 'th',
  currentRole = 'student',
  currentUserName = 'ด.ช. ภูมิใจ รักเรียน'
}) => {
  // State
  const [streakCount, setStreakCount] = useState<number>(7);
  const [hasCompletedDaily, setHasCompletedDaily] = useState<boolean>(false);
  const [tokens, setTokens] = useState<number>(420);
  const [currentXp, setCurrentXp] = useState<number>(580);
  const [perks, setPerks] = useState<ClassroomPerk[]>(INITIAL_CLASSROOM_PERKS);
  const [tiers, setTiers] = useState<SeasonPassTier[]>(INITIAL_SEASON_PASS_TIERS);
  const [dailyQuests, setDailyQuests] = useState<DailyMicroQuest[]>(INITIAL_DAILY_MICRO_QUESTS);

  // Active micro-quest
  const [activeTab, setActiveTab] = useState<'quest_pass' | 'perks_store'>('quest_pass');
  const [questPassStep, setQuestPassStep] = useState<'quest' | 'pass'>('quest');
  const [activeQuestIndex, setActiveQuestIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questResult, setQuestResult] = useState<{ isCorrect: boolean; feedback: string } | null>(null);

  // Perk redeem feedback modal
  const [redeemedPerkToast, setRedeemedPerkToast] = useState<string | null>(null);

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
      setTokens(prev => prev + quest.rewardTokens);
      setCurrentXp(prev => prev + quest.rewardXp);
      if (!hasCompletedDaily) {
        setHasCompletedDaily(true);
        setStreakCount(prev => prev + 1);
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
    if (tokens < perk.costTokens) {
      alert(lang === 'th' ? 'เหรียญความรู้ไม่เพียงพอ ทำภารกิจรายวันเพื่อสะสมเหรียญเพิ่ม!' : 'Not enough Knowledge Tokens!');
      return;
    }
    if (perk.stock <= 0) {
      alert(lang === 'th' ? 'สิทธิ์นี้หมดชั่วคราว' : 'Out of stock!');
      return;
    }

    setTokens(prev => prev - perk.costTokens);
    setPerks(prev => prev.map(p => p.id === perk.id ? { ...p, stock: p.stock - 1, redeemedCount: p.redeemedCount + 1 } : p));
    setRedeemedPerkToast(
      lang === 'th' 
        ? `แลกรับ "${perk.titleTh}" สำเร็จแล้ว! แสดงการ์ดนี้ให้คุณครูประจำวิชาเพื่อใช้สิทธิ์` 
        : `Redeemed "${perk.titleEn}" successfully!`
    );
    setTimeout(() => setRedeemedPerkToast(null), 4000);
  };

  // Claim Season Pass Tier Reward
  const handleClaimTier = (level: number) => {
    setTiers(prev => prev.map(t => t.level === level ? { ...t, isClaimed: true } : t));
    setTokens(prev => prev + 50);
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
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Toast Alert */}
      {redeemedPerkToast && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-xl bg-slate-900 text-white shadow-xl border border-emerald-500/50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold">{redeemedPerkToast}</p>
        </div>
      )}

      {/* Top Banner with Flame Streak & Knowledge Token HUD */}
      <div className="shrink-0 bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-orange-600/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-900/70 border border-orange-400/40 text-orange-100 text-[11px] font-semibold">
              <Flame className="w-3.5 h-3.5 text-orange-300 animate-pulse" />
              <span>{lang === 'th' ? 'ระบบสตรีคความต่อเนื่อง & ร้านค้าสิทธิพิเศษในห้องเรียน' : 'Daily Study Streak & Season Battle Pass'}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{lang === 'th' ? 'Daily Streak & Classroom Quest Pass' : 'Daily Study Streak Pass'}</span>
            </h1>
            <p className="text-slate-200 text-xs leading-relaxed">
              {lang === 'th' 
                ? 'กระตุ้นพฤติกรรมรักการเรียนรู้ทุกวันด้วยภารกิจสั้น 3 นาที รักษาไฟสตรีค และนำเหรียญมาแลกสิทธิพิเศษจริง'
                : 'Turn consistent learning into an habit with daily 3-minute micro-quests, flame streaks, and classroom perks.'}
            </p>
          </div>

          {/* Player Stats Strip */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Streak Counter */}
            <div className="bg-orange-900/60 border border-orange-400/40 p-2.5 rounded-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
                <Flame className="w-4 h-4 fill-current text-yellow-300" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-orange-100">{lang === 'th' ? 'สตรีคสะสม' : 'Streak'}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-yellow-300">{streakCount}</span>
                  <span className="text-[10px] font-bold text-orange-100">วัน 🔥</span>
                </div>
              </div>
            </div>

            {/* Tokens Balance */}
            <div className="bg-amber-900/60 border border-yellow-400/40 p-2.5 rounded-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <Coins className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-yellow-100">{lang === 'th' ? 'เหรียญความรู้' : 'Tokens'}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-amber-300">{tokens}</span>
                  <span className="text-[10px]">🪙</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="shrink-0 flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('quest_pass')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            activeTab === 'quest_pass'
              ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
              : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] border-[var(--color-border)]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{lang === 'th' ? '1. เควสต์ประจำวัน & ซีซันพาส' : '1. Daily Quest & Pass'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('perks_store')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            activeTab === 'perks_store'
              ? 'bg-indigo-700 border-indigo-700 text-white shadow-xs'
              : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] border-[var(--color-border)]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{lang === 'th' ? '2. ร้านค้าสิทธิพิเศษห้องเรียน (Classroom Perks)' : '2. Perks Store'}</span>
        </button>
      </div>

      {/* Tab Panels Body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      {activeTab === 'quest_pass' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-2">
        <div className="lg:col-span-12 flex items-center gap-2">
          <button type="button" onClick={() => setQuestPassStep('quest')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${questPassStep === 'quest' ? 'bg-orange-700 border-orange-700 text-white' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'}`}>
            {lang === 'th' ? 'ภารกิจรายวัน' : 'Daily Quest'}
          </button>
          <button type="button" onClick={() => setQuestPassStep('pass')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${questPassStep === 'pass' ? 'bg-indigo-700 border-indigo-700 text-white' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'}`}>
            {lang === 'th' ? 'ซีซันพาส' : 'Season Pass'}
          </button>
        </div>
        {/* Left Column: Daily 3-Minute Micro-Quest */}
        {questPassStep === 'quest' && <div className="lg:col-span-12 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'เควสต์ทบทวนประจำวัน 3 นาที (Daily Micro-Quest)' : 'Daily 3-Min Micro Quest'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? `ข้อที่ ${activeQuestIndex + 1} จาก ${dailyQuests.length} ข้อ • วิชา: ${currentDailyQuest.subject}` : `Question ${activeQuestIndex + 1} of ${dailyQuests.length}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <span>+{currentDailyQuest.rewardTokens} 🪙</span>
                <span>+{currentDailyQuest.rewardXp} XP</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-[var(--color-text-title)] font-bold text-sm leading-relaxed">
                {currentDailyQuest.questionTh}
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentDailyQuest.options.map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleAnswerQuest(optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between text-xs sm:text-sm font-semibold cursor-pointer ${
                        isSelected 
                          ? optIdx === currentDailyQuest.correctIndex
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                            : 'bg-rose-700 text-white border-rose-800 shadow-sm'
                          : selectedOption !== null && optIdx === currentDailyQuest.correctIndex
                          ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 font-bold'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-title)]'
                      }`}
                    >
                      <span>{opt}</span>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Feedback Alert */}
              {questResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  questResult.isCorrect 
                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
                    : 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
                }`}>
                  <p className="font-bold mb-1">
                    {questResult.isCorrect ? '🎉 ถูกต้อง!' : '💡 คำอธิบาย:'}
                  </p>
                  <p>{questResult.feedback}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quest Navigation Button */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
              {hasCompletedDaily ? (lang === 'th' ? '🔥 รักษาสตรีคของวันนี้สำเร็จแล้ว!' : '🔥 Today\'s streak secured!') : (lang === 'th' ? 'ทำถูก 1 ข้อเพื่อรักษาไฟสตรีค' : 'Answer correctly to keep streak alive')}
            </span>

            {selectedOption !== null && (
              <button
                type="button"
                onClick={handleNextQuest}
                className="px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <span>{activeQuestIndex < dailyQuests.length - 1 ? (lang === 'th' ? 'ข้อถัดไป' : 'Next Question') : (lang === 'th' ? 'เริ่มใหม่' : 'Restart')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>}

        {/* Right Column: Season Battle Pass Progression */}
        {questPassStep === 'pass' && <div className="lg:col-span-12 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ซีซันพาสความรู้ (Season Quest Pass)' : 'Knowledge Season Pass'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ปลดล็อกรางวัลพิเศษตามเลเวล XP สะสม' : 'Unlock exclusive rewards as you earn XP'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-indigo-800 dark:text-indigo-300">
                XP: {currentXp} / 1,000
              </span>
            </div>

            {/* Pass Tiers List */}
            <div className="mt-4">
              <PagedList items={tiers} pageSize={2} renderItem={(tier) => {
                const canClaim = currentXp >= tier.requiredXp && !tier.isClaimed;
                const isPassed = currentXp >= tier.requiredXp;

                return (
                  <div
                    key={tier.level}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                      tier.isClaimed
                        ? 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                        : canClaim
                        ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-xs'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                        isPassed 
                          ? 'bg-indigo-700 text-white' 
                          : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]'
                      }`}>
                        Lv.{tier.level}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{tier.freeRewardTh}</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {lang === 'th' ? `ต้องการ ${tier.requiredXp} XP` : `Requires ${tier.requiredXp} XP`}
                        </p>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="shrink-0">
                      {tier.isClaimed ? (
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {lang === 'th' ? 'รับแล้ว' : 'Claimed'}
                        </span>
                      ) : canClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaimTier(tier.level)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          {lang === 'th' ? 'กดรับรางวัล' : 'Claim'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                          {lang === 'th' ? 'ยังไม่ปลดล็อก' : 'Locked'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
            <span>{lang === 'th' ? 'ฤดูกาลปัจจุบัน: Season 1 วิทยาการคำนวณ' : 'Current: Season 1 Tech & Sci'}</span>
            <span className="font-semibold text-[var(--color-text-body)]">{lang === 'th' ? 'เหลือเวลาอีก 18 วัน' : '18 days left'}</span>
          </div>
        </div>}
      </div>
      )}

      {/* Classroom Perks Store Section */}
      {activeTab === 'perks_store' && (
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              {lang === 'th' ? 'ร้านค้าสิทธิพิเศษในห้องเรียน (Classroom Perks Store)' : 'Classroom Perks Exchange'}
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
              className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? '+ ครูเพิ่มสิทธิ์ใหม่ในห้อง' : '+ Add Classroom Perk'}</span>
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
                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-amber-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                      {getPerkIcon(perk.iconName)}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-black text-xs">
                      {perk.costTokens} 🪙
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
                  <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                    {lang === 'th' ? `เหลือ ${perk.stock} สิทธิ์` : `${perk.stock} left`}
                  </span>

                  <button
                    type="button"
                    disabled={!canAfford || perk.stock <= 0}
                    onClick={() => handleRedeemPerk(perk)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                      canAfford && perk.stock > 0
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs cursor-pointer'
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
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
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
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'จำนวนเหรียญความรู้ที่ต้องใช้' : 'Cost Tokens'}
                </label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  step="10"
                  value={newPerkCost}
                  onChange={(e) => setNewPerkCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
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
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] font-bold cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer"
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
