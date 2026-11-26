import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptBackup, encryptBackup, isEncryptedBackup } from './backupEncryption.ts';

const validPassphrase = 'correct horse battery';

test('encrypts local backups and restores the original content with the same passphrase', async () => {
  const source = JSON.stringify({ scope: 'school', records: [{ studentId: 'S-01' }] });
  const encrypted = await encryptBackup(source, validPassphrase);

  assert.equal(isEncryptedBackup(encrypted), true);
  assert.notEqual(encrypted, source);
  assert.deepEqual(await decryptBackup(encrypted, validPassphrase), {
    content: source,
    encrypted: true,
  });
});

test('rejects a wrong passphrase and tampered encrypted content', async () => {
  const encrypted = await encryptBackup('{"records":[]}', validPassphrase);

  await assert.rejects(() => decryptBackup(encrypted, 'wrong passphrase value'), /รหัสผ่านไม่ถูกต้อง/);

  const envelope = JSON.parse(encrypted) as { ciphertext: string };
  envelope.ciphertext = `${envelope.ciphertext[0] === 'A' ? 'B' : 'A'}${envelope.ciphertext.slice(1)}`;
  await assert.rejects(
    () => decryptBackup(JSON.stringify(envelope), validPassphrase),
    /รหัสผ่านไม่ถูกต้อง/
  );
});

test('passes legacy plaintext backup files through and enforces a minimum passphrase length', async () => {
  const legacyBackup = '{"format":"baanpakkru-backup","records":[]}';

  assert.equal(isEncryptedBackup(legacyBackup), false);
  assert.deepEqual(await decryptBackup(legacyBackup, ''), {
    content: legacyBackup,
    encrypted: false,
  });
  await assert.rejects(() => encryptBackup(legacyBackup, 'short'), /อย่างน้อย 12/);
});
