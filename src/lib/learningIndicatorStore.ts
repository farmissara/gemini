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

export function inferIndicatorNature(indicator: Pick<LearningIndicator, 'nature' | 'description' | 'title'>): 'formative' | 'summative' {
  if (indicator.nature === 'formative' || indicator.nature === 'summative') {
    return indicator.nature;
  }
  const text = `${indicator.description || ''} ${indicator.title || ''}`;
  if (text.includes('ปลายทาง') || text.includes('[SUMMATIVE]')) return 'summative';
  if (text.includes('ระหว่างทาง') || text.includes('[FORMATIVE]')) return 'formative';
  return 'formative';
}

export function extractPassingPercent(indicator: Pick<LearningIndicator, 'passingPercent' | 'description'>): number {
  if (typeof indicator.passingPercent === 'number' && Number.isFinite(indicator.passingPercent)) {
    return Math.max(0, Math.min(100, indicator.passingPercent));
  }
  const match = (indicator.description || '').match(/\[PASS:(\d{1,3})%\]/);
  if (match) {
    const num = Number(match[1]);
    if (Number.isFinite(num) && num >= 0 && num <= 100) return num;
  }
  return 50;
}

function encodeIndicatorDescription(indicator: LearningIndicator): string | null {
  const cleanBase = (indicator.description || '')
    .replace(/\s*\[(FORMATIVE|SUMMATIVE)\]/g, '')
    .replace(/\s*\[PASS:\d{1,3}%\]/g, '')
    .trim();
  const nature = inferIndicatorNature(indicator);
  const passPct = extractPassingPercent(indicator);
  const metaTags = [
    nature === 'summative' ? '[SUMMATIVE]' : '[FORMATIVE]',
    passPct !== 50 ? `[PASS:${passPct}%]` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const combined = [cleanBase, metaTags].filter(Boolean).join(' ').trim();
  return combined || null;
}

export function stripIndicatorMetaTags(description?: string): string {
  if (!description) return '';
  return description
    .replace(/\s*\[(FORMATIVE|SUMMATIVE)\]/g, '')
    .replace(/\s*\[PASS:\d{1,3}%\]/g, '')
    .trim();
}

export function readLocalIndicatorSets(schoolId: string, courseId: string): LearningIndicatorSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(localKey(schoolId, courseId));
    return raw ? (JSON.parse(raw) as LearningIndicatorSet[]) : [];
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
  return (
    value.code === '42P01' ||
    value.code === 'PGRST205' ||
    /learning_indicator|does not exist|schema cache/i.test(value.message || '')
  );
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

    const localBySetId = new Map(local.map((s) => [s.id, s]));

    const sets: LearningIndicatorSet[] = (setRows || []).map((row) => {
      const localSet = localBySetId.get(row.id);
      const localIndById = new Map((localSet?.indicators || []).map((i) => [i.id, i]));
      return {
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
          .map((indicator) => {
            const localInd = localIndById.get(indicator.id);
            const rawDesc = indicator.description || localInd?.description || undefined;
            const parsedNature = inferIndicatorNature({
              nature: localInd?.nature,
              description: rawDesc,
              title: indicator.title,
            });
            const parsedPass = extractPassingPercent({
              passingPercent: localInd?.passingPercent,
              description: rawDesc,
            });
            return {
              id: indicator.id,
              schoolId: indicator.school_id,
              courseId: indicator.course_id,
              setId: indicator.set_id,
              code: indicator.code,
              title: indicator.title,
              description: stripIndicatorMetaTags(rawDesc) || undefined,
              nature: parsedNature,
              passingPercent: parsedPass,
              maxScore: Number(indicator.max_score),
              sortOrder: Number(indicator.sort_order),
              academicYear: indicator.academic_year,
              semester: indicator.semester,
            };
          }),
      };
    });

    writeLocalIndicatorSets(params.schoolId, params.courseId, sets);
    return sets;
  } catch (error) {
    console.warn('[Indicators] Supabase unavailable, using local data:', error);
    return local;
  }
}

export async function saveLearningIndicatorSet(set: LearningIndicatorSet): Promise<void> {
  const normalizedSet: LearningIndicatorSet = {
    ...set,
    updatedAt: new Date().toISOString(),
    indicators: set.indicators.map((ind, idx) => ({
      ...ind,
      nature: inferIndicatorNature(ind),
      passingPercent: extractPassingPercent(ind),
      sortOrder: idx + 1,
    })),
  };

  const existingList = readLocalIndicatorSets(normalizedSet.schoolId, normalizedSet.courseId);
  const existingIdx = existingList.findIndex((item) => item.id === normalizedSet.id);
  const nextLocalList =
    existingIdx >= 0
      ? existingList.map((item) => (item.id === normalizedSet.id ? normalizedSet : item))
      : [...existingList, normalizedSet];
  writeLocalIndicatorSets(normalizedSet.schoolId, normalizedSet.courseId, nextLocalList);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error: setError } = await client.from('learning_indicator_sets').upsert({
      id: normalizedSet.id,
      school_id: normalizedSet.schoolId,
      course_id: normalizedSet.courseId,
      title: normalizedSet.title,
      standard_code: normalizedSet.standardCode || null,
      academic_year: normalizedSet.academicYear,
      semester: normalizedSet.semester,
      created_at: normalizedSet.createdAt,
      updated_at: normalizedSet.updatedAt,
      subject_area: normalizedSet.subjectArea || null,
      grade_level: normalizedSet.gradeLevel || null,
      unit_title: normalizedSet.unitTitle || null,
      is_template: normalizedSet.isTemplate || false,
      source: normalizedSet.source || 'manual',
    });
    if (setError) {
      if (!missingIndicatorTable(setError)) throw setError;
      return;
    }

    // Remove indicators that were deleted from this set
    const activeIds = normalizedSet.indicators.map((i) => i.id);
    const { data: existingIndRows } = await client
      .from('learning_indicators')
      .select('id')
      .eq('set_id', normalizedSet.id);
    const removedIds = (existingIndRows || [])
      .map((r) => String(r.id))
      .filter((id) => !activeIds.includes(id));

    if (removedIds.length > 0) {
      await client.from('student_learning_indicator_scores').delete().in('indicator_id', removedIds);
      await client.from('learning_indicators').delete().in('id', removedIds);
    }

    if (normalizedSet.indicators.length > 0) {
      const rows = normalizedSet.indicators.map((indicator) => ({
        id: indicator.id,
        school_id: indicator.schoolId,
        course_id: indicator.courseId,
        set_id: indicator.setId,
        code: indicator.code,
        title: indicator.title,
        description: encodeIndicatorDescription(indicator),
        max_score: indicator.maxScore,
        sort_order: indicator.sortOrder,
        academic_year: indicator.academicYear,
        semester: indicator.semester,
      }));
      const { error } = await client.from('learning_indicators').upsert(rows);
      if (error && !missingIndicatorTable(error)) throw error;
    }
  } catch (err) {
    if (!missingIndicatorTable(err)) throw err;
  }
}

export async function deleteLearningIndicatorSet(
  schoolId: string,
  courseId: string,
  setId: string
): Promise<void> {
  const next = readLocalIndicatorSets(schoolId, courseId).filter((s) => s.id !== setId);
  writeLocalIndicatorSets(schoolId, courseId, next);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(localScoresKey(schoolId, setId));
    } catch {
      // ignore
    }
  }

  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('student_learning_indicator_scores').delete().eq('school_id', schoolId).eq('set_id', setId);
    await client.from('learning_indicators').delete().eq('school_id', schoolId).eq('set_id', setId);
    const { error } = await client
      .from('learning_indicator_sets')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', setId);
    if (error && !missingIndicatorTable(error)) {
      console.warn('[Indicators] Delete set warning:', error.message);
    }
  } catch (err) {
    if (!missingIndicatorTable(err)) throw err;
  }
}

export async function copyIndicatorSetsToNewCourse(params: {
  schoolId: string;
  sourceCourseId: string;
  targetCourseId: string;
  targetAcademicYear: string;
  targetSemester: string;
}): Promise<LearningIndicatorSet[]> {
  const sourceSets = readLocalIndicatorSets(params.schoolId, params.sourceCourseId);
  if (sourceSets.length === 0) return [];
  const now = new Date().toISOString();

  const copiedSets: LearningIndicatorSet[] = sourceSets.map((src, sIdx) => {
    const newSetId = `set-${params.targetCourseId}-${Date.now().toString(36)}-${sIdx + 1}`;
    const newIndicators: LearningIndicator[] = src.indicators.map((ind, iIdx) => ({
      ...ind,
      id: `${newSetId}-ind-${iIdx + 1}`,
      schoolId: params.schoolId,
      courseId: params.targetCourseId,
      setId: newSetId,
      academicYear: params.targetAcademicYear,
      semester: params.targetSemester,
    }));
    return {
      ...src,
      id: newSetId,
      schoolId: params.schoolId,
      courseId: params.targetCourseId,
      academicYear: params.targetAcademicYear,
      semester: params.targetSemester,
      indicators: newIndicators,
      createdAt: now,
      updatedAt: now,
    };
  });

  for (const nextSet of copiedSets) {
    await saveLearningIndicatorSet(nextSet);
  }
  return copiedSets;
}

const LOCAL_SCORES_PREFIX = 'eduverse_learning_indicator_scores_v1_';

function localScoresKey(schoolId: string, setId: string): string {
  return `${LOCAL_SCORES_PREFIX}${schoolId}_${setId}`;
}

export function readLocalIndicatorScores(schoolId: string, setId: string): LearningIndicatorScore[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(localScoresKey(schoolId, setId));
    return raw ? (JSON.parse(raw) as LearningIndicatorScore[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalIndicatorScores(schoolId: string, setId: string, scores: LearningIndicatorScore[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localScoresKey(schoolId, setId), JSON.stringify(scores));
  } catch {
    // Browser storage can be unavailable or full.
  }
}

export async function loadLearningIndicatorScores(params: {
  schoolId: string;
  setId: string;
}): Promise<LearningIndicatorScore[]> {
  const local = readLocalIndicatorScores(params.schoolId, params.setId);
  const client = getSupabaseClient();
  if (!client) return local;
  try {
    const { data, error } = await client
      .from('student_learning_indicator_scores')
      .select('*')
      .eq('school_id', params.schoolId)
      .eq('set_id', params.setId);
    if (error) {
      if (!missingIndicatorTable(error)) console.warn('[Indicators] Load scores failed:', error.message);
      return local;
    }
    const mapped: LearningIndicatorScore[] = (data || []).map((row) => ({
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
    if (mapped.length > 0) {
      writeLocalIndicatorScores(params.schoolId, params.setId, mapped);
      return mapped;
    }
    return local;
  } catch {
    return local;
  }
}

export async function saveLearningIndicatorScores(scores: LearningIndicatorScore[]): Promise<void> {
  if (scores.length === 0) return;
  const grouped = new Map<string, LearningIndicatorScore[]>();
  scores.forEach((item) => {
    const key = `${item.schoolId}::${item.setId}`;
    grouped.set(key, [...(grouped.get(key) || []), item]);
  });
  grouped.forEach((group, key) => {
    const [schoolId, setId] = key.split('::');
    writeLocalIndicatorScores(schoolId, setId, group);
  });

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
  if (error && !missingIndicatorTable(error)) throw error;
}
