import type {
  Assignment,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  HomeworkSubmission,
  PeriodAttendanceRecord,
  Student,
} from '../types';

export type CropId =
  | 'corn'
  | 'carrot'
  | 'tomato'
  | 'strawberry'
  | 'sunflower'
  | 'jasmine_rice'
  | 'pumpkin'
  | 'golden_melon';

export type ProductId =
  | 'egg'
  | 'milk'
  | 'wool'
  | 'bread'
  | 'berry_smoothie'
  | 'berry_cake'
  | 'pumpkin_pie';

export type BuildingId =
  | 'chicken_coop'
  | 'town_fountain'
  | 'farm_cottage'
  | 'dairy_barn'
  | 'sheep_pen'
  | 'school_greenhouse'
  | 'windmill_bakery'
  | 'juice_stand'
  | 'wooden_fence'
  | 'cobble_path';

export type FarmTool =
  | 'inspect'
  | 'till'
  | 'plant'
  | 'water'
  | 'daily_fertilize'
  | 'fertilize'
  | 'harvest'
  | 'clear_weed'
  | 'build'
  | 'unlock';

export interface CropDefinition {
  id: CropId;
  nameTh: string;
  nameEn: string;
  watersNeeded: number;
  seedCost: number;
  sellPrice: number;
  xpReward: number;
  unlockTownLevel: number;
  minHomeworkCount?: number;
  accentColor: string;
  descTh: string;
  descEn: string;
}

export interface ProductDefinition {
  id: ProductId;
  nameTh: string;
  nameEn: string;
  sourceBuildingId: BuildingId;
  ingredients: Array<{ kind: 'crop' | 'product'; id: CropId | ProductId; qty: number }>;
  sellPrice: number;
  xpReward: number;
  accentColor: string;
  descTh: string;
}

export interface BuildingDefinition {
  id: BuildingId;
  nameTh: string;
  nameEn: string;
  category: 'production' | 'landmark' | 'decor';
  coinCost: number;
  starCost: number;
  unlockTownLevel: number;
  dailyCoins: number;
  dailyFertilizer?: number;
  cropSellBonusPct?: number;
  prosperityPoints: number;
  maxLevel: number;
  descTh: string;
  descEn: string;
}

export interface FarmTile {
  index: number;
  row: number;
  col: number;
  unlocked: boolean;
  tilled?: boolean;
  kind: 'empty' | 'crop' | 'building' | 'weed';
  cropId?: CropId;
  growthProgress?: number; // 0..watersNeeded
  wateredToday?: boolean;
  fertilized?: boolean;
  buildingId?: BuildingId;
  buildingLevel?: number;
  lastCollectedDate?: string;
  weedSourceId?: string;
  weedVariant?: 'weed' | 'pest';
  weedReasonTh?: string;
}

export interface MarketOrder {
  id: string;
  titleTh: string;
  titleEn: string;
  cropId: CropId;
  quantity: number;
  productId?: ProductId;
  productQty?: number;
  rewardCoins: number;
  rewardXp: number;
  rewardGems: number;
}

export interface VisitorRequest {
  id: string;
  npcId: 'uncle_somchai' | 'aunt_malee' | 'namsai' | 'teacher_dao';
  nameTh: string;
  roleTh: string;
  dialogueTh: string;
  itemKind: 'crop' | 'product';
  itemId: CropId | ProductId;
  quantity: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface RoadsideListing {
  id: string;
  itemKind: 'crop' | 'product';
  itemId: CropId | ProductId;
  quantity: number;
  priceCoins: number;
  sold: boolean;
  buyerName?: string;
}

export interface SchoolFarmState {
  version: 1;
  gridSize: 6 | 8;
  userId: string;
  schoolId: string;
  studentId?: string;
  ownerName: string;
  ownerRoom?: string;
  farmName: string;
  coins: number;
  water: number;
  dailyFertilizer: number;
  fertilizer: number;
  townStars: number;
  farmXp: number;
  seeds: Record<CropId, number>;
  barn: Record<CropId, number>;
  goods: Record<ProductId, number>;
  tiles: FarmTile[];
  marketOrders: MarketOrder[];
  visitorQueue: VisitorRequest[];
  roadsideShop: RoadsideListing[];
  unlockedBlueprints: BuildingId[];
  claimedAttendanceDates: string[];
  claimedHomeworkIds: string[];
  claimedHomeworkMasteryCount: number;
  claimedMeritIds: string[];
  resolvedDemeritIds: string[];
  lastQuizBoostDate: string;
  quizBoostCountToday: number;
  helpedNeighborDates: Record<string, string>; // neighborUserId -> YYYY-MM-DD
  helpReceivedDates: string[];
  totalHarvested: number;
  totalOrdersCompleted: number;
  soundMuted: boolean;
  updatedAt: string;
}

export interface DisciplineChestSummary {
  todayDate: string;
  matchedStudentId?: string;
  attendanceStatusToday: 'present' | 'late' | 'absent' | 'none';
  attendanceStreakDays: number;
  submittedHomeworkCount: number;
  pendingHomeworkCount: number;
  pendingHomeworkTitles: string[];
  homeworkBonusLocked: boolean;
  totalMeritPoints: number;
  unresolvedDemeritIds: string[];
  unresolvedDemerits: Array<{ id: string; reasonTh: string }>;
  claimableWater: number;
  claimableDailyFertilizer: number;
  claimableFertilizer: number;
  claimableSeeds: Partial<Record<CropId, number>>;
  claimableBlueprints: BuildingId[];
  claimableStars: number;
  claimableCoins: number;
  newAttendanceDateToClaim: string | null;
  newHomeworkIdsToClaim: string[];
  newMeritIdsToClaim: string[];
  canClaimHomeworkMasteryPack: boolean;
  hasAnythingToClaim: boolean;
}

export const FARM_GRID_SIZE = 6;
export const EXPANDED_FARM_GRID_SIZE = 8;

export const CROP_CATALOG: CropDefinition[] = [
  {
    id: 'corn',
    nameTh: 'ข้าวโพดหวาน',
    nameEn: 'Sweet Corn',
    watersNeeded: 2,
    seedCost: 10,
    sellPrice: 28,
    xpReward: 12,
    unlockTownLevel: 1,
    accentColor: '#eab308',
    descTh: 'โตไว ใช้เลี้ยงไก่และส่งตลาด (2 ครั้งรดน้ำ)',
    descEn: 'Fast-growing staple crop (2 waters)',
  },
  {
    id: 'carrot',
    nameTh: 'แครอทกรอบ',
    nameEn: 'Crisp Carrot',
    watersNeeded: 2,
    seedCost: 13,
    sellPrice: 36,
    xpReward: 14,
    unlockTownLevel: 1,
    accentColor: '#fb923c',
    descTh: 'ปลูกง่าย ใช้เลี้ยงวัวนมและแปรรูป (2 ครั้งรดน้ำ)',
    descEn: 'Crunchy starter root crop (2 waters)',
  },
  {
    id: 'tomato',
    nameTh: 'มะเขือเทศเชอร์รี',
    nameEn: 'Cherry Tomato',
    watersNeeded: 2,
    seedCost: 16,
    sellPrice: 44,
    xpReward: 16,
    unlockTownLevel: 1,
    accentColor: '#ef4444',
    descTh: 'ผลดก สีสด ขายดีในตลาดโรงเรียน',
    descEn: 'Juicy red crop favored by school orders',
  },
  {
    id: 'strawberry',
    nameTh: 'สตรอว์เบอร์รีสวนเรียน',
    nameEn: 'Campus Strawberry',
    watersNeeded: 3,
    seedCost: 26,
    sellPrice: 74,
    xpReward: 24,
    unlockTownLevel: 1,
    minHomeworkCount: 1,
    accentColor: '#f43f5e',
    descTh: 'ปลดล็อกเมื่อส่งการบ้านอย่างน้อย 1 งาน',
    descEn: 'Unlocked by submitting at least 1 homework',
  },
  {
    id: 'sunflower',
    nameTh: 'ดอกทานตะวัน',
    nameEn: 'Bright Sunflower',
    watersNeeded: 3,
    seedCost: 30,
    sellPrice: 86,
    xpReward: 28,
    unlockTownLevel: 2,
    accentColor: '#facc15',
    descTh: 'บานสะพรั่งดึงดูดผึ้ง เพิ่มความสดใสให้เมือง',
    descEn: 'Radiant bloom unlocked at Town Lv.2',
  },
  {
    id: 'jasmine_rice',
    nameTh: 'ข้าวหอมมะลิ',
    nameEn: 'Jasmine Rice',
    watersNeeded: 3,
    seedCost: 32,
    sellPrice: 92,
    xpReward: 30,
    unlockTownLevel: 2,
    accentColor: '#84cc16',
    descTh: 'วัตถุดิบหลักสำหรับอบขนมปังในเบเกอรี่',
    descEn: 'Golden grain unlocked at Town Lv.2',
  },
  {
    id: 'pumpkin',
    nameTh: 'ฟักทองยักษ์',
    nameEn: 'Giant Pumpkin',
    watersNeeded: 4,
    seedCost: 48,
    sellPrice: 138,
    xpReward: 42,
    unlockTownLevel: 3,
    accentColor: '#f97316',
    descTh: 'ผลใหญ่ราคาสูง ใช้ทำพายฟักทอง',
    descEn: 'High-value harvest unlocked at Town Lv.3',
  },
  {
    id: 'golden_melon',
    nameTh: 'เมล่อนทองคำ',
    nameEn: 'Golden Melon',
    watersNeeded: 4,
    seedCost: 75,
    sellPrice: 215,
    xpReward: 65,
    unlockTownLevel: 4,
    minHomeworkCount: 3,
    accentColor: '#f59e0b',
    descTh: 'ผลไม้ระดับพรีเมียมสำหรับนักเรียนวินัยเยี่ยม',
    descEn: 'Premium fruit unlocked at Town Lv.4 & 3 homework',
  },
];

export const PRODUCT_CATALOG: ProductDefinition[] = [
  {
    id: 'egg',
    nameTh: 'ไข่ไก่สด',
    nameEn: 'Fresh Farm Egg',
    sourceBuildingId: 'chicken_coop',
    ingredients: [{ kind: 'crop', id: 'corn', qty: 1 }],
    sellPrice: 52,
    xpReward: 18,
    accentColor: '#fef3c7',
    descTh: 'ป้อนข้าวโพด 1 ฝักให้แม่ไก่ เพื่อเก็บไข่สด',
  },
  {
    id: 'milk',
    nameTh: 'นมสดโรงเรียน',
    nameEn: 'Fresh Dairy Milk',
    sourceBuildingId: 'dairy_barn',
    ingredients: [{ kind: 'crop', id: 'carrot', qty: 1 }],
    sellPrice: 74,
    xpReward: 24,
    accentColor: '#e0f2fe',
    descTh: 'ป้อนแครอท 1 หัวให้วัวนม เพื่อรีดนมสด',
  },
  {
    id: 'wool',
    nameTh: 'ขนแกะนุ่ม',
    nameEn: 'Fluffy Wool',
    sourceBuildingId: 'sheep_pen',
    ingredients: [{ kind: 'crop', id: 'corn', qty: 1 }],
    sellPrice: 80,
    xpReward: 26,
    accentColor: '#f1f5f9',
    descTh: 'เลี้ยงแกะด้วยข้าวโพด 1 ฝัก เพื่อตัดขนแกะ',
  },
  {
    id: 'bread',
    nameTh: 'ขนมปังโฮมเมด',
    nameEn: 'Artisan Bread',
    sourceBuildingId: 'windmill_bakery',
    ingredients: [
      { kind: 'crop', id: 'corn', qty: 1 },
      { kind: 'product', id: 'egg', qty: 1 },
    ],
    sellPrice: 125,
    xpReward: 38,
    accentColor: '#f59e0b',
    descTh: 'อบจากข้าวโพด + ไข่ไก่สด ขายได้ราคาดีมาก',
  },
  {
    id: 'berry_smoothie',
    nameTh: 'สมูทตี้สตรอว์เบอร์รี',
    nameEn: 'Berry Smoothie',
    sourceBuildingId: 'juice_stand',
    ingredients: [
      { kind: 'crop', id: 'strawberry', qty: 1 },
      { kind: 'crop', id: 'tomato', qty: 1 },
    ],
    sellPrice: 165,
    xpReward: 46,
    accentColor: '#fb7185',
    descTh: 'ปั่นสตรอว์เบอร์รี + มะเขือเทศ สดชื่นสุดๆ',
  },
  {
    id: 'berry_cake',
    nameTh: 'เค้กสตรอว์เบอร์รี',
    nameEn: 'Strawberry Shortcake',
    sourceBuildingId: 'windmill_bakery',
    ingredients: [
      { kind: 'crop', id: 'strawberry', qty: 1 },
      { kind: 'product', id: 'milk', qty: 1 },
      { kind: 'product', id: 'egg', qty: 1 },
    ],
    sellPrice: 260,
    xpReward: 75,
    accentColor: '#f43f5e',
    descTh: 'ขนมยอดฮิตงานโรงเรียน ราคาสูงสุดในเบเกอรี่',
  },
  {
    id: 'pumpkin_pie',
    nameTh: 'พายฟักทองอบเชย',
    nameEn: 'Golden Pumpkin Pie',
    sourceBuildingId: 'windmill_bakery',
    ingredients: [
      { kind: 'crop', id: 'pumpkin', qty: 1 },
      { kind: 'product', id: 'egg', qty: 1 },
    ],
    sellPrice: 280,
    xpReward: 82,
    accentColor: '#ea580c',
    descTh: 'พายสูตรพิเศษจากฟักทองยักษ์ + ไข่สด',
  },
];

export const BUILDING_CATALOG: BuildingDefinition[] = [
  {
    id: 'farm_cottage',
    nameTh: 'บ้านพักชาวสวน',
    nameEn: 'Farmhouse Cottage',
    category: 'landmark',
    coinCost: 85,
    starCost: 2,
    unlockTownLevel: 1,
    dailyCoins: 22,
    prosperityPoints: 35,
    maxLevel: 3,
    descTh: 'บ้านพักอบอุ่นหัวใจเมือง รับ +22🪙/วัน',
    descEn: 'Cozy home centerpiece (+22 coins daily)',
  },
  {
    id: 'chicken_coop',
    nameTh: 'เล้าไก่ไข่แสนรู้',
    nameEn: 'Cozy Chicken Coop',
    category: 'production',
    coinCost: 65,
    starCost: 2,
    unlockTownLevel: 1,
    dailyCoins: 28,
    prosperityPoints: 25,
    maxLevel: 3,
    descTh: 'เลี้ยงแม่ไก่ผลิตไข่สด & รับ +28🪙/วัน',
    descEn: 'Produces fresh eggs & +28 coins daily',
  },
  {
    id: 'dairy_barn',
    nameTh: 'คอกวัวนมสด',
    nameEn: 'Sunny Dairy Barn',
    category: 'production',
    coinCost: 110,
    starCost: 3,
    unlockTownLevel: 1,
    dailyCoins: 48,
    prosperityPoints: 50,
    maxLevel: 3,
    descTh: 'เลี้ยงวัวนมผลิตนมสดโรงเรียน & +48🪙/วัน',
    descEn: 'Produces school milk & +48 coins daily',
  },
  {
    id: 'sheep_pen',
    nameTh: 'คอกแกะขนปุย',
    nameEn: 'Fluffy Sheep Pasture',
    category: 'production',
    coinCost: 120,
    starCost: 3,
    unlockTownLevel: 2,
    dailyCoins: 42,
    prosperityPoints: 52,
    maxLevel: 3,
    descTh: 'เลี้ยงแกะน่ารักผลิตขนแกะ & +42🪙/วัน',
    descEn: 'Produces soft wool & +42 coins daily',
  },
  {
    id: 'juice_stand',
    nameTh: 'ซุ้มน้ำผลไม้สด',
    nameEn: 'Fresh Juice Press',
    category: 'production',
    coinCost: 130,
    starCost: 3,
    unlockTownLevel: 1,
    dailyCoins: 36,
    prosperityPoints: 55,
    maxLevel: 3,
    descTh: 'ปั่นสมูทตี้ผลไม้ขายในตลาด & +36🪙/วัน',
    descEn: 'Crafts fresh fruit smoothies & +36 coins daily',
  },
  {
    id: 'windmill_bakery',
    nameTh: 'โรงสี & ร้านเบเกอรี่',
    nameEn: 'Windmill Bakery',
    category: 'production',
    coinCost: 165,
    starCost: 4,
    unlockTownLevel: 2,
    dailyCoins: 64,
    cropSellBonusPct: 20,
    prosperityPoints: 80,
    maxLevel: 3,
    descTh: 'อบขนมปัง/เค้ก + เพิ่มราคาพืช +20% +64🪙/วัน',
    descEn: 'Bakes bread/cakes, +20% crop value & +64 coins daily',
  },
  {
    id: 'school_greenhouse',
    nameTh: 'เรือนกระจกพฤกษศาสตร์',
    nameEn: 'Botanical Greenhouse',
    category: 'production',
    coinCost: 145,
    starCost: 4,
    unlockTownLevel: 2,
    dailyCoins: 30,
    dailyFertilizer: 1,
    prosperityPoints: 60,
    maxLevel: 3,
    descTh: 'ผลิต +30🪙 และปุ๋ยทองคำ +1 ถุงทุกวัน',
    descEn: 'Yields +30 coins & +1 golden fertilizer daily',
  },
  {
    id: 'town_fountain',
    nameTh: 'ลานน้ำพุกลางเมือง',
    nameEn: 'Town Plaza Fountain',
    category: 'landmark',
    coinCost: 90,
    starCost: 3,
    unlockTownLevel: 1,
    dailyCoins: 24,
    prosperityPoints: 40,
    maxLevel: 3,
    descTh: 'เพิ่มความเจริญเมืองและรายได้ +24🪙/วัน',
    descEn: 'Boosts town prosperity & +24 coins daily',
  },
  {
    id: 'wooden_fence',
    nameTh: 'รั้วไม้ฟาร์ม',
    nameEn: 'Wooden Fence',
    category: 'decor',
    coinCost: 25,
    starCost: 0,
    unlockTownLevel: 1,
    dailyCoins: 0,
    prosperityPoints: 12,
    maxLevel: 1,
    descTh: 'ตกแต่งขอบแปลงให้เป็นระเบียบ (+12 ความเจริญ)',
    descEn: 'Charming timber fence (+12 prosperity)',
  },
  {
    id: 'cobble_path',
    nameTh: 'ถนนหินปูเมือง',
    nameEn: 'Cobblestone Road',
    category: 'decor',
    coinCost: 20,
    starCost: 0,
    unlockTownLevel: 1,
    dailyCoins: 0,
    prosperityPoints: 10,
    maxLevel: 1,
    descTh: 'ปูทางเดินเชื่อมอาคารในเมืองเกษตร (+10 ความเจริญ)',
    descEn: 'Connects town buildings neatly (+10 prosperity)',
  },
];

export const CROP_MAP: Record<CropId, CropDefinition> = Object.fromEntries(
  CROP_CATALOG.map((c) => [c.id, c])
) as Record<CropId, CropDefinition>;

export const PRODUCT_MAP: Record<ProductId, ProductDefinition> = Object.fromEntries(
  PRODUCT_CATALOG.map((p) => [p.id, p])
) as Record<ProductId, ProductDefinition>;

export const BUILDING_MAP: Record<BuildingId, BuildingDefinition> = Object.fromEntries(
  BUILDING_CATALOG.map((b) => [b.id, b])
) as Record<BuildingId, BuildingDefinition>;

export const getTodayBangkokDate = (now: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

export const getFarmGridSize = (tilesOrState: FarmTile[] | SchoolFarmState): 6 | 8 => {
  const count = Array.isArray(tilesOrState) ? tilesOrState.length : tilesOrState.tiles.length;
  return count >= EXPANDED_FARM_GRID_SIZE * EXPANDED_FARM_GRID_SIZE ? 8 : 6;
};

export const getTownLevelFromXp = (farmXp: number): { level: number; currentIntoLevel: number; nextLevelNeed: number } => {
  const safeXp = Math.max(0, Math.floor(farmXp));
  let level = 1;
  let remaining = safeXp;
  while (level < 20) {
    const threshold = 90 + (level - 1) * 45;
    if (remaining < threshold) {
      return { level, currentIntoLevel: remaining, nextLevelNeed: threshold };
    }
    remaining -= threshold;
    level += 1;
  }
  return { level: 20, currentIntoLevel: remaining, nextLevelNeed: 999 };
};

export const calculateTownProsperity = (state: SchoolFarmState): number => {
  const unlockedCount = state.tiles.filter((t) => t.unlocked).length;
  const buildingScore = state.tiles.reduce((sum, tile) => {
    if (tile.kind !== 'building' || !tile.buildingId) return sum;
    const def = BUILDING_MAP[tile.buildingId];
    return sum + (def ? def.prosperityPoints * (tile.buildingLevel || 1) : 0);
  }, 0);
  const { level } = getTownLevelFromXp(state.farmXp);
  const gridBonus = getFarmGridSize(state) === 8 ? 60 : 0;
  return level * 50 + unlockedCount * 6 + buildingScore + state.totalOrdersCompleted * 15 + gridBonus;
};

export const getPlotUnlockStarCost = (unlockedCount: number): number => {
  if (unlockedCount < 20) return 1;
  if (unlockedCount < 32) return 2;
  return 3;
};

export const getBuildingUpgradeCost = (buildingId: BuildingId, currentLevel: number): { coinCost: number; starCost: number } => {
  const def = BUILDING_MAP[buildingId];
  const nextLv = currentLevel + 1;
  return {
    coinCost: Math.round(def.coinCost * 0.75 * nextLv),
    starCost: Math.max(1, Math.ceil(def.starCost * 0.65 * nextLv)),
  };
};

export const createVisitorRequests = (townLevel: number, seedOffset = 0): VisitorRequest[] => {
  const templates: Array<Omit<VisitorRequest, 'id'>> = [
    {
      npcId: 'aunt_malee',
      nameTh: 'ป้ามาลี (แม่ครัวโรงอาหาร)',
      roleTh: 'ผู้มาเยือนฟาร์ม',
      dialogueTh: 'สวัสดีจ้า! โรงอาหารกำลังขาดข้าวโพดหวานพอดี แบ่งขายให้ป้าสักหน่อยได้ไหม?',
      itemKind: 'crop',
      itemId: 'corn',
      quantity: 2,
      rewardCoins: 76,
      rewardXp: 24,
    },
    {
      npcId: 'uncle_somchai',
      nameTh: 'ลุงสมชาย (ชาวสวนรุ่นพี่)',
      roleTh: 'เพื่อนบ้าน',
      dialogueTh: 'ฟาร์มหนูดูคึกคักขึ้นเยอะเลยนะ ลุงขอรับซื้อไข่ไก่สดไปทำอาหารเช้าหน่อยจ้า',
      itemKind: 'product',
      itemId: 'egg',
      quantity: 1,
      rewardCoins: 72,
      rewardXp: 22,
    },
    {
      npcId: 'namsai',
      nameTh: 'น้องน้ำใส (หัวหน้าห้อง)',
      roleTh: 'เพื่อนร่วมโรงเรียน',
      dialogueTh: 'ชมรมเตรียมจัดกิจกรรมพักเที่ยง อยากได้มะเขือเทศเชอร์รีสดๆ สัก 2 ผลจ้า!',
      itemKind: 'crop',
      itemId: 'tomato',
      quantity: 2,
      rewardCoins: 108,
      rewardXp: 30,
    },
    {
      npcId: 'teacher_dao',
      nameTh: 'ครูดาว (ห้องสมุด)',
      roleTh: 'คุณครูที่ปรึกษา',
      dialogueTh: 'กลิ่นขนมปังจากฟาร์มหอมมากเลย! ครูขออุดหนุนขนมปังโฮมเมดสักชิ้นนะ',
      itemKind: townLevel >= 2 ? 'product' : 'crop',
      itemId: townLevel >= 2 ? 'bread' : 'carrot',
      quantity: 1,
      rewardCoins: townLevel >= 2 ? 155 : 52,
      rewardXp: townLevel >= 2 ? 42 : 18,
    },
  ];

  const picked: VisitorRequest[] = [];
  for (let i = 0; i < 2; i += 1) {
    const item = templates[(seedOffset + i) % templates.length];
    picked.push({
      ...item,
      id: `vis-${Date.now()}-${seedOffset}-${i}`,
    });
  }
  return picked;
};

export const createMarketOrders = (townLevel: number, seedOffset = 0): MarketOrder[] => {
  const pool: Omit<MarketOrder, 'id'>[] = [
    {
      titleTh: 'รถบรรทุกส่งข้าวโพดหวานเข้าเมือง',
      titleEn: 'Truck Delivery: Sweet Corn',
      cropId: 'corn',
      quantity: 2,
      rewardCoins: 82,
      rewardXp: 30,
      rewardGems: 2,
    },
    {
      titleTh: 'ส่งแครอทสดให้สหกรณ์นักเรียน',
      titleEn: 'Truck Delivery: Crisp Carrot',
      cropId: 'carrot',
      quantity: 2,
      rewardCoins: 98,
      rewardXp: 34,
      rewardGems: 2,
    },
    {
      titleTh: 'ชมรมคหกรรมสั่งมะเขือเทศ + ไข่สด',
      titleEn: 'Home Ec Tomato & Egg Crate',
      cropId: 'tomato',
      quantity: 2,
      productId: 'egg',
      productQty: 1,
      rewardCoins: 175,
      rewardXp: 52,
      rewardGems: 4,
    },
    {
      titleTh: 'บูธน้ำผลไม้งานวิชาการ',
      titleEn: 'Academic Fair Strawberry Stand',
      cropId: 'strawberry',
      quantity: 2,
      rewardCoins: 185,
      rewardXp: 56,
      rewardGems: 4,
    },
    ...(townLevel >= 2
      ? [
          {
            titleTh: 'จัดดอกไม้หน้าเสาธงด้วยทานตะวัน',
            titleEn: 'Morning Assembly Sunflower Bouquet',
            cropId: 'sunflower' as CropId,
            quantity: 2,
            rewardCoins: 215,
            rewardXp: 64,
            rewardGems: 5,
          },
          {
            titleTh: 'ส่งขนมปัง + ข้าวหอมมะลิให้ห้องพักครู',
            titleEn: 'Teachers Lounge Rice & Bread Order',
            cropId: 'jasmine_rice' as CropId,
            quantity: 2,
            productId: 'bread' as ProductId,
            productQty: 1,
            rewardCoins: 360,
            rewardXp: 95,
            rewardGems: 6,
          },
        ]
      : []),
    ...(townLevel >= 3
      ? [
          {
            titleTh: 'เทศกาลฟักทองประจำภาคเรียน',
            titleEn: 'Semester Giant Pumpkin Basket',
            cropId: 'pumpkin' as CropId,
            quantity: 2,
            rewardCoins: 330,
            rewardXp: 95,
            rewardGems: 7,
          },
        ]
      : []),
    ...(townLevel >= 4
      ? [
          {
            titleTh: 'ของขวัญผู้ปกครองเมล่อนทองคำ',
            titleEn: 'Golden Melon Gift Box',
            cropId: 'golden_melon' as CropId,
            quantity: 1,
            rewardCoins: 280,
            rewardXp: 90,
            rewardGems: 8,
          },
        ]
      : []),
  ];

  const picked: MarketOrder[] = [];
  for (let i = 0; i < 3; i += 1) {
    const item = pool[(seedOffset + i) % pool.length];
    picked.push({
      ...item,
      id: `ord-${Date.now()}-${seedOffset}-${i}`,
    });
  }
  return picked;
};

const emptyRecord = (): Record<CropId, number> => ({
  corn: 0,
  carrot: 0,
  tomato: 0,
  strawberry: 0,
  sunflower: 0,
  jasmine_rice: 0,
  pumpkin: 0,
  golden_melon: 0,
});

const emptyProductsRecord = (): Record<ProductId, number> => ({
  egg: 0,
  milk: 0,
  wool: 0,
  bread: 0,
  berry_smoothie: 0,
  berry_cake: 0,
  pumpkin_pie: 0,
});

export const createInitialFarmState = (params: {
  schoolId: string;
  userId: string;
  studentId?: string;
  ownerName: string;
  ownerRoom?: string;
  farmName?: string;
}): SchoolFarmState => {
  const tiles: FarmTile[] = [];
  for (let row = 0; row < FARM_GRID_SIZE; row += 1) {
    for (let col = 0; col < FARM_GRID_SIZE; col += 1) {
      const index = row * FARM_GRID_SIZE + col;
      // Inner 4x4 (rows 1..4, cols 1..4) start unlocked
      const unlocked = row >= 1 && row <= 4 && col >= 1 && col <= 4;
      tiles.push({
        index,
        row,
        col,
        unlocked,
        tilled: unlocked,
        kind: 'empty',
      });
    }
  }

  // Hay Day Starter Farmstead: never start from 0!
  // Keep index 7 (row 1, col 1) empty & index 0 (row 0, col 0) locked for deterministic unit tests.
  const cottagePlot = tiles.find((t) => t.row === 1 && t.col === 2);
  if (cottagePlot) {
    cottagePlot.kind = 'building';
    cottagePlot.buildingId = 'farm_cottage';
    cottagePlot.buildingLevel = 1;
    cottagePlot.lastCollectedDate = '';
  }
  const coopPlot = tiles.find((t) => t.row === 1 && t.col === 3);
  if (coopPlot) {
    coopPlot.kind = 'building';
    coopPlot.buildingId = 'chicken_coop';
    coopPlot.buildingLevel = 1;
    coopPlot.lastCollectedDate = '';
  }
  const fencePlot = tiles.find((t) => t.row === 3 && t.col === 1);
  if (fencePlot) {
    fencePlot.kind = 'building';
    fencePlot.buildingId = 'wooden_fence';
    fencePlot.buildingLevel = 1;
    fencePlot.lastCollectedDate = 'decor';
  }
  const starterCarrot = tiles.find((t) => t.row === 2 && t.col === 1);
  if (starterCarrot) {
    starterCarrot.kind = 'crop';
    starterCarrot.tilled = true;
    starterCarrot.cropId = 'carrot';
    starterCarrot.growthProgress = 2; // ready!
    starterCarrot.wateredToday = true;
  }
  // Starter corn at (2,2) -> index 14 (ready to harvest right away!)
  const starterPlot1 = tiles.find((t) => t.row === 2 && t.col === 2);
  if (starterPlot1) {
    starterPlot1.kind = 'crop';
    starterPlot1.tilled = true;
    starterPlot1.cropId = 'corn';
    starterPlot1.growthProgress = 2;
    starterPlot1.wateredToday = true;
  }
  // Starter tomato at (2,3) -> index 15 (growing 1/2)
  const starterPlot2 = tiles.find((t) => t.row === 2 && t.col === 3);
  if (starterPlot2) {
    starterPlot2.kind = 'crop';
    starterPlot2.tilled = true;
    starterPlot2.cropId = 'tomato';
    starterPlot2.growthProgress = 1;
    starterPlot2.wateredToday = false;
  }

  return {
    version: 1,
    gridSize: FARM_GRID_SIZE,
    userId: params.userId,
    schoolId: params.schoolId,
    studentId: params.studentId,
    ownerName: params.ownerName,
    ownerRoom: params.ownerRoom,
    farmName: params.farmName || `ฟาร์มของ${params.ownerName.split(' ')[0] || 'ฉัน'}`,
    coins: 350, // Generous starter coins so students can expand & build right away!
    water: 8,
    dailyFertilizer: 3,
    fertilizer: 2,
    townStars: 5,
    farmXp: 40,
    seeds: {
      corn: 5,
      carrot: 3,
      tomato: 2,
      strawberry: 0,
      sunflower: 0,
      jasmine_rice: 0,
      pumpkin: 0,
      golden_melon: 0,
    },
    barn: emptyRecord(),
    goods: {
      ...emptyProductsRecord(),
      egg: 1,
    },
    tiles,
    marketOrders: createMarketOrders(1, 0),
    visitorQueue: createVisitorRequests(1, 0),
    roadsideShop: [],
    unlockedBlueprints: [
      'farm_cottage',
      'chicken_coop',
      'dairy_barn',
      'juice_stand',
      'town_fountain',
      'wooden_fence',
      'cobble_path',
    ],
    claimedAttendanceDates: [],
    claimedHomeworkIds: [],
    claimedHomeworkMasteryCount: 0,
    claimedMeritIds: [],
    resolvedDemeritIds: [],
    lastQuizBoostDate: '',
    quizBoostCountToday: 0,
    helpedNeighborDates: {},
    helpReceivedDates: [],
    totalHarvested: 0,
    totalOrdersCompleted: 0,
    soundMuted: false,
    updatedAt: new Date().toISOString(),
  };
};

export const normalizeFarmState = (
  raw: Partial<SchoolFarmState> | null | undefined,
  fallbackParams: { schoolId: string; userId: string; studentId?: string; ownerName: string; ownerRoom?: string }
): SchoolFarmState => {
  const base = createInitialFarmState(fallbackParams);
  if (!raw || typeof raw !== 'object') return base;
  const rawLen = Array.isArray(raw.tiles) ? raw.tiles.length : 0;
  const gridSize: 6 | 8 = rawLen === 64 ? 8 : 6;
  const expectedLen = gridSize * gridSize;

  const normalizedTiles: FarmTile[] = Array.isArray(raw.tiles) && raw.tiles.length === expectedLen
    ? raw.tiles.map((tile, idx) => ({
        index: idx,
        row: Math.floor(idx / gridSize),
        col: idx % gridSize,
        unlocked: Boolean(tile?.unlocked),
        tilled: tile?.tilled !== undefined ? Boolean(tile.tilled) : Boolean(tile?.unlocked),
        kind: tile?.kind === 'crop' || tile?.kind === 'building' || tile?.kind === 'weed' ? tile.kind : 'empty',
        cropId: tile?.cropId,
        growthProgress: typeof tile?.growthProgress === 'number' ? tile.growthProgress : undefined,
        wateredToday: Boolean(tile?.wateredToday),
        fertilized: Boolean(tile?.fertilized),
        buildingId: tile?.buildingId,
        buildingLevel: typeof tile?.buildingLevel === 'number' ? tile.buildingLevel : undefined,
        lastCollectedDate: tile?.lastCollectedDate,
        weedSourceId: tile?.weedSourceId,
        weedVariant: tile?.weedVariant === 'pest' ? 'pest' : tile?.kind === 'weed' ? 'weed' : undefined,
        weedReasonTh: typeof tile?.weedReasonTh === 'string' ? tile.weedReasonTh : undefined,
      }))
    : base.tiles;

  return {
    ...base,
    ...raw,
    version: 1,
    gridSize,
    schoolId: fallbackParams.schoolId,
    userId: fallbackParams.userId,
    studentId: raw.studentId || fallbackParams.studentId,
    ownerName: raw.ownerName || fallbackParams.ownerName,
    ownerRoom: raw.ownerRoom || fallbackParams.ownerRoom,
    dailyFertilizer: typeof raw.dailyFertilizer === 'number' ? raw.dailyFertilizer : base.dailyFertilizer,
    seeds: { ...emptyRecord(), ...(raw.seeds || {}) },
    barn: { ...emptyRecord(), ...(raw.barn || {}) },
    goods: { ...emptyProductsRecord(), ...(raw.goods || {}) },
    tiles: normalizedTiles,
    marketOrders: Array.isArray(raw.marketOrders) && raw.marketOrders.length > 0 ? raw.marketOrders : base.marketOrders,
    visitorQueue: Array.isArray(raw.visitorQueue) && raw.visitorQueue.length > 0 ? raw.visitorQueue : base.visitorQueue,
    roadsideShop: Array.isArray(raw.roadsideShop) ? raw.roadsideShop : [],
    unlockedBlueprints: Array.isArray(raw.unlockedBlueprints) && raw.unlockedBlueprints.length > 0
      ? raw.unlockedBlueprints
      : base.unlockedBlueprints,
    claimedAttendanceDates: Array.isArray(raw.claimedAttendanceDates) ? raw.claimedAttendanceDates : [],
    claimedHomeworkIds: Array.isArray(raw.claimedHomeworkIds) ? raw.claimedHomeworkIds : [],
    claimedHomeworkMasteryCount: typeof raw.claimedHomeworkMasteryCount === 'number' ? raw.claimedHomeworkMasteryCount : 0,
    claimedMeritIds: Array.isArray(raw.claimedMeritIds) ? raw.claimedMeritIds : [],
    resolvedDemeritIds: Array.isArray(raw.resolvedDemeritIds) ? raw.resolvedDemeritIds : [],
    helpedNeighborDates: raw.helpedNeighborDates && typeof raw.helpedNeighborDates === 'object' ? raw.helpedNeighborDates : {},
    helpReceivedDates: Array.isArray(raw.helpReceivedDates) ? raw.helpReceivedDates : [],
  };
};

export const resetDailyWaterFlagsIfNeeded = (state: SchoolFarmState, todayDate: string): SchoolFarmState => {
  const updatedDate = (state.updatedAt || '').slice(0, 10);
  if (updatedDate === todayDate) return state;
  return {
    ...state,
    tiles: state.tiles.map((t) => ({ ...t, wateredToday: false })),
    lastQuizBoostDate: state.lastQuizBoostDate === todayDate ? state.lastQuizBoostDate : todayDate,
    quizBoostCountToday: state.lastQuizBoostDate === todayDate ? state.quizBoostCountToday : 0,
    updatedAt: `${todayDate}T08:00:00.000Z`,
  };
};

const computeConsecutiveAttendanceDays = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse();
  let streak = 1;
  for (let i = 0; i < unique.length - 1; i += 1) {
    const cur = new Date(`${unique[i]}T00:00:00Z`).getTime();
    const next = new Date(`${unique[i + 1]}T00:00:00Z`).getTime();
    const diffDays = Math.round((cur - next) / 86400000);
    if (diffDays <= 3 && diffDays >= 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

export const resolveStudentForUser = (
  currentUser: AuthUser | null,
  students: Student[]
): Student | undefined => {
  if (!currentUser || students.length === 0) return undefined;
  if (currentUser.studentRecordId) {
    const direct = students.find((s) => s.id === currentUser.studentRecordId);
    if (direct) return direct;
  }
  const emailLower = (currentUser.email || '').trim().toLowerCase();
  if (emailLower) {
    const byEmail = students.find((s) => (s.guardianEmail || '').trim().toLowerCase() === emailLower);
    if (byEmail) return byEmail;
  }
  const fullTh = (currentUser.fullNameTh || '').trim();
  if (fullTh) {
    const byName = students.find((s) => `${s.firstNameTh} ${s.lastNameTh}`.trim() === fullTh);
    if (byName) return byName;
  }
  return undefined;
};

export const computeDisciplineChestSummary = (params: {
  farmState: SchoolFarmState;
  currentUser: AuthUser | null;
  students: Student[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  homeworkSubmissions: HomeworkSubmission[];
  assignments: Assignment[];
  behaviorRecords: BehaviorRecord[];
  todayDate?: string;
}): DisciplineChestSummary => {
  const todayDate = params.todayDate || getTodayBangkokDate();
  const matchedStudent = resolveStudentForUser(params.currentUser, params.students);
  const candidateIds = new Set<string>(
    [
      matchedStudent?.id,
      matchedStudent?.studentIdNumber,
      params.currentUser?.studentRecordId,
      params.currentUser?.id,
    ].filter((v): v is string => Boolean(v))
  );

  // 1. Attendance check
  const personalAttendance = params.attendance.filter(
    (rec) =>
      candidateIds.has(rec.studentId) ||
      (rec.teacherId && candidateIds.has(rec.teacherId))
  );
  const personalPeriodAttendance = params.periodAttendance.filter((rec) =>
    candidateIds.has(rec.studentId)
  );
  const todayAttRecords = personalAttendance.filter((r) => r.date === todayDate);
  const todayPeriodRecords = personalPeriodAttendance.filter((r) => r.date === todayDate);

  let attendanceStatusToday: DisciplineChestSummary['attendanceStatusToday'] = 'none';
  if (
    todayAttRecords.some((r) => r.status === 'present') ||
    todayPeriodRecords.some((r) => r.status === 'present')
  ) {
    attendanceStatusToday = 'present';
  } else if (
    todayAttRecords.some((r) => r.status === 'late') ||
    todayPeriodRecords.some((r) => r.status === 'late')
  ) {
    attendanceStatusToday = 'late';
  } else if (todayAttRecords.some((r) => r.status === 'absent')) {
    attendanceStatusToday = 'absent';
  }

  const presentOrLateDates = [
    ...personalAttendance
      .filter((r) => r.status === 'present' || r.status === 'late')
      .map((r) => r.date),
    ...personalPeriodAttendance
      .filter((r) => r.status === 'present' || r.status === 'late')
      .map((r) => r.date),
  ];
  const attendanceStreakDays = computeConsecutiveAttendanceDays(presentOrLateDates);

  let newAttendanceDateToClaim: string | null = null;
  let claimableWater = 0;
  let claimableDailyFertilizer = 0;
  let claimableFertilizer = 0;
  let claimableCoins = 0;
  if (
    attendanceStatusToday === 'present' &&
    !params.farmState.claimedAttendanceDates.includes(todayDate)
  ) {
    newAttendanceDateToClaim = todayDate;
    const streakBonus = Math.min(3, Math.floor(attendanceStreakDays / 3));
    claimableWater += 4 + streakBonus;
    claimableDailyFertilizer += 2;
    claimableFertilizer += attendanceStreakDays >= 3 ? 2 : 1;
    claimableCoins += 20;
  }

  // 2. Homework check
  const personalSubmissions = params.homeworkSubmissions.filter(
    (sub) =>
      candidateIds.has(sub.studentId) &&
      (sub.status === 'submitted' || sub.status === 'graded' || sub.status === 'late')
  );
  const submittedAssignmentIds = new Set(personalSubmissions.map((s) => s.assignmentId));

  const directSubmittedAssignments = params.assignments.filter(
    (a) =>
      a.submittedStudentIds?.some((sid) => candidateIds.has(sid)) &&
      !submittedAssignmentIds.has(a.id)
  );

  const allCompletedHwTokens = [
    ...personalSubmissions.map((s) => ({
      tokenId: `sub:${s.id}`,
      isOnTime: s.status !== 'late',
    })),
    ...directSubmittedAssignments.map((a) => ({
      tokenId: `asg:${a.id}`,
      isOnTime: true,
    })),
  ];

  const submittedHomeworkCount = allCompletedHwTokens.length;

  const pendingAssignments = params.assignments.filter((a) => {
    if (a.status === 'closed') return false;
    if (submittedAssignmentIds.has(a.id)) return false;
    if (a.submittedStudentIds?.some((sid) => candidateIds.has(sid))) return false;
    return true;
  });

  const homeworkBonusLocked = pendingAssignments.length > 0;
  const canClaimHomeworkMasteryPack =
    !homeworkBonusLocked &&
    submittedHomeworkCount > (params.farmState.claimedHomeworkMasteryCount || 0);

  const newHomeworkIdsToClaim = allCompletedHwTokens
    .filter((t) => !params.farmState.claimedHomeworkIds.includes(t.tokenId))
    .map((t) => t.tokenId);

  const claimableSeeds: Partial<Record<CropId, number>> = {};
  if (newHomeworkIdsToClaim.length > 0) {
    const count = newHomeworkIdsToClaim.length;
    claimableSeeds.corn = (claimableSeeds.corn || 0) + count;
    claimableSeeds.carrot = (claimableSeeds.carrot || 0) + count;
    claimableSeeds.tomato = (claimableSeeds.tomato || 0) + count;
    if (submittedHomeworkCount >= 1) {
      claimableSeeds.strawberry = (claimableSeeds.strawberry || 0) + Math.min(3, count);
    }
    if (submittedHomeworkCount >= 3) {
      claimableSeeds.golden_melon = (claimableSeeds.golden_melon || 0) + 1;
    }
    claimableCoins += count * 15;
  }

  const claimableBlueprints: BuildingId[] = [];
  if (canClaimHomeworkMasteryPack) {
    claimableSeeds.sunflower = (claimableSeeds.sunflower || 0) + 1;
    claimableSeeds.golden_melon = (claimableSeeds.golden_melon || 0) + 1;
    const lockedPool: BuildingId[] = ['sheep_pen', 'school_greenhouse', 'windmill_bakery'];
    const nextBp = lockedPool.find((id) => !(params.farmState.unlockedBlueprints || []).includes(id));
    if (nextBp) claimableBlueprints.push(nextBp);
    claimableCoins += 25;
  }

  // 3. Behavior check (Merits -> Town Stars, Demerits -> Weeds/Pests)
  const personalBehaviors = params.behaviorRecords.filter((b) => candidateIds.has(b.studentId));
  const meritRecords = personalBehaviors.filter((b) => b.type === 'merit');
  const demeritRecords = personalBehaviors.filter((b) => b.type === 'demerit');

  const totalMeritPoints = meritRecords.reduce((sum, b) => sum + Math.max(0, b.points), 0);
  const newMeritRecords = meritRecords.filter((b) => !params.farmState.claimedMeritIds.includes(b.id));
  const newMeritIdsToClaim = newMeritRecords.map((b) => b.id);
  const claimableStars = newMeritRecords.reduce(
    (sum, b) => sum + Math.max(1, Math.round(b.points / 5)),
    0
  );

  const unresolvedDemeritRecords = demeritRecords.filter(
    (b) => !params.farmState.resolvedDemeritIds.includes(b.id)
  );
  const unresolvedDemeritIds = unresolvedDemeritRecords.map((b) => b.id);
  const unresolvedDemerits = unresolvedDemeritRecords.map((b) => ({
    id: b.id,
    reasonTh: b.notes ? `${b.category}: ${b.notes}` : b.category,
  }));

  const hasAnythingToClaim =
    Boolean(newAttendanceDateToClaim) ||
    newHomeworkIdsToClaim.length > 0 ||
    canClaimHomeworkMasteryPack ||
    newMeritIdsToClaim.length > 0;

  return {
    todayDate,
    matchedStudentId: matchedStudent?.id,
    attendanceStatusToday,
    attendanceStreakDays,
    submittedHomeworkCount,
    pendingHomeworkCount: pendingAssignments.length,
    pendingHomeworkTitles: pendingAssignments.slice(0, 3).map((a) => a.titleTh || a.titleEn),
    homeworkBonusLocked,
    totalMeritPoints,
    unresolvedDemeritIds,
    unresolvedDemerits,
    claimableWater,
    claimableDailyFertilizer,
    claimableFertilizer,
    claimableSeeds,
    claimableBlueprints,
    claimableStars,
    claimableCoins,
    newAttendanceDateToClaim,
    newHomeworkIdsToClaim,
    newMeritIdsToClaim,
    canClaimHomeworkMasteryPack,
    hasAnythingToClaim,
  };
};

export const syncBehaviorWeedsOntoFarm = (
  state: SchoolFarmState,
  unresolvedDemeritsInput: Array<string | { id: string; reasonTh?: string }>
): SchoolFarmState => {
  if (unresolvedDemeritsInput.length === 0) return state;
  const normalizedInput = unresolvedDemeritsInput.map((item, idx) =>
    typeof item === 'string'
      ? { id: item, reasonTh: undefined, variant: (idx % 2 === 1 ? 'pest' : 'weed') as 'weed' | 'pest' }
      : { id: item.id, reasonTh: item.reasonTh, variant: (idx % 2 === 1 ? 'pest' : 'weed') as 'weed' | 'pest' }
  );

  const existingWeedSources = new Set(
    state.tiles
      .filter((t) => t.kind === 'weed' && t.weedSourceId)
      .map((t) => t.weedSourceId as string)
  );
  const pendingToSpawn = normalizedInput
    .filter((entry) => !existingWeedSources.has(entry.id) && !state.resolvedDemeritIds.includes(entry.id))
    .slice(0, 3);
  if (pendingToSpawn.length === 0) return state;

  const nextTiles = state.tiles.map((t) => ({ ...t }));
  for (const demerit of pendingToSpawn) {
    const emptySlot = nextTiles.find((t) => t.unlocked && t.kind === 'empty');
    if (!emptySlot) break;
    emptySlot.kind = 'weed';
    emptySlot.weedSourceId = demerit.id;
    emptySlot.weedVariant = demerit.variant;
    emptySlot.weedReasonTh = demerit.reasonTh;
  }
  return {
    ...state,
    tiles: nextTiles,
  };
};

export const claimDisciplineSupplies = (
  state: SchoolFarmState,
  summary: DisciplineChestSummary
): SchoolFarmState => {
  if (!summary.hasAnythingToClaim) return state;
  const nextSeeds = { ...state.seeds };
  (Object.entries(summary.claimableSeeds) as [CropId, number | undefined][]).forEach(([cropId, qty]) => {
    if (qty && qty > 0) {
      nextSeeds[cropId] = (nextSeeds[cropId] || 0) + qty;
    }
  });

  const nextAttDates = summary.newAttendanceDateToClaim
    ? Array.from(new Set([...state.claimedAttendanceDates, summary.newAttendanceDateToClaim]))
    : state.claimedAttendanceDates;

  const nextBlueprints = Array.from(
    new Set([...(state.unlockedBlueprints || []), ...(summary.claimableBlueprints || [])])
  );

  return {
    ...state,
    coins: state.coins + summary.claimableCoins,
    water: state.water + summary.claimableWater,
    dailyFertilizer: (state.dailyFertilizer || 0) + summary.claimableDailyFertilizer,
    fertilizer: state.fertilizer + summary.claimableFertilizer,
    townStars: state.townStars + summary.claimableStars,
    farmXp:
      state.farmXp +
      (summary.newAttendanceDateToClaim ? 12 : 0) +
      summary.newHomeworkIdsToClaim.length * 10 +
      (summary.canClaimHomeworkMasteryPack ? 20 : 0),
    seeds: nextSeeds,
    unlockedBlueprints: nextBlueprints,
    claimedAttendanceDates: nextAttDates,
    claimedHomeworkIds: Array.from(new Set([...state.claimedHomeworkIds, ...summary.newHomeworkIdsToClaim])),
    claimedHomeworkMasteryCount: summary.canClaimHomeworkMasteryPack
      ? summary.submittedHomeworkCount
      : state.claimedHomeworkMasteryCount || 0,
    claimedMeritIds: Array.from(new Set([...state.claimedMeritIds, ...summary.newMeritIdsToClaim])),
    updatedAt: new Date().toISOString(),
  };
};

export const isCropUnlocked = (
  cropId: CropId,
  state: SchoolFarmState,
  submittedHomeworkCount: number
): boolean => {
  const def = CROP_MAP[cropId];
  const { level } = getTownLevelFromXp(state.farmXp);
  if (level < def.unlockTownLevel) return false;
  if (def.minHomeworkCount && submittedHomeworkCount < def.minHomeworkCount && (state.seeds[cropId] || 0) === 0) {
    return false;
  }
  return true;
};

export const isBuildingUnlocked = (buildingId: BuildingId, state: SchoolFarmState): boolean => {
  const def = BUILDING_MAP[buildingId];
  const { level } = getTownLevelFromXp(state.farmXp);
  if (level >= def.unlockTownLevel) return true;
  return (state.unlockedBlueprints || []).includes(buildingId);
};

export const tillPlotTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile) return { state, ok: false, errorTh: 'ไม่พบแปลงที่เลือก' };
  if (!tile.unlocked) return { state, ok: false, errorTh: 'แปลงนี้ยังไม่ปลดล็อก' };
  if (tile.kind !== 'empty') return { state, ok: false, errorTh: 'ขุดได้เฉพาะพื้นที่ดินว่างเท่านั้น' };
  if (tile.tilled) return { state, ok: false, errorTh: 'แปลงนี้ขุดเตรียมดินไว้พร้อมปลูกแล้ว' };

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex ? { ...t, tilled: true } : t
  );
  return {
    ok: true,
    state: {
      ...state,
      farmXp: state.farmXp + 2,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const plantCropOnTile = (
  state: SchoolFarmState,
  tileIndex: number,
  cropId: CropId
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile) return { state, ok: false, errorTh: 'ไม่พบแปลงที่เลือก' };
  if (!tile.unlocked) return { state, ok: false, errorTh: 'แปลงนี้ยังไม่ปลดล็อก ต้องใช้ดาวเมืองปลดล็อกก่อน' };
  if (tile.kind === 'weed') return { state, ok: false, errorTh: 'มีวัชพืช/แมลงขึ้นอยู่ กรุณาปราบก่อนปลูก' };
  if (tile.kind !== 'empty') return { state, ok: false, errorTh: 'แปลงนี้ไม่ว่าง' };
  if ((state.seeds[cropId] || 0) <= 0) {
    return { state, ok: false, errorTh: 'เมล็ดพันธุ์หมด ซื้อเพิ่มที่ตลาดหรือส่งการบ้านเพื่อรับเมล็ดฟรี' };
  }

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          ...t,
          tilled: true,
          kind: 'crop' as const,
          cropId,
          growthProgress: 0,
          wateredToday: false,
          fertilized: false,
        }
      : t
  );
  return {
    ok: true,
    state: {
      ...state,
      seeds: { ...state.seeds, [cropId]: state.seeds[cropId] - 1 },
      tiles: nextTiles,
      farmXp: state.farmXp + 4,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const waterTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; matured?: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'crop' || !tile.cropId) {
    return { state, ok: false, errorTh: 'เลือกแปลงที่มีพืชปลูกอยู่เพื่อรดน้ำ' };
  }
  const def = CROP_MAP[tile.cropId];
  const progress = tile.growthProgress || 0;
  if (progress >= def.watersNeeded) {
    return { state, ok: false, errorTh: 'พืชนี้โตเต็มที่แล้ว พร้อมเก็บเกี่ยว!' };
  }
  if (state.water <= 0) {
    return { state, ok: false, errorTh: 'น้ำรดต้นไม้หมดแล้ว เช็กชื่อเข้าเรียนหรือตอบคำถามทบทวนเพื่อรับน้ำเพิ่ม' };
  }

  const nextProgress = Math.min(def.watersNeeded, progress + 1);
  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          ...t,
          growthProgress: nextProgress,
          wateredToday: true,
        }
      : t
  );
  return {
    ok: true,
    matured: nextProgress >= def.watersNeeded,
    state: {
      ...state,
      water: state.water - 1,
      tiles: nextTiles,
      farmXp: state.farmXp + 5,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const applyDailyFertilizerTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; matured?: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'crop' || !tile.cropId) {
    return { state, ok: false, errorTh: 'เลือกแปลงที่กำลังปลูกพืชเพื่อใส่ปุ๋ยประจำวัน' };
  }
  const def = CROP_MAP[tile.cropId];
  const progress = tile.growthProgress || 0;
  if (progress >= def.watersNeeded) {
    return { state, ok: false, errorTh: 'พืชโตเต็มที่แล้ว เก็บเกี่ยวได้เลย!' };
  }
  if ((state.dailyFertilizer || 0) <= 0) {
    return { state, ok: false, errorTh: 'ปุ๋ยประจำวันหมด เช็กชื่อตรงเวลาเพื่อรับปุ๋ยเพิ่ม' };
  }

  const nextProgress = Math.min(def.watersNeeded, progress + 1);
  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          ...t,
          growthProgress: nextProgress,
          wateredToday: true,
        }
      : t
  );
  return {
    ok: true,
    matured: nextProgress >= def.watersNeeded,
    state: {
      ...state,
      dailyFertilizer: (state.dailyFertilizer || 0) - 1,
      tiles: nextTiles,
      farmXp: state.farmXp + 7,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const fertilizeTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'crop' || !tile.cropId) {
    return { state, ok: false, errorTh: 'เลือกแปลงที่กำลังปลูกพืชเพื่อใส่ปุ๋ยทองคำ' };
  }
  const def = CROP_MAP[tile.cropId];
  if ((tile.growthProgress || 0) >= def.watersNeeded) {
    return { state, ok: false, errorTh: 'พืชโตเต็มที่แล้ว เก็บเกี่ยวได้เลย!' };
  }
  if (state.fertilizer <= 0) {
    return { state, ok: false, errorTh: 'ปุ๋ยทองคำหมด เช็กชื่อตรงเวลาต่อเนื่องหรือสร้างเรือนกระจกเพื่อรับปุ๋ยเพิ่ม' };
  }

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          ...t,
          growthProgress: def.watersNeeded,
          fertilized: true,
          wateredToday: true,
        }
      : t
  );
  return {
    ok: true,
    state: {
      ...state,
      fertilizer: state.fertilizer - 1,
      tiles: nextTiles,
      farmXp: state.farmXp + 10,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const harvestTile = (
  state: SchoolFarmState,
  tileIndex: number
): {
  state: SchoolFarmState;
  ok: boolean;
  cropId?: CropId;
  harvestedQty?: number;
  xpEarned?: number;
  errorTh?: string;
} => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'crop' || !tile.cropId) {
    return { state, ok: false, errorTh: 'ไม่มีพืชพร้อมเก็บเกี่ยวในแปลงนี้' };
  }
  const def = CROP_MAP[tile.cropId];
  if ((tile.growthProgress || 0) < def.watersNeeded) {
    return {
      state,
      ok: false,
      errorTh: `${def.nameTh} ยังโตไม่เต็มที่ (ต้องการรดน้ำอีก ${def.watersNeeded - (tile.growthProgress || 0)} ครั้ง)`,
    };
  }

  const harvestedQty = tile.fertilized ? 2 : 1;
  const cropId = tile.cropId;
  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          index: t.index,
          row: t.row,
          col: t.col,
          unlocked: t.unlocked,
          tilled: true,
          kind: 'empty' as const,
        }
      : t
  );

  return {
    ok: true,
    cropId,
    harvestedQty,
    xpEarned: def.xpReward,
    state: {
      ...state,
      barn: {
        ...state.barn,
        [cropId]: (state.barn[cropId] || 0) + harvestedQty,
      },
      tiles: nextTiles,
      farmXp: state.farmXp + def.xpReward,
      totalHarvested: state.totalHarvested + harvestedQty,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const clearWeedOnTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'weed') {
    return { state, ok: false, errorTh: 'แปลงนี้ไม่มีวัชพืชหรือแมลง' };
  }
  if (state.water <= 0) {
    return { state, ok: false, errorTh: 'ต้องใช้น้ำ 1 ถังในการล้างวัชพืชและฟื้นฟูดิน' };
  }
  const nextResolved = tile.weedSourceId
    ? Array.from(new Set([...state.resolvedDemeritIds, tile.weedSourceId]))
    : state.resolvedDemeritIds;

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          index: t.index,
          row: t.row,
          col: t.col,
          unlocked: t.unlocked,
          tilled: true,
          kind: 'empty' as const,
        }
      : t
  );

  return {
    ok: true,
    state: {
      ...state,
      water: state.water - 1,
      farmXp: state.farmXp + 8,
      resolvedDemeritIds: nextResolved,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const unlockPlotTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; costStars?: number; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile) return { state, ok: false, errorTh: 'ไม่พบแปลงนี้' };
  if (tile.unlocked) return { state, ok: false, errorTh: 'แปลงนี้ปลดล็อกแล้ว' };

  const unlockedCount = state.tiles.filter((t) => t.unlocked).length;
  const costStars = getPlotUnlockStarCost(unlockedCount);
  if (state.townStars < costStars) {
    return {
      state,
      ok: false,
      errorTh: `ต้องใช้ดาวเมือง ${costStars} ดวง (ทำคะแนนความประพฤติหรือส่งออเดอร์ตลาดเพิ่ม)`,
    };
  }

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex ? { ...t, unlocked: true, tilled: false } : t
  );

  return {
    ok: true,
    costStars,
    state: {
      ...state,
      townStars: state.townStars - costStars,
      farmXp: state.farmXp + 18,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const expandFarmGridTo8x8 = (
  state: SchoolFarmState
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  if (getFarmGridSize(state) >= 8) {
    return { state, ok: false, errorTh: 'ฟาร์มของคุณขยายเป็นขนาดใหญ่ 8×8 แล้ว' };
  }
  const { level } = getTownLevelFromXp(state.farmXp);
  if (level < 2) {
    return { state, ok: false, errorTh: 'ต้องพัฒนาเมืองถึง Lv.2 ขึ้นไปก่อนจึงจะขยายแผนที่เป็น 8×8 ได้' };
  }
  if (state.townStars < 4) {
    return { state, ok: false, errorTh: 'ต้องใช้ดาวพัฒนาเมือง 4 ดวง (⭐) ในการขยายเขตเมือง 8×8' };
  }

  const oldMap = new Map<string, FarmTile>();
  for (const tile of state.tiles) {
    oldMap.set(`${tile.row}:${tile.col}`, tile);
  }

  const nextTiles: FarmTile[] = [];
  for (let row = 0; row < EXPANDED_FARM_GRID_SIZE; row += 1) {
    for (let col = 0; col < EXPANDED_FARM_GRID_SIZE; col += 1) {
      const index = row * EXPANDED_FARM_GRID_SIZE + col;
      const existing = oldMap.get(`${row - 1}:${col - 1}`);
      if (existing) {
        nextTiles.push({
          ...existing,
          index,
          row,
          col,
        });
      } else {
        nextTiles.push({
          index,
          row,
          col,
          unlocked: false,
          tilled: false,
          kind: 'empty',
        });
      }
    }
  }

  return {
    ok: true,
    state: {
      ...state,
      gridSize: 8,
      townStars: state.townStars - 4,
      farmXp: state.farmXp + 50,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const constructBuildingOnTile = (
  state: SchoolFarmState,
  tileIndex: number,
  buildingId: BuildingId
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile) return { state, ok: false, errorTh: 'ไม่พบแปลงที่เลือก' };
  if (!tile.unlocked) return { state, ok: false, errorTh: 'กรุณาปลดล็อกพื้นที่ก่อนก่อสร้าง' };
  if (tile.kind !== 'empty') return { state, ok: false, errorTh: 'กรุณาเลือกพื้นที่ว่างในการก่อสร้าง' };

  const def = BUILDING_MAP[buildingId];
  if (!isBuildingUnlocked(buildingId, state)) {
    return { state, ok: false, errorTh: `ต้องมีระดับเมือง Lv.${def.unlockTownLevel} หรือปลดล็อกพิมพ์เขียวจากการส่งการบ้าน` };
  }
  if (state.coins < def.coinCost) {
    return { state, ok: false, errorTh: `ต้องใช้ ${def.coinCost} เหรียญฟาร์ม` };
  }
  if (state.townStars < def.starCost) {
    return { state, ok: false, errorTh: `ต้องใช้ดาวเมือง ${def.starCost} ดวง` };
  }

  const today = getTodayBangkokDate();
  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          ...t,
          kind: 'building' as const,
          buildingId,
          buildingLevel: 1,
          lastCollectedDate: def.dailyCoins > 0 || def.dailyFertilizer ? '' : today,
        }
      : t
  );

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - def.coinCost,
      townStars: state.townStars - def.starCost,
      farmXp: state.farmXp + (def.category === 'decor' ? 12 : 45),
      tiles: nextTiles,
      updatedAt: `${today}T${new Date().toISOString().slice(11)}`,
    },
  };
};

export const upgradeBuildingOnTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; newLevel?: number; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'building' || !tile.buildingId) {
    return { state, ok: false, errorTh: 'ไม่พบสิ่งปลูกสร้างในช่องนี้' };
  }
  const def = BUILDING_MAP[tile.buildingId];
  const currentLevel = tile.buildingLevel || 1;
  if (currentLevel >= def.maxLevel) {
    return { state, ok: false, errorTh: `${def.nameTh} อัปเกรดถึงระดับสูงสุด (Lv.${def.maxLevel}) แล้ว` };
  }

  const { coinCost, starCost } = getBuildingUpgradeCost(tile.buildingId, currentLevel);
  if (state.coins < coinCost) {
    return { state, ok: false, errorTh: `ต้องการ ${coinCost} เหรียญฟาร์มเพื่ออัปเกรด` };
  }
  if (state.townStars < starCost) {
    return { state, ok: false, errorTh: `ต้องการดาวเมือง ${starCost} ดวง (⭐) เพื่ออัปเกรด` };
  }

  const newLevel = currentLevel + 1;
  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex ? { ...t, buildingLevel: newLevel } : t
  );

  return {
    ok: true,
    newLevel,
    state: {
      ...state,
      coins: state.coins - coinCost,
      townStars: state.townStars - starCost,
      farmXp: state.farmXp + 35 * newLevel,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const removeBuildingOnTile = (
  state: SchoolFarmState,
  tileIndex: number
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'building' || !tile.buildingId) {
    return { state, ok: false, errorTh: 'ไม่พบสิ่งปลูกสร้างในช่องนี้' };
  }
  const def = BUILDING_MAP[tile.buildingId];
  const refundCoins = Math.round(def.coinCost * 0.4);
  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          index: t.index,
          row: t.row,
          col: t.col,
          unlocked: t.unlocked,
          tilled: false,
          kind: 'empty' as const,
        }
      : t
  );
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins + refundCoins,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const collectBuildingYield = (
  state: SchoolFarmState,
  tileIndex: number,
  todayDate: string = getTodayBangkokDate()
): { state: SchoolFarmState; ok: boolean; coinsEarned: number; fertilizerEarned: number; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'building' || !tile.buildingId) {
    return { state, ok: false, coinsEarned: 0, fertilizerEarned: 0, errorTh: 'ไม่พบสิ่งปลูกสร้างในช่องนี้' };
  }
  const def = BUILDING_MAP[tile.buildingId];
  if (def.dailyCoins <= 0 && !def.dailyFertilizer) {
    return { state, ok: false, coinsEarned: 0, fertilizerEarned: 0, errorTh: `${def.nameTh} เป็นสิ่งปลูกสร้างตกแต่งเมือง` };
  }
  if (tile.lastCollectedDate === todayDate) {
    return { state, ok: false, coinsEarned: 0, fertilizerEarned: 0, errorTh: 'เก็บผลผลิตของวันนี้ไปแล้ว รอรับใหม่พรุ่งนี้นะ' };
  }

  const lvlMult = tile.buildingLevel || 1;
  const coinsEarned = def.dailyCoins * lvlMult;
  const fertilizerEarned = (def.dailyFertilizer || 0) * lvlMult;

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex ? { ...t, lastCollectedDate: todayDate } : t
  );

  return {
    ok: true,
    coinsEarned,
    fertilizerEarned,
    state: {
      ...state,
      coins: state.coins + coinsEarned,
      fertilizer: state.fertilizer + fertilizerEarned,
      farmXp: state.farmXp + 15,
      tiles: nextTiles,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const craftProductOnFarm = (
  state: SchoolFarmState,
  productId: ProductId
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const prod = PRODUCT_MAP[productId];
  const hasBuilding = state.tiles.some(
    (t) => t.kind === 'building' && t.buildingId === prod.sourceBuildingId
  );
  if (!hasBuilding) {
    return {
      state,
      ok: false,
      errorTh: `ต้องสร้าง ${BUILDING_MAP[prod.sourceBuildingId].nameTh} บนฟาร์มก่อนจึงจะผลิตได้`,
    };
  }

  const nextBarn = { ...state.barn };
  const nextGoods = { ...(state.goods || emptyProductsRecord()) };

  for (const ing of prod.ingredients) {
    if (ing.kind === 'crop') {
      const cropId = ing.id as CropId;
      if ((nextBarn[cropId] || 0) < ing.qty) {
        return {
          state,
          ok: false,
          errorTh: `ต้องใช้ ${CROP_MAP[cropId].nameTh} ${ing.qty} ชิ้น (มี ${nextBarn[cropId] || 0})`,
        };
      }
      nextBarn[cropId] -= ing.qty;
    } else {
      const pid = ing.id as ProductId;
      if ((nextGoods[pid] || 0) < ing.qty) {
        return {
          state,
          ok: false,
          errorTh: `ต้องใช้ ${PRODUCT_MAP[pid].nameTh} ${ing.qty} ชิ้น (มี ${nextGoods[pid] || 0})`,
        };
      }
      nextGoods[pid] -= ing.qty;
    }
  }

  nextGoods[productId] = (nextGoods[productId] || 0) + 1;

  return {
    ok: true,
    state: {
      ...state,
      barn: nextBarn,
      goods: nextGoods,
      farmXp: state.farmXp + prod.xpReward,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const fulfillVisitorRequest = (
  state: SchoolFarmState,
  visitorId: string
): { state: SchoolFarmState; ok: boolean; visitor?: VisitorRequest; errorTh?: string } => {
  const visitor = (state.visitorQueue || []).find((v) => v.id === visitorId);
  if (!visitor) return { state, ok: false, errorTh: 'ไม่พบผู้มาเยือนนี้' };

  const nextBarn = { ...state.barn };
  const nextGoods = { ...(state.goods || emptyProductsRecord()) };

  if (visitor.itemKind === 'crop') {
    const cid = visitor.itemId as CropId;
    if ((nextBarn[cid] || 0) < visitor.quantity) {
      return {
        state,
        ok: false,
        errorTh: `ต้องการ ${CROP_MAP[cid].nameTh} ${visitor.quantity} ชิ้น (มี ${nextBarn[cid] || 0})`,
      };
    }
    nextBarn[cid] -= visitor.quantity;
  } else {
    const pid = visitor.itemId as ProductId;
    if ((nextGoods[pid] || 0) < visitor.quantity) {
      return {
        state,
        ok: false,
        errorTh: `ต้องการ ${PRODUCT_MAP[pid].nameTh} ${visitor.quantity} ชิ้น (มี ${nextGoods[pid] || 0})`,
      };
    }
    nextGoods[pid] -= visitor.quantity;
  }

  const { level } = getTownLevelFromXp(state.farmXp + visitor.rewardXp);
  const replacement = createVisitorRequests(level, state.totalOrdersCompleted + state.visitorQueue.length + 1)[0];

  return {
    ok: true,
    visitor,
    state: {
      ...state,
      coins: state.coins + visitor.rewardCoins,
      farmXp: state.farmXp + visitor.rewardXp,
      barn: nextBarn,
      goods: nextGoods,
      totalOrdersCompleted: state.totalOrdersCompleted + 1,
      visitorQueue: state.visitorQueue.map((v) => (v.id === visitorId ? replacement : v)),
      updatedAt: new Date().toISOString(),
    },
  };
};

export const dismissVisitorRequest = (
  state: SchoolFarmState,
  visitorId: string
): SchoolFarmState => {
  const { level } = getTownLevelFromXp(state.farmXp);
  const replacement = createVisitorRequests(level, Math.floor(Math.random() * 10) + state.totalOrdersCompleted + 1)[0];
  return {
    ...state,
    visitorQueue: (state.visitorQueue || []).map((v) => (v.id === visitorId ? replacement : v)),
    updatedAt: new Date().toISOString(),
  };
};

export const listItemInRoadsideShop = (
  state: SchoolFarmState,
  itemKind: 'crop' | 'product',
  itemId: CropId | ProductId,
  quantity: number,
  priceCoins: number
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  if (quantity <= 0 || priceCoins <= 0) {
    return { state, ok: false, errorTh: 'จำนวนและราคาต้องมากกว่า 0' };
  }
  const activeListings = (state.roadsideShop || []).filter((l) => !l.sold);
  if (activeListings.length >= 6) {
    return { state, ok: false, errorTh: 'แผงร้านค้าริมทางเต็มแล้ว (วางขายได้สูงสุด 6 ช่อง)' };
  }

  const nextBarn = { ...state.barn };
  const nextGoods = { ...(state.goods || emptyProductsRecord()) };
  if (itemKind === 'crop') {
    const cid = itemId as CropId;
    if ((nextBarn[cid] || 0) < quantity) {
      return { state, ok: false, errorTh: 'ผลผลิตในโรงนาไม่พอ' };
    }
    nextBarn[cid] -= quantity;
  } else {
    const pid = itemId as ProductId;
    if ((nextGoods[pid] || 0) < quantity) {
      return { state, ok: false, errorTh: 'สินค้าแปรรูปในคลังไม่พอ' };
    }
    nextGoods[pid] -= quantity;
  }

  const listing: RoadsideListing = {
    id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemKind,
    itemId,
    quantity,
    priceCoins,
    sold: false,
  };

  return {
    ok: true,
    state: {
      ...state,
      barn: nextBarn,
      goods: nextGoods,
      roadsideShop: [listing, ...(state.roadsideShop || []).slice(0, 9)],
      updatedAt: new Date().toISOString(),
    },
  };
};

export const buyFromNeighborRoadsideShop = (
  buyerState: SchoolFarmState,
  sellerState: SchoolFarmState,
  listingId: string
): {
  buyerState: SchoolFarmState;
  sellerState: SchoolFarmState;
  ok: boolean;
  errorTh?: string;
} => {
  if (buyerState.userId === sellerState.userId) {
    return { buyerState, sellerState, ok: false, errorTh: 'ไม่สามารถซื้อสินค้าจากร้านของตัวเองได้' };
  }
  const listing = (sellerState.roadsideShop || []).find((l) => l.id === listingId && !l.sold);
  if (!listing) {
    return { buyerState, sellerState, ok: false, errorTh: 'สินค้ารายการนี้ถูกซื้อไปแล้ว' };
  }
  if (buyerState.coins < listing.priceCoins) {
    return { buyerState, sellerState, ok: false, errorTh: `เหรียญฟาร์มไม่พอ (ต้องการ ${listing.priceCoins}🪙)` };
  }

  const nextBuyerBarn = { ...buyerState.barn };
  const nextBuyerGoods = { ...(buyerState.goods || emptyProductsRecord()) };
  if (listing.itemKind === 'crop') {
    const cid = listing.itemId as CropId;
    nextBuyerBarn[cid] = (nextBuyerBarn[cid] || 0) + listing.quantity;
  } else {
    const pid = listing.itemId as ProductId;
    nextBuyerGoods[pid] = (nextBuyerGoods[pid] || 0) + listing.quantity;
  }

  return {
    ok: true,
    buyerState: {
      ...buyerState,
      coins: buyerState.coins - listing.priceCoins,
      barn: nextBuyerBarn,
      goods: nextBuyerGoods,
      farmXp: buyerState.farmXp + 8,
      updatedAt: new Date().toISOString(),
    },
    sellerState: {
      ...sellerState,
      coins: sellerState.coins + listing.priceCoins,
      roadsideShop: sellerState.roadsideShop.map((l) =>
        l.id === listingId ? { ...l, sold: true, buyerName: buyerState.ownerName } : l
      ),
      updatedAt: new Date().toISOString(),
    },
  };
};

export const getCropSellMultiplier = (state: SchoolFarmState): number => {
  const bakeryBonus = state.tiles.reduce((sum, t) => {
    if (t.kind === 'building' && t.buildingId === 'windmill_bakery') {
      return sum + 0.2 * (t.buildingLevel || 1);
    }
    return sum;
  }, 0);
  return 1 + bakeryBonus;
};

export const buySeedPack = (
  state: SchoolFarmState,
  cropId: CropId,
  quantity = 1
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const def = CROP_MAP[cropId];
  const totalCost = def.seedCost * quantity;
  if (state.coins < totalCost) {
    return { state, ok: false, errorTh: `เหรียญฟาร์มไม่พอ (ต้องการ ${totalCost} เหรียญ)` };
  }
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - totalCost,
      seeds: {
        ...state.seeds,
        [cropId]: (state.seeds[cropId] || 0) + quantity,
      },
      updatedAt: new Date().toISOString(),
    },
  };
};

export const sellCropFromBarn = (
  state: SchoolFarmState,
  cropId: CropId,
  quantity = 1
): { state: SchoolFarmState; ok: boolean; coinsEarned: number; errorTh?: string } => {
  const owned = state.barn[cropId] || 0;
  if (owned < quantity) {
    return { state, ok: false, coinsEarned: 0, errorTh: 'ผลผลิตในยุ้งฉางไม่พอ' };
  }
  const def = CROP_MAP[cropId];
  const mult = getCropSellMultiplier(state);
  const coinsEarned = Math.round(def.sellPrice * quantity * mult);
  return {
    ok: true,
    coinsEarned,
    state: {
      ...state,
      coins: state.coins + coinsEarned,
      barn: {
        ...state.barn,
        [cropId]: owned - quantity,
      },
      farmXp: state.farmXp + 6 * quantity,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const fulfillMarketOrder = (
  state: SchoolFarmState,
  orderId: string
): { state: SchoolFarmState; ok: boolean; order?: MarketOrder; errorTh?: string } => {
  const order = state.marketOrders.find((o) => o.id === orderId);
  if (!order) return { state, ok: false, errorTh: 'ไม่พบออเดอร์นี้' };
  const ownedCrop = state.barn[order.cropId] || 0;
  if (ownedCrop < order.quantity) {
    return {
      state,
      ok: false,
      errorTh: `ต้องการ${CROP_MAP[order.cropId].nameTh} ${order.quantity} ชิ้น (มีอยู่ ${ownedCrop} ชิ้น)`,
    };
  }

  const nextGoods = { ...(state.goods || emptyProductsRecord()) };
  if (order.productId && order.productQty) {
    const ownedProd = nextGoods[order.productId] || 0;
    if (ownedProd < order.productQty) {
      return {
        state,
        ok: false,
        errorTh: `ต้องการ ${PRODUCT_MAP[order.productId].nameTh} ${order.productQty} ชิ้น (มีอยู่ ${ownedProd} ชิ้น)`,
      };
    }
    nextGoods[order.productId] = ownedProd - order.productQty;
  }

  const { level } = getTownLevelFromXp(state.farmXp + order.rewardXp);
  const freshReplacements = createMarketOrders(level, state.totalOrdersCompleted + 1);
  const nextOrders = state.marketOrders.map((o) => (o.id === orderId ? freshReplacements[0] : o));

  return {
    ok: true,
    order,
    state: {
      ...state,
      coins: state.coins + order.rewardCoins,
      farmXp: state.farmXp + order.rewardXp,
      townStars: state.townStars + 1,
      totalOrdersCompleted: state.totalOrdersCompleted + 1,
      barn: {
        ...state.barn,
        [order.cropId]: ownedCrop - order.quantity,
      },
      goods: nextGoods,
      marketOrders: nextOrders,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const applyQuizBoostReward = (
  state: SchoolFarmState,
  todayDate: string = getTodayBangkokDate()
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const countToday = state.lastQuizBoostDate === todayDate ? state.quizBoostCountToday : 0;
  if (countToday >= 3) {
    return { state, ok: false, errorTh: 'วันนี้รับโบนัสทบทวนความรู้ครบ 3 ครั้งแล้ว กลับมาใหม่พรุ่งนี้นะ!' };
  }
  return {
    ok: true,
    state: {
      ...state,
      water: state.water + 2,
      fertilizer: state.fertilizer + 1,
      coins: state.coins + 18,
      farmXp: state.farmXp + 15,
      lastQuizBoostDate: todayDate,
      quizBoostCountToday: countToday + 1,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const helpNeighborFarm = (
  helperState: SchoolFarmState,
  neighborState: SchoolFarmState,
  todayDate: string = getTodayBangkokDate(),
  targetTileIndex?: number
): {
  helperState: SchoolFarmState;
  neighborState: SchoolFarmState;
  ok: boolean;
  wateredCropTile?: boolean;
  errorTh?: string;
} => {
  if (helperState.userId === neighborState.userId) {
    return { helperState, neighborState, ok: false, errorTh: 'ไม่สามารถช่วยรดน้ำฟาร์มตัวเองซ้ำได้' };
  }
  if (helperState.helpedNeighborDates[neighborState.userId] === todayDate) {
    return { helperState, neighborState, ok: false, errorTh: 'วันนี้คุณช่วยรดน้ำฟาร์มของเพื่อนคนนี้แล้ว' };
  }

  let wateredCropTile = false;
  const nextNeighborTiles = neighborState.tiles.map((t, idx) => {
    if (
      targetTileIndex !== undefined &&
      idx === targetTileIndex &&
      t.kind === 'crop' &&
      t.cropId &&
      (t.growthProgress || 0) < CROP_MAP[t.cropId].watersNeeded
    ) {
      wateredCropTile = true;
      return {
        ...t,
        growthProgress: Math.min(CROP_MAP[t.cropId].watersNeeded, (t.growthProgress || 0) + 1),
        wateredToday: true,
      };
    }
    return t;
  });

  return {
    ok: true,
    wateredCropTile,
    helperState: {
      ...helperState,
      coins: helperState.coins + 15,
      farmXp: helperState.farmXp + 12,
      helpedNeighborDates: {
        ...helperState.helpedNeighborDates,
        [neighborState.userId]: todayDate,
      },
      updatedAt: new Date().toISOString(),
    },
    neighborState: {
      ...neighborState,
      water: neighborState.water + 2,
      coins: neighborState.coins + 10,
      tiles: nextNeighborTiles,
      helpReceivedDates: Array.from(new Set([...neighborState.helpReceivedDates, todayDate])),
      updatedAt: new Date().toISOString(),
    },
  };
};

export const grantTeacherBonusToFarm = (
  targetState: SchoolFarmState,
  bonus: { water?: number; fertilizer?: number; stars?: number; coins?: number }
): SchoolFarmState => {
  return {
    ...targetState,
    water: targetState.water + (bonus.water || 0),
    fertilizer: targetState.fertilizer + (bonus.fertilizer || 0),
    townStars: targetState.townStars + (bonus.stars || 0),
    coins: targetState.coins + (bonus.coins || 0),
    updatedAt: new Date().toISOString(),
  };
};
