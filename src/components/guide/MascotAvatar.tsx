import React, { useEffect, useId, useState } from 'react';
import { MascotMood } from '../../data/interactiveGuideTopics';

export type MascotCharacter = 'duo' | 'charcoal' | 'mee';

const MASCOT_STORAGE_KEY = 'eduverse_mascot_character';
const MASCOT_CHANGE_EVENT = 'eduverse:mascot-character-changed';

export function getSavedMascotCharacter(): MascotCharacter {
  if (typeof window === 'undefined') return 'duo';
  const stored = window.localStorage.getItem(MASCOT_STORAGE_KEY);
  if (stored === 'charcoal' || stored === 'mee' || stored === 'duo') {
    return stored;
  }
  return 'duo';
}

export function setSavedMascotCharacter(next: MascotCharacter): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MASCOT_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent<MascotCharacter>(MASCOT_CHANGE_EVENT, { detail: next }));
  } catch {
    // ignore storage errors
  }
}

interface MascotAvatarProps {
  mood?: MascotMood;
  sleeping?: boolean;
  size?: number;
  character?: MascotCharacter;
  className?: string;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood = 'happy',
  sleeping = false,
  size = 52,
  character: characterProp,
  className = '',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const charcoalGradId = `charcoalFur-${safeId}`;
  const meeGradId = `meeFur-${safeId}`;

  const [savedCharacter, setSavedCharacter] = useState<MascotCharacter>(() =>
    getSavedMascotCharacter()
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<MascotCharacter>).detail;
      if (detail === 'duo' || detail === 'charcoal' || detail === 'mee') {
        setSavedCharacter(detail);
      } else {
        setSavedCharacter(getSavedMascotCharacter());
      }
    };
    window.addEventListener(MASCOT_CHANGE_EVENT, handler);
    return () => window.removeEventListener(MASCOT_CHANGE_EVENT, handler);
  }, []);

  const activeCharacter = characterProp ?? savedCharacter;
  const isPointing = mood === 'pointing' && !sleeping;
  const isSuccess = (mood === 'celebrate' || mood === 'success') && !sleeping;
  const isWarning = mood === 'warning' && !sleeping;
  const isError = mood === 'error' && !sleeping;
  const isThinking = mood === 'thinking' && !sleeping;

  const reactionClass =
    mood === 'success' && !sleeping
      ? 'mascot-react-success'
      : mood === 'error' && !sleeping
      ? 'mascot-react-error'
      : '';

  const viewBox =
    activeCharacter === 'charcoal'
      ? '0 0 100 96'
      : activeCharacter === 'mee'
      ? '0 0 128 96'
      : '0 0 174 96';

  const aspectWidth =
    activeCharacter === 'charcoal'
      ? Math.round(size * (100 / 96))
      : activeCharacter === 'mee'
      ? Math.round(size * (128 / 96))
      : Math.round(size * (174 / 96));

  const renderCharcoal = (offsetX = 0) => (
    <g transform={`translate(${offsetX}, 0)`}>
      {/* Ground shadow */}
      <ellipse cx="50" cy="88" rx="31" ry="4.5" fill="#09090B" fillOpacity="0.18" />

      {/* Tiny wagging / droopy / tense black tail */}
      <path
        d={
          isError
            ? 'M78 71 Q86 76 83 82'
            : isWarning
            ? 'M78 66 Q89 59 89 51'
            : isSuccess || isPointing
            ? 'M79 65 Q91 54 88 46'
            : 'M78 68 Q88 64 87 57'
        }
        stroke="#18181B"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Very chubby plump all-black potato body */}
      <ellipse
        cx="50"
        cy="63"
        rx="32"
        ry="23"
        fill={`url(#${charcoalGradId})`}
        stroke="#3F3F46"
        strokeWidth="1.4"
      />
      {/* Subtle glossy belly contour */}
      <ellipse cx="50" cy="66" rx="20" ry="13" fill="#27272A" fillOpacity="0.55" />

      {/* Stubby chubby black paws */}
      <ellipse cx="32" cy="82" rx="7.5" ry="4.5" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      <ellipse cx="68" cy="82" rx="7.5" ry="4.5" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      {isSuccess && (
        <ellipse
          cx="19"
          cy="54"
          rx="6"
          ry="4.5"
          transform="rotate(-25 19 54)"
          fill="#18181B"
          stroke="#3F3F46"
          strokeWidth="1.2"
        />
      )}

      {/* Collar */}
      <path d="M29 52 Q50 58 71 52" stroke="#0EA5E9" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="50" cy="57" r="3" fill="#FBBF24" stroke="#B45309" strokeWidth="0.9" />

      {/* Floppy charcoal ears */}
      <path
        d={
          isError
            ? 'M26 35 Q11 40 16 53 Q21 56 27 46 Z'
            : isWarning
            ? 'M26 28 Q11 17 14 34 Q18 41 26 39 Z'
            : isSuccess || isPointing
            ? 'M26 30 Q12 22 15 39 Q18 46 26 42 Z'
            : 'M26 32 Q13 32 16 46 Q20 51 27 44 Z'
        }
        fill="#09090B"
        stroke="#3F3F46"
        strokeWidth="1.3"
      />
      <path
        d={
          isError
            ? 'M74 35 Q89 40 84 53 Q79 56 73 46 Z'
            : isWarning
            ? 'M74 28 Q89 17 86 34 Q82 41 74 39 Z'
            : isSuccess || isPointing
            ? 'M74 30 Q88 22 85 39 Q82 46 74 42 Z'
            : 'M74 32 Q87 32 84 46 Q80 51 73 44 Z'
        }
        fill="#09090B"
        stroke="#3F3F46"
        strokeWidth="1.3"
      />

      {/* Big round chubby head */}
      <ellipse
        cx="50"
        cy="36"
        rx="25.5"
        ry="21"
        fill={`url(#${charcoalGradId})`}
        stroke="#3F3F46"
        strokeWidth="1.4"
      />

      {/* Subtle top fur shine */}
      <path d="M40 20 Q50 17 60 20" stroke="#52525B" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />

      {/* Eyes & Brows */}
      {sleeping ? (
        <>
          <path d="M35 35 Q40 39 45 35" stroke="#E4E4E7" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M55 35 Q60 39 65 35" stroke="#E4E4E7" strokeWidth="2.3" strokeLinecap="round" />
        </>
      ) : isSuccess ? (
        <>
          <path d="M35 36 Q40 30 45 36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M55 36 Q60 30 65 36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : isError ? (
        <>
          {/* Furrowed worried brows + squeezed > < eyes */}
          <path d="M34 26.5 L44 29.5" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M66 26.5 L56 29.5" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M35 31.5 L43.5 35 L35 38.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M65 31.5 L56.5 35 L65 38.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Sweat drop on chubby cheek/temple */}
          <path d="M71 22 Q74.5 27.5 71 30.5 Q67.5 27.5 71 22 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.6" />
        </>
      ) : isWarning ? (
        <>
          {/* Alert raised/slanted eyebrows + wide eyes */}
          <path d="M34 27.5 Q39.5 24 44.5 26.5" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M66 27.5 Q60.5 24 55.5 26.5" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="40" cy="34.5" r="5.2" fill="#FFFFFF" />
          <circle cx="60" cy="34.5" r="5.2" fill="#FFFFFF" />
          <circle cx="40" cy="34.5" r="2.3" fill="#09090B" />
          <circle cx="60" cy="34.5" r="2.3" fill="#09090B" />
          <circle cx="41.1" cy="33.2" r="1" fill="#FFFFFF" />
          <circle cx="61.1" cy="33.2" r="1" fill="#FFFFFF" />
        </>
      ) : (
        <g className="mascot-blink">
          <circle cx="40" cy="34.5" r="4.8" fill="#FFFFFF" />
          <circle cx="60" cy="34.5" r="4.8" fill="#FFFFFF" />
          <circle cx={isThinking ? 41.2 : isPointing ? 41.6 : 40.2} cy={isThinking ? 33.2 : 34.5} r="3.1" fill="#09090B" />
          <circle cx={isThinking ? 61.2 : isPointing ? 61.6 : 60.2} cy={isThinking ? 33.2 : 34.5} r="3.1" fill="#09090B" />
          <circle cx="41.4" cy="33" r="1.2" fill="#FFFFFF" />
          <circle cx="61.4" cy="33" r="1.2" fill="#FFFFFF" />
        </g>
      )}

      {/* Soft rosy cheeks on chubby face */}
      <ellipse cx="30.5" cy="42" rx="3.8" ry="2.1" fill="#FB7185" fillOpacity={isError ? 0.32 : 0.48} />
      <ellipse cx="69.5" cy="42" rx="3.8" ry="2.1" fill="#FB7185" fillOpacity={isError ? 0.32 : 0.48} />

      {/* Rounded muzzle */}
      <ellipse cx="50" cy="44.5" rx="11.5" ry="7.8" fill="#27272A" stroke="#3F3F46" strokeWidth="1" />
      {/* Glossy nose */}
      <ellipse cx="50" cy="41" rx="4.4" ry="3" fill="#09090B" />
      <ellipse cx="48.8" cy="40.1" rx="1.4" ry="0.8" fill="#A1A1AA" opacity="0.7" />

      {/* Mouth & Cute Pink Tongue */}
      {isError ? (
        <path
          d="M44 48.5 Q47.2 45.6 50 48.2 Q52.8 45.6 56 48.5"
          stroke="#E4E4E7"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : isWarning ? (
        <ellipse
          cx="50"
          cy="47.4"
          rx="3"
          ry="2.3"
          fill="#09090B"
          stroke="#E4E4E7"
          strokeWidth="1.4"
        />
      ) : (
        <>
          <path d="M44 46.5 Q47.5 49 50 46.2 Q52.5 49 56 46.5" stroke="#E4E4E7" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M48 47.6 Q50 52.2 52.5 47.6 Z" fill="#FB7185" />
        </>
      )}

      {/* Iconic Cute Protruding Left Fang (เขี้ยวข้างซ้ายเหยินออกมา) */}
      <path
        d="M39.5 46.8 L41.5 39.2 L44.8 46 Z"
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
  );

  const renderMee = (offsetX = 0) => (
    <g transform={`translate(${offsetX}, 0)`}>
      {/* Long sausage-dog ground shadow */}
      <ellipse cx="66" cy="88" rx="44" ry="4.5" fill="#09090B" fillOpacity="0.18" />

      {/* Perky / tense / droopy wagging dachshund tail (black with warm brown underside) */}
      <path
        d={
          isError
            ? 'M105 62 Q115 70 112 79'
            : isWarning
            ? 'M105 55 Q122 41 120 27'
            : isSuccess || isPointing
            ? 'M105 56 Q120 41 117 29'
            : 'M105 58 Q119 48 118 37'
        }
        stroke="#18181B"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d={
          isError
            ? 'M106 64 Q113 71 111 77'
            : isWarning
            ? 'M106 57 Q119 46 118 33'
            : isSuccess || isPointing
            ? 'M106 58 Q117 47 116 36'
            : 'M106 60 Q117 52 117 43'
        }
        stroke="#D97706"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Back & front short dachshund legs with tan paws */}
      <rect x="86" y="68" width="9.5" height="16" rx="4.5" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      <ellipse cx="90.5" cy="83.5" rx="6" ry="3.4" fill="#D97706" />

      <rect x="40" y="68" width="9.5" height="16" rx="4.5" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      <ellipse cx="44.5" cy="83.5" rx="6" ry="3.4" fill="#D97706" />

      {/* Long Sausage Torso (ลำตัวยาว / หมาไส้กรอก) */}
      <rect
        x="28"
        y="46"
        width="80"
        height="27"
        rx="13.5"
        fill={`url(#${meeGradId})`}
        stroke="#3F3F46"
        strokeWidth="1.4"
      />

      {/* Belly subtle tan trim */}
      <path d="M52 72 Q76 73 94 69" stroke="#B45309" strokeWidth="3" strokeLinecap="round" opacity="0.85" />

      {/* Front raised mischievous paw when celebrating/pointing */}
      {isSuccess || isPointing ? (
        <g>
          <path d="M35 66 Q20 60 18 52" stroke="#18181B" strokeWidth="7.5" strokeLinecap="round" />
          <circle cx="17" cy="51.5" r="4.2" fill="#D97706" />
        </g>
      ) : (
        <g>
          <rect x="30" y="67" width="9" height="17" rx="4.5" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
          <ellipse cx="33.5" cy="84" rx="5.8" ry="3.3" fill="#D97706" />
        </g>
      )}

      {/* White + Brown Mixed Chest Patch (อกสีขาวปนน้ำตาล) */}
      <path
        d="M27 50 Q23 63 32 72 Q46 74 52 62 Q48 48 33 47 Z"
        fill="#D97706"
        stroke="#B45309"
        strokeWidth="1"
      />
      <path
        d="M28 52 Q26 63 34 70 Q43 70 46 60 Q43 51 33 49 Z"
        fill="#FFFBEB"
      />
      {/* Warm tan swirl/speckle mixing into the white chest */}
      <path d="M32 61 Q36 65 42 62" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <circle cx="38" cy="56" r="2.2" fill="#D97706" opacity="0.7" />

      {/* Cheeky Red Collar */}
      <path d="M25 46 Q38 51 50 44" stroke="#E11D48" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="35" cy="49.5" r="2.6" fill="#FBBF24" />

      {/* Sleek Black Dachshund Head */}
      <ellipse
        cx="35"
        cy="32"
        rx="20.5"
        ry="17.5"
        fill={`url(#${meeGradId})`}
        stroke="#3F3F46"
        strokeWidth="1.4"
      />

      {/* Dachshund Long Snout (black & tan) */}
      <path
        d="M22 31 Q8 32 8 39 Q8 45 25 44 Z"
        fill="#18181B"
        stroke="#3F3F46"
        strokeWidth="1.2"
      />
      <path d="M12 40.5 Q18 44 27 42.5" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
      {/* Glossy tip nose */}
      <ellipse cx="9.5" cy="36.2" rx="3.4" ry="2.6" fill="#09090B" />
      <circle cx="8.8" cy="35.3" r="0.9" fill="#A1A1AA" />

      {/* Long Floppy Ear (back side) */}
      <path
        d={
          isError
            ? 'M43 26 Q54 37 51 54 Q45 56 41 44 Z'
            : isWarning || isPointing
            ? 'M43 22 Q58 26 56 44 Q52 50 45 43 Z'
            : 'M43 24 Q55 31 53 48 Q47 52 42 42 Z'
        }
        fill="#09090B"
        stroke="#3F3F46"
        strokeWidth="1.3"
      />
      <path d="M46 31 Q51 37 49 44" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />

      {/* Signature Tan Dots Above Eyes ("หมา 4 ตา") adapting with mood */}
      <ellipse
        cx="23.5"
        cy={isWarning ? 21.8 : isError ? 24.4 : 23.5}
        rx="3.6"
        ry="2.2"
        transform={
          isWarning
            ? 'rotate(-10 23.5 21.8)'
            : isError
            ? 'rotate(22 23.5 24.4)'
            : 'rotate(14 23.5 23.5)'
        }
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="0.7"
      />
      <ellipse
        cx="36.5"
        cy={isWarning ? 21.8 : isError ? 24.4 : 23.5}
        rx="3.6"
        ry="2.2"
        transform={
          isWarning
            ? 'rotate(10 36.5 21.8)'
            : isError
            ? 'rotate(-22 36.5 24.4)'
            : 'rotate(-14 36.5 23.5)'
        }
        fill="#F59E0B"
        stroke="#B45309"
        strokeWidth="0.7"
      />

      {/* Eyes (cheeky / alert / dizzy expression) */}
      {sleeping ? (
        <>
          <path d="M20 30 Q23.5 33 27 30" stroke="#E4E4E7" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M33 30 Q36.5 33 40 30" stroke="#E4E4E7" strokeWidth="2.1" strokeLinecap="round" />
        </>
      ) : isSuccess ? (
        <>
          <path d="M20 31 Q23.5 26 27 31" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M33 31 Q36.5 26 40 31" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" />
        </>
      ) : isError ? (
        <>
          <path d="M20 27.5 L26 30.5 L20 33.5" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 27.5 L34 30.5 L40 33.5" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M47 17 Q50 22 47 24.5 Q44 22 47 17 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.5" />
        </>
      ) : isWarning ? (
        <>
          <circle cx="23.5" cy="30" r="4.3" fill="#FFFFFF" />
          <circle cx="36.5" cy="30" r="4.3" fill="#FFFFFF" />
          <circle cx="23.2" cy="30" r="2" fill="#09090B" />
          <circle cx="36.2" cy="30" r="2" fill="#09090B" />
          <circle cx="24" cy="29" r="0.9" fill="#FFFFFF" />
          <circle cx="37" cy="29" r="0.9" fill="#FFFFFF" />
        </>
      ) : (
        <g className="mascot-blink">
          <circle cx="23.5" cy="30" r="4" fill="#FFFFFF" />
          <circle cx="36.5" cy="30" r="4" fill="#FFFFFF" />
          <circle cx={isThinking ? 24.5 : 22.8} cy={isThinking ? 29 : 30.2} r="2.6" fill="#09090B" />
          <circle cx={isThinking ? 37.5 : 35.8} cy={isThinking ? 29 : 30.2} r="2.6" fill="#09090B" />
          <circle cx="23.9" cy="29" r="1" fill="#FFFFFF" />
          <circle cx="36.9" cy="29" r="1" fill="#FFFFFF" />
        </g>
      )}

      {/* Playful mischievous smirk / worried mouth / blep tongue */}
      {isError ? (
        <path d="M15.5 41.5 Q20.5 38.2 26 41.2" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
      ) : isWarning ? (
        <circle cx="20.5" cy="41.2" r="2.1" fill="#09090B" stroke="#FDE68A" strokeWidth="1.1" />
      ) : (
        <>
          <path d="M16 40 Q21 43 26 39" stroke="#FDE68A" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M18.5 41.2 Q20 45.8 22.5 41.2 Z" fill="#FB7185" />
        </>
      )}
    </g>
  );

  const badgeX = activeCharacter === 'duo' ? 160 : activeCharacter === 'mee' ? 114 : 86;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none mascot-float shrink-0 ${className}`}
      style={{ width: aspectWidth, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox={viewBox}
        className={`w-full h-full drop-shadow-sm overflow-visible ${reactionClass}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={charcoalGradId} x1="20" y1="16" x2="78" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#27272A" />
            <stop offset="55%" stopColor="#18181B" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
          <linearGradient id={meeGradId} x1="18" y1="18" x2="104" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#27272A" />
            <stop offset="60%" stopColor="#18181B" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
        </defs>

        {activeCharacter === 'charcoal' && renderCharcoal(0)}
        {activeCharacter === 'mee' && renderMee(2)}
        {activeCharacter === 'duo' && (
          <>
            {/* Mee (sausage dog) slightly behind on the right so his long body shows clearly */}
            <g transform="translate(52, 4) scale(0.92)">
              {renderMee(0)}
            </g>
            {/* Chubby Charcoal on the left foreground */}
            <g transform="translate(-4, 2) scale(0.95)">
              {renderCharcoal(0)}
            </g>
          </>
        )}

        {/* Celebration & Success sparkles */}
        {isSuccess && (
          <>
            <path
              d="M12 14 L13.5 17.5 L17 19 L13.5 20.5 L12 24 L10.5 20.5 L7 19 L10.5 17.5 Z"
              fill={mood === 'success' ? '#10B981' : '#FBBF24'}
            />
            <path
              d={
                activeCharacter === 'duo'
                  ? 'M162 12 L163.2 14.8 L166 16 L163.2 17.2 L162 20 L160.8 17.2 L158 16 L160.8 14.8 Z'
                  : 'M88 12 L89.2 14.8 L92 16 L89.2 17.2 L88 20 L86.8 17.2 L84 16 L86.8 14.8 Z'
              }
              fill={mood === 'success' ? '#FBBF24' : '#38BDF8'}
            />
          </>
        )}

        {/* Warning alert indicator */}
        {isWarning && (
          <g transform={`translate(${badgeX}, 14)`}>
            <circle cx="0" cy="0" r="8.5" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="1.5" />
            <path d="M0 -4.2 V0.8" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
            <circle cx="0" cy="4" r="1.2" fill="#FFFFFF" />
          </g>
        )}

        {/* Error alert indicator */}
        {isError && (
          <g transform={`translate(${badgeX}, 14)`}>
            <circle cx="0" cy="0" r="8.5" fill="#E11D48" stroke="#FFF1F2" strokeWidth="1.5" />
            <path d="M-3.2 -3.2 L3.2 3.2 M3.2 -3.2 L-3.2 3.2" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Sleeping Zzz */}
        {sleeping && (
          <text
            x={activeCharacter === 'duo' ? 142 : activeCharacter === 'mee' ? 100 : 76}
            y="20"
            fill="#64748B"
            fontSize="11"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            Zzz
          </text>
        )}
      </svg>
    </div>
  );
};
