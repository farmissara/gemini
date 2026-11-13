import { ConsentForm, ConsentResponse, RiskInterventionRecord } from '../types';

const INTERVENTION_PREFIX = 'eduverse_interventions_v1_';
const CONSENT_FORMS_PREFIX = 'eduverse_consent_forms_v1_';
const CONSENT_RESPONSES_PREFIX = 'eduverse_consent_responses_v1_';

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

// Risk Interventions (Persistent per school)
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
  return newItem;
};

export const updateSchoolInterventionStatus = (
  schoolId: string,
  interventionId: string,
  status: RiskInterventionRecord['status']
): RiskInterventionRecord[] => {
  const updated = getSchoolInterventions(schoolId).map((item) =>
    item.id === interventionId ? { ...item, status } : item
  );
  safeWrite(`${INTERVENTION_PREFIX}${schoolId}`, updated);
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
  return updated;
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
};

