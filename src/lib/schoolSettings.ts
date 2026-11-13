import { GradeRecord, GradingSystem, School } from '../types';

export const DEFAULT_SEMESTER_OPTIONS = ['1', '2', 'Summer'];

export const DEFAULT_STAFF_POSITION_OPTIONS = [
  'นักการภารโรง',
  'พนักงานขับรถ / รปภ.',
  'เจ้าหน้าที่ธุรการ',
  'เจ้าหน้าที่การเงินและพัสดุ',
  'นักวิชาการศึกษา / แนะแนว',
  'พยาบาลประจำโรงเรียน',
  'ครูอัตราจ้าง',
  'ครูผู้ช่วย',
  'ครู',
  'หัวหน้ากลุ่มสาระการเรียนรู้',
  'รองผู้อำนวยการ',
  'ผู้อำนวยการ',
];

export function getSchoolSemesterOptions(school?: Pick<School, 'semesterOptions'>): string[] {
  const options = school?.semesterOptions?.map((term) => term.trim()).filter(Boolean) || [];
  return options.length > 0 ? [...new Set(options)] : DEFAULT_SEMESTER_OPTIONS;
}

export function formatSemesterLabel(semester: string): string {
  const normalized = semester.trim();
  if (!normalized) return '';
  if (/^(ภาคเรียนที่|ภาคฤดูร้อน|เทอม)/.test(normalized)) return normalized;
  if (/^\d+$/.test(normalized)) return `ภาคเรียนที่ ${normalized}`;
  return normalized.toLowerCase() === 'summer' ? 'ภาคฤดูร้อน (Summer)' : normalized;
}

export function calculateGrade(
  total: number,
  gradingSystem: GradingSystem
): { letter: GradeRecord['letterGrade']; point: number } {
  if (gradingSystem === 'international') {
    if (total >= 90) return { letter: 'A', point: 4.0 };
    if (total >= 80) return { letter: 'B', point: 3.0 };
    if (total >= 70) return { letter: 'C', point: 2.0 };
    if (total >= 60) return { letter: 'D', point: 1.0 };
    return { letter: 'F', point: 0.0 };
  }

  if (total >= 80) return { letter: '4', point: 4.0 };
  if (total >= 75) return { letter: '3.5', point: 3.5 };
  if (total >= 70) return { letter: '3', point: 3.0 };
  if (total >= 65) return { letter: '2.5', point: 2.5 };
  if (total >= 60) return { letter: '2', point: 2.0 };
  if (total >= 55) return { letter: '1.5', point: 1.5 };
  if (total >= 50) return { letter: '1', point: 1.0 };
  return { letter: '0', point: 0.0 };
}

export function getGradingSystemLabel(gradingSystem: GradingSystem): string {
  return gradingSystem === 'international'
    ? 'เกณฑ์สากล (A, B, C, D, F · เต็ม 4.0)'
    : 'เกณฑ์ไทย สพฐ. (4, 3.5, 3, 2.5, 2, 1.5, 1, 0)';
}

export function getGradingScaleLegend(gradingSystem: GradingSystem): string {
  return gradingSystem === 'international'
    ? 'เกณฑ์สากล: A(90+) B(80-89) C(70-79) D(60-69) F(<60)'
    : 'เกณฑ์ไทย: 4(80+) 3.5(75-79) 3(70-74) 2.5(65-69) 2(60-64) 1.5(55-59) 1(50-54) 0(<50)';
}

export function getSchoolSettingsUpdate(updates: Partial<School>) {
  return {
    ...(updates.academicYear !== undefined ? { academic_year: updates.academicYear } : {}),
    ...(updates.currentSemester !== undefined ? { current_semester: updates.currentSemester } : {}),
    ...(updates.semesterOptions !== undefined ? { semester_options: updates.semesterOptions } : {}),
    ...(updates.gradingSystem !== undefined ? { grading_system: updates.gradingSystem } : {}),
    ...(updates.staffPositionOptions !== undefined ? { staff_position_options: updates.staffPositionOptions } : {}),
    ...(updates.logoUrl !== undefined ? { logo_url: updates.logoUrl || null } : {}),
  };
}
