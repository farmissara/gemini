import type {
  AttendanceRecord,
  Course,
  GradeRecord,
  LearningIndicatorScore,
  LearningIndicatorSet,
  Student,
  StudentStatus,
  TimetableSlot,
} from '../types';
import { getNextGradeLevel, getNextRoom } from '../data/studentAcademicData';
import {
  copyIndicatorSetsToNewCourse,
  readLocalIndicatorScores,
  readLocalIndicatorSets,
} from './learningIndicatorStore';
import { loadQualitativeAssessments, StudentQualitativeAssessment } from './moeQualitativeStore';
import { loadSchoolRegistryMap, StudentRegistryRecord } from './studentRegistryStore';
import { getSupabaseClient } from './supabase';

export interface ArchivedStudentSnapshot {
  id: string;
  studentIdNumber: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn: string;
  lastNameEn: string;
  gradeLevel: string;
  room: string;
  status: StudentStatus;
  gpa: number;
}

export interface AcademicTermArchiveSummary {
  studentCount: number;
  activeStudentCount: number;
  courseCount: number;
  gradeCount: number;
  avgGpa: number;
  attendanceRatePct: number;
}

export interface AcademicTermArchive {
  id: string;
  schoolId: string;
  academicYear: string;
  semester: string;
  archivedAt: string;
  archivedBy: string;
  note?: string;
  summary: AcademicTermArchiveSummary;
  studentsSnapshot: ArchivedStudentSnapshot[];
  coursesSnapshot: Course[];
  gradesSnapshot: GradeRecord[];
  timetableSnapshot: TimetableSlot[];
  registrySnapshot: Record<string, StudentRegistryRecord>;
  qualitativeSnapshot: Record<string, StudentQualitativeAssessment>;
  indicatorSetsSnapshot: LearningIndicatorSet[];
  indicatorScoresSnapshot: Record<string, LearningIndicatorScore[]>;
}

export interface AcademicAutoPrefs {
  autoRemindNewAcademicYear: boolean;
  autoArchiveBeforeRollover: boolean;
  lastDismissedSuggestedYear?: string;
}

export interface AcademicRolloverOptions {
  fromYear: string;
  fromSemester: string;
  toYear: string;
  toSemester: string;
  archiveCurrentFirst: boolean;
  archiveNote?: string;
  copyCourses: boolean;
  copyCourseEnrollments: boolean;
  copyIndicators: boolean;
  copyTimetable: boolean;
  promoteStudents: boolean;
}

const ARCHIVE_LOCAL_PREFIX = 'baanpakkru_academic_archives_v1_';
const AUTO_PREFS_PREFIX = 'baanpakkru_academic_autoprefs_v1_';

function archiveKey(schoolId: string): string {
  return `${ARCHIVE_LOCAL_PREFIX}${schoolId || 'default'}`;
}

function autoPrefsKey(schoolId: string): string {
  return `${AUTO_PREFS_PREFIX}${schoolId || 'default'}`;
}

function isMissingArchiveTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const val = error as { code?: string; message?: string };
  return (
    val.code === '42P01' ||
    val.code === 'PGRST205' ||
    /academic_term_archives|does not exist|schema cache/i.test(val.message || '')
  );
}

export function getRecommendedCurrentBuddhistYear(): string {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  // Thai school academic year starts around May (month index 4). Before May, school year is previous BE year.
  return String(now.getMonth() < 4 ? thaiYear - 1 : thaiYear);
}

export function suggestNextAcademicPeriod(
  currentYear: string,
  currentSemester: string,
  semesterOptions: string[]
): {
  nextTerm: { academicYear: string; semester: string; isNewYear: boolean; label: string };
  nextYear: { academicYear: string; semester: string; isNewYear: true; label: string };
} {
  const normalizedOptions =
    semesterOptions.length > 0 ? semesterOptions.map((s) => s.trim()).filter(Boolean) : ['1', '2', 'Summer'];
  const parsedYear = Number(currentYear);
  const nextNumericYear = Number.isFinite(parsedYear) && parsedYear > 2400 ? String(parsedYear + 1) : String(new Date().getFullYear() + 544);
  const firstSemester = normalizedOptions[0] || '1';

  const currentIdx = normalizedOptions.findIndex((s) => s.toLowerCase() === currentSemester.trim().toLowerCase());
  const hasNextInSameYear = currentIdx >= 0 && currentIdx < normalizedOptions.length - 1;
  const nextSemesterInYear = hasNextInSameYear ? normalizedOptions[currentIdx + 1] : firstSemester;

  const nextTerm = hasNextInSameYear
    ? {
        academicYear: currentYear,
        semester: nextSemesterInYear,
        isNewYear: false,
        label: `ภาคเรียนที่ ${nextSemesterInYear} / ปีการศึกษา ${currentYear}`,
      }
    : {
        academicYear: nextNumericYear,
        semester: firstSemester,
        isNewYear: true,
        label: `ปีการศึกษาใหม่ ${nextNumericYear} · ภาคเรียนที่ ${firstSemester}`,
      };

  const nextYear = {
    academicYear: nextNumericYear,
    semester: firstSemester,
    isNewYear: true as const,
    label: `ปีการศึกษาใหม่ ${nextNumericYear} · ภาคเรียนที่ ${firstSemester}`,
  };

  return { nextTerm, nextYear };
}

export function loadAcademicAutoPrefs(schoolId: string): AcademicAutoPrefs {
  const defaults: AcademicAutoPrefs = {
    autoRemindNewAcademicYear: true,
    autoArchiveBeforeRollover: true,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(autoPrefsKey(schoolId));
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<AcademicAutoPrefs>) };
  } catch {
    return defaults;
  }
}

export function saveAcademicAutoPrefs(schoolId: string, prefs: AcademicAutoPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(autoPrefsKey(schoolId), JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function loadAcademicArchives(schoolId: string): AcademicTermArchive[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(archiveKey(schoolId));
    const list = raw ? (JSON.parse(raw) as AcademicTermArchive[]) : [];
    return Array.isArray(list)
      ? [...list].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))
      : [];
  } catch {
    return [];
  }
}

export function saveAcademicArchives(schoolId: string, archives: AcademicTermArchive[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(archiveKey(schoolId), JSON.stringify(archives));
  } catch {
    // ignore quota errors
  }
}

export async function persistAcademicArchive(archive: AcademicTermArchive): Promise<{ syncedToSupabase: boolean }> {
  const current = loadAcademicArchives(archive.schoolId);
  const next = [archive, ...current.filter((item) => item.id !== archive.id)];
  saveAcademicArchives(archive.schoolId, next);

  const client = getSupabaseClient();
  if (!client || !archive.schoolId) return { syncedToSupabase: false };

  try {
    const { error } = await client.from('academic_term_archives').upsert({
      id: archive.id,
      school_id: archive.schoolId,
      academic_year: archive.academicYear,
      semester: archive.semester,
      archived_at: archive.archivedAt,
      archived_by: archive.archivedBy,
      note: archive.note || null,
      archive_payload: archive,
    });
    if (error) {
      if (!isMissingArchiveTableError(error)) {
        console.warn('[AcademicArchive] Supabase upsert warning:', error.message);
      }
      return { syncedToSupabase: false };
    }
    return { syncedToSupabase: true };
  } catch {
    return { syncedToSupabase: false };
  }
}

export async function deleteAcademicArchive(schoolId: string, archiveId: string): Promise<AcademicTermArchive[]> {
  const next = loadAcademicArchives(schoolId).filter((item) => item.id !== archiveId);
  saveAcademicArchives(schoolId, next);

  const client = getSupabaseClient();
  if (client && schoolId) {
    try {
      const { error } = await client
        .from('academic_term_archives')
        .delete()
        .eq('school_id', schoolId)
        .eq('id', archiveId);
      if (error && !isMissingArchiveTableError(error)) {
        console.warn('[AcademicArchive] Delete warning:', error.message);
      }
    } catch {
      // ignore
    }
  }
  return next;
}

export async function hydrateAcademicArchivesFromSupabase(schoolId: string): Promise<AcademicTermArchive[]> {
  const local = loadAcademicArchives(schoolId);
  const client = getSupabaseClient();
  if (!client || !schoolId) return local;
  try {
    const { data, error } = await client
      .from('academic_term_archives')
      .select('id, archive_payload, archived_at')
      .eq('school_id', schoolId)
      .order('archived_at', { ascending: false });
    if (error) {
      if (!isMissingArchiveTableError(error)) {
        console.warn('[AcademicArchive] Load warning:', error.message);
      }
      return local;
    }
    const mergedMap = new Map<string, AcademicTermArchive>(local.map((a) => [a.id, a]));
    (data || []).forEach((row) => {
      if (row.archive_payload && typeof row.archive_payload === 'object') {
        const arch = row.archive_payload as AcademicTermArchive;
        if (arch.id) mergedMap.set(arch.id, arch);
      }
    });
    const merged = Array.from(mergedMap.values()).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
    saveAcademicArchives(schoolId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function createAcademicTermArchive(params: {
  schoolId: string;
  academicYear: string;
  semester: string;
  archivedBy: string;
  note?: string;
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  timetableSlots: TimetableSlot[];
}): Promise<{ archive: AcademicTermArchive; syncedToSupabase: boolean }> {
  const now = new Date().toISOString();
  const schoolCourses = params.courses.filter((c) => !c.schoolId || c.schoolId === params.schoolId);
  const termCourses = schoolCourses.filter(
    (c) =>
      (!c.academicYear || c.academicYear === params.academicYear) &&
      (!c.semester || c.semester === params.semester)
  );
  const effectiveCourses = termCourses.length > 0 ? termCourses : schoolCourses;
  const effectiveCourseIds = new Set(effectiveCourses.map((c) => c.id));

  const schoolGrades = params.grades.filter((g) => !g.schoolId || g.schoolId === params.schoolId);
  const termGrades = schoolGrades.filter(
    (g) =>
      effectiveCourseIds.has(g.courseId) ||
      ((!g.academicYear || g.academicYear === params.academicYear) &&
        (!g.semester || g.semester === params.semester))
  );
  const effectiveGrades = termGrades.length > 0 ? termGrades : schoolGrades;

  const termSlots = params.timetableSlots.filter(
    (slot) =>
      (!slot.schoolId || slot.schoolId === params.schoolId) &&
      (!slot.academicYear || slot.academicYear === params.academicYear) &&
      (!slot.semester || slot.semester === params.semester)
  );

  const schoolStudents = params.students.filter((s) => !s.schoolId || s.schoolId === params.schoolId);
  const activeStudents = schoolStudents.filter((s) => s.status === 'active' || s.status === 'transferred_in');

  const avgGpa =
    schoolStudents.length > 0
      ? Number(
          (schoolStudents.reduce((sum, s) => sum + (Number(s.gpa) || 0), 0) / schoolStudents.length).toFixed(2)
        )
      : 0;

  const schoolAttendance = params.attendance.filter((a) => !a.schoolId || a.schoolId === params.schoolId);
  const presentLike = schoolAttendance.filter((a) => a.status !== 'absent').length;
  const attendanceRatePct =
    schoolAttendance.length > 0 ? Math.round((presentLike / schoolAttendance.length) * 100) : 100;

  const indicatorSetsSnapshot: LearningIndicatorSet[] = [];
  const indicatorScoresSnapshot: Record<string, LearningIndicatorScore[]> = {};
  effectiveCourses.forEach((course) => {
    const sets = readLocalIndicatorSets(params.schoolId, course.id);
    sets.forEach((s) => {
      indicatorSetsSnapshot.push(s);
      indicatorScoresSnapshot[s.id] = readLocalIndicatorScores(params.schoolId, s.id);
    });
  });

  const archive: AcademicTermArchive = {
    id: `arch-${params.academicYear}-${params.semester}-${Date.now().toString(36)}`,
    schoolId: params.schoolId,
    academicYear: params.academicYear,
    semester: params.semester,
    archivedAt: now,
    archivedBy: params.archivedBy,
    note: params.note?.trim() || undefined,
    summary: {
      studentCount: schoolStudents.length,
      activeStudentCount: activeStudents.length,
      courseCount: effectiveCourses.length,
      gradeCount: effectiveGrades.length,
      avgGpa,
      attendanceRatePct,
    },
    studentsSnapshot: schoolStudents.map((s) => ({
      id: s.id,
      studentIdNumber: s.studentIdNumber,
      firstNameTh: s.firstNameTh,
      lastNameTh: s.lastNameTh,
      firstNameEn: s.firstNameEn,
      lastNameEn: s.lastNameEn,
      gradeLevel: s.gradeLevel,
      room: s.room,
      status: s.status,
      gpa: s.gpa,
    })),
    coursesSnapshot: effectiveCourses,
    gradesSnapshot: effectiveGrades,
    timetableSnapshot: termSlots,
    registrySnapshot: loadSchoolRegistryMap(params.schoolId),
    qualitativeSnapshot: loadQualitativeAssessments(params.schoolId, params.academicYear, params.semester),
    indicatorSetsSnapshot,
    indicatorScoresSnapshot,
  };

  const { syncedToSupabase } = await persistAcademicArchive(archive);
  return { archive, syncedToSupabase };
}

export async function buildAcademicRolloverPayload(params: {
  schoolId: string;
  options: AcademicRolloverOptions;
  courses: Course[];
  timetableSlots: TimetableSlot[];
  students: Student[];
}): Promise<{
  newCourses: Course[];
  newTimetableSlots: TimetableSlot[];
  promotedStudents?: Student[];
  copiedIndicatorsCount: number;
}> {
  const { schoolId, options, courses, timetableSlots, students } = params;
  const stamp = Date.now().toString(36);
  const schoolCourses = courses.filter((c) => !c.schoolId || c.schoolId === schoolId);
  const sourceTermCourses = schoolCourses.filter(
    (c) =>
      (!c.academicYear || c.academicYear === options.fromYear) &&
      (!c.semester || c.semester === options.fromSemester)
  );
  const effectiveSourceCourses = sourceTermCourses.length > 0 ? sourceTermCourses : schoolCourses;

  // Avoid duplicating if destination term already has identical course codes
  const existingTargetCourseKeys = new Set(
    schoolCourses
      .filter((c) => c.academicYear === options.toYear && c.semester === options.toSemester)
      .map((c) => `${c.code.trim().toLowerCase()}::${c.room.trim().toLowerCase()}`)
  );

  const newCourses: Course[] = [];
  const courseIdMap = new Map<string, string>();
  let copiedIndicatorsCount = 0;

  if (options.copyCourses) {
    for (let idx = 0; idx < effectiveSourceCourses.length; idx += 1) {
      const src = effectiveSourceCourses[idx];
      const key = `${src.code.trim().toLowerCase()}::${src.room.trim().toLowerCase()}`;
      if (existingTargetCourseKeys.has(key)) continue;

      const newCourseId = `crs-${options.toYear}-${options.toSemester}-${stamp}-${idx + 1}`;
      courseIdMap.set(src.id, newCourseId);
      newCourses.push({
        ...src,
        id: newCourseId,
        schoolId,
        academicYear: options.toYear,
        semester: options.toSemester,
        enrolledStudentIds: options.copyCourseEnrollments ? [...(src.enrolledStudentIds || [])] : [],
      });

      if (options.copyIndicators) {
        const copiedSets = await copyIndicatorSetsToNewCourse({
          schoolId,
          sourceCourseId: src.id,
          targetCourseId: newCourseId,
          targetAcademicYear: options.toYear,
          targetSemester: options.toSemester,
        });
        copiedIndicatorsCount += copiedSets.length;
      }
    }
  }

  const newTimetableSlots: TimetableSlot[] = [];
  if (options.copyTimetable) {
    const sourceSlots = timetableSlots.filter(
      (slot) =>
        (!slot.schoolId || slot.schoolId === schoolId) &&
        (!slot.academicYear || slot.academicYear === options.fromYear) &&
        (!slot.semester || slot.semester === options.fromSemester)
    );
    sourceSlots.forEach((slot, idx) => {
      const mappedCourseId = slot.courseId ? courseIdMap.get(slot.courseId) || slot.courseId : undefined;
      newTimetableSlots.push({
        ...slot,
        id: `tt-${options.toYear}-${options.toSemester}-${stamp}-${idx + 1}`,
        schoolId,
        courseId: mappedCourseId,
        academicYear: options.toYear,
        semester: options.toSemester,
      });
    });
  }

  let promotedStudents: Student[] | undefined;
  if (options.promoteStudents) {
    promotedStudents = students.map((student) => {
      if (student.schoolId && student.schoolId !== schoolId) return student;
      if (student.status !== 'active' && student.status !== 'transferred_in') return student;
      const nextInfo = getNextGradeLevel(student.gradeLevel || '');
      if (nextInfo.isGraduating) {
        return {
          ...student,
          status: 'graduated' as StudentStatus,
          gradeLevel: 'สำเร็จการศึกษา (Graduated)',
        };
      }
      return {
        ...student,
        gradeLevel: nextInfo.nextGrade,
        room: getNextRoom(student.room || ''),
      };
    });
  }

  return {
    newCourses,
    newTimetableSlots,
    promotedStudents,
    copiedIndicatorsCount,
  };
}

export function exportArchiveGradesCsv(archive: AcademicTermArchive): void {
  const courseById = new Map(archive.coursesSnapshot.map((c) => [c.id, c]));
  const studentById = new Map(archive.studentsSnapshot.map((s) => [s.id, s]));

  const headers = [
    'ปีการศึกษา',
    'ภาคเรียน',
    'รหัสนักเรียน',
    'ชื่อ-นามสกุล',
    'ระดับชั้น',
    'ห้อง',
    'รหัสวิชา',
    'ชื่อวิชา',
    'หน่วยกิต',
    'คะแนนเก็บ/งาน',
    'กลางภาค',
    'ปลายภาค',
    'คะแนนรวม',
    'ผลการเรียน',
    'ค่าระดับ',
  ];

  const rows = archive.gradesSnapshot.map((g) => {
    const stu = studentById.get(g.studentId);
    const crs = courseById.get(g.courseId);
    return [
      archive.academicYear,
      archive.semester,
      stu?.studentIdNumber || g.studentId,
      stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : '-',
      stu?.gradeLevel || '-',
      stu?.room || '-',
      crs?.code || '-',
      crs?.titleTh || '-',
      crs?.credits ?? '-',
      (g.assignmentScore || 0) + (g.quizScore || 0),
      g.midtermScore,
      g.finalScore,
      g.totalScore,
      g.letterGrade,
      g.gradePoint,
    ];
  });

  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Archive_Grades_${archive.academicYear}_T${archive.semester}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportArchiveJson(archive: AcademicTermArchive): void {
  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Archive_Full_${archive.academicYear}_T${archive.semester}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
