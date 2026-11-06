import React, { useEffect, useState } from 'react';
import { AppLanguage, School, ThemePalette } from '../types';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  Globe2,
  Languages,
  Lock,
  Mail,
  Moon,
  School as SchoolIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import {
  authenticateWithSupabase,
  listActiveSchools,
  resendSignupConfirmation,
  registerSchoolWithSupabase,
  registerStudentWithSupabase,
  type AuthContext,
} from '../lib/authDb';

interface AuthLayoutProps {
  onLogin: (context: AuthContext) => void;
  onStartDemo: () => void;
  initialError?: string | null;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette?: ThemePalette;
  setThemePalette?: (palette: ThemePalette) => void;
}

function getAuthErrorMessage(message: string, lang: AppLanguage): string {
  if (/error sending confirmation email|could not resend confirmation email/i.test(message)) {
    return lang === 'th'
      ? 'Supabase ส่งอีเมลยืนยันไม่สำเร็จ โปรดให้ผู้ดูแลตั้งค่า SMTP ที่ Supabase → Authentication → Emails → SMTP Settings ก่อน อย่าสมัครซ้ำทันที เพราะบัญชีอาจถูกสร้างแล้ว ให้ตรวจ Authentication → Users ก่อนลองอีกครั้ง'
      : 'Supabase could not send the confirmation email. Ask the administrator to configure SMTP in Supabase → Authentication → Emails → SMTP Settings. Do not sign up again yet; the account may already exist. Check Authentication → Users first.';
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
          ? 'ลงทะเบียนโรงเรียนแล้ว กรุณายืนยันอีเมลเพื่อเปิดใช้งานโรงเรียนและบัญชีผู้ดูแล'
          : 'School registered. Confirm your email to activate the school and administrator account.');
      } else {
        if (!schoolId) throw new Error('ไม่มีโรงเรียนที่เปิดรับสมัคร กรุณาติดต่อผู้ดูแลระบบ');
        await registerStudentWithSupabase({
          email,
          password,
          fullNameTh,
          fullNameEn,
          schoolId,
          phone,
        });
        setNotice(lang === 'th'
          ? 'สมัครเรียบร้อยแล้ว โปรดยืนยันอีเมล (ถ้าระบบกำหนด) และรอผู้ดูแลโรงเรียนอนุมัติบัญชี'
          : 'Registration complete. Confirm your email if required, then wait for school approval before signing in.');
      }
      setMode('login');
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(mode === 'login' && message.toLowerCase().includes('invalid login credentials')
        ? (lang === 'th'
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชียังไม่ได้ยืนยันอีเมล หากสมัครแล้ว ให้กดส่งลิงก์ยืนยันอีกครั้งด้านล่าง'
          : 'Email or password is incorrect, or the account is not confirmed. If you have signed up, request a new confirmation link below.')
        : getAuthErrorMessage(message, lang));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกอีเมลก่อนขอลิงก์ยืนยัน' : 'Enter your email before requesting a confirmation link.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await resendSignupConfirmation(email);
      setNotice(lang === 'th'
        ? 'ส่งคำขออีเมลยืนยันอีกครั้งแล้ว โปรดตรวจกล่องจดหมายและโฟลเดอร์สแปม'
        : 'Confirmation email requested again. Check your inbox and spam folder.');
    } catch (resendError: unknown) {
      const message = resendError instanceof Error ? resendError.message : String(resendError);
      setError(getAuthErrorMessage(message, lang));
    } finally {
      setIsLoading(false);
    }
  };

  const isLight = !themePalette.includes('dark') && themePalette !== 'sapphire';

  return (
    <main className={`relative min-h-screen overflow-hidden ${isLight ? 'bg-[#f4f7ff] text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full blur-3xl ${isLight ? 'bg-blue-200/50' : 'bg-blue-700/20'}`} />
        <div className={`absolute -bottom-64 -right-36 h-[42rem] w-[42rem] rounded-full blur-3xl ${isLight ? 'bg-violet-200/40' : 'bg-indigo-700/20'}`} />
        <div className={`absolute inset-0 opacity-[0.18] ${isLight ? 'bg-[radial-gradient(#94a3b8_0.7px,transparent_0.7px)]' : 'bg-[radial-gradient(#64748b_0.7px,transparent_0.7px)]'} [background-size:22px_22px]`} />
      </div>
      <header className={`relative z-10 border-b backdrop-blur-xl ${isLight ? 'border-white/70 bg-white/70' : 'border-white/10 bg-slate-950/60'}`}>
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-700/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-lg font-extrabold tracking-tight">EduVerse</span>
              <span className={`hidden text-[10px] font-semibold uppercase tracking-[0.2em] sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Education, connected</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLang(lang === 'th' ? 'en' : 'th')} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${isLight ? 'border-slate-200 bg-white/80 text-slate-600 hover:border-blue-300 hover:text-blue-700' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`} aria-label="Change language">
              <Languages className="h-4 w-4" /> {lang.toUpperCase()}
            </button>
            <button type="button" onClick={() => setThemePalette?.(isLight ? 'sapphire' : 'light_warm')} className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${isLight ? 'border-slate-200 bg-white/80 text-slate-600 hover:border-blue-300 hover:text-blue-700' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`} aria-label="Change theme">
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-77px)] w-full max-w-[1440px] items-center gap-10 px-5 py-10 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-14">
        <div className="mx-auto w-full max-w-2xl space-y-8 lg:mx-0">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold shadow-sm ${isLight ? 'border-blue-100 bg-white/80 text-blue-700' : 'border-blue-400/20 bg-blue-400/10 text-blue-200'}`}>
            <Sparkles className="h-4 w-4" />
            {lang === 'th' ? 'แพลตฟอร์มการศึกษาสำหรับทุกโรงเรียน' : 'A connected platform for every school'}
          </div>
          <div className="space-y-5">
            <h1 className="max-w-2xl text-4xl font-black leading-[1.18] tracking-tight sm:text-5xl lg:text-[3.55rem]">
              {lang === 'th'
                ? <>จัดการโรงเรียน<br /><span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 bg-clip-text text-transparent">ให้ก้าวไปได้ไกลกว่า</span></>
                : <>A better way to<br /><span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 bg-clip-text text-transparent">run your school</span></>}
            </h1>
            <p className={`max-w-xl text-base leading-8 sm:text-lg ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {lang === 'th'
                ? 'เชื่อมการเรียนรู้ ข้อมูลนักเรียน และงานบริหารไว้ในพื้นที่เดียว ออกแบบมาสำหรับโรงเรียนไทยและชุมชนการเรียนรู้ยุคใหม่'
                : 'Bring learning, student records, and school operations together in one thoughtfully connected workspace.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: BookOpen, title: lang === 'th' ? 'การเรียนรู้' : 'Learning', text: lang === 'th' ? 'บทเรียน คะแนน และการเข้าเรียน' : 'Lessons, grades, and attendance' },
              { icon: Users, title: lang === 'th' ? 'ชุมชนโรงเรียน' : 'School community', text: lang === 'th' ? 'ทำงานร่วมกันทุกบทบาท' : 'One place for every role' },
              { icon: ShieldCheck, title: lang === 'th' ? 'แยกข้อมูลปลอดภัย' : 'Private by design', text: lang === 'th' ? 'แต่ละโรงเรียนมีพื้นที่ข้อมูลของตัวเอง' : 'Each school has its own data space' },
              { icon: Globe2, title: lang === 'th' ? 'พร้อมเติบโต' : 'Ready to grow', text: lang === 'th' ? 'ลงทะเบียนโรงเรียนได้ง่าย' : 'Easy school registration' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur-sm ${isLight ? 'border-white bg-white/70' : 'border-white/10 bg-white/[0.04]'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-400/10 text-blue-300'}`}><Icon className="h-5 w-5" /></span>
                <span><span className="block text-sm font-bold">{title}</span><span className={`mt-1 block text-xs leading-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{text}</span></span>
              </div>
            ))}
          </div>
          <div className={`flex items-center gap-3 border-t pt-6 text-sm ${isLight ? 'border-slate-200/80 text-slate-500' : 'border-white/10 text-slate-400'}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-400/10 text-emerald-300'}`}><CheckCircle2 className="h-5 w-5" /></span>
            <span>{lang === 'th' ? 'เริ่มต้นได้ในไม่กี่ขั้นตอน · ข้อมูลแยกตามโรงเรียน' : 'Get started in minutes · school data stays separated'}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className={`overflow-hidden rounded-[1.75rem] border shadow-2xl shadow-slate-900/10 ${isLight ? 'border-white bg-white' : 'border-white/10 bg-slate-900'}`}>
            <div className={`border-b px-6 pb-5 pt-7 sm:px-8 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <div className="mb-5 flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isLight ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-400/10 text-indigo-300'}`}>
                  {mode === 'login' ? <SchoolIcon className="h-5 w-5" /> : registrationType === 'school' ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">
                    {mode === 'login'
                      ? (lang === 'th' ? 'ยินดีต้อนรับกลับ' : 'Welcome back')
                      : registrationType === 'school'
                        ? (lang === 'th' ? 'เริ่มต้นกับโรงเรียนของคุณ' : 'Set up your school')
                        : (lang === 'th' ? 'สร้างบัญชีนักเรียน' : 'Create a student account')}
                  </h2>
                  <p className={`mt-0.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {mode === 'login'
                      ? (lang === 'th' ? 'เข้าสู่ระบบเพื่อไปยังพื้นที่การเรียนรู้ของคุณ' : 'Sign in to continue to your learning space')
                      : (lang === 'th' ? 'กรอกข้อมูลเพื่อเริ่มใช้งาน EduVerse' : 'Enter your details to get started with EduVerse')}
                  </p>
                </div>
              </div>
              <div className={`flex rounded-xl p-1 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
                <button type="button" onClick={() => { setMode('login'); setError(null); setNotice(null); }} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${mode === 'login' ? (isLight ? 'bg-white text-blue-700 shadow-sm' : 'bg-slate-700 text-white shadow-sm') : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white')}`}>
              {lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign in'}
            </button>
                <button type="button" onClick={() => { setMode('register'); setError(null); setNotice(null); }} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${mode === 'register' ? (isLight ? 'bg-white text-blue-700 shadow-sm' : 'bg-slate-700 text-white shadow-sm') : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white')}`}>
              {lang === 'th' ? 'สมัครสมาชิก' : 'Sign up'}
            </button>
          </div>
            </div>

            <div className={`p-6 sm:p-8 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
          {mode === 'register' && (
            <div className={`mb-5 flex gap-2 rounded-xl p-1 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
              <button type="button" onClick={() => { setRegistrationType('student'); setError(null); setNotice(null); }} className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition ${registrationType === 'student' ? (isLight ? 'bg-white text-indigo-700 shadow-sm' : 'bg-slate-700 text-indigo-200 shadow-sm') : (isLight ? 'text-slate-500' : 'text-slate-400')}`}>
                {lang === 'th' ? 'สมัครนักเรียน' : 'Student'}
              </button>
              <button type="button" onClick={() => { setRegistrationType('school'); setError(null); setNotice(null); }} className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition ${registrationType === 'school' ? (isLight ? 'bg-white text-indigo-700 shadow-sm' : 'bg-slate-700 text-indigo-200 shadow-sm') : (isLight ? 'text-slate-500' : 'text-slate-400')}`}>
                {lang === 'th' ? 'ลงทะเบียนโรงเรียน' : 'Register a school'}
              </button>
            </div>
          )}

          {mode === 'register' && registrationType === 'student' && schoolLoadError && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {schoolLoadError}
            </div>
          )}
          {mode === 'register' && registrationType === 'student' && !schoolLoadError && schools.length === 0 && (
            <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {lang === 'th' ? 'ยังไม่มีโรงเรียนที่เปิดใช้งานในฐานข้อมูล' : 'No active schools are configured yet.'}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              {notice}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && registrationType === 'student' && (
              <>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'โรงเรียน' : 'School'}
                  <select required value={schoolId} onChange={(event) => setSchoolId(event.target.value)} disabled={schools.length === 0} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                    {schools.map((school) => <option key={school.id} value={school.id}>{school.nameTh} ({school.code})</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'}
                  <input required value={fullNameTh} onChange={(event) => setFullNameTh(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ชื่อภาษาอังกฤษ (ถ้ามี)' : 'English name (optional)'}
                  <input value={fullNameEn} onChange={(event) => setFullNameEn(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'เบอร์โทรศัพท์ (ไม่บังคับ)' : 'Phone (optional)'}
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900" />
                </label>
              </>
            )}
            {mode === 'register' && registrationType === 'school' && (
              <>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ชื่อโรงเรียนภาษาไทย' : 'School name (Thai)'}
                  <input required maxLength={150} value={schoolNameTh} onChange={(event) => setSchoolNameTh(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ชื่อโรงเรียนภาษาอังกฤษ (ถ้ามี)' : 'School name (English, optional)'}
                  <input maxLength={150} value={schoolNameEn} onChange={(event) => setSchoolNameEn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ประเภทโรงเรียน' : 'School type'}
                  <select value={schoolType} onChange={(event) => setSchoolType(event.target.value as School['type'])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                    <option value="public">{lang === 'th' ? 'รัฐบาล' : 'Public'}</option>
                    <option value="private">{lang === 'th' ? 'เอกชน' : 'Private'}</option>
                    <option value="international">{lang === 'th' ? 'นานาชาติ' : 'International'}</option>
                    <option value="demonstration">{lang === 'th' ? 'สาธิต' : 'Demonstration'}</option>
                  </select>
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'จังหวัด' : 'Province'}
                  <input required maxLength={100} value={province} onChange={(event) => setProvince(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ชื่อผู้ดูแลโรงเรียน' : 'Administrator name'}
                  <input required maxLength={150} value={fullNameTh} onChange={(event) => setFullNameTh(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'ชื่อผู้ดูแลภาษาอังกฤษ (ถ้ามี)' : 'Administrator name (English, optional)'}
                  <input value={fullNameEn} onChange={(event) => setFullNameEn(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </label>
                <label className="block text-xs font-medium">
                  {lang === 'th' ? 'เบอร์โทรศัพท์ (ไม่บังคับ)' : 'Phone (optional)'}
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </label>
              </>
            )}

            <label className="block text-xs font-medium">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-blue-600" />{lang === 'th' ? 'อีเมล' : 'Email'}</span>
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            </label>
            {mode === 'login' && (
              <div className="-mt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isLoading || !email.trim()}
                  className={`w-full rounded-xl border px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${isLight ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100' : 'border-blue-400/20 bg-blue-400/10 text-blue-200 hover:bg-blue-400/15'}`}
                >
                  {isLoading
                    ? (lang === 'th' ? 'กำลังส่งคำขอ...' : 'Sending request...')
                    : (lang === 'th' ? 'ไม่ได้รับอีเมล? ส่งลิงก์ยืนยันอีกครั้ง' : 'No email? Resend confirmation link')}
                </button>
                <p className={`text-center text-[11px] leading-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'th'
                    ? 'หากยังไม่ได้รับ โปรดตรวจสแปม หรือให้ผู้ดูแลตั้งค่า SMTP สำหรับส่งอีเมล'
                    : 'If it still does not arrive, check spam or ask the administrator to configure SMTP.'}
                </p>
              </div>
            )}
            <label className="block text-xs font-medium">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-blue-600" />{lang === 'th' ? 'รหัสผ่าน' : 'Password'}</span>
              <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            </label>
            <button type="submit" disabled={isLoading || (mode === 'register' && registrationType === 'student' && schools.length === 0)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-indigo-800 disabled:translate-y-0 disabled:opacity-50">
              {isLoading ? (lang === 'th' ? 'กำลังดำเนินการ...' : 'Please wait...') : (mode === 'login' ? (lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign in') : registrationType === 'school' ? (lang === 'th' ? 'ลงทะเบียนโรงเรียน' : 'Register school') : (lang === 'th' ? 'สร้างบัญชีนักเรียน' : 'Create student account'))}
              {mode === 'register' && registrationType === 'school' && <Building2 className="w-4 h-4" />}
              {!(mode === 'register' && registrationType === 'school') && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
          {mode === 'login' && (
            <button
              type="button"
              onClick={onStartDemo}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition ${isLight ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'border-indigo-400/20 bg-indigo-400/10 text-indigo-200 hover:bg-indigo-400/15'}`}
            >
              <Sparkles className="h-4 w-4" />
              {lang === 'th' ? 'ทดลองใช้ระบบ Demo' : 'Explore the Demo'}
            </button>
          )}
        </div>
            <div className={`flex items-center justify-center gap-2 border-t px-6 py-4 text-[11px] sm:px-8 ${isLight ? 'border-slate-100 text-slate-400' : 'border-white/10 text-slate-500'}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {lang === 'th' ? 'การเข้าถึงข้อมูลถูกแยกตามโรงเรียนและบทบาท' : 'Access is scoped by school and role'}
            </div>
          </div>
          <p className={`mt-4 text-center text-[11px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            © {new Date().getFullYear()} EduVerse · {lang === 'th' ? 'ระบบบริหารการศึกษา' : 'Education management platform'}
          </p>
        </div>
      </section>
    </main>
  );
};
