import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Tag, 
  Building2, 
  CheckCircle2, 
  MailCheck,
  Mail,
  Plus, 
  Save, 
  RotateCcw, 
  Users, 
  Lock, 
  Unlock, 
  Sparkles, 
  Percent, 
  Calendar, 
  ArrowRight,
  Search,
  Filter,
  Check,
  X,
  CreditCard,
  RefreshCw,
  BookOpen,
  Trash2,
  Package,
  DatabaseBackup,
  AlertTriangle,
} from 'lucide-react';
import { SuperAdminCentralExamManager } from './SuperAdminCentralExamManager';
import { CentralExamPaymentSettingsView } from './CentralExamPaymentSettingsView';
import { SuperAdminPackagesPanel } from '../components/admin/SuperAdminPackagesPanel';
import {
  approvePendingSchoolRegistration,
  cancelPendingSchoolRegistrationInSupabase,
  deleteSchoolPermanentlyInSupabase,
  listSuperAdminAccounts,
  listPendingSchoolRegistrations,
  PendingSchoolRegistration,
  SuperAdminAccount,
} from '../lib/authDb';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { fetchSchoolCounts } from '../lib/supabase';
import { fetchAuditLogsFromSupabase, getAuditLogs } from '../lib/auditLog';
import {
  DEFAULT_PACKAGE_CATALOG,
  FEATURE_FLAG_LABELS,
  PACKAGE_CATEGORY_META,
  buildFlagsFromLevel,
  countEnabledFeatures,
  getPackageLevelLabel,
  getSchoolFeatureFlags,
  getStoredPackageCatalog,
  normalizeSchoolTier,
} from '../lib/schoolFeatureFlags';
import { loadPackageCatalog, saveSchoolFeatureFlagsToDb } from '../lib/schoolPackageStore';
import { TableActionMenu, TableActionItem } from '../components/common/TableActionMenu';
import { getModuleTone } from '../lib/moduleTheme';
import { 
  School, 
  PackageLevelConfig,
  SchoolFeatureFlags,
  UserRole, 
  RolePermissionConfig, 
  PromotionCampaign, 
  SchoolSubscriptionPlan,
  AppLanguage 
} from '../types';

interface SuperAdminConsoleViewProps {
  schools: School[];
  onUpdateSchools: React.Dispatch<React.SetStateAction<School[]>>;
  rolePermissions: RolePermissionConfig[];
  onUpdateRolePermissions: (next: RolePermissionConfig[]) => Promise<void>;
  promotions: PromotionCampaign[];
  onUpdatePromotions: (next: PromotionCampaign[]) => Promise<void>;
  subscriptionPlans: SchoolSubscriptionPlan[];
  onSavePromoAssignment: (
    promotions: PromotionCampaign[],
    plans: SchoolSubscriptionPlan[]
  ) => Promise<void>;
  configError?: string | null;
  onToggleUserStatus?: (userId: string) => void;
  lang: AppLanguage;
  isDemoMode: boolean;
  onViewSchool: (school: School) => void;
  onToggleSchoolStatus: (schoolId: string, status: School['status']) => Promise<void>;
  onUpdateSchoolFeatureFlags?: (schoolId: string, flags: SchoolFeatureFlags) => void;
  coordinationUnreadCount?: number;
  onOpenCoordinationDesk?: () => void;
  onOpenBackupCenter?: () => void;
  initialSubTab?: 'approvals' | 'packages' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment' | 'audit_logs';
  onSubTabChange?: (subTab: 'approvals' | 'packages' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment' | 'audit_logs') => void;
}

export const SuperAdminConsoleView: React.FC<SuperAdminConsoleViewProps> = ({
  schools,
  onUpdateSchools,
  rolePermissions,
  onUpdateRolePermissions,
  promotions,
  onUpdatePromotions,
  subscriptionPlans,
  onSavePromoAssignment,
  configError,
  lang,
  isDemoMode,
  onViewSchool,
  onToggleSchoolStatus,
  onUpdateSchoolFeatureFlags,
  coordinationUnreadCount = 0,
  onOpenCoordinationDesk,
  onOpenBackupCenter,
  initialSubTab,
  onSubTabChange,
}) => {
  type ConsoleSubTab = 'approvals' | 'packages' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment' | 'audit_logs';
  const [activeSubTab, setActiveSubTab] = useState<ConsoleSubTab>(
    initialSubTab || 'approvals'
  );
  const selectSubTab = (next: ConsoleSubTab) => {
    setActiveSubTab(next);
    onSubTabChange?.(next);
  };
  const [packageCatalog, setPackageCatalog] = useState<PackageLevelConfig[]>(() => getStoredPackageCatalog() || DEFAULT_PACKAGE_CATALOG);
  const [flagEditorSchool, setFlagEditorSchool] = useState<School | null>(null);
  const [flagDraft, setFlagDraft] = useState<SchoolFeatureFlags | null>(null);
  const [auditSchoolFilter, setAuditSchoolFilter] = useState<string>('all');
  const [accounts, setAccounts] = useState<SuperAdminAccount[]>([]);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<Array<ReturnType<typeof getAuditLogs>[number] & { schoolName: string }>>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [schoolCountError, setSchoolCountError] = useState<string | null>(null);
  const [settingsWriteError, setSettingsWriteError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    void loadPackageCatalog().then(({ catalog }) => setPackageCatalog(catalog));
  }, []);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingSchoolRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [cancellingUserId, setCancellingUserId] = useState<string | null>(null);
  const [pendingRegConfirm, setPendingRegConfirm] = useState<{
    mode: 'approve' | 'cancel';
    registration: PendingSchoolRegistration;
  } | null>(null);
  const [registrationRefreshKey, setRegistrationRefreshKey] = useState(0);
  const [schoolStatusError, setSchoolStatusError] = useState<string | null>(null);
  const [updatingSchoolId, setUpdatingSchoolId] = useState<string | null>(null);
  const [pendingSchoolDeletion, setPendingSchoolDeletion] = useState<School | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [approvalPage, setApprovalPage] = useState(0);
  const [permissionPage, setPermissionPage] = useState(0);
  const [accountPage, setAccountPage] = useState(0);
  const [promotionPage, setPromotionPage] = useState(0);
  const [subscriptionPage, setSubscriptionPage] = useState(0);
  const [schoolPage, setSchoolPage] = useState(0);
  const [permissionSection, setPermissionSection] = useState<'policies' | 'accounts'>('policies');
  const [promotionSection, setPromotionSection] = useState<'campaigns' | 'assignments'>('campaigns');

  useEffect(() => {
    if (activeSubTab !== 'approvals' || isDemoMode) return;

    let active = true;
    setRegistrationsLoading(true);
    setRegistrationError(null);
    listPendingSchoolRegistrations()
      .then((registrations) => {
        if (active) setPendingRegistrations(registrations);
      })
      .catch((error: unknown) => {
        if (active) {
          setRegistrationError(error instanceof Error ? error.message : 'โหลดรายการสมัครที่รออนุมัติไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (active) setRegistrationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSubTab, isDemoMode, registrationRefreshKey]);

  // Live real-time Student & Teacher counts per school
  const [liveSchoolCounts, setLiveSchoolCounts] = useState<Record<string, { studentsCount: number; teachersCount: number }>>({});
  const [isCountingSchools, setIsCountingSchools] = useState(false);

  const refreshLiveSchoolCounts = () => {
    if (isDemoMode) return;
    const schoolIds = schools.map(s => s.id);
    if (schoolIds.length === 0) return;
    setIsCountingSchools(true);
    setSchoolCountError(null);
    fetchSchoolCounts(schoolIds)
      .then(counts => {
        setLiveSchoolCounts(counts);
      })
      .catch((error: unknown) => {
        setSchoolCountError(error instanceof Error ? error.message : 'โหลดจำนวนสมาชิกโรงเรียนไม่สำเร็จ');
      })
      .finally(() => {
        setIsCountingSchools(false);
      });
  };

  useEffect(() => {
    refreshLiveSchoolCounts();
  }, [schools, activeSubTab, registrationRefreshKey, isDemoMode]);

  useEffect(() => {
    if (permissionSection !== 'accounts' || isDemoMode) return;
    let active = true;
    setAccountError(null);
    const loadAccounts = async () => {
      const all: SuperAdminAccount[] = [];
      let offset = 0;
      while (active) {
        const page = await listSuperAdminAccounts(500, offset);
        all.push(...page);
        if (page.length < 500) break;
        offset += page.length;
      }
      if (active) setAccounts(all);
    };
    void loadAccounts().catch((error: unknown) => {
      if (active) setAccountError(error instanceof Error ? error.message : 'โหลดบัญชีผู้ใช้ไม่สำเร็จ');
    });
    return () => {
      active = false;
    };
  }, [permissionSection, isDemoMode]);

  useEffect(() => {
    if (activeSubTab !== 'audit_logs' || isDemoMode) return;
    let active = true;
    setAuditError(null);
    fetchAuditLogsFromSupabase(auditSchoolFilter === 'all' ? undefined : auditSchoolFilter)
      .then((entries) => {
        if (active) setAuditEntries(entries);
      })
      .catch((error: unknown) => {
        if (active) setAuditError(error instanceof Error ? error.message : 'โหลดประวัติระบบไม่สำเร็จ');
      });
    return () => {
      active = false;
    };
  }, [activeSubTab, auditSchoolFilter, isDemoMode]);

  // New Promotion Form State
  const [showNewPromoModal, setShowNewPromoModal] = useState(false);
  const [newPromoForm, setNewPromoForm] = useState<Omit<PromotionCampaign, 'id' | 'currentRedemptions'>>({
    code: '',
    titleTh: '',
    titleEn: '',
    discountType: 'percentage',
    discountValue: 20,
    applicableSchoolType: 'all',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '2026-12-31',
    maxRedemptions: 50,
    status: 'active',
    descriptionTh: '',
  });

  // Apply Promo to School State
  const [selectedSchoolForPromo, setSelectedSchoolForPromo] = useState<string>(schools[0]?.id || '');
  const [selectedPromoCodeToApply, setSelectedPromoCodeToApply] = useState<string>(promotions[0]?.code || '');

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleApproveRegistration = (registration: PendingSchoolRegistration) => {
    setPendingRegConfirm({ mode: 'approve', registration });
  };

  const handleCancelRegistration = (registration: PendingSchoolRegistration) => {
    setPendingRegConfirm({ mode: 'cancel', registration });
  };

  const handleConfirmRegistrationAction = async () => {
    if (!pendingRegConfirm) return;
    const { mode, registration } = pendingRegConfirm;

    if (mode === 'approve') {
      setApprovingUserId(registration.user_id);
      setRegistrationError(null);
      try {
        await approvePendingSchoolRegistration(registration.user_id);
        onUpdateSchools((current) => current.map((school) => (
          school.id === registration.school_id ? { ...school, status: 'active' } : school
        )));
        showToast(`อนุมัติ ${registration.school_name_th} เรียบร้อยแล้ว`);
        setRegistrationRefreshKey((current) => current + 1);
      } catch (error) {
        setRegistrationError(error instanceof Error ? error.message : 'อนุมัติรายการสมัครไม่สำเร็จ');
      } finally {
        setApprovingUserId(null);
        setPendingRegConfirm(null);
      }
      return;
    }

    setCancellingUserId(registration.user_id);
    setRegistrationError(null);
    try {
      await cancelPendingSchoolRegistrationInSupabase(registration.user_id, registration.school_id);
      setPendingRegistrations((current) => current.filter((item) => item.user_id !== registration.user_id));
      onUpdateSchools((current) => current.filter((school) => !(school.id === registration.school_id && school.status === 'pending')));
      showToast(`ยกเลิกและลบคำขอสมัครของ ${registration.school_name_th} เรียบร้อยแล้ว`);
      setRegistrationRefreshKey((current) => current + 1);
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'ยกเลิก/ลบคำขอสมัครโรงเรียนไม่สำเร็จ');
    } finally {
      setCancellingUserId(null);
      setPendingRegConfirm(null);
    }
  };

  // Current active role config
  const currentRoleConfig = rolePermissions.find((r) => r.role === selectedRole) || rolePermissions[0];

  // Toggle specific permission
  const handleTogglePermission = async (permKey: keyof RolePermissionConfig['permissions']) => {
    const next = rolePermissions.map((role) => role.role === selectedRole
      ? { ...role, permissions: { ...role.permissions, [permKey]: !role.permissions[permKey] } }
      : role
    );
    setSettingsWriteError(null);
    try {
      await onUpdateRolePermissions(next);
      showToast(`อัปเดตสิทธิ์ "${permKey}" ของบทบาท ${selectedRole} เรียบร้อยแล้ว`);
    } catch (error) {
      setSettingsWriteError(error instanceof Error ? error.message : 'บันทึกสิทธิ์ไม่สำเร็จ');
    }
  };

  // Add new promotion campaign
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoForm.code || !newPromoForm.titleTh) return;

    const newCampaign: PromotionCampaign = {
      id: `prm-${Date.now()}`,
      code: newPromoForm.code.trim().toUpperCase(),
      titleTh: newPromoForm.titleTh,
      titleEn: newPromoForm.titleEn || newPromoForm.titleTh,
      discountType: newPromoForm.discountType,
      discountValue: Number(newPromoForm.discountValue),
      applicableSchoolType: newPromoForm.applicableSchoolType,
      validFrom: newPromoForm.validFrom,
      validUntil: newPromoForm.validUntil,
      maxRedemptions: Number(newPromoForm.maxRedemptions),
      currentRedemptions: 0,
      status: 'active',
      descriptionTh: newPromoForm.descriptionTh,
    };

    const nextPromotions = [newCampaign, ...promotions];
    setSettingsWriteError(null);
    try {
      await onUpdatePromotions(nextPromotions);
    } catch (error) {
      setSettingsWriteError(error instanceof Error ? error.message : 'บันทึกแคมเปญไม่สำเร็จ');
      return;
    }
    setShowNewPromoModal(false);
    setNewPromoForm({
      code: '',
      titleTh: '',
      titleEn: '',
      discountType: 'percentage',
      discountValue: 20,
      applicableSchoolType: 'all',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '2026-12-31',
      maxRedemptions: 50,
      status: 'active',
      descriptionTh: '',
    });
    showToast(`สร้างแคมเปญโปรโมชั่น "${newCampaign.code}" เรียบร้อยแล้ว`);
  };

  // Toggle promotion status
  const handleTogglePromoStatus = async (promoId: string) => {
    const next = promotions.map((promotion) => promotion.id === promoId
      ? { ...promotion, status: promotion.status === 'active' ? 'expired' as const : 'active' as const }
      : promotion
    );
    setSettingsWriteError(null);
    try {
      await onUpdatePromotions(next);
      showToast('ปรับปรุงสถานะแคมเปญโปรโมชั่นเรียบร้อยแล้ว');
    } catch (error) {
      setSettingsWriteError(error instanceof Error ? error.message : 'บันทึกสถานะแคมเปญไม่สำเร็จ');
    }
  };

  // Apply promotion to school
  const handleApplyPromoToSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchool = schools.find((s) => s.id === selectedSchoolForPromo);
    const targetPromo = promotions.find((p) => p.code === selectedPromoCodeToApply);

    if (!targetSchool || !targetPromo) return;

    const existing = subscriptionPlans.find((plan) => plan.schoolId === targetSchool.id);
    const baseFee = existing ? existing.monthlyFee : 6500;
    const finalPrice = targetPromo.discountType === 'percentage'
      ? Math.round(baseFee * (1 - targetPromo.discountValue / 100))
      : targetPromo.discountType === 'fixed_amount'
        ? Math.max(0, baseFee - targetPromo.discountValue)
        : targetPromo.discountType === 'free_trial_months'
          ? 0
          : baseFee;
    const nextPlans = existing
      ? subscriptionPlans.map((plan) => plan.schoolId === targetSchool.id
        ? { ...plan, appliedPromoCode: targetPromo.code, finalPrice }
        : plan
      )
      : [{
          id: `sub-${Date.now()}`,
          schoolId: targetSchool.id,
          schoolName: targetSchool.nameTh,
          planName: 'Professional' as const,
          maxStudents: 1500,
          monthlyFee: baseFee,
          appliedPromoCode: targetPromo.code,
          finalPrice,
          billingCycle: 'yearly' as const,
          status: 'active' as const,
          expiryDate: '2027-05-31',
        }, ...subscriptionPlans];
    const nextPromotions = promotions.map((promotion) => promotion.id === targetPromo.id
      ? { ...promotion, currentRedemptions: promotion.currentRedemptions + 1 }
      : promotion
    );
    setSettingsWriteError(null);
    try {
      await onSavePromoAssignment(nextPromotions, nextPlans);
    } catch (error) {
      setSettingsWriteError(error instanceof Error ? error.message : 'บันทึกการผูกโปรโมชั่นไม่สำเร็จ');
      return;
    }
    onUpdateSchools((current) => current.map((school) => (
      school.id === targetSchool.id ? { ...school, appliedPromoCode: targetPromo.code } : school
    )));

    showToast(`ผูกโปรโมชั่น ${targetPromo.code} กับโรงเรียน ${targetSchool.nameTh} สำเร็จแล้ว`);
  };

  // Toggle school active/suspended status
  const handleToggleSchoolStatus = async (schoolId: string) => {
    const school = schools.find((item) => item.id === schoolId);
    if (!school) return;

    const nextStatus: School['status'] = school.status === 'active' ? 'suspended' : 'active';
    setUpdatingSchoolId(schoolId);
    setSchoolStatusError(null);
    try {
      await onToggleSchoolStatus(schoolId, nextStatus);
      showToast('อัปเดตสถานะการใช้งานของสถาบันการศึกษาเรียบร้อยแล้ว');
    } catch (error) {
      setSchoolStatusError(error instanceof Error ? error.message : 'อัปเดตสถานะโรงเรียนไม่สำเร็จ');
    } finally {
      setUpdatingSchoolId(null);
    }
  };

  const handleConfirmSchoolDeletion = async () => {
    if (!pendingSchoolDeletion) return;

    const school = pendingSchoolDeletion;
    setDeletingSchoolId(school.id);
    setSchoolStatusError(null);
    try {
      const cleanupWarning = await deleteSchoolPermanentlyInSupabase(school.id);
      onUpdateSchools((current) => current.filter((item) => item.id !== school.id));
      setSelectedSchoolForPromo((current) =>
        current === school.id ? schools.find((item) => item.id !== school.id)?.id || '' : current
      );
      setSchoolPage((current) => Math.min(
        current,
        Math.max(0, Math.ceil((schools.length - 1) / 4) - 1)
      ));
      setPendingSchoolDeletion(null);
      setRegistrationRefreshKey((current) => current + 1);
      if (cleanupWarning) setSchoolStatusError(cleanupWarning);
      showToast(cleanupWarning
        ? `ลบโรงเรียน "${school.nameTh}" จากฐานข้อมูลแล้ว`
        : `ลบโรงเรียน "${school.nameTh}" และข้อมูลที่เกี่ยวข้องถาวรแล้ว`);
    } catch (error) {
      setSchoolStatusError(error instanceof Error ? error.message : 'ลบโรงเรียนไม่สำเร็จ');
      setPendingSchoolDeletion(null);
    } finally {
      setDeletingSchoolId(null);
    }
  };

  const permissionLabels: Record<keyof RolePermissionConfig['permissions'], { title: string; desc: string }> = {
    manageStudents: { title: 'จัดการทะเบียนนักเรียน', desc: 'เพิ่ม ลบ แก้ไข ข้อมูลประวัตินักเรียนและข้อมูลผู้ปกครอง' },
    manageCourses: { title: 'จัดการรายวิชาและหลักสูตร', desc: 'สร้างรายวิชา กำหนดหน่วยกิต และลงทะเบียนนักเรียนเข้าชั้น' },
    editGrades: { title: 'บันทึกคะแนนและตัดเกรด', desc: 'กรอกคะแนนเก็บ กลางภาค ปลายภาค และคำนวณเกรดเฉลี่ย GPA' },
    recordAttendance: { title: 'บันทึกเวลาเรียนและเช็คชื่อ', desc: 'สแกน QR ผ่านประตู และเช็คชื่อรายคาบเรียน' },
    manageTuition: { title: 'การเงินและค่าเล่าเรียน', desc: 'ออกใบแจ้งหนี้ ตรวจสอบการชำระ PromptPay และออกใบเสร็จ' },
    sendBroadcastLine: { title: 'ส่งข้อความประกาศ LINE OA', desc: 'บรอดแคสต์ข่าวสารแจ้งเตือนตรงถึงผู้ปกครองผ่าน LINE' },
    manageTimetable: { title: 'จัดตารางสอนและตารางเรียน', desc: 'สร้างและแก้ไขคาบเรียน จัดห้องเรียนและตรวจจับคาบซ้ำซ้อน' },
    manageSdq: { title: 'ประเมินพฤติกรรม & SDQ สพฐ.', desc: 'บันทึกแบบประเมินจุดเด่นจุดพัฒนาและแบบประเมินวินัย' },
    viewInfirmary: { title: 'บันทึกสุขภาพและห้องพยาบาล', desc: 'ดูประวัติการเข้าห้องพยาบาล จ่ายยา และประวัติการแพ้ยา' },
    approveTranscripts: { title: 'อนุมัติเอกสาร ปพ.1 / ปพ.7', desc: 'ลงนามและออกใบรับรองผลการเรียนอย่างเป็นทางการ' },
  };

  return (
    <div className={`space-y-6 ${getModuleTone('super_admin_console')}`}>
      {/* Toast Alert */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
      {(configError || settingsWriteError || schoolCountError) && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {settingsWriteError || configError || schoolCountError}
        </div>
      )}

      {/* Super Admin Developer Editorial Header */}
      <div className="app-page-header px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="tone-chip w-10 h-10 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="module-category-kicker">
              03 · {lang === 'th' ? 'ระบบผู้พัฒนาระบบ (Developer & Platform Console)' : 'Developer & Platform Console'}
            </div>
            <h1 className="type-page-title truncate">
              ศูนย์ควบคุมระบบผู้พัฒนาและแพ็กเกจ SaaS
            </h1>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] flex-wrap">
              <span>Platform Owner Workspace</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('baanpakkru@gmail.com');
                  setFeedbackToast(lang === 'th' ? 'คัดลอกอีเมล Master (baanpakkru@gmail.com) แล้ว' : 'Copied Master email');
                }}
                className="inline-flex items-center gap-1 text-[var(--color-text-body)] hover:text-[var(--tone)] font-mono hover:underline cursor-pointer"
                title="คลิกเพื่อคัดลอกอีเมล Master สำหรับตอบกลับยืนยันและรีเซ็ตรหัสผ่าน"
              >
                <Mail className="w-3 h-3" />
                <span>baanpakkru@gmail.com</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenBackupCenter && (
            <button type="button" onClick={onOpenBackupCenter} className="btn-tool-neutral">
              <DatabaseBackup className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
              <span>สำรอง/กู้คืนระบบ</span>
            </button>
          )}
          {onOpenCoordinationDesk && (
            <button
              type="button"
              onClick={onOpenCoordinationDesk}
              className="btn-action-primary"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>จดหมายโรงเรียน</span>
              {coordinationUnreadCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums">
                  {coordinationUnreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4-Cell Executive Summary Strip */}
      <section aria-label="สรุปสถานะส่วนกลาง" className="saas-kpi-strip">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[var(--color-border)]">
          <button
            type="button"
            onClick={() => selectSubTab('schools')}
            className="tone-1 saas-kpi-cell saas-kpi-cell-interactive p-4 sm:p-5 flex flex-col justify-between gap-2 text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--tone)]">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>สถานศึกษาในระบบ</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="type-kpi tabular-nums">{schools.length}</span>
              <span className="type-meta">แห่ง</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectSubTab('approvals')}
            className="tone-3 saas-kpi-cell saas-kpi-cell-interactive p-4 sm:p-5 flex flex-col justify-between gap-2 text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--tone)]">
              <MailCheck className="w-3.5 h-3.5 shrink-0" />
              <span>คำขอรออนุมัติ</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`type-kpi tabular-nums ${pendingRegistrations.length > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                {pendingRegistrations.length}
              </span>
              <span className="type-meta">รายการ</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectSubTab('packages')}
            className="tone-5 saas-kpi-cell saas-kpi-cell-interactive p-4 sm:p-5 flex flex-col justify-between gap-2 text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--tone)]">
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>ระดับแพ็กเกจมาตรฐาน</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="type-kpi tabular-nums">{packageCatalog.length}</span>
              <span className="type-meta">ระดับ</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenCoordinationDesk?.()}
            className="tone-4 saas-kpi-cell saas-kpi-cell-interactive p-4 sm:p-5 flex flex-col justify-between gap-2 text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--tone)]">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>ข้อความรอตอบกลับ</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`type-kpi tabular-nums ${coordinationUnreadCount > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                {coordinationUnreadCount}
              </span>
              <span className="type-meta">เรื่อง</span>
            </div>
          </button>
        </div>
      </section>

      {/* Clean Single-Line Segmented Tabs */}
      <div className="seg-tab-group overflow-x-auto no-scrollbar max-w-full">
        <button
          type="button"
          data-active={activeSubTab === 'approvals'}
          onClick={() => selectSubTab('approvals')}
          className="tone-3 seg-tab-btn"
        >
          <MailCheck className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>อนุมัติโรงเรียน</span>
          {pendingRegistrations.length > 0 && (
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
              ({pendingRegistrations.length})
            </span>
          )}
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'schools'}
          onClick={() => selectSubTab('schools')}
          className="tone-1 seg-tab-btn"
        >
          <Building2 className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>สถานศึกษา ({schools.length})</span>
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'packages'}
          onClick={() => selectSubTab('packages')}
          className="tone-5 seg-tab-btn"
        >
          <Package className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>แพ็กเกจ &amp; โมดูล</span>
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'promotions'}
          onClick={() => selectSubTab('promotions')}
          className="tone-6 seg-tab-btn"
        >
          <Tag className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>โปรโมชัน &amp; แผน</span>
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'permissions'}
          onClick={() => selectSubTab('permissions')}
          className="tone-7 seg-tab-btn"
        >
          <KeyRound className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>สิทธิ์ &amp; บัญชี</span>
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'central_exams'}
          onClick={() => selectSubTab('central_exams')}
          className="tone-2 seg-tab-btn"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>คลังข้อสอบกลาง</span>
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'exam_payment'}
          onClick={() => selectSubTab('exam_payment')}
          className="tone-6 seg-tab-btn"
        >
          <CreditCard className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>รับเงิน PromptPay</span>
        </button>
        <button
          type="button"
          data-active={activeSubTab === 'audit_logs'}
          onClick={() => selectSubTab('audit_logs')}
          className="tone-3 seg-tab-btn"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[var(--tone)]" />
          <span>Audit Log</span>
        </button>
      </div>

      {activeSubTab === 'packages' && (
        <SuperAdminPackagesPanel
          lang={lang}
          onCatalogSaved={(nextCatalog) => setPackageCatalog(nextCatalog)}
          onOrderApprovedFlags={(schoolId, activatedFlags) => {
            onUpdateSchoolFeatureFlags?.(schoolId, activatedFlags);
          }}
          onNotify={(msg) => showToast(msg)}
        />
      )}

      {activeSubTab === 'approvals' && (
        <div className="saas-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-title)]">รายการสมัครโรงเรียนที่รอเปิดใช้งาน</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                อนุมัติเฉพาะผู้ดูแลโรงเรียนใหม่ที่ตรวจสอบตัวตนแล้ว การอนุมัติรายการที่ยังไม่ยืนยันอีเมลจะยืนยันอีเมลและเปิดใช้บัญชี/โรงเรียนด้วย
              </p>
            </div>
            {!isDemoMode && (
              <button
                type="button"
                onClick={() => setRegistrationRefreshKey((current) => current + 1)}
                disabled={registrationsLoading}
                className="btn-tool-neutral"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${registrationsLoading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            )}
          </div>

          <div className="ui-alert" data-state="warning">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--state-warning)]" />
            <span>การอนุมัติแทนการยืนยันอีเมลเป็นการข้ามการพิสูจน์การครอบครองอีเมล โปรดตรวจสอบผู้สมัครผ่านช่องทางอื่นก่อนทุกครั้ง</span>
          </div>

          {isDemoMode ? (
            <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
              โหมดสาธิตไม่เชื่อมต่อข้อมูลผู้สมัครจริง กรุณาเข้าสู่ระบบด้วยบัญชี Super Admin เพื่อจัดการคำขอจริง
            </p>
          ) : (
            <>
              {registrationError && (
                <div role="alert" className="ui-alert ui-alert-danger">
                  {registrationError}
                </div>
              )}
              {registrationsLoading ? (
                <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">กำลังโหลดรายการสมัคร...</p>
              ) : pendingRegistrations.length === 0 && !registrationError ? (
                <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">ไม่มีรายการสมัครโรงเรียนที่รออนุมัติ</p>
              ) : pendingRegistrations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table-comfortable w-full text-left text-xs">
                    <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">สถานศึกษา</th>
                        <th className="py-2.5 px-3">ผู้สมัคร / อีเมล</th>
                        <th className="py-2.5 px-3">วันที่สมัคร</th>
                        <th className="py-2.5 px-3">สถานะอีเมล</th>
                        <th className="py-2.5 px-3 text-right w-16">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {pendingRegistrations.slice(approvalPage * 4, (approvalPage + 1) * 4).map((registration) => (
                        <tr key={registration.user_id} className="hover:bg-[var(--color-card-subtle)]">
                          <td className="py-3 px-3">
                            <div className="font-bold text-[var(--color-text-title)]">{registration.school_name_th}</div>
                            <div className="text-[11px] text-[var(--color-text-muted)]">{registration.province}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-[var(--color-text-title)]">{registration.full_name_th}</div>
                            <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{registration.email}</div>
                          </td>
                          <td className="py-3 px-3 text-[var(--color-text-body)]">
                            {new Date(registration.registration_created_at).toLocaleString('th-TH')}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="ui-status"
                              data-state={registration.email_confirmed ? 'success' : 'warning'}
                            >
                              {registration.email_confirmed ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <TableActionMenu
                              ariaLabel={`จัดการคำขอสมัคร ${registration.school_name_th}`}
                              items={[
                                {
                                  id: 'approve',
                                  label:
                                    approvingUserId === registration.user_id
                                      ? 'กำลังอนุมัติ...'
                                      : registration.email_confirmed
                                      ? 'อนุมัติบัญชีโรงเรียน'
                                      : 'ยืนยันอีเมลและอนุมัติ',
                                  icon: <Check className="w-3.5 h-3.5" />,
                                  variant: 'success',
                                  disabled: approvingUserId !== null || cancellingUserId !== null,
                                  onClick: () => void handleApproveRegistration(registration),
                                },
                                {
                                  id: 'cancel',
                                  label: cancellingUserId === registration.user_id ? 'กำลังลบ...' : 'ยกเลิก / ลบคำขอ',
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  variant: 'danger',
                                  dividerBefore: true,
                                  disabled: approvingUserId !== null || cancellingUserId !== null,
                                  onClick: () => handleCancelRegistration(registration),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pendingRegistrations.length > 4 && (
                    <div className="flex items-center justify-between pt-3 text-xs text-[var(--color-text-muted)]">
                      <button type="button" onClick={() => setApprovalPage(page => Math.max(0, page - 1))} disabled={approvalPage === 0} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ก่อนหน้า</button>
                      <span className="tabular-nums">หน้า {approvalPage + 1} / {Math.ceil(pendingRegistrations.length / 4)} · {pendingRegistrations.length} รายการ</span>
                      <button type="button" onClick={() => setApprovalPage(page => Math.min(Math.ceil(pendingRegistrations.length / 4) - 1, page + 1))} disabled={approvalPage >= Math.ceil(pendingRegistrations.length / 4) - 1} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ถัดไป</button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* View 1: RBAC Role & Permission Management */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-5">
          <div className="seg-tab-group w-fit">
            <button type="button" data-active={permissionSection === 'policies'} onClick={() => setPermissionSection('policies')} className="seg-tab-btn">กำหนดสิทธิ์</button>
            <button type="button" data-active={permissionSection === 'accounts'} onClick={() => setPermissionSection('accounts')} className="seg-tab-btn">บัญชีผู้ใช้ ({accounts.length})</button>
          </div>
          {permissionSection === 'policies' && (
          <>
          {/* Role selector tabs */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">เลือกบทบาทเพื่อกำหนดสิทธิ์</h3>
                <p className="text-xs text-[var(--color-text-body)] mt-0.5">
                  สิทธิ์ที่เปิดใช้งานจะถูกบังคับใช้กับผู้ใช้งานทุกคนที่มีบทบาทนี้ในระบบ
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex-wrap">
                {rolePermissions.map((rp) => (
                  <button
                    key={rp.role}
                    type="button"
                    onClick={() => setSelectedRole(rp.role)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      selectedRole === rp.role
                        ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                        : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {rp.role === 'admin'
                      ? 'ผู้อำนวยการ (Admin)'
                      : rp.role === 'teacher'
                      ? 'อาจารย์ (Teacher)'
                      : rp.role === 'student'
                      ? 'นักเรียน (Student)'
                      : 'ผู้ปกครอง (Parent)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Role Description */}
            <div className="p-3.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[var(--color-text-title)] block">{currentRoleConfig.roleNameTh}</span>
                <span className="text-[var(--color-text-body)]">{currentRoleConfig.descriptionTh}</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-bold">
                Role: {currentRoleConfig.role}
              </span>
            </div>

            {/* Permission Switches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {(Object.keys(currentRoleConfig.permissions) as Array<keyof RolePermissionConfig['permissions']>).slice(permissionPage * 4, (permissionPage + 1) * 4).map((permKey) => {
                const isEnabled = currentRoleConfig.permissions[permKey];
                const meta = permissionLabels[permKey];

                return (
                  <div
                    key={permKey}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isEnabled
                        ? 'bg-[var(--color-card)] border-[var(--color-primary)] shadow-xs'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[var(--color-text-title)] text-xs flex items-center gap-1.5">
                        {isEnabled ? (
                          <Check className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        )}
                        <span>{meta.title}</span>
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{meta.desc}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePermission(permKey)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-blue-700' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            {Object.keys(currentRoleConfig.permissions).length > 4 && (
              <div className="flex items-center justify-between pt-2 text-xs text-[var(--color-text-muted)]">
                <button type="button" onClick={() => setPermissionPage(page => Math.max(0, page - 1))} disabled={permissionPage === 0} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ก่อนหน้า</button>
                <span className="tabular-nums">หน้า {permissionPage + 1} / {Math.ceil(Object.keys(currentRoleConfig.permissions).length / 4)} · {Object.keys(currentRoleConfig.permissions).length} สิทธิ์</span>
                <button type="button" onClick={() => setPermissionPage(page => Math.min(Math.ceil(Object.keys(currentRoleConfig.permissions).length / 4) - 1, page + 1))} disabled={permissionPage >= Math.ceil(Object.keys(currentRoleConfig.permissions).length / 4) - 1} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ถัดไป</button>
              </div>
            )}
          </div>
          </>
          )}

          {/* User Accounts Overview */}
          {permissionSection === 'accounts' && <div className="saas-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>บัญชีผู้ใช้งานในระบบทั้งหมด</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="table-comfortable w-full text-left text-xs">
                <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2.5 px-3">อีเมล / บัญชี</th>
                    <th className="py-2.5 px-3">บทบาท (Role)</th>
                    <th className="py-2.5 px-3">โรงเรียนที่สังกัด</th>
                    <th className="py-2.5 px-3 text-right">สถานะบัญชี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {accounts.slice(accountPage * 5, (accountPage + 1) * 5).map((u) => {
                    const sch = schools.find((s) => s.id === u.school_id);
                    return (
                      <tr key={u.id} className="hover:bg-[var(--color-card-subtle)]">
                        <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-[var(--color-text-title)]">
                          <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          <span>{u.full_name_th}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-text-muted)] font-mono text-[11px]">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'super_admin'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                              : u.role === 'admin'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                              : u.role === 'teacher'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-[var(--color-border)]'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-text-body)]">{sch?.nameTh || u.school_id || '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            u.status === 'active'
                              ? 'text-emerald-800 dark:text-emerald-300'
                              : u.status === 'pending'
                                ? 'text-amber-800 dark:text-amber-300'
                                : 'text-rose-800 dark:text-rose-300'
                          }`}>
                            {u.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>{u.status}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {accountError && <p role="alert" className="text-xs text-rose-700">{accountError}</p>}
            {!accountError && accounts.length === 0 && (
              <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">ไม่พบบัญชีผู้ใช้</p>
            )}
            {accounts.length > 5 && (
              <div className="flex items-center justify-between pt-2 text-xs text-[var(--color-text-muted)]">
                <button type="button" onClick={() => setAccountPage(page => Math.max(0, page - 1))} disabled={accountPage === 0} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ก่อนหน้า</button>
                <span className="tabular-nums">หน้า {accountPage + 1} / {Math.ceil(accounts.length / 5)} · {accounts.length} บัญชี</span>
                <button type="button" onClick={() => setAccountPage(page => Math.min(Math.ceil(accounts.length / 5) - 1, page + 1))} disabled={accountPage >= Math.ceil(accounts.length / 5) - 1} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ถัดไป</button>
              </div>
            )}
          </div>}
        </div>
      )}

      {/* View 2: Promotions & School Subscription Packages */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-5">
          <div className="seg-tab-group w-fit">
            <button type="button" data-active={promotionSection === 'campaigns'} onClick={() => setPromotionSection('campaigns')} className="seg-tab-btn">แคมเปญ ({promotions.length})</button>
            <button type="button" data-active={promotionSection === 'assignments'} onClick={() => setPromotionSection('assignments')} className="seg-tab-btn">ผูกแพ็กเกจโรงเรียน</button>
          </div>
          {promotionSection === 'campaigns' && (
          <>
          {/* Header + Add Promo Button */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">แคมเปญโปรโมชั่นที่เปิดใช้งาน</h3>
                <p className="text-xs text-[var(--color-text-body)] mt-0.5">
                  กำหนดโค้ดส่วนลด อัตราค่าบริการรายปี หรือสิทธิ์ทดลองใช้ฟรีสำหรับสถานศึกษา
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewPromoModal(true)}
                className="btn-action-primary h-9 px-3.5"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างโปรโมชั่นใหม่</span>
              </button>
            </div>

            {/* Promotions Table */}
            <div className="overflow-x-auto">
              <table className="table-comfortable w-full text-left text-xs">
                <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">โค้ดโปรโมชั่น</th>
                    <th className="py-2.5 px-3">ชื่อแคมเปญ</th>
                    <th className="py-2.5 px-3">ประเภทส่วนลด</th>
                    <th className="py-2.5 px-3">มูลค่าส่วนลด</th>
                    <th className="py-2.5 px-3">ใช้ไปแล้ว / โควตา</th>
                    <th className="py-2.5 px-3">วันหมดเขต</th>
                    <th className="py-2.5 px-3 text-right">สถานะ</th>
                    <th className="py-2.5 px-3 text-right w-16">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-body)]">
                  {promotions.slice(promotionPage * 4, (promotionPage + 1) * 4).map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--color-card-subtle)]">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[var(--color-primary-text)]">
                          {p.code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[var(--color-text-title)]">{p.titleTh}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{p.descriptionTh}</div>
                      </td>
                      <td className="py-3 px-3">
                        {p.discountType === 'percentage'
                          ? 'ลดเป็นเปอร์เซ็นต์ (%)'
                          : p.discountType === 'fixed_amount'
                          ? 'ลดเป็นจำนวนเงิน (฿)'
                          : 'ทดลองใช้ฟรี (เดือน)'}
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--color-text-title)] tabular-nums">
                        {p.discountType === 'percentage'
                          ? `${p.discountValue}%`
                          : p.discountType === 'fixed_amount'
                          ? `฿${p.discountValue.toLocaleString()}`
                          : `${p.discountValue} เดือน`}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums">
                        {p.currentRedemptions} / {p.maxRedemptions} สิทธิ์
                      </td>
                      <td className="py-3 px-3 text-[var(--color-text-muted)] tabular-nums">{p.validUntil}</td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className="ui-status"
                          data-state={p.status === 'active' ? 'success' : 'neutral'}
                        >
                          {p.status === 'active' ? 'เปิดใช้งาน' : 'หมดอายุ'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <TableActionMenu
                          ariaLabel={`จัดการโปรโมชั่น ${p.code}`}
                          items={[
                            {
                              id: 'toggle_promo',
                              label: p.status === 'active' ? 'พักแคมเปญชั่วคราว' : 'เปิดใช้งานแคมเปญใหม่',
                              icon: p.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />,
                              variant: p.status === 'active' ? 'warning' : 'success',
                              onClick: () => handleTogglePromoStatus(p.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {promotions.length > 4 && (
              <div className="flex items-center justify-between pt-2 text-xs text-[var(--color-text-muted)]">
                <button type="button" onClick={() => setPromotionPage(page => Math.max(0, page - 1))} disabled={promotionPage === 0} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ก่อนหน้า</button>
                <span className="tabular-nums">หน้า {promotionPage + 1} / {Math.ceil(promotions.length / 4)} · {promotions.length} แคมเปญ</span>
                <button type="button" onClick={() => setPromotionPage(page => Math.min(Math.ceil(promotions.length / 4) - 1, page + 1))} disabled={promotionPage >= Math.ceil(promotions.length / 4) - 1} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ถัดไป</button>
              </div>
            )}
          </div>
          </>
          )}

          {/* Quick Apply Promo to School Form */}
          {promotionSection === 'assignments' && <div className="saas-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>ผูกโปรโมชั่นและแพ็กเกจให้สถานศึกษา</span>
            </h3>

            <form onSubmit={handleApplyPromoToSchool} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-end">
              <div>
                <label className="block text-[var(--color-text-title)] font-medium mb-1">เลือกโรงเรียน</label>
                <select
                  value={selectedSchoolForPromo}
                  onChange={(e) => setSelectedSchoolForPromo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  {schools.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.nameTh} ({sch.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-text-title)] font-medium mb-1">เลือกแคมเปญโปรโมชั่น</label>
                <select
                  value={selectedPromoCodeToApply}
                  onChange={(e) => setSelectedPromoCodeToApply(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  {promotions.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code} - {p.titleTh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn-action-primary w-full h-9 justify-center"
                >
                  บันทึกการผูกโปรโมชั่น
                </button>
              </div>
            </form>

            {/* School Subscriptions Status Overview */}
            <div className="pt-3 border-t border-[var(--color-border)]">
              <h4 className="text-xs font-bold text-[var(--color-text-title)] mb-2">สถานะแพ็กเกจปัจจุบันของสถานศึกษา</h4>
              <div className="space-y-2">
                {schools.slice(subscriptionPage * 4, (subscriptionPage + 1) * 4).map((sch) => {
                  const plan = subscriptionPlans.find((p) => p.schoolId === sch.id);
                  return (
                    <div
                      key={sch.id}
                      className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--color-text-title)]">{sch.nameTh}</span>
                        <div className="text-[11px] text-[var(--color-text-body)]">
                          แพ็กเกจ: <strong className="text-[var(--color-text-title)]">{plan?.planName || 'Enterprise'}</strong> · รองรับนักเรียนสูงสุด {plan?.maxStudents || 3000} คน
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[var(--color-primary-text)] font-mono text-sm tabular-nums">
                          {plan ? `฿${plan.finalPrice.toLocaleString()} / ปี` : 'ยังไม่ได้กำหนดแพ็กเกจ'}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                          โค้ดที่ใช้: {sch.appliedPromoCode || plan?.appliedPromoCode || '—'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {schools.length > 4 && (
                <div className="flex items-center justify-between text-xs pt-3 text-[var(--color-text-muted)]">
                  <button type="button" onClick={() => setSubscriptionPage(page => Math.max(0, page - 1))} disabled={subscriptionPage === 0} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ก่อนหน้า</button>
                  <span className="tabular-nums">หน้า {subscriptionPage + 1} / {Math.ceil(schools.length / 4)} · {schools.length} โรงเรียน</span>
                  <button type="button" onClick={() => setSubscriptionPage(page => Math.min(Math.ceil(schools.length / 4) - 1, page + 1))} disabled={subscriptionPage >= Math.ceil(schools.length / 4) - 1} className="btn-tool-neutral h-8 px-3 disabled:opacity-40">ถัดไป</button>
                </div>
              )}
            </div>
          </div>}
        </div>
      )}

      {/* View 3: All Schools Directory & Tenant Governance */}
      {activeSubTab === 'schools' && (
        <div className="saas-card p-5 space-y-4">
          {schoolStatusError && (
            <div role="alert" className="ui-alert ui-alert-danger">
              {schoolStatusError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">ทะเบียนสถาบันการศึกษาทั้งหมด</h3>
              <p className="text-xs text-[var(--color-text-body)] mt-0.5">
                กำกับดูแลสถานะการใช้งาน ตรวจสอบจำนวนนักเรียน และระงับ/เปิดใช้งานสถานศึกษา
              </p>
            </div>
            <button
              type="button"
              onClick={refreshLiveSchoolCounts}
              disabled={isCountingSchools}
              className="btn-tool-neutral h-9 px-3 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCountingSchools ? 'animate-spin' : ''}`} />
              <span>{isCountingSchools ? 'กำลังอัปเดตยอด...' : 'รีเฟรชยอดนักเรียน/ครูจริง'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table-comfortable w-full text-left text-xs">
              <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">รหัสโรงเรียน</th>
                  <th className="py-2.5 px-3">ชื่อสถานศึกษา</th>
                  <th className="py-2.5 px-3">ประเภท</th>
                  <th className="py-2.5 px-3">จังหวัด</th>
                  <th className="py-2.5 px-3">นักเรียน / ครู (จริง)</th>
                  <th className="py-2.5 px-3">โปรโมชั่นที่ใช้</th>
                  <th className="py-2.5 px-3 text-right">สถานะ</th>
                  <th className="py-2.5 px-3 text-right w-16">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-body)]">
                {schools.slice(schoolPage * 4, (schoolPage + 1) * 4).map((s) => {
                  const live = liveSchoolCounts[s.id];
                  const plan = subscriptionPlans.find((item) => item.schoolId === s.id);
                  const actualStudents = live ? live.studentsCount : (s.studentsCount || 0);
                  const actualTeachers = live ? live.teachersCount : (s.teachersCount || 0);
                  return (
                    <tr key={s.id} className="hover:bg-[var(--color-card-subtle)]">
                      <td className="py-3 px-3 font-mono font-bold text-[var(--color-primary-text)]">{s.code}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[var(--color-text-title)]">{s.nameTh}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{s.nameEn}</div>
                      </td>
                      <td className="py-3 px-3 capitalize text-[var(--color-text-body)]">{s.type}</td>
                      <td className="py-3 px-3 text-[var(--color-text-muted)]">{s.province}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">{actualStudents}</span> คน / <span className="font-semibold text-[var(--color-text-title)]">{actualTeachers}</span> ครู
                      </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-mono font-medium text-[var(--color-text-body)]">
                        {s.appliedPromoCode || plan?.appliedPromoCode || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className="ui-status"
                        data-state={
                          s.status === 'active'
                            ? 'success'
                            : s.status === 'pending'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {s.status === 'active'
                          ? 'เปิดใช้งาน'
                          : s.status === 'pending'
                            ? 'รออนุมัติ'
                            : 'ระงับชั่วคราว'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {(() => {
                        const actionItems: TableActionItem[] = [
                          {
                            id: 'view_school',
                            label: 'ดูข้อมูล / เข้าดูโรงเรียนนี้',
                            icon: <Building2 className="w-3.5 h-3.5" />,
                            variant: 'primary',
                            onClick: () => onViewSchool(s),
                          },
                          {
                            id: 'feature_flags',
                            label: (() => {
                              const currentSchoolFlags = getSchoolFeatureFlags(s.id, s.schoolTier || 'enterprise');
                              return `ตั้งค่าโมดูล (${getPackageLevelLabel(currentSchoolFlags.tier, lang, packageCatalog)} · ${countEnabledFeatures(currentSchoolFlags)}/${FEATURE_FLAG_LABELS.length})`;
                            })(),
                            icon: <Sparkles className="w-3.5 h-3.5" />,
                            variant: 'warning',
                            onClick: () => {
                              setFlagEditorSchool(s);
                              setFlagDraft(getSchoolFeatureFlags(s.id, s.schoolTier || 'enterprise'));
                            },
                          },
                          ...(s.status !== 'pending'
                            ? [
                                {
                                  id: 'toggle_status',
                                  label:
                                    updatingSchoolId === s.id
                                      ? 'กำลังบันทึก...'
                                      : s.status === 'active'
                                      ? 'ระงับสิทธิ์การใช้งานชั่วคราว'
                                      : 'เปิดใช้งานโรงเรียน',
                                  icon: s.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />,
                                  variant: (s.status === 'active' ? 'danger' : 'success') as 'danger' | 'success',
                                  dividerBefore: true,
                                  disabled: updatingSchoolId !== null,
                                  onClick: () => void handleToggleSchoolStatus(s.id),
                                },
                              ]
                            : []),
                          ...(!isDemoMode
                            ? [
                                {
                                  id: 'delete_school',
                                  label: 'ลบโรงเรียนและข้อมูลทั้งหมดถาวร',
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  variant: 'danger' as const,
                                  dividerBefore: true,
                                  disabled: deletingSchoolId !== null || updatingSchoolId !== null,
                                  onClick: () => setPendingSchoolDeletion(s),
                                },
                              ]
                            : []),
                        ];
                        return (
                          <TableActionMenu
                            items={actionItems}
                            ariaLabel={`จัดการโรงเรียน ${s.nameTh}`}
                          />
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
          {schools.length > 4 && (
            <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
              <button type="button" onClick={() => setSchoolPage(page => Math.max(0, page - 1))} disabled={schoolPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
              <span>หน้า {schoolPage + 1} / {Math.ceil(schools.length / 4)} · {schools.length} โรงเรียน</span>
              <button type="button" onClick={() => setSchoolPage(page => Math.min(Math.ceil(schools.length / 4) - 1, page + 1))} disabled={schoolPage >= Math.ceil(schools.length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
            </div>
          )}
        </div>
      )}

      {/* View 4: Central Exam Bank (8 Strands) Manager */}
      {activeSubTab === 'central_exams' && (
        <SuperAdminCentralExamManager isDemoMode={isDemoMode} />
      )}

      {/* View 5: Central Exam Payment & PromptPay Settings (Requirement 2) */}
      {activeSubTab === 'exam_payment' && (
        <CentralExamPaymentSettingsView adminEmail="baanpakkru@gmail.com" />
      )}

      {/* View 6: Multi-School Audit Logs */}
      {activeSubTab === 'audit_logs' && (() => {
        const entries = isDemoMode
          ? (auditSchoolFilter === 'all' ? schools : schools.filter((school) => school.id === auditSchoolFilter))
              .flatMap((school) => getAuditLogs(school.id).map((log) => ({ ...log, schoolName: school.nameTh })))
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          : auditEntries;
        return (
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  ประวัติการเปลี่ยนแปลงข้อมูลสำคัญระดับโรงเรียน (Audit Log · {entries.length})
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  ตรวจสอบย้อนหลังการแก้เกรด เปลี่ยนภาคเรียน อนุมัติสลิป และเปิดปิดโมดูลทุกสถานศึกษา
                </p>
              </div>
              <select
                value={auditSchoolFilter}
                onChange={(e) => setAuditSchoolFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs"
              >
                <option value="all">ทุกโรงเรียน ({schools.length})</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.nameTh}</option>
                ))}
              </select>
            </div>

            {auditError && <p role="alert" className="text-xs text-rose-700">{auditError}</p>}
            {entries.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                ยังไม่มีบันทึกเหตุการณ์ในระบบ
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-comfortable w-full text-left text-xs">
                  <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)]">
                    <tr>
                      <th className="py-2 px-3">เวลา</th>
                      <th className="py-2 px-3">โรงเรียน</th>
                      <th className="py-2 px-3">ผู้ดำเนินการ</th>
                      <th className="py-2 px-3">เป้าหมาย</th>
                      <th className="py-2 px-3">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {entries.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--color-card-subtle)]">
                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{new Date(log.timestamp).toLocaleString('th-TH')}</td>
                        <td className="py-2 px-3 font-semibold text-[var(--color-text-title)]">{log.schoolName}</td>
                        <td className="py-2 px-3">{log.actorName} ({log.actorRole})</td>
                        <td className="py-2 px-3 font-medium">{log.targetLabel}</td>
                        <td className="py-2 px-3 text-[var(--color-text-body)]">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal: School Feature Flags & Leveled Package Editor */}
      {flagEditorSchool && flagDraft && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-3xl p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  แพ็กเกจ &amp; โมดูลใช้งานทั้ง {FEATURE_FLAG_LABELS.length} ฟังก์ชัน: {flagEditorSchool.nameTh}
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  เลือกระดับแพ็กเกจ (Level 1–4) กำหนดสิทธิ์ AI นักเรียน หรือเปิด/ปิดแต่ละโมดูลเฉพาะแห่ง
                </p>
              </div>
              <button type="button" onClick={() => setFlagEditorSchool(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {packageCatalog.map((pkg) => {
                const isSelected = normalizeSchoolTier(flagDraft.tier) === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() =>
                      setFlagDraft(buildFlagsFromLevel(pkg.id, packageCatalog, flagDraft.allowStudentsAi))
                    }
                    className={`p-2.5 rounded-xl font-bold border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)]'
                    }`}
                  >
                    <div className="text-[10px] opacity-85">LEVEL {pkg.levelNumber}</div>
                    <div className="truncate">{pkg.nameTh.replace(/^Level \d+\s*·\s*/, '')}</div>
                    <div className="text-[10px] font-mono tabular-nums opacity-90">
                      ฿{pkg.yearlyPriceThb.toLocaleString()}/ปี · {countEnabledFeatures(pkg.features)} โมดูล
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>อนุญาตให้นักเรียนใช้งานฟังก์ชัน AI ของโรงเรียน (allowStudentsAi)</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  เปิด/ปิดสิทธิ์ฝั่งนักเรียนในการเข้า Career Quest AI, Socratic Tutor และ Snap &amp; Solve
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFlagDraft((prev) => prev ? { ...prev, allowStudentsAi: !prev.allowStudentsAi } : prev)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer ${
                  flagDraft.allowStudentsAi
                    ? 'bg-emerald-700 text-white'
                    : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                }`}
              >
                {flagDraft.allowStudentsAi ? 'เปิด AI นักเรียน' : 'ปิด AI นักเรียน'}
              </button>
            </div>

            <div className="space-y-3">
              {PACKAGE_CATEGORY_META.map((cat) => {
                const items = FEATURE_FLAG_LABELS.filter((item) => item.category === cat.id);
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="font-bold text-[var(--color-text-title)]">{cat.labelTh}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map((item) => {
                        const enabled = flagDraft[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setFlagDraft((prev) => prev ? { ...prev, [item.key]: !prev[item.key] } : prev)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${
                              enabled ? 'border-[var(--color-primary)] bg-[var(--color-card)]' : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-75'
                            }`}
                          >
                            <span className="font-semibold text-[var(--color-text-title)] truncate">{item.labelTh}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${enabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {enabled ? 'เปิด' : 'ปิด'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button type="button" onClick={() => setFlagEditorSchool(null)} className="px-3.5 py-2 rounded-lg border border-[var(--color-border)] cursor-pointer">
                ปิด
              </button>
              <button
                type="button"
                onClick={async () => {
                  await saveSchoolFeatureFlagsToDb(flagEditorSchool.id, flagDraft);
                  onUpdateSchoolFeatureFlags?.(flagEditorSchool.id, flagDraft);
                  showToast(`อัปเดตโมดูลใช้งานของ ${flagEditorSchool.nameTh} สำเร็จแล้ว`);
                  setFlagEditorSchool(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
              >
                บันทึกแพ็กเกจโมดูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Promotion */}
      {showNewPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>สร้างแคมเปญโปรโมชั่นใหม่ (Create Promotion)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPromoModal(false)}
                className="text-[var(--color-text-body)] hover:text-[var(--color-text-title)] text-sm font-bold px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-medium mb-1">โค้ดโปรโมชั่น (Promo Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น NEWCAMPUS30"
                    value={newPromoForm.code}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-primary-text)] font-mono font-bold focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--color-text-title)] font-medium mb-1">ประเภทส่วนลด</label>
                  <select
                    value={newPromoForm.discountType}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="percentage">เปอร์เซ็นต์ส่วนลด (%)</option>
                    <option value="fixed_amount">จำนวนเงินบาท (฿)</option>
                    <option value="free_trial_months">ทดลองใช้งานฟรี (เดือน)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-medium mb-1">
                    {newPromoForm.discountType === 'percentage'
                      ? 'เปอร์เซ็นต์ส่วนลด (%)'
                      : newPromoForm.discountType === 'fixed_amount'
                      ? 'จำนวนเงินส่วนลด (บาท)'
                      : 'จำนวนเดือนที่ให้ฟรี'}
                  </label>
                  <input
                    type="number"
                    required
                    value={newPromoForm.discountValue}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--color-text-title)] font-medium mb-1">โควตาสิทธิ์สูงสุด (สิทธิ์)</label>
                  <input
                    type="number"
                    required
                    value={newPromoForm.maxRedemptions}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, maxRedemptions: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-title)] font-medium mb-1">ชื่อแคมเปญ (ภาษาไทย)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ส่วนลดพิเศษสำหรับโรงเรียนเอกชนเปิดใหม่"
                  value={newPromoForm.titleTh}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, titleTh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-title)] font-medium mb-1">ใช้ได้กับประเภทโรงเรียน</label>
                  <select
                    value={newPromoForm.applicableSchoolType}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, applicableSchoolType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="all">ทุกประเภทสถานศึกษา (All)</option>
                    <option value="public">เฉพาะโรงเรียนรัฐบาล (Public)</option>
                    <option value="private">เฉพาะโรงเรียนเอกชน (Private)</option>
                    <option value="demonstration">เฉพาะโรงเรียนสาธิต</option>
                    <option value="international">เฉพาะโรงเรียนนานาชาติ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--color-text-title)] font-medium mb-1">วันหมดอายุโปรโมชั่น</label>
                  <input
                    type="date"
                    required
                    value={newPromoForm.validUntil}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-title)] font-medium mb-1">รายละเอียดและเงื่อนไข</label>
                <textarea
                  rows={2}
                  placeholder="ระบุเงื่อนไขการใช้งาน เช่น สำหรับสัญญา 1 ปีขึ้นไป..."
                  value={newPromoForm.descriptionTh}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, descriptionTh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPromoModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกแคมเปญ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(pendingRegConfirm)}
        tone={pendingRegConfirm?.mode === 'approve' ? 'primary' : 'danger'}
        title={
          pendingRegConfirm?.mode === 'approve'
            ? 'ยืนยันอนุมัติคำขอลงทะเบียนโรงเรียน'
            : 'ยืนยันยกเลิก/ลบคำขอลงทะเบียนโรงเรียน'
        }
        description={
          pendingRegConfirm?.mode === 'approve'
            ? pendingRegConfirm.registration.email_confirmed
              ? `อนุมัติบัญชีผู้ดูแล ${pendingRegConfirm.registration.email} และเปิดใช้งานโรงเรียน "${pendingRegConfirm.registration.school_name_th}" หรือไม่?`
              : `อีเมล ${pendingRegConfirm.registration.email} ยังไม่ยืนยันจากลิงก์ กรุณาตรวจสอบตัวตนผู้สมัครผ่านช่องทางอื่นก่อน ยืนยันเปิดใช้งานโรงเรียน "${pendingRegConfirm.registration.school_name_th}" หรือไม่?`
            : `ต้องการยกเลิกและลบคำขอลงทะเบียนโรงเรียน "${pendingRegConfirm?.registration.school_name_th || ''}" (${pendingRegConfirm?.registration.email || ''}) ออกจากระบบหรือไม่?`
        }
        detailNote={
          pendingRegConfirm?.mode === 'cancel'
            ? 'ระบบจะลบคำขอผู้ดูแลโรงเรียนและข้อมูลโรงเรียนที่รออนุมัติออกจากฐานข้อมูลและแคชของระบบ'
            : undefined
        }
        confirmLabel={pendingRegConfirm?.mode === 'approve' ? 'ยืนยันอนุมัติบัญชี' : 'ยืนยันยกเลิก/ลบคำขอ'}
        isBusy={approvingUserId !== null || cancellingUserId !== null}
        onCancel={() => {
          if (approvingUserId === null && cancellingUserId === null) {
            setPendingRegConfirm(null);
          }
        }}
        onConfirm={handleConfirmRegistrationAction}
      />
      <ConfirmActionModal
        isOpen={Boolean(pendingSchoolDeletion)}
        title="ยืนยันลบโรงเรียนถาวร"
        description={`ต้องการลบโรงเรียน "${pendingSchoolDeletion?.nameTh || ''}" (${pendingSchoolDeletion?.code || ''}) อย่างถาวรหรือไม่?`}
        detailNote="การดำเนินการนี้ย้อนกลับไม่ได้ ระบบจะลบข้อมูลโรงเรียน ข้อมูลที่เกี่ยวข้อง และบัญชีผู้ใช้ในโรงเรียนออกจากฐานข้อมูลทั้งหมด"
        confirmLabel="ลบโรงเรียนถาวร"
        isBusy={deletingSchoolId !== null}
        onCancel={() => {
          if (deletingSchoolId === null) setPendingSchoolDeletion(null);
        }}
        onConfirm={handleConfirmSchoolDeletion}
      />
    </div>
  );
};
