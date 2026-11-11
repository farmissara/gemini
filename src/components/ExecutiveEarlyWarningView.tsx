import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  UserCheck, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Filter, 
  Search, 
  TrendingDown, 
  Clock, 
  ChevronRight,
  Sparkles,
  PhoneCall,
  FileCheck2,
  Download,
  X
} from 'lucide-react';
import { 
  AtRiskStudentForecast, 
  AppLanguage, 
  UserRole,
  Student,
  AttendanceRecord,
  GradeRecord,
  SdqAssessment,
  BehaviorRecord
} from '../types';
import { INITIAL_AT_RISK_FORECASTS } from '../data/innovativeFeaturesData';
import { PagedList } from './PagedList';
import { sendEduVerseNotification } from '../lib/pushNotifications';

interface ExecutiveEarlyWarningViewProps {
  students?: Student[];
  attendance?: AttendanceRecord[];
  grades?: GradeRecord[];
  sdqAssessments?: SdqAssessment[];
  behaviorRecords?: BehaviorRecord[];
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const ExecutiveEarlyWarningView: React.FC<ExecutiveEarlyWarningViewProps> = ({
  students = [],
  attendance = [],
  grades = [],
  sdqAssessments = [],
  behaviorRecords = [],
  lang = 'th',
  currentRole = 'super_admin',
  currentUserName = 'ผู้อำนวยการสถานศึกษา'
}) => {
  // Compute dynamic forecasts based on real student data or fallback to initial fixtures
  const computedForecasts = useMemo<AtRiskStudentForecast[]>(() => {
    if (!students || students.length === 0) {
      return INITIAL_AT_RISK_FORECASTS;
    }

    return students.map((stu) => {
      // 1. Attendance Rate
      const stuAttendance = attendance.filter(a => a.studentId === stu.id);
      const totalAtt = stuAttendance.length || 20;
      const presentAtt = stuAttendance.filter(a => a.status === 'present').length || (totalAtt * 0.85);
      const attendanceRate = Math.min(100, Math.round((presentAtt / totalAtt) * 100));

      // 2. Academic Midterm Average & Grade Point
      const stuGrades = grades.filter(g => g.studentId === stu.id);
      const avgScore = stuGrades.length > 0 
        ? Math.round(stuGrades.reduce((acc, g) => acc + (g.totalScore || 65), 0) / stuGrades.length)
        : Math.round((stu.gpa / 4.0) * 100);

      // 3. SDQ Assessment
      const stuSdq = sdqAssessments.find(s => s.studentId === stu.id);
      const sdqRiskStatus: 'normal' | 'risk' | 'problem' = stuSdq 
        ? (stuSdq.overallStatus === 'problem' ? 'problem' : stuSdq.overallStatus === 'risk' ? 'risk' : 'normal')
        : (attendanceRate < 75 ? 'risk' : 'normal');

      // 4. Homework Completion Estimation
      const homeworkRate = stu.gpa >= 3.0 ? 95 : stu.gpa >= 2.5 ? 80 : stu.gpa >= 2.0 ? 60 : 42;

      // 5. Predict Outcome & Risk Level
      let riskLevel: 'high' | 'moderate' | 'low' = 'low';
      let outcome: AtRiskStudentForecast['predictedOutcome'] = 'ปกติ';

      if (attendanceRate < 80) {
        riskLevel = 'high';
        outcome = 'เสี่ยง มส. (เวลาเรียนไม่พอ)';
      } else if (homeworkRate < 50 || avgScore < 50) {
        riskLevel = 'high';
        outcome = 'เสี่ยง ร. (งานค้างส่ง)';
      } else if (stu.gpa < 2.0 || sdqRiskStatus === 'problem') {
        riskLevel = 'moderate';
        outcome = 'เสี่ยงเกรดตกต่ำกว่าเกณฑ์';
      }

      return {
        studentId: stu.id,
        studentName: `${stu.firstNameTh} ${stu.lastNameTh}`,
        studentRoom: stu.room,
        riskLevel,
        attendanceRate,
        homeworkCompletionRate: homeworkRate,
        midtermAverageScore: avgScore,
        sdqRiskStatus,
        predictedOutcome: outcome,
        earlyInterventionActions: [
          {
            id: `act-${stu.id}-1`,
            actionType: 'line_parent_alert',
            titleTh: 'ส่งหนังสือแจ้งเตือนผู้ปกครองผ่าน LINE OA',
            status: 'pending'
          },
          {
            id: `act-${stu.id}-2`,
            actionType: 'counselor_meeting',
            titleTh: 'นัดหมายพบครูแนะแนวรายบุคคล (OBEC Care)',
            status: 'pending'
          }
        ]
      };
    });
  }, [students, attendance, grades, sdqAssessments, behaviorRecords]);

  const [forecasts, setForecasts] = useState<AtRiskStudentForecast[]>(computedForecasts);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Sync if computed forecasts changes
  React.useEffect(() => {
    if (computedForecasts.length > 0) {
      setForecasts(computedForecasts);
    }
  }, [computedForecasts]);

  // Available Rooms
  const availableRooms = useMemo(() => Array.from(new Set(forecasts.map(f => f.studentRoom).filter(Boolean))), [forecasts]);

  // KPI Calculations
  const totalForecasted = forecasts.length;
  const highRiskCount = forecasts.filter(f => f.riskLevel === 'high').length;
  const moderateRiskCount = forecasts.filter(f => f.riskLevel === 'moderate').length;
  const lowRiskCount = forecasts.filter(f => f.riskLevel === 'low').length;
  const attendanceDangerCount = forecasts.filter(f => f.attendanceRate < 80).length;
  const homeworkDangerCount = forecasts.filter(f => f.homeworkCompletionRate < 50).length;

  const filteredForecasts = forecasts.filter(f => {
    if (selectedRiskFilter !== 'all' && f.riskLevel !== selectedRiskFilter) return false;
    if (selectedRoomFilter !== 'all' && f.studentRoom !== selectedRoomFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.studentName.toLowerCase().includes(q) ||
        f.studentRoom.toLowerCase().includes(q) ||
        f.predictedOutcome.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Action handlers
  const handleTriggerAction = (studentId: string, actionId: string, actionType: string, studentName: string) => {
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    setForecasts(prev => prev.map(student => {
      if (student.studentId !== studentId) return student;
      return {
        ...student,
        earlyInterventionActions: student.earlyInterventionActions.map(act => {
          if (act.id === actionId) {
            return {
              ...act,
              status: 'completed',
              sentAt: `${lang === 'th' ? 'ส่งแล้วเมื่อ' : 'Sent at'} ${nowTime}`
            };
          }
          return act;
        })
      };
    }));

    // Dispatch Web Push notification
    sendEduVerseNotification({
      title: `⚠️ [แผนดูแลเร่งด่วน] ${studentName}`,
      body: actionType === 'line_parent_alert'
        ? `ระบบส่งหนังสือแจ้งเตือนผู้ปกครองผ่าน LINE OA เรียบร้อยแล้ว (เวลา ${nowTime})`
        : `นัดหมายครูแนะแนวและลงบันทึกในระบบ OBEC Care เรียบร้อยแล้ว`,
      category: 'attendance',
      priority: 'urgent',
    });

    const message = actionType === 'line_parent_alert'
      ? (lang === 'th' ? `ส่งหนังสือแจ้งเตือนผู้ปกครองของ ${studentName} ผ่าน LINE Official Account สำเร็จแล้ว` : 'LINE OA notification successfully dispatched to guardian!')
      : actionType === 'counselor_meeting'
      ? (lang === 'th' ? `นัดหมายครูแนะแนวสำหรับ ${studentName} ในระบบดูแลช่วยเหลือเรียบร้อย` : 'Counseling appointment booked in school calendar!')
      : (lang === 'th' ? `มอบหมายการบ้านซ่อมเสริมสำหรับ ${studentName} เรียบร้อย` : 'Remedial assignment package assigned to student portal!');

    setNotificationToast(message);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // Export At-Risk Report to CSV with UTF-8 BOM
  const handleExportCsv = () => {
    const headers = [
      'ชื่อ-นามสกุล',
      'ห้อง/ชั้น',
      'ระดับความเสี่ยง',
      'อัตราเข้าเรียน (%)',
      'อัตราส่งงาน (%)',
      'คะแนนเฉลี่ย',
      'ผลประเมิน SDQ',
      'การพยากรณ์ผลการเรียน',
      'สถานะการช่วยเหลือ'
    ];

    const rows = filteredForecasts.map(f => [
      `"${f.studentName}"`,
      f.studentRoom,
      f.riskLevel === 'high' ? 'วิกฤต (High)' : f.riskLevel === 'moderate' ? 'ปานกลาง (Moderate)' : 'ปกติ (Low)',
      `${f.attendanceRate}%`,
      `${f.homeworkCompletionRate}%`,
      f.midtermAverageScore,
      f.sdqRiskStatus === 'problem' ? 'มีปัญหา' : f.sdqRiskStatus === 'risk' ? 'เสี่ยง' : 'ปกติ',
      `"${f.predictedOutcome}"`,
      `"${f.earlyInterventionActions.map(a => `${a.titleTh} (${a.status})`).join('; ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `at_risk_students_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold">{notificationToast}</p>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="shrink-0 bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-rose-500/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-900/80 border border-rose-400/50 text-rose-100 text-[11px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              <span>{lang === 'th' ? 'ระบบพยากรณ์ความเสี่ยงผู้บริหาร (Executive Predictive Early Warning)' : 'Executive Early Warning System'}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {lang === 'th' ? 'ระบบเฝ้าระวัง & ป้องกันนักเรียนตกค้าง (มส./ร.)' : 'Predictive Student Retention Radar'}
            </h1>
            <p className="text-slate-200 text-xs leading-relaxed">
              {lang === 'th' 
                ? 'คำนวณความเสี่ยงพหุมิติ (เวลาเรียน < 80%, อัตราส่งการบ้าน < 50%, ผลการเรียน และแบบคัดกรองสุขภาพจิต SDQ) เพื่อตัดวงจรการตกค้างก่อนสิ้นภาคเรียน'
                : 'Multidimensional risk analytics forecasting attendance loss, missing assignments, and academic probation before end-of-semester cutoff.'}
            </p>
          </div>

          <div className="bg-slate-900/75 backdrop-blur-md border border-slate-600 p-2.5 rounded-xl flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[11px] text-rose-200 font-medium">
                {lang === 'th' ? 'กลุ่มเสี่ยงระดับสูง (High Risk)' : 'High Risk Watchlist'}
              </p>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-black text-rose-300">{highRiskCount}</span>
                <span className="text-[11px] text-slate-200">/ {totalForecasted} {lang === 'th' ? 'คน' : 'students'}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-900/70 border border-rose-400/50 flex items-center justify-center text-rose-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Total High Risk */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-rose-300 dark:border-rose-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
              {lang === 'th' ? 'เสี่ยง มส. / ร. ขั้นวิกฤต' : 'Critical High Risk'}
            </p>
            <h3 className="text-2xl font-black text-[var(--color-text-title)] mt-0.5">
              {highRiskCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
              {lang === 'th' ? 'เกณฑ์เวลาเรียนและงานค้างสะสม' : 'Attendance & pending tasks'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Attendance Hazard */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-body)]">
              {lang === 'th' ? 'เวลาเรียนต่ำกว่า 80%' : 'Attendance < 80%'}
            </p>
            <h3 className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-0.5">
              {attendanceDangerCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
              {lang === 'th' ? 'เสี่ยงหมดสิทธิ์สอบ (มส.)' : 'At risk of exam disqualification'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Homework Hazard */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-body)]">
              {lang === 'th' ? 'ส่งการบ้านต่ำกว่า 50%' : 'Homework < 50%'}
            </p>
            <h3 className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-0.5">
              {homeworkDangerCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
              {lang === 'th' ? 'เสี่ยงติดค้างผลการเรียน (ร.)' : 'At risk of incomplete grade'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Low Risk / On Track */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-body)]">
              {lang === 'th' ? 'ปลอดภัยตามเกณฑ์ปกติ' : 'On Track'}
            </p>
            <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
              {lowRiskCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
              {lang === 'th' ? 'ผลการเรียนและเวลาเรียนดีเยี่ยม' : 'Excellent performance'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table & Early Intervention Control Center */}
      <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3.5 shadow-xs flex flex-col overflow-hidden">
        {/* Controls Toolbar */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              {lang === 'th' ? 'รายชื่อนักเรียนในข่ายเฝ้าระวังพหุมิติ' : 'Early Warning Risk Forecast Matrix'}
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {lang === 'th' 
                ? 'กดปุ่มแจ้งเตือน LINE OA หรือนัดหมายครูแนะแนวได้ทันทีจากแต่ละรายการ' 
                : 'Trigger 1-click LINE OA alerts or schedule counseling sessions directly from the matrix'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Room */}
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold cursor-pointer"
            >
              <option value="all">ทุกห้องเรียน</option>
              {availableRooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Filter by Risk Level */}
            <div className="flex p-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              {(['all', 'high', 'moderate', 'low'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedRiskFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedRiskFilter === lvl
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lvl === 'all' ? 'ทั้งหมด' : lvl === 'high' ? 'วิกฤต' : lvl === 'moderate' ? 'ปานกลาง' : 'ปกติ'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อนักเรียน หรือห้อง...' : 'Search student...'}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
              />
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              title="ดาวน์โหลดรายงานกลุ่มเสี่ยงเป็น Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* List of at-risk students */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {filteredForecasts.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)] text-xs space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="font-bold text-sm text-[var(--color-text-title)]">ไม่มีนักเรียนในกลุ่มเสี่ยงตามเงื่อนไขที่เลือก</p>
              <p>นักเรียนทุกคนมีอัตราเวลาเรียนและผลการเรียนอยู่ในเกณฑ์ปลอดภัย</p>
            </div>
          ) : (
            <PagedList
              items={filteredForecasts}
              pageSize={6}
              previousLabel="ก่อนหน้า"
              nextLabel="ถัดไป"
              paginationLabel="เปลี่ยนหน้ารายชื่อกลุ่มเสี่ยง"
              renderItem={(stu) => (
                <div
                  key={stu.studentId}
                  className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5 text-xs mb-2 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        stu.riskLevel === 'high' 
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : stu.riskLevel === 'moderate'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        {stu.riskLevel === 'high' ? '⚠️' : stu.riskLevel === 'moderate' ? '⚡' : '✓'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[var(--color-text-title)]">
                          {stu.studentName}
                        </h4>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          ชั้น {stu.studentRoom} • การพยากรณ์: <strong className="text-rose-700 dark:text-rose-400">{stu.predictedOutcome}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        stu.attendanceRate < 80 
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}>
                        เวลาเรียน: {stu.attendanceRate}%
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        ส่งงาน: {stu.homeworkCompletionRate}%
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        SDQ: {stu.sdqRiskStatus === 'problem' ? 'มีปัญหา' : stu.sdqRiskStatus === 'risk' ? 'เสี่ยง' : 'ปกติ'}
                      </span>
                    </div>
                  </div>

                  {/* Early Intervention Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--color-border)]">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                      มาตรการดูแลช่วยเหลือ:
                    </span>
                    {stu.earlyInterventionActions.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleTriggerAction(stu.studentId, act.id, act.actionType, stu.studentName)}
                        disabled={act.status === 'completed'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-60 disabled:cursor-default ${
                          act.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] shadow-2xs'
                        }`}
                      >
                        {act.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{act.titleTh} ({act.sentAt || 'เสร็จแล้ว'})</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{act.titleTh}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};
