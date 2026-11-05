import React, { useState } from 'react';
import { 
  UserRole, 
  School,
  AuthUser,
  Student, 
  Course, 
  AttendanceRecord, 
  GradeRecord, 
  TuitionInvoice, 
  Announcement, 
  SystemConfig, 
  AttendanceStatus,
  AppProgramMode,
  AppLanguage,
  AppTheme,
  ThemePalette,
  Lesson,
  Assignment,
  QuizQuestion,
  PlayerScore,
  RewardItem,
  PeriodAttendanceRecord,
  PortfolioItem
} from './types';
import { 
  INITIAL_SCHOOLS,
  DEMO_USERS,
  INITIAL_STUDENTS, 
  INITIAL_COURSES, 
  INITIAL_GRADES, 
  INITIAL_ATTENDANCE, 
  INITIAL_INVOICES, 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_SYSTEM_CONFIG,
  INITIAL_LESSONS,
  INITIAL_ASSIGNMENTS,
  INITIAL_QUESTIONS,
  INITIAL_PLAYER_SCORES,
  INITIAL_REWARD_ITEMS,
  INITIAL_PERIOD_ATTENDANCE,
  INITIAL_PORTFOLIO_ITEMS
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { AuthLayout } from './components/AuthLayout';
import { SchoolSwitcherModal } from './components/SchoolSwitcherModal';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { CoursesView } from './components/CoursesView';
import { AttendanceView } from './components/AttendanceView';
import { MobileAttendanceView } from './components/MobileAttendanceView';
import { EduBattleGameView } from './components/EduBattleGameView';
import { PortfolioView } from './components/PortfolioView';
import { GradebookView } from './components/GradebookView';
import { BillingView } from './components/BillingView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { IntegrationsView } from './components/IntegrationsView';
import { LmsClassroomView } from './components/LmsClassroomView';
import { ParentPortalView } from './components/ParentPortalView';
import { ReportCardModal } from './components/ReportCardModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { SupabaseRenderModal } from './components/SupabaseRenderModal';
import { SupabaseStudioView } from './components/SupabaseStudioView';
import { LayoutDashboard, QrCode, Gamepad2, Briefcase, GraduationCap, Users } from 'lucide-react';

export const App: React.FC = () => {
  // Multi-School & Auth State
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
  const [activeSchool, setActiveSchool] = useState<School>(INITIAL_SCHOOLS[0]);
  const [demoUsers, setDemoUsers] = useState<AuthUser[]>(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(DEMO_USERS[1]); // Default to School Director / Admin
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [showDatabaseBackup, setShowDatabaseBackup] = useState(false);
  const [showSupabaseRenderModal, setShowSupabaseRenderModal] = useState(false);

  // Navigation, Mode, Theme & Language State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>(currentUser?.role || 'admin');
  const [programMode, setProgramMode] = useState<AppProgramMode>('school_erp');
  const [lang, setLang] = useState<AppLanguage>('th');
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [themePalette, setThemePalette] = useState<ThemePalette>('sapphire');
  const [searchQuery, setSearchQuery] = useState('');

  // Primary Domain State
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [grades, setGrades] = useState<GradeRecord[]>(INITIAL_GRADES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [invoices, setInvoices] = useState<TuitionInvoice[]>(INITIAL_INVOICES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [questions, setQuestions] = useState<QuizQuestion[]>(INITIAL_QUESTIONS);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>(INITIAL_PLAYER_SCORES);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>(INITIAL_REWARD_ITEMS);
  const [periodAttendance, setPeriodAttendance] = useState<PeriodAttendanceRecord[]>(INITIAL_PERIOD_ATTENDANCE);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(INITIAL_PORTFOLIO_ITEMS);

  // Modals
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Filter items by active school
  const schoolStudents = students.filter((s) => s.schoolId === activeSchool.id);
  const schoolCourses = courses.filter((c) => c.schoolId === activeSchool.id);
  const schoolGrades = grades.filter((g) => g.schoolId === activeSchool.id);
  const schoolAttendance = attendance.filter((a) => a.schoolId === activeSchool.id);
  const schoolInvoices = invoices.filter((i) => i.schoolId === activeSchool.id);
  const schoolAnnouncements = announcements.filter((a) => a.schoolId === activeSchool.id);
  const schoolLessons = lessons.filter((l) => l.schoolId === activeSchool.id);
  const schoolAssignments = assignments.filter((a) => a.schoolId === activeSchool.id);
  const schoolQuestions = questions.filter((q) => !q.schoolId || q.schoolId === activeSchool.id);
  const schoolPeriodAttendance = periodAttendance.filter((p) => !p.schoolId || p.schoolId === activeSchool.id);
  const schoolPortfolioItems = portfolioItems.filter((p) => !p.schoolId || p.schoolId === activeSchool.id);

  // Auth Handlers
  const handleLogin = (user: AuthUser, school: School) => {
    setCurrentUser(user);
    setActiveSchool(school);
    setCurrentRole(user.role);
    setSystemConfig((prev) => ({
      ...prev,
      schoolNameEn: school.nameEn,
      schoolNameTh: school.nameTh,
    }));
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleRegisterSchool = (newSchool: School, adminUser: AuthUser) => {
    setSchools((prev) => [newSchool, ...prev]);
    setDemoUsers((prev) => [adminUser, ...prev]);
    setActiveSchool(newSchool);
    setCurrentUser(adminUser);
    setCurrentRole('admin');
    setSystemConfig((prev) => ({
      ...prev,
      schoolNameEn: newSchool.nameEn,
      schoolNameTh: newSchool.nameTh,
    }));
  };

  const handleRegisterUser = (newUser: AuthUser) => {
    setDemoUsers((prev) => [newUser, ...prev]);
    const targetSchool = schools.find((s) => s.id === newUser.schoolId) || schools[0];
    handleLogin(newUser, targetSchool);
  };

  // Domain Handlers
  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [{ ...newStudent, schoolId: activeSchool.id }, ...prev]);
  };

  const handleToggleLineSync = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const nextLinked = !s.lineLinked;
          return {
            ...s,
            lineLinked: nextLinked,
            lineNotifyEnabled: nextLinked,
            lineUserId: nextLinked ? `U${Math.random().toString(36).substring(2, 12)}` : '',
          };
        }
        return s;
      })
    );
  };

  const handleAddCourse = (newCourse: Course) => {
    setCourses((prev) => [{ ...newCourse, schoolId: activeSchool.id }, ...prev]);
  };

  const handleEnrollStudent = (courseId: string, studentId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId && !c.enrolledStudentIds.includes(studentId)) {
          return {
            ...c,
            enrolledStudentIds: [...c.enrolledStudentIds, studentId],
          };
        }
        return c;
      })
    );
  };

  const handleRecordAttendance = (
    studentId: string, 
    status: AttendanceStatus, 
    remarks: string,
    method?: string
  ) => {
    const student = students.find((s) => s.id === studentId);
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      schoolId: activeSchool.id,
      studentId,
      date: '2026-11-04',
      time: new Date().toLocaleTimeString('en-GB'),
      status,
      checkinMethod: (method as any) || 'qr_scanner',
      remarks,
      lineNotificationSent: !!student?.lineLinked,
    };
    setAttendance((prev) => [newRecord, ...prev]);
  };

  const handleQuickCheckIn = (studentId: string) => {
    handleRecordAttendance(studentId, 'present', 'Turnstile Optical Express Scan');
  };

  const handleUpdateGrade = (gradeId: string, updates: Partial<GradeRecord>) => {
    setGrades((prev) =>
      prev.map((g) => (g.id === gradeId ? { ...g, ...updates } : g))
    );
  };

  const handlePayInvoice = (invoiceId: string, method: TuitionInvoice['paymentMethod']) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'paid',
            paymentMethod: method,
            paidAt: '2026-11-04 10:15:32',
            receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          };
        }
        return inv;
      })
    );
  };

  const handleSendLineReminder = (invoice: TuitionInvoice) => {
    console.log(`LINE Notification dispatched for invoice: ${invoice.invoiceNumber}`);
  };

  const handleAddAnnouncement = (ann: Announcement) => {
    setAnnouncements((prev) => [{ ...ann, schoolId: activeSchool.id }, ...prev]);
  };

  const handleBroadcastLine = (announcementId: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, lineBroadcastSent: true } : a))
    );
  };

  const handleUpdateConfig = (newConfig: Partial<SystemConfig>) => {
    setSystemConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleCompleteLesson = (lessonId: string) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId && !l.completedByStudentIds.includes('stu-1')
          ? { ...l, completedByStudentIds: [...l.completedByStudentIds, 'stu-1'] }
          : l
      )
    );
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId && !a.submittedStudentIds.includes('stu-1')
          ? { ...a, submittedStudentIds: [...a.submittedStudentIds, 'stu-1'] }
          : a
      )
    );
  };

  const handleAddQuestion = (newQ: QuizQuestion) => {
    setQuestions((prev) => [{ ...newQ, schoolId: activeSchool.id }, ...prev]);
  };

  const handleImportQuestions = (imported: QuizQuestion[]) => {
    const withSchool = imported.map((q) => ({ ...q, schoolId: activeSchool.id }));
    setQuestions((prev) => [...withSchool, ...prev]);
  };

  const handleEarnRewards = (userId: string, exp: number, gems: number, isWin: boolean) => {
    setPlayerScores((prev) =>
      prev.map((p) => {
        if (p.userId === userId) {
          return {
            ...p,
            exp: p.exp + exp,
            gems: p.gems + gems,
            battleWins: isWin ? p.battleWins + 1 : p.battleWins,
            streak: isWin ? p.streak + 1 : 0,
          };
        }
        return p;
      })
    );
  };

  const handleRedeemReward = (itemId: string, costGems: number) => {
    if (!currentUser) return;
    setPlayerScores((prev) =>
      prev.map((p) =>
        p.userId === currentUser.id ? { ...p, gems: Math.max(0, p.gems - costGems) } : p
      )
    );
    setRewardItems((prev) =>
      prev.map((r) =>
        r.id === itemId ? { ...r, stock: Math.max(0, r.stock - 1) } : r
      )
    );
  };

  const handleRecordPeriodAttendance = (records: PeriodAttendanceRecord[]) => {
    setPeriodAttendance((prev) => [...records, ...prev]);
  };

  const handleAddPortfolioItem = (item: PortfolioItem) => {
    setPortfolioItems((prev) => [{ ...item, schoolId: activeSchool.id }, ...prev]);
  };

  // If user is not logged in: Render the Clear Main Login & Register Page
  if (!currentUser) {
    return (
      <div className={`theme-${themePalette}`}>
        <AuthLayout
          schools={schools}
          demoUsers={demoUsers}
          onLogin={handleLogin}
          onRegisterSchool={handleRegisterSchool}
          onRegisterUser={handleRegisterUser}
          lang={lang}
          setLang={setLang}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen theme-${themePalette} ${
      themePalette === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0F19] text-slate-100'
    } flex flex-col font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-300`}>
      {/* Top Navbar with Multi-School Switcher, Palette Switcher, and Logout */}
      <Navbar
        currentUser={currentUser}
        activeSchool={activeSchool}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        systemConfig={systemConfig}
        unreadCount={schoolAnnouncements.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        programMode={programMode}
        setProgramMode={setProgramMode}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
        onOpenSchoolSwitcher={() => setShowSchoolSwitcher(true)}
        onOpenDatabaseBackup={() => setShowDatabaseBackup(true)}
        onOpenSupabaseRender={() => setShowSupabaseRenderModal(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar only shown in School ERP mode */}
        {programMode === 'school_erp' && (
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            currentRole={currentRole}
            studentsCount={schoolStudents.length}
            coursesCount={schoolCourses.length}
            lang={lang}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Mode 1: School ERP / SIS */}
            {programMode === 'school_erp' && (
              <>
                {currentTab === 'dashboard' && (
                  <DashboardView
                    students={schoolStudents}
                    courses={schoolCourses}
                    attendance={schoolAttendance}
                    invoices={schoolInvoices}
                    announcements={schoolAnnouncements}
                    systemConfig={systemConfig}
                    onNavigate={setCurrentTab}
                    onQuickCheckIn={handleQuickCheckIn}
                    onOpenSupabaseModal={() => setShowSupabaseRenderModal(true)}
                  />
                )}

                {currentTab === 'students' && (
                  <StudentsView
                    students={schoolStudents}
                    onSelectStudent={setSelectedStudentForProfile}
                    onOpenReportCard={setSelectedStudentForReport}
                    onToggleLineSync={handleToggleLineSync}
                    onAddStudent={handleAddStudent}
                  />
                )}

                {currentTab === 'courses' && (
                  <CoursesView
                    courses={schoolCourses}
                    students={schoolStudents}
                    onAddCourse={handleAddCourse}
                    onEnrollStudent={handleEnrollStudent}
                  />
                )}

                {currentTab === 'attendance' && (
                  <AttendanceView
                    students={schoolStudents}
                    attendance={schoolAttendance}
                    onRecordAttendance={handleRecordAttendance}
                  />
                )}

                {currentTab === 'mobile_checkin' && (
                  <MobileAttendanceView
                    students={schoolStudents}
                    courses={schoolCourses}
                    attendance={schoolAttendance}
                    periodAttendance={schoolPeriodAttendance}
                    currentUser={currentUser}
                    lang={lang}
                    onRecordAttendance={handleRecordAttendance}
                    onRecordPeriodAttendance={handleRecordPeriodAttendance}
                  />
                )}

                {currentTab === 'games' && (
                  <EduBattleGameView
                    questions={schoolQuestions}
                    playerScores={playerScores}
                    rewardItems={rewardItems}
                    currentUser={currentUser}
                    lang={lang}
                    onAddQuestion={handleAddQuestion}
                    onImportQuestions={handleImportQuestions}
                    onEarnRewards={handleEarnRewards}
                    onRedeemReward={handleRedeemReward}
                  />
                )}

                {currentTab === 'portfolio' && (
                  <PortfolioView
                    portfolioItems={schoolPortfolioItems}
                    students={schoolStudents}
                    currentUser={currentUser}
                    lang={lang}
                    onAddPortfolioItem={handleAddPortfolioItem}
                  />
                )}

                {currentTab === 'gradebook' && (
                  <GradebookView
                    students={schoolStudents}
                    courses={schoolCourses}
                    grades={schoolGrades}
                    systemConfig={systemConfig}
                    onUpdateGrade={handleUpdateGrade}
                    onOpenReportCard={setSelectedStudentForReport}
                  />
                )}

                {currentTab === 'billing' && (
                  <BillingView
                    students={schoolStudents}
                    invoices={schoolInvoices}
                    systemConfig={systemConfig}
                    onPayInvoice={handlePayInvoice}
                    onSendLineReminder={handleSendLineReminder}
                  />
                )}

                {currentTab === 'announcements' && (
                  <AnnouncementsView
                    announcements={schoolAnnouncements}
                    systemConfig={systemConfig}
                    onAddAnnouncement={handleAddAnnouncement}
                    onBroadcastLine={handleBroadcastLine}
                  />
                )}

                {currentTab === 'integrations' && (
                  <IntegrationsView
                    systemConfig={systemConfig}
                    onUpdateConfig={handleUpdateConfig}
                    onOpenSupabaseModal={() => setShowSupabaseRenderModal(true)}
                  />
                )}

                {currentTab === 'supabase_studio' && (
                  <SupabaseStudioView
                    activeSchool={activeSchool}
                    students={schoolStudents}
                    courses={schoolCourses}
                    grades={schoolGrades}
                    attendance={schoolAttendance}
                    invoices={schoolInvoices}
                    announcements={schoolAnnouncements}
                    lang={lang}
                  />
                )}
              </>
            )}

            {/* Mode 2: Virtual Classroom / LMS */}
            {programMode === 'lms_classroom' && (
              <LmsClassroomView
                courses={schoolCourses}
                students={schoolStudents}
                lessons={schoolLessons}
                assignments={schoolAssignments}
                lang={lang}
                onCompleteLesson={handleCompleteLesson}
                onSubmitAssignment={handleSubmitAssignment}
              />
            )}

            {/* Mode 3: Parent & Student Portal */}
            {programMode === 'parent_portal' && (
              <ParentPortalView
                students={schoolStudents}
                attendance={schoolAttendance}
                invoices={schoolInvoices}
                grades={schoolGrades}
                courses={schoolCourses}
                systemConfig={systemConfig}
                lang={lang}
                onPayInvoice={handlePayInvoice}
                onOpenReportCard={setSelectedStudentForReport}
              />
            )}
          </div>
        </main>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar (Optimized for Mobile Smartphones & Tablets) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
            programMode === 'school_erp' && currentTab === 'dashboard'
              ? 'text-cyan-400 bg-cyan-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>แดชบอร์ด</span>
        </button>

        <button
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('mobile_checkin');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
            programMode === 'school_erp' && currentTab === 'mobile_checkin'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>เช็คชื่อ</span>
        </button>

        {/* Center Highlighted Battle Royale Game Button */}
        <button
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('games');
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-black transition-all ${
            programMode === 'school_erp' && currentTab === 'games'
              ? 'text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 shadow-lg shadow-amber-500/30 scale-105'
              : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span>🎮 เกม 3D</span>
        </button>

        <button
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('portfolio');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
            programMode === 'school_erp' && currentTab === 'portfolio'
              ? 'text-violet-400 bg-violet-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>ผลงาน</span>
        </button>

        <button
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('students');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
            programMode === 'school_erp' && currentTab === 'students'
              ? 'text-sky-400 bg-sky-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>นักเรียน</span>
        </button>
      </nav>


      {/* Database Backup & Architecture Modal */}
      {showDatabaseBackup && (
        <DatabaseBackupModal
          systemConfig={systemConfig}
          activeSchool={activeSchool}
          lang={lang}
          onClose={() => setShowDatabaseBackup(false)}
        />
      )}

      {/* Multi-School Switcher Modal */}
      {showSchoolSwitcher && (
        <SchoolSwitcherModal
          schools={schools}
          activeSchool={activeSchool}
          onSelectSchool={(school) => {
            setActiveSchool(school);
            setSystemConfig((prev) => ({
              ...prev,
              schoolNameEn: school.nameEn,
              schoolNameTh: school.nameTh,
            }));
          }}
          onOpenRegisterSchool={() => {
            setCurrentUser(null);
          }}
          onClose={() => setShowSchoolSwitcher(false)}
          lang={lang}
        />
      )}

      {/* Official Bilingual Report Card Modal */}
      {selectedStudentForReport && (
        <ReportCardModal
          student={selectedStudentForReport}
          courses={schoolCourses}
          grades={schoolGrades}
          systemConfig={systemConfig}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}

      {/* Student Profile Detail Modal */}
      {selectedStudentForProfile && (
        <StudentDetailModal
          student={selectedStudentForProfile}
          courses={schoolCourses}
          grades={schoolGrades}
          attendance={schoolAttendance}
          onClose={() => setSelectedStudentForProfile(null)}
          onOpenReportCard={(stu) => {
            setSelectedStudentForProfile(null);
            setSelectedStudentForReport(stu);
          }}
          onToggleLineSync={handleToggleLineSync}
        />
      )}

      {/* Supabase Database & Render.com Deployment Modal */}
      {showSupabaseRenderModal && (
        <SupabaseRenderModal
          activeSchool={activeSchool}
          students={schoolStudents}
          courses={schoolCourses}
          grades={schoolGrades}
          attendance={schoolAttendance}
          invoices={schoolInvoices}
          announcements={schoolAnnouncements}
          lang={lang}
          onClose={() => setShowSupabaseRenderModal(false)}
        />
      )}
    </div>
  );
};

export default App;
