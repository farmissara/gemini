import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { CourseTeacherOption } from '../../lib/courseTeacherFilter';
import { shouldShowCourseCredits } from '../../lib/moeGrading';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ClassroomCourseSummary } from './types';

interface TimetableHoursCriteriaTabProps {
  isPersonalViewer: boolean;
  hoursTeacherOptions: CourseTeacherOption[];
  effectiveHoursTeacherFilter: string;
  setHoursTeacherFilter: (val: string) => void;
  classroomCoursesList: ClassroomCourseSummary[];
  showCreditsColumn: boolean;
  showPrimaryCourseCredits: boolean;
  renderRoomAndTermControls: (showRoomFilter?: boolean) => React.ReactNode;
}

export const TimetableHoursCriteriaTab: React.FC<TimetableHoursCriteriaTabProps> = ({
  isPersonalViewer,
  hoursTeacherOptions,
  effectiveHoursTeacherFilter,
  setHoursTeacherFilter,
  classroomCoursesList,
  showCreditsColumn,
  showPrimaryCourseCredits,
  renderRoomAndTermControls,
}) => {
  return (
    <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col p-2.5 sm:p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>เกณฑ์ชั่วโมงเรียน 80% ปพ.5</span>
              <span className="hidden xl:inline text-[11px] font-normal text-[var(--color-text-muted)]">
                · คำนวณจากภาคเรียน 20 สัปดาห์
              </span>
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-semibold">
              ขาดเรียนได้ไม่เกิน 20%
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {renderRoomAndTermControls()}
            {!isPersonalViewer && hoursTeacherOptions.length > 0 && (
              <div className="fn-group">
                <span className="fn-group-label text-[var(--color-text-muted)]">ผู้สอน</span>
                <select
                  aria-label="กรองวิชาตามรายชื่อครู"
                  value={effectiveHoursTeacherFilter}
                  onChange={(e) => setHoursTeacherFilter(e.target.value)}
                  className="min-h-8 max-w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)] print:hidden"
                >
                  <option value="all">ครูผู้สอนทุกคน ({hoursTeacherOptions.length})</option>
                  {hoursTeacherOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} ({opt.count} วิชา)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="table-comfortable w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)] font-bold text-[11px]">
              <th className="p-3">รหัสวิชา</th>
              <th className="p-3">ชื่อวิชา (ไทย / EN)</th>
              <th className="p-3">ครูผู้สอน</th>
              {showCreditsColumn && <th className="p-3 text-center">หน่วยกิต</th>}
              <th className="p-3 text-center">คาบจัดสอนจริง</th>
              <th className="p-3 text-center">ชั่วโมงรวม/เทอม (20 สัปดาห์)</th>
              <th className="p-3 text-center">เกณฑ์เวลาเรียน 80%</th>
              <th className="p-3 text-center">ขาดได้สูงสุด (20%)</th>
              <th className="p-3 text-center">สถานะความครบถ้วน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {classroomCoursesList.length === 0 ? (
              <tr>
                <td colSpan={showCreditsColumn ? 9 : 8} className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                  ยังไม่มีการจัดตารางสอนสำหรับห้องนี้ กดปุ่ม &quot;+ เพิ่มคาบเรียน&quot; เพื่อเริ่มต้นจัดตาราง
                </td>
              </tr>
            ) : (
              classroomCoursesList.map((item) => {
                const credits = item.course?.credits ?? 1.5;
                const requiredWeeklyPeriods = item.course?.weeklyHours ?? (credits > 0 ? Math.round(credits * 2) : 1);
                const totalHours = item.scheduledPeriods * 20; // 20 weeks
                const minAttendanceHours = Math.round(totalHours * 0.8);
                const maxAllowedAbsentHours = totalHours - minAttendanceHours;
                const isComplete = item.scheduledPeriods === requiredWeeklyPeriods;
                const isUnder = item.scheduledPeriods < requiredWeeklyPeriods;

                return (
                  <tr key={item.code} className="hover:bg-[var(--color-card-subtle)] transition">
                    <td className="p-3 font-mono font-bold text-[var(--color-primary-text)]">
                      {item.code}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-[var(--color-text-title)]">{item.titleTh}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{item.titleEn}</div>
                    </td>
                    <td className="p-3 text-[var(--color-text-body)]">
                      {item.teacher}
                    </td>
                    {showCreditsColumn && (
                      <td className="p-3 text-center font-bold text-[var(--color-text-title)]">
                        {shouldShowCourseCredits(item.code, showPrimaryCourseCredits) && (credits === 0 ? 'ไม่มีหน่วยกิต' : credits)}
                      </td>
                    )}
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        isComplete
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                          : isUnder
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
                      }`}>
                        {item.scheduledPeriods} คาบ/สัปดาห์
                      </span>
                    </td>
                    <td className="p-3 text-center font-semibold text-[var(--color-text-title)]">
                      {totalHours} ชั่วโมง
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">
                      {minAttendanceHours} ชั่วโมง (80%)
                    </td>
                    <td className="p-3 text-center font-bold text-rose-700 dark:text-rose-300">
                      {maxAllowedAbsentHours} ชั่วโมง
                    </td>
                    <td className="p-3 text-center">
                      {isComplete ? (
                        <StatusBadge
                          size="xs"
                          status="complete"
                          label="ครบเกณฑ์"
                          title="จัดคาบสอนครบตามเกณฑ์ชั่วโมงเรียน 80% ปพ.5"
                        />
                      ) : isUnder ? (
                        <StatusBadge
                          size="xs"
                          status="pending"
                          label={`ขาด ${requiredWeeklyPeriods - item.scheduledPeriods} คาบ`}
                          title={`ยังจัดไม่ครบเกณฑ์ ขาดอีก ${requiredWeeklyPeriods - item.scheduledPeriods} คาบ`}
                        />
                      ) : (
                        <StatusBadge
                          size="xs"
                          status="info"
                          label={`เสริม +${item.scheduledPeriods - requiredWeeklyPeriods} คาบ`}
                          title={`จัดคาบเสริมเพิ่ม +${item.scheduledPeriods - requiredWeeklyPeriods} คาบ`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
