import React, { useState, useMemo } from 'react';
import {
  Swords,
  Flame,
  Zap,
  Heart,
  Users,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AppLanguage,
  AuthUser,
  BossRaidConfig,
  PortfolioItem,
  QuizQuestion,
  RaidParty,
  RaidPartyMember,
  UserRole,
} from '../types';
import {
  INITIAL_BOSS_RAID_CONFIG,
  INITIAL_RAID_PARTIES,
} from '../data/innovativeFeaturesData';
import { COMPREHENSIVE_QUESTION_BANK } from '../data/examQuestionBanks';
import { playHeavyImpactSound, playComboStreakSound, playGrandVictoryFanfare } from '../lib/labSoundEffects';

interface CoopBossRaidViewProps {
  questions?: QuizQuestion[];
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  schoolId?: string;
  currentUser?: AuthUser | null;
  onAwardPortfolioItem?: (item: PortfolioItem) => void;
  onExit?: () => void;
}

export const CoopBossRaidView: React.FC<CoopBossRaidViewProps> = ({
  questions = [],
  lang = 'th',
  currentRole = 'student',
  currentUserName = 'นักเรียน',
  schoolId,
  currentUser,
  onAwardPortfolioItem,
  onExit,
}) => {
  const [savedToPortfolio, setSavedToPortfolio] = useState(false);
  const canManageRaid = currentRole === 'teacher' || currentRole === 'admin';
  const [bossConfig, setBossConfig] = useState<BossRaidConfig>(INITIAL_BOSS_RAID_CONFIG);
  const [parties, setParties] = useState<RaidParty[]>(INITIAL_RAID_PARTIES);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attackAnimation, setAttackAnimation] = useState<boolean>(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [comboCount, setComboCount] = useState<number>(0);
  const [activeHintToast, setActiveHintToast] = useState<string | null>(null);
  const [victoryCelebration, setVictoryCelebration] = useState<boolean>(false);
  const [examFilter, setExamFilter] = useState<'all_bank' | 'teacher_created'>('all_bank');
  const [questionCursor, setQuestionCursor] = useState<number>(0);
  const [isTeacherPanelOpen, setIsTeacherPanelOpen] = useState<boolean>(false);
  const [showSquadDrawer, setShowSquadDrawer] = useState<boolean>(false);

  const teacherCreatedQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.id.startsWith('q-custom-') || q.id.startsWith('csv-') || q.category === 'exam'
      ),
    [questions]
  );

  // Combine real school questions + built-in comprehensive curriculum bank so Boss Raid NEVER gets stuck on 1 question
  const mergedQuestionBank = useMemo(() => {
    const seen = new Set<string>();
    const combined: QuizQuestion[] = [];
    for (const q of [...questions, ...COMPREHENSIVE_QUESTION_BANK]) {
      if (q && q.id && !seen.has(q.id) && Array.isArray(q.options) && q.options.length >= 2) {
        seen.add(q.id);
        combined.push(q);
      }
    }
    return combined;
  }, [questions]);

  const raidPool = useMemo(() => {
    if (examFilter === 'teacher_created') {
      if (teacherCreatedQuestions.length > 0) return teacherCreatedQuestions;
      if (questions.length > 0) return questions;
    }
    return mergedQuestionBank;
  }, [examFilter, teacherCreatedQuestions, questions, mergedQuestionBank]);

  const applyQuizQuestionToBoss = (q: QuizQuestion) => {
    setSelectedAnswer(null);
    setLastDamage(null);
    setBossConfig((prev) => ({
      ...prev,
      subject: q.subject,
      activeQuestion: {
        id: q.id,
        questionTh: q.questionTh,
        options: q.options,
        correctIndex: q.correctIndex,
        explanationTh: q.explanationTh || 'ตรวจสอบคำอธิบายในคลังข้อสอบ',
        baseDamage: Math.max(280, (q.points || 100) * 3),
      },
    }));
  };

  const handleAttackBoss = (optionIdx: number) => {
    if (bossConfig.status !== 'in_battle' || selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);

    const isCorrect = optionIdx === bossConfig.activeQuestion.correctIndex;
    if (isCorrect) {
      const nextCombo = comboCount + 1;
      setComboCount(nextCombo);
      playHeavyImpactSound();
      playComboStreakSound(Math.min(5, nextCombo));
      const multiplier = 1 + Math.min(1.5, nextCombo * 0.25);
      const damage = Math.round(bossConfig.activeQuestion.baseDamage * multiplier);
      setLastDamage(damage);
      setAttackAnimation(true);

      const nextHp = Math.max(0, bossConfig.bossCurrentHp - damage);
      setBossConfig((prev) => ({
        ...prev,
        bossCurrentHp: nextHp,
        status: nextHp === 0 ? 'defeated' : 'in_battle',
      }));

      setParties((prev) =>
        prev.map((p, idx) => {
          if (idx === 0) {
            return {
              ...p,
              totalDamage: p.totalDamage + damage,
              comboMultiplier: Number((1 + nextCombo * 0.25).toFixed(2)),
              members: p.members.map((m) =>
                m.id === 'pm-1'
                  ? { ...m, hasAnswered: true, damageDealt: m.damageDealt + damage }
                  : m
              ),
            };
          }
          return p;
        })
      );

      if (nextHp === 0) {
        setVictoryCelebration(true);
        playGrandVictoryFanfare();
      }
    } else {
      setComboCount(0);
      setLastDamage(0);
      setAttackAnimation(false);
    }

    setTimeout(() => {
      setAttackAnimation(false);
    }, 900);
  };

  const handleSendPeerAssist = (member: RaidPartyMember) => {
    setActiveHintToast(
      lang === 'th'
        ? `ส่งคำใบ้ช่วย ${member.name.split(' ')[0]} แล้ว`
        : `Hint sent to ${member.name.split(' ')[0]}`
    );

    setParties((prev) =>
      prev.map((p) => ({
        ...p,
        members: p.members.map((m) => (m.id === member.id ? { ...m, isHelping: true } : m)),
      }))
    );

    setTimeout(() => setActiveHintToast(null), 2600);
  };

  const handleNextRaidQuestion = () => {
    if (raidPool.length > 0) {
      let nextIdx = (questionCursor + 1) % raidPool.length;
      if (raidPool[nextIdx].id === bossConfig.activeQuestion.id && raidPool.length > 1) {
        nextIdx = (nextIdx + 1) % raidPool.length;
      }
      setQuestionCursor(nextIdx);
      applyQuizQuestionToBoss(raidPool[nextIdx]);
      return;
    }
    setSelectedAnswer(null);
    setLastDamage(null);
  };

  const handleRestartBoss = () => {
    const startIdx = Math.floor(Math.random() * Math.max(1, raidPool.length));
    const firstQ = raidPool[startIdx];
    setQuestionCursor(startIdx);
    setComboCount(0);
    setParties(INITIAL_RAID_PARTIES);
    setSelectedAnswer(null);
    setLastDamage(null);
    setVictoryCelebration(false);
    setSavedToPortfolio(false);
    setBossConfig({
      ...INITIAL_BOSS_RAID_CONFIG,
      ...(firstQ
        ? {
            subject: firstQ.subject,
            activeQuestion: {
              id: firstQ.id,
              questionTh: firstQ.questionTh,
              options: firstQ.options,
              correctIndex: firstQ.correctIndex,
              explanationTh: firstQ.explanationTh || 'ตรวจสอบคำอธิบายในคลังข้อสอบ',
              baseDamage: Math.max(280, (firstQ.points || 100) * 3),
            },
          }
        : {}),
    });
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((bossConfig.bossCurrentHp / bossConfig.bossMaxHp) * 100)));

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-[#09090B] text-white font-sans select-none">
      {/* Subtle Toast */}
      {activeHintToast && (
        <div className="fixed top-16 right-4 z-50 px-3.5 py-2 rounded-xl bg-zinc-900 text-zinc-100 shadow-2xl border border-amber-400/40 flex items-center gap-2 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{activeHintToast}</span>
        </div>
      )}

      {/* Single-Row Gen Z Top Bar (52px) */}
      <header className="h-14 px-3 sm:px-5 border-b border-zinc-800/80 bg-[#09090B] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold cursor-pointer shrink-0 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ออก</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
              Boss Raid
            </h1>
            <p className="text-[11px] text-zinc-400 truncate">
              {bossConfig.bossNameTh}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {comboCount > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-black font-mono tabular-nums flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              <span>x{(1 + Math.min(1.5, comboCount * 0.25)).toFixed(1)}</span>
            </div>
          )}

          {canManageRaid && (
            <button
              type="button"
              onClick={() => setIsTeacherPanelOpen(!isTeacherPanelOpen)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition ${
                isTeacherPanelOpen
                  ? 'bg-amber-400 text-zinc-950 border-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
              title={lang === 'th' ? 'ควบคุมบอส (ครู)' : 'Teacher Controls'}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleRestartBoss}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition"
            title="เริ่มรอบใหม่"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Teacher Control Strip (Only when teacher toggles it) */}
      {canManageRaid && isTeacherPanelOpen && (
        <div className="shrink-0 px-3 sm:px-5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-zinc-400">บอส:</span>
            <button
              type="button"
              onClick={() =>
                setBossConfig((prev) => ({
                  ...prev,
                  bossNameTh: 'โกเลมสะเทินกรด-เบส',
                  subject: 'เคมี ม.ปลาย',
                  topicTh: 'การคำนวณจุดยุติและอินดิเคเตอร์',
                }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold cursor-pointer"
            >
              เคมี (กรด-เบส)
            </button>
            <button
              type="button"
              onClick={() =>
                setBossConfig((prev) => ({
                  ...prev,
                  bossNameTh: 'จอมอสูรไวยากรณ์',
                  subject: 'ภาษาอังกฤษ',
                  topicTh: 'Subject-Verb Agreement',
                }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold cursor-pointer"
            >
              อังกฤษ (Grammar)
            </button>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const nextFilter = examFilter === 'all_bank' ? 'teacher_created' : 'all_bank';
                  setExamFilter(nextFilter);
                  setQuestionCursor(0);
                  const nextPool =
                    nextFilter === 'teacher_created'
                      ? teacherCreatedQuestions.length > 0
                        ? teacherCreatedQuestions
                        : questions
                      : mergedQuestionBank;
                  if (nextPool.length > 0) applyQuizQuestionToBoss(nextPool[0]);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${
                  examFilter === 'teacher_created'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {examFilter === 'teacher_created' ? 'ใช้ข้อสอบครูอยู่' : 'สลับใช้ข้อสอบครู'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setBossConfig((prev) => ({
                  ...prev,
                  bossCurrentHp: Math.min(prev.bossMaxHp, prev.bossCurrentHp + 500),
                }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-mono font-bold cursor-pointer"
            >
              +500 HP
            </button>
            <button
              type="button"
              onClick={() =>
                setBossConfig((prev) => ({
                  ...prev,
                  bossCurrentHp: Math.max(0, prev.bossCurrentHp - 500),
                }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-mono font-bold cursor-pointer"
            >
              -500 HP
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Mobile Compact Live Boss HP Bar (Always visible while answering on mobile!) */}
          <div className="lg:hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-purple-800 border border-rose-500/60 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    attackAnimation ? 'scale-90' : ''
                  }`}
                >
                  <Swords className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{bossConfig.bossNameTh}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{bossConfig.subject}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {lastDamage !== null && lastDamage > 0 ? (
                  <span className="text-sm font-black text-rose-400 font-mono tabular-nums">
                    -{lastDamage} HP
                  </span>
                ) : (
                  <span className="text-xs font-black font-mono text-rose-400 tabular-nums">
                    {hpPercent}%
                  </span>
                )}
                <p className="text-[10px] font-mono text-zinc-400 tabular-nums">
                  {bossConfig.bossCurrentHp}/{bossConfig.bossMaxHp}
                </p>
              </div>
            </div>

            <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Desktop Boss Visual Stage */}
          <div className="hidden lg:flex lg:col-span-5 rounded-3xl bg-zinc-900 border border-zinc-800 p-4 flex-col justify-between relative overflow-hidden min-h-[320px]">
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2 tabular-nums">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <Heart className="w-4 h-4 fill-current" />
                  <span>BOSS HP</span>
                </span>
                <span className="font-mono text-zinc-300">
                  {bossConfig.bossCurrentHp} / {bossConfig.bossMaxHp} ({hpPercent}%)
                </span>
              </div>

              <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            <div
              className={`my-4 flex flex-col items-center justify-center transition-transform duration-200 ${
                attackAnimation ? 'scale-90' : ''
              }`}
            >
              <div className="relative">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-rose-600 via-purple-800 to-zinc-950 border-2 border-rose-500/70 shadow-xl shadow-rose-600/20 flex items-center justify-center">
                  <Swords className="w-10 h-10 text-amber-300" />
                </div>

                {lastDamage !== null && lastDamage > 0 && (
                  <div className="absolute -top-3 -right-4 px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-sm font-mono shadow-lg tabular-nums">
                    -{lastDamage}
                  </div>
                )}
              </div>

              <h2 className="text-lg font-black text-white mt-4 text-center">
                {bossConfig.bossNameTh}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 text-center">{bossConfig.bossTitleTh}</p>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span className="truncate">{bossConfig.subject}</span>
              <span className="text-amber-400 font-bold font-mono shrink-0">
                คลัง {raidPool.length} ข้อ
              </span>
            </div>
          </div>

          {/* Question & Attack Arena */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-rose-400 truncate">
                  {bossConfig.subject}
                </span>
                <span className="text-xs font-black font-mono text-amber-400 shrink-0 tabular-nums">
                  {bossConfig.activeQuestion.baseDamage} DMG
                </span>
              </div>

              <p className="font-bold text-base sm:text-lg text-white leading-relaxed">
                {bossConfig.activeQuestion.questionTh}
              </p>

              {/* Tactile >= 52px Answer Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bossConfig.activeQuestion.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswer === optIdx;
                  const isCorrectOpt = optIdx === bossConfig.activeQuestion.correctIndex;
                  const choiceLabel = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);

                  let btnClass =
                    'bg-zinc-950 border-zinc-800 hover:border-rose-500/70 hover:bg-zinc-800/80 text-zinc-100';
                  if (selectedAnswer !== null) {
                    if (isCorrectOpt) {
                      btnClass = 'bg-emerald-600/20 border-emerald-400 text-emerald-200';
                    } else if (isSelected) {
                      btnClass = 'bg-rose-600/25 border-rose-500 text-rose-200';
                    } else {
                      btnClass = 'bg-zinc-950/60 border-zinc-800/60 text-zinc-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={selectedAnswer !== null || bossConfig.status !== 'in_battle'}
                      onClick={() => handleAttackBoss(optIdx)}
                      className={`min-h-[54px] px-3.5 py-3 rounded-2xl border text-left text-sm font-bold transition active:scale-[0.98] cursor-pointer flex items-center gap-3 ${btnClass}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs font-mono font-black flex items-center justify-center shrink-0">
                        {choiceLabel}
                      </span>
                      <span className="flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Instant Next Attack CTA */}
              {selectedAnswer !== null && bossConfig.status === 'in_battle' && (
                <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p
                      className={`text-xs font-black ${
                        selectedAnswer === bossConfig.activeQuestion.correctIndex
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {selectedAnswer === bossConfig.activeQuestion.correctIndex
                        ? `โจมตีสำเร็จ! -${lastDamage || 0} HP`
                        : 'พลาดเป้า! ลองข้อถัดไปเพื่อเก็บคอมโบใหม่'}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {bossConfig.activeQuestion.explanationTh}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextRaidQuestion}
                    className="min-h-[44px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black transition active:scale-95 cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
                  >
                    <span>{lang === 'th' ? 'โจมตีข้อถัดไป' : 'Next Attack'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible Squad Panel (Clean & Secondary) */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSquadDrawer((v) => !v)}
                className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-100">
                    ทีมร่วมสู้บอส ({parties[0]?.totalDamage || 0} DMG)
                  </span>
                </div>
                {showSquadDrawer ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showSquadDrawer && (
                <div className="px-4 pb-4 pt-1 border-t border-zinc-800 space-y-2.5">
                  {parties.map((party) => (
                    <div key={party.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs pt-2">
                        <span className="font-bold text-zinc-200">{party.partyName}</span>
                        <span className="font-mono font-bold text-rose-400 tabular-nums">
                          {party.totalDamage} DMG · x{party.comboMultiplier}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {party.members.map((member) => (
                          <div
                            key={member.id}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                              <p className="text-[11px] font-bold text-zinc-200 truncate">
                                {member.name.split(' ')[1] || member.name}
                              </p>
                            </div>
                            {member.hasAnswered ? (
                              <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />+{member.damageDealt}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendPeerAssist(member)}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 text-left cursor-pointer"
                              >
                                ส่งคำใบ้
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Victory Modal */}
      {victoryCelebration && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-400/50 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {lang === 'th' ? 'พิชิตบอสสำเร็จ!' : 'BOSS DEFEATED'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'th'
                  ? `โค่น ${bossConfig.bossNameTh} เรียบร้อย รับโบนัส +200 XP`
                  : `Defeated ${bossConfig.bossNameTh}. +200 XP earned.`}
              </p>
            </div>

            {onAwardPortfolioItem && (
              <button
                type="button"
                disabled={savedToPortfolio}
                onClick={() => {
                  onAwardPortfolioItem({
                    id: `port-boss-${Date.now()}`,
                    schoolId,
                    ownerId: currentUser?.studentRecordId || currentUser?.id || 'stu-boss-winner',
                    ownerRole: currentRole === 'teacher' || currentRole === 'admin' ? 'teacher' : 'student',
                    ownerName: currentUser?.fullNameTh || currentUserName,
                    title: `ผู้พิชิต Co-op Boss Raid: ${bossConfig.bossNameTh}`,
                    category: 'competition',
                    year: String(new Date().getFullYear() + 543),
                    description: `พิชิตโจทย์วิชา ${bossConfig.subject} (${bossConfig.topicTh}) สำเร็จ`,
                    skills: [bossConfig.subject, 'Teamwork', 'Problem Solving'],
                    certifiedBySchool: true,
                    scoreBonus: 15,
                  });
                  setSavedToPortfolio(true);
                }}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs transition cursor-pointer"
              >
                {savedToPortfolio ? 'บันทึกเกียรติบัตรแล้ว' : 'บันทึกเกียรติบัตรลง Portfolio'}
              </button>
            )}

            <div className="flex gap-2">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex-1 min-h-[46px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs cursor-pointer transition"
                >
                  ออก
                </button>
              )}
              <button
                type="button"
                onClick={handleRestartBoss}
                className="flex-1 min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-sm transition cursor-pointer"
              >
                {lang === 'th' ? 'เล่นรอบใหม่' : 'Play Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
