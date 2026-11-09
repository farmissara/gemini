import React, { useState, useMemo } from 'react';
import { 
  Student, 
  Teacher,
  AttendanceRecord, 
  AttendanceStatus, 
  LeaveRequest, 
  LeaveStatus, 
  CampusGateGeofence,
  School,
  AppLanguage
} from '../types';
import { 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  MessageSquare, 
  Filter,
  Camera,
  RefreshCw,
  Sparkles,
  UserCheck,
  FileSpreadsheet,
  Download,
  FileText,
  Check,
  X,
  MapPin,
  Eye,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { DEFAULT_CAMPUS_GATES } from '../data/mockData';
import { SchoolGpsSettingsCard } from './SchoolGpsSettingsCard';

interface AttendanceViewProps {
  students: Student[];
  teachers?: Teacher[];
  attendance: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  campusGates?: CampusGateGeofence[];
  activeSchool?: School;
  lang?: AppLanguage;
  onRecordAttendance: (
    studentId: string, 
    status: AttendanceStatus, 
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: any
  ) => void;
  onUpdateLeaveStatus?: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  teachers = [],
  attendance,
  leaveRequests = [],
  campusGates = DEFAULT_CAMPUS_GATES,
  activeSchool,
  lang = 'th',
  onRecordAttendance,
  onUpdateLeaveStatus,
  onUpdateCampusGates,
  onUpdateSchoolCoordinates,
}) => {
  const [activeTab, setActiveTab] = useState<'gate_scanner' | 'leave_approval' | 'export_reports' | 'school_gps'>('gate_scanner');

  // Scanner state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [remarks, setRemarks] = useState('ประตูใหญ่ด้านหน้า (Smart Turnstile Scanner)');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerResult, setScannerResult] = useState<string | null>(null);

  // Filter logs by date
  const [dateFilter, setDateFilter] = useState(getLocalDateString());
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<AttendanceRecord | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return attendance.filter(a => a.date === dateFilter);
  }, [attendance, dateFilter]);

  // Leave approval remarks input
  const [approvalNote, setApprovalNote] = useState<Record<string, string>>({});
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Monthly Summary calculation
  const monthlySummary = useMemo(() => {
    return students.map(student => {
      const records = attendance.filter(a => a.studentId === student.id);
      const totalDays = records.length;
      const presentDays = records.filter(a => a.status === 'present').length;
      const lateDays = records.filter(a => a.status === 'late').length;
      const sickDays = records.filter(a => a.status === 'sick' || a.status === 'leave').length;
      const absentDays = records.filter(a => a.status === 'absent').length;
      const rate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100;

      return {
        student,
        totalDays: totalDays || 1,
        presentDays,
        lateDays,
        sickDays,
        absentDays,
        rate,
        isQualified: rate >= 80 // 80% threshold for exam qualification (มส.)
      };
    });
  }, [students, attendance]);

  // Simulate Turnstile Scan
  const handleSimulateScan = () => {
    if (!selectedStudentId) return;
    setIsScanning(true);
    setScannerResult(null);

    setTimeout(() => {
      const stu = students.find(s => s.id === selectedStudentId);
      onRecordAttendance(selectedStudentId, status, remarks, 'qr_scanner');
      setIsScanning(false);
      setScannerResult(`สแกนสำเร็จ: ${stu?.firstNameTh} (${stu?.studentIdNumber}) - สถานะ ${status.toUpperCase()} บันทึกลงระบบแล้ว`);
      setTimeout(() => setScannerResult(null), 4000);
    }, 800);
  };

  // Export Daily Attendance Logs to CSV with UTF-8 BOM
  const handleExportDailyCsv = () => {
    const headers = [
      'วันที่',
      'เวลา',
      'รหัสประจำตัว',
      'ชื่อ-นามสกุล',
      'บทบาท',
      'ชั้น/ห้อง/กลุ่มสาระ',
      'ประเภทการบันทึก',
      'สถานะ',
      'วิธีการเช็กชื่อ',
      'จุดตรวจ/ประตู',
      'ระยะห่าง GPS (ม.)',
      'มีรูปถ่ายเซลฟี่',
      'หมายเหตุ'
    ];

    const rows = filteredLogs.map(log => [
      log.date,
      log.time,
      log.studentId,
      log.userName || (students.find(s => s.id === log.studentId)?.firstNameTh + ' ' + students.find(s => s.id === log.studentId)?.lastNameTh) || 'ผู้ใช้งาน',
      log.userType === 'teacher' ? 'ครู' : 'นักเรียน',
      log.userDepartmentOrRoom || (students.find(s => s.id === log.studentId)?.room) || '-',
      log.recordType === 'check_out' ? 'ออกโรงเรียน' : 'เข้าโรงเรียน',
      log.status === 'present' ? 'ตรงเวลา' : log.status === 'late' ? 'มาสาย' : log.status === 'sick' ? 'ลาป่วย' : log.status === 'leave' ? 'ลากิจ' : 'ขาด',
      log.checkinMethod === 'selfie_geofence' ? 'ถ่ายรูปเซลฟี่+GPS' : log.checkinMethod === 'qr_scanner' ? 'เครื่องสแกน QR' : 'ระบบบันทึก',
      log.location?.geofenceZoneName || 'ประตูโรงเรียน',
      log.location?.distanceMeters !== undefined ? `${log.location.distanceMeters}` : '-',
      log.photoUrl ? 'ใช่' : 'ไม่ใช่',
      `"${log.remarks || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_daily_${dateFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Monthly Attendance Summary to CSV
  const handleExportMonthlySummaryCsv = () => {
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ระดับชั้น',
      'ห้อง',
      'จำนวนวันทั้งหมด',
      'มาตรงเวลา (วัน)',
      'มาสาย (วัน)',
      'ลาป่วย/กิจ (วัน)',
      'ขาดเรียน (วัน)',
      'อัตราการมาเรียน (%)',
      'ผลการประเมินสิทธิ์สอบ'
    ];

    const rows = monthlySummary.map(m => [
      m.student.studentIdNumber,
      `"${m.student.firstNameTh} ${m.student.lastNameTh}"`,
      m.student.gradeLevel,
      m.student.room,
      m.totalDays,
      m.presentDays,
      m.lateDays,
      m.sickDays,
      m.absentDays,
      `${m.rate}%`,
      m.isQualified ? 'มีสิทธิ์สอบ (ผ่านเกณฑ์)' : 'เสี่ยง มส. (ต่ำกว่า 80%)'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly_attendance_summary_${new Date().getFullYear()}_${new Date().getMonth() + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeaveRequests = leaveRequests.filter(req => {
    if (leaveFilter === 'all') return true;
    return req.status === leaveFilter;
  });

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3.5">
      {/* Top Header */}
      <div className="shrink-0 p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Attendance Center • Turnstile Gate, Online Leave &amp; Export</span>
          </div>
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <span>ศูนย์ข้อมูลการเข้าเรียน &amp; สแกนประตูโรงเรียน</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            บันทึกการผ่านประตูอัตโนมัติ, ระบบอนุมัติใบลาออนไลน์, ส่งออกรายงานสถิติ และตั้งค่าพิกัด GPS ประตูโรงเรียน
          </p>
        </div>

        {/* Subtabs Navigation */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('gate_scanner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'gate_scanner' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            1. สแกนประตู &amp; บันทึกสด
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leave_approval')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'leave_approval' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. อนุมัติใบลาออนไลน์</span>
            {leaveRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export_reports')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export_reports' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. ส่งออก Excel / PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('school_gps')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'school_gps' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>4. พิกัด GPS &amp; Geofence</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GATE SCANNER & REALTIME LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'gate_scanner' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Scanner Simulator Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>จำลองเครื่องสแกนบัตรประตูอัตโนมัติ (Turnstile)</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">เลือกนักเรียน:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.studentIdNumber}) - {s.room}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">สถานะการเข้าเรียน:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                >
                  <option value="present">ตรงเวลา (Present)</option>
                  <option value="late">มาสาย (Late)</option>
                  <option value="absent">ขาดเรียน (Absent)</option>
                  <option value="sick">ลาป่วย (Sick Leave)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">จุดประตู:</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isScanning}
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลเซนเซอร์...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>สแกนบัตรผ่านประตู</span>
                  </>
                )}
              </button>

              {scannerResult && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{scannerResult}</span>
                </div>
              )}
            </div>
          </div>

          {/* Realtime Attendance Logs for Date */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>บันทึกการเข้า-ออกโรงเรียนประจำวัน ({dateFilter})</span>
                </h2>
                <span className="text-[11px] text-slate-500">พบ {filteredLogs.length} รายการ</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleExportDailyCsv}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก CSV</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">ไม่พบบันทึกการเข้าเรียนในวันที่เลือก</p>
              ) : (
                filteredLogs.map((log) => {
                  const student = students.find(s => s.id === log.studentId);
                  const name = log.userName || (student ? `${student.firstNameTh} ${student.lastNameTh}` : log.studentId);
                  const photoSrc = log.photoUrl || log.userAvatar || student?.avatarUrl;

                  return (
                    <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => log.photoUrl && setSelectedPhotoModal(log)}
                          className={`relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 ${
                            log.photoUrl ? 'cursor-pointer ring-2 ring-blue-500/50 hover:opacity-90' : ''
                          }`}
                        >
                          <img src={photoSrc} alt={name} className="w-full h-full object-cover" />
                          {log.photoUrl && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white opacity-0 hover:opacity-100">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{name}</span>
                            {log.recordType === 'check_out' ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">ออก</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold">เข้า</span>
                            )}
                            <span className="text-slate-400 font-mono text-[11px]">({log.studentId})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            เวลา {log.time} น. • {log.location?.geofenceZoneName || log.remarks || 'สแกนประตู'}
                            {log.location?.distanceMeters !== undefined && ` (GPS ${log.location.distanceMeters} ม.)`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          log.status === 'late' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status === 'present' ? 'ตรงเวลา' : log.status === 'late' ? 'มาสาย' : 'ขาด/ลา'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE REQUESTS APPROVAL WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'leave_approval' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>ระบบพิจารณาและอนุมัติใบลาออนไลน์</span>
                </h2>
                <p className="text-xs text-slate-500">
                  เมื่ออนุมัติใบลา ระบบจะปรับสถานะในระบบเช็กชื่อประจำวันให้เป็น 'ลาป่วย' หรือ 'ลากิจ' โดยอัตโนมัติ
                </p>
              </div>

              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLeaveFilter('all')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${leaveFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  ทั้งหมด ({leaveRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('pending')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${leaveFilter === 'pending' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  รออนุมัติ ({leaveRequests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('approved')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${leaveFilter === 'approved' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  อนุมัติแล้ว ({leaveRequests.filter(r => r.status === 'approved').length})
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredLeaveRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">ไม่มีรายการใบลาในหมวดนี้</p>
              ) : (
                filteredLeaveRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          req.leaveType === 'sick' ? 'bg-rose-100 text-rose-700' :
                          req.leaveType === 'personal' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{req.userName}</h4>
                        <span className="text-slate-500">({req.gradeLevelOrDepartment})</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold self-start sm:self-auto ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {req.status === 'approved' ? 'อนุมัติเรียบร้อย' : req.status === 'pending' ? 'รอการพิจารณา' : 'ไม่อนุมัติ'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <p className="text-slate-500 text-[11px]">
                        ระยะเวลาลา: <strong>{req.startDate} ถึง {req.endDate}</strong> • วันที่ยื่น: {req.createdAt}
                      </p>
                      <p className="text-slate-800 font-medium">"{req.reason}"</p>
                      {req.attachmentUrl && (
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block mb-1">เอกสาร/ใบรับรองแพทย์แนบ:</span>
                          <img src={req.attachmentUrl} alt="Certificate" className="w-32 h-20 rounded-lg object-cover border" />
                        </div>
                      )}
                    </div>

                    {req.status === 'pending' && onUpdateLeaveStatus && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="ข้อความหมายเหตุการอนุมัติ..."
                          value={approvalNote[req.id] || ''}
                          onChange={(e) => setApprovalNote({ ...approvalNote, [req.id]: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 flex-1 bg-white"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(req.id, 'approved', approvalNote[req.id])}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติใบลา</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(req.id, 'rejected', approvalNote[req.id])}
                            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>ปฏิเสธ</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXPORT REPORTS (EXCEL & PDF ATTENDANCE ENGINE) */}
      {/* ========================================================================= */}
      {activeTab === 'export_reports' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>ศูนย์ส่งออกรายงานสถิติการเข้าเรียน (Attendance Export Engine)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  ดาวน์โหลดไฟล์ Excel (.csv รองรับภาษาไทย UTF-8) หรือสั่งพิมพ์รายงานสรุปสิทธิ์สอบ (มส.)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportDailyCsv}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออกข้อมูลประจำวัน</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportMonthlySummaryCsv}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ส่งออกรายงานสรุปรายเดือน (Excel)</span>
                </button>
              </div>
            </div>

            {/* Monthly Summary Table Preview */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                ตัวอย่างตารางสรุปการเข้าเรียนประจำเดือน (Student Attendance &amp; Qualification Matrix)
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3">รหัสนักเรียน</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">ชั้น / ห้อง</th>
                      <th className="p-3 text-center">มาเรียน</th>
                      <th className="p-3 text-center">มาสาย</th>
                      <th className="p-3 text-center">ลาป่วย/กิจ</th>
                      <th className="p-3 text-center">ขาดเรียน</th>
                      <th className="p-3 text-center">เปอร์เซ็นต์</th>
                      <th className="p-3 text-center">สถานะสิทธิ์สอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySummary.map((m) => (
                      <tr key={m.student.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono text-slate-600">{m.student.studentIdNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{m.student.firstNameTh} {m.student.lastNameTh}</td>
                        <td className="p-3 text-slate-600">{m.student.gradeLevel} {m.student.room}</td>
                        <td className="p-3 text-center text-emerald-700 font-bold">{m.presentDays}</td>
                        <td className="p-3 text-center text-amber-700 font-bold">{m.lateDays}</td>
                        <td className="p-3 text-center text-blue-700 font-bold">{m.sickDays}</td>
                        <td className="p-3 text-center text-rose-700 font-bold">{m.absentDays}</td>
                        <td className="p-3 text-center font-mono font-black text-slate-900">{m.rate}%</td>
                        <td className="p-3 text-center">
                          {m.isQualified ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ผ่านเกณฑ์
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              เสี่ยง มส.
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SCHOOL GPS & GEOFENCE SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'school_gps' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SchoolGpsSettingsCard
            activeSchool={activeSchool || {
              id: 'sch-1',
              code: 'SCH-BKK01',
              nameTh: 'โรงเรียนเตรียมอุดมศึกษานวัตกรรม',
              nameEn: 'Triam Udom Suksa Innovation Academy',
              slug: 'triam-udom-innovation',
              type: 'public',
              province: 'กรุงเทพมหานคร',
              address: 'ถนนพญาไท เขตปทุมวัน กรุงเทพฯ 10330',
              phone: '02-218-1234',
              email: 'info@triamudom.ac.th',
              primaryColor: '#1e40af',
              studentsCount: 2450,
              teachersCount: 142,
              academicYear: '2569',
              currentSemester: '1',
              lineOaId: '@triamudom_sis',
              createdAt: '2025-01-01',
              status: 'active'
            }}
            campusGates={campusGates}
            lang={lang}
            onUpdateCampusGates={onUpdateCampusGates || (() => {})}
            onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
          />
        </div>
      )}

      {/* Lightbox Modal for Zooming Selfie Photo in Attendance Logs */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">รูปถ่ายเช็กชื่อตอนผ่านประตู</h4>
                <p className="text-xs text-slate-500">{selectedPhotoModal.date} • {selectedPhotoModal.time} น.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-72 mx-auto border border-slate-300 bg-slate-950 flex items-center justify-center">
              <img
                src={selectedPhotoModal.photoUrl}
                alt="Selfie Zoom"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{selectedPhotoModal.userName}</span>
                  <span>{selectedPhotoModal.time} น.</span>
                </div>
                <div className="text-slate-300 text-[9px]">
                  {selectedPhotoModal.location?.geofenceZoneName || 'ประตูโรงเรียน'} • ในรัศมี {selectedPhotoModal.location?.distanceMeters || 18} ม.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPhotoModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
