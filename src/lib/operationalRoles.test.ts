import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableOperationalRoles } from './operationalRoles';

test('only school-admin teachers can switch from teacher to admin mode', () => {
  assert.deepEqual(
    getAvailableOperationalRoles({
      accountRole: 'teacher',
      isSchoolAdminTeacher: false,
      hasTeacherProfile: true,
    }),
    ['teacher']
  );
  assert.deepEqual(
    getAvailableOperationalRoles({
      accountRole: 'teacher',
      isSchoolAdminTeacher: true,
      hasTeacherProfile: true,
    }),
    ['admin', 'teacher']
  );
});

test('school admins can switch to teacher mode only when linked to a teacher profile', () => {
  assert.deepEqual(
    getAvailableOperationalRoles({
      accountRole: 'admin',
      isSchoolAdminTeacher: false,
      hasTeacherProfile: true,
    }),
    ['admin', 'teacher']
  );
  assert.deepEqual(
    getAvailableOperationalRoles({
      accountRole: 'admin',
      isSchoolAdminTeacher: false,
      hasTeacherProfile: false,
    }),
    ['admin']
  );
});
