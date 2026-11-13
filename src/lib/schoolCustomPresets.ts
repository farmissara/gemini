import { useCallback, useEffect, useState } from 'react';
import { SchoolPeriodTime } from '../types';

export interface BehaviorPresetItem {
  label: string;
  points: number;
}

export interface BillingFeePresetItem {
  title: string;
  amount: number;
  category: string;
}

export interface AnnouncementCategoryPreset {
  id: string;
  labelTh: string;
  labelEn: string;
}

export interface SchoolCustomPresets {
  gradeLevels: string[];
  roomOptions: string[];
  departments: string[];
  courseCategories: string[];
  academicStandings: string[];
  behaviorMeritPresets: BehaviorPresetItem[];
  behaviorDemeritPresets: BehaviorPresetItem[];
  infirmaryTreatments: string[];
  infirmaryMedications: string[];
  infirmaryBeds: string[];
  announcementCategories: AnnouncementCategoryPreset[];
  billingFeePresets: BillingFeePresetItem[];
}

export const DEFAULT_SCHOOL_CUSTOM_PRESETS: SchoolCustomPresets = {
  gradeLevels: ['อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'],
  roomOptions: [
    'ป.1/1', 'ป.2/1', 'ป.3/1', 'ป.4/1', 'ป.5/1', 'ป.6/1',
    'ม.1/1', 'ม.1/2', 'ม.2/1', 'ม.2/2', 'ม.3/1', 'ม.3/2',
    'ม.4/1', 'ม.4/2', 'ม.5/1', 'ม.5/2', 'ม.6/1', 'ม.6/2',
    'ห้อง 401 (วิทย์-คณิต)', 'ห้อง 402 (ศิลป์-คำนวณ)',
  ],
  departments: [
    'กลุ่มสาระการเรียนรู้ภาษาไทย',
    'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม',
    'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา',
    'กลุ่มสาระการเรียนรู้ศิลปะ',
    'กลุ่มสาระการเรียนรู้การงานอาชีพ',
    'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
    'ฝ่ายบริหารงานทั่วไป / ธุรการ / บริการ',
    'ฝ่ายกิจการนักเรียน / แนะแนว',
  ],
  courseCategories: [
    'รายวิชาพื้นฐาน',
    'รายวิชาเพิ่มเติม',
    'กิจกรรมพัฒนาผู้เรียน / ชุมนุม',
    'หลักสูตร EP / International',
    'ติวเข้ม O-NET / A-Level / TGAT',
  ],
  academicStandings: [
    'ยังไม่มีวิทยฐานะ',
    'ครูผู้ช่วย',
    'ครู (คศ.1)',
    'ครูชำนาญการ (คศ.2)',
    'ครูชำนาญการพิเศษ (คศ.3)',
    'ครูเชี่ยวชาญ (คศ.4)',
    'ครูเชี่ยวชาญพิเศษ (คศ.5)',
    'ลูกจ้าง / พนักงานราชการ',
  ],
  behaviorMeritPresets: [
    { label: 'จิตอาสาบำเพ็ญประโยชน์ต่อส่วนรวม', points: 10 },
    { label: 'สร้างชื่อเสียงให้โรงเรียน (แข่งขันทักษะวิชาการ/กีฬา)', points: 15 },
    { label: 'ความมีน้ำใจและเอื้อเฟื้อต่อเพื่อนร่วมชั้น', points: 5 },
    { label: 'ความซื่อสัตย์สุจริต (เก็บของมีค่าได้ส่งคืนอาจารย์)', points: 10 },
  ],
  behaviorDemeritPresets: [
    { label: 'มาสายเข้าแถวเคารพธงชาติ', points: -5 },
    { label: 'หนีเรียน / ขาดเรียนโดยไม่มีใบลา', points: -10 },
    { label: 'แต่งกายไม่ถูกระเบียบสถานศึกษา', points: -5 },
    { label: 'ใช้โทรศัพท์มือถือในเวลาเรียนโดยไม่ได้รับอนุญาต', points: -5 },
    { label: 'พฤติกรรมก้าวร้าวหรือทะเลาะวิวาท', points: -20 },
  ],
  infirmaryTreatments: [
    'ให้นอนพักดื่มน้ำอุ่น และเช็ดตัวลดไข้',
    'ทำแผลเบื้องต้น ล้างแผลด้วยน้ำเกลือและทายาฆ่าเชื้อ',
    'ประคบเย็นลดบวม และพักสังเกตอาการ 30 นาที',
    'พักดื่มน้ำเกลือแร่ สังเกตอาการปวดท้อง/คลื่นไส้',
    'ติดต่อผู้ปกครองมารับกลับบ้านหรือส่งต่อโรงพยาบาล',
  ],
  infirmaryMedications: [
    'Paracetamol 500mg 1 เม็ด',
    'Paracetamol น้ำ 10 ml',
    'ยาธาตุน้ำขาว / ยาลดกรด',
    'ผงเกลือแร่ ORS 1 ซอง',
    'ยาแก้แพ้ CPM / Cetirizine (เฉพาะรายไม่แพ้ยา)',
    'ไม่จ่ายยา (ทำแผล / พักสังเกตอาการ)',
  ],
  infirmaryBeds: ['เตียง 1', 'เตียง 2', 'เตียง 3', 'เตียง 4'],
  announcementCategories: [
    { id: 'academic', labelTh: 'วิชาการ / การสอบ', labelEn: 'Academic' },
    { id: 'urgent', labelTh: 'ประกาศด่วน', labelEn: 'Urgent' },
    { id: 'event', labelTh: 'กิจกรรม / ประชุมผู้ปกครอง', labelEn: 'Event' },
    { id: 'finance', labelTh: 'การเงิน / ค่าเทอม', labelEn: 'Finance' },
  ],
  billingFeePresets: [
    { title: 'ค่าบำรุงการศึกษาประจำภาคเรียน', amount: 3500, category: 'tuition' },
    { title: 'ค่าห้องเรียนพิเศษ (EP / วิทย์-คณิต)', amount: 6500, category: 'special_program' },
    { title: 'ค่าอาหารกลางวันและนมโรงเรียน', amount: 1800, category: 'meal' },
    { title: 'ค่าทัศนศึกษา / กิจกรรมพัฒนาผู้เรียน', amount: 850, category: 'activity' },
    { title: 'ค่าหนังสือเรียนและเอกสารประกอบการเรียน', amount: 1200, category: 'books' },
  ],
};

const PRESET_STORAGE_PREFIX = 'eduverse_school_custom_presets_v1:';
const PERIODS_CACHE_PREFIX = 'eduverse_school_periods_cache_v1:';
const PRESET_EVENT = 'eduverse:school-custom-presets-updated';

function sanitizePresets(raw: Partial<SchoolCustomPresets> | null | undefined): SchoolCustomPresets {
  const cleanStrList = (arr: unknown, fallback: string[]) => {
    if (!Array.isArray(arr)) return fallback;
    const cleaned = arr.map((item) => String(item || '').trim()).filter(Boolean);
    return cleaned.length > 0 ? [...new Set(cleaned)] : fallback;
  };
  return {
    gradeLevels: cleanStrList(raw?.gradeLevels, DEFAULT_SCHOOL_CUSTOM_PRESETS.gradeLevels),
    roomOptions: cleanStrList(raw?.roomOptions, DEFAULT_SCHOOL_CUSTOM_PRESETS.roomOptions),
    departments: cleanStrList(raw?.departments, DEFAULT_SCHOOL_CUSTOM_PRESETS.departments),
    courseCategories: cleanStrList(raw?.courseCategories, DEFAULT_SCHOOL_CUSTOM_PRESETS.courseCategories),
    academicStandings: cleanStrList(raw?.academicStandings, DEFAULT_SCHOOL_CUSTOM_PRESETS.academicStandings),
    behaviorMeritPresets:
      Array.isArray(raw?.behaviorMeritPresets) && raw.behaviorMeritPresets.length > 0
        ? raw.behaviorMeritPresets.map((item) => ({
            label: String(item.label || '').trim(),
            points: Math.abs(Number(item.points) || 5),
          })).filter((i) => i.label)
        : DEFAULT_SCHOOL_CUSTOM_PRESETS.behaviorMeritPresets,
    behaviorDemeritPresets:
      Array.isArray(raw?.behaviorDemeritPresets) && raw.behaviorDemeritPresets.length > 0
        ? raw.behaviorDemeritPresets.map((item) => ({
            label: String(item.label || '').trim(),
            points: -Math.abs(Number(item.points) || 5),
          })).filter((i) => i.label)
        : DEFAULT_SCHOOL_CUSTOM_PRESETS.behaviorDemeritPresets,
    infirmaryTreatments: cleanStrList(raw?.infirmaryTreatments, DEFAULT_SCHOOL_CUSTOM_PRESETS.infirmaryTreatments),
    infirmaryMedications: cleanStrList(raw?.infirmaryMedications, DEFAULT_SCHOOL_CUSTOM_PRESETS.infirmaryMedications),
    infirmaryBeds: cleanStrList(raw?.infirmaryBeds, DEFAULT_SCHOOL_CUSTOM_PRESETS.infirmaryBeds),
    announcementCategories:
      Array.isArray(raw?.announcementCategories) && raw.announcementCategories.length > 0
        ? raw.announcementCategories.map((c) => ({
            id: String(c.id || '').trim() || `cat-${Date.now()}`,
            labelTh: String(c.labelTh || '').trim() || String(c.id || ''),
            labelEn: String(c.labelEn || '').trim() || String(c.id || ''),
          }))
        : DEFAULT_SCHOOL_CUSTOM_PRESETS.announcementCategories,
    billingFeePresets:
      Array.isArray(raw?.billingFeePresets) && raw.billingFeePresets.length > 0
        ? raw.billingFeePresets.map((f) => ({
            title: String(f.title || '').trim(),
            amount: Math.max(0, Number(f.amount) || 0),
            category: String(f.category || 'tuition').trim(),
          })).filter((f) => f.title)
        : DEFAULT_SCHOOL_CUSTOM_PRESETS.billingFeePresets,
  };
}

export function loadSchoolCustomPresets(schoolId = 'default-school'): SchoolCustomPresets {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_CUSTOM_PRESETS;
  try {
    const raw = localStorage.getItem(`${PRESET_STORAGE_PREFIX}${schoolId}`);
    if (!raw) return DEFAULT_SCHOOL_CUSTOM_PRESETS;
    return sanitizePresets(JSON.parse(raw));
  } catch {
    return DEFAULT_SCHOOL_CUSTOM_PRESETS;
  }
}

export function saveSchoolCustomPresets(
  schoolId: string,
  updates: Partial<SchoolCustomPresets>
): SchoolCustomPresets {
  const current = loadSchoolCustomPresets(schoolId);
  const next = sanitizePresets({ ...current, ...updates });
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${PRESET_STORAGE_PREFIX}${schoolId}`, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(PRESET_EVENT, { detail: { schoolId, presets: next } }));
    } catch {
      // Ignore storage quota issues
    }
  }
  return next;
}

export function useSchoolCustomPresets(schoolId = 'default-school') {
  const [presets, setPresets] = useState<SchoolCustomPresets>(() => loadSchoolCustomPresets(schoolId));

  useEffect(() => {
    setPresets(loadSchoolCustomPresets(schoolId));
  }, [schoolId]);

  useEffect(() => {
    const onUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<{ schoolId: string; presets: SchoolCustomPresets }>).detail;
      if (!detail || detail.schoolId === schoolId) {
        setPresets(loadSchoolCustomPresets(schoolId));
      }
    };
    window.addEventListener(PRESET_EVENT, onUpdate);
    return () => window.removeEventListener(PRESET_EVENT, onUpdate);
  }, [schoolId]);

  const updatePresets = useCallback(
    (updates: Partial<SchoolCustomPresets>) => {
      const next = saveSchoolCustomPresets(schoolId, updates);
      setPresets(next);
      return next;
    },
    [schoolId]
  );

  const resetPresets = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${PRESET_STORAGE_PREFIX}${schoolId}`);
    }
    setPresets(DEFAULT_SCHOOL_CUSTOM_PRESETS);
    return DEFAULT_SCHOOL_CUSTOM_PRESETS;
  }, [schoolId]);

  return { presets, updatePresets, resetPresets };
}

export function loadCachedSchoolPeriods(schoolId: string): SchoolPeriodTime[] | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  try {
    const raw = localStorage.getItem(`${PERIODS_CACHE_PREFIX}${schoolId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedSchoolPeriods(schoolId: string, periods: SchoolPeriodTime[]): void {
  if (typeof window === 'undefined' || !schoolId) return;
  try {
    localStorage.setItem(`${PERIODS_CACHE_PREFIX}${schoolId}`, JSON.stringify(periods));
  } catch {
    // Ignore storage quota errors
  }
}
