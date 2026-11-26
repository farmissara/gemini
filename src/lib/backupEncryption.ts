const ENVELOPE_FORMAT = 'baanpakkru-encrypted-backup';
const ENVELOPE_VERSION = 1;
const PBKDF2_ITERATIONS = 600_000;
export const MIN_BACKUP_PASSPHRASE_LENGTH = 12;
export const MAX_BACKUP_PASSPHRASE_LENGTH = 256;
export const MAX_ENCRYPTED_BACKUP_BYTES = 70 * 1024 * 1024;

type EncryptedBackupEnvelope = {
  format: typeof ENVELOPE_FORMAT;
  version: typeof ENVELOPE_VERSION;
  kdf: 'PBKDF2-SHA-256';
  iterations: typeof PBKDF2_ITERATIONS;
  cipher: 'AES-256-GCM';
  salt: string;
  iv: string;
  ciphertext: string;
};

export type DecryptedBackup = {
  content: string;
  encrypted: boolean;
};

function assertPassphrase(passphrase: string) {
  const length = Array.from(passphrase).length;
  if (length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    throw new Error(`รหัสผ่านต้องมีอย่างน้อย ${MIN_BACKUP_PASSPHRASE_LENGTH} ตัวอักษร`);
  }
  if (length > MAX_BACKUP_PASSPHRASE_LENGTH) {
    throw new Error(`รหัสผ่านต้องมีไม่เกิน ${MAX_BACKUP_PASSPHRASE_LENGTH} ตัวอักษร`);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error('ไฟล์สำรองเข้ารหัสมีรูปแบบไม่ถูกต้อง');
  }
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: bytesToArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isEncryptedBackup(content: string): boolean {
  try {
    const parsed: unknown = JSON.parse(content);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'format' in parsed &&
      parsed.format === ENVELOPE_FORMAT
    );
  } catch {
    return false;
  }
}

export async function encryptBackup(content: string, passphrase: string): Promise<string> {
  assertPassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(content)
  );
  const envelope: EncryptedBackupEnvelope = {
    format: ENVELOPE_FORMAT,
    version: ENVELOPE_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(envelope);
}

export async function decryptBackup(
  content: string,
  passphrase: string
): Promise<DecryptedBackup> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { content, encrypted: false };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('format' in parsed) ||
    parsed.format !== ENVELOPE_FORMAT
  ) {
    return { content, encrypted: false };
  }

  const envelope = parsed as Partial<EncryptedBackupEnvelope>;
  if (
    envelope.version !== ENVELOPE_VERSION ||
    envelope.kdf !== 'PBKDF2-SHA-256' ||
    envelope.iterations !== PBKDF2_ITERATIONS ||
    envelope.cipher !== 'AES-256-GCM' ||
    typeof envelope.salt !== 'string' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.ciphertext !== 'string'
  ) {
    throw new Error('ไม่รองรับรูปแบบไฟล์สำรองเข้ารหัสนี้');
  }

  assertPassphrase(passphrase);
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length === 0) {
    throw new Error('ไฟล์สำรองเข้ารหัสเสียหาย');
  }

  const key = await deriveEncryptionKey(passphrase, salt);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytesToArrayBuffer(iv) },
      key,
      bytesToArrayBuffer(ciphertext)
    );
    return { content: new TextDecoder().decode(plaintext), encrypted: true };
  } catch {
    throw new Error('รหัสผ่านไม่ถูกต้อง หรือไฟล์สำรองเสียหาย');
  }
}
