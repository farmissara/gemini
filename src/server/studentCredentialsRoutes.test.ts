import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import express from 'express';
import {
  createStudentCredentialsRouter,
  formatStudentPasswordPolicyError,
  getStudentInitialPassword,
  getSyntheticStudentEmail,
  validateStudentCredentialPayload,
} from './studentCredentialsRoutes';

describe('student credentials route helpers', () => {
  it('uses trimmed student ID number and supports short-ID prefix and birthdate initial passwords', () => {
    assert.equal(getStudentInitialPassword(' ED-69001 '), 'ED-69001');
    assert.equal(getStudentInitialPassword('68010025'), '68010025');
    assert.equal(getStudentInitialPassword('1001'), '1001');
    assert.equal(
      getStudentInitialPassword('1001', { defaultPasswordType: 'student_id', shortIdPasswordPrefix: '00' }),
      '001001'
    );
    assert.equal(
      getStudentInitialPassword('1001', { defaultPasswordType: 'birthdate', dateOfBirth: '2008-04-12' }),
      '12042551'
    );
    assert.equal(getStudentInitialPassword('   '), '');
  });

  it('formats short-password Auth errors accurately without blaming student ID length', () => {
    const formatted = formatStudentPasswordPolicyError(
      '1001',
      'Password should be at least 6 characters.',
      '1001'
    );
    assert.ok(formatted.includes('"1001"'));
    assert.ok(formatted.includes('6 ตัวอักษร'));
    assert.ok(formatted.includes('คำนำหน้ารหัสผ่านเริ่มต้น'));
    assert.ok(!formatted.includes('ปรับรหัสนักเรียนให้ยาวอย่างน้อย 6'));
    assert.equal(
      formatStudentPasswordPolicyError('100001', 'Network timeout'),
      'Network timeout'
    );
  });

  it('derives deterministic synthetic student email matching the Edge Function SHA-256 format', () => {
    const expectedHash = createHash('sha256').update('school-1:student-1', 'utf8').digest('hex');
    assert.equal(
      getSyntheticStudentEmail('school-1', 'student-1'),
      `student-${expectedHash}@accounts.eduverse.invalid`
    );
  });

  it('validates operation, schoolId, and studentId payloads including batch filters and passwordConfig', () => {
    assert.deepEqual(
      validateStudentCredentialPayload({ operation: 'create', schoolId: ' s1 ', studentId: ' st1 ' }),
      { ok: true, operation: 'create', schoolId: 's1', studentId: 'st1' }
    );
    assert.deepEqual(
      validateStudentCredentialPayload({ operation: 'create_all_missing', schoolId: 's1' }),
      { ok: true, operation: 'create_all_missing', schoolId: 's1', studentId: '' }
    );
    assert.deepEqual(
      validateStudentCredentialPayload({
        operation: 'create_all_missing',
        schoolId: 's1',
        studentIds: [' stu-1 ', 'stu-2', 'stu-1', ''],
        passwordConfig: { defaultPasswordType: 'student_id', shortIdPasswordPrefix: ' 00 ' },
      }),
      {
        ok: true,
        operation: 'create_all_missing',
        schoolId: 's1',
        studentId: '',
        studentIds: ['stu-1', 'stu-2'],
        passwordConfig: { defaultPasswordType: 'student_id', shortIdPasswordPrefix: '00' },
      }
    );
    assert.equal(
      validateStudentCredentialPayload({ operation: 'reset', schoolId: 's1' }).ok,
      false
    );
    assert.equal(
      validateStudentCredentialPayload({ operation: 'delete', schoolId: 's1', studentId: 'st1' }).ok,
      false
    );
    assert.equal(
      validateStudentCredentialPayload({ operation: 'create', schoolId: '', studentId: 'st1' }).ok,
      false
    );
  });

  it('enforces Bearer auth and returns 503 when server Supabase service role is unconfigured', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/student-credentials', createStudentCredentialsRouter(() => ''));

    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const baseUrl = `http://127.0.0.1:${address.port}/api/student-credentials`;

      const unauthRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'reset', schoolId: 's1', studentId: 'st1' }),
      });
      assert.equal(unauthRes.status, 401);

      const unconfiguredRes = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer dummy-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation: 'reset', schoolId: 's1', studentId: 'st1' }),
      });
      assert.equal(unconfiguredRes.status, 503);
      const body = (await unconfiguredRes.json()) as { error?: string };
      assert.equal(body.error, 'STUDENT_CREDENTIALS_SERVER_NOT_CONFIGURED');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
