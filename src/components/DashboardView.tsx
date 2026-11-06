import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Receipt,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  QrCode,
  Calendar,
  FileCheck2,
  Award,
  Camera,
  MapPin,
  Eye,
  X,
  Download,
  Filter,
  UserCheck,
  Check,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  LogOut,
  LogIn
} from 'lucide-react';
import { 
  Student, 
  Teacher,
  Course, 
  AttendanceRecord, 
  TuitionInvoice, 
  Announcement, 
  SystemConfig,
  School,
  AuthUser,
  AttendanceCheckType,
  AttendanceUserType
} from '../types';
import { NavTab } from './Sidebar';
import { getLocalDateString } from '../lib/date';

interface DashboardViewProps {
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  systemConfig: SystemConfig;
  school?: School;
  currentUser?: AuthUser | null;
  onNavigate: (tab: NavTab) => void;
  onQuickCheckIn: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  teachers = [],
  attendance,
  invoices,
  announcements,
  systemConfig,
  school,
  currentUser,
  onNavigate,
}) => {
  // Date and filter states for the historical selfie check-in viewer & analytics
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 2 * 86400000));

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'check_in' | 'check_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lightbox Modal for viewing captured selfie photo
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  // Compute key overall stats
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const lineConnectedCount = students.filter(s => s.lineLinked).length;
  const linePercent = totalStudents > 0 ? Math.round((lineConnectedCount / totalStudents) * 100) : 0;

  // Filter attendance for the selected date
  const filteredAttendanceByDate = useMemo(() => {
    return attendance.filter(a => a.date === selectedDate);
  }, [attendance, selectedDate]);

  // Filtered by role and type
  const displayRecords = useMemo(() => {
    return filteredAttendanceByDate.filter(rec => {
      // Role filter
      if (selectedRoleFilter === 'student' && rec.userType === 'teacher') return false;
      if (selectedRoleFilter === 'teacher' && rec.userType !== 'teacher') return false;

      // Type filter
      if (selectedTypeFilter === 'check_in' && rec.recordType === 'check_out') return false;
      if (selectedTypeFilter === 'check_out' && rec.recordType !== 'check_out') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = (rec.userName || '').toLowerCase();
        const role = (rec.userRole || '').toLowerCase();
        const room = (rec.userDepartmentOrRoom || '').toLowerCase();
        const remarks = (rec.remarks || '').toLowerCase();
        return name.includes(query) || role.includes(query) || room.includes(query) || remarks.includes(query);
      }

      return true;
    });
  }, [filteredAttendanceByDate, selectedRoleFilter, selectedTypeFilter, searchQuery]);

  // Analytics for the selected date
  const totalForDate = filteredAttendanceByDate.length;
  const checkInsCount = filteredAttendanceByDate.filter(a => a.recordType !== 'check_out').length;
  const checkOutsCount = filteredAttendanceByDate.filter(a => a.recordType === 'check_out').length;
  const presentCount = filteredAttendanceByDate.filter(a => a.status === 'present').length;
  const lateCount = filteredAttendanceByDate.filter(a => a.status === 'late').length;
  const selfieCount = filteredAttendanceByDate.filter(a => !!a.photoUrl).length;
  const studentCheckIns = filteredAttendanceByDate.filter(a => a.userType !== 'teacher').length;
  const teacherCheckIns = filteredAttendanceByDate.filter(a => a.userType === 'teacher').length;

  const onTimePercent = totalForDate > 0 ? Math.round((presentCount / totalForDate) * 100) : 0;
  const latePercent = totalForDate > 0 ? Math.round((lateCount / totalForDate) * 100) : 0;

  // Hourly arrival distribution
  const hourlyBuckets = useMemo(() => {
    const buckets = [
      { label: '< 07:00 น.', range: 'เช้าตรู่', count: 0, color: 'bg-indigo-500' },
      { label: '07:00 - 07:30 น.', range: 'เวลาปกติ', count: 0, color: 'bg-emerald-500' },
      { label: '07:31 - 08:00 น.', range: 'ช่วงหนาแน่น', count: 0, color: 'bg-cyan-500' },
      { label: '08:01 - 08:30 น.', range: 'เริ่มสาย', count: 0, color: 'bg-amber-500' },
      { label: '> 08:30 น.', range: 'สายมาก', count: 0, color: 'bg-rose-500' },
      { label: '15:30 - 17:30 น.', range: 'เช็กเอาท์เลิกเรียน', count: 0, color: 'bg-purple-500' }
    ];

    filteredAttendanceByDate.forEach(rec => {
      if (!rec.time) return;
      const [h, m] = rec.time.split(':').map(Number);
      const minutes = (h || 0) * 60 + (m || 0);

      if (minutes < 7 * 60) {
        buckets[0].count++;
      } else if (minutes <= 7 * 60 + 30) {
        buckets[1].count++;
      } else if (minutes <= 8 * 60) {
        buckets[2].count++;
      } else if (minutes <= 8 * 60 + 30) {
        buckets[3].count++;
      } else if (minutes <= 15 * 60) {
        buckets[4].count++;
      } else {
        buckets[5].count++;
      }
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      percent: totalForDate > 0 ? Math.round((b.count / totalForDate) * 100) : 0,
      barPercent: Math.round((b.count / maxCount) * 100)
    }));
  }, [filteredAttendanceByDate, totalForDate]);

  // Tuition stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollected = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Top honor students
  const topStudents = [...students].sort((a, b) => b.gpa - a.gpa).slice(0, 4);

  // Export selected date attendance to Excel CSV
  const handleExportSelectedDateCsv = () => {
    const headers = [
      'วันที่',
      'เวลา',
      'รหัสประจำตัว',
      'ชื่อ-นามสกุล',
      'บทบาท',
      'ชั้น/ห้อง/กลุ่มสาระ',
      'ประเภทการบันทึก',
      'สถานะ',
      'จุดตรวจ/ประตู',
      'ระยะห่าง GPS (ม.)',
      'มีรูปถ่ายเซลฟี่',
      'หมายเหตุ'
    ];

    const rows = filteredAttendanceByDate.map(log => [
      log.date,
      log.time,
      log.studentId,
      `"${log.userName || (students.find(s => s.id === log.studentId)?.firstNameTh + ' ' + students.find(s => s.id === log.studentId)?.lastNameTh) || 'ผู้ใช้งาน'}"`,
      log.userType === 'teacher' ? 'ครู' : 'นักเรียน',
      log.userDepartmentOrRoom || (students.find(s => s.id === log.studentId)?.room) || '-',
      log.recordType === 'check_out' ? 'ออกโรงเรียน' : 'เข้าโรงเรียน',
      log.status === 'present' ? 'ตรงเวลา' : log.status === 'late' ? 'มาสาย' : log.status === 'sick' ? 'ลาป่วย' : log.status === 'leave' ? 'ลากิจ' : 'ขาด',
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
    link.download = `attendance_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 text-white p-6 shadow-lg shadow-blue-900/10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>ปีการศึกษา {systemConfig.academicYear} • ภาคเรียนที่ 1</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            ยินดีต้อนรับสู่ {systemConfig.schoolNameTh}
          </h1>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            {systemConfig.schoolNameEn} — ศูนย์รวมการบริหารวิชาการ ทะเบียนนักเรียน และระบบบันทึกภาพถ่ายเช็กชื่อเข้า-ออกผ่านสมาร์ตโฟนด้วย GPS
          </p>
        </div>

        {/* Quick Functional Shortcuts with Emphasis on Mobile Selfie Check-in */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('mobile_checkin')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-md shadow-amber-400/20 transition transform active:scale-95"
          >
            <Camera className="w-4 h-4 text-slate-900" />
            <span>ถ่ายรูปเช็กชื่อมือถือ</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium backdrop-blur-sm transition"
          >
            <QrCode className="w-4 h-4" />
            <span>สแกนประตู</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('homework')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium backdrop-blur-sm transition"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>ตรวจการบ้าน</span>
          </button>
        </div>
      </div>

      {/* 4 Balanced High-level Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">จำนวนนักเรียนทั้งหมด</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalStudents} <span className="text-xs font-normal text-slate-400">คน</span></h3>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              {activeStudents} คน สถานะปกติในระบบ
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Selected Date Attendance Rate */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">เข้าเรียนตรงเวลา ({selectedDate === todayStr ? 'วันนี้' : selectedDate})</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{onTimePercent}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              ตรงเวลา {presentCount} • สาย {lateCount}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Tuition Collection */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">การจัดเก็บค่าเล่าเรียน</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{collectionRate}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              ฿{totalCollected.toLocaleString()} จาก ฿{totalInvoiced.toLocaleString()}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* LINE Guardian Sync */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">ผูก LINE ผู้ปกครอง</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{linePercent}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {lineConnectedCount} จาก {totalStudents} รายชื่อ
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: SELFIE CHECK-IN/OUT RECORDS, DETAILED GRAPHS & HISTORICAL VIEWER */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  ระบบข้อมูลเช็กชื่อเข้า-ออกโรงเรียน & ดูรูปถ่ายล่าสุดย้อนหลัง
                </h2>
                <p className="text-xs text-slate-500">
                  บันทึกภาพถ่ายใบหน้าพร้อมพิกัด GPS ของนักเรียนและครูจากโทรศัพท์เครื่องตัวเอง สามารถเลือกดูย้อนหลังตามวันเวลาที่กำหนด
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleExportSelectedDateCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel ({selectedDate})</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('mobile_checkin')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs"
            >
              <Smartphone className="w-4 h-4" />
              <span>เปิดหน้าถ่ายรูปเช็กชื่อ</span>
            </button>
          </div>
        </div>

        {/* Filter and Date Selector Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets & Custom Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>เลือกดูวันที่:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDate === todayStr 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              วันนี้ (Today)
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDate === yesterdayStr 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              เมื่อวาน (Yesterday)
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(twoDaysAgoStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDate === twoDaysAgoStr 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              2 วันก่อน
            </button>

            {/* Custom Date Picker */}
            <div className="relative inline-flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-white hover:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Role and Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value as 'all' | 'student' | 'teacher')}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-slate-50 focus:outline-hidden"
            >
              <option value="all">ทุกบทบาท (นักเรียน & ครู)</option>
              <option value="student">เฉพาะนักเรียน</option>
              <option value="teacher">เฉพาะครูผู้สอน</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as 'all' | 'check_in' | 'check_out')}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-slate-50 focus:outline-hidden"
            >
              <option value="all">เข้า & ออกทั้งหมด</option>
              <option value="check_in">เฉพาะเข้าโรงเรียน (Check-in)</option>
              <option value="check_out">เฉพาะออกโรงเรียน (Check-out)</option>
            </select>
          </div>
        </div>

        {/* Detailed Visual Analytics & Graphs Section */}
        <div className="p-5 bg-slate-50/40 border-b border-slate-100 space-y-5">
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-[11px] text-slate-500 font-medium">บันทึกทั้งหมด</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{totalForDate}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">รายการ</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-[11px] text-emerald-600 font-medium flex items-center justify-center gap-1">
                <LogIn className="w-3 h-3" />
                <span>เข้าโรงเรียน</span>
              </p>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{checkInsCount}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">ตรงเวลา {presentCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-[11px] text-amber-600 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                <span>มาสาย</span>
              </p>
              <p className="text-xl font-black text-amber-700 mt-0.5">{lateCount}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">{latePercent}% ของทั้งหมด</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-[11px] text-purple-600 font-medium flex items-center justify-center gap-1">
                <LogOut className="w-3 h-3" />
                <span>ออกโรงเรียน</span>
              </p>
              <p className="text-xl font-black text-purple-700 mt-0.5">{checkOutsCount}</p>
              <p className="text-[10px] text-purple-500 mt-0.5">Check-outs</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-[11px] text-blue-600 font-medium flex items-center justify-center gap-1">
                <Camera className="w-3 h-3" />
                <span>ภาพถ่ายยืนยัน</span>
              </p>
              <p className="text-xl font-black text-blue-700 mt-0.5">{selfieCount}</p>
              <p className="text-[10px] text-blue-500 mt-0.5">มีรูปเซลฟี่ในระบบ</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-[11px] text-slate-500 font-medium">สัดส่วน นักเรียน/ครู</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">{studentCheckIns}/{teacherCheckIns}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">นร. {studentCheckIns} • ครู {teacherCheckIns}</p>
            </div>
          </div>

          {/* Interactive Graph 1: Hourly Arrival & Departure Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Hourly Distribution Bar Chart */}
            <div className="lg:col-span-2 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>กราฟแสดงช่วงเวลาการเดินทางเข้า-ออกโรงเรียน (Hourly Distribution)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    วิเคราะห์ความหนาแน่นของการผ่านเขตพื้นที่และประตูโรงเรียนในวันที่ {selectedDate}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  รวม {totalForDate} คน
                </span>
              </div>

              {/* Bar visualization */}
              <div className="space-y-2.5 pt-1">
                {hourlyBuckets.map((bucket, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        <span>{bucket.label}</span>
                        <span className="text-slate-400 font-normal">({bucket.range})</span>
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {bucket.count} คน ({bucket.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bucket.color} transition-all duration-500`}
                        style={{ width: `${bucket.barPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Analytics Card: Roles & Quality Index */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ดัชนีความตรงเวลา & ความปลอดภัย GPS</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  การตรวจสอบระยะห่างจากใจกลางสถานศึกษา
                </p>
              </div>

              {/* Quality Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">อัตราเข้าเรียนตรงเวลา:</span>
                  <span className="font-bold text-emerald-700 font-mono">{onTimePercent}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${onTimePercent}%` }}
                    title={`ตรงเวลา ${presentCount} คน`}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${latePercent}%` }}
                    title={`มาสาย ${lateCount} คน`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>ตรงเวลา ({presentCount})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>มาสาย ({lateCount})</span>
                  </span>
                </div>
              </div>

              {/* Geofence verification summary */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <MapPin className="w-3.5 h-3.5 text-blue-700" />
                  <span>รั้วเสมือน GPS Geofence (รัศมี 300 ม.)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  ทุกคนที่ลงชื่อผ่านมือถือในระบบนี้ ได้รับการบันทึกภาพถ่ายเซลฟี่จริง พร้อมประทับตราพิกัดระยะห่าง และเวลาที่ตรวจสอบย้อนหลังได้
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery / Cards of Recent Selfie Check-ins with Click-to-View Modal */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>บันทึกภาพถ่ายเช็กชื่อล่าสุดในวันที่เลือก ({selectedDate})</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                  {displayRecords.length} รายการ
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                คลิกที่รูปภาพหรือการ์ดเพื่อเปิดดูรูปถ่ายขนาดใหญ่พร้อมรายละเอียดวัน-เวลาและพิกัดย้อนหลัง
              </p>
            </div>

            {/* Simple Text Search inside table */}
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัสนักเรียน, หรือห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 w-full sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {displayRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
              <Camera className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">ไม่พบบันทึกเช็กชื่อในวันที่เลือก ({selectedDate})</p>
              <p className="text-xs text-slate-400">
                ลองเลือกดูวันที่อื่น เช่น วันนี้ หรือเมื่อวาน หรือกด "ถ่ายรูปเช็กชื่อมือถือ" เพื่อบันทึกข้อมูลใหม่
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                กลับมาดูวันนี้
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayRecords.map((rec) => {
                const isCheckOut = rec.recordType === 'check_out';
                const isTeacher = rec.userType === 'teacher';
                const photoSrc = rec.photoUrl || rec.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedPhotoRecord(rec)}
                    className="group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between gap-3"
                  >
                    {/* Top Row: Type & Timestamp */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {isCheckOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200">
                            <LogOut className="w-3 h-3" />
                            <span>ออกโรงเรียน</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            <LogIn className="w-3 h-3" />
                            <span>เข้าโรงเรียน</span>
                          </span>
                        )}
                        {isTeacher ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            ครู
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                            นร.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{rec.time} น.</span>
                      </div>
                    </div>

                    {/* Middle: Photo & Person Info */}
                    <div className="flex items-center gap-3">
                      {/* Photo Thumbnail with Zoom Icon on Hover */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-blue-500 transition">
                        <img
                          src={photoSrc}
                          alt={rec.userName || 'Check-in photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-5 h-5 drop-shadow" />
                        </div>
                        {rec.photoUrl && (
                          <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-blue-600 text-white text-[9px] shadow">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {rec.userName || 'ผู้ใช้งานระบบ'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {rec.userDepartmentOrRoom || rec.userRole || 'โรงเรียน'}
                        </p>
                        <div className="pt-0.5">
                          {rec.status === 'present' ? (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ตรงเวลา</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>มาสาย</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata: GPS & Action Prompt */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 truncate text-slate-600">
                        <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {rec.location?.distanceMeters !== undefined 
                            ? `ห่าง ${rec.location.distanceMeters} ม.` 
                            : 'ในเขตพื้นที่โรงเรียน'}
                        </span>
                      </div>

                      <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5 shrink-0 text-[10px]">
                        <span>ดูรูปเต็ม</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Gate Attendance & Academic Honor Roll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Attendance Log */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">บันทึกการผ่านประตูและเข้าเรียนวันนี้</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                ถ่ายทอดสด
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              ดูบันทึกทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {displayRecords.slice(0, 5).map((rec) => {
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedPhotoRecord(rec)}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-50/80 rounded-lg px-2 transition"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={rec.photoUrl || rec.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                      alt={rec.userName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {rec.userName}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({rec.studentId})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {rec.userDepartmentOrRoom || rec.userRole} • เวลา {rec.time} น. • {rec.recordType === 'check_out' ? 'ออก' : 'เข้า'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {rec.status === 'present' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ตรงเวลา</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-[11px] border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>มาสาย</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Honor Students Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">นักเรียนผลการเรียนดีเด่น</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('gradebook')}
              className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              สมุดคะแนน <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {topStudents.map((st, idx) => (
              <div
                key={st.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 text-center font-bold text-slate-400 text-xs">
                    #{idx + 1}
                  </div>
                  <img
                    src={st.avatarUrl}
                    alt={st.firstNameEn}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {st.firstNameTh} {st.lastNameTh}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ชั้น {st.gradeLevel} ห้อง {st.room}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-blue-700 font-mono text-sm">
                    {st.gpa.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">เกรดเฉลี่ย</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>ข่าวสารและประกาศสำคัญของโรงเรียน</span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('announcements')}
            className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            ดูประกาศทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {announcements.slice(0, 2).map((item) => (
            <div key={item.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.title}</span>
                <span className="text-[10px] text-slate-400">{item.publishedAt}</span>
              </div>
              <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">
                {item.content}
              </p>
              <div className="text-[10px] text-slate-500 pt-1">
                ประกาศโดย: {item.author} ({item.authorRole})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIGHTBOX MODAL: FULL CAPTURED SELFIE PHOTO & TIMESTAMP/LOCATION VIEWER */}
      {/* ========================================================================= */}
      {selectedPhotoRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    รูปถ่ายเช็กชื่อยืนยันตัวตน (Selfie Snapshot Verification)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    วันที่ {selectedPhotoRecord.date} • เวลา {selectedPhotoRecord.time} น.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoRecord(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Captured Photo Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 max-h-80 mx-auto shadow-inner border border-slate-800 flex items-center justify-center">
                <img
                  src={selectedPhotoRecord.photoUrl || selectedPhotoRecord.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'}
                  alt={selectedPhotoRecord.userName}
                  className="w-full h-full object-contain"
                />

                {/* Live Watermark on Photo */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] space-y-0.5 border border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-cyan-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{systemConfig.schoolNameTh} • VERIFIED CHECK</span>
                    </span>
                    <span className="font-mono">{selectedPhotoRecord.time} น.</span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span>{selectedPhotoRecord.userName} ({selectedPhotoRecord.userDepartmentOrRoom || selectedPhotoRecord.userRole})</span>
                    <span>{selectedPhotoRecord.recordType === 'check_out' ? 'ออกโรงเรียน' : 'เข้าโรงเรียน'}</span>
                  </div>
                  <div className="text-[9px] text-white/60 font-mono truncate">
                    GPS: {selectedPhotoRecord.location?.lat || 13.7367}, {selectedPhotoRecord.location?.lng || 100.5231} • ห่าง {selectedPhotoRecord.location?.distanceMeters || 18} ม.
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">ชื่อผู้ลงชื่อ</span>
                  <p className="font-bold text-slate-900">{selectedPhotoRecord.userName}</p>
                  <p className="text-[11px] text-slate-500">
                    {selectedPhotoRecord.userRole} • {selectedPhotoRecord.userDepartmentOrRoom}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">ประเภทและสถานะ</span>
                  <div className="flex items-center gap-2">
                    {selectedPhotoRecord.recordType === 'check_out' ? (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[11px]">
                        เช็กชื่อออก
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[11px]">
                        เช็กชื่อเข้า
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      selectedPhotoRecord.status === 'present' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedPhotoRecord.status === 'present' ? 'ตรงเวลา' : 'มาสาย'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    บันทึกเวลา: {selectedPhotoRecord.time} น.
                  </p>
                </div>

                <div className="col-span-2 p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                  <span className="text-[10px] text-blue-800 font-semibold uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-700" />
                    <span>ข้อมูลตำแหน่ง GPS & รั้วเสมือน (Geofence)</span>
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                    <div>
                      <span className="font-semibold">จุดที่บันทึก: </span>
                      <span>{selectedPhotoRecord.location?.geofenceZoneName || 'ประตูโรงเรียน'}</span>
                    </div>
                    <div className="font-mono text-emerald-700 font-bold">
                      ระยะห่างจากศูนย์กลาง: {selectedPhotoRecord.location?.distanceMeters || 18} เมตร (อยู่ในเขต)
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic pt-0.5">
                    หมายเหตุ: {selectedPhotoRecord.remarks || 'ลงชื่อผ่านโทรศัพท์เครื่องตัวเองด้วยการถ่ายภาพหน้าและตรวจสอบพิกัด Geofence'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                รหัสรายการ: {selectedPhotoRecord.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedPhotoRecord.photoUrl || selectedPhotoRecord.userAvatar || '';
                    link.download = `selfie_${selectedPhotoRecord.userName}_${selectedPhotoRecord.date}.jpg`;
                    link.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>บันทึกรูปภาพ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoRecord(null)}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
