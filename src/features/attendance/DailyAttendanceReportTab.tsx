import React, { useMemo, useState } from 'react';
import { CalendarDays, ClipboardCheck, Search } from 'lucide-react';
import { PagedList } from '../../components/PagedList';
import { TableActionMenu } from '../../components/common/TableActionMenu';
import { StatusBadge, type StatusBadgeStatus } from '../../components/common/StatusBadge';
import type {
  AttendanceCheckType,
  AttendanceRecord,
  PeriodAttendanceRecord,
  Student,
} from '../../types';
import type {
  DailyPeriodReportSession,
  GateAttendanceReportRow,
} from '../../lib/attendanceDailyReport';

interface DailyAttendanceReportTabProps {
  date: string;
  setDate: (date: string) => void;
  gateRows: GateAttendanceReportRow[];
  periodSessions: DailyPeriodReportSession[];
  lang: 'th' | 'en';
  holidayLabel?: string | null;
  onEditGateRecord: (student: Student, checkType: AttendanceCheckType) => void;
  onEditPeriodRecord: (student: Student, session: DailyPeriodReportSession) => void;
}

type AttendanceFilter = 'all' | 'missing' | 'complete';

function studentName(student: Student, lang: 'th' | 'en'): string {
  return lang === 'th'
    ? `${student.firstNameTh} ${student.lastNameTh}`.trim()
    : `${student.firstNameEn} ${student.lastNameEn}`.trim();
}

function attendanceLabel(status: AttendanceRecord['status'], lang: 'th' | 'en'): string {
  const labels = {
    present: ['มา', 'Present'],
    late: ['สาย', 'Late'],
    absent: ['ขาด', 'Absent'],
    sick: ['ลาป่วย', 'Sick leave'],
    leave: ['ลา', 'On leave'],
  } as const;
  return labels[status][lang === 'th' ? 0 : 1];
}

function getPeriodRecord(
  records: PeriodAttendanceRecord[],
  studentId: string
): PeriodAttendanceRecord | undefined {
  const sortedRecords = records
    .filter((record) => record.studentId === studentId && record.recordType !== 'check_out')
    .sort((a, b) => (a.actualCheckInTime || '').localeCompare(b.actualCheckInTime || ''));
  return sortedRecords[sortedRecords.length - 1];
}

function matchesStudent(student: Student, query: string, lang: 'th' | 'en'): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || [
    studentName(student, lang),
    student.studentIdNumber,
    student.gradeLevel,
    student.room,
  ].some((value) => value.toLocaleLowerCase().includes(normalized));
}

function AttendanceBadge({
  record,
  lang,
  label,
}: {
  record?: AttendanceRecord | PeriodAttendanceRecord;
  lang: 'th' | 'en';
  label?: string;
}) {
  if (!record) {
    return (
      <StatusBadge
        status="delayed"
        size="xs"
        label={`${label ? `${label}: ` : ''}${lang === 'th' ? 'ตกหล่น' : 'Missing'}`}
      />
    );
  }

  const statusLabel = record.status === 'excused'
    ? (lang === 'th' ? 'มีเหตุผล' : 'Excused')
    : attendanceLabel(record.status, lang);
  const time = 'time' in record ? record.time : record.actualCheckInTime;
  const status: StatusBadgeStatus = record.status === 'present'
    ? 'complete'
    : record.status === 'late'
      ? 'pending'
      : record.status === 'absent'
        ? 'delayed'
        : 'info';

  return (
    <StatusBadge
      status={status}
      size="xs"
      label={`${label ? `${label}: ` : ''}${statusLabel}${time ? ` · ${time.slice(0, 5)}` : ''}`}
    />
  );
}

export const DailyAttendanceReportTab: React.FC<DailyAttendanceReportTabProps> = ({
  date,
  setDate,
  gateRows,
  periodSessions,
  lang,
  holidayLabel,
  onEditGateRecord,
  onEditPeriodRecord,
}) => {
  const [gateSearch, setGateSearch] = useState('');
  const [gateRoom, setGateRoom] = useState('all');
  const [gateStatus, setGateStatus] = useState<AttendanceFilter>('all');
  const [periodSearch, setPeriodSearch] = useState('');
  const [periodCourse, setPeriodCourse] = useState('all');
  const [periodStatus, setPeriodStatus] = useState<AttendanceFilter>('all');

  const gateRooms = useMemo(
    () => Array.from(new Set(gateRows.map(({ student }) => `${student.gradeLevel} ${student.room}`.trim())))
      .sort((a, b) => a.localeCompare(b, lang === 'th' ? 'th' : 'en')),
    [gateRows, lang]
  );
  const gateRowsFiltered = gateRows.filter(({ student, checkIn, checkOut }) => {
    const complete = Boolean(checkIn && checkOut);
    return (
      matchesStudent(student, gateSearch, lang) &&
      (gateRoom === 'all' || `${student.gradeLevel} ${student.room}`.trim() === gateRoom) &&
      (gateStatus === 'all' || (gateStatus === 'complete' ? complete : !complete))
    );
  });
  const periodSessionsFiltered = periodSessions.filter((session) =>
    periodCourse === 'all' || session.courseId === periodCourse
  );
  const periodExpectedCount = periodSessions.reduce((total, session) => total + session.students.length, 0);
  const periodRecordedCount = periodSessions.reduce(
    (total, session) => total + session.students.filter((student) => getPeriodRecord(session.records, student.id)).length,
    0
  );

  const renderPeriodStudent = (student: Student, session: DailyPeriodReportSession) => {
    const record = getPeriodRecord(session.records, student.id);
    if (!matchesStudent(student, periodSearch, lang)) return null;
    if (periodStatus === 'missing' && record) return null;
    if (periodStatus === 'complete' && !record) return null;

    return (
      <div key={student.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="type-card-title truncate">{studentName(student, lang)}</p>
          <p className="type-meta truncate">{student.studentIdNumber} · {student.gradeLevel} {student.room}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AttendanceBadge record={record} lang={lang} />
          <TableActionMenu
            ariaLabel={lang === 'th' ? `แก้ไขการเข้าเรียน ${studentName(student, lang)}` : `Edit attendance for ${studentName(student, lang)}`}
            items={[
              {
                id: 'edit-period',
                label: lang === 'th' ? (record ? 'แก้ไขรายการคาบนี้' : 'ลงชื่อคาบนี้ที่ตกหล่น') : (record ? 'Edit this period' : 'Record missing period'),
                variant: 'primary',
                onClick: () => onEditPeriodRecord(student, session),
              },
            ]}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 overflow-y-auto pb-4">
      <section className="saas-card">
        <div className="saas-card-body flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="type-section-title flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[var(--color-primary-text)]" />
              {lang === 'th' ? 'รายงานสถานะประจำวัน' : 'Daily Attendance Report'}
            </h2>
            <p className="type-meta mt-1">
              {lang === 'th'
                ? 'ตรวจรายการเข้า-ออกโรงเรียนและคาบเรียนตามตารางสอนของวันที่เลือก'
                : 'Review school arrival/departure and scheduled lessons for the selected date.'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-body)]">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>{lang === 'th' ? 'วันที่รายงาน' : 'Report date'}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 text-xs"
            />
          </label>
        </div>
      </section>

      <section className="saas-card">
        <div className="saas-card-header">
          <div>
            <h3 className="type-card-title">{lang === 'th' ? 'เข้า-ออกโรงเรียน' : 'School arrival / departure'}</h3>
            <p className="type-meta mt-0.5">
              {lang === 'th'
                ? `เช็คเข้า ${gateRows.filter((row) => row.checkIn).length}/${gateRows.length} · เช็คออก ${gateRows.filter((row) => row.checkOut).length}/${gateRows.length}`
                : `Arrivals ${gateRows.filter((row) => row.checkIn).length}/${gateRows.length} · Departures ${gateRows.filter((row) => row.checkOut).length}/${gateRows.length}`}
            </p>
          </div>
          <StatusBadge
            size="sm"
            status={gateRows.some((row) => !row.checkIn || !row.checkOut) ? 'pending' : 'complete'}
            label={lang === 'th' ? `ตกหล่น ${gateRows.filter((row) => !row.checkIn || !row.checkOut).length} คน` : `${gateRows.filter((row) => !row.checkIn || !row.checkOut).length} incomplete`}
          />
        </div>
        <div className="saas-card-body space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={gateSearch}
                onChange={(event) => setGateSearch(event.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อหรือรหัสนักเรียน' : 'Search student or ID'}
                aria-label={lang === 'th' ? 'ค้นหารายงานเข้าออกโรงเรียน' : 'Search school attendance'}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-2 pl-8 pr-2 text-xs"
              />
            </label>
            <select
              value={gateRoom}
              onChange={(event) => setGateRoom(event.target.value)}
              aria-label={lang === 'th' ? 'กรองรายงานตามห้อง' : 'Filter report by room'}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs"
            >
              <option value="all">{lang === 'th' ? 'ทุกห้องประจำชั้น' : 'All homerooms'}</option>
              {gateRooms.map((room) => <option key={room} value={room}>{room}</option>)}
            </select>
            <select
              value={gateStatus}
              onChange={(event) => setGateStatus(event.target.value as AttendanceFilter)}
              aria-label={lang === 'th' ? 'กรองสถานะเข้าออก' : 'Filter arrival/departure status'}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs"
            >
              <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All statuses'}</option>
              <option value="missing">{lang === 'th' ? 'มีรายการตกหล่น' : 'Incomplete'}</option>
              <option value="complete">{lang === 'th' ? 'ครบทั้งเข้าและออก' : 'Complete'}</option>
            </select>
          </div>
          <PagedList
            items={gateRowsFiltered}
            pageSize={10}
            paginationLabel={lang === 'th' ? 'แบ่งหน้ารายชื่อเข้าออกโรงเรียน' : 'School attendance pagination'}
            emptyState={<p className="type-meta py-4 text-center">{lang === 'th' ? 'ไม่พบรายชื่อตามตัวกรอง' : 'No students match these filters.'}</p>}
            renderItem={({ student, checkIn, checkOut }) => (
              <div key={student.id} className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] py-2 first:border-0">
                <div className="min-w-0 flex-1">
                  <p className="type-card-title truncate">{studentName(student, lang)}</p>
                  <p className="type-meta truncate">{student.studentIdNumber} · {student.gradeLevel} {student.room}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <AttendanceBadge record={checkIn} lang={lang} label={lang === 'th' ? 'เข้า' : 'In'} />
                    <AttendanceBadge record={checkOut} lang={lang} label={lang === 'th' ? 'ออก' : 'Out'} />
                  </div>
                </div>
                <TableActionMenu
                  ariaLabel={lang === 'th' ? `แก้ไขการเข้าออก ${studentName(student, lang)}` : `Edit school attendance for ${studentName(student, lang)}`}
                  items={(['check_in', 'check_out'] as AttendanceCheckType[]).map((checkType) => ({
                    id: checkType,
                    label: lang === 'th'
                      ? `${checkType === 'check_in' ? 'แก้ไข/ลงชื่อเข้า' : 'แก้ไข/ลงชื่อออก'}โรงเรียน`
                      : `Edit / record ${checkType === 'check_in' ? 'arrival' : 'departure'}`,
                    variant: checkType === 'check_in' ? 'success' : 'primary',
                    onClick: () => onEditGateRecord(student, checkType),
                  }))}
                />
              </div>
            )}
          />
        </div>
      </section>

      <section className="saas-card">
        <div className="saas-card-header">
          <div>
            <h3 className="type-card-title">{lang === 'th' ? 'เช็คชื่อรายคาบตามตาราง' : 'Scheduled lesson attendance'}</h3>
            <p className="type-meta mt-0.5">
              {lang === 'th'
                ? `บันทึกแล้ว ${periodRecordedCount}/${periodExpectedCount} รายการ`
                : `${periodRecordedCount}/${periodExpectedCount} records entered`}
            </p>
          </div>
          <StatusBadge
            size="sm"
            status={periodExpectedCount - periodRecordedCount > 0 ? 'pending' : 'complete'}
            label={lang === 'th' ? `ตกหล่น ${periodExpectedCount - periodRecordedCount} รายการ` : `${periodExpectedCount - periodRecordedCount} missing`}
          />
        </div>
        <div className="saas-card-body space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={periodSearch}
                onChange={(event) => setPeriodSearch(event.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อนักเรียนหรือรหัส' : 'Search student or ID'}
                aria-label={lang === 'th' ? 'ค้นหารายงานรายคาบ' : 'Search period attendance'}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-2 pl-8 pr-2 text-xs"
              />
            </label>
            <select
              value={periodCourse}
              onChange={(event) => setPeriodCourse(event.target.value)}
              aria-label={lang === 'th' ? 'กรองตามรายวิชา' : 'Filter by course'}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs"
            >
              <option value="all">{lang === 'th' ? 'ทุกรายวิชา' : 'All courses'}</option>
              {Array.from(new Map(periodSessions.map((session) => [session.courseId, `${session.courseCode} · ${lang === 'th' ? session.courseTitleTh : session.courseTitleEn}`])).entries()).map(([courseId, label]) => (
                <option key={courseId} value={courseId}>{label}</option>
              ))}
            </select>
            <select
              value={periodStatus}
              onChange={(event) => setPeriodStatus(event.target.value as AttendanceFilter)}
              aria-label={lang === 'th' ? 'กรองสถานะรายคาบ' : 'Filter period status'}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-2 text-xs"
            >
              <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All statuses'}</option>
              <option value="missing">{lang === 'th' ? 'มีรายการตกหล่น' : 'Missing'}</option>
              <option value="complete">{lang === 'th' ? 'บันทึกแล้ว' : 'Recorded'}</option>
            </select>
          </div>
          {holidayLabel && (
            <p className="rounded-lg bg-sky-50 dark:bg-sky-950/40 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
              {lang === 'th' ? `วันหยุด: ${holidayLabel} (ไม่นับคาบที่ไม่มีการบันทึก)` : `Holiday: ${holidayLabel} (unscheduled records are not counted as missing)`}
            </p>
          )}
          {periodSessionsFiltered.length === 0 ? (
            <p className="type-meta py-4 text-center">
              {holidayLabel
                ? (lang === 'th' ? 'วันนี้ไม่มีคาบเรียนที่ต้องตรวจ' : 'No scheduled lessons to review today.')
                : (lang === 'th' ? 'ไม่พบคาบเรียนของครูตามตารางในวันที่เลือก' : 'No lessons found in the timetable for this date.')}
            </p>
          ) : (
            <div className="space-y-2">
              {periodSessionsFiltered.map((session) => {
                const recordedCount = session.students.filter((student) => getPeriodRecord(session.records, student.id)).length;
                const visibleStudents = session.students.filter((student) => {
                  const record = getPeriodRecord(session.records, student.id);
                  return matchesStudent(student, periodSearch, lang) &&
                    (periodStatus === 'all' || (periodStatus === 'complete' ? Boolean(record) : !record));
                });
                return (
                  <details key={session.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="type-card-title truncate">
                          {lang === 'th' ? `คาบ ${session.periodNumber} · ${session.courseTitleTh}` : `Period ${session.periodNumber} · ${session.courseTitleEn}`}
                        </p>
                        <p className="type-meta truncate">
                          {session.courseCode} · {session.classRoom} · {session.startTime}–{session.endTime}
                        </p>
                      </div>
                      <StatusBadge
                        status={recordedCount === session.students.length ? 'complete' : 'pending'}
                        size="xs"
                        label={`${recordedCount}/${session.students.length}`}
                      />
                    </summary>
                    <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] px-3 py-2">
                      <PagedList
                        items={visibleStudents}
                        pageSize={8}
                        paginationLabel={lang === 'th' ? 'แบ่งหน้ารายชื่อนักเรียนรายคาบ' : 'Period attendance pagination'}
                        emptyState={<p className="type-meta py-3 text-center">{lang === 'th' ? 'ไม่พบรายชื่อตามตัวกรอง' : 'No students match these filters.'}</p>}
                        renderItem={(student) => renderPeriodStudent(student, session)}
                      />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
