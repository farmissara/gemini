import type { Student, Teacher } from '../types';

export interface WebNdefRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: DataView;
  encoding?: string;
  lang?: string;
}

export interface WebNdefMessage {
  records: ReadonlyArray<WebNdefRecord>;
}

export interface WebNdefReadingEvent extends Event {
  serialNumber: string;
  message: WebNdefMessage;
}

export interface WebNdefScanOptions {
  signal?: AbortSignal;
}

export interface WebNdefReader {
  scan: (options?: WebNdefScanOptions) => Promise<void>;
  write?: (message: string | { records: Array<{ recordType: string; data?: string }> }, options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: WebNdefReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  addEventListener: (
    type: 'reading' | 'readingerror',
    listener: ((event: Event) => void) | ((event: WebNdefReadingEvent) => void)
  ) => void;
  removeEventListener: (
    type: 'reading' | 'readingerror',
    listener: ((event: Event) => void) | ((event: WebNdefReadingEvent) => void)
  ) => void;
}

export type WebNdefReaderConstructor = new () => WebNdefReader;

export interface NfcCardBinding {
  uid: string;
  normalizedUid: string;
  targetType: 'student' | 'teacher';
  targetId: string;
  displayId: string;
  label: string;
  boundAt: string;
}

export interface ParsedNfcTag {
  serialNumber: string;
  normalizedUid: string;
  payloadText: string;
  extractedId?: string;
}

export type NfcMatchResult =
  | {
      matched: true;
      userType: 'student';
      student: Student;
      uid: string;
      normalizedUid: string;
      matchSource: 'binding' | 'card_field' | 'id_number' | 'payload';
    }
  | {
      matched: true;
      userType: 'teacher';
      teacher: Teacher;
      uid: string;
      normalizedUid: string;
      matchSource: 'binding' | 'card_field' | 'id_number' | 'payload';
    }
  | {
      matched: false;
      uid: string;
      normalizedUid: string;
      payloadText: string;
    };

const STORAGE_PREFIX = 'eduverse_nfc_bindings_';

export function getNdefReaderConstructor(): WebNdefReaderConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { NDEFReader?: WebNdefReaderConstructor }).NDEFReader;
  return typeof candidate === 'function' ? candidate : null;
}

export function isWebNfcSupported(): boolean {
  return getNdefReaderConstructor() !== null;
}

export function isSecureNfcContext(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.isSecureContext);
}

export function normalizeNfcUid(raw: string): string {
  return raw.trim().replace(/[:\-\s]/g, '').toUpperCase();
}

export function formatNfcUidDisplay(raw: string): string {
  const clean = normalizeNfcUid(raw);
  if (/^[0-9A-F]{8,20}$/.test(clean) && clean.length % 2 === 0) {
    return clean.match(/.{1,2}/g)?.join(':') || raw.trim().toUpperCase();
  }
  return raw.trim().toUpperCase();
}

function extractIdFromPayloadText(payloadText: string): string | undefined {
  const trimmed = payloadText.trim();
  if (!trimmed) return undefined;

  // JSON payload: {"studentId":"ED-6901"} or {"id":"..."}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const candidate =
        parsed.studentIdNumber ||
        parsed.teacherIdNumber ||
        parsed.studentId ||
        parsed.teacherId ||
        parsed.cardUid ||
        parsed.uid ||
        parsed.id;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // URL payload: https://.../checkin?studentId=ED-6901
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('?')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://eduverse.school/${trimmed.replace(/^\/+/, '')}`);
      const q =
        url.searchParams.get('studentId') ||
        url.searchParams.get('teacherId') ||
        url.searchParams.get('id') ||
        url.searchParams.get('uid');
      if (q && q.trim()) return q.trim();
    } catch {
      // ignore invalid URL
    }
  }

  return trimmed;
}

export function parseNfcReadingEvent(event: WebNdefReadingEvent): ParsedNfcTag {
  const serialNumber = (event.serialNumber || '').trim();
  let payloadText = '';
  const records = event.message?.records || [];

  for (const record of records) {
    if (!record.data) continue;
    try {
      const decoder = new TextDecoder(record.encoding || 'utf-8');
      const bytes = new Uint8Array(
        record.data.buffer,
        record.data.byteOffset,
        record.data.byteLength
      );
      const decoded = decoder.decode(bytes).replace(/\0/g, '').trim();
      if (decoded) {
        payloadText = payloadText ? `${payloadText} ${decoded}` : decoded;
      }
    } catch {
      // ignore unreadable NDEF record
    }
  }

  const effectiveUid = serialNumber || extractIdFromPayloadText(payloadText) || `NFC-${Date.now()}`;
  return {
    serialNumber: serialNumber || effectiveUid,
    normalizedUid: normalizeNfcUid(effectiveUid),
    payloadText,
    extractedId: extractIdFromPayloadText(payloadText),
  };
}

export function loadNfcBindings(schoolId: string): NfcCardBinding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${schoolId || 'default'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NfcCardBinding[]) : [];
  } catch {
    return [];
  }
}

export function saveNfcBinding(
  schoolId: string,
  binding: Omit<NfcCardBinding, 'normalizedUid' | 'boundAt'>
): NfcCardBinding[] {
  const normalizedUid = normalizeNfcUid(binding.uid);
  const nextItem: NfcCardBinding = {
    ...binding,
    uid: formatNfcUidDisplay(binding.uid),
    normalizedUid,
    boundAt: new Date().toISOString(),
  };
  const current = loadNfcBindings(schoolId).filter(
    (b) =>
      b.normalizedUid !== normalizedUid &&
      !(b.targetType === binding.targetType && b.targetId === binding.targetId)
  );
  const updated = [nextItem, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${schoolId || 'default'}`, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
  }
  return updated;
}

export function removeNfcBinding(schoolId: string, uid: string): NfcCardBinding[] {
  const targetNorm = normalizeNfcUid(uid);
  const updated = loadNfcBindings(schoolId).filter((b) => b.normalizedUid !== targetNorm);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${schoolId || 'default'}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}

export function resolveNfcTap(params: {
  schoolId: string;
  rawInput: string;
  payloadText?: string;
  students: Student[];
  teachers: Teacher[];
}): NfcMatchResult {
  const { schoolId, rawInput, payloadText = '', students, teachers } = params;
  const trimmedInput = rawInput.trim();
  const normalizedUid = normalizeNfcUid(trimmedInput);
  const displayUid = formatNfcUidDisplay(trimmedInput || payloadText || 'UNKNOWN');
  const extracted = extractIdFromPayloadText(payloadText || trimmedInput);
  const normalizedExtracted = extracted ? normalizeNfcUid(extracted) : '';

  const bindings = loadNfcBindings(schoolId);
  const bound = bindings.find(
    (b) =>
      (normalizedUid && b.normalizedUid === normalizedUid) ||
      (normalizedExtracted && b.normalizedUid === normalizedExtracted)
  );

  if (bound) {
    if (bound.targetType === 'student') {
      const stu = students.find((s) => s.id === bound.targetId);
      if (stu) {
        return {
          matched: true,
          userType: 'student',
          student: stu,
          uid: bound.uid,
          normalizedUid: bound.normalizedUid,
          matchSource: 'binding',
        };
      }
    } else {
      const tch = teachers.find((t) => t.id === bound.targetId);
      if (tch) {
        return {
          matched: true,
          userType: 'teacher',
          teacher: tch,
          uid: bound.uid,
          normalizedUid: bound.normalizedUid,
          matchSource: 'binding',
        };
      }
    }
  }

  // Match student card UID field or ID number or nationalId
  const candidates = [trimmedInput, extracted || ''].filter(Boolean);
  const candidateNorms = candidates.map((c) => normalizeNfcUid(c)).filter(Boolean);

  for (const stu of students) {
    if (stu.nfcCardUid && candidateNorms.includes(normalizeNfcUid(stu.nfcCardUid))) {
      return {
        matched: true,
        userType: 'student',
        student: stu,
        uid: displayUid,
        normalizedUid,
        matchSource: 'card_field',
      };
    }
  }

  for (const tch of teachers) {
    if (tch.nfcCardUid && candidateNorms.includes(normalizeNfcUid(tch.nfcCardUid))) {
      return {
        matched: true,
        userType: 'teacher',
        teacher: tch,
        uid: displayUid,
        normalizedUid,
        matchSource: 'card_field',
      };
    }
  }

  for (const stu of students) {
    const stuNorms = [stu.studentIdNumber, stu.id, stu.nationalId || '']
      .map((v) => normalizeNfcUid(v))
      .filter(Boolean);
    if (candidateNorms.some((cn) => stuNorms.includes(cn))) {
      return {
        matched: true,
        userType: 'student',
        student: stu,
        uid: displayUid,
        normalizedUid,
        matchSource: extracted && extracted !== trimmedInput ? 'payload' : 'id_number',
      };
    }
  }

  for (const tch of teachers) {
    const tchNorms = [tch.teacherIdNumber, tch.id]
      .map((v) => normalizeNfcUid(v))
      .filter(Boolean);
    if (candidateNorms.some((cn) => tchNorms.includes(cn))) {
      return {
        matched: true,
        userType: 'teacher',
        teacher: tch,
        uid: displayUid,
        normalizedUid,
        matchSource: extracted && extracted !== trimmedInput ? 'payload' : 'id_number',
      };
    }
  }

  return {
    matched: false,
    uid: displayUid,
    normalizedUid,
    payloadText: payloadText || trimmedInput,
  };
}
