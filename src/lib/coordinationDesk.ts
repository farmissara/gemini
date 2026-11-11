import { AdminCoordinationAttachment, AdminCoordinationMessage } from '../types';
import { getSupabaseClient } from './supabase';

const STORAGE_KEY = 'eduverse_admin_superadmin_messages_v1';
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4 MB per attachment

const INITIAL_COORDINATION_MESSAGES: AdminCoordinationMessage[] = [
  {
    id: 'coord-init-1',
    schoolId: 'sch-bkk-01',
    schoolName: 'โรงเรียนสาธิตนวัตกรรมกรุงเทพ',
    senderRole: 'admin',
    senderName: 'ผอ.ดร. นริศรา รัตนโกสินทร์',
    senderEmail: 'admin@bkk-demo.ac.th',
    channelType: 'letter',
    priority: 'urgent',
    subject: 'ขออนุมัติขยายโควตานำเข้ารายชื่อนักเรียน DMC ภาคเรียนที่ 1/2569',
    body: 'เรียน Super Admin (farmissara@gmail.com)\n\nทางโรงเรียนมีนักเรียนระดับชั้น ม.1 และ ม.4 เข้าใหม่เพิ่มเติม จำนวน 180 คน ขอความอนุเคราะห์ตรวจสอบและเปิดสิทธิ์นำเข้าไฟล์ DMC ชุดเพิ่มเติม พร้อมแนบหนังสือรับรองจำนวนนักเรียนมาเพื่อพิจารณาครับ',
    attachments: [],
    status: 'open',
    readByAdmin: true,
    readBySuperAdmin: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
  {
    id: 'coord-init-2',
    schoolId: 'sch-bkk-01',
    schoolName: 'โรงเรียนสาธิตนวัตกรรมกรุงเทพ',
    senderRole: 'super_admin',
    senderName: 'Super Admin Master (ฟาร์ม อิสสระ)',
    senderEmail: 'farmissara@gmail.com',
    channelType: 'chat',
    priority: 'normal',
    subject: 'ตอบกลับ: การเปิดใช้งาน LINE OA และจุดสแกน GPS ประตูโรงเรียน',
    body: 'รับทราบเรื่องโควตา DMC แล้วครับ กำลังดำเนินการขยายสิทธิ์ให้เรียบร้อยภายในวันนี้ หากมีไฟล์แผนผังจุดประตู GPS เพิ่มเติมสามารถแนบส่งมาในช่องแชตนี้ได้เลยครับ',
    attachments: [],
    status: 'acknowledged',
    readByAdmin: false,
    readBySuperAdmin: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
];

export function loadLocalCoordinationMessages(): AdminCoordinationMessage[] {
  if (typeof window === 'undefined') return INITIAL_COORDINATION_MESSAGES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COORDINATION_MESSAGES));
      return INITIAL_COORDINATION_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_COORDINATION_MESSAGES;
  } catch {
    return INITIAL_COORDINATION_MESSAGES;
  }
}

export function saveLocalCoordinationMessages(messages: AdminCoordinationMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Fallback if localStorage quota is exceeded due to large attachments: strip old attachment dataUrls
    try {
      const compact = messages.slice(0, 40).map((m, idx) =>
        idx > 15
          ? {
              ...m,
              attachments: m.attachments.map((a) => ({ ...a, dataUrl: '' })),
            }
          : m
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // ignore
    }
  }
}

export async function fetchCoordinationMessages(isDemoMode: boolean, schoolId?: string): Promise<AdminCoordinationMessage[]> {
  const local = loadLocalCoordinationMessages();
  if (isDemoMode) {
    return schoolId ? local.filter((m) => m.schoolId === schoolId) : local;
  }

  const client = getSupabaseClient();
  if (!client) {
    return schoolId ? local.filter((m) => m.schoolId === schoolId) : local;
  }

  try {
    let query = client
      .from('admin_coordination_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    const { data, error } = await query;
    if (error || !data) {
      return schoolId ? local.filter((m) => m.schoolId === schoolId) : local;
    }

    const mapped: AdminCoordinationMessage[] = data.map((row: any) => ({
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
    }));

    if (mapped.length === 0 && local.length > 0) {
      return schoolId ? local.filter((m) => m.schoolId === schoolId) : local;
    }
    return mapped;
  } catch {
    return schoolId ? local.filter((m) => m.schoolId === schoolId) : local;
  }
}

export async function sendCoordinationMessage(
  message: AdminCoordinationMessage,
  isDemoMode: boolean
): Promise<AdminCoordinationMessage[]> {
  const existing = loadLocalCoordinationMessages();
  const nextLocal = [message, ...existing];
  saveLocalCoordinationMessages(nextLocal);

  if (!isDemoMode) {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('admin_coordination_messages').insert({
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
        });
      } catch {
        // Silent local fallback if table migration hasn't been executed yet
      }
    }
  }

  return nextLocal;
}

export async function updateCoordinationMessageStatus(
  messageId: string,
  updates: Partial<Pick<AdminCoordinationMessage, 'status' | 'readByAdmin' | 'readBySuperAdmin'>>,
  isDemoMode: boolean
): Promise<AdminCoordinationMessage[]> {
  const existing = loadLocalCoordinationMessages();
  const nextLocal = existing.map((m) => (m.id === messageId ? { ...m, ...updates } : m));
  saveLocalCoordinationMessages(nextLocal);

  if (!isDemoMode) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const dbPatch: Record<string, unknown> = {};
        if (updates.status !== undefined) dbPatch.status = updates.status;
        if (updates.readByAdmin !== undefined) dbPatch.read_by_admin = updates.readByAdmin;
        if (updates.readBySuperAdmin !== undefined) dbPatch.read_by_super_admin = updates.readBySuperAdmin;
        await client.from('admin_coordination_messages').update(dbPatch).eq('id', messageId);
      } catch {
        // Silent fallback
      }
    }
  }

  return nextLocal;
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
