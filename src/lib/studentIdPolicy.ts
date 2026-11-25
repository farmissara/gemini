import type { AppLanguage, School } from '../types';

export const DEFAULT_STUDENT_ID_MIN_LENGTH = 4;
export const DEFAULT_STUDENT_ID_MAX_LENGTH = 12;
export const DEFAULT_STUDENT_ID_EXAMPLE = '1001';

export interface SchoolStudentIdPolicy {
  minLength: number;
  maxLength: number;
  digitsOnly: boolean;
  example: string;
  shortIdPasswordPrefix: string;
  defaultPasswordType: NonNullable<School['studentDefaultPasswordType']>;
}

export function normalizeSchoolStudentIdPolicy(
  school?: Pick<
    School,
    | 'studentIdMinLength'
    | 'studentIdMaxLength'
    | 'studentIdDigitsOnly'
    | 'studentIdExample'
    | 'studentShortIdPasswordPrefix'
    | 'studentDefaultPasswordType'
  > | null
): SchoolStudentIdPolicy {
  const rawMin = Number(school?.studentIdMinLength);
  const minLength = Number.isFinite(rawMin)
    ? Math.max(1, Math.min(20, Math.round(rawMin)))
    : DEFAULT_STUDENT_ID_MIN_LENGTH;

  const rawMax = Number(school?.studentIdMaxLength);
  const maxLength = Number.isFinite(rawMax)
    ? Math.max(minLength, Math.min(30, Math.round(rawMax)))
    : Math.max(minLength, DEFAULT_STUDENT_ID_MAX_LENGTH);

  const digitsOnly = Boolean(school?.studentIdDigitsOnly);

  const rawExample = (school?.studentIdExample || '').trim();
  let fallbackExample = '1001';
  if (minLength > 4) {
    fallbackExample = `1${'0'.repeat(Math.max(0, minLength - 2))}1`;
  } else if (minLength < 4) {
    fallbackExample = '1001'.slice(0, minLength);
  }
  if (fallbackExample.length > maxLength) {
    fallbackExample = fallbackExample.slice(0, maxLength);
  }
  const example = rawExample || fallbackExample;
  const shortIdPasswordPrefix = (school?.studentShortIdPasswordPrefix || '').trim().slice(0, 12);
  const defaultPasswordType = school?.studentDefaultPasswordType || 'student_id';

  return {
    minLength,
    maxLength,
    digitsOnly,
    example,
    shortIdPasswordPrefix,
    defaultPasswordType,
  };
}

export function validateStudentIdAgainstPolicy(
  studentIdNumber: string,
  policy: SchoolStudentIdPolicy
): { valid: boolean; reasonTh?: string; reasonEn?: string } {
  const trimmed = (studentIdNumber || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      reasonTh: 'กรุณากรอกรหัสนักเรียน',
      reasonEn: 'Student ID is required.',
    };
  }
  if (trimmed.length < policy.minLength || trimmed.length > policy.maxLength) {
    return {
      valid: false,
      reasonTh: `รหัสนักเรียนต้องมีความยาว ${policy.minLength}–${policy.maxLength} ตัวอักษร (ที่กรอกยาว ${trimmed.length} ตัว)`,
      reasonEn: `Student ID must be ${policy.minLength}–${policy.maxLength} characters (got ${trimmed.length}).`,
    };
  }
  if (policy.digitsOnly && !/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      reasonTh: 'โรงเรียนนี้กำหนดให้รหัสนักเรียนเป็นตัวเลขเท่านั้น (0–9)',
      reasonEn: 'This school requires digits-only (0–9) Student IDs.',
    };
  }
  return { valid: true };
}

export function formatThaiBirthdatePassword(dateOfBirth?: string | null): string {
  const raw = (dateOfBirth || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const yearNum = Number(match[1]);
  const month = match[2];
  const day = match[3];
  if (!Number.isFinite(yearNum) || yearNum < 1900) return '';
  const beYear = yearNum < 2400 ? yearNum + 543 : yearNum;
  return `${day}${month}${beYear}`;
}

export function buildInitialStudentPassword(params: {
  studentIdNumber: string;
  shortIdPasswordPrefix?: string | null;
  defaultPasswordType?: string | null;
  dateOfBirth?: string | null;
}): string {
  const rawId = (params.studentIdNumber || '').trim();
  if (!rawId) return '';

  if (params.defaultPasswordType === 'birthdate') {
    const dobPassword = formatThaiBirthdatePassword(params.dateOfBirth);
    if (dobPassword.length >= 6) return dobPassword;
  }

  const prefix = (params.shortIdPasswordPrefix || '').trim();
  if (rawId.length < 6 && prefix) {
    return `${prefix}${rawId}`;
  }

  return rawId;
}

export function formatStudentIdPolicySummary(
  policy: SchoolStudentIdPolicy,
  lang: AppLanguage = 'th'
): string {
  if (lang === 'en') {
    const charset = policy.digitsOnly ? 'digits only (0–9)' : 'letters/digits';
    const range =
      policy.minLength === policy.maxLength
        ? `exactly ${policy.minLength} chars`
        : `${policy.minLength}–${policy.maxLength} chars`;
    return `${range} · ${charset} (e.g. ${policy.example})`;
  }
  const charset = policy.digitsOnly ? 'ตัวเลขล้วน (0–9)' : 'ตัวอักษรหรือตัวเลข';
  const range =
    policy.minLength === policy.maxLength
      ? `ตรงตาม ${policy.minLength} ตัว`
      : `${policy.minLength}–${policy.maxLength} ตัว`;
  return `ความยาว ${range} · ${charset} (เช่น ${policy.example})`;
}
