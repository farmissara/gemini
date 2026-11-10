// Pure TypeScript ISO 18004 QR Code generator (Byte mode, Error Correction Level L, Versions 1-10)
// Zero external dependencies; generates genuinely scannable QR matrices for URLs and check-in codes.

interface VersionSpec {
  version: number;
  size: number;
  totalCodewords: number;
  ecPerBlock: number;
  blocks: [number, number][]; // [count, dataCodewords]
  alignment: number[];
  versionBits?: number;
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, totalCodewords: 26, ecPerBlock: 7, blocks: [[1, 19]], alignment: [] },
  { version: 2, size: 25, totalCodewords: 44, ecPerBlock: 10, blocks: [[1, 34]], alignment: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, ecPerBlock: 15, blocks: [[1, 55]], alignment: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, ecPerBlock: 20, blocks: [[1, 80]], alignment: [6, 26] },
  { version: 5, size: 37, totalCodewords: 134, ecPerBlock: 26, blocks: [[1, 108]], alignment: [6, 30] },
  { version: 6, size: 41, totalCodewords: 172, ecPerBlock: 18, blocks: [[2, 68]], alignment: [6, 34] },
  { version: 7, size: 45, totalCodewords: 196, ecPerBlock: 20, blocks: [[2, 78]], alignment: [6, 22, 38], versionBits: 0x07c94 },
  { version: 8, size: 49, totalCodewords: 242, ecPerBlock: 24, blocks: [[2, 97]], alignment: [6, 24, 42], versionBits: 0x085bc },
  { version: 9, size: 53, totalCodewords: 292, ecPerBlock: 30, blocks: [[2, 116]], alignment: [6, 26, 46], versionBits: 0x09a99 },
  { version: 10, size: 57, totalCodewords: 346, ecPerBlock: 18, blocks: [[2, 68], [2, 69]], alignment: [6, 28, 50], versionBits: 0x0a4d3 },
];

// Format bits for EC Level L (01) and Mask 0..7 after BCH(15,5) + 0x5412 XOR
const FORMAT_INFO_L = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];

// GF(256) with primitive polynomial 0x11d (285)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEc(data: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Array<number>(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < ecCount; i++) {
        res[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return res;
}

function encodeBytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  const arr = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    arr[i] = text.charCodeAt(i) & 0xff;
  }
  return arr;
}

function chooseVersion(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS) {
    const dataCodewords = spec.blocks.reduce((sum, [cnt, len]) => sum + cnt * len, 0);
    const countBits = spec.version >= 10 ? 16 : 8;
    const overheadBits = 4 + countBits;
    const maxBytes = Math.floor((dataCodewords * 8 - overheadBits) / 8);
    if (byteLength <= maxBytes) {
      return spec;
    }
  }
  return VERSION_SPECS[VERSION_SPECS.length - 1];
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec): number[] {
  const totalDataCodewords = spec.blocks.reduce((sum, [cnt, len]) => sum + cnt * len, 0);
  const countBits = spec.version >= 10 ? 16 : 8;
  const maxBytes = Math.floor((totalDataCodewords * 8 - (4 + countBits)) / 8);
  const payload = bytes.slice(0, maxBytes);

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode indicator: 0100 (Byte mode)
  pushBits(0b0100, 4);
  pushBits(payload.length, countBits);
  for (const b of payload) {
    pushBits(b, 8);
  }

  const capacityBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, capacityBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let b = 0; b < 8; b++) {
      val = (val << 1) | bits[i + b];
    }
    dataBytes.push(val);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < totalDataCodewords) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // Split into blocks and compute RS EC codewords
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (const [count, len] of spec.blocks) {
    for (let c = 0; c < count; c++) {
      const slice = dataBytes.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(slice);
      ecBlocks.push(rsComputeEc(slice, spec.ecPerBlock));
    }
  }

  // Interleave data codewords, then EC codewords
  const interleaved: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) interleaved.push(ec[i]);
    }
  }

  return interleaved;
}

function createBaseMatrix(spec: VersionSpec): { modules: boolean[][]; isFunction: boolean[][] } {
  const n = spec.size;
  const modules = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const isFunction = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));

  const setFunc = (r: number, c: number, val: boolean) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return;
    modules[r][c] = val;
    isFunction[r][c] = true;
  };

  const placeFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        const isDark =
          r >= 0 &&
          r <= 6 &&
          c >= 0 &&
          c <= 6 &&
          (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        setFunc(rr, cc, isDark);
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  for (const r of spec.alignment) {
    for (const c of spec.alignment) {
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isDark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setFunc(r + dr, c + dc, isDark);
        }
      }
    }
  }

  // Reserve format info cells
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][n - 1 - i] = true;
    isFunction[n - 1 - i][8] = true;
  }
  // Dark module
  setFunc(n - 8, 8, true);

  // Version info (version >= 7)
  if (spec.versionBits !== undefined) {
    for (let i = 0; i < 18; i++) {
      const bit = ((spec.versionBits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      setFunc(a, n - 11 + b, bit);
      setFunc(n - 11 + b, a, bit);
    }
  }

  return { modules, isFunction };
}

function drawFormatInfo(modules: boolean[][], maskPattern: number) {
  const n = modules.length;
  const data = FORMAT_INFO_L[maskPattern];
  for (let i = 0; i < 15; i++) {
    const bit = ((data >> i) & 1) === 1;
    // Vertical
    if (i < 6) modules[i][8] = bit;
    else if (i < 8) modules[i + 1][8] = bit;
    else modules[n - 15 + i][8] = bit;

    // Horizontal
    if (i < 8) modules[8][n - 1 - i] = bit;
    else if (i < 9) modules[8][15 - i] = bit;
    else modules[8][14 - i] = bit;
  }
}

function applyMaskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function computePenalty(modules: boolean[][]): number {
  const n = modules.length;
  let penalty = 0;

  // Adjacent same-color runs
  for (let r = 0; r < n; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < n; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < n; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < n; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // 2x2 blocks
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = encodeBytes(text);
  const spec = chooseVersion(bytes.length);
  const codewords = buildCodewords(bytes, spec);
  const { modules: base, isFunction } = createBaseMatrix(spec);
  const n = spec.size;

  // Place data bits in zig-zag order (mask-independent coordinates first)
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      const r = upward ? n - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let bit = false;
          if (bitIndex < totalBits) {
            const cw = codewords[bitIndex >> 3];
            bit = ((cw >> (7 - (bitIndex & 7))) & 1) === 1;
          }
          base[r][c] = bit;
          bitIndex++;
        }
      }
    }
    upward = !upward;
  }

  // Evaluate all 8 masks and pick lowest penalty
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestMatrix: boolean[][] = base;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.map((row, r) =>
      row.map((val, c) => (!isFunction[r][c] && applyMaskCondition(mask, r, c) ? !val : val))
    );
    drawFormatInfo(candidate, mask);
    const penalty = computePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestMatrix = candidate;
    }
  }

  void bestMask;
  return bestMatrix;
}
