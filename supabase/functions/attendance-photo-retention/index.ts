import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'attendance-selfies';
const RETENTION_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('ATTENDANCE_PHOTO_CLEANUP_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return json({ error: 'Supabase admin configuration is missing' }, 500);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cutoff = Date.now() - RETENTION_MS;
  const expiredPaths: string[] = [];

  // Storage list() is used instead of deleting storage.objects rows directly,
  // so the underlying object is removed from the storage provider too.
  async function walk(path: string): Promise<void> {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.storage.from(BUCKET).list(path, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`Could not list attendance photos: ${error.message}`);

      for (const entry of data || []) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.id) {
          const createdAt = entry.created_at ? Date.parse(entry.created_at) : NaN;
          if (Number.isFinite(createdAt) && createdAt <= cutoff) expiredPaths.push(entryPath);
        } else {
          await walk(entryPath);
        }
      }
      if (!data || data.length < PAGE_SIZE) break;
    }
  }

  try {
    await walk('');

    let deleted = 0;
    for (let i = 0; i < expiredPaths.length; i += 100) {
      const paths = expiredPaths.slice(i, i + 100);
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) throw new Error(`Could not delete expired attendance photos: ${error.message}`);

      // Keep the attendance row and its audit details, clearing only its photo pointer.
      const { error: updateError } = await supabase
        .from('attendance')
        .update({ photo_url: null })
        .in('photo_url', paths);
      if (updateError && !/photo_url|column/i.test(updateError.message)) {
        throw new Error(`Photos were deleted but attendance references could not be cleared: ${updateError.message}`);
      }
      deleted += paths.length;
    }

    return json({ ok: true, retentionHours: 24, deletedPhotos: deleted });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Cleanup failed' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
