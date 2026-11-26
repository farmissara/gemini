import assert from 'node:assert/strict';
import test from 'node:test';
import { getMobileTabForNavTab } from './mobileNavigation.ts';

test('routes mobile-supported modules without leaving the mobile shell', () => {
  assert.equal(getMobileTabForNavTab('mobile_checkin', 'teacher'), 'checkin');
  assert.equal(getMobileTabForNavTab('timetable', 'teacher'), 'timetable');
});

test('selects role-specific mobile routes and leaves unsupported modules to the desktop fallback', () => {
  assert.equal(getMobileTabForNavTab('gradebook', 'teacher'), 'gradebook');
  assert.equal(getMobileTabForNavTab('gradebook', 'student'), 'student_grades');
  assert.equal(getMobileTabForNavTab('super_admin_console', 'super_admin'), 'super_schools');
  assert.equal(getMobileTabForNavTab('super_admin_console', 'admin'), null);
  assert.equal(getMobileTabForNavTab('system_settings', 'admin'), null);
  assert.equal(getMobileTabForNavTab('courses', 'teacher'), null);
  assert.equal(getMobileTabForNavTab('students', 'admin'), null);
});
