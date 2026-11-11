import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  GraduationCap,
  Layers,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  EvaluatedMilestone,
  GradeRecord,
  MilestoneCategory,
  MilestoneTier,
  PlayerScore,
  Student,
} from '../types';
import {
  evaluatePlayerMilestones,
  selectDefaultPlayerScore,
} from '../lib/milestoneAchievements';
import { playPowerupChimeSound } from '../lib/labSoundEffects';

interface MilestoneAchievementsPanelProps {
  playerScores: PlayerScore[];
  students: Student[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  currentUser?: AuthUser | null;
  lang?: AppLanguage;
  onLogLibraryVisit?: (userId: string) => void;
  onQuickAttendanceForMilestone?: (studentId: string, userId: string) => void;
}

const TIER_VISUALS: Record<
  MilestoneTier,
  {
    labelTh: string;
    labelEn: string;
    crestBg: string;
    crestBorder: string;
    crestIcon: string;
    haloColor: string;
    barColor: string;
  }
> = {
  bronze: {
    labelTh: 'ระดับ Bronze',
    labelEn: 'Bronze Tier',
    crestBg: 'from-amber-700 via-orange-600 to-amber-800',
    crestBorder: 'border-amber-400/70',
    crestIcon: 'text-amber-100',
    haloColor: 'border-amber-500/50',
    barColor: 'bg-amber-600',
  },
  silver: {
    labelTh: 'ระดับ Silver',
    labelEn: 'Silver Tier',
    crestBg: 'from-slate-500 via-slate-400 to-slate-600',
    crestBorder: 'border-slate-300/80',
    crestIcon: 'text-white',
    haloColor: 'border-slate-400/55',
    barColor: 'bg-slate-500',
  },
  gold: {
    labelTh: 'ระดับ Gold',
    labelEn: 'Gold Tier',
    crestBg: 'from-yellow-500 via-amber-400 to-yellow-600',
    crestBorder: 'border-yellow-200/90',
    crestIcon: 'text-slate-950',
    haloColor: 'border-amber-400/65',
    barColor: 'bg-amber-500',
  },
  diamond: {
    labelTh: 'ระดับ Diamond',
    labelEn: 'Diamond Tier',
    crestBg: 'from-cyan-500 via-sky-500 to-blue-600',
    crestBorder: 'border-cyan-200/90',
    crestIcon: 'text-white',
    haloColor: 'border-cyan-400/65',
    barColor: 'bg-cyan-500',
  },
};

function renderMilestoneIcon(
  iconKey: EvaluatedMilestone['def']['iconKey'],
  className: string
) {
  switch (iconKey) {
    case 'clock_check':
      return <Clock className={className} />;
    case 'flame_streak':
      return <Flame className={className} />;
    case 'shield_perfect':
      return <ShieldCheck className={className} />;
    case 'book_open':
      return <BookOpen className={className} />;
    case 'library_stack':
      return <Layers className={className} />;
    case 'crown_library':
      return <Crown className={className} />;
    case 'star_academic':
      return <Star className={className} />;
    case 'award_honor':
      return <Award className={className} />;
    case 'trophy_grandmaster':
    default:
      return <Trophy className={className} />;
  }
}

export const MilestoneAchievementsPanel: React.FC<MilestoneAchievementsPanelProps> = ({
  playerScores,
  students,
  attendance,
  grades,
  currentUser,
  lang = 'th',
  onLogLibraryVisit,
  onQuickAttendanceForMilestone,
}) => {
  const studentScores = useMemo(
    () => playerScores.filter((p) => p.role === 'student'),
    [playerScores]
  );

  const defaultSelected = useMemo(
    () => selectDefaultPlayerScore(playerScores, currentUser, students),
    [playerScores, currentUser, students]
  );

  const [selectedUserId, setSelectedUserId] = useState<string>(
    defaultSelected?.userId || playerScores[0]?.userId || ''
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | MilestoneCategory>('all');
  const [inspectedMilestone, setInspectedMilestone] = useState<EvaluatedMilestone | null>(null);
  const [newlyUnlockedBanner, setNewlyUnlockedBanner] = useState<EvaluatedMilestone | null>(null);

  useEffect(() => {
    if (!playerScores.some((p) => p.userId === selectedUserId) && defaultSelected) {
      setSelectedUserId(defaultSelected.userId);
    }
  }, [playerScores, selectedUserId, defaultSelected]);

  const activeScore =
    playerScores.find((p) => p.userId === selectedUserId) ||
    defaultSelected ||
    playerScores[0];

  const { metrics, milestones } = useMemo(() => {
    if (!activeScore) {
      return {
        metrics: {
          attendanceDays: 0,
          attendanceStreak: 0,
          libraryVisits: 0,
          academicGpa: 0,
          exp: 0,
          gems: 0,
          battleWins: 0,
          streak: 0,
        },
        milestones: [] as EvaluatedMilestone[],
      };
    }
    return evaluatePlayerMilestones(activeScore, students, attendance, grades);
  }, [activeScore, students, attendance, grades]);

  // Detect live unlocks when metrics cross a threshold for the currently inspected student
  const prevUnlockSnapshotRef = useRef<{ userId: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    if (!activeScore) return;
    const currentUnlockedIds = new Set(
      milestones.filter((m) => m.unlocked).map((m) => m.def.id)
    );
    const prev = prevUnlockSnapshotRef.current;

    if (prev && prev.userId === activeScore.userId) {
      const freshlyUnlocked = milestones.find(
        (m) => m.unlocked && !prev.ids.has(m.def.id)
      );
      if (freshlyUnlocked) {
        setNewlyUnlockedBanner(freshlyUnlocked);
        playPowerupChimeSound();
      }
    }
    prevUnlockSnapshotRef.current = {
      userId: activeScore.userId,
      ids: currentUnlockedIds,
    };
  }, [activeScore, milestones]);

  // Auto-dismiss celebration banner after 7s
  useEffect(() => {
    if (!newlyUnlockedBanner) return;
    const timer = setTimeout(() => setNewlyUnlockedBanner(null), 7000);
    return () => clearTimeout(timer);
  }, [newlyUnlockedBanner]);

  const filteredMilestones = useMemo(() => {
    if (categoryFilter === 'all') return milestones;
    return milestones.filter((m) => m.def.category === categoryFilter);
  }, [milestones, categoryFilter]);

  const unlockedCount = milestones.filter((m) => m.unlocked).length;
  const totalCount = milestones.length;

  const categoryLabel = (cat: MilestoneCategory) => {
    if (cat === 'attendance') return lang === 'th' ? 'การเข้าเรียน' : 'Attendance';
    if (cat === 'library') return lang === 'th' ? 'ห้องสมุดดิจิทัล' : 'Library Usage';
    return lang === 'th' ? 'วิชาการ & EXP' : 'Academic & EXP';
  };

  const canSwitchStudent = currentUser?.role !== 'student' && studentScores.length > 1;

  if (!activeScore) return null;

  return (
    <section
      aria-label={lang === 'th' ? 'ระบบเหรียญตราความสำเร็จตามเป้าหมาย' : 'Milestone Achievement System'}
      className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] tracking-tight">
              {lang === 'th'
                ? 'ความสำเร็จตามเป้าหมายและเหรียญเกียรติยศ'
                : 'Student Milestone Achievements'}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono tabular-nums font-semibold text-[var(--color-text-body)]">
                {unlockedCount}/{totalCount} {lang === 'th' ? 'เหรียญที่ปลดล็อก' : 'Badges Unlocked'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeScore.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{activeScore.exp.toLocaleString()} EXP</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canSwitchStudent && (
            <select
              aria-label={lang === 'th' ? 'เลือกนักเรียน' : 'Select Student'}
              value={activeScore.userId}
              onChange={(e) => {
                setNewlyUnlockedBanner(null);
                setSelectedUserId(e.target.value);
              }}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {studentScores.map((sc) => (
                <option key={sc.userId} value={sc.userId}>
                  {sc.name}
                </option>
              ))}
            </select>
          )}

          {onQuickAttendanceForMilestone && metrics.studentId && (
            <button
              type="button"
              onClick={() =>
                onQuickAttendanceForMilestone(metrics.studentId!, activeScore.userId)
              }
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === 'th' ? 'เช็คชื่อเข้าเรียน (+1 วัน)' : 'Log Attendance (+1)'}</span>
            </button>
          )}

          {onLogLibraryVisit && (
            <button
              type="button"
              onClick={() => onLogLibraryVisit(activeScore.userId)}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เข้าใช้ห้องสมุด (+1)' : 'Log Library Visit (+1)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Animated Unlock Banner */}
      <AnimatePresence>
        {newlyUnlockedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            role="status"
            className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${
                  TIER_VISUALS[newlyUnlockedBanner.def.tier].crestBg
                } border ${
                  TIER_VISUALS[newlyUnlockedBanner.def.tier].crestBorder
                } flex items-center justify-center shrink-0 overflow-hidden milestone-badge-float`}
              >
                <span
                  aria-hidden="true"
                  className="milestone-badge-sweep absolute inset-y-0 w-6 bg-white/40 blur-[1px] pointer-events-none"
                />
                {renderMilestoneIcon(
                  newlyUnlockedBanner.def.iconKey,
                  `w-5 h-5 relative z-10 ${
                    TIER_VISUALS[newlyUnlockedBanner.def.tier].crestIcon
                  }`
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                  <span>
                    {lang === 'th'
                      ? `ปลดล็อกเหรียญใหม่: ${newlyUnlockedBanner.def.titleTh}`
                      : `New Milestone Unlocked: ${newlyUnlockedBanner.def.titleEn}`}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 truncate">
                  {lang === 'th'
                    ? `${newlyUnlockedBanner.def.descriptionTh} · โบนัส +${newlyUnlockedBanner.def.rewardExp} EXP / +${newlyUnlockedBanner.def.rewardGems} Gems`
                    : `${newlyUnlockedBanner.def.descriptionEn} · Bonus +${newlyUnlockedBanner.def.rewardExp} EXP / +${newlyUnlockedBanner.def.rewardGems} Gems`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNewlyUnlockedBanner(null)}
              aria-label={lang === 'th' ? 'ปิดแจ้งเตือนเหรียญรางวัล' : 'Dismiss unlock notification'}
              className="p-1.5 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PlayerScores Live Threshold Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-0.5">
          <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {lang === 'th' ? 'เข้าเรียนสะสม' : 'Attendance'}
          </div>
          <div className="text-base font-bold text-[var(--color-text-title)] font-mono tabular-nums">
            {metrics.attendanceDays} {lang === 'th' ? 'วัน' : 'days'}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
            {lang === 'th'
              ? `สตรีคต่อเนื่อง ${metrics.attendanceStreak} วัน`
              : `${metrics.attendanceStreak}-day streak`}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-0.5">
          <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {lang === 'th' ? 'ห้องสมุดดิจิทัล' : 'Library Usage'}
          </div>
          <div className="text-base font-bold text-[var(--color-text-title)] font-mono tabular-nums">
            {metrics.libraryVisits} {lang === 'th' ? 'ครั้ง' : 'visits'}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {lang === 'th' ? 'สืบค้น & ยืมสื่อความรู้' : 'Books & digital resources'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-0.5">
          <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {lang === 'th' ? 'ผลการเรียน (GPA)' : 'Academic GPA'}
          </div>
          <div className="text-base font-bold text-[var(--color-text-title)] font-mono tabular-nums">
            {metrics.academicGpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
            {lang === 'th'
              ? `ชนะประลอง ${metrics.battleWins} ครั้ง`
              : `${metrics.battleWins} battle wins`}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-0.5">
          <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {lang === 'th' ? 'คะแนน PlayerScores' : 'PlayerScores EXP'}
          </div>
          <div className="text-base font-bold text-[var(--color-text-title)] font-mono tabular-nums">
            {metrics.exp.toLocaleString()} EXP
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
            {metrics.gems.toLocaleString()} Gems · {activeScore.rankTitle}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {(
          [
            { id: 'all', labelTh: `ทั้งหมด (${totalCount})`, labelEn: `All (${totalCount})` },
            { id: 'attendance', labelTh: 'การเข้าเรียน (3)', labelEn: 'Attendance (3)' },
            { id: 'library', labelTh: 'ห้องสมุดดิจิทัล (3)', labelEn: 'Library Usage (3)' },
            { id: 'academic', labelTh: 'วิชาการ & EXP (3)', labelEn: 'Academic & EXP (3)' },
          ] as const
        ).map((tab) => {
          const active = categoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border border-[var(--color-border)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? tab.labelTh : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Animated Milestone Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredMilestones.map((item, idx) => {
          const tier = TIER_VISUALS[item.def.tier];
          const isDecimal = item.def.unitEn === 'GPA';
          const formattedCurrent = isDecimal
            ? item.currentValue.toFixed(2)
            : `${item.currentValue}`;
          const formattedTarget = isDecimal
            ? item.def.thresholdValue.toFixed(2)
            : `${item.def.thresholdValue}`;

          return (
            <motion.button
              key={item.def.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: idx * 0.025 }}
              whileHover={{ y: -2 }}
              onClick={() => setInspectedMilestone(item)}
              className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 cursor-pointer ${
                item.unlocked
                  ? 'bg-[var(--color-card)] border-[var(--color-primary)]/45 hover:border-[var(--color-primary)]'
                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Animated Badge Emblem */}
                <div className="relative shrink-0">
                  {item.unlocked && (
                    <span
                      aria-hidden="true"
                      className={`milestone-badge-ring absolute inset-0 rounded-xl border-2 ${tier.haloColor} pointer-events-none`}
                    />
                  )}
                  <div
                    className={`relative w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden ${
                      item.unlocked
                        ? `bg-gradient-to-br ${tier.crestBg} ${tier.crestBorder} milestone-badge-float shadow-sm`
                        : 'bg-slate-200 dark:bg-slate-800 border-[var(--color-border)] text-[var(--color-text-muted)] opacity-75'
                    }`}
                  >
                    {item.unlocked && (
                      <span
                        aria-hidden="true"
                        className="milestone-badge-sweep absolute inset-y-0 w-7 bg-white/40 blur-[1px] pointer-events-none"
                      />
                    )}
                    {renderMilestoneIcon(
                      item.def.iconKey,
                      `w-5 h-5 relative z-10 ${
                        item.unlocked ? tier.crestIcon : 'text-[var(--color-text-muted)]'
                      }`
                    )}
                  </div>
                </div>

                {/* Title & Unboxed Typographic Metadata */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? item.def.titleTh : item.def.titleEn}
                    </h3>
                    {item.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'ปลดล็อก' : 'Unlocked'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)] shrink-0">
                        <Lock className="w-3 h-3" />
                        <span>{lang === 'th' ? 'กำลังสะสม' : 'Locked'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    <span>{categoryLabel(item.def.category)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{lang === 'th' ? tier.labelTh : tier.labelEn}</span>
                  </p>

                  <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed">
                    {lang === 'th' ? item.def.descriptionTh : item.def.descriptionEn}
                  </p>
                </div>
              </div>

              {/* Threshold Progress Footer */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text-muted)]">
                    {lang === 'th' ? item.def.metricLabelTh : item.def.metricLabelEn}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[var(--color-text-title)]">
                    {formattedCurrent} / {formattedTarget}{' '}
                    {lang === 'th' ? item.def.unitTh : item.def.unitEn}
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.unlocked ? 'bg-emerald-600' : tier.barColor
                    }`}
                    style={{ width: `${item.progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
                  <span>
                    {item.def.expThreshold
                      ? `${item.currentExp.toLocaleString()}/${item.def.expThreshold.toLocaleString()} EXP`
                      : `${item.currentExp.toLocaleString()} EXP`}
                  </span>
                  <span className="font-semibold text-[var(--color-primary-text)]">
                    +{item.def.rewardExp} EXP · +{item.def.rewardGems} Gems
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Milestone Detail Inspector Modal */}
      <AnimatePresence>
        {inspectedMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.16 }}
              role="dialog"
              aria-modal="true"
              aria-label={
                lang === 'th'
                  ? inspectedMilestone.def.titleTh
                  : inspectedMilestone.def.titleEn
              }
              className="w-full max-w-md rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center overflow-hidden ${
                      inspectedMilestone.unlocked
                        ? `bg-gradient-to-br ${
                            TIER_VISUALS[inspectedMilestone.def.tier].crestBg
                          } ${
                            TIER_VISUALS[inspectedMilestone.def.tier].crestBorder
                          } milestone-badge-float`
                        : 'bg-slate-200 dark:bg-slate-800 border-[var(--color-border)]'
                    }`}
                  >
                    {inspectedMilestone.unlocked && (
                      <span
                        aria-hidden="true"
                        className="milestone-badge-sweep absolute inset-y-0 w-7 bg-white/40 blur-[1px] pointer-events-none"
                      />
                    )}
                    {renderMilestoneIcon(
                      inspectedMilestone.def.iconKey,
                      `w-6 h-6 relative z-10 ${
                        inspectedMilestone.unlocked
                          ? TIER_VISUALS[inspectedMilestone.def.tier].crestIcon
                          : 'text-[var(--color-text-muted)]'
                      }`
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {categoryLabel(inspectedMilestone.def.category)} ·{' '}
                      {lang === 'th'
                        ? TIER_VISUALS[inspectedMilestone.def.tier].labelTh
                        : TIER_VISUALS[inspectedMilestone.def.tier].labelEn}
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-title)]">
                      {lang === 'th'
                        ? inspectedMilestone.def.titleTh
                        : inspectedMilestone.def.titleEn}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedMilestone(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                {lang === 'th'
                  ? inspectedMilestone.def.descriptionTh
                  : inspectedMilestone.def.descriptionEn}
              </p>

              <div className="rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? inspectedMilestone.def.metricLabelTh
                      : inspectedMilestone.def.metricLabelEn}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[var(--color-text-title)]">
                    {inspectedMilestone.def.unitEn === 'GPA'
                      ? `${inspectedMilestone.currentValue.toFixed(2)} / ${inspectedMilestone.def.thresholdValue.toFixed(2)}`
                      : `${inspectedMilestone.currentValue} / ${inspectedMilestone.def.thresholdValue} ${
                          lang === 'th'
                            ? inspectedMilestone.def.unitTh
                            : inspectedMilestone.def.unitEn
                        }`}
                  </span>
                </div>

                {inspectedMilestone.def.expThreshold && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'เกณฑ์คะแนน PlayerScores EXP' : 'PlayerScores EXP Threshold'}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[var(--color-text-title)]">
                      {inspectedMilestone.currentExp.toLocaleString()} /{' '}
                      {inspectedMilestone.def.expThreshold.toLocaleString()} EXP
                    </span>
                  </div>
                )}

                {inspectedMilestone.def.winsThreshold && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'เกณฑ์ชัยชนะประลองความรู้' : 'Knowledge Duel Wins'}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[var(--color-text-title)]">
                      {inspectedMilestone.currentWins} / {inspectedMilestone.def.winsThreshold}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'รางวัลเกียรติยศ' : 'Milestone Reward'}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[var(--color-primary-text)]">
                    +{inspectedMilestone.def.rewardExp} EXP · +{inspectedMilestone.def.rewardGems} Gems
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <GraduationCap className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span className="text-[var(--color-text-body)]">
                    {inspectedMilestone.unlocked
                      ? lang === 'th'
                        ? 'ผ่านเกณฑ์ครบถ้วนแล้ว'
                        : 'Threshold Completed'
                      : lang === 'th'
                      ? `ความคืบหน้า ${inspectedMilestone.progressPct}%`
                      : `${inspectedMilestone.progressPct}% Complete`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedMilestone(null)}
                  className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold cursor-pointer"
                >
                  {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
