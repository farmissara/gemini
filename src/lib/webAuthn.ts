import type { UserRole } from '../types';

export interface EnrolledBiometricPasskey {
  credentialId: string; // base64url rawId
  userId: string;
  email: string;
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  deviceLabel: string;
  transports?: AuthenticatorTransport[];
  enrolledAt: string;
  lastVerifiedAt?: string;
  protectQuickAttendance: boolean;
  biometricLoginEnabled: boolean;
}

export interface WebAuthnSupportInfo {
  supported: boolean;
  secureContext: boolean;
  platformAuthenticatorAvailable: boolean;
  inIframe: boolean;
  reasonTh: string;
  reasonEn: string;
}

export interface BiometricSoftLockRecord {
  userId: string;
  email: string;
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  lockedAt: string;
}

const PASSKEY_STORAGE_KEY = 'eduverse_webauthn_passkeys_v1';
const UNLOCK_WINDOW_KEY = 'eduverse_biometric_unlock_v1';
const SOFT_LOCK_KEY = 'eduverse_biometric_screen_lock_v1';

function encodeBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const normalized = padded + '='.repeat(padLen);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function randomChallenge(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function getRpConfig(): PublicKeyCredentialRpEntity {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  if (host && !isIp) {
    return {
      id: host,
      name: 'BaanPakKru School OS',
    };
  }
  return {
    name: 'BaanPakKru School OS',
  };
}

export function detectBiometricDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Mobile Device';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple FaceID / TouchID';
  if (/Android/i.test(ua)) return 'Android Biometrics (Fingerprint / Face)';
  if (/Mac/i.test(ua)) return 'Mac Touch ID';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  return 'Platform Passkey';
}

export async function getWebAuthnSupportInfo(): Promise<WebAuthnSupportInfo> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      secureContext: false,
      platformAuthenticatorAvailable: false,
      inIframe: false,
      reasonTh: 'ไม่รองรับนอกเบราว์เซอร์',
      reasonEn: 'Not available outside browser.',
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const supported =
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.credentials !== 'undefined';

  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }

  if (!supported || !secureContext) {
    return {
      supported: false,
      secureContext,
      platformAuthenticatorAvailable: false,
      inIframe,
      reasonTh: !secureContext
        ? 'WebAuthn ต้องการ HTTPS หรือ localhost'
        : 'เบราว์เซอร์นี้ยังไม่รองรับ WebAuthn / Passkey',
      reasonEn: !secureContext
        ? 'WebAuthn requires HTTPS or localhost.'
        : 'WebAuthn / Passkeys are not supported in this browser.',
    };
  }

  let platformAvailable = false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    platformAvailable = false;
  }

  return {
    supported: true,
    secureContext: true,
    platformAuthenticatorAvailable: platformAvailable,
    inIframe,
    reasonTh: inIframe
      ? 'กำลังรันในกรอบ Preview/Iframe: หากเบราว์เซอร์บล็อก FaceID/TouchID ให้เปิดเว็บตรงบนเบราว์เซอร์มือถือ'
      : platformAvailable
        ? 'อุปกรณ์พร้อมใช้งาน FaceID / TouchID / ลายนิ้วมือ (WebAuthn Platform Passkey)'
        : 'พร้อมใช้งาน WebAuthn (อาจต้องใช้รหัสอุปกรณ์หรือกุญแจความปลอดภัย)',
    reasonEn: inIframe
      ? 'Running inside an iframe preview: if FaceID/TouchID is blocked by sandbox policy, open directly in mobile browser.'
      : platformAvailable
        ? 'Ready for FaceID / TouchID / Biometric Passkey.'
        : 'WebAuthn supported (platform or roaming authenticator).',
  };
}

export function loadEnrolledPasskeys(): EnrolledBiometricPasskey[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PASSKEY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EnrolledBiometricPasskey[]) : [];
  } catch {
    return [];
  }
}

function saveEnrolledPasskeys(list: EnrolledBiometricPasskey[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function getPasskeyForUser(userId?: string | null): EnrolledBiometricPasskey | null {
  if (!userId) return null;
  return loadEnrolledPasskeys().find((p) => p.userId === userId) || null;
}

export function getPrimaryDevicePasskey(): EnrolledBiometricPasskey | null {
  const all = loadEnrolledPasskeys();
  return all.find((p) => p.biometricLoginEnabled) || all[0] || null;
}

export function updatePasskeyPreferences(
  userId: string,
  patch: Partial<Pick<EnrolledBiometricPasskey, 'protectQuickAttendance' | 'biometricLoginEnabled'>>
): EnrolledBiometricPasskey | null {
  const all = loadEnrolledPasskeys();
  let updatedItem: EnrolledBiometricPasskey | null = null;
  const next = all.map((p) => {
    if (p.userId === userId) {
      updatedItem = { ...p, ...patch };
      return updatedItem;
    }
    return p;
  });
  saveEnrolledPasskeys(next);
  return updatedItem;
}

export function removeEnrolledPasskey(userIdOrCredentialId: string): EnrolledBiometricPasskey[] {
  const next = loadEnrolledPasskeys().filter(
    (p) => p.userId !== userIdOrCredentialId && p.credentialId !== userIdOrCredentialId
  );
  saveEnrolledPasskeys(next);
  clearBiometricSessionUnlock(userIdOrCredentialId);
  return next;
}

function mapWebAuthnError(err: unknown): Error {
  const domErr = err as { name?: string; message?: string };
  const name = domErr?.name || '';
  const msg = domErr?.message || String(err);

  if (name === 'NotAllowedError') {
    if (/permissions policy|publickey-credentials|iframe|feature/i.test(msg)) {
      return new Error(
        'กรอบแสดงผล Preview จำกัดสิทธิ์ WebAuthn กรุณาเปิดแอปโดยตรงในเบราว์เซอร์มือถือหรือติดตั้งเป็น PWA เพื่อใช้ FaceID / TouchID'
      );
    }
    return new Error('การยืนยันตัวตนด้วย FaceID / TouchID ถูกยกเลิกหรือหมดเวลา');
  }
  if (name === 'SecurityError') {
    return new Error('โดเมนหรือบริบทความปลอดภัยไม่รองรับ WebAuthn (ต้องใช้ HTTPS หรือเปิดนอก iframe)');
  }
  if (name === 'InvalidStateError') {
    return new Error('อุปกรณ์นี้มี Passkey ลงทะเบียนไว้แล้ว');
  }
  if (name === 'NotSupportedError') {
    return new Error('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับเซ็นเซอร์ไบโอเมตริกซ์แบบ Platform Passkey');
  }
  return new Error(msg || 'ไม่สามารถยืนยันตัวตนด้วยไบโอเมตริกซ์ได้');
}

export async function enrollBiometricPasskey(params: {
  userId: string;
  email: string;
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  protectQuickAttendance?: boolean;
}): Promise<EnrolledBiometricPasskey> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebAuthn / FaceID / TouchID');
  }

  const userBytes = new TextEncoder().encode(params.userId);
  const challengeBytes = randomChallenge(32);

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challengeBytes.buffer as ArrayBuffer,
        rp: getRpConfig(),
        user: {
          id: userBytes.buffer as ArrayBuffer,
          name: params.email || params.userId,
          displayName: params.fullNameTh || params.fullNameEn || params.email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('ไม่ได้รับข้อมูล Passkey จากอุปกรณ์');
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const transports: AuthenticatorTransport[] =
      typeof response.getTransports === 'function'
        ? (response.getTransports() as AuthenticatorTransport[])
        : ['internal'];

    const record: EnrolledBiometricPasskey = {
      credentialId: encodeBase64Url(credential.rawId),
      userId: params.userId,
      email: params.email,
      fullNameTh: params.fullNameTh,
      fullNameEn: params.fullNameEn,
      role: params.role,
      schoolId: params.schoolId,
      deviceLabel: detectBiometricDeviceLabel(),
      transports,
      enrolledAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      protectQuickAttendance:
        params.protectQuickAttendance ?? (params.role === 'admin' || params.role === 'super_admin' || params.role === 'teacher'),
      biometricLoginEnabled: true,
    };

    const existing = loadEnrolledPasskeys().filter((p) => p.userId !== params.userId);
    saveEnrolledPasskeys([record, ...existing]);
    markBiometricSessionUnlocked(params.userId);
    return record;
  } catch (err) {
    throw mapWebAuthnError(err);
  }
}

export async function verifyBiometricPasskey(params?: {
  userId?: string;
  credentialId?: string;
}): Promise<{ verified: true; passkey: EnrolledBiometricPasskey }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebAuthn / FaceID / TouchID');
  }

  const all = loadEnrolledPasskeys();
  const target =
    (params?.credentialId && all.find((p) => p.credentialId === params.credentialId)) ||
    (params?.userId && all.find((p) => p.userId === params.userId)) ||
    getPrimaryDevicePasskey();

  if (!target) {
    throw new Error('ยังไม่ได้ลงทะเบียน FaceID / TouchID บนอุปกรณ์นี้');
  }

  const challengeBytes = randomChallenge(32);
  const rawIdBytes = decodeBase64Url(target.credentialId);

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes.buffer as ArrayBuffer,
        rpId: getRpConfig().id,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawIdBytes.buffer as ArrayBuffer,
            transports: target.transports && target.transports.length > 0 ? target.transports : ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('การยืนยันไบโอเมตริกซ์ไม่สำเร็จ');
    }

    const nowIso = new Date().toISOString();
    const updatedPasskey: EnrolledBiometricPasskey = {
      ...target,
      lastVerifiedAt: nowIso,
    };
    saveEnrolledPasskeys(all.map((p) => (p.credentialId === target.credentialId ? updatedPasskey : p)));
    markBiometricSessionUnlocked(target.userId);
    return { verified: true, passkey: updatedPasskey };
  } catch (err) {
    throw mapWebAuthnError(err);
  }
}

export function markBiometricSessionUnlocked(userId: string, ttlMinutes = 15): void {
  if (typeof window === 'undefined') return;
  try {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    sessionStorage.setItem(UNLOCK_WINDOW_KEY, JSON.stringify({ userId, expiresAt }));
  } catch {
    // ignore
  }
}

export function getBiometricUnlockRemainingMinutes(userId?: string | null): number {
  if (typeof window === 'undefined' || !userId) return 0;
  try {
    const raw = sessionStorage.getItem(UNLOCK_WINDOW_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { userId?: string; expiresAt?: number };
    if (parsed.userId !== userId || !parsed.expiresAt) return 0;
    const diffMs = parsed.expiresAt - Date.now();
    if (diffMs <= 0) {
      sessionStorage.removeItem(UNLOCK_WINDOW_KEY);
      return 0;
    }
    return Math.ceil(diffMs / 60000);
  } catch {
    return 0;
  }
}

export function isBiometricSessionUnlocked(userId?: string | null): boolean {
  return getBiometricUnlockRemainingMinutes(userId) > 0;
}

export function clearBiometricSessionUnlock(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!userId) {
      sessionStorage.removeItem(UNLOCK_WINDOW_KEY);
      return;
    }
    const raw = sessionStorage.getItem(UNLOCK_WINDOW_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { userId?: string };
    if (parsed.userId === userId) {
      sessionStorage.removeItem(UNLOCK_WINDOW_KEY);
    }
  } catch {
    // ignore
  }
}

export function getBiometricSoftLock(): BiometricSoftLockRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SOFT_LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BiometricSoftLockRecord;
    return parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
}

export function setBiometricSoftLock(record: BiometricSoftLockRecord | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!record) {
      localStorage.removeItem(SOFT_LOCK_KEY);
    } else {
      localStorage.setItem(SOFT_LOCK_KEY, JSON.stringify(record));
    }
  } catch {
    // ignore
  }
}
