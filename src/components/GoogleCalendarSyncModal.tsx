import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
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

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const targetSlotCount = includeTimetable ? slots.length : 0;
  const targetAssignmentCount = includeAssignments ? activeAssignments.length : 0;
  const totalExportCount = targetSlotCount + targetAssignmentCount;

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
        `ดาวน์โหลดไฟล์ .ics สำเร็จ (${targetSlotCount} คาบเรียน, ${targetAssignmentCount} กำหนดส่งงาน) สามารถนำเข้าได้ทันทีใน Google Calendar, Apple Calendar หรือ Outlook`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ .ics ได้');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ส่งออกปฏิทินและตารางสอน (.ics)</h3>
              <p className="text-xs text-slate-500">
                {filterLabel} · ตารางสอน {slots.length} คาบ{coTaughtCount > 0 ? ` (สอนคู่ ${coTaughtCount})` : ''} · งานที่มอบหมาย {activeAssignments.length} งาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {statusMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Supabase-native info banner */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                ส่งออกปฏิทินมาตรฐานสากล (.ics) จากข้อมูล Supabase โดยตรง
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                ไม่ต้องเชื่อมต่อ Firebase หรือขอสิทธิ์บัญชีภายนอก สามารถดาวน์โหลดไฟล์ <span className="font-semibold">.ics</span> เพื่อนำเข้า Google Calendar, Apple Calendar หรือ Outlook ได้ทันที
              </p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              ตั้งค่าและดาวน์โหลด .ics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              ดูรายการและเพิ่มรายคาบ ({totalExportCount})
            </button>
          </div>

          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Scope Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-white cursor-pointer hover:border-blue-300">
                  <input
                    type="checkbox"
                    checked={includeTimetable}
                    disabled={slots.length === 0}
                    onChange={(e) => setIncludeTimetable(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      ตารางเรียน / ตารางสอน ({slots.length} คาบ)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      กิจกรรมรายสัปดาห์ตลอดช่วงภาคเรียน รวมครูสอนคู่
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-white cursor-pointer hover:border-blue-300">
                  <input
                    type="checkbox"
                    checked={includeAssignments}
                    disabled={activeAssignments.length === 0}
                    onChange={(e) => setIncludeAssignments(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      กำหนดส่งงาน/การบ้าน ({activeAssignments.length} งาน)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      นัดหมายวันครบกำหนดส่งพร้อมแจ้งเตือนล่วงหน้า 24 ชม.
                    </p>
                  </div>
                </label>
              </div>

              {includeTimetable && slots.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      วันเริ่มต้นภาคเรียน
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      วันสิ้นสุดภาคเรียน
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Primary Download Card */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-blue-950">
                    พร้อมส่งออก: ตารางเรียน {targetSlotCount} คาบ + กำหนดส่งงาน {targetAssignmentCount} งาน (Asia/Bangkok)
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    ไฟล์ .ics รองรับการนำเข้าทุกแพลตฟอร์มปฏิทิน พร้อมรายละเอียดรายวิชา ห้องเรียน และครูผู้สอน
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={totalExportCount === 0}
                    onClick={handleDownloadIcs}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลดไฟล์ .ics ({totalExportCount} รายการ)
                  </button>

                  <a
                    href="https://calendar.google.com/calendar/r/settings/export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    เปิดหน้านำเข้า Google Calendar
                  </a>
                </div>
              </div>

              {/* 3-Step Import Guide */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                <p className="text-xs font-bold text-slate-800">วิธีนำเข้าไฟล์ .ics เข้า Google Calendar</p>
                <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside">
                  <li>กดปุ่ม <span className="font-semibold text-slate-800">ดาวน์โหลดไฟล์ .ics</span> ด้านบน</li>
                  <li>กด <span className="font-semibold text-slate-800">เปิดหน้านำเข้า Google Calendar</span> (เมนู การตั้งค่า &gt; นำเข้าและส่งออก)</li>
                  <li>เลือกไฟล์ .ics ที่ดาวน์โหลดไว้ แล้วกด <span className="font-semibold text-slate-800">นำเข้า (Import)</span> รายการทั้งหมดจะปรากฏทันที</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {totalExportCount === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
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
                          className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {slot.courseCode} - {slot.courseTitleTh || slot.courseTitleEn} ({slot.classRoom})
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                ตารางสอน
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
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
                              <p className="text-[11px] text-slate-600 mt-1 inline-flex items-center gap-1">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:border-blue-200 shrink-0"
                              title="เพิ่มรายการนี้เข้า Google Calendar"
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
                          className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {courseCode ? `[${courseCode}] ` : ''}
                                {assignment.titleTh || assignment.titleEn}
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                กำหนดส่งงาน
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 shrink-0"
                              title="เพิ่มกำหนดส่งงานนี้เข้า Google Calendar"
                            >
                              <ExternalLink className="w-3 h-3" />
                              เพิ่มลงปฏิทิน
                            </a>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
