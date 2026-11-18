import React, { useEffect, useRef, useState } from 'react';
import { AppLanguage, School, ThemePalette } from '../../types';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  GraduationCap,
  Info,
  KeyRound,
  Lock,
  Mail,
  Moon,
  QrCode,
  School as SchoolIcon,
  Send,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import {
  authenticateWithSupabase,
  completeFirstStudentPasswordChange,
  fetchSchoolLoginPortalInfo,
  registerSchoolWithSupabase,
  requestPasswordReset,
  resendSignupConfirmation,
  restoreSupabaseSession,
  signOutFromSupabase,
  updatePassword,
  type AuthContext,
  type SchoolLoginPortalInfo,
} from '../../lib/authDb';
import {
  getPrimaryDevicePasskey,
  getWebAuthnSupportInfo,
  verifyBiometricPasskey,
  type EnrolledBiometricPasskey,
  type WebAuthnSupportInfo,
} from '../../lib/webAuthn';
import { PWAInstallButton } from '../PWAInstallButton';
import { BaanPakKruLogo } from '../common/BaanPakKruLogo';
import { THAI_PROVINCES } from '../../data/thaiProvinces';
import heroImage from '../../assets/images/hero_classroom_teacher_students_1793958712620.jpg';

interface AuthLayoutProps {
  onLogin: (context: AuthContext) => void;
  initialError?: string | null;
  isPasswordRecovery: boolean;
  onPasswordResetComplete: () => void;
  activeSchools?: School[];
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette?: ThemePalette;
  setThemePalette?: (palette: ThemePalette) => void;
}

function getAuthErrorMessage(message: string, lang: AppLanguage): string {
  if (/error sending confirmation email|could not resend confirmation email|confirmation email|rate limit/i.test(message)) {
    return lang === 'th'
      ? 'คำขอถูกส่งเข้าสู่ระบบแล้ว ผู้ดูแลระบบส่วนกลาง (Super Admin) จะตรวจสอบและเปิดใช้งานให้จากในระบบโดยตรง'
      : 'Your request has been received. A Super Admin will review and activate your account directly in the system.';
  }
  return message;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  onLogin,
  initialError,
  isPasswordRecovery,
  onPasswordResetComplete,
  activeSchools,
  lang,
  setLang,
  themePalette = 'light_warm',
  setThemePalette,
}) => {
  // Primary Auth State
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [loginMethod, setLoginMethod] = useState<'email' | 'portal'>('email');
  const [portalCodeInput, setPortalCodeInput] = useState('');
  const [isLookingUpSchool, setIsLookingUpSchool] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullNameTh, setFullNameTh] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [schoolNameTh, setSchoolNameTh] = useState('');
  const [schoolNameEn, setSchoolNameEn] = useState('');
  const [schoolType, setSchoolType] = useState<School['type']>('public');
  const [province, setProvince] = useState('');
  const [isCustomProvince, setIsCustomProvince] = useState(false);
  const [phone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
  const [mustChangePasswordContext, setMustChangePasswordContext] = useState<AuthContext | null>(null);
  const [temporaryPasswordUsed, setTemporaryPasswordUsed] = useState('');
  const [firstPasswordError, setFirstPasswordError] = useState<string | null>(null);
  const [isSettingFirstPassword, setIsSettingFirstPassword] = useState(false);

  // WebAuthn / FaceID / TouchID Quick Auth
  const [primaryPasskey, setPrimaryPasskey] = useState<EnrolledBiometricPasskey | null>(() =>
    getPrimaryDevicePasskey()
  );
  const [webAuthnSupport, setWebAuthnSupport] = useState<WebAuthnSupportInfo | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // Dedicated School Login Portal (from URL query OR explicit school code lookup)
  const [portalSchool, setPortalSchool] = useState<SchoolLoginPortalInfo | null>(null);
  const [isStudentPortalMode, setIsStudentPortalMode] = useState(false);

  useEffect(() => {
    setPrimaryPasskey(getPrimaryDevicePasskey());
    getWebAuthnSupportInfo().then(setWebAuthnSupport).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const applyResolvedPortalSchool = (info: SchoolLoginPortalInfo, studentMode: boolean) => {
    try {
      const rawLocal = localStorage.getItem(`eduverse_school_login_config_${info.id}`);
      if (rawLocal) {
        const localCfg = JSON.parse(rawLocal) as Partial<School>;
        setPortalSchool({
          ...info,
          studentLoginIdentifierType: localCfg.studentLoginIdentifierType || info.studentLoginIdentifierType,
          studentDefaultPasswordNote: localCfg.studentDefaultPasswordNote || info.studentDefaultPasswordNote,
        });
      } else {
        setPortalSchool(info);
      }
    } catch {
      setPortalSchool(info);
    }
    setIsStudentPortalMode(studentMode);
    setLoginMethod('portal');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const schoolIdParam = params.get('schoolId');
    const schoolCodeParam = params.get('schoolCode');
    const slugParam = params.get('school');
    const loginModeParam = params.get('loginMode');
    const studentMode = loginModeParam === 'student';

    if (!schoolIdParam && !schoolCodeParam && !slugParam) {
      setPortalSchool(null);
      return;
    }

    let active = true;
    fetchSchoolLoginPortalInfo({
      schoolId: schoolIdParam,
      schoolCode: schoolCodeParam,
      slug: slugParam,
    })
      .then((info) => {
        if (!active) return;
        if (info) {
          applyResolvedPortalSchool(info, studentMode);
          return;
        }
        if (activeSchools && activeSchools.length > 0) {
          const match = activeSchools.find(
            (s) =>
              (schoolIdParam && s.id === schoolIdParam) ||
              (schoolCodeParam && s.code.toLowerCase() === schoolCodeParam.toLowerCase()) ||
              (slugParam &&
                (s.slug.toLowerCase() === slugParam.toLowerCase() ||
                  s.customLoginSlug?.toLowerCase() === slugParam.toLowerCase()))
          );
          if (match) {
            applyResolvedPortalSchool(
              {
                id: match.id,
                code: match.code,
                nameTh: match.nameTh,
                nameEn: match.nameEn,
                slug: match.slug,
                logoUrl: match.logoUrl,
                primaryColor: match.primaryColor,
                studentLoginIdentifierType: match.studentLoginIdentifierType || 'both',
                customLoginSlug: match.customLoginSlug,
                studentDefaultPasswordType: match.studentDefaultPasswordType || 'birthdate',
                studentDefaultPasswordNote: match.studentDefaultPasswordNote,
              },
              studentMode
            );
          }
        }
      })
      .catch(() => {
        // Silent fallback if URL portal lookup fails
      });

    return () => {
      active = false;
    };
  }, [activeSchools]);

  const identifierMode = portalSchool?.studentLoginIdentifierType || 'both';
  const allowStudentIdInput =
    mode === 'login' &&
    Boolean(portalSchool) &&
    (loginMethod === 'portal' || isStudentPortalMode || identifierMode !== 'email_only');

  const handleClearPortalSchool = () => {
    setPortalSchool(null);
    setIsStudentPortalMode(false);
    setPortalCodeInput('');
    setLoginMethod('email');
    if (typeof window !== 'undefined') {
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
    }
  };

  const handleLookupSchoolCode = async () => {
    const code = portalCodeInput.trim();
    if (!code) {
      setError(lang === 'th' ? 'กรุณากรอกรหัสสถานศึกษา (เช่น BP-001)' : 'Please enter your school code (e.g. BP-001).');
      return;
    }
    setError(null);
    setNotice(null);
    setIsLookingUpSchool(true);
    try {
      let info = await fetchSchoolLoginPortalInfo({ schoolCode: code, slug: code });
      if (!info && activeSchools && activeSchools.length > 0) {
        const match = activeSchools.find(
          (s) =>
            s.code.toLowerCase() === code.toLowerCase() ||
            s.slug.toLowerCase() === code.toLowerCase() ||
            s.customLoginSlug?.toLowerCase() === code.toLowerCase()
        );
        if (match) {
          info = {
            id: match.id,
            code: match.code,
            nameTh: match.nameTh,
            nameEn: match.nameEn,
            slug: match.slug,
            logoUrl: match.logoUrl,
            primaryColor: match.primaryColor,
            studentLoginIdentifierType: match.studentLoginIdentifierType || 'both',
            customLoginSlug: match.customLoginSlug,
            studentDefaultPasswordType: match.studentDefaultPasswordType || 'birthdate',
            studentDefaultPasswordNote: match.studentDefaultPasswordNote,
          };
        }
      }
      if (!info) {
        setError(
          lang === 'th'
            ? `ไม่พบสถานศึกษาที่ใช้รหัส "${code}" โปรดตรวจสอบรหัสกับฝ่ายทะเบียนโรงเรียน`
            : `No active school matched code "${code}". Check the code with your school office.`
        );
        return;
      }
      applyResolvedPortalSchool(info, true);
      setNotice(
        lang === 'th'
          ? `เชื่อมต่อพอร์ทัล ${info.nameTh} แล้ว — กรอกรหัสนักเรียนหรืออีเมลเพื่อเข้าสู่ระบบ`
          : `Connected to ${info.nameEn || info.nameTh} — sign in with your Student ID or email.`
      );
      window.setTimeout(() => emailInputRef.current?.focus(), 80);
    } catch (lookupError: unknown) {
      setError(lookupError instanceof Error ? lookupError.message : String(lookupError));
    } finally {
      setIsLookingUpSchool(false);
    }
  };

  const handleNextRegisterStep = () => {
    setError(null);
    if (!schoolNameTh.trim() || !province.trim()) {
      setError(
        lang === 'th'
          ? isCustomProvince
            ? 'กรุณากรอกชื่อโรงเรียน (ภาษาไทย) และระบุประเทศหรือเมืองที่ตั้งก่อนดำเนินการต่อ'
            : 'กรุณากรอกชื่อโรงเรียน (ภาษาไทย) และเลือกจังหวัดที่ตั้งก่อนดำเนินการต่อ'
          : isCustomProvince
            ? 'Please enter the Thai school name and specify the country or city before continuing.'
            : 'Please enter the Thai school name and select a province before continuing.'
      );
      return;
    }
    setRegisterStep(2);
  };

  const continueWithAuthenticatedContext = (context: AuthContext) => {
    if (context.user.mustChangePassword) {
      setMustChangePasswordContext(context);
      setTemporaryPasswordUsed(password);
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFirstPasswordError(null);
      return;
    }
    onLogin(context);
  };

  const handleSetFirstStudentPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setFirstPasswordError(null);
    if (newPassword.length < 8) {
      setFirstPasswordError(lang === 'th' ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' : 'Use at least 8 characters.');
      return;
    }
    if (newPassword === temporaryPasswordUsed) {
      setFirstPasswordError(lang === 'th' ? 'กรุณาตั้งรหัสผ่านใหม่ที่ไม่ซ้ำกับรหัสชั่วคราว' : 'Choose a password different from the temporary password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFirstPasswordError(lang === 'th' ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'The passwords do not match.');
      return;
    }

    setIsSettingFirstPassword(true);
    try {
      const context = await completeFirstStudentPasswordChange(newPassword);
      setMustChangePasswordContext(null);
      setTemporaryPasswordUsed('');
      setNewPassword('');
      setConfirmNewPassword('');
      onLogin(context);
    } catch (requestError) {
      setFirstPasswordError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsSettingFirstPassword(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && registerStep === 1) {
      handleNextRegisterStep();
      return;
    }

    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim()) {
          throw new Error(
            allowStudentIdInput
              ? lang === 'th'
                ? 'กรุณากรอกรหัสนักเรียนหรืออีเมล'
                : 'Please enter your Student ID or email'
              : lang === 'th'
                ? 'กรุณากรอกอีเมล'
                : 'Please enter your email'
          );
        }
        continueWithAuthenticatedContext(await authenticateWithSupabase(email, password, portalSchool?.id));
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
      setRegisterStep(1);
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      if (/confirmation email|rate limit/i.test(message)) {
        setNotice(
          lang === 'th'
            ? 'ลงทะเบียนเรียบร้อยแล้ว! ข้อมูลส่งเข้าสู่ระบบแล้ว ผู้ดูแลระบบส่วนกลาง (Super Admin) จะตรวจสอบและอนุมัติเปิดใช้งานจากในระบบโดยตรง'
            : 'Registration received! A Super Admin will approve and activate your account directly in the system.'
        );
        setError(null);
        setMode('login');
        setRegisterStep(1);
        return;
      }
      setError(
        mode === 'login' && message.toLowerCase().includes('invalid login credentials')
          ? lang === 'th'
            ? 'อีเมล/รหัสประจำตัวหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีอยู่ระหว่างรอผู้ดูแลโรงเรียนอนุมัติ'
            : 'Invalid credentials, or your account is awaiting school administrator approval.'
          : getAuthErrorMessage(message, lang)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    if (!primaryPasskey) return;
    setError(null);
    setNotice(null);
    setIsBiometricLoading(true);
    try {
      const { passkey } = await verifyBiometricPasskey({ credentialId: primaryPasskey.credentialId });
      setPrimaryPasskey(passkey);
      const restored = await restoreSupabaseSession().catch(() => null);
      if (restored) {
        continueWithAuthenticatedContext(restored);
        return;
      }
      setEmail(passkey.email);
      setNotice(
        lang === 'th'
          ? `ยืนยัน ${passkey.deviceLabel} สำหรับ ${passkey.fullNameTh} สำเร็จ — กรอกรหัสผ่านเพื่อออกเซสชันใหม่`
          : `Verified ${passkey.deviceLabel} for ${passkey.fullNameEn || passkey.email}. Enter your password to issue a fresh session.`
      );
      window.setTimeout(() => passwordInputRef.current?.focus(), 100);
    } catch (bioErr) {
      setError(bioErr instanceof Error ? bioErr.message : String(bioErr));
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError(
        lang === 'th'
          ? 'กรุณากรอกอีเมลบัญชีก่อนส่งคำขออนุมัติเปิดใช้งาน'
          : 'Please enter a valid account email first.'
      );
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await resendSignupConfirmation(email);
      setNotice(
        lang === 'th'
          ? 'ส่งคำขออนุมัติเปิดใช้งานไปยังผู้ดูแลระบบส่วนกลางเรียบร้อยแล้ว'
          : 'Activation request submitted to the system administrator.'
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
          ? `ระบบรับคำขอแล้ว หากมีบัญชีที่ใช้อีเมล ${target} ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลนั้น โปรดตรวจสอบกล่อง Spam/Junk ด้วย`
          : `Request received. If an account uses ${target}, a password reset link will be sent to that address. Check Spam/Junk as well.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResetError(null);
    if (newPassword !== confirmNewPassword) {
      setPasswordResetError(lang === 'th' ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'The passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      setPasswordResetComplete(true);
      try {
        await signOutFromSupabase();
      } catch (signOutError: unknown) {
        const detail = signOutError instanceof Error ? ` (${signOutError.message})` : '';
        setPasswordResetError(
          lang === 'th'
            ? `เปลี่ยนรหัสผ่านแล้ว แต่ระบบออกจาก session รีเซ็ตไม่สำเร็จ กรุณากลับเข้าสู่ระบบด้วยรหัสผ่านใหม่${detail}`
            : `Your password was changed, but the recovery session could not be cleared. Please sign in with your new password.${detail}`
        );
      }
    } catch (requestError: unknown) {
      setPasswordResetError(
        requestError instanceof Error ? requestError.message : String(requestError)
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isLight = !themePalette.includes('dark') && themePalette !== 'sapphire';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-text-body)] transition-colors duration-200">
      {/* Unified Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#portal-auth" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[var(--color-text-title)] whitespace-nowrap shrink-0">
            <BaanPakKruLogo size={32} />
            <span>BaanPakKru</span>
            <span className="hidden xs:inline text-xs font-semibold text-[var(--color-text-muted)]">· บ้านพักครู</span>
          </a>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton lang={lang} variant="nav" className="h-9" />

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
              aria-label={lang === 'th' ? 'สลับโหมดสีถนอมสายตา' : 'Toggle theme'}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {mustChangePasswordContext && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-first-password-title"
        >
          <form
            onSubmit={handleSetFirstStudentPassword}
            className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 id="student-first-password-title" className="font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ตั้งรหัสผ่านส่วนตัวก่อนใช้งาน' : 'Set a personal password to continue'}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'ต้องเปลี่ยนรหัสผ่านชั่วคราวก่อนเข้าระบบ' : 'Change your temporary password before continuing.'}
                </p>
              </div>
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              {lang === 'th'
                ? 'ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร และอย่าใช้รหัสนักเรียนเป็นรหัสผ่าน รหัสชั่วคราวหมดอายุภายใน 24 ชั่วโมง'
                : 'Use at least 8 characters. Do not use your student ID as your password. This temporary password expires in 24 hours.'}
            </p>

            {firstPasswordError && (
              <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                {firstPasswordError}
              </p>
            )}

            <label className="block space-y-1 text-xs font-semibold text-[var(--color-text-body)]">
              <span>{lang === 'th' ? 'รหัสผ่านใหม่' : 'New password'}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-[var(--color-text-body)]">
              <span>{lang === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm new password'}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-sm text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            <button
              type="submit"
              disabled={isSettingFirstPassword}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isSettingFirstPassword
                ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                : (lang === 'th' ? 'บันทึกรหัสผ่านและเข้าสู่ระบบ' : 'Save password and continue')}
            </button>
          </form>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {/* ===================================================================== */}
        {/* ABOVE THE FOLD: ARCHITECTURAL EDITORIAL SPLIT HERO + AUTH WORKSPACE  */}
        {/* ===================================================================== */}
        <section
          id="portal-auth"
          className="editorial-grid-surface flex-1"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            {/* Compact Mobile Headline (Visible before form on mobile, integrated on lg+) */}
            <div className="mb-6 lg:hidden space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-text)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'th' ? 'แพลตฟอร์มบริหารสถานศึกษา · PDPA-First' : 'School Operations Platform · PDPA-First'}</span>
              </p>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--color-text-title)] text-balance">
                {lang === 'th' ? 'งานโรงเรียนครบในระบบเดียว ลดภาระงานเอกสารให้คุณครู' : 'Everyday school operations, unified in one calm workspace'}
              </h1>
              <p className="text-xs leading-relaxed text-[var(--color-text-body)]">
                {lang === 'th'
                  ? 'เชื่อมงานวิชาการ การเช็คชื่อ และข้อมูลผู้เรียนแบบแยกสิทธิ์รายโรงเรียน'
                  : 'Connect academics, attendance, and student care with strict school-level isolation.'}
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
              {/* LEFT COLUMN: Editorial Narrative + Clean Campus Frame + 3-Pillar Strip */}
              <div className="order-2 lg:order-1 space-y-6">
                <div className="hidden lg:block space-y-3.5">
                  <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[var(--color-primary-text)]">
                    <span className="h-2 w-2 rounded-sm bg-[var(--color-primary)]" aria-hidden="true" />
                    <span>{lang === 'th' ? 'แพลตฟอร์มบริหารสถานศึกษา · แยกข้อมูลรายโรงเรียน (PDPA)' : 'School Operations Platform · School-Level PDPA Isolation'}</span>
                  </div>
                  <h1 className="max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight text-[var(--color-text-title)] text-balance xl:text-[2.65rem]">
                    {lang === 'th'
                      ? 'งานโรงเรียนครบในระบบเดียว ลดภาระงานเอกสารให้คุณครู'
                      : 'Everyday school work, unified in one calm workspace'}
                  </h1>
                  <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-text-body)]">
                    {lang === 'th'
                      ? 'เชื่อมงานวิชาการ ปพ.5 การเช็คชื่อ QR & GPS และการดูแลผู้เรียน สำหรับผู้บริหาร คุณครู นักเรียน และผู้ปกครอง ในภาษาภาพชุดเดียวกันตั้งแต่หน้าแรกถึงแดชบอร์ด'
                      : 'Unify grading, QR & GPS attendance, and student care for school leaders, teachers, students, and families with one cohesive visual system.'}
                  </p>
                </div>

                {/* Clean Framed Photography + Understated Caption */}
                <div className="saas-card overflow-hidden">
                  <img
                    src={heroImage}
                    alt={lang === 'th' ? 'ห้องเรียนและการจัดการเรียนการสอนของ BaanPakKru (บ้านพักครู)' : 'Classroom learning with BaanPakKru'}
                    className="aspect-[16/9] w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                    <span className="font-semibold text-[var(--color-text-body)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {portalSchool
                        ? lang === 'th'
                          ? `กำลังเชื่อมต่อพอร์ทัลเฉพาะกิจ: ${portalSchool.nameTh}`
                          : `Connected portal: ${portalSchool.nameEn || portalSchool.nameTh}`
                        : lang === 'th'
                          ? 'ซ่อนรายชื่อโรงเรียนสาธารณะเพื่อคุ้มครองข้อมูลส่วนบุคคล'
                          : 'Public school directory hidden for student & staff privacy'}
                    </span>
                    <span className="font-mono">
                      {lang === 'th' ? 'รองรับ 4 บทบาท' : '4 Role Workspaces'}
                    </span>
                  </div>
                </div>

                {/* Shared Architectural 3-Pillar Strip (Matches Dashboard saas-kpi-strip) */}
                <div className="saas-kpi-strip">
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
                    <div className="p-4 space-y-1">
                      <div className="text-[11px] font-bold text-[var(--tone-1)] flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'th' ? 'งานวิชาการ & ปพ.5' : 'Academics & Grades'}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] leading-snug">
                        {lang === 'th' ? 'ตารางสอนไร้คาบชน คลังข้อสอบ และตัดเกรดอัตโนมัติ' : 'Conflict-free schedules, exam banks, and automated GPA.'}
                      </p>
                    </div>
                    <div className="p-4 space-y-1">
                      <div className="text-[11px] font-bold text-[var(--tone-2)] flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'th' ? 'เช็คชื่อ QR & GPS' : 'QR & GPS Attendance'}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] leading-snug">
                        {lang === 'th' ? 'สแกนประตูและรายคาบพร้อมพิกัดและหลักฐานยืนยันตัวตน' : 'Fast gate and per-period scans with geofence verification.'}
                      </p>
                    </div>
                    <div className="p-4 space-y-1">
                      <div className="text-[11px] font-bold text-[var(--tone-5)] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'th' ? 'ดูแลผู้เรียน & ครอบครัว' : 'Student Care & Family'}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] leading-snug">
                        {lang === 'th' ? 'คัดกรอง SDQ ห้องพยาบาล และข้อมูลบุตรหลานแบบส่วนตัว' : 'SDQ screening, infirmary logs, and private family portal.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Calm Auth Card */}
              <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
                <div className="saas-card overflow-hidden shadow-md shadow-slate-900/5">
                  <div className="p-5 sm:p-6 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] space-y-4">
                    {/* Connected School Portal Banner */}
                    {portalSchool && mode === 'login' && (
                      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/60 p-3 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {portalSchool.logoUrl ? (
                            <img
                              src={portalSchool.logoUrl}
                              alt={portalSchool.nameTh}
                              className="h-9 w-9 rounded-lg object-cover border border-blue-200 dark:border-blue-700 shrink-0 bg-white"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shrink-0">
                              <SchoolIcon className="h-4.5 w-4.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-blue-950 dark:text-blue-100 truncate">
                              {lang === 'th' ? portalSchool.nameTh : portalSchool.nameEn || portalSchool.nameTh}
                            </p>
                            <p className="text-[11px] text-blue-800 dark:text-blue-300 font-mono truncate">
                              {lang === 'th' ? 'รหัสโรงเรียน' : 'School Code'}: {portalSchool.customLoginSlug || portalSchool.code}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearPortalSchool}
                          className="rounded-lg p-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer shrink-0"
                          title={lang === 'th' ? 'ออกจากพอร์ทัลโรงเรียนนี้' : 'Disconnect school portal'}
                          aria-label={lang === 'th' ? 'เปลี่ยนสถานศึกษา' : 'Switch school'}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {mode === 'login' ? (
                        <BaanPakKruLogo size={40} />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-[var(--color-text-title)] leading-tight truncate">
                          {mode === 'login'
                            ? isStudentPortalMode && portalSchool
                              ? lang === 'th'
                                ? 'เข้าสู่ระบบนักเรียน'
                                : 'Student Sign In'
                              : lang === 'th'
                                ? 'เข้าสู่ระบบบ้านพักครู'
                                : 'Sign in to BaanPakKru'
                            : lang === 'th'
                              ? 'ลงทะเบียนสถานศึกษาใหม่'
                              : 'Register New School'}
                        </h2>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                          {mode === 'login'
                            ? allowStudentIdInput
                              ? identifierMode === 'student_id_only'
                                ? lang === 'th'
                                  ? 'กรอกรหัสนักเรียนและรหัสผ่านของคุณ'
                                  : 'Enter your Student ID and password'
                                : lang === 'th'
                                  ? 'กรอกรหัสนักเรียน หรืออีเมลบัญชี'
                                  : 'Enter Student ID or account email'
                              : lang === 'th'
                                ? 'เข้าใช้งานด้วยอีเมลบัญชี หรือเชื่อมรหัสโรงเรียน'
                                : 'Sign in with email or your school code'
                            : lang === 'th'
                              ? `ขั้นตอนที่ ${registerStep} จาก 2 · ${registerStep === 1 ? 'ข้อมูลโรงเรียน' : 'บัญชีผู้ดูแลระบบ'}`
                              : `Step ${registerStep} of 2 · ${registerStep === 1 ? 'School info' : 'Administrator account'}`}
                        </p>
                      </div>
                    </div>

                    {/* Top Mode Switcher */}
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
                          setRegisterStep(1);
                          setError(null);
                          setNotice(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                          mode === 'register'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        {lang === 'th' ? 'ลงทะเบียนโรงเรียน' : 'Register School'}
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
                      <div role="status" className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{notice}</span>
                      </div>
                    )}

                    {/* Login Sign-In Method Toggle: Email vs School Code / Student ID */}
                    {mode === 'login' && (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMethod('email');
                            setError(null);
                          }}
                          className={`flex-1 rounded-lg px-2.5 py-1.5 font-bold transition cursor-pointer ${
                            loginMethod === 'email'
                              ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs border border-[var(--color-border)]'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                          }`}
                        >
                          {lang === 'th' ? 'อีเมลบัญชี' : 'Account Email'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMethod('portal');
                            setError(null);
                          }}
                          className={`flex-1 rounded-lg px-2.5 py-1.5 font-bold transition cursor-pointer ${
                            loginMethod === 'portal'
                              ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs border border-[var(--color-border)]'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                          }`}
                        >
                          {lang === 'th' ? 'รหัสโรงเรียน / นักเรียน' : 'School Code / Student ID'}
                        </button>
                      </div>
                    )}

                    {/* School Code Lookup Bar (Privacy-safe: fetches only exact code on demand) */}
                    {mode === 'login' && loginMethod === 'portal' && !portalSchool && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2">
                        <label className="block text-[11px] font-bold text-[var(--color-text-title)]">
                          {lang === 'th' ? 'กรอกรหัสสถานศึกษาเพื่อเข้าสู่ระบบด้วยรหัสนักเรียน' : 'Enter your School Code to unlock Student ID sign-in'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={portalCodeInput}
                            onChange={(e) => setPortalCodeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleLookupSchoolCode();
                              }
                            }}
                            placeholder={lang === 'th' ? 'เช่น BP-001' : 'e.g. BP-001'}
                            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                          />
                          <button
                            type="button"
                            disabled={isLookingUpSchool}
                            onClick={handleLookupSchoolCode}
                            className="shrink-0 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-3 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
                          >
                            {isLookingUpSchool
                              ? (lang === 'th' ? 'ค้นหา...' : 'Checking...')
                              : (lang === 'th' ? 'เชื่อมต่อ' : 'Connect')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* WebAuthn Passkey Quick Sign-In */}
                    {mode === 'login' && primaryPasskey && (
                      <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 space-y-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Fingerprint className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                              {primaryPasskey.fullNameTh || primaryPasskey.email}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                              {primaryPasskey.deviceLabel} · {primaryPasskey.role}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isBiometricLoading || webAuthnSupport?.supported === false}
                          onClick={handleBiometricSignIn}
                          className="w-full min-h-[42px] rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                        >
                          <Fingerprint className="w-4 h-4" />
                          <span>
                            {isBiometricLoading
                              ? (lang === 'th' ? 'กำลังสแกน FaceID / TouchID...' : 'Verifying Biometrics...')
                              : (lang === 'th' ? 'ยืนยันตัวตนด้วย FaceID / TouchID' : 'Continue with FaceID / TouchID')}
                          </span>
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      {mode === 'register' && registerStep === 1 && (
                        <>
                          <label className="block text-xs font-bold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาไทย)' : 'School Name (Thai)'}
                            <input
                              required
                              maxLength={150}
                              value={schoolNameTh}
                              onChange={(e) => setSchoolNameTh(e.target.value)}
                              placeholder={lang === 'th' ? 'เช่น โรงเรียนสาธิตวิทยาคม' : 'Thai school name'}
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
                              {lang === 'th' ? 'จังหวัด / พื้นที่ตั้ง' : 'Province / Location'}
                              <select
                                required
                                value={isCustomProvince ? '__OTHER__' : province}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__OTHER__') {
                                    setIsCustomProvince(true);
                                    setProvince('');
                                  } else {
                                    setIsCustomProvince(false);
                                    setProvince(val);
                                  }
                                }}
                                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                              >
                                <option value="">{lang === 'th' ? '-- เลือกจังหวัด --' : '-- Select Location --'}</option>
                                {(lang === 'en'
                                  ? [...THAI_PROVINCES].sort((a, b) => a.en.localeCompare(b.en))
                                  : THAI_PROVINCES
                                ).map((prov) => (
                                  <option key={prov.th} value={prov.th}>
                                    {lang === 'th' ? prov.th : prov.en}
                                  </option>
                                ))}
                                <option value="__OTHER__">
                                  {lang === 'th' ? 'ต่างประเทศ / อื่นๆ (ระบุเอง)' : 'International / Other (Specify)'}
                                </option>
                              </select>
                            </label>
                          </div>

                          {isCustomProvince && (
                            <label className="block text-xs font-bold text-[var(--color-text-title)]">
                              {lang === 'th' ? 'ระบุประเทศ / เมือง / รัฐที่ตั้งสถานศึกษา' : 'Country / City / State'}
                              <input
                                required
                                maxLength={100}
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                placeholder={lang === 'th' ? 'เช่น สิงคโปร์, โตเกียว (ญี่ปุ่น), London (UK)' : 'e.g. Singapore, Tokyo (Japan), London (UK)'}
                                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                              />
                            </label>
                          )}

                          <button
                            type="button"
                            onClick={handleNextRegisterStep}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] py-3 text-sm font-bold text-white shadow-sm transition cursor-pointer mt-1"
                          >
                            <span>{lang === 'th' ? 'ถัดไป: ตั้งค่าบัญชีผู้ดูแล' : 'Next: Administrator Account'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {mode === 'register' && registerStep === 2 && (
                        <>
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-[var(--color-text-title)] truncate">{schoolNameTh}</span>
                            <button
                              type="button"
                              onClick={() => setRegisterStep(1)}
                              className="inline-flex items-center gap-1 font-bold text-[var(--color-primary-text)] hover:underline shrink-0 cursor-pointer"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              <span>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                            </button>
                          </div>

                          <label className="block text-xs font-bold text-[var(--color-text-title)]">
                            {lang === 'th' ? 'ชื่อผู้ดูแลสถานศึกษา (Admin)' : 'Administrator Name'}
                            <input
                              required
                              value={fullNameTh}
                              onChange={(e) => {
                                setFullNameTh(e.target.value);
                                if (!fullNameEn) setFullNameEn('');
                              }}
                              placeholder={lang === 'th' ? 'ชื่อ-นามสกุล ผู้ดูแลระบบ' : 'Full name'}
                              className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                            />
                          </label>
                        </>
                      )}

                      {(mode === 'login' || registerStep === 2) && (
                        <>
                          <label className="block text-xs font-bold text-[var(--color-text-title)]">
                            <span className="flex items-center gap-1.5 mb-1">
                              {allowStudentIdInput ? (
                                <GraduationCap className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                              ) : (
                                <Mail className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                              )}
                              {allowStudentIdInput
                                ? identifierMode === 'student_id_only'
                                  ? lang === 'th'
                                    ? 'รหัสนักเรียน'
                                    : 'Student ID'
                                  : lang === 'th'
                                    ? 'รหัสนักเรียน หรือ อีเมล'
                                    : 'Student ID or Email'
                                : lang === 'th'
                                  ? 'อีเมลบัญชีผู้ใช้'
                                  : 'Email Address'}
                            </span>
                            <input
                              ref={emailInputRef}
                              type={allowStudentIdInput ? 'text' : 'email'}
                              autoComplete={allowStudentIdInput ? 'username' : 'email'}
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder={
                                allowStudentIdInput
                                  ? identifierMode === 'student_id_only'
                                    ? lang === 'th'
                                      ? 'เช่น ED-6901 หรือ 10001'
                                      : 'e.g. ED-6901'
                                    : lang === 'th'
                                      ? 'รหัสนักเรียน (เช่น ED-6901) หรือ อีเมล'
                                      : 'Student ID or email@school.ac.th'
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
                            <div className="relative">
                              <input
                                ref={passwordInputRef}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                minLength={mode === 'register' ? 8 : undefined}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] pl-3 pr-10 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                                aria-label={showPassword ? (lang === 'th' ? 'ซ่อนรหัสผ่าน' : 'Hide password') : (lang === 'th' ? 'แสดงรหัสผ่าน' : 'Show password')}
                              >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </label>

                          {mode === 'login' && portalSchool?.studentDefaultPasswordNote && (
                            <div className="flex items-start gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                              <span>{portalSchool.studentDefaultPasswordNote}</span>
                            </div>
                          )}

                          {mode === 'login' && (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setResetEmail(email.includes('@') ? email : '');
                                  setResetStatus(null);
                                  setShowForgotPasswordModal(true);
                                }}
                                className="text-[var(--color-primary-text)] hover:underline font-semibold transition cursor-pointer"
                              >
                                {lang === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot Password?'}
                              </button>
                              <button
                                type="button"
                                onClick={handleResendConfirmation}
                                disabled={isLoading || !email.trim()}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:underline font-medium transition cursor-pointer disabled:opacity-50"
                              >
                                {lang === 'th' ? 'ขออนุมัติเปิดใช้งานบัญชี' : 'Request account activation'}
                              </button>
                            </div>
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
                        </>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal: Forgot / Reset Password (Privacy-Safe, No Personal Admin Email Leak) */}
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
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{lang === 'th' ? 'วิธีรีเซ็ตรหัสผ่าน' : 'How password reset works'}</span>
              </div>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 pl-5 leading-relaxed">
                {lang === 'th'
                  ? 'ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลบัญชีของคุณโดยตรง หากเป็นบัญชีรหัสนักเรียนที่ไม่ผูกอีเมล กรุณาติดต่อฝ่ายทะเบียนหรือครูประจำชั้นเพื่อออกรหัสผ่านชั่วคราว'
                  : 'A password reset link will be emailed directly to your registered account. For Student ID accounts without email, please contact your school office.'}
              </p>
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
                  placeholder="user@school.ac.th"
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
                      <span>{lang === 'th' ? 'ส่งลิงก์รีเซ็ต' : 'Send Reset Link'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordRecovery && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ตั้งรหัสผ่านใหม่' : 'Set a new password'}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'กรอกรหัสผ่านใหม่สำหรับบัญชีของคุณ' : 'Choose a new password for your account.'}
                </p>
              </div>
            </div>

            {passwordResetComplete ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {lang === 'th' ? 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' : 'Your password has been changed.'}
                </div>
                {passwordResetError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                    {passwordResetError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onPasswordResetComplete}
                  className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]"
                >
                  {lang === 'th' ? 'กลับเข้าสู่ระบบ' : 'Return to sign in'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                {passwordResetError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                    {passwordResetError}
                  </div>
                )}
                <label className="block text-xs font-semibold text-[var(--color-text-body)]">
                  {lang === 'th' ? 'รหัสผ่านใหม่' : 'New password'}
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-sm text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                  />
                </label>
                <label className="block text-xs font-semibold text-[var(--color-text-body)]">
                  {lang === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm new password'}
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-sm text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-600/20"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {isUpdatingPassword
                    ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : (lang === 'th' ? 'บันทึกรหัสผ่านใหม่' : 'Save new password')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
