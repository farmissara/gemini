import { ConsentForm, ConsentResponse, RiskInterventionRecord } from '../types';
import { getSupabaseClient } from './supabase';

const isMissingTableError = (error: { code?: string; message?: string } | null | undefined): boolean => {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('could not find the table');
};

const INTERVENTION_PREFIX = 'eduverse_interventions_v1_';
const CONSENT_FORMS_PREFIX = 'eduverse_consent_forms_v1_';
const CONSENT_RESPONSES_PREFIX = 'eduverse_consent_responses_v1_';
const LAB_COMPLETION_PREFIX = 'eduverse_completed_lab_quests_v1_';
const STUDY_STREAK_PREFIX = 'baanpakkru_study_streak_pass_v1_';

export const CAMPUS_DATA_UPDATED_EVENT = 'baanpakkru:campus-data-updated';

const emitCampusDataUpdated = (schoolId: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CAMPUS_DATA_UPDATED_EVENT, { detail: { schoolId } }));
};

const safeRead = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

async function upsertCampusRecordToSupabase(params: {
  schoolId: string;
  recordKind: 'consent_form' | 'consent_response' | 'risk_intervention' | 'lab_completion' | 'study_streak_pass';
  recordId: string;
  studentId?: string | null;
  payload: unknown;
}): Promise<void> {
  if (!params.schoolId || params.schoolId === 'default-school') return;
  const client = getSupabaseClient();
  if (!client) return;
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  const { error } = await client.from('school_campus_records').upsert(
    {
      school_id: params.schoolId,
      record_kind: params.recordKind,
      record_id: params.recordId,
      student_id: params.studentId || null,
      owner_user_id: userId,
      payload: params.payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id,record_kind,record_id' }
  );
  if (error && !isMissingTableError(error)) {
    console.warn(`[CampusStore] Could not sync ${params.recordKind} to Supabase:`, error.message);
  }
}

async function deleteStudentCampusRecordsFromSupabase(schoolId: string, studentId: string): Promise<void> {
  if (!schoolId || schoolId === 'default-school' || !studentId) return;
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('school_campus_records')
    .delete()
    .eq('school_id', schoolId)
    .eq('student_id', studentId);
  if (error && !isMissingTableError(error)) {
    console.warn('[CampusStore] Could not cleanup student campus records from Supabase:', error.message);
  }
}

export async function hydrateCampusDataFromSupabase(schoolId: string): Promise<void> {
  if (!schoolId || schoolId === 'default-school') return;
  const client = getSupabaseClient();
  if (!client) return;

  const { data, error } = await client
    .from('school_campus_records')
    .select('record_kind, record_id, payload')
    .eq('school_id', schoolId);

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[CampusStore] Failed to hydrate campus records:', error.message);
    }
    return;
  }
  if (!data || data.length === 0) return;

  const interventions: RiskInterventionRecord[] = [];
  const consentForms: ConsentForm[] = [];
  const consentResponses: ConsentResponse[] = [];
  const labCompletedIds: string[] = [];

  for (const row of data) {
    const payload = row.payload as Record<string, unknown> | null;
    if (!payload) continue;
    if (row.record_kind === 'risk_intervention') {
      interventions.push(payload as unknown as RiskInterventionRecord);
    } else if (row.record_kind === 'consent_form') {
      consentForms.push(payload as unknown as ConsentForm);
    } else if (row.record_kind === 'consent_response') {
      consentResponses.push(payload as unknown as ConsentResponse);
    } else if (row.record_kind === 'lab_completion' && Array.isArray(payload.completedQuestIds)) {
      for (const qId of payload.completedQuestIds) {
        if (typeof qId === 'string') labCompletedIds.push(qId);
      }
    } else if (row.record_kind === 'study_streak_pass' && typeof row.record_id === 'string') {
      safeWrite(`${STUDY_STREAK_PREFIX}${schoolId}_${row.record_id}`, payload);
    }
  }

  if (interventions.length > 0) {
    safeWrite(`${INTERVENTION_PREFIX}${schoolId}`, interventions);
  }
  if (consentForms.length > 0) {
    safeWrite(`${CONSENT_FORMS_PREFIX}${schoolId}`, consentForms);
  }
  if (consentResponses.length > 0) {
    safeWrite(`${CONSENT_RESPONSES_PREFIX}${schoolId}`, consentResponses);
  }
  if (labCompletedIds.length > 0) {
    const existing = safeRead<string[]>(`${LAB_COMPLETION_PREFIX}${schoolId}`, []);
    safeWrite(`${LAB_COMPLETION_PREFIX}${schoolId}`, Array.from(new Set([...existing, ...labCompletedIds])));
  }
  emitCampusDataUpdated(schoolId);
}

// Risk Interventions (Persistent per school: local cache + Supabase sync)
export const getSchoolInterventions = (schoolId: string): RiskInterventionRecord[] => {
  return safeRead<RiskInterventionRecord[]>(`${INTERVENTION_PREFIX}${schoolId}`, []);
};

export const addSchoolIntervention = (
  schoolId: string,
  record: Omit<RiskInterventionRecord, 'id' | 'schoolId' | 'createdAt'>
): RiskInterventionRecord => {
  const newItem: RiskInterventionRecord = {
    ...record,
    id: `intv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId,
    createdAt: new Date().toISOString(),
  };
  const existing = getSchoolInterventions(schoolId);
  safeWrite(`${INTERVENTION_PREFIX}${schoolId}`, [newItem, ...existing]);
  void upsertCampusRecordToSupabase({
    schoolId,
    recordKind: 'risk_intervention',
    recordId: newItem.id,
    studentId: newItem.studentId,
    payload: newItem,
  });
  return newItem;
};

export const updateSchoolInterventionStatus = (
  schoolId: string,
  interventionId: string,
  status: RiskInterventionRecord['status']
): RiskInterventionRecord[] => {
  const existing = getSchoolInterventions(schoolId);
  const target = existing.find((item) => item.id === interventionId);
  const updatedItem: RiskInterventionRecord | null = target ? { ...target, status } : null;
  const updated = existing.map((item) => (item.id === interventionId && updatedItem ? updatedItem : item));
  safeWrite(`${INTERVENTION_PREFIX}${schoolId}`, updated);
  if (updatedItem) {
    void upsertCampusRecordToSupabase({
      schoolId,
      recordKind: 'risk_intervention',
      recordId: updatedItem.id,
      studentId: updatedItem.studentId,
      payload: updatedItem,
    });
  }
  return updated;
};

// Digital Permission Slips (Consent Forms & Parent Responses)
export const getConsentForms = (schoolId: string): ConsentForm[] => {
  const existing = safeRead<ConsentForm[]>(`${CONSENT_FORMS_PREFIX}${schoolId}`, []);
  if (existing.length > 0) return existing;
  const seed: ConsentForm[] = [
    {
      id: `consent-${schoolId}-1`,
      schoolId,
      titleTh: 'หนังสือขออนุญาตทัศนศึกษาแหล่งเรียนรู้วิทยาศาสตร์',
      descriptionTh:
        'ขอความอนุเคราะห์ผู้ปกครองพิจารณาอนุญาตให้นักเรียนเข้าร่วมกิจกรรมทัศนศึกษา ณ ศูนย์วิทยาศาสตร์เพื่อการศึกษา เวลา 08:30 - 15:30 น. โดยมีรถบัสปรับอากาศของโรงเรียนและครูที่ปรึกษาดูแลตลอดกิจกรรม',
      eventDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      targetRoom: 'all',
      createdBy: 'ฝ่ายกิจการนักเรียน',
      createdAt: new Date().toISOString(),
    },
  ];
  safeWrite(`${CONSENT_FORMS_PREFIX}${schoolId}`, seed);
  return seed;
};

export const addConsentForm = (
  schoolId: string,
  form: Omit<ConsentForm, 'id' | 'schoolId' | 'createdAt'>
): ConsentForm[] => {
  const newForm: ConsentForm = {
    ...form,
    id: `consent-${Date.now()}`,
    schoolId,
    createdAt: new Date().toISOString(),
  };
  const updated = [newForm, ...getConsentForms(schoolId)];
  safeWrite(`${CONSENT_FORMS_PREFIX}${schoolId}`, updated);
  void upsertCampusRecordToSupabase({
    schoolId,
    recordKind: 'consent_form',
    recordId: newForm.id,
    payload: newForm,
  });
  return updated;
};

export const getConsentResponses = (schoolId: string): ConsentResponse[] => {
  return safeRead<ConsentResponse[]>(`${CONSENT_RESPONSES_PREFIX}${schoolId}`, []);
};

export const upsertConsentResponse = (
  schoolId: string,
  response: Omit<ConsentResponse, 'id' | 'schoolId' | 'respondedAt'>
): ConsentResponse[] => {
  const existing = getConsentResponses(schoolId).filter(
    (r) => !(r.formId === response.formId && r.studentId === response.studentId)
  );
  const newResp: ConsentResponse = {
    ...response,
    id: `cresp-${Date.now()}`,
    schoolId,
    respondedAt: new Date().toISOString(),
  };
  const updated = [newResp, ...existing];
  safeWrite(`${CONSENT_RESPONSES_PREFIX}${schoolId}`, updated);
  void upsertCampusRecordToSupabase({
    schoolId,
    recordKind: 'consent_response',
    recordId: `${newResp.formId}_${newResp.studentId}`,
    studentId: newResp.studentId,
    payload: newResp,
  });
  return updated;
};

// Lab Quest Completions (synced across devices)
export const loadCompletedLabQuests = (schoolId: string, userId?: string): string[] => {
  const scopedKey = userId ? `${LAB_COMPLETION_PREFIX}${schoolId}_${userId}` : `${LAB_COMPLETION_PREFIX}${schoolId}`;
  const legacy = safeRead<string[]>('eduverse_completed_lab_quests', []);
  const scoped = safeRead<string[]>(scopedKey, []);
  return Array.from(new Set([...scoped, ...legacy]));
};

export const saveCompletedLabQuests = (
  schoolId: string,
  userId: string | undefined,
  completedQuestIds: string[],
  studentId?: string
): void => {
  const scopedKey = userId ? `${LAB_COMPLETION_PREFIX}${schoolId}_${userId}` : `${LAB_COMPLETION_PREFIX}${schoolId}`;
  const deduped = Array.from(new Set(completedQuestIds));
  safeWrite(scopedKey, deduped);
  if (userId) {
    void upsertCampusRecordToSupabase({
      schoolId,
      recordKind: 'lab_completion',
      recordId: userId,
      studentId: studentId || null,
      payload: { completedQuestIds: deduped, updatedAt: new Date().toISOString() },
    });
  }
};

// Study Streak Quest Pass State (synced per user & school)
export interface StudyStreakPassPersistence {
  streakCount: number;
  lastQuestDate: string;
  bonusTokens: number;
  bonusXp: number;
  claimedTierLevels: number[];
  redeemedPerkCounts: Record<string, number>;
}

export const loadStudyStreakPassState = (
  schoolId: string,
  userId: string
): StudyStreakPassPersistence | null => {
  if (!schoolId || !userId) return null;
  return safeRead<StudyStreakPassPersistence | null>(`${STUDY_STREAK_PREFIX}${schoolId}_${userId}`, null);
};

export const saveStudyStreakPassState = (
  schoolId: string,
  userId: string,
  state: StudyStreakPassPersistence,
  studentId?: string
): void => {
  if (!schoolId || !userId) return;
  safeWrite(`${STUDY_STREAK_PREFIX}${schoolId}_${userId}`, state);
  void upsertCampusRecordToSupabase({
    schoolId,
    recordKind: 'study_streak_pass',
    recordId: userId,
    studentId: studentId || null,
    payload: state,
  });
};

export const cleanupStudentCampusData = (schoolId: string, studentId: string): void => {
  const nextInterventions = getSchoolInterventions(schoolId).filter(
    (item) => item.studentId !== studentId
  );
  safeWrite(`${INTERVENTION_PREFIX}${schoolId}`, nextInterventions);

  const nextResponses = getConsentResponses(schoolId).filter(
    (item) => item.studentId !== studentId
  );
  safeWrite(`${CONSENT_RESPONSES_PREFIX}${schoolId}`, nextResponses);

  void deleteStudentCampusRecordsFromSupabase(schoolId, studentId);
};
