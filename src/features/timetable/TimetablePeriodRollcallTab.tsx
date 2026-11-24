import React from 'react';
import { BookOpen, Calendar, CalendarDays, UserCheck } from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  Course,
  DayOfWeek,
  LeaveRequest,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../../types';
import { getHolidayForDate } from '../../lib/thaiHolidays';
import { BangkokClockSnapshot, getTimetableSlotActivityStatus } from '../../lib/timetableCalendar';
import { getSlotAttendanceAndLeaveSummary } from '../../lib/timetableAttendanceStatus';
import { TimetablePeriodRosterTable } from '../../components/TimetablePeriodRosterTable';

interface TimetablePeriodRollcallTabProps {
  rollcallDate: string;
  setRollcallDate: (date: string) => void;
  rollcallSlotId: string;
  setRollcallSlotId: (slotId: string) => void;
  todayBangkokDate: string;
  bangkokClock: BangkokClockSnapshot;
  schoolId: string;
  activeSlots: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  courses: Course[];
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
  renderRoomAndTermControls: (showRoomFilter?: boolean) => React.ReactNode;
}

export const TimetablePeriodRollcallTab: React.FC<TimetablePeriodRollcallTabProps> = ({
  rollcallDate,
  setRollcallDate,
  rollcallSlotId,
  setRollcallSlotId,
  todayBangkokDate,
  bangkokClock,
  schoolId,
  activeSlots,
  schoolPeriods,
  courses,
  students,
  teachers,
  attendance,
  periodAttendance,
  leaveRequests,
  currentUser,
  lang,
  onRecordPeriodAttendance,
  renderRoomAndTermControls,
}) => {
  const parsedRollcallDate = new Date(`${rollcallDate}T12:00:00`);
  const rollcallJsDay = Number.isNaN(parsedRollcallDate.getTime()) ? 1 : parsedRollcallDate.getDay();
  const rollcallWeekdayMap: Record<number, DayOfWeek> = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
  };
  const rollcallDayKey: DayOfWeek | null = rollcallWeekdayMap[rollcallJsDay] || null;
  const rollcallHoliday = getHolidayForDate(rollcallDate, schoolId);
  const daySlots = rollcallDayKey
    ? activeSlots
        .filter((s) => s.dayOfWeek === rollcallDayKey)
        .slice()
        .sort((a, b) => a.periodNumber - b.periodNumber)
    : [];
  const activeRollcallSlot =
    daySlots.find((s) => s.id === rollcallSlotId) ||
    daySlots.find((s) =>
      getTimetableSlotActivityStatus({
        slot: s,
        schoolPeriods,
        now: bangkokClock,
        schoolId,
        targetDateStr: rollcallDate,
      }).isActive
    ) ||
    daySlots[0] ||
    null;

  return (
    <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
      <header className="shrink-0 border-b border-[var(--color-border)] px-3 py-2.5 space-y-2 bg-[var(--color-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-title)]">
              <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>เช็กชื่อและสถานะการเข้าเรียนรายคาบ</span>
            </h2>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              ดึงสถานะเช็คอินเข้าโรงเรียนและใบลาอัตโนมัติ · บันทึกลงฐานข้อมูลเชื่อมรายงาน ปพ.5 / Report ทันที
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-body)]">
              <span>วันที่:</span>
              <input
                type="date"
                value={rollcallDate}
                onChange={(e) => setRollcallDate(e.target.value || todayBangkokDate)}
                className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold text-[var(--color-text-title)] tabular-nums"
              />
            </label>
            {renderRoomAndTermControls()}
          </div>
        </div>

        {rollcallHoliday && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>วันหยุด: {rollcallHoliday.nameTh} ({rollcallHoliday.nameEn})</span>
          </div>
        )}

        {daySlots.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {daySlots.map((slot) => {
              const isSelected = activeRollcallSlot?.id === slot.id;
              const slotSum = getSlotAttendanceAndLeaveSummary({
                slot,
                dateStr: rollcallDate,
                courses,
                students,
                teachers,
                attendance,
                periodAttendance,
                leaveRequests,
              });
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setRollcallSlotId(slot.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold cursor-pointer transition ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/15">
                    คาบ {slot.periodNumber}
                  </span>
                  <span className="truncate max-w-[160px]">
                    {slot.courseCode} · {slot.courseTitleTh}
                  </span>
                  <span className="text-[10px] opacity-85">({slot.classRoom})</span>
                  {slotSum.periodCheckedTotal > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {slotSum.periodPresent + slotSum.periodLate}/{slotSum.expectedTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {!rollcallDayKey ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--color-text-muted)] space-y-2">
          <Calendar className="w-9 h-9 opacity-50" />
          <p>วันที่เลือกตรงกับวันหยุดสุดสัปดาห์ (ไม่มีตารางเรียนปกติ)</p>
        </div>
      ) : !activeRollcallSlot ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--color-text-muted)] space-y-2">
          <BookOpen className="w-9 h-9 opacity-50" />
          <p>ไม่พบคาบเรียนในวันและตัวกรองที่เลือก กรุณาเปลี่ยนวันที่หรือเลือกห้องเรียนอื่น</p>
        </div>
      ) : (
        <TimetablePeriodRosterTable
          slot={activeRollcallSlot}
          selectedDate={rollcallDate}
          onDateChange={setRollcallDate}
          schoolId={schoolId}
          courses={courses}
          students={students}
          teachers={teachers}
          schoolPeriods={schoolPeriods}
          attendance={attendance}
          periodAttendance={periodAttendance}
          leaveRequests={leaveRequests}
          currentUser={currentUser}
          lang={lang}
          onRecordPeriodAttendance={onRecordPeriodAttendance}
          showDatePicker={false}
          compactHeader={true}
        />
      )}
    </section>
  );
};
