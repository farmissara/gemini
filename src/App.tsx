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
  PortfolioItem,
  TimetableSlot,
  BehaviorRecord,
  SdqAssessment,
  InfirmaryVisit,
  HomeworkSubmission
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
  INITIAL_PORTFOLIO_ITEMS,
  INITIAL_TIMETABLE_SLOTS,
  INITIAL_BEHAVIOR_RECORDS,
  INITIAL_SDQ_ASSESSMENTS,
  INITIAL_INFIRMARY_VISITS,
  INITIAL_HOMEWORK_SUBMISSIONS
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { AuthLayout } from './components/AuthLayout';
import { SchoolSwitcherModal } from './components/SchoolSwitcherModal';
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
import { LmsClassroomView } from './components/LmsClassroomView';
import { ParentPortalView } from './components/ParentPortalView';
import { ReportCardModal } from './components/ReportCardModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { TimetableScheduleView } from './components/TimetableScheduleView';
import { BehaviorSdqView } from './components/BehaviorSdqView';
import { DigitalIdCardView } from './components/DigitalIdCardView';
import { InfirmaryHealthView } from './components/InfirmaryHealthView';
import { HomeworkTrackerView } from './components/HomeworkTrackerView';
import { LayoutDashboard, QrCode, Gamepad2, Briefcase, Users } from 'lucide-react';

export const App: React.FC = () => {
  // Multi-School & Auth State
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
  const [activeSchool, setActiveSchool] = useState<School>(INITIAL_SCHOOLS[0]);
  const [demoUsers, setDemoUsers] = useState<AuthUser[]>(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);

  // Navigation, Mode, Theme & Language State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [programMode, setProgramMode] = useState<AppProgramMode>('school_erp');
  const [lang, setLang] = useState<AppLanguage>('th');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [themePalette, setThemePalette] = useState<ThemePalette>('light_warm');
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
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(INITIAL_TIMETABLE_SLOTS);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>(INITIAL_BEHAVIOR_RECORDS);
  const [sdqAssessments, setSdqAssessments] = useState<SdqAssessment[]>(INITIAL_SDQ_ASSESSMENTS);
  const [infirmaryVisits, setInfirmaryVisits] = useState<InfirmaryVisit[]>(INITIAL_INFIRMARY_VISITS);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>(INITIAL_HOMEWORK_SUBMISSIONS);

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
  const schoolTimetableSlots = timetableSlots.filter((t) => !t.schoolId || t.schoolId === activeSchool.id);
  const schoolBehaviorRecords = behaviorRecords.filter((b) => !b.schoolId || b.schoolId === activeSchool.id);
  const schoolSdqAssessments = sdqAssessments.filter((s) => !s.schoolId || s.schoolId === activeSchool.id);
  const schoolInfirmaryVisits = infirmaryVisits.filter((i) => !i.schoolId || i.schoolId === activeSchool.id);
  const schoolHomeworkSubmissions = homeworkSubmissions.filter((h) => !h.schoolId || h.schoolId === activeSchool.id);

  // Auth Handlers - Requires genuine authentication
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
    const todayStr = '2026-11-04';
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    setAttendance((prev) => {
      const existingIdx = prev.findIndex(a => a.studentId === studentId && a.date === todayStr);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
          remarks: remarks || updated[existingIdx].remarks,
          checkinMethod: (method as any) || updated[existingIdx].checkinMethod,
          time: nowTime
        };
        return updated;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}`,
          schoolId: activeSchool.id,
          studentId,
          date: todayStr,
          time: nowTime,
          status,
          remarks,
          checkinMethod: (method as any) || 'qr_scanner',
          lineNotificationSent: true
        };
        return [newRecord, ...prev];
      }
    });
  };

  const handleRecordPeriodAttendance = (records: PeriodAttendanceRecord[]) => {
    setPeriodAttendance((prev) => {
      const updated = [...prev];
      for (const rec of records) {
        const idx = updated.findIndex(
          (p) => p.id === rec.id || (p.studentId === rec.studentId && p.courseId === rec.courseId && p.date === rec.date && p.periodNumber === rec.periodNumber)
        );
        if (idx >= 0) {
          updated[idx] = rec;
        } else {
          updated.push(rec);
        }
      }
      return updated;
    });
  };

  const handleQuickCheckIn = (studentId: string) => {
    handleRecordAttendance(studentId, 'present', 'สแกนบัตรผ่านประตูอัตโนมัติ (Gate Turnstile)');
  };

  const handlePayInvoice = (invoiceId: string, method?: TuitionInvoice['paymentMethod']) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'paid',
            paymentMethod: method || 'promptpay',
            paidAt: new Date().toISOString(),
            receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
          };
        }
        return inv;
      })
    );
  };

  const handleSendLineReminder = (invoice: TuitionInvoice) => {
    const student = students.find((s) => s.id === invoice.studentId);
    if (student) {
      alert(`[LINE Official Account]\nส่งการแจ้งเตือนยอดค้างชำระ ฿${invoice.totalAmount.toLocaleString()} ไปยังผู้ปกครองของ ${student.firstNameTh} สำเร็จแล้ว`);
    }
  };

  const handleAddAnnouncement = (newAnn: Announcement) => {
    setAnnouncements((prev) => [{ ...newAnn, schoolId: activeSchool.id }, ...prev]);
  };

  const handleBroadcastLine = (announcementId: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, lineBroadcastSent: true } : a))
    );
  };

  const handleCompleteLesson = (lessonId: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l))
    );
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, submitted: true } : a))
    );
  };

  const handleAddQuestion = (question: QuizQuestion) => {
    setQuestions((prev) => [{ ...question, schoolId: activeSchool.id }, ...prev]);
  };

  const handleImportQuestions = (newQuestions: QuizQuestion[]) => {
    setQuestions((prev) => [...newQuestions.map(q => ({ ...q, schoolId: activeSchool.id })), ...prev]);
  };

  const handleEarnRewards = (userId: string, exp: number, gems: number, isWin: boolean) => {
    setPlayerScores((prev) =>
      prev.map((p) =>
        p.userId === userId
          ? {
              ...p,
              exp: p.exp + exp,
              gems: p.gems + gems,
              battleWins: isWin ? p.battleWins + 1 : p.battleWins,
              streak: isWin ? p.streak + 1 : 0,
            }
          : p
      )
    );
  };

  const handleRedeemReward = (rewardId: string, costGems: number) => {
    if (!currentUser) return;
    setPlayerScores((prev) =>
      prev.map((p) =>
        p.userId === currentUser.id && p.gems >= costGems
          ? { ...p, gems: p.gems - costGems }
          : p
      )
    );
  };

  const handleAddPortfolioItem = (item: PortfolioItem) => {
    setPortfolioItems((prev) => [{ ...item, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddTimetableSlot = (slot: TimetableSlot) => {
    setTimetableSlots((prev) => [{ ...slot, schoolId: activeSchool.id }, ...prev]);
  };

  const handleDeleteTimetableSlot = (slotId: string) => {
    setTimetableSlots((prev) => prev.filter(s => s.id !== slotId));
  };

  const handleAddBehaviorRecord = (record: BehaviorRecord) => {
    setBehaviorRecords((prev) => [{ ...record, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddSdqAssessment = (sdq: SdqAssessment) => {
    setSdqAssessments((prev) => [{ ...sdq, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddInfirmaryVisit = (visit: InfirmaryVisit) => {
    setInfirmaryVisits((prev) => [{ ...visit, schoolId: activeSchool.id }, ...prev]);
  };

  const handleAddHomeworkSubmission = (sub: HomeworkSubmission) => {
    setHomeworkSubmissions((prev) => [{ ...sub, schoolId: activeSchool.id }, ...prev]);
  };

  const handleGradeHomeworkSubmission = (id: string, score: number, feedback: string) => {
    setHomeworkSubmissions((prev) =>
      prev.map((s) => s.id === id ? { ...s, score, teacherFeedback: feedback, status: 'graded' } : s)
    );
  };

  const handleUpdateGrade = (gradeId: string, updates: Partial<GradeRecord>) => {
    setGrades((prev) =>
      prev.map((g) => (g.id === gradeId ? { ...g, ...updates } : g))
    );
  };

  // If user is not authenticated, render AuthLayout (login/register)
  if (!currentUser) {
    return (
      <AuthLayout
        schools={schools}
        demoUsers={demoUsers}
        onLogin={handleLogin}
        onRegisterSchool={handleRegisterSchool}
        onRegisterUser={handleRegisterUser}
        lang={lang}
        setLang={setLang}
        themePalette={themePalette}
        setThemePalette={setThemePalette}
      />
    );
  }

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeSchool={activeSchool}
        currentRole={currentRole}
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
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

                {currentTab === 'timetable' && (
                  <TimetableScheduleView
                    slots={schoolTimetableSlots}
                    onAddSlot={handleAddTimetableSlot}
                    onDeleteSlot={handleDeleteTimetableSlot}
                    lang={lang}
                    currentRole={currentRole}
                    schoolName={activeSchool.nameTh}
                  />
                )}

                {currentTab === 'homework' && (
                  <HomeworkTrackerView
                    submissions={schoolHomeworkSubmissions}
                    students={schoolStudents}
                    courses={schoolCourses}
                    onAddSubmission={handleAddHomeworkSubmission}
                    onGradeSubmission={handleGradeHomeworkSubmission}
                    lang={lang}
                    currentRole={currentRole}
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

                {currentTab === 'student_id_cards' && (
                  <DigitalIdCardView
                    students={schoolStudents}
                    school={activeSchool}
                    lang={lang}
                    currentRole={currentRole}
                  />
                )}

                {currentTab === 'behavior_sdq' && (
                  <BehaviorSdqView
                    students={schoolStudents}
                    records={schoolBehaviorRecords}
                    sdqList={schoolSdqAssessments}
                    onAddBehaviorRecord={handleAddBehaviorRecord}
                    onAddSdqAssessment={handleAddSdqAssessment}
                    lang={lang}
                    currentRole={currentRole}
                  />
                )}

                {currentTab === 'infirmary' && (
                  <InfirmaryHealthView
                    visits={schoolInfirmaryVisits}
                    students={schoolStudents}
                    onAddVisit={handleAddInfirmaryVisit}
                    lang={lang}
                    currentRole={currentRole}
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

      {/* Mobile Bottom Navigation Bar - Clean, Subtle & Ergonomic */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-sm">
        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'dashboard'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>แดชบอร์ด</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('attendance');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'attendance'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>เช็คชื่อ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('games');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'games'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span>เกม O-NET</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('portfolio');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'portfolio'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>ผลงาน</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProgramMode('school_erp');
            setCurrentTab('students');
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
            programMode === 'school_erp' && currentTab === 'students'
              ? 'text-blue-700 font-bold bg-blue-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>นักเรียน</span>
        </button>
      </nav>

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
    </div>
  );
};

export default App;
