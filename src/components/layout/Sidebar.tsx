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
  PanelLeftClose,
  PanelLeftOpen,
  Coffee,
  LucideIcon
} from 'lucide-react';
import { UserRole, AppLanguage, SchoolFeatureFlags } from '../../types';
import { isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleTone, getCategoryTone } from '../../lib/moduleTheme';

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
  featureFlags?: SchoolFeatureFlags;
  lang: AppLanguage;
  desktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
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

const FOCUS_TEACHER_TABS = new Set<NavTab>([
  'dashboard',
  'attendance',
  'mobile_checkin',
  'homework',
  'gradebook',
  'timetable',
  'students',
  'behavior_sdq',
  'announcements',
]);

const SIDEBAR_FOCUS_STORAGE_KEY = 'baanpakkru_sidebar_focus_mode';

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
  featureFlags,
  lang,
  desktopCollapsed = false,
  onToggleDesktopCollapse,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const supportsFocusMode = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (!supportsFocusMode) return false;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(SIDEBAR_FOCUS_STORAGE_KEY);
      if (saved === '1') return true;
      if (saved === '0') return false;
    }
    return currentRole === 'teacher';
  });

  useEffect(() => {
    if (!supportsFocusMode) {
      setFocusMode(false);
      return;
    }
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(SIDEBAR_FOCUS_STORAGE_KEY);
      if (saved === '1') setFocusMode(true);
      else if (saved === '0') setFocusMode(false);
      else setFocusMode(currentRole === 'teacher');
    }
  }, [currentRole, supportsFocusMode]);

  const toggleFocusMode = () => {
    setFocusMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(SIDEBAR_FOCUS_STORAGE_KEY, next ? '1' : '0');
        } catch {
          // ignore storage failure
        }
      }
      return next;
    });
  };

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
        items: [
          {
            id: 'super_admin_console',
            labelTh: isSuperAdminSchoolView ? 'กลับศูนย์ควบคุมแม่ข่าย' : 'ศูนย์ควบคุมระบบแม่ข่าย',
            labelEn: isSuperAdminSchoolView ? 'Back to Control Center' : 'System Control Center',
            icon: ShieldCheck,
            roles: ['super_admin'],
          },
          {
            id: 'admin_superadmin_desk',
            labelTh: 'แชต/จดหมายประสานงานโรงเรียน',
            labelEn: 'School Urgent Desk',
            icon: Mail,
            badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : null,
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
          labelTh: 'บุคลากรและครู',
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
          labelTh: 'ระบบสแกนเช็คชื่อหน้าประตู',
          labelEn: 'Gate QR Check-in',
          icon: QrCode,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'mobile_checkin',
          labelTh: 'เช็คชื่อเข้าเรียนผ่านมือถือ',
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
          roles: ['admin'],
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
        if (!isTabEnabledByFeatureFlags(item.id, featureFlags)) return;
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
  }, [searchFilter, categories, currentRole, featureFlags]);

  const activeCatId = categories.find(c => c.items.some(i => i.id === currentTab))?.id;
  useEffect(() => {
    if (activeCatId) {
      setCollapsed(Object.fromEntries(categories.map((category) => [category.id, category.id !== activeCatId])));
    }
  }, [activeCatId, categories]);

  const pinned = useMemo(() => {
    const ids: NavTab[] = currentRole === 'student'
      ? ['dashboard', 'mobile_checkin', 'homework', 'courses']
      : currentRole === 'parent'
      ? ['dashboard', 'student_id_cards', 'billing', 'announcements']
      : ['dashboard', 'attendance', 'students', 'gradebook'];
    const all = categories.flatMap(c => c.items);
    return ids
      .map(id => all.find(i => i.id === id && i.roles.includes(currentRole) && isTabEnabledByFeatureFlags(i.id, featureFlags)))
      .filter((i): i is NavItemDef => Boolean(i));
  }, [categories, currentRole, featureFlags]);

  const hiddenByFocusCount = useMemo(() => {
    if (!supportsFocusMode || !focusMode) return 0;
    const seen = new Set<NavTab>();
    let hidden = 0;
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (seen.has(item.id)) return;
        if (!item.roles.includes(currentRole) || !isTabEnabledByFeatureFlags(item.id, featureFlags)) return;
        seen.add(item.id);
        if (!FOCUS_TEACHER_TABS.has(item.id) && item.id !== currentTab) {
          hidden += 1;
        }
      });
    });
    return hidden;
  }, [categories, currentRole, featureFlags, focusMode, supportsFocusMode, currentTab]);

  const toneOf = (id: NavTab) => getModuleTone(id);
  const pinnedIds = new Set(pinned.map(p => p.id));

  const renderItem = (item: NavItemDef, onClick?: () => void) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        data-nav-tab={item.id}
        onClick={() => { setCurrentTab(item.id); onClick?.(); }}
        className={`w-full flex min-h-9 items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition cursor-pointer ${
          isActive
            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold'
            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
        }`}
      >
        <span className="flex items-center gap-2.5 truncate">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`} />
          <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
        </span>
        {item.badge && !/^\d+$/.test(String(item.badge)) && (
          <span className="shrink-0 text-[10px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  if (desktopCollapsed) {
    const visibleItems = categories.flatMap((cat) =>
      cat.items.filter((i) =>
        i.roles.includes(currentRole) &&
        isTabEnabledByFeatureFlags(i.id, featureFlags) &&
        (!focusMode || !supportsFocusMode || FOCUS_TEACHER_TABS.has(i.id) || i.id === currentTab)
      )
    );
    const dedupedItems = Array.from(new Map(visibleItems.map((i) => [i.id, i])).values());
    return (
      <aside className="w-15 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-200">
        {onToggleDesktopCollapse && (
          <div className="shrink-0 p-2 border-b border-[var(--color-border)] flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleDesktopCollapse}
              title={lang === 'th' ? 'ขยายเมนูด้านข้าง' : 'Expand sidebar'}
              aria-label={lang === 'th' ? 'ขยายเมนูด้านข้าง' : 'Expand sidebar'}
              className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[#1e293b] dark:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            {supportsFocusMode && (
              <button
                type="button"
                onClick={toggleFocusMode}
                aria-pressed={focusMode}
                title={
                  focusMode
                    ? (lang === 'th' ? 'โหมดลดภาระครู (ซ่อนเมนูรอง) — คลิกเพื่อแสดงทั้งหมด' : 'Teacher Focus Mode ON — click to show all')
                    : (lang === 'th' ? 'กำลังแสดงทุกเมนู — คลิกเพื่อเปิดโหมดลดภาระครู' : 'All menus shown — click for Teacher Focus Mode')
                }
                className={`w-10 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                  focusMode
                    ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <nav className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1 flex flex-col items-center">
          {dedupedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-nav-tab={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={lang === 'th' ? item.labelTh : item.labelEn}
                aria-label={lang === 'th' ? item.labelTh : item.labelEn}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.badge && !/^\d+$/.test(String(item.badge)) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-60 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-200">
      <div className="shrink-0 p-2.5 border-b border-[var(--color-border)] flex items-center gap-1.5" data-guide-id="sidebar-search">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาเมนู...' : 'Search menu...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-6 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {searchFilter && (
            <button type="button" onClick={() => setSearchFilter('')} aria-label="clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer">✕</button>
          )}
        </div>
        {onToggleDesktopCollapse && (
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            title={lang === 'th' ? 'ย่อแถบเมนูเพื่อเพิ่มพื้นที่ทำงาน' : 'Collapse sidebar for more workspace'}
            aria-label={lang === 'th' ? 'ย่อแถบเมนู' : 'Collapse sidebar'}
            className="shrink-0 w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {supportsFocusMode && (
        <div className="shrink-0 px-2.5 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)]/70 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleFocusMode}
            aria-pressed={focusMode}
            className={`flex-1 flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              focusMode
                ? 'bg-sky-100/90 text-sky-900 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
            }`}
            title={
              lang === 'th'
                ? 'ซ่อนเมนูรอง/บริหารที่ไม่ใช้ประจำเพื่อให้ครูทำงานง่ายขึ้น (ยังคงค้นหาทุกเมนูได้)'
                : 'Hide secondary/admin items for calmer daily teaching workflow'
            }
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <Coffee className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {focusMode
                  ? (lang === 'th' ? 'โหมดลดภาระครู' : 'Teacher Focus')
                  : (lang === 'th' ? 'แสดงเมนูทั้งหมด' : 'All Menus')}
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-bold opacity-80">
              {focusMode && hiddenByFocusCount > 0
                ? (lang === 'th' ? `ซ่อน ${hiddenByFocusCount}` : `-${hiddenByFocusCount}`)
                : (lang === 'th' ? 'ครบ' : 'All')}
            </span>
          </button>
        </div>
      )}

      <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2.5">
        {searchFilter.trim() ? (
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
              {lang === 'th' ? `ผลการค้นหา (${searchResults.length})` : `Results (${searchResults.length})`}
            </div>
            {searchResults.length === 0
              ? <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">{lang === 'th' ? 'ไม่พบเมนู' : 'No menus found'}</div>
              : searchResults.map(item => renderItem(item, () => setSearchFilter('')))}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                  <Pin className="w-3 h-3" />{lang === 'th' ? 'ใช้บ่อย' : 'Favorites'}
                </div>
                {pinned.map(item => renderItem(item))}
              </div>
            )}
            {categories.map((cat) => {
              const items = cat.items.filter(
                (i) =>
                  i.roles.includes(currentRole) &&
                  !pinnedIds.has(i.id) &&
                  isTabEnabledByFeatureFlags(i.id, featureFlags) &&
                  (!focusMode || !supportsFocusMode || FOCUS_TEACHER_TABS.has(i.id) || i.id === currentTab)
              );
              if (items.length === 0) return null;
              const isCollapsed = collapsed[cat.id] ?? cat.id !== activeCatId;
              const CategoryIcon = cat.icon;
              const isActiveCategory = cat.id === activeCatId;
              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-controls={`sidebar-category-${cat.id}`}
                    onClick={() => {
                      if (isCollapsed) {
                        setCollapsed(Object.fromEntries(categories.map((category) => [category.id, category.id !== cat.id])));
                      } else {
                        setCollapsed((previous) => ({ ...previous, [cat.id]: true }));
                      }
                    }}
                    className={`w-full flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer transition ${
                      isActiveCategory
                        ? 'text-[var(--color-text-title)]'
                        : !isCollapsed
                          ? 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                      <span className="truncate">{lang === 'th' ? cat.labelTh : cat.labelEn}</span>
                    </span>
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />}
                  </button>
                  {!isCollapsed && (
                    <div id={`sidebar-category-${cat.id}`} className="space-y-1 pl-1">
                      {items.map(item => renderItem(item))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
};
