import { DayOfWeek, SchoolPeriodTime, TimetableSlot } from '../types';
import { parseSlotTeachersFromRaw } from './timetableTeachers';

export type WallpaperThemeId = 'midnight' | 'sky' | 'mint' | 'cream';
export type WallpaperLayoutMode = 'lockscreen' | 'homescreen';

export interface TimetableWallpaperTheme {
  id: WallpaperThemeId;
  labelTh: string;
  labelEn: string;
  bgStart: string;
  bgEnd: string;
  glowA: string;
  glowB: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  titleColor: string;
  bodyColor: string;
  mutedColor: string;
  badgeBg: string;
  badgeText: string;
  headerBg: string;
  headerText: string;
  slotPalette: Array<{ bg: string; accent: string; text: string; sub: string }>;
}

export const TIMETABLE_WALLPAPER_THEMES: Record<WallpaperThemeId, TimetableWallpaperTheme> = {
  midnight: {
    id: 'midnight',
    labelTh: 'มืดคมชัด (Midnight)',
    labelEn: 'Midnight',
    bgStart: '#0b1120',
    bgEnd: '#172554',
    glowA: 'rgba(56, 189, 248, 0.16)',
    glowB: 'rgba(129, 140, 248, 0.18)',
    surface: 'rgba(15, 23, 42, 0.86)',
    surfaceMuted: 'rgba(30, 41, 59, 0.45)',
    border: 'rgba(148, 163, 184, 0.24)',
    titleColor: '#f8fafc',
    bodyColor: '#e2e8f0',
    mutedColor: '#94a3b8',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    badgeText: '#7dd3fc',
    headerBg: 'rgba(30, 41, 59, 0.92)',
    headerText: '#f1f5f9',
    slotPalette: [
      { bg: 'rgba(30, 58, 138, 0.72)', accent: '#38bdf8', text: '#f8fafc', sub: '#bae6fd' },
      { bg: 'rgba(6, 78, 59, 0.72)', accent: '#34d399', text: '#ecfdf5', sub: '#a7f3d0' },
      { bg: 'rgba(88, 28, 135, 0.70)', accent: '#c084fc', text: '#faf5ff', sub: '#e9d5ff' },
      { bg: 'rgba(120, 53, 15, 0.72)', accent: '#fbbf24', text: '#fffbeb', sub: '#fde68a' },
      { bg: 'rgba(136, 19, 55, 0.72)', accent: '#fb7185', text: '#fff1f2', sub: '#fecdd3' },
      { bg: 'rgba(19, 78, 74, 0.72)', accent: '#2dd4bf', text: '#f0fdfa', sub: '#99f6e4' },
    ],
  },
  sky: {
    id: 'sky',
    labelTh: 'ฟ้าสดใส (Sky Clean)',
    labelEn: 'Sky Clean',
    bgStart: '#eff6ff',
    bgEnd: '#dbeafe',
    glowA: 'rgba(59, 130, 246, 0.14)',
    glowB: 'rgba(14, 165, 233, 0.14)',
    surface: 'rgba(255, 255, 255, 0.92)',
    surfaceMuted: 'rgba(241, 245, 249, 0.65)',
    border: 'rgba(148, 163, 184, 0.35)',
    titleColor: '#0f172a',
    bodyColor: '#1e293b',
    mutedColor: '#475569',
    badgeBg: '#dbeafe',
    badgeText: '#1d4ed8',
    headerBg: '#1e3a8a',
    headerText: '#ffffff',
    slotPalette: [
      { bg: '#eff6ff', accent: '#2563eb', text: '#1e3a8a', sub: '#3b82f6' },
      { bg: '#ecfdf5', accent: '#059669', text: '#064e3b', sub: '#047857' },
      { bg: '#faf5ff', accent: '#7c3aed', text: '#4c1d95', sub: '#6d28d9' },
      { bg: '#fffbeb', accent: '#d97706', text: '#78350f', sub: '#b45309' },
      { bg: '#fff1f2', accent: '#e11d48', text: '#881337', sub: '#be123c' },
      { bg: '#f0fdfa', accent: '#0d9488', text: '#134e4a', sub: '#0f766e' },
    ],
  },
  mint: {
    id: 'mint',
    labelTh: 'เขียวมิ้นต์ (Mint Fresh)',
    labelEn: 'Mint Fresh',
    bgStart: '#ecfdf5',
    bgEnd: '#d1fae5',
    glowA: 'rgba(16, 185, 129, 0.15)',
    glowB: 'rgba(20, 184, 166, 0.14)',
    surface: 'rgba(255, 255, 255, 0.92)',
    surfaceMuted: 'rgba(236, 253, 245, 0.72)',
    border: 'rgba(16, 185, 129, 0.25)',
    titleColor: '#064e3b',
    bodyColor: '#0f172a',
    mutedColor: '#475569',
    badgeBg: '#d1fae5',
    badgeText: '#047857',
    headerBg: '#065f46',
    headerText: '#ffffff',
    slotPalette: [
      { bg: '#f0fdf4', accent: '#16a34a', text: '#14532d', sub: '#15803d' },
      { bg: '#eff6ff', accent: '#0284c7', text: '#0c4a6e', sub: '#0369a1' },
      { bg: '#fefce8', accent: '#ca8a04', text: '#713f12', sub: '#a16207' },
      { bg: '#fdf2f8', accent: '#db2777', text: '#831843', sub: '#be185d' },
      { bg: '#f5f3ff', accent: '#7c3aed', text: '#4c1d95', sub: '#6d28d9' },
      { bg: '#ecfeff', accent: '#0891b2', text: '#164e63', sub: '#0e7490' },
    ],
  },
  cream: {
    id: 'cream',
    labelTh: 'ครีมอบอุ่น (Warm Cream)',
    labelEn: 'Warm Cream',
    bgStart: '#fffbeb',
    bgEnd: '#fef3c7',
    glowA: 'rgba(245, 158, 11, 0.14)',
    glowB: 'rgba(234, 88, 12, 0.12)',
    surface: 'rgba(255, 255, 255, 0.94)',
    surfaceMuted: 'rgba(254, 243, 199, 0.45)',
    border: 'rgba(180, 83, 9, 0.22)',
    titleColor: '#451a03',
    bodyColor: '#292524',
    mutedColor: '#78716c',
    badgeBg: '#fde68a',
    badgeText: '#92400e',
    headerBg: '#78350f',
    headerText: '#fffbeb',
    slotPalette: [
      { bg: '#fff7ed', accent: '#ea580c', text: '#7c2d12', sub: '#c2410c' },
      { bg: '#eff6ff', accent: '#2563eb', text: '#1e3a8a', sub: '#1d4ed8' },
      { bg: '#f0fdf4', accent: '#16a34a', text: '#14532d', sub: '#15803d' },
      { bg: '#fdf4ff', accent: '#c026d3', text: '#701a75', sub: '#a21caf' },
      { bg: '#fef2f2', accent: '#dc2626', text: '#7f1d1d', sub: '#b91c1c' },
      { bg: '#f0fdfa', accent: '#0d9488', text: '#134e4a', sub: '#0f766e' },
    ],
  },
};

const DAYS: Array<{ key: DayOfWeek; shortTh: string; fullTh: string }> = [
  { key: 'mon', shortTh: 'จ.', fullTh: 'จันทร์' },
  { key: 'tue', shortTh: 'อ.', fullTh: 'อังคาร' },
  { key: 'wed', shortTh: 'พ.', fullTh: 'พุธ' },
  { key: 'thu', shortTh: 'พฤ.', fullTh: 'พฤหัส' },
  { key: 'fri', shortTh: 'ศ.', fullTh: 'ศุกร์' },
];

export interface RenderTimetableWallpaperParams {
  slots: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  schoolName: string;
  filterLabel: string;
  academicYear: string;
  semester: string;
  themeId?: WallpaperThemeId;
  layoutMode?: WallpaperLayoutMode;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const clean = (text || '').trim();
  if (!clean) return [];
  const words = clean.includes(' ') ? clean.split(/\s+/) : Array.from(clean);
  const lines: string[] = [];
  let current = '';

  const joiner = clean.includes(' ') ? ' ' : '';
  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    const candidate = current ? `${current}${joiner}${token}` : token;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else if (!current) {
      // Single long token: slice character-by-character
      let piece = '';
      for (const ch of token) {
        if (ctx.measureText(`${piece}${ch}`).width <= maxWidth) {
          piece += ch;
        } else {
          break;
        }
      }
      lines.push(piece || token.slice(0, 4));
      current = '';
      if (lines.length >= maxLines) break;
    } else {
      lines.push(current);
      current = token;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth - 10) {
      let truncated = last;
      while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
      }
      lines[maxLines - 1] = `${truncated}…`;
    }
  }
  return lines.slice(0, maxLines);
}

function derivePeriods(slots: TimetableSlot[], schoolPeriods: SchoolPeriodTime[] = []) {
  const periodMap = new Map<number, { periodNumber: number; startTime: string; endTime: string }>();

  schoolPeriods
    .filter((p) => !p.isBreak && p.periodNumber > 0)
    .forEach((p) => {
      periodMap.set(p.periodNumber, {
        periodNumber: p.periodNumber,
        startTime: p.startTime || '',
        endTime: p.endTime || '',
      });
    });

  slots.forEach((slot) => {
    if (!periodMap.has(slot.periodNumber)) {
      periodMap.set(slot.periodNumber, {
        periodNumber: slot.periodNumber,
        startTime: slot.startTime || '',
        endTime: slot.endTime || '',
      });
    } else {
      const existing = periodMap.get(slot.periodNumber)!;
      if (!existing.startTime && slot.startTime) existing.startTime = slot.startTime;
      if (!existing.endTime && slot.endTime) existing.endTime = slot.endTime;
    }
  });

  if (periodMap.size === 0) {
    return Array.from({ length: 7 }, (_, i) => ({
      periodNumber: i + 1,
      startTime: '',
      endTime: '',
    }));
  }

  return Array.from(periodMap.values()).sort((a, b) => a.periodNumber - b.periodNumber);
}

export function renderTimetableWallpaperCanvas(
  params: RenderTimetableWallpaperParams
): HTMLCanvasElement {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ไม่สามารถสร้าง Canvas สำหรับภาพหน้าจอได้');

  const theme = TIMETABLE_WALLPAPER_THEMES[params.themeId || 'midnight'];
  const isLockscreen = (params.layoutMode || 'lockscreen') === 'lockscreen';
  const fontStack = '"Noto Sans Thai", "Sarabun", system-ui, -apple-system, sans-serif';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, theme.bgStart);
  grad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative radial glow
  const glow1 = ctx.createRadialGradient(width * 0.2, height * 0.15, 20, width * 0.2, height * 0.15, 520);
  glow1.addColorStop(0, theme.glowA);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(width * 0.85, height * 0.82, 20, width * 0.85, height * 0.82, 560);
  glow2.addColorStop(0, theme.glowB);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  const padX = 34;
  const cardTop = isLockscreen ? 415 : 88;
  const cardBottom = height - 46;
  const cardWidth = width - padX * 2;
  const cardHeight = cardBottom - cardTop;

  if (isLockscreen) {
    // Subtle lockscreen top safe zone label
    ctx.fillStyle = theme.mutedColor;
    ctx.font = `600 22px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('พื้นที่เผื่อนาฬิกา & วิดเจ็ตหน้าจอล็อก', width / 2, 368);
  }

  // Main Frosted Card
  ctx.save();
  drawRoundedRect(ctx, padX, cardTop, cardWidth, cardHeight, 36);
  ctx.fillStyle = theme.surface;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.border;
  ctx.stroke();
  ctx.restore();

  // Header inside card
  const innerX = padX + 28;
  const innerWidth = cardWidth - 56;
  let cursorY = cardTop + 34;

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.titleColor;
  ctx.font = `800 34px ${fontStack}`;
  const headerTitle = `ตารางเรียน · ${params.filterLabel || 'ภาพรวม'}`;
  ctx.fillText(headerTitle.slice(0, 38), innerX, cursorY + 28);

  // Term badge top-right
  const termText = `ปี ${params.academicYear}/${params.semester}`;
  ctx.font = `700 22px ${fontStack}`;
  const badgeW = Math.min(240, ctx.measureText(termText).width + 34);
  const badgeX = innerX + innerWidth - badgeW;
  drawRoundedRect(ctx, badgeX, cursorY - 4, badgeW, 42, 14);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = 'center';
  ctx.fillText(termText, badgeX + badgeW / 2, cursorY + 24);

  cursorY += 54;
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.mutedColor;
  ctx.font = `500 22px ${fontStack}`;
  ctx.fillText(`${params.schoolName} · BaanPakKru`, innerX, cursorY + 12);

  cursorY += 36;

  // Timetable grid geometry
  const periods = derivePeriods(params.slots, params.schoolPeriods);
  const slotMap = new Map<string, TimetableSlot>();
  params.slots.forEach((slot) => {
    slotMap.set(`${slot.dayOfWeek}:${slot.periodNumber}`, slot);
  });

  const timeColW = 120;
  const colGap = 10;
  const dayColW = (innerWidth - timeColW - colGap * DAYS.length) / DAYS.length;
  const dayHeaderH = 54;
  const footerH = 34;
  const gridTop = cursorY;
  const gridAvailH = cardBottom - 26 - footerH - gridTop - dayHeaderH - 12;
  const rowGap = 10;
  const rowH = Math.max(
    86,
    Math.floor((gridAvailH - rowGap * Math.max(0, periods.length - 1)) / Math.max(1, periods.length))
  );

  // Day Headers (จ. - ศ.)
  DAYS.forEach((day, dIdx) => {
    const colX = innerX + timeColW + colGap + dIdx * (dayColW + colGap);
    drawRoundedRect(ctx, colX, gridTop, dayColW, dayHeaderH, 14);
    ctx.fillStyle = theme.headerBg;
    ctx.fill();

    ctx.fillStyle = theme.headerText;
    ctx.font = `800 24px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText(day.fullTh, colX + dayColW / 2, gridTop + 35);
  });

  // Time Header label
  drawRoundedRect(ctx, innerX, gridTop, timeColW, dayHeaderH, 14);
  ctx.fillStyle = theme.surfaceMuted;
  ctx.fill();
  ctx.fillStyle = theme.mutedColor;
  ctx.font = `700 21px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.fillText('คาบ / เวลา', innerX + timeColW / 2, gridTop + 34);

  // Rows
  const rowsStartY = gridTop + dayHeaderH + 12;
  periods.forEach((period, rIdx) => {
    const y = rowsStartY + rIdx * (rowH + rowGap);

    // Time cell
    drawRoundedRect(ctx, innerX, y, timeColW, rowH, 14);
    ctx.fillStyle = theme.surfaceMuted;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.border;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.titleColor;
    ctx.font = `800 22px ${fontStack}`;
    ctx.fillText(`คาบ ${period.periodNumber}`, innerX + timeColW / 2, y + rowH * 0.44);

    if (period.startTime) {
      ctx.fillStyle = theme.mutedColor;
      ctx.font = `600 17px ${fontStack}`;
      const timeLabel = period.endTime ? `${period.startTime}-${period.endTime}` : period.startTime;
      ctx.fillText(timeLabel, innerX + timeColW / 2, y + rowH * 0.72);
    }

    // Day cells
    DAYS.forEach((day, dIdx) => {
      const colX = innerX + timeColW + colGap + dIdx * (dayColW + colGap);
      const slot = slotMap.get(`${day.key}:${period.periodNumber}`);

      if (!slot) {
        drawRoundedRect(ctx, colX, y, dayColW, rowH, 14);
        ctx.fillStyle = theme.surfaceMuted;
        ctx.fill();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      const colorIdx = hashCode(slot.courseCode || slot.courseTitleTh || slot.id) % theme.slotPalette.length;
      const palette = theme.slotPalette[colorIdx];

      ctx.save();
      drawRoundedRect(ctx, colX, y, dayColW, rowH, 14);
      ctx.fillStyle = palette.bg;
      ctx.fill();
      ctx.clip();

      // Top/Left color accent bar
      ctx.fillStyle = palette.accent;
      ctx.fillRect(colX, y, 7, rowH);
      ctx.restore();

      // Border
      drawRoundedRect(ctx, colX, y, dayColW, rowH, 14);
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      const textPadLeft = colX + 14;
      const textAvailW = dayColW - 22;
      ctx.textAlign = 'left';

      // Course code
      const codeFontSize = rowH >= 130 ? 20 : 18;
      ctx.fillStyle = palette.accent;
      ctx.font = `800 ${codeFontSize}px ${fontStack}`;
      ctx.fillText((slot.courseCode || 'วิชา').slice(0, 14), textPadLeft, y + 25);

      // Subject title wrapped
      const titleFontSize = rowH >= 130 ? 21 : rowH >= 105 ? 19 : 17;
      ctx.fillStyle = palette.text;
      ctx.font = `700 ${titleFontSize}px ${fontStack}`;
      const titleText = slot.courseTitleTh || slot.courseTitleEn || slot.courseCode;
      const lines = wrapLines(ctx, titleText, textAvailW, rowH >= 125 ? 2 : 2);
      const lineStep = titleFontSize + 4;
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, textPadLeft, y + 50 + lIdx * lineStep);
      });

      // Room / teacher footer inside cell
      const { teacherName } = parseSlotTeachersFromRaw(slot.teacherName, slot.coTeacherName);
      const subText = [slot.room || slot.classRoom, rowH >= 135 ? teacherName : '']
        .filter(Boolean)
        .join(' · ');
      if (subText) {
        ctx.fillStyle = palette.sub;
        ctx.font = `600 16px ${fontStack}`;
        const subLines = wrapLines(ctx, subText, textAvailW, 1);
        if (subLines[0]) {
          ctx.fillText(subLines[0], textPadLeft, y + rowH - 14);
        }
      }
    });
  });

  // Card footer note
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.mutedColor;
  ctx.font = `500 18px ${fontStack}`;
  ctx.fillText(
    `บันทึกเมื่อ ${new Date().toLocaleDateString('th-TH')} · อัปเดตจากตารางเรียนล่าสุด`,
    width / 2,
    cardBottom - 16
  );

  return canvas;
}

export function renderTimetableWallpaperDataUrl(params: RenderTimetableWallpaperParams): string {
  const canvas = renderTimetableWallpaperCanvas(params);
  return canvas.toDataURL('image/png');
}

function buildWallpaperFilename(filterLabel: string, layoutMode: WallpaperLayoutMode): string {
  const safeFilter = (filterLabel || 'timetable')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);
  return `timetable-${layoutMode}-${safeFilter || 'wallpaper'}.png`;
}

export async function downloadTimetableWallpaperPng(
  params: RenderTimetableWallpaperParams
): Promise<void> {
  const dataUrl = renderTimetableWallpaperDataUrl(params);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = buildWallpaperFilename(params.filterLabel, params.layoutMode || 'lockscreen');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareTimetableWallpaperPng(
  params: RenderTimetableWallpaperParams
): Promise<'shared' | 'downloaded'> {
  const canvas = renderTimetableWallpaperCanvas(params);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    await downloadTimetableWallpaperPng(params);
    return 'downloaded';
  }
  const filename = buildWallpaperFilename(params.filterLabel, params.layoutMode || 'lockscreen');
  const file = new File([blob], filename, { type: 'image/png' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: `ตารางเรียน ${params.filterLabel}`,
      text: 'ภาพตารางเรียนสำหรับตั้งเป็นภาพหน้าจอมือถือ',
      files: [file],
    });
    return 'shared';
  }

  await downloadTimetableWallpaperPng(params);
  return 'downloaded';
}
