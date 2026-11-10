import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';
import { Student, Teacher, QuizQuestion, AppLanguage } from '../types';

interface DataImportExportModalProps {
  students: Student[];
  teachers: Teacher[];
  questions: QuizQuestion[];
  lang: AppLanguage;
  onImportStudents: (newStudents: Student[]) => void;
  onImportTeachers: (newTeachers: Teacher[]) => void;
  onImportQuestions: (newQuestions: QuizQuestion[]) => void;
  onClose: () => void;
  initialTab?: 'students' | 'teachers' | 'questions';
}

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  students,
  teachers,
  questions,
  lang,
  onImportStudents,
  onImportTeachers,
  onImportQuestions,
  onClose,
  initialTab = 'students',
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'questions'>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preview States for Imported Data
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [previewTeachers, setPreviewTeachers] = useState<Teacher[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<QuizQuestion[]>([]);
  const [studentPreviewPage, setStudentPreviewPage] = useState(0);
  const [teacherPreviewPage, setTeacherPreviewPage] = useState(0);
  const [questionPreviewPage, setQuestionPreviewPage] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper: Trigger file download in browser
  const downloadFile = (filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;') => {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // Add BOM for Excel Thai language support
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      'ห้องเรียนเพิ่มเติม/ชมรม (Enrolled Rooms)',
      'เกรดเฉลี่ย (GPA)',
      'ชื่อผู้ปกครองหลัก',
      'ความสัมพันธ์',
      'เบอร์โทรผู้ปกครอง',
      'อีเมลผู้ปกครอง',
      'กรุ๊ปเลือด',
      'ประวัติการแพ้',
      'เบอร์โทรฉุกเฉิน'
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
      `"${(s.enrolledRooms || []).join(';')}"`,
      s.gpa || '0.00',
      `"${s.guardianName || ''}"`,
      `"${s.guardianRelation || ''}"`,
      `"${s.guardianPhone || ''}"`,
      `"${s.guardianEmail || ''}"`,
      s.bloodType || 'O',
      `"${(s.allergies || []).join(';')}"`,
      `"${s.emergencyPhone || s.guardianPhone || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`students_export_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast(lang === 'th' ? 'ส่งออกข้อมูลนักเรียนสำเร็จ (CSV)' : 'Students exported successfully');
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
      'enrolledRooms',
      'gpa',
      'guardianName',
      'guardianRelation',
      'guardianPhone',
      'guardianEmail',
      'bloodType',
      'allergies',
      'emergencyPhone'
    ];

    const sampleRow1 = [
      'ED-6910',
      '1-1002-00999-11-2',
      'กิตติกร',
      'เจริญกุล',
      'Kittikorn',
      'Charoenkul',
      'male',
      '2008-07-15',
      'มัธยมศึกษาปีที่ 4 (M.4)',
      'ห้อง 401 (วิทย์-คณิต)',
      'ห้อง 401;ชมรมหุ่นยนต์ AI',
      '3.88',
      'นายสมหมาย เจริญกุล',
      'บิดา',
      '081-234-5678',
      'sommai.c@gmail.com',
      'B',
      'อาหารทะเล',
      '081-234-5678'
    ];

    const sampleRow2 = [
      'ED-6911',
      '1-1002-00888-22-3',
      'นภัสสร',
      'สุวรรณภูมิ',
      'Napassorn',
      'Suwannaphum',
      'female',
      '2008-11-20',
      'มัธยมศึกษาปีที่ 4 (M.4)',
      'ห้อง 402 (ศิลป์-ภาษา)',
      'ห้อง 402;ชมรมการทูต Model UN',
      '3.95',
      'นางวรรณา สุวรรณภูมิ',
      'มารดา',
      '089-876-5432',
      'wanna.s@gmail.com',
      'O',
      'ไม่มี',
      '089-876-5432'
    ];

    const csvContent = [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');
    downloadFile('template_students_import.csv', csvContent);
    showToast(lang === 'th' ? 'ดาวน์โหลดแบบฟอร์มตัวอย่างนักเรียนแล้ว' : 'Student template downloaded');
  };

  const handleLoadSampleStudents = () => {
    const samples: Student[] = [
      {
        id: `stu-imp-${Date.now()}-1`,
        studentIdNumber: 'ED-6915',
        nationalId: '1-1002-00444-11-0',
        firstNameTh: 'สิรินธร',
        lastNameTh: 'บุญญาภินันท์',
        firstNameEn: 'Sirinthorn',
        lastNameEn: 'Boonyaphinant',
        gender: 'female',
        dateOfBirth: '2008-03-25',
        gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
        room: 'ห้อง 401 (วิทย์-คณิต)',
        enrolledRooms: ['ห้อง 401 (วิทย์-คณิต)', 'ห้อง AI Innovation Lab'],
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        gpa: 3.96,
        guardianName: 'นายธีรชัย บุญญาภินันท์',
        guardianRelation: 'บิดา',
        guardianPhone: '081-332-9988',
        guardianEmail: 'theerachai.b@gmail.com',
        guardians: [
          {
            id: 'g-imp-1',
            name: 'นายธีรชัย บุญญาภินันท์',
            relation: 'บิดา',
            phone: '081-332-9988',
            email: 'theerachai.b@gmail.com',
            isPrimary: true
          },
          {
            id: 'g-imp-2',
            name: 'นางพิมพา บุญญาภินันท์',
            relation: 'มารดา',
            phone: '089-112-4455',
            isPrimary: false
          }
        ],
        lineLinked: true,
        lineNotifyEnabled: true,
        enrolledDate: '2026-05-15',
        bloodType: 'A',
        allergies: ['เกสรดอกไม้']
      },
      {
        id: `stu-imp-${Date.now()}-2`,
        studentIdNumber: 'ED-6916',
        nationalId: '1-1002-00555-22-1',
        firstNameTh: 'ภาคภูมิ',
        lastNameTh: 'เกียรติขจร',
        firstNameEn: 'Phakphum',
        lastNameEn: 'Kiatkhachorn',
        gender: 'male',
        dateOfBirth: '2008-08-10',
        gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
        room: 'ห้อง 402 (ศิลป์-ภาษาอังกฤษ)',
        enrolledRooms: ['ห้อง 402 (ศิลป์-ภาษาอังกฤษ)', 'ชมรมดนตรีสากล'],
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        gpa: 3.65,
        guardianName: 'นางรัตนา เกียรติขจร',
        guardianRelation: 'มารดา',
        guardianPhone: '084-221-7788',
        guardianEmail: 'rattana.k@yahoo.com',
        guardians: [
          {
            id: 'g-imp-3',
            name: 'นางรัตนา เกียรติขจร',
            relation: 'มารดา',
            phone: '084-221-7788',
            isPrimary: true
          }
        ],
        lineLinked: false,
        lineNotifyEnabled: false,
        enrolledDate: '2026-05-15',
        bloodType: 'O',
        allergies: []
      }
    ];
    setStudentPreviewPage(0);
    setPreviewStudents(samples);
    showToast('โหลดข้อมูลตัวอย่างนักเรียน 2 รายการสำหรับทดสอบแล้ว');
  };

  const handleConfirmImportStudents = () => {
    if (previewStudents.length === 0) return;
    onImportStudents(previewStudents);
    showToast(`นำเข้าข้อมูลนักเรียน ${previewStudents.length} คนเข้าสู่ระบบสำเร็จ!`);
    setStudentPreviewPage(0);
    setPreviewStudents([]);
  };

  // ==========================================
  // 2. TEACHERS EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportTeachers = () => {
    const headers = [
      'รหัสประจำตัวครู (Teacher ID)',
      'ชื่อ-นามสกุล (ไทย)',
      'Full Name (EN)',
      'เพศ (Gender)',
      'อีเมล (Email)',
      'เบอร์โทรศัพท์',
      'วุฒิการศึกษา',
      'วิชาเอก/สาขา',
      'วิทยฐานะ (Academic Standing)',
      'กลุ่มสาระการเรียนรู้ (Department)',
      'เลขที่ใบอนุญาตคุรุสภา',
      'รายวิชาที่สอน (Teaching Subjects)',
      'ห้องประจำชั้น/ห้องที่สอน (Homeroom / Classes)',
      'ระดับชั้นที่สอน (Teaching Grades)',
      'สิทธิ์ผู้ดูแลระบบโรงเรียน (Is School Admin)'
    ];

    const rows = teachers.map(t => [
      t.teacherIdNumber,
      `"${t.fullNameTh}"`,
      `"${t.fullNameEn}"`,
      t.gender,
      t.email,
      `"${t.phone}"`,
      `"${t.academicDegree}"`,
      `"${t.major}"`,
      `"${t.academicStanding}"`,
      `"${t.department}"`,
      `"${t.teacherLicenseNo}"`,
      `"${(t.teachingSubjects || []).join(';')}"`,
      `"${(t.homeroomClasses || []).join(';')}"`,
      `"${(t.teachingGrades || []).join(';')}"`,
      t.isSchoolAdmin ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`teachers_export_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast(lang === 'th' ? 'ส่งออกข้อมูลอาจารย์สำเร็จ (CSV)' : 'Teachers exported successfully');
  };

  const handleDownloadTeacherTemplate = () => {
    const headers = [
      'teacherIdNumber',
      'fullNameTh',
      'fullNameEn',
      'gender',
      'email',
      'phone',
      'academicDegree',
      'major',
      'academicStanding',
      'department',
      'teacherLicenseNo',
      'teachingSubjects',
      'homeroomClasses',
      'teachingGrades',
      'isSchoolAdmin'
    ];

    const sampleRow = [
      'TCH-2024-0099',
      'อ.อนุชา วัฒนศิริ',
      'Mr. Anucha Wattanasiri',
      'male',
      'anucha.w@eduverse.ac.th',
      '081-555-4321',
      'ปริญญาโท กศ.ม. การสอนฟิสิกส์',
      'ฟิสิกส์และดาราศาสตร์',
      'ครูชำนาญการพิเศษ (คศ.3)',
      'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
      'คส. 6010900012345',
      'ว31201 ฟิสิกส์ 1 (ม.4);ว32202 ฟิสิกส์ 2 (ม.5)',
      'ห้อง 401;ห้อง 402;ห้อง 501',
      'มัธยมศึกษาปีที่ 4 (M.4);มัธยมศึกษาปีที่ 5 (M.5)',
      'YES'
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    downloadFile('template_teachers_import.csv', csvContent);
    showToast('ดาวน์โหลดแบบฟอร์มตัวอย่างคุณครูแล้ว');
  };

  const handleLoadSampleTeachers = () => {
    const samples: Teacher[] = [
      {
        id: `tch-imp-${Date.now()}-1`,
        schoolId: 'sch-1',
        teacherIdNumber: 'TCH-2024-0060',
        fullNameTh: 'อ.ดร.กมลทิพย์ ศรีสวัสดิ์',
        fullNameEn: 'Dr. Kamonthip Srisawat, Ph.D.',
        gender: 'female',
        email: 'kamonthip.s@eduverse.ac.th',
        phone: '082-998-3344',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        academicDegree: 'ปริญญาเอก Ph.D. in STEM Education',
        major: 'การวิจัยนวัตกรรมการเรียนรู้และเคมีประยุกต์',
        academicStanding: 'ครูเชี่ยวชาญ (คศ.4)',
        department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
        teacherLicenseNo: 'คส. 5710900088991',
        teachingSubjects: ['ว31221 เคมี 1 (ม.4)', 'ว32222 เคมี 2 (ม.5)', 'ว30299 นาโนเทคโนโลยี'],
        homeroomClasses: ['ห้อง 401 (วิทย์-คณิต)', 'ห้อง 501 (วิทย์-คณิต)', 'ห้อง 601 (ห้องพิเศษ STEM)'],
        teachingGrades: ['มัธยมศึกษาปีที่ 4 (M.4)', 'มัธยมศึกษาปีที่ 5 (M.5)', 'มัธยมศึกษาปีที่ 6 (M.6)'],
        isSchoolAdmin: true, // ครูมีสิทธิ์เป็น admin
        lineUserId: 'Ukamonthip_official',
        lineLinked: true
      }
    ];
    setTeacherPreviewPage(0);
    setPreviewTeachers(samples);
    showToast('โหลดข้อมูลตัวอย่างคุณครูสำหรับทดสอบแล้ว (สอนหลายห้อง และมีสิทธิ์ Admin)');
  };

  const handleConfirmImportTeachers = () => {
    if (previewTeachers.length === 0) return;
    onImportTeachers(previewTeachers);
    showToast(`นำเข้าข้อมูลคุณครู ${previewTeachers.length} ท่านเข้าสู่ระบบสำเร็จ!`);
    setTeacherPreviewPage(0);
    setPreviewTeachers([]);
  };

  // ==========================================
  // 3. QUESTIONS EXPORT / TEMPLATE / IMPORT
  // ==========================================
  const handleExportQuestions = () => {
    const headers = [
      'วิชา (Subject)',
      'ระดับชั้น (Grade Level)',
      'หมวดหมู่ (Category)',
      'คำถาม (ภาษาไทย)',
      'Question (English)',
      'ตัวเลือก ก / A',
      'ตัวเลือก ข / B',
      'ตัวเลือก ค / C',
      'ตัวเลือก ง / D',
      'ตัวเลือกที่ถูกต้อง (Index 0-3)',
      'คำอธิบายเฉลย (Explanation)'
    ];

    const rows = questions.map(q => [
      `"${q.subject}"`,
      `"${q.gradeLevel}"`,
      q.category,
      `"${q.questionTh.replace(/"/g, '""')}"`,
      `"${(q.questionEn || '').replace(/"/g, '""')}"`,
      `"${(q.options[0] || '').replace(/"/g, '""')}"`,
      `"${(q.options[1] || '').replace(/"/g, '""')}"`,
      `"${(q.options[2] || '').replace(/"/g, '""')}"`,
      `"${(q.options[3] || '').replace(/"/g, '""')}"`,
      q.correctIndex,
      `"${(q.explanationTh || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`quiz_questions_export_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    showToast(lang === 'th' ? 'ส่งออกคลังข้อสอบสำเร็จ (CSV)' : 'Questions exported successfully');
  };

  const handleDownloadQuestionTemplate = () => {
    const headers = [
      'subject',
      'gradeLevel',
      'category',
      'questionTh',
      'questionEn',
      'optionA',
      'optionB',
      'optionC',
      'optionD',
      'correctIndex',
      'explanationTh'
    ];

    const sampleRow1 = [
      'วิทยาศาสตร์ AI',
      'ม.4',
      'exam',
      'อัลกอริทึมใดจัดเป็น Supervised Learning ใน Machine Learning?',
      'Which algorithm is considered Supervised Learning?',
      'Linear Regression',
      'K-Means Clustering',
      'PCA Dimensionality Reduction',
      'Apriori Association Rule',
      '0',
      'Linear Regression ต้องการ Target Label จึงเป็น Supervised Learning'
    ];

    const sampleRow2 = [
      'คณิตศาสตร์',
      'ม.4',
      'standard_exam',
      'ถ้า log10(x) = 3 ค่าของ x เท่ากับข้อใด?',
      'If log10(x) = 3, what is the value of x?',
      '30',
      '100',
      '1000',
      '3000',
      '2',
      'จากนิยามลอการิทึม x = 10^3 = 1000'
    ];

    const csvContent = [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');
    downloadFile('template_quiz_questions_import.csv', csvContent);
    showToast('ดาวน์โหลดแบบฟอร์มตัวอย่างข้อสอบแล้ว');
  };

  const handleLoadSampleQuestions = () => {
    const samples: QuizQuestion[] = [
      {
        id: `q-imp-${Date.now()}-1`,
        subject: 'วิทยาการคำนวณและปัญญาประดิษฐ์',
        gradeLevel: 'ม.4',
        questionTh: 'โมเดล Deep Learning โครงข่ายประสาทเทียมแบบใดที่ได้รับความนิยมสูงสุดในการประมวลผลภาษาธรรมชาติ (NLP) ในปัจจุบัน?',
        questionEn: 'Which Deep Learning architecture is most widely used in modern NLP?',
        options: ['Transformer Architecture', 'Recurrent Neural Network (RNN)', 'Simple Perceptron', 'Decision Tree'],
        correctIndex: 0,
        explanationTh: 'สถาปัตยกรรม Transformer พร้อมกลไก Self-Attention คือรากฐานของโมเดลภาษาขนาดใหญ่ (LLM) ในปัจจุบัน',
        category: 'exam',
        points: 150
      },
      {
        id: `q-imp-${Date.now()}-2`,
        subject: 'สุขศึกษาและสุขภาพ',
        gradeLevel: 'ม.4',
        questionTh: 'กรุ๊ปเลือดใดที่ถือเป็น ผู้รับสากล (Universal Recipient) ของเม็ดเลือดแดง?',
        questionEn: 'Which blood type is considered the Universal Recipient?',
        options: ['กรุ๊ป O', 'กรุ๊ป A', 'กรุ๊ป B', 'กรุ๊ป AB'],
        correctIndex: 3,
        explanationTh: 'ผู้มีเลือดกรุ๊ป AB ไม่มีแอนติบอดีต่อต้านทั้งสาร A และ B จึงสามารถรับเม็ดเลือดแดงได้จากทุกหมู่เลือด',
        category: 'general',
        points: 100
      }
    ];
    setQuestionPreviewPage(0);
    setPreviewQuestions(samples);
    showToast('โหลดข้อมูลตัวอย่างข้อสอบ 2 ข้อสำหรับทดสอบแล้ว');
  };

  const handleConfirmImportQuestions = () => {
    if (previewQuestions.length === 0) return;
    onImportQuestions(previewQuestions);
    showToast(`นำเข้าข้อสอบใหม่ ${previewQuestions.length} ข้อเข้าสู่คลัง "ล่าสมบัติ 3D" สำเร็จ!`);
    setQuestionPreviewPage(0);
    setPreviewQuestions([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-4xl bg-[var(--color-card)] rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[92vh]">
        
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
                  {lang === 'th' ? 'ศูนย์นำเข้า - ส่งออกข้อมูลสถานศึกษา (Data Hub)' : 'School Data Import & Export Center'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900 text-blue-100 border border-blue-600 font-bold">
                  EXCEL / CSV
                </span>
              </div>
              <p className="text-xs text-slate-200">
                {lang === 'th'
                  ? 'ส่งออกและนำเข้าข้อมูลนักเรียน, คุณครู, และคลังข้อสอบด้วยไฟล์มาตรฐาน เพื่อการบริหารจัดการที่รวดเร็ว'
                  : 'Batch import & export students, teachers, and question bank with standardized templates'}
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
        <div className="px-6 pt-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ทะเบียนนักเรียน ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'teachers'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>ทะเบียนคุณครู & บุคลากร ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'questions'
                ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)] rounded-t-xl shadow-xs'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>คลังข้อสอบ & แบบทดสอบ ({questions.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[var(--color-card)] text-[var(--color-text-body)] space-y-4">

          {/* ======================================= */}
          {/* TAB 1: นักเรียน (STUDENTS)              */}
          {/* ======================================= */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ส่งออกข้อมูลนักเรียนทั้งหมด</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดรายชื่อนักเรียน {students.length} คน พร้อมรหัสประจำตัว, แผนการเรียน, ผู้ปกครอง, ผลการเรียน และข้อมูลสุขภาพเป็นไฟล์ CSV
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportStudents}
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
                      <ArrowDownToLine className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                      <span>แบบฟอร์มนำเข้า (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดโครงสร้างหัวตารางมาตรฐาน เพื่อกรอกข้อมูลนักเรียนใหม่ได้อย่างถูกต้องครบถ้วน
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
                      className="py-2 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                      title="โหลดข้อมูลตัวอย่างเพื่อทดสอบทันที"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview & Import Table */}
              {previewStudents.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-blue-300 dark:border-blue-700 bg-blue-100 dark:bg-blue-950">
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
                      <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2">รหัสนักเรียน</th>
                          <th className="px-3 py-2">ชื่อ - นามสกุล</th>
                          <th className="px-3 py-2">ระดับชั้น / ห้อง</th>
                          <th className="px-3 py-2">GPAX</th>
                          <th className="px-3 py-2">ผู้ปกครอง & ความสัมพันธ์</th>
                          <th className="px-3 py-2">เบอร์โทรศัพท์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewStudents.slice(studentPreviewPage * 4, (studentPreviewPage + 1) * 4).map((st, i) => (
                          <tr key={i} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-[var(--color-primary-text)]">{st.studentIdNumber}</td>
                            <td className="px-3 py-2 font-medium text-[var(--color-text-title)]">{st.firstNameTh} {st.lastNameTh}</td>
                            <td className="px-3 py-2 text-[var(--color-text-muted)]">{st.room}</td>
                            <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-300">{st.gpa}</td>
                            <td className="px-3 py-2 text-[var(--color-text-body)]">
                              {st.guardianName} ({st.guardianRelation})
                              {st.guardians && st.guardians.length > 1 && (
                                <span className="ml-1 text-[10px] text-[var(--color-primary-text)] font-bold">+{st.guardians.length - 1} คน</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">{st.guardianPhone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewStudents.length > 4 && (
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                      <button type="button" onClick={() => setStudentPreviewPage(page => Math.max(0, page - 1))} disabled={studentPreviewPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                      <span className="font-medium">หน้า {studentPreviewPage + 1} / {Math.ceil(previewStudents.length / 4)} · {previewStudents.length} คน</span>
                      <button type="button" onClick={() => setStudentPreviewPage(page => Math.min(Math.ceil(previewStudents.length / 4) - 1, page + 1))} disabled={studentPreviewPage >= Math.ceil(previewStudents.length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ถัดไป</button>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportStudents}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
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
          {/* TAB 2: คุณครู (TEACHERS)                */}
          {/* ======================================= */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ส่งออกข้อมูลคุณครูทั้งหมด</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดรายชื่อคุณครู {teachers.length} ท่าน พร้อมวิทยฐานะ, กลุ่มสาระ, ห้องที่สอนหลายห้อง, และสิทธิ์การเป็น Admin โรงเรียน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportTeachers}
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
                      <span>แบบฟอร์มนำเข้าคุณครู (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลด Template พร้อมโครงสร้างระบุหลายห้องเรียน หลายชั้นเรียน และสิทธิ์ผู้ดูแลระบบโรงเรียน
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTeacherTemplate}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleTeachers}
                      className="py-2 px-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                      title="โหลดข้อมูลตัวอย่างเพื่อทดสอบทันที"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview & Import Table */}
              {previewTeachers.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-indigo-300 dark:border-indigo-700 bg-indigo-100 dark:bg-indigo-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-100 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
                      <span>ตรวจสอบข้อมูลคุณครูที่จะนำเข้า ({previewTeachers.length} ท่าน)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTeacherPreviewPage(0); setPreviewTeachers([]); }}
                      className="text-xs text-rose-700 dark:text-rose-300 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อมูลพรีวิว</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2">รหัสประจำตัว</th>
                          <th className="px-3 py-2">ชื่อ - นามสกุล</th>
                          <th className="px-3 py-2">กลุ่มสาระฯ / วิทยฐานะ</th>
                          <th className="px-3 py-2">ห้องและระดับชั้นที่สอน</th>
                          <th className="px-3 py-2">สิทธิ์ Admin โรงเรียน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {previewTeachers.slice(teacherPreviewPage * 4, (teacherPreviewPage + 1) * 4).map((tc, i) => (
                          <tr key={i} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="px-3 py-2 font-mono font-bold text-indigo-700 dark:text-indigo-300">{tc.teacherIdNumber}</td>
                            <td className="px-3 py-2 font-medium text-[var(--color-text-title)]">{tc.fullNameTh}</td>
                            <td className="px-3 py-2 text-[var(--color-text-muted)]">{tc.department} ({tc.academicStanding})</td>
                            <td className="px-3 py-2 text-[var(--color-text-body)]">
                              <span className="font-medium text-[var(--color-primary-text)]">{(tc.homeroomClasses || []).join(', ')}</span>
                            </td>
                            <td className="px-3 py-2">
                              {tc.isSchoolAdmin ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
                                  🛡️ มีสิทธิ์ Admin
                                </span>
                              ) : (
                                <span className="text-[var(--color-text-muted)] text-[11px]">อาจารย์ผู้สอน</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewTeachers.length > 4 && (
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                      <button type="button" onClick={() => setTeacherPreviewPage(page => Math.max(0, page - 1))} disabled={teacherPreviewPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                      <span className="font-medium">หน้า {teacherPreviewPage + 1} / {Math.ceil(previewTeachers.length / 4)} · {previewTeachers.length} คน</span>
                      <button type="button" onClick={() => setTeacherPreviewPage(page => Math.min(Math.ceil(previewTeachers.length / 4) - 1, page + 1))} disabled={teacherPreviewPage >= Math.ceil(previewTeachers.length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ถัดไป</button>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportTeachers}
                      className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>ยืนยันบันทึกคุณครูใหม่ ({previewTeachers.length} ท่าน)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: ข้อสอบ (QUESTIONS)               */}
          {/* ======================================= */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--color-text-title)] font-bold text-sm">
                      <Download className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ส่งออกคลังข้อสอบทั้งหมด</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลดข้อสอบ {questions.length} ข้อในระบบ พร้อมตัวเลือก, เฉลย และคำอธิบายเป็นไฟล์ CSV
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportQuestions}
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
                      <ArrowDownToLine className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                      <span>แบบฟอร์มนำเข้าข้อสอบ (Template)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      ดาวน์โหลด Template พร้อมโครงสร้าง 4 ตัวเลือก และคำอธิบายเฉลย เพื่อใช้ในเกม "ล่าสมบัติ 3D" และ LMS
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadQuestionTemplate}
                      className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleQuestions}
                      className="py-2 px-3 rounded-xl bg-purple-100 dark:bg-purple-950 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                      title="โหลดข้อสอบตัวอย่างเพื่อทดสอบทันที"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>โหลดตัวอย่าง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview & Import Table */}
              {previewQuestions.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl border border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-950 dark:text-purple-100 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                      <span>ตรวจสอบข้อสอบใหม่ที่จะนำเข้า ({previewQuestions.length} ข้อ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setQuestionPreviewPage(0); setPreviewQuestions([]); }}
                      className="text-xs text-rose-700 dark:text-rose-300 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างข้อมูลพรีวิว</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {previewQuestions.slice(questionPreviewPage * 2, (questionPreviewPage + 1) * 2).map((q, i) => (
                      <div key={i} className="p-3 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-700 dark:text-purple-300">ข้อที่ {questionPreviewPage * 2 + i + 1} • {q.subject} ({q.gradeLevel})</span>
                          <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700 text-[10px] font-bold">
                            เฉลยข้อ: {['ก (A)', 'ข (B)', 'ค (C)', 'ง (D)'][q.correctIndex]}
                          </span>
                        </div>
                        <p className="font-medium text-[var(--color-text-title)]">{q.questionTh}</p>
                        <div className="grid grid-cols-2 gap-2 text-[var(--color-text-body)] pt-1">
                          {q.options.map((opt, optIdx) => (
                            <div 
                              key={optIdx} 
                              className={`p-1.5 rounded-lg border text-[11px] ${
                                optIdx === q.correctIndex 
                                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold' 
                                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                              }`}
                            >
                              {['ก.', 'ข.', 'ค.', 'ง.'][optIdx]} {opt}
                            </div>
                          ))}
                        </div>
                        {q.explanationTh && (
                          <div className="text-[11px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
                            💡 <span className="font-medium">คำอธิบายเฉลย:</span> {q.explanationTh}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {previewQuestions.length > 2 && (
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                      <button type="button" onClick={() => setQuestionPreviewPage(page => Math.max(0, page - 1))} disabled={questionPreviewPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                      <span className="font-medium">หน้า {questionPreviewPage + 1} / {Math.ceil(previewQuestions.length / 2)} · {previewQuestions.length} ข้อ</span>
                      <button type="button" onClick={() => setQuestionPreviewPage(page => Math.min(Math.ceil(previewQuestions.length / 2) - 1, page + 1))} disabled={questionPreviewPage >= Math.ceil(previewQuestions.length / 2) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ถัดไป</button>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImportQuestions}
                      className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>นำเข้าข้อสอบใหม่ ({previewQuestions.length} ข้อ) เข้าสู่คลังล่าสมบัติ 3D</span>
                    </button>
                  </div>
                </div>
              )}
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
