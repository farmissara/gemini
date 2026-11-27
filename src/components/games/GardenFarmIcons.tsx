import React from 'react';
import type { BuildingId, CropId, FarmTool, ProductId } from '../../lib/schoolFarmEngine';

export interface GardenHudIconBtnProps {
  onClick?: () => void;
  ariaLabel: string;
  title?: string;
  active?: boolean;
  badgeCount?: number;
  readyMark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'bamboo' | 'emerald' | 'amber' | 'rose' | 'indigo';
  children: React.ReactNode;
}

const TONE_CLASSES: Record<NonNullable<GardenHudIconBtnProps['tone']>, string> = {
  bamboo:
    'border-[#d6b37c]/85 bg-gradient-to-b from-[#fefcf6]/95 to-[#f1e4c9]/92 text-[#45270f] shadow-[0_4px_0_#6b4423,0_8px_16px_rgba(20,30,15,0.34)]',
  emerald:
    'border-[#86efac]/85 bg-gradient-to-b from-[#ecfdf5]/95 to-[#bbf7d0]/92 text-[#064e3b] shadow-[0_4px_0_#15803d,0_8px_16px_rgba(6,78,59,0.32)]',
  amber:
    'border-[#fde68a]/90 bg-gradient-to-b from-[#fffbeb]/95 to-[#fde68a]/92 text-[#78350f] shadow-[0_4px_0_#b45309,0_8px_16px_rgba(120,53,15,0.32)]',
  rose:
    'border-[#fecdd3]/90 bg-gradient-to-b from-[#fff1f2]/95 to-[#fecdd3]/92 text-[#881337] shadow-[0_4px_0_#be123c,0_8px_16px_rgba(136,19,55,0.32)]',
  indigo:
    'border-[#c7d2fe]/90 bg-gradient-to-b from-[#eef2ff]/95 to-[#c7d2fe]/92 text-[#312e81] shadow-[0_4px_0_#4338ca,0_8px_16px_rgba(49,46,129,0.32)]',
};

export const GardenHudIconBtn: React.FC<GardenHudIconBtnProps> = ({
  onClick,
  ariaLabel,
  title,
  active = false,
  badgeCount,
  readyMark = false,
  size = 'md',
  tone = 'bamboo',
  children,
}) => {
  const sizeCls =
    size === 'sm'
      ? 'w-10 h-10 rounded-xl'
      : size === 'lg'
        ? 'w-13 h-13 sm:w-14 sm:h-14 rounded-2xl'
        : 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`relative flex items-center justify-center shrink-0 border-2 backdrop-blur-md transition-transform duration-150 cursor-pointer select-none hover:scale-105 active:translate-y-0.5 ${sizeCls} ${TONE_CLASSES[tone]} ${
        active ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#1d2e17]' : ''
      }`}
    >
      <span className="pointer-events-none flex items-center justify-center">{children}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-[#dc2626] border-2 border-[#fffbeb] text-[10px] font-black text-white flex items-center justify-center tabular-nums shadow">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
      {readyMark && !(badgeCount && badgeCount > 0) && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#16a34a] border-2 border-[#fffbeb] shadow" />
      )}
    </button>
  );
};

export const GardenLevelCrest: React.FC<{ level: number; className?: string }> = ({
  level,
  className = 'w-11 h-11',
}) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    {/* Lotus & Gold Star Crest */}
    <path
      d="M32 4 L40 16 L54 14 L50 28 L60 38 L46 44 L44 58 L32 51 L20 58 L18 44 L4 38 L14 28 L10 14 L24 16 Z"
      fill="#15803d"
      stroke="#fef08a"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <circle cx="32" cy="33" r="17" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
    <text
      x="32"
      y="39"
      textAnchor="middle"
      fontSize="19"
      fontWeight="900"
      fill="#78350f"
      fontFamily="system-ui, sans-serif"
    >
      {level}
    </text>
  </svg>
);

export const GardenCoinCrest: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#fbbf24" stroke="#78350f" strokeWidth="2.4" />
    <circle cx="20" cy="20" r="12.5" fill="#fde047" stroke="#d97706" strokeWidth="1.5" />
    <path d="M20 11 V29 M15.5 16.5 C15.5 14 24.5 14 24.5 16.5 C24.5 19.5 15.5 19.5 15.5 23 C15.5 25.5 24.5 25.5 24.5 23" stroke="#92400e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </svg>
);

export const GardenGemCrest: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <polygon points="12,7 28,7 36,16 20,35 4,16" fill="#06b6d4" stroke="#164e63" strokeWidth="2.2" strokeLinejoin="round" />
    <polygon points="12,7 28,7 24,16 16,16" fill="#a5f3fc" />
    <polygon points="16,16 24,16 20,35" fill="#22d3ee" />
  </svg>
);

export const GardenCafeCupIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    {/* Warm herbal steam */}
    <path d="M16 11 C14 7 18 5 17 2" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M24 10 C22 6 26 4 25 1" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Ceramic cup with butterfly-pea swirl */}
    <path d="M9 16 H30 L27 31 C26.5 34 12.5 34 12 31 Z" fill="#fffbeb" stroke="#78350f" strokeWidth="2.2" strokeLinejoin="round" />
    <ellipse cx="19.5" cy="16" rx="10.5" ry="3.2" fill="#818cf8" stroke="#4338ca" strokeWidth="1.5" />
    <path d="M30 19 C36 19 36 27 29 27" fill="none" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" />
    {/* Bamboo coaster */}
    <ellipse cx="19.5" cy="35.5" rx="14" ry="3.5" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
    {/* Pandan leaf garnish */}
    <path d="M25 14 L32 8 L29 16 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
  </svg>
);

export const GardenMortarCraftIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    {/* Gear + Herbal Kettle */}
    <ellipse cx="22" cy="34" rx="14" ry="4" fill="#92400e" opacity="0.25" />
    <path d="M10 19 H32 C32 30 28 35 21 35 C14 35 10 30 10 19 Z" fill="#b45309" stroke="#451a03" strokeWidth="2.2" />
    <ellipse cx="21" cy="19" rx="11" ry="3.4" fill="#fef3c7" stroke="#451a03" strokeWidth="1.6" />
    <line x1="23" y1="19" x2="32" y2="7" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
    <path d="M14 14 C12 9 17 8 18 13" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
    <circle cx="19" cy="13" r="3" fill="#6366f1" />
  </svg>
);

export const GardenStallIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    <rect x="8" y="21" width="28" height="15" rx="2.5" fill="#d97706" stroke="#78350f" strokeWidth="2" />
    <path d="M4 18 L10 8 H34 L40 18 Z" fill="#16a34a" stroke="#14532d" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="13,8 21,8 19,18 9,18" fill="#fef3c7" />
    <polygon points="26,8 33,8 37,18 28,18" fill="#fef3c7" />
    <circle cx="15" cy="27" r="3.2" fill="#f59e0b" />
    <circle cx="22" cy="27" r="3.2" fill="#6366f1" />
    <circle cx="29" cy="27" r="3.2" fill="#22c55e" />
  </svg>
);

export const GardenNeighborsIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    <circle cx="16" cy="21" r="6" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.6" />
    <path d="M8 36 C8 29 24 29 24 36" fill="#16a34a" stroke="#14532d" strokeWidth="1.8" />
    <path d="M7 18 L16 10 L25 18 Z" fill="#fde047" stroke="#a16207" strokeWidth="1.5" />
    <circle cx="29" cy="22" r="5.5" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.6" />
    <path d="M22 36 C22 30 36 30 36 36" fill="#6366f1" stroke="#312e81" strokeWidth="1.8" />
    <circle cx="29" cy="14" r="3.2" fill="#ec4899" />
  </svg>
);

export const GardenGazetteIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    <rect x="8" y="8" width="28" height="28" rx="4" fill="#fefce8" stroke="#78350f" strokeWidth="2.2" />
    <rect x="12" y="12" width="20" height="5" rx="1.5" fill="#15803d" />
    <rect x="12" y="20" width="9" height="9" rx="1.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
    <line x1="24" y1="21" x2="32" y2="21" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    <line x1="24" y1="25" x2="32" y2="25" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="32" x2="31" y2="32" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GardenEventsIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    <circle cx="22" cy="22" r="15" fill="#fde047" stroke="#78350f" strokeWidth="2.2" />
    <path d="M22 22 L22 7 A15 15 0 0 1 37 22 Z" fill="#ef4444" />
    <path d="M22 22 L37 22 A15 15 0 0 1 22 37 Z" fill="#38bdf8" />
    <path d="M22 22 L22 37 A15 15 0 0 1 7 22 Z" fill="#22c55e" />
    <circle cx="22" cy="22" r="5" fill="#fffbeb" stroke="#78350f" strokeWidth="2" />
    <polygon points="22,3 19,9 25,9" fill="#e11d48" stroke="#fff" strokeWidth="1" />
  </svg>
);

export const GardenGiftBasketIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    <path d="M10 19 H34 L31 35 H13 Z" fill="#d97706" stroke="#78350f" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M15 19 C15 10 29 10 29 19" fill="none" stroke="#78350f" strokeWidth="2.6" />
    <circle cx="17" cy="17" r="4" fill="#ef4444" />
    <circle cx="23" cy="16" r="4.2" fill="#22c55e" />
    <circle cx="28" cy="18" r="3.6" fill="#fbbf24" />
    <line x1="12" y1="25" x2="32" y2="25" stroke="#fef3c7" strokeWidth="1.8" />
  </svg>
);

export const GardenCareerIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
    <rect x="8" y="15" width="28" height="20" rx="4" fill="#d97706" stroke="#78350f" strokeWidth="2.2" />
    <path d="M16 15 V11 C16 8.8 28 8.8 28 11 V15" fill="none" stroke="#78350f" strokeWidth="2.6" strokeLinecap="round" />
    <rect x="8" y="21" width="28" height="4" fill="#b45309" />
    <rect x="19" y="19" width="6" height="8" rx="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="1.4" />
    <circle cx="34" cy="11" r="6" fill="#16a34a" stroke="#fffbeb" strokeWidth="1.6" />
    <path d="M31.5 11 H36.5 M34 8.5 V13.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const GardenCapitalTokenIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <rect x="5" y="9" width="30" height="22" rx="5" fill="#10b981" stroke="#064e3b" strokeWidth="2.2" />
    <rect x="9" y="13" width="22" height="14" rx="2.5" fill="#a7f3d0" stroke="#047857" strokeWidth="1.3" />
    <circle cx="20" cy="20" r="4.8" fill="#facc15" stroke="#92400e" strokeWidth="1.5" />
    <path d="M20 17.2 V22.8 M17.2 20 H22.8" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const GardenToolIcon: React.FC<{ tool: FarmTool; className?: string }> = ({
  tool,
  className = 'w-6 h-6',
}) => {
  switch (tool) {
    case 'inspect':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M8 18 H28 L25 30 H11 Z" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          <path d="M13 18 C13 11 23 11 23 18" fill="none" stroke="#78350f" strokeWidth="2.2" />
          <circle cx="15" cy="16" r="3" fill="#22c55e" />
          <circle cx="21" cy="16" r="3" fill="#fbbf24" />
        </svg>
      );
    case 'till':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <line x1="8" y1="29" x2="25" y2="9" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M21 6 L30 13 L23 17 L18 11 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1.6" />
        </svg>
      );
    case 'plant':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M18 30 V15" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 19 C11 10 6 16 14 21 Z" fill="#4ade80" stroke="#166534" strokeWidth="1.6" />
          <path d="M18 16 C25 7 30 13 22 18 Z" fill="#22c55e" stroke="#166534" strokeWidth="1.6" />
          <ellipse cx="18" cy="30" rx="8" ry="3" fill="#92400e" />
        </svg>
      );
    case 'water':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M18 5 C25 14 28 19 28 24 A10 10 0 0 1 8 24 C8 19 11 14 18 5 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="2" />
          <path d="M13 24 A5 5 0 0 0 17 29" fill="none" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'daily_fertilize':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="9" y="10" width="18" height="21" rx="4" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <circle cx="18" cy="21" r="4.5" fill="#fef08a" />
          <path d="M13 10 L11 5 H25 L23 10" fill="#86efac" stroke="#14532d" strokeWidth="1.5" />
        </svg>
      );
    case 'fertilize':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="9" y="10" width="18" height="21" rx="4" fill="#facc15" stroke="#92400e" strokeWidth="2" />
          <polygon points="18,14 20,19 25,19 21,22 22,27 18,24 14,27 15,22 11,19 16,19" fill="#fffbeb" />
          <path d="M13 10 L11 5 H25 L23 10" fill="#fde047" stroke="#92400e" strokeWidth="1.5" />
        </svg>
      );
    case 'harvest':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M9 28 L19 19" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
          <path d="M18 20 C28 17 30 7 15 6 C22 10 22 15 16 18 Z" fill="#e2e8f0" stroke="#334155" strokeWidth="1.8" />
        </svg>
      );
    case 'clear_weed':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M8 28 L12 12 L17 22 L21 9 L25 21 L29 14 L27 28 Z" fill="#a855f7" stroke="#581c87" strokeWidth="1.8" />
          <line x1="7" y1="9" x2="29" y2="29" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'build':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <line x1="9" y1="28" x2="23" y2="14" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <path d="M17 9 L26 6 L30 11 L24 17 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.8" />
        </svg>
      );
    case 'unlock':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <polygon points="18,4 22,13 32,14 25,21 27,31 18,26 9,31 11,21 4,14 14,13" fill="#a855f7" stroke="#4c1d95" strokeWidth="1.8" />
          <circle cx="18" cy="18" r="4" fill="#fde047" />
        </svg>
      );
  }
};

export const GardenItemIcon: React.FC<{
  kind: 'crop' | 'product';
  id: CropId | ProductId;
  className?: string;
}> = ({ kind, id, className = 'w-7 h-7' }) => {
  if (kind === 'crop') {
    const cid = id as CropId;
    switch (cid) {
      case 'corn':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <ellipse cx="18" cy="17" rx="7" ry="11" fill="#fde047" stroke="#a16207" strokeWidth="1.8" />
            <path d="M10 20 C12 28 18 30 18 30 C18 30 24 28 26 20" fill="#22c55e" stroke="#15803d" strokeWidth="1.6" />
          </svg>
        );
      case 'carrot':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M15 11 Q18 3 22 10" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M12 12 L24 12 L18 31 Z" fill="#f97316" stroke="#9a3412" strokeWidth="1.8" />
          </svg>
        );
      case 'tomato':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <circle cx="18" cy="20" r="10.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.8" />
            <path d="M14 10 L18 13 L22 10 L18 7 Z" fill="#16a34a" />
          </svg>
        );
      case 'butterfly_pea':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <circle cx="13" cy="17" r="7" fill="#6366f1" stroke="#312e81" strokeWidth="1.5" />
            <circle cx="23" cy="17" r="7" fill="#4f46e5" stroke="#312e81" strokeWidth="1.5" />
            <circle cx="18" cy="23" r="6.5" fill="#818cf8" stroke="#312e81" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="3" fill="#fef08a" />
            <path d="M18 9 V5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'pandan':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M18 31 C11 22 9 12 13 6 C16 13 17 22 18 31 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.4" />
            <path d="M18 31 C17 20 19 10 22 5 C23 13 21 23 18 31 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.4" />
            <path d="M18 31 C24 23 28 15 27 9 C23 15 20 23 18 31 Z" fill="#4ade80" stroke="#14532d" strokeWidth="1.4" />
          </svg>
        );
      case 'strawberry':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M10 15 C10 9 26 9 26 15 C26 24 18 31 18 31 C18 31 10 24 10 15 Z" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.8" />
            <path d="M13 10 L18 13 L23 10 L18 6 Z" fill="#16a34a" />
          </svg>
        );
      case 'sunflower':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <circle cx="18" cy="18" r="11" fill="#facc15" stroke="#ca8a04" strokeWidth="1.8" />
            <circle cx="18" cy="18" r="5.5" fill="#78350f" />
          </svg>
        );
      case 'jasmine_rice':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M12 29 Q14 14 23 7" stroke="#eab308" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <ellipse cx="22" cy="10" rx="3" ry="4.5" fill="#fef08a" stroke="#a16207" strokeWidth="1.2" />
            <ellipse cx="18" cy="16" rx="3" ry="4.5" fill="#fde047" stroke="#a16207" strokeWidth="1.2" />
            <ellipse cx="15" cy="22" rx="3" ry="4.5" fill="#fef08a" stroke="#a16207" strokeWidth="1.2" />
          </svg>
        );
      case 'coconut':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <circle cx="18" cy="20" r="10.5" fill="#65a30d" stroke="#365314" strokeWidth="1.8" />
            <path d="M12 14 L18 9 L24 14 Z" fill="#bef264" stroke="#365314" strokeWidth="1.2" />
            <line x1="21" y1="12" x2="26" y2="5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );
      case 'mango':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M21 8 C28 9 28 21 21 27 C15 31 10 26 12 18 C14 12 17 7 21 8 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.8" />
            <path d="M20 8 L24 4" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );
      case 'pumpkin':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <ellipse cx="18" cy="21" rx="11" ry="9" fill="#f97316" stroke="#9a3412" strokeWidth="1.8" />
            <path d="M18 12 L20 6" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        );
      case 'golden_melon':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <circle cx="18" cy="20" r="10" fill="#fbbf24" stroke="#b45309" strokeWidth="1.8" />
            <path d="M18 10 V5 H23" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'morning_glory':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M13 30 L16 11" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M23 30 L21 10" stroke="#22c55e" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M16 12 L9 18 L15 21 Z" fill="#4ade80" stroke="#14532d" strokeWidth="1.3" />
            <path d="M21 11 L28 16 L22 20 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.3" />
            <ellipse cx="18" cy="9" rx="3" ry="5" fill="#86efac" stroke="#14532d" strokeWidth="1.2" />
          </svg>
        );
      case 'chili':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M15 9 C22 10 27 18 24 27 C21 30 16 25 14 17 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1.8" />
            <path d="M11 12 C16 13 18 19 16 25 C13 26 10 21 9 16 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
            <path d="M15 9 L12 5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'holy_basil':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <line x1="18" y1="30" x2="18" y2="11" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" />
            <ellipse cx="12" cy="18" rx="5.5" ry="3.8" transform="rotate(-25 12 18)" fill="#22c55e" stroke="#14532d" strokeWidth="1.4" />
            <ellipse cx="24" cy="18" rx="5.5" ry="3.8" transform="rotate(25 24 18)" fill="#16a34a" stroke="#14532d" strokeWidth="1.4" />
            <circle cx="18" cy="9" r="3" fill="#a855f7" stroke="#581c87" strokeWidth="1.2" />
          </svg>
        );
      case 'banana':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M8 22 C13 29 24 27 28 15 C24 21 15 22 10 18 Z" fill="#fde047" stroke="#a16207" strokeWidth="1.6" />
            <path d="M11 17 C16 23 25 20 27 11 C23 16 17 17 13 13 Z" fill="#facc15" stroke="#a16207" strokeWidth="1.4" />
            <rect x="24" y="8" width="4" height="5" rx="1" fill="#78350f" />
          </svg>
        );
      case 'watermelon':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M7 18 A11 11 0 0 0 29 18 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.6" />
            <path d="M9.5 18 A8.5 8.5 0 0 0 26.5 18 Z" fill="#f43f5e" />
            <circle cx="15" cy="21" r="1.1" fill="#1e293b" />
            <circle cx="18.5" cy="23" r="1.1" fill="#1e293b" />
            <circle cx="22" cy="20.5" r="1.1" fill="#1e293b" />
          </svg>
        );
      case 'pineapple':
        return (
          <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <path d="M14 13 L11 5 L18 10 L25 5 L22 13 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.3" />
            <ellipse cx="18" cy="22" rx="8" ry="9.5" fill="#facc15" stroke="#a16207" strokeWidth="1.7" />
            <path d="M13 18 L23 25 M23 18 L13 25" stroke="#ca8a04" strokeWidth="1.2" />
          </svg>
        );
    }
  }

  const pid = id as ProductId;
  switch (pid) {
    case 'egg':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M18 7 C24 7 27 16 27 22 C27 27 23 30 18 30 C13 30 9 27 9 22 C9 16 12 7 18 7 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.8" />
        </svg>
      );
    case 'milk':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="12" y="12" width="12" height="19" rx="3" fill="#f8fafc" stroke="#0284c7" strokeWidth="1.8" />
          <rect x="14" y="6" width="8" height="6" rx="1.5" fill="#38bdf8" />
        </svg>
      );
    case 'wool':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <circle cx="18" cy="18" r="9.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1.8" />
          <circle cx="14" cy="15" r="4.5" fill="#ffffff" />
          <circle cx="22" cy="16" r="4.5" fill="#ffffff" />
        </svg>
      );
    case 'coconut_milk':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M9 17 H27 C27 26 23 30 18 30 C13 30 9 26 9 17 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.8" />
          <ellipse cx="18" cy="17" rx="9" ry="3.2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.4" />
        </svg>
      );
    case 'herbal_tea_base':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="12" y="13" width="12" height="17" rx="4" fill="#6366f1" stroke="#312e81" strokeWidth="1.8" />
          <rect x="14" y="7" width="8" height="5" rx="1.5" fill="#d97706" />
          <circle cx="18" cy="21" r="3" fill="#4ade80" />
        </svg>
      );
    case 'butterfly_pea_latte':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M11 13 H25 L23 30 H13 Z" fill="#ffffff" stroke="#334155" strokeWidth="1.6" />
          <path d="M12.2 21 H23.8 L23 30 H13 Z" fill="#818cf8" />
          <path d="M11.5 13 H24.5 L24 19 H12 Z" fill="#e0e7ff" />
          <line x1="20" y1="13" x2="24" y2="5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'pandan_coconut_latte':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M11 13 H25 L23 30 H13 Z" fill="#ecfdf5" stroke="#14532d" strokeWidth="1.6" />
          <path d="M12.2 20 H23.8 L23 30 H13 Z" fill="#22c55e" />
          <line x1="16" y1="13" x2="13" y2="5" stroke="#65a30d" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'pandan_cake':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M8 21 L28 15 L28 28 L8 28 Z" fill="#4ade80" stroke="#14532d" strokeWidth="1.6" />
          <path d="M8 21 L28 15 L23 11 L8 17 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
          <circle cx="19" cy="14" r="2.2" fill="#22c55e" />
        </svg>
      );
    case 'mango_sticky_rice':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <ellipse cx="18" cy="25" rx="12" ry="5" fill="#16a34a" stroke="#14532d" strokeWidth="1.4" />
          <ellipse cx="14" cy="21" rx="6" ry="4.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M19 15 C25 14 27 21 22 25 C17 25 17 18 19 15 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.3" />
        </svg>
      );
    case 'bread':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M7 22 C7 13 29 13 29 22 V27 H7 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.8" />
        </svg>
      );
    case 'berry_smoothie':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M12 13 H24 L22 30 H14 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.8" />
          <line x1="18" y1="13" x2="23" y2="5" stroke="#fde047" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'berry_cake':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="8" y="16" width="20" height="13" rx="3" fill="#fda4af" stroke="#9f1239" strokeWidth="1.8" />
          <circle cx="18" cy="12" r="3.5" fill="#e11d48" />
        </svg>
      );
    case 'pumpkin_pie':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <ellipse cx="18" cy="21" rx="12" ry="7.5" fill="#ea580c" stroke="#7c2d12" strokeWidth="1.8" />
          <circle cx="18" cy="19" r="3" fill="#fffbeb" />
        </svg>
      );
    case 'tilapia_fish':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <ellipse cx="17" cy="19" rx="10" ry="6.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.7" />
          <polygon points="26,19 33,13 33,25" fill="#0284c7" stroke="#0369a1" strokeWidth="1.4" />
          <circle cx="11.5" cy="17.5" r="1.5" fill="#0f172a" />
          <path d="M15 15 Q18 19 15 23" stroke="#e0f2fe" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'giant_prawn':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M10 23 C10 13 22 11 26 17 C28 21 24 26 19 25" fill="#fb923c" stroke="#9a3412" strokeWidth="1.8" />
          <path d="M10 17 L5 12 M11 19 L5 19" stroke="#ea580c" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="13" cy="16" r="1.4" fill="#0f172a" />
        </svg>
      );
    case 'grilled_fish':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <ellipse cx="18" cy="24" rx="13" ry="6" fill="#fef3c7" stroke="#78350f" strokeWidth="1.4" />
          <ellipse cx="17" cy="18" rx="9" ry="5" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
          <polygon points="25,18 30,14 30,22" fill="#b45309" />
          <circle cx="13" cy="16" r="2" fill="#22c55e" />
        </svg>
      );
    case 'tom_yum_kung':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M7 18 H29 C29 27 24 30 18 30 C12 30 7 27 7 18 Z" fill="#fef2f2" stroke="#7f1d1d" strokeWidth="1.7" />
          <ellipse cx="18" cy="18" rx="11" ry="3.5" fill="#ea580c" />
          <circle cx="15" cy="18" r="2.6" fill="#fb923c" />
          <circle cx="22" cy="17.5" r="2" fill="#22c55e" />
        </svg>
      );
    case 'basil_stir_fry':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <circle cx="18" cy="20" r="11.5" fill="#fffbeb" stroke="#78350f" strokeWidth="1.6" />
          <circle cx="15" cy="18" r="4.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="15" cy="18" r="2.2" fill="#facc15" />
          <circle cx="22" cy="22" r="3.5" fill="#16a34a" />
          <circle cx="23" cy="16" r="1.8" fill="#ef4444" />
        </svg>
      );
    case 'banana_coconut_sweet':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M8 18 H28 C28 26 23 30 18 30 C13 30 8 26 8 18 Z" fill="#818cf8" stroke="#312e81" strokeWidth="1.6" />
          <ellipse cx="18" cy="18" rx="10" ry="3.2" fill="#fefce8" />
          <circle cx="15" cy="17.5" r="2.6" fill="#fde047" />
          <circle cx="21" cy="18" r="2.4" fill="#facc15" />
        </svg>
      );
    case 'watermelon_smoothie':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M12 13 H24 L22 30 H14 Z" fill="#f43f5e" stroke="#881337" strokeWidth="1.7" />
          <line x1="18" y1="13" x2="24" y2="5" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="14" cy="13" r="3" fill="#facc15" />
        </svg>
      );
    case 'woven_scarf':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="9" y="10" width="18" height="9" rx="4" fill="#6366f1" stroke="#312e81" strokeWidth="1.6" />
          <path d="M12 19 V29 H18 V19 M20 19 V27 H25 V19" fill="#818cf8" stroke="#312e81" strokeWidth="1.5" />
        </svg>
      );
    case 'herbal_balm':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="9" y="16" width="18" height="12" rx="4" fill="#14b8a6" stroke="#134e4a" strokeWidth="1.7" />
          <rect x="8" y="11" width="20" height="5" rx="2" fill="#fbbf24" stroke="#78350f" strokeWidth="1.4" />
          <circle cx="18" cy="22" r="3" fill="#ecfdf5" />
        </svg>
      );
    case 'gift_hamper':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M8 17 H28 L25 30 H11 Z" fill="#d97706" stroke="#78350f" strokeWidth="1.7" />
          <path d="M13 17 C13 9 23 9 23 17" fill="none" stroke="#8b5cf6" strokeWidth="2.2" />
          <circle cx="15" cy="15" r="3" fill="#fbbf24" />
          <circle cx="21" cy="15" r="3" fill="#6366f1" />
        </svg>
      );
  }
};

export const GardenBuildingBadgeIcon: React.FC<{
  buildingId: BuildingId;
  className?: string;
}> = ({ buildingId, className = 'w-6 h-6' }) => {
  switch (buildingId) {
    case 'garden_cafe':
      return <GardenCafeCupIcon className={className} />;
    case 'herbal_pavilion':
      return <GardenItemIcon kind="crop" id="butterfly_pea" className={className} />;
    case 'thai_kitchen':
      return <GardenItemIcon kind="product" id="mango_sticky_rice" className={className} />;
    case 'chicken_coop':
      return <GardenItemIcon kind="product" id="egg" className={className} />;
    case 'dairy_barn':
      return <GardenItemIcon kind="product" id="milk" className={className} />;
    case 'sheep_pen':
      return <GardenItemIcon kind="product" id="wool" className={className} />;
    case 'juice_stand':
      return <GardenItemIcon kind="product" id="berry_smoothie" className={className} />;
    case 'windmill_bakery':
      return <GardenItemIcon kind="product" id="bread" className={className} />;
    case 'fishery_pier':
      return <GardenItemIcon kind="product" id="giant_prawn" className={className} />;
    case 'craft_studio':
      return <GardenItemIcon kind="product" id="woven_scarf" className={className} />;
    case 'digital_hub':
      return <GardenItemIcon kind="product" id="gift_hamper" className={className} />;
    case 'lotus_fish_pond':
      return <GardenItemIcon kind="product" id="tilapia_fish" className={className} />;
    default:
      return <GardenToolIcon tool="build" className={className} />;
  }
};
