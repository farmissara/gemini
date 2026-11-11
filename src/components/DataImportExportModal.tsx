import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Sparkles,
  ArrowDownToLine,
  RefreshCw,
  Trash2,
  Layers,
  Award,
  ShieldCheck,
  FolderPlus,
  HeartPulse,
  Send,
  Check,
  FileCheck2,
  HelpCircle
} from 'lucide-react';
import { Student, Teacher, QuizQuestion, Course, GradeRecord, AppLanguage, SdqAssessment } from '../types';
import { getLocalDateString } from '../lib/date';

export type ImportExportTab = 
  | 'students' // DMC ทะเบียนนักเรียน
  | 'teachers' // HRMS บุคลากร & DPA วิทยฐานะ
  | 'courses' // School MIS รายวิชา & หลักสูตร
  | 'grades' // School MIS ผลการเรียน ปพ.5
  | 'enrollment' // ทะเบียนลงทะเบียนเรียน
  | 'cct' // CCT นักเรียนยากจน
  | 'sdq' // OBEC Care ดูแลช่วยเหลือนักเรียน & SDQ
  | 'onet' // สทศ. O-NET ป.6/ม.3/ม.6
  | 'pp3' // ปพ.3 ออนไลน์ ใบจบรวม
  | 'questions'; // คลังข้อสอบ

interface DataImportExportModalProps {
  students: Student[];
  teachers: Teacher[];
  questions: QuizQuestion[];
  courses?: Course[];
  grades?: GradeRecord[];
  lang: AppLanguage;
  onImportStudents: (newStudents: Student[]) => void;
  onImportTeachers: (newTeachers: Teacher[]) => void;
  onImportQuestions: (newQuestions: QuizQuestion[]) => void;
  onImportCourses?: (newCourses: Course[]) => void;
  onImportEnrollment?: (courseId: string, studentIds: string[]) => void;
  onImportGrades?: (newGrades: GradeRecord[]) => void;
  onImportSdq?: (newSdq: any[]) => void;
  onClose: () => void;
  initialTab?: string;
}

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  students,
  teachers,
  questions,
  courses = [],
  grades = [],
  lang,
  onImportStudents,
  onImportTeachers,
  onImportQuestions,
  onImportCourses,
  onImportEnrollment,
  onImportGrades,
  onImportSdq,
  onClose,
  initialTab = 'students',
}) => {
  const [activeTab, setActiveTab] = useState<ImportExportTab>(
    (initialTab === 'courses' || initialTab === 'teachers' || initialTab === 'grades' || initialTab === 'cct' || initialTab === 'sdq' || initialTab === 'onet' || initialTab === 'pp3' || initialTab === 'questions' || initialTab === 'enrollment')
      ? initialTab as ImportExportTab
      : 'students'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden File Inputs
  const studentFileRef = useRef<HTMLInputElement>(null);
  const teacherFileRef = useRef<HTMLInputElement>(null);
  const courseFileRef = useRef<HTMLInputElement>(null);
  const gradeFileRef = useRef<HTMLInputElement>(null);
  const enrollmentFileRef = useRef<HTMLInputElement>(null);
  const cctFileRef = useRef<HTMLInputElement>(null);
  const sdqFileRef = useRef<HTMLInputElement>(null);
  const onetFileRef = useRef<HTMLInputElement>(null);
  const pp3FileRef = useRef<HTMLInputElement>(null);
  const questionFileRef = useRef<HTMLInputElement>(null);

  // Preview States
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [previewTeachers, setPreviewTeachers] = useState<Teacher[]>([]);
  const [previewCourses, setPreviewCourses] = useState<Course[]>([]);
  const [previewGrades, setPreviewGrades] = useState<GradeRecord[]>([]);
  const [previewEnrollments, setPreviewEnrollments] = useState<{ courseCode: string; studentId: string; studentName: string }[]>([]);
  const [previewCct, setPreviewCct] = useState<any[]>([]);
  const [previewSdq, setPreviewSdq] = useState<any[]>([]);
  const [previewOnet, setPreviewOnet] = useState<any[]>([]);
  const [previewPp3, setPreviewPp3] = useState<any[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<QuizQuestion[]>([]);

  // Page Numbers
  const [page, setPage] = useState(0);

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
  // 1. DMC (STUDENTS)
  // ==========================================
  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) {
          showToast('ไฟล์ไม่มีข้อมูลหรือแถวไม่ถูกต้อง');
          return;
        }
        const dataRows = rows.slice(1);
        const imported: Student[] = dataRows.map((r, idx) => {
          const stuId = r[0] || `STU-${Date.now()}-${idx + 1}`;
          const natId = r[1] || '';
          const fTh = r[2] || '';
          const lTh = r[3] || '';
          const fEn = r[4] || fTh;
          const lEn = r[5] || lTh;
          const gender = (r[6]?.toLowerCase().includes('fe') || r[6] === 'หญิง') ? 'female' : 'male';
          const dob = r[7] || '2008-01-01';
          const grade = r[8] || 'มัธยมศึกษาปีที่ 4 (M.4)';
          const room = r[9] || 'ห้อง 401';
          const gpa = parseFloat(r[10]) || 3.50;
          const gName = r[11] || '';
          const gRel = r[12] || 'ผู้ปกครอง';
          const gPhone = r[13] || '';
          return {
            id: `stu-dmc-${Date.now()}-${idx}`,
            studentIdNumber: stuId,
            nationalId: natId,
            firstNameTh: fTh,
            lastNameTh: lTh,
            firstNameEn: fEn,
            lastNameEn: lEn,
            gender: gender as any,
            dateOfBirth: dob,
            gradeLevel: grade,
            room: room,
            status: 'active' as const,
            avatarUrl: gender === 'female' 
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' 
              : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
            gpa,
            guardianName: gName,
            guardianRelation: gRel,
            guardianPhone: gPhone,
            guardianEmail: '',
            lineLinked: false,
            lineNotifyEnabled: false,
            enrolledDate: getLocalDateString(),
          };
        }).filter(s => s.firstNameTh || s.studentIdNumber);

        if (imported.length === 0) {
          showToast('ไม่พบข้อมูลนักเรียนที่ถูกต้องในไฟล์');
          return;
        }
        setPage(0);
        setPreviewStudents(imported);
        showToast(`อ่านไฟล์สำเร็จ พบนักเรียน ${imported.length} คน พร้อมตรวจสอบ`);
      } catch {
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleExportStudents = () => {
    const headers = ['รหัสประจำตัว (Student ID)', 'เลขบัตรประชาชน 13 หลัก (DMC)', 'ชื่อ (ไทย)', 'นามสกุล (ไทย)', 'ชื่อ (EN)', 'นามสกุล (EN)', 'เพศ', 'วันเกิด', 'ระดับชั้น', 'ห้องเรียน', 'GPAX', 'ชื่อผู้ปกครอง', 'ความสัมพันธ์', 'เบอร์โทรผู้ปกครอง'];
    const rows = students.map(s => [
      s.studentIdNumber,
      s.nationalId || '',
      `"${s.firstNameTh}"`,
      `"${s.lastNameTh}"`,
      `"${s.firstNameEn}"`,
      `"${s.lastNameEn}"`,
      s.gender,
      s.dateOfBirth,
      `"${s.gradeLevel}"`,
      `"${s.room}"`,
      s.gpa,
      `"${s.guardianName}"`,
      `"${s.guardianRelation}"`,
      `"${s.guardianPhone}"`
    ]);
    downloadFile(`dmc_students_export_${getLocalDateString()}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
    showToast('ส่งออกข้อมูลนักเรียน DMC สำเร็จ (CSV)');
  };

  const handleDownloadStudentTemplate = () => {
    const headers = ['studentIdNumber', 'nationalId', 'firstNameTh', 'lastNameTh', 'firstNameEn', 'lastNameEn', 'gender', 'dateOfBirth', 'gradeLevel', 'room', 'gpa', 'guardianName', 'guardianRelation', 'guardianPhone'];
    const sampleRow = ['STU-2569-001', '1-1002-00888-99-1', 'กิตติศักดิ์', 'เจริญวัฒนา', 'Kittisak', 'Charoenwattana', 'male', '2009-05-12', 'มัธยมศึกษาปีที่ 4 (M.4)', 'ห้อง 401', '3.85', 'นายสมชาย เจริญวัฒนา', 'บิดา', '081-234-5678'];
    downloadFile('template_dmc_students.csv', [headers.join(','), sampleRow.join(',')].join('\n'));
    showToast('ดาวน์โหลดแบบฟอร์ม DMC นักเรียนแล้ว');
  };

  const handleLoadSampleStudents = () => {
    const samples: Student[] = [
      {
        id: `stu-sample-${Date.now()}-1`,
        studentIdNumber: 'STU-2569-001',
        nationalId: '1-1002-00888-99-1',
        firstNameTh: 'กิตติศักดิ์',
        lastNameTh: 'เจริญวัฒนา',
        firstNameEn: 'Kittisak',
        lastNameEn: 'Charoenwattana',
        gender: 'male',
        dateOfBirth: '2009-05-12',
        gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
        room: 'ห้อง 401',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
        gpa: 3.85,
        guardianName: 'นายสมชาย เจริญวัฒนา',
        guardianRelation: 'บิดา',
        guardianPhone: '081-234-5678',
        guardianEmail: 'somchai@gmail.com',
        lineLinked: true,
        lineNotifyEnabled: true,
        enrolledDate: getLocalDateString(),
      },
      {
        id: `stu-sample-${Date.now()}-2`,
        studentIdNumber: 'STU-2569-002',
        nationalId: '1-1002-00777-88-2',
        firstNameTh: 'วรินทร',
        lastNameTh: 'สุวรรณศรี',
        firstNameEn: 'Warinthorn',
        lastNameEn: 'Suwannasri',
        gender: 'female',
        dateOfBirth: '2009-08-20',
        gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
        room: 'ห้อง 401',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        gpa: 3.92,
        guardianName: 'นางกาญจนา สุวรรณศรี',
        guardianRelation: 'มารดา',
        guardianPhone: '089-876-5432',
        guardianEmail: 'kanjana@gmail.com',
        lineLinked: true,
        lineNotifyEnabled: true,
        enrolledDate: getLocalDateString(),
      }
    ];
    setPage(0);
    setPreviewStudents(samples);
    showToast('โหลดข้อมูลตัวอย่างนักเรียน DMC แล้ว');
  };

  const handleConfirmImportStudents = () => {
    if (previewStudents.length === 0) return;
    onImportStudents(previewStudents);
    showToast(`นำเข้าข้อมูลนักเรียน ${previewStudents.length} คนเข้าสู่ระบบ DMC สำเร็จ!`);
    setPreviewStudents([]);
  };

  // ==========================================
  // 2. HRMS & DPA (TEACHERS)
  // ==========================================
  const handleTeacherFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) {
          showToast('ไฟล์ไม่มีข้อมูลครู');
          return;
        }
        const dataRows = rows.slice(1);
        const imported: Teacher[] = dataRows.map((r, idx) => ({
          id: `tch-hrms-${Date.now()}-${idx}`,
          teacherIdNumber: r[0] || `TCH-${100 + idx}`,
          fullNameTh: r[1] || '',
          fullNameEn: r[2] || '',
          gender: ((r[3] === 'female' || r[3] === 'หญิง') ? 'female' : 'male') as 'female' | 'male' | 'other',
          email: r[4] || '',
          phone: r[5] || '',
          avatarUrl: '',
          academicDegree: r[6] || '',
          major: r[7] || '',
          academicStanding: r[8] || '',
          department: r[9] || '',
          teacherLicenseNo: r[10] || '',
          teachingSubjects: r[11] ? r[11].split(';').map((item) => item.trim()).filter(Boolean) : [],
          homeroomClasses: r[12] ? r[12].split(';').map((item) => item.trim()).filter(Boolean) : [],
          teachingGrades: r[15] ? r[15].split(';').map((item) => item.trim()).filter(Boolean) : [],
          isSchoolAdmin: ['true', 'yes', 'ใช่'].includes((r[20] || '').trim().toLowerCase()),
          teachingExperienceYears: r[13]?.trim() ? Number(r[13]) : undefined,
          paScore: r[14]?.trim() ? Number(r[14]) : undefined,
          otherSkills: r[16] ? r[16].split(';').map((item) => item.trim()).filter(Boolean) : [],
          certifications: r[17] ? r[17].split(';').map((item) => item.trim()).filter(Boolean) : [],
          selfDevelopmentPlan: r[18] || undefined,
          lineUserId: r[19] || undefined,
          lineLinked: ['true', 'yes', 'ใช่'].includes((r[21] || '').trim().toLowerCase()),
          paPortfolio: [],
        })).filter(t => t.fullNameTh);

        setPage(0);
        setPreviewTeachers(imported);
        showToast(`อ่านไฟล์สำเร็จ พบข้อมูลครู HRMS ${imported.length} ท่าน`);
      } catch {
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ครู');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleExportTeachers = () => {
    const headers = ['รหัสครู (HRMS)', 'ชื่อ-สกุล (ไทย)', 'ชื่อ-สกุล (EN)', 'เพศ', 'อีเมล', 'เบอร์โทร', 'วุฒิการศึกษา', 'วิชาเอก', 'วิทยฐานะ (DPA)', 'กลุ่มสาระฯ', 'เลขที่ใบอนุญาต', 'วิชาที่สอน', 'ห้องประจำชั้น', 'อายุราชการ (ปี)', 'คะแนน PA', 'ระดับชั้นที่สอน', 'ความสามารถพิเศษ', 'วุฒิบัตร/ใบรับรอง', 'แผนพัฒนาตนเอง', 'LINE User ID', 'ผู้ดูแลโรงเรียน', 'เชื่อมต่อ LINE'];
    const rows = teachers.map(t => [
      t.teacherIdNumber,
      `"${t.fullNameTh}"`,
      `"${t.fullNameEn}"`,
      t.gender,
      t.email,
      t.phone,
      `"${t.academicDegree}"`,
      `"${t.major}"`,
      `"${t.academicStanding}"`,
      `"${t.department}"`,
      t.teacherLicenseNo,
      `"${t.teachingSubjects?.join(';') || ''}"`,
      `"${t.homeroomClasses?.join(';') || ''}"`,
      t.teachingExperienceYears ?? '',
      t.paScore ?? '',
      `"${t.teachingGrades?.join(';') || ''}"`,
      `"${t.otherSkills?.join(';') || ''}"`,
      `"${t.certifications?.join(';') || ''}"`,
      `"${t.selfDevelopmentPlan || ''}"`,
      t.lineUserId || '',
      t.isSchoolAdmin ? 'true' : 'false',
      t.lineLinked ? 'true' : 'false',
    ]);
    downloadFile(`hrms_teachers_${getLocalDateString()}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
    showToast('ส่งออกข้อมูลบุคลากร HRMS สำเร็จ (CSV)');
  };

  const handleDownloadTeacherTemplate = () => {
    const headers = ['teacherIdNumber', 'fullNameTh', 'fullNameEn', 'gender', 'email', 'phone', 'academicDegree', 'major', 'academicStanding', 'department', 'teacherLicenseNo', 'teachingSubjects', 'homeroomClasses', 'teachingExperienceYears', 'paScore', 'teachingGrades', 'otherSkills', 'certifications', 'selfDevelopmentPlan', 'lineUserId', 'isSchoolAdmin', 'lineLinked'];
    const sample = ['TCH-201', 'ดร.ชาญชัย เกียรติสกุล', 'Dr. Chanchai Kiatsakul', 'male', 'chanchai@school.ac.th', '081-999-8877', 'ปริญญาเอก (ศศ.ด.)', 'คณิตศาสตร์ศึกษา', 'ครูชำนาญการพิเศษ (คศ.3)', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'คส.6010001234', 'คณิตศาสตร์ ม.4;แคลคูลัส', 'ห้อง 401', '12', '92.5', 'ม.4;ม.5', 'คณิตศาสตร์;หุ่นยนต์', 'Active Learning', 'พัฒนาสื่อการเรียนรู้', '', 'false', 'false'];
    downloadFile('template_hrms_teachers.csv', [headers.join(','), sample.join(',')].join('\n'));
    showToast('ดาวน์โหลดแบบฟอร์มครู HRMS แล้ว');
  };

  const handleLoadSampleTeachers = () => {
    const sample: Teacher[] = [
      {
        id: `tch-smp-${Date.now()}-1`,
        teacherIdNumber: 'TCH-201',
        fullNameTh: 'ดร.ชาญชัย เกียรติสกุล',
        fullNameEn: 'Dr. Chanchai Kiatsakul',
        gender: 'male',
        email: 'chanchai@school.ac.th',
        phone: '081-999-8877',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        academicDegree: 'ปริญญาเอก (ศศ.ด.)',
        major: 'คณิตศาสตร์ศึกษา',
        academicStanding: 'ครูชำนาญการพิเศษ (คศ.3)',
        department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
        teacherLicenseNo: 'คส.6010001234',
        teachingSubjects: ['คณิตศาสตร์พื้นฐาน ม.4', 'แคลคูลัส ม.6'],
        homeroomClasses: ['ห้อง 401 (วิทย์-คณิต)'],
        teachingGrades: ['มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 6'],
        isSchoolAdmin: false,
        teachingExperienceYears: 12,
        paScore: 92.5,
      }
    ];
    setPage(0);
    setPreviewTeachers(sample);
    showToast('โหลดข้อมูลตัวอย่างครู HRMS แล้ว');
  };

  const handleConfirmImportTeachers = () => {
    if (previewTeachers.length === 0) return;
    onImportTeachers(previewTeachers);
    showToast(`นำเข้าข้อมูลบุคลากร HRMS ${previewTeachers.length} ท่านสำเร็จ!`);
    setPreviewTeachers([]);
  };

  // ==========================================
  // 3. SCHOOL MIS (COURSES & GRADES / ปพ.5)
  // ==========================================
  const handleCourseFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVLines(text);
        if (rows.length < 2) return;
        const dataRows = rows.slice(1);
        const imported: Course[] = dataRows.map((r, idx) => ({
          id: `crs-mis-${Date.now()}-${idx}`,
          code: r[0] || `CRS-${idx}`,
          titleTh: r[1] || 'รายวิชา',
          titleEn: r[2] || 'Course',
          category: (r[3] as any) || 'core',
          credits: parseFloat(r[4]) || 1.5,
          weeklyHours: parseInt(r[5]) || 3,
          minAttendanceHours: parseInt(r[6]) || 48,
          totalHours: parseInt(r[7]) || 60,
          teacherName: r[8] || '',
          teacherEmail: r[8] ? `${r[8].replace(/\s+/g, '').toLowerCase()}@school.ac.th` : 'teacher@school.ac.th',
          department: r[9] || 'วิชาการ',
          schedule: r[10] || 'จันทร์ 08:30-10:10',
          room: r[11] || 'ห้อง 401',
          academicYear: '2569',
          semester: '1' as const,
          enrolledStudentIds: [],
          description: r[12] || '',
        })).filter(c => c.code && c.titleTh);

        setPage(0);
        setPreviewCourses(imported);
        showToast(`อ่านไฟล์สำเร็จ พบรายวิชา School MIS ${imported.length} วิชา`);
      } catch {
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์หลักสูตร');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleConfirmImportCourses = () => {
    if (previewCourses.length === 0) return;
    if (onImportCourses) {
      onImportCourses(previewCourses);
      showToast(`บันทึกรายวิชาใหม่ ${previewCourses.length} วิชาเข้าสู่ระบบสำเร็จ!`);
      setPreviewCourses([]);
    }
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
        const imported = rows.slice(1).map((r, idx) => ({
          studentId: r[0],
          nationalId: r[1],
          studentName: r[2],
          gradeRoom: r[3],
          cctStatus: r[4] || 'ยากจนพิเศษ',
          pmtScore: r[5] || '32.5',
          stipendAmount: r[6] || '3,000 บาท',
          transferStatus: r[7] || 'โอนสำเร็จ',
        })).filter(x => x.studentId || x.studentName);

        setPage(0);
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

        setPage(0);
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

        setPage(0);
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
          gradGradeLevel: r[3] || 'มัธยมศึกษาปีที่ 3',
          academicYear: r[4] || '2568',
          approvalDate: r[5] || '31 มีนาคม 2569',
          bookNo: r[6] || '01/2569',
          registerNo: r[7] || '001',
          gpax: r[8] || '3.75',
          graduationStatus: r[9] || 'อนุมัติสำเร็จการศึกษาตามหลักสูตร',
        })).filter(x => x.fullNameTh || x.studentIdNumber);

        setPage(0);
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
    onLoadSample: () => void,
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

        {/* Template & Sample Card */}
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>แบบฟอร์ม &amp; ข้อมูลตัวอย่าง</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              ดาวน์โหลดโครงสร้างหัวคอลัมน์มาตรฐาน สพฐ. เพื่อกรอกใน Excel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="flex-1 py-2 px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template (CSV)</span>
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="py-2 px-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ตัวอย่าง</span>
            </button>
          </div>
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
                รองรับการนำเข้าไฟล์ CSV พร้อมตรวจสอบความถูกต้องของระบบราชการการศึกษาไทย
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center border-b border-[var(--color-border)] px-4 bg-[var(--color-card-subtle)] gap-1 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('students'); setPage(0); }}
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
            onClick={() => { setActiveTab('teachers'); setPage(0); }}
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
            onClick={() => { setActiveTab('courses'); setPage(0); }}
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
            onClick={() => { setActiveTab('grades'); setPage(0); }}
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
            onClick={() => { setActiveTab('cct'); setPage(0); }}
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
            onClick={() => { setActiveTab('sdq'); setPage(0); }}
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
            onClick={() => { setActiveTab('onet'); setPage(0); }}
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
            onClick={() => { setActiveTab('pp3'); setPage(0); }}
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
            <div className="space-y-6">
              {renderUploadBox(
                'DMC ทะเบียนนักเรียน',
                'เลือกไฟล์ CSV จากระบบ DMC สพฐ. เพื่อนำเข้าข้อมูลนักเรียน เลข 13 หลัก และผู้ปกครอง',
                studentFileRef,
                handleStudentFileUpload,
                handleDownloadStudentTemplate,
                handleLoadSampleStudents,
                handleExportStudents,
                'blue'
              )}

              {previewStudents.length > 0 && (
                <div className="p-4 rounded-2xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-100">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>ตรวจสอบข้อมูลนักเรียนที่จะนำเข้า ({previewStudents.length} คน)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewStudents([])}
                      className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] font-bold text-[10px] text-[var(--color-text-muted)] uppercase">
                        <tr>
                          <th className="px-3 py-2">รหัสนักเรียน</th>
                          <th className="px-3 py-2">เลข 13 หลัก (DMC)</th>
                          <th className="px-3 py-2">ชื่อ - นามสกุล</th>
                          <th className="px-3 py-2">ระดับชั้น / ห้อง</th>
                          <th className="px-3 py-2 text-center">GPA</th>
                          <th className="px-3 py-2">ผู้ปกครอง / เบอร์โทร</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewStudents.slice(page * 5, (page + 1) * 5).map((s, idx) => (
                          <tr key={idx} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-blue-600">{s.studentIdNumber}</td>
                            <td className="px-3 py-2 font-mono">{s.nationalId || '-'}</td>
                            <td className="px-3 py-2 font-bold">{s.firstNameTh} {s.lastNameTh}</td>
                            <td className="px-3 py-2">{s.gradeLevel} ({s.room})</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-600">{s.gpa}</td>
                            <td className="px-3 py-2">{s.guardianName} ({s.guardianPhone})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportStudents}
                      className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกข้อมูลนักเรียน {previewStudents.length} คนเข้าสู่ระบบ DMC</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HRMS TEACHERS */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              {renderUploadBox(
                'HRMS & DPA บุคลากร',
                'เลือกไฟล์ CSV ทะเบียนครู ตำแหน่ง กลุ่มสาระฯ และข้อมูลวิทยฐานะ ว.PA',
                teacherFileRef,
                handleTeacherFileUpload,
                handleDownloadTeacherTemplate,
                handleLoadSampleTeachers,
                handleExportTeachers,
                'purple'
              )}

              {previewTeachers.length > 0 && (
                <div className="p-4 rounded-2xl border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-purple-900 dark:text-purple-100">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>ตรวจสอบข้อมูลครู HRMS ({previewTeachers.length} ท่าน)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewTeachers([])}
                      className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] font-bold text-[10px] text-[var(--color-text-muted)] uppercase">
                        <tr>
                          <th className="px-3 py-2">รหัสบุคลากร</th>
                          <th className="px-3 py-2">ชื่อ - สกุล</th>
                          <th className="px-3 py-2">วิทยฐานะ (DPA)</th>
                          <th className="px-3 py-2">กลุ่มสาระการเรียนรู้</th>
                          <th className="px-3 py-2 text-center">อายุราชการ</th>
                          <th className="px-3 py-2 text-center">คะแนน PA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewTeachers.slice(page * 5, (page + 1) * 5).map((t, idx) => (
                          <tr key={idx} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-purple-600">{t.teacherIdNumber}</td>
                            <td className="px-3 py-2 font-bold">{t.fullNameTh}</td>
                            <td className="px-3 py-2 text-indigo-700 dark:text-indigo-300 font-medium">{t.academicStanding}</td>
                            <td className="px-3 py-2">{t.department}</td>
                            <td className="px-3 py-2 text-center">{t.teachingExperienceYears} ปี</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-600">{t.paScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportTeachers}
                      className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกข้อมูลครู {previewTeachers.length} ท่านเข้าสู่ฐานข้อมูล HRMS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHOOL MIS COURSES */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              {renderUploadBox(
                'School MIS หลักสูตร & รายวิชา',
                'เลือกไฟล์ CSV รายวิชา รหัสวิชา หน่วยกิต และเกณฑ์เวลาเรียน 80% ปพ.5',
                courseFileRef,
                handleCourseFileUpload,
                () => {
                  const sample = 'code,titleTh,titleEn,category,credits,weeklyHours,minAttendanceHours,totalHours,teacherName,department\nว30201,ฟิสิกส์ 1,Physics 1,core,1.5,3,48,60,ครูสุรศักดิ์,วิทยาศาสตร์';
                  downloadFile('template_mis_courses.csv', sample);
                },
                () => {
                  setPreviewCourses([
                    {
                      id: `crs-${Date.now()}`,
                      code: 'ว30201',
                      titleTh: 'ฟิสิกส์เพิ่มเติม 1',
                      titleEn: 'Advanced Physics 1',
                      category: 'core',
                      credits: 1.5,
                      weeklyHours: 3,
                      minAttendanceHours: 48,
                      totalHours: 60,
                      teacherName: 'ดร.ชาญชัย เกียรติสกุล',
                      teacherEmail: 'chanchai@school.ac.th',
                      department: 'วิทยาศาสตร์และเทคโนโลยี',
                      schedule: 'จันทร์ 08:30-10:10',
                      room: 'ห้อง 401',
                      academicYear: '2569',
                      semester: '1',
                      enrolledStudentIds: [],
                      description: 'กลศาสตร์และการเคลื่อนที่แนวตรง',
                    }
                  ]);
                },
                () => {
                  const headers = ['รหัสวิชา', 'ชื่อวิชา (ไทย)', 'ชื่อวิชา (EN)', 'หน่วยกิต', 'คาบ/สัปดาห์', 'เกณฑ์ 80% (ชม.)', 'ครูผู้สอน', 'กลุ่มสาระฯ'];
                  const rows = courses.map(c => [c.code, `"${c.titleTh}"`, `"${c.titleEn}"`, c.credits, c.weeklyHours || 3, c.minAttendanceHours || 48, `"${c.teacherName}"`, `"${c.department}"`]);
                  downloadFile(`mis_courses_${getLocalDateString()}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
                },
                'indigo'
              )}

              {previewCourses.length > 0 && (
                <div className="p-4 rounded-2xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-100">ตรวจสอบรายวิชา School MIS ({previewCourses.length} วิชา)</span>
                    <button type="button" onClick={() => setPreviewCourses([])} className="text-xs text-rose-600 font-bold">ล้างพรีวิว</button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportCourses}
                      className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกรายวิชา {previewCourses.length} วิชา</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SCHOOL MIS GRADES & ปพ.5 */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              {renderUploadBox(
                'School MIS คะแนน & ปพ.5',
                'เลือกไฟล์ CSV คะแนนเก็บกลางภาค ปลายภาค และการตัดเกรด ปพ.5',
                gradeFileRef,
                (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  showToast('อ่านไฟล์คะแนน ปพ.5 สำเร็จ');
                },
                () => {
                  downloadFile('template_mis_grades.csv', 'studentIdNumber,courseCode,midtermScore,finalScore,assignmentScore,quizScore,totalScore,letterGrade\nSTU-001,ว30201,18,28,32,16,94,4');
                },
                () => {
                  showToast('โหลดตัวอย่างคะแนน ปพ.5 เรียบร้อย');
                },
                () => {
                  showToast('ส่งออกผลคะแนน ปพ.5 แล้ว');
                },
                'amber'
              )}
            </div>
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
                  const sample = 'studentIdNumber,nationalId,studentName,gradeRoom,cctStatus,pmtScore,stipendAmount,transferStatus\nSTU-2569-001,1-1002-00888-99-1,กิตติศักดิ์ เจริญวัฒนา,ม.4/1,ยากจนพิเศษ,32.40,3000,โอนสำเร็จ';
                  downloadFile('template_cct_poverty.csv', sample);
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
                    <table className="w-full text-xs text-left">
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
                  const sample = 'studentId,nationalId,studentName,gradeRoom,emotional,conduct,hyperactivity,peer,prosocial,total,result,visitDate,visitStatus\nSTU-001,1-1002-001,กิตติศักดิ์,ม.4/1,2,1,3,2,8,8,กลุ่มปกติ,2026-06-12,เยี่ยมบ้านเรียบร้อย';
                  downloadFile('template_obec_sdq.csv', sample);
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
                  const sample = 'schoolOnetCode,studentIdNumber,nationalId,studentName,examGrade,examSeatNo,examCenter,eligibilityStatus\n1010012345,STU-2569-001,1-1002-00888-99-1,กิตติศักดิ์ เจริญวัฒนา,ม.3,001,สนามสอบโรงเรียนประจำอำเภอ,มีสิทธิ์สอบ';
                  downloadFile('template_onet_candidates.csv', sample);
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
                  const sample = 'studentIdNumber,nationalId,fullNameTh,gradGradeLevel,academicYear,approvalDate,bookNo,registerNo,gpax,graduationStatus\nSTU-2569-001,1-1002-00888-99-1,กิตติศักดิ์ เจริญวัฒนา,มัธยมศึกษาปีที่ 3,2568,31 มีนาคม 2569,01/2569,001,3.85,อนุมัติสำเร็จการศึกษาตามหลักสูตร';
                  downloadFile('template_pp3_online.csv', sample);
                },
                () => {
                  setPreviewPp3([
                    {
                      studentIdNumber: 'STU-2569-001',
                      nationalId: '1-1002-00888-99-1',
                      fullNameTh: 'กิตติศักดิ์ เจริญวัฒนา',
                      gradGradeLevel: 'มัธยมศึกษาปีที่ 3',
                      academicYear: '2568',
                      approvalDate: '31 มีนาคม 2569',
                      bookNo: '01/2569',
                      registerNo: '001',
                      gpax: '3.85',
                      graduationStatus: 'อนุมัติสำเร็จการศึกษาตามหลักสูตร',
                    }
                  ]);
                },
                () => {
                  downloadFile('pp3_online_export.csv', 'studentId,fullNameTh,bookNo,registerNo\nSTU-001,กิตติศักดิ์,01/2569,001');
                },
                'orange'
              )}

              {previewPp3.length > 0 && (
                <div className="p-4 rounded-2xl border border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-orange-900 dark:text-orange-100">ตรวจสอบแบบรายงานผู้สำเร็จการศึกษา ปพ.3 ออนไลน์ ({previewPp3.length} คน)</span>
                    <button type="button" onClick={() => setPreviewPp3([])} className="text-xs text-rose-600 font-bold">ล้างพรีวิว</button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`นำเข้าข้อมูล ปพ.3 ออนไลน์ ${previewPp3.length} คนสำเร็จ! พร้อมจัดพิมพ์`);
                        setPreviewPp3([]);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกทะเบียน ปพ.3 ออนไลน์</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <HelpCircle className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span>รองรับไฟล์ .csv ทุกระบบราชการ พร้อมระบบแปลงภาษาไทย UTF-8 อัตโนมัติ</span>
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
