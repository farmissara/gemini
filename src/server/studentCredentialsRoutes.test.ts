import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import express from 'express';
import {
  createStudentCredentialsRouter,
  generateTemporaryPassword,
  getSyntheticStudentEmail,
  TEMP_PASSWORD_ALPHABET,
  TEMP_PASSWORD_LENGTH,
  validateStudentCredentialPayload,
} from './studentCredentialsRoutes';

describe('student credentials route helpers', () => {
  it('generates 8-character passwords from the unambiguous alphabet', () => {
    for (let i = 0; i < 20; i++) {
      const password = generateTemporaryPassword();
      assert.equal(password.length, TEMP_PASSWORD_LENGTH);
      for (const ch of password) {
        assert.ok(TEMP_PASSWORD_ALPHABET.includes(ch), `Unexpected char ${ch}`);
      }
    }
  });

  it('derives deterministic synthetic student email matching the Edge Function SHA-256 format', () => {
    const expectedHash = createHash('sha256').update('school-1:student-1', 'utf8').digest('hex');
    assert.equal(
      getSyntheticStudentEmail('school-1', 'student-1'),
      `student-${expectedHash}@accounts.eduverse.invalid`
    );
  });

  it('validates operation, schoolId, and studentId payloads', () => {
    assert.deepEqual(
      validateStudentCredentialPayload({ operation: 'create', schoolId: ' s1 ', studentId: ' st1 ' }),
      { ok: true, operation: 'create', schoolId: 's1', studentId: 'st1' }
    );
    assert.deepEqual(
      validateStudentCredentialPayload({ operation: 'create_all_missing', schoolId: 's1' }),
      { ok: true, operation: 'create_all_missing', schoolId: 's1', studentId: '' }
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
