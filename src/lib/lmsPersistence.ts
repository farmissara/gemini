import type { Lesson, LessonMaterial } from '../types';
import { getSupabaseClient } from './supabase';

function parseMaterials(value: unknown): LessonMaterial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): LessonMaterial[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const type = row.type;
    if (
      typeof row.name !== 'string' ||
      typeof row.url !== 'string' ||
      (type !== 'pdf' && type !== 'doc' && type !== 'video' && type !== 'link')
    ) return [];
    return [{ name: row.name, type, url: row.url }];
  });
}

export async function loadSchoolLessons(schoolId: string): Promise<Lesson[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const [lessonResult, completionResult] = await Promise.all([
    client
      .from('school_lms_lessons')
      .select('*')
      .eq('school_id', schoolId)
      .order('course_id')
      .order('chapter_number'),
    client
      .from('school_lesson_completions')
      .select('lesson_id, student_id')
      .eq('school_id', schoolId),
  ]);
  if (lessonResult.error) throw new Error(`Could not load LMS lessons: ${lessonResult.error.message}`);
  if (completionResult.error) throw new Error(`Could not load lesson progress: ${completionResult.error.message}`);

  const completedByLesson = new Map<string, Set<string>>();
  (completionResult.data || []).forEach((row) => {
    const completed = completedByLesson.get(row.lesson_id) || new Set<string>();
    completed.add(row.student_id);
    completedByLesson.set(row.lesson_id, completed);
  });

  return (lessonResult.data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    courseId: row.course_id,
    chapterNumber: Number(row.chapter_number),
    titleTh: row.title_th,
    titleEn: row.title_en || '',
    durationMinutes: Number(row.duration_minutes),
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    content: row.content || '',
    materials: parseMaterials(row.materials),
    completedByStudentIds: [...(completedByLesson.get(row.id) || [])],
  }));
}

export async function saveSchoolLessonToDb(
  schoolId: string,
  lesson: Lesson,
  createdBy: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot save lesson: Supabase is not configured.');

  const { error } = await client.from('school_lms_lessons').upsert({
    id: lesson.id,
    school_id: schoolId,
    course_id: lesson.courseId,
    chapter_number: lesson.chapterNumber,
    title_th: lesson.titleTh,
    title_en: lesson.titleEn,
    duration_minutes: lesson.durationMinutes,
    video_url: lesson.videoUrl || null,
    content: lesson.content,
    materials: lesson.materials || [],
    created_by: createdBy,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id,school_id' });
  if (error) throw new Error(`Could not save LMS lesson: ${error.message}`);
}

export async function saveSchoolLessonCompletionToDb(
  schoolId: string,
  lessonId: string,
  studentId: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cannot save lesson progress: Supabase is not configured.');

  const { error } = await client.from('school_lesson_completions').upsert({
    school_id: schoolId,
    lesson_id: lessonId,
    student_id: studentId,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'school_id,lesson_id,student_id' });
  if (error) throw new Error(`Could not save lesson progress: ${error.message}`);
}
