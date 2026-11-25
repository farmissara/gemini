function replaceFullThaiGradeNames(value: string): string {
  return value
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?ประถมศึกษาปีที่\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'ป.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?ประถมปีที่\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'ป.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?ประถมศึกษา\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'ป.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?มัธยมศึกษาปีที่\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'ม.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?มัธยมปีที่\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'ม.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?มัธยมศึกษา\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'ม.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?อนุบาลปีที่\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'อ.$1')
    .replace(/(?:ระดับชั้น\s*)?(?:ชั้น\s*)?อนุบาล\s*(\d{1,2})(?:\s*\([^)]*\))?/gi, 'อ.$1');
}

export function extractShortThaiGradePrefix(gradeLevel?: string | null): string {
  const raw = (gradeLevel || '').normalize('NFC').trim();
  if (!raw) return '';
  const replaced = replaceFullThaiGradeNames(raw);
  const thaiMatch = replaced.match(/(?:^|\s)([อปม])\s*\.?\s*(\d{1,2})(?=$|\s|\/|\(|-)/);
  if (thaiMatch) {
    return `${thaiMatch[1]}.${thaiMatch[2]}`;
  }
  const enMatch = replaced.match(/(?:^|\s)\(?([kpmg])\s*\.?\s*(\d{1,2})\)?(?=$|\s|\/|\(|-)/i);
  if (enMatch) {
    const map: Record<string, string> = { k: 'อ', p: 'ป', m: 'ม' };
    const thaiPrefix = map[enMatch[1].toLowerCase()];
    if (thaiPrefix) return `${thaiPrefix}.${enMatch[2]}`;
  }
  return '';
}

export function normalizeTimetableRoomKey(value?: string | null): string {
  const raw = (value || '')
    .normalize('NFC')
    .trim()
    .replace(/^(?:ห้องเรียน|ห้อง|room|class)\s*/i, '');
  if (!raw) return '';

  const withShortGrades = replaceFullThaiGradeNames(raw)
    .replace(/(^|\s)([อปม])\s*\.?\s*(\d{1,2})(?=$|\s|\/|\(|-)/g, '$1$2.$3')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

  return withShortGrades.toLocaleLowerCase();
}

export function isSameTimetableRoom(roomA?: string | null, roomB?: string | null): boolean {
  const keyA = normalizeTimetableRoomKey(roomA);
  const keyB = normalizeTimetableRoomKey(roomB);
  return Boolean(keyA && keyB && keyA === keyB);
}

export function dedupeTimetableRooms(groups: ReadonlyArray<ReadonlyArray<string | null | undefined>>): string[] {
  const seen = new Map<string, string>();
  for (const group of groups) {
    for (const rawRoom of group) {
      const label = (rawRoom || '').normalize('NFC').trim();
      if (!label) continue;
      const key = normalizeTimetableRoomKey(label);
      if (!key || seen.has(key)) continue;
      seen.set(key, label);
    }
  }
  return [...seen.values()];
}

export function findHomeroomTeachersForRoom<T extends { homeroomClasses?: string[] }>(
  teachers: ReadonlyArray<T>,
  classRoom?: string | null,
): T[] {
  const targetKey = normalizeTimetableRoomKey(classRoom);
  if (!targetKey) return [];
  return teachers.filter((teacher) =>
    (teacher.homeroomClasses || []).some((room) => normalizeTimetableRoomKey(room) === targetKey)
  );
}
