export type HolidayType = 'public' | 'substitute' | 'royal' | 'buddhist' | 'school';

export interface ThaiHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  nameTh: string;
  nameEn: string;
  type: HolidayType;
  isSchoolDayOff: boolean;
  isSubstitute?: boolean;
  source?: 'official' | 'api' | 'school';
}

interface FixedHolidayDef {
  month: number; // 1-12
  day: number; // 1-31
  nameTh: string;
  nameEn: string;
  type: HolidayType;
}

const FIXED_THAI_HOLIDAYS: FixedHolidayDef[] = [
  { month: 1, day: 1, nameTh: 'วันขึ้นปีใหม่', nameEn: "New Year's Day", type: 'public' },
  { month: 4, day: 6, nameTh: 'วันจักรี', nameEn: 'Chakri Memorial Day', type: 'royal' },
  { month: 4, day: 13, nameTh: 'วันสงกรานต์', nameEn: 'Songkran Festival', type: 'public' },
  { month: 4, day: 14, nameTh: 'วันสงกรานต์ (วันครอบครัว)', nameEn: 'Songkran Festival (Family Day)', type: 'public' },
  { month: 4, day: 15, nameTh: 'วันสงกรานต์ (วันเถลิงศก)', nameEn: 'Songkran Festival', type: 'public' },
  { month: 5, day: 1, nameTh: 'วันแรงงานแห่งชาติ', nameEn: 'National Labour Day', type: 'public' },
  { month: 5, day: 4, nameTh: 'วันฉัตรมงคล', nameEn: 'Coronation Day', type: 'royal' },
  { month: 6, day: 3, nameTh: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', nameEn: "H.M. Queen Suthida's Birthday", type: 'royal' },
  { month: 7, day: 28, nameTh: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', nameEn: "H.M. King's Birthday", type: 'royal' },
  { month: 8, day: 12, nameTh: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ', nameEn: "H.M. Queen Mother's Birthday & Mother's Day", type: 'royal' },
  { month: 10, day: 13, nameTh: 'วันนวมินทรมหาราช', nameEn: 'H.M. King Bhumibol Adulyadej Memorial Day', type: 'royal' },
  { month: 10, day: 23, nameTh: 'วันปิยมหาราช', nameEn: 'Chulalongkorn Memorial Day', type: 'royal' },
  { month: 12, day: 5, nameTh: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', nameEn: "National Day & Father's Day", type: 'royal' },
  { month: 12, day: 10, nameTh: 'วันรัฐธรรมนูญ', nameEn: 'Constitution Day', type: 'public' },
  { month: 12, day: 31, nameTh: 'วันสิ้นปี', nameEn: "New Year's Eve", type: 'public' },
];

// Accurate lunar/astronomical Thai official holidays (Makha Bucha, Visakha Bucha, Asarnha Bucha, Khao Phansa, Royal Ploughing Day)
const LUNAR_THAI_HOLIDAYS_BY_YEAR: Record<number, Array<{ date: string; nameTh: string; nameEn: string; type: HolidayType }>> = {
  2024: [
    { date: '2024-02-24', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2024-05-10', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2024-05-22', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2024-07-20', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2024-07-21', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
  2025: [
    { date: '2025-02-12', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2025-05-09', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2025-05-11', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2025-07-10', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2025-07-11', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
  2026: [
    { date: '2026-03-03', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2026-05-13', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2026-05-31', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2026-07-29', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2026-07-30', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
  2027: [
    { date: '2027-02-21', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2027-05-14', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2027-05-20', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2027-07-18', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2027-07-19', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
  2028: [
    { date: '2028-02-10', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2028-05-08', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2028-05-11', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2028-07-06', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2028-07-07', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
  2029: [
    { date: '2029-02-27', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2029-05-11', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2029-05-27', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2029-07-25', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2029-07-26', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
  2030: [
    { date: '2030-02-17', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', type: 'buddhist' },
    { date: '2030-05-10', nameTh: 'วันพืชมงคล', nameEn: 'Royal Ploughing Ceremony Day', type: 'royal' },
    { date: '2030-05-16', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', type: 'buddhist' },
    { date: '2030-07-15', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', type: 'buddhist' },
    { date: '2030-07-16', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', type: 'buddhist' },
  ],
};

const API_CACHE_PREFIX = 'eduverse_thai_holidays_api_v1_';
const API_META_PREFIX = 'eduverse_thai_holidays_meta_v1_';
const SCHOOL_CUSTOM_PREFIX = 'eduverse_school_holidays_';
const SYNC_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface HolidaySyncStatus {
  year: number;
  syncedAt: string;
  provider: string;
  apiHolidayCount: number;
  totalHolidayCount: number;
  usedFallback: boolean;
}

export interface HolidaySyncResult extends HolidaySyncStatus {
  holidays: ThaiHoliday[];
}

function formatIsoDateUtc(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDateUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function addDaysIso(dateStr: string, days: number): string {
  const dt = parseIsoDateUtc(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatIsoDateUtc(dt);
}

function getApiCachedHolidays(year: number): ThaiHoliday[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${API_CACHE_PREFIX}${year}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPublicHolidaySyncStatus(year: number): HolidaySyncStatus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${API_META_PREFIX}${year}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HolidaySyncStatus;
    if (!parsed || typeof parsed.year !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePublicHolidaySyncStatus(status: HolidaySyncStatus): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${API_META_PREFIX}${status.year}`, JSON.stringify(status));
  } catch {
    // ignore storage errors
  }
}

export function getSchoolCustomHolidays(schoolId?: string): ThaiHoliday[] {
  if (typeof window === 'undefined' || !schoolId) return [];
  try {
    const raw = window.localStorage.getItem(`${SCHOOL_CUSTOM_PREFIX}${schoolId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSchoolCustomHolidays(schoolId: string, list: ThaiHoliday[]): void {
  if (typeof window === 'undefined' || !schoolId) return;
  try {
    window.localStorage.setItem(`${SCHOOL_CUSTOM_PREFIX}${schoolId}`, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('eduverse:holidays-updated', { detail: { schoolId } }));
  } catch {
    // ignore storage errors
  }
}

export function addSchoolCustomHoliday(
  schoolId: string,
  holiday: { date: string; nameTh: string; nameEn?: string; isSchoolDayOff?: boolean }
): ThaiHoliday[] {
  const existing = getSchoolCustomHolidays(schoolId);
  const entry: ThaiHoliday = {
    id: `sch-hol-${schoolId}-${holiday.date}-${Date.now()}`,
    date: holiday.date,
    nameTh: holiday.nameTh.trim(),
    nameEn: (holiday.nameEn || holiday.nameTh).trim(),
    type: 'school',
    isSchoolDayOff: holiday.isSchoolDayOff !== false,
    source: 'school',
  };
  const next = [...existing.filter((h) => !(h.date === entry.date && h.nameTh === entry.nameTh)), entry].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  saveSchoolCustomHolidays(schoolId, next);
  return next;
}

export function removeSchoolCustomHoliday(schoolId: string, holidayId: string): ThaiHoliday[] {
  const existing = getSchoolCustomHolidays(schoolId);
  const next = existing.filter((h) => h.id !== holidayId);
  saveSchoolCustomHolidays(schoolId, next);
  return next;
}

function buildOfficialThaiHolidaysForYear(year: number): ThaiHoliday[] {
  const baseList: ThaiHoliday[] = [];

  FIXED_THAI_HOLIDAYS.forEach((def) => {
    const date = `${year}-${String(def.month).padStart(2, '0')}-${String(def.day).padStart(2, '0')}`;
    baseList.push({
      id: `th-fixed-${date}`,
      date,
      nameTh: def.nameTh,
      nameEn: def.nameEn,
      type: def.type,
      isSchoolDayOff: true,
      source: 'official',
    });
  });

  const lunar = LUNAR_THAI_HOLIDAYS_BY_YEAR[year] || [];
  lunar.forEach((def) => {
    baseList.push({
      id: `th-lunar-${def.date}`,
      date: def.date,
      nameTh: def.nameTh,
      nameEn: def.nameEn,
      type: def.type,
      isSchoolDayOff: true,
      source: 'official',
    });
  });

  // Sort chronologically
  baseList.sort((a, b) => a.date.localeCompare(b.date));

  // Track occupied non-working holiday dates (plus weekends) to assign official substitute holidays (วันหยุดชดเชย)
  const occupiedDates = new Set(baseList.map((h) => h.date));
  const substitutes: ThaiHoliday[] = [];

  for (const h of baseList) {
    const dt = parseIsoDateUtc(h.date);
    const dayOfWeek = dt.getUTCDay(); // 0=Sun, 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      let candidate = addDaysIso(h.date, dayOfWeek === 6 ? 2 : 1);
      // Skip ahead if candidate is already a weekend or another holiday
      for (let guard = 0; guard < 7; guard += 1) {
        const cDate = parseIsoDateUtc(candidate);
        const cDow = cDate.getUTCDay();
        if (cDow !== 0 && cDow !== 6 && !occupiedDates.has(candidate)) {
          break;
        }
        candidate = addDaysIso(candidate, 1);
      }
      occupiedDates.add(candidate);
      substitutes.push({
        id: `th-sub-${candidate}-${h.date}`,
        date: candidate,
        nameTh: `วันหยุดชดเชย${h.nameTh}`,
        nameEn: `Substitution Holiday for ${h.nameEn}`,
        type: 'substitute',
        isSchoolDayOff: true,
        isSubstitute: true,
        source: 'official',
      });
    }
  }

  // Merge API-fetched holidays for additional official cabinet announcements if cached
  const apiCached = getApiCachedHolidays(year);
  const merged = [...baseList, ...substitutes];
  const existingKeys = new Set(merged.map((item) => item.date));
  apiCached.forEach((apiItem) => {
    if (!existingKeys.has(apiItem.date)) {
      merged.push(apiItem);
      existingKeys.add(apiItem.date);
    }
  });

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

export async function syncPublicHolidaysFromApi(
  year: number,
  options: { force?: boolean } = {}
): Promise<HolidaySyncResult> {
  const { force = false } = options;
  const cachedHolidays = buildOfficialThaiHolidaysForYear(year);

  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return {
      year,
      syncedAt: new Date().toISOString(),
      provider: 'ปฏิทินวันหยุดราชการไทย (ออฟไลน์)',
      apiHolidayCount: 0,
      totalHolidayCount: cachedHolidays.length,
      usedFallback: true,
      holidays: cachedHolidays,
    };
  }

  const existingMeta = getPublicHolidaySyncStatus(year);
  if (
    !force &&
    existingMeta &&
    !existingMeta.usedFallback &&
    Date.now() - new Date(existingMeta.syncedAt).getTime() < SYNC_STALE_MS
  ) {
    return {
      ...existingMeta,
      holidays: cachedHolidays,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/TH`, {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = (await response.json()) as Array<{
      date: string;
      localName: string;
      name: string;
      global?: boolean;
    }>;
    if (!Array.isArray(json)) {
      throw new Error('Invalid holiday payload');
    }
    const mapped: ThaiHoliday[] = json
      .filter((item) => Boolean(item.date && (item.localName || item.name)))
      .map((item) => {
        const label = item.localName || item.name;
        const isSubstitute = label.includes('ชดเชย') || (item.name || '').toLowerCase().includes('observed');
        return {
          id: `th-api-${item.date}`,
          date: item.date,
          nameTh: label,
          nameEn: item.name || item.localName,
          type: isSubstitute ? 'substitute' : 'public',
          isSchoolDayOff: true,
          isSubstitute,
          source: 'api',
        };
      });
    window.localStorage.setItem(`${API_CACHE_PREFIX}${year}`, JSON.stringify(mapped));
    const mergedHolidays = buildOfficialThaiHolidaysForYear(year);
    const status: HolidaySyncStatus = {
      year,
      syncedAt: new Date().toISOString(),
      provider: 'Public Holiday API (Thailand)',
      apiHolidayCount: mapped.length,
      totalHolidayCount: mergedHolidays.length,
      usedFallback: false,
    };
    savePublicHolidaySyncStatus(status);
    window.dispatchEvent(new CustomEvent('eduverse:holidays-updated', { detail: { year, status } }));
    return {
      ...status,
      holidays: mergedHolidays,
    };
  } catch {
    const fallbackStatus: HolidaySyncStatus = {
      year,
      syncedAt: new Date().toISOString(),
      provider: 'ปฏิทินวันหยุดราชการไทย (ข้อมูลสำรอง)',
      apiHolidayCount: getApiCachedHolidays(year).length,
      totalHolidayCount: cachedHolidays.length,
      usedFallback: true,
    };
    savePublicHolidaySyncStatus(fallbackStatus);
    window.dispatchEvent(new CustomEvent('eduverse:holidays-updated', { detail: { year, status: fallbackStatus } }));
    return {
      ...fallbackStatus,
      holidays: cachedHolidays,
    };
  }
}

export function getThaiHolidayCategoryLabel(holiday: ThaiHoliday, lang: 'th' | 'en' = 'th'): string {
  if (holiday.type === 'school') return lang === 'th' ? 'วันหยุดโรงเรียน' : 'School Holiday';
  if (holiday.type === 'substitute' || holiday.isSubstitute) {
    return lang === 'th' ? 'วันหยุดชดเชยราชการ' : 'Substitute Holiday';
  }
  if (holiday.type === 'buddhist') return lang === 'th' ? 'วันสำคัญทางพระพุทธศาสนา' : 'Buddhist Holiday';
  if (holiday.type === 'royal') return lang === 'th' ? 'วันพระราชพิธี/วันสำคัญราชการ' : 'Royal / National Holiday';
  return lang === 'th' ? 'วันหยุดราชการ' : 'Public Holiday';
}

export function getHolidaysForYear(year: number, schoolId?: string): ThaiHoliday[] {
  const official = buildOfficialThaiHolidaysForYear(year);
  const custom = getSchoolCustomHolidays(schoolId).filter((h) => h.date.startsWith(`${year}-`));
  return [...official, ...custom].sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidaysInMonth(year: number, monthIndex0: number, schoolId?: string): ThaiHoliday[] {
  const monthPrefix = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-`;
  return getHolidaysForYear(year, schoolId).filter((h) => h.date.startsWith(monthPrefix));
}

export function getHolidaysInRange(
  startDate: string,
  endDate: string,
  schoolId?: string
): ThaiHoliday[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) return [];
  const results: ThaiHoliday[] = [];
  for (let y = startYear; y <= endYear; y += 1) {
    results.push(...getHolidaysForYear(y, schoolId));
  }
  return results.filter((h) => h.date >= startDate && h.date <= endDate);
}

export function getHolidaysForDate(dateStr: string, schoolId?: string): ThaiHoliday[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
  const year = Number(dateStr.slice(0, 4));
  return getHolidaysForYear(year, schoolId).filter((h) => h.date === dateStr);
}

export function getHolidayForDate(dateStr: string, schoolId?: string): ThaiHoliday | null {
  const matches = getHolidaysForDate(dateStr, schoolId);
  if (matches.length === 0) return null;
  // Prefer school-defined holiday or primary official holiday
  return matches.find((h) => h.type === 'school') || matches[0];
}

export function getUpcomingHolidays(
  fromDateStr: string,
  withinDays = 30,
  schoolId?: string
): ThaiHoliday[] {
  const endDate = addDaysIso(fromDateStr, withinDays);
  return getHolidaysInRange(fromDateStr, endDate, schoolId);
}

export function isWeekendDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const dow = parseIsoDateUtc(dateStr).getUTCDay();
  return dow === 0 || dow === 6;
}
