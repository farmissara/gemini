import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Clock, 
  FileText, 
  Gamepad2, 
  User, 
  Laptop, 
  Bell, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  BookOpen, 
  ArrowLeft, 
  LogOut, 
  CreditCard, 
  Swords, 
  FlaskConical, 
  Trophy, 
  Flame, 
  Calendar,
  Globe,
  Sun,
  Moon,
  Send,
  HelpCircle,
  Monitor,
  TrendingUp,
  HeartPulse,
  Receipt,
  ShieldCheck,
  BarChart3,
  BellRing,
  Edit3,
  Megaphone,
  SlidersHorizontal,
  Users,
  Fingerprint,
  Lock,
  KeyRound,
  Trash2
} from 'lucide-react';
import { 
  AuthUser, 
  School, 
  UserRole, 
  AppLanguage, 
  ThemePalette, 
  Student, 
  Teacher, 
  Course, 
  AttendanceRecord, 
  PeriodAttendanceRecord, 
  LeaveRequest, 
  LeaveStatus, 
  Assignment, 
  HomeworkSubmission, 
  Announcement, 
  QuizQuestion, 
  PlayerScore, 
  RewardItem, 
  CampusGateGeofence,
  AttendanceStatus,
  AttendanceCheckType,
  AttendanceUserType,
  GradeRecord,
  TuitionInvoice,
  InfirmaryVisit,
  BehaviorRecord,
  SdqAssessment,
  SchoolFeatureFlags
} from '../../types';
import { getLocalDateString } from '../../lib/date';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  isRestrictedAttendanceViewer,
  resolveOwnStudent,
} from '../../lib/attendanceScope';
import { MobileAttendanceView } from '../../views/MobileAttendanceView';
import { EduBattleGameView } from '../../views/EduBattleGameView';
import { EduBattleRoyale3DView } from '../../views/EduBattleRoyale3DView';
import { CoopBossRaidView } from '../../views/CoopBossRaidView';
import { SubjectLabSimulationView } from '../../views/SubjectLabSimulationView';
import { HallOfFame3DView } from '../../views/HallOfFame3DView';
import { DigitalIdCardView } from '../../views/DigitalIdCardView';
import { PagedList } from '../PagedList';
import { PWAInstallButton } from '../PWAInstallButton';
import { BaanPakKruLogo } from '../common/BaanPakKruLogo';
import { ViewErrorBoundary } from '../common/ViewErrorBoundary';
import { MobileAdminQuickHub, MobileSuperAdminHub } from './MobileRoleWorkspace';
import { AdminDailyDashboardView } from '../../views/AdminDailyDashboardView';
import {
  enrollBiometricPasskey,
  getPasskeyForUser,
  getWebAuthnSupportInfo,
  removeEnrolledPasskey,
  updatePasskeyPreferences,
  verifyBiometricPasskey,
  type EnrolledBiometricPasskey,
  type WebAuthnSupportInfo,
} from '../../lib/webAuthn';
import type { NavTab } from './Sidebar';

export type MobileTab =
  | 'home'
  | 'admin_quick'
  | 'super_schools'
  | 'executive'
  | 'checkin'
  | 'leave'
  | 'games'
  | 'profile'
  | 'homework'
  | 'announcements';

const splitAnnouncementIntoPages = (content: string, pageLength = 420) => {
  const characters = Array.from(content);
  const pages: string[] = [];

  for (let start = 0; start < characters.length; start += pageLength) {
    pages.push(characters.slice(start, start + pageLength).join(''));
  }

  return pages.length > 0 ? pages : [''];
};

interface MobileAppShellProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette: ThemePalette;
  setThemePalette: (palette: ThemePalette) => void;
  onLogout: () => void;
  onSwitchToDesktopMode: () => void;
  onOpenProfileModal: () => void;
  onOpenOnboardingTutor?: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  
  // Data props
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  grades?: GradeRecord[];
  invoices?: TuitionInvoice[];
  infirmaryVisits?: InfirmaryVisit[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  assignments: Assignment[];
  homeworkSubmissions: HomeworkSubmission[];
  announcements: Announcement[];
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  campusGates: CampusGateGeofence[];

  // Action Handlers
  onRecordAttendance: (
    studentId: string,
    status: AttendanceStatus,
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: AttendanceUserType;
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userAvatar?: string;
      userDepartmentOrRoom?: string;
      date?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveStatus: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onUpdateStudent?: (student: Student) => void;
  // Role-first Mobile & Desktop Continuity Props
  schools?: School[];
  isDemoMode?: boolean;
  coordinationUnreadCount?: number;
  onOpenSchoolSwitcher?: () => void;
  onUpdateSchool?: (updates: Partial<School>) => Promise<void>;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onApproveInvoiceSlip?: (invoiceId: string) => void;
  onRejectInvoiceSlip?: (invoiceId: string, reason: string) => void;
  onViewSchool?: (school: School) => void;
  onToggleSchoolStatus?: (schoolId: string, status: School['status']) => Promise<void>;
  onUpdateSchoolFeatureFlags?: (schoolId: string, flags: SchoolFeatureFlags) => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
  initialMobileTab?: MobileTab;
  initialAttendanceSubTab?: 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
  onBiometricLock?: () => void;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  currentUser,
  activeSchool,
  currentRole,
  lang,
  setLang,
  themePalette,
  setThemePalette,
  onLogout,
  onSwitchToDesktopMode,
  onOpenProfileModal,
  onOpenOnboardingTutor,
  unreadCount = 0,
  onOpenNotifications,
  students,
  teachers = [],
  courses,
  grades = [],
  invoices = [],
  infirmaryVisits = [],
  behaviorRecords = [],
  sdqAssessments = [],
  attendance,
  periodAttendance,
  leaveRequests,
  assignments,
  homeworkSubmissions,
  announcements,
  questions,
  playerScores,
  rewardItems,
  campusGates,
  onRecordAttendance,
  onRecordPeriodAttendance,
  onAddLeaveRequest,
  onUpdateLeaveStatus,
  onEarnRewards,
  onRedeemReward,
  onAddQuestion,
  onImportQuestions,
  onUpdateStudent,
  schools = [],
  isDemoMode = false,
  coordinationUnreadCount = 0,
  onOpenSchoolSwitcher,
  onUpdateSchool,
  onAddAnnouncement,
  onApproveInvoiceSlip,
  onRejectInvoiceSlip,
  onViewSchool,
  onToggleSchoolStatus,
  onUpdateSchoolFeatureFlags,
  onJumpToDesktopTab,
  initialMobileTab = 'home',
  initialAttendanceSubTab = 'selfie_mobile',
  initialPeriodCourseId,
  initialPeriodNumber,
  initialPeriodDate,
  initialPeriodCode,
  onBiometricLock,
}) => {
  const [passkey, setPasskey] = useState<EnrolledBiometricPasskey | null>(() =>
    getPasskeyForUser(currentUser?.id)
  );
  const [webAuthnInfo, setWebAuthnInfo] = useState<WebAuthnSupportInfo | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState<string | null>(null);
  const [bioErr, setBioErr] = useState<string | null>(null);

  React.useEffect(() => {
    setPasskey(getPasskeyForUser(currentUser?.id));
  }, [currentUser?.id]);

  React.useEffect(() => {
    getWebAuthnSupportInfo().then(setWebAuthnInfo).catch(() => {});
  }, []);

  const handleEnrollPasskey = async () => {
    if (!currentUser) return;
    setBioBusy(true);
    setBioErr(null);
    setBioMsg(null);
    try {
      const enrolled = await enrollBiometricPasskey({
        userId: currentUser.id,
        email: currentUser.email,
        fullNameTh: currentUser.fullNameTh,
        fullNameEn: currentUser.fullNameEn,
        role: currentUser.role,
        schoolId: activeSchool.id,
        protectQuickAttendance:
          currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'teacher',
      });
      setPasskey(enrolled);
      setBioMsg(
        lang === 'th'
          ? `ลงทะเบียน ${enrolled.deviceLabel} สำเร็จ`
          : `Enrolled ${enrolled.deviceLabel}`
      );
    } catch (err) {
      setBioErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBioBusy(false);
    }
  };

  const handleTestPasskey = async () => {
    if (!currentUser) return;
    setBioBusy(true);
    setBioErr(null);
    setBioMsg(null);
    try {
      const res = await verifyBiometricPasskey({ userId: currentUser.id });
      setPasskey(res.passkey);
      setBioMsg(
        lang === 'th'
          ? 'ยืนยัน FaceID / TouchID สำเร็จ ✓'
          : 'Biometric verification passed'
      );
    } catch (err) {
      setBioErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBioBusy(false);
    }
  };
  const [activeTab, setActiveTab] = useState<MobileTab>(initialMobileTab);
  const [activeGameView, setActiveGameView] = useState<'hub' | 'arcade_studio' | 'battle_royale_3d' | '1v1_arena' | 'boss_raid' | 'subject_labs' | 'hall_of_fame'>('hub');
  const [homePage, setHomePage] = useState(0);
  const [gameHubPage, setGameHubPage] = useState(0);
  const [profilePage, setProfilePage] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const todayStr = getLocalDateString();

  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const ownStudent = resolveOwnStudent(currentUser, students);
  const currentPersonId = ownStudent?.id || currentUser?.id || students[0]?.id;
  const scopedAttendance = filterAttendanceForUser(attendance, currentUser, students);
  const todayCheckin = scopedAttendance.find(a => a.date === todayStr);

  // Scoped leave requests (students/parents see ONLY their own leave counts)
  const myLeaves = isRestrictedViewer
    ? filterLeaveRequestsForUser(leaveRequests, currentUser, students)
    : leaveRequests;
  const pendingLeavesCount = myLeaves.filter(l => l.status === 'pending').length;

  // Pending homework
  const myCompletedSubmissions = new Set(homeworkSubmissions.filter(h => h.studentId === currentPersonId).map(h => h.assignmentId));
  const pendingHomeworkCount = assignments.filter(a => !myCompletedSubmissions.has(a.id)).length;

  const currentScore = playerScores.find(p => p.userId === currentUser?.id) || {
    exp: 1450,
    gems: 45,
    rankTitle: 'Silver Scholar ⚔️',
    battleWins: 12,
    streak: 3
  };

  // Executive Dashboard Metrics (Mobile Optimized)
  const execMetrics = useMemo(() => {
    const today = getLocalDateString();
    const todayRecords = attendance.filter((a) => a.date === today);
    const totalStudents = students.length || 1;
    const presentCount = todayRecords.filter((a) => a.status === 'present').length;
    const lateCount = todayRecords.filter((a) => a.status === 'late').length;
    const absentCount = todayRecords.filter((a) => a.status === 'absent').length;
    const leaveCount = todayRecords.filter((a) => a.status === 'leave').length;
    const attendanceRate = Math.min(100, Math.round(((presentCount + lateCount) / totalStudents) * 100));

    // Academic GPAX
    const validGpas = students.map((s) => s.gpa).filter((g) => g > 0);
    const avgGpa = validGpas.length > 0 ? (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2) : '3.45';
    const honorCount = students.filter((s) => s.gpa >= 3.5).length;

    // Infirmary
    const todayInfirmary = infirmaryVisits.filter((v) => v.visitDate === today || !v.visitDate).length;

    // Billing / Tuition
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const totalCollected = paidInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

    // Risk / SDQ
    const riskCount = sdqAssessments.filter((s) => s.overallStatus === 'risk' || s.overallStatus === 'problem' || (s.totalDifficultiesScore ?? 0) >= 16).length;

    return {
      attendanceRate,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      avgGpa,
      honorCount,
      todayInfirmary,
      totalCollected,
      pendingCount: pendingInvoices.length,
      riskCount,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
    };
  }, [attendance, students, teachers, courses, invoices, infirmaryVisits, sdqAssessments]);

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden app-workspace text-[var(--color-text-body)] pb-16 select-none">
      {/* ======================================================== */}
      {/* 1. COMPACT TOP MOBILE HEADER (Capped for <=15% sticky chrome) */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md flex flex-col transition-colors">
        <div className="px-3.5 py-2 flex items-center justify-between gap-2 min-h-[52px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <BaanPakKruLogo size={24} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[var(--color-text-title)] tracking-tight truncate">
                  BaanPakKru
                </span>
                <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">
                  · {currentRole === 'super_admin'
                    ? (lang === 'th' ? 'แม่ข่าย' : 'Master')
                    : currentRole === 'admin'
                    ? (lang === 'th' ? 'แอดมิน' : 'Admin')
                    : currentRole === 'teacher'
                    ? (lang === 'th' ? 'ครู' : 'Teacher')
                    : currentRole === 'parent'
                    ? (lang === 'th' ? 'ผู้ปกครอง' : 'Parent')
                    : (lang === 'th' ? 'นักเรียน' : 'Student')}
                </span>
              </div>
              {onOpenSchoolSwitcher && currentRole === 'super_admin' ? (
                <button
                  type="button"
                  onClick={onOpenSchoolSwitcher}
                  className="text-[11px] text-[var(--color-primary-text)] font-medium truncate max-w-[170px] flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}</span>
                </button>
              ) : (
                <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[170px]">
                  {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onSwitchToDesktopMode}
              className="min-h-[38px] flex items-center gap-1 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
              title={lang === 'th' ? 'สลับเป็นมุมมองคอมพิวเตอร์' : 'Switch to Desktop'}
            >
              <Laptop className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              <span>{lang === 'th' ? 'คอม' : 'PC'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="min-h-[38px] inline-flex items-center gap-1 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[11px] font-semibold text-[var(--color-text-title)] cursor-pointer whitespace-nowrap"
              title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            >
              <span>{lang === 'th' ? 'TH' : 'EN'}</span>
            </button>

            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] transition cursor-pointer"
                title={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
              >
                <Bell className="w-4 h-4 text-[var(--color-primary-text)]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN ACTIVE VIEW CONTAINER */}
      {/* ======================================================== */}
      <main className="flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto p-3.5 sm:p-4 overflow-y-auto">
        <ViewErrorBoundary
          resetKey={`${activeTab}:${activeGameView}:${homePage}:${profilePage}`}
          lang={lang}
          viewName={`mobile:${activeTab}`}
          onBackHome={() => {
            setActiveGameView('hub');
            setActiveTab('home');
          }}
        >
        {/* TAB A: ROLE-FIRST HOME / MOBILE BRIEFING */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-3.5 py-1 animate-in fade-in duration-200">
            {currentRole === 'super_admin' ? (
              <MobileSuperAdminHub
                schools={schools}
                activeSchool={activeSchool}
                isDemoMode={isDemoMode}
                lang={lang}
                coordinationUnreadCount={coordinationUnreadCount}
                onViewSchool={onViewSchool}
                onToggleSchoolStatus={onToggleSchoolStatus}
                onUpdateSchoolFeatureFlags={onUpdateSchoolFeatureFlags}
                onJumpToDesktopTab={onJumpToDesktopTab}
              />
            ) : currentRole === 'admin' ? (
              <AdminDailyDashboardView
                activeSchool={activeSchool}
                currentUser={currentUser}
                lang={lang}
                students={students}
                attendance={attendance}
                leaveRequests={leaveRequests}
                invoices={invoices}
                isDemoMode={isDemoMode}
                coordinationUnreadCount={coordinationUnreadCount}
                onRecordAttendance={onRecordAttendance}
                onUpdateLeaveStatus={onUpdateLeaveStatus}
                onApproveInvoiceSlip={onApproveInvoiceSlip}
                onRejectInvoiceSlip={onRejectInvoiceSlip}
                onOpenQuickHub={() => setActiveTab('admin_quick')}
                onOpenCheckin={() => setActiveTab('checkin')}
                onOpenExecutive={() => setActiveTab('executive')}
                onJumpToDesktopTab={onJumpToDesktopTab}
              />
            ) : (
              <>
            {homePage === 0 && (
              <>
            {/* Welcome & Persona Card (Role-aware) */}
            <div className="rounded-2xl p-4 border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[var(--color-text-muted)] tabular-nums truncate">
                  {todayStr} · {activeSchool.nameTh}
                </p>
                <h1 className="text-base font-bold text-[var(--color-text-title)] mt-0.5 truncate">
                  {lang === 'th' ? 'สวัสดี' : 'Hello'} {currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน'}
                </h1>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                  {currentRole === 'teacher'
                    ? (lang === 'th' ? 'อาจารย์ประจำวิชา' : 'Teacher')
                    : currentRole === 'student'
                    ? (ownStudent
                        ? (lang === 'th' ? `ชั้น ${ownStudent.gradeLevel}/${ownStudent.room}` : `Grade ${ownStudent.gradeLevel}/${ownStudent.room}`)
                        : (lang === 'th' ? 'บัญชีนักเรียน' : 'Student'))
                    : currentRole === 'parent'
                    ? (ownStudent
                        ? (lang === 'th' ? `ผู้ปกครองของ ${ownStudent.firstNameTh} (${ownStudent.gradeLevel}/${ownStudent.room})` : `Parent of ${ownStudent.firstNameEn}`)
                        : (lang === 'th' ? 'พอร์ทัลผู้ปกครอง' : 'Parent Portal'))
                    : (lang === 'th' ? 'ผู้บริหารโรงเรียน' : 'School Admin')}
                </p>
              </div>

              {currentRole === 'student' && (
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentScore.exp} EXP</span>
                  </div>
                </div>
              )}
            </div>

            {/* Role-Specific Quick Core Actions */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* TEACHER: Executive Monitor */}
              {currentRole === 'teacher' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('executive')}
                  className="tone-1 tone-card p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--tone)] text-left flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer group min-h-[64px]"
                >
                  <div className="w-10 h-10 rounded-xl tone-chip shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm text-[var(--color-text-title)] group-hover:text-[var(--tone)] transition-colors">
                      {lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview'}
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                      มาเรียน {execMetrics.attendanceRate}% · GPAX {execMetrics.avgGpa} · ป่วย {execMetrics.todayInfirmary}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--tone)] shrink-0" />
                </button>
              )}

              {/* PARENT: Child Daily Summary Card */}
              {currentRole === 'parent' && (
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'สถานะบุตรหลานวันนี้' : "Child's Status Today"}
                    </h2>
                    <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)]">
                      GPA {ownStudent ? ownStudent.gpa.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)]">
                      <p className="text-[10px] text-[var(--color-text-muted)]">{lang === 'th' ? 'เข้าเรียนวันนี้' : 'Attendance'}</p>
                      <p className="font-bold text-[var(--color-text-title)] mt-0.5 tabular-nums">
                        {todayCheckin ? `${todayCheckin.time} น.` : (lang === 'th' ? 'ยังไม่เช็คอิน' : 'Not checked in')}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)]">
                      <p className="text-[10px] text-[var(--color-text-muted)]">{lang === 'th' ? 'ใบแจ้งหนี้ค้างชำระ' : 'Pending Invoices'}</p>
                      <p className="font-bold text-[var(--color-text-title)] mt-0.5 tabular-nums">
                        {invoices.filter((i) => (!ownStudent || i.studentId === ownStudent.id) && i.status !== 'paid').length} {lang === 'th' ? 'รายการ' : 'items'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action 1: Check-in */}
              <button
                type="button"
                onClick={() => setActiveTab('checkin')}
                className="tone-2 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--tone)] text-left flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer group min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-xl tone-chip shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm text-[var(--color-text-title)] group-hover:text-[var(--tone)] transition-colors">
                    {currentRole === 'teacher'
                      ? (lang === 'th' ? 'เช็คชื่อเข้าสอน / แทนนักเรียน' : 'Period & Class Check-in')
                      : currentRole === 'parent'
                      ? (lang === 'th' ? 'ประวัติการมาเรียนบุตรหลาน' : 'Child Attendance Log')
                      : (lang === 'th' ? 'เช็คชื่อเข้า-ออก' : 'Check-in & Out')}
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    {currentRole === 'parent'
                      ? (lang === 'th' ? 'ตรวจสอบเวลาเข้า-ออกประตูโรงเรียน' : 'Gate arrival & departure records')
                      : (lang === 'th' ? 'เซลฟี่ GPS · แตะบัตร NFC · สแกนรายคาบ' : 'Selfie GPS · NFC Tap · Period QR')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--tone)] shrink-0" />
              </button>

              {/* Action 2: Leave Request */}
              <button
                type="button"
                onClick={() => setActiveTab('leave')}
                className="tone-2 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--tone)] text-left flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer group relative min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-xl tone-chip shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm text-[var(--color-text-title)] group-hover:text-[var(--tone)] transition-colors">
                    {currentRole === 'teacher'
                      ? (lang === 'th' ? 'ใบลาออนไลน์' : 'Leave Requests')
                      : (lang === 'th' ? 'ยื่นใบลาออนไลน์' : 'Submit Leave')}
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                    {pendingLeavesCount > 0
                      ? (lang === 'th' ? `รอตรวจ ${pendingLeavesCount} รายการ` : `${pendingLeavesCount} pending`)
                      : (lang === 'th' ? 'ลาป่วย · ลากิจ · ติดตามสถานะ' : 'Sick / Personal leave')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--tone)] shrink-0" />
              </button>

              {/* TEACHER: Direct Jump to Desktop Gradebook & Timetable */}
              {currentRole === 'teacher' && onJumpToDesktopTab && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToDesktopTab('gradebook')}
                    className="min-h-[52px] p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'กรอกคะแนน' : 'Gradebook'}
                    </span>
                    <Laptop className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToDesktopTab('timetable')}
                    className="min-h-[52px] p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ตารางสอน' : 'Timetable'}
                    </span>
                    <Calendar className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  </button>
                </div>
              )}

              {/* STUDENT & TEACHER: Games Hub */}
              {(currentRole === 'student' || currentRole === 'teacher') && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('games');
                    setActiveGameView('hub');
                    setGameHubPage(0);
                  }}
                  className="tone-5 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--tone)] text-left flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer group min-h-[64px]"
                >
                  <div className="w-10 h-10 rounded-xl tone-chip shrink-0">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm text-[var(--color-text-title)] group-hover:text-[var(--tone)] transition-colors">
                      {lang === 'th' ? 'เกมส์ความรู้ & แล็บจำลอง' : 'Learning Games & Labs'}
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {lang === 'th' ? '3D Battle · ตีบอส · แล็บวิชาเรียน' : '3D Battle · Boss Raid · Subject Labs'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--tone)] shrink-0" />
                </button>
              )}

              {/* PARENT: Announcements */}
              {currentRole === 'parent' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  className="tone-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--tone)] text-left flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer group min-h-[64px]"
                >
                  <div className="w-10 h-10 rounded-xl tone-chip shrink-0">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm text-[var(--color-text-title)] group-hover:text-[var(--tone)] transition-colors">
                      {lang === 'th' ? 'ประกาศโรงเรียน' : 'School Announcements'}
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                      {announcements.length} {lang === 'th' ? 'ประกาศล่าสุด' : 'announcements'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--tone)] shrink-0" />
                </button>
              )}

              {/* Action 4: Virtual ID / Profile */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="tone-4 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--tone)] text-left flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer group min-h-[64px]"
              >
                <div className="w-10 h-10 rounded-xl tone-chip shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm text-[var(--color-text-title)] group-hover:text-[var(--tone)] transition-colors">
                    {lang === 'th' ? 'บัตรดิจิทัล & ตั้งค่า' : 'Digital ID & Settings'}
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    {lang === 'th' ? 'บัตรนักเรียน · FaceID · ข้อมูลบัญชี' : 'ID Card · Biometrics · Account'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--tone)] shrink-0" />
              </button>
            </div>
              </>
            )}

            {homePage === 1 && (
              <>
            {/* Today's Daily Status Strip */}
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex flex-wrap items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span>สรุปสถานะประจำวัน</span>
                </span>
                <span className="text-[var(--color-text-muted)] font-mono text-[10px]">{todayStr}</span>
              </h2>

              <div className="space-y-2 text-xs">
                {/* Attendance Status */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {todayCheckin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-title)]">การเช็คชื่อเข้าโรงเรียน</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {todayCheckin 
                          ? `เช็คอินแล้วเวลา ${todayCheckin.time} น.` 
                          : 'ยังไม่พบข้อมูลเช็คชื่อวันนี้'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('checkin')}
                    className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                  >
                    {todayCheckin ? 'ดูรายละเอียด' : 'เช็คอินเลย'}
                  </button>
                </div>

                {/* Homework Count */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-title)]">การบ้านและงานค้าง</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {pendingHomeworkCount > 0 
                          ? `มีงานที่ยังไม่ส่ง ${pendingHomeworkCount} ชิ้น` 
                          : 'ไม่มีการบ้านค้าง ส่งครบทุกวิชาแล้ว!'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('homework')}
                    className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    ตรวจงาน
                  </button>
                </div>
              </div>
            </div>

            {/* School Announcements Section */}
            {announcements.length > 0 && (
              <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <span>ข่าวสารและประกาศโรงเรียน</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('announcements')}
                    className="text-[11px] text-[var(--color-primary-text)] font-semibold hover:underline cursor-pointer"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
                <div className="space-y-2">
                  {announcements.slice(0, 2).map((a) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs">
                      <p className="font-bold text-[var(--color-text-title)] line-clamp-1">{a.title}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            )}

            <nav aria-label="หน้าหลัก" className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHomePage(0)}
                className={`min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                  homePage === 0
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                ภาพรวม (หน้า 1)
              </button>
              <div aria-live="polite" className="text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)]">
                {homePage + 1} / 2
              </div>
              <button
                type="button"
                onClick={() => setHomePage(1)}
                className={`min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                  homePage === 1
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                สรุปวันนี้ (หน้า 2)
              </button>
            </nav>
              </>
            )}
          </div>
        )}

        {/* TAB: ADMIN QUICK WORKSPACE */}
        {activeTab === 'admin_quick' && (
          <MobileAdminQuickHub
            activeSchool={activeSchool}
            students={students}
            teachers={teachers}
            courses={courses}
            leaveRequests={leaveRequests}
            invoices={invoices}
            announcements={announcements}
            lang={lang}
            currentUser={currentUser}
            onUpdateStudent={onUpdateStudent}
            onUpdateSchool={onUpdateSchool}
            onAddAnnouncement={onAddAnnouncement}
            onUpdateLeaveStatus={onUpdateLeaveStatus}
            onApproveInvoiceSlip={onApproveInvoiceSlip}
            onRejectInvoiceSlip={onRejectInvoiceSlip}
            onJumpToDesktopTab={onJumpToDesktopTab}
            onOpenCheckin={() => setActiveTab('checkin')}
          />
        )}

        {/* TAB: SUPER ADMIN SCHOOLS & APPROVALS */}
        {activeTab === 'super_schools' && (
          <MobileSuperAdminHub
            schools={schools}
            activeSchool={activeSchool}
            isDemoMode={isDemoMode}
            lang={lang}
            coordinationUnreadCount={coordinationUnreadCount}
            onViewSchool={onViewSchool}
            onToggleSchoolStatus={onToggleSchoolStatus}
            onUpdateSchoolFeatureFlags={onUpdateSchoolFeatureFlags}
            onJumpToDesktopTab={onJumpToDesktopTab}
          />
        )}

        {/* TAB EXECUTIVE: CLEAN, MOBILE-FIRST DIRECTOR DASHBOARD */}
        {activeTab === 'executive' && (
          <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-200">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black flex items-center gap-1.5">
                      <span>แดชบอร์ดสรุปผู้บริหาร</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-semibold">ผอ. / MIS</span>
                    </h2>
                    <p className="text-[11px] text-slate-300">{activeSchool.nameTh || activeSchool.nameEn}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToDesktopMode}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="สลับไปจอทีวีห้องผู้บริหารขนาดเต็ม"
                >
                  <Laptop className="w-3 h-3" />
                  <span>จอทีวี</span>
                </button>
              </div>
            </div>

            {/* 4 Core Executive Metric Cards (Vertical, Clean, Space-optimized) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Attendance */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">การมาเรียนวันนี้</span>
                  <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    {execMetrics.attendanceRate}%
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    มา {execMetrics.presentCount} • สาย {execMetrics.lateCount} • ขาด {execMetrics.absentCount}
                  </p>
                </div>
              </div>

              {/* Card 2: Academic GPAX */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">เกรดเฉลี่ย (GPAX)</span>
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                    {execMetrics.avgGpa}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    เกียรตินิยม (&ge;3.5) {execMetrics.honorCount} คน
                  </p>
                </div>
              </div>

              {/* Card 3: Infirmary & Care */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ห้องพยาบาล &amp; SDQ</span>
                  <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                    <HeartPulse className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
                    {execMetrics.todayInfirmary} <span className="text-xs font-normal">เคส</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    กลุ่มเสี่ยง SDQ {execMetrics.riskCount} คน
                  </p>
                </div>
              </div>

              {/* Card 4: Finance */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ยอดจัดเก็บค่าเทอม</span>
                  <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono">
                    ฿{execMetrics.totalCollected.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    ค้างชำระ {execMetrics.pendingCount} ใบเสร็จ
                  </p>
                </div>
              </div>
            </div>

            {/* School Composition Summary */}
            <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex flex-wrap items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span>อัตราส่วนทรัพยากรโรงเรียน</span>
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">MIS ข้อมูลล่าสุด</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>นักเรียน</span>
                  </div>
                  <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">{execMetrics.totalStudents} คน</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>ครู &amp; บุคลากร</span>
                  </div>
                  <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">{execMetrics.totalTeachers} ท่าน</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>รายวิชา</span>
                  </div>
                  <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">{execMetrics.totalCourses} วิชา</div>
                </div>
              </div>
            </div>

            {/* Director Quick Links */}
            <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                <span>ทางลัดการบริหาร</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('checkin')}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
                >
                  <span>มอนิเตอร์การเช็คชื่อ</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leave')}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
                >
                  <span>อนุมัติใบลา ({pendingLeavesCount})</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB B: CHECK-IN (เช็คชื่อ) */}
        {activeTab === 'checkin' && (
          <div className="h-full min-h-0 animate-in fade-in duration-200">
            <MobileAttendanceView
              embeddedMobile
              initialSubTab={initialAttendanceSubTab}
              initialPeriodCourseId={initialPeriodCourseId}
              initialPeriodNumber={initialPeriodNumber}
              initialPeriodDate={initialPeriodDate}
              initialPeriodCode={initialPeriodCode}
              students={students}
              teachers={teachers}
              courses={courses}
              attendance={attendance}
              periodAttendance={periodAttendance}
              currentUser={currentUser}
              school={activeSchool}
              campusGates={campusGates}
              leaveRequests={leaveRequests}
              lang={lang}
              onRecordAttendance={onRecordAttendance}
              onRecordPeriodAttendance={onRecordPeriodAttendance}
              onAddLeaveRequest={onAddLeaveRequest}
              onUpdateLeaveStatus={onUpdateLeaveStatus}
            />
          </div>
        )}

        {/* TAB C: LEAVE REQUESTS (ใบลา) */}
        {activeTab === 'leave' && (
          <div className="h-full min-h-0 animate-in fade-in duration-200">
            <MobileAttendanceView
              embeddedMobile
              initialSubTab="leave_request"
              students={students}
              teachers={teachers}
              courses={courses}
              attendance={attendance}
              periodAttendance={periodAttendance}
              currentUser={currentUser}
              school={activeSchool}
              campusGates={campusGates}
              leaveRequests={leaveRequests}
              lang={lang}
              onRecordAttendance={onRecordAttendance}
              onRecordPeriodAttendance={onRecordPeriodAttendance}
              onAddLeaveRequest={onAddLeaveRequest}
              onUpdateLeaveStatus={onUpdateLeaveStatus}
            />
          </div>
        )}

        {/* TAB D: GAMES HUB (เมนูรวมเกมส์) */}
        {activeTab === 'games' && (
          <div className="animate-in fade-in duration-200 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-700 via-rose-700 to-indigo-800 text-white shadow-lg space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-100">
                <span>🎮 ศูนย์รวมเกมส์ & สนามประลอง</span>
                <span>EXP: {currentScore.exp}</span>
              </div>
              <h2 className="text-base font-black">เลือกเกมเพื่อเริ่มเล่น (โหมดอาร์เคดเต็มจอ)</h2>
              <p className="text-[11px] text-slate-100">สนามประลองปัญญาและแล็บจำลอง โหมดเกมตอบสด หน้าจออาร์เคดกระชับ ไร้ความรก</p>
            </div>

            <div className="space-y-2.5">
              {gameHubPage === 0 && (
                <>
                  {/* Game 0: EduArcade 7-Genre Studio */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('arcade_studio')}
                    className="w-full p-4 rounded-2xl border-2 border-cyan-500/70 bg-gradient-to-r from-cyan-950/60 via-indigo-950/60 to-slate-900 hover:border-cyan-400 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-black text-sm text-white">EduArcade ศูนย์เกม 7 สไตล์</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-slate-950 font-black">NEW • 8 สาระ</span>
                        </div>
                        <p className="text-xs text-cyan-100/80 mt-0.5">ยิงอุกกาบาตสมการ จับคู่ 8 สาระ ต่อคำศัพท์ ChronoSort &amp; ภารกิจรายวัน</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cyan-300 shrink-0" />
                  </button>

                  {/* Game 1: 3D EduArena Battle Royale */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('battle_royale_3d')}
                    className="w-full p-4 rounded-2xl border border-amber-400/60 bg-[var(--color-card)] hover:border-amber-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">3D EduArena Battle Royale</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-slate-950 font-black">3D</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">วิ่งล่าหีบสมบัติ ตอบคำถามชิงคะแนน มีปุ่มซูม 3D</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>

                  {/* Game 2: 1v1 Battle Arena */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('1v1_arena')}
                    className="w-full p-4 rounded-2xl border border-rose-400/60 bg-[var(--color-card)] hover:border-rose-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold shrink-0">
                        <Swords className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">1v1 แบทเทิลดวลความเร็ว</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-700 text-white font-bold">1v1</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">สู้กับบอทหรือเพื่อน ตอบโจทย์ไว ชิง HP หน้าเดียวกระชับ</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                </>
              )}

              {gameHubPage === 1 && (
                <>
                  {/* Game 3: Co-op Boss Raid */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('boss_raid')}
                    className="w-full p-4 rounded-2xl border border-red-400/60 bg-[var(--color-card)] hover:border-red-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 flex items-center justify-center font-bold shrink-0">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">Co-op Boss Raid (ตีบอส)</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-700 text-white font-bold">CO-OP</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">รวมพลังตีบอสประจำวิชา มีปุ่มซูมตัวบอส ไม่ต้องเลื่อนหน้า</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>

                  {/* Game 4: Subject Labs & Chemistry */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('subject_labs')}
                    className="w-full p-4 rounded-2xl border border-blue-400/60 bg-[var(--color-card)] hover:border-blue-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
                        <FlaskConical className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">เวิร์กช็อปจำลอง 6 สาระ</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-700 text-white font-bold">SIM</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">จำลองการทดลองเคมี จรวดฟิสิกส์ ครัวไวยากรณ์ โค้ดดิ้ง และแผนที่โลก</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                </>
              )}

              {gameHubPage === 2 && (
                <>
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      รางวัลและผลงาน • ไม่ใช่โหมดเกม
                    </h3>
                  </div>

                  {/* Achievement gallery is kept separate from playable modes. */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('hall_of_fame')}
                    className="w-full p-4 rounded-2xl border border-indigo-400/60 bg-[var(--color-card)] hover:border-indigo-500 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-[var(--color-text-title)]">ถ้วยรางวัลและเกียรติบัตร</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-700 text-white font-bold">รางวัล</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">ดูถ้วยรางวัล 3 มิติและเกียรติบัตรที่ได้รับ</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                    </>
                  )}
                    </div>

                <nav aria-label="เลือกหมวดเกม" className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setGameHubPage((page) => Math.max(0, page - 1))}
                    disabled={gameHubPage === 0}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span aria-live="polite" className="text-[11px] font-semibold text-[var(--color-text-muted)]">{gameHubPage + 1} / 3</span>
                  <button
                    type="button"
                    onClick={() => setGameHubPage((page) => Math.min(2, page + 1))}
                    disabled={gameHubPage === 2}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </nav>
              </div>
        )}

        {/* TAB E: PROFILE & DIGITAL VIRTUAL ID CARD */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {profilePage === 0 && (
              <DigitalIdCardView
                students={currentRole === 'student' && ownStudent ? [ownStudent] : students}
                school={activeSchool}
                lang={lang}
                currentRole={currentRole}
                onUpdateStudent={onUpdateStudent}
              />
            )}

            {/* Quick Profile Actions & Settings */}
            {profilePage === 1 && <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">การตั้งค่าและบัญชีผู้ใช้</h3>
              
              <div className="space-y-2 text-xs">
                {/* Full Profile & Portfolio Modal trigger */}
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span className="font-bold">แก้ไขข้อมูลส่วนตัว &amp; พอร์ตฟอลิโอ</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>

                {/* Theme Palette Switcher */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text-title)]">โหมดสีถนอมสายตา</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_warm')}
                      className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${themePalette === 'light_warm' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      อบอุ่น
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_sky')}
                      className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${themePalette === 'light_sky' ? 'bg-[var(--color-primary)] text-white font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      ฟ้าคราม
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('sapphire')}
                      className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${themePalette === 'sapphire' ? 'bg-indigo-700 text-white font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      มืดคราม
                    </button>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text-title)]">ภาษาของระบบ</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLang('th')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${lang === 'th' ? 'bg-[var(--color-primary)] text-white font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      ไทย (TH)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${lang === 'en' ? 'bg-[var(--color-primary)] text-white font-black' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'}`}
                    >
                      English (EN)
                    </button>
                  </div>
                </div>

                {/* Onboarding Tutor & Thai Systems Guide */}
                {onOpenOnboardingTutor && (
                  <button
                    type="button"
                    onClick={onOpenOnboardingTutor}
                    className="w-full p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-bold flex items-center justify-between text-left cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <div className="text-xs font-bold">ติวเตอร์ระบบ & คู่มือการศึกษาไทย</div>
                        <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-normal">DMC, MIS, CCT, OBEC Care, O-NET, HRMS, DPA, ปพ.3</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600" />
                  </button>
                )}

                {/* Mobile App Install Button */}
                <PWAInstallButton lang={lang} variant="sidebar" />

                {/* Biometric Security & Passkey Card (WebAuthn FaceID / TouchID) */}
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-bold text-[var(--color-text-title)] truncate">
                        {lang === 'th' ? 'สแกน FaceID / TouchID' : 'Biometric Security'}
                      </span>
                    </div>
                    {passkey && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                        {lang === 'th' ? 'เปิดใช้งาน' : 'Active'}
                      </span>
                    )}
                  </div>

                  {bioMsg && (
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{bioMsg}</p>
                  )}
                  {bioErr && (
                    <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{bioErr}</p>
                  )}

                  {!passkey ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {webAuthnInfo
                          ? (lang === 'th' ? webAuthnInfo.reasonTh : webAuthnInfo.reasonEn)
                          : (lang === 'th' ? 'ใช้สแกนใบหน้าหรือลายนิ้วมือเพื่อยืนยันตัวตนและล็อกเช็คชื่อด่วน' : 'Use FaceID/TouchID for fast login and quick attendance lock')}
                      </p>
                      <button
                        type="button"
                        disabled={bioBusy || webAuthnInfo?.supported === false}
                        onClick={handleEnrollPasskey}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>
                          {bioBusy
                            ? (lang === 'th' ? 'กำลังลงทะเบียน...' : 'Enrolling...')
                            : (lang === 'th' ? 'ผูก FaceID / TouchID' : 'Enroll FaceID / TouchID')}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {passkey.deviceLabel}
                      </p>

                      {['admin', 'super_admin', 'teacher'].includes(currentRole) && (
                        <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                          <span className="text-[11px] font-semibold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ล็อกเมนูเช็คชื่อด่วน' : 'Lock Quick Attendance'}
                          </span>
                          <input
                            type="checkbox"
                            checked={passkey.protectQuickAttendance}
                            onChange={(e) => {
                              if (!currentUser) return;
                              const updated = updatePasskeyPreferences(currentUser.id, {
                                protectQuickAttendance: e.target.checked,
                              });
                              setPasskey(updated);
                            }}
                            className="w-4 h-4 accent-[var(--color-primary)]"
                          />
                        </label>
                      )}

                      <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                        <span className="text-[11px] font-semibold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'ยืนยันตัวตนหน้าเข้าสู่ระบบ' : 'Enable Sign-In Biometrics'}
                        </span>
                        <input
                          type="checkbox"
                          checked={passkey.biometricLoginEnabled}
                          onChange={(e) => {
                            if (!currentUser) return;
                            const updated = updatePasskeyPreferences(currentUser.id, {
                              biometricLoginEnabled: e.target.checked,
                            });
                            setPasskey(updated);
                          }}
                          className="w-4 h-4 accent-[var(--color-primary)]"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={bioBusy}
                          onClick={handleTestPasskey}
                          className="flex-1 min-h-[40px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Fingerprint className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{bioBusy ? '...' : (lang === 'th' ? 'ทดสอบสแกน' : 'Test')}</span>
                        </button>

                        {onBiometricLock && (
                          <button
                            type="button"
                            onClick={onBiometricLock}
                            className="flex-1 min-h-[40px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'ล็อกหน้าจอด่วน' : 'Lock Screen'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) return;
                            removeEnrolledPasskey(currentUser.id);
                            setPasskey(null);
                            setBioMsg(lang === 'th' ? 'ลบ Passkey แล้ว' : 'Passkey removed');
                          }}
                          className="min-h-[40px] px-3 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center justify-center cursor-pointer"
                          title={lang === 'th' ? 'ลบ Passkey ออกจากเครื่องนี้' : 'Remove Passkey'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Switch to Full Desktop View */}
                <button
                  type="button"
                  onClick={onSwitchToDesktopMode}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold flex items-center justify-between text-left cursor-pointer hover:opacity-90"
                >
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4" />
                    <span>{lang === 'th' ? 'สลับเป็นมุมมองคอมพิวเตอร์' : 'Switch to Desktop View'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full p-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold flex items-center justify-center gap-2 transition hover:bg-rose-100 dark:hover:bg-rose-900 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>}

            <nav aria-label="โปรไฟล์" className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setProfilePage(0)}
                disabled={profilePage === 0}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
              >
                บัตรดิจิทัล
              </button>
              <span aria-live="polite" className="text-[11px] font-semibold text-[var(--color-text-muted)]">{profilePage + 1} / 2</span>
              <button
                type="button"
                onClick={() => setProfilePage(1)}
                disabled={profilePage === 1}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-45 cursor-pointer"
              >
                ตั้งค่า
              </button>
            </nav>
          </div>
        )}

        {/* TAB F: HOMEWORK (การบ้านและภารกิจ) */}
        {activeTab === 'homework' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้าหลัก</span>
              </button>
              <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">รายการการบ้านและงานค้าง</h2>
            </div>

            <PagedList
              items={assignments}
              pageSize={2}
              previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
              nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
              paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าการบ้าน' : 'Homework pages'}
              emptyState={<div className="text-center py-12 text-[var(--color-text-muted)] text-xs">ไม่มีการบ้านในระบบ</div>}
              renderItem={(asg) => {
                const isDone = myCompletedSubmissions.has(asg.id);
                return (
                  <div
                    key={asg.id}
                    className={`p-3.5 rounded-2xl border ${
                      isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                        : 'bg-[var(--color-card)] border-[var(--color-border)]'
                    } shadow-xs space-y-2 text-xs`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[var(--color-text-muted)]">
                        {courses.find(c => c.id === asg.courseId)?.code || courses.find(c => c.id === asg.courseId)?.titleTh || 'วิชาเรียน'}
                      </span>
                      <span className={`font-bold ${
                        isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {isDone ? 'ส่งแล้ว' : 'รอส่ง'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[var(--color-text-title)]">
                      {lang === 'th' ? (asg.titleTh || asg.titleEn) : (asg.titleEn || asg.titleTh)}
                    </h4>

                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      <span>กำหนดส่ง: {asg.dueDate}</span>
                      <span className="font-semibold text-[var(--color-text-title)]">{asg.points} คะแนน</span>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* TAB G: ANNOUNCEMENTS (ประกาศโรงเรียน) */}
        {activeTab === 'announcements' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {selectedAnnouncement ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>กลับสู่รายการ</span>
                  </button>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{selectedAnnouncement.publishedAt}</span>
                </div>
                <article className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
                  <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">{selectedAnnouncement.title}</h2>
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    {selectedAnnouncement.author} ({selectedAnnouncement.authorRole})
                  </p>
                  <PagedList
                    items={splitAnnouncementIntoPages(selectedAnnouncement.content)}
                    pageSize={1}
                    previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
                    nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
                    paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
                    renderItem={(pageText, pageIndex) => (
                      <p key={pageIndex} className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--color-text-body)]">
                        {pageText}
                      </p>
                    )}
                  />
                </article>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>กลับหน้าหลัก</span>
                  </button>
                  <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">ประกาศและข่าวสารโรงเรียน</h2>
                </div>

                <PagedList
                  items={announcements}
                  pageSize={2}
                  previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
                  nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
                  paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
                  emptyState={<p className="py-8 text-center text-xs text-[var(--color-text-muted)]">ไม่มีประกาศ</p>}
                  renderItem={(a) => (
                <div 
                  key={a.id} 
                  className={`p-4 rounded-2xl border ${
                    a.pinned 
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40' 
                      : 'bg-[var(--color-card)] border-[var(--color-border)]'
                  } shadow-xs space-y-2 text-xs`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    <span className="font-semibold text-[var(--color-primary-text)]">{a.category}</span>
                    <span>{a.publishedAt}</span>
                  </div>

                  <h4 className="font-bold text-sm text-[var(--color-text-title)]">{a.title}</h4>
                  <p className="text-[var(--color-text-body)] leading-relaxed text-xs whitespace-pre-line line-clamp-2">{a.content}</p>

                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {a.author} · {a.authorRole}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAnnouncement(a)}
                      className="shrink-0 text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      อ่านทั้งหมด
                    </button>
                  </div>
                </div>
                  )}
                />
              </>
            )}
          </div>
        )}
        </ViewErrorBoundary>
      </main>

      {/* ======================================================== */}
      {/* 3. ROLE-ADAPTIVE MOBILE BOTTOM NAVIGATION BAR (THUMB ZONE) */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md px-1.5 py-1 shadow-2xl safe-area-bottom">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {/* SLOT 1: HOME (All roles) */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`tone-1 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {currentRole === 'super_admin' ? <ShieldCheck className="w-5 h-5 mb-0.5" /> : <Home className="w-5 h-5 mb-0.5" />}
            <span className="text-[10px] font-semibold truncate max-w-full">
              {currentRole === 'super_admin'
                ? (lang === 'th' ? 'แม่ข่าย' : 'Master')
                : currentRole === 'parent'
                ? (lang === 'th' ? 'บุตรหลาน' : 'Child')
                : (lang === 'th' ? 'หน้าหลัก' : 'Home')}
            </span>
          </button>

          {/* SLOT 2: ROLE-SPECIFIC PRIMARY WORKSPACE */}
          {currentRole === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('admin_quick')}
              className={`tone-1 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
                activeTab === 'admin_quick'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {(pendingLeavesCount + invoices.filter((i) => i.slipStatus === 'pending_review').length) > 0 && (
                <span className="absolute top-1 right-3 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black tabular-nums">
                  {pendingLeavesCount + invoices.filter((i) => i.slipStatus === 'pending_review').length}
                </span>
              )}
              <Edit3 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'จัดการด่วน' : 'Quick Edit'}</span>
            </button>
          ) : currentRole === 'super_admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('super_schools')}
              className={`tone-1 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'super_schools'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Building2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'โรงเรียน' : 'Schools'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              className={`tone-2 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
                activeTab === 'checkin'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Clock className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">
                {currentRole === 'parent' ? (lang === 'th' ? 'มาเรียน' : 'Logs') : (lang === 'th' ? 'เช็คชื่อ' : 'Check-in')}
              </span>
            </button>
          )}

          {/* SLOT 3: CHECKIN (Admin) / EXECUTIVE (Super Admin) / LEAVE (Teacher, Student, Parent) */}
          {currentRole === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              className={`tone-2 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'checkin'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Clock className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'เช็คชื่อ' : 'Check-in'}</span>
            </button>
          ) : currentRole === 'super_admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className={`tone-2 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Monitor className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'ภาพรวม' : 'Monitor'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('leave')}
              className={`tone-2 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
                activeTab === 'leave'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {pendingLeavesCount > 0 && (
                <span className="absolute top-1 right-3 px-1 rounded-full bg-rose-700 text-white text-[9px] font-black tabular-nums">
                  {pendingLeavesCount}
                </span>
              )}
              <FileText className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'ใบลา' : 'Leave'}</span>
            </button>
          )}

          {/* SLOT 4: ROLE SECONDARY DESTINATION */}
          {currentRole === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className={`tone-1 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Monitor className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'มอนิเตอร์' : 'MIS'}</span>
            </button>
          ) : currentRole === 'super_admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              className={`tone-2 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'checkin'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Clock className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'เช็คชื่อ' : 'Check-in'}</span>
            </button>
          ) : currentRole === 'teacher' ? (
            <button
              type="button"
              onClick={() => setActiveTab('homework')}
              className={`tone-5 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'homework'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <BookOpen className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'การบ้าน' : 'Tasks'}</span>
            </button>
          ) : currentRole === 'parent' ? (
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`tone-3 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <BellRing className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'ประกาศ' : 'News'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveTab('games');
                setActiveGameView('hub');
              }}
              className={`tone-5 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'games'
                  ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Gamepad2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-semibold truncate max-w-full">{lang === 'th' ? 'เกมส์' : 'Arcade'}</span>
            </button>
          )}

          {/* SLOT 5: PROFILE & SETTINGS (All roles) */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`tone-4 min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold truncate max-w-full">
              {currentRole === 'admin' || currentRole === 'super_admin'
                ? (lang === 'th' ? 'ตั้งค่า' : 'Settings')
                : (lang === 'th' ? 'โปรไฟล์' : 'Profile')}
            </span>
          </button>
        </div>
      </nav>

      {/* ======================================================== */}
      {/* IMMERSIVE FULLSCREEN GAME TAKEOVER (แสดงเต็มจอ ไม่มีเมนูรก) */}
      {/* ======================================================== */}
      {activeGameView !== 'hub' && (
        <div className="fixed inset-0 z-50 bg-slate-950 w-full h-dvh flex flex-col overflow-hidden animate-in fade-in duration-200">
          <ViewErrorBoundary
            resetKey={`game:${activeGameView}`}
            lang={lang}
            viewName={`mobile-game:${activeGameView}`}
            onBackHome={() => setActiveGameView('hub')}
          >
          {activeGameView === 'battle_royale_3d' && (
            <div className="h-full w-full overflow-hidden">
              <EduBattleRoyale3DView
                questions={questions}
                currentUser={currentUser}
                lang={lang}
                rewardItems={rewardItems}
                onEarnRewards={onEarnRewards}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'arcade_studio' && (
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950">
              <EduBattleGameView
                questions={questions}
                playerScores={playerScores}
                rewardItems={rewardItems}
                currentUser={currentUser}
                lang={lang}
                initialSubTab="hub"
                isMobileMode={true}
                onAddQuestion={onAddQuestion}
                onImportQuestions={onImportQuestions}
                onEarnRewards={onEarnRewards}
                onRedeemReward={onRedeemReward}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === '1v1_arena' && (
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950">
              <EduBattleGameView
                questions={questions}
                playerScores={playerScores}
                rewardItems={rewardItems}
                currentUser={currentUser}
                lang={lang}
                initialSubTab="arena"
                isMobileMode={true}
                onAddQuestion={onAddQuestion}
                onImportQuestions={onImportQuestions}
                onEarnRewards={onEarnRewards}
                onRedeemReward={onRedeemReward}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'boss_raid' && (
            <div className="h-full w-full overflow-y-auto flex flex-col bg-slate-950 p-1 sm:p-3">
              <CoopBossRaidView
                questions={questions}
                lang={lang}
                currentRole={currentRole}
                currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'subject_labs' && (
            <div className="h-full w-full overflow-hidden flex flex-col">
              <SubjectLabSimulationView
                currentUserRole={currentRole}
                currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                lang={lang}
                onEarnRewards={onEarnRewards}
                onBackToGames={() => setActiveGameView('hub')}
              />
            </div>
          )}

          {activeGameView === 'hall_of_fame' && (
            <div className="h-full w-full overflow-y-auto flex flex-col bg-slate-950 p-1 sm:p-3">
              <HallOfFame3DView
                lang={lang}
                school={activeSchool}
                onExit={() => setActiveGameView('hub')}
              />
            </div>
          )}
          </ViewErrorBoundary>
        </div>
      )}
    </div>
  );
};
