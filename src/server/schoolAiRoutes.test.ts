import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decryptSchoolApiKey, encryptSchoolApiKey } from './schoolAiRoutes';

const encryptionSecret = Buffer.alloc(32, 19).toString('base64');
const env = (name: string) => name === 'SCHOOL_AI_ENCRYPTION_KEY' ? encryptionSecret : '';

describe('school Gemini API key encryption', () => {
  it('encrypts at rest and decrypts only for the same school', () => {
    const key = 'AIzaSyA_school_test_key_1234567890';
    const encrypted = encryptSchoolApiKey(env, 'school-one', key);
    const secret = { school_id: 'school-one', ...encrypted, enabled: true, monthly_request_limit: 300 };

    assert.notEqual(encrypted.key_ciphertext, Buffer.from(key).toString('base64'));
    assert.equal(encrypted.key_last4, key.slice(-4));
    assert.equal(decryptSchoolApiKey(env, secret), key);
    assert.throws(() => decryptSchoolApiKey(env, { ...secret, school_id: 'school-two' }));
  });

  it('rejects a missing or invalid encryption secret', () => {
    assert.throws(() => encryptSchoolApiKey(() => '', 'school-one', 'AIzaSyA_school_test_key_1234567890'));
    assert.throws(() => encryptSchoolApiKey(() => 'short', 'school-one', 'AIzaSyA_school_test_key_1234567890'));
  });
});
