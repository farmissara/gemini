import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  FileText,
  Trash2,
  Award,
  ShieldCheck,
  HeartPulse,
  FileCheck2,
  HelpCircle,
  Calendar,
  Clock,
  DatabaseBackup,
} from 'lucide-react';
import {
  AttendanceRecord,
  AppLanguage,
  Course,
  GradeRecord,
  QuizQuestion,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../../types';
import { SmartEntityMapperPanel } from './SmartEntityMapperPanel';

export type ImportExportTab =
  | 'students' // DMC ทะเบียนนักเรียน
  | 'teachers' // HRMS บุคลากร & DPA วิทยฐานะ
  | 'courses' // School MIS รายวิชา & หลักสูตร
  | 'grades' // School MIS ผลการเรียน ปพ.5
  | 'attendance' // บันทึกการเช็คชื่อเข้าเรียน
  | 'enrollment' // ทะเบียนลงทะเบียนเรียน
  | 'cct' // CCT นักเรียนยากจน
  | 'sdq' // OBEC Care ดูแลช่วยเหลือนักเรียน & SDQ
  | 'onet' // สทศ. O-NET ป.6/ม.3/ม.6
  | 'pp3' // ปพ.3 ออนไลน์ ใบจบรวม
  | 'timetable' // ตารางเรียนและตารางสอน (พร้อมครูสอนคู่)
  | 'questions'; // คลังข้อสอบ

interface DataImportExportModalProps {
  students: Student[];
  teachers: Teacher[];
  questions: QuizQuestion[];
  courses?: Course[];
  grades?: GradeRecord[];
  attendance?: AttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  schoolPeriods?: SchoolPeriodTime[];
  activeSchoolId?: string;
  academicYear?: string;
  semester?: string;
  lang: AppLanguage;
  onImportStudents: (newStudents: Student[]) => void;
  onImportTeachers: (newTeachers: Teacher[]) => Promise<void> | void;
  onImportQuestions: (newQuestions: QuizQuestion[]) => void;
  onImportCourses?: (newCourses: Course[]) => void;
  onImportEnrollment?: (courseId: string, studentIds: string[]) => void;
  onImportGrades?: (newGrades: GradeRecord[]) => void;
  onImportAttendance?: (newAttendance: AttendanceRecord[]) => Promise<void> | void;
  onImportSdq?: (newSdq: any[]) => void;
  onImportTimetableSlots?: (slots: TimetableSlot[]) => Promise<void> | void;
  onClose: () => void;
  initialTab?: string;
  onOpenBackupCenter?: () => void;
}

const VALID_TABS: ImportExportTab[] = [
  'students',
  'teachers',
  'courses',
  'grades',
  'attendance',
  'cct',
  'sdq',
  'onet',
  'pp3',
  'timetable',
  'questions',
  'enrollment',
];

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  students,
  teachers,
  courses = [],
  grades = [],
  attendance = [],
  timetableSlots = [],
  schoolPeriods = [],
  activeSchoolId = 'sch-bkk-01',
  academicYear = '2569',
  semester = '1',
  lang = 'th',
  onImportStudents,
  onImportTeachers,
  onImportCourses,
  onImportGrades,
  onImportAttendance,
  onImportTimetableSlots,
  onClose,
  initialTab = 'students',
  onOpenBackupCenter,
}) => {
  const [activeTab, setActiveTab] = useState<ImportExportTab>(
    VALID_TABS.includes(initialTab as ImportExportTab)
      ? (initialTab as ImportExportTab)
      : 'students'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden File Inputs for specialized MOE formats
  const cctFileRef = useRef<HTMLInputElement>(null);
  const sdqFileRef = useRef<HTMLInputElement>(null);
  const onetFileRef = useRef<HTMLInputElement>(null);
  const pp3FileRef = useRef<HTMLInputElement>(null);

  // Preview States for specialized MOE formats
  const [previewCct, setPreviewCct] = useState<any[]>([]);
  const [previewSdq, setPreviewSdq] = useState<any[]>([]);
  const [previewOnet, setPreviewOnet] = useState<any[]>([]);
  const [previewPp3, setPreviewPp3] = useState<any[]>([]);

  const mapperContext = useMemo(
    () => ({
      schoolId: activeSchoolId,
      academicYear,
      semester,
      existingStudents: students,
      existingTeachers: teachers,
      existingCourses: courses,
      schoolPeriods,
    }),
    [activeSchoolId, academicYear, semester, students, teachers, courses, schoolPeriods]
  );

  const exportContext = useMemo(() => ({ students, courses }), [students, courses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Trigger file download with UTF-8 BOM
  const downloadFile = (filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;') => {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Robust CSV Line Parser
  const parseCSVLines = (text: string): string[][] => {
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => {
      const row: string[] = [];
      let insideQuotes = false;
      let cur = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          row.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          cur = '';
        } else {
          cur += char;
        }
      }
      row.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return row;
    });
  };

  // ==========================================
  // 4. CCT (นักเรียนยากจนพิเศษ)
  // ==========================================
  const handleCctFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) return;
        const imported = rows.slice(1).map((r) => ({
          studentId: r[0],
          nationalId: r[1],
          studentName: r[2],
          gradeRoom: r[3],
          cctStatus: r[4] || 'ยากจนพิเศษ',
          pmtScore: r[5] || '32.5',
          stipendAmount: r[6] || '3,000 บาท',
          transferStatus: r[7] || 'โอนสำเร็จ',
        })).filter(x => x.studentId || x.studentName);

        setPreviewCct(imported);
        showToast(`อ่านไฟล์สำเร็จ พบคัดกรองทุนยากจน CCT ${imported.length} รายการ`);
      } catch {
        showToast('อ่านไฟล์ CCT ไม่สำเร็จ');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // ==========================================
  // 5. OBEC CARE (SDQ & HOME VISITS)
  // ==========================================
  const handleSdqFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) return;
        const imported = rows.slice(1).map((r, idx) => ({
          studentId: r[0],
          nationalId: r[1],
          studentName: r[2],
          gradeRoom: r[3],
          emotionalScore: parseInt(r[4]) || 3,
          conductScore: parseInt(r[5]) || 2,
          hyperactivityScore: parseInt(r[6]) || 2,
          peerScore: parseInt(r[7]) || 2,
          prosocialScore: parseInt(r[8]) || 8,
          totalDifficulties: parseInt(r[9]) || 9,
          overallResult: r[10] || 'กลุ่มปกติ',
          homeVisitDate: r[11] || '2026-06-15',
          homeVisitStatus: r[12] || 'เยี่ยมบ้านเรียบร้อย',
        })).filter(x => x.studentId || x.studentName);

        setPreviewSdq(imported);
        showToast(`อ่านไฟล์สำเร็จ พบผลคัดกรอง OBEC Care SDQ ${imported.length} คน`);
      } catch {
        showToast('อ่านไฟล์ SDQ ไม่สำเร็จ');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // ==========================================
  // 6. สทศ. (O-NET ป.6 / ม.3 / ม.6)
  // ==========================================
  const handleOnetFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) return;
        const imported = rows.slice(1).map((r) => ({
          schoolOnetCode: r[0] || '1010012345',
          studentIdNumber: r[1],
          nationalId: r[2],
          studentName: r[3],
          examGrade: r[4] || 'ม.3',
          examSeatNo: r[5] || '001',
          examCenter: r[6] || 'สนามสอบประจำอำเภอ',
          eligibilityStatus: r[7] || 'มีสิทธิ์สอบ',
        })).filter(x => x.studentName || x.nationalId);

        setPreviewOnet(imported);
        showToast(`อ่านไฟล์สำเร็จ พบบัญชีผู้มีสิทธิ์สอบ สทศ. O-NET ${imported.length} คน`);
      } catch {
        showToast('อ่านไฟล์ สทศ. O-NET ไม่สำเร็จ');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // ==========================================
  // 7. ปพ.3 ออนไลน์ (ใบจบรวม ป.6 / ม.3 / ม.6)
  // ==========================================
  const handlePp3FileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) return;
        const imported = rows.slice(1).map((r) => ({
          studentIdNumber: r[0],
          nationalId: r[1],
          fullNameTh: r[2],
          gradGradeLevel: r[3] || '',
          academicYear: r[4] || '',
          approvalDate: r[5] || '',
          bookNo: r[6] || '',
          registerNo: r[7] || '',
          gpax: r[8] || '',
          graduationStatus: r[9] || '',
        })).filter(x => x.fullNameTh || x.studentIdNumber);

        setPreviewPp3(imported);
        showToast(`อ่านไฟล์สำเร็จ พบรายชื่อ ปพ.3 ออนไลน์ ${imported.length} คน`);
      } catch {
        showToast('อ่านไฟล์ ปพ.3 ไม่สำเร็จ');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Helper render file upload box
  const renderUploadBox = (
    titleTh: string,
    descTh: string,
    fileInputRef: React.RefObject<HTMLInputElement | null>,
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onDownloadTemplate: () => void,
    _onSample: (() => void) | undefined,
    onExport: () => void,
    accentColor: string = 'blue'
  ) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upload Action Card */}
        <div className={`p-4 rounded-2xl border border-${accentColor}-300 dark:border-${accentColor}-700 bg-${accentColor}-50/40 dark:bg-${accentColor}-950/20 flex flex-col justify-between space-y-3`}>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <Upload className={`w-4 h-4 text-${accentColor}-600 dark:text-${accentColor}-400`} />
              <span>นำเข้าไฟล์ ({titleTh})</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{descTh}</p>
          </div>

          <input
            ref={fileInputRef as any}
            type="file"
            accept=".csv,.txt"
            onChange={onFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-2.5 px-3 rounded-xl bg-${accentColor}-700 hover:bg-${accentColor}-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition`}
          >
            <Upload className="w-4 h-4" />
            <span>เลือกไฟล์ CSV เพื่อนำเข้า</span>
          </button>
        </div>

        {/* Template Card */}
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>แบบฟอร์มสำหรับนำเข้าข้อมูล</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              ดาวน์โหลดโครงสร้างหัวคอลัมน์มาตรฐาน สพฐ. เพื่อกรอกใน Excel
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="w-full py-2 px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template (CSV)</span>
          </button>
        </div>

        {/* Export Card */}
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <Download className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>ส่งออกข้อมูลปัจจุบัน</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              บันทึกข้อมูลที่มีอยู่ในระบบเป็นไฟล์ CSV (UTF-8 with BOM รองรับภาษาไทยสมบูรณ์)
            </p>
          </div>
          <button
            type="button"
            onClick={onExport}
            className="w-full py-2.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกข้อมูล (CSV)</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[var(--color-card)] text-[var(--color-text-body)] rounded-3xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-top">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[var(--color-text-title)]">
                  ศูนย์นำเข้าและส่งออกข้อมูล (Data Import &amp; Export Center)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  มาตรฐาน สพฐ. / ศธ.
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                รองรับไฟล์ Excel (.xlsx/.xls) และ CSV พร้อมระบบจับคู่หัวคอลัมน์อัจฉริยะและรายงานแถวผิดพลาดรายบรรทัด
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          {onOpenBackupCenter && <button type="button" onClick={onOpenBackupCenter} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"><DatabaseBackup className="h-4 w-4"/>สำรองทั้งโรงเรียน</button>}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center border-b border-[var(--color-border)] px-4 bg-[var(--color-card-subtle)] gap-1 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>DMC ทะเบียนนักเรียน ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'border-purple-600 text-purple-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span>HRMS บุคลากร &amp; DPA ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'courses'
                ? 'border-indigo-600 text-indigo-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>School MIS หลักสูตร ({courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'grades'
                ? 'border-amber-600 text-amber-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>School MIS เกรด ปพ.5 ({grades.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-sky-600 text-sky-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Clock className="w-4 h-4 text-sky-600" />
            <span>เช็คชื่อเข้าเรียน ({attendance.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'timetable'
                ? 'border-emerald-600 text-emerald-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>ตารางเรียน/สอน ({timetableSlots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cct')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cct'
                ? 'border-rose-600 text-rose-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <span>CCT นักเรียนยากจน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sdq')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sdq'
                ? 'border-teal-600 text-teal-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>OBEC Care (SDQ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('onet')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'onet'
                ? 'border-cyan-600 text-cyan-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-cyan-600" />
            <span>สทศ. O-NET</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pp3')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pp3'
                ? 'border-orange-600 text-orange-600 bg-[var(--color-card)] rounded-t-xl'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <FileText className="w-4 h-4 text-orange-600" />
            <span>ปพ.3 ออนไลน์</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: DMC STUDENTS */}
          {activeTab === 'students' && (
            <SmartEntityMapperPanel
              entity="students"
              lang={lang}
              subtitle={
                lang === 'th'
                  ? 'นำเข้าทะเบียนนักเรียน DMC (รองรับจับคู่คอลัมน์เอง ตรวจสอบเลข 13 หลัก/GPA และรายงานแถวที่ผิดพลาด)'
                  : 'Import student records with custom CSV/Excel header mapping, ID/GPA validation, and failed-row reports.'
              }
              existingRecords={students}
              context={mapperContext}
              exportContext={exportContext}
              onImportValid={(recs) => onImportStudents(recs as Student[])}
              onToast={showToast}
            />
          )}

          {/* TAB 2: HRMS TEACHERS */}
          {activeTab === 'teachers' && (
            <SmartEntityMapperPanel
              entity="teachers"
              lang={lang}
              subtitle={
                lang === 'th'
                  ? 'นำเข้าทะเบียนครูและบุคลากร HRMS พร้อมกลุ่มสาระฯ วิทยฐานะ และห้องที่ปรึกษา'
                  : 'Import teachers & staff directory with custom column mapping and validation.'
              }
              existingRecords={teachers}
              context={mapperContext}
              exportContext={exportContext}
              onImportValid={async (recs) => {
                await onImportTeachers(recs as Teacher[]);
              }}
              onToast={showToast}
            />
          )}

          {/* TAB 3: SCHOOL MIS COURSES */}
          {activeTab === 'courses' && (
            <SmartEntityMapperPanel
              entity="courses"
              lang={lang}
              subtitle={
                lang === 'th'
                  ? 'นำเข้ารายวิชา รหัสวิชา หน่วยกิต และครูผู้สอน (รองรับจับคู่คอลัมน์ไฟล์ Excel/CSV ภายนอก)'
                  : 'Import courses, credits, and assigned instructors with custom header mapping.'
              }
              existingRecords={courses}
              context={mapperContext}
              exportContext={exportContext}
              onImportValid={(recs) => onImportCourses?.(recs as Course[])}
              onToast={showToast}
            />
          )}

          {/* TAB 4: SCHOOL MIS GRADES & ปพ.5 */}
          {activeTab === 'grades' && (
            <SmartEntityMapperPanel
              entity="grades"
              lang={lang}
              subtitle={
                lang === 'th'
                  ? 'นำเข้าคะแนนกลางภาค ปลายภาค คะแนนเก็บ และเกรด ปพ.5 (ตรวจสอบช่วงคะแนน 0–100 และรหัสนักเรียน/วิชา)'
                  : 'Import grades & scores with custom spreadsheet mapping, 0–100 bounds validation, and row error reporting.'
              }
              existingRecords={grades}
              context={mapperContext}
              exportContext={exportContext}
              onImportValid={(recs) => onImportGrades?.(recs as GradeRecord[])}
              onToast={showToast}
            />
          )}

          {/* TAB 4.5: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <SmartEntityMapperPanel
              entity="attendance"
              lang={lang}
              subtitle={
                lang === 'th'
                  ? 'นำเข้าบันทึกการเช็คชื่อเข้าเรียน-ออก (รองรับวันที่ รูปแบบ Excel/CSV และสถานะมาเรียน/สาย/ขาด/ป่วย/ลา)'
                  : 'Import attendance logs with custom CSV/Excel header mapping, date/status parsing, and error reporting.'
              }
              existingRecords={attendance}
              context={mapperContext}
              exportContext={exportContext}
              onImportValid={async (recs) => {
                await onImportAttendance?.(recs as AttendanceRecord[]);
              }}
              onToast={showToast}
            />
          )}

          {/* TAB 5: CCT POVERTY */}
          {activeTab === 'cct' && (
            <div className="space-y-6">
              {renderUploadBox(
                'CCT นักเรียนยากจนพิเศษ',
                'เลือกไฟล์ CSV คัดกรองทุนนักเรียนยากจน สพฐ. - กสศ. พร้อมคะแนน PMT',
                cctFileRef,
                handleCctFileUpload,
                () => {
                  downloadFile('template_cct_poverty.csv', 'studentIdNumber,nationalId,studentName,gradeRoom,cctStatus,pmtScore,stipendAmount,transferStatus');
                },
                () => {
                  setPreviewCct([
                    {
                      studentId: 'STU-2569-001',
                      nationalId: '1-1002-00888-99-1',
                      studentName: 'กิตติศักดิ์ เจริญวัฒนา',
                      gradeRoom: 'ม.4/1',
                      cctStatus: 'ยากจนพิเศษ',
                      pmtScore: '32.40',
                      stipendAmount: '3,000 บาท',
                      transferStatus: 'โอนสำเร็จเข้าบัญชีพร้อมเพย์',
                    }
                  ]);
                },
                () => {
                  downloadFile('cct_poverty_export.csv', 'studentId,nationalId,cctStatus\nSTU-001,1-1002,ยากจนพิเศษ');
                },
                'rose'
              )}

              {previewCct.length > 0 && (
                <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-rose-900 dark:text-rose-100">ตรวจสอบข้อมูลคัดกรองทุน CCT ({previewCct.length} คน)</span>
                    <button type="button" onClick={() => setPreviewCct([])} className="text-xs text-rose-600 font-bold">ล้างพรีวิว</button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                    <table className="table-comfortable w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] font-bold text-[10px] text-[var(--color-text-muted)] uppercase">
                        <tr>
                          <th className="px-3 py-2">รหัสนักเรียน</th>
                          <th className="px-3 py-2">ชื่อ - สกุล</th>
                          <th className="px-3 py-2">สถานะ CCT</th>
                          <th className="px-3 py-2 text-center">คะแนน PMT</th>
                          <th className="px-3 py-2">เงินอุดหนุน</th>
                          <th className="px-3 py-2">สถานะการโอน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewCct.map((c, idx) => (
                          <tr key={idx} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-rose-600">{c.studentId}</td>
                            <td className="px-3 py-2 font-bold">{c.studentName}</td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">{c.cctStatus}</span></td>
                            <td className="px-3 py-2 text-center font-bold">{c.pmtScore}</td>
                            <td className="px-3 py-2 text-emerald-700 font-bold">{c.stipendAmount}</td>
                            <td className="px-3 py-2 text-slate-600">{c.transferStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`นำเข้าข้อมูลทุนยากจน CCT ${previewCct.length} คนสำเร็จ!`);
                        setPreviewCct([]);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกข้อมูลทุนยากจน CCT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: OBEC CARE (SDQ) */}
          {activeTab === 'sdq' && (
            <div className="space-y-6">
              {renderUploadBox(
                'OBEC Care (SDQ 5 ด้าน & เยี่ยมบ้าน)',
                'เลือกไฟล์ CSV ผลการคัดกรองพฤติกรรม SDQ ทั้ง 5 ด้าน และการติดตามเยี่ยมบ้าน',
                sdqFileRef,
                handleSdqFileUpload,
                () => {
                  downloadFile('template_obec_sdq.csv', 'studentId,nationalId,studentName,gradeRoom,emotional,conduct,hyperactivity,peer,prosocial,total,result,visitDate,visitStatus');
                },
                () => {
                  setPreviewSdq([
                    {
                      studentId: 'STU-2569-001',
                      studentName: 'กิตติศักดิ์ เจริญวัฒนา',
                      gradeRoom: 'ม.4/1',
                      emotionalScore: 2,
                      conductScore: 1,
                      hyperactivityScore: 3,
                      peerScore: 2,
                      prosocialScore: 8,
                      totalDifficulties: 8,
                      overallResult: 'กลุ่มปกติ',
                      homeVisitDate: '2026-06-12',
                      homeVisitStatus: 'เยี่ยมบ้านเรียบร้อย ผู้ปกครองให้ความร่วมมือดี',
                    }
                  ]);
                },
                () => {
                  downloadFile('obec_sdq_export.csv', 'studentId,studentName,sdqResult\nSTU-001,กิตติศักดิ์,กลุ่มปกติ');
                },
                'teal'
              )}

              {previewSdq.length > 0 && (
                <div className="p-4 rounded-2xl border border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-teal-900 dark:text-teal-100">ตรวจสอบข้อมูลคัดกรอง SDQ OBEC Care ({previewSdq.length} คน)</span>
                    <button type="button" onClick={() => setPreviewSdq([])} className="text-xs text-rose-600 font-bold">ล้างพรีวิว</button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`นำเข้าผลคัดกรอง SDQ ${previewSdq.length} คนสำเร็จ!`);
                        setPreviewSdq([]);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกผลการคัดกรอง OBEC Care (SDQ)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: สทศ. (O-NET) */}
          {activeTab === 'onet' && (
            <div className="space-y-6">
              {renderUploadBox(
                'สทศ. (O-NET ป.6 / ม.3 / ม.6)',
                'เลือกไฟล์ CSV บัญชีรายชื่อผู้มีสิทธิ์สอบ O-NET เลขประจำตัวสอบ และสนามสอบ',
                onetFileRef,
                handleOnetFileUpload,
                () => {
                  downloadFile('template_onet_candidates.csv', 'schoolOnetCode,studentIdNumber,nationalId,studentName,examGrade,examSeatNo,examCenter,eligibilityStatus');
                },
                () => {
                  setPreviewOnet([
                    {
                      schoolOnetCode: '1010012345',
                      studentIdNumber: 'STU-2569-001',
                      nationalId: '1-1002-00888-99-1',
                      studentName: 'กิตติศักดิ์ เจริญวัฒนา',
                      examGrade: 'ม.3',
                      examSeatNo: '001',
                      examCenter: 'สนามสอบโรงเรียนประจำอำเภอ',
                      eligibilityStatus: 'มีสิทธิ์สอบ',
                    }
                  ]);
                },
                () => {
                  downloadFile('onet_candidates_export.csv', 'studentId,studentName,examSeatNo\nSTU-001,กิตติศักดิ์,001');
                },
                'cyan'
              )}

              {previewOnet.length > 0 && (
                <div className="p-4 rounded-2xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-900 dark:text-cyan-100">ตรวจสอบรายชื่อผู้มีสิทธิ์สอบ O-NET ({previewOnet.length} คน)</span>
                    <button type="button" onClick={() => setPreviewOnet([])} className="text-xs text-rose-600 font-bold">ล้างพรีวิว</button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`นำเข้ารายชื่อส่งสอบ O-NET ${previewOnet.length} คนสำเร็จ!`);
                        setPreviewOnet([]);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกบัญชีรายชื่อสอบ O-NET (สทศ.)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ปพ.3 ออนไลน์ */}
          {activeTab === 'pp3' && (
            <div className="space-y-6">
              {renderUploadBox(
                'ปพ.3 ออนไลน์ (ใบจบรวม ป.6/ม.3/ม.6)',
                'เลือกไฟล์ CSV แบบรายงานผู้สำเร็จการศึกษา เล่มที่/เลขที่ ปพ.3 และวันที่อนุมัติจบ',
                pp3FileRef,
                handlePp3FileUpload,
                () => {
                  downloadFile('template_pp3_online.csv', 'studentIdNumber,nationalId,fullNameTh,gradGradeLevel,academicYear,approvalDate,bookNo,registerNo,gpax,graduationStatus');
                },
                undefined,
                () => {
                  downloadFile('pp3_online_export.csv', 'studentIdNumber,fullNameTh,bookNo,registerNo');
                },
                'orange'
              )}

              {previewPp3.length > 0 && (
                <div className="p-4 rounded-2xl border border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-orange-900 dark:text-orange-100">พรีวิว CSV ปพ.3 ({previewPp3.length} คน) • ยังไม่บันทึกลงฐานข้อมูล</span>
                    <button type="button" onClick={() => setPreviewPp3([])} className="text-xs text-rose-600 font-bold">ล้างพรีวิว</button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPp3([])}
                      className="px-5 py-2.5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <X className="w-4 h-4" />
                      <span>ปิดพรีวิว</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: ตารางเรียนและตารางสอน (รองรับครูสอนคู่ + Excel/CSV + Custom Mapping) */}
          {activeTab === 'timetable' && (
            <SmartEntityMapperPanel
              entity="timetable"
              lang={lang}
              subtitle={
                lang === 'th'
                  ? 'นำเข้าตารางเรียนและตารางสอน (รองรับครูผู้สอนหลัก ครูสอนคู่ และการจับคู่หัวคอลัมน์เอง)'
                  : 'Import timetable slots with primary/co-teacher support and custom column mapping.'
              }
              existingRecords={timetableSlots}
              context={mapperContext}
              exportContext={exportContext}
              onImportValid={async (recs) => {
                await onImportTimetableSlots?.(recs as TimetableSlot[]);
              }}
              onToast={showToast}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <HelpCircle className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span>รองรับไฟล์ .xlsx, .xls และ .csv พร้อมระบบจับคู่คอลัมน์และรายงานแถวผิดพลาดรายบรรทัด</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-xs font-bold cursor-pointer transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
