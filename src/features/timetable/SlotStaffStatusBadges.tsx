import React from 'react';
import {
  AttendanceRecord,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  Student,
  Teacher,
  TimetableSlot,
} from '../../types';
import { getSlotAttendanceAndLeaveSummary } from '../../lib/timetableAttendanceStatus';

interface SlotStaffStatusBadgesProps {
  slot: TimetableSlot;
  dateStr: string;
  isHolidayOff: boolean;
  isPersonalViewer: boolean;
  todayBangkokDate: string;
  courses: Course[];
  students: Student[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
}

export const SlotStaffStatusBadges: React.FC<SlotStaffStatusBadgesProps> = ({
  slot,
  dateStr,
  isHolidayOff,
  isPersonalViewer,
  todayBangkokDate,
  courses,
  students,
  teachers,
  attendance,
  periodAttendance,
  leaveRequests,
}) => {
  if (isPersonalViewer || isHolidayOff) return null;
  const summary = getSlotAttendanceAndLeaveSummary({
    slot,
    dateStr,
    courses,
    students,
    teachers,
    attendance,
    periodAttendance,
    leaveRequests,
  });

  const leavingTeacher = summary.teacherStatuses.find(
    (ts) => ts.status === 'on_leave_approved' || ts.status === 'on_leave_pending'
  );
  const primaryTeacher = summary.teacherStatuses[0];
  const isTodayDate = dateStr === todayBangkokDate;
  const hasTeacherGateRecord =
    primaryTeacher &&
    (primaryTeacher.status === 'checked_in' ||
      primaryTeacher.status === 'late' ||
      primaryTeacher.status === 'absent');

  const showTeacherBadge =
    Boolean(leavingTeacher) ||
    Boolean(hasTeacherGateRecord && dateStr <= todayBangkokDate) ||
    Boolean(primaryTeacher && isTodayDate);

  const showStudentSummary =
    summary.periodCheckedTotal > 0 ||
    summary.studentLeaveCount > 0 ||
    (isTodayDate && summary.hasAnyGateRecordsForDate && summary.expectedTotal > 0);

  if (!showTeacherBadge && !showStudentSummary) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 print:hidden">
      {leavingTeacher && (
        <span
          title={
            leavingTeacher.substituteTeacherName
              ? `${leavingTeacher.teacherName} ลา · ครูสอนแทน: ${leavingTeacher.substituteTeacherName}`
              : `${leavingTeacher.teacherName} ยื่นใบลา`
          }
          className="inline-flex items-center gap-0.5 rounded bg-rose-100 dark:bg-rose-950/90 px-1.5 py-0.5 text-[9px] font-bold text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
        >
          <span>
            ครูลา{leavingTeacher.substituteTeacherName ? ` · แทน ${leavingTeacher.substituteTeacherName.split(' ')[0]}` : ''}
          </span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'checked_in' && dateStr <= todayBangkokDate && (
        <span
          title={`${primaryTeacher.teacherName} เช็คอินเข้าโรงเรียนแล้ว${primaryTeacher.checkInTime ? ` เวลา ${primaryTeacher.checkInTime}` : ''}`}
          className="inline-flex items-center gap-0.5 rounded bg-emerald-100/90 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-200 tabular-nums"
        >
          <span>ครูเข้า รร.{primaryTeacher.checkInTime ? ` ${primaryTeacher.checkInTime}` : ''}</span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'late' && dateStr <= todayBangkokDate && (
        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 dark:text-amber-200 tabular-nums">
          <span>ครูสาย รร.</span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'absent' && dateStr <= todayBangkokDate && (
        <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 text-[9px] font-bold text-rose-800 dark:text-rose-200">
          <span>ครูขาด</span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'not_checked_in' && isTodayDate && (
        <span
          title={`${primaryTeacher.teacherName} ยังไม่เช็คอินเข้าโรงเรียนวันนี้`}
          className="inline-flex items-center gap-0.5 rounded bg-amber-50 dark:bg-amber-950/70 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700"
        >
          <span>ครูยังไม่เข้า รร.</span>
        </span>
      )}

      {summary.periodCheckedTotal > 0 ? (
        <>
          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
            <span>มา {summary.periodPresent + summary.periodLate}/{summary.expectedTotal}</span>
          </span>
          {summary.periodExcused > 0 && (
            <span className="inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-950/80 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800 dark:text-indigo-200 tabular-nums">
              ลา {summary.periodExcused}
            </span>
          )}
          {summary.periodAbsent > 0 && (
            <span className="inline-flex items-center rounded bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 text-[9px] font-bold text-rose-800 dark:text-rose-200 tabular-nums">
              ขาด {summary.periodAbsent}
            </span>
          )}
        </>
      ) : (
        <>
          {summary.studentLeaveCount > 0 && (
            <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 dark:text-amber-200 tabular-nums">
              นร.ลา {summary.studentLeaveCount}
            </span>
          )}
          {isTodayDate && summary.hasAnyGateRecordsForDate && summary.expectedTotal > 0 && (
            <span className="inline-flex items-center rounded bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              เข้า รร. {summary.gatePresentCount}/{summary.expectedTotal}
            </span>
          )}
        </>
      )}
    </div>
  );
};
