import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  ListChecks,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import { Assignment, Course, TimetableSlot } from '../types';
import { buildTimetableIcs } from '../lib/timetableCalendar';
import { parseSlotTeachersFromRaw } from '../lib/timetableTeachers';
import { getHolidaysInRange } from '../lib/thaiHolidays';
import {
  buildAssignmentCalendarTemplateUrl,
  buildTimetableSlotCalendarTemplateUrl,
} from '../lib/googleCalendar';

interface GoogleCalendarSyncModalProps {
  slots: TimetableSlot[];
  assignments?: Assignment[];
  courses?: Course[];
  schoolId: string;
  schoolName: string;
  academicYear: string;
  semester: string;
  filterLabel: string;
  defaultStartDate: string;
  defaultEndDate: string;
  calendarWeekStart: string;
  onClose: () => void;
}

const DAY_LABELS_TH: Record<string, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
};

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  slots,
  assignments = [],
  courses = [],
  schoolId,
  schoolName,
  academicYear,
  semester,
  filterLabel,
  defaultStartDate,
  defaultEndDate,
  onClose,
}) => {
  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status !== 'closed' && Boolean(a.dueDate)),
    [assignments]
  );

  const [activeTab, setActiveTab] = useState<'export' | 'preview'>('export');
  const [includeTimetable, setIncludeTimetable] = useState(slots.length > 0);
  const [includeAssignments, setIncludeAssignments] = useState(activeAssignments.length > 0);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const coTaughtCount = useMemo(
    () =>
      slots.filter((s) =>
        Boolean(parseSlotTeachersFromRaw(s.teacherName, s.coTeacherName).coTeacherName)
      ).length,
    [slots]
  );

  const holidaysInRange = useMemo(
    () => getHolidaysInRange(startDate, endDate, schoolId),
    [startDate, endDate, schoolId]
  );

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const targetSlotCount = includeTimetable ? slots.length : 0;
  const targetAssignmentCount = includeAssignments ? activeAssignments.length : 0;
  const targetHolidayCount = includeHolidays ? holidaysInRange.length : 0;
  const totalExportCount = targetSlotCount + targetAssignmentCount + targetHolidayCount;

  const handleDownloadIcs = () => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      const icsContent = buildTimetableIcs(
        slots,
        startDate,
        endDate,
        `${schoolName} - ปฏิทินการเรียนการสอน (${academicYear}/${semester})`,
        schoolId,
        {
          assignments: activeAssignments,
          courses,
          includeTimetable,
          includeAssignments,
          includeHolidays,
        }
      );
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        slots.length === 0 && activeAssignments.length > 0
          ? `assignments-${academicYear}-${semester}.ics`
          : `timetable-${academicYear}-${semester}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusMsg(
        `ดาวน์โหลดไฟล์ .ics สำเร็จ (${targetSlotCount} คาบเรียน, ${targetAssignmentCount} กำหนดส่งงาน, ${targetHolidayCount} วันหยุด) นำเข้า Google Calendar, Apple Calendar หรือ Outlook ได้ทันที`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ .ics ได้');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-card)] text-[var(--color-text-body)] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--color-border)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-card-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-center border border-[var(--color-border)]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-title)]">
                เชื่อมต่อปฏิทินและตารางเรียน (.ics)
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {filterLabel} · {slots.length} คาบ{coTaughtCount > 0 ? ` (สอนคู่ ${coTaughtCount})` : ''} · {activeAssignments.length} งาน · {holidaysInRange.length} วันหยุดราชการ/โรงเรียน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {statusMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Standard info banner */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                ส่งออกปฏิทินมาตรฐานสากล (.ics) พร้อมวันหยุดราชการไทย
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                รวมตารางเรียน กำหนดส่งงาน และวันหยุดราชการไทย/วันหยุดชดเชย นำเข้า Google Calendar, Apple Calendar หรือ Outlook ได้ทันทีโดยไม่ต้องขอสิทธิ์บัญชีภายนอก
              </p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              ตั้งค่าและดาวน์โหลด .ics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              ดูรายการและเพิ่มรายคาบ ({totalExportCount})
            </button>
          </div>

          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Scope Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={includeTimetable}
                    disabled={slots.length === 0}
                    onChange={(e) => setIncludeTimetable(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)] tabular-nums">
                      ตารางเรียน ({slots.length} คาบ)
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      รายสัปดาห์ตลอดช่วงภาคเรียน
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={includeAssignments}
                    disabled={activeAssignments.length === 0}
                    onChange={(e) => setIncludeAssignments(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1 tabular-nums">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      กำหนดส่งงาน ({activeAssignments.length})
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      เตือนล่วงหน้า 24 ชม.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer hover:border-rose-400">
                  <input
                    type="checkbox"
                    checked={includeHolidays}
                    onChange={(e) => setIncludeHolidays(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-rose-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1 tabular-nums">
                      <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                      วันหยุดราชการ ({holidaysInRange.length})
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      รวมวันหยุดชดเชย &amp; โรงเรียน
                    </p>
                  </div>
                </label>
              </div>

              {(includeTimetable || includeHolidays) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-title)] mb-1.5">
                      วันเริ่มต้นช่วงปฏิทิน
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-title)] mb-1.5">
                      วันสิ้นสุดช่วงปฏิทิน
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Primary Download Card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-light)] p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                    พร้อมส่งออก: ตารางเรียน {targetSlotCount} คาบ · ส่งงาน {targetAssignmentCount} งาน · วันหยุด {targetHolidayCount} วัน (Asia/Bangkok)
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    ไฟล์ .ics รองรับ Google Calendar, Apple Calendar และ Outlook พร้อมรายละเอียดวิชา ห้อง และวันหยุดราชการ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={totalExportCount === 0}
                    onClick={handleDownloadIcs}
                    className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลดไฟล์ .ics ({totalExportCount} รายการ)
                  </button>

                  <a
                    href="https://calendar.google.com/calendar/r/settings/export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    เปิดหน้านำเข้า Google Calendar
                  </a>
                </div>
              </div>

              {/* 3-Step Import Guide */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-1.5">
                <p className="text-xs font-bold text-[var(--color-text-title)]">วิธีนำเข้าไฟล์ .ics เข้า Google Calendar</p>
                <ol className="text-[11px] text-[var(--color-text-muted)] space-y-1 list-decimal list-inside">
                  <li>กดปุ่ม <span className="font-semibold text-[var(--color-text-title)]">ดาวน์โหลดไฟล์ .ics</span> ด้านบน</li>
                  <li>กด <span className="font-semibold text-[var(--color-text-title)]">เปิดหน้านำเข้า Google Calendar</span> (การตั้งค่า &gt; นำเข้าและส่งออก)</li>
                  <li>เลือกไฟล์ .ics ที่ดาวน์โหลดไว้ แล้วกด <span className="font-semibold text-[var(--color-text-title)]">นำเข้า (Import)</span></li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {totalExportCount === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                  กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูลในแท็บตั้งค่าเพื่อดูรายการ
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {includeTimetable &&
                    slots.map((slot) => {
                      const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(
                        slot.teacherName,
                        slot.coTeacherName
                      );
                      const addUrl = buildTimetableSlotCalendarTemplateUrl({
                        slot,
                        startDateValue: startDate,
                        endDateValue: endDate,
                      });
                      return (
                        <div
                          key={slot.id}
                          className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-blue-400 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                              {slot.courseCode} - {slot.courseTitleTh || slot.courseTitleEn} · {slot.classRoom}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                วัน{DAY_LABELS_TH[slot.dayOfWeek] || slot.dayOfWeek} · คาบ {slot.periodNumber} ({slot.startTime} - {slot.endTime})
                              </span>
                              {(slot.room || slot.classRoom) && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {slot.room || slot.classRoom}
                                </span>
                              )}
                            </div>
                            {(teacherName || coTeacherName) && (
                              <p className="text-[11px] text-[var(--color-text-muted)] mt-1 inline-flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-600" />
                                {teacherName}
                                {coTeacherName ? ` · ครูสอนคู่: ${coTeacherName}` : ''}
                              </p>
                            )}
                          </div>
                          {addUrl && (
                            <a
                              href={addUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-title)] hover:text-blue-600 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              เพิ่มลงปฏิทิน
                            </a>
                          )}
                        </div>
                      );
                    })}

                  {includeAssignments &&
                    activeAssignments.map((assignment) => {
                      const course = courseMap.get(assignment.courseId);
                      const courseCode = assignment.courseCode || course?.code || '';
                      const addUrl = buildAssignmentCalendarTemplateUrl({
                        assignment,
                        courses,
                      });
                      return (
                        <div
                          key={assignment.id}
                          className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-indigo-400 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                              {courseCode ? `[${courseCode}] ` : ''}
                              {assignment.titleTh || assignment.titleEn} · กำหนดส่งงาน
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ครบกำหนด: {assignment.dueDate}
                              </span>
                            </div>
                          </div>
                          {addUrl && (
                            <a
                              href={addUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-title)] hover:text-indigo-600 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              เพิ่มลงปฏิทิน
                            </a>
                          )}
                        </div>
                      );
                    })}

                  {includeHolidays &&
                    holidaysInRange.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            {holiday.nameTh} · {holiday.type === 'school' ? 'วันหยุดโรงเรียน' : 'วันหยุดราชการ'}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-1 tabular-nums">
                            {holiday.date} · {holiday.nameEn}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
