import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { QrCodeMatrix } from '../QrCodeMatrix';
import {
  fetchCentralExamPaymentSettings,
  generatePromptPayPayload,
  loadCentralExamPaymentSettings,
} from '../../lib/centralExamBank';
import {
  AI_FEATURE_FLAG_KEYS,
  DEFAULT_PACKAGE_CATALOG,
  FEATURE_FLAG_LABELS,
  PACKAGE_CATEGORY_META,
  buildFlagsFromLevel,
  countEnabledFeatures,
  getPackageLevelLabel,
  normalizeSchoolTier,
} from '../../lib/schoolFeatureFlags';
import {
  loadPackageCatalog,
  loadSchoolPackageOrders,
  saveSchoolFeatureFlagsToDb,
  submitSchoolPackageOrder,
} from '../../lib/schoolPackageStore';
import type {
  AppLanguage,
  AuthUser,
  PackageLevelConfig,
  PromotionCampaign,
  School,
  SchoolFeatureFlagKey,
  SchoolFeatureFlags,
  SchoolPackagePurchaseOrder,
  UserRole,
} from '../../types';

interface SchoolPackagesAndAiPanelProps {
  activeSchool: School;
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  lang: AppLanguage;
  flags: SchoolFeatureFlags;
  promotions?: PromotionCampaign[];
  onUpdateFlags: (next: SchoolFeatureFlags) => void;
}

export const SchoolPackagesAndAiPanel: React.FC<SchoolPackagesAndAiPanelProps> = ({
  activeSchool,
  currentRole,
  currentUser,
  lang,
  flags,
  promotions = [],
  onUpdateFlags,
}) => {
  const [catalog, setCatalog] = useState<PackageLevelConfig[]>(DEFAULT_PACKAGE_CATALOG);
  const [orders, setOrders] = useState<SchoolPackagePurchaseOrder[]>([]);
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('yearly');

  const [aiHealthLoading, setAiHealthLoading] = useState(true);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [savingFlagsNotice, setSavingFlagsNotice] = useState<string | null>(null);

  // Checkout Modal State
  const [checkoutPkg, setCheckoutPkg] = useState<PackageLevelConfig | null>(null);
  const [paymentSettings, setPaymentSettings] = useState(() => fetchCentralExamPaymentSettings());
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'invoice'>('promptpay');
  const [transferNote, setTransferNote] = useState('');
  const [slipDataUrl, setSlipDataUrl] = useState<string | undefined>(undefined);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  const checkServerAiHealth = async () => {
    setAiHealthLoading(true);
    try {
      const resp = await fetch('/api/health');
      if (resp.ok) {
        const json = (await resp.json()) as { geminiConfigured?: boolean };
        setGeminiConfigured(Boolean(json.geminiConfigured));
      } else {
        setGeminiConfigured(false);
      }
    } catch {
      setGeminiConfigured(false);
    } finally {
      setAiHealthLoading(false);
    }
  };

  useEffect(() => {
    void checkServerAiHealth();
    void loadPackageCatalog().then(({ catalog: c }) => setCatalog(c));
    void loadSchoolPackageOrders(activeSchool.id).then(setOrders);
    void loadCentralExamPaymentSettings().then(setPaymentSettings);
  }, [activeSchool.id]);

  const currentLevelId = normalizeSchoolTier(flags.tier);
  const currentLevelConfig = useMemo(
    () => catalog.find((p) => p.id === currentLevelId) || catalog[0],
    [catalog, currentLevelId]
  );

  const anyAiModuleUnlocked = useMemo(
    () => AI_FEATURE_FLAG_KEYS.some((k) => Boolean(flags[k])),
    [flags]
  );

  const enabledCount = countEnabledFeatures(flags);

  const persistFlags = async (next: SchoolFeatureFlags, message: string) => {
    onUpdateFlags(next);
    const res = await saveSchoolFeatureFlagsToDb(activeSchool.id, next);
    setSavingFlagsNotice(res.warning ? `${message} (${res.warning})` : message);
  };

  const handleToggleStudentAi = async () => {
    if (!anyAiModuleUnlocked && currentRole !== 'super_admin') {
      setSavingFlagsNotice('แพ็กเกจปัจจุบันยังไม่ได้ปลดล็อกโมดูล AI กรุณาอัปเกรดเป็น Level 4 เพื่อเปิดใช้งานชุด AI สำหรับนักเรียน');
      return;
    }
    const next: SchoolFeatureFlags = {
      ...flags,
      allowStudentsAi: !flags.allowStudentsAi,
    };
    await persistFlags(
      next,
      next.allowStudentsAi
        ? 'เปิดสิทธิ์ให้นักเรียนในโรงเรียนเข้าใช้งานฟังก์ชัน AI เรียบร้อยแล้ว'
        : 'ปิดสิทธิ์การเข้าถึงฟังก์ชัน AI ของนักเรียนเรียบร้อยแล้ว'
    );
  };

  const handleToggleModuleFlag = async (key: SchoolFeatureFlagKey, includedInCurrentLevel: boolean) => {
    // School Admin can toggle modules included in their purchased level (cannot bypass locked higher-level modules)
    const currentlyEnabled = Boolean(flags[key]);
    if (currentRole !== 'super_admin' && !includedInCurrentLevel && !currentlyEnabled) {
      setSavingFlagsNotice('โมดูลนี้สงวนไว้สำหรับแพ็กเกจระดับสูงกว่า กรุณากดอัปเกรดแพ็กเกจเพื่อปลดล็อก');
      return;
    }
    const next: SchoolFeatureFlags = {
      ...flags,
      [key]: !currentlyEnabled,
    };
    await persistFlags(next, 'อัปเดตการเปิด/ปิดโมดูลของโรงเรียนเรียบร้อยแล้ว');
  };

  const handleApplyLevelImmediately = async (pkg: PackageLevelConfig) => {
    const next = buildFlagsFromLevel(pkg.id, catalog, flags.allowStudentsAi);
    await persistFlags(next, `ปรับแพ็กเกจโรงเรียนเป็น ${pkg.nameTh} เรียบร้อยแล้ว`);
  };

  const appliedPromo = useMemo(() => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return null;
    return promotions.find((p) => p.code.toUpperCase() === code && p.status === 'active') || null;
  }, [promoCodeInput, promotions]);

  const checkoutPricing = useMemo(() => {
    if (!checkoutPkg) return { listPrice: 0, discount: 0, finalAmount: 0 };
    const listPrice =
      billingCycle === 'yearly' ? checkoutPkg.yearlyPriceThb : checkoutPkg.monthlyPriceThb;
    let discount = 0;
    if (appliedPromo) {
      if (appliedPromo.discountType === 'percentage') {
        discount = Math.round((listPrice * appliedPromo.discountValue) / 100);
      } else if (appliedPromo.discountType === 'fixed_amount') {
        discount = Math.min(listPrice, appliedPromo.discountValue);
      } else if (appliedPromo.discountType === 'free_trial_months') {
        discount = billingCycle === 'monthly' ? listPrice : Math.round((listPrice / 12) * appliedPromo.discountValue);
      }
    }
    return {
      listPrice,
      discount,
      finalAmount: Math.max(0, listPrice - discount),
    };
  }, [checkoutPkg, billingCycle, appliedPromo]);

  const promptPayPayload = useMemo(() => {
    if (!checkoutPkg || checkoutPricing.finalAmount <= 0 || !paymentSettings.promptPayId) {
      return '';
    }
    return generatePromptPayPayload(
      paymentSettings.promptPayId,
      checkoutPricing.finalAmount,
      paymentSettings.promptPayType
    );
  }, [checkoutPkg, checkoutPricing.finalAmount, paymentSettings]);

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSlipDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPkg) return;
    setSubmittingOrder(true);
    setOrderNotice(null);
    try {
      const res = await submitSchoolPackageOrder({
        schoolId: activeSchool.id,
        schoolName: activeSchool.nameTh,
        targetLevel: checkoutPkg.id,
        targetLevelNameTh: checkoutPkg.nameTh,
        billingCycle,
        listPriceThb: checkoutPricing.listPrice,
        promoCode: appliedPromo?.code,
        discountThb: checkoutPricing.discount,
        finalAmountThb: checkoutPricing.finalAmount,
        paymentMethod,
        slipUrl: slipDataUrl,
        transferNote: transferNote.trim() || undefined,
        requestedByName: currentUser?.fullNameTh || currentUser?.email || 'ผู้ดูแลโรงเรียน',
        requestedByEmail: currentUser?.email,
      });
      setOrders((prev) => [res.order, ...prev]);
      setOrderNotice(
        res.warning ||
          `ส่งคำขอซื้อ ${checkoutPkg.nameTh} เรียบร้อยแล้ว รอผู้ดูแลระบบกลาง (Super Admin) ตรวจสอบและเปิดระบบ`
      );
      setCheckoutPkg(null);
      setSlipDataUrl(undefined);
      setTransferNote('');
      setPromoCodeInput('');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const pendingOrder = orders.find((o) => o.status === 'pending');

  return (
    <div className="space-y-5">
      {/* Section 1: Server AI Readiness & School Student AI Toggle (NO API Key Input UI) */}
      <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>การเปิดใช้งานฟังก์ชัน AI สำหรับนักเรียน (Server Environment Secret &amp; Student AI Gate)</span>
            </h3>
            <p className="text-xs text-[var(--color-text-body)]">
              เพื่อความปลอดภัยของรหัสลับองค์กร คีย์ <span className="font-mono font-semibold">GEMINI_API_KEY</span> จะถูกเก็บไว้เฉพาะใน Environment Secrets ของเซิร์ฟเวอร์ (ไม่เก็บบนเบราว์เซอร์) และผู้ดูแลโรงเรียนสามารถเปิด/ปิดสิทธิ์ให้นักเรียนเข้าใช้งานชุด AI ได้ที่นี่
            </p>
          </div>
          <button
            type="button"
            onClick={() => void checkServerAiHealth()}
            disabled={aiHealthLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)] whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${aiHealthLoading ? 'animate-spin' : ''}`} />
            <span>ตรวจสถานะ AI เซิร์ฟเวอร์</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
          {/* Server Secret Readiness Readout */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[var(--color-text-title)]">
                สถานะ GEMINI_API_KEY บนเซิร์ฟเวอร์
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  geminiConfigured
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                }`}
              >
                {aiHealthLoading
                  ? 'กำลังตรวจสอบ...'
                  : geminiConfigured
                    ? 'พร้อมใช้งาน (Server Configured)'
                    : 'ยังไม่ได้ตั้งค่า Server Secret'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              {geminiConfigured
                ? 'เซิร์ฟเวอร์เชื่อมต่อ Gemini API Proxy (/api/ai/*) พร้อมประมวลผล Career Quest AI, Socratic Tutor และ Snap & Solve แล้ว'
                : 'หากโรงเรียนต้องการเปิดใช้ AI กรุณาให้ผู้ดูแลระบบตั้งค่าตัวแปร GEMINI_API_KEY ใน Settings > Secrets (หรือไฟล์ .env บนเซิร์ฟเวอร์) แล้วรีสตาร์ทเซิร์ฟเวอร์'}
            </p>
          </div>

          {/* School Admin Student AI Access Control */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-[var(--color-text-title)]">
                อนุญาตให้นักเรียนในโรงเรียนใช้ฟังก์ชัน AI
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                {anyAiModuleUnlocked
                  ? 'ควบคุมการเข้าถึง Career Quest AI, AI Socratic Tutor, AI Diagnostic และ Snap & Solve สำหรับบัญชีนักเรียน'
                  : 'แพ็กเกจปัจจุบันยังไม่รวมชุด AI (ต้องอัปเกรดเป็น Level 4 หรือเปิดโมดูล AI โดยผู้ดูแลระบบกลาง)'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flags.allowStudentsAi}
              onClick={() => void handleToggleStudentAi()}
              disabled={!anyAiModuleUnlocked && currentRole !== 'super_admin'}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                flags.allowStudentsAi && anyAiModuleUnlocked
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
              }`}
            >
              {flags.allowStudentsAi && anyAiModuleUnlocked ? 'เปิดให้นักเรียนใช้ AI' : 'ปิด AI สำหรับนักเรียน'}
            </button>
          </div>
        </div>
      </div>

      {savingFlagsNotice && (
        <div role="status" className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savingFlagsNotice}</span>
          </div>
          <button type="button" onClick={() => setSavingFlagsNotice(null)} className="cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {orderNotice && (
        <div role="status" className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 px-4 py-2.5 text-xs text-blue-950 dark:text-blue-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>{orderNotice}</span>
          </div>
          <button type="button" onClick={() => setOrderNotice(null)} className="cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Section 2: Current Package Level & 4 Purchasable Leveled Packages */}
      <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>แพ็กเกจโรงเรียนแบบแบ่งเลเวล (Package Level &amp; Upgrade)</span>
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
              แพ็กเกจปัจจุบัน: <strong className="text-[var(--color-primary-text)]">{getPackageLevelLabel(flags.tier, lang, catalog)}</strong> · เปิดใช้ {enabledCount} / {FEATURE_FLAG_LABELS.length} โมดูล
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs self-start">
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              รายปี (ประหยัดกว่า)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              รายเดือน
            </button>
          </div>
        </div>

        {pendingOrder && (
          <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 flex-wrap">
            <span>
              คำขออัปเกรดเป็น <strong>{pendingOrder.targetLevelNameTh}</strong> (฿{pendingOrder.finalAmountThb.toLocaleString()}) อยู่ระหว่างรอ Super Admin ตรวจสอบและเปิดระบบ
            </span>
            <span className="font-mono text-[11px]">
              {new Date(pendingOrder.createdAt).toLocaleString('th-TH')}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {catalog.map((pkg) => {
            const isCurrent = pkg.id === currentLevelId;
            const modCount = countEnabledFeatures(pkg.features);
            const displayPrice = billingCycle === 'yearly' ? pkg.yearlyPriceThb : pkg.monthlyPriceThb;
            return (
              <div
                key={pkg.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/35'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-[var(--color-primary-text)]">
                      LEVEL {pkg.levelNumber}
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        ใช้งานอยู่
                      </span>
                    ) : pkg.highlightBadgeTh ? (
                      <span className="text-[10px] font-bold text-[var(--color-primary-text)]">
                        {pkg.highlightBadgeTh}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="text-sm font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? pkg.nameTh : pkg.nameEn}
                  </h4>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-[var(--color-text-title)]">
                    ฿{displayPrice.toLocaleString()}{' '}
                    <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
                      / {billingCycle === 'yearly' ? 'ปี' : 'เดือน'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-body)] leading-relaxed">
                    {pkg.descriptionTh}
                  </p>
                  <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums pt-1 border-t border-[var(--color-border)]">
                    เปิดใช้ {modCount} / {FEATURE_FLAG_LABELS.length} โมดูล · สูงสุด {pkg.maxStudents.toLocaleString()} คน
                  </div>
                </div>

                <div className="space-y-1.5">
                  {currentRole === 'super_admin' ? (
                    <button
                      type="button"
                      onClick={() => void handleApplyLevelImmediately(pkg)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                        isCurrent
                          ? 'border border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--color-card)]'
                          : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                      }`}
                    >
                      {isCurrent ? 'รีเซ็ตให้ตรงเลเวลนี้' : `ตั้งค่าเป็น Level ${pkg.levelNumber} ทันที`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!pkg.isAvailable || isCurrent}
                      onClick={() => {
                        setCheckoutPkg(pkg);
                        setOrderNotice(null);
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isCurrent
                          ? 'border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                          : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                      }`}
                    >
                      {isCurrent
                        ? 'แพ็กเกจปัจจุบันของโรงเรียน'
                        : !pkg.isAvailable
                          ? 'ปิดรับสมัครชั่วคราว'
                          : 'ซื้อ / อัปเกรดเลเวลนี้'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Full 27-Module Gate Breakdown */}
      <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>สถานะการเปิด/ปิดทุกฟังก์ชันของโรงเรียน ({enabledCount} / {FEATURE_FLAG_LABELS.length} โมดูล)</span>
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              {currentRole === 'super_admin'
                ? 'ในฐานะ Super Admin คุณสามารถเปิดหรือปิดโมดูลใดก็ได้เป็นกรณีพิเศษสำหรับโรงเรียนนี้'
                : 'โมดูลที่รวมอยู่ในแพ็กเกจที่ซื้อสามารถเปิด/ปิดการใช้งานในโรงเรียนได้ โมดูลระดับสูงกว่าจะปลดล็อกเมื่อซื้อแพ็กเกจอัปเกรด'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {PACKAGE_CATEGORY_META.map((cat) => {
            const items = FEATURE_FLAG_LABELS.filter((f) => f.category === cat.id);
            return (
              <div key={cat.id} className="space-y-2">
                <div className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  {cat.id === 'ai_suite' && <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  <span>{lang === 'th' ? cat.labelTh : cat.labelEn}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {items.map((item) => {
                    const enabled = Boolean(flags[item.key]);
                    const includedInCurrentLevel = Boolean(currentLevelConfig.features[item.key]);
                    const isLockedForAdmin =
                      currentRole !== 'super_admin' && !includedInCurrentLevel && !enabled;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => void handleToggleModuleFlag(item.key, includedInCurrentLevel)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                          enabled
                            ? 'bg-[var(--color-card)] border-[var(--color-primary)]'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] opacity-75'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--color-text-title)] flex items-center gap-1.5 truncate">
                            {isLockedForAdmin && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                            <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                          </div>
                          <div className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                            {isLockedForAdmin
                              ? `ปลดล็อกใน Level ${item.minLevel.replace('level_', '')}+`
                              : item.descTh}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            enabled
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                              : isLockedForAdmin
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {enabled ? 'เปิด' : isLockedForAdmin ? 'ล็อก' : 'ปิด'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase / Upgrade Checkout Modal */}
      {checkoutPkg && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !submittingOrder && setCheckoutPkg(null)}
        >
          <div
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--color-text-title)]">
                  สั่งซื้อ / อัปเกรดเป็น {checkoutPkg.nameTh}
                </h4>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {activeSchool.nameTh} · รอบชำระ{billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submittingOrder && setCheckoutPkg(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchaseOrder} className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1.5 tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">ค่าบริการแพ็กเกจ ({billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'})</span>
                  <span className="font-mono font-semibold text-[var(--color-text-title)]">
                    ฿{checkoutPricing.listPrice.toLocaleString()}
                  </span>
                </div>
                {checkoutPricing.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                    <span>ส่วนลดโปรโมชั่น ({appliedPromo?.code})</span>
                    <span className="font-mono font-bold">-฿{checkoutPricing.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-[var(--color-border)] text-sm font-extrabold text-[var(--color-text-title)]">
                  <span>ยอดชำระสุทธิ</span>
                  <span className="font-mono text-[var(--color-primary-text)]">
                    ฿{checkoutPricing.finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="font-semibold text-[var(--color-text-body)]">โค้ดส่วนลด (ถ้ามี)</span>
                  <input
                    type="text"
                    placeholder="กรอกโค้ดโปรโมชั่น"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-semibold text-[var(--color-text-body)]">วิธีชำระเงิน</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'promptpay' | 'invoice')}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                  >
                    <option value="promptpay">สแกน PromptPay QR</option>
                    <option value="invoice">โอนบัญชี / ขอใบแจ้งหนี้สถานศึกษา</option>
                  </select>
                </label>
              </div>

              {paymentMethod === 'promptpay' && promptPayPayload && (
                <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col sm:flex-row items-center gap-4">
                  <QrCodeMatrix value={promptPayPayload} size={136} label="PromptPay QR" />
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="font-bold text-[var(--color-text-title)]">
                      บัญชีรับชำระ: {paymentSettings.accountName}
                    </div>
                    <div className="font-mono text-[var(--color-primary-text)] font-semibold">
                      PromptPay ID: {paymentSettings.promptPayId}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      สแกนชำระ ฿{checkoutPricing.finalAmount.toLocaleString()} แล้วแนบสลิปด้านล่างเพื่อให้ผู้ดูแลระบบกลางตรวจสอบและเปิดสิทธิ์
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-semibold text-[var(--color-text-body)] block">
                  แนบสลิปโอนเงิน / หลักฐานการชำระ
                </span>
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)]/40 cursor-pointer font-semibold text-[var(--color-text-title)]">
                  <Upload className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span>{slipDataUrl ? 'อัปโหลดสลิปแล้ว (คลิกเพื่อเปลี่ยนรูป)' : 'เลือกรูปสลิปการโอนเงิน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="font-semibold text-[var(--color-text-body)]">หมายเหตุถึงผู้ดูแลระบบกลาง (ถ้ามี)</span>
                <input
                  type="text"
                  placeholder="เช่น โอนจากบัญชีโรงเรียน วันที่-เวลา..."
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={() => setCheckoutPkg(null)}
                  className="px-3.5 py-2 rounded-lg border border-[var(--color-border)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold cursor-pointer"
                >
                  {submittingOrder ? 'กำลังส่งคำขอ...' : 'ยืนยันส่งคำขออัปเกรดแพ็กเกจ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
