import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  QrCode, 
  Award, 
  Receipt, 
  BellRing, 
  Swords, 
  Smartphone, 
  FolderGit2, 
  Calendar, 
  HeartHandshake, 
  CreditCard, 
  HeartPulse, 
  FileCheck2,
  LucideIcon
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
  | 'announcements';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  currentRole: UserRole;
  studentsCount: number;
  coursesCount: number;
  lang: AppLanguage;
}

interface NavItemDef {
  id: NavTab;
  labelTh: string;
  labelEn: string;
  icon: LucideIcon;
  badge?: string | null;
  roles: UserRole[];
}

interface NavGroupDef {
  groupTitleTh: string;
  groupTitleEn: string;
  items: NavItemDef[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  studentsCount,
  coursesCount,
  lang,
}) => {
  const navGroups: NavGroupDef[] = [
    {
      groupTitleTh: 'วิชาการ & ทะเบียน',
      groupTitleEn: 'Academics & Directory',
      items: [
        {
          id: 'dashboard',
          labelTh: 'แดชบอร์ดภาพรวม',
          labelEn: 'Dashboard Overview',
          icon: LayoutDashboard,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'students',
          labelTh: 'ทะเบียนนักเรียน',
          labelEn: 'Student Directory',
          icon: Users,
          badge: studentsCount > 0 ? studentsCount.toString() : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'courses',
          labelTh: 'รายวิชาและหลักสูตร',
          labelEn: 'Courses & Curriculum',
          icon: BookOpen,
          badge: coursesCount > 0 ? coursesCount.toString() : null,
          roles: ['super_admin', 'admin', 'teacher', 'student'],
        },
        {
          id: 'timetable',
          labelTh: 'ตารางเรียน & ตารางสอน',
          labelEn: 'Timetable & Schedule',
          icon: Calendar,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'gradebook',
          labelTh: 'บันทึกคะแนน & ปพ.1',
          labelEn: 'Gradebook & Transcripts',
          icon: Award,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    },
    {
      groupTitleTh: 'กิจการนักเรียน & สุขภาพ',
      groupTitleEn: 'Student Care & Health',
      items: [
        {
          id: 'attendance',
          labelTh: 'เช็คชื่อเข้าเรียน (QR)',
          labelEn: 'Daily Attendance (QR)',
          icon: QrCode,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'mobile_checkin',
          labelTh: 'เช็คชื่อรายคาบ',
          labelEn: 'Period Attendance',
          icon: Smartphone,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'student_id_cards',
          labelTh: 'บัตรนักเรียนดิจิทัล',
          labelEn: 'Digital Student ID',
          icon: CreditCard,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'behavior_sdq',
          labelTh: 'ความประพฤติ & SDQ',
          labelEn: 'Behavior & SDQ',
          icon: HeartHandshake,
          roles: ['super_admin', 'admin', 'teacher', 'parent'],
        },
        {
          id: 'infirmary',
          labelTh: 'ห้องพยาบาล & สุขภาพ',
          labelEn: 'Infirmary & Health',
          icon: HeartPulse,
          roles: ['super_admin', 'admin', 'teacher', 'parent', 'student'],
        },
      ],
    },
    {
      groupTitleTh: 'การเรียนรู้ & กิจกรรม',
      groupTitleEn: 'Learning & Activities',
      items: [
        {
          id: 'homework',
          labelTh: 'การบ้าน & ตรวจงาน',
          labelEn: 'Homework & Tasks',
          icon: FileCheck2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'portfolio',
          labelTh: 'แฟ้มผลงาน Portfolio',
          labelEn: 'Digital Portfolio',
          icon: FolderGit2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'games',
          labelTh: 'คลังข้อสอบ O-NET Battle',
          labelEn: 'EduBattle Quiz',
          icon: Swords,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'announcements',
          labelTh: 'ข่าวสาร & ประกาศ',
          labelEn: 'Announcements',
          icon: BellRing,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    },
    {
      groupTitleTh: 'การเงินโรงเรียน',
      groupTitleEn: 'School Finance',
      items: [
        {
          id: 'billing',
          labelTh: 'ค่าเทอม & ใบเสร็จ',
          labelEn: 'Tuition & Invoices',
          icon: Receipt,
          roles: ['super_admin', 'admin', 'parent'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 select-none">
      <div className="p-3.5 space-y-5 overflow-y-auto max-h-[calc(100vh-64px)]">
        {navGroups.map((group, gIdx) => {
          // Filter items by role
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(currentRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {lang === 'th' ? group.groupTitleTh : group.groupTitleEn}
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                        <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
        <span>EduVerse SIS • 2569</span>
      </div>
    </aside>
  );
};
