import React, { useState } from 'react';
import { Student } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MessageSquare, 
  Award, 
  Phone, 
  Mail, 
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Camera
} from 'lucide-react';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';
import { PagedList } from './PagedList';

const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 8
}: {
  items: readonly T[];
  colSpan: number;
  renderRow: (item: T) => React.ReactNode;
  pageSize?: number;
}) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <>
      {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(renderRow)}
      {pageCount > 1 && (
        <tr>
          <td colSpan={colSpan} className="p-2">
            <div className="flex items-center justify-between">
              <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
              <span className="text-[11px] text-[var(--color-text-muted)]">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface StudentsViewProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onOpenReportCard: (student: Student) => void;
  onToggleLineSync: (studentId: string) => void;
  onAddStudent: (newStudent: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onOpenImportExport?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onSelectStudent,
  onOpenReportCard,
  onToggleLineSync,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onOpenImportExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics'>('roster');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [studentFormStep, setStudentFormStep] = useState<1 | 2>(1);

  // New student form state
  const [formData, setFormData] = useState({
    firstNameEn: '',
    lastNameEn: '',
    firstNameTh: '',
    lastNameTh: '',
    studentIdNumber: `ED-${Math.floor(6900 + Math.random() * 90)}`,
    nationalId: '1-1002-00' + Math.floor(100 + Math.random() * 899) + '-44-1',
    gender: 'male' as 'male' | 'female' | 'other',
    dateOfBirth: '2008-05-10',
    gradeLevel: 'Grade 10 (M.4)',
    room: 'Room 401 (Sci-Math)',
    guardianName: '',
    guardianPhone: '081-',
    guardianEmail: '',
    gpa: 3.50,
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  });

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.firstNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.firstNameTh.includes(searchTerm) ||
      s.lastNameTh.includes(searchTerm) ||
      s.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.room.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrade = gradeFilter === 'all' || s.gradeLevel.includes(gradeFilter);

    return matchesSearch && matchesGrade;
  });

  const handleOpenEdit = (student: Student) => {
    setStudentFormStep(1);
    setEditingStudent(student);
    setFormData({
      firstNameEn: student.firstNameEn,
      lastNameEn: student.lastNameEn,
      firstNameTh: student.firstNameTh,
      lastNameTh: student.lastNameTh,
      studentIdNumber: student.studentIdNumber,
      nationalId: student.nationalId || '',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      gradeLevel: student.gradeLevel,
      room: student.room,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      guardianEmail: student.guardianEmail,
      gpa: student.gpa,
      avatarUrl: student.avatarUrl,
    });
    setShowAddModal(true);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstNameEn || !formData.lastNameEn || !formData.firstNameTh) return;

    if (editingStudent) {
      const updated: Student = {
        ...editingStudent,
        firstNameEn: formData.firstNameEn,
        lastNameEn: formData.lastNameEn,
        firstNameTh: formData.firstNameTh,
        lastNameTh: formData.lastNameTh,
        studentIdNumber: formData.studentIdNumber,
        nationalId: formData.nationalId,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        gradeLevel: formData.gradeLevel,
        room: formData.room,
        guardianName: formData.guardianName || 'Parent / Guardian',
        guardianPhone: formData.guardianPhone || '081-000-0000',
        guardianEmail: formData.guardianEmail || 'guardian@email.com',
        gpa: Number(formData.gpa),
        avatarUrl: formData.avatarUrl || editingStudent.avatarUrl,
      };
      onUpdateStudent?.(updated);
      setEditingStudent(null);
      setShowAddModal(false);
      return;
    }

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      studentIdNumber: formData.studentIdNumber,
      nationalId: formData.nationalId,
      firstNameEn: formData.firstNameEn,
      lastNameEn: formData.lastNameEn,
      firstNameTh: formData.firstNameTh,
      lastNameTh: formData.lastNameTh,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      gradeLevel: formData.gradeLevel,
      room: formData.room,
      status: 'active',
      avatarUrl: formData.gender === 'female' 
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
      gpa: Number(formData.gpa),
      guardianName: formData.guardianName || 'Parent / Guardian',
      guardianRelation: 'Guardian',
      guardianPhone: formData.guardianPhone || '081-000-0000',
      guardianEmail: formData.guardianEmail || 'guardian@email.com',
      lineLinked: false,
      lineNotifyEnabled: false,
      enrolledDate: '2026-05-15',
    };

    onAddStudent(newStudent);
    setShowAddModal(false);
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Header controls */}
      <div className="shrink-0 p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary-text)]" />
            <span>ระบบทะเบียนนักเรียน (DMC / SIS)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold">
              DMC สพฐ.
            </span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            จัดการข้อมูลทะเบียนนักเรียน เลขประจำตัวประชาชน 13 หลัก (DMC), สิทธิทุนยากจน (CCT), ผู้ปกครอง และสถานะแจ้งเตือน LINE OA
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap shrink-0">
          {onOpenImportExport && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              <span>นำเข้า/ส่งออก (Excel)</span>
            </button>
          )}

          <button
            onClick={() => {
              setStudentFormStep(1);
              setEditingStudent(null);
              setFormData({
                firstNameEn: '',
                lastNameEn: '',
                firstNameTh: '',
                lastNameTh: '',
                studentIdNumber: `ED-${Math.floor(6900 + Math.random() * 90)}`,
                nationalId: '1-1002-00' + Math.floor(100 + Math.random() * 899) + '-44-1',
                gender: 'male' as 'male' | 'female' | 'other',
                dateOfBirth: '2008-05-10',
                gradeLevel: 'Grade 10 (M.4)',
                room: 'Room 401 (Sci-Math)',
                guardianName: '',
                guardianPhone: '081-',
                guardianEmail: '',
                gpa: 3.50,
                avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="shrink-0 flex items-center gap-2 border-b border-[var(--color-border)] pb-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>ทะเบียนรายชื่อ ({filteredStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>สรุปสถิติห้องเรียน & LINE OA</span>
        </button>
      </div>

      {activeTab === 'roster' && (
        <>
          {/* Filter and Search Bar */}
          <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, English name, or ชื่อภาษาไทย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <Filter className="w-3.5 h-3.5" />
                <span>Grade Level:</span>
              </div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">All Grades</option>
                <option value="10">Grade 10 (M.4)</option>
                <option value="11">Grade 11 (M.5)</option>
                <option value="12">Grade 12 (M.6)</option>
              </select>

              <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                Showing <strong className="text-[var(--color-text-title)]">{filteredStudents.length}</strong> students
              </span>
            </div>
          </div>

          {/* Students Table with Sticky Header */}
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[var(--color-card-subtle)] text-[var(--color-text-title)] uppercase tracking-wider font-semibold border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Thai Name</th>
                  <th className="py-3 px-4">Class &amp; Room</th>
                  <th className="py-3 px-4">GPA</th>
                  <th className="py-3.5 px-4">Guardian / LINE OA</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <PaginatedTableRows items={filteredStudents} colSpan={6} renderRow={(student) => (
                  <tr key={student.id} className="hover:bg-[var(--color-card-subtle)] transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatarUrl}
                          alt={student.firstNameEn}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-[var(--color-text-title)] group-hover:text-[var(--color-primary-text)] transition-colors">
                            {student.firstNameEn} {student.lastNameEn}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--color-primary-text)]">
                            {student.studentIdNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[var(--color-text-title)] font-medium">
                        {student.firstNameTh} {student.lastNameTh}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        ID: {student.nationalId || 'N/A'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[var(--color-text-title)] font-medium">{student.gradeLevel}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{student.room}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                        student.gpa >= 3.5 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' 
                          : student.gpa >= 3.0 
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                          : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                      }`}>
                        {student.gpa.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[var(--color-text-body)] font-medium">{student.guardianName} ({student.guardianRelation})</div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => onToggleLineSync(student.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors border cursor-pointer ${
                            student.lineLinked
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
                          }`}
                          title={student.lineLinked ? 'LINE Connected (Click to toggle)' : 'Not Connected to LINE (Click to link)'}
                        >
                          <MessageSquare className="w-2.5 h-2.5 fill-current" />
                          {student.lineLinked ? 'LINE Linked' : 'Connect LINE'}
                        </button>
                        <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" /> {student.guardianPhone}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenReportCard(student)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] hover:opacity-90 border border-[var(--color-border)] text-[var(--color-primary-text)] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Thai/English Transcript"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Report Card</span>
                        </button>

                        <button
                          onClick={() => onSelectStudent(student)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-medium transition-colors cursor-pointer"
                        >
                          Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-primary-text)] transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ต้องการลบข้อมูลนักเรียน ${student.firstNameTh} ${student.lastNameTh} (${student.studentIdNumber}) ออกจากระบบหรือไม่?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )} />
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">นักเรียนทั้งหมด</span>
              <div className="text-2xl font-black text-[var(--color-text-title)] mt-1">{students.length} คน</div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">ในโรงเรียนปัจจุบัน</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">เชื่อมต่อ LINE OA แล้ว</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {students.filter(s => s.lineLinked).length} คน
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                {students.length > 0 ? Math.round((students.filter(s => s.lineLinked).length / students.length) * 100) : 0}% อัตราเชื่อมต่อ
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">เปิดรับแจ้งเตือนอัตโนมัติ</span>
              <div className="text-2xl font-black text-[var(--color-primary-text)] mt-1">
                {students.filter(s => s.lineNotifyEnabled).length} คน
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">รับข้อความเช็กชื่อ & ผลการเรียน</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">เกรดเฉลี่ยรวม (GPAX)</span>
              <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
                {students.length > 0 
                  ? (students.reduce((acc, s) => acc + (s.gpa || 0), 0) / students.length).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">ระดับผลการเรียนเฉลี่ย</p>
            </div>
          </div>

          {/* Breakdown by Grade and Room */}
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>การกระจายตัวของนักเรียนตามระดับชั้นและห้องเรียน</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {['Grade 10 (M.4)', 'Grade 11 (M.5)', 'Grade 12 (M.6)'].map((grade) => {
                const count = students.filter(s => s.gradeLevel.includes(grade) || s.gradeLevel.includes(grade.split(' ')[1])).length;
                const lineCount = students.filter(s => (s.gradeLevel.includes(grade) || s.gradeLevel.includes(grade.split(' ')[1])) && s.lineLinked).length;
                return (
                  <div key={grade} className="p-3.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                    <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                      <span>{grade}</span>
                      <span className="text-[var(--color-primary-text)]">{count} คน</span>
                    </div>
                    <div className="w-full bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[var(--color-primary)] h-full rounded-full transition-all"
                        style={{ width: `${students.length > 0 ? (count / students.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>LINE เชื่อมต่อ:</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{lineCount} คน</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[var(--color-primary-text)]" />
                  {editingStudent ? 'Edit Student Profile (แก้ไขข้อมูลนักเรียน)' : 'Enroll New Student (เพิ่มนักเรียนใหม่)'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {editingStudent ? 'Update student records and guardian information.' : 'Register student with bilingual Thai and English credentials.'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] text-lg font-bold cursor-pointer px-2 py-0.5 rounded-lg hover:bg-[var(--color-card-subtle)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span className={studentFormStep === 1 ? 'font-bold text-[var(--color-primary-text)]' : ''}>1. Student profile</span>
                <span>→</span>
                <span className={studentFormStep === 2 ? 'font-bold text-[var(--color-primary-text)]' : ''}>2. Guardian</span>
              </div>
              {studentFormStep === 1 && (
                <div className="space-y-4">
              {/* Photo Preview & Capture */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <img
                  src={formData.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'}
                  alt="Student Avatar"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[var(--color-primary)] shadow-sm"
                />
                <div className="flex-1 space-y-1">
                  <span className="font-semibold text-[var(--color-text-title)] block">รูปถ่ายประจำตัวนักเรียน</span>
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายรูปจากกล้อง / เลือกรูปภาพ</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">First Name (English)</label>
                  <input
                    type="text"
                    required
                    value={formData.firstNameEn}
                    onChange={(e) => setFormData({ ...formData, firstNameEn: e.target.value })}
                    placeholder="e.g. Chatri"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">Last Name (English)</label>
                  <input
                    type="text"
                    required
                    value={formData.lastNameEn}
                    onChange={(e) => setFormData({ ...formData, lastNameEn: e.target.value })}
                    placeholder="e.g. Suksom"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">ชื่อจริง (ภาษาไทย)</label>
                  <input
                    type="text"
                    required
                    value={formData.firstNameTh}
                    onChange={(e) => setFormData({ ...formData, firstNameTh: e.target.value })}
                    placeholder="เช่น ชาตรี"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">นามสกุล (ภาษาไทย)</label>
                  <input
                    type="text"
                    required
                    value={formData.lastNameTh}
                    onChange={(e) => setFormData({ ...formData, lastNameTh: e.target.value })}
                    placeholder="เช่น สุขสม"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">Student ID</label>
                  <input
                    type="text"
                    value={formData.studentIdNumber}
                    onChange={(e) => setFormData({ ...formData, studentIdNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-primary-text)] font-mono font-bold focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">Grade Level</label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Grade 10 (M.4)">Grade 10 (M.4)</option>
                    <option value="Grade 11 (M.5)">Grade 11 (M.5)</option>
                    <option value="Grade 12 (M.6)">Grade 12 (M.6)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">Room / Program</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
                </div>
              )}

              {studentFormStep === 2 && (
                <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="e.g. Somsak Suksom"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStudentFormStep(1)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold shadow-sm cursor-pointer"
                >
                  {editingStudent ? 'บันทึกการแก้ไข (Save Changes)' : 'Save & Enroll'}
                </button>
              </div>
                </div>
              )}
              {studentFormStep === 1 && (
                <div className="flex justify-between gap-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] cursor-pointer">Cancel</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.firstNameEn && formData.lastNameEn && formData.firstNameTh && formData.lastNameTh) setStudentFormStep(2);
                    }}
                    className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Student Photo Modal */}
      <ImageCaptureUploadModal
        isOpen={showPhotoModal}
        currentImageUrl={formData.avatarUrl}
        title="ถ่ายรูปสดหรือเลือกรูปถ่ายนักเรียน"
        onSelectImage={(newUrl) => setFormData((prev) => ({ ...prev, avatarUrl: newUrl }))}
        onClose={() => setShowPhotoModal(false)}
      />
    </div>
  );
};
