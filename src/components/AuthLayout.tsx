import React, { useEffect, useState } from 'react';
import { AppLanguage, School, ThemePalette, UserRole } from '../types';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Lock,
  Mail,
  Moon,
  School as SchoolIcon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  UserCheck,
  Users,
  Award,
  Flame,
  LayoutGrid,
  FileText,
  X,
  KeyRound,
  AlertCircle,
  Send,
  HelpCircle,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import {
  authenticateImportedLocalUser,
  authenticateWithSupabase,
  getDemoStudentAccounts,
  listActiveSchools,
  resendSignupConfirmation,
  requestPasswordReset,
  MASTER_SYSTEM_EMAIL,
  registerSchoolWithSupabase,
  registerStudentWithSupabase,
  saveAllDemoStudentAccounts,
  type AuthContext,
  type StoredImportedCredential,
} from '../lib/authDb';
import { getSupabaseClient } from '../lib/supabase';
import { PWAInstallButton } from './PWAInstallButton';
import heroImage from '../assets/images/hero_classroom_teacher_students_1793958712620.jpg';
import featureLmsImage from '../assets/images/classroom_teaching_learning_1793958766838.jpg';
import featureArenaImage from '../assets/images/feature_eduarena_game_learning_1793951856246.jpg';
import featureClinicImage from '../assets/images/feature_smart_student_health_clinic_1793951856130.jpg';

interface AuthLayoutProps {
  onLogin: (context: AuthContext) => void;
  onLoginImportedUser?: (cred: StoredImportedCredential) => void;
  onStartDemo: (role?: UserRole) => void;
  initialError?: string | null;
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
  onLoginImportedUser,
  onStartDemo,
  initialError,
  lang,
  setLang,
  themePalette = 'light_warm',
  setThemePalette,
}) => {
  // Main Portal View: 'showcase' (Demo & Capability Showcase) vs 'live_login' (Production School Portal)
  const [activePortalTab, setActivePortalTab] = useState<'showcase' | 'live_login'>('showcase');
  const [showcasePage, setShowcasePage] = useState(0);
  const [personaPage, setPersonaPage] = useState(0);
  const [featurePage, setFeaturePage] = useState(0);
  const [loginMobilePage, setLoginMobilePage] = useState<'form' | 'information'>('form');

  // Production Auth Form State
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
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showSmtpGuideModal, setShowSmtpGuideModal] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [smtpTab, setSmtpTab] = useState<'gmail_smtp' | 'disable_confirm' | 'sql_confirm' | 'superadmin'>('gmail_smtp');

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
        const importedMatch = authenticateImportedLocalUser(email, password);
        if (!getSupabaseClient() && importedMatch && onLoginImportedUser) {
          onLoginImportedUser(importedMatch);
          return;
        }
        try {
          onLogin(await authenticateWithSupabase(email, password));
          return;
        } catch (supaErr) {
          if (importedMatch && onLoginImportedUser) {
            onLoginImportedUser(importedMatch);
            return;
          }
          throw supaErr;
        }
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
          ? 'ลงทะเบียนโรงเรียนเรียบร้อยแล้ว! ข้อมูลส่งเข้าสู่ระบบแล้ว โดย Super Admin (farmissara@gmail.com) จะเป็นผู้อนุมัติเปิดใช้งานจากระบบโดยตรง'
          : 'School registered successfully! Awaiting direct system approval from Super Admin.');
      } else {
        if (!schoolId) throw new Error(lang === 'th' ? 'ไม่มีโรงเรียนที่เปิดรับสมัคร กรุณาติดต่อผู้ดูแลระบบ' : 'No active school available.');
        if (!getSupabaseClient()) {
          const existingAll = getDemoStudentAccounts(schoolId);
          saveAllDemoStudentAccounts([
            {
              id: `demo-stu-reg-${Date.now()}`,
              school_id: schoolId,
              student_id: null,
              full_name_th: fullNameTh.trim(),
              full_name_en: (fullNameEn || fullNameTh).trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim() || undefined,
              status: 'pending',
              created_at: new Date().toISOString(),
            },
            ...existingAll,
          ]);
        } else {
          await registerStudentWithSupabase({
            email,
            password,
            fullNameTh,
            fullNameEn,
            schoolId,
            phone,
          });
        }
        setNotice(lang === 'th'
          ? 'ลงทะเบียนนักเรียนสำเร็จ! บัญชีของคุณถูกส่งเข้าสู่ระบบแล้ว และรอการอนุมัติเปิดใช้งานจากผู้ดูแลโรงเรียน (เมนู ทะเบียนนักเรียน DMC → คำขอสมัครเข้าโรงเรียน)'
          : 'Student registered successfully! Awaiting school administrator approval.');
      }
      setMode('login');
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      if (/confirmation email|rate limit/i.test(message)) {
        setNotice(lang === 'th'
          ? 'ลงทะเบียนเรียบร้อยแล้ว! ข้อมูลส่งเข้าสู่ระบบแล้ว โดย Super Admin (farmissara@gmail.com) จะเป็นผู้อนุมัติเปิดใช้งานจากระบบโดยตรง'
          : 'Registration received! Super Admin will approve and activate your account directly from the system.');
        setError(null);
        setMode('login');
        return;
      }
      setError(mode === 'login' && message.toLowerCase().includes('invalid login credentials')
        ? (lang === 'th'
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีอยู่ระหว่างรอ Super Admin / ผู้ดูแลโรงเรียนอนุมัติเปิดใช้งาน'
          : 'Invalid email or password, or account is awaiting administrator approval.')
        : getAuthErrorMessage(message, lang));
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
      setNotice(lang === 'th'
        ? 'ส่งคำขออนุมัติเปิดใช้งานไปยัง Super Admin (farmissara@gmail.com) เรียบร้อยแล้ว'
        : 'Activation request submitted to Super Admin for system approval.');
    } catch {
      setNotice(lang === 'th'
        ? 'ส่งคำขออนุมัติเปิดใช้งานไปยัง Super Admin (farmissara@gmail.com) เรียบร้อยแล้ว'
        : 'Activation request submitted to Super Admin for system approval.');
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
      setResetStatus(lang === 'th'
        ? `ระบบได้ส่งคำขอเปลี่ยนรหัสผ่านสำหรับ ${target} แล้ว โดยมี Master System Email: ${MASTER_SYSTEM_EMAIL} เป็นผู้ดูแลยืนยันและตอบกลับ`
        : `Password reset request submitted for ${target}. Master confirmation and replies are handled by ${MASTER_SYSTEM_EMAIL}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopySnippet = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const isLight = !themePalette.includes('dark') && themePalette !== 'sapphire';

  return (
    <main className="relative h-screen overflow-hidden flex flex-col bg-[var(--color-canvas)] text-[var(--color-text-body)] transition-colors duration-200">
      {/* Subtle Prestige Ambient Glow Background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full blur-3xl ${isLight ? 'bg-blue-200/35' : 'bg-blue-900/15'}`} />
        <div className={`absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full blur-3xl ${isLight ? 'bg-indigo-200/35' : 'bg-indigo-900/15'}`} />
        <div className={`absolute inset-0 opacity-[0.2] ${isLight ? 'bg-[radial-gradient(#94a3b8_0.8px,transparent_0.8px)]' : 'bg-[radial-gradient(#475569_0.8px,transparent_0.8px)]'} [background-size:24px_24px]`} />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Brand Lockup */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base sm:text-lg font-black tracking-tight text-[var(--color-text-title)] leading-none">
                EduVerse
              </span>
              <span className="block text-[10px] font-semibold text-[var(--color-primary-text)] tracking-wider mt-0.5">
                {lang === 'th' ? 'ระบบบริหารสถานศึกษาและนวัตกรรมการเรียนรู้' : 'Next-Gen School Operating System'}
              </span>
            </div>
          </div>

          {/* Center Mode Switcher for Desktop */}
          <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setActivePortalTab('showcase')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activePortalTab === 'showcase'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'จัดแสดงความสามารถ & Demo' : 'Capabilities & Demo'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePortalTab('live_login')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activePortalTab === 'live_login'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เข้าสู่ระบบใช้งานจริง' : 'Official Portal Login'}</span>
            </button>
          </div>

          {/* Action Zone: PWA, Lang, Theme */}
          <div className="flex items-center gap-2">
            <PWAInstallButton lang={lang} variant="nav" />

            <button
              type="button"
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] px-2.5 text-xs font-bold transition cursor-pointer"
              title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            >
              <Globe className="h-3.5 w-3.5 text-[var(--color-primary-text)] shrink-0" />
              <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setThemePalette?.(isLight ? 'sapphire' : 'light_warm')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] transition cursor-pointer"
              title={lang === 'th' ? 'สลับโหมดสีถนอมสายตา' : 'Toggle Theme'}
              aria-label="Change theme"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Segmented Portal Switcher */}
      <div className="md:hidden border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2">
        <div className="flex gap-1.5 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActivePortalTab('showcase')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activePortalTab === 'showcase'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'จัดแสดง & Demo' : 'Showcase & Demo'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab('live_login')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activePortalTab === 'live_login'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เข้าสู่ระบบจริง' : 'Official Login'}</span>
          </button>
        </div>
      </div>

      {activePortalTab === 'showcase' && (
        <nav aria-label="Showcase pages" className="relative z-10 shrink-0 flex items-center justify-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] py-2 px-3">
          {[
            lang === 'th' ? 'ภาพรวม' : 'Overview',
            lang === 'th' ? 'นวัตกรรม' : 'Innovations',
            lang === 'th' ? 'ฟังก์ชัน' : 'Capabilities',
            lang === 'th' ? 'เริ่มต้นใช้งาน' : 'Get Started',
          ].map((label, index) => (
            <button key={label} type="button" onClick={() => setShowcasePage(index)} aria-current={showcasePage === index ? 'page' : undefined} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${showcasePage === index ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'}`}>
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CAPABILITY SHOWCASE & INTERACTIVE DEMO (จัดแสดงความสามารถ & DEMO) */}
      {/* ========================================================================= */}
      {activePortalTab === 'showcase' && (
        <div className="relative z-10 flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-y-auto">
          
          {/* Hero Section: Value Proposition & High-Fidelity Educational Graphic */}
          {showcasePage === 0 && <section className="grid min-h-0 items-center gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 pb-6">
            
            {/* Left Content */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] px-3.5 py-1 text-xs font-bold text-[var(--color-primary-text)]">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                <span>{lang === 'th' ? 'นวัตกรรมการศึกษายุคใหม่ • Digital Campus 2026' : 'Next-Gen Education Intelligence 2026'}</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-[1.12] tracking-tight text-[var(--color-text-title)]">
                  {lang === 'th' ? (
                    <>
                      ศูนย์รวมการบริหารสถานศึกษา<br />
                      <span className="text-[var(--color-primary-text)]">
                        และนวัตกรรมการเรียนรู้แห่งอนาคต
                      </span>
                    </>
                  ) : (
                    <>
                      Transforming School Operations with<br />
                      <span className="text-[var(--color-primary-text)]">
                        Modern Intelligence & Interactive 3D
                      </span>
                    </>
                  )}
                </h1>
                <p className="text-xs sm:text-base leading-relaxed text-[var(--color-text-body)] max-w-xl">
                  {lang === 'th'
                    ? 'แพลตฟอร์มการศึกษาครบวงจรที่ผสานระบบวิชาการ ตารางสอนอัจฉริยะ คัดกรอง SDQ บัตรนักเรียนเสมือน ห้องพยาบาลดิจิทัล และเกมประลองปัญญา 3 มิติ ตอบโจทย์ทุกบทบาทในโรงเรียน'
                    : 'Comprehensive school operations & learning platform combining LMS, smart conflict-free schedules, SDQ mental health screening, virtual student cards, digital infirmary clinic, and 3D EduArena.'}
                </p>
              </div>

              {/* Dedicated Showcase Persona Launcher: 1-Click Access for Evaluators */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[var(--color-primary)] text-white shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-title)] leading-tight">
                        {lang === 'th' ? 'ทดลองใช้งานระบบจำลองทันที (Interactive Demo Persona)' : 'Instant 1-Click Demo Persona Launchpad'}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {lang === 'th' ? 'เลือกบทบาทเพื่อเข้าสำรวจฟังก์ชันการทำงานได้เต็มรูปแบบโดยไม่ต้องกรอกรหัสผ่าน' : 'Experience full system functionality as any persona without signing in'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Dedicated Persona Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  
                  {/* Admin Persona */}
                  {personaPage === 0 && <><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-black text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ผู้อำนวยการ / ผู้บริหาร' : 'Principal / Executive'}
                          </h4>
                          <span className="text-[10px] font-bold text-[var(--color-primary-text)]">Admin</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">
                          {lang === 'th' ? 'สถิติภาพรวม KPI โรงเรียน, รายรับค่าเทอม, อนุมัติ ปพ.1/ปพ.7, และจัดการโครงสร้างสถานศึกษา' : 'Executive KPIs, tuition revenue, transcript approvals, and school permissions'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartDemo('admin')}
                      className="w-full py-2 px-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'เข้าชมในฐานะ ผอ.' : 'Launch as Principal'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Teacher Persona */}
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-black text-[var(--color-text-title)]">
                            {lang === 'th' ? 'คุณครูประจำชั้น & ผู้สอน' : 'Teacher & Educator'}
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Teacher</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">
                          {lang === 'th' ? 'เช็กชื่อรายคาบ GPS, บันทึกคะแนนและเกรด, คัดกรอง SDQ, สั่งการบ้าน, และจัดการห้องเรียน' : 'GPS attendance, gradebook grading, SDQ assessments, and homework tracker'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartDemo('teacher')}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'เข้าชมในฐานะ คุณครู' : 'Launch as Teacher'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Student Persona */}
                  </>}
                  {personaPage === 1 && <><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-black text-[var(--color-text-title)]">
                            {lang === 'th' ? 'นักเรียน' : 'Enrolled Student'}
                          </h4>
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Student</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">
                          {lang === 'th' ? 'ตารางเรียนเรียลไทม์, บัตรนักเรียนดิจิทัล, ส่งการบ้าน, เล่นเกม 3D EduArena, และร้านค้าของรางวัล' : 'Real-time timetable, digital ID, homework upload, 3D EduArena, and reward shop'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartDemo('student')}
                      className="w-full py-2 px-3 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'เข้าชมในฐานะ นักเรียน' : 'Launch as Student'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Parent Persona */}
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-black text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ผู้ปกครอง' : 'Parent / Guardian'}
                          </h4>
                          <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300">Parent</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">
                          {lang === 'th' ? 'ติดตามเวลาเข้า-ออกโรงเรียน, แจ้งใบลาออนไลน์, ชำระค่าเทอม, และติดตามเวชระเบียนห้องพยาบาล' : 'Live attendance alerts, online leave requests, tuition pay, and clinic logs'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartDemo('parent')}
                      className="w-full py-2 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'เข้าชมในฐานะ ผู้ปกครอง' : 'Launch as Parent'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </>}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => setPersonaPage(page => Math.max(0, page - 1))} disabled={personaPage === 0} className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer font-semibold">{lang === 'th' ? 'บทบาทก่อนหน้า' : 'Previous roles'}</button>
                  <span className="font-semibold text-[var(--color-text-title)]">{personaPage + 1} / 2</span>
                  <button type="button" onClick={() => setPersonaPage(page => Math.min(1, page + 1))} disabled={personaPage === 1} className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer font-semibold">{lang === 'th' ? 'บทบาทถัดไป' : 'Next roles'}</button>
                </div>

                {/* Switch to Official Portal Hint */}
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>
                    {lang === 'th' ? 'สำหรับโรงเรียนที่ต้องการลงชื่อเข้าใช้ด้วยบัญชีจริง' : 'For schools logging in with real database credentials'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePortalTab('live_login')}
                    className="font-bold text-[var(--color-primary-text)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{lang === 'th' ? 'ไปที่หน้าเข้าสู่ระบบทางการ' : 'Go to Official Login'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Install EduVerse on Android & iOS */}
              <PWAInstallButton lang={lang} variant="mobile_card" />
            </div>

            {/* Right Educational Hero Visual */}
            <div className="relative group hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-slate-900 shadow-2xl">
                <img
                  src={heroImage}
                  alt="EduVerse Happy Students and Teacher in Modern Classroom"
                  className="w-full h-auto aspect-[16/10] object-cover transition-transform duration-700 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                
                {/* High Contrast Gradient Overlay for Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent pointer-events-none" />

                {/* Floating Highlights Badges */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>{lang === 'th' ? 'ระบบตรวจจับคาบซ้ำซ้อน 100%' : '100% Conflict-Free Scheduling'}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span>{lang === 'th' ? 'แยกฐานข้อมูลตามโรงเรียน (Multi-Tenant)' : 'Multi-Tenant Encrypted'}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md">
                    <Smartphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{lang === 'th' ? 'รองรับ PWA ติดตั้งลงมือถือ' : 'Offline PWA Ready'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>}

          {/* Feature Showcase Gallery: Visual Deep-Dive into 3 Flagship Pillars */}
          {showcasePage === 1 && <section className="h-full min-h-0 space-y-3 pt-1">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-text-title)] tracking-tight">
                {lang === 'th' ? 'จัดแสดงนวัตกรรมการเรียนรู้และระบบปฏิบัติการสถานศึกษา' : 'Explore EduVerse Core Innovation Modules'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'ผสมผสานงานวิชาการ การดูแลสุขภาวะนักเรียน และเทคโนโลยี Gamification เข้าด้วยกันอย่างไร้รอยต่อ'
                  : 'Seamlessly unifying academic administration, student health & counseling, and immersive gamification'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Feature 1: Smart Classroom & LMS */}
              <div className={`${featurePage === 0 ? '' : 'hidden'} rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-md flex flex-col group transition`}>
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={featureLmsImage}
                    alt="Digital LMS Classroom"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-blue-800/95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>LMS & Academic</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ห้องเรียนออนไลน์ & ตัดเกรดอัตโนมัติ' : 'Smart LMS & Auto Gradebook'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] mt-1.5 leading-relaxed">
                      {lang === 'th'
                        ? 'บทเรียนดิจิทัล มอบหมายงาน ตรวจการบ้านออนไลน์ พร้อมระบบตัดเกรด อิงเกณฑ์ สพฐ. และออกใบ ปพ.1/ปพ.7 ทั้งภาษาไทยและอังกฤษ'
                        : 'Interactive coursework, digital assignments, automated GPA grading, and bilingual transcript generation.'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center text-[11px] font-semibold text-[var(--color-primary-text)]">
                    <span>{lang === 'th' ? 'รองรับตัดเกรด A-F และ 0-4' : 'Grade calculation 0.0 - 4.0'}</span>
                  </div>
                </div>
              </div>

              {/* Feature 2: 3D EduArena Gamification */}
              <div className={`${featurePage === 1 ? '' : 'hidden'} rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-md flex flex-col group transition`}>
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={featureArenaImage}
                    alt="EduArena 3D Learning Arena"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-800/95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>3D EduArena</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text-title)]">
                      {lang === 'th' ? 'สนามประลองปัญญา 3 มิติ (EduArena)' : 'Immersive 3D EduArena'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] mt-1.5 leading-relaxed">
                      {lang === 'th'
                        ? 'ขับเคลื่อนด้วย Three.js จำลองสนามรบ 3D วิ่งเปิดหีบสมบัติความรู้ ตอบคำถามชิงคะแนน วงบีบ Safe Zone สกินชุดนักเรียน และแอร์ดรอป 2x EXP'
                        : 'Interactive real-time 3D learning arena with knowledge loot chests, shrinking safe zone, student skins, and standard question banks.'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    <span>{lang === 'th' ? 'รวม 8 หมวดสาระ & ข้อสอบมาตรฐาน' : '8 core question banks + custom'}</span>
                  </div>
                </div>
              </div>

              {/* Feature 3: Infirmary Health & SDQ */}
              <div className={`${featurePage === 2 ? '' : 'hidden'} rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-md flex flex-col group transition`}>
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={featureClinicImage}
                    alt="Digital Infirmary & Wellness"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-800/95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Infirmary & SDQ</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text-title)]">
                      {lang === 'th' ? 'เวชระเบียนห้องพยาบาล & คัดกรอง SDQ' : 'Digital Infirmary & SDQ Clinic'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] mt-1.5 leading-relaxed">
                      {lang === 'th'
                        ? 'บันทึกการเข้าพักรักษา จ่ายยา ติดตามอุณหภูมิ พร้อมแบบประเมิน SDQ 5 ด้าน และระบบตัด/เพิ่มคะแนนความประพฤตินักเรียน'
                        : 'Student clinic visit logs, medication dispensary, 5-domain SDQ mental health screening, and behavior points.'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    <span>{lang === 'th' ? 'แจ้งเตือนผู้ปกครองผ่าน LINE' : 'Parent notifications via LINE'}</span>
                  </div>
                </div>
              </div>

            </div>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setFeaturePage(page => Math.max(0, page - 1))} disabled={featurePage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer font-semibold">{lang === 'th' ? 'ก่อนหน้า' : 'Previous'}</button>
              <span className="font-semibold text-[var(--color-text-title)]">{featurePage + 1} / 3</span>
              <button type="button" onClick={() => setFeaturePage(page => Math.min(2, page + 1))} disabled={featurePage === 2} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer font-semibold">{lang === 'th' ? 'ถัดไป' : 'Next'}</button>
            </div>
          </section>}

          {/* Quick Technical Pillars Strip */}
          {showcasePage === 2 && <section className="h-full grid content-center grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: UserCheck,
                title: lang === 'th' ? 'เช็กชื่อ QR & ประตูสแกน' : 'Smart Gate Attendance',
                desc: lang === 'th' ? 'ป้องกันการลงชื่อแทนด้วยพิกัด GPS' : 'Geofenced selfie & turnstile gate'
              },
              {
                icon: Calendar,
                title: lang === 'th' ? 'ตารางสอนไร้คาบชน' : 'Conflict-Free Timetable',
                desc: lang === 'th' ? 'ตรวจจับครูสอนซ้ำและห้องซ้อน' : 'Instant room & teacher overlap alerts'
              },
              {
                icon: CreditCard,
                title: lang === 'th' ? 'บัตรนักเรียนเสมือนจริง' : 'Digital Student ID',
                desc: lang === 'th' ? 'บาร์โค้ดห้องสมุด & ยอดเงินกระเป๋า' : 'Virtual card with canteen wallet'
              },
              {
                icon: FileText,
                title: lang === 'th' ? 'รายงานและเอกสารทางการ' : 'Academic Reporting',
                desc: lang === 'th' ? 'พิมพ์ใบ ปพ. ใบเสร็จ A4 คมชัด' : 'Printable bilingual A4 transcripts'
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary-text)] shrink-0 mt-0.5">
                  <pillar.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[var(--color-text-title)] truncate">
                    {pillar.title}
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            ))}
          </section>}

          {/* Bottom Banner: Call to Action to Switch to Real Portal or Launch Demo */}
          {showcasePage === 3 && <section className="h-full rounded-3xl border border-blue-700 bg-gradient-to-r from-blue-800 via-indigo-800 to-blue-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {lang === 'th' ? 'พร้อมยกระดับสถานศึกษาของคุณแล้วหรือยัง?' : 'Ready to Elevate Your School Operations?'}
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
                {lang === 'th'
                  ? 'ลงทะเบียนโรงเรียนใหม่เข้าสู่ระบบคลาวด์ หรือเปิดเข้าสู่ระบบใช้งานจริงสำหรับครูและนักเรียนที่มีบัญชีอยู่แล้ว'
                  : 'Register a new school or sign in to your official institution workspace.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActivePortalTab('live_login');
                  setMode('register');
                  setRegistrationType('school');
                }}
                className="px-5 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-md transition cursor-pointer"
              >
                {lang === 'th' ? 'ลงทะเบียนโรงเรียนใหม่' : 'Register New School'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePortalTab('live_login');
                  setMode('login');
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-slate-900 border border-blue-400 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เข้าสู่ระบบทางการ' : 'Official Portal Login'}</span>
              </button>
            </div>
          </section>}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OFFICIAL PRODUCTION SCHOOL LOGIN (เข้าสู่ระบบใช้งานจริงสำหรับโรงเรียน) */}
      {/* ========================================================================= */}
      {activePortalTab === 'live_login' && (
        <div className="relative z-10 flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col gap-3 overflow-y-auto pb-8">
          
          {/* Header Distinction Banner */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--color-primary)] text-white shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ระบบลงชื่อเข้าใช้งานจริงของสถานศึกษา (Production Gateway)' : 'Official School Production Portal'}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th'
                    ? 'สำหรับผู้บริหาร, ครู, นักเรียน และเจ้าหน้าที่ที่มีบัญชีสังกัดโรงเรียนจริงในระบบ'
                    : 'For verified school personnel, educators, enrolled students, and guardians.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActivePortalTab('showcase')}
              className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
              <span>{lang === 'th' ? 'สลับไปโหมดสาธิต (Demo Showcase)' : 'Switch to Demo Showcase'}</span>
            </button>
          </div>

          <div className="lg:hidden flex gap-2 shrink-0">
            <button type="button" onClick={() => setLoginMobilePage('form')} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${loginMobilePage === 'form' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>{lang === 'th' ? 'เข้าสู่ระบบ / สมัครสมาชิก' : 'Sign in / Register'}</button>
            <button type="button" onClick={() => setLoginMobilePage('information')} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${loginMobilePage === 'information' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'}`}>{lang === 'th' ? 'ความปลอดภัยและโรงเรียน' : 'Security & Schools'}</button>
          </div>

          {/* Form & Security Columns */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 lg:gap-8 items-start">
            
            {/* Left Column: Security Architecture & School Directory Info */}
            <div className={`${loginMobilePage === 'information' ? 'block' : 'hidden'} lg:block min-h-0 space-y-3`}>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-[var(--color-primary-text)] font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>{lang === 'th' ? 'มาตรฐานความปลอดภัยระดับสถานศึกษา' : 'Enterprise School Security'}</span>
                </div>
                <div className="space-y-3 text-xs text-[var(--color-text-body)] leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
                    <span><strong>Multi-Tenant Data Isolation:</strong> ฐานข้อมูลแยกสิทธิ์ตามโรงเรียน ครูและนักเรียนเข้าถึงได้เฉพาะโรงเรียนต้นสังกัดตนเองเท่านั้น</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
                    <span><strong>PDPA & Data Privacy Compliant:</strong> ข้อมูลระเบียนประวัติ บัตรประชาชน และสุขภาพผ่านการเข้ารหัส 256-bit AES</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
                    <span><strong>Automatic Cloud Sync:</strong> บันทึกข้อมูลและสำรองข้อมูลอัตโนมัติบน Supabase Cloud Platform</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)]">
                  <h4 className="text-xs font-bold text-[var(--color-text-title)] mb-1.5">
                    {lang === 'th' ? 'โรงเรียนที่เปิดระบบพร้อมใช้งานขณะนี้:' : 'Active Schools in System:'}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {schools.length > 0 ? (
                      schools.map(s => (
                        <span key={s.id} className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border border-[var(--color-border)] font-medium">
                          {lang === 'th' ? s.nameTh : s.nameEn}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {schoolLoadError ? `(ข้อผิดพลาด: ${schoolLoadError})` : 'กำลังโหลดรายชื่อสถานศึกษา...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Instant Demo Shortcut Card in Real Login View */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <h4 className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'หากคุณเป็นกรรมการประเมินหรือผู้เข้าเยี่ยมชม' : 'For System Evaluators & Visitors'}
                  </h4>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th'
                    ? 'สามารถกดสลับไปที่โหมดทดลองเล่น (Demo) เพื่อทดสอบทุกระบบได้ทันทีโดยไม่ต้องลงทะเบียนบัญชีใหม่'
                    : 'Switch to Demo mode to immediately experience all modules without creating a new database account.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActivePortalTab('showcase')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{lang === 'th' ? 'เปิดโหมดทดลองเล่น (Demo Showcase)' : 'Open Demo Showcase'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Sleek Authentication Form */}
            <div className={`${loginMobilePage === 'form' ? 'block' : 'hidden'} lg:block w-full max-w-md mx-auto min-h-0 overflow-hidden`}>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl overflow-hidden">
                
                {/* Header Switcher: Sign In vs Sign Up */}
                <div className="p-5 sm:p-6 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm shrink-0">
                      {mode === 'login' ? <SchoolIcon className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--color-text-title)] leading-tight">
                        {mode === 'login'
                          ? (lang === 'th' ? 'เข้าสู่ระบบบัญชีโรงเรียน' : 'Sign in to EduVerse')
                          : (registrationType === 'school'
                              ? (lang === 'th' ? 'ลงทะเบียนสถานศึกษาใหม่' : 'Register New School')
                              : (lang === 'th' ? 'ลงทะเบียนบัญชีนักเรียน' : 'Student Registration'))}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {mode === 'login'
                          ? (lang === 'th' ? 'กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน' : 'Enter registered email and password')
                          : (lang === 'th' ? 'กรอกข้อมูลเพื่อเปิดใช้งานบัญชี' : 'Provide details to create account')}
                      </p>
                    </div>
                  </div>

                  <div className="flex rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-1">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); setNotice(null); }}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                        mode === 'login'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                      }`}
                    >
                      {lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError(null); setNotice(null); }}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                        mode === 'register'
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                      }`}
                    >
                      {lang === 'th' ? 'สมัครสมาชิก' : 'Sign Up'}
                    </button>
                  </div>
                </div>

                {/* Form Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  {mode === 'register' && (
                    <div className="flex gap-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-1">
                      <button
                        type="button"
                        onClick={() => { setRegistrationType('student'); setError(null); setNotice(null); }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          registrationType === 'student'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                        }`}
                      >
                        {lang === 'th' ? 'บัญชีนักเรียน' : 'Student Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRegistrationType('school'); setError(null); setNotice(null); }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          registrationType === 'school'
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                        }`}
                      >
                        {lang === 'th' ? 'ลงทะเบียนโรงเรียนใหม่' : 'School Registration'}
                      </button>
                    </div>
                  )}

                  {error && (
                    <div role="alert" className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-100 dark:bg-rose-950 p-3 text-xs font-medium text-rose-900 dark:text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  )}

                  {notice && (
                    <div role="status" className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-950 p-3 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      {notice}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {mode === 'register' && registrationType === 'student' && (
                      <>
                        <label className="block text-xs font-bold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'สังกัดโรงเรียน' : 'Select School'}
                          <select
                            required
                            value={schoolId}
                            onChange={(e) => setSchoolId(e.target.value)}
                            disabled={schools.length === 0}
                            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                          >
                            {schools.map((school) => (
                              <option key={school.id} value={school.id}>
                                {lang === 'th' ? school.nameTh : school.nameEn}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-xs font-bold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาไทย)' : 'Full Name (Thai)'}
                          <input
                            required
                            value={fullNameTh}
                            onChange={(e) => setFullNameTh(e.target.value)}
                            placeholder="เช่น ด.ช. ภูมิใจ รักเรียน"
                            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                          />
                        </label>

                        <label className="block text-xs font-bold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาอังกฤษ, ไม่บังคับ)' : 'Full Name (English, optional)'}
                          <input
                            value={fullNameEn}
                            onChange={(e) => setFullNameEn(e.target.value)}
                            placeholder="e.g. Phumjai Rakrian"
                            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                          />
                        </label>

                        <label className="block text-xs font-bold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'เบอร์โทรศัพท์ (ถ้ามี)' : 'Phone (Optional)'}
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="081-xxx-xxxx"
                            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                          />
                        </label>
                      </>
                    )}

                    {mode === 'register' && registrationType === 'school' && (
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
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
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
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] pt-1">
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
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || (mode === 'register' && registrationType === 'student' && schools.length === 0)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer mt-2"
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

                    {/* Master System Authority Contact Card */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="leading-snug min-w-0">
                        <div className="font-semibold text-blue-950 dark:text-blue-100 flex items-center gap-1.5 flex-wrap">
                          <span>{lang === 'th' ? 'อีเมล Master ยืนยันระบบ:' : 'Master Authority Email:'}</span>
                          <a
                            href={`mailto:${MASTER_SYSTEM_EMAIL}`}
                            className="font-mono font-bold text-blue-700 dark:text-blue-300 hover:underline"
                          >
                            {MASTER_SYSTEM_EMAIL}
                          </a>
                        </div>
                        <div className="text-[10px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                          {lang === 'th'
                            ? 'ใช้สำหรับส่ง/ตอบกลับยืนยันตัวตน, รีเซ็ตรหัสผ่าน และประสานงานผู้ดูแลระบบกลาง'
                            : 'Used for confirmation replies, password resets, and master administrator support'}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer Security Notice */}
                <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] px-6 py-3.5 text-[11px] text-[var(--color-text-muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
                  <span>{lang === 'th' ? 'เชื่อมต่อฐานข้อมูลความปลอดภัยสูง (Supabase Encrypted Multi-Tenant)' : 'Secured via Supabase multi-tenant isolation'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Minimal Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border)] bg-[var(--color-card)] py-4 text-center text-xs text-[var(--color-text-muted)] shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span className="font-semibold text-[var(--color-text-title)]">EduVerse Academic Operations</span>
            <span>·</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setShowSmtpGuideModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'คู่มือตั้งค่า Supabase SMTP' : 'Supabase SMTP Guide'}</span>
            </button>
            <span>·</span>
            <span>PDPA Standard</span>
            <span>·</span>
            <span>WCAG 2.1 AA Compliant</span>
            <span>·</span>
            <span>PWA Offline Capable</span>
          </div>
        </div>
      </footer>

      {/* Modal: Forgot / Reset Password with Master Authority Email */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
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
                    {lang === 'th' ? 'ส่งคำขอไปยังระบบ และมี Master Email เป็นผู้ยืนยัน' : 'Request reset link via master authority'}
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

            {/* Master Contact Notice */}
            <div className="p-3 mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-100">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'th' ? 'อีเมล Master สำหรับยืนยันการเปลี่ยนรหัสผ่าน:' : 'Master Authority Email:'}</span>
              </div>
              <div className="font-mono text-xs font-semibold pl-5 text-blue-700 dark:text-blue-300">
                {MASTER_SYSTEM_EMAIL}
              </div>
              <div className="text-[11px] text-blue-800/80 dark:text-blue-300/80 pl-5 leading-relaxed">
                {lang === 'th'
                  ? 'ระบบจะส่งคำขอและประสานงานยืนยันผ่าน Master Email นี้ หากไม่ได้รับอีเมลอัตโนมัติสามารถส่งอีเมลตรงเพื่อขอความช่วยเหลือได้ทันที'
                  : 'All security reset verifications are managed through this master address.'}
              </div>
            </div>

            {/* Status alerts */}
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

            {/* Direct Mailto Fallback */}
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

      {/* Modal: Supabase SMTP & Email Confirmation Setup Guide */}
      {showSmtpGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4 shrink-0 bg-[var(--color-card-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                    {lang === 'th' ? 'คู่มือตั้งค่า Supabase SMTP & แก้ปัญหาอีเมลยืนยัน' : 'Supabase SMTP & Email Confirmation Guide'}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'วิธีแก้ปัญหา "Supabase ส่งอีเมลยืนยันไม่สำเร็จ"' : 'Fixing "Error sending confirmation email"'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpGuideModal(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 pt-2 gap-1 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setSmtpTab('gmail_smtp')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  smtpTab === 'gmail_smtp'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                1. ตั้งค่า Gmail SMTP ({MASTER_SYSTEM_EMAIL})
              </button>
              <button
                type="button"
                onClick={() => setSmtpTab('disable_confirm')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  smtpTab === 'disable_confirm'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                2. ปิด Confirm Email (ใช้งานได้ทันที)
              </button>
              <button
                type="button"
                onClick={() => setSmtpTab('sql_confirm')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  smtpTab === 'sql_confirm'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                3. คำสั่ง SQL ยืนยันบัญชีค้างอยู่
              </button>
              <button
                type="button"
                onClick={() => setSmtpTab('superadmin')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  smtpTab === 'superadmin'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                4. อนุมัติผ่าน Super Admin
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[var(--color-text-body)] flex-1">
              {smtpTab === 'gmail_smtp' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 leading-relaxed text-xs">
                    <span className="font-bold">สาเหตุที่เกิดปัญหานี้:</span> เมลเซิร์ฟเวอร์เริ่มต้นฟรีของ Supabase มีข้อจำกัด (Rate Limit ส่งได้เพียง 3-4 ฉบับต่อชั่วโมง) เพื่อส่งอีเมลยืนยันการสมัครและรีเซ็ตรหัสผ่านได้ไม่จำกัด แนะนำให้ตั้งค่า <strong>Gmail SMTP</strong> ด้วยอีเมล <strong>{MASTER_SYSTEM_EMAIL}</strong>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-[var(--color-text-title)] flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px]">1</span>
                      <span>ขั้นตอนที่ 1: สร้าง Google App Password (รหัสผ่านสำหรับแอป)</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 pl-2 leading-relaxed text-[11px] text-[var(--color-text-body)]">
                      <li>เข้าสู่บัญชี Google ที่ <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5">myaccount.google.com/security <ExternalLink className="w-3 h-3" /></a></li>
                      <li>เปิดใช้งาน <strong>การยืนยันแบบ 2 ขั้นตอน (2-Step Verification)</strong> ให้เรียบร้อย</li>
                      <li>พิมพ์ค้นหาที่ช่องค้นหาด้านบนว่า <strong>"App passwords"</strong> หรือ <strong>"รหัสผ่านสำหรับแอป"</strong></li>
                      <li>ตั้งชื่อแอป เช่น <code>EduVerse Supabase</code> แล้วกดปุ่ม <strong>สร้าง (Create)</strong></li>
                      <li>คัดลอกรหัสผ่าน 16 ตัวอักษร (เช่น <code>abcd efgh ijkl mnop</code>)</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
                    <h4 className="font-bold text-sm text-[var(--color-text-title)] flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px]">2</span>
                      <span>ขั้นตอนที่ 2: นำค่าไปใส่ใน Supabase Dashboard</span>
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      ไปที่ <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> → เลือกโปรเจกต์ → เมนู <strong>Authentication</strong> → <strong>Emails</strong> → แท็บ <strong>SMTP Settings</strong> → เปิด <strong>Enable Custom SMTP</strong> แล้วกรอกค่าเหล่านี้:
                    </p>

                    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)] font-mono text-[11px]">
                      {[
                        { label: 'Sender email', value: MASTER_SYSTEM_EMAIL },
                        { label: 'Sender name', value: 'EduVerse Academic Operations' },
                        { label: 'Host', value: 'smtp.gmail.com' },
                        { label: 'Port', value: '465' },
                        { label: 'Username', value: MASTER_SYSTEM_EMAIL },
                        { label: 'Password', value: '[รหัสผ่าน App Password 16 ตัวที่ได้จาก Google]' },
                      ].map((item) => (
                        <div key={item.label} className="p-2.5 flex items-center justify-between gap-2 bg-[var(--color-card-subtle)]">
                          <span className="text-[var(--color-text-muted)] font-sans font-medium w-28 shrink-0">{item.label}:</span>
                          <span className="text-[var(--color-text-title)] font-bold truncate flex-1">{item.value}</span>
                          {item.value !== '[รหัสผ่าน App Password 16 ตัวที่ได้จาก Google]' && (
                            <button
                              type="button"
                              onClick={() => handleCopySnippet(item.value, item.label)}
                              className="px-2 py-1 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-[10px] font-sans font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] transition cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              {copiedSnippet === item.label ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedSnippet === item.label ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                      ✓ เมื่อกรอกครบแล้ว กดปุ่ม <strong>Save changes</strong> ที่ด้านล่าง จากนั้นลองกดปุ่มส่งลิงก์ยืนยันใน EduVerse อีกครั้งได้ทันที
                    </p>
                  </div>
                </div>
              )}

              {smtpTab === 'disable_confirm' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 leading-relaxed text-xs">
                    <span className="font-bold">วิธีที่เร็วที่สุด (ไม่ต้องใช้ SMTP):</span> หากต้องการให้ผู้ใช้สมัครสมาชิกแล้วล็อกอินใช้งานได้ทันทีโดยไม่ต้องรอยืนยันอีเมล ให้ปิดฟังก์ชัน <strong>Confirm email</strong> ใน Supabase
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="font-bold text-sm text-[var(--color-text-title)]">ขั้นตอนการปิด Confirm email ใน Supabase Dashboard:</h4>
                    <ol className="list-decimal list-inside space-y-2 pl-2 text-xs leading-relaxed">
                      <li>เข้าสู่ <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> แล้วเลือกโปรเจกต์ของคุณ</li>
                      <li>ในแถบเมนูด้านซ้าย คลิกที่ไอคอน <strong>Authentication</strong></li>
                      <li>เลือกเมนูย่อย <strong>Providers</strong> แล้วคลิกที่แถบ <strong>Email</strong></li>
                      <li>เลื่อนลงมาที่ตัวเลือก <strong>"Confirm email"</strong></li>
                      <li><strong>คลิกสวิตช์เป็น ปิด (Disable / Turn Off)</strong></li>
                      <li>คลิกปุ่มสีเขียว <strong>"Save"</strong> ที่มุมขวาล่าง</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    💡 <strong>ผลลัพธ์:</strong> หลังจากปิด Confirm email แล้ว การสมัครโรงเรียนและสมัครบัญชีนักเรียนใหม่จะได้รับการยืนยันทันที 100% โดยจะไม่เกิดข้อผิดพลาด "Supabase ส่งอีเมลยืนยันไม่สำเร็จ" อีกต่อไป
                  </div>
                </div>
              )}

              {smtpTab === 'sql_confirm' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs leading-relaxed">
                    หากคุณได้ทำการสมัครบัญชีไปแล้ว แต่อีเมลยังไม่ได้รับการยืนยัน สามารถรันคำสั่ง SQL นี้ใน <strong>Supabase SQL Editor</strong> เพื่อยืนยันบัญชีและเปิดใช้งานโรงเรียนได้ทันที
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between pb-1.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      <span>SQL Script (รันใน Supabase → SQL Editor):</span>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(`-- 1. ยืนยันอีเมลบัญชีที่สมัครไว้ทั้งหมดทันที
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 2. เปิดใช้งานโปรไฟล์บัญชีผู้ใช้
UPDATE public.user_profiles 
SET status = 'active' 
WHERE status = 'pending';

-- 3. เปิดใช้งานโรงเรียนที่สมัครใหม่
UPDATE public.schools 
SET status = 'active' 
WHERE status = 'pending';`, 'sql_all')}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedSnippet === 'sql_all' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSnippet === 'sql_all' ? 'คัดลอกโค้ดแล้ว' : 'คัดลอกโค้ด SQL ทั้งหมด'}</span>
                      </button>
                    </div>

                    <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`-- 1. ยืนยันอีเมลบัญชีที่สมัครไว้ทั้งหมดทันที
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 2. เปิดใช้งานโปรไฟล์บัญชีผู้ใช้
UPDATE public.user_profiles 
SET status = 'active' 
WHERE status = 'pending';

-- 3. เปิดใช้งานโรงเรียนที่สมัครใหม่
UPDATE public.schools 
SET status = 'active' 
WHERE status = 'pending';`}
                    </pre>
                  </div>
                </div>
              )}

              {smtpTab === 'superadmin' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs leading-relaxed">
                    <span className="font-bold">อนุมัติด้วยตนเองผ่านระบบ (Manual Super Admin Approval):</span> 
                    Super Admin สามารถเข้าสู่ระบบและกดอนุมัติการสมัครโรงเรียนได้โดยตรง แม้ว่าอีเมลจะยังไม่ได้รับการยืนยันก็ตาม
                  </div>

                  <ol className="list-decimal list-inside space-y-2 pl-2 text-xs leading-relaxed">
                    <li>เข้าสู่ระบบด้วยบัญชี Super Admin: <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{MASTER_SYSTEM_EMAIL}</span></li>
                    <li>ไปที่เมนู <strong>ศูนย์ควบคุมระบบ (Super Admin Console)</strong></li>
                    <li>เลือกแท็บ <strong>"อนุมัติการสมัครโรงเรียน" (School Approvals)</strong></li>
                    <li>จะพบรายการโรงเรียนที่สมัครค้างอยู่ คลิกปุ่ม <strong>"อนุมัติ"</strong></li>
                    <li>ระบบจะทำการยืนยันอีเมลและเปิดใช้งานโรงเรียนให้โดยอัตโนมัติทันที</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-card-subtle)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Master Contact: <strong>{MASTER_SYSTEM_EMAIL}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-xs font-bold text-white transition cursor-pointer"
              >
                {lang === 'th' ? 'เข้าใจแล้ว / ปิดหน้าต่าง' : 'Got it / Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
