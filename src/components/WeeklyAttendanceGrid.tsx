import React, { useMemo, useState } from 'react';
import {
  AttendanceRecord,
  AttendanceStatus,
  AppLanguage,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  Student,
} from '../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Clock,
  AlertCircle,
  FileText,
  X,
  Download,
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';

interface WeeklyAttendanceGridProps {
  students: Student[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  selectedWeekDate: string;
  onChangeWeekDate: (isoDate: string) => void;
  selectedCourse?: Course | null;
  classFilter: string;
  lang: AppLanguage;
  onSyncDateRangeToWeek?: (mondayIso: string, fridayIso: string) => void;
  onDownloadCsv?: () => void;
}

interface WeekdayInfo {
  iso: string;
  shortDayTh: string;
  shortDayEn: string;
  dateLabel: string;
  isToday: boolean;
}

interface ResolvedCell {
  status: AttendanceStatus | null;
  time?: string;
  detail?: string;
}

const TH_SHORT_DAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.'];
const EN_SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseIsoLocal(iso: string): Date {
  const parts = iso.split('-').map(Number);
  if (parts.length === 3 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1]) && !Number.isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

function getMondayOfWeek(iso: string): Date {
  const d = parseIsoLocal(iso);
  const dow = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffToMon);
  return d;
}

function shiftDateIso(iso: string, days: number): string {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

export const WeeklyAttendanceGrid: React.FC<WeeklyAttendanceGridProps> = ({
  students,
  attendance,
  periodAttendance = [],
  leaveRequests = [],
  selectedWeekDate,
  onChangeWeekDate,
  selectedCourse = null,
  classFilter,
  lang,
  onSyncDateRangeToWeek,
  onDownloadCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const todayIso = getLocalDateString();

  const weekDays = useMemo<WeekdayInfo[]>(() => {
    const monday = getMondayOfWeek(selectedWeekDate || todayIso);
    return Array.from({ length: 5 }, (_, idx) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const iso = getLocalDateString(d);
      const dayNum = d.getDate();
      const monthLabel = lang === 'th' ? TH_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
      return {
        iso,
        shortDayTh: TH_SHORT_DAYS[idx],
        shortDayEn: EN_SHORT_DAYS[idx],
        dateLabel: `${dayNum} ${monthLabel}`,
        isToday: iso === todayIso,
      };
    });
  }, [selectedWeekDate, todayIso, lang]);

  const mondayIso = weekDays[0]?.iso || todayIso;
  const fridayIso = weekDays[4]?.iso || todayIso;
  const weekIsoSet = useMemo(() => new Set(weekDays.map((d) => d.iso)), [weekDays]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const enrolledSet = selectedCourse?.enrolledStudentIds?.length
      ? new Set(selectedCourse.enrolledStudentIds)
      : null;

    return students.filter((s) => {
      if (classFilter !== 'all' && s.room !== classFilter && s.gradeLevel !== classFilter) {
        return false;
      }
      if (selectedCourse) {
        if (enrolledSet) {
          if (!enrolledSet.has(s.id)) return false;
        } else if (selectedCourse.room && s.room !== selectedCourse.room) {
          return false;
        }
      }
      if (!q) return true;
      const fullTh = `${s.firstNameTh || ''} ${s.lastNameTh || ''}`.toLowerCase();
      const fullEn = `${s.firstNameEn || ''} ${s.lastNameEn || ''}`.toLowerCase();
      return (
        fullTh.includes(q) ||
        fullEn.includes(q) ||
        (s.studentIdNumber || '').toLowerCase().includes(q) ||
        (s.room || '').toLowerCase().includes(q)
      );
    });
  }, [students, classFilter, selectedCourse, searchQuery]);

  // Index records by `${studentId}::${date}` for fast O(1) lookup per cell
  const cellLookup = useMemo(() => {
    const map = new Map<string, ResolvedCell>();

    if (selectedCourse && periodAttendance.length > 0) {
      periodAttendance.forEach((pa) => {
        if (pa.courseId !== selectedCourse.id) return;
        if (!weekIsoSet.has(pa.date)) return;
        const key = `${pa.studentId}::${pa.date}`;
        const mappedStatus: AttendanceStatus = pa.status === 'excused' ? 'leave' : pa.status;
        map.set(key, {
          status: mappedStatus,
          time: pa.timeSlot || `${lang === 'th' ? 'คาบ' : 'P.'} ${pa.periodNumber}`,
          detail: `${selectedCourse.code} ${pa.remarks || ''}`.trim(),
        });
      });
    } else {
      attendance.forEach((rec) => {
        if (!weekIsoSet.has(rec.date)) return;
        if (rec.userType === 'teacher') return;
        const key = `${rec.studentId}::${rec.date}`;
        const existing = map.get(key);
        // Prefer check_in over check_out when both exist on the same day
        if (!existing || rec.recordType !== 'check_out') {
          map.set(key, {
            status: rec.status,
            time: rec.time ? rec.time.slice(0, 5) : undefined,
            detail: rec.location?.geofenceZoneName || rec.remarks || undefined,
          });
        }
      });
    }

    // Backfill approved student leave requests where no gate/period scan was logged
    leaveRequests.forEach((req) => {
      if (req.status !== 'approved' || req.userRole !== 'student') return;
      weekDays.forEach((day) => {
        if (req.startDate <= day.iso && req.endDate >= day.iso) {
          const key = `${req.userId}::${day.iso}`;
          if (!map.has(key)) {
            map.set(key, {
              status: req.leaveType === 'sick' ? 'sick' : 'leave',
              detail: req.reason,
            });
          }
        }
      });
    });

    return map;
  }, [attendance, periodAttendance, leaveRequests, selectedCourse, weekIsoSet, weekDays, lang]);

  // Precompute per-day column totals for summary strip & footer
  const dailyTotals = useMemo(() => {
    return weekDays.map((day) => {
      let present = 0;
      let late = 0;
      let leaveOrSick = 0;
      let absent = 0;
      let recorded = 0;

      filteredStudents.forEach((stu) => {
        const cell = cellLookup.get(`${stu.id}::${day.iso}`);
        if (!cell?.status) return;
        recorded += 1;
        if (cell.status === 'present') present += 1;
        else if (cell.status === 'late') late += 1;
        else if (cell.status === 'sick' || cell.status === 'leave') leaveOrSick += 1;
        else if (cell.status === 'absent') absent += 1;
      });

      return { iso: day.iso, present, late, leaveOrSick, absent, recorded };
    });
  }, [weekDays, filteredStudents, cellLookup]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleStudents = filteredStudents.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const renderStatusCell = (cell: ResolvedCell | undefined) => {
    if (!cell?.status) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-medium text-[var(--color-text-muted)] bg-[var(--color-card-subtle)]/60">
          —
        </span>
      );
    }

    const tooltip = [cell.time ? `${cell.time}` : '', cell.detail || ''].filter(Boolean).join(' • ');

    switch (cell.status) {
      case 'present':
        return (
          <div
            title={tooltip || (lang === 'th' ? 'มาเรียนตรงเวลา' : 'Present')}
            className="inline-flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 min-w-[54px]"
          >
            <span className="inline-flex items-center gap-1 text-[11px] font-bold leading-tight whitespace-nowrap">
              <Check className="w-3 h-3 shrink-0" />
              {lang === 'th' ? 'มา' : 'Present'}
            </span>
            {cell.time && (
              <span className="text-[9px] font-mono tabular-nums opacity-80 leading-tight mt-0.5">
                {cell.time}
              </span>
            )}
          </div>
        );
      case 'late':
        return (
          <div
            title={tooltip || (lang === 'th' ? 'มาสาย' : 'Late')}
            className="inline-flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 min-w-[54px]"
          >
            <span className="inline-flex items-center gap-1 text-[11px] font-bold leading-tight whitespace-nowrap">
              <Clock className="w-3 h-3 shrink-0" />
              {lang === 'th' ? 'สาย' : 'Late'}
            </span>
            {cell.time && (
              <span className="text-[9px] font-mono tabular-nums opacity-80 leading-tight mt-0.5">
                {cell.time}
              </span>
            )}
          </div>
        );
      case 'sick':
        return (
          <div
            title={tooltip || (lang === 'th' ? 'ลาป่วย' : 'Sick Leave')}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-800 text-[11px] font-bold min-w-[54px] whitespace-nowrap"
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'ป่วย' : 'Sick'}</span>
          </div>
        );
      case 'leave':
        return (
          <div
            title={tooltip || (lang === 'th' ? 'ลากิจ' : 'Leave')}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 text-[11px] font-bold min-w-[54px] whitespace-nowrap"
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'ลา' : 'Leave'}</span>
          </div>
        );
      case 'absent':
        return (
          <div
            title={tooltip || (lang === 'th' ? 'ขาดเรียน' : 'Absent')}
            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-[11px] font-bold min-w-[54px] whitespace-nowrap"
          >
            <X className="w-3 h-3 shrink-0" />
            <span>{lang === 'th' ? 'ขาด' : 'Absent'}</span>
          </div>
        );
      default:
        return (
          <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Week Navigation & Search Toolbar */}
      <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <button
              type="button"
              onClick={() => onChangeWeekDate(shiftDateIso(mondayIso, -7))}
              className="p-1.5 hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] transition cursor-pointer"
              title={lang === 'th' ? 'สัปดาห์ก่อนหน้า' : 'Previous Week'}
              aria-label={lang === 'th' ? 'สัปดาห์ก่อนหน้า' : 'Previous Week'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 font-mono font-bold text-[11px] text-[var(--color-text-title)] tabular-nums border-x border-[var(--color-border)] whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-[var(--color-primary-text)] -mt-0.5" />
              {mondayIso} – {fridayIso}
            </span>
            <button
              type="button"
              onClick={() => onChangeWeekDate(shiftDateIso(mondayIso, 7))}
              className="p-1.5 hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] transition cursor-pointer"
              title={lang === 'th' ? 'สัปดาห์ถัดไป' : 'Next Week'}
              aria-label={lang === 'th' ? 'สัปดาห์ถัดไป' : 'Next Week'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onChangeWeekDate(todayIso)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[11px] font-semibold text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {lang === 'th' ? 'สัปดาห์นี้' : 'This Week'}
          </button>

          <label className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <span className="hidden sm:inline font-medium">{lang === 'th' ? 'ข้ามไปยังวัน:' : 'Jump to:'}</span>
            <input
              type="date"
              value={selectedWeekDate}
              onChange={(e) => {
                if (e.target.value) onChangeWeekDate(e.target.value);
              }}
              aria-label={lang === 'th' ? 'เลือกวันที่เพื่อดูสรุปรายสัปดาห์' : 'Select date for week view'}
              className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-[11px] font-mono"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-52 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder={lang === 'th' ? 'ค้นหาชื่อ / รหัสนักเรียน...' : 'Search student name / ID...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {onSyncDateRangeToWeek && (
            <button
              type="button"
              onClick={() => {
                onSyncDateRangeToWeek(mondayIso, fridayIso);
                onDownloadCsv?.();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              title={lang === 'th' ? 'ตั้งช่วงวันที่เป็นจันทร์–ศุกร์นี้และดาวน์โหลด CSV' : 'Export Mon–Fri week records to CSV'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'CSV สัปดาห์นี้' : 'Week CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend Bar (Plain unboxed indicators paired with text) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] px-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-[var(--color-text-body)]">
            {lang === 'th' ? 'สถานะรายวัน (จันทร์–ศุกร์):' : 'Status Legend (Mon–Fri):'}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
            <Check className="w-3 h-3" /> {lang === 'th' ? 'มาเรียน' : 'Present'}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-semibold">
            <Clock className="w-3 h-3" /> {lang === 'th' ? 'มาสาย' : 'Late'}
          </span>
          <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300 font-semibold">
            <FileText className="w-3 h-3" /> {lang === 'th' ? 'ลาป่วย' : 'Sick'}
          </span>
          <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-semibold">
            <FileText className="w-3 h-3" /> {lang === 'th' ? 'ลากิจ' : 'Leave'}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-semibold">
            <X className="w-3 h-3" /> {lang === 'th' ? 'ขาดเรียน' : 'Absent'}
          </span>
        </div>
        <span className="font-mono tabular-nums">
          {filteredStudents.length} {lang === 'th' ? 'คน' : 'students'}
        </span>
      </div>

      {/* Monday–Friday Summary Grid Table */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto bg-[var(--color-card)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)]">
            <tr>
              <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                {lang === 'th' ? 'นักเรียน' : 'Student'}
              </th>
              <th className="py-2.5 px-2.5 font-bold whitespace-nowrap hidden sm:table-cell">
                {lang === 'th' ? 'ห้อง' : 'Room'}
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.iso}
                  className={`py-2 px-2 text-center font-bold whitespace-nowrap min-w-[74px] ${
                    day.isToday ? 'bg-[var(--color-primary-light)]/70 text-[var(--color-primary-text)]' : ''
                  }`}
                >
                  <div>{lang === 'th' ? day.shortDayTh : day.shortDayEn}</div>
                  <div className="text-[10px] font-mono font-semibold text-[var(--color-text-muted)] tabular-nums">
                    {day.dateLabel}
                  </div>
                </th>
              ))}
              <th className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                {lang === 'th' ? 'สรุปสัปดาห์' : 'Week Summary'}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-border)]">
            {visibleStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 px-4 text-center text-[var(--color-text-muted)]">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1.5 opacity-60" />
                  <p className="font-medium">
                    {lang === 'th'
                      ? 'ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไขที่กรอง'
                      : 'No students match the selected filters'}
                  </p>
                </td>
              </tr>
            ) : (
              visibleStudents.map((stu) => {
                let presentOrLateCount = 0;
                let recordedCount = 0;
                let absentCount = 0;

                const dayCells = weekDays.map((day) => {
                  const cell = cellLookup.get(`${stu.id}::${day.iso}`);
                  if (cell?.status) {
                    recordedCount += 1;
                    if (cell.status === 'present' || cell.status === 'late') presentOrLateCount += 1;
                    if (cell.status === 'absent') absentCount += 1;
                  }
                  return { day, cell };
                });

                return (
                  <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)]/60 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <img
                          src={stu.avatarUrl}
                          alt={`${stu.firstNameTh} ${stu.lastNameTh}`}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--color-text-title)] truncate">
                            {stu.firstNameTh} {stu.lastNameTh}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--color-text-muted)] tabular-nums">
                            {stu.studentIdNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-2.5 text-[var(--color-text-body)] font-medium whitespace-nowrap hidden sm:table-cell">
                      {stu.room || '-'}
                    </td>

                    {dayCells.map(({ day, cell }) => (
                      <td
                        key={day.iso}
                        className={`py-2 px-1.5 text-center align-middle ${
                          day.isToday ? 'bg-[var(--color-primary-light)]/25' : ''
                        }`}
                      >
                        {renderStatusCell(cell)}
                      </td>
                    ))}

                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {recordedCount === 0 ? (
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
                          0 / 5
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-end font-mono tabular-nums">
                          <span className="font-bold text-[var(--color-text-title)]">
                            {presentOrLateCount}/{recordedCount}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {absentCount > 0
                              ? `${lang === 'th' ? 'ขาด' : 'Abs'} ${absentCount}`
                              : `${Math.round((presentOrLateCount / recordedCount) * 100)}%`}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {filteredStudents.length > 0 && (
            <tfoot className="bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] text-[11px]">
              <tr>
                <td colSpan={2} className="py-2 px-3 font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'รวมมาเรียน / สาย รายวัน' : 'Daily Totals'}
                </td>
                {dailyTotals.map((tot) => (
                  <td key={tot.iso} className="py-2 px-1.5 text-center font-mono tabular-nums">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">{tot.present}</span>
                    <span className="text-[var(--color-text-muted)]"> / </span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">{tot.late}</span>
                    {tot.absent > 0 && (
                      <span className="block text-[9px] text-rose-700 dark:text-rose-300 font-semibold">
                        {lang === 'th' ? `ขาด ${tot.absent}` : `Abs ${tot.absent}`}
                      </span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-mono text-[10px] text-[var(--color-text-muted)] tabular-nums">
                  {lang === 'th' ? 'ตรงเวลา / สาย' : 'Pres / Late'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-0.5">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer"
          >
            {lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
          </button>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer"
          >
            {lang === 'th' ? 'ถัดไป' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
};
