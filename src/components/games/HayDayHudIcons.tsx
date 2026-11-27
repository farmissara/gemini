import React from 'react';
import type { FarmTool } from '../../lib/schoolFarmEngine';

export const HayDayLevelStarBadge: React.FC<{
  level: number;
  className?: string;
}> = ({ level, className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 64 64" className={`${className} drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)] select-none`}>
    <defs>
      <linearGradient id="hdStarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#60d5ff" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    {/* White thick cartoon outline */}
    <path
      d="M32 4 L40.2 20.6 L58.6 23.3 L45.3 36.2 L48.4 54.5 L32 45.8 L15.6 54.5 L18.7 36.2 L5.4 23.3 L23.8 20.6 Z"
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Blue glossy star body */}
    <path
      d="M32 7.5 L39.2 22.1 L55.3 24.4 L43.6 35.8 L46.4 51.8 L32 44.2 L17.6 51.8 L20.4 35.8 L8.7 24.4 L24.8 22.1 Z"
      fill="url(#hdStarGrad)"
      stroke="#fbbf24"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {/* Glossy top highlight */}
    <path
      d="M32 10 L37.8 21.8 L50 23.6 L32 28 L14 23.6 L26.2 21.8 Z"
      fill="#ffffff"
      opacity="0.28"
    />
    <text
      x="32"
      y="39"
      textAnchor="middle"
      fontSize="20"
      fontWeight="900"
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth="3.2"
      paintOrder="stroke"
    >
      {level}
    </text>
  </svg>
);

export const HayDayCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" className={`${className} drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] shrink-0`}>
    <defs>
      <radialGradient id="hdCoinGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="17" r="13" fill="#92400e" />
    <circle cx="16" cy="15" r="13" fill="url(#hdCoinGrad)" stroke="#fef9c3" strokeWidth="1.5" />
    <circle cx="16" cy="15" r="9.2" fill="none" stroke="#b45309" strokeWidth="1.4" opacity="0.55" />
    <ellipse cx="12" cy="10.5" rx="4.2" ry="2" transform="rotate(-25 12 10.5)" fill="#ffffff" opacity="0.65" />
  </svg>
);

export const HayDayGemIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" className={`${className} drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] shrink-0`}>
    <polygon points="8,6 24,6 30,13 16,28 2,13" fill="#e879f9" stroke="#4a044e" strokeWidth="1.8" strokeLinejoin="round" />
    <polygon points="8,6 24,6 21,13 11,13" fill="#fdf4ff" opacity="0.9" />
    <polygon points="2,13 11,13 16,28" fill="#c026d3" opacity="0.85" />
    <polygon points="30,13 21,13 16,28" fill="#a21caf" opacity="0.9" />
    <polygon points="11,13 21,13 16,28" fill="#f5d0fe" opacity="0.7" />
  </svg>
);

export const HayDayGiftBoxIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect x="6" y="16" width="28" height="19" rx="3" fill="#9333ea" stroke="#4c1d95" strokeWidth="1.8" />
    <rect x="4" y="11" width="32" height="7" rx="2.5" fill="#a855f7" stroke="#4c1d95" strokeWidth="1.8" />
    <rect x="17" y="11" width="6" height="24" fill="#fbbf24" stroke="#92400e" strokeWidth="1.1" />
    <path d="M20 11 C15 4 9 6 12 11 Z" fill="#facc15" stroke="#92400e" strokeWidth="1.2" />
    <path d="M20 11 C25 4 31 6 28 11 Z" fill="#facc15" stroke="#92400e" strokeWidth="1.2" />
  </svg>
);

export const HayDayNewspaperIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect x="6" y="9" width="28" height="23" rx="4" fill="#fef3c7" stroke="#92400e" strokeWidth="1.8" />
    <rect x="10" y="13" width="20" height="5" rx="1.5" fill="#d97706" />
    <rect x="10" y="21" width="9" height="7" rx="1.2" fill="#94a3b8" />
    <line x1="22" y1="22" x2="30" y2="22" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    <line x1="22" y1="26" x2="29" y2="26" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const HayDayMailIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect x="5" y="10" width="30" height="21" rx="4" fill="#fffbeb" stroke="#b45309" strokeWidth="1.8" />
    <path d="M6 12 L20 23 L34 12" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="20" cy="21" r="3" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
  </svg>
);

export const HayDayChatBubbleIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <path
      d="M7 10 H33 C35 10 36 11 36 13 V25 C36 27 35 28 33 28 H16 L9 34 V28 H7 C5 28 4 27 4 25 V13 C4 11 5 10 7 10 Z"
      fill="#fef3c7"
      stroke="#b45309"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="13.5" cy="19" r="2.3" fill="#d97706" />
    <circle cx="20.5" cy="19" r="2.3" fill="#d97706" />
    <circle cx="27.5" cy="19" r="2.3" fill="#d97706" />
  </svg>
);

export const HayDayFarmBookIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect x="8" y="7" width="24" height="26" rx="4" fill="#16a34a" stroke="#14532d" strokeWidth="1.8" />
    <rect x="11" y="7" width="4" height="26" fill="#15803d" />
    <rect x="18" y="11" width="10" height="7" rx="1.5" fill="#fef3c7" stroke="#92400e" strokeWidth="1" />
    <polygon points="23,21 25,25 29,25.5 26,28.5 27,32 23,30 19,32 20,28.5 17,25.5 21,25" fill="#facc15" stroke="#92400e" strokeWidth="0.9" />
  </svg>
);

export const HayDayRegisterIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 44 44" className={className}>
    {/* Base drawer */}
    <rect x="6" y="25" width="32" height="12" rx="3" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="1.8" />
    <rect x="10" y="28.5" width="24" height="5" rx="1.5" fill="#60a5fa" />
    <circle cx="22" cy="31" r="1.5" fill="#facc15" />
    {/* Cash register body */}
    <path d="M10 25 L13 13 H31 L34 25 Z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.8" strokeLinejoin="round" />
    {/* Gold display */}
    <rect x="15" y="6" width="14" height="7" rx="2" fill="#facc15" stroke="#92400e" strokeWidth="1.5" />
    {/* Keypad buttons */}
    <circle cx="17" cy="18" r="1.6" fill="#fef08a" />
    <circle cx="22" cy="18" r="1.6" fill="#fef08a" />
    <circle cx="27" cy="18" r="1.6" fill="#fef08a" />
    <circle cx="19.5" cy="22" r="1.6" fill="#ffffff" />
    <circle cx="24.5" cy="22" r="1.6" fill="#ffffff" />
  </svg>
);

export const HayDayTruckIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect x="4" y="13" width="19" height="14" rx="2.5" fill="#16a34a" stroke="#14532d" strokeWidth="1.6" />
    <path d="M23 15 H31 L36 21 V27 H23 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.6" strokeLinejoin="round" />
    <polygon points="25,17 30,17 33,21 25,21" fill="#bae6fd" />
    <circle cx="11" cy="29" r="4" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.4" />
    <circle cx="29" cy="29" r="4" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.4" />
  </svg>
);

export const HayDayFriendsIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 44 44" className={className}>
    <rect x="8" y="7" width="28" height="30" rx="5" fill="#b45309" stroke="#78350f" strokeWidth="1.8" />
    <rect x="11" y="10" width="22" height="24" rx="3" fill="#fde68a" />
    {/* Back friend silhouette */}
    <circle cx="27" cy="18" r="4.2" fill="#d97706" />
    <path d="M21 31 C21 25.5 33 25.5 33 31 Z" fill="#d97706" />
    {/* Front friend */}
    <circle cx="18" cy="19" r="4.8" fill="#ffffff" stroke="#78350f" strokeWidth="1.4" />
    <path d="M10.5 33 C10.5 26 25.5 26 25.5 33 Z" fill="#ffffff" stroke="#78350f" strokeWidth="1.4" />
  </svg>
);

export const HayDayMedallionButton: React.FC<{
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  badgeCount?: number;
  pulseDot?: boolean;
  children: React.ReactNode;
}> = ({
  onClick,
  ariaLabel,
  title,
  size = 'md',
  active = false,
  badgeCount,
  pulseDot = false,
  children,
}) => {
  const sizeClass =
    size === 'lg'
      ? 'w-14 h-14 sm:w-16 sm:h-16'
      : size === 'sm'
        ? 'w-11 h-11'
        : 'w-12 h-12 sm:w-13 sm:h-13';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={`relative ${sizeClass} rounded-full flex items-center justify-center cursor-pointer select-none transition-transform duration-150 active:scale-90 hover:scale-105 shrink-0 ${
        active
          ? 'bg-gradient-to-b from-[#fef08a] to-[#f59e0b] ring-4 ring-[#ffffff] shadow-[0_5px_0_#92400e,0_8px_16px_rgba(0,0,0,0.45)]'
          : 'bg-gradient-to-b from-[#ffffff] via-[#fffbeb] to-[#fde68a] ring-3 ring-[#ffffff] border-2 border-[#d97706] shadow-[0_4px_0_#b45309,0_6px_12px_rgba(0,0,0,0.4)]'
      }`}
    >
      {/* Subtle top gloss */}
      <span className="pointer-events-none absolute top-1 inset-x-2.5 h-2.5 rounded-full bg-white/70" />
      <span className="relative z-10 flex items-center justify-center">{children}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 z-20 min-w-[20px] h-[20px] px-1 rounded-full bg-[#e11d48] border-2 border-white text-white text-[10px] font-black flex items-center justify-center shadow tabular-nums">
          {badgeCount}
        </span>
      )}
      {pulseDot && (
        <span className="absolute -top-0.5 -right-0.5 z-20 w-4 h-4 rounded-full bg-[#e11d48] border-2 border-white animate-bounce shadow" />
      )}
    </button>
  );
};

export const HayDayToolSprite: React.FC<{ tool: FarmTool; className?: string }> = ({
  tool,
  className = 'w-6 h-6',
}) => {
  switch (tool) {
    case 'inspect':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path
            d="M14 5 V17 M18 8 V17 M22 10 V18 M10 14 L14 17 V24 C14 27 25 27 25 22 V13 C25 11.5 23 11.5 22 13"
            fill="#fed7aa"
            stroke="#7c2d12"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'till':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <line x1="7" y1="25" x2="21" y2="11" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M18 8 L26 6 L24 14 L19 13 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'plant':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <rect x="7" y="7" width="18" height="20" rx="3" fill="#fef08a" stroke="#854d0e" strokeWidth="1.8" />
          <path d="M16 22 V14" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 17 C11 13 10 10 16 12 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1" />
          <path d="M16 16 C21 12 22 9 16 11 Z" fill="#4ade80" stroke="#14532d" strokeWidth="1" />
        </svg>
      );
    case 'water':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <rect x="11" y="13" width="13" height="12" rx="3" fill="#0284c7" stroke="#0c4a6e" strokeWidth="1.6" />
          <path d="M11 18 L5 12 L7 10 L12 15" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.4" />
          <path d="M21 13 C25 10 27 16 24 20" fill="none" stroke="#0c4a6e" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="5" cy="21" r="1.5" fill="#7dd3fc" />
        </svg>
      );
    case 'daily_fertilize':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path d="M9 11 L23 11 L25 27 H7 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M11 7 H21 L19 11 H13 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
          <circle cx="16" cy="19" r="4" fill="#bbf7d0" />
        </svg>
      );
    case 'fertilize':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path d="M9 11 L23 11 L25 27 H7 Z" fill="#facc15" stroke="#854d0e" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M11 7 H21 L19 11 H13 Z" fill="#eab308" stroke="#854d0e" strokeWidth="1.5" />
          <polygon points="16,14 17.5,17.5 21,18 18.5,20.5 19,24 16,22.2 13,24 13.5,20.5 11,18 14.5,17.5" fill="#ffffff" stroke="#b45309" strokeWidth="0.9" />
        </svg>
      );
    case 'clear_weed':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path d="M8 26 L15 19" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M14 20 C11 10 18 5 26 9 C20 9 18 14 17 20 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'build':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <line x1="9" y1="25" x2="20" y2="14" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="15" y="7" width="12" height="7" rx="2" transform="rotate(45 21 10.5)" fill="#d97706" stroke="#78350f" strokeWidth="1.6" />
        </svg>
      );
    case 'unlock':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <polygon points="16,4 19.5,11.5 27.5,12.5 21.5,18 23,26 16,22 9,26 10.5,18 4.5,12.5 12.5,11.5" fill="#c084fc" stroke="#581c87" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};
