import { useCallback, useEffect, useMemo, useState } from 'react';

export interface IsoGridCoord {
  row: number;
  col: number;
}

export interface IsoScreenPoint {
  x: number;
  y: number;
}

export type PlantGrowthStage =
  | 'seed'
  | 'sprout'
  | 'growing'
  | 'flowering'
  | 'harvestable';

export type IsoCropId =
  | 'wheat'
  | 'corn'
  | 'carrot'
  | 'tomato'
  | 'strawberry'
  | 'pumpkin'
  | 'sunflower'
  | 'golden_melon';

export type FarmBuildingType =
  | 'farmhouse'
  | 'silo'
  | 'barn'
  | 'chicken_coop'
  | 'dairy_barn'
  | 'bakery'
  | 'roadside_stand';

export type FarmTileKind = 'grass' | 'soil' | 'crop' | 'building' | 'pond' | 'path';

export type FarmActionTool =
  | 'pan'
  | 'sickle'
  | 'plant'
  | 'water'
  | 'fertilize'
  | 'till'
  | 'build'
  | 'expand';

export interface IsoCropDefinition {
  id: IsoCropId;
  nameTh: string;
  nameEn: string;
  unlockLevel: number;
  growDurationMs: number;
  seedCostGold: number;
  sellGold: number;
  xpGain: number;
  harvestYield: number;
  accentColor: string;
  foliageColor: string;
}

export interface IsoBuildingDefinition {
  type: FarmBuildingType;
  nameTh: string;
  nameEn: string;
  unlockLevel: number;
  costGold: number;
  xpGain: number;
  produceGold: number;
  produceItemId?: string;
  produceItemNameTh?: string;
  produceCooldownMs: number;
  removable: boolean;
}

export interface PlantedCropState {
  cropId: IsoCropId;
  stage: PlantGrowthStage;
  stageIndex: number; // 0..4
  maxStages: number; // 4
  plantedAt: number;
  elapsedMs: number;
  wateredCount: number;
  isGoldenBoosted: boolean;
}

export interface FarmBuildingInstance {
  type: FarmBuildingType;
  level: number;
  lastProducedAt: number;
  readyToCollect: boolean;
}

export interface IsometricFarmTile {
  id: string;
  row: number;
  col: number;
  unlocked: boolean;
  kind: FarmTileKind;
  crop?: PlantedCropState;
  building?: FarmBuildingInstance;
}

export interface PlayerInventory {
  seeds: Record<IsoCropId, number>;
  crops: Record<IsoCropId, number>;
  goods: Record<string, number>;
  supplies: {
    waterCans: number;
    goldenFertilizer: number;
    expansionDeeds: number;
  };
  siloCapacity: number;
  barnCapacity: number;
}

export interface FarmTruckOrder {
  id: string;
  customerNameTh: string;
  customerTitleTh: string;
  cropId: IsoCropId;
  quantity: number;
  rewardGold: number;
  rewardXp: number;
  rewardDiamonds: number;
}

export interface FarmGameEvent {
  id: string;
  row: number;
  col: number;
  text: string;
  tone: 'gold' | 'xp' | 'harvest' | 'water' | 'warn';
  createdAt: number;
}

export interface FarmGameState {
  version: 1;
  gridSize: number;
  schoolId: string;
  userId: string;
  ownerName: string;
  farmName: string;
  gold: number;
  diamonds: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  inventory: PlayerInventory;
  tiles: IsometricFarmTile[];
  truckOrders: FarmTruckOrder[];
  totalHarvested: number;
  totalOrdersDelivered: number;
  soundMuted: boolean;
  musicMuted: boolean;
  lastTickAt: number;
}

export const DEFAULT_ISO_GRID_SIZE = 8;

export const GROWTH_STAGES: PlantGrowthStage[] = [
  'seed',
  'sprout',
  'growing',
  'flowering',
  'harvestable',
];

export const ISO_CROP_CATALOG: IsoCropDefinition[] = [
  {
    id: 'wheat',
    nameTh: 'ข้าวสาลีทอง',
    nameEn: 'Golden Wheat',
    unlockLevel: 1,
    growDurationMs: 12000,
    seedCostGold: 6,
    sellGold: 18,
    xpGain: 8,
    harvestYield: 2,
    accentColor: '#facc15',
    foliageColor: '#84cc16',
  },
  {
    id: 'corn',
    nameTh: 'ข้าวโพดหวาน',
    nameEn: 'Sweet Corn',
    unlockLevel: 1,
    growDurationMs: 18000,
    seedCostGold: 12,
    sellGold: 32,
    xpGain: 12,
    harvestYield: 2,
    accentColor: '#fbbf24',
    foliageColor: '#65a30d',
  },
  {
    id: 'carrot',
    nameTh: 'แครอทกรอบ',
    nameEn: 'Crisp Carrot',
    unlockLevel: 1,
    growDurationMs: 22000,
    seedCostGold: 16,
    sellGold: 42,
    xpGain: 16,
    harvestYield: 2,
    accentColor: '#f97316',
    foliageColor: '#22c55e',
  },
  {
    id: 'tomato',
    nameTh: 'มะเขือเทศแดง',
    nameEn: 'Cherry Tomato',
    unlockLevel: 2,
    growDurationMs: 28000,
    seedCostGold: 24,
    sellGold: 64,
    xpGain: 22,
    harvestYield: 2,
    accentColor: '#ef4444',
    foliageColor: '#16a34a',
  },
  {
    id: 'strawberry',
    nameTh: 'สตรอว์เบอร์รี',
    nameEn: 'Strawberry',
    unlockLevel: 2,
    growDurationMs: 36000,
    seedCostGold: 34,
    sellGold: 90,
    xpGain: 28,
    harvestYield: 2,
    accentColor: '#f43f5e',
    foliageColor: '#15803d',
  },
  {
    id: 'sunflower',
    nameTh: 'ทานตะวันยักษ์',
    nameEn: 'Giant Sunflower',
    unlockLevel: 3,
    growDurationMs: 42000,
    seedCostGold: 45,
    sellGold: 118,
    xpGain: 36,
    harvestYield: 2,
    accentColor: '#eab308',
    foliageColor: '#166534',
  },
  {
    id: 'pumpkin',
    nameTh: 'ฟักทองยักษ์',
    nameEn: 'Harvest Pumpkin',
    unlockLevel: 4,
    growDurationMs: 52000,
    seedCostGold: 60,
    sellGold: 155,
    xpGain: 48,
    harvestYield: 2,
    accentColor: '#ea580c',
    foliageColor: '#14532d',
  },
  {
    id: 'golden_melon',
    nameTh: 'เมล่อนทองคำ',
    nameEn: 'Golden Melon',
    unlockLevel: 5,
    growDurationMs: 64000,
    seedCostGold: 85,
    sellGold: 220,
    xpGain: 65,
    harvestYield: 2,
    accentColor: '#fde047',
    foliageColor: '#047857',
  },
];

export const ISO_CROP_MAP: Record<IsoCropId, IsoCropDefinition> = ISO_CROP_CATALOG.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<IsoCropId, IsoCropDefinition>
);

export const ISO_BUILDING_CATALOG: IsoBuildingDefinition[] = [
  {
    type: 'farmhouse',
    nameTh: 'บ้านพักเจ้าของฟาร์ม',
    nameEn: 'Farmhouse',
    unlockLevel: 1,
    costGold: 0,
    xpGain: 25,
    produceGold: 25,
    produceCooldownMs: 45000,
    removable: false,
  },
  {
    type: 'silo',
    nameTh: 'ไซโลเก็บพืชผล',
    nameEn: 'Grain Silo',
    unlockLevel: 1,
    costGold: 110,
    xpGain: 30,
    produceGold: 15,
    produceCooldownMs: 45000,
    removable: false,
  },
  {
    type: 'barn',
    nameTh: 'โรงนาใหญ่',
    nameEn: 'Red Barn',
    unlockLevel: 1,
    costGold: 130,
    xpGain: 35,
    produceGold: 20,
    produceCooldownMs: 45000,
    removable: false,
  },
  {
    type: 'chicken_coop',
    nameTh: 'เล้าไก่ไข่สด',
    nameEn: 'Chicken Coop',
    unlockLevel: 1,
    costGold: 140,
    xpGain: 35,
    produceGold: 36,
    produceItemId: 'fresh_egg',
    produceItemNameTh: 'ไข่ไก่สด',
    produceCooldownMs: 25000,
    removable: true,
  },
  {
    type: 'dairy_barn',
    nameTh: 'คอกวัวนม',
    nameEn: 'Dairy Barn',
    unlockLevel: 2,
    costGold: 240,
    xpGain: 55,
    produceGold: 62,
    produceItemId: 'fresh_milk',
    produceItemNameTh: 'นมโคสด',
    produceCooldownMs: 32000,
    removable: true,
  },
  {
    type: 'bakery',
    nameTh: 'เตาอบขนมปัง',
    nameEn: 'Country Bakery',
    unlockLevel: 3,
    costGold: 320,
    xpGain: 75,
    produceGold: 95,
    produceItemId: 'warm_bread',
    produceItemNameTh: 'ขนมปังหอมกรุ่น',
    produceCooldownMs: 40000,
    removable: true,
  },
  {
    type: 'roadside_stand',
    nameTh: 'แผงขายของริมทาง',
    nameEn: 'Roadside Shop',
    unlockLevel: 1,
    costGold: 120,
    xpGain: 30,
    produceGold: 32,
    produceCooldownMs: 30000,
    removable: true,
  },
];

export const ISO_BUILDING_MAP: Record<FarmBuildingType, IsoBuildingDefinition> =
  ISO_BUILDING_CATALOG.reduce((acc, b) => {
    acc[b.type] = b;
    return acc;
  }, {} as Record<FarmBuildingType, IsoBuildingDefinition>);

/**
 * Projects 2D isometric grid coordinates (row, col) into screen space (x, y).
 */
export function gridToIso(
  row: number,
  col: number,
  tileWidth: number,
  tileHeight: number,
  originX: number,
  originY: number
): IsoScreenPoint {
  return {
    x: originX + (col - row) * (tileWidth / 2),
    y: originY + (col + row) * (tileHeight / 2),
  };
}

/**
 * Inverse-projects screen coordinates (screenX, screenY) back into rounded grid (row, col).
 */
export function isoToGrid(
  screenX: number,
  screenY: number,
  tileWidth: number,
  tileHeight: number,
  originX: number,
  originY: number
): IsoGridCoord {
  const dx = (screenX - originX) / (tileWidth / 2);
  const dy = (screenY - originY) / (tileHeight / 2);
  const col = Math.round((dx + dy) / 2) || 0;
  const row = Math.round((dy - dx) / 2) || 0;
  return { row, col };
}

export function getXpRequiredForLevel(level: number): number {
  return Math.max(60, level * 65 + 35);
}

export function applyXpProgression(
  level: number,
  xp: number,
  gainedXp: number
): { level: number; xp: number; xpToNextLevel: number; leveledUp: boolean } {
  let nextLevel = level;
  let remainingXp = xp + Math.max(0, gainedXp);
  let needed = getXpRequiredForLevel(nextLevel);
  let leveledUp = false;

  while (remainingXp >= needed) {
    remainingXp -= needed;
    nextLevel += 1;
    needed = getXpRequiredForLevel(nextLevel);
    leveledUp = true;
  }

  return {
    level: nextLevel,
    xp: remainingXp,
    xpToNextLevel: needed,
    leveledUp,
  };
}

export function computeGrowthStage(
  elapsedMs: number,
  growDurationMs: number
): { stage: PlantGrowthStage; stageIndex: number } {
  const ratio = Math.max(0, Math.min(1, elapsedMs / Math.max(1000, growDurationMs)));
  if (ratio >= 1) return { stage: 'harvestable', stageIndex: 4 };
  if (ratio >= 0.72) return { stage: 'flowering', stageIndex: 3 };
  if (ratio >= 0.44) return { stage: 'growing', stageIndex: 2 };
  if (ratio >= 0.18) return { stage: 'sprout', stageIndex: 1 };
  return { stage: 'seed', stageIndex: 0 };
}

export function createSeedRecord(): Record<IsoCropId, number> {
  return {
    wheat: 0,
    corn: 0,
    carrot: 0,
    tomato: 0,
    strawberry: 0,
    sunflower: 0,
    pumpkin: 0,
    golden_melon: 0,
  };
}

export function createTruckOrders(level: number, seedOffset = 0): FarmTruckOrder[] {
  const availableCrops = ISO_CROP_CATALOG.filter((c) => c.unlockLevel <= level);
  const customers = [
    { nameTh: 'ป้ามาลี', titleTh: 'ร้านอาหารหน้าโรงเรียน' },
    { nameTh: 'ลุงสมชาย', titleTh: 'สหกรณ์เกษตรชุมชน' },
    { nameTh: 'ครูดาว', titleTh: 'โครงการอาหารกลางวัน' },
    { nameTh: 'น้องน้ำใส', titleTh: 'ชมรมเบเกอรี่นักเรียน' },
  ];

  const orders: FarmTruckOrder[] = [];
  for (let i = 0; i < 3; i += 1) {
    const crop = availableCrops[(seedOffset + i) % availableCrops.length] || ISO_CROP_CATALOG[0];
    const customer = customers[(seedOffset + i) % customers.length];
    const quantity = 2 + ((seedOffset + i) % 2);
    orders.push({
      id: `truck-${Date.now()}-${seedOffset}-${i}`,
      customerNameTh: customer.nameTh,
      customerTitleTh: customer.titleTh,
      cropId: crop.id,
      quantity,
      rewardGold: Math.round(crop.sellGold * quantity * 1.35),
      rewardXp: crop.xpGain * quantity + 14,
      rewardDiamonds: i === 2 ? 2 : 1,
    });
  }
  return orders;
}

export function createInitialIsometricFarmState(params: {
  schoolId: string;
  userId: string;
  ownerName: string;
  nowMs?: number;
}): FarmGameState {
  const now = params.nowMs ?? Date.now();
  const gridSize = DEFAULT_ISO_GRID_SIZE;
  const tiles: IsometricFarmTile[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const unlocked = row >= 1 && row <= 6 && col >= 1 && col <= 6;
      tiles.push({
        id: `tile-${row}-${col}`,
        row,
        col,
        unlocked,
        kind: unlocked ? 'grass' : 'grass',
      });
    }
  }

  const setTile = (row: number, col: number, patch: Partial<IsometricFarmTile>) => {
    const target = tiles.find((t) => t.row === row && t.col === col);
    if (target) Object.assign(target, patch);
  };

  // Hay Day-style starter farmstead (never starts empty)
  setTile(1, 2, {
    unlocked: true,
    kind: 'building',
    building: { type: 'farmhouse', level: 1, lastProducedAt: now - 30000, readyToCollect: false },
  });
  setTile(1, 3, {
    unlocked: true,
    kind: 'building',
    building: { type: 'silo', level: 1, lastProducedAt: now, readyToCollect: false },
  });
  setTile(1, 4, {
    unlocked: true,
    kind: 'building',
    building: { type: 'barn', level: 1, lastProducedAt: now, readyToCollect: false },
  });
  setTile(2, 5, {
    unlocked: true,
    kind: 'building',
    building: { type: 'chicken_coop', level: 1, lastProducedAt: now - 26000, readyToCollect: true },
  });
  setTile(5, 5, {
    unlocked: true,
    kind: 'pond',
  });
  setTile(5, 6, {
    unlocked: true,
    kind: 'pond',
  });

  // Starter crops at different growth stages so the farm feels alive on frame 1
  setTile(3, 2, {
    unlocked: true,
    kind: 'crop',
    crop: {
      cropId: 'wheat',
      stage: 'harvestable',
      stageIndex: 4,
      maxStages: 4,
      plantedAt: now - 15000,
      elapsedMs: 15000,
      wateredCount: 1,
      isGoldenBoosted: false,
    },
  });
  setTile(3, 3, {
    unlocked: true,
    kind: 'crop',
    crop: {
      cropId: 'corn',
      stage: 'harvestable',
      stageIndex: 4,
      maxStages: 4,
      plantedAt: now - 20000,
      elapsedMs: 20000,
      wateredCount: 1,
      isGoldenBoosted: false,
    },
  });
  setTile(3, 4, {
    unlocked: true,
    kind: 'crop',
    crop: {
      cropId: 'carrot',
      stage: 'flowering',
      stageIndex: 3,
      maxStages: 4,
      plantedAt: now - 17000,
      elapsedMs: 17000,
      wateredCount: 1,
      isGoldenBoosted: false,
    },
  });
  setTile(4, 2, { unlocked: true, kind: 'soil' });
  setTile(4, 3, { unlocked: true, kind: 'soil' });
  setTile(4, 4, { unlocked: true, kind: 'soil' });

  const firstName = params.ownerName.trim().split(' ')[0] || 'ฉัน';
  return {
    version: 1,
    gridSize,
    schoolId: params.schoolId,
    userId: params.userId,
    ownerName: params.ownerName,
    farmName: `ฟาร์มสุขใจของ${firstName}`,
    gold: 420,
    diamonds: 12,
    level: 1,
    xp: 25,
    xpToNextLevel: getXpRequiredForLevel(1),
    inventory: {
      seeds: {
        ...createSeedRecord(),
        wheat: 6,
        corn: 5,
        carrot: 4,
      },
      crops: {
        ...createSeedRecord(),
        wheat: 2,
        corn: 1,
      },
      goods: {
        fresh_egg: 1,
      },
      supplies: {
        waterCans: 12,
        goldenFertilizer: 3,
        expansionDeeds: 2,
      },
      siloCapacity: 50,
      barnCapacity: 50,
    },
    tiles,
    truckOrders: createTruckOrders(1, 0),
    totalHarvested: 0,
    totalOrdersDelivered: 0,
    soundMuted: false,
    musicMuted: false,
    lastTickAt: now,
  };
}

export function getSiloUsed(inventory: PlayerInventory): number {
  return Object.values(inventory.crops).reduce((sum, n) => sum + (n || 0), 0);
}

export function getBarnUsed(inventory: PlayerInventory): number {
  return Object.values(inventory.goods).reduce((sum, n) => sum + (n || 0), 0);
}

export function findIsoTile(
  state: FarmGameState,
  row: number,
  col: number
): IsometricFarmTile | undefined {
  return state.tiles.find((t) => t.row === row && t.col === col);
}

export function tickIsoFarmGrowth(state: FarmGameState, nowMs: number = Date.now()): FarmGameState {
  const dt = Math.max(0, Math.min(300000, nowMs - (state.lastTickAt || nowMs)));
  if (dt < 250) return state;

  let changed = false;
  const nextTiles = state.tiles.map((tile) => {
    if (tile.kind === 'crop' && tile.crop && tile.crop.stage !== 'harvestable') {
      const def = ISO_CROP_MAP[tile.crop.cropId];
      const multiplier = tile.crop.isGoldenBoosted ? 2 : 1;
      const nextElapsed = Math.min(
        def.growDurationMs,
        tile.crop.elapsedMs + dt * multiplier
      );
      const nextStage = computeGrowthStage(nextElapsed, def.growDurationMs);
      if (
        nextElapsed !== tile.crop.elapsedMs ||
        nextStage.stage !== tile.crop.stage
      ) {
        changed = true;
        return {
          ...tile,
          crop: {
            ...tile.crop,
            elapsedMs: nextElapsed,
            stage: nextStage.stage,
            stageIndex: nextStage.stageIndex,
          },
        };
      }
    }

    if (tile.kind === 'building' && tile.building && !tile.building.readyToCollect) {
      const bDef = ISO_BUILDING_MAP[tile.building.type];
      if (bDef && nowMs - tile.building.lastProducedAt >= bDef.produceCooldownMs) {
        changed = true;
        return {
          ...tile,
          building: {
            ...tile.building,
            readyToCollect: true,
          },
        };
      }
    }

    return tile;
  });

  if (!changed) {
    return { ...state, lastTickAt: nowMs };
  }

  return {
    ...state,
    tiles: nextTiles,
    lastTickAt: nowMs,
  };
}

export function tillIsoTile(
  state: FarmGameState,
  row: number,
  col: number
): { state: FarmGameState; ok: boolean; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  if (!tile) return { state, ok: false, messageTh: 'ไม่พบพื้นที่นี้' };
  if (!tile.unlocked) return { state, ok: false, messageTh: 'ต้องปลดล็อกที่ดินช่องนี้ก่อน' };
  if (tile.kind !== 'grass') return { state, ok: false, messageTh: 'ขุดแปลงได้เฉพาะพื้นหญ้าว่าง' };

  const prog = applyXpProgression(state.level, state.xp, 3);
  return {
    ok: true,
    messageTh: 'พรวนดินพร้อมปลูกแล้ว',
    state: {
      ...state,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      tiles: state.tiles.map((t) =>
        t.id === tile.id ? { ...t, kind: 'soil' } : t
      ),
    },
  };
}

export function plantIsoCrop(
  state: FarmGameState,
  row: number,
  col: number,
  cropId: IsoCropId,
  nowMs: number = Date.now()
): { state: FarmGameState; ok: boolean; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  const def = ISO_CROP_MAP[cropId];
  if (!tile) return { state, ok: false, messageTh: 'ไม่พบแปลงนี้' };
  if (!tile.unlocked) return { state, ok: false, messageTh: 'แปลงนี้ยังไม่ปลดล็อก' };
  if (tile.kind !== 'soil' && tile.kind !== 'grass') {
    return { state, ok: false, messageTh: 'แปลงนี้มีสิ่งปลูกสร้างหรือพืชอยู่แล้ว' };
  }
  if (def.unlockLevel > state.level) {
    return { state, ok: false, messageTh: `ต้องถึง Lv.${def.unlockLevel} เพื่อปลูก${def.nameTh}` };
  }
  const seedQty = state.inventory.seeds[cropId] || 0;
  if (seedQty <= 0) {
    return { state, ok: false, messageTh: `เมล็ด${def.nameTh}หมดแล้ว ซื้อเพิ่มในร้านค้าได้เลย` };
  }

  const prog = applyXpProgression(state.level, state.xp, 4);
  return {
    ok: true,
    messageTh: `ปลูก${def.nameTh}แล้ว`,
    state: {
      ...state,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      inventory: {
        ...state.inventory,
        seeds: {
          ...state.inventory.seeds,
          [cropId]: seedQty - 1,
        },
      },
      tiles: state.tiles.map((t) =>
        t.id === tile.id
          ? {
              ...t,
              kind: 'crop',
              crop: {
                cropId,
                stage: 'seed',
                stageIndex: 0,
                maxStages: 4,
                plantedAt: nowMs,
                elapsedMs: 0,
                wateredCount: 0,
                isGoldenBoosted: false,
              },
            }
          : t
      ),
    },
  };
}

export function waterIsoCrop(
  state: FarmGameState,
  row: number,
  col: number
): { state: FarmGameState; ok: boolean; matured?: boolean; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  if (!tile || tile.kind !== 'crop' || !tile.crop) {
    return { state, ok: false, messageTh: 'แตะที่พืชที่กำลังเติบโตเพื่อรดน้ำ' };
  }
  if (tile.crop.stage === 'harvestable') {
    return { state, ok: false, messageTh: 'พืชสุกเต็มที่แล้ว ใช้เคียวเก็บเกี่ยวได้เลย!' };
  }
  if (state.inventory.supplies.waterCans <= 0) {
    return { state, ok: false, messageTh: 'บัวรดน้ำหมดแล้ว รอพืชโตตามเวลาหรือซื้อเพิ่ม' };
  }

  const def = ISO_CROP_MAP[tile.crop.cropId];
  const boostMs = Math.round(def.growDurationMs * 0.45);
  const nextElapsed = Math.min(def.growDurationMs, tile.crop.elapsedMs + boostMs);
  const nextStage = computeGrowthStage(nextElapsed, def.growDurationMs);
  const prog = applyXpProgression(state.level, state.xp, 6);

  return {
    ok: true,
    matured: nextStage.stage === 'harvestable',
    messageTh: nextStage.stage === 'harvestable' ? `${def.nameTh}พร้อมเก็บเกี่ยว!` : 'รดน้ำเร่งโตแล้ว',
    state: {
      ...state,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      inventory: {
        ...state.inventory,
        supplies: {
          ...state.inventory.supplies,
          waterCans: state.inventory.supplies.waterCans - 1,
        },
      },
      tiles: state.tiles.map((t) =>
        t.id === tile.id && t.crop
          ? {
              ...t,
              crop: {
                ...t.crop,
                elapsedMs: nextElapsed,
                stage: nextStage.stage,
                stageIndex: nextStage.stageIndex,
                wateredCount: t.crop.wateredCount + 1,
              },
            }
          : t
      ),
    },
  };
}

export function fertilizeIsoCrop(
  state: FarmGameState,
  row: number,
  col: number
): { state: FarmGameState; ok: boolean; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  if (!tile || tile.kind !== 'crop' || !tile.crop) {
    return { state, ok: false, messageTh: 'แตะแปลงที่ปลูกพืชอยู่เพื่อใส่ปุ๋ยทองคำ' };
  }
  if (tile.crop.stage === 'harvestable') {
    return { state, ok: false, messageTh: 'พืชสุกพร้อมเก็บเกี่ยวแล้ว' };
  }
  if (state.inventory.supplies.goldenFertilizer <= 0) {
    return { state, ok: false, messageTh: 'ปุ๋ยทองคำหมดแล้ว' };
  }

  const def = ISO_CROP_MAP[tile.crop.cropId];
  const prog = applyXpProgression(state.level, state.xp, 12);

  return {
    ok: true,
    messageTh: `ใส่ปุ๋ยทองคำ! ${def.nameTh}สุกทันทีและได้ผลผลิต ×2`,
    state: {
      ...state,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      inventory: {
        ...state.inventory,
        supplies: {
          ...state.inventory.supplies,
          goldenFertilizer: state.inventory.supplies.goldenFertilizer - 1,
        },
      },
      tiles: state.tiles.map((t) =>
        t.id === tile.id && t.crop
          ? {
              ...t,
              crop: {
                ...t.crop,
                elapsedMs: def.growDurationMs,
                stage: 'harvestable',
                stageIndex: 4,
                isGoldenBoosted: true,
              },
            }
          : t
      ),
    },
  };
}

export function harvestIsoCrop(
  state: FarmGameState,
  row: number,
  col: number
): {
  state: FarmGameState;
  ok: boolean;
  cropId?: IsoCropId;
  qty?: number;
  xpGain?: number;
  leveledUp?: boolean;
  messageTh: string;
} {
  const tile = findIsoTile(state, row, col);
  if (!tile || tile.kind !== 'crop' || !tile.crop) {
    return { state, ok: false, messageTh: 'ไม่มีพืชให้เก็บเกี่ยวในช่องนี้' };
  }
  if (tile.crop.stage !== 'harvestable') {
    return { state, ok: false, messageTh: 'พืชยังไม่สุกเต็มที่ รดน้ำเพื่อเร่งการเติบโตได้' };
  }

  const def = ISO_CROP_MAP[tile.crop.cropId];
  const qty = tile.crop.isGoldenBoosted ? def.harvestYield * 2 : def.harvestYield;
  const used = getSiloUsed(state.inventory);
  if (used + qty > state.inventory.siloCapacity) {
    return {
      state,
      ok: false,
      messageTh: `ไซโลเต็ม (${used}/${state.inventory.siloCapacity}) กรุณาขายพืชผลหรือส่งออเดอร์รถบรรทุกก่อน`,
    };
  }

  const prog = applyXpProgression(state.level, state.xp, def.xpGain);
  return {
    ok: true,
    cropId: def.id,
    qty,
    xpGain: def.xpGain,
    leveledUp: prog.leveledUp,
    messageTh: `เก็บเกี่ยว${def.nameTh} +${qty} (+${def.xpGain} XP)`,
    state: {
      ...state,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      totalHarvested: state.totalHarvested + qty,
      inventory: {
        ...state.inventory,
        crops: {
          ...state.inventory.crops,
          [def.id]: (state.inventory.crops[def.id] || 0) + qty,
        },
      },
      tiles: state.tiles.map((t) =>
        t.id === tile.id ? { ...t, kind: 'soil', crop: undefined } : t
      ),
    },
  };
}

export function buySeedIntoInventory(
  state: FarmGameState,
  cropId: IsoCropId,
  quantity: number
): { state: FarmGameState; ok: boolean; messageTh: string } {
  const def = ISO_CROP_MAP[cropId];
  const qty = Math.max(1, Math.floor(quantity));
  if (def.unlockLevel > state.level) {
    return { state, ok: false, messageTh: `ปลดล็อก${def.nameTh}ที่ Lv.${def.unlockLevel}` };
  }
  const totalCost = def.seedCostGold * qty;
  if (state.gold < totalCost) {
    return { state, ok: false, messageTh: `เหรียญทองไม่พอ (ต้องการ ${totalCost} เหรียญ)` };
  }

  return {
    ok: true,
    messageTh: `ซื้อเมล็ด${def.nameTh} ×${qty}`,
    state: {
      ...state,
      gold: state.gold - totalCost,
      inventory: {
        ...state.inventory,
        seeds: {
          ...state.inventory.seeds,
          [cropId]: (state.inventory.seeds[cropId] || 0) + qty,
        },
      },
    },
  };
}

export function sellCropFromInventory(
  state: FarmGameState,
  cropId: IsoCropId,
  quantity: number
): { state: FarmGameState; ok: boolean; goldEarned?: number; messageTh: string } {
  const def = ISO_CROP_MAP[cropId];
  const qty = Math.max(1, Math.floor(quantity));
  const owned = state.inventory.crops[cropId] || 0;
  if (owned < qty) {
    return { state, ok: false, messageTh: `${def.nameTh}ในไซโลไม่พอขาย` };
  }
  const goldEarned = def.sellGold * qty;
  const prog = applyXpProgression(state.level, state.xp, qty * 4);

  return {
    ok: true,
    goldEarned,
    messageTh: `ขาย${def.nameTh} ×${qty} รับ +${goldEarned} เหรียญ`,
    state: {
      ...state,
      gold: state.gold + goldEarned,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      inventory: {
        ...state.inventory,
        crops: {
          ...state.inventory.crops,
          [cropId]: owned - qty,
        },
      },
    },
  };
}

export function fulfillTruckOrder(
  state: FarmGameState,
  orderId: string
): { state: FarmGameState; ok: boolean; leveledUp?: boolean; messageTh: string } {
  const order = state.truckOrders.find((o) => o.id === orderId);
  if (!order) return { state, ok: false, messageTh: 'ไม่พบใบสั่งซื้อนี้' };
  const owned = state.inventory.crops[order.cropId] || 0;
  if (owned < order.quantity) {
    const def = ISO_CROP_MAP[order.cropId];
    return {
      state,
      ok: false,
      messageTh: `ต้องการ${def.nameTh} ${order.quantity} ชิ้น (มี ${owned} ชิ้น)`,
    };
  }

  const prog = applyXpProgression(state.level, state.xp, order.rewardXp);
  const replacement = createTruckOrders(
    prog.level,
    state.totalOrdersDelivered + state.truckOrders.length + 1
  )[0];

  return {
    ok: true,
    leveledUp: prog.leveledUp,
    messageTh: `ส่งรถบรรทุกสำเร็จ! +${order.rewardGold} เหรียญ · +${order.rewardXp} XP`,
    state: {
      ...state,
      gold: state.gold + order.rewardGold,
      diamonds: state.diamonds + order.rewardDiamonds,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      totalOrdersDelivered: state.totalOrdersDelivered + 1,
      inventory: {
        ...state.inventory,
        crops: {
          ...state.inventory.crops,
          [order.cropId]: owned - order.quantity,
        },
      },
      truckOrders: state.truckOrders.map((o) => (o.id === orderId ? replacement : o)),
    },
  };
}

export function unlockIsoPlot(
  state: FarmGameState,
  row: number,
  col: number
): { state: FarmGameState; ok: boolean; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  if (!tile) return { state, ok: false, messageTh: 'ไม่พบพื้นที่นี้' };
  if (tile.unlocked) return { state, ok: false, messageTh: 'พื้นที่นี้ปลดล็อกแล้ว' };

  const deedCost = 1;
  const goldCost = 65;
  if (state.inventory.supplies.expansionDeeds >= deedCost) {
    const prog = applyXpProgression(state.level, state.xp, 18);
    return {
      ok: true,
      messageTh: 'ขยายพื้นที่ฟาร์มสำเร็จ! (ใช้โฉนดที่ดิน 1 ใบ)',
      state: {
        ...state,
        level: prog.level,
        xp: prog.xp,
        xpToNextLevel: prog.xpToNextLevel,
        inventory: {
          ...state.inventory,
          supplies: {
            ...state.inventory.supplies,
            expansionDeeds: state.inventory.supplies.expansionDeeds - deedCost,
          },
        },
        tiles: state.tiles.map((t) =>
          t.id === tile.id ? { ...t, unlocked: true, kind: 'soil' } : t
        ),
      },
    };
  }

  if (state.gold < goldCost) {
    return {
      state,
      ok: false,
      messageTh: `ต้องใช้ ${goldCost} เหรียญทอง หรือโฉนดขยายที่ดิน 1 ใบ`,
    };
  }

  const prog = applyXpProgression(state.level, state.xp, 18);
  return {
    ok: true,
    messageTh: `ขยายพื้นที่ฟาร์มสำเร็จ! (-${goldCost} เหรียญ)`,
    state: {
      ...state,
      gold: state.gold - goldCost,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      tiles: state.tiles.map((t) =>
        t.id === tile.id ? { ...t, unlocked: true, kind: 'soil' } : t
      ),
    },
  };
}

export function buildIsoStructure(
  state: FarmGameState,
  row: number,
  col: number,
  buildingType: FarmBuildingType,
  nowMs: number = Date.now()
): { state: FarmGameState; ok: boolean; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  const bDef = ISO_BUILDING_MAP[buildingType];
  if (!tile) return { state, ok: false, messageTh: 'ไม่พบช่องนี้' };
  if (!tile.unlocked) return { state, ok: false, messageTh: 'ปลดล็อกช่องนี้ก่อนก่อสร้าง' };
  if (tile.kind !== 'grass' && tile.kind !== 'soil') {
    return { state, ok: false, messageTh: 'ช่องนี้ไม่ว่างสำหรับก่อสร้าง' };
  }
  if (bDef.unlockLevel > state.level) {
    return { state, ok: false, messageTh: `ต้องถึง Lv.${bDef.unlockLevel} เพื่อสร้าง${bDef.nameTh}` };
  }
  if (state.gold < bDef.costGold) {
    return { state, ok: false, messageTh: `เหรียญทองไม่พอ (ต้องการ ${bDef.costGold} เหรียญ)` };
  }

  const prog = applyXpProgression(state.level, state.xp, bDef.xpGain);
  const siloBonus = buildingType === 'silo' ? 20 : 0;
  const barnBonus = buildingType === 'barn' ? 20 : 0;

  return {
    ok: true,
    messageTh: `สร้าง${bDef.nameTh}สำเร็จ! (+${bDef.xpGain} XP)`,
    state: {
      ...state,
      gold: state.gold - bDef.costGold,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      inventory: {
        ...state.inventory,
        siloCapacity: state.inventory.siloCapacity + siloBonus,
        barnCapacity: state.inventory.barnCapacity + barnBonus,
      },
      tiles: state.tiles.map((t) =>
        t.id === tile.id
          ? {
              ...t,
              kind: 'building',
              building: {
                type: buildingType,
                level: 1,
                lastProducedAt: nowMs,
                readyToCollect: false,
              },
            }
          : t
      ),
    },
  };
}

export function collectIsoBuildingProduct(
  state: FarmGameState,
  row: number,
  col: number,
  nowMs: number = Date.now()
): { state: FarmGameState; ok: boolean; goldEarned?: number; messageTh: string } {
  const tile = findIsoTile(state, row, col);
  if (!tile || tile.kind !== 'building' || !tile.building) {
    return { state, ok: false, messageTh: 'ไม่พบสิ่งปลูกสร้าง' };
  }
  const bDef = ISO_BUILDING_MAP[tile.building.type];
  if (!tile.building.readyToCollect) {
    return { state, ok: false, messageTh: `${bDef.nameTh}กำลังผลิตผลผลิตอยู่` };
  }

  const prog = applyXpProgression(state.level, state.xp, 15);
  const nextGoods = { ...state.inventory.goods };
  if (bDef.produceItemId) {
    nextGoods[bDef.produceItemId] = (nextGoods[bDef.produceItemId] || 0) + 1;
  }

  return {
    ok: true,
    goldEarned: bDef.produceGold,
    messageTh: `เก็บจาก${bDef.nameTh} +${bDef.produceGold} เหรียญ${
      bDef.produceItemNameTh ? ` · +1 ${bDef.produceItemNameTh}` : ''
    }`,
    state: {
      ...state,
      gold: state.gold + bDef.produceGold,
      level: prog.level,
      xp: prog.xp,
      xpToNextLevel: prog.xpToNextLevel,
      inventory: {
        ...state.inventory,
        goods: nextGoods,
      },
      tiles: state.tiles.map((t) =>
        t.id === tile.id && t.building
          ? {
              ...t,
              building: {
                ...t.building,
                lastProducedAt: nowMs,
                readyToCollect: false,
              },
            }
          : t
      ),
    },
  };
}

function getStorageKey(schoolId: string, userId: string): string {
  return `baanpakkru_iso_farm_v1_${schoolId}_${userId}`;
}

export function useFarmGameState(params: {
  schoolId: string;
  userId: string;
  ownerName: string;
}) {
  const { schoolId, userId, ownerName } = params;
  const storageKey = getStorageKey(schoolId, userId);

  const [state, setState] = useState<FarmGameState>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as FarmGameState;
          if (parsed && Array.isArray(parsed.tiles) && parsed.tiles.length > 0) {
            return tickIsoFarmGrowth(parsed, Date.now());
          }
        }
      }
    } catch {
      // Fallback to fresh starter farmstead
    }
    return createInitialIsometricFarmState({ schoolId, userId, ownerName });
  });

  const [events, setEvents] = useState<FarmGameEvent[]>([]);

  const pushEvent = useCallback(
    (row: number, col: number, text: string, tone: FarmGameEvent['tone']) => {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setEvents((prev) => [...prev.slice(-10), { id, row, col, text, tone, createdAt: Date.now() }]);
    },
    []
  );

  // Persist to localStorage whenever state updates
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      }
    } catch {
      // Ignore quota issues cleanly
    }
  }, [storageKey, state]);

  // Real-time Hay Day crop & building growth loop (1s tick)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setState((prev) => tickIsoFarmGrowth(prev, now));
      setEvents((prev) => prev.filter((e) => now - e.createdAt < 1800));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const tillTile = useCallback(
    (row: number, col: number) => {
      let ok = false;
      setState((prev) => {
        const res = tillIsoTile(prev, row, col);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'xp' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const plantCrop = useCallback(
    (row: number, col: number, cropId: IsoCropId) => {
      let ok = false;
      setState((prev) => {
        const res = plantIsoCrop(prev, row, col, cropId);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'xp' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const waterCrop = useCallback(
    (row: number, col: number) => {
      let ok = false;
      setState((prev) => {
        const res = waterIsoCrop(prev, row, col);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'water' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const fertilizeCrop = useCallback(
    (row: number, col: number) => {
      let ok = false;
      setState((prev) => {
        const res = fertilizeIsoCrop(prev, row, col);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'gold' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const harvestCrop = useCallback(
    (row: number, col: number) => {
      let ok = false;
      setState((prev) => {
        const res = harvestIsoCrop(prev, row, col);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'harvest' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const buySeeds = useCallback(
    (cropId: IsoCropId, qty: number) => {
      let ok = false;
      setState((prev) => {
        const res = buySeedIntoInventory(prev, cropId, qty);
        ok = res.ok;
        pushEvent(3, 3, res.messageTh, res.ok ? 'gold' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const sellCrop = useCallback(
    (cropId: IsoCropId, qty: number) => {
      let ok = false;
      setState((prev) => {
        const res = sellCropFromInventory(prev, cropId, qty);
        ok = res.ok;
        pushEvent(3, 3, res.messageTh, res.ok ? 'gold' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const deliverTruckOrder = useCallback(
    (orderId: string) => {
      let ok = false;
      setState((prev) => {
        const res = fulfillTruckOrder(prev, orderId);
        ok = res.ok;
        pushEvent(2, 2, res.messageTh, res.ok ? 'gold' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const unlockPlot = useCallback(
    (row: number, col: number) => {
      let ok = false;
      setState((prev) => {
        const res = unlockIsoPlot(prev, row, col);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'xp' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const buildStructure = useCallback(
    (row: number, col: number, buildingType: FarmBuildingType) => {
      let ok = false;
      setState((prev) => {
        const res = buildIsoStructure(prev, row, col, buildingType);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'gold' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const collectBuilding = useCallback(
    (row: number, col: number) => {
      let ok = false;
      setState((prev) => {
        const res = collectIsoBuildingProduct(prev, row, col);
        ok = res.ok;
        pushEvent(row, col, res.messageTh, res.ok ? 'gold' : 'warn');
        return res.state;
      });
      return ok;
    },
    [pushEvent]
  );

  const toggleSoundMuted = useCallback(() => {
    setState((prev) => ({ ...prev, soundMuted: !prev.soundMuted }));
  }, []);

  const toggleMusicMuted = useCallback(() => {
    setState((prev) => ({ ...prev, musicMuted: !prev.musicMuted }));
  }, []);

  const resetStarterFarm = useCallback(() => {
    setState(createInitialIsometricFarmState({ schoolId, userId, ownerName }));
  }, [schoolId, userId, ownerName]);

  const derived = useMemo(() => {
    const siloUsed = getSiloUsed(state.inventory);
    const barnUsed = getBarnUsed(state.inventory);
    const xpProgressPct = Math.min(
      100,
      Math.round((state.xp / Math.max(1, state.xpToNextLevel)) * 100)
    );
    const readyHarvestCount = state.tiles.filter(
      (t) => t.kind === 'crop' && t.crop?.stage === 'harvestable'
    ).length;
    const readyBuildingCount = state.tiles.filter(
      (t) => t.kind === 'building' && t.building?.readyToCollect
    ).length;

    return {
      siloUsed,
      barnUsed,
      xpProgressPct,
      readyHarvestCount,
      readyBuildingCount,
    };
  }, [state]);

  return {
    state,
    events,
    derived,
    tillTile,
    plantCrop,
    waterCrop,
    fertilizeCrop,
    harvestCrop,
    buySeeds,
    sellCrop,
    deliverTruckOrder,
    unlockPlot,
    buildStructure,
    collectBuilding,
    toggleSoundMuted,
    toggleMusicMuted,
    resetStarterFarm,
  };
}
