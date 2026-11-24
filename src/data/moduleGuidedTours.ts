import { AppLanguage, UserRole } from '../types';
import { MascotMood } from './interactiveGuideTopics';

export interface ModuleTourStep {
  id: string;
  selector: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  checklistTh?: string[];
  checklistEn?: string[];
  actionHintTh?: string;
  actionHintEn?: string;
  mood: MascotMood;
  roles?: UserRole[];
  /** Optional sub-tab inside system_settings so the tour opens the exact panel automatically */
  settingsTab?: string;
}

export interface ModuleTourDefinition {
  moduleId: string;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  steps: ModuleTourStep[];
}

export interface GuidedPlaybookStep {
  id: string;
  moduleId: string;
  settingsTab?: string;
  titleTh: string;
  titleEn: string;
  summaryTh: string;
  summaryEn: string;
  checklistTh: string[];
  checklistEn: string[];
}

export interface GuidedPlaybook {
  id: string;
  roleTagTh: string;
  roleTagEn: string;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  estimatedMinutes: number;
  audienceRoles: UserRole[];
  steps: GuidedPlaybookStep[];
}

export const MODULE_GUIDED_TOURS: Record<string, ModuleTourDefinition> = {
  dashboard: {
    moduleId: 'dashboard',
    titleTh: 'ทัวร์แนะนำหน้า Dashboard ภาพรวม',
    titleEn: 'Dashboard Overview Guided Tour',
    subtitleTh: 'รู้จักตัวชี้วัด สถิติการมาเรียนสด และโต๊ะทำงานประจำวันแบบจับมือทำทีละขั้น',
    subtitleEn: 'Explore real-time KPIs, live check-ins, and your daily desk step by step.',
    steps: [
      {
        id: 'dash-subtabs',
        selector: '[data-guide-id="dashboard-subtabs"]',
        titleTh: '1. สลับมุมมองในหน้า Dashboard',
        titleEn: '1. Switch Dashboard Views',
        descriptionTh: 'ใช้แถบนี้สลับระหว่าง "ภาพรวม KPI", "เช็คชื่อ & GPS สด", "นวัตกรรมการเรียนรู้" และ "ประกาศโรงเรียน" ได้ทันที',
        descriptionEn: 'Switch between Overview KPIs, Live GPS Attendance, Innovations Hub, and Campus News.',
        checklistTh: [
          'กดแท็บ "ภาพรวม" เพื่อดูสถิติรวมทั้งโรงเรียน',
          'กดแท็บ "เช็คชื่อ & GPS สด" เพื่อตรวจสอบภาพถ่ายและพิกัดการสแกนวันนี้',
          'กดแท็บ "ประกาศโรงเรียน" เพื่อติดตามข่าวสารด่วน',
        ],
        checklistEn: [
          'Select "Overview" to inspect school-wide daily metrics.',
          'Select "Live GPS" to inspect real-time photo & geofence check-ins.',
          'Select "Campus News" for urgent broadcasts.',
        ],
        actionHintTh: 'คลิกเลือกแท็บย่อยในแถบด้านบนเพื่อเปลี่ยนมุมมองข้อมูล',
        actionHintEn: 'Click any sub-tab button in the top bar to switch dashboard perspectives.',
        mood: 'pointing',
      },
      {
        id: 'dash-kpis',
        selector: '[data-guide-id="dashboard-kpis"]',
        titleTh: '2. บัตรตัวชี้วัดสำคัญประจำวัน (Key KPIs)',
        titleEn: '2. Daily School KPI Cards',
        descriptionTh: 'สรุปตัวเลขสำคัญแบบเรียลไทม์ ทั้งจำนวนนักเรียน อัตราการมาเรียนวันนี้ ยอดเก็บค่าเทอม และสัดส่วนผูก LINE ผู้ปกครอง',
        descriptionEn: 'Real-time summary of active students, today’s attendance rate, tuition collection, and guardian LINE sync.',
        checklistTh: [
          'ตรวจสอบอัตราการมาเรียนวันนี้เทียบกับจำนวนนักเรียนทั้งหมด',
          'ดูจำนวนผู้ปกครองที่เชื่อมต่อ LINE OA แล้ว เพื่อเช็กความครอบคลุมการแจ้งเตือน',
          'ตรวจยอดชำระค่าธรรมเนียมและรายการที่รอตรวจสอบ',
        ],
        checklistEn: [
          'Verify today’s attendance rate against enrolled students.',
          'Check guardian LINE OA connection coverage.',
          'Review collected tuition and pending verification counts.',
        ],
        actionHintTh: 'ใช้ตรวจภาพรวมความพร้อมของโรงเรียนได้ทันทีตั้งแต่เปิดหน้าแรก',
        actionHintEn: 'Check daily readiness across academics and parent communication at a glance.',
        mood: 'celebrate',
      },
      {
        id: 'dash-today-desk',
        selector: '[data-guide-id="dashboard-today-desk"]',
        titleTh: '3. โต๊ะทำงานครูประจำวัน (Today’s Desk)',
        titleEn: '3. Today’s Teaching Desk',
        descriptionTh: 'รวมสิ่งที่คุณครูต้องจัดการวันนี้ไว้ในจุดเดียว: คาบสอนวันนี้ ใบลาที่รออนุมัติ และการบ้านที่รอตรวจให้คะแนน',
        descriptionEn: 'Your daily teaching checklist: today’s classes, pending leaves, and ungraded homework.',
        checklistTh: [
          'ตรวจตารางคาบสอนที่กำลังจะถึงในวันนี้',
          'กดเข้าคิวใบลารออนุมัติเพื่อยืนยันหรือส่งต่อให้ผู้บริหาร',
          'เช็กงานและการบ้านของนักเรียนที่ส่งเข้ามาใหม่และรอตรวจ',
        ],
        checklistEn: [
          'Check your upcoming teaching periods today.',
          'Approve or review pending student leave requests.',
          'Open ungraded homework submissions directly.',
        ],
        actionHintTh: 'คลิกปุ่มทางลัดในกล่องนี้เพื่อกระโดดไปอนุมัติใบลาหรือตรวจการบ้านทันที',
        actionHintEn: 'Click any shortcut inside this desk to jump straight to pending tasks.',
        mood: 'pointing',
        roles: ['super_admin', 'admin', 'teacher'],
      },
      {
        id: 'dash-charts',
        selector: '[data-guide-id="dashboard-charts"]',
        titleTh: '4. แนวโน้มการมาเรียนและรายการเช็คชื่อล่าสุด',
        titleEn: '4. Monthly Attendance Trend & Recent Logs',
        descriptionTh: 'ติดตามกราฟแนวโน้มการมาเรียนรายเดือนพร้อมรายชื่อนักเรียนและบุคลากรที่เพิ่งสแกนเข้าประตูโรงเรียนล่าสุด',
        descriptionEn: 'Monitor monthly attendance trend charts alongside the latest gate check-in entries.',
        checklistTh: [
          'วางเมาส์เหนือเส้นกราฟเพื่อดูตัวเลขสถิติรายวัน/รายเดือน',
          'ตรวจรายการเช็คอินล่าสุดทางด้านขวาเพื่อดูเวลาเข้าและสถานะมาสาย',
        ],
        checklistEn: [
          'Hover over chart points to inspect daily/monthly percentages.',
          'Scan recent check-ins on the right for arrival time and status.',
        ],
        actionHintTh: 'ใช้ตรวจดูแนวโน้มการมาสายหรือขาดเรียนสะสมของทั้งโรงเรียน',
        actionHintEn: 'Monitor school-wide tardiness or absence patterns across the month.',
        mood: 'thinking',
      },
    ],
  },

  system_settings: {
    moduleId: 'system_settings',
    titleTh: 'ทัวร์ตั้งค่าระบบ บัญชีนักเรียน และสิทธิ์การใช้งาน',
    titleEn: 'System Settings, Student Accounts & Permissions Tour',
    subtitleTh: 'จับมือทำตั้งแต่ตรวจความพร้อมโรงเรียน ตั้งลิงก์ล็อกอินนักเรียน จนถึงออกบัญชีด้วยรหัสเริ่มต้น = รหัสนักเรียน',
    subtitleEn: 'Step-by-step setup: readiness check, student login link, and Student-ID password issuance.',
    steps: [
      {
        id: 'set-tabs',
        selector: '[data-guide-id="settings-tabs"]',
        titleTh: '1. แถบหมวดการตั้งค่าหลัก 6 กลุ่ม',
        titleEn: '1. Primary Settings Tab Groups',
        descriptionTh: 'รวมการตั้งค่าทั้งหมดไว้ใน 6 กลุ่ม: ภาพรวมระบบ, โรงเรียน & GPS, สิทธิ์บทบาท, LINE OA & เวลาเรียน, บัญชีนักเรียน และแพ็กเกจ/Audit Log',
        descriptionEn: 'All school configurations organized into 6 clean groups including Overview, GPS, Permissions, LINE OA, Student Accounts, and Audit Logs.',
        checklistTh: [
          'เลือก "ภาพรวมระบบ" เพื่อดูสถานะความพร้อมทุกด้านในหน้าเดียว',
          'เลือก "โรงเรียน & GPS" เพื่อกำหนดพิกัดรัศมีเช็คชื่อและสำรองข้อมูล',
          'เลือก "บัญชีนักเรียน" เพื่อตั้งลิงก์ล็อกอินและสร้างรหัสผ่านให้นักเรียน',
        ],
        checklistEn: [
          'Choose Overview to review school readiness status.',
          'Choose School & GPS to configure geofence gates and backups.',
          'Choose Student Accounts to issue credentials and copy login URLs.',
        ],
        actionHintTh: 'กดปุ่ม "บันทึกการตั้งค่า" มุมขวาบนทุกครั้งหลังแก้ข้อมูลโรงเรียนหรือเวลาตัดสาย',
        actionHintEn: 'Click "Save Settings" in the top right after modifying school details or cutoff times.',
        mood: 'pointing',
        settingsTab: 'control_overview',
      },
      {
        id: 'set-overview',
        selector: '[data-guide-id="settings-overview-panel"]',
        titleTh: '2. ศูนย์ควบคุมความพร้อมและทางลัดตั้งค่า',
        titleEn: '2. Readiness & Quick Policy Controls',
        descriptionTh: 'ตรวจสอบสถานะ GPS โรงเรียน ระบบ LINE OA บทบาทผู้ดูแล และสลับเปิด-ปิดสิทธิ์สำคัญได้ทันทีโดยไม่ต้องสลับหลายหน้า',
        descriptionEn: 'Verify campus GPS readiness, LINE OA health, admin roster, and toggle quick policies in one spot.',
        checklistTh: [
          'ดูการ์ดสรุปสถานะ GPS และ LINE OA ว่าขึ้นพร้อมใช้งานครบหรือยัง',
          'กดเปิด/ปิดนโยบายสิทธิ์เร่งด่วน เช่น การอนุญาตนักเรียนแก้โปรไฟล์',
          'ตรวจสอบ Audit Log ล่าสุดเพื่อยืนยันประวัติการปรับตั้งค่า',
        ],
        checklistEn: [
          'Confirm Campus GPS and LINE OA readiness indicators.',
          'Toggle quick role policies directly if needed.',
          'Review recent audit log entries.',
        ],
        actionHintTh: 'หากจุดใดยังไม่พร้อม ให้คลิกปุ่มทางลัดในการ์ดนั้นเพื่อไปตั้งค่าได้ทันที',
        actionHintEn: 'Click any shortcut card inside Overview to jump straight to incomplete settings.',
        mood: 'happy',
        settingsTab: 'control_overview',
      },
      {
        id: 'set-student-login',
        selector: '[data-guide-id="settings-student-login-card"]',
        titleTh: '3. ตั้งค่าลิงก์ล็อกอินเฉพาะของโรงเรียนสำหรับนักเรียน',
        titleEn: '3. Dedicated School Student Login Link',
        descriptionTh: 'กำหนดรหัสโรงเรียน (Slug), นโยบายรหัสผ่านเริ่มต้นเป็น "รหัสนักเรียน", เปิด-ปิดปุ่มล็อกอิน และคัดลอกลิงก์/QR ส่งให้นักเรียนทั้งโรงเรียน',
        descriptionEn: 'Configure school login slug, set default initial password policy to Student ID, and copy the dedicated login URL/QR.',
        checklistTh: [
          'ตรวจสอบช่อง "ประเภทระหัสผ่านเริ่มต้น" ให้เป็น รหัสนักเรียน (แนะนำ)',
          'ปรับข้อความคำแนะนำให้นักเรียนรู้ว่าครั้งแรกให้กรอกรหัสนักเรียนแล้วระบบจะบังคับเปลี่ยน',
          'กดปุ่ม "คัดลอกลิงก์เข้าสู่ระบบ" ส่งให้ครูประจำชั้นหรือไลน์กลุ่มห้อง',
        ],
        checklistEn: [
          'Verify Default Password Type is set to Student ID (Recommended).',
          'Review helper notes shown on the student sign-in screen.',
          'Copy the dedicated school login URL to share with homerooms.',
        ],
        actionHintTh: 'กดปุ่มบันทึกภายในการ์ดนี้เพื่ออัปเดตหน้าล็อกอินของโรงเรียนทันที',
        actionHintEn: 'Save inside this card to publish the login rules to students immediately.',
        mood: 'pointing',
        settingsTab: 'student_login_config',
      },
      {
        id: 'set-student-accounts',
        selector: '[data-guide-id="settings-student-accounts"]',
        titleTh: '4. สร้างบัญชี & รีเซ็ตรหัสผ่านนักเรียน (รหัสเริ่มต้น = รหัสนักเรียน)',
        titleEn: '4. Issue & Reset Student Accounts (Initial Password = Student ID)',
        descriptionTh: 'สร้างบัญชีให้นักเรียนที่ยังไม่มีบัญชีทั้งหมดในคลิกเดียว หรือกดรีเซ็ตรหัสผ่านรายคนโดยตั้งรหัสผ่านเป็นรหัสนักเรียน ไม่มีวันหมดอายุ และบังคับเปลี่ยนในครั้งแรกที่เข้า',
        descriptionEn: 'Bulk-create missing student accounts in one click or reset individual passwords to their Student ID with mandatory change on first login.',
        checklistTh: [
          'ตรวจสอบแบนเนอร์แจ้งเตือนหากพบรหัสนักเรียนที่สั้นกว่า 6 หลัก',
          'กดปุ่ม "สร้างบัญชีให้นักเรียนที่ยังไม่มีบัญชีทั้งหมด" เพื่อออกบัญชีชุดใหญ่',
          'คัดลอกตารางบัญชีที่สร้างสำเร็จ หรือกด "รีเซ็ตรหัสผ่าน" รายคนได้ทุกเมื่อ',
        ],
        checklistEn: [
          'Check any warning banner if a student ID has fewer than 6 characters.',
          'Click "Create All Missing Accounts" to provision accounts in bulk.',
          'Copy the issued credentials table or reset any individual student password.',
        ],
        actionHintTh: 'นักเรียนที่ล็อกอินด้วยรหัสนักเรียนครั้งแรก จะถูกบังคับให้ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษรก่อนเข้าเรียน',
        actionHintEn: 'On first login with their Student ID, students must set a new >= 8-char password before entering.',
        mood: 'celebrate',
        settingsTab: 'student_accounts',
      },
    ],
  },

  students: {
    moduleId: 'students',
    titleTh: 'ทัวร์แนะนำหน้าทะเบียนนักเรียน (Student Directory)',
    titleEn: 'Student Directory Guided Tour',
    subtitleTh: 'จัดการรายชื่อนักเรียน อนุมัติบัญชี พิมพ์บัตร QR และนำเข้า/ส่งออก Excel อย่างรวดเร็ว',
    subtitleEn: 'Search students, approve registrations, print QR passes, and import/export spreadsheets.',
    steps: [
      {
        id: 'stu-tabs',
        selector: '[data-guide-id="students-tabs"]',
        titleTh: '1. สลับดูทะเบียนรายชื่อ / คำขอสมัครเข้าเรียน / สถิติ',
        titleEn: '1. Roster, Account Approvals & Analytics Tabs',
        descriptionTh: 'ตรวจรายชื่อนักเรียนทั้งหมด ดูคิวอนุมัติคำขอสมัครบัญชีนักเรียนใหม่ หรือดูกราฟสถิติแยกตามระดับชั้น',
        descriptionEn: 'Switch between the full roster, pending student account approvals, and grade-level analytics.',
        checklistTh: [
          'แท็บ "รายชื่อนักเรียน" สำหรับค้นหา แก้ไข พิมพ์บัตร และดูโปรไฟล์',
          'แท็บ "อนุมัติบัญชี" สำหรับตรวจสอบและกดอนุมัติผู้สมัครใหม่',
          'แท็บ "สถิติ" เพื่อดูสัดส่วนนักเรียนรายชั้นและห้องเรียน',
        ],
        checklistEn: [
          'Use Directory to search, edit, or print student passes.',
          'Use Approvals to review and approve student sign-ups.',
          'Use Analytics to inspect class distribution charts.',
        ],
        actionHintTh: 'คลิกสลับแท็บได้ทันทีโดยข้อมูลไม่สูญหาย',
        actionHintEn: 'Switch freely between roster, approvals, and analytics.',
        mood: 'pointing',
      },
      {
        id: 'stu-search',
        selector: '[data-guide-id="students-search-bar"]',
        titleTh: '2. ค้นหาและคัดกรองตามระดับชั้น',
        titleEn: '2. Search & Grade Level Filters',
        descriptionTh: 'ค้นหาด้วยชื่อ รหัสนักเรียน เลขบัตรประชาชน หรือเลือกกรองเฉพาะชั้น อ.1–ม.6 และห้องเรียนได้ทันที',
        descriptionEn: 'Find students by name, ID, national ID, or filter by grade level and classroom.',
        checklistTh: [
          'พิมพ์ชื่อ-สกุล หรือรหัสนักเรียนในช่องค้นหา',
          'เลือกชั้นเรียนและห้องเรียนเพื่อจำกัดรายชื่อเฉพาะห้อง',
          'คลิกที่การ์ดนักเรียนเพื่อดูโปรไฟล์ ออก ปพ.1 หรือพิมพ์บัตร QR',
        ],
        checklistEn: [
          'Type Thai/English name or Student ID in the search input.',
          'Filter by grade level and classroom.',
          'Click any student row/card to open details or print QR.',
        ],
        actionHintTh: 'คลิกที่การ์ดหรือชื่อนักเรียนเพื่อดูโปรไฟล์ และกด "Print QR" พิมพ์บัตรสแกนเช็คชื่อได้!',
        actionHintEn: 'Click any student card to open details and print a high-quality QR attendance pass!',
        mood: 'happy',
      },
      {
        id: 'stu-manage-menu',
        selector: '[data-guide-id="students-import-export"]',
        titleTh: '3. จัดการข้อมูลชุด: นำเข้า Excel & เลื่อนชั้น',
        titleEn: '3. Bulk Tools: Excel Import & Promotion',
        descriptionTh: 'รวมเครื่องมือนำเข้า/ส่งออก CSV-Excel แบบจับคู่คอลัมน์เอง พิมพ์บัตรทั้งห้อง และเลื่อนชั้นข้ามปีการศึกษา',
        descriptionEn: 'Open this menu for custom-header Excel imports, batch ID printing, and yearly class promotion.',
        checklistTh: [
          'กดเลือก "นำเข้า/ส่งออก Excel" เพื่ออัปโหลดรายชื่อทั้งโรงเรียน',
          'ใช้ "พิมพ์บัตร QR ทั้งห้อง" เพื่อแจกบัตรเช็คชื่อพร้อมกัน',
          'ใช้ "เลื่อนชั้นเรียน" เมื่อขึ้นปีการศึกษาใหม่',
        ],
        checklistEn: [
          'Pick Excel Import/Export to upload bulk student sheets.',
          'Use Batch QR Print to generate cards for an entire homeroom.',
          'Use Promote Students at the start of a new academic year.',
        ],
        actionHintTh: 'แนะนำให้นำเข้าข้อมูลนักเรียนที่มี "รหัสนักเรียน (6 หลักขึ้นไป)" ก่อนสร้างบัญชีล็อกอิน',
        actionHintEn: 'Import students with valid >= 6-char Student IDs before provisioning login accounts.',
        mood: 'celebrate',
      },
      {
        id: 'stu-add-buttons',
        selector: '[data-guide-id="students-add-single"]',
        titleTh: '4. เพิ่มนักเรียนใหม่รายคนหรือทั้งห้อง',
        titleEn: '4. Add Single Student or Full Classroom',
        descriptionTh: 'เลือกเพิ่มทีละคน หรือกดปุ่ม "เพิ่มนักเรียนทั้งห้อง" เพื่อกรอก/วางรายชื่อหลายสิบคนพร้อมกันในครั้งเดียว',
        descriptionEn: 'Add individual student profiles or bulk-paste an entire classroom roster.',
        checklistTh: [
          'กรอกรหัสนักเรียน คำนำหน้า ชื่อ-สกุล และชั้น/ห้องให้ครบถ้วน',
          'ระบุชื่อผู้ปกครองและเบอร์ติดต่อสำหรับระบบแจ้งเตือน',
        ],
        checklistEn: [
          'Fill Student ID, full name, grade level, and classroom.',
          'Add guardian contact details for automated notifications.',
        ],
        actionHintTh: 'กรณีมีนักเรียนย้ายเข้ากลางเทอม กดปุ่มนี้เพื่อเพิ่มรายคนได้ทันที',
        actionHintEn: 'Use this button whenever a mid-term transfer student joins.',
        mood: 'pointing',
      },
    ],
  },

  teachers: {
    moduleId: 'teachers',
    titleTh: 'ทัวร์แนะนำหน้าบุคลากรและครู (Faculty & Staff)',
    titleEn: 'Faculty & Staff Directory Guided Tour',
    subtitleTh: 'ดูทำเนียบครู ผังองค์กร มอบหมายสิทธิ์แอดมินโรงเรียน และนำเข้าข้อมูลบุคลากรจาก Excel',
    subtitleEn: 'Browse staff directory, org chart, assign school admin roles, and import teacher sheets.',
    steps: [
      {
        id: 'tch-tabs',
        selector: '[data-guide-id="teachers-tabs"]',
        titleTh: '1. สลับระหว่าง "ทำเนียบบุคลากร" และ "ผังองค์กร"',
        titleEn: '1. Switch Directory & Organization Chart',
        descriptionTh: 'ตรวจสอบรายชื่อครูแยกตามกลุ่มสาระ/ตำแหน่ง หรือเปิดมุมมองผังโครงสร้างบริหารของโรงเรียน',
        descriptionEn: 'Browse teachers by department/position or inspect the interactive school org chart.',
        checklistTh: [
          'กด "ทำเนียบบุคลากร" เพื่อค้นหา แก้ไขประวัติ และตรวจสอบสิทธิ์ครู',
          'กด "ผังองค์กร" เพื่อดูสายบังคับบัญชาและหัวหน้ากลุ่มสาระ',
        ],
        checklistEn: [
          'Select Directory to search, edit profiles, and check teacher roles.',
          'Select Organization Chart to inspect leadership hierarchy.',
        ],
        actionHintTh: 'สลับดูผังองค์กรได้ทันทีโดยไม่ต้องโหลดหน้าใหม่',
        actionHintEn: 'Switch instantaneously between directory and org chart views.',
        mood: 'pointing',
      },
      {
        id: 'tch-tools',
        selector: '[data-guide-id="teachers-tools"]',
        titleTh: '2. เครื่องมือนำเข้า Excel, ส่งออก CSV และเชิญ/เพิ่มครู',
        titleEn: '2. Excel Import, CSV Export & Teacher Onboarding',
        descriptionTh: 'นำเข้ารายชื่อครูทั้งโรงเรียนจาก Excel ส่งออกไฟล์รายชื่อ หรือเชิญ/เพิ่มคุณครูใหม่เข้าสู่ระบบ',
        descriptionEn: 'Bulk-import teachers from Excel, export CSV reports, or invite/add new staff accounts.',
        checklistTh: [
          'เปิดเมนู "เครื่องมือข้อมูล" เพื่อนำเข้าไฟล์บุคลากรจาก Excel หรือโหลด CSV',
          'กด "+ เพิ่มครู / เชิญครู" เพื่อสร้างบัญชีและกำหนดกลุ่มสาระหรือห้องประจำชั้น',
        ],
        checklistEn: [
          'Open Data Actions to import teachers from Excel or download CSV.',
          'Click Add/Invite Teacher to onboard new faculty and assign departments.',
        ],
        actionHintTh: 'สามารถกำหนดให้ครูช่วยดูแลระดับโรงเรียน (Admin) ได้ในหน้าต่างข้อมูลครู',
        actionHintEn: 'Assign School Admin privileges on any teacher profile when needed.',
        mood: 'happy',
      },
    ],
  },

  courses: {
    moduleId: 'courses',
    titleTh: 'ทัวร์แนะนำหน้าหลักสูตรและรายวิชา',
    titleEn: 'Courses & Curriculum Guided Tour',
    subtitleTh: 'จัดการรายวิชา หน่วยกิต อาจารย์ผู้สอน คัดกรอง และลงทะเบียนนักเรียนเข้าชั้นเรียนใน 3 ขั้นตอน',
    subtitleEn: 'Manage courses, credit units, filters, and class enrollments in 3 guided steps.',
    steps: [
      {
        id: 'crs-toolbar',
        selector: '[data-guide-id="courses-header-actions"]',
        titleTh: '1. เครื่องมือจัดการหลักสูตรและนำเข้า Excel',
        titleEn: '1. Curriculum Tools & Bulk Import',
        descriptionTh: 'นำเข้า/ส่งออกรายวิชาจาก Excel จัดการกลุ่มสาระการเรียนรู้ หรือสร้างรายวิชาใหม่เข้าสู่ระบบ',
        descriptionEn: 'Import/export course catalogs, configure subject departments, or add new courses.',
        checklistTh: [
          'กด "เครื่องมือจัดการ" เพื่อนำเข้ารายวิชาจำนวนมากจาก Excel/CSV',
          'ตั้งค่ากลุ่มสาระการเรียนรู้ของโรงเรียนได้ตามโครงสร้างหลักสูตร',
          'กด "เพิ่มรายวิชาใหม่" เพื่อสร้างรายวิชา หน่วยกิต และครูผู้สอน',
        ],
        checklistEn: [
          'Open Management Tools to bulk import courses from Excel/CSV.',
          'Customize learning areas / departments for your school.',
          'Click Add Course to define code, credits, and teacher.',
        ],
        actionHintTh: 'เมื่อสร้างรายวิชาแล้ว ระบบจะเชื่อมไปยัง Gradebook, ตารางสอน และห้องเรียน LMS อัตโนมัติ',
        actionHintEn: 'Newly created courses sync automatically to Gradebook, Timetable, and LMS.',
        mood: 'pointing',
        roles: ['super_admin', 'admin', 'teacher'],
      },
      {
        id: 'crs-filter',
        selector: '[data-guide-id="courses-search-filter"]',
        titleTh: '2. ค้นหาและกรองรายวิชาตามกลุ่มสาระ ครู หรือเทอม',
        titleEn: '2. Search & Filter Courses',
        descriptionTh: 'พิมพ์รหัสวิชา ชื่อวิชา หรือกดปุ่ม "ตัวกรอง" เพื่อคัดกรองตามประเภทวิชา กลุ่มสาระ ครูผู้สอน และปีการศึกษา',
        descriptionEn: 'Search by code/title or expand filters for course type, department, instructor, and semester.',
        checklistTh: [
          'พิมพ์คำค้นหาเพื่อกรองรายวิชาแบบทันที',
          'คลิกปุ่ม "ตัวกรอง" เพื่อแยกดูรายวิชาของครูแต่ละท่านหรือแต่ละกลุ่มสาระ',
        ],
        checklistEn: [
          'Type any keyword to narrow courses instantaneously.',
          'Toggle Filter to inspect courses by teacher, department, or term.',
        ],
        actionHintTh: 'สามารถเลือกหลายรายวิชาพร้อมกันเพื่อลบวิชาที่ซ้ำซ้อนได้จากเมนูเครื่องมือ',
        actionHintEn: 'Select duplicate courses via checkboxes or the tool menu to clean up quickly.',
        mood: 'thinking',
      },
      {
        id: 'crs-grid',
        selector: '[data-guide-id="courses-list-grid"]',
        titleTh: '3. รายการรายวิชาและรายละเอียดการลงทะเบียนเรียน',
        titleEn: '3. Course Catalog & Enrollment Details',
        descriptionTh: 'คลิกการ์ดรายวิชาด้านซ้ายเพื่อเปิดรายละเอียดด้านขวา ทั้งรายชื่อนักเรียนที่ลงทะเบียน เวลาเรียนขั้นต่ำ 80% และตัวชี้วัด',
        descriptionEn: 'Click any course card on the left to inspect enrolled students, 80% hour thresholds, and indicators on the right.',
        checklistTh: [
          'คลิกการ์ดวิชาที่ต้องการจัดการ',
          'ตรวจสอบแท็บด้านขวาเพื่อเพิ่ม/ถอนนักเรียนเข้าสู่ห้องเรียนของวิชานี้',
        ],
        checklistEn: [
          'Select any course card on the left column.',
          'Use the right detail pane to enroll or manage class students.',
        ],
        actionHintTh: 'อย่าลืมลงทะเบียนนักเรียนเข้าวิชาก่อนเริ่มเช็กชื่อรายคาบหรือกรอกคะแนน',
        actionHintEn: 'Ensure students are enrolled in the course before taking period roll call or entering grades.',
        mood: 'celebrate',
      },
    ],
  },

  timetable: {
    moduleId: 'timetable',
    titleTh: 'ทัวร์แนะนำตารางเรียน & ตารางสอน',
    titleEn: 'Timetable & Schedule Guided Tour',
    subtitleTh: 'ดูตารางรายห้อง เช็กชื่อรายคาบ ปฏิทิน เกณฑ์เวลาเรียน 80% และตรวจเช็กภาระงานครู',
    subtitleEn: 'Browse classroom grids, period roll call, calendar, 80% rules, and teacher workload.',
    steps: [
      {
        id: 'tt-tabs',
        selector: '[data-guide-id="timetable-view-tabs"]',
        titleTh: '1. เลือกมุมมองตารางเรียนและงานสอน',
        titleEn: '1. Switch Timetable Perspectives',
        descriptionTh: 'สลับดูได้ครบทั้ง "ตารางห้อง", "เช็กชื่อรายคาบ", "ปฏิทิน", "เวลาเรียน 80%", "ภาระงานครู" และ "หาครูสอนแทน"',
        descriptionEn: 'Toggle between Classroom Grid, Period Roll Call, Calendar, 80% Eligibility, Teacher Workload, and Substitute Finder.',
        checklistTh: [
          'ใช้ "ตารางห้อง" ดูคาบเรียน จันทร์–ศุกร์ แยกตามห้องเรียน',
          'ใช้ "เช็กชื่อรายคาบ" เพื่อบันทึกขาด/ลา/มาสายเชื่อม ปพ.5 ทันที',
          'ใช้ "หาครูสอนแทน" เมื่อมีครูลาในวันนั้น',
        ],
        checklistEn: [
          'Use Classroom Grid to view Mon–Fri schedules per room.',
          'Use Period Roll Call to mark period attendance synced to PP.5.',
          'Use Substitute Finder when a teacher is on leave.',
        ],
        actionHintTh: 'แถบแจ้งเตือนสีส้มด้านล่างจะเตือนอัตโนมัติหากพบคาบที่ครูหรือห้องเรียนชนกัน',
        actionHintEn: 'An orange conflict strip alerts you automatically whenever teachers or rooms double-book.',
        mood: 'pointing',
      },
      {
        id: 'tt-filters',
        selector: '[data-guide-id="timetable-filters-bar"]',
        titleTh: '2. กรองห้องเรียน ปีการศึกษา และภาคเรียน',
        titleEn: '2. Room, Academic Year & Term Filters',
        descriptionTh: 'เลือกห้องเรียนที่ต้องการดู หรือสลับปีการศึกษา/ภาคเรียน พร้อมปุ่มเช็คอินเข้าสอนรายคาบสำหรับคุณครู',
        descriptionEn: 'Pick a specific classroom, switch semester/academic year, and trigger one-tap class check-in.',
        checklistTh: [
          'เลือกห้องเรียนหรือ "ทุกห้อง" เพื่อตรวจสอบตารางรวม',
          'เลือกปีการศึกษาและภาคเรียนให้ตรงกับเทอมปัจจุบัน',
          'กดปุ่มเช็คอิน/เอาท์รายคาบเมื่อถึงเวลาสอน',
        ],
        checklistEn: [
          'Filter by classroom or All Rooms.',
          'Verify the selected academic year and semester.',
          'Tap period check-in/out when starting or ending class.',
        ],
        actionHintTh: 'สามารถสั่งพิมพ์ตารางสอนหรือส่งออกผ่านปุ่มพิมพ์ในหน้าตารางห้องได้ทันที',
        actionHintEn: 'Print clean classroom or personal schedules directly from this toolbar.',
        mood: 'happy',
      },
      {
        id: 'tt-grid',
        selector: '[data-guide-id="timetable-grid-area"]',
        titleTh: '3. พื้นที่ตารางสอน 5 วันและรายละเอียดคาบเรียน',
        titleEn: '3. 5-Day Schedule Grid & Slot Actions',
        descriptionTh: 'คลิกที่ช่องคาบเรียนเพื่อดูรายละเอียดวิชา ครูผู้สอน แก้ไขคาบ ลบ หรือเปิดเช็กชื่อของคาบนั้นได้ทันที',
        descriptionEn: 'Click any timetable cell to inspect course info, edit slots, or open period attendance directly.',
        checklistTh: [
          'คลิกช่องคาบเรียนที่ต้องการดูรายละเอียดหรือแก้ไข',
          'ลาก/สลับ หรือเพิ่มคาบใหม่ในช่องว่าง (สำหรับผู้มีสิทธิ์แก้ไข)',
        ],
        checklistEn: [
          'Click any scheduled slot to inspect or edit course & room info.',
          'Add slots to empty periods if you have edit permissions.',
        ],
        actionHintTh: 'นักเรียนและผู้ปกครองจะเห็นเฉพาะตารางห้องของตนเองแบบอัตโนมัติ',
        actionHintEn: 'Students and parents automatically see only their own homeroom schedule.',
        mood: 'celebrate',
      },
    ],
  },

  attendance: {
    moduleId: 'attendance',
    titleTh: 'ทัวร์แนะนำระบบเช็คชื่อ & สแกนหน้าประตู',
    titleEn: 'Gate Attendance & Scanner Tour',
    subtitleTh: 'สแกนบัตร QR นักเรียน ตรวจคำขอลาเรียน สร้าง QR รายคาบ และตั้งค่าพิกัด GPS',
    subtitleEn: 'Scan student QR passes, manage leaves, issue period QRs, and verify campus GPS.',
    steps: [
      {
        id: 'att-tabs',
        selector: '[data-guide-id="attendance-tabs"]',
        titleTh: '1. เมนูย่อยงานเช็คชื่อทั้งหมด',
        titleEn: '1. Attendance Sub-Modules',
        descriptionTh: 'สลับดูหน้าสแกนหน้าประตู, รายการอนุมัติใบลา, ส่งออกรายงาน Excel/PDF, QR รายคาบ และตั้งค่า GPS',
        descriptionEn: 'Navigate between gate scanning, leave approval, exports, classroom period QR, and GPS setup.',
        checklistTh: [
          'แท็บ "เช็คชื่อหน้าประตู" สำหรับบันทึกมา/สาย/ขาด/ลา และสแกนบัตร',
          'แท็บ "ใบลา" เพื่ออนุมัติคำขอลาจากผู้ปกครองหรือนักเรียน',
          'แท็บ "QR รายคาบ" เพื่อสร้างคิวอาร์ให้นักเรียนสแกนเข้าห้อง',
        ],
        checklistEn: [
          'Use Gate Check-in for daily scanning and manual overrides.',
          'Use Leave Approvals to process incoming absence requests.',
          'Use Period QR to generate live classroom check-in codes.',
        ],
        actionHintTh: 'ตรวจเลขแจ้งเตือนคิวใบลาที่รออนุมัติได้บนแท็บด้านบน',
        actionHintEn: 'Check pending leave counts right on the sub-tab badges.',
        mood: 'pointing',
      },
      {
        id: 'att-scanner',
        selector: '[data-guide-id="attendance-scanner-box"]',
        titleTh: '2. สถานีสแกนบัตร QR (รองรับ EDUVERSE:STU:)',
        titleEn: '2. Gate QR Pass Scanner Station',
        descriptionTh: 'กรอกหรือยิงบาร์โค้ด/QR จากบัตรนักเรียนเพื่อบันทึกเวลาเข้า-ออก หรือกด "เช็คชื่อบัญชีฉัน" สำหรับครูและเจ้าหน้าที่',
        descriptionEn: 'Scan student QR passes or record your own daily staff check-in directly.',
        checklistTh: [
          'เชื่อมต่อเครื่องยิงบาร์โค้ด USB หรือกรอกรหัสนักเรียนลงในช่องสแกน',
          'ระบบจะตัดสถานะ "มาเรียน" หรือ "มาสาย" ตามเวลาตั้งค่าระบบอัตโนมัติ',
          'แจ้งเตือนเข้าแอปและ LINE ผู้ปกครองทันทีหลังสแกน',
        ],
        checklistEn: [
          'Scan with USB QR reader or type Student ID into the box.',
          'Status automatically sets Present or Late using school cutoff.',
          'Notifies guardians immediately upon successful check-in.',
        ],
        actionHintTh: 'ครูสามารถกดปุ่มเช็คอินบัญชีตนเองที่จุดนี้ได้เช่นกัน',
        actionHintEn: 'Staff members can also log their own morning arrival here.',
        mood: 'celebrate',
      },
      {
        id: 'att-rapid',
        selector: '[data-guide-id="attendance-rapid-scanner"]',
        titleTh: '3. กล้องสแกนรัวต่อเนื่อง 1 วินาที/คน',
        titleEn: '3. Continuous Rapid Webcam Scanner',
        descriptionTh: 'เปิดกล้องสแกนบัตร QR ของนักเรียนต่อเนื่องหน้าประตูโรงเรียนในช่วงเช้าได้อย่างรวดเร็ว',
        descriptionEn: 'Launch live webcam continuous QR scanning for fast morning gate queues.',
        checklistTh: [
          'กดเปิดหน้าต่างกล้องสแกนรัวและอนุญาตการใช้กล้อง',
          'ให้นักเรียนชูบัตร QR หน้ากล้องทีละคนโดยไม่ต้องกดปุ่มซ้ำ',
        ],
        checklistEn: [
          'Launch the rapid scanner modal and grant camera access.',
          'Students present QR cards sequentially with auto-beep confirmation.',
        ],
        actionHintTh: 'เหมาะมากสำหรับจุดคัดกรองหน้าประตูโรงเรียนช่วงเช้าที่มีนักเรียนเข้าพร้อมกันจำนวนมาก',
        actionHintEn: 'Ideal for busy morning school gate queues.',
        mood: 'pointing',
      },
    ],
  },

  mobile_checkin: {
    moduleId: 'mobile_checkin',
    titleTh: 'ทัวร์แนะนำหน้าเช็คชื่อมือถือ & แตะบัตร NFC / ยื่นใบลา',
    titleEn: 'Mobile Selfie GPS, NFC & Leave Tour',
    subtitleTh: 'จับมือทำครบทุกวิธีเช็คอิน: เซลฟี่ตรวจพิกัด GPS, แตะบัตร NFC, ยื่นใบลา และเช็กชื่อรายคาบ',
    subtitleEn: 'Step-by-step mobile check-in via GPS selfie, NFC tap, leave submission, and period attendance.',
    steps: [
      {
        id: 'mob-tabs',
        selector: '[data-guide-id="mobile-checkin-tabs"]',
        titleTh: '1. เลือกวิธีเช็คอินหรือส่งใบลา',
        titleEn: '1. Select Check-In Mode or Leave Form',
        descriptionTh: 'สลับใช้ได้ครบทั้ง "เซลฟี่ GPS", "แตะบัตร NFC", "ยื่นใบลา", "ลงชื่อแทน (ครู)" และ "รายคาบ"',
        descriptionEn: 'Switch between Selfie GPS, NFC card tap, Leave Request, Staff Proxy, and Period Check-in.',
        checklistTh: [
          'กด "เซลฟี่" เพื่อถ่ายรูปยืนยันตัวตนพร้อมตรวจสอบระยะ GPS โรงเรียน',
          'กด "แตะ NFC" หากมือถือหรือจุดสแกนรองรับบัตรสมาร์ทการ์ด',
          'กด "ใบลา" เพื่อส่งคำขอลาป่วย/ลากิจแนบหลักฐาน',
        ],
        checklistEn: [
          'Select Selfie to capture check-in photo with campus GPS verification.',
          'Select NFC when tapping smart student ID cards.',
          'Select Leave to submit sick or personal leave requests.',
        ],
        actionHintTh: 'กดปุ่มเปิด/ปิดเสียงแจ้งเตือนมุมขวาบนได้หากต้องการใช้งานในห้องเรียนเงียบ',
        actionHintEn: 'Toggle sound confirmation in the top right whenever needed.',
        mood: 'pointing',
      },
      {
        id: 'mob-body',
        selector: '[data-guide-id="mobile-checkin-body"]',
        titleTh: '2. พื้นที่ปฏิบัติการเช็คอินและส่งใบลาตามขั้นตอน',
        titleEn: '2. Interactive Check-In & Leave Workspace',
        descriptionTh: 'ระบบจะแสดงสถานะ GPS ปัจจุบัน ระยะห่างจากประตูโรงเรียน และขั้นตอนยื่นใบลา/เช็กรายคาบให้กดทำตามได้ทันที',
        descriptionEn: 'View live GPS distance to school gates, capture check-in photos, or complete leave forms step by step.',
        checklistTh: [
          'ตรวจสอบสถานะสีเขียวว่าอยู่ในรัศมี GPS โรงเรียนแล้ว',
          'กดถ่ายเซลฟี่หรือแตะยืนยันเพื่อส่งข้อมูลเข้าประวัติวันนี้ทันที',
          'สำหรับครู: สามารถกด "มาครบทุกคน" ในแท็บรายคาบเพื่อเช็กทั้งห้องในคลิกเดียว',
        ],
        checklistEn: [
          'Confirm green GPS geofence status before submitting.',
          'Capture photo or confirm tap to save today’s timestamp.',
          'Teachers: use "Mark All Present" under Periods for fast roll call.',
        ],
        actionHintTh: 'หากเปิดใช้งาน FaceID/TouchID ไว้ ระบบจะให้ยืนยันตัวตนก่อนสแกนแทนนักเรียน',
        actionHintEn: 'If biometric lock is enabled, unlock once before recording proxy check-ins.',
        mood: 'celebrate',
      },
    ],
  },

  gradebook: {
    moduleId: 'gradebook',
    titleTh: 'ทัวร์แนะนำหน้าบันทึกคะแนน & ปพ. (Gradebook)',
    titleEn: 'Gradebook & Academic Analytics Tour',
    subtitleTh: 'เรียนรู้วิธีเลือกรายวิชา กรอก/นำเข้าคะแนน วิเคราะห์กราฟฮิสโตแกรม และออกรายงาน PDF',
    subtitleEn: 'Learn how to select courses, enter/import grades, inspect histograms, and export PDFs.',
    steps: [
      {
        id: 'gb-tabs',
        selector: '[data-guide-id="gradebook-tabs"]',
        titleTh: '1. เลือกโหมดสมุดคะแนนและเอกสาร ปพ.',
        titleEn: '1. Gradebook & Official MOE Tabs',
        descriptionTh: 'สลับใช้งานได้ครบทั้ง "สมุดบันทึกคะแนน", "ปพ.5 ประจำวิชา", "ปพ.6 รายบุคคล", "ปพ.3 ออนไลน์" และข้อมูล "สทศ. O-NET"',
        descriptionEn: 'Switch between Gradebook entry, PP.5, PP.6, PP.3 graduation records, and O-NET sheets.',
        checklistTh: [
          'แท็บ "สมุดบันทึกคะแนน" ใช้กรอกคะแนนเก็บ กลางภาค ปลายภาค',
          'แท็บ "ปพ.5" และ "ปพ.6" ใช้สรุปผลสัมฤทธิ์และออกเอกสารราชการ',
        ],
        checklistEn: [
          'Use Gradebook to input formative, midterm, and final scores.',
          'Use PP.5 & PP.6 tabs for official Ministry summary reports.',
        ],
        actionHintTh: 'สำหรับนักเรียน หน้านี้จะแสดงสรุปเกรดของตนเองโดยอัตโนมัติ',
        actionHintEn: 'Students see only their personal grade summary and reports here.',
        mood: 'pointing',
      },
      {
        id: 'gb-course-bar',
        selector: '[data-guide-id="gradebook-course-bar"]',
        titleTh: '2. ค้นหาและเลือกรายวิชาที่จะประเมินผล',
        titleEn: '2. Search & Pick a Course',
        descriptionTh: 'พิมพ์รหัสวิชา ชื่อวิชา หรือชื่อครูผู้สอนเพื่อกรอง จากนั้นเลือกวิชาเพื่อดูคะแนนของนักเรียนทั้งห้อง',
        descriptionEn: 'Filter by code, subject name, or teacher, then pick a course to load student scores.',
        checklistTh: [
          'พิมพ์รหัสวิชาหรือเลือกจากรายการด้านซ้าย',
          'ตรวจสอบสิทธิ์เวลาเรียน 80% (มส.) ของนักเรียนแต่ละคนในตาราง',
        ],
        checklistEn: [
          'Search or choose a course from the bar.',
          'Check each student’s 80% attendance eligibility automatically.',
        ],
        actionHintTh: 'ตารางด้านล่างจะโหลดรายชื่อและเกณฑ์ผ่านเวลาเรียน 80% ของวิชานี้ทันที',
        actionHintEn: 'The table below updates immediately with student grades and 80% eligibility.',
        mood: 'happy',
      },
      {
        id: 'gb-histogram',
        selector: '[data-guide-id="gradebook-histogram"]',
        titleTh: '3. ฮิสโตแกรมวิเคราะห์การกระจายผลการเรียน',
        titleEn: '3. Interactive Grade Distribution Histogram',
        descriptionTh: 'วิเคราะห์การกระจายคะแนนทั้งรายวิชา ทั้งโรงเรียน หรือแยกกลุ่มสาระ พร้อมค่าเฉลี่ย มัธยฐาน และอัตราการผ่าน',
        descriptionEn: 'Inspect score distribution across the course, whole school, or department with mean & pass rate.',
        checklistTh: [
          'วางเมาส์บนแท่งกราฟเพื่อดูจำนวนนักเรียนและเปอร์เซ็นต์ในช่วงเกรดนั้น',
          'ดูค่าเฉลี่ย (Mean) และอัตราการผ่านเกณฑ์ของห้อง',
        ],
        checklistEn: [
          'Hover bars to inspect exact student counts and share.',
          'Review class mean, median, and overall pass percentage.',
        ],
        actionHintTh: 'ลองเอาเมาส์ชี้ที่แท่งกราฟเพื่อดูจำนวนนักเรียนและสัดส่วน % ที่แม่นยำในแต่ละช่วงคะแนน!',
        actionHintEn: 'Hover any bar on the chart to see exact student counts and percentage share!',
        mood: 'celebrate',
      },
      {
        id: 'gb-autonotify',
        selector: '[data-guide-id="gradebook-autonotify"]',
        titleTh: '4. ควบคุมการแจ้งเตือนเกรดอัตโนมัติ',
        titleEn: '4. Auto-Notify Students & Parents',
        descriptionTh: 'เปิดเพื่อให้ระบบส่งแจ้งเตือนเมื่อบันทึกคะแนน หรือปิดชั่วคราวขณะทยอยกรอกคะแนนก่อนประกาศจริง',
        descriptionEn: 'Keep ON for instant grade alerts or toggle OFF while entering draft marks.',
        checklistTh: [
          'ปิดชั่วคราวหากกำลังทยอยกรอกคะแนนร่างและยังไม่ต้องการแจ้งเตือน',
          'เปิดเมื่อพร้อมประกาศผลคะแนนให้นักเรียนและผู้ปกครองทราบทันที',
        ],
        checklistEn: [
          'Keep OFF while entering draft scores before official release.',
          'Toggle ON when ready to push score alerts to students & parents.',
        ],
        mood: 'thinking',
      },
      {
        id: 'gb-import-csv',
        selector: '[data-guide-id="gradebook-import-csv"]',
        titleTh: '5. นำเข้าคะแนนจาก CSV / Excel แบบจับคู่คอลัมน์',
        titleEn: '5. Smart CSV/Excel Column Mapping Import',
        descriptionTh: 'อัปโหลดไฟล์คะแนนจาก Excel ของคุณ แล้วจับคู่หัวคอลัมน์ให้ตรงกับรหัสนักเรียนและคะแนน พร้อมตรวจแถวผิดพลาดก่อนบันทึก',
        descriptionEn: 'Upload any spreadsheet, map custom headers to grade fields, and inspect row validation errors.',
        checklistTh: [
          'อัปโหลดไฟล์ Excel/CSV ที่มีคอลัมน์รหัสนักเรียนและคะแนน',
          'ตรวจสอบความถูกต้องในหน้าพรีวิวก่อนกดยืนยันนำเข้า',
        ],
        checklistEn: [
          'Upload a spreadsheet with Student ID and score columns.',
          'Validate preview rows before confirming bulk import.',
        ],
        mood: 'pointing',
      },
      {
        id: 'gb-pdf-export',
        selector: '[data-guide-id="gradebook-pdf-export"]',
        titleTh: '6. ส่งออกรายงานการกระจายคะแนนเป็น PDF',
        titleEn: '6. Download PDF Grade Report',
        descriptionTh: 'คลิกปุ่มนี้เพื่อสร้างเอกสาร PDF สรุปสถิติคะแนนและตารางช่วงเกรดสำหรับฝ่ายวิชาการได้ทันที',
        descriptionEn: 'Click here to export a formatted PDF grade distribution report for school administration.',
        checklistTh: [
          'กดดาวน์โหลดเพื่อบันทึกสรุปสถิติคะแนนเป็นไฟล์ PDF ส่งฝ่ายวิชาการ',
        ],
        checklistEn: [
          'Click to export a clean PDF summary sheet for academic review.',
        ],
        mood: 'celebrate',
      },
    ],
  },

  homework: {
    moduleId: 'homework',
    titleTh: 'ทัวร์แนะนำหน้าการบ้าน & ติดตามการส่งงาน',
    titleEn: 'Homework & Submissions Guided Tour',
    subtitleTh: 'ติดตามงานค้าง ซิงก์กำหนดส่งเข้า Google Calendar และส่งงานออนไลน์อย่างเป็นระบบ',
    subtitleEn: 'Track pending homework, sync deadlines to Google Calendar, and submit work.',
    steps: [
      {
        id: 'hw-tabs',
        selector: '[data-guide-id="homework-subtabs"]',
        titleTh: '1. สลับดูรายการส่งงาน / การบ้านที่สั่ง / งานค้างส่ง',
        titleEn: '1. Submissions, Assigned & Pending Tabs',
        descriptionTh: 'ตรวจสอบงานที่ส่งแล้ว ดูโจทย์การบ้านทั้งหมด และคัดกรองเฉพาะงานที่ยังค้างส่งได้ทันที',
        descriptionEn: 'Review incoming submissions, browse assigned tasks, or filter pending items.',
        checklistTh: [
          'นักเรียน: เช็กแท็บ "งานค้างส่ง" เป็นประจำเพื่อไม่ให้เลยกำหนด',
          'คุณครู: เปิดแท็บ "รายการส่งงาน" เพื่อตรวจและให้คะแนนพร้อมข้อเสนอแนะ',
        ],
        checklistEn: [
          'Students: check Pending Homework first so deadlines aren’t missed.',
          'Teachers: open Submissions to review work and assign grades.',
        ],
        actionHintTh: 'กดเลือกแท็บด้านบนเพื่อสลับดูงานค้างส่งหรืองานที่ตรวจแล้ว',
        actionHintEn: 'Select tabs at the top to filter pending vs. graded homework.',
        mood: 'pointing',
      },
      {
        id: 'hw-gcal',
        selector: '[data-guide-id="homework-gcal-sync"]',
        titleTh: '2. ซิงก์กำหนดส่งเข้า Google Calendar',
        titleEn: '2. Sync Deadlines to Google Calendar',
        descriptionTh: 'นำวันครบกำหนดส่งการบ้านไปแสดงแจ้งเตือนใน Google Calendar เพื่อไม่พลาดกำหนดส่งงาน',
        descriptionEn: 'Export assignment due dates directly to Google Calendar reminders.',
        checklistTh: [
          'กดเชื่อมต่อ Google Calendar เพื่อเพิ่มวันส่งการบ้านลงในปฏิทินมือถือ',
        ],
        checklistEn: [
          'Sync upcoming assignment due dates directly into your calendar.',
        ],
        mood: 'happy',
      },
      {
        id: 'hw-submit',
        selector: '[data-guide-id="homework-submit-btn"]',
        titleTh: '3. ส่งการบ้านใหม่',
        titleEn: '3. Submit New Homework',
        descriptionTh: 'กดเพื่อเลือกวิชา แนบคำตอบหรือลิงก์ผลงานส่งถึงอาจารย์ผู้สอนทันที',
        descriptionEn: 'Click to submit homework text or file links straight to your teacher.',
        checklistTh: [
          'เลือกรายวิชาและการบ้านที่ต้องการส่ง',
          'แนบข้อความ ลิงก์ Google Drive หรือไฟล์ภาพ แล้วกดยืนยันส่ง',
        ],
        checklistEn: [
          'Choose the target subject and assignment.',
          'Attach response text, drive link, or proof image, then submit.',
        ],
        actionHintTh: 'หลังส่งงานแล้ว สถานะจะเปลี่ยนเป็น "รอตรวจ" และแจ้งเตือนคุณครูทันที',
        actionHintEn: 'Once submitted, status updates to Waiting Review and alerts the teacher.',
        mood: 'celebrate',
      },
    ],
  },

  lms_classroom: {
    moduleId: 'lms_classroom',
    titleTh: 'ทัวร์แนะนำห้องเรียนออนไลน์ (LMS Classroom)',
    titleEn: 'LMS Virtual Classroom Guided Tour',
    subtitleTh: 'เลือกรายวิชา ชมวิดีโอบทเรียน ดาวน์โหลดเอกสาร และส่งใบงานออนไลน์',
    subtitleEn: 'Select courses, watch video lectures, download PDFs, and submit assignments.',
    steps: [
      {
        id: 'lms-lessons',
        selector: '[data-guide-id="lms-lessons-tab"]',
        titleTh: '1. บทเรียนวิดีโอและสื่อการสอน',
        titleEn: '1. Video Lessons & Course Files',
        descriptionTh: 'ชมคลิปการสอนประจำบท อ่านเนื้อหาสรุป และดาวน์โหลดใบงาน PDF พร้อมบันทึกความก้าวหน้าเรียนจบ',
        descriptionEn: 'Watch video lectures, read notes, download PDFs, and mark chapters complete.',
        checklistTh: [
          'เลือกรายวิชาที่ต้องการเรียนจากแถบวิชา',
          'กดเปิดบทเรียน ชมวิดีโอ ดาวน์โหลดชีท PDF และกด "เรียนจบแล้ว"',
        ],
        checklistEn: [
          'Pick a course from the course selector.',
          'Watch lesson videos, download PDF handouts, and mark completion.',
        ],
        actionHintTh: 'คุณครูสามารถเพิ่มบทเรียนใหม่และแนบไฟล์สอนได้ในแท็บนี้',
        actionHintEn: 'Teachers can publish new lessons and attach study files right here.',
        mood: 'happy',
      },
      {
        id: 'lms-homework',
        selector: '[data-guide-id="lms-homework-tab"]',
        titleTh: '2. การบ้าน & ใบงานออนไลน์',
        titleEn: '2. Online Assignments & Grading',
        descriptionTh: 'สลับมาที่แท็บนี้เพื่อส่งงานประจำวิชาหรือตรวจให้คะแนนผลงานของนักเรียนในห้องเรียนออนไลน์',
        descriptionEn: 'Switch to this tab to submit coursework or grade incoming student assignments.',
        checklistTh: [
          'นักเรียน: กดส่งไฟล์งานหรือตอบคำถามในใบงานแต่ละชิ้น',
          'คุณครู: สั่งการบ้านใหม่พร้อมตั้งคะแนนเต็มและวันครบกำหนดส่ง',
        ],
        checklistEn: [
          'Students: submit files or answer worksheet prompts.',
          'Teachers: post new assignments with max score and deadline.',
        ],
        actionHintTh: 'คะแนนใบงานในห้องเรียน LMS สามารถนำไปใช้สรุปผลในสมุดคะแนนได้ทันที',
        actionHintEn: 'LMS assignment marks connect directly into course progress tracking.',
        mood: 'pointing',
      },
    ],
  },

  portfolio: {
    moduleId: 'portfolio',
    titleTh: 'ทัวร์แนะนำแฟ้มผลงานดิจิทัล TCAS & ว.PA',
    titleEn: 'Digital Portfolio (TCAS & Teacher PA) Tour',
    subtitleTh: 'เพิ่มผลงาน เกียรติบัตร รูปถ่ายกิจกรรม แยกแฟ้มนักเรียน/ครู และพิมพ์ PDF เพื่อยื่น TCAS หรือ ว.PA',
    subtitleEn: 'Add achievements, certificates, filter by role/category, and print polished PDF dossiers.',
    steps: [
      {
        id: 'pf-actions',
        selector: '[data-guide-id="portfolio-actions"]',
        titleTh: '1. เพิ่มผลงานใหม่ แก้ไขโปรไฟล์ และพิมพ์ PDF',
        titleEn: '1. Add Achievement, Edit Profile & Print PDF',
        descriptionTh: 'คลิก "เพิ่มผลงานใหม่" เพื่อบันทึกเกียรติบัตรหรือโครงงาน พร้อมอัปโหลดรูปภาพ และกด "พิมพ์ PDF" เพื่อจัดหน้าส่ง TCAS/ว.PA',
        descriptionEn: 'Click Add Work to upload certificates or projects, update profile goals, and Print PDF.',
        checklistTh: [
          'กด "+ เพิ่มผลงานใหม่" และเลือกหมวด (แข่งขัน / จิตอาสา / นวัตกรรม / ผู้นำ)',
          'แนบรูปเกียรติบัตรและแท็กทักษะที่ได้รับ',
          'กด "พิมพ์ PDF" เพื่อสร้างเอกสารแฟ้มผลงานพร้อมยื่นมหาวิทยาลัยหรือประเมิน ว.PA',
        ],
        checklistEn: [
          'Click Add Work and classify into Competitions, Volunteering, Innovation, or Leadership.',
          'Attach proof photos and skill tags.',
          'Use Print PDF when submitting your TCAS or Teacher PA dossier.',
        ],
        actionHintTh: 'นักเรียนสามารถระบุคณะ/มหาวิทยาลัยเป้าหมายในหน้าแก้ไขโปรไฟล์เพื่อแสดงบนหัวแฟ้ม',
        actionHintEn: 'Students can add target university/faculty goals in Edit Profile.',
        mood: 'celebrate',
      },
      {
        id: 'pf-filters',
        selector: '[data-guide-id="portfolio-role-filter"]',
        titleTh: '2. คัดกรองแฟ้มนักเรียน / แฟ้มครู ว.PA และหมวดหมู่',
        titleEn: '2. Role Switcher & Category Filters',
        descriptionTh: 'ครูและแอดมินสลับดูผลงานนักเรียนและผลงานครู (ว.PA) ได้ในหน้าเดียว พร้อมกรองตามปีและหมวดหมู่',
        descriptionEn: 'Staff can switch between Student TCAS portfolios and Teacher PA portfolios and filter by category.',
        checklistTh: [
          'เลือกดูเฉพาะแฟ้มผลงานนักเรียนหรือแฟ้ม ว.PA ของครู',
          'เลือกหมวดหมู่ผลงานที่ต้องการค้นหาเพื่อเตรียมสรุปส่งรายงาน',
        ],
        checklistEn: [
          'Switch between Student and Teacher PA portfolios (for staff).',
          'Filter items by achievement category.',
        ],
        mood: 'pointing',
      },
    ],
  },

  behavior_sdq: {
    moduleId: 'behavior_sdq',
    titleTh: 'ทัวร์แนะนำระบบดูแลช่วยเหลือนักเรียน & SDQ',
    titleEn: 'Student Care, Behavior & SDQ Tour',
    subtitleTh: 'บันทึกคะแนนความประพฤติ ทำแบบประเมิน SDQ 5 ด้าน คัดกรองทุน CCT และติดตามดูแล 5 ขั้นตอน สพฐ.',
    subtitleEn: 'Record merit/demerit points, SDQ 5-domain screening, CCT poverty data, and OBEC 5-step care.',
    steps: [
      {
        id: 'bhv-tabs',
        selector: '[data-guide-id="behavior-tabs"]',
        titleTh: '1. สลับ 4 ขั้นตอนงานระบบดูแลช่วยเหลือนักเรียน',
        titleEn: '1. Four Student Care & SDQ Tabs',
        descriptionTh: 'เรียงลำดับตามขั้นตอนปฏิบัติจริง: 1. ความประพฤติ, 2. แบบประเมิน SDQ 5 ด้าน, 3. ทุนเสมอภาค CCT และ 4. ระบบดูแล 5 ขั้น สพฐ.',
        descriptionEn: 'Organized along real workflow order: Merit/Demerit, SDQ Screening, CCT Poverty, and OBEC 5 Steps.',
        checklistTh: [
          'แท็บ 1: บันทึกคะแนนบวก-ลบความประพฤติพร้อมส่งแจ้งผู้ปกครอง',
          'แท็บ 2: ทำแบบคัดกรอง SDQ 5 ด้าน (ปกติ / เสี่ยง / มีปัญหา) และส่งออก CSV',
          'แท็บ 3–4: บันทึกข้อมูลเยี่ยมบ้าน ทุน CCT และติดตามการส่งต่อดูแล 5 ขั้น',
        ],
        checklistEn: [
          'Tab 1: Log behavior points with optional parent alerts.',
          'Tab 2: Complete 5-domain SDQ screening and export CSV.',
          'Tabs 3–4: Track CCT scholarship eligibility and OBEC 5-step interventions.',
        ],
        actionHintTh: 'ผล SDQ ที่อยู่ในกลุ่มเสี่ยง/มีปัญหา จะเชื่อมไปยังขั้นตอนดูแลช่วยเหลือโดยอัตโนมัติ',
        actionHintEn: 'At-risk SDQ outcomes automatically feed into OBEC 5-step follow-ups.',
        mood: 'thinking',
      },
    ],
  },

  infirmary: {
    moduleId: 'infirmary',
    titleTh: 'ทัวร์แนะนำระบบห้องพยาบาล & สุขภาพนักเรียน',
    titleEn: 'School Infirmary & Health Room Tour',
    subtitleTh: 'บันทึกรายการรับรักษา ตรวจเตียงพักว่าง และแจ้งเตือนข้อมูลนักเรียนแพ้ยาแบบเรียลไทม์',
    subtitleEn: 'Log infirmary visits, monitor resting bed occupancy, and check student allergy alerts.',
    steps: [
      {
        id: 'inf-tabs',
        selector: '[data-guide-id="infirmary-tabs"]',
        titleTh: '1. จัดการ 3 งานหลักห้องพยาบาล: รักษา / เตียงพัก / แพ้ยา',
        titleEn: '1. Visits, Resting Beds & Allergy Registry',
        descriptionTh: 'ติดตามการปฐมพยาบาล เตียงพักที่กำลังใช้งาน และรายชื่อนักเรียนที่มีประวัติแพ้ยาหรือโรคประจำตัว',
        descriptionEn: 'Manage treatment logs, active bed status, and student drug/food allergy alerts.',
        checklistTh: [
          'แท็บ "1. รักษา" ดูรายการเข้าห้องพยาบาลและกด "+ บันทึกเข้าห้องพยาบาล" เมื่อนักเรียนมารักษา',
          'แท็บ "2. เตียงพัก" อัปเดตสถานะกลับเข้าชั้นเรียน / ผู้ปกครองรับกลับ / ส่งโรงพยาบาล',
          'แท็บ "3. แพ้ยา" ตรวจประวัติแพ้ยาและโรคประจำตัวก่อนจ่ายยาทุกครั้ง',
        ],
        checklistEn: [
          'Visits tab: log symptoms, vitals, and medicines given.',
          'Beds tab: discharge students back to class or notify parents for pickup.',
          'Allergies tab: verify allergies before administering medication.',
        ],
        actionHintTh: 'กด "ตั้งค่าเตียง/ยา" เพื่อปรับจำนวนเตียงพักและรายการยาสามัญประจำโรงเรียน',
        actionHintEn: 'Use Bed/Med presets to customize your school infirmary inventory.',
        mood: 'happy',
      },
    ],
  },

  billing: {
    moduleId: 'billing',
    titleTh: 'ทัวร์แนะนำระบบค่าธรรมเนียมและใบแจ้งหนี้ (Billing)',
    titleEn: 'Tuition Billing & Slip Verification Tour',
    subtitleTh: 'คัดกรองใบแจ้งหนี้ ตรวจสลิปโอนเงินที่ผู้ปกครองอัปโหลด และออกใบแจ้งหนี้/ใบเสร็จ',
    subtitleEn: 'Filter invoices, verify guardian transfer slips, and issue official tuition bills.',
    steps: [
      {
        id: 'bil-tabs',
        selector: '[data-guide-id="billing-filter-tabs"]',
        titleTh: '1. คัดกรองสถานะใบแจ้งหนี้และคิวรอตรวจสลิป',
        titleEn: '1. Invoice Status & Slip Review Filters',
        descriptionTh: 'แยกดูรายการ "รอตรวจสลิป" ที่ผู้ปกครองแนบหลักฐานโอนเงินเข้ามา, ชำระแล้ว, รอชำระ และค้างชำระ',
        descriptionEn: 'Filter pending slip reviews, paid receipts, pending balances, and overdue invoices.',
        checklistTh: [
          'กด "slip_pending (รอตรวจสลิป)" เพื่ออนุมัติยอดเงินโอนที่ผู้ปกครองส่งมา',
          'กด "ออกใบแจ้งหนี้" มุมขวาบนเพื่อสร้างรายการเรียกเก็บค่าเทอมใหม่',
        ],
        checklistEn: [
          'Open pending slip reviews to approve uploaded payment transfers.',
          'Click Issue Invoice in the top right to create new tuition bills.',
        ],
        actionHintTh: 'แอดมินสามารถตั้งหมวดค่าธรรมเนียมมาตรฐานได้จากปุ่ม "ตั้งค่า" ด้านบน',
        actionHintEn: 'Admins can configure reusable fee categories in Settings above.',
        mood: 'pointing',
      },
      {
        id: 'bil-split',
        selector: '[data-guide-id="billing-invoices-split"]',
        titleTh: '2. เลือกรายการซ้ายเพื่อตรวจ QR / อนุมัติสลิปด้านขวา',
        titleEn: '2. Invoice List & Detail / Receipt Pane',
        descriptionTh: 'คลิกใบแจ้งหนี้ทางซ้ายเพื่อดูรายละเอียด QR PromptPay ตรวจรูปสลิป กดยืนยันรับชำระ และพิมพ์ใบเสร็จ',
        descriptionEn: 'Select any invoice on the left to inspect PromptPay QR, verify transfer slips, and print receipts on the right.',
        checklistTh: [
          'คลิกใบแจ้งหนี้ที่ต้องการตรวจด้านซ้าย',
          'ตรวจสอบยอดเงินและวันที่บนสลิปทางขวา แล้วกดยืนยันการรับเงินหรือส่งแจ้งเตือน',
        ],
        checklistEn: [
          'Select an invoice row on the left column.',
          'Verify payment amount & date on the right pane, then confirm or send reminder.',
        ],
        mood: 'celebrate',
      },
    ],
  },

  announcements: {
    moduleId: 'announcements',
    titleTh: 'ทัวร์แนะนำระบบประกาศและข่าวสารโรงเรียน',
    titleEn: 'School Announcements & Broadcasts Tour',
    subtitleTh: 'กรองข่าวสารตามกลุ่มเป้าหมาย สร้างประกาศใหม่ ปักหมุด และออกหนังสือขออนุญาตผู้ปกครอง',
    subtitleEn: 'Filter broadcasts by audience, publish pinned announcements, and issue digital consent forms.',
    steps: [
      {
        id: 'ann-tabs',
        selector: '[data-guide-id="announcements-filter-tabs"]',
        titleTh: '1. กรองประกาศตามกลุ่มเป้าหมาย',
        titleEn: '1. Filter Broadcasts by Target Audience',
        descriptionTh: 'เลือกดูประกาศทั้งหมด หรือเจาะจงเฉพาะนักเรียน ผู้ปกครอง และครูผู้สอน',
        descriptionEn: 'Filter announcements for everyone, students, parents, or teaching staff.',
        checklistTh: [
          'เลือกแท็บกลุ่มเป้าหมายเพื่อดูความครอบคลุมของการสื่อสาร',
          'ประกาศที่ปักหมุดจะแสดงเด่นบนสุดเสมอ',
        ],
        checklistEn: [
          'Switch audience tabs to inspect student, parent, or staff notices.',
          'Pinned notices remain anchored at the top.',
        ],
        mood: 'pointing',
      },
      {
        id: 'ann-compose',
        selector: '[data-guide-id="announcements-compose-btn"]',
        titleTh: '2. สร้างประกาศใหม่ & หนังสือขออนุญาตผู้ปกครอง',
        titleEn: '2. Publish Broadcasts & Consent Slips',
        descriptionTh: 'กด "Publish Broadcast" เพื่อส่งข่าวประกาศ หรือเปิดเมนู "เครื่องมือ" เพื่อสร้างหนังสือขออนุญาตออนไลน์ส่งเข้าพอร์ทัลผู้ปกครอง',
        descriptionEn: 'Click Publish Broadcast to notify users, or open Tools to create interactive guardian consent forms.',
        checklistTh: [
          'กด "Publish Broadcast" กรอกหัวข้อ เนื้อหา และเลือกกลุ่มผู้รับ',
          'หรือกด "เครื่องมือ → สร้างหนังสือขออนุญาตผู้ปกครอง" สำหรับกิจกรรมทัศนศึกษา/ฉีดวัคซีน',
        ],
        checklistEn: [
          'Click Publish Broadcast to write and dispatch a school announcement.',
          'Or open Tools → Create Parent Consent Form for field trips & activities.',
        ],
        mood: 'celebrate',
      },
    ],
  },

  parent_portal: {
    moduleId: 'parent_portal',
    titleTh: 'ทัวร์แนะนำพอร์ทัลผู้ปกครอง (Parent Portal)',
    titleEn: 'Parent Portal Guided Tour',
    subtitleTh: 'สลับดูบุตรหลาน ดูภาพถ่ายเข้า-ออกโรงเรียน ยื่นใบลา และตอบรับหนังสือขออนุญาตออนไลน์',
    subtitleEn: 'Switch between children, view gate check-in photos, submit leaves, and sign consent slips.',
    steps: [
      {
        id: 'par-switcher',
        selector: '[data-guide-id="parent-student-switcher"]',
        titleTh: '1. เลือกบุตรหลานที่ต้องการติดตามข้อมูล',
        titleEn: '1. Select Your Child / Student',
        descriptionTh: 'หากมีบุตรหลานเรียนในโรงเรียนมากกว่า 1 คน สามารถสลับเลือกดูข้อมูลรายคนได้จากช่องนี้',
        descriptionEn: 'If you have multiple children enrolled, switch between their profiles right here.',
        checklistTh: [
          'เลือกรายชื่อบุตรหลานจากเมนูแบบเลื่อนลง',
          'ตรวจสอบชั้นเรียน ห้อง และบัตรประจำตัวนักเรียน',
        ],
        checklistEn: [
          'Choose the student from the dropdown menu.',
          'Verify classroom info and digital student ID card.',
        ],
        mood: 'happy',
      },
      {
        id: 'par-tabs',
        selector: '[data-guide-id="parent-portal-tabs"]',
        titleTh: '2. ใช้งาน 4 บริการหลักสำหรับผู้ปกครอง',
        titleEn: '2. Parent Portal Service Tabs',
        descriptionTh: 'ดูบัตร QR บุตรหลาน, อัลบั้มภาพถ่ายเซลฟี่เข้า-ออกโรงเรียน, ยื่นใบลาให้ลูก และกดยินยอมหนังสือขออนุญาต/ตรวจบิลค่าเทอม',
        descriptionEn: 'Access overview & student pass, check-in photo album, leave submission, and consent/billing actions.',
        checklistTh: [
          'เปิด "อัลบั้มภาพถ่ายเข้า-ออก" เพื่อดูภาพและเวลาสแกนถึงโรงเรียนล่าสุด',
          'เปิด "ยื่นใบลาให้ลูก" เพื่อแจ้งลาป่วย/ลากิจส่งถึงครูประจำชั้นทันที',
          'เปิด "หนังสือขออนุญาต" เพื่อลงชื่อตอบรับกิจกรรมออนไลน์',
        ],
        checklistEn: [
          'Open Check-In Photo Album for live arrival verification.',
          'Open Submit Leave to notify homeroom teachers directly.',
          'Review digital consent forms and tuition receipts.',
        ],
        actionHintTh: 'ข้อมูลทั้งหมดจะอัปเดตตรงกับสมุดเช็คชื่อของครูประจำชั้นทันที',
        actionHintEn: 'All leaves and check-in records sync immediately with the homeroom teacher.',
        mood: 'celebrate',
      },
    ],
  },
};

export const GUIDED_PLAYBOOKS: GuidedPlaybook[] = [
  {
    id: 'admin_onboarding',
    roleTagTh: 'ผู้ดูแลระบบ / ฝ่ายทะเบียน',
    roleTagEn: 'School Admin / Registrar',
    titleTh: 'คู่มือจับมือทำ: เริ่มต้นตั้งค่าโรงเรียนจนนักเรียนล็อกอินได้จริง (7 ขั้น)',
    titleEn: 'Admin Onboarding Playbook: Campus Setup to Student Login (7 Steps)',
    subtitleTh: 'ทำตามทีละหน้า ตั้งแต่ตรวจความพร้อมโรงเรียน ตั้งลิงก์ล็อกอิน นำเข้า Excel จนถึงออกบัญชีนักเรียน (รหัสเริ่มต้น = รหัสนักเรียน)',
    subtitleEn: 'Follow screen by screen from readiness check, login slug, and Excel roster import to Student-ID account issuance.',
    estimatedMinutes: 8,
    audienceRoles: ['super_admin', 'admin'],
    steps: [
      {
        id: 'adm-1-overview',
        moduleId: 'system_settings',
        settingsTab: 'control_overview',
        titleTh: 'ขั้นที่ 1: ตรวจความพร้อมโรงเรียน พิกัด GPS และสิทธิ์',
        titleEn: 'Step 1: Verify School Readiness, GPS & Policies',
        summaryTh: 'เปิดศูนย์ควบคุมระบบเพื่อเช็กว่าพิกัด GPS, LINE OA และสิทธิ์บทบาทพร้อมใช้งานครบแล้ว',
        summaryEn: 'Check campus GPS, LINE OA health, and active role permissions on the control overview.',
        checklistTh: [
          'ตรวจดูการ์ดพิกัด GPS โรงเรียนว่าตั้งจุดเช็คชื่อแล้วหรือยัง',
          'ดูจำนวนครูผู้ดูแลระบบและบันทึก Audit Log ล่าสุด',
        ],
        checklistEn: [
          'Verify campus GPS geofence readiness.',
          'Confirm school admin roster and recent audit logs.',
        ],
      },
      {
        id: 'adm-2-login-link',
        moduleId: 'system_settings',
        settingsTab: 'student_login_config',
        titleTh: 'ขั้นที่ 2: ตั้งค่าลิงก์เข้าสู่ระบบและนโยบายรหัสนักเรียน',
        titleEn: 'Step 2: Configure Student Login Link & Initial Password Policy',
        summaryTh: 'ตั้งรหัสย่อโรงเรียน (Slug), เลือก "รหัสนักเรียน" เป็นรหัสเริ่มต้น และคัดลอก URL ส่งให้ห้องเรียน',
        summaryEn: 'Set the school slug, confirm Student ID default password rule, and copy the portal URL.',
        checklistTh: [
          'ตั้งประเภทระหัสผ่านเริ่มต้นเป็น "รหัสนักเรียน (แนะนำ)"',
          'กดบันทึก และคัดลอกลิงก์ล็อกอินโรงเรียนเตรียมส่งให้นักเรียน',
        ],
        checklistEn: [
          'Keep Default Password Type as Student ID (Recommended).',
          'Save and copy the dedicated school login URL.',
        ],
      },
      {
        id: 'adm-3-students',
        moduleId: 'students',
        titleTh: 'ขั้นที่ 3: เพิ่มหรือนำเข้ารายชื่อนักเรียนจาก Excel',
        titleEn: 'Step 3: Add or Import Student Roster via Excel',
        summaryTh: 'นำเข้ารายชื่อนักเรียนทั้งโรงเรียนพร้อมรหัสนักเรียน 6 หลักขึ้นไป เพื่อใช้สร้างบัญชีล็อกอิน',
        summaryEn: 'Import your classroom roster with 6+ character Student IDs for account provisioning.',
        checklistTh: [
          'กด "เครื่องมือจัดการ → นำเข้า/ส่งออก Excel" หรือกด "+ เพิ่มนักเรียน"',
          'ตรวจสอบว่านักเรียนทุกคนมี "รหัสนักเรียน" ไม่ซ้ำกันและยาวอย่างน้อย 6 ตัว',
        ],
        checklistEn: [
          'Open Bulk Tools → Excel Import/Export or add students manually.',
          'Ensure every student has a unique >= 6-character Student ID.',
        ],
      },
      {
        id: 'adm-4-accounts',
        moduleId: 'system_settings',
        settingsTab: 'student_accounts',
        titleTh: 'ขั้นที่ 4: สร้างบัญชีล็อกอินให้นักเรียน (รหัสเริ่มต้น = รหัสนักเรียน)',
        titleEn: 'Step 4: Provision Student Accounts (Password = Student ID)',
        summaryTh: 'กดสร้างบัญชีให้นักเรียนทั้งหมดในคลิกเดียว ระบบจะตั้งรหัสเริ่มต้นเป็นรหัสนักเรียนและบังคับเปลี่ยนเมื่อเข้าครั้งแรก',
        summaryEn: 'Generate missing student login accounts in one click; initial password = Student ID with forced first-login change.',
        checklistTh: [
          'กด "สร้างบัญชีให้นักเรียนที่ยังไม่มีบัญชีทั้งหมด"',
          'คัดลอกตารางสรุปบัญชีหรือแจ้งนักเรียนให้ล็อกอินด้วยรหัสนักเรียนทันที',
        ],
        checklistEn: [
          'Click "Create All Missing Accounts" in the Student Accounts tab.',
          'Copy the summary table and instruct students to sign in using their Student ID.',
        ],
      },
      {
        id: 'adm-5-teachers',
        moduleId: 'teachers',
        titleTh: 'ขั้นที่ 5: เพิ่มรายชื่อครูและกำหนดหัวหน้า/แอดมิน',
        titleEn: 'Step 5: Onboard Teachers & Department Heads',
        summaryTh: 'นำเข้ารายชื่อครูจาก Excel ตรวจผังองค์กร และระบุครูประจำชั้น/กลุ่มสาระ',
        summaryEn: 'Import faculty from Excel, review org chart, and assign homeroom/subject leads.',
        checklistTh: [
          'นำเข้าข้อมูลครูหรือเชิญครูผู้สอนเข้าโรงเรียน',
          'ตรวจสอบตำแหน่งและสิทธิ์ในทำเนียบบุคลากร',
        ],
        checklistEn: [
          'Import or invite teachers into the school directory.',
          'Verify departments and staff permissions.',
        ],
      },
      {
        id: 'adm-6-courses',
        moduleId: 'courses',
        titleTh: 'ขั้นที่ 6: สร้างรายวิชาและลงทะเบียนนักเรียนเข้าชั้นเรียน',
        titleEn: 'Step 6: Create Courses & Enroll Students',
        summaryTh: 'นำเข้าหรือสร้างรายวิชา กำหนดหน่วยกิต เวลาเรียน 80% และลงทะเบียนนักเรียนเข้าวิชา',
        summaryEn: 'Create or import courses, define credits and 80% hour thresholds, and enroll students.',
        checklistTh: [
          'นำเข้ารายวิชาจาก Excel หรือกด "+ เพิ่มรายวิชาใหม่"',
          'คลิกการ์ดวิชาและลงทะเบียนนักเรียนเข้าห้องเรียน',
        ],
        checklistEn: [
          'Import courses or create new offerings.',
          'Enroll classroom students into each course.',
        ],
      },
      {
        id: 'adm-7-timetable',
        moduleId: 'timetable',
        titleTh: 'ขั้นที่ 7: จัดตารางเรียน/ตารางสอนและตรวจคาบชน',
        titleEn: 'Step 7: Arrange Weekly Timetable & Check Conflicts',
        summaryTh: 'กำหนดตาราง 5 วันให้ครบทุกห้องและตรวจสอบแถบแจ้งเตือนหากมีครูหรือห้องสอนซ้ำกัน',
        summaryEn: 'Populate 5-day classroom schedules and confirm zero teacher/room conflicts.',
        checklistTh: [
          'เลือกห้องเรียนและจัดวางคาบสอนจันทร์–ศุกร์',
          'ตรวจดูว่าไม่มีแถบแจ้งเตือนข้อขัดแย้งสีส้มด้านบน',
        ],
        checklistEn: [
          'Filter by classroom and assign Mon–Fri slots.',
          'Confirm no orange conflict banner appears.',
        ],
      },
    ],
  },
  {
    id: 'teacher_daily',
    roleTagTh: 'คุณครูผู้สอน / ครูประจำชั้น',
    roleTagEn: 'Teachers & Homeroom Advisors',
    titleTh: 'คู่มือจับมือทำ: งานประจำวันของคุณครูตั้งแต่เช้าถึงกรอกเกรด (5 ขั้น)',
    titleEn: 'Teacher Daily Playbook: Morning Check-In to Gradebook (5 Steps)',
    subtitleTh: 'ทำตามขั้นตอนจริงของคุณครู: เช็กโต๊ะทำงาน สแกนหน้าแถว เช็กชื่อรายคาบ สอน LMS/ตรวจการบ้าน และกรอกคะแนน ปพ.',
    subtitleEn: 'Walk through the daily teaching loop: Today’s Desk, gate & period roll call, LMS/homework, and gradebook.',
    estimatedMinutes: 5,
    audienceRoles: ['super_admin', 'admin', 'teacher'],
    steps: [
      {
        id: 'tch-1-dash',
        moduleId: 'dashboard',
        titleTh: 'ขั้นที่ 1: เปิดโต๊ะทำงานครูตรวจภารกิจวันนี้',
        titleEn: 'Step 1: Check Today’s Teaching Desk',
        summaryTh: 'ดูคาบสอนวันนี้ คิวใบลาที่รออนุมัติ และการบ้านที่นักเรียนส่งเข้ามาใหม่จากหน้าแรก',
        summaryEn: 'Review today’s classes, pending leaves, and ungraded homework from the Dashboard.',
        checklistTh: [
          'ตรวจสรุปการมาเรียนและรายการคาบสอนวันนี้',
          'กดเข้าเคลียร์ใบลาหรือการบ้านค้างตรวจจากทางลัดบนโต๊ะงาน',
        ],
        checklistEn: [
          'Inspect today’s arrival stats and upcoming schedule.',
          'Jump straight to pending leaves or ungraded homework.',
        ],
      },
      {
        id: 'tch-2-gate',
        moduleId: 'attendance',
        titleTh: 'ขั้นที่ 2: เช็คชื่อหน้าประตู / อนุมัติใบลาช่วงเช้า',
        titleEn: 'Step 2: Gate QR Check-In & Leave Approval',
        summaryTh: 'สแกนบัตร QR นักเรียนหน้าประตู (หรือเปิดสแกนรัวผ่านเว็บแคม) และตรวจสอบใบลาจากผู้ปกครอง',
        summaryEn: 'Scan student QR cards at the gate or open Rapid Webcam Scan, and review guardian leaves.',
        checklistTh: [
          'ใช้สถานีสแกนหรือเปิดกล้องสแกนรัวช่วงเช้า',
          'สลับแท็บ "ใบลา" เพื่ออนุมัติใบลาของห้องที่รับผิดชอบ',
        ],
        checklistEn: [
          'Scan QR passes manually or via rapid webcam.',
          'Approve incoming homeroom leave requests.',
        ],
      },
      {
        id: 'tch-3-period',
        moduleId: 'mobile_checkin',
        titleTh: 'ขั้นที่ 3: เช็กชื่อรายคาบในห้องเรียนแบบคลิกเดียว',
        titleEn: 'Step 3: One-Tap Classroom Period Roll Call',
        summaryTh: 'เลือกแท็บ "รายคาบ" เลือกวิชา/คาบ กด "มาครบทุกคน" แล้วปรับเฉพาะคนที่ขาด/ลา',
        summaryEn: 'Switch to Periods, pick your slot, tap Mark All Present, and toggle exceptions.',
        checklistTh: [
          'กดแท็บ "รายคาบ" ในหน้าเช็คชื่อมือถือ',
          'กดยืนยันสถานะเพื่อนำไปคำนวณเกณฑ์เวลาเรียน 80% อัตโนมัติ',
        ],
        checklistEn: [
          'Open the Periods tab inside Mobile Attendance.',
          'Save period status so 80% eligibility updates automatically.',
        ],
      },
      {
        id: 'tch-4-lms',
        moduleId: 'lms_classroom',
        titleTh: 'ขั้นที่ 4: ลงบทเรียน สั่งใบงาน & ตรวจการบ้านออนไลน์',
        titleEn: 'Step 4: Publish Lessons & Grade Online Work',
        summaryTh: 'อัปโหลดคลิป/ไฟล์ PDF บทเรียน สั่งการบ้าน และให้คะแนนผลงานของนักเรียนในห้องเรียน LMS',
        summaryEn: 'Upload lesson videos/PDFs, post assignments, and grade student submissions in LMS.',
        checklistTh: [
          'เลือกรายวิชาในหน้า LMS เพื่อเพิ่มสื่อการสอนในแท็บ "บทเรียน"',
          'สลับแท็บ "การบ้าน & ใบงาน" เพื่อสั่งงานหรือตรวจผลงานนักเรียน',
        ],
        checklistEn: [
          'Select your course and add video/PDF lessons.',
          'Open Assignments to post worksheets or score submissions.',
        ],
      },
      {
        id: 'tch-5-grade',
        moduleId: 'gradebook',
        titleTh: 'ขั้นที่ 5: บันทึกคะแนน วิเคราะห์ฮิสโตแกรม และออก ปพ.',
        titleEn: 'Step 5: Enter Marks, Analyze Histogram & Export PP.5/PDF',
        summaryTh: 'กรอกหรือนำเข้าคะแนนจาก Excel ดูกราฟการกระจายคะแนน และสั่งพิมพ์ ปพ.5 / PDF ส่งฝ่ายวิชาการ',
        summaryEn: 'Enter or import scores from Excel, review the histogram, and export PP.5 / PDF reports.',
        checklistTh: [
          'เลือกรายวิชาและนำเข้าคะแนนจาก Excel หรือกรอกในตาราง',
          'ดูกราฟฮิสโตแกรมและกดส่งออกรายงาน PDF หรือ ปพ.5',
        ],
        checklistEn: [
          'Pick a course and import Excel scores or type directly.',
          'Inspect score distribution and export PDF / PP.5.',
        ],
      },
    ],
  },
  {
    id: 'student_first_day',
    roleTagTh: 'นักเรียน',
    roleTagEn: 'Students',
    titleTh: 'คู่มือจับมือทำสำหรับนักเรียน: ตั้งแต่วันแรกจนใช้งานคล่อง (5 ขั้น)',
    titleEn: 'Student First-Day Playbook: Sign-In to Portfolio (5 Steps)',
    subtitleTh: 'เข้าสู่ระบบด้วยรหัสนักเรียน → เปลี่ยนรหัสผ่านส่วนตัว → เช็คชื่อมือถือ/ดูตารางเรียน → ส่งการบ้าน/LMS → สะสมแฟ้ม TCAS',
    subtitleEn: 'Log in with Student ID → Set new password → Check-in & schedule → Homework/LMS → TCAS Portfolio.',
    estimatedMinutes: 5,
    audienceRoles: ['student'],
    steps: [
      {
        id: 'stu-1-dash',
        moduleId: 'dashboard',
        titleTh: 'ขั้นที่ 1: เช็กแดชบอร์ดส่วนตัวหลังเปลี่ยนรหัสผ่านสำเร็จ',
        titleEn: 'Step 1: Review Personal Dashboard After Password Update',
        summaryTh: 'เมื่อเปลี่ยนรหัสผ่านจากรหัสนักเรียนเป็นรหัสส่วนตัวแล้ว ให้ตรวจชื่อ ห้องเรียน สถิติมาเรียน และประกาศใหม่ในหน้าแรก',
        summaryEn: 'After changing your initial Student ID password, check your profile, attendance stats, and announcements here.',
        checklistTh: [
          'จดจำรหัสผ่านใหม่ (8 ตัวอักษรขึ้นไป) สำหรับใช้ครั้งถัดไป',
          'ตรวจงานด่วน คาบเรียนวันนี้ และประกาศโรงเรียนในหน้าแรก',
        ],
        checklistEn: [
          'Remember your new >= 8-char password for future sign-ins.',
          'Check today’s schedule, pending homework, and notices.',
        ],
      },
      {
        id: 'stu-2-checkin',
        moduleId: 'mobile_checkin',
        titleTh: 'ขั้นที่ 2: เช็คชื่อเข้าเรียนด้วยมือถือ / GPS หรือยื่นใบลา',
        titleEn: 'Step 2: Mobile GPS Check-In or Leave Request',
        summaryTh: 'ถ่ายเซลฟี่ในรัศมี GPS โรงเรียน แตะบัตร NFC หรือส่งใบลาป่วย/ลากิจให้ครูประจำชั้นได้จากมือถือ',
        summaryEn: 'Capture a GPS-verified check-in selfie, tap NFC, or submit a leave form to your advisor.',
        checklistTh: [
          'ตรวจสัญลักษณ์ GPS สีเขียวว่าอยู่ในบริเวณโรงเรียน',
          'กดแท็บ "ใบลา" เมื่อป่วยหรือไม่สามารถมาเรียนได้',
        ],
        checklistEn: [
          'Confirm green GPS status inside school boundary.',
          'Use the Leave tab whenever you need to request absence.',
        ],
      },
      {
        id: 'stu-3-homework',
        moduleId: 'homework',
        titleTh: 'ขั้นที่ 3: เช็กงานค้างส่งและกดส่งการบ้านออนไลน์',
        titleEn: 'Step 3: Track Pending Homework & Submit Online',
        summaryTh: 'ดูงานที่ใกล้ครบกำหนด ซิงก์ลง Google Calendar และแนบลิงก์/คำตอบส่งตรงถึงคุณครู',
        summaryEn: 'Check upcoming deadlines, sync to Google Calendar, and submit completed work.',
        checklistTh: [
          'เปิดแท็บ "งานค้างส่ง" เพื่อดูชิ้นงานที่ใกล้ถึงกำหนด',
          'กดปุ่ม "+ ส่งการบ้าน" เพื่อแนบไฟล์หรือลิงก์ผลงาน',
        ],
        checklistEn: [
          'Check Pending tab for upcoming assignment due dates.',
          'Click Submit Homework to send links or files.',
        ],
      },
      {
        id: 'stu-4-lms',
        moduleId: 'lms_classroom',
        titleTh: 'ขั้นที่ 4: เข้าห้องเรียน LMS ดูคลิปสอน & ทำใบงาน',
        titleEn: 'Step 4: Study Video Lessons & Worksheets in LMS',
        summaryTh: 'เลือกวิชาที่ลงทะเบียน ดูวิดีโอบทเรียนย้อนหลัง ดาวน์โหลดเอกสาร PDF และส่งใบงานประจำบท',
        summaryEn: 'Pick any enrolled subject, watch recorded video lessons, download PDFs, and complete worksheets.',
        checklistTh: [
          'กดดูคลิปบทเรียนและคลิกบันทึกว่าเรียนจบบทแล้ว',
          'ตรวจแท็บ "การบ้าน & ใบงาน" ประจำวิชา',
        ],
        checklistEn: [
          'Watch chapter videos and mark lessons completed.',
          'Complete online worksheets under the Assignments tab.',
        ],
      },
      {
        id: 'stu-5-portfolio',
        moduleId: 'portfolio',
        titleTh: 'ขั้นที่ 5: เก็บเกียรติบัตรสร้างแฟ้มผลงาน TCAS',
        titleEn: 'Step 5: Build Your TCAS Digital Portfolio',
        summaryTh: 'อัปโหลดรูปเกียรติบัตร โครงงาน และกิจกรรมจิตอาสา พร้อมสั่งพิมพ์เป็นไฟล์ PDF ยื่นเข้ามหาวิทยาลัย',
        summaryEn: 'Upload certificates, STEM projects, and volunteering proofs, then export PDF for university admissions.',
        checklistTh: [
          'กด "+ เพิ่มผลงานใหม่" และระบุทักษะที่ได้รับ',
          'กด "พิมพ์ PDF" เมื่อต้องการรวมเล่มแฟ้มผลงาน',
        ],
        checklistEn: [
          'Click Add Work to archive certificates and skill tags.',
          'Click Print PDF to generate your portfolio dossier.',
        ],
      },
    ],
  },
  {
    id: 'parent_tracking',
    roleTagTh: 'ผู้ปกครอง',
    roleTagEn: 'Parents & Guardians',
    titleTh: 'คู่มือจับมือทำสำหรับผู้ปกครอง: ติดตามบุตรหลานครบวงจร (3 ขั้น)',
    titleEn: 'Parent Tracking Playbook: Monitor Your Child (3 Steps)',
    subtitleTh: 'ดูภาพถ่ายเข้า-ออกโรงเรียนแบบเรียลไทม์ ยื่นใบลาให้ลูก เซ็นรับทราบกิจกรรม และเช็กบิลค่าเทอม/ประกาศ',
    subtitleEn: 'Inspect arrival photos, submit guardian leaves, sign consent slips, and review announcements.',
    estimatedMinutes: 3,
    audienceRoles: ['parent'],
    steps: [
      {
        id: 'par-1-portal',
        moduleId: 'parent_portal',
        titleTh: 'ขั้นที่ 1: เลือกชื่อบุตรหลานและตรวจดูภาพถ่ายเข้า-ออกโรงเรียน',
        titleEn: 'Step 1: Select Child & Check Arrival Photo Album',
        summaryTh: 'ดูเวลาเข้าโรงเรียนจริง รูปเซลฟี่จากจุดสแกน และภาพรวมผลการเรียนของลูกในหน้าพอร์ทัล',
        summaryEn: 'Review check-in timestamps, gate photos, and academic summary inside the Parent Portal.',
        checklistTh: [
          'เลือกชื่อบุตรหลานจากช่องด้านขวาบน (กรณีมีลูกหลายคน)',
          'เปิดแท็บ "อัลบั้มภาพถ่ายเข้า-ออก" เพื่อยืนยันการถึงโรงเรียน',
        ],
        checklistEn: [
          'Choose your child from the top-right selector.',
          'Open Check-In Photo Album to confirm arrival at campus.',
        ],
      },
      {
        id: 'par-2-leave',
        moduleId: 'parent_portal',
        titleTh: 'ขั้นที่ 2: ยื่นใบลาและตอบรับหนังสือขออนุญาตผู้ปกครอง',
        titleEn: 'Step 2: Submit Leave & Sign Digital Consent Forms',
        summaryTh: 'แจ้งลาป่วย/ลากิจส่งตรงถึงครูประจำชั้น และกดยินยอมเอกสารกิจกรรมโรงเรียนออนไลน์ได้ทันที',
        summaryEn: 'Send leave notices directly to homeroom advisors and approve school consent slips online.',
        checklistTh: [
          'กดแท็บ "ยื่นใบลาให้ลูก" เพื่อกรอกวันและเหตุผลการลา',
          'เช็กแท็บ "หนังสือขออนุญาต" เมื่อโรงเรียนจัดกิจกรรมพิเศษ',
        ],
        checklistEn: [
          'Open Submit Leave to notify teachers of absence.',
          'Check Consent Slips when school activities require approval.',
        ],
      },
      {
        id: 'par-3-news',
        moduleId: 'announcements',
        titleTh: 'ขั้นที่ 3: ติดตามประกาศข่าวสารจากทางโรงเรียน',
        titleEn: 'Step 3: Read Official School Announcements',
        summaryTh: 'ตรวจสอบประกาศด่วน กำหนดการสอบ และข่าวประชาสัมพันธ์ที่ส่งตรงถึงผู้ปกครอง',
        summaryEn: 'Stay updated on exam schedules, holiday notices, and parent broadcasts.',
        checklistTh: [
          'เลือกตัวกรอง "Target: parents" เพื่อดูข่าวที่ส่งถึงผู้ปกครองโดยเฉพาะ',
        ],
        checklistEn: [
          'Filter by "Target: parents" to read guardian-specific notices.',
        ],
      },
    ],
  },
];

export function resolveTourStepsForPage(
  moduleId: string,
  role: UserRole,
  _lang: AppLanguage,
  options?: { allowUnmountedSettingsTabSteps?: boolean; skipDomCheck?: boolean }
): { definition: ModuleTourDefinition | null; steps: ModuleTourStep[] } {
  const def = MODULE_GUIDED_TOURS[moduleId] || null;
  if (!def) return { definition: null, steps: [] };

  const allowSettingsTabSteps = options?.allowUnmountedSettingsTabSteps ?? true;

  const visibleSteps = def.steps.filter((step) => {
    if (step.roles && !step.roles.includes(role)) return false;
    if (options?.skipDomCheck || typeof document === 'undefined') return true;
    if (allowSettingsTabSteps && step.settingsTab) return true;
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  return {
    definition: def,
    steps: visibleSteps,
  };
}
