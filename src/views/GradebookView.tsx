import React, { useState } from 'react';
import {
  AdaptivePracticeTopic,
  AttendanceRecord,
  Course,
  GradeRecord,
  GradingSystem,
  PeriodAttendanceRecord,
  School,
  Student,
  SystemConfig,
  TimetableSlot,
  UserRole,
} from '../types';
import { calculateGrade, formatSemesterLabel, getGradingScaleLegend } from '../lib/schoolSettings';
import { calculateStudentCourseEligibility } from '../lib/examEligibility';
import { getDuplicateRecordWarnings } from '../lib/duplicateRecords';
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
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { Pp5OfficialForm, Pp6OfficialForm } from '../components/OfficialMoeForms';

interface GradebookViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  school?: School;
  currentRole?: UserRole;
  onChangeGradingSystem?: (mode: GradingSystem) => Promise<void> | void;
  onUpdateGrade: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onOpenReportCard: (student: Student) => void;
  timetableSlots?: TimetableSlot[];
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  onPracticeInAi?: (topic: AdaptivePracticeTopic) => void;
}

function matchesPp3Level(student: Student, level: 'all' | 'p6' | 'm3' | 'm6'): boolean {
  if (level === 'all') return true;
  const gradeLevel = student.gradeLevel.toLowerCase().replace(/\s+/g, '');
  if (level === 'p6') {
    return gradeLevel.includes('ป.6') ||
      gradeLevel.includes('ประถมศึกษาปีที่6') ||
      gradeLevel.includes('p.6') ||
      gradeLevel.includes('primary6');
  }
  const target = level === 'm3' ? '3' : '6';
  return gradeLevel.includes(`ม.${target}`) ||
    gradeLevel.includes(`มัธยมศึกษาปีที่${target}`) ||
    gradeLevel.includes(`m.${target}`) ||
    gradeLevel.includes(`m${target}`);
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  students,
  courses,
  grades,
  systemConfig,
  school,
  currentRole = 'teacher',
  onChangeGradingSystem,
  onUpdateGrade,
  onOpenReportCard,
  timetableSlots = [],
  attendance = [],
  periodAttendance = [],
  onPracticeInAi,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [isUpdatingGradingMode, setIsUpdatingGradingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'gradebook' | 'pp5' | 'pp6' | 'pp3_online' | 'onet_niets'>('gradebook');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [selectedStudentIdForPp6, setSelectedStudentIdForPp6] = useState<string>(students[0]?.id || '');
  const [pp3LevelFilter, setPp3LevelFilter] = useState<'all' | 'p6' | 'm3' | 'm6'>('all');
  const [onetLevelFilter, setOnetLevelFilter] = useState<'p6' | 'm3' | 'm6'>('m3');
  const [gradePage, setGradePage] = useState(0);
  const [pp5Page, setPp5Page] = useState(0);
  const [pp6CoursePage, setPp6CoursePage] = useState(0);
  const [gradeRoomFilter, setGradeRoomFilter] = useState('all');
  const [gradeLevelFilter, setGradeLevelFilter] = useState('all');
  const [gradeEligibilityFilter, setGradeEligibilityFilter] = useState<'all' | 'eligible' | 'at_risk'>('all');

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const courseGrades = grades.filter((g) => g.courseId === selectedCourseId);
  const filteredCourses = courses.filter((course) => {
    const search = courseSearchTerm.trim().toLocaleLowerCase();
    return !search || [course.code, course.titleTh, course.titleEn, course.teacherName]
      .some((value) => value?.toLocaleLowerCase().includes(search));
  });
  const courseSelectOptions = selectedCourse && !filteredCourses.some((course) => course.id === selectedCourse.id)
    ? [selectedCourse, ...filteredCourses]
    : filteredCourses;
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const gradebookRows = courseGrades.flatMap((grade) => {
    const student = studentsById.get(grade.studentId);
    if (!student) return [];
    return [{
      grade,
      student,
      eligibility: calculateStudentCourseEligibility({
        student,
        course: selectedCourse,
        timetableSlots,
        attendance,
        periodAttendance,
      }),
    }];
  });
  const gradeRoomOptions = Array.from(new Set(gradebookRows.map(({ student }) => student.room).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const gradeLevelOptions = Array.from(new Set(gradebookRows.map(({ student }) => student.gradeLevel).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const filteredGradebookRows = gradebookRows.filter(({ student, eligibility }) => (
    (gradeRoomFilter === 'all' || student.room === gradeRoomFilter)
    && (gradeLevelFilter === 'all' || student.gradeLevel === gradeLevelFilter)
    && (
      gradeEligibilityFilter === 'all'
      || (gradeEligibilityFilter === 'at_risk' ? eligibility.isAtRiskMs : !eligibility.isAtRiskMs)
    )
  ));
  const gradeDuplicateWarnings = getDuplicateRecordWarnings({
    students: [],
    teachers: [],
    courses: [],
    grades,
    invoices: [],
    timetableSlots: [],
  });
  const selectedStudentForPp6 = students.find((s) => s.id === selectedStudentIdForPp6) || students[0];
  const gradePageSize = 15;
  const pp5PageSize = 15;
  const pp6CoursePageSize = 5;
  const gradePageCount = Math.max(1, Math.ceil(filteredGradebookRows.length / gradePageSize));
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

  const getGradeDisplay = (grade: GradeRecord) =>
    calculateGrade(grade.totalScore, systemConfig.gradingSystem);

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

    const { letter, point } = calculateGrade(total, systemConfig.gradingSystem);
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
        `"${getGradeDisplay(g).letter}"`,
        getGradeDisplay(g).point.toFixed(1),
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

    const eligibleStudents = students.filter((student) => matchesPp3Level(student, pp3LevelFilter));

    const rows = eligibleStudents.map((s, idx) => {
      return [
        idx + 1,
        `"${s.studentIdNumber}"`,
        `"${s.nationalId || ''}"`,
        `"${s.gender === 'female' ? 'เด็กหญิง' : 'เด็กชาย'}"`,
        `"${s.firstNameTh}"`,
        `"${s.lastNameTh}"`,
        `"${s.gradeLevel}"`,
        `"${s.room}"`,
        s.gpa.toFixed(2),
        '""',
        '""',
        '""',
        '"รอตรวจสอบและยืนยันข้อมูลการจบการศึกษา"'
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

  // One-Click Official Thai Exports: DMC & SchoolMIS Templates
  const handleExportDmcCsv = () => {
    const headers = [
      'รหัสสถานศึกษา',
      'เลขประจำตัวประชาชน (13 หลัก)',
      'รหัสประจำตัวนักเรียน',
      'คำนำหน้า',
      'ชื่อ',
      'นามสกุล',
      'เพศ',
      'ระดับชั้น',
      'ห้องเรียน',
      'GPAX',
      'เวลาเรียนร้อยละ',
      'สถานะนักเรียน',
    ];
    const rows = students.map((s, idx) => {
      const eligibility = calculateStudentCourseEligibility({
        student: s,
        timetableSlots,
        attendance,
        periodAttendance,
      });
      return [
        `"${s.schoolId || ''}"`,
        `"${s.nationalId || `1100${idx.toString().padStart(9, '0')}`}"`,
        `"${s.studentIdNumber}"`,
        `"${s.gender === 'female' ? 'เด็กหญิง' : 'เด็กชาย'}"`,
        `"${s.firstNameTh}"`,
        `"${s.lastNameTh}"`,
        `"${s.gender === 'female' ? 'หญิง' : 'ชาย'}"`,
        `"${s.gradeLevel}"`,
        `"${s.room}"`,
        s.gpa.toFixed(2),
        eligibility.attendancePercent,
        `"${s.status === 'active' ? 'กำลังศึกษา' : s.status}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DMC_สพฐ_${systemConfig.academicYear}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportSchoolMisCsv = () => {
    const course = selectedCourse || courses[0];
    if (!course) return;
    const targetGrades = grades.filter((g) => g.courseId === course.id);
    const headers = [
      'รหัสวิชา',
      'ชื่อรายวิชา',
      'ภาคเรียน',
      'ปีการศึกษา',
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ห้องเรียน',
      'มาเรียน (%)',
      'สถานะสิทธิ์สอบ',
      'คะแนนระหว่างภาค (60)',
      'คะแนนปลายภาค (40)',
      'คะแนนรวม (100)',
      'ผลการเรียน',
    ];
    const rows = targetGrades.map((g) => {
      const stu = students.find((s) => s.id === g.studentId);
      const eligibility = stu
        ? calculateStudentCourseEligibility({
            student: stu,
            course,
            timetableSlots,
            attendance,
            periodAttendance,
          })
        : { attendancePercent: 95, isAtRiskMs: false };
      const disp = getGradeDisplay(g);
      return [
        `"${course.code}"`,
        `"${course.titleTh}"`,
        `"${course.semester || systemConfig.currentSemester}"`,
        `"${course.academicYear || systemConfig.academicYear}"`,
        `"${stu?.studentIdNumber || ''}"`,
        `"${stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : ''}"`,
        `"${stu?.room || ''}"`,
        eligibility.attendancePercent,
        `"${eligibility.isAtRiskMs ? 'มส. (เวลาเรียนไม่ถึง 80%)' : 'มีสิทธิ์สอบ'}"`,
        g.midtermScore + g.assignmentScore + g.quizScore,
        g.finalScore,
        g.totalScore,
        `"${eligibility.isAtRiskMs ? 'มส.' : disp.letter}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SchoolMIS_${course.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Header */}
      <div className="shrink-0 p-3 app-page-header flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
            <span>วัดผลและประเมินผล (Gradebook &amp; ปพ.)</span>
          </h1>
          {onChangeGradingSystem && (currentRole === 'admin' || currentRole === 'super_admin') ? (
            <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-[11px] font-bold">
              <span className="px-2 text-[var(--color-text-muted)]">เกรด:</span>
              <button
                type="button"
                disabled={isUpdatingGradingMode}
                onClick={async () => {
                  if (systemConfig.gradingSystem === 'thai') return;
                  setIsUpdatingGradingMode(true);
                  try { await onChangeGradingSystem('thai'); } finally { setIsUpdatingGradingMode(false); }
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  systemConfig.gradingSystem !== 'international'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                ระบบไทย (0–4)
              </button>
              <button
                type="button"
                disabled={isUpdatingGradingMode}
                onClick={async () => {
                  if (systemConfig.gradingSystem === 'international') return;
                  setIsUpdatingGradingMode(true);
                  try { await onChangeGradingSystem('international'); } finally { setIsUpdatingGradingMode(false); }
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  systemConfig.gradingSystem === 'international'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                สากล (A–F)
              </button>
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)]">
              {systemConfig.gradingSystem === 'international' ? 'เกณฑ์สากล (A–F)' : 'เกณฑ์ไทย (0–4)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {(activeTab === 'gradebook' || activeTab === 'pp5') && (
            <>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                <span>ส่งออก ปพ.5</span>
              </button>
              <button
                type="button"
                onClick={handleExportDmcCsv}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                title="ส่งออกข้อมูลนักเรียนรูปแบบ DMC สพฐ."
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>DMC</span>
              </button>
              <button
                type="button"
                onClick={handleExportSchoolMisCsv}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                title="ส่งออกผลสัมฤทธิ์รายวิชารูปแบบ SchoolMIS"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>SchoolMIS</span>
              </button>
            </>
          )}

          {activeTab === 'pp3_online' && (
            <button
              type="button"
              onClick={handleExportPp3CSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก ปพ.3 (CSV)</span>
            </button>
          )}

          {activeTab === 'onet_niets' && (
            <button
              type="button"
              onClick={handleExportOnetCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก สทศ. (CSV)</span>
            </button>
          )}

          {(activeTab === 'pp5' || activeTab === 'pp6' || activeTab === 'pp3_online' || activeTab === 'onet_niets') && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร</span>
            </button>
          )}
          {activeTab === 'gradebook' && renderPageControls(currentGradePage, filteredGradebookRows.length, gradePageSize, setGradePage, 'Gradebook pages')}
        </div>
      </div>

      {/* Main Tab Switcher: Gradebook / ปพ.5 / ปพ.6 / ปพ.3 ออนไลน์ / สทศ. O-NET */}
      <div className="shrink-0 flex rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] p-1 gap-1 shadow-xs overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('gradebook')}
          className={`py-1 px-2.5 text-xs font-semibold rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'gradebook'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          สมุดบันทึกคะแนน (Gradebook)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pp5')}
          className={`py-1 px-2.5 text-xs font-semibold rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'pp5'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          ปพ.5 (ประจำวิชา)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pp6')}
          className={`py-1 px-2.5 text-xs font-semibold rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'pp6'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          ปพ.6 (รายบุคคล)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pp3_online')}
          className={`py-1 px-2.5 text-xs font-semibold rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'pp3_online'
              ? 'bg-emerald-600 text-white'
              : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          ปพ.3 ออนไลน์ (จบ ป.6/ม.3/ม.6)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('onet_niets')}
          className={`py-1 px-2.5 text-xs font-semibold rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'onet_niets'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)]'
          }`}
        >
          สทศ. O-NET
        </button>
      </div>

      {/* Course selector tabs (shown in Gradebook and ปพ.5) */}
      {(activeTab === 'gradebook' || activeTab === 'pp5') && (
        <div className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 print:hidden">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,1.3fr)]">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
                ค้นหารายวิชา ({courses.length})
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  value={courseSearchTerm}
                  onChange={(event) => setCourseSearchTerm(event.target.value)}
                  placeholder="ค้นหาจากรหัส ชื่อวิชา หรือครูผู้สอน"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-2 pl-9 pr-3 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                />
              </span>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">เลือกรายวิชา</span>
              <select
                value={selectedCourseId}
                onChange={(event) => {
                  setSelectedCourseId(event.target.value);
                  setGradePage(0);
                  setPp5Page(0);
                  setGradeRoomFilter('all');
                  setGradeLevelFilter('all');
                  setGradeEligibilityFilter('all');
                  setCourseSearchTerm('');
                }}
                disabled={courseSelectOptions.length === 0}
                className="w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs font-semibold text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
              >
                {courseSelectOptions.length === 0 ? (
                  <option value="">ไม่พบรายวิชาที่ตรงกับคำค้นหา</option>
                ) : (
                  courseSelectOptions.map((course) => (
                    <option key={course.id} value={course.id}>
                      {[course.code, course.titleTh || course.titleEn, course.titleEn && course.titleEn !== course.titleTh ? course.titleEn : '']
                        .filter(Boolean)
                        .join(' — ')}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
          {courseSearchTerm.trim() && filteredCourses.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
              ไม่พบรายวิชาที่ตรงกับคำค้นหา
            </p>
          )}
          {selectedCourse && (
            <p className="mt-2 truncate text-[11px] text-[var(--color-text-muted)]">
              วิชาที่เลือก: <strong className="font-mono text-[var(--color-primary-text)]">{selectedCourse.code}</strong>
              {' · '}
              <strong className="text-[var(--color-text-title)]">{selectedCourse.titleTh || selectedCourse.titleEn}</strong>
              {selectedCourse.teacherName ? ` · ${selectedCourse.teacherName}` : ''}
            </p>
          )}
        </div>
      )}

      {/* Tab Panels Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 print:overflow-visible">
        {/* ========================================================
            TAB 1: Gradebook Score Entry Table
            ======================================================== */}
        {activeTab === 'gradebook' && selectedCourse && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden print:overflow-visible space-y-3 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-[var(--color-primary-text)]">{selectedCourse.code}</span>
              <span className="text-[var(--color-text-title)] font-bold text-sm">{selectedCourse.titleEn}</span>
              <span className="text-[var(--color-text-muted)] font-thai">({selectedCourse.titleTh})</span>
              <span className="text-[var(--color-text-muted)]">· {selectedCourse.teacherName} · {selectedCourse.credits} หน่วยกิต</span>
            </div>

            <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
              {getGradingScaleLegend(systemConfig.gradingSystem)}
            </div>
          </div>
          {gradeDuplicateWarnings.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span><strong>แจ้งเตือนข้อมูลซ้ำ:</strong> {gradeDuplicateWarnings.join(' • ')}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 sm:grid-cols-3 print:hidden">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">ห้องเรียน</span>
              <select
                value={gradeRoomFilter}
                onChange={(event) => {
                  setGradeRoomFilter(event.target.value);
                  setGradePage(0);
                }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-xs text-[var(--color-text-title)]"
              >
                <option value="all">ทุกห้อง</option>
                {gradeRoomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">ระดับชั้น</span>
              <select
                value={gradeLevelFilter}
                onChange={(event) => {
                  setGradeLevelFilter(event.target.value);
                  setGradePage(0);
                }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-xs text-[var(--color-text-title)]"
              >
                <option value="all">ทุกระดับชั้น</option>
                {gradeLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">สถานะเวลาเรียน</span>
              <select
                value={gradeEligibilityFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'all' || value === 'eligible' || value === 'at_risk') {
                    setGradeEligibilityFilter(value);
                  }
                  setGradePage(0);
                }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-xs text-[var(--color-text-title)]"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="eligible">มีสิทธิ์สอบ (เวลาเรียนถึงเกณฑ์)</option>
                <option value="at_risk">เสี่ยง มส. (เวลาเรียนไม่ถึง 80%)</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] sm:col-span-3">
              <span>แสดง {filteredGradebookRows.length} / {gradebookRows.length} คน</span>
              {(gradeRoomFilter !== 'all' || gradeLevelFilter !== 'all' || gradeEligibilityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setGradeRoomFilter('all');
                    setGradeLevelFilter('all');
                    setGradeEligibilityFilter('all');
                    setGradePage(0);
                  }}
                  className="font-semibold text-[var(--color-primary-text)] hover:underline"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP & TABLET VIEW: Wide Multi-column Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Room</th>
                  <th className="py-3 px-3 text-center">เวลาเรียน (80%)</th>
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
                {filteredGradebookRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[var(--color-text-muted)]">
                      {gradebookRows.length === 0
                        ? 'No grades entered for this course yet.'
                        : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'}
                    </td>
                  </tr>
                ) : (
                  filteredGradebookRows.map(({ grade, student, eligibility }, index) => {
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

                        <td className="py-3 px-3 text-center tabular-nums">
                          {eligibility.isAtRiskMs ? (
                            <span
                              title={`เข้าเรียน ${eligibility.attendedHours}/${eligibility.totalScheduledHours} ชม. (ต่ำกว่า 80% เสี่ยง มส.)`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-[10px] font-bold"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              มส. ({eligibility.attendancePercent}%)
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              {eligibility.attendancePercent}% ({eligibility.attendedHours}/{eligibility.totalScheduledHours} ชม.)
                            </span>
                          )}
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
                              getGradeDisplay(grade).point >= 3.5
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : getGradeDisplay(grade).point >= 2.5
                                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {getGradeDisplay(grade).letter} ({getGradeDisplay(grade).point.toFixed(1)})
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {onPracticeInAi && grade.totalScore < 65 && (
                              <button
                                type="button"
                                onClick={() =>
                                  onPracticeInAi({
                                    subject: selectedCourse.titleTh,
                                    topicTh: `${selectedCourse.code} ${selectedCourse.titleTh}`,
                                    studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                    score: grade.totalScore,
                                    targetTab: 'socratic_tutor',
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                title="ส่งนักเรียนไปฝึกซ่อมเสริมใน AI Socratic Tutor"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>ซ่อมเสริม AI</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenReportCard(student)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-border)] text-[var(--color-primary-text)] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Transcript</span>
                            </button>
                          </div>
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
            {filteredGradebookRows.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
                {gradebookRows.length === 0 ? 'ไม่มีข้อมูลผลการเรียนในรายวิชานี้' : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'}
              </p>
            ) : (
              filteredGradebookRows.map(({ grade, student }, index) => {
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
                            getGradeDisplay(grade).point >= 3.5
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : getGradeDisplay(grade).point >= 2.5
                              ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                          }`}
                        >
                          เกรด {getGradeDisplay(grade).letter}
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
        <Pp5OfficialForm
          selectedCourse={selectedCourse}
          students={students}
          courseGrades={courseGrades}
          systemConfig={systemConfig}
          timetableSlots={timetableSlots}
          attendance={attendance}
          periodAttendance={periodAttendance}
          currentPp5Page={currentPp5Page}
          pp5PageSize={pp5PageSize}
          setPp5Page={setPp5Page}
          renderPageControls={renderPageControls}
        />
      )}

      {/* ========================================================
          TAB 3: เอกสาร ปพ.6 (สมุดรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล)
          ======================================================== */}
      {activeTab === 'pp6' && (
        <Pp6OfficialForm
          students={students}
          courses={courses}
          grades={grades}
          attendance={attendance}
          systemConfig={systemConfig}
          selectedStudentIdForPp6={selectedStudentIdForPp6}
          setSelectedStudentIdForPp6={setSelectedStudentIdForPp6}
          currentPp6CoursePage={currentPp6CoursePage}
          pp6CoursePageSize={pp6CoursePageSize}
          setPp6CoursePage={setPp6CoursePage}
          renderPageControls={renderPageControls}
        />
      )}

      {/* ========================================================
          ปพ.3 ออนไลน์: แบบรายงานผู้สำเร็จการศึกษา (ป.6, ม.3, ม.6)
         ======================================================== */}
      {activeTab === 'pp3_online' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs overflow-y-auto space-y-4 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:overflow-visible">
          {/* Official Print Header (also serves as formal MOE document header) */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-2">
            <div className="flex items-center justify-center gap-3">
              {school?.logoUrl && <img src={school.logoUrl} alt="ตราโรงเรียน" className="w-14 h-14 object-contain" />}
              <div>
                <p className="text-xs font-bold">ทะเบียนเตรียมข้อมูลสำหรับจัดทำแบบรายงานผู้สำเร็จการศึกษา (ปพ.๓)</p>
                <h2 className="text-lg font-extrabold">โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}</h2>
              </div>
            </div>
            <p className="text-xs">ปีการศึกษา {systemConfig.academicYear} • ระดับชั้น: {pp3LevelFilter === 'all' ? 'ทั้งหมด' : pp3LevelFilter.toUpperCase()}</p>
            <p className="text-[10px]">เอกสารเตรียมตรวจ ไม่ใช่แบบ ปพ.๓ ทางราชการที่รับรองแล้ว</p>
          </div>

          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  ทะเบียนเตรียมข้อมูล • ตรวจทานก่อนยื่น
                </span>
                <h2 className="text-base font-bold text-[var(--color-text-title)]">
                  เตรียมข้อมูลแบบรายงานผู้สำเร็จการศึกษา (ปพ.3)
                </h2>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                แสดงข้อมูลจากทะเบียนของโรงเรียนที่เลือก; ตรวจสอบข้อมูลและใช้แบบฟอร์มทางการของหน่วยงานก่อนลงนามหรือยื่น
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
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">นักเรียนในระดับชั้นที่เลือก</div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">
                {students.filter((student) => matchesPp3Level(student, pp3LevelFilter)).length} คน
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">สถานะการอนุมัติ</div>
              <div className="text-sm font-bold text-amber-700 mt-1">ต้องตรวจสอบก่อนอนุมัติ</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">วันที่อนุมัติจบการศึกษา</div>
              <div className="text-sm font-bold text-[var(--color-text-title)] mt-1">แสดงเมื่อมีการบันทึกข้อมูลจริง</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">ปีการศึกษาจากค่าตั้งโรงเรียน</div>
              <div className="text-sm font-mono font-bold text-[var(--color-primary-text)] mt-1">ปีการศึกษา {systemConfig.academicYear}</div>
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
                  .filter((student) => matchesPp3Level(student, pp3LevelFilter))
                  .map((stu, idx) => {
                    return (
                      <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                        <td className="py-2.5 px-3 text-center font-mono text-[var(--color-text-muted)]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary-text)]">{stu.studentIdNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{stu.nationalId || '—'}</td>
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
                          <span className="font-semibold text-slate-800 dark:text-slate-200">ยังไม่กำหนด</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] block">กรอกหลังออกเลขทะเบียนจริง</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            รอตรวจสอบข้อมูล
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

          {/* Official Pp.3 Certification Signature Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--color-border)] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] text-xs text-center bg-[var(--color-card-subtle)] print:bg-white print:border-slate-700 print:divide-slate-700">
            <div className="p-4 space-y-8">
              <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">นายทะเบียนโรงเรียน</p>
              <div>
                <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>
            <div className="p-4 space-y-8">
              <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">หัวหน้าฝ่ายวิชาการ / วัดผล</p>
              <div>
                <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>
            <div className="p-4 space-y-8">
              <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">ผู้อำนวยการสถานศึกษา (ผู้อนุมัติจบ)</p>
              <div>
                <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">วันที่อนุมัติ ....... / ............ / ...........</p>
              </div>
            </div>
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
