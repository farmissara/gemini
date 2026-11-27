import React from 'react';
import {
  BUILDING_MAP,
  CROP_MAP,
  FARM_GRID_SIZE,
  getPlotUnlockStarCost,
  type CropId,
  type FarmTile,
  type FarmTool,
} from '../../lib/schoolFarmEngine';

export interface FloatingFeedback {
  id: number;
  tileIndex: number;
  text: string;
  tone: 'emerald' | 'amber' | 'sky' | 'rose';
}

interface IsometricFarmBoardProps {
  tiles: FarmTile[];
  selectedTileIndex: number | null;
  activeTool: FarmTool;
  todayDate: string;
  readOnly?: boolean;
  feedbacks: FloatingFeedback[];
  lang: 'th' | 'en';
  onTileActivate: (tileIndex: number) => void;
}

const TILE_W = 92;
const TILE_H = 46;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const BLOCK_DEPTH = 12;

// Grid (6x6) spans x from -6*46 to +6*46 (-276..+276), y from 0 to 12*23 (0..276)
const ORIGIN_X = 320;
const ORIGIN_Y = 72;
const VIEWBOX_W = 640;
const VIEWBOX_H = 420;

export const tileToIso = (row: number, col: number) => ({
  x: ORIGIN_X + (col - row) * HALF_W,
  y: ORIGIN_Y + (col + row) * HALF_H,
});

const renderCropArt = (cropId: CropId, stageRatio: number, isReady: boolean, cx: number, cy: number) => {
  // Stage 0: Seeds
  if (stageRatio <= 0) {
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <ellipse cx="-10" cy="-2" rx="4" ry="2.2" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
        <ellipse cx="0" cy="2" rx="4" ry="2.2" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
        <ellipse cx="10" cy="-1" rx="4" ry="2.2" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
      </g>
    );
  }

  // Stage 1: Fresh sprout
  if (stageRatio < 0.55) {
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <path d="M0 3 L0 -9" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M0 -6 C-8 -13 -14 -7 -4 -2 Z" fill="#4ade80" stroke="#166534" strokeWidth="1.2" />
        <path d="M0 -7 C8 -15 14 -8 4 -3 Z" fill="#22c55e" stroke="#166534" strokeWidth="1.2" />
      </g>
    );
  }

  // Stage 2: Leafy bush / growing stalk
  if (!isReady) {
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <ellipse cx="-9" cy="-4" rx="9" ry="7" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
        <ellipse cx="9" cy="-5" rx="9" ry="7" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
        <ellipse cx="0" cy="-10" rx="10" ry="8" fill="#4ade80" stroke="#14532d" strokeWidth="1.2" />
        <circle cx="-4" cy="-11" r="2.2" fill="#fef08a" />
        <circle cx="5" cy="-7" r="2.2" fill="#fef08a" />
      </g>
    );
  }

  // Stage 3: Ready to harvest distinct crop illustrations
  switch (cropId) {
    case 'corn':
      return (
        <g transform={`translate(${cx}, ${cy})`} className="farm-harvest-bounce">
          <path d="M-9 2 C-13 -12 -6 -22 0 -24 C6 -22 13 -12 9 2 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
          <ellipse cx="-5" cy="-12" rx="4.5" ry="9" transform="rotate(-12 -5 -12)" fill="#facc15" stroke="#a16207" strokeWidth="1.2" />
          <ellipse cx="5" cy="-13" rx="4.5" ry="9" transform="rotate(12 5 -13)" fill="#eab308" stroke="#a16207" strokeWidth="1.2" />
          <path d="M-11 -2 C-5 -6 0 -2 0 4 C0 -2 5 -6 11 -2" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
        </g>
      );
    case 'tomato':
      return (
        <g transform={`translate(${cx}, ${cy})`} className="farm-harvest-bounce">
          <ellipse cx="0" cy="-9" rx="15" ry="11" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
          <circle cx="-7" cy="-6" r="5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.2" />
          <circle cx="7" cy="-5" r="5" fill="#dc2626" stroke="#991b1b" strokeWidth="1.2" />
          <circle cx="0" cy="-13" r="5.5" fill="#f87171" stroke="#991b1b" strokeWidth="1.2" />
          <circle cx="-1.5" cy="-14.5" r="1.4" fill="#fee2e2" />
        </g>
      );
    case 'strawberry':
      return (
        <g transform={`translate(${cx}, ${cy})`} className="farm-harvest-bounce">
          <ellipse cx="0" cy="-8" rx="15" ry="9" fill="#15803d" stroke="#14532d" strokeWidth="1.2" />
          <path d="M-10 -8 C-10 -12 -4 -12 -4 -8 C-4 -3 -7 1 -7 1 C-7 1 -10 -3 -10 -8 Z" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.2" />
          <path d="M4 -8 C4 -12 10 -12 10 -8 C10 -3 7 1 7 1 C7 1 4 -3 4 -8 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1.2" />
          <path d="M-4 -14 C-4 -19 4 -19 4 -14 C4 -8 0 -3 0 -3 C0 -3 -4 -8 -4 -14 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.2" />
          <circle cx="-0.8" cy="-13" r="0.9" fill="#fef08a" />
          <circle cx="1.2" cy="-10" r="0.9" fill="#fef08a" />
        </g>
      );
    case 'jasmine_rice':
      return (
        <g transform={`translate(${cx}, ${cy})`} className="farm-harvest-bounce">
          <path d="M-8 3 Q-10 -14 -14 -20" stroke="#eab308" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M-2 3 Q-2 -16 -5 -24" stroke="#facc15" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M4 3 Q6 -16 11 -22" stroke="#eab308" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M9 3 Q13 -12 16 -17" stroke="#ca8a04" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <ellipse cx="-13" cy="-19" rx="3.5" ry="5.5" transform="rotate(-25 -13 -19)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
          <ellipse cx="-4" cy="-22" rx="3.5" ry="6" transform="rotate(-10 -4 -22)" fill="#fef08a" stroke="#a16207" strokeWidth="1" />
          <ellipse cx="10" cy="-20" rx="3.5" ry="5.5" transform="rotate(20 10 -20)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
        </g>
      );
    case 'pumpkin':
      return (
        <g transform={`translate(${cx}, ${cy})`} className="farm-harvest-bounce">
          <ellipse cx="-7" cy="-5" rx="7" ry="8" fill="#ea580c" stroke="#9a3412" strokeWidth="1.2" />
          <ellipse cx="7" cy="-5" rx="7" ry="8" fill="#ea580c" stroke="#9a3412" strokeWidth="1.2" />
          <ellipse cx="0" cy="-5" rx="7.5" ry="9" fill="#f97316" stroke="#9a3412" strokeWidth="1.3" />
          <path d="M0 -14 C1 -19 5 -20 6 -18" stroke="#15803d" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'golden_melon':
      return (
        <g transform={`translate(${cx}, ${cy})`} className="farm-harvest-bounce">
          <ellipse cx="0" cy="-1" rx="14" ry="5" fill="#16a34a" opacity="0.65" />
          <circle cx="0" cy="-10" r="10.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.4" />
          <path d="M-6 -16 Q0 -10 -6 -4 M6 -16 Q0 -10 6 -4 M-10 -10 Q0 -7 10 -10" stroke="#fef3c7" strokeWidth="1.1" fill="none" opacity="0.85" />
          <path d="M0 -20 L0 -25 L5 -24" stroke="#15803d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      );
  }
};

const renderBuildingArt = (buildingId: FarmTile['buildingId'], cx: number, cy: number) => {
  switch (buildingId) {
    case 'chicken_coop':
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          {/* Base timber box */}
          <polygon points="-18,-2 0,7 18,-2 18,-18 0,-9 -18,-18" fill="#fde68a" stroke="#78350f" strokeWidth="1.3" />
          <polygon points="0,7 18,-2 18,-18 0,-9" fill="#f59e0b" stroke="#78350f" strokeWidth="1.3" />
          {/* Roof */}
          <polygon points="-21,-17 0,-29 21,-17 0,-7" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.4" />
          {/* Little hen */}
          <circle cx="13" cy="5" r="4" fill="#ffffff" stroke="#475569" strokeWidth="1" />
          <circle cx="15.5" cy="2" r="2.2" fill="#ffffff" stroke="#475569" strokeWidth="1" />
          <polygon points="17.5,2 20,2.7 17.5,3.5" fill="#f97316" />
        </g>
      );
    case 'town_fountain':
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <ellipse cx="0" cy="-2" rx="22" ry="11" fill="#cbd5e1" stroke="#475569" strokeWidth="1.3" />
          <ellipse cx="0" cy="-4" rx="17" ry="8" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
          <rect x="-3" y="-20" width="6" height="16" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
          <path d="M0 -20 C-7 -28 -13 -18 -11 -8" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M0 -20 C7 -28 13 -18 11 -8" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'dairy_barn':
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <polygon points="-22,0 0,10 0,-14 -22,-24" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.3" />
          <polygon points="0,10 22,0 22,-24 0,-14" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.3" />
          <polygon points="-25,-22 0,-38 25,-22 0,-11" fill="#78350f" stroke="#451a03" strokeWidth="1.4" />
          {/* White barn door X */}
          <polygon points="-14,-3 -5,1 -5,-12 -14,-16" fill="#fef2f2" stroke="#7f1d1d" strokeWidth="1" />
          <line x1="-14" y1="-16" x2="-5" y2="1" stroke="#b91c1c" strokeWidth="1" />
          <line x1="-5" y1="-12" x2="-14" y2="-3" stroke="#b91c1c" strokeWidth="1" />
          {/* Friendly mini cow */}
          <ellipse cx="14" cy="6" rx="6" ry="4" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
          <circle cx="12" cy="5" r="1.6" fill="#1e293b" />
          <circle cx="18" cy="3" r="2.6" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
        </g>
      );
    case 'school_greenhouse':
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <polygon points="-21,0 0,9 0,-13 -21,-22" fill="#bae6fd" fillOpacity="0.82" stroke="#0369a1" strokeWidth="1.3" />
          <polygon points="0,9 21,0 21,-22 0,-13" fill="#7dd3fc" fillOpacity="0.78" stroke="#0369a1" strokeWidth="1.3" />
          <polygon points="-22,-22 0,-35 22,-22 0,-12" fill="#e0f2fe" fillOpacity="0.9" stroke="#0284c7" strokeWidth="1.4" />
          <circle cx="-6" cy="-7" r="4.5" fill="#22c55e" opacity="0.85" />
          <circle cx="6" cy="-6" r="4.5" fill="#16a34a" opacity="0.85" />
          <circle cx="0" cy="-12" r="5" fill="#4ade80" opacity="0.85" />
        </g>
      );
    case 'windmill_bakery':
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <polygon points="-17,2 0,10 17,2 11,-28 0,-23 -11,-28" fill="#fef3c7" stroke="#92400e" strokeWidth="1.3" />
          <polygon points="0,10 17,2 11,-28 0,-23" fill="#fde68a" stroke="#92400e" strokeWidth="1.3" />
          <polygon points="-13,-27 0,-39 13,-27 0,-21" fill="#ea580c" stroke="#7c2d12" strokeWidth="1.4" />
          {/* Rotating blades */}
          <g transform="translate(0, -18)" className="farm-windmill-spin">
            <rect x="-1.5" y="-17" width="3" height="34" rx="1" fill="#fffbeb" stroke="#78350f" strokeWidth="1" />
            <rect x="-17" y="-1.5" width="34" height="3" rx="1" fill="#fffbeb" stroke="#78350f" strokeWidth="1" />
            <circle cx="0" cy="0" r="3" fill="#78350f" />
          </g>
        </g>
      );
    default:
      return null;
  }
};

export const IsometricFarmBoard: React.FC<IsometricFarmBoardProps> = ({
  tiles,
  selectedTileIndex,
  activeTool,
  todayDate,
  readOnly = false,
  feedbacks,
  lang,
  onTileActivate,
}) => {
  const unlockedCount = tiles.filter((t) => t.unlocked).length;
  const nextUnlockCost = getPlotUnlockStarCost(unlockedCount);

  // Render back-to-front in isometric depth order (row + col ascending)
  const orderedTiles = [...tiles].sort((a, b) => a.row + a.col - (b.row + b.col) || a.row - b.row);

  return (
    <div className="relative w-full select-none overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-b from-sky-100 via-emerald-50 to-lime-100/80 dark:from-slate-900 dark:via-emerald-950/60 dark:to-slate-900 shadow-inner">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .farm-harvest-bounce {
            animation: farmBounce 1.8s ease-in-out infinite;
          }
          .farm-windmill-spin {
            animation: farmSpin 9s linear infinite;
          }
          .farm-float-up {
            animation: farmFloatUp 1.15s ease-out forwards;
          }
        }
        @keyframes farmBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes farmSpin {
          from { transform: translate(0px, -18px) rotate(0deg); }
          to { transform: translate(0px, -18px) rotate(360deg); }
        }
        @keyframes farmFloatUp {
          0% { opacity: 0; transform: translateY(4px) scale(0.92); }
          20% { opacity: 1; transform: translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateY(-28px) scale(1); }
        }
      `}</style>

      {/* Soft daylight sky & rolling meadow accents */}
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full h-auto max-h-[540px] block touch-manipulation"
        role="img"
        aria-label={lang === 'th' ? 'แผนที่ฟาร์มและเมืองโรงเรียนแบบไอโซเมตริก' : 'Isometric school farm and town map'}
      >
        <defs>
          <radialGradient id="meadowGlow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sun & gentle clouds */}
        <circle cx="76" cy="54" r="24" fill="#fde047" opacity="0.7" />
        <circle cx="76" cy="54" r="34" fill="#fef08a" opacity="0.28" />
        <g opacity="0.65" fill="#ffffff">
          <ellipse cx="195" cy="48" rx="28" ry="11" />
          <ellipse cx="215" cy="43" rx="18" ry="10" />
          <ellipse cx="485" cy="58" rx="32" ry="12" />
          <ellipse cx="506" cy="52" rx="20" ry="10" />
        </g>

        {/* Ground island base */}
        <ellipse cx={ORIGIN_X} cy={ORIGIN_Y + FARM_GRID_SIZE * HALF_H + 8} rx="290" ry="145" fill="url(#meadowGlow)" />
        <polygon
          points={`${ORIGIN_X},${ORIGIN_Y - 12} ${ORIGIN_X + FARM_GRID_SIZE * HALF_W + 18},${ORIGIN_Y + FARM_GRID_SIZE * HALF_H} ${ORIGIN_X},${ORIGIN_Y + FARM_GRID_SIZE * TILE_H + 14} ${ORIGIN_X - FARM_GRID_SIZE * HALF_W - 18},${ORIGIN_Y + FARM_GRID_SIZE * HALF_H}`}
          fill="#65a30d"
          fillOpacity="0.22"
        />

        {orderedTiles.map((tile) => {
          const { x, y } = tileToIso(tile.row, tile.col);
          const isSelected = selectedTileIndex === tile.index;
          const isCrop = tile.kind === 'crop' && tile.cropId;
          const cropDef = isCrop && tile.cropId ? CROP_MAP[tile.cropId] : null;
          const growth = tile.growthProgress || 0;
          const isReadyCrop = Boolean(cropDef && growth >= cropDef.watersNeeded);
          const isBuilding = tile.kind === 'building' && tile.buildingId;
          const buildingYieldReady = isBuilding && tile.lastCollectedDate !== todayDate;
          const isWeed = tile.kind === 'weed';

          // Tile color palette based on state
          let topFill = '#84cc16'; // locked soft grass
          let leftEdge = '#65a30d';
          let rightEdge = '#4d7c0f';
          let strokeColor = '#3f6212';

          if (tile.unlocked) {
            if (isBuilding) {
              topFill = '#e2e8f0';
              leftEdge = '#94a3b8';
              rightEdge = '#64748b';
              strokeColor = '#475569';
            } else if (isWeed) {
              topFill = '#a16207';
              leftEdge = '#713f12';
              rightEdge = '#451a03';
              strokeColor = '#7f1d1d';
            } else if (tile.wateredToday) {
              topFill = '#854d0e';
              leftEdge = '#713f12';
              rightEdge = '#422006';
              strokeColor = tile.fertilized ? '#eab308' : '#713f12';
            } else {
              topFill = '#d9b382';
              leftEdge = '#b88954';
              rightEdge = '#946838';
              strokeColor = '#785028';
            }
          }

          const topPts = `${x},${y} ${x + HALF_W},${y + HALF_H} ${x},${y + TILE_H} ${x - HALF_W},${y + HALF_H}`;
          const leftPts = `${x - HALF_W},${y + HALF_H} ${x},${y + TILE_H} ${x},${y + TILE_H + BLOCK_DEPTH} ${x - HALF_W},${y + HALF_H + BLOCK_DEPTH}`;
          const rightPts = `${x},${y + TILE_H} ${x + HALF_W},${y + HALF_H} ${x + HALF_W},${y + HALF_H + BLOCK_DEPTH} ${x},${y + TILE_H + BLOCK_DEPTH}`;

          const centerX = x;
          const centerY = y + HALF_H;

          const ariaTileLabel = !tile.unlocked
            ? (lang === 'th' ? `แปลงที่ ${tile.index + 1} ยังไม่ปลดล็อก (ใช้ ${nextUnlockCost} ดาว)` : `Locked plot ${tile.index + 1}`)
            : isWeed
              ? (lang === 'th' ? `แปลงที่ ${tile.index + 1} มีวัชพืช` : `Weed on plot ${tile.index + 1}`)
              : isCrop && cropDef
                ? `${lang === 'th' ? cropDef.nameTh : cropDef.nameEn} (${growth}/${cropDef.watersNeeded})`
                : isBuilding && tile.buildingId
                  ? (lang === 'th' ? BUILDING_MAP[tile.buildingId].nameTh : BUILDING_MAP[tile.buildingId].nameEn)
                  : (lang === 'th' ? `แปลงว่างที่ ${tile.index + 1}` : `Empty plot ${tile.index + 1}`);

          return (
            <g
              key={tile.index}
              role="button"
              tabIndex={readOnly ? -1 : 0}
              aria-label={ariaTileLabel}
              onClick={() => {
                if (!readOnly) onTileActivate(tile.index);
              }}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onTileActivate(tile.index);
                }
              }}
              className={readOnly ? 'cursor-default' : 'cursor-pointer group focus:outline-none'}
            >
              {/* Extruded 3D Isometric Tile */}
              <polygon points={leftPts} fill={leftEdge} />
              <polygon points={rightPts} fill={rightEdge} />
              <polygon
                points={topPts}
                fill={topFill}
                stroke={isSelected ? '#facc15' : strokeColor}
                strokeWidth={isSelected ? 2.8 : 1.1}
                className="transition-opacity group-hover:opacity-90"
              />

              {/* Furrow lines on empty or planted soil */}
              {tile.unlocked && !isBuilding && !isWeed && (
                <g opacity="0.35" stroke="#451a03" strokeWidth="1.2">
                  <line x1={x - 16} y1={centerY - 2} x2={x + 6} y2={centerY + 9} />
                  <line x1={x - 6} y1={centerY - 8} x2={x + 16} y2={centerY + 3} />
                </g>
              )}

              {/* Locked outer zone tree/fence cue */}
              {!tile.unlocked && (
                <g transform={`translate(${centerX}, ${centerY})`} opacity="0.82">
                  <line x1="-14" y1="2" x2="14" y2="-8" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="-11" cy="2" r="2.5" fill="#92400e" />
                  <circle cx="11" cy="-7" r="2.5" fill="#92400e" />
                  {(activeTool === 'unlock' || isSelected) && (
                    <g transform="translate(0, -10)">
                      <rect x="-17" y="-9" width="34" height="16" rx="6" fill="#0f172a" fillOpacity="0.82" />
                      <text x="0" y="2" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fde047">
                        {nextUnlockCost}★
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Fertilized golden sparkle */}
              {tile.fertilized && (
                <g transform={`translate(${centerX}, ${centerY})`}>
                  <circle cx="-18" cy="-3" r="2" fill="#fde047" />
                  <circle cx="18" cy="1" r="2" fill="#fde047" />
                </g>
              )}

              {/* Weeds */}
              {isWeed && (
                <g transform={`translate(${centerX}, ${centerY})`}>
                  <path d="M-12 2 L-16 -10 L-7 -2 L-4 -14 L1 -2 L8 -13 L10 -1 L16 -8 L13 3 Z" fill="#581c87" stroke="#3b0764" strokeWidth="1.2" />
                  <circle cx="0" cy="-19" r="7" fill="#dc2626" />
                  <text x="0" y="-15.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">!</text>
                </g>
              )}

              {/* Crop */}
              {isCrop && cropDef && tile.cropId && (
                <>
                  {renderCropArt(
                    tile.cropId,
                    growth / Math.max(1, cropDef.watersNeeded),
                    isReadyCrop,
                    centerX,
                    centerY
                  )}
                  {isReadyCrop && (
                    <g transform={`translate(${centerX}, ${centerY - 30})`} className="farm-harvest-bounce">
                      <rect x="-13" y="-9" width="26" height="16" rx="8" fill="#15803d" stroke="#ffffff" strokeWidth="1.2" />
                      <text x="0" y="2" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#ffffff">
                        {lang === 'th' ? 'เก็บ!' : 'Pick'}
                      </text>
                    </g>
                  )}
                  {!isReadyCrop && !tile.wateredToday && (
                    <g transform={`translate(${centerX + 14}, ${centerY - 16})`}>
                      <circle cx="0" cy="0" r="6.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
                      <path d="M0 -3.5 C2 -0.5 3 1 3 2.2 A3 3 0 0 1 -3 2.2 C-3 1 -2 -0.5 0 -3.5 Z" fill="#e0f2fe" />
                    </g>
                  )}
                </>
              )}

              {/* Building */}
              {isBuilding && (
                <>
                  {renderBuildingArt(tile.buildingId, centerX, centerY)}
                  {buildingYieldReady && (
                    <g transform={`translate(${centerX}, ${centerY - 36})`} className="farm-harvest-bounce">
                      <rect x="-14" y="-9" width="28" height="16" rx="8" fill="#d97706" stroke="#ffffff" strokeWidth="1.2" />
                      <text x="0" y="2" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#ffffff">
                        +🪙
                      </text>
                    </g>
                  )}
                </>
              )}

              {/* Highlight Ring when active */}
              {isSelected && (
                <polygon
                  points={topPts}
                  fill="#fde047"
                  fillOpacity="0.18"
                  stroke="#facc15"
                  strokeWidth="2.5"
                />
              )}
            </g>
          );
        })}

        {/* Floating action feedback labels */}
        {feedbacks.map((fb) => {
          const row = Math.floor(fb.tileIndex / FARM_GRID_SIZE);
          const col = fb.tileIndex % FARM_GRID_SIZE;
          const { x, y } = tileToIso(row, col);
          const bg =
            fb.tone === 'emerald'
              ? '#059669'
              : fb.tone === 'amber'
                ? '#d97706'
                : fb.tone === 'rose'
                  ? '#e11d48'
                  : '#0284c7';
          return (
            <g key={fb.id} transform={`translate(${x}, ${y - 12})`} className="farm-float-up pointer-events-none">
              <rect x="-48" y="-12" width="96" height="22" rx="11" fill={bg} stroke="#ffffff" strokeWidth="1.2" />
              <text x="0" y="2" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#ffffff">
                {fb.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
