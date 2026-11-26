import React, { useMemo } from 'react';
import AttendancePhoto from '../AttendancePhoto';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  BellRing,
  Calendar,
  ChevronRight,
  Download,
  FileCheck2,
  Layers,
  ListChecks,
  QrCode,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  CampusGateGeofence,
  School,
  SystemConfig,
  TimetableSlot,
} from '../../types';
import type { NavTab } from '../layout/Sidebar';
import type { DashboardSubTab } from '../../views/DashboardView';
import type { SystemSettingsTab } from '../../views/SystemSettingsView';
import type { SchoolPolicyId } from '../../lib/schoolPermissions';
import type { ThaiHoliday } from '../../lib/thaiHolidays';
import { getModuleTone } from '../../lib/moduleTheme';
import { FutureIconBadge, FutureNavIcon } from '../common/FutureIcon';

export interface AdminCategoryActionItem {
  id: string;
  label: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
  onClick: () => void;
}

interface AdminDashboardWorkspaceProps {
  lang: AppLanguage;
  systemConfig: SystemConfig;
  school?: School;
  currentUser?: AuthUser | null;
  todayStr: string;
  yesterdayStr: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  todayHoliday: ThaiHoliday | null;
  isTodayWeekend: boolean;
  // Counts & KPIs
  totalStudents: number;
  activeStudents: number;
  teachersCount: number;
  coursesCount: number;
  gradesCount: number;
  todayScheduledSlots: TimetableSlot[];
  teacherLeavesTodayCount: number;
  totalForDate: number;
  presentCount: number;
  lateCount: number;
  onTimePercent: number;
  uncheckedTodayCount: number;
  uncheckedPeriodsTodayCount?: number;
  selfieCount: number;
  pendingLeaveCount: number;
  ungradedHomeworkCount: number;
  sdqCount: number;
  behaviorCount: number;
  infirmaryCount: number;
  announcementsCount: number;
  unclaimedCentralPacksCount: number;
  completedOnboardingCount: number;
  showOnboardingCard: boolean;
  canViewExecutiveMonitor: boolean;
  canViewEarlyWarning: boolean;
  isModuleEnabled: (tab: NavTab) => boolean;
  // System Control & Mode Switching
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  campusGates?: CampusGateGeofence[];
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  adminTeachersCount?: number;
  onOpenSystemSettingsTab?: (tab: SystemSettingsTab) => void;
  // Lists
  displayRecords: AttendanceRecord[];
  fallbackAvatarSvg: (name?: string) => string;
  // Handlers
  onNavigate: (tab: NavTab) => void;
  onSelectSubTab: (subTab: DashboardSubTab) => void;
  onOpenPhotoRecord: (rec: AttendanceRecord) => void;
  onOpenDrawer: (mode: 'onboarding') => void;
  onExportCsv: () => void;
  onOpenCentralExamPopup?: () => void;
  simplifiedView?: boolean;
  onToggleSimplifiedView?: () => void;
}

export const AdminDashboardWorkspace: React.FC<AdminDashboardWorkspaceProps> = ({
  lang,
  systemConfig,
  school,
  currentUser,
  todayStr,
  yesterdayStr,
  selectedDate,
  onSelectDate,
  todayHoliday,
  isTodayWeekend,
  totalStudents,
  activeStudents,
  teachersCount,
  coursesCount,
  gradesCount,
  todayScheduledSlots,
  teacherLeavesTodayCount,
  totalForDate,
  presentCount,
  lateCount,
  onTimePercent,
  uncheckedTodayCount,
  uncheckedPeriodsTodayCount = 0,
  pendingLeaveCount,
  ungradedHomeworkCount,
  announcementsCount,
  unclaimedCentralPacksCount,
  completedOnboardingCount,
  showOnboardingCard,
  isModuleEnabled,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
  campusGates = [],
  schoolPermissions,
  onOpenSystemSettingsTab,
  displayRecords,
  fallbackAvatarSvg,
  onNavigate,
  onSelectSubTab,
  onOpenPhotoRecord,
  onOpenDrawer,
  onExportCsv,
  onOpenCentralExamPopup,
  simplifiedView = false,
  onToggleSimplifiedView,
}) => {
  const totalPendingActions = pendingLeaveCount + ungradedHomeworkCount;
  const activeGatesCount = campusGates.filter((gate) => gate.isActive !== false).length;
  const hasGpsConfigured = Boolean(school?.latitude && school?.longitude) || activeGatesCount > 0;
  const enabledPoliciesCount = schoolPermissions
    ? Object.values(schoolPermissions).filter(Boolean).length
    : 0;
  const totalPoliciesCount = schoolPermissions
    ? Object.keys(schoolPermissions).length
    : 12;
  const lateCutoffTime = systemConfig.lateCutoffTime || '08:00';
  const openControlTab = (subTab: SystemSettingsTab, fallbackNav: NavTab) => {
    if (onOpenSystemSettingsTab) {
      onOpenSystemSettingsTab(subTab);
    } else {
      onNavigate(fallbackNav);
    }
  };

  // Urgent Action Queue: ONLY true pending operational items (no generic timetable fallback)
  const urgentRows = useMemo(() => {
    const rows: Array<{
      id: string;
      groupLabel: string;
      groupColorClass: string;
      label: string;
      value: string;
      urgent?: boolean;
      onClick: () => void;
    }> = [];

    if (pendingLeaveCount > 0 && isModuleEnabled('attendance')) {
      rows.push({
        id: 'leaves',
        groupLabel: lang === 'th' ? 'กิจการ' : 'Care',
        groupColorClass: 'text-emerald-700 dark:text-emerald-300',
        label: lang === 'th' ? 'ใบลารออนุมัติ' : 'Pending Leaves',
        value: `${pendingLeaveCount} ${lang === 'th' ? 'รายการ' : 'items'}`,
        urgent: true,
        onClick: () => onNavigate('mobile_checkin'),
      });
    }
    if (uncheckedPeriodsTodayCount > 0 && !todayHoliday && !isTodayWeekend && isModuleEnabled('timetable')) {
      rows.push({
        id: 'unchecked-periods',
        groupLabel: lang === 'th' ? 'รายคาบ' : 'Periods',
        groupColorClass: 'text-amber-700 dark:text-amber-300',
        label: lang === 'th' ? 'คาบเรียนวันนี้ยังไม่เช็กชื่อ' : 'Unchecked Periods Today',
        value: `${uncheckedPeriodsTodayCount} ${lang === 'th' ? 'คาบ' : 'periods'}`,
        urgent: true,
        onClick: () => onSelectSubTab('realtime_daily'),
      });
    }
    if (teacherLeavesTodayCount > 0 && isModuleEnabled('timetable')) {
      rows.push({
        id: 'staff-leave',
        groupLabel: lang === 'th' ? 'วิชาการ' : 'Academics',
        groupColorClass: 'text-blue-700 dark:text-blue-300',
        label: lang === 'th' ? 'ครูลาวันนี้ (จัดครูสอนแทน)' : 'Teachers on Leave Today',
        value: `${teacherLeavesTodayCount} ${lang === 'th' ? 'คน' : 'staff'}`,
        urgent: true,
        onClick: () => onNavigate('timetable'),
      });
    }
    if (!simplifiedView && unclaimedCentralPacksCount > 0 && isModuleEnabled('central_exam_hub')) {
      rows.push({
        id: 'central-exam',
        groupLabel: lang === 'th' ? 'ข้อสอบ' : 'Exams',
        groupColorClass: 'text-violet-700 dark:text-violet-300',
        label: lang === 'th' ? 'ชุดข้อสอบกลางมาตรฐานรอรับ' : 'Central Exam Packs Ready',
        value: `${unclaimedCentralPacksCount} ${lang === 'th' ? 'ชุด' : 'packs'}`,
        urgent: true,
        onClick: () => {
          if (currentUser?.role === 'admin' && onOpenCentralExamPopup) {
            onOpenCentralExamPopup();
          } else {
            onNavigate('central_exam_hub');
          }
        },
      });
    }
    if (ungradedHomeworkCount > 0 && isModuleEnabled('homework')) {
      rows.push({
        id: 'homework',
        groupLabel: lang === 'th' ? 'การบ้าน' : 'Homework',
        groupColorClass: 'text-emerald-700 dark:text-emerald-300',
        label: lang === 'th' ? 'การบ้านรอตรวจ' : 'Homework to Grade',
        value: `${ungradedHomeworkCount} ${lang === 'th' ? 'ชิ้น' : 'items'}`,
        urgent: true,
        onClick: () => onNavigate('homework'),
      });
    }
    if (uncheckedTodayCount > 0 && !todayHoliday && !isTodayWeekend && isModuleEnabled('attendance')) {
      rows.push({
        id: 'unchecked',
        groupLabel: lang === 'th' ? 'ประตู' : 'Gate',
        groupColorClass: 'text-emerald-700 dark:text-emerald-300',
        label: lang === 'th' ? 'นักเรียนยังไม่สแกนเข้าวันนี้' : 'Unchecked Students Today',
        value: `${uncheckedTodayCount} ${lang === 'th' ? 'คน' : 'students'}`,
        onClick: () => onNavigate('attendance'),
      });
    }
    const rowOrder = ['leaves', 'unchecked-periods', 'staff-leave', 'homework', 'unchecked', 'central-exam'];
    rows.sort((a, b) => rowOrder.indexOf(a.id) - rowOrder.indexOf(b.id));
    return rows.slice(0, 6);
  }, [
    simplifiedView,
    pendingLeaveCount,
    uncheckedPeriodsTodayCount,
    isModuleEnabled,
    lang,
    onNavigate,
    onSelectSubTab,
    teacherLeavesTodayCount,
    unclaimedCentralPacksCount,
    currentUser?.role,
    onOpenCentralExamPopup,
    ungradedHomeworkCount,
    uncheckedTodayCount,
    todayHoliday,
    isTodayWeekend,
  ]);

  // Keep the most frequent operational shortcuts first; setup records remain in the sidebar.
  const quickDepartments: AdminCategoryActionItem[] = useMemo(() => {
    const list: Array<AdminCategoryActionItem | false> = simplifiedView
      ? [
          isModuleEnabled('timetable') && {
            id: 'timetable',
            label: lang === 'th' ? 'ตารางสอนวันนี้' : 'Timetable',
            meta: lang === 'th' ? `${todayScheduledSlots.length} คาบเรียนวันนี้` : `${todayScheduledSlots.length} slots today`,
            icon: Calendar,
            onClick: () => onNavigate('timetable'),
          },
          isModuleEnabled('attendance') && {
            id: 'attendance',
            label: lang === 'th' ? 'เช็คชื่อ & เวลาเรียน' : 'Attendance',
            meta: lang === 'th' ? `เช็คแล้ว ${totalForDate} · มาตรงเวลา ${onTimePercent}%` : `${totalForDate} checked · ${onTimePercent}% on-time`,
            icon: QrCode,
            onClick: () => onNavigate('attendance'),
          },
          isModuleEnabled('gradebook') && {
            id: 'gradebook',
            label: lang === 'th' ? 'บันทึกคะแนน' : 'Gradebook',
            meta: lang === 'th' ? `${gradesCount} รายการคะแนน` : `${gradesCount} grade records`,
            icon: Award,
            onClick: () => onNavigate('gradebook'),
          },
          isModuleEnabled('homework') && {
            id: 'homework',
            label: lang === 'th' ? 'ตรวจการบ้าน & ภาระงาน' : 'Homework & Tasks',
            meta: lang === 'th' ? `รอตรวจ ${ungradedHomeworkCount} ชิ้น` : `${ungradedHomeworkCount} to review`,
            icon: FileCheck2,
            onClick: () => onNavigate('homework'),
          },
          isModuleEnabled('announcements') && {
            id: 'announcements',
            label: lang === 'th' ? 'ประกาศโรงเรียน' : 'Announcements',
            meta: lang === 'th' ? `${announcementsCount} ประกาศในระบบ` : `${announcementsCount} posts`,
            icon: BellRing,
            onClick: () => onNavigate('announcements'),
          },
          isModuleEnabled('students') && {
            id: 'students',
            label: lang === 'th' ? 'ค้นทะเบียนนักเรียน' : 'Student Registry',
            meta: lang === 'th' ? `${totalStudents} คน · กำลังเรียน ${activeStudents}` : `${totalStudents} total · ${activeStudents} active`,
            icon: Users,
            onClick: () => onNavigate('students'),
          },
        ]
      : [
          isModuleEnabled('timetable') && {
            id: 'timetable',
            label: lang === 'th' ? 'ตารางสอนวันนี้' : 'Today’s Timetable',
            meta: lang === 'th' ? `${todayScheduledSlots.length} คาบเรียนวันนี้` : `${todayScheduledSlots.length} slots today`,
            icon: Calendar,
            onClick: () => onNavigate('timetable'),
          },
          isModuleEnabled('attendance') && {
            id: 'attendance',
            label: lang === 'th' ? 'เช็คชื่อโรงเรียน' : 'Attendance',
            meta: lang === 'th' ? `เช็คแล้ว ${totalForDate} · มาตรงเวลา ${onTimePercent}%` : `${totalForDate} checked · ${onTimePercent}% on-time`,
            icon: QrCode,
            onClick: () => onNavigate('attendance'),
          },
          isModuleEnabled('gradebook') && {
            id: 'gradebook',
            label: lang === 'th' ? 'บันทึกคะแนน & ตัวชี้วัด' : 'Grades & Indicators',
            meta: unclaimedCentralPacksCount > 0
              ? (lang === 'th' ? `${gradesCount} คะแนน · ข้อสอบใหม่ ${unclaimedCentralPacksCount}` : `${gradesCount} grades · ${unclaimedCentralPacksCount} new`)
              : (lang === 'th' ? `${gradesCount} รายการคะแนน` : `${gradesCount} grade records`),
            icon: Award,
            urgent: unclaimedCentralPacksCount > 0,
            onClick: () => onNavigate('gradebook'),
          },
          isModuleEnabled('homework') && {
            id: 'homework',
            label: lang === 'th' ? 'ตรวจการบ้าน & ภาระงาน' : 'Homework & Tasks',
            meta: lang === 'th' ? `รอตรวจ ${ungradedHomeworkCount} ชิ้น` : `${ungradedHomeworkCount} to review`,
            icon: FileCheck2,
            onClick: () => onNavigate('homework'),
          },
          isModuleEnabled('announcements') && {
            id: 'announcements',
            label: lang === 'th' ? 'ข่าวสาร & ประกาศโรงเรียน' : 'Announcements',
            meta: lang === 'th' ? `${announcementsCount} ประกาศในระบบ` : `${announcementsCount} posts`,
            icon: BellRing,
            onClick: () => onNavigate('announcements'),
          },
          isModuleEnabled('students') && {
            id: 'students',
            label: lang === 'th' ? 'ทะเบียนนักเรียน' : 'Student Registry',
            meta: lang === 'th' ? `${totalStudents} คน · กำลังเรียน ${activeStudents}` : `${totalStudents} total · ${activeStudents} active`,
            icon: Users,
            onClick: () => onNavigate('students'),
          },
        ];

    return list.filter((item): item is AdminCategoryActionItem => Boolean(item));
  }, [
    simplifiedView,
    isModuleEnabled,
    lang,
    totalStudents,
    activeStudents,
    totalForDate,
    onTimePercent,
    todayScheduledSlots.length,
    gradesCount,
    ungradedHomeworkCount,
    unclaimedCentralPacksCount,
    announcementsCount,
    onNavigate,
  ]);

  return (
    <div className="dash-scroll-stack animate-in fade-in duration-150">
      {/* 1. UNBOXED ACTION BAR (No redundant school/date card box stacked below header) */}
      <div
        aria-label={lang === 'th' ? 'ทางลัดผู้บริหารสถานศึกษา' : 'Executive shortcuts'}
        className="no-print flex flex-wrap items-center justify-between gap-2.5"
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 text-xs text-[var(--color-text-muted)] tabular-nums">
          {(todayHoliday || isTodayWeekend) && (
            <span>
              {todayHoliday
                ? (lang === 'th' ? `วันหยุด: ${todayHoliday.nameTh}` : `Holiday: ${todayHoliday.nameTh}`)
                : (lang === 'th' ? 'วันหยุดสุดสัปดาห์' : 'Weekend')}
            </span>
          )}
          {teacherLeavesTodayCount > 0 && (
            <>
              {(todayHoliday || isTodayWeekend) && <span aria-hidden="true">·</span>}
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {lang === 'th' ? `ครูลาวันนี้ ${teacherLeavesTodayCount} ท่าน` : `${teacherLeavesTodayCount} staff on leave today`}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
          {onToggleSimplifiedView && (
            <button
              type="button"
              data-guide-id="admin-simplified-view-toggle"
              aria-pressed={simplifiedView}
              onClick={onToggleSimplifiedView}
              title={
                simplifiedView
                  ? (lang === 'th' ? 'ปิดมุมมองแบบกระชับเพื่อแสดงตั้งค่าเทคนิคทั้งหมด' : 'Show full admin menus & technical settings')
                  : (lang === 'th' ? 'ซ่อนตั้งค่าเทคนิค แสดงเฉพาะเมนูหลัก (นักเรียน รายวิชา เช็คชื่อ)' : 'Hide technical settings and keep core tabs')
              }
              className={
                simplifiedView
                  ? 'btn-tool-neutral'
                  : 'btn-tool-neutral'
              }
              data-active={simplifiedView ? 'true' : undefined}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'มุมมองกระชับ' : 'Simplified'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportCsv}
            className="btn-tool-neutral"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'}</span>
          </button>
          {isModuleEnabled('attendance') && (
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="btn-action-primary"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เช็คชื่อ' : 'Attendance'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 4 KPI CELLS (Calm Neutral Hairline Grid) */}
      <section
        data-guide-id="dashboard-kpis"
        aria-label={lang === 'th' ? 'ตัวชี้วัดหลักสถานศึกษา' : 'Key Campus Metrics'}
        className="saas-kpi-strip print-avoid-break"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
          {/* KPI 1: Attendance */}
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('attendance')) onNavigate('attendance');
            }}
            className="tone-2 saas-kpi-cell saas-kpi-cell-interactive p-5 flex flex-col justify-between gap-2.5 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--tone)]">
                <FutureIconBadge tone="tone-2" size="xs" variant="glass">
                  <FutureNavIcon tab="attendance" size={14} active />
                </FutureIconBadge>
                <span>{lang === 'th' ? 'มาตรงเวลาวันนี้' : 'On-Time Today'}</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--tone)] opacity-70 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="type-kpi tabular-nums">{onTimePercent}%</span>
              <span className="type-meta tabular-nums truncate">
                {lang === 'th' ? `เช็ค ${presentCount}/${totalForDate} · สาย ${lateCount}` : `${presentCount}/${totalForDate} · ${lateCount} late`}
              </span>
            </div>
          </button>

          {/* KPI 2: Pending Approvals */}
          <button
            type="button"
            onClick={() => {
              if (pendingLeaveCount > 0) onNavigate('mobile_checkin');
              else if (isModuleEnabled('homework')) onNavigate('homework');
            }}
            className="tone-3 saas-kpi-cell saas-kpi-cell-interactive p-5 flex flex-col justify-between gap-2.5 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--tone)]">
                <FutureIconBadge tone="tone-3" size="xs" variant="glass">
                  <FutureNavIcon tab="executive_warning" size={14} active />
                </FutureIconBadge>
                <span>{lang === 'th' ? 'รอดำเนินการ & อนุมัติ' : 'Pending Actions'}</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--tone)] opacity-70 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className={`type-kpi tabular-nums ${totalPendingActions > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                {totalPendingActions}
              </span>
              <span className="type-meta tabular-nums truncate">
                {lang === 'th'
                  ? `ใบลา ${pendingLeaveCount} · งานรอตรวจ ${ungradedHomeworkCount}`
                  : `${pendingLeaveCount} leaves · ${ungradedHomeworkCount} hw`}
              </span>
            </div>
          </button>

          {/* KPI 3: Campus Directory */}
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('students')) onNavigate('students');
            }}
            className="tone-1 saas-kpi-cell saas-kpi-cell-interactive p-5 flex flex-col justify-between gap-2.5 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--tone)]">
                <FutureIconBadge tone="tone-1" size="xs" variant="glass">
                  <FutureNavIcon tab="students" size={14} active />
                </FutureIconBadge>
                <span>{lang === 'th' ? 'ผู้เรียน & วิชาการ' : 'Students & Academics'}</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--tone)] opacity-70 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="type-kpi tabular-nums">{totalStudents}</span>
              <span className="type-meta tabular-nums truncate">
                {lang === 'th' ? `ครู ${teachersCount} · วิชา ${coursesCount} · คาบ ${todayScheduledSlots.length}` : `${teachersCount} staff · ${coursesCount} courses`}
              </span>
            </div>
          </button>

          {/* KPI 4: Courses & Schedule */}
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('courses')) onNavigate('courses');
            }}
            className="tone-4 saas-kpi-cell saas-kpi-cell-interactive p-5 flex flex-col justify-between gap-2.5 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--tone)]">
                <FutureIconBadge tone="tone-4" size="xs" variant="glass">
                  <FutureNavIcon tab="timetable" size={14} active />
                </FutureIconBadge>
                <span>{lang === 'th' ? 'รายวิชา & ตารางสอน' : 'Courses & Schedule'}</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--tone)] opacity-70 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="type-kpi tabular-nums">{coursesCount}</span>
              <span className="type-meta tabular-nums truncate">
                {lang === 'th' ? `วิชา · คาบวันนี้ ${todayScheduledSlots.length} · ครู ${teachersCount}` : `${todayScheduledSlots.length} slots · ${teachersCount} staff`}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 3. PRIMARY ABOVE-THE-FOLD WORKSPACE: PRIORITY QUEUE & LIVE CHECK-INS */}
      <div className="dashboard-print-grid relative dash-grid grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* LEFT: Urgent Admin Queue (Action First) */}
        <section
          data-guide-id="dashboard-today-desk"
          aria-label={lang === 'th' ? 'งานด่วนที่ต้องติดตาม' : 'Priority Action Queue'}
          className="tone-3 saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
        >
          <div>
            <div className="saas-card-header">
              <div className="ui-section-heading min-w-0">
                <span className="tone-chip w-8 h-8 rounded-xl" aria-hidden="true">
                  <FutureNavIcon tab="executive_warning" size={16} active />
                </span>
                <h2 className="type-section-title truncate">
                  {lang === 'th' ? 'คิวงานด่วนที่ต้องจัดการ' : 'Priority Action Queue'}
                </h2>
              </div>
              {isModuleEnabled('attendance') && (
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="no-print type-meta font-semibold text-[var(--tone)] hover:underline cursor-pointer shrink-0"
                >
                  {lang === 'th' ? 'เช็คชื่อ →' : 'Attendance →'}
                </button>
              )}
            </div>

            <div className="saas-card-body">
              {urgentRows.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ไม่มีรายการค้างดำเนินการเร่งด่วนในขณะนี้' : 'No urgent items pending'}
                  </p>
                  {isModuleEnabled('timetable') && (
                    <button
                      type="button"
                      onClick={() => onNavigate('timetable')}
                      className="btn-tool-neutral px-3 py-1.5 mx-auto"
                    >
                      <span>{lang === 'th' ? 'ดูตารางสอนวันนี้' : 'View Today’s Timetable'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {urgentRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={row.onClick}
                      className="print-keep w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[11px] font-bold shrink-0 ${row.groupColorClass}`}>
                          {row.groupLabel}
                        </span>
                        <span className="text-[var(--color-text-muted)]" aria-hidden="true">·</span>
                        <span className="type-card-title truncate">{row.label}</span>
                      </div>
                      <span
                        className={`type-meta font-semibold tabular-nums shrink-0 inline-flex items-center gap-1.5 ${
                          row.urgent ? 'text-amber-700 dark:text-amber-300' : ''
                        }`}
                      >
                        {row.urgent && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{row.value}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: Recent Check-ins */}
        <section
          aria-label={lang === 'th' ? 'เช็คชื่อล่าสุด' : 'Recent Check-ins'}
          className="tone-4 saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
        >
          <div>
            <div className="saas-card-header">
              <div className="ui-section-heading min-w-0">
                <span className="tone-chip w-8 h-8 rounded-xl" aria-hidden="true">
                  <FutureNavIcon tab="attendance" size={16} active />
                </span>
                <h2 className="type-section-title truncate">
                  {lang === 'th' ? 'เช็คชื่อเข้า-ออกล่าสุด' : 'Recent Check-ins'}
                </h2>
              </div>

              <div className="no-print flex items-center gap-3 shrink-0">
                <div className="saas-control-group type-meta">
                  <button
                    type="button"
                    onClick={() => onSelectDate(todayStr)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                      selectedDate === todayStr
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    {lang === 'th' ? 'วันนี้' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDate(yesterdayStr)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                      selectedDate === yesterdayStr
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    {lang === 'th' ? 'เมื่อวาน' : 'Yesterday'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSubTab('realtime_daily')}
                  className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
                >
                  {lang === 'th' ? 'เรดาร์เรียลไทม์ →' : 'Live Radar →'}
                </button>
              </div>
            </div>

            <div className="saas-card-body">
              {displayRecords.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="type-meta">
                    {lang === 'th' ? `ยังไม่มีรายการเช็คชื่อวันที่ ${selectedDate}` : `No check-ins for ${selectedDate}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('mobile_checkin')}
                    className="btn-action-primary px-4 py-2 mx-auto"
                  >
                    <span>{lang === 'th' ? 'เปิดเช็คชื่อมือถือ' : 'Open Check-in'}</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {displayRecords.slice(0, 5).map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => onOpenPhotoRecord(rec)}
                      className="print-keep w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AttendancePhoto
                          src={rec.photoUrl || rec.userAvatar || fallbackAvatarSvg(rec.userName)}
                          alt={rec.userName || 'User'}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <span className="type-card-title truncate">{rec.userName}</span>
                        <span className="type-meta truncate hidden sm:inline tabular-nums">
                          · {rec.userDepartmentOrRoom || rec.userRole} · {rec.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`type-meta font-semibold ${
                            rec.status === 'present'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {rec.status === 'present'
                            ? (lang === 'th' ? 'ตรงเวลา' : 'On-time')
                            : (lang === 'th' ? 'มาสาย' : 'Late')}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 4. COMPACT 1-ROW ROUTINE SHORTCUT STRIP */}
      <nav
        aria-label={lang === 'th' ? 'ทางลัดงานประจำ' : 'Daily Shortcuts'}
        className="no-print flex flex-wrap items-center justify-between gap-2 pt-0.5"
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] mr-1 shrink-0">
            {lang === 'th' ? 'งานประจำ:' : 'Shortcuts:'}
          </span>
          {quickDepartments.map((item) => {
            const Icon = item.icon;
            const navKey = (item.id === 'gps'
              ? 'school_gps'
              : item.id === 'permissions'
                ? 'school_permissions'
                : item.id) as NavTab;
            const itemTone = getModuleTone(navKey);
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={item.meta}
                className={`${itemTone} btn-tool-neutral h-8 pl-1.5 pr-2.5 text-xs whitespace-nowrap shrink-0 gap-1.5 ${
                  item.urgent ? 'border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200' : ''
                }`}
              >
                <span className="tone-chip w-5 h-5 rounded-md" aria-hidden="true">
                  <FutureNavIcon tab={navKey} fallback={Icon} size={12} active />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {!simplifiedView && (
          <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
            {showOnboardingCard && (
              <button
                type="button"
                onClick={() => onOpenDrawer('onboarding')}
                className="font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? `ตั้งค่าเริ่มต้น ${completedOnboardingCount}/3` : `Setup ${completedOnboardingCount}/3`}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openControlTab('control_overview', 'system_settings')}
              title={hasGpsConfigured
                ? (lang === 'th' ? `GPS ${activeGatesCount || 1} จุด · ตัดสาย ${lateCutoffTime} · สิทธิ์ ${enabledPoliciesCount}/${totalPoliciesCount}` : `GPS ready · Late ${lateCutoffTime}`)
                : (lang === 'th' ? `ยังไม่ปักพิกัด · สิทธิ์ ${enabledPoliciesCount}/${totalPoliciesCount}` : `No GPS · ${enabledPoliciesCount}/${totalPoliciesCount} rules`)}
              className="font-semibold text-[var(--color-text-muted)] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'ตั้งค่าระบบ' : 'Settings'}</span>
            </button>
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('admin_superadmin_desk')}
                className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
              >
                {lang === 'th' ? 'Super Admin →' : 'Super Admin →'}
              </button>
            )}
          </div>
        )}
      </nav>
    </div>
  );
};
