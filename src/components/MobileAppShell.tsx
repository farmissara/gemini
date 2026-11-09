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
import { MobileAttendanceView } from './MobileAttendanceView';
import { EduBattleGameView } from './EduBattleGameView';
import { EduBattleRoyale3DView } from './EduBattleRoyale3DView';
import { CoopBossRaidView } from './CoopBossRaidView';
import { SubjectLabSimulationView } from './SubjectLabSimulationView';
import { HallOfFame3DView } from './HallOfFame3DView';
import { DigitalIdCardView } from './DigitalIdCardView';

export type MobileTab = 'home' | 'checkin' | 'leave' | 'games' | 'profile' | 'homework' | 'announcements';

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
  onUpdateStudent
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [activeGameView, setActiveGameView] = useState<'hub' | 'battle_royale_3d' | '1v1_arena' | 'boss_raid' | 'subject_labs' | 'hall_of_fame'>('hub');

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const todayStr = getLocalDateString();

  // Find today's check-in record for current user or first student
  const currentPersonId = currentUser?.id || students[0]?.id;
  const todayCheckin = attendance.find(a => a.studentId === currentPersonId && a.date === todayStr);

  // My pending leave requests
  const myLeaves = leaveRequests.filter(l => l.userId === currentPersonId || l.userRole === currentUser?.role);
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'pending').length;

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
    <div className={`min-h-screen flex flex-col ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'} pb-20 select-none`}>
      {/* ======================================================== */}
      {/* 1. TOP MOBILE HEADER */}
      {/* ======================================================== */}
      <header className={`sticky top-0 z-40 border-b px-3.5 py-2.5 backdrop-blur-md flex items-center justify-between gap-2 shadow-xs transition-colors ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight truncate">EduVerse</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 shrink-0">
                {lang === 'th' ? 'โหมดมือถือ' : 'Mobile'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
              {lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}
            </p>
          </div>
        </div>

        {/* Right actions: Desktop Switcher & Profile Avatar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Switch to Full Computer / Desktop View */}
          <button
            type="button"
            onClick={onSwitchToDesktopMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 text-[11px] font-bold transition shadow-xs cursor-pointer"
            title="สลับเป็นมุมมองคอมพิวเตอร์ (Desktop ERP)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">มุมมอง</span>คอมพิวเตอร์
          </button>

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
            title="เปลี่ยนภาษา (TH/EN)"
          >
            {lang.toUpperCase()}
          </button>

          {/* User Profile Thumbnail */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-600 shadow-xs shrink-0 cursor-pointer"
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
      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-4">
        {/* TAB A: HOME / MOBILE BRIEFING */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Welcome & Persona Card */}
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white shadow-xl shadow-blue-950/20">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-200 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-amber-300" />
                    <span>{todayStr} • โรงเรียนเปิดทำการ</span>
                  </span>
                  <h1 className="text-lg font-black mt-1">
                    สวัสดี {currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน'}
                  </h1>
                  <p className="text-xs text-white/80 mt-0.5">
                    {currentRole === 'teacher' ? '👨‍🏫 อาจารย์ประจำวิชา' :
                     currentRole === 'student' ? '🎒 นักเรียนชั้น ม.6/1' :
                     currentRole === 'admin' ? '🏛️ ผู้บริหารโรงเรียน' : '🛡️ สมาชิก EduVerse'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{currentScore.exp} EXP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 4 Core Actions (Check-in, Leave, Games, Profile) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Action 1: Check-in */}
              <button
                type="button"
                onClick={() => setActiveTab('checkin')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer ${
                  isLight ? 'bg-white border-slate-200 hover:border-blue-400' : 'bg-slate-900 border-slate-800 hover:border-blue-500'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">เช็คชื่อ (Check-in)</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">GPS Geofence & สแกนใบหน้า</p>
                </div>
              </button>

              {/* Action 2: Leave Request */}
              <button
                type="button"
                onClick={() => setActiveTab('leave')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer relative ${
                  isLight ? 'bg-white border-slate-200 hover:border-emerald-400' : 'bg-slate-900 border-slate-800 hover:border-emerald-500'
                }`}
              >
                {pendingLeavesCount > 0 && (
                  <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                    {pendingLeavesCount}
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">ใบลาออนไลน์</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">ลาป่วย / ลากิจ & ติดตามสถานะ</p>
                </div>
              </button>

              {/* Action 3: Games Hub */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('games');
                  setActiveGameView('hub');
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer ${
                  isLight ? 'bg-white border-slate-200 hover:border-amber-400' : 'bg-slate-900 border-slate-800 hover:border-amber-500'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold mb-3">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">เกมส์ความรู้</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">3D Battle, บอส, แล็บจำลอง</p>
                </div>
              </button>

              {/* Action 4: Virtual ID / Profile */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer ${
                  isLight ? 'bg-white border-slate-200 hover:border-purple-400' : 'bg-slate-900 border-slate-800 hover:border-purple-500'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">บัตรดิจิทัล & โปรไฟล์</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Virtual ID Card & ผลการเรียน</p>
                </div>
              </button>
            </div>

            {/* Today's Daily Status Strip */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} shadow-xs space-y-3`}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>สรุปสถานะประจำวัน</span>
                <span className="text-slate-500 font-mono text-[10px]">{todayStr}</span>
              </h2>

              <div className="space-y-2 text-xs">
                {/* Attendance Status */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    {todayCheckin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">การเช็คชื่อเข้าโรงเรียน</p>
                      <p className="text-[11px] text-slate-500">
                        {todayCheckin 
                          ? `เช็คอินแล้วเวลา ${todayCheckin.time} น.` 
                          : 'ยังไม่พบข้อมูลเช็คชื่อวันนี้'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('checkin')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {todayCheckin ? 'ดูรายละเอียด' : 'เช็คอินเลย'}
                  </button>
                </div>

                {/* Homework Count */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">การบ้านและงานค้าง</p>
                      <p className="text-[11px] text-slate-500">
                        {pendingHomeworkCount > 0 
                          ? `มีงานที่ยังไม่ส่ง ${pendingHomeworkCount} ชิ้น` 
                          : 'ไม่มีการบ้านค้าง ส่งครบทุกวิชาแล้ว!'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('homework')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ตรวจงาน
                  </button>
                </div>
              </div>
            </div>

            {/* School Announcements Section */}
            {announcements.length > 0 && (
              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} shadow-xs space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                    <span>ข่าวสารและประกาศโรงเรียน</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('announcements')}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
                <div className="space-y-2">
                  {announcements.slice(0, 2).map((a) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{a.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB B: CHECK-IN (เช็คชื่อ) */}
        {activeTab === 'checkin' && (
          <div className="animate-in fade-in duration-200">
            <MobileAttendanceView
              initialSubTab="selfie_mobile"
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
          <div className="animate-in fade-in duration-200">
            <MobileAttendanceView
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
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 text-white shadow-lg space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                <span>🎮 ศูนย์รวมเกมส์ & สนามประลอง</span>
                <span>EXP: {currentScore.exp}</span>
              </div>
              <h2 className="text-base font-black">เลือกเกมเพื่อเริ่มเล่น (โหมดอาร์เคดเต็มจอ)</h2>
              <p className="text-[11px] text-white/80">สนามประลองปัญญาและแล็บจำลอง โหมดเกมตอบสด หน้าจออาร์เคดกระชับ ไร้ความรก</p>
            </div>

            <div className="space-y-2.5">
                  {/* Game 1: 3D EduArena Battle Royale */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('battle_royale_3d')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer ${
                      isLight ? 'bg-white border-amber-300 hover:border-amber-500' : 'bg-slate-900 border-amber-500/40 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">3D EduArena Battle Royale</h3>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">3D HOT</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">วิ่งล่าหีบสมบัติ ตอบคำถามชิงคะแนน มีปุ่มซูม 3D</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>

                  {/* Game 2: 1v1 Battle Arena */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('1v1_arena')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer ${
                      isLight ? 'bg-white border-rose-300 hover:border-rose-500' : 'bg-slate-900 border-rose-500/40 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold shrink-0">
                        <Swords className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">1v1 แบทเทิลดวลความเร็ว</h3>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">1v1</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">สู้กับบอทหรือเพื่อน ตอบโจทย์ไว ชิง HP หน้าเดียวกระชับ</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>

                  {/* Game 3: Co-op Boss Raid */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('boss_raid')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer ${
                      isLight ? 'bg-white border-red-300 hover:border-red-500' : 'bg-slate-900 border-red-500/40 hover:border-red-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center font-bold shrink-0">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">Co-op Boss Raid (ตีบอส)</h3>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500 text-white font-bold">CO-OP</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">รวมพลังตีบอสประจำวิชา มีปุ่มซูมตัวบอส ไม่ต้องเลื่อนหน้า</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>

                  {/* Game 4: Subject Labs & Chemistry */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('subject_labs')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer ${
                      isLight ? 'bg-white border-blue-300 hover:border-blue-500' : 'bg-slate-900 border-blue-500/40 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold shrink-0">
                        <FlaskConical className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">Subject Labs แล็บจำลอง</h3>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500 text-white font-bold">LAB</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">ผสมสารเคมี ทดลองฟิสิกส์ ซูมขวดทดลองเข้า-ออกได้</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>

                  {/* Game 5: 3D Hall of Fame */}
                  <button
                    type="button"
                    onClick={() => setActiveGameView('hall_of_fame')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs cursor-pointer ${
                      isLight ? 'bg-white border-indigo-300 hover:border-indigo-500' : 'bg-slate-900 border-indigo-500/40 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold shrink-0">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">หอเกียรติยศ 3 มิติ (Hall of Fame)</h3>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500 text-white font-bold">3D</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">ถ้วยรางวัล 3D หมุนและซูมดูผลงาน พร้อมเกียรติบัตร</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>
        )}

        {/* TAB E: PROFILE & DIGITAL VIRTUAL ID CARD */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Digital ID Card Component */}
            <DigitalIdCardView
              students={students}
              school={activeSchool}
              lang={lang}
              currentRole={currentRole}
              onUpdateStudent={onUpdateStudent}
            />

            {/* Quick Profile Actions & Settings */}
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} shadow-xs space-y-3`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">การตั้งค่าและบัญชีผู้ใช้</h3>
              
              <div className="space-y-2 text-xs">
                {/* Full Profile & Portfolio Modal trigger */}
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-bold">แก้ไขข้อมูลส่วนตัว & พอร์ตฟอลิโอ</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Theme Palette Switcher */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold">โหมดสีถนอมสายตา</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_warm')}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${themePalette === 'light_warm' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                      อบอุ่น
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('light_sky')}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${themePalette === 'light_sky' ? 'bg-blue-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                      ฟ้าคราม
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePalette('sapphire')}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${themePalette === 'sapphire' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                      มืดคราม
                    </button>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold">ภาษาของระบบ</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLang('th')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${lang === 'th' ? 'bg-blue-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                      ไทย (TH)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${lang === 'en' ? 'bg-blue-600 text-white font-black' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                      English (EN)
                    </button>
                  </div>
                </div>

                {/* Switch to Full Desktop View */}
                <button
                  type="button"
                  onClick={onSwitchToDesktopMode}
                  className="w-full p-3 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>สลับเป็นมุมมองคอมพิวเตอร์เต็มจอ (Desktop View)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full p-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center gap-2 transition hover:bg-rose-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB F: HOMEWORK (การบ้านและภารกิจ) */}
        {activeTab === 'homework' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้าหลัก</span>
              </button>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">รายการการบ้านและงานค้าง</h2>
            </div>

            <div className="space-y-2.5">
              {assignments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  ไม่มีการบ้านในระบบ
                </div>
              ) : (
                assignments.map((asg) => {
                  const isDone = myCompletedSubmissions.has(asg.id);
                  return (
                    <div 
                      key={asg.id} 
                      className={`p-3.5 rounded-2xl border ${
                        isDone 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      } shadow-xs space-y-2 text-xs`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {courses.find(c => c.id === asg.courseId)?.code || courses.find(c => c.id === asg.courseId)?.titleTh || 'วิชาเรียน'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isDone ? '✓ ส่งแล้ว' : 'รอส่ง'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {lang === 'th' ? (asg.titleTh || asg.titleEn) : (asg.titleEn || asg.titleTh)}
                        </h4>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span>กำหนดส่ง: {asg.dueDate}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{asg.points} คะแนน</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB G: ANNOUNCEMENTS (ประกาศโรงเรียน) */}
        {activeTab === 'announcements' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้าหลัก</span>
              </button>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">ประกาศและข่าวสารโรงเรียน</h2>
            </div>

            <div className="space-y-3">
              {announcements.map((a) => (
                <div 
                  key={a.id} 
                  className={`p-4 rounded-2xl border ${
                    a.pinned 
                      ? 'border-amber-400/80 bg-amber-50/30 dark:bg-amber-950/20' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  } shadow-xs space-y-2 text-xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {a.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{a.publishedAt}</span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{a.title}</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs whitespace-pre-line">{a.content}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>ผู้ประกาศ: {a.author} ({a.authorRole})</span>
                    {a.pinned && <span className="text-amber-500 font-bold">📌 ปักหมุด</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. SLEEK MOBILE BOTTOM NAVIGATION BAR */}
      {/* ======================================================== */}
      <nav className={`fixed bottom-0 inset-x-0 z-40 border-t ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
      } backdrop-blur-md px-2 py-1.5 shadow-2xl safe-area-bottom`}>
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              activeTab === 'home'
                ? 'text-blue-600 dark:text-blue-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
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
                ? 'text-blue-600 dark:text-blue-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
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
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            {pendingLeavesCount > 0 && (
              <span className="absolute top-1 right-4 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
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
                ? 'text-amber-600 dark:text-amber-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
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
                ? 'text-purple-600 dark:text-purple-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
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
        <div className="fixed inset-0 z-50 bg-slate-950 w-screen h-screen flex flex-col overflow-hidden animate-in fade-in duration-200">
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
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950 p-2 sm:p-4">
              <CoopBossRaidView
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
            <div className="h-full w-full overflow-hidden flex flex-col bg-slate-950 p-2 sm:p-4">
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
