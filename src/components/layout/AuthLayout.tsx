import React, { useEffect, useState } from 'react';
import { AppLanguage, School, ThemePalette } from '../../types';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  KeyRound,
  Lock,
  Mail,
  Moon,
  School as SchoolIcon,
  Send,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import {
  authenticateWithSupabase,
  listActiveSchools,
  MASTER_SYSTEM_EMAIL,
  registerSchoolWithSupabase,
  requestPasswordReset,
  resendSignupConfirmation,
  type AuthContext,
} from '../../lib/authDb';
import { PWAInstallButton } from '../PWAInstallButton';
import heroImage from '../../assets/images/hero_classroom_teacher_students_1793958712620.jpg';

interface AuthLayoutProps {
  onLogin: (context: AuthContext) => void;
  initialError?: string | null;
  activeSchools?: School[];
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette?: ThemePalette;
  setThemePalette?: (palette: ThemePalette) => void;
}

function getAuthErrorMessage(message: string, lang: AppLanguage): string {
  if (/error sending confirmation email|could not resend confirmation email|confirmation email|rate limit/i.test(message)) {
    return lang === 'th'
      ? 'คำขอถูกส่งเข้าสู่ระบบแล้ว โดย Super Admin (farmissara@gmail.com) จะเป็นผู้อนุมัติเปิดใช้งานจากระบบโดยตรง'
      : 'Your request has been received. Super Admin will approve and activate your account directly from the system.';
  }
  return message;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  onLogin,
  initialError,
  activeSchools,
  lang,
  setLang,
  themePalette = 'light_warm',
  setThemePalette,
}) => {
  // Production Auth Form State (Primary Landing Experience)
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [schools, setSchools] = useState<School[]>(activeSchools && activeSchools.length > 0 ? activeSchools : []);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [schoolLoadError, setSchoolLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameTh, setFullNameTh] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [schoolNameTh, setSchoolNameTh] = useState('');
  const [schoolNameEn, setSchoolNameEn] = useState('');
  const [schoolType, setSchoolType] = useState<School['type']>('public');
  const [province, setProvince] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Secondary Modals: Forgot Password
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  useEffect(() => {
    let active = true;
    setIsLoadingSchools(true);
    setSchoolLoadError(null);
    listActiveSchools()
      .then((availableSchools) => {
        if (!active) return;
        setSchools(availableSchools);
        setIsLoadingSchools(false);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error('Failed to load active schools:', loadError);
        setSchoolLoadError(loadError instanceof Error ? loadError.message : String(loadError));
        setIsLoadingSchools(false);
      });
    return () => {
      active = false;
    };
  }, [activeSchools]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        onLogin(await authenticateWithSupabase(email, password));
        return;
      }

      await registerSchoolWithSupabase({
        email,
        password,
        fullNameTh,
        fullNameEn,
        phone,
        schoolNameTh,
        schoolNameEn,
        schoolType,
        province,
      });
      setNotice(
        lang === 'th'
          ? 'ส่งคำขอลงทะเบียนโรงเรียนแล้ว โปรดตรวจสอบอีเมลและรอการอนุมัติจากผู้ดูแลระบบ'
          : 'School registration submitted. Check your email and wait for administrator approval.'
      );
      setMode('login');
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      if (/confirmation email|rate limit/i.test(message)) {
        setNotice(
          lang === 'th'
            ? 'ลงทะเบียนเรียบร้อยแล้ว! ข้อมูลส่งเข้าสู่ระบบแล้ว โดย Super Admin (farmissara@gmail.com) จะเป็นผู้อนุมัติเปิดใช้งานจากระบบโดยตรง'
            : 'Registration received! Super Admin will approve and activate your account directly from the system.'
        );
        setError(null);
        setMode('login');
        return;
      }
      setError(
        mode === 'login' && message.toLowerCase().includes('invalid login credentials')
          ? lang === 'th'
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีอยู่ระหว่างรอ Super Admin / ผู้ดูแลโรงเรียนอนุมัติเปิดใช้งาน'
            : 'Invalid email or password, or account is awaiting administrator approval.'
          : getAuthErrorMessage(message, lang)
      );
    } finally {
      setIsLoading(false);
    }
  };


  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกอีเมลก่อนขออนุมัติ' : 'Please enter your email first.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await resendSignupConfirmation(email);
      setNotice(
        lang === 'th'
          ? 'ส่งคำขออนุมัติเปิดใช้งานไปยัง Super Admin (farmissara@gmail.com) เรียบร้อยแล้ว'
          : 'Activation request submitted to Super Admin for system approval.'
      );
    } catch (requestError: unknown) {
      setError(getAuthErrorMessage(requestError instanceof Error ? requestError.message : String(requestError), lang));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = (resetEmail || email).trim().toLowerCase();
    if (!target) {
      setError(lang === 'th' ? 'กรุณากรอกอีเมลสำหรับขอรีเซ็ตรหัสผ่าน' : 'Please enter your email.');
      return;
    }
    setError(null);
    setIsResetting(true);
    try {
      await requestPasswordReset(target);
      setResetStatus(
        lang === 'th'
          ? `ระบบรับคำขอแล้ว หากมีบัญชีที่ใช้อีเมล ${target} Supabase จะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลนั้น โปรดตรวจสอบกล่อง Spam/Junk ด้วย`
          : `Request received. If an account uses ${target}, Supabase will send a password reset link to that address. Check Spam/Junk as well.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const isLight = !themePalette.includes('dark') && themePalette !== 'sapphire';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-text-body)] transition-colors duration-200">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <a href="#portal-auth" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[var(--color-text-title)] whitespace-nowrap shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shrink-0">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span>EduVerse</span>
          </a>

          {/* Utility Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] px-2.5 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            >
              <Globe className="h-3.5 w-3.5 text-[var(--color-primary-text)] shrink-0" />
              <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setThemePalette?.(isLight ? 'sapphire' : 'light_warm')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] transition cursor-pointer shrink-0"
              title={lang === 'th' ? 'สลับโหมดสีถนอมสายตา' : 'Toggle Theme'}
              aria-label="Change theme"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section
          id="portal-auth"
          className="relative isolate overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-500/10"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
              <div className="order-2 lg:order-1 space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary-text)]">
                    {lang === 'th' ? 'แพลตฟอร์มบริหารสถานศึกษา' : 'School Operations Platform'}
                  </p>
                  <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[var(--color-text-title)] text-balance sm:text-4xl lg:text-5xl">
                    {lang === 'th' ? 'งานโรงเรียนครบในระบบเดียว' : 'Everyday school work, in one place'}
                  </h1>
                  <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-body)] sm:text-base">
                    {lang === 'th'
                      ? 'เชื่อมงานวิชาการ การเช็กชื่อ และการดูแลนักเรียน สำหรับผู้บริหาร ครู นักเรียน และผู้ปกครอง'
                      : 'Connect academics, attendance, and student care for administrators, teachers, students, and families.'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-body)]">
                      {lang === 'th' ? 'แยกข้อมูลรายโรงเรียน' : 'School-level data isolation'}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-body)]">
                      {lang === 'th' ? 'คำนึงถึง PDPA' : 'Privacy-conscious'}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
                  <img
                    src={heroImage}
                    alt={lang === 'th' ? 'ห้องเรียนและการจัดการเรียนการสอนของ EduVerse' : 'Classroom learning with EduVerse'}
                    className="aspect-[16/10] w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="border-t border-[var(--color-border)] pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'สถานศึกษาที่เปิดใช้งาน' : 'Active schools'}
                    </h2>
                    <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                      {schools.length} {lang === 'th' ? 'แห่ง' : 'schools'}
                    </span>
                  </div>
                  {schools.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {schools.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)] font-medium"
                        >
                          {lang === 'th' ? s.nameTh : s.nameEn}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      role={schoolLoadError ? 'alert' : undefined}
                      className="text-xs text-[var(--color-text-muted)]"
                    >
                      {schoolLoadError
                        ? /supabase is not configured/i.test(schoolLoadError)
                          ? lang === 'th'
                            ? 'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลโรงเรียน'
                            : 'School database connection is not configured yet.'
                          : lang === 'th'
                            ? 'ไม่สามารถโหลดรายชื่อโรงเรียนได้ในขณะนี้'
                            : 'Could not load schools right now.'
                        : isLoadingSchools
                          ? lang === 'th'
                            ? 'กำลังโหลดรายชื่อสถานศึกษา...'
                            : 'Loading active schools...'
                          : lang === 'th'
                            ? 'ยังไม่มีสถานศึกษาที่เปิดใช้งาน'
                            : 'No active schools yet.'}
                    </p>
                  )}
                </div>

              </div>

              <div className="order-1 lg:order-2 w-full max-w-md mx-auto space-y-4 lg:ml-auto lg:mr-0">
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg shadow-slate-900/5">
                  <div className="p-5 sm:p-6 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shrink-0">
                        {mode === 'login' ? <SchoolIcon className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[var(--color-text-title)] leading-tight">
                          {mode === 'login'
                            ? lang === 'th'
                              ? 'เข้าสู่ระบบบัญชีโรงเรียน'
                              : 'Sign in to EduVerse'
                            : lang === 'th'
                              ? 'ลงทะเบียนสถานศึกษาใหม่'
                              : 'Register New School'}
                        </h2>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {mode === 'login'
                            ? lang === 'th'
                              ? 'กรอกอีเมล (หรือบัญชีที่โรงเรียนออกให้) และรหัสผ่าน'
                              : 'Enter your school email/username and password'
                            : lang === 'th'
                              ? 'กรอกข้อมูลเพื่อยื่นคำขอเปิดใช้งานในระบบจริง'
                              : 'Submit your details for school activation'}
                        </p>
                      </div>
                    </div>

                    <div className="flex rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                          setNotice(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          mode === 'login'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        {lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setError(null);
                          setNotice(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          mode === 'register'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        {lang === 'th' ? 'สมัครสมาชิก' : 'Sign Up'}
                      </button>
                    </div>
                  </div>

                  {/* Form Body */}
                  <div className="p-5 sm:p-6 space-y-4">


                    {error && (
                      <div role="alert" className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-medium text-rose-900 dark:text-rose-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                      </div>
                    )}

                    {notice && (
                      <div role="status" className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                        {notice}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      {mode === 'register' && (
                        <>
                          <label className="block text-xs font-bold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาไทย)' : 'School Name (Thai)'}
                            <input
                              required
                              maxLength={150}
                              value={schoolNameTh}
                              onChange={(e) => setSchoolNameTh(e.target.value)}
                              placeholder="เช่น โรงเรียนสาธิตวิทยาคม"
                              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                            />
                          </label>

                          <label className="block text-xs font-bold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาอังกฤษ)' : 'School Name (English)'}
                            <input
                              maxLength={150}
                              value={schoolNameEn}
                              onChange={(e) => setSchoolNameEn(e.target.value)}
                              placeholder="e.g. Satit Wittayakhom School"
                              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs font-bold text-[var(--color-text-title)]">
                              {lang === 'th' ? 'ประเภทสถานศึกษา' : 'School Type'}
                              <select
                                value={schoolType}
                                onChange={(e) => setSchoolType(e.target.value as School['type'])}
                                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                              >
                                <option value="public">{lang === 'th' ? 'รัฐบาล' : 'Public'}</option>
                                <option value="private">{lang === 'th' ? 'เอกชน' : 'Private'}</option>
                                <option value="international">{lang === 'th' ? 'นานาชาติ' : 'International'}</option>
                                <option value="demonstration">{lang === 'th' ? 'สาธิต' : 'Demonstration'}</option>
                              </select>
                            </label>

                            <label className="block text-xs font-bold text-[var(--color-text-title)]">
                              {lang === 'th' ? 'จังหวัดที่ตั้ง' : 'Province'}
                              <input
                                required
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                placeholder="เช่น กรุงเทพฯ"
                                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                              />
                            </label>
                          </div>

                          <label className="block text-xs font-bold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ชื่อผู้ดูแลสถานศึกษา (Admin)' : 'Administrator Name'}
                            <input
                              required
                              value={fullNameTh}
                              onChange={(e) => setFullNameTh(e.target.value)}
                              placeholder="ชื่อ-นามสกุล ผู้ดูแลระบบ"
                              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                            />
                          </label>
                        </>
                      )}

                      <label className="block text-xs font-bold text-[var(--color-text-title)]">
                        <span className="flex items-center gap-1.5 mb-1">
                          <Mail className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                          {lang === 'th' ? 'อีเมล' : 'Email Address'}
                        </span>
                        <input
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="yourname@school.ac.th"
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20 font-medium"
                        />
                      </label>

                      <label className="block text-xs font-bold text-[var(--color-text-title)]">
                        <span className="flex items-center gap-1.5 mb-1">
                          <Lock className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                          {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                        </span>
                        <input
                          type="password"
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          minLength={8}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                        />
                      </label>

                      {mode === 'login' && (
                        <>
                          <p className="text-[11px] text-[var(--color-text-muted)] leading-snug">
                            {lang === 'th'
                              ? 'สำหรับบุคลากรและสมาชิกที่ได้รับบัญชีจากผู้ดูแลโรงเรียน'
                              : 'For staff and members with accounts provisioned by their school administrator.'}
                          </p>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResetEmail(email);
                                setResetStatus(null);
                                setShowForgotPasswordModal(true);
                              }}
                              className="text-[var(--color-primary-text)] hover:underline font-semibold transition cursor-pointer"
                            >
                              {lang === 'th' ? 'ลืมรหัสผ่าน? (ขอเปลี่ยน Password)' : 'Forgot Password?'}
                            </button>
                            <button
                              type="button"
                              onClick={handleResendConfirmation}
                              disabled={isLoading || !email.trim()}
                              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:underline font-medium transition cursor-pointer disabled:opacity-50"
                            >
                              {lang === 'th' ? 'ขอให้ Super Admin อนุมัติเปิดใช้งาน' : 'Request Super Admin approval'}
                            </button>
                          </div>
                        </>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer mt-1"
                      >
                        {isLoading
                          ? lang === 'th'
                            ? 'กำลังดำเนินการ...'
                            : 'Processing...'
                          : mode === 'login'
                            ? lang === 'th'
                              ? 'เข้าสู่ระบบ'
                              : 'Sign In'
                            : lang === 'th'
                              ? 'ยืนยันลงทะเบียนโรงเรียน'
                              : 'Register School'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </div>

                </div>
                <PWAInstallButton lang={lang} variant="mobile_card" />
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* BELOW THE FOLD: CORE CAPABILITIES OVERVIEW                            */}
        {/* ===================================================================== */}
        <section
          id="platform-overview"
          className="border-t border-[var(--color-border)] bg-gradient-to-b from-[var(--color-card-subtle)] to-[var(--color-canvas)] py-10 sm:py-12 lg:py-16"
        >
          <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-title)] text-balance sm:text-3xl">
                  {lang === 'th'
                    ? 'เครื่องมือสำคัญของโรงเรียนในที่เดียว'
                    : 'Essential school tools, all in one place'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  id: 'academics',
                  icon: BookOpen,
                  title: lang === 'th' ? 'งานวิชาการ' : 'Academics',
                  description: lang === 'th' ? 'จัดการบทเรียนและผลการเรียน' : 'Courses, lessons, and grading',
                },
                {
                  id: 'attendance',
                  icon: UserCheck,
                  title: lang === 'th' ? 'การเข้าเรียน' : 'Attendance',
                  description: lang === 'th' ? 'เช็กชื่อสะดวกด้วย QR และ GPS' : 'Quick check-in with QR and GPS',
                },
                {
                  id: 'student-care',
                  icon: HeartPulse,
                  title: lang === 'th' ? 'ดูแลนักเรียน' : 'Student care',
                  description: lang === 'th' ? 'ห้องพยาบาลและคัดกรอง SDQ' : 'Infirmary and SDQ screening',
                },
              ].map((item) => (
                <article
                  key={item.id}
                  className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:hover:border-indigo-500/60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--color-text-title)]">{item.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-muted)]">{item.description}</span>
                  </span>
                </article>
              ))}
            </div>

            <details className="group overflow-hidden rounded-2xl border border-indigo-100 bg-white/75 shadow-sm backdrop-blur-sm transition dark:border-slate-700 dark:bg-slate-900/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:p-5 dark:hover:bg-white/5">
                <span className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ความสามารถเพิ่มเติม' : 'Additional capabilities'}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {lang === 'th' ? 'ดูเพิ่มเติม' : 'Explore'}
                  <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </span>
              </summary>
              <div className="border-t border-indigo-100/80 p-4 sm:p-5 dark:border-slate-700">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      icon: Gamepad2,
                      title: lang === 'th' ? 'สนามประลอง 3D EduArena' : '3D EduArena',
                      desc: lang === 'th' ? 'ห้องทดลองและคลังข้อสอบ 8 กลุ่มสาระ' : 'Virtual labs and quizzes across 8 subjects',
                    },
                    {
                      icon: Calendar,
                      title: lang === 'th' ? 'ตารางสอนไร้คาบชน' : 'Conflict-Free Timetable',
                      desc: lang === 'th' ? 'ตรวจจับครูสอนซ้ำและห้องเรียนซ้อนอัตโนมัติทันที' : 'Automatic teacher & room conflict detection',
                    },
                    {
                      icon: CreditCard,
                      title: lang === 'th' ? 'บัตรนักเรียนดิจิทัล' : 'Digital Student ID',
                      desc: lang === 'th' ? 'พกพาง่ายบนมือถือ พร้อมใบแจ้งค่าเทอมและใบเสร็จรับเงิน' : 'Mobile ID card with tuition billing & receipts',
                    },
                    {
                      icon: FileText,
                      title: lang === 'th' ? 'แดชบอร์ดผู้บริหาร & จอทีวี' : 'Executive & TV Monitor',
                      desc: lang === 'th' ? 'สรุปสถิติประจำวันสำหรับผู้อำนวยการและแสดงผลขึ้นจอทีวีโรงเรียน' : 'Director analytics report & live school TV display',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="group flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:hover:border-indigo-500/60"
                    >
                      <div className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[var(--color-text-title)]">{item.title}</h4>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </section>
      </main>

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-card)] py-5 text-xs text-[var(--color-text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span className="font-semibold text-[var(--color-text-title)]">EduVerse Academic Operations</span>
            <span>·</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>

      {/* Modal: Forgot / Reset Password */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ขอเปลี่ยนรหัสผ่าน / ลืมรหัสผ่าน' : 'Reset Password Request'}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'รับลิงก์รีเซ็ตรหัสผ่านทางอีเมลบัญชี' : 'Receive a reset link at your account email'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setResetStatus(null);
                }}
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-100">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'th' ? 'อีเมลผู้ดูแลสำหรับขอความช่วยเหลือ:' : 'Administrator support email:'}</span>
              </div>
              <div className="font-mono text-xs font-semibold pl-5 text-blue-700 dark:text-blue-300">
                {MASTER_SYSTEM_EMAIL}
              </div>
              <div className="text-[11px] text-blue-800/80 dark:text-blue-300/80 pl-5 leading-relaxed">
                {lang === 'th'
                  ? 'ลิงก์รีเซ็ตจะส่งโดย Supabase Auth ไปยังอีเมลบัญชีโดยตรง อีเมลนี้เป็นช่องทางติดต่อผู้ดูแลเท่านั้น'
                  : 'Supabase Auth sends the reset link directly to the account email. This address is for support only.'}
              </div>
            </div>

            {resetStatus && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">{resetStatus}</div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">{error}</div>
              </div>
            )}

            <form onSubmit={handleRequestPasswordReset} className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--color-text-body)]">
                {lang === 'th' ? 'กรอกอีเมลบัญชีผู้ใช้ของคุณ' : 'Enter your registered email address'}
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setResetStatus(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] transition cursor-pointer"
                >
                  {lang === 'th' ? 'ปิด' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isResetting || !resetEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-xs font-bold text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isResetting ? (
                    <span>{lang === 'th' ? 'กำลังส่งคำขอ...' : 'Sending...'}</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ส่งคำขอเปลี่ยนรหัสผ่าน' : 'Submit Reset Request'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>{lang === 'th' ? 'ต้องการความช่วยเหลือด่วน?' : 'Need immediate help?'}</span>
              <a
                href={`mailto:${MASTER_SYSTEM_EMAIL}?subject=${encodeURIComponent('ขอเปลี่ยนรหัสผ่าน EduVerse / Password Reset Request')}&body=${encodeURIComponent(`เรียน Master Administrator (${MASTER_SYSTEM_EMAIL}),\n\nต้องการขอรีเซ็ตรหัสผ่านสำหรับอีเมล: ${resetEmail || ''}\nโรงเรียน / หน่วยงาน:\nหมายเหตุ:\n`)}`}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ส่งอีเมลตรงหา Master' : 'Email Master Directly'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
