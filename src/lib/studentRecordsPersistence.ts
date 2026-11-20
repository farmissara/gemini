import { getSupabaseClient } from './supabase';

export type SchoolStudentRecordKind = 'portfolio' | 'behavior' | 'sdq' | 'infirmary';

type StoredRow<T> = {
  payload: T;
};

export async function loadSchoolStudentRecords<T>(
  schoolId: string,
  recordKind: SchoolStudentRecordKind
): Promise<T[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client
    .from('school_student_records')
    .select('payload')
    .eq('school_id', schoolId)
    .eq('record_kind', recordKind);
  if (error) throw new Error(`Could not load ${recordKind} records: ${error.message}`);
  return ((data || []) as StoredRow<T>[]).map((row) => row.payload);
}

export async function saveSchoolStudentRecord<T>(params: {
  schoolId: string;
  recordKind: SchoolStudentRecordKind;
  recordId: string;
  studentId?: string;
  ownerUserId?: string;
  record: T;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client.from('school_student_records').upsert({
    school_id: params.schoolId,
    record_kind: params.recordKind,
    record_id: params.recordId,
    student_id: params.studentId || null,
    owner_user_id: params.ownerUserId || null,
    payload: params.record,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'school_id,record_kind,record_id' });
  if (error) throw new Error(`Could not save ${params.recordKind} record: ${error.message}`);
}

export async function deleteSchoolStudentRecord(
  schoolId: string,
  recordKind: SchoolStudentRecordKind,
  recordId: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('school_student_records')
    .delete()
    .eq('school_id', schoolId)
    .eq('record_kind', recordKind)
    .eq('record_id', recordId);
  if (error) throw new Error(`Could not delete ${recordKind} record: ${error.message}`);
}
