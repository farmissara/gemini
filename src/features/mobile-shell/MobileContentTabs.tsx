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
  Sparkles,
  Trash2,
  User,
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
      .catch(() => {});
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

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-4">
      {/* Clean Top Segmented Toggle */}
      {canViewDigitalId && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setProfilePage(0)}
            className={`min-h-[40px] rounded-xl text-xs font-bold transition cursor-pointer ${
              profilePage === 0
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? 'บัตรดิจิทัล' : 'Digital ID'}
          </button>
          <button
            type="button"
            onClick={() => setProfilePage(1)}
            className={`min-h-[40px] rounded-xl text-xs font-bold transition cursor-pointer ${
              profilePage === 1
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? 'ตั้งค่าบัญชี' : 'Account Settings'}
          </button>
        </div>
      )}

      {canViewDigitalId && profilePage === 0 && (
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

      {/* Quick Profile Actions & Settings */}
      {(profilePage === 1 || !canViewDigitalId) && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-3">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)]">
            {lang === 'th' ? 'บัญชีและการตั้งค่า' : 'Account & Preferences'}
          </h3>

          <div className="space-y-2 text-xs">
            {currentRole === 'student' && canOpenPortfolio && (
              <button
                type="button"
                onClick={onOpenPortfolio}
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold">
                    {lang === 'th'
                      ? `แฟ้มผลงานของฉัน (${myOwnPortfolioCount})`
                      : `My Portfolio (${myOwnPortfolioCount})`}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            )}

            {/* Full Profile & Portfolio Modal trigger */}
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span className="font-bold">แก้ไขข้อมูลส่วนตัว &amp; พอร์ตฟอลิโอ</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>

            {/* Theme Palette Switcher */}
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
              <span className="font-bold text-[var(--color-text-title)]">โหมดสีถนอมสายตา</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setThemePalette('light_warm')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    isLight
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                  }`}
                >
                  {lang === 'th' ? 'สว่าง' : 'Light'}
                </button>
                <button
                  type="button"
                  onClick={() => setThemePalette('sapphire')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    !isLight
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                  }`}
                >
                  {lang === 'th' ? 'มืดคราม' : 'Dark'}
                </button>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
              <span className="font-bold text-[var(--color-text-title)]">ภาษาของระบบ</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLang('th')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    lang === 'th'
                      ? 'bg-[var(--color-primary)] text-white font-black'
                      : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                  }`}
                >
                  ไทย (TH)
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    lang === 'en'
                      ? 'bg-[var(--color-primary)] text-white font-black'
                      : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                  }`}
                >
                  English (EN)
                </button>
              </div>
            </div>

            {/* Onboarding Tutor & Thai Systems Guide */}
            {onOpenOnboardingTutor && currentRole !== 'student' && (
              <button
                type="button"
                onClick={onOpenOnboardingTutor}
                className="w-full p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-bold flex items-center justify-between text-left cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <div className="text-xs font-bold">ติวเตอร์ระบบ & คู่มือการศึกษาไทย</div>
                    <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-normal">
                      DMC, MIS, CCT, OBEC Care, O-NET, HRMS, DPA, ปพ.3
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            )}

            {/* Mobile App Install Button */}
            <PWAInstallButton lang={lang} variant="sidebar" />

            {/* Biometric Security & Passkey Card (WebAuthn FaceID / TouchID) */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
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
                <div className="space-y-2">
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
                    className="w-full min-h-[44px] px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                <div className="space-y-2">
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
                      className="flex-1 min-h-[40px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{bioBusy ? '...' : lang === 'th' ? 'ทดสอบสแกน' : 'Test'}</span>
                    </button>

                    {onBiometricLock && (
                      <button
                        type="button"
                        onClick={onBiometricLock}
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="min-h-[40px] px-3 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center justify-center cursor-pointer"
                      title={lang === 'th' ? 'ลบ Passkey ออกจากเครื่องนี้' : 'Remove Passkey'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Switch to Full Desktop View */}
            <button
              type="button"
              onClick={onSwitchToDesktopMode}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold flex items-center justify-between text-left cursor-pointer hover:opacity-90"
            >
              <div className="flex items-center gap-2.5">
                <Laptop className="w-4 h-4" />
                <span>{lang === 'th' ? 'สลับเป็นมุมมองคอมพิวเตอร์' : 'Switch to Desktop View'}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="w-full p-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold flex items-center justify-center gap-2 transition hover:bg-rose-100 dark:hover:bg-rose-900 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
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
  onBroadcastLine?: (announcementId: string) => void;
  onBackHome: () => void;
}

export const MobileAnnouncementsTab: React.FC<MobileAnnouncementsTabProps> = ({
  lang,
  currentRole,
  currentUser,
  scopedAnnouncements,
  selectedAnnouncement,
  setSelectedAnnouncement,
  onAddAnnouncement,
  onBroadcastLine,
  onBackHome,
}) => {
  const canCreate = ['teacher', 'admin', 'super_admin'].includes(currentRole) && Boolean(onAddAnnouncement);
  const [showForm, setShowForm] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('academic');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');
  const [pinned, setPinned] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const visibleAnnouncements = scopedAnnouncements.filter((a) =>
    audienceFilter === 'all' ? true : a.targetAudience === audienceFilter || a.targetAudience === 'all'
  );

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
      lineBroadcastSent: false,
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
    <div className="space-y-4 animate-in fade-in duration-200 pb-4">
      {selectedAnnouncement ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedAnnouncement(null)}
              className="min-h-[40px] flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่รายการ</span>
            </button>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {selectedAnnouncement.publishedAt}
            </span>
          </div>
          <article className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2">
            <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">
              {selectedAnnouncement.title}
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {selectedAnnouncement.author} ({selectedAnnouncement.authorRole})
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
                  className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--color-text-body)]"
                >
                  {pageText}
                </p>
              )}
            />
            {canCreate && onBroadcastLine && (
              <button
                type="button"
                onClick={() => {
                  onBroadcastLine(selectedAnnouncement.id);
                  setToast('ส่งแจ้งเตือน LINE เรียบร้อยแล้ว');
                  window.setTimeout(() => setToast(null), 2400);
                }}
                className="w-full min-h-[40px] mt-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold cursor-pointer"
              >
                {selectedAnnouncement.lineBroadcastSent ? 'ส่ง LINE ซ้ำอีกครั้ง' : 'ส่งแจ้งเตือนเข้า LINE'}
              </button>
            )}
          </article>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[40px] flex items-center gap-1 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้าหลัก</span>
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">ประกาศโรงเรียน</h2>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="min-h-[36px] px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold cursor-pointer"
                >
                  {showForm ? 'ปิด' : '+ สร้างประกาศ'}
                </button>
              )}
            </div>
          </div>

          {toast && (
            <div role="status" className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 text-xs font-semibold">
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
                  className="min-h-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                >
                  <option value="academic">วิชาการ</option>
                  <option value="general">ทั่วไป</option>
                  <option value="event">กิจกรรม</option>
                  <option value="urgent">ด่วน</option>
                </select>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as Announcement['targetAudience'])}
                  className="min-h-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                >
                  <option value="all">ทุกคนในโรงเรียน</option>
                  <option value="students">นักเรียน</option>
                  <option value="parents">ผู้ปกครอง</option>
                  <option value="teachers">ครูและบุคลากร</option>
                </select>
              </div>
              <label className="flex items-center justify-between py-1 cursor-pointer">
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

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'students', label: 'นักเรียน' },
                { id: 'parents', label: 'ผู้ปกครอง' },
                { id: 'teachers', label: 'ครู' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAudienceFilter(f.id)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                  audienceFilter === f.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <PagedList
            items={visibleAnnouncements}
            pageSize={4}
            previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
            nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
            paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าประกาศ' : 'Announcement pages'}
            emptyState={<p className="py-8 text-center text-xs text-[var(--color-text-muted)]">ไม่มีประกาศ</p>}
            renderItem={(a) => (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border ${
                  a.pinned
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : 'bg-[var(--color-card)] border-[var(--color-border)]'
                } shadow-xs space-y-2 text-xs`}
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  <span className="font-semibold text-[var(--color-primary-text)]">{a.category}</span>
                  <span>{a.publishedAt}</span>
                </div>

                <h4 className="font-bold text-sm text-[var(--color-text-title)]">{a.title}</h4>
                <p className="text-[var(--color-text-body)] leading-relaxed text-xs whitespace-pre-line line-clamp-2">
                  {a.content}
                </p>

                <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {a.author} · {a.authorRole}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(a)}
                    className="shrink-0 text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    อ่านทั้งหมด
                  </button>
                </div>
              </div>
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
