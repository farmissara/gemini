import React, { useState } from 'react';
import { School, AuthUser, UserRole, AppLanguage, ThemePalette } from '../types';
import { 
  GraduationCap, 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Globe,
  MapPin,
  HelpCircle,
  PlusCircle,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  Palette,
  Sun,
  Moon
} from 'lucide-react';

interface AuthLayoutProps {
  schools: School[];
  demoUsers: AuthUser[];
  onLogin: (user: AuthUser, school: School) => void;
  onRegisterSchool: (newSchool: School, adminUser: AuthUser) => void;
  onRegisterUser: (newUser: AuthUser) => void;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette?: ThemePalette;
  setThemePalette?: (palette: ThemePalette) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  schools,
  demoUsers,
  onLogin,
  onRegisterSchool,
  onRegisterUser,
  lang,
  setLang,
  themePalette = 'light_sky',
  setThemePalette,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register_user' | 'register_school'>('login');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || '');
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminInputKey, setSuperAdminInputKey] = useState('');
  const [superAdminKeyError, setSuperAdminKeyError] = useState<string | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // User register state
  const [userRegForm, setUserRegForm] = useState({
    schoolId: schools[0]?.id || '',
    fullNameTh: '',
    fullNameEn: '',
    role: 'student' as UserRole,
    email: '',
    password: '',
    phone: '',
    lineConnected: true,
  });

  // School register state
  const [schoolRegForm, setSchoolRegForm] = useState({
    code: `SCH-THA${Math.floor(10 + Math.random() * 89)}`,
    nameTh: '',
    nameEn: '',
    slug: '',
    type: 'private' as School['type'],
    province: 'กรุงเทพมหานคร',
    address: '',
    phone: '02-',
    email: '',
    adminName: '',
    adminPassword: '',
  });

  const [registerSuccessToast, setRegisterSuccessToast] = useState<string | null>(null);

  // Handle standard login
  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();
    const targetSchool = schools.find((s) => s.id === selectedSchoolId) || schools[0];

    // Dedicated Super Admin authentication
    if (cleanEmail === 'superadmin@eduverse.school' || cleanEmail === 'superadmin') {
      if (
        cleanPassword === 'SuperAdmin@Edu2026!' ||
        cleanPassword === 'superadmin123' ||
        cleanPassword === 'admin'
      ) {
        const superUser = demoUsers.find((u) => u.role === 'super_admin') || {
          id: 'usr-super',
          email: 'superadmin@eduverse.school',
          fullNameTh: 'ดร.กิตติพงษ์ ศรีสุวรรณ (Super Admin)',
          fullNameEn: 'Dr. Kittipong Srisuwan (Super Admin)',
          role: 'super_admin',
          schoolId: targetSchool.id,
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
          lineConnected: true,
          phone: '081-999-8888',
        };
        onLogin(superUser, targetSchool);
        return;
      } else {
        setLoginError(
          lang === 'th'
            ? 'รหัสผ่าน Super Admin ไม่ถูกต้อง (รหัสผ่านคือ: SuperAdmin@Edu2026!)'
            : 'Invalid Super Admin password (Password is: SuperAdmin@Edu2026!)'
        );
        return;
      }
    }

    const existingUser = demoUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      onLogin(existingUser, targetSchool);
    } else if (cleanEmail && cleanPassword) {
      // Allow realistic custom login
      const customUser: AuthUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        fullNameTh: cleanEmail.split('@')[0],
        fullNameEn: cleanEmail.split('@')[0],
        role: 'admin',
        schoolId: targetSchool.id,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        lineConnected: true,
        phone: '081-000-0000',
      };
      onLogin(customUser, targetSchool);
    } else {
      setLoginError(
        lang === 'th'
          ? 'กรุณากรอกอีเมลและรหัสผ่าน หรือเลือกเข้าสู่ระบบด่วนผ่านบัญชีทดสอบด้านล่าง'
          : 'Please enter email and password or use the Quick Demo Logins below.'
      );
    }
  };

  // Super Admin direct gateway login handler
  const handleSuperAdminGatewayLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminKeyError(null);
    if (
      superAdminInputKey.trim() === 'SuperAdmin@Edu2026!' ||
      superAdminInputKey.trim() === 'superadmin123' ||
      superAdminInputKey.trim() === 'admin'
    ) {
      const superUser = demoUsers.find((u) => u.role === 'super_admin') || demoUsers[0];
      setShowSuperAdminModal(false);
      onLogin(superUser, schools[0]);
    } else {
      setSuperAdminKeyError(
        lang === 'th'
          ? 'รหัสผ่านแม่ข่ายไม่ถูกต้อง (กรุณาใช้: SuperAdmin@Edu2026!)'
          : 'Invalid master key (Please use: SuperAdmin@Edu2026!)'
      );
    }
  };

  // Quick Demo Login
  const handleQuickDemo = (userRole: UserRole) => {
    const user = demoUsers.find((u) => u.role === userRole) || demoUsers[0];
    const targetSchool = schools.find((s) => s.id === user.schoolId) || schools[0];
    onLogin(user, targetSchool);
  };

  // LINE Login Simulation
  const handleLineLogin = () => {
    const studentUser = demoUsers.find((u) => u.role === 'student') || demoUsers[0];
    const targetSchool = schools.find((s) => s.id === studentUser.schoolId) || schools[0];
    onLogin({ ...studentUser, lineConnected: true }, targetSchool);
  };

  // Register New School
  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolRegForm.nameTh || !schoolRegForm.adminName || !schoolRegForm.email) return;

    const newSchoolId = `sch-${Date.now()}`;
    const newSchool: School = {
      id: newSchoolId,
      code: schoolRegForm.code,
      nameTh: schoolRegForm.nameTh,
      nameEn: schoolRegForm.nameEn || schoolRegForm.nameTh,
      slug: schoolRegForm.slug || schoolRegForm.code.toLowerCase(),
      type: schoolRegForm.type,
      province: schoolRegForm.province,
      address: schoolRegForm.address || 'Thailand',
      phone: schoolRegForm.phone,
      email: schoolRegForm.email,
      primaryColor: '#4f46e5',
      studentsCount: 1,
      teachersCount: 1,
      academicYear: '2026',
      currentSemester: 'Semester 1',
      lineOaId: `@${schoolRegForm.code.toLowerCase()}_school`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    const adminUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email: schoolRegForm.email,
      fullNameTh: schoolRegForm.adminName,
      fullNameEn: schoolRegForm.adminName,
      role: 'admin',
      schoolId: newSchoolId,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      lineConnected: true,
      phone: schoolRegForm.phone,
    };

    onRegisterSchool(newSchool, adminUser);
  };

  // Register User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRegForm.fullNameTh || !userRegForm.email) return;

    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email: userRegForm.email,
      fullNameTh: userRegForm.fullNameTh,
      fullNameEn: userRegForm.fullNameEn || userRegForm.fullNameTh,
      role: userRegForm.role,
      schoolId: userRegForm.schoolId,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      lineConnected: userRegForm.lineConnected,
      phone: userRegForm.phone,
    };

    onRegisterUser(newUser);
  };

  return (
    <div className={`min-h-screen ${
      themePalette.startsWith('light') || themePalette === 'light'
        ? themePalette === 'light_warm'
          ? 'bg-[#fbf9f4] text-stone-900'
          : themePalette === 'light_mint'
          ? 'bg-[#f0f7f4] text-emerald-950'
          : themePalette === 'light_lavender'
          ? 'bg-[#f7f5fc] text-slate-900'
          : 'bg-[#f1f5fa] text-slate-900'
        : 'bg-slate-950 text-slate-100'
    } flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-300`}>
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between bg-slate-900/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              EduVerse
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                School SIS &amp; LMS
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Eye-Care Bright Palette Selector */}
          {setThemePalette && (
            <div className="flex items-center bg-slate-900/70 p-1 rounded-xl border border-slate-800 gap-1" title={lang === 'th' ? 'เลือกโทนสีสว่างสบายตา (Eye-Care Themes)' : 'Eye-Care Light Themes'}>
              <Sun className="w-3.5 h-3.5 text-amber-400 ml-1 hidden sm:inline" />
              <button
                type="button"
                onClick={() => setThemePalette('light_sky')}
                className={`w-4 h-4 rounded-full bg-sky-400 transition-all ${themePalette === 'light_sky' || themePalette === 'light' ? 'ring-2 ring-sky-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
                title={lang === 'th' ? '☀️ ฟ้าละมุน สบายตา (Soft Sky)' : 'Eye-Care Soft Sky'}
              />
              <button
                type="button"
                onClick={() => setThemePalette('light_warm')}
                className={`w-4 h-4 rounded-full bg-amber-600 transition-all ${themePalette === 'light_warm' ? 'ring-2 ring-amber-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
                title={lang === 'th' ? '📜 กระดาษอุ่น ถนอมสายตา (Warm Paper)' : 'Eye-Care Warm Paper'}
              />
              <button
                type="button"
                onClick={() => setThemePalette('light_mint')}
                className={`w-4 h-4 rounded-full bg-emerald-500 transition-all ${themePalette === 'light_mint' ? 'ring-2 ring-emerald-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
                title={lang === 'th' ? '🌿 มินต์ธรรมชาติ พักสายตา (Gentle Mint)' : 'Eye-Care Gentle Mint'}
              />
              <button
                type="button"
                onClick={() => setThemePalette('light_pure')}
                className={`w-4 h-4 rounded-full bg-white border border-slate-300 transition-all ${themePalette === 'light_pure' ? 'ring-2 ring-indigo-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
                title={lang === 'th' ? '⚪ ขาวสว่าง คลีนมินิมอล (Clean Pure White)' : 'Clean Pure White'}
              />
              <button
                type="button"
                onClick={() => setThemePalette('light_lavender')}
                className={`w-4 h-4 rounded-full bg-purple-400 transition-all ${themePalette === 'light_lavender' ? 'ring-2 ring-purple-500 scale-125' : 'opacity-60 hover:opacity-100'}`}
                title={lang === 'th' ? '💜 ลาเวนเดอร์นุ่มนวล (Soft Lavender)' : 'Soft Lavender Care'}
              />
              <div className="w-px h-3 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setThemePalette('sapphire')}
                className={`w-4 h-4 rounded-full bg-slate-800 border border-slate-600 transition-all ${themePalette === 'sapphire' ? 'ring-2 ring-sky-400 scale-125' : 'opacity-60 hover:opacity-100'}`}
                title={lang === 'th' ? '🌙 ค่ำคืนครามเข้ม (Sapphire Dark)' : 'Sapphire Dark Theme'}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Intro Banner */}
          <div className="lg:col-span-5 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart School Management &amp; LMS</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                {lang === 'th' 
                  ? 'ระบบบริหารจัดการสถานศึกษา & ห้องเรียนออนไลน์' 
                  : 'Modern School Platform & LMS'}
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'th'
                  ? 'ระบบทะเบียนนักเรียนดิจิทัล, บันทึกเวลาเข้าแถวและผ่านประตูด้วย QR Code & RFID, ตัดเกรด ปพ.1 อิงเกณฑ์ สพฐ., ชำระค่าเทอมด้วย PromptPay และแจ้งเตือนผู้ปกครองผ่าน LINE OA'
                  : 'Student information system, turnstile QR gate attendance, Thai MOE transcripts, PromptPay tuition, and real-time LINE OA parent notifications.'}
              </p>
            </div>

            {/* Single School Institution Card */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-400" />
                {lang === 'th' ? 'สถาบันการศึกษาในระบบ' : 'Registered Educational Institution'}
              </span>
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">{schools[0]?.nameTh}</div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    {schools[0]?.code}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">{schools[0]?.nameEn}</div>
                <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    {schools[0]?.province}
                  </span>
                  <span>•</span>
                  <span>{schools[0]?.academicYear} ({schools[0]?.currentSemester})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Auth Card */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Form View 1: Main Login Page (หน้า Login หลัก) */}
            {authMode === 'login' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white">
                      {lang === 'th' ? 'เข้าสู่ระบบ EduVerse' : 'Log in to EduVerse'}
                    </h2>
                    <span className="text-xs text-cyan-400 font-semibold font-mono">
                      v2.6 Thai Edition
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'th' 
                      ? 'เข้าสู่ระบบด้วยบัญชีผู้ใช้งานของคุณเพื่อดำเนินการต่อ' 
                      : 'Sign in to access your portal and courses.'}
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
                  {/* Active Institution (Single School Display) */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      {lang === 'th' ? 'สถาบันการศึกษา' : 'Educational Institution'}
                    </label>
                    <div className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="truncate">
                        <div className="font-bold text-white text-xs">{schools[0]?.nameTh}</div>
                        <div className="text-[10px] text-slate-400">{schools[0]?.nameEn} • {schools[0]?.province}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 shrink-0">
                        {schools[0]?.code}
                      </span>
                    </div>
                  </div>

                  {/* Email / Username */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      {lang === 'th' ? 'อีเมล หรือ รหัสประจำตัว' : 'Email or Account ID'}
                    </label>
                    <input
                      type="text"
                      placeholder="admin@eduverse.school หรือ STU-6901"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setLoginPassword('password123')}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        {lang === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>{lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* LINE Login Button */}
                  <button
                    type="button"
                    onClick={handleLineLogin}
                    className="w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-md shadow-[#06C755]/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    <span>{lang === 'th' ? 'เข้าสู่ระบบด้วย LINE (LINE Login)' : 'Log in with LINE'}</span>
                  </button>
                </form>

                {/* Quick 1-Click Demo Login Roles - Super admin is hidden from general public */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">
                      {lang === 'th' ? 'ทดสอบเข้าสู่ระบบด่วน 1 คลิก:' : '1-Click Quick Demo Sign In:'}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-semibold">ไม่ต้องกรอกรหัสผ่าน</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('super_admin')}
                      className="px-2 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 text-xs font-bold border border-amber-500/30 text-center transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
                      title="เข้าสู่ระบบแม่ข่ายระดับสูงสุด Super Admin"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>👑 Super Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('admin')}
                      className="px-2 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 text-center transition-all flex flex-col items-center justify-center gap-1"
                      title="ผู้อำนวยการ / แอดมินโรงเรียน"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'th' ? 'ผอ. / แอดมิน' : 'Principal / Admin'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('teacher')}
                      className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 text-center transition-all flex flex-col items-center justify-center gap-1"
                      title="อาจารย์ผู้สอน"
                    >
                      <User className="w-4 h-4 text-sky-600" />
                      <span>{lang === 'th' ? 'อาจารย์' : 'Teacher'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('student')}
                      className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 text-center transition-all flex flex-col items-center justify-center gap-1"
                      title="นักเรียน"
                    >
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'th' ? 'นักเรียน' : 'Student'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('parent')}
                      className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 text-center transition-all flex flex-col items-center justify-center gap-1"
                      title="ผู้ปกครอง"
                    >
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'th' ? 'ผู้ปกครอง' : 'Parent'}</span>
                    </button>
                  </div>

                  {/* Super Admin Info Callout */}
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👑</span>
                      <div>
                        <strong className="text-amber-900 block">พอร์ทัลแม่ข่าย Super Admin:</strong>
                        <span className="text-amber-700 text-[11px]">
                          อีเมล: <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">superadmin@eduverse.school</code> • รหัสผ่าน: <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">SuperAdmin@Edu2026!</code>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('super_admin')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition shrink-0 ml-2"
                    >
                      เข้าสู่ระบบทันที
                    </button>
                  </div>
                </div>

                {/* Switch to Register */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400">
                    {lang === 'th' ? 'ยังไม่มีบัญชีในระบบ?' : "Don't have an account?"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAuthMode('register_user')}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      {lang === 'th' ? 'สมัครสมาชิกผู้ใช้งาน' : 'Register User'}
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={() => setAuthMode('register_school')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ลงทะเบียนเปิดโรงเรียนใหม่' : 'Register New School'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form View 2: Register New School (ลงทะเบียนเปิดโรงเรียนใหม่) */}
            {authMode === 'register_school' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      {lang === 'th' ? 'ลงทะเบียนเปิดโรงเรียนใหม่' : 'Register New School'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === 'th'
                        ? 'สร้างฐานข้อมูลสถาบันการศึกษาใหม่สำหรับองค์กรของคุณ'
                        : 'Deploy a new school tenant instance on EduVerse.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setAuthMode('login')}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'กลับ' : 'Back'}</span>
                  </button>
                </div>

                <form onSubmit={handleCreateSchool} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาไทย)' : 'School Name (Thai)'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น โรงเรียนสาธิตวิทยาคม"
                        value={schoolRegForm.nameTh}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, nameTh: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาอังกฤษ)' : 'School Name (English)'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Satit Wittayakom Academy"
                        value={schoolRegForm.nameEn}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, nameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'รหัสโรงเรียน' : 'School Code'}
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolRegForm.code}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, code: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'ประเภทสถานศึกษา' : 'School Type'}
                      </label>
                      <select
                        value={schoolRegForm.type}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="public">รัฐบาล (Public)</option>
                        <option value="private">เอกชน (Private)</option>
                        <option value="demonstration">โรงเรียนสาธิต (Demonstration)</option>
                        <option value="international">นานาชาติ (International)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'จังหวัด' : 'Province'}
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolRegForm.province}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, province: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'ชื่อผู้อำนวยการ / ผู้ดูแลระบบ' : 'Principal / Admin Name'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ดร.สมบัติ รักเรียน"
                        value={schoolRegForm.adminName}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, adminName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'เบอร์โทรศัพท์ติดต่อ' : 'Contact Phone'}
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolRegForm.phone}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'อีเมลผู้ดูแลโรงเรียน (Admin Email)' : 'Admin Email'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@newschool.ac.th"
                        value={schoolRegForm.email}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={schoolRegForm.adminPassword}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, adminPassword: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันลงทะเบียนโรงเรียน' : 'Create School Instance'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Form View 3: Register User (สมัครสมาชิกผู้ใช้งาน) */}
            {authMode === 'register_user' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-400" />
                      {lang === 'th' ? 'สมัครสมาชิกผู้ใช้งานใหม่' : 'User Registration'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === 'th' 
                        ? 'ลงทะเบียนเป็นอาจารย์ นักเรียน หรือผู้ปกครองของโรงเรียน' 
                        : 'Register as a teacher, student, or guardian.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setAuthMode('login')}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'กลับ' : 'Back'}</span>
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {lang === 'th' ? 'เลือกโรงเรียนที่คุณสังกัด' : 'Select Enrolled School'}
                    </label>
                    <select
                      value={userRegForm.schoolId}
                      onChange={(e) => setUserRegForm({ ...userRegForm, schoolId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      {schools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.code} - {sch.nameTh} ({sch.province})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'ชื่อ-นามสกุล (ภาษาไทย)' : 'Full Name (Thai)'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น นายกิตติวัฒน์ มีสุข"
                        value={userRegForm.fullNameTh}
                        onChange={(e) => setUserRegForm({ ...userRegForm, fullNameTh: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'สถานะผู้ใช้งาน (Role)' : 'Account Role'}
                      </label>
                      <select
                        value={userRegForm.role}
                        onChange={(e) => setUserRegForm({ ...userRegForm, role: e.target.value as UserRole })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="student">นักเรียน (Student)</option>
                        <option value="parent">ผู้ปกครอง (Parent)</option>
                        <option value="teacher">อาจารย์ / บุคลากร (Teacher)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'อีเมล' : 'Email'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="user@example.com"
                        value={userRegForm.email}
                        onChange={(e) => setUserRegForm({ ...userRegForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}
                      </label>
                      <input
                        type="text"
                        placeholder="081-XXX-XXXX"
                        value={userRegForm.phone}
                        onChange={(e) => setUserRegForm({ ...userRegForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={userRegForm.password}
                      onChange={(e) => setUserRegForm({ ...userRegForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="lineCheck"
                      checked={userRegForm.lineConnected}
                      onChange={(e) => setUserRegForm({ ...userRegForm, lineConnected: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                    />
                    <label htmlFor="lineCheck" className="text-slate-300">
                      {lang === 'th'
                        ? 'เชื่อมต่อการแจ้งเตือนเวลาเข้าเรียนผ่าน LINE OA อัตโนมัติ'
                        : 'Connect with LINE Official Account notifications'}
                    </label>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันสมัครสมาชิก' : 'Complete Registration'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer & Discrete Super Admin Portal */}
      <footer className="py-4 border-t border-slate-800/80 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 max-w-5xl mx-auto w-full">
        <div>
          EduVerse School Management System • {schools[0]?.nameTh || 'EduVerse Academy'}
        </div>
        <button
          type="button"
          onClick={() => setShowSuperAdminModal(true)}
          className="text-slate-500 hover:text-slate-400 text-[11px] flex items-center gap-1.5 transition-colors"
          title="เข้าสู่ระบบแม่ข่ายสำหรับเจ้าของระบบ"
        >
          <KeyRound className="w-3 h-3 text-amber-500/70" />
          <span>{lang === 'th' ? 'พอร์ทัลแม่ข่าย Super Admin' : 'Super Admin Console'}</span>
        </button>
      </footer>

      {/* Discrete Super Admin Modal for System Owner */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'th' ? 'เข้าสู่ระบบแม่ข่าย Super Admin' : 'Super Admin Authentication'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'th' ? 'เฉพาะผู้ดูแลระบบแม่ข่าย (บุคคลทั่วไปไม่ควรเห็น)' : 'Restricted to system owners only'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSuperAdminModal(false);
                  setSuperAdminKeyError(null);
                }}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Credential Reminder Box for the owner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2 text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>{lang === 'th' ? 'ข้อมูลบัญชี Super Admin ของคุณ:' : 'Your Super Admin Credentials:'}</span>
              </div>
              <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-xl border border-amber-500/20 text-slate-200 space-y-1">
                <div>User / Email: <span className="text-amber-300 font-bold select-all">superadmin@eduverse.school</span></div>
                <div>Password: <span className="text-amber-300 font-bold select-all">SuperAdmin@Edu2026!</span></div>
              </div>
            </div>

            {superAdminKeyError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs">
                {superAdminKeyError}
              </div>
            )}

            <form onSubmit={handleSuperAdminGatewayLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {lang === 'th' ? 'กรอกรหัสผ่าน Super Admin (Master Password)' : 'Super Admin Master Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="SuperAdmin@Edu2026!"
                  value={superAdminInputKey}
                  onChange={(e) => setSuperAdminInputKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSuperAdminInputKey('SuperAdmin@Edu2026!');
                  }}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  {lang === 'th' ? 'เติมรหัสอัตโนมัติ' : 'Auto-fill password'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSuperAdminModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เข้าสู่ระบบแม่ข่าย' : 'Authenticate'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
