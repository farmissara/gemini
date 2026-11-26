import type {
  Announcement,
  AttendanceRecord,
  Course,
  GradeRecord,
  School,
  Student,
  Teacher,
  UserRole,
} from '../../types';
import { getCourseType, inferCourseLearningArea } from '../../lib/courseClassification';
import { getSupabaseClient, isMissingTableError } from './client';
import { mapTeacherToDb } from './mappers';

export async function syncDataToSupabase(payload: {
  school: School;
  role: UserRole;
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  changedIds?: {
    students?: string[];
    teachers?: string[];
    courses?: string[];
    grades?: string[];
    attendance?: string[];
    announcements?: string[];
  };
}): Promise<{ success: boolean; message: string; warnings?: string[] }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      message: `บันทึกข้อมูลในเซสชันเบราว์เซอร์สำเร็จ (${payload.students.length} นักเรียน, ${payload.teachers?.length || 0} ครู, ${payload.courses.length} รายวิชา)`,
    };
  }

  const warnings: string[] = [];
  let syncedTeachersCount = 0;
  const changedIdSets = payload.changedIds
    ? {
        students: new Set(payload.changedIds.students || []),
        teachers: new Set(payload.changedIds.teachers || []),
        courses: new Set(payload.changedIds.courses || []),
        grades: new Set(payload.changedIds.grades || []),
        attendance: new Set(payload.changedIds.attendance || []),
        announcements: new Set(payload.changedIds.announcements || []),
      }
    : null;
  const shouldSyncRow = (table: keyof NonNullable<typeof changedIdSets>, id: string) =>
    !changedIdSets || changedIdSets[table].has(id);

  try {
    if (['super_admin', 'admin'].includes(payload.role) && payload.students.length > 0) {
      const studentRows = payload.students
        .map((s) => ({
          id: s.id,
          school_id: payload.school.id,
          student_id_number: s.studentIdNumber,
          national_id: s.nationalId || null,
          first_name_en: s.firstNameEn,
          last_name_en: s.lastNameEn,
          first_name_th: s.firstNameTh,
          last_name_th: s.lastNameTh,
          gender: s.gender,
          date_of_birth: s.dateOfBirth,
          grade_level: s.gradeLevel,
          room: s.room,
          status: s.status,
          avatar_url: s.avatarUrl,
          gpa: s.gpa,
          guardian_name: s.guardianName,
          guardian_relation: s.guardianRelation,
          guardian_phone: s.guardianPhone,
          guardian_email: s.guardianEmail,
          enrolled_date: s.enrolledDate,
        }))
        .filter((row) => shouldSyncRow('students', row.id));
      if (studentRows.length > 0) {
        const { error: stuErr } = await client.from('students').upsert(studentRows);
        if (stuErr) throw new Error(`Students sync error: ${stuErr.message}`);
      }
    }

    if (['super_admin', 'admin'].includes(payload.role) && payload.teachers && payload.teachers.length > 0) {
      const teacherRows = payload.teachers
        .map((teacher) => mapTeacherToDb(teacher, payload.school.id))
        .filter((row) => shouldSyncRow('teachers', row.id));
      const { error: tErr } =
        teacherRows.length > 0 ? await client.from('teachers').upsert(teacherRows) : { error: null };
      if (tErr) {
        if (isMissingTableError(tErr)) {
          warnings.push(
            'ตาราง teachers ยังไม่มีใน Supabase จึงยังไม่ได้บันทึกข้อมูลครู กรุณารัน SQL Migration เพิ่มตาราง teachers',
          );
        } else {
          throw new Error(`Teachers sync error: ${tErr.message}`);
        }
      } else {
        syncedTeachersCount = teacherRows.length;
      }
    }

    if (payload.courses.length > 0) {
      const courseRows = payload.courses
        .map((c) => ({
          id: c.id,
          school_id: payload.school.id,
          code: c.code,
          title_en: c.titleEn,
          title_th: c.titleTh,
          category: c.category,
          course_type: getCourseType(c) || null,
          learning_area: inferCourseLearningArea(c) || null,
          credits: c.credits,
          weekly_hours: c.weeklyHours ?? null,
          total_hours: c.totalHours ?? null,
          min_attendance_hours: c.minAttendanceHours ?? null,
          teacher_name: c.teacherName,
          teacher_email: c.teacherEmail,
          department: c.department,
          schedule: c.schedule,
          room: c.room,
          academic_year: c.academicYear,
          semester: c.semester,
          enrolled_student_ids: c.enrolledStudentIds,
          description: c.description,
          cover_image: c.coverImage || null,
        }))
        .filter((row) => shouldSyncRow('courses', row.id));
      if (courseRows.length > 0) {
        const { error: courseErr } = await client.from('courses').upsert(courseRows);
        if (courseErr) throw new Error(`Courses sync error: ${courseErr.message}`);
      }
    }

    if (payload.grades.length > 0) {
      const studentIds = new Set(payload.students.map((student) => student.id));
      const studentIdsByNumber = new Map<string, string>();
      const ambiguousStudentNumbers = new Set<string>();
      payload.students.forEach((student) => {
        const studentNumber = student.studentIdNumber.trim().toLowerCase();
        if (!studentNumber || ambiguousStudentNumbers.has(studentNumber)) return;
        const existingId = studentIdsByNumber.get(studentNumber);
        if (existingId && existingId !== student.id) {
          studentIdsByNumber.delete(studentNumber);
          ambiguousStudentNumbers.add(studentNumber);
        } else {
          studentIdsByNumber.set(studentNumber, student.id);
        }
      });

      const resolvedStudentIds: (string | undefined)[] = [];
      const unresolvedStudentIds = new Set<string>();
      payload.grades.forEach((grade) => {
        const gradeStudentId = grade.studentId.trim();
        const studentId = studentIds.has(gradeStudentId)
          ? gradeStudentId
          : studentIdsByNumber.get(gradeStudentId.toLowerCase());
        resolvedStudentIds.push(studentId);
        if (!studentId) unresolvedStudentIds.add(gradeStudentId || '(ว่าง)');
      });
      if (unresolvedStudentIds.size > 0) {
        const examples = Array.from(unresolvedStudentIds).slice(0, 5).join(', ');
        throw new Error(
          `Grades sync error: ${unresolvedStudentIds.size} student reference(s) do not match a unique student in this school's roster: ${examples}. Verify the grade student IDs and remove stale grades for deleted students.`,
        );
      }

      const gradeRows = payload.grades
        .map((g, index) => {
          const studentId = resolvedStudentIds[index];
          if (!studentId) throw new Error(`Missing student ID for grade ${g.id}`);
          return {
            id: g.id,
            school_id: payload.school.id,
            student_id: studentId,
            course_id: g.courseId,
            academic_year: g.academicYear,
            semester: g.semester,
            midterm_score: g.midtermScore,
            final_score: g.finalScore,
            assignment_score: g.assignmentScore,
            quiz_score: g.quizScore,
            total_score: g.totalScore,
            letter_grade: g.letterGrade,
            grade_point: g.gradePoint,
          };
        })
        .filter((row) => shouldSyncRow('grades', row.id));
      if (gradeRows.length > 0) {
        const { error: gradeErr } = await client.from('grades').upsert(gradeRows);
        if (gradeErr) throw new Error(`Grades sync error: ${gradeErr.message}`);
      }
    }

    if (payload.attendance.length > 0) {
      const attRows = payload.attendance
        .map((a) => ({
          id: a.id,
          school_id: payload.school.id,
          student_id: a.studentId,
          date: a.date,
          time: a.time,
          status: a.status,
          checkin_method: a.checkinMethod,
          remarks: a.remarks || null,
          record_type: a.recordType || 'check_in',
          user_name: a.userName || null,
          photo_url: a.photoStoragePath || null,
        }))
        .filter((row) => shouldSyncRow('attendance', row.id));
      if (attRows.length > 0) {
        let { error: attErr } = await client.from('attendance').upsert(attRows);
        if (
          attErr &&
          (attErr.code === 'PGRST204' ||
            attErr.code === '42703' ||
            /photo_url|record_type|user_name|schema cache|could not find the '.*' column/i.test(attErr.message))
        ) {
          console.warn('[Attendance] Retrying attendance upsert with base columns:', attErr.message);
          const baseRows = payload.attendance
            .map((a) => ({
              id: a.id,
              school_id: payload.school.id,
              student_id: a.studentId,
              date: a.date,
              time: a.time,
              status: a.status,
              checkin_method: a.checkinMethod,
              remarks: a.remarks || null,
            }))
            .filter((row) => shouldSyncRow('attendance', row.id));
          const retryResult = await client.from('attendance').upsert(baseRows);
          if (retryResult.error) {
            throw new Error(`Attendance sync error: ${retryResult.error.message}`);
          } else {
            warnings.push(
              'ตาราง attendance ขาดคอลัมน์ photo_url ใน Supabase จึงบันทึกข้อมูลแบบมาตรฐานเรียบร้อยแล้ว (แนะนำให้รัน SQL Migration เพิ่มคอลัมน์ photo_url)',
            );
            attErr = null;
          }
        } else if (attErr) {
          throw new Error(`Attendance sync error: ${attErr.message}`);
        }
      }
    }

    if (payload.announcements.length > 0) {
      const annRows = payload.announcements
        .map((an) => ({
          id: an.id,
          school_id: payload.school.id,
          title: an.title,
          content: an.content,
          category: an.category,
          target_audience: an.targetAudience,
          published_at: an.publishedAt,
          author: an.author,
          author_role: an.authorRole,
          pinned: an.pinned,
          resend_email_sent: an.resendEmailSent,
        }))
        .filter((row) => shouldSyncRow('announcements', row.id));
      if (annRows.length > 0) {
        const { error: annErr } = await client.from('announcements').upsert(annRows);
        if (annErr) throw new Error(`Announcements sync error: ${annErr.message}`);
      }
    }

    try {
      await client
        .from('schools')
        .update({
          students_count: payload.students.length,
          teachers_count: payload.teachers?.length || 0,
        })
        .eq('id', payload.school.id);
    } catch {
      // Non-fatal if schema differs
    }

    const syncedMessage = `Successfully synchronized ${payload.students.length} students, ${syncedTeachersCount} teachers, ${payload.courses.length} courses, ${payload.grades.length} grades, ${payload.attendance.length} attendance records to Supabase!`;
    return {
      success: true,
      message: syncedMessage,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}
