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
  DollarSign
} from 'lucide-react';

interface BillingViewProps {
  students: Student[];
  invoices: TuitionInvoice[];
  systemConfig: SystemConfig;
  onPayInvoice: (invoiceId: string, method: TuitionInvoice['paymentMethod']) => void;
  onSendLineReminder: (invoice: TuitionInvoice) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  students,
  invoices,
  systemConfig,
  onPayInvoice,
  onSendLineReminder,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeInvoice, setActiveInvoice] = useState<TuitionInvoice | null>(invoices[0] || null);
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus === 'all') return true;
    return inv.status === filterStatus;
  });

  const handleTriggerReminder = (inv: TuitionInvoice) => {
    onSendLineReminder(inv);
    const stu = students.find((s) => s.id === inv.studentId);
    setReminderToast(`LINE Payment Reminder dispatched to guardian of ${stu?.firstNameEn} (${inv.invoiceNumber})`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  const activeStudent = activeInvoice ? students.find((s) => s.id === activeInvoice.studentId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            Tuition Fees &amp; Payment Invoicing
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage school fee schedules, Thai PromptPay QR reconciliation, and automated LINE OA guardian reminders.
          </p>
        </div>

        {reminderToast && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-600/50 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <MessageSquare className="w-4 h-4 text-[#06C755] fill-current" />
            <span>{reminderToast}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'paid', 'pending', 'overdue'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredInvoices.length}</strong> invoices
        </span>
      </div>

      {/* Invoices Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Invoice list */}
        <div className="lg:col-span-7 space-y-3">
          {filteredInvoices.map((inv) => {
            const student = students.find((s) => s.id === inv.studentId);
            const isSelected = activeInvoice?.id === inv.id;
            return (
              <div
                key={inv.id}
                onClick={() => setActiveInvoice(inv)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : inv.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm mt-2">
                      {student?.firstNameEn} {student?.lastNameEn}
                    </h3>
                    <p className="text-xs text-slate-400 font-thai">
                      {student?.firstNameTh} ({student?.studentIdNumber}) • {inv.semester}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-white font-mono block">
                      ฿{inv.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Due: {inv.dueDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-700/50 text-xs">
                  <span className="text-slate-400">
                    Guardian: {student?.guardianName} ({student?.guardianPhone})
                  </span>

                  <div className="flex items-center gap-2">
                    {inv.status !== 'paid' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerReminder(inv);
                        }}
                        className="px-2 py-1 rounded bg-[#06C755]/15 hover:bg-[#06C755]/25 text-[#06C755] border border-[#06C755]/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3 fill-current" />
                        LINE Reminder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Invoice Receipt & PromptPay Details */}
        <div className="lg:col-span-5 rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          {activeInvoice && activeStudent ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {activeInvoice.invoiceNumber}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      activeInvoice.status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : activeInvoice.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {activeInvoice.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-2">
                  Tuition Fee Statement
                </h3>
                <p className="text-xs text-slate-400">
                  Student: {activeStudent.firstNameEn} {activeStudent.lastNameEn} ({activeStudent.studentIdNumber})
                </p>
              </div>

              {/* Fee Items */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Breakdown of School Services
                </p>
                <div className="space-y-1.5 rounded-lg bg-slate-950 p-3 border border-slate-800/80 text-xs">
                  {activeInvoice.items.map((item) => (
                    <div key={item.id} className="flex justify-between py-1 border-b border-slate-800/50 last:border-0">
                      <span className="text-slate-300">{item.title}</span>
                      <span className="font-mono font-medium text-slate-200">
                        ฿{item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-sm">
                    <span className="text-white">Total Amount Due</span>
                    <span className="text-emerald-400 font-mono">
                      ฿{activeInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment or Paid Status */}
              {activeInvoice.status === 'paid' ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 space-y-1.5 text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment Received &amp; Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Method: <span className="uppercase font-mono font-semibold">{activeInvoice.paymentMethod}</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Paid at: <span className="font-mono">{activeInvoice.paidAt}</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Receipt No: <span className="font-mono font-bold text-emerald-400">{activeInvoice.receiptNumber}</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setShowPromptPayModal(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay with Thai PromptPay QR / Bank Transfer</span>
                  </button>

                  <button
                    onClick={() => handleTriggerReminder(activeInvoice)}
                    className="w-full py-2 rounded-xl bg-[#06C755]/15 hover:bg-[#06C755]/25 border border-[#06C755]/30 text-[#06C755] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>Send LINE OA Push Alert to Guardian</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">Select an invoice to inspect</p>
          )}
        </div>
      </div>

      {/* PromptPay Modal */}
      {showPromptPayModal && activeInvoice && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                Thai PromptPay QR Payment
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {systemConfig.schoolNameEn}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
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

            <p className="text-xs text-slate-300">
              Scan with any Thai mobile banking app (SCB Easy, K PLUS, Krungthai NEXT, Bangkok Bank)
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPromptPayModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onPayInvoice(activeInvoice.id, 'promptpay');
                  setShowPromptPayModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Simulate Payment OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
