import { getSupabaseClient } from './supabase';

export async function postLearningAi<T>(path: string, payload: unknown): Promise<T> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('ยังไม่ได้เชื่อมต่อระบบฐานข้อมูลและยืนยันตัวตน');
  }

  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียนก่อนใช้งาน AI');
  }

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (result && typeof result.message === 'string' && result.message) ||
        `ไม่สามารถเรียกใช้ระบบ AI ได้ (${response.status})`
    );
  }
  return result as T;
}
