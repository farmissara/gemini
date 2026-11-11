import { StudentStatus } from '../types';

export interface GradeLevelOption {
  value: string;
  labelTh: string;
  labelEn: string;
  category: 'kindergarten' | 'primary' | 'lower_secondary' | 'upper_secondary' | 'vocational' | 'other';
}

export const ALL_GRADE_LEVELS: GradeLevelOption[] = [
  // Kindergarten (ปฐมวัย / อนุบาล)
  { value: 'อนุบาล 1 (K.1)', labelTh: 'อนุบาล 1 (อ.1)', labelEn: 'Kindergarten 1 (K.1)', category: 'kindergarten' },
  { value: 'อนุบาล 2 (K.2)', labelTh: 'อนุบาล 2 (อ.2)', labelEn: 'Kindergarten 2 (K.2)', category: 'kindergarten' },
  { value: 'อนุบาล 3 (K.3)', labelTh: 'อนุบาล 3 (อ.3)', labelEn: 'Kindergarten 3 (K.3)', category: 'kindergarten' },

  // Primary (ประถมศึกษา / ป.1 - ป.6)
  { value: 'ประถมศึกษาปีที่ 1 (P.1)', labelTh: 'ประถมศึกษาปีที่ 1 (ป.1)', labelEn: 'Primary 1 (Grade 1)', category: 'primary' },
  { value: 'ประถมศึกษาปีที่ 2 (P.2)', labelTh: 'ประถมศึกษาปีที่ 2 (ป.2)', labelEn: 'Primary 2 (Grade 2)', category: 'primary' },
  { value: 'ประถมศึกษาปีที่ 3 (P.3)', labelTh: 'ประถมศึกษาปีที่ 3 (ป.3)', labelEn: 'Primary 3 (Grade 3)', category: 'primary' },
  { value: 'ประถมศึกษาปีที่ 4 (P.4)', labelTh: 'ประถมศึกษาปีที่ 4 (ป.4)', labelEn: 'Primary 4 (Grade 4)', category: 'primary' },
  { value: 'ประถมศึกษาปีที่ 5 (P.5)', labelTh: 'ประถมศึกษาปีที่ 5 (ป.5)', labelEn: 'Primary 5 (Grade 5)', category: 'primary' },
  { value: 'ประถมศึกษาปีที่ 6 (P.6)', labelTh: 'ประถมศึกษาปีที่ 6 (ป.6)', labelEn: 'Primary 6 (Grade 6)', category: 'primary' },

  // Lower Secondary (มัธยมศึกษาตอนต้น / ม.1 - ม.3)
  { value: 'มัธยมศึกษาปีที่ 1 (M.1)', labelTh: 'มัธยมศึกษาปีที่ 1 (ม.1)', labelEn: 'Secondary 1 (Grade 7)', category: 'lower_secondary' },
  { value: 'มัธยมศึกษาปีที่ 2 (M.2)', labelTh: 'มัธยมศึกษาปีที่ 2 (ม.2)', labelEn: 'Secondary 2 (Grade 8)', category: 'lower_secondary' },
  { value: 'มัธยมศึกษาปีที่ 3 (M.3)', labelTh: 'มัธยมศึกษาปีที่ 3 (ม.3)', labelEn: 'Secondary 3 (Grade 9)', category: 'lower_secondary' },

  // Upper Secondary (มัธยมศึกษาตอนปลาย / ม.4 - ม.6)
  { value: 'มัธยมศึกษาปีที่ 4 (M.4)', labelTh: 'มัธยมศึกษาปีที่ 4 (ม.4)', labelEn: 'Secondary 4 / Grade 10', category: 'upper_secondary' },
  { value: 'มัธยมศึกษาปีที่ 5 (M.5)', labelTh: 'มัธยมศึกษาปีที่ 5 (ม.5)', labelEn: 'Secondary 5 / Grade 11', category: 'upper_secondary' },
  { value: 'มัธยมศึกษาปีที่ 6 (M.6)', labelTh: 'มัธยมศึกษาปีที่ 6 (ม.6)', labelEn: 'Secondary 6 / Grade 12', category: 'upper_secondary' },

  // Vocational (ประกาศนียบัตรวิชาชีพ / ปวช.)
  { value: 'ปวช. 1 (Vocational 1)', labelTh: 'ปวช. 1', labelEn: 'Vocational Certificate 1', category: 'vocational' },
  { value: 'ปวช. 2 (Vocational 2)', labelTh: 'ปวช. 2', labelEn: 'Vocational Certificate 2', category: 'vocational' },
  { value: 'ปวช. 3 (Vocational 3)', labelTh: 'ปวช. 3', labelEn: 'Vocational Certificate 3', category: 'vocational' },
];

export interface StudentStatusDetail {
  value: StudentStatus;
  labelTh: string;
  labelEn: string;
  badgeClasses: string;
  dotColor: string;
  descriptionTh: string;
}

export const STUDENT_STATUS_DETAILS: Record<StudentStatus, StudentStatusDetail> = {
  active: {
    value: 'active',
    labelTh: 'กำลังศึกษา',
    labelEn: 'Enrolled / Active',
    badgeClasses: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    dotColor: 'bg-emerald-500',
    descriptionTh: 'นักเรียนมีสถานะเป็นนักเรียนปัจจุบันของโรงเรียน',
  },
  transferred_in: {
    value: 'transferred_in',
    labelTh: 'ย้ายเข้า',
    labelEn: 'Transferred In',
    badgeClasses: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700',
    dotColor: 'bg-cyan-500',
    descriptionTh: 'นักเรียนที่ย้ายมาจากสถานศึกษาอื่นในระหว่างปีการศึกษา',
  },
  transferred_out: {
    value: 'transferred_out',
    labelTh: 'ย้ายออก',
    labelEn: 'Transferred Out',
    badgeClasses: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    dotColor: 'bg-amber-500',
    descriptionTh: 'นักเรียนที่ย้ายไปศึกษาต่อยังสถานศึกษาอื่น',
  },
  transferred: {
    value: 'transferred',
    labelTh: 'ย้ายสถานศึกษา',
    labelEn: 'Transferred',
    badgeClasses: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    dotColor: 'bg-amber-500',
    descriptionTh: 'นักเรียนที่ย้ายสถานศึกษา',
  },
  graduated: {
    value: 'graduated',
    labelTh: 'สำเร็จการศึกษา',
    labelEn: 'Graduated',
    badgeClasses: 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700',
    dotColor: 'bg-purple-500',
    descriptionTh: 'จบการศึกษาตามเกณฑ์หลักสูตรและได้รับอนุมัติผลการเรียนแล้ว',
  },
  suspended: {
    value: 'suspended',
    labelTh: 'พักการเรียน',
    labelEn: 'Suspended / On Leave',
    badgeClasses: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    dotColor: 'bg-yellow-500',
    descriptionTh: 'พักการเรียนชั่วคราวเนื่องจากปัญหาสุขภาพหรือเหตุจำเป็น',
  },
  resigned: {
    value: 'resigned',
    labelTh: 'ลาออก',
    labelEn: 'Resigned',
    badgeClasses: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700',
    dotColor: 'bg-rose-500',
    descriptionTh: 'ผู้ปกครองหรือนักเรียนยื่นคำร้องขอลาออกจากการศึกษา',
  },
  dropped: {
    value: 'dropped',
    labelTh: 'พ้นสภาพนักเรียน',
    labelEn: 'Dropped / Discharged',
    badgeClasses: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-500',
    descriptionTh: 'จำหน่ายชื่อออกตามระเบียบกระทรวงศึกษาธิการ (ขาดเรียนเกินกำหนด ฯลฯ)',
  },
};

/**
 * Predict next grade level for academic year promotion
 */
export function getNextGradeLevel(currentGrade: string): { nextGrade: string; isGraduating: boolean } {
  const g = currentGrade.trim();

  // Kindergarten progression
  if (g.includes('อนุบาล 1') || g.includes('K.1') || g.includes('อ.1')) {
    return { nextGrade: 'อนุบาล 2 (K.2)', isGraduating: false };
  }
  if (g.includes('อนุบาล 2') || g.includes('K.2') || g.includes('อ.2')) {
    return { nextGrade: 'อนุบาล 3 (K.3)', isGraduating: false };
  }
  if (g.includes('อนุบาล 3') || g.includes('K.3') || g.includes('อ.3')) {
    return { nextGrade: 'ประถมศึกษาปีที่ 1 (P.1)', isGraduating: false };
  }

  // Primary progression
  if (g.includes('ประถมศึกษาปีที่ 1') || g.includes('P.1') || g.includes('ป.1') || g === 'Grade 1') {
    return { nextGrade: 'ประถมศึกษาปีที่ 2 (P.2)', isGraduating: false };
  }
  if (g.includes('ประถมศึกษาปีที่ 2') || g.includes('P.2') || g.includes('ป.2') || g === 'Grade 2') {
    return { nextGrade: 'ประถมศึกษาปีที่ 3 (P.3)', isGraduating: false };
  }
  if (g.includes('ประถมศึกษาปีที่ 3') || g.includes('P.3') || g.includes('ป.3') || g === 'Grade 3') {
    return { nextGrade: 'ประถมศึกษาปีที่ 4 (P.4)', isGraduating: false };
  }
  if (g.includes('ประถมศึกษาปีที่ 4') || g.includes('P.4') || g.includes('ป.4') || g === 'Grade 4') {
    return { nextGrade: 'ประถมศึกษาปีที่ 5 (P.5)', isGraduating: false };
  }
  if (g.includes('ประถมศึกษาปีที่ 5') || g.includes('P.5') || g.includes('ป.5') || g === 'Grade 5') {
    return { nextGrade: 'ประถมศึกษาปีที่ 6 (P.6)', isGraduating: false };
  }
  if (g.includes('ประถมศึกษาปีที่ 6') || g.includes('P.6') || g.includes('ป.6') || g === 'Grade 6') {
    return { nextGrade: 'มัธยมศึกษาปีที่ 1 (M.1)', isGraduating: false };
  }

  // Lower Secondary progression
  if (g.includes('มัธยมศึกษาปีที่ 1') || g.includes('M.1') || g.includes('ม.1') || g === 'Grade 7') {
    return { nextGrade: 'มัธยมศึกษาปีที่ 2 (M.2)', isGraduating: false };
  }
  if (g.includes('มัธยมศึกษาปีที่ 2') || g.includes('M.2') || g.includes('ม.2') || g === 'Grade 8') {
    return { nextGrade: 'มัธยมศึกษาปีที่ 3 (M.3)', isGraduating: false };
  }
  if (g.includes('มัธยมศึกษาปีที่ 3') || g.includes('M.3') || g.includes('ม.3') || g === 'Grade 9') {
    return { nextGrade: 'มัธยมศึกษาปีที่ 4 (M.4)', isGraduating: false };
  }

  // Upper Secondary progression
  if (g.includes('มัธยมศึกษาปีที่ 4') || g.includes('M.4') || g.includes('ม.4') || g.includes('Grade 10')) {
    return { nextGrade: 'มัธยมศึกษาปีที่ 5 (M.5)', isGraduating: false };
  }
  if (g.includes('มัธยมศึกษาปีที่ 5') || g.includes('M.5') || g.includes('ม.5') || g.includes('Grade 11')) {
    return { nextGrade: 'มัธยมศึกษาปีที่ 6 (M.6)', isGraduating: false };
  }
  if (g.includes('มัธยมศึกษาปีที่ 6') || g.includes('M.6') || g.includes('ม.6') || g.includes('Grade 12')) {
    return { nextGrade: 'สำเร็จการศึกษา (Graduated)', isGraduating: true };
  }

  // Vocational progression
  if (g.includes('ปวช. 1') || g.includes('Vocational 1')) {
    return { nextGrade: 'ปวช. 2 (Vocational 2)', isGraduating: false };
  }
  if (g.includes('ปวช. 2') || g.includes('Vocational 2')) {
    return { nextGrade: 'ปวช. 3 (Vocational 3)', isGraduating: false };
  }
  if (g.includes('ปวช. 3') || g.includes('Vocational 3')) {
    return { nextGrade: 'สำเร็จการศึกษา (Graduated)', isGraduating: true };
  }

  return { nextGrade: currentGrade, isGraduating: false };
}

/**
 * Predict next room based on current room naming pattern
 * e.g. "Room 401 (Sci-Math)" -> "Room 501 (Sci-Math)"
 * e.g. "ม.4/1" -> "ม.5/1"
 * e.g. "ป.1/2" -> "ป.2/2"
 */
export function getNextRoom(currentRoom: string): string {
  if (!currentRoom) return '';
  // Try pattern like 401 -> 501
  const numMatch = currentRoom.match(/(\d)(\d{2})/);
  if (numMatch) {
    const leadingDigit = Number(numMatch[1]);
    if (leadingDigit >= 1 && leadingDigit <= 5) {
      const replaced = currentRoom.replace(numMatch[0], `${leadingDigit + 1}${numMatch[2]}`);
      return replaced;
    }
  }

  // Try pattern like ม.4/1 -> ม.5/1
  const thaiMatch = currentRoom.match(/([มอุป]\.)(\d)(\/\d+)/);
  if (thaiMatch) {
    const digit = Number(thaiMatch[2]);
    if (digit >= 1 && digit <= 5) {
      return currentRoom.replace(thaiMatch[0], `${thaiMatch[1]}${digit + 1}${thaiMatch[3]}`);
    }
  }

  return currentRoom;
}
