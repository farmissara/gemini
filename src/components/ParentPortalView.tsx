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
  LeaveType
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

interface ParentPortalViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  grades: GradeRecord[];
  courses: Course[];
  systemConfig: SystemConfig;
  leaveRequests?: LeaveRequest[];
  lang: AppLanguage;
  onPayInvoice: (invoiceId: string, method: TuitionInvoice['paymentMethod']) => void;
  onOpenReportCard: (student: Student) => void;
  onAddLeaveRequest?: (req: LeaveRequest) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  students,
  attendance,
  invoices,
  grades,
  courses: _courses,
  systemConfig,
  leaveRequests = [],
  lang,
  onPayInvoice,
  onOpenReportCard,
  onAddLeaveRequest
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [activePortalTab, setActivePortalTab] = useState<'overview' | 'selfie_album' | 'leave_submission'>('overview');
  const [showPayModal, setShowPayModal] = useState(false);

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

  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentAttendance = attendance.filter((a) => a.studentId === student?.id);
  const studentInvoices = invoices.filter((i) => i.studentId === student?.id);
  const studentGrades = grades.filter((g) => g.studentId === student?.id);
  const studentLeaveRequests = leaveRequests.filter((r) => r.userId === student?.id);

  const todayRecord = studentAttendance.find((a) => a.date === todayStr);
  const pendingInvoice = studentInvoices.find((i) => i.status !== 'paid');

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
      alert('กรุณาระบุเหตุผลการลา');
      return;
    }

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

      {/* Navigation Tabs in Parent Portal */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActivePortalTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePortalTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ภาพรวม & บัตรนักเรียน</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('selfie_album')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePortalTab === 'selfie_album'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>อัลบั้มภาพถ่ายเข้า-ออกโรงเรียน (Selfie Album)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
            {studentAttendance.filter(a => !!a.photoUrl).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('leave_submission')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePortalTab === 'leave_submission'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ผู้ปกครองยื่นใบลาให้ลูก</span>
          {studentLeaveRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              {studentLeaveRequests.length}
            </span>
          )}
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
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06C755]/15 border border-[#06C755]/30 flex items-center justify-center text-[#06C755] shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    สถานะการเดินทางถึงโรงเรียนวันนี้ ({todayStr})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    {todayRecord ? 'เช็กชื่อแล้ว' : 'รอการเช็กชื่อ'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {todayRecord ? (
                    <>
                      เข้าประตูเวลา <strong className="text-slate-200 font-mono">{todayRecord.time} น.</strong> • สถานะ:{' '}
                      <span className="text-emerald-400 font-semibold uppercase">{todayRecord.status === 'present' ? 'ตรงเวลา' : 'มาสาย'}</span>
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
              className="px-3 py-1.5 rounded-lg bg-[#06C755]/20 hover:bg-[#06C755]/30 border border-[#06C755]/30 text-[#06C755] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
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

              <div className="pt-2 border-t border-indigo-500/30 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>อัตราการมาเรียน: {attRate}%</span>
                <span>ปีการศึกษา {systemConfig.academicYear}</span>
              </div>
            </div>

            {/* Tuition & GPA Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>ค่าธรรมเนียมการศึกษา</span>
                  </h3>
                  {pendingInvoice ? (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">
                      มียอดค้างชำระ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      ชำระครบถ้วนแล้ว
                    </span>
                  )}
                </div>

                {pendingInvoice ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        {pendingInvoice.items[0]?.title || `ใบแจ้งหนี้ ${pendingInvoice.invoiceNumber}`}
                      </span>
                      <span className="font-mono font-bold text-base text-slate-900">
                        ฿{pendingInvoice.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPayModal(true)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>ชำระผ่าน PromptPay QR Code</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    ไม่มีรายการค้างชำระในภาคเรียนปัจจุบัน
                  </p>
                )}
              </div>

              {/* GPA & Report Card Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">เกรดเฉลี่ยสะสม (GPAX)</span>
                  <span className="text-xl font-bold font-mono text-blue-700">
                    {student?.gpa.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenReportCard(student)}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Award className="w-4 h-4" />
                  <span>ดูใบเกรด ปพ.1</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHILD'S SELFIE ALBUM & DAILY CHECK-IN HISTORY */}
      {/* ========================================================================= */}
      {activePortalTab === 'selfie_album' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <span>อัลบั้มภาพถ่ายเช็กชื่อเข้า-ออกของบุตรหลาน ({student?.firstNameTh})</span>
              </h3>
              <p className="text-xs text-slate-500">
                รูปถ่ายยืนยันตัวตนตอนผ่านประตูโรงเรียน พร้อมบันทึกวัน-เวลาและพิกัด GPS
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAlbumSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  albumSelectedDate === todayStr ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setAlbumSelectedDate(yesterdayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  albumSelectedDate === yesterdayStr ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                เมื่อวาน
              </button>
              <button
                type="button"
                onClick={() => setAlbumSelectedDate(twoDaysAgoStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  albumSelectedDate === twoDaysAgoStr ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                2 วันก่อน
              </button>
              <input
                type="date"
                value={albumSelectedDate}
                onChange={(e) => e.target.value && setAlbumSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-white"
              />
            </div>
          </div>

          {/* Date Record Cards */}
          {dateRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 space-y-2">
              <Camera className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">ไม่พบบันทึกภาพถ่ายในวันที่ {albumSelectedDate}</p>
              <p className="text-xs text-slate-400">
                ลองเลือกดูวันที่อื่น เช่น วันนี้ หรือเมื่อวาน
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dateRecords.map((rec) => {
                const isCheckOut = rec.recordType === 'check_out';
                const photoSrc = rec.photoUrl || rec.userAvatar || student?.avatarUrl;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedZoomPhoto(rec)}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer space-y-3 shadow-2xs hover:border-blue-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isCheckOut ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isCheckOut ? 'เช็กชื่อออกโรงเรียน (Check-out)' : 'เช็กชื่อเข้าโรงเรียน (Check-in)'}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-700">
                        {rec.time} น.
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                        <img src={photoSrc} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 hover:opacity-100 flex items-center justify-center text-white">
                          <Eye className="w-5 h-5 drop-shadow" />
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-900">{student?.firstNameTh} {student?.lastNameTh}</p>
                        <p className="text-[11px] text-slate-500">
                          จุดบันทึก: {rec.location?.geofenceZoneName || 'ประตูโรงเรียน'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          GPS: ในรัศมี ({rec.location?.distanceMeters || 18} เมตร)
                        </p>
                        <p className="text-[10px] text-blue-600 font-bold pt-1">
                          🔍 กดเพื่อดูภาพใหญ่พร้อมตราประทับ
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>ผู้ปกครองส่งใบลาออนไลน์ให้บุตรหลาน</span>
              </h3>
              <p className="text-xs text-slate-500">
                ส่งตรงถึงครูประจำชั้น {student?.room} พร้อมแนบใบรับรองแพทย์หรือหลักฐาน
              </p>
            </div>

            {leaveSuccessNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{leaveSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleParentSubmitLeave} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500">นักเรียนที่ลา:</span>
                <p className="font-bold text-slate-900">{student?.firstNameTh} {student?.lastNameTh} ({student?.room})</p>
                <span className="text-[10px] text-slate-400">ผู้ปกครองผู้ยื่น: {student?.guardianName}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">ประเภทการลา:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('sick')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      leaveType === 'sick' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    🤒 ลาป่วย (Sick Leave)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('personal')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition ${
                      leaveType === 'personal' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    🚗 ลากิจ (Personal Leave)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">ตั้งแต่วันที่:</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">ถึงวันที่:</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">เหตุผลประกอบการลา:</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="เช่น ป่วยเป็นไข้หวัด แพทย์สั่งให้พักรักษาตัว หรือ มีธุระจำเป็นกับครอบครัว..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700">แนบรูปใบรับรองแพทย์ / รูปถ่ายหลักฐาน:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveAttachmentUrl('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบรูปใบรับรองแพทย์ตัวอย่าง</span>
                  </button>
                  {leaveAttachmentUrl && (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>แนบเรียบร้อย</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>ส่งใบลาให้ครูประจำชั้น</span>
              </button>
            </form>
          </div>

          {/* Leave History for this child */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>ประวัติการลาของ {student?.firstNameTh}</span>
            </h4>

            {studentLeaveRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">ไม่มีประวัติการขอยื่นใบลาในภาคเรียนนี้</p>
            ) : (
              <div className="space-y-3">
                {studentLeaveRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {req.leaveType === 'sick' ? '🤒 ลาป่วย' : '🚗 ลากิจ'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'pending' ? 'รอครูอนุมัติ' : 'ไม่อนุมัติ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ช่วงวันที่: {req.startDate} ถึง {req.endDate}
                    </p>
                    <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                      "{req.reason}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Lightbox Modal for Zooming Child's Selfie Photo */}
      {selectedZoomPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">รูปถ่ายเช็กชื่อตอนผ่านประตู</h4>
                <p className="text-xs text-slate-500">{selectedZoomPhoto.date} • {selectedZoomPhoto.time} น.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoomPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-72 mx-auto border border-slate-300 bg-slate-950 flex items-center justify-center">
              <img
                src={selectedZoomPhoto.photoUrl || selectedZoomPhoto.userAvatar || student?.avatarUrl}
                alt="Selfie Zoom"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{student?.firstNameTh} {student?.lastNameTh}</span>
                  <span>{selectedZoomPhoto.time} น.</span>
                </div>
                <div className="text-slate-300 text-[9px]">
                  {selectedZoomPhoto.location?.geofenceZoneName || 'ประตูโรงเรียน'} • ในรัศมี {selectedZoomPhoto.location?.distanceMeters || 18} ม.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedZoomPhoto(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

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
                type="button"
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onPayInvoice(pendingInvoice.id, 'promptpay');
                  setShowPayModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                ยืนยันชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
