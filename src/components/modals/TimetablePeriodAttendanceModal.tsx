import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  Course,
  LeaveRequest,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../../types';
import { resolveMatchedCourseForSlot } from '../../lib/timetableAttendanceStatus';
import { TimetablePeriodRosterTable } from '../TimetablePeriodRosterTable';

interface TimetablePeriodAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: TimetableSlot | null;
  initialDate: string;
  schoolId: string;
  courses: Course[];
  students: Student[];
  teachers?: Teacher[];
  schoolPeriods: SchoolPeriodTime[];
  attendance?: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  currentUser?: AuthUser | null;
  lang: AppLanguage;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
}

export const TimetablePeriodAttendanceModal: React.FC<TimetablePeriodAttendanceModalProps> = ({
  isOpen,
  onClose,
  slot,
  initialDate,
  schoolId,
  courses,
  students,
  teachers = [],
  schoolPeriods,
  attendance = [],
  periodAttendance,
  leaveRequests = [],
  currentUser,
  lang,
  onRecordPeriodAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialDate);
    }
  }, [isOpen, initialDate, slot?.id]);

  const matchedCourse = useMemo(
    () => (slot ? resolveMatchedCourseForSlot(slot, courses) : undefined),
    [courses, slot]
  );

  const periodMeta = useMemo(() => {
    if (!slot) return null;
    const found = schoolPeriods.find((p) => p.periodNumber === slot.periodNumber);
    return {
      startTime: found?.startTime || slot.startTime || '08:30',
      endTime: found?.endTime || slot.endTime || '09:20',
    };
  }, [schoolPeriods, slot]);

  if (!isOpen || !slot) return null;

  const resolvedRoomLabel = (slot.room || slot.classRoom || matchedCourse?.room || 'ห้องเรียน').trim();
  const timeSlotText = periodMeta ? `${periodMeta.startTime} - ${periodMeta.endTime}` : '08:30 - 09:20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-period-roster-title"
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] flex items-start justify-between gap-3 shrink-0 bg-[var(--color-card)]">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                {slot.courseCode}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-bold">
                <Clock className="w-3 h-3" />
                <span>
                  {lang === 'th'
                    ? `คาบที่ ${slot.periodNumber} (${timeSlotText})`
                    : `Period ${slot.periodNumber} (${timeSlotText})`}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                · {slot.classRoom} · {resolvedRoomLabel}
              </span>
            </div>
            <h3
              id="timetable-period-roster-title"
              className="text-base font-bold text-[var(--color-text-title)] truncate"
            >
              {lang === 'th'
                ? `รายชื่อและเช็คชื่อนักเรียน — ${slot.courseTitleTh}`
                : `Period Roster & Attendance — ${slot.courseTitleEn || slot.courseTitleTh}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างเช็คชื่อรายคาบ"
            className="p-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reusable Structured Roster Table */}
        <TimetablePeriodRosterTable
          slot={slot}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
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
        />

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>บันทึกข้อมูลรายคาบลงฐานข้อมูลทันที เพื่อใช้คำนวณ ปพ.5 / มส. และ Report / Monitor</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold cursor-pointer ml-auto"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
