import React, { useMemo, useState } from 'react';
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  Coins,
  CreditCard,
  Eye,
  FileText,
  Gift,
  Lock,
  Search,
  ShoppingBag,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { LEARNING_STRANDS } from '../data/examQuestionBanks';
import { getStrandMeta } from '../lib/centralExamBank';
import {
  CentralExamPack,
  LearningStrandId,
  QuizQuestion,
  SchoolExamEntitlement,
  UserRole,
} from '../types';
import { QrCodeMatrix } from './QrCodeMatrix';

interface CentralExamPurchaseModalProps {
  pack: CentralExamPack;
  schoolName: string;
  isProcessing: boolean;
  onConfirmPurchase: (pack: CentralExamPack, method: 'promptpay' | 'invoice') => Promise<void>;
  onClose: () => void;
}

const CentralExamPurchaseModal: React.FC<CentralExamPurchaseModalProps> = ({
  pack,
  schoolName,
  isProcessing,
  onConfirmPurchase,
  onClose,
}) => {
  const [method, setMethod] = useState<'promptpay' | 'invoice'>('promptpay');
  const strandMeta = getStrandMeta(pack.strand);

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <h3 className="text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <span>สั่งซื้อลิขสิทธิ์ข้อสอบกลางสำหรับโรงเรียน</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
          <div className="text-[11px] font-bold text-[var(--color-primary-text)]">
            {strandMeta.code} · {strandMeta.nameTh} · {pack.gradeLevel}
          </div>
          <div className="text-sm font-extrabold text-[var(--color-text-title)]">{pack.titleTh}</div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
            <span className="text-[var(--color-text-body)]">จำนวน {pack.questions.length} ข้อ (ใช้ได้ทั้งโรงเรียน)</span>
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

        {method === 'promptpay' ? (
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col items-center gap-2 text-center">
            <QrCodeMatrix
              value={`EDUVERSE:EXAM:${pack.id}:${pack.priceThb}:${schoolName}`}
              size={148}
              label={`QR ชำระค่าชุดข้อสอบ ${pack.titleTh}`}
            />
            <div className="text-xs font-bold text-slate-900">
              สแกนพร้อมเพย์ ยอดชำระ ฿{pack.priceThb.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-600">
              ผู้รับ: กองทุนคลังข้อสอบกลาง EduVerse · {schoolName}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs space-y-1 text-[var(--color-text-body)]">
            <div className="font-bold text-[var(--color-text-title)]">ออกใบแจ้งหนี้ในนาม: {schoolName}</div>
            <p>
              ระบบจะเปิดสิทธิ์ข้อสอบเข้าคลังโรงเรียนทันที และบันทึกยอด ฿{pack.priceThb.toLocaleString()} เพื่อดำเนินการเบิกจ่ายตามระเบียบพัสดุ/วิชาการภายใน 30 วัน
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
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
            disabled={isProcessing}
            onClick={() => void onConfirmPurchase(pack, method)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'กำลังบันทึก...'
                : method === 'promptpay'
                ? 'ยืนยันชำระเงินและรับข้อสอบ'
                : 'ออกใบแจ้งหนี้และรับข้อสอบ'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface CentralExamNotificationPopupProps {
  isOpen: boolean;
  schoolName: string;
  unclaimedPacks: CentralExamPack[];
  onClaimFreePack: (pack: CentralExamPack) => Promise<void>;
  onClaimAllFreePacks: () => Promise<void>;
  onPurchasePack: (pack: CentralExamPack, method: 'promptpay' | 'invoice') => Promise<void>;
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

  if (!isOpen || unclaimedPacks.length === 0) return null;

  const freePacks = unclaimedPacks.filter((p) => p.pricingType === 'free');
  const paidPacks = unclaimedPacks.filter((p) => p.pricingType === 'paid');
  const totalNewQuestions = unclaimedPacks.reduce((sum, p) => sum + p.questions.length, 0);

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
      <div className="fixed inset-0 z-[65] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[var(--color-border)] flex items-start justify-between gap-3 bg-[var(--color-card-subtle)]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)]">
                <BellRing className="w-4 h-4" />
                <span>แจ้งเตือนข้อสอบกลางชุดใหม่จากส่วนกลาง</span>
              </div>
              <h2 className="text-lg font-extrabold text-[var(--color-text-title)]">
                มี {unclaimedPacks.length} ชุดข้อสอบใหม่ (รวม {totalNewQuestions} ข้อ) พร้อมใช้ใน {schoolName}
              </h2>
              <p className="text-xs text-[var(--color-text-body)]">
                ครอบคลุมคลังข้อสอบ 8 กลุ่มสาระการเรียนรู้ กดรับชุดฟรีได้ทันที หรือสั่งซื้อชุดเสริมเพื่อปลดล็อกให้ครูและนักเรียนใช้งาน
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-[var(--color-card)] text-[var(--color-text-muted)] cursor-pointer"
              aria-label="ปิดหน้าต่างแจ้งเตือนข้อสอบใหม่"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary Strip + Claim All Free */}
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-[var(--color-text-body)]">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                ชุดฟรี: {freePacks.length} ชุด
              </span>
              <span>·</span>
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

          {/* Scrollable List of New Packs */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {unclaimedPacks.map((pack) => {
              const strandMeta = getStrandMeta(pack.strand);
              const isFree = pack.pricingType === 'free';
              const isPreviewOpen = previewPackId === pack.id;
              const sampleQ = pack.questions[0];

              return (
                <div
                  key={pack.id}
                  className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)]">
                          {strandMeta.code} · {strandMeta.nameTh}
                        </span>
                        <span className="text-[var(--color-text-muted)]">· {pack.gradeLevel}</span>
                        <span className="text-[var(--color-text-muted)] tabular-nums">· {pack.questions.length} ข้อ</span>
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
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-2">
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
          </div>
        </div>
      </div>

      {checkoutPack && (
        <CentralExamPurchaseModal
          pack={checkoutPack}
          schoolName={schoolName}
          isProcessing={processingPackId === checkoutPack.id}
          onClose={() => setCheckoutPack(null)}
          onConfirmPurchase={async (pack, method) => {
            setProcessingPackId(pack.id);
            try {
              await onPurchasePack(pack, method);
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
  onClaimFreePack: (pack: CentralExamPack) => Promise<void>;
  onPurchasePack: (pack: CentralExamPack, method: 'promptpay' | 'invoice') => Promise<void>;
  onOpenQuestionBankInEduBattle?: () => void;
  onOpenCoordinationDesk?: () => void;
}

export const CentralExamHubView: React.FC<CentralExamHubViewProps> = ({
  schoolName,
  currentRole,
  packs,
  entitlements,
  schoolQuestions,
  onClaimFreePack,
  onPurchasePack,
  onOpenQuestionBankInEduBattle,
  onOpenCoordinationDesk,
}) => {
  const [selectedStrand, setSelectedStrand] = useState<LearningStrandId | 'all'>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'unclaimed' | 'claimed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPack, setPreviewPack] = useState<CentralExamPack | null>(null);
  const [checkoutPack, setCheckoutPack] = useState<CentralExamPack | null>(null);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      const totalPackQuestions = matchingPacks.reduce((sum, p) => sum + p.questions.length, 0);
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
      if (pricingFilter !== 'all' && p.pricingType !== pricingFilter) return false;
      if (ownershipFilter === 'claimed' && !isClaimed) return false;
      if (ownershipFilter === 'unclaimed' && isClaimed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.titleTh.toLowerCase().includes(q) ||
          p.descriptionTh.toLowerCase().includes(q) ||
          p.gradeLevel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [publishedPacks, entitlementByPackId, selectedStrand, pricingFilter, ownershipFilter, searchQuery]);

  const handleClaimFree = async (pack: CentralExamPack) => {
    setProcessingPackId(pack.id);
    try {
      await onClaimFreePack(pack);
      setToastMessage(`รับชุดข้อสอบ "${pack.titleTh}" (+${pack.questions.length} ข้อ) เข้าคลังโรงเรียนแล้ว`);
    } finally {
      setProcessingPackId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)]">
            <Sparkles className="w-4 h-4" />
            <span>คลังข้อสอบกลาง 8 กลุ่มสาระการเรียนรู้ · {schoolName}</span>
          </div>
          <h2 className="text-xl font-extrabold text-[var(--color-text-title)]">
            ศูนย์รับและสั่งซื้อชุดข้อสอบกลางเข้าโรงเรียน
          </h2>
          <p className="text-xs text-[var(--color-text-body)]">
            ชุดข้อสอบที่กดรับฟรีหรือสั่งซื้อแล้ว จะถูกเพิ่มเข้าคลังข้อสอบของโรงเรียนสำหรับใช้สอน แข่ง EduBattle และออกสอบทันที (ปัจจุบันในคลังโรงเรียนมี {schoolQuestions.length} ข้อ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenQuestionBankInEduBattle && (
            <button
              type="button"
              onClick={onOpenQuestionBankInEduBattle}
              className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>ไปที่คลังข้อสอบ & เกม EduBattle</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 8-Strand Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {strandStats.map((s) => {
          const isSelected = selectedStrand === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStrand(isSelected ? 'all' : s.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                  : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono">
                  {s.code}
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">
                  {s.claimedPackCount}/{s.packCount}
                </span>
              </div>
              <div className="text-xs font-bold text-[var(--color-text-title)] mt-1.5 line-clamp-1">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            value={pricingFilter}
            onChange={(e) => setPricingFilter(e.target.value as 'all' | 'free' | 'paid')}
            className="px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
          >
            <option value="all">ทุกประเภทราคา</option>
            <option value="free">ชุดข้อสอบฟรี (Free)</option>
            <option value="paid">ชุดข้อสอบแบบซื้อ (Paid)</option>
          </select>

          <select
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
        </div>
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPacks.map((pack) => {
          const strandMeta = getStrandMeta(pack.strand);
          const entitlement = entitlementByPackId.get(pack.id);
          const isFree = pack.pricingType === 'free';

          return (
            <div
              key={pack.id}
              className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)]">
                    {strandMeta.code} · {strandMeta.nameTh}
                  </span>
                  {entitlement ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>รับเข้าโรงเรียนแล้ว</span>
                    </span>
                  ) : isFree ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">
                      ฟรี (Free)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold tabular-nums">
                      ฿{pack.priceThb.toLocaleString()} / โรงเรียน
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-extrabold text-[var(--color-text-title)] leading-snug">
                  {pack.titleTh}
                </h3>
                <p className="text-xs text-[var(--color-text-body)] line-clamp-2">{pack.descriptionTh}</p>

                <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-2 pt-1">
                  <span>ระดับชั้น: {pack.gradeLevel}</span>
                  <span>·</span>
                  <span className="tabular-nums font-semibold text-[var(--color-text-title)]">
                    {pack.questions.length} ข้อ
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPack(pack)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ดูตัวอย่าง</span>
                </button>

                {entitlement ? (
                  <button
                    type="button"
                    onClick={onOpenQuestionBankInEduBattle}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>เปิดใช้ในคลังข้อสอบ</span>
                  </button>
                ) : canSchoolAdminAcquire ? (
                  isFree ? (
                    <button
                      type="button"
                      disabled={processingPackId === pack.id}
                      onClick={() => void handleClaimFree(pack)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>{processingPackId === pack.id ? 'กำลังรับ...' : 'กดรับข้อสอบฟรี'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCheckoutPack(pack)}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer tabular-nums"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>สั่งซื้อ ฿{pack.priceThb.toLocaleString()}</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={onOpenCoordinationDesk}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>ให้ Admin โรงเรียนกดรับ/ซื้อ</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sample Questions Preview Modal */}
      {previewPack && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[var(--color-primary-text)]">
                  ตัวอย่างข้อสอบ · {getStrandMeta(previewPack.strand).nameTh}
                </div>
                <h3 className="text-sm font-extrabold text-[var(--color-text-title)]">{previewPack.titleTh}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPack(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
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
              {!entitlementByPackId.has(previewPack.id) && previewPack.questions.length > 3 && (
                <div className="p-3 rounded-xl border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
                  แสดงตัวอย่าง 3 ข้อแรก · กดรับ/สั่งซื้อเพื่อปลดล็อกครบทั้ง {previewPack.questions.length} ข้อ พร้อมเฉลยละเอียด
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {checkoutPack && (
        <CentralExamPurchaseModal
          pack={checkoutPack}
          schoolName={schoolName}
          isProcessing={processingPackId === checkoutPack.id}
          onClose={() => setCheckoutPack(null)}
          onConfirmPurchase={async (pack, method) => {
            setProcessingPackId(pack.id);
            try {
              await onPurchasePack(pack, method);
              setCheckoutPack(null);
              setToastMessage(
                `สั่งซื้อและปลดล็อก "${pack.titleTh}" (+${pack.questions.length} ข้อ) เข้าคลังโรงเรียนแล้ว`
              );
            } finally {
              setProcessingPackId(null);
            }
          }}
        />
      )}
    </div>
  );
};
