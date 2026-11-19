import { getSupabaseClient } from './supabase';
import type {
  LearningIndicator,
  LearningIndicatorScore,
  LearningIndicatorSet,
} from '../types';

const LOCAL_PREFIX = 'eduverse_learning_indicators_v1_';

function localKey(schoolId: string, courseId: string): string {
  return `${LOCAL_PREFIX}${schoolId}_${courseId}`;
}

export function readLocalIndicatorSets(schoolId: string, courseId: string): LearningIndicatorSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(localKey(schoolId, courseId));
    return raw ? JSON.parse(raw) as LearningIndicatorSet[] : [];
  } catch {
    return [];
  }
}

export function writeLocalIndicatorSets(schoolId: string, courseId: string, sets: LearningIndicatorSet[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localKey(schoolId, courseId), JSON.stringify(sets));
  } catch {
    // Browser storage can be unavailable or full.
  }
}

function missingIndicatorTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; message?: string };
  return value.code === '42P01' || value.code === 'PGRST205' ||
    /learning_indicator|does not exist|schema cache/i.test(value.message || '');
}

export async function loadLearningIndicatorSets(params: {
  schoolId: string;
  courseId: string;
  academicYear: string;
  semester: string;
}): Promise<LearningIndicatorSet[]> {
  const local = readLocalIndicatorSets(params.schoolId, params.courseId);
  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data: setRows, error: setError } = await client
      .from('learning_indicator_sets')
      .select('*')
      .eq('school_id', params.schoolId)
      .eq('course_id', params.courseId)
      .eq('academic_year', params.academicYear)
      .eq('semester', params.semester)
      .order('created_at', { ascending: true });

    if (setError) {
      if (!missingIndicatorTable(setError)) console.warn('[Indicators] Load sets failed:', setError.message);
      return local;
    }

    const setIds = (setRows || []).map((row) => row.id as string);
    if (setIds.length === 0) return local;

    const { data: indicatorRows, error: indicatorError } = await client
      .from('learning_indicators')
      .select('*')
      .in('set_id', setIds)
      .order('sort_order', { ascending: true });
    if (indicatorError) throw indicatorError;

    const sets: LearningIndicatorSet[] = (setRows || []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      courseId: row.course_id,
      title: row.title,
      standardCode: row.standard_code || undefined,
      subjectArea: row.subject_area || undefined,
      gradeLevel: row.grade_level || undefined,
      unitTitle: row.unit_title || undefined,
      isTemplate: row.is_template === true,
      source: row.source === 'moe' || row.source === 'school' ? row.source : 'manual',
      academicYear: row.academic_year,
      semester: row.semester,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      indicators: (indicatorRows || [])
        .filter((indicator) => indicator.set_id === row.id)
        .map((indicator) => ({
          id: indicator.id,
          schoolId: indicator.school_id,
          courseId: indicator.course_id,
          setId: indicator.set_id,
          code: indicator.code,
          title: indicator.title,
          description: indicator.description || undefined,
          maxScore: Number(indicator.max_score),
          sortOrder: Number(indicator.sort_order),
          academicYear: indicator.academic_year,
          semester: indicator.semester,
        })),
    }));

    writeLocalIndicatorSets(params.schoolId, params.courseId, sets);
    return sets;
  } catch (error) {
    console.warn('[Indicators] Supabase unavailable, using local data:', error);
    return local;
  }
}

export async function saveLearningIndicatorSet(set: LearningIndicatorSet): Promise<void> {
  writeLocalIndicatorSets(set.schoolId, set.courseId, [
    ...readLocalIndicatorSets(set.schoolId, set.courseId).filter((item) => item.id !== set.id),
    set,
  ]);

  const client = getSupabaseClient();
  if (!client) return;
  const { error: setError } = await client.from('learning_indicator_sets').upsert({
    id: set.id,
    school_id: set.schoolId,
    course_id: set.courseId,
    title: set.title,
    standard_code: set.standardCode || null,
    academic_year: set.academicYear,
    semester: set.semester,
    created_at: set.createdAt,
    updated_at: set.updatedAt,
    subject_area: set.subjectArea || null,
    grade_level: set.gradeLevel || null,
    unit_title: set.unitTitle || null,
    is_template: set.isTemplate || false,
    source: set.source || 'manual',
  });
  if (setError) throw setError;

  if (set.indicators.length > 0) {
    const rows = set.indicators.map((indicator) => ({
      id: indicator.id,
      school_id: indicator.schoolId,
      course_id: indicator.courseId,
      set_id: indicator.setId,
      code: indicator.code,
      title: indicator.title,
      description: indicator.description || null,
      max_score: indicator.maxScore,
      sort_order: indicator.sortOrder,
      academic_year: indicator.academicYear,
      semester: indicator.semester,
    }));
    const { error } = await client.from('learning_indicators').upsert(rows);
    if (error) throw error;
  }
}

export async function loadLearningIndicatorScores(params: {
  schoolId: string;
  setId: string;
}): Promise<LearningIndicatorScore[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('student_learning_indicator_scores')
    .select('*')
    .eq('school_id', params.schoolId)
    .eq('set_id', params.setId);
  if (error) {
    if (!missingIndicatorTable(error)) console.warn('[Indicators] Load scores failed:', error.message);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    setId: row.set_id,
    indicatorId: row.indicator_id,
    studentId: row.student_id,
    score: Number(row.score),
    result: row.result,
    evidence: row.evidence || undefined,
    assessedBy: row.assessed_by || undefined,
    assessedAt: row.assessed_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveLearningIndicatorScores(scores: LearningIndicatorScore[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const rows = scores.map((score) => ({
    id: score.id,
    school_id: score.schoolId,
    set_id: score.setId,
    indicator_id: score.indicatorId,
    student_id: score.studentId,
    score: score.score,
    result: score.result,
    evidence: score.evidence || null,
    assessed_by: score.assessedBy || null,
    assessed_at: score.assessedAt,
    updated_at: score.updatedAt,
  }));
  const { error } = await client
    .from('student_learning_indicator_scores')
    .upsert(rows, { onConflict: 'school_id,set_id,indicator_id,student_id' });
  if (error) throw error;
}
