import React, { useEffect, useState } from 'react';
import { AppLanguage, School, ThemePalette, UserRole } from '../types';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  Globe,
  Lock,
  Mail,
  Moon,
  School as SchoolIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Smartphone,
  HeartPulse,
  Calendar,
  CreditCard,
  UserCheck,
  Award
} from 'lucide-react';
import {
  authenticateWithSupabase,
  listActiveSchools,
  resendSignupConfirmation,
  registerSchoolWithSupabase,
  registerStudentWithSupabase,
  type AuthContext,
} from '../lib/authDb';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthLayoutProps {
  onLogin: (context: AuthContext) => void;
  onStartDemo: (role?: UserRole) => void;
  initialError?: string | null;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette?: ThemePalette;
  setThemePalette?: (palette: ThemePalette) => void;
}

function getAuthErrorMessage(message: string, lang: AppLanguage): string {
  if (/error sending confirmation email|could not resend confirmation email/i.test(message)) {
    return lang === 'th'
      ? 'Supabase ส่งอีเมลยืนยันไม่สำเร็จ โปรดให้ผู้ดูแลระบบตั้งค่า SMTP ที่ Supabase → Authentication → Emails → SMTP Settings ก่อน'
      : 'Supabase could not send the confirmation email. Please configure SMTP in Supabase → Authentication → Emails → SMTP Settings.';
  }
  return message;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  onLogin,
  onStartDemo,
  initialError,
  lang,
  setLang,
  themePalette = 'light_warm',
  setThemePalette,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registrationType, setRegistrationType] = useState<'student' | 'school'>('student');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolLoadError, setSchoolLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameTh, setFullNameTh] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schoolNameTh, setSchoolNameTh] = useState('');
  const [schoolNameEn, setSchoolNameEn] = useState('');
  const [schoolType, setSchoolType] = useState<School['type']>('public');
  const [province, setProvince] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  useEffect(() => {
    let active = true;
    listActiveSchools()
      .then((availableSchools) => {
        if (!active) return;
        setSchools(availableSchools);
        setSchoolId(availableSchools[0]?.id || '');
        setSchoolLoadError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setSchoolLoadError(loadError instanceof Error ? loadError.message : String(loadError));
      });
    return () => {
      active = false;
    };
  }, []);

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

      if (registrationType === 'school') {
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
        setNotice(lang === 'th'
          ? 'ลงทะเบียนโรงเรียนเรียบร้อยแล้ว กรุณายืนยันอีเมลเพื่อเปิดใช้งานระบบและบัญชีผู้ดูแล'
          : 'School registered successfully. Please confirm your email to activate the administrator account.');
      } else {
        if (!schoolId) throw new Error(lang === 'th' ? 'ไม่มีโรงเรียนที่เปิดรับสมัคร กรุณาติดต่อผู้ดูแลระบบ' : 'No active school available.');
        await registerStudentWithSupabase({
          email,
          password,
          fullNameTh,
          fullNameEn,
          schoolId,
          phone,
        });
        setNotice(lang === 'th'
          ? 'ลงทะเบียนนักเรียนสำเร็จ โปรดยืนยันอีเมลและรอการอนุมัติบัญชีจากฝ่ายทะเบียนของโรงเรียน'
          : 'Student registered. Please confirm your email and await school administration approval.');
      }
      setMode('login');
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(mode === 'login' && message.toLowerCase().includes('invalid login credentials')
        ? (lang === 'th'
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล'
          : 'Invalid email or password, or email is not confirmed.')
        : getAuthErrorMessage(message, lang));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกอีเมลก่อนขอส่งลิงก์ยืนยัน' : 'Please enter your email first.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await resendSignupConfirmation(email);
      setNotice(lang === 'th'
        ? 'ส่งคำขอยืนยันอีเมลอีกครั้งแล้ว โปรดตรวจสอบกล่องข้อความและโฟลเดอร์สแปม'
        : 'Confirmation email resent. Please check your inbox and spam folder.');
    } catch (resendError: unknown) {
      const message = resendError instanceof Error ? resendError.message : String(resendError);
      setError(getAuthErrorMessage(message, lang));
    } finally {
      setIsLoading(false);
    }
  };

  const isLight = !themePalette.includes('dark') && themePalette !== 'sapphire';

  return (
    <main className={`relative min-h-screen overflow-x-hidden ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#090d16] text-slate-100'} transition-colors duration-200`}>
      {/* Subtle Prestige Ambient Glow Background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full blur-3xl ${isLight ? 'bg-blue-200/40' : 'bg-blue-900/15'}`} />
        <div className={`absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full blur-3xl ${isLight ? 'bg-indigo-200/40' : 'bg-indigo-900/15'}`} />
        <div className={`absolute inset-0 opacity-[0.25] ${isLight ? 'bg-[radial-gradient(#94a3b8_0.8px,transparent_0.8px)]' : 'bg-[radial-gradient(#475569_0.8px,transparent_0.8px)]'} [background-size:24px_24px]`} />
      </div>

      {/* Top Header Navigation */}
      <header className={`relative z-10 border-b backdrop-blur-md ${isLight ? 'border-slate-200/90 bg-white/80' : 'border-slate-800 bg-slate-900/80'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/25">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
                EduVerse
              </span>
              <span className="block text-[10px] font-semibold text-blue-700 dark:text-blue-400 tracking-wider mt-0.5">
                {lang === 'th' ? 'ระบบบริหารจัดการสถานศึกษาครบวงจร' : 'School Management System'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* PWA Install Button in Header */}
            <PWAInstallButton lang={lang} variant="nav" />

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${
                isLight ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50' : 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            >
              <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemePalette?.(isLight ? 'sapphire' : 'light_warm')}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                isLight ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50' : 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title={lang === 'th' ? 'สลับโหมดถนอมสายตา / โหมดมืด' : 'Toggle Theme'}
              aria-label="Change theme"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing & Authentication Grid */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-12">
        
        {/* Left Column: Modern Prestigious Value Proposition */}
        <div className="space-y-6 lg:space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 px-3.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{lang === 'th' ? 'ระบบมาตรฐานการศึกษาดิจิทัล 2026' : 'Digital Education Standard 2026'}</span>
          </div>

          <div className="space-y-3.5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.18] tracking-tight text-slate-900 dark:text-white">
              {lang === 'th' ? (
                <>
                  ยกระดับการบริหารสถานศึกษา<br />
                  <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    สู่ความทันสมัย ครบ จบในที่เดียว
                  </span>
                </>
              ) : (
                <>
                  Empower Your School with<br />
                  <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    Modern Intelligence & Simplicity
                  </span>
                </>
              )}
            </h1>
            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {lang === 'th'
                ? 'แพลตฟอร์มบริหารจัดการโรงเรียนที่ตอบโจทย์ครู นักเรียน และผู้ปกครอง เชื่อมต่องานวิชาการ ตารางสอน คัดกรอง SDQ บัตรเสมือน ห้องพยาบาล และเช็กชื่อ GPS อัตโนมัติ'
                : 'All-in-one school operations and learning system: SIS, LMS, SDQ screening, smart timetables, digital ID cards, infirmary clinic, and GPS attendance.'}
            </p>
          </div>

          {/* 4 Key Pillars Feature Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: UserCheck,
                title: lang === 'th' ? 'เช็กชื่อภาพถ่าย & สแกนประตู' : 'Smart GPS & Gate Attendance',
                desc: lang === 'th' ? 'สแกน QR บัตรนักเรียน หรือถ่ายเซลฟี่ GPS ป้องกันการลงชื่อแทน' : 'QR turnstile & selfie audit with precise GPS'
              },
              {
                icon: Calendar,
                title: lang === 'th' ? 'ตารางสอนไร้คาบชน' : 'Smart Conflict-Free Timetable',
                desc: lang === 'th' ? 'จัดตารางเรียนครูและห้องเรียน พร้อมระบบตรวจจับคาบซ้ำซ้อน' : 'Automated schedule builder with conflict alerts'
              },
              {
                icon: Award,
                title: lang === 'th' ? 'ประเมิน SDQ & พฤติกรรม' : 'SDQ & Student Behavior',
                desc: lang === 'th' ? 'คัดกรอง 5 ด้านตามเกณฑ์ สพฐ. พร้อมระบบตัด/เพิ่มคะแนนความประพฤติ' : 'Standard 5-domain screening and demerit logs'
              },
              {
                icon: HeartPulse,
                title: lang === 'th' ? 'เวชระเบียนห้องพยาบาล' : 'Infirmary Health Clinic',
                desc: lang === 'th' ? 'บันทึกอาการ จ่ายยา แจ้งเตือนผู้ปกครอง และติดตามการพักฟื้น' : 'Visit logs, medication dispense, and nurse records'
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3.5 shadow-xs transition hover:border-blue-400 dark:hover:border-blue-600"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mt-0.5">
                  <f.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {f.title}
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Demo Personas - Instant 1-Click Access for Evaluators */}
          <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-900 dark:to-indigo-950/40 p-4">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {lang === 'th' ? 'ทดลองใช้งานระบบจำลองทันที (Demo Showcase):' : 'Instant 1-Click Demo Showcase:'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'th' ? 'ไม่ต้องกรอกรหัสผ่าน' : 'No credentials required'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { role: 'admin' as UserRole, labelTh: 'ผอ. / ผู้บริหาร', labelEn: 'Principal / Admin', icon: Building2 },
                { role: 'teacher' as UserRole, labelTh: 'คุณครูผู้สอน', labelEn: 'Teacher', icon: BookOpen },
                { role: 'student' as UserRole, labelTh: 'นักเรียน', labelEn: 'Student', icon: GraduationCap },
                { role: 'parent' as UserRole, labelTh: 'ผู้ปกครอง', labelEn: 'Parent', icon: Users },
              ].map((p) => (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => onStartDemo(p.role)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <p.icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{lang === 'th' ? p.labelTh : p.labelEn}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sleek Authentication Form */}
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            
            {/* Header Tabs: Login vs Register */}
            <div className="border-b border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-900/90">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/20 shrink-0">
                  {mode === 'login' ? <SchoolIcon className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {mode === 'login'
                      ? (lang === 'th' ? 'เข้าสู่ระบบบัญชีโรงเรียน' : 'Sign in to EduVerse')
                      : (registrationType === 'school'
                          ? (lang === 'th' ? 'ลงทะเบียนสถานศึกษาใหม่' : 'Register New School')
                          : (lang === 'th' ? 'ลงทะเบียนบัญชีนักเรียน' : 'Student Registration'))}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {mode === 'login'
                      ? (lang === 'th' ? 'กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน' : 'Enter your credentials to continue')
                      : (lang === 'th' ? 'กรอกรายละเอียดเพื่อสร้างบัญชีใหม่' : 'Fill details to register your account')}
                  </p>
                </div>
              </div>

              {/* Segmented Switcher for Login / Register */}
              <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setNotice(null); }}
                  className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setNotice(null); }}
                  className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'th' ? 'สมัครสมาชิก' : 'Sign Up'}
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {mode === 'register' && (
                <div className="flex gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => { setRegistrationType('student'); setError(null); setNotice(null); }}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                      registrationType === 'student'
                        ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {lang === 'th' ? 'บัญชีนักเรียน' : 'Student Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRegistrationType('school'); setError(null); setNotice(null); }}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                      registrationType === 'school'
                        ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {lang === 'th' ? 'ลงทะเบียนโรงเรียนใหม่' : 'School Registration'}
                  </button>
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-medium text-rose-800 dark:text-rose-200">
                  {error}
                </div>
              )}

              {notice && (
                <div role="status" className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                  {notice}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && registrationType === 'student' && (
                  <>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'สังกัดโรงเรียน' : 'Select School'}
                      <select
                        required
                        value={schoolId}
                        onChange={(e) => setSchoolId(e.target.value)}
                        disabled={schools.length === 0}
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      >
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {lang === 'th' ? school.nameTh : school.nameEn} ({school.code})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาไทย)' : 'Full Name (Thai)'}
                      <input
                        required
                        value={fullNameTh}
                        onChange={(e) => setFullNameTh(e.target.value)}
                        placeholder="เช่น ด.ช. ภูมิใจ รักเรียน"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาอังกฤษ, ไม่บังคับ)' : 'Full Name (English, optional)'}
                      <input
                        value={fullNameEn}
                        onChange={(e) => setFullNameEn(e.target.value)}
                        placeholder="e.g. Phumjai Rakrian"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'เบอร์โทรศัพท์ (ถ้ามี)' : 'Phone (Optional)'}
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081-xxx-xxxx"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>
                  </>
                )}

                {mode === 'register' && registrationType === 'school' && (
                  <>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาไทย)' : 'School Name (Thai)'}
                      <input
                        required
                        maxLength={150}
                        value={schoolNameTh}
                        onChange={(e) => setSchoolNameTh(e.target.value)}
                        placeholder="เช่น โรงเรียนสาธิตวิทยาคม"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาอังกฤษ)' : 'School Name (English)'}
                      <input
                        maxLength={150}
                        value={schoolNameEn}
                        onChange={(e) => setSchoolNameEn(e.target.value)}
                        placeholder="e.g. Satit Wittayakhom School"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {lang === 'th' ? 'ประเภทสถานศึกษา' : 'School Type'}
                        <select
                          value={schoolType}
                          onChange={(e) => setSchoolType(e.target.value as School['type'])}
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        >
                          <option value="public">{lang === 'th' ? 'รัฐบาล' : 'Public'}</option>
                          <option value="private">{lang === 'th' ? 'เอกชน' : 'Private'}</option>
                          <option value="international">{lang === 'th' ? 'นานาชาติ' : 'International'}</option>
                          <option value="demonstration">{lang === 'th' ? 'สาธิต' : 'Demonstration'}</option>
                        </select>
                      </label>

                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {lang === 'th' ? 'จังหวัดที่ตั้ง' : 'Province'}
                        <input
                          required
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="เช่น กรุงเทพฯ"
                          className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                      </label>
                    </div>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {lang === 'th' ? 'ชื่อผู้ดูแลสถานศึกษา (Admin)' : 'Administrator Name'}
                      <input
                        required
                        value={fullNameTh}
                        onChange={(e) => setFullNameTh(e.target.value)}
                        placeholder="ชื่อ-นามสกุล ผู้ดูแลระบบ"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>
                  </>
                )}

                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    {lang === 'th' ? 'อีเมล' : 'Email Address'}
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@school.ac.th"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
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
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </label>

                {mode === 'login' && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isLoading || !email.trim()}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {lang === 'th' ? 'ขอส่งลิงก์ยืนยันอีเมลอีกครั้ง' : 'Resend confirmation link'}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (mode === 'register' && registrationType === 'student' && schools.length === 0)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 py-3 text-sm font-bold text-white shadow-md shadow-blue-700/25 transition hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {isLoading
                    ? (lang === 'th' ? 'กำลังดำเนินการ...' : 'Processing...')
                    : (mode === 'login'
                        ? (lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')
                        : (registrationType === 'school'
                            ? (lang === 'th' ? 'ยืนยันลงทะเบียนโรงเรียน' : 'Register School')
                            : (lang === 'th' ? 'ยืนยันสมัครบัญชีนักเรียน' : 'Create Student Account')))}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Footer Notice */}
            <div className="flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-6 py-3.5 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>{lang === 'th' ? 'ระบบรักษาความปลอดภัยแยกฐานข้อมูลตามโรงเรียน (Multi-Tenant RBAC)' : 'Multi-tenant encrypted school architecture'}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
