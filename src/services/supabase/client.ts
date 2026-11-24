import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'eduverse_supabase_url';
const STORAGE_KEY_ANON = 'eduverse_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; key: string; isCustom: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
    '';

  // Project environment settings take precedence over legacy browser overrides.
  // This prevents stale localStorage credentials from silently pointing the app
  // at a different Supabase project after .env.local or deployment settings change.
  if (envUrl.trim() && envKey.trim()) {
    return { url: envUrl.trim(), key: envKey.trim(), isCustom: false };
  }

  const customUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;
  if (customUrl?.trim() && customKey?.trim()) {
    return { url: customUrl.trim(), key: customKey.trim(), isCustom: true };
  }

  return {
    url: envUrl.trim(),
    key: envKey.trim(),
    isCustom: false,
  };
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, key.trim());
    cachedClient = null;
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    cachedClient = null;
  }
}

export function isMissingTableError(error: { code?: string; message: string }): boolean {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /schema cache|could not find the table/i.test(error.message)
  );
}

export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
  tablesFound?: string[];
  tablesNeedCreation?: boolean;
}> {
  const client = getSupabaseClient();
  const { url } = getSupabaseCredentials();

  if (!client || !url) {
    return {
      ok: false,
      message: 'Supabase URL or Anon Key is missing. Please provide your Supabase project credentials.',
    };
  }

  const startTime = performance.now();
  try {
    const { error } = await client.from('schools').select('id, code, name_th').limit(1);
    const latency = Math.round(performance.now() - startTime);

    if (error) {
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message.includes('schema cache') ||
        error.message.includes('Could not find the table') ||
        error.message.includes('relation "public.schools" does not exist');

      if (isMissingTable) {
        return {
          ok: false,
          tablesNeedCreation: true,
          message: `เชื่อมต่อ Supabase สำเร็จแล้ว (${latency}ms) แต่ยังไม่ได้สร้างตาราง public.schools (Code: ${error.code || 'PGRST205'}) กรุณากดปุ่มคัดลอก SQL ด้านล่างไปรันใน Supabase SQL Editor`,
          latencyMs: latency,
          tablesFound: [],
        };
      }
      return {
        ok: false,
        message: `Supabase Error: ${error.message} (Code: ${error.code || 'unknown'})`,
        latencyMs: latency,
      };
    }

    return {
      ok: true,
      tablesNeedCreation: false,
      message: `เชื่อมต่อ Supabase PostgreSQL สำเร็จ! ค่า Latency: ${latency}ms (พบข้อมูลตาราง schools แล้ว)`,
      latencyMs: latency,
      tablesFound: ['schools'],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Network/Connection error: ${message}`,
    };
  }
}
