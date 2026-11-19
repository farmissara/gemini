import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  Calendar,
  Camera,
  ChevronRight,
  CreditCard,
  Download,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  QrCode,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  UserCheck,
  Users,
  X,
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
import { formatSemesterLabel } from '../../lib/schoolSettings';
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
  timeGreeting: string;
  userDisplayName: string;
  formattedTodayDate: string;
  todayStr: string;
  yesterdayStr: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  todayHoliday: ThaiHoliday | null;
  upcomingHoliday: ThaiHoliday | null;
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
}

export const AdminDashboardWorkspace: React.FC<AdminDashboardWorkspaceProps> = ({
  lang,
  systemConfig,
  school,
  currentUser,
  timeGreeting,
  userDisplayName,
  formattedTodayDate,
  todayStr,
  yesterdayStr,
  selectedDate,
  onSelectDate,
  todayHoliday,
  upcomingHoliday,
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
  selfieCount,
  pendingLeaveCount,
  ungradedHomeworkCount,
  pendingSlipCount,
  pendingInvoicesCount,
  collectionRate,
  lineConnectedCount,
  linePercent,
  sdqCount,
  behaviorCount,
  infirmaryCount,
  announcementsCount,
  unclaimedCentralPacksCount,
  completedOnboardingCount,
  showOnboardingCard,
  canViewFinancials,
  canViewExecutiveMonitor,
  canViewEarlyWarning,
  isModuleEnabled,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
  campusGates = [],
  schoolPermissions,
  featureFlags,
  adminTeachersCount = 0,
  onOpenSystemSettingsTab,
  displayRecords,
  fallbackAvatarSvg,
  onNavigate,
  onSelectSubTab,
  onOpenPhotoRecord,
  onOpenDrawer,
  onExportCsv,
  onOpenCentralExamPopup,
}) => {
  const [quickFilter, setQuickFilter] = useState('');
  const [activeGroupFilter, setActiveGroupFilter] = useState<'all' | 'academics' | 'student_care' | 'finance_comm' | 'executive_settings'>('all');

  const totalPendingActions = pendingLeaveCount + ungradedHomeworkCount + pendingSlipCount;
  const activeGatesCount = campusGates.filter((g) => g.isActive !== false).length;
  const hasGpsConfigured = Boolean(school?.latitude && school?.longitude) || activeGatesCount > 0;
  const gpsRadiusMeters = school?.geofenceRadiusMeters || 200;
  const enabledPoliciesCount = schoolPermissions
    ? Object.values(schoolPermissions).filter(Boolean).length
    : 0;
  const totalPoliciesCount = schoolPermissions
    ? Object.keys(schoolPermissions).length
    : 12;
  const lateCutoffTime = systemConfig.lineNotificationSettings?.lateCutoffTime || '08:00';
  const absenceCutoffTime = systemConfig.lineNotificationSettings?.absenceCutoffTime || '09:30';
  const aiStudentEnabled = featureFlags?.allowStudentsAi !== false && school?.aiStudentEnabled !== false;
  const studentLoginLabel =
    school?.studentLoginIdentifierType === 'email_only'
      ? (lang === 'th' ? 'อีเมลเท่านั้น' : 'Email only')
      : school?.studentLoginIdentifierType === 'both'
        ? (lang === 'th' ? 'รหัส นร. / อีเมล' : 'ID or Email')
        : (lang === 'th' ? 'รหัสนักเรียน' : 'Student ID');

  const openControlTab = (subTab: SystemSettingsTab, fallbackNav: NavTab) => {
    if (onOpenSystemSettingsTab) {
      onOpenSystemSettingsTab(subTab);
    } else {
      onNavigate(fallbackNav);
    }
  };

  const categoryGroups = useMemo(() => {
    const academicItems: AdminCategoryActionItem[] = [
      isModuleEnabled('students') && {
        id: 'students',
        label: lang === 'th' ? 'ทะเบียนนักเรียน' : 'Student Directory',
        meta: lang === 'th' ? `${totalStudents} คน (กำลังเรียน ${activeStudents})` : `${totalStudents} students`,
        icon: Users,
        onClick: () => onNavigate('students'),
      },
      isModuleEnabled('teachers') && {
        id: 'teachers',
        label: lang === 'th' ? 'บุคลากรและครู' : 'Faculty & Staff',
        meta: lang === 'th' ? `${teachersCount} คน${teacherLeavesTodayCount > 0 ? ` · ลาวันนี้ ${teacherLeavesTodayCount}` : ''}` : `${teachersCount} staff`,
        icon: GraduationCap,
        urgent: teacherLeavesTodayCount > 0,
        onClick: () => onNavigate('teachers'),
      },
      isModuleEnabled('courses') && {
        id: 'courses',
        label: lang === 'th' ? 'รายวิชา & หลักสูตร' : 'Courses & Curriculum',
        meta: lang === 'th' ? `${coursesCount} รายวิชา` : `${coursesCount} courses`,
        icon: BookOpen,
        onClick: () => onNavigate('courses'),
      },
      isModuleEnabled('timetable') && {
        id: 'timetable',
        label: lang === 'th' ? 'ตารางเรียน & ตารางสอน' : 'Timetable & Schedule',
        meta: lang === 'th' ? `วันนี้ ${todayScheduledSlots.length} คาบ` : `${todayScheduledSlots.length} periods today`,
        icon: Calendar,
        onClick: () => onNavigate('timetable'),
      },
      isModuleEnabled('gradebook') && {
        id: 'gradebook',
        label: lang === 'th' ? 'บันทึกคะแนน & เกรด ปพ.' : 'Gradebook & Transcripts',
        meta: lang === 'th' ? `${gradesCount} รายการคะแนน` : `${gradesCount} grade records`,
        icon: Award,
        onClick: () => onNavigate('gradebook'),
      },
      isModuleEnabled('central_exam_hub') && {
        id: 'central_exam_hub',
        label: lang === 'th' ? 'คลังข้อสอบกลางมาตรฐาน' : 'Central Exam Hub',
        meta:
          unclaimedCentralPacksCount > 0
            ? (lang === 'th' ? `มีชุดใหม่ ${unclaimedCentralPacksCount} ชุด` : `${unclaimedCentralPacksCount} new packs`)
            : (lang === 'th' ? 'พร้อมใช้งาน' : 'Ready'),
        icon: BookOpen,
        urgent: unclaimedCentralPacksCount > 0,
        onClick: () => {
          if (unclaimedCentralPacksCount > 0 && currentUser?.role === 'admin' && onOpenCentralExamPopup) {
            onOpenCentralExamPopup();
          } else {
            onNavigate('central_exam_hub');
          }
        },
      },
    ].filter(Boolean) as AdminCategoryActionItem[];

    const studentCareItems: AdminCategoryActionItem[] = [
      isModuleEnabled('attendance') && {
        id: 'attendance',
        label: lang === 'th' ? 'เช็คชื่อหน้าประตู & สแกน' : 'Gate Check-in & Scanner',
        meta: lang === 'th' ? `เช็คแล้ว ${totalForDate} · ยังไม่เช็ค ${uncheckedTodayCount}` : `${totalForDate} checked · ${uncheckedTodayCount} pending`,
        icon: QrCode,
        urgent: uncheckedTodayCount > 0 && !todayHoliday && !isTodayWeekend,
        onClick: () => onNavigate('attendance'),
      },
      isModuleEnabled('mobile_checkin') && {
        id: 'mobile_checkin',
        label: lang === 'th' ? 'เช็คชื่อมือถือ & อนุมัติใบลา' : 'Mobile Check-in & Leaves',
        meta: pendingLeaveCount > 0
          ? (lang === 'th' ? `ใบลารออนุมัติ ${pendingLeaveCount} ใบ` : `${pendingLeaveCount} pending leaves`)
          : (lang === 'th' ? 'ไม่มีใบลาค้างอนุมัติ' : 'No pending leaves'),
        icon: Smartphone,
        urgent: pendingLeaveCount > 0,
        onClick: () => onNavigate('mobile_checkin'),
      },
      isModuleEnabled('homework') && {
        id: 'homework',
        label: lang === 'th' ? 'การบ้าน & ภาระงาน' : 'Homework & Tasks',
        meta: ungradedHomeworkCount > 0
          ? (lang === 'th' ? `รอตรวจ ${ungradedHomeworkCount} ชิ้น` : `${ungradedHomeworkCount} to grade`)
          : (lang === 'th' ? 'ตรวจครบแล้ว' : 'All graded'),
        icon: FileCheck2,
        urgent: ungradedHomeworkCount > 0,
        onClick: () => onNavigate('homework'),
      },
      isModuleEnabled('behavior_sdq') && {
        id: 'behavior_sdq',
        label: lang === 'th' ? 'ดูแลช่วยเหลือนักเรียน & SDQ' : 'Behavior & SDQ Screening',
        meta: lang === 'th' ? `SDQ ${sdqCount} · พฤติกรรม ${behaviorCount}` : `${sdqCount} SDQ · ${behaviorCount} logs`,
        icon: HeartHandshake,
        onClick: () => onNavigate('behavior_sdq'),
      },
      isModuleEnabled('infirmary') && {
        id: 'infirmary',
        label: lang === 'th' ? 'ห้องพยาบาล & เวชระเบียน' : 'Infirmary Clinic',
        meta: lang === 'th' ? `บันทึกอาการ ${infirmaryCount} ครั้ง` : `${infirmaryCount} visits`,
        icon: HeartPulse,
        onClick: () => onNavigate('infirmary'),
      },
      isModuleEnabled('student_id_cards') && {
        id: 'student_id_cards',
        label: lang === 'th' ? 'บัตรนักเรียนดิจิทัล' : 'Digital Student IDs',
        meta: lang === 'th' ? 'QR / พิมพ์บัตรรายกลุ่ม' : 'QR & Batch Print',
        icon: CreditCard,
        onClick: () => onNavigate('student_id_cards'),
      },
    ].filter(Boolean) as AdminCategoryActionItem[];

    const financeCommItems: AdminCategoryActionItem[] = [
      canViewFinancials && {
        id: 'billing',
        label: lang === 'th' ? 'ค่าเทอม & ตรวจสอบสลิป' : 'Tuition & Payment Slips',
        meta:
          pendingSlipCount > 0
            ? (lang === 'th' ? `สลิปรอตรวจ ${pendingSlipCount} · ค้างชำระ ${pendingInvoicesCount}` : `${pendingSlipCount} slips · ${pendingInvoicesCount} unpaid`)
            : (lang === 'th' ? `จัดเก็บแล้ว ${collectionRate}% · ค้าง ${pendingInvoicesCount}` : `${collectionRate}% collected`),
        icon: Receipt,
        urgent: pendingSlipCount > 0,
        onClick: () => onNavigate('billing'),
      },
      isModuleEnabled('announcements') && {
        id: 'announcements',
        label: lang === 'th' ? 'ข่าวสาร & ประกาศโรงเรียน' : 'Announcements & News',
        meta: lang === 'th' ? `${announcementsCount} ประกาศในระบบ` : `${announcementsCount} posts`,
        icon: BellRing,
        onClick: () => onNavigate('announcements'),
      },
      currentUser?.role === 'admin' && {
        id: 'admin_superadmin_desk',
        label: lang === 'th' ? 'แชตด่วน / จดหมายถึง Super Admin' : 'Super Admin Desk',
        meta: lang === 'th' ? 'ประสานงานส่วนกลาง & แนบภาพ' : 'Direct coordination & screenshots',
        icon: Mail,
        onClick: () => onNavigate('admin_superadmin_desk'),
      },
      {
        id: 'guardian_line',
        label: lang === 'th' ? 'เชื่อมต่อ LINE ผู้ปกครอง' : 'Guardian LINE Coverage',
        meta: lang === 'th' ? `เชื่อมต่อแล้ว ${lineConnectedCount}/${totalStudents} (${linePercent}%)` : `${lineConnectedCount}/${totalStudents} linked`,
        icon: MessageSquare,
        onClick: () => onOpenDrawer('guardian_line'),
      },
      isModuleEnabled('attendance') && {
        id: 'live_attendance',
        label: lang === 'th' ? 'รายงานสด & ภาพถ่ายเช็คชื่อ' : 'Live Selfie & GPS Logs',
        meta: lang === 'th' ? `ภาพถ่ายวันนี้ ${selfieCount} รายการ` : `${selfieCount} selfie proofs`,
        icon: Camera,
        onClick: () => onSelectSubTab('live_attendance'),
      },
    ].filter(Boolean) as AdminCategoryActionItem[];

    const executiveSettingsItems: AdminCategoryActionItem[] = [
      canViewExecutiveMonitor && {
        id: 'executive_monitor',
        label: lang === 'th' ? 'จอมอนิเตอร์ผู้บริหาร (MIS)' : 'Executive Monitor',
        meta: lang === 'th' ? 'ภาพรวมวิชาการ กิจการ และการเงิน' : 'Campus-wide KPI monitor',
        icon: Monitor,
        onClick: () => onSelectSubTab('executive_monitor'),
      },
      canViewExecutiveMonitor && {
        id: 'obec_learning_areas',
        label: lang === 'th' ? 'ประเมินผล 8 กลุ่มสาระฯ สพฐ.' : 'OBEC 8-Area Analytics',
        meta: lang === 'th' ? 'ติดตามผลสัมฤทธิ์รายกลุ่มสาระฯ' : 'Learning area performance',
        icon: BarChart3,
        onClick: () => onSelectSubTab('obec_learning_areas'),
      },
      canViewExecutiveMonitor && {
        id: 'pp6_quality_overview',
        label: lang === 'th' ? 'ภาพรวมคุณภาพ ปพ.6 (ผู้บริหาร)' : 'OBEC Pp.6 Overview',
        meta: lang === 'th' ? 'สรุปคุณภาพผู้เรียนระดับสถานศึกษา' : 'School-wide quality report',
        icon: GraduationCap,
        onClick: () => onSelectSubTab('pp6_quality_overview'),
      },
      canViewEarlyWarning && {
        id: 'early_warning',
        label: lang === 'th' ? 'ระบบเตือนภัยผู้เรียน (Early Warning)' : 'Early Warning System',
        meta: lang === 'th' ? 'คัดกรองนักเรียนกลุ่มเสี่ยงขาดเรียน/ตกหล่น' : 'At-risk student alerts',
        icon: ShieldAlert,
        onClick: () => onSelectSubTab('early_warning'),
      },
      {
        id: 'system_settings',
        label: lang === 'th' ? 'ศูนย์ตั้งค่าระบบ สิทธิ์ & GPS' : 'System Settings, Roles & GPS',
        meta: school?.latitude
          ? (lang === 'th' ? `GPS รัศมี ${school.geofenceRadiusMeters || 200} ม.` : `GPS ${school.geofenceRadiusMeters || 200}m`)
          : (lang === 'th' ? 'กำหนดสิทธิ์ครู/นักเรียน และพิกัดโรงเรียน' : 'Permissions, periods & GPS'),
        icon: SlidersHorizontal,
        onClick: () => onNavigate('system_settings'),
      },
      showOnboardingCard
        ? {
            id: 'onboarding',
            label: lang === 'th' ? 'เช็กลิสต์ตั้งค่าโรงเรียน' : 'School Setup Checklist',
            meta: lang === 'th' ? `ดำเนินการแล้ว ${completedOnboardingCount}/3 ขั้นตอน` : `${completedOnboardingCount}/3 steps done`,
            icon: ListChecks,
            urgent: completedOnboardingCount < 3,
            onClick: () => onOpenDrawer('onboarding'),
          }
        : {
            id: 'innovative_hub',
            label: lang === 'th' ? 'ศูนย์นวัตกรรม AI & ห้องแล็บ' : 'AI & Learning Innovation Hub',
            meta: lang === 'th' ? 'Career Quest, AI Tutor, ห้องทดลอง 3D' : 'Career Quest, AI Tutor & Labs',
            icon: Sparkles,
            onClick: () => onSelectSubTab('innovative_hub'),
          },
    ].filter(Boolean) as AdminCategoryActionItem[];

    return [
      {
        id: 'academics' as const,
        title: lang === 'th' ? '1. วิชาการ ทะเบียน และหลักสูตร' : '1. Academics, Directory & Curriculum',
        subtitle: lang === 'th' ? 'จัดการนักเรียน ครู รายวิชา ตารางสอน และผลการเรียน ปพ.' : 'Students, staff, courses, timetable & grades',
        icon: GraduationCap,
        topBarClass: 'bg-blue-600 dark:bg-blue-500',
        headerBgClass: 'bg-blue-50/75 dark:bg-blue-950/35 border-b border-blue-200/80 dark:border-blue-900/60',
        iconBoxClass: 'bg-blue-600 text-white',
        titleTextClass: 'text-blue-950 dark:text-blue-100',
        subtitleTextClass: 'text-blue-800/80 dark:text-blue-300/80',
        chipActiveClass: 'bg-blue-600 text-white border-blue-600',
        dotClass: 'bg-blue-600 dark:bg-blue-400',
        items: academicItems,
      },
      {
        id: 'student_care' as const,
        title: lang === 'th' ? '2. กิจการนักเรียน เช็คชื่อ และดูแลช่วยเหลือ' : '2. Attendance, Care & Health',
        subtitle: lang === 'th' ? 'เช็คชื่อเข้า-ออก อนุมัติใบลา การบ้าน SDQ และห้องพยาบาล' : 'Gate/period check-in, leaves, homework & care',
        icon: HeartPulse,
        topBarClass: 'bg-emerald-600 dark:bg-emerald-500',
        headerBgClass: 'bg-emerald-50/75 dark:bg-emerald-950/35 border-b border-emerald-200/80 dark:border-emerald-900/60',
        iconBoxClass: 'bg-emerald-600 text-white',
        titleTextClass: 'text-emerald-950 dark:text-emerald-100',
        subtitleTextClass: 'text-emerald-800/80 dark:text-emerald-300/80',
        chipActiveClass: 'bg-emerald-600 text-white border-emerald-600',
        dotClass: 'bg-emerald-600 dark:bg-emerald-400',
        items: studentCareItems,
      },
      {
        id: 'finance_comm' as const,
        title: lang === 'th' ? '3. การเงิน ประสานงาน และสื่อสาร' : '3. Finance, Coordination & News',
        subtitle: lang === 'th' ? 'ค่าเทอม ตรวจสลิป ข่าวประกาศ LINE ผู้ปกครอง และ Super Admin' : 'Billing, slips, announcements & LINE sync',
        icon: Receipt,
        topBarClass: 'bg-amber-500 dark:bg-amber-400',
        headerBgClass: 'bg-amber-50/75 dark:bg-amber-950/35 border-b border-amber-200/80 dark:border-amber-900/60',
        iconBoxClass: 'bg-amber-600 text-white',
        titleTextClass: 'text-amber-950 dark:text-amber-100',
        subtitleTextClass: 'text-amber-900/80 dark:text-amber-300/80',
        chipActiveClass: 'bg-amber-600 text-white border-amber-600',
        dotClass: 'bg-amber-500 dark:bg-amber-400',
        items: financeCommItems,
      },
      {
        id: 'executive_settings' as const,
        title: lang === 'th' ? '4. วิเคราะห์ผู้บริหาร ตั้งค่า และนวัตกรรม' : '4. Executive Analytics, Settings & AI',
        subtitle: lang === 'th' ? 'มอนิเตอร์ สพฐ. ปพ.6 เตือนภัยผู้เรียน ตั้งค่าระบบ และ GPS' : 'OBEC analytics, early warning, settings & GPS',
        icon: SlidersHorizontal,
        topBarClass: 'bg-violet-600 dark:bg-violet-500',
        headerBgClass: 'bg-violet-50/75 dark:bg-violet-950/35 border-b border-violet-200/80 dark:border-violet-900/60',
        iconBoxClass: 'bg-violet-600 text-white',
        titleTextClass: 'text-violet-950 dark:text-violet-100',
        subtitleTextClass: 'text-violet-800/80 dark:text-violet-300/80',
        chipActiveClass: 'bg-violet-600 text-white border-violet-600',
        dotClass: 'bg-violet-600 dark:bg-violet-400',
        items: executiveSettingsItems,
      },
    ];
  }, [
    lang,
    isModuleEnabled,
    totalStudents,
    activeStudents,
    teachersCount,
    teacherLeavesTodayCount,
    coursesCount,
    todayScheduledSlots.length,
    gradesCount,
    unclaimedCentralPacksCount,
    currentUser?.role,
    onOpenCentralExamPopup,
    onNavigate,
    totalForDate,
    uncheckedTodayCount,
    todayHoliday,
    isTodayWeekend,
    pendingLeaveCount,
    ungradedHomeworkCount,
    sdqCount,
    behaviorCount,
    infirmaryCount,
    canViewFinancials,
    pendingSlipCount,
    pendingInvoicesCount,
    collectionRate,
    announcementsCount,
    lineConnectedCount,
    linePercent,
    selfieCount,
    onOpenDrawer,
    onSelectSubTab,
    canViewExecutiveMonitor,
    canViewEarlyWarning,
    school?.latitude,
    school?.geofenceRadiusMeters,
    showOnboardingCard,
    completedOnboardingCount,
  ]);

  const visibleGroups = useMemo(() => {
    const q = quickFilter.trim().toLowerCase();
    return categoryGroups
      .filter((group) => activeGroupFilter === 'all' || group.id === activeGroupFilter)
      .map((group) => ({
        ...group,
        filteredItems: q
          ? group.items.filter(
              (item) =>
                item.label.toLowerCase().includes(q) ||
                item.meta.toLowerCase().includes(q) ||
                group.title.toLowerCase().includes(q)
            )
          : group.items,
      }))
      .filter((group) => group.filteredItems.length > 0);
  }, [categoryGroups, activeGroupFilter, quickFilter]);

  // Urgent Action Queue (right live panel)
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
    if (pendingSlipCount > 0 && canViewFinancials) {
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
    if (rows.length < 5 && isModuleEnabled('timetable')) {
      rows.push({
        id: 'timetable',
        groupLabel: lang === 'th' ? 'วิชาการ' : 'Academics',
        groupColorClass: 'text-blue-700 dark:text-blue-300',
        label: lang === 'th' ? 'ตารางสอนวันนี้' : 'Today’s Timetable',
        value: `${todayScheduledSlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`,
        onClick: () => onNavigate('timetable'),
      });
    }
    if (rows.length < 5 && isModuleEnabled('gradebook')) {
      rows.push({
        id: 'gradebook',
        groupLabel: lang === 'th' ? 'วิชาการ' : 'Academics',
        groupColorClass: 'text-blue-700 dark:text-blue-300',
        label: lang === 'th' ? 'บันทึกคะแนน ปพ.5' : 'Gradebook ปพ.5',
        value: `${coursesCount} ${lang === 'th' ? 'วิชา' : 'courses'}`,
        onClick: () => onNavigate('gradebook'),
      });
    }

    return rows.slice(0, 5);
  }, [
    pendingLeaveCount,
    isModuleEnabled,
    lang,
    onNavigate,
    pendingSlipCount,
    canViewFinancials,
    teacherLeavesTodayCount,
    ungradedHomeworkCount,
    uncheckedTodayCount,
    todayHoliday,
    isTodayWeekend,
    todayScheduledSlots.length,
    coursesCount,
  ]);

  return (
    <div className="dash-scroll-stack animate-in fade-in duration-150">
      {/* 1. CLEAN EXECUTIVE BRIEF HEADER */}
      <section
        aria-label={lang === 'th' ? 'สรุปผู้บริหารสถานศึกษา' : 'Executive Summary'}
        className="no-print morning-brief-strip px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[var(--color-primary-text)]">
            <span>{lang === 'th' ? 'ศูนย์บัญชาการผู้บริหาร (Admin)' : 'School Admin Command'}</span>
            <span className="text-[var(--color-text-muted)]" aria-hidden="true">·</span>
            <span className="text-[var(--color-text-muted)] font-semibold tabular-nums">
              {formattedTodayDate}
            </span>
            <span className="text-[var(--color-text-muted)]" aria-hidden="true">·</span>
            <span className="text-[var(--color-text-muted)] font-semibold tabular-nums">
              {lang === 'th'
                ? `ปีการศึกษา ${systemConfig.academicYear} (${formatSemesterLabel(systemConfig.currentSemester)})`
                : `AY ${systemConfig.academicYear} · ${systemConfig.currentSemester}`}
            </span>
            {(todayHoliday || upcomingHoliday) && (
              <>
                <span className="text-[var(--color-text-muted)]" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('timetable')}
                  className={`font-semibold hover:underline cursor-pointer ${
                    todayHoliday ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {todayHoliday
                    ? (lang === 'th' ? `วันหยุดวันนี้: ${todayHoliday.nameTh}` : `Holiday Today: ${todayHoliday.nameEn}`)
                    : upcomingHoliday
                      ? (lang === 'th' ? `วันหยุดถัดไป (${upcomingHoliday.date}): ${upcomingHoliday.nameTh}` : `Upcoming (${upcomingHoliday.date}): ${upcomingHoliday.nameEn}`)
                      : null}
                </button>
              </>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--color-text-title)] truncate">
            {timeGreeting}, {userDisplayName}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {lang === 'th'
              ? `จัดการงานสถานศึกษา 4 หมวดหลัก · นักเรียน ${totalStudents} คน · ครู ${teachersCount} คน · ${coursesCount} รายวิชา`
              : `Organized 4-pillar campus management · ${totalStudents} students · ${teachersCount} teachers · ${coursesCount} courses`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canSwitchAdminTeacherMode && onSwitchOperationalRole && (
            <div
              role="group"
              aria-label={lang === 'th' ? 'สลับโหมดปฏิบัติงาน Admin / ครูผู้สอน' : 'Switch Admin / Teacher Mode'}
              className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5"
            >
              <button
                type="button"
                aria-pressed={true}
                onClick={() => onSwitchOperationalRole('admin')}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'โหมด Admin' : 'Admin Mode'}</span>
              </button>
              <button
                type="button"
                aria-pressed={false}
                onClick={() => onSwitchOperationalRole('teacher')}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[var(--color-text-body)] hover:text-[var(--color-text-title)] cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
              >
                <ArrowLeftRight className="w-3 h-3 shrink-0 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'สลับเป็นครูผู้สอน' : 'Teacher Mode'}</span>
              </button>
            </div>
          )}
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
          <button
            type="button"
            onClick={onExportCsv}
            className="btn-tool-neutral px-3.5 py-2 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
            <span>{lang === 'th' ? 'ส่งออก CSV วันนี้' : 'Export CSV'}</span>
          </button>
        </div>
      </section>

      {/* 2. 4 COLOR-CODED KPI CELLS (Single-Elevation Hairline Grid) */}
      <section
        data-guide-id="dashboard-kpis"
        aria-label={lang === 'th' ? 'ตัวชี้วัดหลักสถานศึกษา' : 'Key Campus Metrics'}
        className="saas-kpi-strip print-avoid-break"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
          {/* KPI 1: Emerald - Attendance */}
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('attendance')) onNavigate('attendance');
            }}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-meta font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-emerald-600 dark:bg-emerald-400 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'มาตรงเวลาวันนี้' : 'On-Time Today'}</span>
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

          {/* KPI 2: Amber - Pending Approvals / Tasks */}
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
              <span className="type-meta font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-amber-500 dark:bg-amber-400 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'รอดำเนินการ & อนุมัติ' : 'Pending Actions'}</span>
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

          {/* KPI 3: Blue - Campus Directory */}
          <button
            type="button"
            onClick={() => {
              if (isModuleEnabled('students')) onNavigate('students');
            }}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-meta font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-blue-600 dark:bg-blue-400 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'ผู้เรียน & วิชาการ' : 'Students & Academics'}</span>
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

          {/* KPI 4: Violet/Teal - Guardian LINE & Tuition */}
          <button
            type="button"
            onClick={() => onOpenDrawer('guardian_line')}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between gap-2 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-meta font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-violet-600 dark:bg-violet-400 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'LINE ผู้ปกครอง & การเงิน' : 'LINE & Tuition'}</span>
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
        </div>
      </section>

      {/* 2.5 SCHOOL SYSTEM CONTROL & OPERATIONS BAR */}
      <section
        aria-label={lang === 'th' ? 'แถบควบคุมและจัดการระบบโรงเรียน' : 'School System Control Bar'}
        className="no-print rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-[var(--color-text-title)] truncate">
                {lang === 'th' ? 'แถบควบคุมและจัดการระบบโรงเรียน' : 'School System Control & Governance Bar'}
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                {lang === 'th'
                  ? `จุดเช็คชื่อ ${activeGatesCount} จุด · เปิดสิทธิ์ ${enabledPoliciesCount}/${totalPoliciesCount} นโยบาย · ครูมีสิทธิ์ Admin ${adminTeachersCount} คน`
                  : `${activeGatesCount} active gates · ${enabledPoliciesCount}/${totalPoliciesCount} policies · ${adminTeachersCount} admin-teachers`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => openControlTab('control_overview', 'system_settings')}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition"
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'th' ? 'มุมมองควบคุมระบบ' : 'System Control View'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            </button>
            {canViewExecutiveMonitor && (
              <button
                type="button"
                onClick={() => onSelectSubTab('executive_monitor')}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition"
              >
                <Monitor className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <span>{lang === 'th' ? 'จอมอนิเตอร์ผู้บริหาร' : 'Executive Monitor'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Hairline-Divided Live Governance Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
          {/* Control 1: GPS & Campus Gates */}
          <button
            type="button"
            onClick={() => openControlTab('school_gps', 'school_gps')}
            className="p-3.5 text-left hover:bg-[var(--color-card-subtle)] transition cursor-pointer flex flex-col justify-between gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'พิกัด GPS & จุดสแกน' : 'Campus GPS & Gates'}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums truncate">
              {hasGpsConfigured
                ? (lang === 'th' ? `พร้อมใช้งาน (${activeGatesCount || 1} จุด · ${gpsRadiusMeters} ม.)` : `Active (${activeGatesCount || 1} gates · ${gpsRadiusMeters}m)`)
                : (lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'GPS not configured')}
            </p>
          </button>

          {/* Control 2: Role Policies & Admin Teachers */}
          <button
            type="button"
            onClick={() => openControlTab('school_permissions', 'school_permissions')}
            className="p-3.5 text-left hover:bg-[var(--color-card-subtle)] transition cursor-pointer flex flex-col justify-between gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'สิทธิ์บทบาท & ครู Admin' : 'Permissions & Admin Staff'}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums truncate">
              {lang === 'th'
                ? `เปิดใช้ ${enabledPoliciesCount}/${totalPoliciesCount} สิทธิ์ · ครู Admin ${adminTeachersCount} คน`
                : `${enabledPoliciesCount}/${totalPoliciesCount} rules · ${adminTeachersCount} admin-teachers`}
            </p>
          </button>

          {/* Control 3: LINE OA & Attendance Cutoffs */}
          <button
            type="button"
            onClick={() => openControlTab('line_events', 'admin_line_control')}
            className="p-3.5 text-left hover:bg-[var(--color-card-subtle)] transition cursor-pointer flex flex-col justify-between gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'LINE OA & เวลาตัดสาย/ขาด' : 'LINE OA & Cutoffs'}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums truncate">
              {lang === 'th'
                ? `สาย ${lateCutoffTime} · ขาด ${absenceCutoffTime} · LINE ${linePercent}%`
                : `Late ${lateCutoffTime} · Absent ${absenceCutoffTime} · ${linePercent}%`}
            </p>
          </button>

          {/* Control 4: Student Accounts, AI & Audit */}
          <button
            type="button"
            onClick={() => openControlTab('student_accounts', 'admin_student_accounts')}
            className="p-3.5 text-left hover:bg-[var(--color-card-subtle)] transition cursor-pointer flex flex-col justify-between gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'บัญชีนักเรียน & สิทธิ์ AI' : 'Student Accounts & AI'}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            </div>
            <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums truncate">
              {lang === 'th'
                ? `AI นักเรียน: ${aiStudentEnabled ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'} · ${studentLoginLabel}`
                : `Student AI: ${aiStudentEnabled ? 'ON' : 'OFF'} · ${studentLoginLabel}`}
            </p>
          </button>
        </div>

        {/* Fast Control Strip Links */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)]/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => openControlTab('school_general', 'system_settings')}
              className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-primary-text)] cursor-pointer"
            >
              {lang === 'th' ? 'ข้อมูลโรงเรียน & ภาคเรียน' : 'School Info & Term'}
            </button>
            <button
              type="button"
              onClick={() => openControlTab('saas_audit', 'admin_saas_audit')}
              className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-primary-text)] cursor-pointer"
            >
              {lang === 'th' ? 'ประวัติ Audit Log & แพ็กเกจ' : 'Audit Log & Package'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('teachers')}
              className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-primary-text)] cursor-pointer"
            >
              {lang === 'th' ? 'มอบหมายครูสิทธิ์ Admin' : 'Assign Admin Teachers'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin_superadmin_desk')}
              className="font-semibold text-[var(--color-text-body)] hover:text-[var(--color-primary-text)] cursor-pointer"
            >
              {lang === 'th' ? 'ประสานงาน Super Admin' : 'Super Admin Desk'}
            </button>
          </div>
        </div>
      </section>

      {/* 3. CATEGORIZED & COLOR-CODED ADMIN WORKSPACE (4 CLEAR GROUPS) */}
      <section aria-label={lang === 'th' ? 'หมวดหมู่การจัดการสถานศึกษา' : 'Categorized Management'} className="no-print space-y-3.5">
        {/* Category Filter & Search Bar */}
        <div className="saas-card px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveGroupFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                activeGroupFilter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'ทุกหมวด (4)' : 'All Groups (4)'}
            </button>
            {categoryGroups.map((group) => {
              const isSelected = activeGroupFilter === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupFilter(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                    isSelected
                      ? group.chipActiveClass
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : group.dotClass}`}
                    aria-hidden="true"
                  />
                  <span>{group.title}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาเมนูงานจัดการ...' : 'Filter management tools...'}
              className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:border-[var(--color-primary)]"
            />
            {quickFilter && (
              <button
                type="button"
                onClick={() => setQuickFilter('')}
                aria-label={lang === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2x2 Color-Coded Category Cards */}
        {visibleGroups.length === 0 ? (
          <div className="saas-card p-8 text-center space-y-2">
            <p className="text-xs text-[var(--color-text-muted)]">
              {lang === 'th' ? `ไม่พบเมนูจัดการที่ตรงกับ "${quickFilter}"` : `No management modules match "${quickFilter}"`}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('');
                setActiveGroupFilter('all');
              }}
              className="btn-tool-neutral px-3 py-1.5 mx-auto"
            >
              {lang === 'th' ? 'แสดงทุกหมวด' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${visibleGroups.length > 1 ? 'xl:grid-cols-2' : ''} gap-4 items-stretch`}>
            {visibleGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <section
                  key={group.id}
                  aria-label={group.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col"
                >
                  {/* Distinct Top Color Accent Strip (2px) */}
                  <div className={`h-1 w-full ${group.topBarClass}`} aria-hidden="true" />

                  {/* Category Header Band */}
                  <div className={`px-4 py-3 flex items-center justify-between gap-3 ${group.headerBgClass}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${group.iconBoxClass}`}>
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-extrabold tracking-tight truncate ${group.titleTextClass}`}>
                          {group.title}
                        </h3>
                        <p className={`text-[11px] truncate ${group.subtitleTextClass}`}>
                          {group.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-[var(--color-text-muted)] shrink-0">
                      {group.filteredItems.length} {lang === 'th' ? 'งาน' : 'items'}
                    </span>
                  </div>

                  {/* Clean Action List (Hairline-divided, zero nested borders) */}
                  <div className="p-2 divide-y divide-[var(--color-border)] flex-1">
                    {group.filteredItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="w-full px-2.5 py-2.5 flex items-center justify-between gap-3 text-left rounded-lg hover:bg-[var(--color-card-subtle)] transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ItemIcon className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-title)] shrink-0 transition-colors" />
                            <span className="text-[13px] font-semibold text-[var(--color-text-title)] truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[11px] font-semibold tabular-nums whitespace-nowrap ${
                                item.urgent
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-[var(--color-text-muted)]'
                              }`}
                            >
                              {item.meta}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. COMPACT 2-COLUMN LIVE FEED & URGENT QUEUE (Max 5 rows each) */}
      <div className="dashboard-print-grid relative dash-grid grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* LEFT: Recent Check-ins */}
        <section
          aria-label={lang === 'th' ? 'เช็คชื่อล่าสุด' : 'Recent Check-ins'}
          className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
        >
          <div>
            <div className="saas-card-header">
              <h2 className="type-section-title truncate flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'เช็คชื่อเข้า-ออกล่าสุด' : 'Recent Check-ins'}</span>
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
                  onClick={() => onSelectSubTab('live_attendance')}
                  className="type-meta font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
                >
                  {lang === 'th' ? 'ดูทั้งหมด →' : 'View all →'}
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
                        <img
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

        {/* RIGHT: Urgent Admin Queue */}
        <section
          data-guide-id="dashboard-today-desk"
          aria-label={lang === 'th' ? 'งานด่วนที่ต้องติดตาม' : 'Priority Action Queue'}
          className="saas-card flex flex-col justify-between min-w-0 print-avoid-break overflow-hidden"
        >
          <div>
            <div className="saas-card-header">
              <h2 className="type-section-title truncate flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'คิวงานด่วนที่ต้องจัดการ' : 'Priority Action Queue'}</span>
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
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'ไม่มีรายการค้างดำเนินการเร่งด่วนในขณะนี้' : 'No urgent items pending'}
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
                      <div className="flex items-center gap-2.5 min-w-0">
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
      </div>
    </div>
  );
};
