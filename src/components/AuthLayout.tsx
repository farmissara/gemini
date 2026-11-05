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

    const existingUser = demoUsers.find(
      (u) => u.email.toLowerCase() === loginEmail.toLowerCase()
    );

    const targetSchool = schools.find((s) => s.id === selectedSchoolId) || schools[0];

    if (existingUser) {
      onLogin(existingUser, targetSchool);
    } else if (loginEmail && loginPassword) {
      // Allow realistic custom login
      const customUser: AuthUser = {
        id: `usr-${Date.now()}`,
        email: loginEmail,
        fullNameTh: loginEmail.split('@')[0],
        fullNameEn: loginEmail.split('@')[0],
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-indigo-500 selection:text-white font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
              EduVerse
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Multi-School SIS &amp; LMS
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Intro Banner */}
          <div className="lg:col-span-5 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant School Architecture</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                {lang === 'th' 
                  ? 'ระบบบริหารจัดการสถานศึกษา & ห้องเรียนออนไลน์' 
                  : 'Modern Multi-School Platform & LMS'}
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'th'
                  ? 'รองรับหลายโรงเรียนในระบบเดียว มีระบบทะเบียนนักเรียน, บันทึกเวลาเข้าแถวและผ่านประตู, ตัดเกรด ปพ.1 อิงเกณฑ์ สพฐ., ชำระค่าเทอมด้วย PromptPay และเชื่อมต่อ LINE OA'
                  : 'Manage multiple school branches, bilingual student records, turnstile QR gate attendance, Thai MOE transcripts, and LINE OA notifications.'}
              </p>
            </div>

            {/* School Directory Badges */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                {lang === 'th' ? 'โรงเรียนที่เปิดใช้งานในระบบ' : 'Registered Institutions'} ({schools.length})
              </span>
              <div className="space-y-2">
                {schools.map((sch) => (
                  <div
                    key={sch.id}
                    onClick={() => setSelectedSchoolId(sch.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedSchoolId === sch.id
                        ? 'bg-indigo-950/60 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{sch.nameTh}</div>
                      <div className="text-[10px] text-slate-400">{sch.nameEn} • {sch.province}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {sch.code}
                    </span>
                  </div>
                ))}
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
                    <span className="text-xs text-indigo-400 font-semibold font-mono">
                      Multi-Tenant
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'th' 
                      ? 'เลือกโรงเรียนและเข้าสู่ระบบด้วยบัญชีของคุณ' 
                      : 'Select your school and sign in to continue.'}
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
                  {/* Select School */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      {lang === 'th' ? 'เลือกโรงเรียน / สถาบันการศึกษา' : 'Select School / Institution'}
                    </label>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                    >
                      {schools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.code} - {sch.nameTh} ({sch.province})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email / Username */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      {lang === 'th' ? 'อีเมล หรือ รหัสประจำตัว' : 'Email or Account ID'}
                    </label>
                    <input
                      type="text"
                      placeholder="admin@eduverse.school หรือ STU-6901"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setLoginPassword('password123')}
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        {lang === 'th' ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
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

                {/* Quick 1-Click Demo Login Roles */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">
                      {lang === 'th' ? 'ทดสอบเข้าสู่ระบบด่วน 1 คลิก:' : '1-Click Quick Demo Sign In:'}
                    </span>
                    <span className="text-[10px] text-indigo-400">ไม่ต้องกรอกรหัสผ่าน</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    <button
                      onClick={() => handleQuickDemo('super_admin')}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 text-center transition-colors"
                      title="Super Admin - จัดการทุกโรงเรียน"
                    >
                      Super Admin
                    </button>
                    <button
                      onClick={() => handleQuickDemo('admin')}
                      className="px-2 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-[11px] font-semibold border border-indigo-800/60 text-center transition-colors"
                      title="ผู้อำนวยการ / แอดมินโรงเรียน"
                    >
                      {lang === 'th' ? 'ผอ. / แอดมิน' : 'Principal'}
                    </button>
                    <button
                      onClick={() => handleQuickDemo('teacher')}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 text-center transition-colors"
                      title="อาจารย์ผู้สอน"
                    >
                      {lang === 'th' ? 'อาจารย์' : 'Teacher'}
                    </button>
                    <button
                      onClick={() => handleQuickDemo('student')}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 text-center transition-colors"
                      title="นักเรียน"
                    >
                      {lang === 'th' ? 'นักเรียน' : 'Student'}
                    </button>
                    <button
                      onClick={() => handleQuickDemo('parent')}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 text-center transition-colors"
                      title="ผู้ปกครอง"
                    >
                      {lang === 'th' ? 'ผู้ปกครอง' : 'Parent'}
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

      {/* Footer */}
      <footer className="py-4 border-t border-slate-800/80 px-4 text-center text-xs text-slate-500">
        EduVerse Multi-School Management &amp; Learning Platform • Secured with Thai MOE standards &amp; Supabase Auth
      </footer>
    </div>
  );
};
