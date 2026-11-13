import React, { useState, useEffect, useMemo } from 'react';
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
  SlidersHorizontal,
  ShieldCheck,
  GraduationCap,
  MessageSquare,
  FlaskConical,
  BrainCircuit,
  Trophy,
  ShieldAlert,
  Flame,
  Camera,
  Sparkles,
  MapPin,
  Search,
  Layers,
  Monitor,
  Mail,
  ChevronDown,
  ChevronRight,
  Pin,
  LucideIcon
} from 'lucide-react';
import { UserRole, AppLanguage } from '../../types';

export type NavTab = 
  | 'super_admin_console'
  | 'school_permissions'
  | 'system_settings'
  | 'school_gps'
  | 'executive_warning'
  | 'executive_monitor'
  | 'admin_superadmin_desk'
  | 'dashboard' 
  | 'students' 
  | 'teachers'
  | 'courses' 
  | 'timetable'
  | 'homework'
  | 'study_streak'
  | 'socratic_tutor'
  | 'realworld_quests'
  | 'ai_diagnostic'
  | 'attendance' 
  | 'mobile_checkin'
  | 'behavior_sdq'
  | 'student_id_cards'
  | 'infirmary'
  | 'subject_labs'
  | 'games'
  | 'boss_raid'
  | 'hall_of_fame'
  | 'portfolio'
  | 'gradebook' 
  | 'central_exam_hub'
  | 'billing' 
  | 'announcements';

export type NavCategoryId = 
  | 'super_admin'
  | 'academics'
  | 'student_care'
  | 'innovation'
  | 'administration'
  | 'finance';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  studentsCount: number;
  coursesCount: number;
  teachersCount?: number;
  coordinationUnreadCount?: number;
  unclaimedCentralPacksCount?: number;
  lang: AppLanguage;
}

export interface NavItemDef {
  id: NavTab;
  labelTh: string;
  labelEn: string;
  icon: LucideIcon;
  badge?: string | null;
  roles: UserRole[];
}

export interface NavCategoryDef {
  id: NavCategoryId;
  labelTh: string;
  labelEn: string;
  shortLabelTh: string;
  shortLabelEn: string;
  icon: LucideIcon;
  badge?: string;
  items: NavItemDef[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  isSuperAdminSchoolView,
  studentsCount,
  coursesCount,
  teachersCount = 0,
  coordinationUnreadCount = 0,
  unclaimedCentralPacksCount = 0,
  lang,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Master Categories Definition
  const categories: NavCategoryDef[] = useMemo(() => {
    const list: NavCategoryDef[] = [];

    // Category 0: Super Admin Console
    if (currentRole === 'super_admin') {
      list.push({
        id: 'super_admin',
        labelTh: 'ศูนย์ควบคุมแม่ข่าย',
        labelEn: 'Master Console',
        shortLabelTh: 'แม่ข่าย',
        shortLabelEn: 'Master',
        icon: ShieldCheck,
        badge: 'MASTER',
        items: [
          {
            id: 'super_admin_console',
            labelTh: isSuperAdminSchoolView ? 'กลับศูนย์ควบคุมแม่ข่าย' : 'ศูนย์ควบคุมระบบแม่ข่าย',
            labelEn: isSuperAdminSchoolView ? 'Back to Control Center' : 'System Control Center',
            icon: ShieldCheck,
            badge: 'MASTER',
            roles: ['super_admin'],
          },
          {
            id: 'admin_superadmin_desk',
            labelTh: 'แชต/จดหมายประสานงานโรงเรียน',
            labelEn: 'School Urgent Desk',
            icon: Mail,
            badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : 'INBOX',
            roles: ['super_admin'],
          },
        ],
      });
    }

    // Category 1: Academics & Directory
    list.push({
      id: 'academics',
      labelTh: 'วิชาการ & ทะเบียน',
      labelEn: 'Academics & Directory',
      shortLabelTh: 'วิชาการ',
      shortLabelEn: 'Academics',
      icon: GraduationCap,
      items: [
        {
          id: 'dashboard',
          labelTh: 'แดชบอร์ดภาพรวม',
          labelEn: 'Dashboard Overview',
          icon: LayoutDashboard,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'executive_monitor',
          labelTh: 'แดชบอร์ดผู้บริหาร / มอนิเตอร์',
          labelEn: 'Director Monitor',
          icon: Monitor,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'students',
          labelTh: 'ทะเบียนนักเรียน',
          labelEn: 'Student Directory',
          icon: Users,
          badge: studentsCount > 0 ? `${studentsCount}` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'teachers',
          labelTh: 'บุคลากร & คุณครู',
          labelEn: 'Faculty & Staff',
          icon: GraduationCap,
          badge: teachersCount > 0 ? `${teachersCount}` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'courses',
          labelTh: 'รายวิชา & หลักสูตร',
          labelEn: 'Courses & Curriculum',
          icon: BookOpen,
          badge: coursesCount > 0 ? `${coursesCount}` : null,
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
          labelTh: 'บันทึกคะแนน & ทะเบียนผลการเรียน',
          labelEn: 'Grading & Academic Records',
          icon: Award,
          roles: ['super_admin', 'admin', 'teacher'],
        },
      ],
    });

    // Category 2: Student Care & Health
    list.push({
      id: 'student_care',
      labelTh: 'กิจการนักเรียน & สุขภาพ',
      labelEn: 'Student Care & Health',
      shortLabelTh: 'กิจการ',
      shortLabelEn: 'Care',
      icon: HeartPulse,
      items: [
        {
          id: 'attendance',
          labelTh: 'ระบบสแกนเช็กชื่อหน้าประตู',
          labelEn: 'Gate QR Check-in',
          icon: QrCode,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'mobile_checkin',
          labelTh: 'เช็กชื่อเข้าเรียนผ่านมือถือ',
          labelEn: 'Mobile Check-in',
          icon: Smartphone,
          roles: ['super_admin', 'admin', 'teacher', 'student'],
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
          labelTh: 'ระบบดูแลช่วยเหลือนักเรียน & SDQ',
          labelEn: 'Student Care & SDQ',
          icon: HeartHandshake,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'infirmary',
          labelTh: 'ห้องพยาบาล & เวชระเบียน',
          labelEn: 'Infirmary Clinic',
          icon: HeartPulse,
          roles: ['super_admin', 'admin', 'teacher'],
        },
      ],
    });

    // Category 3: Learning & Innovation
    list.push({
      id: 'innovation',
      labelTh: 'นวัตกรรม & การเรียนรู้',
      labelEn: 'Learning & Innovation',
      shortLabelTh: 'การเรียนรู้',
      shortLabelEn: 'Learning',
      icon: Sparkles,
      items: [
        {
          id: 'homework',
          labelTh: 'การบ้าน & ภาระงาน',
          labelEn: 'Homework & Tasks',
          icon: FileCheck2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'portfolio',
          labelTh: 'แฟ้มผลงานดิจิทัล',
          labelEn: 'Digital Portfolio',
          icon: FolderGit2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'study_streak',
          labelTh: 'สตรีคประจำวัน & ภารกิจการเรียน',
          labelEn: 'Daily Study Streak',
          icon: Flame,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'socratic_tutor',
          labelTh: 'ติวเตอร์ปัญญาประดิษฐ์',
          labelEn: 'AI Socratic Tutor',
          icon: Sparkles,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'realworld_quests',
          labelTh: 'เควสต์การเรียนรู้จากภาพถ่าย',
          labelEn: 'Real-World Visual Quests',
          icon: Camera,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'boss_raid',
          labelTh: 'ภารกิจแก้โจทย์ท้าทายกลุ่ม',
          labelEn: 'Co-op Challenge Quest',
          icon: Swords,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'ai_diagnostic',
          labelTh: 'วิเคราะห์ทักษะ & เสริมจุดแข็ง',
          labelEn: 'Skill Diagnostics',
          icon: BrainCircuit,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'subject_labs',
          labelTh: 'ห้องปฏิบัติการเสมือนจริง',
          labelEn: 'Virtual Subject Labs',
          icon: FlaskConical,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'games',
          labelTh: 'เกมการเรียนรู้ฝึกสมอง',
          labelEn: 'Educational Arcade',
          icon: Swords,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'central_exam_hub',
          labelTh: 'คลังข้อสอบกลางมาตรฐาน',
          labelEn: 'Central Exam Hub',
          icon: BookOpen,
          badge: unclaimedCentralPacksCount > 0 ? `${unclaimedCentralPacksCount} ใหม่` : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'hall_of_fame',
          labelTh: 'หอเกียรติยศ & เกียรติบัตร',
          labelEn: 'Hall of Fame & Certs',
          icon: Trophy,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    // Category 4: Administration & GPS Settings
    list.push({
      id: 'administration',
      labelTh: 'การบริหารจัดการ & ระบบ',
      labelEn: 'Administration & System',
      shortLabelTh: 'การบริหาร',
      shortLabelEn: 'Admin',
      icon: SlidersHorizontal,
      items: [
        {
          id: 'school_gps',
          labelTh: 'ตั้งค่าพิกัด GPS โรงเรียน',
          labelEn: 'School GPS Coordinates',
          icon: MapPin,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'executive_warning',
          labelTh: 'ระบบพยากรณ์ความเสี่ยง',
          labelEn: 'Early Warning Analytics',
          icon: ShieldAlert,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'school_permissions',
          labelTh: 'กำหนดสิทธิ์บทบาทในโรงเรียน',
          labelEn: 'School Role Permissions',
          icon: SlidersHorizontal,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'admin_superadmin_desk',
          labelTh: 'จดหมายประสานงานส่วนกลาง',
          labelEn: 'Admin Desk',
          icon: Mail,
          badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : null,
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'system_settings',
          labelTh: 'ตั้งค่าระบบ & การแจ้งเตือน',
          labelEn: 'System Settings',
          icon: MessageSquare,
          roles: ['super_admin', 'admin'],
        },
      ],
    });

    // Category 5: Finance & Announcements
    list.push({
      id: 'finance',
      labelTh: 'การเงิน & การสื่อสาร',
      labelEn: 'Finance & News',
      shortLabelTh: 'การเงิน',
      shortLabelEn: 'Finance',
      icon: Receipt,
      items: [
        {
          id: 'billing',
          labelTh: 'ค่าเทอม & ใบเสร็จรับเงิน',
          labelEn: 'Tuition & Invoices',
          icon: Receipt,
          roles: ['super_admin', 'admin', 'parent'],
        },
        {
          id: 'announcements',
          labelTh: 'ข่าวสาร & ประกาศโรงเรียน',
          labelEn: 'Announcements & News',
          icon: BellRing,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    return list;
  }, [currentRole, isSuperAdminSchoolView, studentsCount, teachersCount, coursesCount]);

  // Search filtered items across all categories
  const searchResults = useMemo(() => {
    if (!searchFilter.trim()) return [];
    const query = searchFilter.toLowerCase().trim();
    const results: NavItemDef[] = [];
    categories.forEach(cat => {
      cat.items.forEach(item => {
        if (!item.roles.includes(currentRole)) return;
        if (
          item.labelTh.toLowerCase().includes(query) ||
          item.labelEn.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        ) {
          results.push(item);
        }
      });
    });
    return results;
  }, [searchFilter, categories, currentRole]);

  const activeCatId = categories.find(c => c.items.some(i => i.id === currentTab))?.id;
  useEffect(() => {
    if (activeCatId) setCollapsed(prev => ({ ...prev, [activeCatId]: false }));
  }, [activeCatId]);

  const pinned = useMemo(() => {
    const ids: NavTab[] = currentRole === 'student'
      ? ['dashboard', 'mobile_checkin', 'homework', 'courses']
      : currentRole === 'parent'
      ? ['dashboard', 'student_id_cards', 'billing', 'announcements']
      : ['dashboard', 'attendance', 'students', 'gradebook'];
    const all = categories.flatMap(c => c.items);
    return ids
      .map(id => all.find(i => i.id === id && i.roles.includes(currentRole)))
      .filter((i): i is NavItemDef => Boolean(i));
  }, [categories, currentRole]);

  const toneOf = (id: NavTab) => {
    const idx = categories.findIndex(c => c.items.some(i => i.id === id));
    return `tone-${(Math.max(idx, 0) % 6) + 1}`;
  };
  const pinnedIds = new Set(pinned.map(p => p.id));

  const renderItem = (item: NavItemDef, onClick?: () => void) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    const tone = toneOf(item.id);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => { setCurrentTab(item.id); onClick?.(); }}
        className={`${tone} w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[12.5px] transition cursor-pointer ${
          isActive
            ? 'tone-active font-semibold'
            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
        }`}
      >
        <span className="flex items-center gap-2.5 truncate">
          <span className="tone-chip w-6 h-6 rounded-md"><Icon className="w-3.5 h-3.5" /></span>
          <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
        </span>
        {item.badge && !/^\d+$/.test(String(item.badge)) && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full tone-chip font-semibold">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden">
      <div className="shrink-0 p-3 border-b border-[var(--color-border)]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาเมนู...' : 'Search menu...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-7 py-2 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {searchFilter && (
            <button type="button" onClick={() => setSearchFilter('')} aria-label="clear"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer">✕</button>
          )}
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {searchFilter.trim() ? (
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {lang === 'th' ? `ผลการค้นหา (${searchResults.length})` : `Results (${searchResults.length})`}
            </div>
            {searchResults.length === 0
              ? <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">{lang === 'th' ? 'ไม่พบเมนู' : 'No menus found'}</div>
              : searchResults.map(item => renderItem(item, () => setSearchFilter('')))}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  <Pin className="w-3 h-3" />{lang === 'th' ? 'ใช้บ่อย' : 'Favorites'}
                </div>
                {pinned.map(item => renderItem(item))}
              </div>
            )}
            {categories.map((cat, catIdx) => {
              const items = cat.items.filter(i => i.roles.includes(currentRole) && !pinnedIds.has(i.id));
              if (items.length === 0) return null;
              const isCollapsed = collapsed[cat.id] ?? cat.id !== activeCatId;
              return (
                <div key={cat.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setCollapsed(prev => ({ ...prev, [cat.id]: !isCollapsed }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                  >
                    <span className={`tone-${(catIdx % 6) + 1} flex items-center gap-2 truncate`}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--tone)' }} /><span className="truncate">{lang === 'th' ? cat.labelTh : cat.labelEn}</span></span>
                    <span className="flex items-center gap-1.5">
                      {cat.badge && <span className="normal-case text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)]">{cat.badge}</span>}
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  {!isCollapsed && items.map(item => renderItem(item))}
                </div>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
};
