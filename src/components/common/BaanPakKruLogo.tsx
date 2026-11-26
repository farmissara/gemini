import React, { useId } from 'react';

interface BaanPakKruLogoProps {
  className?: string;
  size?: number;
  withBadge?: boolean;
}

/**
 * Futuristic architectural emblem for BaanPakKru (บ้านพักครู):
 * A precision-cut prismatic shield-squircle framing a sleek futuristic Thai gable ("บ้าน")
 * with a radiant nexus apex and a luminous holographic open-book core ("ครู").
 */
export const BaanPakKruLogo: React.FC<BaanPakKruLogoProps> = ({
  className = '',
  size = 28,
  withBadge = true,
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const bgGradId = `bpkBg-${safeId}`;
  const sheenGradId = `bpkSheen-${safeId}`;
  const roofGradId = `bpkRoof-${safeId}`;
  const coreGradId = `bpkCore-${safeId}`;
  const bookGradId = `bpkBook-${safeId}`;

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
        <linearGradient id={bgGradId} x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="48%" stopColor="#2563EB" />
          <stop offset="82%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={sheenGradId} x1="10" y1="4" x2="48" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={roofGradId} x1="12" y1="13" x2="52" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>
        <linearGradient id={coreGradId} x1="25" y1="24" x2="39" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
        <linearGradient id={bookGradId} x1="13" y1="44" x2="51" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
      </defs>

      {withBadge && (
        <>
          <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${bgGradId})`} />
          <rect
            x="2.75"
            y="2.75"
            width="58.5"
            height="58.5"
            rx="15.25"
            stroke="#FFFFFF"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <path
            d="M18 3H46C54.284 3 61 9.716 61 18V25C44 19 20 29 3 34V18C3 9.716 9.716 3 18 3Z"
            fill={`url(#${sheenGradId})`}
          />
        </>
      )}

      {/* Subtle architectural orbital ring */}
      <circle
        cx="32"
        cy="34"
        r="19.5"
        stroke="#7DD3FC"
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {/* Precision futuristic Thai gable silhouette */}
      <path
        d="M17.5 31L32 19L46.5 31V44.5C46.5 45.6 45.6 46.5 44.5 46.5H19.5C18.4 46.5 17.5 45.6 17.5 44.5V31Z"
        fill="#FFFFFF"
        fillOpacity="0.16"
        stroke="#E0F2FE"
        strokeOpacity="0.5"
        strokeWidth="1.2"
      />

      {/* Luminous Diamond Knowledge Core (4-facet futuristic spark + portal) */}
      <path
        d="M32 25.5L39.5 33L32 40.5L24.5 33L32 25.5Z"
        fill={`url(#${coreGradId})`}
        stroke="#FFFFFF"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="33" r="2.2" fill="#FFFFFF" />

      {/* Precision Gable Roof Chevron */}
      <path
        d="M11 32.5L32 14.5L53 32.5"
        stroke={`url(#${roofGradId})`}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Futuristic Apex Beacon Node */}
      <circle cx="32" cy="11.5" r="2.6" fill="#FDE047" stroke="#FFFFFF" strokeWidth="1.1" />

      {/* Sleek Open Digital Book / Wing Base */}
      <path
        d="M13 45.5C19.8 43.2 27.6 44.8 32 48.2C36.4 44.8 44.2 43.2 51 45.5V51.8C44.2 49.5 36.4 51.2 32 54C27.6 51.2 19.8 49.5 13 51.8V45.5Z"
        fill={`url(#${bookGradId})`}
      />
      <path d="M32 48.2V54" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};
