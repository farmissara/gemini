import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import { LeaveRequest, TimetableSlot } from '../../types';
import { normalizeTeacherName } from '../../lib/timetableTeachers';
import { DAYS, SubstituteCandidate } from './types';

interface TimetableSubstituteTabProps {
  subDate: string;
  setSubDate: (date: string) => void;
  setSubSelectedTeacher: (name: string) => void;
  subDayMeta: (typeof DAYS)[number];
  resolvedAbsentTeacher: string;
  subTeacherSelectableList: string[];
  absentTeacherNameKeysOnSubDate: Set<string>;
  teacherLeavesOnSubDate: LeaveRequest[];
  isSubWeekendDate: boolean;
  subNotice: string | null;
  setSubNotice: (notice: string | null) => void;
  absentTeacherSlotsOnDay: TimetableSlot[];
  resolvedAbsentTeacherLeave?: LeaveRequest;
  findFreeSubstitutesForSlot: (targetSlot: TimetableSlot) => SubstituteCandidate[];
  sentSubRequests: Record<string, boolean>;
  assigningSubSlotKey: string | null;
  canEditTimetableSlots: boolean;
  hasUpdateSlotHandler: boolean;
  handleRequestSubstituteTeacher: (targetSlot: TimetableSlot, candidateName: string) => Promise<void>;
  handleAssignSubstituteToSlot: (targetSlot: TimetableSlot, candidateName: string) => Promise<void>;
  renderRoomAndTermControls: (showRoomFilter?: boolean) => React.ReactNode;
}

export const TimetableSubstituteTab: React.FC<TimetableSubstituteTabProps> = ({
  subDate,
  setSubDate,
  setSubSelectedTeacher,
  subDayMeta,
  resolvedAbsentTeacher,
  subTeacherSelectableList,
  absentTeacherNameKeysOnSubDate,
  teacherLeavesOnSubDate,
  isSubWeekendDate,
  subNotice,
  setSubNotice,
  absentTeacherSlotsOnDay,
  resolvedAbsentTeacherLeave,
  findFreeSubstitutesForSlot,
  sentSubRequests,
  assigningSubSlotKey,
  canEditTimetableSlots,
  hasUpdateSlotHandler,
  handleRequestSubstituteTeacher,
  handleAssignSubstituteToSlot,
  renderRoomAndTermControls,
}) => {
  return (
    <section className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm flex flex-col">
      <header className="shrink-0 border-b border-[var(--color-border)] p-2.5 sm:px-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-title)]">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>จัดหาครูสอนแทนอัตโนมัติ</span>
              <span className="hidden xl:inline text-[11px] font-normal text-[var(--color-text-muted)]">
                · เรียงจากกลุ่มสาระเดียวกันและภาระสอนน้อยที่สุดก่อน
              </span>
            </h2>
          </div>
          {renderRoomAndTermControls(false)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)]">
            <span>วันที่ต้องการหาครูสอนแทน</span>
            <input
              type="date"
              value={subDate}
              onChange={(e) => setSubDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </label>
          <label className="space-y-1 text-[11px] font-semibold text-[var(--color-text-body)] sm:col-span-2">
            <span>เลือกครูที่ลา / ติดภารกิจราชการ ({subDayMeta.th})</span>
            <select
              value={resolvedAbsentTeacher}
              onChange={(e) => setSubSelectedTeacher(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-2 text-xs font-semibold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              {subTeacherSelectableList.length === 0 ? (
                <option value="">ยังไม่มีรายชื่อครูในภาคเรียนนี้</option>
              ) : (
                subTeacherSelectableList.map((name) => {
                  const isOnLeave = absentTeacherNameKeysOnSubDate.has(normalizeTeacherName(name));
                  return (
                    <option key={name} value={name}>
                      {name}{isOnLeave ? ' · (แจ้งลาในวันที่เลือก)' : ''}
                    </option>
                  );
                })
              )}
            </select>
          </label>
        </div>

        {teacherLeavesOnSubDate.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-bold">ครูที่มีใบลาวันที่ {subDate}:</span>
            {teacherLeavesOnSubDate.map((leave) => (
              <button
                key={leave.id}
                type="button"
                onClick={() => setSubSelectedTeacher(leave.userName)}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  normalizeTeacherName(leave.userName) === normalizeTeacherName(resolvedAbsentTeacher)
                    ? 'border-amber-500 bg-amber-200/80 text-amber-950 dark:bg-amber-900 dark:text-amber-100'
                    : 'border-amber-300 bg-white/80 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-black/20 dark:text-amber-200'
                }`}
              >
                {leave.userName} ({leave.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'})
              </button>
            ))}
          </div>
        )}

        {isSubWeekendDate && (
          <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/30 px-3 py-1.5 text-[11px] text-sky-900 dark:text-sky-200">
            วันที่เลือกตรงกับวันเสาร์/อาทิตย์ ระบบจึงจำลองตารางสอนของ<strong>วันจันทร์</strong>ให้ตรวจเช็กคิวสอนแทนล่วงหน้า
          </div>
        )}

        {subNotice && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {subNotice}
            </span>
            <button type="button" onClick={() => setSubNotice(null)} aria-label="ปิดข้อความแจ้งเตือน" className="p-1 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {!resolvedAbsentTeacher ? (
          <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
            กรุณาเลือกครูที่ต้องการหาผู้สอนแทน หรือเพิ่มข้อมูลบุคลากรและตารางสอนก่อน
          </div>
        ) : absentTeacherSlotsOnDay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center space-y-1">
            <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 opacity-80" />
            <p className="text-sm font-bold text-[var(--color-text-title)]">
              {resolvedAbsentTeacher} ไม่มีคาบสอนใน{subDayMeta.th}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              ไม่ต้องจัดหาครูสอนแทนสำหรับวันนี้ (ช่วยลดภาระการประสานงานได้ทันที)
            </p>
          </div>
        ) : (
          absentTeacherSlotsOnDay.map((slot) => {
            const freeCandidates = findFreeSubstitutesForSlot(slot);
            const isLeaveSpecificOtherPeriod =
              resolvedAbsentTeacherLeave?.leaveScope === 'period_hourly' &&
              typeof resolvedAbsentTeacherLeave.periodNumber === 'number' &&
              resolvedAbsentTeacherLeave.periodNumber !== slot.periodNumber;
            return (
              <div
                key={slot.id}
                className={`rounded-2xl border p-3.5 space-y-3 ${
                  isLeaveSpecificOtherPeriod
                    ? 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-75'
                    : 'border-amber-200 dark:border-amber-800 bg-[var(--color-card)] shadow-2xs'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-950 px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <Clock className="h-3.5 w-3.5" />
                      คาบ {slot.periodNumber} ({slot.startTime}–{slot.endTime})
                    </span>
                    <span className="text-xs font-bold text-[var(--color-text-title)]">
                      {slot.courseCode} · {slot.courseTitleTh}
                    </span>
                    <span className="rounded-md bg-[var(--color-card-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-body)]">
                      ห้อง {slot.classRoom} {slot.room ? `(${slot.room})` : ''}
                    </span>
                    {isLeaveSpecificOtherPeriod && (
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        ใบลาขอเฉพาะคาบ {resolvedAbsentTeacherLeave?.periodNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    พบครูว่าง {freeCandidates.length} ท่าน
                  </span>
                </div>

                {freeCandidates.length === 0 ? (
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    ไม่มีครูว่างในคาบเวลานี้ (ครูทุกท่านมีคาบสอนซ้อนหรือติดวันลา)
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {freeCandidates.slice(0, 6).map((candidate) => {
                      const requestKey = `${slot.id}::${normalizeTeacherName(candidate.name)}`;
                      const isSent = Boolean(sentSubRequests[requestKey]);
                      const isAssigning = assigningSubSlotKey === requestKey;
                      return (
                        <div
                          key={candidate.name}
                          className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 ${
                            candidate.alreadyCoTeacher
                              ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30'
                              : candidate.sameDepartment
                                ? 'border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20'
                                : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="truncate text-xs font-bold text-[var(--color-text-title)]">
                                {candidate.name}
                              </span>
                              <span className="shrink-0 rounded-md bg-white/80 dark:bg-black/20 border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--color-text-body)]">
                                {candidate.periodCount} คาบ/สัปดาห์
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                              {candidate.alreadyCoTeacher && (
                                <span className="rounded bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 font-bold text-emerald-800 dark:text-emerald-200">
                                  สอนคู่/แทนอยู่แล้ว
                                </span>
                              )}
                              {candidate.sameDepartment && (
                                <span className="rounded bg-sky-100 dark:bg-sky-900 px-1.5 py-0.5 font-bold text-sky-800 dark:text-sky-200">
                                  กลุ่มสาระเดียวกัน
                                </span>
                              )}
                              {candidate.teacher?.department && (
                                <span className="truncate">{candidate.teacher.department}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border)]">
                            <button
                              type="button"
                              onClick={() => {
                                void handleRequestSubstituteTeacher(slot, candidate.name);
                              }}
                              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                                isSent
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[var(--color-primary)] text-white hover:opacity-95'
                              }`}
                            >
                              <Send className="h-3 w-3" />
                              <span>{isSent ? 'ส่งแจ้งเตือนแล้ว ✓' : 'แจ้งขอสอนแทน'}</span>
                            </button>
                            {canEditTimetableSlots && hasUpdateSlotHandler && !candidate.alreadyCoTeacher && (
                              <button
                                type="button"
                                disabled={isAssigning}
                                onClick={() => {
                                  void handleAssignSubstituteToSlot(slot, candidate.name);
                                }}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                                title="เพิ่มเป็นครูสอนคู่/สอนแทนในตารางสอนจริง"
                              >
                                <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>{isAssigning ? 'กำลังบันทึก...' : 'ลงตารางแทน'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
