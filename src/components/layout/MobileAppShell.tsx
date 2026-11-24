import React, { useEffect, useMemo, useState } from 'react';
import type { PlayerScore, TimetableSlot } from '../../types';
import { getLocalDateString } from '../../lib/date';
import { DEFAULT_SCHOOL_PERIODS } from '../../lib/schoolPeriods';
import { resolveMatchedTeacherForUser, slotMatchesLoggedInTeacher } from '../../lib/courseTeacherFilter';
import { isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleTone } from '../../lib/moduleTheme';
import { CALENDAR_NOTES_UPDATED_EVENT } from '../../lib/calendarNotes';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  isRestrictedAttendanceViewer,
  resolveLinkedStudentsForUser,
  resolveOwnStudent,
} from '../../lib/attendanceScope';
import {
  filterAnnouncementsForRole,
  filterAssignmentsForPersonalRole,
  filterCoursesForPersonalRole,
  filterTimetableSlotsForPersonalRole,
} from '../../lib/studentDataScope';
import { addCalendarDays, getBangkokClockSnapshot, getCalendarWeekStart } from '../../lib/timetableCalendar';
import {
  getHolidayForDate,
  getPublicHolidaySyncStatus,
  getUpcomingHolidays,
  syncPublicHolidaysFromApi,
  type HolidaySyncStatus,
} from '../../lib/thaiHolidays';
import { exitLandscapeGameMode } from '../../lib/screenOrientation';
import { GoogleCalendarSyncModal } from '../GoogleCalendarSyncModal';
import { TimetablePeriodAttendanceModal } from '../modals/TimetablePeriodAttendanceModal';
import { MobileAttendanceView } from '../../views/MobileAttendanceView';
import type { EduGameSubTab } from '../../views/EduBattleGameView';
import { StudentMobileHome } from '../student/StudentMobileHome';
import { ViewErrorBoundary } from '../common/ViewErrorBoundary';
import { MobileAdminQuickHub, MobileSuperAdminHub } from './MobileRoleWorkspace';
import { AdminDailyDashboardView } from '../../views/AdminDailyDashboardView';
import type { NavTab } from './Sidebar';
import {
  MOBILE_TONE_TARGET,
  MobileAnnouncementsTab,
  MobileBottomNav,
  MobileCareerQuestTab,
  MobileExecutiveTab,
  MobileFullscreenGameOverlay,
  MobileGamesHubTab,
  MobileHeader,
  MobileHomeworkTab,
  MobilePortfolioTab,
  MobileProfileTab,
  MobileStudentGradesTab,
  MobileTeacherGradebookTab,
  MobileTeacherParentHome,
  MobileTimetableTab,
  type ActiveGameView,
  type ExecMetrics,
  type MobileAppShellProps,
  type MobileTab,
} from '../../features/mobile-shell';

export type { MobileTab, MobileAppShellProps };

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
  onUpdateTeacher,
  onUpdateOwnAvatar,
  timetableSlots = [],
  schoolPeriods = DEFAULT_SCHOOL_PERIODS,
  gradingSystem = activeSchool.gradingSystem || 'thai',
  schoolPermissions,
  featureFlags,
  onUpdateGrade,
  onAddGrade,
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
  initialPeriodCheckType,
  onBiometricLock,
  portfolioItems = [],
  onAddPortfolioItem,
  onDeletePortfolioItem,
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
  rewardRedemptions = [],
  onEquipCosmetic,
  onReviewRedemption,
  onCreateCustomReward,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>(initialMobileTab);
  const [activeGameView, setActiveGameView] = useState<ActiveGameView>('hub');
  const [arcadeInitialSubTab, setArcadeInitialSubTab] = useState<EduGameSubTab>('hub');
  const [profilePage, setProfilePage] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<typeof announcements[number] | null>(null);
  const [mobilePeriodRosterTarget, setMobilePeriodRosterTarget] = useState<{
    slot: TimetableSlot;
    date: string;
  } | null>(null);

  const openArcadeSubTab = (tab: EduGameSubTab) => {
    setArcadeInitialSubTab(tab);
    setActiveGameView('arcade_studio');
  };

  useEffect(() => {
    if (activeGameView === 'hub') {
      void exitLandscapeGameMode();
    }
  }, [activeGameView]);

  // Mobile Timetable & Calendar shared state
  const [bangkokClock, setBangkokClock] = useState(() => getBangkokClockSnapshot());
  const todayBangkokStr = bangkokClock.dateStr;
  const currentBangkokYear = Number(todayBangkokStr.slice(0, 4));
  const todayDayKey = bangkokClock.dayKey;
  const [timetableOnlyMine, setTimetableOnlyMine] = useState<boolean>(currentRole === 'teacher');
  const [mobileTimetableMode, setMobileTimetableMode] = useState<'day' | 'calendar'>('day');
  const [mobileCalendarMonthCursor, setMobileCalendarMonthCursor] = useState<{ year: number; month: number }>(() => ({
    year: Number(todayBangkokStr.slice(0, 4)),
    month: Number(todayBangkokStr.slice(5, 7)) - 1,
  }));
  const [showMobileCalendarSync, setShowMobileCalendarSync] = useState(false);
  const [holidaySyncTick, setHolidaySyncTick] = useState(0);
  const [holidaySyncStatus, setHolidaySyncStatus] = useState<HolidaySyncStatus | null>(() =>
    getPublicHolidaySyncStatus(currentBangkokYear)
  );
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);

  // Dynamic Check-in deep-link state
  const [mobileAttendanceInitialSubTab, setMobileAttendanceInitialSubTab] = useState<
    'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin'
  >(initialAttendanceSubTab);
  const [mobilePeriodCourseId, setMobilePeriodCourseId] = useState<string | undefined>(initialPeriodCourseId);
  const [mobilePeriodNumber, setMobilePeriodNumber] = useState<number | undefined>(initialPeriodNumber);
  const [mobilePeriodDate, setMobilePeriodDate] = useState<string | undefined>(initialPeriodDate);
  const [mobilePeriodCheckType, setMobilePeriodCheckType] = useState<'check_in' | 'check_out' | undefined>(
    initialPeriodCheckType
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBangkokClock(getBangkokClockSnapshot());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileAttendanceInitialSubTab(initialAttendanceSubTab);
    setMobilePeriodCourseId(initialPeriodCourseId);
    setMobilePeriodNumber(initialPeriodNumber);
    setMobilePeriodDate(initialPeriodDate);
    setMobilePeriodCheckType(initialPeriodCheckType);
  }, [initialAttendanceSubTab, initialPeriodCourseId, initialPeriodNumber, initialPeriodDate, initialPeriodCheckType]);

  useEffect(() => {
    let cancelled = false;
    const yearsToSync = Array.from(
      new Set([
        mobileCalendarMonthCursor.year,
        currentBangkokYear,
        ...(Number(todayBangkokStr.slice(5, 7)) >= 10 ? [currentBangkokYear + 1] : []),
      ])
    );
    void Promise.all(yearsToSync.map((yr) => syncPublicHolidaysFromApi(yr))).then((results) => {
      if (cancelled) return;
      const primary =
        results.find((r) => r.year === mobileCalendarMonthCursor.year) ||
        results.find((r) => r.year === currentBangkokYear) ||
        results[0];
      if (primary) setHolidaySyncStatus(primary);
      setHolidaySyncTick((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [mobileCalendarMonthCursor.year, currentBangkokYear, todayBangkokStr]);

  useEffect(() => {
    const onHolidaysUpdated = () => {
      setHolidaySyncStatus(
        getPublicHolidaySyncStatus(mobileCalendarMonthCursor.year) || getPublicHolidaySyncStatus(currentBangkokYear)
      );
      setHolidaySyncTick((v) => v + 1);
    };
    window.addEventListener('eduverse:holidays-updated', onHolidaysUpdated);
    const noopNotesListener = () => {};
    window.addEventListener(CALENDAR_NOTES_UPDATED_EVENT, noopNotesListener);
    return () => {
      window.removeEventListener('eduverse:holidays-updated', onHolidaysUpdated);
      window.removeEventListener(CALENDAR_NOTES_UPDATED_EVENT, noopNotesListener);
    };
  }, [mobileCalendarMonthCursor.year, currentBangkokYear]);

  const handleManualMobileHolidaySync = async (targetYear = currentBangkokYear) => {
    setIsSyncingHolidays(true);
    try {
      const result = await syncPublicHolidaysFromApi(targetYear, { force: true });
      if (targetYear !== currentBangkokYear + 1 && Number(todayBangkokStr.slice(5, 7)) >= 10) {
        await syncPublicHolidaysFromApi(currentBangkokYear + 1, { force: true });
      }
      setHolidaySyncStatus(result);
      setHolidaySyncTick((v) => v + 1);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';
  const todayStr = getLocalDateString();

  const isRestrictedViewer = isRestrictedAttendanceViewer(currentUser);
  const linkedStudents = useMemo(
    () => (isRestrictedViewer ? resolveLinkedStudentsForUser(currentUser, students) : students),
    [currentUser, isRestrictedViewer, students]
  );
  const ownStudent = resolveOwnStudent(currentUser, students);
  const currentPersonId = ownStudent?.id || currentUser?.id;
  const scopedAttendance = filterAttendanceForUser(attendance, currentUser, students);
  const todayCheckin = scopedAttendance.find((a) => a.date === todayStr);

  const isModuleEnabled = (tab: NavTab) => isTabEnabledByFeatureFlags(tab, featureFlags, currentRole);

  // Enforce school-level role policies + package feature flags at runtime on mobile
  const canSelfCheckin =
    isModuleEnabled('mobile_checkin') &&
    (currentRole === 'student'
      ? schoolPermissions?.student_self_checkin !== false
      : currentRole === 'teacher'
        ? schoolPermissions?.teacher_attendance !== false
        : true);
  const canPlayGames =
    (currentRole === 'student' ? schoolPermissions?.student_treasure_game !== false : true) &&
    (isModuleEnabled('games') || isModuleEnabled('subject_labs') || isModuleEnabled('boss_raid'));
  const canEditGradesMobile =
    currentRole === 'admin' ||
    currentRole === 'super_admin' ||
    (currentRole === 'teacher' && schoolPermissions?.teacher_grade_entry !== false);
  const canAccessHomework =
    isModuleEnabled('homework') &&
    (currentRole === 'student'
      ? schoolPermissions?.student_submit_homework !== false
      : currentRole === 'teacher'
        ? schoolPermissions?.teacher_homework !== false
        : true);
  const canViewFinancialsMobile =
    isModuleEnabled('billing') &&
    (currentRole === 'admin' ||
      currentRole === 'super_admin' ||
      currentRole === 'parent' ||
      (currentRole === 'teacher' && schoolPermissions?.teacher_view_financials !== false));
  const canViewTimetable = isModuleEnabled('timetable');
  const canOpenPortfolio =
    isModuleEnabled('portfolio') &&
    (currentRole !== 'student' || schoolPermissions?.student_upload_portfolio !== false);
  const canOpenCareerQuest = currentRole !== 'parent' && isModuleEnabled('career_quest');
  const canOpenAnnouncements = isModuleEnabled('announcements');
  const canOpenLeave = isModuleEnabled('mobile_checkin') || isModuleEnabled('attendance');
  const canViewDigitalId = isModuleEnabled('student_id_cards');

  const myLeaves = isRestrictedViewer
    ? filterLeaveRequestsForUser(leaveRequests, currentUser, students)
    : leaveRequests;
  const pendingLeavesCount = myLeaves.filter((l) => l.status === 'pending').length;

  const scopedCourses = useMemo(
    () => (isRestrictedViewer ? filterCoursesForPersonalRole(courses, currentUser, students) : courses),
    [courses, currentUser, isRestrictedViewer, students]
  );
  const scopedTimetableSlots = useMemo(
    () =>
      isRestrictedViewer
        ? filterTimetableSlotsForPersonalRole(timetableSlots, currentUser, students, scopedCourses)
        : timetableSlots,
    [timetableSlots, currentUser, isRestrictedViewer, students, scopedCourses]
  );
  const scopedAssignments = useMemo(
    () =>
      isRestrictedViewer
        ? filterAssignmentsForPersonalRole(assignments, scopedCourses, currentUser)
        : assignments,
    [assignments, scopedCourses, currentUser, isRestrictedViewer]
  );
  const scopedAnnouncements = useMemo(
    () => filterAnnouncementsForRole(announcements, currentUser),
    [announcements, currentUser]
  );

  const matchedTeacher = useMemo(
    () => (currentRole === 'teacher' ? resolveMatchedTeacherForUser(currentUser, teachers) : undefined),
    [currentRole, currentUser, teachers]
  );
  const teacherFullName = currentUser?.fullNameTh || currentUser?.fullNameEn || '';
  const todayMySlots = useMemo(() => {
    return scopedTimetableSlots
      .filter((s) => s.dayOfWeek === todayDayKey)
      .filter((s) => {
        if (currentRole === 'teacher' && timetableOnlyMine) {
          return slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, courses);
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }, [scopedTimetableSlots, todayDayKey, currentRole, timetableOnlyMine, currentUser, matchedTeacher, courses]);

  const todayHoliday = useMemo(
    () => (holidaySyncTick >= 0 ? getHolidayForDate(todayBangkokStr, activeSchool.id) : null),
    [holidaySyncTick, todayBangkokStr, activeSchool.id]
  );
  const upcomingHoliday = useMemo(
    () =>
      holidaySyncTick >= 0
        ? getUpcomingHolidays(todayBangkokStr, 10, activeSchool.id).find((h) => h.date !== todayBangkokStr) || null
        : null,
    [holidaySyncTick, todayBangkokStr, activeSchool.id]
  );

  const openPeriodCheckinFromSlot = (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => {
    const resolvedCourseId = slot.courseId || scopedCourses.find((c) => c.code === slot.courseCode)?.id;
    setMobileAttendanceInitialSubTab('period_checkin');
    setMobilePeriodCourseId(resolvedCourseId);
    setMobilePeriodNumber(slot.periodNumber);
    setMobilePeriodDate(dateValue);
    setMobilePeriodCheckType(checkType);
    setActiveTab('checkin');
  };

  const getSlotTodayCheckStatus = (slot: TimetableSlot, dateValue: string) => {
    const resolvedCourseId =
      slot.courseId || scopedCourses.find((c) => c.code === slot.courseCode)?.id || slot.courseCode;
    const matches = periodAttendance.filter(
      (rec) =>
        rec.date === dateValue &&
        rec.periodNumber === slot.periodNumber &&
        (rec.courseId === resolvedCourseId || rec.courseCode === slot.courseCode)
    );
    return {
      hasCheckIn: matches.some((m) => (m.recordType || 'check_in') === 'check_in'),
      hasCheckOut: matches.some((m) => m.recordType === 'check_out'),
    };
  };

  const myCompletedSubmissions = new Set(
    homeworkSubmissions.filter((h) => currentPersonId && h.studentId === currentPersonId).map((h) => h.assignmentId)
  );
  const pendingHomeworkCount = scopedAssignments.filter(
    (a) =>
      a.status !== 'closed' &&
      !myCompletedSubmissions.has(a.id) &&
      !(currentPersonId && a.submittedStudentIds?.includes(currentPersonId))
  ).length;

  const currentScore: PlayerScore = playerScores.find((p) => p.userId === currentUser?.id) || {
    userId: currentUser?.id || 'guest',
    schoolId: activeSchool?.id,
    name:
      (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
      currentUser?.fullNameTh ||
      currentUser?.email ||
      (lang === 'th' ? 'ผู้เล่น' : 'Player'),
    role: currentRole === 'student' ? 'student' : 'teacher',
    avatarUrl: currentUser?.avatarUrl || '',
    exp: 0,
    gems: 0,
    rankTitle: lang === 'th' ? 'ผู้เริ่มต้น' : 'Beginner',
    battleWins: 0,
    streak: 0,
    dailyStreak: 0,
    equippedFrameId: 'frame-default',
    unlockedItemIds: [],
  };

  const myOwnPortfolioCount = useMemo(() => {
    if (!currentUser) return 0;
    return portfolioItems.filter(
      (item) => item.ownerId === currentUser.id || (ownStudent && item.ownerId === ownStudent.id)
    ).length;
  }, [portfolioItems, currentUser, ownStudent]);

  const canViewGradesStudent =
    isModuleEnabled('gradebook') &&
    (currentRole === 'student' ? schoolPermissions?.student_view_grades !== false : true);

  useEffect(() => {
    const blockedTab =
      (activeTab === 'checkin' && !canSelfCheckin) ||
      (activeTab === 'leave' && !canOpenLeave) ||
      (activeTab === 'gradebook' && !isModuleEnabled('gradebook')) ||
      (activeTab === 'student_grades' && !canViewGradesStudent) ||
      (activeTab === 'portfolio' && !canOpenPortfolio) ||
      (activeTab === 'career_quest' && !canOpenCareerQuest) ||
      (activeTab === 'timetable' && !canViewTimetable) ||
      (activeTab === 'games' && !canPlayGames) ||
      (activeTab === 'homework' && !canAccessHomework) ||
      (activeTab === 'announcements' && !canOpenAnnouncements);
    if (blockedTab) {
      setActiveTab('home');
    }
  }, [
    activeTab,
    canSelfCheckin,
    canOpenLeave,
    canViewGradesStudent,
    canOpenPortfolio,
    canOpenCareerQuest,
    canViewTimetable,
    canPlayGames,
    canAccessHomework,
    canOpenAnnouncements,
    featureFlags,
    currentRole,
  ]);

  useEffect(() => {
    if (activeGameView === 'hub') return;
    const blockedGame =
      ((activeGameView === 'arcade_studio' ||
        activeGameView === 'battle_royale_3d' ||
        activeGameView === '1v1_arena') &&
        !isModuleEnabled('games')) ||
      (activeGameView === 'boss_raid' && !isModuleEnabled('boss_raid')) ||
      (activeGameView === 'subject_labs' && !isModuleEnabled('subject_labs')) ||
      (activeGameView === 'hall_of_fame' && !isModuleEnabled('hall_of_fame'));
    if (blockedGame) {
      setActiveGameView('hub');
    }
  }, [activeGameView, featureFlags, currentRole]);

  const execMetrics = useMemo<ExecMetrics>(() => {
    const today = getLocalDateString();
    const todayRecords = attendance.filter((a) => a.date === today);
    const totalStudents = students.length || 1;
    const presentCount = todayRecords.filter((a) => a.status === 'present').length;
    const lateCount = todayRecords.filter((a) => a.status === 'late').length;
    const absentCount = todayRecords.filter((a) => a.status === 'absent').length;
    const leaveCount = todayRecords.filter((a) => a.status === 'leave').length;
    const attendanceRate = Math.min(100, Math.round(((presentCount + lateCount) / totalStudents) * 100));

    const validGpas = students.map((s) => s.gpa).filter((g) => g > 0);
    const avgGpa =
      validGpas.length > 0 ? (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2) : '3.45';
    const honorCount = students.filter((s) => s.gpa >= 3.5).length;

    const todayInfirmary = infirmaryVisits.filter((v) => v.visitDate === today || !v.visitDate).length;

    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const totalCollected = paidInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

    const riskCount = sdqAssessments.filter(
      (s) => s.overallStatus === 'risk' || s.overallStatus === 'problem' || (s.totalDifficultiesScore ?? 0) >= 16
    ).length;

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
    <div
      className={`${getModuleTone(MOBILE_TONE_TARGET[activeTab])} h-full min-h-0 flex flex-col overflow-hidden app-workspace text-[var(--color-text-body)] pb-16 select-none`}
    >
      {/* 1. CLEAN SINGLE-ROW APPLE/LINEAR MOBILE HEADER */}
      <MobileHeader
        activeSchool={activeSchool}
        currentRole={currentRole}
        lang={lang}
        setLang={setLang}
        isLight={isLight}
        setThemePalette={setThemePalette}
        unreadCount={unreadCount}
        onOpenNotifications={onOpenNotifications}
        onOpenSchoolSwitcher={onOpenSchoolSwitcher}
        canSwitchAdminTeacherMode={canSwitchAdminTeacherMode}
        onSwitchOperationalRole={onSwitchOperationalRole}
        onSwitchToDesktopMode={onSwitchToDesktopMode}
        onLogout={onLogout}
      />

      {/* 2. MAIN ACTIVE VIEW CONTAINER (Generous spacing, 1 task per screen) */}
      <main className="flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto p-5 sm:p-6 overflow-y-auto">
        <ViewErrorBoundary
          resetKey={`${activeTab}:${activeGameView}:${profilePage}`}
          lang={lang}
          viewName={`mobile:${activeTab}`}
          onBackHome={() => {
            setActiveGameView('hub');
            setActiveTab('home');
          }}
        >
          {/* TAB A: ROLE-FIRST HOME */}
          {activeTab === 'home' && (
            <div className="flex flex-col gap-5 py-1 animate-in fade-in duration-150">
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
                  canSwitchAdminTeacherMode={canSwitchAdminTeacherMode}
                  onSwitchOperationalRole={onSwitchOperationalRole}
                />
              ) : currentRole === 'student' ? (
                <StudentMobileHome
                  currentUser={currentUser}
                  activeSchool={activeSchool}
                  ownStudent={ownStudent}
                  playerProfile={currentScore}
                  lang={lang}
                  todayCheckin={todayCheckin}
                  scopedAttendance={scopedAttendance}
                  scopedCourses={scopedCourses}
                  grades={grades}
                  gradingSystem={gradingSystem}
                  todayMySlots={todayMySlots}
                  schoolPeriods={schoolPeriods}
                  bangkokClock={bangkokClock}
                  todayBangkokStr={todayBangkokStr}
                  todayHoliday={todayHoliday}
                  upcomingHoliday={upcomingHoliday}
                  pendingHomeworkCount={pendingHomeworkCount}
                  totalHomeworkCount={scopedAssignments.length}
                  pendingLeavesCount={pendingLeavesCount}
                  myPortfolioCount={myOwnPortfolioCount}
                  scopedAnnouncements={scopedAnnouncements}
                  canSelfCheckin={canSelfCheckin}
                  canAccessHomework={canAccessHomework}
                  canPlayGames={canPlayGames}
                  canViewGrades={canViewGradesStudent}
                  canViewTimetable={canViewTimetable}
                  canOpenPortfolio={canOpenPortfolio}
                  canOpenLeave={canOpenLeave}
                  canOpenAnnouncements={canOpenAnnouncements}
                  getSlotTodayCheckStatus={(s, d) => getSlotTodayCheckStatus(s, d)}
                  onOpenCheckin={() => {
                    setMobileAttendanceInitialSubTab('selfie_mobile');
                    setActiveTab('checkin');
                  }}
                  onTriggerPeriodCheckin={openPeriodCheckinFromSlot}
                  onOpenTimetable={(mode) => {
                    setMobileTimetableMode(mode);
                    setActiveTab('timetable');
                  }}
                  onOpenHomework={() => setActiveTab('homework')}
                  onOpenGrades={() => setActiveTab('student_grades')}
                  onOpenPortfolio={() => setActiveTab('portfolio')}
                  onOpenLeave={() => setActiveTab('leave')}
                  onOpenAnnouncements={(ann) => {
                    if (ann) setSelectedAnnouncement(ann);
                    setActiveTab('announcements');
                  }}
                  onOpenGames={() => {
                    setActiveTab('games');
                    setActiveGameView('hub');
                  }}
                  onOpenCareerQuest={canOpenCareerQuest ? () => setActiveTab('career_quest') : undefined}
                />
              ) : (
                <MobileTeacherParentHome
                  currentUser={currentUser}
                  activeSchool={activeSchool}
                  currentRole={currentRole}
                  lang={lang}
                  linkedStudents={linkedStudents}
                  canSwitchAdminTeacherMode={canSwitchAdminTeacherMode}
                  onSwitchOperationalRole={onSwitchOperationalRole}
                  todayHoliday={todayHoliday}
                  upcomingHoliday={upcomingHoliday}
                  canSelfCheckin={canSelfCheckin}
                  canViewTimetable={canViewTimetable}
                  canOpenLeave={canOpenLeave}
                  canOpenCareerQuest={canOpenCareerQuest}
                  canPlayGames={canPlayGames}
                  canOpenAnnouncements={canOpenAnnouncements}
                  canViewDigitalId={canViewDigitalId}
                  isModuleEnabled={isModuleEnabled}
                  todayCheckin={todayCheckin}
                  todayBangkokStr={todayBangkokStr}
                  bangkokClock={bangkokClock}
                  todayMySlots={todayMySlots}
                  schoolPeriods={schoolPeriods}
                  periodAttendance={periodAttendance}
                  scopedCoursesCount={scopedCourses.length}
                  scopedAnnouncementsCount={scopedAnnouncements.length}
                  pendingLeavesCount={pendingLeavesCount}
                  execMetrics={execMetrics}
                  getSlotTodayCheckStatus={getSlotTodayCheckStatus}
                  openPeriodCheckinFromSlot={openPeriodCheckinFromSlot}
                  setMobileAttendanceInitialSubTab={setMobileAttendanceInitialSubTab}
                  setMobileTimetableMode={setMobileTimetableMode}
                  setActiveTab={setActiveTab}
                  setActiveGameView={setActiveGameView}
                />
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

          {/* TAB EXECUTIVE */}
          {activeTab === 'executive' && (
            <MobileExecutiveTab
              activeSchool={activeSchool}
              lang={lang}
              execMetrics={execMetrics}
              canViewFinancialsMobile={canViewFinancialsMobile}
              pendingLeavesCount={pendingLeavesCount}
              onSwitchToDesktopMode={onSwitchToDesktopMode}
              onSelectTab={setActiveTab}
            />
          )}

          {/* TAB B: CHECK-IN */}
          {activeTab === 'checkin' && (
            <div className="h-full min-h-0 animate-in fade-in duration-200">
              <MobileAttendanceView
                embeddedMobile
                initialSubTab={mobileAttendanceInitialSubTab}
                initialPeriodCourseId={mobilePeriodCourseId}
                initialPeriodNumber={mobilePeriodNumber}
                initialPeriodDate={mobilePeriodDate}
                initialPeriodCode={initialPeriodCode}
                initialPeriodCheckType={mobilePeriodCheckType}
                students={students}
                teachers={isRestrictedViewer ? [] : teachers}
                courses={scopedCourses}
                attendance={attendance}
                periodAttendance={periodAttendance}
                currentUser={currentUser}
                currentRole={currentRole}
                school={activeSchool}
                campusGates={campusGates}
                schoolPeriods={schoolPeriods}
                leaveRequests={leaveRequests}
                lang={lang}
                onRecordAttendance={onRecordAttendance}
                onRecordPeriodAttendance={onRecordPeriodAttendance}
                onAddLeaveRequest={onAddLeaveRequest}
                onUpdateLeaveStatus={onUpdateLeaveStatus}
                onUpdateCampusGates={
                  currentRole === 'admin' || currentRole === 'super_admin' ? onUpdateCampusGates : undefined
                }
                onSaveCampusGates={
                  currentRole === 'admin' || currentRole === 'super_admin' ? onSaveCampusGates : undefined
                }
                onUpdateSchoolCoordinates={
                  currentRole === 'admin' || currentRole === 'super_admin'
                    ? onUpdateSchoolCoordinates
                    : undefined
                }
              />
            </div>
          )}

          {/* TAB C: LEAVE REQUESTS */}
          {activeTab === 'leave' && (
            <div className="h-full min-h-0 animate-in fade-in duration-200">
              <MobileAttendanceView
                embeddedMobile
                initialSubTab="leave_request"
                students={students}
                teachers={isRestrictedViewer ? [] : teachers}
                courses={scopedCourses}
                attendance={attendance}
                periodAttendance={periodAttendance}
                currentUser={currentUser}
                currentRole={currentRole}
                school={activeSchool}
                campusGates={campusGates}
                schoolPeriods={schoolPeriods}
                leaveRequests={leaveRequests}
                lang={lang}
                onRecordAttendance={onRecordAttendance}
                onRecordPeriodAttendance={onRecordPeriodAttendance}
                onAddLeaveRequest={onAddLeaveRequest}
                onUpdateLeaveStatus={onUpdateLeaveStatus}
              />
            </div>
          )}

          {/* TAB: TEACHER QUICK GRADEBOOK */}
          {activeTab === 'gradebook' && (
            <MobileTeacherGradebookTab
              activeSchool={activeSchool}
              lang={lang}
              courses={courses}
              students={students}
              grades={grades}
              gradingSystem={gradingSystem}
              canEditGradesMobile={canEditGradesMobile}
              onUpdateGrade={onUpdateGrade}
              onAddGrade={onAddGrade}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB: MOBILE TIMETABLE + CALENDAR + PUBLIC HOLIDAYS */}
          {activeTab === 'timetable' && (
            <MobileTimetableTab
              activeSchool={activeSchool}
              currentUser={currentUser}
              currentRole={currentRole}
              lang={lang}
              isRestrictedViewer={isRestrictedViewer}
              canSelfCheckin={canSelfCheckin}
              courses={courses}
              scopedCourses={scopedCourses}
              scopedTimetableSlots={scopedTimetableSlots}
              students={students}
              teachers={teachers}
              attendance={attendance}
              periodAttendance={periodAttendance}
              leaveRequests={leaveRequests}
              schoolPeriods={schoolPeriods}
              matchedTeacher={matchedTeacher}
              bangkokClock={bangkokClock}
              todayBangkokStr={todayBangkokStr}
              currentBangkokYear={currentBangkokYear}
              todayDayKey={todayDayKey}
              todayHoliday={todayHoliday}
              todayMySlots={todayMySlots}
              mobileTimetableMode={mobileTimetableMode}
              setMobileTimetableMode={setMobileTimetableMode}
              timetableOnlyMine={timetableOnlyMine}
              setTimetableOnlyMine={setTimetableOnlyMine}
              mobileCalendarMonthCursor={mobileCalendarMonthCursor}
              setMobileCalendarMonthCursor={setMobileCalendarMonthCursor}
              holidaySyncStatus={holidaySyncStatus}
              isSyncingHolidays={isSyncingHolidays}
              onManualHolidaySync={handleManualMobileHolidaySync}
              onOpenCalendarSync={() => setShowMobileCalendarSync(true)}
              onOpenPeriodCheckinTab={() => {
                setMobileAttendanceInitialSubTab('period_checkin');
                setActiveTab('checkin');
              }}
              getSlotTodayCheckStatus={getSlotTodayCheckStatus}
              openPeriodCheckinFromSlot={openPeriodCheckinFromSlot}
              onOpenPeriodRoster={setMobilePeriodRosterTarget}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB: STUDENT PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <MobilePortfolioTab
              lang={lang}
              portfolioItems={portfolioItems}
              linkedStudents={linkedStudents}
              teachers={teachers}
              scopedCourses={scopedCourses}
              grades={grades}
              playerScores={playerScores}
              activeSchool={activeSchool}
              gradingSystem={gradingSystem}
              currentUser={currentUser}
              onAddPortfolioItem={onAddPortfolioItem}
              onDeletePortfolioItem={onDeletePortfolioItem}
              onOpenProfileModal={onOpenProfileModal}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB: CAREER QUEST AI */}
          {activeTab === 'career_quest' && currentRole !== 'parent' && (
            <MobileCareerQuestTab
              currentUser={currentUser}
              currentRole={currentRole}
              activeSchool={activeSchool}
              students={students}
              scopedCourses={scopedCourses}
              grades={grades}
              attendance={attendance}
              portfolioItems={portfolioItems}
              playerScores={playerScores}
              gradingSystem={gradingSystem}
              lang={lang}
              onEarnRewards={onEarnRewards}
              onEquipCosmetic={onEquipCosmetic}
              onAddPortfolioItem={onAddPortfolioItem}
              onJumpToDesktopTab={onJumpToDesktopTab}
              setActiveTab={setActiveTab}
              setActiveGameView={setActiveGameView}
            />
          )}

          {/* TAB: STUDENT GRADES SUMMARY */}
          {activeTab === 'student_grades' && (
            <MobileStudentGradesTab
              activeSchool={activeSchool}
              ownStudent={ownStudent}
              scopedCourses={scopedCourses}
              grades={grades}
              gradingSystem={gradingSystem}
              lang={lang}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB D: GAMES HUB */}
          {activeTab === 'games' && (
            <MobileGamesHubTab
              currentRole={currentRole}
              lang={lang}
              currentScore={currentScore}
              playerScoresCount={playerScores.length}
              canOpenCareerQuest={canOpenCareerQuest}
              isModuleEnabled={isModuleEnabled}
              openArcadeSubTab={openArcadeSubTab}
              setActiveGameView={setActiveGameView}
              setActiveTab={setActiveTab}
            />
          )}

          {/* TAB E: PROFILE & DIGITAL VIRTUAL ID CARD */}
          {activeTab === 'profile' && (
            <MobileProfileTab
              currentUser={currentUser}
              activeSchool={activeSchool}
              currentRole={currentRole}
              lang={lang}
              setLang={setLang}
              isLight={isLight}
              setThemePalette={setThemePalette}
              profilePage={profilePage}
              setProfilePage={setProfilePage}
              canViewDigitalId={canViewDigitalId}
              canOpenPortfolio={canOpenPortfolio}
              myOwnPortfolioCount={myOwnPortfolioCount}
              isRestrictedViewer={isRestrictedViewer}
              ownStudent={ownStudent}
              linkedStudents={linkedStudents}
              students={students}
              teachers={teachers}
              onUpdateStudent={onUpdateStudent}
              onUpdateTeacher={onUpdateTeacher}
              onUpdateOwnAvatar={onUpdateOwnAvatar}
              onOpenProfileModal={onOpenProfileModal}
              onOpenOnboardingTutor={onOpenOnboardingTutor}
              onBiometricLock={onBiometricLock}
              onSwitchToDesktopMode={onSwitchToDesktopMode}
              onLogout={onLogout}
              onOpenPortfolio={() => setActiveTab('portfolio')}
            />
          )}

          {/* TAB F: HOMEWORK */}
          {activeTab === 'homework' && (
            <MobileHomeworkTab
              lang={lang}
              scopedAssignments={scopedAssignments}
              scopedCourses={scopedCourses}
              myCompletedSubmissions={myCompletedSubmissions}
              currentPersonId={currentPersonId}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB G: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <MobileAnnouncementsTab
              lang={lang}
              scopedAnnouncements={scopedAnnouncements}
              selectedAnnouncement={selectedAnnouncement}
              setSelectedAnnouncement={setSelectedAnnouncement}
              onBackHome={() => setActiveTab('home')}
            />
          )}
        </ViewErrorBoundary>
      </main>

      {/* 3. CLEAN APPLE/LINEAR 4-TAB BOTTOM NAVIGATION */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setActiveGameView={setActiveGameView}
        currentRole={currentRole}
        lang={lang}
        canSelfCheckin={canSelfCheckin}
        canViewTimetable={canViewTimetable}
        canOpenAnnouncements={canOpenAnnouncements}
        canPlayGames={canPlayGames}
        canAccessHomework={canAccessHomework}
        canViewGradesStudent={canViewGradesStudent}
        canOpenPortfolio={canOpenPortfolio}
        isModuleEnabled={isModuleEnabled}
        pendingLeavesCount={pendingLeavesCount}
        invoices={invoices}
        onResetCheckinToSelfie={() => {
          setMobileAttendanceInitialSubTab('selfie_mobile');
          setMobilePeriodCourseId(undefined);
          setMobilePeriodNumber(undefined);
          setMobilePeriodDate(undefined);
          setMobilePeriodCheckType(undefined);
        }}
      />

      {/* IMMERSIVE FULLSCREEN GAME TAKEOVER */}
      {activeGameView !== 'hub' && (
        <MobileFullscreenGameOverlay
          activeGameView={activeGameView}
          arcadeInitialSubTab={arcadeInitialSubTab}
          lang={lang}
          currentRole={currentRole}
          currentUser={currentUser}
          activeSchool={activeSchool}
          linkedStudents={linkedStudents}
          portfolioItems={portfolioItems}
          questions={questions}
          playerScores={playerScores}
          rewardItems={rewardItems}
          rewardRedemptions={rewardRedemptions}
          onAddQuestion={onAddQuestion}
          onImportQuestions={onImportQuestions}
          onEarnRewards={onEarnRewards}
          onRedeemReward={onRedeemReward}
          onEquipCosmetic={onEquipCosmetic}
          onReviewRedemption={onReviewRedemption}
          onCreateCustomReward={onCreateCustomReward}
          onExitGame={() => setActiveGameView('hub')}
          onOpenPortfolio={() => {
            setActiveGameView('hub');
            setActiveTab('portfolio');
          }}
        />
      )}

      {showMobileCalendarSync && (
        <GoogleCalendarSyncModal
          slots={scopedTimetableSlots}
          assignments={scopedAssignments}
          courses={scopedCourses}
          schoolId={activeSchool.id}
          schoolName={activeSchool.nameTh || activeSchool.nameEn}
          academicYear={activeSchool.academicYear || '2569'}
          semester={activeSchool.currentSemester || '1'}
          filterLabel={
            currentRole === 'student' && ownStudent
              ? `${ownStudent.gradeLevel} ${ownStudent.room}`
              : currentRole === 'teacher'
                ? teacherFullName || 'ตารางสอนของฉัน'
                : 'ตารางเรียนโรงเรียน'
          }
          defaultStartDate={todayBangkokStr}
          defaultEndDate={addCalendarDays(todayBangkokStr, 120)}
          calendarWeekStart={getCalendarWeekStart(todayBangkokStr)}
          onClose={() => setShowMobileCalendarSync(false)}
        />
      )}

      <TimetablePeriodAttendanceModal
        isOpen={Boolean(mobilePeriodRosterTarget)}
        onClose={() => setMobilePeriodRosterTarget(null)}
        slot={mobilePeriodRosterTarget?.slot || null}
        initialDate={mobilePeriodRosterTarget?.date || todayBangkokStr}
        schoolId={activeSchool.id}
        courses={scopedCourses}
        students={students}
        teachers={teachers}
        schoolPeriods={schoolPeriods}
        attendance={attendance}
        periodAttendance={periodAttendance}
        leaveRequests={leaveRequests}
        currentUser={currentUser}
        lang={lang}
        onRecordPeriodAttendance={onRecordPeriodAttendance}
      />
    </div>
  );
};
