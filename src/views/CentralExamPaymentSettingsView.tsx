import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  QrCode,
  Upload,
  CheckCircle2,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  FileText,
  Copy,
  Check,
  Eye,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import type { CentralExamPaymentSettings } from '../types';
import {
  DEFAULT_CENTRAL_EXAM_PAYMENT_SETTINGS,
  fetchCentralExamPaymentSettings,
  generatePromptPayPayload,
  loadCentralExamPaymentSettings,
  saveCentralExamPaymentSettings,
} from '../lib/centralExamBank';
import { QrCodeMatrix } from '../components/QrCodeMatrix';
import { getModuleTone } from '../lib/moduleTheme';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { compressImageFileToDataUrl } from '../lib/imageCompression';
import { FutureNavIcon } from '../components/common/FutureIcon';
import { PageHeader } from '../components/common/PageShell';

interface CentralExamPaymentSettingsViewProps {
  adminEmail?: string;
  onSaved?: (settings: CentralExamPaymentSettings) => void;
}

export const CentralExamPaymentSettingsView: React.FC<CentralExamPaymentSettingsViewProps> = ({
  adminEmail = 'baanpakkru@gmail.com',
  onSaved,
}) => {
  const [settings, setSettings] = useState<CentralExamPaymentSettings>(() => fetchCentralExamPaymentSettings());
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState<number>(390);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setSettingsLoading(true);
    loadCentralExamPaymentSettings()
      .then((loaded) => {
        if (active) setSettings(loaded);
      })
      .catch((error: unknown) => {
        if (active) setUploadError(error instanceof Error ? error.message : 'โหลดการตั้งค่าชำระเงินไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('ขนาดไฟล์รูปภาพไม่ควรเกิน 5 MB');
      return;
    }
    setUploadError(null);

    void compressImageFileToDataUrl(file, {
      maxDimension: 640,
      quality: 0.8,
      maxDataUrlLength: 120_000,
    })
      .then((dataUrl) => {
        setSettings((prev) => ({
          ...prev,
          qrImageUrl: dataUrl,
        }));
      })
      .catch(() => {
        setUploadError('ไม่สามารถอ่านไฟล์รูปภาพได้');
      });
  };

  const handleRemoveImage = () => {
    setSettings((prev) => ({
      ...prev,
      qrImageUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      if (settings.enablePromptPay) {
        generatePromptPayPayload(settings.promptPayId, testAmount, settings.promptPayType);
      }
      const updated = await saveCentralExamPaymentSettings({
        ...settings,
        updatedBy: adminEmail,
      });
      setSettings(updated);
      setUploadError(null);
      setSavedToast('บันทึกการตั้งค่า QR PromptPay เรียบร้อยแล้ว! ทุกโรงเรียนจะเห็นข้อมูลใหม่ทันที');
      setTimeout(() => setSavedToast(null), 4000);
      if (onSaved) onSaved(updated);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'บันทึกการตั้งค่าชำระเงินไม่สำเร็จ');
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    try {
      const reset = await saveCentralExamPaymentSettings({
        ...DEFAULT_CENTRAL_EXAM_PAYMENT_SETTINGS,
        updatedBy: adminEmail,
      });
      setSettings(reset);
      setUploadError(null);
      setShowResetConfirm(false);
      setSavedToast('คืนค่าเริ่มต้นเรียบร้อยแล้ว');
      setTimeout(() => setSavedToast(null), 3000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'คืนค่าการตั้งค่าไม่สำเร็จ');
    }
  };

  // Preview generated payload
  const promptPayPayload = useMemo(() => {
    try {
      return generatePromptPayPayload(settings.promptPayId, testAmount, settings.promptPayType);
    } catch {
      return '';
    }
  }, [settings.promptPayId, settings.promptPayType, testAmount]);

  return (
    <div className={`${getModuleTone('central_exam_hub')} space-y-5`}>
      {/* Top Header */}
      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Super Admin Portal · Central Exam Marketplace Payments</span>
          </span>
        }
        title="ตั้งค่า QR PromptPay & อัปโหลด QR รับเงินขายข้อสอบ"
        description="กำหนดเบอร์พร้อมเพย์ บัญชีธนาคาร และอัปโหลดภาพ QR Code จากแอปธนาคาร แสดงผลในหน้าชำระเงินทุกโรงเรียนที่สั่งซื้อข้อสอบกลาง 8 กลุ่มสาระ"
        icon={<FutureNavIcon tab="super_admin_exam_payment" size={20} active />}
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={settingsLoading}
            className="btn-action-primary px-4 py-2.5 text-xs flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        }
      />

      {/* Toast Notification */}
      {savedToast && (
        <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}
      {uploadError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </span>
          <button type="button" onClick={() => setUploadError(null)} className="text-[11px] underline cursor-pointer">
            ปิด
          </button>
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: PromptPay & Bank Information */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[var(--color-primary-text)]" />
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  ข้อมูลบัญชีพร้อมเพย์ &amp; ธนาคารผู้รับเงิน
                </h3>
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                แก้ไขล่าสุด: {new Date(settings.lastUpdated).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-title)]">
                  ประเภทบัญชีพร้อมเพย์ (Identifier Type)
                </label>
                <select
                  value={settings.promptPayType}
                  onChange={(e) => setSettings((prev) => ({ ...prev, promptPayType: e.target.value as CentralExamPaymentSettings['promptPayType'] }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
                >
                  <option value="phone">เบอร์โทรศัพท์มือถือ (10 หลัก)</option>
                  <option value="national_id">เลขประจำตัวประชาชน (13 หลัก)</option>
                  <option value="tax_id">เลขนิติบุคคล / เลขผู้เสียภาษี (13 หลัก)</option>
                  <option value="e_wallet">e-Wallet ID (พร้อมเพย์)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-title)] flex items-center justify-between">
                  <span>หมายเลขพร้อมเพย์ (PromptPay ID)</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">* จำเป็น</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.promptPayId}
                    onChange={(e) => setSettings((prev) => ({ ...prev, promptPayId: e.target.value }))}
                    placeholder="เช่น 081-999-8888 หรือ 0105559000001"
                    inputMode="numeric"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <Phone className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--color-text-title)] flex items-center justify-between">
                <span>ชื่อบัญชี / ชื่อองค์กรผู้รับเงิน (Account / Beneficiary Name)</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">* จำเป็น</span>
              </label>
              <input
                type="text"
                value={settings.accountName}
                onChange={(e) => setSettings((prev) => ({ ...prev, accountName: e.target.value }))}
                placeholder="เช่น ศูนย์อำนวยการคลังข้อสอบกลาง EduVerse (Super Admin)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-title)]">
                  ชื่อธนาคาร / ช่องทางรับเงิน (Bank / Gateway)
                </label>
                <input
                  type="text"
                  value={settings.bankName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, bankName: e.target.value }))}
                  placeholder="เช่น พร้อมเพย์ (PromptPay), ธนาคารกสิกรไทย"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-title)]">
                  เลขที่บัญชีธนาคารเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={settings.accountNumber || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="เช่น 142-2-90188-3"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Custom QR Code Image Upload */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    อัปโหลดรูปภาพ QR Code พร้อมเพย์ (Upload Official QR Slip)
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    สามารถอัปโหลดรูปภาพ QR Code อย่างเป็นทางการจากแอปธนาคารของท่าน หรือปล่อยว่างเพื่อใช้ QR ที่ระบบสร้างให้อัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {settings.qrImageUrl ? (
                <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={settings.qrImageUrl}
                      alt="Uploaded PromptPay QR"
                      className="w-32 h-32 object-contain bg-white rounded-lg border border-slate-300 shadow-sm p-1"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition">
                      <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded">ภาพ QR ที่ใช้งาน</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-center sm:text-left">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>อัปโหลดรูปภาพ QR Code สำเร็จแล้ว</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                      ระบบจะแสดงรูปภาพ QR Code นี้ให้โรงเรียนสแกนในหน้าสั่งซื้อชุดข้อสอบแทน QR เริ่มต้น
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-tool-neutral px-3 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>เปลี่ยนรูปใหม่</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="btn-action-danger px-3 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรูปภาพ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-2xl p-6 text-center cursor-pointer transition bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)]/40 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-primary-text)] group-hover:scale-110 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="mt-3 text-xs font-bold text-[var(--color-text-title)]">
                    คลิกเพื่อเลือกไฟล์ หรือลากวางไฟล์รูปภาพ QR Code ที่นี่
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    รองรับไฟล์ PNG, JPG, WebP, SVG ขนาดไม่เกิน 5 MB
                  </div>
                  <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 inline-block px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    หากไม่อัปโหลด ระบบจะสร้าง QR Code พร้อมเพย์ตามหมายเลข PromptPay ID ให้อัตโนมัติ
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Card 3: Instructions & Policies */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>คำแนะนำการโอน &amp; ตัวเลือกช่องทางชำระเงิน</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--color-text-title)]">
                คำแนะนำและขั้นตอนการชำระเงินสำหรับโรงเรียน (Transfer Instructions)
              </label>
              <textarea
                rows={2}
                value={settings.transferInstructions}
                onChange={(e) => setSettings((prev) => ({ ...prev, transferInstructions: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--color-text-title)]">
                ข้อความกำกับสลิป / ข้อมูลติดต่อช่วยเหลือ (Footer Notes)
              </label>
              <input
                type="text"
                value={settings.notes || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="เช่น ติดต่อสอบถาม Super Admin: baanpakkru@gmail.com"
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enablePromptPay}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enablePromptPay: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-bold text-[var(--color-text-title)]">เปิดรับชำระผ่าน PromptPay QR</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">ปลดล็อกชุดข้อสอบเข้าคลังทันที</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableInvoice}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enableInvoice: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-bold text-[var(--color-text-title)]">เปิดรับชำระผ่าน ใบแจ้งหนี้โรงเรียน</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">สำหรับเบิกงบวิชาการ/พัสดุ 30 วัน</div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="btn-action-danger px-3.5 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="btn-action-primary px-5 py-2.5 text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </button>
          </div>
        </div>

        {/* Right Simulator / Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="bg-[var(--color-card)] border-2 border-indigo-500/40 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-extrabold text-[var(--color-text-title)] uppercase tracking-wider">
                    ตัวอย่างจริงที่โรงเรียนจะเห็น (Live Preview)
                  </h4>
                </div>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700">
                  Interactive Simulator
                </span>
              </div>

              {/* Amount Tester */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[var(--color-text-body)]">ทดสอบตัวอย่างยอดชำระ:</div>
                <div className="seg-tab-group grid grid-cols-4 w-full">
                  {[190, 390, 490, 890].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTestAmount(amt)}
                      data-active={testAmount === amt}
                      className="seg-tab-btn py-1.5 text-xs whitespace-nowrap cursor-pointer"
                    >
                      ฿{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated Checkout Box */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-sm text-center">
                {/* PromptPay Header Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-[11px] font-extrabold">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{settings.bankName}</span>
                </div>

                {/* QR Display: Uploaded Image or Dynamic Vector Matrix */}
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  {settings.qrImageUrl ? (
                    <div className="space-y-1.5">
                      <div className="relative inline-block p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                        <img
                          src={settings.qrImageUrl}
                          alt="PromptPay QR Code"
                          className="w-44 h-44 object-contain rounded"
                        />
                        <div className="absolute top-3 left-3 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          PROMPTPAY
                        </div>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ รูปภาพ QR Code จากแอปธนาคารที่ Super Admin อัปโหลด
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      {promptPayPayload ? (
                        <>
                          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                            <QrCodeMatrix
                              value={promptPayPayload}
                              size={176}
                              label={`PromptPay QR ฿${testAmount}`}
                            />
                          </div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                            ✓ สร้าง QR PromptPay EMVCo มาตรฐานอัตโนมัติ
                          </div>
                        </>
                      ) : (
                        <p role="alert" className="max-w-52 text-center text-xs text-rose-700">
                          หมายเลขพร้อมเพย์ไม่ตรงกับประเภทที่เลือก
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
                    ยอดชำระ <span className="text-amber-600 dark:text-amber-400 font-black text-lg">฿{testAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Beneficiary Details */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-left space-y-1.5 text-xs border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">ชื่อบัญชีผู้รับ:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate max-w-[190px]">
                      {settings.accountName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">หมายเลขพร้อมเพย์:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <span>{settings.promptPayId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(settings.promptPayId, 'promptpay')}
                        title="คัดลอกหมายเลข"
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                      >
                        {copiedText === 'promptpay' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {settings.accountNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">เลขที่บัญชี:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                        {settings.accountNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 text-left leading-relaxed">
                  <div className="font-bold text-amber-900 dark:text-amber-200 mb-0.5">คำแนะนำ:</div>
                  {settings.transferInstructions}
                </div>

                {settings.notes && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                    {settings.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={showResetConfirm}
        title="คืนค่าการตั้งค่าเริ่มต้น"
        description="คุณต้องการคืนค่าข้อมูลพร้อมเพย์และภาพ QR Code รับเงินคลังข้อสอบกลางเป็นค่าเริ่มต้นหรือไม่?"
        confirmLabel="ยืนยันคืนค่าเริ่มต้น"
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
};
