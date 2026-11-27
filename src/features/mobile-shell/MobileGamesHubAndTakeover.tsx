import React, { useState } from 'react';
import {
  Award,
  ChevronRight,
  Coins,
  Compass,
  Flame,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Grid2x2,
  Radio,
  Rocket,
  ShoppingBag,
  SpellCheck2,
  Sprout,
  Swords,
  Trophy,
} from 'lucide-react';
import type {
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  HomeworkSubmission,
  PeriodAttendanceRecord,
  PlayerScore,
  PortfolioItem,
  QuizQuestion,
  RewardItem,
  RewardRedemptionRequest,
  School,
  Student,
  UserRole,
} from '../../types';
import arcadeBannerImg from '../../assets/images/student_arcade_banner_1794996857506.jpg';
import type { NavTab } from '../../components/layout/Sidebar';
import { ViewErrorBoundary } from '../../components/common/ViewErrorBoundary';
import { EduBattleGameView, type EduGameSubTab } from '../../views/EduBattleGameView';
import { EduBattleRoyale3DView } from '../../views/EduBattleRoyale3DView';
import { CoopBossRaidView } from '../../views/CoopBossRaidView';
import { SubjectLabSimulationView } from '../../views/SubjectLabSimulationView';
import { HallOfFame3DView } from '../../views/HallOfFame3DView';
import { SchoolFarmGameView } from '../../views/SchoolFarmGameView';
import type { ActiveGameView, MobileTab } from './types';

interface MobileGamesHubTabProps {
  currentRole: UserRole;
  lang: AppLanguage;
  currentScore: PlayerScore;
  playerScoresCount: number;
  canOpenCareerQuest: boolean;
  isModuleEnabled: (tab: NavTab) => boolean;
  openArcadeSubTab: (tab: EduGameSubTab) => void;
  setActiveGameView: (view: ActiveGameView) => void;
  setActiveTab: (tab: MobileTab) => void;
}

export const MobileGamesHubTab: React.FC<MobileGamesHubTabProps> = ({
  currentRole,
  lang,
  currentScore,
  playerScoresCount,
  canOpenCareerQuest,
  isModuleEnabled,
  openArcadeSubTab,
  setActiveGameView,
  setActiveTab,
}) => {
  const [mobileGameCategory, setMobileGameCategory] = useState<'all' | 'arcade' | 'battle' | 'lab'>('all');

  const mobileGamesList: {
    id: string;
    category: 'arcade' | 'battle' | 'lab';
    title: string;
    subtitle: string;
    tag: string;
    iconBg: string;
    iconText: string;
    icon: React.ComponentType<{ className?: string }>;
    enabled: boolean;
    onLaunch: () => void;
  }[] = (
    [
      {
        id: 'meteor_blaster',
        category: 'arcade' as const,
        title: 'Meteor Blaster',
        subtitle: 'ยิงอุกกาบาตสมการ',
        tag: 'คณิต · ฟิสิกส์',
        iconBg: 'bg-cyan-500/15',
        iconText: 'text-cyan-400',
        icon: Rocket,
        enabled: isModuleEnabled('games'),
        onLaunch: () => openArcadeSubTab('meteor_blaster'),
      },
      {
        id: 'concept_match',
        category: 'arcade' as const,
        title: 'Match & Memory',
        subtitle: 'จับคู่ & พลิกการ์ดไว',
        tag: '8 กลุ่มสาระ',
        iconBg: 'bg-violet-500/15',
        iconText: 'text-violet-400',
        icon: Grid2x2,
        enabled: isModuleEnabled('games'),
        onLaunch: () => openArcadeSubTab('concept_match'),
      },
      {
        id: 'word_builder',
        category: 'arcade' as const,
        title: 'Word Builder',
        subtitle: 'ต่อคำศัพท์สองภาษา',
        tag: 'อังกฤษ · วิทย์',
        iconBg: 'bg-amber-500/15',
        iconText: 'text-amber-400',
        icon: SpellCheck2,
        enabled: isModuleEnabled('games'),
        onLaunch: () => openArcadeSubTab('word_builder'),
      },
      {
        id: 'chrono_sort',
        category: 'arcade' as const,
        title: 'ChronoSort',
        subtitle: 'สายพานด่วน & เรียงลำดับ',
        tag: 'ตรรกะ · สังคม',
        iconBg: 'bg-emerald-500/15',
        iconText: 'text-emerald-400',
        icon: GitBranch,
        enabled: isModuleEnabled('games'),
        onLaunch: () => openArcadeSubTab('chrono_sort'),
      },
      {
        id: '1v1_arena',
        category: 'battle' as const,
        title: '1v1 Speed Duel',
        subtitle: 'ดวลตอบสด 15 วิ',
        tag: '50/50 · โล่',
        iconBg: 'bg-rose-500/15',
        iconText: 'text-rose-400',
        icon: Swords,
        enabled: isModuleEnabled('games'),
        onLaunch: () => openArcadeSubTab('arena'),
      },
      {
        id: 'battle_royale_3d',
        category: 'battle' as const,
        title: '3D Battle Royale',
        subtitle: 'ล่าหีบสมบัติเกาะ 3 มิติ',
        tag: '3D EXPLORE',
        iconBg: 'bg-indigo-500/15',
        iconText: 'text-indigo-400',
        icon: Gamepad2,
        enabled: isModuleEnabled('games'),
        onLaunch: () => setActiveGameView('battle_royale_3d'),
      },
      {
        id: 'boss_raid',
        category: 'battle' as const,
        title: 'Co-op Boss Raid',
        subtitle: 'ตีบอสประจำบทเรียน',
        tag: 'COMBO DMG',
        iconBg: 'bg-orange-500/15',
        iconText: 'text-orange-400',
        icon: Flame,
        enabled: isModuleEnabled('boss_raid'),
        onLaunch: () => setActiveGameView('boss_raid'),
      },
      {
        id: 'subject_labs',
        category: 'lab' as const,
        title: 'Subject Labs',
        subtitle: 'ทดลองเคมี ฟิสิกส์ โค้ด',
        tag: '6D LAB',
        iconBg: 'bg-sky-500/15',
        iconText: 'text-sky-400',
        icon: FlaskConical,
        enabled: isModuleEnabled('subject_labs'),
        onLaunch: () => setActiveGameView('subject_labs'),
      },
    ]
  ).filter((g) => g.enabled);

  const filteredMobileGames =
    mobileGameCategory === 'all'
      ? mobileGamesList
      : mobileGamesList.filter((g) => g.category === mobileGameCategory);

  const playerLv = Math.floor(currentScore.exp / 500) + 1;

  return (
    <div className="animate-in fade-in duration-200 space-y-4 pb-6">
      {/* Sleek Gen Z Arcade Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-[#09090B] border border-zinc-800 min-h-[148px] flex flex-col justify-end">
        <img
          src={arcadeBannerImg}
          alt={lang === 'th' ? 'ศูนย์เกมความรู้' : 'Learning Arcade'}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-transparent"
        />
        <div className="relative z-10 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-mono font-black tabular-nums">
            <span className="text-amber-400">
              LV.{playerLv}
              {(currentScore.dailyStreak || 0) > 0 ? ` · 🔥 ${currentScore.dailyStreak} วัน` : ' ARCADE'}
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-amber-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" />
                {currentScore.exp.toLocaleString()}
              </span>
              <span className="text-cyan-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {currentScore.gems}
              </span>
            </div>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">
            {lang === 'th' ? 'กดแล้วเล่นได้ทันที' : 'Tap & Play Instantly'}
          </h2>
        </div>
      </section>

      {/* Featured School Farm & Town Card */}
      {isModuleEnabled('school_farm') && (
        <button
          type="button"
          onClick={() => setActiveGameView('school_farm')}
          className="w-full p-3.5 rounded-2xl bg-[#09090B] border border-emerald-500/45 hover:border-emerald-400 text-left flex items-center justify-between gap-3 transition active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                Career Valley & Farm
              </p>
              <h3 className="text-sm font-black text-white truncate">
                {lang === 'th' ? 'เมืองอาชีพแสนสนุก (เกษตร ประมง & กิจการ)' : 'Career Valley & Farm'}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                {lang === 'th'
                  ? 'ปลูกผัก ประมง เลือกสายอาชีพ & รับทุนสร้างกิจการ'
                  : 'Crops, fishery, careers & startup capital grants'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-400 shrink-0" />
        </button>
      )}

      {/* Featured 1-Tap Live Classroom 6-Digit PIN Card */}
      {isModuleEnabled('games') && (
        <button
          type="button"
          onClick={() => openArcadeSubTab('live_room')}
          className="w-full p-3.5 rounded-2xl bg-[#09090B] border border-rose-500/45 hover:border-rose-400 text-left flex items-center justify-between gap-3 transition active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider">
                Live PIN · 6 หลัก
              </p>
              <h3 className="text-sm font-black text-white truncate">ห้องแข่งสดทั้งห้อง (Quiz & Boss)</h3>
              <p className="text-[11px] text-zinc-400 truncate">
                {currentRole === 'student'
                  ? 'กรอกรหัส PIN 6 หลักแข่งสดกับเพื่อน'
                  : 'เปิดห้องสร้างรหัส PIN 6 หลักขึ้นจอ'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-rose-400 shrink-0" />
        </button>
      )}

      {canOpenCareerQuest && (
        <button
          type="button"
          onClick={() => setActiveTab('career_quest')}
          className="w-full p-3.5 rounded-2xl bg-[#09090B] border border-violet-500/45 hover:border-violet-400 text-left flex items-center justify-between gap-3 transition active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-violet-300 uppercase tracking-wider">
                Career Quest AI
              </p>
              <h3 className="text-sm font-black text-white truncate">
                {lang === 'th' ? 'เส้นทางสู่อาชีพในฝัน & Role-Play' : 'Career Quest AI'}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                {lang === 'th'
                  ? 'Vibe Quiz 5 ข้อ · เช็กพลังความพร้อมจากเกรดจริง'
                  : '5-question quiz & real-grade readiness'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-violet-400 shrink-0" />
        </button>
      )}

      {/* Category Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'all', label: `ทั้งหมด (${mobileGamesList.length})` },
            { id: 'arcade', label: 'Arcade ไวๆ' },
            { id: 'battle', label: 'ดวล & 3D' },
            { id: 'lab', label: 'แล็บจำลอง' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setMobileGameCategory(cat.id)}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              mobileGameCategory === cat.id
                ? 'bg-zinc-900 dark:bg-amber-400 text-white dark:text-zinc-950'
                : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Direct 1-Tap Gen Z 2-Column Game Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredMobileGames.map((game) => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              type="button"
              onClick={game.onLaunch}
              className="p-3.5 rounded-2xl bg-[#09090B] border border-zinc-800 hover:border-zinc-600 text-left flex flex-col justify-between gap-3.5 transition active:scale-[0.97] cursor-pointer min-h-[132px]"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`w-10 h-10 rounded-xl ${game.iconBg} ${game.iconText} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-400 text-right leading-tight">
                  {game.tag}
                </span>
              </div>
              <div>
                <h3 className="font-black text-sm text-white leading-snug tracking-tight">{game.title}</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{game.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Clean Compact Utility Row: Leaderboard, Shop & Hall of Fame */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {isModuleEnabled('games') && (
          <>
            <button
              type="button"
              onClick={() => openArcadeSubTab('leaderboard')}
              className="min-h-[54px] px-2.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-left flex items-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[var(--color-text-title)] truncate">อันดับ</p>
                <p className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                  {playerScoresCount} คน
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openArcadeSubTab('shop')}
              className="min-h-[54px] px-2.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-left flex items-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[var(--color-text-title)] truncate">แลกของ</p>
                <p className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                  {currentScore.gems} G
                </p>
              </div>
            </button>
          </>
        )}

        {isModuleEnabled('hall_of_fame') && (
          <button
            type="button"
            onClick={() => setActiveGameView('hall_of_fame')}
            className="min-h-[54px] px-2.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-left flex items-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-[var(--color-text-title)] truncate">เกียรติยศ</p>
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">ถ้วย 3D</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

interface MobileFullscreenGameOverlayProps {
  activeGameView: Exclude<ActiveGameView, 'hub'>;
  arcadeInitialSubTab: EduGameSubTab;
  lang: AppLanguage;
  currentRole: UserRole;
  currentUser: AuthUser | null;
  activeSchool: School;
  linkedStudents: Student[];
  students?: Student[];
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  homeworkSubmissions?: HomeworkSubmission[];
  assignments?: Assignment[];
  behaviorRecords?: BehaviorRecord[];
  portfolioItems: PortfolioItem[];
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  rewardRedemptions: RewardRedemptionRequest[];
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
  onEquipCosmetic?: (payload: { frameId?: string; title?: string }) => void;
  onReviewRedemption?: (requestId: string, status: 'approved' | 'rejected', teacherNote?: string) => void;
  onCreateCustomReward?: (item: RewardItem) => void;
  onExitGame: () => void;
  onOpenPortfolio: () => void;
}

export const MobileFullscreenGameOverlay: React.FC<MobileFullscreenGameOverlayProps> = ({
  activeGameView,
  arcadeInitialSubTab,
  lang,
  currentRole,
  currentUser,
  activeSchool,
  linkedStudents,
  students = [],
  attendance = [],
  periodAttendance = [],
  homeworkSubmissions = [],
  assignments = [],
  behaviorRecords = [],
  portfolioItems,
  questions,
  playerScores,
  rewardItems,
  rewardRedemptions,
  onAddQuestion,
  onImportQuestions,
  onEarnRewards,
  onRedeemReward,
  onEquipCosmetic,
  onReviewRedemption,
  onCreateCustomReward,
  onExitGame,
  onOpenPortfolio,
}) => {
  return (
    <div className="game-immersive-root fixed inset-0 z-50 bg-[#09090B] w-full h-dvh flex flex-col overflow-hidden animate-in fade-in duration-200">
      <ViewErrorBoundary
        resetKey={`game:${activeGameView}:${arcadeInitialSubTab}`}
        lang={lang}
        viewName={`mobile-game:${activeGameView}`}
        onBackHome={onExitGame}
      >
        {activeGameView === 'school_farm' && (
          <div className="h-full w-full overflow-hidden flex flex-col bg-[var(--color-bg)]">
            <SchoolFarmGameView
              lang={lang}
              currentUser={currentUser}
              currentRole={currentRole}
              activeSchool={activeSchool}
              students={students.length > 0 ? students : linkedStudents}
              attendance={attendance}
              periodAttendance={periodAttendance}
              homeworkSubmissions={homeworkSubmissions}
              assignments={assignments}
              behaviorRecords={behaviorRecords}
              questions={questions}
              playerScores={playerScores}
              rewardItems={rewardItems}
              onEarnRewards={onEarnRewards}
              onRedeemReward={onRedeemReward}
              onExit={onExitGame}
            />
          </div>
        )}
        {activeGameView === 'battle_royale_3d' && (
          <div className="h-full w-full overflow-hidden">
            <EduBattleRoyale3DView
              questions={questions}
              currentUser={currentUser}
              lang={lang}
              rewardItems={rewardItems}
              onEarnRewards={onEarnRewards}
              onExit={onExitGame}
            />
          </div>
        )}

        {activeGameView === 'arcade_studio' && (
          <div className="h-full w-full overflow-hidden flex flex-col bg-[#09090B]">
            <EduBattleGameView
              questions={questions}
              playerScores={playerScores}
              rewardItems={rewardItems}
              rewardRedemptions={rewardRedemptions}
              currentUser={currentUser}
              lang={lang}
              initialSubTab={arcadeInitialSubTab}
              isMobileMode={true}
              onAddQuestion={onAddQuestion}
              onImportQuestions={onImportQuestions}
              onEarnRewards={onEarnRewards}
              onRedeemReward={onRedeemReward}
              onEquipCosmetic={onEquipCosmetic}
              onReviewRedemption={onReviewRedemption}
              onCreateCustomReward={onCreateCustomReward}
              onExit={onExitGame}
            />
          </div>
        )}

        {activeGameView === '1v1_arena' && (
          <div className="h-full w-full overflow-hidden flex flex-col bg-[#09090B]">
            <EduBattleGameView
              questions={questions}
              playerScores={playerScores}
              rewardItems={rewardItems}
              rewardRedemptions={rewardRedemptions}
              currentUser={currentUser}
              lang={lang}
              initialSubTab="arena"
              isMobileMode={true}
              onAddQuestion={onAddQuestion}
              onImportQuestions={onImportQuestions}
              onEarnRewards={onEarnRewards}
              onRedeemReward={onRedeemReward}
              onEquipCosmetic={onEquipCosmetic}
              onReviewRedemption={onReviewRedemption}
              onCreateCustomReward={onCreateCustomReward}
              onExit={onExitGame}
            />
          </div>
        )}

        {activeGameView === 'boss_raid' && (
          <div className="h-full w-full overflow-hidden flex flex-col bg-[#09090B]">
            <CoopBossRaidView
              questions={questions}
              lang={lang}
              currentRole={currentRole}
              currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
              schoolId={activeSchool.id}
              currentUser={currentUser}
              onEarnRewards={onEarnRewards}
              onExit={onExitGame}
            />
          </div>
        )}

        {activeGameView === 'subject_labs' && (
          <div className="h-full w-full overflow-hidden flex flex-col">
            <SubjectLabSimulationView
              currentUserRole={currentRole}
              currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
              schoolId={activeSchool.id}
              userId={currentUser?.id}
              studentId={currentUser?.studentRecordId}
              lang={lang}
              onEarnRewards={onEarnRewards}
              onBackToGames={onExitGame}
            />
          </div>
        )}

        {activeGameView === 'hall_of_fame' && (
          <div className="h-full w-full overflow-y-auto flex flex-col bg-slate-950 p-2 sm:p-4">
            <HallOfFame3DView
              lang={lang}
              school={activeSchool}
              students={linkedStudents}
              portfolioItems={portfolioItems}
              playerScores={playerScores}
              currentUser={currentUser}
              onOpenPortfolio={onOpenPortfolio}
              onExit={onExitGame}
            />
          </div>
        )}
      </ViewErrorBoundary>
    </div>
  );
};
