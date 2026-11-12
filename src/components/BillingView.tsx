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
  ArrowRight
} from 'lucide-react';
import { PagedList } from './PagedList';

interface BillingViewProps {
  students: Student[];
  invoices: TuitionInvoice[];
  systemConfig: SystemConfig;
  onPayInvoice: (invoiceId: string, method: TuitionInvoice['paymentMethod']) => void;
  onSendPrivateAppReminder: (invoice: TuitionInvoice) => Promise<{ stored: number; delivered: number }>;
  currentRole?: string;
  onOpenExamPaymentSettings?: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  students,
  invoices,
  systemConfig,
  onPayInvoice,
  onSendPrivateAppReminder,
  currentRole,
  onOpenExamPaymentSettings,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeInvoice, setActiveInvoice] = useState<TuitionInvoice | null>(invoices[0] || null);
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus === 'all') return true;
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

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[var(--color-primary-text)]" />
            Tuition Fees &amp; Payment Invoicing
          </h1>
          <p className="text-xs text-[var(--color-text-body)] mt-0.5">
            Manage school fee schedules, Thai PromptPay QR reconciliation, and private app reminders to linked guardians.
          </p>
        </div>

        {reminderToast && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-100 text-xs flex items-center gap-2 animate-fadeIn shrink-0">
            <MessageSquare className="w-4 h-4 text-emerald-300 fill-current" />
            <span>{reminderToast}</span>
          </div>
        )}
        {reminderError && (
          <div className="px-3 py-1.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{reminderError}</span>
          </div>
        )}
      </div>

      {/* Super Admin Quick Link Banner: For Exam Marketplace Payment & QR Upload */}
      {currentRole === 'super_admin' && onOpenExamPaymentSettings && (
        <div className="shrink-0 p-4 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
              <CreditCard className="w-5 h-5 text-amber-300" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                  สำหรับ Super Admin: ตั้งค่า QR PromptPay / อัปโหลด QR รับเงินขายข้อสอบกลาง
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold uppercase tracking-wide">
                  Super Admin Only
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100 leading-relaxed">
                หน้านี้เป็นระบบค่าเทอมนักเรียนประจำโรงเรียน หากต้องการอัปโหลดรูปภาพ QR หรือแก้ไขบัญชีรับเงินสำหรับขายข้อสอบกลาง 8 สาระฯ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenExamPaymentSettings}
            className="px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-blue-50 text-xs font-bold shrink-0 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4 text-indigo-700" />
            <span>เปิดหน้าตั้งค่า QR รับเงินขายข้อสอบ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'paid', 'pending', 'overdue'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
              }`}
            >
              {st}
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

              {/* Payment or Paid Status */}
              {activeInvoice.status === 'paid' ? (
                <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment Received &amp; Verified</span>
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
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setShowPromptPayModal(true)}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay with Thai PromptPay QR / Bank Transfer</span>
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
    </div>
  );
};
