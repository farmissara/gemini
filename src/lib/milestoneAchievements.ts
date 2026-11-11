import {
  AttendanceRecord,
  AuthUser,
  EvaluatedMilestone,
  GradeRecord,
  MilestoneAchievementDef,
  PlayerScore,
  Student,
} from '../types';

export const MILESTONE_ACHIEVEMENTS: MilestoneAchievementDef[] = [
  // 1. Attendance Thresholds
  {
    id: 'att-early-bird',
    category: 'attendance',
    tier: 'bronze',
    titleTh: 'ตรงเวลาสม่ำเสมอ',
    titleEn: 'Punctual Starter',
    descriptionTh: 'เข้าเรียนตรงเวลาครบ 5 วันและสะสมคะแนนเริ่มต้นในระบบ',
    descriptionEn: 'Check in on time for 5 school days and reach 500 EXP.',
    metricLabelTh: 'วันเข้าเรียนตรงเวลา',
    metricLabelEn: 'Attendance Days',
    unitTh: 'วัน',
    unitEn: 'days',
    thresholdValue: 5,
    expThreshold: 500,
    rewardExp: 100,
    rewardGems: 15,
    iconKey: 'clock_check',
  },
  {
    id: 'att-iron-streak',
    category: 'attendance',
    tier: 'silver',
    titleTh: 'สตรีคเข้าเรียนเหล็กกล้า',
    titleEn: 'Attendance Streak Master',
    descriptionTh: 'รักษาสถิติเข้าเรียนสะสมครบ 15 วันพร้อมคะแนนความสม่ำเสมอ',
    descriptionEn: 'Reach 15 attended school days with at least 1,500 EXP.',
    metricLabelTh: 'วันเข้าเรียนสะสม',
    metricLabelEn: 'Attendance Days',
    unitTh: 'วัน',
    unitEn: 'days',
    thresholdValue: 15,
    expThreshold: 1500,
    rewardExp: 200,
    rewardGems: 30,
    iconKey: 'flame_streak',
  },
  {
    id: 'att-perfect-guardian',
    category: 'attendance',
    tier: 'gold',
    titleTh: 'ผู้พิทักษ์การมาเรียนดีเยี่ยม',
    titleEn: 'Perfect Attendance Guardian',
    descriptionTh: 'เข้าเรียนสะสมถึงเกณฑ์ 25 วันและมีคะแนน EXP 3,000 ขึ้นไป',
    descriptionEn: 'Achieve 25 attended school days and 3,000+ EXP.',
    metricLabelTh: 'วันเข้าเรียนสะสม',
    metricLabelEn: 'Attendance Days',
    unitTh: 'วัน',
    unitEn: 'days',
    thresholdValue: 25,
    expThreshold: 3000,
    rewardExp: 350,
    rewardGems: 50,
    iconKey: 'shield_perfect',
  },

  // 2. Library Usage Thresholds
  {
    id: 'lib-explorer',
    category: 'library',
    tier: 'bronze',
    titleTh: 'นักสำรวจห้องสมุดดิจิทัล',
    titleEn: 'Library Explorer',
    descriptionTh: 'เข้าสืบค้นและยืมอ่านสื่อห้องสมุดครบ 5 ครั้ง',
    descriptionEn: 'Log 5 digital or physical library visits and 500+ EXP.',
    metricLabelTh: 'ครั้งเข้าใช้ห้องสมุด',
    metricLabelEn: 'Library Visits',
    unitTh: 'ครั้ง',
    unitEn: 'visits',
    thresholdValue: 5,
    expThreshold: 500,
    rewardExp: 100,
    rewardGems: 15,
    iconKey: 'book_open',
  },
  {
    id: 'lib-scholar',
    category: 'library',
    tier: 'silver',
    titleTh: 'หนอนหนังสือคลังปัญญา',
    titleEn: 'Library Scholar',
    descriptionTh: 'เข้าอ่านและใช้ทรัพยากรห้องสมุดครบ 15 ครั้ง พร้อมสะสม 2,500 EXP',
    descriptionEn: 'Complete 15 library sessions with at least 2,500 EXP.',
    metricLabelTh: 'ครั้งเข้าใช้ห้องสมุด',
    metricLabelEn: 'Library Visits',
    unitTh: 'ครั้ง',
    unitEn: 'visits',
    thresholdValue: 15,
    expThreshold: 2500,
    rewardExp: 220,
    rewardGems: 35,
    iconKey: 'library_stack',
  },
  {
    id: 'lib-sage',
    category: 'library',
    tier: 'diamond',
    titleTh: 'ปรมาจารย์คลังความรู้',
    titleEn: 'Grand Library Sage',
    descriptionTh: 'เข้าใช้ห้องสมุดและศูนย์เรียนรู้ครบ 30 ครั้ง พร้อม 4,500 EXP',
    descriptionEn: 'Master 30 library research visits and reach 4,500 EXP.',
    metricLabelTh: 'ครั้งเข้าใช้ห้องสมุด',
    metricLabelEn: 'Library Visits',
    unitTh: 'ครั้ง',
    unitEn: 'visits',
    thresholdValue: 30,
    expThreshold: 4500,
    rewardExp: 450,
    rewardGems: 70,
    iconKey: 'crown_library',
  },

  // 3. Academic Performance Thresholds (GPA + PlayerScores EXP & Wins)
  {
    id: 'acad-rising-star',
    category: 'academic',
    tier: 'bronze',
    titleTh: 'ดาวรุ่งผลการเรียนดี',
    titleEn: 'Rising Academic Star',
    descriptionTh: 'รักษาระดับเกรดเฉลี่ย (GPA) ตั้งแต่ 3.25 และสะสม 1,500 EXP',
    descriptionEn: 'Maintain a 3.25+ GPA alongside 1,500 EXP in PlayerScores.',
    metricLabelTh: 'เกรดเฉลี่ยสะสม (GPA)',
    metricLabelEn: 'Cumulative GPA',
    unitTh: 'GPA',
    unitEn: 'GPA',
    thresholdValue: 3.25,
    expThreshold: 1500,
    rewardExp: 150,
    rewardGems: 25,
    iconKey: 'star_academic',
  },
  {
    id: 'acad-honor-roll',
    category: 'academic',
    tier: 'gold',
    titleTh: 'ทำเนียบเกียรตินิยมวิชาการ',
    titleEn: 'Academic Honor Roll',
    descriptionTh: 'ทำเกรดเฉลี่ย 3.75 ขึ้นไป ชนะประลองความรู้ 15 ครั้ง และ 3,000 EXP',
    descriptionEn: 'Achieve 3.75+ GPA, 15 knowledge duel wins, and 3,000+ EXP.',
    metricLabelTh: 'เกรดเฉลี่ยสะสม (GPA)',
    metricLabelEn: 'Cumulative GPA',
    unitTh: 'GPA',
    unitEn: 'GPA',
    thresholdValue: 3.75,
    expThreshold: 3000,
    winsThreshold: 15,
    rewardExp: 300,
    rewardGems: 45,
    iconKey: 'award_honor',
  },
  {
    id: 'acad-grandmaster',
    category: 'academic',
    tier: 'diamond',
    titleTh: 'สุดยอดนักปราชญ์ EduVerse',
    titleEn: 'Academic Grandmaster',
    descriptionTh: 'เกรดเฉลี่ย 3.85 ขึ้นไป ชนะประลอง 25 ครั้ง และสะสม 4,500 EXP',
    descriptionEn: 'Reach 3.85+ GPA, 25 duel wins, and 4,500+ PlayerScore EXP.',
    metricLabelTh: 'เกรดเฉลี่ยสะสม (GPA)',
    metricLabelEn: 'Cumulative GPA',
    unitTh: 'GPA',
    unitEn: 'GPA',
    thresholdValue: 3.85,
    expThreshold: 4500,
    winsThreshold: 25,
    rewardExp: 500,
    rewardGems: 85,
    iconKey: 'trophy_grandmaster',
  },
];

export interface ResolvedStudentMetrics {
  studentId?: string;
  attendanceDays: number;
  attendanceStreak: number;
  libraryVisits: number;
  academicGpa: number;
  exp: number;
  gems: number;
  battleWins: number;
  streak: number;
}

export function resolveStudentMilestoneMetrics(
  score: PlayerScore,
  students: Student[],
  attendance: AttendanceRecord[],
  grades: GradeRecord[]
): ResolvedStudentMetrics {
  const matchedStudent = students.find(
    (s) =>
      (score.studentId && s.id === score.studentId) ||
      s.id === score.userId ||
      score.name.includes(`${s.firstNameTh} ${s.lastNameTh}`) ||
      score.name.includes(s.studentIdNumber)
  );

  const studentGrades = matchedStudent
    ? grades.filter((g) => g.studentId === matchedStudent.id)
    : [];

  let computedGpa = score.academicGpa ?? matchedStudent?.gpa ?? 3.4;
  if (studentGrades.length > 0 && score.academicGpa === undefined) {
    const avgGradePoint =
      studentGrades.reduce((sum, g) => sum + g.gradePoint, 0) / studentGrades.length;
    computedGpa = Number(avgGradePoint.toFixed(2));
  }

  // Derive attendance floor from live attendance if score hasn't initialized it
  const livePresentCount = matchedStudent
    ? attendance.filter(
        (a) => a.studentId === matchedStudent.id && (a.status === 'present' || a.status === 'late')
      ).length
    : 0;

  const attendanceDays = score.attendanceDays ?? Math.max(livePresentCount, score.streak * 2);
  const attendanceStreak = score.attendanceStreak ?? score.streak;
  const libraryVisits = score.libraryVisits ?? Math.max(2, Math.floor(score.exp / 400));

  return {
    studentId: matchedStudent?.id || score.studentId,
    attendanceDays,
    attendanceStreak,
    libraryVisits,
    academicGpa: Number(computedGpa.toFixed(2)),
    exp: score.exp,
    gems: score.gems,
    battleWins: score.battleWins,
    streak: score.streak,
  };
}

export function evaluatePlayerMilestones(
  score: PlayerScore,
  students: Student[],
  attendance: AttendanceRecord[],
  grades: GradeRecord[]
): { metrics: ResolvedStudentMetrics; milestones: EvaluatedMilestone[] } {
  const metrics = resolveStudentMilestoneMetrics(score, students, attendance, grades);

  const milestones: EvaluatedMilestone[] = MILESTONE_ACHIEVEMENTS.map((def) => {
    let primaryValue = 0;
    if (def.category === 'attendance') {
      primaryValue = metrics.attendanceDays;
    } else if (def.category === 'library') {
      primaryValue = metrics.libraryVisits;
    } else {
      primaryValue = metrics.academicGpa;
    }

    const expReq = def.expThreshold ?? 0;
    const winsReq = def.winsThreshold ?? 0;

    const metPrimary = primaryValue >= def.thresholdValue;
    const metExp = metrics.exp >= expReq;
    const metWins = metrics.battleWins >= winsReq;

    const unlocked = metPrimary && metExp && metWins;

    // Combined normalized progress ratio across criteria
    const ratios: number[] = [Math.min(1, primaryValue / def.thresholdValue)];
    if (expReq > 0) ratios.push(Math.min(1, metrics.exp / expReq));
    if (winsReq > 0) ratios.push(Math.min(1, metrics.battleWins / winsReq));

    const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const progressPct = unlocked ? 100 : Math.min(99, Math.round(avgRatio * 100));

    return {
      def,
      currentValue: primaryValue,
      currentExp: metrics.exp,
      currentWins: metrics.battleWins,
      progressPct,
      unlocked,
    };
  });

  return { metrics, milestones };
}

export function selectDefaultPlayerScore(
  playerScores: PlayerScore[],
  currentUser: AuthUser | null | undefined,
  students: Student[]
): PlayerScore | undefined {
  const studentScores = playerScores.filter((p) => p.role === 'student');
  const pool = studentScores.length > 0 ? studentScores : playerScores;

  if (!currentUser) return pool[0];

  if (currentUser.role === 'student') {
    const matched = pool.find(
      (p) =>
        p.userId === currentUser.id ||
        (currentUser.studentRecordId && p.studentId === currentUser.studentRecordId) ||
        (currentUser.fullNameTh && p.name.includes(currentUser.fullNameTh.split(' ')[0]))
    );
    if (matched) return matched;
  }

  if (currentUser.role === 'parent' && currentUser.childrenStudentIds?.length) {
    const firstChildId = currentUser.childrenStudentIds[0];
    const matched = pool.find((p) => p.studentId === firstChildId || p.userId === firstChildId);
    if (matched) return matched;
  }

  // Fallback: pick top student score that maps cleanly to an active student
  const withStudent = pool.find((p) =>
    students.some((s) => s.id === p.studentId || s.id === p.userId)
  );
  return withStudent || pool[0];
}
