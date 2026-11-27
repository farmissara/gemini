import type {
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveStatus,
  PeriodAttendanceRecord,
} from '../../types';
import { getSupabaseClient, isMissingTableError } from './client';

export async function saveStudentSelfAttendance(record: AttendanceRecord, userId: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  if (!record.schoolId || !record.studentId || !record.id || !record.userName) {
    throw new Error('Attendance record is missing the linked student identity.');
  }
  if (!record.photoUrl?.startsWith('data:image/jpeg;base64,')) {
    throw new Error('A real camera photo is required to save this check-in.');
  }

  const photoBlob = await (await fetch(record.photoUrl)).blob();
  const photoStoragePath = `${record.schoolId}/${userId}/${record.id}.jpg`;
  const { error: uploadError } = await client.storage
    .from('attendance-selfies')
    .upload(photoStoragePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new Error(`Could not save attendance photo: ${uploadError.message}`);

  let insertError: { message: string } | null = null;
  const insertPayload = {
    id: record.id,
    school_id: record.schoolId,
    student_id: record.studentId,
    date: record.date,
    time: record.time,
    status: record.status,
    checkin_method: record.checkinMethod,
    remarks: record.remarks || null,
    line_notification_sent: false,
    record_type: record.recordType || 'check_in',
    user_name: record.userName,
    photo_url: photoStoragePath,
  };

  const firstAttempt = await client.from('attendance').insert(insertPayload);
  insertError = firstAttempt.error;

  if (
    insertError &&
    /photo_url|record_type|user_name|schema cache|could not find the '.*' column/i.test(insertError.message)
  ) {
    console.warn(
      '[Attendance] Retrying insert with base attendance columns due to missing columns in Supabase schema cache:',
      insertError.message,
    );
    const fallbackAttempt = await client.from('attendance').insert({
      id: record.id,
      school_id: record.schoolId,
      student_id: record.studentId,
      date: record.date,
      time: record.time,
      status: record.status,
      checkin_method: record.checkinMethod,
      remarks: record.remarks ? `${record.remarks} [Photo: ${photoStoragePath}]` : `Photo: ${photoStoragePath}`,
      line_notification_sent: false,
    });
    insertError = fallbackAttempt.error;
  }

  if (insertError) {
    const { error: cleanupError } = await client.storage
      .from('attendance-selfies')
      .remove([photoStoragePath]);
    if (cleanupError) {
      throw new Error(
        `Could not save attendance: ${insertError.message}; uploaded photo cleanup failed: ${cleanupError.message}`,
      );
    }
    throw new Error(`Could not save attendance: ${insertError.message}`);
  }

  return photoStoragePath;
}

export async function uploadAttendanceSelfiePhoto(params: {
  schoolId: string;
  userId: string;
  recordId: string;
  photoDataUrl: string;
}): Promise<string | undefined> {
  const client = getSupabaseClient();
  if (!client) return undefined;
  if (!params.photoDataUrl.startsWith('data:image/')) return undefined;
  try {
    const photoBlob = await (await fetch(params.photoDataUrl)).blob();
    const photoStoragePath = `${params.schoolId}/${params.userId}/${params.recordId}.jpg`;
    const { error } = await client.storage
      .from('attendance-selfies')
      .upload(photoStoragePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
    if (error) return undefined;
    return photoStoragePath;
  } catch {
    return undefined;
  }
}

export async function saveQueuedAttendanceToDb(record: {
  id: string;
  schoolId: string;
  studentId: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  checkinMethod: AttendanceRecord['checkinMethod'];
  remarks?: string;
  recordType?: AttendanceCheckType;
  userName?: string;
  photoUrl?: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is unavailable.');
  const baseRow = {
    id: record.id,
    school_id: record.schoolId,
    student_id: record.studentId,
    date: record.date,
    time: record.time,
    status: record.status,
    checkin_method: record.checkinMethod,
    remarks: record.remarks || null,
    line_notification_sent: false,
  };
  const { error } = await client.from('attendance').upsert({
    ...baseRow,
    record_type: record.recordType || 'check_in',
    user_name: record.userName || null,
    ...(record.photoUrl ? { photo_url: record.photoUrl } : {}),
  });
  if (!error) return;
  if (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    /photo_url|record_type|user_name|schema cache|could not find the '.*' column/i.test(error.message)
  ) {
    const fallback = await client.from('attendance').upsert(baseRow);
    if (!fallback.error) return;
    throw new Error(`Attendance sync failed: ${fallback.error.message}`);
  }
  throw new Error(`Attendance sync failed: ${error.message}`);
}

export async function saveLeaveRequestToDb(schoolId: string, req: LeaveRequest): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('leave_requests').upsert({
    id: req.id,
    school_id: schoolId,
    user_id: req.userId,
    user_name: req.userName,
    user_role: req.userRole,
    grade_level_or_department: req.gradeLevelOrDepartment || null,
    leave_scope: req.leaveScope || 'full_day',
    period_number: req.periodNumber ?? null,
    course_id: req.courseId || null,
    course_code: req.courseCode || null,
    course_title: req.courseTitle || null,
    substitute_teacher_id: req.substituteTeacherId || null,
    substitute_teacher_name: req.substituteTeacherName || null,
    cc_emails_or_roles: Array.isArray(req.ccEmailsOrRoles)
      ? req.ccEmailsOrRoles.join(', ')
      : req.ccEmailsOrRoles || null,
    leave_type: req.leaveType,
    start_date: req.startDate,
    end_date: req.endDate,
    reason: req.reason,
    attachment_url: req.attachmentUrl || null,
    status: req.status,
    approved_by: req.approvedBy || null,
    approval_remarks: req.approvalRemarks || null,
    created_at: req.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`ไม่สามารถบันทึกใบลาลงฐานข้อมูลได้: ${error.message}`);
  }
  return true;
}

export async function updateLeaveRequestStatusInDb(
  schoolId: string,
  reqId: string,
  status: LeaveStatus,
  approvedBy: string,
  approvalRemarks?: string,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('leave_requests')
    .update({
      status,
      approved_by: approvedBy,
      approval_remarks: approvalRemarks || null,
      updated_at: new Date().toISOString(),
    })
    .eq('school_id', schoolId)
    .eq('id', reqId);
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`ไม่สามารถอัปเดตสถานะใบลาได้: ${error.message}`);
  }
  return true;
}

export async function savePeriodAttendanceBatchToDb(
  schoolId: string,
  records: PeriodAttendanceRecord[],
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || records.length === 0) return false;

  const rows = records.map((r) => ({
    id: r.id,
    school_id: schoolId,
    student_id: r.studentId,
    course_id: r.courseId,
    course_code: r.courseCode || '',
    period_number: r.periodNumber,
    date: r.date,
    time_slot: r.timeSlot || '',
    status: r.status,
    check_method: r.checkMethod || 'teacher_proxy',
    record_type: r.recordType || 'check_in',
    recorded_by: r.verifiedByTeacherName || r.verifiedByTeacherId || null,
    notes: r.remarks || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client
    .from('period_attendance')
    .upsert(rows, { onConflict: 'school_id,student_id,course_id,date,period_number,record_type' });
  if (error) {
    if (isMissingTableError(error)) return false;
    throw new Error(`ไม่สามารถบันทึกการเช็คชื่อรายคาบได้: ${error.message}`);
  }
  return true;
}
