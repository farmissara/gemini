import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  LogIn,
  LogOut,
  Target,
} from 'lucide-react';
import type {
  AppLanguage,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  TimetableSlot,
  UserRole,
} from '../types';
import {
  BangkokClockSnapshot,
  getTimetableSlotActivityStatus,
} from '../lib/timetableCalendar';
import { isWeekendDate } from '../lib/thaiHolidays';

export interface SlotCheckStatus {
  hasCheckIn: boolean;
  hasCheckOut: boolean;
}

interface PeriodTimeMissionsCardProps {
  slots: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  bangkokClock: BangkokClockSnapshot;
  schoolId?: string;
  targetDateStr: string;
  currentRole: UserRole;
  lang?: AppLanguage;
  canSelfCheckin: boolean;
  getSlotCheckStatus: (slot: TimetableSlot, dateStr: string) => SlotCheckStatus;
  onTriggerCheckin: (
    slot: TimetableSlot,
    dateStr: string,
    checkType: 'check_in' | 'check_out'
  ) => void;
  onOpenSchedule?: () => void;
  compact?: boolean;
  collapsedByDefault?: boolean;
  periodAttendance?: PeriodAttendanceRecord[];
}

export const PeriodTimeMissionsCard: React.FC<PeriodTimeMissionsCardProps> = ({
  slots,
  schoolPeriods,
  bangkokClock,
  schoolId,
  targetDateStr,
  currentRole,
  lang = 'th',
  canSelfCheckin,
  getSlotCheckStatus,
  onTriggerCheckin,
  onOpenSchedule,
  compact = false,
  collapsedByDefault = false,
}) => {
  const [expanded, setExpanded] = useState(collapsedByDefault ? false : !compact);

  if (!canSelfCheckin || (currentRole !== 'student' && currentRole !== 'teacher')) {
    return null;
  }

  const sortedSlots = slots
    .slice()
    .sort((a, b) => a.periodNumber - b.periodNumber);

  const enrichedMissions = sortedSlots.map((slot) => {
    const activity = getTimetableSlotActivityStatus({
      slot,
      schoolPeriods,
      now: bangkokClock,
      schoolId,
      targetDateStr,
    });
    const checkStatus = getSlotCheckStatus(slot, targetDateStr);
    const completed = checkStatus.hasCheckIn && checkStatus.hasCheckOut;
    const partialCheckedIn = checkStatus.hasCheckIn && !checkStatus.hasCheckOut;
    const nextCheckType: 'check_in' | 'check_out' = partialCheckedIn
      ? 'check_out'
      : 'check_in';
    return {
      slot,
      activity,
      checkStatus,
      completed,
      partialCheckedIn,
      nextCheckType,
    };
  });

  const activeMissions = enrichedMissions.filter((m) => m.activity.isActive);
  const completedCount = enrichedMissions.filter(
    (m) => m.checkStatus.hasCheckIn
  ).length;
  const fullDoneCount = enrichedMissions.filter((m) => m.completed).length;
  const totalCount = enrichedMissions.length;

  if (totalCount === 0 && !isWeekendDate(targetDateStr)) {
    return null;
  }

  if (totalCount === 0) return null;

  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const prioritizedMissions = [
    ...activeMissions,
    ...enrichedMissions.filter((m) => !m.activity.isActive && m.partialCheckedIn),
    ...enrichedMissions.filter((m) => !m.activity.isActive && !m.partialCheckedIn && !m.completed),
    ...enrichedMissions.filter((m) => m.completed),
  ];
  const visibleMissions =
    compact && !expanded
      ? prioritizedMissions.slice(0, 2)
      : enrichedMissions;
  const featuredMission = prioritizedMissions[0];

  if (collapsedByDefault && !expanded) {
    return (
      <section
        aria-label={
          lang === 'th'
            ? 'ภารกิจเช็คชื่อเข้า-ออกตามเวลา'
            : 'Timed Period Check-in Missions'
        }
        className={`rounded-xl border px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 transition ${
          activeMissions.length > 0
            ? 'border-rose-400 dark:border-rose-800 bg-rose-50/85 dark:bg-rose-950/35'
            : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              activeMissions.length > 0
                ? 'bg-rose-600 text-white'
                : 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
            }`}
          >
            {activeMissions.length > 0 ? (
              <Flame className="w-3.5 h-3.5" />
            ) : (
              <Target className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="text-xs font-bold text-[var(--color-text-title)] whitespace-nowrap">
            {lang === 'th' ? 'ภารกิจเช็คอินรายคาบ' : 'Period Missions'}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
            เข้า {completedCount}/{totalCount} · ครบ {fullDoneCount}/{totalCount}
          </span>
          {featuredMission && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold truncate max-w-[280px] ${
                featuredMission.activity.isActive
                  ? 'bg-rose-600 text-white'
                  : featuredMission.partialCheckedIn
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)]'
              }`}
            >
              <span>
                คาบ {featuredMission.slot.periodNumber} · {featuredMission.slot.courseCode}
              </span>
              <span className="opacity-85">
                {featuredMission.completed
                  ? '(ครบแล้ว)'
                  : featuredMission.activity.isActive
                    ? '(ถึงเวลา)'
                    : featuredMission.partialCheckedIn
                      ? '(รอเช็คเอาท์)'
                      : featuredMission.activity.minutesUntilStart !== null
                        ? `(อีก ${featuredMission.activity.minutesUntilStart} น.)`
                        : ''}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {featuredMission && !featuredMission.completed && (
            <button
              type="button"
              onClick={() =>
                onTriggerCheckin(
                  featuredMission.slot,
                  targetDateStr,
                  featuredMission.nextCheckType
                )
              }
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition ${
                featuredMission.activity.isActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : featuredMission.partialCheckedIn
                    ? 'bg-slate-800 hover:bg-slate-900 dark:bg-rose-700 dark:hover:bg-rose-800 text-white'
                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
              }`}
            >
              {featuredMission.nextCheckType === 'check_out' ? (
                <LogOut className="w-3 h-3" />
              ) : (
                <LogIn className="w-3 h-3" />
              )}
              <span>
                {featuredMission.nextCheckType === 'check_out'
                  ? 'เช็คเอาท์'
                  : featuredMission.activity.isActive
                    ? 'เช็คอินตอนนี้'
                    : 'เช็คอิน'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
          >
            <span>{lang === 'th' ? `ดูทั้งหมด (${totalCount})` : `Show (${totalCount})`}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={
        lang === 'th'
          ? 'ภารกิจเช็คชื่อเข้า-ออกตามเวลา'
          : 'Timed Period Check-in Missions'
      }
      className={`rounded-2xl border bg-[var(--color-card)] overflow-hidden transition ${
        activeMissions.length > 0
          ? 'border-rose-500 ring-2 ring-rose-500/25'
          : 'border-[var(--color-border)]'
      }`}
    >
      {/* Card Header */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          activeMissions.length > 0
            ? 'border-rose-200 dark:border-rose-900 bg-rose-50/85 dark:bg-rose-950/40'
            : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeMissions.length > 0
                ? 'bg-rose-600 text-white'
                : 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
            }`}
          >
            {activeMissions.length > 0 ? (
              <Flame className="w-4.5 h-4.5" />
            ) : (
              <Target className="w-4.5 h-4.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                {lang === 'th'
                  ? 'ภารกิจเช็คชื่อเข้า-ออกตามเวลา'
                  : 'Period Check-in Missions'}
              </h3>
              {activeMissions.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                  ถึงเวลาคาบเรียน {activeMissions.length} คาบ
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
              {lang === 'th'
                ? `เข้าคาบแล้ว ${completedCount}/${totalCount} · ครบเข้า+ออก ${fullDoneCount}/${totalCount} คาบ · เวลา ${bangkokClock.timeLabel} น.`
                : `${completedCount}/${totalCount} checked in · ${fullDoneCount}/${totalCount} completed · ${bangkokClock.timeLabel}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentRole === 'student' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold tabular-nums">
              +25 EXP / คาบ
            </span>
          )}
          {onOpenSchedule && (
            <button
              type="button"
              onClick={onOpenSchedule}
              className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
            >
              {lang === 'th' ? 'ดูตารางเต็ม' : 'Full Schedule'}
            </button>
          )}
          {(collapsedByDefault || enrichedMissions.length > 2) && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[11px] font-semibold text-[var(--color-text-title)] cursor-pointer"
            >
              <span>{expanded ? 'ย่อ' : `ทั้งหมด (${totalCount})`}</span>
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Daily Progress Bar */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="h-2 w-full rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              activeMissions.length > 0 ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Mission Items */}
      <div className="p-3 space-y-2">
        {visibleMissions.map(
          ({
            slot,
            activity,
            checkStatus,
            completed,
            partialCheckedIn,
            nextCheckType,
          }) => {
            const isActiveNow = activity.isActive;
            const statusText = completed
              ? 'สำเร็จเข้า+ออกแล้ว'
              : isActiveNow
                ? `ถึงเวลาคาบเรียน${activity.remainingMinutes !== null ? ` · เหลือ ${activity.remainingMinutes} น.` : ''}`
                : partialCheckedIn
                  ? 'เช็คอินแล้ว · รอเช็คเอาท์'
                  : activity.missionPhase === 'upcoming'
                    ? activity.minutesUntilStart !== null
                      ? `อีก ${activity.minutesUntilStart} น. ถึงเวลา`
                      : 'รอถึงเวลาเรียน'
                    : activity.missionPhase === 'ended'
                      ? 'จบคาบแล้ว'
                      : 'วันหยุด';

            return (
              <div
                key={slot.id}
                className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                  isActiveNow
                    ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/35 ring-1 ring-rose-500/30'
                    : completed
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                        isActiveNow
                          ? 'bg-rose-600 text-white'
                          : completed
                            ? 'bg-emerald-600 text-white'
                            : partialCheckedIn
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isActiveNow ? (
                        <Flame className="w-3 h-3" />
                      ) : completed ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{statusText}</span>
                    </span>
                    <span className="font-semibold text-[var(--color-text-muted)]">
                      คาบ {slot.periodNumber} ({activity.startTime || '--:--'}–{activity.endTime || '--:--'})
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[var(--color-text-title)] truncate">
                    {slot.courseCode} · {slot.courseTitleTh || slot.courseTitleEn}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {slot.classRoom}
                    {slot.room ? ` · ห้อง ${slot.room}` : ''}
                    {slot.teacherName ? ` · ${slot.teacherName}` : ''}
                  </p>
                </div>

                {/* Always-visible Period Check-in / Check-out Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onTriggerCheckin(slot, targetDateStr, nextCheckType)
                    }
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      isActiveNow
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                        : completed
                          ? 'border border-emerald-400 dark:border-emerald-700 bg-[var(--color-card)] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : partialCheckedIn
                            ? 'bg-slate-800 hover:bg-slate-900 dark:bg-rose-700 dark:hover:bg-rose-800 text-white'
                            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                    }`}
                  >
                    {nextCheckType === 'check_out' ? (
                      <LogOut className="w-3.5 h-3.5" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {completed
                        ? 'อัปเดตคาบ'
                        : nextCheckType === 'check_out'
                          ? 'เช็คเอาท์'
                          : isActiveNow
                            ? 'เช็คอินตอนนี้'
                            : 'เช็คอินคาบ'}
                    </span>
                  </button>

                  {!checkStatus.hasCheckOut && !partialCheckedIn && (
                    <button
                      type="button"
                      onClick={() =>
                        onTriggerCheckin(slot, targetDateStr, 'check_out')
                      }
                      className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                        isActiveNow
                          ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200 hover:bg-rose-50'
                          : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                      }`}
                      title="เช็คเอาท์ออกคาบเรียน"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ออก</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
};
