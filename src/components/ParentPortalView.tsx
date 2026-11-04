import React, { useState } from 'react';
import { Student, AttendanceRecord, TuitionInvoice, GradeRecord, Course, AppLanguage, SystemConfig } from '../types';
import { 
  UserCheck, 
  Clock, 
  Award, 
  Receipt, 
  MessageSquare, 
  ExternalLink, 
  CheckCircle2, 
  QrCode, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  Phone,
  Download
} from 'lucide-react';

interface ParentPortalViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  grades: GradeRecord[];
  courses: Course[];
  systemConfig: SystemConfig;
  lang: AppLanguage;
  onPayInvoice: (invoiceId: string, method: TuitionInvoice['paymentMethod']) => void;
  onOpenReportCard: (student: Student) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  students,
  attendance,
  invoices,
  grades,
  courses,
  systemConfig,
  lang,
  onPayInvoice,
  onOpenReportCard,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [showPayModal, setShowPayModal] = useState(false);

  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentAttendance = attendance.filter((a) => a.studentId === student?.id);
  const studentInvoices = invoices.filter((i) => i.studentId === student?.id);
  const studentGrades = grades.filter((g) => g.studentId === student?.id);
  const todayRecord = studentAttendance.find((a) => a.date === '2026-11-04');

  const pendingInvoice = studentInvoices.find((i) => i.status !== 'paid');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Student Switcher & Guardian Profile Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={student?.avatarUrl}
            alt={student?.firstNameEn}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {lang === 'th'
                  ? `${student?.firstNameTh} ${student?.lastNameTh}`
                  : `${student?.firstNameEn} ${student?.lastNameEn}`}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {student?.studentIdNumber}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {student?.gradeLevel} • {student?.room}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'th' ? 'ผู้ปกครอง:' : 'Guardian:'} {student?.guardianName} ({student?.guardianRelation}) • {student?.guardianPhone}
            </p>
          </div>
        </div>

        {/* Student selector */}
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <label className="text-[11px] font-semibold text-slate-400">
            {lang === 'th' ? 'เลือกลูก/นักเรียนในการดูแล:' : 'Select Student:'}
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 font-medium"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstNameTh} ({s.studentIdNumber}) - {s.gradeLevel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Today's Gate Status Banner (LINE Connected) */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06C755]/15 border border-[#06C755]/30 flex items-center justify-center text-[#06C755] shrink-0">
            <MessageSquare className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {lang === 'th' ? 'สถานะการเดินทางถึงโรงเรียนวันนี้ (04 พ.ย. 2026)' : "Today's School Arrival Status"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                {todayRecord ? (lang === 'th' ? 'บันทึกแล้ว' : 'Recorded') : 'รอสแกนเข้า'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {todayRecord ? (
                <>
                  เข้าประตูเวลา <strong className="text-slate-200 font-mono">{todayRecord.time}</strong> • สถานะ:{' '}
                  <span className="text-emerald-400 font-semibold uppercase">{todayRecord.status}</span> ({todayRecord.remarks})
                </>
              ) : (
                'ยังไม่มีข้อมูลการสแกนผ่านประตูในเช้าวันนี้'
              )}
            </p>
          </div>
        </div>

        <a
          href={systemConfig.lineOaAddFriendUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-[#06C755]/20 hover:bg-[#06C755]/30 border border-[#06C755]/30 text-[#06C755] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 fill-current" />
          <span>{lang === 'th' ? 'เปิดแชท LINE OA โรงเรียน' : 'Open School LINE OA'}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Grid: Digital Student ID & Tuition / Academic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Digital Student Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-500/40 shadow-xl space-y-4 text-white relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                {systemConfig.schoolNameEn}
              </p>
              <h3 className="text-xs font-semibold text-slate-300 font-thai">
                {systemConfig.schoolNameTh}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              STUDENT PASS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={student?.avatarUrl}
              alt={student?.firstNameEn}
              className="w-20 h-20 rounded-xl object-cover border-2 border-white/20 shadow"
            />
            <div className="space-y-1">
              <h4 className="font-bold text-base">
                {student?.firstNameEn} {student?.lastNameEn}
              </h4>
              <p className="text-xs text-indigo-200 font-thai">
                {student?.firstNameTh} {student?.lastNameTh}
              </p>
              <p className="text-xs font-mono text-amber-300 font-bold">
                ID: {student?.studentIdNumber}
              </p>
              <p className="text-[11px] text-slate-300">
                {student?.gradeLevel} • {student?.room}
              </p>
            </div>
          </div>

          {/* Barcode & QR Bar */}
          <div className="p-3 bg-white rounded-xl text-slate-900 flex items-center justify-between shadow-inner">
            <div className="space-y-0.5">
              <div className="font-mono text-xs font-extrabold tracking-widest">
                |||||| | ||||| || |||||||
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                AUTH TOKEN: {student?.studentIdNumber}-2026-OK
              </span>
            </div>
            <QrCode className="w-8 h-8 text-slate-950" />
          </div>
        </div>

        {/* Tuition & Invoices Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                {lang === 'th' ? 'การชำระค่าธรรมเนียมการศึกษา' : 'Tuition & Billing'}
              </h3>
              <span className="text-xs text-slate-400">{systemConfig.currentSemester}</span>
            </div>

            {pendingInvoice ? (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/30 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>{pendingInvoice.invoiceNumber}</span>
                  <span className="font-mono text-base">฿{pendingInvoice.totalAmount.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {lang === 'th' ? 'ครบกำหนดชำระ:' : 'Due Date:'} {pendingInvoice.dueDate}
                </p>
                <button
                  onClick={() => setShowPayModal(true)}
                  className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ชำระเงินผ่าน PromptPay ทันที' : 'Pay via PromptPay QR'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold">{lang === 'th' ? 'ชำระค่าเทอมครบถ้วนแล้ว' : 'All Tuition Fees Paid'}</p>
                  <p className="text-[11px] text-slate-400">ขอบคุณที่ชำระค่าธรรมเนียมตรงตามกำหนดเวลา</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                {lang === 'th' ? 'เกรดเฉลี่ยสะสม (GPA)' : 'Cumulative GPA'}
              </span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {student?.gpa.toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => onOpenReportCard(student)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-4 h-4" />
              <span>{lang === 'th' ? 'ดูใบเกรด ปพ.1' : 'View Transcript'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PromptPay Modal */}
      {showPayModal && pendingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                Thai PromptPay พร้อมเพย์
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {systemConfig.schoolNameTh}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Biller: 0105558992019 • {pendingInvoice.invoiceNumber}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
              <div className="w-48 h-48 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center relative p-2 bg-white">
                <div className="h-6 w-full bg-[#1A3764] rounded text-white text-[9px] font-bold flex items-center justify-center mb-1">
                  PromptPay พร้อมเพย์
                </div>
                <QrCode className="w-28 h-28 text-slate-950" />
                <span className="text-[10px] font-bold text-slate-900 font-mono mt-1">
                  ฿{pendingInvoice.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              สแกนผ่านแอปธนาคารใดก็ได้ เพื่อชำระค่าธรรมเนียม
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onPayInvoice(pendingInvoice.id, 'promptpay');
                  setShowPayModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                ยืนยันการชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
