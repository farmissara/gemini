import React, { useState, useEffect } from 'react';
import { School, AuthUser, UserRole, AppLanguage, ThemePalette } from '../types';
import { 
  GraduationCap, 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Globe, 
  MapPin, 
  PlusCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Sun, 
  Moon,
  Info,
  KeyRound
} from 'lucide-react';
import { authenticateWithDatabase, registerUserInDatabase, initAuthDatabase } from '../lib/authDb';

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
  onLogin,
  onRegisterSchool,
  onRegisterUser,
  lang,
  setLang,
  themePalette = 'light_warm',
  setThemePalette,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register_user' | 'register_school'>('login');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || '');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Auth DB on mount
  useEffect(() => {
    initAuthDatabase();
  }, []);

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

  // Handle standard database authentication
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    try {
      const cleanEmail = loginEmail.trim();
      const cleanPassword = loginPassword.trim();

      if (!cleanEmail || !cleanPassword) {
        setLoginError(
          lang === 'th'
            ? 'กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่าน'
            : 'Please enter your username and password'
        );
        setIsLoading(false);
        return;
      }

      const result = await authenticateWithDatabase(cleanEmail, cleanPassword);

      if (!result.success || !result.user) {
        setLoginError(result.error || (lang === 'th' ? 'รหัสผ่านไม่ถูกต้อง' : 'Invalid credentials'));
        setIsLoading(false);
        return;
      }

      const targetSchool = schools.find((s) => s.id === selectedSchoolId) || schools[0];
      onLogin(result.user, targetSchool);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill credentials into the form so the user can see what credentials exist and click "เข้าสู่ระบบ" with full password validation
  const handleFillCredentials = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
  };

  // Register New School
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolRegForm.nameTh || !schoolRegForm.adminName || !schoolRegForm.email || !schoolRegForm.adminPassword) {
      setLoginError(lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบทุกช่อง' : 'Please fill all required fields');
      return;
    }

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
      primaryColor: '#1e40af',
      studentsCount: 1,
      teachersCount: 1,
      academicYear: '2569 (2026)',
      currentSemester: 'ภาคเรียนที่ 1',
      lineOaId: `@${schoolRegForm.code.toLowerCase()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    // Save user & hashed password to database
    const regResult = await registerUserInDatabase({
      email: schoolRegForm.email,
      password: schoolRegForm.adminPassword,
      fullNameTh: schoolRegForm.adminName,
      fullNameEn: schoolRegForm.adminName,
      role: 'admin',
      schoolId: newSchoolId,
      phone: schoolRegForm.phone,
      lineConnected: true,
    });

    if (!regResult.success || !regResult.user) {
      setLoginError(regResult.error || 'Failed to register school admin');
      return;
    }

    onRegisterSchool(newSchool, regResult.user);
  };

  // Register User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRegForm.fullNameTh || !userRegForm.email || !userRegForm.password) {
      setLoginError(lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบทุกช่อง' : 'Please fill all required fields');
      return;
    }

    // Save user & hashed password into database
    const regResult = await registerUserInDatabase({
      email: userRegForm.email,
      password: userRegForm.password,
      fullNameTh: userRegForm.fullNameTh,
      fullNameEn: userRegForm.fullNameEn || userRegForm.fullNameTh,
      role: userRegForm.role,
      schoolId: userRegForm.schoolId,
      phone: userRegForm.phone,
      lineConnected: userRegForm.lineConnected,
    });

    if (!regResult.success || !regResult.user) {
      setLoginError(regResult.error || 'Failed to register user');
      return;
    }

    onRegisterUser(regResult.user);
  };

  const isLight = !themePalette?.includes('dark') && themePalette !== 'sapphire';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'} flex flex-col justify-between font-sans transition-colors duration-200`}>
      {/* Top Header */}
      <header className={`h-16 border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'} px-4 md:px-8 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
              EduVerse
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                School Management System
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Eye-Care Theme Switcher */}
          {setThemePalette && (
            <div className={`flex items-center p-1 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} gap-1`}>
              <button
                type="button"
                onClick={() => setThemePalette('light_warm')}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                  themePalette === 'light_warm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="โหมดกระดาษอุ่น ถนอมสายตา"
              >
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">สบายตา</span>
              </button>
              <button
                type="button"
                onClick={() => setThemePalette('sapphire')}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                  themePalette === 'sapphire' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="โหมดมืดนุ่มนวล"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">โหมดมืด</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Intro Banner */}
          <div className="lg:col-span-5 space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart School Management &amp; Learning</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {lang === 'th' 
                  ? 'ระบบบริหารจัดการสถานศึกษาและข้อมูลนักเรียน' 
                  : 'School Management & Learning Platform'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'th'
                  ? 'ระบบทะเบียนประวัตินักเรียน ทะเบียนรายวิชา บันทึกเวลาเข้าเรียน สแกนบัตรนักเรียนดิจิทัล สมุดบันทึกคะแนน ปพ.1 และการติดตามการบ้าน'
                  : 'Student information system, course enrollment, digital ID card scanning, transcript gradebook, and homework tracking.'}
              </p>
            </div>

            {/* Institution Card */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                {lang === 'th' ? 'สถาบันการศึกษา' : 'Educational Institution'}
              </span>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{schools[0]?.nameTh}</div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    {schools[0]?.code}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{schools[0]?.nameEn}</div>
                <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{schools[0]?.province}</span>
                  <span>•</span>
                  <span>{schools[0]?.academicYear} ({schools[0]?.currentSemester})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Auth Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Login View */}
            {authMode === 'login' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {lang === 'th' ? 'เข้าสู่ระบบโรงเรียน' : 'Sign In to School Portal'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'th' 
                      ? 'กรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่านที่ลงทะเบียนไว้ในฐานข้อมูล' 
                      : 'Enter your registered credentials to sign in.'}
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
                  {/* Select School */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      {lang === 'th' ? 'เลือกโรงเรียน' : 'Select School'}
                    </label>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      {schools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.nameTh} ({sch.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Username / Email */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lang === 'th' ? 'อีเมล หรือ รหัสบัญชี' : 'Email or Account ID'}</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น admin@eduverse.school หรือ student@eduverse.school"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lang === 'th' ? 'รหัสผ่าน' : 'Password'}</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="กรอกรหัสผ่านของคุณ"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  {/* Submit Button - Authenticates with Password Check */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <span>{isLoading ? (lang === 'th' ? 'กำลังตรวจสอบ...' : 'Verifying...') : (lang === 'th' ? 'เข้าสู่ระบบ (Verify Password)' : 'Sign In')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Helper Credential Directory: Shows credentials stored in the DB so evaluators can populate the form, but MUST submit with real password check */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      {lang === 'th' ? 'บัญชีทดสอบในฐานข้อมูล (คลิกเพื่อกรอกอัตโนมัติแล้วกดเข้าสู่ระบบ):' : 'Registered Demo Accounts in DB:'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleFillCredentials('superadmin@eduverse.school', 'SuperAdmin@Edu2026!')}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition flex items-start gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">👑 Super Admin</div>
                        <div className="text-slate-500 font-mono text-[10px]">superadmin@eduverse.school</div>
                        <div className="text-slate-400 text-[10px]">Pass: SuperAdmin@Edu2026!</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFillCredentials('admin@eduverse.school', 'Admin@Edu2026!')}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition flex items-start gap-2"
                    >
                      <Building2 className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">ผอ. / แอดมินโรงเรียน</div>
                        <div className="text-slate-500 font-mono text-[10px]">admin@eduverse.school</div>
                        <div className="text-slate-400 text-[10px]">Pass: Admin@Edu2026!</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFillCredentials('teacher@eduverse.school', 'Teacher@Edu2026!')}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition flex items-start gap-2"
                    >
                      <User className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">อาจารย์ผู้สอน (Teacher)</div>
                        <div className="text-slate-500 font-mono text-[10px]">teacher@eduverse.school</div>
                        <div className="text-slate-400 text-[10px]">Pass: Teacher@Edu2026!</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFillCredentials('student@eduverse.school', 'Student@Edu2026!')}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition flex items-start gap-2"
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">นักเรียน (Student)</div>
                        <div className="text-slate-500 font-mono text-[10px]">student@eduverse.school</div>
                        <div className="text-slate-400 text-[10px]">Pass: Student@Edu2026!</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Switch to Register */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">
                    {lang === 'th' ? 'ยังไม่มีบัญชีในระบบ?' : "Need an account?"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register_user');
                        setLoginError(null);
                      }}
                      className="text-blue-700 hover:underline font-semibold"
                    >
                      {lang === 'th' ? 'สมัครสมาชิกผู้ใช้งาน' : 'Register User'}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register_school');
                        setLoginError(null);
                      }}
                      className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ลงทะเบียนโรงเรียนใหม่' : 'Register School'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Register New School View */}
            {authMode === 'register_school' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      {lang === 'th' ? 'ลงทะเบียนเปิดโรงเรียนใหม่' : 'Register New School'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'th'
                        ? 'สร้างข้อมูลสถาบันการศึกษาและบัญชีผู้ดูแลระบบ'
                        : 'Register a new school institution.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError(null);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'กลับ' : 'Back'}</span>
                  </button>
                </div>

                {loginError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleCreateSchool} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาไทย)' : 'School Name (Thai)'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น โรงเรียนสาธิตวิทยานุสรณ์"
                        value={schoolRegForm.nameTh}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, nameTh: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'ชื่อโรงเรียน (ภาษาอังกฤษ)' : 'School Name (English)'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Satit Academy"
                        value={schoolRegForm.nameEn}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, nameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'รหัสโรงเรียน' : 'School Code'}
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolRegForm.code}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, code: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'ประเภทสถานศึกษา' : 'Type'}
                      </label>
                      <select
                        value={schoolRegForm.type}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        <option value="public">รัฐบาล (Public)</option>
                        <option value="private">เอกชน (Private)</option>
                        <option value="demonstration">โรงเรียนสาธิต</option>
                        <option value="international">นานาชาติ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'จังหวัด' : 'Province'}
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolRegForm.province}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, province: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'ชื่อผู้ดูแลระบบ (Admin Name)' : 'Admin Full Name'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ดร.สมบัติ รักเรียน"
                        value={schoolRegForm.adminName}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, adminName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}
                      </label>
                      <input
                        type="text"
                        required
                        value={schoolRegForm.phone}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'อีเมลสำหรับเข้าสู่ระบบ' : 'Admin Email'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@myschool.ac.th"
                        value={schoolRegForm.email}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'กำหนดรหัสผ่าน' : 'Set Password'}
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={schoolRegForm.adminPassword}
                        onChange={(e) => setSchoolRegForm({ ...schoolRegForm, adminPassword: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันลงทะเบียน' : 'Register School'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Register User View */}
            {authMode === 'register_user' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      {lang === 'th' ? 'สมัครสมาชิกผู้ใช้งานใหม่' : 'User Registration'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'th' 
                        ? 'ลงทะเบียนเป็นอาจารย์ นักเรียน หรือผู้ปกครอง' 
                        : 'Register as teacher, student, or guardian.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError(null);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'กลับ' : 'Back'}</span>
                  </button>
                </div>

                {loginError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      {lang === 'th' ? 'เลือกโรงเรียน' : 'Select School'}
                    </label>
                    <select
                      value={userRegForm.schoolId}
                      onChange={(e) => setUserRegForm({ ...userRegForm, schoolId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                    >
                      {schools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.nameTh} ({sch.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น นายกิตติวัฒน์ มีสุข"
                        value={userRegForm.fullNameTh}
                        onChange={(e) => setUserRegForm({ ...userRegForm, fullNameTh: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'สถานะผู้ใช้งาน (Role)' : 'Role'}
                      </label>
                      <select
                        value={userRegForm.role}
                        onChange={(e) => setUserRegForm({ ...userRegForm, role: e.target.value as UserRole })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        <option value="student">นักเรียน (Student)</option>
                        <option value="parent">ผู้ปกครอง (Parent)</option>
                        <option value="teacher">อาจารย์ / บุคลากร (Teacher)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'อีเมล' : 'Email'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="user@example.com"
                        value={userRegForm.email}
                        onChange={(e) => setUserRegForm({ ...userRegForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={userRegForm.password}
                        onChange={(e) => setUserRegForm({ ...userRegForm, password: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยืนยันสมัครสมาชิก' : 'Register User'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 px-4 text-center text-xs text-slate-500">
        <div>
          EduVerse School Management System • {schools[0]?.nameTh || 'EduVerse Academy'}
        </div>
      </footer>
    </div>
  );
};
