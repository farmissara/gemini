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
  FolderPlus
} from 'lucide-react';
import { Student, Teacher, QuizQuestion, Course, GradeRecord, AppLanguage } from '../types';

export type ImportExportTab = 'students' | 'courses' | 'enrollment' | 'grades' | 'teachers' | 'questions';

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
  onClose: () => void;
  initialTab?: ImportExportTab;
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
  onClose,
  initialTab = 'students',
}) => {
  const [activeTab, setActiveTab] = useState<ImportExportTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden file input refs
  const studentFileRef = useRef<HTMLInputElement>(null);
  const courseFileRef = useRef<HTMLInputElement>(null);
  const enrollmentFileRef = useRef<HTMLInputElement>(null);
  const gradeFileRef = useRef<HTMLInputElement>(null);
  const teacherFileRef = useRef<HTMLInputElement>(null);
  const questionFileRef = useRef<HTMLInputElement>(null);

  // Preview States for Imported Data
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [previewCourses, setPreviewCourses] = useState<Course[]>([]);
  const [previewEnrollments, setPreviewEnrollments] = useState<{ courseCode: string; studentId: string; studentName: string }[]>([]);
  const [previewGrades, setPreviewGrades] = useState<GradeRecord[]>([]);
  const [previewTeachers, setPreviewTeachers] = useState<Teacher[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<QuizQuestion[]>([]);

  // Preview Page numbers
  const [studentPreviewPage, setStudentPreviewPage] = useState(0);
  const [coursePreviewPage, setCoursePreviewPage] = useState(0);
  const [enrollmentPreviewPage, setEnrollmentPreviewPage] = useState(0);
  const [gradePreviewPage, setGradePreviewPage] = useState(0);
  const [teacherPreviewPage, setTeacherPreviewPage] = useState(0);
  const [questionPreviewPage, setQuestionPreviewPage] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper: Trigger file download in browser with UTF-8 BOM
  const downloadFile = (filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;') => {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel Thai support
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
  // 1. STUDENTS EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportStudents = () => {
    const headers = [
      'รหัสประจำตัว (Student ID)',
      'เลขบัตรประชาชน (National ID)',
      'ชื่อ (ไทย)',
      'นามสกุล (ไทย)',
      'First Name (EN)',
      'Last Name (EN)',
      'เพศ (Gender)',
      'วันเกิด (DOB)',
      'ระดับชั้น (Grade)',
      'ห้องเรียน (Room)',
      'เกรดเฉลี่ย (GPA)',
      'ชื่อผู้ปกครอง',
      'เบอร์โทรผู้ปกครอง',
      'อีเมลผู้ปกครอง'
    ];

    const rows = students.map(s => [
      s.studentIdNumber || '',
      s.nationalId || '',
      `"${s.firstNameTh || ''}"`,
      `"${s.lastNameTh || ''}"`,
      `"${s.firstNameEn || ''}"`,
      `"${s.lastNameEn || ''}"`,
      s.gender || 'male',
      s.dateOfBirth || '',
      `"${s.gradeLevel || ''}"`,
      `"${s.room || ''}"`,
      s.gpa || '0.00',
      `"${s.guardianName || ''}"`,
      `"${s.guardianPhone || ''}"`,
      `"${s.guardianEmail || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`students_export_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast('ส่งออกข้อมูลนักเรียนสำเร็จ (CSV)');
  };

  const handleDownloadStudentTemplate = () => {
    const headers = [
      'studentIdNumber',
      'nationalId',
      'firstNameTh',
      'lastNameTh',
      'firstNameEn',
      'lastNameEn',
      'gender',
      'dateOfBirth',
      'gradeLevel',
      'room',
      'gpa',
      'guardianName',
      'guardianRelation',
      'guardianPhone'
    ];
    const sampleRow = [
      'ED-6920',
      '1-1002-00999-11-2',
      'กิตติกร',
      'เจริญกุล',
      'Kittikorn',
      'Charoenkul',
      'male',
      '2008-07-15',
      'มัธยมศึกษาปีที่ 4 (M.4)',
      'ห้อง 401 (วิทย์-คณิต)',
      '3.88',
      'นายสมหมาย เจริญกุล',
      'บิดา',
      '081-234-5678'
    ];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    downloadFile('template_students_import.csv', csvContent);
    showToast('ดาวน์โหลดแบบฟอร์มตัวอย่างนักเรียนแล้ว');
  };

  const handleLoadSampleStudents = () => {
    const samples: Student[] = [
      {
        id: `stu-imp-${Date.now()}-1`,
        studentIdNumber: 'ED-6921',
        nationalId: '1-1002-00444-11-0',
        firstNameTh: 'สิรินธร',
        lastNameTh: 'บุญญาภินันท์',
        firstNameEn: 'Sirinthorn',
        lastNameEn: 'Boonyaphinant',
        gender: 'female',
        dateOfBirth: '2008-03-25',
        gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
        room: 'ห้อง 401 (วิทย์-คณิต)',
        enrolledRooms: ['ห้อง 401 (วิทย์-คณิต)'],
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        gpa: 3.96,
        guardianName: 'นายธีรชัย บุญญาภินันท์',
        guardianRelation: 'บิดา',
        guardianPhone: '081-332-9988',
        guardianEmail: 'theerachai.b@gmail.com',
        lineLinked: true,
        lineNotifyEnabled: true,
        enrolledDate: '2026-05-15'
      }
    ];
    setStudentPreviewPage(0);
    setPreviewStudents(samples);
    showToast('โหลดข้อมูลตัวอย่างนักเรียนสำหรับทดสอบแล้ว');
  };

  const handleConfirmImportStudents = () => {
    if (previewStudents.length === 0) return;
    onImportStudents(previewStudents);
    showToast(`นำเข้าข้อมูลนักเรียน ${previewStudents.length} คนสำเร็จ!`);
    setStudentPreviewPage(0);
    setPreviewStudents([]);
  };

  // ==========================================
  // 2. COURSES / SYLLABUS EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportCourses = () => {
    const headers = [
      'รหัสวิชา (Code)',
      'ชื่อวิชา (ภาษาไทย)',
      'Course Title (English)',
      'หมวดหมู่วิชา (Category)',
      'หน่วยกิต (Credits)',
      'คาบต่อสัปดาห์ (Weekly Hours)',
      'ชั่วโมงรวม/เทอม (Total Hours)',
      'เกณฑ์ 80% (Min Attendance Hours)',
      'กลุ่มสาระการเรียนรู้ (Department)',
      'ครูผู้สอน (Teacher Name)',
      'อีเมลครู (Teacher Email)',
      'ห้องเรียน (Room)',
      'วันและเวลาเรียน (Schedule)',
      'ปีการศึกษา (Academic Year)',
      'ภาคเรียน (Semester)',
      'จำนวนนักเรียนลงทะเบียน (Enrolled Count)'
    ];

    const rows = courses.map(c => [
      c.code,
      `"${c.titleTh}"`,
      `"${c.titleEn}"`,
      c.category,
      c.credits,
      c.weeklyHours || Math.round(c.credits * 2),
      c.totalHours || (c.credits * 40),
      c.minAttendanceHours || Math.round((c.credits * 40) * 0.8),
      `"${c.department}"`,
      `"${c.teacherName}"`,
      c.teacherEmail,
      `"${c.room}"`,
      `"${c.schedule}"`,
      c.academicYear || '2569',
      c.semester || '1',
      c.enrolledStudentIds?.length || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`academic_courses_syllabus_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast('ส่งออกข้อมูลหลักสูตรและรายวิชาสำเร็จ (CSV)');
  };

  const handleDownloadCourseTemplate = () => {
    const headers = [
      'code',
      'titleTh',
      'titleEn',
      'category',
      'credits',
      'weeklyHours',
      'totalHours',
      'minAttendanceHours',
      'department',
      'teacherName',
      'teacherEmail',
      'room',
      'schedule',
      'academicYear',
      'semester',
      'description'
    ];

    const sampleRows = [
      [
        'ว30205',
        'ปัญญาประดิษฐ์ประยุกต์และ Edge Computing',
        'Applied AI & Edge Computing',
        'stem',
        '1.5',
        '3',
        '60',
        '48',
        'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
        'อ.ดร.ประเสริฐ ถาวร',
        'prasert.t@eduverse.ac.th',
        'Lab คอมพิวเตอร์ 3',
        'จันทร์, พุธ 09:00 - 10:30',
        '2569',
        '1',
        'ศึกษาการประยุกต์ใช้โมเดล Deep Learning บนอุปกรณ์ไมโครคอนโทรลเลอร์และการตรวจจับวัตถุ'
      ],
      [
        'อ31201',
        'ภาษาอังกฤษเชิงวิชาการและการสื่อสารสากล',
        'Academic English & Global Communication',
        'language',
        '1.0',
        '2',
        '40',
        '32',
        'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
        'ครูชัชวาลย์ กล้าหาญ',
        'chatchawal.k@eduverse.ac.th',
        'ห้อง 401',
        'อังคาร, พฤหัสบดี 10:20 - 11:10',
        '2569',
        '1',
        'การอ่านบทความวิจัย การเขียนรายงานเชิงวิชาการ และการนำเสนองานสัมมนาระดับนานาชาติ'
      ]
    ];

    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    downloadFile('template_academic_courses_import.csv', csvContent);
    showToast('ดาวน์โหลดแบบฟอร์มนำเข้าหลักสูตรและรายวิชาแล้ว');
  };

  const handleLoadSampleCourses = () => {
    const samples: Course[] = [
      {
        id: `crs-imp-${Date.now()}-1`,
        code: 'ว30208',
        titleTh: 'ชีววิทยาระดับโมเลกุลและพันธุวิศวกรรม',
        titleEn: 'Molecular Biology & Genetic Engineering',
        category: 'stem',
        credits: 1.5,
        weeklyHours: 3,
        totalHours: 60,
        minAttendanceHours: 48,
        teacherName: 'อ.ดร.กมลทิพย์ ศรีสวัสดิ์',
        teacherEmail: 'kamonthip.s@eduverse.ac.th',
        department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
        room: 'ห้องปฏิบัติการชีววิทยา 2',
        schedule: 'อังคาร, พฤหัสบดี 13:00 - 14:30',
        academicYear: '2569',
        semester: '1',
        enrolledStudentIds: [],
        description: 'ปฏิบัติการสกัดดีเอ็นเอ การทำ PCR และการวิเคราะห์ลำดับเบสพันธุกรรม'
      },
      {
        id: `crs-imp-${Date.now()}-2`,
        code: 'ท31101',
        titleTh: 'ภาษาไทยพื้นฐาน 1 (วรรณคดีและวรรณกรรม)',
        titleEn: 'Fundamental Thai 1 (Literature & Arts)',
        category: 'core',
        credits: 1.0,
        weeklyHours: 2,
        totalHours: 40,
        minAttendanceHours: 32,
        teacherName: 'ครูสมศักดิ์ ปรีชากุล',
        teacherEmail: 'somsak.p@eduverse.ac.th',
        department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
        room: 'ห้อง 401',
        schedule: 'พุธ, ศุกร์ 11:10 - 12:00',
        academicYear: '2569',
        semester: '1',
        enrolledStudentIds: [],
        description: 'การวิเคราะห์คุณค่าวรรณคดีไทย วรรณศิลป์ และการประยุกต์ใช้ข้อคิดในชีวิตประจำวัน'
      }
    ];
    setCoursePreviewPage(0);
    setPreviewCourses(samples);
    showToast('โหลดข้อมูลตัวอย่างหลักสูตรและรายวิชาแล้ว');
  };

  const handleConfirmImportCourses = () => {
    if (previewCourses.length === 0) return;
    if (onImportCourses) {
      onImportCourses(previewCourses);
      showToast(`นำเข้ารายวิชาใหม่ ${previewCourses.length} วิชาเข้าสู่ระบบหลักสูตรสำเร็จ!`);
      setCoursePreviewPage(0);
      setPreviewCourses([]);
    } else {
      showToast('ไม่พบฟังก์ชันบันทึกหลักสูตร');
    }
  };

  // ==========================================
  // 3. REGISTRAR ENROLLMENT EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportEnrollment = () => {
    const headers = [
      'รหัสนักเรียน (Student ID)',
      'ชื่อ - นามสกุล (ไทย)',
      'ห้องเรียน (Room)',
      'รหัสวิชา (Course Code)',
      'ชื่อวิชา (Course Title)',
      'ภาคเรียน / ปีการศึกษา',
      'สถานะการลงทะเบียน (Status)'
    ];

    const rows: string[] = [];
    courses.forEach(c => {
      (c.enrolledStudentIds || []).forEach(stId => {
        const student = students.find(s => s.id === stId);
        if (student) {
          rows.push([
            student.studentIdNumber,
            `"${student.firstNameTh} ${student.lastNameTh}"`,
            `"${student.room}"`,
            c.code,
            `"${c.titleTh}"`,
            `"${c.semester}/${c.academicYear || '2569'}"`,
            'Enrolled'
          ].join(','));
        }
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(`student_course_enrollments_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast('ส่งออกข้อมูลการลงทะเบียนเรียนสำเร็จ (CSV)');
  };

  const handleDownloadEnrollmentTemplate = () => {
    const headers = ['studentIdNumber', 'courseCode', 'semester', 'academicYear'];
    const sampleRows = [
      ['ED-6910', 'ว30201', '1', '2569'],
      ['ED-6910', 'ค30201', '1', '2569'],
      ['ED-6911', 'อ30201', '1', '2569']
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    downloadFile('template_student_enrollment.csv', csvContent);
    showToast('ดาวน์โหลดแบบฟอร์มการลงทะเบียนเรียนแล้ว');
  };

  const handleLoadSampleEnrollment = () => {
    const firstCourse = courses[0] || { code: 'ว30201' };
    const samples = students.slice(0, 3).map(st => ({
      courseCode: firstCourse.code,
      studentId: st.id,
      studentName: `${st.studentIdNumber} - ${st.firstNameTh} ${st.lastNameTh}`
    }));
    setEnrollmentPreviewPage(0);
    setPreviewEnrollments(samples);
    showToast('โหลดตัวอย่างการลงทะเบียน 3 รายการแล้ว');
  };

  const handleConfirmImportEnrollment = () => {
    if (previewEnrollments.length === 0) return;
    if (onImportEnrollment) {
      // Group by course
      const map: Record<string, string[]> = {};
      previewEnrollments.forEach(item => {
        if (!map[item.courseCode]) map[item.courseCode] = [];
        map[item.courseCode].push(item.studentId);
      });
      Object.entries(map).forEach(([courseCode, stIds]) => {
        onImportEnrollment(courseCode, stIds);
      });
      showToast(`บันทึกการลงทะเบียนนักเรียน ${previewEnrollments.length} รายการสำเร็จ!`);
      setEnrollmentPreviewPage(0);
      setPreviewEnrollments([]);
    } else {
      showToast('ไม่พบฟังก์ชันบันทึกการลงทะเบียน');
    }
  };

  // ==========================================
  // 4. GRADEBOOK / ASSESSMENT (ปพ.5) EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportGrades = () => {
    const headers = [
      'รหัสนักเรียน (Student ID)',
      'ชื่อ-นามสกุล',
      'รหัสวิชา (Course Code)',
      'คะแนนเก็บ (Assignment / 20)',
      'สอบย่อย (Quiz / 20)',
      'สอบกลางภาค (Midterm / 30)',
      'สอบปลายภาค (Final / 30)',
      'คะแนนรวม (Total / 100)',
      'ระดับเกรด (Letter Grade)',
      'ค่าระดับเกรด (Grade Point)'
    ];

    const rows = grades.map(g => {
      const student = students.find(s => s.id === g.studentId);
      const course = courses.find(c => c.id === g.courseId);
      return [
        student?.studentIdNumber || g.studentId,
        `"${student ? `${student.firstNameTh} ${student.lastNameTh}` : ''}"`,
        course?.code || g.courseId,
        g.assignmentScore,
        g.quizScore,
        g.midtermScore,
        g.finalScore,
        g.totalScore,
        g.letterGrade,
        g.gradePoint
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(`academic_gradebook_pp5_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast('ส่งออกข้อมูลผลการเรียน (ปพ.5) สำเร็จ (CSV)');
  };

  const handleDownloadGradeTemplate = () => {
    const headers = ['studentIdNumber', 'courseCode', 'assignmentScore', 'quizScore', 'midtermScore', 'finalScore'];
    const sampleRows = [
      ['ED-6910', 'ว30201', '19', '18', '28', '27'],
      ['ED-6911', 'ว30201', '17', '16', '25', '24']
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    downloadFile('template_gradebook_pp5.csv', csvContent);
    showToast('ดาวน์โหลดแบบฟอร์มนำเข้าผลการเรียนแล้ว');
  };

  const handleLoadSampleGrades = () => {
    const targetCourse = courses[0];
    const targetStudent = students[0];
    if (!targetCourse || !targetStudent) {
      showToast('ต้องมีข้อมูลรายวิชาและนักเรียนในระบบก่อน');
      return;
    }

    const samples: GradeRecord[] = [
      {
        id: `grd-imp-${Date.now()}-1`,
        studentId: targetStudent.id,
        courseId: targetCourse.id,
        academicYear: targetCourse.academicYear || '2569',
        semester: targetCourse.semester || '1',
        assignmentScore: 19,
        quizScore: 19,
        midtermScore: 28,
        finalScore: 29,
        totalScore: 95,
        letterGrade: 'A',
        gradePoint: 4.0
      }
    ];
    setGradePreviewPage(0);
    setPreviewGrades(samples);
    showToast('โหลดตัวอย่างผลการเรียนแล้ว');
  };

  const handleConfirmImportGrades = () => {
    if (previewGrades.length === 0) return;
    if (onImportGrades) {
      onImportGrades(previewGrades);
      showToast(`บันทึกผลการเรียน ${previewGrades.length} รายการเข้าสู่ระบบ ปพ.5 สำเร็จ!`);
      setGradePreviewPage(0);
      setPreviewGrades([]);
    } else {
      showToast('ไม่พบฟังก์ชันบันทึกผลการเรียน');
    }
  };

  // ==========================================
  // 5. TEACHERS EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportTeachers = () => {
    const headers = [
      'รหัสประจำตัวครู (ID)',
      'ชื่อ - นามสกุล (ไทย)',
      'Name (EN)',
      'เพศ',
      'อีเมล',
      'เบอร์โทรศัพท์',
      'กลุ่มสาระการเรียนรู้',
      'วิทยฐานะ'
    ];
    const rows = teachers.map(t => [
      t.teacherIdNumber,
      `"${t.fullNameTh}"`,
      `"${t.fullNameEn}"`,
      t.gender,
      t.email,
      `"${t.phone}"`,
      `"${t.department}"`,
      `"${t.academicStanding}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`teachers_export_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast('ส่งออกข้อมูลอาจารย์สำเร็จ (CSV)');
  };

  // ==========================================
  // 6. QUESTIONS EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportQuestions = () => {
    const headers = [
      'วิชา (Subject)',
      'ระดับชั้น (Grade)',
      'คำถาม (ไทย)',
      'ตัวเลือก ก',
      'ตัวเลือก ข',
      'ตัวเลือก ค',
      'ตัวเลือก ง',
      'ข้อถูก (0-3)',
      'เฉลย'
    ];
    const rows = questions.map(q => [
      `"${q.subject}"`,
      `"${q.gradeLevel}"`,
      `"${q.questionTh.replace(/"/g, '""')}"`,
      `"${(q.options[0] || '').replace(/"/g, '""')}"`,
      `"${(q.options[1] || '').replace(/"/g, '""')}"`,
      `"${(q.options[2] || '').replace(/"/g, '""')}"`,
      `"${(q.options[3] || '').replace(/"/g, '""')}"`,
      q.correctIndex,
      `"${(q.explanationTh || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`quiz_questions_export_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast('ส่งออกคลังข้อสอบสำเร็จ (CSV)');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-5xl bg-[var(--color-card)] rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 border border-blue-600 text-blue-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ศูนย์นำเข้า - ส่งออกข้อมูลวิชาการและทะเบียน (Academic &amp; Registrar Hub)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900 text-blue-100 border border-blue-600 font-bold">
                  EXCEL / CSV
                </span>
              </div>
              <p className="text-xs text-slate-200">
                รองรับหลักสูตร, การลงทะเบียนเรียน, งานวัดผล ปพ.5, ทะเบียนนักเรียน และบุคลากรแบบครบวงจร
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/15 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'courses'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>หลักสูตร &amp; รายวิชา ({courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enrollment')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'enrollment'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>งานทะเบียนลงทะเบียนเรียน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'grades'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>งานวัดผล &amp; ปพ.5 ({grades.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>ทะเบียนนักเรียน ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'teachers'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>ทะเบียนคุณครู ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'questions'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            <span>คลังข้อสอบ ({questions.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[var(--color-card)] text-[var(--color-text-body)] space-y-4">

          {/* ======================================= */}
          {/* TAB 1: หลักสูตรและรายวิชา (COURSES)     */}
          {/* ======================================= */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ส่งออกหลักสูตรและรายวิชาทั้งหมด</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดรายวิชา {courses.length} วิชา พร้อมหน่วยกิต, หมวดวิชา, คาบสอน, เกณฑ์ 80% ปพ.5 และครูผู้สอน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCourses}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ส่งออกเป็นไฟล์ CSV (Excel UTF-8)</span>
                  </button>
                </div>

                {/* Template & Sample Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <ArrowDownToLine className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
                      <span>แบบฟอร์มนำเข้าหลักสูตร (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดโครงสร้างหัวตารางหลักสูตรตามมาตรฐาน สพฐ. เพื่อกรอกวิชาใหม่เข้าสู่ระบบ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCourseTemplate}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleCourses}
                      className="py-2 px-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Table for Courses */}
              {previewCourses.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-100 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
                      <span>ตรวจสอบรายวิชาที่จะนำเข้า ({previewCourses.length} วิชา)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCoursePreviewPage(0); setPreviewCourses([]); }}
                      className="text-xs text-rose-700 dark:text-rose-300 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อมูลพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">รหัสวิชา</th>
                          <th className="px-3 py-2">ชื่อวิชา (ไทย / EN)</th>
                          <th className="px-3 py-2">หมวดหมู่วิชา</th>
                          <th className="px-3 py-2 text-center">หน่วยกิต</th>
                          <th className="px-3 py-2 text-center">คาบ/สัปดาห์</th>
                          <th className="px-3 py-2 text-center">เกณฑ์ 80% (ชม.)</th>
                          <th className="px-3 py-2">ครูผู้สอน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewCourses.slice(coursePreviewPage * 4, (coursePreviewPage + 1) * 4).map((c, i) => (
                          <tr key={i} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-[var(--color-primary-text)]">{c.code}</td>
                            <td className="px-3 py-2">
                              <div className="font-bold text-[var(--color-text-title)]">{c.titleTh}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">{c.titleEn}</div>
                            </td>
                            <td className="px-3 py-2 font-medium">{c.category}</td>
                            <td className="px-3 py-2 text-center font-bold">{c.credits}</td>
                            <td className="px-3 py-2 text-center">{c.weeklyHours || 3}</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300">
                              {c.minAttendanceHours || 48} / {c.totalHours || 60} ชม.
                            </td>
                            <td className="px-3 py-2 text-[var(--color-text-body)]">{c.teacherName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportCourses}
                      className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกรายวิชาใหม่ ({previewCourses.length} วิชา) เข้าสู่หลักสูตร</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 2: งานทะเบียนลงทะเบียนเรียน (ENROLL) */}
          {/* ======================================= */}
          {activeTab === 'enrollment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>ส่งออกทะเบียนการลงทะเบียนเรียน</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดรายชื่อการลงทะเบียนเรียนของนักเรียนทุกวิชา พร้อมรหัสนักเรียน รหัสวิชา และสถานะ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportEnrollment}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ส่งออกเป็นไฟล์ CSV (Excel UTF-8)</span>
                  </button>
                </div>

                {/* Template & Sample Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <ArrowDownToLine className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                      <span>แบบฟอร์มลงทะเบียนเรียน (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลด Template สำหรับจับคู่นักเรียนเข้าสู่รายวิชาเป็นกลุ่ม (Batch Enrollment)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadEnrollmentTemplate}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleEnrollment}
                      className="py-2 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Table for Enrollment */}
              {previewEnrollments.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-100 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                      <span>ตรวจสอบการลงทะเบียนที่จะบันทึก ({previewEnrollments.length} รายการ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEnrollmentPreviewPage(0); setPreviewEnrollments([]); }}
                      className="text-xs text-rose-700 dark:text-rose-300 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อมูลพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">รหัสวิชา</th>
                          <th className="px-3 py-2">นักเรียนผู้ลงทะเบียน</th>
                          <th className="px-3 py-2 text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewEnrollments.slice(enrollmentPreviewPage * 5, (enrollmentPreviewPage + 1) * 5).map((en, i) => (
                          <tr key={i} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-[var(--color-primary-text)]">{en.courseCode}</td>
                            <td className="px-3 py-2 font-medium text-[var(--color-text-title)]">{en.studentName}</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300">พร้อมลงทะเบียน</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportEnrollment}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกการลงทะเบียนเรียน ({previewEnrollments.length} รายการ)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: งานวัดผล & ปพ.5 (GRADES)        */}
          {/* ======================================= */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>ส่งออกผลการเรียน ปพ.5 ทั้งหมด</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดบันทึกผลการเรียน {grades.length} รายการ พร้อมคะแนนเก็บ กลางภาค ปลายภาค และระดับเกรด
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportGrades}
                    className="w-full py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ส่งออกเป็นไฟล์ CSV (Excel UTF-8)</span>
                  </button>
                </div>

                {/* Template & Sample Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <ArrowDownToLine className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                      <span>แบบฟอร์มคะแนน ปพ.5 (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลด Template สำหรับครูผู้สอนเพื่อกรอกคะแนนดิบ 100 คะแนน แล้วนำเข้าอัตโนมัติ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadGradeTemplate}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleGrades}
                      className="py-2 px-3 rounded-xl bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Table for Grades */}
              {previewGrades.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-950 dark:text-amber-100 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                      <span>ตรวจสอบคะแนนที่จะบันทึก ({previewGrades.length} รายการ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setGradePreviewPage(0); setPreviewGrades([]); }}
                      className="text-xs text-rose-700 dark:text-rose-300 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อมูลพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">รหัสนักเรียน</th>
                          <th className="px-3 py-2">รหัสวิชา</th>
                          <th className="px-3 py-2 text-center">คะแนนเก็บ (20)</th>
                          <th className="px-3 py-2 text-center">สอบย่อย (20)</th>
                          <th className="px-3 py-2 text-center">กลางภาค (30)</th>
                          <th className="px-3 py-2 text-center">ปลายภาค (30)</th>
                          <th className="px-3 py-2 text-center">รวม (100)</th>
                          <th className="px-3 py-2 text-center">เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewGrades.slice(gradePreviewPage * 5, (gradePreviewPage + 1) * 5).map((g, i) => (
                          <tr key={i} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold">{g.studentId}</td>
                            <td className="px-3 py-2 font-mono text-[var(--color-primary-text)] font-bold">{g.courseId}</td>
                            <td className="px-3 py-2 text-center">{g.assignmentScore}</td>
                            <td className="px-3 py-2 text-center">{g.quizScore}</td>
                            <td className="px-3 py-2 text-center">{g.midtermScore}</td>
                            <td className="px-3 py-2 text-center">{g.finalScore}</td>
                            <td className="px-3 py-2 text-center font-bold text-blue-700 dark:text-blue-300">{g.totalScore}</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300">{g.letterGrade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportGrades}
                      className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกผลการเรียน ปพ.5 ({previewGrades.length} รายการ)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 4: ทะเบียนนักเรียน (STUDENTS)       */}
          {/* ======================================= */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>ส่งออกทะเบียนประวัตินักเรียนทั้งหมด</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดรายชื่อนักเรียน {students.length} คน พร้อมรหัสประจำตัว ห้องเรียน ผู้ปกครอง และ GPAX
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportStudents}
                    className="w-full py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ส่งออกเป็นไฟล์ CSV (Excel UTF-8)</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <ArrowDownToLine className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      <span>แบบฟอร์มนำเข้านักเรียน (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดโครงสร้างหัวตารางมาตรฐาน เพื่อกรอกข้อมูลนักเรียนใหม่ได้อย่างถูกต้อง
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadStudentTemplate}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleStudents}
                      className="py-2 px-3 rounded-xl bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {previewStudents.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-950 dark:text-blue-100 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      <span>ตรวจสอบข้อมูลนักเรียนที่จะนำเข้า ({previewStudents.length} คน)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setStudentPreviewPage(0); setPreviewStudents([]); }}
                      className="text-xs text-rose-700 dark:text-rose-300 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อมูลพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">รหัสนักเรียน</th>
                          <th className="px-3 py-2">ชื่อ - นามสกุล</th>
                          <th className="px-3 py-2">ระดับชั้น / ห้อง</th>
                          <th className="px-3 py-2">GPAX</th>
                          <th className="px-3 py-2">ผู้ปกครอง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewStudents.slice(studentPreviewPage * 4, (studentPreviewPage + 1) * 4).map((st, i) => (
                          <tr key={i} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-[var(--color-primary-text)]">{st.studentIdNumber}</td>
                            <td className="px-3 py-2 font-medium text-[var(--color-text-title)]">{st.firstNameTh} {st.lastNameTh}</td>
                            <td className="px-3 py-2 text-[var(--color-text-muted)]">{st.room}</td>
                            <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-300">{st.gpa}</td>
                            <td className="px-3 py-2">{st.guardianName} ({st.guardianPhone})</td>
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
                      <span>ยืนยันบันทึกนักเรียนใหม่ ({previewStudents.length} คน) เข้าสู่ระบบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 5: ทะเบียนครู (TEACHERS)            */}
          {/* ======================================= */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">ส่งออกทะเบียนครูและบุคลากรทางการศึกษา</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">ดาวน์โหลดข้อมูลครู {teachers.length} ท่าน พร้อมกลุ่มสาระและวิทยฐานะ</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportTeachers}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออกไฟล์ CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 6: คลังข้อสอบ (QUESTIONS)           */}
          {/* ======================================= */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">ส่งออกคลังข้อสอบและแบบทดสอบ</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">ดาวน์โหลดข้อสอบ {questions.length} ข้อในระบบ พร้อมตัวเลือกและเฉลย</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportQuestions}
                  className="px-4 py-2 rounded-xl bg-pink-700 hover:bg-pink-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออกไฟล์ CSV</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)] shrink-0">
          <span>EduVerse Data Exchange Standard • RFC-4180 CSV Compliant</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold cursor-pointer transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
