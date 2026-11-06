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
  ihdr[8] = 8; // 8 bits per sample
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

// Draw EduVerse Logo: Deep royal blue gradient, rounded corners, graduation cap icon + book
function drawEduVerseIcon(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2;

  // Background: Deep royal blue gradient (#1e3a8a to #1d4ed8 to #0284c7)
  const gradY = y / height;
  const bgR = Math.round(30 + gradY * 10);
  const bgG = Math.round(58 + gradY * 40);
  const bgB = Math.round(138 + gradY * 80);

  // If not maskable, round corners with 22% radius
  if (!isMaskable) {
    const cornerR = width * 0.22;
    const dx = Math.min(x, width - 1 - x);
    const dy = Math.min(y, height - 1 - y);
    if (dx < cornerR && dy < cornerR) {
      const dist = Math.hypot(cornerR - dx, cornerR - dy);
      if (dist > cornerR) {
        return [0, 0, 0, 0]; // Transparent outside rounded corner
      }
    }
  }

  // Draw Graduation Cap Emblem centered inside safe zone
  // Safe zone scale: maskable has 0.70 scale, standard has 0.78 scale
  const scale = (isMaskable ? 0.70 : 0.78) * (width / 512);
  const nx = (x - cx) / scale;
  const ny = (y - cy) / scale;

  // 1. Cap Top Rhombus (Diamond): center at (0, -35)
  // Diamond vertices: (0, -85), (120, -35), (0, 15), (-120, -35)
  const capY = -30;
  const dxRhombus = Math.abs(nx);
  const dyRhombus = Math.abs(ny - capY);
  // equation: dx / 130 + dy / 45 <= 1
  if (dxRhombus / 125 + dyRhombus / 48 <= 1.0) {
    // White cap top
    return [255, 255, 255, 255];
  }

  // Cap underside rim
  if (Math.abs(nx) <= 65 && ny >= capY && ny <= capY + 35) {
    const rimY = ny - capY;
    if (Math.abs(nx) <= 65 - rimY * 0.3) {
      return [240, 245, 255, 255];
    }
  }

  // Gold tassel hanging on right: from (95, capY) to (115, capY + 70)
  if (nx >= 85 && nx <= 108 && ny >= capY && ny <= capY + 75) {
    const tasselDx = Math.abs(nx - (95 + (ny - capY) * 0.15));
    if (tasselDx <= 4) {
      return [250, 204, 21, 255]; // Golden tassel
    }
    // Tassel bottom ball
    if (ny >= capY + 65 && Math.hypot(nx - 106, ny - (capY + 70)) <= 8) {
      return [234, 179, 8, 255]; // Gold ball
    }
  }

  // 2. Open Book below cap: center at (0, 75)
  // Left page and Right page
  if (ny >= 35 && ny <= 100) {
    const pageX = Math.abs(nx);
    if (pageX >= 8 && pageX <= 110) {
      const pageY = ny - 35;
      // Slight arc on top and bottom of book pages
      const arcTop = Math.sin((pageX / 110) * Math.PI) * 10;
      if (pageY >= 10 - arcTop && pageY <= 55 - arcTop) {
        // Book page lines (accent stripes)
        if (pageY >= 20 - arcTop && pageY <= 24 - arcTop && pageX >= 22 && pageX <= 95) {
          return [59, 130, 246, 255]; // Cyan-blue text line
        }
        if (pageY >= 30 - arcTop && pageY <= 34 - arcTop && pageX >= 22 && pageX <= 80) {
          return [59, 130, 246, 255]; // Cyan-blue text line
        }
        return [255, 255, 255, 255]; // White open page
      }
    }
    // Book center spine
    if (Math.abs(nx) <= 6 && ny >= 40 && ny <= 95) {
      return [203, 213, 225, 255];
    }
  }

  // Base background
  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA PNG icons in', publicDir);

// 1. 192x192 Standard
const png192 = createPng(192, 192, (x, y, w, h) => drawEduVerseIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// 2. 512x512 Standard
const png512 = createPng(512, 512, (x, y, w, h) => drawEduVerseIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// 3. 512x512 Maskable (Safe margins, no corner clip)
const pngMaskable = createPng(512, 512, (x, y, w, h) => drawEduVerseIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

// 4. Apple Touch Icon (180x180)
const pngApple = createPng(180, 180, (x, y, w, h) => drawEduVerseIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

// 5. Favicon (64x64 PNG saved as favicon.ico and favicon.png)
const pngFavicon = createPng(64, 64, (x, y, w, h) => drawEduVerseIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), pngFavicon);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), pngFavicon);

// 6. SVG Brand Vector Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <g filter="url(#shadow)" transform="translate(0, 10)">
    <!-- Graduation Cap Diamond -->
    <polygon points="256,120 420,185 256,250 92,185" fill="#ffffff" />
    <!-- Cap Underneath Base -->
    <path d="M176,218 L176,270 C176,306 336,306 336,270 L336,218 Z" fill="#e0e7ff" />
    <!-- Golden Tassel -->
    <path d="M386,198 C386,198 406,230 404,290" stroke="#facc15" stroke-width="8" stroke-linecap="round" fill="none" />
    <circle cx="404" cy="298" r="12" fill="#eab308" />
    <!-- Open Book -->
    <path d="M120,330 C180,315 240,335 256,345 C272,335 332,315 392,330 L392,400 C332,385 272,405 256,415 C240,405 180,385 120,400 Z" fill="#ffffff" />
    <path d="M256,345 L256,415" stroke="#94a3b8" stroke-width="4" />
    <!-- Book lines -->
    <line x1="150" y1="352" x2="228" y2="352" stroke="#60a5fa" stroke-width="5" stroke-linecap="round" />
    <line x1="150" y1="370" x2="216" y2="370" stroke="#60a5fa" stroke-width="5" stroke-linecap="round" />
    <line x1="284" y1="352" x2="362" y2="352" stroke="#60a5fa" stroke-width="5" stroke-linecap="round" />
    <line x1="284" y1="370" x2="350" y2="370" stroke="#60a5fa" stroke-width="5" stroke-linecap="round" />
  </g>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('Successfully generated all PWA icons & icon.svg!');
