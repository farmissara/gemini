import { AttendanceCheckType } from '../types';

export interface ExpiringPeriodQrSession {
  id: string;
  schoolId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  periodNumber: number;
  timeSlot: string;
  date: string;
  checkType: AttendanceCheckType;
  ttlMinutes: number;
  issuedAt: number;
  expiresAt: number;
  token: string;
  shortCode: string;
  url: string;
  revokedAt?: number;
}

const REVOKED_TOKENS_KEY_PREFIX = 'eduverse_revoked_period_qr_';
const ACTIVE_SESSIONS_KEY_PREFIX = 'eduverse_period_qr_sessions_';

function createRandomToken(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export function buildExpiringPeriodQrSession(params: {
  schoolId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  periodNumber: number;
  timeSlot: string;
  date: string;
  checkType: AttendanceCheckType;
  ttlMinutes: number;
}): ExpiringPeriodQrSession {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + Math.max(1, params.ttlMinutes) * 60_000;
  const nonce = createRandomToken();
  const cleanCourseCode = (params.courseCode || 'CLS').replace(/[^A-Za-z0-9-]/g, '').toUpperCase() || 'CLS';
  const shortCode = `${cleanCourseCode}-P${params.periodNumber}-${nonce}`;
  const token = `${shortCode}-${issuedAt.toString(36).toUpperCase()}`;

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://eduverse.school';

  const search = new URLSearchParams({
    tab: 'mobile_checkin',
    subTab: 'period_checkin',
    courseId: params.courseId,
    period: String(params.periodNumber),
    date: params.date,
    code: shortCode,
    token,
    exp: String(expiresAt),
    type: params.checkType,
  });

  return {
    id: `pqr-${issuedAt}-${nonce}`,
    schoolId: params.schoolId,
    courseId: params.courseId,
    courseCode: params.courseCode || cleanCourseCode,
    courseTitle: params.courseTitle,
    periodNumber: params.periodNumber,
    timeSlot: params.timeSlot,
    date: params.date,
    checkType: params.checkType,
    ttlMinutes: params.ttlMinutes,
    issuedAt,
    expiresAt,
    token,
    shortCode,
    url: `${origin}/?${search.toString()}`,
  };
}

export function getRevokedPeriodQrTokens(schoolId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(`${REVOKED_TOKENS_KEY_PREFIX}${schoolId || 'default'}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function revokePeriodQrToken(schoolId: string, token: string): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    const set = getRevokedPeriodQrTokens(schoolId);
    set.add(token);
    const trimmed = Array.from(set).slice(-80);
    window.localStorage.setItem(`${REVOKED_TOKENS_KEY_PREFIX}${schoolId || 'default'}`, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota errors
  }
}

export function loadSavedPeriodQrSessions(schoolId: string): ExpiringPeriodQrSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${ACTIVE_SESSIONS_KEY_PREFIX}${schoolId || 'default'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePeriodQrSessions(schoolId: string, sessions: ExpiringPeriodQrSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${ACTIVE_SESSIONS_KEY_PREFIX}${schoolId || 'default'}`,
      JSON.stringify(sessions.slice(0, 12))
    );
  } catch {
    // ignore storage quota errors
  }
}

export function formatCountdownMmSs(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function validatePeriodQrTokenState(params: {
  schoolId?: string;
  token?: string | null;
  code?: string | null;
  expiresAt?: number | null;
}): { valid: boolean; reasonTh?: string; reasonEn?: string } {
  const now = Date.now();
  if (params.expiresAt && Number.isFinite(params.expiresAt) && now > params.expiresAt) {
    const expTime = new Date(params.expiresAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return {
      valid: false,
      reasonTh: `QR Code เช็คชื่อรายคาบนี้หมดอายุแล้ว (หมดอายุเวลา ${expTime} น.) กรุณาให้ผู้ดูแลระบบหรือครูสร้าง QR ใหม่`,
      reasonEn: `This period QR code expired at ${expTime}. Please request a newly generated QR code.`,
    };
  }

  if (params.schoolId && params.token) {
    const revoked = getRevokedPeriodQrTokens(params.schoolId);
    if (revoked.has(params.token) || (params.code && revoked.has(params.code))) {
      return {
        valid: false,
        reasonTh: 'QR Code นี้ถูกยกเลิกการใช้งานโดยผู้ดูแลระบบแล้ว กรุณาสแกนรหัสล่าสุด',
        reasonEn: 'This QR code has been revoked by an administrator. Please scan the latest QR code.',
      };
    }
  }

  return { valid: true };
}
