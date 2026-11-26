import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  BellRing, 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  QrCode, 
  Clock, 
  HeartPulse, 
  FileCheck2, 
  Award, 
  Receipt, 
  ShieldAlert, 
  Copy, 
  ExternalLink, 
  Save, 
  Smartphone, 
  Send, 
  RefreshCw, 
  HelpCircle,
  Building2,
  Calendar,
  Sparkles,
  Users,
  Check,
  ToggleLeft,
  ToggleRight,
  Database,
  Radio,
  Sliders,
  MapPin,
  Mail,
  KeyRound,
  GraduationCap,
  Upload,
  Trash2,
  Shield,
  LayoutGrid,
  ShieldCheck,
  ArrowRight,
  Lock,
  Activity,
  Search,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react';
import { AttendanceRecord, Course, GradeRecord, SystemConfig, LineNotificationSettings, Student, Teacher, TimetableSlot, AppLanguage, School, CampusGateGeofence, UserRole, SchoolFeatureFlags, AuthUser, PromotionCampaign } from '../types';
import { getModuleTone } from '../lib/moduleTheme';
import type { NavTab } from '../components/layout/Sidebar';
import {
  approveStudentAccountInSupabase,
  createMissingStudentLoginAccounts,
  createStudentLoginAccount,
  deleteStudentAccountRegistrationInSupabase,
  linkStudentAccountToStudent,
  listStudentAccountLinks,
  resetStudentLoginPassword,
  StudentAccountLink,
  BulkStudentCredentialResult,
  TemporaryStudentCredential,
  updateStudentAccountStatusInSupabase,
} from '../lib/authDb';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { SchoolGpsSettingsCard } from '../components/SchoolGpsSettingsCard';
import { SchoolStudentLoginSettingsCard } from '../components/SchoolStudentLoginSettingsCard';
import { SchoolPermissionSettingsView } from './SchoolPermissionSettingsView';
import { SchoolPackagesAndAiPanel } from '../components/admin/SchoolPackagesAndAiPanel';
import { AcademicTermRolloverPanel } from '../components/admin/AcademicTermRolloverPanel';
import {
  buildInitialStudentPassword,
  formatStudentIdPolicySummary,
  normalizeSchoolStudentIdPolicy,
  validateStudentIdAgainstPolicy,
} from '../lib/studentIdPolicy';
import { uploadSchoolLogo } from '../lib/supabase';
import { DEFAULT_SEMESTER_OPTIONS, DEFAULT_STAFF_POSITION_OPTIONS } from '../lib/schoolSettings';
import { appendAuditLog, getAuditLogs } from '../lib/auditLog';
import { getSchoolFeatureFlags, saveSchoolFeatureFlags } from '../lib/schoolFeatureFlags';
import { normalizeSelfieRetentionMinutes } from '../lib/selfieCleanupLogic';
import { getSchoolRolePolicies, saveSchoolRolePolicies, type SchoolPolicyId } from '../lib/schoolPermissions';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { TableActionMenu, TableActionItem } from '../components/common/TableActionMenu';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';

export type SystemSettingsTab =
  | 'control_overview'
  | 'line_events'
  | 'line_connection'
  | 'preview_simulator'
  | 'subscribers'
  | 'school_general'
  | 'school_gps'
  | 'school_permissions'
  | 'student_accounts'
  | 'student_login_config'
  | 'saas_audit';

interface SystemSettingsViewProps {
  systemConfig: SystemConfig;
  activeSchool: School;
  students: Student[];
  teachers?: Teacher[];
  courses?: Course[];
  grades?: GradeRecord[];
  attendance?: AttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  promotions?: PromotionCampaign[];
  lang: AppLanguage;
  campusGates?: CampusGateGeofence[];
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
  onUpdateSchool?: (updates: Partial<School>) => Promise<void>;
  onApplyAcademicRollover?: (payload: {
    academicYear: string;
    currentSemester: string;
    newCourses: Course[];
    newTimetableSlots: TimetableSlot[];
    promotedStudents?: Student[];
  }) => Promise<void>;
  onCopyCoursesToSchool?: (newCourses: Course[]) => void;
  onUpdateConfig: (updated: SystemConfig) => void;
  featureFlags?: SchoolFeatureFlags;
  onUpdateFeatureFlags?: (flags: SchoolFeatureFlags) => void;
  onCleanupDueSelfies?: (options?: { silent?: boolean; retentionMinutes?: number }) => Promise<{
    deletedPhotosCount: number;
    clearedRecordsCount: number;
    matchedByCheckoutCount: number;
    matchedPreviousDaysCount: number;
  }>;
  initialTab?: SystemSettingsTab;
  onTabChange?: (tab: SystemSettingsTab) => void;
  onNavigateModule?: (tab: NavTab) => void;
  onOpenBackupCenter?: () => void;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  systemConfig,
  activeSchool,
  students,
  teachers = [],
  courses = [],
  grades = [],
  attendance = [],
  timetableSlots = [],
  currentRole,
  currentUser,
  promotions = [],
  lang,
  campusGates = [],
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
  onUpdateSchool,
  onApplyAcademicRollover,
  onCopyCoursesToSchool,
  onUpdateConfig,
  featureFlags: externalFeatureFlags,
  onUpdateFeatureFlags,
  onCleanupDueSelfies,
  initialTab,
  onTabChange,
  onNavigateModule,
  onOpenBackupCenter,
  canSwitchAdminTeacherMode = false,
  onSwitchOperationalRole,
}) => {
  const { presets: customPresets, updatePresets: updateCustomPresets, resetPresets: resetCustomPresets } = useSchoolCustomPresets(activeSchool.id);
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>(initialTab || 'control_overview');
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);
  const [policyTick, setPolicyTick] = useState(0);
  const [quickSwitchMessage, setQuickSwitchMessage] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState<SchoolFeatureFlags>(
    () => externalFeatureFlags || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise')
  );
  const [auditFilter, setAuditFilter] = useState<string>('all');
  useEffect(() => {
    setLocalFlags(externalFeatureFlags || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise'));
  }, [activeSchool.id, externalFeatureFlags]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCleaningSelfies, setIsCleaningSelfies] = useState(false);
  const [selfieCleanupFeedback, setSelfieCleanupFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [previewSampleType, setPreviewSampleType] = useState<'checkin' | 'infirmary' | 'billing' | 'grades' | 'homework'>('checkin');
  const [simulatedSendState, setSimulatedSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [eventCategoryPage, setEventCategoryPage] = useState(0);
  const [subscriberPage, setSubscriberPage] = useState(0);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccountLink[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentAccountsLoading, setStudentAccountsLoading] = useState(false);
  const [studentAccountSaving, setStudentAccountSaving] = useState(false);
  const [studentAccountError, setStudentAccountError] = useState<string | null>(null);
  const [studentAccountSuccess, setStudentAccountSuccess] = useState<string | null>(null);
  const [pendingStudentAccountConfirm, setPendingStudentAccountConfirm] = useState<StudentAccountLink | null>(null);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<StudentAccountLink | null>(null);
  const [credentialStudentId, setCredentialStudentId] = useState('');
  const [temporaryCredential, setTemporaryCredential] = useState<TemporaryStudentCredential | null>(null);
  const [bulkCredentialResult, setBulkCredentialResult] = useState<BulkStudentCredentialResult | null>(null);
  const [showBulkCreateConfirm, setShowBulkCreateConfirm] = useState(false);
  const [bulkTargetStudentIds, setBulkTargetStudentIds] = useState<string[] | null>(null);
  const [missingGradeFilter, setMissingGradeFilter] = useState<string>('all');
  const [missingRoomFilter, setMissingRoomFilter] = useState<string>('all');
  const [missingSearchQuery, setMissingSearchQuery] = useState<string>('');
  const [selectedMissingStudentIds, setSelectedMissingStudentIds] = useState<Set<string>>(() => new Set());
  const [inlinePasswordType, setInlinePasswordType] = useState<'student_id' | 'birthdate' | 'custom' | 'pin'>(
    () => activeSchool.studentDefaultPasswordType || 'student_id'
  );
  const [inlineShortIdPrefix, setInlineShortIdPrefix] = useState<string>(
    () => activeSchool.studentShortIdPasswordPrefix || ''
  );
  const [savingInlinePasswordConfig, setSavingInlinePasswordConfig] = useState(false);
  const [existingAccountRoomFilter, setExistingAccountRoomFilter] = useState<string>('all');
  const [existingAccountStatusFilter, setExistingAccountStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [existingAccountSearch, setExistingAccountSearch] = useState<string>('');
  const [schoolLogoUploading, setSchoolLogoUploading] = useState(false);
  const [schoolLogoError, setSchoolLogoError] = useState<string | null>(null);
  const [schoolLogoSuccess, setSchoolLogoSuccess] = useState<string | null>(null);
  const [roomOptionsSaving, setRoomOptionsSaving] = useState(false);
  const [roomOptionsSaveError, setRoomOptionsSaveError] = useState<string | null>(null);
  const [savingPrimaryCourseCreditSetting, setSavingPrimaryCourseCreditSetting] = useState(false);
  const [primaryCourseCreditSettingError, setPrimaryCourseCreditSettingError] = useState<string | null>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInlinePasswordType(activeSchool.studentDefaultPasswordType || 'student_id');
    setInlineShortIdPrefix(activeSchool.studentShortIdPasswordPrefix || '');
  }, [activeSchool.id, activeSchool.studentDefaultPasswordType, activeSchool.studentShortIdPasswordPrefix]);

  useEffect(() => {
    if (activeSchool.roomOptions?.length) {
      updateCustomPresets({ roomOptions: activeSchool.roomOptions });
    }
  }, [activeSchool.id, activeSchool.roomOptions, updateCustomPresets]);

  useEffect(() => {
    if (
      activeTab !== 'student_accounts' ||
      !['admin', 'super_admin'].includes(currentRole)
    ) return;

    let active = true;
    setStudentAccountsLoading(true);
    setStudentAccountError(null);
    listStudentAccountLinks(activeSchool.id)
      .then((accounts) => {
        if (!active) return;
        setStudentAccounts(accounts);
        const defaultAccount = accounts.find((account) => account.status === 'pending' || !account.student_id) || accounts[0];
        setSelectedAccountId(defaultAccount?.id || '');
        setSelectedStudentId(defaultAccount?.student_id || '');
      })
      .catch((error: unknown) => {
        if (active) setStudentAccountError(error instanceof Error ? error.message : 'โหลดบัญชีนักเรียนไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setStudentAccountsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, activeSchool.id, currentRole]);

  useEffect(() => {
    setTemporaryCredential(null);
    setBulkCredentialResult(null);
    setCredentialStudentId('');
  }, [activeSchool.id]);

  const reloadStudentAccounts = async () => {
    const accounts = await listStudentAccountLinks(activeSchool.id);
    setStudentAccounts(accounts);
  };

  const handleLinkStudentAccount = async () => {
    if (!selectedAccountId || !selectedStudentId) {
      setStudentAccountError('กรุณาเลือกบัญชีและรายชื่อนักเรียน');
      return;
    }

    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    try {
      await approveStudentAccountInSupabase(activeSchool.id, selectedAccountId, selectedStudentId);
      await linkStudentAccountToStudent(activeSchool.id, selectedAccountId, selectedStudentId);
      setStudentAccountSuccess('อนุมัติและผูกบัญชีกับระเบียนนักเรียนเรียบร้อยแล้ว');
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'ผูกบัญชีนักเรียนไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
    }
  };

  const handleApproveOrToggleStatus = async (account: StudentAccountLink, nextStatus: 'active' | 'suspended') => {
    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    try {
      if (nextStatus === 'active') {
        await approveStudentAccountInSupabase(activeSchool.id, account.id, account.student_id || null);
      } else {
        await updateStudentAccountStatusInSupabase(activeSchool.id, account.id, nextStatus);
      }
      setStudentAccountSuccess(
        nextStatus === 'active'
          ? `อนุมัติบัญชี "${account.full_name_th || account.full_name_en}" เปิดใช้งานเรียบร้อยแล้ว`
          : `ระงับสิทธิ์บัญชี "${account.full_name_th || account.full_name_en}" เรียบร้อยแล้ว`
      );
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
    }
  };

  const handleConfirmDeleteStudentAccount = async () => {
    if (!pendingStudentAccountConfirm) return;
    const account = pendingStudentAccountConfirm;
    const displayName = account.full_name_th || account.full_name_en || account.email || 'ไม่ระบุชื่อ';
    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    try {
      await deleteStudentAccountRegistrationInSupabase(activeSchool.id, account.id);
      setStudentAccounts((prev) => prev.filter((item) => item.id !== account.id));
      if (selectedAccountId === account.id) {
        setSelectedAccountId('');
        setSelectedStudentId('');
      }
      setStudentAccountSuccess(`ยกเลิกและลบบัญชีลงทะเบียน "${displayName}" เรียบร้อยแล้ว`);
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'ไม่สามารถยกเลิก/ลบคำขอลงทะเบียนได้');
    } finally {
      setStudentAccountSaving(false);
      setPendingStudentAccountConfirm(null);
    }
  };

  const getEffectivePasswordConfig = () => ({
    defaultPasswordType: inlinePasswordType,
    shortIdPasswordPrefix: inlineShortIdPrefix.replace(/\s+/g, '').slice(0, 12),
  });

  const handleSaveInlinePasswordPolicy = async (
    nextType: 'student_id' | 'birthdate' | 'custom' | 'pin',
    nextPrefix: string
  ) => {
    const cleanPrefix = nextPrefix.replace(/\s+/g, '').slice(0, 12);
    setInlinePasswordType(nextType);
    setInlineShortIdPrefix(cleanPrefix);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);

    if (!onUpdateSchool) {
      setStudentAccountSuccess(
        nextType === 'birthdate'
          ? 'เลือกใช้วันเดือนปีเกิด 8 หลักเป็นรหัสผ่านเริ่มต้นสำหรับรอบนี้แล้ว'
          : cleanPrefix
            ? `กำหนดคำนำหน้ารหัสผ่านเริ่มต้น "${cleanPrefix}" สำหรับการสร้างบัญชีรอบนี้แล้ว`
            : 'ใช้รหัสนักเรียนตรงๆ เป็นรหัสผ่านเริ่มต้น'
      );
      return;
    }

    setSavingInlinePasswordConfig(true);
    try {
      await onUpdateSchool({
        studentDefaultPasswordType: nextType,
        studentShortIdPasswordPrefix: cleanPrefix,
      });
      setStudentAccountSuccess(
        nextType === 'birthdate'
          ? 'บันทึกการใช้วันเดือนปีเกิด พ.ศ. 8 หลัก เป็นรหัสผ่านเริ่มต้นของโรงเรียนเรียบร้อยแล้ว'
          : cleanPrefix
            ? `บันทึกคำนำหน้ารหัสผ่านเริ่มต้น "${cleanPrefix}" สำหรับรหัสสั้นกว่า 6 ตัวเรียบร้อยแล้ว`
            : 'บันทึกการใช้รหัสนักเรียนเป็นรหัสผ่านเริ่มต้นเรียบร้อยแล้ว'
      );
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'ไม่สามารถบันทึกตั้งค่ารหัสผ่านเริ่มต้นได้');
    } finally {
      setSavingInlinePasswordConfig(false);
    }
  };

  const handleCreateStudentLoginAccount = async (targetId?: string) => {
    const targetStudentId = targetId || credentialStudentId;
    if (!targetStudentId) {
      setStudentAccountError('กรุณาเลือกรายชื่อนักเรียน');
      return;
    }
    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    setTemporaryCredential(null);
    setBulkCredentialResult(null);
    try {
      const credential = await createStudentLoginAccount(
        activeSchool.id,
        targetStudentId,
        getEffectivePasswordConfig()
      );
      setTemporaryCredential(credential);
      setStudentAccountSuccess(`สร้างบัญชีให้นักเรียน ${credential.studentIdNumber} เรียบร้อยแล้ว`);
      if (!targetId) setCredentialStudentId('');
      setSelectedMissingStudentIds((prev) => {
        if (!prev.has(targetStudentId)) return prev;
        const next = new Set(prev);
        next.delete(targetStudentId);
        return next;
      });
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'สร้างบัญชีนักเรียนไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
    }
  };

  const activeStudentsWithoutAccounts = useMemo(
    () =>
      students.filter(
        (student) =>
          (student.status === 'active' || student.status === 'transferred_in') &&
          !studentAccounts.some((account) => account.student_id === student.id)
      ),
    [students, studentAccounts]
  );

  const missingGradeOptions = useMemo(
    () =>
      Array.from(
        new Set(activeStudentsWithoutAccounts.map((s) => (s.gradeLevel || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, 'th', { numeric: true })),
    [activeStudentsWithoutAccounts]
  );

  const missingRoomOptions = useMemo(() => {
    const base =
      missingGradeFilter === 'all'
        ? activeStudentsWithoutAccounts
        : activeStudentsWithoutAccounts.filter((s) => (s.gradeLevel || '').trim() === missingGradeFilter);
    return Array.from(new Set(base.map((s) => (s.room || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'th', { numeric: true })
    );
  }, [activeStudentsWithoutAccounts, missingGradeFilter]);

  const filteredMissingStudents = useMemo(() => {
    const q = missingSearchQuery.trim().toLowerCase();
    return activeStudentsWithoutAccounts.filter((student) => {
      if (missingGradeFilter !== 'all' && (student.gradeLevel || '').trim() !== missingGradeFilter) return false;
      if (missingRoomFilter !== 'all' && (student.room || '').trim() !== missingRoomFilter) return false;
      if (q) {
        const hay = `${student.firstNameTh || ''} ${student.lastNameTh || ''} ${student.firstNameEn || ''} ${student.lastNameEn || ''} ${student.studentIdNumber || ''} ${student.room || ''} ${student.gradeLevel || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeStudentsWithoutAccounts, missingGradeFilter, missingRoomFilter, missingSearchQuery]);

  useEffect(() => {
    const validIds = new Set(activeStudentsWithoutAccounts.map((s) => s.id));
    setSelectedMissingStudentIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed || next.size !== prev.size ? next : prev;
    });
  }, [activeStudentsWithoutAccounts]);

  const handleCreateMissingStudentLoginAccounts = async () => {
    const targetIds = bulkTargetStudentIds && bulkTargetStudentIds.length > 0 ? bulkTargetStudentIds : undefined;
    const studentIdNumbersById: Record<string, string> = {};
    activeStudentsWithoutAccounts.forEach((s) => {
      studentIdNumbersById[s.id] = s.studentIdNumber || s.id;
    });

    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    setTemporaryCredential(null);
    setBulkCredentialResult(null);
    try {
      const result = await createMissingStudentLoginAccounts(activeSchool.id, {
        studentIds: targetIds,
        studentIdNumbersById,
        passwordConfig: getEffectivePasswordConfig(),
      });
      setBulkCredentialResult(result);
      setStudentAccountSuccess(
        `สร้างบัญชีสำเร็จ ${result.created.length} คน · ข้าม ${result.skipped.length} คน · ล้มเหลว ${result.failed.length} คน`
      );
      if (targetIds) {
        setSelectedMissingStudentIds((prev) => {
          const next = new Set(prev);
          targetIds.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        setSelectedMissingStudentIds(new Set());
      }
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'สร้างบัญชีนักเรียนเป็นชุดไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
      setShowBulkCreateConfirm(false);
      setBulkTargetStudentIds(null);
    }
  };

  const handleCopyBulkCredentials = async () => {
    if (!bulkCredentialResult?.created.length) return;
    const text = [
      'รหัสนักเรียน\tรหัสผ่านเริ่มต้น (รหัสนักเรียน)\tเงื่อนไขการเข้าใช้',
      ...bulkCredentialResult.created.map((credential) =>
        `${credential.studentIdNumber}\t${credential.temporaryPassword}\t${
          credential.expiresAt
            ? new Date(credential.expiresAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')
            : 'บังคับเปลี่ยนรหัสผ่านเมื่อเข้าครั้งแรก'
        }`
      ),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField('bulkStudentCredentials');
      setTimeout(() => setCopiedField(null), 2500);
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'คัดลอกข้อมูลรหัสผ่านไม่สำเร็จ');
    }
  };

  const handleConfirmPasswordReset = async () => {
    const studentId = pendingPasswordReset?.student_id;
    if (!pendingPasswordReset || !studentId) return;
    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    setTemporaryCredential(null);
    setBulkCredentialResult(null);
    try {
      const credential = await resetStudentLoginPassword(activeSchool.id, studentId, getEffectivePasswordConfig());
      setTemporaryCredential(credential);
      setStudentAccountSuccess(`รีเซ็ตรหัสผ่านเริ่มต้นให้นักเรียน ${credential.studentIdNumber} เป็นรหัสผ่านเริ่มต้นเรียบร้อยแล้ว`);
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'รีเซ็ตรหัสผ่านนักเรียนไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
      setPendingPasswordReset(null);
    }
  };

  // Form State
  const defaultLineSettings: LineNotificationSettings = systemConfig.lineNotificationSettings || {
    lineOaId: '@eduverse_official',
    lineOaName: 'EduVerse School Connect OA',
    channelId: systemConfig.lineChannelId || '2001928431',
    channelSecret: '8a9f3b1c6d7e2f50493817263548eabc',
    channelAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eduverse_official_line_messaging_token_long_lived_2569_production',
    liffId: '2001928431-Lx9kNmQz',
    webhookUrl: 'https://school.eduverse.in.th/api/line/webhook',
    addFriendUrl: systemConfig.lineOaAddFriendUrl || 'https://line.me/R/ti/p/@eduverse_official',
    qrCodeImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://line.me/R/ti/p/@eduverse_official',
    autoReplyGreeting: 'สวัสดีครับ ยินดีต้อนรับสู่ระบบแจ้งเตือนสารสนเทศโรงเรียน EduVerse Official สำหรับผู้ปกครองและนักเรียน',
    schoolStartTime: '08:00',
    lateCutoffTime: '08:15',
    absenceCutoffTime: '08:30',
    checkoutStartTime: '15:30',
    behaviorAlertThreshold: 5,
    notifyAttendanceCheckIn: true,
    notifyAttendanceCheckOut: true,
    notifyAttendanceLate: true,
    notifyAttendanceAbsence: true,
    notifyInfirmaryVisit: true,
    notifyBehaviorDeduction: true,
    notifyBehaviorMerit: true,
    notifyNewHomework: true,
    notifyHomeworkDeadline: true,
    notifyHomeworkGraded: true,
    notifyGradeReportReleased: true,
    notifyBillingInvoice: true,
    notifyBillingPaymentSuccess: true,
    notifyEmergencyBroadcast: true,
    customHeaderColor: '#00B900',
    customFooterNote: 'ระบบแจ้งเตือนอัตโนมัติ EduVerse SIS • หากมีข้อสงสัยติดต่อห้องธุรการ โทร 02-999-8888',
  };

  const [lineSettings, setLineSettings] = useState<LineNotificationSettings>(defaultLineSettings);
  const [generalConfig, setGeneralConfig] = useState({
    academicYear: systemConfig.academicYear,
    currentSemester: systemConfig.currentSemester,
    semesterOptions: systemConfig.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
    gradingSystem: systemConfig.gradingSystem || 'thai',
    staffPositionOptions: systemConfig.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
    resendFromEmail: systemConfig.resendFromEmail,
    resendApiKeyConfigured: systemConfig.resendApiKeyConfigured,
    masterEmail: systemConfig.masterEmail || 'baanpakkru@gmail.com',
    replyToEmail: systemConfig.replyToEmail || 'baanpakkru@gmail.com',
  });

  useEffect(() => {
    setGeneralConfig((current) => ({
      ...current,
      academicYear: systemConfig.academicYear,
      currentSemester: systemConfig.currentSemester,
      semesterOptions: systemConfig.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
      gradingSystem: systemConfig.gradingSystem || 'thai',
      staffPositionOptions: systemConfig.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
    }));
  }, [
    activeSchool.id,
    systemConfig.academicYear,
    systemConfig.currentSemester,
    systemConfig.semesterOptions,
    systemConfig.gradingSystem,
    systemConfig.staffPositionOptions,
  ]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSchoolLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSchoolLogoError(null);
    setSchoolLogoSuccess(null);
    setSchoolLogoUploading(true);
    try {
      const logoUrl = await uploadSchoolLogo(activeSchool.id, file);
      await onUpdateSchool?.({ logoUrl });
      setSchoolLogoSuccess('บันทึกโลโก้โรงเรียนเรียบร้อยแล้ว');
    } catch (error) {
      setSchoolLogoError(error instanceof Error ? error.message : 'ไม่สามารถบันทึกโลโก้โรงเรียนได้');
    } finally {
      setSchoolLogoUploading(false);
      event.target.value = '';
    }
  };

  const handleSaveRoomOptions = async () => {
    if (!['admin', 'super_admin'].includes(currentRole)) {
      setRoomOptionsSaveError('เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่แก้ไขรายการห้องเรียนได้');
      return;
    }
    const roomOptions = [...new Set(customPresets.roomOptions.map((room) => room.trim()).filter(Boolean))];
    if (roomOptions.length === 0) {
      setRoomOptionsSaveError('ต้องมีห้องเรียนอย่างน้อย 1 ห้อง');
      return;
    }
    if (!onUpdateSchool) {
      setRoomOptionsSaveError('ไม่พบช่องทางบันทึกการตั้งค่าโรงเรียน');
      return;
    }
    setRoomOptionsSaving(true);
    setRoomOptionsSaveError(null);
    try {
      await onUpdateSchool({ roomOptions });
      updateCustomPresets({ roomOptions });
    } catch (error) {
      setRoomOptionsSaveError(error instanceof Error ? error.message : 'บันทึกรายการห้องเรียนไม่สำเร็จ');
    } finally {
      setRoomOptionsSaving(false);
    }
  };

  const handlePrimaryCourseCreditSettingChange = async (showPrimaryCourseCredits: boolean) => {
    if (!onUpdateSchool) {
      setPrimaryCourseCreditSettingError('ไม่พบช่องทางบันทึกการตั้งค่าโรงเรียน');
      return;
    }
    setSavingPrimaryCourseCreditSetting(true);
    setPrimaryCourseCreditSettingError(null);
    try {
      await onUpdateSchool({ showPrimaryCourseCredits });
    } catch (error) {
      setPrimaryCourseCreditSettingError(error instanceof Error ? error.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSavingPrimaryCourseCreditSetting(false);
    }
  };

  const isLineEnabled = localFlags.lineEnabled !== false;
  const isAutoDeleteSelfiesEnabled = localFlags.autoDeleteSelfiesAfterCheckout !== false;
  const selfieRetentionMinutes = normalizeSelfieRetentionMinutes(localFlags.selfieRetentionAfterCheckoutMinutes);
  const storedSelfieCount = useMemo(
    () => attendance.filter((record) => Boolean(record.photoUrl || record.photoStoragePath)).length,
    [attendance]
  );

  const handleToggleLineMaster = (nextEnabled?: boolean) => {
    const resolvedNext = typeof nextEnabled === 'boolean' ? nextEnabled : !isLineEnabled;
    const nextFlags: SchoolFeatureFlags = {
      ...localFlags,
      lineEnabled: resolvedNext,
    };
    setLocalFlags(nextFlags);
    saveSchoolFeatureFlags(activeSchool.id, nextFlags);
    onUpdateFeatureFlags?.(nextFlags);
    onUpdateConfig({
      ...systemConfig,
      lineMessagingConfigured: resolvedNext,
    });
    setQuickSwitchMessage(
      resolvedNext
        ? 'เปิดใช้งานระบบแจ้งเตือนผ่าน LINE OA ทั้งโรงเรียนแล้ว'
        : 'ปิดใช้งานระบบแจ้งเตือนผ่าน LINE OA แล้ว (ใช้แจ้งเตือนในแอป / Web Push แทน)'
    );
    window.setTimeout(() => setQuickSwitchMessage(null), 3000);
  };

  const handleToggleAutoDeleteSelfies = (nextEnabled?: boolean) => {
    const resolvedNext = typeof nextEnabled === 'boolean' ? nextEnabled : !isAutoDeleteSelfiesEnabled;
    const nextFlags: SchoolFeatureFlags = {
      ...localFlags,
      autoDeleteSelfiesAfterCheckout: resolvedNext,
      selfieRetentionAfterCheckoutMinutes: selfieRetentionMinutes,
    };
    setLocalFlags(nextFlags);
    saveSchoolFeatureFlags(activeSchool.id, nextFlags);
    onUpdateFeatureFlags?.(nextFlags);
    setQuickSwitchMessage(
      resolvedNext
        ? `เปิดระบบลบรูปเซลฟี่อัตโนมัติหลังเช็คเอาท์ ${selfieRetentionMinutes} นาทีแล้ว`
        : 'ปิดระบบลบรูปเซลฟี่อัตโนมัติชั่วคราวแล้ว'
    );
    window.setTimeout(() => setQuickSwitchMessage(null), 3000);
  };

  const handleChangeSelfieRetentionMinutes = (minutes: number) => {
    const normalized = normalizeSelfieRetentionMinutes(minutes);
    const nextFlags: SchoolFeatureFlags = {
      ...localFlags,
      autoDeleteSelfiesAfterCheckout: isAutoDeleteSelfiesEnabled,
      selfieRetentionAfterCheckoutMinutes: normalized,
    };
    setLocalFlags(nextFlags);
    saveSchoolFeatureFlags(activeSchool.id, nextFlags);
    onUpdateFeatureFlags?.(nextFlags);
    setSelfieCleanupFeedback({
      type: 'success',
      text: `ตั้งเวลาเก็บภาพเซลฟี่หลังเช็คเอาท์เป็น ${normalized} นาทีแล้ว (ประวัติการมาเรียนอยู่ครบ)`,
    });
  };

  const handleRunSelfieCleanupNow = async () => {
    if (!onCleanupDueSelfies || isCleaningSelfies) return;
    setIsCleaningSelfies(true);
    setSelfieCleanupFeedback(null);
    try {
      const result = await onCleanupDueSelfies({
        silent: false,
        retentionMinutes: selfieRetentionMinutes,
      });
      if (result.clearedRecordsCount > 0 || result.deletedPhotosCount > 0) {
        setSelfieCleanupFeedback({
          type: 'success',
          text: `ลบรูปที่ครบกำหนดแล้ว ${result.deletedPhotosCount} ไฟล์ (${result.clearedRecordsCount} รายการ: หลังเช็คเอาท์ ${result.matchedByCheckoutCount} · ค้างจากวันก่อน ${result.matchedPreviousDaysCount}) โดยบันทึกเวลาเช็คชื่ออยู่ครบถ้วน`,
        });
      } else {
        setSelfieCleanupFeedback({
          type: 'success',
          text: `ยังไม่มีรูปที่ครบกำหนดลบในขณะนี้ (เก็บภาพไว้ ${selfieRetentionMinutes} นาทีหลังเช็คเอาท์ และลบของวันก่อนหน้าอัตโนมัติ)`,
        });
      }
    } catch (error) {
      setSelfieCleanupFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'ไม่สามารถลบรูปเซลฟี่ที่ครบกำหนดได้',
      });
    } finally {
      setIsCleaningSelfies(false);
    }
  };

  const handleToggleEvent = (field: keyof LineNotificationSettings) => {
    setLineSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    setSaveError(null);
    const semesterOptions = [...new Set(generalConfig.semesterOptions.map((term) => term.trim()).filter(Boolean))];
    const staffPositionOptions = [...new Set(generalConfig.staffPositionOptions.map((position) => position.trim()).filter(Boolean))];
    if (semesterOptions.length === 0 || staffPositionOptions.length === 0) {
      setSaveError('กรุณาระบุภาคเรียนและตำแหน่งบุคลากรอย่างน้อยประเภทละ 1 รายการ');
      return;
    }
    const updated: SystemConfig = {
      ...systemConfig,
      academicYear: generalConfig.academicYear,
      currentSemester: generalConfig.currentSemester,
      semesterOptions,
      gradingSystem: generalConfig.gradingSystem,
      staffPositionOptions,
      resendFromEmail: generalConfig.resendFromEmail,
      resendApiKeyConfigured: generalConfig.resendApiKeyConfigured,
      masterEmail: generalConfig.masterEmail,
      replyToEmail: generalConfig.replyToEmail,
      lineChannelId: lineSettings.channelId,
      lineOaAddFriendUrl: lineSettings.addFriendUrl,
      lineMessagingConfigured: isLineEnabled,
      lineNotificationSettings: lineSettings,
    };

    try {
      if (['admin', 'super_admin'].includes(currentRole)) {
        await onUpdateSchool?.({
          academicYear: generalConfig.academicYear,
          currentSemester: generalConfig.currentSemester,
          semesterOptions,
          gradingSystem: generalConfig.gradingSystem,
          staffPositionOptions,
        });
      }
      onUpdateConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'บันทึกการตั้งค่าโรงเรียนไม่สำเร็จ');
    }
  };

  const handleSimulateSend = () => {
    setSimulatedSendState('sending');
    setTimeout(() => {
      setSimulatedSendState('sent');
      setTimeout(() => setSimulatedSendState('idle'), 3000);
    }, 900);
  };

  // Connected students count
  const connectedCount = students.filter(s => s.lineLinked).length;
  const connectedPct = students.length > 0 ? Math.round((connectedCount / students.length) * 100) : 0;

  // Event Categories for UI
  const eventCategories = [
    {
      id: 'attendance',
      titleTh: '1. ระบบเข้า-ออกโรงเรียน & เช็คชื่อ (Attendance & Gates)',
      descriptionTh: 'ส่งแจ้งเตือนเข้าห้องแชตผู้ปกครองทันทีที่นักเรียนสแกนบัตรหรือเช็คชื่อในชั้นเรียน',
      icon: Clock,
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      events: [
        {
          key: 'notifyAttendanceCheckIn' as const,
          titleTh: 'แจ้งเตือนเมื่อนักเรียนแตะบัตรเข้าโรงเรียน (Check-in)',
          descTh: 'ส่งการ์ดระบุชื่อ เวลาเข้าแถว ประตูที่ผ่าน และภาพถ่ายกล้องวงจรปิดแบบเรียลไทม์',
        },
        {
          key: 'notifyAttendanceCheckOut' as const,
          titleTh: 'แจ้งเตือนเมื่อนักเรียนแตะบัตรออกจากโรงเรียน (Check-out)',
          descTh: 'แจ้งผู้ปกครองเมื่อนักเรียนเดินทางออกจากโรงเรียนหลังเวลาเลิกเรียน',
        },
        {
          key: 'notifyAttendanceLate' as const,
          titleTh: 'แจ้งเตือนกรณีมาสาย (Late Arrival Alert)',
          descTh: `แจ้งเตือนทันทีเมื่อเข้าโรงเรียนหลังเวลา ${lineSettings.lateCutoffTime} น. พร้อมแนะนำการปรับเวลา`,
        },
        {
          key: 'notifyAttendanceAbsence' as const,
          titleTh: 'แจ้งเตือนด่วนกรณีขาดเรียนหรือไม่ปรากฏตัว (Absence Alert)',
          descTh: `ส่งแจ้งเตือนเวลา ${lineSettings.absenceCutoffTime} น. หากระบบไม่พบบันทึกการสแกนบัตร`,
        },
      ]
    },
    {
      id: 'health',
      titleTh: '2. ห้องพยาบาล & การปฐมพยาบาล (Infirmary Health Alert)',
      descriptionTh: 'แจ้งเตือนเร่งด่วนเมื่อนักเรียนมีอาการเจ็บป่วยหรือเข้ารับการรักษาที่ห้องพยาบาล',
      icon: HeartPulse,
      badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
      events: [
        {
          key: 'notifyInfirmaryVisit' as const,
          titleTh: 'แจ้งเตือนเมื่อนักเรียนเข้าห้องพยาบาล (Infirmary Visit)',
          descTh: 'ส่งข้อมูลอุณหภูมิร่างกาย อาการเบื้องต้น การปฐมพยาบาล และยาที่ได้รับทันที',
        },
      ]
    },
    {
      id: 'behavior',
      titleTh: '3. ความประพฤติ & วินัยนักเรียน (Behavior & Conduct)',
      descriptionTh: 'แจ้งเตือนพฤติกรรมทั้งด้านบวก (ทำความดี) และการตักเตือน (หักคะแนนพฤติกรรม)',
      icon: ShieldAlert,
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
      events: [
        {
          key: 'notifyBehaviorDeduction' as const,
          titleTh: 'แจ้งเตือนเมื่อถูกตัดคะแนนความประพฤติ (Conduct Deduction)',
          descTh: `ส่งแจ้งเตือนเหตุผล กฎระเบียบที่ผิด และคะแนนคงเหลือ (เมื่อถูกหักตั้งแต่ ${lineSettings.behaviorAlertThreshold} คะแนน)`,
        },
        {
          key: 'notifyBehaviorMerit' as const,
          titleTh: 'แจ้งเตือนเมื่อได้รับคะแนนความดี / จิตอาสา (Merit & Praise)',
          descTh: 'ส่งการ์ดยกย่องชมเชยเมื่อทำคุณงามความดีหรือช่วยเหลือสถานศึกษา',
        },
      ]
    },
    {
      id: 'academics',
      titleTh: '4. การเรียน การบ้าน & ผลการสอบ (Academics & Gradebook)',
      descriptionTh: 'รายงานความคืบหน้าทางการศึกษา มอบหมายงาน และการประเมินผลสัมฤทธิ์',
      icon: FileCheck2,
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      events: [
        {
          key: 'notifyNewHomework' as const,
          titleTh: 'แจ้งเตือนเมื่อมีการบ้านใหม่ (New Assignment)',
          descTh: 'ส่งหัวข้อการบ้าน วิชา คำสั่ง และกำหนดส่ง เพื่อให้ผู้ปกครองช่วยติดตาม',
        },
        {
          key: 'notifyHomeworkDeadline' as const,
          titleTh: 'แจ้งเตือนล่วงหน้า 24 ชม. ก่อนครบกำหนดส่ง (Deadline Reminder)',
          descTh: 'ระบบส่งแจ้งเตือนอัตโนมัติเฉพาะนักเรียนที่ยังไม่ได้ส่งงาน',
        },
        {
          key: 'notifyHomeworkGraded' as const,
          titleTh: 'แจ้งผลการตรวจการบ้านและข้อเสนอแนะของครู (Graded Feedback)',
          descTh: 'ส่งคะแนนที่ได้ พร้อมคำแนะนำพัฒนาการเรียนรู้จากคุณครูผู้สอน',
        },
        {
          key: 'notifyGradeReportReleased' as const,
          titleTh: 'แจ้งเตือนเมื่อผลการเรียนประจำภาคเรียนออก (Grade & GPA Release)',
          descTh: 'ส่งสรุป GPA / GPAX พร้อมลิงก์เข้าดูและดาวน์โหลดเอกสาร ปพ.1 ดิจิทัล',
        },
      ]
    },
    {
      id: 'billing',
      titleTh: '5. ค่าธรรมเนียมการเรียน & การเงิน (Tuition & PromptPay Invoices)',
      descriptionTh: 'ส่งใบแจ้งยอดค่าเทอม พร้อม QR Code PromptPay และใบเสร็จรับเงิน',
      icon: Receipt,
      badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
      events: [
        {
          key: 'notifyBillingInvoice' as const,
          titleTh: 'แจ้งเตือนใบแจ้งหนี้ค่าเทอม (Tuition Invoice with PromptPay)',
          descTh: 'ส่งการ์ดแจ้งยอดค่าใช้จ่ายพร้อมรูป QR Code PromptPay ชำระเงินได้ทันทีใน LINE',
        },
        {
          key: 'notifyBillingPaymentSuccess' as const,
          titleTh: 'ส่งใบเสร็จรับเงินดิจิทัลเมื่อชำระสำเร็จ (Payment Receipt)',
          descTh: 'ส่งใบเสร็จยืนยันการรับเงิน เลขที่ใบเสร็จ และบันทึกเข้าประวัติการเงิน',
        },
      ]
    },
    {
      id: 'broadcast',
      titleTh: '6. ข่าวสาร & ประกาศด่วนสถานศึกษา (School Broadcast)',
      descriptionTh: 'กระจายข่าวสารสำคัญ การปิดเรียนฉุกเฉิน หรือจดหมายข่าวจากโรงเรียน',
      icon: Radio,
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
      events: [
        {
          key: 'notifyEmergencyBroadcast' as const,
          titleTh: 'กระจายข้อความประกาศด่วน / ฉุกเฉิน (Emergency Broadcast)',
          descTh: 'บรอดแคสต์ตรงเข้า LINE ของผู้ปกครองทุกคนพร้อมกันใน 1 วินาที',
        },
      ]
    },
  ];

  const rawSettingsNavSections: Array<{
    groupLabel: string;
    tone: string;
    groupIcon: React.ComponentType<{ className?: string }>;
    items: Array<{
      id: SystemSettingsTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      adminOnly?: boolean;
    }>;
  }> = [
    {
      groupLabel: lang === 'th' ? 'ศูนย์ควบคุม' : 'Control',
      tone: 'tone-3',
      groupIcon: Shield,
      items: [
        { id: 'control_overview', label: lang === 'th' ? 'ภาพรวมระบบ' : 'Overview', icon: LayoutGrid },
        { id: 'school_permissions', label: lang === 'th' ? 'สิทธิ์บทบาท' : 'Permissions', icon: Shield, adminOnly: true },
        { id: 'saas_audit', label: lang === 'th' ? 'แพ็กเกจ AI & Audit Log' : 'Packages & Audit', icon: Sliders, adminOnly: true },
      ],
    },
    {
      groupLabel: lang === 'th' ? 'สถานศึกษา & GPS' : 'Campus & GPS',
      tone: 'tone-1',
      groupIcon: Building2,
      items: [
        { id: 'school_general', label: lang === 'th' ? 'ข้อมูลโรงเรียน & สำรองข้อมูล' : 'General & Backup', icon: Building2 },
        { id: 'school_gps', label: lang === 'th' ? 'พิกัด GPS & ประตู' : 'Campus GPS & Gates', icon: MapPin },
      ],
    },
    {
      groupLabel: lang === 'th' ? 'LINE OA & เวลาเรียน' : 'LINE & Cutoff',
      tone: 'tone-6',
      groupIcon: BellRing,
      items: [
        { id: 'line_events', label: lang === 'th' ? 'เงื่อนไขแจ้งเตือน & ตัดสาย' : 'Events & Cutoff', icon: BellRing },
        { id: 'line_connection', label: lang === 'th' ? 'LINE API & Webhook' : 'LINE API & Webhook', icon: MessageSquare },
        { id: 'preview_simulator', label: lang === 'th' ? 'จำลองการ์ด Flex' : 'Flex Simulator', icon: Smartphone },
        { id: 'subscribers', label: lang === 'th' ? 'ผู้รับแจ้งเตือน' : 'Subscribers', icon: Users },
      ],
    },
    {
      groupLabel: lang === 'th' ? 'บัญชีนักเรียน' : 'Student Accounts',
      tone: 'tone-7',
      groupIcon: KeyRound,
      items: [
        { id: 'student_accounts', label: lang === 'th' ? 'อนุมัติ & ผูกบัญชี' : 'Approve & Link', icon: KeyRound, adminOnly: true },
        { id: 'student_login_config', label: lang === 'th' ? 'ลิงก์ล็อกอินนักเรียน' : 'Student Login Link', icon: GraduationCap, adminOnly: true },
      ],
    },
  ];

  const settingsNavSections = rawSettingsNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || ['admin', 'super_admin'].includes(currentRole)),
    }))
    .filter((section) => section.items.length > 0);

  const allVisibleNavItems = settingsNavSections.flatMap((s) => s.items);

  return (
    <div className={`flex flex-col space-y-3 ${getModuleTone('system_settings')}`}>
      {/* Slim Single-Row Header */}
      <div className="shrink-0 app-page-header px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl tone-chip shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="module-category-kicker">
              07 · {lang === 'th' ? 'ตั้งค่าระบบ & ประสานงาน' : 'Settings & Governance'}
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-title)] truncate">
              {lang === 'th' ? 'ตั้งค่าระบบโรงเรียน' : 'School System Settings'}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] tabular-nums truncate">
              {lang === 'th'
                ? `${isLineEnabled ? `LINE ผู้ปกครอง ${connectedCount}/${students.length} (${connectedPct}%)` : 'ปิดใช้งาน LINE ชั่วคราว'} · ตัดสาย ${lineSettings.lateCutoffTime} น. · ตัดขาด ${lineSettings.absenceCutoffTime} น.`
                : `${isLineEnabled ? `LINE ${connectedCount}/${students.length} (${connectedPct}%)` : 'LINE Disabled'} · Late ${lineSettings.lateCutoffTime} · Absent ${lineSettings.absenceCutoffTime}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ModuleTourTrigger moduleId="system_settings" lang={lang} />
          <button
            type="button"
            onClick={handleSave}
            className="btn-action-primary px-4 py-2 whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'บันทึกการตั้งค่า' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
            <span>บันทึกการตั้งค่าระบบและเงื่อนไขการแจ้งเตือน LINE เรียบร้อยแล้ว</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Settings Architecture: Clean Left Navigation Rail + Content Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] gap-4 items-start">
        {/* Mobile Section Switcher */}
        <div className="lg:hidden saas-card p-2">
          <label htmlFor="mobile-settings-nav" className="sr-only">
            {lang === 'th' ? 'เลือกหมวดตั้งค่าระบบ' : 'Select settings section'}
          </label>
          <select
            id="mobile-settings-nav"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as SystemSettingsTab)}
            className="w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 text-xs font-semibold text-[var(--color-text-title)]"
          >
            {allVisibleNavItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Left Navigation Rail */}
        <aside
          data-guide-id="settings-tabs"
          aria-label={lang === 'th' ? 'หมวดตั้งค่าระบบ' : 'Settings navigation'}
          className="hidden lg:block saas-card p-2.5 space-y-3 sticky top-3"
        >
          {settingsNavSections.map((section, idx) => {
            const GroupIcon = section.groupIcon;
            return (
              <div
                key={section.groupLabel}
                className={`${section.tone} ${idx > 0 ? 'pt-2.5 border-t border-[var(--color-border)] space-y-1' : 'space-y-1'}`}
              >
                <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--tone)]">
                  <span className="w-4 h-4 rounded flex items-center justify-center bg-[var(--tone-soft)] text-[var(--tone)] shrink-0">
                    <GroupIcon className="w-2.5 h-2.5" />
                  </span>
                  <span className="truncate">{section.groupLabel}</span>
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-active={isActive}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left border transition cursor-pointer ${
                        isActive
                          ? 'bg-[var(--tone-soft)] text-[var(--tone)] font-semibold border-[color-mix(in_srgb,var(--tone)_24%,transparent)]'
                          : 'border-transparent text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--tone)]' : 'text-[var(--tone)]/80'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

      {/* Tab Panels Container */}
      <div data-guide-id="settings-overview-panel" className="min-w-0 space-y-4">
      {/* TAB 0: UNIFIED SYSTEM CONTROL OPERATIONS OVERVIEW */}
      {activeTab === 'control_overview' && (() => {
        const policies = getSchoolRolePolicies(activeSchool.id);
        const enabledPolicyCount = policies.filter((p) => p.enabled).length;
        const policyById = new Map(policies.map((p) => [p.id, p]));
        const adminTeachers = teachers.filter((t) => Boolean(t.isSchoolAdmin));
        const recentLogs = getAuditLogs(activeSchool.id).slice(0, 5);
        const gpsConfigured = Boolean(
          (campusGates.length > 0) ||
          (Number.isFinite(activeSchool.latitude) && Number.isFinite(activeSchool.longitude))
        );

        const handleQuickPolicyToggle = (policyId: SchoolPolicyId, labelTh: string) => {
          const updated = policies.map((p) =>
            p.id === policyId ? { ...p, enabled: !p.enabled } : p
          );
          saveSchoolRolePolicies(activeSchool.id, updated);
          const nextState = updated.find((p) => p.id === policyId)?.enabled;
          appendAuditLog(activeSchool.id, {
            actorName: currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'Admin',
            actorRole: currentRole,
            actionType: 'feature_flags_update',
            targetLabel: labelTh,
            details: nextState ? 'เปิดใช้งานสิทธิ์จากศูนย์ควบคุมระบบ' : 'ปิดสิทธิ์จากศูนย์ควบคุมระบบ',
          });
          setPolicyTick((t) => t + 1);
          setQuickSwitchMessage(`${nextState ? 'เปิด' : 'ปิด'} "${labelTh}" แล้ว`);
          window.setTimeout(() => setQuickSwitchMessage(null), 2600);
        };

        const handleQuickStudentAiToggle = () => {
          const nextAllowAi = localFlags.allowStudentsAi === false;
          const nextFlags: SchoolFeatureFlags = {
            ...localFlags,
            allowStudentsAi: nextAllowAi,
          };
          setLocalFlags(nextFlags);
          saveSchoolFeatureFlags(activeSchool.id, nextFlags);
          onUpdateFeatureFlags?.(nextFlags);
          appendAuditLog(activeSchool.id, {
            actorName: currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'Admin',
            actorRole: currentRole,
            actionType: 'feature_flags_update',
            targetLabel: 'สิทธิ์ใช้งาน AI สำหรับนักเรียน',
            details: nextAllowAi ? 'อนุญาตให้นักเรียนใช้งาน AI Tutor / Diagnostic' : 'ระงับฟีเจอร์ AI สำหรับนักเรียนชั่วคราว',
          });
          setQuickSwitchMessage(`${nextAllowAi ? 'เปิด' : 'ปิด'}ฟีเจอร์ AI สำหรับนักเรียนแล้ว`);
          window.setTimeout(() => setQuickSwitchMessage(null), 2600);
        };

        const controlPillars: Array<{
          id: SystemSettingsTab;
          category: string;
          title: string;
          statusLabel: string;
          ready: boolean;
          detail: string;
          icon: React.ComponentType<{ className?: string }>;
          actionLabel: string;
        }> = [
          {
            id: 'school_gps',
            category: 'ตำแหน่ง & ประตูสแกน',
            title: 'พิกัด GPS & รัศมี Geofence',
            statusLabel: gpsConfigured ? 'พร้อมใช้งาน' : 'ยังไม่ปักพิกัด',
            ready: gpsConfigured,
            detail: campusGates.length > 0
              ? `กำหนดจุดประตูแล้ว ${campusGates.length} จุด · รัศมีหลัก ${activeSchool.geofenceRadiusMeters || 200} ม.`
              : Number.isFinite(activeSchool.latitude)
              ? `พิกัดหลัก ${Number(activeSchool.latitude).toFixed(4)}, ${Number(activeSchool.longitude).toFixed(4)} · รัศมี ${activeSchool.geofenceRadiusMeters || 200} ม.`
              : 'กรุณาตั้งค่าพิกัดโรงเรียนเพื่อเปิดเช็คชื่อด้วยมือถือในรัศมี',
            icon: MapPin,
            actionLabel: 'ตั้งค่า GPS & ประตู',
          },
          {
            id: 'school_permissions',
            category: 'ความปลอดภัย & สิทธิ์',
            title: 'สิทธิ์บทบาทครู / นักเรียน / ผู้ปกครอง',
            statusLabel: `${enabledPolicyCount}/${policies.length} สิทธิ์เปิดอยู่`,
            ready: enabledPolicyCount > 0,
            detail: `ครูที่มีสิทธิ์ผู้ดูแล (Admin Switch): ${adminTeachers.length} คน · กำหนดสิทธิ์แยกตามบทบาททันที`,
            icon: ShieldCheck,
            actionLabel: 'จัดการสิทธิ์ทั้งหมด',
          },
          {
            id: 'line_events',
            category: 'การแจ้งเตือน & เวลาเรียน',
            title: 'LINE OA & เวลาตัดสาย / ขาดเรียน',
            statusLabel: !isLineEnabled ? 'ปิดใช้งาน LINE' : `เชื่อมต่อ ${connectedPct}%`,
            ready: isLineEnabled && (connectedCount > 0 || Boolean(lineSettings.notifyAttendanceCheckIn)),
            detail: !isLineEnabled
              ? `ปิดการส่งแจ้งเตือนผ่าน LINE OA อยู่ (ใช้แจ้งเตือนในแอป & Web Push) · ตัดสาย ${lineSettings.lateCutoffTime} น.`
              : `ตัดสาย ${lineSettings.lateCutoffTime} น. · ตัดขาด ${lineSettings.absenceCutoffTime} น. · ผู้ปกครองเชื่อม LINE ${connectedCount}/${students.length} คน`,
            icon: BellRing,
            actionLabel: 'ตั้งค่า LINE & เวลา',
          },
          {
            id: 'school_general',
            category: 'โครงสร้างสถานศึกษา',
            title: 'ปีการศึกษา ภาคเรียน โลโก้ และข้อมูลหลัก',
            statusLabel: `ปี ${activeSchool.academicYear}/${activeSchool.currentSemester}`,
            ready: Boolean(activeSchool.academicYear && activeSchool.currentSemester),
            detail: `ระบบเกรด: ${activeSchool.gradingSystem === 'international' ? 'International (A-F)' : 'สพฐ. ไทย (4.00)'} · สำรองข้อมูล JSON ได้ทันที`,
            icon: Building2,
            actionLabel: 'แก้ข้อมูลโรงเรียน',
          },
          {
            id: 'student_accounts',
            category: 'บัญชีผู้ใช้งาน',
            title: 'อนุมัติบัญชี & ลิงก์ล็อกอินโรงเรียน',
            statusLabel: `รหัส/ล็อกอิน: ${activeSchool.studentLoginIdentifierType === 'student_id_only' ? 'รหัสนักเรียน' : activeSchool.studentLoginIdentifierType === 'email_only' ? 'อีเมล' : 'ทั้งคู่'}`,
            ready: true,
            detail: `นักเรียนในระบบ ${students.length} คน · สร้างบัญชีเป็นชุด ออกรหัสชั่วคราว และตั้งค่าลิงก์ล็อกอินโรงเรียน`,
            icon: KeyRound,
            actionLabel: 'จัดการบัญชีนักเรียน',
          },
          {
            id: 'saas_audit',
            category: 'AI & ตรวจสอบย้อนหลัง',
            title: 'แพ็กเกจระบบ สิทธิ์ AI & Audit Log',
            statusLabel: localFlags.allowStudentsAi === false ? 'AI นักเรียน: ปิด' : 'AI นักเรียน: เปิด',
            ready: true,
            detail: `บันทึก Audit Log ที่จัดเก็บ ${getAuditLogs(activeSchool.id).length} รายการ · ตรวจสอบการแก้เกรด สลิป และตั้งค่า`,
            icon: Sliders,
            actionLabel: 'เปิด AI & Audit Log',
          },
        ];

        const quickLiveToggles: Array<{
          id: string;
          label: string;
          desc: string;
          enabled: boolean;
          onToggle: () => void;
        }> = [
          {
            id: 'student_self_checkin',
            label: 'เช็คชื่อด้วยมือถือ & GPS สำหรับนักเรียน',
            desc: 'ให้นักเรียนสแกน QR / เซลฟี่เช็คอินในรัศมี GPS ที่โรงเรียนกำหนด',
            enabled: policyById.get('student_self_checkin')?.enabled !== false,
            onToggle: () => handleQuickPolicyToggle('student_self_checkin', 'เช็คชื่อด้วยมือถือ & GPS สำหรับนักเรียน'),
          },
          {
            id: 'student_view_grades',
            label: 'ให้นักเรียนดูเกรดและ ปพ. ออนไลน์',
            desc: 'เปิดสิทธิ์ดูผลคะแนน GPAX และรายงานผลการเรียนด้วยตนเอง',
            enabled: policyById.get('student_view_grades')?.enabled !== false,
            onToggle: () => handleQuickPolicyToggle('student_view_grades', 'ให้นักเรียนดูเกรดและ ปพ. ออนไลน์'),
          },
          {
            id: 'teacher_view_financials',
            label: 'ให้ครูเห็นสถานะการเงิน/ค่าเทอม',
            desc: 'แสดงสถานะใบแจ้งหนี้และการชำระเงินให้ครูที่ปรึกษาช่วยติดตาม',
            enabled: policyById.get('teacher_view_financials')?.enabled !== false,
            onToggle: () => handleQuickPolicyToggle('teacher_view_financials', 'ให้ครูเห็นสถานะการเงิน/ค่าเทอม'),
          },
          {
            id: 'allowStudentsAi',
            label: 'เปิดใช้งานผู้ช่วย AI สำหรับนักเรียน',
            desc: 'ควบคุมการเข้าถึง AI Diagnostic, Socratic Tutor และ Career Quest AI',
            enabled: localFlags.allowStudentsAi !== false,
            onToggle: handleQuickStudentAiToggle,
          },
          {
            id: 'line_oa_master',
            label: 'เปิดใช้งานระบบแจ้งเตือนผ่าน LINE OA',
            desc: 'เปิดหรือปิดฟังก์ชันแจ้งเตือนและผูกบัญชี LINE OA ทั้งโรงเรียน (หากปิดจะใช้ระบบแจ้งเตือนในแอป / Web Push แทน)',
            enabled: isLineEnabled,
            onToggle: () => handleToggleLineMaster(),
          },
          {
            id: 'auto_delete_selfies',
            label: `ลบรูปเซลฟี่เช็คชื่ออัตโนมัติ (หลังเช็คเอาท์ ${selfieRetentionMinutes} นาที)`,
            desc: 'ลบรูปเซลฟี่ทั้งขาเข้าและขาออกเมื่อเลยเวลาเช็คเอาท์และเคลียร์รูปค้างวันก่อน เพื่อประหยัดพื้นที่ Storage โดยคงเวลาเข้า-ออกไว้ครบถ้วน',
            enabled: isAutoDeleteSelfiesEnabled,
            onToggle: () => handleToggleAutoDeleteSelfies(),
          },
        ];

        return (
          <div key={`control-${policyTick}`} className="space-y-4 animate-in fade-in duration-150">
            {quickSwitchMessage && (
              <div
                role="status"
                className="px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{quickSwitchMessage}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setQuickSwitchMessage(null)}
                  className="text-xs font-bold px-1.5 py-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 6-Pillar System Readiness Matrix */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                    สถานะการทำงานและควบคุมระบบโรงเรียน (6 ด้านหลัก)
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    กดเลือกหัวข้อเพื่อเข้าปรับตั้งค่าเชิงลึกได้ทันที
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">
                  พร้อมใช้งาน {controlPillars.filter((c) => c.ready).length}/{controlPillars.length} ด้าน
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-[var(--color-border)]">
                {controlPillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.id}
                      className="bg-[var(--color-card)] p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5 min-w-0 truncate">
                            <Icon className="w-3.5 h-3.5 text-[var(--tone)] shrink-0" />
                            <span className="truncate">{pillar.category}</span>
                          </span>
                          <span
                            className={`font-bold tabular-nums shrink-0 ${
                              pillar.ready
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {pillar.statusLabel}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                          {pillar.title}
                        </h3>
                        <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                          {pillar.detail}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveTab(pillar.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                        >
                          <span>{pillar.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Operational Switches + Dual-Privilege Admin Teachers */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
              {/* Left 7 cols: Instant System Switches */}
              <div className="xl:col-span-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--tone)] shrink-0" />
                      <span>สวิตช์ควบคุมระบบด่วน (มีผลบังคับใช้ทันที)</span>
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      เปิด/ปิดสิทธิ์สำคัญและบันทึกเข้า Audit Log อัตโนมัติ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('school_permissions')}
                    className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                  >
                    สิทธิ์ทั้งหมด →
                  </button>
                </div>

                <div className="divide-y divide-[var(--color-border)] flex-1">
                  {quickLiveToggles.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--color-text-title)]">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.enabled}
                        onClick={item.onToggle}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                          item.enabled ? 'bg-[var(--color-primary)]' : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                            item.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 cols: Admin-Authorized Teachers Roster */}
              <div className="xl:col-span-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--tone)] shrink-0" />
                      <span>ครูที่ได้รับสิทธิ์ Admin ({adminTeachers.length})</span>
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      สามารถสลับใช้งานทั้งโหมดครูและโหมด Admin ได้
                    </p>
                  </div>
                  {onNavigateModule && (
                    <button
                      type="button"
                      onClick={() => onNavigateModule('teachers')}
                      className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                    >
                      จัดการสิทธิ์ครู →
                    </button>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  {adminTeachers.length === 0 ? (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        ยังไม่มีรายชื่อครูที่เปิดสิทธิ์เป็นผู้ดูแลโรงเรียน (isSchoolAdmin)
                      </p>
                      {onNavigateModule && (
                        <button
                          type="button"
                          onClick={() => onNavigateModule('teachers')}
                          className="btn-tool-neutral px-3 py-1.5 mx-auto"
                        >
                          ไปที่ทะเบียนบุคลากรและครู
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-border)]">
                      {adminTeachers.slice(0, 5).map((t) => (
                        <div key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--color-text-title)] truncate">
                              {t.fullNameTh || t.fullNameEn}
                            </div>
                            <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                              {t.positionTitle || t.department || 'ครูผู้สอน'} · {t.email || t.teacherIdNumber}
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                            สลับโหมดได้
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent System Audit Trail */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--tone)] shrink-0" />
                  <span>กิจกรรมควบคุมระบบล่าสุด (Audit Trail)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('saas_audit')}
                  className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                >
                  ดูทั้งหมด →
                </button>
              </div>
              {recentLogs.length === 0 ? (
                <p className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                  ยังไม่มีบันทึกการเปลี่ยนแปลงระบบในเครื่องนี้ (เมื่อปรับสิทธิ์ เปลี่ยนภาคเรียน หรืออนุมัติสลิป ระบบจะบันทึกที่นี่)
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-comfortable w-full text-left text-xs">
                    <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                      <tr>
                        <th className="py-2 px-4">เวลา</th>
                        <th className="py-2 px-4">ผู้ดำเนินการ</th>
                        <th className="py-2 px-4">รายการ</th>
                        <th className="py-2 px-4">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[var(--color-card-subtle)]">
                          <td className="py-2 px-4 font-mono text-[11px] text-[var(--color-text-muted)] whitespace-nowrap tabular-nums">
                            {new Date(log.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="py-2 px-4 font-semibold text-[var(--color-text-title)] whitespace-nowrap">
                            {log.actorName} · {log.actorRole}
                          </td>
                          <td className="py-2 px-4 font-medium text-[var(--color-text-title)]">
                            {log.targetLabel}
                          </td>
                          <td className="py-2 px-4 text-[var(--color-text-body)]">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 1: LINE Notification Events & Rules */}
      {activeTab === 'line_events' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Master LINE On/Off Switch Card */}
          <div className={`rounded-2xl p-5 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
            isLineEnabled
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
          }`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isLineEnabled
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'
              }`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                    เปิด-ปิดระบบแจ้งเตือนผ่าน LINE OA (ทั้งโรงเรียน)
                  </h3>
                  <StatusIndicator
                    size="xs"
                    tone={isLineEnabled ? 'success' : 'neutral'}
                    label={isLineEnabled ? 'เปิดใช้งานอยู่ (ON)' : 'ปิดใช้งานอยู่ (OFF)'}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                  {isLineEnabled
                    ? 'เปิดให้ส่งประกาศ แจ้งเตือน และปุ่มผูกบัญชี LINE OA ของผู้ปกครองและนักเรียน (สามารถปิดได้ทันทีหากโรงเรียนใช้แจ้งเตือนในแอป / Web Push เป็นหลัก)'
                    : 'ปิดการใช้งาน LINE ทั้งระบบแล้ว — ปุ่มส่ง LINE, บรอดแคสต์ LINE และปุ่มเชื่อม LINE OA จะถูกซ่อนไว้ โดยระบบแจ้งเตือนในแอปและ Web Push ยังทำงานปกติ'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <span className="text-xs font-bold text-[var(--color-text-title)]">
                {isLineEnabled ? 'เปิด' : 'ปิด'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isLineEnabled}
                aria-label="เปิดหรือปิดระบบแจ้งเตือนผ่าน LINE OA ทั้งโรงเรียน"
                onClick={() => handleToggleLineMaster()}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  isLineEnabled ? 'bg-emerald-700' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition duration-200 ${
                    isLineEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {quickSwitchMessage && (
            <div role="status" className="px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{quickSwitchMessage}</span>
              </span>
              <button type="button" onClick={() => setQuickSwitchMessage(null)} className="text-xs font-bold px-1.5 py-0.5 cursor-pointer">✕</button>
            </div>
          )}

          {/* Rules & Cutoff Timers Card */}
          <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[var(--color-text-title)]">
              <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              <h3 className="font-bold text-sm">การตั้งค่าเวลาและเกณฑ์การแจ้งเตือนอัตโนมัติ (Cutoff Times & Rules)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เวลาเริ่มกิจกรรมหน้าเสาธง</label>
                <input
                  type="time"
                  value={lineSettings.schoolStartTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, schoolStartTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เวลาตัดสาย (Late Cutoff)</label>
                <input
                  type="time"
                  value={lineSettings.lateCutoffTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, lateCutoffTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-amber-800 dark:text-amber-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เวลาตัดขาดเรียน (Absence Cutoff)</label>
                <input
                  type="time"
                  value={lineSettings.absenceCutoffTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, absenceCutoffTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-rose-800 dark:text-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เกณฑ์เตือนตัดคะแนนพฤติกรรม</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={lineSettings.behaviorAlertThreshold}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, behaviorAlertThreshold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                  />
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">คะแนนขึ้นไป</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Categories Accordion / Cards */}
          <div className={`space-y-4 transition-opacity ${isLineEnabled ? '' : 'opacity-60'}`}>
            {eventCategories.slice(eventCategoryPage, eventCategoryPage + 1).map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
                  <div className="p-4 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg border ${cat.badgeColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-[var(--color-text-title)]">{cat.titleTh}</h4>
                        <p className="text-[11px] text-[var(--color-text-muted)]">{cat.descriptionTh}</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--color-border)]">
                    {cat.events.map((evt) => {
                      const isEnabled = Boolean(lineSettings[evt.key]);
                      return (
                        <div key={evt.key} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--color-card-subtle)] transition">
                          <div className="space-y-0.5 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[var(--color-text-title)]">{evt.titleTh}</span>
                              {isEnabled ? (
                                <StatusIndicator tone="success" size="xs" label="เปิดใช้งาน (Active)" />
                              ) : (
                                <StatusIndicator tone="neutral" size="xs" label="ปิดการส่ง (Disabled)" />
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{evt.descTh}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleEvent(evt.key)}
                            className={`shrink-0 transition-transform active:scale-95 cursor-pointer ${
                              isEnabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                            }`}
                            title={isEnabled ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}
                          >
                            {isEnabled ? (
                              <ToggleRight className="w-9 h-9" />
                            ) : (
                              <ToggleLeft className="w-9 h-9" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {eventCategories.length > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-body)]">
                      <button type="button" onClick={() => setEventCategoryPage(page => Math.max(0, page - 1))} disabled={eventCategoryPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">หมวดก่อนหน้า</button>
                      <span>{eventCategoryPage + 1} / {eventCategories.length}</span>
                      <button type="button" onClick={() => setEventCategoryPage(page => Math.min(eventCategories.length - 1, page + 1))} disabled={eventCategoryPage === eventCategories.length - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">หมวดถัดไป</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {saveError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าเหตุการณ์แจ้งเตือน</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Live Smartphone Chat & Flex Message Simulator */}
      {activeTab === 'preview_simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Sample Selector & Trigger Simulation */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[var(--color-text-title)]">
                <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <h3 className="font-bold text-sm">เลือกรูปแบบการ์ดจำลอง (Select Sample Message)</h3>
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: 'checkin' as const,
                    title: '1. บัตรแจ้งสแกนเข้าเรียน (Check-in)',
                    desc: 'แสดงชื่อ เวลา และสถานะมาตรงเวลา/สาย',
                    badge: 'ยอดนิยม',
                  },
                  {
                    id: 'infirmary' as const,
                    title: '2. บัตรแจ้งเตือนห้องพยาบาล (Infirmary Visit)',
                    desc: 'แจ้งอาการ อุณหภูมิ และยาที่ได้รับ',
                    badge: 'เร่งด่วน',
                  },
                  {
                    id: 'billing' as const,
                    title: '3. บัตรแจ้งหนี้ค่าเทอมพร้อม PromptPay',
                    desc: 'ยอดชำระ และ QR PromptPay จ่ายในแอป',
                    badge: 'การเงิน',
                  },
                  {
                    id: 'grades' as const,
                    title: '4. บัตรสรุปผลการเรียน ปพ.1 (GPA Release)',
                    desc: 'ผลการเรียนเฉลี่ยและเกรดแต่ละวิชา',
                    badge: 'วิชาการ',
                  },
                  {
                    id: 'homework' as const,
                    title: '5. บัตรแจ้งเตือนการบ้านใหม่ (Assignment)',
                    desc: 'วิชา คำสั่ง และกำหนดส่ง',
                    badge: 'การบ้าน',
                  },
                ].map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setPreviewSampleType(sample.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      previewSampleType === sample.id
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${previewSampleType === sample.id ? 'text-emerald-950 dark:text-emerald-100' : 'text-[var(--color-text-title)]'}`}>
                        {sample.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-card)] text-[var(--color-text-body)] font-semibold border border-[var(--color-border)]">
                        {sample.badge}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${previewSampleType === sample.id ? 'text-emerald-900 dark:text-emerald-200' : 'text-[var(--color-text-muted)]'}`}>{sample.desc}</p>
                  </button>
                ))}
              </div>

              {/* Action: Simulate Send */}
              <div className="pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleSimulateSend}
                  disabled={simulatedSendState === 'sending'}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  {simulatedSendState === 'sending' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งข้อความจำลองไปยัง LINE Webhook...</span>
                    </>
                  ) : simulatedSendState === 'sent' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>ส่งข้อความจำลองสำเร็จ! (จำลองแสดงผลในหน้าจอขวา)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>🚀 ทดสอบส่งข้อความจำลอง (Simulate Live Send)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Customization Details */}
            <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-[var(--color-text-title)]">ปรับแต่งสีและข้อความท้ายบัตร (Custom Styling)</h4>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">สีแถบหัวการ์ด (Header Accent Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lineSettings.customHeaderColor}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, customHeaderColor: e.target.value }))}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--color-border)]"
                  />
                  <input
                    type="text"
                    value={lineSettings.customHeaderColor}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, customHeaderColor: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">ข้อความท้ายบัตร (Footer Disclaimer)</label>
                <textarea
                  rows={2}
                  value={lineSettings.customFooterNote}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, customFooterNote: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Realistic LINE Mobile Phone Frame Simulator */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[360px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700/80">
              {/* Phone Speaker Notch */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-600 rounded-full" />
              </div>

              {/* Phone Screen Container */}
              <div className="bg-[#78909C] rounded-[28px] overflow-hidden flex flex-col h-[580px] shadow-inner relative">
                {/* LINE Header Bar */}
                <div className="bg-emerald-700 text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black text-xs shadow-xs">
                      EV
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate max-w-[170px] leading-tight text-white">
                        {lineSettings.lineOaName}
                      </div>
                      <div className="text-[9px] text-emerald-100 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        <span>Official Account • Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white">10:45</div>
                </div>

                {/* Chat Scroll Area */}
                <div className="flex-1 p-3 overflow-hidden space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] bg-black/20 text-white px-2.5 py-0.5 rounded-full">
                      วันนี้ • Today
                    </span>
                  </div>

                  {/* LINE Flex Message Card */}
                  <div className="bg-white rounded-2xl shadow-md overflow-hidden text-slate-900 text-xs border border-slate-200 animate-in zoom-in-95 duration-200">
                    {/* Header Accent */}
                    <div 
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: lineSettings.customHeaderColor === '#00B900' ? '#047857' : (lineSettings.customHeaderColor || '#047857') }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-extrabold text-[11px] truncate">
                          {activeSchool.nameTh}
                        </span>
                      </div>
                      <span className="text-[9px] bg-black/35 px-1.5 py-0.5 rounded text-white font-mono">
                        SIS LIVE
                      </span>
                    </div>

                    {/* Card Content based on Preview Type */}
                    {previewSampleType === 'checkin' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">แจ้งเตือนเข้าเรียน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            ✓ ตรงเวลา
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          นายธนาธร สมชาย (น้องกอล์ฟ)
                        </div>

                        <div className="bg-slate-100 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">รหัสนักเรียน:</span>
                            <span className="font-semibold text-slate-900">STU-2026-0842</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ระดับชั้น:</span>
                            <span className="font-semibold text-slate-900">มัธยมศึกษาปีที่ 4/1</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">เวลาที่สแกน:</span>
                            <span className="font-semibold text-emerald-800">07:42:15 น.</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ช่องทาง:</span>
                            <span className="font-semibold text-slate-900">Gate Turnstile 1 (หน้าโรงเรียน)</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-800 cursor-pointer"
                        >
                          ดูสถิติการมาเรียนเดือนนี้
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'infirmary' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">ห้องพยาบาลแจ้งเตือน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
                            ปฐมพยาบาลแล้ว
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          น.ส.วิภาดา รัตนโชติ (น้องฟ้า)
                        </div>

                        <div className="bg-rose-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">อาการที่พบ:</span>
                            <span className="font-bold text-rose-800">ปวดศีรษะ เป็นไข้ (38.1°C)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">การดูแล:</span>
                            <span className="font-semibold text-slate-900">พักผ่อนเตียง 2 + พาราเซตามอล 1 เม็ด</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ครูพยาบาล:</span>
                            <span className="font-semibold text-slate-900">อ.สุดารัตน์ พยาบาลวิชาชีพ</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-rose-700 text-white text-[11px] font-bold shadow-xs hover:bg-rose-800 cursor-pointer"
                        >
                          โทรติดต่อห้องพยาบาลทันที
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'billing' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">ใบแจ้งหนี้ค่าเทอม</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-300">
                            รอชำระ
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          ภาคเรียนที่ 1/2569 • นายธนาธร สมชาย
                        </div>

                        <div className="bg-purple-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">ยอดที่ต้องชำระ:</span>
                            <span className="font-extrabold text-purple-900 text-xs">฿14,500.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">กำหนดชำระ:</span>
                            <span className="font-semibold text-slate-900">30 พ.ย. 2569</span>
                          </div>
                        </div>

                        {/* PromptPay QR Preview inside Card */}
                        <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=PROMPTPAY-0842-14500" 
                            alt="PromptPay QR" 
                            className="w-24 h-24 object-contain"
                          />
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-purple-700 text-white text-[11px] font-bold shadow-xs hover:bg-purple-800 cursor-pointer"
                        >
                          บันทึกภาพ QR เพื่อจ่ายในแอปธนาคาร
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'grades' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">ประกาศผลการเรียน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300">
                            GPA 3.92
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          ปพ.1 ดิจิทัล • นายธนาธร สมชาย
                        </div>

                        <div className="bg-blue-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">วิทยาการคำนวณ AI:</span>
                            <span className="font-bold text-blue-800">เกรด 4.00 (A)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">คณิตศาสตร์ขั้นสูง:</span>
                            <span className="font-bold text-blue-800">เกรด 4.00 (A)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ภาษาอังกฤษวิชาการ:</span>
                            <span className="font-bold text-blue-800">เกรด 3.50 (B+)</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-blue-700 text-white text-[11px] font-bold shadow-xs hover:bg-blue-800 cursor-pointer"
                        >
                          เปิดดูเล่มผลการเรียน ปพ.1 ฉบับเต็ม
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'homework' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">มอบหมายการบ้านใหม่</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                            ส่งใน 3 วัน
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          วิชาวิทยาการคำนวณ (CS301)
                        </div>

                        <div className="bg-amber-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">หัวข้อ:</span>
                            <span className="font-bold text-slate-900">โครงงาน Mini AI Image Classifier</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">กำหนดส่ง:</span>
                            <span className="font-semibold text-rose-800">8 พ.ย. 2569 (23:59 น.)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">คะแนนเต็ม:</span>
                            <span className="font-semibold text-slate-900">20 คะแนน</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold shadow-xs hover:bg-amber-800 cursor-pointer"
                        >
                          ส่งการบ้านในระบบ LMS
                        </button>
                      </div>
                    )}

                    {/* Disclaimer Footer */}
                    <div className="px-3 pb-2.5 pt-1 text-[9px] text-slate-700 text-center border-t border-slate-200">
                      {lineSettings.customFooterNote}
                    </div>
                  </div>
                </div>

                {/* LINE Chat Input Simulation */}
                <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between text-slate-700 text-xs">
                  <span>พิมพ์ข้อความถึงห้องธุรการ...</span>
                  <Send className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LINE API Connection & Webhook Configuration */}
      {activeTab === 'line_connection' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: API Keys Form */}
            <div className="lg:col-span-8 bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-5">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center font-bold text-xs">
                    API
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--color-text-title)]">LINE Developers Console Credentials</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">ข้อมูลจาก https://developers.line.biz ในส่วน Messaging API Channel</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator
                    size="xs"
                    tone={isLineEnabled ? 'success' : 'neutral'}
                    label={isLineEnabled ? 'เปิดใช้งาน LINE' : 'ปิดใช้งาน LINE อยู่'}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isLineEnabled}
                    aria-label="เปิดหรือปิดใช้งาน LINE OA"
                    onClick={() => handleToggleLineMaster()}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      isLineEnabled ? 'bg-emerald-700' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                        isLineEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">LINE Official Account ID</label>
                    <input
                      type="text"
                      value={lineSettings.lineOaId}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, lineOaId: e.target.value }))}
                      placeholder="@eduverse_official"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">ชื่อที่แสดงของบัญชี (LINE OA Name)</label>
                    <input
                      type="text"
                      value={lineSettings.lineOaName}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, lineOaName: e.target.value }))}
                      placeholder="EduVerse School Connect OA"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">Channel ID</label>
                    <input
                      type="text"
                      value={lineSettings.channelId}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, channelId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">Channel Secret</label>
                    <input
                      type="password"
                      value={lineSettings.channelSecret}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, channelSecret: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">Channel Access Token (Long-Lived 24/7)</label>
                  <textarea
                    rows={2}
                    value={lineSettings.channelAccessToken}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, channelAccessToken: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-[11px]"
                  />
                </div>

                {/* Webhook Endpoint with Copy Button */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">Webhook URL (นำไปใส่ใน LINE Developers Console &gt; Messaging API)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lineSettings.webhookUrl}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono text-[var(--color-text-title)] select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(lineSettings.webhookUrl, 'webhook')}
                      className="px-3.5 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-body)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'webhook' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                          <span className="text-emerald-800 dark:text-emerald-200">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">LIFF ID (LINE Front-end Framework สำหรับบัตรดิจิทัล)</label>
                  <input
                    type="text"
                    value={lineSettings.liffId}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, liffId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">ข้อความทักทายอัตโนมัติเมื่อกดเพิ่มเพื่อน (Greeting Message)</label>
                  <textarea
                    rows={2}
                    value={lineSettings.autoReplyGreeting}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, autoReplyGreeting: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Right: QR Code & Add Friend Guide */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs text-center space-y-3">
                <h4 className="font-bold text-xs text-[var(--color-text-title)]">QR Code เพิ่มเพื่อน LINE OA โรงเรียน</h4>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
                  <img
                    src={lineSettings.qrCodeImageUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/R/ti/p/@eduverse_official'}
                    alt="LINE OA QR"
                    className="w-36 h-36 object-contain mx-auto"
                  />
                </div>
                <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {lineSettings.lineOaId}
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(lineSettings.addFriendUrl, 'addFriend')}
                    className="w-full py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedField === 'addFriend' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                        <span>คัดลอกลิงก์เรียบร้อย</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกลิงก์ Add Friend</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Developer Checklist */}
              <div className="bg-[var(--color-card-subtle)] rounded-2xl p-4 border border-[var(--color-border)] text-xs space-y-2">
                <span className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                  ข้อกำหนดในการเปิดใช้งานจริง:
                </span>
                <ul className="text-[11px] text-[var(--color-text-muted)] space-y-1 list-disc pl-4">
                  <li>เปิด <strong>Use webhook</strong> ใน LINE Developers เป็น Enabled</li>
                  <li>ปิด <strong>Auto-reply messages</strong> ใน LINE Official Account Manager เพื่อให้บอท Flex Message ทำงานได้สมบูรณ์</li>
                  <li>ตั้งค่า Webhook redelivery หากต้องการความแม่นยำสูง</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าการเชื่อมต่อ</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Subscribers & Connection Roster */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                สถานะการผูก LINE ของนักเรียนและผู้ปกครอง ({connectedCount}/{students.length} คน)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                รายชื่อนักเรียนที่มีการจับคู่บัญชี LINE Official Account เพื่อรับการแจ้งเตือนแบบตัวต่อตัว (1-on-1 Flex Message)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusIndicator tone="success" label={`ผูกแล้ว ${connectedPct}%`} />
            </div>
          </div>

          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-comfortable w-full text-left text-xs">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-body)] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">รหัสนักเรียน</th>
                    <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                    <th className="px-4 py-3">ระดับชั้น</th>
                    <th className="px-4 py-3">ผู้ปกครอง & เบอร์โทร</th>
                    <th className="px-4 py-3">สถานะ LINE</th>
                    <th className="px-4 py-3">LINE User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {students.slice(subscriberPage * 6, (subscriberPage + 1) * 6).map((stu) => (
                    <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-title)]">
                        {stu.studentIdNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={stu.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)]"
                          />
                          <span className="font-bold text-[var(--color-text-title)]">
                            {stu.firstNameTh} {stu.lastNameTh}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-body)]">
                        {stu.gradeLevel} {stu.room}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-body)]">
                        <div>{stu.guardianName} ({stu.guardianRelation})</div>
                        <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{stu.guardianPhone}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {stu.lineLinked ? (
                          <StatusIndicator tone="success" size="xs" label="ผูก LINE แล้ว" />
                        ) : (
                          <StatusIndicator tone="neutral" size="xs" label="ยังไม่ผูก" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-text-muted)]">
                        {stu.lineUserId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length > 6 && (
              <div className="flex items-center justify-between p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-body)]">
                <button type="button" onClick={() => setSubscriberPage(page => Math.max(0, page - 1))} disabled={subscriberPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span>หน้า {subscriberPage + 1} / {Math.ceil(students.length / 6)} · {students.length} คน</span>
                <button type="button" onClick={() => setSubscriberPage(page => Math.min(Math.ceil(students.length / 6) - 1, page + 1))} disabled={subscriberPage >= Math.ceil(students.length / 6) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: General School Config & Database Backup */}
      {activeTab === 'school_general' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {['admin', 'super_admin'].includes(currentRole) && (
            <section className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] overflow-hidden flex items-center justify-center shrink-0">
                  {activeSchool.logoUrl ? (
                    <img src={activeSchool.logoUrl} alt={`โลโก้${activeSchool.nameTh}`} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">โลโก้โรงเรียน</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">ไฟล์ PNG, JPEG หรือ WebP ขนาดไม่เกิน 2 MB โลโก้จะแสดงบนแถบเมนูของโรงเรียน</p>
                  {schoolLogoError && <p role="alert" className="text-xs text-rose-600">{schoolLogoError}</p>}
                  {schoolLogoSuccess && <p role="status" className="text-xs text-emerald-700">{schoolLogoSuccess}</p>}
                </div>
                <input
                  ref={schoolLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSchoolLogoUpload}
                />
                <button
                  type="button"
                  disabled={schoolLogoUploading}
                  onClick={() => schoolLogoInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  {schoolLogoUploading ? 'กำลังอัปโหลด...' : activeSchool.logoUrl ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
                </button>
              </div>
            </section>
          )}

          <AcademicTermRolloverPanel
            activeSchool={activeSchool}
            systemConfig={systemConfig}
            currentRole={currentRole}
            actorName={currentUser?.fullNameTh || currentUser?.fullNameEn || currentUser?.email || 'ผู้ดูแลระบบ'}
            students={students}
            courses={courses}
            grades={grades}
            attendance={attendance}
            timetableSlots={timetableSlots}
            onApplyRollover={async (payload) => {
              if (onApplyAcademicRollover) {
                await onApplyAcademicRollover(payload);
              } else {
                await onUpdateSchool?.({
                  academicYear: payload.academicYear,
                  currentSemester: payload.currentSemester,
                });
              }
            }}
            onCopyCoursesFromArchive={onCopyCoursesToSchool}
          />

          <div className="bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <Building2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-title)]">ข้อมูลปีการศึกษา & อีเมลแจ้งเตือนสำรอง</h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">กำหนดค่าระบบภาพรวมของสถานศึกษา</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">ปีการศึกษาปัจจุบัน (Academic Year)</label>
                <input
                  type="text"
                  value={generalConfig.academicYear}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, academicYear: e.target.value }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">ภาคเรียนปัจจุบัน (Current Semester)</label>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {generalConfig.semesterOptions.map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      disabled={!['admin', 'super_admin'].includes(currentRole)}
                      onClick={() => setGeneralConfig(prev => ({ ...prev, currentSemester: sem }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                        generalConfig.currentSemester === sem
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      ภาคเรียนที่ {sem}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={generalConfig.currentSemester}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, currentSemester: e.target.value }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">รูปแบบเกรด</label>
                <select
                  value={generalConfig.gradingSystem}
                  onChange={(e) => setGeneralConfig((prev) => ({
                    ...prev,
                    gradingSystem: e.target.value as SystemConfig['gradingSystem'],
                  }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                >
                  <option value="thai">ไทย: 0–4 (8 ระดับ)</option>
                  <option value="international">สากล: A–F (4.0)</option>
                </select>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  ไทย: 4 ที่ 80%, 3.5 ที่ 75% ... 0 ต่ำกว่า 50% · สากล: A ที่ 90%, B ที่ 80%, C ที่ 70%, D ที่ 60%
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">รายการภาคเรียนที่ใช้ได้</label>
                <textarea
                  rows={4}
                  value={generalConfig.semesterOptions.join('\n')}
                  onChange={(e) => setGeneralConfig((prev) => ({
                    ...prev,
                    semesterOptions: e.target.value.split('\n'),
                  }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  placeholder={'1\n2\nSummer'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
                <p className="text-[10px] text-[var(--color-text-muted)]">ใส่หนึ่งรายการต่อบรรทัด ชื่อที่กำหนดจะแสดงในฟอร์มรายวิชาและหัวตาราง</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">ตำแหน่งบุคลากรที่เลือกได้</label>
                <textarea
                  rows={5}
                  value={generalConfig.staffPositionOptions.join('\n')}
                  onChange={(e) => setGeneralConfig((prev) => ({
                    ...prev,
                    staffPositionOptions: e.target.value.split('\n'),
                  }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  placeholder={DEFAULT_STAFF_POSITION_OPTIONS.join('\n')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
                <p className="text-[10px] text-[var(--color-text-muted)]">ใส่หนึ่งตำแหน่งต่อบรรทัด รวมตำแหน่งที่โรงเรียนเพิ่มเอง</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-text-body)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>อีเมล Master ระบบ (Master Authority Email)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setGeneralConfig(prev => ({ ...prev, masterEmail: 'baanpakkru@gmail.com' }))}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    ตั้งเป็น baanpakkru@gmail.com
                  </button>
                </div>
                <input
                  type="email"
                  value={generalConfig.masterEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, masterEmail: e.target.value }))}
                  placeholder="baanpakkru@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[10px] text-[var(--color-text-muted)] block">
                  อีเมลหลักสำหรับรับคำขอรีเซ็ตรหัสผ่าน, ยืนยันการลงทะเบียนโรงเรียน และแจ้งเตือนความปลอดภัยระบบ
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-text-body)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>อีเมลตอบกลับยืนยัน (Confirmation Reply-To)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setGeneralConfig(prev => ({ ...prev, replyToEmail: 'baanpakkru@gmail.com' }))}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                  >
                    ตั้งเป็น baanpakkru@gmail.com
                  </button>
                </div>
                <input
                  type="email"
                  value={generalConfig.replyToEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, replyToEmail: e.target.value }))}
                  placeholder="baanpakkru@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <span className="text-[10px] text-[var(--color-text-muted)] block">
                  กำหนดหัวอีเมล Reply-To เมื่อระบบส่งอีเมลยืนยันหรือแจ้งเตือนอัตโนมัติ
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">อีเมลแจ้งเตือนส่งออกจากระบบ (Resend Sender Email)</label>
                <input
                  type="email"
                  value={generalConfig.resendFromEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, resendFromEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {onOpenBackupCenter && (
                <button
                  type="button"
                  onClick={onOpenBackupCenter}
                  className="px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shrink-0"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>สำรองและกู้คืนไฟล์ในเครื่อง</span>
                </button>
              )}
            </div>

            {/* Master Authority Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-blue-950 dark:text-blue-100 flex items-center gap-2">
                    <span>Master Authority Email:</span>
                    <span className="font-mono bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-bold">
                      {generalConfig.masterEmail || 'baanpakkru@gmail.com'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1 leading-relaxed max-w-2xl">
                    อีเมลนี้ได้รับสิทธิ์สูงสุดในการเป็นตัวแทนระบบสำหรับ: ตอบกลับยืนยันการลงทะเบียนโรงเรียนใหม่, 
                    รับคำร้องขอเปลี่ยนรหัสผ่าน (Password Reset Authorization), แจ้งเตือนความปลอดภัยของระบบ Super Admin 
                    และการสื่อสารทางราชการ/ทะเบียน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(generalConfig.masterEmail || 'baanpakkru@gmail.com', 'masterEmail')}
                className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 flex items-center gap-1.5 self-center bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
              >
                {copiedField === 'masterEmail' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'masterEmail' ? 'คัดลอกอีเมล Master แล้ว' : 'คัดลอกอีเมล Master'}</span>
              </button>
            </div>

            {/* Backup Info */}
            <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                <div>
                  <div className="font-bold text-xs text-[var(--color-text-title)]">ไฟล์สำรองลงเครื่องแบบเข้ารหัส</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">ระบบไม่เก็บรหัสผ่านเข้ารหัส กรุณาจดจำไว้เพื่อกู้คืนไฟล์</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">
                ✓ AES-256-GCM
              </span>
            </div>

            {/* Automatic Attendance Selfie Storage Cleanup */}
            {['admin', 'super_admin'].includes(currentRole) && (
              <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-sky-700 dark:text-sky-300 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs text-[var(--color-text-title)]">
                        ลบรูปเซลฟี่เช็คชื่ออัตโนมัติ (ประหยัดพื้นที่ Storage)
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                        ลบรูปถ่ายเซลฟี่ทั้งขาเข้าและขาออกอัตโนมัติหลังเช็คเอาท์ตามเวลาที่กำหนด และเคลียร์รูปค้างจากวันก่อน (กรณีลืมเช็คเอาท์) โดยไม่ลบข้อมูลเวลา สถานะ หรือรายงานเช็คชื่อ
                      </p>
                      <div className="text-[11px] font-semibold text-[var(--color-text-body)] mt-1 tabular-nums">
                        รูปเซลฟี่ที่ยังค้างอยู่ในช่วงข้อมูลที่โหลด: {storedSelfieCount.toLocaleString('th-TH')} รูป
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAutoDeleteSelfiesEnabled}
                    onClick={() => handleToggleAutoDeleteSelfies()}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      isAutoDeleteSelfiesEnabled ? 'bg-[var(--color-primary)]' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                        isAutoDeleteSelfiesEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="selfie-retention-select" className="text-[11px] font-semibold text-[var(--color-text-body)]">
                      หน่วงเวลาลบหลังเช็คเอาท์:
                    </label>
                    <select
                      id="selfie-retention-select"
                      value={selfieRetentionMinutes}
                      onChange={(e) => handleChangeSelfieRetentionMinutes(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                    >
                      <option value={30}>30 นาทีหลังเช็คเอาท์</option>
                      <option value={60}>1 ชั่วโมงหลังเช็คเอาท์ (แนะนำ)</option>
                      <option value={120}>2 ชั่วโมงหลังเช็คเอาท์</option>
                      <option value={240}>4 ชั่วโมงหลังเช็คเอาท์</option>
                    </select>
                  </div>

                  {onCleanupDueSelfies && (
                    <button
                      type="button"
                      disabled={isCleaningSelfies}
                      onClick={() => void handleRunSelfieCleanupNow()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCleaningSelfies ? 'animate-spin' : ''}`} />
                      <span>{isCleaningSelfies ? 'กำลังตรวจสอบและลบรูป...' : 'ลบรูปที่ครบกำหนดตอนนี้'}</span>
                    </button>
                  )}
                </div>

                {selfieCleanupFeedback && (
                  <div
                    role={selfieCleanupFeedback.type === 'error' ? 'alert' : 'status'}
                    className={`px-3 py-2 rounded-lg text-[11px] font-semibold border ${
                      selfieCleanupFeedback.type === 'error'
                        ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                        : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    {selfieCleanupFeedback.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {['admin', 'super_admin'].includes(currentRole) && (
            <div className="bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[var(--color-primary-text)]" />
                  <div>
                    <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                      ตั้งค่ารายการตัวเลือกและพรีเซ็ตของโรงเรียน (Custom Presets)
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      ปรับแต่งระดับชั้น ห้องเรียน กลุ่มสาระ วิทยฐานะ เตียงห้องพยาบาล รายการยา และหมวดหมู่ต่างๆ ได้อิสระ (แยกตามโรงเรียน)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => resetCustomPresets()}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[11px] font-semibold cursor-pointer"
                >
                  คืนค่ามาตรฐาน
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                  <label className="flex items-start gap-2 font-semibold text-[var(--color-text-body)]">
                    <input
                      type="checkbox"
                      checked={activeSchool.showPrimaryCourseCredits ?? false}
                      onChange={(event) => void handlePrimaryCourseCreditSettingChange(event.target.checked)}
                      disabled={savingPrimaryCourseCreditSetting || !['admin', 'super_admin'].includes(currentRole)}
                      className="mt-0.5 accent-[var(--color-primary)]"
                    />
                    <span>แสดงหน่วยกิตของวิชาที่รหัสขึ้นต้นด้วย 1</span>
                  </label>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    ค่าเริ่มต้นซ่อนหน่วยกิตสำหรับวิชาประถม มีผลกับทุกหน้าที่แสดงรายวิชา
                  </p>
                  {savingPrimaryCourseCreditSetting && (
                    <p role="status" className="text-[10px] text-[var(--color-text-muted)]">กำลังบันทึกการตั้งค่า...</p>
                  )}
                  {primaryCourseCreditSettingError && (
                    <p role="alert" className="text-[10px] text-rose-700 dark:text-rose-300">{primaryCourseCreditSettingError}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text-body)]">ระดับชั้น (1 รายการ/บรรทัด)</label>
                  <textarea
                    rows={4}
                    value={customPresets.gradeLevels.join('\n')}
                    onChange={(e) => updateCustomPresets({ gradeLevels: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text-body)]">ห้องเรียน / ห้องประจำ (1 ห้อง/บรรทัด)</label>
                  <textarea
                    rows={4}
                    value={customPresets.roomOptions.join('\n')}
                    onChange={(e) => updateCustomPresets({ roomOptions: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    disabled={!['admin', 'super_admin'].includes(currentRole)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveRoomOptions()}
                    disabled={roomOptionsSaving || !['admin', 'super_admin'].includes(currentRole)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {roomOptionsSaving ? 'กำลังบันทึก...' : 'บันทึกรายการห้องเรียนลงฐานข้อมูล'}
                  </button>
                  {roomOptionsSaveError && (
                    <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-300">{roomOptionsSaveError}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text-body)]">กลุ่มสาระ / ฝ่ายงาน (1 ฝ่าย/บรรทัด)</label>
                  <textarea
                    rows={4}
                    value={customPresets.departments.join('\n')}
                    onChange={(e) => updateCustomPresets({ departments: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text-body)]">วิทยฐานะ / ระดับตำแหน่งบุคลากร</label>
                  <textarea
                    rows={4}
                    value={customPresets.academicStandings.join('\n')}
                    onChange={(e) => updateCustomPresets({ academicStandings: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text-body)]">เตียงห้องพยาบาล</label>
                  <textarea
                    rows={4}
                    value={customPresets.infirmaryBeds.join('\n')}
                    onChange={(e) => updateCustomPresets({ infirmaryBeds: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--color-text-body)]">รายการยาห้องพยาบาล</label>
                  <textarea
                    rows={4}
                    value={customPresets.infirmaryMedications.join('\n')}
                    onChange={(e) => updateCustomPresets({ infirmaryMedications: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>
            </div>
          )}

          {saveError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั่วไป</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: SCHOOL GPS & GEOFENCE */}
      {activeTab === 'school_gps' && (
        <div className="h-full">
          <SchoolGpsSettingsCard
            activeSchool={activeSchool}
            campusGates={campusGates}
            currentRole={currentRole}
            lang={lang}
            onUpdateCampusGates={onUpdateCampusGates || (() => {})}
            onSaveCampusGates={onSaveCampusGates}
            onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
          />
        </div>
      )}

      {activeTab === 'school_permissions' &&
        ['admin', 'super_admin'].includes(currentRole) && (
          <div className="animate-in fade-in duration-200">
            <SchoolPermissionSettingsView activeSchool={activeSchool} lang={lang} />
          </div>
        )}

      {activeTab === 'student_accounts' &&
        ['admin', 'super_admin'].includes(currentRole) && (() => {
          const studentIdPolicy = {
            ...normalizeSchoolStudentIdPolicy(activeSchool),
            defaultPasswordType: inlinePasswordType,
            shortIdPasswordPrefix: inlineShortIdPrefix.replace(/\s+/g, '').slice(0, 12),
          };
          const studentsViolatingSchoolRule = activeStudentsWithoutAccounts.filter(
            (student) => !validateStudentIdAgainstPolicy(student.studentIdNumber || '', studentIdPolicy).valid
          );
          const studentsWithShortIds = activeStudentsWithoutAccounts.filter((student) => {
            const idLen = (student.studentIdNumber || '').trim().length;
            return idLen > 0 && idLen < 6;
          });
          const studentsWithShortIdsWithoutPrefix =
            studentIdPolicy.defaultPasswordType === 'student_id' && !studentIdPolicy.shortIdPasswordPrefix
              ? studentsWithShortIds
              : [];

          const sampleShortStudent = studentsWithShortIds[0];
          const sampleShortId = (sampleShortStudent?.studentIdNumber || studentIdPolicy.example || '2804').trim();

          const initialPasswordDesc =
            studentIdPolicy.defaultPasswordType === 'birthdate'
              ? 'วันเดือนปีเกิด พ.ศ. 8 หลัก (ววดดปปปป)'
              : studentIdPolicy.shortIdPasswordPrefix
                ? `"${studentIdPolicy.shortIdPasswordPrefix}" + รหัสนักเรียน (เช่น ${studentIdPolicy.shortIdPasswordPrefix}${sampleShortId})`
                : 'รหัสนักเรียนตามทะเบียน';

          const isFilteredMissing =
            missingGradeFilter !== 'all' || missingRoomFilter !== 'all' || missingSearchQuery.trim() !== '';
          const selectedFilteredMissingCount = filteredMissingStudents.filter((s) =>
            selectedMissingStudentIds.has(s.id)
          ).length;
          const allFilteredMissingSelected =
            filteredMissingStudents.length > 0 && selectedFilteredMissingCount === filteredMissingStudents.length;

          return (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div data-guide-id="settings-student-accounts" className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    บัญชีเข้าสู่ระบบสำหรับนักเรียน (รหัสผ่านเริ่มต้น: {initialPasswordDesc})
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    สร้างบัญชีจากรายชื่อนักเรียนที่นำเข้าแล้ว แยกกรองตามห้องเรียนหรือเลือกรายบุคคลได้ โดยระบบกำหนดรหัสผ่านเริ่มต้นเป็น{' '}
                    <strong className="text-[var(--color-text-title)]">{initialPasswordDesc}</strong>{' '}
                    และเมื่อนักเรียนเข้าสู่ระบบครั้งแรก ระบบจะให้ตั้งรหัสผ่านใหม่ส่วนตัวอย่างน้อย 8 ตัวอักษร
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-[var(--color-primary-text)]">
                    เงื่อนไขรหัสนักเรียนของโรงเรียนนี้: {formatStudentIdPolicySummary(studentIdPolicy, lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('student_login_config')}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] transition cursor-pointer shrink-0"
                >
                  ตั้งค่าเงื่อนไขรหัสนักเรียน
                </button>
              </div>

              {studentsViolatingSchoolRule.length > 0 && (
                <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                  พบนักเรียน {studentsViolatingSchoolRule.length} คน ที่รหัสนักเรียนยังไม่ตรงตามเงื่อนไขโรงเรียน ({formatStudentIdPolicySummary(studentIdPolicy, lang)}) เช่น "{studentsViolatingSchoolRule[0]?.studentIdNumber || '(ว่าง)'}" — สามารถแก้ไขในทะเบียนนักเรียน หรือปรับเงื่อนไขโรงเรียนในปุ่ม "ตั้งค่าเงื่อนไขรหัสนักเรียน" ได้ทันที
                </p>
              )}

              {/* Inline Short-ID & Default Password Selector */}
              {(studentsWithShortIds.length > 0 || inlineShortIdPrefix || inlinePasswordType === 'birthdate') && (
                <div
                  className={`rounded-xl border p-3.5 text-xs space-y-2.5 ${
                    studentsWithShortIdsWithoutPrefix.length > 0
                      ? 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
                      : 'border-emerald-300 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold">
                        {studentsWithShortIdsWithoutPrefix.length > 0
                          ? `พบรหัสนักเรียน ${studentsWithShortIdsWithoutPrefix.length} คน ที่สั้นกว่า 6 ตัว (เช่น "${sampleShortId}") — ตั้งค่ารหัสผ่านเริ่มต้นได้ทันทีที่นี่:`
                          : `ตั้งค่ารหัสผ่านเริ่มต้นพร้อมใช้งาน (ตัวอย่างรหัส "${sampleShortId}" → รหัสผ่านเริ่มต้น "${buildInitialStudentPassword({
                              studentIdNumber: sampleShortId,
                              defaultPasswordType: inlinePasswordType,
                              shortIdPasswordPrefix: inlineShortIdPrefix,
                              dateOfBirth: sampleShortStudent?.dateOfBirth,
                            }) || 'ววดดปปปป'}")`}
                      </p>
                      <p className="text-[11px] opacity-90">
                        รหัสนักเรียนใช้เป็น <strong>ชื่อผู้ใช้ล็อกอินได้ตามปกติ</strong> แต่ระบบ Auth กำหนดรหัสผ่านขั้นต่ำ 6 ตัวอักษร หากเติมคำนำหน้าเช่น <code className="px-1 rounded bg-white/70 dark:bg-black/30 font-mono">00</code> นักเรียนจะใช้รหัสผ่านเริ่มต้นเป็น <code className="px-1 rounded bg-white/70 dark:bg-black/30 font-mono">00{sampleShortId}</code> (หรือใช้วันเดือนปีเกิด 8 หลัก)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      disabled={savingInlinePasswordConfig}
                      onClick={() => void handleSaveInlinePasswordPolicy('student_id', '00')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        inlinePasswordType === 'student_id' && inlineShortIdPrefix === '00'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-[var(--color-border)] text-[var(--color-text-title)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      ใช้คำนำหน้า "00" (เช่น 00{sampleShortId})
                    </button>

                    <button
                      type="button"
                      disabled={savingInlinePasswordConfig}
                      onClick={() => void handleSaveInlinePasswordPolicy('birthdate', inlineShortIdPrefix)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        inlinePasswordType === 'birthdate'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-[var(--color-border)] text-[var(--color-text-title)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      ใช้วันเดือนปีเกิด พ.ศ. 8 หลัก
                    </button>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={12}
                        value={inlineShortIdPrefix}
                        onChange={(e) => {
                          setInlinePasswordType('student_id');
                          setInlineShortIdPrefix(e.target.value.replace(/\s+/g, ''));
                        }}
                        placeholder="คำนำหน้าเอง เช่น 00 / std"
                        aria-label="คำนำหน้ารหัสผ่านเริ่มต้น"
                        className="w-36 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-white dark:bg-slate-900 text-[11px] font-mono text-[var(--color-text-title)]"
                      />
                      <button
                        type="button"
                        disabled={savingInlinePasswordConfig}
                        onClick={() => void handleSaveInlinePasswordPolicy('student_id', inlineShortIdPrefix)}
                        className="px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-[11px] font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        {savingInlinePasswordConfig ? 'กำลังบันทึก...' : 'บันทึกค่านี้'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {studentAccountError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {studentAccountError}
                </p>
              )}
              {studentAccountSuccess && (
                <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {studentAccountSuccess}
                </p>
              )}

              {/* Filters & Selection for Students Without Accounts */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-title)]">
                    <Filter className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>ตัวกรองและเลือกรายชื่อนักเรียนที่ยังไม่มีบัญชี (กำลังศึกษา {activeStudentsWithoutAccounts.length} คน)</span>
                  </div>
                  {isFilteredMissing && (
                    <button
                      type="button"
                      onClick={() => {
                        setMissingGradeFilter('all');
                        setMissingRoomFilter('all');
                        setMissingSearchQuery('');
                      }}
                      className="text-[11px] font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)]">
                    <span>ระดับชั้น</span>
                    <select
                      value={missingGradeFilter}
                      onChange={(e) => {
                        setMissingGradeFilter(e.target.value);
                        setMissingRoomFilter('all');
                      }}
                      disabled={studentAccountsLoading || studentAccountSaving}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกระดับชั้น ({activeStudentsWithoutAccounts.length})</option>
                      {missingGradeOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)]">
                    <span>ห้องเรียน</span>
                    <select
                      value={missingRoomFilter}
                      onChange={(e) => setMissingRoomFilter(e.target.value)}
                      disabled={studentAccountsLoading || studentAccountSaving}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกห้องเรียน</option>
                      {missingRoomOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)]">
                    <span>ค้นหารายคน (ชื่อ / รหัสนักเรียน)</span>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={missingSearchQuery}
                        onChange={(e) => setMissingSearchQuery(e.target.value)}
                        placeholder="พิมพ์ชื่อ นามสกุล หรือรหัส..."
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pl-8 pr-3 py-2 text-xs text-[var(--color-text-title)]"
                      />
                    </div>
                  </label>
                </div>

                {/* Selection toolbar + action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={filteredMissingStudents.length === 0 || studentAccountSaving}
                      onClick={() => {
                        setSelectedMissingStudentIds((prev) => {
                          const next = new Set(prev);
                          if (allFilteredMissingSelected) {
                            filteredMissingStudents.forEach((s) => next.delete(s.id));
                          } else {
                            filteredMissingStudents.forEach((s) => next.add(s.id));
                          }
                          return next;
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                    >
                      {allFilteredMissingSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      )}
                      <span>
                        {allFilteredMissingSelected
                          ? `ยกเลิกเลือกที่กรอง (${filteredMissingStudents.length})`
                          : `เลือกทั้งหมดที่กรอง (${filteredMissingStudents.length})`}
                      </span>
                    </button>

                    {selectedMissingStudentIds.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedMissingStudentIds(new Set())}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        ล้างที่เลือก ({selectedMissingStudentIds.size})
                      </button>
                    )}

                    <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      พบ {filteredMissingStudents.length} คน · เลือกไว้ {selectedMissingStudentIds.size} คน
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkTargetStudentIds(Array.from(selectedMissingStudentIds));
                        setShowBulkCreateConfirm(true);
                      }}
                      disabled={studentAccountsLoading || studentAccountSaving || selectedMissingStudentIds.size === 0}
                      className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {studentAccountSaving
                        ? 'กำลังดำเนินการ...'
                        : `สร้างบัญชีที่เลือก (${selectedMissingStudentIds.size})`}
                    </button>

                    {isFilteredMissing && filteredMissingStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkTargetStudentIds(filteredMissingStudents.map((s) => s.id));
                          setShowBulkCreateConfirm(true);
                        }}
                        disabled={studentAccountsLoading || studentAccountSaving}
                        className="rounded-xl border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        สร้างตามตัวกรอง ({filteredMissingStudents.length})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setBulkTargetStudentIds(null);
                        setShowBulkCreateConfirm(true);
                      }}
                      disabled={studentAccountsLoading || studentAccountSaving || activeStudentsWithoutAccounts.length === 0}
                      className="rounded-xl border border-[var(--color-primary)] px-3.5 py-2 text-xs font-bold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      สร้างบัญชีที่ยังไม่มีทั้งหมด ({activeStudentsWithoutAccounts.length})
                    </button>
                  </div>
                </div>

                {/* Scrollable Checklist Table */}
                {filteredMissingStudents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] py-6 text-center text-xs text-[var(--color-text-muted)]">
                    {activeStudentsWithoutAccounts.length === 0
                      ? 'นักเรียนสถานะกำลังศึกษาทุกคนมีบัญชีเข้าสู่ระบบครบแล้ว'
                      : 'ไม่พบรายชื่อนักเรียนตามตัวกรองที่เลือก'}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                    <table className="table-comfortable w-full min-w-[600px] text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">เลือก</th>
                          <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                          <th className="py-2 px-3">รหัสนักเรียน</th>
                          <th className="py-2 px-3">ห้องเรียน</th>
                          <th className="py-2 px-3">รหัสผ่านเริ่มต้น</th>
                          <th className="py-2 px-3 text-right">รายคน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {filteredMissingStudents.map((student) => {
                          const checked = selectedMissingStudentIds.has(student.id);
                          const previewPwd = buildInitialStudentPassword({
                            studentIdNumber: student.studentIdNumber || '',
                            defaultPasswordType: studentIdPolicy.defaultPasswordType,
                            shortIdPasswordPrefix: studentIdPolicy.shortIdPasswordPrefix,
                            dateOfBirth: student.dateOfBirth,
                          });
                          const isTooShort = previewPwd.length > 0 && previewPwd.length < 6;
                          return (
                            <tr
                              key={student.id}
                              onClick={() => {
                                setSelectedMissingStudentIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(student.id)) next.delete(student.id);
                                  else next.add(student.id);
                                  return next;
                                });
                              }}
                              className={`cursor-pointer transition ${
                                checked
                                  ? 'bg-[var(--color-primary-light)]/50'
                                  : 'hover:bg-[var(--color-card-subtle)]'
                              }`}
                            >
                              <td className="py-2 px-3 text-center">
                                {checked ? (
                                  <CheckSquare className="w-4 h-4 text-[var(--color-primary)] mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-[var(--color-text-muted)] mx-auto" />
                                )}
                              </td>
                              <td className="py-2 px-3 font-semibold text-[var(--color-text-title)]">
                                {student.firstNameTh} {student.lastNameTh}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums text-[var(--color-text-body)]">
                                {student.studentIdNumber || '-'}
                              </td>
                              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                                {student.room || student.gradeLevel || '-'}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums">
                                <span
                                  className={
                                    isTooShort
                                      ? 'text-amber-700 dark:text-amber-300 font-bold'
                                      : 'text-emerald-700 dark:text-emerald-300 font-semibold'
                                  }
                                >
                                  {previewPwd || '(ไม่มีรหัส)'}
                                </span>
                                {isTooShort && (
                                  <span className="ml-1.5 text-[10px] text-amber-700 dark:text-amber-300">
                                    (&lt;6 ตัว)
                                  </span>
                                )}
                              </td>
                              <td
                                className="py-2 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={studentAccountsLoading || studentAccountSaving}
                                  onClick={() => void handleCreateStudentLoginAccount(student.id)}
                                  className="rounded-lg border border-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-primary-text)] hover:bg-[var(--color-primary)] hover:text-white transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                >
                                  สร้างรายคน
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {bulkCredentialResult && (
                <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">บัญชีที่สร้างสำเร็จ (รหัสผ่านเริ่มต้น: {initialPasswordDesc})</p>
                      <p className="mt-1 text-xs">
                        สร้าง {bulkCredentialResult.created.length} · ข้าม {bulkCredentialResult.skipped.length} · ล้มเหลว {bulkCredentialResult.failed.length}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {bulkCredentialResult.created.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleCopyBulkCredentials()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-bold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                        >
                          {copiedField === 'bulkStudentCredentials' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedField === 'bulkStudentCredentials' ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูลทั้งหมด'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setBulkCredentialResult(null)}
                        className="rounded-lg border border-amber-400 px-2.5 py-1.5 text-[11px] font-bold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                      >
                        ปิดรายการ
                      </button>
                    </div>
                  </div>

                  {bulkCredentialResult.created.length > 0 && (
                    <>
                      <p className="text-[11px] leading-relaxed">
                        นักเรียนเข้าสู่ระบบด้วย <strong>รหัสนักเรียน (ชื่อผู้ใช้)</strong> คู่กับ <strong>รหัสผ่านเริ่มต้น</strong> ด้านล่าง เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้ตั้งรหัสผ่านใหม่ส่วนตัวอย่างน้อย 8 ตัวอักษรทันที
                      </p>
                      <div className="max-h-80 overflow-auto rounded-lg border border-amber-300 dark:border-amber-800">
            <table className="table-comfortable w-full min-w-[620px] text-left text-xs">
                          <thead className="sticky top-0 bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                            <tr>
                              <th className="px-3 py-2">รหัสนักเรียน (ชื่อผู้ใช้)</th>
                              <th className="px-3 py-2">รหัสผ่านเริ่มต้น</th>
                              <th className="px-3 py-2">เงื่อนไขเมื่อเข้าครั้งแรก</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                            {bulkCredentialResult.created.map((credential, index) => (
                              <tr key={`${credential.studentIdNumber}-${index}`}>
                                <td className="px-3 py-2 font-mono">{credential.studentIdNumber}</td>
                                <td className="px-3 py-2 font-mono font-bold select-all">{credential.temporaryPassword}</td>
                                <td className="px-3 py-2">
                                  {credential.expiresAt
                                    ? `หมดอายุ ${new Date(credential.expiresAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}`
                                    : 'บังคับเปลี่ยนรหัสผ่านทันทีเมื่อเข้าครั้งแรก'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {(bulkCredentialResult.skipped.length > 0 || bulkCredentialResult.failed.length > 0) && (
                    <details
                      open={bulkCredentialResult.failed.length > 0 && bulkCredentialResult.created.length === 0}
                      className="rounded-lg border border-amber-300 p-3 text-xs dark:border-amber-800"
                    >
                      <summary className="cursor-pointer font-bold">รายละเอียดรายการที่ข้ามหรือล้มเหลว</summary>
                      <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto pr-1">
                        {bulkCredentialResult.skipped.map((item, index) => (
                          <li key={`skipped-${item.studentIdNumber}-${index}`}>ข้าม {item.studentIdNumber}: {item.reason}</li>
                        ))}
                        {bulkCredentialResult.failed.map((item, index) => (
                          <li key={`failed-${item.studentIdNumber}-${index}`} className="font-semibold text-rose-700 dark:text-rose-300">
                            ล้มเหลว {item.studentIdNumber}: {item.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              {temporaryCredential && (
                <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">รหัสผ่านเริ่มต้นพร้อมใช้งาน (ใช้รหัสนักเรียน)</p>
                      <p className="mt-1 text-xs">รหัสนักเรียน: <span className="font-mono font-bold">{temporaryCredential.studentIdNumber}</span> · ใช้เข้าสู่ระบบครั้งแรกแล้วเปลี่ยนรหัสทันที</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemporaryCredential(null)}
                      className="rounded-lg border border-amber-400 px-2.5 py-1 text-[11px] font-bold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                    >
                      ปิด
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 select-all break-all rounded-lg border border-amber-300 bg-white/70 px-3 py-2 font-mono text-sm dark:border-amber-800 dark:bg-black/20">
                      {temporaryCredential.temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(temporaryCredential.temporaryPassword, 'studentTemporaryPassword')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-2 text-xs font-bold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                    >
                      {copiedField === 'studentTemporaryPassword' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'studentTemporaryPassword' ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}
                    </button>
                  </div>
                  <p className="text-[11px]">
                    {temporaryCredential.expiresAt
                      ? `หมดอายุ: ${new Date(temporaryCredential.expiresAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')} · `
                      : ''}
                    แจ้งให้นักเรียนเข้าสู่ระบบด้วยรหัสนักเรียน จากนั้นระบบจะบังคับให้ตั้งรหัสผ่านใหม่ทันที
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">อนุมัติคำขอสมัคร &amp; ผูกบัญชีล็อกอินกับรายชื่อนักเรียน</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  ตรวจสอบนักเรียนที่สมัครสมาชิกเข้าโรงเรียน กดอนุมัติเปิดใช้งาน และจับคู่กับระเบียนนักเรียน DMC เพื่อระบุตัวตนและสิทธิ์เช็คอิน
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="space-y-1 text-xs font-semibold text-[var(--color-text-body)]">
                  <span>บัญชีล็อกอิน</span>
                  <select
                    value={selectedAccountId}
                    onChange={(event) => {
                      const accountId = event.target.value;
                      setSelectedAccountId(accountId);
                      setSelectedStudentId(studentAccounts.find((account) => account.id === accountId)?.student_id || '');
                      setStudentAccountError(null);
                      setStudentAccountSuccess(null);
                    }}
                    disabled={studentAccountsLoading || studentAccounts.length === 0}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                  >
                    <option value="">เลือกบัญชี</option>
                    {studentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.full_name_th || account.full_name_en || 'ไม่ระบุชื่อ'} ({account.status === 'pending' ? 'รออนุมัติ' : account.status})
                        {account.student_id ? ' · ผูกแล้ว' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold text-[var(--color-text-body)]">
                  <span>ระเบียนนักเรียน</span>
                  <select
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    disabled={studentAccountsLoading || !selectedAccountId}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                  >
                    <option value="">เลือกรายชื่อนักเรียน</option>
                    {students.map((student) => {
                      const assignedElsewhere = studentAccounts.some(
                        (account) => account.id !== selectedAccountId && account.student_id === student.id
                      );
                      return (
                        <option key={student.id} value={student.id} disabled={assignedElsewhere}>
                          {student.firstNameTh} {student.lastNameTh} · {student.studentIdNumber}
                          {assignedElsewhere ? ' (ผูกกับบัญชีอื่นแล้ว)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleLinkStudentAccount}
                  disabled={studentAccountsLoading || studentAccountSaving || !selectedAccountId || !selectedStudentId}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {studentAccountSaving ? 'กำลังบันทึก...' : 'อนุมัติ & ผูกระเบียน'}
                </button>
              </div>

              {studentAccountsLoading ? (
                <p className="text-xs text-[var(--color-text-muted)]">กำลังโหลดบัญชีนักเรียน...</p>
              ) : studentAccounts.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">ไม่พบบัญชีนักเรียนของโรงเรียนนี้</p>
              ) : (() => {
                const accountRoomOptions = Array.from(
                  new Set(
                    studentAccounts
                      .map((acc) => students.find((s) => s.id === acc.student_id)?.room?.trim() || '')
                      .filter(Boolean)
                  )
                ).sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));

                const eq = existingAccountSearch.trim().toLowerCase();
                const filteredExistingAccounts = studentAccounts.filter((account) => {
                  const linkedStudent = students.find((s) => s.id === account.student_id);
                  if (existingAccountRoomFilter !== 'all') {
                    if ((linkedStudent?.room || '').trim() !== existingAccountRoomFilter) return false;
                  }
                  if (existingAccountStatusFilter !== 'all' && account.status !== existingAccountStatusFilter) {
                    return false;
                  }
                  if (eq) {
                    const hay = `${account.full_name_th || ''} ${account.full_name_en || ''} ${account.email || ''} ${linkedStudent?.firstNameTh || ''} ${linkedStudent?.lastNameTh || ''} ${linkedStudent?.studentIdNumber || ''} ${linkedStudent?.room || ''}`.toLowerCase();
                    if (!hay.includes(eq)) return false;
                  }
                  return true;
                });

                return (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={existingAccountRoomFilter}
                      onChange={(e) => setExistingAccountRoomFilter(e.target.value)}
                      aria-label="กรองบัญชีตามห้องเรียน"
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกห้องเรียน ({studentAccounts.length} บัญชี)</option>
                      {accountRoomOptions.map((room) => (
                        <option key={room} value={room}>
                          ห้อง {room}
                        </option>
                      ))}
                    </select>
                    <select
                      value={existingAccountStatusFilter}
                      onChange={(e) =>
                        setExistingAccountStatusFilter(e.target.value as 'all' | 'active' | 'pending' | 'suspended')
                      }
                      aria-label="กรองบัญชีตามสถานะ"
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="active">ใช้งานได้</option>
                      <option value="pending">รออนุมัติ</option>
                      <option value="suspended">ระงับสิทธิ์</option>
                    </select>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={existingAccountSearch}
                        onChange={(e) => setExistingAccountSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ รหัส หรืออีเมลบัญชี..."
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] pl-8 pr-3 py-2 text-xs text-[var(--color-text-title)]"
                      />
                    </div>
                  </div>

                  {filteredExistingAccounts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                      ไม่พบบัญชีนักเรียนที่ตรงกับตัวกรอง
                    </p>
                  ) : (
                  <div className="max-h-96 overflow-auto border border-[var(--color-border)] rounded-xl">
                  <table className="table-comfortable w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">บัญชีผู้สมัคร / อีเมล</th>
                        <th className="py-2.5 px-3">ระเบียนนักเรียน DMC</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                        <th className="py-2.5 px-3 text-right w-16">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredExistingAccounts.map((account) => {
                        const linkedStudent = students.find((student) => student.id === account.student_id);
                        const actionItems: TableActionItem[] = [
                          {
                            id: 'select_for_link',
                            label: 'เลือกเพื่อจับคู่ระเบียน DMC',
                            icon: <Users className="w-3.5 h-3.5" />,
                            variant: 'primary',
                            disabled: studentAccountSaving,
                            onClick: () => {
                              setSelectedAccountId(account.id);
                              setSelectedStudentId(account.student_id || '');
                              setStudentAccountError(null);
                              setStudentAccountSuccess(null);
                            },
                          },
                          account.status !== 'active'
                            ? {
                                id: 'activate',
                                label: 'อนุมัติเปิดใช้งานบัญชี',
                                icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                                variant: 'success',
                                disabled: studentAccountSaving,
                                onClick: () => void handleApproveOrToggleStatus(account, 'active'),
                              }
                            : {
                                id: 'suspend',
                                label: 'ระงับสิทธิ์ชั่วคราว',
                                icon: <ShieldAlert className="w-3.5 h-3.5" />,
                                variant: 'warning',
                                disabled: studentAccountSaving,
                                onClick: () => void handleApproveOrToggleStatus(account, 'suspended'),
                              },
                          ...(account.status === 'active' && account.student_id
                            ? [{
                                id: 'reset_student_password',
                                label: 'รีเซ็ตรหัสผ่านเป็นรหัสผ่านเริ่มต้น',
                                icon: <KeyRound className="w-3.5 h-3.5" />,
                                variant: 'warning' as const,
                                disabled: studentAccountSaving,
                                onClick: () => {
                                  setStudentAccountError(null);
                                  setStudentAccountSuccess(null);
                                  setPendingPasswordReset(account);
                                },
                              }]
                            : []),
                          {
                            id: 'delete_request',
                            label: 'ยกเลิก / ลบคำขอสมัคร',
                            icon: <Trash2 className="w-3.5 h-3.5" />,
                            variant: 'danger',
                            dividerBefore: true,
                            disabled: studentAccountSaving,
                            onClick: () => setPendingStudentAccountConfirm(account),
                          },
                        ];

                        return (
                          <tr key={account.id} className="hover:bg-[var(--color-card-subtle)] transition">
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-[var(--color-text-title)]">
                                {account.full_name_th || account.full_name_en || 'ไม่ระบุชื่อ'}
                              </p>
                              <p className="font-mono text-[10px] text-[var(--color-text-muted)]">
                                {account.email || account.id.slice(0, 8)}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 text-[var(--color-text-body)]">
                              {linkedStudent ? (
                                <span>
                                  {linkedStudent.firstNameTh} {linkedStudent.lastNameTh}{' '}
                                  <span className="font-mono text-[10px] text-[var(--color-primary-text)]">({linkedStudent.studentIdNumber})</span>
                                  {linkedStudent.room ? (
                                    <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)]">· {linkedStudent.room}</span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-300">ยังไม่ผูกกับรายชื่อนักเรียน</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <StatusIndicator
                                size="xs"
                                tone={
                                  account.status === 'active'
                                    ? 'success'
                                    : account.status === 'suspended'
                                    ? 'danger'
                                    : 'warning'
                                }
                                label={
                                  account.status === 'active'
                                    ? 'ใช้งานได้'
                                    : account.status === 'suspended'
                                    ? 'ระงับสิทธิ์'
                                    : 'รออนุมัติ'
                                }
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <TableActionMenu
                                items={actionItems}
                                ariaLabel={`จัดการบัญชี ${account.full_name_th || account.full_name_en || account.email || 'นักเรียน'}`}
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
                );
              })()}
            </div>
          </div>
          );
        })()}

      {/* TAB 8: Student Login Configuration & Dedicated School Login Link (Requirement 1) */}
      {activeTab === 'student_login_config' &&
        ['admin', 'super_admin'].includes(currentRole) && (
          <div data-guide-id="settings-student-login-card" className="space-y-4 animate-in fade-in duration-200">
            <SchoolStudentLoginSettingsCard
              activeSchool={activeSchool}
              lang={lang}
              onUpdateSchool={onUpdateSchool}
            />
          </div>
        )}

      {/* TAB 9: SaaS Leveled Packages, AI Access Control & Audit Log */}
      {activeTab === 'saas_audit' &&
        ['admin', 'super_admin'].includes(currentRole) && (() => {
          const allLogs = getAuditLogs(activeSchool.id);
          const filteredLogs = auditFilter === 'all' ? allLogs : allLogs.filter(l => l.actionType === auditFilter);
          return (
            <div className="space-y-4 animate-in fade-in duration-200">
              <SchoolPackagesAndAiPanel
                activeSchool={activeSchool}
                currentRole={currentRole}
                currentUser={currentUser}
                lang={lang}
                flags={localFlags}
                promotions={promotions}
                onUpdateFlags={(next) => {
                  setLocalFlags(next);
                  onUpdateFeatureFlags?.(next);
                }}
              />

              <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                      ประวัติการเปลี่ยนแปลงข้อมูลสำคัญ (Audit Log · {filteredLogs.length})
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      บันทึกอัตโนมัติเมื่อมีการแก้เกรด อนุมัติสลิป เปลี่ยนภาคเรียน หรือลบรายวิชา
                    </p>
                  </div>
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                  >
                    <option value="all">ทุกประเภทเหตุการณ์ ({allLogs.length})</option>
                    <option value="grade_update">แก้ไขคะแนน/เกรด</option>
                    <option value="academic_period_update">เปลี่ยนปี/ภาคเรียน</option>
                    <option value="invoice_slip_approved">อนุมัติสลิปการเงิน</option>
                    <option value="invoice_slip_rejected">ปฏิเสธสลิปการเงิน</option>
                    <option value="feature_flags_update">ตั้งค่าโมดูลโรงเรียน</option>
                    <option value="selfie_photo_cleanup">ลบรูปเซลฟี่เช็คชื่อ</option>
                    <option value="quiz_grade_sync">ส่ง Quiz เข้าสมุดคะแนน</option>
                  </select>
                </div>

                {filteredLogs.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    ยังไม่มีรายการ Audit Log ในหมวดที่เลือก (เมื่อมีการแก้ไขข้อมูลสำคัญ ระบบจะบันทึกที่นี่ทันที)
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-comfortable w-full text-left text-xs">
                      <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)]">
                        <tr>
                          <th className="py-2 px-3">เวลา</th>
                          <th className="py-2 px-3">ผู้ดำเนินการ</th>
                          <th className="py-2 px-3">ประเภท</th>
                          <th className="py-2 px-3">เป้าหมาย</th>
                          <th className="py-2 px-3">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {filteredLogs.slice(0, 30).map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('th-TH')}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[var(--color-text-title)]">
                              {log.actorName} <span className="text-[10px] text-[var(--color-text-muted)]">({log.actorRole})</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono text-[10px]">
                                {log.actionType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-[var(--color-text-title)]">{log.targetLabel}</td>
                            <td className="py-2 px-3 text-[var(--color-text-body)]">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      </div>

      <ConfirmActionModal
        isOpen={showBulkCreateConfirm}
        title={
          bulkTargetStudentIds && bulkTargetStudentIds.length > 0
            ? 'ยืนยันสร้างบัญชีนักเรียนตามรายการที่เลือก'
            : 'ยืนยันสร้างบัญชีนักเรียนที่ยังไม่มีทั้งหมด'
        }
        description={`ระบบจะสร้างบัญชีให้กับนักเรียนสถานะกำลังศึกษาที่ยังไม่มีบัญชี จำนวน ${
          bulkTargetStudentIds && bulkTargetStudentIds.length > 0
            ? bulkTargetStudentIds.length
            : activeStudentsWithoutAccounts.length
        } คน โดยไม่สร้างซ้ำให้บัญชีที่มีอยู่แล้ว`}
        detailNote={
          inlinePasswordType === 'birthdate'
            ? 'รหัสผ่านเริ่มต้นที่เลือกไว้: วันเดือนปีเกิด พ.ศ. 8 หลัก (ววดดปปปป) และบังคับให้นักเรียนเปลี่ยนรหัสใหม่เมื่อเข้าสู่ระบบครั้งแรก'
            : inlineShortIdPrefix
              ? `รหัสผ่านเริ่มต้นที่เลือกไว้: คำนำหน้า "${inlineShortIdPrefix}" + รหัสนักเรียน (สำหรับรหัสสั้นกว่า 6 ตัว) และบังคับเปลี่ยนรหัสใหม่เมื่อเข้าครั้งแรก`
              : 'ระบบจะตั้งรหัสผ่านเริ่มต้นเป็นรหัสนักเรียนของแต่ละคน และบังคับให้นักเรียนเปลี่ยนเป็นรหัสผ่านส่วนตัวทันทีเมื่อเข้าสู่ระบบครั้งแรก'
        }
        confirmLabel={
          bulkTargetStudentIds && bulkTargetStudentIds.length > 0
            ? `สร้างบัญชีที่เลือก (${bulkTargetStudentIds.length})`
            : `สร้างบัญชีทั้งหมด (${activeStudentsWithoutAccounts.length})`
        }
        cancelLabel="ยกเลิก"
        tone="primary"
        isBusy={studentAccountSaving}
        onCancel={() => {
          if (!studentAccountSaving) {
            setShowBulkCreateConfirm(false);
            setBulkTargetStudentIds(null);
          }
        }}
        onConfirm={handleCreateMissingStudentLoginAccounts}
      />
      <ConfirmActionModal
        isOpen={Boolean(pendingStudentAccountConfirm)}
        title="ยืนยันยกเลิก/ลบคำขอลงทะเบียนนักเรียน"
        description={`ต้องการยกเลิกและลบบัญชีลงทะเบียนของ "${pendingStudentAccountConfirm?.full_name_th || pendingStudentAccountConfirm?.full_name_en || pendingStudentAccountConfirm?.email || ''}" ออกจากโรงเรียนหรือไม่?`}
        detailNote="ระบบจะลบโปรไฟล์บัญชีนักเรียนในโรงเรียนนี้ออกจากฐานข้อมูล และล้างข้อมูลการผูกบัญชีที่เกี่ยวข้อง"
        confirmLabel="ยืนยันยกเลิก/ลบคำขอ"
        isBusy={studentAccountSaving}
        onCancel={() => {
          if (!studentAccountSaving) setPendingStudentAccountConfirm(null);
        }}
        onConfirm={handleConfirmDeleteStudentAccount}
      />
      <ConfirmActionModal
        isOpen={Boolean(pendingPasswordReset)}
        title="ยืนยันรีเซ็ตรหัสผ่านเป็นรหัสนักเรียน"
        description={`ต้องการรีเซ็ตรหัสผ่านของ "${pendingPasswordReset?.full_name_th || pendingPasswordReset?.full_name_en || pendingPasswordReset?.email || ''}" กลับเป็นรหัสนักเรียนหรือไม่? รหัสผ่านเดิมจะใช้เข้าสู่ระบบไม่ได้อีก`}
        detailNote="หลังรีเซ็ตแล้ว นักเรียนสามารถเข้าสู่ระบบด้วยรหัสนักเรียน และระบบจะบังคับให้ตั้งรหัสผ่านใหม่ส่วนตัวอย่างน้อย 8 ตัวอักษรทันที"
        confirmLabel="ยืนยันรีเซ็ตรหัสผ่าน"
        cancelLabel="ยกเลิก"
        tone="primary"
        isBusy={studentAccountSaving}
        onCancel={() => {
          if (!studentAccountSaving) setPendingPasswordReset(null);
        }}
        onConfirm={handleConfirmPasswordReset}
      />
    </div>
  );
};
