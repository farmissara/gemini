import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Pin,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type {
  Announcement,
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  Course,
  GradeRecord,
  GradingSystem,
  PlayerScore,
  PortfolioItem,
  School,
  SchoolPeriodTime,
  Student,
  Teacher,
  ThemePalette,
  TimetableSlot,
  UserRole,
} from '../../types';
import {
  enrollBiometricPasskey,
  getPasskeyForUser,
  getWebAuthnSupportInfo,
  removeEnrolledPasskey,
  updatePasskeyPreferences,
  verifyBiometricPasskey,
  type EnrolledBiometricPasskey,
  type WebAuthnSupportInfo,
} from '../../lib/webAuthn';
import { DigitalIdCardView } from '../../views/DigitalIdCardView';
import { PortfolioView } from '../../views/PortfolioView';
import { CareerQuestView } from '../../views/CareerQuestView';
import { PagedList } from '../../components/PagedList';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import type { NavTab } from '../../components/layout/Sidebar';
import { splitAnnouncementIntoPages, type ActiveGameView, type MobileTab } from './types';

interface MobileProfileTabProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  isLight: boolean;
  setThemePalette: (palette: ThemePalette) => void;
  profilePage: number;
  setProfilePage: (page: number) => void;
  canViewDigitalId: boolean;
  canOpenPortfolio: boolean;
  myOwnPortfolioCount: number;
  isRestrictedViewer: boolean;
  ownStudent: Student | undefined;
  linkedStudents: Student[];
  students: Student[];
  teachers: Teacher[];
  courses?: Course[];
  timetableSlots?: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  onUpdateStudent?: (student: Student) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onUpdateOwnAvatar?: (avatarUrl: string) => void;
  onOpenProfileModal: () => void;
  onOpenOnboardingTutor?: () => void;
  onBiometricLock?: () => void;
  onSwitchToDesktopMode: () => void;
  onLogout: () => void;
  onOpenPortfolio: () => void;
}

export const MobileProfileTab: React.FC<MobileProfileTabProps> = ({
  currentUser,
  activeSchool,
  currentRole,
  lang,
  setLang,
  isLight,
  setThemePalette,
  profilePage,
  setProfilePage,
  canViewDigitalId,
  canOpenPortfolio,
  myOwnPortfolioCount,
  isRestrictedViewer,
  ownStudent,
  linkedStudents,
  students,
  teachers,
  courses = [],
  timetableSlots = [],
  schoolPeriods = [],
  onUpdateStudent,
  onUpdateTeacher,
  onUpdateOwnAvatar,
  onOpenProfileModal,
  onOpenOnboardingTutor,
  onBiometricLock,
  onSwitchToDesktopMode,
  onLogout,
  onOpenPortfolio,
}) => {
  const [passkey, setPasskey] = useState<EnrolledBiometricPasskey | null>(() =>
    getPasskeyForUser(currentUser?.id)
  );
  const [webAuthnInfo, setWebAuthnInfo] = useState<WebAuthnSupportInfo | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState<string | null>(null);
  const [bioErr, setBioErr] = useState<string | null>(null);

  useEffect(() => {
    setPasskey(getPasskeyForUser(currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    getWebAuthnSupportInfo()
      .then(setWebAuthnInfo)
      .catch((err) => {
        console.warn('[WebAuthn] Failed to check support info:', err);
      });
  }, []);

  const handleEnrollPasskey = async () => {
    if (!currentUser) return;
    setBioBusy(true);
    setBioErr(null);
    setBioMsg(null);
    try {
      const enrolled = await enrollBiometricPasskey({
        userId: currentUser.id,
        email: currentUser.email,
        fullNameTh: currentUser.fullNameTh,
        fullNameEn: currentUser.fullNameEn,
        role: currentUser.role,
        schoolId: activeSchool.id,
        protectQuickAttendance:
          currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'teacher',
      });
      setPasskey(enrolled);
      setBioMsg(
        lang === 'th' ? `ลงทะเบียน ${enrolled.deviceLabel} สำเร็จ` : `Enrolled ${enrolled.deviceLabel}`
      );
    } catch (err) {
      setBioErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBioBusy(false);
    }
  };

  const handleTestPasskey = async () => {
    if (!currentUser) return;
    setBioBusy(true);
    setBioErr(null);
    setBioMsg(null);
    try {
      const res = await verifyBiometricPasskey({ userId: currentUser.id });
      setPasskey(res.passkey);
      setBioMsg(lang === 'th' ? 'ยืนยัน FaceID / TouchID สำเร็จ ✓' : 'Biometric verification passed');
    } catch (err) {
      setBioErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBioBusy(false);
    }
  };

  const [accountTab, setAccountTab] = useState<'account' | 'security'>('account');
  const effectiveProfileSection: 'id' | 'account' | 'security' =
    canViewDigitalId && profilePage === 0 ? 'id' : accountTab;

  const accountTabs: Array<{ id: 'id' | 'account' | 'security'; label: string }> = [
    ...(canViewDigitalId
      ? [{ id: 'id' as const, label: lang === 'th' ? 'บัตรดิจิทัล' : 'Digital ID' }]
      : []),
    { id: 'account' as const, label: lang === 'th' ? 'บัญชี & ตั้งค่า' : 'Account' },
    { id: 'security' as const, label: lang === 'th' ? 'ความปลอดภัย' : 'Security' },
  ];

  const userDisplayName =
    (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email ||
    (lang === 'th' ? 'ผู้ใช้งาน' : 'User');

  return (
    <div className="space-y-3 animate-in fade-in duration-200 pb-4">
      {/* Clean Tab Bar */}
      <div
        role="tablist"
        aria-label={lang === 'th' ? 'หมวดหน้าบัญชี' : 'Account sections'}
        className={`grid gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] ${
          accountTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {accountTabs.map((t) => {
          const isSelected = effectiveProfileSection === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                if (t.id === 'id') {
                  setProfilePage(0);
                } else {
                  setAccountTab(t.id);
                  setProfilePage(1);
                }
              }}
              className={`min-h-[36px] px-2 rounded-lg text-xs font-semibold whitespace-nowrap truncate transition cursor-pointer ${
                isSelected
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] border border-transparent'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {effectiveProfileSection === 'id' && canViewDigitalId && (
        <DigitalIdCardView
          students={
            currentRole === 'student'
              ? ownStudent
                ? [ownStudent]
                : []
              : isRestrictedViewer
                ? linkedStudents
                : students
          }
          teachers={teachers}
          school={activeSchool}
          lang={lang}
          currentRole={currentRole}
          currentUser={currentUser}
          timetableSlots={timetableSlots}
          courses={courses}
          schoolPeriods={schoolPeriods}
          onUpdateStudent={onUpdateStudent}
          onUpdateTeacher={onUpdateTeacher}
          onUpdateOwnAvatar={onUpdateOwnAvatar}
        />
      )}

      {/* TAB: ACCOUNT & PREFERENCES (Grouped Clean Rows) */}
      {effectiveProfileSection === 'account' && (
        <div className="space-y-3 text-xs">
          {/* Compact Profile Identity Strip */}
          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={userDisplayName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-center font-bold text-xs shrink-0">
                  {userDisplayName.trim().slice(0, 2).toUpperCase() || <User className="w-4 h-4" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-title)] truncate">{userDisplayName}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {currentUser?.email || activeSchool.nameTh}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold text-[11px] shrink-0 cursor-pointer transition"
            >
              {lang === 'th' ? 'แก้ไข' : 'Edit'}
            </button>
          </div>

          {/* Grouped Settings List */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--color-text-title)]">
                {lang === 'th' ? 'โหมดสี' : 'Theme'}
              </span>
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setThemePalette('light_warm')}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                    isLight
                      ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-2xs border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'สว่าง' : 'Light'}
                </button>
                <button
                  type="button"
                  onClick={() => setThemePalette('sapphire')}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                    !isLight
                      ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-2xs border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'มืด' : 'Dark'}
                </button>
              </div>
            </div>

            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ภาษา' : 'Language'}
              </span>
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setLang('th')}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                    lang === 'th'
                      ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-2xs border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  ไทย
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                    lang === 'en'
                      ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-2xs border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {currentRole === 'student' && canOpenPortfolio && (
              <button
                type="button"
                onClick={onOpenPortfolio}
                className="w-full px-3 py-2.5 hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer transition"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>
                    {lang === 'th'
                      ? `แฟ้มผลงาน (${myOwnPortfolioCount})`
                      : `Portfolio (${myOwnPortfolioCount})`}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            )}

            {onOpenOnboardingTutor && currentRole !== 'student' && (
              <button
                type="button"
                onClick={onOpenOnboardingTutor}
                className="w-full px-3 py-2.5 hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer transition"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'th' ? 'คู่มือและติวเตอร์ระบบ' : 'System Guide'}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            )}

            <button
              type="button"
              onClick={onSwitchToDesktopMode}
              className="w-full px-3 py-2.5 hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer transition"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Laptop className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'สลับมุมมองคอมพิวเตอร์' : 'Desktop View'}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
          </div>

          <PWAInstallButton lang={lang} variant="sidebar" />

          <button
            type="button"
            onClick={onLogout}
            className="w-full h-10 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 font-semibold flex items-center justify-center gap-2 transition hover:bg-rose-100 dark:hover:bg-rose-900 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
          </button>
        </div>
      )}

      {/* TAB: SECURITY & BIOMETRICS */}
      {effectiveProfileSection === 'security' && (
        <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-bold text-[var(--color-text-title)] truncate">
                {lang === 'th' ? 'สแกน FaceID / TouchID' : 'Biometric Security'}
              </span>
            </div>
            {passkey && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                {lang === 'th' ? 'เปิดใช้งาน' : 'Active'}
              </span>
            )}
          </div>

          {bioMsg && (
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{bioMsg}</p>
          )}
          {bioErr && (
            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{bioErr}</p>
          )}

          {!passkey ? (
            <div className="space-y-2.5">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {webAuthnInfo
                  ? lang === 'th'
                    ? webAuthnInfo.reasonTh
                    : webAuthnInfo.reasonEn
                  : lang === 'th'
                    ? 'ใช้สแกนใบหน้าหรือลายนิ้วมือเพื่อยืนยันตัวตนและล็อกเช็คชื่อด่วน'
                    : 'Use FaceID/TouchID for fast login and quick attendance lock'}
              </p>
              <button
                type="button"
                disabled={bioBusy || webAuthnInfo?.supported === false}
                onClick={handleEnrollPasskey}
                className="w-full h-10 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {bioBusy
                    ? lang === 'th'
                      ? 'กำลังลงทะเบียน...'
                      : 'Enrolling...'
                    : lang === 'th'
                      ? 'ผูก FaceID / TouchID'
                      : 'Enroll FaceID / TouchID'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11px] text-[var(--color-text-muted)]">{passkey.deviceLabel}</p>

              {['admin', 'super_admin', 'teacher'].includes(currentRole) && (
                <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                  <span className="text-[11px] font-semibold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ล็อกเมนูเช็คชื่อด่วน' : 'Lock Quick Attendance'}
                  </span>
                  <input
                    type="checkbox"
                    checked={passkey.protectQuickAttendance}
                    onChange={(e) => {
                      if (!currentUser) return;
                      const updated = updatePasskeyPreferences(currentUser.id, {
                        protectQuickAttendance: e.target.checked,
                      });
                      setPasskey(updated);
                    }}
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                </label>
              )}

              <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
                <span className="text-[11px] font-semibold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ยืนยันตัวตนหน้าเข้าสู่ระบบ' : 'Enable Sign-In Biometrics'}
                </span>
                <input
                  type="checkbox"
                  checked={passkey.biometricLoginEnabled}
                  onChange={(e) => {
                    if (!currentUser) return;
                    const updated = updatePasskeyPreferences(currentUser.id, {
                      biometricLoginEnabled: e.target.checked,
                    });
                    setPasskey(updated);
                  }}
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={bioBusy}
                  onClick={handleTestPasskey}
                  className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{bioBusy ? '...' : lang === 'th' ? 'ทดสอบสแกน' : 'Test'}</span>
                </button>

                {onBiometricLock && (
                  <button
                    type="button"
                    onClick={onBiometricLock}
                    className="flex-1 h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ล็อกหน้าจอด่วน' : 'Lock Screen'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) return;
                    removeEnrolledPasskey(currentUser.id);
                    setPasskey(null);
                    setBioMsg(lang === 'th' ? 'ลบ Passkey แล้ว' : 'Passkey removed');
                  }}
                  className="h-9 px-3 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center justify-center cursor-pointer"
                  title={lang === 'th' ? 'ลบ Passkey ออกจากเครื่องนี้' : 'Remove Passkey'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MobileAnnouncementsTabProps {
  lang: AppLanguage;
  currentRole: UserRole;
  currentUser: AuthUser | null;
  scopedAnnouncements: Announcement[];
  selectedAnnouncement: Announcement | null;
  setSelectedAnnouncement: (ann: Announcement | null) => void;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onBackHome: () => void;
}

const ANNOUNCEMENT_CATEGORY_TH: Record<Announcement['category'], string> = {
  academic: 'วิชาการ',
  event: 'กิจกรรม',
  urgent: 'ด่วน',
  general: 'ทั่วไป',
};

export const MobileAnnouncementsTab: React.FC<MobileAnnouncementsTabProps> = ({
  lang,
  currentRole,
  currentUser,
  scopedAnnouncements,
  selectedAnnouncement,
  setSelectedAnnouncement,
  onAddAnnouncement,
  onBackHome,
}) => {
  const canCreate = ['teacher', 'admin', 'super_admin'].includes(currentRole) && Boolean(onAddAnnouncement);
  const [showForm, setShowForm] = useState(false);
  const [feedTab, setFeedTab] = useState<'all' | 'important'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'students' | 'parents' | 'teachers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('academic');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');
  const [pinned, setPinned] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const audienceScopedAnnouncements = scopedAnnouncements.filter((a) =>
    audienceFilter === 'all' ? true : a.targetAudience === audienceFilter || a.targetAudience === 'all'
  );
  const importantCount = audienceScopedAnnouncements.filter(
    (a) => a.pinned || a.category === 'urgent'
  ).length;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleAnnouncements = audienceScopedAnnouncements.filter((a) => {
    if (feedTab === 'important' && !a.pinned && a.category !== 'urgent') return false;
    if (!normalizedQuery) return true;
    return (
      a.title.toLowerCase().includes(normalizedQuery) ||
      a.content.toLowerCase().includes(normalizedQuery) ||
      a.author.toLowerCase().includes(normalizedQuery)
    );
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAnnouncement || !title.trim() || !content.trim()) return;
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      category,
      targetAudience,
      publishedAt: `${dateStr} ${nowTime}`,
      author: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
      authorRole: currentRole === 'teacher' ? 'ครูผู้สอน' : 'ผู้ดูแลระบบ',
      pinned,
      resendEmailSent: false,
    };
    onAddAnnouncement(newAnn);
    setTitle('');
    setContent('');
    setPinned(false);
    setShowForm(false);
    setToast(lang === 'th' ? 'เผยแพร่ประกาศเรียบร้อยแล้ว' : 'Announcement published');
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200 pb-4">
      {selectedAnnouncement ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedAnnouncement(null)}
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'th' ? 'กลับสู่รายการ' : 'Back to feed'}</span>
            </button>
            <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              {selectedAnnouncement.publishedAt}
            </span>
          </div>
          <article className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2">
            <p className="text-[11px] font-semibold text-[var(--color-primary-text)]">
              {lang === 'th'
                ? ANNOUNCEMENT_CATEGORY_TH[selectedAnnouncement.category] || selectedAnnouncement.category
                : selectedAnnouncement.category}
              {selectedAnnouncement.pinned ? (lang === 'th' ? ' · ปักหมุด' : ' · Pinned') : ''}
            </p>
            <h2 className="text-base font-extrabold text-[var(--color-text-title)] leading-snug">
              {selectedAnnouncement.title}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {selectedAnnouncement.author} · {selectedAnnouncement.authorRole}
            </p>
            <PagedList
              items={splitAnnouncementIntoPages(selectedAnnouncement.content)}
              pageSize={1}
              previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
              nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
              paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
              renderItem={(pageText, pageIndex) => (
                <p
                  key={pageIndex}
                  className="mt-2 pt-3 border-t border-[var(--color-border)] whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-body)]"
                >
                  {pageText}
                </p>
              )}
            />
          </article>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'th' ? 'หน้าหลัก' : 'Home'}</span>
            </button>
            <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">
              {lang === 'th' ? 'ประกาศและข่าวสาร' : 'Announcements'}
            </h2>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="min-h-[44px] px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
              >
                {showForm ? (lang === 'th' ? 'ปิด' : 'Close') : lang === 'th' ? '+ สร้างประกาศ' : '+ New'}
              </button>
            ) : (
              <span className="w-12" aria-hidden="true" />
            )}
          </div>

          {toast && (
            <div role="status" className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 text-xs font-semibold">
              {toast}
            </div>
          )}

          {showForm && canCreate && (
            <form onSubmit={handlePublish} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5 text-xs">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="หัวข้อประกาศ..."
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-semibold"
              />
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="รายละเอียดประกาศ..."
                className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Announcement['category'])}
                  className="min-h-[44px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                >
                  <option value="academic">วิชาการ</option>
                  <option value="general">ทั่วไป</option>
                  <option value="event">กิจกรรม</option>
                  <option value="urgent">ด่วน</option>
                </select>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as Announcement['targetAudience'])}
                  className="min-h-[44px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                >
                  <option value="all">ทุกคนในโรงเรียน</option>
                  <option value="students">นักเรียน</option>
                  <option value="parents">ผู้ปกครอง</option>
                  <option value="teachers">ครูและบุคลากร</option>
                </select>
              </div>
              <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
                <span className="font-semibold text-[var(--color-text-title)]">ปักหมุดไว้ด้านบน</span>
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
              </label>
              <button
                type="submit"
                disabled={!title.trim() || !content.trim()}
                className="w-full min-h-[44px] rounded-xl bg-[var(--color-primary)] text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                เผยแพร่ประกาศ
              </button>
            </form>
          )}

          {/* Clean 2-tab feed switcher */}
          <div
            role="tablist"
            aria-label={lang === 'th' ? 'ประเภทประกาศ' : 'Announcement feed'}
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'all'}
              onClick={() => setFeedTab('all')}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                feedTab === 'all'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] border border-transparent'
              }`}
            >
              {lang === 'th'
                ? `ข่าวสารทั้งหมด (${audienceScopedAnnouncements.length})`
                : `All (${audienceScopedAnnouncements.length})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'important'}
              onClick={() => setFeedTab('important')}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap tabular-nums flex items-center justify-center gap-1.5 ${
                feedTab === 'important'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] border border-transparent'
              }`}
            >
              <Pin className="w-3.5 h-3.5 shrink-0" />
              <span>
                {lang === 'th' ? `สำคัญ/ปักหมุด (${importantCount})` : `Important (${importantCount})`}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search
              className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาหัวข้อ หรือเนื้อหาประกาศ...' : 'Search announcements...'}
              aria-label={lang === 'th' ? 'ค้นหาประกาศ' : 'Search announcements'}
              className="w-full min-h-[44px] pl-10 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={lang === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                className="min-h-[44px] min-w-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Audience filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: lang === 'th' ? 'ทุกกลุ่ม' : 'All' },
                { id: 'students', label: lang === 'th' ? 'นักเรียน' : 'Students' },
                { id: 'parents', label: lang === 'th' ? 'ผู้ปกครอง' : 'Parents' },
                { id: 'teachers', label: lang === 'th' ? 'ครู' : 'Teachers' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAudienceFilter(f.id)}
                className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap transition ${
                  audienceFilter === f.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <PagedList
            items={visibleAnnouncements}
            pageSize={5}
            previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
            nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
            paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
            emptyState={
              <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                {normalizedQuery
                  ? lang === 'th'
                    ? 'ไม่พบประกาศที่ตรงกับคำค้นหา'
                    : 'No announcements match your search'
                  : lang === 'th'
                    ? 'ไม่มีประกาศในหมวดนี้'
                    : 'No announcements'}
              </p>
            }
            renderItem={(a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAnnouncement(a)}
                className={`w-full p-3.5 rounded-2xl border text-left space-y-1.5 transition active:scale-[0.99] cursor-pointer ${
                  a.pinned || a.category === 'urgent'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/25 hover:border-amber-400'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  <span
                    className={`font-semibold truncate ${
                      a.category === 'urgent'
                        ? 'text-rose-700 dark:text-rose-400'
                        : a.pinned
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-[var(--color-primary-text)]'
                    }`}
                  >
                    {lang === 'th' ? ANNOUNCEMENT_CATEGORY_TH[a.category] || a.category : a.category}
                    {a.pinned ? (lang === 'th' ? ' · ปักหมุด' : ' · Pinned') : ''}
                  </span>
                  <span className="shrink-0">{a.publishedAt}</span>
                </div>

                <h4 className="font-bold text-sm text-[var(--color-text-title)] leading-snug line-clamp-1">
                  {a.title}
                </h4>
                <p className="text-[var(--color-text-body)] leading-relaxed text-xs whitespace-pre-line line-clamp-2">
                  {a.content}
                </p>

                <div className="pt-1.5 border-t border-[var(--color-border)] flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--color-text-muted)] truncate">
                    {a.author} · {a.authorRole}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-bold text-[var(--color-primary-text)] shrink-0">
                    <span>{lang === 'th' ? 'อ่านทั้งหมด' : 'Read'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            )}
          />
        </>
      )}
    </div>
  );
};

interface MobilePortfolioTabProps {
  lang: AppLanguage;
  portfolioItems: PortfolioItem[];
  linkedStudents: Student[];
  teachers: Teacher[];
  scopedCourses: Course[];
  grades: GradeRecord[];
  playerScores: PlayerScore[];
  activeSchool: School;
  gradingSystem: GradingSystem;
  currentUser: AuthUser | null;
  onAddPortfolioItem?: (item: PortfolioItem) => void;
  onDeletePortfolioItem?: (itemId: string) => void;
  onOpenProfileModal: () => void;
  onBackHome: () => void;
}

export const MobilePortfolioTab: React.FC<MobilePortfolioTabProps> = ({
  lang,
  portfolioItems,
  linkedStudents,
  teachers,
  scopedCourses,
  grades,
  playerScores,
  activeSchool,
  gradingSystem,
  currentUser,
  onAddPortfolioItem,
  onDeletePortfolioItem,
  onOpenProfileModal,
  onBackHome,
}) => {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
          {lang === 'th' ? 'แฟ้มผลงานของฉัน' : 'My Portfolio'}
        </span>
      </div>
      <PortfolioView
        portfolioItems={portfolioItems}
        students={linkedStudents}
        teachers={teachers}
        courses={scopedCourses}
        grades={grades}
        playerScores={playerScores}
        school={activeSchool}
        gradingSystem={gradingSystem}
        currentUser={currentUser}
        lang={lang}
        onAddPortfolioItem={(item) => onAddPortfolioItem?.(item)}
        onDeletePortfolioItem={onDeletePortfolioItem}
        onOpenProfile={onOpenProfileModal}
        academicYear={activeSchool.academicYear}
      />
    </div>
  );
};

interface MobileCareerQuestTabProps {
  currentUser: AuthUser | null;
  currentRole: UserRole;
  activeSchool: School;
  students: Student[];
  scopedCourses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  portfolioItems: PortfolioItem[];
  playerScores: PlayerScore[];
  gradingSystem: GradingSystem;
  lang: AppLanguage;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onEquipCosmetic?: (payload: { frameId?: string; title?: string }) => void;
  onAddPortfolioItem?: (item: PortfolioItem) => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
  setActiveTab: (tab: MobileTab) => void;
  setActiveGameView: (view: ActiveGameView) => void;
}

export const MobileCareerQuestTab: React.FC<MobileCareerQuestTabProps> = ({
  currentUser,
  currentRole,
  activeSchool,
  students,
  scopedCourses,
  grades,
  attendance,
  portfolioItems,
  playerScores,
  gradingSystem,
  lang,
  onEarnRewards,
  onEquipCosmetic,
  onAddPortfolioItem,
  onJumpToDesktopTab,
  setActiveTab,
  setActiveGameView,
}) => {
  return (
    <div className="space-y-3 pb-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Career Quest AI</span>
      </div>
      <CareerQuestView
        currentUser={currentUser}
        school={activeSchool}
        students={students}
        courses={scopedCourses}
        grades={grades}
        attendance={attendance}
        portfolioItems={portfolioItems}
        playerScores={playerScores}
        gradingSystem={gradingSystem}
        lang={lang}
        onEarnRewards={onEarnRewards}
        onEquipCosmetic={onEquipCosmetic}
        onAddPortfolioItem={onAddPortfolioItem}
        onNavigate={(tab) => {
          if (tab === 'games') {
            setActiveTab('games');
            setActiveGameView('hub');
          } else if (tab === 'subject_labs') {
            setActiveTab('games');
            setActiveGameView('subject_labs');
          } else if (tab === 'boss_raid') {
            setActiveTab('games');
            setActiveGameView('boss_raid');
          } else if (tab === 'mobile_checkin') {
            setActiveTab('checkin');
          } else if (tab === 'homework') {
            setActiveTab('homework');
          } else if (tab === 'portfolio') {
            setActiveTab('portfolio');
          } else if (tab === 'gradebook') {
            setActiveTab(currentRole === 'student' ? 'student_grades' : 'gradebook');
          } else if (tab === 'timetable') {
            setActiveTab('timetable');
          } else if (onJumpToDesktopTab) {
            onJumpToDesktopTab(tab);
          }
        }}
      />
    </div>
  );
};
