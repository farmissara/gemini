// Pure TypeScript ISO/IEC 15417 Code 128B barcode encoder (zero dependencies).
// Produces standard Start-B + data symbols + Mod-103 checksum + Stop pattern (13 bars/spaces).

export interface BarcodeBarRun {
  x: number;
  width: number;
}

export interface Code128EncodeResult {
  encodedText: string;
  bars: BarcodeBarRun[];
  totalModules: number;
  checksum: number;
}

// Each 6-digit string encodes [bar, space, bar, space, bar, space] module widths (sum = 11),
// except index 106 (STOP) which has 7 elements [2,3,3,1,1,1,2] (sum = 13).
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B_CODE = 104;
const STOP_CODE = 106;

/** Sanitize arbitrary input to printable ASCII (0x20..0x7E) supported by Code 128B. */
export function sanitizeCode128BText(raw: string): string {
  const cleaned = raw
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned : 'ID-0000';
}

export function encodeCode128B(rawText: string): Code128EncodeResult {
  const encodedText = sanitizeCode128BText(rawText);
  const symbolValues: number[] = [START_B_CODE];
  let weightedSum = START_B_CODE;

  for (let i = 0; i < encodedText.length; i++) {
    const ascii = encodedText.charCodeAt(i);
    const value = Math.max(0, Math.min(94, ascii - 32));
    symbolValues.push(value);
    weightedSum += value * (i + 1);
  }

  const checksum = weightedSum % 103;
  symbolValues.push(checksum, STOP_CODE);

  const bars: BarcodeBarRun[] = [];
  let cursor = 0;

  for (const sym of symbolValues) {
    const pattern = CODE128_PATTERNS[sym];
    if (!pattern) continue;
    for (let idx = 0; idx < pattern.length; idx++) {
      const w = Number(pattern[idx]);
      if (idx % 2 === 0) {
        bars.push({ x: cursor, width: w });
      }
      cursor += w;
    }
  }

  return {
    encodedText,
    bars,
    totalModules: cursor,
    checksum,
  };
}
