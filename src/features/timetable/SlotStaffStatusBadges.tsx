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
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 print:hidden text-[9px] font-bold">
      {leavingTeacher && (
        <span
          title={
            leavingTeacher.substituteTeacherName
              ? `${leavingTeacher.teacherName} ลา · ครูสอนแทน: ${leavingTeacher.substituteTeacherName}`
              : `${leavingTeacher.teacherName} ยื่นใบลา`
          }
          className="inline-flex items-center gap-1 text-rose-800 dark:text-rose-200 whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
          <span>
            ครูลา{leavingTeacher.substituteTeacherName ? ` · แทน ${leavingTeacher.substituteTeacherName.split(' ')[0]}` : ''}
          </span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'checked_in' && dateStr <= todayBangkokDate && (
        <span
          title={`${primaryTeacher.teacherName} เช็คอินเข้าโรงเรียนแล้ว${primaryTeacher.checkInTime ? ` เวลา ${primaryTeacher.checkInTime}` : ''}`}
          className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-200 tabular-nums whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <span>ครูเข้า รร.{primaryTeacher.checkInTime ? ` ${primaryTeacher.checkInTime}` : ''}</span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'late' && dateStr <= todayBangkokDate && (
        <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200 tabular-nums whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
          <span>ครูสาย รร.</span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'absent' && dateStr <= todayBangkokDate && (
        <span className="inline-flex items-center gap-1 text-rose-800 dark:text-rose-200 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
          <span>ครูขาด</span>
        </span>
      )}
      {!leavingTeacher && primaryTeacher && primaryTeacher.status === 'not_checked_in' && isTodayDate && (
        <span
          title={`${primaryTeacher.teacherName} ยังไม่เช็คอินเข้าโรงเรียนวันนี้`}
          className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200 whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
          <span>ครูรอเข้า รร.</span>
        </span>
      )}

      {summary.periodCheckedTotal > 0 ? (
        <>
          <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-200 tabular-nums whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <span>มา {summary.periodPresent + summary.periodLate}/{summary.expectedTotal}</span>
          </span>
          {summary.periodExcused > 0 && (
            <span className="inline-flex items-center gap-1 text-sky-800 dark:text-sky-200 tabular-nums whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
              <span>ลา {summary.periodExcused}</span>
            </span>
          )}
          {summary.periodAbsent > 0 && (
            <span className="inline-flex items-center gap-1 text-rose-800 dark:text-rose-200 tabular-nums whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
              <span>ขาด {summary.periodAbsent}</span>
            </span>
          )}
        </>
      ) : (
        <>
          {summary.studentLeaveCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-200 tabular-nums whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <span>นร.ลา {summary.studentLeaveCount}</span>
            </span>
          )}
          {isTodayDate && summary.hasAnyGateRecordsForDate && summary.expectedTotal > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
              <span>เข้า รร. {summary.gatePresentCount}/{summary.expectedTotal}</span>
            </span>
          )}
        </>
      )}
    </div>
  );
};
