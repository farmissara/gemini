import {
  AttendanceRecord,
  CareerEducationStage,
  CareerKeySubjectReq,
  CareerProfile,
  CareerSubjectKey,
  Course,
  GradeRecord,
  GradingSystem,
  PortfolioItem,
  Student,
} from '../types';
import { calculateStudentAcademicSummary } from './moeGrading';

export interface SubjectReadinessItem {
  req: CareerKeySubjectReq;
  currentScore: number | null;
  matchedCourseTitles: string[];
  status: 'met' | 'needs_boost' | 'no_data';
  delta: number; // currentScore - targetScore
}

export interface CareerReadinessReport {
  stage: CareerEducationStage;
  stageLabelTh: string;
  stageLabelEn: string;
  readinessPercent: number; // 0 - 100
  rpgLevel: number; // 1, 2, 3
  rpgLevelTitleTh: string;
  rpgLevelTitleEn: string;
  currentGpax: number | null;
  targetGpax: number;
  gpaxDelta: number | null;
  gpaxMet: boolean;
  attendanceRate: number | null;
  portfolioCount: number;
  subjectItems: SubjectReadinessItem[];
  strengthsTh: string[];
  gapsTh: string[];
}

export function detectEducationStage(gradeLevel?: string): CareerEducationStage {
  const g = (gradeLevel || '').toLowerCase();
  if (
    g.includes('ป.') ||
    g.includes('ประถม') ||
    /grade\s*[1-6]\b/.test(g) ||
    /\bp[1-6]\b/.test(g)
  ) {
    return 'primary';
  }
  if (
    g.includes('ม.1') ||
    g.includes('ม.2') ||
    g.includes('ม.3') ||
    g.includes('ม.ต้น') ||
    /grade\s*[7-9]\b/.test(g) ||
    /\bm\.?\s*[1-3]\b/.test(g)
  ) {
    return 'middle';
  }
  return 'high';
}

export function getEducationStageDisplay(stage: CareerEducationStage): {
  labelTh: string;
  labelEn: string;
} {
  if (stage === 'primary') {
    return { labelTh: 'ระดับประถมศึกษา (ป.1–ป.6)', labelEn: 'Primary School' };
  }
  if (stage === 'middle') {
    return { labelTh: 'ระดับมัธยมศึกษาตอนต้น (ม.1–ม.3)', labelEn: 'Middle School' };
  }
  return { labelTh: 'ระดับมัธยมศึกษาตอนปลาย (ม.4–ม.6)', labelEn: 'High School (TCAS)' };
}

const SUBJECT_KEYWORDS: Record<CareerSubjectKey, string[]> = {
  math: ['คณิต', 'math', 'calculus', 'สถิติ', 'พีชคณิต', 'ma'],
  science: ['วิทย', 'science', 'ชีว', 'bio', 'เคมี', 'chem', 'ฟิสิกส์', 'phys', 'sc'],
  thai: ['ไทย', 'thai', 'th'],
  english: ['อังกฤษ', 'english', 'eng', 'en', 'ต่างประเทศ', 'ภาษา'],
  social: ['สังคม', 'ประวัติ', 'เศรษฐศาสตร์', 'หน้าที่', 'social', 'so'],
  computer: ['คอม', 'วิทยาการคำนวณ', 'เทคโนโลยี', 'coding', 'program', 'ai', 'cs', 'ict'],
  arts: ['ศิลป', 'ดนตรี', 'นาฏศิลป์', 'ออกแบบ', 'art', 'design', 'ar'],
  health: ['สุข', 'พละ', 'health', 'pe', 'sport'],
};

export function inferSubjectKeyFromCourse(course?: Course): CareerSubjectKey | null {
  if (!course) return null;
  const hay = `${course.code} ${course.titleTh} ${course.titleEn} ${course.department} ${course.category}`.toLowerCase();
  const keys = Object.keys(SUBJECT_KEYWORDS) as CareerSubjectKey[];
  for (const key of keys) {
    if (SUBJECT_KEYWORDS[key].some((kw) => hay.includes(kw))) {
      return key;
    }
  }
  if (course.category === 'stem') return 'science';
  if (course.category === 'language') return 'english';
  if (course.category === 'arts') return 'arts';
  if (course.category === 'social') return 'social';
  if (course.category === 'pe') return 'health';
  return null;
}

export function calculateCareerReadiness(params: {
  career: CareerProfile;
  student?: Student;
  gradeLevelFallback?: string;
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  portfolioItems: PortfolioItem[];
  completedQuestIds: string[];
  roleplayRunsCount: number;
  gradingSystem?: GradingSystem;
}): CareerReadinessReport {
  const {
    career,
    student,
    gradeLevelFallback,
    courses,
    grades,
    attendance,
    portfolioItems,
    completedQuestIds,
    roleplayRunsCount,
    gradingSystem = 'thai',
  } = params;

  const stage = detectEducationStage(student?.gradeLevel || gradeLevelFallback);
  const stageDisplay = getEducationStageDisplay(stage);

  // 1. GPAX calculation from real grades
  const summary = student
    ? calculateStudentAcademicSummary({
        student,
        courses,
        grades,
        gradingSystem,
      })
    : null;

  const currentGpax =
    summary?.hasRecordedGrades && summary.gpax !== null
      ? summary.gpax
      : student && student.gpa > 0
        ? Number(student.gpa)
        : null;

  const gpaxDelta = currentGpax !== null ? Number((currentGpax - career.targetGpax).toFixed(2)) : null;
  const gpaxMet = currentGpax !== null ? currentGpax >= career.targetGpax : false;

  // 2. Per-subject score matching
  const subjectScoreBuckets = new Map<CareerSubjectKey, { scores: number[]; titles: string[] }>();
  grades.forEach((g) => {
    const course = courses.find((c) => c.id === g.courseId);
    const key = inferSubjectKeyFromCourse(course);
    if (!key) return;
    const score = typeof g.totalScore === 'number' && !Number.isNaN(g.totalScore) ? g.totalScore : null;
    if (score === null) return;
    const existing = subjectScoreBuckets.get(key) || { scores: [], titles: [] };
    existing.scores.push(score);
    const title = course?.titleTh || course?.titleEn || course?.code || g.courseId;
    if (!existing.titles.includes(title)) existing.titles.push(title);
    subjectScoreBuckets.set(key, existing);
  });

  const subjectItems: SubjectReadinessItem[] = career.keySubjects.map((req) => {
    const bucket = subjectScoreBuckets.get(req.subjectKey);
    if (!bucket || bucket.scores.length === 0) {
      return {
        req,
        currentScore: null,
        matchedCourseTitles: [],
        status: 'no_data',
        delta: 0,
      };
    }
    const avg = Math.round(bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length);
    return {
      req,
      currentScore: avg,
      matchedCourseTitles: bucket.titles,
      status: avg >= req.targetScore ? 'met' : 'needs_boost',
      delta: avg - req.targetScore,
    };
  });

  // 3. Attendance rate
  const totalAtt = attendance.length;
  const attendedCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = totalAtt > 0 ? Math.round((attendedCount / totalAtt) * 100) : null;

  // 4. Portfolio & Quests contribution
  const portfolioCount = portfolioItems.length;
  const totalQuests = Math.max(1, career.quests.length);
  const completedForCareer = career.quests.filter((q) => completedQuestIds.includes(q.id)).length;

  // Weighted Readiness (0-100%)
  // - GPAX (35%)
  // - Key Subjects (30%)
  // - Attendance Discipline (15%)
  // - Quests + Portfolio + Roleplay (20%)
  const gpaxScore =
    currentGpax !== null
      ? Math.min(35, Math.round((currentGpax / Math.max(2.0, career.targetGpax)) * 35))
      : 16;

  const knownSubjects = subjectItems.filter((s) => s.currentScore !== null);
  const subjectScore =
    knownSubjects.length > 0
      ? Math.min(
          30,
          Math.round(
            (knownSubjects.reduce(
              (acc, item) => acc + Math.min(1.05, (item.currentScore || 0) / Math.max(50, item.req.targetScore)),
              0
            ) /
              knownSubjects.length) *
              30
          )
        )
      : 14;

  const attScore =
    attendanceRate !== null ? Math.min(15, Math.round((attendanceRate / 90) * 15)) : 10;

  const questProgressRatio = Math.min(1, (completedForCareer + Math.min(2, portfolioCount) + Math.min(1, roleplayRunsCount)) / (totalQuests + 2));
  const actionScore = Math.round(questProgressRatio * 20);

  const readinessPercent = Math.max(10, Math.min(100, gpaxScore + subjectScore + attScore + actionScore));

  // RPG Level
  let rpgLevel = 1;
  let rpgLevelTitleTh = 'Lv.1 นักสำรวจ';
  let rpgLevelTitleEn = 'Lv.1 Explorer';
  if (readinessPercent >= 78 && (completedForCareer >= 2 || roleplayRunsCount >= 1)) {
    rpgLevel = 3;
    rpgLevelTitleTh = 'Lv.3 ตัวจริงสายอาชีพ';
    rpgLevelTitleEn = 'Lv.3 Career Contender';
  } else if (readinessPercent >= 52 || completedForCareer >= 1 || portfolioCount >= 1) {
    rpgLevel = 2;
    rpgLevelTitleTh = 'Lv.2 ผู้ฝึกหัด';
    rpgLevelTitleEn = 'Lv.2 Apprentice';
  }

  // Strengths & Gaps
  const strengthsTh: string[] = [];
  const gapsTh: string[] = [];

  if (gpaxMet && currentGpax !== null) {
    strengthsTh.push(`GPAX ปัจจุบัน ${currentGpax.toFixed(2)} ถึงเป้าหมาย ${career.targetGpax.toFixed(2)}+ แล้ว`);
  } else if (currentGpax !== null && gpaxDelta !== null) {
    gapsTh.push(`GPAX ตอนนี้อยู่ที่ ${currentGpax.toFixed(2)} ขาดอีก ${Math.abs(gpaxDelta).toFixed(2)} เพื่อถึงเป้า ${career.targetGpax.toFixed(2)}`);
  } else {
    gapsTh.push(`ยังไม่มีข้อมูลเกรดเฉลี่ยสะสมในเทอมนี้ — เป้าหมายอาชีพนี้คือ GPAX ${career.targetGpax.toFixed(2)}+`);
  }

  subjectItems.forEach((s) => {
    if (s.status === 'met' && s.currentScore !== null) {
      strengthsTh.push(`${s.req.labelTh} ทำได้ ${s.currentScore}% (ถึงเกณฑ์ ${s.req.targetScore}%+)`);
    } else if (s.status === 'needs_boost' && s.currentScore !== null) {
      gapsTh.push(`${s.req.labelTh} ได้ ${s.currentScore}% — ควรเพิ่มอีก ${Math.abs(s.delta)}% (เป้า ${s.req.targetScore}%)`);
    }
  });

  if (attendanceRate !== null) {
    if (attendanceRate >= 85) {
      strengthsTh.push(`วินัยการมาเรียน ${attendanceRate}% สม่ำเสมอดีเยี่ยม`);
    } else {
      gapsTh.push(`อัตราการมาเรียน ${attendanceRate}% ควรรักษาให้เกิน 85% เพื่อความต่อเนื่อง`);
    }
  }

  if (portfolioCount > 0) {
    strengthsTh.push(`สะสมผลงานใน Portfolio แล้ว ${portfolioCount} ชิ้น`);
  } else {
    gapsTh.push('ยังไม่มีชิ้นงานใน Portfolio ลองทำภารกิจสะสมผลงานด้านบนเพื่อเริ่มต้น');
  }

  return {
    stage,
    stageLabelTh: stageDisplay.labelTh,
    stageLabelEn: stageDisplay.labelEn,
    readinessPercent,
    rpgLevel,
    rpgLevelTitleTh,
    rpgLevelTitleEn,
    currentGpax,
    targetGpax: career.targetGpax,
    gpaxDelta,
    gpaxMet,
    attendanceRate,
    portfolioCount,
    subjectItems,
    strengthsTh,
    gapsTh,
  };
}
