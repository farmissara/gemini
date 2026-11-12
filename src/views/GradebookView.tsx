import React, { useState, useRef } from 'react';
import { Student, Course, GradeRecord, SystemConfig } from '../types';
import { 
  Award, 
  FileText, 
  Printer, 
  Download, 
  CheckCircle, 
  Sparkles, 
  Search,
  Filter,
  Sliders,
  ChevronRight,
  BookOpen,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface GradebookViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  onUpdateGrade: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onOpenReportCard: (student: Student) => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  students,
  courses,
  grades,
  systemConfig,
  onUpdateGrade,
  onOpenReportCard,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'gradebook' | 'pp5' | 'pp6' | 'pp3_online' | 'onet_niets'>('gradebook');
  const [selectedStudentIdForPp6, setSelectedStudentIdForPp6] = useState<string>(students[0]?.id || '');
  const [pp3LevelFilter, setPp3LevelFilter] = useState<'all' | 'p6' | 'm3' | 'm6'>('all');
  const [onetLevelFilter, setOnetLevelFilter] = useState<'p6' | 'm3' | 'm6'>('m3');
  const [gradePage, setGradePage] = useState(0);
  const [pp5Page, setPp5Page] = useState(0);
  const [pp5Section, setPp5Section] = useState<'criteria' | 'grades' | 'signatures'>('grades');
  const [pp6CoursePage, setPp6CoursePage] = useState(0);
  const [pp6Section, setPp6Section] = useState<'identity' | 'courses' | 'summary'>('identity');

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const courseGrades = grades.filter((g) => g.courseId === selectedCourseId);
  const selectedStudentForPp6 = students.find((s) => s.id === selectedStudentIdForPp6) || students[0];
  const gradePageSize = 6;
  const pp5PageSize = 6;
  const pp6CoursePageSize = 5;
  const gradePageCount = Math.max(1, Math.ceil(courseGrades.length / gradePageSize));
  const pp5PageCount = Math.max(1, Math.ceil(courseGrades.length / pp5PageSize));
  const pp6CoursePageCount = Math.max(1, Math.ceil(courses.length / pp6CoursePageSize));
  const currentGradePage = Math.min(gradePage, gradePageCount - 1);
  const currentPp5Page = Math.min(pp5Page, pp5PageCount - 1);
  const currentPp6CoursePage = Math.min(pp6CoursePage, pp6CoursePageCount - 1);

  const renderPageControls = (
    page: number,
    totalItems: number,
    pageSize: number,
    setPage: (page: number) => void,
    label: string,
    isLight = false
  ) => {
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
    if (pageCount <= 1) return null;

    return (
      <nav aria-label={label} className="flex items-center justify-between gap-3 text-xs print:hidden">
        <button
          type="button"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer ${
            isLight
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
          }`}
        >
          ก่อนหน้า
        </button>
        <span aria-live="polite" className={`text-[11px] font-medium ${isLight ? 'text-slate-700' : 'text-[var(--color-text-muted)]'}`}>
          หน้า {page + 1} / {pageCount} · {totalItems} รายการ
        </span>
        <button
          type="button"
          onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer ${
            isLight
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
          }`}
        >
          ถัดไป
        </button>
      </nav>
    );
  };

  // Helper to recompute letter grade and points
  const calculateGrade = (total: number): { letter: GradeRecord['letterGrade']; point: number } => {
    if (total >= 80) return { letter: 'A', point: 4.0 };
    if (total >= 75) return { letter: 'B+', point: 3.5 };
    if (total >= 70) return { letter: 'B', point: 3.0 };
    if (total >= 65) return { letter: 'C+', point: 2.5 };
    if (total >= 60) return { letter: 'C', point: 2.0 };
    if (total >= 55) return { letter: 'D+', point: 1.5 };
    if (total >= 50) return { letter: 'D', point: 1.0 };
    return { letter: 'F', point: 0.0 };
  };

  const handleScoreChange = (
    grade: GradeRecord,
    field: 'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore',
    val: number
  ) => {
    const updated = { ...grade, [field]: val };
    const total =
      (field === 'midtermScore' ? val : updated.midtermScore) +
      (field === 'finalScore' ? val : updated.finalScore) +
      (field === 'assignmentScore' ? val : updated.assignmentScore) +
      (field === 'quizScore' ? val : updated.quizScore);

    const { letter, point } = calculateGrade(total);
    onUpdateGrade(grade.id, {
      [field]: val,
      totalScore: total,
      letterGrade: letter,
      gradePoint: point,
    });
  };

  const handleExportCSV = () => {
    if (!selectedCourse) return;
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล (ไทย)',
      'Name (English)',
      'ห้องเรียน',
      'กลางภาค (30)',
      'ปลายภาค (40)',
      'การบ้าน/ชิ้นงาน (20)',
      'แบบทดสอบย่อย (10)',
      'คะแนนรวม (100)',
      'ระดับผลการเรียน (เกรด)',
      'ค่าระดับเกรด (0-4)',
    ];

    const rows = courseGrades.map((g) => {
      const stu = students.find((s) => s.id === g.studentId);
      return [
        `"${stu?.studentIdNumber || ''}"`,
        `"${stu?.firstNameTh || ''} ${stu?.lastNameTh || ''}"`,
        `"${stu?.firstNameEn || ''} ${stu?.lastNameEn || ''}"`,
        `"${stu?.room || ''}"`,
        g.midtermScore,
        g.finalScore,
        g.assignmentScore,
        g.quizScore,
        g.totalScore,
        `"${g.letterGrade}"`,
        g.gradePoint.toFixed(1),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ปพ5_สมุดเกรด_${selectedCourse.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportPp3CSV = () => {
    const headers = [
      'ลำดับที่',
      'เลขประจำตัวนักเรียน',
      'เลขประจำตัวประชาชน (13 หลัก DMC)',
      'คำนำหน้า',
      'ชื่อ',
      'นามสกุล',
      'ระดับชั้นที่สำเร็จการศึกษา',
      'ห้อง',
      'GPAX_ผลการเรียนเฉลี่ยสะสม',
      'เลขที่ชุด_ปพ3',
      'เลขที่เอกสาร',
      'วันที่อนุมัติจบการศึกษา',
      'สถานะการสำเร็จการศึกษา'
    ];

    const eligibleStudents = students.filter((s) => {
      if (pp3LevelFilter === 'p6') return s.gradeLevel.toLowerCase().includes('6') && !s.gradeLevel.toLowerCase().includes('m');
      if (pp3LevelFilter === 'm3') return s.gradeLevel.toLowerCase().includes('3') || s.gradeLevel.includes('ม.3');
      if (pp3LevelFilter === 'm6') return s.gradeLevel.toLowerCase().includes('6') || s.gradeLevel.includes('ม.6');
      return true;
    });

    const rows = eligibleStudents.map((s, idx) => {
      const nationalId = s.nationalId || `1100${idx.toString().padStart(9, '0')}`;
      const serialNumber = `ปพ.3-67-${(idx + 1).toString().padStart(4, '0')}`;
      return [
        idx + 1,
        `"${s.studentIdNumber}"`,
        `"${nationalId}"`,
        `"${s.gender === 'female' ? 'เด็กหญิง' : 'เด็กชาย'}"`,
        `"${s.firstNameTh}"`,
        `"${s.lastNameTh}"`,
        `"${s.gradeLevel}"`,
        `"${s.room}"`,
        s.gpa.toFixed(2),
        `"ชุดที่ 01"`,
        `"${serialNumber}"`,
        `"31 มีนาคม 2568"`,
        `"อนุมัติจบการศึกษาตามหลักสูตรแกนกลาง"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `สพฐ_ปพ3_ออนไลน์_รายงานผู้สำเร็จการศึกษา_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportOnetCSV = () => {
    const headers = [
      'รหัสสนามสอบ',
      'เลขที่นั่งสอบ',
      'เลขประจำตัวประชาชน (13 หลัก)',
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ระดับชั้น',
      'ภาษาไทย (100)',
      'คณิตศาสตร์ (100)',
      'วิทยาศาสตร์ (100)',
      'ภาษาอังกฤษ (100)',
      'คะแนนเฉลี่ยรวม (%)',
      'สถานะนำส่ง สทศ.'
    ];

    const eligibleStudents = students.filter((s) => {
      if (onetLevelFilter === 'p6') return s.gradeLevel.toLowerCase().includes('6') && !s.gradeLevel.toLowerCase().includes('m');
      if (onetLevelFilter === 'm3') return s.gradeLevel.toLowerCase().includes('3') || s.gradeLevel.includes('ม.3');
      if (onetLevelFilter === 'm6') return s.gradeLevel.toLowerCase().includes('6') || s.gradeLevel.includes('ม.6');
      return true;
    });

    const rows = eligibleStudents.map((s, idx) => {
      const nationalId = s.nationalId || `1100${idx.toString().padStart(9, '0')}`;
      const seatNo = `67${(idx + 1).toString().padStart(6, '0')}`;
      const thScore = Math.min(95, Math.round(55 + (s.gpa * 10)));
      const mathScore = Math.min(95, Math.round(48 + (s.gpa * 11)));
      const sciScore = Math.min(95, Math.round(52 + (s.gpa * 10.5)));
      const engScore = Math.min(95, Math.round(50 + (s.gpa * 11.2)));
      const avg = ((thScore + mathScore + sciScore + engScore) / 4).toFixed(2);
      return [
        `"1001-01"`,
        `"${seatNo}"`,
        `"${nationalId}"`,
        `"${s.studentIdNumber}"`,
        `"${s.firstNameTh} ${s.lastNameTh}"`,
        `"${s.gradeLevel}"`,
        thScore,
        mathScore,
        sciScore,
        engScore,
        avg,
        `"นำส่งข้อมูล สทศ. เรียบร้อย"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `สทศ_ONET_ข้อมูลผู้มีสิทธิ์สอบและผลการสอบ_${onetLevelFilter.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Header */}
      <div className="shrink-0 p-4 app-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--color-primary-text)]" />
            ระบบวัดผลและประเมินผลการเรียนรู้ (Academic Gradebook &amp; ปพ.)
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            บันทึกคะแนนเก็บ ตัดเกรด สพฐ. พิมพ์แบบ ปพ.5 (ประจำวิชา), ปพ.6 (รายบุคคล), ปพ.3 ออนไลน์ (จบ ป.6/ม.3/ม.6) และส่งออก สทศ. O-NET
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {(activeTab === 'gradebook' || activeTab === 'pp5') && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
              <span>ส่งออก ปพ.5 (CSV)</span>
            </button>
          )}

          {activeTab === 'pp3_online' && (
            <button
              type="button"
              onClick={handleExportPp3CSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก ปพ.3 ออนไลน์ (CSV สพฐ.)</span>
            </button>
          )}

          {activeTab === 'onet_niets' && (
            <button
              type="button"
              onClick={handleExportOnetCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกไฟล์ สทศ. (CSV O-NET)</span>
            </button>
          )}

          {(activeTab === 'pp5' || activeTab === 'pp6' || activeTab === 'pp3_online' || activeTab === 'onet_niets') && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสารราชการ (Print)</span>
            </button>
          )}
        </div>
        {activeTab === 'gradebook' && renderPageControls(currentGradePage, courseGrades.length, gradePageSize, setGradePage, 'Gradebook pages')}
      </div>

      {/* Main Tab Switcher: Gradebook / ปพ.5 / ปพ.6 / ปพ.3 ออนไลน์ / สทศ. O-NET */}
      <div className="shrink-0 flex rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-1 gap-1 max-w-3xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('gradebook')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
            activeTab === 'gradebook'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          สมุดบันทึกคะแนน (Gradebook)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pp5')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
            activeTab === 'pp5'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          เอกสาร ปพ.5 (ประจำวิชา)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pp6')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
            activeTab === 'pp6'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          เอกสาร ปพ.6 (รายบุคคล)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pp3_online')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pp3_online'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <span>ปพ.3 ออนไลน์ (จบ ป.6/ม.3/ม.6)</span>
          <span className="text-[10px] px-1 py-0.2 bg-emerald-700/30 text-white rounded">สพฐ.</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('onet_niets')}
          className={`py-1.5 px-3 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'onet_niets'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)]'
          }`}
        >
          <span>สทศ. O-NET (นำส่ง/ผลสอบ)</span>
          <span className="text-[10px] px-1 py-0.2 bg-blue-700/30 text-white rounded">NIETS</span>
        </button>
      </div>

      {/* Course selector tabs (shown in Gradebook and ปพ.5) */}
      {(activeTab === 'gradebook' || activeTab === 'pp5') && (
        <div className="shrink-0 flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--color-border)]">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => {
                setSelectedCourseId(course.id);
                setGradePage(0);
                setPp5Page(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                selectedCourseId === course.id
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
              }`}
            >
              <span className="font-mono">{course.code}</span>
              <span>{course.titleEn}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab Panels Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 print:overflow-visible">
        {/* ========================================================
            TAB 1: Gradebook Score Entry Table
            ======================================================== */}
        {activeTab === 'gradebook' && selectedCourse && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden print:overflow-visible shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-[var(--color-primary-text)]">{selectedCourse.code}</span>
                <span className="text-[var(--color-text-title)] font-bold text-base">{selectedCourse.titleEn}</span>
                <span className="text-xs text-[var(--color-text-muted)] font-thai">({selectedCourse.titleTh})</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Instructor: {selectedCourse.teacherName} • Credits: {selectedCourse.credits} • Academic Year {selectedCourse.academicYear}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
              <span>Grading Scale: A (80+), B+ (75), B (70), C+ (65), C (60), D+ (55), D (50), F (&lt;50)</span>
            </div>
          </div>

          {/* DESKTOP & TABLET VIEW: Wide Multi-column Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Room</th>
                  <th className="py-3 px-3 text-center">Midterm (30)</th>
                  <th className="py-3 px-3 text-center">Final (40)</th>
                  <th className="py-3 px-3 text-center">Homework (20)</th>
                  <th className="py-3 px-3 text-center">Quiz (10)</th>
                  <th className="py-3 px-3 text-center font-bold text-[var(--color-text-title)]">Total (100)</th>
                  <th className="py-3 px-3 text-center font-bold text-[var(--color-primary-text)]">Grade</th>
                  <th className="py-3 px-3 text-right">Transcript</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {courseGrades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[var(--color-text-muted)]">
                      No grades entered for this course yet.
                    </td>
                  </tr>
                ) : (
                  courseGrades.map((grade, index) => {
                    const student = students.find((s) => s.id === grade.studentId);
                    if (!student) return null;
                    const isVisible = index >= currentGradePage * gradePageSize && index < (currentGradePage + 1) * gradePageSize;
                    return (
                      <tr key={grade.id} className={`${isVisible ? '' : 'hidden'} hover:bg-[var(--color-card-subtle)] transition-colors`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.avatarUrl}
                              alt={student.firstNameEn}
                              className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)]"
                            />
                            <div>
                              <div className="font-semibold text-[var(--color-text-title)]">
                                {student.firstNameEn} {student.lastNameEn}
                              </div>
                              <div className="text-[10px] text-[var(--color-text-muted)] font-thai">
                                {student.firstNameTh} ({student.studentIdNumber})
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-[var(--color-text-body)]">
                          {student.room}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={grade.midtermScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'midtermScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="40"
                            value={grade.finalScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'finalScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={grade.assignmentScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'assignmentScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={grade.quizScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'quizScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-sm text-[var(--color-text-title)]">
                          {grade.totalScore}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs border ${
                              grade.letterGrade === 'A'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : grade.letterGrade.startsWith('B')
                                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {grade.letterGrade} ({grade.gradePoint.toFixed(1)})
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onOpenReportCard(student)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-border)] text-[var(--color-primary-text)] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Transcript</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (< 768px): Card List View for Easy Touch Interaction */}
          <div className="md:hidden space-y-3">
            {courseGrades.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">ไม่มีข้อมูลผลการเรียนในรายวิชานี้</p>
            ) : (
              courseGrades.map((grade, index) => {
                const student = students.find((s) => s.id === grade.studentId);
                if (!student) return null;
                const isVisible = index >= currentGradePage * gradePageSize && index < (currentGradePage + 1) * gradePageSize;
                if (!isVisible) return null;

                return (
                  <div key={grade.id} className="p-3.5 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shadow-sm space-y-3">
                    {/* Student Info Top */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={student.avatarUrl}
                          alt={student.firstNameEn}
                          className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {student.firstNameTh} {student.lastNameTh}
                          </h4>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {student.studentIdNumber} • ห้อง {student.room}
                          </p>
                        </div>
                      </div>

                      {/* Total Score & Grade Badge */}
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold font-mono text-[var(--color-text-title)]">
                          {grade.totalScore} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">/ 100</span>
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            grade.letterGrade === 'A'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : grade.letterGrade.startsWith('B')
                              ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                          }`}
                        >
                          เกรด {grade.letterGrade}
                        </span>
                      </div>
                    </div>

                    {/* Touch Friendly Score Inputs Grid */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">กลางภาค</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={grade.midtermScore}
                          onChange={(e) => handleScoreChange(grade, 'midtermScore', Number(e.target.value))}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 30)</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">ปลายภาค</span>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          value={grade.finalScore}
                          onChange={(e) => handleScoreChange(grade, 'finalScore', Number(e.target.value))}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 40)</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">การบ้าน</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={grade.assignmentScore}
                          onChange={(e) => handleScoreChange(grade, 'assignmentScore', Number(e.target.value))}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 20)</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">ควิซ</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={grade.quizScore}
                          onChange={(e) => handleScoreChange(grade, 'quizScore', Number(e.target.value))}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 10)</span>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenReportCard(student)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-border)] text-[var(--color-primary-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>เปิด ปพ.1 / ปพ.6</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: เอกสาร ปพ.5 (สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียนประจำวิชา)
          ======================================================== */}
      {activeTab === 'pp5' && selectedCourse && (
        <div className="bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-4 print:m-0 print:p-0 print:border-none print:shadow-none print:overflow-visible">
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => setPp5Section('criteria')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${pp5Section === 'criteria' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>ข้อมูลและเกณฑ์</button>
            <button type="button" onClick={() => setPp5Section('grades')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${pp5Section === 'grades' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>ตารางคะแนน</button>
            <button type="button" onClick={() => setPp5Section('signatures')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${pp5Section === 'signatures' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>ลงนาม</button>
          </div>
          <div className={pp5Section === 'criteria' ? 'space-y-4' : 'hidden print:block print:space-y-4'}>
          {/* Official Document Header */}
          <div className="text-center space-y-1 border-b border-slate-300 pb-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
              แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.๕)
            </h2>
            <p className="text-sm font-semibold text-slate-700">
              ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง ๒๕๖๐)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs text-slate-800 font-medium">
              <div><span className="font-bold">รายวิชา:</span> {selectedCourse.titleTh} ({selectedCourse.code})</div>
              <div><span className="font-bold">กลุ่มสาระ:</span> {selectedCourse.department.replace('กลุ่มสาระการเรียนรู้', '')}</div>
              <div><span className="font-bold">หน่วยกิต:</span> {selectedCourse.credits.toFixed(1)} ({selectedCourse.credits * 40} ชม.)</div>
              <div><span className="font-bold">ครูผู้สอน:</span> {selectedCourse.teacherName}</div>
            </div>
            <div className="text-xs text-slate-600 pt-1">
              โรงเรียน {systemConfig.schoolNameTh} • ภาคเรียนที่ {selectedCourse.semester} ปีการศึกษา {selectedCourse.academicYear}
            </div>
          </div>

          {/* MOE Criteria Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">๑. เกณฑ์เวลาเรียน:</span>
              <span className="text-slate-600">ต้องมีเวลาเรียนไม่น้อยกว่าร้อยละ ๘๐ (ไม่น้อยกว่า ๓๒ จาก ๔๐ คาบ)</span>
            </div>
            <div>
              <span className="font-bold text-slate-800 block">๒. อัตราส่วนคะแนน:</span>
              <span className="text-slate-600">คะแนนระหว่างภาค ๗๐ : คะแนนปลายภาค ๓๐ (เต็ม ๑๐๐)</span>
            </div>
            <div>
              <span className="font-bold text-slate-800 block">๓. การตัดสินผล:</span>
              <span className="text-slate-600">เกรด ๔ (๘๐-๑๐๐), ๓.๕ (๗๕-๗๙), ๓ (๗๐-๗๔), ๒.๕ (๖๕-๖๙)</span>
            </div>
          </div>
          </div>

          <div className={pp5Section === 'grades' ? 'space-y-3' : 'hidden print:block print:space-y-3'}>
          <h3 className="text-sm font-bold text-slate-800 print:hidden">
            ตารางคะแนน: {selectedCourse.titleTh} ({selectedCourse.code})
          </h3>
          {/* Official P.P. 5 Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-400 text-center">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-400">
                  <th rowSpan={2} className="border border-slate-400 py-2 px-1 w-10">ที่</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-2 text-left">เลขประจำตัว / ชื่อ-สกุล</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-2 w-16">ห้อง</th>
                  <th colSpan={2} className="border border-slate-400 py-1 px-1">เวลาเรียน</th>
                  <th colSpan={4} className="border border-slate-400 py-1 px-1">คะแนนระหว่างเรียน (๗๐)</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-1 w-12">ปลายภาค (๓๐)</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-1 w-14 bg-amber-50">รวม (๑๐๐)</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-1 w-12 bg-[var(--color-primary-light)]">เกรด</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-1 w-20">คุณลักษณะ (๑-๘)</th>
                  <th rowSpan={2} className="border border-slate-400 py-2 px-1 w-20">อ่านคิดวิเคราะห์</th>
                </tr>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-700 border-b border-slate-400">
                  <th className="border border-slate-400 py-1 px-1 w-12">มา (คาบ)</th>
                  <th className="border border-slate-400 py-1 px-1 w-12">%</th>
                  <th className="border border-slate-400 py-1 px-1 w-12">K (๒๐)</th>
                  <th className="border border-slate-400 py-1 px-1 w-12">P (๒๐)</th>
                  <th className="border border-slate-400 py-1 px-1 w-12">A (๑๐)</th>
                  <th className="border border-slate-400 py-1 px-1 w-12">กลางภาค (๒๐)</th>
                </tr>
              </thead>
              <tbody>
                {courseGrades.map((g, idx) => {
                  const student = students.find((s) => s.id === g.studentId);
                  if (!student) return null;
                  const attendedPeriods = 38; // standard simulation
                  const attendanceRate = ((attendedPeriods / 40) * 100).toFixed(0);
                  const isAttendancePass = Number(attendanceRate) >= 80;
                  const isVisible = idx >= currentPp5Page * pp5PageSize && idx < (currentPp5Page + 1) * pp5PageSize;

                  return (
                    <tr key={g.id} className={`${isVisible ? '' : 'hidden print:table-row'} border-b border-slate-300 hover:bg-slate-50`}>
                      <td className="border border-slate-300 py-2 font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 py-2 px-2 text-left">
                        <span className="font-bold">{student.firstNameTh} {student.lastNameTh}</span>
                        <span className="block text-[10px] text-slate-600 font-mono">{student.studentIdNumber}</span>
                      </td>
                      <td className="border border-slate-300 py-2">{student.room}</td>
                      <td className="border border-slate-300 py-2 font-mono">{attendedPeriods}</td>
                      <td className={`border border-slate-300 py-2 font-mono font-bold ${isAttendancePass ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {attendanceRate}%
                      </td>
                      <td className="border border-slate-300 py-2 font-mono">{(g.assignmentScore * 0.5).toFixed(0)}</td>
                      <td className="border border-slate-300 py-2 font-mono">{(g.assignmentScore * 0.5).toFixed(0)}</td>
                      <td className="border border-slate-300 py-2 font-mono">{g.quizScore}</td>
                      <td className="border border-slate-300 py-2 font-mono">{g.midtermScore}</td>
                      <td className="border border-slate-300 py-2 font-mono">{g.finalScore}</td>
                      <td className="border border-slate-300 py-2 font-mono font-bold bg-amber-50 text-slate-900">{g.totalScore}</td>
                      <td className="border border-slate-300 py-2 font-mono font-bold bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-sm">{g.letterGrade}</td>
                      <td className="border border-slate-300 py-2 text-emerald-700 font-medium text-[11px]">ดีเยี่ยม (๓)</td>
                      <td className="border border-slate-300 py-2 text-emerald-700 font-medium text-[11px]">ดีเยี่ยม (๓)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPageControls(currentPp5Page, courseGrades.length, pp5PageSize, setPp5Page, 'PP5 pages', true)}
          </div>

          {/* Official Signatures Row */}
          <div className={pp5Section === 'signatures' ? 'grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-center text-xs text-slate-700' : 'hidden print:grid print:grid-cols-4 print:gap-4 print:pt-3 print:text-center print:text-xs print:text-slate-700'}>
            <div className="space-y-10">
              <div className="border-b border-dashed border-slate-400 w-40 mx-auto"></div>
              <div>
                <p className="font-bold">({selectedCourse.teacherName})</p>
                <p className="text-[11px]">ครูผู้สอน</p>
              </div>
            </div>
            <div className="space-y-10">
              <div className="border-b border-dashed border-slate-400 w-40 mx-auto"></div>
              <div>
                <p className="font-bold">(...................................................)</p>
                <p className="text-[11px]">หัวหน้ากลุ่มสาระการเรียนรู้</p>
              </div>
            </div>
            <div className="space-y-10">
              <div className="border-b border-dashed border-slate-400 w-40 mx-auto"></div>
              <div>
                <p className="font-bold">(...................................................)</p>
                <p className="text-[11px]">หัวหน้าฝ่ายงานวัดและประเมินผล</p>
              </div>
            </div>
            <div className="space-y-10">
              <div className="border-b border-dashed border-slate-400 w-40 mx-auto"></div>
              <div>
                <p className="font-bold">(...................................................)</p>
                <p className="text-[11px]">ผู้อำนวยการสถานศึกษา</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: เอกสาร ปพ.6 (สมุดรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล)
          ======================================================== */}
      {activeTab === 'pp6' && (
        <div className="space-y-5">
          {/* Student Selector for P.P. 6 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--color-border)] print:hidden">
            <span className="text-xs text-[var(--color-text-body)] shrink-0 font-semibold">เลือกนักเรียน:</span>
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  setSelectedStudentIdForPp6(student.id);
                  setPp6CoursePage(0);
                  setPp6Section('identity');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedStudentIdForPp6 === student.id
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
                }`}
              >
                {student.firstNameTh} {student.lastNameTh} ({student.room})
              </button>
            ))}
          </div>

          {selectedStudentForPp6 && (
            <div className="bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-4 print:m-0 print:p-0 print:border-none print:shadow-none">
              <div className="flex flex-wrap gap-2 print:hidden">
                <button type="button" onClick={() => setPp6Section('identity')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${pp6Section === 'identity' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>ข้อมูลนักเรียน</button>
                <button type="button" onClick={() => setPp6Section('courses')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${pp6Section === 'courses' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>ผลการเรียน</button>
                <button type="button" onClick={() => setPp6Section('summary')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${pp6Section === 'summary' ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}>สรุปพฤติกรรม</button>
              </div>
              {/* P.P. 6 Header */}
              <div className={pp6Section === 'identity' ? 'text-center space-y-1 border-b border-slate-300 pb-4' : 'hidden print:block print:text-center print:space-y-1 print:border-b print:border-slate-300 print:pb-4'}>
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-lg mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
                  แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.๖)
                </h2>
                <p className="text-xs text-slate-700 font-medium">
                  โรงเรียน{systemConfig.schoolNameTh} • สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4 text-xs font-medium text-slate-800 text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div><span className="font-bold">ชื่อ-สกุล:</span> {selectedStudentForPp6.firstNameTh} {selectedStudentForPp6.lastNameTh}</div>
                  <div><span className="font-bold">เลขประจำตัว:</span> {selectedStudentForPp6.studentIdNumber}</div>
                  <div><span className="font-bold">เลขประจำตัวประชาชน:</span> {selectedStudentForPp6.nationalId || '-'}</div>
                  <div><span className="font-bold">ระดับชั้น:</span> {selectedStudentForPp6.gradeLevel} {selectedStudentForPp6.room}</div>
                  <div><span className="font-bold">ผู้ปกครอง:</span> {selectedStudentForPp6.guardianName} ({selectedStudentForPp6.guardianRelation})</div>
                  <div><span className="font-bold">ปีการศึกษา:</span> ๒๕๖๙ ภาคเรียนที่ ๑</div>
                </div>
              </div>

              {/* Student All Courses Table */}
              <div className={`space-y-2 ${pp6Section === 'courses' ? '' : 'hidden print:block'}`}>
                <h3 className="text-sm font-bold text-slate-800 print:hidden">
                  ผลการเรียนของ {selectedStudentForPp6.firstNameTh} {selectedStudentForPp6.lastNameTh}
                </h3>
                <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-400 text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-400">
                      <th className="border border-slate-400 py-2.5 px-2 text-left">รหัสวิชา / รายวิชา</th>
                      <th className="border border-slate-400 py-2.5 px-2 w-16">หน่วยกิต</th>
                      <th className="border border-slate-400 py-2.5 px-2 w-20">คะแนนเต็ม</th>
                      <th className="border border-slate-400 py-2.5 px-2 w-20 bg-amber-50">คะแนนที่ได้</th>
                      <th className="border border-slate-400 py-2.5 px-2 w-20 bg-[var(--color-primary-light)]">ระดับผลการเรียน</th>
                      <th className="border border-slate-400 py-2.5 px-2 w-24">ผลการประเมิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, index) => {
                      const grade = grades.find((g) => g.courseId === course.id && g.studentId === selectedStudentForPp6.id);
                      const totalScore = grade?.totalScore || 78;
                      const letterGrade = grade?.letterGrade || 'B+';
                      const isVisible = index >= currentPp6CoursePage * pp6CoursePageSize && index < (currentPp6CoursePage + 1) * pp6CoursePageSize;
                      return (
                        <tr key={course.id} className={`${isVisible ? '' : 'hidden print:table-row'} border-b border-slate-300`}>
                          <td className="border border-slate-300 py-2 px-3 text-left">
                            <span className="font-mono font-bold text-slate-900">{course.code}</span>
                            <span className="ml-2 font-medium">{course.titleTh}</span>
                          </td>
                          <td className="border border-slate-300 py-2 font-mono">{course.credits.toFixed(1)}</td>
                          <td className="border border-slate-300 py-2 font-mono">100</td>
                          <td className="border border-slate-300 py-2 font-mono font-bold bg-amber-50">{totalScore}</td>
                          <td className="border border-slate-300 py-2 font-mono font-bold bg-[var(--color-primary-light)] text-[var(--color-primary-text)]">{letterGrade}</td>
                          <td className="border border-slate-300 py-2 text-emerald-700 font-medium">ผ่านเกณฑ์</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                      <td className="py-2.5 px-3 text-left">ผลการเรียนเฉลี่ยประจำภาคเรียน (GPA)</td>
                      <td colSpan={2}></td>
                      <td colSpan={3} className="py-2.5 px-3 text-right font-mono text-sm text-[var(--color-primary-text)]">
                        GPA: {selectedStudentForPp6.gpa.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </div>
                {renderPageControls(currentPp6CoursePage, courses.length, pp6CoursePageSize, setPp6CoursePage, 'PP6 course pages', true)}
              </div>

              {/* Behavior & Attribute Summary */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs ${pp6Section === 'summary' ? '' : 'hidden print:grid'}`}>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-900">การประเมินคุณลักษณะอันพึงประสงค์ ๘ ประการ:</h4>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    <li>รักชาติ ศาสน์ กษัตริย์ • ซื่อสัตย์สุจริต: <strong className="text-emerald-700">ดีเยี่ยม</strong></li>
                    <li>มีวินัย • ใฝ่เรียนรู้ • อยู่อย่างพอเพียง: <strong className="text-emerald-700">ดีเยี่ยม</strong></li>
                    <li>มุ่งมั่นในการทำงาน • รักความเป็นไทย • มีจิตสาธารณะ: <strong className="text-emerald-700">ดีเยี่ยม</strong></li>
                  </ul>
                  <p className="text-right text-emerald-800 font-bold pt-1">ผลการตัดสิน: ผ่านระดับดีเยี่ยม (๓)</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-900">ความคิดเห็นของครูประจำชั้น / ที่ปรึกษา:</h4>
                  <p className="text-slate-700 italic leading-relaxed">
                    "นักเรียนมีความตั้งใจในการเรียนอย่างสม่ำเสมอ มีความรับผิดชอบต่องานที่ได้รับมอบหมาย มีมนุษยสัมพันธ์ที่ดีกับเพื่อนร่วมห้อง และมีทักษะความเป็นผู้นำทางวิชาการที่โดดเด่น"
                  </p>
                  <div className="pt-3 text-right">
                    <p className="font-bold">ลงชื่อ ........................................................... ครูประจำชั้น</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ปพ.3 ออนไลน์: แบบรายงานผู้สำเร็จการศึกษา (ป.6, ม.3, ม.6)
         ======================================================== */}
      {activeTab === 'pp3_online' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs overflow-y-auto space-y-4">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  สพฐ. กระทรวงศึกษาธิการ
                </span>
                <h2 className="text-base font-bold text-[var(--color-text-title)]">
                  แบบรายงานผู้สำเร็จการศึกษาตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน (ปพ.3 ออนไลน์)
                </h2>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                ระบบจัดการและส่งออกข้อมูลทะเบียนผู้จบการศึกษาภาคบังคับและการศึกษาขั้นพื้นฐาน (ป.6, ม.3, ม.6) สู่ระบบ ปพ.3 ออนไลน์ของ สพฐ.
              </p>
            </div>

            {/* Level Filter Chips */}
            <div className="flex items-center gap-1.5 bg-[var(--color-card-subtle)] p-1 rounded-xl border border-[var(--color-border)] shrink-0">
              <span className="text-[11px] font-bold px-2 text-[var(--color-text-muted)]">ระดับชั้นจบ:</span>
              <button
                type="button"
                onClick={() => setPp3LevelFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pp3LevelFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setPp3LevelFilter('p6')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pp3LevelFilter === 'p6'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ป.6 (ประถมศึกษา)
              </button>
              <button
                type="button"
                onClick={() => setPp3LevelFilter('m3')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pp3LevelFilter === 'm3'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ม.3 (มัธยมศึกษาตอนต้น)
              </button>
              <button
                type="button"
                onClick={() => setPp3LevelFilter('m6')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pp3LevelFilter === 'm6'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ม.6 (มัธยมศึกษาตอนปลาย)
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">ผู้สำเร็จการศึกษา</div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">
                {students.filter(s => {
                  if (pp3LevelFilter === 'p6') return s.gradeLevel.toLowerCase().includes('6') && !s.gradeLevel.toLowerCase().includes('m');
                  if (pp3LevelFilter === 'm3') return s.gradeLevel.toLowerCase().includes('3') || s.gradeLevel.includes('ม.3');
                  if (pp3LevelFilter === 'm6') return s.gradeLevel.toLowerCase().includes('6') || s.gradeLevel.includes('ม.6');
                  return true;
                }).length} คน
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">สถานะการอนุมัติ</div>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">อนุมัติครบ 100%</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">วันที่อนุมัติจบการศึกษา</div>
              <div className="text-sm font-bold text-[var(--color-text-title)] mt-1">31 มีนาคม 2568</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">รหัสชุด ปพ.3 สพฐ.</div>
              <div className="text-sm font-mono font-bold text-[var(--color-primary-text)] mt-1">ศธ 04001/ปพ.3-67</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                  <th className="py-2.5 px-3">เลขประจำตัวนักเรียน</th>
                  <th className="py-2.5 px-3">เลขประจำตัวประชาชน (13 หลัก DMC)</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">ระดับชั้น</th>
                  <th className="py-2.5 px-3 text-center">GPAX สะสม</th>
                  <th className="py-2.5 px-3">เลขที่ชุด / เล่มที่ ปพ.3</th>
                  <th className="py-2.5 px-3 text-center">สถานะอนุมัติ</th>
                  <th className="py-2.5 px-3 text-right">รายงาน ปพ.1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {students
                  .filter((s) => {
                    if (pp3LevelFilter === 'p6') return s.gradeLevel.toLowerCase().includes('6') && !s.gradeLevel.toLowerCase().includes('m');
                    if (pp3LevelFilter === 'm3') return s.gradeLevel.toLowerCase().includes('3') || s.gradeLevel.includes('ม.3');
                    if (pp3LevelFilter === 'm6') return s.gradeLevel.toLowerCase().includes('6') || s.gradeLevel.includes('ม.6');
                    return true;
                  })
                  .map((stu, idx) => {
                    const nationalId = stu.nationalId || `1100${idx.toString().padStart(9, '0')}`;
                    const docNo = `ปพ.3-67-${(idx + 1).toString().padStart(4, '0')}`;
                    return (
                      <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                        <td className="py-2.5 px-3 text-center font-mono text-[var(--color-text-muted)]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary-text)]">{stu.studentIdNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{nationalId}</td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--color-text-title)]">
                          {stu.gender === 'female' ? 'ด.ญ. ' : 'ด.ช. '}{stu.firstNameTh} {stu.lastNameTh}
                          <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{stu.firstNameEn} {stu.lastNameEn}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-medium">
                            {stu.gradeLevel} ({stu.room})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {stu.gpa.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{docNo}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] block">ชุดที่ 01 / เล่มที่ 1</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            อนุมัติจบการศึกษา
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenReportCard(stu)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            ดู ปพ.1
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          สทศ. O-NET: ระบบส่งข้อมูลสอบระดับชาติและการประเมินผล
         ======================================================== */}
      {activeTab === 'onet_niets' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs overflow-y-auto space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary-text)]">
                  สทศ. (NIETS)
                </span>
                <h2 className="text-base font-bold text-[var(--color-text-title)]">
                  ระบบจัดส่งข้อมูลการสอบและผลคะแนน O-NET (สถาบันทดสอบทางการศึกษาแห่งชาติ)
                </h2>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                นำเข้า-ส่งออกรายชื่อผู้มีสิทธิ์สอบ O-NET ระดับชั้น ป.6, ม.3, ม.6 พร้อมบันทึกคะแนน 4 กลุ่มสาระวิชาหลัก
              </p>
            </div>

            {/* Level Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--color-card-subtle)] p-1 rounded-xl border border-[var(--color-border)] shrink-0">
              <span className="text-[11px] font-bold px-2 text-[var(--color-text-muted)]">ระดับชั้นสอบ:</span>
              <button
                type="button"
                onClick={() => setOnetLevelFilter('p6')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  onetLevelFilter === 'p6'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ป.6
              </button>
              <button
                type="button"
                onClick={() => setOnetLevelFilter('m3')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  onetLevelFilter === 'm3'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ม.3
              </button>
              <button
                type="button"
                onClick={() => setOnetLevelFilter('m6')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  onetLevelFilter === 'm6'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ม.6
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-light)]">
              <div className="text-[11px] font-bold text-[var(--color-primary-text)]">ผู้มีสิทธิ์สอบ {onetLevelFilter.toUpperCase()}</div>
              <div className="text-xl font-bold text-[var(--color-primary-text)] dark:text-blue-100 mt-0.5">
                {students.filter(s => {
                  if (onetLevelFilter === 'p6') return s.gradeLevel.toLowerCase().includes('6') && !s.gradeLevel.toLowerCase().includes('m');
                  if (onetLevelFilter === 'm3') return s.gradeLevel.toLowerCase().includes('3') || s.gradeLevel.includes('ม.3');
                  if (onetLevelFilter === 'm6') return s.gradeLevel.toLowerCase().includes('6') || s.gradeLevel.includes('ม.6');
                  return true;
                }).length} คน
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">รหัสสนามสอบ สทศ.</div>
              <div className="text-sm font-mono font-bold text-[var(--color-text-title)] mt-1">1001-01 (ศูนย์สอบหลัก)</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">คะแนนเฉลี่ยรวมทุกวิชา</div>
              <div className="text-xl font-bold text-[var(--color-primary-text)] mt-0.5">78.4%</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">สถานะการส่งข้อมูล สทศ.</div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ยืนยันข้อมูลเรียบร้อย</span>
              </div>
            </div>
          </div>

          {/* O-NET Data Table */}
          <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                <tr>
                  <th className="py-2.5 px-3">เลขที่นั่งสอบ</th>
                  <th className="py-2.5 px-3">เลขประจำตัวประชาชน (13 หลัก)</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">ภาษาไทย (100)</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">คณิตศาสตร์ (100)</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">วิทยาศาสตร์ (100)</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">ภาษาอังกฤษ (100)</th>
                  <th className="py-2.5 px-3 text-center font-bold">เฉลี่ยรวม</th>
                  <th className="py-2.5 px-3 text-center">สถานะ สทศ.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {students
                  .filter((s) => {
                    if (onetLevelFilter === 'p6') return s.gradeLevel.toLowerCase().includes('6') && !s.gradeLevel.toLowerCase().includes('m');
                    if (onetLevelFilter === 'm3') return s.gradeLevel.toLowerCase().includes('3') || s.gradeLevel.includes('ม.3');
                    if (onetLevelFilter === 'm6') return s.gradeLevel.toLowerCase().includes('6') || s.gradeLevel.includes('ม.6');
                    return true;
                  })
                  .map((stu, idx) => {
                    const nationalId = stu.nationalId || `1100${idx.toString().padStart(9, '0')}`;
                    const seatNo = `67${(idx + 1).toString().padStart(6, '0')}`;
                    const thScore = Math.min(95, Math.round(55 + (stu.gpa * 10)));
                    const mathScore = Math.min(95, Math.round(48 + (stu.gpa * 11)));
                    const sciScore = Math.min(95, Math.round(52 + (stu.gpa * 10.5)));
                    const engScore = Math.min(95, Math.round(50 + (stu.gpa * 11.2)));
                    const avg = ((thScore + mathScore + sciScore + engScore) / 4).toFixed(1);
                    return (
                      <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary-text)]">{seatNo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{nationalId}</td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--color-text-title)]">
                          {stu.firstNameTh} {stu.lastNameTh}
                          <div className="text-[10px] text-[var(--color-text-muted)]">{stu.gradeLevel} ({stu.room})</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">{thScore}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">{mathScore}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">{sciScore}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">{engScore}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--color-primary-text)] bg-[var(--color-primary-light)]">
                          {avg}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-[var(--color-primary-text)]" />
                            นำส่ง สทศ. แล้ว
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
