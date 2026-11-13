import React, { useState } from 'react';
import { Teacher, AppLanguage, UserRole, TeacherPortfolioWork } from '../types';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Plus, 
  ChevronDown,
  Mail, 
  Phone, 
  Award, 
  BookOpen, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Download, 
  CheckCircle2, 
  MessageSquare,
  X,
  UserCheck,
  Building2,
  Camera,
  Sparkles,
  TrendingUp,
  FileCheck2,
  FileText,
  BrainCircuit,
  ExternalLink,
  Target,
  BarChart3,
  Calendar,
  Tag,
  FileSpreadsheet,
  Send,
  RefreshCw,
} from 'lucide-react';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';
import { PagedList } from '../components/PagedList';
import { getDuplicateRecordWarnings, getTeacherDuplicateReasons } from '../lib/duplicateRecords';
import { DEFAULT_STAFF_POSITION_OPTIONS } from '../lib/schoolSettings';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import {
  inviteTeacherOrParentAccount,
  listSchoolStaffParentAccounts,
  type StaffParentAccountLink,
} from '../lib/authDb';

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
              <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
              <span className="text-[11px] text-[var(--color-text-muted)]">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface TeachersViewProps {
  teachers: Teacher[];
  lang: AppLanguage;
  currentRole: UserRole;
  schoolId?: string;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onPurgeSampleTeachers?: () => void;
  onOpenImportExport?: () => void;
  staffPositionOptions?: string[];
  onUpdateStaffPositionOptions?: (options: string[]) => Promise<void> | void;
  academicYear?: string;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  lang,
  currentRole,
  schoolId = 'default-school',
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onPurgeSampleTeachers,
  onOpenImportExport,
  staffPositionOptions = [],
  onUpdateStaffPositionOptions,
  academicYear = '2569',
}) => {
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStaffMetaModal, setShowStaffMetaModal] = useState(false);
  const [newPositionInput, setNewPositionInput] = useState('');
  const [newDepartmentInput, setNewDepartmentInput] = useState('');
  const [newStandingInput, setNewStandingInput] = useState('');
  const [savingPositions, setSavingPositions] = useState(false);
  const [teacherFormStep, setTeacherFormStep] = useState<1 | 2>(1);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'pa_portfolio' | 'teaching_analytics'>('profile');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [teacherAccounts, setTeacherAccounts] = useState<StaffParentAccountLink[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [inviteModalTeacher, setInviteModalTeacher] = useState<Teacher | null>(null);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Image Capture / Upload Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'form' | 'detail'>('form');

  // New PA Portfolio Work state in detail modal
  const [showAddPaModal, setShowAddPaModal] = useState(false);
  const [paTitle, setPaTitle] = useState('');
  const [paCategory, setPaCategory] = useState<TeacherPortfolioWork['category']>('pa_agreement');
  const [paAspect, setPaAspect] = useState<TeacherPortfolioWork['paAspect']>('ด้านที่ 1 การจัดการเรียนรู้');
  const [paYear, setPaYear] = useState(academicYear);
  const [paDescription, setPaDescription] = useState('');
  const [paEvidenceType, setPaEvidenceType] = useState<TeacherPortfolioWork['evidenceType']>('pdf');
  const [paFileUrl, setPaFileUrl] = useState('');

  // Form state for adding/editing
  const [formData, setFormData] = useState<Partial<Teacher>>({
    teacherIdNumber: `TCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    fullNameTh: '',
    fullNameEn: '',
    positionTitle: '',
    gender: 'male',
    email: '',
    phone: '',
    academicDegree: '',
    major: '',
    minor: '',
    academicStanding: '',
    department: '',
    teacherLicenseNo: '',
    teachingSubjects: [],
    homeroomClasses: [],
    teachingGrades: [],
    isSchoolAdmin: false,
    lineLinked: false,
    teachingExperienceYears: undefined,
    otherSkills: [],
    certifications: [],
    paScore: undefined,
    selfDevelopmentPlan: '',
    avatarUrl: '',
  });

  const [subjectInput, setSubjectInput] = useState('');
  const [homeroomInput, setHomeroomInput] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const departments = presets.departments;
  const academicStandings = presets.academicStandings;
  const resolvedPositionOptions = Array.from(
    new Set([
      ...(staffPositionOptions.length > 0 ? staffPositionOptions : DEFAULT_STAFF_POSITION_OPTIONS),
      ...teachers.map((t) => t.positionTitle || '').filter(Boolean),
    ])
  );
  const teacherDuplicateWarnings = getDuplicateRecordWarnings({
    students: [],
    teachers,
    courses: [],
    grades: [],
    invoices: [],
    timetableSlots: [],
  });

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.fullNameTh.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fullNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teacherIdNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.positionTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.major.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.minor && t.minor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teachingSubjects.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.otherSkills && t.otherSkills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesDept = departmentFilter === 'all' || t.department === departmentFilter;
    const matchesPosition = positionFilter === 'all' || (t.positionTitle || '') === positionFilter;
    return matchesSearch && matchesDept && matchesPosition;
  });

  const handleOpenAdd = () => {
    setTeacherFormStep(1);
    setFormError(null);
    setFormData({
      teacherIdNumber: `TCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullNameTh: '',
      fullNameEn: '',
      positionTitle: '',
      gender: 'male',
      email: '',
      phone: '',
      academicDegree: '',
      major: '',
      minor: '',
      academicStanding: '',
      department: '',
      teacherLicenseNo: '',
      teachingSubjects: [],
      homeroomClasses: [],
      teachingGrades: [],
      isSchoolAdmin: false,
      lineLinked: false,
      teachingExperienceYears: undefined,
      otherSkills: [],
      certifications: [],
      paScore: undefined,
      selfDevelopmentPlan: '',
      avatarUrl: '',
    });
    setSubjectInput('');
    setHomeroomInput('');
    setNewSkillInput('');
    setGradeInput('');
    setCertificationInput('');
    setEditingTeacher(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setTeacherFormStep(1);
    setFormError(null);
    setEditingTeacher(teacher);
    setFormData({
      ...teacher,
    });
    setSubjectInput('');
    setHomeroomInput('');
    setNewSkillInput('');
    setGradeInput('');
    setCertificationInput('');
    setShowAddModal(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const experience = formData.teachingExperienceYears;
    if (experience !== undefined && (!Number.isFinite(experience) || experience < 0)) {
      setFormError('ประสบการณ์สอนต้องเป็นจำนวนปีตั้งแต่ 0 ขึ้นไป (เช่น 5 หรือ 0)');
      setTeacherFormStep(1);
      return;
    }
    if (!formData.fullNameTh?.trim()) {
      setFormError('กรุณากรอกชื่อ-สกุล (ภาษาไทย)');
      setTeacherFormStep(1);
      return;
    }
    setFormError(null);

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        ...formData,
        fullNameTh: formData.fullNameTh.trim(),
        fullNameEn: formData.fullNameEn?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        academicDegree: formData.academicDegree?.trim() || '',
        major: formData.major?.trim() || '',
        minor: formData.minor?.trim() || undefined,
        academicStanding: formData.academicStanding?.trim() || '',
        department: formData.department?.trim() || '',
        teacherLicenseNo: formData.teacherLicenseNo?.trim() || '',
        teachingExperienceYears: experience,
      };
      const duplicateReasons = getTeacherDuplicateReasons(
        [updated],
        teachers,
        [editingTeacher.id]
      );
      if (duplicateReasons.length > 0 && !confirm(`${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`)) return;
      onUpdateTeacher(updated);
      if (selectedTeacherForDetail && selectedTeacherForDetail.id === updated.id) {
        setSelectedTeacherForDetail(updated);
      }
    } else {
      const newTeacher: Teacher = {
        id: `tch-${Date.now()}`,
        teacherIdNumber: formData.teacherIdNumber?.trim() || `TCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        fullNameTh: formData.fullNameTh.trim(),
        fullNameEn: formData.fullNameEn?.trim() || formData.fullNameTh.trim(),
        positionTitle: formData.positionTitle?.trim() || '',
        gender: formData.gender || 'male',
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        avatarUrl: formData.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        academicDegree: formData.academicDegree?.trim() || '',
        major: formData.major?.trim() || '',
        minor: formData.minor?.trim() || '',
        academicStanding: formData.academicStanding?.trim() || 'ครูผู้ช่วย',
        department: formData.department?.trim() || departments[0] || 'ฝ่ายบริหารงานทั่วไป',
        teacherLicenseNo: formData.teacherLicenseNo?.trim() || '',
        teachingSubjects: formData.teachingSubjects || [],
        homeroomClasses: formData.homeroomClasses || [],
        teachingGrades: formData.teachingGrades || [],
        isSchoolAdmin: Boolean(formData.isSchoolAdmin),
        lineLinked: Boolean(formData.lineLinked),
        teachingExperienceYears: experience,
        otherSkills: formData.otherSkills || [],
        certifications: formData.certifications || [],
        paScore: formData.paScore,
        selfDevelopmentPlan: formData.selfDevelopmentPlan?.trim() || undefined,
        paPortfolio: formData.paPortfolio || [],
      };
      const duplicateReasons = getTeacherDuplicateReasons([newTeacher], teachers);
      if (duplicateReasons.length > 0 && !confirm(`${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`)) return;
      onAddTeacher(newTeacher);
    }

    setShowAddModal(false);
    setEditingTeacher(null);
  };

  // Handle Photo selection from camera or upload
  const handlePhotoSelected = (newAvatarUrl: string) => {
    if (photoTarget === 'form') {
      setFormData((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
    } else if (photoTarget === 'detail' && selectedTeacherForDetail) {
      const updated = {
        ...selectedTeacherForDetail,
        avatarUrl: newAvatarUrl,
      };
      setSelectedTeacherForDetail(updated);
      onUpdateTeacher(updated);
    }
  };

  // Handle Adding PA Portfolio item to selected teacher
  const handleAddPaItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForDetail || !paTitle.trim()) return;

    const newPaWork: TeacherPortfolioWork = {
      id: `pa-${Date.now()}`,
      title: paTitle.trim(),
      category: paCategory,
      paAspect: paAspect,
      academicYear: paYear,
      description: paDescription.trim(),
      evidenceType: paEvidenceType,
      fileUrl: paFileUrl.trim() || undefined,
      verifiedStatus: 'approved',
      dateSubmitted: new Date().toISOString().split('T')[0],
      targetStanding: selectedTeacherForDetail.academicStanding,
    };

    const updatedPortfolio = [
      ...(selectedTeacherForDetail.paPortfolio || []),
      newPaWork,
    ];

    const updatedTeacher: Teacher = {
      ...selectedTeacherForDetail,
      paPortfolio: updatedPortfolio,
      paScore: Math.min(100, Math.round(((selectedTeacherForDetail.paScore ?? 0) + 2) * 10) / 10),
    };

    setSelectedTeacherForDetail(updatedTeacher);
    onUpdateTeacher(updatedTeacher);

    // Reset PA form
    setPaTitle('');
    setPaDescription('');
    setPaFileUrl('');
    setShowAddPaModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['รหัสครู', 'ชื่อ-สกุล (ไทย)', 'Name (English)', 'ตำแหน่ง', 'กลุ่มสาระ', 'วิทยฐานะ', 'วุฒิการศึกษา', 'วิชาเอก', 'วิชาโท', 'ประสบการณ์ (ปี)', 'ความสามารถพิเศษ', 'วิชาที่สอน', 'เบอร์โทร', 'อีเมล', 'สิทธิ์แอดมิน'];
    const rows = filteredTeachers.map((t) => [
      `"${t.teacherIdNumber}"`,
      `"${t.fullNameTh}"`,
      `"${t.fullNameEn}"`,
      `"${t.positionTitle || ''}"`,
      `"${t.department}"`,
      `"${t.academicStanding}"`,
      `"${t.academicDegree}"`,
      `"${t.major}"`,
      `"${t.minor || '-'}"`,
      `"${t.teachingExperienceYears || '-'}"`,
      `"${(t.otherSkills || []).join('; ')}"`,
      `"${t.teachingSubjects.join(', ')}"`,
      `"${t.phone}"`,
      `"${t.email}"`,
      t.isSchoolAdmin ? '"ใช่"' : '"ไม่ใช่"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EduVerse_Teachers_Full_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const canManage = currentRole === 'admin' || currentRole === 'super_admin';
  const canPurgeSampleTeachers = canManage
    && Boolean(onPurgeSampleTeachers)
    && teachers.some(t => t.id.startsWith('tch-0') || t.id.startsWith('tch-demo') || t.id.startsWith('tch-mock'));

  const refreshTeacherAccounts = React.useCallback(async () => {
    if (!canManage || !schoolId || schoolId === 'default-school') return;
    setAccountsLoading(true);
    try {
      const list = await listSchoolStaffParentAccounts(schoolId);
      setTeacherAccounts(list.filter((item) => item.role === 'teacher'));
    } finally {
      setAccountsLoading(false);
    }
  }, [canManage, schoolId]);

  React.useEffect(() => {
    void refreshTeacherAccounts();
  }, [refreshTeacherAccounts]);

  const handleOpenTeacherInviteModal = (teacher: Teacher) => {
    setInviteModalTeacher(teacher);
    setInviteEmailInput(teacher.email?.trim() || '');
    setInviteFeedback(null);
  };

  const handleSubmitTeacherInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteModalTeacher) return;
    const targetEmail = inviteEmailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setInviteFeedback({ type: 'error', message: 'กรุณากรอกอีเมลที่ถูกต้องสำหรับส่งคำเชิญ' });
      return;
    }

    setInviteSubmitting(true);
    setInviteFeedback(null);
    try {
      await inviteTeacherOrParentAccount({
        schoolId,
        inviteRole: 'teacher',
        email: targetEmail,
        fullNameTh: inviteModalTeacher.fullNameTh,
        fullNameEn: inviteModalTeacher.fullNameEn,
        teacherId: inviteModalTeacher.id,
      });
      setInviteFeedback({
        type: 'success',
        message: `ส่งคำเชิญเข้าสู่ระบบไปยัง ${targetEmail} เรียบร้อยแล้ว`,
      });
      setInviteModalTeacher(null);
      await refreshTeacherAccounts();
    } catch (error) {
      setInviteFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'ไม่สามารถส่งคำเชิญบัญชีครูได้',
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Header and Controls */}
      <div className="shrink-0 p-3 app-page-header flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            {lang === 'th' ? 'บุคลากรและครู' : 'Faculty & Staff'}
          </h1>
          <span className="text-xs text-[var(--color-text-muted)] font-mono tabular-nums whitespace-nowrap">
            · {filteredTeachers.length} {lang === 'th' ? 'คน' : 'staff'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="flex list-none cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]">
              <span>{lang === 'th' ? 'จัดการข้อมูล' : 'Data actions'}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 min-w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg">
              {onOpenImportExport && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    onOpenImportExport();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
                  <span>{lang === 'th' ? 'นำเข้า/ส่งออก Excel' : 'Import / Export Excel'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  handleExportCSV();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)]"
              >
                <Download className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'ดาวน์โหลด CSV' : 'Export CSV'}</span>
              </button>
              {canPurgeSampleTeachers && onPurgeSampleTeachers && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    onPurgeSampleTeachers();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50"
                  title="ล้างข้อมูลครูตัวอย่างออกจากโรงเรียน"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{lang === 'th' ? 'ล้างข้อมูลตัวอย่าง' : 'Remove sample data'}</span>
                </button>
              )}
            </div>
          </details>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowAccountsPanel((prev) => !prev);
                  void refreshTeacherAccounts();
                }}
                className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>บัญชีเข้าสู่ระบบครู ({teacherAccounts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStaffMetaModal(true)}
                className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>จัดการตำแหน่ง/ฝ่าย</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'เพิ่มครู/บุคลากร' : 'Add Teacher'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {inviteFeedback && !inviteModalTeacher && (
        <div
          role={inviteFeedback.type === 'error' ? 'alert' : 'status'}
          className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-medium flex items-center justify-between gap-2 ${
            inviteFeedback.type === 'error'
              ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
              : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <span>{inviteFeedback.message}</span>
          <button
            type="button"
            onClick={() => setInviteFeedback(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {canManage && showAccountsPanel && (
        <div className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-title)]">
                บัญชีครูที่ได้รับคำเชิญ / เปิดใช้งานแล้ว ({teacherAccounts.length} บัญชี)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                กดปุ่มซองจดหมายบนการ์ดหรือตารางรายชื่อครู เพื่อส่งอีเมลเชิญให้คุณครูตั้งรหัสผ่านเข้าสู่ระบบ
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshTeacherAccounts()}
              disabled={accountsLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${accountsLoading ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>
          </div>
          {teacherAccounts.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-2">
              ยังไม่มีบัญชีครูที่เชื่อมกับโรงเรียนนี้
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
              {teacherAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-text-title)] truncate">{acc.full_name_th || acc.full_name_en}</p>
                    <p className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">{acc.email || '—'}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      acc.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    {acc.status === 'active' ? 'ใช้งานได้' : acc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {teacherDuplicateWarnings.length > 0 && (
        <div className="shrink-0 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <span><strong>แจ้งเตือนข้อมูลซ้ำ:</strong> {teacherDuplicateWarnings.join(' • ')}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="shrink-0 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อ รหัส ตำแหน่ง หรือวิชาที่สอน...' : 'Search by name, ID, position, or subject...'}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="relative w-44 hidden sm:block">
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">ทุกตำแหน่งบุคลากร</option>
              {resolvedPositionOptions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="relative w-52 hidden md:block">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">{lang === 'th' ? 'ทุกกลุ่มสาระ/ฝ่ายงาน' : 'All Departments'}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept.replace('กลุ่มสาระการเรียนรู้', '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              viewMode === 'cards'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
            }`}
          >
            การ์ดโปรไฟล์
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              viewMode === 'table'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
            }`}
          >
            ตารางรายชื่อ
          </button>
        </div>
      </div>

      {/* Teachers Scrollable Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {/* Teachers Cards View */}
        {viewMode === 'cards' ? (
        <div>
          <PagedList
            items={filteredTeachers}
            pageSize={6}
            emptyState={
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-10 text-center">
                <UserCheck className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
                <p className="mt-2 text-sm font-semibold text-[var(--color-text-title)]">
                  {teachers.length === 0
                    ? (lang === 'th' ? 'ยังไม่มีข้อมูลบุคลากร' : 'No staff records yet')
                    : (lang === 'th' ? 'ไม่พบรายชื่อที่ตรงกับการค้นหา' : 'No staff match your search')}
                </p>
                {teachers.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรองกลุ่มสาระ' : 'Try a different search or department filter.'}
                  </p>
                )}
              </div>
            }
            renderItem={(teacher) => (
            <div
              key={teacher.id}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.fullNameTh}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-[var(--color-primary)]/40 shadow-sm"
                      />
                      {teacher.isSchoolAdmin && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-400 text-slate-950 rounded-full shadow" title="School Admin">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--color-text-title)] tracking-tight">
                        {teacher.fullNameTh}
                      </h3>
                      {teacher.fullNameEn.trim() && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">{teacher.fullNameEn}</p>
                      )}
                      {teacher.positionTitle && (
                        <span className="inline-block mt-0.5 mr-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-semibold border border-blue-300 dark:border-blue-700">
                          {teacher.positionTitle}
                        </span>
                      )}
                      {teacher.academicStanding.trim() && (
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold border border-[var(--color-border)]">
                          {teacher.academicStanding}
                        </span>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleOpenTeacherInviteModal(teacher)}
                        className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-text)] text-[var(--color-text-muted)] transition cursor-pointer"
                        title="เชิญครูเข้าสู่ระบบทางอีเมล"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(teacher)}
                        className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-text)] text-[var(--color-text-muted)] transition cursor-pointer"
                        title="แก้ไขข้อมูลครู"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`คุณต้องการลบข้อมูลอาจารย์ "${teacher.fullNameTh}" หรือไม่?`)) {
                            onDeleteTeacher(teacher.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-800 dark:hover:text-rose-200 text-[var(--color-text-muted)] transition cursor-pointer"
                        title="ลบข้อมูลครู"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  {teacher.department.trim() && (
                    <div className="flex items-center gap-1.5 text-[var(--color-text-body)]">
                      <Building2 className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                      <span className="truncate">{teacher.department.replace('กลุ่มสาระการเรียนรู้', '').trim()}</span>
                    </div>
                  )}

                  {(teacher.major.trim() || teacher.minor?.trim() || typeof teacher.teachingExperienceYears === 'number') && (
                    <div className="p-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
                      {teacher.major.trim() && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[var(--color-text-muted)]">วิชาเอก:</span>
                          <span className="font-bold text-[var(--color-text-title)] truncate max-w-[170px]">{teacher.major.trim()}</span>
                        </div>
                      )}
                      {teacher.minor?.trim() && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[var(--color-text-muted)]">วิชาโท:</span>
                        <span className="font-semibold text-[var(--color-primary-text)] truncate max-w-[170px]">{teacher.minor.trim()}</span>
                      </div>
                      )}
                      {typeof teacher.teachingExperienceYears === 'number' && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[var(--color-text-muted)]">ประสบการณ์:</span>
                          <span className="font-mono text-[var(--color-text-body)]">
                            {teacher.teachingExperienceYears} ปี
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other skills badge preview */}
                  {teacher.otherSkills && teacher.otherSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {teacher.otherSkills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-medium">
                          ⚡ {skill}
                        </span>
                      ))}
                      {teacher.otherSkills.length > 3 && (
                        <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">+{teacher.otherSkills.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>ผลงาน PA: <strong className="text-[var(--color-text-title)]">{teacher.paPortfolio?.length || 0}</strong> ชิ้น</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacherForDetail(teacher);
                    setDetailTab('profile');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-primary-text)] border border-[var(--color-border)] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>ดูแฟ้มประวัติ &amp; ว.PA</span>
                </button>
              </div>
            </div>
          )} />
        </div>
      ) : (
        /* Table View */
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">ครูผู้สอน</th>
                  <th className="px-4 py-3">กลุ่มสาระ</th>
                  <th className="px-4 py-3">วิชาเอก / โท</th>
                  <th className="px-4 py-3">ตำแหน่ง</th>
                  <th className="px-4 py-3">วิทยฐานะ (ว.PA)</th>
                  <th className="px-4 py-3">ประสบการณ์</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <PaginatedTableRows items={filteredTeachers} colSpan={7} renderRow={(teacher) => (
                  <tr key={teacher.id} className="hover:bg-[var(--color-card-subtle)] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={teacher.avatarUrl}
                          alt={teacher.fullNameTh}
                          className="w-9 h-9 rounded-xl object-cover border border-[var(--color-border)]"
                        />
                        <div>
                          <p className="font-bold text-[var(--color-text-title)]">{teacher.fullNameTh}</p>
                          <p className="text-[11px] text-[var(--color-text-muted)] font-mono">{teacher.teacherIdNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-body)]">
                      {teacher.department.replace('กลุ่มสาระการเรียนรู้', '')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-text-title)]">{teacher.major}</div>
                      {teacher.minor && <div className="text-[10px] text-[var(--color-primary-text)] font-medium">โท: {teacher.minor}</div>}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-body)]">{teacher.positionTitle || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-bold text-[10px]">
                        {teacher.academicStanding}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-body)]">
                      {teacher.teachingExperienceYears === undefined ? 'ไม่ระบุ' : `${teacher.teachingExperienceYears} ปี`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherForDetail(teacher);
                            setDetailTab('profile');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] border border-[var(--color-border)] text-xs font-semibold cursor-pointer"
                        >
                          รายละเอียด
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenTeacherInviteModal(teacher)}
                              className="p-1 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] cursor-pointer"
                              title="เชิญครูเข้าสู่ระบบทางอีเมล"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(teacher)}
                              className="p-1 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`คุณต้องการลบข้อมูล "${teacher.fullNameTh}" หรือไม่?`)) {
                                  onDeleteTeacher(teacher.id);
                                }
                              }}
                              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )} />
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* ======================================================== */}
      {/* 1. TEACHER DETAIL & PA PORTFOLIO & TEACHING ANALYTICS MODAL */}
      {/* ======================================================== */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="relative w-full max-w-4xl bg-[var(--color-card)] rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[var(--color-primary)] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div 
                  onClick={() => {
                    setPhotoTarget('detail');
                    setShowPhotoModal(true);
                  }}
                  className="relative group cursor-pointer"
                  title="แตะเพื่อถ่ายรูป หรืออัปโหลดรูปภาพใหม่"
                >
                  <img
                    src={selectedTeacherForDetail.avatarUrl}
                    alt={selectedTeacherForDetail.fullNameTh}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-blue-400 shadow-md group-hover:ring-2 group-hover:ring-blue-300 transition"
                  />
                  <span className="absolute -bottom-1 -right-1 p-1 bg-[var(--color-primary)] group-hover:opacity-90 rounded-full text-white shadow transition">
                    <Camera className="w-3 h-3" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base sm:text-lg tracking-tight text-white">
                      {selectedTeacherForDetail.fullNameTh}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40 uppercase font-bold">
                      {selectedTeacherForDetail.academicStanding}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-mono mt-0.5">
                    {selectedTeacherForDetail.teacherIdNumber} • {selectedTeacherForDetail.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEdit(selectedTeacherForDetail);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/80 hover:opacity-90 text-white text-xs font-bold border border-blue-400/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTeacherForDetail(null)}
                  className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] px-6 pt-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDetailTab('profile')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'profile'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>ประวัติ &amp; คุณวุฒิครู</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('pa_portfolio')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'pa_portfolio'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>แฟ้มผลงานเพิ่มวิทยฐานะ (ว.PA)</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  {selectedTeacherForDetail.paPortfolio?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('teaching_analytics')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'teaching_analytics'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <BrainCircuit className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>วิเคราะห์การสอน &amp; ID Plan</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: PROFILE & QUALIFICATIONS */}
              {detailTab === 'profile' && (
                <div className="space-y-6 text-xs">
                  {/* Quick Highlight Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[var(--color-primary-light)] border border-[var(--color-border)]">
                      <span className="text-[10px] text-[var(--color-primary-text)] font-bold uppercase block">วิชาเอก (Major)</span>
                      <p className="font-semibold text-[var(--color-text-title)] mt-1 leading-snug">{selectedTeacherForDetail.major}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--color-primary-light)] border border-[var(--color-border)]">
                      <span className="text-[10px] text-[var(--color-primary-text)] font-bold uppercase block">วิชาโท (Minor)</span>
                      <p className="font-semibold text-[var(--color-text-title)] mt-1 leading-snug">{selectedTeacherForDetail.minor || 'ไม่ระบุ'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800">
                      <span className="text-[10px] text-amber-900 dark:text-amber-200 font-bold uppercase block">ประสบการณ์สอน</span>
                      <p className="font-semibold text-[var(--color-text-title)] mt-1 leading-snug">
                        {selectedTeacherForDetail.teachingExperienceYears === undefined
                          ? 'ไม่ระบุ'
                          : `${selectedTeacherForDetail.teachingExperienceYears} ปี`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800">
                      <span className="text-[10px] text-emerald-900 dark:text-emerald-200 font-bold uppercase block">คะแนนประเมิน PA</span>
                      <p className="font-semibold text-[var(--color-text-title)] mt-1 leading-snug">
                        {selectedTeacherForDetail.paScore === undefined ? 'ไม่ระบุ' : `${selectedTeacherForDetail.paScore}/100`}
                      </p>
                    </div>
                  </div>

                  {/* General Qualifications Grid */}
                  <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-3">
                    <h4 className="font-bold text-[var(--color-text-title)] border-b border-[var(--color-border)] pb-2">
                      คุณวุฒิการศึกษาและการรับรองวิชาชีพ
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[var(--color-text-muted)] block">วุฒิการศึกษาสูงสุด:</span>
                        <span className="font-semibold text-[var(--color-text-title)]">{selectedTeacherForDetail.academicDegree}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-muted)] block">เลขที่ใบอนุญาตประกอบวิชาชีพครู:</span>
                        <span className="font-mono text-[var(--color-text-title)]">{selectedTeacherForDetail.teacherLicenseNo}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-muted)] block">กลุ่มสาระการเรียนรู้:</span>
                        <span className="font-semibold text-[var(--color-text-title)]">{selectedTeacherForDetail.department}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-muted)] block">เบอร์โทรศัพท์และอีเมล:</span>
                        <span className="font-mono text-[var(--color-text-title)]">{selectedTeacherForDetail.phone} • {selectedTeacherForDetail.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Other Skills & Talents */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>ความสามารถพิเศษและทักษะอื่นๆ (Other Competencies &amp; Talents)</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeacherForDetail.otherSkills && selectedTeacherForDetail.otherSkills.length > 0 ? (
                        <PagedList items={selectedTeacherForDetail.otherSkills} pageSize={4} renderItem={(skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold"
                          >
                            ⭐ {skill}
                          </span>
                        )} />
                      ) : (
                        <p className="text-[var(--color-text-muted)]">ยังไม่มีการบันทึกทักษะเพิ่มเติม</p>
                      )}
                    </div>
                  </div>

                  {/* Teaching Subjects & Homerooms */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>ภาระงานสอนและห้องที่ปรึกษา (Teaching Load)</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <PagedList items={selectedTeacherForDetail.teachingSubjects} pageSize={4} renderItem={(sub, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-semibold"
                        >
                          📖 {sub}
                        </span>
                      )} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PA PORTFOLIO & EVIDENCE (ว.PA ก.ค.ศ.) */}
              {detailTab === 'pa_portfolio' && (
                <div className="space-y-6 text-xs">
                  {/* PA Header Card */}
                  <div className="p-4 rounded-2xl bg-[var(--color-primary)] border border-emerald-500/40 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-semibold text-sm text-emerald-300">
                          แฟ้มสะสมผลงานข้อตกลงในการพัฒนางาน (ว.PA / PA Agreement)
                        </h4>
                      </div>
                      <p className="text-slate-200 mt-1">
                        รองรับเกณฑ์ ก.ค.ศ. ว9/2564 สำหรับการประเมินเพื่อขอมีหรือเลื่อนวิทยฐานะ: <strong>{selectedTeacherForDetail.academicStanding}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddPaModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มผลงาน ว.PA</span>
                    </button>
                  </div>

                  {/* PA Works List */}
                  {selectedTeacherForDetail.paPortfolio && selectedTeacherForDetail.paPortfolio.length > 0 ? (
                    <div className="space-y-3">
                      <PagedList items={selectedTeacherForDetail.paPortfolio} pageSize={2} renderItem={(item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shadow-sm space-y-2 hover:border-emerald-600 transition"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                                  {item.paAspect}
                                </span>
                                <span className="text-[var(--color-text-muted)] font-mono text-[11px]">
                                  ปีการศึกษา {item.academicYear}
                                </span>
                              </div>
                              <h5 className="font-bold text-[var(--color-text-title)] mt-1 text-sm">
                                {item.title}
                              </h5>
                            </div>

                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>รับรองผลงานแล้ว</span>
                            </span>
                          </div>

                          <p className="text-[var(--color-text-body)] text-xs">
                            {item.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
                            <span>หมวด: {item.category === 'pa_agreement' ? 'ข้อตกลง PA' : item.category === 'classroom_research' ? 'วิจัยในชั้นเรียน' : item.category === 'lesson_plan' ? 'แผนการสอน Active Learning' : item.category === 'teaching_media' ? 'สื่อนวัตกรรมดิจิทัล' : 'ผลงานรางวัล'}</span>
                            <span className="font-mono">วันที่ส่ง: {item.dateSubmitted}</span>
                          </div>
                        </div>
                      )} />
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-[var(--color-border)] rounded-2xl">
                      <FileText className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
                      <p className="font-bold text-[var(--color-text-title)]">ยังไม่มีการบันทึกผลงาน PA สำหรับอาจารย์ท่านนี้</p>
                      <p className="text-[var(--color-text-muted)] mt-1">กดปุ่ม "เพิ่มผลงาน ว.PA" เพื่อบันทึกงานวิจัย สื่อนวัตกรรม หรือแผนการสอน</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TEACHING ANALYTICS & AI INSIGHTS */}
              {detailTab === 'teaching_analytics' && (
                <div className="space-y-6 text-xs">
                  {/* Analysis Banner */}
                  <div className="p-4 rounded-2xl bg-[var(--color-primary)] border border-indigo-500/40 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-indigo-300" />
                        <h4 className="font-semibold text-sm text-indigo-200">
                          การวิเคราะห์ศักยภาพและการจัดการเรียนรู้เชิงลึก (Teaching Analytics)
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-500/50 text-[10px] font-bold">
                        Alignment Score: 96%
                      </span>
                    </div>
                    <p className="text-slate-200">
                      ระบบประมวลผลความสอดคล้องของวิชาเอก ({selectedTeacherForDetail.major}) และวิชาโท ({selectedTeacherForDetail.minor || 'ทั่วไป'}) ร่วมกับทักษะพิเศษ เพื่อวิเคราะห์ประสิทธิภาพการสอนตามหลักสูตร
                    </p>
                  </div>

                  {/* 3 Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Alignment */}
                    <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-[var(--color-primary-text)] font-bold">
                        <Target className="w-4 h-4" />
                        <h5>ความตรงของสายวิชาที่สอน</h5>
                      </div>
                      <p className="text-[var(--color-text-body)]">
                        วิชาที่รับผิดชอบสอนตรงตาม <strong className="text-[var(--color-text-title)]">วิชาเอก 100%</strong> ช่วยให้นักเรียนได้รับเนื้อหาที่ลึกซึ้งและถูกต้องตามหลักสูตร
                      </p>
                    </div>

                    {/* 2. Skills Synergy */}
                    <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
                        <Sparkles className="w-4 h-4" />
                        <h5>การประยุกต์ทักษะพิเศษ</h5>
                      </div>
                      <p className="text-[var(--color-text-body)]">
                        นำความสามารถด้าน <strong className="text-[var(--color-text-title)]">{selectedTeacherForDetail.otherSkills?.slice(0, 2).join(', ') || 'Active Learning'}</strong> มาบูรณาการในวิชาหลัก ส่งผลให้ผู้เรียนมีส่วนร่วมสูง
                      </p>
                    </div>

                    {/* 3. Next Rank Readiness */}
                    <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                        <TrendingUp className="w-4 h-4" />
                        <h5>ความพร้อมเลื่อนวิทยฐานะ</h5>
                      </div>
                      <p className="text-[var(--color-text-body)]">
                        มีเอกสารผลงานและคะแนน PA สะสมพร้อมสำหรับการขอรับการประเมินในระดับถัดไป คิดเป็น <strong className="text-[var(--color-text-title)]">92%</strong>
                      </p>
                    </div>
                  </div>

                  {/* ID Plan Guidance */}
                  <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                    <h5 className="font-bold text-[var(--color-text-title)] flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>แผนพัฒนาตนเองรายบุคคล (Individual Development Plan: ID Plan)</span>
                    </h5>
                    <p className="text-[var(--color-text-body)]">
                      {selectedTeacherForDetail.selfDevelopmentPlan || 'ยังไม่ได้ระบุแผนพัฒนาตนเอง'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPhotoTarget('detail');
                  setShowPhotoModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <Camera className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>ถ่ายรูป/เปลี่ยนรูปโปรไฟล์ครู</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ADD / EDIT TEACHER MODAL (With Major, Minor, Skills, Photo) */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-[var(--color-primary)] text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-white">
                  {editingTeacher ? 'แก้ไขข้อมูลคณาจารย์ &amp; วิทยฐานะ' : 'เพิ่มข้อมูลคณาจารย์ใหม่'}
                </h3>
                <p className="text-xs text-blue-100">ระบุข้อมูลวิชาเอก วิชาโท ประสบการณ์ และถ่ายรูปโปรไฟล์</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto text-xs">
              {formError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {formError}
                </p>
              )}
              {/* Interactive Tabs for smooth editing */}
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                <button
                  type="button"
                  onClick={() => setTeacherFormStep(1)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    teacherFormStep === 1
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>1. ข้อมูลทั่วไป &amp; ประวัติครู</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherFormStep(2)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    teacherFormStep === 2
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. การสอน, ทักษะ &amp; ว.PA</span>
                </button>
              </div>

              {teacherFormStep === 1 && (
                <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">รหัสครู/บุคลากร *</label>
                    <span className="text-[10px] text-[var(--color-text-muted)]">แก้ไขได้</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.teacherIdNumber || ''}
                    onChange={(e) => setFormData({ ...formData, teacherIdNumber: e.target.value })}
                    placeholder="เช่น TCH-2024-0012"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">เพศ</label>
                  <select
                    value={formData.gender || 'other'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Teacher['gender'] })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">ไม่ระบุ/อื่นๆ</option>
                  </select>
                </div>
              </div>
              {/* Photo Upload / Capture preview */}
              <div className="flex items-center gap-4 p-3.5 bg-[var(--color-card-subtle)] rounded-2xl border border-[var(--color-border)]">
                <img
                  src={formData.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
                  alt="Teacher Avatar"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[var(--color-primary)] shadow-sm"
                />
                <div className="flex-1 space-y-1">
                  <span className="font-bold text-[var(--color-text-title)] block">รูปถ่ายอาจารย์ผู้สอน</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoTarget('form');
                      setShowPhotoModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายรูปจากกล้อง / อัปโหลดไฟล์</span>
                  </button>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">
                      ชื่อ-สกุล (ภาษาไทย) *
                    </label>
                    <span className="text-[10px] text-rose-700 font-semibold">จำเป็น</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.fullNameTh || ''}
                    onChange={(e) => setFormData({ ...formData, fullNameTh: e.target.value })}
                    placeholder="เช่น ดร.ประเสริฐ ถาวร"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">
                      Full Name (English)
                    </label>
                    <span className="text-[10px] text-[var(--color-text-muted)]">แก้ไขได้</span>
                  </div>
                  <input
                    type="text"
                    value={formData.fullNameEn || ''}
                    onChange={(e) => setFormData({ ...formData, fullNameEn: e.target.value })}
                    placeholder="e.g. Dr. Prasert Thaworn"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">อีเมลติดต่อ</label>
                    <span className="text-[10px] text-[var(--color-text-muted)]">แก้ไขได้</span>
                  </div>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="teacher@eduverse.ac.th"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">เบอร์โทรศัพท์</label>
                    <span className="text-[10px] text-[var(--color-text-muted)]">แก้ไขได้</span>
                  </div>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">ประสบการณ์สอน (ปี)</label>
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold">แก้ไขได้อิสระ</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={formData.teachingExperienceYears ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      teachingExperienceYears: e.target.value === '' ? undefined : Number(e.target.value),
                    })}
                    placeholder="ระบุจำนวนปี เช่น 5 หรือ 0 (แก้ไขได้)"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                    * ไม่บังคับใส่ค่าทิ้งไว้ ระบุหรือแก้ไขได้ตามจริง
                  </span>
                </div>
              </div>
                </div>
              )}

              {teacherFormStep === 2 && (
                <div className="space-y-4">
              {/* Major & Minor Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">วิชาเอก (Major)</label>
                    <span className="text-[10px] text-[var(--color-text-muted)]">แก้ไขได้</span>
                  </div>
                  <input
                    type="text"
                    value={formData.major || ''}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    placeholder="เช่น วิทยาการคำนวณ, คณิตศาสตร์, ภาษาอังกฤษ"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-title)] font-bold">วิชาโท (Minor)</label>
                    <span className="text-[10px] text-[var(--color-text-muted)]">แก้ไขได้</span>
                  </div>
                  <input
                    type="text"
                    value={formData.minor || ''}
                    onChange={(e) => setFormData({ ...formData, minor: e.target.value })}
                    placeholder="เช่น ปัญญาประดิษฐ์ประยุกต์ / ภาษาไทย"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              {/* Academic Standing & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">ตำแหน่งบุคลากร</label>
                  <input
                    list="teacher-position-options"
                    value={formData.positionTitle || ''}
                    onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
                    placeholder="เลือกหรือพิมพ์ตำแหน่ง เช่น นักการภารโรง, เจ้าหน้าที่ธุรการ, ครู, ผอ."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                  />
                  <datalist id="teacher-position-options">
                    {resolvedPositionOptions.map((position) => <option key={position} value={position} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">
                    วิทยฐานะ (มาตรฐาน ว.PA)
                  </label>
                  <input
                    list="teacher-academic-standings"
                    value={formData.academicStanding || ''}
                    onChange={(e) => setFormData({ ...formData, academicStanding: e.target.value })}
                    placeholder="เลือกหรือพิมพ์วิทยฐานะ"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                  />
                  <datalist id="teacher-academic-standings">
                    {academicStandings.map((std) => (
                      <option key={std} value={std}>
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">กลุ่มสาระการเรียนรู้</label>
                  <input
                    list="teacher-departments"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="เลือกหรือพิมพ์กลุ่มสาระ/หน่วยงาน"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                  <datalist id="teacher-departments">
                    {departments.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">วุฒิการศึกษาสูงสุด</label>
                  <input
                    type="text"
                    value={formData.academicDegree || ''}
                    onChange={(e) => setFormData({ ...formData, academicDegree: e.target.value })}
                    placeholder="กรอกวุฒิการศึกษา"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">เลขที่ใบอนุญาตประกอบวิชาชีพ</label>
                  <input
                    type="text"
                    value={formData.teacherLicenseNo || ''}
                    onChange={(e) => setFormData({ ...formData, teacherLicenseNo: e.target.value })}
                    placeholder="กรอกเลขที่ใบอนุญาต"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              {/* Other Skills (Requirement 2) */}
              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">
                  ความสามารถพิเศษอื่นๆ (เช่น Python, หุ่นยนต์, ดนตรี, ภาษาอังกฤษ, AI)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSkillInput.trim()) {
                          setFormData({
                            ...formData,
                            otherSkills: [...(formData.otherSkills || []), newSkillInput.trim()],
                          });
                          setNewSkillInput('');
                        }
                      }
                    }}
                    placeholder="พิมพ์ความสามารถแล้วกด Enter หรือ เพิ่ม..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSkillInput.trim()) {
                        setFormData({
                          ...formData,
                          otherSkills: [...(formData.otherSkills || []), newSkillInput.trim()],
                        });
                        setNewSkillInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <PagedList items={formData.otherSkills || []} pageSize={4} renderItem={(skill, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold">
                      ⭐ {skill}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            otherSkills: (formData.otherSkills || []).filter((_, i) => i !== idx),
                          });
                        }}
                        className="hover:text-rose-700 dark:hover:text-rose-300 font-bold ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  )} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">ห้องที่ปรึกษา/ห้องประจำชั้น</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={homeroomInput}
                      onChange={(e) => setHomeroomInput(e.target.value)}
                      placeholder="พิมพ์ชื่อห้องแล้วกดเพิ่ม"
                      className="min-w-0 flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const value = homeroomInput.trim();
                        if (!value) return;
                        setFormData({ ...formData, homeroomClasses: [...(formData.homeroomClasses || []), value] });
                        setHomeroomInput('');
                      }}
                      className="px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-semibold cursor-pointer"
                    >
                      เพิ่ม
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(formData.homeroomClasses || []).map((room, idx) => (
                      <span key={`${room}-${idx}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1">
                        {room}
                        <button type="button" aria-label={`ลบ ${room}`} onClick={() => setFormData({
                          ...formData,
                          homeroomClasses: (formData.homeroomClasses || []).filter((_, i) => i !== idx),
                        })} className="font-bold text-rose-700 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">ระดับชั้นที่สอน</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      placeholder="พิมพ์ระดับชั้นแล้วกดเพิ่ม"
                      className="min-w-0 flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const value = gradeInput.trim();
                        if (!value) return;
                        setFormData({ ...formData, teachingGrades: [...(formData.teachingGrades || []), value] });
                        setGradeInput('');
                      }}
                      className="px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-semibold cursor-pointer"
                    >
                      เพิ่ม
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(formData.teachingGrades || []).map((grade, idx) => (
                      <span key={`${grade}-${idx}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1">
                        {grade}
                        <button type="button" aria-label={`ลบ ${grade}`} onClick={() => setFormData({
                          ...formData,
                          teachingGrades: (formData.teachingGrades || []).filter((_, i) => i !== idx),
                        })} className="font-bold text-rose-700 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">วุฒิบัตร/ใบรับรอง</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={certificationInput}
                    onChange={(e) => setCertificationInput(e.target.value)}
                    placeholder="พิมพ์ชื่อวุฒิบัตรแล้วกดเพิ่ม"
                    className="min-w-0 flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = certificationInput.trim();
                      if (!value) return;
                      setFormData({ ...formData, certifications: [...(formData.certifications || []), value] });
                      setCertificationInput('');
                    }}
                    className="px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-semibold cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(formData.certifications || []).map((certification, idx) => (
                    <span key={`${certification}-${idx}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1">
                      {certification}
                      <button type="button" aria-label={`ลบ ${certification}`} onClick={() => setFormData({
                        ...formData,
                        certifications: (formData.certifications || []).filter((_, i) => i !== idx),
                      })} className="font-bold text-rose-700 cursor-pointer">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">คะแนน PA (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.paScore ?? ''}
                    onChange={(e) => setFormData({ ...formData, paScore: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">LINE User ID</label>
                  <input
                    type="text"
                    value={formData.lineUserId || ''}
                    onChange={(e) => setFormData({ ...formData, lineUserId: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-body)]">
                <input
                  type="checkbox"
                  checked={Boolean(formData.lineLinked)}
                  onChange={(e) => setFormData({ ...formData, lineLinked: e.target.checked })}
                />
                เชื่อมต่อ LINE แล้ว
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-body)]">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isSchoolAdmin)}
                  onChange={(e) => setFormData({ ...formData, isSchoolAdmin: e.target.checked })}
                />
                กำหนดให้เป็นผู้ดูแลโรงเรียน
              </label>
              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">แผนพัฒนาตนเอง (ID Plan)</label>
                <textarea
                  rows={3}
                  value={formData.selfDevelopmentPlan || ''}
                  onChange={(e) => setFormData({ ...formData, selfDevelopmentPlan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              {/* Teaching Subjects */}
              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">รายวิชาที่สอน</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="เช่น ว30101 วิทยาการคำนวณ"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (subjectInput.trim()) {
                        setFormData({
                          ...formData,
                          teachingSubjects: [...(formData.teachingSubjects || []), subjectInput.trim()],
                        });
                        setSubjectInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-semibold cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <PagedList items={formData.teachingSubjects || []} pageSize={4} renderItem={(sub, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] text-[11px] font-medium">
                      {sub}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            teachingSubjects: (formData.teachingSubjects || []).filter((_, i) => i !== idx),
                          });
                        }}
                        className="hover:text-rose-700 dark:hover:text-rose-300 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  )} />
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setTeacherFormStep(1)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
                >
                  ← ย้อนกลับ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold shadow-md cursor-pointer"
                  >
                    {editingTeacher ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลอาจารย์'}
                  </button>
                </div>
              </div>
                </div>
              )}
              {teacherFormStep === 1 && (
                <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTeacherFormStep(2)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-bold cursor-pointer transition"
                    >
                      ถัดไป: ข้อมูลการสอน &amp; ว.PA →
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold shadow-md cursor-pointer"
                    >
                      {editingTeacher ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลอาจารย์'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ADD PA PORTFOLIO ITEM MODAL */}
      {/* ======================================================== */}
      {showAddPaModal && selectedTeacherForDetail && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h4 className="font-semibold text-sm text-[var(--color-text-title)]">เพิ่มชิ้นงานข้อตกลงพัฒนางาน (ว.PA)</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPaModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPaItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">
                  ชื่อผลงาน / นวัตกรรมการสอน *
                </label>
                <input
                  type="text"
                  required
                  value={paTitle}
                  onChange={(e) => setPaTitle(e.target.value)}
                  placeholder="เช่น การพัฒนาชุดกิจกรรม Active Learning เพื่อยกระดับผลสัมฤทธิ์..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">หมวดผลงาน</label>
                  <select
                    value={paCategory}
                    onChange={(e) => setPaCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    <option value="pa_agreement">ข้อตกลง PA ประจำปี</option>
                    <option value="classroom_research">งานวิจัยในชั้นเรียน</option>
                    <option value="lesson_plan">แผนการจัดการเรียนรู้</option>
                    <option value="teaching_media">สื่อนวัตกรรมการสอนดิจิทัล</option>
                    <option value="award_honor">รางวัลเกียรติยศ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--color-text-title)] font-bold mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={paYear}
                    onChange={(e) => setPaYear(e.target.value)}
                    placeholder={academicYear}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">ด้านตามเกณฑ์ ก.ค.ศ.</label>
                <select
                  value={paAspect}
                  onChange={(e) => setPaAspect(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                >
                  <option value="ด้านที่ 1 การจัดการเรียนรู้">ด้านที่ 1 การจัดการเรียนรู้</option>
                  <option value="ด้านที่ 2 การส่งเสริมสนับสนุน">ด้านที่ 2 การส่งเสริมสนับสนุน</option>
                  <option value="ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ">ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-text-title)] font-bold mb-1">คำอธิบายรายละเอียดผลลัพธ์</label>
                <textarea
                  rows={2}
                  value={paDescription}
                  onChange={(e) => setPaDescription(e.target.value)}
                  placeholder="อธิบายกระบวนการพัฒนาและผลการเรียนรู้ของผู้เรียน..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  บันทึกผลงาน PA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Image Capture & Upload Modal */}
      <ImageCaptureUploadModal
        isOpen={showPhotoModal}
        currentImageUrl={photoTarget === 'form' ? formData.avatarUrl : selectedTeacherForDetail?.avatarUrl}
        title="ถ่ายรูปสดหรืออัปโหลดรูปภาพครูผู้สอน"
        onSelectImage={handlePhotoSelected}
        onClose={() => setShowPhotoModal(false)}
      />

      {/* Admin Staff Positions, Departments & Standings Manager Modal */}
      {showStaffMetaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-5 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  จัดการตำแหน่งบุคลากร กลุ่มสาระ และวิทยฐานะ (Admin กำหนดเองได้)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  กำหนดได้ตั้งแต่นักการภารโรง เจ้าหน้าที่ธุรการ ครูอัตราจ้าง ครู รองผู้อำนวยการ ผู้อำนวยการ หรือเพิ่มตำแหน่งใหม่
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffMetaModal(false)}
                className="text-lg font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Positions */}
            <div className="space-y-2">
              <div className="font-bold text-[var(--color-text-title)]">1. ตำแหน่งบุคลากร ({resolvedPositionOptions.length} ตำแหน่ง)</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPositionInput}
                  onChange={(e) => setNewPositionInput(e.target.value)}
                  placeholder="เพิ่มตำแหน่งใหม่ เช่น บรรณารักษ์, แม่บ้าน, ช่างเทคนิค"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  disabled={savingPositions}
                  onClick={async () => {
                    const val = newPositionInput.trim();
                    if (!val) return;
                    const next = Array.from(new Set([...resolvedPositionOptions, val]));
                    setSavingPositions(true);
                    try {
                      await onUpdateStaffPositionOptions?.(next);
                      setNewPositionInput('');
                    } finally {
                      setSavingPositions(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  + เพิ่มตำแหน่ง
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resolvedPositionOptions.map((pos) => (
                  <span key={pos} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold">
                    <span>{pos}</span>
                    {resolvedPositionOptions.length > 1 && onUpdateStaffPositionOptions && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = resolvedPositionOptions.filter((p) => p !== pos);
                          void onUpdateStaffPositionOptions(next);
                        }}
                        className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                        title="ลบตำแหน่งนี้"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Departments */}
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <div className="font-bold text-[var(--color-text-title)]">2. กลุ่มสาระ / ฝ่ายงาน ({departments.length})</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDepartmentInput}
                  onChange={(e) => setNewDepartmentInput(e.target.value)}
                  placeholder="เพิ่มฝ่ายงาน / กลุ่มสาระใหม่"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newDepartmentInput.trim();
                    if (!val) return;
                    updatePresets({ departments: [...departments, val] });
                    setNewDepartmentInput('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  + เพิ่มฝ่ายงาน
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {departments.map((dept) => (
                  <span key={dept} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]">
                    <span>{dept}</span>
                    {departments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updatePresets({ departments: departments.filter((d) => d !== dept) })}
                        className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Academic Standings */}
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <div className="font-bold text-[var(--color-text-title)]">3. วิทยฐานะ / ประเภทการจ้าง ({academicStandings.length})</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStandingInput}
                  onChange={(e) => setNewStandingInput(e.target.value)}
                  placeholder="เพิ่มวิทยฐานะหรือประเภทการจ้างใหม่"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newStandingInput.trim();
                    if (!val) return;
                    updatePresets({ academicStandings: [...academicStandings, val] });
                    setNewStandingInput('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer"
                >
                  + เพิ่มวิทยฐานะ
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {academicStandings.map((st) => (
                  <span key={st} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]">
                    <span>{st}</span>
                    {academicStandings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updatePresets({ academicStandings: academicStandings.filter((x) => x !== st) })}
                        className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {inviteModalTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[var(--color-primary)] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <h3 className="text-sm font-bold">เชิญครู / บุคลากรเข้าสู่ระบบ</h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalTeacher(null)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmitTeacherInvite(e)} className="p-5 space-y-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 text-xs space-y-1">
                <p className="font-bold text-[var(--color-text-title)]">{inviteModalTeacher.fullNameTh}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  รหัส: {inviteModalTeacher.teacherIdNumber} · {inviteModalTeacher.positionTitle || inviteModalTeacher.department || 'ครูผู้สอน'}
                </p>
              </div>

              {inviteFeedback && inviteFeedback.type === 'error' && (
                <div role="alert" className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
                  {inviteFeedback.message}
                </div>
              )}

              <label className="block text-xs font-bold text-[var(--color-text-title)] space-y-1">
                <span>อีเมลของคุณครูสำหรับรับลิงก์ตั้งรหัสผ่าน</span>
                <input
                  type="email"
                  required
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  placeholder="teacher@school.ac.th"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                />
              </label>

              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                ระบบจะส่งลิงก์เชิญผ่าน Supabase Auth ให้คุณครูตั้งรหัสผ่านและเข้าสู่ระบบในสิทธิ์ <strong className="text-[var(--color-text-title)]">ครูผู้สอน (teacher)</strong> ของโรงเรียนนี้โดยอัตโนมัติ
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setInviteModalTeacher(null)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inviteSubmitting ? 'กำลังส่งคำเชิญ...' : 'ส่งคำเชิญเข้าสู่ระบบ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
