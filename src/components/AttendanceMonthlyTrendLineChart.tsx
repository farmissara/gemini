import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { AppLanguage, AttendanceRecord, Student } from '../types';

interface AttendanceMonthlyTrendLineChartProps {
  attendance: AttendanceRecord[];
  students: Student[];
  lang?: AppLanguage;
  selectedRoom?: string;
}

type TrendGranularity = 'monthly_term' | 'monthly_all_year';

interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  fullMonthLabel: string;
  present: number;
  late: number;
  leaveOrSick: number;
  absent: number;
  totalAttended: number;
  totalRecords: number;
  uniqueStudentsAttended: number;
  attendanceRate: number;
  onTimeRate: number;
  lateRate: number;
  hasData: boolean;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const ENG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ENG_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonthLabels(year: number, monthIndex: number, lang: AppLanguage) {
  const shortMonth = lang === 'th' ? THAI_MONTHS_SHORT[monthIndex] : ENG_MONTHS_SHORT[monthIndex];
  const fullMonth = lang === 'th' ? THAI_MONTHS_FULL[monthIndex] : ENG_MONTHS_FULL[monthIndex];
  const displayYear = lang === 'th' ? year + 543 : year;
  const shortYear = String(displayYear).slice(-2);
  return {
    short: `${shortMonth} ${shortYear}`,
    full: `${fullMonth} ${displayYear}`,
  };
}

/**
 * Generates ordered YYYY-MM keys covering the academic term (May–Apr of Thai academic year, or rolling 6–12 months + any months present in data).
 */
function buildAcademicMonthKeys(
  recordMonthKeys: string[],
  mode: TrendGranularity
): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Thai academic year starts in May (month 5): if Jan-Apr, academic year started previous calendar year
  const acadStartYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  const keys = new Set<string>();

  if (mode === 'monthly_term') {
    // Active Thai semester window: Term 1 (May-Oct) or Term 2 (Nov-Mar/Apr)
    if (currentMonth >= 5 && currentMonth <= 10) {
      for (let m = 5; m <= 10; m += 1) {
        keys.add(`${acadStartYear}-${String(m).padStart(2, '0')}`);
      }
    } else {
      keys.add(`${acadStartYear}-11`);
      keys.add(`${acadStartYear}-12`);
      for (let m = 1; m <= 3; m += 1) {
        keys.add(`${acadStartYear + 1}-${String(m).padStart(2, '0')}`);
      }
    }
  } else {
    // Full Academic Year (12 months May -> Apr)
    for (let m = 5; m <= 12; m += 1) {
      keys.add(`${acadStartYear}-${String(m).padStart(2, '0')}`);
    }
    for (let m = 1; m <= 4; m += 1) {
      keys.add(`${acadStartYear + 1}-${String(m).padStart(2, '0')}`);
    }
  }

  for (const mk of recordMonthKeys) {
    if (/^\d{4}-\d{2}$/.test(mk)) {
      keys.add(mk);
    }
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export const AttendanceMonthlyTrendLineChart: React.FC<AttendanceMonthlyTrendLineChartProps> = ({
  attendance,
  students,
  lang = 'th',
  selectedRoom = 'all',
}) => {
  const [granularity, setGranularity] = useState<TrendGranularity>('monthly_term');
  const [roomFilter, setRoomFilter] = useState<string>(selectedRoom);

  // Sync external class filter when user resets or picks a room from AttendanceView
  React.useEffect(() => {
    setRoomFilter(selectedRoom);
  }, [selectedRoom]);

  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.room?.trim()) set.add(s.room.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const { chartData, stats } = useMemo(() => {
    const filteredRecords = attendance.filter((rec) => {
      if (rec.userType === 'teacher' || rec.recordType === 'check_out') return false;
      if (!rec.date || !/^\d{4}-\d{2}/.test(rec.date)) return false;
      if (roomFilter !== 'all') {
        const stu = studentById.get(rec.studentId);
        const matchesRoom =
          rec.userDepartmentOrRoom === roomFilter ||
          stu?.room === roomFilter ||
          stu?.gradeLevel === roomFilter;
        if (!matchesRoom) return false;
      }
      return true;
    });

    const rosterCount =
      roomFilter === 'all'
        ? students.filter((s) => s.status === 'active').length || students.length
        : students.filter((s) => s.room === roomFilter || s.gradeLevel === roomFilter).length;

    const byMonth = new Map<string, AttendanceRecord[]>();
    for (const rec of filteredRecords) {
      const monthKey = rec.date.slice(0, 7);
      const list = byMonth.get(monthKey) || [];
      list.push(rec);
      byMonth.set(monthKey, list);
    }

    const orderedKeys = buildAcademicMonthKeys(Array.from(byMonth.keys()), granularity);

    const points: MonthlyTrendPoint[] = orderedKeys.map((monthKey) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = Number(yearStr);
      const monthIdx = Math.max(0, Math.min(11, Number(monthStr) - 1));
      const labels = formatMonthLabels(year, monthIdx, lang);

      const recs = byMonth.get(monthKey) || [];
      let present = 0;
      let late = 0;
      let leaveOrSick = 0;
      let absent = 0;
      const uniqueAttended = new Set<string>();
      const dailyStudentStatus = new Map<string, string>();

      for (const r of recs) {
        const dailyKey = `${r.date}|${r.studentId}`;
        if (!dailyStudentStatus.has(dailyKey) || r.status === 'present') {
          dailyStudentStatus.set(dailyKey, r.status);
        }
      }

      for (const [dailyKey, status] of dailyStudentStatus.entries()) {
        const studentId = dailyKey.split('|')[1];
        if (status === 'present') {
          present += 1;
          uniqueAttended.add(studentId);
        } else if (status === 'late') {
          late += 1;
          uniqueAttended.add(studentId);
        } else if (status === 'sick' || status === 'leave') {
          leaveOrSick += 1;
        } else if (status === 'absent') {
          absent += 1;
        }
      }

      const totalAttended = present + late;
      const totalRecords = present + late + leaveOrSick + absent;
      const attendanceRate =
        totalRecords > 0
          ? Math.round((totalAttended / totalRecords) * 1000) / 10
          : 0;
      const onTimeRate =
        totalRecords > 0
          ? Math.round((present / totalRecords) * 1000) / 10
          : 0;
      const lateRate =
        totalRecords > 0
          ? Math.round((late / totalRecords) * 1000) / 10
          : 0;

      return {
        monthKey,
        monthLabel: labels.short,
        fullMonthLabel: labels.full,
        present,
        late,
        leaveOrSick,
        absent,
        totalAttended,
        totalRecords,
        uniqueStudentsAttended: uniqueAttended.size,
        attendanceRate,
        onTimeRate,
        lateRate,
        hasData: totalRecords > 0,
      };
    });

    const activeMonths = points.filter((p) => p.hasData);
    const totalCheckins = activeMonths.reduce((s, p) => s + p.totalRecords, 0);
    const avgAttendanceRate =
      activeMonths.length > 0
        ? Math.round(
            (activeMonths.reduce((s, p) => s + p.attendanceRate, 0) / activeMonths.length) * 10
          ) / 10
        : 0;
    const avgOnTimeRate =
      activeMonths.length > 0
        ? Math.round(
            (activeMonths.reduce((s, p) => s + p.onTimeRate, 0) / activeMonths.length) * 10
          ) / 10
        : 0;
    const peakMonth =
      activeMonths.length > 0
        ? activeMonths.reduce((best, cur) =>
            cur.attendanceRate > best.attendanceRate ? cur : best
          )
        : null;

    return {
      chartData: points,
      stats: {
        activeMonthsCount: activeMonths.length,
        totalCheckins,
        avgAttendanceRate,
        avgOnTimeRate,
        peakMonth,
        rosterCount,
      },
    };
  }, [attendance, students, studentById, roomFilter, granularity, lang]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary-text)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th'
                  ? 'กราฟเส้นแนวโน้มการเข้าเรียนรายเดือนตลอดภาคเรียน (Monthly Attendance Trends)'
                  : 'Monthly Student Attendance Trends Across Academic Term'}
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                {roomFilter === 'all'
                  ? lang === 'th'
                    ? 'ทุกห้องเรียน'
                    : 'All Classes'
                  : roomFilter}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? 'ติดตามอัตราการเข้าเรียนรวม ความตรงเวลา และแนวโน้มการมาสายรายเดือนตลอดภาคเรียน/ปีการศึกษา เทียบเกณฑ์สิทธิ์สอบ 80%'
                : 'Track monthly engagement, punctuality, and lateness trends across the academic term against the 80% attendance threshold.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            <select
              aria-label={lang === 'th' ? 'เลือกห้องเรียนสำหรับกราฟรายเดือน' : 'Filter chart by room'}
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[var(--color-text-title)] focus:outline-none cursor-pointer"
            >
              <option value="all">
                {lang === 'th' ? `ทุกห้องเรียน (${availableRooms.length})` : `All Classes (${availableRooms.length})`}
              </option>
              {availableRooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setGranularity('monthly_term')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer font-bold ${
                granularity === 'monthly_term'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'ภาคเรียนนี้' : 'Current Term'}
            </button>
            <button
              type="button"
              onClick={() => setGranularity('monthly_all_year')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer font-bold ${
                granularity === 'monthly_all_year'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'ตลอดปีการศึกษา (12 เดือน)' : 'Full Year (12M)'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
              {lang === 'th' ? 'อัตราเข้าเรียนเฉลี่ยรายภาค' : 'Term Avg. Attendance'}
            </p>
            <p className="text-xl font-black font-mono text-blue-800 dark:text-blue-100 mt-0.5 tabular-nums">
              {stats.avgAttendanceRate}%
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
              {lang === 'th' ? 'อัตราตรงเวลาเฉลี่ย' : 'Avg. On-Time Rate'}
            </p>
            <p className="text-xl font-black font-mono text-emerald-800 dark:text-emerald-100 mt-0.5 tabular-nums">
              {stats.avgOnTimeRate}%
            </p>
          </div>
          <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
              {lang === 'th' ? 'เดือนที่เข้าเรียนสูงสุด' : 'Peak Engagement Month'}
            </p>
            <p className="text-base font-black text-[var(--color-text-title)] mt-0.5 truncate">
              {stats.peakMonth ? `${stats.peakMonth.monthLabel} (${stats.peakMonth.attendanceRate}%)` : '-'}
            </p>
          </div>
          <Calendar className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
              {lang === 'th' ? 'ข้อมูลเช็คชื่อที่วิเคราะห์' : 'Records Analyzed'}
            </p>
            <p className="text-base font-black text-[var(--color-text-title)] mt-0.5 tabular-nums">
              {stats.totalCheckins.toLocaleString()} {lang === 'th' ? 'รายการ' : 'logs'} · {stats.activeMonthsCount}{' '}
              {lang === 'th' ? 'เดือน' : 'mo'}
            </p>
          </div>
          <Users className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
        </div>
      </div>

      {/* Recharts Monthly LineChart */}
      <div className="w-full h-[290px] min-w-0 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 18, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.5} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<MonthlyTrendTooltip lang={lang} />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={9}
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
            />
            <ReferenceLine
              y={80}
              stroke="#dc2626"
              strokeDasharray="4 4"
              label={{
                value: lang === 'th' ? 'เกณฑ์สิทธิ์สอบ 80%' : '80% MOE Threshold',
                position: 'insideTopLeft',
                fill: '#dc2626',
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="attendanceRate"
              name={lang === 'th' ? 'อัตราการเข้าเรียนรวม (%)' : 'Attendance Rate (%)'}
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="onTimeRate"
              name={lang === 'th' ? 'อัตราตรงเวลา (%)' : 'On-Time Rate (%)'}
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="lateRate"
              name={lang === 'th' ? 'อัตรามาสาย (%)' : 'Late Rate (%)'}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: '#f59e0b' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface MonthlyTrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyTrendPoint }>;
  lang: AppLanguage;
}

const MonthlyTrendTooltip: React.FC<MonthlyTrendTooltipProps> = ({ active, payload, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-lg text-xs space-y-2 min-w-52">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-1.5">
        <div>
          <p className="font-bold text-[var(--color-text-title)]">{row.fullMonthLabel}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{row.monthKey}</p>
        </div>
        {row.hasData && (
          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold text-[10px]">
            {row.totalRecords} {lang === 'th' ? 'ครั้ง' : 'logs'}
          </span>
        )}
      </div>

      {!row.hasData ? (
        <p className="text-[11px] text-[var(--color-text-muted)] italic">
          {lang === 'th' ? 'ยังไม่มีข้อมูลการเช็คชื่อในเดือนนี้' : 'No attendance records in this month'}
        </p>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 dark:text-blue-300 font-bold">
              {lang === 'th' ? 'อัตราเข้าเรียนรวม:' : 'Attendance Rate:'}
            </span>
            <span className="font-mono font-black text-[var(--color-text-title)]">{row.attendanceRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 dark:text-emerald-300">
              {lang === 'th' ? 'มาตรงเวลา:' : 'On-Time:'}
            </span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {row.present} ({row.onTimeRate}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-amber-700 dark:text-amber-300">
              {lang === 'th' ? 'มาสาย:' : 'Late:'}
            </span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {row.late} ({row.lateRate}%)
            </span>
          </div>
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span>{lang === 'th' ? 'ลา / ขาด:' : 'Leave / Absent:'}</span>
            <span className="font-mono font-semibold">
              {row.leaveOrSick} / {row.absent}
            </span>
          </div>
          <div className="pt-1 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
            <span>{lang === 'th' ? 'นักเรียนที่มีบันทึก:' : 'Unique Students:'}</span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {row.uniqueStudentsAttended} {lang === 'th' ? 'คน' : 'students'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
