import { useEffect, useState } from 'react';

export type SchoolPolicyId =
  | 'teacher_grade_entry'
  | 'teacher_attendance'
  | 'teacher_homework'
  | 'teacher_sdq_screening'
  | 'teacher_infirmary_access'
  | 'student_view_grades'
  | 'student_submit_homework'
  | 'student_self_checkin'
  | 'student_treasure_game'
  | 'student_upload_portfolio'
  | 'parent_realtime_attendance';

export interface SchoolRolePolicy {
  id: SchoolPolicyId;
  role: 'teacher' | 'student' | 'parent';
  titleTh: string;
  descTh: string;
  category: 'academic' | 'student_care' | 'communication';
  enabled: boolean;
}

export type SchoolPermissionsState = Record<SchoolPolicyId, boolean>;

export const SCHOOL_PERMISSIONS_UPDATED_EVENT = 'eduverse:school-permissions-updated';

export const DEFAULT_SCHOOL_ROLE_POLICIES: SchoolRolePolicy[] = [
  {
    id: 'teacher_grade_entry',
    role: 'teacher',
    titleTh: 'อนุญาตให้ครูบันทึกและแก้ไขคะแนนสอบ ปพ.1',
    descTh: 'ครูประจำวิชาสามารถกรอกคะแนนเก็บ กลางภาค และปลายภาคได้โดยตรง',
    category: 'academic',
    enabled: true,
  },
  {
    id: 'teacher_attendance',
    role: 'teacher',
    titleTh: 'อนุญาตให้ครูเช็คชื่อเข้าแถวและเช็คชื่อรายคาบ',
    descTh: 'ครูสามารถบันทึกเวลาเรียนและสแกน QR Code ประจำคาบเรียนได้',
    category: 'academic',
    enabled: true,
  },
  {
    id: 'teacher_homework',
    role: 'teacher',
    titleTh: 'อนุญาตให้ครูสั่งการบ้านและตรวจงานออนไลน์ (LMS)',
    descTh: 'สร้างงาน มอบหมายแบบฝึกหัด และให้คะแนนพร้อมข้อเสนอแนะแก่นักเรียน',
    category: 'academic',
    enabled: true,
  },
  {
    id: 'teacher_sdq_screening',
    role: 'teacher',
    titleTh: 'อนุญาตให้ครูประเมินพฤติกรรม & คัดกรอง SDQ สพฐ.',
    descTh: 'บันทึกแบบประเมินจุดเด่นจุดพัฒนา และส่งต่อข้อมูลการดูแลช่วยเหลือนักเรียน',
    category: 'student_care',
    enabled: true,
  },
  {
    id: 'teacher_infirmary_access',
    role: 'teacher',
    titleTh: 'อนุญาตให้ครูดูประวัติสุขภาพและการรักษาห้องพยาบาล',
    descTh: 'ตรวจสอบข้อมูลการแพ้ยา ประวัติการเจ็บป่วย และการส่งตัวไปห้องพยาบาล',
    category: 'student_care',
    enabled: true,
  },
  {
    id: 'student_view_grades',
    role: 'student',
    titleTh: 'อนุญาตให้นักเรียนดูผลการเรียนและพิมพ์ใบรายงานผล',
    descTh: 'นักเรียนสามารถดูเกรดเฉลี่ย GPA และดาวน์โหลดเอกสาร ปพ. ได้ด้วยตนเอง',
    category: 'academic',
    enabled: true,
  },
  {
    id: 'student_submit_homework',
    role: 'student',
    titleTh: 'อนุญาตให้นักเรียนส่งการบ้านและไฟล์งานผ่านระบบ',
    descTh: 'อัปโหลดการบ้าน ตรวจสอบสถานะการส่ง และดูคะแนนที่ครูตรวจแล้ว',
    category: 'academic',
    enabled: true,
  },
  {
    id: 'student_self_checkin',
    role: 'student',
    titleTh: 'อนุญาตให้นักเรียนเช็คชื่อเข้า-ออกด้วยมือถือและพิกัด GPS',
    descTh: 'นักเรียนสามารถถ่ายเซลฟี่หรือสแกน QR ประจำคาบจากอุปกรณ์ของตนเองได้',
    category: 'student_care',
    enabled: true,
  },
  {
    id: 'student_treasure_game',
    role: 'student',
    titleTh: 'อนุญาตให้นักเรียนเข้าเล่น "เกมล่าสมบัติ 3D" และโหมดเกมการเรียนรู้',
    descTh: 'เข้าสู่สนามประลองความรู้ 3D เพื่อทำข้อสอบและสะสมเหรียญรางวัล',
    category: 'academic',
    enabled: true,
  },
  {
    id: 'student_upload_portfolio',
    role: 'student',
    titleTh: 'อนุญาตให้นักเรียนสร้างและอัปโหลดแฟ้มผลงาน Portfolio (TCAS)',
    descTh: 'บันทึกเกียรติบัตร กิจกรรม และผลงานเพื่อยื่นประกอบการศึกษาต่อ',
    category: 'student_care',
    enabled: true,
  },
  {
    id: 'parent_realtime_attendance',
    role: 'parent',
    titleTh: 'อนุญาตให้ผู้ปกครองดูเวลาผ่านประตูโรงเรียนแบบ Real-time',
    descTh: 'ตรวจสอบเวลาที่บุตรหลานสแกนบัตรผ่านประตูอัตโนมัติของโรงเรียน',
    category: 'student_care',
    enabled: true,
  },
];

export function getSchoolPermissionsStorageKey(schoolId: string): string {
  return `eduverse_school_perms_${schoolId || 'default'}`;
}

export function getSchoolRolePolicies(schoolId: string): SchoolRolePolicy[] {
  const fallback = DEFAULT_SCHOOL_ROLE_POLICIES.map((p) => ({ ...p }));
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(getSchoolPermissionsStorageKey(schoolId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SchoolRolePolicy>[];
    if (!Array.isArray(parsed)) return fallback;
    const savedById = new Map(parsed.map((item) => [item.id, item]));
    return fallback.map((def) => {
      const saved = savedById.get(def.id);
      return saved && typeof saved.enabled === 'boolean'
        ? { ...def, enabled: saved.enabled }
        : def;
    });
  } catch {
    return fallback;
  }
}

export function saveSchoolRolePolicies(schoolId: string, policies: SchoolRolePolicy[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getSchoolPermissionsStorageKey(schoolId), JSON.stringify(policies));
    window.dispatchEvent(
      new CustomEvent(SCHOOL_PERMISSIONS_UPDATED_EVENT, { detail: { schoolId, policies } })
    );
  } catch {
    // ignore storage quota errors
  }
}

export function getSchoolPermissionMap(schoolId: string): Record<SchoolPolicyId, boolean> {
  const list = getSchoolRolePolicies(schoolId);
  return list.reduce((acc, item) => {
    acc[item.id] = item.enabled;
    return acc;
  }, {} as Record<SchoolPolicyId, boolean>);
}

export function isSchoolPolicyEnabled(
  policyMap: Partial<Record<SchoolPolicyId, boolean>> | undefined,
  policyId: SchoolPolicyId
): boolean {
  if (!policyMap) return true;
  return policyMap[policyId] !== false;
}

export function useSchoolPermissions(schoolId: string): Record<SchoolPolicyId, boolean> {
  const [policyMap, setPolicyMap] = useState<Record<SchoolPolicyId, boolean>>(() =>
    getSchoolPermissionMap(schoolId)
  );

  useEffect(() => {
    setPolicyMap(getSchoolPermissionMap(schoolId));
    if (typeof window === 'undefined') return;
    const handleUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ schoolId?: string }>;
      if (!custom.detail?.schoolId || custom.detail.schoolId === schoolId) {
        setPolicyMap(getSchoolPermissionMap(schoolId));
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getSchoolPermissionsStorageKey(schoolId)) {
        setPolicyMap(getSchoolPermissionMap(schoolId));
      }
    };
    window.addEventListener(SCHOOL_PERMISSIONS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SCHOOL_PERMISSIONS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [schoolId]);

  return policyMap;
}
