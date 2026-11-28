import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Compass,
  CreditCard,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  History,
} from 'lucide-react';
import type { PlayerScore, TimetableSlot } from '../../types';
import { getLocalDateString } from '../../lib/date';
import { DEFAULT_SCHOOL_PERIODS } from '../../lib/schoolPeriods';
import { resolveMatchedTeacherForUser, slotMatchesLoggedInTeacher } from '../../lib/courseTeacherFilter';
import { isGameEnabledByFeatureFlags, isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getModuleTone } from '../../lib/moduleTheme';
import { CALENDAR_NOTES_UPDATED_EVENT } from '../../lib/calendarNotes';
import {
  TEACHER_PERIOD_CHECKIN_EVENT,
  findTeacherPeriodCheckin,
  recordTeacherPeriodCheck,
} from '../../lib/teacherPeriodCheckinStore';
import { playNotificationChime } from '../../lib/pushNotifications';
import {
  readSavedNavState,
  syncUrlNavParams,
  writeSavedNavState,
} from '../../features/navigation/navPersistence';
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
import type { CorrectionPrefillSeed } from '../attendance/AttendanceCorrectionHub';
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
  MobileAttendanceHistoryTab,
  MobileBehaviorSdqTab,
  MobileBottomNav,
  MobileCareerQuestTab,
  MobileExecutiveTab,
  MobileFullscreenGameOverlay,
  MobileGamesHubTab,
  MobileHeader,
  MobileHomeworkTab,
  MobileInfirmaryTab,
  MobileLmsTab,
  MobilePortfolioTab,
  MobileProfileTab,
  MobileStudentGradesTab,
  MobileTeacherGradebookTab,
  MobileTeacherParentHome,
  MobileTimetableTab,
  type MobileQuickMenuItem,
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
  isSuperAdminSchoolView: _isSuperAdminSchoolView = false,
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
  lessons = [],
  grades = [],
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
  onUpdateTeacher,
  onUpdateOwnAvatar,
  timetableSlots = [],
  allSchoolTimetableSlots,
  allSchoolCourses,
  allSchoolTeachers,
  allSchoolStudents,
  schoolPeriods = DEFAULT_SCHOOL_PERIODS,
  gradingSystem = activeSchool.gradingSystem || 'thai',
  systemConfig,
  schoolPermissions,
  featureFlags,
  onUpdateGrade,
  onAddGrade,
  schools = [],
  coordinationUnreadCount = 0,
  unclaimedCentralPacksCount: _unclaimedCentralPacksCount = 0,
  onOpenSchoolSwitcher,
  onUpdateSchool,
  onAddAnnouncement,
  onAddHomeworkAssignment,
  onAddHomeworkSubmission,
  onGradeHomeworkSubmission,
  onAddBehaviorRecord,
  onAddSdqAssessment,
  onAddInfirmaryVisit,
  onCompleteLesson,
  onSaveLesson,
  onSubmitAssignment,
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
  onToggleGameView,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>(() => {
    if (initialPeriodCourseId || initialPeriodNumber || initialMobileTab !== 'home') {
      return initialMobileTab;
    }
    return readSavedNavState(currentUser?.id)?.mobileTab || initialMobileTab;
  });
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
  const [mobileTimetableMode, setMobileTimetableMode] = useState<'day' | 'week' | 'grid' | 'calendar'>(
    () => readSavedNavState(currentUser?.id)?.mobileTimetableMode || 'day'
  );

  useEffect(() => {
    if (!currentUser?.id) return;
    writeSavedNavState({
      userId: currentUser.id,
      mobileTab: activeTab,
      mobileTimetableMode,
    });
    syncUrlNavParams({
      mobileTab: activeTab,
      isMobileView: true,
    });
  }, [currentUser?.id, activeTab, mobileTimetableMode]);
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
    'selfie_mobile' | 'history' | 'leave_request' | 'teacher_proxy' | 'period_checkin' | 'corrections'
  >(initialAttendanceSubTab);
  const [mobileCorrectionPrefill, setMobileCorrectionPrefill] =
    useState<CorrectionPrefillSeed | null>(null);
  const [mobileLeavePrefillDate, setMobileLeavePrefillDate] = useState<string | undefined>(
    undefined
  );
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
  const todayCheckin =
    scopedAttendance.find((a) => a.date === todayStr && a.recordType !== 'check_out') ||
    scopedAttendance.find((a) => a.date === todayStr);
  const todayCheckout = scopedAttendance.find((a) => a.date === todayStr && a.recordType === 'check_out');

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
    (isModuleEnabled('games') || isModuleEnabled('subject_labs') || isModuleEnabled('boss_raid') || isModuleEnabled('school_farm'));
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
  const canViewTimetable = isModuleEnabled('timetable');
  const canOpenPortfolio =
    isModuleEnabled('portfolio') &&
    (currentRole !== 'student' || schoolPermissions?.student_upload_portfolio !== false);
  const canOpenCareerQuest = currentRole !== 'parent' && isModuleEnabled('career_quest');
  const canOpenAnnouncements = isModuleEnabled('announcements');
  const canOpenLeave = isModuleEnabled('mobile_checkin') || isModuleEnabled('attendance');
  const canViewDigitalId = isModuleEnabled('student_id_cards');
  const canOpenLms = isModuleEnabled('courses');
  const canOpenBehaviorSdq =
    isModuleEnabled('behavior_sdq') &&
    (currentRole === 'admin' ||
      currentRole === 'super_admin' ||
      (currentRole === 'teacher' && schoolPermissions?.teacher_sdq_screening !== false));
  const canOpenInfirmary =
    isModuleEnabled('infirmary') &&
    (currentRole === 'admin' ||
      currentRole === 'super_admin' ||
      (currentRole === 'teacher' && schoolPermissions?.teacher_infirmary_access !== false));

  const myLeaves = isRestrictedViewer
    ? filterLeaveRequestsForUser(leaveRequests, currentUser, students)
    : leaveRequests;
  const pendingLeavesCount = myLeaves.filter((l) => l.status === 'pending').length;

  const scopedCourses = useMemo(
    () => (isRestrictedViewer ? filterCoursesForPersonalRole(courses, currentUser, students) : courses),
    [courses, currentUser, isRestrictedViewer, students]
  );
  const scopedLessons = useMemo(() => {
    if (!isRestrictedViewer) return lessons;
    const courseIds = new Set(scopedCourses.map((c) => c.id));
    return lessons.filter((l) => courseIds.has(l.courseId));
  }, [isRestrictedViewer, lessons, scopedCourses]);
  const linkedStudentIds = useMemo(() => new Set(linkedStudents.map((s) => s.id)), [linkedStudents]);
  const scopedPeriodAttendance = useMemo(
    () =>
      isRestrictedViewer
        ? periodAttendance.filter(
            (rec) => linkedStudentIds.has(rec.studentId) || (currentUser?.id && rec.studentId === currentUser.id)
          )
        : periodAttendance,
    [isRestrictedViewer, periodAttendance, linkedStudentIds, currentUser?.id]
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

  const timetableScopeCourses = isRestrictedViewer ? scopedCourses : (allSchoolCourses ?? courses);
  const timetableScopeTeachers = isRestrictedViewer ? teachers : (allSchoolTeachers ?? teachers);
  const timetableScopeStudents = isRestrictedViewer ? students : (allSchoolStudents ?? students);
  const timetableScopeSlots = isRestrictedViewer
    ? scopedTimetableSlots
    : (allSchoolTimetableSlots ?? timetableSlots);

  const matchedTeacher = useMemo(
    () =>
      currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin'
        ? resolveMatchedTeacherForUser(currentUser, timetableScopeTeachers)
        : undefined,
    [currentRole, currentUser, timetableScopeTeachers]
  );
  const teacherFullName = currentUser?.fullNameTh || currentUser?.fullNameEn || '';
  const todayMySlots = useMemo(() => {
    return timetableScopeSlots
      .filter((s) => s.dayOfWeek === todayDayKey)
      .filter((s) => {
        if (currentRole === 'teacher') {
          return slotMatchesLoggedInTeacher(s, currentUser, matchedTeacher, timetableScopeCourses);
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }, [timetableScopeSlots, todayDayKey, currentRole, currentUser, matchedTeacher, timetableScopeCourses]);

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

  const [teacherPeriodTick, setTeacherPeriodTick] = useState(0);
  useEffect(() => {
    const onUpdated = () => setTeacherPeriodTick((t) => t + 1);
    window.addEventListener(TEACHER_PERIOD_CHECKIN_EVENT, onUpdated);
    return () => window.removeEventListener(TEACHER_PERIOD_CHECKIN_EVENT, onUpdated);
  }, []);

  const openPeriodCheckinFromSlot = (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => {
    const matchedCourse = timetableScopeCourses.find(
      (c) =>
        (slot.courseId && c.id === slot.courseId) ||
        (Boolean(slot.courseCode && c.code) &&
          c.code.trim().toLowerCase() === slot.courseCode.trim().toLowerCase())
    );
    const resolvedCourseId = slot.courseId || matchedCourse?.id || slot.courseCode;
    if (currentRole === 'teacher') {
      const teacherKey = matchedTeacher?.id || currentUser?.id || 'usr-teacher';
      const teacherDisplay =
        currentUser?.fullNameTh || currentUser?.fullNameEn || matchedTeacher?.fullNameTh || 'ครูผู้สอน';
      recordTeacherPeriodCheck({
        schoolId: activeSchool.id,
        teacherId: teacherKey,
        teacherName: teacherDisplay,
        courseId: resolvedCourseId,
        courseCode: slot.courseCode,
        periodNumber: slot.periodNumber,
        date: dateValue,
        checkType,
      });
      playNotificationChime();
    }
    setMobileAttendanceInitialSubTab('period_checkin');
    setMobilePeriodCourseId(resolvedCourseId);
    setMobilePeriodNumber(slot.periodNumber);
    setMobilePeriodDate(dateValue);
    setMobilePeriodCheckType(checkType);
    setActiveTab('checkin');
  };

  const openStudentAttendance = () => {
    setMobileAttendanceInitialSubTab('teacher_proxy');
    setMobilePeriodCourseId(undefined);
    setMobilePeriodNumber(undefined);
    setMobilePeriodDate(undefined);
    setMobilePeriodCheckType(undefined);
    setActiveTab('student_attendance');
  };

  const getSlotTodayCheckStatus = (slot: TimetableSlot, dateValue: string) => {
    void teacherPeriodTick;
    const resolvedCourseId =
      slot.courseId || scopedCourses.find((c) => c.code === slot.courseCode)?.id || slot.courseCode;
    const matches = periodAttendance.filter(
      (rec) =>
        rec.date === dateValue &&
        rec.periodNumber === slot.periodNumber &&
        (rec.courseId === resolvedCourseId || rec.courseCode === slot.courseCode)
    );
    const teacherRec =
      currentRole === 'teacher'
        ? findTeacherPeriodCheckin({
            schoolId: activeSchool.id,
            teacherId: matchedTeacher?.id || currentUser?.id || 'usr-teacher',
            courseId: resolvedCourseId,
            courseCode: slot.courseCode,
            periodNumber: slot.periodNumber,
            date: dateValue,
          })
        : undefined;
    return {
      hasCheckIn:
        Boolean(teacherRec?.checkInTime) ||
        matches.some((m) => (m.recordType || 'check_in') === 'check_in'),
      hasCheckOut:
        Boolean(teacherRec?.checkOutTime) ||
        matches.some((m) => m.recordType === 'check_out'),
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
      (activeTab === 'student_attendance' && (currentRole !== 'teacher' || !canSelfCheckin)) ||
      (activeTab === 'leave' && !canOpenLeave) ||
      (activeTab === 'attendance_history' && !canOpenLeave && !canSelfCheckin) ||
      (activeTab === 'gradebook' && !isModuleEnabled('gradebook')) ||
      (activeTab === 'student_grades' && !canViewGradesStudent) ||
      (activeTab === 'portfolio' && !canOpenPortfolio) ||
      (activeTab === 'career_quest' && !canOpenCareerQuest) ||
      (activeTab === 'timetable' && !canViewTimetable) ||
      (activeTab === 'games' && !canPlayGames) ||
      (activeTab === 'homework' && !canAccessHomework) ||
      (activeTab === 'announcements' && !canOpenAnnouncements) ||
      (activeTab === 'behavior_sdq' && !canOpenBehaviorSdq) ||
      (activeTab === 'infirmary' && !canOpenInfirmary) ||
      (activeTab === 'lms' && !canOpenLms);
    if (blockedTab) {
      setActiveTab('home');
    }
  }, [
    activeTab,
    canSelfCheckin,
    currentRole,
    canOpenLeave,
    canViewGradesStudent,
    canOpenPortfolio,
    canOpenCareerQuest,
    canViewTimetable,
    canPlayGames,
    canAccessHomework,
    canOpenAnnouncements,
    canOpenBehaviorSdq,
    canOpenInfirmary,
    canOpenLms,
    featureFlags,
  ]);

  useEffect(() => {
    if (activeGameView === 'hub') return;
    const blockedGame =
      (activeGameView === 'arcade_studio' && !isModuleEnabled('games')) ||
      (activeGameView === 'battle_royale_3d' &&
        (!isModuleEnabled('games') || !isGameEnabledByFeatureFlags('battle_royale_3d', featureFlags, currentRole))) ||
      (activeGameView === '1v1_arena' &&
        (!isModuleEnabled('games') || !isGameEnabledByFeatureFlags('arena_1v1', featureFlags, currentRole))) ||
      (activeGameView === 'school_farm' && !isModuleEnabled('school_farm')) ||
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
      riskCount,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
    };
  }, [attendance, students, teachers, courses, infirmaryVisits, sdqAssessments]);

  const mobileOtherMenuItems = useMemo<MobileQuickMenuItem[]>(() => {
    const items: MobileQuickMenuItem[] = [];
    const slot3IsTimetable =
      currentRole !== 'admin' && currentRole !== 'super_admin' && canViewTimetable;
    const slot3IsHomework =
      currentRole === 'student' && !canViewTimetable && canAccessHomework;
    const slot3IsStudentGrades =
      currentRole === 'student' && !canViewTimetable && !canAccessHomework && canViewGradesStudent;
    const slot3IsGames =
      currentRole === 'student' && !canViewTimetable && !canAccessHomework && !canViewGradesStudent && canPlayGames;
    const slot3IsPortfolio =
      currentRole === 'student' && !canViewTimetable && !canAccessHomework && !canViewGradesStudent && !canPlayGames;
    const slot3IsExecutive =
      currentRole !== 'admin' && currentRole !== 'super_admin' && currentRole !== 'student' && !canViewTimetable;

    if (currentRole === 'teacher') {
      if (canAccessHomework) {
        items.push({
          id: 'homework',
          label: lang === 'th' ? 'การบ้าน / ตรวจงาน' : 'Homework',
          meta: scopedAssignments.length > 0 ? `${scopedAssignments.length}` : undefined,
          icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          active: activeTab === 'homework',
          onClick: () => setActiveTab('homework'),
        });
      }
      if (canOpenLms) {
        items.push({
          id: 'lms',
          label: lang === 'th' ? 'ห้องเรียน LMS' : 'LMS Classroom',
          meta: scopedLessons.length > 0 ? `${scopedLessons.length}` : undefined,
          icon: <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
          active: activeTab === 'lms',
          onClick: () => setActiveTab('lms'),
        });
      }
      if (isModuleEnabled('gradebook')) {
        items.push({
          id: 'gradebook',
          label: lang === 'th' ? 'คะแนน & ปพ.' : 'Gradebook',
          icon: <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          active: activeTab === 'gradebook',
          onClick: () => setActiveTab('gradebook'),
        });
      }
      if (canOpenLeave) {
        items.push({
          id: 'leave',
          label: lang === 'th' ? 'ยื่นใบลา / อนุมัติลา' : 'Leave Requests',
          meta: pendingLeavesCount > 0 ? `${pendingLeavesCount}` : undefined,
          icon: <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          active: activeTab === 'leave',
          onClick: () => setActiveTab('leave'),
        });
      }
      if (canOpenBehaviorSdq) {
        items.push({
          id: 'behavior_sdq',
          label: lang === 'th' ? 'พฤติกรรม SDQ' : 'Behavior & SDQ',
          meta: execMetrics.riskCount > 0 ? `${execMetrics.riskCount}` : undefined,
          icon: <HeartHandshake className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          active: activeTab === 'behavior_sdq',
          onClick: () => setActiveTab('behavior_sdq'),
        });
      }
      if (canOpenInfirmary) {
        items.push({
          id: 'infirmary',
          label: lang === 'th' ? 'ห้องพยาบาล' : 'Infirmary',
          meta: execMetrics.todayInfirmary > 0 ? `${execMetrics.todayInfirmary}` : undefined,
          icon: <HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          active: activeTab === 'infirmary',
          onClick: () => setActiveTab('infirmary'),
        });
      }
      if (!slot3IsExecutive) {
        items.push({
          id: 'executive',
          label: lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview',
          meta: `${execMetrics.attendanceRate}%`,
          icon: <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          active: activeTab === 'executive',
          onClick: () => setActiveTab('executive'),
        });
      }
      if (canPlayGames) {
        items.push({
          id: 'games',
          label: lang === 'th' ? 'เกม & แล็บ 8 สาระ' : 'Games & Labs',
          icon: <Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          active: activeTab === 'games',
          onClick: () => {
            setActiveTab('games');
            setActiveGameView('hub');
          },
        });
      }
      if (canOpenCareerQuest) {
        items.push({
          id: 'career_quest',
          label: 'Career Quest AI',
          icon: <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
          active: activeTab === 'career_quest',
          onClick: () => setActiveTab('career_quest'),
        });
      }
    } else if (currentRole === 'student') {
      if (canAccessHomework && !slot3IsHomework) {
        items.push({
          id: 'homework',
          label: lang === 'th' ? 'การบ้าน' : 'Homework',
          meta: pendingHomeworkCount > 0 ? `${pendingHomeworkCount}` : undefined,
          icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          active: activeTab === 'homework',
          onClick: () => setActiveTab('homework'),
        });
      }
      if (canOpenLms) {
        items.push({
          id: 'lms',
          label: lang === 'th' ? 'ห้องเรียน LMS' : 'LMS Classroom',
          meta: scopedLessons.length > 0 ? `${scopedLessons.length}` : undefined,
          icon: <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
          active: activeTab === 'lms',
          onClick: () => setActiveTab('lms'),
        });
      }
      if (canViewGradesStudent && !slot3IsStudentGrades) {
        items.push({
          id: 'student_grades',
          label: lang === 'th' ? 'ผลการเรียน' : 'Grades',
          icon: <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          active: activeTab === 'student_grades',
          onClick: () => setActiveTab('student_grades'),
        });
      }
      if (canOpenPortfolio && !slot3IsPortfolio) {
        items.push({
          id: 'portfolio',
          label: lang === 'th' ? 'ผลงานของฉัน' : 'Portfolio',
          meta: myOwnPortfolioCount > 0 ? `${myOwnPortfolioCount}` : undefined,
          icon: <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          active: activeTab === 'portfolio',
          onClick: () => setActiveTab('portfolio'),
        });
      }
      if (canOpenLeave) {
        items.push({
          id: 'leave',
          label: lang === 'th' ? 'ยื่นใบลา' : 'Leave Request',
          meta: pendingLeavesCount > 0 ? `${pendingLeavesCount}` : undefined,
          icon: <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          active: activeTab === 'leave',
          onClick: () => setActiveTab('leave'),
        });
      }
      items.push({
        id: 'attendance_history',
        label: lang === 'th' ? 'ประวัติมาเรียน' : 'Attendance History',
        icon: <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        active: activeTab === 'attendance_history',
        onClick: () => setActiveTab('attendance_history'),
      });
      if (canPlayGames && !slot3IsGames) {
        items.push({
          id: 'games',
          label: lang === 'th' ? 'เกม & แล็บ' : 'Games & Labs',
          icon: <Gamepad2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
          active: activeTab === 'games',
          onClick: () => {
            setActiveTab('games');
            setActiveGameView('hub');
          },
        });
      }
      if (canOpenCareerQuest) {
        items.push({
          id: 'career_quest',
          label: 'Career Quest AI',
          icon: <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
          active: activeTab === 'career_quest',
          onClick: () => setActiveTab('career_quest'),
        });
      }
      if (canViewDigitalId) {
        items.push({
          id: 'digital_id',
          label: lang === 'th' ? 'บัตรนักเรียนดิจิทัล' : 'Digital ID',
          icon: <CreditCard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
          active: activeTab === 'profile' && profilePage === 0,
          onClick: () => {
            setProfilePage(0);
            setActiveTab('profile');
          },
        });
      }
    } else if (currentRole === 'parent') {
      if (canOpenLeave) {
        items.push({
          id: 'leave',
          label: lang === 'th' ? 'ยื่นใบลาให้บุตรหลาน' : 'Submit Leave Request',
          meta: pendingLeavesCount > 0 ? `${pendingLeavesCount}` : undefined,
          icon: <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          active: activeTab === 'leave',
          onClick: () => setActiveTab('leave'),
        });
      }
      if (canOpenPortfolio) {
        items.push({
          id: 'portfolio',
          label: lang === 'th' ? 'ผลงานนักเรียน' : 'Portfolio',
          icon: <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          active: activeTab === 'portfolio',
          onClick: () => setActiveTab('portfolio'),
        });
      }
      if (canViewDigitalId) {
        items.push({
          id: 'digital_id',
          label: lang === 'th' ? 'บัตรนักเรียนดิจิทัล' : 'Digital ID',
          icon: <CreditCard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
          active: activeTab === 'profile' && profilePage === 0,
          onClick: () => {
            setProfilePage(0);
            setActiveTab('profile');
          },
        });
      }
    } else if (currentRole === 'admin') {
      items.push({
        id: 'executive',
        label: lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview',
        meta: `${execMetrics.attendanceRate}%`,
        icon: <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
        active: activeTab === 'executive',
        onClick: () => setActiveTab('executive'),
      });
      if (canViewTimetable && !slot3IsTimetable) {
        items.push({
          id: 'timetable',
          label: lang === 'th' ? 'ตารางสอน' : 'Timetable',
          icon: <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          active: activeTab === 'timetable',
          onClick: () => setActiveTab('timetable'),
        });
      }
      if (canOpenBehaviorSdq) {
        items.push({
          id: 'behavior_sdq',
          label: lang === 'th' ? 'พฤติกรรม SDQ' : 'Behavior & SDQ',
          icon: <HeartHandshake className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          active: activeTab === 'behavior_sdq',
          onClick: () => setActiveTab('behavior_sdq'),
        });
      }
      if (canOpenInfirmary) {
        items.push({
          id: 'infirmary',
          label: lang === 'th' ? 'ห้องพยาบาล' : 'Infirmary',
          icon: <HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          active: activeTab === 'infirmary',
          onClick: () => setActiveTab('infirmary'),
        });
      }
    }

    return items;
  }, [
    activeTab,
    canAccessHomework,
    canOpenBehaviorSdq,
    canOpenCareerQuest,
    canOpenInfirmary,
    canOpenLeave,
    canOpenLms,
    canOpenPortfolio,
    canPlayGames,
    canViewDigitalId,
    canViewGradesStudent,
    canViewTimetable,
    currentRole,
    execMetrics.attendanceRate,
    execMetrics.riskCount,
    execMetrics.todayInfirmary,
    featureFlags,
    lang,
    myOwnPortfolioCount,
    pendingHomeworkCount,
    pendingLeavesCount,
    profilePage,
    scopedAssignments.length,
    scopedLessons.length,
  ]);

  return (
    <div
      className={`${getModuleTone(MOBILE_TONE_TARGET[activeTab])} mobile-app-workspace h-full min-h-0 flex flex-col overflow-hidden app-workspace text-[var(--color-text-body)] pb-14 sm:pb-16 select-none`}
    >
      {/* 1. CLEAN SINGLE-ROW APPLE/LINEAR MOBILE HEADER */}
      <MobileHeader
        activeSchool={activeSchool}
        currentUser={currentUser}
        currentRole={currentRole}
        lang={lang}
        setLang={setLang}
        isLight={isLight}
        setThemePalette={setThemePalette}
        unreadCount={unreadCount}
        coordinationUnreadCount={coordinationUnreadCount}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={() => {
          setProfilePage(canViewDigitalId ? 0 : 1);
          setActiveTab('profile');
        }}
        onOpenProfileModal={onOpenProfileModal}
        onOpenSchoolSwitcher={onOpenSchoolSwitcher}
        onSwitchToDesktopMode={onSwitchToDesktopMode}
        onOpenOnboardingTutor={onOpenOnboardingTutor}
        onLogout={onLogout}
        canSwitchAdminTeacherMode={canSwitchAdminTeacherMode}
        onSwitchOperationalRole={
          onSwitchOperationalRole
            ? (nextRole) => {
                onSwitchOperationalRole(nextRole);
                if (nextRole !== currentRole) {
                  setActiveTab('home');
                }
              }
            : undefined
        }
        onToggleGameView={onToggleGameView}
        otherMenuItems={mobileOtherMenuItems}
      />

      {/* 2. MAIN ACTIVE VIEW CONTAINER (Compact mobile padding) */}
      <main
        className={`flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto ${
          activeTab === 'checkin' || activeTab === 'leave' || activeTab === 'student_attendance'
            ? 'px-2.5 py-1.5 sm:p-4 overflow-hidden flex flex-col'
            : 'px-3.5 py-2.5 sm:p-5 overflow-y-auto'
        }`}
      >
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
            <div className="flex flex-col gap-3 animate-in fade-in duration-150">
              {currentRole === 'super_admin' ? (
                <MobileSuperAdminHub
                  schools={schools}
                  activeSchool={activeSchool}
                  lang={lang}
                  initialTab="overview"
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
                  coordinationUnreadCount={coordinationUnreadCount}
                  onRecordAttendance={onRecordAttendance}
                  onUpdateLeaveStatus={onUpdateLeaveStatus}
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
                  todayCheckout={todayCheckout}
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
                  canViewDigitalId={canViewDigitalId}
                  canOpenLms={canOpenLms}
                  lessonsCount={scopedLessons.length}
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
                  onOpenAttendanceHistory={() => setActiveTab('attendance_history')}
                  onOpenDigitalId={
                    canViewDigitalId
                      ? () => {
                          setProfilePage(0);
                          setActiveTab('profile');
                        }
                      : undefined
                  }
                  onOpenLms={canOpenLms ? () => setActiveTab('lms') : undefined}
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
                  canAccessHomework={canAccessHomework}
                  canOpenLms={canOpenLms}
                  canOpenBehaviorSdq={canOpenBehaviorSdq}
                  canOpenInfirmary={canOpenInfirmary}
                  isModuleEnabled={isModuleEnabled}
                  todayCheckin={todayCheckin}
                  todayCheckout={todayCheckout}
                  todayBangkokStr={todayBangkokStr}
                  bangkokClock={bangkokClock}
                  todayMySlots={todayMySlots}
                  schoolPeriods={schoolPeriods}
                  periodAttendance={periodAttendance}
                  scopedAnnouncementsCount={scopedAnnouncements.length}
                  pendingLeavesCount={pendingLeavesCount}
                  scopedAssignmentsCount={scopedAssignments.length}
                  lessonsCount={scopedLessons.length}
                  execMetrics={execMetrics}
                  getSlotTodayCheckStatus={getSlotTodayCheckStatus}
                  onOpenStudentAttendance={openStudentAttendance}
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
              announcements={announcements}
              lang={lang}
              currentUser={currentUser}
              onUpdateStudent={onUpdateStudent}
              onUpdateSchool={onUpdateSchool}
              onAddAnnouncement={onAddAnnouncement}
              onUpdateLeaveStatus={onUpdateLeaveStatus}
              onJumpToDesktopTab={onJumpToDesktopTab}
              onOpenCheckin={() => setActiveTab('checkin')}
            />
          )}

          {/* TAB: SUPER ADMIN SCHOOLS & APPROVALS */}
          {activeTab === 'super_schools' && (
            <MobileSuperAdminHub
              schools={schools}
              activeSchool={activeSchool}
              lang={lang}
              initialTab="schools"
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
              pendingLeavesCount={pendingLeavesCount}
              onSwitchToDesktopMode={onSwitchToDesktopMode}
              onSelectTab={setActiveTab}
            />
          )}

          {/* TAB B: CHECK-IN */}
          {(activeTab === 'checkin' || activeTab === 'student_attendance') && (
            <div className="h-full min-h-0 flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
              <MobileAttendanceView
                embeddedMobile
                initialSubTab={activeTab === 'student_attendance' ? 'teacher_proxy' : mobileAttendanceInitialSubTab}
                initialCorrectionPrefill={mobileCorrectionPrefill}
                showAttendanceAudienceSwitch={['teacher', 'admin', 'super_admin'].includes(currentRole)}
                filterTabsByAudience
                onAttendanceAudienceChange={(audience) => {
                  setActiveTab(audience === 'students' ? 'student_attendance' : 'checkin');
                }}
                initialPeriodCourseId={mobilePeriodCourseId}
                initialPeriodNumber={mobilePeriodNumber}
                initialPeriodDate={mobilePeriodDate}
                initialPeriodCode={initialPeriodCode}
                initialPeriodCheckType={mobilePeriodCheckType}
                students={isRestrictedViewer ? students : timetableScopeStudents}
                teachers={isRestrictedViewer ? [] : timetableScopeTeachers}
                courses={isRestrictedViewer ? scopedCourses : timetableScopeCourses}
                attendance={attendance}
                periodAttendance={periodAttendance}
                currentUser={currentUser}
                currentRole={currentRole}
                school={activeSchool}
                campusGates={campusGates}
                schoolPeriods={schoolPeriods}
                timetableSlots={timetableScopeSlots}
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
            <div className="h-full min-h-0 flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
              <MobileAttendanceView
                embeddedMobile
                initialSubTab="leave_request"
                initialLeaveDate={mobileLeavePrefillDate}
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
              currentRole={currentRole}
              currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn}
              systemConfig={systemConfig}
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
              courses={timetableScopeCourses}
              scopedCourses={isRestrictedViewer ? scopedCourses : timetableScopeCourses}
              scopedTimetableSlots={timetableScopeSlots}
              assignments={scopedAssignments}
              students={timetableScopeStudents}
              teachers={timetableScopeTeachers}
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
              onHolidayMutated={() => setHolidaySyncTick((v) => v + 1)}
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
              featureFlags={featureFlags}
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
              courses={courses}
              timetableSlots={timetableSlots}
              schoolPeriods={schoolPeriods}
              onUpdateStudent={onUpdateStudent}
              onUpdateTeacher={onUpdateTeacher}
              onUpdateOwnAvatar={onUpdateOwnAvatar}
              onOpenProfileModal={onOpenProfileModal}
              onOpenOnboardingTutor={onOpenOnboardingTutor}
              onBiometricLock={onBiometricLock}
              onSwitchToDesktopMode={onSwitchToDesktopMode}
              onLogout={onLogout}
              onOpenPortfolio={() => setActiveTab('portfolio')}
              canSwitchAdminTeacherMode={canSwitchAdminTeacherMode}
              onSwitchOperationalRole={
                onSwitchOperationalRole
                  ? (nextRole) => {
                      onSwitchOperationalRole(nextRole);
                      if (nextRole !== currentRole) {
                        setActiveTab('home');
                      }
                    }
                  : undefined
              }
            />
          )}

          {/* TAB F: HOMEWORK */}
          {activeTab === 'homework' && (
            <MobileHomeworkTab
              activeSchool={activeSchool}
              currentRole={currentRole}
              lang={lang}
              scopedAssignments={scopedAssignments}
              scopedCourses={scopedCourses}
              homeworkSubmissions={homeworkSubmissions}
              ownStudent={ownStudent}
              myCompletedSubmissions={myCompletedSubmissions}
              currentPersonId={currentPersonId}
              canManageHomework={canAccessHomework}
              canStudentSubmit={canAccessHomework}
              onAddHomeworkAssignment={onAddHomeworkAssignment}
              onAddHomeworkSubmission={onAddHomeworkSubmission}
              onGradeHomeworkSubmission={onGradeHomeworkSubmission}
              onSubmitAssignment={onSubmitAssignment}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB G: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <MobileAnnouncementsTab
              lang={lang}
              currentRole={currentRole}
              currentUser={currentUser}
              scopedAnnouncements={scopedAnnouncements}
              selectedAnnouncement={selectedAnnouncement}
              setSelectedAnnouncement={setSelectedAnnouncement}
              onAddAnnouncement={onAddAnnouncement}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB H: STUDENT / PARENT / STAFF ATTENDANCE HISTORY */}
          {activeTab === 'attendance_history' && (
            <MobileAttendanceHistoryTab
              lang={lang}
              schoolId={activeSchool.id}
              personName={
                ownStudent
                  ? `${ownStudent.firstNameTh} ${ownStudent.lastNameTh}`
                  : matchedTeacher?.fullNameTh || currentUser?.fullNameTh || currentUser?.fullNameEn
              }
              personalTargetIds={
                [
                  ownStudent?.id,
                  matchedTeacher?.id,
                  currentUser?.id,
                  currentUser?.studentRecordId,
                ].filter(Boolean) as string[]
              }
              leaveRequests={leaveRequests}
              scopedAttendance={scopedAttendance}
              scopedPeriodAttendance={scopedPeriodAttendance}
              courses={scopedCourses}
              onBackHome={() => setActiveTab('home')}
              onOpenCorrectionFromHistory={
                canSelfCheckin && currentRole !== 'parent'
                  ? (prefill) => {
                      setMobileCorrectionPrefill({
                        ...prefill,
                        requesterId: ownStudent?.id || matchedTeacher?.id || currentUser?.id,
                      });
                      setMobileAttendanceInitialSubTab('corrections');
                      setActiveTab('checkin');
                    }
                  : undefined
              }
              onOpenLeaveFromHistory={
                canOpenLeave
                  ? (date) => {
                      setMobileLeavePrefillDate(date);
                      setActiveTab('leave');
                    }
                  : undefined
              }
            />
          )}

          {/* TAB I: BEHAVIOR & SDQ */}
          {activeTab === 'behavior_sdq' && canOpenBehaviorSdq && (
            <MobileBehaviorSdqTab
              activeSchool={activeSchool}
              currentUser={currentUser}
              lang={lang}
              students={students}
              behaviorRecords={behaviorRecords}
              sdqAssessments={sdqAssessments}
              onAddBehaviorRecord={onAddBehaviorRecord}
              onAddSdqAssessment={onAddSdqAssessment}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB J: INFIRMARY */}
          {activeTab === 'infirmary' && canOpenInfirmary && (
            <MobileInfirmaryTab
              activeSchool={activeSchool}
              currentUser={currentUser}
              lang={lang}
              students={students}
              visits={infirmaryVisits}
              onAddInfirmaryVisit={onAddInfirmaryVisit}
              onBackHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB K: LMS CLASSROOM */}
          {activeTab === 'lms' && canOpenLms && (
            <MobileLmsTab
              activeSchool={activeSchool}
              currentRole={currentRole}
              lang={lang}
              scopedCourses={scopedCourses}
              lessons={scopedLessons}
              ownStudent={ownStudent}
              currentPersonId={currentPersonId}
              onCompleteLesson={onCompleteLesson}
              onSaveLesson={onSaveLesson}
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
        pendingLeavesCount={pendingLeavesCount}
        onResetCheckinToSelfie={() => {
          setMobileAttendanceInitialSubTab('selfie_mobile');
          setMobileCorrectionPrefill(null);
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
          featureFlags={featureFlags}
          linkedStudents={linkedStudents}
          students={students}
          attendance={attendance}
          periodAttendance={periodAttendance}
          homeworkSubmissions={homeworkSubmissions}
          assignments={assignments}
          behaviorRecords={behaviorRecords}
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
