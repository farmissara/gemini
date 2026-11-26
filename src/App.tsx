import React, { Suspense, useEffect, useRef, useState } from 'react';
import { RotateCw, X } from 'lucide-react';
import type { NavTab } from './components/layout/Sidebar';
import type { Student } from './types';
import type { GuideModuleId, ModuleGuideRoleView } from './components/modals/ModuleGuideModal';
import type { SystemSettingsTab } from './views/SystemSettingsView';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { FocusToolbar } from './components/layout/FocusToolbar';
import { AuthLayout } from './components/layout/AuthLayout';
import { ViewErrorBoundary } from './components/common/ViewErrorBoundary';
import { PageSkeleton } from './components/common/PageSkeleton';
import { GuideTourProvider } from './components/guide/GuideTourContext';
import { getModuleTone } from './lib/moduleTheme';
import { getSchoolFeatureFlags } from './lib/schoolFeatureFlags';
import { loadSchoolLessons } from './lib/lmsPersistence';
import { getLocalDateString } from './lib/date';
import { useDeepLinkParams } from './features/navigation/useDeepLinkParams';
import { useAppPreferences } from './features/navigation/useAppPreferences';
import { useTabNavigation } from './features/navigation/useTabNavigation';
import { MobileBottomNav } from './features/navigation/MobileBottomNav';
import { SchoolErpViewSwitch } from './features/navigation/SchoolErpViewSwitch';
import { AppModalsHost } from './features/navigation/AppModalsHost';
import { BiometricLockScreen } from './features/auth/BiometricLockScreen';
import { useScheduleNotificationWatcher } from './features/school/useScheduleNotificationWatcher';
import { useSchoolScope } from './features/school/useSchoolScope';
import {
  getAcademicYearStartDate,
  useSchoolDataManager,
  type ConfirmModalConfig,
  type NavCallbacks,
} from './features/school/useSchoolDataManager';

import { lazyNamedWithRetry } from './lib/lazyWithRetry';

const MobileAppShell = lazyNamedWithRetry(
  () => import('./components/layout/MobileAppShell'),
  'MobileAppShell',
);

export const App: React.FC = () => {
  const prefs = useAppPreferences();
  const deepLinkParams = useDeepLinkParams();

  // Modal UI state
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideModalInitialModule] = useState<GuideModuleId>('dashboard');
  const [guideModalInitialRoleView, setGuideModalInitialRoleView] = useState<ModuleGuideRoleView | undefined>(undefined);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig | null>(null);
  const [isConfirmModalBusy, setIsConfirmModalBusy] = useState(false);
  const [showOnboardingTutorModal, setShowOnboardingTutorModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showBackupCenterModal, setShowBackupCenterModal] = useState(false);
  const [importExportInitialTab, setImportExportInitialTab] = useState('students');
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showCentralExamPopup, setShowCentralExamPopup] = useState(false);
  const [showSchemaMigrationModal, setShowSchemaMigrationModal] = useState(false);

  const navCallbacksRef = useRef<NavCallbacks>({
    onLoginNavigate: () => {},
    onRoleSwitchNavigate: () => {},
    onViewSchoolNavigate: () => {},
  });

  const data = useSchoolDataManager({
    onConfirmModalRequested: setConfirmModal,
    hasDeepLink: Boolean(deepLinkParams),
    navCallbacksRef,
  });

  const activeFeatureFlags = data.activeSchool.id
    ? (data.featureFlagsBySchool[data.activeSchool.id] ||
      getSchoolFeatureFlags(data.activeSchool.id, data.activeSchool.schoolTier || 'enterprise'))
    : undefined;

  const nav = useTabNavigation({
    deepLinkParams,
    currentRole: data.currentRole,
    isSuperAdminSchoolView: data.isSuperAdminSchoolView,
    lang: prefs.lang,
    rolePermissions: data.rolePermissions,
    activeFeatureFlags,
    schoolPermissions: data.schoolPermissions,
    onSetSuperAdminSchoolView: data.setIsSuperAdminSchoolView,
    onOpenBackupCenter: () => setShowBackupCenterModal(true),
    onSyncError: data.setDataSyncError,
  });

  navCallbacksRef.current = {
    onLoginNavigate: (role, hasDeepLink) => {
      setShowSchoolSwitcher(false);
      nav.setDashboardInitialSubTab('overview');
      nav.setSystemSettingsInitialTab('school_general');
      if (role === 'super_admin') {
        nav.setProgramMode('school_erp');
        nav.setCurrentTab('super_admin_console');
      } else if (role === 'parent') {
        nav.setProgramMode('parent_portal');
        nav.setCurrentTab('dashboard');
      } else {
        nav.setProgramMode('school_erp');
        nav.setCurrentTab(hasDeepLink ? 'mobile_checkin' : 'dashboard');
      }
    },
    onRoleSwitchNavigate: (nextRole) => {
      nav.setProgramMode('school_erp');
      nav.setCurrentTab(nextRole === 'teacher' ? 'timetable' : 'dashboard');
    },
    onViewSchoolNavigate: () => {
      nav.setProgramMode('school_erp');
      nav.setCurrentTab('dashboard');
    },
  };

  // Load LMS lessons once the active school data is ready (used by ERP Dashboard, Mobile Shell, and LMS mode)
  useEffect(() => {
    if (
      !data.activeSchool.id ||
      !data.currentUser ||
      !data.isDataReady ||
      data.loadedSchoolId !== data.activeSchool.id
    ) {
      return;
    }
    let active = true;
    void loadSchoolLessons(data.activeSchool.id)
      .then((items) => {
        if (active) data.setLessons(items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        data.setDataSyncError(message);
        data.setDataSyncWarnings((prev) => [...new Set([...prev, message])]);
      });
    return () => {
      active = false;
    };
  }, [data.activeSchool.id, data.currentUser?.id, data.loadedSchoolId, data.isDataReady]);

  // Gradebook attendance history prefetch
  useEffect(() => {
    const isGradebookOpen =
      nav.currentTab === 'gradebook' || (nav.currentTab === 'students' && nav.studentsSubTab === 'gradebook');
    if (!isGradebookOpen || !['admin', 'teacher', 'super_admin'].includes(data.currentUser?.role || '')) return;
    void data.loadAttendanceHistory(
      getAcademicYearStartDate(data.systemConfig.academicYear || data.activeSchool.academicYear || ''),
      getLocalDateString(),
    );
  }, [
    nav.currentTab,
    nav.studentsSubTab,
    data.currentUser?.role,
    data.activeSchool.id,
    data.activeSchool.academicYear,
    data.systemConfig.academicYear,
    data.loadAttendanceHistory,
  ]);

  const scope = useSchoolScope({
    activeSchool: data.activeSchool,
    systemConfig: data.systemConfig,
    currentUser: data.currentUser,
    currentRole: data.currentRole,
    authenticatedRole: data.authenticatedRole,
    currentTab: nav.currentTab,
    lang: prefs.lang,
    featureFlagsBySchool: data.featureFlagsBySchool,
    centralExamPacks: data.centralExamPacks,
    schoolExamEntitlements: data.schoolExamEntitlements,
    students: data.students,
    teachers: data.teachers,
    courses: data.courses,
    grades: data.grades,
    attendance: data.attendance,
    announcements: data.announcements,
    lessons: data.lessons,
    assignments: data.assignments,
    questions: data.questions,
    periodAttendance: data.periodAttendance,
    portfolioItems: data.portfolioItems,
    timetableSlots: data.timetableSlots,
    behaviorRecords: data.behaviorRecords,
    sdqAssessments: data.sdqAssessments,
    infirmaryVisits: data.infirmaryVisits,
    homeworkSubmissions: data.homeworkSubmissions,
    leaveRequests: data.leaveRequests,
    playerScores: data.playerScores,
    onCoordinationError: data.setDataSyncError,
  });

  useScheduleNotificationWatcher({
    currentUser: data.currentUser,
    schoolId: data.activeSchool.id,
    schoolPeriods: data.schoolPeriods,
    attendance: data.attendance,
    schoolTimetableSlots: scope.schoolTimetableSlots,
    schoolTeachers: scope.schoolTeachers,
    schoolStudents: scope.schoolStudents,
    schoolCourses: scope.schoolCourses,
  });

  if (!data.currentUser) {
    return (
      <AuthLayout
        onLogin={data.handleLogin}
        initialError={data.dataLoadError}
        isPasswordRecovery={data.isPasswordRecovery}
        onPasswordResetComplete={() => data.setIsPasswordRecovery(false)}
        lang={prefs.lang}
        setLang={prefs.setLang}
        themePalette={prefs.themePalette}
        setThemePalette={prefs.setThemePalette}
        activeSchools={data.schools}
      />
    );
  }

  if (data.isBiometricLocked) {
    return (
      <BiometricLockScreen
        currentUser={data.currentUser}
        activeSchool={data.activeSchool}
        lang={prefs.lang}
        isUnlockingBiometrics={data.isUnlockingBiometrics}
        biometricLockError={data.biometricLockError}
        onUnlock={data.handleUnlockBiometricScreen}
        onLogout={data.handleLogout}
      />
    );
  }

  if (!data.isDataReady || data.loadedSchoolId !== data.activeSchool.id) {
    if (data.dataLoadError) {
      return (
        <main className="h-dvh overflow-hidden flex items-center justify-center bg-[var(--color-canvas)] p-6 text-[var(--color-text-body)]">
          <div className="max-w-lg space-y-4 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
            <h1 className="text-xl font-bold text-[var(--color-text-title)]">
              โหลดข้อมูลโรงเรียนไม่สำเร็จ
            </h1>
            <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 rounded-lg px-3 py-2">
              {data.dataLoadError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 text-sm font-semibold transition cursor-pointer"
            >
              ลองใหม่
            </button>
          </div>
        </main>
      );
    }
    return (
      <main className="h-dvh overflow-hidden bg-[var(--color-canvas)] p-4 sm:p-6 text-[var(--color-text-body)]">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton-shimmer h-8 w-44 rounded-lg" />
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
              <div className="skeleton-shimmer h-8 w-8 rounded-full" />
            </div>
          </div>
          <PageSkeleton rows={7} />
        </div>
      </main>
    );
  }

  const sharedModalsHost = (
    <AppModalsHost
      isMobileMode={prefs.shouldShowMobileView}
      currentUser={data.currentUser}
      currentRole={data.currentRole}
      isSuperAdminSchoolView={data.isSuperAdminSchoolView}
      activeSchool={data.activeSchool}
      schools={data.schools}
      lang={prefs.lang}
      programMode={nav.programMode}
      focusMode={prefs.focusMode}
      systemConfig={data.systemConfig}
      isUsingCachedSchoolData={data.isUsingCachedSchoolData}
      viewStudents={scope.viewStudents}
      viewTeachers={scope.viewTeachers}
      viewCourses={scope.viewCourses}
      viewGrades={scope.viewGrades}
      viewAttendance={scope.viewAttendance}
      schoolStudents={scope.schoolStudents}
      schoolTeachers={scope.schoolTeachers}
      schoolCourses={scope.schoolCourses}
      schoolQuestions={scope.schoolQuestions}
      viewTimetableSlotsAllTerms={scope.viewTimetableSlotsAllTerms}
      schoolPeriods={data.schoolPeriods}
      timetableAcademicYear={scope.timetableAcademicYear}
      timetableSemester={scope.timetableSemester}
      ownPortfolioItems={scope.ownPortfolioItems}
      ownStudentIds={scope.ownStudentIds}
      viewAnnouncements={scope.viewAnnouncements}
      campusGates={data.campusGates}
      unclaimedCentralPacks={scope.unclaimedCentralPacks}
      selectedStudentForReport={selectedStudentForReport}
      setSelectedStudentForReport={setSelectedStudentForReport}
      selectedStudentForProfile={selectedStudentForProfile}
      setSelectedStudentForProfile={setSelectedStudentForProfile}
      showProfileModal={showProfileModal}
      setShowProfileModal={setShowProfileModal}
      showSchoolSwitcher={showSchoolSwitcher}
      setShowSchoolSwitcher={setShowSchoolSwitcher}
      showImportExportModal={showImportExportModal}
      setShowImportExportModal={setShowImportExportModal}
      importExportInitialTab={importExportInitialTab}
      setImportExportInitialTab={setImportExportInitialTab}
      showBackupCenterModal={showBackupCenterModal}
      setShowBackupCenterModal={setShowBackupCenterModal}
      showGuideModal={showGuideModal}
      setShowGuideModal={setShowGuideModal}
      guideModalInitialModule={guideModalInitialModule}
      guideModalInitialRoleView={guideModalInitialRoleView}
      showOnboardingTutorModal={showOnboardingTutorModal}
      setShowOnboardingTutorModal={setShowOnboardingTutorModal}
      showGpsModal={showGpsModal}
      setShowGpsModal={setShowGpsModal}
      showNotificationModal={showNotificationModal}
      setShowNotificationModal={setShowNotificationModal}
      setUnreadNotifCount={scope.setUnreadNotifCount}
      showSchemaMigrationModal={showSchemaMigrationModal}
      setShowSchemaMigrationModal={setShowSchemaMigrationModal}
      showCentralExamPopup={showCentralExamPopup}
      setShowCentralExamPopup={setShowCentralExamPopup}
      confirmModal={confirmModal}
      setConfirmModal={setConfirmModal}
      isConfirmModalBusy={isConfirmModalBusy}
      setIsConfirmModalBusy={setIsConfirmModalBusy}
      setDataSyncError={data.setDataSyncError}
      onSelectSchool={
        data.currentRole === 'super_admin' && !data.isSuperAdminSchoolView
          ? data.handleViewSchool
          : data.handleSelectActiveSchool
      }
      onNavigateToTab={nav.navigateToAppTab}
      onChangeProgramMode={nav.handleChangeProgramMode}
      onSwitchToDesktopMode={() => prefs.setDeviceViewPreference('desktop')}
      onOpenMoeDocumentCenter={nav.handleOpenStudentMoeDocs}
      onOpenDevelopmentBook={(stu) => {
        nav.setDevBookTargetStudentId(stu.id);
        nav.setStudentsTargetStudentId(stu.id);
        nav.setStudentsSubTab('dev_book');
        nav.setProgramMode('school_erp');
        nav.setCurrentTab('students');
      }}
      onLoadAttendanceHistory={data.loadAttendanceHistory}
      onUpdateStudent={data.handleUpdateStudent}
      onUpdateUserProfile={data.handleUpdateUserProfile}
      onAddPortfolioItem={data.handleAddPortfolioItem}
      onDeletePortfolioItem={data.handleDeletePortfolioItem}
      onImportStudents={data.handleImportStudents}
      onImportTeachers={data.handleImportTeachers}
      onImportQuestions={data.handleImportQuestions}
      onImportCourses={data.handleImportCourses}
      onImportEnrollment={data.handleImportEnrollment}
      onImportGrades={data.handleImportGrades}
      onBulkImportAttendance={data.handleBulkImportAttendance}
      onImportTimetableSlots={data.handleImportTimetableSlots}
      onUpdateCampusGates={data.handleUpdateCampusGates}
      onSaveCampusGates={data.handleSaveCampusGates}
      onUpdateSchoolCoordinates={data.handleUpdateSchoolCoordinates}
      onClaimFreeCentralPack={data.handleClaimFreeCentralPack}
      onClaimAllFreeCentralPacks={data.handleClaimAllFreeCentralPacks}
      onPurchaseCentralPack={data.handlePurchaseCentralPack}
      onSyncOfflineItem={data.handleSyncOfflineItem}
    />
  );

  // Mobile App Shell View
  if (prefs.shouldShowMobileView) {
    return (
      <div className="h-dvh overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-body)] font-sans">
        <ViewErrorBoundary resetKey={`mobile-shell:${data.activeSchool.id}`} lang={prefs.lang} viewName="MobileAppShell">
          <Suspense fallback={<div className="p-4"><PageSkeleton compact rows={5} /></div>}>
            <MobileAppShell
              currentUser={data.currentUser}
              activeSchool={data.activeSchool}
              currentRole={data.currentRole}
              isSuperAdminSchoolView={data.isSuperAdminSchoolView}
              lang={prefs.lang}
              setLang={prefs.setLang}
              themePalette={prefs.themePalette}
              setThemePalette={prefs.setThemePalette}
              onLogout={data.handleLogout}
              onSwitchToDesktopMode={() => prefs.setDeviceViewPreference('desktop')}
              onOpenProfileModal={() => setShowProfileModal(true)}
              onOpenOnboardingTutor={() => setShowOnboardingTutorModal(true)}
              unreadCount={scope.unreadNotifCount}
              onOpenNotifications={() => setShowNotificationModal(true)}
              students={scope.viewStudents}
              teachers={scope.viewTeachers}
              courses={scope.viewCourses}
              lessons={scope.viewLessons}
              grades={scope.viewGrades}
              infirmaryVisits={scope.viewInfirmaryVisits}
              behaviorRecords={scope.viewBehaviorRecords}
              sdqAssessments={scope.viewSdqAssessments}
              attendance={scope.viewAttendance}
              periodAttendance={scope.viewPeriodAttendance}
              leaveRequests={scope.viewLeaveRequests}
              assignments={scope.viewAssignments}
              homeworkSubmissions={scope.viewHomeworkSubmissions}
              announcements={scope.viewAnnouncements}
              questions={scope.schoolQuestions}
              playerScores={scope.viewPlayerScores}
              rewardItems={data.rewardItems}
              campusGates={data.campusGates}
              timetableSlots={scope.viewTimetableSlots}
              schoolPeriods={data.schoolPeriods}
              gradingSystem={data.systemConfig.gradingSystem}
              systemConfig={data.systemConfig}
              schoolPermissions={scope.schoolPermissions}
              featureFlags={scope.activeFeatureFlags}
              canSwitchAdminTeacherMode={scope.canSwitchAdminTeacherMode}
              onSwitchOperationalRole={(nextRole) =>
                data.handleSwitchOperationalRole(nextRole, scope.canUseAdminMode, scope.canUseTeacherMode)
              }
              onRecordAttendance={data.handleRecordAttendance}
              onRecordPeriodAttendance={data.handleRecordPeriodAttendance}
              onAddLeaveRequest={data.handleAddLeaveRequest}
              onUpdateLeaveStatus={data.handleUpdateLeaveStatus}
              onEarnRewards={data.handleEarnRewards}
              onRedeemReward={data.handleRedeemReward}
              onAddQuestion={data.handleAddQuestion}
              onImportQuestions={data.handleImportQuestions}
              onUpdateStudent={data.currentRole === 'teacher' ? undefined : data.handleUpdateStudent}
              onUpdateTeacher={data.currentRole === 'teacher' ? undefined : data.handleUpdateTeacher}
              onUpdateOwnAvatar={data.handleUpdateOwnAvatar}
              onUpdateGrade={data.handleUpdateGrade}
              onAddGrade={data.handleAddGrade}
              schools={data.currentRole === 'super_admin' ? data.schools : (data.activeSchool.id ? [data.activeSchool] : [])}
              coordinationUnreadCount={scope.coordinationUnreadCount}
              unclaimedCentralPacksCount={scope.unclaimedCentralPacks.length}
              onOpenSchoolSwitcher={data.currentRole === 'super_admin' ? () => setShowSchoolSwitcher(true) : undefined}
              onUpdateSchool={data.currentRole === 'teacher' ? undefined : data.handleUpdateSchool}
              onAddAnnouncement={data.handleAddAnnouncement}
              onAddHomeworkAssignment={data.handleAddHomeworkAssignment}
              onAddHomeworkSubmission={data.handleAddHomeworkSubmission}
              onGradeHomeworkSubmission={data.handleGradeHomeworkSubmission}
              onAddBehaviorRecord={data.handleAddBehaviorRecord}
              onAddSdqAssessment={data.handleAddSdqAssessment}
              onAddInfirmaryVisit={data.handleAddInfirmaryVisit}
              onCompleteLesson={data.handleCompleteLesson}
              onSaveLesson={data.handleSaveSchoolLesson}
              onSubmitAssignment={data.handleSubmitAssignment}
              onViewSchool={data.handleViewSchool}
              onToggleSchoolStatus={data.handleToggleSchoolStatus}
              onUpdateSchoolFeatureFlags={data.handleUpdateSchoolFeatureFlags}
              onJumpToDesktopTab={(tab) => {
                prefs.setDeviceViewPreference('desktop');
                nav.setProgramMode('school_erp');
                nav.navigateToAppTab(tab);
              }}
              initialMobileTab={nav.timetableCheckinTarget || deepLinkParams ? 'checkin' : 'home'}
              initialAttendanceSubTab={
                nav.timetableCheckinTarget ? 'period_checkin' : (deepLinkParams?.subTab || 'selfie_mobile')
              }
              initialPeriodCourseId={nav.timetableCheckinTarget?.courseId ?? deepLinkParams?.courseId}
              initialPeriodNumber={nav.timetableCheckinTarget?.periodNumber ?? deepLinkParams?.periodNumber}
              initialPeriodDate={nav.timetableCheckinTarget?.date ?? deepLinkParams?.date}
              initialPeriodCode={nav.timetableCheckinTarget?.courseCode ?? deepLinkParams?.code}
              initialPeriodCheckType={nav.timetableCheckinTarget?.checkType ?? deepLinkParams?.checkType}
              onBiometricLock={data.handleLockWithBiometrics}
              portfolioItems={scope.viewPortfolioItems}
              onAddPortfolioItem={data.handleAddPortfolioItem}
              onDeletePortfolioItem={data.handleDeletePortfolioItem}
              onUpdateCampusGates={['admin', 'super_admin'].includes(data.currentRole) ? data.handleUpdateCampusGates : undefined}
              onSaveCampusGates={['admin', 'super_admin'].includes(data.currentRole) ? data.handleSaveCampusGates : undefined}
              onUpdateSchoolCoordinates={['admin', 'super_admin'].includes(data.currentRole) ? data.handleUpdateSchoolCoordinates : undefined}
              rewardRedemptions={data.rewardRedemptions}
              onEquipCosmetic={data.handleEquipCosmetic}
              onReviewRedemption={data.handleReviewRedemption}
              onCreateCustomReward={data.handleCreateCustomReward}
            />
            {sharedModalsHost}
          </Suspense>
        </ViewErrorBoundary>
      </div>
    );
  }

  return (
    <GuideTourProvider
      currentRole={data.currentRole}
      currentTab={nav.programMode === 'lms_classroom' ? 'lms_classroom' : nav.programMode === 'parent_portal' ? 'parent_portal' : nav.currentTab}
      lang={prefs.lang}
      isGuideEnabled={prefs.isGuideTourEnabled}
      onSetGuideEnabled={(next) => prefs.handleToggleGuideTour(next)}
      hideFloatingMascot={nav.useImmersiveGameLayout || prefs.isMascotHidden}
      onHideMascot={() => prefs.handleToggleMascotHidden(true)}
      onOpenFullGuide={
        data.currentRole !== 'super_admin' || data.isSuperAdminSchoolView
          ? () => {
              setGuideModalInitialRoleView(
                data.currentRole === 'student' || data.currentRole === 'parent' ? 'student' : 'teacher'
              );
              setShowGuideModal(true);
            }
          : undefined
      }
      onNavigateToTourTarget={({ moduleId, settingsTab }) => {
        if (moduleId === 'lms_classroom' || moduleId === 'lms') {
          nav.handleChangeProgramMode('lms_classroom');
          return;
        }
        if (moduleId === 'parent_portal') {
          nav.handleChangeProgramMode('parent_portal');
          return;
        }
        nav.handleChangeProgramMode('school_erp');
        if (moduleId === 'system_settings' && settingsTab) {
          nav.setSystemSettingsInitialTab(settingsTab as SystemSettingsTab);
        }
        nav.navigateToAppTab(moduleId as NavTab);
      }}
    >
      <div className={`${nav.useImmersiveGameLayout ? 'game-immersive-root' : ''} h-dvh max-h-dvh w-full overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-body)] flex flex-col font-sans transition-colors duration-200`}>
        {nav.useImmersiveGameLayout && prefs.isPortraitScreen && (
          <div className="fixed top-3 left-1/2 z-[60] -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md">
              <RotateCw className="h-4 w-4 shrink-0 rotate-90 text-amber-300" />
              <span>{prefs.lang === 'th' ? 'หมุนจอแนวนอนเพื่อเห็นพื้นที่เกมมากขึ้น' : 'Rotate to landscape for a wider game view'}</span>
            </div>
          </div>
        )}

        {prefs.isMobileInDesktopView && (
          <div className="sticky top-0 z-50 bg-[var(--color-primary)] text-white px-3 py-1.5 text-xs flex items-center justify-between gap-2 shrink-0">
            <span className="font-medium truncate">
              {prefs.lang === 'th' ? 'โหมดคอมพิวเตอร์ · ปรับตามความกว้างหน้าจอ' : 'Desktop View · Responsive layout'}
            </span>
            <button
              type="button"
              onClick={() => prefs.setDeviceViewPreference('mobile')}
              className="px-2.5 py-1 bg-white text-[var(--color-primary)] hover:bg-slate-100 font-semibold rounded-lg text-[11px] transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {prefs.lang === 'th' ? 'กลับโหมดมือถือ' : 'Mobile View'}
            </button>
          </div>
        )}

        {!nav.useImmersiveGameLayout && (
          <Navbar
            currentTab={nav.currentTab}
            superAdminSubTab={nav.superAdminSubTab}
            currentUser={data.currentUser}
            activeSchool={data.activeSchool}
            currentRole={data.currentRole}
            isSuperAdminSchoolView={data.isSuperAdminSchoolView}
            systemConfig={data.systemConfig}
            unreadCount={scope.unreadNotifCount}
            onOpenNotifications={() => setShowNotificationModal(true)}
            searchQuery={prefs.searchQuery}
            setSearchQuery={prefs.setSearchQuery}
            programMode={nav.programMode}
            setProgramMode={nav.handleChangeProgramMode}
            lang={prefs.lang}
            setLang={prefs.setLang}
            theme={prefs.theme}
            setTheme={prefs.setTheme}
            themePalette={prefs.themePalette}
            setThemePalette={prefs.setThemePalette}
            onOpenSchoolSwitcher={() => {
              if (data.currentRole === 'super_admin') setShowSchoolSwitcher(true);
            }}
            onLogout={data.handleLogout}
            onToggleMobileMenu={() => prefs.setIsMobileMenuOpen((prev) => !prev)}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenGuide={data.currentRole !== 'super_admin' || data.isSuperAdminSchoolView ? (roleTab) => {
              setGuideModalInitialRoleView(roleTab);
              setShowGuideModal(true);
            } : undefined}
            onOpenImportExport={(['super_admin', 'admin', 'teacher'].includes(data.currentRole) && (data.currentRole !== 'super_admin' || data.isSuperAdminSchoolView)) ? () => setShowImportExportModal(true) : undefined}
            onOpenOnboardingTutor={() => setShowOnboardingTutorModal(true)}
            onSwitchToMobileMode={() => prefs.setDeviceViewPreference('mobile')}
            isMascotHidden={prefs.isMascotHidden}
            onToggleMascotHidden={() => prefs.handleToggleMascotHidden()}
            coordinationUnreadCount={scope.coordinationUnreadCount}
            onOpenCoordinationDesk={['admin', 'super_admin'].includes(data.currentRole) ? () => nav.navigateToAppTab('admin_superadmin_desk') : undefined}
            onOpenExamPaymentSettings={data.currentRole === 'super_admin' ? nav.handleOpenExamPaymentSettings : undefined}
            students={scope.viewStudents}
            teachers={scope.viewTeachers}
            courses={scope.viewCourses}
            grades={scope.viewGrades}
            onOpenStudentProfile={setSelectedStudentForProfile}
            onOpenReportCard={setSelectedStudentForReport}
            onNavigateTab={(tab) => {
              nav.handleChangeProgramMode('school_erp');
              nav.navigateToAppTab(tab);
            }}
            focusMode={prefs.focusMode}
            onToggleFocusMode={() => prefs.setFocusMode((prev) => !prev)}
            featureFlags={scope.activeFeatureFlags}
            canSwitchAdminTeacherMode={scope.canSwitchAdminTeacherMode}
            onSwitchOperationalRole={(nextRole) =>
              data.handleSwitchOperationalRole(nextRole, scope.canUseAdminMode, scope.canUseTeacherMode)
            }
          />
        )}

        {!nav.useImmersiveGameLayout && data.dataSyncError && (
          <div role="alert" className="ui-alert shrink-0 mx-4 sm:mx-6 mt-2 items-center justify-between" data-state="danger">
            <span className="truncate">{prefs.lang === 'th' ? 'ซิงก์ข้อมูลไม่สำเร็จ:' : 'Sync error:'} {data.dataSyncError}</span>
            <button type="button" onClick={() => data.setDataSyncError(null)} aria-label="Close error" className="font-bold ml-2 shrink-0 cursor-pointer">✕</button>
          </div>
        )}

        {/* Mobile Drawer Overlay and Sidebar */}
        {!nav.useImmersiveGameLayout && !prefs.focusMode && prefs.isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => prefs.setIsMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[85vw] bg-[var(--color-card)] text-[var(--color-text-body)] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-[var(--color-border)]">
              <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--color-text-title)]">เมนูระบบโรงเรียน (BaanPakKru · บ้านพักครู)</span>
                <button
                  type="button"
                  onClick={() => prefs.setIsMobileMenuOpen(false)}
                  className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Sidebar
                  currentTab={nav.currentTab}
                  setCurrentTab={(tab) => {
                    nav.navigateToAppTab(tab);
                    prefs.setIsMobileMenuOpen(false);
                  }}
                  currentRole={data.currentRole}
                  isSuperAdminSchoolView={data.isSuperAdminSchoolView}
                  activeSettingsSubTab={nav.systemSettingsInitialTab}
                  activeDashboardSubTab={nav.dashboardInitialSubTab}
                  activeSuperAdminSubTab={nav.superAdminSubTab}
                  studentsCount={scope.viewStudents.length}
                  teachersCount={scope.schoolTeachers.length}
                  coursesCount={scope.viewCourses.length}
                  coordinationUnreadCount={scope.coordinationUnreadCount}
                  unclaimedCentralPacksCount={scope.unclaimedCentralPacks.length}
                  lang={prefs.lang}
                  featureFlags={scope.activeFeatureFlags}
                  schoolPermissions={scope.schoolPermissions}
                  adminSimplifiedView={prefs.adminSimplifiedView}
                  onToggleAdminSimplifiedView={() => prefs.setAdminSimplifiedView((prev) => !prev)}
                />
              </div>
            </div>
          </div>
        )}

        <div
          className={`flex-1 flex min-w-0 min-h-0 ${nav.useImmersiveGameLayout ? 'fixed inset-0 z-50 bg-slate-950 overflow-hidden' : 'overflow-hidden'}`}
        >
          {!nav.useImmersiveGameLayout && !prefs.focusMode && nav.programMode === 'school_erp' && (
            <div className="hidden shrink-0 lg:flex">
              <Sidebar
                currentTab={nav.currentTab}
                setCurrentTab={nav.navigateToAppTab}
                currentRole={data.currentRole}
                isSuperAdminSchoolView={data.isSuperAdminSchoolView}
                activeSettingsSubTab={nav.systemSettingsInitialTab}
                activeDashboardSubTab={nav.dashboardInitialSubTab}
                activeSuperAdminSubTab={nav.superAdminSubTab}
                studentsCount={scope.viewStudents.length}
                teachersCount={scope.schoolTeachers.length}
                coursesCount={scope.viewCourses.length}
                coordinationUnreadCount={scope.coordinationUnreadCount}
                unclaimedCentralPacksCount={scope.unclaimedCentralPacks.length}
                lang={prefs.lang}
                featureFlags={scope.activeFeatureFlags}
                schoolPermissions={scope.schoolPermissions}
                desktopCollapsed={prefs.sidebarIsCollapsed}
                onToggleDesktopCollapse={() => {
                  if (prefs.isSidebarCompactViewport && !prefs.isSidebarCollapsed) {
                    prefs.setIsSidebarExpandedForCompactViewport((prev) => !prev);
                  } else {
                    prefs.setIsSidebarCollapsed((prev) => !prev);
                  }
                }}
                adminSimplifiedView={prefs.adminSimplifiedView}
                onToggleAdminSimplifiedView={() => prefs.setAdminSimplifiedView((prev) => !prev)}
              />
            </div>
          )}

          <main className={`flex-1 w-full max-w-full min-w-0 min-h-0 flex flex-col ${nav.useImmersiveGameLayout ? 'p-0 overflow-hidden' : `app-workspace ${getModuleTone(nav.currentTab)} p-4 sm:p-5 lg:p-7 pb-20 md:pb-8 ${nav.currentTab === 'students' ? 'overflow-hidden' : 'overflow-y-auto'}`}`}>
            <div className={`${nav.useImmersiveGameLayout ? 'max-w-none h-full' : 'w-full max-w-[1440px] mx-auto'} min-w-0 flex-1 min-h-0 flex flex-col`}>
              {!nav.useImmersiveGameLayout && prefs.focusMode && (
                <FocusToolbar
                  currentTab={nav.currentTab}
                  programMode={nav.programMode}
                  currentRole={data.currentRole}
                  isSuperAdminSchoolView={data.isSuperAdminSchoolView}
                  lang={prefs.lang}
                  featureFlags={scope.activeFeatureFlags}
                  schoolPermissions={scope.schoolPermissions}
                  onNavigateTab={nav.navigateToAppTab}
                  onChangeProgramMode={nav.handleChangeProgramMode}
                  onExitFocusMode={() => prefs.setFocusMode(false)}
                  adminSimplifiedView={prefs.adminSimplifiedView}
                />
              )}

              {!nav.useImmersiveGameLayout && !prefs.focusMode && data.currentRole === 'super_admin' && data.isSuperAdminSchoolView && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5">
                  <div className="text-xs font-medium text-[var(--color-text-body)] truncate">
                    {prefs.lang === 'th' ? 'กำลังตรวจสอบโรงเรียน:' : 'Inspecting school:'}{' '}
                    <strong className="font-semibold text-[var(--color-text-title)]">{data.activeSchool.nameTh}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => nav.navigateToAppTab('super_admin_console')}
                    className="btn-tool-neutral h-8 px-3 shrink-0 whitespace-nowrap"
                  >
                    {prefs.lang === 'th' ? 'ออกจากโหมดโรงเรียน (กลับหน้าผู้พัฒนา)' : 'Exit School View (Developer Mode)'}
                  </button>
                </div>
              )}

              <SchoolErpViewSwitch
                programMode={nav.programMode}
                setProgramMode={nav.setProgramMode}
                handleChangeProgramMode={nav.handleChangeProgramMode}
                currentTab={nav.currentTab}
                setCurrentTab={nav.setCurrentTab}
                navigateToAppTab={nav.navigateToAppTab}
                currentRole={data.currentRole}
                isSuperAdminSchoolView={data.isSuperAdminSchoolView}
                currentUser={data.currentUser}
                activeSchool={data.activeSchool}
                schools={data.schools}
                setSchools={data.setSchools}
                shouldShowMobileView={prefs.shouldShowMobileView}
                lang={prefs.lang}
                systemConfig={data.systemConfig}
                setSystemConfig={data.setSystemConfig}
                activeFeatureFlags={scope.activeFeatureFlags}
                schoolPermissions={scope.schoolPermissions}
                hasGlobalRolePermission={nav.hasGlobalRolePermission}
                canEditGradesInSchool={scope.canEditGradesInSchool}
                deepLinkParams={deepLinkParams}
                viewStudents={scope.viewStudents}
                viewTeachers={scope.viewTeachers}
                viewCourses={scope.viewCourses}
                viewGrades={scope.viewGrades}
                viewAttendance={scope.viewAttendance}
                schoolAttendance={scope.schoolAttendance}
                schoolAnnouncements={scope.schoolAnnouncements}
                viewAnnouncements={scope.viewAnnouncements}
                viewLessons={scope.viewLessons}
                viewAssignments={scope.viewAssignments}
                schoolQuestions={scope.schoolQuestions}
                viewPlayerScores={scope.viewPlayerScores}
                rewardItems={data.rewardItems}
                rewardRedemptions={data.rewardRedemptions}
                viewPeriodAttendance={scope.viewPeriodAttendance}
                viewPortfolioItems={scope.viewPortfolioItems}
                viewTimetableSlots={scope.viewTimetableSlots}
                viewTimetableSlotsAllTerms={scope.viewTimetableSlotsAllTerms}
                schoolTimetableSlots={scope.schoolTimetableSlots}
                timetableAcademicYear={scope.timetableAcademicYear}
                timetableSemester={scope.timetableSemester}
                schoolPeriods={data.schoolPeriods}
                viewBehaviorRecords={scope.viewBehaviorRecords}
                viewSdqAssessments={scope.viewSdqAssessments}
                viewInfirmaryVisits={scope.viewInfirmaryVisits}
                viewHomeworkSubmissions={scope.viewHomeworkSubmissions}
                viewLeaveRequests={scope.viewLeaveRequests}
                campusGates={data.campusGates}
                centralExamPacks={data.centralExamPacks}
                schoolExamEntitlements={data.schoolExamEntitlements}
                unclaimedCentralPacksCount={scope.unclaimedCentralPacks.length}
                rolePermissions={data.rolePermissions}
                setRolePermissions={data.setRolePermissions}
                promotions={data.promotions}
                setPromotions={data.setPromotions}
                subscriptionPlans={data.subscriptionPlans}
                setSubscriptionPlans={data.setSubscriptionPlans}
                superAdminConfigError={data.superAdminConfigError}
                setSuperAdminConfigError={data.setSuperAdminConfigError}
                coordinationUnreadCount={scope.coordinationUnreadCount}
                setCoordinationUnreadCount={scope.setCoordinationUnreadCount}
                dashboardInitialSubTab={nav.dashboardInitialSubTab}
                systemSettingsInitialTab={nav.systemSettingsInitialTab}
                setSystemSettingsInitialTab={nav.setSystemSettingsInitialTab}
                superAdminSubTab={nav.superAdminSubTab}
                onSuperAdminSubTabChange={nav.setSuperAdminSubTab}
                studentsSubTab={nav.studentsSubTab}
                setStudentsSubTab={nav.setStudentsSubTab}
                studentsTargetStudentId={nav.studentsTargetStudentId}
                setStudentsTargetStudentId={nav.setStudentsTargetStudentId}
                studentsMoeJumpTarget={nav.studentsMoeJumpTarget}
                setStudentsMoeJumpTarget={nav.setStudentsMoeJumpTarget}
                devBookTargetStudentId={nav.devBookTargetStudentId}
                setDevBookTargetStudentId={nav.setDevBookTargetStudentId}
                gradebookJumpTarget={nav.gradebookJumpTarget}
                setGradebookJumpTarget={nav.setGradebookJumpTarget}
                eduBattleInitialSubTab={nav.eduBattleInitialSubTab}
                setEduBattleInitialSubTab={nav.setEduBattleInitialSubTab}
                lmsLessonJumpTarget={nav.lmsLessonJumpTarget}
                setLmsLessonJumpTarget={nav.setLmsLessonJumpTarget}
                adaptivePracticeTopic={nav.adaptivePracticeTopic}
                setAdaptivePracticeTopic={nav.setAdaptivePracticeTopic}
                timetableCheckinTarget={nav.timetableCheckinTarget}
                setTimetableCheckinTarget={nav.setTimetableCheckinTarget}
                setIsGamePlaying={nav.setIsGamePlaying}
                focusMode={prefs.focusMode}
                setFocusMode={prefs.setFocusMode}
                adminSimplifiedView={prefs.adminSimplifiedView}
                setAdminSimplifiedView={prefs.setAdminSimplifiedView}
                onSelectStudentForProfile={setSelectedStudentForProfile}
                onSelectStudentForReport={setSelectedStudentForReport}
                onOpenProfileModal={() => setShowProfileModal(true)}
                onOpenBackupCenter={() => setShowBackupCenterModal(true)}
                onOpenImportExport={(tab) => {
                  setImportExportInitialTab(tab);
                  setShowImportExportModal(true);
                }}
                onOpenCentralExamPopup={() => setShowCentralExamPopup(true)}
                onOpenExamPaymentSettings={nav.handleOpenExamPaymentSettings}
                onLoadAttendanceRange={data.loadAttendanceHistory}
                onViewSchool={data.handleViewSchool}
                onToggleSchoolStatus={data.handleToggleSchoolStatus}
                onUpdateSchoolFeatureFlags={data.handleUpdateSchoolFeatureFlags}
                onCleanupDueSelfies={data.handleCleanupDueSelfies}
                onUpdateCampusGates={data.handleUpdateCampusGates}
                onSaveCampusGates={data.handleSaveCampusGates}
                onUpdateSchoolCoordinates={data.handleUpdateSchoolCoordinates}
                onUpdateSchool={data.handleUpdateSchool}
                onUpdateAcademicPeriod={data.handleUpdateAcademicPeriod}
                onApplyAcademicRollover={data.handleApplyAcademicRollover}
                onCopyCoursesToSchool={data.handleCopyCoursesToSchool}
                onQuickCheckIn={data.handleQuickCheckIn}
                onRecordMilestoneActivity={data.handleRecordMilestoneActivity}
                onAddStudent={data.handleAddStudent}
                onAddStudents={data.handleAddStudents}
                onUpdateStudent={data.handleUpdateStudent}
                onDeleteStudent={data.handleDeleteStudent}
                onPurgeSampleStudents={data.handlePurgeSampleStudents}
                onBatchUpdateStudents={(updatedList) => {
                  const updateMap = new Map(updatedList.map((s) => [s.id, s]));
                  data.setStudents((prev) => prev.map((s) => updateMap.get(s.id) || s));
                }}
                onUpdateGrade={data.handleUpdateGrade}
                onAddGrade={data.handleAddGrade}
                onDeleteGrade={data.handleDeleteGrade}
                onNotifyGradeChange={data.handleNotifyGradeChange}
                onAddBehaviorRecord={data.handleAddBehaviorRecord}
                onAddSdqAssessment={data.handleAddSdqAssessment}
                onAddInfirmaryVisit={data.handleAddInfirmaryVisit}
                onAddTeacher={data.handleAddTeacher}
                onUpdateTeacher={data.handleUpdateTeacher}
                onDeleteTeacher={data.handleDeleteTeacher}
                onPurgeSampleTeachers={data.handlePurgeSampleTeachers}
                onAddCourse={data.handleAddCourse}
                onUpdateCourse={data.handleUpdateCourse}
                onDeleteCourse={data.handleDeleteCourse}
                onDeleteCourses={data.handleDeleteCourses}
                onEnrollStudent={data.handleEnrollStudent}
                onEnrollStudentsBatch={data.handleEnrollStudentsBatch}
                onUnenrollStudent={data.handleUnenrollStudent}
                onUnenrollStudentsBatch={data.handleUnenrollStudentsBatch}
                onAddQuestion={data.handleAddQuestion}
                onImportQuestions={data.handleImportQuestions}
                onEarnRewards={data.handleEarnRewards}
                onRedeemReward={data.handleRedeemReward}
                onEquipCosmetic={data.handleEquipCosmetic}
                onReviewRedemption={data.handleReviewRedemption}
                onCreateCustomReward={data.handleCreateCustomReward}
                onClaimFreeCentralPack={data.handleClaimFreeCentralPack}
                onPurchaseCentralPack={data.handlePurchaseCentralPack}
                onSyncQuizScoresToGradebook={data.handleSyncQuizScoresToGradebook}
                onAddPortfolioItem={data.handleAddPortfolioItem}
                onDeletePortfolioItem={data.handleDeletePortfolioItem}
                onAddTimetableSlot={data.handleAddTimetableSlot}
                onUpdateTimetableSlot={data.handleUpdateTimetableSlot}
                onDeleteTimetableSlot={data.handleDeleteTimetableSlot}
                onImportTimetableSlots={data.handleImportTimetableSlots}
                onSaveSchoolPeriods={data.handleSaveSchoolPeriods}
                onRecordPeriodAttendance={data.handleRecordPeriodAttendance}
                onAddHomeworkAssignment={data.handleAddHomeworkAssignment}
                onAddHomeworkSubmission={data.handleAddHomeworkSubmission}
                onGradeHomeworkSubmission={data.handleGradeHomeworkSubmission}
                onRecordAttendance={data.handleRecordAttendance}
                onBulkImportAttendance={data.handleBulkImportAttendance}
                onAddLeaveRequest={data.handleAddLeaveRequest}
                onUpdateLeaveStatus={data.handleUpdateLeaveStatus}
                onUpdateOwnAvatar={data.handleUpdateOwnAvatar}
                onAddAnnouncement={data.handleAddAnnouncement}
                onCompleteLesson={data.handleCompleteLesson}
                onSaveLesson={data.handleSaveSchoolLesson}
                onSubmitAssignment={data.handleSubmitAssignment}
              />
            </div>
          </main>
        </div>

        <MobileBottomNav
          currentRole={data.currentRole}
          isSuperAdminSchoolView={data.isSuperAdminSchoolView}
          useImmersiveGameLayout={nav.useImmersiveGameLayout}
          programMode={nav.programMode}
          currentTab={nav.currentTab}
          activeFeatureFlags={scope.activeFeatureFlags}
          schoolPermissions={scope.schoolPermissions}
          onChangeProgramMode={nav.handleChangeProgramMode}
          onNavigateTab={nav.navigateToAppTab}
          onOpenProfileModal={() => setShowProfileModal(true)}
        />

        {sharedModalsHost}
      </div>
    </GuideTourProvider>
  );
};

export default App;
