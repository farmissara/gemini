import React from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Fingerprint,
  MapPin,
  Nfc,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  CampusGateGeofence,
  School,
  Student,
  Teacher,
  UserRole,
} from '../../types';
import type { EnrolledBiometricPasskey } from '../../lib/webAuthn';
import { removeNfcBinding, type NfcCardBinding } from '../../lib/nfcAttendance';
import { ContinuousRapidScannerModal } from '../../components/modals/ContinuousRapidScannerModal';
import { SchoolGpsSettingsCard } from '../../components/SchoolGpsSettingsCard';
import { MobileBottomSheet } from '../../components/layout/MobileRoleWorkspace';
import type { AttendanceSubTab, CheckinSuccessFeedback, NfcRecentLogEntry } from './types';

interface AttendanceModalsAndSheetsProps {
  embeddedMobile: boolean;
  lang: AppLanguage;
  activeSchoolId: string;
  currentUser: AuthUser | null;
  school?: School;
  campusGates: CampusGateGeofence[];
  effectiveRole: UserRole;
  isSchoolAdmin: boolean;
  isStaffUser: boolean;
  isRestrictedViewer: boolean;
  students: Student[];
  teachers: Teacher[];
  scopedStudents: Student[];
  subTab: AttendanceSubTab;
  setSubTab: (tab: AttendanceSubTab) => void;
  setLeaveFormStep: (step: 1 | 2) => void;
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
      time?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
      confirmedByHomeroom?: boolean;
      confirmedByTeacherName?: string;
      correctionRequestId?: string;
    }
  ) => void;
  // Success feedback modal
  checkinSuccessFeedback: CheckinSuccessFeedback | null;
  setCheckinSuccessFeedback: (val: CheckinSuccessFeedback | null) => void;
  // Rapid scanner & Admin GPS modal
  showRapidScanner: boolean;
  setShowRapidScanner: (val: boolean) => void;
  showGpsAdminModal: boolean;
  setShowGpsAdminModal: (val: boolean) => void;
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
  // Quick Roster Sheet
  setShowQuickRosterSheet: (val: boolean) => void;
  showQuickRosterSheet: boolean;
  rosterTodayStats: { checkedIn: number; late: number; pending: number };
  rosterToast: string | null;
  rosterSheetQuery: string;
  setRosterSheetQuery: (q: string) => void;
  rosterGradeOptions: string[];
  rosterSheetGradeFilter: string;
  setRosterSheetGradeFilter: (g: string) => void;
  filteredRosterStudents: Student[];
  todayAttendanceByStudent: Map<string, AttendanceRecord>;
  handleQuickRosterCheckin: (st: Student, status?: AttendanceStatus) => void;
  handleSelectRosterStudentForCurrentTab: (st: Student) => void;
  // Identity Sheet
  showIdentitySheet: boolean;
  setShowIdentitySheet: (val: boolean) => void;
  activePersonName: string;
  activePersonRole: string;
  activePersonId: string | undefined;
  activePersonDefaultAvatar: string | undefined;
  isSelfCheckin: boolean;
  setAttendanceMode: (mode: 'self' | 'proxy') => void;
  effectiveUserType: AttendanceUserType;
  setActiveUserType: (type: AttendanceUserType) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (id: string) => void;
  // Geofence Sheet
  showGeofenceSheet: boolean;
  setShowGeofenceSheet: (val: boolean) => void;
  normalizedGates: CampusGateGeofence[];
  selectedGate: CampusGateGeofence | null;
  setSelectedGateId: (id: string) => void;
  gpsStatusShortLabel: string;
  handleRefreshGps: () => void;
  isGpsLoading: boolean;
  gpsError: string | null;
  // NFC Sheet
  nfcDrawerMode: null | 'quick_tap' | 'recent_logs';
  setNfcDrawerMode: (mode: null | 'quick_tap' | 'recent_logs') => void;
  nfcBindings: NfcCardBinding[];
  setNfcBindings: (bindings: NfcCardBinding[]) => void;
  nfcRecentLogs: NfcRecentLogEntry[];
  handleProcessNfcCardInput: (rawUid: string, payloadText?: string) => void;
  // Biometric Unlock Modal
  showBiometricUnlockModal: boolean;
  userPasskey: EnrolledBiometricPasskey | null;
  biometricError: string | null;
  biometricBusy: boolean;
  handleBiometricVerify: () => Promise<void>;
  handleCancelBiometricModal: () => void;
}

export const AttendanceModalsAndSheets: React.FC<AttendanceModalsAndSheetsProps> = ({
  embeddedMobile,
  lang,
  activeSchoolId,
  currentUser,
  school,
  campusGates,
  effectiveRole,
  isSchoolAdmin,
  isStaffUser,
  isRestrictedViewer,
  students,
  teachers,
  scopedStudents,
  subTab,
  setSubTab,
  setLeaveFormStep,
  onRecordAttendance,
  checkinSuccessFeedback,
  setCheckinSuccessFeedback,
  showRapidScanner,
  setShowRapidScanner,
  showGpsAdminModal,
  setShowGpsAdminModal,
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
  setShowQuickRosterSheet,
  showQuickRosterSheet,
  rosterTodayStats,
  rosterToast,
  rosterSheetQuery,
  setRosterSheetQuery,
  rosterGradeOptions,
  rosterSheetGradeFilter,
  setRosterSheetGradeFilter,
  filteredRosterStudents,
  todayAttendanceByStudent,
  handleQuickRosterCheckin,
  handleSelectRosterStudentForCurrentTab,
  showIdentitySheet,
  setShowIdentitySheet,
  activePersonName,
  activePersonRole,
  activePersonId,
  activePersonDefaultAvatar,
  isSelfCheckin,
  setAttendanceMode,
  effectiveUserType,
  setActiveUserType,
  selectedStudentId,
  setSelectedStudentId,
  selectedTeacherId,
  setSelectedTeacherId,
  showGeofenceSheet,
  setShowGeofenceSheet,
  normalizedGates,
  selectedGate,
  setSelectedGateId,
  gpsStatusShortLabel,
  handleRefreshGps,
  isGpsLoading,
  gpsError,
  nfcDrawerMode,
  setNfcDrawerMode,
  nfcBindings,
  setNfcBindings,
  nfcRecentLogs,
  handleProcessNfcCardInput,
  showBiometricUnlockModal,
  userPasskey,
  biometricError,
  biometricBusy,
  handleBiometricVerify,
  handleCancelBiometricModal,
}) => {
  return (
    <>
      {/* SUCCESS CONFIRMATION MODAL & LINE FLEX MESSAGE PREVIEW POPUP */}
      {checkinSuccessFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-card)] text-[var(--color-text-title)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-[var(--color-border)] text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 mx-auto flex items-center justify-center shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span
                className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold border ${
                  checkinSuccessFeedback.checkType === 'check_in'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    : 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                }`}
              >
                {checkinSuccessFeedback.checkType === 'check_in'
                  ? 'เช็คชื่อเข้าโรงเรียนสำเร็จ'
                  : 'เช็คชื่อออกจากโรงเรียนสำเร็จ'}
              </span>
              <h3 className="text-base font-semibold text-[var(--color-text-title)] pt-1">
                {checkinSuccessFeedback.userName}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">{checkinSuccessFeedback.userRole}</p>
            </div>

            {/* Captured Selfie Snapshot preview */}
            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-48 mx-auto border-2 border-[var(--color-border)] bg-[var(--color-card-subtle)] shadow-sm">
              <img src={checkinSuccessFeedback.photoUrl} alt="Verified snapshot" className="w-full h-full object-cover" />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 p-1 rounded-lg bg-black/80 text-white text-[9px] font-mono flex items-center justify-between">
                <span>{checkinSuccessFeedback.gateName}</span>
                <span>{checkinSuccessFeedback.time} น.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCheckinSuccessFeedback(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              ตกลงและปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Continuous Rapid Scanner Modal */}
      <ContinuousRapidScannerModal
        isOpen={showRapidScanner}
        onClose={() => setShowRapidScanner(false)}
        students={students}
        teachers={teachers}
        schoolId={activeSchoolId}
        currentUser={currentUser}
        onRecordAttendance={onRecordAttendance}
        lang={lang}
      />

      {/* Admin GPS & Gates Management Modal — Strictly School Admin Only */}
      {isSchoolAdmin && showGpsAdminModal && school && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-[var(--color-card)] rounded-3xl p-4 sm:p-6 max-w-4xl w-full border border-[var(--color-border)] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="text-base font-bold text-[var(--color-text-title)]">
                  ตั้งค่าและแก้ไขพิกัดจุดเช็คชื่อโรงเรียน (School GPS &amp; Gates Management)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsAdminModal(false)}
                className="p-1.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] cursor-pointer"
                aria-label="ปิดหน้าต่างตั้งค่าพิกัด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <SchoolGpsSettingsCard
              activeSchool={school}
              campusGates={campusGates}
              currentRole={effectiveRole}
              lang={lang}
              onUpdateCampusGates={onUpdateCampusGates || (() => {})}
              onSaveCampusGates={onSaveCampusGates}
              onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
            />
          </div>
        </div>
      )}

      {/* Quick action toolbar rendered in-flow via AttendanceQuickActionBar so it never overlaps pagination */}

      {/* STUDENT ROSTER & QUICK CHECK-IN BOTTOM SHEET */}
      <MobileBottomSheet
        isOpen={showQuickRosterSheet}
        onClose={() => setShowQuickRosterSheet(false)}
        title={
          isRestrictedViewer
            ? lang === 'th'
              ? 'รายชื่อและสถานะเช็คชื่อของคุณ'
              : 'Your Attendance Status'
            : lang === 'th'
              ? 'รายชื่อนักเรียน & เช็คชื่อ'
              : 'Student Roster & Check-in'
        }
        subtitle={
          lang === 'th'
            ? `มา ${rosterTodayStats.checkedIn} · สาย ${rosterTodayStats.late} · ยังไม่เช็ค ${rosterTodayStats.pending} (จาก ${scopedStudents.length} คน)`
            : `${rosterTodayStats.checkedIn} present · ${rosterTodayStats.late} late · ${rosterTodayStats.pending} pending`
        }
      >
        <div className="space-y-3">
          {rosterToast && (
            <div
              role="status"
              className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{rosterToast}</span>
            </div>
          )}

          {scopedStudents.length > 1 && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rosterSheetQuery}
                  onChange={(e) => setRosterSheetQuery(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาชื่อ รหัส หรือห้อง...' : 'Search name, ID, or room...'}
                  className="w-full min-h-[44px] pl-9 pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {rosterSheetQuery && (
                  <button
                    type="button"
                    onClick={() => setRosterSheetQuery('')}
                    aria-label={lang === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {rosterGradeOptions.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setRosterSheetGradeFilter('all')}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                      rosterSheetGradeFilter === 'all'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                    }`}
                  >
                    {lang === 'th' ? 'ทุกชั้น' : 'All'}
                  </button>
                  {rosterGradeOptions.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setRosterSheetGradeFilter(g)}
                      className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                        rosterSheetGradeFilter === g
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredRosterStudents.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
              {lang === 'th' ? 'ไม่พบรายชื่อนักเรียนที่ค้นหา' : 'No matching students found.'}
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredRosterStudents.slice(0, 40).map((st) => {
                const todayRec = todayAttendanceByStudent.get(st.id);
                const statusLabel = !todayRec
                  ? lang === 'th'
                    ? 'ยังไม่เช็คชื่อ'
                    : 'Pending'
                  : todayRec.status === 'present'
                    ? lang === 'th'
                      ? `มาเรียน · ${todayRec.time}`
                      : `Present · ${todayRec.time}`
                    : todayRec.status === 'late'
                      ? lang === 'th'
                        ? `มาสาย · ${todayRec.time}`
                        : `Late · ${todayRec.time}`
                      : lang === 'th'
                        ? 'ลา/ขาด'
                        : todayRec.status;

                const statusCls = !todayRec
                  ? 'text-[var(--color-text-muted)]'
                  : todayRec.status === 'present'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : todayRec.status === 'late'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400';

                return (
                  <div key={st.id} className="py-2.5 flex items-center justify-between gap-2 min-h-[60px]">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={st.avatarUrl}
                        alt={st.firstNameTh}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0 bg-[var(--color-card-subtle)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {st.firstNameTh} {st.lastNameTh}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                          {st.studentIdNumber} · {st.gradeLevel}/{st.room}
                        </p>
                        <p className={`text-[11px] font-semibold truncate tabular-nums ${statusCls}`}>{statusLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isStaffUser ? (
                        <>
                          {!todayRec && (
                            <button
                              type="button"
                              onClick={() => handleQuickRosterCheckin(st, 'present')}
                              className="min-h-[44px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>{lang === 'th' ? 'เช็คเข้า' : 'Check in'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectRosterStudentForCurrentTab(st)}
                            className="min-h-[44px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {subTab === 'period_checkin'
                              ? lang === 'th'
                                ? 'สลับคาบ'
                                : 'Toggle'
                              : lang === 'th'
                                ? 'เลือก'
                                : 'Select'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectRosterStudentForCurrentTab(st)}
                          className="min-h-[44px] px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          {lang === 'th' ? 'เช็คชื่อ' : 'Check in'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: MOBILE IDENTITY & PROXY SWITCHER */}
      <MobileBottomSheet
        isOpen={showIdentitySheet}
        onClose={() => setShowIdentitySheet(false)}
        title={
          isRestrictedViewer
            ? lang === 'th'
              ? 'บัญชีเช็คชื่อ'
              : 'Check-in Account'
            : lang === 'th'
              ? 'เลือกบัญชีผู้เช็คชื่อ'
              : 'Select Check-in Account'
        }
        subtitle={activePersonName}
      >
        <div className="space-y-4">
          {!isRestrictedViewer && (
            <div className="seg-tab-group w-full flex">
              <button
                type="button"
                data-active={isSelfCheckin}
                onClick={() => setAttendanceMode('self')}
                className="seg-tab-btn flex-1 text-center"
              >
                {lang === 'th' ? 'บัญชีฉัน' : 'My Account'}
              </button>
              <button
                type="button"
                data-active={!isSelfCheckin}
                onClick={() => setAttendanceMode('proxy')}
                className="seg-tab-btn flex-1 text-center"
              >
                {lang === 'th' ? 'สแกนแทน' : 'Proxy Check-in'}
              </button>
            </div>
          )}

          {!isSelfCheckin && (
            <div className="space-y-3">
              <div className="seg-tab-group w-full flex">
                <button
                  type="button"
                  data-active={effectiveUserType === 'student'}
                  onClick={() => setActiveUserType('student')}
                  className="seg-tab-btn flex-1 text-center"
                >
                  {lang === 'th' ? 'นักเรียน' : 'Student'}
                </button>
                <button
                  type="button"
                  data-active={effectiveUserType === 'teacher'}
                  onClick={() => setActiveUserType('teacher')}
                  className="seg-tab-btn flex-1 text-center"
                >
                  {lang === 'th' ? 'ครู / บุคลากร' : 'Teacher / Staff'}
                </button>
              </div>
              {effectiveUserType === 'student' ? (
                <select
                  aria-label="เลือกนักเรียน"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                >
                  {scopedStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber}) - {st.gradeLevel} {st.room}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  aria-label="เลือกครู"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                >
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.fullNameTh} ({tc.teacherIdNumber}) - {tc.department}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center gap-3">
            <img
              src={activePersonDefaultAvatar}
              alt={activePersonName}
              className="w-11 h-11 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="type-card-title truncate">{activePersonName}</p>
              <p className="type-meta truncate">{activePersonRole}</p>
              <p className="type-meta font-mono truncate">{activePersonId}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIdentitySheet(false)}
            className="w-full min-h-[44px] rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs cursor-pointer"
          >
            {lang === 'th' ? 'กลับไปหน้ากล้อง' : 'Back to Camera'}
          </button>
        </div>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: MOBILE GEOFENCE & GPS STATUS */}
      <MobileBottomSheet
        isOpen={showGeofenceSheet}
        onClose={() => setShowGeofenceSheet(false)}
        title={
          isSchoolAdmin
            ? lang === 'th'
              ? `จุดเช็คชื่อ GPS (${normalizedGates.length})`
              : `GPS Check-in Gates (${normalizedGates.length})`
            : lang === 'th'
              ? 'สถานะพิกัด GPS เช็คชื่อ'
              : 'GPS Check-in Status'
        }
        subtitle={gpsStatusShortLabel}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={handleRefreshGps} className="btn-tool-neutral px-3 py-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'อัปเดตพิกัด GPS' : 'Refresh GPS'}</span>
            </button>
            {isSchoolAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowGeofenceSheet(false);
                  setShowGpsAdminModal(true);
                }}
                className="btn-tool-neutral px-3 py-2"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ตั้งค่าจุดประตู' : 'Manage Gates'}</span>
              </button>
            )}
          </div>

          {gpsError && (
            <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 text-xs">
              {gpsError}
            </div>
          )}

          {!isSchoolAdmin && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {lang === 'th'
                ? 'พิกัด GPS รัศมี และจุดประตูเช็คชื่อทั้งหมดกำหนดโดยผู้ดูแลระบบของโรงเรียน'
                : 'GPS coordinates, radius, and check-in gates are managed by your school administrator.'}
            </p>
          )}

          {normalizedGates.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] text-center space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-title)]">
                {lang === 'th' ? 'โรงเรียนยังไม่ได้ตั้งค่าพิกัด GPS เช็คชื่อ' : 'School GPS coordinates not configured'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {isSchoolAdmin
                  ? lang === 'th'
                    ? 'กดปุ่ม "ตั้งค่าจุดประตู" ด้านบนเพื่อกำหนดพิกัดจริงของโรงเรียน'
                    : 'Tap "Manage Gates" above to configure real school coordinates.'
                  : lang === 'th'
                    ? 'กรุณาแจ้งผู้ดูแลระบบโรงเรียนให้กำหนดพิกัดโรงเรียนก่อนเช็คชื่อ'
                    : 'Please ask your school administrator to configure campus GPS coordinates.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              {normalizedGates.map((gate) => {
                const isSelected = selectedGate?.id === gate.id;
                return normalizedGates.length > 1 || isSchoolAdmin ? (
                  <button
                    key={gate.id}
                    type="button"
                    onClick={() => setSelectedGateId(gate.id)}
                    className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-[var(--color-primary-light)]' : 'bg-[var(--color-card)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{gate.nameTh}</p>
                      <p className="type-meta font-mono truncate">
                        รัศมี {gate.radiusMeters} ม.
                        {isSchoolAdmin ? ` · ${Number(gate.lat).toFixed(5)}, ${Number(gate.lng).toFixed(5)}` : ''}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />}
                  </button>
                ) : (
                  <div
                    key={gate.id}
                    className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 bg-[var(--color-primary-light)]"
                  >
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{gate.nameTh}</p>
                      <p className="type-meta tabular-nums truncate">
                        รัศมีเช็คชื่อที่โรงเรียนกำหนด {gate.radiusMeters} ม.
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: MOBILE NFC QUICK TAP / RECENT LOGS */}
      <MobileBottomSheet
        isOpen={Boolean(nfcDrawerMode)}
        onClose={() => setNfcDrawerMode(null)}
        title={
          nfcDrawerMode === 'quick_tap'
            ? lang === 'th'
              ? `แตะบัตรด่วน (${nfcBindings.length} ใบ)`
              : `Quick ID Tap (${nfcBindings.length})`
            : lang === 'th'
              ? `ประวัติแตะบัตรล่าสุด (${nfcRecentLogs.length})`
              : `Recent NFC Check-ins (${nfcRecentLogs.length})`
        }
      >
        {nfcDrawerMode === 'quick_tap' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {teachers.slice(0, 4).map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => {
                    handleProcessNfcCardInput(tc.nfcCardUid || tc.teacherIdNumber);
                    setNfcDrawerMode(null);
                  }}
                  className="min-h-[42px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Nfc className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span className="truncate max-w-[140px]">{tc.fullNameTh}</span>
                </button>
              ))}
              {students.slice(0, 6).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    handleProcessNfcCardInput(st.nfcCardUid || st.studentIdNumber);
                    setNfcDrawerMode(null);
                  }}
                  className="min-h-[42px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Nfc className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[140px]">
                    {st.firstNameTh} {st.lastNameTh}
                  </span>
                </button>
              ))}
            </div>

            {nfcBindings.length > 0 && (
              <div className="pt-3 border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {nfcBindings.map((b) => (
                  <div key={b.normalizedUid} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="type-card-title truncate">{b.label}</p>
                      <p className="type-meta font-mono truncate">
                        {b.uid} · {b.displayId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNfcBindings(removeNfcBinding(activeSchoolId, b.uid))}
                      className="btn-icon-tool text-rose-600 dark:text-rose-300"
                      aria-label={lang === 'th' ? 'ยกเลิกการผูกบัตร' : 'Unbind'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : nfcRecentLogs.length === 0 ? (
          <p className="type-meta text-center py-6">
            {lang === 'th' ? 'ยังไม่มีรายการแตะบัตร NFC ในเซสชันนี้' : 'No NFC taps recorded in this session yet.'}
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {nfcRecentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="type-card-title truncate">{log.name}</p>
                  <p className="type-meta truncate">
                    {log.roleLabel} · UID {log.uid} · {log.gateName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`type-label ${
                      log.checkType === 'check_in'
                        ? log.status === 'late'
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                        : 'text-[var(--color-primary-text)]'
                    }`}
                  >
                    {log.checkType === 'check_in'
                      ? log.status === 'late'
                        ? 'เข้า · สาย'
                        : 'เข้าโรงเรียน'
                      : 'ออกโรงเรียน'}
                  </span>
                  <p className="type-meta font-mono">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileBottomSheet>

      {/* Biometric Verification Modal for Quick-Action Attendance */}
      {showBiometricUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center">
              <Fingerprint className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ยืนยันตัวตนก่อนเช็คชื่อด่วน' : 'Biometric Verification Required'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? `แตะเพื่อยืนยัน ${userPasskey?.deviceLabel || 'FaceID / TouchID'} สำหรับปลดล็อกสิทธิ์เจ้าหน้าที่ 15 นาที`
                  : `Verify ${userPasskey?.deviceLabel || 'FaceID / TouchID'} to unlock staff quick attendance for 15 minutes.`}
              </p>
            </div>

            {biometricError && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs text-left"
              >
                {biometricError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={biometricBusy}
                onClick={handleBiometricVerify}
                className="w-full min-h-[46px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Fingerprint className="w-4 h-4" />
                <span>
                  {biometricBusy
                    ? lang === 'th'
                      ? 'กำลังตรวจสแกนไบโอเมตริกซ์...'
                      : 'Verifying...'
                    : lang === 'th'
                      ? 'ยืนยันด้วย FaceID / TouchID'
                      : 'Verify with FaceID / TouchID'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCancelBiometricModal}
                className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-semibold text-xs cursor-pointer"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface AttendanceQuickActionBarProps {
  lang: AppLanguage;
  direction?: 'up' | 'down';
  embeddedMobile?: boolean;
  isStaffUser: boolean;
  subTab: AttendanceSubTab;
  setSubTab: (tab: AttendanceSubTab) => void;
  setLeaveFormStep: (step: 1 | 2) => void;
  fabMenuOpen: boolean;
  setFabMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  runWithBiometricGuard: (action: () => void) => void;
  setShowRapidScanner: (val: boolean) => void;
  setShowQuickRosterSheet: (val: boolean) => void;
  handlePrimaryFabCheckin: () => void;
  isSavingAttendance: boolean;
  capturedPhotoUrl: string | null;
  matchedProxyStudent: Student | undefined;
  primaryFabLabel: string;
}

export const AttendanceQuickActionBar: React.FC<AttendanceQuickActionBarProps> = ({
  lang,
  direction = 'down',
  embeddedMobile = false,
  isStaffUser,
  subTab,
  setSubTab,
  setLeaveFormStep,
  fabMenuOpen,
  setFabMenuOpen,
  runWithBiometricGuard,
  setShowRapidScanner,
  setShowQuickRosterSheet,
  handlePrimaryFabCheckin,
  isSavingAttendance,
  capturedPhotoUrl,
  matchedProxyStudent,
  primaryFabLabel,
}) => {
  const opensUp = direction === 'up';

  const quickToolsDrawer = fabMenuOpen ? (
    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1.5 w-full animate-in fade-in duration-150">
      <button
        type="button"
        onClick={() => {
          setFabMenuOpen(false);
          setSubTab('nfc_tap');
        }}
        className="min-h-[36px] px-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[var(--color-card-subtle)]"
      >
        <Nfc className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
        <span>{lang === 'th' ? 'แตะบัตร NFC' : 'NFC Card Tap'}</span>
      </button>

      {isStaffUser && (
        <button
          type="button"
          onClick={() => {
            setFabMenuOpen(false);
            runWithBiometricGuard(() => setShowRapidScanner(true));
          }}
          className="min-h-[36px] px-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[var(--color-card-subtle)]"
        >
          <ScanLine className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
          <span>{lang === 'th' ? 'สแกน QR รัว (1วิ/คน)' : 'Rapid QR Scanner'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setFabMenuOpen(false);
          setSubTab('period_checkin');
        }}
        className="min-h-[36px] px-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[var(--color-card-subtle)]"
      >
        <QrCode className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
        <span>{lang === 'th' ? 'เช็คชื่อเข้า/ออกคาบเรียน (QR)' : 'Period Check-in / Out'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setFabMenuOpen(false);
          setSubTab('leave_request');
          setLeaveFormStep(1);
        }}
        className="min-h-[36px] px-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] shadow-2xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[var(--color-card-subtle)]"
      >
        <FileText className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
        <span>{lang === 'th' ? 'ยื่น / ตรวจใบลา' : 'Leave Requests'}</span>
      </button>
    </div>
  ) : null;

  return (
    <div
      className={
        embeddedMobile
          ? 'shrink-0 flex flex-col items-end gap-1 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md px-2 py-1.5 rounded-xl'
          : 'shrink-0 flex flex-col items-end gap-1'
      }
    >
      {opensUp && quickToolsDrawer}

      <div className="flex flex-wrap items-center justify-end gap-1.5 bg-[var(--color-card)] p-1 rounded-xl border border-[var(--color-border)] shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setFabMenuOpen(false);
            setShowQuickRosterSheet(true);
          }}
          aria-label={lang === 'th' ? 'ดูรายชื่อนักเรียน' : 'Open Student Roster'}
          className="min-h-[34px] px-2.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
        >
          <Users className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
          <span>{lang === 'th' ? 'รายชื่อ' : 'Roster'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrimaryFabCheckin}
          disabled={isSavingAttendance}
          className="min-h-[34px] px-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
        >
          {subTab === 'selfie_mobile' && !capturedPhotoUrl ? (
            <Camera className="w-3.5 h-3.5 shrink-0" />
          ) : subTab === 'nfc_tap' ? (
            <Nfc className="w-3.5 h-3.5 shrink-0" />
          ) : subTab === 'teacher_proxy' && !matchedProxyStudent ? (
            <QrCode className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{primaryFabLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => setFabMenuOpen((prev) => !prev)}
          aria-expanded={fabMenuOpen}
          aria-label={lang === 'th' ? 'เมนูลัดเช็คชื่อ' : 'Quick attendance tools'}
          className="min-h-[34px] min-w-[34px] rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <Plus className={`w-4 h-4 transition-transform duration-150 ${fabMenuOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {!opensUp && quickToolsDrawer}
    </div>
  );
};
