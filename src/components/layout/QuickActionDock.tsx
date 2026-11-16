import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  Focus,
  GraduationCap,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Table2,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import type { AppLanguage, AppProgramMode, UserRole } from '../../types';
import type { NavTab } from './Sidebar';
import { emitOpenGlobalSearch, emitQuickAction } from '../../lib/quickActionEvents';

interface QuickActionItem {
  id: string;
  labelTh: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  primary?: boolean;
  active?: boolean;
  badge?: number;
  titleTh?: string;
  titleEn?: string;
}

interface QuickActionDockProps {
  programMode: AppProgramMode;
  currentTab: NavTab;
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  lang: AppLanguage;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onSetProgramMode: (mode: AppProgramMode) => void;
  onOpenImportExport?: (initialTab?: string) => void;
  onOpenNotifications?: () => void;
  pendingLeaveCount?: number;
  ungradedHomeworkCount?: number;
  unreadNotifCount?: number;
  showMobileBottomNav?: boolean;
}

const DOCK_COLLAPSED_KEY = 'baanpakkru_quick_dock_collapsed';

export const QuickActionDock: React.FC<QuickActionDockProps> = ({
  programMode,
  currentTab,
  currentRole,
  isSuperAdminSchoolView,
  lang,
  focusMode,
  onToggleFocusMode,
  onNavigateTab,
  onSetProgramMode,
  onOpenImportExport,
  onOpenNotifications,
  pendingLeaveCount = 0,
  ungradedHomeworkCount = 0,
  unreadNotifCount = 0,
  showMobileBottomNav = false,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(DOCK_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(DOCK_COLLAPSED_KEY, next ? '1' : '0');
        } catch {
          // ignore storage failure
        }
      }
      return next;
    });
  };

  const isStaff = ['super_admin', 'admin', 'teacher'].includes(currentRole);
  const isAdmin = ['super_admin', 'admin'].includes(currentRole);
  const canUseSchoolOps = currentRole !== 'super_admin' || isSuperAdminSchoolView;

  const actions = useMemo<QuickActionItem[]>(() => {
    const items: QuickActionItem[] = [];

    const focusToggleItem: QuickActionItem = {
      id: 'toggle_focus',
      labelTh: focusMode ? 'ปิดโฟกัส' : 'โหมดโฟกัส',
      labelEn: focusMode ? 'Exit Focus' : 'Focus Mode',
      icon: focusMode ? Minimize2 : Maximize2,
      active: focusMode,
      onClick: () => {
        onToggleFocusMode();
      },
      titleTh: focusMode
        ? 'ออกจากโหมดโฟกัส (แสดงเมนูข้างและการแจ้งเตือน)'
        : 'เปิดโหมดโฟกัส: พับเมนูข้างและการแจ้งเตือนเพื่อขยายพื้นที่ทำงาน (Ctrl+Shift+F)',
      titleEn: focusMode
        ? 'Exit Focus Mode (restore sidebar & notifications)'
        : 'Enable Focus Mode: collapse sidebar & secondary panels (Ctrl+Shift+F)',
    };

    const searchItem: QuickActionItem = {
      id: 'global_search',
      labelTh: 'ค้นหา',
      labelEn: 'Search',
      icon: Search,
      onClick: () => emitOpenGlobalSearch(),
      titleTh: 'ค้นหานักเรียน / ครู / รายวิชา (⌘K)',
      titleEn: 'Quick search students, teachers, courses (⌘K)',
    };

    if (programMode === 'lms_classroom') {
      items.push(focusToggleItem);
      items.push({
        id: 'go_erp_dashboard',
        labelTh: 'แดชบอร์ดหลัก',
        labelEn: 'Dashboard',
        icon: LayoutDashboard,
        onClick: () => {
          onSetProgramMode('school_erp');
          onNavigateTab('dashboard');
        },
        primary: true,
      });
      items.push({
        id: 'go_homework',
        labelTh: 'งานและการบ้าน',
        labelEn: 'Homework',
        icon: BookOpen,
        badge: ungradedHomeworkCount > 0 ? ungradedHomeworkCount : undefined,
        onClick: () => {
          onSetProgramMode('school_erp');
          onNavigateTab('homework');
        },
      });
      items.push({
        id: 'go_gradebook',
        labelTh: 'สมุดคะแนน',
        labelEn: 'Gradebook',
        icon: Award,
        onClick: () => {
          onSetProgramMode('school_erp');
          onNavigateTab('gradebook');
        },
      });
      items.push(searchItem);
      return items;
    }

    if (programMode === 'parent_portal') {
      items.push(focusToggleItem);
      if (isStaff) {
        items.push({
          id: 'go_erp_dashboard',
          labelTh: 'กลับบริหารโรงเรียน',
          labelEn: 'School SIS',
          icon: LayoutDashboard,
          primary: true,
          onClick: () => {
            onSetProgramMode('school_erp');
            onNavigateTab('dashboard');
          },
        });
      }
      if (onOpenNotifications && !focusMode) {
        items.push({
          id: 'open_notif',
          labelTh: 'แจ้งเตือน',
          labelEn: 'Alerts',
          icon: Bell,
          badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
          onClick: onOpenNotifications,
        });
      }
      items.push(searchItem);
      return items;
    }

    // Super Admin Master Console
    if (currentTab === 'super_admin_console' && currentRole === 'super_admin') {
      items.push(focusToggleItem);
      items.push({
        id: 'go_coord_desk',
        labelTh: 'ประสานงานโรงเรียน',
        labelEn: 'School Desk',
        icon: Sparkles,
        primary: true,
        onClick: () => onNavigateTab('admin_superadmin_desk'),
      });
      if (onOpenNotifications && !focusMode) {
        items.push({
          id: 'open_notif',
          labelTh: 'แจ้งเตือน',
          labelEn: 'Alerts',
          icon: Bell,
          badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
          onClick: onOpenNotifications,
        });
      }
      return items;
    }

    // Contextual School ERP tabs
    switch (currentTab) {
      case 'dashboard': {
        items.push(focusToggleItem);
        items.push({
          id: 'go_attendance',
          labelTh: isStaff ? 'เช็คชื่อวันนี้' : 'เช็คชื่อมือถือ',
          labelEn: isStaff ? 'Attendance' : 'Check-in',
          icon: QrCode,
          primary: true,
          badge: pendingLeaveCount > 0 ? pendingLeaveCount : undefined,
          onClick: () => onNavigateTab(isStaff ? 'attendance' : 'mobile_checkin'),
        });
        items.push({
          id: 'go_timetable',
          labelTh: 'ตารางสอน',
          labelEn: 'Timetable',
          icon: Calendar,
          onClick: () => onNavigateTab('timetable'),
        });
        items.push({
          id: 'go_gradebook',
          labelTh: 'บันทึกคะแนน',
          labelEn: 'Gradebook',
          icon: Award,
          onClick: () => onNavigateTab('gradebook'),
        });
        items.push({
          id: 'go_homework',
          labelTh: 'การบ้าน',
          labelEn: 'Homework',
          icon: BookOpen,
          badge: ungradedHomeworkCount > 0 ? ungradedHomeworkCount : undefined,
          onClick: () => onNavigateTab('homework'),
        });
        items.push(searchItem);
        break;
      }

      case 'attendance': {
        if (isStaff) {
          items.push({
            id: 'att_rapid_scan',
            labelTh: 'สแกนด่วน',
            labelEn: 'Rapid Scan',
            icon: QrCode,
            primary: true,
            onClick: () => emitQuickAction('attendance', 'open_rapid_scanner'),
          });
          items.push({
            id: 'att_leaves',
            labelTh: 'อนุมัติใบลา',
            labelEn: 'Leaves',
            icon: FileCheck2,
            badge: pendingLeaveCount > 0 ? pendingLeaveCount : undefined,
            onClick: () => emitQuickAction('attendance', 'tab_leave_approval'),
          });
          items.push({
            id: 'att_period_qr',
            labelTh: 'QR คาบเรียน',
            labelEn: 'Period QR',
            icon: UserCheck,
            onClick: () => emitQuickAction('attendance', 'tab_period_qr'),
          });
          items.push({
            id: 'att_reports',
            labelTh: 'รายงาน/ส่งออก',
            labelEn: 'Reports',
            icon: FileSpreadsheet,
            onClick: () => emitQuickAction('attendance', 'tab_export_reports'),
          });
        } else {
          items.push({
            id: 'att_mobile',
            labelTh: 'เช็คชื่อด้วยกล้อง',
            labelEn: 'Selfie Check-in',
            icon: QrCode,
            primary: true,
            onClick: () => onNavigateTab('mobile_checkin'),
          });
        }
        items.push(focusToggleItem);
        items.push({
          id: 'back_dash',
          labelTh: 'แดชบอร์ด',
          labelEn: 'Dashboard',
          icon: LayoutDashboard,
          onClick: () => onNavigateTab('dashboard'),
        });
        break;
      }

      case 'students': {
        if (isStaff) {
          items.push({
            id: 'stu_add',
            labelTh: 'เพิ่มนักเรียน',
            labelEn: 'Add Student',
            icon: UserPlus,
            primary: true,
            onClick: () => emitQuickAction('students', 'open_add_student'),
          });
          items.push({
            id: 'stu_bulk',
            labelTh: 'เพิ่มยกห้อง',
            labelEn: 'Bulk Add',
            icon: Users,
            onClick: () => emitQuickAction('students', 'open_bulk_add'),
          });
          if (onOpenImportExport) {
            items.push({
              id: 'stu_import',
              labelTh: 'นำเข้า/ส่งออก',
              labelEn: 'Import/Export',
              icon: FileSpreadsheet,
              onClick: () => onOpenImportExport('students'),
            });
          }
          items.push({
            id: 'stu_qr',
            labelTh: 'พิมพ์ QR',
            labelEn: 'Batch QR',
            icon: QrCode,
            onClick: () => emitQuickAction('students', 'open_batch_qr'),
          });
        }
        items.push(searchItem);
        items.push(focusToggleItem);
        break;
      }

      case 'teachers': {
        if (isAdmin) {
          items.push({
            id: 'tch_add',
            labelTh: 'เพิ่มบุคลากร',
            labelEn: 'Add Staff',
            icon: UserPlus,
            primary: true,
            onClick: () => emitQuickAction('teachers', 'open_add_teacher'),
          });
          if (onOpenImportExport) {
            items.push({
              id: 'tch_import',
              labelTh: 'นำเข้า/ส่งออก',
              labelEn: 'Import/Export',
              icon: FileSpreadsheet,
              onClick: () => onOpenImportExport('teachers'),
            });
          }
        }
        items.push({
          id: 'tch_toggle_view',
          labelTh: 'สลับมุมมองตาราง',
          labelEn: 'Switch View',
          icon: Table2,
          onClick: () => emitQuickAction('teachers', 'toggle_view_mode'),
        });
        items.push({
          id: 'tch_workload',
          labelTh: 'ภาระงานสอน',
          labelEn: 'Workload',
          icon: ClipboardCheck,
          onClick: () => {
            onNavigateTab('timetable');
            emitQuickAction('timetable', 'mode_workload', 90);
          },
        });
        items.push(focusToggleItem);
        break;
      }

      case 'courses': {
        if (isStaff) {
          items.push({
            id: 'crs_add',
            labelTh: 'เพิ่มรายวิชา',
            labelEn: 'Add Course',
            icon: Plus,
            primary: true,
            onClick: () => emitQuickAction('courses', 'open_add_course'),
          });
          if (onOpenImportExport) {
            items.push({
              id: 'crs_import',
              labelTh: 'นำเข้า/ส่งออก',
              labelEn: 'Import/Export',
              icon: FileSpreadsheet,
              onClick: () => onOpenImportExport('courses'),
            });
          }
        }
        items.push({
          id: 'crs_gradebook',
          labelTh: 'บันทึกคะแนน',
          labelEn: 'Gradebook',
          icon: Award,
          onClick: () => onNavigateTab('gradebook'),
        });
        items.push({
          id: 'crs_timetable',
          labelTh: 'ตารางสอน',
          labelEn: 'Timetable',
          icon: Calendar,
          onClick: () => onNavigateTab('timetable'),
        });
        items.push(focusToggleItem);
        break;
      }

      case 'timetable': {
        if (isStaff) {
          items.push({
            id: 'tt_add_slot',
            labelTh: 'เพิ่มคาบสอน',
            labelEn: 'Add Slot',
            icon: CalendarPlus,
            primary: true,
            onClick: () => emitQuickAction('timetable', 'open_add_slot'),
          });
        }
        items.push({
          id: 'tt_classroom',
          labelTh: 'ตารางห้อง',
          labelEn: 'Rooms',
          icon: Calendar,
          onClick: () => emitQuickAction('timetable', 'mode_classroom'),
        });
        if (isStaff) {
          items.push({
            id: 'tt_workload',
            labelTh: 'ภาระงานครู',
            labelEn: 'Workload',
            icon: Users,
            onClick: () => emitQuickAction('timetable', 'mode_workload'),
          });
          items.push({
            id: 'tt_sub',
            labelTh: 'หาครูสอนแทน',
            labelEn: 'Substitute',
            icon: UserCheck,
            onClick: () => emitQuickAction('timetable', 'mode_substitute'),
          });
          items.push({
            id: 'tt_import',
            labelTh: 'นำเข้า/ส่งออก',
            labelEn: 'Import/Export',
            icon: FileSpreadsheet,
            onClick: () => emitQuickAction('timetable', 'open_import_export'),
          });
        }
        items.push(focusToggleItem);
        break;
      }

      case 'gradebook': {
        if (isStaff) {
          items.push({
            id: 'gb_add',
            labelTh: 'กรอกคะแนนเพิ่ม',
            labelEn: 'Add Score',
            icon: Plus,
            primary: true,
            onClick: () => emitQuickAction('gradebook', 'toggle_add_grade'),
          });
          items.push({
            id: 'gb_pp5',
            labelTh: 'ปพ.5',
            labelEn: 'PP.5',
            icon: ClipboardCheck,
            onClick: () => emitQuickAction('gradebook', 'tab_pp5'),
          });
          items.push({
            id: 'gb_pp6',
            labelTh: 'ปพ.6',
            labelEn: 'PP.6',
            icon: GraduationCap,
            onClick: () => emitQuickAction('gradebook', 'tab_pp6'),
          });
          if (onOpenImportExport) {
            items.push({
              id: 'gb_import',
              labelTh: 'นำเข้า/ส่งออก',
              labelEn: 'Import/Export',
              icon: FileSpreadsheet,
              onClick: () => onOpenImportExport('grades'),
            });
          }
        }
        items.push(focusToggleItem);
        items.push({
          id: 'back_dash',
          labelTh: 'แดชบอร์ด',
          labelEn: 'Dashboard',
          icon: LayoutDashboard,
          onClick: () => onNavigateTab('dashboard'),
        });
        break;
      }

      case 'homework': {
        items.push({
          id: 'hw_pending',
          labelTh: 'งานค้างตรวจ',
          labelEn: 'Pending',
          icon: ClipboardCheck,
          primary: true,
          badge: ungradedHomeworkCount > 0 ? ungradedHomeworkCount : undefined,
          onClick: () => emitQuickAction('homework', 'tab_pending'),
        });
        items.push({
          id: 'hw_submit',
          labelTh: 'ส่งการบ้าน/บันทึก',
          labelEn: 'Submit',
          icon: Plus,
          onClick: () => emitQuickAction('homework', 'open_submit_modal'),
        });
        items.push({
          id: 'hw_calendar',
          labelTh: 'ปฏิทินส่งงาน',
          labelEn: 'Calendar',
          icon: Calendar,
          onClick: () => emitQuickAction('homework', 'open_calendar'),
        });
        items.push(focusToggleItem);
        break;
      }

      default: {
        items.push(focusToggleItem);
        if (canUseSchoolOps) {
          items.push({
            id: 'go_dash',
            labelTh: 'แดชบอร์ด',
            labelEn: 'Dashboard',
            icon: LayoutDashboard,
            primary: true,
            onClick: () => onNavigateTab('dashboard'),
          });
          items.push({
            id: 'go_att',
            labelTh: 'เช็คชื่อ',
            labelEn: 'Attendance',
            icon: QrCode,
            onClick: () => onNavigateTab(isStaff ? 'attendance' : 'mobile_checkin'),
          });
          items.push({
            id: 'go_tt',
            labelTh: 'ตารางสอน',
            labelEn: 'Timetable',
            icon: Calendar,
            onClick: () => onNavigateTab('timetable'),
          });
        }
        items.push(searchItem);
        break;
      }
    }

    if (onOpenNotifications && !focusMode && !items.some((i) => i.id === 'open_notif') && items.length < 6) {
      items.push({
        id: 'open_notif',
        labelTh: 'แจ้งเตือน',
        labelEn: 'Alerts',
        icon: Bell,
        badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
        onClick: onOpenNotifications,
      });
    }

    return items;
  }, [
    programMode,
    currentTab,
    currentRole,
    isStaff,
    isAdmin,
    canUseSchoolOps,
    focusMode,
    pendingLeaveCount,
    ungradedHomeworkCount,
    unreadNotifCount,
    onToggleFocusMode,
    onNavigateTab,
    onSetProgramMode,
    onOpenImportExport,
    onOpenNotifications,
  ]);

  if (actions.length === 0) return null;

  const bottomPositionClass = showMobileBottomNav
    ? 'bottom-[62px] md:bottom-3.5'
    : 'bottom-3.5';

  if (collapsed) {
    return (
      <div
        className={`no-print print:hidden fixed ${bottomPositionClass} left-1/2 -translate-x-1/2 z-30`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md text-[var(--color-text-title)] shadow-md hover:border-[var(--color-primary)] text-xs font-bold cursor-pointer transition whitespace-nowrap"
          title={lang === 'th' ? 'เปิดแถบ Quick Action' : 'Expand Quick Action Dock'}
        >
          <Zap className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
          <span>{lang === 'th' ? 'เมนูด่วน' : 'Quick Action'}</span>
          {focusMode && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-sky-700 dark:text-sky-300">
              <Focus className="w-3 h-3" />
              {lang === 'th' ? 'โฟกัส' : 'Focus'}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>
    );
  }

  return (
    <nav
      aria-label={lang === 'th' ? 'แถบคำสั่งด่วนประจำหน้า' : 'Contextual Quick Action Dock'}
      data-guide-id="quick-action-dock"
      className={`no-print print:hidden fixed ${bottomPositionClass} left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-270px)]`}
    >
      <div className="flex items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md px-2 py-1.5 shadow-lg overflow-x-auto no-scrollbar">
        <div
          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] border-r border-[var(--color-border)] pr-2 mr-0.5 whitespace-nowrap shrink-0 select-none"
          title={lang === 'th' ? 'คำสั่งด่วนปรับตามหน้าที่เปิดอยู่' : 'Adapts to your active workspace tab'}
        >
          <Zap className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
          <span>{lang === 'th' ? 'เมนูด่วน' : 'Quick Action'}</span>
        </div>

        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              aria-pressed={action.active}
              title={lang === 'th' ? (action.titleTh || action.labelTh) : (action.titleEn || action.labelEn)}
              className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                action.active
                  ? 'bg-sky-600 text-white shadow-xs hover:bg-sky-700'
                  : action.primary
                  ? 'bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary-hover)]'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? action.labelTh : action.labelEn}</span>
              {typeof action.badge === 'number' && action.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums leading-tight ${
                    action.primary || action.active
                      ? 'bg-white/25 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={lang === 'th' ? 'พับแถบเมนูด่วน' : 'Minimize Quick Action dock'}
          title={lang === 'th' ? 'พับแถบเมนูด่วนลง' : 'Minimize dock'}
          className="ml-0.5 p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer transition shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};
