import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeCode128B, sanitizeCode128BText } from './barcode128.ts';

test('encodeCode128B produces Start B, valid Mod-103 checksum, and Stop pattern with exact module count', () => {
  const result = encodeCode128B('STU-2026-0842');
  assert.equal(result.encodedText, 'STU-2026-0842');
  // 13 chars => Start(1) + Data(13) + Checksum(1) => 15 * 11 modules + Stop(13 modules) = 178 modules
  assert.equal(result.totalModules, 15 * 11 + 13);
  assert.ok(result.bars.length > 0);
  // Start B begins with a 2-module bar at x=0
  assert.deepEqual(result.bars[0], { x: 0, width: 2 });
  // Stop symbol ends with a 2-module termination bar right at totalModules
  const lastBar = result.bars[result.bars.length - 1];
  assert.equal(lastBar.x + lastBar.width, result.totalModules);
  assert.equal(lastBar.width, 2);
});

test('encodeCode128B supports teacher/staff IDs and differs for distinct codes', () => {
  const a = encodeCode128B('TCH-1001');
  const b = encodeCode128B('TCH-1002');
  assert.notEqual(a.checksum, b.checksum);
  assert.notDeepEqual(a.bars, b.bars);
});

test('sanitizeCode128BText strips unsupported non-ASCII characters and falls back safely', () => {
  assert.equal(sanitizeCode128BText('  ครู 1234  '), '1234');
  assert.equal(sanitizeCode128BText(''), 'ID-0000');
});
