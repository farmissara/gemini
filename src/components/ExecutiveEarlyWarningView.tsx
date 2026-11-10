import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { AtRiskStudentForecast, AppLanguage, UserRole } from '../types';
import { INITIAL_AT_RISK_FORECASTS } from '../data/innovativeFeaturesData';
import { PagedList } from './PagedList';

interface ExecutiveEarlyWarningViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
}

export const ExecutiveEarlyWarningView: React.FC<ExecutiveEarlyWarningViewProps> = ({
  lang = 'th',
  currentRole = 'super_admin',
  currentUserName = 'ผู้อำนวยการสถานศึกษา'
}) => {
  const [forecasts, setForecasts] = useState<AtRiskStudentForecast[]>(INITIAL_AT_RISK_FORECASTS);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<AtRiskStudentForecast | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // KPI Calculations
  const totalForecasted = forecasts.length;
  const highRiskCount = forecasts.filter(f => f.riskLevel === 'high').length;
  const moderateRiskCount = forecasts.filter(f => f.riskLevel === 'moderate').length;
  const lowRiskCount = forecasts.filter(f => f.riskLevel === 'low').length;
  const attendanceDangerCount = forecasts.filter(f => f.attendanceRate < 80).length;
  const homeworkDangerCount = forecasts.filter(f => f.homeworkCompletionRate < 50).length;

  const filteredForecasts = forecasts.filter(f => {
    if (selectedRiskFilter !== 'all' && f.riskLevel !== selectedRiskFilter) return false;
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
  const handleTriggerAction = (studentId: string, actionId: string, actionType: string) => {
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

    const message = actionType === 'line_parent_alert'
      ? (lang === 'th' ? 'ส่งหนังสือแจ้งเตือนผู้ปกครองผ่าน LINE Official Account สำเร็จแล้ว' : 'LINE OA notification successfully dispatched to guardian!')
      : actionType === 'counselor_meeting'
      ? (lang === 'th' ? 'นัดหมายครูแนะแนวและลงบันทึกในปฏิทินโรงเรียนเรียบร้อย' : 'Counseling appointment booked in school calendar!')
      : (lang === 'th' ? 'มอบหมายการบ้านซ่อมเสริมแบบเร่งด่วนเข้าระบบนักเรียนแล้ว' : 'Remedial assignment package assigned to student portal!');

    setNotificationToast(message);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  const handleQuickAddAction = (studentId: string, type: 'line_parent_alert' | 'counselor_meeting' | 'remedial_task') => {
    const newActId = `act-${Date.now()}`;
    const titles = {
      line_parent_alert: lang === 'th' ? 'ส่งแจ้งเตือนพิเศษผ่าน LINE OA ผู้ปกครอง' : 'Send special LINE OA guardian alert',
      counselor_meeting: lang === 'th' ? 'นัดพบครูแนะแนวรายบุคคลด่วน' : 'Urgent individual counseling session',
      remedial_task: lang === 'th' ? 'เปิดแบบฝึกหัดซ่อมเสริมเก็บคะแนน' : 'Assign remedial recovery task'
    };

    setForecasts(prev => prev.map(student => {
      if (student.studentId !== studentId) return student;
      return {
        ...student,
        earlyInterventionActions: [
          ...student.earlyInterventionActions,
          {
            id: newActId,
            actionType: type,
            titleTh: titles[type],
            status: 'pending'
          }
        ]
      };
    }));
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 flex items-center gap-2">
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
                ? 'คำนวณความเสี่ยงพหุมิติ (เวลาเรียน < 80%, อัตราส่งการบ้าน < 50%, คะแนนกลางภาค และแบบประเมิน SDQ) เพื่อแจ้งเตือนผู้บริหารและครูประจำชั้น'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total High Risk */}
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-rose-300 dark:border-rose-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
              {lang === 'th' ? 'เสี่ยง มส. / ร. ขั้นวิกฤต' : 'Critical High Risk'}
            </p>
            <h3 className="text-2xl font-black text-[var(--color-text-title)] mt-1">
              {highRiskCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-1 font-semibold">
              {lang === 'th' ? 'เกณฑ์เวลาเรียนและงานค้างสะสม' : 'Attendance & pending tasks'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Attendance Hazard */}
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-body)]">
              {lang === 'th' ? 'เวลาเรียนต่ำกว่า 80%' : 'Attendance < 80%'}
            </p>
            <h3 className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">
              {attendanceDangerCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium">
              {lang === 'th' ? 'เสี่ยงหมดสิทธิ์สอบ (มส.)' : 'At risk of exam disqualification'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Homework Hazard */}
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-body)]">
              {lang === 'th' ? 'ส่งการบ้านต่ำกว่า 50%' : 'Homework < 50%'}
            </p>
            <h3 className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-1">
              {homeworkDangerCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium">
              {lang === 'th' ? 'เสี่ยงติดค้างผลการเรียน (ร.)' : 'At risk of incomplete grade'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Low Risk / On Track */}
        <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-body)]">
              {lang === 'th' ? 'ปลอดภัยตามเกณฑ์ปกติ' : 'On Track'}
            </p>
            <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
              {lowRiskCount} <span className="text-xs font-medium text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'students'}</span>
            </h3>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 font-semibold">
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
                ? 'กดปุ่มแจ้งเตือน LINE หรือนัดหมายครูแนะแนวได้ทันทีจากแต่ละรายการ' 
                : 'Trigger 1-click LINE OA alerts or schedule counseling sessions directly from the matrix'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อนักเรียน หรือห้อง...' : 'Search student or room...'}
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-rose-500 w-44 sm:w-56"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedRiskFilter === 'all'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                    : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {lang === 'th' ? 'ทั้งหมด' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('high')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedRiskFilter === 'high'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950'
                }`}
              >
                {lang === 'th' ? 'วิกฤต' : 'High'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('moderate')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedRiskFilter === 'moderate'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950'
                }`}
              >
                {lang === 'th' ? 'ปานกลาง' : 'Mod'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRiskFilter('low')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedRiskFilter === 'low'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                }`}
              >
                {lang === 'th' ? 'ปกติ' : 'Low'}
              </button>
            </div>
          </div>
        </div>

        {/* Student Risk Cards / Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 mt-2.5">
          <PagedList items={filteredForecasts} pageSize={1} renderItem={(forecast) => {
            const isHigh = forecast.riskLevel === 'high';
            const isMod = forecast.riskLevel === 'moderate';

            return (
              <div 
                key={forecast.studentId}
                className={`p-5 rounded-2xl border transition-all ${
                  isHigh 
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700'
                    : isMod
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700'
                    : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Student Details & Predicted Flag */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                        isHigh 
                          ? 'bg-rose-700 text-white' 
                          : isMod 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-emerald-700 text-white'
                      }`}>
                        {forecast.riskLevel} Risk
                      </span>

                      <span className="text-xs font-bold text-[var(--color-text-body)]">
                        {forecast.studentRoom}
                      </span>

                      <span className="text-xs font-black text-rose-800 dark:text-rose-300">
                        • {forecast.predictedOutcome}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-[var(--color-text-title)] pt-1">
                      {forecast.studentName}
                    </h3>
                  </div>

                  {/* 4 Quantitative Risk Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)]">
                    {/* Attendance */}
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
                        {lang === 'th' ? 'เวลาเรียน' : 'Attendance'}
                      </span>
                      <span className={`text-base font-black ${forecast.attendanceRate < 80 ? 'text-rose-700 dark:text-rose-300' : 'text-[var(--color-text-title)]'}`}>
                        {forecast.attendanceRate}%
                      </span>
                    </div>

                    {/* Homework */}
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
                        {lang === 'th' ? 'ส่งการบ้าน' : 'Homework'}
                      </span>
                      <span className={`text-base font-black ${forecast.homeworkCompletionRate < 50 ? 'text-rose-700 dark:text-rose-300' : 'text-[var(--color-text-title)]'}`}>
                        {forecast.homeworkCompletionRate}%
                      </span>
                    </div>

                    {/* Midterm */}
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
                        {lang === 'th' ? 'กลางภาค' : 'Midterm'}
                      </span>
                      <span className={`text-base font-black ${forecast.midtermAverageScore < 50 ? 'text-amber-800 dark:text-amber-300' : 'text-[var(--color-text-title)]'}`}>
                        {forecast.midtermAverageScore}
                      </span>
                    </div>

                    {/* SDQ status */}
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">
                        SDQ
                      </span>
                      <span className={`text-xs font-black uppercase inline-block mt-0.5 ${forecast.sdqRiskStatus === 'problem' ? 'text-rose-700 dark:text-rose-300' : forecast.sdqRiskStatus === 'risk' ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                        {forecast.sdqRiskStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1-Click Early Intervention Action Strip */}
                {forecast.earlyInterventionActions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-300" />
                      <span>{lang === 'th' ? 'แผนการช่วยเหลือเร่งด่วน (Early Interventions):' : 'Active Intervention Plans:'}</span>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <PagedList items={forecast.earlyInterventionActions} pageSize={2} renderItem={(act) => {
                        const isCompleted = act.status === 'completed';
                        return (
                          <div 
                            key={act.id}
                            className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <p className="font-semibold text-[var(--color-text-title)] truncate">
                                {act.titleTh}
                              </p>
                              {act.sentAt && (
                                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">
                                  {act.sentAt}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={isCompleted}
                              onClick={() => handleTriggerAction(forecast.studentId, act.id, act.actionType)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                                isCompleted
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 cursor-default'
                                  : act.actionType === 'line_parent_alert'
                                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer'
                                  : 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs cursor-pointer'
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                                  <span>{lang === 'th' ? 'ดำเนินการแล้ว' : 'Completed'}</span>
                                </>
                              ) : act.actionType === 'line_parent_alert' ? (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>{lang === 'th' ? 'ส่ง LINE ด่วน' : 'Send LINE'}</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>{lang === 'th' ? 'นัดหมายทันที' : 'Schedule'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }} />
                    </div>
                  </div>
                )}

                {/* Quick Add Custom Action Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)] text-[11px]">
                  <span className="text-[var(--color-text-muted)] font-medium">
                    {lang === 'th' ? 'เพิ่มการช่วยเหลือ:' : 'Add action:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAddAction(forecast.studentId, 'line_parent_alert')}
                    className="px-2.5 py-1 rounded bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold cursor-pointer"
                  >
                    + {lang === 'th' ? 'เตือน LINE' : 'LINE Alert'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddAction(forecast.studentId, 'counselor_meeting')}
                    className="px-2.5 py-1 rounded bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold cursor-pointer"
                  >
                    + {lang === 'th' ? 'นัดแนะแนว' : 'Counseling'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddAction(forecast.studentId, 'remedial_task')}
                    className="px-2.5 py-1 rounded bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold cursor-pointer"
                  >
                    + {lang === 'th' ? 'งานซ่อมเสริม' : 'Remedial'}
                  </button>
                </div>
              </div>
            );
          }} />
        </div>
      </div>
    </div>
  );
};
