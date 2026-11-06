import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  QrCode, 
  Smartphone, 
  FolderGit2, 
  Award, 
  Receipt, 
  BellRing, 
  Cpu, 
  Laptop, 
  Gamepad2, 
  Search, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Key
} from 'lucide-react';
import { AppLanguage, UserRole } from '../types';

export type GuideModuleId = 
  | 'dashboard'
  | 'students'
  | 'courses'
  | 'attendance'
  | 'mobile_checkin'
  | 'portfolio'
  | 'gradebook'
  | 'billing'
  | 'announcements'
  | 'integrations'
  | 'lms'
  | 'parent_portal'
  | 'games';

interface ModuleGuideModalProps {
  initialModule?: GuideModuleId;
  lang: AppLanguage;
  currentRole: UserRole;
  onClose: () => void;
  onNavigateToModule?: (moduleId: string) => void;
}

interface GuideItem {
  id: GuideModuleId;
  titleTh: string;
  titleEn: string;
  category: 'sis' | 'academic' | 'communication' | 'lms' | 'game';
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  summaryTh: string;
  summaryEn: string;
  features: {
    titleTh: string;
    titleEn: string;
    descTh: string;
    descEn: string;
  }[];
  steps: {
    titleTh: string;
    titleEn: string;
    descTh: string;
    descEn: string;
  }[];
  tipsTh: string[];
  tipsEn: string[];
}

export const MODULE_GUIDES: GuideItem[] = [
  {
    id: 'dashboard',
    titleTh: 'แดชบอร์ดภาพรวม (Dashboard Overview)',
    titleEn: 'Dashboard Overview & School Analytics',
    category: 'sis',
    icon: LayoutDashboard,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์', 'นักเรียน', 'ผู้ปกครอง'],
    summaryTh: 'ศูนย์รวมข้อมูลสถิติของโรงเรียนแบบเรียลไทม์ KPI ผู้เรียน การเข้าแถว การเงิน และทางลัดสู่ทุกฟังก์ชัน',
    summaryEn: 'Centralized real-time analytics hub displaying key KPIs, attendance stats, tuition collection, and quick actions.',
    features: [
      {
        titleTh: 'ตัวชี้วัดสำคัญ (Key KPIs)',
        titleEn: 'Real-time Metrics',
        descTh: 'แสดงจำนวนนักเรียนทั้งหมด, อัตราการมาเรียนวันนี้, สถิติการผูก LINE OA ของผู้ปกครอง, และยอดจัดเก็บค่าเทอม',
        descEn: 'Displays total students, today attendance rate, LINE OA guardian link percentage, and tuition collection stats.'
      },
      {
        titleTh: 'การสลับบทบาท (Role Switcher)',
        titleEn: 'Role Switcher',
        descTh: 'สามารถสลับมุมมองเป็น ผอ./แอดมิน, ครู, นักเรียน, หรือผู้ปกครอง ได้ทันทีบนแถบเมนูด้านบน เพื่อทดสอบประสบการณ์ผู้ใช้',
        descEn: 'Instantly toggle view between Admin, Teacher, Student, and Parent in the top navbar to verify UX.'
      },
      {
        titleTh: 'การตั้งค่าฐานข้อมูล Supabase ด่วน',
        titleEn: 'Quick Supabase Setup',
        descTh: 'มีกล่องกรอก VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY บนหน้าแดชบอร์ดเพื่อเชื่อมต่อฐานข้อมูลจริงทันที',
        descEn: 'Direct input box for Supabase credentials right on the dashboard for instant live PostgreSQL synchronization.'
      }
    ],
    steps: [
      {
        titleTh: '1. ตรวจสอบสถิติประจำวัน',
        titleEn: '1. Review Daily Stats',
        descTh: 'ดูอัตราการมาเรียนในเช้าวันนี้ หากมีนักเรียนขาดหรือมาสาย ระบบจะสรุปแยกจำนวนให้ทันที',
        descEn: 'Check morning attendance percentages. The system breaks down present, late, sick, and absent counts.'
      },
      {
        titleTh: '2. ตรวจสอบนักเรียนที่มีผลการเรียนดีเด่น',
        titleEn: '2. Check Top Honor Students',
        descTh: 'แถบด้านล่างจะแสดงรายชื่อนักเรียนที่มี GPA สูงสุดของโรงเรียนพร้อมลิงก์ตรงไปยังประวัติ',
        descEn: 'Bottom section shows top GPA students with direct shortcuts to their academic profiles.'
      },
      {
        titleTh: '3. สลับโรงเรียน / สาขา',
        titleEn: '3. Multi-School Switcher',
        descTh: 'กดปุ่มชื่อโรงเรียนบนแถบเมนูเพื่อสลับไปดูข้อมูลของสาขาอื่น (กรุงเทพฯ, เชียงใหม่, ภูเก็ต) ได้อิสระ',
        descEn: 'Click the school name pill in the top navbar to switch between campuses (Bangkok, Chiang Mai, Phuket).'
      }
    ],
    tipsTh: [
      'สามารถเปลี่ยนโทนสีของระบบได้ 4 สี (Sapphire, Emerald, Amethyst, Clean Light) ผ่านปุ่ม Palette บน Navbar',
      'ปุ่ม Backup บน Navbar ใช้สำหรับดาวน์โหลดไฟล์สำรองข้อมูลแบบเข้ารหัส AES-256 ได้ทุกเมื่อ'
    ],
    tipsEn: [
      'Switch between 4 visual palettes (Sapphire, Emerald, Amethyst, Light) from the top navbar palette switcher.',
      'The Backup shortcut button on the navbar allows downloading encrypted database snapshots anytime.'
    ]
  },
  {
    id: 'students',
    titleTh: 'ทะเบียนประวัตินักเรียน & ออก ปพ.1 (Student Directory)',
    titleEn: 'Student Directory & Official Transcripts',
    category: 'sis',
    icon: Users,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์'],
    summaryTh: 'จัดการฐานข้อมูลนักเรียน คัดกรองตามชั้นเรียน ผูก LINE OA แจ้งเตือนผู้ปกครอง และพิมพ์ใบ ปพ.1 สองภาษา',
    summaryEn: 'Comprehensive student profile management, class filtering, LINE OA sync, and bilingual transcript generation.',
    features: [
      {
        titleTh: 'ค้นหา & คัดกรองหลายมิติ',
        titleEn: 'Multi-criteria Search & Filters',
        descTh: 'ค้นหาด้วยชื่อภาษาไทย, ภาษาอังกฤษ, เลขประจำตัวนักเรียน หรือรหัสบัตรประชาชน พร้อมตัวกรอง ม.1 - ม.6',
        descEn: 'Search by Thai/English name, Student ID, or National ID with grade level (Grade 7 - 12) filters.'
      },
      {
        titleTh: 'ผูกบัญชี LINE OA เพื่อแจ้งเตือน',
        titleEn: 'LINE OA Guardian Sync',
        descTh: 'สลับเปิด-ปิดสถานะการเชื่อมต่อ LINE ของผู้ปกครอง เมื่อเปิดระบบจะส่ง Push Notification เมื่อนักเรียนสแกนเข้าโรงเรียน',
        descEn: 'Toggle guardian LINE notifications. When enabled, automated check-in pushes are sent to parent phones.'
      },
      {
        titleTh: 'ออกใบรายงานผลการเรียน ปพ.1 สองภาษา',
        titleEn: 'Bilingual Transcript Generation',
        descTh: 'กดปุ่มรูปใบประกาศเพื่อเปิดเอกสาร ปพ.1 ทางการ แสดงเกรดเฉลี่ย GPAX, หน่วยกิตสะสม, ตราโรงเรียน และลายเซ็น พร้อมสั่งพิมพ์ A4',
        descEn: 'Click transcript icon to open official bilingual report card with GPAX, school seal, digital signatures, and print.'
      }
    ],
    steps: [
      {
        titleTh: '1. เพิ่มนักเรียนใหม่',
        titleEn: '1. Add New Student',
        descTh: 'คลิกปุ่ม "+ เพิ่มนักเรียนใหม่" กรอกข้อมูลชื่อ-สกุล สองภาษา ระดับชั้น ข้อมูลผู้ปกครอง และเบอร์โทรศัพท์',
        descEn: 'Click "+ Add Student", fill bilingual name, grade, room, and guardian contact details.'
      },
      {
        titleTh: '2. ดูโปรไฟล์เชิงลึก',
        titleEn: '2. View Detailed Profile',
        descTh: 'คลิกที่การ์ดของนักเรียนเพื่อเปิดหน้าต่างดูประวัติการเข้าเรียน เกรดเฉลี่ยสะสม และรายวิชาที่ลงทะเบียน',
        descEn: 'Click student card to open detailed modal showing attendance history, GPAX, and enrolled courses.'
      },
      {
        titleTh: '3. สั่งพิมพ์เอกสาร ปพ.1',
        titleEn: '3. Print Report Card',
        descTh: 'ในหน้าโปรไฟล์หรือรายการนักเรียน กดปุ่ม "ออกใบ ปพ.1" เพื่อพิมพ์หรือบันทึกเป็น PDF ได้ทันที',
        descEn: 'Click "Report Card" button to generate an official print-ready document or export to PDF.'
      }
    ],
    tipsTh: [
      'หากผู้ปกครองยังไม่ได้เชื่อมต่อ LINE สามารถคัดลอก LINE OA Add Friend URL ส่งให้ผู้ปกครองสแกนได้',
      'เอกสาร ปพ.1 มีการคำนวณเกรดเฉลี่ยถ่วงน้ำหนักตามหน่วยกิต (Weighted GPA) ตามมาตรฐานกระทรวงศึกษาธิการ'
    ],
    tipsEn: [
      'Share the school LINE OA link with parents so they can receive instant student check-in alerts.',
      'The transcript complies with Ministry of Education standards with credit-weighted GPA calculation.'
    ]
  },
  {
    id: 'courses',
    titleTh: 'หลักสูตร & แผนการเรียน (Courses & Curriculum)',
    titleEn: 'Curriculum & Course Management',
    category: 'academic',
    icon: GraduationCap,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์'],
    summaryTh: 'บริหารจัดการรายวิชาพื้นฐาน เพิ่มเติม STEM ตารางสอน อาจารย์ผู้สอน และการลงทะเบียนเรียน',
    summaryEn: 'Manage core, elective, and STEM courses, schedules, teacher assignments, and student enrollments.',
    features: [
      {
        titleTh: 'หมวดหมู่วิชาที่หลากหลาย',
        titleEn: 'Course Categorization',
        descTh: 'แบ่งกลุ่มวิชาเป็น วิชาพื้นฐาน (Core), วิชาเพิ่มเติม (Elective), STEM, ภาษาต่างประเทศ, และศิลปะ',
        descEn: 'Filter and organize by Core, Elective, STEM, Language, and Arts categories.'
      },
      {
        titleTh: 'ตารางสอน & ห้องเรียน',
        titleEn: 'Class Schedule & Rooms',
        descTh: 'ระบุวัน เวลา และห้องเรียน เช่น "Mon, Wed 09:00 - 10:30 (Room 402)" พร้อมจำนวนหน่วยกิต',
        descEn: 'Define days, times, rooms, and credit units for every course offering.'
      },
      {
        titleTh: 'การลงทะเบียนเรียน (Enrollment)',
        titleEn: 'Student Enrollment',
        descTh: 'สามารถเพิ่มนักเรียนเข้าสู่รายวิชาได้โดยตรง พร้อมนับจำนวนผู้เรียนแบบเรียลไทม์',
        descEn: 'Enroll students into courses with real-time enrolled counter and capacity tracker.'
      }
    ],
    steps: [
      {
        titleTh: '1. สร้างรายวิชาใหม่',
        titleEn: '1. Create New Course',
        descTh: 'กดปุ่ม "+ เพิ่มรายวิชาใหม่" กำหนดรหัสวิชา เช่น CS301, ชื่อไทย-อังกฤษ, อาจารย์ผู้สอน, หน่วยกิต และตารางสอน',
        descEn: 'Click "+ Add Course", define course code (e.g. CS301), bilingual titles, instructor, credits, and schedule.'
      },
      {
        titleTh: '2. ลงทะเบียนนักเรียน',
        titleEn: '2. Enroll Students',
        descTh: 'คลิกปุ่ม "ลงทะเบียนเรียน" ที่การ์ดรายวิชา เพื่อเลือกนักเรียนเข้าสู่ชั้นเรียน',
        descEn: 'Click "Enroll" on any course card to add students to the class roster.'
      }
    ],
    tipsTh: [
      'เมื่อเพิ่มรายวิชาใหม่ รายวิชาจะเชื่อมต่อไปยังระบบบันทึกคะแนน (Gradebook) และระบบห้องเรียนออนไลน์ (LMS) อัตโนมัติ'
    ],
    tipsEn: [
      'New courses automatically link to the Gradebook and Virtual LMS Classroom modules.'
    ]
  },
  {
    id: 'attendance',
    titleTh: 'เช็คชื่อหน้าแถว & สแกนเนอร์ (Attendance Check-in)',
    titleEn: 'Morning Assembly Attendance & QR Check-in',
    category: 'sis',
    icon: QrCode,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์'],
    summaryTh: 'บันทึกการเข้าแถวตอนเช้าด้วยระบบ QR Code, RFID หรือบันทึกด้วยมือ พร้อมส่งแจ้งเตือนเข้า LINE ผู้ปกครอง',
    summaryEn: 'Morning assembly check-in with QR scanner, RFID emulation, or manual entry with automated LINE push.',
    features: [
      {
        titleTh: 'สถานะการเข้าเรียนครบถ้วน',
        titleEn: 'Attendance Statuses',
        descTh: 'รองรับ 5 สถานะ: มาเรียน (Present), มาสาย (Late), ขาดเรียน (Absent), ลาป่วย (Sick), ลากิจ (Leave)',
        descEn: 'Full support for Present, Late, Absent, Sick, and Leave statuses.'
      },
      {
        titleTh: 'สแกนเนอร์ QR & RFID จำลอง',
        titleEn: 'QR & RFID Simulator',
        descTh: 'มีระบบจำลองหัวอ่าน RFID หน้าประตูโรงเรียน สแกนปุ๊บบันทึกเวลาและส่ง LINE ทันที',
        descEn: 'Built-in gate scanner simulator that logs timestamp and triggers guardian push alerts.'
      },
      {
        titleTh: 'ระบบส่ง LINE Notification อัตโนมัติ',
        titleEn: 'Automated LINE Notification',
        descTh: 'เมื่อบันทึกการเช็คชื่อ หากนักเรียนผูก LINE ไว้ ระบบจะแจ้งเตือนผู้ปกครองว่านักเรียนถึงโรงเรียนแล้วในเวลาใด',
        descEn: 'Sends instantaneous notification to parent smartphone indicating arrival timestamp.'
      }
    ],
    steps: [
      {
        titleTh: '1. ค้นหานักเรียนหรือใช้สแกนเนอร์',
        titleEn: '1. Find Student or Scan',
        descTh: 'พิมพ์รหัสนักเรียน หรือคลิกปุ่ม "สแกน QR / RFID" เพื่อเช็คชื่ออัตโนมัติ',
        descEn: 'Type student name/ID or click QR / RFID scanner button for rapid check-in.'
      },
      {
        titleTh: '2. เลือกระบุสถานะและหมายเหตุ',
        titleEn: '2. Select Status & Remarks',
        descTh: 'เลือกสถานะ เช่น "มาเรียน" หรือ "มาสาย" และใส่หมายเหตุ เช่น "ติดธุระ" ได้',
        descEn: 'Choose attendance status and add optional notes or reason for late arrival.'
      }
    ],
    tipsTh: [
      'สามารถดูประวัติการเช็คชื่อย้อนหลังแยกรายวัน และดูสัดส่วนเปอร์เซ็นต์การมาเรียนของโรงเรียนได้ทันที'
    ],
    tipsEn: [
      'Filter attendance records by date and view aggregate daily attendance percentage graphs.'
    ]
  },
  {
    id: 'mobile_checkin',
    titleTh: 'เช็คชื่อรายคาบ & มือถือ (Mobile Period Attendance)',
    titleEn: 'Period Attendance & Mobile Class Check-in',
    category: 'academic',
    icon: Smartphone,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์'],
    summaryTh: 'ออกแบบเฉพาะสำหรับสมาร์ทโฟนและแท็บเล็ต ให้คุณครูประจำวิชาเช็คชื่อนักเรียนในห้องเรียนแยกตามคาบเรียน 1-8',
    summaryEn: 'Mobile-optimized period-by-period attendance tracking for subject teachers across Periods 1 to 8.',
    features: [
      {
        titleTh: 'เลือกคาบเรียนที่ 1 - 8',
        titleEn: 'Periods 1 to 8 Selection',
        descTh: 'สลับเลือกวิชาและคาบเรียนได้อย่างรวดเร็ว พร้อมระบุวันที่และห้องเรียน',
        descEn: 'Quick switch between subjects and periods (1 to 8) with date and classroom tags.'
      },
      {
        titleTh: 'ปุ่มเช็คชื่อสัมผัสขนาดใหญ่',
        titleEn: 'Touch-friendly Quick Buttons',
        descTh: 'ปุ่มกด ป้ายสีชัดเจน กดครั้งเดียวเปลี่ยนสถานะ มา/สาย/ขาด/ลา ได้สะดวกรวดเร็วบนมือถือ',
        descEn: 'Large high-contrast touch buttons for effortless mobile tapping while teaching.'
      },
      {
        titleTh: 'ปุ่ม "มาครบทุกคน" (Mark All Present)',
        titleEn: 'Mark All Present Shortcut',
        descTh: 'กดปุ่มเดียวเช็คชื่อทั้งห้องเป็น "มาเรียน" แล้วค่อยแก้ไขเฉพาะนักเรียนที่ขาดเรียน ช่วยประหยัดเวลาครู',
        descEn: 'One-click shortcut to set entire classroom to Present, then toggle only absent students.'
      }
    ],
    steps: [
      {
        titleTh: '1. เลือกวิชาและคาบเรียน',
        titleEn: '1. Select Course & Period',
        descTh: 'เลือกรายวิชาที่คุณกำลังสอน และเลือกคาบที่ (เช่น คาบ 2: 09:20 - 10:10)',
        descEn: 'Pick the course you are currently teaching and select the active period.'
      },
      {
        titleTh: '2. สัมผัสปุ่มเช็คชื่อ',
        titleEn: '2. Tap Status for Students',
        descTh: 'แตะที่ชื่อนักเรียนแต่ละคนเพื่อระบุสถานะ หรือกด "มาครบทุกคน" แล้วบันทึก',
        descEn: 'Tap student status badges or hit "Mark All Present" to quickly save the period roster.'
      }
    ],
    tipsTh: [
      'ระบบนี้บันทึกลงฐานข้อมูลแยกจากเวลาเข้าแถวตอนเช้า ทำให้ทราบว่านักเรียนโดดเรียนในคาบใดได้แม่นยำ'
    ],
    tipsEn: [
      'Stored separately from morning check-in to accurately flag students who skip individual periods.'
    ]
  },
  {
    id: 'portfolio',
    titleTh: 'แฟ้มผลงานดิจิทัล TCAS & PA (Digital Portfolio)',
    titleEn: 'Digital Portfolio (TCAS & PA System)',
    category: 'academic',
    icon: FolderGit2,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์', 'นักเรียน'],
    summaryTh: 'จัดเก็บผลงาน กิจกรรม เกียรติบัตร และโครงงานของนักเรียนสำหรับยื่น TCAS รอบ 1 และแฟ้มประเมิน PA ของคุณครู',
    summaryEn: 'Digital archive of student awards, STEM projects, and extracurriculars for university TCAS and teacher PA evaluations.',
    features: [
      {
        titleTh: 'แยกแฟ้มของนักเรียน และครู (PA)',
        titleEn: 'Student & Teacher PA Portfolios',
        descTh: 'สลับระหว่าง แฟ้มผลงานนักเรียน (TCAS Portfolio) และ แฟ้มประเมินวิทยฐานะของครู (Teacher PA)',
        descEn: 'Switch seamlessly between student admissions portfolio and teacher Performance Agreement archive.'
      },
      {
        titleTh: 'หมวดหมู่ผลงานมาตรฐาน',
        titleEn: 'Standard Categories',
        descTh: 'จัดหมวดหมู่: การแข่งขัน (Competition), จิตอาสา (Volunteer), ความเป็นผู้นำ (Leadership), และนวัตกรรม (Innovation)',
        descEn: 'Categorize into Competitions, Community Service, Leadership, and Innovation/STEM.'
      },
      {
        titleTh: 'แท็กทักษะ (Skill Tags) & รูปภาพ',
        titleEn: 'Skill Tags & Evidence Media',
        descTh: 'ระบุทักษะที่ได้รับ เช่น Python, Robotics, English Speech พร้อมแนบรูปภาพผลงานความละเอียดสูง',
        descEn: 'Attach skill tags (e.g. AI, Public Speaking) and photo proof for each portfolio entry.'
      }
    ],
    steps: [
      {
        titleTh: '1. เพิ่มผลงานใหม่',
        titleEn: '1. Add Portfolio Item',
        descTh: 'คลิกปุ่ม "+ เพิ่มผลงานใหม่" กรอกชื่อผลงาน, หมวดหมู่, ปีการศึกษา, รายละเอียด, ทักษะที่ได้ และ URL รูปภาพ',
        descEn: 'Click "+ Add Portfolio Item", input title, category, academic year, description, and proof URL.'
      },
      {
        titleTh: '2. สั่งพิมพ์ / ส่งออก TCAS',
        titleEn: '2. Export / Print for TCAS',
        descTh: 'กดปุ่มพิมพ์เพื่อจัดหน้าสรุปผลงานสวยงามพร้อมแนบในการสมัครเข้ามหาวิทยาลัย',
        descEn: 'Click the print button to format a clean PDF dossier ready for university submissions.'
      }
    ],
    tipsTh: [
      'นักเรียนสามารถสะสมผลงานได้ตั้งแต่ ม.1 ถึง ม.6 เพื่อเตรียมเอกสารยื่นเข้าศึกษาต่อในระดับอุดมศึกษา'
    ],
    tipsEn: [
      'Students can compile accomplishments from Grade 7-12 for university admission portfolios.'
    ]
  },
  {
    id: 'gradebook',
    titleTh: 'บันทึกคะแนน & ตัดเกรด (Gradebook & Transcripts)',
    titleEn: 'Gradebook, GPAX & Transcript Engine',
    category: 'academic',
    icon: Award,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์'],
    summaryTh: 'บันทึกคะแนนเก็บระหว่างภาค กลางภาค ปลายภาค รวม 100 คะแนน คำนวณเกรด 8 ระดับ และ GPAX อัตโนมัติ',
    summaryEn: 'Input assignment, quiz, midterm, and final scores (total 100). Computes letter grades and GPAX automatically.',
    features: [
      {
        titleTh: 'การตัดเกรด 8 ระดับมาตรฐาน',
        titleEn: '8-tier Grading Standards',
        descTh: 'คำนวณเกรด A (80-100), B+ (75-79), B (70-74), C+ (65-69), C (60-64), D+ (55-59), D (50-54), F (<50)',
        descEn: 'Full support for standard Thai grading scale: A, B+, B, C+, C, D+, D, and F.'
      },
      {
        titleTh: 'บันทึกคะแนนแบบ Inline',
        titleEn: 'Inline Score Editing',
        descTh: 'คุณครูสามารถคลิกแก้ไขคะแนนเก็บ กลางภาค หรือปลายภาค ในตารางได้ทันที ระบบจะรวมคะแนนและปรับเกรดให้อัตโนมัติ',
        descEn: 'Click and edit any student score directly in the table. Totals and letter grades update dynamically.'
      },
      {
        titleTh: 'เชื่อมต่อใบ ปพ.1 ในคลิกเดียว',
        titleEn: 'Direct Report Card Modal Link',
        descTh: 'มีปุ่มคลิกดูใบรายงานผลการเรียนอย่างเป็นทางการได้จากตารางเกรดของนักเรียนแต่ละคนทันที',
        descEn: 'Convenient shortcut button next to each student row to view their official bilingual report card.'
      }
    ],
    steps: [
      {
        titleTh: '1. คัดกรองรายวิชาและระดับชั้น',
        titleEn: '1. Select Course & Grade',
        descTh: 'เลือกรายวิชาที่ต้องการบันทึกคะแนนจากดรอปดาวน์ด้านบน',
        descEn: 'Select the target subject from the top course filter.'
      },
      {
        titleTh: '2. แก้ไขคะแนน',
        titleEn: '2. Update Scores',
        descTh: 'กรอกคะแนน Assignment (20), Quiz (10), Midterm (30), Final (40) แล้วระบบจะบันทึกทันที',
        descEn: 'Enter scores for Assignments (20), Quizzes (10), Midterm (30), and Final (40).'
      }
    ],
    tipsTh: [
      'เมื่อมีการแก้ไขคะแนน เกรดเฉลี่ยสะสม (GPAX) ของนักเรียนจะถูกคำนวณใหม่แบบถ่วงน้ำหนักทันที'
    ],
    tipsEn: [
      'Updating raw marks recalculates term GPA and cumulative GPAX instantly.'
    ]
  },
  {
    id: 'billing',
    titleTh: 'การเงิน & ค่าเทอมพร้อมเพย์ (Tuition & PromptPay)',
    titleEn: 'Tuition Invoicing & PromptPay Payments',
    category: 'sis',
    icon: Receipt,
    roles: ['ผู้บริหาร/แอดมิน', 'ผู้ปกครอง'],
    summaryTh: 'ออกใบแจ้งหนี้ค่าเทอม ค่าบำรุงการศึกษา สร้าง QR Code พร้อมเพย์ และออกใบเสร็จรับเงินอย่างเป็นทางการ',
    summaryEn: 'Issue tuition invoices, generate dynamic PromptPay QR codes, track payments, and generate official receipts.',
    features: [
      {
        titleTh: 'QR Code พร้อมเพย์มาตรฐานไทย',
        titleEn: 'PromptPay QR Generator',
        descTh: 'สร้าง QR Code พร้อมยอดเงินที่ถูกต้อง ผู้ปกครองสามารถเปิดแอปธนาคารสแกนจ่ายได้ทันที',
        descEn: 'Generates standard Thai PromptPay QR codes matching invoice totals for mobile banking scans.'
      },
      {
        titleTh: 'สถานะการชำระเงินแบบเรียลไทม์',
        titleEn: 'Real-time Payment Tracking',
        descTh: 'จำแนกสถานะ ชำระแล้ว (Paid), รอชำระ (Pending), เกินกำหนด (Overdue)',
        descEn: 'Track payment progress: Paid (green), Pending (amber), Overdue (rose).'
      },
      {
        titleTh: 'ส่ง LINE เตือนชำระค่าเทอม',
        titleEn: 'LINE Payment Reminders',
        descTh: 'มีปุ่มส่งข้อความแจ้งเตือนยอดค่าเทอมและกำหนดชำระเข้า LINE ผู้ปกครองในคลิกเดียว',
        descEn: 'One-click action to push personalized tuition payment reminders directly to parent LINE OA.'
      }
    ],
    steps: [
      {
        titleTh: '1. ตรวจสอบใบแจ้งหนี้',
        titleEn: '1. Inspect Invoices',
        descTh: 'ดูรายการค่าใช้จ่าย เช่น ค่าหน่วยกิต ค่าห้องเรียนปรับอากาศ ค่าประกันอุบัติเหตุ',
        descEn: 'Review invoice breakdown: tuition fees, air-conditioned lab fees, and student insurance.'
      },
      {
        titleTh: '2. ชำระเงินหรือจำลองการจ่าย',
        titleEn: '2. Pay or Emulate Payment',
        descTh: 'คลิกปุ่ม "ชำระเงิน (PromptPay)" เพื่อจำลองการจ่ายเงินและรับใบเสร็จรับเงินทันที',
        descEn: 'Click "Pay Invoice" to simulate instant QR payment and issue an official receipt.'
      }
    ],
    tipsTh: [
      'สามารถส่งออกข้อมูลการเงินเพื่อส่งต่อให้ฝ่ายบัญชีของโรงเรียนได้'
    ],
    tipsEn: [
      'Financial records and receipts can be audited and synchronized with accounting backends.'
    ]
  },
  {
    id: 'announcements',
    titleTh: 'ข่าวสาร & LINE บรอดแคสต์ (Announcements & Broadcast)',
    titleEn: 'School Announcements & LINE Broadcasts',
    category: 'communication',
    icon: BellRing,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์', 'นักเรียน', 'ผู้ปกครอง'],
    summaryTh: 'สื่อสารข่าวสารกิจกรรม ประกาศด่วน การปิดเรียนกรณีพิเศษ พร้อมระบบบรอดแคสต์เข้า LINE OA และอีเมล Resend',
    summaryEn: 'Broadcast school news, urgent closures, and events to student and parent LINE OA accounts and emails.',
    features: [
      {
        titleTh: 'LINE Broadcast Integration',
        titleEn: 'LINE Broadcast Push',
        descTh: 'ส่งประกาศเข้ากระเป๋าผู้ปกครองและนักเรียนทุกคนผ่าน LINE Official Account ทันทีที่โพสต์',
        descEn: 'Push notifications directly to subscriber phones through the LINE Messaging API.'
      },
      {
        titleTh: 'Resend Transactional Email',
        titleEn: 'Resend Email Service',
        descTh: 'ส่งสำเนาประกาศทางการและจดหมายข่าวเข้าอีเมลของผู้ปกครองอัตโนมัติ',
        descEn: 'Automatically send email newsletters and urgent notifications via Resend API.'
      },
      {
        titleTh: 'ปักหมุดประกาศสำคัญ (Pin Announcement)',
        titleEn: 'Pinned Announcements',
        descTh: 'ปักหมุดข่าวสำคัญให้อยู่บนสุดเสมอ เช่น กำหนดการสอบ หรือมาตรการความปลอดภัย',
        descEn: 'Pin crucial notices (e.g. exam schedules, emergency closures) to remain atop the feed.'
      }
    ],
    steps: [
      {
        titleTh: '1. สร้างประกาศใหม่',
        titleEn: '1. Draft Announcement',
        descTh: 'กดปุ่ม "+ สร้างประกาศใหม่" กรอกหัวข้อ, เนื้อหา, หมวดหมู่ (ทั่วไป, วิชาการ, ด่วน, กิจกรรม), และกลุ่มเป้าหมาย',
        descEn: 'Click "+ New Announcement", enter headline, description, category, and target audience.'
      },
      {
        titleTh: '2. บรอดแคสต์ผ่าน LINE',
        titleEn: '2. Trigger LINE Broadcast',
        descTh: 'ติ๊กเครื่องหมาย "ส่ง LINE Broadcast" เพื่อส่งข้อความเข้าผู้ติดตามทุกคนพร้อมกัน',
        descEn: 'Check "Send LINE Broadcast" to fire real-time push notification across all linked parents.'
      }
    ],
    tipsTh: [
      'สามารถเลือกกลุ่มเป้าหมายได้ทั้ง "ทุกคน", "เฉพาะนักเรียน", "เฉพาะผู้ปกครอง" หรือ "เฉพาะครูอาจารย์"'
    ],
    tipsEn: [
      'Target specific segments: Everyone, Students only, Parents only, or Faculty members.'
    ]
  },
  {
    id: 'lms',
    titleTh: 'ห้องเรียนเสมือนจริง (LMS Virtual Classroom)',
    titleEn: 'LMS Virtual Classroom & Assignments',
    category: 'lms',
    icon: Laptop,
    roles: ['ผู้บริหาร/แอดมิน', 'ครูอาจารย์', 'นักเรียน'],
    summaryTh: 'ระบบการเรียนการสอนออนไลน์ บทเรียนวิดีโอ เอกสารประกอบการเรียน และการส่งการบ้านตรวจให้คะแนน',
    summaryEn: 'Online e-learning platform with video lectures, digital courseware, assignment submissions, and grading.',
    features: [
      {
        titleTh: 'บทเรียนแยกตามบท (Chapters & Lessons)',
        titleEn: 'Structured Lessons',
        descTh: 'จัดระเบียบบทเรียนเป็นบทๆ พร้อมคลิปวิดีโอการสอน และเอกสารดาวน์โหลด PDF',
        descEn: 'Organized chapters with integrated lecture videos, slide decks, and downloadable worksheets.'
      },
      {
        titleTh: 'ระบบส่งการบ้านออนไลน์ (Assignments)',
        titleEn: 'Online Assignment Submissions',
        descTh: 'นักเรียนสามารถส่งงานผ่านระบบ และคุณครูสามารถตรวจให้คะแนนได้แบบเรียลไทม์',
        descEn: 'Students submit homework online; teachers review, grade, and provide constructive feedback.'
      },
      {
        titleTh: 'ติดตามความก้าวหน้า (Progress Tracking)',
        titleEn: 'Student Completion Tracking',
        descTh: 'แสดงเปอร์เซ็นต์บทเรียนที่นักเรียนเรียนจบแล้วในแต่ละวิชา',
        descEn: 'Visual progress bar tracking lesson completion percentage for every student.'
      }
    ],
    steps: [
      {
        titleTh: '1. สลับไปที่โหมดห้องเรียนออนไลน์',
        titleEn: '1. Switch to Virtual LMS Mode',
        descTh: 'คลิกปุ่ม "ห้องเรียนออนไลน์ (LMS)" ตรงกลางของแถบเมนูด้านบน',
        descEn: 'Click the "Virtual LMS" button located in the center of the top navigation bar.'
      },
      {
        titleTh: '2. เลือกบทเรียนและเรียนรู้',
        titleEn: '2. Select Lesson & Study',
        descTh: 'เลือกวิชาที่ต้องการเรียน กดดูวิดีโอ อ่านเนื้อหา และกด "ทำเครื่องหมายว่าเรียนจบแล้ว"',
        descEn: 'Choose a course, watch video lectures, review notes, and click "Mark as Completed".'
      }
    ],
    tipsTh: [
      'คุณครูสามารถแนบลิงก์คลิปจาก YouTube หรือ Google Drive สื่อการสอนเข้ามาในระบบได้ทันที'
    ],
    tipsEn: [
      'Teachers can embed YouTube lessons, external docs, and slide presentations into chapters.'
    ]
  },
  {
    id: 'parent_portal',
    titleTh: 'พอร์ทัลผู้ปกครอง (Parent & Student Portal)',
    titleEn: 'Parent & Student Mobile Portal',
    category: 'sis',
    icon: Smartphone,
    roles: ['ผู้ปกครอง', 'นักเรียน'],
    summaryTh: 'มุมมองเฉพาะสำหรับผู้ปกครองและนักเรียน ติดตามเวลาเข้าแถว ดูผลการเรียน ชำระค่าเทอม และดาวน์โหลด ปพ.1',
    summaryEn: 'Dedicated self-service portal for parents to monitor attendance, view grades, pay fees, and download report cards.',
    features: [
      {
        titleTh: 'บันทึกเวลาเข้าโรงเรียนย้อนหลัง',
        titleEn: 'Attendance History',
        descTh: 'ตรวจสอบเวลาที่บุตรหลานแตะบัตรหรือสแกนเข้าโรงเรียนในแต่ละวันอย่างโปร่งใส',
        descEn: 'Transparent log of exact check-in times and status for their enrolled children.'
      },
      {
        titleTh: 'รายงานผลการเรียนรายวิชา',
        titleEn: 'Academic Grades Overview',
        descTh: 'ดูเกรดเฉลี่ยสะสม GPAX และผลการเรียนแต่ละวิชาพร้อมกดเปิดใบ ปพ.1 ทางการ',
        descEn: 'Check GPAX, individual course marks, and generate official bilingual transcripts.'
      },
      {
        titleTh: 'จ่ายค่าเทอมผ่าน PromptPay',
        titleEn: 'Direct PromptPay Payment',
        descTh: 'ดูยอดค้างชำระ กดแสดง QR Code เพื่อสแกนจ่ายผ่านแอปธนาคารได้ทันทีบนมือถือ',
        descEn: 'View unpaid tuition and open instant PromptPay QR codes for banking app checkouts.'
      }
    ],
    steps: [
      {
        titleTh: '1. สลับไปที่โหมดพอร์ทัลผู้ปกครอง',
        titleEn: '1. Switch to Parent Portal',
        descTh: 'คลิกปุ่ม "พอร์ทัลผู้ปกครอง" ตรงกลางของแถบเมนูด้านบน',
        descEn: 'Click "Parent Portal" in the center selector of the top navigation bar.'
      },
      {
        titleTh: '2. เลือกดูข้อมูลของบุตรหลาน',
        titleEn: '2. Review Child Data',
        descTh: 'สลับดูแท็บ ผลการเรียน, ประวัติการมาเรียน, และใบแจ้งหนี้ค่าเทอม',
        descEn: 'Toggle between Academic Marks, Attendance Records, and Tuition Bills.'
      }
    ],
    tipsTh: [
      'ผู้ปกครองสามารถทดลองเปลี่ยนบทบาทเป็น "ผู้ปกครอง" บน Navbar เพื่อสัมผัสการใช้งานจริงได้'
    ],
    tipsEn: [
      'Switch your role to "Parent" in the top navbar to see the portal exactly as parents experience it.'
    ]
  },
  {
    id: 'games',
    titleTh: 'สมรภูมิความรู้ 3D & 1v1 Battle (EduBattle 3D)',
    titleEn: 'EduBattle 3D Royale & 1v1 Academic Arena',
    category: 'game',
    icon: Gamepad2,
    roles: ['นักเรียน', 'ครูอาจารย์', 'ผู้บริหาร/แอดมิน'],
    summaryTh: 'เกมตอบคำถามวิชาการ 3D แบบ Battle Royale วงบีบสุดตื่นเต้น และสมรภูมิ 1v1 สะสมเหรียญ แลกไอเทมในร้านค้า',
    summaryEn: 'Full 3D Battle Royale educational arena with shrinking storm zone, bot AI, procedural audio, and reward shop.',
    features: [
      {
        titleTh: 'ห้องแล็บจำลองรายวิชา & เคมีระเบิด (Subject Lab Simulations)',
        titleEn: 'Interactive Subject Labs & Chemistry',
        descTh: 'จำลองการทดลองผสมสารเคมีจริงตามสูตร ปรุงไวยากรณ์ คำนวณวิถีจรวด และเขียนโค้ดหุ่นยนต์ ถ้าทำผิดห้องแล็บจะระเบิดตูมตามพร้อมเอฟเฟกต์เสียงสมจริงและคำอธิบายเฉลย',
        descEn: 'Mix chemical reagents, solve rocket trajectories, and code robots. Incorrect formulas trigger hilarious comic lab explosions!'
      },
      {
        titleTh: 'ระบบ 3D Battle Royale (Three.js Engine)',
        titleEn: 'Full 3D Battle Royale Engine',
        descTh: 'จำลองสนามรบ 3D ด้วย Three.js มีวงบีบ Safe Zone (Storm Ring), กล่องไอเทมดรอป, และบอทคู่แข่ง AI',
        descEn: 'Interactive 3D battle arena powered by Three.js with shrinking storm ring, loot chests, and bot AI.'
      },
      {
        titleTh: 'สังเวียนประลองความรู้ 1v1 (Arena)',
        titleEn: '1v1 Quiz Duels',
        descTh: 'ดวลตอบโจทย์ฝึกหัดตัวอย่าง วิทย์ คณิต และอังกฤษ เลือดลดเมื่อตอบผิด ชนะรับ EXP และ Coins',
        descEn: '1v1 academic quiz duels. Wrong answers deal HP damage; victories award coins and experience.'
      },
      {
        titleTh: 'คลังข้อสอบ & การนำเข้าข้อสอบ (Question Bank)',
        titleEn: 'Question Bank & JSON Import',
        descTh: 'คุณครูสามารถเพิ่มข้อสอบใหม่ หรือนำเข้าไฟล์ JSON ข้อสอบเข้ามาในระบบได้ไม่จำกัด',
        descEn: 'Teachers can manage, filter by subject, and import/export questions via JSON.'
      },
      {
        titleTh: 'ร้านค้าไอเทม & สกินตัวละคร (Reward Shop)',
        titleEn: 'School Reward Shop',
        descTh: 'นำเหรียญที่ได้จากการตอบคำถามถูกไปแลกรางวัลจริง เช่น ปากกา, สมุด, หรือสกินตัวละครในเกม',
        descEn: 'Redeem earned coins and gems for school supplies, stationery, or custom avatars.'
      }
    ],
    steps: [
      {
        titleTh: '1. เข้าสู่หน้าเกม',
        titleEn: '1. Enter the Game',
        descTh: 'คลิกปุ่ม "สมรภูมิความรู้ (เกม 3D)" บนเมนูด้านซ้าย หรือปุ่มสีทองบนมือถือ',
        descEn: 'Click the Game tab in the sidebar or golden button on mobile.'
      },
      {
        titleTh: '2. เล่นในโหมดเต็มจอเฉพาะหน้าเกม',
        titleEn: '2. Dedicated Fullscreen Game View',
        descTh: 'หน้าจอจะสลับเข้าสู่หน้าเกมโดยเฉพาะ ปราศจากสิ่งรบกวน เมื่อเล่นเสร็จกดปุ่ม "ออกจากเกม" เพื่อกลับสู่โรงเรียน',
        descEn: 'The view shifts into an exclusive, distraction-free game arena with a quick exit button to return.'
      }
    ],
    tipsTh: [
      'หน้าเกมถูกออกแบบให้แสดงเฉพาะตอนเล่นเท่านั้น ไม่ปะปนกับหน้าอื่นๆ ของโรงเรียน เพื่อความรวดเร็วและสมาธิในการเล่น'
    ],
    tipsEn: [
      'The 3D game runs exclusively on its own dedicated view, keeping all other school modules ultra-fast.'
    ]
  },
  {
    id: 'integrations',
    titleTh: 'การเชื่อมต่อระบบ & สถาปัตยกรรม (System Integrations)',
    titleEn: 'System Architecture & Cloud Integrations',
    category: 'sis',
    icon: Cpu,
    roles: ['ผู้บริหาร/แอดมิน'],
    summaryTh: 'ตรวจสอบสถานะเชื่อมต่อ Supabase PostgreSQL, นำขึ้นโฮสต์ Render.com, LINE Developers API, Resend, และ Redis',
    summaryEn: 'Diagnostics and setup for Supabase PostgreSQL, Render.com hosting, LINE OA Webhooks, Resend, and Redis cache.',
    features: [
      {
        titleTh: 'Supabase PostgreSQL & Auto-Sync',
        titleEn: 'Supabase Database & Sync',
        descTh: 'เชื่อมโยงฐานข้อมูลจริง, คัดลอก SQL Schema ไปรันใน Supabase, และกดปุ่ม Sync โคลนข้อมูลนักเรียนเข้าตารางจริง',
        descEn: 'Live PostgreSQL connection, one-click schema copy, and full database synchronization.'
      },
      {
        titleTh: 'Render.com Deployment Ready',
        titleEn: 'Render.com Blueprint',
        descTh: 'มีไฟล์ render.yaml และ public/_redirects พร้อมขึ้นเว็บจริงบน Render ได้ฟรี มี SSL และไม่มีปัญหา 404',
        descEn: 'Configured with render.yaml and public/_redirects for instant, error-free Render.com deployments.'
      },
      {
        titleTh: 'LINE Messaging & Webhook Diagnostics',
        titleEn: 'LINE API Diagnostics',
        descTh: 'ทดสอบการยิง Webhook แจ้งเตือน และตรวจสอบ Channel ID ของ LINE Official Account',
        descEn: 'Test webhook connectivity and verify LINE Login and Messaging API channel status.'
      }
    ],
    steps: [
      {
        titleTh: '1. ตรวจสอบการเชื่อมต่อ',
        titleEn: '1. Run Diagnostics',
        descTh: 'กดปุ่ม "Run Full Health Check" เพื่อทดสอบความพร้อมของทุกระบบภายนอก',
        descEn: 'Click "Run Full Health Check" to ping all external APIs and database endpoints.'
      },
      {
        titleTh: '2. จัดการฐานข้อมูล Supabase',
        titleEn: '2. Manage Supabase Credentials',
        descTh: 'คลิกปุ่ม "จัดการ Supabase & Render" เพื่อกรอก API Key และกด Sync ข้อมูลทั้งหมด',
        descEn: 'Click "Supabase & Render Hub" to manage credentials and seed all school records.'
      }
    ],
    tipsTh: [
      'หากเจอรหัสข้อผิดพลาด PGRST205 แสดงว่าเชื่อมต่อได้แล้วแต่ยังไม่ได้รัน SQL Schema ให้กดปุ่มคัดลอก SQL ไปวางใน Supabase'
    ],
    tipsEn: [
      'PGRST205 error indicates successful connection but missing tables; simply paste the provided SQL schema in Supabase.'
    ]
  }
];

export const ModuleGuideModal: React.FC<ModuleGuideModalProps> = ({
  initialModule = 'dashboard',
  lang,
  currentRole,
  onClose,
  onNavigateToModule
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<GuideModuleId>(initialModule);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuides = MODULE_GUIDES.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.titleTh.toLowerCase().includes(q) ||
      g.titleEn.toLowerCase().includes(q) ||
      g.summaryTh.toLowerCase().includes(q) ||
      g.summaryEn.toLowerCase().includes(q)
    );
  });

  const activeGuide = MODULE_GUIDES.find(g => g.id === selectedModuleId) || MODULE_GUIDES[0];
  const ActiveIcon = activeGuide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-cyan-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {lang === 'th' ? 'คู่มือแนะนำวิธีใช้งานทุกโมดูล' : 'EduVerse Master User Guide'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {MODULE_GUIDES.length} {lang === 'th' ? 'ฟังก์ชัน' : 'Modules'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'th' 
                  ? 'คำแนะนำการใช้งานอย่างละเอียด ขั้นตอนทีละสเต็ป และคีย์ลัดสำหรับทุกฟังก์ชันในระบบ'
                  : 'Step-by-step walkthroughs, key capabilities, role permissions, and tips for every system module.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body with Left Module Navigator and Right Details */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Module Selector List */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
            {/* Search filter */}
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'th' ? 'ค้นหาคู่มือโมดูล...' : 'Search module guide...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredGuides.map((guide) => {
                const IconComponent = guide.icon;
                const isSelected = guide.id === selectedModuleId;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setSelectedModuleId(guide.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/20 text-white font-bold border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">
                        {lang === 'th' ? guide.titleTh.split('(')[0].trim() : guide.titleEn.split('&')[0].trim()}
                      </span>
                    </div>
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Guide Info */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* Module Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <ActiveIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {lang === 'th' ? activeGuide.titleTh : activeGuide.titleEn}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {lang === 'th' ? activeGuide.summaryTh : activeGuide.summaryEn}
                  </p>
                </div>
              </div>

              {onNavigateToModule && (
                <button
                  onClick={() => {
                    onNavigateToModule(activeGuide.id);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md transition-all self-start sm:self-auto"
                >
                  <span>{lang === 'th' ? 'ไปที่โมดูลนี้' : 'Open Module'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Applicable Roles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'th' ? 'ผู้มีสิทธิ์ใช้งาน:' : 'Applicable Roles:'}</span>
              </span>
              {activeGuide.roles.map((role) => (
                <span
                  key={role}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium"
                >
                  {role}
                </span>
              ))}
            </div>

            {/* Key Capabilities / Features */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'th' ? 'ฟังก์ชันเด่น & ขีดความสามารถหลัก' : 'Key Capabilities'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeGuide.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{lang === 'th' ? feat.titleTh : feat.titleEn}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {lang === 'th' ? feat.descTh : feat.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'th' ? 'ขั้นตอนการใช้งานทีละสเต็ป (Step-by-Step)' : 'How to Use'}</span>
              </h4>

              <div className="space-y-2">
                {activeGuide.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">
                        {lang === 'th' ? step.titleTh : step.titleEn}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {lang === 'th' ? step.descTh : step.descEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tips & Best Practices */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-900 border border-amber-500/30 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{lang === 'th' ? 'เคล็ดลับ & คำแนะนำพิเศษ (Pro Tips)' : 'Pro Tips & Recommendations'}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 pl-5 list-disc">
                {(lang === 'th' ? activeGuide.tipsTh : activeGuide.tipsEn).map((tip, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>EduVerse Enterprise School &amp; Learning Operating System</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            {lang === 'th' ? 'ปิดคู่มือ' : 'Close Guide'}
          </button>
        </div>

      </div>
    </div>
  );
};
