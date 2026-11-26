import { useEffect, useMemo, useState } from 'react';
import type {
  Announcement,
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  CentralExamPack,
  Course,
  GradeRecord,
  HomeworkSubmission,
  InfirmaryVisit,
  LeaveRequest,
  Lesson,
  PeriodAttendanceRecord,
  PlayerScore,
  PortfolioItem,
  QuizQuestion,
  School,
  SchoolExamEntitlement,
  SchoolFeatureFlags,
  SdqAssessment,
  Student,
  SystemConfig,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
import type { NavTab } from '../../components/layout/Sidebar';
import { belongsToSchool } from '../../lib/schoolDataScope';
import { getUnclaimedPublishedPacks } from '../../lib/centralExamBank';
import { useSchoolPermissions } from '../../lib/schoolPermissions';
import { getSchoolFeatureFlags } from '../../lib/schoolFeatureFlags';
import { getDuplicateIdReports, getDuplicateRecordReports } from '../../lib/duplicateRecords';
import type { DuplicateRecordReport, DuplicateRecordTarget } from '../../lib/duplicateRecords';
import { getAvailableOperationalRoles } from '../../lib/operationalRoles';
import {
  resolveMatchedTeacherForUser,
  isSchoolWideTimetableActivity,
  slotMatchesLoggedInTeacher,
  userMatchesCourse,
} from '../../lib/courseTeacherFilter';
import {
  filterAttendanceForUser,
  filterLeaveRequestsForUser,
  filterPeriodAttendanceForUser,
  resolveLinkedStudentsForUser,
} from '../../lib/attendanceScope';
import {
  filterAnnouncementsForRole,
  filterAssignmentsForPersonalRole,
  filterCoursesForPersonalRole,
  filterTimetableSlotsForPersonalRole,
} from '../../lib/studentDataScope';
import { getScopedNotificationsForUser, getScopedUnreadCountForUser } from '../../lib/pushNotifications';
import { getParentUnreadNotificationCount } from '../../lib/parentNotifications';
import { fetchCoordinationMessages } from '../../lib/coordinationDesk';

export function normalizeTimetableAcademicYear(value?: string): string {
  const raw = (value || '').trim();
  const gregorianYear = raw.match(/\d{4}/)?.[0];
  if (!gregorianYear) return raw;
  const yearNumber = Number(gregorianYear);
  return String(yearNumber < 2400 ? yearNumber + 543 : yearNumber);
}

const normalizeRoomScope = (value: string) =>
  value
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase()
    .replace(/^(?:ห้องเรียน|ห้อง|room|class)\s*/i, '')
    .replace(/\s+/g, '');

export interface UseSchoolScopeParams {
  activeSchool: School;
  systemConfig: SystemConfig;
  currentUser: AuthUser | null;
  currentRole: UserRole;
  authenticatedRole: UserRole | null;
  currentTab: NavTab;
  lang: AppLanguage;
  featureFlagsBySchool: Record<string, SchoolFeatureFlags>;
  centralExamPacks: CentralExamPack[];
  schoolExamEntitlements: SchoolExamEntitlement[];
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  lessons: Lesson[];
  assignments: Assignment[];
  questions: QuizQuestion[];
  periodAttendance: PeriodAttendanceRecord[];
  portfolioItems: PortfolioItem[];
  timetableSlots: TimetableSlot[];
  behaviorRecords: BehaviorRecord[];
  sdqAssessments: SdqAssessment[];
  infirmaryVisits: InfirmaryVisit[];
  homeworkSubmissions: HomeworkSubmission[];
  leaveRequests: LeaveRequest[];
  playerScores: PlayerScore[];
  onCoordinationError?: (message: string) => void;
}

export function useSchoolScope(params: UseSchoolScopeParams) {
  const {
    activeSchool,
    systemConfig,
    currentUser,
    currentRole,
    authenticatedRole,
    currentTab,
    lang,
    featureFlagsBySchool,
    centralExamPacks,
    schoolExamEntitlements,
    students,
    teachers,
    courses,
    grades,
    attendance,
    announcements,
    lessons,
    assignments,
    questions,
    periodAttendance,
    portfolioItems,
    timetableSlots,
    behaviorRecords,
    sdqAssessments,
    infirmaryVisits,
    homeworkSubmissions,
    leaveRequests,
    playerScores,
    onCoordinationError,
  } = params;

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [coordinationUnreadCount, setCoordinationUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!currentUser || !['admin', 'super_admin'].includes(currentRole)) {
      setCoordinationUnreadCount(0);
      return;
    }
    let active = true;
    const scopeId = currentRole === 'super_admin' ? undefined : activeSchool.id;
    fetchCoordinationMessages(scopeId)
      .then((msgs) => {
        if (!active) return;
        const count = currentRole === 'super_admin'
          ? msgs.filter((m) => m.senderRole === 'admin' && !m.readBySuperAdmin).length
          : msgs.filter((m) => m.schoolId === activeSchool.id && m.senderRole === 'super_admin' && !m.readByAdmin).length;
        setCoordinationUnreadCount(count);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCoordinationUnreadCount(0);
        onCoordinationError?.(
          error instanceof Error
            ? `Coordination inbox error: ${error.message}`
            : 'Could not load coordination inbox.'
        );
      });
    return () => {
      active = false;
    };
  }, [currentUser, currentRole, activeSchool.id, currentTab]);

  const unclaimedCentralPacks = getUnclaimedPublishedPacks(centralExamPacks, schoolExamEntitlements);

  // Filter items by active school
  const schoolStudents = students.filter((s) => belongsToSchool(s, activeSchool.id));
  const schoolTeachers = teachers.filter((t) => belongsToSchool(t, activeSchool.id));
  const schoolCourses = courses.filter((c) => belongsToSchool(c, activeSchool.id));
  const schoolGrades = grades.filter((g) => belongsToSchool(g, activeSchool.id));
  const schoolAttendance = attendance.filter((a) => belongsToSchool(a, activeSchool.id));
  const schoolAnnouncements = announcements.filter((a) => belongsToSchool(a, activeSchool.id));
  const schoolLessons = lessons.filter((l) => belongsToSchool(l, activeSchool.id));
  const schoolAssignments = assignments.filter((a) => belongsToSchool(a, activeSchool.id));
  const schoolQuestions = questions.filter((q) => belongsToSchool(q, activeSchool.id));
  const schoolPeriodAttendance = periodAttendance.filter((p) => belongsToSchool(p, activeSchool.id));
  const schoolPortfolioItems = portfolioItems.filter((p) => belongsToSchool(p, activeSchool.id));

  const timetableAcademicYear = normalizeTimetableAcademicYear(activeSchool.academicYear || systemConfig.academicYear);
  const timetableSemester = activeSchool.currentSemester || systemConfig.currentSemester;
  const schoolTimetableSlotsAllTerms = timetableSlots
    .filter((slot) => belongsToSchool(slot, activeSchool.id))
    .map((slot) => ({
      ...slot,
      academicYear: normalizeTimetableAcademicYear(slot.academicYear || timetableAcademicYear),
      semester: slot.semester || timetableSemester,
    }));
  const schoolTimetableSlots = schoolTimetableSlotsAllTerms.filter(
    (slot) => slot.academicYear === timetableAcademicYear && slot.semester === timetableSemester
  );
  const schoolBehaviorRecords = behaviorRecords.filter((b) => belongsToSchool(b, activeSchool.id));
  const schoolSdqAssessments = sdqAssessments.filter((s) => belongsToSchool(s, activeSchool.id));
  const schoolInfirmaryVisits = infirmaryVisits.filter((i) => belongsToSchool(i, activeSchool.id));
  const schoolHomeworkSubmissions = homeworkSubmissions.filter((h) => belongsToSchool(h, activeSchool.id));
  const schoolLeaveRequests = leaveRequests.filter((request) => belongsToSchool(request, activeSchool.id));

  const schoolPermissions = useSchoolPermissions(activeSchool.id);

  const matchedTeacherForScope = currentRole === 'teacher'
    ? resolveMatchedTeacherForUser(currentUser, schoolTeachers)
    : undefined;
  const teacherScopedCourses = currentRole === 'teacher'
    ? schoolCourses.filter((course) => userMatchesCourse(currentUser, matchedTeacherForScope, course))
    : schoolCourses;
  const teacherCourseIds = new Set(teacherScopedCourses.map((course) => course.id));
  const teacherStudentKeys = new Set<string>();
  teacherScopedCourses.forEach((course) => {
    (course.enrolledStudentIds || []).forEach((id) => teacherStudentKeys.add(id));
  });
  const teacherScopedTimetableSlots = currentRole === 'teacher'
    ? schoolTimetableSlotsAllTerms.filter((slot) =>
        slotMatchesLoggedInTeacher(slot, currentUser, matchedTeacherForScope, schoolCourses)
      )
    : schoolTimetableSlotsAllTerms;

  const teacherRoomKeys = new Set<string>(
    [
      ...(matchedTeacherForScope?.homeroomClasses || []),
      ...teacherScopedTimetableSlots
        .filter((slot) => !isSchoolWideTimetableActivity(slot))
        .map((slot) => slot.classRoom)
        .filter(Boolean),
    ]
      .map(normalizeRoomScope)
      .filter(Boolean)
  );
  const teacherScopedStudents = currentRole === 'teacher'
    ? schoolStudents.filter((student) => {
        if (teacherStudentKeys.has(student.id) || teacherStudentKeys.has(student.studentIdNumber)) return true;
        const rooms = [student.room, ...(student.enrolledRooms || [])].filter(Boolean);
        const gradeShort = student.gradeLevel.match(/(?:อ|ป|ม)\.?\s*\d{1,2}/i)?.[0] || '';
        const candidates = rooms.flatMap((room) => [room, gradeShort ? `${gradeShort}/${room}` : '']);
        return candidates.some((room) => teacherRoomKeys.has(normalizeRoomScope(room)));
      })
    : schoolStudents;
  const teacherStudentIds = new Set<string>();
  teacherScopedStudents.forEach((student) => {
    teacherStudentIds.add(student.id);
    teacherStudentIds.add(student.studentIdNumber);
  });

  const isRestrictedViewer = currentRole === 'student' || currentRole === 'parent';
  const linkedStudentsForUser = useMemo(
    () => (isRestrictedViewer ? resolveLinkedStudentsForUser(currentUser, schoolStudents) : schoolStudents),
    [currentUser, isRestrictedViewer, schoolStudents]
  );
  const ownStudentIds = useMemo(() => {
    const ids = new Set<string>();
    linkedStudentsForUser.forEach((stu) => {
      ids.add(stu.id);
      if (stu.studentIdNumber) ids.add(stu.studentIdNumber);
    });
    if (currentRole === 'student' && currentUser) {
      ids.add(currentUser.id);
      if (currentUser.studentRecordId) ids.add(currentUser.studentRecordId);
      if (currentUser.studentIdNumber) ids.add(currentUser.studentIdNumber);
    }
    return Array.from(ids);
  }, [currentRole, currentUser, linkedStudentsForUser]);

  const viewAnnouncements = useMemo(
    () => filterAnnouncementsForRole(schoolAnnouncements, currentUser),
    [schoolAnnouncements, currentUser]
  );

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotifCount(0);
      return;
    }
    const resolvedSchoolId = activeSchool.id || currentUser.schoolId;
    if (currentUser.role === 'parent') {
      let active = true;
      let refreshing = false;
      const updateUnread = async () => {
        if (!active || document.visibilityState === 'hidden' || refreshing) return;
        refreshing = true;
        try {
          const count = await getParentUnreadNotificationCount();
          const extraUnread = getScopedNotificationsForUser({
            currentUser,
            schoolId: resolvedSchoolId,
            ownStudentIds,
            announcements: viewAnnouncements,
            lang,
          }).filter((n) => (n.sourceKind === 'announcement' || n.sourceKind === 'holiday') && !n.read).length;
          if (active) setUnreadNotifCount(count + extraUnread);
        } catch (error) {
          console.error('Could not refresh private child notification count:', error);
        } finally {
          refreshing = false;
        }
      };
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') void updateUnread();
      };
      void updateUnread();
      window.addEventListener('eduverse:notification', updateUnread);
      window.addEventListener('eduverse:holidays-updated', updateUnread);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('focus', onVisibilityChange);
      const interval = window.setInterval(updateUnread, 180_000);
      return () => {
        active = false;
        window.clearInterval(interval);
        window.removeEventListener('eduverse:notification', updateUnread);
        window.removeEventListener('eduverse:holidays-updated', updateUnread);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('focus', onVisibilityChange);
      };
    }

    const updateUnread = () => {
      setUnreadNotifCount(
        getScopedUnreadCountForUser({
          currentUser,
          schoolId: resolvedSchoolId,
          ownStudentIds,
          announcements: viewAnnouncements,
          lang,
        })
      );
    };
    updateUnread();
    window.addEventListener('eduverse:notification', updateUnread);
    window.addEventListener('eduverse:holidays-updated', updateUnread);
    return () => {
      window.removeEventListener('eduverse:notification', updateUnread);
      window.removeEventListener('eduverse:holidays-updated', updateUnread);
    };
  }, [currentUser, activeSchool.id, ownStudentIds, viewAnnouncements, lang]);

  const activeFeatureFlags = activeSchool.id
    ? (featureFlagsBySchool[activeSchool.id] || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise'))
    : undefined;

  const duplicateReportMap = new Map<DuplicateRecordTarget, DuplicateRecordReport>();
  [
    ...getDuplicateIdReports({
      students: schoolStudents,
      teachers: schoolTeachers,
      courses: schoolCourses,
      grades: schoolGrades,
      attendance: schoolAttendance,
      announcements: schoolAnnouncements,
      lessons: schoolLessons,
      assignments: schoolAssignments,
      questions: schoolQuestions,
      periodAttendance: schoolPeriodAttendance,
      portfolioItems: schoolPortfolioItems,
      timetableSlots: schoolTimetableSlots,
      behaviorRecords: schoolBehaviorRecords,
      sdqAssessments: schoolSdqAssessments,
      infirmaryVisits: schoolInfirmaryVisits,
      homeworkSubmissions: schoolHomeworkSubmissions,
    }),
    ...getDuplicateRecordReports({
      students: schoolStudents,
      teachers: schoolTeachers,
      courses: schoolCourses,
      grades: schoolGrades,
      timetableSlots: schoolTimetableSlots,
      attendance: schoolAttendance,
      periodAttendance: schoolPeriodAttendance,
      announcements: schoolAnnouncements,
      behaviorRecords: schoolBehaviorRecords,
      sdqAssessments: schoolSdqAssessments,
      infirmaryVisits: schoolInfirmaryVisits,
      homeworkSubmissions: schoolHomeworkSubmissions,
      leaveRequests: schoolLeaveRequests,
    }),
  ].forEach((report) => {
    const existing = duplicateReportMap.get(report.target);
    if (existing) existing.checks.push(...report.checks);
    else duplicateReportMap.set(report.target, { ...report, checks: [...report.checks] });
  });
  const duplicateReports = [...duplicateReportMap.values()];
  const duplicateRecordGroupCount = duplicateReports.reduce(
    (total, report) => total + report.checks.reduce((count, check) => count + check.groups.length, 0),
    0
  );

  // Strict Student & Parent Personal Scoping Boundary
  const scopedStudentIdSet = new Set<string>(ownStudentIds);
  const viewStudents = isRestrictedViewer
    ? linkedStudentsForUser
    : currentRole === 'teacher' ? teacherScopedStudents : schoolStudents;
  const viewTeachers = isRestrictedViewer
    ? []
    : currentRole === 'teacher' ? (matchedTeacherForScope ? [matchedTeacherForScope] : []) : schoolTeachers;
  const viewCourses = currentRole === 'teacher'
    ? teacherScopedCourses
    : filterCoursesForPersonalRole(schoolCourses, currentUser, schoolStudents);
  const viewAssignments = currentRole === 'teacher'
    ? schoolAssignments.filter((assignment) => teacherCourseIds.has(assignment.courseId))
    : filterAssignmentsForPersonalRole(schoolAssignments, viewCourses, currentUser);
  const viewLessons = isRestrictedViewer
    ? schoolLessons.filter((lesson) => viewCourses.some((course) => course.id === lesson.courseId))
    : currentRole === 'teacher'
      ? schoolLessons.filter((lesson) => teacherCourseIds.has(lesson.courseId))
      : schoolLessons;
  const viewTimetableSlots = currentRole === 'teacher'
    ? teacherScopedTimetableSlots.filter((slot) => slot.academicYear === timetableAcademicYear && slot.semester === timetableSemester)
    : filterTimetableSlotsForPersonalRole(schoolTimetableSlots, currentUser, schoolStudents, schoolCourses);
  const viewTimetableSlotsAllTerms = currentRole === 'teacher'
    ? teacherScopedTimetableSlots
    : filterTimetableSlotsForPersonalRole(schoolTimetableSlotsAllTerms, currentUser, schoolStudents, schoolCourses);

  const hasLinkedTeacherProfile = Boolean(
    currentUser?.teacherRecordId &&
    schoolTeachers.some((teacher) => teacher.id === currentUser.teacherRecordId)
  );
  const availableOperationalRoles = getAvailableOperationalRoles({
    accountRole: authenticatedRole,
    isSchoolAdminTeacher: Boolean(currentUser?.isSchoolAdmin),
    hasTeacherProfile: hasLinkedTeacherProfile,
  });
  const canUseAdminMode = availableOperationalRoles.includes('admin');
  const canUseTeacherMode = availableOperationalRoles.includes('teacher');
  const canSwitchAdminTeacherMode =
    (currentRole === 'admin' && canUseTeacherMode) ||
    (currentRole === 'teacher' && canUseAdminMode);

  const viewAttendance = isRestrictedViewer
    ? filterAttendanceForUser(schoolAttendance, currentUser, schoolStudents)
    : currentRole === 'teacher'
      ? schoolAttendance.filter((record) => teacherStudentIds.has(record.studentId))
      : schoolAttendance;
  const viewPeriodAttendance = isRestrictedViewer
    ? filterPeriodAttendanceForUser(schoolPeriodAttendance, currentUser, schoolStudents)
    : currentRole === 'teacher'
      ? schoolPeriodAttendance.filter((record) => teacherStudentIds.has(record.studentId) && teacherCourseIds.has(record.courseId))
      : schoolPeriodAttendance;
  const viewLeaveRequests = isRestrictedViewer
    ? filterLeaveRequestsForUser(schoolLeaveRequests, currentUser, schoolStudents)
    : currentRole === 'teacher'
      ? schoolLeaveRequests.filter((request) => request.userRole === 'teacher' && request.userId === currentUser?.id)
      : schoolLeaveRequests;
  const viewGrades = isRestrictedViewer
    ? schoolGrades.filter((g) => scopedStudentIdSet.has(g.studentId))
    : currentRole === 'teacher'
      ? schoolGrades.filter((grade) => teacherStudentIds.has(grade.studentId) && teacherCourseIds.has(grade.courseId))
      : schoolGrades;
  const viewHomeworkSubmissions = isRestrictedViewer
    ? schoolHomeworkSubmissions.filter((sub) => scopedStudentIdSet.has(sub.studentId))
    : currentRole === 'teacher'
      ? schoolHomeworkSubmissions.filter((sub) =>
          teacherStudentIds.has(sub.studentId) &&
          viewAssignments.some((assignment) => assignment.id === sub.assignmentId)
        )
      : schoolHomeworkSubmissions;
  const viewInfirmaryVisits = isRestrictedViewer
    ? schoolInfirmaryVisits.filter((v) => scopedStudentIdSet.has(v.studentId))
    : currentRole === 'teacher'
      ? schoolInfirmaryVisits.filter((visit) => teacherStudentIds.has(visit.studentId))
      : schoolInfirmaryVisits;
  const viewBehaviorRecords = isRestrictedViewer
    ? schoolBehaviorRecords.filter((b) => scopedStudentIdSet.has(b.studentId))
    : currentRole === 'teacher'
      ? schoolBehaviorRecords.filter((record) => teacherStudentIds.has(record.studentId))
      : schoolBehaviorRecords;
  const viewSdqAssessments = isRestrictedViewer
    ? schoolSdqAssessments.filter((s) => scopedStudentIdSet.has(s.studentId))
    : currentRole === 'teacher'
      ? schoolSdqAssessments.filter((assessment) => teacherStudentIds.has(assessment.studentId))
      : schoolSdqAssessments;
  const viewPortfolioItems = isRestrictedViewer
    ? schoolPortfolioItems.filter((p) => p.ownerId === currentUser?.id || scopedStudentIdSet.has(p.ownerId))
    : currentRole === 'teacher'
      ? schoolPortfolioItems.filter((item) =>
          item.ownerId === currentUser?.id ||
          item.ownerId === currentUser?.teacherRecordId ||
          teacherStudentIds.has(item.ownerId)
        )
      : schoolPortfolioItems;
  const viewPlayerScores = isRestrictedViewer
    ? playerScores.filter((score) =>
        score.userId === currentUser?.id ||
        ownStudentIds.includes(score.userId) ||
        Boolean(score.studentId && ownStudentIds.includes(score.studentId))
      )
    : currentRole === 'teacher'
      ? playerScores.filter((score) =>
          score.userId === currentUser?.id ||
          teacherStudentIds.has(score.userId) ||
          Boolean(score.studentId && teacherStudentIds.has(score.studentId))
        )
      : playerScores;
  const ownPortfolioItems = viewPortfolioItems.filter(
    (item) => item.ownerId === currentUser?.id || item.ownerId === currentUser?.teacherRecordId
  );
  const canEditGradesInSchool =
    ['super_admin', 'admin'].includes(currentRole) ||
    (currentRole === 'teacher' && schoolPermissions.teacher_grade_entry !== false);

  return {
    unreadNotifCount,
    setUnreadNotifCount,
    coordinationUnreadCount,
    setCoordinationUnreadCount,
    unclaimedCentralPacks,
    schoolStudents,
    schoolTeachers,
    schoolCourses,
    schoolGrades,
    schoolAttendance,
    schoolAnnouncements,
    schoolLessons,
    schoolAssignments,
    schoolQuestions,
    schoolPeriodAttendance,
    schoolPortfolioItems,
    timetableAcademicYear,
    timetableSemester,
    schoolTimetableSlotsAllTerms,
    schoolTimetableSlots,
    schoolBehaviorRecords,
    schoolSdqAssessments,
    schoolInfirmaryVisits,
    schoolHomeworkSubmissions,
    schoolLeaveRequests,
    schoolPermissions,
    activeFeatureFlags,
    duplicateReports,
    duplicateRecordGroupCount,
    ownStudentIds,
    viewAnnouncements,
    viewStudents,
    viewTeachers,
    viewCourses,
    viewAssignments,
    viewLessons,
    viewTimetableSlots,
    viewTimetableSlotsAllTerms,
    canUseAdminMode,
    canUseTeacherMode,
    canSwitchAdminTeacherMode,
    viewAttendance,
    viewPeriodAttendance,
    viewLeaveRequests,
    viewGrades,
    viewHomeworkSubmissions,
    viewInfirmaryVisits,
    viewBehaviorRecords,
    viewSdqAssessments,
    viewPortfolioItems,
    viewPlayerScores,
    ownPortfolioItems,
    canEditGradesInSchool,
  };
}
