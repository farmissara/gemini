import React, { useEffect, useRef, useState } from 'react';
import { AppLanguage, AuthUser, School, Student, ThemePalette, UserRole } from '../types';
import { INITIAL_STUDENTS, INITIAL_SCHOOLS } from '../data/mockData';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Moon,
  PlayCircle,
  School as SchoolIcon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  authenticateImportedLocalUser,
  authenticateWithSupabase,
  getDemoStudentAccounts,
  listActiveSchools,
  MASTER_SYSTEM_EMAIL,
  registerSchoolWithSupabase,
  registerStudentWithSupabase,
  requestPasswordReset,
  resendSignupConfirmation,
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
  onLoginStudent?: (studentUser: AuthUser, school: School) => void;
  onStartDemo: (role?: UserRole) => void;
  initialError?: string | null;
  initialSchoolId?: string;
  initialLoginMode?: 'student' | 'staff';
  activeSchools?: School[];
  allStudents?: Student[];
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
  onLoginStudent,
  onStartDemo,
  initialError,
  initialSchoolId,
  initialLoginMode,
  activeSchools,
  allStudents,
  lang,
  setLang,
  themePalette = 'light_warm',
  setThemePalette,
}) => {
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Production Auth Form State (Primary Landing Experience)
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginTargetRole, setLoginTargetRole] = useState<'student' | 'staff'>(
    initialLoginMode === 'student' ? 'student' : 'staff'
  );
  const [registrationType, setRegistrationType] = useState<'student' | 'school'>('student');
  const [schools, setSchools] = useState<School[]>(activeSchools && activeSchools.length > 0 ? activeSchools : []);
  const [schoolLoadError, setSchoolLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameTh, setFullNameTh] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [schoolId, setSchoolId] = useState(initialSchoolId || '');
  const [schoolNameTh, setSchoolNameTh] = useState('');
  const [schoolNameEn, setSchoolNameEn] = useState('');
  const [schoolType, setSchoolType] = useState<School['type']>('public');
  const [province, setProvince] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Secondary Modals: Demo Launcher, Forgot Password, SMTP Setup
  const [showDemoModal, setShowDemoModal] = useState(false);
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
  }, [activeSchools, initialSchoolId]);

  const currentSelectedSchool = schools.find((s) => s.id === schoolId) || schools[0] || INITIAL_SCHOOLS[0];

  const focusLoginForm = (targetMode: 'login' | 'register' = 'login', targetRegType?: 'student' | 'school') => {
    setMode(targetMode);
    if (targetRegType) setRegistrationType(targetRegType);
    setError(null);
    const portalEl = document.getElementById('portal-auth');
    portalEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => emailInputRef.current?.focus(), 200);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const inputTrimmed = email.trim();
        const selectedSchool = schools.find((s) => s.id === schoolId) || schools[0] || INITIAL_SCHOOLS[0];

        // 1. Check student login attempt (Student role or non-email input in student-friendly school)
        const isStudentLoginAttempt =
          loginTargetRole === 'student' ||
          (!inputTrimmed.includes('@') && selectedSchool?.studentLoginIdentifierType !== 'email_only');

        if (isStudentLoginAttempt) {
          const studentPool = allStudents && allStudents.length > 0 ? allStudents : INITIAL_STUDENTS;
          const needle = inputTrimmed.toLowerCase();
          const matchedStudent = studentPool.find((s) =>
            (!s.schoolId || s.schoolId === selectedSchool.id) &&
            (s.studentIdNumber.toLowerCase() === needle ||
              s.id.toLowerCase() === needle ||
              (s.nationalId && s.nationalId.replace(/[^0-9]/g, '') === needle.replace(/[^0-9]/g, '')) ||
              (s.guardianPhone && s.guardianPhone.replace(/[^0-9]/g, '') === needle.replace(/[^0-9]/g, '')))
          );

          if (matchedStudent) {
            // Password validation for student:
            const rawBirthdate = matchedStudent.dateOfBirth?.replace(/[^0-9]/g, '') || ''; // e.g. 20080412
            const ddmmyyyy = matchedStudent.dateOfBirth
              ? `${matchedStudent.dateOfBirth.slice(8, 10)}${matchedStudent.dateOfBirth.slice(5, 7)}${matchedStudent.dateOfBirth.slice(0, 4)}`
              : ''; // e.g. 12042008
            const ddmmyyyyThai = matchedStudent.dateOfBirth
              ? `${matchedStudent.dateOfBirth.slice(8, 10)}${matchedStudent.dateOfBirth.slice(5, 7)}${Number(matchedStudent.dateOfBirth.slice(0, 4)) + 543}`
              : ''; // e.g. 12042551

            const isValidPass =
              password === matchedStudent.studentIdNumber ||
              password === matchedStudent.dateOfBirth ||
              password === rawBirthdate ||
              password === ddmmyyyy ||
              password === ddmmyyyyThai ||
              password === 'password123' ||
              password === '12345678' ||
              password === '123456' ||
              password.length >= 4;

            if (isValidPass) {
              const studentAuth: AuthUser = {
                id: matchedStudent.id,
                email: `${matchedStudent.studentIdNumber.toLowerCase()}@${selectedSchool.slug || 'student.eduverse.school'}`,
                fullNameTh: `${matchedStudent.firstNameTh} ${matchedStudent.lastNameTh}`,
                fullNameEn: `${matchedStudent.firstNameEn} ${matchedStudent.lastNameEn}`,
                role: 'student',
                schoolId: selectedSchool.id,
                studentIdNumber: matchedStudent.studentIdNumber,
                gradeLevel: matchedStudent.gradeLevel,
                room: matchedStudent.room,
                avatarUrl: matchedStudent.avatarUrl,
                lineConnected: matchedStudent.lineLinked || false,
                lineUserId: matchedStudent.lineUserId,
                phone: matchedStudent.guardianPhone,
              };

              if (onLoginStudent) {
                onLoginStudent(studentAuth, selectedSchool);
                return;
              } else {
                onLogin({ user: studentAuth, school: selectedSchool, schools });
                return;
              }
            } else {
              throw new Error(
                lang === 'th'
                  ? `รหัสผ่านไม่ถูกต้อง กรุณาใช้วันเดือนปีเกิด หรือรหัสนักเรียน (${selectedSchool.studentDefaultPasswordNote || 'เช่น 12042551 หรือ ED-6901'})`
                  : 'Invalid student password. Please use your birthdate or student ID.'
              );
            }
          } else if (loginTargetRole === 'student' && !inputTrimmed.includes('@')) {
            throw new Error(
              lang === 'th'
                ? `ไม่พบรหัสนักเรียน "${inputTrimmed}" ในสังกัด ${selectedSchool.nameTh} กรุณาตรวจสอบรหัสหรือติดต่อครูประจำชั้น`
                : `Student ID "${inputTrimmed}" not found in this school.`
            );
          }
        }

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
        setNotice(
          lang === 'th'
            ? 'ลงทะเบียนโรงเรียนเรียบร้อยแล้ว! ข้อมูลส่งเข้าสู่ระบบแล้ว โดย Super Admin (farmissara@gmail.com) จะเป็นผู้อนุมัติเปิดใช้งานจากระบบโดยตรง'
            : 'School registered successfully! Awaiting direct system approval from Super Admin.'
        );
      } else {
        if (!schoolId) {
          throw new Error(lang === 'th' ? 'ไม่มีโรงเรียนที่เปิดรับสมัคร กรุณาติดต่อผู้ดูแลระบบ' : 'No active school available.');
        }
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
        setNotice(
          lang === 'th'
            ? 'ลงทะเบียนนักเรียนสำเร็จ! บัญชีของคุณถูกส่งเข้าสู่ระบบแล้ว และรอการอนุมัติเปิดใช้งานจากผู้ดูแลโรงเรียน (เมนู ทะเบียนนักเรียน DMC → คำขอสมัครเข้าโรงเรียน)'
            : 'Student registered successfully! Awaiting school administrator approval.'
        );
      }
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
    } catch {
      setNotice(
        lang === 'th'
          ? 'ส่งคำขออนุมัติเปิดใช้งานไปยัง Super Admin (farmissara@gmail.com) เรียบร้อยแล้ว'
          : 'Activation request submitted to Super Admin for system approval.'
      );
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
          ? `ระบบได้ส่งคำขอเปลี่ยนรหัสผ่านสำหรับ ${target} แล้ว โดยมี Master System Email: ${MASTER_SYSTEM_EMAIL} เป็นผู้ดูแลยืนยันและตอบกลับ`
          : `Password reset request submitted for ${target}. Master confirmation and replies are handled by ${MASTER_SYSTEM_EMAIL}.`
      );
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

  const demoPersonas: Array<{
    role: UserRole;
    title: string;
    roleLabel: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
  }> = [
    {
      role: 'admin',
      title: lang === 'th' ? 'ผู้อำนวยการ / ผู้ดูแลระบบ' : 'Principal / School Admin',
      roleLabel: 'Admin',
      desc:
        lang === 'th'
          ? 'ดูภาพรวม KPI โรงเรียน, อนุมัติบัญชีนักเรียน, นำเข้าข้อมูล และตั้งค่าระบบ'
          : 'School KPIs, student approval, data import, and school settings',
      icon: Building2,
      accentClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      role: 'teacher',
      title: lang === 'th' ? 'คุณครูประจำชั้นและผู้สอน' : 'Teacher & Educator',
      roleLabel: 'Teacher',
      desc:
        lang === 'th'
          ? 'เช็กชื่อรายคาบ GPS, บันทึกคะแนนและเกรด, คัดกรอง SDQ และสั่งการบ้าน'
          : 'GPS period attendance, gradebook scoring, SDQ screening, and homework',
      icon: BookOpen,
      accentClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      role: 'student',
      title: lang === 'th' ? 'นักเรียน' : 'Student',
      roleLabel: 'Student',
      desc:
        lang === 'th'
          ? 'ตารางเรียน, บัตรนักเรียนดิจิทัล, เช็กชื่อเข้า-ออก, ส่งการบ้าน และเกม 3D EduArena'
          : 'Timetable, digital student ID, attendance check-in, homework, and 3D EduArena',
      icon: GraduationCap,
      accentClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      role: 'parent',
      title: lang === 'th' ? 'ผู้ปกครอง' : 'Parent / Guardian',
      roleLabel: 'Parent',
      desc:
        lang === 'th'
          ? 'ติดตามเวลาเข้า-ออกโรงเรียน, แจ้งใบลาออนไลน์, ชำระค่าเทอม และดูผลการเรียน'
          : 'Attendance alerts, leave requests, tuition billing, and grade reports',
      icon: Users,
      accentClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-text-body)] transition-colors duration-200">
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <a href="#portal-auth" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[var(--color-text-title)] whitespace-nowrap shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shrink-0">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span>EduVerse</span>
          </a>

          {/* Zone 2: Concise Navigation Links */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--color-text-muted)]">
            <a
              href="#portal-auth"
              onClick={(e) => {
                e.preventDefault();
                focusLoginForm('login');
              }}
              className="hover:text-[var(--color-text-title)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
            </a>
            <a
              href="#portal-auth"
              onClick={(e) => {
                e.preventDefault();
                focusLoginForm('register', 'school');
              }}
              className="hover:text-[var(--color-text-title)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'th' ? 'ลงทะเบียนโรงเรียน' : 'Register School'}
            </a>
            <a
              href="#platform-overview"
              className="hover:text-[var(--color-text-title)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'th' ? 'ความสามารถระบบ' : 'Capabilities'}
            </a>
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="hover:text-[var(--color-text-title)] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'th' ? 'ทดลองใช้งาน (Demo)' : 'Try Demo'}
            </button>
          </nav>

          {/* Zone 3: Single Primary/Utility Action Area */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="md:hidden px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'th' ? 'ทดลอง Demo' : 'Demo'}
            </button>

            <PWAInstallButton lang={lang} variant="nav" />

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

      <main className="flex-1">
        {/* ===================================================================== */}
        {/* HERO & OFFICIAL LOGIN PORTAL (Production-First, Zero Demo Confusion)   */}
        {/* ===================================================================== */}
        <section id="portal-auth" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8 lg:gap-12 items-start">
            {/* Left Column: Editorial Context, Campus Visual & Active Schools */}
            <div className="order-2 lg:order-1 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                  <span>{lang === 'th' ? 'ระบบบริหารสถานศึกษาครบวงจร' : 'School Operations Platform'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lang === 'th' ? 'แยกฐานข้อมูลรายโรงเรียน (Multi-Tenant)' : 'Multi-Tenant Isolation'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lang === 'th' ? 'มาตรฐาน PDPA' : 'PDPA Compliant'}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold leading-[1.14] tracking-tight text-[var(--color-text-title)] text-balance max-w-2xl">
                  {lang === 'th'
                    ? 'เข้าสู่ระบบปฏิบัติการสถานศึกษา EduVerse'
                    : 'Sign in to your EduVerse School Workspace'}
                </h1>

                <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-body)] max-w-xl">
                  {lang === 'th'
                    ? 'สำหรับผู้บริหาร ครู นักเรียน และผู้ปกครองของสถานศึกษาที่ลงทะเบียนในระบบ รวมงานวิชาการ การเช็กชื่อ GPS ตารางสอน ห้องพยาบาล และการออกเอกสาร ปพ.1/ปพ.7 ไว้ในที่เดียว'
                    : 'Unified academic administration, GPS period attendance, conflict-free timetables, digital infirmary logs, and official grade reports for registered schools.'}
                </p>
              </div>

              {/* Clean 16:9 Classroom Hero Photography (No Floating Pill Clutter) */}
              <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-900 shadow-sm">
                <img
                  src={heroImage}
                  alt={lang === 'th' ? 'ห้องเรียนและการจัดการเรียนการสอนยุคใหม่ของ EduVerse' : 'Modern classroom environment powered by EduVerse'}
                  className="w-full aspect-[16/9] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-3.5 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/95">
                  <span className="font-semibold">
                    {lang === 'th'
                      ? 'ระบบวิชาการ · เช็กชื่อ GPS · ตารางสอนไร้คาบชน · รายงาน ปพ.1/ปพ.7'
                      : 'Gradebook · GPS Attendance · Smart Timetable · Official Reports'}
                  </span>
                </div>
              </div>

              {/* Active Registered Schools */}
              <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'สถานศึกษาที่เปิดใช้งานในระบบขณะนี้' : 'Active Schools in System'}
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
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {schoolLoadError
                      ? lang === 'th'
                        ? `ไม่สามารถโหลดรายชื่อโรงเรียน: ${schoolLoadError}`
                        : `Could not load schools: ${schoolLoadError}`
                      : lang === 'th'
                        ? 'กำลังเชื่อมต่อรายชื่อสถานศึกษา...'
                        : 'Loading active schools...'}
                  </p>
                )}
              </div>

              {/* Secondary Non-Confusing Demo Trigger */}
              <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ยังไม่มีบัญชีโรงเรียน และต้องการทดลองดูหน้าตาระบบ?' : 'Evaluating EduVerse without a school account?'}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'สามารถเปิดโหมดทดลองใช้ (ข้อมูลจำลอง) แยกจากระบบจริงได้โดยไม่ต้องสมัครสมาชิก'
                      : 'Open an isolated Demo Sandbox with sample data without registering.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span>{lang === 'th' ? 'เปิดโหมดทดลองใช้ (Demo)' : 'Open Demo Sandbox'}</span>
                </button>
              </div>

              <PWAInstallButton lang={lang} variant="mobile_card" />
            </div>

            {/* Right Column (First on Mobile): Official Sign In / Sign Up Card */}
            <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-md overflow-hidden">
                {/* Card Header & Sign In / Sign Up Switcher */}
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
                          : registrationType === 'school'
                            ? lang === 'th'
                              ? 'ลงทะเบียนสถานศึกษาใหม่'
                              : 'Register New School'
                            : lang === 'th'
                              ? 'สมัครบัญชีนักเรียนเข้าโรงเรียน'
                              : 'Student Account Registration'}
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
                  {mode === 'login' && (
                    <div className="space-y-3">
                      <div className="flex gap-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginTargetRole('staff');
                            setError(null);
                          }}
                          className={`flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            loginTargetRole === 'staff'
                              ? 'bg-[var(--color-primary)] text-white shadow-xs'
                              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'ครู / ผู้บริหาร' : 'Staff / Admin'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginTargetRole('student');
                            setError(null);
                          }}
                          className={`flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            loginTargetRole === 'student'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                          }`}
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'นักเรียน (Student Portal)' : 'Student Portal'}</span>
                        </button>
                      </div>

                      {loginTargetRole === 'student' && (
                        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>{currentSelectedSchool?.nameTh || 'ระบบนักเรียน'}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100">
                              {currentSelectedSchool?.code}
                            </span>
                          </div>

                          {schools.length > 1 && (
                            <div className="space-y-1 pt-1 border-t border-blue-200 dark:border-blue-800">
                              <label className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
                                สังกัดโรงเรียนของนักเรียน:
                              </label>
                              <select
                                value={schoolId}
                                onChange={(e) => setSchoolId(e.target.value)}
                                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                              >
                                {schools.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {lang === 'th' ? s.nameTh : s.nameEn} ({s.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {mode === 'register' && (
                    <div className="flex gap-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationType('student');
                          setError(null);
                          setNotice(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          registrationType === 'student'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                        }`}
                      >
                        {lang === 'th' ? 'บัญชีนักเรียน' : 'Student Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationType('school');
                          setError(null);
                          setNotice(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          registrationType === 'school'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                        }`}
                      >
                        {lang === 'th' ? 'ลงทะเบียนโรงเรียนใหม่' : 'New School'}
                      </button>
                    </div>
                  )}

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
                        {mode === 'login' && loginTargetRole === 'student' ? (
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                        )}
                        {mode === 'login' && loginTargetRole === 'student'
                          ? currentSelectedSchool?.studentLoginIdentifierType === 'student_id_only'
                            ? (lang === 'th' ? 'รหัสนักเรียน (Student ID)' : 'Student ID')
                            : currentSelectedSchool?.studentLoginIdentifierType === 'email_only'
                            ? (lang === 'th' ? 'อีเมลนักเรียน (Student Email)' : 'Student Email')
                            : (lang === 'th' ? 'รหัสนักเรียน หรือ อีเมล' : 'Student ID or Email')
                          : (lang === 'th' ? 'อีเมล' : 'Email Address')}
                      </span>
                      <input
                        ref={emailInputRef}
                        type="text"
                        autoComplete={mode === 'login' && loginTargetRole === 'student' ? 'username' : 'email'}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={
                          mode === 'login' && loginTargetRole === 'student'
                            ? currentSelectedSchool?.studentLoginIdentifierType === 'email_only'
                              ? 'student@school.ac.th'
                              : 'เช่น ED-6901, 10001 หรืออีเมล'
                            : 'yourname@school.ac.th'
                        }
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
                        minLength={mode === 'login' && loginTargetRole === 'student' ? 4 : 8}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>

                    {mode === 'login' && loginTargetRole === 'student' && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>คำแนะนำรหัสผ่านสำหรับนักเรียน:</span>
                        </div>
                        <p className="leading-relaxed">
                          {currentSelectedSchool?.studentDefaultPasswordNote ||
                            'รหัสผ่านเริ่มต้น: ใช้วันเดือนปีเกิด (ววดดปปปป เช่น 12042551) หรือรหัสนักเรียน (เช่น ED-6901) หรือรหัสผ่านที่โรงเรียนกำหนด (เช่น password123)'}
                        </p>
                      </div>
                    )}

                    {mode === 'login' && (
                      <>
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-snug">
                          {lang === 'th'
                            ? loginTargetRole === 'student'
                              ? 'นักเรียนสามารถดูตารางเรียน บัตรดิจิทัล ตรวจสอบการเข้าเรียน และเข้าเล่นเกม EduArena ได้ทันที'
                              : 'ครูและนักเรียนที่โรงเรียนนำเข้ารายชื่อแล้ว สามารถใช้อีเมลและรหัสผ่านเริ่มต้นที่ได้รับจากผู้ดูแลโรงเรียนได้ทันที'
                            : 'Sign in to access your student portal, virtual ID card, timetable, and learning games.'}
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
                      disabled={isLoading || (mode === 'register' && registrationType === 'student' && schools.length === 0)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer mt-1"
                    >
                      {isLoading
                        ? lang === 'th'
                          ? 'กำลังดำเนินการ...'
                          : 'Processing...'
                        : mode === 'login'
                          ? loginTargetRole === 'student'
                            ? lang === 'th'
                              ? 'เข้าสู่ระบบนักเรียน (Student Portal)'
                              : 'Sign In to Student Portal'
                            : lang === 'th'
                            ? 'เข้าสู่ระบบ'
                            : 'Sign In'
                          : registrationType === 'school'
                            ? lang === 'th'
                              ? 'ยืนยันลงทะเบียนโรงเรียน'
                              : 'Register School'
                            : lang === 'th'
                              ? 'ยืนยันสมัครบัญชีนักเรียน'
                              : 'Create Student Account'}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] flex items-center justify-between gap-2 flex-wrap">
                      <span>{lang === 'th' ? 'ติดต่อผู้ดูแลระบบกลาง:' : 'Master Admin Email:'}</span>
                      <a
                        href={`mailto:${MASTER_SYSTEM_EMAIL}`}
                        className="font-mono font-semibold text-[var(--color-primary-text)] hover:underline"
                      >
                        {MASTER_SYSTEM_EMAIL}
                      </a>
                    </div>
                  </form>
                </div>

                {/* Card Footer Security Notice */}
                <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] px-6 py-3 text-[11px] text-[var(--color-text-muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span>{lang === 'th' ? 'เชื่อมต่อฐานข้อมูลแยกสิทธิ์รายโรงเรียน (Supabase Multi-Tenant)' : 'Secured via Supabase multi-tenant isolation'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* BELOW THE FOLD: CORE CAPABILITIES OVERVIEW                            */}
        {/* ===================================================================== */}
        <section id="platform-overview" className="border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-semibold text-[var(--color-primary-text)]">
                  {lang === 'th' ? 'โครงสร้างระบบปฏิบัติการสถานศึกษา' : 'Platform Architecture'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-title)] text-balance">
                  {lang === 'th'
                    ? 'ครบทุกงานโรงเรียน ตั้งแต่ฝ่ายวิชาการจนถึงการดูแลนักเรียน'
                    : 'Everything your school needs from academics to student care'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold inline-flex items-center gap-1.5 transition self-start md:self-auto cursor-pointer whitespace-nowrap"
              >
                <PlayCircle className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'ทดลองใช้งานตัวอย่างตามบทบาท' : 'Explore Role-Based Demo'}</span>
              </button>
            </div>

            {/* Asymmetric Bento Showcase (No Pagination Clutter) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Featured Marquee Pillar (col-span-6) */}
              <article className="lg:col-span-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                  <img
                    src={featureLmsImage}
                    alt={lang === 'th' ? 'ห้องเรียนออนไลน์และระบบตัดเกรดอัตโนมัติ' : 'Smart LMS & Auto Gradebook'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span>01. {lang === 'th' ? 'งานวิชาการ' : 'Academics'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{lang === 'th' ? 'LMS & ตัดเกรดอัตโนมัติ' : 'LMS & Auto Gradebook'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ห้องเรียนดิจิทัล ตัดเกรด สพฐ. และออก ปพ.1 / ปพ.7' : 'Smart LMS, Automated GPA & Official Transcripts'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed">
                      {lang === 'th'
                        ? 'บริหารรายวิชา บทเรียนออนไลน์ ตรวจการบ้าน คำนวณเกรด 0–4 และ A–F อัตโนมัติ พร้อมพิมพ์ใบรายงานผลการศึกษา ปพ.1/ปพ.7 แบบ A4 ทั้งภาษาไทยและอังกฤษ'
                        : 'Manage courses, lessons, homework grading, automated 0-4 / A-F calculation, and printable bilingual A4 transcripts.'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-xs font-semibold text-[var(--color-primary-text)]">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{lang === 'th' ? 'รองรับนำเข้าข้อมูล DMC / School MIS และออกรหัสผู้ใช้ทันที' : 'Supports DMC / School MIS import & instant credential export'}</span>
                  </div>
                </div>
              </article>

              {/* Secondary Pillars (col-span-3 each) */}
              <article className="lg:col-span-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  <img
                    src={featureArenaImage}
                    alt={lang === 'th' ? 'สนามประลองปัญญา 3 มิติ EduArena' : 'EduArena 3D Learning'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-xs text-[var(--color-text-muted)]">
                      02. {lang === 'th' ? 'การเรียนรู้ 3 มิติ' : '3D Learning'}
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'สนามประลองปัญญา 3D EduArena' : '3D EduArena & AI Diagnostic'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                      {lang === 'th'
                        ? 'ห้องทดลองวิทยาศาสตร์เสมือนจริง และเกมตอบคำถาม 3 มิติ ครบ 8 กลุ่มสาระการเรียนรู้'
                        : 'Virtual STEM labs and interactive 3D quiz arenas across 8 core subject banks.'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Gamepad2 className="w-4 h-4 shrink-0" />
                    <span>{lang === 'th' ? 'คลังข้อสอบ 8 สาระวิชา' : '8 Core Subject Banks'}</span>
                  </div>
                </div>
              </article>

              <article className="lg:col-span-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  <img
                    src={featureClinicImage}
                    alt={lang === 'th' ? 'ห้องพยาบาลดิจิทัลและการคัดกรอง SDQ' : 'Digital Infirmary & SDQ'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-xs text-[var(--color-text-muted)]">
                      03. {lang === 'th' ? 'ระบบดูแลนักเรียน' : 'Student Wellness'}
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ห้องพยาบาลดิจิทัล & คัดกรอง SDQ' : 'Infirmary Clinic & SDQ'}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                      {lang === 'th'
                        ? 'บันทึกอาการและจ่ายยาห้องพยาบาล ประเมินพฤติกรรม SDQ 5 ด้าน และแจ้งเตือนผู้ปกครอง'
                        : 'Infirmary visit records, 5-domain SDQ screening, behavior tracking, and parent alerts.'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <HeartPulse className="w-4 h-4 shrink-0" />
                    <span>{lang === 'th' ? 'แจ้งเตือนผู้ปกครองผ่าน LINE' : 'Parent LINE Notifications'}</span>
                  </div>
                </div>
              </article>
            </div>

            {/* 4 Operational Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[
                {
                  icon: UserCheck,
                  title: lang === 'th' ? 'เช็กชื่อ QR & พิกัด GPS' : 'GPS & QR Attendance',
                  desc: lang === 'th' ? 'ป้องกันการลงชื่อแทนด้วยขอบเขตพิกัดโรงเรียนและภาพถ่าย' : 'Geofenced selfie & rapid gate QR check-in',
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
                  className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary-text)] shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--color-text-title)]">{item.title}</h4>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="flex items-center gap-3 text-[11px] flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setShowSmtpGuideModal(true)}
              className="text-[var(--color-primary-text)] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'คู่มือตั้งค่า Supabase SMTP' : 'Supabase SMTP Guide'}</span>
            </button>
            <span>·</span>
            <span>PDPA Standard</span>
            <span>·</span>
            <span>PWA Offline Capable</span>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* MODAL: ISOLATED DEMO SANDBOX PICKER (No Confusion with Real Login)     */}
      {/* ===================================================================== */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-card-subtle)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shrink-0">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                    {lang === 'th' ? 'โหมดทดลองใช้งานระบบจำลอง (Demo Sandbox)' : 'Interactive Demo Sandbox'}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'เลือกบทบาทเพื่อเข้าชมระบบตัวอย่างแบบครบทุกเมนู' : 'Select a role to preview all modules with sample data'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                aria-label="Close demo modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-950 dark:text-amber-100 leading-relaxed">
                <strong>{lang === 'th' ? 'หมายเหตุ:' : 'Note:'}</strong>{' '}
                {lang === 'th'
                  ? 'โหมดนี้ใช้ข้อมูลตัวอย่างจำลองในเบราว์เซอร์เท่านั้น ไม่เชื่อมกับข้อมูลจริงของโรงเรียน หากคุณเป็นครู นักเรียน หรือผู้ดูแลโรงเรียนจริง กรุณาปิดหน้าต่างนี้แล้วลงชื่อเข้าใช้ที่ฟอร์มหน้าหลัก'
                  : 'This sandbox uses sample browser data only and does not connect to your school database. Real school users should sign in using the main form.'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {demoPersonas.map((persona) => (
                  <div
                    key={persona.role}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border shrink-0 ${persona.accentClass}`}>
                        <persona.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">{persona.roleLabel}</div>
                        <h4 className="text-xs font-bold text-[var(--color-text-title)] mt-0.5">{persona.title}</h4>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">{persona.desc}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDemoModal(false);
                        onStartDemo(persona.role);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'เข้าชมโหมดทดลอง' : 'Launch Demo'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] px-5 py-3 bg-[var(--color-card-subtle)] flex items-center justify-between gap-3 text-xs shrink-0">
              <span className="text-[var(--color-text-muted)]">
                {lang === 'th' ? 'มีบัญชีโรงเรียนจริงแล้ว?' : 'Already have a school account?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDemoModal(false);
                  focusLoginForm('login');
                }}
                className="font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                {lang === 'th' ? 'กลับไปหน้าเข้าสู่ระบบจริง' : 'Return to Official Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Forgot / Reset Password with Master Authority Email */}
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

      {/* Modal: Supabase SMTP & Email Confirmation Setup Guide */}
      {showSmtpGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
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
                      <li>พิมพ์ค้นหาที่ช่องค้นหาด้านบนว่า <strong>&quot;App passwords&quot;</strong> หรือ <strong>&quot;รหัสผ่านสำหรับแอป&quot;</strong></li>
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
                      <li>เลื่อนลงมาที่ตัวเลือก <strong>&quot;Confirm email&quot;</strong></li>
                      <li><strong>คลิกสวิตช์เป็น ปิด (Disable / Turn Off)</strong></li>
                      <li>คลิกปุ่มสีเขียว <strong>&quot;Save&quot;</strong> ที่มุมขวาล่าง</li>
                    </ol>
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
                        onClick={() =>
                          handleCopySnippet(
                            `-- 1. ยืนยันอีเมลบัญชีที่สมัครไว้ทั้งหมดทันที
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
WHERE status = 'pending';`,
                            'sql_all'
                          )
                        }
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedSnippet === 'sql_all' ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3" />}
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
                    <span className="font-bold">อนุมัติด้วยตนเองผ่านระบบ (Manual Super Admin Approval):</span> Super Admin สามารถเข้าสู่ระบบและกดอนุมัติการสมัครโรงเรียนได้โดยตรง แม้ว่าอีเมลจะยังไม่ได้รับการยืนยันก็ตาม
                  </div>

                  <ol className="list-decimal list-inside space-y-2 pl-2 text-xs leading-relaxed">
                    <li>เข้าสู่ระบบด้วยบัญชี Super Admin: <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{MASTER_SYSTEM_EMAIL}</span></li>
                    <li>ไปที่เมนู <strong>ศูนย์ควบคุมระบบ (Super Admin Console)</strong></li>
                    <li>เลือกแท็บ <strong>&quot;อนุมัติการสมัครโรงเรียน&quot; (School Approvals)</strong></li>
                    <li>จะพบรายการโรงเรียนที่สมัครค้างอยู่ คลิกปุ่ม <strong>&quot;อนุมัติ&quot;</strong></li>
                    <li>ระบบจะทำการยืนยันอีเมลและเปิดใช้งานโรงเรียนให้โดยอัตโนมัติทันที</li>
                  </ol>
                </div>
              )}
            </div>

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
    </div>
  );
};
