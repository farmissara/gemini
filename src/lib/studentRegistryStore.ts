import { Student } from '../types';
import {
  createDefaultStudentQualitative,
  loadQualitativeAssessments,
  saveQualitativeAssessments,
  StudentQualitativeAssessment,
} from './moeQualitativeStore';
import { getStudentPrefixTh } from './moeGrading';
import { getSupabaseClient } from './supabase';

export type Pp3ApprovalStatus = 'pending' | 'verified' | 'approved' | 'not_eligible';

export interface StudentRegistryRecord {
  studentId: string;
  prefixTh: string;
  nationality: string;
  religion: string;
  birthPlace: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  pp1DocNo: string;
  pp3SetNo: string;
  pp3BookNo: string;
  pp3ApprovalStatus: Pp3ApprovalStatus;
  graduationDate: string;
  pp7DocNo: string;
  advisorName: string;
  registrarName: string;
  academicHeadName: string;
  principalName: string;
  affiliationOffice: string;
  updatedAt: string;
}

export interface SchoolRegistrySigners {
  affiliationOffice: string;
  registrarName: string;
  academicHeadName: string;
  principalName: string;
  updatedAt: string;
}

const REGISTRY_LOCAL_PREFIX = 'baanpakkru_student_registry_v1_';
const SIGNERS_LOCAL_PREFIX = 'baanpakkru_school_signers_v1_';

function registryStorageKey(schoolId: string): string {
  return `${REGISTRY_LOCAL_PREFIX}${schoolId || 'default'}`;
}

function signersStorageKey(schoolId: string): string {
  return `${SIGNERS_LOCAL_PREFIX}${schoolId || 'default'}`;
}

function isMissingRegistryTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; message?: string };
  return (
    value.code === '42P01' ||
    value.code === 'PGRST205' ||
    /student_registry_records|does not exist|schema cache/i.test(value.message || '')
  );
}

export function loadSchoolRegistrySigners(schoolId: string): SchoolRegistrySigners {
  const defaults: SchoolRegistrySigners = {
    affiliationOffice: 'สำนักงานเขตพื้นที่การศึกษา (สพฐ.)',
    registrarName: '',
    academicHeadName: '',
    principalName: '',
    updatedAt: '',
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(signersStorageKey(schoolId));
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<SchoolRegistrySigners>) };
  } catch {
    return defaults;
  }
}

export function saveSchoolRegistrySigners(schoolId: string, signers: SchoolRegistrySigners): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      signersStorageKey(schoolId),
      JSON.stringify({ ...signers, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSchoolRegistryMap(schoolId: string): Record<string, StudentRegistryRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(registryStorageKey(schoolId));
    return raw ? (JSON.parse(raw) as Record<string, StudentRegistryRecord>) : {};
  } catch {
    return {};
  }
}

export function saveSchoolRegistryMap(
  schoolId: string,
  map: Record<string, StudentRegistryRecord>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(registryStorageKey(schoolId), JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function createDefaultStudentRegistryRecord(
  student: Student,
  schoolSigners?: SchoolRegistrySigners
): StudentRegistryRecord {
  const fatherGuardian = student.guardians?.find((g) => g.relation === 'บิดา');
  const motherGuardian = student.guardians?.find((g) => g.relation === 'มารดา');

  return {
    studentId: student.id,
    prefixTh: student.prefixTh || getStudentPrefixTh(student),
    nationality: student.nationality || 'ไทย',
    religion: student.religion || 'พุทธ',
    birthPlace: student.birthPlace || '',
    fatherName:
      student.fatherName ||
      fatherGuardian?.name ||
      (student.guardianRelation === 'บิดา' ? student.guardianName : '') ||
      '',
    fatherPhone:
      student.fatherPhone ||
      fatherGuardian?.phone ||
      (student.guardianRelation === 'บิดา' ? student.guardianPhone : '') ||
      '',
    motherName:
      student.motherName ||
      motherGuardian?.name ||
      (student.guardianRelation === 'มารดา' ? student.guardianName : '') ||
      '',
    motherPhone:
      student.motherPhone ||
      motherGuardian?.phone ||
      (student.guardianRelation === 'มารดา' ? student.guardianPhone : '') ||
      '',
    pp1DocNo: student.pp1DocNo || '',
    pp3SetNo: student.pp3SetNo || '',
    pp3BookNo: student.pp3BookNo || '',
    pp3ApprovalStatus:
      student.pp3ApprovalStatus ||
      (student.status === 'graduated' ? 'approved' : 'pending'),
    graduationDate: student.graduationDate || '',
    pp7DocNo: student.pp7DocNo || '',
    advisorName: student.advisorName || '',
    registrarName: student.registrarName || schoolSigners?.registrarName || '',
    academicHeadName: student.academicHeadName || schoolSigners?.academicHeadName || '',
    principalName: student.principalName || schoolSigners?.principalName || '',
    affiliationOffice: schoolSigners?.affiliationOffice || 'สำนักงานเขตพื้นที่การศึกษา (สพฐ.)',
    updatedAt: new Date().toISOString(),
  };
}

export function getStudentRegistryRecord(
  map: Record<string, StudentRegistryRecord>,
  student: Student,
  schoolSigners?: SchoolRegistrySigners
): StudentRegistryRecord {
  const defaults = createDefaultStudentRegistryRecord(student, schoolSigners);
  const stored = map[student.id];
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    registrarName: stored.registrarName || defaults.registrarName,
    academicHeadName: stored.academicHeadName || defaults.academicHeadName,
    principalName: stored.principalName || defaults.principalName,
    affiliationOffice: stored.affiliationOffice || defaults.affiliationOffice,
  };
}

export function mergeRegistryFieldsIntoStudent(
  student: Student,
  registry: StudentRegistryRecord
): Student {
  return {
    ...student,
    prefixTh: registry.prefixTh || student.prefixTh,
    nationality: registry.nationality || student.nationality,
    religion: registry.religion || student.religion,
    birthPlace: registry.birthPlace || student.birthPlace,
    fatherName: registry.fatherName || student.fatherName,
    fatherPhone: registry.fatherPhone || student.fatherPhone,
    motherName: registry.motherName || student.motherName,
    motherPhone: registry.motherPhone || student.motherPhone,
    pp1DocNo: registry.pp1DocNo || undefined,
    pp3SetNo: registry.pp3SetNo || undefined,
    pp3BookNo: registry.pp3BookNo || undefined,
    pp3ApprovalStatus: registry.pp3ApprovalStatus,
    graduationDate: registry.graduationDate || undefined,
    pp7DocNo: registry.pp7DocNo || undefined,
    advisorName: registry.advisorName || undefined,
    registrarName: registry.registrarName || undefined,
    academicHeadName: registry.academicHeadName || undefined,
    principalName: registry.principalName || undefined,
  };
}

export async function saveStudentRegistryAndQualitativeToDb(params: {
  schoolId: string;
  studentId: string;
  academicYear: string;
  semester: string;
  registry: StudentRegistryRecord;
  qualitative?: StudentQualitativeAssessment;
}): Promise<{ syncedToSupabase: boolean; savedAt: string }> {
  const savedAt = new Date().toISOString();
  const nextRegistry: StudentRegistryRecord = {
    ...params.registry,
    studentId: params.studentId,
    updatedAt: savedAt,
  };

  // 1. Persist locally immediately
  const currentMap = loadSchoolRegistryMap(params.schoolId);
  currentMap[params.studentId] = nextRegistry;
  saveSchoolRegistryMap(params.schoolId, currentMap);

  if (params.qualitative) {
    const qualMap = loadQualitativeAssessments(
      params.schoolId,
      params.academicYear,
      params.semester
    );
    qualMap[params.studentId] = {
      ...params.qualitative,
      studentId: params.studentId,
      updatedAt: savedAt,
    };
    saveQualitativeAssessments(params.schoolId, params.academicYear, params.semester, qualMap);
  }

  // 2. Sync to Supabase if configured and table exists
  const client = getSupabaseClient();
  if (!client || !params.schoolId) {
    return { syncedToSupabase: false, savedAt };
  }

  try {
    const { error } = await client.from('student_registry_records').upsert(
      {
        school_id: params.schoolId,
        student_id: params.studentId,
        academic_year: params.academicYear || '2569',
        semester: params.semester || '1',
        registry_data: nextRegistry,
        qualitative_data: params.qualitative || createDefaultStudentQualitative(params.studentId),
        updated_at: savedAt,
      },
      { onConflict: 'school_id,student_id,academic_year,semester' }
    );

    if (error) {
      if (!isMissingRegistryTableError(error)) {
        console.warn('[StudentRegistry] Supabase upsert warning:', error.message);
      }
      return { syncedToSupabase: false, savedAt };
    }
    return { syncedToSupabase: true, savedAt };
  } catch {
    return { syncedToSupabase: false, savedAt };
  }
}

export async function hydrateSchoolRegistryFromSupabase(
  schoolId: string,
  academicYear: string,
  semester: string
): Promise<{
  registryMap: Record<string, StudentRegistryRecord>;
  qualitativeMap: Record<string, StudentQualitativeAssessment>;
}> {
  const localRegistry = loadSchoolRegistryMap(schoolId);
  const localQual = loadQualitativeAssessments(schoolId, academicYear, semester);

  const client = getSupabaseClient();
  if (!client || !schoolId) {
    return { registryMap: localRegistry, qualitativeMap: localQual };
  }

  try {
    const { data, error } = await client
      .from('student_registry_records')
      .select('student_id, academic_year, semester, registry_data, qualitative_data, updated_at')
      .eq('school_id', schoolId);

    if (error) {
      if (!isMissingRegistryTableError(error)) {
        console.warn('[StudentRegistry] Supabase load warning:', error.message);
      }
      return { registryMap: localRegistry, qualitativeMap: localQual };
    }

    const mergedRegistry: Record<string, StudentRegistryRecord> = { ...localRegistry };
    const mergedQual: Record<string, StudentQualitativeAssessment> = { ...localQual };

    (data || []).forEach((row) => {
      const sid = String(row.student_id || '');
      if (!sid) return;
      if (row.registry_data && typeof row.registry_data === 'object') {
        const remoteUpdated = String((row.registry_data as StudentRegistryRecord).updatedAt || row.updated_at || '');
        const localUpdated = mergedRegistry[sid]?.updatedAt || '';
        if (!mergedRegistry[sid] || remoteUpdated >= localUpdated) {
          mergedRegistry[sid] = {
            ...(row.registry_data as StudentRegistryRecord),
            studentId: sid,
          };
        }
      }
      if (
        row.qualitative_data &&
        typeof row.qualitative_data === 'object' &&
        String(row.academic_year || '') === String(academicYear || '') &&
        String(row.semester || '') === String(semester || '')
      ) {
        const remoteQ = row.qualitative_data as StudentQualitativeAssessment;
        const localQ = mergedQual[sid];
        if (!localQ || String(remoteQ.updatedAt || '') >= String(localQ.updatedAt || '')) {
          mergedQual[sid] = {
            ...remoteQ,
            studentId: sid,
          };
        }
      }
    });

    saveSchoolRegistryMap(schoolId, mergedRegistry);
    saveQualitativeAssessments(schoolId, academicYear, semester, mergedQual);
    return { registryMap: mergedRegistry, qualitativeMap: mergedQual };
  } catch {
    return { registryMap: localRegistry, qualitativeMap: localQual };
  }
}

export function getPp3ApprovalStatusMeta(status: Pp3ApprovalStatus): {
  labelTh: string;
  toneClass: string;
} {
  switch (status) {
    case 'approved':
      return {
        labelTh: 'อนุมัติจบการศึกษาแล้ว',
        toneClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700',
      };
    case 'verified':
      return {
        labelTh: 'ตรวจคุณสมบัติครบ · รอลงนาม',
        toneClass: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700',
      };
    case 'not_eligible':
      return {
        labelTh: 'ยังไม่ผ่านเกณฑ์จบ (ติด ร/มส/0)',
        toneClass: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700',
      };
    default:
      return {
        labelTh: 'รอตรวจสอบข้อมูล',
        toneClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700',
      };
  }
}
