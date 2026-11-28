import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Flame,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Grid2x2,
  Lock,
  Power,
  Radio,
  Rocket,
  Search,
  SpellCheck2,
  Sprout,
  Swords,
  Trophy,
} from 'lucide-react';
import type {
  AppLanguage,
  AuthUser,
  GameControlId,
  School,
  SchoolFeatureFlags,
  UserRole,
} from '../../types';
import {
  GAME_CONTROL_CATALOG,
  GAME_CONTROL_CATEGORY_META,
  type GameControlCategoryId,
  countEnabledGames,
  getStoredPackageCatalog,
  isGameEnabledByFeatureFlags,
  normalizeGameControls,
  normalizeSchoolTier,
  setGameControlEnabled,
} from '../../lib/schoolFeatureFlags';
import { saveSchoolFeatureFlagsToDb } from '../../lib/schoolPackageStore';
import { appendAuditLog } from '../../lib/auditLog';
import { emitAppToast } from '../common/ToastProvider';

interface GameControlsPanelProps {
  activeSchool: School;
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  lang: AppLanguage;
  flags: SchoolFeatureFlags;
  onUpdateFlags: (next: SchoolFeatureFlags) => void;
  onOpenPackagesTab?: () => void;
}

const GAME_ICON_MAP: Record<GameControlId, React.ComponentType<{ className?: string }>> = {
  school_farm: Sprout,
  meteor_blaster: Rocket,
  concept_match: Grid2x2,
  word_builder: SpellCheck2,
  chrono_sort: GitBranch,
  arena_1v1: Swords,
  battle_royale_3d: Gamepad2,
  live_room: Radio,
  boss_raid: Flame,
  subject_labs: FlaskConical,
  study_streak: Trophy,
  hall_of_fame: Award,
};

export const GameControlsPanel: React.FC<GameControlsPanelProps> = ({
  activeSchool,
  currentRole,
  currentUser,
  lang,
  flags,
  onUpdateFlags,
  onOpenPackagesTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | GameControlCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const packageCatalog = useMemo(() => getStoredPackageCatalog(), []);
  const currentLevelId = normalizeSchoolTier(flags.tier || activeSchool.schoolTier || 'enterprise');
  const currentLevelConfig = useMemo(
    () => packageCatalog.find((item) => item.id === currentLevelId) || packageCatalog[packageCatalog.length - 1],
    [packageCatalog, currentLevelId]
  );

  const enabledCount = useMemo(
    () => countEnabledGames(flags, currentRole),
    [flags, currentRole]
  );

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GAME_CONTROL_CATALOG.filter((game) => {
      if (selectedCategory !== 'all' && game.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        game.labelTh.toLowerCase().includes(q) ||
        game.labelEn.toLowerCase().includes(q) ||
        game.descTh.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const isIncludedInPackage = (gameId: GameControlId): boolean => {
    if (currentRole === 'super_admin') return true;
    const desc = GAME_CONTROL_CATALOG.find((item) => item.id === gameId);
    if (!desc) return true;
    return Boolean(currentLevelConfig?.features[desc.parentFlag]) || Boolean(flags[desc.parentFlag]);
  };

  const persistNextFlags = async (
    nextFlags: SchoolFeatureFlags,
    targetLabel: string,
    details: string
  ) => {
    onUpdateFlags(nextFlags);
    const res = await saveSchoolFeatureFlagsToDb(activeSchool.id, nextFlags);
    appendAuditLog(activeSchool.id, {
      actorName: currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'Admin',
      actorRole: currentRole,
      actionType: 'feature_flags_update',
      targetLabel,
      details,
    });
    emitAppToast({
      title: targetLabel,
      message: res.warning || details,
      tone: res.warning ? 'warning' : 'success',
    });
  };

  const handleToggleSingleGame = async (gameId: GameControlId) => {
    const descriptor = GAME_CONTROL_CATALOG.find((g) => g.id === gameId);
    if (!descriptor) return;

    const currentlyEnabled = isGameEnabledByFeatureFlags(gameId, flags, currentRole);
    const nextEnabled = !currentlyEnabled;
    const canEnableParent = isIncludedInPackage(gameId);

    if (nextEnabled && !canEnableParent) {
      emitAppToast({
        title: lang === 'th' ? 'เกมนี้ถูกล็อกตามแพ็กเกจโรงเรียน' : 'Locked by school package',
        message:
          lang === 'th'
            ? `แพ็กเกจปัจจุบัน (${currentLevelConfig?.nameTh || currentLevelId}) ยังไม่รวมโมดูลนี้ กรุณาอัปเกรดเป็น Level 3+`
            : 'Upgrade to Level 3+ to unlock this game module.',
        tone: 'warning',
      });
      return;
    }

    setSavingId(gameId);
    try {
      const nextFlags = setGameControlEnabled(flags, gameId, nextEnabled, canEnableParent);
      const label = lang === 'th' ? descriptor.labelTh : descriptor.labelEn;
      await persistNextFlags(
        nextFlags,
        `${nextEnabled ? (lang === 'th' ? 'เปิดเกม' : 'Enabled') : lang === 'th' ? 'ปิดเกม' : 'Disabled'}: ${label}`,
        nextEnabled
          ? lang === 'th'
            ? 'เปิดให้นักเรียนและครูเข้าเล่นได้ตามปกติ'
            : 'Game is now accessible to school users'
          : lang === 'th'
            ? 'ซ่อนและปิดการเข้าถึงเกมนี้ชั่วคราวทั้งบนเดสก์ท็อปและมือถือ'
            : 'Game is now hidden and disabled across desktop and mobile'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkToggle = async (enableAll: boolean) => {
    setSavingId('__bulk__');
    try {
      let nextFlags: SchoolFeatureFlags = {
        ...flags,
        gameControls: { ...normalizeGameControls(flags.gameControls) },
      };

      for (const game of GAME_CONTROL_CATALOG) {
        if (enableAll) {
          if (isIncludedInPackage(game.id)) {
            nextFlags = setGameControlEnabled(nextFlags, game.id, true, true);
          }
        } else {
          nextFlags = setGameControlEnabled(nextFlags, game.id, false, false);
        }
      }

      await persistNextFlags(
        nextFlags,
        enableAll
          ? lang === 'th'
            ? 'เปิดใช้งานเกมทั้งหมดตามสิทธิ์แพ็กเกจ'
            : 'Enabled all permitted games'
          : lang === 'th'
            ? 'ปิดเกมทั้งหมดชั่วคราว'
            : 'Disabled all games temporarily',
        enableAll
          ? lang === 'th'
            ? 'เปิดให้เข้าเล่นทุกเกมที่รวมในแพ็กเกจแล้ว'
            : 'All permitted games are enabled'
          : lang === 'th'
            ? 'ปิดการแสดงผลเกมทั้งหมดสำหรับนักเรียนและครูชั่วคราว'
            : 'All games are temporarily hidden'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Summary Header Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <span>
                {lang === 'th'
                  ? 'ศูนย์ควบคุมการเปิด-ปิดเกมส์การเรียนรู้ (รายเกม)'
                  : 'Learning Games Enable/Disable Controls'}
              </span>
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {lang === 'th'
                ? 'เลือกเปิดหรือปิดเกมแต่ละรายการได้ทันที เกมที่ปิดจะถูกซ่อนจากเมนู นักเรียน ครู ทั้งเดสก์ท็อปและมือถือ'
                : 'Toggle individual games on or off. Disabled games are immediately hidden from desktop and mobile navigation.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-bold tabular-nums text-[var(--color-text-title)] px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              {lang === 'th'
                ? `เปิดอยู่ ${enabledCount} / ${GAME_CONTROL_CATALOG.length} เกม`
                : `${enabledCount} / ${GAME_CONTROL_CATALOG.length} enabled`}
            </span>
            <button
              type="button"
              disabled={savingId !== null}
              onClick={() => void handleBulkToggle(true)}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:brightness-95 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {lang === 'th' ? 'เปิดทั้งหมด' : 'Enable All'}
            </button>
            <button
              type="button"
              disabled={savingId !== null}
              onClick={() => void handleBulkToggle(false)}
              className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 text-xs font-semibold hover:brightness-95 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {lang === 'th' ? 'ปิดทั้งหมด' : 'Disable All'}
            </button>
          </div>
        </div>

        {/* Category Filter + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                selectedCategory === 'all'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? `ทั้งหมด (${GAME_CONTROL_CATALOG.length})` : `All (${GAME_CONTROL_CATALOG.length})`}
            </button>
            {GAME_CONTROL_CATEGORY_META.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {lang === 'th' ? cat.labelTh : cat.labelEn}
              </button>
            ))}
          </div>

          <label className="relative block sm:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อเกม...' : 'Search games...'}
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
            />
          </label>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredGames.map((game) => {
          const Icon = GAME_ICON_MAP[game.id] || Gamepad2;
          const isEnabled = isGameEnabledByFeatureFlags(game.id, flags, currentRole);
          const permitted = isIncludedInPackage(game.id);
          const parentModuleDisabled = flags[game.parentFlag] === false;
          const isLocked = !permitted;
          const catMeta = GAME_CONTROL_CATEGORY_META.find((c) => c.id === game.category);

          return (
            <div
              key={game.id}
              className={`rounded-xl border p-4 flex items-start justify-between gap-3 transition ${
                isEnabled
                  ? 'border-[var(--color-border)] bg-[var(--color-card)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-85'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isEnabled
                      ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-500/10 border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
                    <span className="font-semibold">
                      {lang === 'th' ? catMeta?.labelTh : catMeta?.labelEn}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-bold ${
                        isEnabled
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : isLocked
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isEnabled
                        ? lang === 'th'
                          ? 'เปิดให้เล่น'
                          : 'Active'
                        : isLocked
                          ? lang === 'th'
                            ? 'ล็อกตามแพ็กเกจ'
                            : 'Package Locked'
                          : parentModuleDisabled
                            ? lang === 'th'
                              ? 'โมดูลหลักปิดอยู่'
                              : 'Module Off'
                            : lang === 'th'
                              ? 'ปิดชั่วคราว'
                              : 'Disabled'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? game.labelTh : game.labelEn}
                  </h3>

                  <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                    {lang === 'th' ? game.descTh : game.descEn}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {isLocked ? (
                  <button
                    type="button"
                    onClick={onOpenPackagesTab}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                  >
                    <Lock className="w-3 h-3" />
                    <span>{lang === 'th' ? 'อัปเกรด' : 'Upgrade'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={lang === 'th' ? `เปิด-ปิดเกม ${game.labelTh}` : `Toggle ${game.labelEn}`}
                    disabled={savingId !== null}
                    onClick={() => void handleToggleSingleGame(game.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 ${
                      isEnabled ? 'bg-[var(--color-primary)]' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-xs text-[var(--color-text-muted)]">
          {lang === 'th' ? 'ไม่พบเกมที่ตรงกับคำค้นหา' : 'No matching games found'}
        </div>
      )}

      {/* Quick Tip Footer */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {lang === 'th'
              ? 'การตั้งค่าจะถูกบันทึกลงฐานข้อมูลโรงเรียนและมีผลกับผู้ใช้งานทุกคนในโรงเรียนทันที'
              : 'Changes are saved to your school settings and apply immediately to all school users.'}
          </span>
        </span>
        {onOpenPackagesTab && (
          <button
            type="button"
            onClick={onOpenPackagesTab}
            className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ดูสิทธิ์โมดูลแพ็กเกจทั้งหมด' : 'View All Package Modules'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
