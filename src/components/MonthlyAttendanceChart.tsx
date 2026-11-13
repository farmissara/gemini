import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ReferenceLine,
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  HelpCircle,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AttendanceRecord, Student, AppLanguage } from '../types';
import { getLocalDateString } from '../lib/date';

interface MonthlyAttendanceChartProps {
  attendance: AttendanceRecord[];
  students: Student[];
  lang?: AppLanguage;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
}

type ChartDisplayType = 'composed' | 'stacked_bar' | 'rate_area';
type DayFilterType = 'all_month' | 'month_to_date' | 'weekdays_only';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const ENG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const ENG_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthlyAttendanceChart: React.FC<MonthlyAttendanceChartProps> = ({
  attendance,
  students,
  lang = 'th',
  selectedDate,
  onSelectDate,
}) => {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Allow browsing previous/next months or defaulting to current month
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [chartType, setChartType] = useState<ChartDisplayType>('composed');
  const [dayFilter, setDayFilter] = useState<DayFilterType>('month_to_date');

  // Filter student-only attendance
  const studentAttendance = useMemo(() => {
    return attendance.filter((rec) => {
      // Exclude teachers and check_out records to measure true daily check-in attendance
      return rec.userType !== 'teacher' && rec.recordType !== 'check_out';
    });
  }, [attendance]);

  // Compute total active students as benchmark
  const totalRosterCount = useMemo(() => {
    const active = students.filter((s) => s.status === 'active').length;
    return active > 0 ? active : students.length;
  }, [students]);

  // Generate daily points for the target month
  const { chartData, stats } = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const isCurrentMonth =
      today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
    const currentDayOfMonth = today.getDate();

    // Map existing attendance by date (YYYY-MM-DD)
    const recordsByDate = new Map<string, AttendanceRecord[]>();
    for (const rec of studentAttendance) {
      if (!rec.date) continue;
      const list = recordsByDate.get(rec.date) || [];
      list.push(rec);
      recordsByDate.set(rec.date, list);
    }

    const data: Array<{
      date: string;
      dayNumber: number;
      dayLabel: string;
      fullDateLabel: string;
      isWeekend: boolean;
      isToday: boolean;
      isFuture: boolean;
      present: number;
      late: number;
      leave: number;
      absent: number;
      totalAttended: number;
      attendanceRate: number;
      onTimeRate: number;
    }> = [];

    let totalMonthPresent = 0;
    let totalMonthLate = 0;
    let totalMonthLeave = 0;
    let totalMonthAbsent = 0;
    let daysWithRecords = 0;
    let peakDay = { day: 1, count: 0, date: '' };
    let lowestDay = { day: 1, count: 999999, date: '' };
    let rateSum = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = isCurrentMonth && day === currentDayOfMonth;
      const isFuture = isCurrentMonth && day > currentDayOfMonth;

      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecs = recordsByDate.get(dateStr) || [];

      // Deduplicate by studentId to count unique students
      const uniqueStudentStatus = new Map<string, string>();
      for (const r of dayRecs) {
        if (!uniqueStudentStatus.has(r.studentId)) {
          uniqueStudentStatus.set(r.studentId, r.status);
        } else if (r.status === 'present') {
          uniqueStudentStatus.set(r.studentId, 'present');
        }
      }

      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;

      for (const status of uniqueStudentStatus.values()) {
        if (status === 'present') present++;
        else if (status === 'late') late++;
        else if (status === 'leave') leave++;
        else if (status === 'absent') absent++;
      }

      const totalAttended = present + late;
      const totalCounted = present + late + leave + absent;

      // Calculate attendance rate percentage
      const benchmark = totalRosterCount > 0 ? totalRosterCount : totalCounted;
      const attendanceRate = benchmark > 0 ? Math.round((totalAttended / benchmark) * 100) : 0;
      const onTimeRate = totalAttended > 0 ? Math.round((present / totalAttended) * 100) : 0;

      if (totalCounted > 0 && !isFuture) {
        daysWithRecords++;
        totalMonthPresent += present;
        totalMonthLate += late;
        totalMonthLeave += leave;
        totalMonthAbsent += absent;
        rateSum += attendanceRate;

        if (totalAttended > peakDay.count) {
          peakDay = { day, count: totalAttended, date: dateStr };
        }
        if (totalAttended < lowestDay.count) {
          lowestDay = { day, count: totalAttended, date: dateStr };
        }
      }

      const dayName = lang === 'th' ? THAI_DAYS_SHORT[dayOfWeek] : ENG_DAYS_SHORT[dayOfWeek];
      const dayLabel = `${day} ${dayName}`;
      const monthName = lang === 'th' ? THAI_MONTHS[selectedMonth] : ENG_MONTHS[selectedMonth];
      const yearDisplay = lang === 'th' ? selectedYear + 543 : selectedYear;
      const fullDateLabel = `${day} ${monthName} ${yearDisplay}`;

      // Filter by selection
      if (dayFilter === 'weekdays_only' && isWeekend) {
        continue;
      }
      if (dayFilter === 'month_to_date' && isFuture) {
        continue;
      }

      data.push({
        date: dateStr,
        dayNumber: day,
        dayLabel,
        fullDateLabel,
        isWeekend,
        isToday,
        isFuture,
        present,
        late,
        leave,
        absent,
        totalAttended,
        attendanceRate,
        onTimeRate,
      });
    }

    const avgRate = daysWithRecords > 0 ? Math.round(rateSum / daysWithRecords) : 0;

    return {
      chartData: data,
      stats: {
        totalMonthPresent,
        totalMonthLate,
        totalMonthLeave,
        totalMonthAbsent,
        daysWithRecords,
        avgRate,
        peakDay: peakDay.count > 0 ? peakDay : null,
      },
    };
  }, [selectedYear, selectedMonth, studentAttendance, totalRosterCount, dayFilter, lang, today]);

  const monthLabel = useMemo(() => {
    const mName = lang === 'th' ? THAI_MONTHS[selectedMonth] : ENG_MONTHS[selectedMonth];
    const yDisplay = lang === 'th' ? selectedYear + 543 : selectedYear;
    return `${mName} ${yDisplay}`;
  }, [selectedMonth, selectedYear, lang]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  const isCurrentMonthViewing =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  return (
    <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary-text)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th'
                  ? 'แนวโน้มการเข้าเรียนรายวันของนักเรียน'
                  : 'Daily Student Attendance Trends'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
                {monthLabel}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? 'ติดตามสถิติการมาเรียน ตรงเวลา มาสาย และอัตราการเข้าเรียนสะสมตลอดทั้งเดือน'
                : 'Monitor daily on-time, late, and overall attendance rates across the month.'}
            </p>
          </div>
        </div>

        {/* Month Navigator & Chart Type Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Month Switcher */}
          <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              title={lang === 'th' ? 'เดือนก่อนหน้า' : 'Previous Month'}
              className="p-1.5 rounded-lg text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)] transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetToCurrentMonth}
              disabled={isCurrentMonthViewing}
              className={`px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                isCurrentMonthViewing
                  ? 'text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {isCurrentMonthViewing ? (lang === 'th' ? 'เดือนนี้' : 'Current') : (lang === 'th' ? 'กลับเดือนนี้' : 'Today')}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title={lang === 'th' ? 'เดือนถัดไป' : 'Next Month'}
              className="p-1.5 rounded-lg text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)] transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Filter */}
          <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDayFilter('month_to_date')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                dayFilter === 'month_to_date'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'ถึงวันนี้' : 'To Date'}
            </button>
            <button
              type="button"
              onClick={() => setDayFilter('all_month')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                dayFilter === 'all_month'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'ทั้งเดือน' : 'All Days'}
            </button>
            <button
              type="button"
              onClick={() => setDayFilter('weekdays_only')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                dayFilter === 'weekdays_only'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'เฉพาะวันเรียน' : 'Weekdays'}
            </button>
          </div>

          {/* Chart Display Mode */}
          <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setChartType('composed')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer font-bold ${
                chartType === 'composed'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title={lang === 'th' ? 'กราฟแท่งผสมเส้นอัตราเข้าเรียน' : 'Composed Bar + Line'}
            >
              {lang === 'th' ? 'ผสม' : 'Combo'}
            </button>
            <button
              type="button"
              onClick={() => setChartType('stacked_bar')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer font-bold ${
                chartType === 'stacked_bar'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title={lang === 'th' ? 'กราฟแท่งแยกสถานะ' : 'Stacked Bars'}
            >
              {lang === 'th' ? 'แท่ง' : 'Bar'}
            </button>
            <button
              type="button"
              onClick={() => setChartType('rate_area')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer font-bold ${
                chartType === 'rate_area'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
              title={lang === 'th' ? 'พื้นที่อัตราเข้าเรียน (%)' : 'Rate Area'}
            >
              {lang === 'th' ? 'อัตรา (%)' : 'Rate'}
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Metric 1: Average Rate */}
        <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
          <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
            {lang === 'th' ? 'อัตราเข้าเรียนเฉลี่ย' : 'Avg. Attendance Rate'}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-blue-700 dark:text-blue-300">
              {stats.avgRate}%
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
              ({stats.daysWithRecords} {lang === 'th' ? 'วันที่มีบันทึก' : 'days recorded'})
            </span>
          </div>
        </div>

        {/* Metric 2: Present Count */}
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {lang === 'th' ? 'ตรงเวลาสะสม' : 'Total On-Time'}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-100">
              {stats.totalMonthPresent.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
              {lang === 'th' ? 'ครั้ง' : 'times'}
            </span>
          </div>
        </div>

        {/* Metric 3: Late Count */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {lang === 'th' ? 'มาสายสะสม' : 'Total Late'}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-amber-900 dark:text-amber-100">
              {stats.totalMonthLate.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-300">
              {lang === 'th' ? 'ครั้ง' : 'times'}
            </span>
          </div>
        </div>

        {/* Metric 4: Leave Count */}
        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
          <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            {lang === 'th' ? 'การลาสะสม' : 'Total Leaves'}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-purple-900 dark:text-purple-100">
              {stats.totalMonthLeave.toLocaleString()}
            </span>
            <span className="text-[10px] text-purple-700 dark:text-purple-300">
              {lang === 'th' ? 'ครั้ง' : 'times'}
            </span>
          </div>
        </div>

        {/* Metric 5: Peak Day */}
        <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
            {lang === 'th' ? 'วันที่เข้าเรียนสูงสุด' : 'Peak Attendance Day'}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            {stats.peakDay ? (
              <>
                <span className="text-base font-black text-[var(--color-text-title)]">
                  {lang === 'th' ? `วันที่ ${stats.peakDay.day}` : `Day ${stats.peakDay.day}`}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                  ({stats.peakDay.count} {lang === 'th' ? 'คน' : 'students'})
                </span>
              </>
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="w-full h-72 sm:h-80 pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--color-text-muted)]">
            <Calendar className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-semibold">
              {lang === 'th' ? 'ไม่พบข้อมูลการเช็คชื่อในตัวกรองนี้' : 'No attendance data for this filter'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'rate_area' ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const d = e.activePayload[0].payload.date;
                    if (d && onSelectDate) onSelectDate(d);
                  }
                }}
              >
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="dayNumber"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}`}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip lang={lang} onSelectDate={onSelectDate} />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                />
                {selectedDate && (
                  <ReferenceLine
                    x={Number(selectedDate.split('-')[2])}
                    stroke="#1d4ed8"
                    strokeDasharray="4 4"
                    label={{
                      value: lang === 'th' ? 'วันที่เลือก' : 'Selected',
                      fill: '#1d4ed8',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="attendanceRate"
                  name={lang === 'th' ? 'อัตราเข้าเรียนรวม (%)' : 'Attendance Rate (%)'}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#rateGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="onTimeRate"
                  name={lang === 'th' ? 'อัตราตรงเวลา (%)' : 'On-Time Rate (%)'}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </ComposedChart>
            ) : chartType === 'stacked_bar' ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const d = e.activePayload[0].payload.date;
                    if (d && onSelectDate) onSelectDate(d);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="dayNumber"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}`}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip lang={lang} onSelectDate={onSelectDate} />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                />
                <Bar
                  dataKey="present"
                  name={lang === 'th' ? 'ตรงเวลา' : 'Present'}
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="late"
                  name={lang === 'th' ? 'มาสาย' : 'Late'}
                  stackId="a"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="leave"
                  name={lang === 'th' ? 'ลา' : 'Leave'}
                  stackId="a"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            ) : (
              /* Composed Combo Mode (Default): Stacked Bars (Students) + Line (Attendance Rate %) */
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const d = e.activePayload[0].payload.date;
                    if (d && onSelectDate) onSelectDate(d);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="dayNumber"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}`}
                />
                {/* Left Y-Axis: Student Count */}
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                {/* Right Y-Axis: Rate % */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#2563eb' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip lang={lang} onSelectDate={onSelectDate} />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                />
                {selectedDate && (
                  <ReferenceLine
                    yAxisId="left"
                    x={Number(selectedDate.split('-')[2])}
                    stroke="#1d4ed8"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  />
                )}
                <Bar
                  yAxisId="left"
                  dataKey="present"
                  name={lang === 'th' ? 'ตรงเวลา' : 'Present'}
                  stackId="att"
                  fill="#10b981"
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="late"
                  name={lang === 'th' ? 'มาสาย' : 'Late'}
                  stackId="att"
                  fill="#f59e0b"
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="leave"
                  name={lang === 'th' ? 'ลา' : 'Leave'}
                  stackId="att"
                  fill="#8b5cf6"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="attendanceRate"
                  name={lang === 'th' ? 'อัตราเข้าเรียน (%)' : 'Attendance Rate (%)'}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#2563eb', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer with Interactive Quick Tip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-semibold text-[var(--color-text-body)]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] inline-block" />
            {lang === 'th' ? 'ตรงเวลา' : 'Present'}
          </span>
          <span className="flex items-center gap-1 font-semibold text-[var(--color-text-body)]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block" />
            {lang === 'th' ? 'มาสาย' : 'Late'}
          </span>
          <span className="flex items-center gap-1 font-semibold text-[var(--color-text-body)]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#8b5cf6] inline-block" />
            {lang === 'th' ? 'การลา' : 'Leave'}
          </span>
          <span className="flex items-center gap-1 font-semibold text-[var(--color-text-body)]">
            <span className="w-3 h-1 bg-[#2563eb] inline-block rounded-full" />
            {lang === 'th' ? 'อัตราการเข้าเรียน (%)' : 'Attendance Rate (%)'}
          </span>
        </div>
        <p className="italic text-[10px]">
          {lang === 'th'
            ? '* คลิกที่แท่งกราฟประจำวันเพื่อเลือกและดูรายละเอียดการเช็คชื่อของวันนั้น'
            : '* Click on any day bar to inspect detailed records for that date'}
        </p>
      </div>
    </div>
  );
};

// Custom Tooltip component
const CustomTooltip = ({ active, payload, lang = 'th', onSelectDate }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isPresentZero = data.present === 0 && data.late === 0 && data.leave === 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-lg text-xs space-y-2 min-w-48">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-1.5">
        <div>
          <p className="font-bold text-[var(--color-text-title)]">{data.fullDateLabel}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{data.date}</p>
        </div>
        {data.isToday && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            {lang === 'th' ? 'วันนี้' : 'Today'}
          </span>
        )}
      </div>

      {isPresentZero ? (
        <p className="text-[11px] text-[var(--color-text-muted)] italic">
          {data.isWeekend
            ? lang === 'th'
              ? 'วันหยุดสุดสัปดาห์ (ไม่มีคาบเรียน)'
              : 'Weekend (No scheduled classes)'
            : data.isFuture
              ? lang === 'th'
                ? 'ยังไม่ถึงวันดังกล่าว'
                : 'Upcoming day'
              : lang === 'th'
                ? 'ยังไม่มีบันทึกการเช็คชื่อ'
                : 'No attendance records yet'}
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{lang === 'th' ? 'ตรงเวลา:' : 'Present:'}</span>
            </span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {data.present} {lang === 'th' ? 'คน' : 'students'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>{lang === 'th' ? 'มาสาย:' : 'Late:'}</span>
            </span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {data.late} {lang === 'th' ? 'คน' : 'students'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              <span>{lang === 'th' ? 'การลา:' : 'Leave:'}</span>
            </span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {data.leave} {lang === 'th' ? 'คน' : 'students'}
            </span>
          </div>

          <div className="pt-1.5 border-t border-[var(--color-border)] flex items-center justify-between font-bold">
            <span className="text-[var(--color-text-muted)]">
              {lang === 'th' ? 'อัตราเข้าเรียนรวม:' : 'Attendance Rate:'}
            </span>
            <span className="text-blue-700 dark:text-blue-300 font-mono text-sm">
              {data.attendanceRate}%
            </span>
          </div>

          {data.totalAttended > 0 && (
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>{lang === 'th' ? 'สัดส่วนตรงเวลา:' : 'Punctuality:'}</span>
              <span className="font-mono">{data.onTimeRate}%</span>
            </div>
          )}
        </div>
      )}

      {onSelectDate && (
        <button
          type="button"
          onClick={() => onSelectDate(data.date)}
          className="w-full text-center py-1 mt-1 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px] font-bold hover:underline cursor-pointer"
        >
          {lang === 'th' ? 'เลือกดูรายการของวันนี้' : 'Select this date'}
        </button>
      )}
    </div>
  );
};
