import type {
  CampusGateGeofence,
  SchoolPeriodTime,
  Teacher,
  UserRole,
} from '../../types';
import { saveCachedSchoolPeriods } from '../../lib/schoolCustomPresets';
import { compressImageFileToBlob } from '../../lib/imageCompression';
import { sanitizeSchoolCampusGates } from '../../lib/schoolGps';
import { getSupabaseClient, isMissingTableError } from './client';
import { mapTeacherToDb } from './mappers';

export async function saveSchoolPeriodTimes(
  schoolId: string,
  periods: SchoolPeriodTime[],
): Promise<void> {
  saveCachedSchoolPeriods(schoolId, periods);

  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const rows = periods.map((period) => ({
    school_id: schoolId,
    period_number: period.periodNumber,
    start_time: period.startTime,
    end_time: period.endTime,
    is_break: Boolean(period.isBreak),
  }));
  const { error } = await client.from('school_period_times').upsert(rows);
  if (error) {
    const isConstraintError =
      error.message.includes('check') ||
      error.message.includes('constraint') ||
      error.code === '23514';
    if (!isConstraintError) {
      throw new Error(`Could not save school period times: ${error.message}`);
    }
    const compatRows = rows.filter(
      (r) =>
        r.period_number >= 0 &&
        r.period_number <= 7 &&
        (r.period_number === 0) === r.is_break,
    );
    if (compatRows.length > 0) {
      const { error: compatError } = await client.from('school_period_times').upsert(compatRows);
      if (compatError) {
        throw new Error(`Could not save school period times: ${compatError.message}`);
      }
    }
    return;
  }

  const { data: savedPeriods, error: loadError } = await client
    .from('school_period_times')
    .select('period_number')
    .eq('school_id', schoolId);
  if (loadError) throw new Error(`Could not verify school period times: ${loadError.message}`);

  const retainedPeriodNumbers = new Set(periods.map((period) => period.periodNumber));
  const removedPeriodNumbers = (savedPeriods || [])
    .map((period) => period.period_number)
    .filter((periodNumber) => !retainedPeriodNumbers.has(periodNumber));
  if (removedPeriodNumbers.length > 0) {
    const { error: deleteError } = await client
      .from('school_period_times')
      .delete()
      .eq('school_id', schoolId)
      .in('period_number', removedPeriodNumbers);
    if (deleteError) throw new Error(`Could not remove deleted school periods: ${deleteError.message}`);
  }
}

export async function saveSchoolCampusGates(
  schoolId: string,
  gates: CampusGateGeofence[],
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const cleanedGates = sanitizeSchoolCampusGates(gates, schoolId);
  const rows = cleanedGates.map((gate) => ({
    id: gate.id,
    school_id: schoolId,
    name_th: gate.nameTh,
    name_en: gate.nameEn,
    latitude: gate.lat,
    longitude: gate.lng,
    radius_meters: gate.radiusMeters,
    is_primary: gate.isPrimary,
    type: gate.type,
    is_active: gate.isActive ?? true,
  }));
  if (rows.length > 0) {
    const { error } = await client.from('school_campus_gates').upsert(rows);
    if (error) {
      if (isMissingTableError(error)) return false;
      throw new Error(`Could not save check-in points: ${error.message}`);
    }
  }

  const { data: existingGates, error: existingError } = await client
    .from('school_campus_gates')
    .select('id')
    .eq('school_id', schoolId);
  if (existingError) {
    if (isMissingTableError(existingError)) return false;
    throw new Error(`Could not verify saved check-in points: ${existingError.message}`);
  }
  const retainedIds = new Set(cleanedGates.map((gate) => gate.id));
  for (const existingGate of existingGates || []) {
    if (retainedIds.has(existingGate.id)) continue;
    const { error: deleteError } = await client
      .from('school_campus_gates')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', existingGate.id);
    if (deleteError) throw new Error(`Could not remove deleted check-in point: ${deleteError.message}`);
  }
  return true;
}

export async function saveTeachersToDb(schoolId: string, teachers: Teacher[]): Promise<void> {
  if (teachers.length === 0) return;
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client
    .from('teachers')
    .upsert(teachers.map((teacher) => mapTeacherToDb(teacher, schoolId)), { onConflict: 'id' });
  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('ตาราง teachers ยังไม่มีใน Supabase กรุณารัน SQL Migration เพิ่มตาราง teachers');
    }
    throw new Error(`ไม่สามารถบันทึกข้อมูลครูลง Supabase ได้: ${error.message}`);
  }
}

export async function saveSchoolGpsCoordinates(
  schoolId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('schools')
      .update({
        latitude,
        longitude,
        geofence_radius_meters: radiusMeters,
      })
      .eq('id', schoolId);

    if (error) {
      console.warn('Could not update school coordinates in Supabase schools table:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to save school coordinates to Supabase:', err);
    return false;
  }
}

export async function deleteStudentFromDb(schoolId: string, studentId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const dependentTables = ['grades', 'attendance', 'period_attendance', 'invoices'] as const;
  for (const table of dependentTables) {
    const { error: depErr } = await client
      .from(table)
      .delete()
      .eq('school_id', schoolId)
      .eq('student_id', studentId);
    if (depErr && !isMissingTableError(depErr)) {
      throw new Error(`Could not clean ${table} for deleted student: ${depErr.message}`);
    }
  }

  const { error: unlinkErr } = await client
    .from('user_profiles')
    .update({ student_id: null })
    .eq('school_id', schoolId)
    .eq('student_id', studentId);
  if (unlinkErr && !isMissingTableError(unlinkErr)) {
    console.warn('Could not unlink user_profiles for deleted student:', unlinkErr.message);
  }

  const { data: schoolCourseRows } = await client
    .from('courses')
    .select('id, enrolled_student_ids')
    .eq('school_id', schoolId);
  if (Array.isArray(schoolCourseRows)) {
    for (const row of schoolCourseRows) {
      const currentIds: string[] = Array.isArray(row.enrolled_student_ids) ? row.enrolled_student_ids : [];
      if (currentIds.includes(studentId)) {
        await client
          .from('courses')
          .update({ enrolled_student_ids: currentIds.filter((id) => id !== studentId) })
          .eq('school_id', schoolId)
          .eq('id', row.id);
      }
    }
  }

  const { error } = await client
    .from('students')
    .delete()
    .eq('school_id', schoolId)
    .eq('id', studentId);
  if (error) throw new Error(`Could not delete student from Supabase: ${error.message}`);
}

export async function deleteTeacherFromDb(schoolId: string, teacherId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { error: reportingError } = await client
    .from('teachers')
    .update({ reports_to_teacher_id: null })
    .eq('school_id', schoolId)
    .eq('reports_to_teacher_id', teacherId);
  if (reportingError) {
    throw new Error(`Could not clear staff reporting links before deleting teacher: ${reportingError.message}`);
  }
  const { error } = await client
    .from('teachers')
    .delete()
    .eq('school_id', schoolId)
    .eq('id', teacherId);
  if (error) throw new Error(`Could not delete teacher from Supabase: ${error.message}`);
}

export async function uploadSchoolLogo(schoolId: string, file: File): Promise<string> {
  const mimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
  if (!mimeTypes.has(file.type)) {
    throw new Error('เลือกไฟล์โลโก้ชนิด PNG, JPEG หรือ WebP เท่านั้น');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('ไฟล์โลโก้ต้องมีขนาดไม่เกิน 2 MB');
  }

  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { blob: optimizedBlob, contentType } = await compressImageFileToBlob(file, {
    maxDimension: 512,
    quality: 0.82,
    maxDataUrlLength: 140_000,
  });

  const path = `${schoolId}/logo`;
  const { error: uploadError } = await client.storage
    .from('school-logos')
    .upload(path, optimizedBlob, {
      cacheControl: '0',
      contentType,
      upsert: true,
    });
  if (uploadError) throw new Error(`ไม่สามารถอัปโหลดโลโก้โรงเรียนได้: ${uploadError.message}`);

  const publicUrl = client.storage.from('school-logos').getPublicUrl(path).data.publicUrl;
  const versionedUrl = `${publicUrl}?v=${Date.now()}`;
  const { data, error } = await client
    .from('schools')
    .update({ logo_url: versionedUrl })
    .eq('id', schoolId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`อัปโหลดโลโก้แล้วแต่บันทึกข้อมูลโรงเรียนไม่สำเร็จ: ${error.message}`);
  if (!data) throw new Error('ไม่พบโรงเรียนหรือไม่มีสิทธิ์เปลี่ยนโลโก้');

  return versionedUrl;
}

export async function uploadSchoolAttachment(
  schoolId: string,
  folder: string,
  fileOrDataUrl: File | string,
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || !schoolId) return null;

  try {
    let blob: Blob;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (typeof fileOrDataUrl === 'string') {
      if (!fileOrDataUrl.startsWith('data:')) return fileOrDataUrl;
      const mimeMatch = /^data:([^;]+);/.exec(fileOrDataUrl);
      if (mimeMatch?.[1]) {
        contentType = mimeMatch[1];
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('pdf')) ext = 'pdf';
      }
      blob = await (await fetch(fileOrDataUrl)).blob();
    } else {
      blob = fileOrDataUrl;
      contentType = fileOrDataUrl.type || 'image/jpeg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('pdf')) ext = 'pdf';
    }

    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '');
    const storagePath = `${schoolId}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await client.storage
      .from('school-attachments')
      .upload(storagePath, blob, { contentType, upsert: false });
    if (error) {
      console.warn('[Storage] Could not upload attachment to school-attachments:', error.message);
      return null;
    }

    return client.storage.from('school-attachments').getPublicUrl(storagePath).data.publicUrl;
  } catch (err) {
    console.warn('[Storage] Attachment upload fallback triggered:', err);
    return null;
  }
}

export async function submitInvoiceSlipToDb(
  schoolId: string,
  invoiceId: string,
  slipDataUrlOrUrl: string,
  note: string,
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const uploadedUrl = await uploadSchoolAttachment(schoolId, 'slips', slipDataUrlOrUrl);
  const finalUrl = uploadedUrl || slipDataUrlOrUrl;

  const { error } = await client.rpc('submit_invoice_slip', {
    target_school_id: schoolId,
    target_invoice_id: invoiceId,
    target_slip_url: finalUrl,
    target_note: note,
  });
  if (error) {
    if (
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      /could not find the function|submit_invoice_slip/i.test(error.message)
    ) {
      console.warn('[Billing] submit_invoice_slip RPC not installed yet; kept locally:', error.message);
      return uploadedUrl;
    }
    throw new Error(`ไม่สามารถส่งหลักฐานสลิปได้: ${error.message}`);
  }
  return finalUrl;
}

export async function persistAvatarChangeToSupabase(params: {
  schoolId: string;
  userId: string;
  userRole: UserRole;
  targetType: 'self' | 'student' | 'teacher';
  targetId?: string;
  avatarUrl: string;
  isSelf?: boolean;
}): Promise<{ resolvedUrl: string; persistedToDb: boolean }> {
  const rawUrl = (params.avatarUrl || '').trim();
  if (!rawUrl) {
    return { resolvedUrl: '', persistedToDb: false };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { resolvedUrl: rawUrl, persistedToDb: false };
  }

  let finalUrl = rawUrl;
  if (rawUrl.startsWith('data:') && params.schoolId) {
    const uploadedUrl = await uploadSchoolAttachment(params.schoolId, 'avatars', rawUrl);
    if (uploadedUrl) {
      finalUrl = uploadedUrl;
    }
  }

  let persistedToDb = false;
  const isAdmin = params.userRole === 'admin' || params.userRole === 'super_admin';
  const isSelf = Boolean(params.isSelf || params.targetType === 'self');

  try {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      const response = await fetch('/api/profile-avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetType: params.targetType,
          schoolId: params.schoolId,
          targetId: params.targetId || '',
          avatarUrl: finalUrl,
        }),
      });
      if (response.ok) {
        persistedToDb = true;
      }
    }
  } catch {
    // Fall back to direct Supabase client persistence below
  }

  if (!persistedToDb) {
    if (isSelf) {
      try {
        const { error: rpcErr } = await client.rpc('update_own_avatar', {
          target_avatar_url: finalUrl,
        });
        if (!rpcErr) {
          persistedToDb = true;
        }
      } catch {
        // RPC may not be installed yet; fall back to direct user_profiles update
      }

      const { error: profileErr } = await client
        .from('user_profiles')
        .update({ avatar_url: finalUrl })
        .eq('id', params.userId);
      if (!profileErr) {
        persistedToDb = true;
      }
    }

    if (isAdmin && params.targetType === 'student' && params.targetId) {
      const { error: stuErr } = await client
        .from('students')
        .update({ avatar_url: finalUrl })
        .eq('school_id', params.schoolId)
        .eq('id', params.targetId);
      if (!stuErr) {
        persistedToDb = true;
      }
    } else if (isAdmin && params.targetType === 'teacher' && params.targetId) {
      const { error: tchErr } = await client
        .from('teachers')
        .update({ avatar_url: finalUrl })
        .eq('school_id', params.schoolId)
        .eq('id', params.targetId);
      if (!tchErr) {
        persistedToDb = true;
      }
    }
  }

  return { resolvedUrl: finalUrl, persistedToDb };
}
