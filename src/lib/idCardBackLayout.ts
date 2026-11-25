import type {
  AuthUser,
  Course,
  DayOfWeek,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../types';
import { slotMatchesLoggedInTeacher } from './courseTeacherFilter';
import { DEFAULT_SCHOOL_PERIODS } from './schoolPeriods';
import { filterTimetableSlotsForPersonalRole } from './studentDataScope';

export type IdCardBackMode =
  | 'rules_contact'
  | 'timetable'
  | 'medical_emergency'
  | 'qr_gate_pass';

export interface IdCardBackModeOption {
  id: IdCardBackMode;
  labelThStudent: string;
  labelThStaff: string;
  labelEnStudent: string;
  labelEnStaff: string;
  shortThStudent: string;
  shortThStaff: string;
  shortEnStudent: string;
  shortEnStaff: string;
}

export const ID_CARD_BACK_MODE_OPTIONS: ReadonlyArray<IdCardBackModeOption> = [
  {
    id: 'rules_contact',
    labelThStudent: 'ข้อกำหนดและติดต่อฉุกเฉิน',
    labelThStaff: 'ข้อกำหนดและติดต่อราชการ',
    labelEnStudent: 'Rules & Guardian Contact',
    labelEnStaff: 'Rules & Staff Contact',
    shortThStudent: 'ข้อกำหนดบัตร',
    shortThStaff: 'ข้อกำหนดบัตร',
    shortEnStudent: 'Rules',
    shortEnStaff: 'Rules',
  },
  {
    id: 'timetable',
    labelThStudent: 'ตารางเรียนประจำตัว (จ.-ศ.)',
    labelThStaff: 'ตารางสอนประจำตัว (จ.-ศ.)',
    labelEnStudent: 'Class Timetable (Mon-Fri)',
    labelEnStaff: 'Teaching Schedule (Mon-Fri)',
    shortThStudent: 'ตารางเรียน',
    shortThStaff: 'ตารางสอน',
    shortEnStudent: 'Timetable',
    shortEnStaff: 'Schedule',
  },
  {
    id: 'medical_emergency',
    labelThStudent: 'ข้อมูลสุขภาพและฉุกเฉิน',
    labelThStaff: 'ข้อมูลวิชาชีพและติดต่อฉุกเฉิน',
    labelEnStudent: 'Medical & Emergency Info',
    labelEnStaff: 'Credentials & Emergency',
    shortThStudent: 'สุขภาพ/ฉุกเฉิน',
    shortThStaff: 'วิชาชีพ/ฉุกเฉิน',
    shortEnStudent: 'Medical',
    shortEnStaff: 'Credentials',
  },
  {
    id: 'qr_gate_pass',
    labelThStudent: 'บัตรสแกน QR / บาร์โค้ดใหญ่',
    labelThStaff: 'บัตรสแกน QR / บาร์โค้ดใหญ่',
    labelEnStudent: 'Large Gate QR & Barcode',
    labelEnStaff: 'Large Gate QR & Barcode',
    shortThStudent: 'QR สแกนด่วน',
    shortThStaff: 'QR สแกนด่วน',
    shortEnStudent: 'Quick QR',
    shortEnStaff: 'Quick QR',
  },
];

const VALID_BACK_MODES = new Set<IdCardBackMode>(
  ID_CARD_BACK_MODE_OPTIONS.map((opt) => opt.id),
);

export function normalizeIdCardBackMode(value?: string | null): IdCardBackMode {
  if (value && VALID_BACK_MODES.has(value as IdCardBackMode)) {
    return value as IdCardBackMode;
  }
  return 'rules_contact';
}

function buildStorageKey(schoolId: string | undefined, cardType: 'student' | 'staff'): string {
  const safeSchoolId = (schoolId || 'default').trim() || 'default';
  return `eduverse:id-card-back-mode:${safeSchoolId}:${cardType}`;
}

export function getSavedIdCardBackMode(
  schoolId: string | undefined,
  cardType: 'student' | 'staff',
): IdCardBackMode {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'rules_contact';
    return normalizeIdCardBackMode(window.localStorage.getItem(buildStorageKey(schoolId, cardType)));
  } catch {
    return 'rules_contact';
  }
}

export function saveIdCardBackMode(
  schoolId: string | undefined,
  cardType: 'student' | 'staff',
  mode: IdCardBackMode,
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(buildStorageKey(schoolId, cardType), normalizeIdCardBackMode(mode));
  } catch {
    // Ignore storage quota or private-mode access errors
  }
}

export function getStudentTimetableSlots(
  student: Student | null | undefined,
  slots: readonly TimetableSlot[],
  courses: readonly Course[] = [],
): TimetableSlot[] {
  if (!student || slots.length === 0) return [];
  const syntheticUser: AuthUser = {
    id: student.id,
    email: '',
    fullNameTh: `${student.firstNameTh || ''} ${student.lastNameTh || ''}`.trim(),
    fullNameEn: `${student.firstNameEn || ''} ${student.lastNameEn || ''}`.trim(),
    role: 'student',
    schoolId: student.schoolId || '',
    avatarUrl: student.avatarUrl || '',
    lineConnected: Boolean(student.lineLinked),
    studentRecordId: student.id,
    studentIdNumber: student.studentIdNumber,
    gradeLevel: student.gradeLevel,
    room: student.room,
  };
  return filterTimetableSlotsForPersonalRole([...slots], syntheticUser, [student], [...courses]);
}

export function getTeacherTimetableSlots(
  teacher: Teacher | null | undefined,
  slots: readonly TimetableSlot[],
  courses: readonly Course[] = [],
): TimetableSlot[] {
  if (!teacher || slots.length === 0) return [];
  return slots.filter((slot) => slotMatchesLoggedInTeacher(slot, null, teacher, courses));
}

export interface CompactCardTimetableMatrix {
  days: Array<{ key: DayOfWeek; labelTh: string; labelEn: string }>;
  periods: number[];
  cellMap: Map<string, TimetableSlot[]>;
  totalWeeklyPeriods: number;
}

const WEEKDAYS: Array<{ key: DayOfWeek; labelTh: string; labelEn: string }> = [
  { key: 'mon', labelTh: 'จ', labelEn: 'M' },
  { key: 'tue', labelTh: 'อ', labelEn: 'T' },
  { key: 'wed', labelTh: 'พ', labelEn: 'W' },
  { key: 'thu', labelTh: 'พฤ', labelEn: 'Th' },
  { key: 'fri', labelTh: 'ศ', labelEn: 'F' },
];

export function buildCompactCardTimetableMatrix(
  personSlots: readonly TimetableSlot[],
  schoolPeriods: readonly SchoolPeriodTime[] = DEFAULT_SCHOOL_PERIODS,
  maxColumns = 8,
): CompactCardTimetableMatrix {
  const days = WEEKDAYS;

  const basePeriods = (schoolPeriods.length > 0 ? schoolPeriods : DEFAULT_SCHOOL_PERIODS)
    .filter((p) => !p.isBreak && p.periodNumber > 0)
    .map((p) => p.periodNumber);

  const slotPeriodNumbers = personSlots
    .map((s) => Number(s.periodNumber))
    .filter((n) => Number.isFinite(n) && n > 0);

  const mergedPeriods = Array.from(new Set([...basePeriods, ...slotPeriodNumbers])).sort(
    (a, b) => a - b,
  );

  let periods = mergedPeriods.length > 0 ? mergedPeriods : [1, 2, 3, 4, 5, 6];
  if (periods.length > maxColumns) {
    const slotPeriodSet = new Set(slotPeriodNumbers);
    const activePeriods = periods.filter((p) => slotPeriodSet.has(p));
    if (activePeriods.length >= maxColumns) {
      periods = activePeriods.slice(0, maxColumns);
    } else {
      const picked = new Set(activePeriods);
      for (const p of periods) {
        if (picked.size >= maxColumns) break;
        picked.add(p);
      }
      periods = Array.from(picked).sort((a, b) => a - b);
    }
  }

  const cellMap = new Map<string, TimetableSlot[]>();
  for (const slot of personSlots) {
    const dayKey = String(slot.dayOfWeek || '').toLowerCase();
    const key = `${dayKey}::${slot.periodNumber}`;
    const existing = cellMap.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      cellMap.set(key, [slot]);
    }
  }

  return {
    days,
    periods,
    cellMap,
    totalWeeklyPeriods: personSlots.length,
  };
}
