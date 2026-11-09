import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Tag, 
  Building2, 
  CheckCircle2, 
  MailCheck,
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
} from 'lucide-react';
import {
  approvePendingSchoolRegistration,
  listPendingSchoolRegistrations,
  PendingSchoolRegistration,
} from '../lib/authDb';
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
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'approvals' | 'permissions' | 'promotions' | 'schools'>('approvals');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingSchoolRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [registrationRefreshKey, setRegistrationRefreshKey] = useState(0);
  const [schoolStatusError, setSchoolStatusError] = useState<string | null>(null);
  const [updatingSchoolId, setUpdatingSchoolId] = useState<string | null>(null);

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
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>พอร์ทัลแม่ข่ายระดับสูงสุด • Super Admin Master Console</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            ศูนย์ควบคุมระบบและกำกับดูแลสถานศึกษา
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            ภาพรวมสถานศึกษา ตรวจสอบคำขอสมัคร และเลือกดูข้อมูลโรงเรียนเป็นรายแห่ง
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[90px]">
            <div className="text-xs text-slate-500">โรงเรียนในระบบ</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{schools.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center min-w-[90px]">
            <div className="text-xs text-amber-800">รออนุมัติ</div>
            <div className="text-xl font-extrabold text-amber-700 mt-0.5">
              {pendingRegistrations.length}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition ${
            activeSubTab === 'approvals'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MailCheck className="w-4 h-4" />
          <span>อนุมัติการสมัครโรงเรียน</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('schools')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition ${
            activeSubTab === 'schools'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>กำกับดูแลสถานศึกษาทั้งหมด ({schools.length} แห่ง)</span>
        </button>
      </div>

      {activeSubTab === 'approvals' && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">รายการสมัครโรงเรียนที่รอเปิดใช้งาน</h3>
              <p className="text-xs text-slate-500">
                อนุมัติเฉพาะผู้ดูแลโรงเรียนใหม่ที่ตรวจสอบตัวตนแล้ว การอนุมัติรายการที่ยังไม่ยืนยันอีเมลจะยืนยันอีเมลและเปิดใช้บัญชี/โรงเรียนด้วย
              </p>
            </div>
            {!isDemoMode && (
              <button
                type="button"
                onClick={() => setRegistrationRefreshKey((current) => current + 1)}
                disabled={registrationsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${registrationsLoading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
            การอนุมัติแทนการยืนยันอีเมลเป็นการข้ามการพิสูจน์การครอบครองอีเมล โปรดตรวจสอบผู้สมัครผ่านช่องทางอื่นก่อนทุกครั้ง
          </div>

          {isDemoMode ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              โหมดสาธิตไม่เชื่อมต่อข้อมูลผู้สมัครจริง กรุณาเข้าสู่ระบบด้วยบัญชี Super Admin เพื่อจัดการคำขอจริง
            </p>
          ) : (
            <>
              {registrationError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
                  {registrationError}
                </div>
              )}
              {registrationsLoading ? (
                <p className="text-sm text-slate-500 py-6 text-center">กำลังโหลดรายการสมัคร...</p>
              ) : pendingRegistrations.length === 0 && !registrationError ? (
                <p className="text-sm text-slate-500 py-6 text-center">ไม่มีรายการสมัครโรงเรียนที่รออนุมัติ</p>
              ) : pendingRegistrations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">สถานศึกษา</th>
                        <th className="py-2.5 px-3">ผู้สมัคร / อีเมล</th>
                        <th className="py-2.5 px-3">วันที่สมัคร</th>
                        <th className="py-2.5 px-3">สถานะอีเมล</th>
                        <th className="py-2.5 px-3 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingRegistrations.map((registration) => (
                        <tr key={registration.user_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{registration.school_name_th}</div>
                            <div className="text-[11px] text-slate-500">{registration.province}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900">{registration.full_name_th}</div>
                            <div className="text-[11px] font-mono text-slate-500">{registration.email}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(registration.registration_created_at).toLocaleString('th-TH')}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              registration.email_confirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {registration.email_confirmed ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void handleApproveRegistration(registration)}
                              disabled={approvingUserId !== null}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 text-[11px] font-bold"
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
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* View 1: RBAC Role & Permission Management */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-6">
          {/* Role selector tabs */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">เลือกบทบาทเพื่อกำหนดสิทธิ์ (Select Role to Configure)</h3>
                <p className="text-xs text-slate-500">
                  สิทธิ์ที่เปิดใช้งานจะถูกบังคับใช้กับผู้ใช้งานทุกคนที่มีบทบาทนี้ในระบบ
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200">
                {rolePermissions.map((rp) => (
                  <button
                    key={rp.role}
                    type="button"
                    onClick={() => setSelectedRole(rp.role)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      selectedRole === rp.role
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
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
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 block">{currentRoleConfig.roleNameTh}</span>
                <span className="text-slate-500">{currentRoleConfig.descriptionTh}</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                Role: {currentRoleConfig.role}
              </span>
            </div>

            {/* Permission Switches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {(Object.keys(currentRoleConfig.permissions) as Array<keyof RolePermissionConfig['permissions']>).map((permKey) => {
                const isEnabled = currentRoleConfig.permissions[permKey];
                const meta = permissionLabels[permKey];

                return (
                  <div
                    key={permKey}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isEnabled
                        ? 'bg-white border-blue-200 shadow-xs'
                        : 'bg-slate-50/50 border-slate-200 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        {isEnabled ? (
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{meta.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{meta.desc}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePermission(permKey)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-blue-600' : 'bg-slate-300'
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
          </div>

          {/* User Accounts Overview */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              <span>บัญชีผู้ใช้งานในระบบทั้งหมด (All Registered Accounts)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2.5 px-3">อีเมล / บัญชี</th>
                    <th className="py-2.5 px-3">บทบาท (Role)</th>
                    <th className="py-2.5 px-3">โรงเรียนที่สังกัด</th>
                    <th className="py-2.5 px-3 text-right">สถานะบัญชี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.map((u) => {
                    const sch = schools.find((s) => s.id === u.schoolId);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-slate-900">
                          <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                          <span>{u.fullNameTh}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'super_admin'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : u.role === 'teacher'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{sch?.nameTh || u.schoolId}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
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
          </div>
        </div>
      )}

      {/* View 2: Promotions & School Subscription Packages */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-6">
          {/* Header + Add Promo Button */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">แคมเปญโปรโมชั่นที่เปิดใช้งาน (Active Promotion Campaigns)</h3>
                <p className="text-xs text-slate-500">
                  กำหนดโค้ดส่วนลด อัตราค่าบริการรายปี หรือสิทธิ์ทดลองใช้ฟรีสำหรับสถานศึกษา
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewPromoModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างโปรโมชั่นใหม่ (New Campaign)</span>
              </button>
            </div>

            {/* Promotions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold">
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
                <tbody className="divide-y divide-slate-100">
                  {promotions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          {p.code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{p.titleTh}</div>
                        <div className="text-[11px] text-slate-500">{p.descriptionTh}</div>
                      </td>
                      <td className="py-3 px-3">
                        {p.discountType === 'percentage'
                          ? 'ลดเป็นเปอร์เซ็นต์ (%)'
                          : p.discountType === 'fixed_amount'
                          ? 'ลดเป็นจำนวนเงิน (฿)'
                          : 'ทดลองใช้ฟรี (เดือน)'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {p.discountType === 'percentage'
                          ? `${p.discountValue}%`
                          : p.discountType === 'fixed_amount'
                          ? `฿${p.discountValue.toLocaleString()}`
                          : `${p.discountValue} เดือน`}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {p.currentRedemptions} / {p.maxRedemptions} สิทธิ์
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.validUntil}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status === 'active' ? 'เปิดใช้งาน' : 'หมดอายุ'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleTogglePromoStatus(p.id)}
                          className="text-xs text-blue-700 hover:underline font-medium"
                        >
                          {p.status === 'active' ? 'พักแคมเปญ' : 'เปิดใหม่'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Apply Promo to School Form */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-700" />
              <span>ผูกโปรโมชั่นและแพ็กเกจให้สถานศึกษา (Assign Promotion to School)</span>
            </h3>

            <form onSubmit={handleApplyPromoToSchool} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-end">
              <div>
                <label className="block text-slate-700 font-medium mb-1">เลือกโรงเรียน</label>
                <select
                  value={selectedSchoolForPromo}
                  onChange={(e) => setSelectedSchoolForPromo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {schools.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.nameTh} ({sch.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">เลือกแคมเปญโปรโมชั่น</label>
                <select
                  value={selectedPromoCodeToApply}
                  onChange={(e) => setSelectedPromoCodeToApply(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
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
                  className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition"
                >
                  บันทึกการผูกโปรโมชั่น
                </button>
              </div>
            </form>

            {/* School Subscriptions Status Overview */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">สถานะแพ็กเกจปัจจุบันของสถานศึกษา</h4>
              <div className="space-y-2">
                {schools.map((sch) => {
                  const plan = subscriptionPlans.find((p) => p.schoolId === sch.id);
                  return (
                    <div
                      key={sch.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{sch.nameTh}</span>
                        <div className="text-[11px] text-slate-500">
                          แพ็กเกจ: <strong className="text-slate-800">{plan?.planName || 'Enterprise'}</strong> • รองรับนักเรียนสูงสุด {plan?.maxStudents || 3000} คน
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-blue-700 font-mono text-sm">
                          ฿{plan?.finalPrice?.toLocaleString() || '11,250'} / ปี
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          โค้ดที่ใช้: {sch.appliedPromoCode || plan?.appliedPromoCode || 'BACK2SCHOOL26'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 3: All Schools Directory & Tenant Governance */}
      {activeSubTab === 'schools' && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          {schoolStatusError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
              {schoolStatusError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">ทะเบียนสถาบันการศึกษาทั้งหมด (Registered Institutions)</h3>
              <p className="text-xs text-slate-500">
                กำกับดูแลสถานะการใช้งาน ตรวจสอบจำนวนนักเรียน และระงับ/เปิดใช้งานสถานศึกษา
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">รหัสโรงเรียน</th>
                  <th className="py-2.5 px-3">ชื่อสถานศึกษา</th>
                  <th className="py-2.5 px-3">ประเภท</th>
                  <th className="py-2.5 px-3">จังหวัด</th>
                  <th className="py-2.5 px-3">นักเรียน / ครู</th>
                  <th className="py-2.5 px-3">โปรโมชั่นที่ใช้</th>
                  <th className="py-2.5 px-3 text-right">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{s.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{s.nameTh}</div>
                      <div className="text-[11px] text-slate-500">{s.nameEn}</div>
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-700">{s.type}</td>
                    <td className="py-3 px-3 text-slate-600">{s.province}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900">{s.studentsCount}</span> คน / {s.teachersCount} ครู
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        {s.appliedPromoCode || 'BACK2SCHOOL26'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
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
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline mr-3"
                      >
                        ดูข้อมูลโรงเรียน
                      </button>
                      {s.status === 'pending' ? (
                        <span className="text-xs text-slate-400">รออนุมัติจากคิวสมัคร</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleToggleSchoolStatus(s.id)}
                          disabled={updatingSchoolId !== null}
                          className={`text-xs font-medium hover:underline ${
                            s.status === 'active' ? 'text-rose-600' : 'text-emerald-600'
                          } disabled:opacity-50`}
                        >
                          {updatingSchoolId === s.id ? 'กำลังบันทึก...' : s.status === 'active' ? 'ระงับสิทธิ์' : 'เปิดใช้งาน'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create New Promotion */}
      {showNewPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-700" />
                <span>สร้างแคมเปญโปรโมชั่นใหม่ (Create Promotion)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPromoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">โค้ดโปรโมชั่น (Promo Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น NEWCAMPUS30"
                    value={newPromoForm.code}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">ประเภทส่วนลด</label>
                  <select
                    value={newPromoForm.discountType}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="percentage">เปอร์เซ็นต์ส่วนลด (%)</option>
                    <option value="fixed_amount">จำนวนเงินบาท (฿)</option>
                    <option value="free_trial_months">ทดลองใช้งานฟรี (เดือน)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
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
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">โควตาสิทธิ์สูงสุด (สิทธิ์)</label>
                  <input
                    type="number"
                    required
                    value={newPromoForm.maxRedemptions}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, maxRedemptions: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">ชื่อแคมเปญ (ภาษาไทย)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ส่วนลดพิเศษสำหรับโรงเรียนเอกชนเปิดใหม่"
                  value={newPromoForm.titleTh}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, titleTh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">ใช้ได้กับประเภทโรงเรียน</label>
                  <select
                    value={newPromoForm.applicableSchoolType}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, applicableSchoolType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="all">ทุกประเภทสถานศึกษา (All)</option>
                    <option value="public">เฉพาะโรงเรียนรัฐบาล (Public)</option>
                    <option value="private">เฉพาะโรงเรียนเอกชน (Private)</option>
                    <option value="demonstration">เฉพาะโรงเรียนสาธิต</option>
                    <option value="international">เฉพาะโรงเรียนนานาชาติ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">วันหมดอายุโปรโมชั่น</label>
                  <input
                    type="date"
                    required
                    value={newPromoForm.validUntil}
                    onChange={(e) => setNewPromoForm({ ...newPromoForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">รายละเอียดและเงื่อนไข</label>
                <textarea
                  rows={2}
                  placeholder="ระบุเงื่อนไขการใช้งาน เช่น สำหรับสัญญา 1 ปีขึ้นไป..."
                  value={newPromoForm.descriptionTh}
                  onChange={(e) => setNewPromoForm({ ...newPromoForm, descriptionTh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPromoModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs flex items-center gap-1.5"
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
