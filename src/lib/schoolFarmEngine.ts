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
  | 'tomato'
  | 'strawberry'
  | 'jasmine_rice'
  | 'pumpkin'
  | 'golden_melon';

export type BuildingId =
  | 'chicken_coop'
  | 'dairy_barn'
  | 'school_greenhouse'
  | 'windmill_bakery'
  | 'town_fountain';

export type FarmTool =
  | 'inspect'
  | 'plant'
  | 'water'
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

export interface BuildingDefinition {
  id: BuildingId;
  nameTh: string;
  nameEn: string;
  coinCost: number;
  starCost: number;
  unlockTownLevel: number;
  dailyCoins: number;
  dailyFertilizer?: number;
  cropSellBonusPct?: number;
  prosperityPoints: number;
  descTh: string;
  descEn: string;
}

export interface FarmTile {
  index: number;
  row: number;
  col: number;
  unlocked: boolean;
  kind: 'empty' | 'crop' | 'building' | 'weed';
  cropId?: CropId;
  growthProgress?: number; // 0..watersNeeded
  wateredToday?: boolean;
  fertilized?: boolean;
  buildingId?: BuildingId;
  buildingLevel?: number;
  lastCollectedDate?: string;
  weedSourceId?: string;
}

export interface MarketOrder {
  id: string;
  titleTh: string;
  titleEn: string;
  cropId: CropId;
  quantity: number;
  rewardCoins: number;
  rewardXp: number;
  rewardGems: number;
}

export interface SchoolFarmState {
  version: 1;
  userId: string;
  schoolId: string;
  studentId?: string;
  ownerName: string;
  ownerRoom?: string;
  farmName: string;
  coins: number;
  water: number;
  fertilizer: number;
  townStars: number;
  farmXp: number;
  seeds: Record<CropId, number>;
  barn: Record<CropId, number>;
  tiles: FarmTile[];
  marketOrders: MarketOrder[];
  claimedAttendanceDates: string[];
  claimedHomeworkIds: string[];
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
  totalMeritPoints: number;
  unresolvedDemeritIds: string[];
  claimableWater: number;
  claimableFertilizer: number;
  claimableSeeds: Partial<Record<CropId, number>>;
  claimableStars: number;
  claimableCoins: number;
  newAttendanceDateToClaim: string | null;
  newHomeworkIdsToClaim: string[];
  newMeritIdsToClaim: string[];
  hasAnythingToClaim: boolean;
}

export const FARM_GRID_SIZE = 6;

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
    descTh: 'โตไว เก็บเกี่ยวได้ใน 2 ครั้งรดน้ำ',
    descEn: 'Fast-growing staple crop (2 waters)',
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
    id: 'jasmine_rice',
    nameTh: 'ข้าวหอมมะลิ',
    nameEn: 'Jasmine Rice',
    watersNeeded: 3,
    seedCost: 32,
    sellPrice: 92,
    xpReward: 30,
    unlockTownLevel: 2,
    accentColor: '#84cc16',
    descTh: 'พืชเศรษฐกิจประจำชุมชนโรงเรียน',
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
    descTh: 'ผลใหญ่ราคาสูง เหมาะกับออเดอร์เทศกาล',
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

export const BUILDING_CATALOG: BuildingDefinition[] = [
  {
    id: 'chicken_coop',
    nameTh: 'เล้าไก่ไข่แสนรู้',
    nameEn: 'Cozy Chicken Coop',
    coinCost: 65,
    starCost: 2,
    unlockTownLevel: 1,
    dailyCoins: 28,
    prosperityPoints: 25,
    descTh: 'เก็บผลผลิตไข่สดรับ +28 เหรียญฟาร์มทุกวัน',
    descEn: 'Produces fresh eggs for +28 coins daily',
  },
  {
    id: 'town_fountain',
    nameTh: 'ลานน้ำพุกลางเมือง',
    nameEn: 'Town Plaza Fountain',
    coinCost: 90,
    starCost: 3,
    unlockTownLevel: 1,
    dailyCoins: 24,
    prosperityPoints: 40,
    descTh: 'เพิ่มความเจริญเมืองและรายได้ประจำวัน +24 เหรียญ',
    descEn: 'Boosts town prosperity and +24 coins daily',
  },
  {
    id: 'dairy_barn',
    nameTh: 'คอกวัวนมสด',
    nameEn: 'Sunny Dairy Barn',
    coinCost: 115,
    starCost: 4,
    unlockTownLevel: 2,
    dailyCoins: 48,
    prosperityPoints: 50,
    descTh: 'ผลิตนมสดโรงเรียนรับ +48 เหรียญทุกวัน',
    descEn: 'Produces school milk for +48 coins daily',
  },
  {
    id: 'school_greenhouse',
    nameTh: 'เรือนกระจกพฤกษศาสตร์',
    nameEn: 'Botanical Greenhouse',
    coinCost: 145,
    starCost: 5,
    unlockTownLevel: 2,
    dailyCoins: 30,
    dailyFertilizer: 1,
    prosperityPoints: 60,
    descTh: 'ผลิต +30 เหรียญ และปุ๋ยทองคำ +1 ถุงทุกวัน',
    descEn: 'Yields +30 coins & +1 fertilizer daily',
  },
  {
    id: 'windmill_bakery',
    nameTh: 'โรงสี & ร้านเบเกอรี่',
    nameEn: 'Windmill Bakery',
    coinCost: 175,
    starCost: 6,
    unlockTownLevel: 3,
    dailyCoins: 64,
    cropSellBonusPct: 20,
    prosperityPoints: 80,
    descTh: 'เพิ่มราคาขายพืชผล +20% และรับ +64 เหรียญทุกวัน',
    descEn: '+20% crop market price & +64 coins daily',
  },
];

export const CROP_MAP: Record<CropId, CropDefinition> = Object.fromEntries(
  CROP_CATALOG.map((c) => [c.id, c])
) as Record<CropId, CropDefinition>;

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
  return level * 50 + unlockedCount * 6 + buildingScore + state.totalOrdersCompleted * 15;
};

export const getPlotUnlockStarCost = (unlockedCount: number): number => {
  if (unlockedCount < 20) return 1;
  if (unlockedCount < 28) return 2;
  return 3;
};

export const createMarketOrders = (townLevel: number, seedOffset = 0): MarketOrder[] => {
  const pool: Omit<MarketOrder, 'id'>[] = [
    {
      titleTh: 'โรงอาหารโรงเรียนสั่งข้าวโพดหวาน',
      titleEn: 'Cafeteria Sweet Corn Order',
      cropId: 'corn',
      quantity: 2,
      rewardCoins: 72,
      rewardXp: 28,
      rewardGems: 2,
    },
    {
      titleTh: 'ชมรมคหกรรมต้องการมะเขือเทศสด',
      titleEn: 'Home Ec Cherry Tomato Crate',
      cropId: 'tomato',
      quantity: 2,
      rewardCoins: 108,
      rewardXp: 36,
      rewardGems: 3,
    },
    {
      titleTh: 'บูธน้ำผลไม้งานวิชาการ',
      titleEn: 'Academic Fair Strawberry Stand',
      cropId: 'strawberry',
      quantity: 2,
      rewardCoins: 175,
      rewardXp: 52,
      rewardGems: 4,
    },
    ...(townLevel >= 2
      ? [
          {
            titleTh: 'สหกรณ์โรงเรียนสั่งข้าวหอมมะลิ',
            titleEn: 'School Co-op Jasmine Rice Pack',
            cropId: 'jasmine_rice' as CropId,
            quantity: 2,
            rewardCoins: 215,
            rewardXp: 65,
            rewardGems: 5,
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
            rewardCoins: 315,
            rewardXp: 90,
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
            rewardCoins: 265,
            rewardXp: 85,
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
  tomato: 0,
  strawberry: 0,
  jasmine_rice: 0,
  pumpkin: 0,
  golden_melon: 0,
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
        kind: 'empty',
      });
    }
  }

  // Starter crops so the player immediately sees life on the farm
  const starterPlot1 = tiles.find((t) => t.row === 2 && t.col === 2);
  if (starterPlot1) {
    starterPlot1.kind = 'crop';
    starterPlot1.cropId = 'corn';
    starterPlot1.growthProgress = 2; // ready to harvest right away!
    starterPlot1.wateredToday = true;
  }
  const starterPlot2 = tiles.find((t) => t.row === 2 && t.col === 3);
  if (starterPlot2) {
    starterPlot2.kind = 'crop';
    starterPlot2.cropId = 'tomato';
    starterPlot2.growthProgress = 1;
    starterPlot2.wateredToday = false;
  }

  return {
    version: 1,
    userId: params.userId,
    schoolId: params.schoolId,
    studentId: params.studentId,
    ownerName: params.ownerName,
    ownerRoom: params.ownerRoom,
    farmName: params.farmName || `ฟาร์มของ${params.ownerName.split(' ')[0] || 'ฉัน'}`,
    coins: 70,
    water: 5,
    fertilizer: 2,
    townStars: 3,
    farmXp: 25,
    seeds: {
      corn: 3,
      tomato: 2,
      strawberry: 0,
      jasmine_rice: 0,
      pumpkin: 0,
      golden_melon: 0,
    },
    barn: emptyRecord(),
    tiles,
    marketOrders: createMarketOrders(1, 0),
    claimedAttendanceDates: [],
    claimedHomeworkIds: [],
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
  const normalizedTiles: FarmTile[] = Array.isArray(raw.tiles) && raw.tiles.length === FARM_GRID_SIZE * FARM_GRID_SIZE
    ? raw.tiles.map((tile, idx) => ({
        index: idx,
        row: Math.floor(idx / FARM_GRID_SIZE),
        col: idx % FARM_GRID_SIZE,
        unlocked: Boolean(tile?.unlocked),
        kind: tile?.kind === 'crop' || tile?.kind === 'building' || tile?.kind === 'weed' ? tile.kind : 'empty',
        cropId: tile?.cropId,
        growthProgress: typeof tile?.growthProgress === 'number' ? tile.growthProgress : undefined,
        wateredToday: Boolean(tile?.wateredToday),
        fertilized: Boolean(tile?.fertilized),
        buildingId: tile?.buildingId,
        buildingLevel: typeof tile?.buildingLevel === 'number' ? tile.buildingLevel : undefined,
        lastCollectedDate: tile?.lastCollectedDate,
        weedSourceId: tile?.weedSourceId,
      }))
    : base.tiles;

  return {
    ...base,
    ...raw,
    version: 1,
    schoolId: fallbackParams.schoolId,
    userId: fallbackParams.userId,
    studentId: raw.studentId || fallbackParams.studentId,
    ownerName: raw.ownerName || fallbackParams.ownerName,
    ownerRoom: raw.ownerRoom || fallbackParams.ownerRoom,
    seeds: { ...emptyRecord(), ...(raw.seeds || {}) },
    barn: { ...emptyRecord(), ...(raw.barn || {}) },
    tiles: normalizedTiles,
    marketOrders: Array.isArray(raw.marketOrders) && raw.marketOrders.length > 0 ? raw.marketOrders : base.marketOrders,
    claimedAttendanceDates: Array.isArray(raw.claimedAttendanceDates) ? raw.claimedAttendanceDates : [],
    claimedHomeworkIds: Array.isArray(raw.claimedHomeworkIds) ? raw.claimedHomeworkIds : [],
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
      // Allow weekend gap (Fri -> Mon is 3 days) so school attendance streaks stay encouraging
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
  let claimableFertilizer = 0;
  let claimableCoins = 0;
  if (
    (attendanceStatusToday === 'present' || attendanceStatusToday === 'late') &&
    !params.farmState.claimedAttendanceDates.includes(todayDate)
  ) {
    newAttendanceDateToClaim = todayDate;
    const streakBonus = Math.min(3, Math.floor(attendanceStreakDays / 3));
    claimableWater += (attendanceStatusToday === 'present' ? 4 : 2) + streakBonus;
    claimableFertilizer += attendanceStatusToday === 'present' ? 2 : 1;
    claimableCoins += attendanceStatusToday === 'present' ? 20 : 10;
  }

  // 2. Homework check
  const personalSubmissions = params.homeworkSubmissions.filter(
    (sub) =>
      candidateIds.has(sub.studentId) &&
      (sub.status === 'submitted' || sub.status === 'graded' || sub.status === 'late')
  );
  const submittedAssignmentIds = new Set(personalSubmissions.map((s) => s.assignmentId));

  // Also include assignment.submittedStudentIds if no HomeworkSubmission row exists
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

  const newHomeworkIdsToClaim = allCompletedHwTokens
    .filter((t) => !params.farmState.claimedHomeworkIds.includes(t.tokenId))
    .map((t) => t.tokenId);

  const claimableSeeds: Partial<Record<CropId, number>> = {};
  if (newHomeworkIdsToClaim.length > 0) {
    // Cap batch claim visually reasonable while rewarding each completed homework
    const count = newHomeworkIdsToClaim.length;
    claimableSeeds.corn = (claimableSeeds.corn || 0) + count;
    claimableSeeds.tomato = (claimableSeeds.tomato || 0) + count;
    if (submittedHomeworkCount >= 1) {
      claimableSeeds.strawberry = (claimableSeeds.strawberry || 0) + Math.min(3, count);
    }
    if (submittedHomeworkCount >= 3) {
      claimableSeeds.golden_melon = (claimableSeeds.golden_melon || 0) + 1;
    }
    claimableCoins += count * 15;
  }

  // 3. Behavior check (Merits -> Town Stars, Demerits -> Weeds)
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

  const unresolvedDemeritIds = demeritRecords
    .filter((b) => !params.farmState.resolvedDemeritIds.includes(b.id))
    .map((b) => b.id);

  const hasAnythingToClaim =
    Boolean(newAttendanceDateToClaim) ||
    newHomeworkIdsToClaim.length > 0 ||
    newMeritIdsToClaim.length > 0;

  return {
    todayDate,
    matchedStudentId: matchedStudent?.id,
    attendanceStatusToday,
    attendanceStreakDays,
    submittedHomeworkCount,
    pendingHomeworkCount: pendingAssignments.length,
    pendingHomeworkTitles: pendingAssignments.slice(0, 3).map((a) => a.titleTh || a.titleEn),
    totalMeritPoints,
    unresolvedDemeritIds,
    claimableWater,
    claimableFertilizer,
    claimableSeeds,
    claimableStars,
    claimableCoins,
    newAttendanceDateToClaim,
    newHomeworkIdsToClaim,
    newMeritIdsToClaim,
    hasAnythingToClaim,
  };
};

export const syncBehaviorWeedsOntoFarm = (
  state: SchoolFarmState,
  unresolvedDemeritIds: string[]
): SchoolFarmState => {
  if (unresolvedDemeritIds.length === 0) return state;
  const existingWeedSources = new Set(
    state.tiles
      .filter((t) => t.kind === 'weed' && t.weedSourceId)
      .map((t) => t.weedSourceId as string)
  );
  const pendingToSpawn = unresolvedDemeritIds
    .filter((id) => !existingWeedSources.has(id) && !state.resolvedDemeritIds.includes(id))
    .slice(0, 3);
  if (pendingToSpawn.length === 0) return state;

  const nextTiles = state.tiles.map((t) => ({ ...t }));
  for (const demeritId of pendingToSpawn) {
    const emptySlot = nextTiles.find((t) => t.unlocked && t.kind === 'empty');
    if (!emptySlot) break;
    emptySlot.kind = 'weed';
    emptySlot.weedSourceId = demeritId;
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

  return {
    ...state,
    coins: state.coins + summary.claimableCoins,
    water: state.water + summary.claimableWater,
    fertilizer: state.fertilizer + summary.claimableFertilizer,
    townStars: state.townStars + summary.claimableStars,
    farmXp: state.farmXp + (summary.newAttendanceDateToClaim ? 12 : 0) + summary.newHomeworkIdsToClaim.length * 10,
    seeds: nextSeeds,
    claimedAttendanceDates: nextAttDates,
    claimedHomeworkIds: Array.from(new Set([...state.claimedHomeworkIds, ...summary.newHomeworkIdsToClaim])),
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

export const plantCropOnTile = (
  state: SchoolFarmState,
  tileIndex: number,
  cropId: CropId
): { state: SchoolFarmState; ok: boolean; errorTh?: string } => {
  const tile = state.tiles[tileIndex];
  if (!tile) return { state, ok: false, errorTh: 'ไม่พบแปลงที่เลือก' };
  if (!tile.unlocked) return { state, ok: false, errorTh: 'แปลงนี้ยังไม่ปลดล็อก ต้องใช้ดาวเมืองปลดล็อกก่อน' };
  if (tile.kind === 'weed') return { state, ok: false, errorTh: 'มีวัชพืชขึ้นอยู่ กรุณาถอนวัชพืชก่อนปลูก' };
  if (tile.kind !== 'empty') return { state, ok: false, errorTh: 'แปลงนี้ไม่ว่าง' };
  if ((state.seeds[cropId] || 0) <= 0) {
    return { state, ok: false, errorTh: 'เมล็ดพันธุ์หมด ซื้อเพิ่มที่ตลาดหรือส่งการบ้านเพื่อรับเมล็ดฟรี' };
  }

  const nextTiles = state.tiles.map((t, idx) =>
    idx === tileIndex
      ? {
          ...t,
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
    return { state, ok: false, errorTh: 'ปุ๋ยทองคำหมด เช็กชื่อตรงเวลาหรือสร้างเรือนกระจกเพื่อรับปุ๋ยเพิ่ม' };
  }

  // Fertilizer instantly advances crop to full maturity + bonus yield flag!
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
    return { state, ok: false, errorTh: 'แปลงนี้ไม่มีวัชพืช' };
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
    idx === tileIndex ? { ...t, unlocked: true } : t
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
  const { level } = getTownLevelFromXp(state.farmXp);
  if (level < def.unlockTownLevel) {
    return { state, ok: false, errorTh: `ต้องมีระดับเมือง Lv.${def.unlockTownLevel} ขึ้นไป` };
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
          lastCollectedDate: '', // Ready to collect first yield right away!
        }
      : t
  );

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - def.coinCost,
      townStars: state.townStars - def.starCost,
      farmXp: state.farmXp + 45,
      tiles: nextTiles,
      updatedAt: `${today}T${new Date().toISOString().slice(11)}`,
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
  if (tile.lastCollectedDate === todayDate) {
    return { state, ok: false, coinsEarned: 0, fertilizerEarned: 0, errorTh: 'เก็บผลผลิตของวันนี้ไปแล้ว รอรับใหม่พรุ่งนี้นะ' };
  }

  const def = BUILDING_MAP[tile.buildingId];
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

export const getCropSellMultiplier = (state: SchoolFarmState): number => {
  const bakeryCount = state.tiles.filter(
    (t) => t.kind === 'building' && t.buildingId === 'windmill_bakery'
  ).length;
  return 1 + bakeryCount * 0.2;
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
  const owned = state.barn[order.cropId] || 0;
  if (owned < order.quantity) {
    return {
      state,
      ok: false,
      errorTh: `ต้องการ${CROP_MAP[order.cropId].nameTh} ${order.quantity} ชิ้น (มีอยู่ ${owned} ชิ้น)`,
    };
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
        [order.cropId]: owned - order.quantity,
      },
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
  todayDate: string = getTodayBangkokDate()
): {
  helperState: SchoolFarmState;
  neighborState: SchoolFarmState;
  ok: boolean;
  errorTh?: string;
} => {
  if (helperState.userId === neighborState.userId) {
    return { helperState, neighborState, ok: false, errorTh: 'ไม่สามารถช่วยรดน้ำฟาร์มตัวเองซ้ำได้' };
  }
  if (helperState.helpedNeighborDates[neighborState.userId] === todayDate) {
    return { helperState, neighborState, ok: false, errorTh: 'วันนี้คุณช่วยรดน้ำฟาร์มของเพื่อนคนนี้แล้ว' };
  }
  return {
    ok: true,
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
