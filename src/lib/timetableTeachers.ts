import { TimetableSlot } from '../types';

export function normalizeTeacherName(name: string): string {
  return name
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

/**
 * Decodes serialized teacher strings (e.g. "อ.สมชาย + อ.สมหญิง") into primary & co-teacher.
 */
export function parseSlotTeachersFromRaw(
  rawTeacherName: string,
  explicitCoTeacherName?: string
): { teacherName: string; coTeacherName?: string } {
  const cleanExplicitCo = (explicitCoTeacherName || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  const parts = (rawTeacherName || '')
    .split(/\s*\+\s*/)
    .map((part) => part.normalize('NFC').trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const primary = parts[0] || '';
  const fromRawCo = parts.slice(1).join(' + ').trim();
  const resolvedCo = cleanExplicitCo || fromRawCo;

  if (!resolvedCo || normalizeTeacherName(resolvedCo) === normalizeTeacherName(primary)) {
    return { teacherName: primary };
  }

  return {
    teacherName: primary,
    coTeacherName: resolvedCo,
  };
}

/**
 * Serializes primary & co-teacher into a single Supabase-compatible `teacher_name` string
 * so co-teaching persists seamlessly without requiring remote DDL changes.
 */
export function serializeSlotTeacherForDb(teacherName: string, coTeacherName?: string): string {
  const cleanPrimary = (teacherName || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  const cleanCo = (coTeacherName || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!cleanCo || normalizeTeacherName(cleanCo) === normalizeTeacherName(cleanPrimary)) {
    return cleanPrimary;
  }
  if (!cleanPrimary) return cleanCo;
  return `${cleanPrimary} + ${cleanCo}`;
}

/**
 * Returns deduplicated list of all teachers assigned to a timetable slot (primary + co-teacher).
 */
export function getSlotTeachers(
  slot: Pick<TimetableSlot, 'teacherName' | 'coTeacherName'>
): string[] {
  const rawParts = [
    ...(slot.teacherName || '').split(/\s*\+\s*/),
    ...(slot.coTeacherName || '').split(/\s*\+\s*/),
  ];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of rawParts) {
    const clean = part.normalize('NFC').trim().replace(/\s+/g, ' ');
    const key = normalizeTeacherName(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function slotHasTeacher(
  slot: Pick<TimetableSlot, 'teacherName' | 'coTeacherName'>,
  targetTeacherName: string
): boolean {
  const targetKey = normalizeTeacherName(targetTeacherName);
  if (!targetKey) return false;
  return getSlotTeachers(slot).some((name) => normalizeTeacherName(name) === targetKey);
}

export function formatSlotTeachersDisplay(
  slot: Pick<TimetableSlot, 'teacherName' | 'coTeacherName'>
): string {
  const teachers = getSlotTeachers(slot);
  if (teachers.length === 0) return 'ไม่ระบุครู';
  return teachers.join(' + ');
}
