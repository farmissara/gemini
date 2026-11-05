import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  QrCode, 
  Award, 
  Receipt, 
  BellRing, 
  Cpu,
  Sparkles,
  Swords,
  Smartphone,
  FolderGit2,
  Database,
  Calendar,
  HeartHandshake,
  CreditCard,
  HeartPulse,
  FileCheck2
} from 'lucide-react';
import { UserRole, AppLanguage } from '../types';

export type NavTab = 
  | 'dashboard' 
  | 'students' 
  | 'courses' 
  | 'timetable'
  | 'homework'
  | 'attendance' 
  | 'mobile_checkin'
  | 'behavior_sdq'
  | 'student_id_cards'
  | 'infirmary'
  | 'games'
  | 'portfolio'
  | 'gradebook' 
  | 'billing' 
  | 'announcements' 
  | 'integrations'
  | 'supabase_studio';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  currentRole: UserRole;
  studentsCount: number;
  coursesCount: number;
  lang: AppLanguage;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  studentsCount,
  coursesCount,
  lang,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      labelTh: 'แดชบอร์ดภาพรวม',
      labelEn: 'Dashboard Overview',
      icon: LayoutDashboard,
      badge: null,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'students' as NavTab,
      labelTh: 'ทะเบียนประวัตินักเรียน',
      labelEn: 'Student Directory',
      icon: Users,
      badge: studentsCount.toString(),
      roles: ['admin', 'teacher']
    },
    {
      id: 'courses' as NavTab,
      labelTh: 'รายวิชาและหลักสูตร',
      labelEn: 'Courses & Classes',
      icon: BookOpen,
      badge: coursesCount.toString(),
      roles: ['admin', 'teacher', 'student']
    },
    {
      id: 'timetable' as NavTab,
      labelTh: 'ตารางเรียน & ตารางสอน',
      labelEn: 'Timetable & Schedule',
      icon: Calendar,
      badge: 'Auto',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'homework' as NavTab,
      labelTh: 'การบ้าน & ติดตามงาน',
      labelEn: 'Homework & Tasks',
      icon: FileCheck2,
      badge: 'LMS',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'attendance' as NavTab,
      labelTh: 'เช็คชื่อเข้าเรียน & สแกน QR',
      labelEn: 'Daily Attendance & QR',
      icon: QrCode,
      badge: lang === 'th' ? 'สด' : 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'mobile_checkin' as NavTab,
      labelTh: 'เช็คชื่อมือถือ & รายคาบ',
      labelEn: 'Mobile & Period Check-in',
      icon: Smartphone,
      badge: 'GPS',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'student_id_cards' as NavTab,
      labelTh: 'บัตรนักเรียนดิจิทัล & QR',
      labelEn: 'Digital Student ID',
      icon: CreditCard,
      badge: 'NFC',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'behavior_sdq' as NavTab,
      labelTh: 'ความประพฤติ & SDQ',
      labelEn: 'Behavior & SDQ',
      icon: HeartHandshake,
      badge: 'สพฐ.',
      badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      roles: ['admin', 'teacher', 'parent']
    },
    {
      id: 'infirmary' as NavTab,
      labelTh: 'ห้องพยาบาล & สุขภาพ',
      labelEn: 'Infirmary & Health',
      icon: HeartPulse,
      badge: 'FirstAid',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'games' as NavTab,
      labelTh: 'เกม & คลังข้อสอบ O-NET',
      labelEn: 'EduBattle & O-NET',
      icon: Swords,
      badge: '1v1 Battle',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'portfolio' as NavTab,
      labelTh: 'แฟ้มผลงาน Portfolio (TCAS/PA)',
      labelEn: 'Digital Portfolio',
      icon: FolderGit2,
      badge: 'TCAS',
      badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'gradebook' as NavTab,
      labelTh: 'บันทึกคะแนน & ปพ.1',
      labelEn: 'Gradebook & Transcripts',
      icon: Award,
      badge: null,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'billing' as NavTab,
      labelTh: 'การเงิน & ค่าเทอมพร้อมเพย์',
      labelEn: 'Tuition & PromptPay',
      icon: Receipt,
      badge: null,
      roles: ['admin', 'parent']
    },
    {
      id: 'announcements' as NavTab,
      labelTh: 'ข่าวสาร & LINE บรอดแคสต์',
      labelEn: 'Announcements & LINE',
      icon: BellRing,
      badge: 'LINE OA',
      badgeColor: 'bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/30',
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'integrations' as NavTab,
      labelTh: 'การเชื่อมต่อระบบ & สถาปัตยกรรม',
      labelEn: 'System Architecture',
      icon: Cpu,
      badge: 'API',
      roles: ['admin']
    },
    {
      id: 'supabase_studio' as NavTab,
      labelTh: 'Supabase Studio (SQL & ตาราง)',
      labelEn: 'Supabase Studio',
      icon: Database,
      badge: 'SQL',
      badgeColor: 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30',
      roles: ['admin', 'teacher']
    },
  ];

  const filteredNav = navItems.filter(item => currentRole === 'super_admin' || item.roles.includes(currentRole));

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            {lang === 'th' ? 'เมนูระบบบริหารงาน' : 'Main Navigation'}
          </p>
          <nav className="space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const label = lang === 'th' ? item.labelTh : item.labelEn;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <span>{label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive 
                        ? 'bg-indigo-900/60 text-indigo-200' 
                        : item.badgeColor || 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Current Role Card */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {lang === 'th' ? 'สิทธิ์ผู้ใช้งาน' : 'Current View'}
            </span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
              currentRole === 'super_admin'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}>
              {lang === 'th' 
                ? currentRole === 'super_admin' ? '👑 Super Admin' : currentRole === 'admin' ? 'ผู้ดูแลระบบ' : currentRole === 'teacher' ? 'อาจารย์' : currentRole === 'student' ? 'นักเรียน' : 'ผู้ปกครอง'
                : currentRole}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'th'
              ? currentRole === 'super_admin'
                ? 'สิทธิ์ Super Admin แม่ข่าย: ควบคุมทุกฟังก์ชัน, จัดการข้อมูลแม่ข่าย, Backup และเชื่อมต่อ Cloud'
                : currentRole === 'admin'
                ? 'สิทธิ์แอดมินโรงเรียน: จัดการข้อมูลนักเรียน, การเงิน, LINE OA และฐานข้อมูล'
                : currentRole === 'teacher'
                ? 'จัดการชั้นเรียน, บันทึกคะแนน และเช็คชื่อการเข้าเรียน'
                : currentRole === 'student'
                ? 'ดูตารางเรียน, ผลการประเมินเกรด และสถิติการเข้าเรียน'
                : 'ตรวจสอบเวลาเข้า-ออกโรงเรียนของบุตรหลาน และใบแจ้งหนี้ค่าเทอม'
              : currentRole === 'super_admin'
              ? 'Master Super Admin: full unrestricted authority across all subsystems & databases.'
              : currentRole === 'admin'
              ? 'School Administrator: students, tuition, LINE bot & database.'
              : currentRole === 'teacher'
              ? 'Class management, attendance taking, gradebook input.'
              : currentRole === 'student'
              ? 'View enrolled courses, transcript grades, and attendance.'
              : 'Monitor child check-in, tuition invoices, and LINE notices.'}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>EduVerse Thai Edition</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
          </span>
        </div>
        <p className="truncate text-slate-400">School ERP &amp; LMS Cloud</p>
      </div>
    </aside>
  );
};
