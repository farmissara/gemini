import React, { useEffect } from 'react';
import {
  Check,
  Clock,
  Gift,
  Lock,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { AppLanguage, QuizQuestion, RewardItem } from '../../types';
import {
  BUILDING_CATALOG,
  BUILDING_MAP,
  CROP_CATALOG,
  CROP_MAP,
  FARM_CHARACTER_PRESETS,
  LUCKY_WHEEL_REWARDS,
  PRODUCT_CATALOG,
  PRODUCT_MAP,
  calculateTownProsperity,
  getBuildingMaxQueueSlots,
  getNpcDailyQuotaStatus,
  getTownLevelFromXp,
  isCropUnlocked,
  type BuildingId,
  type CropId,
  type DailyDirtAd,
  type DisciplineChestSummary,
  type FarmAchievementDef,
  type FarmOwnerCharacter,
  type LuckyWheelSlot,
  type ProductId,
  type SchoolFarmState,
  type VisitorRequest,
} from '../../lib/schoolFarmEngine';
import {
  GardenBuildingBadgeIcon,
  GardenCafeCupIcon,
  GardenCoinCrest,
  GardenEventsIcon,
  GardenGazetteIcon,
  GardenGemCrest,
  GardenGiftBasketIcon,
  GardenItemIcon,
  GardenMortarCraftIcon,
  GardenNeighborsIcon,
  GardenStallIcon,
} from './GardenFarmIcons';
import { FarmOwnerPortraitSvg } from './HayDayHudIcons';
import { IsometricFarmBoard } from './IsometricFarmBoard';
import { LifeSubjectsMatrixPanel } from './GardenLifeSubjectOverlay';
import type { LifeSubjectId } from '../../lib/farmLifeSubjects';

export type GardenBoardKind =
  | 'craft'
  | 'cafe'
  | 'trade'
  | 'events'
  | 'town'
  | 'chest'
  | 'newspaper'
  | 'character'
  | 'guide'
  | null;

export type CafeSubTab = 'visitors' | 'orders';
export type TradeSubTab = 'seeds_barn' | 'roadside' | 'rewards';
export type EventsSubTab = 'subjects' | 'wheel' | 'achievements' | 'quiz';

export const GameFloatingBoard: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'max-w-2xl',
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 bg-black/38 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} max-h-[86dvh] flex flex-col rounded-[26px] border-2 border-[#c8a165]/90 bg-[#fcf7ec]/96 dark:bg-[#1f1912]/96 backdrop-blur-xl shadow-[0_18px_48px_rgba(10,20,8,0.5)] overflow-hidden`}
      >
        {/* Slim Wooden Header Bar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#5a3d20] via-[#6d4c2a] to-[#4f6d2f] text-amber-50 flex items-center justify-between gap-2 shrink-0 border-b border-[#d6b37c]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-amber-100/20 border border-amber-200/40 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate">{title}</h2>
              {subtitle && (
                <p className="text-[11px] text-amber-100/85 truncate tabular-nums">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-amber-50 flex items-center justify-center cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto no-scrollbar space-y-3">{children}</div>
      </div>
    </div>
  );
};

export const NpcGardenPortrait: React.FC<{ npcId: VisitorRequest['npcId'] }> = ({ npcId }) => {
  const shirt =
    npcId === 'aunt_malee'
      ? '#ec4899'
      : npcId === 'uncle_somchai'
        ? '#0284c7'
        : npcId === 'teacher_dao'
          ? '#7c3aed'
          : '#10b981';
  return (
    <svg
      viewBox="0 0 48 48"
      className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-slate-800 border border-[#d6b37c] shrink-0"
      aria-hidden="true"
    >
      <circle cx="24" cy="46" r="16" fill={shirt} />
      <circle cx="24" cy="21" r="10" fill="#fed7aa" stroke="#9a3412" strokeWidth="1.2" />
      <circle cx="20.5" cy="20" r="1.4" fill="#1e293b" />
      <circle cx="27.5" cy="20" r="1.4" fill="#1e293b" />
      <path d="M20.5 24.5 Q24 27 27.5 24.5" stroke="#9a3412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {npcId === 'aunt_malee' && <circle cx="24" cy="10" r="5" fill="#334155" />}
      {npcId === 'uncle_somchai' && (
        <>
          <ellipse cx="24" cy="13" rx="13" ry="3.6" fill="#f59e0b" stroke="#92400e" strokeWidth="1.2" />
          <path d="M16 12 Q24 4 32 12 Z" fill="#eab308" stroke="#92400e" strokeWidth="1" />
        </>
      )}
      {npcId === 'namsai' && (
        <>
          <path d="M14 19 Q24 9 34 19" stroke="#1e293b" strokeWidth="4" fill="none" />
          <circle cx="33" cy="14" r="3" fill="#f43f5e" />
        </>
      )}
      {npcId === 'teacher_dao' && (
        <>
          <rect x="17" y="18" width="6" height="4.5" rx="1.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <rect x="25" y="18" width="6" height="4.5" rx="1.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="23" y1="20" x2="25" y2="20" stroke="#1e293b" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
};

interface GardenBoardSetProps {
  activeBoard: GardenBoardKind;
  onClose: () => void;
  lang: AppLanguage;
  farmState: SchoolFarmState;
  nowMs: number;
  playerGems: number;
  todayDate: string;
  sellMultiplier: number;
  disciplineSummary: DisciplineChestSummary;
  hasGoldenStreakBuff: boolean;
  // Sub tabs
  focusBuildingId: BuildingId | null;
  setFocusBuildingId: (id: BuildingId | null) => void;
  cafeTab: CafeSubTab;
  setCafeTab: (tab: CafeSubTab) => void;
  tradeTab: TradeSubTab;
  setTradeTab: (tab: TradeSubTab) => void;
  eventsTab: EventsSubTab;
  setEventsTab: (tab: EventsSubTab) => void;
  // Crafting & queue
  onStartProduction: (productId: ProductId) => void;
  onCollectJob: (jobId: string) => void;
  onCollectAllBuilding: (buildingId: BuildingId) => void;
  onSpeedUpJob: (jobId: string) => void;
  onJumpToBuild: (buildingId: BuildingId) => void;
  // Cafe & Orders
  onFulfillVisitor: (visitorId: string) => void;
  onDismissVisitor: (visitorId: string) => void;
  onFulfillOrder: (orderId: string) => void;
  // Trade / Shop / Rewards
  roadsideItemKey: string;
  setRoadsideItemKey: (val: string) => void;
  roadsideQty: number;
  setRoadsideQty: (qty: number) => void;
  roadsidePrice: number;
  setRoadsidePrice: (price: number) => void;
  onListRoadside: () => void;
  onBuySeed: (cropId: CropId) => void;
  onSellBarn: (cropId: CropId) => void;
  onExchangeGems: () => void;
  rewardItems: RewardItem[];
  onRedeemReward: (item: RewardItem) => void;
  // Events (Wheel, Achievements, Quiz)
  wheelSpinning: boolean;
  wheelAngle: number;
  wheelWonSlot: LuckyWheelSlot | null;
  spinAvailable: boolean;
  onSpinWheel: () => void;
  achievementsList: Array<FarmAchievementDef & { current: number; completed: boolean; claimed: boolean }>;
  onClaimAchievement: (id: string) => void;
  activeQuestion?: QuizQuestion;
  quizPicked: number | null;
  quizUsedToday: number;
  onAnswerQuiz: (idx: number) => void;
  onNextQuiz: () => void;
  lifeAutoPromptEnabled: boolean;
  onToggleLifeAutoPrompt: () => void;
  onLaunchSubjectScenario: (subjectId: LifeSubjectId) => void;
  // Town / Neighbors
  neighbors: SchoolFarmState[];
  visitingNeighbor: SchoolFarmState | null;
  setVisitingNeighbor: (neighbor: SchoolFarmState | null) => void;
  isStaff: boolean;
  onHelpNeighbor: (neighbor: SchoolFarmState, tileIndex?: number) => void;
  onBuyFromNeighbor: (neighbor: SchoolFarmState, listingId: string) => void;
  onTeacherGift: (neighbor: SchoolFarmState) => void;
  // Chest, Newspaper, Character
  onClaimChest: () => void;
  onClaimBeginnerPack?: () => void;
  dailyDirtAds: DailyDirtAd[];
  onBuyDailyDirtAd: (ad: DailyDirtAd) => void;
  onOpenChest: () => void;
  charDraft: FarmOwnerCharacter;
  setCharDraft: React.Dispatch<React.SetStateAction<FarmOwnerCharacter>>;
  onSaveCharacter: () => void;
}

const PRODUCTION_FILTER_BUILDINGS: BuildingId[] = [
  'garden_cafe',
  'herbal_pavilion',
  'thai_kitchen',
  'chicken_coop',
  'dairy_barn',
  'juice_stand',
  'windmill_bakery',
  'sheep_pen',
];

export const GardenBoardSet: React.FC<GardenBoardSetProps> = ({
  activeBoard,
  onClose,
  lang,
  farmState,
  nowMs,
  playerGems,
  todayDate,
  sellMultiplier,
  disciplineSummary,
  hasGoldenStreakBuff,
  focusBuildingId,
  setFocusBuildingId,
  cafeTab,
  setCafeTab,
  tradeTab,
  setTradeTab,
  eventsTab,
  setEventsTab,
  onStartProduction,
  onCollectJob,
  onCollectAllBuilding,
  onSpeedUpJob,
  onJumpToBuild,
  onFulfillVisitor,
  onDismissVisitor,
  onFulfillOrder,
  roadsideItemKey,
  setRoadsideItemKey,
  roadsideQty,
  setRoadsideQty,
  roadsidePrice,
  setRoadsidePrice,
  onListRoadside,
  onBuySeed,
  onSellBarn,
  onExchangeGems,
  rewardItems,
  onRedeemReward,
  wheelSpinning,
  wheelAngle,
  wheelWonSlot,
  spinAvailable,
  onSpinWheel,
  achievementsList,
  onClaimAchievement,
  activeQuestion,
  quizPicked,
  quizUsedToday,
  onAnswerQuiz,
  onNextQuiz,
  lifeAutoPromptEnabled,
  onToggleLifeAutoPrompt,
  onLaunchSubjectScenario,
  neighbors,
  visitingNeighbor,
  setVisitingNeighbor,
  isStaff,
  onHelpNeighbor,
  onBuyFromNeighbor,
  onTeacherGift,
  onClaimChest,
  onClaimBeginnerPack,
  dailyDirtAds,
  onBuyDailyDirtAd,
  onOpenChest,
  charDraft,
  setCharDraft,
  onSaveCharacter,
}) => {
  const queue = farmState.productionQueue || [];
  const activeRoadsideCount = (farmState.roadsideShop || []).filter((l) => !l.sold).length;
  const totalBarnItems = (Object.values(farmState.barn) as number[]).reduce((a, b) => a + b, 0);
  const totalGoodsItems = (Object.values(farmState.goods || {}) as number[]).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* 1. PRODUCTION CHAIN & ACTIVE CRAFTING QUEUE */}
      <GameFloatingBoard
        isOpen={activeBoard === 'craft'}
        onClose={onClose}
        title={lang === 'th' ? 'สายการผลิต & คาเฟ่ในสวน' : 'Garden Cafe & Production Chain'}
        subtitle={
          lang === 'th'
            ? 'ปลูกวัตถุดิบ → แปรรูปสมุนไพร/กะทิ → ชงเครื่องดื่ม & ขนมไทย'
            : 'Harvest crops → Process bases → Brew Cafe Specialties'
        }
        icon={<GardenMortarCraftIcon className="w-6 h-6" />}
      >
        {/* Building Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setFocusBuildingId(null)}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition ${
              focusBuildingId === null
                ? 'bg-[#15803d] text-white shadow'
                : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#45270f] dark:text-amber-100 hover:bg-[#e7d4af]'
            }`}
          >
            ทั้งหมด ({PRODUCT_CATALOG.length})
          </button>
          {PRODUCTION_FILTER_BUILDINGS.map((bId) => {
            const bDef = BUILDING_MAP[bId];
            const readyCount = queue.filter((j) => j.buildingId === bId && nowMs >= j.readyAtMs).length;
            const runningCount = queue.filter((j) => j.buildingId === bId && nowMs < j.readyAtMs).length;
            const isActive = focusBuildingId === bId;
            return (
              <button
                key={bId}
                type="button"
                onClick={() => setFocusBuildingId(bId)}
                className={`min-h-[36px] px-2.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition ${
                  isActive
                    ? 'bg-[#b45309] text-white shadow'
                    : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#45270f] dark:text-amber-100 hover:bg-[#e7d4af]'
                }`}
              >
                <GardenBuildingBadgeIcon buildingId={bId} className="w-4 h-4 shrink-0" />
                <span>{bDef.nameTh}</span>
                {(readyCount > 0 || runningCount > 0) && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
                      readyCount > 0 ? 'bg-emerald-500 text-white' : 'bg-black/20 text-current'
                    }`}
                  >
                    {readyCount > 0 ? `✓${readyCount}` : runningCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Production Queue Strip */}
        {queue.length > 0 && (
          <div className="rounded-2xl border border-[#d6b37c] bg-[#f7ebd2]/85 dark:bg-stone-800/80 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#45270f] dark:text-amber-200">
                คิวกำลังผลิต ({queue.length})
              </span>
              {focusBuildingId &&
                queue.some((j) => j.buildingId === focusBuildingId && nowMs >= j.readyAtMs) && (
                  <button
                    type="button"
                    onClick={() => onCollectAllBuilding(focusBuildingId)}
                    className="min-h-[28px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                  >
                    เก็บทั้งหมด
                  </button>
                )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {queue.map((job) => {
                const prod = PRODUCT_MAP[job.productId];
                const totalMs = Math.max(1000, job.readyAtMs - job.startedAtMs);
                const elapsedMs = Math.max(0, nowMs - job.startedAtMs);
                const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
                const isReady = nowMs >= job.readyAtMs;
                const remainSec = Math.max(1, Math.ceil((job.readyAtMs - nowMs) / 1000));
                return (
                  <div
                    key={job.id}
                    className={`w-[148px] shrink-0 rounded-xl border p-2 flex flex-col gap-1.5 ${
                      isReady
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                        : 'border-[#d6b37c] bg-white/90 dark:bg-stone-900/90'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GardenItemIcon kind="product" id={job.productId} className="w-6 h-6 shrink-0" />
                      <span className="text-[11px] font-black text-[#45270f] dark:text-amber-100 truncate">
                        {prod.nameTh}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-amber-900/15 overflow-hidden">
                      <div
                        className={`h-full transition-all ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {isReady ? (
                      <button
                        type="button"
                        onClick={() => onCollectJob(job.id)}
                        className="w-full min-h-[28px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>รับเข้าคลัง</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 tabular-nums inline-flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {remainSec}s
                        </span>
                        <button
                          type="button"
                          onClick={() => onSpeedUpJob(job.id)}
                          disabled={farmState.coins < 10}
                          className="min-h-[24px] px-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-45 text-white text-[10px] font-black inline-flex items-center gap-0.5 cursor-pointer tabular-nums"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>10🪙</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recipe Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRODUCT_CATALOG.filter((p) => !focusBuildingId || p.sourceBuildingId === focusBuildingId).map((prod) => {
            const hasBuilt = farmState.tiles.some(
              (t) => t.kind === 'building' && t.buildingId === prod.sourceBuildingId
            );
            const maxSlots = getBuildingMaxQueueSlots(farmState, prod.sourceBuildingId);
            const curSlots = queue.filter((j) => j.buildingId === prod.sourceBuildingId).length;
            const hasIngredients = prod.ingredients.every((ing) =>
              ing.kind === 'crop'
                ? (farmState.barn[ing.id as CropId] || 0) >= ing.qty
                : (farmState.goods?.[ing.id as ProductId] || 0) >= ing.qty
            );
            const canQueue = hasBuilt && hasIngredients && curSlots < maxSlots;
            const ownedCount = farmState.goods?.[prod.id] || 0;

            return (
              <div
                key={prod.id}
                className="rounded-2xl border border-[#d6b37c]/80 bg-white/85 dark:bg-stone-900/80 p-2.5 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-stone-800 border border-[#d6b37c]/60 flex items-center justify-center shrink-0">
                      <GardenItemIcon kind="product" id={prod.id} className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#45270f] dark:text-amber-50 truncate">
                        {prod.nameTh} <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">×{ownedCount}</span>
                      </p>
                      <p className="text-[10px] text-[#7c5c3e] dark:text-stone-400 truncate">
                        {BUILDING_MAP[prod.sourceBuildingId].nameTh} · ⏱ {prod.craftTimeSec}s
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 tabular-nums shrink-0">
                    {prod.sellPrice}🪙
                  </span>
                </div>

                {/* Compact Ingredient Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {prod.ingredients.map((ing) => {
                    const have =
                      ing.kind === 'crop'
                        ? farmState.barn[ing.id as CropId] || 0
                        : farmState.goods?.[ing.id as ProductId] || 0;
                    const name =
                      ing.kind === 'crop'
                        ? CROP_MAP[ing.id as CropId].nameTh
                        : PRODUCT_MAP[ing.id as ProductId].nameTh;
                    const ok = have >= ing.qty;
                    return (
                      <span
                        key={`${ing.kind}-${ing.id}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold tabular-nums border ${
                          ok
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200'
                        }`}
                      >
                        <GardenItemIcon kind={ing.kind} id={ing.id} className="w-3.5 h-3.5" />
                        <span>{name}</span>
                        <span>{have}/{ing.qty}</span>
                      </span>
                    );
                  })}
                </div>

                {hasBuilt ? (
                  <button
                    type="button"
                    disabled={!canQueue}
                    onClick={() => onStartProduction(prod.id)}
                    className="w-full min-h-[34px] rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-black cursor-pointer transition"
                  >
                    {curSlots >= maxSlots
                      ? `คิวเต็ม (${curSlots}/${maxSlots})`
                      : hasIngredients
                        ? `เริ่มผลิต (${curSlots}/${maxSlots})`
                        : 'วัตถุดิบยังไม่พอ'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onJumpToBuild(prod.sourceBuildingId)}
                    className="w-full min-h-[34px] rounded-xl border border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-black cursor-pointer"
                  >
                    สร้าง {BUILDING_MAP[prod.sourceBuildingId].nameTh}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </GameFloatingBoard>

      {/* 2. GARDEN CAFE GUESTS & DELIVERY ORDERS */}
      <GameFloatingBoard
        isOpen={activeBoard === 'cafe'}
        onClose={onClose}
        title={lang === 'th' ? 'คาเฟ่ในสวน & รถส่งตลาด' : 'Garden Cafe & Delivery Orders'}
        subtitle={`เสิร์ฟแขกในสวนหรือจัดส่งตลาดเพื่อรับเหรียญ ดาว และเพชร (${playerGems}💎)`}
        icon={<GardenCafeCupIcon className="w-6 h-6" />}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCafeTab('visitors')}
            className={`flex-1 min-h-[38px] rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
              cafeTab === 'visitors'
                ? 'bg-[#b45309] text-white shadow'
                : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#45270f] dark:text-amber-100'
            }`}
          >
            <GardenCafeCupIcon className="w-4 h-4" />
            <span>ลูกค้าคาเฟ่ในสวน ({farmState.visitorQueue.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCafeTab('orders')}
            className={`flex-1 min-h-[38px] rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
              cafeTab === 'orders'
                ? 'bg-[#15803d] text-white shadow'
                : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#45270f] dark:text-amber-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>รถส่งตลาดชุมชน ({farmState.marketOrders.length})</span>
          </button>
        </div>

        {cafeTab === 'visitors' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {farmState.visitorQueue.map((vis) => {
              const have =
                vis.itemKind === 'crop'
                  ? farmState.barn[vis.itemId as CropId] || 0
                  : farmState.goods?.[vis.itemId as ProductId] || 0;
              const itemName =
                vis.itemKind === 'crop'
                  ? CROP_MAP[vis.itemId as CropId]?.nameTh
                  : PRODUCT_MAP[vis.itemId as ProductId]?.nameTh;
              const quota = getNpcDailyQuotaStatus(farmState, vis.npcId, todayDate, vis.dailyQuotaLimit || 3);
              const gemReward = vis.rewardGems ?? 2;
              const ready = have >= vis.quantity && quota.remaining > 0;
              return (
                <div
                  key={vis.id}
                  className="rounded-2xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 p-3 flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <NpcGardenPortrait npcId={vis.npcId} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-[#45270f] dark:text-amber-50 truncate">{vis.nameTh}</p>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 tabular-nums shrink-0">
                          {quota.remaining}/{quota.limit}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7c5c3e] dark:text-stone-400 line-clamp-2 mt-0.5">
                        “{vis.dialogueTh}”
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50/90 dark:bg-stone-800 border border-[#d6b37c]/60 px-2.5 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <GardenItemIcon kind={vis.itemKind} id={vis.itemId} className="w-6 h-6 shrink-0" />
                      <span className="text-xs font-black text-[#45270f] dark:text-amber-100 truncate tabular-nums">
                        {itemName} ({have}/{vis.quantity})
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 tabular-nums shrink-0">
                      +{vis.rewardCoins}🪙 +{gemReward}💎
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDismissVisitor(vis.id)}
                      className="min-h-[36px] px-3 rounded-xl border border-[#d6b37c] text-[11px] font-bold text-[#7c5c3e] dark:text-stone-300 cursor-pointer"
                    >
                      คนถัดไป
                    </button>
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onFulfillVisitor(vis.id)}
                      className="flex-1 min-h-[36px] rounded-xl bg-[#b45309] hover:bg-[#92400e] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-black cursor-pointer transition"
                    >
                      {quota.remaining <= 0
                        ? 'ครบโควตาวันนี้'
                        : ready
                          ? 'เสิร์ฟเลย!'
                          : 'ของยังไม่พอ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {farmState.marketOrders.map((order) => {
              const crop = CROP_MAP[order.cropId];
              const ownedCrop = farmState.barn[order.cropId] || 0;
              const prod = order.productId ? PRODUCT_MAP[order.productId] : null;
              const ownedProd = order.productId ? farmState.goods?.[order.productId] || 0 : 0;
              const ready =
                ownedCrop >= order.quantity &&
                (!order.productId || !order.productQty || ownedProd >= order.productQty);
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 p-3 flex flex-col justify-between gap-2.5 ${
                    ready
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/35'
                      : 'border-[#d6b37c] bg-white/90 dark:bg-stone-900/85'
                  }`}
                >
                  <p className="text-xs font-black text-[#45270f] dark:text-amber-50 line-clamp-2">{order.titleTh}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 dark:bg-stone-800 px-2 py-1.5">
                      <GardenItemIcon kind="crop" id={order.cropId} className="w-5 h-5 shrink-0" />
                      <span className="text-[11px] font-bold text-[#45270f] dark:text-amber-100 truncate tabular-nums">
                        {crop.nameTh}: {ownedCrop}/{order.quantity}
                      </span>
                    </div>
                    {prod && order.productId && order.productQty && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 dark:bg-stone-800 px-2 py-1.5">
                        <GardenItemIcon kind="product" id={order.productId} className="w-5 h-5 shrink-0" />
                        <span className="text-[11px] font-bold text-[#45270f] dark:text-amber-100 truncate tabular-nums">
                          {prod.nameTh}: {ownedProd}/{order.productQty}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-black text-center text-amber-800 dark:text-amber-300 tabular-nums">
                      +{order.rewardCoins}🪙 · +1★ · +{order.rewardGems}💎
                    </p>
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onFulfillOrder(order.id)}
                      className="w-full min-h-[36px] rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-black inline-flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{ready ? 'ส่งตลาด!' : 'ของไม่ครบ'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GameFloatingBoard>

      {/* 3. TRADING, SEEDS, BARN & CLASSROOM REWARDS */}
      <GameFloatingBoard
        isOpen={activeBoard === 'trade'}
        onClose={onClose}
        title={lang === 'th' ? 'ร้านเมล็ด · ซุ้มหน้าสวน & คลังรางวัล' : 'Garden Market, Seeds & Rewards'}
        subtitle={`เหรียญ ${farmState.coins.toLocaleString()}🪙 · เพชร ${playerGems}💎${sellMultiplier > 1 ? ` · โบนัสเตาอบ +${Math.round((sellMultiplier - 1) * 100)}%` : ''}`}
        icon={<GardenStallIcon className="w-6 h-6" />}
      >
        <div className="flex items-center gap-1.5">
          {[
            { id: 'seeds_barn' as const, label: `เมล็ด & คลัง (${totalBarnItems + totalGoodsItems})` },
            { id: 'roadside' as const, label: `ซุ้มหน้าสวน (${activeRoadsideCount}/6)` },
            { id: 'rewards' as const, label: `รางวัลครู (${rewardItems.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTradeTab(t.id)}
              className={`flex-1 min-h-[36px] px-2 rounded-xl text-[11px] sm:text-xs font-black whitespace-nowrap cursor-pointer transition ${
                tradeTab === t.id
                  ? 'bg-[#15803d] text-white shadow'
                  : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#45270f] dark:text-amber-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tradeTab === 'seeds_barn' && (
          <div className="space-y-3">
            {!farmState.claimedBeginnerPack && onClaimBeginnerPack && (
              <div className="rounded-2xl border border-emerald-400/70 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/50 dark:to-amber-950/35 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                    ชุดเสบียงฝึกหัดมือใหม่ฟรี (Starter Boost)
                  </p>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 tabular-nums">
                    +12💧 น้ำ · +200🪙 เหรียญ · +4🌱 ปุ๋ย · +16 เมล็ดพันธุ์ · +4 ผลผลิตในคลัง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClaimBeginnerPack}
                  className="min-h-[34px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>รับชุดฝึกหัดฟรี!</span>
                </button>
              </div>
            )}
            {/* Compact Seed Shop Horizontal Strip */}
            <div className="space-y-1.5">
              <p className="text-xs font-black text-[#45270f] dark:text-amber-200">ซื้อเมล็ดพันธุ์ลงแปลง</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CROP_CATALOG.map((crop) => {
                  const unlocked = isCropUnlocked(crop.id, farmState, disciplineSummary.submittedHomeworkCount);
                  const ownedSeeds = farmState.seeds[crop.id] || 0;
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      disabled={!unlocked || farmState.coins < crop.seedCost}
                      onClick={() => onBuySeed(crop.id)}
                      className="rounded-xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 hover:bg-amber-50 disabled:opacity-45 disabled:cursor-not-allowed p-2 flex items-center justify-between gap-1.5 text-left cursor-pointer transition"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GardenItemIcon kind="crop" id={crop.id} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-[#45270f] dark:text-amber-50 truncate">
                            {crop.nameTh}
                          </p>
                          <p className="text-[10px] text-[#7c5c3e] dark:text-stone-400 tabular-nums">
                            มี {ownedSeeds} · {unlocked ? `${crop.seedCost}🪙` : `Lv.${crop.unlockTownLevel}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barn & Goods Quick Sell Grid */}
            <div className="space-y-1.5">
              <p className="text-xs font-black text-[#45270f] dark:text-amber-200">คลังผลผลิต & สินค้าแปรรูป</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CROP_CATALOG.filter((c) => (farmState.barn[c.id] || 0) > 0).map((crop) => {
                  const qty = farmState.barn[crop.id] || 0;
                  const price = Math.round(crop.sellPrice * sellMultiplier);
                  return (
                    <div
                      key={crop.id}
                      className="rounded-xl border border-[#d6b37c]/70 bg-white/85 dark:bg-stone-900/80 p-2 flex items-center justify-between gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GardenItemIcon kind="crop" id={crop.id} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-[#45270f] dark:text-amber-50 truncate">
                            {crop.nameTh}
                          </p>
                          <p className="text-[10px] text-[#7c5c3e] dark:text-stone-400 tabular-nums">คลัง {qty}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSellBarn(crop.id)}
                        className="min-h-[28px] px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black whitespace-nowrap cursor-pointer tabular-nums shrink-0"
                      >
                        ขาย +{price}🪙
                      </button>
                    </div>
                  );
                })}
                {PRODUCT_CATALOG.filter((p) => (farmState.goods?.[p.id] || 0) > 0).map((prod) => (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-950/35 p-2 flex items-center gap-1.5"
                  >
                    <GardenItemIcon kind="product" id={prod.id} className="w-6 h-6 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-[#45270f] dark:text-amber-50 truncate">
                        {prod.nameTh}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300 tabular-nums">
                        มี {farmState.goods?.[prod.id] || 0} · {prod.sellPrice}🪙
                      </p>
                    </div>
                  </div>
                ))}
                {totalBarnItems === 0 && totalGoodsItems === 0 && (
                  <p className="col-span-full text-center text-xs text-[#7c5c3e] py-4">
                    ยังไม่มีผลผลิตในคลัง ลองเก็บเกี่ยวพืชผลในสวนก่อนนะ!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tradeTab === 'roadside' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 p-2.5 grid grid-cols-1 sm:grid-cols-5 gap-2">
              <select
                value={roadsideItemKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setRoadsideItemKey(val);
                  const [kind, id] = val.split(':');
                  const unitPrice =
                    kind === 'product'
                      ? PRODUCT_MAP[id as ProductId]?.sellPrice || 50
                      : CROP_MAP[id as CropId]?.sellPrice || 25;
                  setRoadsidePrice(Math.round(unitPrice * roadsideQty * 1.15));
                }}
                className="sm:col-span-2 min-h-[36px] px-2 rounded-xl border border-[#d6b37c] bg-[#fcf7ec] dark:bg-stone-800 text-xs text-[#45270f] dark:text-amber-50"
              >
                {CROP_CATALOG.map((c) => (
                  <option key={`crop:${c.id}`} value={`crop:${c.id}`}>
                    {c.nameTh} (มี {farmState.barn[c.id] || 0})
                  </option>
                ))}
                {PRODUCT_CATALOG.map((p) => (
                  <option key={`product:${p.id}`} value={`product:${p.id}`}>
                    {p.nameTh} (มี {farmState.goods?.[p.id] || 0})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={20}
                value={roadsideQty}
                onChange={(e) => setRoadsideQty(Math.max(1, Number(e.target.value) || 1))}
                aria-label="จำนวน"
                className="min-h-[36px] px-2 rounded-xl border border-[#d6b37c] bg-[#fcf7ec] dark:bg-stone-800 text-xs tabular-nums"
              />
              <input
                type="number"
                min={1}
                max={9999}
                value={roadsidePrice}
                onChange={(e) => setRoadsidePrice(Math.max(1, Number(e.target.value) || 1))}
                aria-label="ราคาเหรียญ"
                className="min-h-[36px] px-2 rounded-xl border border-[#d6b37c] bg-[#fcf7ec] dark:bg-stone-800 text-xs tabular-nums"
              />
              <button
                type="button"
                onClick={onListRoadside}
                className="min-h-[36px] px-3 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-black inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>วางขาย</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {farmState.roadsideShop.length === 0 ? (
                <p className="col-span-full text-center text-xs text-[#7c5c3e] py-5">
                  ซุ้มหน้าสวนยังว่างอยู่ เลือกสินค้าด้านบนเพื่อวางขายให้เพื่อนร่วมโรงเรียน
                </p>
              ) : (
                farmState.roadsideShop.map((item) => {
                  const label =
                    item.itemKind === 'crop'
                      ? CROP_MAP[item.itemId as CropId]?.nameTh
                      : PRODUCT_MAP[item.itemId as ProductId]?.nameTh;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#d6b37c] bg-[#fffbeb] dark:bg-stone-900 p-2.5 flex items-center gap-2"
                    >
                      <GardenItemIcon kind={item.itemKind} id={item.itemId} className="w-7 h-7 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#45270f] dark:text-amber-50 truncate">
                          {label} ×{item.quantity}
                        </p>
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                          {item.priceCoins}🪙 · {item.sold ? 'ขายแล้ว ✓' : 'วางขายอยู่'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tradeTab === 'rewards' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-cyan-400/60 bg-cyan-50/75 dark:bg-cyan-950/35 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GardenGemCrest className="w-7 h-7 shrink-0" />
                <div>
                  <p className="text-xs font-black text-[#45270f] dark:text-cyan-100">
                    แลกเหรียญสวนเป็นเพชร ({playerGems} 💎)
                  </p>
                  <p className="text-[10px] text-[#7c5c3e] dark:text-cyan-200/80">
                    สะสมเพชรเพื่อแลกไอเทมรางวัลของคุณครู
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={farmState.coins < 50}
                onClick={onExchangeGems}
                className="min-h-[36px] px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-45 text-white text-xs font-black cursor-pointer tabular-nums"
              >
                50🪙 → +10💎
              </button>
            </div>

            {rewardItems.length === 0 ? (
              <p className="text-center text-xs text-[#7c5c3e] py-5">ยังไม่มีของรางวัลจากคุณครูในขณะนี้</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rewardItems.map((item) => {
                  const canAfford = playerGems >= item.costGems && item.stock > 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 p-3 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black text-[#45270f] dark:text-amber-50">{item.titleTh}</p>
                        <span className="text-xs font-black text-cyan-600 dark:text-cyan-300 tabular-nums shrink-0">
                          {item.costGems}💎
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7c5c3e] dark:text-stone-400 line-clamp-2">{item.descriptionTh}</p>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onRedeemReward(item)}
                        className="w-full min-h-[34px] rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-45 text-white text-xs font-black cursor-pointer"
                      >
                        {item.stock <= 0 ? 'หมดสต็อก' : canAfford ? `แลกรางวัล (${item.stock} ชิ้น)` : `ต้องการ ${item.costGems}💎`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </GameFloatingBoard>

      {/* 4. DAILY EVENTS & 8 LIFE SUBJECTS */}
      <GameFloatingBoard
        isOpen={activeBoard === 'events'}
        onClose={onClose}
        title={lang === 'th' ? 'วิชาชีวิตจริง & กิจกรรมสวน' : 'Life Subjects & Events'}
        subtitle="บูรณาการ 8 กลุ่มสาระ · วงล้อนำโชค · ภารกิจสวน"
        icon={<GardenEventsIcon className="w-6 h-6" />}
      >
        <div className="flex items-center gap-1.5">
          {[
            { id: 'subjects' as const, label: 'วิชาชีวิต (8 แขนง)' },
            { id: 'wheel' as const, label: spinAvailable ? 'วงล้อ (ฟรี!)' : 'วงล้อนำโชค' },
            {
              id: 'achievements' as const,
              label: `ภารกิจ (${achievementsList.filter((a) => a.completed && !a.claimed).length})`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEventsTab(t.id)}
              className={`flex-1 min-h-[38px] px-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer transition ${
                eventsTab === t.id || (t.id === 'subjects' && eventsTab === 'quiz')
                  ? 'bg-[#b45309] text-white shadow'
                  : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#45270f] dark:text-amber-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {eventsTab === 'wheel' && (
          <div className="flex flex-col items-center gap-3 py-1">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <div className="absolute -top-2 z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-rose-600 drop-shadow" />
              <svg
                viewBox="0 0 200 200"
                className="w-52 h-52 drop-shadow-xl"
                style={{
                  transform: `rotate(${wheelAngle}deg)`,
                  transition: wheelSpinning ? 'transform 2.65s cubic-bezier(0.12, 0.88, 0.22, 1)' : 'none',
                }}
              >
                {LUCKY_WHEEL_REWARDS.map((slot, idx) => {
                  const n = LUCKY_WHEEL_REWARDS.length;
                  const startDeg = idx * (360 / n) - 90;
                  const endDeg = (idx + 1) * (360 / n) - 90;
                  const startRad = (startDeg * Math.PI) / 180;
                  const endRad = (endDeg * Math.PI) / 180;
                  const x1 = 100 + 92 * Math.cos(startRad);
                  const y1 = 100 + 92 * Math.sin(startRad);
                  const x2 = 100 + 92 * Math.cos(endRad);
                  const y2 = 100 + 92 * Math.sin(endRad);
                  const midRad = (((startDeg + endDeg) / 2) * Math.PI) / 180;
                  const tx = 100 + 58 * Math.cos(midRad);
                  const ty = 100 + 58 * Math.sin(midRad);
                  return (
                    <g key={slot.id}>
                      <path
                        d={`M100,100 L${x1},${y1} A92,92 0 0,1 ${x2},${y2} Z`}
                        fill={slot.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={tx}
                        y={ty}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="9"
                        fontWeight="900"
                        fill="#0f172a"
                        transform={`rotate(${(startDeg + endDeg) / 2 + 90}, ${tx}, ${ty})`}
                      >
                        {slot.labelTh.slice(0, 12)}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="18" fill="#fffbeb" stroke="#78350f" strokeWidth="4" />
                <circle cx="100" cy="100" r="6" fill="#f59e0b" />
              </svg>
            </div>
            {wheelWonSlot && (
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                ยินดีด้วย! ได้รับ {wheelWonSlot.labelTh}
              </p>
            )}
            <button
              type="button"
              disabled={!spinAvailable || wheelSpinning}
              onClick={onSpinWheel}
              className="w-full max-w-xs min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-45 text-white text-xs font-black cursor-pointer"
            >
              {wheelSpinning ? 'กำลังหมุน...' : spinAvailable ? 'หมุนวงล้อฟรีวันนี้!' : 'หมุนวันนี้ไปแล้ว'}
            </button>
          </div>
        )}

        {eventsTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {achievementsList.map((ach) => {
              const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
              return (
                <div
                  key={ach.id}
                  className="rounded-2xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 p-3 flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-black text-[#45270f] dark:text-amber-50 truncate">{ach.titleTh}</p>
                      <span className="text-[11px] font-bold text-[#7c5c3e] tabular-nums">
                        {Math.min(ach.current, ach.target)}/{ach.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7c5c3e] dark:text-stone-400">{ach.descTh}</p>
                    <div className="w-full h-1.5 rounded-full bg-amber-900/15 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 tabular-nums">
                      +{ach.rewardCoins}🪙 +{ach.rewardStars}★
                    </span>
                    <button
                      type="button"
                      disabled={!ach.completed || ach.claimed}
                      onClick={() => onClaimAchievement(ach.id)}
                      className={`min-h-[30px] px-3 rounded-lg text-[11px] font-black cursor-pointer ${
                        ach.claimed
                          ? 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                          : ach.completed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-100 text-amber-800 opacity-50'
                      }`}
                    >
                      {ach.claimed ? 'รับแล้ว ✓' : ach.completed ? 'รับรางวัล' : 'ยังไม่ครบ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {eventsTab === 'subjects' && (
          <LifeSubjectsMatrixPanel
            farmState={farmState}
            lifeAutoPromptEnabled={lifeAutoPromptEnabled}
            onToggleLifeAutoPrompt={onToggleLifeAutoPrompt}
            onLaunchSubjectScenario={onLaunchSubjectScenario}
          />
        )}

        {eventsTab === 'quiz' && activeQuestion && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 p-3 space-y-2">
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                คลังควิซจากครู · {activeQuestion.subject} · โควตาวันนี้ {quizUsedToday}/3 (ตอบถูก +2💧 +1✨ +18🪙)
              </p>
              <p className="text-xs sm:text-sm font-black text-[#45270f] dark:text-amber-50">
                {activeQuestion.questionTh}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = quizPicked === idx;
                  const isCorrect = idx === activeQuestion.correctIndex;
                  let cls = 'border-[#d6b37c] bg-white dark:bg-stone-900 text-[#45270f] dark:text-amber-50 hover:bg-amber-50';
                  if (quizPicked !== null) {
                    if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-900';
                    else if (isSelected) cls = 'border-rose-500 bg-rose-50 text-rose-900';
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={quizPicked !== null}
                      onClick={() => onAnswerQuiz(idx)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-bold cursor-pointer transition ${cls}`}
                    >
                      {idx + 1}. {opt}
                    </button>
                  );
                })}
              </div>
              {quizPicked !== null && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-[#7c5c3e] dark:text-stone-300 flex-1">{activeQuestion.explanationTh}</p>
                  <button
                    type="button"
                    onClick={onNextQuiz}
                    className="min-h-[36px] px-4 rounded-xl bg-sky-600 text-white text-xs font-black cursor-pointer shrink-0"
                  >
                    ข้อถัดไป
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </GameFloatingBoard>

      {/* 5. NEIGHBORS GARDEN VISIT */}
      <GameFloatingBoard
        isOpen={activeBoard === 'town'}
        onClose={() => {
          setVisitingNeighbor(null);
          onClose();
        }}
        title={visitingNeighbor ? `สวนของ ${visitingNeighbor.ownerName}` : 'เยี่ยมชมสวนเพื่อนร่วมโรงเรียน'}
        subtitle={
          visitingNeighbor
            ? `Lv.${getTownLevelFromXp(visitingNeighbor.farmXp).level} · แตะแปลงเพื่อนช่วยรดน้ำหรือเลือกซื้อของจากซุ้มหน้าสวน`
            : 'ช่วยรดน้ำรับ +15🪙 +12 XP และแวะอุดหนุนผลผลิตจากซุ้มของเพื่อน'
        }
        icon={<GardenNeighborsIcon className="w-6 h-6" />}
        maxWidth="max-w-3xl"
      >
        {visitingNeighbor ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisitingNeighbor(null)}
                className="min-h-[34px] px-3 rounded-xl border border-[#d6b37c] bg-white/90 text-xs font-bold cursor-pointer"
              >
                ← รายชื่อเพื่อน
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onHelpNeighbor(visitingNeighbor)}
                  className="min-h-[34px] px-3 rounded-xl bg-sky-600 text-white text-xs font-black cursor-pointer"
                >
                  ช่วยรดน้ำสวนเพื่อน 💧
                </button>
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => onTeacherGift(visitingNeighbor)}
                    className="min-h-[34px] px-3 rounded-xl bg-amber-500 text-white text-xs font-black cursor-pointer"
                  >
                    ครูส่งกล่องกำลังใจ 🎁
                  </button>
                )}
              </div>
            </div>

            <IsometricFarmBoard
              tiles={visitingNeighbor.tiles}
              selectedTileIndex={null}
              activeTool="water"
              todayDate={todayDate}
              farmName={visitingNeighbor.farmName}
              ownerName={visitingNeighbor.ownerName}
              ownerCharacter={visitingNeighbor.ownerCharacter}
              readOnly
              allowNeighborCropWater
              feedbacks={[]}
              lang={lang}
              onTileActivate={(tileIdx) => onHelpNeighbor(visitingNeighbor, tileIdx)}
            />

            {(visitingNeighbor.roadsideShop || []).some((l) => !l.sold) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visitingNeighbor.roadsideShop
                  .filter((l) => !l.sold)
                  .map((listing) => {
                    const label =
                      listing.itemKind === 'crop'
                        ? CROP_MAP[listing.itemId as CropId]?.nameTh
                        : PRODUCT_MAP[listing.itemId as ProductId]?.nameTh;
                    return (
                      <div
                        key={listing.id}
                        className="rounded-xl border border-[#d6b37c] bg-white/90 p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GardenItemIcon kind={listing.itemKind} id={listing.itemId} className="w-6 h-6 shrink-0" />
                          <span className="text-xs font-black truncate">
                            {label} ×{listing.quantity}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={farmState.coins < listing.priceCoins}
                          onClick={() => onBuyFromNeighbor(visitingNeighbor, listing.id)}
                          className="min-h-[32px] px-3 rounded-lg bg-emerald-600 disabled:opacity-45 text-white text-xs font-black cursor-pointer"
                        >
                          ซื้อ {listing.priceCoins}🪙
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : neighbors.length === 0 ? (
          <p className="text-center text-xs text-[#7c5c3e] py-6">ยังไม่มีสวนของเพื่อนในโรงเรียนนี้</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {neighbors.map((n) => {
              const isMe = n.userId === farmState.userId;
              const nLv = getTownLevelFromXp(n.farmXp).level;
              const nScore = calculateTownProsperity(n);
              const shopActive = (n.roadsideShop || []).filter((l) => !l.sold).length;
              return (
                <div
                  key={n.userId}
                  className="rounded-2xl border border-[#d6b37c] bg-white/90 dark:bg-stone-900/85 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#45270f] dark:text-amber-50 truncate">
                      {n.farmName} {isMe ? '(สวนของฉัน)' : ''}
                    </p>
                    <p className="text-[11px] text-[#7c5c3e] dark:text-stone-400 truncate tabular-nums">
                      {n.ownerName} · Lv.{nLv} · คะแนน {nScore}
                      {shopActive > 0 ? ` · ร้าน (${shopActive})` : ''}
                    </p>
                  </div>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => setVisitingNeighbor(n)}
                      className="min-h-[34px] px-3 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-black inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>เยี่ยมชม</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GameFloatingBoard>

      {/* 6. DISCIPLINE CHEST */}
      <GameFloatingBoard
        isOpen={activeBoard === 'chest'}
        onClose={onClose}
        title={lang === 'th' ? 'กล่องเสบียงจากวินัยการเรียน' : 'Daily Discipline Supplies'}
        subtitle="เข้าเรียนตรงเวลา > 5 วัน ปลดล็อกปุ๋ยทองคำโตไว ×2 อัตโนมัติ"
        icon={<GardenGiftBasketIcon className="w-6 h-6" />}
        maxWidth="max-w-lg"
      >
        {hasGoldenStreakBuff && (
          <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-black text-amber-900 dark:text-amber-200">
              ปุ๋ยทองคำโตไว ×2 เปิดใช้งานอยู่ ({disciplineSummary.attendanceStreakDays} วันติด)
            </p>
          </div>
        )}
        <div className="space-y-2 text-xs">
          <div className="rounded-xl bg-white/85 dark:bg-stone-900/80 border border-[#d6b37c]/60 px-3 py-2 flex items-center justify-between">
            <span>เช็กชื่อเข้าเรียนวันนี้</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
              {disciplineSummary.attendanceStatusToday === 'present'
                ? `ตรงเวลา (${disciplineSummary.attendanceStreakDays} วันติด)`
                : disciplineSummary.attendanceStatusToday === 'late'
                  ? 'มาสาย'
                  : disciplineSummary.attendanceStatusToday === 'absent'
                    ? 'ขาดเรียน'
                    : 'ยังไม่มีข้อมูลวันนี้'}
            </span>
          </div>
          <div className="rounded-xl bg-white/85 dark:bg-stone-900/80 border border-[#d6b37c]/60 px-3 py-2 flex items-center justify-between">
            <span>การบ้าน & ความดี</span>
            <span className="font-black text-amber-800 dark:text-amber-300 tabular-nums">
              ส่งงาน {disciplineSummary.submittedHomeworkCount} · ความดี +{disciplineSummary.totalMeritPoints}
            </span>
          </div>
          {disciplineSummary.homeworkBonusLocked && (
            <p className="text-[11px] text-amber-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">งานค้าง: {disciplineSummary.pendingHomeworkTitles.join(', ')}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClaimChest}
          className={`w-full min-h-[42px] rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 cursor-pointer transition ${
            disciplineSummary.hasAnythingToClaim
              ? 'bg-[#15803d] hover:bg-[#166534] text-white shadow'
              : 'bg-[#f1e4c9] dark:bg-stone-800 text-[#7c5c3e]'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>
            {disciplineSummary.hasAnythingToClaim
              ? `เปิดรับเสบียง (+${disciplineSummary.claimableWater}💧 +${disciplineSummary.claimableDailyFertilizer}🌱 +${disciplineSummary.claimableFertilizer}✨ +${disciplineSummary.claimableStars}★)`
              : 'รับเสบียงรอบล่าสุดครบแล้ว'}
          </span>
        </button>

        {!farmState.claimedBeginnerPack && onClaimBeginnerPack && (
          <div className="rounded-2xl border border-emerald-400/75 bg-emerald-50/90 dark:bg-emerald-950/40 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                ของขวัญต้อนรับผู้เล่นฝึกหัดมือใหม่ 🎁
              </p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 tabular-nums">
                +12💧 น้ำ · +200🪙 · +4🌱 ปุ๋ย · +3★ · เมล็ดข้าว-อัญชัน-ใบเตย-มะพร้าว-มะม่วง +16 ถุง
              </p>
            </div>
            <button
              type="button"
              onClick={onClaimBeginnerPack}
              className="min-h-[36px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shrink-0 shadow"
            >
              รับชุดมือใหม่ฟรี
            </button>
          </div>
        )}
      </GameFloatingBoard>

      {/* 7. DAILY DIRT GAZETTE */}
      <GameFloatingBoard
        isOpen={activeBoard === 'newspaper'}
        onClose={onClose}
        title={lang === 'th' ? 'ข่าวตลาดชุมชนในสวน' : 'Garden Market Gazette'}
        subtitle="สินค้าลดราคาจากสวนเพื่อนบ้านและพ่อค้าชุมชน"
        icon={<GardenGazetteIcon className="w-6 h-6" />}
      >
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-50/75 dark:bg-emerald-950/35 px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
            {disciplineSummary.hasAnythingToClaim ? 'กล่องเสบียงวินัยพร้อมเปิดรับ!' : 'ดูสินค้าราคาพิเศษประจำวัน'}
          </span>
          <button
            type="button"
            onClick={onOpenChest}
            className="min-h-[32px] px-3 rounded-lg bg-[#15803d] text-white text-[11px] font-black cursor-pointer"
          >
            กล่องเสบียง
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {dailyDirtAds.map((ad) => {
            const itemName =
              ad.itemKind === 'crop'
                ? CROP_MAP[ad.itemId as CropId]?.nameTh
                : PRODUCT_MAP[ad.itemId as ProductId]?.nameTh;
            return (
              <div
                key={ad.id}
                className="rounded-2xl border border-dashed border-[#c8a165] bg-white/90 dark:bg-stone-900/85 p-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GardenItemIcon kind={ad.itemKind} id={ad.itemId} className="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#45270f] dark:text-amber-50 truncate">
                      {itemName} ×{ad.quantity}
                    </p>
                    <p className="text-[10px] text-[#7c5c3e] dark:text-stone-400 truncate">
                      {ad.farmName} ({ad.sellerName})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={farmState.coins < ad.priceCoins}
                  onClick={() => onBuyDailyDirtAd(ad)}
                  className="min-h-[34px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-45 text-white text-xs font-black cursor-pointer tabular-nums shrink-0"
                >
                  {ad.priceCoins}🪙
                </button>
              </div>
            );
          })}
        </div>
      </GameFloatingBoard>

      {/* 8. OWNER CHARACTER WARDROBE */}
      <GameFloatingBoard
        isOpen={activeBoard === 'character'}
        onClose={onClose}
        title={lang === 'th' ? 'แต่งตัวเจ้าของสวน' : 'Garden Owner Style'}
        subtitle="เลือกหมวกและชุดคู่ใจสำหรับเดินดูแลสวนคาเฟ่"
        maxWidth="max-w-lg"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-[#d6b37c] bg-white/85 dark:bg-stone-900/80 p-3">
          <FarmOwnerPortraitSvg character={charDraft} className="w-16 h-16 rounded-full border-2 border-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-black text-[#45270f] dark:text-amber-50 truncate">{farmState.ownerName}</p>
            <p className="text-xs text-[#7c5c3e] dark:text-stone-400">
              {FARM_CHARACTER_PRESETS.find((p) => p.id === charDraft.styleId)?.nameTh}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FARM_CHARACTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setCharDraft({ ...preset.defaultCharacter })}
              className={`p-2 rounded-xl border-2 flex items-center gap-2 text-left cursor-pointer ${
                charDraft.styleId === preset.id
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-[#d6b37c]/60 bg-white/85 dark:bg-stone-900/80'
              }`}
            >
              <FarmOwnerPortraitSvg character={preset.defaultCharacter} className="w-9 h-9 rounded-full shrink-0" />
              <span className="text-[11px] font-black text-[#45270f] dark:text-amber-50 leading-tight">{preset.nameTh}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            {['#facc15', '#86efac', '#fb923c', '#38bdf8', '#f472b6'].map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`หมวก ${hex}`}
                onClick={() => setCharDraft((p) => ({ ...p, hatColor: hex }))}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${charDraft.hatColor === hex ? 'border-slate-900 scale-110' : 'border-white'}`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {['#2563eb', '#059669', '#e11d48', '#d97706', '#7c3aed'].map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`ชุด ${hex}`}
                onClick={() => setCharDraft((p) => ({ ...p, outfitColor: hex }))}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${charDraft.outfitColor === hex ? 'border-slate-900 scale-110' : 'border-white'}`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSaveCharacter}
            className="min-h-[36px] px-4 rounded-xl bg-[#15803d] text-white text-xs font-black cursor-pointer"
          >
            บันทึก
          </button>
        </div>
      </GameFloatingBoard>

      {/* 9. COMPACT GAME GUIDE */}
      <GameFloatingBoard
        isOpen={activeBoard === 'guide'}
        onClose={onClose}
        title={lang === 'th' ? 'คู่มือสวนคาเฟ่ & เกษตรผสมผสาน' : 'Garden Cafe Guide'}
        maxWidth="max-w-lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-xl border border-[#d6b37c]/70 bg-white/85 dark:bg-stone-900/80 p-3 space-y-1">
            <p className="font-black text-emerald-700 dark:text-emerald-300">1. ห่วงโซ่เกษตร → คาเฟ่</p>
            <p className="text-[11px] text-[#7c5c3e] dark:text-stone-300">
              ปลูกอัญชัน ใบเตย มะพร้าว มะม่วง → แปรรูปที่ศาลาชาสมุนไพร / ครัวขนมไทย → ชงเสิร์ฟที่คาเฟ่ในสวน
            </p>
          </div>
          <div className="rounded-xl border border-[#d6b37c]/70 bg-white/85 dark:bg-stone-900/80 p-3 space-y-1">
            <p className="font-black text-amber-700 dark:text-amber-300">2. เสิร์ฟลูกค้า & ขายริมสวน</p>
            <p className="text-[11px] text-[#7c5c3e] dark:text-stone-300">
              แตะโต๊ะคาเฟ่หรือรถส่งของเพื่อขายผลผลิตและเครื่องดื่ม รับเหรียญ ดาว และเพชรไปแลกรางวัลครู
            </p>
          </div>
          <div className="rounded-xl border border-[#d6b37c]/70 bg-white/85 dark:bg-stone-900/80 p-3 space-y-1">
            <p className="font-black text-sky-700 dark:text-sky-300">3. วินัยเรียนช่วยสวนโต</p>
            <p className="text-[11px] text-[#7c5c3e] dark:text-stone-300">
              เช็กชื่อตรงเวลา ส่งการบ้าน และสะสมความดี เปิดกล่องเสบียงรับน้ำ ปุ๋ยทองคำ ×2 และพิมพ์เขียวใหม่
            </p>
          </div>
          <div className="rounded-xl border border-[#d6b37c]/70 bg-white/85 dark:bg-stone-900/80 p-3 space-y-1">
            <p className="font-black text-indigo-700 dark:text-indigo-300">4. เล่นไวสไตล์เกม</p>
            <p className="text-[11px] text-[#7c5c3e] dark:text-stone-300">
              แตะหรือลากนิ้วผ่านแปลงเพื่อรดน้ำ-เก็บเกี่ยวรวดเดียว และแตะบนอาคารผลิตเพื่อรับสินค้าที่เสร็จทันที
            </p>
          </div>
        </div>
      </GameFloatingBoard>
    </>
  );
};
