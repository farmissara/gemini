import { AdminCoordinationAttachment, AdminCoordinationMessage } from '../types';
import { getSupabaseClient } from './supabase';

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4 MB per attachment

function mapCoordinationRow(row: any): AdminCoordinationMessage {
  return {
    id: row.id,
    schoolId: row.school_id,
    schoolName: row.school_name,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    channelType: row.channel_type || 'chat',
    priority: row.priority || 'normal',
    subject: row.subject || '',
    body: row.body || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    status: row.status || 'open',
    readByAdmin: Boolean(row.read_by_admin),
    readBySuperAdmin: Boolean(row.read_by_super_admin),
    createdAt: row.created_at,
  };
}

export async function fetchCoordinationMessages(schoolId?: string): Promise<AdminCoordinationMessage[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  let query = client
    .from('admin_coordination_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data, error } = await query;
  if (error) throw new Error(`ไม่สามารถโหลดข้อความประสานงานได้: ${error.message}`);
  return (data || []).map(mapCoordinationRow);
}

export async function sendCoordinationMessage(
  message: AdminCoordinationMessage
): Promise<AdminCoordinationMessage> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client
    .from('admin_coordination_messages')
    .insert({
      id: message.id,
      school_id: message.schoolId,
      school_name: message.schoolName,
      sender_role: message.senderRole,
      sender_name: message.senderName,
      sender_email: message.senderEmail,
      channel_type: message.channelType,
      priority: message.priority,
      subject: message.subject,
      body: message.body,
      attachments: message.attachments,
      status: message.status,
      read_by_admin: message.readByAdmin,
      read_by_super_admin: message.readBySuperAdmin,
      created_at: message.createdAt,
    })
    .select('*')
    .single();
  if (error) throw new Error(`ไม่สามารถส่งข้อความประสานงานได้: ${error.message}`);
  return mapCoordinationRow(data);
}

export async function updateCoordinationMessageStatus(
  messageId: string,
  updates: Partial<Pick<AdminCoordinationMessage, 'status' | 'readByAdmin' | 'readBySuperAdmin'>>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const dbPatch: Record<string, unknown> = {};
  if (updates.status !== undefined) dbPatch.status = updates.status;
  if (updates.readByAdmin !== undefined) dbPatch.read_by_admin = updates.readByAdmin;
  if (updates.readBySuperAdmin !== undefined) dbPatch.read_by_super_admin = updates.readBySuperAdmin;

  const { data, error } = await client
    .from('admin_coordination_messages')
    .update(dbPatch)
    .eq('id', messageId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`ไม่สามารถอัปเดตข้อความประสานงานได้: ${error.message}`);
  if (!data) throw new Error('ไม่พบข้อความหรือไม่มีสิทธิ์เปลี่ยนสถานะข้อความนี้');
}

export function readFileAsCoordinationAttachment(file: File): Promise<AdminCoordinationAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(new Error(`ไฟล์ "${file.name}" มีขนาดเกิน 4 MB กรุณาย่อไฟล์ก่อนแนบ`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
      });
    };
    reader.onerror = () => reject(new Error(`ไม่สามารถอ่านไฟล์ "${file.name}" ได้`));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
