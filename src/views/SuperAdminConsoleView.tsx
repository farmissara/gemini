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
} from 'lucide-react';
import { SuperAdminCentralExamManager } from './SuperAdminCentralExamManager';
import { CentralExamPaymentSettingsView } from './CentralExamPaymentSettingsView';
import {
  approvePendingSchoolRegistration,
  listPendingSchoolRegistrations,
  PendingSchoolRegistration,
} from '../lib/authDb';
import { fetchSchoolCounts } from '../lib/supabase';
import { 
  School, 
  AuthUser, 
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
  onUpdateRolePermissions: React.Dispatch<React.SetStateAction<RolePermissionConfig[]>>;
  promotions: PromotionCampaign[];
  onUpdatePromotions: React.Dispatch<React.SetStateAction<PromotionCampaign[]>>;
  subscriptionPlans: SchoolSubscriptionPlan[];
  onUpdateSubscriptionPlans: React.Dispatch<React.SetStateAction<SchoolSubscriptionPlan[]>>;
  allUsers: AuthUser[];
  onToggleUserStatus?: (userId: string) => void;
  lang: AppLanguage;
  isDemoMode: boolean;
  onViewSchool: (school: School) => void;
  onToggleSchoolStatus: (schoolId: string, status: School['status']) => Promise<void>;
  coordinationUnreadCount?: number;
  onOpenCoordinationDesk?: () => void;
  initialSubTab?: 'approvals' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment';
}

export const SuperAdminConsoleView: React.FC<SuperAdminConsoleViewProps> = ({
  schools,
  onUpdateSchools,
  rolePermissions,
  onUpdateRolePermissions,
  promotions,
  onUpdatePromotions,
  subscriptionPlans,
  onUpdateSubscriptionPlans,
  allUsers,
  lang,
  isDemoMode,
  onViewSchool,
  onToggleSchoolStatus,
  coordinationUnreadCount = 0,
  onOpenCoordinationDesk,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'approvals' | 'permissions' | 'promotions' | 'schools' | 'central_exams' | 'exam_payment'>(
    initialSubTab || 'approvals'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingSchoolRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [registrationRefreshKey, setRegistrationRefreshKey] = useState(0);
  const [schoolStatusError, setSchoolStatusError] = useState<string | null>(null);
  const [updatingSchoolId, setUpdatingSchoolId] = useState<string | null>(null);
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
    fetchSchoolCounts(schoolIds)
      .then(counts => {
        setLiveSchoolCounts(counts);
      })
      .finally(() => {
        setIsCountingSchools(false);
      });
  };

  useEffect(() => {
    refreshLiveSchoolCounts();
  }, [schools, activeSubTab, registrationRefreshKey, isDemoMode]);

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

  const handleApproveRegistration = async (registration: PendingSchoolRegistration) => {
    const confirmation = registration.email_confirmed
      ? `อนุมัติบัญชีผู้ดูแล ${registration.email} และเปิดใช้งานโรงเรียน ${registration.school_name_th} หรือไม่?`
      : `อีเมล ${registration.email} ยังไม่ยืนยันจากลิงก์ กรุณาตรวจสอบตัวตนผู้สมัครผ่านช่องทางอื่นก่อนดำเนินการ ยืนยันอีเมลและเปิดใช้งานบัญชี/โรงเรียนนี้หรือไม่?`;
    if (!window.confirm(confirmation)) return;

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
    }
  };

  // Current active role config
  const currentRoleConfig = rolePermissions.find((r) => r.role === selectedRole) || rolePermissions[0];

  // Toggle specific permission
  const handleTogglePermission = (permKey: keyof RolePermissionConfig['permissions']) => {
    onUpdateRolePermissions((prev) =>
      prev.map((r) => {
        if (r.role === selectedRole) {
          return {
            ...r,
            permissions: {
              ...r.permissions,
              [permKey]: !r.permissions[permKey],
            },
          };
        }
        return r;
      })
    );
    showToast(`อัปเดตสิทธิ์ "${permKey}" ของบทบาท ${selectedRole} เรียบร้อยแล้ว`);
  };

  // Add new promotion campaign
  const handleCreatePromo = (e: React.FormEvent) => {
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

    onUpdatePromotions((prev) => [newCampaign, ...prev]);
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
  const handleTogglePromoStatus = (promoId: string) => {
    onUpdatePromotions((prev) =>
      prev.map((p) => {
        if (p.id === promoId) {
          const nextStatus = p.status === 'active' ? 'expired' : 'active';
          return { ...p, status: nextStatus };
        }
        return p;
      })
    );
    showToast('ปรับปรุงสถานะแคมเปญโปรโมชั่นเรียบร้อยแล้ว');
  };

  // Apply promotion to school
  const handleApplyPromoToSchool = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchool = schools.find((s) => s.id === selectedSchoolForPromo);
    const targetPromo = promotions.find((p) => p.code === selectedPromoCodeToApply);

    if (!targetSchool || !targetPromo) return;

    // Update school record
    onUpdateSchools((prev) =>
      prev.map((s) => (s.id === targetSchool.id ? { ...s, appliedPromoCode: targetPromo.code } : s))
    );

    // Update plan fee
    onUpdateSubscriptionPlans((prev) => {
      const existing = prev.find((p) => p.schoolId === targetSchool.id);
      const baseFee = existing ? existing.monthlyFee : 6500;
      let finalPrice = baseFee;

      if (targetPromo.discountType === 'percentage') {
        finalPrice = Math.round(baseFee * (1 - targetPromo.discountValue / 100));
      } else if (targetPromo.discountType === 'fixed_amount') {
        finalPrice = Math.max(0, baseFee - targetPromo.discountValue);
      } else if (targetPromo.discountType === 'free_trial_months') {
        finalPrice = 0;
      }

      if (existing) {
        return prev.map((p) =>
          p.schoolId === targetSchool.id
            ? { ...p, appliedPromoCode: targetPromo.code, finalPrice }
            : p
        );
      } else {
        const newPlan: SchoolSubscriptionPlan = {
          id: `sub-${Date.now()}`,
          schoolId: targetSchool.id,
          schoolName: targetSchool.nameTh,
          planName: 'Professional',
          maxStudents: 1500,
          monthlyFee: baseFee,
          appliedPromoCode: targetPromo.code,
          finalPrice,
          billingCycle: 'yearly',
          status: 'active',
          expiryDate: '2027-05-31',
        };
        return [newPlan, ...prev];
      }
    });

    // Increment promotion redemptions
    onUpdatePromotions((prev) =>
      prev.map((p) => (p.id === targetPromo.id ? { ...p, currentRedemptions: p.currentRedemptions + 1 } : p))
    );

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
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Super Admin Identity Banner */}
      <div className="app-page-header p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-xs font-bold border border-[var(--color-border)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>พอร์ทัลแม่ข่ายระดับสูงสุด • Super Admin Master Console</span>
            </div>
            <a
              href="mailto:farmissara@gmail.com"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold border border-blue-200 dark:border-blue-800 hover:underline"
              title="อีเมล Master สำหรับตอบกลับยืนยันและรีเซ็ตรหัสผ่าน"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Master: farmissara@gmail.com</span>
            </a>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[var(--color-text-title)] tracking-tight">
            ศูนย์ควบคุมระบบและกำกับดูแลสถานศึกษา
          </h1>
          <p className="text-xs text-[var(--color-text-body)] max-w-2xl">
            ภาพรวมสถานศึกษา ตรวจสอบคำขอสมัคร และเลือกดูข้อมูลโรงเรียนเป็นรายแห่ง
          </p>
        </div>

        {/* Quick KPI stats & Urgent Desk Link */}
        <div className="flex flex-wrap items-center gap-3">
          {onOpenCoordinationDesk && (
            <button
              type="button"
              onClick={onOpenCoordinationDesk}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>แชต/จดหมายโรงเรียน</span>
              {coordinationUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold tabular-nums">
                  {coordinationUnreadCount} ใหม่
                </span>
              )}
            </button>
          )}
          <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-center min-w-[90px]">
            <div className="text-xs text-[var(--color-text-muted)]">โรงเรียนในระบบ</div>
            <div className="text-xl font-extrabold text-[var(--color-text-title)] mt-0.5 tabular-nums">{schools.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-center min-w-[90px]">
            <div className="text-xs text-amber-900 dark:text-amber-200 font-semibold">รออนุมัติ</div>
            <div className="text-xl font-extrabold text-amber-900 dark:text-amber-100 mt-0.5 tabular-nums">
              {pendingRegistrations.length}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center border-b border-[var(--color-border)] gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSubTab === 'approvals'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <MailCheck className="w-4 h-4" />
          <span>อนุมัติการสมัครโรงเรียน</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('schools')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSubTab === 'schools'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>กำกับดูแลสถานศึกษาทั้งหมด ({schools.length} แห่ง)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('central_exams')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSubTab === 'central_exams'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)]'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>คลังข้อสอบกลาง (8 สาระ)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('exam_payment')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSubTab === 'exam_payment'
              ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] font-extrabold'
              : 'border-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>ตั้งค่า QR PromptPay รับเงินข้อสอบ</span>
        </button>
      </div>

      {activeSubTab === 'approvals' && (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">รายการสมัครโรงเรียนที่รอเปิดใช้งาน</h3>
              <p className="text-xs text-[var(--color-text-body)]">
                อนุมัติเฉพาะผู้ดูแลโรงเรียนใหม่ที่ตรวจสอบตัวตนแล้ว การอนุมัติรายการที่ยังไม่ยืนยันอีเมลจะยืนยันอีเมลและเปิดใช้บัญชี/โรงเรียนด้วย
              </p>
            </div>
            {!isDemoMode && (
              <button
                type="button"
                onClick={() => setRegistrationRefreshKey((current) => current + 1)}
                disabled={registrationsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${registrationsLoading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            )}
          </div>

          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 px-3.5 py-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
            การอนุมัติแทนการยืนยันอีเมลเป็นการข้ามการพิสูจน์การครอบครองอีเมล โปรดตรวจสอบผู้สมัครผ่านช่องทางอื่นก่อนทุกครั้ง
          </div>

          {isDemoMode ? (
            <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
              โหมดสาธิตไม่เชื่อมต่อข้อมูลผู้สมัครจริง กรุณาเข้าสู่ระบบด้วยบัญชี Super Admin เพื่อจัดการคำขอจริง
            </p>
          ) : (
            <>
              {registrationError && (
                <div role="alert" className="rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-100 dark:bg-rose-950 px-3.5 py-3 text-xs text-rose-900 dark:text-rose-200 font-medium">
                  {registrationError}
                </div>
              )}
              {registrationsLoading ? (
                <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">กำลังโหลดรายการสมัคร...</p>
              ) : pendingRegistrations.length === 0 && !registrationError ? (
                <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">ไม่มีรายการสมัครโรงเรียนที่รออนุมัติ</p>
              ) : pendingRegistrations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">สถานศึกษา</th>
                        <th className="py-2.5 px-3">ผู้สมัคร / อีเมล</th>
                        <th className="py-2.5 px-3">วันที่สมัคร</th>
                        <th className="py-2.5 px-3">สถานะอีเมล</th>
                        <th className="py-2.5 px-3 text-right">การจัดการ</th>
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              registration.email_confirmed
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            }`}>
                              {registration.email_confirmed ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void handleApproveRegistration(registration)}
                              disabled={approvingUserId !== null}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 text-[11px] font-bold cursor-pointer"
                            >
                              {approvingUserId === registration.user_id
                                ? 'กำลังอนุมัติ...'
                                : registration.email_confirmed
                                ? 'อนุมัติบัญชี'
                                : 'ยืนยันอีเมลและอนุมัติ'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pendingRegistrations.length > 4 && (
                    <div className="flex items-center justify-between p-3 text-xs text-[var(--color-text-body)]">
                      <button type="button" onClick={() => setApprovalPage(page => Math.max(0, page - 1))} disabled={approvalPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                      <span>หน้า {approvalPage + 1} / {Math.ceil(pendingRegistrations.length / 4)} · {pendingRegistrations.length} รายการ</span>
                      <button type="button" onClick={() => setApprovalPage(page => Math.min(Math.ceil(pendingRegistrations.length / 4) - 1, page + 1))} disabled={approvalPage >= Math.ceil(pendingRegistrations.length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
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
        <div className="space-y-6">
          <div className="flex gap-2">
            <button type="button" onClick={() => setPermissionSection('policies')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${permissionSection === 'policies' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)]'}`}>กำหนดสิทธิ์</button>
            <button type="button" onClick={() => setPermissionSection('accounts')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${permissionSection === 'accounts' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)]'}`}>บัญชีผู้ใช้ ({allUsers.length})</button>
          </div>
          {permissionSection === 'policies' && (
          <>
          {/* Role selector tabs */}
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">เลือกบทบาทเพื่อกำหนดสิทธิ์ (Select Role to Configure)</h3>
                <p className="text-xs text-[var(--color-text-body)]">
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
              <div className="flex items-center justify-between pt-2 text-xs text-[var(--color-text-body)]">
                <button type="button" onClick={() => setPermissionPage(page => Math.max(0, page - 1))} disabled={permissionPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span>หน้า {permissionPage + 1} / {Math.ceil(Object.keys(currentRoleConfig.permissions).length / 4)} · {Object.keys(currentRoleConfig.permissions).length} สิทธิ์</span>
                <button type="button" onClick={() => setPermissionPage(page => Math.min(Math.ceil(Object.keys(currentRoleConfig.permissions).length / 4) - 1, page + 1))} disabled={permissionPage >= Math.ceil(Object.keys(currentRoleConfig.permissions).length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}
          </div>
          </>
          )}

          {/* User Accounts Overview */}
          {permissionSection === 'accounts' && <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>บัญชีผู้ใช้งานในระบบทั้งหมด (All Registered Accounts)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                  {allUsers.slice(accountPage * 5, (accountPage + 1) * 5).map((u) => {
                    const sch = schools.find((s) => s.id === u.schoolId);
                    return (
                      <tr key={u.id} className="hover:bg-[var(--color-card-subtle)]">
                        <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-[var(--color-text-title)]">
                          <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                          <span>{u.fullNameTh}</span>
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
                        <td className="py-2.5 px-3 text-[var(--color-text-body)]">{sch?.nameTh || u.schoolId}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {allUsers.length > 5 && (
              <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                <button type="button" onClick={() => setAccountPage(page => Math.max(0, page - 1))} disabled={accountPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span>หน้า {accountPage + 1} / {Math.ceil(allUsers.length / 5)} · {allUsers.length} บัญชี</span>
                <button type="button" onClick={() => setAccountPage(page => Math.min(Math.ceil(allUsers.length / 5) - 1, page + 1))} disabled={accountPage >= Math.ceil(allUsers.length / 5) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}
          </div>}
        </div>
      )}

      {/* View 2: Promotions & School Subscription Packages */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button type="button" onClick={() => setPromotionSection('campaigns')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${promotionSection === 'campaigns' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)]'}`}>แคมเปญ ({promotions.length})</button>
            <button type="button" onClick={() => setPromotionSection('assignments')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${promotionSection === 'assignments' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)]'}`}>ผูกแพ็กเกจโรงเรียน</button>
          </div>
          {promotionSection === 'campaigns' && (
          <>
          {/* Header + Add Promo Button */}
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">แคมเปญโปรโมชั่นที่เปิดใช้งาน (Active Promotion Campaigns)</h3>
                <p className="text-xs text-[var(--color-text-body)]">
                  กำหนดโค้ดส่วนลด อัตราค่าบริการรายปี หรือสิทธิ์ทดลองใช้ฟรีสำหรับสถานศึกษา
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewPromoModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างโปรโมชั่นใหม่ (New Campaign)</span>
              </button>
            </div>

            {/* Promotions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">โค้ดโปรโมชั่น</th>
                    <th className="py-2.5 px-3">ชื่อแคมเปญ</th>
                    <th className="py-2.5 px-3">ประเภทส่วนลด</th>
                    <th className="py-2.5 px-3">มูลค่าส่วนลด</th>
                    <th className="py-2.5 px-3">ใช้ไปแล้ว / โควตา</th>
                    <th className="py-2.5 px-3">วันหมดเขต</th>
                    <th className="py-2.5 px-3 text-right">สถานะ</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-body)]">
                  {promotions.slice(promotionPage * 4, (promotionPage + 1) * 4).map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--color-card-subtle)]">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[var(--color-primary-text)] bg-[var(--color-primary-light)] px-2 py-1 rounded border border-[var(--color-border)]">
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
                      <td className="py-3 px-3 font-bold text-[var(--color-text-title)]">
                        {p.discountType === 'percentage'
                          ? `${p.discountValue}%`
                          : p.discountType === 'fixed_amount'
                          ? `฿${p.discountValue.toLocaleString()}`
                          : `${p.discountValue} เดือน`}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {p.currentRedemptions} / {p.maxRedemptions} สิทธิ์
                      </td>
                      <td className="py-3 px-3 text-[var(--color-text-muted)]">{p.validUntil}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                            : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                        }`}>
                          {p.status === 'active' ? 'เปิดใช้งาน' : 'หมดอายุ'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleTogglePromoStatus(p.id)}
                          className="text-xs text-[var(--color-primary-text)] hover:underline font-medium cursor-pointer"
                        >
                          {p.status === 'active' ? 'พักแคมเปญ' : 'เปิดใหม่'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {promotions.length > 4 && (
              <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                <button type="button" onClick={() => setPromotionPage(page => Math.max(0, page - 1))} disabled={promotionPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span>หน้า {promotionPage + 1} / {Math.ceil(promotions.length / 4)} · {promotions.length} แคมเปญ</span>
                <button type="button" onClick={() => setPromotionPage(page => Math.min(Math.ceil(promotions.length / 4) - 1, page + 1))} disabled={promotionPage >= Math.ceil(promotions.length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}
          </div>
          </>
          )}

          {/* Quick Apply Promo to School Form */}
          {promotionSection === 'assignments' && <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>ผูกโปรโมชั่นและแพ็กเกจให้สถานศึกษา (Assign Promotion to School)</span>
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
                  className="w-full py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shadow-xs transition cursor-pointer"
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
                      className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--color-text-title)]">{sch.nameTh}</span>
                        <div className="text-[11px] text-[var(--color-text-body)]">
                          แพ็กเกจ: <strong className="text-[var(--color-text-title)]">{plan?.planName || 'Enterprise'}</strong> • รองรับนักเรียนสูงสุด {plan?.maxStudents || 3000} คน
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[var(--color-primary-text)] font-mono text-sm">
                          ฿{plan?.finalPrice?.toLocaleString() || '11,250'} / ปี
                        </div>
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">
                          โค้ดที่ใช้: {sch.appliedPromoCode || plan?.appliedPromoCode || 'BACK2SCHOOL26'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {schools.length > 4 && (
                <div className="flex items-center justify-between text-xs pt-2 text-[var(--color-text-body)]">
                  <button type="button" onClick={() => setSubscriptionPage(page => Math.max(0, page - 1))} disabled={subscriptionPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                  <span>หน้า {subscriptionPage + 1} / {Math.ceil(schools.length / 4)} · {schools.length} โรงเรียน</span>
                  <button type="button" onClick={() => setSubscriptionPage(page => Math.min(Math.ceil(schools.length / 4) - 1, page + 1))} disabled={subscriptionPage >= Math.ceil(schools.length / 4) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
                </div>
              )}
            </div>
          </div>}
        </div>
      )}

      {/* View 3: All Schools Directory & Tenant Governance */}
      {activeSubTab === 'schools' && (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
          {schoolStatusError && (
            <div role="alert" className="rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-100 dark:bg-rose-950 px-3.5 py-3 text-xs text-rose-900 dark:text-rose-200 font-medium">
              {schoolStatusError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">ทะเบียนสถาบันการศึกษาทั้งหมด (Registered Institutions)</h3>
              <p className="text-xs text-[var(--color-text-body)]">
                กำกับดูแลสถานะการใช้งาน ตรวจสอบจำนวนนักเรียน และระงับ/เปิดใช้งานสถานศึกษา
              </p>
            </div>
            <button
              type="button"
              onClick={refreshLiveSchoolCounts}
              disabled={isCountingSchools}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-primary-light)] hover:opacity-90 text-[var(--color-primary-text)] text-xs font-bold flex items-center gap-1.5 border border-[var(--color-border)] transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCountingSchools ? 'animate-spin' : ''}`} />
              <span>{isCountingSchools ? 'กำลังอัปเดตยอด...' : 'รีเฟรชยอดนักเรียน/ครูจริง'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">รหัสโรงเรียน</th>
                  <th className="py-2.5 px-3">ชื่อสถานศึกษา</th>
                  <th className="py-2.5 px-3">ประเภท</th>
                  <th className="py-2.5 px-3">จังหวัด</th>
                  <th className="py-2.5 px-3">นักเรียน / ครู (จริง)</th>
                  <th className="py-2.5 px-3">โปรโมชั่นที่ใช้</th>
                  <th className="py-2.5 px-3 text-right">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-body)]">
                {schools.slice(schoolPage * 4, (schoolPage + 1) * 4).map((s) => {
                  const live = liveSchoolCounts[s.id];
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
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-700">
                        {s.appliedPromoCode || 'BACK2SCHOOL26'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        s.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                      }`}>
                        {s.status === 'active'
                          ? 'เปิดใช้งาน'
                          : s.status === 'pending'
                            ? 'รออนุมัติ'
                            : 'ระงับชั่วคราว'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewSchool(s)}
                        className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline mr-3 cursor-pointer"
                      >
                        ดูข้อมูลโรงเรียน
                      </button>
                      {s.status === 'pending' ? (
                        <span className="text-xs text-[var(--color-text-muted)]">รออนุมัติจากคิวสมัคร</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleToggleSchoolStatus(s.id)}
                          disabled={updatingSchoolId !== null}
                          className={`text-xs font-medium hover:underline cursor-pointer ${
                            s.status === 'active' ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
                          } disabled:opacity-50`}
                        >
                          {updatingSchoolId === s.id ? 'กำลังบันทึก...' : s.status === 'active' ? 'ระงับสิทธิ์' : 'เปิดใช้งาน'}
                        </button>
                      )}
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
        <CentralExamPaymentSettingsView adminEmail="farmissara@gmail.com" />
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
    </div>
  );
};
