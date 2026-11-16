import React, { useEffect, useId, useRef, useState } from 'react';
import { AppLanguage } from '../../types';
import {
  CharcoalSvgGroup,
  JidRidChickSvgGroup,
  MeeSvgGroup,
} from './MascotAvatar';
import { emitMascotDashboardEvent } from './InteractiveMascotGuide';

export const AMBIENT_MASCOTS_STORAGE_KEY = 'baanpakkru_ambient_mascots';
export const AMBIENT_MASCOTS_EVENT = 'baanpakkru:ambient-mascots-changed';

export function getSavedAmbientMascotsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(AMBIENT_MASCOTS_STORAGE_KEY);
  return raw !== '0';
}

export function setSavedAmbientMascotsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AMBIENT_MASCOTS_STORAGE_KEY, enabled ? '1' : '0');
    window.dispatchEvent(
      new CustomEvent<boolean>(AMBIENT_MASCOTS_EVENT, { detail: enabled })
    );
  } catch {
    // ignore storage errors
  }
}

interface AmbientWaypoint {
  id: string;
  xRatio: number;
  yRatio: number;
  labelTh: string;
  labelEn: string;
}

// Waypoints hugging dashboard outer edges & card border seams without blocking text
const EDGE_WAYPOINTS: AmbientWaypoint[] = [
  {
    id: 'top-right-border',
    xRatio: 0.86,
    yRatio: 0.04,
    labelTh: 'นั่งเฝ้าขอบการ์ดโต๊ะงานครู',
    labelEn: 'Sitting by Academic Desk border',
  },
  {
    id: 'center-seam',
    xRatio: 0.5,
    yRatio: 0.36,
    labelTh: 'เดินตรวจเส้นแบ่งกลางแดชบอร์ด',
    labelEn: 'Roaming the center divider',
  },
  {
    id: 'bottom-left-border',
    xRatio: 0.12,
    yRatio: 0.88,
    labelTh: 'พักใกล้การ์ดเช็คชื่อ & ผู้ปกครอง',
    labelEn: 'Resting near Attendance card border',
  },
  {
    id: 'bottom-right-border',
    xRatio: 0.84,
    yRatio: 0.91,
    labelTh: 'เล่นข้างกรอบกราฟเปรียบเทียบ',
    labelEn: 'Playing near Comparison Charts border',
  },
  {
    id: 'left-top-edge',
    xRatio: 0.14,
    yRatio: 0.05,
    labelTh: 'ชมวิวขอบการ์ดสถิติโรงเรียน',
    labelEn: 'Peeking from Overview card border',
  },
];

type AmbientPhase = 'roaming' | 'sitting' | 'chick_interact';

interface DashboardAmbientMascotsProps {
  lang?: AppLanguage;
}

export const DashboardAmbientMascots: React.FC<DashboardAmbientMascotsProps> = ({
  lang = 'th',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const charcoalGradId = `ambCharcoal-${safeId}`;
  const meeGradId = `ambMee-${safeId}`;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState<boolean>(() =>
    getSavedAmbientMascotsEnabled()
  );
  const [bounds, setBounds] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700,
  });
  const [waypointIndex, setWaypointIndex] = useState<number>(0);
  const [phase, setPhase] = useState<AmbientPhase>('sitting');
  const [facingRight, setFacingRight] = useState<boolean>(false);
  const [calloutText, setCalloutText] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') {
        setEnabled(detail);
      } else {
        setEnabled(getSavedAmbientMascotsEnabled());
      }
    };
    window.addEventListener(AMBIENT_MASCOTS_EVENT, handler);
    return () => window.removeEventListener(AMBIENT_MASCOTS_EVENT, handler);
  }, []);

  // Track container dimensions so motion uses pure compositor translate3d(px, px, 0)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBounds({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  // Ambient choreography loop: sit near border -> roam to another edge -> chick interaction
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timerId: number | null = null;
    let stepTick = 0;

    const advanceLoop = () => {
      if (cancelled) return;
      stepTick += 1;

      setPhase((prevPhase) => {
        if (prevPhase === 'sitting') {
          setWaypointIndex((prevIdx) => {
            const candidates = EDGE_WAYPOINTS.map((_, idx) => idx).filter(
              (idx) => idx !== prevIdx
            );
            const nextIdx =
              candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
            const currentWp = EDGE_WAYPOINTS[prevIdx];
            const nextWp = EDGE_WAYPOINTS[nextIdx];
            setFacingRight(nextWp.xRatio > currentWp.xRatio);
            return nextIdx;
          });
          setCalloutText(null);
          return 'roaming';
        }

        if (prevPhase === 'roaming') {
          // Every 2nd arrival or randomly 55% chance, summon JidRid chicks to circle around!
          if (stepTick % 2 === 0 || Math.random() < 0.55) {
            setCalloutText(lang === 'th' ? 'จิ๊บๆ! จิ๊ดริ๊ดมาวิ่งเล่นด้วย!' : 'Cheep! JidRid joined!');
            return 'chick_interact';
          }
          return 'sitting';
        }

        // After chick_interact, settle into calm sitting briefly before next roam
        setCalloutText(null);
        return 'sitting';
      });

      const nextDelay = 4600 + Math.floor(Math.random() * 1800);
      timerId = window.setTimeout(advanceLoop, nextDelay);
    };

    timerId = window.setTimeout(advanceLoop, 3800);
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [enabled, lang]);

  if (!enabled) return null;

  const wp = EDGE_WAYPOINTS[waypointIndex] || EDGE_WAYPOINTS[0];
  const actorBoxWidth = 172;
  const actorBoxHeight = 82;
  const xPx = Math.max(
    8,
    Math.min(
      Math.max(8, bounds.width - actorBoxWidth - 8),
      Math.round(wp.xRatio * bounds.width - actorBoxWidth / 2)
    )
  );
  const yPx = Math.max(
    4,
    Math.min(
      Math.max(4, bounds.height - actorBoxHeight - 4),
      Math.round(wp.yRatio * bounds.height - actorBoxHeight / 2)
    )
  );

  const isRoaming = phase === 'roaming';
  const isChickInteract = phase === 'chick_interact';

  const handleTriggerInteract = () => {
    setPhase('chick_interact');
    setCalloutText(
      lang === 'th'
        ? 'จิ๊ดริ๊ด ๆ วิ่งวนรอบชาร์โคล & หมี!'
        : 'JidRid chicks circling Charcoal & Mee!'
    );
    emitMascotDashboardEvent({
      type: 'success',
      titleTh: 'ชาร์โคล · หมี & จิ๊ดริ๊ด',
      titleEn: 'Ambient Companions',
      messageTh:
        lang === 'th'
          ? `ลูกไก่จิ๊ดริ๊ดวิ่งมาทักทายคุณครู (${wp.labelTh})`
          : `JidRid chicks ran up to say hello (${wp.labelEn})`,
      messageEn: `JidRid chicks ran up to say hello (${wp.labelEn})`,
      durationMs: 3600,
    });
  };

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="no-print hidden md:block pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {/* Roaming / Border-Sitting Duo + Occasional Orbiting JidRid Chicks */}
      <div
        style={{
          width: actorBoxWidth,
          height: actorBoxHeight,
          transform: `translate3d(${xPx}px, ${yPx}px, 0)`,
          transition: isRoaming
            ? 'transform 4.1s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'transform 0.9s ease-out',
        }}
        className="absolute top-0 left-0 will-change-transform"
      >
        <button
          type="button"
          onClick={handleTriggerInteract}
          title={
            lang === 'th'
              ? 'คลิกเล่นกับชาร์โคล หมี และลูกไก่จิ๊ดริ๊ดที่ขอบการ์ด'
              : 'Click Charcoal & Mee to summon JidRid chicks'
          }
          className="pointer-events-auto relative w-full h-full flex items-center justify-center cursor-pointer focus:outline-none group"
        >
          {/* Optional playful mini bubble during chick interaction */}
          {calloutText && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50/95 dark:bg-amber-950/95 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-100 shadow-sm mascot-bubble-enter">
              {calloutText}
            </div>
          )}

          {/* Orbiting JidRid Chicks when interacting around Charcoal & Mee */}
          {isChickInteract && (
            <>
              <div className="pointer-events-none absolute -top-2 left-4 z-20 mascot-chick-orbit">
                <svg viewBox="0 0 52 52" className="w-8 h-8 drop-shadow-sm mascot-chick-hop">
                  <JidRidChickSvgGroup variant="leader" flapping happyEyes />
                </svg>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-4 z-20 mascot-chick-orbit-reverse">
                <svg viewBox="0 0 52 52" className="w-7 h-7 drop-shadow-sm mascot-chick-hop-alt">
                  <JidRidChickSvgGroup variant="chubby" flapping happyEyes />
                </svg>
              </div>
              <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 z-0 mascot-chick-hop">
                <svg viewBox="0 0 52 52" className="w-6 h-6 drop-shadow-sm">
                  <JidRidChickSvgGroup variant="peeking" flapping />
                </svg>
              </div>
            </>
          )}

          {/* Charcoal & Mee SVG Pair (flipped to match roam direction) */}
          <div
            style={{
              transform: facingRight ? 'scaleX(-1)' : 'scaleX(1)',
            }}
            className={`w-full h-full transition-transform duration-300 ${
              isRoaming ? 'mascot-run-bounce' : isChickInteract ? 'mascot-react-success' : 'mascot-float'
            }`}
          >
            <svg viewBox="0 0 184 96" className="w-full h-full drop-shadow-md overflow-visible">
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

              <MeeSvgGroup
                mood={isChickInteract ? 'celebrate' : isRoaming ? 'pointing' : 'happy'}
                running={isRoaming}
                gradId={meeGradId}
                transform="translate(58, 4) scale(0.92)"
              />
              <CharcoalSvgGroup
                mood={isChickInteract ? 'success' : 'happy'}
                running={isRoaming}
                gradId={charcoalGradId}
                transform="translate(0, 2) scale(0.95)"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};
