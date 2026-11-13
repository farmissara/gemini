import { AuditLogEntry, UserRole } from '../types';

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
  return newEntry;
};
