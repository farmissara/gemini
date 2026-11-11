import React, { useState } from 'react';
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
  HelpCircle
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
  AttendanceUserType
} from '../types';
import { getLocalDateString } from '../lib/date';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  isRestrictedAttendanceViewer,
  resolveOwnStudent,
} from '../lib/attendanceScope';
import { MobileAttendanceView } from './MobileAttendanceView';
import { EduBattleGameView } from './EduBattleGameView';
import { EduBattleRoyale3DView } from './EduBattleRoyale3DView';
import { CoopBossRaidView } from './CoopBossRaidView';
import { SubjectLabSimulationView } from './SubjectLabSimulationView';
import { HallOfFame3DView } from './HallOfFame3DView';
import { DigitalIdCardView } from './DigitalIdCardView';
import { PagedList } from './PagedList';
import { PWAInstallButton } from './PWAInstallButton';

export type MobileTab = 'home' | 'checkin' | 'leave' | 'games' | 'profile' | 'homework' | 'announcements';

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
  initialMobileTab?: MobileTab;
  initialAttendanceSubTab?: 'selfie_mobile' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
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
  initialMobileTab = 'home',
  initialAttendanceSubTab = 'selfie_mobile',
  initialPeriodCourseId,
  initialPeriodNumber,
  initialPeriodDate,
  initialPeriodCode,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>(initialMobileTab);
  const [activeGameView, setActiveGameView] = useState<'hub' | 'battle_royale_3d' | '1v1_arena' | 'boss_raid' | 'subject_labs' | 'hall_of_fame'>('hub');
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

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-body)] pb-16 select-none">
      {/* ======================================================== */}
      {/* 1. TOP MOBILE HEADER */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[var(--color-text-title)] tracking-tight truncate">EduVerse</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary-text)] shrink-0">
                {lang === 'th' ? 'โหมดมือถือ' : 'Mobile'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[170px]">
              {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
            </p>
          </div>
        </div>

        {/* Right actions: Desktop Switcher & Profile Avatar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Onboarding Tutor */}
          {onOpenOnboardingTutor && (
            <button
              type="button"
              onClick={onOpenOnboardingTutor}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold transition shadow-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60"
              title="คู่มือและติวเตอร์ระบบการศึกษาไทย"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden xs:inline">ติวเตอร์</span>
            </button>
          )}

          {/* Switch to Full Computer / Desktop View */}
          <button
            type="button"
            onClick={onSwitchToDesktopMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)] hover:opacity-90 text-[var(--color-primary-text)] text-[11px] font-bold transition shadow-xs cursor-pointer"
            title="สลับเป็นมุมมองคอมพิวเตอร์ (Desktop ERP)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">มุมมอง</span>คอมพิวเตอร์
          </button>

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-text-body)] cursor-pointer"
            title="เปลี่ยนภาษา (TH/EN)"
          >
            {lang.toUpperCase()}
          </button>

          {/* Mobile Install App Button */}
          <PWAInstallButton lang={lang} variant="nav" />

          {/* Web Push & Notification Center Trigger */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] transition cursor-pointer"
              title={lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            >
              <Bell className="w-4 h-4 text-[var(--color-primary-text)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile Thumbnail */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-[var(--color-primary)] shadow-xs shrink-0 cursor-pointer"
          >
            <img 
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
              alt={currentUser?.fullNameTh || 'User'} 
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN ACTIVE VIEW CONTAINER */}
      {/* ======================================================== */}
      <main className="flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto p-3.5 sm:p-4 overflow-y-auto">
        {/* TAB A: HOME / MOBILE BRIEFING */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 py-1 animate-in fade-in duration-200">
            {homePage === 0 && (
              <>
            {/* Welcome & Persona Card */}
            <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-950 text-white shadow-xl shadow-blue-950/20">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-100 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-amber-300" />
                    <span>{todayStr} • โรงเรียนเปิดทำการ</span>
                  </span>
                  <h1 className="text-lg font-black mt-1">
                    สวัสดี {currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน'}
                  </h1>
                  <p className="text-xs text-slate-100 mt-0.5">
                    {currentRole === 'teacher' ? '👨‍🏫 อาจารย์ประจำวิชา' :
                     currentRole === 'student' ? '🎒 นักเรียนชั้น ม.6/1' :
                     currentRole === 'admin' ? '🏛️ ผู้บริหารโรงเรียน' : '🛡️ สมาชิก EduVerse'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/50 backdrop-blur-md border border-white/25 text-xs font-bold text-amber-300">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{currentScore.exp} EXP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile App Install Card (Android & iOS) */}
            <PWAInstallButton lang={lang} variant="mobile_card" />

            {/* Quick 4 Core Actions (Check-in, Leave, Games, Profile) */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Action 1: Check-in */}
              <button
                type="button"
                onClick={() => setActiveTab('checkin')}
                className="p-3.5 sm:p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-left flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-xs cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-sm text-[var(--color-text-title)] group-hover:text-[var(--color-primary-text)] transition-colors">เช็คชื่อเข้า-ออก (Check-in)</h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">GPS Geofence &amp; สแกนใบหน้า</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-text)] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Action 2: Leave Request */}
              <button
                type="button"
                onClick={() => setActiveTab('leave')}
                className="p-3.5 sm:p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-emerald-500 text-left flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-xs cursor-pointer group relative"
              >
                {pendingLeavesCount > 0 && (
                  <span className="absolute top-3 right-8 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                    {pendingLeavesCount}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-sm text-[var(--color-text-title)] group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">ใบลาออนไลน์</h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">ลาป่วย / ลากิจ &amp; ติดตามสถานะ</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-emerald-600 dark:group-hover:text-emerald-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Action 3: Games Hub */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('games');
                  setActiveGameView('hub');
                  setGameHubPage(0);
                }}
                className="p-3.5 sm:p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-amber-500 text-left flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-xs cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-sm text-[var(--color-text-title)] group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">เกมส์ความรู้ &amp; เวิร์กช็อป 6 มิติ</h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">3D Battle, บอส, แล็บจำลองทุกวิชา</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-amber-600 dark:group-hover:text-amber-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Action 4: Virtual ID / Profile */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="p-3.5 sm:p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-purple-500 text-left flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-xs cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-sm text-[var(--color-text-title)] group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">บัตรดิจิทัล &amp; โปรไฟล์</h2>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Virtual ID Card &amp; ผลการเรียน</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-purple-600 dark:group-hover:text-purple-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
              </>
            )}

            {homePage === 1 && (
              <>
            {/* Today's Daily Status Strip */}
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center justify-between">
                <span>สรุปสถานะประจำวัน</span>
                <span className="text-[var(--color-text-muted)] font-mono text-[10px]">{todayStr}</span>
              </h2>

              <div className="space-y-2 text-xs">
                {/* Attendance Status */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5">
                    {todayCheckin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <div>
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
                    className="text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    {todayCheckin ? 'ดูรายละเอียด' : 'เช็คอินเลย'}
                  </button>
                </div>

                {/* Homework Count */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
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
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                  homePage === 0
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                ภาพรวม (หน้า 1)
              </button>
              <div aria-live="polite" className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full transition-all ${homePage === 0 ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-border)]'}`} />
                <span className={`w-2 h-2 rounded-full transition-all ${homePage === 1 ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-border)]'}`} />
              </div>
              <button
                type="button"
                onClick={() => setHomePage(1)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                  homePage === 1
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                สรุปวันนี้ (หน้า 2)
              </button>
            </nav>
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
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">3D HOT</span>
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

                {/* Switch to Full Desktop View */}
                <button
                  type="button"
                  onClick={onSwitchToDesktopMode}
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold flex items-center justify-between text-left cursor-pointer hover:opacity-90"
                >
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4" />
                    <span>สลับเป็นมุมมองคอมพิวเตอร์เต็มจอ (Desktop View)</span>
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
                    <div className="flex items-center justify-between">
                      <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                        {courses.find(c => c.id === asg.courseId)?.code || courses.find(c => c.id === asg.courseId)?.titleTh || 'วิชาเรียน'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDone ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                      }`}>
                        {isDone ? '✓ ส่งแล้ว' : 'รอส่ง'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-[var(--color-text-title)]">
                      {lang === 'th' ? (asg.titleTh || asg.titleEn) : (asg.titleEn || asg.titleTh)}
                    </h4>

                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>กำหนดส่ง: {asg.dueDate}</span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">{asg.points} คะแนน</span>
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
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                      {a.category}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{a.publishedAt}</span>
                  </div>

                  <h4 className="font-extrabold text-sm text-[var(--color-text-title)]">{a.title}</h4>
                  <p className="text-[var(--color-text-body)] leading-relaxed text-xs whitespace-pre-line line-clamp-2">{a.content}</p>

                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      ผู้ประกาศ: {a.author} ({a.authorRole})
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
      </main>

      {/* ======================================================== */}
      {/* 3. SLEEK MOBILE BOTTOM NAVIGATION BAR */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 shadow-2xl safe-area-bottom">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'home'
                ? 'text-[var(--color-primary-text)] font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">หน้าหลัก</span>
          </button>

          {/* 2. Checkin */}
          <button
            type="button"
            onClick={() => setActiveTab('checkin')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              activeTab === 'checkin'
                ? 'text-[var(--color-primary-text)] font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {!todayCheckin && (
              <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">เช็คชื่อ</span>
          </button>

          {/* 3. Leave Requests */}
          <button
            type="button"
            onClick={() => setActiveTab('leave')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              activeTab === 'leave'
                ? 'text-emerald-700 dark:text-emerald-300 font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {pendingLeavesCount > 0 && (
              <span className="absolute top-1 right-4 px-1 py-0.5 rounded-full bg-rose-700 text-white text-[9px] font-black">
                {pendingLeavesCount}
              </span>
            )}
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">ใบลา</span>
          </button>

          {/* 4. Games */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('games');
              setActiveGameView('hub');
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'games'
                ? 'text-amber-700 dark:text-amber-300 font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Gamepad2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">เกมส์</span>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'profile'
                ? 'text-purple-700 dark:text-purple-300 font-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">โปรไฟล์</span>
          </button>
        </div>
      </nav>

      {/* ======================================================== */}
      {/* IMMERSIVE FULLSCREEN GAME TAKEOVER (แสดงเต็มจอ ไม่มีเมนูรก) */}
      {/* ======================================================== */}
      {activeGameView !== 'hub' && (
        <div className="fixed inset-0 z-50 bg-slate-950 w-full h-dvh flex flex-col overflow-hidden animate-in fade-in duration-200">
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
        </div>
      )}
    </div>
  );
};
