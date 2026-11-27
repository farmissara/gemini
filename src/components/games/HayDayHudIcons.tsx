import React from 'react';
import type { CropId, FarmOwnerCharacter, FarmTool, ProductId } from '../../lib/schoolFarmEngine';

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
    case 'harvest':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path d="M7 25 L14 18" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M13 19 C10 9 19 4 27 9 C21 9 18 14 16 20 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.6" strokeLinejoin="round" />
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

export const FarmOwnerPortraitSvg: React.FC<{
  character: FarmOwnerCharacter;
  className?: string;
}> = ({ character, className = 'w-9 h-9' }) => {
  const { styleId, hatColor, outfitColor, hairColor } = character;
  const isGirl = styleId === 'girl_farmer' || styleId === 'gardener_girl';
  const isScholar = styleId === 'scholar_farmer';

  return (
    <svg viewBox="0 0 64 64" className={`${className} select-none`} aria-hidden="true">
      <defs>
        <clipPath id="hdOwnerClip">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#bae6fd" />
      <g clipPath="url(#hdOwnerClip)">
        {/* Sunlit meadow background band */}
        <ellipse cx="32" cy="58" rx="34" ry="16" fill="#84cc16" />

        {/* Back hair for long-hair presets */}
        {isGirl && (
          <path
            d="M17 30 C15 44 17 52 22 54 H42 C47 52 49 44 47 30 Z"
            fill={hairColor}
            stroke="#1e293b"
            strokeWidth="1.6"
          />
        )}

        {/* Shirt & Overalls / Dress / Vest */}
        <path
          d="M13 64 C13 48 51 48 51 64 Z"
          fill="#fffbeb"
          stroke="#451a03"
          strokeWidth="1.8"
        />
        <path
          d="M17 64 C18 50 46 50 47 64 Z"
          fill={outfitColor}
          stroke="#1e293b"
          strokeWidth="1.6"
        />
        {/* Overall straps / collar */}
        {!isScholar ? (
          <>
            <rect x="22" y="48" width="4" height="14" rx="1.5" fill={outfitColor} stroke="#1e293b" strokeWidth="1.1" />
            <rect x="38" y="48" width="4" height="14" rx="1.5" fill={outfitColor} stroke="#1e293b" strokeWidth="1.1" />
            <circle cx="24" cy="53" r="1.4" fill="#facc15" />
            <circle cx="40" cy="53" r="1.4" fill="#facc15" />
          </>
        ) : (
          <>
            <polygon points="24,49 32,57 40,49" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
            <polygon points="30,52 34,52 33,61 31,61" fill="#e11d48" />
          </>
        )}

        {/* Head */}
        <circle cx="32" cy="34" r="12.5" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.8" />

        {/* Front Hair Bangs */}
        {isGirl ? (
          <path
            d="M19.5 31 C22 22 42 22 44.5 31 C39 27 35 28 32 30 C29 28 24 27 19.5 31 Z"
            fill={hairColor}
            stroke="#1e293b"
            strokeWidth="1.2"
          />
        ) : (
          <path
            d="M19.8 30 C21 21 43 21 44.2 30 C39 26 25 26 19.8 30 Z"
            fill={hairColor}
            stroke="#1e293b"
            strokeWidth="1.2"
          />
        )}

        {/* Eyes & Cheerful Smile */}
        <circle cx="27" cy="34.5" r="1.7" fill="#0f172a" />
        <circle cx="37" cy="34.5" r="1.7" fill="#0f172a" />
        <circle cx="26.5" cy="33.9" r="0.6" fill="#ffffff" />
        <circle cx="36.5" cy="33.9" r="0.6" fill="#ffffff" />
        <ellipse cx="23.5" cy="37.5" rx="2.2" ry="1.2" fill="#fb7185" opacity="0.55" />
        <ellipse cx="40.5" cy="37.5" rx="2.2" ry="1.2" fill="#fb7185" opacity="0.55" />
        <path d="M28 39.5 Q32 43 36 39.5" fill="none" stroke="#9a3412" strokeWidth="1.7" strokeLinecap="round" />

        {/* Hats matching preset style */}
        {styleId === 'scholar_farmer' ? (
          <g>
            <path d="M18 25 C18 14 46 14 46 25 Z" fill={hatColor} stroke="#0f172a" strokeWidth="1.6" />
            <path d="M18 25 Q34 22 50 27 Q36 28 18 25 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1.4" />
            <circle cx="32" cy="18.5" r="2.6" fill="#facc15" stroke="#854d0e" strokeWidth="1" />
          </g>
        ) : (
          <g>
            <ellipse cx="32" cy="24.5" rx="19" ry="4.8" fill={hatColor} stroke="#78350f" strokeWidth="1.6" />
            <path d="M21 23 C22 12 42 12 43 23 Z" fill={hatColor} stroke="#78350f" strokeWidth="1.6" />
            <path
              d="M21.5 21.5 Q32 23.5 42.5 21.5"
              fill="none"
              stroke={styleId === 'girl_farmer' ? '#f43f5e' : styleId === 'gardener_girl' ? '#16a34a' : '#dc2626'}
              strokeWidth="2.8"
            />
            {styleId === 'girl_farmer' && (
              <g transform="translate(41, 20)">
                <circle cx="-2.2" cy="0" r="2.2" fill="#fb7185" stroke="#881337" strokeWidth="0.9" />
                <circle cx="2.2" cy="0" r="2.2" fill="#fb7185" stroke="#881337" strokeWidth="0.9" />
                <circle cx="0" cy="0" r="1.4" fill="#ffe4e6" />
              </g>
            )}
            {styleId === 'gardener_girl' && (
              <g transform="translate(41, 20)">
                <circle cx="0" cy="0" r="3.4" fill="#ffffff" stroke="#15803d" strokeWidth="0.9" />
                <circle cx="0" cy="0" r="1.5" fill="#facc15" />
              </g>
            )}
          </g>
        )}
      </g>
    </svg>
  );
};

export const HayDaySpinWheelIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <circle cx="20" cy="20" r="15" fill="#facc15" stroke="#78350f" strokeWidth="2" />
    <path d="M20 20 L20 5 A15 15 0 0 1 35 20 Z" fill="#ef4444" />
    <path d="M20 20 L35 20 A15 15 0 0 1 20 35 Z" fill="#38bdf8" />
    <path d="M20 20 L20 35 A15 15 0 0 1 5 20 Z" fill="#22c55e" />
    <path d="M20 20 L5 20 A15 15 0 0 1 20 5 Z" fill="#facc15" />
    <circle cx="20" cy="20" r="15" fill="none" stroke="#78350f" strokeWidth="2" />
    <circle cx="20" cy="20" r="4.5" fill="#ffffff" stroke="#78350f" strokeWidth="1.5" />
    <polygon points="20,2 17,9 23,9" fill="#f97316" stroke="#7c2d12" strokeWidth="1.2" />
  </svg>
);

export const HayDayAchievementIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <polygon points="14,22 10,36 16,33 20,37 20,22" fill="#e11d48" stroke="#881337" strokeWidth="1.3" />
    <polygon points="26,22 30,36 24,33 20,37 20,22" fill="#be123c" stroke="#881337" strokeWidth="1.3" />
    <circle cx="20" cy="15" r="10.5" fill="#facc15" stroke="#92400e" strokeWidth="1.8" />
    <polygon points="20,8 22.3,12.8 27.5,13.5 23.8,17 24.6,22 20,19.5 15.4,22 16.2,17 12.5,13.5 17.7,12.8" fill="#ffffff" stroke="#b45309" strokeWidth="1" />
  </svg>
);

export const HayDayMusicIcon: React.FC<{ muted?: boolean; className?: string }> = ({
  muted = false,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M9 18V5l10-2v13"
      stroke="#78350f"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="6.5" cy="18" r="2.6" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
    <circle cx="16.5" cy="16" r="2.6" fill="#d97706" stroke="#78350f" strokeWidth="1.8" />
    {muted && (
      <line x1="3" y1="3" x2="21" y2="21" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" />
    )}
  </svg>
);

export const HayDayItemSprite: React.FC<{
  kind: 'crop' | 'product';
  id: CropId | ProductId;
  className?: string;
}> = ({ kind, id, className = 'w-6 h-6' }) => {
  if (kind === 'crop') {
    switch (id as CropId) {
      case 'corn':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <ellipse cx="16" cy="15" rx="6.5" ry="11" fill="#facc15" stroke="#a16207" strokeWidth="1.5" />
            <path d="M9 18 C11 26 21 26 23 18 C19 21 13 21 9 18 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.3" />
          </svg>
        );
      case 'carrot':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <path d="M16 7 C13 2 11 4 14 9 M16 7 C19 2 21 4 18 9" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M10 10 H22 L16 27 Z" fill="#f97316" stroke="#9a3412" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        );
      case 'tomato':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <circle cx="16" cy="17" r="9.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
            <path d="M12 9 L16 6 L20 9 L16 11 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.1" />
          </svg>
        );
      case 'strawberry':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <path d="M8 13 C8 8 24 8 24 13 C24 21 16 27 16 27 C16 27 8 21 8 13 Z" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.5" />
            <path d="M11 9 L16 6 L21 9 L16 11 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.1" />
            <circle cx="13" cy="15" r="1" fill="#fef08a" />
            <circle cx="19" cy="16" r="1" fill="#fef08a" />
            <circle cx="16" cy="20" r="1" fill="#fef08a" />
          </svg>
        );
      case 'sunflower':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <circle cx="16" cy="15" r="10.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="16" cy="15" r="5" fill="#78350f" />
          </svg>
        );
      case 'jasmine_rice':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <path d="M10 26 Q12 14 8 7 M16 26 Q18 12 16 5 M22 26 Q22 14 25 8" stroke="#eab308" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'pumpkin':
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <ellipse cx="16" cy="18" rx="11" ry="8.5" fill="#f97316" stroke="#9a3412" strokeWidth="1.5" />
            <path d="M16 9 L18 5" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 32 32" className={className}>
            <circle cx="16" cy="17" r="10" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
            <path d="M16 7 L19 4" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
    }
  }

  switch (id as ProductId) {
    case 'egg':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path d="M16 5 C21 5 24 14 24 20 C24 25 20.5 27 16 27 C11.5 27 8 25 8 20 C8 14 11 5 16 5 Z" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <ellipse cx="13" cy="13" rx="2" ry="3.5" fill="#ffffff" opacity="0.7" />
        </svg>
      );
    case 'milk':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <path d="M11 7 H21 L23 12 V26 H9 V12 Z" fill="#e0f2fe" stroke="#0369a1" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="11" y="5" width="10" height="3" rx="1" fill="#38bdf8" stroke="#0369a1" strokeWidth="1" />
        </svg>
      );
    case 'wool':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="10" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
          <path d="M10 13 Q16 17 22 13 M11 19 Q16 22 21 19" stroke="#94a3b8" strokeWidth="1.4" fill="none" />
        </svg>
      );
    case 'bread':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <ellipse cx="16" cy="18" rx="11" ry="7.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
          <line x1="11" y1="14" x2="14" y2="20" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="17" y1="14" x2="20" y2="20" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'berry_smoothie':
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <polygon points="10,11 22,11 20,27 12,27" fill="#fb7185" stroke="#9f1239" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="18" y1="11" x2="22" y2="5" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className={className}>
          <rect x="7" y="13" width="18" height="12" rx="3" fill="#fda4af" stroke="#9f1239" strokeWidth="1.5" />
          <path d="M7 14 Q16 19 25 14" stroke="#ffffff" strokeWidth="2.5" fill="none" />
          <circle cx="16" cy="10" r="3" fill="#e11d48" />
        </svg>
      );
  }
};

