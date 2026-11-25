import React, { Suspense } from 'react';
import type { NavTab } from '../../components/layout/Sidebar';
import type { GuideModuleId, ModuleGuideRoleView } from '../../components/modals/ModuleGuideModal';
import type { ConfirmModalConfig } from '../school/useSchoolDataManager';
import type {
  Announcement,
  AppLanguage,
  AppProgramMode,
  AttendanceRecord,
  AuthUser,
  CampusGateGeofence,
  CentralExamPack,
  Course,
  GradeRecord,
  PortfolioItem,
  QuizQuestion,
  School,
  SchoolPeriodTime,
  Student,
  SystemConfig,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
import { getScopedUnreadCountForUser } from '../../lib/pushNotifications';
import { buildCentralExamSignature, markCentralExamPopupSeen } from '../../lib/centralExamBank';
import type { OfflineQueueItem } from '../../lib/offlineSync';
import { ConfirmActionModal } from '../../components/modals/ConfirmActionModal';
import { OfflineIndicator } from '../../components/layout/OfflineIndicator';
import { SchemaMigrationModal } from '../school/SchemaMigrationModal';
import { lazyNamedWithRetry as lazyNamed } from '../../lib/lazyWithRetry';

const SchoolSwitcherModal = lazyNamed(() => import('../../components/modals/SchoolSwitcherModal'), 'SchoolSwitcherModal');
const ReportCardModal = lazyNamed(() => import('../../components/modals/ReportCardModal'), 'ReportCardModal');
const StudentDetailModal = lazyNamed(() => import('../../components/modals/StudentDetailModal'), 'StudentDetailModal');
const UserProfileModal = lazyNamed(() => import('../../components/modals/UserProfileModal'), 'UserProfileModal');
const DataImportExportModal = lazyNamed(() => import('../../components/modals/DataImportExportModal'), 'DataImportExportModal');
const BackupCenterModal = lazyNamed(() => import('../../components/modals/BackupCenterModal'), 'BackupCenterModal');
const ModuleGuideModal = lazyNamed(() => import('../../components/modals/ModuleGuideModal'), 'ModuleGuideModal');
const SchoolOnboardingTutorModal = lazyNamed(() => import('../../components/modals/SchoolOnboardingTutorModal'), 'SchoolOnboardingTutorModal');
const SchoolGpsModal = lazyNamed(() => import('../../components/modals/SchoolGpsModal'), 'SchoolGpsModal');
const NotificationCenterModal = lazyNamed(() => import('../../components/modals/NotificationCenterModal'), 'NotificationCenterModal');
const CentralExamNotificationPopup = lazyNamed(() => import('../../views/CentralExamHubView'), 'CentralExamNotificationPopup');

export interface AppModalsHostProps {
  isMobileMode?: boolean;
  currentUser: AuthUser;
  currentRole: UserRole;
  activeSchool: School;
  schools: School[];
  lang: AppLanguage;
  programMode: AppProgramMode;
  focusMode: boolean;
  systemConfig: SystemConfig;
  isUsingCachedSchoolData: boolean;
  // Data
  viewStudents: Student[];
  viewTeachers: Teacher[];
  viewCourses: Course[];
  viewGrades: GradeRecord[];
  viewAttendance: AttendanceRecord[];
  schoolStudents: Student[];
  schoolTeachers: Teacher[];
  schoolCourses: Course[];
  schoolQuestions: QuizQuestion[];
  viewTimetableSlotsAllTerms: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  timetableAcademicYear: string;
  timetableSemester: string;
  ownPortfolioItems: PortfolioItem[];
  ownStudentIds: string[];
  viewAnnouncements: Announcement[];
  campusGates: CampusGateGeofence[];
  unclaimedCentralPacks: CentralExamPack[];
  // Modal visibility & state
  selectedStudentForReport: Student | null;
  setSelectedStudentForReport: (s: Student | null) => void;
  selectedStudentForProfile: Student | null;
  setSelectedStudentForProfile: (s: Student | null) => void;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  showSchoolSwitcher: boolean;
  setShowSchoolSwitcher: (show: boolean) => void;
  showImportExportModal: boolean;
  setShowImportExportModal: (show: boolean) => void;
  importExportInitialTab: string;
  setImportExportInitialTab: (tab: string) => void;
  showBackupCenterModal: boolean;
  setShowBackupCenterModal: (show: boolean) => void;
  showGuideModal: boolean;
  setShowGuideModal: (show: boolean) => void;
  guideModalInitialModule: GuideModuleId;
  guideModalInitialRoleView?: ModuleGuideRoleView;
  showOnboardingTutorModal: boolean;
  setShowOnboardingTutorModal: (show: boolean) => void;
  showGpsModal: boolean;
  setShowGpsModal: (show: boolean) => void;
  showNotificationModal: boolean;
  setShowNotificationModal: (show: boolean) => void;
  setUnreadNotifCount: (count: number) => void;
  showSchemaMigrationModal: boolean;
  setShowSchemaMigrationModal: (show: boolean) => void;
  showCentralExamPopup: boolean;
  setShowCentralExamPopup: (show: boolean) => void;
  confirmModal: ConfirmModalConfig | null;
  setConfirmModal: (cfg: ConfirmModalConfig | null) => void;
  isConfirmModalBusy: boolean;
  setIsConfirmModalBusy: (busy: boolean) => void;
  setDataSyncError: (msg: string | null) => void;
  // Navigation & Actions
  onSelectSchool: (school: School) => void;
  onNavigateToTab: (tab: NavTab) => void;
  onChangeProgramMode: (mode: AppProgramMode) => void;
  onSwitchToDesktopMode?: () => void;
  onOpenMoeDocumentCenter: (student: Student) => void;
  onOpenDevelopmentBook: (student: Student) => void;
  onLoadAttendanceHistory: (startDate?: string | null, endDate?: string | null, studentId?: string) => Promise<void>;
  onToggleLineSync: (studentId: string) => void;
  onUpdateStudent: (student: Student) => void;
  onUpdateUserProfile: (user: AuthUser) => Promise<void>;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onDeletePortfolioItem: (itemId: string) => void;
  onImportStudents: (students: Student[]) => void;
  onImportTeachers: (teachers: Teacher[]) => Promise<void>;
  onImportQuestions: (questions: QuizQuestion[]) => void;
  onImportCourses: (courses: Course[]) => void;
  onImportEnrollment: (courseCode: string, studentIds: string[]) => void;
  onImportGrades: (grades: GradeRecord[]) => void;
  onBulkImportAttendance: (records: AttendanceRecord[]) => void;
  onImportTimetableSlots: (slots: TimetableSlot[]) => Promise<void>;
  onUpdateCampusGates: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates: (lat: number, lng: number, radiusMeters: number) => void;
  onClaimFreeCentralPack: (pack: CentralExamPack) => Promise<void>;
  onClaimAllFreeCentralPacks: () => Promise<void>;
  onPurchaseCentralPack: (pack: CentralExamPack, method: 'promptpay' | 'invoice', slipUrl?: string) => Promise<void>;
  onSyncOfflineItem: (item: OfflineQueueItem) => Promise<boolean>;
}

export const AppModalsHost: React.FC<AppModalsHostProps> = (props) => {
  const {
    isMobileMode = false,
    currentUser,
    currentRole,
    activeSchool,
    schools,
    lang,
    programMode,
    focusMode,
    systemConfig,
    isUsingCachedSchoolData,
    viewStudents,
    viewTeachers,
    viewCourses,
    viewGrades,
    viewAttendance,
    schoolStudents,
    schoolTeachers,
    schoolCourses,
    schoolQuestions,
    viewTimetableSlotsAllTerms,
    schoolPeriods,
    timetableAcademicYear,
    timetableSemester,
    ownPortfolioItems,
    ownStudentIds,
    viewAnnouncements,
    campusGates,
    unclaimedCentralPacks,
    selectedStudentForReport,
    setSelectedStudentForReport,
    selectedStudentForProfile,
    setSelectedStudentForProfile,
    showProfileModal,
    setShowProfileModal,
    showSchoolSwitcher,
    setShowSchoolSwitcher,
    showImportExportModal,
    setShowImportExportModal,
    importExportInitialTab,
    setImportExportInitialTab,
    showBackupCenterModal,
    setShowBackupCenterModal,
    showGuideModal,
    setShowGuideModal,
    guideModalInitialModule,
    guideModalInitialRoleView,
    showOnboardingTutorModal,
    setShowOnboardingTutorModal,
    showGpsModal,
    setShowGpsModal,
    showNotificationModal,
    setShowNotificationModal,
    setUnreadNotifCount,
    showSchemaMigrationModal,
    setShowSchemaMigrationModal,
    showCentralExamPopup,
    setShowCentralExamPopup,
    confirmModal,
    setConfirmModal,
    isConfirmModalBusy,
    setIsConfirmModalBusy,
    setDataSyncError,
  } = props;

  return (
    <>
      <Suspense fallback={null}>
        {showSchoolSwitcher && currentRole === 'super_admin' && (
          <SchoolSwitcherModal
            schools={schools}
            activeSchool={activeSchool}
            onSelectSchool={props.onSelectSchool}
            onClose={() => setShowSchoolSwitcher(false)}
            lang={lang}
          />
        )}

        {selectedStudentForReport && (
          <ReportCardModal
            student={selectedStudentForReport}
            courses={viewCourses}
            grades={viewGrades}
            systemConfig={systemConfig}
            school={activeSchool}
            onClose={() => setSelectedStudentForReport(null)}
          />
        )}

        {selectedStudentForProfile && (
          <StudentDetailModal
            student={selectedStudentForProfile}
            courses={viewCourses}
            grades={viewGrades}
            attendance={viewAttendance}
            onClose={() => setSelectedStudentForProfile(null)}
            onLoadAttendanceHistory={props.onLoadAttendanceHistory}
            onOpenReportCard={(stu) => {
              setSelectedStudentForProfile(null);
              setSelectedStudentForReport(stu);
            }}
            onOpenMoeDocumentCenter={isMobileMode ? undefined : (stu) => {
              setSelectedStudentForProfile(null);
              props.onOpenMoeDocumentCenter(stu);
            }}
            onOpenDevelopmentBook={
              !isMobileMode && ['super_admin', 'admin', 'teacher'].includes(currentRole)
                ? (stu) => {
                    setSelectedStudentForProfile(null);
                    props.onOpenDevelopmentBook(stu);
                  }
                : undefined
            }
            onToggleLineSync={currentRole === 'teacher' ? () => undefined : props.onToggleLineSync}
            gradingSystem={systemConfig.gradingSystem}
            lineEnabled={systemConfig.lineMessagingConfigured !== false}
            onUpdateStudent={currentRole === 'teacher' ? undefined : (updated) => {
              props.onUpdateStudent(updated);
              setSelectedStudentForProfile(updated);
            }}
          />
        )}

        {showProfileModal && (
          <UserProfileModal
            currentUser={currentUser}
            portfolioItems={ownPortfolioItems}
            lang={lang}
            onSaveProfile={props.onUpdateUserProfile}
            onAddPortfolioItem={props.onAddPortfolioItem}
            onDeletePortfolioItem={props.onDeletePortfolioItem}
            onClose={() => setShowProfileModal(false)}
          />
        )}

        {!isMobileMode && showImportExportModal && ['super_admin', 'admin'].includes(currentRole) && (
          <DataImportExportModal
            students={viewStudents}
            teachers={viewTeachers}
            questions={schoolQuestions}
            courses={viewCourses}
            grades={viewGrades}
            attendance={viewAttendance}
            timetableSlots={viewTimetableSlotsAllTerms}
            schoolPeriods={schoolPeriods}
            activeSchoolId={activeSchool.id}
            academicYear={timetableAcademicYear}
            semester={timetableSemester}
            lang={lang}
            initialTab={importExportInitialTab}
            onOpenBackupCenter={currentRole === 'admin' || currentRole === 'super_admin' ? () => {
              setShowImportExportModal(false);
              setShowBackupCenterModal(true);
            } : undefined}
            onImportStudents={props.onImportStudents}
            onImportTeachers={props.onImportTeachers}
            onImportQuestions={props.onImportQuestions}
            onImportCourses={props.onImportCourses}
            onImportEnrollment={props.onImportEnrollment}
            onImportGrades={props.onImportGrades}
            onImportAttendance={props.onBulkImportAttendance}
            onImportTimetableSlots={props.onImportTimetableSlots}
            onClose={() => setShowImportExportModal(false)}
          />
        )}

        {!isMobileMode && showBackupCenterModal && (currentRole === 'admin' || currentRole === 'super_admin') && (
          <BackupCenterModal
            isSuperAdmin={currentRole === 'super_admin'}
            schools={schools}
            activeSchoolId={activeSchool.id}
            onClose={() => setShowBackupCenterModal(false)}
          />
        )}

        {!isMobileMode && showGuideModal && (
          <ModuleGuideModal
            initialModule={guideModalInitialModule}
            initialRoleView={guideModalInitialRoleView}
            lang={lang}
            currentRole={currentRole}
            onClose={() => setShowGuideModal(false)}
            onNavigateToModule={(mod) => {
              setShowGuideModal(false);
              if (mod === 'lms') {
                props.onChangeProgramMode('lms_classroom');
              } else if (mod === 'parent_portal') {
                props.onChangeProgramMode('parent_portal');
              } else {
                props.onChangeProgramMode('school_erp');
                props.onNavigateToTab(mod as NavTab);
              }
            }}
          />
        )}

        {showOnboardingTutorModal && (
          <SchoolOnboardingTutorModal
            isOpen={showOnboardingTutorModal}
            onClose={() => setShowOnboardingTutorModal(false)}
            activeSchool={activeSchool}
            studentsCount={schoolStudents.length}
            teachersCount={schoolTeachers.length}
            coursesCount={isMobileMode ? viewCourses.length : schoolCourses.length}
            lang={lang}
            onNavigateToTab={(tab) => {
              setShowOnboardingTutorModal(false);
              if (isMobileMode) props.onSwitchToDesktopMode?.();
              props.onNavigateToTab(tab);
            }}
            onOpenImportExport={(tab) => {
              setShowOnboardingTutorModal(false);
              if (isMobileMode) props.onSwitchToDesktopMode?.();
              setImportExportInitialTab(tab || 'students');
              setShowImportExportModal(true);
            }}
          />
        )}

        {!isMobileMode && showGpsModal && (
          <SchoolGpsModal
            isOpen={showGpsModal}
            onClose={() => setShowGpsModal(false)}
            activeSchool={activeSchool}
            campusGates={campusGates}
            currentRole={currentRole}
            lang={lang}
            onUpdateCampusGates={props.onUpdateCampusGates}
            onSaveCampusGates={props.onSaveCampusGates}
            onUpdateSchoolCoordinates={props.onUpdateSchoolCoordinates}
          />
        )}

        {showNotificationModal && (
          <NotificationCenterModal
            isOpen={showNotificationModal}
            currentUser={currentUser}
            schoolId={activeSchool.id}
            ownStudentIds={ownStudentIds}
            announcements={viewAnnouncements}
            onUnreadCountChange={setUnreadNotifCount}
            onClose={() => {
              setShowNotificationModal(false);
              if (currentUser.role !== 'parent') {
                setUnreadNotifCount(
                  getScopedUnreadCountForUser({
                    currentUser,
                    schoolId: activeSchool.id,
                    ownStudentIds,
                    announcements: viewAnnouncements,
                    lang,
                  })
                );
              }
            }}
            lang={lang}
          />
        )}

        {!isMobileMode && showSchemaMigrationModal && (
          <SchemaMigrationModal
            isOpen={showSchemaMigrationModal}
            lang={lang}
            onClose={() => setShowSchemaMigrationModal(false)}
          />
        )}

        {!isMobileMode && !focusMode && showCentralExamPopup && currentRole === 'admin' && programMode === 'school_erp' && (
          <CentralExamNotificationPopup
            isOpen={true}
            schoolName={activeSchool.nameTh}
            unclaimedPacks={unclaimedCentralPacks}
            onClaimFreePack={props.onClaimFreeCentralPack}
            onClaimAllFreePacks={props.onClaimAllFreeCentralPacks}
            onPurchasePack={props.onPurchaseCentralPack}
            onOpenHub={() => {
              setShowCentralExamPopup(false);
              props.onNavigateToTab('central_exam_hub');
            }}
            onDismiss={() => {
              markCentralExamPopupSeen(activeSchool.id, buildCentralExamSignature(unclaimedCentralPacks));
              setShowCentralExamPopup(false);
            }}
          />
        )}
      </Suspense>

      <ConfirmActionModal
        isOpen={Boolean(confirmModal)}
        title={confirmModal?.title || ''}
        description={confirmModal?.description || ''}
        detailNote={confirmModal?.detailNote}
        confirmLabel={confirmModal?.confirmLabel || 'ยืนยัน'}
        tone={confirmModal?.tone || 'danger'}
        isBusy={isConfirmModalBusy}
        onCancel={() => {
          if (!isConfirmModalBusy) setConfirmModal(null);
        }}
        onConfirm={async () => {
          if (!confirmModal) return;
          setIsConfirmModalBusy(true);
          try {
            await confirmModal.onConfirm();
            setConfirmModal(null);
          } catch (error) {
            setDataSyncError(error instanceof Error ? error.message : String(error));
            setConfirmModal(null);
          } finally {
            setIsConfirmModalBusy(false);
          }
        }}
      />

      <OfflineIndicator
        lang={lang}
        currentUserId={currentUser?.id}
        onSyncItem={props.onSyncOfflineItem}
        isUsingCachedData={isUsingCachedSchoolData}
      />
    </>
  );
};
