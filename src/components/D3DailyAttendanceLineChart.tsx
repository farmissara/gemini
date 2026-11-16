import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppLanguage, AttendanceRecord, Student } from '../types';
import { detectEducationStage, isPrimaryStage } from '../lib/moeGrading';

interface D3DailyAttendanceLineChartProps {
  students: Student[];
  attendance: AttendanceRecord[];
  lang?: AppLanguage;
}

interface DailyTrendDatum {
  day: number;
  dateStr: string;
  label: string;
  isWeekend: boolean;
  isFuture: boolean;
  present: number;
  late: number;
  leave: number;
  absent: number;
  attended: number;
  recordedCount: number;
  attendanceRate: number;
  onTimeRate: number;
  hasData: boolean;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const ENG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGradeSortOrder(gradeLevel: string): number {
  const s = gradeLevel.trim().toLowerCase().replace(/\s+/g, '');
  const kindy = s.match(/(?:อ\.?|k\.?)([1-3])/);
  if (kindy) return 10 + Number(kindy[1]);
  const thaiPrimary = s.match(/(?:ป\.?|ประถม(?:ศึกษาปีที่)?)([1-6])/);
  if (thaiPrimary) return 20 + Number(thaiPrimary[1]);
  const engPrimary = s.match(/(?:p\.?|primary)([1-6])/);
  if (engPrimary) return 20 + Number(engPrimary[1]);
  const gradePrimary = s.match(/^grade([1-6])$/);
  if (gradePrimary) return 20 + Number(gradePrimary[1]);
  const thaiSecondary = s.match(/(?:ม\.?|มัธยม(?:ศึกษาปีที่)?)([1-6])/);
  if (thaiSecondary) return 30 + Number(thaiSecondary[1]);
  const engSecondary = s.match(/(?:m\.?|secondary)([1-6])/);
  if (engSecondary) return 30 + Number(engSecondary[1]);
  const gradeSecondary = s.match(/^grade(7|8|9|10|11|12)$/);
  if (gradeSecondary) return 30 + (Number(gradeSecondary[1]) - 6);
  return 99;
}

export const D3DailyAttendanceLineChart: React.FC<D3DailyAttendanceLineChartProps> = ({
  students,
  attendance,
  lang = 'th',
}) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [schoolLevelFilter, setSchoolLevelFilter] = useState<string>('all');
  const [containerWidth, setContainerWidth] = useState<number>(560);
  const [hoveredPoint, setHoveredPoint] = useState<{
    datum: DailyTrendDatum;
    x: number;
    y: number;
  } | null>(null);

  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Track responsive container width
  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      const next = Math.max(220, Math.floor(el.clientWidth));
      setContainerWidth(next);
    };
    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build available school level options from students
  const levelOptions = useMemo(() => {
    const active = students.filter((s) => s.status !== 'graduated' && s.status !== 'transferred');
    const source = active.length > 0 ? active : students;
    const distinctLevels = Array.from(
      new Set(source.map((s) => (s.gradeLevel || '').trim()).filter(Boolean))
    ).sort((a, b) => {
      const diff = getGradeSortOrder(a) - getGradeSortOrder(b);
      return diff !== 0 ? diff : a.localeCompare(b, 'th');
    });

    const stages = new Set(source.map((s) => detectEducationStage(s.gradeLevel)));
    return {
      hasKindergarten: stages.has('kindergarten'),
      hasPrimary: stages.has('primary_early') || stages.has('primary_upper'),
      hasLowerSecondary: stages.has('lower_secondary'),
      hasUpperSecondary: stages.has('upper_secondary'),
      distinctLevels,
    };
  }, [students]);

  // Filter students belonging to the selected school level
  const { scopedStudents, scopedStudentIds } = useMemo(() => {
    const active = students.filter((s) => s.status !== 'graduated' && s.status !== 'transferred');
    const base = active.length > 0 ? active : students;

    const filtered = base.filter((student) => {
      if (schoolLevelFilter === 'all') return true;
      if (schoolLevelFilter.startsWith('grade:')) {
        const target = schoolLevelFilter.slice('grade:'.length);
        return (student.gradeLevel || '').trim() === target;
      }
      const stage = detectEducationStage(student.gradeLevel);
      if (schoolLevelFilter === 'kindergarten') return stage === 'kindergarten';
      if (schoolLevelFilter === 'primary') return isPrimaryStage(stage);
      if (schoolLevelFilter === 'secondary_all') {
        return stage === 'lower_secondary' || stage === 'upper_secondary';
      }
      if (schoolLevelFilter === 'lower_secondary') return stage === 'lower_secondary';
      if (schoolLevelFilter === 'upper_secondary') return stage === 'upper_secondary';
      return true;
    });

    return {
      scopedStudents: filtered,
      scopedStudentIds: new Set(filtered.map((s) => s.id)),
    };
  }, [students, schoolLevelFilter]);

  // Build daily attendance series for selected month
  const { dailyData, summary } = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;
    const currentDay = now.getDate();

    const recordsByDate = new Map<string, AttendanceRecord[]>();
    for (const rec of attendance) {
      if (rec.userType === 'teacher' || rec.recordType === 'check_out') continue;
      if (!rec.date) continue;
      if (schoolLevelFilter !== 'all' && !scopedStudentIds.has(rec.studentId)) continue;
      const list = recordsByDate.get(rec.date) || [];
      list.push(rec);
      recordsByDate.set(rec.date, list);
    }

    const rosterSize = scopedStudents.length;
    const rows: DailyTrendDatum[] = [];

    let attRateSum = 0;
    let onTimeRateSum = 0;
    let recordedDays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(selectedYear, selectedMonth, day);
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isFuture = isCurrentMonth && day > currentDay;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = recordsByDate.get(dateStr) || [];

      const uniqueStatus = new Map<string, string>();
      for (const r of dayRecords) {
        if (!uniqueStatus.has(r.studentId)) {
          uniqueStatus.set(r.studentId, r.status);
        } else if (r.status === 'present') {
          uniqueStatus.set(r.studentId, 'present');
        }
      }

      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;
      for (const st of uniqueStatus.values()) {
        if (st === 'present') present += 1;
        else if (st === 'late') late += 1;
        else if (st === 'leave' || st === 'sick') leave += 1;
        else if (st === 'absent') absent += 1;
      }

      const attended = present + late;
      const recordedCount = present + late + leave + absent;
      const hasData = recordedCount > 0 && !isFuture;
      const denominator = rosterSize > 0 ? rosterSize : recordedCount;
      const attendanceRate =
        hasData && denominator > 0 ? Math.min(100, Math.round((attended / denominator) * 1000) / 10) : 0;
      const onTimeRate =
        hasData && attended > 0 ? Math.min(100, Math.round((present / attended) * 1000) / 10) : 0;

      if (hasData) {
        recordedDays += 1;
        attRateSum += attendanceRate;
        onTimeRateSum += onTimeRate;
      }

      rows.push({
        day,
        dateStr,
        label: `${day}/${selectedMonth + 1}`,
        isWeekend,
        isFuture,
        present,
        late,
        leave,
        absent,
        attended,
        recordedCount,
        attendanceRate,
        onTimeRate,
        hasData,
      });
    }

    return {
      dailyData: rows,
      summary: {
        avgAttendance: recordedDays > 0 ? Math.round((attRateSum / recordedDays) * 10) / 10 : 0,
        avgOnTime: recordedDays > 0 ? Math.round((onTimeRateSum / recordedDays) * 10) / 10 : 0,
        recordedDays,
        studentCount: rosterSize,
      },
    };
  }, [attendance, scopedStudents.length, scopedStudentIds, schoolLevelFilter, selectedYear, selectedMonth]);

  // Render D3 Line Chart
  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const height = 220;
    const margin = { top: 18, right: 16, bottom: 28, left: 40 };
    const width = Math.max(220, containerWidth);
    const innerWidth = Math.max(120, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const defs = svg.append('defs');
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-attendance-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.28);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.02);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const daysCount = Math.max(1, dailyData.length);
    const xScale = d3
      .scaleLinear()
      .domain([1, daysCount])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Horizontal gridlines
    const yTicks = [0, 25, 50, 75, 100];
    g.append('g')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#cbd5e1')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-opacity', 0.55);

    // 80% target benchmark line
    const y80 = yScale(80);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', y80)
      .attr('y2', y80)
      .attr('stroke', '#d97706')
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '5 4');

    g.append('text')
      .attr('x', 4)
      .attr('y', y80 - 5)
      .attr('fill', '#b45309')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(lang === 'th' ? 'เป้าหมาย 80%' : '80% Target');

    // Axes
    const tickValues = dailyData
      .map((d) => d.day)
      .filter((day) => day === 1 || day === daysCount || day % 5 === 0);

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat((d) => `${Number(d)}`);

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat((d) => `${Number(d)}%`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#cbd5e1');
        axisG.selectAll('line').attr('stroke', '#cbd5e1');
        axisG.selectAll('text').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600');
      });

    g.append('g')
      .call(yAxis)
      .call((axisG) => {
        axisG.select('.domain').remove();
        axisG.selectAll('line').remove();
        axisG.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px');
      });

    // Plot recorded points only (so gaps or future days aren't plotted as misleading drops to 0)
    const activePoints = dailyData.filter((d) => d.hasData);

    if (activePoints.length > 0) {
      const areaGen = d3
        .area<DailyTrendDatum>()
        .x((d) => xScale(d.day))
        .y0(innerHeight)
        .y1((d) => yScale(d.attendanceRate))
        .curve(d3.curveMonotoneX);

      const attendanceLineGen = d3
        .line<DailyTrendDatum>()
        .x((d) => xScale(d.day))
        .y((d) => yScale(d.attendanceRate))
        .curve(d3.curveMonotoneX);

      const onTimeLineGen = d3
        .line<DailyTrendDatum>()
        .x((d) => xScale(d.day))
        .y((d) => yScale(d.onTimeRate))
        .curve(d3.curveMonotoneX);

      // Area under Attendance Rate
      g.append('path')
        .datum(activePoints)
        .attr('fill', 'url(#d3-attendance-area-grad)')
        .attr('d', areaGen);

      // Secondary On-Time Rate line
      g.append('path')
        .datum(activePoints)
        .attr('fill', 'none')
        .attr('stroke', '#d97706')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4 3')
        .attr('d', onTimeLineGen);

      // Primary Attendance Rate line
      g.append('path')
        .datum(activePoints)
        .attr('fill', 'none')
        .attr('stroke', '#059669')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('d', attendanceLineGen);

      // Data Dots - On-time
      g.selectAll('.dot-ontime')
        .data(activePoints)
        .enter()
        .append('circle')
        .attr('class', 'dot-ontime')
        .attr('cx', (d) => xScale(d.day))
        .attr('cy', (d) => yScale(d.onTimeRate))
        .attr('r', 3)
        .attr('fill', '#ffffff')
        .attr('stroke', '#d97706')
        .attr('stroke-width', 1.75);

      // Data Dots - Attendance
      g.selectAll('.dot-attendance')
        .data(activePoints)
        .enter()
        .append('circle')
        .attr('class', 'dot-attendance')
        .attr('cx', (d) => xScale(d.day))
        .attr('cy', (d) => yScale(d.attendanceRate))
        .attr('r', 3.75)
        .attr('fill', '#059669')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);

      // Interactive hover overlay
      const focusLine = g
        .append('line')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .style('opacity', 0);

      const bisectDay = d3.bisector<DailyTrendDatum, number>((d) => d.day).left;

      g.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', (event: MouseEvent) => {
          const [mx] = d3.pointer(event);
          const dayVal = xScale.invert(mx);
          const idx = bisectDay(activePoints, dayVal, 1);
          const d0 = activePoints[idx - 1];
          const d1 = activePoints[idx];
          let nearest = d0;
          if (d0 && d1) {
            nearest = dayVal - d0.day > d1.day - dayVal ? d1 : d0;
          } else if (!d0) {
            nearest = d1;
          }
          if (!nearest) return;

          const px = xScale(nearest.day);
          const py = yScale(nearest.attendanceRate);
          focusLine.attr('x1', px).attr('x2', px).style('opacity', 0.7);
          setHoveredPoint({
            datum: nearest,
            x: margin.left + px,
            y: margin.top + py,
          });
        })
        .on('mouseleave', () => {
          focusLine.style('opacity', 0);
          setHoveredPoint(null);
        });
    }
  }, [dailyData, containerWidth, lang]);

  const handlePrevMonth = () => {
    setHoveredPoint(null);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setHoveredPoint(null);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const displayYear = lang === 'th' ? selectedYear + 543 : selectedYear;
  const monthLabel =
    lang === 'th'
      ? `${THAI_MONTHS[selectedMonth]} ${displayYear}`
      : `${ENG_MONTHS[selectedMonth]} ${displayYear}`;

  return (
    <section
      aria-label={
        lang === 'th'
          ? 'กราฟเส้นแนวโน้มการมาเรียนรายวันด้วย D3'
          : 'D3 Daily Student Attendance Trend Line Chart'
      }
      className="frosted-card frosted-amber dash-card dash-card-stack print-avoid-break"
    >
      {/* Header & School Level Dropdown Filter */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 dash-header-divider border-b border-amber-200/75 dark:border-amber-800/50">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100/95 dark:bg-amber-950/60 border border-amber-300/70 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#0f172a] dark:text-slate-100 leading-snug">
              {lang === 'th'
                ? 'แนวโน้มการมาเรียนรายวันตลอดเดือน'
                : 'Daily Student Attendance Trends'}
            </h3>
            <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5">
              {lang === 'th'
                ? `มาเรียน & ความตรงเวลาแยกตามระดับชั้น · ${monthLabel}`
                : `Daily attendance & punctuality · ${monthLabel}`}
            </p>
          </div>
        </div>

        {/* Controls: School Level Dropdown + Month Stepper */}
        <div className="no-print flex flex-wrap items-center gap-2 w-full xl:w-auto min-w-0 max-w-full">
          <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0 max-w-full">
            <label
              htmlFor="d3-school-level-filter"
              className="sr-only"
            >
              {lang === 'th' ? 'เลือกระดับชั้น' : 'Select school level'}
            </label>
            <select
              id="d3-school-level-filter"
              value={schoolLevelFilter}
              onChange={(e) => {
                setHoveredPoint(null);
                setSchoolLevelFilter(e.target.value);
              }}
              className="w-full sm:w-auto max-w-full min-w-0 px-3 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-800/60 bg-white/85 dark:bg-slate-900/75 text-xs font-semibold text-[#1e293b] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">
                {lang === 'th' ? 'ทุกระดับชั้น (ทั้งโรงเรียน)' : 'All School Levels'}
              </option>
              {levelOptions.hasKindergarten && (
                <option value="kindergarten">
                  {lang === 'th' ? 'ระดับอนุบาล' : 'Kindergarten'}
                </option>
              )}
              {levelOptions.hasPrimary && (
                <option value="primary">
                  {lang === 'th' ? 'ระดับประถมศึกษา (ป.1–ป.6)' : 'Primary (P.1–P.6)'}
                </option>
              )}
              {(levelOptions.hasLowerSecondary || levelOptions.hasUpperSecondary) && (
                <option value="secondary_all">
                  {lang === 'th' ? 'ระดับมัธยมศึกษา (ม.1–ม.6)' : 'Secondary (M.1–M.6)'}
                </option>
              )}
              {levelOptions.hasLowerSecondary && (
                <option value="lower_secondary">
                  {lang === 'th' ? 'มัธยมศึกษาตอนต้น (ม.1–ม.3)' : 'Lower Secondary (M.1–M.3)'}
                </option>
              )}
              {levelOptions.hasUpperSecondary && (
                <option value="upper_secondary">
                  {lang === 'th' ? 'มัธยมศึกษาตอนปลาย (ม.4–ม.6)' : 'Upper Secondary (M.4–M.6)'}
                </option>
              )}
              {levelOptions.distinctLevels.length > 0 && (
                <optgroup label={lang === 'th' ? 'แยกตามชั้นเรียน' : 'By Grade Level'}>
                  {levelOptions.distinctLevels.map((lvl) => (
                    <option key={lvl} value={`grade:${lvl}`}>
                      {lang === 'th' ? `ชั้น ${lvl}` : lvl}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex flex-wrap max-w-full items-center rounded-xl border border-amber-300/80 dark:border-amber-800/60 bg-white/80 dark:bg-slate-900/65 p-0.5 text-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={lang === 'th' ? 'เดือนก่อนหน้า' : 'Previous month'}
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[#1e293b] dark:text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-[#1e293b] dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span>{monthLabel}</span>
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={lang === 'th' ? 'เดือนถัดไป' : 'Next month'}
              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[#1e293b] dark:text-slate-200 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <span className="hidden print:inline-block text-xs font-semibold text-amber-900 shrink-0">
          {schoolLevelFilter === 'all'
            ? lang === 'th' ? 'ระดับ: ทุกระดับชั้น' : 'Level: All'
            : schoolLevelFilter.startsWith('grade:')
            ? `${lang === 'th' ? 'ชั้น' : 'Grade'} ${schoolLevelFilter.slice('grade:'.length)}`
            : schoolLevelFilter === 'kindergarten'
            ? lang === 'th' ? 'ระดับอนุบาล' : 'Kindergarten'
            : schoolLevelFilter === 'primary'
            ? lang === 'th' ? 'ป.1–ป.6' : 'Primary'
            : schoolLevelFilter === 'secondary_all'
            ? lang === 'th' ? 'ม.1–ม.6' : 'Secondary'
            : schoolLevelFilter === 'lower_secondary'
            ? lang === 'th' ? 'ม.1–ม.3' : 'Lower Secondary'
            : lang === 'th' ? 'ม.4–ม.6' : 'Upper Secondary'}{' '}
          · {monthLabel}
        </span>
      </div>

      {/* Compact Unboxed Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0 sm:divide-x sm:divide-amber-200/75 dark:sm:divide-amber-800/50 bg-white/60 dark:bg-slate-900/45 rounded-xl dash-kpi-strip border border-amber-200/60 dark:border-amber-800/40">
        <div className="sm:pr-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
              {lang === 'th' ? 'มาเรียนเฉลี่ยรายวัน' : 'Monthly Avg. Attendance'}
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
              {summary.avgAttendance}%
            </p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div className="sm:px-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
              {lang === 'th' ? 'ตรงเวลาเฉลี่ย' : 'Avg. On-Time Rate'}
            </p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5 tabular-nums">
              {summary.avgOnTime}%
            </p>
          </div>
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        </div>

        <div className="sm:pl-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
              {lang === 'th' ? 'ขอบเขตกลุ่มตัวอย่าง' : 'Scope & Days'}
            </p>
            <p className="text-sm font-bold text-[#1e293b] dark:text-slate-100 mt-0.5 tabular-nums">
              {summary.studentCount} {lang === 'th' ? 'คน' : 'students'} · {summary.recordedDays}{' '}
              {lang === 'th' ? 'วัน' : 'days'}
            </p>
          </div>
          <Users className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569] dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#1e293b] dark:text-slate-200">
            <span className="w-3 h-0.5 bg-emerald-600 inline-block rounded-full" />
            <span>{lang === 'th' ? 'อัตราการมาเรียน (%)' : 'Attendance Rate (%)'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#1e293b] dark:text-slate-200">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
            <span>{lang === 'th' ? 'อัตราเข้าเรียนตรงเวลา (%)' : 'On-Time Rate (%)'}</span>
          </span>
        </div>
        <span className="text-[11px] tabular-nums">
          {lang === 'th' ? 'แกน X: วันที่ในเดือน' : 'X-Axis: Day of Month'}
        </span>
      </div>

      {/* D3 SVG Container */}
      <div ref={chartWrapperRef} className="relative w-full min-w-0">
        <svg
          ref={svgRef}
          className="w-full max-w-full h-[220px] block overflow-hidden"
          role="img"
          aria-label={
            lang === 'th'
              ? `กราฟเส้น D3 แสดงแนวโน้มการมาเรียนรายวัน เดือน${monthLabel}`
              : `D3 daily attendance line chart for ${monthLabel}`
          }
        />

        {summary.recordedDays === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="px-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800/60 text-center shadow-xs">
              <p className="text-xs font-bold text-[#1e293b] dark:text-slate-100">
                {lang === 'th'
                  ? `ยังไม่มีบันทึกการเช็กชื่อในเดือน${monthLabel}`
                  : `No attendance records found for ${monthLabel}`}
              </p>
              <p className="text-[11px] text-[#475569] dark:text-slate-300 mt-0.5">
                {lang === 'th'
                  ? 'ลองสลับระดับชั้นหรือเลือกเดือนที่มีการบันทึกข้อมูล'
                  : 'Try switching school levels or browsing another month'}
              </p>
            </div>
          </div>
        )}

        {/* Interactive D3 Tooltip */}
        {hoveredPoint && (
          <div
            className="no-print pointer-events-none absolute z-20 rounded-xl border border-amber-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-lg text-xs space-y-1.5 min-w-[165px] max-w-[calc(100%-16px)]"
            style={{
              left: Math.min(Math.max(hoveredPoint.x + 12, 8), Math.max(8, containerWidth - 205)),
              top: Math.max(8, hoveredPoint.y - 84),
            }}
          >
            <div className="font-bold text-[#0f172a] dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-1 tabular-nums">
              {hoveredPoint.datum.dateStr}
            </div>
            <div className="flex items-center justify-between gap-3 tabular-nums">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {lang === 'th' ? 'อัตราการมาเรียน:' : 'Attendance:'}
              </span>
              <span className="font-mono font-bold text-[#0f172a] dark:text-white">
                {hoveredPoint.datum.attendanceRate}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 tabular-nums">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {lang === 'th' ? 'มาตรงเวลา:' : 'On-time:'}
              </span>
              <span className="font-mono font-bold text-[#0f172a] dark:text-white">
                {hoveredPoint.datum.onTimeRate}%
              </span>
            </div>
            <div className="text-[11px] text-[#475569] dark:text-slate-300 pt-0.5 tabular-nums">
              {lang === 'th'
                ? `ตรงเวลา ${hoveredPoint.datum.present} · สาย ${hoveredPoint.datum.late} · ลา ${hoveredPoint.datum.leave} · ขาด ${hoveredPoint.datum.absent}`
                : `Present ${hoveredPoint.datum.present} · Late ${hoveredPoint.datum.late} · Leave ${hoveredPoint.datum.leave} · Absent ${hoveredPoint.datum.absent}`}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
