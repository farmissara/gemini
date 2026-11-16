import { AppLanguage, UserRole } from '../types';
import { NavTab } from '../components/layout/Sidebar';
import studentInviteImg from '../assets/images/login_guide_student_invite_1794551973156.jpg';
import studentSigninImg from '../assets/images/login_guide_student_signin_1794551974303.jpg';
import teacherSigninImg from '../assets/images/login_guide_teacher_signin_1794551974875.jpg';

export type GuideAudience = 'all' | 'teacher' | 'student' | 'admin' | 'parent';
export type MascotMood =
  | 'happy'
  | 'pointing'
  | 'thinking'
  | 'celebrate'
  | 'success'
  | 'warning'
  | 'error';

export interface RoleOverrideText {
  summaryTh?: string;
  summaryEn?: string;
  howToTh?: string[];
  howToEn?: string[];
  tipTh?: string;
  tipEn?: string;
}

export interface InteractiveGuideTopic {
  id: string;
  titleTh: string;
  titleEn: string;
  audience: GuideAudience;
  mood: MascotMood;
  summaryTh: string;
  summaryEn: string;
  howToTh: string[];
  howToEn: string[];
  tipTh?: string;
  tipEn?: string;
  targetTab?: NavTab;
  guideModuleId?: string;
  roleOverrides?: Partial<Record<UserRole, RoleOverrideText>>;
}

export interface IllustratedWorkflowStep {
  id: string;
  stepNumber: string;
  role: 'student' | 'teacher';
  titleTh: string;
  titleEn: string;
  summaryTh: string;
  summaryEn: string;
  detailsTh: string[];
  detailsEn: string[];
  tipTh: string;
  tipEn: string;
  imageSrc: string;
  captionTh: string;
  captionEn: string;
  targetTab?: NavTab;
}

export const INTERACTIVE_GUIDE_TOPICS: Record<string, InteractiveGuideTopic> = {
  // ---------------------------------------------------------------------------
  // NAVBAR & GLOBAL SHELL CONTROLS
  // ---------------------------------------------------------------------------
  'nav-school-switcher': {
    id: 'nav-school-switcher',
    titleTh: 'สลับโรงเรียน / วิทยาเขต',
    titleEn: 'School & Campus Switcher',
    audience: 'all',
    mood: 'pointing',
    summaryTh: 'กดเพื่อเปลี่ยนโรงเรียนหรือวิทยาเขตที่ต้องการดูข้อมูล (รองรับหลายสาขาในบัญชีเดียว)',
    summaryEn: 'Switch between schools or campuses linked to your account in one click.',
    howToTh: [
      'คลิกที่ชื่อโรงเรียนบนแถบด้านบน',
      'เลือกโรงเรียนหรือวิทยาเขตที่ต้องการตรวจสอบ',
    ],
    howToEn: [
      'Click the school name button in the top bar.',
      'Select the campus you want to inspect.',
    ],
    tipTh: 'ข้อมูลนักเรียน รายวิชา และสถิติจะเปลี่ยนตามสาขาที่เลือกทันที',
    tipEn: 'Students, courses, and analytics refresh immediately for the selected campus.',
  },
  'nav-program-school_erp': {
    id: 'nav-program-school_erp',
    titleTh: 'โหมดบริหารโรงเรียน (School SIS)',
    titleEn: 'School SIS Operations Mode',
    audience: 'all',
    mood: 'happy',
    summaryTh: 'มุมมองหลักสำหรับงานทะเบียน เช็คชื่อ ตารางสอน บันทึกเกรด ปพ. และงานธุรการโรงเรียน',
    summaryEn: 'Primary workspace for attendance, timetable, grading, student records, and school operations.',
    howToTh: [
      'กดปุ่ม "บริหารโรงเรียน" เพื่อกลับมายังเมนูจัดการหลักทั้งหมด',
      'ใช้เมนูด้านซ้ายเพื่อเลือกโมดูลที่ต้องการทำงาน',
    ],
    howToEn: [
      'Click "School SIS" to return to the core school operations workspace.',
      'Use the left sidebar to pick any module.',
    ],
  },
  'nav-program-lms_classroom': {
    id: 'nav-program-lms_classroom',
    titleTh: 'โหมดห้องเรียนออนไลน์ (Virtual LMS)',
    titleEn: 'Virtual LMS Classroom',
    audience: 'all',
    mood: 'celebrate',
    summaryTh: 'สลับเข้าสู่ห้องเรียนออนไลน์ ดูคลิปบทเรียน ดาวน์โหลดเอกสาร และส่งใบงานการบ้าน',
    summaryEn: 'Switch into online classrooms for video lessons, downloadable sheets, and homework submissions.',
    howToTh: [
      'คลิก "ห้องเรียน LMS" ด้านบน',
      'เลือกรายวิชาและบทเรียนที่ต้องการเรียน หรือส่งการบ้าน',
    ],
    howToEn: [
      'Click "Virtual LMS" in the top mode bar.',
      'Select a course and lesson to watch videos or submit assignments.',
    ],
    roleOverrides: {
      student: {
        summaryTh: 'เข้าเรียนบทเรียนวิดีโอ ดาวน์โหลดชีทสรุป และกดทำเครื่องหมายเรียนจบหรือส่งงานได้ที่นี่',
        howToTh: ['เลือกวิชาทางขวาเพื่อดูคลิปบทเรียน', 'กด "ทำเครื่องหมายว่าเรียนจบแล้ว" เพื่อสะสมความก้าวหน้า'],
      },
      teacher: {
        summaryTh: 'เปิดใช้ห้องเรียนออนไลน์ แนบวิดีโอบทเรียน ชีท PDF และติดตามการส่งงานของนักเรียน',
        howToTh: ['สลับมาโหมด LMS เพื่อตรวจความพร้อมบทเรียน', 'สลับแท็บไปที่ "การบ้าน & ใบงาน" เพื่อตรวจงานนักเรียน'],
      },
    },
  },
  'nav-program-parent_portal': {
    id: 'nav-program-parent_portal',
    titleTh: 'พอร์ทัลผู้ปกครอง (Parent Portal)',
    titleEn: 'Parent Portal View',
    audience: 'parent',
    mood: 'happy',
    summaryTh: 'ติดตามเวลาเข้าเรียน ผลการเรียน และใบแจ้งค่าเทอมของบุตรหลานในมุมมองเข้าใจง่าย',
    summaryEn: 'Track child attendance logs, grades, and tuition invoices in a parent-friendly view.',
    howToTh: [
      'คลิก "ผู้ปกครอง" เพื่อดูข้อมูลแบบสรุปสำหรับผู้ปกครอง',
      'สลับดูแท็บผลการเรียน ประวัติเข้าเรียน และใบแจ้งหนี้ค่าเทอม',
    ],
    howToEn: [
      'Click "Parent Portal" to switch into the family summary view.',
      'Browse tabs for attendance logs, report cards, and tuition bills.',
    ],
  },
  'nav-quick-search': {
    id: 'nav-quick-search',
    titleTh: 'ค้นหาด่วน (Quick Search)',
    titleEn: 'Quick Workspace Search',
    audience: 'all',
    mood: 'thinking',
    summaryTh: 'พิมพ์ชื่อนักเรียน รหัสวิชา หรือคำค้นเพื่อกรองข้อมูลที่กำลังเปิดอยู่อย่างรวดเร็ว',
    summaryEn: 'Type a student name, course code, or keyword to filter records across your active view.',
    howToTh: [
      'พิมพ์คำค้นหาในช่อง "ค้นหาด่วน..."',
      'ผลลัพธ์ในตารางหรือรายการจะถูกคัดกรองอัตโนมัติ',
    ],
    howToEn: [
      'Type any keyword into Quick Search.',
      'Records in supported views update immediately.',
    ],
  },
  'nav-theme-toggle': {
    id: 'nav-theme-toggle',
    titleTh: 'สลับโหมดสว่าง / โหมดมืดถนอมสายตา',
    titleEn: 'Eye-Care Light / Dark Theme',
    audience: 'all',
    mood: 'happy',
    summaryTh: 'เลือกโทนสว่างนวลตาสำหรับกลางวัน หรือโหมดมืด Sapphire สำหรับทำงานตอนกลางคืน',
    summaryEn: 'Toggle between Warm Eye-Care Light mode and Sapphire Dark mode.',
    howToTh: ['กดไอคอนพระอาทิตย์ (สว่าง) หรือพระจันทร์ (มืด)'],
    howToEn: ['Click Sun for Light mode or Moon for Dark mode.'],
  },
  'nav-lang-toggle': {
    id: 'nav-lang-toggle',
    titleTh: 'สลับภาษา ไทย / English',
    titleEn: 'Language Toggle (TH / EN)',
    audience: 'all',
    mood: 'happy',
    summaryTh: 'เปลี่ยนภาษาเมนู ข้อความ และเอกสารรายงานทั้งหมดระหว่างภาษาไทยและภาษาอังกฤษทันที',
    summaryEn: 'Switch interface labels and reports between Thai and English instantly.',
    howToTh: ['คลิกปุ่ม "ไทย / EN" เพื่อสลับภาษาได้ทุกหน้า'],
    howToEn: ['Click "ไทย / EN" to switch language anytime.'],
  },
  'nav-tools-menu': {
    id: 'nav-tools-menu',
    titleTh: 'เมนูเครื่องมือและคู่มือในระบบ',
    titleEn: 'Tools & In-Module Guides',
    audience: 'all',
    mood: 'pointing',
    summaryTh: 'รวมทางลัดสลับมุมมองมือถือ คู่มือคุณครูและนักเรียน ติวเตอร์ระบบ และนำเข้าข้อมูล Excel/CSV',
    summaryEn: 'Quick drawer for Mobile View, Student & Teacher Guides, System Tutor, and Data Import/Export.',
    howToTh: [
      'กดปุ่ม "เครื่องมือ" เพื่อเปิดเมนูลัด',
      'เลือก "คู่มือคุณครู & นักเรียน" เพื่อดูขั้นตอนพร้อมภาพประกอบในโมดูล',
    ],
    howToEn: [
      'Click "Tools" to open the utility dropdown.',
      'Choose "Teacher & Student Guide" for illustrated in-module workflows.',
    ],
  },
  'nav-guide-toggle': {
    id: 'nav-guide-toggle',
    titleTh: 'เปิด / ปิด ตัวการ์ตูนนำทางวิธีใช้',
    titleEn: 'Toggle Cartoon Hover Guide',
    audience: 'all',
    mood: 'celebrate',
    summaryTh: 'เปิดเพื่อให้ตัวการ์ตูนช่วยอธิบายทุกปุ่มที่เอาเมาส์ไปจี้ หรือปิดได้ทันทีเมื่อใช้งานคล่องแล้ว',
    summaryEn: 'Turn ON so the cartoon mascot explains every hovered button, or turn OFF anytime.',
    howToTh: [
      'กดปุ่มนี้เพื่อเปิดหรือปิดป๊อปอัปนำทางขณะชี้เมาส์',
      'กดที่ตัวการ์ตูนมุมขวาล่างเพื่อเปิดดูคู่มือคุณครู/นักเรียนได้ตลอดเวลา',
    ],
    howToEn: [
      'Click this switch to enable or disable hover guide popups.',
      'Click the mascot avatar at bottom-right to browse Teacher or Student guides.',
    ],
  },
  'nav-notifications': {
    id: 'nav-notifications',
    titleTh: 'ศูนย์การแจ้งเตือน (Notifications)',
    titleEn: 'Notification Center',
    audience: 'all',
    mood: 'pointing',
    summaryTh: 'ตรวจสอบการแจ้งเตือนสำคัญ เช่น ประกาศคะแนน เวลาเช็คชื่อ หรือข้อความส่วนตัวถึงผู้ปกครอง',
    summaryEn: 'Review real-time alerts for grades, attendance scans, and school messages.',
    howToTh: ['กดรูปกระดิ่งเพื่อดูรายการแจ้งเตือนล่าสุดทั้งหมด'],
    howToEn: ['Click the bell icon to inspect unread notifications.'],
  },
  'nav-profile': {
    id: 'nav-profile',
    titleTh: 'โปรไฟล์ผู้ใช้และข้อมูลส่วนตัว',
    titleEn: 'User Profile & Account Info',
    audience: 'all',
    mood: 'happy',
    summaryTh: 'ดูข้อมูลบัญชี บทบาทปัจจุบัน โรงเรียนที่สังกัด และจัดการข้อมูลโปรไฟล์ของคุณ',
    summaryEn: 'View your account identity, active role, assigned campus, and profile details.',
    howToTh: ['คลิกที่รูปโปรไฟล์เพื่อดูหรือแก้ไขข้อมูลส่วนตัว'],
    howToEn: ['Click your avatar to inspect your account profile.'],
  },
  'sidebar-search': {
    id: 'sidebar-search',
    titleTh: 'ค้นหาเมนูอย่างรวดเร็ว',
    titleEn: 'Sidebar Menu Search',
    audience: 'all',
    mood: 'thinking',
    summaryTh: 'พิมพ์ชื่อฟังก์ชันที่ต้องการ เช่น "เกรด", "เช็คชื่อ", "ตาราง" เพื่อเจอเมนูทันทีไม่ต้องไล่หา',
    summaryEn: 'Type a module name like "grade", "attendance", or "homework" to filter sidebar tabs.',
    howToTh: ['พิมพ์คำที่ต้องการในช่อง "ค้นหาเมนู..." แล้วคลิกเมนูที่แสดงขึ้นมา'],
    howToEn: ['Type a keyword in "Search menu..." and click the matching item.'],
  },

  // ---------------------------------------------------------------------------
  // SIDEBAR MODULES (matched via data-nav-tab)
  // ---------------------------------------------------------------------------
  dashboard: {
    id: 'dashboard',
    titleTh: 'แดชบอร์ดภาพรวม (Dashboard)',
    titleEn: 'Dashboard Overview',
    audience: 'all',
    mood: 'happy',
    targetTab: 'dashboard',
    guideModuleId: 'dashboard',
    summaryTh: 'หน้าแรกสรุปสถิติสำคัญ ประวัติเช็คชื่อวันนี้ ตารางเรียนและงานที่ต้องทำเร่งด่วน',
    summaryEn: 'Real-time campus summary showing today’s attendance, key KPIs, and daily tasks.',
    howToTh: [
      'ดูตัวเลขภาพรวมด้านบน และสลับแท็บ "Live Attendance" เพื่อตรวจเวลาสแกนเข้าเรียน',
      'กดการ์ดทางลัดในหน้าแดชบอร์ดเพื่อกระโดดไปโมดูลเป้าหมายทันที',
    ],
    howToEn: [
      'Inspect top KPI cards and switch to "Live Attendance" for real-time logs.',
      'Use quick shortcuts to jump straight into target modules.',
    ],
    roleOverrides: {
      student: {
        summaryTh: 'หน้าแรกของนักเรียน! ดูสถิติการมาเรียนของคุณ คาบเรียนวันนี้ และลิงก์เช็คอินด่วน',
        howToTh: [
          'ตรวจสอบสถานะการมาเรียนและคะแนนสะสมล่าสุดของคุณ',
          'ดูแถบเมนูด้านซ้ายเพื่อเข้า "เช็คชื่อผ่านมือถือ", "การบ้าน", หรือ "เกมความรู้"',
        ],
      },
      teacher: {
        summaryTh: 'โต๊ะทำงานครูประจำวัน (Today’s Desk)! รวมคาบสอนวันนี้ ใบลาที่รออนุมัติ และการบ้านรอตรวจ',
        howToTh: [
          'ตรวจจำนวนใบลารออนุมัติและการบ้านที่ยังไม่ตรวจจากกล่อง Today’s Desk',
          'ดูรายการนักเรียนสแกนเข้าประตูโรงเรียนแบบเรียลไทม์',
        ],
      },
    },
  },
  executive_monitor: {
    id: 'executive_monitor',
    titleTh: 'แดชบอร์ดผู้บริหาร / มอนิเตอร์',
    titleEn: 'Executive & TV Monitor',
    audience: 'teacher',
    mood: 'pointing',
    targetTab: 'executive_monitor',
    summaryTh: 'หน้าจอสรุปสถิติแบบเต็มตา เหมาะสำหรับผู้บริหารตรวจภาพรวมหรือขึ้นจอทีวีประชาสัมพันธ์หน้าโรงเรียน',
    summaryEn: 'Clean live KPI display built for principals and school lobby TV monitors.',
    howToTh: [
      'เปิดแสดงสถิติการมาเรียนและข้อมูลรวมประจำวันแบบเรียลไทม์',
      'ใช้โหมดเต็มหน้าจอเมื่อแสดงบนสมาร์ตทีวีของโรงเรียน',
    ],
    howToEn: [
      'Displays live daily attendance rates and campus summaries.',
      'Ideal for full-screen lobby display monitors.',
    ],
  },
  students: {
    id: 'students',
    titleTh: 'ทะเบียนนักเรียน (Student Directory)',
    titleEn: 'Student Directory & Profiles',
    audience: 'teacher',
    mood: 'pointing',
    targetTab: 'students',
    guideModuleId: 'students',
    summaryTh: 'จัดการรายชื่อนักเรียน นำเข้า Excel/CSV อนุมัติบัญชีนักเรียน พิมพ์บัตร QR และออกใบ ปพ.1',
    summaryEn: 'Manage student roster, import CSV/Excel, approve student accounts, print QR passes, and issue transcripts.',
    howToTh: [
      'ค้นหาหรือกรองนักเรียนตามระดับชั้น/ห้องเรียน',
      'คลิกที่นักเรียนเพื่อเปิดโปรไฟล์ กด "Print QR" พิมพ์บัตรสแกน หรือออกใบ ปพ.1',
      'ใช้ปุ่ม "เพิ่มเติม > นำเข้า/ส่งออก Excel" เพื่ออัปโหลดรายชื่อพร้อมกันทั้งห้อง',
    ],
    howToEn: [
      'Filter students by grade level or classroom.',
      'Open any student card to print their QR attendance pass or transcript.',
      'Use "More > Import/Export Excel" for bulk CSV/Excel uploads with custom column mapping.',
    ],
  },
  teachers: {
    id: 'teachers',
    titleTh: 'บุคลากรและครู (Faculty & Staff)',
    titleEn: 'Faculty & Staff Directory',
    audience: 'teacher',
    mood: 'happy',
    targetTab: 'teachers',
    summaryTh: 'จัดการข้อมูลครู ตำแหน่ง กลุ่มสาระ ภาระงานสอน (ชั่วโมง/สัปดาห์) และเชิญครูเข้าใช้งานระบบ',
    summaryEn: 'Manage teacher directory, departments, weekly teaching workload, and staff account invitations.',
    howToTh: [
      'เพิ่มรายชื่อคุณครูใหม่และกำหนดกลุ่มสาระ/ตำแหน่ง',
      'ตรวจสอบชั่วโมงสอนต่อสัปดาห์ของครูแต่ละท่านอัตโนมัติ',
    ],
    howToEn: [
      'Add teachers and assign their subject departments and positions.',
      'Monitor weekly teaching workload calculations automatically.',
    ],
  },
  courses: {
    id: 'courses',
    titleTh: 'รายวิชา & หลักสูตร (Courses)',
    titleEn: 'Courses & Curriculum',
    audience: 'all',
    mood: 'happy',
    targetTab: 'courses',
    guideModuleId: 'courses',
    summaryTh: 'ดูรายวิชาทั้งหมด หน่วยกิต อาจารย์ผู้สอน และจัดการรายชื่อนักเรียนที่ลงทะเบียนในแต่ละวิชา',
    summaryEn: 'Browse all subjects, credits, instructors, and student course enrollments.',
    howToTh: [
      'ค้นหารายวิชาด้วยรหัสวิชาหรือชื่อวิชา',
      'คุณครูสามารถสร้างวิชาใหม่และกดลงทะเบียนนักเรียนเข้าชั้นเรียนได้',
    ],
    howToEn: [
      'Search courses by code or subject title.',
      'Teachers can create courses and enroll student rosters.',
    ],
    roleOverrides: {
      student: {
        summaryTh: 'ตรวจสอบรายวิชาที่คุณลงทะเบียนเรียน หน่วยกิต และชื่ออาจารย์ผู้สอนในเทอมนี้',
        howToTh: ['เปิดดูรายละเอียดหน่วยกิตและคำอธิบายรายวิชาของคุณในภาคเรียนปัจจุบัน'],
      },
    },
  },
  timetable: {
    id: 'timetable',
    titleTh: 'ตารางเรียน & ตารางสอน (Timetable)',
    titleEn: 'Timetable & Schedule',
    audience: 'all',
    mood: 'pointing',
    targetTab: 'timetable',
    summaryTh: 'ดูตารางเรียน/สอนรายสัปดาห์ แยกตามห้องเรียนหรือครู พร้อมแจ้งเตือนคาบสอนซ้ำซ้อนอัตโนมัติ',
    summaryEn: 'Weekly timetable grid with automatic teacher and classroom conflict checks.',
    howToTh: [
      'เลือกภาคเรียนและห้องเรียนที่ต้องการดูตาราง',
      'คุณครู/แอดมินสามารถจัดคาบสอน นำเข้า Excel หรือซิงก์เข้า Google Calendar ได้',
    ],
    howToEn: [
      'Select term and classroom to inspect weekly periods.',
      'Teachers/admins can edit slots, import spreadsheets, or sync to Google Calendar.',
    ],
    roleOverrides: {
      student: {
        summaryTh: 'เช็กตารางเรียนประจำสัปดาห์ของคุณ ว่าคาบนี้เรียนวิชาอะไร ห้องไหน และครูท่านใดสอน',
        howToTh: ['เลือกห้องเรียนของคุณด้านบนเพื่อดูตารางเรียนครบทุกวันจันทร์–ศุกร์'],
      },
    },
  },
  gradebook: {
    id: 'gradebook',
    titleTh: 'สมุดบันทึกคะแนน & ปพ. (Gradebook)',
    titleEn: 'Gradebook & Academic Analytics',
    audience: 'teacher',
    mood: 'celebrate',
    targetTab: 'gradebook',
    guideModuleId: 'gradebook',
    summaryTh: 'กรอกคะแนนกลางภาค-ปลายภาค คำนวณเกรดอัตโนมัติ ดูกราฟฮิสโตแกรมกระจายเกรด และดาวน์โหลด PDF',
    summaryEn: 'Record scores, auto-calculate grades, analyze Recharts distribution histograms, and export PDF reports.',
    howToTh: [
      'เลือกรายวิชาที่ต้องการบันทึกคะแนน แล้วกรอกคะแนนหรือนำเข้าไฟล์ CSV/Excel',
      'เลื่อนดู "ฮิสโตแกรมการกระจายคะแนน" เพื่อวิเคราะห์เกรดทั้งวิชา/ทั้งโรงเรียน (ชี้เมาส์ที่แท่งกราฟเพื่อดูจำนวนคน)',
      'กดปุ่ม "Download PDF" ด้านบนเพื่อดาวน์โหลดรายงานผลการเรียนส่งฝ่ายวิชาการ',
    ],
    howToEn: [
      'Pick a course to edit student scores or bulk import via CSV/Excel.',
      'Inspect the Grade Distribution Histogram and hover bars for exact student counts.',
      'Click "Download PDF" to export an administrative grade distribution report.',
    ],
  },
  attendance: {
    id: 'attendance',
    titleTh: 'สแกนเช็คชื่อหน้าประตู (Gate QR Scanner)',
    titleEn: 'School Gate QR Check-in',
    audience: 'teacher',
    mood: 'pointing',
    targetTab: 'attendance',
    guideModuleId: 'attendance',
    summaryTh: 'สแกน QR Code จากบัตรนักเรียน (EDUVERSE:STU:) เพื่อบันทึกเวลาเข้า-ออกโรงเรียนอัตโนมัติ',
    summaryEn: 'Scan student QR passes (EDUVERSE:STU:) to log school gate arrival and departure instantly.',
    howToTh: [
      'เปิดกล้องสแกนต่อเนื่อง (Rapid Scanner) หรือยิงรหัสบัตรนักเรียนในช่องสแกน',
      'ระบบจับคู่รหัสนักเรียน บันทึกสถานะตรงเวลา/สาย และแจ้งผู้ปกครองทันที',
    ],
    howToEn: [
      'Open Continuous Rapid Scanner or input a scanned student ID/QR token.',
      'Records arrival timestamps automatically and notifies parents.',
    ],
  },
  mobile_checkin: {
    id: 'mobile_checkin',
    titleTh: 'เช็คชื่อเข้าเรียนผ่านมือถือ (Mobile Check-in)',
    titleEn: 'Mobile Period & GPS Check-in',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'mobile_checkin',
    guideModuleId: 'mobile_checkin',
    summaryTh: 'เช็คชื่อรายคาบด้วยรหัส QR คาบเรียน พร้อมตรวจสอบพิกัด GPS ของโรงเรียนและการยื่นใบลา',
    summaryEn: 'Check into class periods via QR tokens with school GPS verification or submit leave requests.',
    howToTh: [
      'นักเรียน: กดสแกน QR รายคาบที่ครูสร้าง หรือกดเช็คอินพร้อมถ่ายรูปเซลฟี่ในรัศมี GPS',
      'คุณครู: สร้าง QR Code ประจำคาบเรียนให้นักเรียนสแกนเข้าห้องเรียน และอนุมัติใบลา',
    ],
    howToEn: [
      'Students: Scan the class period QR code or take a GPS-verified selfie check-in.',
      'Teachers: Generate live period QR codes and approve student leave requests.',
    ],
    roleOverrides: {
      student: {
        summaryTh: 'วิธีเช็คชื่อของนักเรียน! สแกน QR ประจำคาบที่ครูแสดงหน้าชั้น หรือส่งใบลาป่วย/ลากิจได้ที่นี่',
        howToTh: [
          'อนุญาตสิทธิ์ตำแหน่ง (GPS) และกล้องเมื่อกดเช็คชื่อ',
          'สแกน QR Code ที่คุณครูเปิด หรือกรอกรหัสคาบเรียนเพื่อเช็คชื่อทันที',
        ],
      },
      teacher: {
        summaryTh: 'คุณครูใช้สร้าง QR Code ประจำคาบ (กำหนดอายุรหัสได้) และตรวจเช็กใบลาของนักเรียน',
        howToTh: [
          'เลือกวิชาและคาบที่สอนแล้วกด "สร้าง QR เช็คชื่อประจำคาบ"',
          'ตรวจสอบรายชื่อนักเรียนที่เช็คอินเข้ามาแบบเรียลไทม์',
        ],
      },
    },
  },
  student_id_cards: {
    id: 'student_id_cards',
    titleTh: 'บัตรนักเรียนดิจิทัล (Digital Student ID)',
    titleEn: 'Digital Student ID Card',
    audience: 'all',
    mood: 'happy',
    targetTab: 'student_id_cards',
    summaryTh: 'แสดงบัตรนักเรียนดิจิทัลพร้อม QR Code ส่วนตัว ใช้ยื่นสแกนหน้าประตูโรงเรียนแทนบัตรแข็ง',
    summaryEn: 'Show your digital student ID card with personal QR code for fast gate scanning.',
    howToTh: [
      'นักเรียน: เปิดบัตรโชว์ QR Code ให้ครูเวรหน้าประตูสแกนได้เลย',
      'คุณครู/แอดมิน: พิมพ์บัตรนักเรียนทั้งห้องพร้อมกันเป็นชุด (Batch Print)',
    ],
    howToEn: [
      'Students: Display your personal QR card at the school gate.',
      'Teachers/Admins: Batch-print physical student ID cards for a full classroom.',
    ],
    roleOverrides: {
      student: {
        summaryTh: 'บัตรประจำตัวนักเรียนบนมือถือ! แสดง QR Code หน้านี้ให้ครูหน้าประตูสแกนเช็คชื่อได้เลย',
        howToTh: ['เปิดหน้านี้ก่อนเดินผ่านจุดสแกน QR หน้าโรงเรียน'],
      },
    },
  },
  behavior_sdq: {
    id: 'behavior_sdq',
    titleTh: 'ดูแลช่วยเหลือนักเรียน & SDQ',
    titleEn: 'Student Care & SDQ',
    audience: 'teacher',
    mood: 'thinking',
    targetTab: 'behavior_sdq',
    summaryTh: 'บันทึกพฤติกรรมเชิงบวก/คะแนนความประพฤติ และแบบประเมินจุดแข็งจุดอ่อน (SDQ)',
    summaryEn: 'Track behavior logs, conduct scores, and official SDQ student well-being assessments.',
    howToTh: [
      'เลือกนักเรียนเพื่อบันทึกความดี หักคะแนน หรือทำแบบประเมิน SDQ',
      'ดูสรุปกลุ่มเสี่ยงเพื่อวางแผนดูแลช่วยเหลือรายบุคคล',
    ],
    howToEn: [
      'Select a student to record behavior merits/notes or score an SDQ form.',
      'Review support alerts for early pastoral intervention.',
    ],
  },
  infirmary: {
    id: 'infirmary',
    titleTh: 'ห้องพยาบาล & เวชระเบียน',
    titleEn: 'Infirmary & Health Clinic',
    audience: 'teacher',
    mood: 'happy',
    targetTab: 'infirmary',
    summaryTh: 'บันทึกการเข้าใช้ห้องพยาบาล อาการป่วย ยาที่จ่าย และการรับตัวกลับบ้าน',
    summaryEn: 'Log infirmary clinic visits, symptoms, dispensed medication, and guardian pickup status.',
    howToTh: [
      'บันทึกนักเรียนที่เข้าห้องพยาบาลพร้อมอาการและเวลา',
      'แจ้งผู้ปกครองอัตโนมัติกรณีต้องพักฟื้นหรือรับกลับบ้าน',
    ],
    howToEn: [
      'Log student visit symptoms, vitals, and treatment time.',
      'Track discharge back to class or parent pickup.',
    ],
  },
  homework: {
    id: 'homework',
    titleTh: 'การบ้าน & ภาระงาน (Homework)',
    titleEn: 'Homework & Assignments',
    audience: 'all',
    mood: 'pointing',
    targetTab: 'homework',
    summaryTh: 'ติดตามกำหนดส่งการบ้าน ส่งลิงก์/ไฟล์งาน และให้คะแนนตรวจงานในระบบเดียว',
    summaryEn: 'Track assignment deadlines, submit student work, and grade submissions online.',
    howToTh: [
      'นักเรียน: ดูรายการงานค้าง กดส่งคำตอบหรือแนบลิงก์งานก่อนครบกำหนด',
      'คุณครู: มอบหมายงานใหม่ ตรวจงานที่ส่งมา และให้คะแนนป้อนกลับ',
    ],
    howToEn: [
      'Students: Check due dates and submit homework links or text responses.',
      'Teachers: Create assignments and grade incoming student submissions.',
    ],
  },
  portfolio: {
    id: 'portfolio',
    titleTh: 'แฟ้มผลงานดิจิทัล (Portfolio)',
    titleEn: 'Digital Student Portfolio',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'portfolio',
    guideModuleId: 'portfolio',
    summaryTh: 'รวบรวมเกียรติบัตร โครงงาน และผลงานเด่นของนักเรียนเพื่อเตรียมยื่นศึกษาต่อ',
    summaryEn: 'Collect certificates, academic projects, and achievements into a showcase portfolio.',
    howToTh: ['เพิ่มผลงานใหม่พร้อมภาพประกอบและรายละเอียดเพื่อจัดทำแฟ้มสะสมผลงาน'],
    howToEn: ['Add projects, awards, and reflections to build an academic portfolio.'],
  },
  study_streak: {
    id: 'study_streak',
    titleTh: 'สตรีคประจำวัน & เควสต์การเรียน',
    titleEn: 'Daily Study Streak & Quests',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'study_streak',
    summaryTh: 'สะสมสถิติเข้าเรียนต่อเนื่องและทำภารกิจรายวันเพื่อรับ EXP และอัญมณีรางวัล',
    summaryEn: 'Maintain daily learning streaks and complete study missions to earn EXP and gems.',
    howToTh: ['เช็คภารกิจรายวันและกดรับรางวัลเมื่อทำสำเร็จ'],
    howToEn: ['Complete daily learning quests and claim your XP/gem rewards.'],
  },
  socratic_tutor: {
    id: 'socratic_tutor',
    titleTh: 'ติวเตอร์ถาม-ตอบเชิงคิด (Socratic Tutor)',
    titleEn: 'Socratic Guided Tutor',
    audience: 'all',
    mood: 'thinking',
    targetTab: 'socratic_tutor',
    summaryTh: 'ฝึกคิดวิเคราะห์ทีละขั้นด้วยคำถามนำทางเพื่อเข้าใจบทเรียนลึกซึ้งขึ้น ไม่ใช่แค่เฉลยคำตอบ',
    summaryEn: 'Step-by-step Socratic questioning that helps students reason through concepts.',
    howToTh: ['เลือกหัวข้อที่สงสัยแล้วตอบคำถามนำทางทีละขั้นเพื่อสรุปความเข้าใจ'],
    howToEn: ['Pick a topic and walk through guided reasoning prompts.'],
  },
  realworld_quests: {
    id: 'realworld_quests',
    titleTh: 'เควสต์การเรียนรู้จากภาพถ่าย',
    titleEn: 'Real-World Snap Quests',
    audience: 'all',
    mood: 'pointing',
    targetTab: 'realworld_quests',
    summaryTh: 'ภารกิจภาคสนามถ่ายภาพสิ่งที่พบในชีวิตจริงมาเชื่อมโยงกับเนื้อหาวิชาเรียน',
    summaryEn: 'Field learning quests connecting real-world photos to classroom science and humanities.',
    howToTh: ['เลือกภารกิจ อัปโหลดหรือถ่ายภาพผลงานจริงเพื่อรับคะแนนสะสม'],
    howToEn: ['Choose a mission and submit a real-world photo observation.'],
  },
  boss_raid: {
    id: 'boss_raid',
    titleTh: 'ภารกิจแก้โจทย์ท้าทายกลุ่ม (Co-op Raid)',
    titleEn: 'Co-op Boss Challenge Raid',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'boss_raid',
    summaryTh: 'ร่วมมือกันทั้งห้องตอบคำถามวิชาการเพื่อพิชิตบอสความรู้และปลดล็อกรางวัลกลุ่ม',
    summaryEn: 'Team up with classmates to answer quiz waves and defeat knowledge bosses.',
    howToTh: ['เลือกด่านบอสวิชาที่ต้องการแล้วตอบคำถามให้ถูกต้องภายในเวลา'],
    howToEn: ['Select a subject boss encounter and answer timed questions together.'],
  },
  ai_diagnostic: {
    id: 'ai_diagnostic',
    titleTh: 'วิเคราะห์ทักษะ & เสริมจุดแข็ง',
    titleEn: 'Skill Diagnostic Radar',
    audience: 'all',
    mood: 'thinking',
    targetTab: 'ai_diagnostic',
    summaryTh: 'วิเคราะห์จุดแข็ง-จุดที่ควรเสริมรายกลุ่มสาระ พร้อมแนะนำบทฝึกหัดที่ตรงจุด',
    summaryEn: 'Diagnose subject strengths and weak spots with targeted practice plans.',
    howToTh: ['ทำแบบประเมินสั้นๆ เพื่อดูกราฟความถนัดและแผนฝึกทบทวนเฉพาะตัว'],
    howToEn: ['Run a quick diagnostic to inspect subject mastery and recommended drills.'],
  },
  subject_labs: {
    id: 'subject_labs',
    titleTh: 'ห้องปฏิบัติการเสมือนจริง (Virtual Labs)',
    titleEn: 'Virtual Subject Labs',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'subject_labs',
    summaryTh: 'ทดลองจำลองเสมือนจริง 6 วิชา (เคมี ฟิสิกส์ อังกฤษ โค้ดดิ้ง ไทย สังคม) เล่นและทดลองได้ทันที',
    summaryEn: 'Interactive simulations across 6 subjects: Chemistry, Physics, English, Coding, Thai, and Geography.',
    howToTh: ['เลือกห้องแล็บวิชาที่สนใจ ปรับค่าตัวแปรและสังเกตผลการทดลองบนจอ'],
    howToEn: ['Choose a discipline workshop, adjust parameters, and observe live simulations.'],
  },
  games: {
    id: 'games',
    titleTh: 'เกมการเรียนรู้ฝึกสมอง (EduBattle Arcade)',
    titleEn: 'EduBattle 3D & Arcade Games',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'games',
    guideModuleId: 'games',
    summaryTh: 'สมรภูมิ 3D Battle Royale, ดวล 1v1, เกมคณิต/คำศัพท์ พร้อมร้านค้าแลกของรางวัลด้วยอัญมณี',
    summaryEn: '3D Battle Royale, 1v1 quiz duels, math/word arcade games, and the gem reward shop.',
    howToTh: [
      'เลือกโหมดเกม 3D, ดวล 1v1, หรือมินิเกม 4 แนว',
      'ตอบคำถามวิชาการเพื่อทำคะแนนและนำ Gems ไปแลกรางวัลในร้านค้า',
    ],
    howToEn: [
      'Choose 3D Battle Royale, 1v1 Duel, or one of 4 arcade mini-games.',
      'Answer academic questions to win EXP and redeem Gems in the reward shop.',
    ],
  },
  central_exam_hub: {
    id: 'central_exam_hub',
    titleTh: 'คลังข้อสอบกลางมาตรฐาน',
    titleEn: 'Central Exam Hub',
    audience: 'teacher',
    mood: 'pointing',
    targetTab: 'central_exam_hub',
    summaryTh: 'คลังชุดข้อสอบมาตรฐานกลางพร้อมเฉลย ให้คุณครูนำเข้าคลังข้อสอบของโรงเรียนได้ทันที',
    summaryEn: 'Standardized central question packs ready to claim into your school quiz bank.',
    howToTh: ['เลือกชุดข้อสอบที่ต้องการแล้วกดรับสิทธิ์ใช้งานเข้าคลังวิชาของคุณ'],
    howToEn: ['Browse certified exam packs and import them into your course bank.'],
  },
  hall_of_fame: {
    id: 'hall_of_fame',
    titleTh: 'หอเกียรติยศ & เกียรติบัตร',
    titleEn: '3D Hall of Fame & Certificates',
    audience: 'all',
    mood: 'celebrate',
    targetTab: 'hall_of_fame',
    summaryTh: 'ชมอันดับผู้ทำคะแนนสูงสุด ถ้วยรางวัลระดับห้อง และดาวน์โหลดเกียรติบัตรความสำเร็จ',
    summaryEn: 'Explore top scholar leaderboards, trophies, and printable achievement certificates.',
    howToTh: ['ดูอันดับ Top Scholars และตรวจสอบเหรียญตราความสำเร็จที่คุณปลดล็อกแล้ว'],
    howToEn: ['Check school leaderboards and view unlocked milestone badges.'],
  },
  school_gps: {
    id: 'school_gps',
    titleTh: 'ตั้งค่าพิกัด GPS โรงเรียน',
    titleEn: 'School GPS & Gate Geofence',
    audience: 'teacher',
    mood: 'pointing',
    targetTab: 'school_gps',
    summaryTh: 'ปักหมุดพิกัดละติจูด/ลองจิจูด และรัศมีประตูโรงเรียนสำหรับระบบเช็คชื่อมือถือ',
    summaryEn: 'Configure school GPS coordinates, radius, and multiple campus gates for mobile check-in.',
    howToTh: ['ระบุตำแหน่งและรัศมี (เมตร) เพื่อป้องกันการเช็คชื่อจากนอกบริเวณโรงเรียน'],
    howToEn: ['Set campus coordinates and geofence radius in meters for check-in validation.'],
  },
  executive_warning: {
    id: 'executive_warning',
    titleTh: 'ระบบพยากรณ์ความเสี่ยง (Early Warning)',
    titleEn: 'Early Warning Analytics',
    audience: 'admin',
    mood: 'thinking',
    targetTab: 'executive_warning',
    summaryTh: 'ตรวจจับนักเรียนที่มีแนวโน้มขาดเรียนบ่อย เสี่ยง มส. หรือคะแนนลดลงผิดปกติล่วงหน้า',
    summaryEn: 'Automatically flag students at risk of low attendance or declining academic grades.',
    howToTh: ['ตรวจสอบรายชื่อกลุ่มเสี่ยงและกดเข้าดูแลช่วยเหลือหรือแจ้งเตือนผู้ปกครอง'],
    howToEn: ['Review flagged risk indicators and initiate timely student support.'],
  },
  school_permissions: {
    id: 'school_permissions',
    titleTh: 'กำหนดสิทธิ์บทบาทในโรงเรียน',
    titleEn: 'School Role Permissions',
    audience: 'admin',
    mood: 'pointing',
    targetTab: 'school_permissions',
    summaryTh: 'เปิด/ปิดฟีเจอร์และสิทธิ์การเข้าถึงโมดูลต่างๆ ของครู นักเรียน และผู้ปกครองในโรงเรียน',
    summaryEn: 'Enable or restrict module access and feature flags per role for your school.',
    howToTh: ['สลับสวิตช์เปิด-ปิดโมดูลตามนโยบายการใช้งานของโรงเรียน'],
    howToEn: ['Toggle school feature flags to customize visible modules.'],
  },
  admin_superadmin_desk: {
    id: 'admin_superadmin_desk',
    titleTh: 'จดหมายประสานงานส่วนกลาง',
    titleEn: 'Admin Coordination Desk',
    audience: 'admin',
    mood: 'pointing',
    targetTab: 'admin_superadmin_desk',
    summaryTh: 'ช่องทางติดต่อสื่อสารด่วนระหว่างผู้บริหารโรงเรียนและทีมดูแลระบบส่วนกลาง',
    summaryEn: 'Direct messaging channel between school administrators and master system support.',
    howToTh: ['ส่งข้อความสอบถามหรือแจ้งเรื่องเร่งด่วนถึงผู้ดูแลระบบส่วนกลาง'],
    howToEn: ['Compose coordination threads with platform administrators.'],
  },
  system_settings: {
    id: 'system_settings',
    titleTh: 'ตั้งค่าระบบ & คาบเรียน',
    titleEn: 'System Settings & Periods',
    audience: 'admin',
    mood: 'pointing',
    targetTab: 'system_settings',
    guideModuleId: 'integrations',
    summaryTh: 'กำหนดปีการศึกษา ภาคเรียน เกณฑ์เกรด เวลาคาบเรียน และตั้งค่าการแจ้งเตือน LINE/อีเมล',
    summaryEn: 'Configure academic year, grading scale, school bell schedule, and notifications.',
    howToTh: ['ปรับแก้เวลาคาบเรียน 1–10 และเกณฑ์คะแนนของโรงเรียนได้ทุกเมื่อ'],
    howToEn: ['Adjust period timings, grading mode, and notification preferences.'],
  },
  billing: {
    id: 'billing',
    titleTh: 'ค่าเทอม & ใบเสร็จรับเงิน',
    titleEn: 'Tuition Billing & PromptPay',
    audience: 'parent',
    mood: 'happy',
    targetTab: 'billing',
    guideModuleId: 'billing',
    summaryTh: 'ตรวจสอบยอดค่าบำรุงการศึกษา สร้าง QR พร้อมเพย์ชำระเงิน และพิมพ์ใบเสร็จรับเงิน',
    summaryEn: 'Inspect tuition invoices, scan PromptPay QR codes, and download official receipts.',
    howToTh: ['เลือกใบแจ้งหนี้เพื่อดูรายละเอียดหรือสแกน QR ชำระค่าเทอม'],
    howToEn: ['Open any invoice to generate a PromptPay QR or print a receipt.'],
  },
  announcements: {
    id: 'announcements',
    titleTh: 'ข่าวสาร & ประกาศโรงเรียน',
    titleEn: 'Announcements & Broadcasts',
    audience: 'all',
    mood: 'pointing',
    targetTab: 'announcements',
    guideModuleId: 'announcements',
    summaryTh: 'อ่านประกาศสำคัญของโรงเรียน กำหนดการสอบ และข่าวกิจกรรมต่างๆ',
    summaryEn: 'Read official school announcements, exam notices, and upcoming campus events.',
    howToTh: ['เปิดอ่านประกาศที่ปักหมุดด้านบน หรือคุณครู/แอดมินกดสร้างประกาศใหม่ส่งถึงทุกคน'],
    howToEn: ['Check pinned announcements; teachers and admins can publish new notices.'],
  },
  super_admin_console: {
    id: 'super_admin_console',
    titleTh: 'ศูนย์ควบคุมระบบแม่ข่าย (Super Admin)',
    titleEn: 'Super Admin Master Console',
    audience: 'admin',
    mood: 'pointing',
    targetTab: 'super_admin_console',
    summaryTh: 'อนุมัติโรงเรียนใหม่ ตรวจสอบคำขอใช้งาน และจัดการทรัพยากรทั้งแพลตฟอร์ม',
    summaryEn: 'Approve newly registered schools and oversee multi-tenant platform settings.',
    howToTh: ['ตรวจสอบโรงเรียนรออนุมัติและจัดการสิทธิ์แพ็กเกจโรงเรียน'],
    howToEn: ['Approve pending schools and inspect platform-wide metrics.'],
  },

  // ---------------------------------------------------------------------------
  // IN-VIEW FUNCTION HOTSPOTS (matched via data-guide-id)
  // ---------------------------------------------------------------------------
  'dashboard-kpis': {
    id: 'dashboard-kpis',
    titleTh: 'ตัวชี้วัดภาพรวมโรงเรียน (KPI Cards)',
    titleEn: 'Real-Time School KPI Cards',
    audience: 'all',
    mood: 'happy',
    summaryTh: 'สรุปตัวเลขสำคัญประจำวัน: นักเรียนทั้งหมด อัตราการมาเรียน ยอดค่าเทอม และการเชื่อม LINE ผู้ปกครอง',
    summaryEn: 'Daily pulse of active students, attendance rate, tuition collection, and guardian LINE sync.',
    howToTh: ['ตรวจสอบเปอร์เซ็นต์การมาเรียนวันนี้เพื่อรู้สถานการณ์ทันทีตั้งแต่เช้า'],
    howToEn: ['Check today’s attendance percentage at a glance each morning.'],
  },
  'dashboard-today-desk': {
    id: 'dashboard-today-desk',
    titleTh: 'โต๊ะทำงานครูประจำวัน (Today’s Desk)',
    titleEn: 'Today’s Teaching Desk',
    audience: 'teacher',
    mood: 'pointing',
    summaryTh: 'รวมสิ่งที่คุณครูต้องทำวันนี้ไว้จุดเดียว: คาบสอนวันนี้ ใบลารอตรวจ และการบ้านที่รอตรวจให้คะแนน',
    summaryEn: 'Your daily teaching checklist: today’s classes, pending leaves, and ungraded homework.',
    howToTh: [
      'ดูจำนวนงานค้างแล้วกดปุ่มลัดเพื่อเข้าไปอนุมัติหรือตรวจงานทันที',
    ],
    howToEn: [
      'Review pending counts and click straight into attendance or homework.',
    ],
  },
  'gradebook-grading-mode': {
    id: 'gradebook-grading-mode',
    titleTh: 'สลับเกณฑ์เกรด ไทย (0–4) / สากล (A–F)',
    titleEn: 'Thai (0–4) / International (A–F) Scale',
    audience: 'teacher',
    mood: 'thinking',
    summaryTh: 'ผู้บริหารเลือกเกณฑ์คำนวณเกรดประจำโรงเรียน ระบบจะแปลงผลในตารางและใบ ปพ. ให้อัตโนมัติ',
    summaryEn: 'Select Thai 0–4 or International A–F grading scale; calculations update automatically.',
    howToTh: ['กดเลือกเกณฑ์คะแนนที่โรงเรียนใช้ คะแนนเดิมจะคำนวณเกรดใหม่ให้ทันที'],
    howToEn: ['Toggle scale anytime to recalculate displayed grades across records.'],
  },
  'gradebook-autonotify': {
    id: 'gradebook-autonotify',
    titleTh: 'เปิด/ปิดแจ้งเตือนเกรดอัตโนมัติ',
    titleEn: 'Auto-Notify Grade Updates',
    audience: 'teacher',
    mood: 'pointing',
    summaryTh: 'เมื่อเปิดไว้ การบันทึกหรือแก้คะแนนจะส่งแจ้งเตือนไปยังบัญชีนักเรียนและผู้ปกครองให้อัตโนมัติ',
    summaryEn: 'When enabled, saving scores pushes instant grade alerts to students and guardians.',
    howToTh: ['ปิดชั่วคราวระหว่างทยอยกรอกคะแนน แล้วค่อยเปิดเมื่อพร้อมประกาศผล'],
    howToEn: ['Turn OFF while drafting batch scores, then turn ON when publishing results.'],
  },
  'gradebook-import-csv': {
    id: 'gradebook-import-csv',
    titleTh: 'นำเข้าคะแนนจาก CSV / Excel แบบจับคู่คอลัมน์',
    titleEn: 'Smart CSV/Excel Grade Import',
    audience: 'teacher',
    mood: 'celebrate',
    summaryTh: 'อัปโหลดไฟล์คะแนนที่มีหัวตารางแบบใดก็ได้ แล้วจับคู่คอลัมน์กับช่องคะแนนของระบบพร้อมตรวจแถวผิดพลาด',
    summaryEn: 'Upload any CSV/Excel spreadsheet, map custom headers to grade fields, and review row validation.',
    howToTh: [
      'คลิก "นำเข้าคะแนน CSV/Excel" แล้วเลือกไฟล์จากเครื่อง',
      'จับคู่คอลัมน์ของคุณให้ตรงกับรหัสนักเรียนและคะแนนแต่ละช่อง',
    ],
    howToEn: [
      'Click to upload your spreadsheet.',
      'Map your headers to student ID and score columns with instant error previews.',
    ],
  },
  'gradebook-pdf-export': {
    id: 'gradebook-pdf-export',
    titleTh: 'ดาวน์โหลดรายงานการกระจายเกรด PDF',
    titleEn: 'Download Grade Distribution PDF',
    audience: 'teacher',
    mood: 'celebrate',
    summaryTh: 'ส่งออกรายงาน PDF สรุปสถิติคะแนน ค่าเฉลี่ย มัธยฐาน ช่วงคะแนน และฮิสโตแกรมสำหรับฝ่ายวิชาการ',
    summaryEn: 'Export an administrative PDF summary with mean, median, pass rate, and grade distribution.',
    howToTh: ['เลือกวิชาหรือมุมมองที่ต้องการแล้วกด "Download PDF" เพื่อบันทึกเอกสารทางการ'],
    howToEn: ['Select scope/course and click "Download PDF" to export the report.'],
  },
  'gradebook-histogram': {
    id: 'gradebook-histogram',
    titleTh: 'ฮิสโตแกรมวิเคราะห์การกระจายผลการเรียน',
    titleEn: 'Grade Distribution Histogram',
    audience: 'teacher',
    mood: 'thinking',
    summaryTh: 'กราฟแท่งแสดงจำนวนนักเรียนในแต่ละช่วงคะแนน เอาเมาส์ชี้ที่แท่งกราฟเพื่อดูจำนวนคนและสัดส่วน % ได้เลย',
    summaryEn: 'Interactive Recharts histogram of score tiers—hover any bar for exact student counts and share.',
    howToTh: [
      'สลับดูได้ทั้งมุมมอง "รายวิชา", "ทั้งโรงเรียน", หรือ "แยกตามกลุ่มสาระ"',
      'ชี้เมาส์บนแท่งกราฟเพื่อดูจำนวนและเปอร์เซ็นต์นักเรียนแต่ละช่วงคะแนน',
    ],
    howToEn: [
      'Switch between Course, School-wide, or Department views.',
      'Hover any bar to inspect exact student count and percentage share.',
    ],
  },
  'students-import-export': {
    id: 'students-import-export',
    titleTh: 'เมนูจัดการข้อมูลชุด (นำเข้า Excel / เลื่อนชั้น)',
    titleEn: 'Bulk Actions & Excel Import Menu',
    audience: 'teacher',
    mood: 'pointing',
    summaryTh: 'รวมคำสั่งพิมพ์บัตรนักเรียนทั้งห้อง เลื่อนชั้นข้ามปี และนำเข้า/ส่งออกรายชื่อ CSV/Excel',
    summaryEn: 'Batch-print student ID cards, promote classes for a new year, or import/export CSV/Excel.',
    howToTh: ['กดเปิดเมนู "เพิ่มเติม" เพื่อเข้าสู่ระบบแมปคอลัมน์นำเข้า Excel หรือพิมพ์บัตรทั้งห้อง'],
    howToEn: ['Open "More" to access batch ID printing, promotion, or Excel mapping import.'],
  },
  'students-add-bulk': {
    id: 'students-add-bulk',
    titleTh: 'เพิ่มนักเรียนทั้งห้องอย่างรวดเร็ว',
    titleEn: 'Bulk Classroom Student Entry',
    audience: 'teacher',
    mood: 'happy',
    summaryTh: 'พิมพ์หรือวางรายชื่อนักเรียนหลายๆ คนพร้อมกันในห้องเดียว ไม่ต้องกรอกทีละคน',
    summaryEn: 'Quickly add an entire classroom roster at once instead of one by one.',
    howToTh: ['กดปุ่มนี้แล้ววางรายชื่อนักเรียนลงในตารางเพื่อสร้างประวัติทั้งห้อง'],
    howToEn: ['Click and paste multiple student rows to create a whole classroom roster.'],
  },
  'students-add-single': {
    id: 'students-add-single',
    titleTh: 'เพิ่มประวัตินักเรียนรายคน',
    titleEn: 'Add Single Student Record',
    audience: 'teacher',
    mood: 'happy',
    summaryTh: 'บันทึกข้อมูลนักเรียนใหม่ 1 คน พร้อมรหัสนักเรียน ชั้น/ห้อง และข้อมูลติดต่อผู้ปกครอง',
    summaryEn: 'Create a single student profile with student ID, grade/room, and guardian contacts.',
    howToTh: ['กดเพื่อเปิดฟอร์มกรอกประวัตินักเรียนใหม่แบบรายบุคคล'],
    howToEn: ['Click to open the single student creation modal.'],
  },
  'students-approvals-tab': {
    id: 'students-approvals-tab',
    titleTh: 'อนุมัติคำขอสมัครเข้าโรงเรียนของนักเรียน',
    titleEn: 'Student Account Approval Queue',
    audience: 'teacher',
    mood: 'pointing',
    summaryTh: 'ตรวจสอบคำขอเปิดบัญชีนักเรียน จับคู่เข้ากับเลขประจำตัวนักเรียน และกดอนุมัติเปิดสิทธิ์เข้าใช้งาน',
    summaryEn: 'Verify pending student registrations, link them to roster records, and approve access.',
    howToTh: [
      'เลือกรายชื่อนักเรียนในทะเบียนให้ตรงกับผู้สมัคร',
      'กด "อนุมัติ" เพื่อให้นักเรียนเข้าสู่ระบบใช้งานได้ทันที',
    ],
    howToEn: [
      'Match the applicant to their student roster profile.',
      'Click "Approve" to activate their student account.',
    ],
  },
  'attendance-scanner-box': {
    id: 'attendance-scanner-box',
    titleTh: 'เครื่องสแกนบัตร QR เช็คชื่อนักเรียน',
    titleEn: 'Gate QR & Rapid Scanner Station',
    audience: 'teacher',
    mood: 'celebrate',
    summaryTh: 'รองรับทั้งการยิงรหัสบัตร EDUVERSE:STU: จากปืนบาร์โค้ด และกล้องสแกนต่อเนื่องความเร็วสูง',
    summaryEn: 'Supports barcode guns, EDUVERSE:STU: QR passes, and rapid webcam scanning.',
    howToTh: [
      'กด "เปิดกล้องสแกนต่อเนื่อง" หรือสแกนรหัสบัตรนักเรียนในช่องนี้',
      'สถานะมาเรียน/มาสายจะบันทึกพร้อมเวลาทันที',
    ],
    howToEn: [
      'Launch Continuous Rapid Scanner or focus this field for barcode scans.',
      'Arrival timestamps are saved instantly.',
    ],
  },
  'lms-lessons-tab': {
    id: 'lms-lessons-tab',
    titleTh: 'บทเรียนวิดีโอและเอกสารดาวน์โหลด',
    titleEn: 'Video Lessons & Course Files',
    audience: 'all',
    mood: 'happy',
    summaryTh: 'รับชมคลิปการสอน อ่านสรุปบทเรียน และดาวน์โหลดใบงาน PDF ประจำบท',
    summaryEn: 'Watch chapter video lectures, read notes, and download PDF lesson worksheets.',
    howToTh: ['เลือกบทเรียนจากสารบัญด้านขวาเพื่อเริ่มเรียนและกดบันทึกความก้าวหน้า'],
    howToEn: ['Pick a chapter on the right playlist and mark lessons complete as you study.'],
  },
  'lms-homework-tab': {
    id: 'lms-homework-tab',
    titleTh: 'ส่งการบ้านและตรวจให้คะแนนออนไลน์',
    titleEn: 'Online Homework Submission & Grading',
    audience: 'all',
    mood: 'pointing',
    summaryTh: 'นักเรียนส่งคำตอบหรือแนบลิงก์งานได้ทันที ส่วนคุณครูตรวจให้คะแนนและแสดงความคิดเห็นกลับได้',
    summaryEn: 'Students submit assignments here while teachers review and post grades.',
    howToTh: ['สลับมาที่แท็บนี้เพื่อดูงานที่ต้องส่งหรือตรวจงานของนักเรียนในวิชา'],
    howToEn: ['Switch here to submit assigned tasks or grade incoming student work.'],
  },
};

export const ROLE_WORKFLOW_STEPS: IllustratedWorkflowStep[] = [
  // STUDENT IN-MODULE WORKFLOW
  {
    id: 'stu-step-1',
    stepNumber: '01',
    role: 'student',
    titleTh: 'เริ่มต้นบัญชีนักเรียน & ตรวจสอบข้อมูลส่วนตัว',
    titleEn: 'Verify Your Student Profile & Campus',
    summaryTh: 'เปิดใช้งานผ่านลิงก์คำเชิญจากโรงเรียนหรือบัญชีที่ครูอนุมัติ แล้วตรวจสอบชื่อ-ห้องเรียนของคุณในเมนูโปรไฟล์',
    summaryEn: 'Activate via your school invite link, sign in, and confirm your classroom profile in the top-right menu.',
    detailsTh: [
      'เปิดจากอีเมลคำเชิญ (หากเพิ่งเข้าครั้งแรก) เพื่อตั้งรหัสผ่าน 8 ตัวขึ้นไป',
      'ตรวจสอบชื่อ-นามสกุล เลขประจำตัวนักเรียน และห้องเรียนของคุณให้ถูกต้อง',
      'สามารถสลับโหมดสว่าง/มืด และภาษา ไทย/EN ได้จากแถบด้านบนตลอดเวลา',
    ],
    detailsEn: [
      'Set your password from your school invitation email on first access.',
      'Confirm your student ID number and assigned room in your profile.',
      'Toggle eye-care Light/Dark theme or Thai/English anytime from the top bar.',
    ],
    tipTh: 'หากลืมรหัสผ่านหรือเปลี่ยนอีเมล ติดต่อครูประจำชั้นหรือแอดมินโรงเรียนเพื่อรีเซ็ตสิทธิ์ได้ทันที',
    tipEn: 'Ask your homeroom teacher or school admin if your student record link needs updating.',
    imageSrc: studentInviteImg,
    captionTh: 'โมดูลนักเรียน 01 · ยืนยันบัญชีนักเรียนและตรวจสอบข้อมูลห้องเรียนของคุณ',
    captionEn: 'Student Guide 01 · Verify your invited student account and profile',
    targetTab: 'dashboard',
  },
  {
    id: 'stu-step-2',
    stepNumber: '02',
    role: 'student',
    titleTh: 'เช็คชื่อเข้าโรงเรียน & สแกน QR รายคาบเรียน',
    titleEn: 'Gate Check-in ID & Mobile Period QR',
    summaryTh: 'ใช้บัตรนักเรียนดิจิทัลยื่นสแกนหน้าประตู และใช้เมนูเช็คชื่อผ่านมือถือสแกน QR ของคุณครูในห้องเรียน',
    summaryEn: 'Show your Digital Student ID QR at the gate and scan teacher period QRs inside classrooms.',
    detailsTh: [
      'เปิดเมนู "บัตรนักเรียนดิจิทัล" เพื่อแสดงรหัส QR ประจำตัวหน้าประตูโรงเรียน',
      'เมื่อเข้าห้องเรียน เปิดเมนู "เช็คชื่อเข้าเรียนผ่านมือถือ" เพื่อสแกน QR รายคาบที่ครูแสดง',
      'กรณีป่วยหรือมีธุระ สามารถยื่น "คำขอลาเรียน" พร้อมเหตุผลในหน้าเช็คชื่อมือถือได้ทันที',
    ],
    detailsEn: [
      'Open "Digital Student ID" for quick morning scanning at the school gate.',
      'Open "Mobile Check-in" in class to scan the period QR code generated by your teacher.',
      'Need to take leave? Submit a sick/personal leave request straight from Mobile Check-in.',
    ],
    tipTh: 'พยายามรักษาเวลาเรียนให้เกิน 80% ในทุกรายวิชา เพื่อรักษาสิทธิ์สอบปลายภาคไม่ติด มส.',
    tipEn: 'Keep attendance above 80% per subject to maintain full final exam eligibility.',
    imageSrc: studentSigninImg,
    captionTh: 'โมดูลนักเรียน 02 · เช็คชื่อผ่านมือถือและโชว์บัตร QR ประจำตัวนักเรียน',
    captionEn: 'Student Guide 02 · Use Digital ID & Mobile Check-in',
    targetTab: 'mobile_checkin',
  },
  {
    id: 'stu-step-3',
    stepNumber: '03',
    role: 'student',
    titleTh: 'ดูตารางเรียน เรียนออนไลน์ LMS และส่งการบ้าน',
    titleEn: 'Timetable, Virtual LMS & Homework',
    summaryTh: 'เช็กคาบเรียนประจำวัน เข้าเรียนคลิปวิดีโอ/ชีทสรุปในโหมด LMS และกดส่งการบ้านก่อนครบกำหนด',
    summaryEn: 'Check daily classes, study video lessons in Virtual LMS, and submit assignments on time.',
    detailsTh: [
      'ดูคาบเรียนและห้องเรียนประจำวันในเมนู "ตารางเรียน & ตารางสอน"',
      'กดปุ่ม "ห้องเรียน LMS" ด้านบนเพื่อดูวิดีโอ ดาวน์โหลดชีทเรียน และกดทำเครื่องหมายเรียนจบ',
      'ตรวจสอบงานค้างทั้งหมดและส่งคำตอบในเมนู "การบ้าน & ภาระงาน"',
    ],
    detailsEn: [
      'Check daily classrooms and instructors in "Timetable & Schedule".',
      'Click "Virtual LMS" in the top bar for lecture videos and downloadable PDFs.',
      'Track deadlines and submit homework in "Homework & Tasks".',
    ],
    tipTh: 'เปิดใช้งานตัวการ์ตูนนำทางไว้ แล้วเอาเมาส์จี้ที่เมนูใดก็ได้เพื่อดูคำอธิบายด่วนทันที!',
    tipEn: 'Keep the Cartoon Hover Guide ON and point at any button for instant tips!',
    imageSrc: studentSigninImg,
    captionTh: 'โมดูลนักเรียน 03 · เรียนออนไลน์ LMS และส่งการบ้านครบในที่เดียว',
    captionEn: 'Student Guide 03 · Study online in LMS and complete homework',
    targetTab: 'homework',
  },
  {
    id: 'stu-step-4',
    stepNumber: '04',
    role: 'student',
    titleTh: 'ฝึกทักษะด้วยห้องแล็บเสมือน เกมความรู้ 3D และสะสมรางวัล',
    titleEn: 'Virtual Labs, 3D EduBattle & Achievements',
    summaryTh: 'สนุกกับห้องแล็บ 6 วิชา เกมตอบคำถาม 3D Battle Royale / มินิเกมฝึกสมอง และนำอัญมณีไปแลกของรางวัล',
    summaryEn: 'Experiment in 6 subject labs, compete in 3D EduBattle quiz arenas, and redeem gem rewards.',
    detailsTh: [
      'ทดลองวิทยาศาสตร์ โค้ดดิ้ง และภาษาในเมนู "ห้องปฏิบัติการเสมือนจริง"',
      'ท้าประลองความรู้ใน "เกมการเรียนรู้ฝึกสมอง" เพื่อเก็บ EXP และ Gems',
      'สะสมผลงานและเกียรติบัตรของคุณในเมนู "แฟ้มผลงานดิจิทัล" และ "หอเกียรติยศ"',
    ],
    detailsEn: [
      'Run interactive experiments in "Virtual Subject Labs".',
      'Play 3D Battle Royale or quiz duels in "Educational Arcade" to earn EXP and Gems.',
      'Collect awards in "Digital Portfolio" and "Hall of Fame".',
    ],
    tipTh: 'การทำ "สตรีคประจำวัน" ต่อเนื่องทุกวันช่วยรับโบนัส EXP เพิ่มขึ้นเป็นทวีคูณ',
    tipEn: 'Check "Daily Study Streak" each day for bonus EXP multipliers.',
    imageSrc: studentInviteImg,
    captionTh: 'โมดูลนักเรียน 04 · สนุกกับห้องทดลองและเกมความรู้พร้อมเก็บสตรีคทุกวัน',
    captionEn: 'Student Guide 04 · Explore Labs, 3D Quiz Games & Rewards',
    targetTab: 'games',
  },

  // TEACHER IN-MODULE WORKFLOW
  {
    id: 'tch-step-1',
    stepNumber: '01',
    role: 'teacher',
    titleTh: 'เตรียมบัญชีผู้สอน เช็กโต๊ะงานครู & ตารางสอน',
    titleEn: 'Teacher Workspace, Today’s Desk & Timetable',
    summaryTh: 'ตรวจสอบคาบสอนวันนี้ ใบลาที่รออนุมัติ และการบ้านรอตรวจจากหน้า Dashboard พร้อมดูตารางสอนทั้งเทอม',
    summaryEn: 'Review today’s scheduled classes, pending leaves, and ungraded work on Today’s Desk.',
    detailsTh: [
      'เริ่มต้นวันจากหน้า "แดชบอร์ด" ดูสรุปงานด่วนในกล่อง Today’s Teaching Desk',
      'ตรวจสอบตารางสอนและห้องเรียนในเมนู "ตารางเรียน & ตารางสอน" (ซิงก์ Google Calendar ได้)',
      'อนุมัติคำขอสมัครบัญชีนักเรียนใหม่ในเมนู "ทะเบียนนักเรียน > คำขอสมัครเข้าโรงเรียน"',
    ],
    detailsEn: [
      'Start on Dashboard to see Today’s Teaching Desk priorities.',
      'Inspect weekly periods in "Timetable & Schedule" (Google Calendar sync ready).',
      'Approve student account requests under "Student Directory > Approvals".',
    ],
    tipTh: 'หากเป็นครูผู้สอนใหม่ โปรดตรวจสอบรายวิชาที่ตนเองรับผิดชอบในเมนู "รายวิชา & หลักสูตร"',
    tipEn: 'Verify your assigned courses in "Courses & Curriculum" at the start of term.',
    imageSrc: teacherSigninImg,
    captionTh: 'โมดูลคุณครู 01 · ตรวจตารางสอนและโต๊ะงานครูประจำวัน',
    captionEn: 'Teacher Guide 01 · Check Today’s Desk and weekly timetable',
    targetTab: 'dashboard',
  },
  {
    id: 'tch-step-2',
    stepNumber: '02',
    role: 'teacher',
    titleTh: 'จัดการทะเบียนนักเรียน นำเข้า Excel & พิมพ์บัตร QR',
    titleEn: 'Student Roster, Smart CSV Import & QR Passes',
    summaryTh: 'นำเข้ารายชื่อนักเรียนจาก Excel/CSV แบบจับคู่คอลัมน์ได้เอง พิมพ์บัตร QR เช็คชื่อ และออกใบ ปพ.1',
    summaryEn: 'Import spreadsheets with custom header mapping, print student QR passes, and issue transcripts.',
    detailsTh: [
      'กด "เพิ่มเติม > นำเข้า/ส่งออก Excel" เพื่ออัปโหลดไฟล์รายชื่อและจับคู่หัวคอลัมน์ของคุณเองได้ทันที',
      'เปิดข้อมูลนักเรียนรายบุคคลแล้วกดปุ่ม "Print QR" เพื่อพิมพ์บัตร QR เช็คชื่อคุณภาพสูง',
      'กดปุ่ม "ออกใบ ปพ.1" สำหรับพิมพ์เอกสารแสดงผลการเรียนสองภาษาตามมาตรฐาน ศธ.',
    ],
    detailsEn: [
      'Use "More > Import/Export Excel" to map custom CSV/Excel column headers safely.',
      'Open any student detail card and click "Print QR" for fast gate check-in passes.',
      'Generate bilingual official report cards (PP.1) in one click.',
    ],
    tipTh: 'ระบบนำเข้าจะรายงานเลขแถวและสาเหตุที่ผิดพลาดอย่างละเอียดก่อนนำเข้าจริง ไม่ทำให้ข้อมูลเสีย',
    tipEn: 'The import preview flags failed rows with line numbers and reasons before saving.',
    imageSrc: teacherSigninImg,
    captionTh: 'โมดูลคุณครู 02 · นำเข้าทะเบียนนักเรียนแบบแมปคอลัมน์และพิมพ์บัตร QR',
    captionEn: 'Teacher Guide 02 · Smart CSV import and Printable Student QR passes',
    targetTab: 'students',
  },
  {
    id: 'tch-step-3',
    stepNumber: '03',
    role: 'teacher',
    titleTh: 'เช็คชื่อหน้าประตูโรงเรียน & สร้าง QR รายคาบเรียน',
    titleEn: 'Gate Rapid Scanner & Classroom Period QR',
    summaryTh: 'สแกนบัตร QR นักเรียนหน้าประตูด้วยกล้องความเร็วสูง หรือสร้าง QR คาบเรียนให้เด็กสแกนผ่านมือถือ',
    summaryEn: 'Scan student QR cards at the gate or generate timed classroom period QR codes.',
    detailsTh: [
      'ใช้เมนู "ระบบสแกนเช็คชื่อหน้าประตู" พร้อมปุ่มกล้องสแกนต่อเนื่องสำหรับครูเวรประจำวัน',
      'เข้าสอนในห้อง กดเมนู "เช็คชื่อเข้าเรียนผ่านมือถือ" เพื่อสร้าง QR Code ประจำคาบให้นักเรียนสแกน',
      'ระบบคำนวณเปอร์เซ็นต์เวลาเรียนอัตโนมัติ แจ้งเตือนรายชื่อเด็กที่เข้าใกล้เกณฑ์ขาดสิทธิ์สอบ (< 80%)',
    ],
    detailsEn: [
      'Use "Gate QR Check-in" with Continuous Rapid Scanner for morning gate duty.',
      'Open "Mobile Check-in" in class to generate a period-specific QR token.',
      'Attendance percentages feed straight into Gradebook exam eligibility checks (< 80% warning).',
    ],
    tipTh: 'ข้อมูลเช็คชื่อรองรับการทำงานแบบออฟไลน์และจะซิงก์เข้าคลาวด์ทันทีที่ต่ออินเทอร์เน็ต',
    tipEn: 'Check-ins queue automatically if offline and sync once connection returns.',
    imageSrc: teacherSigninImg,
    captionTh: 'โมดูลคุณครู 03 · สแกนเช็คชื่อรวดเร็วและสร้าง QR ประจำคาบเรียน',
    captionEn: 'Teacher Guide 03 · Rapid Gate Scanner & Period QR Check-in',
    targetTab: 'attendance',
  },
  {
    id: 'tch-step-4',
    stepNumber: '04',
    role: 'teacher',
    titleTh: 'บันทึกคะแนน วิเคราะห์กราฟเกรด & ส่งออก PDF',
    titleEn: 'Gradebook, Histogram Analytics & PDF Export',
    summaryTh: 'กรอกหรือนำเข้าคะแนนคำนวณเกรด 0–4 / A–F ดูกราฟฮิสโตแกรมกระจายเกรด และดาวน์โหลดรายงาน PDF',
    summaryEn: 'Record or import grades, inspect interactive distribution histograms, and download PDF reports.',
    detailsTh: [
      'เลือกรายวิชาในเมนู "บันทึกคะแนน & ทะเบียนผลการเรียน" กรอกคะแนนหรือนำเข้าจาก Excel',
      'ดูกราฟ "ฮิสโตแกรมการกระจายเกรด" ชี้เมาส์ที่แท่งกราฟเพื่อดูจำนวนนักเรียนและค่าเฉลี่ยได้ทันที',
      'กด "Download PDF" เพื่อส่งออกรายงานสรุปสถิติเกรด หรือส่งออก CSV รูปแบบ ปพ.5 / DMC / SchoolMIS',
    ],
    detailsEn: [
      'Select a course in Gradebook to enter scores or import via CSV/Excel.',
      'Hover bars on the Grade Distribution Histogram to inspect exact student counts.',
      'Click "Download PDF" for official records or export PP.5 / DMC / SchoolMIS CSVs.',
    ],
    tipTh: 'สามารถสลับเปิด-ปิดการแจ้งเตือนคะแนนอัตโนมัติได้จากแถบด้านบนของหน้าสมุดคะแนน',
    tipEn: 'Use the Auto-Notify toggle in Gradebook while batch-entering draft scores.',
    imageSrc: teacherSigninImg,
    captionTh: 'โมดูลคุณครู 04 · บันทึกคะแนน ดูฮิสโตแกรมกระจายเกรด และดาวน์โหลดรายงาน PDF',
    captionEn: 'Teacher Guide 04 · Gradebook, Histogram & PDF Reports',
    targetTab: 'gradebook',
  },
];

export function resolveInteractiveTopic(
  topicId: string,
  role: UserRole,
  lang: AppLanguage
): {
  topic: InteractiveGuideTopic;
  title: string;
  summary: string;
  howTo: string[];
  tip?: string;
} | null {
  const topic = INTERACTIVE_GUIDE_TOPICS[topicId];
  if (!topic) return null;
  const override = topic.roleOverrides?.[role];
  const summary =
    lang === 'th'
      ? override?.summaryTh ?? topic.summaryTh
      : override?.summaryEn ?? topic.summaryEn;
  const howTo =
    lang === 'th'
      ? override?.howToTh ?? topic.howToTh
      : override?.howToEn ?? topic.howToEn;
  const tip =
    lang === 'th'
      ? override?.tipTh ?? topic.tipTh
      : override?.tipEn ?? topic.tipEn;
  return {
    topic,
    title: lang === 'th' ? topic.titleTh : topic.titleEn,
    summary,
    howTo,
    tip,
  };
}
