import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Shield, 
  Flame, 
  Zap, 
  Heart, 
  Users, 
  Sparkles, 
  Award, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw,
  SlidersHorizontal,
  Plus,
  Play,
  Share2,
  Trophy,
  ArrowRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { 
  BossRaidConfig, 
  RaidParty, 
  RaidPartyMember, 
  AppLanguage, 
  UserRole 
} from '../types';
import { 
  INITIAL_BOSS_RAID_CONFIG, 
  INITIAL_RAID_PARTIES 
} from '../data/innovativeFeaturesData';
import { PagedList } from './PagedList';

interface CoopBossRaidViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  onExit?: () => void;
}

export const CoopBossRaidView: React.FC<CoopBossRaidViewProps> = ({
  lang = 'th',
  currentRole = 'student',
  currentUserName = 'นักเรียน',
  onExit
}) => {
  const canManageRaid = currentRole === 'teacher' || currentRole === 'admin';
  const [bossConfig, setBossConfig] = useState<BossRaidConfig>(INITIAL_BOSS_RAID_CONFIG);
  const [parties, setParties] = useState<RaidParty[]>(INITIAL_RAID_PARTIES);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attackAnimation, setAttackAnimation] = useState<boolean>(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [activeHintToast, setActiveHintToast] = useState<string | null>(null);
  const [victoryCelebration, setVictoryCelebration] = useState<boolean>(false);
  const [bossZoom, setBossZoom] = useState<number>(1.0);
  const [raidPanel, setRaidPanel] = useState<'arena' | 'question' | 'parties'>('question');

  // Teacher Topic Switcher state
  const [isTeacherPanelOpen, setIsTeacherPanelOpen] = useState<boolean>(false);

  // Attack handler when user answers question
  const handleAttackBoss = (optionIdx: number) => {
    if (bossConfig.status !== 'in_battle' || selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);

    const isCorrect = optionIdx === bossConfig.activeQuestion.correctIndex;
    if (isCorrect) {
      const damage = Math.round(bossConfig.activeQuestion.baseDamage * 1.5);
      setLastDamage(damage);
      setAttackAnimation(true);

      const nextHp = Math.max(0, bossConfig.bossCurrentHp - damage);
      setBossConfig(prev => ({
        ...prev,
        bossCurrentHp: nextHp,
        status: nextHp === 0 ? 'defeated' : 'in_battle'
      }));

      // Update party damage
      setParties(prev => prev.map((p, idx) => {
        if (idx === 0) {
          return {
            ...p,
            totalDamage: p.totalDamage + damage,
            comboMultiplier: Number((p.comboMultiplier + 0.5).toFixed(1)),
            members: p.members.map(m => m.id === 'pm-1' ? { ...m, hasAnswered: true, damageDealt: m.damageDealt + damage } : m)
          };
        }
        return p;
      }));

      if (nextHp === 0) {
        setVictoryCelebration(true);
      }
    } else {
      setLastDamage(0);
      setAttackAnimation(false);
    }

    setTimeout(() => {
      setAttackAnimation(false);
    }, 1200);
  };

  // Peer-tutoring assist trigger
  const handleSendPeerAssist = (member: RaidPartyMember) => {
    setActiveHintToast(
      lang === 'th'
        ? `ตัวอย่าง: ส่งการ์ดคำใบ้ให้ ${member.name} (ยังไม่เชื่อมต่อผู้เล่นจริง)`
        : `Demo: hint card prepared for ${member.name}; no live player connection.`
    );

    setParties(prev => prev.map(p => ({
      ...p,
      members: p.members.map(m => m.id === member.id ? { ...m, isHelping: true } : m)
    })));

    setTimeout(() => setActiveHintToast(null), 3500);
  };

  // Reset / Next Question
  const handleNextRaidQuestion = () => {
    setSelectedAnswer(null);
    setLastDamage(null);
    setBossConfig(prev => ({
      ...prev,
      activeQuestion: {
        id: `bq-${Date.now()}`,
        questionTh: 'ถ้าปล่อยก้อนหินมวล 2 kg ให้ตกอย่างอิสระจากตึกสูง ผ่านไป 3 วินาที ก้อนหินจะมีความเร็วเท่าใด? (กำหนด $g = 10 m/s²$)',
        options: ['30 m/s', '20 m/s', '60 m/s', '10 m/s'],
        correctIndex: 0,
        explanationTh: 'จากสมการ $v = u + gt$ โดย $u = 0$ จะได้ $v = 10 \\times 3 = 30$ m/s',
        baseDamage: 300,
      }
    }));
  };

  const handleRestartBoss = () => {
    setBossConfig(INITIAL_BOSS_RAID_CONFIG);
    setParties(INITIAL_RAID_PARTIES);
    setSelectedAnswer(null);
    setLastDamage(null);
    setVictoryCelebration(false);
  };

  const hpPercent = Math.round((bossConfig.bossCurrentHp / bossConfig.bossMaxHp) * 100);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Toast Alert */}
      {activeHintToast && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-xl bg-slate-900 text-white shadow-xl border border-indigo-500/50 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-xs font-semibold">{activeHintToast}</p>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="shrink-0 bg-gradient-to-r from-red-950 via-slate-900 to-indigo-950 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md border border-red-700/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 text-[11px] font-semibold">
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>{lang === 'th' ? 'โหมดห้องเรียนร่วมมือสู้บอส (Co-op Boss Raid & Peer Tutoring)' : 'Cooperative Classroom Boss Raid'}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{bossConfig.bossNameTh}</span>
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed hidden sm:block">
              {lang === 'th' 
                ? 'ผนึกกำลังตอบคำถามเพื่อลดเลือดบอสประจำคาบเรียน สมาชิกสามารถกดส่งคำใบ้ช่วยติวให้เพื่อนได้ทันที'
                : 'Defeat lesson bosses together through collaborative problem solving and real-time peer tutoring.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
              >
                <span>❌ ออกจากเกม</span>
              </button>
            )}

            {/* Quick Action Button for Teacher */}
            {canManageRaid && (
              <button
                type="button"
                onClick={() => setIsTeacherPanelOpen(!isTeacherPanelOpen)}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md border border-white/20 transition cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{lang === 'th' ? 'ควบคุมบอส (ครู)' : 'Teacher Controls'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRestartBoss}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Restart Raid"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Control Strip */}
      {canManageRaid && isTeacherPanelOpen && (
        <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-700/60 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-indigo-300">
              {lang === 'th' ? 'สลับหัวข้อบอส:' : 'Switch Raid Topic:'}
            </span>
            <button
              type="button"
              onClick={() => {
                setBossConfig(prev => ({
                  ...prev,
                  bossNameTh: 'โกเลมสะเทินกรด-เบส (Acid-Base Golem)',
                  subject: 'เคมี ม.ปลาย',
                  topicTh: 'การคำนวณจุดยุติและอินดิเคเตอร์'
                }));
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 font-semibold cursor-pointer"
            >
              🧪 เคมี (กรด-เบส)
            </button>
            <button
              type="button"
              onClick={() => {
                setBossConfig(prev => ({
                  ...prev,
                  bossNameTh: 'จอมอสูรไวยากรณ์ (Grammar Titan)',
                  subject: 'ภาษาอังกฤษ ม.ปลาย',
                  topicTh: 'Subject-Verb Agreement & Conjunctions'
                }));
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 font-semibold cursor-pointer"
            >
              📚 ภาษาอังกฤษ (Grammar)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              {lang === 'th' ? 'ปรับเลือดบอส:' : 'Boss HP:'}
            </span>
            <button
              type="button"
              onClick={() => setBossConfig(prev => ({ ...prev, bossCurrentHp: Math.min(prev.bossMaxHp, prev.bossCurrentHp + 500) }))}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold"
            >
              +500 HP
            </button>
            <button
              type="button"
              onClick={() => setBossConfig(prev => ({ ...prev, bossCurrentHp: Math.max(0, prev.bossCurrentHp - 500) }))}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 font-bold"
            >
              -500 HP
            </button>
          </div>
        </div>
      )}

      <div className="shrink-0 flex lg:hidden flex-wrap gap-1.5" role="group" aria-label={lang === 'th' ? 'ส่วนของเกม' : 'Raid panels'}>
        {([
          ['arena', lang === 'th' ? 'สนามบอส' : 'Boss Arena'],
          ['question', lang === 'th' ? 'ตอบคำถาม' : 'Answer Question'],
          ['parties', lang === 'th' ? 'ทีมพันธมิตร' : 'Allied Teams']
        ] as const).map(([panel, label]) => (
          <button
            key={panel}
            type="button"
            aria-pressed={raidPanel === panel}
            onClick={() => setRaidPanel(panel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              raidPanel === panel
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Raid Stage: Left Boss Visual & Health Bar, Right Co-op Question & Party Matrix */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto pb-1">
        {/* Left Column: Boss Arena Visual */}
        <div className={`${raidPanel === 'arena' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 min-h-[220px] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-2xl border border-slate-800 p-3 sm:p-3.5 shadow-xl flex-col justify-between text-white relative overflow-hidden`}>
          {/* Boss HP Bar & Zoom Control */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="flex items-center gap-1.5 text-red-400">
                <Heart className="w-4 h-4 fill-current" />
                <span>BOSS HEALTH</span>
              </span>
              <div className="flex items-center gap-2">
                {/* Boss Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => setBossZoom(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))))}
                    className="p-1 text-slate-300 hover:text-amber-300 active:scale-90 transition cursor-pointer"
                    title="ซูมออกบอส (-)"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBossZoom(1.0)}
                    className="text-[10px] font-mono text-amber-300 font-bold px-1 hover:underline cursor-pointer"
                    title="รีเซ็ตซูม 1.0x"
                  >
                    {bossZoom}x
                  </button>
                  <button
                    type="button"
                    onClick={() => setBossZoom(prev => Math.min(1.8, Number((prev + 0.15).toFixed(2))))}
                    className="p-1 text-slate-300 hover:text-amber-300 active:scale-90 transition cursor-pointer"
                    title="ซูมเข้าบอส (+)"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-slate-300 font-mono text-[11px]">
                  {bossConfig.bossCurrentHp}/{bossConfig.bossMaxHp} ({hpPercent}%)
                </span>
              </div>
            </div>

            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* Boss Character Visual Card (Scalable with Zoom) */}
            <div 
              style={{ transform: `scale(${bossZoom})`, transformOrigin: 'center' }}
              className={`my-3 py-3 flex flex-col items-center justify-center transition-transform duration-200 ${attackAnimation ? 'scale-95 animate-shake' : ''}`}
            >
              <div className="relative">
                {/* Boss Avatar / Crest */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-red-600 via-purple-700 to-slate-900 border-4 border-red-500/80 shadow-2xl shadow-red-500/30 flex items-center justify-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial from-red-500/20 to-transparent animate-pulse" />
                  <Swords className="w-12 h-12 text-yellow-300 drop-shadow-md" />
                </div>

                {/* Floating Damage Number */}
                {lastDamage !== null && (
                  <div className="absolute -top-3 -right-3 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-xs shadow-lg animate-bounce">
                    -{lastDamage} HP!
                  </div>
                )}
              </div>

              <h3 className="text-base font-black text-white mt-2.5 text-center">
                {bossConfig.bossNameTh}
              </h3>
              <p className="text-[11px] text-red-300 mt-0.5 font-medium">
                {bossConfig.bossTitleTh}
              </p>
            </div>
          </div>

          {/* Bottom Raid Info */}
          <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[150px]">{bossConfig.topicTh}</span>
            <span className="text-amber-400 font-bold flex items-center gap-1 shrink-0">
              <Flame className="w-3 h-3" />
              <span>คอมโบ x2.0</span>
            </span>
          </div>
        </div>

        {/* Right Column: Active Attack Question & Co-op Party Matrix */}
        <div className={`${raidPanel !== 'arena' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 flex-col min-h-0 space-y-3 pr-1 overflow-y-auto`}>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            โหมดสาธิต: รายชื่อทีมและผลการแข่งขันเป็นข้อมูลตัวอย่าง ยังไม่เชื่อมผู้เล่นออนไลน์จริง
          </div>
          {/* Question Card */}
          {raidPanel === 'question' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                {bossConfig.subject}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {lang === 'th' ? `พลังโจมตีพื้นฐาน: ${bossConfig.activeQuestion.baseDamage} DMG` : `Base: ${bossConfig.activeQuestion.baseDamage} DMG`}
              </span>
            </div>

            <div className="mt-4">
              <p className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed mb-4">
                {bossConfig.activeQuestion.questionTh}
              </p>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bossConfig.activeQuestion.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswer === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={selectedAnswer !== null || bossConfig.status !== 'in_battle'}
                      onClick={() => handleAttackBoss(optIdx)}
                      className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? optIdx === bossConfig.activeQuestion.correctIndex
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                            : 'bg-rose-600 text-white border-rose-700 shadow-md'
                          : selectedAnswer !== null && optIdx === bossConfig.activeQuestion.correctIndex
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-red-400 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span>{opt}</span>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  );
                })}
              </div>

              {/* Question Feedback & Next */}
              {selectedAnswer !== null && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {bossConfig.activeQuestion.explanationTh}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextRaidQuestion}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer shrink-0 ml-2"
                  >
                    {lang === 'th' ? 'โจทย์ข้อถัดไป' : 'Next Question'}
                  </button>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Co-op Party Matrix (Peer Tutoring & Combos) */}
          {raidPanel === 'parties' && <details open className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  {lang === 'th' ? 'ทีมพันธมิตรห้องเรียน & ระบบเพื่อนช่วยติว' : 'Classroom Co-op Squads'}
                </h4>
              </div>
              <span className="shrink-0 text-xs font-black text-indigo-600 dark:text-indigo-400">
                {parties.length} {lang === 'th' ? 'ทีม • รายละเอียด ▾' : 'teams • details ▾'}
              </span>
            </summary>

            {/* Squads List */}
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                {lang === 'th' ? 'หากเพื่อนในทีมยังตอบไม่ได้ กดปุ่ม "ติวเพื่อน" เพื่อส่งแนวทางคิดให้เพื่อน' : 'Peer assist: Send tutoring tips to help teammates answer'}
              </p>
              <PagedList
                items={parties}
                pageSize={1}
                renderItem={(party) => (
                <div
                  key={party.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {party.partyName}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                        Combo x{party.comboMultiplier}
                      </span>
                      <span className="font-black text-red-600 dark:text-red-400">
                        {party.totalDamage} DMG
                      </span>
                    </div>
                  </div>

                  {/* Members Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {party.members.map((member) => (
                      <div
                        key={member.id}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                          member.hasAnswered
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="truncate min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate text-[11px]">
                              {member.name.split(' ')[1] || member.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {member.roleTitle}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                          {member.hasAnswered ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              +{member.damageDealt}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendPeerAssist(member)}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-yellow-500" />
                              <span>{lang === 'th' ? 'ส่งคำใบ้ติว' : 'Assist'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              />
            </div>
          </details>}
        </div>
      </div>

      {/* Victory Celebration Modal */}
      {victoryCelebration && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-4 border-amber-400 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl relative animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/40">
              <Trophy className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              🎉 {lang === 'th' ? 'พิชิตบอสประจำบทเรียนสำเร็จ!' : 'BOSS DEFEATED!'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {lang === 'th' 
                ? 'พลังแห่งความร่วมมือของทั้งห้องเรียนช่วยให้พิชิตข้อสอบไซบอร์กได้สำเร็จ ทุกคนได้รับโบนัส 200 XP และ 80 เหรียญความรู้!' 
                : 'Great teamwork! Every participant receives 200 XP and 80 Knowledge Tokens.'}
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200">
              📦 ปลดล็อกหีบสมบัติ: "การ์ดยกเว้นการบ้านประจำสัปดาห์"
            </div>

            <button
              type="button"
              onClick={handleRestartBoss}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md transition cursor-pointer"
            >
              {lang === 'th' ? 'รับรางวัลและเริ่มรอบใหม่' : 'Claim Loot & Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
