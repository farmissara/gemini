import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  Lock,
  Package,
  RefreshCw,
  ShieldCheck,
  Save,
  Sparkles,
  Trash2,
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
import { getSupabaseClient } from '../../lib/supabase';
import { ConfirmActionModal } from '../modals/ConfirmActionModal';
import { emitAppToast } from '../common/ToastProvider';
import { compressImageFileToDataUrl } from '../../lib/imageCompression';

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
  const [schoolAiStatus, setSchoolAiStatus] = useState<{
    configured: boolean;
    keyLast4: string | null;
    monthlyRequestLimit: number;
    encryptionReady: boolean;
    usage: { month: string; requests: number; promptTokens: number; outputTokens: number; remainingRequests: number };
  } | null>(null);
  const [schoolApiKeyDraft, setSchoolApiKeyDraft] = useState('');
  const [monthlyRequestLimitDraft, setMonthlyRequestLimitDraft] = useState('300');
  const [savingSchoolAi, setSavingSchoolAi] = useState(false);
  const [confirmRemoveAiKeyOpen, setConfirmRemoveAiKeyOpen] = useState(false);
  const [schoolAiNotice, setSchoolAiNotice] = useState<string | null>(null);
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
      const client = getSupabaseClient();
      if (!client) throw new Error('ยังไม่ได้เชื่อมต่อ Supabase');
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');
      const response = await fetch(`/api/school-ai/settings?schoolId=${encodeURIComponent(activeSchool.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'อ่านสถานะ AI ของโรงเรียนไม่สำเร็จ');
      const settings = result as NonNullable<typeof schoolAiStatus>;
      setSchoolAiStatus(settings);
      setMonthlyRequestLimitDraft(String(settings.monthlyRequestLimit || 300));
    } catch {
      setSchoolAiStatus(null);
    } finally {
      setAiHealthLoading(false);
    }
  };

  const saveSchoolAiSettings = async (includeApiKey: boolean) => {
    setSavingSchoolAi(true);
    setSchoolAiNotice(null);
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('ยังไม่ได้เชื่อมต่อ Supabase');
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');
      const response = await fetch('/api/school-ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolId: activeSchool.id,
          ...(includeApiKey ? { apiKey: schoolApiKeyDraft } : {}),
          monthlyRequestLimit: Number(monthlyRequestLimitDraft),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'บันทึกการตั้งค่า AI ไม่สำเร็จ');
      setSchoolApiKeyDraft('');
      setSchoolAiNotice(includeApiKey ? 'บันทึก API key ของโรงเรียนแบบเข้ารหัสแล้ว' : 'บันทึกโควตา AI ต่อเดือนแล้ว');
      await checkServerAiHealth();
    } catch (error) {
      setSchoolAiNotice(error instanceof Error ? error.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSavingSchoolAi(false);
    }
  };

  const removeSchoolAiKey = () => {
    setConfirmRemoveAiKeyOpen(true);
  };

  const confirmRemoveSchoolAiKey = async () => {
    setSavingSchoolAi(true);
    setSchoolAiNotice(null);
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('ยังไม่ได้เชื่อมต่อ Supabase');
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');
      const response = await fetch(`/api/school-ai/settings?schoolId=${encodeURIComponent(activeSchool.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'ลบ API key ไม่สำเร็จ');
      setSchoolAiNotice('ลบ API key ของโรงเรียนแล้ว');
      emitAppToast({ tone: 'info', message: 'ลบ Gemini API key ของโรงเรียนแล้ว' });
      setConfirmRemoveAiKeyOpen(false);
      await checkServerAiHealth();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ลบ API key ไม่สำเร็จ';
      setSchoolAiNotice(msg);
      emitAppToast({ tone: 'error', message: msg });
      setConfirmRemoveAiKeyOpen(false);
    } finally {
      setSavingSchoolAi(false);
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
    void compressImageFileToDataUrl(file, {
      maxDimension: 960,
      quality: 0.75,
      maxDataUrlLength: 140_000,
    })
      .then((compressed) => {
        setSlipDataUrl(compressed);
      })
      .catch(() => {});
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
              <span>Gemini AI และโควตาการใช้งานของโรงเรียน</span>
            </h3>
            <p className="text-xs text-[var(--color-text-body)]">
              โรงเรียนใส่ Gemini API key ของตนเอง ระบบเข้ารหัสก่อนจัดเก็บ และคิดโควตาเป็นจำนวนคำขอต่อเดือน ผู้ดูแลระบบต้องตั้ง <span className="font-mono font-semibold">SCHOOL_AI_ENCRYPTION_KEY</span> ใน Render ก่อนใช้งาน
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
          {/* School-specific key and usage status */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[var(--color-text-title)]">
                สถานะ Gemini API key ของโรงเรียน
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  schoolAiStatus?.configured
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                }`}
              >
                {aiHealthLoading
                  ? 'กำลังตรวจสอบ...'
                  : schoolAiStatus?.configured
                    ? `ตั้งค่าแล้ว · ลงท้าย ${schoolAiStatus.keyLast4 || '••••'}`
                    : 'ยังไม่ได้ตั้งค่า API key'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              {schoolAiStatus?.configured
                ? `Gemini ใน Career Quest ใช้คีย์และโควตาของโรงเรียนนี้ · เดือนนี้ใช้ ${schoolAiStatus.usage.requests}/${schoolAiStatus.monthlyRequestLimit} คำขอ · เหลือ ${schoolAiStatus.usage.remainingRequests} คำขอ`
                : 'Career Quest AI จะใช้ไม่ได้จนกว่าโรงเรียนจะเพิ่มคีย์ของตนเอง โดยไม่มีการใช้คีย์หรือโควตาร่วมกับโรงเรียนอื่น'}
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

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-title)]">ข้อมูล API key และโควตารายเดือน</h4>
              <p className="text-[11px] text-[var(--color-text-muted)]">ใช้กับ Career Quest AI เท่านั้น คีย์จะไม่ถูกส่งกลับมาแสดงหลังบันทึก</p>
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              {schoolAiStatus ? `${schoolAiStatus.usage.promptTokens.toLocaleString()} input tokens · ${schoolAiStatus.usage.outputTokens.toLocaleString()} output tokens เดือนนี้` : ''}
            </div>
          </div>

          {!schoolAiStatus?.encryptionReady && !aiHealthLoading && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              ระบบยังเข้ารหัสคีย์ไม่ได้ ให้ผู้ดูแลเพิ่ม `SCHOOL_AI_ENCRYPTION_KEY` ใน Environment ของ Render ก่อน (ใช้ค่า 32 bytes แบบ hex หรือ base64)
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_auto] gap-2 items-end">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-body)]">Gemini API key ของโรงเรียน</span>
              <input
                type="password"
                autoComplete="new-password"
                value={schoolApiKeyDraft}
                onChange={(event) => setSchoolApiKeyDraft(event.target.value)}
                placeholder={schoolAiStatus?.configured ? 'กรอกคีย์ใหม่เพื่อเปลี่ยนคีย์เดิม' : 'วาง API key จาก Google AI Studio'}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-text-title)]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-body)]">โควตาคำขอต่อเดือน</span>
              <input
                type="number"
                min={10}
                max={20000}
                step={10}
                value={monthlyRequestLimitDraft}
                onChange={(event) => setMonthlyRequestLimitDraft(event.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-text-title)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveSchoolAiSettings(true)}
              disabled={savingSchoolAi || aiHealthLoading || !schoolAiStatus?.encryptionReady || !schoolApiKeyDraft.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" /> บันทึกคีย์
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
            <div role="status" className="text-[11px] text-[var(--color-text-muted)]">{schoolAiNotice || 'ตั้งโควตาได้ 10–20,000 คำขอต่อเดือน ระบบปฏิเสธคำขอเมื่อใช้ครบ'}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void saveSchoolAiSettings(false)}
                disabled={savingSchoolAi || !schoolAiStatus?.configured}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text-title)] disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> บันทึกโควตา
              </button>
              {schoolAiStatus?.configured && (
                <button
                  type="button"
                  onClick={() => void removeSchoolAiKey()}
                  disabled={savingSchoolAi}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> ลบคีย์
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">
            Google เรียกเก็บค่าใช้ API จากบัญชี/โปรเจกต์ Google ที่สร้างคีย์นี้โดยตรง โควตาในระบบนี้จำกัดจำนวนคำขอต่อเดือน ไม่ใช่วงเงินเงินบาท และคีย์จะไม่รวมในไฟล์ Backup
          </p>
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
      <ConfirmActionModal
        isOpen={confirmRemoveAiKeyOpen}
        title="ลบ Gemini API key ของโรงเรียนนี้หรือไม่?"
        description="ฟีเจอร์ AI ของโรงเรียนนี้จะหยุดทำงานชั่วคราวจนกว่าผู้ดูแลจะเพิ่ม API key ใหม่"
        confirmLabel="ลบ API Key"
        tone="danger"
        isBusy={savingSchoolAi}
        onCancel={() => {
          if (!savingSchoolAi) setConfirmRemoveAiKeyOpen(false);
        }}
        onConfirm={confirmRemoveSchoolAiKey}
      />
    </div>
  );
};
