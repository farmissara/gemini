import React, { useMemo } from 'react';
import AttendancePhoto from '../AttendancePhoto';
import {
  Activity,
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
  Receipt,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  CampusGateGeofence,
  School,
  SchoolFeatureFlags,
  SystemConfig,
  TimetableSlot,
} from '../../types';
import type { NavTab } from '../layout/Sidebar';
import type { DashboardSubTab } from '../../views/DashboardView';
import type { SystemSettingsTab } from '../../views/SystemSettingsView';
import type { SchoolPolicyId } from '../../lib/schoolPermissions';
import type { ThaiHoliday } from '../../lib/thaiHolidays';

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
  selfieCount: number;
  pendingLeaveCount: number;
  ungradedHomeworkCount: number;
  pendingSlipCount: number;
  pendingInvoicesCount: number;
  collectionRate: number;
  lineConnectedCount: number;
  linePercent: number;
  sdqCount: number;
  behaviorCount: number;
  infirmaryCount: number;
  announcementsCount: number;
  unclaimedCentralPacksCount: number;
  completedOnboardingCount: number;
  showOnboardingCard: boolean;
  canViewFinancials: boolean;
  canViewExecutiveMonitor: boolean;
  canViewEarlyWarning: boolean;
  isModuleEnabled: (tab: NavTab) => boolean;
  // System Control & Mode Switching
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  campusGates?: CampusGateGeofence[];
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  featureFlags?: SchoolFeatureFlags;
  adminTeachersCount?: number;
  onOpenSystemSettingsTab?: (tab: SystemSettingsTab) => void;
  // Lists
  displayRecords: AttendanceRecord[];
  fallbackAvatarSvg: (name?: string) => string;
  // Handlers
  onNavigate: (tab: NavTab) => void;
  onSelectSubTab: (subTab: DashboardSubTab) => void;
  onOpenPhotoRecord: (rec: AttendanceRecord) => void;
  onOpenDrawer: (mode: 'onboarding' | 'guardian_line') => void;
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
  pendingLeaveCount,
  ungradedHomeworkCount,
  pendingSlipCount,
  pendingInvoicesCount,
  collectionRate,
  lineConnectedCount,
  linePercent,
  announcementsCount,
  unclaimedCentralPacksCount,
  completedOnboardingCount,
  showOnboardingCard,
  canViewFinancials,
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
  const totalPendingActions = pendingLeaveCount + ungradedHomeworkCount + pendingSlipCount;
  const activeGatesCount = campusGates.filter((gate) => gate.isActive !== false).length;
  const hasGpsConfigured = Boolean(school?.latitude && school?.longitude) || activeGatesCount > 0;
  const enabledPoliciesCount = schoolPermissions
    ? Object.values(schoolPermissions).filter(Boolean).length
    : 0;
  const totalPoliciesCount = schoolPermissions
    ? Object.keys(schoolPermissions).length
    : 12;
  const lateCutoffTime = systemConfig.lineNotificationSettings?.lateCutoffTime || '08:00';
  const openControlTab = (subTab: SystemSettingsTab, fallbackNav: NavTab) => {
    if (onOpenSystemSettingsTab) {
      onOpenSystemSettingsTab(subTab);
    } else {
      onNavigate(fallbackNav);
    }
  };

  // Urgent Action Queue (Primary above-the-fold operational list)
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

    if (!simplifiedView && showOnboardingCard) {
      rows.push({
        id: 'onboarding',
        groupLabel: lang === 'th' ? 'ตั้งค่า' : 'Setup',
        groupColorClass: 'text-blue-700 dark:text-blue-300',
        label: lang === 'th' ? 'เช็กลิสต์ตั้งค่าโรงเรียนเริ่มต้น' : 'School Setup Checklist',
        value: `${completedOnboardingCount}/3`,
        urgent: completedOnboardingCount < 3,
        onClick: () => onOpenDrawer('onboarding'),
      });
    }
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
    if (!simplifiedView && pendingSlipCount > 0 && canViewFinancials) {
      rows.push({
        id: 'slips',
        groupLabel: lang === 'th' ? 'การเงิน' : 'Finance',
        groupColorClass: 'text-amber-700 dark:text-amber-300',
        label: lang === 'th' ? 'สลิปค่าเทอมรอตรวจสอบ' : 'Payment Slips to Verify',
        value: `${pendingSlipCount} ${lang === 'th' ? 'รายการ' : 'slips'}`,
        urgent: true,
        onClick: () => onNavigate('billing'),
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
        groupLabel: lang === 'th' ? 'กิจการ' : 'Care',
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
        groupLabel: lang === 'th' ? 'เช็คชื่อ' : 'Attendance',
        groupColorClass: 'text-emerald-700 dark:text-emerald-300',
        label: lang === 'th' ? 'นักเรียนยังไม่เช็คชื่อวันนี้' : 'Unchecked Students Today',
        value: `${uncheckedTodayCount} ${lang === 'th' ? 'คน' : 'students'}`,
        onClick: () => onNavigate('attendance'),
      });
    }
    if (isModuleEnabled('timetable') && !rows.some((row) => row.id === 'timetable')) {
      rows.push({
        id: 'timetable',
        groupLabel: lang === 'th' ? 'วิชาการ' : 'Academics',
        groupColorClass: 'text-blue-700 dark:text-blue-300',
        label: lang === 'th' ? 'ตารางสอนวันนี้' : 'Today’s Timetable',
        value: `${todayScheduledSlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`,
        onClick: () => onNavigate('timetable'),
      });
    }
    const rowOrder = ['timetable', 'unchecked', 'staff-leave', 'leaves', 'homework', 'slips', 'central-exam', 'onboarding'];
    rows.sort((a, b) => rowOrder.indexOf(a.id) - rowOrder.indexOf(b.id));
    return rows.slice(0, 6);
  }, [
    simplifiedView,
    showOnboardingCard,
    completedOnboardingCount,
    onOpenDrawer,
    pendingLeaveCount,
    isModuleEnabled,
    lang,
    onNavigate,
    pendingSlipCount,
    canViewFinancials,
    teacherLeavesTodayCount,
    unclaimedCentralPacksCount,
    currentUser?.role,
    onOpenCentralExamPopup,
    ungradedHomeworkCount,
    uncheckedTodayCount,
    todayHoliday,
    isTodayWeekend,
    todayScheduledSlots.length,
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
          canViewFinancials && isModuleEnabled('billing')
            ? {
                id: 'billing',
                label: lang === 'th' ? 'ค่าเทอม & ตรวจสอบสลิป' : 'Tuition & Slips',
                meta: pendingSlipCount > 0
                  ? (lang === 'th' ? `รอตรวจ ${pendingSlipCount} สลิป · ค้าง ${pendingInvoicesCount}` : `${pendingSlipCount} slips · ${pendingInvoicesCount} unpaid`)
                  : (lang === 'th' ? `จัดเก็บแล้ว ${collectionRate}%` : `${collectionRate}% collected`),
                icon: Receipt,
                urgent: pendingSlipCount > 0,
                onClick: () => onNavigate('billing'),
              }
            : isModuleEnabled('announcements') && {
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
    canViewFinancials,
    pendingSlipCount,
    pendingInvoicesCount,
    collectionRate,
    announcementsCount,
    hasGpsConfigured,
    activeGatesCount,
    lateCutoffTime,
    enabledPoliciesCount,
    totalPoliciesCount,
    onNavigate,
  ]);

  return (
    <div className="dash-scroll-stack animate-in fade-in duration-150">
      {/* 1. CLEAN EXECUTIVE BRIEF HEADER */}
      <section
        aria-label={lang === 'th' ? 'ทางลัดผู้บริหารสถานศึกษา' : 'Executive shortcuts'}
        className="no-print morning-brief-strip px-5 py-3 flex justify-end"
      >
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                  ? 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap'
                  : 'btn-tool-neutral px-3.5 py-2 whitespace-nowrap'
              }
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'มุมมองแบบกระชับ' : 'Simplified View'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportCsv}
            className="btn-tool-neutral px-3.5 py-2 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
            <span>{lang === 'th' ? 'ส่งออก CSV วันนี้' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSubTab('realtime_daily')}
            className="btn-tool-tone px-3.5 py-2 whitespace-nowrap"
            title={lang === 'th' ? 'เปิดเรดาร์เช็กอินใบหน้า ขาด/ลา/สาย และความพร้อมห้องเรียนแบบเรียลไทม์' : 'Open Real-Time Daily Radar'}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'เรียลไทม์ประจำวัน' : 'Live Daily Radar'}</span>
          </button>
          {isModuleEnabled('attendance') && (
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="btn-action-primary px-3.5 py-2 whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เช็คชื่อโรงเรียน' : 'Attendance'}</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. 4 KPI CELLS (Single-Elevation Hairline Grid) */}
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
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-meta font-semibold text-emerald-700 dark:text-emerald-300">
                {lang === 'th' ? 'มาตรงเวลาวันนี้' : 'On-Time Today'}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="type-kpi tabular-nums text-emerald-700 dark:text-emerald-300">{onTimePercent}%</span>
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
              else if (pendingSlipCount > 0 && canViewFinancials) onNavigate('billing');
              else if (isModuleEnabled('homework')) onNavigate('homework');
            }}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-meta font-semibold text-amber-700 dark:text-amber-300">
                {lang === 'th' ? 'รอดำเนินการ & อนุมัติ' : 'Pending Actions'}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className={`type-kpi tabular-nums ${totalPendingActions > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                {totalPendingActions}
              </span>
              <span className="type-meta tabular-nums truncate">
                {lang === 'th'
                  ? `ลา ${pendingLeaveCount} · สลิป ${pendingSlipCount} · งาน ${ungradedHomeworkCount}`
                  : `${pendingLeaveCount} leaves · ${pendingSlipCount} slips · ${ungradedHomeworkCount} hw`}
              </span>
            </div>
          </button>

          {/* KPI 3: Campus Directory */}
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('students')) onNavigate('students');
            }}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-meta font-semibold text-blue-700 dark:text-blue-300">
                {lang === 'th' ? 'ผู้เรียน & วิชาการ' : 'Students & Academics'}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="type-kpi tabular-nums text-blue-700 dark:text-blue-300">{totalStudents}</span>
              <span className="type-meta tabular-nums truncate">
                {lang === 'th' ? `ครู ${teachersCount} · วิชา ${coursesCount} · คาบ ${todayScheduledSlots.length}` : `${teachersCount} staff · ${coursesCount} courses`}
              </span>
            </div>
          </button>

          {/* KPI 4: Courses & Schedule in Simplified View OR Guardian LINE & Tuition in Full View */}
          {simplifiedView ? (
            <button
              type="button"
              onClick={() => {
                if (isModuleEnabled('courses')) onNavigate('courses');
              }}
              className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="type-meta font-semibold text-violet-700 dark:text-violet-300">
                  {lang === 'th' ? 'รายวิชา & ตารางสอน' : 'Courses & Schedule'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
              </div>
              <div className="flex items-baseline gap-2.5 min-w-0">
                <span className="type-kpi tabular-nums text-violet-700 dark:text-violet-300">{coursesCount}</span>
                <span className="type-meta tabular-nums truncate">
                  {lang === 'th' ? `วิชา · คาบวันนี้ ${todayScheduledSlots.length} · ครู ${teachersCount}` : `${todayScheduledSlots.length} slots · ${teachersCount} staff`}
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenDrawer('guardian_line')}
              className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="type-meta font-semibold text-violet-700 dark:text-violet-300">
                  {lang === 'th' ? 'LINE ผู้ปกครอง & การเงิน' : 'LINE & Tuition'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
              </div>
              <div className="flex items-baseline gap-2.5 min-w-0">
                <span className="type-kpi tabular-nums text-violet-700 dark:text-violet-300">{linePercent}%</span>
                <span className="type-meta tabular-nums truncate">
                  {canViewFinancials
                    ? (lang === 'th' ? `${lineConnectedCount}/${totalStudents} บ้าน · เก็บค่าเทอม ${collectionRate}%` : `${lineConnectedCount} LINE · ${collectionRate}% paid`)
                    : (lang === 'th' ? `${lineConnectedCount}/${totalStudents} ครอบครัว` : `${lineConnectedCount}/${totalStudents} families`)}
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 3. PRIMARY ABOVE-THE-FOLD WORKSPACE: PRIORITY QUEUE & LIVE CHECK-INS */}
      <div className="dashboard-print-grid relative dash-grid grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* LEFT: Urgent Admin Queue (Action First) */}
        <section
          data-guide-id="dashboard-today-desk"
          aria-label={lang === 'th' ? 'งานด่วนที่ต้องติดตาม' : 'Priority Action Queue'}
          className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
        >
          <div>
            <div className="saas-card-header">
              <h2 className="type-section-title truncate">
                {lang === 'th' ? 'คิวงานด่วนที่ต้องจัดการ' : 'Priority Action Queue'}
              </h2>
              {isModuleEnabled('attendance') && (
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="no-print type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
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
          className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
        >
          <div>
            <div className="saas-card-header">
              <h2 className="type-section-title truncate">
                {lang === 'th' ? 'เช็คชื่อเข้า-ออกล่าสุด' : 'Recent Check-ins'}
              </h2>

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

      {/* 4. COMPACT 6-CELL DEPARTMENT SHORTCUTS (Replaces duplicate 22-item directory) */}
      <section aria-label={lang === 'th' ? 'ทางลัดงานประจำฝ่าย' : 'Department Shortcuts'} className="no-print saas-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-bold text-[var(--color-text-title)]">
            {lang === 'th' ? 'งานประจำ: ทำตามลำดับ' : 'Daily Work, In Order'}
          </h3>
          <div className="flex items-center gap-3 text-xs">
            {!simplifiedView && showOnboardingCard && (
              <button
                type="button"
                onClick={() => onOpenDrawer('onboarding')}
                title={lang === 'th' ? 'ทำครั้งแรกหรือเมื่อมีการเปลี่ยนแปลงข้อมูลโรงเรียน' : 'Use during initial setup or when school records change'}
                className="font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? `ตั้งค่าเริ่มต้น · ${completedOnboardingCount}/3` : `Initial setup · ${completedOnboardingCount}/3`}</span>
              </button>
            )}
            {!simplifiedView && (
              <button
                type="button"
                onClick={() => openControlTab('control_overview', 'system_settings')}
                title={hasGpsConfigured
                  ? (lang === 'th' ? `ตั้งค่าระบบตามความจำเป็น · GPS ${activeGatesCount || 1} จุด · ตัดสาย ${lateCutoffTime} · สิทธิ์ ${enabledPoliciesCount}/${totalPoliciesCount}` : `System settings as needed · GPS ready · Late ${lateCutoffTime}`)
                  : (lang === 'th' ? `ตั้งค่าระบบตามความจำเป็น · ยังไม่ปักพิกัด · สิทธิ์ ${enabledPoliciesCount}/${totalPoliciesCount}` : `System settings as needed · No GPS · ${enabledPoliciesCount}/${totalPoliciesCount} rules`)}
                className="font-semibold text-[var(--color-text-muted)] hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'ตั้งค่าระบบ · เป็นครั้งคราว' : 'System settings · As needed'}</span>
              </button>
            )}
            {!simplifiedView && currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('admin_superadmin_desk')}
                className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
              >
                {lang === 'th' ? 'ประสานงาน Super Admin →' : 'Super Admin Desk →'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
          {quickDepartments.map((item, idx) => {
            const Icon = item.icon;
            const topRowDivider = idx >= 3 ? 'lg:border-t lg:border-[var(--color-border)]' : '';
            const smRowDivider = idx >= 2 ? 'sm:border-t sm:border-[var(--color-border)] lg:border-t-0' : '';
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`px-4 py-3.5 text-left hover:bg-[var(--color-card-subtle)] transition cursor-pointer flex items-center justify-between gap-3 group ${smRowDivider} ${topRowDivider}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-text-body)] group-hover:text-[var(--color-primary-text)] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--color-text-title)] truncate">
                      {item.label}
                    </p>
                    <p
                      className={`text-[11px] truncate tabular-nums ${
                        item.urgent ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {item.meta}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
