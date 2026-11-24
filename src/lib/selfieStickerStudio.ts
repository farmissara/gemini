export type SelfieFilterId = 'normal' | 'glow' | 'warm_film' | 'cool_mint' | 'mono';

export type SelfieFrameId = 'clean' | 'polaroid' | 'pastel_cute' | 'mascot_duo';

export type SelfieStickerId =
  | 'early_bird'
  | 'full_energy'
  | 'sparkle_heart'
  | 'star_crown'
  | 'cool_shades'
  | 'chaco_cheer'
  | 'mee_hi';

export interface PlacedSticker {
  uid: string;
  stickerId: SelfieStickerId;
  xPct: number; // 12..88
  yPct: number; // 14..84
  rotation: number; // degrees
}

export interface SelfieFilterOption {
  id: SelfieFilterId;
  labelTh: string;
  labelEn: string;
  cssFilter: string;
  swatchGradient: string;
}

export interface SelfieFrameOption {
  id: SelfieFrameId;
  labelTh: string;
  labelEn: string;
  accentColor: string;
}

export interface SelfieStickerOption {
  id: SelfieStickerId;
  labelTh: string;
  labelEn: string;
  bgColor: string;
  textColor: string;
  defaultPos: { xPct: number; yPct: number; rotation: number };
}

export const SELFIE_FILTERS: SelfieFilterOption[] = [
  {
    id: 'normal',
    labelTh: 'ธรรมชาติ',
    labelEn: 'Natural',
    cssFilter: 'none',
    swatchGradient: 'from-slate-200 to-slate-400',
  },
  {
    id: 'glow',
    labelTh: 'หน้าใส Glow',
    labelEn: 'Soft Glow',
    cssFilter: 'brightness(1.09) contrast(1.03) saturate(1.14)',
    swatchGradient: 'from-rose-200 via-amber-100 to-pink-200',
  },
  {
    id: 'warm_film',
    labelTh: 'ฟิล์มละมุน',
    labelEn: 'Warm Film',
    cssFilter: 'sepia(0.22) saturate(1.18) brightness(1.04) contrast(1.04)',
    swatchGradient: 'from-amber-200 via-orange-200 to-rose-200',
  },
  {
    id: 'cool_mint',
    labelTh: 'ใสคูลมิ้นท์',
    labelEn: 'Cool Mint',
    cssFilter: 'brightness(1.06) contrast(1.06) saturate(0.95) hue-rotate(-8deg)',
    swatchGradient: 'from-cyan-200 via-sky-200 to-indigo-200',
  },
  {
    id: 'mono',
    labelTh: 'ขาวดำอาร์ต',
    labelEn: 'Mono Chic',
    cssFilter: 'grayscale(1) contrast(1.16) brightness(1.04)',
    swatchGradient: 'from-slate-700 via-slate-400 to-slate-200',
  },
];

export const SELFIE_FRAMES: SelfieFrameOption[] = [
  {
    id: 'mascot_duo',
    labelTh: 'ชาโค & หมี',
    labelEn: 'Chaco & Mee',
    accentColor: '#f59e0b',
  },
  {
    id: 'pastel_cute',
    labelTh: 'พาสเทลคิ้วท์',
    labelEn: 'Pastel Pop',
    accentColor: '#ec4899',
  },
  {
    id: 'polaroid',
    labelTh: 'โพลารอยด์',
    labelEn: 'Polaroid',
    accentColor: '#3b82f6',
  },
  {
    id: 'clean',
    labelTh: 'คลีนมินิมอล',
    labelEn: 'Clean Studio',
    accentColor: '#64748b',
  },
];

export const SELFIE_STICKERS: SelfieStickerOption[] = [
  {
    id: 'chaco_cheer',
    labelTh: 'ชาโคเชียร์',
    labelEn: 'Chaco',
    bgColor: '#1e293b',
    textColor: '#ffffff',
    defaultPos: { xPct: 80, yPct: 24, rotation: 8 },
  },
  {
    id: 'mee_hi',
    labelTh: 'หมีสี่ตา',
    labelEn: 'Mee',
    bgColor: '#292524',
    textColor: '#fef3c7',
    defaultPos: { xPct: 20, yPct: 24, rotation: -8 },
  },
  {
    id: 'early_bird',
    labelTh: 'มาเช้าสุด!',
    labelEn: 'Early Bird',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    defaultPos: { xPct: 22, yPct: 72, rotation: -6 },
  },
  {
    id: 'full_energy',
    labelTh: 'พลัง 100%',
    labelEn: '100% Energy',
    bgColor: '#dcfce7',
    textColor: '#166534',
    defaultPos: { xPct: 78, yPct: 72, rotation: 6 },
  },
  {
    id: 'sparkle_heart',
    labelTh: 'หัวใจวิ้ง',
    labelEn: 'Heart Glow',
    bgColor: '#fce7f3',
    textColor: '#be185d',
    defaultPos: { xPct: 24, yPct: 46, rotation: -10 },
  },
  {
    id: 'star_crown',
    labelTh: 'มงกุฎดาว',
    labelEn: 'Star Crown',
    bgColor: '#fef08a',
    textColor: '#854d0e',
    defaultPos: { xPct: 50, yPct: 18, rotation: 0 },
  },
  {
    id: 'cool_shades',
    labelTh: 'แว่นสุดคูล',
    labelEn: 'Cool Shades',
    bgColor: '#0f172a',
    textColor: '#38bdf8',
    defaultPos: { xPct: 50, yPct: 42, rotation: -2 },
  },
];

export function getFilterOption(id: SelfieFilterId): SelfieFilterOption {
  return SELFIE_FILTERS.find((f) => f.id === id) || SELFIE_FILTERS[0];
}

export function getFrameOption(id: SelfieFrameId): SelfieFrameOption {
  return SELFIE_FRAMES.find((f) => f.id === id) || SELFIE_FRAMES[0];
}

export function getStickerOption(id: SelfieStickerId): SelfieStickerOption {
  return SELFIE_STICKERS.find((s) => s.id === id) || SELFIE_STICKERS[0];
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

function drawChacoHeadOnCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Ears
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.78, -radius * 0.65, radius * 0.34, radius * 0.45, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(radius * 0.78, -radius * 0.65, radius * 0.34, radius * 0.45, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Chubby round black face
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.05, radius, radius * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // White snout patch
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.34, radius * 0.48, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-radius * 0.36, -radius * 0.14, radius * 0.16, 0, Math.PI * 2);
  ctx.arc(radius * 0.36, -radius * 0.14, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(-radius * 0.34, -radius * 0.12, radius * 0.09, 0, Math.PI * 2);
  ctx.arc(radius * 0.34, -radius * 0.12, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.18, radius * 0.16, radius * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth + Chaco's signature big bright white protruding left fang!
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.beginPath();
  ctx.arc(0, radius * 0.36, radius * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Bright white teeth + prominent left fang (viewer's right side of Chaco's face)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(radius * 0.12, radius * 0.36);
  ctx.lineTo(radius * 0.27, radius * 0.08);
  ctx.lineTo(radius * 0.32, radius * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawMeeHeadOnCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Floppy ears
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.85, radius * 0.06, radius * 0.28, radius * 0.56, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(radius * 0.85, radius * 0.06, radius * 0.28, radius * 0.56, -0.22, 0, Math.PI * 2);
  ctx.fill();

  // Black head
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.88, radius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tan/brown eyebrow dots ("หมาสี่ตา")
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.32, -radius * 0.32, radius * 0.16, radius * 0.11, -0.15, 0, Math.PI * 2);
  ctx.ellipse(radius * 0.32, -radius * 0.32, radius * 0.16, radius * 0.11, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Tan cheeks & muzzle
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.3, radius * 0.36, radius * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-radius * 0.32, -radius * 0.06, radius * 0.13, 0, Math.PI * 2);
  ctx.arc(radius * 0.32, -radius * 0.06, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(-radius * 0.31, -radius * 0.05, radius * 0.075, 0, Math.PI * 2);
  ctx.arc(radius * 0.31, -radius * 0.05, radius * 0.075, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.2, radius * 0.14, radius * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStickerOnCanvas(
  ctx: CanvasRenderingContext2D,
  sticker: PlacedSticker,
  width: number,
  height: number
) {
  const x = (sticker.xPct / 100) * width;
  const y = (sticker.yPct / 100) * height;
  const baseUnit = Math.min(width, height);
  const opt = getStickerOption(sticker.stickerId);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((sticker.rotation * Math.PI) / 180);

  if (sticker.stickerId === 'chaco_cheer') {
    const r = baseUnit * 0.085;
    // White sticker outline
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.24, 0, Math.PI * 2);
    ctx.fill();
    drawChacoHeadOnCanvas(ctx, 0, -r * 0.08, r);
    // Label pill below head
    ctx.fillStyle = '#f59e0b';
    drawRoundedRect(ctx, -r * 1.1, r * 0.72, r * 2.2, r * 0.56, r * 0.28);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 ${Math.round(r * 0.36)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ชาโคเชียร์!', 0, r * 1.0);
    ctx.restore();
    return;
  }

  if (sticker.stickerId === 'mee_hi') {
    const r = baseUnit * 0.085;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.24, 0, Math.PI * 2);
    ctx.fill();
    drawMeeHeadOnCanvas(ctx, 0, -r * 0.06, r);
    ctx.fillStyle = '#38bdf8';
    drawRoundedRect(ctx, -r * 1.05, r * 0.72, r * 2.1, r * 0.54, r * 0.27);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 ${Math.round(r * 0.36)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('หมีสี่ตา', 0, r * 1.0);
    ctx.restore();
    return;
  }

  if (sticker.stickerId === 'star_crown') {
    const w = baseUnit * 0.19;
    const h = baseUnit * 0.12;
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, baseUnit * 0.008);
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, h * 0.35);
    ctx.lineTo(-w * 0.52, -h * 0.35);
    ctx.lineTo(-w * 0.18, 0);
    ctx.lineTo(0, -h * 0.52);
    ctx.lineTo(w * 0.18, 0);
    ctx.lineTo(w * 0.52, -h * 0.35);
    ctx.lineTo(w * 0.45, h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (sticker.stickerId === 'cool_shades') {
    const w = baseUnit * 0.28;
    const h = baseUnit * 0.095;
    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, baseUnit * 0.006);
    drawRoundedRect(ctx, -w * 0.5, -h * 0.48, w * 0.43, h * 0.92, h * 0.25);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, w * 0.07, -h * 0.48, w * 0.43, h * 0.92, h * 0.25);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-w * 0.08, -h * 0.2, w * 0.16, h * 0.18);
    // Cyan shine stripe
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2, baseUnit * 0.007);
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, -h * 0.25);
    ctx.lineTo(-w * 0.22, h * 0.22);
    ctx.moveTo(w * 0.15, -h * 0.25);
    ctx.lineTo(w * 0.35, h * 0.22);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (sticker.stickerId === 'sparkle_heart') {
    const s = baseUnit * 0.095;
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, baseUnit * 0.008);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.45);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.15, -s * 0.55, -s * 1.05, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.55, -s * 1.05, s * 1.1, -s * 0.15, 0, s * 0.45);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Pill word stickers ('early_bird', 'full_energy')
  const padX = baseUnit * 0.036;
  const fontSize = Math.round(baseUnit * 0.04);
  ctx.font = `800 ${fontSize}px sans-serif`;
  const textWidth = ctx.measureText(opt.labelTh).width;
  const boxW = textWidth + padX * 2;
  const boxH = fontSize * 1.8;

  ctx.shadowColor = 'rgba(15,23,42,0.28)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, -boxW / 2 - 3, -boxH / 2 - 3, boxW + 6, boxH + 6, (boxH + 6) / 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = opt.bgColor;
  drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
  ctx.fill();

  ctx.fillStyle = opt.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opt.labelTh, 0, 1);

  ctx.restore();
}

export interface ComposeSelfieOptions {
  frameId: SelfieFrameId;
  filterId: SelfieFilterId;
  stickers: PlacedSticker[];
  personName: string;
  gateName: string;
  checkTypeLabel: string;
  timeText: string;
}

export function drawFrameOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ComposeSelfieOptions
) {
  const { frameId, personName, gateName, checkTypeLabel, timeText } = options;
  const minDim = Math.min(width, height);

  if (frameId === 'polaroid') {
    const border = Math.round(minDim * 0.038);
    const bottomBar = Math.round(minDim * 0.15);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, border);
    ctx.fillRect(0, 0, border, height);
    ctx.fillRect(width - border, 0, border, height);
    ctx.fillRect(0, height - bottomBar, width, bottomBar);

    ctx.fillStyle = '#0f172a';
    ctx.font = `700 ${Math.round(minDim * 0.04)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${checkTypeLabel} · ${personName}`, border + 6, height - bottomBar * 0.58);

    ctx.fillStyle = '#64748b';
    ctx.font = `500 ${Math.round(minDim * 0.03)}px sans-serif`;
    ctx.fillText(`${timeText} · ${gateName}`, border + 6, height - bottomBar * 0.28);
    return;
  }

  if (frameId === 'pastel_cute') {
    const border = Math.round(minDim * 0.025);
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#f472b6');
    grad.addColorStop(0.5, '#a78bfa');
    grad.addColorStop(1, '#38bdf8');
    ctx.strokeStyle = grad;
    ctx.lineWidth = border * 2;
    ctx.strokeRect(0, 0, width, height);

    // Bottom pastel ribbon
    const pillW = Math.min(width - border * 4, Math.round(width * 0.78));
    const pillH = Math.round(minDim * 0.09);
    const px = (width - pillW) / 2;
    const py = height - pillH - border - 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    drawRoundedRect(ctx, px, py, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.fillStyle = '#be185d';
    ctx.font = `700 ${Math.round(minDim * 0.032)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${checkTypeLabel} · ${personName} · ${timeText}`, width / 2, py + pillH / 2);
    return;
  }

  if (frameId === 'mascot_duo') {
    // Sleek warm amber border + Chaco & Mee stamp card
    const border = Math.round(minDim * 0.02);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = border * 2;
    ctx.strokeRect(0, 0, width, height);

    // Bottom stamp bar
    const barH = Math.round(minDim * 0.115);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    drawRoundedRect(ctx, border + 8, height - barH - border - 4, width - (border + 8) * 2, barH, 14);
    ctx.fill();

    const mascotR = barH * 0.36;
    drawChacoHeadOnCanvas(ctx, border + 16 + mascotR, height - border - 4 - barH / 2, mascotR);
    drawMeeHeadOnCanvas(
      ctx,
      width - border - 16 - mascotR,
      height - border - 4 - barH / 2,
      mascotR
    );

    ctx.fillStyle = '#fef3c7';
    ctx.font = `700 ${Math.round(minDim * 0.033)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${checkTypeLabel} · ${personName}`, width / 2, height - border - 4 - barH * 0.62);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `500 ${Math.round(minDim * 0.026)}px sans-serif`;
    ctx.fillText(`${timeText} · ${gateName}`, width / 2, height - border - 4 - barH * 0.28);
    return;
  }

  // 'clean' studio subtle corner tag
  const pad = Math.round(minDim * 0.03);
  const tagH = Math.round(minDim * 0.08);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
  drawRoundedRect(ctx, pad, height - tagH - pad, Math.min(width - pad * 2, width * 0.72), tagH, 10);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = `600 ${Math.round(minDim * 0.028)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${checkTypeLabel} · ${personName} · ${timeText}`, pad + 12, height - pad - tagH / 2);
}

export function composeLiveVideoSnapshot(
  video: HTMLVideoElement,
  isMirrored: boolean,
  options: ComposeSelfieOptions
): string | null {
  const width = video.videoWidth || 720;
  const height = video.videoHeight || 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const filterOpt = getFilterOption(options.filterId);

  ctx.save();
  if (filterOpt.cssFilter !== 'none' && 'filter' in ctx) {
    ctx.filter = filterOpt.cssFilter;
  }
  if (isMirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();

  for (const sticker of options.stickers) {
    drawStickerOnCanvas(ctx, sticker, width, height);
  }

  drawFrameOverlayOnCanvas(ctx, width, height, options);
  return canvas.toDataURL('image/jpeg', 0.88);
}

export function composeSimulatedStudioSnapshot(
  personName: string,
  options: ComposeSelfieOptions
): string | null {
  const width = 720;
  const height = 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Stylish playful pastel/studio backdrop for simulated mode
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.55, '#312e81');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Soft studio spotlight circles
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.beginPath();
  ctx.arc(width * 0.25, height * 0.28, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(244, 114, 182, 0.16)';
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.65, 170, 0, Math.PI * 2);
  ctx.fill();

  // Center avatar monogram badge
  const initials = personName.trim().slice(0, 2) || 'BP';
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(width / 2, height * 0.44, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, width / 2, height * 0.44);

  for (const sticker of options.stickers) {
    drawStickerOnCanvas(ctx, sticker, width, height);
  }

  drawFrameOverlayOnCanvas(ctx, width, height, options);
  return canvas.toDataURL('image/jpeg', 0.88);
}
