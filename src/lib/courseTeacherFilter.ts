import { Course, Teacher } from '../types';
import { normalizeTeacherName } from './timetableTeachers';

export interface CourseTeacherOption {
  key: string;
  label: string;
  emails: string[];
  aliases: string[];
  count: number;
}

/**
 * Splits a course's `teacherName` string into individual trimmed teacher names.
 * Supports `+`, `,`, and `/` delimiters for co-teaching entries.
 */
export function extractCourseTeacherNames(course: Pick<Course, 'teacherName'>): string[] {
  const raw = (course.teacherName || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/\s*(?:\+|,|\/)\s*/)
    .map((part) => part.normalize('NFC').trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = normalizeTeacherName(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }
  return unique;
}

/**
 * Checks whether a specific `Teacher` record teaches/matches the given `Course`.
 */
export function teacherMatchesCourse(
  teacher: Pick<Teacher, 'fullNameTh' | 'fullNameEn' | 'email'>,
  course: Pick<Course, 'teacherName' | 'teacherEmail'>
): boolean {
  const tEmail = (teacher.email || '').trim().toLowerCase();
  const cEmail = (course.teacherEmail || '').trim().toLowerCase();
  if (tEmail && cEmail && tEmail === cEmail) return true;

  const tAliases = [teacher.fullNameTh, teacher.fullNameEn]
    .map((n) => normalizeTeacherName(n || ''))
    .filter(Boolean);
  if (tAliases.length === 0) return false;

  const cNames = extractCourseTeacherNames(course).map((n) => normalizeTeacherName(n));
  if (cNames.some((cn) => tAliases.includes(cn))) return true;

  const rawFullNorm = normalizeTeacherName(course.teacherName || '');
  return Boolean(rawFullNorm && tAliases.includes(rawFullNorm));
}

/**
 * Builds sorted, deduplicated teacher options derived from `courses` and enriched
 * with canonical names/emails from `teachers`.
 */
export function buildCourseTeacherOptions(
  courses: readonly Course[],
  teachers: readonly Teacher[] = []
): CourseTeacherOption[] {
  const teacherByEmail = new Map<string, Teacher>();
  const teacherByNameKey = new Map<string, Teacher>();

  teachers.forEach((t) => {
    const email = (t.email || '').trim().toLowerCase();
    if (email) teacherByEmail.set(email, t);
    const thKey = normalizeTeacherName(t.fullNameTh || '');
    if (thKey) teacherByNameKey.set(thKey, t);
    const enKey = normalizeTeacherName(t.fullNameEn || '');
    if (enKey) teacherByNameKey.set(enKey, t);
  });

  const optionMap = new Map<string, CourseTeacherOption>();

  const ensureOption = (
    key: string,
    label: string,
    aliases: string[],
    emails: string[]
  ): CourseTeacherOption => {
    const existing = optionMap.get(key);
    if (existing) {
      aliases.forEach((a) => {
        if (a && !existing.aliases.includes(a)) existing.aliases.push(a);
      });
      emails.forEach((em) => {
        if (em && !existing.emails.includes(em)) existing.emails.push(em);
      });
      return existing;
    }
    const created: CourseTeacherOption = {
      key,
      label,
      aliases: Array.from(new Set(aliases.filter(Boolean))),
      emails: Array.from(new Set(emails.filter(Boolean))),
      count: 0,
    };
    optionMap.set(key, created);
    return created;
  };

  courses.forEach((course) => {
    const matchedKeysThisCourse = new Set<string>();
    const courseEmail = (course.teacherEmail || '').trim().toLowerCase();
    const courseNames = extractCourseTeacherNames(course);

    const registerMatchedTeacher = (t: Teacher) => {
      const label = (t.fullNameTh || t.fullNameEn || t.email).normalize('NFC').trim().replace(/\s+/g, ' ');
      const key = normalizeTeacherName(label) || `email:${(t.email || '').trim().toLowerCase()}`;
      const aliases = [
        normalizeTeacherName(t.fullNameTh || ''),
        normalizeTeacherName(t.fullNameEn || ''),
        ...courseNames.map((n) => normalizeTeacherName(n)),
      ].filter(Boolean);
      const emails = [(t.email || '').trim().toLowerCase(), courseEmail].filter(Boolean);
      const opt = ensureOption(key, label, aliases, emails);
      if (!matchedKeysThisCourse.has(key)) {
        opt.count += 1;
        matchedKeysThisCourse.add(key);
      }
    };

    if (courseEmail && teacherByEmail.has(courseEmail)) {
      registerMatchedTeacher(teacherByEmail.get(courseEmail)!);
    }

    courseNames.forEach((part) => {
      const partKey = normalizeTeacherName(part);
      if (!partKey) return;
      const matchedTeacher = teacherByNameKey.get(partKey);
      if (matchedTeacher) {
        registerMatchedTeacher(matchedTeacher);
        return;
      }
      const emails = courseEmail ? [courseEmail] : [];
      const opt = ensureOption(partKey, part, [partKey], emails);
      if (!matchedKeysThisCourse.has(partKey)) {
        opt.count += 1;
        matchedKeysThisCourse.add(partKey);
      }
    });

    if (courseNames.length === 0 && courseEmail && !teacherByEmail.has(courseEmail)) {
      const key = `email:${courseEmail}`;
      const opt = ensureOption(key, courseEmail, [], [courseEmail]);
      if (!matchedKeysThisCourse.has(key)) {
        opt.count += 1;
        matchedKeysThisCourse.add(key);
      }
    }
  });

  return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'th'));
}

/**
 * Returns true if `selectedTeacherKey` is `'all'` / empty, or if `course` is taught by that teacher.
 */
export function courseMatchesTeacherFilter(
  course: Pick<Course, 'teacherName' | 'teacherEmail'>,
  selectedTeacherKey: string,
  options: readonly CourseTeacherOption[] = []
): boolean {
  if (!selectedTeacherKey || selectedTeacherKey === 'all') return true;

  const option = options.find((opt) => opt.key === selectedTeacherKey);
  const courseEmail = (course.teacherEmail || '').trim().toLowerCase();
  const courseNameKeys = extractCourseTeacherNames(course).map((n) => normalizeTeacherName(n));

  if (option) {
    if (courseEmail && option.emails.includes(courseEmail)) return true;
    if (courseNameKeys.some((ck) => option.aliases.includes(ck))) return true;
    return false;
  }

  const targetKey = normalizeTeacherName(selectedTeacherKey);
  if (!targetKey) return true;
  if (courseEmail && `email:${courseEmail}` === selectedTeacherKey) return true;
  return courseNameKeys.includes(targetKey);
}
