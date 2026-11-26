import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { normalizeTeacherName } from '../../lib/timetableTeachers';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TeacherWorkloadRow, WorkloadStatusFilter } from './types';

interface TimetableWorkloadTabProps {
  isAdmin: boolean;
  hasUpdateTeachingLoadThresholds: boolean;
  workloadMinPeriods: number;
  workloadMaxPeriods: number;
  workloadMinDraft: string;
  setWorkloadMinDraft: (value: string) => void;
  workloadMaxDraft: string;
  setWorkloadMaxDraft: (value: string) => void;
  workloadSettingsError: string | null;
  setWorkloadSettingsError: (error: string | null) => void;
  isSavingWorkloadSettings: boolean;
  handleSaveTeachingLoadThresholds: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  workloadStatusFilter: WorkloadStatusFilter;
  setWorkloadStatusFilter: (filter: WorkloadStatusFilter) => void;
  workloadSearchTerm: string;
  setWorkloadSearchTerm: (term: string) => void;
  teacherWorkloadRows: TeacherWorkloadRow[];
  filteredTeacherWorkloadRows: TeacherWorkloadRow[];
  unassignedWorkloadCount: number;
  lowWorkloadCount: number;
  withinWorkloadCount: number;
  highWorkloadCount: number;
  renderRoomAndTermControls: (showRoomFilter?: boolean) => React.ReactNode;
}

export const TimetableWorkloadTab: React.FC<TimetableWorkloadTabProps> = ({
  isAdmin,
  hasUpdateTeachingLoadThresholds,
  workloadMinPeriods,
  workloadMaxPeriods,
  workloadMinDraft,
  setWorkloadMinDraft,
  workloadMaxDraft,
  setWorkloadMaxDraft,
  workloadSettingsError,
  setWorkloadSettingsError,
  isSavingWorkloadSettings,
  handleSaveTeachingLoadThresholds,
  workloadStatusFilter,
  setWorkloadStatusFilter,
  workloadSearchTerm,
  setWorkloadSearchTerm,
  teacherWorkloadRows,
  filteredTeacherWorkloadRows,
  unassignedWorkloadCount,
  lowWorkloadCount,
  withinWorkloadCount,
  highWorkloadCount,
  renderRoomAndTermControls,
}) => {
  return (
    <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
      <header className="shrink-0 border-b border-[var(--color-border)] px-3 py-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-title)]">
              <Users className="h-4 w-4 text-[var(--color-primary-text)] shrink-0" />
              <span>ภาระงานสอนรายบุคคล</span>
            </h2>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              เกณฑ์คัดกรองเบื้องต้น {workloadMinPeriods}–{workloadMaxPeriods} คาบ/สัปดาห์ · คำนวณจากตารางสอนจริง
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {renderRoomAndTermControls(false)}
            {isAdmin && hasUpdateTeachingLoadThresholds && (
              <details className="relative">
                <summary
                  className="btn-tool-neutral list-none px-2.5 py-1.5 text-[11px]"
                  onClick={() => {
                    setWorkloadMinDraft(String(workloadMinPeriods));
                    setWorkloadMaxDraft(String(workloadMaxPeriods));
                    setWorkloadSettingsError(null);
                  }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
                  <span>ตั้งค่าเกณฑ์</span>
                  <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
                </summary>
                <form
                  onSubmit={handleSaveTeachingLoadThresholds}
                  className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-xl space-y-2.5 text-left"
                >
                  <div className="text-[11px] font-bold text-[var(--color-text-title)]">
                    เกณฑ์ภาระงานสอนครู (ไม่ใช่เกณฑ์ตำแหน่ง)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      ขั้นต่ำ (คาบ/สัปดาห์)
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        value={workloadMinDraft}
                        onChange={(event) => setWorkloadMinDraft(event.target.value)}
                        aria-label="จำนวนคาบขั้นต่ำต่อสัปดาห์"
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1 text-xs text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] text-[var(--color-text-muted)]">
                      สูงสุด (คาบ/สัปดาห์)
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        value={workloadMaxDraft}
                        onChange={(event) => setWorkloadMaxDraft(event.target.value)}
                        aria-label="จำนวนคาบสูงสุดต่อสัปดาห์"
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1 text-xs text-[var(--color-text-title)]"
                      />
                    </label>
                  </div>
                  {workloadSettingsError && (
                    <p role="alert" className="text-[10px] text-rose-700 dark:text-rose-300">
                      {workloadSettingsError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingWorkloadSettings}
                    className="w-full rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60 cursor-pointer"
                  >
                    {isSavingWorkloadSettings ? 'กำลังบันทึก…' : 'บันทึกเกณฑ์'}
                  </button>
                </form>
              </details>
            )}
          </div>
        </div>

        {/* Compact Single-Row 5-Filter Stat Strip */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          <button
            type="button"
            aria-pressed={workloadStatusFilter === 'all'}
            onClick={() => setWorkloadStatusFilter('all')}
            className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-left transition hover:border-[var(--color-primary)] cursor-pointer ${workloadStatusFilter === 'all' ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
          >
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">ครูทั้งหมด</span>
            <span className="text-xs font-extrabold tabular-nums text-[var(--color-text-title)] shrink-0">{teacherWorkloadRows.length} คน</span>
          </button>
          <button
            type="button"
            aria-pressed={workloadStatusFilter === 'unassigned'}
            onClick={() => setWorkloadStatusFilter('unassigned')}
            className={`flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-left transition hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900/40 cursor-pointer ${workloadStatusFilter === 'unassigned' ? 'ring-2 ring-slate-400' : ''}`}
          >
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">ยังไม่มีคาบ</span>
            <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-slate-100 shrink-0">{unassignedWorkloadCount} คน</span>
          </button>
          <button
            type="button"
            aria-pressed={workloadStatusFilter === 'low'}
            onClick={() => setWorkloadStatusFilter('low')}
            className={`flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-left transition hover:border-amber-500 dark:border-amber-800 dark:bg-amber-950/40 cursor-pointer ${workloadStatusFilter === 'low' ? 'ring-2 ring-amber-400' : ''}`}
          >
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200 truncate">ต่ำกว่า {workloadMinPeriods} คาบ</span>
            <span className="text-xs font-extrabold tabular-nums text-amber-900 dark:text-amber-100 shrink-0">{lowWorkloadCount} คน</span>
          </button>
          <button
            type="button"
            aria-pressed={workloadStatusFilter === 'within'}
            onClick={() => setWorkloadStatusFilter('within')}
            className={`flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-left transition hover:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/40 cursor-pointer ${workloadStatusFilter === 'within' ? 'ring-2 ring-emerald-400' : ''}`}
          >
            <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200 truncate">{workloadMinPeriods}–{workloadMaxPeriods} คาบ</span>
            <span className="text-xs font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100 shrink-0">{withinWorkloadCount} คน</span>
          </button>
          <button
            type="button"
            aria-pressed={workloadStatusFilter === 'high'}
            onClick={() => setWorkloadStatusFilter('high')}
            className={`flex items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-left transition hover:border-rose-500 dark:border-rose-800 dark:bg-rose-950/40 cursor-pointer ${workloadStatusFilter === 'high' ? 'ring-2 ring-rose-400' : ''}`}
          >
            <span className="text-[11px] font-medium text-rose-800 dark:text-rose-200 truncate">มากกว่า {workloadMaxPeriods} คาบ</span>
            <span className="text-xs font-extrabold tabular-nums text-rose-900 dark:text-rose-100 shrink-0">{highWorkloadCount} คน</span>
          </button>
        </div>
      </header>

      <div className="shrink-0 grid gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.5fr)_auto]">
        <label className="relative block min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={workloadSearchTerm}
            onChange={(event) => setWorkloadSearchTerm(event.target.value)}
            placeholder="ค้นหาชื่อครู วิชา รหัสวิชา หรือห้อง"
            aria-label="ค้นหาภาระงานครู"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <select
          value={workloadStatusFilter}
          onChange={(event) => {
            const value = event.target.value;
            if (['all', 'scheduled', 'unassigned', 'low', 'within', 'high'].includes(value)) {
              setWorkloadStatusFilter(value as WorkloadStatusFilter);
            }
          }}
          aria-label="กรองตามสถานะภาระงาน"
          className="w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="scheduled">มีคาบสอนแล้ว</option>
          <option value="unassigned">ยังไม่มีคาบ</option>
          <option value="low">ต่ำกว่า {workloadMinPeriods} คาบ</option>
          <option value="within">{workloadMinPeriods}–{workloadMaxPeriods} คาบ</option>
          <option value="high">มากกว่า {workloadMaxPeriods} คาบ</option>
        </select>
        <span className="self-center text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)] sm:text-right">
          พบ {filteredTeacherWorkloadRows.length} / {teacherWorkloadRows.length} คน
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5 sm:p-2">
        {filteredTeacherWorkloadRows.length === 0 ? (
          <p className="p-8 text-center text-xs text-[var(--color-text-muted)]">
            {teacherWorkloadRows.length === 0
              ? 'ยังไม่มีรายชื่อครูหรือข้อมูลผู้สอนในตารางสอน'
              : 'ไม่พบรายชื่อที่ตรงกับคำค้นหาหรือตัวกรอง'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {filteredTeacherWorkloadRows.map((teacher) => (
              <details
                key={normalizeTeacherName(teacher.name)}
                className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] transition hover:border-[var(--color-primary)]"
              >
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 hover:bg-[var(--color-card-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:grid-cols-[minmax(0,1fr)_minmax(8rem,1fr)_auto_auto] [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      teacher.status === 'high'
                        ? 'bg-rose-500'
                        : teacher.status === 'low'
                          ? 'bg-amber-500'
                          : teacher.status === 'unassigned'
                            ? 'bg-slate-400'
                            : 'bg-emerald-500'
                    }`} />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[var(--color-text-title)]">{teacher.name}</div>
                      {teacher.teacher?.positionTitle && (
                        <div className="truncate text-[10px] text-[var(--color-text-muted)]">{teacher.teacher.positionTitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-24 max-w-48">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold tabular-nums text-[var(--color-text-title)]">
                        {teacher.periodCount} <span className="font-sans text-[10px] font-medium">คาบ</span>
                      </span>
                      <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
                        {teacher.hours.toFixed(1)} ชม.
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`ภาระงานสอนของ${teacher.name}`}
                      aria-valuemin={0}
                      aria-valuemax={workloadMaxPeriods}
                      aria-valuenow={Math.min(teacher.periodCount, workloadMaxPeriods)}
                      aria-valuetext={`${teacher.periodCount} คาบต่อสัปดาห์; เกณฑ์เบื้องต้น ${workloadMinPeriods}–${workloadMaxPeriods} คาบ`}
                      className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-card-subtle)]"
                    >
                      <div
                        className={`h-full rounded-full ${
                          teacher.status === 'high'
                            ? 'bg-rose-500'
                            : teacher.status === 'low'
                              ? 'bg-amber-500'
                              : teacher.status === 'unassigned'
                                ? 'bg-slate-400'
                                : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min((teacher.periodCount / Math.max(workloadMaxPeriods, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {teacher.status === 'unassigned' ? (
                    <StatusBadge size="xs" status="neutral" label="ยังไม่มีคาบ" />
                  ) : teacher.status === 'low' ? (
                    <StatusBadge size="xs" status="pending" label={`ต่ำกว่า ${workloadMinPeriods}`} />
                  ) : teacher.status === 'high' ? (
                    <StatusBadge size="xs" status="delayed" label={`เกิน ${workloadMaxPeriods}`} />
                  ) : (
                    <StatusBadge size="xs" status="complete" label={`${workloadMinPeriods}–${workloadMaxPeriods}`} />
                  )}

                  <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-semibold text-[var(--color-primary-text)]">
                    {teacher.subjects.length > 0 ? `${teacher.subjects.length} วิชา` : 'ดูข้อมูล'}
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                  </span>
                </summary>

                <div className="border-t border-[var(--color-border)] p-3">
                  {teacher.subjects.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {teacher.subjects.map((subject) => (
                        <div key={`${subject.code}-${subject.title}`} className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span className="min-w-0 break-words text-xs font-semibold text-[var(--color-text-body)]">
                              <span className="font-mono font-bold text-[var(--color-primary-text)]">{subject.code}</span>
                              {subject.title ? ` · ${subject.title}` : ''}
                              {subject.coTaughtPeriods > 0 && (
                                <span className="ml-1.5 inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                  สอนคู่ ({subject.coTaughtPeriods} คาบ)
                                </span>
                              )}
                            </span>
                            <span className="whitespace-nowrap text-[10px] font-semibold text-[var(--color-text-muted)]">
                              {subject.periodCount} คาบ/สัปดาห์
                            </span>
                          </div>
                          {subject.rooms.length > 0 && (
                            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                              ห้อง {subject.rooms.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">ยังไม่มีรายวิชาในตารางสอน</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
