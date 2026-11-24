import test from 'node:test';
import assert from 'node:assert/strict';
import { belongsToSchool } from './schoolDataScope';

test('school records stay isolated unless demo data is explicitly allowed to be unassigned', () => {
  assert.equal(belongsToSchool({ schoolId: 'school-a' }, 'school-a'), true);
  assert.equal(belongsToSchool({ schoolId: 'school-b' }, 'school-a'), false);
  assert.equal(belongsToSchool({}, 'school-a'), false);
  assert.equal(belongsToSchool({}, 'school-a', true), true);
  assert.equal(belongsToSchool({}, '', true), true);
});
