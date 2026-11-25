import type { Assignment, HomeworkSubmission, TimetableSlot } from '../../types';
import { serializeSlotTeacherForDb } from '../../lib/timetableTeachers';
import { getSupabaseClient, isMissingTableError } from './client';

export async function saveSchoolAssignmentToDb(
  schoolId: string,
  assignment: Assignment,
  createdBy?: string,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot save assignment: Supabase is not configured.');

  const { error } = await client.from('school_assignments').upsert({
    id: assignment.id,
    school_id: schoolId,
    course_id: assignment.courseId,
    course_code: assignment.courseCode || '',
    title_th: assignment.titleTh,
    title_en: assignment.titleEn,
    description: assignment.description || '',
    due_date: assignment.dueDate,
    points: assignment.maxScore ?? assignment.points,
    status: assignment.status,
    created_by: createdBy || null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    const detail = isMissingTableError(error)
      ? 'Run the teacher homework workflow migration before creating assignments.'
      : error.message;
    throw new Error(`Could not save assignment: ${detail}`);
  }
}

export async function saveHomeworkSubmissionToDb(
  schoolId: string,
  submission: HomeworkSubmission,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot submit homework: Supabase is not configured.');

  const { error } = await client.from('homework_submissions').insert({
    id: submission.id,
    school_id: schoolId,
    assignment_id: submission.assignmentId,
    student_id: submission.studentId,
    assignment_title: submission.assignmentTitle,
    course_code: submission.courseCode,
    course_title_th: submission.courseTitleTh,
    student_name: submission.studentName,
    student_room: submission.studentRoom,
    due_date: submission.dueDate,
    submitted_at: submission.submittedAt || new Date().toISOString(),
    status: submission.status,
    file_attachment: submission.fileAttachment || null,
    text_submission: submission.textSubmission || null,
    score: submission.score ?? null,
    max_score: submission.maxScore,
    teacher_feedback: submission.teacherFeedback || null,
    graded_at: submission.gradedAt || null,
    graded_by: submission.gradedBy || null,
  });
  if (error) {
    const detail = isMissingTableError(error)
      ? 'Run the teacher homework workflow migration before submitting homework.'
      : error.message;
    throw new Error(`Could not save homework submission: ${detail}`);
  }
}

export async function saveHomeworkGradeToDb(
  schoolId: string,
  submissionId: string,
  score: number,
  feedback: string,
  gradedBy: string,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot save grade: Supabase is not configured.');

  const { data, error } = await client
    .from('homework_submissions')
    .update({
      score,
      teacher_feedback: feedback,
      status: 'graded',
      graded_at: new Date().toISOString(),
      graded_by: gradedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('school_id', schoolId)
    .eq('id', submissionId)
    .select('id')
    .maybeSingle();
  if (error) {
    const detail = isMissingTableError(error)
      ? 'Run the teacher homework workflow migration before grading submissions.'
      : error.message;
    throw new Error(`Could not save homework grade: ${detail}`);
  }
  if (!data) throw new Error('Could not save homework grade: submission not found or access denied.');
}

export async function deleteCoursesFromDb(schoolId: string, courseIds: string[]): Promise<void> {
  if (courseIds.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error: gradeErr } = await client
    .from('grades')
    .delete()
    .eq('school_id', schoolId)
    .in('course_id', courseIds);
  if (gradeErr && !isMissingTableError(gradeErr)) {
    throw new Error(`Could not clean up course grades: ${gradeErr.message}`);
  }

  const { error: slotErr } = await client
    .from('timetable_slots')
    .update({ course_id: null })
    .eq('school_id', schoolId)
    .in('course_id', courseIds);
  if (slotErr && !isMissingTableError(slotErr)) {
    console.warn('Could not clear course_id on timetable_slots:', slotErr.message);
  }

  const { error } = await client
    .from('courses')
    .delete()
    .eq('school_id', schoolId)
    .in('id', courseIds);
  if (error) throw new Error(`Could not delete course records: ${error.message}`);
}

export async function deleteStaleGradesFromDb(schoolId: string, gradeIds: string[]): Promise<void> {
  if (gradeIds.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('grades')
    .delete()
    .eq('school_id', schoolId)
    .in('id', gradeIds);
  if (error) throw new Error(`Could not delete stale grade records: ${error.message}`);
}

export async function updateCourseEnrollmentInDb(
  schoolId: string,
  courseId: string,
  enrolledStudentIds: string[],
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('courses')
    .update({ enrolled_student_ids: enrolledStudentIds })
    .eq('school_id', schoolId)
    .eq('id', courseId);
  if (error) throw new Error(`Could not update course enrollment in Supabase: ${error.message}`);
}

export async function deleteGradesForEnrollmentFromDb(
  schoolId: string,
  courseId: string,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('grades')
    .delete()
    .eq('school_id', schoolId)
    .eq('course_id', courseId)
    .in('student_id', studentIds);
  if (error && !isMissingTableError(error)) {
    throw new Error(`Could not remove enrollment grade records: ${error.message}`);
  }
}

export async function saveTimetableSlotsToDb(schoolId: string, slots: TimetableSlot[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const rows = slots.map((s) => ({
    id: s.id,
    school_id: schoolId,
    academic_year: s.academicYear || null,
    semester: s.semester || null,
    day_of_week: s.dayOfWeek,
    period_number: s.periodNumber,
    start_time: s.startTime,
    end_time: s.endTime,
    course_id: s.courseId || null,
    course_code: s.courseCode,
    course_title_th: s.courseTitleTh,
    course_title_en: s.courseTitleEn,
    teacher_name: serializeSlotTeacherForDb(s.teacherName, s.coTeacherName),
    room: s.room,
    classroom: s.classRoom,
    color_tag: s.colorTag || 'sky',
    credits: s.credits ?? 1.5,
    total_semester_hours: s.totalSemesterHours || 60,
  }));

  if (rows.length > 0) {
    const UPSERT_BATCH_SIZE = 500;
    for (let offset = 0; offset < rows.length; offset += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + UPSERT_BATCH_SIZE);
      const { error } = await client.from('timetable_slots').upsert(batch);
      if (error) throw new Error(`Could not save timetable slots to Supabase: ${error.message}`);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`eduverse_timetable_slots_${schoolId}`, JSON.stringify(slots));
    } catch (err) {
      console.warn('Could not cache timetable slots locally:', err);
    }
  }
}

export async function deleteTimetableSlotFromDb(schoolId: string, slotId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { error } = await client
    .from('timetable_slots')
    .delete()
    .eq('school_id', schoolId)
    .eq('id', slotId);
  if (error) throw new Error(`Could not delete timetable slot from Supabase: ${error.message}`);
}
