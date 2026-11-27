import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Hammer,
  Maximize2,
  Minimize2,
  Music,
  Package,
  RotateCw,
  ShoppingBag,
  Sprout,
  Truck,
  Volume2,
  VolumeX,
  Wheat,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AppLanguage, AuthUser, School } from '../../types';
import { farmAudio } from '../../lib/farmAudioEngine';
import {
  enterLandscapeGameMode,
  exitLandscapeGameMode,
} from '../../lib/screenOrientation';
import {
  gridToIso,
  ISO_BUILDING_CATALOG,
  ISO_BUILDING_MAP,
  ISO_CROP_CATALOG,
  ISO_CROP_MAP,
  isoToGrid,
  useFarmGameState,
  type FarmActionTool,
  type FarmBuildingType,
  type FarmGameEvent,
  type IsoCropId,
  type IsometricFarmTile,
} from '../../features/game/useFarmGameState';
import {
  HayDayCoinIcon,
  HayDayGemIcon,
  HayDayLevelStarBadge,
  HayDayToolSprite,
} from '../games/HayDayHudIcons';

export interface GameViewProps {
  lang: AppLanguage;
  currentUser: AuthUser | null;
  activeSchool: School;
  onExit: () => void;
}

type ActivePanel = 'orders' | 'shop' | 'inventory' | null;

const BASE_TILE_W = 112;
const BASE_TILE_H = 56;

const STAGE_LABEL_TH: Record<string, string> = {
  seed: 'หว่านเมล็ด',
  sprout: 'งอกต้นกล้า',
  growing: 'กำลังโต',
  flowering: 'ออกดอก',
  harvestable: 'พร้อมเก็บเกี่ยว',
};

function drawIsoDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

function drawIsoTileExtrusion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  depth: number,
  topFill: string,
  leftSideFill: string,
  rightSideFill: string,
  strokeColor?: string
) {
  // Left beveled rim
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx, cy + h / 2 + depth);
  ctx.lineTo(cx - w / 2, cy + depth);
  ctx.closePath();
  ctx.fillStyle = leftSideFill;
  ctx.fill();

  // Right beveled rim
  ctx.beginPath();
  ctx.moveTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx, cy + h / 2 + depth);
  ctx.lineTo(cx + w / 2, cy + depth);
  ctx.closePath();
  ctx.fillStyle = rightSideFill;
  ctx.fill();

  // Top face
  drawIsoDiamond(ctx, cx, cy, w, h);
  ctx.fillStyle = topFill;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

function drawCropSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tile: IsometricFarmTile,
  timeSec: number,
  reducedMotion: boolean
) {
  const crop = tile.crop;
  if (!crop) return;
  const def = ISO_CROP_MAP[crop.cropId];
  const sway = reducedMotion ? 0 : Math.sin(timeSec * 2.4 + tile.row * 0.8 + tile.col * 0.5) * 2.2;

  // Golden shimmer aura if boosted or harvestable
  if (crop.isGoldenBoosted || crop.stage === 'harvestable') {
    ctx.save();
    const pulse = reducedMotion ? 0.25 : 0.18 + Math.sin(timeSec * 4 + tile.col) * 0.08;
    ctx.fillStyle = crop.isGoldenBoosted
      ? `rgba(250, 204, 21, ${pulse + 0.12})`
      : `rgba(254, 240, 138, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (crop.stage === 'seed') {
    ctx.fillStyle = '#fde68a';
    const offsets = [
      [-10, -2],
      [0, -5],
      [10, 0],
      [-5, 5],
      [6, 4],
    ];
    for (const [ox, oy] of offsets) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (crop.stage === 'sprout') {
    const stems = [-10, 2, 12];
    for (const sx of stems) {
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + sx, cy + 2);
      ctx.quadraticCurveTo(cx + sx + sway * 0.4, cy - 8, cx + sx + sway * 0.6, cy - 12);
      ctx.stroke();

      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(cx + sx - 3 + sway * 0.5, cy - 11, 4, 2.2, -0.5, 0, Math.PI * 2);
      ctx.ellipse(cx + sx + 3 + sway * 0.5, cy - 11, 4, 2.2, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (crop.stage === 'growing') {
    const stalks = [
      [-12, 0],
      [0, -4],
      [12, 1],
      [-4, 6],
      [8, 6],
    ];
    for (const [ox, oy] of stalks) {
      ctx.strokeStyle = def.foliageColor;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy + 2);
      ctx.quadraticCurveTo(
        cx + ox + sway * 0.5,
        cy + oy - 11,
        cx + ox + sway,
        cy + oy - 19
      );
      ctx.stroke();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(cx + ox + sway * 0.7 - 4, cy + oy - 12, 5, 2.6, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + ox + sway * 0.7 + 4, cy + oy - 14, 5, 2.6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (crop.stage === 'flowering') {
    const tufts = [
      [-11, -1],
      [2, -5],
      [13, 1],
      [-5, 5],
      [7, 5],
    ];
    for (const [ox, oy] of tufts) {
      ctx.strokeStyle = def.foliageColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy + 2);
      ctx.lineTo(cx + ox + sway, cy + oy - 21);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx + ox + sway, cy + oy - 22, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accentColor;
      ctx.beginPath();
      ctx.arc(cx + ox + sway, cy + oy - 22, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Stage 4: harvestable! Draw rich crop clusters by crop type
  const clusters = [
    [-12, -1],
    [0, -6],
    [12, 0],
    [-6, 5],
    [7, 5],
  ];

  for (const [ox, oy] of clusters) {
    const px = cx + ox + sway;
    const py = cy + oy;
    if (crop.cropId === 'wheat') {
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy + 3);
      ctx.lineTo(px, py - 24);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(px, py - 22, 4.2, 8.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (crop.cropId === 'corn') {
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy + 3);
      ctx.lineTo(px, py - 24);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(px + 2, py - 17, 4.2, 7.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(px - 2, py - 14, 3, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (crop.cropId === 'carrot') {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(cx + ox - 4, cy + oy - 3);
      ctx.lineTo(cx + ox + 4, cy + oy - 3);
      ctx.lineTo(cx + ox, cy + oy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy - 3);
      ctx.lineTo(px - 4, py - 15);
      ctx.moveTo(cx + ox, cy + oy - 3);
      ctx.lineTo(px + 4, py - 15);
      ctx.stroke();
    } else if (crop.cropId === 'sunflower') {
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy + 3);
      ctx.lineTo(px, py - 25);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(px, py - 26, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(px, py - 26, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (crop.cropId === 'pumpkin' || crop.cropId === 'golden_melon') {
      ctx.fillStyle = def.accentColor;
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy - 4, 7.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy - 9);
      ctx.lineTo(cx + ox + 2, cy + oy - 13);
      ctx.stroke();
    } else {
      // Tomato / Strawberry bush
      ctx.fillStyle = def.foliageColor;
      ctx.beginPath();
      ctx.arc(px, py - 10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accentColor;
      ctx.beginPath();
      ctx.arc(px - 3, py - 11, 3.2, 0, Math.PI * 2);
      ctx.arc(px + 3, py - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawIsoBuilding(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tile: IsometricFarmTile,
  timeSec: number,
  reducedMotion: boolean
) {
  const b = tile.building;
  if (!b) return;
  const bob = reducedMotion ? 0 : Math.sin(timeSec * 3.5 + tile.col) * 3;

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 34, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  if (b.type === 'farmhouse') {
    // Blue-white Hay Day farmhouse cottage
    // Body
    ctx.fillStyle = '#dbeafe';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.4;
    ctx.fillRect(cx - 26, cy - 36, 52, 34);
    ctx.strokeRect(cx - 26, cy - 36, 52, 34);
    // Porch deck
    ctx.fillStyle = '#b45309';
    ctx.fillRect(cx - 28, cy - 5, 56, 7);
    // Pitched slate-blue roof
    ctx.beginPath();
    ctx.moveTo(cx - 33, cy - 34);
    ctx.lineTo(cx, cy - 60);
    ctx.lineTo(cx + 33, cy - 34);
    ctx.closePath();
    ctx.fillStyle = '#1e3a8a';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    // Door & windows
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 7, cy - 23, 14, 18);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 21, cy - 26, 9, 9);
    ctx.fillRect(cx + 12, cy - 26, 9, 9);
  } else if (b.type === 'silo') {
    // Tall cylindrical red/silver Hay Day grain silo
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4;
    ctx.fillRect(cx - 17, cy - 48, 34, 46);
    ctx.strokeRect(cx - 17, cy - 48, 34, 46);
    // White stripes
    ctx.fillStyle = '#fee2e2';
    ctx.fillRect(cx - 17, cy - 34, 34, 4);
    ctx.fillRect(cx - 17, cy - 20, 34, 4);
    // Silver dome cap
    ctx.beginPath();
    ctx.arc(cx, cy - 48, 17, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();
  } else if (b.type === 'barn' || b.type === 'dairy_barn') {
    const isDairy = b.type === 'dairy_barn';
    ctx.fillStyle = isDairy ? '#b91c1c' : '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4;
    ctx.fillRect(cx - 27, cy - 32, 54, 31);
    ctx.strokeRect(cx - 27, cy - 32, 54, 31);
    // Gambrel Hay Day barn roof
    ctx.beginPath();
    ctx.moveTo(cx - 32, cy - 30);
    ctx.lineTo(cx - 18, cy - 50);
    ctx.lineTo(cx, cy - 58);
    ctx.lineTo(cx + 18, cy - 50);
    ctx.lineTo(cx + 32, cy - 30);
    ctx.closePath();
    ctx.fillStyle = '#991b1b';
    ctx.fill();
    ctx.stroke();
    // White cross X barn doors
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(cx - 11, cy - 24, 22, 23);
    ctx.strokeStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 24);
    ctx.lineTo(cx + 11, cy - 1);
    ctx.moveTo(cx + 11, cy - 24);
    ctx.lineTo(cx - 11, cy - 1);
    ctx.stroke();
    if (isDairy) {
      // Tiny spotted cow beside barn
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx + 22, cy + 2, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx + 21, cy + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.type === 'chicken_coop') {
    // Cozy wooden coop + pecking hens
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.3;
    ctx.fillRect(cx - 20, cy - 24, 40, 22);
    ctx.strokeRect(cx - 20, cy - 24, 40, 22);
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 23);
    ctx.lineTo(cx, cy - 40);
    ctx.lineTo(cx + 24, cy - 23);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.stroke();
    // Animated hens
    const peck = reducedMotion ? 0 : Math.abs(Math.sin(timeSec * 5)) * 2.5;
    for (const hx of [-12, 11]) {
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(cx + hx, cy + 1 + peck * 0.4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx + hx, cy - 3.5 + peck * 0.4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.type === 'bakery') {
    // Stone dome bakery oven + windmill blades
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 22, Math.PI, 0);
    ctx.lineTo(cx + 22, cy - 1);
    ctx.lineTo(cx - 22, cy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 8, Math.PI, 0);
    ctx.fill();
    // Spinning windmill vane
    ctx.save();
    ctx.translate(cx, cy - 36);
    ctx.rotate(reducedMotion ? 0.3 : timeSec * 1.1);
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 16);
    ctx.stroke();
    ctx.restore();
  } else {
    // Roadside shop stand with iconic red-white striped awning
    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx - 22, cy - 20, 44, 18);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#ffffff';
      ctx.fillRect(cx - 24 + i * 8, cy - 31, 8, 12);
    }
  }

  // Ready-to-collect floating bubble
  if (b.readyToCollect) {
    ctx.save();
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 72 + bob, 48, 20, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('เก็บเลย!', cx, cy - 62 + bob);
    ctx.restore();
  }
}

function drawSceneryTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hasFruit: boolean,
  timeSec: number,
  reducedMotion: boolean
) {
  const sway = reducedMotion ? 0 : Math.sin(timeSec * 1.6 + x * 0.02) * 2;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78350f';
  ctx.fillRect(x - 4, y - 16, 8, 22);

  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(x + sway, y - 28, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(x - 6 + sway, y - 32, 12, 0, Math.PI * 2);
  ctx.arc(x + 7 + sway, y - 27, 11, 0, Math.PI * 2);
  ctx.fill();

  if (hasFruit) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x - 7 + sway, y - 30, 3, 0, Math.PI * 2);
    ctx.arc(x + 6 + sway, y - 25, 3, 0, Math.PI * 2);
    ctx.arc(x + 1 + sway, y - 37, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const GameView: React.FC<GameViewProps> = ({
  lang,
  currentUser,
  activeSchool,
  onExit,
}) => {
  const schoolId = activeSchool.id || 'default-school';
  const userId = currentUser?.id || 'student-farmer';
  const ownerName =
    currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน';

  const {
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
  } = useFarmGameState({ schoolId, userId, ownerName });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<FarmActionTool>('sickle');
  const [selectedCropId, setSelectedCropId] = useState<IsoCropId>('wheat');
  const [selectedBuilding, setSelectedBuilding] = useState<FarmBuildingType>('chicken_coop');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [shopTab, setShopTab] = useState<'seeds' | 'buildings'>('seeds');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissPortraitNotice, setDismissPortraitNotice] = useState(false);

  // Camera & interactive pointer state stored in refs for 60fps canvas loop
  const cameraRef = useRef({ zoom: 1.0, panX: 0, panY: -20 });
  const [zoomUi, setZoomUi] = useState(1.0);
  const hoverTileRef = useRef<{ row: number; col: number } | null>(null);
  const [inspectedTile, setInspectedTile] = useState<{ row: number; col: number } | null>(null);
  const farmerPosRef = useRef({ row: 3.5, col: 2.2, targetRow: 3.5, targetCol: 2.2 });
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    swiping: false,
    lastSwipedKey: '',
  });

  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const latestEventsRef = useRef<FarmGameEvent[]>(events);
  latestEventsRef.current = events;

  // Check viewport orientation (landscape optimization hint)
  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync audio mute state
  useEffect(() => {
    farmAudio.setMutedState(state.soundMuted, state.musicMuted);
  }, [state.soundMuted, state.musicMuted]);

  useEffect(() => {
    return () => {
      farmAudio.stopMusic();
      void exitLandscapeGameMode();
    };
  }, []);

  const playSfx = useCallback(
    (type: Parameters<typeof farmAudio.playSfx>[0]) => {
      if (!state.musicMuted) {
        farmAudio.unlockAndStartMusic(state.soundMuted, state.musicMuted);
      }
      if (!state.soundMuted) {
        farmAudio.playSfx(type);
      }
    },
    [state.musicMuted, state.soundMuted]
  );

  const handleToggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      await enterLandscapeGameMode(containerRef.current);
      setIsFullscreen(true);
    } else {
      await exitLandscapeGameMode();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const applyToolToTile = useCallback(
    (row: number, col: number, toolOverride?: FarmActionTool) => {
      if (row < 0 || col < 0 || row >= state.gridSize || col >= state.gridSize) return;
      const tile = state.tiles.find((t) => t.row === row && t.col === col);
      if (!tile) return;

      farmerPosRef.current.targetRow = row;
      farmerPosRef.current.targetCol = col;

      const tool = toolOverride ?? activeTool;

      if (tool === 'pan') {
        setInspectedTile({ row, col });
        if (tile.kind === 'crop' && tile.crop?.stage === 'harvestable') {
          if (harvestCrop(row, col)) playSfx('harvest');
          return;
        }
        if (tile.kind === 'building' && tile.building) {
          if (tile.building.readyToCollect && collectBuilding(row, col)) {
            playSfx(tile.building.type === 'chicken_coop' ? 'chicken' : tile.building.type === 'dairy_barn' ? 'cow' : 'coin');
          } else {
            playSfx('tap');
          }
        }
        return;
      }

      if (tool === 'expand') {
        if (unlockPlot(row, col)) playSfx('build');
        else playSfx('tap');
        return;
      }

      if (tool === 'till') {
        if (tillTile(row, col)) playSfx('till');
        return;
      }

      if (tool === 'plant') {
        if (plantCrop(row, col, selectedCropId)) playSfx('plant');
        return;
      }

      if (tool === 'water') {
        if (waterCrop(row, col)) playSfx('water');
        return;
      }

      if (tool === 'fertilize') {
        if (fertilizeCrop(row, col)) playSfx('golden');
        return;
      }

      if (tool === 'sickle') {
        if (tile.kind === 'building' && tile.building?.readyToCollect) {
          if (collectBuilding(row, col)) playSfx('coin');
          return;
        }
        if (harvestCrop(row, col)) playSfx('harvest');
        return;
      }

      if (tool === 'build') {
        if (buildStructure(row, col, selectedBuilding)) playSfx('build');
      }
    },
    [
      activeTool,
      buildStructure,
      collectBuilding,
      fertilizeCrop,
      harvestCrop,
      plantCrop,
      playSfx,
      selectedBuilding,
      selectedCropId,
      state.gridSize,
      state.tiles,
      tillTile,
      unlockPlot,
      waterCrop,
    ]
  );

  // Compute current canvas world origin so screen <-> iso math matches pointer events
  const getWorldMetrics = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const tileW = BASE_TILE_W * cam.zoom;
    const tileH = BASE_TILE_H * cam.zoom;
    const originX = rect.width / 2 + cam.panX;
    const originY = rect.height * 0.23 + cam.panY;
    return { width: rect.width, height: rect.height, tileW, tileH, originX, originY };
  }, []);

  // Main 60fps HTML5 2D Isometric Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    };

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    resize();

    const renderFrame = (nowMs: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const timeSec = nowMs / 1000;
      const st = latestStateRef.current;
      const cam = cameraRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Sunlit country sky & rolling Hay Day meadow backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#bae6fd');
      skyGrad.addColorStop(0.22, '#a7f3d0');
      skyGrad.addColorStop(0.55, '#84cc16');
      skyGrad.addColorStop(1, '#4d7c0f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      const tileW = BASE_TILE_W * cam.zoom;
      const tileH = BASE_TILE_H * cam.zoom;
      const originX = width / 2 + cam.panX;
      const originY = height * 0.23 + cam.panY;

      // Soft hill highlights
      ctx.fillStyle = 'rgba(190, 242, 100, 0.28)';
      ctx.beginPath();
      ctx.ellipse(originX - 240 * cam.zoom, originY + 120 * cam.zoom, 360 * cam.zoom, 150 * cam.zoom, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Diagonal country dirt road in front of farmstead (like Hay Day screenshot)
      const roadStart = gridToIso(st.gridSize + 0.35, -1.6, tileW, tileH, originX, originY);
      const roadEnd = gridToIso(st.gridSize + 0.35, st.gridSize + 1.8, tileW, tileH, originX, originY);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 42 * cam.zoom;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(roadStart.x, roadStart.y);
      ctx.lineTo(roadEnd.x, roadEnd.y);
      ctx.stroke();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 30 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(roadStart.x, roadStart.y);
      ctx.lineTo(roadEnd.x, roadEnd.y);
      ctx.stroke();

      // Red Hay Day delivery truck parked on the country road
      const truckPos = gridToIso(st.gridSize + 0.25, 2.3, tileW, tileH, originX, originY);
      ctx.save();
      ctx.translate(truckPos.x, truckPos.y);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.fillStyle = 'rgba(15,23,42,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 10, 32, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Truck bed (green wood) + cab (red)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-26, -12, 28, 16);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(2, -16, 20, 20);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(6, -13, 12, 8);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-14, 6, 6, 0, Math.PI * 2);
      ctx.arc(12, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Orchard trees flanking the perimeter
      const treeCoords: Array<[number, number, boolean]> = [
        [-0.7, 0.5, true],
        [-0.7, 3.4, false],
        [-0.7, 6.2, true],
        [2.2, -0.8, true],
        [5.2, -0.8, false],
        [2.2, st.gridSize + 0.7, true],
        [5.6, st.gridSize + 0.7, true],
      ];
      for (const [tr, tc, fruit] of treeCoords) {
        const tp = gridToIso(tr, tc, tileW, tileH, originX, originY);
        ctx.save();
        ctx.translate(tp.x, tp.y);
        ctx.scale(cam.zoom, cam.zoom);
        drawSceneryTree(ctx, 0, 0, fruit, timeSec, reducedMotion);
        ctx.restore();
      }

      // 2. Render isometric tiles back-to-front (painter's order: row + col ascending)
      const sortedTiles = [...st.tiles].sort((a, b) => a.row + a.col - (b.row + b.col));
      const hover = hoverTileRef.current;

      for (const tile of sortedTiles) {
        const { x, y } = gridToIso(tile.row, tile.col, tileW, tileH, originX, originY);
        const isHovered = hover?.row === tile.row && hover?.col === tile.col;

        if (!tile.unlocked) {
          drawIsoTileExtrusion(
            ctx,
            x,
            y,
            tileW - 2,
            tileH - 1,
            8 * cam.zoom,
            '#65a30d',
            '#4d7c0f',
            '#3f6212',
            isHovered ? '#fde047' : 'rgba(255,255,255,0.16)'
          );
          // Wild bush tuft on locked border plots
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(cam.zoom, cam.zoom);
          ctx.fillStyle = '#365314';
          ctx.beginPath();
          ctx.arc(-8, -2, 7, 0, Math.PI * 2);
          ctx.arc(6, -1, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (tile.kind === 'pond') {
          drawIsoTileExtrusion(
            ctx,
            x,
            y,
            tileW - 2,
            tileH - 1,
            6 * cam.zoom,
            '#0ea5e9',
            '#0284c7',
            '#0369a1',
            '#7dd3fc'
          );
          // Swimming duck & animated ripple
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(cam.zoom, cam.zoom);
          const ripple = reducedMotion ? 10 : 8 + ((timeSec * 8) % 10);
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(0, 0, ripple, ripple * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          const duckX = reducedMotion ? 0 : Math.sin(timeSec * 1.4 + tile.col) * 9;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.ellipse(duckX, -2, 6, 4, 0, 0, Math.PI * 2);
          ctx.arc(duckX + 4, -6, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (tile.kind === 'soil' || tile.kind === 'crop') {
          drawIsoTileExtrusion(
            ctx,
            x,
            y,
            tileW - 3,
            tileH - 1.5,
            9 * cam.zoom,
            '#92400e',
            '#78350f',
            '#451a03',
            isHovered ? '#fde047' : '#b45309'
          );
          // Soil furrow lines
          ctx.strokeStyle = 'rgba(69, 26, 3, 0.48)';
          ctx.lineWidth = Math.max(1, 1.5 * cam.zoom);
          for (let f = -1; f <= 1; f += 1) {
            ctx.beginPath();
            ctx.moveTo(x - tileW * 0.2 + f * tileW * 0.08, y - tileH * 0.12 + f * tileH * 0.08);
            ctx.lineTo(x + tileW * 0.14 + f * tileW * 0.08, y + tileH * 0.06 + f * tileH * 0.08);
            ctx.stroke();
          }
        } else {
          // Unlocked lush grass or building base
          drawIsoTileExtrusion(
            ctx,
            x,
            y,
            tileW - 2,
            tileH - 1,
            8 * cam.zoom,
            tile.kind === 'building' ? '#a3e635' : '#84cc16',
            '#65a30d',
            '#4d7c0f',
            isHovered ? '#fef08a' : 'rgba(255,255,255,0.28)'
          );
        }

        // Hover highlight ring
        if (isHovered) {
          drawIsoDiamond(ctx, x, y, tileW - 4, tileH - 2);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Draw crop or building on top of tile
        if (tile.kind === 'crop' && tile.crop) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(cam.zoom, cam.zoom);
          drawCropSprite(ctx, 0, 0, tile, timeSec, reducedMotion);

          // Tiny non-blocking progress bar when still growing
          if (tile.crop.stage !== 'harvestable') {
            const def = ISO_CROP_MAP[tile.crop.cropId];
            const pct = Math.min(1, tile.crop.elapsedMs / Math.max(1, def.growDurationMs));
            ctx.fillStyle = 'rgba(15,23,42,0.55)';
            ctx.fillRect(-16, 12, 32, 4);
            ctx.fillStyle = tile.crop.isGoldenBoosted ? '#facc15' : '#4ade80';
            ctx.fillRect(-16, 12, 32 * pct, 4);
          }
          ctx.restore();
        } else if (tile.kind === 'building' && tile.building) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(cam.zoom, cam.zoom);
          drawIsoBuilding(ctx, 0, 0, tile, timeSec, reducedMotion);
          ctx.restore();
        }
      }

      // 3. Smoothly animate Farm Owner Character walking toward target plot
      const fp = farmerPosRef.current;
      fp.row += (fp.targetRow - fp.row) * 0.1;
      fp.col += (fp.targetCol - fp.col) * 0.1;
      const farmerScreen = gridToIso(fp.row, fp.col, tileW, tileH, originX, originY);
      const walkStep = reducedMotion
        ? 0
        : Math.abs(fp.targetRow - fp.row) + Math.abs(fp.targetCol - fp.col) > 0.08
          ? Math.abs(Math.sin(timeSec * 12)) * 4
          : Math.sin(timeSec * 2) * 1.2;

      ctx.save();
      ctx.translate(farmerScreen.x, farmerScreen.y - walkStep);
      ctx.scale(cam.zoom, cam.zoom);
      // Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 4 + walkStep, 10, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Denim overalls body
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-7, -14, 14, 16, 4);
      ctx.fill();
      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -21, 7.5, 0, Math.PI * 2);
      ctx.fill();
      // Straw hat (Hay Day iconic look)
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -26, 13, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -28, 7, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 4. Drifting soft cloud shadows & floating events
      if (!reducedMotion) {
        const cloudX = ((timeSec * 18) % (width + 320)) - 160;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.beginPath();
        ctx.ellipse(cloudX, height * 0.18, 90, 32, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const nowEpoch = Date.now();
      for (const ev of latestEventsRef.current) {
        const age = nowEpoch - ev.createdAt;
        if (age > 1700) continue;
        const pos = gridToIso(ev.row, ev.col, tileW, tileH, originX, originY);
        const rise = (age / 1700) * 34;
        const alpha = Math.max(0, 1 - age / 1700);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(13 * Math.max(0.9, cam.zoom))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeText(ev.text, pos.x, pos.y - 28 - rise);
        ctx.fillStyle =
          ev.tone === 'gold'
            ? '#fde047'
            : ev.tone === 'harvest'
              ? '#86efac'
              : ev.tone === 'water'
                ? '#7dd3fc'
                : ev.tone === 'warn'
                  ? '#fda4af'
                  : '#ffffff';
        ctx.fillText(ev.text, pos.x, pos.y - 28 - rise);
        ctx.restore();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const resolveTileFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const { tileW, tileH, originX, originY } = getWorldMetrics(canvas);
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const { row, col } = isoToGrid(localX, localY, tileW, tileH, originX, originY);
      if (row < 0 || col < 0 || row >= state.gridSize || col >= state.gridSize) {
        return null;
      }
      return { row, col };
    },
    [getWorldMetrics, state.gridSize]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canSwipe =
      activeTool === 'sickle' ||
      activeTool === 'plant' ||
      activeTool === 'water' ||
      activeTool === 'fertilize' ||
      activeTool === 'till';

    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: cameraRef.current.panX,
      startPanY: cameraRef.current.panY,
      swiping: canSwipe,
      lastSwipedKey: '',
    };

    if (canSwipe) {
      const hit = resolveTileFromClientPoint(e.clientX, e.clientY);
      if (hit) {
        dragRef.current.lastSwipedKey = `${hit.row}-${hit.col}`;
        applyToolToTile(hit.row, hit.col);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = resolveTileFromClientPoint(e.clientX, e.clientY);
    hoverTileRef.current = hit;

    if (!dragRef.current.active) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 6) {
      dragRef.current.moved = true;
    }

    if (dragRef.current.swiping) {
      if (hit) {
        const key = `${hit.row}-${hit.col}`;
        if (key !== dragRef.current.lastSwipedKey) {
          dragRef.current.lastSwipedKey = key;
          applyToolToTile(hit.row, hit.col);
        }
      }
      return;
    }

    // Pan camera
    cameraRef.current.panX = Math.max(-420, Math.min(420, dragRef.current.startPanX + dx));
    cameraRef.current.panY = Math.max(-320, Math.min(320, dragRef.current.startPanY + dy));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasMoved = dragRef.current.moved;
    const wasSwiping = dragRef.current.swiping;
    dragRef.current.active = false;
    dragRef.current.swiping = false;

    if (!wasSwiping && !wasMoved) {
      const hit = resolveTileFromClientPoint(e.clientX, e.clientY);
      if (hit) applyToolToTile(hit.row, hit.col);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const nextZoom = Math.max(0.65, Math.min(1.8, cameraRef.current.zoom - e.deltaY * 0.0008));
    cameraRef.current.zoom = Number(nextZoom.toFixed(2));
    setZoomUi(cameraRef.current.zoom);
  };

  const adjustZoom = (delta: number) => {
    const next = Math.max(0.65, Math.min(1.8, cameraRef.current.zoom + delta));
    cameraRef.current.zoom = Number(next.toFixed(2));
    setZoomUi(cameraRef.current.zoom);
  };

  const inspectedTileObj = useMemo(() => {
    if (!inspectedTile) return null;
    return state.tiles.find(
      (t) => t.row === inspectedTile.row && t.col === inspectedTile.col
    ) || null;
  }, [inspectedTile, state.tiles]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] w-screen h-dvh overflow-hidden select-none bg-[#65a30d] font-sans"
    >
      {/* Full-Screen 2D Isometric Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current.active = false;
          dragRef.current.swiping = false;
        }}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none ${
          activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
        aria-label={lang === 'th' ? 'พื้นที่เกมฟาร์มไอโซเมตริก 2 มิติ' : '2D Isometric Farm Canvas'}
      />

      {/* Portrait Mobile Orientation Prompt (non-blocking) */}
      {isPortrait && !dismissPortraitNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md max-w-[92vw]">
          <RotateCw className="w-4 h-4 shrink-0 text-amber-300" />
          <span className="truncate">
            {lang === 'th'
              ? 'หมุนหน้าจอแนวนอนเพื่อเล่นฟาร์มได้เต็มตาแบบ Hay Day'
              : 'Rotate to landscape for the best full-screen farm view'}
          </span>
          <button
            type="button"
            onClick={() => setDismissPortraitNotice(true)}
            aria-label="Close rotate hint"
            className="p-1 rounded-md hover:bg-white/15 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP-LEFT HUD: Exit Back to School View + Level Star + XP + Farm Name */}
      <div className="fixed top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            playSfx('close');
            onExit();
          }}
          className="min-h-[40px] px-3 py-2 rounded-xl border-2 border-[#78350f] bg-gradient-to-b from-[#fef3c7] to-[#fde68a] hover:brightness-105 text-[#451a03] text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>{lang === 'th' ? 'กลับหน้าเรียน' : 'School View'}</span>
        </button>

        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#78350f]/90 bg-[#451a03]/85 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-xs">
          <HayDayLevelStarBadge level={state.level} className="w-9 h-9" />
          <div className="min-w-[112px] sm:min-w-[140px]">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold leading-tight">
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{state.farmName}</span>
              <span className="text-amber-300 tabular-nums shrink-0">
                {state.xp}/{state.xpToNextLevel} XP
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-slate-900/80 overflow-hidden border border-amber-300/30">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-300 transition-all duration-300"
                style={{ width: `${derived.xpProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT HUD: Gold Balance + Diamonds + Silo + Audio & Fullscreen Controls */}
      <div className="fixed top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div
          className="min-h-[40px] px-2.5 py-1 rounded-xl border-2 border-[#78350f] bg-[#451a03]/85 text-amber-200 flex items-center gap-1.5 shadow-md"
          title={lang === 'th' ? 'ยอดเหรียญทอง' : 'Gold Balance'}
        >
          <HayDayCoinIcon className="w-5 h-5" />
          <span className="text-sm font-black text-white tabular-nums">{state.gold}</span>
        </div>

        <div
          className="hidden sm:flex min-h-[40px] px-2.5 py-1 rounded-xl border-2 border-[#78350f] bg-[#451a03]/85 text-sky-200 items-center gap-1.5 shadow-md"
          title={lang === 'th' ? 'เพชรฟาร์ม' : 'Diamonds'}
        >
          <HayDayGemIcon className="w-5 h-5" />
          <span className="text-sm font-black text-white tabular-nums">{state.diamonds}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            toggleMusicMuted();
          }}
          aria-label={state.musicMuted ? 'Unmute music' : 'Mute music'}
          title={lang === 'th' ? 'เปิด/ปิดดนตรี' : 'Toggle Music'}
          className="w-10 h-10 rounded-xl border-2 border-[#78350f] bg-amber-100/95 hover:bg-white text-[#78350f] flex items-center justify-center shadow-md cursor-pointer shrink-0"
        >
          <Music className={`w-4 h-4 ${state.musicMuted ? 'opacity-40' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => {
            toggleSoundMuted();
          }}
          aria-label={state.soundMuted ? 'Unmute sound effects' : 'Mute sound effects'}
          title={lang === 'th' ? 'เปิด/ปิดเสียงเอฟเฟกต์' : 'Toggle SFX'}
          className="w-10 h-10 rounded-xl border-2 border-[#78350f] bg-amber-100/95 hover:bg-white text-[#78350f] flex items-center justify-center shadow-md cursor-pointer shrink-0"
        >
          {state.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label={lang === 'th' ? 'โหมดเต็มจอแนวนอน' : 'Toggle Fullscreen'}
          title={lang === 'th' ? 'โหมดเต็มจอแนวนอน' : 'Landscape Fullscreen'}
          className="w-10 h-10 rounded-xl border-2 border-[#78350f] bg-amber-100/95 hover:bg-white text-[#78350f] flex items-center justify-center shadow-md cursor-pointer shrink-0"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* LEFT-EDGE HUD: Orders, Shop, Inventory + Zoom */}
      <div className="fixed left-2.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            playSfx('open');
            setActivePanel((p) => (p === 'orders' ? null : 'orders'));
          }}
          className="min-h-[44px] px-2.5 py-2 rounded-2xl border-2 border-[#78350f] bg-gradient-to-b from-amber-100 to-amber-200 hover:brightness-105 text-[#451a03] shadow-lg flex items-center gap-2 text-xs font-extrabold cursor-pointer whitespace-nowrap"
        >
          <Truck className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="hidden md:inline">{lang === 'th' ? 'ออเดอร์รถ' : 'Orders'}</span>
          <span className="text-[11px] font-black text-rose-700 tabular-nums">
            ({state.truckOrders.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx('open');
            setActivePanel((p) => (p === 'shop' ? null : 'shop'));
          }}
          className="min-h-[44px] px-2.5 py-2 rounded-2xl border-2 border-[#78350f] bg-gradient-to-b from-amber-100 to-amber-200 hover:brightness-105 text-[#451a03] shadow-lg flex items-center gap-2 text-xs font-extrabold cursor-pointer whitespace-nowrap"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="hidden md:inline">{lang === 'th' ? 'ร้านค้า' : 'Shop'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx('open');
            setActivePanel((p) => (p === 'inventory' ? null : 'inventory'));
          }}
          className="min-h-[44px] px-2.5 py-2 rounded-2xl border-2 border-[#78350f] bg-gradient-to-b from-amber-100 to-amber-200 hover:brightness-105 text-[#451a03] shadow-lg flex items-center gap-2 text-xs font-extrabold cursor-pointer whitespace-nowrap"
        >
          <Package className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="hidden md:inline">{lang === 'th' ? 'ไซโล/โรงนา' : 'Storage'}</span>
          <span className="text-[11px] font-black tabular-nums">
            {derived.siloUsed}/{state.inventory.siloCapacity}
          </span>
        </button>

        {/* Camera Zoom Controls */}
        <div className="mt-1 flex flex-col items-center gap-1 rounded-2xl border-2 border-[#78350f]/80 bg-[#451a03]/80 p-1 text-white shadow-md">
          <button
            type="button"
            onClick={() => adjustZoom(0.15)}
            aria-label="Zoom in"
            className="w-9 h-9 rounded-xl hover:bg-white/15 flex items-center justify-center cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              cameraRef.current = { zoom: 1.0, panX: 0, panY: -20 };
              setZoomUi(1.0);
            }}
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded hover:bg-white/15 cursor-pointer"
          >
            {zoomUi.toFixed(1)}×
          </button>
          <button
            type="button"
            onClick={() => adjustZoom(-0.15)}
            aria-label="Zoom out"
            className="w-9 h-9 rounded-xl hover:bg-white/15 flex items-center justify-center cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RIGHT-EDGE COMPACT INSPECTOR CARD (only when user taps a plot in Pan mode) */}
      {inspectedTileObj && (
        <div className="fixed right-2.5 sm:right-3 top-16 z-20 w-60 rounded-2xl border-2 border-[#78350f] bg-amber-50/95 p-3 text-[#451a03] shadow-xl backdrop-blur-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black">
              แปลง ({inspectedTileObj.row + 1}, {inspectedTileObj.col + 1})
            </span>
            <button
              type="button"
              onClick={() => setInspectedTile(null)}
              aria-label="Close plot info"
              className="p-1 rounded-md hover:bg-amber-200/70 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {inspectedTileObj.kind === 'crop' && inspectedTileObj.crop ? (
            <div className="mt-1.5 space-y-1 text-xs">
              <div className="font-bold">{ISO_CROP_MAP[inspectedTileObj.crop.cropId].nameTh}</div>
              <div className="text-[11px] text-amber-900">
                ระยะ: {STAGE_LABEL_TH[inspectedTileObj.crop.stage]}
              </div>
              {inspectedTileObj.crop.stage === 'harvestable' ? (
                <button
                  type="button"
                  onClick={() => applyToolToTile(inspectedTileObj.row, inspectedTileObj.col, 'sickle')}
                  className="mt-1 w-full min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  เก็บเกี่ยวเลย
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => applyToolToTile(inspectedTileObj.row, inspectedTileObj.col, 'water')}
                  className="mt-1 w-full min-h-[36px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer"
                >
                  รดน้ำเร่งโต
                </button>
              )}
            </div>
          ) : inspectedTileObj.kind === 'building' && inspectedTileObj.building ? (
            <div className="mt-1.5 space-y-1 text-xs">
              <div className="font-bold">
                {ISO_BUILDING_MAP[inspectedTileObj.building.type].nameTh} (Lv.{inspectedTileObj.building.level})
              </div>
              <div className="text-[11px] text-amber-900">
                {inspectedTileObj.building.readyToCollect ? 'ผลผลิตพร้อมเก็บแล้ว!' : 'กำลังผลิตผลผลิต...'}
              </div>
            </div>
          ) : !inspectedTileObj.unlocked ? (
            <button
              type="button"
              onClick={() => applyToolToTile(inspectedTileObj.row, inspectedTileObj.col, 'expand')}
              className="mt-2 w-full min-h-[36px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
            >
              ปลดล็อกพื้นที่ (โฉนด / 65 เหรียญ)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => applyToolToTile(inspectedTileObj.row, inspectedTileObj.col, 'plant')}
              className="mt-2 w-full min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
            >
              ปลูก {ISO_CROP_MAP[selectedCropId].nameTh}
            </button>
          )}
        </div>
      )}

      {/* BOTTOM CENTER: Hay Day Wooden Tool Dock + Quick Seed/Building Selector */}
      <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 max-w-[96vw] pointer-events-auto">
        {activeTool === 'plant' && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[92vw] rounded-2xl border-2 border-[#78350f] bg-[#fef3c7]/95 px-2 py-1.5 shadow-lg">
            {ISO_CROP_CATALOG.map((crop) => {
              const locked = crop.unlockLevel > state.level;
              const qty = state.inventory.seeds[crop.id] || 0;
              const active = selectedCropId === crop.id;
              return (
                <button
                  key={crop.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    playSfx('tap');
                    setSelectedCropId(crop.id);
                  }}
                  className={`min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer ${
                    locked
                      ? 'opacity-45 cursor-not-allowed bg-stone-200 text-stone-600'
                      : active
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-[#451a03] hover:bg-amber-100'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5 shrink-0" />
                  <span>{crop.nameTh}</span>
                  <span className="tabular-nums opacity-90">({locked ? `Lv.${crop.unlockLevel}` : qty})</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTool === 'build' && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[92vw] rounded-2xl border-2 border-[#78350f] bg-[#fef3c7]/95 px-2 py-1.5 shadow-lg">
            {ISO_BUILDING_CATALOG.filter((b) => b.removable).map((b) => {
              const locked = b.unlockLevel > state.level;
              const active = selectedBuilding === b.type;
              return (
                <button
                  key={b.type}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    playSfx('tap');
                    setSelectedBuilding(b.type);
                  }}
                  className={`min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer ${
                    locked
                      ? 'opacity-45 cursor-not-allowed bg-stone-200 text-stone-600'
                      : active
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white text-[#451a03] hover:bg-amber-100'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5 shrink-0" />
                  <span>{b.nameTh}</span>
                  <span className="tabular-nums">({b.costGold}🪙)</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-[95vw] rounded-2xl border-2 border-[#78350f] bg-gradient-to-b from-[#92400e] to-[#78350f] px-2 py-1.5 shadow-2xl">
          {(
            [
              { id: 'pan', label: 'เลื่อนฉาก', toolSprite: 'inspect' as const, badge: '' },
              {
                id: 'sickle',
                label: 'เคียวเกี่ยว',
                toolSprite: 'harvest' as const,
                badge: derived.readyHarvestCount > 0 ? String(derived.readyHarvestCount) : '',
              },
              {
                id: 'plant',
                label: 'ปลูกพืช',
                toolSprite: 'plant' as const,
                badge: String(state.inventory.seeds[selectedCropId] || 0),
              },
              {
                id: 'water',
                label: 'รดน้ำ',
                toolSprite: 'water' as const,
                badge: String(state.inventory.supplies.waterCans),
              },
              {
                id: 'fertilize',
                label: 'ปุ๋ยทอง',
                toolSprite: 'fertilize' as const,
                badge: String(state.inventory.supplies.goldenFertilizer),
              },
              { id: 'till', label: 'พรวนดิน', toolSprite: 'till' as const, badge: '' },
              { id: 'build', label: 'สร้าง', toolSprite: 'build' as const, badge: '' },
              {
                id: 'expand',
                label: 'ขยายที่',
                toolSprite: 'unlock' as const,
                badge: String(state.inventory.supplies.expansionDeeds),
              },
            ] as const
          ).map((item) => {
            const active = activeTool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setActiveTool(item.id);
                }}
                className={`min-h-[44px] px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-extrabold transition shrink-0 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-b from-[#fef08a] to-[#facc15] text-[#451a03] shadow-md ring-2 ring-white/80'
                    : 'bg-[#451a03]/60 hover:bg-[#451a03]/85 text-amber-100'
                }`}
              >
                <HayDayToolSprite tool={item.toolSprite} className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[11px] font-black tabular-nums opacity-90">
                    ({item.badge})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* OVERLAY MODAL PANELS (Orders / Shop / Storage) */}
      {activePanel && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[82vh] flex flex-col rounded-3xl border-4 border-[#78350f] bg-[#fffbeb] text-[#451a03] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-[#b45309] to-[#92400e] text-white">
              <div className="flex items-center gap-2 font-black text-base">
                {activePanel === 'orders' && <Truck className="w-5 h-5" />}
                {activePanel === 'shop' && <ShoppingBag className="w-5 h-5" />}
                {activePanel === 'inventory' && <Wheat className="w-5 h-5" />}
                <span>
                  {activePanel === 'orders'
                    ? 'กระดานออเดอร์รถบรรทุก'
                    : activePanel === 'shop'
                      ? 'ร้านค้าเมล็ดพันธุ์ & สิ่งปลูกสร้าง'
                      : `คลังไซโล (${derived.siloUsed}/${state.inventory.siloCapacity}) & โรงนา (${derived.barnUsed}/${state.inventory.barnCapacity})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playSfx('close');
                  setActivePanel(null);
                }}
                aria-label="Close modal"
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {activePanel === 'orders' &&
                state.truckOrders.map((order) => {
                  const cropDef = ISO_CROP_MAP[order.cropId];
                  const owned = state.inventory.crops[order.cropId] || 0;
                  const canDeliver = owned >= order.quantity;
                  return (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-white p-3.5 shadow-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-black">
                          {order.customerNameTh} · {order.customerTitleTh}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-amber-900">
                          ต้องการ {cropDef.nameTh} ×{order.quantity} (ในไซโลมี{' '}
                          <span className="tabular-nums font-black">{owned}</span>)
                        </div>
                        <div className="mt-1 text-xs font-bold text-emerald-700 tabular-nums">
                          รางวัล: +{order.rewardGold} เหรียญ · +{order.rewardXp} XP · +{order.rewardDiamonds} เพชร
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canDeliver}
                        onClick={() => {
                          if (deliverTruckOrder(order.id)) playSfx('truck');
                        }}
                        className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                          canDeliver
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        ส่งรถบรรทุก
                      </button>
                    </div>
                  );
                })}

              {activePanel === 'shop' && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShopTab('seeds')}
                      className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                        shopTab === 'seeds'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-200/70 text-[#451a03]'
                      }`}
                    >
                      เมล็ดพันธุ์พืช
                    </button>
                    <button
                      type="button"
                      onClick={() => setShopTab('buildings')}
                      className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                        shopTab === 'buildings'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-200/70 text-[#451a03]'
                      }`}
                    >
                      อาคารและคอกสัตว์
                    </button>
                  </div>

                  {shopTab === 'seeds' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ISO_CROP_CATALOG.map((crop) => {
                        const locked = crop.unlockLevel > state.level;
                        return (
                          <div
                            key={crop.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-200 bg-white p-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-black">{crop.nameTh}</div>
                              <div className="text-xs text-amber-900 tabular-nums">
                                มีเมล็ด: {state.inventory.seeds[crop.id] || 0} · ขายได้ {crop.sellGold} เหรียญ
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={locked || state.gold < crop.seedCostGold * 3}
                              onClick={() => {
                                if (buySeeds(crop.id, 3)) playSfx('coin');
                              }}
                              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                                locked || state.gold < crop.seedCostGold * 3
                                  ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white'
                              }`}
                            >
                              {locked ? `Lv.${crop.unlockLevel}` : `ซื้อ ×3 (${crop.seedCostGold * 3}🪙)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {shopTab === 'buildings' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ISO_BUILDING_CATALOG.filter((b) => b.removable).map((b) => {
                        const locked = b.unlockLevel > state.level;
                        return (
                          <div
                            key={b.type}
                            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-200 bg-white p-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-black">{b.nameTh}</div>
                              <div className="text-xs text-amber-900 tabular-nums">
                                ราคา {b.costGold} เหรียญ · ผลิต +{b.produceGold}🪙
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                setSelectedBuilding(b.type);
                                setActiveTool('build');
                                setActivePanel(null);
                                playSfx('tap');
                              }}
                              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                                locked
                                  ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {locked ? `Lv.${b.unlockLevel}` : 'เลือกวางในฟาร์ม'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activePanel === 'inventory' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ISO_CROP_CATALOG.map((crop) => {
                    const owned = state.inventory.crops[crop.id] || 0;
                    return (
                      <div
                        key={crop.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-200 bg-white p-3"
                      >
                        <div>
                          <div className="text-sm font-black">{crop.nameTh}</div>
                          <div className="text-xs text-amber-900 tabular-nums">
                            ในไซโล: {owned} ชิ้น · ชิ้นละ {crop.sellGold} เหรียญ
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={owned <= 0}
                          onClick={() => {
                            if (sellCrop(crop.id, 1)) playSfx('coin');
                          }}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                            owned > 0
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          ขาย 1 ชิ้น (+{crop.sellGold}🪙)
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
