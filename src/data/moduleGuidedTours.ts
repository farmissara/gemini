import { AppLanguage, UserRole } from '../types';
import { MascotMood } from './interactiveGuideTopics';

export interface ModuleTourStep {
  id: string;
  selector: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  actionHintTh?: string;
  actionHintEn?: string;
  mood: MascotMood;
  roles?: UserRole[];
}

export interface ModuleTourDefinition {
  moduleId: string;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  steps: ModuleTourStep[];
}

export const MODULE_GUIDED_TOURS: Record<string, ModuleTourDefinition> = {
  dashboard: {
    moduleId: 'dashboard',
    titleTh: 'ทัวร์แนะนำหน้า Dashboard ภาพรวม',
    titleEn: 'Dashboard Overview Guided Tour',
    subtitleTh: 'รู้จักตัวชี้วัด สถิติการมาเรียนสด และโต๊ะทำงานประจำวันภายใน 4 ขั้นตอน',
    subtitleEn: 'Explore real-time KPIs, live check-ins, and your daily desk in 4 quick steps.',
    steps: [
      {
        id: 'dash-subtabs',
        selector: '[data-guide-id="dashboard-subtabs"]',
        titleTh: '1. สลับมุมมองในหน้า Dashboard',
        titleEn: '1. Switch Dashboard Views',
        descriptionTh: 'ใช้แถบนี้สลับระหว่าง "ภาพรวม KPI", "เช็คชื่อ & GPS สด", "นวัตกรรมการเรียนรู้" และ "ประกาศโรงเรียน" ได้ทันที',
        descriptionEn: 'Switch between Overview KPIs, Live GPS Attendance, Innovations Hub, and Campus News.',
        actionHintTh: 'ลองคลิกแท็บ "เช็คชื่อ & GPS สด" เพื่อดูภาพและพิกัดการสแกนเข้าเรียนแบบเรียลไทม์',
        actionHintEn: 'Try clicking "Live GPS" to inspect real-time check-in logs and photos.',
        mood: 'pointing',
      },
      {
        id: 'dash-kpis',
        selector: '[data-guide-id="dashboard-kpis"]',
        titleTh: '2. บัตรตัวชี้วัดสำคัญประจำวัน (Key KPIs)',
        titleEn: '2. Daily School KPI Cards',
        descriptionTh: 'สรุปตัวเลขสำคัญแบบเรียลไทม์ ทั้งจำนวนนักเรียน อัตราการมาเรียนวันนี้ ยอดเก็บค่าเทอม และสัดส่วนผูก LINE ผู้ปกครอง',
        descriptionEn: 'Real-time summary of active students, today’s attendance rate, tuition collection, and guardian LINE sync.',
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
        mood: 'thinking',
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
        mood: 'pointing',
      },
      {
        id: 'gb-course-bar',
        selector: '[data-guide-id="gradebook-course-bar"]',
        titleTh: '2. ค้นหาและเลือกรายวิชาที่จะประเมินผล',
        titleEn: '2. Search & Pick a Course',
        descriptionTh: 'พิมพ์รหัสวิชา ชื่อวิชา หรือชื่อครูผู้สอนเพื่อกรอง จากนั้นเลือกวิชาเพื่อดูคะแนนของนักเรียนทั้งห้อง',
        descriptionEn: 'Filter by code, subject name, or teacher, then pick a course to load student scores.',
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
        mood: 'thinking',
      },
      {
        id: 'gb-import-csv',
        selector: '[data-guide-id="gradebook-import-csv"]',
        titleTh: '5. นำเข้าคะแนนจาก CSV / Excel แบบจับคู่คอลัมน์',
        titleEn: '5. Smart CSV/Excel Column Mapping Import',
        descriptionTh: 'อัปโหลดไฟล์คะแนนจาก Excel ของคุณ แล้วจับคู่หัวคอลัมน์ให้ตรงกับรหัสนักเรียนและคะแนน พร้อมตรวจแถวผิดพลาดก่อนบันทึก',
        descriptionEn: 'Upload any spreadsheet, map custom headers to grade fields, and inspect row validation errors.',
        mood: 'pointing',
      },
      {
        id: 'gb-pdf-export',
        selector: '[data-guide-id="gradebook-pdf-export"]',
        titleTh: '6. ส่งออกรายงานการกระจายคะแนนเป็น PDF',
        titleEn: '6. Download PDF Grade Report',
        descriptionTh: 'คลิกปุ่มนี้เพื่อสร้างเอกสาร PDF สรุปสถิติคะแนนและตารางช่วงเกรดสำหรับฝ่ายวิชาการได้ทันที',
        descriptionEn: 'Click here to export a formatted PDF grade distribution report for school administration.',
        mood: 'celebrate',
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
        mood: 'pointing',
      },
      {
        id: 'stu-search',
        selector: '[data-guide-id="students-search-bar"]',
        titleTh: '2. ค้นหาและคัดกรองตามระดับชั้น',
        titleEn: '2. Search & Grade Level Filters',
        descriptionTh: 'ค้นหาด้วยชื่อ รหัสนักเรียน เลขบัตรประชาชน หรือเลือกกรองเฉพาะชั้น อ.1–ม.6 และห้องเรียนได้ทันที',
        descriptionEn: 'Find students by name, ID, national ID, or filter by grade level and classroom.',
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
        mood: 'celebrate',
      },
      {
        id: 'stu-add-buttons',
        selector: '[data-guide-id="students-add-single"]',
        titleTh: '4. เพิ่มนักเรียนใหม่รายคนหรือทั้งห้อง',
        titleEn: '4. Add Single Student or Full Classroom',
        descriptionTh: 'เลือกเพิ่มทีละคน หรือกดปุ่ม "เพิ่มนักเรียนทั้งห้อง" เพื่อกรอก/วางรายชื่อหลายสิบคนพร้อมกันในครั้งเดียว',
        descriptionEn: 'Add individual student profiles or bulk-paste an entire classroom roster.',
        mood: 'pointing',
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
        mood: 'pointing',
      },
      {
        id: 'att-scanner',
        selector: '[data-guide-id="attendance-scanner-box"]',
        titleTh: '2. สถานีสแกนบัตร QR (รองรับ EDUVERSE:STU:)',
        titleEn: '2. Gate QR Pass Scanner Station',
        descriptionTh: 'กรอกหรือยิงบาร์โค้ด/QR จากบัตรนักเรียนเพื่อบันทึกเวลาเข้า-ออก หรือกด "เช็คชื่อบัญชีฉัน" สำหรับครูและเจ้าหน้าที่',
        descriptionEn: 'Scan student QR passes or record your own daily staff check-in directly.',
        mood: 'celebrate',
      },
      {
        id: 'att-rapid',
        selector: '[data-guide-id="attendance-rapid-scanner"]',
        titleTh: '3. กล้องสแกนรัวต่อเนื่อง 1 วินาที/คน',
        titleEn: '3. Continuous Rapid Webcam Scanner',
        descriptionTh: 'เปิดกล้องสแกนบัตร QR ของนักเรียนต่อเนื่องหน้าประตูโรงเรียนในช่วงเช้าได้อย่างรวดเร็ว',
        descriptionEn: 'Launch live webcam continuous QR scanning for fast morning gate queues.',
        mood: 'pointing',
      },
    ],
  },

  timetable: {
    moduleId: 'timetable',
    titleTh: 'ทัวร์แนะนำตารางเรียน & ตารางสอน',
    titleEn: 'Timetable & Schedule Guided Tour',
    subtitleTh: 'ดูตารางรายห้อง ปฏิทิน เกณฑ์เวลาเรียน 80% และตรวจเช็กภาระงานครู',
    subtitleEn: 'Browse classroom grids, calendar view, 80% attendance rules, and teacher workload.',
    steps: [
      {
        id: 'tt-tabs',
        selector: '[data-guide-id="timetable-view-tabs"]',
        titleTh: '1. เลือกมุมมองตารางเรียน/สอน',
        titleEn: '1. Switch Timetable Perspectives',
        descriptionTh: 'สลับดูได้ทั้ง "ตารางห้อง", "ปฏิทิน", "เวลาเรียน 80%" และ "ภาระงานสอนครู" ในหน้าเดียว',
        descriptionEn: 'Toggle between Classroom Grid, Calendar, 80% Eligibility, and Teacher Workload.',
        mood: 'pointing',
      },
    ],
  },

  courses: {
    moduleId: 'courses',
    titleTh: 'ทัวร์แนะนำหน้าหลักสูตรและรายวิชา',
    titleEn: 'Courses & Curriculum Guided Tour',
    subtitleTh: 'จัดการรายวิชา หน่วยกิต อาจารย์ผู้สอน และลงทะเบียนนักเรียนเข้าชั้นเรียน',
    subtitleEn: 'Manage courses, credit units, assigned instructors, and class enrollments.',
    steps: [
      {
        id: 'crs-toolbar',
        selector: '[data-guide-id="courses-header-actions"]',
        titleTh: '1. เครื่องมือจัดการหลักสูตรและนำเข้า Excel',
        titleEn: '1. Curriculum Tools & Bulk Import',
        descriptionTh: 'นำเข้า/ส่งออกรายวิชาจาก Excel จัดการกลุ่มสาระการเรียนรู้ หรือสร้างรายวิชาใหม่เข้าสู่ระบบ',
        descriptionEn: 'Import/export course catalogs, configure subject departments, or add new courses.',
        mood: 'pointing',
        roles: ['super_admin', 'admin', 'teacher'],
      },
    ],
  },

  homework: {
    moduleId: 'homework',
    titleTh: 'ทัวร์แนะนำหน้าการบ้าน & ติดตามการส่งงาน',
    titleEn: 'Homework & Submissions Guided Tour',
    subtitleTh: 'ติดตามงานค้าง ซิงก์กำหนดส่งเข้า Google Calendar และส่งงานออนไลน์',
    subtitleEn: 'Track pending homework, sync deadlines to Google Calendar, and submit work.',
    steps: [
      {
        id: 'hw-tabs',
        selector: '[data-guide-id="homework-subtabs"]',
        titleTh: '1. สลับดูรายการส่งงาน / การบ้านที่สั่ง / งานค้างส่ง',
        titleEn: '1. Submissions, Assigned & Pending Tabs',
        descriptionTh: 'ตรวจสอบงานที่ส่งแล้ว ดูโจทย์การบ้านทั้งหมด และคัดกรองเฉพาะงานที่ยังค้างส่งได้ทันที',
        descriptionEn: 'Review incoming submissions, browse assigned tasks, or filter pending items.',
        mood: 'pointing',
      },
      {
        id: 'hw-gcal',
        selector: '[data-guide-id="homework-gcal-sync"]',
        titleTh: '2. ซิงก์กำหนดส่งเข้า Google Calendar',
        titleEn: '2. Sync Deadlines to Google Calendar',
        descriptionTh: 'นำวันครบกำหนดส่งการบ้านไปแสดงแจ้งเตือนใน Google Calendar เพื่อไม่พลาดกำหนดส่งงาน',
        descriptionEn: 'Export assignment due dates directly to Google Calendar reminders.',
        mood: 'happy',
      },
      {
        id: 'hw-submit',
        selector: '[data-guide-id="homework-submit-btn"]',
        titleTh: '3. ส่งการบ้านใหม่',
        titleEn: '3. Submit New Homework',
        descriptionTh: 'กดเพื่อเลือกวิชา แนบคำตอบหรือลิงก์ผลงานส่งถึงอาจารย์ผู้สอนทันที',
        descriptionEn: 'Click to submit homework text or file links straight to your teacher.',
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
        mood: 'happy',
      },
      {
        id: 'lms-homework',
        selector: '[data-guide-id="lms-homework-tab"]',
        titleTh: '2. การบ้าน & ใบงานออนไลน์',
        titleEn: '2. Online Assignments & Grading',
        descriptionTh: 'สลับมาที่แท็บนี้เพื่อส่งงานประจำวิชาหรือตรวจให้คะแนนผลงานของนักเรียนในห้องเรียนออนไลน์',
        descriptionEn: 'Switch to this tab to submit coursework or grade incoming student assignments.',
        mood: 'pointing',
      },
    ],
  },
};

export function resolveTourStepsForPage(
  moduleId: string,
  role: UserRole,
  _lang: AppLanguage
): { definition: ModuleTourDefinition | null; steps: ModuleTourStep[] } {
  const def = MODULE_GUIDED_TOURS[moduleId] || null;
  if (!def) return { definition: null, steps: [] };

  const visibleSteps = def.steps.filter((step) => {
    if (step.roles && !step.roles.includes(role)) return false;
    if (typeof document === 'undefined') return true;
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
