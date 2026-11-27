import React, { useRef, useState } from 'react';
import {
  BUILDING_MAP,
  CROP_MAP,
  DEFAULT_FARM_OWNER_CHARACTER,
  PRODUCT_MAP,
  getFarmGridSize,
  getPlotUnlockStarCost,
  type BuildingId,
  type CropId,
  type FarmOwnerCharacter,
  type FarmTile,
  type FarmTool,
  type ProductId,
  type VisitorRequest,
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
  farmName?: string;
  ownerName?: string;
  ownerCharacter?: FarmOwnerCharacter;
  farmerTileIndex?: number | null;
  readOnly?: boolean;
  allowNeighborCropWater?: boolean;
  fullscreenLandscape?: boolean;
  hasGoldenStreakBuff?: boolean;
  feedbacks: FloatingFeedback[];
  lang: 'th' | 'en';
  ordersCount?: number;
  roadsideCount?: number;
  visitors?: VisitorRequest[];
  truckAnimating?: boolean;
  spinAvailable?: boolean;
  onTileActivate: (tileIndex: number) => void;
  onOpenMarket?: () => void;
  onOpenShop?: () => void;
  onOpenVisitors?: () => void;
  onOpenCharacter?: () => void;
  onOpenWheel?: () => void;
  onOpenBarn?: () => void;
  onOpenMail?: () => void;
  onAnimalTap?: (kind: 'chicken' | 'cow' | 'sheep' | 'duck') => void;
  onTileAnimalInfo?: (buildingId: BuildingId) => void;
}

const VIEWBOX_W = 800;
const VIEWBOX_H = 500;

export const getBoardGeometry = (gridSize: 6 | 8) => {
  const tileW = gridSize === 8 ? 72 : 94;
  const tileH = tileW / 2;
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const blockDepth = gridSize === 8 ? 10 : 12;
  const originX = VIEWBOX_W / 2;
  const originY = gridSize === 8 ? 72 : 84;
  return { gridSize, tileW, tileH, halfW, halfH, blockDepth, originX, originY };
};

export const tileToIso = (row: number, col: number, gridSize: 6 | 8 = 6) => {
  const { originX, originY, halfW, halfH } = getBoardGeometry(gridSize);
  return {
    x: originX + (col - row) * halfW,
    y: originY + (col + row) * halfH,
  };
};

const renderCropArt = (
  cropId: CropId,
  stageRatio: number,
  isReady: boolean,
  cx: number,
  cy: number,
  scale: number
) => {
  if (stageRatio <= 0) {
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
        <ellipse cx="-11" cy="-2" rx="4.2" ry="2.4" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
        <ellipse cx="0" cy="2.5" rx="4.2" ry="2.4" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
        <ellipse cx="11" cy="-1" rx="4.2" ry="2.4" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
      </g>
    );
  }

  if (stageRatio < 0.5) {
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
        <path d="M0 3 L0 -11" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M0 -6 C-10 -15 -16 -7 -4 -2 Z" fill="#86efac" stroke="#166534" strokeWidth="1.2" />
        <path d="M0 -7 C10 -16 16 -8 4 -3 Z" fill="#4ade80" stroke="#166534" strokeWidth="1.2" />
      </g>
    );
  }

  if (!isReady) {
    const blossomColor = CROP_MAP[cropId]?.accentColor || '#fef08a';
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
        <ellipse cx="-10" cy="-4" rx="10" ry="7.5" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
        <ellipse cx="10" cy="-5" rx="10" ry="7.5" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
        <ellipse cx="0" cy="-11" rx="11" ry="8.5" fill="#4ade80" stroke="#14532d" strokeWidth="1.2" />
        <g transform="translate(-5, -13)">
          <circle cx="0" cy="0" r="3.4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="0" cy="0" r="1.5" fill={blossomColor} />
        </g>
        <g transform="translate(6, -10)">
          <circle cx="0" cy="0" r="3.4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="0" cy="0" r="1.5" fill={blossomColor} />
        </g>
      </g>
    );
  }

  switch (cropId) {
    case 'corn':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <path d="M-10 3 C-14 -13 -6 -24 0 -26 C6 -24 14 -13 10 3 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
            <ellipse cx="-5.5" cy="-13" rx="5" ry="9.5" transform="rotate(-12 -5.5 -13)" fill="#fde047" stroke="#a16207" strokeWidth="1.2" />
            <ellipse cx="5.5" cy="-14" rx="5" ry="9.5" transform="rotate(12 5.5 -14)" fill="#facc15" stroke="#a16207" strokeWidth="1.2" />
            <path d="M-12 -2 C-5 -6 0 -2 0 4 C0 -2 5 -6 12 -2" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
          </g>
        </g>
      );
    case 'carrot':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <path d="M-9 -10 Q-12 -23 -6 -23 Q-2 -18 -4 -10" fill="#22c55e" stroke="#166534" strokeWidth="1.2" />
            <path d="M-3 -12 Q0 -26 4 -23 Q7 -18 2 -11" fill="#4ade80" stroke="#166534" strokeWidth="1.2" />
            <path d="M4 -10 Q10 -23 12 -19 Q10 -12 6 -9" fill="#16a34a" stroke="#166534" strokeWidth="1.2" />
            <path d="M-10 -9 L-3 -9 L-6 4 Z" fill="#f97316" stroke="#9a3412" strokeWidth="1.2" />
            <path d="M-3 -10 L5 -10 L1 5 Z" fill="#fb923c" stroke="#9a3412" strokeWidth="1.2" />
            <path d="M4 -8 L11 -8 L8 3 Z" fill="#ea580c" stroke="#9a3412" strokeWidth="1.2" />
          </g>
        </g>
      );
    case 'tomato':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <ellipse cx="0" cy="-9" rx="16" ry="11.5" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
            <circle cx="-7" cy="-6" r="5.3" fill="#ef4444" stroke="#991b1b" strokeWidth="1.2" />
            <circle cx="7" cy="-5" r="5.3" fill="#dc2626" stroke="#991b1b" strokeWidth="1.2" />
            <circle cx="0" cy="-14" r="5.8" fill="#f87171" stroke="#991b1b" strokeWidth="1.2" />
            <circle cx="-1.5" cy="-15.5" r="1.5" fill="#fee2e2" />
          </g>
        </g>
      );
    case 'strawberry':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <ellipse cx="0" cy="-8" rx="16" ry="9.5" fill="#15803d" stroke="#14532d" strokeWidth="1.2" />
            <path d="M-10 -8 C-10 -12 -4 -12 -4 -8 C-4 -3 -7 1 -7 1 C-7 1 -10 -3 -10 -8 Z" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.2" />
            <path d="M4 -8 C4 -12 10 -12 10 -8 C10 -3 7 1 7 1 C7 1 4 -3 4 -8 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1.2" />
            <path d="M-4 -14 C-4 -19 4 -19 4 -14 C4 -8 0 -3 0 -3 C0 -3 -4 -8 -4 -14 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.2" />
            <circle cx="-0.8" cy="-13" r="0.9" fill="#fef08a" />
            <circle cx="1.2" cy="-10" r="0.9" fill="#fef08a" />
          </g>
        </g>
      );
    case 'sunflower':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <line x1="-6" y1="3" x2="-6" y2="-13" stroke="#15803d" strokeWidth="2.5" />
            <line x1="6" y1="2" x2="6" y2="-16" stroke="#16a34a" strokeWidth="2.6" />
            <circle cx="-6" cy="-14" r="6.8" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
            <circle cx="-6" cy="-14" r="3.4" fill="#78350f" />
            <circle cx="6" cy="-18" r="8.4" fill="#fde047" stroke="#ca8a04" strokeWidth="1.3" />
            <circle cx="6" cy="-18" r="4.2" fill="#78350f" />
          </g>
        </g>
      );
    case 'jasmine_rice':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <path d="M-8 3 Q-10 -14 -14 -20" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M-2 3 Q-2 -16 -5 -24" stroke="#facc15" strokeWidth="2.7" fill="none" strokeLinecap="round" />
            <path d="M4 3 Q6 -16 11 -22" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M9 3 Q13 -12 16 -17" stroke="#ca8a04" strokeWidth="2.3" fill="none" strokeLinecap="round" />
            <ellipse cx="-13" cy="-19" rx="3.6" ry="5.6" transform="rotate(-25 -13 -19)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
            <ellipse cx="-4" cy="-22" rx="3.6" ry="6.2" transform="rotate(-10 -4 -22)" fill="#fef08a" stroke="#a16207" strokeWidth="1" />
            <ellipse cx="10" cy="-20" rx="3.6" ry="5.6" transform="rotate(20 10 -20)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
          </g>
        </g>
      );
    case 'pumpkin':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <ellipse cx="-7" cy="-5" rx="7.5" ry="8.5" fill="#ea580c" stroke="#9a3412" strokeWidth="1.2" />
            <ellipse cx="7" cy="-5" rx="7.5" ry="8.5" fill="#ea580c" stroke="#9a3412" strokeWidth="1.2" />
            <ellipse cx="0" cy="-5" rx="8" ry="9.5" fill="#f97316" stroke="#9a3412" strokeWidth="1.3" />
            <path d="M0 -14 C1 -19 5 -20 6 -18" stroke="#15803d" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
        </g>
      );
    case 'golden_melon':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <g className="farm-harvest-bounce">
            <ellipse cx="0" cy="-1" rx="14" ry="5" fill="#16a34a" opacity="0.65" />
            <circle cx="0" cy="-10" r="11" fill="#fbbf24" stroke="#b45309" strokeWidth="1.4" />
            <path d="M-6 -16 Q0 -10 -6 -4 M6 -16 Q0 -10 6 -4 M-10 -10 Q0 -7 10 -10" stroke="#fef3c7" strokeWidth="1.1" fill="none" opacity="0.85" />
            <path d="M0 -20 L0 -25 L5 -24" stroke="#15803d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </g>
        </g>
      );
  }
};

const renderBuildingArt = (
  buildingId: FarmTile['buildingId'],
  buildingLevel: number,
  cx: number,
  cy: number,
  scale: number
) => {
  const isUpgraded = buildingLevel >= 2;
  const roofTrim = buildingLevel >= 3 ? '#facc15' : isUpgraded ? '#fb923c' : undefined;

  switch (buildingId) {
    case 'chicken_coop':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <polygon points="-18,-2 0,7 18,-2 18,-18 0,-9 -18,-18" fill="#fef3c7" stroke="#78350f" strokeWidth="1.3" />
          <polygon points="0,7 18,-2 18,-18 0,-9" fill="#fde68a" stroke="#78350f" strokeWidth="1.3" />
          <polygon points="-21,-17 0,-29 21,-17 0,-7" fill="#dc2626" stroke={roofTrim || '#7f1d1d'} strokeWidth={roofTrim ? 2 : 1.4} />
          <g className="farm-animal-bob">
            <circle cx="13" cy="5" r="4.3" fill="#ffffff" stroke="#475569" strokeWidth="1" />
            <circle cx="15.5" cy="1.8" r="2.3" fill="#ffffff" stroke="#475569" strokeWidth="1" />
            <circle cx="15.5" cy="-0.4" r="1" fill="#ef4444" />
            <polygon points="17.8,2 20.5,2.7 17.8,3.5" fill="#f97316" />
          </g>
          <g className="farm-animal-bob" style={{ animationDelay: '0.7s' }}>
            <circle cx="-12" cy="5" r="3.5" fill="#fef3c7" stroke="#92400e" strokeWidth="0.9" />
            <circle cx="-14" cy="2.5" r="1.9" fill="#fef3c7" stroke="#92400e" strokeWidth="0.9" />
            <polygon points="-15.8,2.5 -18,3.2 -15.8,3.8" fill="#f97316" />
          </g>
        </g>
      );
    case 'farm_cottage':
      // Hay Day iconic white farmhouse with dark slate-blue pitched roof & white porch!
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          {/* Stone chimney */}
          <rect x="8" y="-36" width="5.5" height="12" fill="#94a3b8" stroke="#334155" strokeWidth="1.1" />
          {/* Wooden porch base */}
          <polygon points="-24,0 0,12 24,0 0,-12" fill="#b45309" stroke="#78350f" strokeWidth="1.2" />
          {/* Cream/sky siding walls */}
          <polygon points="-20,-1 0,9 0,-15 -20,-25" fill="#e0f2fe" stroke="#334155" strokeWidth="1.3" />
          <polygon points="0,9 20,-1 20,-25 0,-15" fill="#bae6fd" stroke="#334155" strokeWidth="1.3" />
          {/* White porch columns & railing */}
          <line x1="-18" y1="0" x2="-18" y2="-16" stroke="#ffffff" strokeWidth="2.2" />
          <line x1="-2" y1="8" x2="-2" y2="-8" stroke="#ffffff" strokeWidth="2.2" />
          <line x1="-18" y1="-4" x2="-2" y2="4" stroke="#ffffff" strokeWidth="1.8" />
          {/* Door & flower boxes */}
          <polygon points="-12,-3 -7,-0.5 -7,-11 -12,-13.5" fill="#ffffff" stroke="#475569" strokeWidth="0.9" />
          <polygon points="6,-4 14,-8 14,-15 6,-11" fill="#38bdf8" stroke="#0369a1" strokeWidth="1" />
          <ellipse cx="10" cy="-5" rx="4.5" ry="2" fill="#f43f5e" />
          {/* Classic dark slate-blue Hay Day roof */}
          <polygon points="-24,-23 0,-39 24,-23 0,-11" fill="#1e3a5f" stroke={roofTrim || '#0f172a'} strokeWidth={roofTrim ? 2 : 1.4} />
          <polygon points="-10,-28 0,-36 10,-28 0,-21" fill="#334155" opacity="0.65" />
          {/* Gentle chimney smoke puffs */}
          <g className="farm-smoke-rise">
            <circle cx="11" cy="-41" r="2.8" fill="#ffffff" opacity="0.65" />
            <circle cx="14" cy="-47" r="3.6" fill="#ffffff" opacity="0.45" />
          </g>
        </g>
      );
    case 'town_fountain':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <ellipse cx="0" cy="-2" rx="22" ry="11" fill="#cbd5e1" stroke="#475569" strokeWidth="1.3" />
          <ellipse cx="0" cy="-4" rx="17" ry="8" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
          <rect x="-3" y="-20" width="6" height="16" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
          <path d="M0 -20 C-7 -28 -13 -18 -11 -8" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M0 -20 C7 -28 13 -18 11 -8" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'dairy_barn':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <polygon points="-22,0 0,10 0,-14 -22,-24" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.3" />
          <polygon points="0,10 22,0 22,-24 0,-14" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.3" />
          <polygon points="-25,-22 0,-38 25,-22 0,-11" fill="#78350f" stroke={roofTrim || '#451a03'} strokeWidth={roofTrim ? 2 : 1.4} />
          <polygon points="-14,-3 -5,1 -5,-12 -14,-16" fill="#fef2f2" stroke="#7f1d1d" strokeWidth="1" />
          <line x1="-14" y1="-16" x2="-5" y2="1" stroke="#b91c1c" strokeWidth="1" />
          <line x1="-5" y1="-12" x2="-14" y2="-3" stroke="#b91c1c" strokeWidth="1" />
          <g className="farm-animal-bob">
            <ellipse cx="14" cy="6" rx="6.5" ry="4.2" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
            <circle cx="12" cy="5" r="1.7" fill="#1e293b" />
            <circle cx="18.5" cy="3" r="2.8" fill="#ffffff" stroke="#334155" strokeWidth="1.1" />
            <ellipse cx="20" cy="4.2" rx="1.6" ry="1.1" fill="#fbcfe8" />
          </g>
        </g>
      );
    case 'sheep_pen':
      // White picket fence sheep pasture matching Hay Day screenshot!
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <polygon points="-22,0 0,10 22,0 0,-10" fill="#a16207" fillOpacity="0.45" stroke="#ffffff" strokeWidth="1.8" />
          <line x1="-22" y1="-5" x2="0" y2="-15" stroke="#ffffff" strokeWidth="2.4" />
          <line x1="0" y1="-15" x2="22" y2="-5" stroke="#ffffff" strokeWidth="2.4" />
          <rect x="-22" y="-8" width="3" height="9" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <rect x="-1.5" y="-18" width="3" height="9" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <rect x="19" y="-8" width="3" height="9" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
          <g className="farm-animal-bob">
            <circle cx="-6" cy="-2" r="5.5" fill="#ffffff" stroke="#64748b" strokeWidth="1.1" />
            <circle cx="-9" cy="-4" r="3" fill="#ffffff" />
            <circle cx="-3" cy="-4" r="3" fill="#ffffff" />
            <circle cx="-1" cy="-1" r="2.8" fill="#334155" />
            <circle cx="0" cy="-1.5" r="0.8" fill="#ffffff" />
          </g>
          <g className="farm-animal-bob" style={{ animationDelay: '0.8s' }}>
            <circle cx="8" cy="2" r="4.8" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
            <circle cx="12" cy="2" r="2.4" fill="#334155" />
            <circle cx="12.6" cy="1.4" r="0.7" fill="#ffffff" />
          </g>
        </g>
      );
    case 'juice_stand':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <polygon points="-19,0 0,9 19,0 19,-11 0,-2 -19,-11" fill="#f59e0b" stroke="#78350f" strokeWidth="1.3" />
          <polygon points="0,9 19,0 19,-11 0,-2" fill="#d97706" stroke="#78350f" strokeWidth="1.3" />
          <line x1="-16" y1="-10" x2="-16" y2="-23" stroke="#78350f" strokeWidth="2.2" />
          <line x1="16" y1="-10" x2="16" y2="-23" stroke="#78350f" strokeWidth="2.2" />
          <polygon points="-21,-20 0,-32 21,-20 0,-11" fill="#fb7185" stroke={roofTrim || '#be123c'} strokeWidth={roofTrim ? 2 : 1.4} />
          <polygon points="-10,-26 0,-32 6,-28 -4,-15" fill="#fff1f2" opacity="0.85" />
          <rect x="-4" y="-17" width="8" height="10" rx="2" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.1" />
          <line x1="1" y1="-17" x2="4" y2="-22" stroke="#fef08a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case 'school_greenhouse':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <polygon points="-21,0 0,9 0,-13 -21,-22" fill="#bae6fd" fillOpacity="0.82" stroke="#0369a1" strokeWidth="1.3" />
          <polygon points="0,9 21,0 21,-22 0,-13" fill="#7dd3fc" fillOpacity="0.78" stroke="#0369a1" strokeWidth="1.3" />
          <polygon points="-22,-22 0,-35 22,-22 0,-12" fill="#e0f2fe" fillOpacity="0.9" stroke={roofTrim || '#0284c7'} strokeWidth={roofTrim ? 2 : 1.4} />
          <circle cx="-6" cy="-7" r="4.5" fill="#22c55e" opacity="0.85" />
          <circle cx="6" cy="-6" r="4.5" fill="#16a34a" opacity="0.85" />
          <circle cx="0" cy="-12" r="5" fill="#4ade80" opacity="0.85" />
        </g>
      );
    case 'windmill_bakery':
      // Hay Day iconic white/brick dome bakery oven with gold star & flour sacks!
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          {/* Brick chimney */}
          <rect x="-3" y="-36" width="6" height="12" rx="1.5" fill="#b45309" stroke="#78350f" strokeWidth="1.1" />
          {/* Dome oven */}
          <path d="M-18 -2 C-18 -25 18 -25 18 -2 Z" fill="#fef3c7" stroke="#92400e" strokeWidth="1.4" />
          <path d="M-19 -2 L19 -2 L17 4 L-17 4 Z" fill="#ea580c" stroke="#7c2d12" strokeWidth="1.2" />
          {/* Oven fire arch */}
          <path d="M-6 2 V-6 C-6 -11 6 -11 6 -6 V2 Z" fill="#451a03" stroke="#92400e" strokeWidth="1" />
          <ellipse cx="0" cy="0" rx="4" ry="2.2" fill="#f97316" />
          {/* Gold Star emblem on oven */}
          <polygon points="0,-22 2,-18 6,-17.5 3,-15 4,-11 0,-13 -4,-11 -3,-15 -6,-17.5 -2,-18" fill="#facc15" stroke="#92400e" strokeWidth="0.9" />
          {/* Flour sack beside oven */}
          <ellipse cx="14" cy="4" rx="5" ry="4" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
        </g>
      );
    case 'wooden_fence':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <line x1="-22" y1="-2" x2="22" y2="-10" stroke="#fef3c7" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="-22" y1="3" x2="22" y2="-5" stroke="#fde68a" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="-20" y="-10" width="4" height="16" rx="1" fill="#d97706" stroke="#78350f" strokeWidth="1" />
          <rect x="-2" y="-14" width="4" height="16" rx="1" fill="#d97706" stroke="#78350f" strokeWidth="1" />
          <rect x="16" y="-18" width="4" height="16" rx="1" fill="#d97706" stroke="#78350f" strokeWidth="1" />
        </g>
      );
    case 'cobble_path':
      return (
        <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
          <ellipse cx="-8" cy="-2" rx="7.5" ry="3.8" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="9" cy="1" rx="6.5" ry="3.2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="1" cy="-6" rx="7" ry="3.2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="-2" cy="5" rx="6.5" ry="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
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
  farmName,
  ownerName,
  ownerCharacter,
  farmerTileIndex,
  readOnly = false,
  allowNeighborCropWater = false,
  fullscreenLandscape = false,
  hasGoldenStreakBuff = false,
  feedbacks,
  lang,
  ordersCount = 0,
  roadsideCount = 0,
  visitors = [],
  truckAnimating = false,
  spinAvailable = false,
  onTileActivate,
  onOpenMarket,
  onOpenShop,
  onOpenVisitors,
  onOpenCharacter,
  onOpenWheel,
  onOpenBarn,
  onOpenMail,
  onAnimalTap,
}) => {
  const geom = getBoardGeometry(getFarmGridSize(tiles));
  const { gridSize, tileH, halfW, halfH, blockDepth, originX, originY } = geom;
  const spriteScale = gridSize === 8 ? 0.8 : 1;

  const unlockedCount = tiles.filter((t) => t.unlocked).length;
  const nextUnlockCost = getPlotUnlockStarCost(unlockedCount);

  const orderedTiles = [...tiles].sort((a, b) => a.row + a.col - (b.row + b.col) || a.row - b.row);

  // Camera Pan & Zoom state (for lush Hay Day valley exploration)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pondRipple, setPondRipple] = useState(false);
  const dragStateRef = useRef<{
    active: boolean;
    mode: 'pan' | 'swipe';
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
    visitedTiles: Set<number>;
  }>({
    active: false,
    mode: 'pan',
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
    moved: false,
    visitedTiles: new Set(),
  });

  const isFieldSwipeTool =
    !readOnly &&
    (activeTool === 'harvest' ||
      activeTool === 'water' ||
      activeTool === 'plant' ||
      activeTool === 'till' ||
      activeTool === 'daily_fertilize' ||
      activeTool === 'fertilize' ||
      activeTool === 'clear_weed');

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragStateRef.current = {
      active: true,
      mode: isFieldSwipeTool ? 'swipe' : 'pan',
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
      visitedTiles: new Set(),
    };
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.active) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.hypot(dx, dy) > 6) {
      st.moved = true;
    }
    if (st.mode === 'pan' && st.moved) {
      const limitX = 180 * zoom;
      const limitY = 120 * zoom;
      setPan({
        x: Math.max(-limitX, Math.min(limitX, st.origPanX + dx)),
        y: Math.max(-limitY, Math.min(limitY, st.origPanY + dy)),
      });
    } else if (st.mode === 'swipe') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const tileAttr = el?.closest('[data-farm-tile-index]')?.getAttribute('data-farm-tile-index');
      if (tileAttr !== null && tileAttr !== undefined) {
        const idx = Number(tileAttr);
        if (!Number.isNaN(idx) && !st.visitedTiles.has(idx)) {
          st.visitedTiles.add(idx);
          onTileActivate(idx);
        }
      }
    }
  };

  const handleContainerPointerUp = () => {
    dragStateRef.current.active = false;
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!fullscreenLandscape) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Number(Math.max(0.85, Math.min(1.75, prev + delta)).toFixed(2)));
  };

  // Compute Farm Owner Character standing/walking position
  const activeOwnerChar = ownerCharacter || DEFAULT_FARM_OWNER_CHARACTER;
  const targetTile =
    !readOnly && farmerTileIndex !== null && farmerTileIndex !== undefined
      ? tiles[farmerTileIndex]
      : undefined;
  const homeCottageTile = tiles.find((t) => t.buildingId === 'farm_cottage');
  const farmerIso = targetTile
    ? tileToIso(targetTile.row, targetTile.col, gridSize)
    : homeCottageTile
      ? tileToIso(homeCottageTile.row + 0.45, homeCottageTile.col - 0.15, gridSize)
      : tileToIso(1.65, 2.15, gridSize);
  const farmerX = farmerIso.x + (targetTile ? -14 * spriteScale : 0);
  const farmerY = farmerIso.y + halfH + (targetTile ? 4 * spriteScale : 8 * spriteScale);
  const shortOwnerLabel = (ownerName || (lang === 'th' ? 'เจ้าของฟาร์ม' : 'Farmer')).split(' ')[0].slice(0, 12);

  return (
    <div
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
      onWheel={handleWheelZoom}
      className={
        fullscreenLandscape
          ? 'relative w-full h-full flex items-center justify-center select-none overflow-hidden bg-gradient-to-br from-[#8be028] via-[#6dc519] to-[#52a610] touch-none'
          : 'relative w-full select-none overflow-hidden rounded-2xl border-2 border-[#65a30d] bg-gradient-to-br from-[#8be028] via-[#6dc519] to-[#52a610] shadow-inner'
      }
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .farm-harvest-bounce {
            animation: farmBounce 1.8s ease-in-out infinite;
          }
          .farm-animal-bob {
            animation: farmAnimalBob 2.4s ease-in-out infinite;
          }
          .farm-float-up {
            animation: farmFloatUp 1.15s ease-out forwards;
          }
          .farm-truck-drive {
            animation: farmTruckDrive 1.15s ease-in-out;
          }
          .farm-smoke-rise {
            animation: farmSmokeRise 3.4s ease-in-out infinite;
          }
          .farm-butterfly-flutter {
            animation: farmButterfly 4.5s ease-in-out infinite;
          }
          .farm-cloud-drift {
            animation: farmCloudDrift 26s linear infinite;
          }
        }
        @keyframes farmBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes farmAnimalBob {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(1.5px, -1.5px); }
        }
        @keyframes farmFloatUp {
          0% { opacity: 0; transform: translateY(4px) scale(0.92); }
          20% { opacity: 1; transform: translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateY(-32px) scale(1.04); }
        }
        @keyframes farmTruckDrive {
          0% { transform: translate(0, 0); }
          45% { transform: translate(55px, -22px); opacity: 0.72; }
          55% { transform: translate(-24px, 10px); opacity: 0.9; }
          100% { transform: translate(0, 0); opacity: 1; }
        }
        @keyframes farmSmokeRise {
          0% { opacity: 0.25; transform: translateY(0) scale(0.9); }
          50% { opacity: 0.7; transform: translateY(-6px) scale(1.1); }
          100% { opacity: 0.15; transform: translateY(-12px) scale(1.25); }
        }
        @keyframes farmButterfly {
          0%, 100% { transform: translate(0, 0) rotate(-4deg); }
          25% { transform: translate(10px, -7px) rotate(6deg); }
          50% { transform: translate(18px, 2px) rotate(-3deg); }
          75% { transform: translate(7px, 6px) rotate(5deg); }
        }
        @keyframes farmCloudDrift {
          0% { transform: translateX(-30px); }
          50% { transform: translateX(30px); }
          100% { transform: translateX(-30px); }
        }
      `}</style>

      {/* Camera Zoom Controls (Fullscreen Mode) */}
      {fullscreenLandscape && !readOnly && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-2.5 top-24 z-20 hidden sm:flex flex-col gap-1 rounded-2xl border-2 border-[#78350f] bg-[#fffbeb]/90 p-1 shadow-[0_3px_0_#78350f]"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Number(Math.min(1.75, z + 0.15).toFixed(2)))}
            aria-label="Zoom In"
            className="w-7 h-7 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#451a03] font-black text-sm flex items-center justify-center cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            aria-label="Reset Camera"
            className="w-7 h-7 rounded-xl bg-white hover:bg-amber-100 text-[#78350f] font-black text-[10px] flex items-center justify-center cursor-pointer"
          >
            1×
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Number(Math.max(0.85, z - 0.15).toFixed(2)))}
            aria-label="Zoom Out"
            className="w-7 h-7 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#451a03] font-black text-sm flex items-center justify-center cursor-pointer"
          >
            −
          </button>
        </div>
      )}

      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: fullscreenLandscape ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` : undefined,
          transition: dragStateRef.current.active ? 'none' : 'transform 160ms ease-out',
        }}
      >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        className={fullscreenLandscape ? 'w-full h-full block touch-manipulation' : 'w-full h-auto max-h-[560px] block touch-manipulation'}
        role="img"
        aria-label={lang === 'th' ? 'แผนที่ฟาร์มและเมืองโรงเรียนแบบ Hay Day' : 'Hay Day style school farm map'}
      >
        <defs>
          <radialGradient id="haydayMeadow" cx="50%" cy="48%" r="65%">
            <stop offset="0%" stopColor="#9bec3b" />
            <stop offset="65%" stopColor="#72cb1a" />
            <stop offset="100%" stopColor="#52a50f" />
          </radialGradient>
          <linearGradient id="haydayDirtRoad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b86624" />
            <stop offset="50%" stopColor="#cf7c34" />
            <stop offset="100%" stopColor="#a65a1c" />
          </linearGradient>
        </defs>

        {/* Full Sunlit Hay Day Spring Meadow Backdrop */}
        <rect x="-140" y="-80" width="1080" height="660" fill="url(#haydayMeadow)" />

        {/* Soft Sunlit Grass Patches & Golden Meadow Highlights */}
        <ellipse cx="145" cy="145" rx="105" ry="48" fill="#bef264" opacity="0.32" />
        <ellipse cx="660" cy="180" rx="110" ry="56" fill="#bef264" opacity="0.28" />
        <ellipse cx="320" cy="430" rx="145" ry="52" fill="#a3e635" opacity="0.35" />

        {/* Soft Drifting Cloud Shadows over the Valley */}
        <g className="farm-cloud-drift" opacity="0.14" pointerEvents="none">
          <ellipse cx="180" cy="48" rx="70" ry="18" fill="#ffffff" />
          <ellipse cx="620" cy="64" rx="85" ry="20" fill="#ffffff" />
        </g>

        {/* Upper-Left Fruit Orchard (Lemon & Apple Trees matching Hay Day screenshot) */}
        <g transform="translate(68, 108)">
          <ellipse cx="0" cy="20" rx="22" ry="8" fill="#3f6212" opacity="0.26" />
          <rect x="-4" y="8" width="8" height="16" rx="2" fill="#78350f" />
          <circle cx="0" cy="-6" r="19" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          <circle cx="-11" cy="-1" r="12" fill="#4ade80" />
          <circle cx="11" cy="-2" r="12" fill="#16a34a" />
          <circle cx="-7" cy="-10" r="2.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
          <circle cx="6" cy="-7" r="2.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
          <circle cx="0" cy="-1" r="2.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
          <circle cx="-4" cy="4" r="2.5" fill="#fde047" />
        </g>
        <g transform="translate(132, 82)">
          <ellipse cx="0" cy="16" rx="18" ry="6" fill="#3f6212" opacity="0.24" />
          <rect x="-3" y="6" width="6" height="12" rx="2" fill="#78350f" />
          <circle cx="0" cy="-4" r="15" fill="#16a34a" stroke="#14532d" strokeWidth="1.4" />
          <circle cx="-6" cy="-7" r="7" fill="#4ade80" opacity="0.7" />
          <circle cx="5" cy="-6" r="2.4" fill="#ef4444" />
          <circle cx="-5" cy="-3" r="2.4" fill="#ef4444" />
          <circle cx="2" cy="1" r="2.4" fill="#ef4444" />
        </g>
        <g transform="translate(54, 178)">
          <ellipse cx="0" cy="16" rx="18" ry="6" fill="#3f6212" opacity="0.24" />
          <rect x="-3" y="6" width="6" height="12" rx="2" fill="#78350f" />
          <circle cx="0" cy="-4" r="15" fill="#22c55e" stroke="#14532d" strokeWidth="1.4" />
          <circle cx="5" cy="-6" r="2.6" fill="#fde047" />
          <circle cx="-5" cy="-2" r="2.6" fill="#fde047" />
        </g>

        {/* Purple Lavender Rows & Rustic Wooden Split-Rail Fence (Left Slope like Hay Day!) */}
        <g transform="translate(160, 154)" opacity="0.92">
          <path d="M-28 0 L34 -28" stroke="#7c3aed" strokeWidth="7" strokeLinecap="round" />
          <path d="M-28 0 L34 -28" stroke="#c084fc" strokeWidth="3.5" strokeDasharray="3 5" strokeLinecap="round" />
          <path d="M-18 11 L44 -17" stroke="#6d28d9" strokeWidth="7" strokeLinecap="round" />
          <path d="M-18 11 L44 -17" stroke="#d8b4fe" strokeWidth="3.5" strokeDasharray="3 5" strokeLinecap="round" />
        </g>

        {/* Clickable Hobbit-Style Farm Pantry / Barn Root Cellar (Left Meadow) */}
        <g
          transform="translate(86, 260)"
          role={!readOnly && onOpenBarn ? 'button' : undefined}
          tabIndex={!readOnly && onOpenBarn ? 0 : -1}
          aria-label={lang === 'th' ? 'เปิดโรงนาและคลังเก็บพืชผล' : 'Open Barn & Pantry Storage'}
          onClick={() => {
            if (!readOnly) onOpenBarn?.();
          }}
          className={!readOnly && onOpenBarn ? 'cursor-pointer group' : ''}
        >
          <ellipse cx="0" cy="18" rx="38" ry="13" fill="#3f6212" opacity="0.3" />
          {/* Stone pavers leading out */}
          <ellipse cx="-26" cy="24" rx="7" ry="3.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.9" />
          <ellipse cx="-10" cy="28" rx="7" ry="3.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.9" />
          {/* Sod roof mound */}
          <path d="M-30 10 C-30 -20 30 -20 30 10 Z" fill="#65a30d" stroke="#365314" strokeWidth="1.5" />
          <path d="M-24 10 C-24 -13 24 -13 24 10 Z" fill="#a16207" stroke="#78350f" strokeWidth="1.2" />
          {/* Pink heart door */}
          <path d="M5 10 V-4 C5 -12 20 -12 20 -4 V10 Z" fill="#ec4899" stroke="#831843" strokeWidth="1.3" />
          <circle cx="12.5" cy="-1" r="2.2" fill="#fbcfe8" />
          {/* Crates & blue watering can */}
          <rect x="-26" y="3" width="18" height="11" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="1.2" />
          <circle cx="-21" cy="2" r="3.2" fill="#ef4444" />
          <circle cx="-14" cy="2" r="3.2" fill="#f97316" />
          <rect x="23" y="4" width="7" height="7" rx="2" fill="#0284c7" stroke="#0c4a6e" strokeWidth="1" />
          {/* Tiny roof daisies */}
          <circle cx="-11" cy="-13" r="2.6" fill="#ffffff" />
          <circle cx="4" cy="-16" r="2.6" fill="#fef08a" />
          <circle cx="15" cy="-11" r="2.4" fill="#ffffff" />
          {!readOnly && (
            <g transform="translate(0, -25)">
              <rect x="-24" y="-8" width="48" height="14" rx="7" fill="#78350f" fillOpacity="0.88" stroke="#fde68a" strokeWidth="1" />
              <text x="0" y="1.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fef3c7">
                โรงนา/คลัง
              </text>
            </g>
          )}
        </g>

        {/* Diagonal Hay Day Amber Dirt Road Across Foreground + Wheel Ruts */}
        <path
          d="M -50 474 Q 220 444 465 360 T 860 182"
          fill="none"
          stroke="#e7c68e"
          strokeWidth="46"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M -50 474 Q 220 444 465 360 T 860 182"
          fill="none"
          stroke="url(#haydayDirtRoad)"
          strokeWidth="36"
          strokeLinecap="round"
        />
        <path
          d="M -30 472 Q 220 442 465 358 T 840 182"
          fill="none"
          stroke="#92400e"
          strokeWidth="2"
          strokeDasharray="10 12"
          opacity="0.35"
        />
        {/* Side branch road toward Upper Order Board & Farmhouse */}
        <path
          d="M 550 92 Q 665 130 795 215"
          fill="none"
          stroke="#d99a5b"
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.82"
        />

        {/* Golden Wheat Sheaves & Brick Dome Bakery Area (Right Meadow) */}
        <g transform="translate(716, 265)" opacity="0.95">
          <ellipse cx="0" cy="8" rx="34" ry="12" fill="#a16207" opacity="0.25" />
          <path d="M-24 6 Q-22 -14 -18 -18 M-16 6 Q-14 -16 -10 -20 M-8 6 Q-6 -14 -2 -18" stroke="#facc15" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M4 8 Q6 -12 10 -16 M12 8 Q14 -14 18 -18 M20 8 Q22 -12 26 -16" stroke="#eab308" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </g>

        {/* Blooming Rose & Cobble Paver Garden (Bottom-Right Foreground like Hay Day Screenshot) */}
        <g transform="translate(560, 424)">
          <ellipse cx="-24" cy="6" rx="8" ry="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="0" cy="14" rx="8" ry="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="26" cy="4" rx="8" ry="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="-6" cy="-4" rx="14" ry="8" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
          <circle cx="-11" cy="-6" r="3.4" fill="#fb7185" />
          <circle cx="-2" cy="-8" r="3.4" fill="#f43f5e" />
          <circle cx="4" cy="-3" r="3.2" fill="#fda4af" />
          <ellipse cx="32" cy="-10" rx="13" ry="7.5" fill="#15803d" stroke="#14532d" strokeWidth="1.2" />
          <circle cx="28" cy="-12" r="3.2" fill="#f43f5e" />
          <circle cx="37" cy="-9" r="3.2" fill="#fb7185" />
        </g>

        {/* Animated Butterflies Fluttering Above Flowers */}
        <g transform="translate(555, 395)" className="farm-butterfly-flutter pointer-events-none">
          <ellipse cx="-2" cy="0" rx="2.8" ry="1.8" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" />
          <ellipse cx="2" cy="0" rx="2.8" ry="1.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
        </g>
        <g transform="translate(172, 130)" className="farm-butterfly-flutter pointer-events-none" style={{ animationDelay: '1.6s' }}>
          <ellipse cx="-2" cy="0" rx="2.6" ry="1.6" fill="#fbcfe8" stroke="#be185d" strokeWidth="0.6" />
          <ellipse cx="2" cy="0" rx="2.6" ry="1.6" fill="#f472b6" stroke="#be185d" strokeWidth="0.6" />
        </g>

        {/* Interactive Duck Pond with Wooden Arched Footbridge (Bottom Center Foreground) */}
        <g
          transform="translate(362, 442)"
          role={onAnimalTap ? 'button' : undefined}
          tabIndex={onAnimalTap ? 0 : -1}
          aria-label={lang === 'th' ? 'บ่อเป็ดและสะพานไม้' : 'Duck Pond'}
          onClick={() => {
            setPondRipple(true);
            setTimeout(() => setPondRipple(false), 750);
            onAnimalTap?.('duck');
          }}
          className={onAnimalTap ? 'cursor-pointer' : ''}
        >
          <ellipse cx="0" cy="0" rx="56" ry="23" fill="#38bdf8" stroke="#65a30d" strokeWidth="3.5" />
          <ellipse cx="-6" cy="-2" rx="42" ry="15" fill="#0ea5e9" opacity="0.58" />
          {pondRipple && (
            <ellipse cx="-12" cy="4" rx="18" ry="7" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.85" />
          )}
          {/* Wooden bridge */}
          <path d="M-25 -6 Q0 -19 25 4" fill="none" stroke="#78350f" strokeWidth="11" strokeLinecap="round" />
          <path d="M-25 -6 Q0 -19 25 4" fill="none" stroke="#d97706" strokeWidth="7.5" strokeLinecap="round" />
          {/* Cute swimming ducks */}
          <g className="farm-animal-bob">
            <ellipse cx="-25" cy="4" rx="5.5" ry="3.4" fill="#15803d" />
            <circle cx="-20.5" cy="0.5" r="2.6" fill="#166534" />
            <polygon points="-18,0.5 -15,1.2 -18,2" fill="#facc15" />
            <ellipse cx="26" cy="-5" rx="4.8" ry="3" fill="#15803d" />
            <circle cx="29.5" cy="-7.5" r="2.2" fill="#166534" />
          </g>
          {/* Cattails & pink lotus blossoms */}
          <circle cx="-48" cy="-4" r="3.4" fill="#f472b6" />
          <circle cx="46" cy="6" r="3.4" fill="#f472b6" />
          <circle cx="14" cy="11" r="2.8" fill="#fbcfe8" />
        </g>

        {/* Ornamental Berry Hedge Row */}
        <g transform="translate(650, 294)">
          <ellipse cx="0" cy="0" rx="30" ry="13" fill="#15803d" stroke="#14532d" strokeWidth="1.3" />
          <circle cx="-12" cy="-2" r="2.5" fill="#be123c" />
          <circle cx="0" cy="-4" r="2.5" fill="#be123c" />
          <circle cx="12" cy="1" r="2.5" fill="#be123c" />
        </g>

        {/* Hay Day Clickable Lucky Spin Wheel Wagon (Beside the Upper Road) */}
        {!readOnly && onOpenWheel && (
          <g
            transform="translate(558, 102)"
            role="button"
            tabIndex={0}
            aria-label={lang === 'th' ? 'วงล้อนำโชคประจำวัน' : 'Daily Lucky Spin Wheel'}
            onClick={() => onOpenWheel()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenWheel();
              }
            }}
            className="cursor-pointer group"
          >
            <ellipse cx="0" cy="16" rx="22" ry="7" fill="#3f6212" opacity="0.28" />
            <rect x="-14" y="2" width="28" height="12" rx="3" fill="#92400e" stroke="#451a03" strokeWidth="1.2" />
            <circle cx="-10" cy="14" r="4.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
            <circle cx="10" cy="14" r="4.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
            <circle cx="0" cy="-11" r="14" fill="#facc15" stroke="#78350f" strokeWidth="1.6" />
            <path d="M0 -11 L0 -25 A14 14 0 0 1 14 -11 Z" fill="#ef4444" />
            <path d="M0 -11 L14 -11 A14 14 0 0 1 0 3 Z" fill="#38bdf8" />
            <path d="M0 -11 L0 3 A14 14 0 0 1 -14 -11 Z" fill="#22c55e" />
            <circle cx="0" cy="-11" r="4" fill="#ffffff" stroke="#78350f" strokeWidth="1.2" />
            <polygon points="0,-28 -3,-22 3,-22" fill="#f97316" stroke="#7c2d12" strokeWidth="1" />
            <rect x="-24" y="-42" width="48" height="14" rx="7" fill={spinAvailable ? '#e11d48' : '#78350f'} stroke="#ffffff" strokeWidth="1.1" />
            <text x="0" y="-32.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff">
              {spinAvailable ? 'หมุนฟรี!' : 'วงล้อ'}
            </text>
          </g>
        )}

        {/* Hay Day Clickable Delivery Truck + Order Board (Upper-Right Road) */}
        {!readOnly && (
          <g
            transform="translate(685, 162)"
            role={onOpenMarket ? 'button' : undefined}
            tabIndex={onOpenMarket ? 0 : -1}
            aria-label={lang === 'th' ? 'เปิดรถบรรทุกส่งออเดอร์ตลาด' : 'Open delivery truck orders'}
            onClick={() => onOpenMarket?.()}
            onKeyDown={(e) => {
              if (onOpenMarket && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onOpenMarket();
              }
            }}
            className={onOpenMarket ? 'cursor-pointer group' : ''}
          >
            {/* Order Board Signpost */}
            <g transform="translate(-48, 0)">
              <rect x="-2" y="-4" width="4" height="22" fill="#78350f" />
              <rect x="-18" y="-26" width="36" height="24" rx="3" fill="#fef3c7" stroke="#92400e" strokeWidth="1.6" />
              <rect x="-13" y="-22" width="7" height="7" fill="#ffffff" stroke="#d97706" strokeWidth="0.8" />
              <rect x="-3" y="-22" width="7" height="7" fill="#ffffff" stroke="#16a34a" strokeWidth="0.8" />
              <rect x="7" y="-22" width="7" height="7" fill="#ffffff" stroke="#d97706" strokeWidth="0.8" />
              <text x="0" y="-6" textAnchor="middle" fontSize="8" fontWeight="900" fill="#78350f">
                {ordersCount} ออเดอร์
              </text>
            </g>

            {/* Red & Green Hay Day Truck */}
            <g className={truckAnimating ? 'farm-truck-drive' : 'group-hover:opacity-90 transition-opacity'}>
              <ellipse cx="14" cy="12" rx="28" ry="8" fill="#4d7c0f" opacity="0.3" />
              <rect x="-10" y="-16" width="30" height="20" rx="3" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
              <rect x="-6" y="-12" width="22" height="12" rx="1.5" fill="#d97706" opacity="0.75" />
              <path d="M20 -12 L33 -12 L39 -2 L39 4 L20 4 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
              <polygon points="22,-9 31,-9 35,-2 22,-2" fill="#bae6fd" stroke="#0369a1" strokeWidth="1" />
              <circle cx="2" cy="6" r="5.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.6" />
              <circle cx="30" cy="6" r="5.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.6" />
              <rect x="-10" y="-33" width="48" height="15" rx="7.5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.2" />
              <text x="14" y="-22.5" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#ffffff">
                รถส่งของ
              </text>
            </g>
          </g>
        )}

        {/* Isometric Meadow Farm Perimeter Shadow */}
        <polygon
          points={`${originX},${originY - 12} ${originX + gridSize * halfW + 18},${originY + gridSize * halfH} ${originX},${originY + gridSize * tileH + 16} ${originX - gridSize * halfW - 18},${originY + gridSize * halfH}`}
          fill="#4d7c0f"
          fillOpacity="0.22"
        />

        {orderedTiles.map((tile) => {
          const { x, y } = tileToIso(tile.row, tile.col, gridSize);
          const isSelected = selectedTileIndex === tile.index;
          const isCrop = tile.kind === 'crop' && tile.cropId;
          const cropDef = isCrop && tile.cropId ? CROP_MAP[tile.cropId] : null;
          const growth = tile.growthProgress || 0;
          const isReadyCrop = Boolean(cropDef && growth >= cropDef.watersNeeded);
          const isBuilding = tile.kind === 'building' && tile.buildingId;
          const buildingDef = isBuilding && tile.buildingId ? BUILDING_MAP[tile.buildingId] : null;
          const buildingYieldReady = Boolean(
            isBuilding &&
              buildingDef &&
              (buildingDef.dailyCoins > 0 || buildingDef.dailyFertilizer) &&
              tile.lastCollectedDate !== todayDate
          );
          const isWeed = tile.kind === 'weed';
          const isTilled = Boolean(tile.tilled);
          const isNeighborWaterable = Boolean(
            allowNeighborCropWater && isCrop && cropDef && growth < cropDef.watersNeeded
          );
          const canInteract = !readOnly || isNeighborWaterable;

          let topFill = '#6dc519';
          let leftEdge = '#55a610';
          let rightEdge = '#43850c';
          let strokeColor = '#3f7c0c';

          if (tile.unlocked) {
            if (isBuilding && tile.buildingId === 'cobble_path') {
              topFill = '#cbd5e1';
              leftEdge = '#94a3b8';
              rightEdge = '#64748b';
              strokeColor = '#475569';
            } else if (isBuilding && (tile.buildingId === 'wooden_fence' || tile.buildingId === 'sheep_pen')) {
              topFill = '#9ce635';
              leftEdge = '#65a30d';
              rightEdge = '#4d7c0f';
              strokeColor = '#3f6212';
            } else if (isBuilding) {
              topFill = '#9ae236';
              leftEdge = '#65a30d';
              rightEdge = '#4d7c0f';
              strokeColor = '#4d7c0f';
            } else if (isWeed) {
              topFill = '#854d0e';
              leftEdge = '#713f12';
              rightEdge = '#451a03';
              strokeColor = '#7f1d1d';
            } else if (!isTilled && tile.kind === 'empty') {
              topFill = '#8ce228';
              leftEdge = '#65a30d';
              rightEdge = '#4d7c0f';
              strokeColor = '#4d7c0f';
            } else if (tile.wateredToday) {
              // Rich dark moist Hay Day soil
              topFill = '#6d3915';
              leftEdge = '#542a0d';
              rightEdge = '#3f1e08';
              strokeColor = tile.fertilized ? '#facc15' : '#451a03';
            } else {
              // Warm furrowed Hay Day soil
              topFill = '#a1622a';
              leftEdge = '#854d1e';
              rightEdge = '#6b3b14';
              strokeColor = '#5c3310';
            }
          }

          const topPts = `${x},${y} ${x + halfW},${y + halfH} ${x},${y + tileH} ${x - halfW},${y + halfH}`;
          const leftPts = `${x - halfW},${y + halfH} ${x},${y + tileH} ${x},${y + tileH + blockDepth} ${x - halfW},${y + halfH + blockDepth}`;
          const rightPts = `${x},${y + tileH} ${x + halfW},${y + halfH} ${x + halfW},${y + halfH + blockDepth} ${x},${y + tileH + blockDepth}`;

          const centerX = x;
          const centerY = y + halfH;

          const ariaTileLabel = !tile.unlocked
            ? (lang === 'th' ? `แปลงที่ ${tile.index + 1} ยังไม่ปลดล็อก (ใช้ ${nextUnlockCost} ดาว)` : `Locked plot ${tile.index + 1}`)
            : isWeed
              ? (lang === 'th' ? `แปลงที่ ${tile.index + 1} มี${tile.weedVariant === 'pest' ? 'แมลงศัตรูพืช' : 'วัชพืช'}` : `Weed/pest on plot ${tile.index + 1}`)
              : isCrop && cropDef
                ? `${lang === 'th' ? cropDef.nameTh : cropDef.nameEn} (${growth}/${cropDef.watersNeeded})`
                : isBuilding && buildingDef
                  ? (lang === 'th' ? buildingDef.nameTh : buildingDef.nameEn)
                  : isTilled
                    ? (lang === 'th' ? `แปลงดินขุดแล้วที่ ${tile.index + 1}` : `Tilled plot ${tile.index + 1}`)
                    : (lang === 'th' ? `สนามหญ้าว่างที่ ${tile.index + 1}` : `Grass plot ${tile.index + 1}`);

          return (
            <g
              key={tile.index}
              data-farm-tile-index={tile.index}
              role={canInteract ? 'button' : undefined}
              tabIndex={canInteract ? 0 : -1}
              aria-label={ariaTileLabel}
              onClick={() => {
                if (dragStateRef.current.moved) return;
                if (canInteract) onTileActivate(tile.index);
              }}
              onKeyDown={(e) => {
                if (canInteract && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onTileActivate(tile.index);
                }
              }}
              className={canInteract ? 'cursor-pointer group focus:outline-none' : 'cursor-default'}
            >
              <polygon points={leftPts} fill={leftEdge} />
              <polygon points={rightPts} fill={rightEdge} />
              <polygon
                points={topPts}
                fill={topFill}
                stroke={isSelected ? '#fde047' : isNeighborWaterable ? '#0ea5e9' : strokeColor}
                strokeWidth={isSelected ? 3 : isNeighborWaterable ? 2 : 1.2}
                className="transition-opacity group-hover:opacity-90"
              />

              {tile.unlocked && isTilled && !isBuilding && !isWeed && (
                <g opacity="0.45" stroke="#3f1e08" strokeWidth="1.4">
                  <line x1={x - 16 * spriteScale} y1={centerY - 3} x2={x + 7 * spriteScale} y2={centerY + 8 * spriteScale} />
                  <line x1={x - 7 * spriteScale} y1={centerY - 8 * spriteScale} x2={x + 16 * spriteScale} y2={centerY + 3} />
                </g>
              )}

              {tile.unlocked && !isTilled && tile.kind === 'empty' && (
                <g transform={`translate(${centerX}, ${centerY}) scale(${spriteScale})`} opacity="0.55" fill="#3f6212">
                  <circle cx="-8" cy="1" r="2" />
                  <circle cx="-5" cy="-1" r="1.8" />
                  <circle cx="9" cy="-2" r="2" />
                </g>
              )}

              {!tile.unlocked && (
                <g transform={`translate(${centerX}, ${centerY}) scale(${spriteScale})`} opacity="0.82">
                  <line x1="-14" y1="2" x2="14" y2="-8" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="-11" cy="2" r="2.5" fill="#92400e" />
                  <circle cx="11" cy="-7" r="2.5" fill="#92400e" />
                  {(activeTool === 'unlock' || isSelected) && (
                    <g transform="translate(0, -10)">
                      <rect x="-17" y="-9" width="34" height="16" rx="6" fill="#0f172a" fillOpacity="0.85" />
                      <text x="0" y="2" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fde047">
                        {nextUnlockCost}★
                      </text>
                    </g>
                  )}
                </g>
              )}

              {(tile.fertilized || (tile.growthSpeedMultiplier || 1) >= 2) && (
                <g transform={`translate(${centerX}, ${centerY}) scale(${spriteScale})`}>
                  <circle cx="-18" cy="-3" r="2.4" fill="#fde047" />
                  <circle cx="18" cy="1" r="2.4" fill="#fde047" />
                </g>
              )}

              {isWeed && (
                <g transform={`translate(${centerX}, ${centerY}) scale(${spriteScale})`}>
                  {tile.weedVariant === 'pest' ? (
                    <>
                      <ellipse cx="0" cy="-3" rx="10" ry="6" fill="#65a30d" stroke="#365314" strokeWidth="1.1" />
                      <circle cx="-6" cy="-5" r="4" fill="#be123c" stroke="#881337" strokeWidth="1" />
                      <circle cx="0" cy="-6" r="4" fill="#e11d48" stroke="#881337" strokeWidth="1" />
                      <circle cx="6" cy="-4" r="4" fill="#be123c" stroke="#881337" strokeWidth="1" />
                      <circle cx="-7.5" cy="-6" r="1" fill="#ffffff" />
                    </>
                  ) : (
                    <path d="M-12 2 L-16 -10 L-7 -2 L-4 -14 L1 -2 L8 -13 L10 -1 L16 -8 L13 3 Z" fill="#581c87" stroke="#3b0764" strokeWidth="1.2" />
                  )}
                  <circle cx="0" cy="-19" r="7" fill="#dc2626" stroke="#ffffff" strokeWidth="1.2" />
                  <text x="0" y="-15.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff">!</text>
                </g>
              )}

              {isCrop && cropDef && tile.cropId && (
                <>
                  {renderCropArt(
                    tile.cropId,
                    growth / Math.max(1, cropDef.watersNeeded),
                    isReadyCrop,
                    centerX,
                    centerY,
                    spriteScale
                  )}
                  {!isReadyCrop && (tile.fertilized || (tile.growthSpeedMultiplier || 1) >= 2 || hasGoldenStreakBuff) && (
                    <g transform={`translate(${centerX - 15 * spriteScale}, ${centerY - 17 * spriteScale})`}>
                      <rect x="-9" y="-6" width="18" height="12" rx="6" fill="#facc15" stroke="#78350f" strokeWidth="1" />
                      <text x="0" y="2.5" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#451a03">
                        ×2
                      </text>
                    </g>
                  )}
                  {isReadyCrop && !readOnly && (
                    <g transform={`translate(${centerX}, ${centerY - 29 * spriteScale})`} className="farm-harvest-bounce">
                      <rect x="-14" y="-9" width="28" height="16" rx="8" fill="#16a34a" stroke="#ffffff" strokeWidth="1.4" />
                      <text x="0" y="2" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff">
                        {lang === 'th' ? 'เก็บ!' : 'Pick'}
                      </text>
                    </g>
                  )}
                  {!isReadyCrop && (!tile.wateredToday || isNeighborWaterable) && (
                    <g transform={`translate(${centerX + 13 * spriteScale}, ${centerY - 16 * spriteScale})`}>
                      <circle cx="0" cy="0" r="6.8" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
                      <path d="M0 -3.5 C2 -0.5 3 1 3 2.2 A3 3 0 0 1 -3 2.2 C-3 1 -2 -0.5 0 -3.5 Z" fill="#e0f2fe" />
                    </g>
                  )}
                </>
              )}

              {isBuilding && (
                <>
                  {renderBuildingArt(tile.buildingId, tile.buildingLevel || 1, centerX, centerY, spriteScale)}
                  {(tile.buildingLevel || 1) > 1 && (
                    <g transform={`translate(${centerX - 18 * spriteScale}, ${centerY - 22 * spriteScale})`}>
                      <rect x="-11" y="-7" width="22" height="13" rx="6" fill="#1e293b" stroke="#facc15" strokeWidth="1" />
                      <text x="0" y="2.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fde047">
                        Lv.{tile.buildingLevel}
                      </text>
                    </g>
                  )}
                  {buildingYieldReady && !readOnly && (
                    <g transform={`translate(${centerX}, ${centerY - 35 * spriteScale})`} className="farm-harvest-bounce">
                      <rect x="-15" y="-9" width="30" height="16" rx="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.4" />
                      <text x="0" y="2" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff">
                        +🪙
                      </text>
                    </g>
                  )}
                </>
              )}

              {isSelected && (
                <polygon
                  points={topPts}
                  fill="#fde047"
                  fillOpacity="0.22"
                  stroke="#fde047"
                  strokeWidth="2.8"
                />
              )}
            </g>
          );
        })}

        {/* Hay Day Roadside Shop Stand + Produce Crates + Mailbox (Bottom-Left Road) */}
        {!readOnly && (
          <g
            transform="translate(115, 412)"
            role={onOpenShop ? 'button' : undefined}
            tabIndex={onOpenShop ? 0 : -1}
            aria-label={lang === 'th' ? 'เปิดแผงร้านค้าริมทาง' : 'Open roadside shop'}
            onClick={() => onOpenShop?.()}
            onKeyDown={(e) => {
              if (onOpenShop && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onOpenShop();
              }
            }}
            className={onOpenShop ? 'cursor-pointer group' : ''}
          >
            {/* Silver farm mailbox (click opens Study Mail Quiz!) */}
            <g
              transform="translate(58, 12)"
              onClick={(e) => {
                if (onOpenMail) {
                  e.stopPropagation();
                  onOpenMail();
                }
              }}
              className={onOpenMail ? 'cursor-pointer' : ''}
            >
              <rect x="-1.5" y="0" width="3" height="12" fill="#78350f" />
              <rect x="-6" y="-8" width="12" height="8" rx="3" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
              <rect x="3" y="-12" width="2" height="6" fill="#ef4444" />
            </g>
            <ellipse cx="0" cy="14" rx="36" ry="8" fill="#4d7c0f" opacity="0.28" />
            <rect x="-28" y="-4" width="56" height="17" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="1.4" />
            <line x1="-24" y1="-4" x2="-24" y2="-23" stroke="#78350f" strokeWidth="2.6" />
            <line x1="24" y1="-4" x2="24" y2="-23" stroke="#78350f" strokeWidth="2.6" />
            {/* Iconic Red & White Striped Canopy */}
            <polygon points="-34,-21 34,-21 28,-36 -28,-36" fill="#ef4444" stroke="#991b1b" strokeWidth="1.4" />
            <polygon points="-17,-21 -5,-21 -3,-36 -14,-36" fill="#ffffff" />
            <polygon points="7,-21 19,-21 15,-36 5,-36" fill="#ffffff" />
            <circle cx="-11" cy="-7" r="4.2" fill="#facc15" stroke="#a16207" strokeWidth="1" />
            <circle cx="0" cy="-7" r="4.2" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
            <circle cx="11" cy="-7" r="4.2" fill="#fb923c" stroke="#9a3412" strokeWidth="1" />
            <rect x="-34" y="15" width="68" height="16" rx="8" fill="#b45309" stroke="#ffffff" strokeWidth="1.2" />
            <text x="0" y="26" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#ffffff">
              แผงริมทาง ({roadsideCount})
            </text>
          </g>
        )}

        {/* Hay Day NPC Visitors Along Front Road (Right Foreground) */}
        {!readOnly && visitors.length > 0 && (
          <g
            transform="translate(650, 365)"
            role={onOpenVisitors ? 'button' : undefined}
            tabIndex={onOpenVisitors ? 0 : -1}
            aria-label={lang === 'th' ? 'คุยกับชาวบ้านผู้มาเยือนฟาร์ม' : 'Talk to farm visitors'}
            onClick={() => onOpenVisitors?.()}
            onKeyDown={(e) => {
              if (onOpenVisitors && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onOpenVisitors();
              }
            }}
            className={onOpenVisitors ? 'cursor-pointer group' : ''}
          >
            {visitors.slice(0, 2).map((vis, idx) => {
              const ox = idx === 0 ? -24 : 20;
              const shirt =
                vis.npcId === 'aunt_malee'
                  ? '#ec4899'
                  : vis.npcId === 'uncle_somchai'
                    ? '#0284c7'
                    : vis.npcId === 'teacher_dao'
                      ? '#7c3aed'
                      : '#10b981';
              const itemLabel =
                vis.itemKind === 'crop'
                  ? CROP_MAP[vis.itemId as CropId]?.nameTh
                  : PRODUCT_MAP[vis.itemId as ProductId]?.nameTh;
              return (
                <g key={vis.id} transform={`translate(${ox}, 0)`} className="farm-animal-bob" style={{ animationDelay: `${idx * 0.45}s` }}>
                  <ellipse cx="0" cy="14" rx="10" ry="3.5" fill="#4d7c0f" opacity="0.25" />
                  <rect x="-6.5" y="0" width="13" height="13" rx="4" fill={shirt} stroke="#1e293b" strokeWidth="1.1" />
                  <circle cx="0" cy="-9" r="7" fill="#fed7aa" stroke="#9a3412" strokeWidth="1.1" />
                  <circle cx="-2.3" cy="-9.5" r="1" fill="#1e293b" />
                  <circle cx="2.3" cy="-9.5" r="1" fill="#1e293b" />
                  <path d="M-2 -6.5 Q0 -5 2 -6.5" stroke="#9a3412" strokeWidth="1" fill="none" />
                  {vis.npcId === 'aunt_malee' && <circle cx="0" cy="-16.5" r="3.5" fill="#334155" />}
                  {vis.npcId === 'uncle_somchai' && (
                    <ellipse cx="0" cy="-14.5" rx="9" ry="2.8" fill="#f59e0b" stroke="#92400e" strokeWidth="1" />
                  )}
                  {idx === 0 && (
                    <g transform="translate(0, -34)">
                      <rect x="-38" y="-11" width="76" height="18" rx="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.3" />
                      <text x="0" y="1" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0f172a">
                        ขอซื้อ {itemLabel?.slice(0, 7)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            <rect x="-35" y="18" width="70" height="15" rx="7.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.2" />
            <text x="0" y="28.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#ffffff">
              ชาวบ้าน ({visitors.length})
            </text>
          </g>
        )}

        {/* Farm Name Signpost (Subtle bottom-center road sign if farmName passed in readOnly) */}
        {readOnly && farmName && (
          <g transform={`translate(${originX}, 26)`}>
            <rect x="-112" y="-14" width="224" height="24" rx="12" fill="#78350f" stroke="#fef3c7" strokeWidth="1.4" />
            <text x="0" y="2" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fef3c7">
              {farmName} · {gridSize}×{gridSize}
            </text>
          </g>
        )}

        {/* Living Farm Owner Character (glides smoothly between worked plots or stands by the farmhouse) */}
        <g
          style={{
            transform: `translate(${farmerX}px, ${farmerY}px)`,
            transition: 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          role={!readOnly && onOpenCharacter ? 'button' : undefined}
          tabIndex={!readOnly && onOpenCharacter ? 0 : -1}
          aria-label={lang === 'th' ? 'ตัวละครเจ้าของฟาร์ม (แตะเพื่อแต่งตัว)' : 'Farm owner character'}
          onClick={() => {
            if (!readOnly && onOpenCharacter) onOpenCharacter();
          }}
          onKeyDown={(e) => {
            if (!readOnly && onOpenCharacter && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onOpenCharacter();
            }
          }}
          className={!readOnly && onOpenCharacter ? 'cursor-pointer' : 'pointer-events-none'}
        >
          <g transform={`scale(${spriteScale * 1.06})`} className="farm-animal-bob">
            {/* Soft ground shadow */}
            <ellipse cx="0" cy="4" rx="12" ry="4.5" fill="#14532d" opacity="0.28" />

            {/* Boots */}
            <ellipse cx="-4.2" cy="2.5" rx="3.2" ry="2" fill="#78350f" stroke="#451a03" strokeWidth="1" />
            <ellipse cx="4.2" cy="2.5" rx="3.2" ry="2" fill="#78350f" stroke="#451a03" strokeWidth="1" />

            {/* Long back hair if girl preset */}
            {(activeOwnerChar.styleId === 'girl_farmer' || activeOwnerChar.styleId === 'gardener_girl') && (
              <path
                d="M-8 -18 C-10 -9 -8 -4 -4 -3 H4 C8 -4 10 -9 8 -18 Z"
                fill={activeOwnerChar.hairColor}
                stroke="#1e293b"
                strokeWidth="1"
              />
            )}

            {/* Shirt & Overalls / Skirt / Vest */}
            <rect x="-7.5" y="-13" width="15" height="14" rx="4.5" fill="#fffbeb" stroke="#451a03" strokeWidth="1.2" />
            {activeOwnerChar.styleId === 'girl_farmer' || activeOwnerChar.styleId === 'gardener_girl' ? (
              <path
                d="M-7.5 -9 L7.5 -9 L9.5 1.5 L-9.5 1.5 Z"
                fill={activeOwnerChar.outfitColor}
                stroke="#1e293b"
                strokeWidth="1.1"
              />
            ) : (
              <rect
                x="-7.5"
                y="-8.5"
                width="15"
                height="10"
                rx="3"
                fill={activeOwnerChar.outfitColor}
                stroke="#1e293b"
                strokeWidth="1.1"
              />
            )}
            {/* Straps or scholar tie */}
            {activeOwnerChar.styleId === 'scholar_farmer' ? (
              <polygon points="-1.5,-12 1.5,-12 1,-5 -1,-5" fill="#e11d48" />
            ) : (
              <>
                <rect x="-5.5" y="-13" width="2.5" height="6" fill={activeOwnerChar.outfitColor} />
                <rect x="3" y="-13" width="2.5" height="6" fill={activeOwnerChar.outfitColor} />
              </>
            )}

            {/* Left waving arm */}
            <path d="M-7.5 -10 C-12 -12 -13 -16 -10 -17" fill="none" stroke="#fed7aa" strokeWidth="3.2" strokeLinecap="round" />

            {/* Right arm + Active Farm Tool Prop */}
            <path d="M7.5 -10 L13 -7" fill="none" stroke="#fed7aa" strokeWidth="3.2" strokeLinecap="round" />
            {!readOnly && activeTool === 'water' ? (
              <g transform="translate(14, -7)">
                <rect x="-3" y="-3" width="7" height="6" rx="1.5" fill="#0284c7" stroke="#0c4a6e" strokeWidth="1" />
                <line x1="4" y1="-1" x2="8" y2="-4" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            ) : !readOnly && (activeTool === 'till' || activeTool === 'clear_weed') ? (
              <g transform="translate(14, -8)">
                <line x1="-2" y1="6" x2="4" y2="-8" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <polygon points="2,-9 8,-10 7,-5" fill="#94a3b8" stroke="#334155" strokeWidth="0.9" />
              </g>
            ) : !readOnly && (activeTool === 'plant' || activeTool === 'fertilize' || activeTool === 'daily_fertilize') ? (
              <g transform="translate(13, -7)">
                <rect
                  x="-3"
                  y="-4"
                  width="6"
                  height="8"
                  rx="1.5"
                  fill={activeTool === 'fertilize' ? '#facc15' : activeTool === 'daily_fertilize' ? '#22c55e' : '#fef08a'}
                  stroke="#78350f"
                  strokeWidth="1"
                />
              </g>
            ) : !readOnly && activeTool === 'build' ? (
              <g transform="translate(14, -8)">
                <line x1="-1" y1="5" x2="4" y2="-6" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
                <rect x="1" y="-8" width="6" height="3.5" rx="1" fill="#d97706" stroke="#451a03" strokeWidth="0.9" />
              </g>
            ) : (
              /* Cute wicker harvest basket by default / neighbor visit */
              <g transform="translate(13, -5)">
                <path d="M-4 -1 H4 L3 4 H-3 Z" fill="#d97706" stroke="#78350f" strokeWidth="1" />
                <path d="M-3 -1 C-3 -5 3 -5 3 -1" fill="none" stroke="#78350f" strokeWidth="1" />
                <circle cx="-1" cy="-1.5" r="1.5" fill="#ef4444" />
                <circle cx="1.5" cy="-1.5" r="1.5" fill="#facc15" />
              </g>
            )}

            {/* Head */}
            <circle cx="0" cy="-21" r="8.2" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.2" />
            <path
              d="M-7.5 -23 C-6 -29 6 -29 7.5 -23 C4 -25.5 -4 -25.5 -7.5 -23 Z"
              fill={activeOwnerChar.hairColor}
            />
            <circle cx="-2.6" cy="-20.5" r="1.1" fill="#0f172a" />
            <circle cx="2.6" cy="-20.5" r="1.1" fill="#0f172a" />
            <ellipse cx="-4.8" cy="-18.6" rx="1.4" ry="0.8" fill="#fb7185" opacity="0.55" />
            <ellipse cx="4.8" cy="-18.6" rx="1.4" ry="0.8" fill="#fb7185" opacity="0.55" />
            <path d="M-2.2 -17.2 Q0 -15.2 2.2 -17.2" fill="none" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" />

            {/* Hat */}
            {activeOwnerChar.styleId === 'scholar_farmer' ? (
              <g>
                <path d="M-8.5 -25.5 C-8.5 -32 8.5 -32 8.5 -25.5 Z" fill={activeOwnerChar.hatColor} stroke="#0f172a" strokeWidth="1.1" />
                <path d="M-8 -25.5 Q1 -27 11 -24 Q2 -23 -8 -25.5 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1" />
              </g>
            ) : (
              <g>
                <ellipse cx="0" cy="-26" rx="12.5" ry="3.2" fill={activeOwnerChar.hatColor} stroke="#78350f" strokeWidth="1.1" />
                <path d="M-6.5 -27 C-6 -34 6 -34 6.5 -27 Z" fill={activeOwnerChar.hatColor} stroke="#78350f" strokeWidth="1.1" />
                <path
                  d="M-6.5 -27.5 Q0 -26.2 6.5 -27.5"
                  fill="none"
                  stroke={activeOwnerChar.styleId === 'girl_farmer' ? '#f43f5e' : activeOwnerChar.styleId === 'gardener_girl' ? '#16a34a' : '#dc2626'}
                  strokeWidth="1.8"
                />
                {activeOwnerChar.styleId === 'girl_farmer' && (
                  <circle cx="6.2" cy="-28.5" r="1.8" fill="#fb7185" stroke="#881337" strokeWidth="0.7" />
                )}
                {activeOwnerChar.styleId === 'gardener_girl' && (
                  <circle cx="6.2" cy="-28.5" r="2" fill="#ffffff" stroke="#15803d" strokeWidth="0.7" />
                )}
              </g>
            )}

            {/* Clean Owner Nameplate */}
            <g transform="translate(0, -40)">
              <rect x="-32" y="-9" width="64" height="14" rx="7" fill="#0f172a" fillOpacity="0.82" stroke="#fde047" strokeWidth="1" />
              <text x="0" y="1" textAnchor="middle" fontSize="7.8" fontWeight="900" fill="#ffffff">
                {shortOwnerLabel}
              </text>
            </g>
          </g>
        </g>

        {/* Floating action feedback labels */}
        {feedbacks.map((fb) => {
          const row = Math.floor(fb.tileIndex / gridSize);
          const col = fb.tileIndex % gridSize;
          const { x, y } = tileToIso(row, col, gridSize);
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
              <circle cx="-20" cy="-16" r="3" fill="#fde047" opacity="0.9" />
              <circle cx="22" cy="-14" r="2.5" fill="#7dd3fc" opacity="0.9" />
              <rect x="-54" y="-12" width="108" height="22" rx="11" fill={bg} stroke="#ffffff" strokeWidth="1.2" />
              <text x="0" y="2" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#ffffff">
                {fb.text}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </div>
  );
};
