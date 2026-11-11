import React, { useState, useMemo } from 'react';
import { Student, StudentStatus, GuardianInfo } from '../types';
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
  Camera,
  GraduationCap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';
import { PagedList } from './PagedList';
import { 
  ALL_GRADE_LEVELS, 
  STUDENT_STATUS_DETAILS 
} from '../data/studentAcademicData';
import { StudentPromotionModal } from './StudentPromotionModal';

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
              <button 
                type="button" 
                disabled={currentPage === 0} 
                onClick={() => setPage(currentPage - 1)} 
                className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer"
              >
                ก่อนหน้า
              </button>
              <span className="text-[11px] text-[var(--color-text-muted)]">{currentPage + 1} / {pageCount}</span>
              <button 
                type="button" 
                disabled={currentPage === pageCount - 1} 
                onClick={() => setPage(currentPage + 1)} 
                className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer"
              >
                ถัดไป
              </button>
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
  onBatchUpdateStudents?: (updatedStudents: Student[]) => void;
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
  onBatchUpdateStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics'>('roster');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [studentFormStep, setStudentFormStep] = useState<1 | 2>(1);

  // Distinct grade levels in active students for filter
  const existingGradeLevels = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.gradeLevel) set.add(s.gradeLevel.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Student form state
  const [formData, setFormData] = useState({
    firstNameEn: '',
    lastNameEn: '',
    firstNameTh: '',
    lastNameTh: '',
    studentIdNumber: `ED-${Math.floor(6900 + Math.random() * 90)}`,
    nationalId: '1-1002-00' + Math.floor(100 + Math.random() * 899) + '-44-1',
    gender: 'male' as 'male' | 'female' | 'other',
    dateOfBirth: '2010-05-10',
    gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
    room: 'ม.4/1',
    status: 'active' as StudentStatus,
    guardianName: '',
    guardianPhone: '081-',
    guardianEmail: '',
    gpa: 3.50,
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  });

  // Multiple guardians state (ผู้ปกครองมากกว่า 1 คน)
  const [guardiansList, setGuardiansList] = useState<GuardianInfo[]>([
    {
      id: 'g-initial-1',
      name: '',
      relation: 'บิดา',
      phone: '081-',
      email: '',
      isPrimary: true,
    }
  ]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Search filter
      const matchesSearch =
        s.firstNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lastNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.firstNameTh.includes(searchTerm) ||
        s.lastNameTh.includes(searchTerm) ||
        s.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.nationalId && s.nationalId.includes(searchTerm));

      // 2. Grade level filter
      let matchesGrade = true;
      if (gradeFilter !== 'all') {
        const g = s.gradeLevel || '';
        if (gradeFilter === 'cat_kindergarten') {
          matchesGrade = g.includes('อนุบาล') || g.includes('K.') || g.includes('อ.');
        } else if (gradeFilter === 'cat_primary') {
          matchesGrade = g.includes('ประถมศึกษา') || g.includes('P.') || g.includes('ป.');
        } else if (gradeFilter === 'cat_lower_sec') {
          matchesGrade =
            g.includes('มัธยมศึกษาปีที่ 1') ||
            g.includes('มัธยมศึกษาปีที่ 2') ||
            g.includes('มัธยมศึกษาปีที่ 3') ||
            g.includes('M.1') ||
            g.includes('M.2') ||
            g.includes('M.3') ||
            g.includes('ม.1') ||
            g.includes('ม.2') ||
            g.includes('ม.3');
        } else if (gradeFilter === 'cat_upper_sec') {
          matchesGrade =
            g.includes('มัธยมศึกษาปีที่ 4') ||
            g.includes('มัธยมศึกษาปีที่ 5') ||
            g.includes('มัธยมศึกษาปีที่ 6') ||
            g.includes('M.4') ||
            g.includes('M.5') ||
            g.includes('M.6') ||
            g.includes('ม.4') ||
            g.includes('ม.5') ||
            g.includes('ม.6') ||
            g.includes('Grade 10') ||
            g.includes('Grade 11') ||
            g.includes('Grade 12');
        } else {
          matchesGrade = g.includes(gradeFilter) || g === gradeFilter;
        }
      }

      // 3. Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'transferred') {
          matchesStatus = s.status === 'transferred' || s.status === 'transferred_out';
        } else {
          matchesStatus = (s.status || 'active') === statusFilter;
        }
      }

      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [students, searchTerm, gradeFilter, statusFilter]);

  const handleOpenAdd = () => {
    setStudentFormStep(1);
    setEditingStudent(null);
    setFormData({
      firstNameEn: '',
      lastNameEn: '',
      firstNameTh: '',
      lastNameTh: '',
      studentIdNumber: `ED-${Math.floor(6900 + Math.random() * 90)}`,
      nationalId: '1-1002-00' + Math.floor(100 + Math.random() * 899) + '-44-1',
      gender: 'male',
      dateOfBirth: '2010-05-10',
      gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)',
      room: 'ม.4/1',
      status: 'active',
      guardianName: '',
      guardianPhone: '081-',
      guardianEmail: '',
      gpa: 3.50,
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    });
    setGuardiansList([
      {
        id: `g-${Date.now()}-1`,
        name: '',
        relation: 'บิดา',
        phone: '081-',
        email: '',
        isPrimary: true,
      }
    ]);
    setShowAddModal(true);
  };

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
      status: student.status || 'active',
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      guardianEmail: student.guardianEmail,
      gpa: student.gpa,
      avatarUrl: student.avatarUrl,
    });
    if (student.guardians && student.guardians.length > 0) {
      setGuardiansList(student.guardians.map(g => ({ ...g })));
    } else {
      setGuardiansList([
        {
          id: `g-${Date.now()}-1`,
          name: student.guardianName || '',
          relation: student.guardianRelation || 'ผู้ปกครอง',
          phone: student.guardianPhone || '',
          email: student.guardianEmail || '',
          isPrimary: true,
        }
      ]);
    }
    setShowAddModal(true);
  };

  const handleAddGuardian = () => {
    const nextIdx = guardiansList.length + 1;
    const defaultRel = nextIdx === 2 ? 'มารดา' : nextIdx === 3 ? 'ปู่/ย่า/ตา/ยาย' : 'ผู้ปกครอง';
    setGuardiansList(prev => [
      ...prev,
      {
        id: `g-${Date.now()}-${nextIdx}`,
        name: '',
        relation: defaultRel,
        phone: '08X-',
        email: '',
        isPrimary: false,
      }
    ]);
  };

  const handleRemoveGuardian = (id: string) => {
    if (guardiansList.length <= 1) return;
    setGuardiansList(prev => {
      const filtered = prev.filter(g => g.id !== id);
      if (!filtered.some(g => g.isPrimary) && filtered.length > 0) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleUpdateGuardian = (id: string, updates: Partial<GuardianInfo>) => {
    setGuardiansList(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const handleSetPrimaryGuardian = (id: string) => {
    setGuardiansList(prev => prev.map(g => ({ ...g, isPrimary: g.id === id })));
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstNameTh.trim()) return;

    const primaryGuardian = guardiansList.find(g => g.isPrimary) || guardiansList[0];
    const finalGuardianName = primaryGuardian?.name?.trim() || formData.guardianName.trim() || 'Parent / Guardian';
    const finalGuardianRelation = primaryGuardian?.relation || 'ผู้ปกครอง';
    const finalGuardianPhone = primaryGuardian?.phone?.trim() || formData.guardianPhone.trim() || '081-000-0000';
    const finalGuardianEmail = primaryGuardian?.email?.trim() || formData.guardianEmail.trim() || 'guardian@email.com';
    const finalGuardians = guardiansList.map((g, idx) => ({
      ...g,
      isPrimary: primaryGuardian ? g.id === primaryGuardian.id : idx === 0,
    }));

    if (editingStudent) {
      const updated: Student = {
        ...editingStudent,
        firstNameEn: formData.firstNameEn.trim() || formData.firstNameTh.trim(),
        lastNameEn: formData.lastNameEn.trim() || formData.lastNameTh.trim(),
        firstNameTh: formData.firstNameTh.trim(),
        lastNameTh: formData.lastNameTh.trim(),
        studentIdNumber: formData.studentIdNumber.trim(),
        nationalId: formData.nationalId.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        gradeLevel: formData.gradeLevel.trim() || 'มัธยมศึกษาปีที่ 4 (M.4)',
        room: formData.room.trim() || 'ม.4/1',
        status: formData.status,
        guardianName: finalGuardianName,
        guardianRelation: finalGuardianRelation,
        guardianPhone: finalGuardianPhone,
        guardianEmail: finalGuardianEmail,
        guardians: finalGuardians,
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
      studentIdNumber: formData.studentIdNumber.trim(),
      nationalId: formData.nationalId.trim() || undefined,
      firstNameEn: formData.firstNameEn.trim() || formData.firstNameTh.trim(),
      lastNameEn: formData.lastNameEn.trim() || formData.lastNameTh.trim(),
      firstNameTh: formData.firstNameTh.trim(),
      lastNameTh: formData.lastNameTh.trim(),
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      gradeLevel: formData.gradeLevel.trim() || 'มัธยมศึกษาปีที่ 4 (M.4)',
      room: formData.room.trim() || 'ม.4/1',
      status: formData.status || 'active',
      avatarUrl: formData.avatarUrl || (formData.gender === 'female' 
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80'),
      gpa: Number(formData.gpa),
      guardianName: finalGuardianName,
      guardianRelation: finalGuardianRelation,
      guardianPhone: finalGuardianPhone,
      guardianEmail: finalGuardianEmail,
      guardians: finalGuardians,
      lineLinked: false,
      lineNotifyEnabled: false,
      enrolledDate: new Date().toISOString().split('T')[0],
    };

    onAddStudent(newStudent);
    setShowAddModal(false);
  };

  const handlePromoteBatch = (updatedStudents: Student[]) => {
    if (onBatchUpdateStudents) {
      onBatchUpdateStudents(updatedStudents);
    } else if (onUpdateStudent) {
      updatedStudents.forEach((s) => onUpdateStudent(s));
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Header controls */}
      <div className="shrink-0 p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 text-[var(--color-primary-text)]" />
            <span>ระบบทะเบียนนักเรียน &amp; เลื่อนชั้นเรียน (DMC / SIS)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold">
              อนุบาล – ม.6
            </span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            จัดการข้อมูลนักเรียนทุกระดับชั้น (อ.1 ถึง ม.6), เลื่อนชั้นเรียนข้ามปีการศึกษา, ติดตามสถานะย้ายเข้า/ย้ายออก/สำเร็จการศึกษา, และเชื่อมต่อ LINE OA
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap shrink-0">
          {/* Academic Year Promotion Button */}
          <button
            type="button"
            onClick={() => setShowPromotionModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="ฟังก์ชันเลื่อนชั้นเรียนข้ามปีการศึกษา ส่งต่อนักเรียน หรือบันทึกสำเร็จการศึกษา"
          >
            <GraduationCap className="w-4 h-4 text-blue-200" />
            <span>เลื่อนชั้นเรียนข้ามปี (Promotion)</span>
          </button>

          {onOpenImportExport && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              <span>นำเข้า/ส่งออก Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มนักเรียนใหม่</span>
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
          <span>ทะเบียนรายชื่อ ({filteredStudents.length} คน)</span>
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
          <span>สถิติระดับชั้น &amp; สถานะนักเรียน</span>
        </button>
      </div>

      {activeTab === 'roster' && (
        <>
          {/* Filter and Search Bar */}
          <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส, ปชช., หรือห้องเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Grade Level Filter (อ.1 ถึง ม.6) */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--color-text-muted)] font-medium">ระดับชั้น:</span>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">ทุกระดับชั้น (All)</option>
                  <optgroup label="หมวดการศึกษา">
                    <option value="cat_kindergarten">ชั้นปฐมวัย (อนุบาล 1–3)</option>
                    <option value="cat_primary">ชั้นประถมศึกษา (ป.1–ป.6)</option>
                    <option value="cat_lower_sec">ชั้นมัธยมศึกษาตอนต้น (ม.1–ม.3)</option>
                    <option value="cat_upper_sec">ชั้นมัธยมศึกษาตอนปลาย (ม.4–ม.6)</option>
                  </optgroup>
                  <optgroup label="ระดับชั้นที่พบในโรงเรียน">
                    {existingGradeLevels.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Status Filter (ย้ายเข้า, ย้ายออก, กำลังศึกษา ฯลฯ) */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--color-text-muted)] font-medium">สถานะ:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">ทุกสถานะนักเรียน</option>
                  {Object.values(STUDENT_STATUS_DETAILS).map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.labelTh} ({st.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-[var(--color-text-muted)] ml-auto font-mono">
                พบ <strong className="text-[var(--color-text-title)]">{filteredStudents.length}</strong> คน
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
                  <th className="py-3 px-4">สถานะ (Status)</th>
                  <th className="py-3 px-4">GPA</th>
                  <th className="py-3.5 px-4">Guardian / LINE OA</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <PaginatedTableRows items={filteredStudents} colSpan={7} renderRow={(student) => {
                  const statusCfg = STUDENT_STATUS_DETAILS[student.status || 'active'] || STUDENT_STATUS_DETAILS.active;
                  return (
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
                        <div className="text-[var(--color-text-title)] font-semibold">{student.gradeLevel}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] font-medium">{student.room}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span 
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.badgeClasses}`}
                          title={statusCfg.descriptionTh}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.labelTh}
                        </span>
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
                            type="button"
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
                            type="button"
                            onClick={() => onOpenReportCard(student)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] hover:opacity-90 border border-[var(--color-border)] text-[var(--color-primary-text)] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="View Thai/English Transcript"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Report Card</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectStudent(student)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-medium transition-colors cursor-pointer"
                          >
                            Profile
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-primary-text)] transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลนักเรียน ระดับชั้น หรือสถานะ"
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
                  );
                }} />
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">นักเรียนทั้งหมด</span>
              <div className="text-2xl font-black text-[var(--color-text-title)] mt-1">{students.length} คน</div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">ในโรงเรียนปัจจุบัน</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">กำลังศึกษา (Active)</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {students.filter(s => (s.status || 'active') === 'active').length} คน
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                ย้ายเข้า: {students.filter(s => s.status === 'transferred_in').length} • ย้ายออก: {students.filter(s => s.status === 'transferred_out' || s.status === 'transferred').length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">เชื่อมต่อ LINE OA</span>
              <div className="text-2xl font-black text-[var(--color-primary-text)] mt-1">
                {students.filter(s => s.lineLinked).length} คน
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {students.length > 0 ? Math.round((students.filter(s => s.lineLinked).length / students.length) * 100) : 0}% อัตราเชื่อมต่อ
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">สำเร็จการศึกษาแล้ว</span>
              <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                {students.filter(s => s.status === 'graduated').length} คน
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">บันทึกจบการศึกษา</p>
            </div>
          </div>

          {/* Breakdown by Student Status */}
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>สรุปภาพรวมตามสถานะนักเรียน (Student Status Distribution)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {Object.values(STUDENT_STATUS_DETAILS).map((st) => {
                const count = students.filter(s => (s.status || 'active') === st.value).length;
                return (
                  <div key={st.value} className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-title)]">
                      <span className={`w-2 h-2 rounded-full ${st.dotColor}`} />
                      <span>{st.labelTh}</span>
                    </div>
                    <div className="text-lg font-mono font-black text-[var(--color-text-title)]">
                      {count} <span className="text-xs font-normal text-[var(--color-text-muted)]">คน</span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{st.descriptionTh}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown by Grade and Room */}
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>การกระจายตัวของนักเรียนตามระดับชั้น (อนุบาล ถึง ม.6)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {existingGradeLevels.map((grade) => {
                const count = students.filter(s => s.gradeLevel === grade).length;
                const activeCount = students.filter(s => s.gradeLevel === grade && (s.status === 'active' || !s.status)).length;
                return (
                  <div key={grade} className="p-3.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                    <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                      <span className="truncate max-w-[180px]">{grade}</span>
                      <span className="text-[var(--color-primary-text)] font-mono">{count} คน</span>
                    </div>
                    <div className="w-full bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[var(--color-primary)] h-full rounded-full transition-all"
                        style={{ width: `${students.length > 0 ? (count / students.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>กำลังศึกษา: {activeCount} คน</span>
                      <span>LINE: {students.filter(s => s.gradeLevel === grade && s.lineLinked).length} คน</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-300" />
                  {editingStudent ? 'แก้ไขข้อมูลนักเรียน (Edit Student Profile)' : 'เพิ่มนักเรียนใหม่ (Enroll New Student)'}
                </h3>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  ระบุข้อมูลนักเรียน ระดับชั้น (อนุบาล–ม.6) สถานะนักเรียน และข้อมูลผู้ปกครอง
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto text-xs">
              {/* Interactive Tabs */}
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                <button
                  type="button"
                  onClick={() => setStudentFormStep(1)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    studentFormStep === 1
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>1. ข้อมูลนักเรียน &amp; ระดับชั้น</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFormStep(2)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    studentFormStep === 2
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>2. ผู้ปกครอง &amp; ผลการเรียน</span>
                </button>
              </div>

              {studentFormStep === 1 && (
                <div className="space-y-4">
                  {/* Photo Preview & Capture */}
                  <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    <img
                      src={formData.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'}
                      alt="Student Avatar"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[var(--color-primary)] shadow-sm"
                    />
                    <div className="flex-1 space-y-1">
                      <span className="font-bold text-[var(--color-text-title)] block">รูปถ่ายประจำตัวนักเรียน</span>
                      <button
                        type="button"
                        onClick={() => setShowPhotoModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>ถ่ายรูปจากกล้อง / อัปโหลดไฟล์</span>
                      </button>
                    </div>
                  </div>

                  {/* Thai Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[var(--color-text-title)] font-bold">ชื่อจริง (ภาษาไทย) *</label>
                        <span className="text-[10px] text-rose-600 font-semibold">จำเป็น</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.firstNameTh}
                        onChange={(e) => setFormData({ ...formData, firstNameTh: e.target.value })}
                        placeholder="เช่น ด.ช.ชาตรี หรือ สมชาย"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[var(--color-text-title)] font-bold">นามสกุล (ภาษาไทย) *</label>
                        <span className="text-[10px] text-rose-600 font-semibold">จำเป็น</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.lastNameTh}
                        onChange={(e) => setFormData({ ...formData, lastNameTh: e.target.value })}
                        placeholder="เช่น สุขสมบูรณ์"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                      />
                    </div>
                  </div>

                  {/* English Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">First Name (English)</label>
                      <input
                        type="text"
                        value={formData.firstNameEn}
                        onChange={(e) => setFormData({ ...formData, firstNameEn: e.target.value })}
                        placeholder="e.g. Chatri"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">Last Name (English)</label>
                      <input
                        type="text"
                        value={formData.lastNameEn}
                        onChange={(e) => setFormData({ ...formData, lastNameEn: e.target.value })}
                        placeholder="e.g. Suksomboon"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                      />
                    </div>
                  </div>

                  {/* ID and National ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">รหัสนักเรียน (ID) *</label>
                      <input
                        type="text"
                        required
                        value={formData.studentIdNumber}
                        onChange={(e) => setFormData({ ...formData, studentIdNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-primary-text)] font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">เลขประจำตัวประชาชน 13 หลัก</label>
                      <input
                        type="text"
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                        placeholder="1-XXXX-XXXXX-XX-X"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">เพศ</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                      >
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="other">ไม่ระบุ/อื่นๆ</option>
                      </select>
                    </div>
                  </div>

                  {/* Grade Level, Room & Status (Requirement 1 & 3: Editable Kindergarten to M.6 and Status) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[var(--color-text-title)] font-bold">
                          ระดับชั้น (Grade) *
                        </label>
                        <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">แก้ไขได้อิสระ</span>
                      </div>
                      <input
                        list="modal-all-grade-levels"
                        required
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                        placeholder="พิมพ์หรือเลือกระดับชั้น (อ.1 ถึง ม.6)"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold text-[var(--color-primary-text)]"
                      />
                      <datalist id="modal-all-grade-levels">
                        {ALL_GRADE_LEVELS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.labelTh} ({g.labelEn})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">
                        ห้องเรียน (Room) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        placeholder="เช่น ม.4/1 หรือ Room 401"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--color-text-title)] font-bold mb-1">
                        สถานะนักเรียน (Status) *
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold cursor-pointer"
                      >
                        {Object.values(STUDENT_STATUS_DETAILS).map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.labelTh} ({st.labelEn})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {studentFormStep === 2 && (
                <div className="space-y-4">
                  {/* Dynamic Guardians Information with + Add Guardian */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                          <span>👨‍👩‍👧 ข้อมูลผู้ปกครอง (Guardians)</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-[10px] font-bold border border-blue-300 dark:border-blue-700">
                            {guardiansList.length} คน
                          </span>
                        </h4>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          นักเรียน 1 คนสามารถมีผู้ปกครองได้มากกว่า 1 คน (เช่น บิดา, มารดา, หรือผู้ดูแล)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddGuardian}
                        className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มผู้ปกครอง</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {guardiansList.map((g, idx) => (
                        <div
                          key={g.id}
                          className={`p-3.5 rounded-2xl border transition ${
                            g.isPrimary
                              ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
                              : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-[var(--color-text-title)]">
                                ผู้ปกครองคนที่ {idx + 1}
                              </span>
                              {g.isPrimary ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
                                  ★ ผู้ปกครองหลัก
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryGuardian(g.id)}
                                  className="text-[10px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                                >
                                  ตั้งเป็นผู้ปกครองหลัก
                                </button>
                              )}
                            </div>

                            {guardiansList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGuardian(g.id)}
                                className="p-1 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950 transition cursor-pointer"
                                title="ลบผู้ปกครองคนนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-[var(--color-text-title)] mb-1">
                                ความสัมพันธ์
                              </label>
                              <select
                                value={g.relation}
                                onChange={(e) => handleUpdateGuardian(g.id, { relation: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-semibold"
                              >
                                <option value="บิดา">บิดา (Father)</option>
                                <option value="มารดา">มารดา (Mother)</option>
                                <option value="ผู้ปกครอง">ผู้ปกครอง (Guardian)</option>
                                <option value="ปู่/ย่า/ตา/ยาย">ปู่ / ย่า / ตา / ยาย</option>
                                <option value="น้า/อา">น้า / อา / ลุง / ป้า</option>
                                <option value="ญาติผู้ใหญ่">ญาติผู้ใหญ่ / ผู้ดูแลตามกฎหมาย</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-[var(--color-text-title)] mb-1">
                                ชื่อ-สกุล ผู้ปกครอง *
                              </label>
                              <input
                                type="text"
                                value={g.name}
                                onChange={(e) => handleUpdateGuardian(g.id, { name: e.target.value })}
                                placeholder="เช่น นายประภาส สุขสมบูรณ์"
                                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-[var(--color-text-title)] mb-1">
                                เบอร์โทรศัพท์ *
                              </label>
                              <input
                                type="text"
                                value={g.phone}
                                onChange={(e) => handleUpdateGuardian(g.id, { phone: e.target.value })}
                                placeholder="08X-XXX-XXXX"
                                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="mt-2 text-xs">
                            <label className="block text-[11px] font-bold text-[var(--color-text-title)] mb-1">
                              อีเมลผู้ปกครอง (สำหรับส่งเกรด/ใบแจ้งหนี้)
                            </label>
                            <input
                              type="email"
                              value={g.email || ''}
                              onChange={(e) => handleUpdateGuardian(g.id, { email: e.target.value })}
                              placeholder="parent@email.com"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-medium"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Prominent Plus Button to add another guardian */}
                    <button
                      type="button"
                      onClick={handleAddGuardian}
                      className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100/60 text-indigo-900 dark:text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                      <span>+ เพิ่มผู้ปกครองคนที่ {guardiansList.length + 1} (มีผู้ปกครองมากกว่า 1 คน)</span>
                    </button>
                  </div>

                  {/* Academic GPA */}
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <label className="block text-[var(--color-text-title)] font-bold mb-1">เกรดเฉลี่ยสะสม (GPA)</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: Number(e.target.value) })}
                      placeholder="เช่น 3.50"
                      className="w-full sm:w-1/2 px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Actions for both steps */}
              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>

                <div className="flex items-center gap-2">
                  {studentFormStep === 1 ? (
                    <button
                      type="button"
                      onClick={() => setStudentFormStep(2)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-bold cursor-pointer transition"
                    >
                      ถัดไป: ผู้ปกครอง &amp; ผลการเรียน →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStudentFormStep(1)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] border border-[var(--color-border)] font-semibold cursor-pointer transition"
                    >
                      ← ย้อนกลับ
                    </button>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold shadow-md cursor-pointer transition"
                  >
                    {editingStudent ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลนักเรียน'}
                  </button>
                </div>
              </div>
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

      {/* Grade Promotion Modal */}
      <StudentPromotionModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        students={students}
        onPromoteStudents={handlePromoteBatch}
      />
    </div>
  );
};
