import React from 'react';
import { MascotMood } from '../../data/interactiveGuideTopics';

interface MascotAvatarProps {
  mood?: MascotMood;
  sleeping?: boolean;
  size?: number;
  className?: string;
}

/**
 * Custom animated SVG cartoon navigator mascot ("น้องเอดู / EduBuddy").
 * Zero external assets; uses compositor-only animations and supports light/dark surfaces.
 */
export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood = 'happy',
  sleeping = false,
  size = 52,
  className = '',
}) => {
  const isPointing = mood === 'pointing' && !sleeping;
  const isCelebrate = mood === 'celebrate' && !sleeping;
  const isThinking = mood === 'thinking' && !sleeping;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none mascot-float ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 96 96"
        className="w-full h-full drop-shadow-sm overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="eduMascotBody" x1="18" y1="18" x2="78" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="eduMascotBelly" x1="48" y1="48" x2="48" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
          <linearGradient id="eduMascotCap" x1="22" y1="8" x2="74" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Soft shadow */}
        <ellipse cx="48" cy="88" rx="22" ry="4" fill="#0F172A" fillOpacity="0.16" />

        {/* Ears / Tuft */}
        <path d="M23 30 L17 17 L32 23 Z" fill="#1E40AF" />
        <path d="M73 30 L79 17 L64 23 Z" fill="#1E40AF" />

        {/* Main Round Owl Body */}
        <rect x="20" y="22" width="56" height="62" rx="28" fill="url(#eduMascotBody)" />

        {/* Belly Patch */}
        <ellipse cx="48" cy="64" rx="19" ry="16" fill="url(#eduMascotBelly)" />
        {/* Little belly feather chevrons */}
        <path d="M40 60 Q43 63 46 60 M50 60 Q53 63 56 60 M45 67 Q48 70 51 67" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

        {/* Left Wing */}
        <path
          d={isCelebrate ? 'M21 50 Q7 36 14 27 Q22 33 24 44 Z' : 'M21 50 Q10 58 15 68 Q22 65 24 55 Z'}
          fill="#2563EB"
          stroke="#1E40AF"
          strokeWidth="1.5"
        />

        {/* Right Wing (pointing or waving when active!) */}
        <path
          d={
            isPointing || isCelebrate
              ? 'M75 48 Q91 34 86 24 Q76 30 72 42 Z'
              : 'M75 50 Q86 58 81 68 Q74 65 72 55 Z'
          }
          fill="#2563EB"
          stroke="#1E40AF"
          strokeWidth="1.5"
        />

        {/* White Eye Goggles */}
        <circle cx="37" cy="42" r="11.5" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="2" />
        <circle cx="59" cy="42" r="11.5" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="2" />
        {/* Glasses bridge */}
        <line x1="47.5" y1="42" x2="48.5" y2="42" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" />

        {/* Eyes */}
        {sleeping ? (
          <>
            <path d="M32 42 Q37 46 42 42" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M54 42 Q59 46 64 42" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
          </>
        ) : isCelebrate ? (
          <>
            <path d="M32 43 Q37 37 42 43" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M54 43 Q59 37 64 43" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : (
          <g className="mascot-blink">
            <circle cx={isThinking ? 38.5 : isPointing ? 39 : 37} cy={isThinking ? 40 : 42} r="5.2" fill="#0F172A" />
            <circle cx={isThinking ? 60.5 : isPointing ? 61 : 59} cy={isThinking ? 40 : 42} r="5.2" fill="#0F172A" />
            <circle cx={isThinking ? 40.5 : 39} cy="40" r="1.8" fill="#FFFFFF" />
            <circle cx={isThinking ? 62.5 : 61} cy="40" r="1.8" fill="#FFFFFF" />
          </g>
        )}

        {/* Rosy Cheeks */}
        <ellipse cx="28" cy="50" rx="3.8" ry="2.2" fill="#FB7185" fillOpacity="0.55" />
        <ellipse cx="68" cy="50" rx="3.8" ry="2.2" fill="#FB7185" fillOpacity="0.55" />

        {/* Cute Amber Beak / Smile */}
        <path d="M44 47 L52 47 L48 53 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />

        {/* Scholar Graduation Cap */}
        <path d="M48 6 L74 16 L48 25 L22 16 Z" fill="url(#eduMascotCap)" stroke="#334155" strokeWidth="1.2" />
        <path d="M34 20 V26 Q48 30 62 26 V20" fill="#1E293B" />
        {/* Golden tassel */}
        <path d="M68 17 V28" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="68" cy="29.5" r="2.2" fill="#F59E0B" />

        {/* Little Feet */}
        <ellipse cx="38" cy="83" rx="5.5" ry="2.8" fill="#F59E0B" />
        <ellipse cx="58" cy="83" rx="5.5" ry="2.8" fill="#F59E0B" />

        {/* Sparkle stars when celebrating or pointing */}
        {isCelebrate && (
          <>
            <path d="M12 20 L13.5 23.5 L17 25 L13.5 26.5 L12 30 L10.5 26.5 L7 25 L10.5 23.5 Z" fill="#FBBF24" />
            <path d="M84 14 L85 16.5 L87.5 17.5 L85 18.5 L84 21 L83 18.5 L80.5 17.5 L83 16.5 Z" fill="#38BDF8" />
          </>
        )}
        {sleeping && (
          <text x="72" y="24" fill="#64748B" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
            Zzz
          </text>
        )}
      </svg>
    </div>
  );
};
