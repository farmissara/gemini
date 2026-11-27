import React from 'react';
import {
  Calendar,
  Camera,
  ChevronRight,
  FileText,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  PeriodAttendanceRecord,
  School,
  SchoolPeriodTime,
  Student,
  TimetableSlot,
  UserRole,
} from '../../types';
import type { ThaiHoliday } from '../../lib/thaiHolidays';
import { isWeekendDate } from '../../lib/thaiHolidays';
import { getTimetableSlotActivityStatus, type BangkokClockSnapshot } from '../../lib/timetableCalendar';
import { PeriodTimeMissionsCard } from '../../components/PeriodTimeMissionsCard';
import { AttendancePhoto } from '../../components/AttendancePhoto';
import {
  formatShortAttendanceTime,
  resolveRecordPhotoSource,
} from '../../lib/personalAttendanceHistory';
import type { NavTab } from '../../components/layout/Sidebar';
import type { ActiveGameView, ExecMetrics, MobileTab } from './types';

interface MobileTeacherParentHomeProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  linkedStudents: Student[];
  canSwitchAdminTeacherMode: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  todayHoliday: ThaiHoliday | null;
  upcomingHoliday: ThaiHoliday | null;
  canSelfCheckin: boolean;
  canViewTimetable: boolean;
  canOpenLeave: boolean;
  canOpenCareerQuest: boolean;
  canPlayGames: boolean;
  canOpenAnnouncements: boolean;
  canViewDigitalId: boolean;
  canAccessHomework?: boolean;
  canOpenLms?: boolean;
  canOpenBehaviorSdq?: boolean;
  canOpenInfirmary?: boolean;
  isModuleEnabled: (tab: NavTab) => boolean;
  todayCheckin: AttendanceRecord | undefined;
  todayCheckout?: AttendanceRecord | undefined;
  todayBangkokStr: string;
  bangkokClock: BangkokClockSnapshot;
  todayMySlots: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  periodAttendance: PeriodAttendanceRecord[];
  scopedAnnouncementsCount: number;
  pendingLeavesCount: number;
  scopedAssignmentsCount?: number;
  lessonsCount?: number;
  execMetrics: ExecMetrics;
  getSlotTodayCheckStatus: (
    slot: TimetableSlot,
    dateValue: string
  ) => { hasCheckIn: boolean; hasCheckOut: boolean };
  onOpenStudentAttendance: () => void;
  openPeriodCheckinFromSlot: (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => void;
  setMobileAttendanceInitialSubTab: (
    subTab: 'selfie_mobile' | 'history' | 'leave_request' | 'teacher_proxy' | 'period_checkin'
  ) => void;
  setMobileTimetableMode: (mode: 'day' | 'calendar') => void;
  setActiveTab: (tab: MobileTab) => void;
  setActiveGameView: (view: ActiveGameView) => void;
}

export const MobileTeacherParentHome: React.FC<MobileTeacherParentHomeProps> = ({
  currentUser,
  activeSchool,
  currentRole,
  lang,
  linkedStudents,
  todayHoliday,
  canSelfCheckin,
  canViewTimetable,
  canOpenLeave,
  todayCheckin,
  todayCheckout,
  todayBangkokStr,
  bangkokClock,
  todayMySlots,
  schoolPeriods,
  periodAttendance,
  pendingLeavesCount,
  getSlotTodayCheckStatus,
  openPeriodCheckinFromSlot,
  setMobileAttendanceInitialSubTab,
  setActiveTab,
}) => {
  const isTeacher = currentRole === 'teacher';
  const isParent = currentRole === 'parent';
  const isWeekend = isWeekendDate(todayBangkokStr);

  const displayName =
    (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email ||
    (isTeacher ? (lang === 'th' ? 'ครูผู้สอน' : 'Teacher') : lang === 'th' ? 'ผู้ปกครอง' : 'Parent');

  const activeNowSlot =
    isTeacher && !todayHoliday && !isWeekend && todayMySlots.length > 0
      ? todayMySlots.find(
          (s) =>
            getTimetableSlotActivityStatus({
              slot: s,
              schoolPeriods,
              now: bangkokClock,
              schoolId: activeSchool.id,
            }).isActive
        )
      : undefined;
  const nextUpcomingSlot =
    isTeacher && !todayHoliday && !isWeekend && todayMySlots.length > 0
      ? todayMySlots.find((s) => {
          const st = getTimetableSlotActivityStatus({
            slot: s,
            schoolPeriods,
            now: bangkokClock,
            schoolId: activeSchool.id,
          });
          return st.endMinutes !== null && st.endMinutes >= bangkokClock.minutes;
        })
      : undefined;
  const featuredSlot =
    isTeacher && !todayHoliday && !isWeekend && todayMySlots.length > 0
      ? activeNowSlot || nextUpcomingSlot || todayMySlots[0]
      : undefined;

  return (
    <div className="flex flex-col gap-3 pb-2 animate-in fade-in duration-150">
      {isTeacher && featuredSlot && (
        <PeriodTimeMissionsCard
          compact={true}
          slots={todayMySlots}
          schoolPeriods={schoolPeriods}
          bangkokClock={bangkokClock}
          schoolId={activeSchool.id}
          targetDateStr={todayBangkokStr}
          currentRole={currentRole}
          lang={lang}
          canSelfCheckin={canSelfCheckin}
          getSlotCheckStatus={(s, d) => getSlotTodayCheckStatus(s, d)}
          onTriggerCheckin={openPeriodCheckinFromSlot}
          periodAttendance={periodAttendance}
        />
      )}

      {isTeacher && !featuredSlot && (
        <button
          type="button"
          onClick={() => (canViewTimetable ? setActiveTab('timetable') : undefined)}
          disabled={!canViewTimetable}
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left flex items-center justify-between gap-3 hover:border-[var(--color-primary)] transition cursor-pointer disabled:cursor-default"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-primary-text)] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                {todayHoliday
                  ? lang === 'th'
                    ? todayHoliday.nameTh
                    : todayHoliday.nameEn
                  : isWeekend
                    ? lang === 'th'
                      ? 'วันหยุดสุดสัปดาห์'
                      : 'Weekend'
                    : lang === 'th'
                      ? 'ไม่มีคาบสอนวันนี้'
                      : 'No classes today'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                {lang === 'th'
                  ? 'เปิดดูฟังก์ชันอื่นๆ ได้ที่เมนูจุดสามจุด (⋮) ด้านบน'
                  : 'Open more tools from the top-right menu (⋮)'}
              </p>
            </div>
          </div>
          {canViewTimetable && (
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          )}
        </button>
      )}

      {isTeacher && canSelfCheckin && (() => {
        const checkInTimeText = formatShortAttendanceTime(todayCheckin?.time);
        const checkOutTimeText = formatShortAttendanceTime(todayCheckout?.time || todayCheckin?.checkOutTime);
        const checkInPhoto = todayCheckin ? resolveRecordPhotoSource(todayCheckin) : undefined;
        const checkOutPhoto = todayCheckout ? resolveRecordPhotoSource(todayCheckout) : undefined;
        return (
          <button
            type="button"
            onClick={() => {
              setMobileAttendanceInitialSubTab('selfie_mobile');
              setActiveTab('checkin');
            }}
            className="w-full min-h-[64px] p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-3 cursor-pointer transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {checkInPhoto ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-subtle)] shrink-0">
                    <AttendancePhoto
                      src={checkInPhoto}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {checkOutPhoto && (
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-subtle)] shrink-0">
                      <AttendancePhoto
                        src={checkOutPhoto}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ลงเวลาเข้า-ออกวันนี้ของฉัน' : 'My School Check-in Today'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate mt-0.5">
                  {checkInTimeText
                    ? lang === 'th'
                      ? `เข้า ${checkInTimeText} น.${checkOutTimeText ? ` · ออก ${checkOutTimeText} น.` : ' · ยังไม่ลงเวลาออก'}`
                      : `In ${checkInTimeText}${checkOutTimeText ? ` · Out ${checkOutTimeText}` : ''}`
                    : lang === 'th'
                      ? 'แตะเพื่อถ่ายรูปลงเวลา / ดูประวัติย้อนหลัง'
                      : 'Tap to clock in or check history'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          </button>
        );
      })()}

      {isParent && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('attendance_history')}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {todayCheckin && resolveRecordPhotoSource(todayCheckin) && (
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-subtle)] shrink-0">
                  <AttendancePhoto
                    src={resolveRecordPhotoSource(todayCheckin)}
                    alt={linkedStudents[0]?.firstNameTh || 'student'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-medium text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'เวลาเข้า-ออกโรงเรียนวันนี้' : "Child's Attendance Today"}
                </p>
                <p className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                  {todayCheckin
                    ? (() => {
                        const inTime = formatShortAttendanceTime(todayCheckin.time) || todayCheckin.time;
                        const outTime = formatShortAttendanceTime(todayCheckout?.time || todayCheckin.checkOutTime);
                        return lang === 'th'
                          ? `เข้า ${inTime} น.${outTime ? ` · ออก ${outTime} น.` : ''}`
                          : `In ${inTime}${outTime ? ` · Out ${outTime}` : ''}`;
                      })()
                    : lang === 'th'
                      ? 'ยังไม่มีบันทึกวันนี้'
                      : 'No record today'}
                </p>
                {linkedStudents.length > 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {linkedStudents[0].firstNameTh} {linkedStudents[0].lastNameTh} ·{' '}
                    {linkedStudents[0].gradeLevel} {linkedStudents[0].room}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          </button>

          {canOpenLeave && (
            <button
              type="button"
              onClick={() => setActiveTab('leave')}
              className="w-full min-h-[54px] px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2.5 cursor-pointer"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ยื่นใบลาให้บุตรหลาน' : 'Submit Leave Request'}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] tabular-nums shrink-0">
                {pendingLeavesCount > 0 && (
                  <span>{pendingLeavesCount} {lang === 'th' ? 'รออนุมัติ' : 'pending'}</span>
                )}
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
