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
  User,
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
  LucideIcon
} from 'lucide-react';
import { UserRole, AppLanguage } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

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
  onOpenProfile?: () => void;
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
  onOpenProfile,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [displayMode, setDisplayMode] = useState<'tabs' | 'all'>('tabs');
  const [listPage, setListPage] = useState(0);

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
          labelTh: 'แดชบอร์ดผู้บริหาร / จอทีวี (TV)',
          labelEn: 'Director & TV Monitor',
          icon: Monitor,
          badge: 'TV / ผอ.',
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'students',
          labelTh: 'ทะเบียนนักเรียน (DMC)',
          labelEn: 'Student Directory (DMC)',
          icon: Users,
          badge: studentsCount > 0 ? `${studentsCount} คน` : 'DMC',
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'teachers',
          labelTh: 'บุคลากร & DPA (HRMS)',
          labelEn: 'Faculty & DPA (HRMS)',
          icon: GraduationCap,
          badge: teachersCount > 0 ? `${teachersCount} ท่าน` : 'HRMS',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'courses',
          labelTh: 'รายวิชา & หลักสูตร (School MIS)',
          labelEn: 'Courses & Curriculum (MIS)',
          icon: BookOpen,
          badge: coursesCount > 0 ? `${coursesCount} วิชา` : 'MIS',
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
          labelTh: 'วัดผล ปพ.1/5 & ปพ.3 ออนไลน์',
          labelEn: 'Grading, PhorPhor & PP3',
          icon: Award,
          badge: 'ปพ.3',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
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
          labelTh: 'สแกนบัตรประตูโรงเรียน',
          labelEn: 'Gate QR Check-in',
          icon: QrCode,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'mobile_checkin',
          labelTh: 'ถ่ายรูปเช็กชื่อ GPS มือถือ',
          labelEn: 'GPS Mobile Check-in',
          icon: Smartphone,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'student_id_cards',
          labelTh: 'บัตรนักเรียนดิจิทัล Virtual ID',
          labelEn: 'Digital Student ID',
          icon: CreditCard,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'behavior_sdq',
          labelTh: 'OBEC Care & ทุนยากจน CCT',
          labelEn: 'OBEC Care & CCT Poverty',
          icon: HeartHandshake,
          badge: 'OBEC/CCT',
          roles: ['super_admin', 'admin', 'teacher', 'parent'],
        },
        {
          id: 'infirmary',
          labelTh: 'ห้องพยาบาล & เวชระเบียน',
          labelEn: 'Infirmary Clinic',
          icon: HeartPulse,
          roles: ['super_admin', 'admin', 'teacher', 'parent', 'student'],
        },
      ],
    });

    // Category 3: Learning & Innovation
    list.push({
      id: 'innovation',
      labelTh: 'นวัตกรรม & การเรียนรู้',
      labelEn: 'Learning & Innovation',
      shortLabelTh: 'นวัตกรรม',
      shortLabelEn: 'Labs & AI',
      icon: Sparkles,
      badge: 'AI',
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
          labelTh: 'แฟ้มผลงานดิจิทัล TCAS / ว.PA',
          labelEn: 'Student & Teacher Portfolios',
          icon: FolderGit2,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'study_streak',
          labelTh: 'สตรีคประจำวัน & เควสต์พาส',
          labelEn: 'Daily Streak & Perks Pass',
          icon: Flame,
          badge: '🔥 HOT',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'socratic_tutor',
          labelTh: 'พี่รหัส AI ชวนคิด & Socratic',
          labelEn: 'AI Socratic Tutor',
          icon: Sparkles,
          badge: '24H',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'realworld_quests',
          labelTh: 'เควสต์สำรวจชีวิตจริง AI Vision',
          labelEn: 'Real-World Snap Quests',
          icon: Camera,
          badge: 'VISION',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'boss_raid',
          labelTh: 'เรดบอสห้องเรียน & ติวเพื่อน',
          labelEn: 'Co-op Boss Raid & Assist',
          icon: Swords,
          badge: 'CO-OP',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'ai_diagnostic',
          labelTh: 'AI วินิจฉัย & ซ่อมเสริม 8 มิติ',
          labelEn: 'AI Competency & Remedial',
          icon: BrainCircuit,
          badge: 'AI',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'subject_labs',
          labelTh: 'เวิร์กช็อปจำลองรายวิชา 6 มิติ',
          labelEn: 'Interactive Subject Workshops',
          icon: FlaskConical,
          badge: 'SIM',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'games',
          labelTh: 'EduArcade ศูนย์เกม 7 สไตล์',
          labelEn: 'EduArcade 7-Genre Games',
          icon: Swords,
          badge: '7 เกม',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'central_exam_hub',
          labelTh: 'คลังข้อสอบกลาง 8 สาระฯ',
          labelEn: '8-Strand Central Exam Hub',
          icon: BookOpen,
          badge: unclaimedCentralPacksCount > 0 ? `${unclaimedCentralPacksCount} ใหม่` : '8 สาระ',
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'hall_of_fame',
          labelTh: 'หอเกียรติยศ 3 มิติ & เกียรติบัตร',
          labelEn: '3D Hall of Fame & Certs',
          icon: Trophy,
          badge: '3D',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
      ],
    });

    // Category 4: Administration & GPS Settings
    list.push({
      id: 'administration',
      labelTh: 'การบริหาร & ตั้งค่า GPS',
      labelEn: 'Admin & GPS Settings',
      shortLabelTh: 'บริหาร/GPS',
      shortLabelEn: 'Admin/GPS',
      icon: SlidersHorizontal,
      items: [
        {
          id: 'school_gps',
          labelTh: '📍 ตั้งค่าพิกัด GPS โรงเรียน',
          labelEn: 'School GPS Coordinates',
          icon: MapPin,
          badge: 'GPS',
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'executive_warning',
          labelTh: 'ระบบพยากรณ์ความเสี่ยงผู้บริหาร',
          labelEn: 'Executive Early Warning',
          icon: ShieldAlert,
          badge: 'PREDICT',
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'school_permissions',
          labelTh: 'กำหนดสิทธิ์บทบาทในโรงเรียน',
          labelEn: 'School Role Permissions',
          icon: SlidersHorizontal,
          badge: 'ADMIN',
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'admin_superadmin_desk',
          labelTh: 'แชต/จดหมายประสานงาน Super Admin',
          labelEn: 'Admin ↔ SuperAdmin Desk',
          icon: Mail,
          badge: coordinationUnreadCount > 0 ? `${coordinationUnreadCount} ใหม่` : 'ด่วน',
          roles: ['super_admin', 'admin'],
        },
        {
          id: 'system_settings',
          labelTh: 'ตั้งค่าระบบ & แจ้งเตือน LINE OA',
          labelEn: 'System & LINE Notifications',
          icon: MessageSquare,
          badge: 'LINE OA',
          roles: ['super_admin', 'admin', 'teacher'],
        },
      ],
    });

    // Category 5: Finance & Announcements
    list.push({
      id: 'finance',
      labelTh: 'การเงิน & สื่อสาร',
      labelEn: 'Finance & News',
      shortLabelTh: 'การเงิน/ข่าว',
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

  // Determine which category owns a given tab
  const getCategoryForTab = (tab: NavTab): NavCategoryId => {
    for (const cat of categories) {
      if (cat.items.some(item => item.id === tab)) {
        return cat.id;
      }
    }
    return 'academics';
  };

  const [activeCategoryId, setActiveCategoryId] = useState<NavCategoryId>(() => getCategoryForTab(currentTab));

  // Sync category when currentTab changes externally
  useEffect(() => {
    const parentCat = getCategoryForTab(currentTab);
    setActiveCategoryId(parentCat);
  }, [currentTab]);

  const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0];

  // Filter visible items
  const visibleCategoryItems = useMemo(() => {
    return activeCategory.items.filter(item => item.roles.includes(currentRole));
  }, [activeCategory, currentRole]);

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

  const allVisibleItems = useMemo(
    () => categories.flatMap(category =>
      category.items
        .filter(item => item.roles.includes(currentRole))
        .map(item => ({ category, item }))
    ),
    [categories, currentRole]
  );

  useEffect(() => {
    setListPage(0);
  }, [searchFilter, activeCategoryId, displayMode, searchResults.length, visibleCategoryItems.length, allVisibleItems.length]);

  const renderPagination = (pageCount: number) => pageCount > 1 && (
    <nav aria-label={lang === 'th' ? 'เปลี่ยนหน้าเมนู' : 'Menu pages'} className="flex items-center justify-between gap-2 px-2 pt-2">
      <button
        type="button"
        onClick={() => setListPage(page => Math.max(0, page - 1))}
        disabled={listPage === 0}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
      >
        {lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
      </button>
      <span aria-live="polite" className="text-[10px] font-semibold text-[var(--color-text-muted)]">{listPage + 1} / {pageCount}</span>
      <button
        type="button"
        onClick={() => setListPage(page => Math.min(pageCount - 1, page + 1))}
        disabled={listPage === pageCount - 1}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
      >
        {lang === 'th' ? 'ถัดไป' : 'Next'}
      </button>
    </nav>
  );

  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] flex flex-col justify-between shrink-0 select-none h-full overflow-hidden">
      {/* Top Header & Category Tabs Switcher */}
      <div className="shrink-0 p-2.5 pb-2 border-b border-[var(--color-border)] space-y-2">
        {/* Quick Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาเมนู (เช่น GPS, เกรด)...' : 'Find menu...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-[11px] rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs: Compact 5-tab Grid */}
        {!searchFilter && (
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                {lang === 'th' ? 'หมวดหมู่เมนู' : 'Menu Categories'}
              </span>
              <button
                type="button"
                onClick={() => setDisplayMode(prev => prev === 'tabs' ? 'all' : 'tabs')}
                className="text-[9px] font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                {displayMode === 'tabs' 
                  ? (lang === 'th' ? 'แสดงทั้งหมด' : 'Show all') 
                  : (lang === 'th' ? 'แบบแท็บ' : 'Tab mode')}
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategoryId === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      const visibleInCat = cat.items.filter(i => i.roles.includes(currentRole));
                      if (visibleInCat.length > 0 && !visibleInCat.some(i => i.id === currentTab)) {
                        setCurrentTab(visibleInCat[0].id);
                      }
                    }}
                    title={lang === 'th' ? cat.labelTh : cat.labelEn}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-center transition cursor-pointer relative border ${
                      isActive
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs font-bold'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 mb-0.5" />
                    <span className="text-[9px] leading-tight truncate w-full font-semibold">
                      {lang === 'th' ? cat.shortLabelTh : cat.shortLabelEn}
                    </span>
                    {cat.badge && (
                      <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded-full bg-rose-700 text-white font-black leading-none">
                        {cat.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Items List: Fits 100% On Screen */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1">
        {/* Search Results Mode */}
        {searchFilter.trim() ? (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-[var(--color-text-muted)] px-2 py-0.5">
              {lang === 'th' ? `ผลการค้นหา (${searchResults.length})` : `Search Results (${searchResults.length})`}
            </div>
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ไม่พบเมนูที่ตรงกับคำค้น' : 'No menus found'}
              </div>
            ) : (
              searchResults.slice(listPage * 6, listPage * 6 + 6).map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrentTab(item.id);
                      setSearchFilter('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-sm font-bold'
                        : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                      <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                        isActive ? 'bg-slate-900/40 text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
            {renderPagination(Math.ceil(searchResults.length / 6))}
          </div>
        ) : displayMode === 'tabs' ? (
          /* TAB MODE: Shows Only Selected Category's 3-7 Items (Guarantees No Page Scrolling!) */
          <div className="space-y-1">
            {/* Active Category Header */}
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-[var(--color-border)]">
              <span className="text-[11px] font-bold text-[var(--color-primary-text)] flex items-center gap-1.5">
                <activeCategory.icon className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? activeCategory.labelTh : activeCategory.labelEn}</span>
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                {visibleCategoryItems.length} เมนู
              </span>
            </div>

            {visibleCategoryItems.slice(listPage * 6, listPage * 6 + 6).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-sm font-bold'
                      : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                    <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive ? 'bg-slate-900/40 text-white' : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            {renderPagination(Math.ceil(visibleCategoryItems.length / 6))}
          </div>
        ) : (
          <div className="space-y-1">
            {allVisibleItems.slice(listPage * 7, listPage * 7 + 7).map(({ category, item }) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
                      : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                    <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                  </div>
                  <span className={`ml-1 shrink-0 text-[9px] font-medium ${isActive ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                    {lang === 'th' ? category.shortLabelTh : category.shortLabelEn}
                  </span>
                </button>
              );
            })}
            {renderPagination(Math.ceil(allVisibleItems.length / 7))}
          </div>
        )}
      </div>

      {/* Footer Controls: Quick GPS Setting & Profile */}
      <div className="p-2.5 border-t border-[var(--color-border)] space-y-1.5 shrink-0 bg-[var(--color-card-subtle)]">
        {/* Direct School GPS Shortcut for Admins */}
        {(currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
          <button
            type="button"
            onClick={() => setCurrentTab('school_gps')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              currentTab === 'school_gps'
                ? 'bg-amber-400 text-slate-950 border-amber-600 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${currentTab === 'school_gps' ? 'text-slate-950' : 'text-amber-700 dark:text-amber-300'}`} />
            <div className="flex-1 min-w-0 text-left">
              <span className="truncate block">{lang === 'th' ? '📍 ตั้งค่าพิกัด GPS โรงเรียน' : 'Configure School GPS'}</span>
            </div>
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-mono">
              ตั้งค่า
            </span>
          </button>
        )}

        {/* Mobile App Install Button (Android & iOS) */}
        <PWAInstallButton lang={lang} variant="sidebar" />

        {/* Profile Button */}
        {onOpenProfile && (currentRole !== 'super_admin' || isSuperAdminSchoolView) && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary-light)] hover:opacity-90 text-[var(--color-primary-text)] border border-[var(--color-border)] transition text-xs font-semibold text-left cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
            <span className="truncate flex-1 font-bold">
              {lang === 'th' ? 'โปรไฟล์ & ผลงานของฉัน' : 'My Profile'}
            </span>
          </button>
        )}

        <div className="text-[10px] text-[var(--color-text-muted)] text-center font-mono">
          EduVerse SIS • โหมดแท็บเต็มหน้า
        </div>
      </div>
    </aside>
  );
};
