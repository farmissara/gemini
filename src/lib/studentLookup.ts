import type { Student } from '../types';

const THAI_DIGIT_MAP: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

export function normalizeThaiDigits(value: string): string {
  return String(value || '').replace(/[๐-๙]/g, (digit) => THAI_DIGIT_MAP[digit] ?? digit);
}

export function extractStudentLookupQuery(raw: string): string {
  const normalized = normalizeThaiDigits(raw).trim();
  if (!normalized) return '';

  // Support EDUVERSE:STU:<code_or_id>:... QR payloads
  if (/^EDUVERSE:STU:/i.test(normalized)) {
    return normalized.replace(/^EDUVERSE:STU:/i, '').split(':')[0].trim();
  }

  // Support scanned URLs containing ?studentId=... or ?code=...
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      const paramToken =
        parsed.searchParams.get('studentId') ||
        parsed.searchParams.get('studentCode') ||
        parsed.searchParams.get('code');
      if (paramToken) return normalizeThaiDigits(paramToken).trim();
    } catch {
      // fall back to trimmed string
    }
  }

  return normalized;
}

function compactCode(value: string): string {
  return normalizeThaiDigits(value)
    .toLowerCase()
    .replace(/[\s\-_/.]+/g, '');
}

function stripLeadingZeros(digits: string): string {
  const stripped = digits.replace(/^0+/, '');
  return stripped || '0';
}

function extractNumericParts(value: string): string[] {
  const normalized = normalizeThaiDigits(value);
  const parts = normalized.match(/\d+/g);
  return parts ? parts : [];
}

function getStudentFullNameTh(student: Student): string {
  return `${student.firstNameTh || ''} ${student.lastNameTh || ''}`.replace(/\s+/g, ' ').trim();
}

function getStudentFullNameEn(student: Student): string {
  return `${student.firstNameEn || ''} ${student.lastNameEn || ''}`.replace(/\s+/g, ' ').trim();
}

/**
 * Resolves a single unambiguously matched student from an ID, NFC UID, QR token, or exact full name.
 * Handles Thai numerals (๐-๙), leading zeros (02799 <-> 2799), and code prefixes (ED-2799 <-> 2799).
 */
export function resolveSingleMatchedStudent(
  rawQuery: string,
  students: Student[]
): Student | undefined {
  const query = extractStudentLookupQuery(rawQuery);
  if (!query || students.length === 0) return undefined;

  const lowerQuery = query.toLowerCase();
  const compactQuery = compactCode(query);

  // 1. Exact trimmed case-insensitive match on studentIdNumber, id, or nfcCardUid
  const exactMatches = students.filter((student) => {
    const code = normalizeThaiDigits(student.studentIdNumber || '').trim().toLowerCase();
    const id = normalizeThaiDigits(student.id || '').trim().toLowerCase();
    const nfc = normalizeThaiDigits(student.nfcCardUid || '').trim().toLowerCase();
    return code === lowerQuery || id === lowerQuery || (Boolean(nfc) && nfc === lowerQuery);
  });
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return undefined;

  // 2. Compact alphanumeric match (ignores hyphens, slashes, underscores, spaces)
  if (compactQuery) {
    const compactMatches = students.filter((student) => {
      const code = compactCode(student.studentIdNumber || '');
      const id = compactCode(student.id || '');
      const nfc = compactCode(student.nfcCardUid || '');
      return code === compactQuery || id === compactQuery || (Boolean(nfc) && nfc === compactQuery);
    });
    if (compactMatches.length === 1) return compactMatches[0];
    if (compactMatches.length > 1) return undefined;
  }

  // 3. Pure-digit query matching leading-zero variants or prefix-stripped numeric student codes (e.g. "2799" -> "02799" or "ED-2799")
  if (/^\d+$/.test(compactQuery)) {
    const queryNoLeadingZeros = stripLeadingZeros(compactQuery);
    const numericMatches = students.filter((student) => {
      const code = normalizeThaiDigits(student.studentIdNumber || '').trim();
      const digitsOnly = code.replace(/\D/g, '');
      if (digitsOnly && stripLeadingZeros(digitsOnly) === queryNoLeadingZeros) {
        return true;
      }
      const parts = extractNumericParts(code);
      return parts.some(
        (part) => part === compactQuery || stripLeadingZeros(part) === queryNoLeadingZeros
      );
    });
    if (numericMatches.length === 1) return numericMatches[0];
    if (numericMatches.length > 1) return undefined;
  }

  // 4. Exact Thai or English full name match (when unique)
  const normalizedNameQuery = query.replace(/\s+/g, ' ').toLocaleLowerCase();
  const compactNameQuery = query.replace(/\s+/g, '').toLocaleLowerCase();
  const nameMatches = students.filter((student) => {
    const fullTh = getStudentFullNameTh(student).toLocaleLowerCase();
    const fullEn = getStudentFullNameEn(student).toLocaleLowerCase();
    const compactTh = fullTh.replace(/\s+/g, '');
    const compactEn = fullEn.replace(/\s+/g, '');
    return (
      fullTh === normalizedNameQuery ||
      fullEn === normalizedNameQuery ||
      (compactNameQuery.length >= 2 &&
        (compactTh === compactNameQuery || compactEn === compactNameQuery))
    );
  });
  if (nameMatches.length === 1) return nameMatches[0];

  return undefined;
}

export interface FindMatchingStudentsOptions {
  roomFilter?: string;
  prioritizedStudentIds?: ReadonlySet<string>;
  limit?: number;
}

export function findMatchingStudents(
  rawQuery: string,
  students: Student[],
  options: FindMatchingStudentsOptions = {}
): Student[] {
  const { roomFilter = 'all', prioritizedStudentIds, limit } = options;
  const query = extractStudentLookupQuery(rawQuery);
  const lowerQuery = query.toLocaleLowerCase();
  const compactQuery = compactCode(query);
  const numericQuery = /^\d+$/.test(compactQuery) ? stripLeadingZeros(compactQuery) : '';

  const roomFiltered = students.filter((student) => {
    if (roomFilter === 'all') return true;
    const roomLabel = `${student.gradeLevel} ${student.room}`.trim();
    const slashRoomLabel = `${student.gradeLevel}/${student.room}`.trim();
    return roomLabel === roomFilter || slashRoomLabel === roomFilter || student.room === roomFilter;
  });

  if (!query) {
    const sorted = [...roomFiltered].sort((a, b) => {
      const aPrior = prioritizedStudentIds?.has(a.id) ? 0 : 1;
      const bPrior = prioritizedStudentIds?.has(b.id) ? 0 : 1;
      if (aPrior !== bPrior) return aPrior - bPrior;
      return (a.studentIdNumber || '').localeCompare(b.studentIdNumber || '', 'th', {
        numeric: true,
      });
    });
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }

  const scored: Array<{ student: Student; score: number }> = [];

  for (const student of roomFiltered) {
    const rawCode = normalizeThaiDigits(student.studentIdNumber || '').trim();
    const lowerCode = rawCode.toLowerCase();
    const compactStudentCode = compactCode(rawCode);
    const digitsOnly = rawCode.replace(/\D/g, '');
    const rawId = normalizeThaiDigits(student.id || '').trim().toLowerCase();
    const nfc = normalizeThaiDigits(student.nfcCardUid || '').trim().toLowerCase();
    const fullTh = getStudentFullNameTh(student).toLocaleLowerCase();
    const fullEn = getStudentFullNameEn(student).toLocaleLowerCase();
    const roomText = `${student.gradeLevel || ''} ${student.room || ''} ${student.gradeLevel || ''}/${student.room || ''}`.toLocaleLowerCase();

    let score = 0;

    if (lowerCode === lowerQuery || (compactQuery && compactStudentCode === compactQuery)) {
      score = 100;
    } else if (
      numericQuery &&
      ((digitsOnly && stripLeadingZeros(digitsOnly) === numericQuery) ||
        extractNumericParts(rawCode).some(
          (part) => part === compactQuery || stripLeadingZeros(part) === numericQuery
        ))
    ) {
      score = 95;
    } else if (rawId === lowerQuery || (nfc && nfc === lowerQuery)) {
      score = 92;
    } else if (fullTh === lowerQuery || fullEn === lowerQuery) {
      score = 90;
    } else if (
      lowerCode.startsWith(lowerQuery) ||
      (compactQuery && compactStudentCode.startsWith(compactQuery)) ||
      (numericQuery && digitsOnly.endsWith(numericQuery))
    ) {
      score = 85;
    } else if (
      lowerCode.includes(lowerQuery) ||
      (compactQuery && compactStudentCode.includes(compactQuery)) ||
      (numericQuery && digitsOnly.includes(numericQuery))
    ) {
      score = 78;
    } else if (
      fullTh.startsWith(lowerQuery) ||
      fullEn.startsWith(lowerQuery)
    ) {
      score = 74;
    } else if (
      fullTh.includes(lowerQuery) ||
      fullEn.includes(lowerQuery)
    ) {
      score = 65;
    } else if (rawId.includes(lowerQuery) || (nfc && nfc.includes(lowerQuery))) {
      score = 55;
    } else if (roomText.includes(lowerQuery)) {
      score = 40;
    }

    if (score > 0) {
      scored.push({ student, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aPrior = prioritizedStudentIds?.has(a.student.id) ? 0 : 1;
    const bPrior = prioritizedStudentIds?.has(b.student.id) ? 0 : 1;
    if (aPrior !== bPrior) return aPrior - bPrior;
    return (a.student.studentIdNumber || '').localeCompare(b.student.studentIdNumber || '', 'th', {
      numeric: true,
    });
  });

  const matched = scored.map((entry) => entry.student);
  return typeof limit === 'number' ? matched.slice(0, limit) : matched;
}
