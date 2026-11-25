import assert from 'node:assert/strict';
import test from 'node:test';
import { computeScaledDimensions } from './imageCompression.ts';

test('computeScaledDimensions preserves small dimensions and scales large landscapes/portraits proportionally', () => {
  assert.deepEqual(computeScaledDimensions(400, 300, 960), { width: 400, height: 300 });
  assert.deepEqual(computeScaledDimensions(1920, 1080, 540), { width: 540, height: 304 });
  assert.deepEqual(computeScaledDimensions(1200, 2400, 960), { width: 480, height: 960 });
  assert.deepEqual(computeScaledDimensions(0, -5, 320), { width: 320, height: 320 });
});
