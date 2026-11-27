import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Gift,
  Lock,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Swords,
  Upload,
  X,
} from 'lucide-react';
import { EXAM_GRADE_LEVELS, ExamGradeFilter, LEARNING_STRANDS } from '../data/examQuestionBanks';
import {
  fetchCentralExamPaymentSettings,
  generatePromptPayPayload,
  getStrandMeta,
  loadCentralExamPaymentSettings,
} from '../lib/centralExamBank';
import {
  CentralExamPack,
  Course,
  GradeRecord,
  LearningStrandId,
  QuizQuestion,
  SchoolExamEntitlement,
  Student,
  Teacher,
  UserRole,
} from '../types';
import { QrCodeMatrix } from '../components/QrCodeMatrix';
import { PageHeader } from '../components/common/PageShell';
import { getModuleTone } from '../lib/moduleTheme';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';
import { compressImageFileToDataUrl } from '../lib/imageCompression';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableActionMenu } from '../components/common/TableActionMenu';
import { FutureNavIcon } from '../components/common/FutureIcon';
import { BaseModal } from '../components/common/BaseModal';

interface CentralExamPurchaseModalProps {
  pack: CentralExamPack;
  schoolName: string;
  isProcessing: boolean;
  onConfirmPurchase: (pack: CentralExamPack, method: 'promptpay' | 'invoice', slipUrl?: string) => Promise<void>;
  onClose: () => void;
}

const getPackQuestionCount = (pack: CentralExamPack) => pack.questionCount ?? pack.questions.length;

const STRAND_PALETTE: Record<
  LearningStrandId,
  { filter: string; selectedFilter: string; code: string; packCard: string; packBadge: string }
> = {
  thai: {
    filter: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:border-rose-400 dark:border-rose-900 dark:from-rose-950/40 dark:to-slate-900',
    selectedFilter: 'border-rose-500 ring-2 ring-rose-200 dark:ring-rose-900',
    code: 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
    packCard: 'border-rose-200 border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-50/70 via-white to-white hover:border-rose-300 dark:border-rose-900 dark:border-l-rose-500 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  },
  math: {
    filter: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white hover:border-violet-400 dark:border-violet-900 dark:from-violet-950/40 dark:to-slate-900',
    selectedFilter: 'border-violet-500 ring-2 ring-violet-200 dark:ring-violet-900',
    code: 'border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300',
    packCard: 'border-violet-200 border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-50/70 via-white to-white hover:border-violet-300 dark:border-violet-900 dark:border-l-violet-500 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  },
  science_tech: {
    filter: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white hover:border-sky-400 dark:border-sky-900 dark:from-sky-950/40 dark:to-slate-900',
    selectedFilter: 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900',
    code: 'border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300',
    packCard: 'border-sky-200 border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-50/70 via-white to-white hover:border-sky-300 dark:border-sky-900 dark:border-l-sky-500 dark:from-sky-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  },
  social: {
    filter: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-400 dark:border-amber-900 dark:from-amber-950/40 dark:to-slate-900',
    selectedFilter: 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900',
    code: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    packCard: 'border-amber-200 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/70 via-white to-white hover:border-amber-300 dark:border-amber-900 dark:border-l-amber-500 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  health_pe: {
    filter: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-400 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-slate-900',
    selectedFilter: 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900',
    code: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    packCard: 'border-emerald-200 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/70 via-white to-white hover:border-emerald-300 dark:border-emerald-900 dark:border-l-emerald-500 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  arts: {
    filter: 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white hover:border-fuchsia-400 dark:border-fuchsia-900 dark:from-fuchsia-950/40 dark:to-slate-900',
    selectedFilter: 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-900',
    code: 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300',
    packCard: 'border-fuchsia-200 border-l-4 border-l-fuchsia-500 bg-gradient-to-br from-fuchsia-50/70 via-white to-white hover:border-fuchsia-300 dark:border-fuchsia-900 dark:border-l-fuchsia-500 dark:from-fuchsia-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  career_tech: {
    filter: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white hover:border-orange-400 dark:border-orange-900 dark:from-orange-950/40 dark:to-slate-900',
    selectedFilter: 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-900',
    code: 'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
    packCard: 'border-orange-200 border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/70 via-white to-white hover:border-orange-300 dark:border-orange-900 dark:border-l-orange-500 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  },
  foreign_lang: {
    filter: 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-white hover:border-cyan-400 dark:border-cyan-900 dark:from-cyan-950/40 dark:to-slate-900',
    selectedFilter: 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-900',
    code: 'border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    packCard: 'border-cyan-200 border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-50/70 via-white to-white hover:border-cyan-300 dark:border-cyan-900 dark:border-l-cyan-500 dark:from-cyan-950/30 dark:via-slate-900 dark:to-slate-900',
    packBadge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  },
};

function matchesExamGradeFilter(gradeLevel: string, filter: ExamGradeFilter): boolean {
  if (filter === 'all') return true;
  const g = (gradeLevel || '').toLowerCase();
  const isAllRange = /ป\.1\s*-\s*ม\.6|ป\.6\s*-\s*ม\.6/.test(g);
  if (isAllRange) return true;
  if (filter === 'primary') return /ป\.|ประถม/.test(g);
  if (filter === 'm13') return /ม\.1|ม\.2|ม\.3|มัธยมศึกษาตอนต้น/.test(g);
  if (filter === 'm46') return /ม\.4|ม\.5|ม\.6|มัธยมศึกษาตอนปลาย/.test(g);
  return true;
}

const CentralExamPurchaseModal: React.FC<CentralExamPurchaseModalProps> = ({
  pack,
  schoolName,
  isProcessing,
  onConfirmPurchase,
  onClose,
}) => {
  const [method, setMethod] = useState<'promptpay' | 'invoice'>('promptpay');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [slipFilePreview, setSlipFilePreview] = useState<string | null>(null);
  const [slipUploadError, setSlipUploadError] = useState<string | null>(null);
  const [paymentSettingsError, setPaymentSettingsError] = useState<string | null>(null);
  const strandMeta = getStrandMeta(pack.strand);
  const [paymentSettings, setPaymentSettings] = useState(() => fetchCentralExamPaymentSettings());

  useEffect(() => {
    let active = true;
    loadCentralExamPaymentSettings()
      .then((settings) => {
        if (active) setPaymentSettings(settings);
      })
      .catch((error: unknown) => {
        if (active) setPaymentSettingsError(error instanceof Error ? error.message : 'โหลดข้อมูลชำระเงินไม่สำเร็จ');
      });
    return () => {
      active = false;
    };
  }, []);

  const promptPayCode = useMemo(() => {
    try {
      return generatePromptPayPayload(paymentSettings.promptPayId, pack.priceThb, paymentSettings.promptPayType);
    } catch {
      return '';
    }
  }, [paymentSettings.promptPayId, paymentSettings.promptPayType, pack.priceThb]);

  const handleCopyPromptPay = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(paymentSettings.promptPayId);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(file.type.toLowerCase())) {
      setSlipUploadError('กรุณาเลือกไฟล์สลิปชนิด PNG, JPG, WEBP หรือ GIF');
      setSlipFilePreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSlipUploadError('ไฟล์ภาพต้องมีขนาดไม่เกิน 5 MB');
      setSlipFilePreview(null);
      return;
    }

    setSlipUploadError(null);
    void compressImageFileToDataUrl(file, {
      maxDimension: 960,
      quality: 0.75,
      maxDataUrlLength: 140_000,
    })
      .then((compressed) => {
        setSlipFilePreview(compressed);
      })
      .catch(() => {
        setSlipUploadError('อ่านไฟล์ภาพไม่สำเร็จ');
      });
  };

  const renderSlipUpload = () => (
    <div className="w-full text-left pt-1">
      <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
          <Upload className="w-3.5 h-3.5" />
          <span>* บังคับแนบสลิปหลักฐานการโอน 100%</span>
        </span>
        {slipFilePreview ? (
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> แนบสลิปแล้ว
          </span>
        ) : (
          <span className="text-[10px] text-rose-600 font-medium">ยังไม่ได้แนบสลิป</span>
        )}
      </label>

      {slipFilePreview ? (
        <div className="relative p-2 bg-white rounded-lg border border-emerald-300 flex items-center gap-3">
          <img
            src={slipFilePreview}
            alt="Slip Preview"
            className="w-12 h-16 object-cover rounded border border-slate-200"
          />
          <div className="flex-1 text-[11px]">
            <span className="font-semibold text-emerald-700 block">แนบภาพสลิปเรียบร้อยแล้ว</span>
            <span className="text-slate-500 text-[10px]">ปลดล็อกทันที + Super Admin ตรวจย้อนหลัง</span>
          </div>
          <button
            type="button"
            onClick={() => setSlipFilePreview(null)}
            className="text-xs text-rose-600 hover:underline p-1 cursor-pointer"
          >
            เปลี่ยนรูป
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          required
          onChange={handleSlipChange}
          className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
        />
      )}

      {slipUploadError ? (
        <p role="alert" className="text-[10px] text-rose-600 mt-1">{slipUploadError}</p>
      ) : !slipFilePreview ? (
        <p className="text-[10px] text-rose-600 mt-1">
          ⚠️ ระบบบังคับแนบสลิปการโอนเงิน 100% ก่อนจึงจะกดปลดล็อกข้อสอบได้
        </p>
      ) : null}
    </div>
  );

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      closeDisabled={isProcessing}
      title="สั่งซื้อลิขสิทธิ์ข้อสอบกลางสำหรับโรงเรียน"
      icon={<ShoppingBag className="w-4 h-4 text-amber-600" />}
      maxWidthClass="max-w-md"
      zIndexClass="z-[70]"
      bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isProcessing || !slipFilePreview || Boolean(slipUploadError)}
            onClick={() => void onConfirmPurchase(pack, method, slipFilePreview || undefined)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'กำลังบันทึก...'
                : 'ยืนยันสลิปและปลดล็อกทันที'}
            </span>
          </button>
        </>
      }
    >

        <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
          <div className="text-[11px] font-bold text-[var(--color-primary-text)]">
            {strandMeta.code} · {strandMeta.nameTh} · {pack.gradeLevel}
          </div>
          <div className="text-sm font-extrabold text-[var(--color-text-title)]">{pack.titleTh}</div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
            <span className="text-[var(--color-text-body)]">จำนวน {getPackQuestionCount(pack)} ข้อ (ใช้ได้ทั้งโรงเรียน)</span>
            <span className="text-base font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
              ฿{pack.priceThb.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="font-bold text-[var(--color-text-title)]">เลือกวิธีชำระเงิน</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('promptpay')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                method === 'promptpay'
                  ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-bold'
                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>QR PromptPay</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">ปลดล็อกใช้งานทันที</div>
            </button>
            <button
              type="button"
              onClick={() => setMethod('invoice')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                method === 'invoice'
                  ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-bold'
                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>ใบแจ้งหนี้โรงเรียน</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">เบิกงบวิชาการโรงเรียน</div>
            </button>
          </div>
        </div>

        {method === 'promptpay' ? paymentSettingsError ? (
          <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800">
            โหลดข้อมูลผู้รับชำระเงินไม่สำเร็จ จึงยังไม่สามารถแสดงวิธีชำระเงินได้: {paymentSettingsError}
          </p>
        ) : (
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col items-center gap-2.5 text-center shadow-xs">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-extrabold">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>{paymentSettings.bankName || 'พร้อมเพย์ / PromptPay'}</span>
            </div>

            {/* Uploaded QR Image or Generated EMVCo QR */}
            {paymentSettings.qrImageUrl ? (
              <div className="space-y-1">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 inline-block">
                  <img
                    src={paymentSettings.qrImageUrl}
                    alt="PromptPay QR Code"
                    className="w-44 h-44 object-contain rounded"
                  />
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">
                  ✓ QR Code รับเงินอย่างเป็นทางการ (Super Admin)
                </div>
              </div>
            ) : promptPayCode ? (
              <div className="space-y-1 flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                  <QrCodeMatrix
                    value={promptPayCode}
                    size={160}
                    label={`QR ชำระค่าชุดข้อสอบ ${pack.titleTh}`}
                  />
                </div>
                <div className="text-[10px] text-blue-600 font-bold">
                  ✓ สแกนได้ด้วยแอปธนาคารทุกแห่งในไทย
                </div>
              </div>
            ) : (
              <p role="alert" className="text-xs text-rose-700">
                หมายเลขพร้อมเพย์ไม่ถูกต้องตามประเภทที่กำหนด
              </p>
            )}
            <div className="text-sm font-extrabold text-slate-900">
              ยอดชำระ <span className="text-amber-600 text-lg font-black">฿{pack.priceThb.toLocaleString()}</span>
            </div>

            {/* Beneficiary Info */}
            <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">ชื่อบัญชีผู้รับ:</span>
                <span className="font-bold text-slate-900 text-[11px] truncate max-w-[200px]">
                  {paymentSettings.accountName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">หมายเลขพร้อมเพย์:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                  <span>{paymentSettings.promptPayId}</span>
                  <button
                    type="button"
                    onClick={handleCopyPromptPay}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                    title="คัดลอกหมายเลข"
                  >
                    {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {paymentSettings.accountNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">เลขที่บัญชี:</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">
                    {paymentSettings.accountNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="w-full text-left text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
              <span className="font-bold text-amber-900">คำแนะนำ: </span>
              {paymentSettings.transferInstructions}
            </div>

            {renderSlipUpload()}
          </div>
        ) : (
          <>
            <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs space-y-1 text-[var(--color-text-body)]">
              <div className="font-bold text-[var(--color-text-title)]">ออกใบแจ้งหนี้ในนาม: {schoolName}</div>
              <p>
                ระบบจะเปิดสิทธิ์ข้อสอบเข้าคลังโรงเรียนทันทีเมื่อแนบสลิป และบันทึกยอด ฿{pack.priceThb.toLocaleString()} เพื่อดำเนินการตรวจสอบย้อนหลัง
              </p>
            </div>
            {renderSlipUpload()}
          </>
        )}

        {/* Model 2 Instant Access Notice */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px]">
          <span className="font-bold">⚡ โมเดลที่ 2 (Instant Access with Audit): </span>
          <span>
            {method === 'promptpay'
              ? 'เมื่อแนบสลิปครบ 100% ระบบจะปลดล็อกข้อสอบให้โรงเรียนทันที Super Admin สามารถตรวจสอบสลิปย้อนหลังและเพิกถอนสิทธิ์ได้หากสลิปไม่ถูกต้อง'
              : 'ระบบจะปลดล็อกข้อสอบทันทีและออกใบแจ้งหนี้เพื่อดำเนินการเบิกจ่าย'}
          </span>
        </div>
    </BaseModal>
  );
};

interface CentralExamNotificationPopupProps {
  isOpen: boolean;
  schoolName: string;
  unclaimedPacks: CentralExamPack[];
  onClaimFreePack: (pack: CentralExamPack) => Promise<void>;
  onClaimAllFreePacks: () => Promise<void>;
  onPurchasePack: (pack: CentralExamPack, method: 'promptpay' | 'invoice', slipUrl?: string) => Promise<void>;
  onOpenHub: () => void;
  onDismiss: () => void;
}

export const CentralExamNotificationPopup: React.FC<CentralExamNotificationPopupProps> = ({
  isOpen,
  schoolName,
  unclaimedPacks,
  onClaimFreePack,
  onClaimAllFreePacks,
  onPurchasePack,
  onOpenHub,
  onDismiss,
}) => {
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [previewPackId, setPreviewPackId] = useState<string | null>(null);
  const [checkoutPack, setCheckoutPack] = useState<CentralExamPack | null>(null);
  const [popupStrandFilter, setPopupStrandFilter] = useState<LearningStrandId | 'all'>('all');
  const [popupPage, setPopupPage] = useState(1);

  useEffect(() => {
    setPopupPage(1);
  }, [popupStrandFilter, unclaimedPacks.length]);

  const strandCounts = useMemo(() => {
    const counts = new Map<LearningStrandId, number>();
    for (const p of unclaimedPacks) {
      counts.set(p.strand, (counts.get(p.strand) || 0) + 1);
    }
    return counts;
  }, [unclaimedPacks]);

  const visiblePopupPacks = useMemo(() => {
    if (popupStrandFilter === 'all') return unclaimedPacks;
    return unclaimedPacks.filter((p) => p.strand === popupStrandFilter);
  }, [unclaimedPacks, popupStrandFilter]);

  if (!isOpen || unclaimedPacks.length === 0) return null;

  const POPUP_PAGE_SIZE = 10;
  const totalPopupPages = Math.max(1, Math.ceil(visiblePopupPacks.length / POPUP_PAGE_SIZE));
  const safePopupPage = Math.min(popupPage, totalPopupPages);
  const paginatedPopupPacks = visiblePopupPacks.slice(
    (safePopupPage - 1) * POPUP_PAGE_SIZE,
    safePopupPage * POPUP_PAGE_SIZE
  );

  const freePacks = unclaimedPacks.filter((p) => p.pricingType === 'free');
  const paidPacks = unclaimedPacks.filter((p) => p.pricingType === 'paid');
  const totalNewQuestions = unclaimedPacks.reduce((sum, p) => sum + getPackQuestionCount(p), 0);

  const handleSingleFree = async (pack: CentralExamPack) => {
    setProcessingPackId(pack.id);
    try {
      await onClaimFreePack(pack);
    } finally {
      setProcessingPackId(null);
    }
  };

  const handleAllFree = async () => {
    setProcessingPackId('all_free');
    try {
      await onClaimAllFreePacks();
    } finally {
      setProcessingPackId(null);
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onDismiss}
        title={`มี ${unclaimedPacks.length} ชุดข้อสอบใหม่ (รวม ${totalNewQuestions.toLocaleString()} ข้อ) พร้อมใช้ใน ${schoolName}`}
        subtitle="แจ้งเตือนข้อสอบกลางชุดใหม่ · ครอบคลุมคลังข้อสอบ 8 กลุ่มสาระการเรียนรู้"
        icon={<BellRing className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-2xl"
        heightClass="max-h-[88vh]"
        zIndexClass="z-[65]"
        bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden p-0"
        footerClassName="justify-between"
        footer={
          <>
            <button
              type="button"
              onClick={onOpenHub}
              className="px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-bold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] cursor-pointer"
            >
              เปิดหน้าคลังข้อสอบกลางทั้งหมด (8 สาระ)
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] hover:bg-black/5 cursor-pointer"
            >
              ปิดหน้าต่างนี้ (ไว้รับภายหลัง)
            </button>
          </>
        }
      >
          {/* Summary Strip + Claim All Free */}
          <div className="px-5 py-3 border-b border-[var(--color-border)] space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-[var(--color-text-body)]">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  ชุดฟรี: {freePacks.length} ชุด
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  ชุดแบบซื้อ: {paidPacks.length} ชุด
                </span>
              </div>

              {freePacks.length > 0 && (
                <button
                  type="button"
                  disabled={processingPackId !== null}
                  onClick={() => void handleAllFree()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>
                    {processingPackId === 'all_free'
                      ? 'กำลังเพิ่มเข้าโรงเรียน...'
                      : `กดรับชุดฟรีทั้งหมด (${freePacks.length} ชุด)`}
                  </span>
                </button>
              )}
            </div>

            {/* Clean Strand Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => setPopupStrandFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  popupStrandFilter === 'all'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                }`}
              >
                ทั้งหมด ({unclaimedPacks.length})
              </button>
              {LEARNING_STRANDS.map((s) => {
                const count = strandCounts.get(s.id) || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPopupStrandFilter(s.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                      popupStrandFilter === s.id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {s.code} · {s.nameTh} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable List of New Packs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
            {paginatedPopupPacks.map((pack) => {
              const strandMeta = getStrandMeta(pack.strand);
              const isFree = pack.pricingType === 'free';
              const isPreviewOpen = previewPackId === pack.id;
              const sampleQ = pack.questions[0];

              return (
                <div
                  key={pack.id}
                  className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                        <span className="font-bold text-[var(--color-text-title)]">
                          {strandMeta.code} · {strandMeta.nameTh}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{pack.gradeLevel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{getPackQuestionCount(pack)} ข้อ</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-[var(--color-text-title)]">{pack.titleTh}</h3>
                      <p className="text-xs text-[var(--color-text-body)] line-clamp-2">{pack.descriptionTh}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewPackId(isPreviewOpen ? null : pack.id)}
                        className="px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                      >
                        {isPreviewOpen ? 'ซ่อนตัวอย่าง' : 'ดูตัวอย่าง'}
                      </button>

                      {isFree ? (
                        <button
                          type="button"
                          disabled={processingPackId !== null}
                          onClick={() => void handleSingleFree(pack)}
                          className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>{processingPackId === pack.id ? 'กำลังรับ...' : 'กดรับฟรี'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={processingPackId !== null}
                          onClick={() => setCheckoutPack(pack)}
                          className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer tabular-nums"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>ซื้อ ฿{pack.priceThb.toLocaleString()}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isPreviewOpen && sampleQ && (
                    <div className="p-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs space-y-1.5">
                      <div className="font-bold text-[var(--color-text-title)]">
                        ตัวอย่างโจทย์ข้อ 1: {sampleQ.questionTh}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[var(--color-text-body)]">
                        {sampleQ.options.map((opt, idx) => (
                          <div key={idx}>
                            {String.fromCharCode(65 + idx)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPopupPages > 1 && (
              <div className="pt-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span className="tabular-nums">
                  หน้า {safePopupPage} / {totalPopupPages} (ทั้งหมด {visiblePopupPacks.length} ชุด)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePopupPage <= 1}
                    onClick={() => setPopupPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ก่อนหน้า</span>
                  </button>
                  <button
                    type="button"
                    disabled={safePopupPage >= totalPopupPages}
                    onClick={() => setPopupPage((p) => Math.min(totalPopupPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
      </BaseModal>

      {checkoutPack && (
        <CentralExamPurchaseModal
          pack={checkoutPack}
          schoolName={schoolName}
          isProcessing={processingPackId === checkoutPack.id}
          onClose={() => setCheckoutPack(null)}
          onConfirmPurchase={async (pack, method, slipUrl) => {
            setProcessingPackId(pack.id);
            try {
              await onPurchasePack(pack, method, slipUrl);
              setCheckoutPack(null);
            } finally {
              setProcessingPackId(null);
            }
          }}
        />
      )}
    </>
  );
};

interface CentralExamHubViewProps {
  schoolId: string;
  schoolName: string;
  currentRole: UserRole;
  packs: CentralExamPack[];
  entitlements: SchoolExamEntitlement[];
  schoolQuestions: QuizQuestion[];
  courses?: Course[];
  teachers?: Teacher[];
  students?: Student[];
  grades?: GradeRecord[];
  onClaimFreePack: (pack: CentralExamPack) => Promise<void>;
  onPurchasePack: (pack: CentralExamPack, method: 'promptpay' | 'invoice', slipUrl?: string) => Promise<void>;
  onSyncQuizScoresToGradebook?: (
    courseId: string,
    packTitle: string,
    entries: { studentId: string; quizScore: number }[]
  ) => void;
  onOpenQuestionBankInEduBattle?: () => void;
  onOpenCoordinationDesk?: () => void;
}

export const CentralExamHubView: React.FC<CentralExamHubViewProps> = ({
  schoolName,
  currentRole,
  packs,
  entitlements,
  schoolQuestions,
  courses = [],
  teachers = [],
  students = [],
  grades = [],
  onClaimFreePack,
  onPurchasePack,
  onSyncQuizScoresToGradebook,
  onOpenQuestionBankInEduBattle,
  onOpenCoordinationDesk,
}) => {
  const [selectedStrand, setSelectedStrand] = useState<LearningStrandId | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<ExamGradeFilter>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'unclaimed' | 'claimed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPack, setPreviewPack] = useState<CentralExamPack | null>(null);
  const [checkoutPack, setCheckoutPack] = useState<CentralExamPack | null>(null);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quizSyncPack, setQuizSyncPack] = useState<CentralExamPack | null>(null);
  const [quizSyncTeacherFilter, setQuizSyncTeacherFilter] = useState<string>('all');
  const [quizSyncCourseId, setQuizSyncCourseId] = useState<string>('');
  const [quizScoreDrafts, setQuizScoreDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStrand, gradeFilter, pricingFilter, ownershipFilter, searchQuery]);

  const quizSyncTeacherOptions = useMemo(
    () => buildCourseTeacherOptions(courses, teachers),
    [courses, teachers]
  );

  const quizSyncFilteredCourses = useMemo(
    () =>
      courses.filter((c) =>
        courseMatchesTeacherFilter(c, quizSyncTeacherFilter, quizSyncTeacherOptions)
      ),
    [courses, quizSyncTeacherFilter, quizSyncTeacherOptions]
  );

  const openQuizSyncModal = (pack: CentralExamPack) => {
    const firstCourse =
      courses.find((c) => (c.room && pack.gradeLevel.includes(c.room)) || (c.titleTh && pack.gradeLevel.includes(c.titleTh))) || courses[0];
    const targetCourseId = firstCourse?.id || '';
    const initialScores: Record<string, number> = {};
    const targetStudents = firstCourse?.enrolledStudentIds?.length
      ? students.filter((s) => firstCourse.enrolledStudentIds.includes(s.id))
      : students.slice(0, 10);
    targetStudents.forEach((stu) => {
      const existing = grades.find(
        (g) => g.courseId === targetCourseId && g.studentId === stu.id
      );
      initialScores[stu.id] = existing?.quizScore ?? 8;
    });
    setQuizSyncTeacherFilter('all');
    setQuizSyncCourseId(targetCourseId);
    setQuizScoreDrafts(initialScores);
    setQuizSyncPack(pack);
  };

  const handleSelectQuizCourse = (courseId: string) => {
    setQuizSyncCourseId(courseId);
    const selectedCourse = courses.find((c) => c.id === courseId);
    const nextScores: Record<string, number> = {};
    const targetStudents = selectedCourse?.enrolledStudentIds?.length
      ? students.filter((s) => selectedCourse.enrolledStudentIds.includes(s.id))
      : students.slice(0, 10);
    targetStudents.forEach((stu) => {
      const existing = grades.find((g) => g.courseId === courseId && g.studentId === stu.id);
      nextScores[stu.id] = existing?.quizScore ?? 8;
    });
    setQuizScoreDrafts(nextScores);
  };

  const publishedPacks = useMemo(
    () => packs.filter((p) => p.status === 'published'),
    [packs]
  );

  const entitlementByPackId = useMemo(() => {
    const map = new Map<string, SchoolExamEntitlement>();
    for (const ent of entitlements) {
      map.set(ent.packId, ent);
    }
    return map;
  }, [entitlements]);

  const canSchoolAdminAcquire = currentRole === 'admin' || currentRole === 'super_admin';

  const strandStats = useMemo(() => {
    return LEARNING_STRANDS.map((strand) => {
      const matchingPacks = publishedPacks.filter((p) => p.strand === strand.id);
      const claimedPackCount = matchingPacks.filter((p) => entitlementByPackId.has(p.id)).length;
      const totalPackQuestions = matchingPacks.reduce((sum, p) => sum + getPackQuestionCount(p), 0);
      return {
        ...strand,
        packCount: matchingPacks.length,
        claimedPackCount,
        totalPackQuestions,
      };
    });
  }, [publishedPacks, entitlementByPackId]);

  const filteredPacks = useMemo(() => {
    return publishedPacks.filter((p) => {
      const isClaimed = entitlementByPackId.has(p.id);
      if (selectedStrand !== 'all' && p.strand !== selectedStrand) return false;
      if (!matchesExamGradeFilter(p.gradeLevel, gradeFilter)) return false;
      if (pricingFilter !== 'all' && p.pricingType !== pricingFilter) return false;
      if (ownershipFilter === 'claimed' && !isClaimed) return false;
      if (ownershipFilter === 'unclaimed' && isClaimed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.titleTh.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.descriptionTh.toLowerCase().includes(q) ||
          p.gradeLevel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [publishedPacks, entitlementByPackId, selectedStrand, gradeFilter, pricingFilter, ownershipFilter, searchQuery]);

  const PACKS_PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(filteredPacks.length / PACKS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPacks = useMemo(() => {
    const start = (safePage - 1) * PACKS_PER_PAGE;
    return filteredPacks.slice(start, start + PACKS_PER_PAGE);
  }, [filteredPacks, safePage]);

  const unclaimedFreeInView = useMemo(
    () =>
      filteredPacks.filter(
        (p) => p.pricingType === 'free' && !entitlementByPackId.has(p.id)
      ),
    [filteredPacks, entitlementByPackId]
  );

  const hasActiveFilter =
    selectedStrand !== 'all' ||
    gradeFilter !== 'all' ||
    pricingFilter !== 'all' ||
    ownershipFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedStrand('all');
    setGradeFilter('all');
    setPricingFilter('all');
    setOwnershipFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleClaimFree = async (pack: CentralExamPack) => {
    setProcessingPackId(pack.id);
    try {
      await onClaimFreePack(pack);
      setToastMessage(`รับชุดข้อสอบ "${pack.titleTh}" (+${getPackQuestionCount(pack)} ข้อ) เข้าคลังโรงเรียนแล้ว`);
    } finally {
      setProcessingPackId(null);
    }
  };

  const handleClaimAllFreeInView = async () => {
    if (unclaimedFreeInView.length === 0) return;
    setProcessingPackId('bulk_free_view');
    let claimed = 0;
    try {
      for (const pack of unclaimedFreeInView) {
        await onClaimFreePack(pack);
        claimed += 1;
      }
      setToastMessage(`รับชุดข้อสอบฟรีเข้าคลังโรงเรียนสำเร็จ ${claimed} ชุด`);
    } finally {
      setProcessingPackId(null);
    }
  };

  return (
    <div className={`space-y-5 ${getModuleTone('central_exam_hub')}`}>
      {/* Clean SaaS Header */}
      <PageHeader
        kicker={`คลังข้อสอบกลาง 8 กลุ่มสาระการเรียนรู้ · ${schoolName}`}
        title="ศูนย์รับและสั่งซื้อชุดข้อสอบกลางเข้าโรงเรียน"
        description={`ชุดข้อสอบที่กดรับฟรีหรือสั่งซื้อแล้ว จะถูกเพิ่มเข้าคลังข้อสอบของโรงเรียนทันที (ปัจจุบันมี ${schoolQuestions.length} ข้อ)`}
        icon={<FutureNavIcon tab="central_exam_hub" size={20} active />}
        actions={
          onOpenQuestionBankInEduBattle ? (
            <button
              type="button"
              onClick={onOpenQuestionBankInEduBattle}
              className="btn-action-primary"
            >
              <Swords className="w-4 h-4" />
              <span>ไปที่คลังข้อสอบ &amp; เกม EduBattle</span>
            </button>
          ) : undefined
        }
      />

      {toastMessage && (
        <div className="ui-alert ui-alert-success justify-between">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="cursor-pointer opacity-80 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 8-Strand Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {strandStats.map((s) => {
          const isSelected = selectedStrand === s.id;
          const palette = STRAND_PALETTE[s.id];
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedStrand(isSelected ? 'all' : s.id)}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                palette.filter
              } ${
                isSelected
                  ? `${palette.selectedFilter} text-[var(--color-text-title)]`
                  : 'text-[var(--color-text-title)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={`px-1.5 py-0.5 rounded-md border font-mono ${palette.code}`}>
                  {s.code}
                </span>
                <span className="tabular-nums text-[var(--color-text-body)]">
                  {s.claimedPackCount}/{s.packCount}
                </span>
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-title)] mt-2 line-clamp-1">
                {s.nameTh}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                {s.totalPackQuestions} ข้อ
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อชุดข้อสอบ วิชา หรือระดับชั้น..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="กรองตามระดับชั้น"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as ExamGradeFilter)}
            className="px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
          >
            {EXAM_GRADE_LEVELS.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.labelTh}
              </option>
            ))}
          </select>

          <select
            aria-label="กรองตามประเภทราคา"
            value={pricingFilter}
            onChange={(e) => setPricingFilter(e.target.value as 'all' | 'free' | 'paid')}
            className="px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
          >
            <option value="all">ทุกประเภทราคา</option>
            <option value="free">ชุดข้อสอบฟรี (Free)</option>
            <option value="paid">ชุดข้อสอบแบบซื้อ (Paid)</option>
          </select>

          <select
            aria-label="กรองตามสถานะการรับ"
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as 'all' | 'unclaimed' | 'claimed')}
            className="px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
          >
            <option value="all">ทั้งหมด ({publishedPacks.length})</option>
            <option value="unclaimed">
              ยังไม่ได้รับ/ซื้อ ({publishedPacks.filter((p) => !entitlementByPackId.has(p.id)).length})
            </option>
            <option value="claimed">
              รับ/ซื้อเข้าโรงเรียนแล้ว ({publishedPacks.filter((p) => entitlementByPackId.has(p.id)).length})
            </option>
          </select>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* Clean Status Strip & Quick Bulk Claim */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
        <div className="tabular-nums">
          {selectedStrand !== 'all' ? (
            <span>
              กลุ่มสาระฯ <strong className="text-[var(--color-text-title)]">{getStrandMeta(selectedStrand).nameTh}</strong> · พบ {filteredPacks.length} ชุด
            </span>
          ) : (
            <span>
              แสดง {(safePage - 1) * PACKS_PER_PAGE + (filteredPacks.length > 0 ? 1 : 0)}–
              {Math.min(safePage * PACKS_PER_PAGE, filteredPacks.length)} จาก {filteredPacks.length} ชุด (8 สาระ × 10 ชุด)
            </span>
          )}
        </div>

        {canSchoolAdminAcquire && unclaimedFreeInView.length > 0 && (
          <button
            type="button"
            disabled={processingPackId !== null}
            onClick={() => void handleClaimAllFreeInView()}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>
              {processingPackId === 'bulk_free_view'
                ? 'กำลังรับชุดฟรีเข้าคลัง...'
                : `รับชุดฟรีในหน้านี้ทั้งหมด (${unclaimedFreeInView.length} ชุด)`}
            </span>
          </button>
        )}
      </div>

      {/* Packs Grid */}
      {filteredPacks.length === 0 ? (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-10 text-center space-y-2">
          <p className="text-sm font-bold text-[var(--color-text-title)]">
            {publishedPacks.length === 0
              ? 'ยังไม่มีชุดข้อสอบกลางที่เผยแพร่ในฐานข้อมูล'
              : 'ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไขการค้นหา'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {publishedPacks.length === 0
              ? 'กรุณาให้ผู้ดูแลระบบสูงสุด (Super Admin) เปิดแท็บ คลังข้อสอบกลาง เพื่อซิงก์ชุดข้อสอบมาตรฐานทั้ง 80 ชุดเข้าสู่ระบบ'
              : 'ลองปรับคำค้นหาหรือล้างตัวกรองเพื่อดูชุดข้อสอบทั้งหมด'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPacks.map((pack) => {
            const strandMeta = getStrandMeta(pack.strand);
            const strandPalette = STRAND_PALETTE[pack.strand];
            const entitlement = entitlementByPackId.get(pack.id);
            const isFree = pack.pricingType === 'free';

            return (
              <div
                key={pack.id}
                className={`group rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${strandPalette.packCard}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-bold ${strandPalette.packBadge}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                      {strandMeta.code} · {strandMeta.nameTh}
                    </span>
                    {entitlement ? (
                      <StatusBadge size="xs" status="complete" label="รับเข้าโรงเรียนแล้ว" />
                    ) : isFree ? (
                      <StatusBadge size="xs" status="complete" label="ฟรี" />
                    ) : (
                      <StatusBadge size="xs" status="pending" label={`฿${pack.priceThb.toLocaleString()} / รร.`} />
                    )}
                  </div>

                  <h3 className="min-h-[2.5rem] line-clamp-2 text-sm font-extrabold text-[var(--color-text-title)] leading-snug">
                    {pack.titleTh}
                  </h3>
                  <p className="text-xs text-[var(--color-text-body)] line-clamp-2">{pack.descriptionTh}</p>

                  <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2 pt-1">
                    <span>{pack.gradeLevel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-semibold text-[var(--color-text-title)]">
                      {getPackQuestionCount(pack)} ข้อ
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  {entitlement ? (
                    <button
                      type="button"
                      onClick={onOpenQuestionBankInEduBattle}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>เปิดใช้ในคลัง</span>
                    </button>
                  ) : canSchoolAdminAcquire ? (
                    isFree ? (
                      <button
                        type="button"
                        disabled={processingPackId === pack.id || processingPackId === 'bulk_free_view'}
                        onClick={() => void handleClaimFree(pack)}
                        className="flex-1 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Gift className="w-3.5 h-3.5 shrink-0" />
                        <span>{processingPackId === pack.id ? 'กำลังรับ...' : 'กดรับข้อสอบฟรี'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCheckoutPack(pack)}
                        className="flex-1 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer tabular-nums"
                      >
                        <Coins className="w-3.5 h-3.5 shrink-0" />
                        <span>สั่งซื้อ ฿{pack.priceThb.toLocaleString()}</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewPack(pack)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>ดูตัวอย่างข้อสอบ</span>
                    </button>
                  )}

                  <TableActionMenu
                    ariaLabel={`จัดการชุดข้อสอบ ${pack.titleTh}`}
                    items={[
                      ...(entitlement || canSchoolAdminAcquire
                        ? [
                            {
                              id: 'preview',
                              label: 'ดูตัวอย่างข้อสอบ',
                              icon: <Eye className="w-3.5 h-3.5" />,
                              onClick: () => setPreviewPack(pack),
                            },
                          ]
                        : onOpenCoordinationDesk
                          ? [
                              {
                                id: 'ask-admin',
                                label: 'แจ้ง Admin กดรับ/ซื้อชุดนี้',
                                icon: <Lock className="w-3.5 h-3.5" />,
                                variant: 'warning' as const,
                                onClick: () => onOpenCoordinationDesk(),
                              },
                            ]
                          : []),
                      ...(entitlement && courses.length > 0 && onSyncQuizScoresToGradebook
                        ? [
                            {
                              id: 'sync-quiz',
                              label: 'ส่ง Quiz เข้าสมุดคะแนน',
                              icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                              variant: 'primary' as const,
                              onClick: () => openQuizSyncModal(pack),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)] text-xs">
          <span className="text-[var(--color-text-muted)] tabular-nums">
            หน้า {safePage} จาก {totalPages} ({filteredPacks.length} ชุดข้อสอบ)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] disabled:opacity-40 cursor-pointer flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ก่อนหน้า</span>
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold tabular-nums cursor-pointer transition ${
                  pageNum === safePage
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] disabled:opacity-40 cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sample Questions Preview Modal */}
      <BaseModal
        isOpen={Boolean(previewPack)}
        onClose={() => setPreviewPack(null)}
        title={previewPack?.titleTh ?? ''}
        subtitle={previewPack ? `ตัวอย่างข้อสอบ · ${getStrandMeta(previewPack.strand).nameTh}` : undefined}
        icon={<Eye className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-xl"
        heightClass="max-h-[85vh]"
        zIndexClass="z-[70]"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-xs"
      >
        {previewPack && (
          <>
            {previewPack.questions.slice(0, entitlementByPackId.has(previewPack.id) ? 50 : 3).map((q, idx) => (
              <div
                key={q.id}
                className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1.5"
              >
                <div className="font-bold text-[var(--color-text-title)]">
                  {idx + 1}. {q.questionTh}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[var(--color-text-body)]">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx}>
                      {String.fromCharCode(65 + oIdx)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!entitlementByPackId.has(previewPack.id) && getPackQuestionCount(previewPack) > 3 && (
              <div className="p-3 rounded-xl border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
                แสดงตัวอย่าง 3 ข้อแรก · กดรับ/สั่งซื้อเพื่อปลดล็อกครบทั้ง {getPackQuestionCount(previewPack)} ข้อ พร้อมเฉลยละเอียด
              </div>
            )}
          </>
        )}
      </BaseModal>

      {checkoutPack && (
        <CentralExamPurchaseModal
          pack={checkoutPack}
          schoolName={schoolName}
          isProcessing={processingPackId === checkoutPack.id}
          onClose={() => setCheckoutPack(null)}
          onConfirmPurchase={async (pack, method, slipUrl) => {
            setProcessingPackId(pack.id);
            try {
              await onPurchasePack(pack, method, slipUrl);
              setCheckoutPack(null);
              setToastMessage(
                `⚡ ปลดล็อก "${pack.titleTh}" (+${getPackQuestionCount(pack)} ข้อ) เข้าคลังโรงเรียนทันที (รอ Super Admin ตรวจสอบสลิปย้อนหลัง)`
              );
            } finally {
              setProcessingPackId(null);
            }
          }}
        />
      )}

      <BaseModal
        isOpen={Boolean(quizSyncPack)}
        onClose={() => setQuizSyncPack(null)}
        title={quizSyncPack?.titleTh ?? ''}
        subtitle="ส่งคะแนนทดสอบย่อย (Quiz /10) เข้าสมุดคะแนน"
        icon={<CheckCircle2 className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-xl"
        heightClass="max-h-[88vh]"
        zIndexClass="z-[70]"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-xs"
        footer={
          <>
            <button
              type="button"
              onClick={() => setQuizSyncPack(null)}
              className="px-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!quizSyncCourseId || Object.keys(quizScoreDrafts).length === 0}
              onClick={() => {
                if (!quizSyncPack || !quizSyncCourseId || !onSyncQuizScoresToGradebook) return;
                const entries = Object.entries(quizScoreDrafts).map(([studentId, quizScore]) => ({
                  studentId,
                  quizScore,
                }));
                onSyncQuizScoresToGradebook(quizSyncCourseId, quizSyncPack.titleTh, entries);
                setToastMessage(
                  `บันทึกคะแนน Quiz จาก "${quizSyncPack.titleTh}" เข้าสมุดคะแนนจำนวน ${entries.length} คนเรียบร้อยแล้ว`
                );
                setQuizSyncPack(null);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              บันทึกคะแนนเก็บเข้าสมุดคะแนน
            </button>
          </>
        }
      >
        {quizSyncPack && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quizSyncTeacherOptions.length > 0 && (
                <div>
                  <label className="block font-bold text-[var(--color-text-title)] mb-1">
                    กรองวิชาตามรายชื่อครู
                  </label>
                  <select
                    aria-label="กรองวิชาตามรายชื่อครู"
                    value={quizSyncTeacherFilter}
                    onChange={(e) => {
                      const nextTeacher = e.target.value;
                      setQuizSyncTeacherFilter(nextTeacher);
                      const matching = courses.filter((c) =>
                        courseMatchesTeacherFilter(c, nextTeacher, quizSyncTeacherOptions)
                      );
                      if (matching.length > 0 && !matching.some((c) => c.id === quizSyncCourseId)) {
                        handleSelectQuizCourse(matching[0].id);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    <option value="all">ครูผู้สอนทุกคน ({quizSyncTeacherOptions.length})</option>
                    {quizSyncTeacherOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count} วิชา)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={quizSyncTeacherOptions.length > 0 ? '' : 'sm:col-span-2'}>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  เลือกรายวิชาปลายทางในสมุดคะแนน
                </label>
                <select
                  value={quizSyncCourseId}
                  onChange={(e) => handleSelectQuizCourse(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                >
                  {quizSyncFilteredCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.titleTh} ({c.room || c.semester})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
              <table className="table-comfortable w-full text-left text-xs">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-body)]">
                  <tr>
                    <th className="py-2 px-3">รหัส</th>
                    <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2 px-3 text-right">คะแนน Quiz (/10)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {Object.keys(quizScoreDrafts).map((stuId) => {
                    const stu = students.find((s) => s.id === stuId);
                    if (!stu) return null;
                    return (
                      <tr key={stu.id}>
                        <td className="py-2 px-3 font-mono text-[var(--color-text-muted)]">
                          {stu.studentIdNumber}
                        </td>
                        <td className="py-2 px-3 font-medium text-[var(--color-text-title)]">
                          {stu.firstNameTh} {stu.lastNameTh}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={quizScoreDrafts[stu.id] ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                              setQuizScoreDrafts((prev) => ({ ...prev, [stu.id]: val }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-right font-mono font-bold tabular-nums"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </BaseModal>
    </div>
  );
};
