import type {
  Assignment,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  HomeworkSubmission,
  Teacher,
} from '../../types';

export type AttendanceDbRow = {
  id: string;
  school_id: string;
  student_id: string;
  user_name: string | null;
  record_type: string | null;
  date: string;
  time: string;
  status: string;
  checkin_method: string | null;
  photo_url: string | null;
  remarks: string | null;
};

export function parseAssignmentStatus(value: unknown): Assignment['status'] {
  if (value === 'active' || value === 'closed') return value;
  throw new Error('Invalid assignment status returned from Supabase.');
}

export function parseHomeworkStatus(value: unknown): HomeworkSubmission['status'] {
  if (value === 'submitted' || value === 'late' || value === 'pending' || value === 'graded') return value;
  throw new Error('Invalid homework submission status returned from Supabase.');
}

export function mapAttendanceDbRow(row: AttendanceDbRow): AttendanceRecord {
  const photoStoragePath = row.photo_url || undefined;
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    userName: row.user_name || undefined,
    recordType: (row.record_type || 'check_in') as AttendanceCheckType,
    date: row.date,
    time: row.time,
    status: row.status as AttendanceStatus,
    checkinMethod: row.checkin_method as AttendanceRecord['checkinMethod'],
    // Signed links are requested lazily by AttendancePhoto when visible.
    photoUrl: photoStoragePath,
    photoStoragePath,
    remarks: row.remarks || undefined,
  };
}

export function mapTeacherToDb(teacher: Teacher, schoolId: string) {
  return {
    id: teacher.id,
    school_id: schoolId,
    teacher_id_number: teacher.teacherIdNumber,
    full_name_th: teacher.fullNameTh,
    full_name_en: teacher.fullNameEn,
    gender: teacher.gender,
    email: teacher.email,
    phone: teacher.phone,
    avatar_url: teacher.avatarUrl,
    academic_degree: teacher.academicDegree,
    major: teacher.major,
    minor: teacher.minor || null,
    academic_standing: teacher.academicStanding,
    position_title: teacher.positionTitle || null,
    reports_to_teacher_id: teacher.reportsToTeacherId || null,
    department: teacher.department,
    teacher_license_no: teacher.teacherLicenseNo,
    teaching_subjects: teacher.teachingSubjects || [],
    homeroom_classes: teacher.homeroomClasses || [],
    teaching_grades: teacher.teachingGrades || [],
    is_school_admin: Boolean(teacher.isSchoolAdmin),
    other_skills: teacher.otherSkills || [],
    certifications: teacher.certifications || [],
    teaching_experience_years: teacher.teachingExperienceYears ?? null,
    pa_score: teacher.paScore ?? null,
    self_development_plan: teacher.selfDevelopmentPlan || null,
    pa_portfolio: teacher.paPortfolio || [],
  };
}
