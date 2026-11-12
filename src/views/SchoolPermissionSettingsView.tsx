import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  GraduationCap, 
  Users, 
  Check, 
  X, 
  Save, 
  CheckCircle2, 
  Building2, 
  Lock, 
  Sparkles, 
  Info 
} from 'lucide-react';
import { School, UserRole, AppLanguage } from '../types';
import { PagedList } from '../components/PagedList';

interface SchoolPermissionSettingsViewProps {
  activeSchool: School;
  lang: AppLanguage;
}

interface SchoolRolePolicy {
  id: string;
  role: 'teacher' | 'student' | 'parent';
  titleTh: string;
  descTh: string;
  category: 'academic' | 'student_care' | 'communication';
  enabled: boolean;
}

export const SchoolPermissionSettingsView: React.FC<SchoolPermissionSettingsViewProps> = ({
  activeSchool,
  lang,
}) => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | 'parent'>('teacher');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Storage key specific to this school
  const storageKey = `eduverse_school_perms_${activeSchool.id}`;

  const defaultPolicies: SchoolRolePolicy[] = [
    // Teacher Policies
    {
      id: 'teacher_grade_entry',
      role: 'teacher',
      titleTh: 'อนุญาตให้ครูบันทึกและแก้ไขคะแนนสอบ ปพ.1',
      descTh: 'ครูประจำวิชาสามารถกรอกคะแนนเก็บ กลางภาค และปลายภาคได้โดยตรง',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'teacher_attendance',
      role: 'teacher',
      titleTh: 'อนุญาตให้ครูเช็คชื่อเข้าแถวและเช็คชื่อรายคาบ',
      descTh: 'ครูสามารถบันทึกเวลาเรียนและสแกน QR Code ประจำคาบเรียนได้',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'teacher_homework',
      role: 'teacher',
      titleTh: 'อนุญาตให้ครูสั่งการบ้านและตรวจงานออนไลน์ (LMS)',
      descTh: 'สร้างงาน มอบหมายแบบฝึกหัด และให้คะแนนพร้อมข้อเสนอแนะแก่นักเรียน',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'teacher_line_broadcast',
      role: 'teacher',
      titleTh: 'อนุญาตให้ครูส่งข้อความแจ้งเตือนผ่าน LINE Official Account',
      descTh: 'ส่งข่าวสารหรือแจ้งเตือนการบ้านถึงผู้ปกครองผ่านระบบ LINE อัตโนมัติ',
      category: 'communication',
      enabled: true,
    },
    {
      id: 'teacher_sdq_screening',
      role: 'teacher',
      titleTh: 'อนุญาตให้ครูประเมินพฤติกรรม & คัดกรอง SDQ สพฐ.',
      descTh: 'บันทึกแบบประเมินจุดเด่นจุดพัฒนา และส่งต่อข้อมูลการดูแลช่วยเหลือนักเรียน',
      category: 'student_care',
      enabled: true,
    },
    {
      id: 'teacher_infirmary_access',
      role: 'teacher',
      titleTh: 'อนุญาตให้ครูดูประวัติสุขภาพและการรักษาห้องพยาบาล',
      descTh: 'ตรวจสอบข้อมูลการแพ้ยา ประวัติการเจ็บป่วย และการส่งตัวไปห้องพยาบาล',
      category: 'student_care',
      enabled: true,
    },

    // Student Policies
    {
      id: 'student_view_grades',
      role: 'student',
      titleTh: 'อนุญาตให้นักเรียนดูผลการเรียนและพิมพ์ใบรายงานผล',
      descTh: 'นักเรียนสามารถดูเกรดเฉลี่ย GPA และดาวน์โหลดเอกสาร ปพ. ได้ด้วยตนเอง',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'student_submit_homework',
      role: 'student',
      titleTh: 'อนุญาตให้นักเรียนส่งการบ้านและไฟล์งานผ่านระบบ',
      descTh: 'อัปโหลดการบ้าน ตรวจสอบสถานะการส่ง และดูคะแนนที่ครูตรวจแล้ว',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'student_treasure_game',
      role: 'student',
      titleTh: 'อนุญาตให้นักเรียนเข้าเล่น "เกมล่าสมบัติ 3D"',
      descTh: 'เข้าสู่สนามประลองความรู้ 3D เพื่อทำข้อสอบและสะสมเหรียญรางวัล',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'student_upload_portfolio',
      role: 'student',
      titleTh: 'อนุญาตให้นักเรียนสร้างและอัปโหลดแฟ้มผลงาน Portfolio (TCAS)',
      descTh: 'บันทึกเกียรติบัตร กิจกรรม และผลงานเพื่อยื่นประกอบการศึกษาต่อ',
      category: 'student_care',
      enabled: true,
    },

    // Parent Policies
    {
      id: 'parent_realtime_attendance',
      role: 'parent',
      titleTh: 'อนุญาตให้ผู้ปกครองดูเวลาผ่านประตูโรงเรียนแบบ Real-time',
      descTh: 'ตรวจสอบเวลาที่บุตรหลานสแกนบัตรผ่านประตูอัตโนมัติของโรงเรียน',
      category: 'student_care',
      enabled: true,
    },
    {
      id: 'parent_promptpay_tuition',
      role: 'parent',
      titleTh: 'อนุญาตให้ผู้ปกครองชำระค่าเล่าเรียนด้วย PromptPay QR',
      descTh: 'ดูใบแจ้งหนี้ สแกนจ่ายเงินผ่านแอปธนาคาร และรับใบเสร็จรับเงินดิจิทัล',
      category: 'academic',
      enabled: true,
    },
    {
      id: 'parent_line_alerts',
      role: 'parent',
      titleTh: 'ส่งการแจ้งเตือนเข้าเรียนและการบ้านผ่าน LINE OA ของผู้ปกครอง',
      descTh: 'แจ้งเตือนเมื่อนักเรียนเข้าโรงเรียน หรือมีการบ้านใหม่ที่ต้องส่ง',
      category: 'communication',
      enabled: true,
    },
  ];

  const [policies, setPolicies] = useState<SchoolRolePolicy[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultPolicies;
  });

  const togglePolicy = (policyId: string) => {
    setPolicies(prev =>
      prev.map(p => p.id === policyId ? { ...p, enabled: !p.enabled } : p)
    );
  };

  const savePolicies = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(policies));
    }
    setFeedbackToast(`บันทึกการกำหนดสิทธิ์ของ ${activeSchool.nameTh} เรียบร้อยแล้ว`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const currentRolePolicies = policies.filter(p => p.role === selectedRole);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Toast Alert */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="app-page-header p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-bold border border-[var(--color-border)]">
            <Building2 className="w-3.5 h-3.5" />
            <span>การบริหารจัดการสิทธิ์เฉพาะสถาบัน • School Administrator Console</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-title)] tracking-tight">
            กำหนดสิทธิ์ผู้ใช้งานภายในโรงเรียน
          </h1>
          <p className="text-xs text-[var(--color-text-body)]">
            {activeSchool.nameTh} ({activeSchool.code}) — ผู้อำนวยการและผู้บริหารโรงเรียนเป็นผู้กำหนดสิทธิ์การเข้าถึงข้อมูลของครู นักเรียน และผู้ปกครองในโรงเรียนนี้
          </p>
        </div>

        <button
          type="button"
          onClick={savePolicies}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shadow-xs transition shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>บันทึกการกำหนดสิทธิ์ (Save)</span>
        </button>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedRole('teacher')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            selectedRole === 'teacher'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>อาจารย์ผู้สอน / บุคลากร (Teachers)</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('student')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            selectedRole === 'student'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>นักเรียน (Students)</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('parent')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            selectedRole === 'parent'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ผู้ปกครอง (Parents)</span>
        </button>
      </div>

      {/* Policy Switches Grid */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)]">
              {selectedRole === 'teacher' && 'สิทธิ์การทำงานของคณะครูและอาจารย์'}
              {selectedRole === 'student' && 'สิทธิ์การเข้าถึงข้อมูลของนักเรียน'}
              {selectedRole === 'parent' && 'สิทธิ์และการแจ้งเตือนของผู้ปกครอง'}
            </h3>
            <p className="text-xs text-[var(--color-text-body)]">
              เปิดหรือปิดสิทธิ์การใช้งานของบทบาทนี้ในโรงเรียนของคุณ
            </p>
          </div>

          <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--color-primary-light)] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
            {currentRolePolicies.filter(p => p.enabled).length} / {currentRolePolicies.length} สิทธิ์ที่เปิดใช้งาน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <PagedList items={currentRolePolicies} pageSize={2} renderItem={(pol) => (
            <div
              key={pol.id}
              className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                pol.enabled
                  ? 'bg-[var(--color-card)] border-[var(--color-primary)] shadow-xs'
                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-[var(--color-text-title)] text-xs flex items-center gap-1.5">
                  {pol.enabled ? (
                    <Check className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  )}
                  <span className="truncate">{pol.titleTh}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{pol.descTh}</div>
              </div>

              <button
                type="button"
                onClick={() => togglePolicy(pol.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pol.enabled ? 'bg-blue-700' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    pol.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )} />
        </div>
      </div>
    </div>
  );
};
