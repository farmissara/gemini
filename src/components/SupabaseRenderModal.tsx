import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Cloud, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Server, 
  Key, 
  Sparkles, 
  Globe, 
  Layers, 
  ArrowRight,
  UploadCloud,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { 
  School, 
  Student, 
  Course, 
  GradeRecord, 
  AttendanceRecord, 
  TuitionInvoice, 
  Announcement,
  AppLanguage 
} from '../types';
import { 
  getSupabaseCredentials, 
  saveCustomSupabaseCredentials, 
  clearCustomSupabaseCredentials,
  testSupabaseConnection, 
  syncDataToSupabase 
} from '../lib/supabase';

interface SupabaseRenderModalProps {
  activeSchool: School;
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  lang: AppLanguage;
  onClose: () => void;
}

export const SupabaseRenderModal: React.FC<SupabaseRenderModalProps> = ({
  activeSchool,
  students,
  courses,
  grades,
  attendance,
  invoices,
  announcements,
  lang,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'render' | 'sql_schema'>('supabase');

  // Supabase form state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isCustomConfig, setIsCustomConfig] = useState(false);

  // Status & loading
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Copied states
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRenderYaml, setCopiedRenderYaml] = useState(false);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url);
    setSupabaseAnonKey(creds.key);
    setIsCustomConfig(creds.isCustom);
  }, []);

  const handleSaveCredentials = () => {
    saveCustomSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    setIsCustomConfig(true);
    handleTestConnection();
  };

  const handleResetCredentials = () => {
    clearCustomSupabaseCredentials();
    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url);
    setSupabaseAnonKey(creds.key);
    setIsCustomConfig(false);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await syncDataToSupabase({
      school: activeSchool,
      students,
      courses,
      grades,
      attendance,
      invoices,
      announcements,
    });
    setSyncResult(res);
    setIsSyncing(false);
  };

  const sqlSchemaCode = `-- EduVerse PostgreSQL Schema for Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT DEFAULT 'public',
    province TEXT DEFAULT 'กรุงเทพมหานคร',
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0284c7',
    students_count INTEGER DEFAULT 0,
    teachers_count INTEGER DEFAULT 0,
    academic_year TEXT DEFAULT '2569 (2026)',
    current_semester TEXT DEFAULT '1',
    line_oa_id TEXT DEFAULT '@eduverse_th',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id_number TEXT NOT NULL,
    national_id TEXT,
    first_name_en TEXT NOT NULL,
    last_name_en TEXT NOT NULL,
    first_name_th TEXT NOT NULL,
    last_name_th TEXT NOT NULL,
    gender TEXT DEFAULT 'other',
    date_of_birth TEXT,
    grade_level TEXT,
    room TEXT,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    gpa NUMERIC(3,2) DEFAULT 0.00,
    guardian_name TEXT,
    guardian_relation TEXT,
    guardian_phone TEXT,
    guardian_email TEXT,
    line_user_id TEXT,
    line_linked BOOLEAN DEFAULT false,
    line_notify_enabled BOOLEAN DEFAULT false,
    enrolled_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_th TEXT NOT NULL,
    category TEXT DEFAULT 'core',
    credits NUMERIC(3,1) DEFAULT 1.0,
    teacher_name TEXT,
    teacher_email TEXT,
    department TEXT,
    schedule TEXT,
    room TEXT,
    academic_year TEXT,
    semester TEXT DEFAULT '1',
    enrolled_student_ids JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    cover_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grades (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    academic_year TEXT,
    semester TEXT,
    midterm_score NUMERIC(5,2) DEFAULT 0,
    final_score NUMERIC(5,2) DEFAULT 0,
    assignment_score NUMERIC(5,2) DEFAULT 0,
    quiz_score NUMERIC(5,2) DEFAULT 0,
    total_score NUMERIC(5,2) DEFAULT 0,
    letter_grade TEXT DEFAULT 'F',
    grade_point NUMERIC(3,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'present',
    checkin_method TEXT DEFAULT 'qr_scanner',
    remarks TEXT,
    line_notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    semester TEXT,
    academic_year TEXT,
    issue_date TEXT,
    due_date TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    items JSONB DEFAULT '[]'::jsonb,
    payment_method TEXT,
    paid_at TEXT,
    receipt_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    target_audience TEXT DEFAULT 'all',
    published_at TEXT,
    author TEXT,
    author_role TEXT,
    pinned BOOLEAN DEFAULT false,
    line_broadcast_sent BOOLEAN DEFAULT false,
    resend_email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public schools access" ON public.schools;
    CREATE POLICY "Public schools access" ON public.schools FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public students access" ON public.students;
    CREATE POLICY "Public students access" ON public.students FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public courses access" ON public.courses;
    CREATE POLICY "Public courses access" ON public.courses FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public grades access" ON public.grades;
    CREATE POLICY "Public grades access" ON public.grades FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public attendance access" ON public.attendance;
    CREATE POLICY "Public attendance access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public invoices access" ON public.invoices;
    CREATE POLICY "Public invoices access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "Public announcements access" ON public.announcements;
    CREATE POLICY "Public announcements access" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
END $$;`;

  const renderYamlContent = `services:
  - type: web
    name: eduverse-school
    runtime: static
    buildCommand: npm run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false`;

  const copyToClipboard = (text: string, type: 'sql' | 'yaml') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else {
      setCopiedRenderYaml(true);
      setTimeout(() => setCopiedRenderYaml(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {lang === 'th' ? 'การเชื่อมต่อ Supabase & การขึ้นระบบ Render.com' : 'Supabase Integration & Render.com Deployment'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'th' 
                  ? 'คู่มือและเครื่องมือเชื่อมฐานข้อมูล PostgreSQL บน Supabase และโฮสติ้ง Render' 
                  : 'Complete guide and tools for Supabase PostgreSQL database & Render hosting'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'supabase'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. {lang === 'th' ? 'เชื่อมต่อฐานข้อมูล Supabase' : 'Supabase Database'}</span>
          </button>

          <button
            onClick={() => setActiveTab('sql_schema')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'sql_schema'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>2. {lang === 'th' ? 'SQL Schema & RLS' : 'SQL Schema'}</span>
          </button>

          <button
            onClick={() => setActiveTab('render')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'render'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>3. {lang === 'th' ? 'นำขึ้น Render.com' : 'Deploy to Render.com'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* TAB 1: SUPABASE CONFIG & SYNC */}
          {activeTab === 'supabase' && (
            <div className="space-y-6">
              {/* Step Checklist Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'th' ? 'ขั้นตอนเตรียม Supabase สำหรับ EduVerse' : 'Supabase Setup Steps'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'th'
                      ? '1. สร้างโปรเจกต์ฟรีที่ supabase.com → 2. รัน SQL Schema ในแท็บ SQL Editor → 3. ใส่ Project URL และ anon key ด้านล่างเพื่อเชื่อมต่อ'
                      : '1. Create free project at supabase.com -> 2. Run SQL Schema in SQL Editor -> 3. Paste Project URL and anon key below'}
                  </p>
                </div>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <span>{lang === 'th' ? 'ไปที่ Supabase Console' : 'Open Supabase'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Supabase Connection Credentials */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'th' ? 'กุญแจและที่อยู่โครงการ Supabase (API Credentials)' : 'Project Credentials'}</span>
                  </h3>
                  {isCustomConfig && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {lang === 'th' ? 'บันทึกในเครื่องแล้ว' : 'Saved in Browser'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Supabase Project URL (VITE_SUPABASE_URL):
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-project-id.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Supabase Anon / Public Key (VITE_SUPABASE_ANON_KEY):
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveCredentials}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'บันทึกและเชื่อมต่อ' : 'Save & Test'}</span>
                  </button>

                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !supabaseUrl}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? (lang === 'th' ? 'กำลังทดสอบ...' : 'Testing...') : (lang === 'th' ? 'ทดสอบเชื่อมต่อ' : 'Test Ping')}</span>
                  </button>

                  {isCustomConfig && (
                    <button
                      onClick={handleResetCredentials}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors ml-auto"
                    >
                      {lang === 'th' ? 'ล้างค่าที่บันทึกไว้' : 'Reset to Defaults'}
                    </button>
                  )}
                </div>

                {/* Test Result Alert */}
                {testResult && (
                  <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    testResult.ok 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}>
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold">{testResult.ok ? (lang === 'th' ? 'เชื่อมต่อสำเร็จ' : 'Connection OK') : (lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Connection Error')}:</span> {testResult.message}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Sync Section */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'th' ? 'อัปโหลดและ Sync ข้อมูลตัวอย่างเข้า Supabase' : 'Seed / Sync Data to Supabase'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === 'th'
                        ? `ส่งข้อมูลโรงเรียน (${activeSchool.nameTh}), นักเรียน (${students.length} คน), รายวิชา (${courses.length} วิชา), เกรด, การเช็คชื่อ และข่าวสารเข้าตารางใน Supabase โดยตรง`
                        : `Sync current active school (${activeSchool.nameEn}), ${students.length} students, ${courses.length} courses, grades, and attendance into Supabase.`}
                    </p>
                  </div>
                  <button
                    onClick={handleSyncData}
                    disabled={isSyncing || !supabaseUrl}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 shrink-0 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? (lang === 'th' ? 'กำลังส่งข้อมูล...' : 'Syncing...') : (lang === 'th' ? 'เริ่ม Sync ข้อมูลทั้งหมด' : 'Sync All Data')}</span>
                  </button>
                </div>

                {syncResult && (
                  <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    syncResult.success 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}>
                    {syncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold">{syncResult.success ? (lang === 'th' ? 'สำเร็จ' : 'Success') : (lang === 'th' ? 'ไม่สำเร็จ' : 'Failed')}:</span> {syncResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SQL SCHEMA */}
          {activeTab === 'sql_schema' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>PostgreSQL DDL &amp; Row Level Security (RLS)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'th' 
                      ? 'ก๊อปปี้โค้ด SQL ด้านล่างนี้ ไปวางใน Supabase Dashboard → SQL Editor แล้วกด RUN ได้ทันที' 
                      : 'Copy this SQL script and paste it into Supabase Dashboard -> SQL Editor and hit RUN.'}
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(sqlSchemaCode, 'sql')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors shrink-0"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (lang === 'th' ? 'คัดลอก SQL ทั้งหมด' : 'Copy SQL Schema')}</span>
                </button>
              </div>

              <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 max-h-[360px] overflow-y-auto leading-relaxed">
                <pre>{sqlSchemaCode}</pre>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">💡 {lang === 'th' ? 'คำแนะนำการติดตั้งใน Supabase:' : 'Supabase Tips:'}</div>
                <div>1. ไปที่ <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline">supabase.com</a> เลือกโปรเจกต์ของคุณ</div>
                <div>2. เมนูด้านซ้ายคลิกที่ <strong>SQL Editor</strong> (ไอคอนรูป terminal)</div>
                <div>3. กด <strong>+ New Query</strong> วางโค้ดนี้ลงไป แล้วกดปุ่มเขียว <strong>Run</strong></div>
                <div>4. ตารางทั้งหมด 7 ตารางพร้อม Index และ Security Rules จะถูกสร้างอัตโนมัติ</div>
              </div>
            </div>
          )}

          {/* TAB 3: RENDER.COM DEPLOYMENT */}
          {activeTab === 'render' && (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    <span>{lang === 'th' ? 'นำโปรเจกต์ขึ้นเว็บ Render.com แบบ Static Site (ฟรี & เร็วสุด)' : 'Deploy to Render.com as Static Site'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'th'
                      ? 'โปรเจกต์ได้ถูกเตรียมไฟล์ render.yaml และ public/_redirects สำหรับ SPA Routing บน Render ไว้เรียบร้อยแล้ว'
                      : 'Configured with render.yaml and public/_redirects for instant SPA client-side routing on Render.'}
                  </p>
                </div>
                <a
                  href="https://dashboard.render.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <span>{lang === 'th' ? 'เปิด Render Dashboard' : 'Open Render Dashboard'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {lang === 'th' ? 'ขั้นตอนการนำขึ้น Render.com ทีละสเต็ป (Step-by-Step)' : 'Step-by-Step Deployment Guide'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Step 1 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px] border border-cyan-500/30">1</span>
                      <span>{lang === 'th' ? 'Push โค้ดขึ้น GitHub' : 'Push to GitHub'}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      {lang === 'th'
                        ? 'ตรวจสอบให้แน่ใจว่าได้ commit และ push โค้ดล่าสุดขึ้น repository บน GitHub (farmissara/gemini)'
                        : 'Commit and push your latest code to your GitHub repository (farmissara/gemini).'}
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px] border border-cyan-500/30">2</span>
                      <span>{lang === 'th' ? 'สร้าง Static Site บน Render' : 'Create Static Site on Render'}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      {lang === 'th'
                        ? 'เข้า Render Dashboard → กดปุ่ม New + ด้านบนขวา → เลือก "Static Site" แล้วเลือก repository ของคุณ'
                        : 'In Render Dashboard -> Click "New +" -> Choose "Static Site" and connect your repo.'}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px] border border-cyan-500/30">3</span>
                      <span>{lang === 'th' ? 'ตั้งค่าการ Build' : 'Build & Publish Settings'}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 space-y-0.5 bg-slate-900 p-2 rounded border border-slate-800">
                      <div>Build Command: <span className="text-emerald-400 font-bold">npm run build</span></div>
                      <div>Publish Directory: <span className="text-emerald-400 font-bold">dist</span></div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px] border border-cyan-500/30">4</span>
                      <span>{lang === 'th' ? 'เพิ่มตัวแปร Environment Variables' : 'Set Environment Variables'}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 space-y-0.5 bg-slate-900 p-2 rounded border border-slate-800">
                      <div><span className="text-cyan-400">VITE_SUPABASE_URL</span> = (URL จาก Supabase)</div>
                      <div><span className="text-cyan-400">VITE_SUPABASE_ANON_KEY</span> = (Anon Key)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blueprint render.yaml copy */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">render.yaml (Render Blueprint Config)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(renderYamlContent, 'yaml')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedRenderYaml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRenderYaml ? 'คัดลอกแล้ว' : 'คัดลอก YAML'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 border border-slate-800">
                  <pre>{renderYamlContent}</pre>
                </div>
              </div>

              {/* SPA Routing note */}
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  {lang === 'th'
                    ? 'ระบบมีไฟล์ public/_redirects พร้อมกฎ rewrite "/* /index.html 200" เพื่อป้องกันปัญหาเปิดหน้าย่อยแล้วขึ้น 404 Not Found บน Render เรียบร้อยแล้ว'
                    : 'Configured with public/_redirects rewrite rule "/* /index.html 200" to prevent 404 errors on direct sub-page reloads.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>EduVerse Enterprise • Supabase PostgreSQL &amp; Render.com Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
