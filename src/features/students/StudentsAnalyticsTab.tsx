import React from 'react';
import { Student, StudentStatus } from '../../types';
import { STUDENT_STATUS_DETAILS } from '../../data/studentAcademicData';
import { StatusBadge, type StatusBadgeStatus } from '../../components/common/StatusBadge';

interface StudentsAnalyticsTabProps {
  students: Student[];
  activeStudentsCount: number;
  graduatedCount: number;
  existingGradeLevels: string[];
  statusBadgeMap: Record<StudentStatus, StatusBadgeStatus>;
  onFilterByStatus: (status: StudentStatus) => void;
  onFilterByGrade: (grade: string) => void;
}

export const StudentsAnalyticsTab: React.FC<StudentsAnalyticsTabProps> = ({
  students,
  activeStudentsCount,
  graduatedCount,
  existingGradeLevels,
  statusBadgeMap,
  onFilterByStatus,
  onFilterByGrade,
}) => {
  const uniqueRoomsCount = new Set(students.map((s) => s.room?.trim()).filter(Boolean)).size;
  return (
  <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
    {/* 1-Row Unified KPI Strip */}
    <div className="saas-kpi-strip grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
      <div className="saas-kpi-cell">
        <div className="text-xs font-medium text-[var(--color-text-muted)]">นักเรียนทั้งหมด</div>
        <div className="mt-1 text-2xl font-bold text-[var(--color-text-title)] tabular-nums">
          {students.length} <span className="text-xs font-normal text-[var(--color-text-muted)]">คน</span>
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">ในทะเบียนโรงเรียนปัจจุบัน</div>
      </div>
      <div className="saas-kpi-cell">
        <div className="text-xs font-medium text-[var(--color-text-muted)]">กำลังศึกษา</div>
        <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
          {activeStudentsCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">คน</span>
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)] tabular-nums">
          ย้ายเข้า {students.filter((s) => s.status === 'transferred_in').length} · ย้ายออก{' '}
          {students.filter((s) => s.status === 'transferred_out' || s.status === 'transferred').length}
        </div>
      </div>
      <div className="saas-kpi-cell">
        <div className="text-xs font-medium text-[var(--color-text-muted)]">ห้องเรียนที่มีนักเรียน</div>
        <div className="mt-1 text-2xl font-bold text-[var(--color-text-title)] tabular-nums">
          {uniqueRoomsCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">ห้อง</span>
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)] tabular-nums">
          ครอบคลุม {existingGradeLevels.length} ระดับชั้น
        </div>
      </div>
      <div className="saas-kpi-cell">
        <div className="text-xs font-medium text-[var(--color-text-muted)]">สำเร็จการศึกษาแล้ว</div>
        <div className="mt-1 text-2xl font-bold text-[var(--color-text-title)] tabular-nums">
          {graduatedCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">คน</span>
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">บันทึกจบการศึกษาในระบบ</div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Status Breakdown */}
      <section className="lg:col-span-5 saas-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-title)]">สัดส่วนตามสถานะนักเรียน</h2>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{students.length} คน</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {Object.values(STUDENT_STATUS_DETAILS).map((st) => {
            const count = students.filter((s) => (s.status || 'active') === st.value).length;
            const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => onFilterByStatus(st.value)}
                className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <StatusBadge
                      size="xs"
                      status={statusBadgeMap[st.value] || 'neutral'}
                      label={st.labelTh}
                    />
                    <span className="font-mono font-semibold text-[var(--color-text-title)] tabular-nums">
                      {count} <span className="text-[11px] font-normal text-[var(--color-text-muted)]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 w-full h-1.5 rounded-full bg-[var(--color-card-subtle)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--tone)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grade Level Breakdown */}
      <section className="lg:col-span-7 saas-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-title)]">จำนวนนักเรียนแยกตามระดับชั้น</h2>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
            {existingGradeLevels.length} ระดับชั้น
          </span>
        </div>
        {existingGradeLevels.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">ยังไม่มีข้อมูลระดับชั้นในโรงเรียน</div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {existingGradeLevels.map((grade) => {
              const count = students.filter((s) => s.gradeLevel === grade).length;
              const activeCount = students.filter(
                (s) => s.gradeLevel === grade && (s.status === 'active' || !s.status)
              ).length;
              const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => onFilterByGrade(grade)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-[var(--color-card-subtle)] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[var(--color-text-title)] truncate">{grade}</span>
                      <span className="font-mono font-semibold text-[var(--color-text-title)] tabular-nums shrink-0">
                        {count} คน
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--color-card-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--tone)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      <span>กำลังศึกษา {activeCount} คน</span>
                      <span aria-hidden="true">·</span>
                      <span>สัดส่วน {pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  </div>
  );
};
