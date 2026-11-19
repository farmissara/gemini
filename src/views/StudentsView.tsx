import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Student, StudentStatus, GuardianInfo, School, UserRole, Course, GradeRecord, GradingSystem } from '../types';
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
  ArrowUpDown,
  Check,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Send,
  X,
  QrCode,
  FileDown,
  Copy,
  Link2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { STAFF_INVITE_RPC_SQL } from '../lib/supabase';
import {
  approveStudentAccountInSupabase,
  deleteStudentAccountRegistrationInSupabase,
  InviteBackendSetupError,
  inviteStudentAccount,
  inviteTeacherOrParentAccount,
  linkStudentAccountToStudent,
  listSchoolStaffParentAccounts,
  listStudentAccountLinks,
  StaffParentAccountLink,
  StudentAccountLink,
  TeacherParentInviteResult,
  updateStudentAccountStatusInSupabase,
} from '../lib/authDb';
import { getModuleGroupMeta, getModuleTone } from '../lib/moduleTheme';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';
import { PagedList } from '../components/PagedList';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { 
  ALL_GRADE_LEVELS, 
  STUDENT_STATUS_DETAILS 
} from '../data/studentAcademicData';
import { StudentPromotionModal } from '../components/modals/StudentPromotionModal';
import { BatchQrPrintModal } from '../components/modals/BatchQrPrintModal';
import { getStudentDuplicateReasons } from '../lib/duplicateRecords';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { calculateStudentAcademicSummary, getRawScoreFeedback, isPrimaryGradeLevel } from '../lib/moeGrading';
import { downloadBatchStudentQrCodesPdf } from '../lib/moeReportPdf';
import { TableActionMenu, TableActionItem } from '../components/common/TableActionMenu';
import { PaginatedTableRows } from '../components/common/PaginatedTableRows';

interface StudentsViewProps {
  students: Student[];
  courses?: Course[];
  grades?: GradeRecord[];
  gradingSystem?: GradingSystem;
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
  onOpenStudentAccountsSettings?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  courses = [],
  grades = [],
  gradingSystem = 'thai',
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
  onOpenStudentAccountsSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'id_asc' | 'id_desc' | 'last_name_asc' | 'grade_level'>('default');
  const [showQuickSortMenu, setShowQuickSortMenu] = useState(false);
  const quickSortMenuRef = useRef<HTMLDivElement | null>(null);
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
  const [selectedQrStudentIds, setSelectedQrStudentIds] = useState<string[]>([]);
  const [showBatchQrModal, setShowBatchQrModal] = useState(false);
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
  const [inviteLinkResult, setInviteLinkResult] = useState<TeacherParentInviteResult | null>(null);
  const [inviteBackendMissing, setInviteBackendMissing] = useState<{ message: string; detail?: string } | null>(null);
  const [copiedInviteField, setCopiedInviteField] = useState<'link' | 'message' | 'sql' | null>(null);
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

  useEffect(() => {
    if (!showQuickSortMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (quickSortMenuRef.current && !quickSortMenuRef.current.contains(event.target as Node)) {
        setShowQuickSortMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowQuickSortMenu(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showQuickSortMenu]);

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

  const handleCopyInviteField = async (value: string, field: 'link' | 'message' | 'sql') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedInviteField(field);
      window.setTimeout(() => {
        setCopiedInviteField((prev) => (prev === field ? null : prev));
      }, 2200);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const handleOpenInviteModal = (student: Student, role: 'student' | 'parent') => {
    setInviteDialog({ role, student });
    setInviteModalError(null);
    setInviteLinkResult(null);
    setInviteBackendMissing(null);
    setCopiedInviteField(null);
    if (role === 'parent') {
      setInviteEmailInput(student.guardianEmail?.trim() || '');
      setInviteFullNameInput(student.guardianName?.trim() || '');
    } else {
      setInviteEmailInput('');
      setInviteFullNameInput(`${student.firstNameTh} ${student.lastNameTh}`.trim());
    }
  };

  const submitInviteDialogAction = async () => {
    if (!inviteDialog) return;
    const email = inviteEmailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteModalError('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    const { role, student } = inviteDialog;
    setInvitingStudentId(student.id);
    setInviteModalError(null);
    setInviteLinkResult(null);
    setInviteBackendMissing(null);
    setAccountsError(null);
    setAccountsSuccess(null);
    try {
      if (role === 'student') {
        await inviteStudentAccount({ schoolId, studentId: student.id, email });
        setAccountsSuccess(`ส่งคำเชิญตั้งค่าบัญชีนักเรียน (${student.firstNameTh} ${student.lastNameTh}) ไปที่ ${email} แล้ว`);
        setInviteDialog(null);
      } else {
        const result = await inviteTeacherOrParentAccount({
          schoolId,
          inviteRole: 'parent',
          studentId: student.id,
          email,
          fullNameTh: inviteFullNameInput.trim() || student.guardianName || `ผู้ปกครองของ ${student.firstNameTh}`,
          fullNameEn: inviteFullNameInput.trim() || student.guardianName || '',
        });
        if (result.deliveryMethod === 'email_edge_function') {
          setAccountsSuccess(`ส่งคำเชิญผู้ปกครองของ ${student.firstNameTh} ${student.lastNameTh} ไปที่ ${email} แล้ว`);
          setInviteDialog(null);
        } else {
          setInviteLinkResult(result);
          setAccountsSuccess(`สร้างลิงก์คำเชิญผู้ปกครองของ ${student.firstNameTh} ${student.lastNameTh} เรียบร้อยแล้ว`);
        }
        await refreshAccountLinks();
      }
    } catch (error) {
      if (
        error instanceof InviteBackendSetupError ||
        (error as { code?: string })?.code === 'INVITE_BACKEND_MISSING'
      ) {
        setInviteBackendMissing({
          message: error instanceof Error ? error.message : 'ยังไม่ได้ติดตั้งฟังก์ชันคำเชิญใน Supabase',
          detail: error instanceof InviteBackendSetupError ? error.technicalDetail : undefined,
        });
      } else {
        const msg = error instanceof Error ? error.message : 'ส่งคำเชิญบัญชีไม่สำเร็จ';
        setInviteModalError(msg);
      }
    } finally {
      setInvitingStudentId(null);
    }
  };

  const handleSubmitInviteDialog = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitInviteDialogAction();
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
    gpa: 0,
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

  const getGradeLevelRank = useCallback((gradeLevel: string): number => {
    const normalized = (gradeLevel || '').trim();
    const knownIdx = ALL_GRADE_LEVELS.findIndex(
      (opt) => opt.value === normalized || normalized.includes(opt.value)
    );
    if (knownIdx >= 0) return knownIdx;
    if (/อนุบาล\s*1|อ\.?\s*1|K\.?\s*1/i.test(normalized)) return 0;
    if (/อนุบาล\s*2|อ\.?\s*2|K\.?\s*2/i.test(normalized)) return 1;
    if (/อนุบาล\s*3|อ\.?\s*3|K\.?\s*3/i.test(normalized)) return 2;
    if (/ประถมศึกษาปีที่\s*1|ป\.?\s*1|P\.?\s*1|Grade\s*1\b/i.test(normalized)) return 3;
    if (/ประถมศึกษาปีที่\s*2|ป\.?\s*2|P\.?\s*2|Grade\s*2\b/i.test(normalized)) return 4;
    if (/ประถมศึกษาปีที่\s*3|ป\.?\s*3|P\.?\s*3|Grade\s*3\b/i.test(normalized)) return 5;
    if (/ประถมศึกษาปีที่\s*4|ป\.?\s*4|P\.?\s*4|Grade\s*4\b/i.test(normalized)) return 6;
    if (/ประถมศึกษาปีที่\s*5|ป\.?\s*5|P\.?\s*5|Grade\s*5\b/i.test(normalized)) return 7;
    if (/ประถมศึกษาปีที่\s*6|ป\.?\s*6|P\.?\s*6|Grade\s*6\b/i.test(normalized)) return 8;
    if (/มัธยมศึกษาปีที่\s*1|ม\.?\s*1|M\.?\s*1|Grade\s*7\b/i.test(normalized)) return 9;
    if (/มัธยมศึกษาปีที่\s*2|ม\.?\s*2|M\.?\s*2|Grade\s*8\b/i.test(normalized)) return 10;
    if (/มัธยมศึกษาปีที่\s*3|ม\.?\s*3|M\.?\s*3|Grade\s*9\b/i.test(normalized)) return 11;
    if (/มัธยมศึกษาปีที่\s*4|ม\.?\s*4|M\.?\s*4|Grade\s*10\b/i.test(normalized)) return 12;
    if (/มัธยมศึกษาปีที่\s*5|ม\.?\s*5|M\.?\s*5|Grade\s*11\b/i.test(normalized)) return 13;
    if (/มัธยมศึกษาปีที่\s*6|ม\.?\s*6|M\.?\s*6|Grade\s*12\b/i.test(normalized)) return 14;
    if (/ปวช\.?\s*1|Vocational\s*1/i.test(normalized)) return 15;
    if (/ปวช\.?\s*2|Vocational\s*2/i.test(normalized)) return 16;
    if (/ปวช\.?\s*3|Vocational\s*3/i.test(normalized)) return 17;
    return 999;
  }, []);

  const quickSortOptions: ReadonlyArray<{
    key: 'default' | 'id_asc' | 'id_desc' | 'last_name_asc' | 'grade_level';
    label: string;
    subtitle: string;
  }> = [
    { key: 'default', label: 'Default', subtitle: 'ลำดับตามค่าเริ่มต้นในระบบ' },
    { key: 'id_asc', label: 'ID ASC', subtitle: 'รหัสนักเรียน น้อย → มาก' },
    { key: 'id_desc', label: 'ID DESC', subtitle: 'รหัสนักเรียน มาก → น้อย' },
    { key: 'last_name_asc', label: 'Last Name A-Z', subtitle: 'นามสกุล A → Z / ก → ฮ' },
    { key: 'grade_level', label: 'Grade Level', subtitle: 'ระดับชั้น & ห้องเรียน' },
  ];

  const activeQuickSortLabel =
    quickSortOptions.find((opt) => opt.key === sortBy)?.label || 'Default';

  const filteredStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      // 1. Search filter
      const matchesSearch =
        (s.firstNameEn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.lastNameEn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.firstNameTh || '').includes(searchTerm) ||
        (s.lastNameTh || '').includes(searchTerm) ||
        (s.studentIdNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.room || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    if (sortBy === 'default') return filtered;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'id_asc') {
        return (a.studentIdNumber || '').localeCompare(b.studentIdNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      if (sortBy === 'id_desc') {
        return (b.studentIdNumber || '').localeCompare(a.studentIdNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      if (sortBy === 'last_name_asc') {
        const aLast = (a.lastNameEn || a.lastNameTh || '').trim();
        const bLast = (b.lastNameEn || b.lastNameTh || '').trim();
        const lastCmp = aLast.localeCompare(bLast, undefined, { sensitivity: 'base' });
        if (lastCmp !== 0) return lastCmp;
        const aFirst = (a.firstNameEn || a.firstNameTh || '').trim();
        const bFirst = (b.firstNameEn || b.firstNameTh || '').trim();
        return aFirst.localeCompare(bFirst, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'grade_level') {
        const rankDiff = getGradeLevelRank(a.gradeLevel) - getGradeLevelRank(b.gradeLevel);
        if (rankDiff !== 0) return rankDiff;
        const gradeTextCmp = (a.gradeLevel || '').localeCompare(b.gradeLevel || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (gradeTextCmp !== 0) return gradeTextCmp;
        const roomCmp = (a.room || '').localeCompare(b.room || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (roomCmp !== 0) return roomCmp;
        return (a.studentIdNumber || '').localeCompare(b.studentIdNumber || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return 0;
    });
  }, [students, searchTerm, gradeFilter, statusFilter, sortBy, getGradeLevelRank]);

  const selectedQrStudentSet = useMemo(() => new Set(selectedQrStudentIds), [selectedQrStudentIds]);
  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedQrStudentSet.has(s.id));

  const toggleSelectStudentForQr = (studentId: string) => {
    setSelectedQrStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleSelectAllFilteredForQr = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    setSelectedQrStudentIds((prev) => {
      if (allFilteredSelected) {
        const filteredSet = new Set(filteredIds);
        return prev.filter((id) => !filteredSet.has(id));
      }
      return Array.from(new Set([...prev, ...filteredIds]));
    });
  };

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
      gpa: 0,
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
    const editSummary = calculateStudentAcademicSummary({
      student,
      courses,
      grades,
      gradingSystem,
      currentAcademicYear: activeSchool?.academicYear,
      currentSemester: activeSchool?.currentSemester,
    });
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
      gpa: editSummary.hasRecordedGrades && editSummary.gpax !== null ? editSummary.gpax : 0,
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
      const applyEdit = () => {
        onUpdateStudent?.(updated);
        setEditingStudent(null);
        setShowAddModal(false);
      };
      const duplicateReasons = getStudentDuplicateReasons([updated], students, [editingStudent.id]);
      if (duplicateReasons.length > 0) {
        setPendingConfirm({
          title: 'พบข้อมูลนักเรียนซ้ำในทะเบียน',
          description: `${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`,
          confirmLabel: 'ยืนยันบันทึกต่อ',
          action: applyEdit,
        });
        return;
      }
      applyEdit();
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

    const applyAdd = () => {
      onAddStudent(newStudent);
      setShowAddModal(false);
    };
    const duplicateReasons = getStudentDuplicateReasons([newStudent], students);
    if (duplicateReasons.length > 0) {
      setPendingConfirm({
        title: 'พบข้อมูลนักเรียนซ้ำในทะเบียน',
        description: `${duplicateReasons.join(' และ ')} ต้องการเพิ่มนักเรียนต่อหรือไม่?`,
        confirmLabel: 'ยืนยันเพิ่มนักเรียน',
        action: applyAdd,
      });
      return;
    }
    applyAdd();
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
      const idKey = (s.studentIdNumber || '').toLowerCase();
      const nameKey = `${s.firstNameTh || ''}|${s.lastNameTh || ''}`.toLowerCase();
      if (batchIdSet.has(idKey) || batchNameSet.has(nameKey)) hasIntraDuplicate = true;
      batchIdSet.add(idKey);
      batchNameSet.add(nameKey);
    });

    const applyBulkAdd = () => {
      if (onAddStudents) onAddStudents(newStudents);
      else newStudents.forEach(onAddStudent);
      setBulkStudentRows('');
      setBulkAddError(null);
      setShowBulkAddModal(false);
    };
    const duplicateReasons = getStudentDuplicateReasons(newStudents, students);
    if (hasIntraDuplicate) {
      duplicateReasons.unshift('พบข้อมูลนักเรียนซ้ำกันเองภายในรายชื่อชุดนี้');
    }
    if (duplicateReasons.length > 0) {
      setPendingConfirm({
        title: 'พบรายชื่อซ้ำในการเพิ่มแบบกลุ่ม',
        description: `${duplicateReasons.join(' และ ')} ต้องการเพิ่มนักเรียนชุดนี้ต่อหรือไม่?`,
        confirmLabel: 'ยืนยันเพิ่มชุดนี้',
        action: applyBulkAdd,
      });
      return;
    }
    applyBulkAdd();
  };

  const handlePromoteBatch = (updatedStudents: Student[]) => {
    if (onBatchUpdateStudents) {
      onBatchUpdateStudents(updatedStudents);
    } else if (onUpdateStudent) {
      updatedStudents.forEach((s) => onUpdateStudent(s));
    }
  };

  const studentsGroup = getModuleGroupMeta('students');

  return (
    <div className={`${getModuleTone('students')} h-full flex flex-col min-h-0 overflow-hidden space-y-1.5`}>
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
      {/* Compact Single-Row Header */}
      <div className="shrink-0 px-3 py-1.5 app-page-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="tone-chip w-6 h-6 rounded-lg">
            <Users className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-[var(--color-text-title)] leading-tight truncate">
              ทะเบียนนักเรียน (DMC / SIS)
              <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)] font-mono tabular-nums">
                · {filteredStudents.length} คน
              </span>
            </h1>
            <span className="hidden xl:inline module-category-kicker">
              {studentsGroup.labelTh}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <ModuleTourTrigger moduleId="students" lang="th" />
          <div ref={quickSortMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowQuickSortMenu((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={showQuickSortMenu}
              data-active={sortBy !== 'default'}
              className="btn-tool-neutral px-2.5 py-1.5"
            >
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <span>Quick Sort{sortBy !== 'default' ? `: ${activeQuickSortLabel}` : ''}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>
            {showQuickSortMenu && (
              <div
                role="menu"
                aria-label="Quick Sort Students"
                className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg space-y-0.5"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  จัดเรียงข้อมูลนักเรียน (Quick Sort)
                </div>
                {quickSortOptions.map((opt) => {
                  const isActive = sortBy === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => {
                        setSortBy((prev) => (prev === opt.key && opt.key !== 'default' ? 'default' : opt.key));
                        if (activeTab !== 'roster') setActiveTab('roster');
                        setShowQuickSortMenu(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                        isActive
                          ? 'tone-active font-bold'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate">{opt.label}</div>
                        <div className="text-[10px] font-normal text-[var(--color-text-muted)] truncate">
                          {opt.subtitle}
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <details className="relative" data-guide-id="students-import-export">
            <summary className="btn-tool-tone list-none px-2.5 py-1.5">
              <span>เครื่องมือ / นำเข้าชุด</span>
              {selectedQrStudentIds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-[var(--tone-solid)] text-white text-[10px] font-bold tabular-nums">
                  {selectedQrStudentIds.length}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute right-0 top-full z-30 mt-1.5 min-w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg space-y-0.5">
              {['admin', 'super_admin', 'teacher'].includes(currentRole) && (
                <button
                  type="button"
                  data-guide-id="students-add-bulk"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    handleOpenBulkModal();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>เพิ่มนักเรียนทั้งห้อง (Batch)</span>
                </button>
              )}

              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  setShowBatchQrModal(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 tone-text shrink-0" />
                <span>
                  พิมพ์ QR ชุด (PDF)
                  {selectedQrStudentIds.length > 0 ? ` (${selectedQrStudentIds.length})` : ''}
                </span>
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

              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  setShowPromotionModal(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 tone-text shrink-0" />
                <span>เลื่อนชั้นเรียนข้ามปี (Promotion)</span>
              </button>

              {['admin', 'super_admin'].includes(currentRole) && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    setShowRoomPresetModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 tone-text shrink-0" />
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

          <button
            type="button"
            data-guide-id="students-add-single"
            onClick={handleOpenAdd}
            className="btn-action-primary px-3 py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มนักเรียน</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div data-guide-id="students-tabs" className="shrink-0 flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-1">
        <div className="seg-tab-group overflow-x-auto no-scrollbar">
          <button
            type="button"
            data-active={activeTab === 'roster'}
            onClick={() => setActiveTab('roster')}
            className="seg-tab-btn flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>ทะเบียนรายชื่อ ({filteredStudents.length} คน)</span>
          </button>
          {canManageApprovals && (
            <button
              type="button"
              data-guide-id="students-approvals-tab"
              data-active={activeTab === 'approvals'}
              onClick={() => setActiveTab('approvals')}
              className="seg-tab-btn flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>คำขอสมัครเข้าโรงเรียน / อนุมัติบัญชี</span>
              {pendingAccountsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-bold tabular-nums">
                  {pendingAccountsCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            data-active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            className="seg-tab-btn flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            <span>สถิติระดับชั้น &amp; สถานะนักเรียน</span>
          </button>
        </div>
      </div>

      {activeTab === 'roster' && accountsSuccess && (
        <div role="status" className="shrink-0 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center justify-between gap-2">
          <span>{accountsSuccess}</span>
          <button type="button" onClick={() => setAccountsSuccess(null)} className="text-xs font-bold cursor-pointer">✕</button>
        </div>
      )}

      {activeTab === 'roster' && (
        <>
          {/* Compact Filter and Search Bar */}
          <div data-guide-id="students-search-bar" className="shrink-0 toolbar-filter-zone flex flex-wrap items-center justify-between gap-2">
            <div className="fn-group-tone w-full md:w-auto">
              <span className="fn-group-label">ค้นหา</span>
              <div className="relative flex-1 md:w-64 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ชื่อ, รหัสนักเรียน, ปชช. หรือห้อง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--tone)]"
                />
              </div>
            </div>

            <div className="fn-divider" />

            <div className="fn-group flex-1 justify-between md:justify-start">
              <span className="fn-group-label text-[var(--color-text-muted)]">คัดกรอง</span>
              <select
                aria-label="กรองตามระดับชั้น"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold focus:outline-none focus:border-[var(--tone)]"
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

              <select
                aria-label="กรองตามสถานะนักเรียน"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold focus:outline-none focus:border-[var(--tone)]"
              >
                <option value="all">ทุกสถานะนักเรียน</option>
                {Object.values(STUDENT_STATUS_DETAILS).map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.labelTh} ({st.labelEn})
                  </option>
                ))}
              </select>

              {(searchTerm.trim() !== '' || gradeFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setGradeFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  ล้าง
                </button>
              )}

              <span className="text-xs text-[var(--color-text-muted)] ml-auto font-mono tabular-nums pl-1">
                พบ <strong className="tone-text">{filteredStudents.length}</strong> คน
              </span>
            </div>
          </div>

          {selectedQrStudentIds.length > 0 && (
            <div className="shrink-0 px-3.5 py-2.5 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-title)]">
                <QrCode className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>เลือกนักเรียนแล้ว {selectedQrStudentIds.length} คน สำหรับพิมพ์/ส่งออก QR Code</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = students.filter((s) => selectedQrStudentSet.has(s.id));
                    if (chosen.length > 0) {
                      downloadBatchStudentQrCodesPdf({
                        students: chosen,
                        school: activeSchool,
                        lang: 'th',
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PDF QR รวม ({selectedQrStudentIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchQrModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>จัดหน้า &amp; พิมพ์ชุด QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQrStudentIds([])}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] text-xs font-semibold transition cursor-pointer"
                >
                  ล้างที่เลือก
                </button>
              </div>
            </div>
          )}

          {/* Students Table with Sticky Header */}
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)]">
            <table className="table-comfortable w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[var(--color-card-subtle)] text-[var(--color-text-title)] uppercase tracking-wider font-semibold border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFilteredForQr}
                      aria-label="เลือกนักเรียนทั้งหมดที่กรอง"
                      title="เลือกทั้งหมด / ยกเลิกทั้งหมด"
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer accent-[var(--color-primary)]"
                    />
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Thai Name</th>
                  <th className="py-3 px-4">Class &amp; Room</th>
                  <th className="py-3 px-4">สถานะ (Status)</th>
                  <th className="py-3 px-4">GPA</th>
                  <th className="py-3.5 px-4">Guardian / LINE OA</th>
                  <th className="py-3.5 px-4 text-right w-16">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <PaginatedTableRows items={filteredStudents} colSpan={8} renderRow={(student) => {
                  const statusCfg = STUDENT_STATUS_DETAILS[student.status || 'active'] || STUDENT_STATUS_DETAILS.active;
                  const summary = calculateStudentAcademicSummary({
                    student,
                    courses,
                    grades,
                    gradingSystem,
                    currentAcademicYear: activeSchool?.academicYear,
                    currentSemester: activeSchool?.currentSemester,
                  });
                  const hasRealGrades = summary.hasRecordedGrades && summary.gpax !== null;
                  const displayGpa = hasRealGrades ? summary.gpax! : 0;
                  const isQrSelected = selectedQrStudentSet.has(student.id);
                  return (
                    <tr key={student.id} className={`hover:bg-[var(--color-card-subtle)] transition-colors group ${isQrSelected ? 'bg-[var(--color-primary-light)]/40' : ''}`}>
                      <td className="py-2.5 pl-4 pr-2 align-middle">
                        <input
                          type="checkbox"
                          checked={isQrSelected}
                          onChange={() => toggleSelectStudentForQr(student.id)}
                          aria-label={`เลือก ${student.firstNameTh} ${student.lastNameTh} สำหรับพิมพ์ QR`}
                          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.firstNameEn}
                            className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-[var(--color-text-title)] group-hover:text-[var(--color-primary-text)] transition-colors">
                              {student.firstNameEn} {student.lastNameEn}
                            </div>
                            <div className="text-[11px] font-mono text-[var(--color-primary-text)] tabular-nums">
                              {student.studentIdNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="text-[var(--color-text-title)] font-medium">
                          {student.firstNameTh} {student.lastNameTh}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                          ID: {student.nationalId || 'N/A'}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="text-[var(--color-text-title)] font-semibold">{student.gradeLevel}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] font-medium">{student.room}</div>
                      </td>

                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${statusCfg.badgeClasses}`}
                          title={statusCfg.descriptionTh}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.labelTh}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {summary.hideGpaCalculations ? (
                          summary.averageRawScore !== null ? (
                            <div className="space-y-0.5">
                              <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 tabular-nums">
                                {summary.averageRawScore}%
                              </span>
                              <div className="text-[10px] text-[var(--color-text-muted)] font-semibold">
                                {getRawScoreFeedback(summary.averageRawScore).labelTh} ({summary.gradedSubjectCount} วิชา)
                              </div>
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                              ยังไม่มีผล ปพ.5
                            </span>
                          )
                        ) : hasRealGrades ? (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border tabular-nums ${
                                displayGpa >= 3.5
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : displayGpa >= 3.0
                                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                              }`}
                              title={`คำนวณจริงจากสมุดคะแนน/ปพ.5 (${summary.gradedSubjectCount} วิชา · ${summary.registeredCredits.toFixed(1)} หน่วยกิต)`}
                            >
                              {displayGpa.toFixed(2)}
                            </span>
                            <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                              ปพ.5 · {summary.gradedSubjectCount} วิชา ({summary.registeredCredits} นก.)
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5" title="ยังไม่มีคะแนนรายวิชาในระบบวัดผล (ปพ.5) — ระบบจึงไม่แสดงค่า GPA สมมติ">
                            <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] border-[var(--color-border)] tabular-nums">
                              —
                            </span>
                            <div className="text-[10px] text-[var(--color-text-muted)]">
                              ยังไม่ตัดเกรด (ปพ.5)
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="text-[var(--color-text-body)] font-medium">{student.guardianName} ({student.guardianRelation})</div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => onToggleLineSync(student.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors border cursor-pointer ${
                              student.lineLinked
                                ? 'bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
                                : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
                            }`}
                            title={student.lineLinked ? 'LINE Connected (Click to toggle)' : 'Not Connected to LINE (Click to link)'}
                          >
                            <MessageSquare className="w-2.5 h-2.5 fill-current" />
                            {student.lineLinked ? 'LINE Linked' : 'Connect LINE'}
                          </button>
                          <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-0.5 tabular-nums">
                            <Phone className="w-2.5 h-2.5" /> {student.guardianPhone}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {(() => {
                          const actionItems: TableActionItem[] = [
                            {
                              id: 'profile',
                              label: 'ดูโปรไฟล์ / ประวัตินักเรียน',
                              icon: <UserCheck className="w-3.5 h-3.5" />,
                              variant: 'primary',
                              onClick: () => onSelectStudent(student),
                            },
                            {
                              id: 'report_card',
                              label: 'ดูใบรายงานผล (ปพ.1 / ปพ.6)',
                              icon: <Award className="w-3.5 h-3.5" />,
                              onClick: () => onOpenReportCard(student),
                            },
                            {
                              id: 'edit',
                              label: 'แก้ไขข้อมูล / ห้อง / สถานะ',
                              icon: <Edit3 className="w-3.5 h-3.5" />,
                              onClick: () => handleOpenEdit(student),
                            },
                            ...(canManageApprovals
                              ? [
                                  {
                                    id: 'invite_student',
                                    label: 'ส่งคำเชิญให้นักเรียนตั้งค่าบัญชี',
                                    icon: <Mail className="w-3.5 h-3.5" />,
                                    disabled: invitingStudentId === student.id,
                                    onClick: () => handleOpenInviteModal(student, 'student'),
                                  },
                                  {
                                    id: 'invite_parent',
                                    label: 'เชิญผู้ปกครองเข้าใช้งาน',
                                    icon: <Send className="w-3.5 h-3.5" />,
                                    variant: 'success' as const,
                                    disabled: invitingStudentId === student.id,
                                    onClick: () => handleOpenInviteModal(student, 'parent'),
                                  },
                                ]
                              : []),
                            ...(onDeleteStudent
                              ? [
                                  {
                                    id: 'delete',
                                    label: 'ยกเลิก / ลบข้อมูลนักเรียน',
                                    icon: <Trash2 className="w-3.5 h-3.5" />,
                                    variant: 'danger' as const,
                                    dividerBefore: true,
                                    onClick: () => handleRequestDeleteStudent(student),
                                  },
                                ]
                              : []),
                          ];
                          return (
                            <TableActionMenu
                              items={actionItems}
                              ariaLabel={`จัดการข้อมูล ${student.firstNameTh} ${student.lastNameTh}`}
                            />
                          );
                        })()}
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
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {onOpenStudentAccountsSettings && (
                  <button
                    type="button"
                    onClick={onOpenStudentAccountsSettings}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary-light)] hover:opacity-90 text-xs font-bold text-[var(--color-primary-text)] cursor-pointer shrink-0"
                  >
                    <span>จัดการในศูนย์ตั้งค่า →</span>
                  </button>
                )}
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
              <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
                <table className="table-comfortable w-full text-left text-xs">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">ผู้สมัคร / อีเมล</th>
                      <th className="py-2.5 px-3 text-center">สถานะบัญชี</th>
                      <th className="py-2.5 px-3">ผูกระเบียนนักเรียน DMC</th>
                      <th className="py-2.5 px-3 text-right w-16">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {accountLinks.map((acc) => {
                      const linkedStudent = students.find((s) => s.id === acc.student_id);
                      const draftStudentId = linkDrafts[acc.id] ?? acc.student_id ?? '';
                      const isBusy = processingAccountId === acc.id;
                      const actionItems: TableActionItem[] = [
                        ...(acc.status !== 'active'
                          ? [
                              {
                                id: 'approve',
                                label: isBusy ? 'กำลังอนุมัติ...' : 'อนุมัติเข้าโรงเรียน',
                                icon: <CheckCircle className="w-3.5 h-3.5" />,
                                variant: 'success' as const,
                                disabled: isBusy,
                                onClick: () => void handleApproveStudentAccount(acc),
                              },
                            ]
                          : [
                              {
                                id: 'save_link',
                                label: 'บันทึกการผูกระเบียน DMC',
                                icon: <UserCheck className="w-3.5 h-3.5" />,
                                variant: 'primary' as const,
                                disabled: isBusy || !draftStudentId,
                                onClick: () => void handleApproveStudentAccount(acc),
                              },
                              {
                                id: 'suspend',
                                label: 'ระงับสิทธิ์ชั่วคราว',
                                icon: <XCircle className="w-3.5 h-3.5" />,
                                variant: 'warning' as const,
                                disabled: isBusy,
                                onClick: () => void handleUpdateStudentStatus(acc, 'suspended'),
                              },
                            ]),
                        {
                          id: 'delete_request',
                          label: 'ยกเลิก / ลบคำขอสมัคร',
                          icon: <Trash2 className="w-3.5 h-3.5" />,
                          variant: 'danger',
                          dividerBefore: true,
                          disabled: isBusy,
                          onClick: () => handleRequestDeleteStudentAccount(acc),
                        },
                      ];

                      return (
                        <tr key={acc.id} className="hover:bg-[var(--color-card-subtle)] transition">
                          <td className="py-3 px-3 min-w-[200px]">
                            <p className="text-xs font-bold text-[var(--color-text-title)]">
                              {acc.full_name_th || acc.full_name_en || 'ไม่ระบุชื่อ'}
                            </p>
                            <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5 flex-wrap">
                              {acc.email && <span className="font-mono">{acc.email}</span>}
                              {acc.phone && <span>· โทร {acc.phone}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                acc.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                  : acc.status === 'suspended'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                              }`}
                            >
                              {acc.status === 'active' ? 'อนุมัติแล้ว (ใช้งานได้)' : acc.status === 'suspended' ? 'ระงับสิทธิ์' : 'รออนุมัติเข้าโรงเรียน'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={draftStudentId}
                              onChange={(e) => setLinkDrafts((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                              aria-label={`เลือกระเบียนนักเรียนสำหรับ ${acc.full_name_th || acc.full_name_en || acc.email || 'ผู้สมัคร'}`}
                              className="w-full max-w-[240px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
                            >
                              <option value="">-- ผูกระเบียนนักเรียน (ไม่บังคับ) --</option>
                              {students.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.studentIdNumber} · {st.firstNameTh} {st.lastNameTh} ({st.room})
                                </option>
                              ))}
                            </select>
                            <div className={`mt-1 text-[10px] ${linkedStudent ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-amber-700 dark:text-amber-300'}`}>
                              {linkedStudent
                                ? `ผูกปัจจุบัน: ${linkedStudent.firstNameTh} ${linkedStudent.lastNameTh} (${linkedStudent.studentIdNumber})`
                                : 'ยังไม่ผูกกับระเบียนนักเรียน DMC'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <TableActionMenu
                              items={actionItems}
                              ariaLabel={`จัดการคำขอสมัคร ${acc.full_name_th || acc.full_name_en || acc.email || 'นักเรียน'}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                            const applyRenameRoom = () => {
                              void saveRoomOptions(roomOptions.map((item) => item === room ? nextName : item)).then((saved) => {
                                if (!saved) return;
                                if (assignedStudents.length > 0) {
                                  onBatchUpdateStudents?.(assignedStudents.map((student) => ({ ...student, room: nextName })));
                                }
                                setEditingRoomOption(null);
                                setRoomOptionDraft('');
                              });
                            };
                            if (assignedStudents.length > 0) {
                              setPendingConfirm({
                                title: 'ยืนยันเปลี่ยนชื่อห้องเรียน',
                                description: `เปลี่ยนชื่อห้องและแก้ข้อมูลนักเรียน ${assignedStudents.length} คนจาก "${room}" เป็น "${nextName}" หรือไม่?`,
                                confirmLabel: 'ยืนยันเปลี่ยนชื่อห้อง',
                                action: applyRenameRoom,
                              });
                              return;
                            }
                            applyRenameRoom();
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
                              setPendingConfirm({
                                title: 'ยืนยันลบห้องเรียนจากตัวเลือก',
                                description: `ลบ "${room}" ออกจากรายการห้องที่เลือกได้หรือไม่?${note}`,
                                confirmLabel: 'ยืนยันลบห้อง',
                                action: async () => {
                                  await saveRoomOptions(roomOptions.filter((item) => item !== room));
                                },
                              });
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
                    {isPrimaryGradeLevel(formData.gradeLevel) ? (
                      <div className="rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-3 text-[11px] text-sky-900 dark:text-sky-200">
                        <strong className="block mb-0.5">รอบการประเมินระดับประถมศึกษา (ป.1–ป.6): ประเมินผลรายปี</strong>
                        ระบบจะสื่อสารผลการเรียนด้วยคะแนนดิบ (เต็ม 100) และร้อยละ (%) จากสมุดวัดผล (ปพ.5) เป็นหลัก โดยไม่แสดงการคำนวณ GPA/GPAX สำหรับระดับประถมศึกษา
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const liveSummary = editingStudent
                            ? calculateStudentAcademicSummary({
                                student: editingStudent,
                                courses,
                                grades,
                                gradingSystem,
                                currentAcademicYear: activeSchool?.academicYear,
                                currentSemester: activeSchool?.currentSemester,
                              })
                            : null;
                          const hasRecorded = Boolean(liveSummary?.hasRecordedGrades && liveSummary.gpax !== null);
                          return (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <label className="block text-[var(--color-text-title)] font-bold text-xs">
                                  เกรดเฉลี่ยสะสม (GPAX จาก ปพ.5)
                                </label>
                                <span className="text-[11px] text-[var(--color-primary-text)] font-semibold tabular-nums">
                                  {hasRecorded
                                    ? `คำนวณจริง ${liveSummary!.gradedSubjectCount} วิชา · ${liveSummary!.registeredCredits.toFixed(1)} นก.`
                                    : 'ยังไม่มีคะแนนใน ปพ.5 (ตั้งต้น 0.00)'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="4"
                                  step="0.01"
                                  readOnly={hasRecorded}
                                  value={hasRecorded ? liveSummary!.gpax! : formData.gpa}
                                  onChange={(e) => {
                                    if (hasRecorded) return;
                                    const parsed = Number(e.target.value);
                                    const val = Number.isFinite(parsed) ? Math.min(4.00, Math.max(0, parsed)) : 0;
                                    setFormData({ ...formData, gpa: Number(val.toFixed(2)) });
                                  }}
                                  placeholder="0.00"
                                  className="w-36 px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-bold text-sm tabular-nums"
                                />
                                {editingStudent && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (liveSummary?.gpax !== null && liveSummary?.gpax !== undefined) {
                                        setFormData({ ...formData, gpa: liveSummary.gpax });
                                      } else {
                                        setFormData({ ...formData, gpa: 0 });
                                      }
                                    }}
                                    className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold cursor-pointer"
                                  >
                                    ซิงค์จาก ปพ.5
                                  </button>
                                )}
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed flex-1 min-w-[200px]">
                                  {hasRecorded
                                    ? 'ระบบคำนวณ GPAX อัตโนมัติแบบถ่วงน้ำหนักหน่วยกิตจากคะแนนในสมุดวัดผล ปพ.5 ไม่ใช่ค่าสมมติ'
                                    : 'เมื่อยังไม่มีคะแนนในสมุดวัดผล ค่าเริ่มต้นจะเป็น 0.00 และจะอัปเดตอัตโนมัติทันทีเมื่อครูบันทึกคะแนนใน Gradebook'}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}
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
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-[var(--color-primary)] text-white flex items-center justify-between shrink-0">
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
            <form onSubmit={(e) => void handleSubmitInviteDialog(e)} className="p-5 space-y-4 overflow-y-auto">
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

              {inviteLinkResult && inviteLinkResult.deliveryMethod === 'invite_link_rpc' ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>สร้างลิงก์คำเชิญผู้ปกครองสำเร็จ</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      ส่งลิงก์ด้านล่างให้ผู้ปกครอง ({inviteLinkResult.email}) ทาง LINE หรืออีเมล เพื่อให้กดตั้งรหัสผ่านและผูกบัญชีกับ {inviteDialog.student.firstNameTh} {inviteDialog.student.lastNameTh}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--color-text-title)] flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                      <span>ลิงก์คำเชิญสำหรับตั้งรหัสผ่าน (ใช้ได้ 7 วัน)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLinkResult.inviteUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-[11px] font-mono text-[var(--color-text-title)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyInviteField(inviteLinkResult.inviteUrl, 'link')}
                        className="shrink-0 px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedInviteField === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedInviteField === 'link' ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const inviteMsg = `เรียนผู้ปกครองของ ${inviteDialog.student.firstNameTh} ${inviteDialog.student.lastNameTh}\nขอเชิญเข้าใช้งานระบบโรงเรียนบ้านพักครู (BaanPakKru)\nอีเมลบัญชี: ${inviteLinkResult.email}\nกรุณาเปิดลิงก์เพื่อตั้งรหัสผ่านและเข้าสู่ระบบ:\n${inviteLinkResult.inviteUrl}`;
                        void handleCopyInviteField(inviteMsg, 'message');
                      }}
                      className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedInviteField === 'message' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      <span>{copiedInviteField === 'message' ? 'คัดลอกข้อความแล้ว' : 'คัดลอกข้อความส่ง LINE'}</span>
                    </button>

                    <a
                      href={`mailto:${encodeURIComponent(inviteLinkResult.email)}?subject=${encodeURIComponent('เชิญผู้ปกครองเข้าสู่ระบบ BaanPakKru')}&body=${encodeURIComponent(`เรียนผู้ปกครองของ ${inviteDialog.student.firstNameTh} ${inviteDialog.student.lastNameTh}\n\nกรุณาเปิดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านและเข้าสู่ระบบ:\n${inviteLinkResult.inviteUrl}`)}`}
                      className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>เปิดแอปอีเมลส่ง</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => setInviteDialog(null)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {inviteBackendMissing && (
                    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3.5 space-y-2.5 text-xs text-amber-950 dark:text-amber-100">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold">ต้องติดตั้งฟังก์ชันสร้างคำเชิญใน Supabase ก่อน (ทำครั้งเดียว)</p>
                          <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                            {inviteBackendMissing.message} — กดคัดลอก SQL แล้วรันใน Supabase SQL Editor จากนั้นกดลองส่งคำเชิญอีกครั้ง
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyInviteField(STAFF_INVITE_RPC_SQL, 'sql')}
                          className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedInviteField === 'sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedInviteField === 'sql' ? 'คัดลอก SQL แล้ว' : '1. คัดลอก SQL ติดตั้งระบบคำเชิญ'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={invitingStudentId === inviteDialog.student.id}
                          onClick={() => void submitInviteDialogAction()}
                          className="px-3 py-1.5 rounded-lg border border-amber-400 dark:border-amber-600 bg-white/80 dark:bg-slate-900/60 hover:bg-white text-[11px] font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${invitingStudentId === inviteDialog.student.id ? 'animate-spin' : ''}`} />
                          <span>ลองส่งคำเชิญอีกครั้ง</span>
                        </button>
                      </div>
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
                      ? 'เมื่อผู้ปกครองกดลิงก์เชิญและตั้งรหัสผ่านแล้ว ระบบจะเชื่อมบัญชีผู้ปกครองกับข้อมูลนักเรียนคนนี้โดยอัตโนมัติ'
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
                </>
              )}
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

      {showBatchQrModal && (
        <BatchQrPrintModal
          isOpen={showBatchQrModal}
          onClose={() => setShowBatchQrModal(false)}
          students={students}
          initialSelectedIds={
            selectedQrStudentIds.length > 0
              ? selectedQrStudentIds
              : filteredStudents.map((s) => s.id)
          }
          school={activeSchool}
          lang="th"
        />
      )}
    </div>
  );
};
