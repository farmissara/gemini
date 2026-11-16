import React, { useEffect, useId, useState } from 'react';
import { MascotMood } from '../../data/interactiveGuideTopics';

export type MascotCharacter = 'flock' | 'duo' | 'charcoal' | 'mee';

const MASCOT_STORAGE_KEY = 'eduverse_mascot_character';
const MASCOT_CHANGE_EVENT = 'eduverse:mascot-character-changed';

export function getSavedMascotCharacter(): MascotCharacter {
  if (typeof window === 'undefined') return 'flock';
  const stored = window.localStorage.getItem(MASCOT_STORAGE_KEY);
  if (
    stored === 'flock' ||
    stored === 'charcoal' ||
    stored === 'mee' ||
    stored === 'duo'
  ) {
    return stored;
  }
  return 'flock';
}

export function setSavedMascotCharacter(next: MascotCharacter): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MASCOT_STORAGE_KEY, next);
    window.dispatchEvent(
      new CustomEvent<MascotCharacter>(MASCOT_CHANGE_EVENT, { detail: next })
    );
  } catch {
    // ignore storage errors
  }
}

export interface MascotCharacterRenderProps {
  mood?: MascotMood;
  sleeping?: boolean;
  running?: boolean;
  gradId: string;
}

export const CharcoalSvgGroup: React.FC<
  MascotCharacterRenderProps & { transform?: string }
> = ({ mood = 'happy', sleeping = false, running = false, gradId, transform }) => {
  const isPointing = mood === 'pointing' && !sleeping;
  const isSuccess = (mood === 'celebrate' || mood === 'success') && !sleeping;
  const isWarning = mood === 'warning' && !sleeping;
  const isError = mood === 'error' && !sleeping;
  const isConcerned = mood === 'concerned' && !sleeping;
  const isThinking = mood === 'thinking' && !sleeping;
  const isActiveRun = running && !sleeping;

  return (
    <g transform={transform}>
      {/* Ground shadow (pulses during gallop) */}
      <ellipse
        cx="50"
        cy="89"
        rx="33"
        ry="5"
        fill="#09090B"
        fillOpacity="0.2"
        className={isActiveRun ? 'mascot-shadow-pulse' : ''}
      />

      {/* Far-side legs (darker silhouettes behind body for natural 3D gait) */}
      <g className={isActiveRun ? 'mascot-leg-br' : ''}>
        <ellipse
          cx={isActiveRun ? 65 : 64}
          cy={isActiveRun ? 80 : 81.5}
          rx="7.2"
          ry="4.4"
          fill="#09090B"
          stroke="#52525B"
          strokeWidth="1.1"
        />
      </g>
      <g className={isActiveRun ? 'mascot-leg-fr' : ''}>
        <ellipse
          cx={isActiveRun ? 37 : 36}
          cy={isActiveRun ? 80 : 81.5}
          rx="7.2"
          ry="4.4"
          fill="#09090B"
          stroke="#52525B"
          strokeWidth="1.1"
        />
      </g>

      {/* Wagging / droopy / tense black tail (idle gentle wag vs excited fast wag) */}
      <g
        className={
          sleeping || isError || isConcerned
            ? ''
            : isActiveRun || isSuccess || isPointing
            ? 'mascot-tail-wag'
            : 'mascot-tail-wag-idle'
        }
      >
        <path
          d={
            isError
              ? 'M79 71 Q87 76 84 82'
              : isConcerned
              ? 'M79 70 Q87 73 86 78'
              : isWarning
              ? 'M79 66 Q90 58 90 50'
              : isSuccess || isPointing || isActiveRun
              ? 'M80 65 Q93 52 90 43'
              : 'M79 68 Q89 63 88 55'
          }
          stroke="#18181B"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d={
            isError
              ? 'M79 71 Q87 76 84 82'
              : isConcerned
              ? 'M79 70 Q87 73 86 78'
              : isWarning
              ? 'M79 66 Q90 58 90 50'
              : isSuccess || isPointing || isActiveRun
              ? 'M80 65 Q93 52 90 43'
              : 'M79 68 Q89 63 88 55'
          }
          stroke="#52525B"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>

      {/* Chubby body + breathing/gallop + collar */}
      <g className={sleeping ? 'mascot-sleep-breathe' : isActiveRun ? 'mascot-gallop-body' : 'mascot-breathe'}>
        <ellipse
          cx="50"
          cy="63"
          rx="34"
          ry="24.5"
          fill={`url(#${gradId})`}
          stroke="#71717A"
          strokeWidth="1.7"
        />
        <ellipse cx="50" cy="66" rx="22" ry="14" fill="#3F3F46" fillOpacity="0.45" />

        {/* Bright Sky-Blue Collar + Swinging Gold Bell */}
        <path d="M27 52 Q50 59 73 52" stroke="#0EA5E9" strokeWidth="4.2" strokeLinecap="round" />
        <g className={!sleeping ? 'mascot-bell-swing' : ''}>
          <circle cx="50" cy="57.5" r="3.6" fill="#FBBF24" stroke="#B45309" strokeWidth="1" />
        </g>
      </g>

      {/* Near-side chubby black paws (4-beat gallop when running) */}
      <g className={isActiveRun ? 'mascot-leg-fl' : ''}>
        <ellipse
          cx={isActiveRun ? 29 : 32}
          cy={isActiveRun ? 80 : 83}
          rx="8"
          ry="4.8"
          fill="#18181B"
          stroke="#71717A"
          strokeWidth="1.4"
        />
      </g>
      <g className={isActiveRun ? 'mascot-leg-bl' : ''}>
        <ellipse
          cx={isActiveRun ? 71 : 68}
          cy={isActiveRun ? 80 : 83}
          rx="8"
          ry="4.8"
          fill="#18181B"
          stroke="#71717A"
          strokeWidth="1.4"
        />
      </g>
      {isSuccess && !isActiveRun && (
        <ellipse
          cx="18"
          cy="54"
          rx="6.5"
          ry="4.8"
          transform="rotate(-25 18 54)"
          fill="#18181B"
          stroke="#71717A"
          strokeWidth="1.4"
        />
      )}

      {/* Articulated Head Assembly (curious tilt / running bob / sleeping settle) */}
      <g className={sleeping ? 'mascot-sleep-breathe' : isActiveRun ? 'mascot-head-bob' : !isError ? 'mascot-head-curious' : ''}>
        {/* Floppy charcoal ears with independent twitch/flop */}
        <g className={sleeping ? '' : isActiveRun ? 'mascot-ear-flop-l' : 'mascot-ear-twitch-l'}>
          <path
            d={
              isError
                ? 'M25 35 Q10 40 15 54 Q20 57 26 46 Z'
                : isConcerned
                ? 'M25 34 Q11 38 15 51 Q20 55 26 45 Z'
                : isWarning
                ? 'M25 27 Q10 16 13 33 Q17 41 25 39 Z'
                : isSuccess || isPointing || isActiveRun
                ? 'M25 29 Q10 21 14 38 Q18 46 25 42 Z'
                : 'M25 31 Q12 31 15 46 Q19 52 26 44 Z'
            }
            fill="#18181B"
            stroke="#71717A"
            strokeWidth="1.5"
          />
        </g>
        <g className={sleeping ? '' : isActiveRun ? 'mascot-ear-flop-r' : 'mascot-ear-twitch-r'}>
          <path
            d={
              isError
                ? 'M75 35 Q90 40 85 54 Q80 57 74 46 Z'
                : isConcerned
                ? 'M75 34 Q89 38 85 51 Q80 55 74 45 Z'
                : isWarning
                ? 'M75 27 Q90 16 87 33 Q83 41 75 39 Z'
                : isSuccess || isPointing || isActiveRun
                ? 'M75 29 Q90 21 86 38 Q82 46 75 42 Z'
                : 'M75 31 Q88 31 85 46 Q81 52 74 44 Z'
            }
            fill="#18181B"
            stroke="#71717A"
            strokeWidth="1.5"
          />
        </g>

        {/* Big round chubby head */}
        <ellipse
          cx="50"
          cy="35.5"
          rx="26.5"
          ry="21.5"
          fill={`url(#${gradId})`}
          stroke="#71717A"
          strokeWidth="1.7"
        />

        {/* Top fur shine */}
        <path
          d="M39 19.5 Q50 16.5 61 19.5"
          stroke="#A1A1AA"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Eyes & Brows */}
        {sleeping ? (
          <>
            <path d="M34 34.5 Q39.5 39 45 34.5" stroke="#E4E4E7" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M55 34.5 Q60.5 39 66 34.5" stroke="#E4E4E7" strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : isSuccess ? (
          <>
            <path d="M34 35.5 Q39.5 29 45 35.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M55 35.5 Q60.5 29 66 35.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </>
        ) : isError ? (
          <>
            <path d="M33 26 L44 29" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" />
            <path d="M67 26 L56 29" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" />
            <path d="M34 31 L43 34.5 L34 38" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M66 31 L57 34.5 L66 38" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M72 21 Q75.5 27 72 30 Q68.5 27 72 21 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.7" />
          </>
        ) : isConcerned ? (
          <g className="mascot-blink">
            <path d="M33 28.5 L44 25" stroke="#FBBF24" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M67 28.5 L56 25" stroke="#FBBF24" strokeWidth="2.1" strokeLinecap="round" />
            <circle cx="39.5" cy="34.5" r="5.3" fill="#FFFFFF" />
            <circle cx="60.5" cy="34.5" r="5.3" fill="#FFFFFF" />
            <circle cx="39.5" cy="35.3" r="3" fill="#09090B" />
            <circle cx="60.5" cy="35.3" r="3" fill="#09090B" />
            <circle cx="38.2" cy="33.4" r="1.4" fill="#FFFFFF" />
            <circle cx="59.2" cy="33.4" r="1.4" fill="#FFFFFF" />
            <circle cx="41" cy="36.2" r="0.8" fill="#FFFFFF" />
            <circle cx="62" cy="36.2" r="0.8" fill="#FFFFFF" />
            <path d="M72 22 Q75 27 72 29.8 Q69 27 72 22 Z" fill="#7DD3FC" stroke="#E0F2FE" strokeWidth="0.6" />
          </g>
        ) : isWarning ? (
          <g className="mascot-blink">
            <path d="M33 27 Q39.5 23 45 26" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
            <path d="M67 27 Q60.5 23 55 26" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
            <circle cx="39.5" cy="34" r="5.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="34" r="5.5" fill="#FFFFFF" />
            <circle cx="39.5" cy="34" r="2.5" fill="#09090B" />
            <circle cx="60.5" cy="34" r="2.5" fill="#09090B" />
            <circle cx="40.8" cy="32.6" r="1.1" fill="#FFFFFF" />
            <circle cx="61.8" cy="32.6" r="1.1" fill="#FFFFFF" />
          </g>
        ) : (
          <g className="mascot-blink">
            <circle cx="39.5" cy="34" r="5.2" fill="#FFFFFF" />
            <circle cx="60.5" cy="34" r="5.2" fill="#FFFFFF" />
            <g className={!isThinking && !isActiveRun ? 'mascot-pupil-glance' : ''}>
              <circle
                cx={isThinking ? 40.8 : isPointing || isActiveRun ? 41.2 : 39.8}
                cy={isThinking ? 32.6 : 34}
                r="3.3"
                fill="#09090B"
              />
              <circle
                cx={isThinking ? 61.8 : isPointing || isActiveRun ? 62.2 : 60.8}
                cy={isThinking ? 32.6 : 34}
                r="3.3"
                fill="#09090B"
              />
              <circle cx="41" cy="32.4" r="1.3" fill="#FFFFFF" />
              <circle cx="62" cy="32.4" r="1.3" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* Rosy cheeks */}
        <ellipse cx="29.5" cy="41.5" rx="4.2" ry="2.4" fill="#FB7185" fillOpacity={isError || isConcerned ? 0.35 : 0.56} />
        <ellipse cx="70.5" cy="41.5" rx="4.2" ry="2.4" fill="#FB7185" fillOpacity={isError || isConcerned ? 0.35 : 0.56} />

        {/* Rounded muzzle */}
        <ellipse cx="50" cy="44" rx="12.2" ry="8.2" fill="#27272A" stroke="#52525B" strokeWidth="1.1" />
        {/* Glossy nose with natural sniffing */}
        <g className={!sleeping ? 'mascot-nose-sniff' : ''}>
          <ellipse cx="50" cy="40.5" rx="4.8" ry="3.2" fill="#09090B" />
          <ellipse cx="48.6" cy="39.5" rx="1.6" ry="0.9" fill="#D4D4D8" opacity="0.75" />
        </g>

        {/* Mouth & Panting Pink Tongue */}
        {isError ? (
          <path
            d="M43.5 48.2 Q47 45.2 50 48 Q53 45.2 56.5 48.2"
            stroke="#E4E4E7"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        ) : isConcerned ? (
          <path
            d="M44.2 48.2 Q50 44.6 55.8 48.2"
            stroke="#E4E4E7"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        ) : isWarning ? (
          <ellipse
            cx="50"
            cy="47.2"
            rx="3.2"
            ry="2.5"
            fill="#09090B"
            stroke="#E4E4E7"
            strokeWidth="1.5"
          />
        ) : (
          <>
            <path d="M43.5 46 Q47.2 48.8 50 45.8 Q52.8 48.8 56.5 46" stroke="#E4E4E7" strokeWidth="1.9" strokeLinecap="round" />
            <g className={isActiveRun ? 'mascot-tongue-pant' : ''}>
              <path d="M47.8 47.4 Q50 52.8 52.8 47.4 Z" fill="#FB7185" />
            </g>
          </>
        )}

        {/* Iconic Prominent Protruding Left Snaggletooth (เขี้ยวข้างซ้ายเหยินออกมา) */}
        <path
          d="M38 46.6 L40.6 37.6 L44.4 45.6 Z"
          fill="#FFFFFF"
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
};

export const MeeSvgGroup: React.FC<
  MascotCharacterRenderProps & { transform?: string }
> = ({ mood = 'happy', sleeping = false, running = false, gradId, transform }) => {
  const isPointing = mood === 'pointing' && !sleeping;
  const isSuccess = (mood === 'celebrate' || mood === 'success') && !sleeping;
  const isWarning = mood === 'warning' && !sleeping;
  const isError = mood === 'error' && !sleeping;
  const isConcerned = mood === 'concerned' && !sleeping;
  const isThinking = mood === 'thinking' && !sleeping;
  const isActiveRun = running && !sleeping;

  return (
    <g transform={transform}>
      {/* Long sausage-dog ground shadow */}
      <ellipse
        cx="66"
        cy="89"
        rx="46"
        ry="5"
        fill="#09090B"
        fillOpacity="0.2"
        className={isActiveRun ? 'mascot-shadow-pulse' : ''}
      />

      {/* Wagging dachshund tail */}
      <g
        className={
          sleeping || isError || isConcerned
            ? ''
            : isActiveRun || isSuccess || isPointing
            ? 'mascot-tail-wag'
            : 'mascot-tail-wag-idle'
        }
      >
        <path
          d={
            isError
              ? 'M105 62 Q115 70 112 79'
              : isConcerned
              ? 'M105 61 Q115 66 113 73'
              : isWarning
              ? 'M105 55 Q122 41 120 27'
              : isSuccess || isPointing || isActiveRun
              ? 'M105 56 Q121 40 118 27'
              : 'M105 58 Q119 48 118 37'
          }
          stroke="#18181B"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={
            isError
              ? 'M106 64 Q113 71 111 77'
              : isConcerned
              ? 'M106 63 Q114 67 112 72'
              : isWarning
              ? 'M106 57 Q119 46 118 33'
              : isSuccess || isPointing || isActiveRun
              ? 'M106 58 Q118 46 117 34'
              : 'M106 60 Q117 52 117 43'
          }
          stroke="#F59E0B"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>

      {/* Far-side dachshund legs (darkened behind torso for depth & cross-step gait) */}
      <g className={isActiveRun ? 'mascot-dachshund-leg-a' : ''}>
        <rect x="93" y="67" width="9" height="16" rx="4.2" fill="#09090B" stroke="#52525B" strokeWidth="1.1" />
        <ellipse cx="97.5" cy="82.5" rx="5.8" ry="3.3" fill="#B45309" />
      </g>
      <g className={isActiveRun ? 'mascot-dachshund-leg-b' : ''}>
        <rect x="41" y="67" width="9" height="16" rx="4.2" fill="#09090B" stroke="#52525B" strokeWidth="1.1" />
        <ellipse cx="45.5" cy="82.5" rx="5.8" ry="3.3" fill="#B45309" />
      </g>

      {/* Near-side rear dachshund leg */}
      <g className={isActiveRun ? 'mascot-dachshund-leg-b' : ''}>
        <rect x="85" y="68" width="10" height="16" rx="4.5" fill="#18181B" stroke="#71717A" strokeWidth="1.3" />
        <ellipse cx="90" cy="83.5" rx="6.4" ry="3.6" fill="#F59E0B" stroke="#B45309" strokeWidth="0.7" />
      </g>

      {/* Extra-Long Sausage Torso with spine flex / breathing */}
      <g className={sleeping ? 'mascot-sleep-breathe' : isActiveRun ? 'mascot-spine-flex' : 'mascot-breathe'}>
        <rect
          x="26"
          y="46"
          width="83"
          height="27"
          rx="13.5"
          fill={`url(#${gradId})`}
          stroke="#71717A"
          strokeWidth="1.6"
        />

        {/* Belly warm tan contour */}
        <path d="M52 72 Q76 73 96 69" stroke="#D97706" strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />

        {/* White + Brown Mixed Chest Patch (อกสีขาวปนน้ำตาล) */}
        <path
          d="M25 50 Q21 63 31 72 Q46 74 52 62 Q48 48 32 47 Z"
          fill="#D97706"
          stroke="#B45309"
          strokeWidth="1.1"
        />
        <path
          d="M27 52 Q25 63 33 70 Q43 70 46 60 Q43 51 32 49 Z"
          fill="#FFFBEB"
        />
        <path d="M31 61 Q36 65 42 62" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        <circle cx="38" cy="56" r="2.4" fill="#D97706" opacity="0.75" />

        {/* Cheeky Red Collar + swinging bell */}
        <path d="M24 46 Q38 51 50 44" stroke="#E11D48" strokeWidth="3.6" strokeLinecap="round" />
        <g className={!sleeping ? 'mascot-bell-swing' : ''}>
          <circle cx="35" cy="49.5" r="3" fill="#FBBF24" stroke="#B45309" strokeWidth="0.7" />
        </g>
      </g>

      {/* Near-side front paw (running stride vs playful raised paw vs standing) */}
      {!isActiveRun && (isSuccess || isPointing) ? (
        <g>
          <path d="M35 66 Q18 59 16 50" stroke="#18181B" strokeWidth="8" strokeLinecap="round" />
          <circle cx="15" cy="49.5" r="4.6" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
        </g>
      ) : (
        <g className={isActiveRun ? 'mascot-dachshund-leg-a' : ''}>
          <rect x="29" y="67" width="9.5" height="17" rx="4.5" fill="#18181B" stroke="#71717A" strokeWidth="1.3" />
          <ellipse cx="33" cy="84" rx="6.2" ry="3.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.7" />
        </g>
      )}

      {/* Articulated Dachshund Head Assembly */}
      <g className={sleeping ? 'mascot-sleep-breathe' : isActiveRun ? 'mascot-head-bob' : !isError ? 'mascot-head-curious' : ''}>
        {/* Sleek Black Dachshund Head */}
        <ellipse
          cx="35"
          cy="32"
          rx="21"
          ry="18"
          fill={`url(#${gradId})`}
          stroke="#71717A"
          strokeWidth="1.6"
        />

        {/* Dachshund Long Snout */}
        <path
          d="M22 31 Q7 32 7 39 Q7 45 25 44 Z"
          fill="#18181B"
          stroke="#71717A"
          strokeWidth="1.3"
        />
        <path d="M11 40.5 Q18 44 27 42.5" stroke="#F59E0B" strokeWidth="3.2" strokeLinecap="round" />
        <g className={!sleeping ? 'mascot-nose-sniff' : ''}>
          <ellipse cx="8.8" cy="36.2" rx="3.6" ry="2.8" fill="#09090B" />
          <circle cx="8" cy="35.3" r="1" fill="#D4D4D8" />
        </g>

        {/* Long Floppy Ear with lively dangle/twitch */}
        <g className={sleeping ? '' : isActiveRun ? 'mascot-ear-dangle' : 'mascot-ear-dangle-idle'}>
          <path
            d={
              isError
                ? 'M43 26 Q55 37 52 55 Q46 57 41 44 Z'
                : isConcerned
                ? 'M43 26 Q54 35 51 52 Q46 55 41 43 Z'
                : isWarning || isPointing || isActiveRun
                ? 'M43 21 Q60 24 58 43 Q53 49 45 43 Z'
                : 'M43 24 Q56 31 54 49 Q48 53 42 42 Z'
            }
            fill="#18181B"
            stroke="#71717A"
            strokeWidth="1.5"
          />
          <path d="M46 31 Q52 37 50 44" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* Iconic Signature Bright Brown Eyebrow Dots ("หมา 4 ตา") */}
        <ellipse
          cx="23.5"
          cy={isWarning ? 21.2 : isError ? 24 : isConcerned ? 22.2 : 23}
          rx="4"
          ry="2.5"
          transform={
            isWarning
              ? 'rotate(-10 23.5 21.2)'
              : isConcerned
              ? 'rotate(-18 23.5 22.2)'
              : isError
              ? 'rotate(22 23.5 24)'
              : 'rotate(14 23.5 23)'
          }
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth="0.9"
        />
        <ellipse
          cx="36.5"
          cy={isWarning ? 21.2 : isError ? 24 : isConcerned ? 22.2 : 23}
          rx="4"
          ry="2.5"
          transform={
            isWarning
              ? 'rotate(10 36.5 21.2)'
              : isConcerned
              ? 'rotate(18 36.5 22.2)'
              : isError
              ? 'rotate(-22 36.5 24)'
              : 'rotate(-14 36.5 23)'
          }
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth="0.9"
        />

        {/* Eyes */}
        {sleeping ? (
          <>
            <path d="M20 30 Q23.5 33 27 30" stroke="#E4E4E7" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M33 30 Q36.5 33 40 30" stroke="#E4E4E7" strokeWidth="2.3" strokeLinecap="round" />
          </>
        ) : isSuccess ? (
          <>
            <path d="M20 31 Q23.5 26 27 31" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M33 31 Q36.5 26 40 31" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : isError ? (
          <>
            <path d="M20 27.5 L26 30.5 L20 33.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M40 27.5 L34 30.5 L40 33.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M47 17 Q50 22 47 24.5 Q44 22 47 17 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.6" />
          </>
        ) : isConcerned ? (
          <g className="mascot-blink">
            <circle cx="23.5" cy="30.4" r="4.5" fill="#FFFFFF" />
            <circle cx="36.5" cy="30.4" r="4.5" fill="#FFFFFF" />
            <circle cx="23.2" cy="31.1" r="2.5" fill="#09090B" />
            <circle cx="36.2" cy="31.1" r="2.5" fill="#09090B" />
            <circle cx="22.3" cy="29.4" r="1.2" fill="#FFFFFF" />
            <circle cx="35.3" cy="29.4" r="1.2" fill="#FFFFFF" />
            <circle cx="24.3" cy="31.8" r="0.65" fill="#FFFFFF" />
            <circle cx="37.3" cy="31.8" r="0.65" fill="#FFFFFF" />
            <path d="M47 18 Q49.8 22.5 47 25 Q44.2 22.5 47 18 Z" fill="#7DD3FC" stroke="#E0F2FE" strokeWidth="0.6" />
          </g>
        ) : isWarning ? (
          <g className="mascot-blink">
            <circle cx="23.5" cy="30" r="4.5" fill="#FFFFFF" />
            <circle cx="36.5" cy="30" r="4.5" fill="#FFFFFF" />
            <circle cx="23.2" cy="30" r="2.1" fill="#09090B" />
            <circle cx="36.2" cy="30" r="2.1" fill="#09090B" />
            <circle cx="24" cy="29" r="1" fill="#FFFFFF" />
            <circle cx="37" cy="29" r="1" fill="#FFFFFF" />
          </g>
        ) : (
          <g className="mascot-blink">
            <circle cx="23.5" cy="30" r="4.3" fill="#FFFFFF" />
            <circle cx="36.5" cy="30" r="4.3" fill="#FFFFFF" />
            <g className={!isThinking && !isActiveRun ? 'mascot-pupil-glance' : ''}>
              <circle cx={isThinking ? 24.5 : 22.8} cy={isThinking ? 29 : 30.2} r="2.8" fill="#09090B" />
              <circle cx={isThinking ? 37.5 : 35.8} cy={isThinking ? 29 : 30.2} r="2.8" fill="#09090B" />
              <circle cx="23.9" cy="29" r="1.1" fill="#FFFFFF" />
              <circle cx="36.9" cy="29" r="1.1" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* Mouth / Blep / Panting tongue */}
        {isError ? (
          <path d="M15.5 41.5 Q20.5 38.2 26 41.2" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" />
        ) : isConcerned ? (
          <path d="M16.2 41.5 Q21 38.5 25.8 41.5" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" />
        ) : isWarning ? (
          <circle cx="20.5" cy="41.2" r="2.2" fill="#09090B" stroke="#FDE68A" strokeWidth="1.2" />
        ) : (
          <>
            <path d="M16 40 Q21 43 26 39" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" />
            <g className={isActiveRun ? 'mascot-tongue-pant' : ''}>
              <path d="M18.5 41.2 Q20 46 22.5 41.2 Z" fill="#FB7185" />
            </g>
          </>
        )}
      </g>
    </g>
  );
};

export const JidRidChickSvgGroup: React.FC<{
  transform?: string;
  variant?: 'leader' | 'chubby' | 'peeking' | 'speedy';
  flapping?: boolean;
  sleeping?: boolean;
  happyEyes?: boolean;
}> = ({
  transform,
  variant = 'leader',
  flapping = true,
  sleeping = false,
  happyEyes = false,
}) => {
  const bodyColor =
    variant === 'peeking'
      ? '#FEF08A'
      : variant === 'chubby'
      ? '#FDE047'
      : variant === 'speedy'
      ? '#FACC15'
      : '#FDE047';

  return (
    <g transform={transform}>
      {/* Ground shadow */}
      <ellipse
        cx="26"
        cy="48"
        rx="13"
        ry="2.8"
        fill="#09090B"
        fillOpacity="0.16"
        className={flapping && !sleeping ? 'mascot-shadow-pulse' : ''}
      />

      {/* Alternating little orange feet */}
      <g className={!sleeping && flapping ? 'mascot-chick-step-r' : ''}>
        <path d="M31 42 L33 47 M33 47 L30 48 M33 47 L36 47" stroke="#C2410C" strokeWidth="2.1" strokeLinecap="round" />
      </g>
      <g className={!sleeping && flapping ? 'mascot-chick-step-l' : ''}>
        <path d="M20 42 L18 47 M18 47 L15 47 M18 47 L20 48" stroke="#EA580C" strokeWidth="2.1" strokeLinecap="round" />
      </g>

      {/* Subtle far-side wing silhouette peeking on left */}
      <g className={flapping && !sleeping ? 'mascot-wing-flap' : ''}>
        <ellipse
          cx="15.5"
          cy="29.5"
          rx="4.2"
          ry="3"
          transform="rotate(24 15.5 29.5)"
          fill="#FACC15"
          stroke="#D97706"
          strokeWidth="1"
          opacity="0.88"
        />
      </g>

      {/* Breathing fluffy body + tail tuft */}
      <g className={sleeping ? 'mascot-sleep-breathe' : 'mascot-breathe'}>
        <path d="M39 29 Q45 25 43 32 Q46 33 40 35" fill={bodyColor} stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
        <ellipse
          cx="26"
          cy="31"
          rx={variant === 'chubby' ? 16 : 14.5}
          ry={variant === 'chubby' ? 13.5 : 12.5}
          fill={bodyColor}
          stroke="#D97706"
          strokeWidth="1.4"
        />
        <ellipse cx="23" cy="34" rx="9" ry="7.5" fill="#FEF9C3" fillOpacity="0.85" />
      </g>

      {/* Articulated Head + Pecking/Chirping Beak + Springing Top Feather Tuft */}
      <g className={!sleeping ? 'mascot-chick-head-peck' : 'mascot-sleep-breathe'}>
        <circle cx="24" cy="18" r="11.5" fill={bodyColor} stroke="#D97706" strokeWidth="1.4" />

        {/* Iconic JidRid Top Tuft Feather (ปอยผมลูกไก่จิ๊ดริ๊ด) */}
        <g className={flapping && !sleeping ? 'mascot-tuft-spring' : ''}>
          {variant === 'leader' ? (
            <path
              d="M23 7 Q21 1 26 4 Q28 0 29 7"
              fill="#FACC15"
              stroke="#D97706"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M24 7 Q25 2 28 6"
              stroke="#D97706"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Tiny rosy cheeks */}
        <ellipse cx="16.5" cy="20.5" rx="2.3" ry="1.4" fill="#FB7185" fillOpacity="0.6" />
        <ellipse cx="29.5" cy="20.5" rx="2.3" ry="1.4" fill="#FB7185" fillOpacity="0.6" />

        {/* Eyes */}
        {sleeping ? (
          <>
            <path d="M16 17 Q18 19 20 17" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M25 17 Q27 19 29 17" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
          </>
        ) : happyEyes ? (
          <>
            <path d="M16 17.5 Q18 14.5 20 17.5" stroke="#18181B" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M25 17.5 Q27 14.5 29 17.5" stroke="#18181B" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <g className="mascot-blink">
            <circle cx="18" cy="16.8" r="2.2" fill="#18181B" />
            <circle cx="27" cy="16.8" r="2.2" fill="#18181B" />
            <circle cx="17.3" cy="16" r="0.8" fill="#FFFFFF" />
            <circle cx="26.3" cy="16" r="0.8" fill="#FFFFFF" />
          </g>
        )}

        {/* Articulated upper + chirping lower orange beak */}
        <path d="M13 18.2 L8 20.3 L13.4 20.9 Z" fill="#F97316" stroke="#C2410C" strokeWidth="0.9" strokeLinejoin="round" />
        <g className={!sleeping ? 'mascot-beak-chirp' : ''}>
          <path d="M13.4 20.6 L9 21.1 L13.5 22.8 Z" fill="#FB923C" stroke="#C2410C" strokeWidth="0.85" strokeLinejoin="round" />
        </g>
      </g>

      {/* Near-side flapping wing */}
      <g className={flapping && !sleeping ? 'mascot-wing-flap' : ''}>
        <ellipse
          cx="31"
          cy="30"
          rx="6.2"
          ry="4.2"
          transform="rotate(-14 31 30)"
          fill="#FEF08A"
          stroke="#D97706"
          strokeWidth="1.2"
        />
      </g>
    </g>
  );
};

interface MascotAvatarProps {
  mood?: MascotMood;
  sleeping?: boolean;
  running?: boolean;
  size?: number;
  character?: MascotCharacter;
  className?: string;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood = 'happy',
  sleeping = false,
  running = false,
  size = 56,
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
      if (
        detail === 'flock' ||
        detail === 'duo' ||
        detail === 'charcoal' ||
        detail === 'mee'
      ) {
        setSavedCharacter(detail);
      } else {
        setSavedCharacter(getSavedMascotCharacter());
      }
    };
    window.addEventListener(MASCOT_CHANGE_EVENT, handler);
    return () => window.removeEventListener(MASCOT_CHANGE_EVENT, handler);
  }, []);

  const activeCharacter = characterProp ?? savedCharacter;
  const isSuccess = (mood === 'celebrate' || mood === 'success') && !sleeping;
  const isWarning = mood === 'warning' && !sleeping;
  const isError = mood === 'error' && !sleeping;
  const isConcerned = mood === 'concerned' && !sleeping;

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
      : activeCharacter === 'duo'
      ? '0 0 182 96'
      : '0 0 228 96';

  const aspectWidth =
    activeCharacter === 'charcoal'
      ? Math.round(size * (100 / 96))
      : activeCharacter === 'mee'
      ? Math.round(size * (128 / 96))
      : activeCharacter === 'duo'
      ? Math.round(size * (182 / 96))
      : Math.round(size * (228 / 96));

  const badgeX =
    activeCharacter === 'flock'
      ? 212
      : activeCharacter === 'duo'
      ? 166
      : activeCharacter === 'mee'
      ? 114
      : 86;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        running && !sleeping ? 'mascot-run-bounce' : sleeping ? '' : 'mascot-float'
      } shrink-0 ${className}`}
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
          <linearGradient id={charcoalGradId} x1="20" y1="14" x2="78" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3F3F46" />
            <stop offset="50%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
          <linearGradient id={meeGradId} x1="18" y1="18" x2="104" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3F3F46" />
            <stop offset="55%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
        </defs>

        {activeCharacter === 'charcoal' && (
          <CharcoalSvgGroup
            mood={mood}
            sleeping={sleeping}
            running={running}
            gradId={charcoalGradId}
          />
        )}
        {activeCharacter === 'mee' && (
          <MeeSvgGroup
            mood={mood}
            sleeping={sleeping}
            running={running}
            gradId={meeGradId}
            transform="translate(2, 0)"
          />
        )}
        {activeCharacter === 'duo' && (
          <>
            <MeeSvgGroup
              mood={mood}
              sleeping={sleeping}
              running={running}
              gradId={meeGradId}
              transform="translate(56, 3) scale(0.95)"
            />
            <CharcoalSvgGroup
              mood={mood}
              sleeping={sleeping}
              running={running}
              gradId={charcoalGradId}
              transform="translate(-2, 1) scale(0.97)"
            />
          </>
        )}
        {activeCharacter === 'flock' && (
          <>
            {/* Chubby Charcoal */}
            <g className={running && !sleeping ? 'mascot-run-bounce-slow' : ''}>
              <CharcoalSvgGroup
                mood={mood}
                sleeping={sleeping}
                running={running && !sleeping}
                gradId={charcoalGradId}
                transform="translate(124, 3) scale(0.92)"
              />
            </g>
            {/* Long Sausage Dog Mee */}
            <g className={running && !sleeping ? 'mascot-run-bounce' : ''}>
              <MeeSvgGroup
                mood={mood}
                sleeping={sleeping}
                running={running && !sleeping}
                gradId={meeGradId}
                transform="translate(46, 7) scale(0.88)"
              />
            </g>
            {/* Cute JidRid Chicks */}
            <g className={running && !sleeping ? 'mascot-chick-hop' : ''}>
              <JidRidChickSvgGroup
                variant="leader"
                flapping={running && !sleeping}
                sleeping={sleeping}
                happyEyes={isSuccess}
                transform="translate(2, 42) scale(0.9)"
              />
            </g>
            <g className={running && !sleeping ? 'mascot-chick-hop-alt' : ''}>
              <JidRidChickSvgGroup
                variant="chubby"
                flapping={running && !sleeping}
                sleeping={sleeping}
                happyEyes={isSuccess}
                transform="translate(28, 52) scale(0.76)"
              />
            </g>
          </>
        )}

        {/* Celebration & Success sparkles */}
        {isSuccess && (
          <>
            <path
              d="M10 12 L11.5 15.5 L15 17 L11.5 18.5 L10 22 L8.5 18.5 L5 17 L8.5 15.5 Z"
              fill={mood === 'success' ? '#10B981' : '#FBBF24'}
            />
            <path
              d={`M${badgeX - 6} 10 L${badgeX - 4.8} 12.8 L${badgeX - 2} 14 L${badgeX - 4.8} 15.2 L${badgeX - 6} 18 L${badgeX - 7.2} 15.2 L${badgeX - 10} 14 L${badgeX - 7.2} 12.8 Z`}
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

        {/* Concerned caring indicator */}
        {isConcerned && (
          <g transform={`translate(${badgeX}, 14)`}>
            <circle cx="0" cy="0" r="8.5" fill="#EA580C" stroke="#FFF7ED" strokeWidth="1.5" />
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
            x={badgeX - 16}
            y="20"
            fill="#64748B"
            fontSize="11"
            fontWeight="bold"
            fontFamily="sans-serif"
            className="mascot-zzz-float"
          >
            Zzz
          </text>
        )}
      </svg>
    </div>
  );
};
