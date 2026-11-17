import type React from 'react';
import type { TimetablePresetColor } from '../types';

export interface TimetableColorPreset {
  key: TimetablePresetColor;
  labelTh: string;
  labelEn: string;
  swatchHex: string;
  cardClass: string;
}

export const TIMETABLE_COLOR_PRESETS: TimetableColorPreset[] = [
  {
    key: 'sky',
    labelTh: 'ฟ้า (วิทยาศาสตร์ / พื้นฐาน)',
    labelEn: 'Sky',
    swatchHex: '#0284c7',
    cardClass:
      'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-100 hover:bg-sky-200 dark:hover:bg-sky-900',
  },
  {
    key: 'blue',
    labelTh: 'น้ำเงิน',
    labelEn: 'Blue',
    swatchHex: '#2563eb',
    cardClass:
      'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900',
  },
  {
    key: 'indigo',
    labelTh: 'คราม (สังคมศึกษา)',
    labelEn: 'Indigo',
    swatchHex: '#4f46e5',
    cardClass:
      'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-900',
  },
  {
    key: 'purple',
    labelTh: 'ม่วง (คณิตศาสตร์ / เพิ่มเติม)',
    labelEn: 'Purple',
    swatchHex: '#9333ea',
    cardClass:
      'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-900',
  },
  {
    key: 'pink',
    labelTh: 'ชมพู',
    labelEn: 'Pink',
    swatchHex: '#db2777',
    cardClass:
      'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-700 text-pink-950 dark:text-pink-100 hover:bg-pink-200 dark:hover:bg-pink-900',
  },
  {
    key: 'rose',
    labelTh: 'แดงกุหลาบ (ศิลปะ / สุขศึกษา)',
    labelEn: 'Rose',
    swatchHex: '#e11d48',
    cardClass:
      'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 hover:bg-rose-200 dark:hover:bg-rose-900',
  },
  {
    key: 'orange',
    labelTh: 'ส้ม',
    labelEn: 'Orange',
    swatchHex: '#ea580c',
    cardClass:
      'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700 text-orange-950 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-orange-900',
  },
  {
    key: 'amber',
    labelTh: 'เหลืองอำพัน (ภาษาไทย / ต่างประเทศ)',
    labelEn: 'Amber',
    swatchHex: '#d97706',
    cardClass:
      'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900',
  },
  {
    key: 'lime',
    labelTh: 'เขียวมะนาว',
    labelEn: 'Lime',
    swatchHex: '#65a30d',
    cardClass:
      'bg-lime-100 dark:bg-lime-950 border-lime-300 dark:border-lime-700 text-lime-950 dark:text-lime-100 hover:bg-lime-200 dark:hover:bg-lime-900',
  },
  {
    key: 'emerald',
    labelTh: 'เขียวมรกต (STEM / เทคโนโลยี)',
    labelEn: 'Emerald',
    swatchHex: '#059669',
    cardClass:
      'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-900',
  },
  {
    key: 'teal',
    labelTh: 'เขียวอมฟ้า',
    labelEn: 'Teal',
    swatchHex: '#0d9488',
    cardClass:
      'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 hover:bg-teal-200 dark:hover:bg-teal-900',
  },
  {
    key: 'cyan',
    labelTh: 'ฟ้าอมเขียว (กิจกรรมพัฒนาผู้เรียน)',
    labelEn: 'Cyan',
    swatchHex: '#0891b2',
    cardClass:
      'bg-cyan-100 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-700 text-cyan-950 dark:text-cyan-100 hover:bg-cyan-200 dark:hover:bg-cyan-900',
  },
];

export const TIMETABLE_COLOR_MAP: Record<string, TimetableColorPreset> = Object.fromEntries(
  TIMETABLE_COLOR_PRESETS.map((preset) => [preset.key, preset])
);

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function isCustomHexColor(colorTag?: string | null): boolean {
  return Boolean(colorTag && HEX_COLOR_PATTERN.test(colorTag.trim()));
}

export function getTimetableSlotCardStyle(colorTag?: string | null): {
  className: string;
  style?: React.CSSProperties;
  swatchHex: string;
  labelTh: string;
  labelEn: string;
  isCustomHex: boolean;
} {
  const normalized = (colorTag || '').trim();
  const preset = TIMETABLE_COLOR_MAP[normalized.toLowerCase()];
  if (preset) {
    return {
      className: preset.cardClass,
      swatchHex: preset.swatchHex,
      labelTh: preset.labelTh,
      labelEn: preset.labelEn,
      isCustomHex: false,
    };
  }

  if (HEX_COLOR_PATTERN.test(normalized)) {
    const hex = normalized.toLowerCase();
    return {
      className: 'text-[var(--color-text-title)] hover:brightness-95 dark:hover:brightness-110',
      style: {
        backgroundColor: `color-mix(in srgb, ${hex} 18%, var(--color-card))`,
        borderColor: `color-mix(in srgb, ${hex} 52%, var(--color-border))`,
      },
      swatchHex: hex,
      labelTh: `สีกำหนดเอง (${hex.toUpperCase()})`,
      labelEn: `Custom (${hex.toUpperCase()})`,
      isCustomHex: true,
    };
  }

  const fallback = TIMETABLE_COLOR_MAP.sky;
  return {
    className: fallback.cardClass,
    swatchHex: fallback.swatchHex,
    labelTh: fallback.labelTh,
    labelEn: fallback.labelEn,
    isCustomHex: false,
  };
}
