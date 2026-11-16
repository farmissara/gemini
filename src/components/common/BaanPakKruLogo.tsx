import React, { useId } from 'react';

interface BaanPakKruLogoProps {
  className?: string;
  size?: number;
  withBadge?: boolean;
}

/**
 * Bespoke logo for BaanPakKru (บ้านพักครู):
 * A warm modern Thai gable house ("บ้าน") sheltering a sunlit window & hearth chimney,
 * resting on an open book porch ("ครู") — representing a peaceful, supportive home for teachers.
 */
export const BaanPakKruLogo: React.FC<BaanPakKruLogoProps> = ({
  className = '',
  size = 28,
  withBadge = true,
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const bgGradId = `bpkBg-${safeId}`;
  const roofGradId = `bpkRoof-${safeId}`;
  const windowGradId = `bpkWin-${safeId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgGradId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="52%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id={roofGradId} x1="12" y1="14" x2="52" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
        <linearGradient id={windowGradId} x1="26" y1="28" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {withBadge && (
        <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${bgGradId})`} />
      )}

      {/* Cozy chimney with warm rising heart/steam puff */}
      <path
        d="M42.5 16.5H47V24.5H42.5V16.5Z"
        fill="#FDE68A"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="44.8" cy="12" r="2.1" fill="#FDE047" fillOpacity="0.95" />
      <circle cx="47.2" cy="8.5" r="1.3" fill="#FEF08A" fillOpacity="0.8" />

      {/* House walls */}
      <path
        d="M18 30.5L32 19L46 30.5V45.5C46 46.6 45.1 47.5 44 47.5H20C18.9 47.5 18 46.6 18 45.5V30.5Z"
        fill="#EFF6FF"
      />

      {/* Warm sunlit cottage window (4-pane) */}
      <rect
        x="26.5"
        y="30"
        width="11"
        height="10.5"
        rx="2.2"
        fill={`url(#${windowGradId})`}
        stroke="#1E40AF"
        strokeWidth="1.4"
      />
      <path d="M32 30V40.5M26.5 35.25H37.5" stroke="#1E40AF" strokeWidth="1.2" />

      {/* Sloped cozy Thai gable roof */}
      <path
        d="M11.5 32.5L32 14.5L52.5 32.5"
        stroke={`url(#${roofGradId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 32.5L32 17L49.5 32.5"
        stroke="#FBBF24"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Open Teacher Book Porch at base of the house */}
      <path
        d="M13 46.5C19.5 44.5 27.5 46 32 49C36.5 46 44.5 44.5 51 46.5V52.5C44.5 50.5 36.5 52 32 54.5C27.5 52 19.5 50.5 13 52.5V46.5Z"
        fill="#FFFFFF"
      />
      <path d="M32 49V54.5" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};
