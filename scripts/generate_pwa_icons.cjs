const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG generator using zlib
function createPng(width, height, drawFn) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = y * rowSize + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const body = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const rx = Math.min(r, w / 2);
  const ry = Math.min(r, h / 2);
  const dx = Math.max(x + rx - px, 0, px - (x + w - rx));
  const dy = Math.max(y + ry - py, 0, py - (y + h - ry));
  return dx * dx + dy * dy <= rx * rx;
}

// Draw BaanPakKru (บ้านพักครู) Logo matching /public/icon.svg:
// Royal-blue-to-sky gradient, welcoming cottage roof + warm sunlit 4-pane window + chimney + open book porch
function drawBaanPakKruIcon(x, y, width, height, isMaskable = false) {
  // Background diagonal gradient matching icon.svg (#1e3a8a -> #2563eb -> #0ea5e9)
  const t = Math.max(0, Math.min(1, (x / width + y / height) * 0.5));
  const bgR = Math.round(t < 0.52 ? 30 + (37 - 30) * (t / 0.52) : 37 + (14 - 37) * ((t - 0.52) / 0.48));
  const bgG = Math.round(t < 0.52 ? 58 + (99 - 58) * (t / 0.52) : 99 + (165 - 99) * ((t - 0.52) / 0.48));
  const bgB = Math.round(t < 0.52 ? 138 + (235 - 138) * (t / 0.52) : 235 + (233 - 235) * ((t - 0.52) / 0.48));

  // Rounded corners for standard icons; full-bleed square for maskable icons
  if (!isMaskable) {
    const cornerR = width * 0.226;
    const dx = Math.min(x, width - 1 - x);
    const dy = Math.min(y, height - 1 - y);
    if (dx < cornerR && dy < cornerR) {
      const dist = Math.hypot(cornerR - dx, cornerR - dy);
      if (dist > cornerR) {
        return [0, 0, 0, 0];
      }
    }
  }

  // Map pixel into 512x512 vector space respecting maskable 20% safe zone (0.72 scale for maskable, 0.94 for standard)
  const scale = (isMaskable ? 0.72 : 0.96) * (width / 512);
  const cx = width / 2;
  const cy = height / 2;
  const vx = 256 + (x - cx) / scale;
  const vy = 256 + (y - cy) / scale;

  // 1. Open Teacher Book Porch at base (vx 100..412, vy 356..442)
  if (vx >= 100 && vx <= 412 && vy >= 355 && vy <= 445) {
    const halfDist = Math.abs(vx - 256) / 156;
    const topY = 394 - Math.sin(halfDist * Math.PI) * 24 - (halfDist > 0.65 ? (halfDist - 0.65) * 10 : 0);
    const botY = topY + 50;
    if (vy >= topY && vy <= botY) {
      if (Math.abs(vx - 256) <= 5 && vy >= 394) {
        return [37, 99, 235, 255]; // Blue book spine (#2563eb)
      }
      return [255, 255, 255, 255];
    }
  }

  // 2. Welcoming sloped roof strokes
  const dRoofLeft = pointToSegmentDist(vx, vy, 88, 260, 256, 112);
  const dRoofRight = pointToSegmentDist(vx, vy, 256, 112, 424, 260);
  const dRoof = Math.min(dRoofLeft, dRoofRight);
  const dGoldLeft = pointToSegmentDist(vx, vy, 116, 260, 256, 134);
  const dGoldRight = pointToSegmentDist(vx, vy, 256, 134, 396, 260);
  const dGold = Math.min(dGoldLeft, dGoldRight);

  if (dGold <= 5.2) {
    return [251, 191, 36, 255]; // Warm gold accent (#fbbf24)
  }
  if (dRoof <= 17) {
    return [255, 255, 255, 255]; // Crisp white roof
  }

  // 3. Cozy chimney sparks (circles)
  if (Math.hypot(vx - 356, vy - 96) <= 16) {
    return [253, 224, 71, 255]; // #fde047
  }
  if (Math.hypot(vx - 378, vy - 68) <= 10) {
    return [254, 240, 138, 255]; // #fef08a
  }

  // 4. Cozy chimney (x: 336..374, y: 130..198)
  if (inRoundedRect(vx, vy, 332, 126, 46, 76, 8)) {
    if (inRoundedRect(vx, vy, 339, 133, 32, 62, 4)) {
      return [253, 230, 138, 255]; // #fde68a
    }
    return [255, 255, 255, 255]; // White border
  }

  // 5. House cottage body + 4-pane window
  const roofPeakYAtX = 150 + Math.abs(vx - 256) * (94 / 112);
  if (vx >= 144 && vx <= 368 && vy >= roofPeakYAtX && vy <= 382) {
    // Sunlit 4-pane window (210..302, 238..324)
    if (inRoundedRect(vx, vy, 205, 233, 102, 96, 18)) {
      const inPane = inRoundedRect(vx, vy, 215, 243, 82, 76, 10);
      if (!inPane || Math.abs(vx - 256) <= 4.5 || Math.abs(vy - 281) <= 4.5) {
        return [30, 64, 175, 255]; // Deep blue window frame & mullions (#1e40af)
      }
      const winT = (vy - 243) / 76;
      return [
        Math.round(253 + (245 - 253) * winT),
        Math.round(224 + (158 - 224) * winT),
        Math.round(71 + (11 - 71) * winT),
        255,
      ];
    }
    return [239, 246, 255, 255]; // Soft cottage cream-blue (#eff6ff)
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating BaanPakKru PWA PNG icons in', publicDir);

const png192 = createPng(192, 192, (x, y, w, h) => drawBaanPakKruIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = createPng(512, 512, (x, y, w, h) => drawBaanPakKruIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const pngMaskable = createPng(512, 512, (x, y, w, h) => drawBaanPakKruIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

const pngApple = createPng(180, 180, (x, y, w, h) => drawBaanPakKruIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

const pngFavicon = createPng(64, 64, (x, y, w, h) => drawBaanPakKruIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngFavicon);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), pngFavicon);

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="52%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>
    <linearGradient id="winGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-opacity="0.22" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bgGrad)" />
  <g filter="url(#shadow)">
    <!-- Cozy chimney + warm rising sparks -->
    <rect x="336" y="130" width="38" height="68" rx="6" fill="#fde68a" stroke="#ffffff" stroke-width="8" />
    <circle cx="356" cy="96" r="16" fill="#fde047" />
    <circle cx="378" cy="68" r="10" fill="#fef08a" opacity="0.85" />

    <!-- House cottage body -->
    <path d="M144 244 L256 150 L368 244 V366 C368 375 361 382 352 382 H160 C151 382 144 375 144 366 Z" fill="#eff6ff" />

    <!-- Warm sunlit 4-pane window -->
    <rect x="210" y="238" width="92" height="86" rx="16" fill="url(#winGrad)" stroke="#1e40af" stroke-width="10" />
    <line x1="256" y1="238" x2="256" y2="324" stroke="#1e40af" stroke-width="9" />
    <line x1="210" y1="281" x2="302" y2="281" stroke="#1e40af" stroke-width="9" />

    <!-- Welcoming sloped roof -->
    <path d="M88 260 L256 112 L424 260" stroke="#ffffff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M116 260 L256 134 L396 260" stroke="#fbbf24" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9" />

    <!-- Open Teacher Book Porch at base -->
    <path d="M100 374 C156 356 220 370 256 394 C292 370 356 356 412 374 V424 C356 406 292 420 256 442 C220 420 156 406 100 424 Z" fill="#ffffff" />
    <line x1="256" y1="394" x2="256" y2="442" stroke="#2563eb" stroke-width="10" stroke-linecap="round" />
  </g>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('Successfully generated all BaanPakKru PWA icons & icon.svg!');
