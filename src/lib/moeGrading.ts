import { Course, GradeRecord, GradingSystem, Student } from '../types';
import { calculateGrade } from './schoolSettings';

export type EducationStage =
  | 'kindergarten'
  | 'primary_early'
  | 'primary_upper'
  | 'lower_secondary'
  | 'upper_secondary'
  | 'vocational'
  | 'unknown';

export const SPECIAL_MOE_GRADES = ['ร', 'มส.', 'ผ', 'มผ'] as const;
export type SpecialMoeGrade = (typeof SPECIAL_MOE_GRADES)[number];

export function isSpecialMoeGrade(letter?: string | null): letter is SpecialMoeGrade {
  if (!letter) return false;
  const normalized = letter.trim();
  return (SPECIAL_MOE_GRADES as readonly string[]).includes(normalized);
}

export function clampScore(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value * 100) / 100));
}

export function detectEducationStage(gradeLevel?: string | null): EducationStage {
  const raw = (gradeLevel || '').trim();
  if (!raw) return 'unknown';
  const normalized = raw.toLowerCase().replace(/\s+/g, '');

  // Kindergarten
  if (
    normalized.includes('อนุบาล') ||
    /(^|[^a-z])k\.?[1-3]([^0-9]|$)/.test(normalized) ||
    normalized.includes('อ.1') ||
    normalized.includes('อ.2') ||
    normalized.includes('อ.3') ||
    normalized.includes('kindergarten')
  ) {
    return 'kindergarten';
  }

  // Vocational
  if (normalized.includes('ปวช') || normalized.includes('ปวส') || normalized.includes('vocational')) {
    return 'vocational';
  }

  // Primary (ป.1 - ป.6, P.1 - P.6, Grade 1 - 6)
  for (let level = 1; level <= 6; level += 1) {
    const isPrimaryMatch =
      normalized.includes(`ป.${level}`) ||
      normalized.includes(`ประถมศึกษาปีที่${level}`) ||
      normalized.includes(`ประถม${level}`) ||
      normalized.includes(`p.${level}`) ||
      normalized.includes(`primary${level}`) ||
      new RegExp(`^grade${level}$`).test(normalized) ||
      normalized.includes(`(grade${level})`);

    // Guard against "Grade 10/11/12" matching Grade 1
    if (level === 1 && /grade1[0-2]/.test(normalized)) continue;

    if (isPrimaryMatch) {
      return level <= 3 ? 'primary_early' : 'primary_upper';
    }
  }
  if (normalized.includes('ประถม') || normalized.includes('primary')) {
    return 'primary_upper';
  }

  // Lower Secondary (ม.1 - ม.3, M.1 - M.3, Grade 7 - 9)
  for (let level = 1; level <= 3; level += 1) {
    const gradeNum = level + 6;
    if (
      normalized.includes(`ม.${level}`) ||
      normalized.includes(`มัธยมศึกษาปีที่${level}`) ||
      normalized.includes(`มัธยม${level}`) ||
      normalized.includes(`m.${level}`) ||
      normalized.includes(`secondary${level}`) ||
      normalized.includes(`grade${gradeNum}`)
    ) {
      return 'lower_secondary';
    }
  }

  // Upper Secondary (ม.4 - ม.6, M.4 - M.6, Grade 10 - 12)
  for (let level = 4; level <= 6; level += 1) {
    const gradeNum = level + 6;
    if (
      normalized.includes(`ม.${level}`) ||
      normalized.includes(`มัธยมศึกษาปีที่${level}`) ||
      normalized.includes(`มัธยม${level}`) ||
      normalized.includes(`m.${level}`) ||
      normalized.includes(`secondary${level}`) ||
      normalized.includes(`grade${gradeNum}`)
    ) {
      return 'upper_secondary';
    }
  }

  if (normalized.includes('มัธยม') || normalized.includes('secondary')) {
    return 'lower_secondary';
  }

  return 'unknown';
}

export function isPrimaryStage(stage: EducationStage): boolean {
  return stage === 'primary_early' || stage === 'primary_upper';
}

export function isPrimaryGradeLevel(gradeLevel?: string | null): boolean {
  return isPrimaryStage(detectEducationStage(gradeLevel));
}

export function isEarlyPrimaryGradeLevel(gradeLevel?: string | null): boolean {
  return detectEducationStage(gradeLevel) === 'primary_early';
}

export function isSecondaryStage(stage: EducationStage): boolean {
  return stage === 'lower_secondary' || stage === 'upper_secondary';
}

export function isSecondaryGradeLevel(gradeLevel?: string | null): boolean {
  return isSecondaryStage(detectEducationStage(gradeLevel));
}

export function detectCourseEducationStage(
  course?: Course | null,
  relatedStudents: Student[] = []
): EducationStage {
  if (relatedStudents.length > 0) {
    const counts = new Map<EducationStage, number>();
    relatedStudents.forEach((student) => {
      const stage = detectEducationStage(student.gradeLevel);
      if (stage !== 'unknown') {
        counts.set(stage, (counts.get(stage) || 0) + 1);
      }
    });
    if (counts.size > 0) {
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      return sorted[0][0];
    }
  }

  if (!course) return 'unknown';

  const fromRoomOrTitle = detectEducationStage(
    `${course.room || ''} ${course.titleTh || ''} ${course.titleEn || ''}`
  );
  if (fromRoomOrTitle !== 'unknown') return fromRoomOrTitle;

  // Thai MOE course code convention: e.g. ท11101..ท16101 (ป.1-ป.6), ท21101..ท23101 (ม.1-ม.3), ท31101..ท33101 (ม.4-ม.6)
  const codeMatch = (course.code || '').trim().match(/^[ก-ฮA-Za-z]{1,2}([1-3])([1-6])\d{3}$/);
  if (codeMatch) {
    const levelGroup = codeMatch[1];
    const yearNum = Number(codeMatch[2]);
    if (levelGroup === '1') {
      return yearNum <= 3 ? 'primary_early' : 'primary_upper';
    }
    if (levelGroup === '2') return 'lower_secondary';
    if (levelGroup === '3') return 'upper_secondary';
  }

  return 'unknown';
}

export function getEducationStageLabelTh(stage: EducationStage): string {
  switch (stage) {
    case 'kindergarten':
      return 'ระดับปฐมวัย (อนุบาล)';
    case 'primary_early':
      return 'ระดับประถมศึกษาตอนต้น (ป.1–ป.3)';
    case 'primary_upper':
      return 'ระดับประถมศึกษาตอนปลาย (ป.4–ป.6)';
    case 'lower_secondary':
      return 'ระดับมัธยมศึกษาตอนต้น (ม.1–ม.3)';
    case 'upper_secondary':
      return 'ระดับมัธยมศึกษาตอนปลาย (ม.4–ม.6)';
    case 'vocational':
      return 'ระดับอาชีวศึกษา (ปวช.)';
    default:
      return 'การศึกษาขั้นพื้นฐาน';
  }
}

export function getStudentPrefixTh(student: Pick<Student, 'gender' | 'gradeLevel'>): string {
  const stage = detectEducationStage(student.gradeLevel);
  if (stage === 'upper_secondary' || stage === 'vocational') {
    return student.gender === 'female' ? 'นางสาว' : 'นาย';
  }
  return student.gender === 'female' ? 'เด็กหญิง' : 'เด็กชาย';
}

export function getStudentShortPrefixTh(student: Pick<Student, 'gender' | 'gradeLevel'>): string {
  const stage = detectEducationStage(student.gradeLevel);
  if (stage === 'upper_secondary' || stage === 'vocational') {
    return student.gender === 'female' ? 'น.ส.' : 'นาย';
  }
  return student.gender === 'female' ? 'ด.ญ.' : 'ด.ช.';
}

export function isActivityCourse(course?: Pick<Course, 'category' | 'titleTh' | 'department'> | null): boolean {
  if (!course) return false;
  if (course.category === 'activities') return true;
  const text = `${course.titleTh || ''} ${course.department || ''}`.toLowerCase();
  return text.includes('กิจกรรมพัฒนาผู้เรียน');
}

export interface EffectiveGradeResolution {
  letter: string;
  point: number;
  isSpecial: boolean;
  isActivity: boolean;
  countsInGpa: boolean;
  passed: boolean | null;
}

export function resolveEffectiveGrade(
  grade: Pick<GradeRecord, 'totalScore' | 'letterGrade' | 'gradePoint'> | undefined,
  course?: Pick<Course, 'category' | 'titleTh' | 'department'> | null,
  gradingSystem: GradingSystem = 'thai',
  isAtRiskMs: boolean = false
): EffectiveGradeResolution {
  const activity = isActivityCourse(course);

  if (isAtRiskMs && (!grade || !isSpecialMoeGrade(grade.letterGrade) || grade.letterGrade === 'มส.')) {
    return {
      letter: 'มส.',
      point: 0,
      isSpecial: true,
      isActivity: activity,
      countsInGpa: false,
      passed: false,
    };
  }

  if (!grade) {
    return {
      letter: activity ? 'รอประเมิน' : 'ร',
      point: 0,
      isSpecial: true,
      isActivity: activity,
      countsInGpa: false,
      passed: null,
    };
  }

  const trimmedLetter = (grade.letterGrade || '').trim();
  if (trimmedLetter === 'ร' || trimmedLetter === 'มส.') {
    return {
      letter: trimmedLetter,
      point: 0,
      isSpecial: true,
      isActivity: activity,
      countsInGpa: false,
      passed: false,
    };
  }

  if (activity || trimmedLetter === 'ผ' || trimmedLetter === 'มผ') {
    const passed = trimmedLetter === 'ผ' ? true : trimmedLetter === 'มผ' ? false : grade.totalScore >= 50;
    return {
      letter: passed ? 'ผ' : 'มผ',
      point: 0,
      isSpecial: true,
      isActivity: true,
      countsInGpa: false,
      passed,
    };
  }

  const calculated = calculateGrade(grade.totalScore, gradingSystem);
  return {
    letter: calculated.letter,
    point: calculated.point,
    isSpecial: false,
    isActivity: false,
    countsInGpa: true,
    passed: calculated.point >= 1,
  };
}

export interface StudentAcademicSummary {
  stage: EducationStage;
  isPrimary: boolean;
  isEarlyPrimary: boolean;
  isSecondary: boolean;
  evaluationCycle: 'yearly' | 'semester';
  registeredCredits: number;
  earnedCredits: number;
  gradedCredits: number;
  termGpa: number | null;
  gpax: number | null;
  averageRawScore: number | null;
  gradedSubjectCount: number;
  hasRecordedGrades: boolean;
}

export function calculateStudentAcademicSummary({
  student,
  courses,
  grades,
  gradingSystem = 'thai',
  currentAcademicYear,
  currentSemester,
}: {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  gradingSystem?: GradingSystem;
  currentAcademicYear?: string;
  currentSemester?: string;
}): StudentAcademicSummary {
  const stage = detectEducationStage(student.gradeLevel);
  const isPrimary = isPrimaryStage(stage);
  const isEarlyPrimary = stage === 'primary_early';
  const isSecondary = isSecondaryStage(stage);
  const evaluationCycle: 'yearly' | 'semester' = isPrimary ? 'yearly' : 'semester';

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const studentGrades = grades.filter((g) => g.studentId === student.id);

  let totalRegisteredCredits = 0;
  let totalEarnedCredits = 0;
  let cumulativeWeightedPoints = 0;
  let cumulativeGradedCredits = 0;

  let termWeightedPoints = 0;
  let termGradedCredits = 0;

  let rawScoreSum = 0;
  let rawScoreCount = 0;

  // Courses enrolled without grades yet still count towards registered credits if in current scope
  const enrolledCourses = courses.filter((c) => (c.enrolledStudentIds || []).includes(student.id));
  const gradedCourseIds = new Set(studentGrades.map((g) => g.courseId));

  enrolledCourses.forEach((course) => {
    if (!gradedCourseIds.has(course.id) && !isActivityCourse(course)) {
      totalRegisteredCredits += course.credits || 0;
    }
  });

  studentGrades.forEach((grade) => {
    const course = courseById.get(grade.courseId);
    const resolved = resolveEffectiveGrade(grade, course, gradingSystem, false);
    if (resolved.isActivity) return;

    const weight = course?.credits && course.credits > 0 ? course.credits : 1;
    totalRegisteredCredits += course?.credits ?? 0;

    if (!resolved.isSpecial) {
      rawScoreSum += grade.totalScore;
      rawScoreCount += 1;

      cumulativeWeightedPoints += resolved.point * weight;
      cumulativeGradedCredits += weight;

      if (resolved.passed) {
        totalEarnedCredits += course?.credits ?? 0;
      }

      const matchesCurrentTerm =
        (!currentAcademicYear || !grade.academicYear || grade.academicYear === currentAcademicYear) &&
        (!currentSemester || !grade.semester || grade.semester === currentSemester);
      if (matchesCurrentTerm) {
        termWeightedPoints += resolved.point * weight;
        termGradedCredits += weight;
      }
    }
  });

  const gpax =
    cumulativeGradedCredits > 0
      ? Number((cumulativeWeightedPoints / cumulativeGradedCredits).toFixed(2))
      : null;

  const termGpa =
    termGradedCredits > 0
      ? Number((termWeightedPoints / termGradedCredits).toFixed(2))
      : gpax;

  const averageRawScore =
    rawScoreCount > 0 ? Number((rawScoreSum / rawScoreCount).toFixed(1)) : null;

  return {
    stage,
    isPrimary,
    isEarlyPrimary,
    isSecondary,
    evaluationCycle,
    registeredCredits: totalRegisteredCredits,
    earnedCredits: totalEarnedCredits,
    gradedCredits: cumulativeGradedCredits,
    termGpa,
    gpax,
    averageRawScore,
    gradedSubjectCount: rawScoreCount,
    hasRecordedGrades: studentGrades.length > 0,
  };
}

export function matchesEducationLevelFilter(
  gradeLevel: string | undefined | null,
  level: 'all' | 'p6' | 'm3' | 'm6'
): boolean {
  if (level === 'all') return true;
  const normalized = (gradeLevel || '').toLowerCase().replace(/\s+/g, '');
  if (!normalized) return false;

  if (level === 'p6') {
    return (
      normalized.includes('ป.6') ||
      normalized.includes('ประถมศึกษาปีที่6') ||
      normalized.includes('ประถม6') ||
      normalized.includes('p.6') ||
      normalized.includes('primary6') ||
      normalized === 'grade6' ||
      normalized.includes('(grade6)')
    );
  }

  if (level === 'm3') {
    return (
      normalized.includes('ม.3') ||
      normalized.includes('มัธยมศึกษาปีที่3') ||
      normalized.includes('มัธยม3') ||
      normalized.includes('m.3') ||
      normalized.includes('secondary3') ||
      normalized.includes('grade9')
    );
  }

  // m6
  return (
    normalized.includes('ม.6') ||
    normalized.includes('มัธยมศึกษาปีที่6') ||
    normalized.includes('มัธยม6') ||
    normalized.includes('m.6') ||
    normalized.includes('secondary6') ||
    normalized.includes('grade12')
  );
}
