import React, { useState } from 'react';
import { 
  Smartphone, 
  UserCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Radio, 
  Send, 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Calendar,
  Check,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { 
  Student, 
  Course, 
  AttendanceRecord, 
  PeriodAttendanceRecord, 
  AttendanceStatus, 
  AuthUser, 
  AppLanguage 
} from '../types';

interface MobileAttendanceViewProps {
  students: Student[];
  courses: Course[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  onRecordAttendance: (studentId: string, status: AttendanceStatus, remarks: string, method?: string) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
}

export const MobileAttendanceView: React.FC<MobileAttendanceViewProps> = ({
  students,
  courses,
  attendance,
  periodAttendance,
  currentUser,
  lang,
  onRecordAttendance,
  onRecordPeriodAttendance
}) => {
  const [subTab, setSubTab] = useState<'student_mobile' | 'teacher_proxy' | 'period_checkin'>('student_mobile');

  // Student Mobile State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'stu-1');
  const [checkType, setCheckType] = useState<'check_in' | 'check_out'>('check_in');
  const [gpsSimulatedDistance, setGpsSimulatedDistance] = useState<number>(18); // 18 meters from school center
  const [mobileFeedback, setMobileFeedback] = useState<{ time: string; type: string; studentName: string } | null>(null);

  // Teacher Proxy Check-in State
  const [proxyGradeFilter, setProxyGradeFilter] = useState<string>('all');
  const [proxyStatuses, setProxyStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [proxySavedNotification, setProxySavedNotification] = useState<string | null>(null);

  // Period Attendance State
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || 'crs-1');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [periodDate, setPeriodDate] = useState<string>('2026-11-04');
  const [periodStatuses, setPeriodStatuses] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({});
  const [periodSavedNotification, setPeriodSavedNotification] = useState<string | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  const periodsList = [
    { period: 1, time: '08:30 - 09:20', label: 'คาบที่ 1 (Period 1)' },
    { period: 2, time: '09:25 - 10:15', label: 'คาบที่ 2 (Period 2)' },
    { period: 3, time: '10:20 - 11:10', label: 'คาบที่ 3 (Period 3)' },
    { period: 4, time: '11:15 - 12:05', label: 'คาบที่ 4 (Period 4 - พักเที่ยง)' },
    { period: 5, time: '13:00 - 13:50', label: 'คาบที่ 5 (Period 5)' },
    { period: 6, time: '13:55 - 14:45', label: 'คาบที่ 6 (Period 6)' },
    { period: 7, time: '14:50 - 15:40', label: 'คาบที่ 7 (Period 7)' }
  ];

  // Handle Student Mobile Check-in
  const handleStudentMobileTap = () => {
    if (!selectedStudent) return;
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const remarks = checkType === 'check_in' 
      ? `มือถือนักเรียนลงชื่อเข้า (GPS: รัศมี ${gpsSimulatedDistance} ม.)`
      : `มือถือนักเรียนลงชื่อออกโรงเรียน (GPS: รัศมี ${gpsSimulatedDistance} ม.)`;

    onRecordAttendance(selectedStudent.id, 'present', remarks, 'mobile_geofence');
    setMobileFeedback({
      time: nowTime,
      type: checkType === 'check_in' ? 'ลงชื่อเข้าโรงเรียนสำเร็จ' : 'ลงชื่อออกจากโรงเรียนสำเร็จ',
      studentName: `${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`
    });

    setTimeout(() => setMobileFeedback(null), 6000);
  };

  // Handle Teacher Proxy Batch Save
  const handleSaveProxyAttendance = () => {
    let savedCount = 0;
    Object.entries(proxyStatuses).forEach(([stuId, status]) => {
      const student = students.find(s => s.id === stuId);
      if (student) {
        onRecordAttendance(
          stuId, 
          status, 
          `ครูลงชื่อแทน (${currentUser?.fullNameTh || currentUser?.fullNameEn || 'อาจารย์ประจำชั้น'}) - นักเรียนไม่มีมือถือ/ลืมพกมา`,
          'teacher_proxy'
        );
        savedCount++;
      }
    });

    setProxySavedNotification(`บันทึกการเช็คชื่อแทนโดยครูเรียบร้อยแล้ว จำนวน ${savedCount} คน`);
    setTimeout(() => setProxySavedNotification(null), 5000);
  };

  // Handle Period Attendance Save
  const handleSavePeriodAttendance = () => {
    const currentPeriodInfo = periodsList.find(p => p.period === selectedPeriod);
    const newRecords: PeriodAttendanceRecord[] = selectedCourse.enrolledStudentIds.map(stuId => {
      const status = periodStatuses[stuId] || 'present';
      return {
        id: `patt-${Date.now()}-${stuId}`,
        schoolId: selectedCourse.schoolId,
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        periodNumber: selectedPeriod,
        timeSlot: currentPeriodInfo?.time || '08:30 - 09:20',
        date: periodDate,
        studentId: stuId,
        status,
        verifiedByTeacherId: currentUser?.id || 'usr-teacher',
        verifiedByTeacherName: currentUser?.fullNameTh || currentUser?.fullNameEn || selectedCourse.teacherName,
        checkMethod: 'teacher_proxy',
        remarks: `เช็คชื่อรายคาบ ${selectedCourse.code} คาบที่ ${selectedPeriod}`
      };
    });

    onRecordPeriodAttendance(newRecords);
    setPeriodSavedNotification(`บันทึกการเช็คชื่อเข้าเรียนรายคาบ ${selectedCourse.code} (คาบที่ ${selectedPeriod}) สำเร็จ`);
    setTimeout(() => setPeriodSavedNotification(null), 5000);
  };

  // Filter students for proxy
  const filteredProxyStudents = proxyGradeFilter === 'all' 
    ? students 
    : students.filter(s => s.gradeLevel === proxyGradeFilter);

  // Filter period records
  const currentPeriodRecords = periodAttendance.filter(
    p => p.courseId === selectedCourseId && p.periodNumber === selectedPeriod
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            <span>Smart Attendance Ecosystem • GPS Geofence & Period Tracking</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            {lang === 'th' ? 'ระบบเช็คชื่อมือถือ & เช็คชื่อห้องเรียนรายคาบ' : 'Mobile & Period Attendance Hub'}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'th' 
              ? 'รองรับนักเรียนลงชื่อเข้า-ออกผ่านสมาร์ตโฟนด้วย GPS รั้วโรงเรียน, ครูลงชื่อแทนกรณีไม่มีมือถือ และเช็คชื่อรายวิชารายคาบ'
              : 'Student mobile self check-in with GPS Geofencing, teacher proxy check-in, and period-by-period classroom attendance.'}
          </p>
        </div>

        {/* Live Clock Pill */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200 shrink-0">
          <Clock className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-xs font-bold text-white">4 พฤศจิกายน 2569</div>
            <div className="text-[11px] text-emerald-400 font-semibold">เวลาทำการ 07:00 - 17:00 น.</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('student_mobile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'student_mobile'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{lang === 'th' ? '1. มือถือนักเรียนลงชื่อ (GPS Campus)' : '1. Student Mobile Self Check-in'}</span>
        </button>

        <button
          onClick={() => setSubTab('teacher_proxy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'teacher_proxy'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{lang === 'th' ? '2. ครูลงชื่อแทนนักเรียน (Proxy Check-in)' : '2. Teacher Proxy Check-in'}</span>
        </button>

        <button
          onClick={() => setSubTab('period_checkin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'period_checkin'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{lang === 'th' ? '3. เช็คชื่อเข้าห้องเรียนรายคาบ (Period Attendance)' : '3. Classroom Period Attendance'}</span>
        </button>
      </div>

      {/* 1. STUDENT MOBILE SELF CHECK-IN */}
      {subTab === 'student_mobile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Device Simulator */}
          <div className="lg:col-span-5 flex justify-center">
            {/* Phone Frame */}
            <div className="w-full max-w-[340px] rounded-[42px] p-4 bg-gradient-to-b from-slate-800 to-slate-950 border-[6px] border-slate-700 shadow-2xl relative overflow-hidden">
              {/* Camera Notch */}
              <div className="w-28 h-4 bg-slate-900 rounded-b-xl mx-auto mb-3 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              </div>

              {/* Screen Content */}
              <div className="rounded-[28px] bg-slate-900 p-5 space-y-5 text-white border border-slate-800">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <span>07:45</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* School Header in Phone */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-sm text-white">EduVerse Smart Pass</h3>
                  <p className="text-[10px] text-slate-400">บัตรนักเรียนดิจิทัลประจำสมาร์ตโฟน</p>
                </div>

                {/* Student Mini Profile in Phone */}
                {selectedStudent && (
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
                    <img 
                      src={selectedStudent.avatarUrl} 
                      alt={selectedStudent.firstNameEn}
                      className="w-12 h-12 rounded-xl object-cover border border-indigo-500/30"
                    />
                    <div className="text-left space-y-0.5">
                      <div className="text-xs font-bold text-white">
                        {selectedStudent.firstNameTh} {selectedStudent.lastNameTh}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {selectedStudent.studentIdNumber} • ห้อง {selectedStudent.gradeLevel}
                      </div>
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                        {selectedStudent.lineLinked ? '✓ LINE OA ผูกแล้ว' : 'ยังไม่ผูก LINE'}
                      </span>
                    </div>
                  </div>
                )}

                {/* GPS Geofence Status */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>GPS รั้วโรงเรียน: ผ่านการตรวจสอบ</span>
                  </div>
                  <p className="text-[10px] text-emerald-200/80">
                    ห่างจากจุดกึ่งกลางโรงเรียน {gpsSimulatedDistance} ม. (พิกัด 13.736717, 100.523186)
                  </p>
                </div>

                {/* Check-in / Check-out Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                  <button
                    onClick={() => setCheckType('check_in')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      checkType === 'check_in'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    เข้าโรงเรียน
                  </button>
                  <button
                    onClick={() => setCheckType('check_out')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      checkType === 'check_out'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    เลิกเรียน / ออก
                  </button>
                </div>

                {/* Big Action Button */}
                <button
                  onClick={handleStudentMobileTap}
                  className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                    checkType === 'check_in'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-rose-600 shadow-amber-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{checkType === 'check_in' ? 'แตะลงชื่อ "เข้าโรงเรียน"' : 'แตะลงชื่อ "ออกจากโรงเรียน"'}</span>
                </button>

                <p className="text-[10px] text-center text-slate-400">
                  ระบบส่งข้อความแจ้งเตือนผู้ปกครองอัตโนมัติผ่าน LINE Official Account
                </p>
              </div>
            </div>
          </div>

          {/* Right: Controls & Live Simulated Feed */}
          <div className="lg:col-span-7 space-y-6">
            {/* Student Switcher for Simulation */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>จำลองการเข้าใช้งานด้วยโทรศัพท์ของนักเรียน (Device Testing)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">เลือกนักเรียนที่ถือสมาร์ตโฟน:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.studentIdNumber} - {s.firstNameTh} {s.lastNameTh} ({s.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">จำลองระยะทาง GPS (Geofence):</label>
                  <select
                    value={gpsSimulatedDistance}
                    onChange={(e) => setGpsSimulatedDistance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value={15}>15 เมตร (หน้าประตูใหญ่โรงเรียน - แม่นยำ)</option>
                    <option value={35}>35 เมตร (ลานเสาธง - ภายในรั้ว)</option>
                    <option value={80}>80 เมตร (อาคารเรียน 4 - ภายในรั้ว)</option>
                    <option value={500}>500 เมตร (อยู่นอกรั้วโรงเรียน - จำลองผิดตำแหน่ง)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Instant Notification Feedback Card */}
            {mobileFeedback && (
              <div className="p-5 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/40 text-slate-100 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-[#06C755] font-bold text-sm">
                  <Send className="w-4 h-4" />
                  <span>LINE OA Message Dispatched! บรอดแคสต์แจ้งเตือนผู้ปกครองสำเร็จ</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-white">📢 EduVerse LINE Notification:</div>
                  <p className="text-slate-300">
                    เรียน ผู้ปกครองของ <strong>{mobileFeedback.studentName}</strong>, นักเรียนได้ทำการ <strong>{mobileFeedback.type}</strong> เรียบร้อยแล้ว เมื่อเวลา <strong>{mobileFeedback.time} น.</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Recent Mobile Check-in Feed */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  ประวัติการลงชื่อผ่านมือถือล่าสุด (Mobile Check-in Logs)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  Real-time GPS Logs
                </span>
              </div>

              <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
                {attendance.slice(0, 5).map((rec) => {
                  const stu = students.find(s => s.id === rec.studentId);
                  return (
                    <div key={rec.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">
                            {stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : rec.studentId}
                          </div>
                          <div className="text-[11px] text-slate-400">{rec.remarks}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block">{rec.time}</span>
                        <span className="text-[10px] text-slate-400">{rec.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEACHER PROXY CHECK-IN (ครูลงชื่อแทน) */}
      {subTab === 'teacher_proxy' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <span>ครูลงชื่อแทนนักเรียน (Teacher Proxy Attendance)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  สำหรับนักเรียนที่ไม่มีโทรศัพท์มือถือ, แบตเตอรี่หมด, หรือลืมนำมา ครูประจำชั้นสามารถตรวจสอบและบันทึกแทนได้
                </p>
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">เลือกระดับชั้น:</span>
                <select
                  value={proxyGradeFilter}
                  onChange={(e) => setProxyGradeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="all">ทุกระดับชั้น (All)</option>
                  <option value="ม.6/1">ม.6/1</option>
                  <option value="ม.6/2">ม.6/2</option>
                  <option value="ม.5/1">ม.5/1</option>
                  <option value="ม.4/1">ม.4/1</option>
                </select>
              </div>
            </div>

            {/* Notification */}
            {proxySavedNotification && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{proxySavedNotification}</span>
              </div>
            )}
          </div>

          {/* Student Roster Table for Proxy */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-700">
                  <tr>
                    <th className="p-4">รหัสนักเรียน</th>
                    <th className="p-4">ชื่อ - นามสกุล</th>
                    <th className="p-4">ชั้น / ห้อง</th>
                    <th className="p-4">สถานะการเช็คชื่อโดยครู</th>
                    <th className="p-4 text-right">ผู้บันทึกแทน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProxyStudents.map((s) => {
                    const currentStatus = proxyStatuses[s.id] || 'present';
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-300">{s.studentIdNumber}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={s.avatarUrl} 
                              alt={s.firstNameEn}
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                            <div>
                              <div className="font-bold text-white">
                                {s.firstNameTh} {s.lastNameTh}
                              </div>
                              <div className="text-[10px] text-slate-400">{s.firstNameEn} {s.lastNameEn}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-semibold">{s.gradeLevel}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {[
                              { id: 'present', label: 'มาเรียน', color: 'hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40' },
                              { id: 'late', label: 'มาสาย', color: 'hover:bg-amber-600/30 text-amber-400 border-amber-500/40' },
                              { id: 'leave', label: 'ลา', color: 'hover:bg-indigo-600/30 text-indigo-400 border-indigo-500/40' },
                              { id: 'absent', label: 'ขาดเรียน', color: 'hover:bg-rose-600/30 text-rose-400 border-rose-500/40' }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setProxyStatuses(prev => ({ ...prev, [s.id]: opt.id as any }))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                  currentStatus === opt.id
                                    ? opt.id === 'present' ? 'bg-emerald-600 text-white border-emerald-500' :
                                      opt.id === 'late' ? 'bg-amber-600 text-white border-amber-500' :
                                      opt.id === 'leave' ? 'bg-indigo-600 text-white border-indigo-500' :
                                      'bg-rose-600 text-white border-rose-500'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right text-slate-400 text-[11px]">
                          {currentUser?.fullNameTh || currentUser?.fullNameEn || 'อ.ดร.ประเสริฐ ถาวร'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Batch Save Action */}
            <div className="p-4 bg-slate-800/60 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                พร้อมบันทึกผลการเช็คชื่อแทน {filteredProxyStudents.length} คน
              </span>
              <button
                onClick={handleSaveProxyAttendance}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันบันทึกข้อมูลแทนนักเรียน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLASSROOM PERIOD ATTENDANCE (เช็คชื่อรายคาบ) */}
      {subTab === 'period_checkin' && (
        <div className="space-y-6">
          {/* Controls: Course & Period Selector */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <span>บันทึกการเช็คชื่อเข้า-ออกห้องเรียนรายคาบ (Period Attendance)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เช็คชื่อตามคาบเรียนจริง คาบ 1 ถึง คาบ 7 เพื่อสรุปชั่วโมงเรียนและเวลาเรียนครบตามเกณฑ์ ปพ.
                </p>
              </div>

              {/* Notification */}
              {periodSavedNotification && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{periodSavedNotification}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">เลือกรายวิชา:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.titleTh} ({c.teacherName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">เลือกคาบเรียน (Period):</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  {periodsList.map(p => (
                    <option key={p.period} value={p.period}>
                      {p.label} [{p.time}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">วันที่ทำการสอน:</label>
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Period Attendance Table */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span>รายวิชา: {selectedCourse.code} {selectedCourse.titleTh}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                  คาบที่ {selectedPeriod}
                </span>
              </div>
              <div className="text-slate-400">
                อาจารย์ผู้สอน: {selectedCourse.teacherName}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">ลำดับ</th>
                    <th className="p-4">รหัสนักเรียน</th>
                    <th className="p-4">ชื่อ - นามสกุล</th>
                    <th className="p-4">บันทึกสถานะการเข้าห้องเรียน</th>
                    <th className="p-4">วิธีการบันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedCourse.enrolledStudentIds.map((stuId, idx) => {
                    const stu = students.find(s => s.id === stuId);
                    const currentStatus = periodStatuses[stuId] || 'present';
                    return (
                      <tr key={stuId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-mono font-bold text-slate-300">{stu?.studentIdNumber || stuId}</td>
                        <td className="p-4 font-bold text-white">
                          {stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : stuId}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {[
                              { id: 'present', label: 'เข้าเรียนตรงเวลา' },
                              { id: 'late', label: 'เข้าสาย' },
                              { id: 'absent', label: 'ขาดเรียน' },
                              { id: 'excused', label: 'มีใบลา' }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setPeriodStatuses(prev => ({ ...prev, [stuId]: opt.id as any }))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                  currentStatus === opt.id
                                    ? opt.id === 'present' ? 'bg-emerald-600 text-white border-emerald-500' :
                                      opt.id === 'late' ? 'bg-amber-600 text-white border-amber-500' :
                                      opt.id === 'absent' ? 'bg-rose-600 text-white border-rose-500' :
                                      'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          ครูประจำวิชาตรวจสอบ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Save Period Footer */}
            <div className="p-4 bg-slate-800/60 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                นักเรียนในรายวิชานี้ทั้งหมด {selectedCourse.enrolledStudentIds.length} คน
              </span>
              <button
                onClick={handleSavePeriodAttendance}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกผลการเข้าเรียนรายคาบนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
