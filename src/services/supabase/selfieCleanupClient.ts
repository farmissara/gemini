import { getSupabaseClient } from './client';

export interface SelfieCleanupClientResult {
  schoolId: string;
  checkedAt: string;
  retentionMinutes: number;
  matchedByCheckoutCount: number;
  matchedPreviousDaysCount: number;
  deletedPhotosCount: number;
  clearedRecordsCount: number;
  deletedRecordIds: string[];
  storagePathsRemoved: string[];
  dryRun: boolean;
}

export async function cleanupDueAttendanceSelfiesOnServer(params: {
  schoolId: string;
  retentionMinutes?: number;
  includePreviousDays?: boolean;
  dryRun?: boolean;
}): Promise<SelfieCleanupClientResult> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลก่อนลบรูปเซลฟี่');
  }

  const response = await fetch('/api/attendance/cleanup-selfies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      schoolId: params.schoolId,
      retentionMinutes: params.retentionMinutes,
      includePreviousDays: params.includePreviousDays,
      dryRun: params.dryRun,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | (SelfieCleanupClientResult & { ok?: boolean; message?: string; error?: string })
    | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.message || `Selfie cleanup failed (${response.status})`);
  }

  return payload;
}
