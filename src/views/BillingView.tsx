import React, { useState } from 'react';
import { Student, TuitionInvoice, SystemConfig } from '../types';
import { 
  Receipt, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  Send, 
  MessageSquare,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Sparkles,
  ArrowRight,
  Printer,
  FileCheck2,
  XCircle,
  Plus,
  Sliders,
  Trash2
} from 'lucide-react';
import { PagedList } from '../components/PagedList';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { getInvoiceDuplicateReasons } from '../lib/duplicateRecords';
import { getLocalDateString } from '../lib/date';

interface BillingViewProps {
  schoolId?: string;
  students: Student[];
  invoices: TuitionInvoice[];
  systemConfig: SystemConfig;
  onPayInvoice: (invoiceId: string, method: TuitionInvoice['paymentMethod']) => void;
  onAddInvoice?: (invoice: TuitionInvoice) => void;
  onSendPrivateAppReminder: (invoice: TuitionInvoice) => Promise<{ stored: number; delivered: number }>;
  onApproveSlip?: (invoiceId: string) => void;
  onRejectSlip?: (invoiceId: string, reason: string) => void;
  currentRole?: string;
  onOpenExamPaymentSettings?: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  schoolId = 'default-school',
  students,
  invoices,
  systemConfig,
  onPayInvoice,
  onAddInvoice,
  onSendPrivateAppReminder,
  onApproveSlip,
  onRejectSlip,
  currentRole,
  onOpenExamPaymentSettings,
}) => {
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const feePresets = presets.billingFeePresets;

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeInvoice, setActiveInvoice] = useState<TuitionInvoice | null>(invoices[0] || null);
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [showPrintDocModal, setShowPrintDocModal] = useState(false);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showFeePresetModal, setShowFeePresetModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);

  // New invoice form state
  const [newInvStudentId, setNewInvStudentId] = useState(students[0]?.id || '');
  const [newInvTitle, setNewInvTitle] = useState(feePresets[0]?.title || 'ค่าบำรุงการศึกษาประจำภาคเรียน');
  const [newInvAmount, setNewInvAmount] = useState(feePresets[0]?.amount || 3500);
  const [newInvSemester, setNewInvSemester] = useState(`${systemConfig.currentSemester}/${systemConfig.academicYear}`);
  const [newInvDueDate, setNewInvDueDate] = useState(getLocalDateString());
  const [allowDupInvoiceConfirm, setAllowDupInvoiceConfirm] = useState(false);

  // New fee preset form state
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState(1000);
  const [newFeeCategory, setNewFeeCategory] = useState('tuition');

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'slip_pending') return inv.slipStatus === 'pending_review';
    return inv.status === filterStatus;
  });

  const handleTriggerReminder = async (inv: TuitionInvoice) => {
    setReminderBusy(true);
    setReminderError(null);
    const stu = students.find((s) => s.id === inv.studentId);
    try {
      const result = await onSendPrivateAppReminder(inv);
      if (result.stored === 0) {
        throw new Error('ไม่มีบัญชีผู้ปกครองที่เชื่อมกับนักเรียนนี้ หรือปิดหมวดค่าใช้จ่ายไว้');
      }
      setReminderToast(result.delivered > 0
        ? `ส่งแจ้งเตือนผ่านแอปถึงผู้ปกครองของ ${stu?.firstNameTh || stu?.firstNameEn} (${inv.invoiceNumber})`
        : `บันทึกแจ้งเตือนในแอปของผู้ปกครองแล้ว (${inv.invoiceNumber})`);
      setTimeout(() => setReminderToast(null), 4000);
    } catch (error) {
      setReminderError(error instanceof Error ? error.message : 'ส่งแจ้งเตือนผ่านแอปไม่สำเร็จ');
    } finally {
      setReminderBusy(false);
    }
  };

  const activeStudent = activeInvoice ? students.find((s) => s.id === activeInvoice.studentId) : null;

  const duplicateInvoicesCount = (() => {
    const seenNum = new Set<string>();
    const seenStudentTermTitle = new Set<string>();
    let dups = 0;
    invoices.forEach((inv) => {
      const k1 = inv.invoiceNumber.trim().toLowerCase();
      const k2 = `${inv.studentId}|${inv.semester.trim().toLowerCase()}|${(inv.items[0]?.title || '').trim().toLowerCase()}`;
      if ((k1 && seenNum.has(k1)) || seenStudentTermTitle.has(k2)) dups += 1;
      if (k1) seenNum.add(k1);
      seenStudentTermTitle.add(k2);
    });
    return dups;
  })();

  const newInvoiceDupReasons = showNewInvoiceModal
    ? getInvoiceDuplicateReasons(
        {
          studentId: newInvStudentId,
          invoiceNumber: `INV-${new Date().getFullYear().toString().slice(-2)}${(invoices.length + 1).toString().padStart(4, '0')}`,
          semester: newInvSemester,
          title: newInvTitle,
        },
        invoices
      )
    : [];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      <div className="shrink-0 p-3 app-page-header flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Receipt className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            Tuition Fees &amp; Payment Invoicing
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {reminderToast && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-600 text-emerald-100 text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300 fill-current" />
              <span>{reminderToast}</span>
            </div>
          )}
          {reminderError && (
            <div className="px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{reminderError}</span>
            </div>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowFeePresetModal(true)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              <span>ตั้งค่าหมวดค่าธรรมเนียม</span>
            </button>
          )}
          {isAdmin && onAddInvoice && (
            <button
              type="button"
              onClick={() => {
                setAllowDupInvoiceConfirm(false);
                setShowNewInvoiceModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ออกใบแจ้งหนี้ใหม่</span>
            </button>
          )}
          {currentRole === 'super_admin' && onOpenExamPaymentSettings && (
            <button
              type="button"
              onClick={onOpenExamPaymentSettings}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <CreditCard className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              <span>ตั้งค่า QR ขายข้อสอบ</span>
            </button>
          )}
        </div>
      </div>

      {duplicateInvoicesCount > 0 && (
        <div role="alert" className="shrink-0 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs text-amber-950 dark:text-amber-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
          <span>พบใบแจ้งหนี้ซ้ำซ้อน (เลขที่ใบแจ้งหนี้หรือนักเรียน/รายการ/เทอมเดียวกัน) จำนวน {duplicateInvoicesCount} รายการ</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'slip_pending', 'paid', 'pending', 'overdue'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
              }`}
            >
              {st === 'slip_pending'
                ? `รอตรวจสลิป (${invoices.filter((i) => i.slipStatus === 'pending_review').length})`
                : st}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--color-text-body)]">
          Showing <strong className="text-[var(--color-text-title)]">{filteredInvoices.length}</strong> invoices
        </span>
      </div>

      {/* Invoices Split View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Invoice list */}
        <div className="lg:col-span-7 h-full min-h-0 overflow-y-auto pr-1">
          <PagedList items={filteredInvoices} pageSize={3} renderItem={(inv) => {
            const student = students.find((s) => s.id === inv.studentId);
            const isSelected = activeInvoice?.id === inv.id;
            return (
              <div
                key={inv.id}
                onClick={() => setActiveInvoice(inv)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-xs'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--color-primary-text)] bg-[var(--color-card-subtle)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                            : inv.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-[var(--color-text-title)] text-sm mt-2">
                      {student?.firstNameEn} {student?.lastNameEn}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] font-thai">
                      {student?.firstNameTh} ({student?.studentIdNumber}) • {inv.semester}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-[var(--color-text-title)] font-mono block">
                      ฿{inv.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      Due: {inv.dueDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-border)] text-xs gap-2 flex-wrap">
                  <span className="text-[var(--color-text-body)]">
                    Guardian: {student?.guardianName} ({student?.guardianPhone})
                  </span>

                  <div className="flex items-center gap-2">
                    {inv.status !== 'paid' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTriggerReminder(inv);
                        }}
                        disabled={reminderBusy}
                        className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 fill-current" />
                        App Reminder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }} />
        </div>

        {/* Right: Invoice Receipt & PromptPay Details */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-y-auto pr-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4 shadow-xs">
          {activeInvoice && activeStudent ? (
            <>
              <div className="border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[var(--color-primary-text)]">
                    {activeInvoice.invoiceNumber}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      activeInvoice.status === 'paid'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                        : activeInvoice.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                    }`}
                  >
                    {activeInvoice.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--color-text-title)] mt-2">
                  Tuition Fee Statement
                </h3>
                <p className="text-xs text-[var(--color-text-body)]">
                  Student: {activeStudent.firstNameEn} {activeStudent.lastNameEn} ({activeStudent.studentIdNumber})
                </p>
              </div>

              {/* Fee Items */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Breakdown of School Services
                </p>
                <div className="space-y-1.5 rounded-lg bg-[var(--color-card-subtle)] p-3 border border-[var(--color-border)] text-xs">
                  <PagedList items={activeInvoice.items} pageSize={4} renderItem={(item) => (
                    <div key={item.id} className="flex justify-between py-1 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-[var(--color-text-body)]">{item.title}</span>
                      <span className="font-mono font-medium text-[var(--color-text-title)]">
                        ฿{item.amount.toLocaleString()}
                      </span>
                    </div>
                  )} />
                  <div className="flex justify-between pt-2 border-t border-[var(--color-border)] font-bold text-sm">
                    <span className="text-[var(--color-text-title)]">Total Amount Due</span>
                    <span className="text-emerald-800 dark:text-emerald-300 font-mono">
                      ฿{activeInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment / Slip Verification / Paid Status */}
              {activeInvoice.slipImageUrl && (
                <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>หลักฐานการโอนจากผู้ปกครอง</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeInvoice.slipStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        : activeInvoice.slipStatus === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    }`}>
                      {activeInvoice.slipStatus === 'approved' ? 'อนุมัติแล้ว' : activeInvoice.slipStatus === 'rejected' ? 'ปฏิเสธแล้ว' : 'รอการตรวจสอบ'}
                    </span>
                  </div>
                  <img
                    src={activeInvoice.slipImageUrl}
                    alt="Transfer slip"
                    className="w-full max-h-48 object-contain rounded-lg border border-[var(--color-border)] bg-white"
                  />
                  {activeInvoice.slipReferenceNote && (
                    <p className="text-[11px] text-[var(--color-text-muted)]">หมายเหตุผู้ปกครอง: {activeInvoice.slipReferenceNote}</p>
                  )}
                  {activeInvoice.slipStatus === 'pending_review' && activeInvoice.status !== 'paid' && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={rejectReasonInput}
                        onChange={(e) => setRejectReasonInput(e.target.value)}
                        placeholder="เหตุผลหากปฏิเสธสลิป (เช่น ยอดไม่ตรง/รูปไม่ชัด)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onApproveSlip) onApproveSlip(activeInvoice.id);
                            else onPayInvoice(activeInvoice.id, 'promptpay');
                            setReminderToast(`อนุมัติสลิปและออกใบเสร็จสำหรับ ${activeInvoice.invoiceNumber} แล้ว`);
                          }}
                          className="py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                        >
                          อนุมัติ &amp; ออกใบเสร็จ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRejectSlip?.(activeInvoice.id, rejectReasonInput.trim() || 'ภาพหลักฐานไม่ชัดเจน กรุณาอัปโหลดใหม่');
                            setRejectReasonInput('');
                            setReminderToast(`ส่งคำขอให้ผู้ปกครองแนบสลิป ${activeInvoice.invoiceNumber} ใหม่แล้ว`);
                          }}
                          className="py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>ปฏิเสธสลิป</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeInvoice.status === 'paid' ? (
                <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Payment Received &amp; Verified</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPrintDocModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์ใบเสร็จ PDF</span>
                    </button>
                  </div>
                  <p className="text-[11px]">
                    Method: <span className="uppercase font-mono font-semibold">{activeInvoice.paymentMethod}</span>
                  </p>
                  <p className="text-[11px]">
                    Paid at: <span className="font-mono">{activeInvoice.paidAt}</span>
                  </p>
                  <p className="text-[11px]">
                    Receipt No: <span className="font-mono font-bold">{activeInvoice.receiptNumber}</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => setShowPromptPayModal(true)}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay with Thai PromptPay QR / Bank Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPrintDocModal(true)}
                    className="w-full py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ใบแจ้งหนี้ PDF พร้อม QR พร้อมเพย์</span>
                  </button>

                  <button
                    onClick={() => void handleTriggerReminder(activeInvoice)}
                    disabled={reminderBusy}
                    className="w-full py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>Send private app alert to guardian</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Select an invoice to inspect</p>
          )}
        </div>
      </div>

      {/* PromptPay Modal */}
      {showPromptPayModal && activeInvoice && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                Thai PromptPay QR Payment
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {systemConfig.schoolNameEn}
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Biller ID: 0105558992019 • Ref: {activeInvoice.invoiceNumber}
              </p>
            </div>

            {/* PromptPay QR Image simulator */}
            <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
              <div className="w-48 h-48 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center relative p-2 bg-white">
                <div className="h-6 w-full bg-[#1A3764] rounded text-white text-[9px] font-bold flex items-center justify-center mb-1">
                  PromptPay พร้อมเพย์
                </div>
                <QrCode className="w-28 h-28 text-slate-950" />
                <span className="text-[10px] font-bold text-slate-900 font-mono mt-1">
                  ฿{activeInvoice.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-200">
              Scan with any Thai mobile banking app (SCB Easy, K PLUS, Krungthai NEXT, Bangkok Bank)
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPromptPayModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onPayInvoice(activeInvoice.id, 'promptpay');
                  setShowPromptPayModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Invoice / Receipt A4 Modal */}
      {showPrintDocModal && activeInvoice && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden print:shadow-none print:max-w-none print:w-full">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <span className="text-xs font-bold">
                {activeInvoice.status === 'paid' ? 'ใบเสร็จรับเงินค่าธรรมเนียมการศึกษา (PDF)' : 'ใบแจ้งหนี้ค่าธรรมเนียมการศึกษา (PDF)'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintDocModal(false)}
                  className="px-2 py-1 rounded-lg hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{systemConfig.schoolNameTh}</h2>
                  <p className="text-[11px] text-slate-600">{systemConfig.schoolNameEn}</p>
                  <p className="text-[11px] font-bold text-slate-800 mt-2">
                    {activeInvoice.status === 'paid' ? 'ใบเสร็จรับเงิน (Official Receipt)' : 'ใบแจ้งชำระค่าธรรมเนียมการศึกษา (Tuition Invoice)'}
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] space-y-0.5">
                  <div>เลขที่ใบแจ้งหนี้: <strong>{activeInvoice.invoiceNumber}</strong></div>
                  {activeInvoice.receiptNumber && (
                    <div>เลขที่ใบเสร็จ: <strong>{activeInvoice.receiptNumber}</strong></div>
                  )}
                  <div>วันออกเอกสาร: {activeInvoice.issueDate}</div>
                  <div>กำหนดชำระ: {activeInvoice.dueDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><strong>นักเรียน:</strong> {activeStudent.firstNameTh} {activeStudent.lastNameTh}</div>
                <div><strong>รหัสนักเรียน:</strong> {activeStudent.studentIdNumber}</div>
                <div><strong>ระดับชั้น:</strong> {activeStudent.gradeLevel} ({activeStudent.room})</div>
                <div><strong>ผู้ปกครอง:</strong> {activeStudent.guardianName}</div>
              </div>

              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold">
                    <th className="border border-slate-300 p-2 text-left">รายการค่าธรรมเนียม</th>
                    <th className="border border-slate-300 p-2 text-right w-28">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-slate-300 p-2">{item.title}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 p-2 text-right">รวมทั้งสิ้น</td>
                    <td className="border border-slate-300 p-2 text-right font-mono text-sm">฿{activeInvoice.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 pt-3 items-end">
                <div className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <QrCode className="w-16 h-16 text-slate-900 shrink-0" />
                  <div className="text-[10px] text-slate-700 space-y-0.5">
                    <p className="font-bold text-slate-900">QR PromptPay พร้อมเพย์</p>
                    <p>Biller: 0105558992019</p>
                    <p>Ref: {activeInvoice.invoiceNumber}</p>
                    <p>สถานะ: {activeInvoice.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}</p>
                  </div>
                </div>
                <div className="text-center space-y-6 text-[11px]">
                  <p className="text-emerald-700 font-mono font-bold">
                    [ลายเซ็นดิจิทัลยืนยัน • {activeInvoice.paidAt || new Date().toISOString().split('T')[0]}]
                  </p>
                  <div className="border-t border-dashed border-slate-400 pt-1">
                    <p className="font-bold">เจ้าหน้าที่การเงิน / ผู้รับเงิน</p>
                    <p className="text-slate-500">{systemConfig.schoolNameTh}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewInvoiceModal && onAddInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>ออกใบแจ้งหนี้ใหม่ (Create Invoice)</span>
              </h3>
              <button type="button" onClick={() => setShowNewInvoiceModal(false)} className="px-2 py-0.5 rounded-lg font-bold cursor-pointer">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newInvoiceDupReasons.length > 0 && !allowDupInvoiceConfirm) return;
                const stu = students.find((s) => s.id === newInvStudentId);
                if (!stu || !newInvTitle.trim()) return;
                const invNumber = `INV-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 8999)}`;
                const created: TuitionInvoice = {
                  id: `inv-${Date.now()}`,
                  schoolId,
                  studentId: stu.id,
                  invoiceNumber: invNumber,
                  semester: newInvSemester.trim() || `${systemConfig.currentSemester}/${systemConfig.academicYear}`,
                  academicYear: systemConfig.academicYear,
                  issueDate: getLocalDateString(),
                  dueDate: newInvDueDate,
                  items: [{ id: `item-${Date.now()}`, title: newInvTitle.trim(), amount: Math.max(0, Number(newInvAmount) || 0) }],
                  totalAmount: Math.max(0, Number(newInvAmount) || 0),
                  status: 'pending',
                };
                onAddInvoice(created);
                setActiveInvoice(created);
                setShowNewInvoiceModal(false);
                setAllowDupInvoiceConfirm(false);
                setReminderToast(`ออกใบแจ้งหนี้ ${invNumber} ให้ ${stu.firstNameTh} แล้ว`);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold mb-1">นักเรียน</label>
                <select
                  value={newInvStudentId}
                  onChange={(e) => setNewInvStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.firstNameTh} {s.lastNameTh} ({s.room})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">เลือกจากรายการค่าธรรมเนียมมาตรฐาน (หรือพิมพ์เอง)</label>
                <select
                  value=""
                  onChange={(e) => {
                    const found = feePresets.find((f) => f.title === e.target.value);
                    if (found) {
                      setNewInvTitle(found.title);
                      setNewInvAmount(found.amount);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] mb-1.5"
                >
                  <option value="">-- เลือกเทมเพลตค่าธรรมเนียม --</option>
                  {feePresets.map((f) => (
                    <option key={f.title} value={f.title}>{f.title} (฿{f.amount.toLocaleString()})</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={newInvTitle}
                  onChange={(e) => setNewInvTitle(e.target.value)}
                  placeholder="ชื่อรายการค่าธรรมเนียม"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newInvAmount}
                    onChange={(e) => setNewInvAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">ภาคเรียน/ปี</label>
                  <input
                    type="text"
                    required
                    value={newInvSemester}
                    onChange={(e) => setNewInvSemester(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">กำหนดชำระ</label>
                  <input
                    type="date"
                    required
                    value={newInvDueDate}
                    onChange={(e) => setNewInvDueDate(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                  />
                </div>
              </div>

              {newInvoiceDupReasons.length > 0 && (
                <div className="p-2.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span>{newInvoiceDupReasons.join(', ')}</span>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDupInvoiceConfirm}
                      onChange={(e) => setAllowDupInvoiceConfirm(e.target.checked)}
                      className="rounded accent-amber-600"
                    />
                    <span>ยืนยันต้องการออกใบแจ้งหนี้ซ้ำอีกครั้ง</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button type="button" onClick={() => setShowNewInvoiceModal(false)} className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] cursor-pointer">ยกเลิก</button>
                <button
                  type="submit"
                  disabled={newInvoiceDupReasons.length > 0 && !allowDupInvoiceConfirm}
                  className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] disabled:opacity-50 text-white font-semibold cursor-pointer"
                >ออกใบแจ้งหนี้</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Fee Presets Manager Modal */}
      {showFeePresetModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5 shrink-0">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>ตั้งค่าหมวดและอัตราค่าธรรมเนียมโรงเรียน (Admin)</span>
              </h3>
              <button type="button" onClick={() => setShowFeePresetModal(false)} className="px-2 py-0.5 rounded-lg font-bold cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
              <input
                type="text"
                value={newFeeTitle}
                onChange={(e) => setNewFeeTitle(e.target.value)}
                placeholder="ชื่อรายการค่าธรรมเนียม..."
                className="sm:col-span-6 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
              />
              <input
                type="number"
                min={0}
                value={newFeeAmount}
                onChange={(e) => setNewFeeAmount(Math.max(0, Number(e.target.value) || 0))}
                className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const title = newFeeTitle.trim();
                  if (!title) return;
                  updatePresets({
                    billingFeePresets: [...feePresets.filter((f) => f.title !== title), { title, amount: newFeeAmount, category: newFeeCategory }],
                  });
                  setNewFeeTitle('');
                }}
                className="sm:col-span-3 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-bold cursor-pointer"
              >
                + เพิ่มรายการ
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
              {feePresets.map((f) => (
                <div key={f.title} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-text-title)] truncate">{f.title}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">฿{f.amount.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => updatePresets({ billingFeePresets: feePresets.filter((item) => item.title !== f.title) })}
                      className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
