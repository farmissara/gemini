import { UserRole } from '../types';

export type CalendarNoteScope = 'personal' | 'school';
export type CalendarNoteColor = 'amber' | 'sky' | 'emerald' | 'rose' | 'violet';

export interface CalendarNote {
  id: string;
  schoolId: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  scope: CalendarNoteScope;
  color: CalendarNoteColor;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  updatedAt: string;
}

const STORAGE_PREFIX = 'eduverse_calendar_notes_v1_';
export const CALENDAR_NOTES_UPDATED_EVENT = 'eduverse:calendar-notes-updated';

export const CALENDAR_NOTE_COLORS: Array<{
  id: CalendarNoteColor;
  labelTh: string;
  labelEn: string;
  dotClass: string;
  cardClass: string;
  badgeClass: string;
}> = [
  {
    id: 'amber',
    labelTh: 'เตือนความจำ',
    labelEn: 'Reminder',
    dotClass: 'bg-amber-500',
    cardClass: 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/35',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  {
    id: 'sky',
    labelTh: 'งานสอน / นัดหมาย',
    labelEn: 'Schedule',
    dotClass: 'bg-sky-500',
    cardClass: 'border-sky-300 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/35',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  },
  {
    id: 'emerald',
    labelTh: 'กิจกรรม',
    labelEn: 'Activity',
    dotClass: 'bg-emerald-500',
    cardClass: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/35',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  {
    id: 'rose',
    labelTh: 'สำคัญเร่งด่วน',
    labelEn: 'Urgent',
    dotClass: 'bg-rose-500',
    cardClass: 'border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/35',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  },
  {
    id: 'violet',
    labelTh: 'ส่วนตัว / อื่นๆ',
    labelEn: 'Personal',
    dotClass: 'bg-violet-500',
    cardClass: 'border-violet-300 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/35',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
  },
];

export function getCalendarNoteColorMeta(color: CalendarNoteColor | string | undefined) {
  return CALENDAR_NOTE_COLORS.find((c) => c.id === color) || CALENDAR_NOTE_COLORS[0];
}

function getStorageKey(schoolId: string): string {
  return `${STORAGE_PREFIX}${schoolId || 'default-school'}`;
}

export function loadCalendarNotes(schoolId: string): CalendarNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CalendarNote =>
        Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.date === 'string')
    );
  } catch {
    return [];
  }
}

function writeCalendarNotes(schoolId: string, notes: CalendarNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(schoolId), JSON.stringify(notes));
    window.dispatchEvent(new CustomEvent(CALENDAR_NOTES_UPDATED_EVENT, { detail: { schoolId } }));
  } catch {
    // ignore storage errors
  }
}

export function isCalendarNoteVisibleToUser(
  note: CalendarNote,
  currentUserId?: string,
  currentRole?: UserRole
): boolean {
  if (note.scope === 'school') return true;
  if (!currentUserId) return currentRole === 'admin' || currentRole === 'super_admin';
  return note.authorId === currentUserId;
}

export function getVisibleCalendarNotesForDate(
  schoolId: string,
  date: string,
  currentUserId?: string,
  currentRole?: UserRole
): CalendarNote[] {
  return loadCalendarNotes(schoolId)
    .filter((note) => note.date === date && isCalendarNoteVisibleToUser(note, currentUserId, currentRole))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getVisibleCalendarNotesMapForMonth(
  schoolId: string,
  year: number,
  month: number,
  currentUserId?: string,
  currentRole?: UserRole
): Map<string, CalendarNote[]> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const map = new Map<string, CalendarNote[]>();
  loadCalendarNotes(schoolId).forEach((note) => {
    if (!note.date.startsWith(prefix)) return;
    if (!isCalendarNoteVisibleToUser(note, currentUserId, currentRole)) return;
    const list = map.get(note.date) || [];
    list.push(note);
    map.set(note.date, list);
  });
  return map;
}

export function saveCalendarNote(input: {
  id?: string;
  schoolId: string;
  date: string;
  title: string;
  content: string;
  scope: CalendarNoteScope;
  color: CalendarNoteColor;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
}): CalendarNote {
  const existing = loadCalendarNotes(input.schoolId);
  const nowIso = new Date().toISOString();
  const noteId = input.id || `calnote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nextNote: CalendarNote = {
    id: noteId,
    schoolId: input.schoolId,
    date: input.date,
    title: input.title.trim(),
    content: input.content.trim(),
    scope: input.scope,
    color: input.color,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    updatedAt: nowIso,
  };
  const foundIdx = existing.findIndex((n) => n.id === noteId);
  const updated =
    foundIdx >= 0
      ? existing.map((n, idx) => (idx === foundIdx ? nextNote : n))
      : [nextNote, ...existing];
  writeCalendarNotes(input.schoolId, updated);
  return nextNote;
}

export function deleteCalendarNote(schoolId: string, noteId: string): void {
  const existing = loadCalendarNotes(schoolId);
  const filtered = existing.filter((n) => n.id !== noteId);
  writeCalendarNotes(schoolId, filtered);
}
