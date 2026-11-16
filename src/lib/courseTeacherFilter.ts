import { AuthUser, Course, Teacher, TimetableSlot } from '../types';
import { getSlotTeachers, normalizeTeacherName } from './timetableTeachers';

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

/**
 * Strips common Thai academic/salutation prefixes so "อ.ดร.สมชาย ใจดี" matches "สมชาย ใจดี".
 */
export function stripTeacherHonorifics(name: string): string {
  let cleaned = normalizeTeacherName(name || '');
  if (!cleaned) return '';
  const prefixPattern = /^(?:(?:อ\.|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|คุณครู|ครู|นาย|นางสาว|นาง|น\.ส\.|mr\.?|mrs\.?|ms\.?|dr\.?)\s*)+/i;
  cleaned = cleaned.replace(prefixPattern, '').trim();
  return cleaned.replace(/\s+/g, ' ');
}

function namesMatchFlexibly(a: string, b: string): boolean {
  const normA = normalizeTeacherName(a);
  const normB = normalizeTeacherName(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  const strippedA = stripTeacherHonorifics(normA);
  const strippedB = stripTeacherHonorifics(normB);
  return Boolean(strippedA && strippedB && strippedA === strippedB);
}

/**
 * Resolves the Teacher profile record linked to the currently logged-in user.
 */
export function resolveMatchedTeacherForUser(
  currentUser: AuthUser | null | undefined,
  teachers: readonly Teacher[] = []
): Teacher | undefined {
  if (!currentUser || teachers.length === 0) return undefined;

  const byId = teachers.find((t) => t.id === currentUser.id);
  if (byId) return byId;

  if (currentUser.teacherIdNumber) {
    const targetCode = currentUser.teacherIdNumber.trim().toLowerCase();
    const byCode = teachers.find((t) => (t.teacherIdNumber || '').trim().toLowerCase() === targetCode);
    if (byCode) return byCode;
  }

  if (currentUser.email) {
    const targetEmail = currentUser.email.trim().toLowerCase();
    const byEmail = teachers.find((t) => (t.email || '').trim().toLowerCase() === targetEmail);
    if (byEmail) return byEmail;
  }

  const userNames = [currentUser.fullNameTh, currentUser.fullNameEn].filter(Boolean) as string[];
  if (userNames.length > 0) {
    const byName = teachers.find((t) =>
      userNames.some(
        (uName) =>
          namesMatchFlexibly(uName, t.fullNameTh || '') ||
          namesMatchFlexibly(uName, t.fullNameEn || '')
      )
    );
    if (byName) return byName;
  }

  return undefined;
}

/**
 * Finds the CourseTeacherOption key corresponding to the currently logged-in user (or null if none).
 */
export function resolveTeacherFilterKeyForUser(
  currentUser: AuthUser | null | undefined,
  teachers: readonly Teacher[],
  options: readonly CourseTeacherOption[]
): string | null {
  if (!currentUser || options.length === 0) return null;
  const matchedTeacher = resolveMatchedTeacherForUser(currentUser, teachers);

  const candidateEmails = [currentUser.email, matchedTeacher?.email]
    .map((em) => (em || '').trim().toLowerCase())
    .filter(Boolean);

  if (candidateEmails.length > 0) {
    const byEmail = options.find((opt) =>
      opt.emails.some((em) => candidateEmails.includes(em.toLowerCase()))
    );
    if (byEmail) return byEmail.key;
  }

  const candidateNames = [
    matchedTeacher?.fullNameTh,
    matchedTeacher?.fullNameEn,
    currentUser.fullNameTh,
    currentUser.fullNameEn,
  ].filter(Boolean) as string[];

  for (const cand of candidateNames) {
    const normCand = normalizeTeacherName(cand);
    const exact = options.find(
      (opt) => opt.key === normCand || opt.aliases.includes(normCand)
    );
    if (exact) return exact.key;
  }

  for (const cand of candidateNames) {
    const fuzzy = options.find(
      (opt) =>
        namesMatchFlexibly(cand, opt.label) ||
        opt.aliases.some((alias) => namesMatchFlexibly(cand, alias))
    );
    if (fuzzy) return fuzzy.key;
  }

  return null;
}

/**
 * Returns true if the given TimetableSlot is taught by the logged-in teacher user
 * (matching either slot teacher names or linked Course ownership).
 */
export function slotMatchesLoggedInTeacher(
  slot: Pick<TimetableSlot, 'courseId' | 'courseCode' | 'teacherName' | 'coTeacherName'>,
  currentUser: AuthUser | null | undefined,
  matchedTeacher: Teacher | undefined,
  courses: readonly Course[] = []
): boolean {
  if (!currentUser && !matchedTeacher) return false;

  const candidateNames = [
    matchedTeacher?.fullNameTh,
    matchedTeacher?.fullNameEn,
    currentUser?.fullNameTh,
    currentUser?.fullNameEn,
  ].filter(Boolean) as string[];

  const slotTeachers = getSlotTeachers(slot);
  if (
    candidateNames.length > 0 &&
    slotTeachers.some((st) => candidateNames.some((cn) => namesMatchFlexibly(st, cn)))
  ) {
    return true;
  }

  const candidateEmails = [currentUser?.email, matchedTeacher?.email]
    .map((em) => (em || '').trim().toLowerCase())
    .filter(Boolean);

  const linkedCourse = courses.find(
    (c) =>
      (slot.courseId && c.id === slot.courseId) ||
      (slot.courseCode && c.code.trim().toLowerCase() === slot.courseCode.trim().toLowerCase())
  );
  if (!linkedCourse) return false;

  if (matchedTeacher && teacherMatchesCourse(matchedTeacher, linkedCourse)) {
    return true;
  }
  const cEmail = (linkedCourse.teacherEmail || '').trim().toLowerCase();
  if (cEmail && candidateEmails.includes(cEmail)) return true;

  const cNames = extractCourseTeacherNames(linkedCourse);
  return candidateNames.some((cn) => cNames.some((courseTeacher) => namesMatchFlexibly(cn, courseTeacher)));
}
