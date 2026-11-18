import { Course, GradeRecord, GradingSystem, Student, SystemConfig } from '../types';
import { sendEduVerseNotification } from './pushNotifications';
import { sendPrivateParentNotification } from './parentNotifications';
import {
  detectEducationStage,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
  isPrimaryStage,
  resolveEffectiveGrade,
} from './moeGrading';

export interface GradeAlertRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  totalScore: number;
  letterGrade: string;
  isNewRecord: boolean;
  isPrimary: boolean;
  title: string;
  body: string;
  timestamp: string;
}

const GRADE_ALERTS_STORAGE_KEY = 'eduverse_grade_alerts_v1';

export function getStoredGradeAlerts(schoolId?: string, studentId?: string): GradeAlertRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GRADE_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GradeAlertRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => {
      if (schoolId && item.schoolId && item.schoolId !== schoolId) return false;
      if (studentId && item.studentId !== studentId) return false;
      return true;
    });
  } catch {
    return [];
  }
}

function saveGradeAlertRecord(entry: GradeAlertRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredGradeAlerts();
    const updated = [entry, ...existing].slice(0, 120);
    localStorage.setItem(GRADE_ALERTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('eduverse:grade-alert', { detail: entry }));
  } catch {
    // Ignore storage quota errors
  }
}

export interface DispatchGradeAlertParams {
  student: Student;
  course?: Course;
  grade: GradeRecord;
  systemConfig: Pick<SystemConfig, 'gradingSystem' | 'academicYear' | 'currentSemester'>;
  schoolId: string;
  isNewRecord?: boolean;
  isDemoMode?: boolean;
  actorName?: string;
}

/**
 * Formats and dispatches an automated grade alert to both student & parent feeds
 * (in-app Notification Center, Web Push, Parent Daily Pulse, and private Supabase parent push when live).
 */
export async function dispatchGradeAlert(
  params: DispatchGradeAlertParams
): Promise<GradeAlertRecord> {
  const {
    student,
    course,
    grade,
    systemConfig,
    schoolId,
    isNewRecord = false,
    isDemoMode = true,
  } = params;

  const stage = detectEducationStage(student.gradeLevel);
  const isPrimary = isPrimaryStage(stage);
  const gradingSystem: GradingSystem = systemConfig.gradingSystem || 'thai';
  const resolved = resolveEffectiveGrade(grade, course, gradingSystem, false);
  const feedback = getRawScoreFeedback(grade.totalScore);

  const studentFullName = `${getStudentShortPrefixTh(student)} ${student.firstNameTh} ${student.lastNameTh}`.trim();
  const courseCode = course?.code || grade.courseId;
  const courseTitle = course?.titleTh || course?.titleEn || courseCode;

  const actionLabel = isNewRecord ? 'บันทึกผลการเรียนใหม่' : 'อัปเดตผลการเรียน';
  const title = `📊 ${actionLabel}: ${courseCode} ${courseTitle}`;

  // Primary students & parents receive raw percentage & developmental feedback (no GPA focus)
  const scoreSummary = resolved.isSpecial
    ? `ผลประเมิน: ${resolved.letter} (คะแนนรวม ${grade.totalScore}/100)`
    : isPrimary
    ? `คะแนนดิบ ${grade.totalScore}/100 (${grade.totalScore}%) • ระดับพัฒนาการ: ${feedback.labelTh}`
    : `คะแนนรวม ${grade.totalScore}/100 (${grade.totalScore}%) • เกรด ${resolved.letter} (${resolved.point.toFixed(1)})`;

  const body = `${studentFullName} (${student.gradeLevel} ${student.room}) • ${scoreSummary} • แจ้งเตือนถึงนักเรียนและผู้ปกครองแล้ว`;

  const alertRecord: GradeAlertRecord = {
    id: `grd-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    schoolId,
    studentId: student.id,
    studentName: studentFullName,
    courseId: grade.courseId,
    courseCode,
    courseTitle,
    totalScore: grade.totalScore,
    letterGrade: resolved.letter,
    isNewRecord,
    isPrimary,
    title,
    body,
    timestamp: new Date().toISOString(),
  };

  saveGradeAlertRecord(alertRecord);

  await sendEduVerseNotification({
    title,
    body,
    category: 'homework',
    priority: 'normal',
    tag: `grade-${grade.id}`,
    schoolId,
    targetStudentIds: [student.id, ...(student.studentIdNumber ? [student.studentIdNumber] : [])],
    targetRoles: ['student', 'parent', 'teacher', 'admin', 'super_admin'],
    metadata: {
      alertType: 'grade_update',
      schoolId,
      studentId: student.id,
      courseId: grade.courseId,
      gradeId: grade.id,
      totalScore: grade.totalScore,
      letterGrade: resolved.letter,
      targetAudience: ['student', 'parent'],
    },
  });

  if (!isDemoMode && schoolId) {
    try {
      await sendPrivateParentNotification({
        schoolId,
        studentId: student.id,
        eventId: `grade-${grade.id}-${Date.now()}`,
        category: 'homework',
        title,
        body: `${studentFullName} • ${courseCode} ${courseTitle} • ${scoreSummary}`,
      });
    } catch (error) {
      console.warn('Could not send live parent grade notification:', error);
    }
  }

  return alertRecord;
}
