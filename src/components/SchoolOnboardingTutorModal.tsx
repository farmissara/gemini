import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Users, 
  GraduationCap, 
  BookOpen, 
  HeartPulse, 
  Award, 
  FileSpreadsheet, 
  Layers, 
  FileCheck, 
  HelpCircle, 
  RefreshCw, 
  Trash2, 
  Building2, 
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { AppLanguage, School } from '../types';

interface SchoolOnboardingTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSchool: School;
  studentsCount: number;
  teachersCount: number;
  coursesCount: number;
  lang: AppLanguage;
  onNavigateToTab: (tab: any) => void;
  onOpenImportExport: (tab?: string) => void;
}

export const SchoolOnboardingTutorModal: React.FC<SchoolOnboardingTutorModalProps> = ({
  isOpen,
  onClose,
  activeSchool,
  studentsCount,
  teachersCount,
  coursesCount,
  lang,
  onNavigateToTab,
  onOpenImportExport,
}) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'systems_reference'>('checklist');
  const [completedSteps, setCompletedSteps] = useState<number[]>([
    teachersCount > 0 ? 1 : 0,
    studentsCount > 0 ? 2 : 0,
    coursesCount > 0 ? 4 : 0,
  ].filter(Boolean));

  if (!isOpen) return null;

  const toggleStep = (stepNum: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepNum) ? prev.filter(s => s !== stepNum) : [...prev, stepNum]
    );
  };

  const steps = [
    {
      step: 1,
      code: 'HRMS & DPA',
      titleTh: '1. ระบบบุคลากรโรงเรียน (HRMS) & ประเมินวิทยฐานะ (DPA)',
      descTh: 'เพิ่มรายชื่อคุณครู ผู้บริหาร ฝ่ายทะเบียน กำหนดกลุ่มสาระการเรียนรู้ และตั้งค่าแฟ้มข้อตกลง ว.PA',
      icon: GraduationCap,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
      actionText: 'จัดการทำเนียบครู HRMS',
      action: () => {
        onNavigateToTab('teachers');
        onClose();
      },
      statusText: teachersCount > 0 ? `พบข้อมูลครูแล้ว ${teachersCount} ท่าน` : 'ยังไม่มีข้อมูลครู',
      isDone: teachersCount > 0 || completedSteps.includes(1),
    },
    {
      step: 2,
      code: 'DMC',
      titleTh: '2. ระบบทะเบียนนักเรียน (DMC สพฐ.)',
      descTh: 'นำเข้าข้อมูลนักเรียนตามมาตรฐาน สพฐ. พร้อมเลขประจำตัวประชาชน 13 หลัก ข้อมูลผู้ปกครอง และชั้นเรียน',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      actionText: 'นำเข้าไฟล์ DMC (CSV/Excel)',
      action: () => {
        onOpenImportExport('students');
        onClose();
      },
      statusText: studentsCount > 0 ? `พบข้อมูลนักเรียน ${studentsCount} คน` : 'ยังไม่มีข้อมูลนักเรียน',
      isDone: studentsCount > 0 || completedSteps.includes(2),
    },
    {
      step: 3,
      code: 'CCT & OBEC Care',
      titleTh: '3. ระบบนักเรียนยากจน (CCT) & ดูแลช่วยเหลือ (OBEC Care / SDQ)',
      descTh: 'คัดกรองทุนนักเรียนยากจนพิเศษ สพฐ.-กสศ., คัดกรองพฤติกรรม SDQ 5 ด้าน และบันทึกการเยี่ยมบ้าน',
      icon: HeartPulse,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      actionText: 'เปิดระบบ OBEC Care & CCT',
      action: () => {
        onNavigateToTab('behavior_sdq');
        onClose();
      },
      statusText: 'พร้อมใช้งานคัดกรอง SDQ & ทุนยากจน',
      isDone: completedSteps.includes(3),
    },
    {
      step: 4,
      code: 'School MIS',
      titleTh: '4. ระบบหลักสูตร แผนการเรียน และเกรด ปพ. (School MIS)',
      descTh: 'สร้างโครงสร้างหลักสูตร กำหนดหน่วยกิต เกณฑ์เวลาเรียน 80% ปพ.5 บันทึกคะแนน และออกใบ ปพ.1 / ปพ.6',
      icon: BookOpen,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      actionText: 'จัดการหลักสูตร & วัดผล',
      action: () => {
        onNavigateToTab('courses');
        onClose();
      },
      statusText: coursesCount > 0 ? `พบข้อมูลหลักสูตร ${coursesCount} รายวิชา` : 'ยังไม่มีวิชาเรียน',
      isDone: coursesCount > 0 || completedSteps.includes(4),
    },
    {
      step: 5,
      code: 'สทศ. & ปพ.3',
      titleTh: '5. ระบบสอบ O-NET (สทศ.) & แบบรายงานผู้สำเร็จการศึกษา (ปพ.3 ออนไลน์)',
      descTh: 'นำเข้ารายชื่อส่งสอบ O-NET ระดับชั้น ป.6, ม.3, ม.6 และจัดทำแบบรายงานผู้สำเร็จการศึกษา ปพ.3 ออนไลน์ ออกใบจบและใบย้าย',
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      actionText: 'เปิดงานทะเบียน ปพ.3 ออนไลน์',
      action: () => {
        onNavigateToTab('gradebook');
        onClose();
      },
      statusText: 'พร้อมจัดทำแบบรายงานผู้จบการศึกษา',
      isDone: completedSteps.includes(5),
    },
  ];

  const officialSystems = [
    {
      name: 'DMC',
      fullNameTh: 'ระบบจัดเก็บข้อมูลนักเรียนรายบุคคล (Data Management Center)',
      desc: 'ฐานข้อมูลทะเบียนนักเรียน สพฐ. ใช้จัดสรรงบประมาณอุดหนุนรายหัว ประกอบด้วยเลข 13 หลัก, ที่อยู่, ผู้ปกครอง และสถานะการศึกษา',
      badge: 'ทะเบียนนักเรียน',
      color: 'bg-blue-600',
    },
    {
      name: 'School MIS',
      fullNameTh: 'ระบบสารสนเทศเพื่อการบริหารการศึกษา (School MIS)',
      desc: 'ระบบงานทะเบียนและวัดผลหลัก ออกเอกสาร ปพ.1 (ระเบียนแสดงผลการเรียน), ปพ.5 (สมุดประจำวิชา), ปพ.6 (รายงานผลการพัฒนา) และใบรับรองผล',
      badge: 'เกรด & ปพ. ต่างๆ',
      color: 'bg-emerald-600',
    },
    {
      name: 'CCT',
      fullNameTh: 'ระบบคัดกรองนักเรียนยากจน (Conditional Cash Transfer)',
      desc: 'เชื่อมโยง กสศ. และ สพฐ. เพื่อคัดกรองนักเรียนกลุ่มยากจนและยากจนพิเศษด้วยคะแนน PMT เพื่อจัดสรรเงินอุดหนุนแบบมีเงื่อนไข',
      badge: 'ทุนนักเรียนยากจน',
      color: 'bg-amber-600',
    },
    {
      name: 'OBEC Care',
      fullNameTh: 'ระบบดูแลช่วยเหลือนักเรียน สพฐ. (OBEC Care)',
      desc: 'การดูแลนักเรียน 5 ขั้นตอน: รู้จักนักเรียนรายบุคคล, คัดกรอง SDQ (ปกติ/เสี่ยง/มีปัญหา), การส่งเสริม, การป้องกันช่วยเหลือ และการส่งต่อ',
      badge: 'ดูแลนักเรียน & SDQ',
      color: 'bg-rose-600',
    },
    {
      name: 'สทศ.',
      fullNameTh: 'ระบบข้อมูลการทดสอบทางการศึกษาระดับชาติ (NIETS O-NET)',
      desc: 'จัดเตรียมรายชื่อและนำเข้าข้อมูลนักเรียนระดับชั้น ป.6, ม.3, ม.6 ที่มีสิทธิ์สอบ O-NET ของสถาบันทดสอบทางการศึกษาแห่งชาติ',
      badge: 'สอบ O-NET ป.6/ม.3/ม.6',
      color: 'bg-indigo-600',
    },
    {
      name: 'HRMS',
      fullNameTh: 'ระบบบริหารงานบุคคลโรงเรียน (Human Resource Management System)',
      desc: 'ฐานข้อมูลข้าราชการครู บุคลากรทางการศึกษา ตำแหน่ง วิทยฐานะ อัตรากำลัง สาระการเรียนรู้ และเลขที่ใบอนุญาตประกอบวิชาชีพ',
      badge: 'บุคลากรโรงเรียน',
      color: 'bg-purple-600',
    },
    {
      name: 'DPA',
      fullNameTh: 'ระบบประเมินวิทยฐานะดิจิทัล (Digital Performance Appraisal)',
      desc: 'ประเมินวิทยฐานะตามเกณฑ์ ว.PA (ก.ค.ศ.) บันทึกข้อตกลง PA 3 ด้าน: การจัดการเรียนรู้, การส่งเสริมสนับสนุน และการพัฒนาตนเอง',
      badge: 'วิทยฐานะ ว.PA',
      color: 'bg-teal-600',
    },
    {
      name: 'ปพ.3 ออนไลน์',
      fullNameTh: 'แบบรายงานผู้สำเร็จการศึกษาตามหลักสูตรแกนกลาง (ปพ.3 ออนไลน์)',
      desc: 'เอกสารสำคัญทางการศึกษาเพื่อรายงานผู้สำเร็จการศึกษา ป.6, ม.3, ม.6 พร้อมเล่มที่ เลขที่ วันที่อนุมัติจบการศึกษา และรหัสสถานศึกษา',
      badge: 'ใบจบรวม ป.6/ม.3/ม.6',
      color: 'bg-orange-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[var(--color-card)] text-[var(--color-text-body)] rounded-3xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  ติวเตอร์แนะนำการเริ่มต้นใช้งานโรงเรียน (School Onboarding Tutor)
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200">
                  สพฐ. / ศธ. มาตรฐาน
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                โรงเรียน: <strong>{activeSchool.nameTh}</strong> ({activeSchool.code}) — ไม่แสดงข้อมูลจำลองโดยอัตโนมัติ เพื่อให้ฐานข้อมูลโรงเรียนของคุณถูกต้องและสะอาด 100%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[var(--color-border)] px-4 sm:px-6 bg-[var(--color-card-subtle)] gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ขั้นตอนเริ่มต้น 5 สเต็ป (Checklist)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold ml-1">
              {completedSteps.length}/5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('systems_reference')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'systems_reference'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Info className="w-4 h-4 text-indigo-600" />
            <span>คู่มือ 8 ระบบการศึกษาไทย (DMC, MIS, CCT, ฯลฯ)</span>
          </button>

        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>ข้อกำหนดการใช้งานสำหรับโรงเรียนจริง:</strong>{' '}
                  ระบบจะไม่ใส่ข้อมูลตัวอย่างนักเรียนหรือครูจากโรงเรียนอื่นเข้ามาปะปน กรุณาดำเนินการตาม 5 ขั้นตอนด้านล่างนี้ โดยท่านสามารถนำเข้าไฟล์ CSV/Excel หรือพิมพ์ข้อมูลลงในระบบโดยตรงได้ทันที
                </div>
              </div>

              <div className="space-y-3">
                {steps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        item.isDone 
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' 
                          : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <button
                          type="button"
                          onClick={() => toggleStep(item.step)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          title="คลิกเพื่อทำเครื่องหมายว่าเสร็จแล้ว"
                        >
                          {item.isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[var(--color-text-title)]">{item.titleTh}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                              {item.code}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">{item.descTh}</p>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${item.isDone ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span>{item.statusText}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={item.action}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition shrink-0"
                      >
                        <span>{item.actionText}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'systems_reference' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--color-text-muted)]">
                EduVerse ออกแบบและเชื่อมโยงข้อมูลตามมาตรฐานระบบงานของกระทรวงศึกษาธิการ (ศธ.) และสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) ดังนี้:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {officialSystems.map((sys) => (
                  <div key={sys.name} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg text-white ${sys.color}`}>
                          {sys.name}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--color-primary-text)]">
                          {sys.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--color-text-title)] mt-2">
                        {sys.fullNameTh}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        {sys.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            ท่านสามารถเปิดติวเตอร์นี้ได้ตลอดเวลาจากปุ่ม <strong>"ติวเตอร์แนะนำระบบ"</strong> บนแถบเมนูด้านบน
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-bold cursor-pointer transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
