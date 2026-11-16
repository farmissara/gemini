import React, { useId, useState } from 'react';
import { Coffee, Heart, Play, Sparkles } from 'lucide-react';
import { AppLanguage } from '../../types';
import {
  CharcoalSvgGroup,
  JidRidChickSvgGroup,
  MeeSvgGroup,
} from './MascotAvatar';
import { emitMascotDashboardEvent } from './InteractiveMascotGuide';

export type PlayyardMode = 'chase' | 'cozy' | 'cheer';
type PetTarget = 'charcoal' | 'mee' | 'jidrid';

interface BaanPakKruPlayyardProps {
  variant?: 'dashboard' | 'welcome' | 'drawer';
  lang?: AppLanguage;
  initialMode?: PlayyardMode;
  statusNote?: string;
  onStartTour?: () => void;
  className?: string;
}

const PET_LINES: Record<
  PetTarget,
  { th: string[]; en: string[]; nameTh: string; nameEn: string }
> = {
  charcoal: {
    nameTh: 'ชาร์โคล (เขี้ยวซ้ายเหยิน)',
    nameEn: 'Charcoal (Snaggletooth)',
    th: [
      'โฮ่ง! ชาร์โคลวิ่งจนพุงกลมกลิ้งแล้ว ขอพักข้างโต๊ะคุณครูแป๊บนะครับ!',
      'ยิ้มโชว์เขี้ยวซ้ายเหยินให้คุณครู 1 ที — งานเอกสารวันนี้เดี๋ยวชาร์โคลช่วยเตือนให้!',
      'ถึงตัวจะอ้วนแต่ชาร์โคลเฝ้าหน้าบ้านพักครูให้คุณครูพักผ่อนได้สบายใจเลย',
    ],
    en: [
      'Woof! Charcoal ran round and round—taking a breather right beside your desk!',
      'Big snaggletooth smile for you! Keep up the great teaching today.',
      'Chubby guard dog Charcoal is watching over BaanPakKru while you rest!',
    ],
  },
  mee: {
    nameTh: 'หมี (หมาไส้กรอก 4 ตา)',
    nameEn: 'Mee (4-Eyed Sausage Dog)',
    th: [
      'บ๊อกๆ! หมีแอบวิ่งไล่ต้อนลูกไก่จิ๊ดริ๊ดเข้าแถวรอเช็คชื่อให้คุณครูครบแล้ว!',
      'ดื้อนิดหน่อยแต่รักคุณครูนะ ลำตัวยาวๆ ของหมีพร้อมรับฝากความเหนื่อยไว้เอง',
      'หมี 4 ตาสอดส่องให้แล้ว — เดี๋ยวช่วยดูนักเรียนที่ขาดเรียนกับคิวสอนแทนให้นะ!',
    ],
    en: [
      'Arf! Mee rounded up all the JidRid chicks in a neat line for roll call!',
      'A bit mischievous, always loyal—long sausage dog Mee is cheering you on!',
      'Four-eyed patrol complete! Ready to help spot absences and subs.',
    ],
  },
  jidrid: {
    nameTh: 'จิ๊ดริ๊ด & ฝูงลูกไก่',
    nameEn: 'JidRid & Chick Flock',
    th: [
      'จิ๊บๆ จิ๊ดริ๊ด! พวกหนู 4 ตัววิ่งแข่งกับพี่หมีอยู่ พักสายตาดูพวกหนูสัก 10 วินาทีนะคุณครู',
      'จิ๊บ! ถ้างานเยอะลองใช้ปุ่มเช็คชื่อมาทุกคน กับปุ่มซิงค์คะแนนการบ้านดูสิครับ!',
      'จิ๊ดริ๊ด ๆ พวกหนูกระพือปีกเชียร์คุณครูอยู่ตรงนี้เสมอครับ!',
    ],
    en: [
      'Cheep cheep! JidRid and friends are racing Mee across the lawn—take a 10s eye break!',
      'Peep! Try the one-click homeroom roll call and homework sync to save time!',
      'Flapping our little wings to cheer for our favorite teacher!',
    ],
  },
};

export const BaanPakKruPlayyard: React.FC<BaanPakKruPlayyardProps> = ({
  variant = 'dashboard',
  lang = 'th',
  initialMode = 'chase',
  statusNote,
  onStartTour,
  className = '',
}) => {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const charcoalGradId = `playCharcoal-${safeId}`;
  const meeGradId = `playMee-${safeId}`;

  const [mode, setMode] = useState<PlayyardMode>(initialMode);
  const [lastPet, setLastPet] = useState<{
    target: PetTarget;
    lineIdx: number;
    seq: number;
  } | null>(null);

  const isChase = mode === 'chase';
  const isCozy = mode === 'cozy';
  const isCheer = mode === 'cheer';

  const handlePet = (target: PetTarget) => {
    const lines = PET_LINES[target];
    const nextIdx = lastPet && lastPet.target === target ? (lastPet.seq % lines.th.length) : 0;
    const nextSeq = (lastPet?.seq ?? 0) + 1;
    setLastPet({ target, lineIdx: nextIdx, seq: nextSeq });

    if (variant === 'dashboard') {
      emitMascotDashboardEvent({
        type: 'success',
        titleTh: lines.nameTh,
        titleEn: lines.nameEn,
        messageTh: lines.th[nextIdx],
        messageEn: lines.en[nextIdx],
        durationMs: 4200,
      });
    }
  };

  const activeCaption = lastPet
    ? lang === 'th'
      ? `${PET_LINES[lastPet.target].nameTh}: "${PET_LINES[lastPet.target].th[lastPet.lineIdx]}"`
      : `${PET_LINES[lastPet.target].nameEn}: "${PET_LINES[lastPet.target].en[lastPet.lineIdx]}"`
    : statusNote ||
      (lang === 'th'
        ? 'คลิกที่ตัวชาร์โคล หมี หรือลูกไก่จิ๊ดริ๊ดเพื่อลูบหัวเล่นและพักสายตาระหว่างสอนได้เลย'
        : 'Click Charcoal, Mee, or the JidRid chicks to play and take a quick break.');

  const sceneHeightClass =
    variant === 'drawer' ? 'h-32' : variant === 'welcome' ? 'h-36 sm:h-40' : 'h-36 sm:h-44';

  return (
    <section
      aria-label={
        lang === 'th'
          ? 'สนามวิ่งเล่นบ้านพักครู ชาร์โคล หมี และลูกไก่จิ๊ดริ๊ด'
          : 'BaanPakKru Playyard with Charcoal, Mee, and JidRid Chicks'
      }
      className={`no-print rounded-2xl border border-emerald-200/90 dark:border-emerald-800/60 bg-gradient-to-b from-sky-50/90 via-white to-emerald-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 p-3 sm:p-3.5 shadow-2xs space-y-2.5 ${className}`}
    >
      {/* Top Row: Title + Play Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#0f172a] dark:text-slate-100">
              {lang === 'th'
                ? 'มุมพักใจบ้านพักครู · ชาร์โคล, หมี และฝูงลูกไก่จิ๊ดริ๊ด'
                : 'BaanPakKru Corner · Charcoal, Mee & JidRid Chicks'}
            </h3>
          </div>
          <p className="text-[11px] text-[#475569] dark:text-slate-300 truncate mt-0.5">
            {activeCaption}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-white/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setMode('chase')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
              isChase
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>{lang === 'th' ? 'วิ่งไล่เล่น' : 'Chase'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('cozy')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
              isCozy
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700'
            }`}
          >
            <Coffee className="w-3 h-3" />
            <span>{lang === 'th' ? 'พักผ่อน' : 'Rest'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('cheer')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
              isCheer
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{lang === 'th' ? 'เชียร์คุณครู' : 'Cheer'}</span>
          </button>
          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
            >
              <span>{lang === 'th' ? 'ทัวร์แนะนำ' : 'Tour'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Large Lawn Stage */}
      <div
        className={`relative w-full ${sceneHeightClass} rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 overflow-hidden bg-gradient-to-b from-sky-100/90 via-sky-50/70 to-emerald-100/95 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/60 select-none`}
      >
        {/* Heart pop feedback when clicking a mascot */}
        {lastPet && (
          <div
            key={lastPet.seq}
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-800/95 border border-rose-200 dark:border-rose-700 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-300 shadow-sm mascot-heart-pop"
          >
            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
            <span>{PET_LINES[lastPet.target].nameTh}</span>
          </div>
        )}

        <svg
          viewBox="0 0 680 170"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={charcoalGradId} x1="20" y1="14" x2="78" y2="86" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3F3F46" />
              <stop offset="52%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>
            <linearGradient id={meeGradId} x1="18" y1="18" x2="104" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3F3F46" />
              <stop offset="56%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>
          </defs>

          {/* Soft sun / moon + clouds */}
          <circle cx="615" cy="34" r="18" fill="#FDE047" fillOpacity="0.85" />
          <g fill="#FFFFFF" fillOpacity="0.72">
            <ellipse cx="105" cy="34" rx="28" ry="11" />
            <ellipse cx="128" cy="30" rx="20" ry="12" />
            <ellipse cx="365" cy="28" rx="26" ry="10" />
            <ellipse cx="388" cy="25" rx="18" ry="10" />
          </g>

          {/* Warm Rolling Grassy Lawn */}
          <path
            d="M0 124 Q180 108 360 122 T680 116 L680 170 L0 170 Z"
            fill="#86EFAC"
            fillOpacity="0.55"
          />
          <path
            d="M0 136 Q220 124 440 136 T680 132 L680 170 L0 170 Z"
            fill="#4ADE80"
            fillOpacity="0.45"
          />

          {/* Tiny garden flowers & grass tufts */}
          <g fill="#FBBF24" opacity="0.85">
            <circle cx="48" cy="146" r="3" />
            <circle cx="290" cy="152" r="2.8" />
            <circle cx="520" cy="145" r="3.2" />
            <circle cx="628" cy="150" r="2.6" />
          </g>
          <g fill="#FB7185" opacity="0.75">
            <circle cx="145" cy="153" r="2.6" />
            <circle cx="430" cy="150" r="2.8" />
          </g>

          {/* Animated Character Group (Chase patrol when isChase, centered cozy group otherwise) */}
          <g className={isChase ? 'mascot-chase-patrol' : ''}>
            {/* Cute Dust Puffs behind running Charcoal & Mee */}
            {isChase && (
              <g>
                <circle cx="545" cy="140" r="5.5" fill="#FFFFFF" fillOpacity="0.7" className="mascot-dust-puff" />
                <circle cx="562" cy="136" r="4" fill="#FFFFFF" fillOpacity="0.55" className="mascot-dust-puff" />
                <circle cx="385" cy="142" r="5" fill="#FFFFFF" fillOpacity="0.65" className="mascot-dust-puff" />
              </g>
            )}

            {/* 1. Chubby Charcoal (Big & Clear on the right chasing Mee and the chicks) */}
            <g
              onClick={() => handlePet('charcoal')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label="ลูบหัวชาร์โคล"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePet('charcoal');
                }
              }}
            >
              <g className={isChase ? 'mascot-run-bounce-slow' : isCheer ? 'mascot-react-success' : 'mascot-float'}>
                <CharcoalSvgGroup
                  mood={isCheer ? 'success' : 'happy'}
                  sleeping={isCozy}
                  running={isChase}
                  gradId={charcoalGradId}
                  transform={
                    isCozy
                      ? 'translate(410, 44) scale(1.12)'
                      : 'translate(442, 40) scale(1.16)'
                  }
                />
              </g>
              <g transform={isCozy ? 'translate(466, 158)' : 'translate(498, 158)'}>
                <rect x="-32" y="-12" width="64" height="15" rx="7.5" fill="#0F172A" fillOpacity="0.72" />
                <text x="0" y="-1.5" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="700">
                  ชาร์โคล
                </text>
              </g>
            </g>

            {/* 2. Mischievous Sausage Dog Mee (Chasing the chicks in the center!) */}
            <g
              onClick={() => handlePet('mee')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label="ลูบหัวหมี"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePet('mee');
                }
              }}
            >
              <g className={isChase ? 'mascot-run-bounce' : isCheer ? 'mascot-react-success' : 'mascot-float'}>
                <MeeSvgGroup
                  mood={isCheer ? 'celebrate' : 'pointing'}
                  sleeping={isCozy}
                  running={isChase}
                  gradId={meeGradId}
                  transform={
                    isCozy
                      ? 'translate(245, 48) scale(1.1)'
                      : 'translate(262, 44) scale(1.14)'
                  }
                />
              </g>
              <g transform={isCozy ? 'translate(316, 158)' : 'translate(332, 158)'}>
                <rect x="-38" y="-12" width="76" height="15" rx="7.5" fill="#7C2D12" fillOpacity="0.82" />
                <text x="0" y="-1.5" textAnchor="middle" fill="#FEF3C7" fontSize="9.5" fontWeight="700">
                  หมี (ไส้กรอก)
                </text>
              </g>
            </g>

            {/* 3. Flock of 4 Cute JidRid Chicks running & hopping together on the left! */}
            <g
              onClick={() => handlePet('jidrid')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label="เล่นกับลูกไก่จิ๊ดริ๊ดและผองเพื่อน"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePet('jidrid');
                }
              }}
            >
              {/* Leader Chick: จิ๊ดริ๊ด (with head tuft feather) */}
              <g className={isChase || isCheer ? 'mascot-chick-hop' : 'mascot-float'}>
                <JidRidChickSvgGroup
                  variant="leader"
                  flapping={!isCozy}
                  sleeping={isCozy}
                  happyEyes={isCheer}
                  transform={
                    isCozy
                      ? 'translate(76, 92) scale(1.06)'
                      : 'translate(68, 86) scale(1.08)'
                  }
                />
              </g>

              {/* Chick 2: Chubby sibling */}
              <g className={isChase || isCheer ? 'mascot-chick-hop-alt' : 'mascot-float'}>
                <JidRidChickSvgGroup
                  variant="chubby"
                  flapping={!isCozy}
                  sleeping={isCozy}
                  happyEyes={isCheer}
                  transform={
                    isCozy
                      ? 'translate(132, 98) scale(0.92)'
                      : 'translate(122, 94) scale(0.95)'
                  }
                />
              </g>

              {/* Chick 3: Peeking pale-yellow baby chick */}
              <g className={isChase || isCheer ? 'mascot-chick-hop' : 'mascot-float'}>
                <JidRidChickSvgGroup
                  variant="peeking"
                  flapping={!isCozy}
                  sleeping={isCozy}
                  happyEyes={isCheer}
                  transform={
                    isCozy
                      ? 'translate(178, 102) scale(0.84)'
                      : 'translate(170, 96) scale(0.88)'
                  }
                />
              </g>

              {/* Chick 4: Tiny trailing chick (or perched beside Charcoal when Cozy!) */}
              <g className={isChase || isCheer ? 'mascot-chick-hop-alt' : 'mascot-float'}>
                <JidRidChickSvgGroup
                  variant="speedy"
                  flapping={!isCozy}
                  sleeping={isCozy}
                  happyEyes={isCheer}
                  transform={
                    isCozy
                      ? 'translate(524, 96) scale(0.86)'
                      : 'translate(212, 102) scale(0.8)'
                  }
                />
              </g>

              {/* Cute Chick Speech Callout */}
              {!isCozy && (
                <g transform="translate(88, 66)">
                  <rect x="0" y="0" width="52" height="17" rx="8.5" fill="#FEF08A" stroke="#D97706" strokeWidth="1" />
                  <text x="26" y="11.5" textAnchor="middle" fill="#78350F" fontSize="9" fontWeight="800">
                    จิ๊บ จิ๊บ!
                  </text>
                </g>
              )}

              <g transform="translate(136, 158)">
                <rect x="-48" y="-12" width="96" height="15" rx="7.5" fill="#B45309" fillOpacity="0.86" />
                <text x="0" y="-1.5" textAnchor="middle" fill="#FFFBEB" fontSize="9.5" fontWeight="700">
                  ลูกไก่จิ๊ดริ๊ด (4 ตัว)
                </text>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
};
