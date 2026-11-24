import React, { useState } from 'react';
import { Award, BookOpen, Users } from 'lucide-react';
import { GradebookView } from '../views/GradebookView';
import { StudentQualityDevelopmentBookView } from '../views/StudentQualityDevelopmentBookView';
import type { Course, GradeRecord, School, Student, SystemConfig } from '../types';

const previewSchool: School = {
  id: 'preview-school',
  code: 'DEMO-001',
  nameTh: 'โรงเรียนตัวอย่าง',
  nameEn: 'Sample School',
  slug: 'sample-school',
  type: 'public',
  province: 'กรุงเทพมหานคร',
  address: 'ข้อมูลสำหรับแสดงตัวอย่าง',
  phone: '',
  email: 'school@example.test',
  primaryColor: '#0f766e',
  studentsCount: 6,
  teachersCount: 1,
  academicYear: '2569 (2026)',
  currentSemester: '2',
  lineOaId: '',
  createdAt: '2026-01-01',
  status: 'active',
};

const previewSystemConfig: SystemConfig = {
  schoolNameEn: 'Sample School',
  schoolNameTh: 'โรงเรียนตัวอย่าง',
  academicYear: '2569 (2026)',
  currentSemester: '2',
  semesterOptions: ['1', '2'],
  gradingSystem: 'thai',
  staffPositionOptions: [],
  lineOaAddFriendUrl: '',
  lineChannelId: '',
  lineMessagingConfigured: false,
  resendApiKeyConfigured: false,
  resendFromEmail: '',
  supabaseConnected: false,
  thaiPdfFontEnabled: false,
  backupBucket: '',
  lastBackupDate: '',
};

const previewStudents: Student[] = [
  ['preview-student-01', 'ด.ญ. กานต์พิชชา', 'ตัวอย่าง', 'STU-0001', 'ม.3/1'],
  ['preview-student-02', 'ด.ช. ธนกร', 'เรียนดี', 'STU-0002', 'ม.3/1'],
  ['preview-student-03', 'ด.ญ. พิมพ์ชนก', 'ตั้งใจ', 'STU-0003', 'ม.3/1'],
  ['preview-student-04', 'ด.ช. ภูริณัฐ', 'ขยันเรียน', 'STU-0004', 'ม.3/1'],
  ['preview-student-05', 'ด.ญ. ณัฐวดี', 'มีวินัย', 'STU-0005', 'ม.3/1'],
  ['preview-student-06', 'ด.ช. กิตติพงษ์', 'สร้างสรรค์', 'STU-0006', 'ม.3/1'],
].map(([id, firstNameTh, lastNameTh, studentIdNumber, room]) => ({
  id,
  schoolId: previewSchool.id,
  studentIdNumber,
  firstNameTh,
  lastNameTh,
  firstNameEn: 'Sample',
  lastNameEn: id.slice(-2),
  gender: 'other',
  dateOfBirth: '2012-01-01',
  gradeLevel: 'มัธยมศึกษาปีที่ 3',
  room,
  status: 'active',
  avatarUrl: '',
  gpa: 3.25,
  guardianName: 'ผู้ปกครองตัวอย่าง',
  guardianRelation: 'ผู้ปกครอง',
  guardianPhone: '',
  guardianEmail: '',
  lineLinked: false,
  lineNotifyEnabled: false,
  enrolledDate: '2024-05-01',
}));

const previewCourses: Course[] = [
  {
    id: 'preview-course-thai',
    schoolId: previewSchool.id,
    code: 'ท23101',
    titleEn: 'Thai Language',
    titleTh: 'ภาษาไทย',
    category: 'core',
    credits: 1.5,
    teacherName: 'ครูตัวอย่าง',
    teacherEmail: 'teacher@example.test',
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    schedule: 'วันจันทร์ · คาบ 1',
    room: 'ม.3/1',
    academicYear: '2569 (2026)',
    semester: '2',
    enrolledStudentIds: previewStudents.map((student) => student.id),
    description: 'รายวิชาตัวอย่างสำหรับแสดงหน้าจอ',
  },
];

const previewGrades: GradeRecord[] = previewStudents.map((student, index) => {
  const assignmentScore = 14 + (index % 5);
  const midtermScore = 20 + (index % 8);
  const finalScore = 28 + (index % 10);
  const quizScore = 7 + (index % 4);
  const totalScore = assignmentScore + midtermScore + finalScore + quizScore;
  return {
    id: `preview-grade-${student.id}`,
    schoolId: previewSchool.id,
    studentId: student.id,
    courseId: previewCourses[0].id,
    academicYear: '2569 (2026)',
    semester: '2',
    midtermScore,
    finalScore,
    assignmentScore,
    quizScore,
    totalScore,
    letterGrade: totalScore >= 80 ? '4' : totalScore >= 70 ? '3' : '2',
    gradePoint: totalScore >= 80 ? 4 : totalScore >= 70 ? 3 : 2,
  };
});

type PreviewTab = 'gradebook' | 'development';

export const UiPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PreviewTab>('gradebook');

  return (
    <div className="app-workspace flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[var(--color-canvas)] p-2 text-[var(--color-text-body)] sm:p-3">
      <header className="app-page-header flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">ตัวอย่างปรับหน้าทะเบียนนักเรียน</h1>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              ข้อมูลสมมติ · ไม่เชื่อมฐานข้อมูลและไม่บันทึกการเปลี่ยนแปลง
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          ตัวอย่างเฉพาะเครื่อง
        </span>
      </header>

      <nav aria-label="หน้าตัวอย่าง" className="mt-2 flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        <button
          type="button"
          aria-current={activeTab === 'gradebook' ? 'page' : undefined}
          onClick={() => setActiveTab('gradebook')}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs ${
            activeTab === 'gradebook'
              ? 'border-[var(--color-primary)] font-semibold text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          บันทึกคะแนน &amp; ปพ.
        </button>
        <button
          type="button"
          aria-current={activeTab === 'development' ? 'page' : undefined}
          onClick={() => setActiveTab('development')}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs ${
            activeTab === 'development'
              ? 'border-[var(--color-primary)] font-semibold text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          สมุดคุณภาพผู้เรียน
        </button>
      </nav>

      <main className="mt-2 min-h-0 flex-1 overflow-hidden">
        {activeTab === 'gradebook' ? (
          <GradebookView
            students={previewStudents}
            courses={previewCourses}
            grades={previewGrades}
            systemConfig={previewSystemConfig}
            school={previewSchool}
            currentRole="admin"
            canEditGrades={false}
            onUpdateGrade={() => undefined}
            onOpenReportCard={() => undefined}
            initialCourseId={previewCourses[0].id}
            initialTab="pp5"
            embeddedInStudentManagement
            lang="th"
          />
        ) : (
          <StudentQualityDevelopmentBookView
            students={previewStudents}
            courses={previewCourses}
            grades={previewGrades}
            attendance={[]}
            behaviorRecords={[]}
            sdqAssessments={[]}
            systemConfig={previewSystemConfig}
            school={previewSchool}
            currentRole="admin"
            initialStudentId={previewStudents[0].id}
            onOpenReportCard={() => undefined}
            onOpenCoreReportCard={() => undefined}
            onOpenQualitativeSummary={() => undefined}
            lang="th"
          />
        )}
      </main>
    </div>
  );
};
