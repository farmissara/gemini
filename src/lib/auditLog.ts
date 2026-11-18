import { AuditLogEntry, UserRole } from '../types';
import { getSupabaseClient } from './supabase';

const AUDIT_STORAGE_PREFIX = 'eduverse_audit_logs_v1_';
const MAX_AUDIT_ENTRIES = 500;

const readStorage = (schoolId: string): AuditLogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${AUDIT_STORAGE_PREFIX}${schoolId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (schoolId: string, entries: AuditLogEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${AUDIT_STORAGE_PREFIX}${schoolId}`,
      JSON.stringify(entries.slice(0, MAX_AUDIT_ENTRIES))
    );
  } catch {
    // ignore storage quota errors
  }
};

export const getAuditLogs = (schoolId: string): AuditLogEntry[] => {
  return readStorage(schoolId);
};

export const appendAuditLog = (
  schoolId: string,
  entry: {
    actorName: string;
    actorRole: UserRole;
    actionType: AuditLogEntry['actionType'];
    targetLabel: string;
    details: string;
  }
): AuditLogEntry => {
  const newEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId,
    timestamp: new Date().toISOString(),
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    actionType: entry.actionType,
    targetLabel: entry.targetLabel,
    details: entry.details,
  };
  const existing = readStorage(schoolId);
  writeStorage(schoolId, [newEntry, ...existing]);
  const client = getSupabaseClient();
  if (client) {
    void (async () => {
      try {
        const { error } = await client.rpc('append_audit_log', {
          target_school_id: schoolId,
          target_label: entry.targetLabel,
          target_details: entry.details,
          target_action_type: entry.actionType,
        });
        if (error) console.error('Could not persist audit log:', error.message);
      } catch (error) {
        console.error('Could not persist audit log:', error);
      }
    })();
  }
  return newEntry;
};

export async function fetchAuditLogsFromSupabase(
  schoolId?: string
): Promise<Array<AuditLogEntry & { schoolName: string }>> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('list_audit_logs', {
    target_school_id: schoolId || null,
  });
  if (error) throw new Error(`Could not load audit logs: ${error.message}`);
  return ((data || []) as Array<{
    id: number;
    school_id: string | null;
    school_name: string;
    actor_name: string;
    actor_role: UserRole;
    action_type: AuditLogEntry['actionType'];
    target_label: string;
    details: string;
    created_at: string;
  }>).map((row) => ({
    id: String(row.id),
    schoolId: row.school_id || '',
    schoolName: row.school_name,
    timestamp: row.created_at,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actionType: row.action_type,
    targetLabel: row.target_label,
    details: row.details,
  }));
}
