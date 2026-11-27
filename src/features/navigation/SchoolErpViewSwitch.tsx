import React, { Suspense } from 'react';
import { Lock } from 'lucide-react';
import type { NavTab } from '../../components/layout/Sidebar';
import type { DashboardSubTab } from '../../views/DashboardView';
import type { StudentsMoeJumpTarget, StudentsViewSubTab } from '../../views/StudentsView';
import type { SystemSettingsTab } from '../../views/SystemSettingsView';
import type { DeepLinkParams } from './useDeepLinkParams';
import type { GradebookJumpTarget, SuperAdminSubTab, TimetableCheckinTarget } from './useTabNavigation';
import type {
  AdaptivePracticeTopic,
  Announcement,
  AppLanguage,
  AppProgramMode,
  Assignment,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  BehaviorRecord,
  CampusGateGeofence,
  CentralExamPack,
  Course,
  GradeRecord,
  GradingSystem,
  HomeworkSubmission,
  InfirmaryVisit,
  LeaveRequest,
  LeaveStatus,
  Lesson,
  PeriodAttendanceRecord,
  PlayerScore,
  PortfolioItem,
  PromotionCampaign,
  QuizQuestion,
  RewardItem,
  RewardRedemptionRequest,
  RolePermissionConfig,
  School,
  SchoolExamEntitlement,
  SchoolFeatureFlags,
  SchoolPeriodTime,
  SchoolSubscriptionPlan,
  SdqAssessment,
  Student,
  SystemConfig,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
import type { SchoolPermissionsState } from '../../lib/schoolPermissions';
import { getPackageLevelLabel, isProgramModeEnabledByFeatureFlags, isTabEnabledByFeatureFlags } from '../../lib/schoolFeatureFlags';
import { saveSuperAdminSetting, saveSuperAdminSettings } from '../../lib/superAdminSettings';
import { appendAuditLog } from '../../lib/auditLog';
import { ViewErrorBoundary } from '../../components/common/ViewErrorBoundary';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { lazyNamedWithRetry as lazyNamed } from '../../lib/lazyWithRetry';

const DashboardView = lazyNamed(() => import('../../views/DashboardView'), 'DashboardView');
const StudentsView = lazyNamed(() => import('../../views/StudentsView'), 'StudentsView');
const TeachersView = lazyNamed(() => import('../../views/TeachersView'), 'TeachersView');
const CoursesView = lazyNamed(() => import('../../views/CoursesView'), 'CoursesView');
const AttendanceView = lazyNamed(() => import('../../views/AttendanceView'), 'AttendanceView');
const MobileAttendanceView = lazyNamed(() => import('../../views/MobileAttendanceView'), 'MobileAttendanceView');
const EduBattleGameView = lazyNamed(() => import('../../views/EduBattleGameView'), 'EduBattleGameView');
const PortfolioView = lazyNamed(() => import('../../views/PortfolioView'), 'PortfolioView');
const GradebookView = lazyNamed(() => import('../../views/GradebookView'), 'GradebookView');
const StudentQualityDevelopmentBookView = lazyNamed(() => import('../../views/StudentQualityDevelopmentBookView'), 'StudentQualityDevelopmentBookView');
const GradeLevelQualitativeSummaryView = lazyNamed(() => import('../../components/GradeLevelQualitativeSummaryView'), 'GradeLevelQualitativeSummaryView');
const AnnouncementsView = lazyNamed(() => import('../../views/AnnouncementsView'), 'AnnouncementsView');
const LmsClassroomView = lazyNamed(() => import('../../views/LmsClassroomView'), 'LmsClassroomView');
const ParentPortalView = lazyNamed(() => import('../../views/ParentPortalView'), 'ParentPortalView');
const TimetableScheduleView = lazyNamed(() => import('../../views/TimetableScheduleView'), 'TimetableScheduleView');
const BehaviorSdqView = lazyNamed(() => import('../../views/BehaviorSdqView'), 'BehaviorSdqView');
const DigitalIdCardView = lazyNamed(() => import('../../views/DigitalIdCardView'), 'DigitalIdCardView');
const InfirmaryHealthView = lazyNamed(() => import('../../views/InfirmaryHealthView'), 'InfirmaryHealthView');
const HomeworkTrackerView = lazyNamed(() => import('../../views/HomeworkTrackerView'), 'HomeworkTrackerView');
const SuperAdminConsoleView = lazyNamed(() => import('../../views/SuperAdminConsoleView'), 'SuperAdminConsoleView');
const SubjectLabSimulationView = lazyNamed(() => import('../../views/SubjectLabSimulationView'), 'SubjectLabSimulationView');
const SystemSettingsView = lazyNamed(() => import('../../views/SystemSettingsView'), 'SystemSettingsView');
const AiDiagnosticLearningView = lazyNamed(() => import('../../views/AiDiagnosticLearningView'), 'AiDiagnosticLearningView');
const HallOfFame3DView = lazyNamed(() => import('../../views/HallOfFame3DView'), 'HallOfFame3DView');
const StudyStreakQuestPassView = lazyNamed(() => import('../../views/StudyStreakQuestPassView'), 'StudyStreakQuestPassView');
const SchoolFarmGameView = lazyNamed(() => import('../../views/SchoolFarmGameView'), 'SchoolFarmGameView');
const CoopBossRaidView = lazyNamed(() => import('../../views/CoopBossRaidView'), 'CoopBossRaidView');
const SocraticTutorView = lazyNamed(() => import('../../views/SocraticTutorView'), 'SocraticTutorView');
const RealWorldSnapQuestView = lazyNamed(() => import('../../views/RealWorldSnapQuestView'), 'RealWorldSnapQuestView');
const AdminSuperAdminDeskView = lazyNamed(() => import('../../views/AdminSuperAdminDeskView'), 'AdminSuperAdminDeskView');
const CentralExamHubView = lazyNamed(() => import('../../views/CentralExamHubView'), 'CentralExamHubView');
const CareerQuestView = lazyNamed(() => import('../../views/CareerQuestView'), 'CareerQuestView');

export interface SchoolErpViewSwitchProps {
  programMode: AppProgramMode;
  setProgramMode: (mode: AppProgramMode) => void;
  handleChangeProgramMode: (mode: AppProgramMode) => void;
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  navigateToAppTab: (tab: NavTab) => void;
  currentRole: UserRole;
  isSuperAdminSchoolView: boolean;
  currentUser: AuthUser;
  activeSchool: School;
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<School[]>>;
  shouldShowMobileView: boolean;
  lang: AppLanguage;
  systemConfig: SystemConfig;
  setSystemConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  activeFeatureFlags?: SchoolFeatureFlags;
  schoolPermissions: SchoolPermissionsState;
  hasGlobalRolePermission: (perm: keyof RolePermissionConfig['permissions']) => boolean;
  canEditGradesInSchool: boolean;
  deepLinkParams: DeepLinkParams | null;
  // Data slices
  viewStudents: Student[];
  viewTeachers: Teacher[];
  viewCourses: Course[];
  viewGrades: GradeRecord[];
  viewAttendance: AttendanceRecord[];
  schoolAttendance: AttendanceRecord[];
  schoolAnnouncements: Announcement[];
  viewAnnouncements: Announcement[];
  viewLessons: Lesson[];
  viewAssignments: Assignment[];
  schoolQuestions: QuizQuestion[];
  viewPlayerScores: PlayerScore[];
  rewardItems: RewardItem[];
  rewardRedemptions: RewardRedemptionRequest[];
  viewPeriodAttendance: PeriodAttendanceRecord[];
  viewPortfolioItems: PortfolioItem[];
  viewTimetableSlots: TimetableSlot[];
  viewTimetableSlotsAllTerms: TimetableSlot[];
  schoolTimetableSlots: TimetableSlot[];
  schoolTimetableSlotsAllTerms?: TimetableSlot[];
  schoolStudents?: Student[];
  schoolTeachers?: Teacher[];
  schoolCourses?: Course[];
  timetableAcademicYear: string;
  timetableSemester: string;
  schoolPeriods: SchoolPeriodTime[];
  viewBehaviorRecords: BehaviorRecord[];
  viewSdqAssessments: SdqAssessment[];
  viewInfirmaryVisits: InfirmaryVisit[];
  viewHomeworkSubmissions: HomeworkSubmission[];
  viewLeaveRequests: LeaveRequest[];
  campusGates: CampusGateGeofence[];
  centralExamPacks: CentralExamPack[];
  schoolExamEntitlements: SchoolExamEntitlement[];
  unclaimedCentralPacksCount: number;
  // Super Admin state
  rolePermissions: RolePermissionConfig[];
  setRolePermissions: React.Dispatch<React.SetStateAction<RolePermissionConfig[]>>;
  promotions: PromotionCampaign[];
  setPromotions: React.Dispatch<React.SetStateAction<PromotionCampaign[]>>;
  subscriptionPlans: SchoolSubscriptionPlan[];
  setSubscriptionPlans: React.Dispatch<React.SetStateAction<SchoolSubscriptionPlan[]>>;
  superAdminConfigError: string | null;
  setSuperAdminConfigError: React.Dispatch<React.SetStateAction<string | null>>;
  coordinationUnreadCount: number;
  setCoordinationUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  // Sub-tab / jump targets
  dashboardInitialSubTab: DashboardSubTab;
  systemSettingsInitialTab: SystemSettingsTab;
  setSystemSettingsInitialTab: React.Dispatch<React.SetStateAction<SystemSettingsTab>>;
  superAdminSubTab: SuperAdminSubTab;
  onSuperAdminSubTabChange?: (subTab: SuperAdminSubTab) => void;
  studentsSubTab: StudentsViewSubTab;
  setStudentsSubTab: React.Dispatch<React.SetStateAction<StudentsViewSubTab>>;
  studentsTargetStudentId?: string;
  setStudentsTargetStudentId: React.Dispatch<React.SetStateAction<string | undefined>>;
  studentsMoeJumpTarget: StudentsMoeJumpTarget | null;
  setStudentsMoeJumpTarget: React.Dispatch<React.SetStateAction<StudentsMoeJumpTarget | null>>;
  devBookTargetStudentId?: string;
  setDevBookTargetStudentId: React.Dispatch<React.SetStateAction<string | undefined>>;
  gradebookJumpTarget: GradebookJumpTarget | null;
  setGradebookJumpTarget: React.Dispatch<React.SetStateAction<GradebookJumpTarget | null>>;
  eduBattleInitialSubTab?: 'battle_royale_3d' | 'bank';
  setEduBattleInitialSubTab: React.Dispatch<React.SetStateAction<'battle_royale_3d' | 'bank' | undefined>>;
  lmsLessonJumpTarget: { courseId: string; lessonId: string } | null;
  setLmsLessonJumpTarget: React.Dispatch<React.SetStateAction<{ courseId: string; lessonId: string } | null>>;
  adaptivePracticeTopic: AdaptivePracticeTopic | null;
  setAdaptivePracticeTopic: React.Dispatch<React.SetStateAction<AdaptivePracticeTopic | null>>;
  timetableCheckinTarget: TimetableCheckinTarget | null;
  setTimetableCheckinTarget: React.Dispatch<React.SetStateAction<TimetableCheckinTarget | null>>;
  setIsGamePlaying: React.Dispatch<React.SetStateAction<boolean>>;
  focusMode: boolean;
  setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  adminSimplifiedView: boolean;
  setAdminSimplifiedView: React.Dispatch<React.SetStateAction<boolean>>;
  // Modals / Popups
  onSelectStudentForProfile: (student: Student | null) => void;
  onSelectStudentForReport: (student: Student | null) => void;
  onOpenProfileModal: () => void;
  onOpenBackupCenter: () => void;
  onOpenImportExport: (tab: string) => void;
  onOpenCentralExamPopup: () => void;
  onOpenExamPaymentSettings: () => void;
  // Handlers
  onLoadAttendanceRange: (startDate?: string | null, endDate?: string | null, studentId?: string) => Promise<void>;
  onViewSchool: (school: School) => void;
  onToggleSchoolStatus: (schoolId: string, nextStatus: School['status']) => Promise<void>;
  onUpdateSchoolFeatureFlags: (schoolId: string, flags: SchoolFeatureFlags) => void;
  onCleanupDueSelfies?: (options?: { silent?: boolean; retentionMinutes?: number }) => Promise<{
    deletedPhotosCount: number;
    clearedRecordsCount: number;
    matchedByCheckoutCount: number;
    matchedPreviousDaysCount: number;
  }>;
  onUpdateCampusGates: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates: (lat: number, lng: number, radiusMeters: number) => void;
  onUpdateSchool: (updates: Partial<School>) => Promise<void>;
  onUpdateAcademicPeriod: (academicYear: string, currentSemester: string, semesterOptions?: string[]) => Promise<void>;
  onApplyAcademicRollover: (payload: {
    academicYear: string;
    currentSemester: string;
    newCourses: Course[];
    newTimetableSlots: TimetableSlot[];
    promotedStudents?: Student[];
  }) => Promise<void>;
  onCopyCoursesToSchool: (newCourses: Course[]) => void;
  onQuickCheckIn: (studentId: string) => void;
  onRecordMilestoneActivity: (userId: string, kind: 'library_visit' | 'attendance', studentId?: string) => void;
  onAddStudent: (s: Student) => void;
  onAddStudents: (list: Student[]) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onPurgeSampleStudents: () => Promise<void>;
  onBatchUpdateStudents: (updatedList: Student[]) => void;
  onUpdateGrade: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade: (newGrade: GradeRecord, options?: { notify?: boolean }) => void;
  onDeleteGrade: (gradeId: string) => Promise<void>;
  onNotifyGradeChange: (grade: GradeRecord, isNewRecord?: boolean) => Promise<any>;
  onAddBehaviorRecord: (record: BehaviorRecord) => void;
  onAddSdqAssessment: (sdq: SdqAssessment) => void;
  onAddInfirmaryVisit: (visit: InfirmaryVisit) => void;
  onAddTeacher: (t: Teacher) => void;
  onUpdateTeacher: (t: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onPurgeSampleTeachers: () => void;
  onAddCourse: (c: Course) => void;
  onUpdateCourse: (c: Course) => void;
  onDeleteCourse: (courseId: string) => Promise<boolean>;
  onDeleteCourses: (courseIds: string[]) => Promise<boolean>;
  onEnrollStudent: (courseId: string, studentId: string) => void;
  onEnrollStudentsBatch: (courseId: string, studentIds: string[]) => void;
  onUnenrollStudent: (courseId: string, studentId: string) => Promise<void>;
  onUnenrollStudentsBatch: (courseId: string, studentIds: string[]) => Promise<void>;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (qs: QuizQuestion[]) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (rewardId: string, costGems: number) => Promise<void>;
  onEquipCosmetic: (payload: { frameId?: string; title?: string }) => void;
  onReviewRedemption: (requestId: string, status: 'approved' | 'rejected', teacherNote?: string) => void;
  onCreateCustomReward: (item: RewardItem) => void;
  onClaimFreeCentralPack: (pack: CentralExamPack) => Promise<void>;
  onPurchaseCentralPack: (pack: CentralExamPack, method: 'promptpay' | 'invoice', slipUrl?: string) => Promise<void>;
  onSyncQuizScoresToGradebook: (courseId: string, packTitle: string, entries: { studentId: string; quizScore: number }[]) => void;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onDeletePortfolioItem: (itemId: string) => void;
  onAddTimetableSlot: (slot: TimetableSlot) => Promise<void>;
  onUpdateTimetableSlot: (slot: TimetableSlot) => Promise<void>;
  onDeleteTimetableSlot: (slotId: string) => Promise<void>;
  onImportTimetableSlots: (slots: TimetableSlot[]) => Promise<void>;
  onSaveSchoolPeriods: (periods: SchoolPeriodTime[]) => Promise<void>;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddHomeworkAssignment: (assignment: Assignment) => Promise<void>;
  onAddHomeworkSubmission: (sub: HomeworkSubmission) => Promise<void>;
  onGradeHomeworkSubmission: (id: string, score: number, feedback: string) => Promise<void>;
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
  onBulkImportAttendance: (records: AttendanceRecord[]) => void;
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveStatus: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onUpdateOwnAvatar: (avatarUrl: string) => void;
  onAddAnnouncement: (newAnn: Announcement) => void;
  onCompleteLesson: (lessonId: string) => Promise<void>;
  onSaveLesson: (lesson: Lesson) => Promise<void>;
  onSubmitAssignment: (assignmentId: string) => Promise<void>;
}

export const SchoolErpViewSwitch: React.FC<SchoolErpViewSwitchProps> = (props) => {
  const {
    programMode,
    setProgramMode,
    handleChangeProgramMode,
    currentTab,
    setCurrentTab,
    navigateToAppTab,
    currentRole,
    isSuperAdminSchoolView,
    currentUser,
    activeSchool,
    schools,
    setSchools,
    shouldShowMobileView,
    lang,
    systemConfig,
    setSystemConfig,
    activeFeatureFlags,
    schoolPermissions,
    hasGlobalRolePermission,
    canEditGradesInSchool,
    deepLinkParams,
    viewStudents,
    viewTeachers,
    viewCourses,
    viewGrades,
    viewAttendance,
    schoolAttendance,
    schoolAnnouncements,
    viewAnnouncements,
    viewLessons,
    viewAssignments,
    schoolQuestions,
    viewPlayerScores,
    rewardItems,
    rewardRedemptions,
    viewPeriodAttendance,
    viewPortfolioItems,
    viewTimetableSlots,
    viewTimetableSlotsAllTerms,
    schoolTimetableSlots,
    timetableAcademicYear,
    timetableSemester,
    schoolPeriods,
    viewBehaviorRecords,
    viewSdqAssessments,
    viewInfirmaryVisits,
    viewHomeworkSubmissions,
    viewLeaveRequests,
    campusGates,
    centralExamPacks,
    schoolExamEntitlements,
    unclaimedCentralPacksCount,
    rolePermissions,
    setRolePermissions,
    promotions,
    setPromotions,
    subscriptionPlans,
    setSubscriptionPlans,
    superAdminConfigError,
    setSuperAdminConfigError,
    coordinationUnreadCount,
    setCoordinationUnreadCount,
    dashboardInitialSubTab,
    systemSettingsInitialTab,
    setSystemSettingsInitialTab,
    superAdminSubTab,
    onSuperAdminSubTabChange,
    studentsSubTab,
    setStudentsSubTab,
    studentsTargetStudentId,
    setStudentsTargetStudentId,
    studentsMoeJumpTarget,
    setStudentsMoeJumpTarget,
    devBookTargetStudentId,
    setDevBookTargetStudentId,
    gradebookJumpTarget,
    setGradebookJumpTarget,
    eduBattleInitialSubTab,
    setEduBattleInitialSubTab,
    lmsLessonJumpTarget,
    setLmsLessonJumpTarget,
    adaptivePracticeTopic,
    setAdaptivePracticeTopic,
    timetableCheckinTarget,
    setTimetableCheckinTarget,
    setIsGamePlaying,
    focusMode,
    setFocusMode,
    adminSimplifiedView,
    setAdminSimplifiedView,
  } = props;

  const isDeveloperPlatformMode = currentRole === 'super_admin' && !isSuperAdminSchoolView;

  return (
    <ViewErrorBoundary
      resetKey={`${programMode}:${currentTab}:${activeSchool.id}`}
      lang={lang}
      viewName={`${programMode}:${currentTab}`}
      onBackHome={() => {
        setProgramMode('school_erp');
        navigateToAppTab(isDeveloperPlatformMode ? 'super_admin_console' : 'dashboard');
      }}
    >
      <Suspense fallback={<PageSkeleton />}>
        <div key={`${programMode}:${currentTab}`} className="view-stage flex-1 min-h-0 flex flex-col">
          {/* Developer / Platform Owner Mode (when super_admin is not inspecting a specific school) */}
          {isDeveloperPlatformMode && (
            currentTab === 'admin_superadmin_desk' ? (
              <AdminSuperAdminDeskView
                currentUser={currentUser}
                activeSchool={activeSchool}
                schools={schools}
                currentRole={currentRole}
                lang={lang}
                onUnreadCountChange={setCoordinationUnreadCount}
              />
            ) : (
              <SuperAdminConsoleView
                schools={schools}
                onUpdateSchools={setSchools}
                rolePermissions={rolePermissions}
                onUpdateRolePermissions={async (next) => {
                  await saveSuperAdminSetting('role_permissions', next);
                  setRolePermissions(next);
                  setSuperAdminConfigError(null);
                }}
                promotions={promotions}
                onUpdatePromotions={async (next) => {
                  await saveSuperAdminSetting('promotions', next);
                  setPromotions(next);
                  setSuperAdminConfigError(null);
                }}
                subscriptionPlans={subscriptionPlans}
                configError={superAdminConfigError}
                onSavePromoAssignment={async (nextPromotions, nextPlans) => {
                  await saveSuperAdminSettings({
                    promotions: nextPromotions,
                    subscription_plans: nextPlans,
                  });
                  setPromotions(nextPromotions);
                  setSubscriptionPlans(nextPlans);
                  setSuperAdminConfigError(null);
                }}
                lang={lang}
                onViewSchool={props.onViewSchool}
                onToggleSchoolStatus={props.onToggleSchoolStatus}
                coordinationUnreadCount={coordinationUnreadCount}
                onOpenCoordinationDesk={() => navigateToAppTab('admin_superadmin_desk')}
                onOpenBackupCenter={props.onOpenBackupCenter}
                initialSubTab={superAdminSubTab}
                onSubTabChange={onSuperAdminSubTabChange}
                onUpdateSchoolFeatureFlags={props.onUpdateSchoolFeatureFlags}
              />
            )
          )}

          {/* Mode 1: School ERP / SIS */}
          {!isDeveloperPlatformMode && programMode === 'school_erp' && (
            <>
              {currentTab === 'super_admin_console' && currentRole === 'super_admin' && (
                <SuperAdminConsoleView
                  schools={schools}
                  onUpdateSchools={setSchools}
                  rolePermissions={rolePermissions}
                  onUpdateRolePermissions={async (next) => {
                    await saveSuperAdminSetting('role_permissions', next);
                    setRolePermissions(next);
                    setSuperAdminConfigError(null);
                  }}
                  promotions={promotions}
                  onUpdatePromotions={async (next) => {
                    await saveSuperAdminSetting('promotions', next);
                    setPromotions(next);
                    setSuperAdminConfigError(null);
                  }}
                  subscriptionPlans={subscriptionPlans}
                  configError={superAdminConfigError}
                  onSavePromoAssignment={async (nextPromotions, nextPlans) => {
                    await saveSuperAdminSettings({
                      promotions: nextPromotions,
                      subscription_plans: nextPlans,
                    });
                    setPromotions(nextPromotions);
                    setSubscriptionPlans(nextPlans);
                    setSuperAdminConfigError(null);
                  }}
                  lang={lang}
                  onViewSchool={props.onViewSchool}
                  onToggleSchoolStatus={props.onToggleSchoolStatus}
                  coordinationUnreadCount={coordinationUnreadCount}
                  onOpenCoordinationDesk={() => navigateToAppTab('admin_superadmin_desk')}
                  onOpenBackupCenter={props.onOpenBackupCenter}
                  initialSubTab={superAdminSubTab}
                  onSubTabChange={onSuperAdminSubTabChange}
                  onUpdateSchoolFeatureFlags={props.onUpdateSchoolFeatureFlags}
                />
              )}

              {currentTab === 'admin_superadmin_desk' && ['admin', 'super_admin'].includes(currentRole) && (
                <AdminSuperAdminDeskView
                  currentUser={currentUser}
                  activeSchool={activeSchool}
                  schools={schools}
                  currentRole={currentRole}
                  lang={lang}
                  onUnreadCountChange={setCoordinationUnreadCount}
                />
              )}

              {currentTab === 'system_settings' && ['admin', 'super_admin'].includes(currentRole) && (
                <SystemSettingsView
                  systemConfig={systemConfig}
                  activeSchool={activeSchool}
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  grades={viewGrades}
                  attendance={schoolAttendance}
                  timetableSlots={schoolTimetableSlots}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  promotions={promotions}
                  lang={lang}
                  campusGates={campusGates}
                  onUpdateCampusGates={props.onUpdateCampusGates}
                  onSaveCampusGates={props.onSaveCampusGates}
                  onUpdateSchoolCoordinates={props.onUpdateSchoolCoordinates}
                  onUpdateSchool={props.onUpdateSchool}
                  onApplyAcademicRollover={props.onApplyAcademicRollover}
                  onCopyCoursesToSchool={props.onCopyCoursesToSchool}
                  onUpdateConfig={setSystemConfig}
                  featureFlags={activeFeatureFlags}
                  onUpdateFeatureFlags={(flags) => props.onUpdateSchoolFeatureFlags(activeSchool.id, flags)}
                  onCleanupDueSelfies={props.onCleanupDueSelfies}
                  onOpenBackupCenter={props.onOpenBackupCenter}
                  initialTab={systemSettingsInitialTab}
                  onTabChange={setSystemSettingsInitialTab}
                />
              )}

              {currentTab === 'dashboard' && (
                <DashboardView
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  attendance={viewAttendance}
                  grades={viewGrades}
                  playerScores={viewPlayerScores}
                  announcements={viewAnnouncements}
                  systemConfig={systemConfig}
                  school={activeSchool}
                  currentUser={currentUser}
                  lang={lang}
                  onNavigate={navigateToAppTab}
                  onLoadAttendanceRange={props.onLoadAttendanceRange}
                  onQuickCheckIn={props.onQuickCheckIn}
                  onRecordMilestoneActivity={props.onRecordMilestoneActivity}
                  unclaimedCentralPacksCount={unclaimedCentralPacksCount}
                  onOpenCentralExamPopup={props.onOpenCentralExamPopup}
                  timetableSlots={viewTimetableSlots}
                  leaveRequests={viewLeaveRequests}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  assignments={viewAssignments}
                  lessons={viewLessons}
                  onOpenLmsLesson={(courseId, lessonId) => {
                    setLmsLessonJumpTarget({ courseId, lessonId });
                    handleChangeProgramMode('lms_classroom');
                  }}
                  periodAttendance={viewPeriodAttendance}
                  schoolPeriods={schoolPeriods}
                  behaviorRecords={viewBehaviorRecords}
                  sdqAssessments={viewSdqAssessments}
                  infirmaryVisits={viewInfirmaryVisits}
                  schoolPermissions={schoolPermissions}
                  featureFlags={activeFeatureFlags}
                  campusGates={campusGates}
                  onOpenSystemSettingsTab={(subTab) => {
                    setSystemSettingsInitialTab(subTab);
                    setProgramMode('school_erp');
                    setCurrentTab('system_settings');
                  }}
                  initialSubTab={dashboardInitialSubTab}
                  onSelectStudent={props.onSelectStudentForProfile}
                  onOpenGradebookCourse={(courseId) => {
                    setIsGamePlaying(false);
                    setGradebookJumpTarget({ courseId, tab: 'gradebook' });
                    setStudentsSubTab('gradebook');
                    setProgramMode('school_erp');
                    setCurrentTab('students');
                  }}
                  onOpenStudentDevBook={(studentId) => {
                    setIsGamePlaying(false);
                    setDevBookTargetStudentId(studentId);
                    setStudentsTargetStudentId(studentId);
                    setStudentsSubTab('dev_book');
                    setProgramMode('school_erp');
                    setCurrentTab('students');
                  }}
                  onOpenStudentPp6={(studentId) => {
                    setIsGamePlaying(false);
                    setStudentsTargetStudentId(studentId);
                    setStudentsMoeJumpTarget({ mode: 'docs', docView: 'pp6', nonce: Date.now() });
                    setStudentsSubTab('moe_registry');
                    setProgramMode('school_erp');
                    setCurrentTab('students');
                  }}
                  onOpenPp5Summary={() => {
                    setIsGamePlaying(false);
                    setGradebookJumpTarget({ tab: 'pp5_core_summary' });
                    setStudentsSubTab('gradebook');
                    setProgramMode('school_erp');
                    setCurrentTab('students');
                  }}
                  focusMode={focusMode}
                  onToggleFocusMode={() => setFocusMode((prev) => !prev)}
                  adminSimplifiedView={adminSimplifiedView}
                  onToggleAdminSimplifiedView={() => setAdminSimplifiedView((prev) => !prev)}
                />
              )}

              {currentTab === 'students' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <StudentsView
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  grades={viewGrades}
                  gradingSystem={systemConfig.gradingSystem}
                  systemConfig={systemConfig}
                  activeSchool={activeSchool}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  attendance={viewAttendance}
                  periodAttendance={viewPeriodAttendance}
                  timetableSlots={viewTimetableSlots}
                  behaviorRecords={viewBehaviorRecords}
                  sdqAssessments={viewSdqAssessments}
                  infirmaryVisits={viewInfirmaryVisits}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  assignments={viewAssignments}
                  canEditGrades={canEditGradesInSchool}
                  lang={lang}
                  onSelectStudent={props.onSelectStudentForProfile}
                  onOpenReportCard={props.onSelectStudentForReport}
                  onAddStudent={currentRole === 'teacher' ? undefined : props.onAddStudent}
                  onAddStudents={currentRole === 'teacher' ? undefined : props.onAddStudents}
                  onUpdateStudent={currentRole === 'teacher' ? undefined : props.onUpdateStudent}
                  onUpdateRoomOptions={currentRole === 'teacher' ? undefined : (roomOptions) => props.onUpdateSchool({ roomOptions })}
                  onDeleteStudent={currentRole === 'teacher' ? undefined : props.onDeleteStudent}
                  onPurgeSampleStudents={currentRole === 'teacher' ? undefined : props.onPurgeSampleStudents}
                  onBatchUpdateStudents={currentRole === 'teacher' ? undefined : props.onBatchUpdateStudents}
                  onOpenImportExport={currentRole === 'teacher' ? undefined : () => props.onOpenImportExport('students')}
                  onOpenGradeImportExport={currentRole === 'teacher' ? undefined : () => props.onOpenImportExport('grades')}
                  onOpenStudentAccountsSettings={currentRole === 'teacher' ? undefined : () => {
                    setSystemSettingsInitialTab('student_accounts');
                    setProgramMode('school_erp');
                    setCurrentTab('system_settings');
                  }}
                  onChangeGradingSystem={currentRole === 'teacher' ? undefined : (mode) => props.onUpdateSchool({ gradingSystem: mode })}
                  onUpdateGrade={props.onUpdateGrade}
                  onAddGrade={props.onAddGrade}
                  onDeleteGrade={props.onDeleteGrade}
                  onNotifyGradeChange={props.onNotifyGradeChange}
                  onAddBehaviorRecord={props.onAddBehaviorRecord}
                  onPracticeInAi={
                    isTabEnabledByFeatureFlags('socratic_tutor', activeFeatureFlags, currentRole)
                      ? (topic) => {
                          setAdaptivePracticeTopic(topic);
                          navigateToAppTab('socratic_tutor');
                        }
                      : undefined
                  }
                  onOpenBehaviorSdq={() => navigateToAppTab('behavior_sdq')}
                  externalSubTab={studentsSubTab}
                  onSubTabChange={setStudentsSubTab}
                  targetStudentId={studentsTargetStudentId}
                  onTargetStudentChange={setStudentsTargetStudentId}
                  gradebookJumpTarget={gradebookJumpTarget}
                  moeJumpTarget={studentsMoeJumpTarget}
                />
              )}

              {currentTab === 'teachers' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <TeachersView
                  teachers={viewTeachers}
                  lang={lang}
                  currentRole={currentRole}
                  schoolId={activeSchool.id}
                  onAddTeacher={currentRole === 'teacher' ? undefined : props.onAddTeacher}
                  onUpdateTeacher={currentRole === 'teacher' ? undefined : props.onUpdateTeacher}
                  onDeleteTeacher={currentRole === 'teacher' ? undefined : props.onDeleteTeacher}
                  onPurgeSampleTeachers={currentRole === 'teacher' ? undefined : props.onPurgeSampleTeachers}
                  staffPositionOptions={systemConfig.staffPositionOptions}
                  onUpdateStaffPositionOptions={currentRole === 'teacher' ? undefined : (options) => props.onUpdateSchool({ staffPositionOptions: options })}
                  academicYear={systemConfig.academicYear}
                  onOpenImportExport={currentRole === 'teacher' ? undefined : () => props.onOpenImportExport('teachers')}
                />
              )}

              {currentTab === 'courses' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <CoursesView
                  courses={viewCourses}
                  students={viewStudents}
                  teachers={viewTeachers}
                  grades={viewGrades}
                  gradingSystem={systemConfig.gradingSystem}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  schoolId={activeSchool.id}
                  onAddCourse={currentRole === 'teacher' ? undefined : props.onAddCourse}
                  onUpdateCourse={currentRole === 'teacher' ? undefined : props.onUpdateCourse}
                  onDeleteCourse={currentRole === 'teacher' ? undefined : props.onDeleteCourse}
                  onDeleteCourses={currentRole === 'teacher' ? undefined : props.onDeleteCourses}
                  onEnrollStudent={currentRole === 'teacher' ? undefined : props.onEnrollStudent}
                  onEnrollStudentsBatch={currentRole === 'teacher' ? undefined : props.onEnrollStudentsBatch}
                  onUnenrollStudent={currentRole === 'teacher' ? undefined : props.onUnenrollStudent}
                  onUnenrollStudentsBatch={currentRole === 'teacher' ? undefined : props.onUnenrollStudentsBatch}
                  semesterOptions={systemConfig.semesterOptions}
                  academicYear={systemConfig.academicYear}
                  currentSemester={systemConfig.currentSemester}
                  showPrimaryCourseCredits={activeSchool.showPrimaryCourseCredits ?? false}
                  onOpenImportExport={currentRole === 'teacher' ? undefined : (tab = 'courses') => props.onOpenImportExport(tab)}
                />
              )}

              {currentTab === 'games' && (
                <EduBattleGameView
                  questions={schoolQuestions}
                  playerScores={viewPlayerScores}
                  rewardItems={rewardItems}
                  currentUser={currentUser}
                  lang={lang}
                  initialSubTab={eduBattleInitialSubTab}
                  isMobileMode={shouldShowMobileView}
                  onAddQuestion={props.onAddQuestion}
                  onImportQuestions={props.onImportQuestions}
                  onEarnRewards={props.onEarnRewards}
                  onRedeemReward={props.onRedeemReward}
                  rewardRedemptions={rewardRedemptions}
                  onEquipCosmetic={props.onEquipCosmetic}
                  onReviewRedemption={props.onReviewRedemption}
                  onCreateCustomReward={props.onCreateCustomReward}
                  onGamePlayingChange={setIsGamePlaying}
                  onOpenCentralExamHub={() => navigateToAppTab('central_exam_hub')}
                  onOpenCareerQuest={
                    isTabEnabledByFeatureFlags('career_quest', activeFeatureFlags, currentRole)
                      ? () => navigateToAppTab('career_quest')
                      : undefined
                  }
                  onExit={() => {
                    setEduBattleInitialSubTab(undefined);
                    setCurrentTab('dashboard');
                  }}
                />
              )}

              {currentTab === 'central_exam_hub' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <CentralExamHubView
                  schoolId={activeSchool.id}
                  schoolName={activeSchool.nameTh}
                  currentRole={currentRole}
                  packs={centralExamPacks}
                  entitlements={schoolExamEntitlements}
                  schoolQuestions={schoolQuestions}
                  onClaimFreePack={props.onClaimFreeCentralPack}
                  onPurchasePack={props.onPurchaseCentralPack}
                  onOpenQuestionBankInEduBattle={() => {
                    setEduBattleInitialSubTab('bank');
                    navigateToAppTab('games');
                  }}
                  onOpenCoordinationDesk={() => navigateToAppTab('admin_superadmin_desk')}
                  courses={viewCourses}
                  teachers={viewTeachers}
                  students={viewStudents}
                  grades={viewGrades}
                  onSyncQuizScoresToGradebook={currentRole === 'teacher' ? undefined : props.onSyncQuizScoresToGradebook}
                />
              )}

              {currentTab === 'study_streak' && (
                <StudyStreakQuestPassView
                  lang={lang}
                  currentRole={currentRole}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  schoolId={activeSchool.id}
                  currentUser={currentUser}
                  playerScores={viewPlayerScores}
                  onEarnRewards={props.onEarnRewards}
                />
              )}

              {currentTab === 'school_farm' && (
                <SchoolFarmGameView
                  lang={lang}
                  currentUser={currentUser}
                  currentRole={currentRole}
                  activeSchool={activeSchool}
                  students={props.schoolStudents ?? viewStudents}
                  attendance={props.schoolAttendance ?? viewAttendance}
                  periodAttendance={viewPeriodAttendance}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  assignments={viewAssignments}
                  behaviorRecords={viewBehaviorRecords}
                  questions={schoolQuestions}
                  playerScores={viewPlayerScores}
                  onEarnRewards={props.onEarnRewards}
                />
              )}

              {currentTab === 'boss_raid' && (
                <CoopBossRaidView
                  questions={schoolQuestions}
                  lang={lang}
                  currentRole={currentRole}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  onExit={() => setCurrentTab('dashboard')}
                  schoolId={activeSchool.id}
                  currentUser={currentUser}
                  onEarnRewards={props.onEarnRewards}
                  onAwardPortfolioItem={(item) => {
                    props.onAddPortfolioItem(item);
                    navigateToAppTab('portfolio');
                  }}
                />
              )}

              {currentTab === 'socratic_tutor' && (
                <SocraticTutorView
                  lang={lang}
                  currentRole={currentRole}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  initialFocusTopic={adaptivePracticeTopic}
                  onClearFocusTopic={() => setAdaptivePracticeTopic(null)}
                />
              )}

              {currentTab === 'realworld_quests' && (
                <RealWorldSnapQuestView
                  lang={lang}
                  currentRole={currentRole}
                  schoolId={activeSchool.id}
                  currentUser={currentUser}
                  onAwardPortfolioItem={(item) => {
                    props.onAddPortfolioItem(item);
                    navigateToAppTab('portfolio');
                  }}
                />
              )}

              {currentTab === 'ai_diagnostic' && (
                <AiDiagnosticLearningView
                  lang={lang}
                  currentRole={currentRole}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  currentUser={currentUser}
                  students={viewStudents}
                  courses={viewCourses}
                  grades={viewGrades}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  attendance={viewAttendance}
                  initialFocusTopic={adaptivePracticeTopic}
                  onPracticeInSocraticTutor={(topic) => {
                    setAdaptivePracticeTopic(topic);
                    navigateToAppTab('socratic_tutor');
                  }}
                />
              )}

              {currentTab === 'subject_labs' && (
                <SubjectLabSimulationView
                  currentUserRole={currentUser?.role}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || 'นักเรียน'}
                  schoolId={activeSchool.id}
                  userId={currentUser?.id}
                  studentId={currentUser?.studentRecordId}
                  lang={lang}
                  onEarnRewards={props.onEarnRewards}
                  onBackToGames={() => setCurrentTab('dashboard')}
                />
              )}

              {currentTab === 'hall_of_fame' && (
                <HallOfFame3DView
                  lang={lang}
                  school={activeSchool}
                  students={viewStudents}
                  portfolioItems={viewPortfolioItems}
                  playerScores={viewPlayerScores}
                  currentUser={currentUser}
                  onOpenPortfolio={() => setCurrentTab('portfolio')}
                  onExit={() => setCurrentTab('dashboard')}
                />
              )}

              {currentTab === 'career_quest' && ['super_admin', 'admin', 'teacher', 'student'].includes(currentRole) && (
                <CareerQuestView
                  currentUser={currentUser}
                  school={activeSchool}
                  students={viewStudents}
                  courses={viewCourses}
                  grades={viewGrades}
                  attendance={viewAttendance}
                  portfolioItems={viewPortfolioItems}
                  playerScores={viewPlayerScores}
                  gradingSystem={systemConfig.gradingSystem}
                  lang={lang}
                  onNavigate={navigateToAppTab}
                  onEarnRewards={props.onEarnRewards}
                  onEquipCosmetic={props.onEquipCosmetic}
                  onAddPortfolioItem={props.onAddPortfolioItem}
                />
              )}

              {currentTab === 'timetable' && (
                <TimetableScheduleView
                  slots={
                    currentRole === 'student' || currentRole === 'parent'
                      ? viewTimetableSlotsAllTerms
                      : (props.schoolTimetableSlotsAllTerms ?? viewTimetableSlotsAllTerms)
                  }
                  courses={
                    currentRole === 'student' || currentRole === 'parent'
                      ? viewCourses
                      : (props.schoolCourses ?? viewCourses)
                  }
                  assignments={viewAssignments}
                  teachers={
                    currentRole === 'student' || currentRole === 'parent'
                      ? viewTeachers
                      : (props.schoolTeachers ?? viewTeachers)
                  }
                  students={
                    currentRole === 'student' || currentRole === 'parent'
                      ? viewStudents
                      : (props.schoolStudents ?? viewStudents)
                  }
                  onAddSlot={currentRole === 'teacher' ? undefined : props.onAddTimetableSlot}
                  onUpdateSlot={currentRole === 'teacher' ? undefined : props.onUpdateTimetableSlot}
                  onDeleteSlot={currentRole === 'teacher' ? undefined : props.onDeleteTimetableSlot}
                  onImportSlots={currentRole === 'teacher' ? undefined : props.onImportTimetableSlots}
                  schoolPeriods={schoolPeriods}
                  onSaveSchoolPeriods={currentRole === 'teacher' ? undefined : props.onSaveSchoolPeriods}
                  lang={lang}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  schoolId={activeSchool.id}
                  schoolName={activeSchool.nameTh}
                  academicYear={timetableAcademicYear}
                  currentSemester={timetableSemester}
                  semesterOptions={systemConfig.semesterOptions}
                  teachingLoadMinPeriods={activeSchool.teachingLoadMinPeriods}
                  teachingLoadMaxPeriods={activeSchool.teachingLoadMaxPeriods}
                  roomOptions={activeSchool.roomOptions}
                  showPrimaryCourseCredits={activeSchool.showPrimaryCourseCredits ?? false}
                  onUpdateRoomOptions={currentRole === 'teacher' ? undefined : (roomOptions) => props.onUpdateSchool({ roomOptions })}
                  onUpdateTeachingLoadThresholds={currentRole === 'teacher' ? undefined : (minPeriods, maxPeriods) => props.onUpdateSchool({
                    teachingLoadMinPeriods: minPeriods,
                    teachingLoadMaxPeriods: maxPeriods,
                  })}
                  onUpdateAcademicPeriod={currentRole === 'teacher' ? undefined : props.onUpdateAcademicPeriod}
                  leaveRequests={viewLeaveRequests}
                  attendance={viewAttendance}
                  periodAttendance={viewPeriodAttendance}
                  onRecordPeriodAttendance={props.onRecordPeriodAttendance}
                  canSelfCheckin={
                    currentRole === 'student'
                      ? schoolPermissions.student_self_checkin !== false
                      : currentRole === 'teacher'
                        ? schoolPermissions.teacher_attendance !== false
                        : false
                  }
                  onOpenPeriodCheckin={(params) => {
                    setTimetableCheckinTarget(params);
                    navigateToAppTab('mobile_checkin');
                  }}
                />
              )}

              {currentTab === 'homework' && (
                <HomeworkTrackerView
                  submissions={viewHomeworkSubmissions}
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  assignments={viewAssignments}
                  schoolId={activeSchool.id}
                  schoolName={activeSchool.nameTh}
                  schoolPermissions={schoolPermissions}
                  onCreateAssignment={props.onAddHomeworkAssignment}
                  onAddSubmission={props.onAddHomeworkSubmission}
                  onGradeSubmission={props.onGradeHomeworkSubmission}
                  lang={lang}
                  currentRole={currentRole}
                />
              )}

              {currentTab === 'attendance' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <AttendanceView
                  students={viewStudents}
                  teachers={viewTeachers}
                  attendance={viewAttendance}
                  leaveRequests={viewLeaveRequests}
                  campusGates={campusGates}
                  activeSchool={activeSchool}
                  currentUser={currentUser}
                  currentRole={currentRole}
                  lang={lang}
                  onRecordAttendance={props.onRecordAttendance}
                  onBulkImportAttendance={currentRole === 'teacher' ? undefined : props.onBulkImportAttendance}
                  onUpdateLeaveStatus={currentRole === 'teacher' ? undefined : props.onUpdateLeaveStatus}
                  onUpdateCampusGates={currentRole === 'teacher' ? undefined : props.onUpdateCampusGates}
                  onSaveCampusGates={currentRole === 'teacher' ? undefined : props.onSaveCampusGates}
                  onUpdateSchoolCoordinates={currentRole === 'teacher' ? undefined : props.onUpdateSchoolCoordinates}
                  courses={viewCourses}
                  schoolPeriods={schoolPeriods}
                  timetableSlots={viewTimetableSlots}
                  periodAttendance={viewPeriodAttendance}
                  onRecordPeriodAttendance={props.onRecordPeriodAttendance}
                  onAttendanceAudienceChange={(audience) => {
                    navigateToAppTab(audience === 'staff' ? 'mobile_checkin' : 'attendance');
                  }}
                  onOpenGpsSettings={currentRole === 'teacher' ? undefined : () => {
                    setSystemSettingsInitialTab('school_gps');
                    setProgramMode('school_erp');
                    setCurrentTab('system_settings');
                  }}
                  onLoadAttendanceRange={props.onLoadAttendanceRange}
                />
              )}

              {(currentTab === 'mobile_checkin' || (currentTab === 'attendance' && currentRole === 'student')) && (
                <MobileAttendanceView
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  attendance={viewAttendance}
                  periodAttendance={viewPeriodAttendance}
                  currentUser={currentUser}
                  currentRole={currentRole}
                  showAttendanceAudienceSwitch={['super_admin', 'admin', 'teacher'].includes(currentRole)}
                  onAttendanceAudienceChange={(audience) => {
                    navigateToAppTab(audience === 'students' ? 'attendance' : 'mobile_checkin');
                  }}
                  hideStaffOverviewTabs
                  school={activeSchool}
                  campusGates={campusGates}
                  schoolPeriods={schoolPeriods}
                  timetableSlots={viewTimetableSlots}
                  leaveRequests={viewLeaveRequests}
                  lang={lang}
                  initialSubTab={timetableCheckinTarget ? 'period_checkin' : (deepLinkParams?.subTab || 'selfie_mobile')}
                  initialPeriodCourseId={timetableCheckinTarget?.courseId ?? deepLinkParams?.courseId}
                  initialPeriodNumber={timetableCheckinTarget?.periodNumber ?? deepLinkParams?.periodNumber}
                  initialPeriodDate={timetableCheckinTarget?.date ?? deepLinkParams?.date}
                  initialPeriodCode={timetableCheckinTarget?.courseCode ?? deepLinkParams?.code}
                  initialPeriodCheckType={timetableCheckinTarget?.checkType ?? deepLinkParams?.checkType}
                  initialPeriodExpiresAt={deepLinkParams?.expiresAt}
                  initialPeriodToken={deepLinkParams?.token}
                  onRecordAttendance={props.onRecordAttendance}
                  onRecordPeriodAttendance={props.onRecordPeriodAttendance}
                  onAddLeaveRequest={props.onAddLeaveRequest}
                  onUpdateLeaveStatus={props.onUpdateLeaveStatus}
                  onUpdateCampusGates={['admin', 'super_admin'].includes(currentRole) ? props.onUpdateCampusGates : undefined}
                  onSaveCampusGates={['admin', 'super_admin'].includes(currentRole) ? props.onSaveCampusGates : undefined}
                  onUpdateSchoolCoordinates={['admin', 'super_admin'].includes(currentRole) ? props.onUpdateSchoolCoordinates : undefined}
                />
              )}

              {currentTab === 'student_id_cards' && (
                <DigitalIdCardView
                  students={viewStudents}
                  teachers={viewTeachers}
                  school={activeSchool}
                  lang={lang}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  timetableSlots={viewTimetableSlots}
                  courses={viewCourses}
                  schoolPeriods={schoolPeriods}
                  onUpdateStudent={currentRole === 'teacher' ? undefined : props.onUpdateStudent}
                  onUpdateTeacher={currentRole === 'teacher' ? undefined : props.onUpdateTeacher}
                  onUpdateOwnAvatar={props.onUpdateOwnAvatar}
                />
              )}

              {currentTab === 'behavior_sdq' && hasGlobalRolePermission('manageSdq') && (
                <BehaviorSdqView
                  students={viewStudents}
                  records={viewBehaviorRecords}
                  sdqList={viewSdqAssessments}
                  onAddBehaviorRecord={props.onAddBehaviorRecord}
                  onAddSdqAssessment={props.onAddSdqAssessment}
                  lang={lang}
                  currentRole={currentRole}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email}
                  schoolId={activeSchool.id}
                  academicYear={systemConfig.academicYear}
                  currentSemester={systemConfig.currentSemester}
                />
              )}

              {currentTab === 'infirmary' && hasGlobalRolePermission('viewInfirmary') && (
                <InfirmaryHealthView
                  visits={viewInfirmaryVisits}
                  students={viewStudents}
                  onAddVisit={props.onAddInfirmaryVisit}
                  currentUserId={currentUser?.id || ''}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email}
                  lang={lang}
                  currentRole={currentRole}
                  schoolId={activeSchool.id}
                />
              )}

              {currentTab === 'portfolio' && (
                <PortfolioView
                  portfolioItems={viewPortfolioItems}
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  grades={viewGrades}
                  playerScores={viewPlayerScores}
                  school={activeSchool}
                  gradingSystem={systemConfig.gradingSystem}
                  currentUser={currentUser}
                  lang={lang}
                  onAddPortfolioItem={props.onAddPortfolioItem}
                  onDeletePortfolioItem={props.onDeletePortfolioItem}
                  onOpenProfile={props.onOpenProfileModal}
                  academicYear={systemConfig.academicYear}
                />
              )}

              {currentTab === 'gradebook' && (
                <GradebookView
                  students={viewStudents}
                  teachers={viewTeachers}
                  courses={viewCourses}
                  grades={viewGrades}
                  systemConfig={systemConfig}
                  school={activeSchool}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  onChangeGradingSystem={currentRole === 'teacher' ? undefined : (mode) => props.onUpdateSchool({ gradingSystem: mode })}
                  onUpdateGrade={props.onUpdateGrade}
                  onAddGrade={props.onAddGrade}
                  onNotifyGradeChange={props.onNotifyGradeChange}
                  onOpenReportCard={props.onSelectStudentForReport}
                  timetableSlots={viewTimetableSlots}
                  attendance={viewAttendance}
                  periodAttendance={viewPeriodAttendance}
                  behaviorRecords={viewBehaviorRecords}
                  sdqAssessments={viewSdqAssessments}
                  infirmaryVisits={viewInfirmaryVisits}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  assignments={viewAssignments}
                  onUpdateStudent={currentRole === 'teacher' ? undefined : props.onUpdateStudent}
                  onAddStudent={currentRole === 'teacher' ? undefined : props.onAddStudent}
                  onDeleteStudent={currentRole === 'teacher' ? undefined : props.onDeleteStudent}
                  onDeleteGrade={props.onDeleteGrade}
                  onPracticeInAi={
                    isTabEnabledByFeatureFlags('socratic_tutor', activeFeatureFlags, currentRole)
                      ? (topic) => {
                          setAdaptivePracticeTopic(topic);
                          navigateToAppTab('socratic_tutor');
                        }
                      : undefined
                  }
                  canEditGrades={canEditGradesInSchool}
                  initialCourseId={gradebookJumpTarget?.courseId}
                  initialStudentId={gradebookJumpTarget?.studentId}
                  initialTab={gradebookJumpTarget?.tab}
                  onOpenStudentDevBook={(studentId) => {
                    setIsGamePlaying(false);
                    setDevBookTargetStudentId(studentId);
                    setProgramMode('school_erp');
                    setCurrentTab('student_development_book');
                  }}
                  lang={lang}
                  onOpenImportExport={['super_admin', 'admin', 'teacher'].includes(currentRole) ? () => props.onOpenImportExport('grades') : undefined}
                />
              )}

              {currentTab === 'student_development_book' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <StudentQualityDevelopmentBookView
                  students={viewStudents}
                  courses={viewCourses}
                  grades={viewGrades}
                  attendance={viewAttendance}
                  periodAttendance={viewPeriodAttendance}
                  timetableSlots={viewTimetableSlots}
                  behaviorRecords={viewBehaviorRecords}
                  sdqAssessments={viewSdqAssessments}
                  infirmaryVisits={viewInfirmaryVisits}
                  homeworkSubmissions={viewHomeworkSubmissions}
                  systemConfig={systemConfig}
                  school={activeSchool}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  initialStudentId={devBookTargetStudentId}
                  onAddBehaviorRecord={props.onAddBehaviorRecord}
                  onOpenReportCard={props.onSelectStudentForReport}
                  onOpenCoreReportCard={(studentId) => {
                    setIsGamePlaying(false);
                    setGradebookJumpTarget({ studentId, tab: 'core_report_card' });
                    setProgramMode('school_erp');
                    setCurrentTab('gradebook');
                  }}
                  onOpenQualitativeSummary={() => navigateToAppTab('qualitative_summary')}
                  onOpenCourseIndicators={(courseId) => {
                    setIsGamePlaying(false);
                    setGradebookJumpTarget({ courseId, tab: 'indicators' });
                    setProgramMode('school_erp');
                    setCurrentTab('gradebook');
                  }}
                  onOpenBehaviorSdq={() => navigateToAppTab('behavior_sdq')}
                  lang={lang}
                />
              )}

              {currentTab === 'qualitative_summary' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <GradeLevelQualitativeSummaryView
                  students={viewStudents}
                  systemConfig={systemConfig}
                  school={activeSchool}
                  currentRole={currentRole}
                  currentUser={currentUser}
                  lang={lang}
                  onOpenStudentDevBook={(studentId) => {
                    setIsGamePlaying(false);
                    setDevBookTargetStudentId(studentId);
                    setProgramMode('school_erp');
                    setCurrentTab('student_development_book');
                  }}
                  onOpenStudentPp6={(studentId) => {
                    setIsGamePlaying(false);
                    setGradebookJumpTarget({ studentId, tab: 'pp6' });
                    setProgramMode('school_erp');
                    setCurrentTab('gradebook');
                  }}
                />
              )}

              {currentTab === 'announcements' && ['super_admin', 'admin', 'teacher'].includes(currentRole) && (
                <AnnouncementsView
                  announcements={schoolAnnouncements}
                  systemConfig={systemConfig}
                  onAddAnnouncement={props.onAddAnnouncement}
                  schoolId={activeSchool.id}
                  currentUserName={currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email}
                  currentUserRoleLabel={
                    currentRole === 'admin' || currentRole === 'super_admin'
                      ? 'ผู้บริหาร / ผู้ดูแลโรงเรียน'
                      : 'ครูผู้สอน'
                  }
                  onConsentPublished={(title) => {
                    if (currentUser) {
                      appendAuditLog(activeSchool.id, {
                        actorName: currentUser.fullNameTh || currentUser.fullNameEn || currentUser.email,
                        actorRole: currentUser.role,
                        actionType: 'consent_created',
                        targetLabel: title,
                        details: 'เผยแพร่หนังสือขออนุญาตผู้ปกครอง',
                      });
                    }
                  }}
                />
              )}
            </>
          )}

          {/* Mode 2: Virtual Classroom / LMS */}
          {!isDeveloperPlatformMode && programMode === 'lms_classroom' && (
            <LmsClassroomView
              schoolId={activeSchool.id}
              courses={viewCourses}
              students={viewStudents}
              teachers={viewTeachers}
              lessons={viewLessons}
              assignments={viewAssignments}
              initialCourseId={lmsLessonJumpTarget?.courseId}
              initialLessonId={lmsLessonJumpTarget?.lessonId}
              lang={lang}
              currentUser={currentUser}
              schoolPermissions={schoolPermissions}
              onCompleteLesson={props.onCompleteLesson}
              onSaveLesson={props.onSaveLesson}
              onSubmitAssignment={props.onSubmitAssignment}
            />
          )}

          {/* Mode 3: Parent & Student Portal */}
          {!isDeveloperPlatformMode && programMode === 'parent_portal' && (
            isProgramModeEnabledByFeatureFlags('parent_portal', activeFeatureFlags) ? (
              <ParentPortalView
                students={viewStudents}
                attendance={viewAttendance}
                grades={viewGrades}
                courses={viewCourses}
                systemConfig={systemConfig}
                leaveRequests={viewLeaveRequests}
                lang={lang}
                schoolPermissions={schoolPermissions}
                onOpenReportCard={props.onSelectStudentForReport}
                onAddLeaveRequest={props.onAddLeaveRequest}
                schoolId={activeSchool.id}
                onLoadAttendanceRange={props.onLoadAttendanceRange}
                periodAttendance={viewPeriodAttendance}
                homeworkSubmissions={viewHomeworkSubmissions}
                infirmaryVisits={viewInfirmaryVisits}
              />
            ) : (
              <div className="saas-card saas-card-body max-w-lg mx-auto my-8 text-center space-y-3">
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="type-section-title">
                  {lang === 'th' ? 'พอร์ทัลผู้ปกครองยังไม่เปิดใช้งานในแพ็กเกจของโรงเรียน' : 'Parent Portal is not included in the current school package'}
                </h3>
                <p className="type-meta">
                  {lang === 'th'
                    ? `กรุณาติดต่อผู้ดูแลโรงเรียนเพื่ออัปเกรดเป็น ${getPackageLevelLabel('level_2', lang)} ขึ้นไป`
                    : `Please contact your school admin to upgrade to ${getPackageLevelLabel('level_2', lang)}.`}
                </p>
              </div>
            )
          )}
        </div>
      </Suspense>
    </ViewErrorBoundary>
  );
};
