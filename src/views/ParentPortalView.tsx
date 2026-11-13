import React, { useState } from 'react';
import { 
  Student, 
  AttendanceRecord, 
  TuitionInvoice, 
  GradeRecord, 
  Course, 
  AppLanguage, 
  SystemConfig,
  LeaveRequest,
  LeaveType,
  PeriodAttendanceRecord,
  HomeworkSubmission,
  InfirmaryVisit,
  ConsentForm,
  ConsentResponse
} from '../types';
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
  Download,
  Camera,
  MapPin,
  Eye,
  X,
  FileText,
  Send,
  Upload,
  Check,
  ChevronRight,
  LogIn,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { PagedList } from '../components/PagedList';
import { getConsentForms, getConsentResponses, upsertConsentResponse } from '../lib/campusDataStore';

interface ParentPortalViewProps {
  schoolId?: string;
  students: Student[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  grades: GradeRecord[];
  courses: Course[];
  systemConfig: SystemConfig;
  leaveRequests?: LeaveRequest[];
  periodAttendance?: PeriodAttendanceRecord[];
  homeworkSubmissions?: HomeworkSubmission[];
  infirmaryVisits?: InfirmaryVisit[];
  lang: AppLanguage;
  onPayInvoice: (invoiceId: string, method: TuitionInvoice['paymentMethod']) => void;
  onSubmitInvoiceSlip?: (invoiceId: string, slipDataUrl: string, note: string) => void;
  onOpenReportCard: (student: Student) => void;
  onAddLeaveRequest?: (req: LeaveRequest) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  schoolId = 'default-school',
  students,
  attendance,
  invoices,
  grades,
  courses: _courses,
  systemConfig,
  leaveRequests = [],
  periodAttendance = [],
  homeworkSubmissions = [],
  infirmaryVisits = [],
  lang,
  onPayInvoice: _onPayInvoice,
  onSubmitInvoiceSlip,
  onOpenReportCard,
  onAddLeaveRequest
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [activePortalTab, setActivePortalTab] = useState<'overview' | 'selfie_album' | 'leave_submission' | 'consent_slips'>('overview');
  const [showPayModal, setShowPayModal] = useState(false);
  const [slipFileDataUrl, setSlipFileDataUrl] = useState<string>('');
  const [slipNote, setSlipNote] = useState<string>('');
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipToast, setSlipToast] = useState<string | null>(null);
  const [consentForms] = useState<ConsentForm[]>(() => getConsentForms(schoolId));
  const [consentResponses, setConsentResponses] = useState<ConsentResponse[]>(() => getConsentResponses(schoolId));

  // Date selection for child's selfie album
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 2 * 86400000));
  const [albumSelectedDate, setAlbumSelectedDate] = useState<string>(todayStr);
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<AttendanceRecord | null>(null);

  // Leave submission state
  const [leaveType, setLeaveType] = useState<LeaveType>('sick');
  const [leaveStartDate, setLeaveStartDate] = useState(getLocalDateString());
  const [leaveEndDate, setLeaveEndDate] = useState(getLocalDateString());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState('');
  const [leaveSuccessNotice, setLeaveSuccessNotice] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentAttendance = attendance.filter((a) => a.studentId === student?.id);
  const studentInvoices = invoices.filter((i) => i.studentId === student?.id);
  const studentGrades = grades.filter((g) => g.studentId === student?.id);
  const studentLeaveRequests = leaveRequests.filter((r) => r.userId === student?.id);
  const studentPeriodAttendance = periodAttendance.filter((p) => p.studentId === student?.id);
  const studentHomework = homeworkSubmissions.filter((h) => h.studentId === student?.id);
  const studentInfirmary = infirmaryVisits.filter((v) => v.studentId === student?.id);

  const todayRecord = studentAttendance.find((a) => a.date === todayStr);
  const pendingInvoice = studentInvoices.find((i) => i.status !== 'paid');

  // Build chronological Daily Pulse timeline events for selected child
  const dailyPulseEvents = React.useMemo(() => {
    const events: { id: string; timeLabel: string; title: string; detail: string; category: 'gate' | 'class' | 'homework' | 'health' | 'billing'; onClick?: () => void }[] = [];
    studentAttendance.slice(0, 4).forEach((rec) => {
      events.push({
        id: `att-${rec.id}`,
        timeLabel: `${rec.date} ${rec.time}`,
        title: rec.recordType === 'check_out' ? 'สแกนออกประตูโรงเรียน' : 'เข้าประตูโรงเรียน',
        detail: `${rec.status === 'present' ? 'ตรงเวลา' : rec.status === 'late' ? 'มาสาย' : rec.status} • ${rec.location?.geofenceZoneName || 'ประตูโรงเรียน'}`,
        category: 'gate',
        onClick: rec.photoUrl ? () => setSelectedZoomPhoto(rec) : undefined,
      });
    });
    studentPeriodAttendance.slice(0, 4).forEach((p) => {
      events.push({
        id: `per-${p.id}`,
        timeLabel: `${p.date} คาบ ${p.periodNumber}`,
        title: `เข้าเรียนวิชา ${p.courseCode}`,
        detail: `สถานะ: ${p.status} • บันทึกโดย ${p.verifiedByTeacherName}`,
        category: 'class',
      });
    });
    studentHomework.slice(0, 3).forEach((hw) => {
      events.push({
        id: `hw-${hw.id}`,
        timeLabel: hw.submittedAt || hw.dueDate,
        title: `การบ้าน: ${hw.assignmentTitle}`,
        detail: hw.status === 'graded' ? `ตรวจแล้ว (${hw.score ?? '-'}/${hw.maxScore})` : `สถานะ: ${hw.status}`,
        category: 'homework',
      });
    });
    studentInfirmary.slice(0, 3).forEach((v) => {
      events.push({
        id: `inf-${v.id}`,
        timeLabel: `${v.visitDate} ${v.visitTime}`,
        title: `เข้าห้องพยาบาล: ${v.symptoms}`,
        detail: `${v.treatment} (อุณหภูมิ ${v.temperature}°C)`,
        category: 'health',
      });
    });
    if (pendingInvoice) {
      events.push({
        id: `inv-${pendingInvoice.id}`,
        timeLabel: pendingInvoice.dueDate,
        title: `ค่าธรรมเนียมการศึกษา (${pendingInvoice.invoiceNumber})`,
        detail: pendingInvoice.slipStatus === 'pending_review'
          ? 'แนบสลิปแล้ว • รอเจ้าหน้าที่การเงินตรวจสอบ'
          : `ยอดรอชำระ ฿${pendingInvoice.totalAmount.toLocaleString()}`,
        category: 'billing',
      });
    }
    return events.sort((a, b) => b.timeLabel.localeCompare(a.timeLabel)).slice(0, 8);
  }, [studentAttendance, studentPeriodAttendance, studentHomework, studentInfirmary, pendingInvoice]);

  // Filter attendance for the selected date in child's selfie album
  const dateRecords = studentAttendance.filter((a) => a.date === albumSelectedDate);

  // Overall attendance statistics for child
  const totalAttended = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const lateCount = studentAttendance.filter(a => a.status === 'late').length;
  const attRate = totalAttended > 0 ? Math.round((presentCount / totalAttended) * 100) : 100;

  // Handle parent submitting leave for child
  const handleParentSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !leaveReason.trim()) {
      setLeaveError('กรุณาระบุเหตุผลการลาให้ครบถ้วน');
      return;
    }
    setLeaveError(null);

    const newLeave: LeaveRequest = {
      id: `leave-parent-${Date.now()}`,
      userId: student.id,
      userName: `${student.firstNameTh} ${student.lastNameTh}`,
      userRole: 'student',
      gradeLevelOrDepartment: `${student.gradeLevel} ${student.room}`,
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: `(ผู้ปกครองแจ้งลา: ${student.guardianName}) ${leaveReason}`,
      attachmentUrl: leaveAttachmentUrl || undefined,
      status: 'pending',
      createdAt: `${getLocalDateString()} ${new Date().toLocaleTimeString('th-TH')}`
    };

    if (onAddLeaveRequest) {
      onAddLeaveRequest(newLeave);
    }

    setLeaveSuccessNotice(`ส่งใบ${leaveType === 'sick' ? 'ลาป่วย' : 'ลากิจ'}ให้ ${student.firstNameTh} เรียบร้อยแล้ว`);
    setLeaveReason('');
    setLeaveAttachmentUrl('');
    setTimeout(() => setLeaveSuccessNotice(null), 5000);
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5 max-w-5xl mx-auto w-full">
      {/* Student Switcher & Guardian Profile Card */}
      <div className="shrink-0 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
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
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-100 border border-indigo-400/50">
                {student?.studentIdNumber}
              </span>
            </div>
            <p className="text-xs text-slate-200">
              {student?.gradeLevel} • {student?.room}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {lang === 'th' ? 'ผู้ปกครอง:' : 'Guardian:'} {student?.guardianName} ({student?.guardianRelation}) • {student?.guardianPhone}
            </p>
          </div>
        </div>

        {/* Student selector */}
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <label className="text-[11px] font-semibold text-slate-200">
            {lang === 'th' ? 'เลือกลูก/นักเรียนในการดูแล:' : 'Select Student:'}
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-white font-medium"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstNameTh} ({s.studentIdNumber}) - {s.gradeLevel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs in Parent Portal */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-3">
        <button
          type="button"
          onClick={() => setActivePortalTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePortalTab === 'overview'
              ? 'bg-indigo-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ภาพรวม & บัตรนักเรียน</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('selfie_album')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePortalTab === 'selfie_album'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>อัลบั้มภาพถ่ายเข้า-ออกโรงเรียน (Selfie Album)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold text-[10px]">
            {studentAttendance.filter(a => !!a.photoUrl).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('leave_submission')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePortalTab === 'leave_submission'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ยื่นใบลาให้ลูก</span>
          {studentLeaveRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold text-[10px]">
              {studentLeaveRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('consent_slips')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePortalTab === 'consent_slips'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>หนังสือขออนุญาต ({consentForms.length})</span>
        </button>
      </div>

      {/* Scrollable Tab Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TODAY'S GATE STATUS */}
      {/* ========================================================================= */}
      {activePortalTab === 'overview' && (
        <div className="space-y-4">
          {/* Today's Gate Status Banner (LINE Connected) */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    สถานะการเดินทางถึงโรงเรียนวันนี้ ({todayStr})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-600 font-semibold">
                    {todayRecord ? 'เช็กชื่อแล้ว' : 'รอการเช็กชื่อ'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-0.5">
                  {todayRecord ? (
                    <>
                      เข้าประตูเวลา <strong className="text-white font-mono">{todayRecord.time} น.</strong> • สถานะ:{' '}
                      <span className="text-emerald-300 font-semibold uppercase">{todayRecord.status === 'present' ? 'ตรงเวลา' : 'มาสาย'}</span>
                      {todayRecord.location?.distanceMeters && ` • ในเขต ${todayRecord.location.distanceMeters} ม.`}
                    </>
                  ) : (
                    'ยังไม่มีข้อมูลการสแกนผ่านประตูหรือถ่ายรูปเช็กชื่อในเช้าวันนี้'
                  )}
                </p>
              </div>
            </div>

            <a
              href={systemConfig.lineOaAddFriendUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 border border-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
              <span>เปิดแชท LINE OA โรงเรียน</span>
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
                  className="w-20 h-24 rounded-xl object-cover border-2 border-indigo-400 shadow-md"
                />
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white">
                    {student?.firstNameTh} {student?.lastNameTh}
                  </h4>
                  <p className="text-xs text-indigo-200">
                    {student?.firstNameEn} {student?.lastNameEn}
                  </p>
                  <p className="text-[11px] font-mono text-slate-300">
                    ID: {student?.studentIdNumber}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    ชั้น: {student?.gradeLevel} {student?.room}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-500/30 flex items-center justify-between text-[11px] text-slate-200 font-mono">
                <span>อัตราการมาเรียน: {attRate}%</span>
                <span>ปีการศึกษา {systemConfig.academicYear}</span>
              </div>
            </div>

            {/* Tuition & GPA Card */}
            <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 flex flex-col justify-between text-[var(--color-text-title)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span>ค่าธรรมเนียมการศึกษา</span>
                  </h3>
                  {pendingInvoice ? (
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[11px] font-bold">
                      มียอดค้างชำระ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                      ชำระครบถ้วนแล้ว
                    </span>
                  )}
                </div>

                {pendingInvoice ? (
                  <div className="p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-body)]">
                        {pendingInvoice.items[0]?.title || `ใบแจ้งหนี้ ${pendingInvoice.invoiceNumber}`}
                      </span>
                      <span className="font-mono font-bold text-base text-[var(--color-text-title)]">
                        ฿{pendingInvoice.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPayModal(true)}
                      className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>ชำระผ่าน PromptPay QR Code</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-body)]">
                    ไม่มีรายการค้างชำระในภาคเรียนปัจจุบัน
                  </p>
                )}
              </div>

              {/* GPA & Report Card Button */}
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--color-text-muted)] block">เกรดเฉลี่ยสะสม (GPAX)</span>
                  <span className="text-xl font-bold font-mono text-[var(--color-primary-text)]">
                    {student?.gpa.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenReportCard(student)}
                  className="px-3.5 py-2 rounded-xl bg-[var(--color-primary-light)] hover:bg-[var(--color-card-subtle)] text-[var(--color-primary-text)] border border-[var(--color-border)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>ดูใบเกรด ปพ.1</span>
                </button>
              </div>
            </div>
          </div>

          {slipToast && (
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold">
              {slipToast}
            </div>
          )}

          {/* Daily Pulse Timeline */}
          <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>ไทม์ไลน์ชีวิตประจำวันของ {student?.firstNameTh} (Daily Pulse)</span>
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)]">อัปเดตล่าสุดจากประตู คาบเรียน การบ้าน และห้องพยาบาล</span>
            </div>
            {dailyPulseEvents.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">ยังไม่มีความเคลื่อนไหวล่าสุดสำหรับนักเรียนคนนี้</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] text-xs">
                {dailyPulseEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={ev.onClick}
                    className={`py-2.5 flex items-center justify-between gap-3 ${ev.onClick ? 'cursor-pointer hover:bg-[var(--color-card-subtle)] rounded px-2 -mx-2' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--color-text-title)]">{ev.title}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] truncate">{ev.detail}</div>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0 tabular-nums">{ev.timeLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHILD'S SELFIE ALBUM & DAILY CHECK-IN HISTORY */}
      {/* ========================================================================= */}
      {activePortalTab === 'selfie_album' && (
        <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-5 text-[var(--color-text-title)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Camera className="w-5 h-5 text-[var(--color-primary-text)]" />
                <span>อัลบั้มภาพถ่ายเช็กชื่อเข้า-ออกของบุตรหลาน ({student?.firstNameTh})</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                รูปถ่ายยืนยันตัวตนตอนผ่านประตูโรงเรียน พร้อมบันทึกวัน-เวลาและพิกัด GPS
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAlbumSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  albumSelectedDate === todayStr ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setAlbumSelectedDate(yesterdayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  albumSelectedDate === yesterdayStr ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
                }`}
              >
                เมื่อวาน
              </button>
              <button
                type="button"
                onClick={() => setAlbumSelectedDate(twoDaysAgoStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  albumSelectedDate === twoDaysAgoStr ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
                }`}
              >
                2 วันก่อน
              </button>
              <input
                type="date"
                value={albumSelectedDate}
                onChange={(e) => e.target.value && setAlbumSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
              />
            </div>
          </div>

          {/* Date Record Cards */}
          {dateRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2">
              <Camera className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--color-text-title)]">ไม่พบบันทึกภาพถ่ายในวันที่ {albumSelectedDate}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                ลองเลือกดูวันที่อื่น เช่น วันนี้ หรือเมื่อวาน
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PagedList items={dateRecords} pageSize={2} renderItem={(rec) => {
                const isCheckOut = rec.recordType === 'check_out';
                const photoSrc = rec.photoUrl || rec.userAvatar || student?.avatarUrl;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedZoomPhoto(rec)}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)]/50 transition cursor-pointer space-y-3 shadow-2xs hover:border-[var(--color-primary)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        isCheckOut ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                      }`}>
                        {isCheckOut ? 'เช็กชื่อออกโรงเรียน (Check-out)' : 'เช็กชื่อเข้าโรงเรียน (Check-in)'}
                      </span>
                      <span className="font-mono font-bold text-xs text-[var(--color-text-title)]">
                        {rec.time} น.
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-[var(--color-border)] shrink-0">
                        <img src={photoSrc} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 hover:opacity-100 flex items-center justify-center text-white">
                          <Eye className="w-5 h-5 drop-shadow" />
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[var(--color-text-title)]">{student?.firstNameTh} {student?.lastNameTh}</p>
                        <p className="text-[11px] text-[var(--color-text-body)]">
                          จุดบันทึก: {rec.location?.geofenceZoneName || 'ประตูโรงเรียน'}
                        </p>
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                          GPS: ในรัศมี ({rec.location?.distanceMeters || 18} เมตร)
                        </p>
                        <p className="text-[10px] text-[var(--color-primary-text)] font-bold pt-1">
                          🔍 กดเพื่อดูภาพใหญ่พร้อมตราประทับ
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }} />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PARENT ONLINE LEAVE SUBMISSION */}
      {/* ========================================================================= */}
      {activePortalTab === 'leave_submission' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Leave Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-title)]">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>ผู้ปกครองส่งใบลาออนไลน์ให้บุตรหลาน</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                ส่งตรงถึงครูประจำชั้น {student?.room} พร้อมแนบใบรับรองแพทย์หรือหลักฐาน
              </p>
            </div>

            {leaveError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{leaveError}</span>
              </div>
            )}

            {leaveSuccessNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span>{leaveSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleParentSubmitLeave} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <span className="text-[11px] text-[var(--color-text-muted)]">นักเรียนที่ลา:</span>
                <p className="font-bold text-[var(--color-text-title)]">{student?.firstNameTh} {student?.lastNameTh} ({student?.room})</p>
                <span className="text-[10px] text-[var(--color-text-body)]">ผู้ปกครองผู้ยื่น: {student?.guardianName}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--color-text-title)]">ประเภทการลา:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('sick')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      leaveType === 'sick' ? 'bg-rose-100 dark:bg-rose-950 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)]'
                    }`}
                  >
                    🤒 ลาป่วย (Sick Leave)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('personal')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      leaveType === 'personal' ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)]'
                    }`}
                  >
                    🚗 ลากิจ (Personal Leave)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-title)]">ตั้งแต่วันที่:</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-title)]">ถึงวันที่:</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-title)]">เหตุผลประกอบการลา:</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="เช่น ป่วยเป็นไข้หวัด แพทย์สั่งให้พักรักษาตัว หรือ มีธุระจำเป็นกับครอบครัว..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[var(--color-text-title)]">แนบรูปใบรับรองแพทย์ / รูปถ่ายหลักฐาน:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveAttachmentUrl('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500')}
                    className="px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบรูปใบรับรองแพทย์ตัวอย่าง</span>
                  </button>
                  {leaveAttachmentUrl && (
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>แนบเรียบร้อย</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>ส่งใบลาให้ครูประจำชั้น</span>
              </button>
            </form>
          </div>

          {/* Leave History for this child */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-title)]">
            <h4 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>ประวัติการลาของ {student?.firstNameTh}</span>
            </h4>

            {studentLeaveRequests.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">ไม่มีประวัติการขอยื่นใบลาในภาคเรียนนี้</p>
            ) : (
              <div className="space-y-3">
                {studentLeaveRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--color-text-title)]">
                        {req.leaveType === 'sick' ? '🤒 ลาป่วย' : '🚗 ลากิจ'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        req.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' :
                        req.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                      }`}>
                        {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'pending' ? 'รอครูอนุมัติ' : 'ไม่อนุมัติ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-body)]">
                      ช่วงวันที่: {req.startDate} ถึง {req.endDate}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-body)] bg-[var(--color-card)] p-2 rounded-lg border border-[var(--color-border)]">
                      "{req.reason}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIGITAL PERMISSION SLIPS (CONSENT) */}
      {activePortalTab === 'consent_slips' && student && (
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-4 text-[var(--color-text-title)]">
          <div>
            <h3 className="text-base font-bold">หนังสือขออนุญาตผู้ปกครอง (Digital Permission Slips)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              ยืนยันการอนุญาตเข้าร่วมกิจกรรม/ทัศนศึกษา/ฉีดวัคซีน สำหรับ {student.firstNameTh} {student.lastNameTh} ({student.room})
            </p>
          </div>
          <div className="space-y-3">
            {consentForms
              .filter((f) => f.targetRoom === 'all' || f.targetRoom === student.room)
              .map((form) => {
                const existingResp = consentResponses.find(
                  (r) => r.formId === form.id && r.studentId === student.id
                );
                return (
                  <div key={form.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-[var(--color-text-title)]">{form.titleTh}</h4>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        วันกิจกรรม: {form.eventDate} • ตอบกลับภายใน: {form.dueDate}
                      </span>
                    </div>
                    <p className="text-[var(--color-text-body)] leading-relaxed">{form.descriptionTh}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        ผู้ประกาศ: {form.createdBy}
                      </span>
                      {existingResp ? (
                        <span className={`px-3 py-1 rounded-lg font-bold ${
                          existingResp.decision === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                        }`}>
                          {existingResp.decision === 'approved' ? '✓ ยินยอมแล้ว' : '✕ ไม่ยินยอม'} โดย {existingResp.parentName} ({new Date(existingResp.respondedAt).toLocaleDateString('th-TH')})
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = upsertConsentResponse(schoolId, {
                                formId: form.id,
                                studentId: student.id,
                                studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                decision: 'declined',
                                parentName: student.guardianName,
                              });
                              setConsentResponses(next);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-50 cursor-pointer"
                          >
                            ไม่ยินยอม
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = upsertConsentResponse(schoolId, {
                                formId: form.id,
                                studentId: student.id,
                                studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                decision: 'approved',
                                parentName: student.guardianName,
                              });
                              setConsentResponses(next);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                          >
                            ลงชื่อยินยอม
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      </div>

      {/* Lightbox Modal for Zooming Child's Selfie Photo */}
      {selectedZoomPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-[var(--color-text-title)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--color-text-title)]">รูปถ่ายเช็กชื่อตอนผ่านประตู</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedZoomPhoto.date} • {selectedZoomPhoto.time} น.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoomPhoto(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-72 mx-auto border border-[var(--color-border)] bg-slate-950 flex items-center justify-center">
              <img
                src={selectedZoomPhoto.photoUrl || selectedZoomPhoto.userAvatar || student?.avatarUrl}
                alt="Selfie Zoom"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/80 backdrop-blur-md text-white text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{student?.firstNameTh} {student?.lastNameTh}</span>
                  <span>{selectedZoomPhoto.time} น.</span>
                </div>
                <div className="text-slate-200 text-[9px]">
                  {selectedZoomPhoto.location?.geofenceZoneName || 'ประตูโรงเรียน'} • ในรัศมี {selectedZoomPhoto.location?.distanceMeters || 18} ม.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedZoomPhoto(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* PromptPay + Transfer Slip Upload Modal */}
      {showPayModal && pendingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center space-y-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 block">
                Thai PromptPay พร้อมเพย์ • แนบสลิปตรวจสอบ
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {systemConfig.schoolNameTh}
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Biller: 0105558992019 • {pendingInvoice.invoiceNumber}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl inline-block shadow-inner">
              <div className="w-40 h-40 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center p-2 bg-white">
                <div className="h-5 w-full bg-[#1A3764] rounded text-white text-[9px] font-bold flex items-center justify-center mb-1">
                  PromptPay พร้อมเพย์
                </div>
                <QrCode className="w-24 h-24 text-slate-950" />
                <span className="text-[10px] font-bold text-slate-900 font-mono mt-1">
                  ฿{pendingInvoice.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-left space-y-2 bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs">
              <label className="block font-semibold text-slate-100">
                อัปโหลดสลิปการโอนเงิน (เพื่อให้การเงินโรงเรียนตรวจสอบ):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      setSlipFileDataUrl(reader.result);
                      setSlipError(null);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full text-[11px] text-slate-200 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-emerald-700 file:text-white file:font-semibold cursor-pointer"
              />
              {slipFileDataUrl && (
                <img src={slipFileDataUrl} alt="Slip preview" className="w-full max-h-28 object-contain rounded-lg bg-white" />
              )}
              <input
                type="text"
                value={slipNote}
                onChange={(e) => setSlipNote(e.target.value)}
                placeholder="หมายเหตุ เช่น โอนจาก KBank เวลา 09:15 น."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs"
              />
              {slipError && <p className="text-rose-400 text-[11px] font-semibold">{slipError}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!slipFileDataUrl) {
                    setSlipError('กรุณาเลือกรูปสลิปการโอนเงินก่อนส่งตรวจสอบ');
                    return;
                  }
                  onSubmitInvoiceSlip?.(pendingInvoice.id, slipFileDataUrl, slipNote.trim());
                  setShowPayModal(false);
                  setSlipFileDataUrl('');
                  setSlipNote('');
                  setSlipToast(`ส่งสลิปสำหรับ ${pendingInvoice.invoiceNumber} ให้ฝ่ายการเงินตรวจสอบเรียบร้อยแล้ว`);
                  setTimeout(() => setSlipToast(null), 5000);
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                ส่งสลิปให้การเงินตรวจสอบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
