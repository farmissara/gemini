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
  LucideIcon
} from 'lucide-react';
import { UserRole, AppLanguage } from '../types';

export type NavTab = 
  | 'super_admin_console'
  | 'school_permissions'
  | 'system_settings'
  | 'school_gps'
  | 'executive_warning'
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
          id: 'students',
          labelTh: 'ทะเบียนนักเรียน',
          labelEn: 'Student Directory',
          icon: Users,
          badge: studentsCount > 0 ? studentsCount.toString() : null,
          roles: ['super_admin', 'admin', 'teacher'],
        },
        {
          id: 'teachers',
          labelTh: 'ทำเนียบคณาจารย์',
          labelEn: 'Faculty & Teachers',
          icon: GraduationCap,
          badge: teachersCount > 0 ? teachersCount.toString() : null,
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
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
          labelTh: 'บันทึกคะแนน & ปพ.1/5',
          labelEn: 'Gradebook & Transcripts',
          icon: Award,
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
          labelTh: 'คัดกรอง SDQ & พฤติกรรม',
          labelEn: 'SDQ & Behavior Screening',
          icon: HeartHandshake,
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
          labelTh: 'แล็บจำลองรายวิชา & เคมีทดลอง',
          labelEn: 'Subject Labs & Chemistry',
          icon: FlaskConical,
          badge: 'SIM',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        },
        {
          id: 'games',
          labelTh: 'เกมตอบคำถาม 3 มิติ EduBattle',
          labelEn: 'Educational 3D Quiz',
          icon: Swords,
          badge: '3D',
          roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
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
        className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
      >
        {lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
      </button>
      <span aria-live="polite" className="text-[10px] text-slate-500">{listPage + 1} / {pageCount}</span>
      <button
        type="button"
        onClick={() => setListPage(page => Math.min(pageCount - 1, page + 1))}
        disabled={listPage === pageCount - 1}
        className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
      >
        {lang === 'th' ? 'ถัดไป' : 'Next'}
      </button>
    </nav>
  );

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 select-none h-full overflow-hidden">
      {/* Top Header & Category Tabs Switcher */}
      <div className="shrink-0 p-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 space-y-2">
        {/* Quick Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาเมนู (เช่น GPS, เกรด)...' : 'Find menu...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs: Compact 5-tab Grid */}
        {!searchFilter && (
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {lang === 'th' ? 'หมวดหมู่เมนู' : 'Menu Categories'}
              </span>
              <button
                type="button"
                onClick={() => setDisplayMode(prev => prev === 'tabs' ? 'all' : 'tabs')}
                className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
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
                      // If current active item not in this category, switch to the first item
                      const visibleInCat = cat.items.filter(i => i.roles.includes(currentRole));
                      if (visibleInCat.length > 0 && !visibleInCat.some(i => i.id === currentTab)) {
                        setCurrentTab(visibleInCat[0].id);
                      }
                    }}
                    title={lang === 'th' ? cat.labelTh : cat.labelEn}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-center transition cursor-pointer relative ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 mb-0.5" />
                    <span className="text-[9px] leading-tight truncate w-full font-semibold">
                      {lang === 'th' ? cat.shortLabelTh : cat.shortLabelEn}
                    </span>
                    {cat.badge && (
                      <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.2 rounded-full bg-rose-500 text-white font-black leading-none">
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
            <div className="text-[10px] font-bold text-slate-500 px-2 py-0.5">
              {lang === 'th' ? `ผลการค้นหา (${searchResults.length})` : `Search Results (${searchResults.length})`}
            </div>
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
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
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <activeCategory.icon className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? activeCategory.labelTh : activeCategory.labelEn}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
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
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                  </div>
                  <span className="ml-1 shrink-0 text-[9px] font-medium text-slate-400">
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
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Direct School GPS Shortcut for Admins */}
        {(currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'teacher') && (
          <button
            type="button"
            onClick={() => setCurrentTab('school_gps')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              currentTab === 'school_gps'
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <span className="truncate block">{lang === 'th' ? '📍 ตั้งค่าพิกัด GPS โรงเรียน' : 'Configure School GPS'}</span>
            </div>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200/80 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-mono">
              ตั้งค่า
            </span>
          </button>
        )}

        {/* Profile Button */}
        {onOpenProfile && (currentRole !== 'super_admin' || isSuperAdminSchoolView) && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 transition text-xs font-semibold text-left cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate flex-1 font-bold">
              {lang === 'th' ? 'โปรไฟล์ & ผลงานของฉัน' : 'My Profile'}
            </span>
          </button>
        )}

        <div className="text-[10px] text-slate-400 text-center font-mono">
          EduVerse SIS • โหมดแท็บเต็มหน้า
        </div>
      </div>
    </aside>
  );
};
