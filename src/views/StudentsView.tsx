import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Student, StudentStatus, GuardianInfo, School, UserRole } from '../types';
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
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Send,
  X,
} from 'lucide-react';
import {
  approveStudentAccountInSupabase,
  deleteStudentAccountRegistrationInSupabase,
  inviteStudentAccount,
  inviteTeacherOrParentAccount,
  linkStudentAccountToStudent,
  listSchoolStaffParentAccounts,
  listStudentAccountLinks,
  StaffParentAccountLink,
  StudentAccountLink,
  updateStudentAccountStatusInSupabase,
} from '../lib/authDb';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';
import { PagedList } from '../components/PagedList';
import { 
  ALL_GRADE_LEVELS, 
  STUDENT_STATUS_DETAILS 
} from '../data/studentAcademicData';
import { StudentPromotionModal } from '../components/modals/StudentPromotionModal';
import { getStudentDuplicateReasons } from '../lib/duplicateRecords';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';

const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 15
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
  activeSchool?: School;
  currentRole?: UserRole;
  onSelectStudent: (student: Student) => void;
  onOpenReportCard: (student: Student) => void;
  onToggleLineSync: (studentId: string) => void;
  onAddStudent: (newStudent: Student) => void;
  onAddStudents?: (newStudents: Student[]) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
  onPurgeSampleStudents?: () => Promise<void> | void;
  onOpenImportExport?: () => void;
  onBatchUpdateStudents?: (updatedStudents: Student[]) => void;
  onUpdateRoomOptions?: (roomOptions: string[]) => Promise<void>;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  activeSchool,
  currentRole = 'admin',
  onSelectStudent,
  onOpenReportCard,
  onToggleLineSync,
  onAddStudent,
  onAddStudents,
  onUpdateStudent,
  onDeleteStudent,
  onPurgeSampleStudents,
  onOpenImportExport,
  onBatchUpdateStudents,
  onUpdateRoomOptions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics' | 'approvals'>('roster');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'table' | 'paste'>('table');
  const [bulkGradeLevel, setBulkGradeLevel] = useState('มัธยมศึกษาปีที่ 4 (M.4)');
  const [bulkRoom, setBulkRoom] = useState('ม.4/1');
  const [bulkStudentRows, setBulkStudentRows] = useState('');
  const [bulkTableRows, setBulkTableRows] = useState<Array<{ studentIdNumber: string; firstNameTh: string; lastNameTh: string; gender: 'male' | 'female' | 'other' }>>([
    { studentIdNumber: '', firstNameTh: '', lastNameTh: '', gender: 'male' },
    { studentIdNumber: '', firstNameTh: '', lastNameTh: '', gender: 'female' },
    { studentIdNumber: '', firstNameTh: '', lastNameTh: '', gender: 'male' },
  ]);
  const [bulkAddError, setBulkAddError] = useState<string | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [studentFormStep, setStudentFormStep] = useState<1 | 2>(1);

  const canManageApprovals = ['admin', 'super_admin'].includes(currentRole);
  const schoolId = activeSchool?.id || students[0]?.schoolId || 'sch-bkk-01';
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const roomOptions = activeSchool?.roomOptions?.length ? activeSchool.roomOptions : presets.roomOptions;
  const [showRoomPresetModal, setShowRoomPresetModal] = useState(false);
  const [newPresetGradeInput, setNewPresetGradeInput] = useState('');
  const [newPresetRoomInput, setNewPresetRoomInput] = useState('');
  const [editingRoomOption, setEditingRoomOption] = useState<string | null>(null);
  const [roomOptionDraft, setRoomOptionDraft] = useState('');
  const [roomPresetError, setRoomPresetError] = useState<string | null>(null);
  const [isSavingRoomOptions, setIsSavingRoomOptions] = useState(false);
  const [accountLinks, setAccountLinks] = useState<StudentAccountLink[]>([]);
  const [parentAccounts, setParentAccounts] = useState<StaffParentAccountLink[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsSuccess, setAccountsSuccess] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [processingAccountId, setProcessingAccountId] = useState<string | null>(null);
  const [invitingStudentId, setInvitingStudentId] = useState<string | null>(null);
  const [inviteDialog, setInviteDialog] = useState<{ role: 'student' | 'parent'; student: Student } | null>(null);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteFullNameInput, setInviteFullNameInput] = useState('');
  const [inviteModalError, setInviteModalError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    detailNote?: string;
    confirmLabel: string;
    action: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const refreshAccountLinks = useCallback(async () => {
    if (!canManageApprovals) return;
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const [list, staffParents] = await Promise.all([
        listStudentAccountLinks(schoolId),
        listSchoolStaffParentAccounts(schoolId).catch(() => []),
      ]);
      setAccountLinks(list);
      setParentAccounts(staffParents.filter((item) => item.role === 'parent'));
      setLinkDrafts((prev) => {
        const next = { ...prev };
        list.forEach((acc) => {
          if (acc.student_id && !next[acc.id]) {
            next[acc.id] = acc.student_id;
          }
        });
        return next;
      });
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการคำขอสมัครได้');
    } finally {
      setAccountsLoading(false);
    }
  }, [canManageApprovals, schoolId]);

  useEffect(() => {
    void refreshAccountLinks();
  }, [refreshAccountLinks]);

  const pendingAccountsCount = useMemo(
    () => accountLinks.filter((a) => a.status === 'pending').length,
    [accountLinks]
  );

  const saveRoomOptions = async (nextOptions: string[]) => {
    const cleanedOptions = [...new Set(nextOptions.map((option) => option.trim()).filter(Boolean))];
    if (cleanedOptions.length === 0) {
      setRoomPresetError('ต้องมีห้องเรียนอย่างน้อย 1 ห้อง');
      return false;
    }

    setIsSavingRoomOptions(true);
    setRoomPresetError(null);
    try {
      await onUpdateRoomOptions?.(cleanedOptions);
      updatePresets({ roomOptions: cleanedOptions });
      return true;
    } catch (error) {
      setRoomPresetError(error instanceof Error ? error.message : 'บันทึกรายการห้องเรียนไม่สำเร็จ');
      return false;
    } finally {
      setIsSavingRoomOptions(false);
    }
  };

  const handleApproveStudentAccount = async (account: StudentAccountLink) => {
    setProcessingAccountId(account.id);
    setAccountsError(null);
    setAccountsSuccess(null);
    const chosenStudentId = linkDrafts[account.id] || account.student_id || '';
    try {
      await approveStudentAccountInSupabase(schoolId, account.id, chosenStudentId || null);
      if (chosenStudentId) {
        await linkStudentAccountToStudent(schoolId, account.id, chosenStudentId);
      }
      await refreshAccountLinks();
      setAccountsSuccess(`อนุมัติบัญชีนักเรียน "${account.full_name_th || account.full_name_en}" เปิดใช้งานเรียบร้อยแล้ว`);
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : 'อนุมัติบัญชีไม่สำเร็จ');
    } finally {
      setProcessingAccountId(null);
    }
  };

  const handleUpdateStudentStatus = async (account: StudentAccountLink, nextStatus: 'active' | 'suspended' | 'pending') => {
    setProcessingAccountId(account.id);
    setAccountsError(null);
    setAccountsSuccess(null);
    try {
      await updateStudentAccountStatusInSupabase(schoolId, account.id, nextStatus);
      await refreshAccountLinks();
      setAccountsSuccess(
        nextStatus === 'suspended'
          ? `ระงับสิทธิ์บัญชี "${account.full_name_th}" เรียบร้อยแล้ว`
          : `เปิดใช้งานบัญชี "${account.full_name_th}" เรียบร้อยแล้ว`
      );
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : 'อัปเดตสถานะบัญชีไม่สำเร็จ');
    } finally {
      setProcessingAccountId(null);
    }
  };

  const handleRequestDeleteStudentAccount = (account: StudentAccountLink) => {
    const displayName = account.full_name_th || account.full_name_en || account.email || 'ไม่ระบุชื่อ';
    setPendingConfirm({
      title: 'ยืนยันยกเลิก/ลบคำขอลงทะเบียนนักเรียน',
      description: `ต้องการยกเลิกและลบบัญชีลงทะเบียนของ "${displayName}" ออกจากรายการโรงเรียนหรือไม่?`,
      detailNote: 'ระบบจะลบโปรไฟล์บัญชีผู้ใช้งานในโรงเรียนนี้ออกจากฐานข้อมูล และล้างสถานะการจับคู่ระเบียนที่เกี่ยวข้องออกทั้งหมด',
      confirmLabel: 'ยืนยันยกเลิก/ลบคำขอ',
      action: async () => {
        setProcessingAccountId(account.id);
        setAccountsError(null);
        setAccountsSuccess(null);
        try {
          await deleteStudentAccountRegistrationInSupabase(schoolId, account.id);
          setAccountLinks((prev) => prev.filter((item) => item.id !== account.id));
          setLinkDrafts((prev) => {
            const next = { ...prev };
            delete next[account.id];
            return next;
          });
          setAccountsSuccess(`ยกเลิกและลบคำขอลงทะเบียนของ "${displayName}" เรียบร้อยแล้ว`);
        } catch (err) {
          setAccountsError(err instanceof Error ? err.message : 'ไม่สามารถยกเลิก/ลบคำขอลงทะเบียนได้');
        } finally {
          setProcessingAccountId(null);
        }
      },
    });
  };

  const handleRequestDeleteStudent = (student: Student) => {
    if (!onDeleteStudent) return;
    setPendingConfirm({
      title: 'ยืนยันลบ/ยกเลิกทะเบียนนักเรียน',
      description: `ต้องการลบข้อมูลนักเรียน "${student.firstNameTh} ${student.lastNameTh}" (${student.studentIdNumber}) ออกจากระบบหรือไม่?`,
      detailNote: 'ระบบจะลบประวัตินักเรียน การลงทะเบียนรายวิชา คะแนนเก็บ/เกรด การเช็กชื่อ ใบแจ้งหนี้ และล้างข้อมูลออกจากแคชในเครื่องและฐานข้อมูล',
      confirmLabel: 'ยืนยันลบข้อมูลนักเรียน',
      action: async () => {
        setAccountsError(null);
        try {
          await onDeleteStudent(student.id);
          setAccountsSuccess(`ลบข้อมูลนักเรียน "${student.firstNameTh} ${student.lastNameTh}" (${student.studentIdNumber}) และล้างข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว`);
        } catch (err) {
          setAccountsError(err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลนักเรียนได้');
        }
      },
    });
  };

  const handleRequestPurgeSampleStudents = () => {
    if (!onPurgeSampleStudents) return;
    setPendingConfirm({
      title: 'ยืนยันล้างข้อมูลนักเรียนตัวอย่างทั้งหมด',
      description: 'ต้องการล้างข้อมูลนักเรียนตัวอย่างทั้งหมด (รหัสอ้างอิงตัวอย่าง) ออกจากโรงเรียนนี้หรือไม่?',
      detailNote: 'ข้อมูลนักเรียนจริงที่เพิ่มใหม่จะไม่ถูกลบ ระบบจะล้างข้อมูลตัวอย่างและรายการลงทะเบียนที่ผูกอยู่ออกจากแคชและฐานข้อมูล',
      confirmLabel: 'ยืนยันล้างข้อมูลตัวอย่าง',
      action: async () => {
        setAccountsError(null);
        try {
          await onPurgeSampleStudents();
          setAccountsSuccess('ล้างข้อมูลนักเรียนตัวอย่างทั้งหมดเรียบร้อยแล้ว');
        } catch (err) {
          setAccountsError(err instanceof Error ? err.message : 'ไม่สามารถล้างข้อมูลตัวอย่างได้');
        }
      },
    });
  };

  const handleOpenInviteModal = (student: Student, role: 'student' | 'parent') => {
    setInviteDialog({ role, student });
    setInviteModalError(null);
    if (role === 'parent') {
      setInviteEmailInput(student.guardianEmail?.trim() || '');
      setInviteFullNameInput(student.guardianName?.trim() || '');
    } else {
      setInviteEmailInput('');
      setInviteFullNameInput(`${student.firstNameTh} ${student.lastNameTh}`.trim());
    }
  };

  const handleSubmitInviteDialog = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteDialog) return;
    const email = inviteEmailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteModalError('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    const { role, student } = inviteDialog;
    setInvitingStudentId(student.id);
    setInviteModalError(null);
    setAccountsError(null);
    setAccountsSuccess(null);
    try {
      if (role === 'student') {
        await inviteStudentAccount({ schoolId, studentId: student.id, email });
        setAccountsSuccess(`ส่งคำเชิญตั้งค่าบัญชีนักเรียน (${student.firstNameTh} ${student.lastNameTh}) ไปที่ ${email} แล้ว`);
      } else {
        await inviteTeacherOrParentAccount({
          schoolId,
          inviteRole: 'parent',
          studentId: student.id,
          email,
          fullNameTh: inviteFullNameInput.trim() || student.guardianName || `ผู้ปกครองของ ${student.firstNameTh}`,
          fullNameEn: inviteFullNameInput.trim() || student.guardianName || '',
        });
        setAccountsSuccess(`ส่งคำเชิญผู้ปกครองของ ${student.firstNameTh} ${student.lastNameTh} ไปที่ ${email} แล้ว`);
        await refreshAccountLinks();
      }
      setInviteDialog(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ส่งคำเชิญบัญชีไม่สำเร็จ';
      setInviteModalError(msg);
    } finally {
      setInvitingStudentId(null);
    }
  };

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
      const duplicateReasons = getStudentDuplicateReasons([updated], students, [editingStudent.id]);
      if (duplicateReasons.length > 0 &&
        !confirm(`${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`)) return;
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

    const duplicateReasons = getStudentDuplicateReasons([newStudent], students);
    if (duplicateReasons.length > 0 &&
      !confirm(`${duplicateReasons.join(' และ ')} ต้องการเพิ่มนักเรียนต่อหรือไม่?`)) return;
    onAddStudent(newStudent);
    setShowAddModal(false);
  };

  const buildDefaultBulkRows = (count = 5) => {
    const numericSuffixes = students
      .map((s) => Number(String(s.studentIdNumber || '').replace(/\D+/g, '')))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 999999);
    const baseNum = numericSuffixes.length > 0 ? Math.max(...numericSuffixes) + 1 : 69001;
    return Array.from({ length: count }, (_, idx) => ({
      studentIdNumber: `${baseNum + idx}`,
      firstNameTh: '',
      lastNameTh: '',
      gender: 'male' as const,
    }));
  };

  const handleOpenBulkModal = () => {
    setBulkAddError(null);
    setBulkGradeLevel(formData.gradeLevel || 'มัธยมศึกษาปีที่ 4 (M.4)');
    setBulkRoom(formData.room || 'ม.4/1');
    setBulkMode('table');
    setBulkTableRows(buildDefaultBulkRows(5));
    setShowBulkAddModal(true);
  };

  const handleSaveBulkStudents = () => {
    if (!bulkGradeLevel.trim() || !bulkRoom.trim()) {
      setBulkAddError('กรุณาระบุระดับชั้นและห้องเรียน');
      return;
    }

    let parsedRows: Array<{ studentIdNumber: string; firstNameTh: string; lastNameTh: string; gender: 'male' | 'female' | 'other' }> = [];
    if (bulkMode === 'table') {
      const filled = bulkTableRows.filter((r) => r.firstNameTh.trim() || r.lastNameTh.trim() || r.studentIdNumber.trim());
      const missingName = filled.find((r) => !r.firstNameTh.trim() || !r.lastNameTh.trim());
      if (filled.length === 0 || missingName) {
        setBulkAddError('กรุณากรอกอย่างน้อย ชื่อ และ นามสกุล ของนักเรียนที่ต้องการเพิ่มให้ครบถ้วน');
        return;
      }
      parsedRows = filled.map((r, idx) => ({
        studentIdNumber: r.studentIdNumber.trim() || `STD-${Date.now().toString().slice(-4)}${idx + 1}`,
        firstNameTh: r.firstNameTh.trim(),
        lastNameTh: r.lastNameTh.trim(),
        gender: r.gender,
      }));
    } else {
      const rows = bulkStudentRows
        .split(/\r?\n/)
        .map((row) => row.split(/[,\t]/).map((cell) => cell.trim()))
        .filter((cells) => cells.some(Boolean))
        .filter((cells, index) => !(index === 0 && /รหัส|student.?id/i.test(cells[0] || '')));
      if (rows.length === 0) {
        setBulkAddError('กรุณาวางรายชื่อนักเรียนอย่างน้อย 1 แถว');
        return;
      }
      // Support 3 cols (id, first, last) OR 2 cols (first, last)
      const invalidRow = rows.find((cells) => cells.length < 2 || !cells[0] || !cells[1]);
      if (invalidRow) {
        setBulkAddError('กรุณากรอกแต่ละแถวเป็น "รหัส, ชื่อ, นามสกุล" หรือ "ชื่อ, นามสกุล"');
        return;
      }
      parsedRows = rows.map((cells, index) => {
        if (cells.length >= 3) {
          return {
            studentIdNumber: cells[0],
            firstNameTh: cells[1],
            lastNameTh: cells[2],
            gender: 'other' as const,
          };
        }
        return {
          studentIdNumber: `STD-${Date.now().toString().slice(-4)}${index + 1}`,
          firstNameTh: cells[0],
          lastNameTh: cells[1],
          gender: 'other' as const,
        };
      });
    }

    const newStudents: Student[] = parsedRows.map((row, index) => ({
      id: `stu-${Date.now()}-${index}`,
      studentIdNumber: row.studentIdNumber,
      firstNameEn: row.firstNameTh,
      lastNameEn: row.lastNameTh,
      firstNameTh: row.firstNameTh,
      lastNameTh: row.lastNameTh,
      gender: row.gender,
      dateOfBirth: '',
      gradeLevel: bulkGradeLevel.trim(),
      room: bulkRoom.trim(),
      status: 'active',
      avatarUrl: '',
      gpa: 0,
      guardianName: '',
      guardianRelation: '',
      guardianPhone: '',
      guardianEmail: '',
      guardians: [],
      lineLinked: false,
      lineNotifyEnabled: false,
      enrolledDate: new Date().toISOString().split('T')[0],
    }));

    // Check intra-batch duplicates and duplicates against existing students
    const batchIdSet = new Set<string>();
    const batchNameSet = new Set<string>();
    let hasIntraDuplicate = false;
    newStudents.forEach((s) => {
      const idKey = s.studentIdNumber.toLowerCase();
      const nameKey = `${s.firstNameTh}|${s.lastNameTh}`.toLowerCase();
      if (batchIdSet.has(idKey) || batchNameSet.has(nameKey)) hasIntraDuplicate = true;
      batchIdSet.add(idKey);
      batchNameSet.add(nameKey);
    });

    const duplicateReasons = getStudentDuplicateReasons(newStudents, students);
    if (hasIntraDuplicate) {
      duplicateReasons.unshift('พบข้อมูลนักเรียนซ้ำกันเองภายในรายชื่อชุดนี้');
    }
    if (duplicateReasons.length > 0 &&
      !confirm(`${duplicateReasons.join(' และ ')} ต้องการเพิ่มนักเรียนชุดนี้ต่อหรือไม่?`)) {
      return;
    }

    if (onAddStudents) onAddStudents(newStudents);
    else newStudents.forEach(onAddStudent);
    setBulkStudentRows('');
    setBulkAddError(null);
    setShowBulkAddModal(false);
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
      {accountsError && (
        <div role="alert" className="shrink-0 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 px-3 py-2 text-xs text-rose-800 dark:text-rose-200 font-medium">
          {accountsError}
        </div>
      )}
      {accountsSuccess && (
        <div role="status" className="shrink-0 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
          {accountsSuccess}
        </div>
      )}
      {/* Header controls */}
      <div className="shrink-0 p-3 app-page-header flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            ทะเบียนนักเรียน (DMC / SIS)
          </h1>
          <span className="text-xs text-[var(--color-text-muted)] font-mono tabular-nums whitespace-nowrap">
            · {filteredStudents.length} คน
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <details className="relative">
            <summary className="flex list-none cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] whitespace-nowrap">
              <span>จัดการข้อมูล</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute right-0 top-full z-30 mt-1.5 min-w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg space-y-0.5">
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  setShowPromotionModal(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                <span>เลื่อนชั้นเรียนข้ามปี (Promotion)</span>
              </button>

              {onOpenImportExport && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    onOpenImportExport();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <span>นำเข้า/ส่งออก Excel</span>
                </button>
              )}

              {['admin', 'super_admin'].includes(currentRole) && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    setShowRoomPresetModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  <span>ตั้งค่าระดับชั้น/ห้องเรียน</span>
                </button>
              )}

              {onPurgeSampleStudents && ['admin', 'super_admin'].includes(currentRole) && students.some(s => s.id.startsWith('std-0') || s.id.startsWith('std-demo') || s.id.startsWith('std-mock')) && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    handleRequestPurgeSampleStudents();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-700 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>ล้างข้อมูลตัวอย่าง</span>
                </button>
              )}
            </div>
          </details>

          {['admin', 'super_admin', 'teacher'].includes(currentRole) && (
            <button
              type="button"
              onClick={handleOpenBulkModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              <span>เพิ่มนักเรียนทั้งห้อง</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มนักเรียนใหม่</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-1.5">
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
        {canManageApprovals && (
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>คำขอสมัครเข้าโรงเรียน / อนุมัติบัญชี</span>
            {pendingAccountsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold tabular-nums">
                {pendingAccountsCount} รออนุมัติ
              </span>
            )}
          </button>
        )}
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

      {activeTab === 'roster' && accountsSuccess && (
        <div role="status" className="shrink-0 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center justify-between gap-2">
          <span>{accountsSuccess}</span>
          <button type="button" onClick={() => setAccountsSuccess(null)} className="text-xs font-bold cursor-pointer">✕</button>
        </div>
      )}

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
                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
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

                          {canManageApprovals && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenInviteModal(student, 'student')}
                                disabled={invitingStudentId === student.id}
                                className="p-1.5 rounded-lg bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-primary-text)] transition-colors cursor-pointer disabled:opacity-50"
                                title="ส่งคำเชิญให้นักเรียนตั้งค่าบัญชี"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenInviteModal(student, 'parent')}
                                disabled={invitingStudentId === student.id}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                                title="เชิญผู้ปกครองเข้าใช้งานและผูกกับนักเรียน"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {onDeleteStudent && (
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteStudent(student)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                              title="ยกเลิก/ลบข้อมูลนักเรียน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">ยกเลิก/ลบ</span>
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
              <div className="text-2xl font-bold text-[var(--color-text-title)] mt-1">{students.length} คน</div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">ในโรงเรียนปัจจุบัน</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">กำลังศึกษา (Active)</span>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {students.filter(s => (s.status || 'active') === 'active').length} คน
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                ย้ายเข้า: {students.filter(s => s.status === 'transferred_in').length} • ย้ายออก: {students.filter(s => s.status === 'transferred_out' || s.status === 'transferred').length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">เชื่อมต่อ LINE OA</span>
              <div className="text-2xl font-bold text-[var(--color-primary-text)] mt-1">
                {students.filter(s => s.lineLinked).length} คน
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {students.length > 0 ? Math.round((students.filter(s => s.lineLinked).length / students.length) * 100) : 0}% อัตราเชื่อมต่อ
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase">สำเร็จการศึกษาแล้ว</span>
              <div className="text-2xl font-bold text-[var(--color-primary-text)] mt-1">
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
                    <div className="text-lg font-mono font-bold text-[var(--color-text-title)]">
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

      {activeTab === 'approvals' && canManageApprovals && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span>อนุมัติการสมัครเข้าโรงเรียนของนักเรียน &amp; ผูกระเบียน DMC</span>
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  นักเรียนที่สมัครสมาชิกด้วยตนเองจากหน้าลงทะเบียนจะมีสถานะ <strong className="text-[var(--color-text-title)]">รออนุมัติ (pending)</strong> ผู้ดูแลโรงเรียนสามารถกดอนุมัติเปิดใช้งานและจับคู่กับระเบียนนักเรียนได้ทันที (เข้าถึงได้ทั้งจากหน้านี้และเมนู ตั้งค่าระบบ → อนุมัติ &amp; ผูกบัญชีนักเรียน)
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshAccountLinks()}
                disabled={accountsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-text-title)] cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${accountsLoading ? 'animate-spin' : ''}`} />
                <span>รีเฟรชรายการ</span>
              </button>
            </div>

            {accountsError && (
              <div role="alert" className="rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 px-3 py-2 text-xs text-rose-800 dark:text-rose-200 font-medium">
                {accountsError}
              </div>
            )}
            {accountsSuccess && (
              <div role="status" className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                {accountsSuccess}
              </div>
            )}

            {accountsLoading ? (
              <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">กำลังโหลดรายการสมัครสมาชิกของนักเรียน...</p>
            ) : accountLinks.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">ยังไม่มีคำขอสมัครสมาชิกนักเรียนในโรงเรียนนี้</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {accountLinks.map((acc) => {
                  const linkedStudent = students.find((s) => s.id === acc.student_id);
                  const draftStudentId = linkDrafts[acc.id] ?? acc.student_id ?? '';
                  const isBusy = processingAccountId === acc.id;
                  return (
                    <div key={acc.id} className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--color-text-title)]">
                            {acc.full_name_th || acc.full_name_en || 'ไม่ระบุชื่อ'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              acc.status === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : acc.status === 'suspended'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {acc.status === 'active' ? 'อนุมัติแล้ว (ใช้งานได้)' : acc.status === 'suspended' ? 'ระงับสิทธิ์' : 'รออนุมัติเข้าโรงเรียน'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
                          {acc.email && <span className="font-mono">{acc.email}</span>}
                          {acc.phone && <span>· โทร {acc.phone}</span>}
                          <span>·</span>
                          <span className={linkedStudent ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-amber-700 dark:text-amber-300'}>
                            {linkedStudent
                              ? `ผูกกับ ${linkedStudent.firstNameTh} ${linkedStudent.lastNameTh} (${linkedStudent.studentIdNumber})`
                              : 'ยังไม่ผูกกับระเบียนนักเรียน DMC'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={draftStudentId}
                          onChange={(e) => setLinkDrafts((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)] max-w-[230px]"
                        >
                          <option value="">-- ผูกระเบียนนักเรียน (ไม่บังคับ) --</option>
                          {students.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.studentIdNumber} · {st.firstNameTh} {st.lastNameTh} ({st.room})
                            </option>
                          ))}
                        </select>

                        {acc.status !== 'active' ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleApproveStudentAccount(acc)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{isBusy ? 'กำลังอนุมัติ...' : 'อนุมัติเข้าโรงเรียน'}</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isBusy || !draftStudentId}
                              onClick={() => void handleApproveStudentAccount(acc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>บันทึกการผูกระเบียน</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleUpdateStudentStatus(acc, 'suspended')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>ระงับสิทธิ์</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRequestDeleteStudentAccount(acc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                          title="ยกเลิกและลบคำขอสมัครนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ยกเลิก/ลบคำขอ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>บัญชีผู้ปกครองที่ได้รับคำเชิญ / เชื่อมกับนักเรียนแล้ว ({parentAccounts.length})</span>
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  สามารถกดปุ่ม <strong className="text-[var(--color-text-title)]">ส่งคำเชิญผู้ปกครอง</strong> ในแท็บทะเบียนรายชื่อ เพื่อเชิญผู้ปกครองและผูกสิทธิ์กับนักเรียนทันที
                </p>
              </div>
            </div>

            {parentAccounts.length === 0 ? (
              <p className="py-5 text-center text-xs text-[var(--color-text-muted)]">
                ยังไม่มีบัญชีผู้ปกครองที่เชื่อมในโรงเรียนนี้
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {parentAccounts.map((parent) => {
                  const linkedNames = (parent.linked_student_ids || [])
                    .map((sid) => students.find((st) => st.id === sid))
                    .filter((st): st is Student => Boolean(st))
                    .map((st) => `${st.firstNameTh} ${st.lastNameTh} (${st.studentIdNumber})`);
                  return (
                    <div key={parent.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[var(--color-text-title)]">
                            {parent.full_name_th || parent.full_name_en || 'ผู้ปกครอง'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              parent.status === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {parent.status === 'active' ? 'ใช้งานได้' : parent.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
                          {parent.email && <span className="font-mono">{parent.email}</span>}
                          <span>·</span>
                          <span>
                            {linkedNames.length > 0
                              ? `บุตรหลานในปกครอง: ${linkedNames.join(', ')}`
                              : 'เชื่อมบัญชีแล้ว'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">เพิ่มนักเรียนทั้งห้อง (Batch Room Enrollment)</h3>
                <p className="text-xs text-emerald-100 mt-0.5">เลือกห้องเรียน 1 ครั้ง แล้วกรอกตารางหรือวางรายชื่อจาก Excel ได้ทันที</p>
              </div>
              <button type="button" onClick={() => setShowBulkAddModal(false)} className="p-1.5 rounded-xl hover:bg-white/20 text-lg font-bold cursor-pointer">×</button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">
                  ระดับชั้น
                  <input
                    list="bulk-grade-levels"
                    value={bulkGradeLevel}
                    onChange={(event) => setBulkGradeLevel(event.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    placeholder="เช่น มัธยมศึกษาปีที่ 4 (M.4)"
                  />
                  <datalist id="bulk-grade-levels">
                    {Array.from(new Set([...ALL_GRADE_LEVELS.map((g) => g.value), ...presets.gradeLevels])).map((lvl) => (
                      <option key={lvl} value={lvl} />
                    ))}
                  </datalist>
                </label>
                <label className="text-xs font-semibold text-[var(--color-text-body)]">
                  ห้องเรียน (กำหนดให้นักเรียนทุกคนในชุดนี้)
                  <input
                    list="bulk-room-options"
                    value={bulkRoom}
                    onChange={(event) => setBulkRoom(event.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold"
                    placeholder="เช่น ม.4/1"
                  />
                  <datalist id="bulk-room-options">
                    {roomOptions.map((rm) => (
                      <option key={rm} value={rm} />
                    ))}
                  </datalist>
                </label>
              </div>

              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkMode('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    bulkMode === 'table' ? 'bg-emerald-600 text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                  }`}
                >
                  ตารางกรอกรายห้อง (สร้างรหัสอัตโนมัติ)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('paste')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    bulkMode === 'paste' ? 'bg-emerald-600 text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                  }`}
                >
                  วางข้อความจาก Excel / CSV
                </button>
              </div>

              {bulkMode === 'table' ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--color-text-muted)]">
                      กรอกเฉพาะแถวที่ต้องการ (แถวว่างจะถูกข้ามอัตโนมัติ · ตรวจรหัส/ชื่อซ้ำให้ทันที)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBulkTableRows((prev) => [...prev, ...buildDefaultBulkRows(5).map((r, i) => ({
                          ...r,
                          studentIdNumber: `${(Number(prev[prev.length - 1]?.studentIdNumber?.replace(/\D+/g, '') || '69000') + i + 1)}`,
                        }))])}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold hover:bg-[var(--color-primary-light)] cursor-pointer"
                      >
                        + เพิ่ม 5 แถว
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkTableRows((prev) => [...prev, {
                          studentIdNumber: `${(Number(prev[prev.length - 1]?.studentIdNumber?.replace(/\D+/g, '') || '69000') + 1)}`,
                          firstNameTh: '',
                          lastNameTh: '',
                          gender: 'male',
                        }])}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                      >
                        + เพิ่ม 1 แถว
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2 w-32">รหัสนักเรียน</th>
                          <th className="p-2">ชื่อ (ไทย) *</th>
                          <th className="p-2">นามสกุล (ไทย) *</th>
                          <th className="p-2 w-24">เพศ</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {bulkTableRows.map((row, idx) => {
                          const dupId = Boolean(row.studentIdNumber.trim()) && (
                            students.some((s) => s.studentIdNumber.toLowerCase() === row.studentIdNumber.trim().toLowerCase()) ||
                            bulkTableRows.filter((r, i) => i !== idx && r.studentIdNumber.trim().toLowerCase() === row.studentIdNumber.trim().toLowerCase()).length > 0
                          );
                          const dupName = Boolean(row.firstNameTh.trim() && row.lastNameTh.trim()) && (
                            students.some((s) => s.firstNameTh === row.firstNameTh.trim() && s.lastNameTh === row.lastNameTh.trim())
                          );
                          return (
                            <tr key={idx} className={dupId || dupName ? 'bg-amber-50/70 dark:bg-amber-950/30' : ''}>
                              <td className="p-1.5 text-center text-[var(--color-text-muted)] font-mono">{idx + 1}</td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.studentIdNumber}
                                  onChange={(e) => setBulkTableRows((prev) => prev.map((r, i) => i === idx ? { ...r, studentIdNumber: e.target.value } : r))}
                                  placeholder="รหัสนักเรียน"
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono ${dupId ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200' : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'}`}
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.firstNameTh}
                                  onChange={(e) => setBulkTableRows((prev) => prev.map((r, i) => i === idx ? { ...r, firstNameTh: e.target.value } : r))}
                                  placeholder="ชื่อ"
                                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.lastNameTh}
                                  onChange={(e) => setBulkTableRows((prev) => prev.map((r, i) => i === idx ? { ...r, lastNameTh: e.target.value } : r))}
                                  placeholder="นามสกุล"
                                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                                />
                              </td>
                              <td className="p-1.5">
                                <select
                                  value={row.gender}
                                  onChange={(e) => setBulkTableRows((prev) => prev.map((r, i) => i === idx ? { ...r, gender: e.target.value as 'male' | 'female' | 'other' } : r))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                                >
                                  <option value="male">ชาย</option>
                                  <option value="female">หญิง</option>
                                  <option value="other">อื่นๆ</option>
                                </select>
                              </td>
                              <td className="p-1.5 text-center">
                                {bulkTableRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setBulkTableRows((prev) => prev.filter((_, i) => i !== idx))}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                    title="ลบแถว"
                                  >
                                    ×
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-[var(--color-text-body)]">
                    รายชื่อนักเรียน — หนึ่งคนต่อหนึ่งบรรทัด (รองรับทั้ง 3 คอลัมน์: รหัส,ชื่อ,นามสกุล หรือ 2 คอลัมน์: ชื่อ,นามสกุล)
                    <textarea
                      rows={8}
                      value={bulkStudentRows}
                      onChange={(event) => setBulkStudentRows(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono"
                      placeholder={'65001,สมชาย,ใจดี\n65002,สมหญิง,เรียนดี\nหรือ\nสมชาย,ใจดี'}
                    />
                  </label>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    รองรับการคั่นด้วย comma (,) หรือ tab (คัดลอกวางตรงจาก Excel ได้เลย) และตรวจรหัส/ชื่อซ้ำให้อัตโนมัติ
                  </p>
                </>
              )}
              {bulkAddError && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{bulkAddError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button type="button" onClick={() => setShowBulkAddModal(false)} className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold cursor-pointer">ยกเลิก</button>
                <button type="button" onClick={handleSaveBulkStudents} className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer">
                  บันทึกนักเรียนทั้งห้อง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRoomPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">ตั้งค่าระดับชั้นและห้องเรียนของโรงเรียน</h3>
              <button type="button" onClick={() => setShowRoomPresetModal(false)} className="text-lg font-bold text-[var(--color-text-muted)] px-2 cursor-pointer">×</button>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-[var(--color-text-title)]">ระดับชั้น ({presets.gradeLevels.length})</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetGradeInput}
                  onChange={(e) => setNewPresetGradeInput(e.target.value)}
                  placeholder="เพิ่มระดับชั้น เช่น เตรียมอนุบาล หรือ ปวช.1"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newPresetGradeInput.trim();
                    if (!val) return;
                    updatePresets({ gradeLevels: [...presets.gradeLevels, val] });
                    setNewPresetGradeInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white font-bold cursor-pointer"
                >
                  + เพิ่ม
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.gradeLevels.map((lvl) => (
                  <span key={lvl} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    <span>{lvl}</span>
                    {presets.gradeLevels.length > 1 && (
                      <button type="button" onClick={() => updatePresets({ gradeLevels: presets.gradeLevels.filter((x) => x !== lvl) })} className="text-rose-600 font-bold cursor-pointer">×</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
              <div className="font-bold text-[var(--color-text-title)]">ห้องเรียน ({roomOptions.length})</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetRoomInput}
                  onChange={(e) => setNewPresetRoomInput(e.target.value)}
                  placeholder="เพิ่มห้องเรียน เช่น ม.4/3 หรือ EP-1"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newPresetRoomInput.trim();
                    if (!val) return;
                    if (roomOptions.some((room) => room.toLocaleLowerCase() === val.toLocaleLowerCase())) {
                      setRoomPresetError('มีชื่อห้องนี้อยู่แล้ว');
                      return;
                    }
                    void saveRoomOptions([...roomOptions, val]).then((saved) => {
                      if (saved) setNewPresetRoomInput('');
                    });
                  }}
                  disabled={isSavingRoomOptions}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  + เพิ่มห้อง
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roomOptions.map((room) => (
                  <span key={room} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    {editingRoomOption === room ? (
                      <>
                        <input
                          autoFocus
                          value={roomOptionDraft}
                          onChange={(event) => setRoomOptionDraft(event.target.value)}
                          className="w-28 px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                        />
                        <button
                          type="button"
                          disabled={isSavingRoomOptions}
                          onClick={() => {
                            const nextName = roomOptionDraft.trim();
                            if (!nextName) {
                              setRoomPresetError('ชื่อห้องต้องไม่ว่าง');
                              return;
                            }
                            if (roomOptions.some((item) =>
                              item !== room && item.toLocaleLowerCase() === nextName.toLocaleLowerCase()
                            )) {
                              setRoomPresetError('มีชื่อห้องนี้อยู่แล้ว');
                              return;
                            }
                            const assignedStudents = students.filter((student) => student.room === room);
                            if (
                              assignedStudents.length > 0 &&
                              !confirm(`เปลี่ยนชื่อห้องและแก้ข้อมูลนักเรียน ${assignedStudents.length} คนจาก "${room}" เป็น "${nextName}" หรือไม่?`)
                            ) return;
                            void saveRoomOptions(roomOptions.map((item) => item === room ? nextName : item)).then((saved) => {
                              if (!saved) return;
                              if (assignedStudents.length > 0) {
                                onBatchUpdateStudents?.(assignedStudents.map((student) => ({ ...student, room: nextName })));
                              }
                              setEditingRoomOption(null);
                              setRoomOptionDraft('');
                            });
                          }}
                          className="text-emerald-700 font-bold cursor-pointer disabled:opacity-50"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRoomOption(null)}
                          className="text-[var(--color-text-muted)] font-bold cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{room}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoomOption(room);
                            setRoomOptionDraft(room);
                            setRoomPresetError(null);
                          }}
                          className="text-blue-700 font-bold cursor-pointer"
                          aria-label={`แก้ไขห้อง ${room}`}
                        >
                          แก้ไข
                        </button>
                        {roomOptions.length > 1 && (
                          <button
                            type="button"
                            disabled={isSavingRoomOptions}
                            onClick={() => {
                              const assigned = students.filter((student) => student.room === room).length;
                              const note = assigned > 0
                                ? ` มีนักเรียน ${assigned} คนที่ยังใช้ชื่อนี้ในทะเบียน (จะไม่ลบข้อมูลนักเรียน)`
                                : '';
                              if (!confirm(`ลบ "${room}" ออกจากรายการห้องที่เลือกได้หรือไม่?${note}`)) return;
                              void saveRoomOptions(roomOptions.filter((item) => item !== room));
                            }}
                            className="text-rose-600 font-bold cursor-pointer disabled:opacity-50"
                            aria-label={`ลบห้อง ${room}`}
                          >
                            ลบ
                          </button>
                        )}
                      </>
                    )}
                  </span>
                ))}
              </div>
              {roomPresetError && <p role="alert" className="text-xs font-semibold text-rose-700">{roomPresetError}</p>}
              {isSavingRoomOptions && <p role="status" className="text-xs text-[var(--color-text-muted)]">กำลังบันทึกรายการห้องเรียน...</p>}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-[var(--color-primary)] text-white flex items-center justify-between shrink-0">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[var(--color-primary-light)] rounded-2xl border border-[var(--color-border)]">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[var(--color-text-title)] font-bold">
                          ระดับชั้น (Grade) *
                        </label>
                        <span className="text-[10px] text-[var(--color-primary-text)] font-semibold">แก้ไขได้อิสระ</span>
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
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px] font-bold border border-[var(--color-border)]">
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
                        className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
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
                      className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-indigo-400 dark:border-indigo-600 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>+ เพิ่มผู้ปกครองคนที่ {guardiansList.length + 1} (มีผู้ปกครองมากกว่า 1 คน)</span>
                    </button>
                  </div>

                  {/* Academic GPA */}
                  <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[var(--color-text-title)] font-bold text-xs">
                        เกรดเฉลี่ยสะสม (GPA / GPAX)
                      </label>
                      <span className="text-[11px] text-[var(--color-primary-text)] font-semibold">
                        ค่าระหว่าง 0.00 - 4.00
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="4"
                        step="0.01"
                        value={formData.gpa}
                        onChange={(e) => {
                          const val = Math.min(4.00, Math.max(0, Number(e.target.value)));
                          setFormData({ ...formData, gpa: Number(val.toFixed(2)) });
                        }}
                        placeholder="เช่น 3.50"
                        className="w-40 px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-bold text-sm"
                      />
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed flex-1">
                        ผลการเรียนเฉลี่ยรวมทุกวิชา สามารถพิมพ์แก้ไขได้ทันที หรือระบบจะคำนวณอัตโนมัติจากคะแนนในสมุด ปพ.5
                      </p>
                    </div>
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

      {/* Invite Student or Parent Modal */}
      {inviteDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[var(--color-primary)] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {inviteDialog.role === 'parent' ? <Send className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                <h3 className="text-sm font-bold">
                  {inviteDialog.role === 'parent'
                    ? 'เชิญผู้ปกครองเข้าใช้งานแอปและผูกกับนักเรียน'
                    : 'เชิญนักเรียนตั้งค่าบัญชีเข้าสู่ระบบ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteDialog(null)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmitInviteDialog(e)} className="p-5 space-y-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 text-xs space-y-1">
                <p className="font-bold text-[var(--color-text-title)]">
                  นักเรียน: {inviteDialog.student.firstNameTh} {inviteDialog.student.lastNameTh}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  รหัสนักเรียน: {inviteDialog.student.studentIdNumber} · {inviteDialog.student.gradeLevel} ({inviteDialog.student.room})
                </p>
              </div>

              {inviteModalError && (
                <div role="alert" className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
                  {inviteModalError}
                </div>
              )}

              {inviteDialog.role === 'parent' && (
                <label className="block text-xs font-bold text-[var(--color-text-title)] space-y-1">
                  <span>ชื่อ-สกุลผู้ปกครอง</span>
                  <input
                    type="text"
                    required
                    value={inviteFullNameInput}
                    onChange={(e) => setInviteFullNameInput(e.target.value)}
                    placeholder="เช่น คุณสมหญิง ใจดี"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                  />
                </label>
              )}

              <label className="block text-xs font-bold text-[var(--color-text-title)] space-y-1">
                <span>
                  {inviteDialog.role === 'parent'
                    ? 'อีเมลของผู้ปกครองสำหรับรับลิงก์ตั้งรหัสผ่าน'
                    : 'อีเมลของนักเรียนสำหรับรับลิงก์ตั้งรหัสผ่าน'}
                </span>
                <input
                  type="email"
                  required
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  placeholder={inviteDialog.role === 'parent' ? 'parent@example.com' : 'student@school.ac.th'}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                />
              </label>

              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                {inviteDialog.role === 'parent'
                  ? 'เมื่อผู้ปกครองกดลิงก์ในอีเมลและตั้งรหัสผ่านแล้ว ระบบจะเชื่อมบัญชีผู้ปกครองกับข้อมูลนักเรียนคนนี้โดยอัตโนมัติ'
                  : 'เมื่อนักเรียนกดลิงก์ในอีเมลและตั้งรหัสผ่านแล้ว บัญชีจะเชื่อมกับรหัสนักเรียนและเปิดใช้งานทันที'}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setInviteDialog(null)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={invitingStudentId === inviteDialog.student.id}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{invitingStudentId === inviteDialog.student.id ? 'กำลังส่งคำเชิญ...' : 'ส่งคำเชิญ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || ''}
        description={pendingConfirm?.description || ''}
        detailNote={pendingConfirm?.detailNote}
        confirmLabel={pendingConfirm?.confirmLabel || 'ยืนยัน'}
        isBusy={isConfirmingAction}
        onCancel={() => {
          if (!isConfirmingAction) setPendingConfirm(null);
        }}
        onConfirm={async () => {
          if (!pendingConfirm) return;
          setIsConfirmingAction(true);
          try {
            await pendingConfirm.action();
          } finally {
            setIsConfirmingAction(false);
            setPendingConfirm(null);
          }
        }}
      />
    </div>
  );
};
