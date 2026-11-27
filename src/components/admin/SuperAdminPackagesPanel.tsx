import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import {
  DEFAULT_PACKAGE_CATALOG,
  FEATURE_FLAG_LABELS,
  PACKAGE_CATEGORY_META,
  countEnabledFeatures,
} from '../../lib/schoolFeatureFlags';
import {
  loadPackageCatalog,
  loadSchoolPackageOrders,
  reviewSchoolPackageOrder,
  savePackageCatalog,
} from '../../lib/schoolPackageStore';
import type {
  AppLanguage,
  PackageLevelConfig,
  PackageLevelId,
  SchoolFeatureFlagKey,
  SchoolFeatureFlags,
  SchoolPackagePurchaseOrder,
} from '../../types';

interface SuperAdminPackagesPanelProps {
  lang: AppLanguage;
  reviewerName?: string;
  onCatalogSaved?: (catalog: PackageLevelConfig[]) => void;
  onOrderApprovedFlags?: (schoolId: string, flags: SchoolFeatureFlags) => void;
  onNotify?: (msg: string) => void;
}

export const SuperAdminPackagesPanel: React.FC<SuperAdminPackagesPanelProps> = ({
  lang,
  reviewerName = 'Super Admin',
  onCatalogSaved,
  onOrderApprovedFlags,
  onNotify,
}) => {
  const [catalog, setCatalog] = useState<PackageLevelConfig[]>(DEFAULT_PACKAGE_CATALOG);
  const [selectedLevelId, setSelectedLevelId] = useState<PackageLevelId>('level_1');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);

  const [orders, setOrders] = useState<SchoolPackagePurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewNoteMap, setReviewNoteMap] = useState<Record<string, string>>({});
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  const refreshAll = async () => {
    setCatalogLoading(true);
    setOrdersLoading(true);
    try {
      const [{ catalog: loadedCatalog }, loadedOrders] = await Promise.all([
        loadPackageCatalog(),
        loadSchoolPackageOrders(),
      ]);
      setCatalog(loadedCatalog);
      setOrders(loadedOrders);
    } finally {
      setCatalogLoading(false);
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const selectedLevel = useMemo(
    () => catalog.find((item) => item.id === selectedLevelId) || catalog[0],
    [catalog, selectedLevelId]
  );

  const updateSelectedLevel = (patch: Partial<PackageLevelConfig>) => {
    setCatalog((prev) =>
      prev.map((item) => (item.id === selectedLevel.id ? { ...item, ...patch } : item))
    );
  };

  const toggleSelectedFeature = (key: SchoolFeatureFlagKey) => {
    setCatalog((prev) =>
      prev.map((item) =>
        item.id === selectedLevel.id
          ? {
              ...item,
              features: {
                ...item.features,
                [key]: !item.features[key],
              },
            }
          : item
      )
    );
  };

  const toggleSelectedCategory = (categoryId: string, enableAll: boolean) => {
    const keysInCat = FEATURE_FLAG_LABELS.filter((f) => f.category === categoryId).map((f) => f.key);
    setCatalog((prev) =>
      prev.map((item) => {
        if (item.id !== selectedLevel.id) return item;
        const nextFeatures = { ...item.features };
        keysInCat.forEach((k) => {
          nextFeatures[k] = enableAll;
        });
        return { ...item, features: nextFeatures };
      })
    );
  };

  const handleSaveCatalog = async () => {
    setSavingCatalog(true);
    setCatalogNotice(null);
    try {
      const res = await savePackageCatalog(catalog);
      onCatalogSaved?.(catalog);
      const msg = res.savedToSupabase
        ? 'บันทึกแพ็กเกจทั้ง 4 เลเวลและรายการโมดูลลงฐานข้อมูลเรียบร้อยแล้ว'
        : res.error || 'บันทึกการกำหนดแพ็กเกจทั้ง 4 เลเวลเรียบร้อยแล้ว';
      setCatalogNotice(msg);
      onNotify?.(msg);
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleResetDefaults = () => {
    setCatalog(DEFAULT_PACKAGE_CATALOG.map((item) => ({ ...item, features: { ...item.features } })));
    setCatalogNotice('รีเซ็ตตารางแพ็กเกจกลับเป็นค่ามาตรฐานแนะนำ 4 เลเวลแล้ว (กดบันทึกเพื่อยืนยัน)');
  };

  const handleReviewOrder = async (
    order: SchoolPackagePurchaseOrder,
    decision: 'approved' | 'rejected'
  ) => {
    setReviewingOrderId(order.id);
    try {
      const note = reviewNoteMap[order.id]?.trim();
      const res = await reviewSchoolPackageOrder(order, decision, reviewerName, note, catalog);
      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: decision,
                reviewNote: note || item.reviewNote,
                reviewedBy: reviewerName,
                reviewedAt: new Date().toISOString(),
              }
            : item
        )
      );
      if (decision === 'approved' && res.activatedFlags) {
        onOrderApprovedFlags?.(order.schoolId, res.activatedFlags);
      }
      onNotify?.(
        decision === 'approved'
          ? `อนุมัติคำสั่งซื้อ ${order.targetLevelNameTh} ให้ ${order.schoolName} และเปิดใช้งานโมดูลแล้ว`
          : `ปฏิเสธคำขอซื้อแพ็กเกจของ ${order.schoolName} แล้ว`
      );
    } finally {
      setReviewingOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'pending').length,
    [orders]
  );

  return (
    <div className="space-y-6">
      {/* Section 1: 4-Level Package Catalog Builder */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>กำหนดแพ็กเกจแบ่งตามเลเวล (Level 1 – Level 4) และโมดูลที่เปิดขาย</span>
            </h3>
            <p className="text-xs text-[var(--color-text-body)] mt-0.5">
              ผู้ดูแลระบบกลางกำหนดราคา ชื่อแพ็กเกจ และเปิด/ปิดฟังก์ชันทั้ง 27 โมดูลของแต่ละเลเวลเพื่อให้โรงเรียนซื้ออัปเกรดได้ทันที
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text-title)] whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ค่าแนะนำมาตรฐาน</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCatalog()}
              disabled={savingCatalog || catalogLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCatalog ? 'กำลังบันทึก...' : 'บันทึกแพ็กเกจทั้งหมด'}</span>
            </button>
          </div>
        </div>

        {catalogNotice && (
          <div role="status" className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{catalogNotice}</span>
          </div>
        )}

        {/* Level Selector Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {catalog.map((pkg) => {
            const isSelected = pkg.id === selectedLevel.id;
            const enabledCount = countEnabledFeatures(pkg.features);
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedLevelId(pkg.id)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/50 ring-1 ring-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-[var(--color-primary-text)]">
                    LEVEL {pkg.levelNumber}
                  </span>
                  <span className={`text-[10px] font-bold ${pkg.isAvailable ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    {pkg.isAvailable ? 'เปิดขาย' : 'ปิดชั่วคราว'}
                  </span>
                </div>
                <div className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? pkg.nameTh : pkg.nameEn}
                </div>
                <div className="text-sm font-extrabold font-mono tabular-nums text-[var(--color-text-title)]">
                  ฿{pkg.yearlyPriceThb.toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-[var(--color-text-muted)]">/ ปี</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  {enabledCount} / {FEATURE_FLAG_LABELS.length} โมดูล · สูงสุด {pkg.maxStudents.toLocaleString()} คน
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Level Editor */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)]">ชื่อแพ็กเกจ (ไทย)</span>
              <input
                type="text"
                value={selectedLevel.nameTh}
                onChange={(e) => updateSelectedLevel({ nameTh: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)]">ราคาต่อปี (บาท THB)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={selectedLevel.yearlyPriceThb}
                onChange={(e) => updateSelectedLevel({ yearlyPriceThb: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono tabular-nums font-bold"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)]">ราคาต่อเดือน (บาท THB)</span>
              <input
                type="number"
                min={0}
                step={50}
                value={selectedLevel.monthlyPriceThb}
                onChange={(e) => updateSelectedLevel({ monthlyPriceThb: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono tabular-nums font-bold"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)]">จำนวนนักเรียนสูงสุด</span>
              <input
                type="number"
                min={50}
                step={50}
                value={selectedLevel.maxStudents}
                onChange={(e) => updateSelectedLevel({ maxStudents: Math.max(50, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono tabular-nums"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-end">
            <label className="space-y-1 md:col-span-2">
              <span className="font-semibold text-[var(--color-text-body)]">คำอธิบายกลุ่มเป้าหมายของแพ็กเกจ</span>
              <input
                type="text"
                value={selectedLevel.descriptionTh}
                onChange={(e) => updateSelectedLevel({ descriptionTh: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
              />
            </label>
            <label className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer">
              <span className="font-semibold text-[var(--color-text-title)]">เปิดให้โรงเรียนกดสั่งซื้อได้</span>
              <input
                type="checkbox"
                checked={selectedLevel.isAvailable}
                onChange={(e) => updateSelectedLevel({ isAvailable: e.target.checked })}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
            </label>
          </div>

          {/* 27 Modules grouped by category */}
          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
            {PACKAGE_CATEGORY_META.map((cat) => {
              const items = FEATURE_FLAG_LABELS.filter((f) => f.category === cat.id);
              const enabledInCat = items.filter((f) => selectedLevel.features[f.key]).length;
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      {cat.id === 'ai_suite' && <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      <span>{lang === 'th' ? cat.labelTh : cat.labelEn}</span>
                      <span className="text-[11px] font-mono tabular-nums text-[var(--color-text-muted)]">
                        ({enabledInCat}/{items.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleSelectedCategory(cat.id, true)}
                        className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer"
                      >
                        เปิดทั้งหมด
                      </button>
                      <span className="text-[var(--color-text-muted)]">·</span>
                      <button
                        type="button"
                        onClick={() => toggleSelectedCategory(cat.id, false)}
                        className="text-[var(--color-text-muted)] hover:underline font-semibold cursor-pointer"
                      >
                        ปิดทั้งหมด
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((item) => {
                      const active = selectedLevel.features[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleSelectedFeature(item.key)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                            active
                              ? 'border-[var(--color-primary)] bg-[var(--color-card)]'
                              : 'border-[var(--color-border)] bg-[var(--color-card)]/50 opacity-70'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                              {lang === 'th' ? item.labelTh : item.labelEn}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                              {item.descTh}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              active
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {active ? 'เปิด' : 'ปิด'}
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
      </div>

      {/* Section 2: School Package Purchase Orders & Slip Verification */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>คำขอซื้อ / อัปเกรดแพ็กเกจจากโรงเรียน (รออนุมัติ {pendingCount})</span>
            </h3>
            <p className="text-xs text-[var(--color-text-body)] mt-0.5">
              ตรวจสอบสลิปโอนเงิน PromptPay แล้วกดอนุมัติเพื่อเปิดใช้ระดับแพ็กเกจและโมดูลทั้งหมดในเลเวลนั้นให้โรงเรียนอัตโนมัติ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
            >
              <option value="pending">รออนุมัติ ({pendingCount})</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="all">ทั้งหมด ({orders.length})</option>
            </select>
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={ordersLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>

        {ordersLoading ? (
          <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">กำลังโหลดรายการคำขอซื้อแพ็กเกจ...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
            ไม่มีคำขอซื้อแพ็กเกจในสถานะที่เลือก
          </p>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[var(--color-text-title)]">{order.schoolName}</span>
                    <span className="text-[var(--color-text-muted)]">·</span>
                    <span className="font-semibold text-[var(--color-primary-text)]">{order.targetLevelNameTh}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        order.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                          : order.status === 'rejected'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {order.status === 'approved'
                        ? 'อนุมัติแล้ว'
                        : order.status === 'rejected'
                          ? 'ปฏิเสธ'
                          : 'รอตรวจสลิป'}
                    </span>
                  </div>
                  <div className="text-[var(--color-text-body)] tabular-nums">
                    รอบชำระ: {order.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'} · ยอดสุทธิ:{' '}
                    <strong className="font-mono text-[var(--color-text-title)]">
                      ฿{order.finalAmountThb.toLocaleString()}
                    </strong>
                    {order.promoCode ? ` (โค้ด ${order.promoCode} ลด ฿${order.discountThb.toLocaleString()})` : ''}
                    {' · '}วิธีชำระ: {order.paymentMethod === 'promptpay' ? 'PromptPay QR' : 'ใบแจ้งหนี้/โอนบัญชี'}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    ผู้ยื่น: {order.requestedByName} {order.requestedByEmail ? `(${order.requestedByEmail})` : ''} ·{' '}
                    {new Date(order.createdAt).toLocaleString('th-TH')}
                    {order.transferNote ? ` · หมายเหตุ: ${order.transferNote}` : ''}
                  </div>
                  {order.reviewNote && (
                    <div className="text-[11px] text-[var(--color-text-title)]">
                      บันทึกผู้ตรวจสอบ: {order.reviewNote}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {order.slipUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewSlipUrl(order.slipUrl || null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold hover:bg-[var(--color-primary-light)] whitespace-nowrap cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูสลิป</span>
                    </button>
                  )}

                  {order.status === 'pending' && (
                    <>
                      <input
                        type="text"
                        placeholder="หมายเหตุตรวจสอบ (ถ้ามี)"
                        value={reviewNoteMap[order.id] || ''}
                        onChange={(e) =>
                          setReviewNoteMap((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs w-44"
                      />
                      <button
                        type="button"
                        disabled={reviewingOrderId === order.id}
                        onClick={() => void handleReviewOrder(order, 'approved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold whitespace-nowrap cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติ &amp; เปิดระบบ</span>
                      </button>
                      <button
                        type="button"
                        disabled={reviewingOrderId === order.id}
                        onClick={() => void handleReviewOrder(order, 'rejected')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 disabled:opacity-50 text-rose-700 dark:text-rose-200 font-bold whitespace-nowrap cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ปฏิเสธ</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BaseModal
        isOpen={Boolean(previewSlipUrl)}
        onClose={() => setPreviewSlipUrl(null)}
        title="หลักฐานสลิปการโอนเงิน"
        icon={<CreditCard className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-md"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-4"
      >
        {previewSlipUrl && (
          <img
            src={previewSlipUrl}
            alt="Payment Slip Preview"
            className="w-full max-h-[65vh] object-contain rounded-xl border border-[var(--color-border)] bg-black/5"
          />
        )}
      </BaseModal>
    </div>
  );
};
