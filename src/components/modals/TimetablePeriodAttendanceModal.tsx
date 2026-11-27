import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock } from 'lucide-react';
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
import { BaseModal } from '../common/BaseModal';

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

  const resolvedRoomLabel = slot
    ? (slot.room || slot.classRoom || matchedCourse?.room || 'ห้องเรียน').trim()
    : '';
  const timeSlotText = periodMeta ? `${periodMeta.startTime} - ${periodMeta.endTime}` : '08:30 - 09:20';

  return (
    <BaseModal
      isOpen={Boolean(isOpen && slot)}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      icon={<Clock className="w-5 h-5" />}
      title={
        slot
          ? lang === 'th'
            ? `รายชื่อและเช็คชื่อนักเรียน — ${slot.courseTitleTh}`
            : `Period Roster & Attendance — ${slot.courseTitleEn || slot.courseTitleTh}`
          : ''
      }
      subtitle={
        slot ? (
          <span className="inline-flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
              {slot.courseCode}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-bold">
              {lang === 'th'
                ? `คาบที่ ${slot.periodNumber} (${timeSlotText})`
                : `Period ${slot.periodNumber} (${timeSlotText})`}
            </span>
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              · {slot.classRoom} · {resolvedRoomLabel}
            </span>
          </span>
        ) : undefined
      }
      bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
      }
    >
      {slot && (
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
      )}
    </BaseModal>
  );
};

