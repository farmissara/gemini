import React from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Compass,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  LogIn,
  LogOut,
  Megaphone,
  ShieldCheck,
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
  todayBangkokStr: string;
  bangkokClock: BangkokClockSnapshot;
  todayMySlots: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  periodAttendance: PeriodAttendanceRecord[];
  scopedCoursesCount: number;
  scopedAnnouncementsCount: number;
  pendingLeavesCount: number;
  scopedAssignmentsCount?: number;
  lessonsCount?: number;
  execMetrics: ExecMetrics;
  getSlotTodayCheckStatus: (
    slot: TimetableSlot,
    dateValue: string
  ) => { hasCheckIn: boolean; hasCheckOut: boolean };
  openPeriodCheckinFromSlot: (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => void;
  setMobileAttendanceInitialSubTab: (
    subTab: 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin'
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
  canSwitchAdminTeacherMode,
  onSwitchOperationalRole,
  todayHoliday,
  upcomingHoliday,
  canSelfCheckin,
  canViewTimetable,
  canOpenLeave,
  canOpenCareerQuest,
  canPlayGames,
  canOpenAnnouncements,
  canViewDigitalId,
  canAccessHomework = false,
  canOpenLms = false,
  canOpenBehaviorSdq = false,
  canOpenInfirmary = false,
  isModuleEnabled,
  todayCheckin,
  todayBangkokStr,
  bangkokClock,
  todayMySlots,
  schoolPeriods,
  periodAttendance,
  scopedCoursesCount,
  scopedAnnouncementsCount,
  pendingLeavesCount,
  scopedAssignmentsCount = 0,
  lessonsCount = 0,
  execMetrics,
  getSlotTodayCheckStatus,
  openPeriodCheckinFromSlot,
  setMobileAttendanceInitialSubTab,
  setMobileTimetableMode,
  setActiveTab,
  setActiveGameView,
}) => {
  return (
    <>
      {/* Crisp Personal Greeting + Class/Department Context */}
      <div className="pt-1 space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-title)] truncate">
          {lang === 'th' ? 'สวัสดี' : 'Hello'} {currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน'}
        </h1>
        <p className="text-xs font-medium text-[var(--color-text-muted)] truncate tabular-nums">
          {currentRole === 'parent' && linkedStudents.length > 0
            ? `${lang === 'th' ? 'ผู้ปกครองของ' : 'Parent of'} ${linkedStudents[0].firstNameTh} (${linkedStudents[0].gradeLevel} ${linkedStudents[0].room})`
            : currentRole === 'teacher'
              ? `${currentUser?.department || (lang === 'th' ? 'ครูผู้สอน' : 'Teacher')} · ${lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn}`
              : lang === 'th'
                ? activeSchool.nameTh
                : activeSchool.nameEn}
        </p>
      </div>

      {/* 1-click Admin Mode Switch for Dual-Privilege Teachers */}
      {currentRole === 'teacher' && canSwitchAdminTeacherMode && onSwitchOperationalRole && (
        <button
          type="button"
          onClick={() => onSwitchOperationalRole('admin')}
          className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-between gap-2 cursor-pointer transition"
        >
          <span className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold truncate">
              {lang === 'th' ? 'สลับเข้าสู่โหมด Admin (มีสิทธิ์ผู้ดูแล)' : 'Switch to School Admin Mode'}
            </span>
          </span>
          <ArrowLeftRight className="w-4 h-4 shrink-0" />
        </button>
      )}

      {/* Today / Upcoming Holiday Alert */}
      {todayHoliday ? (
        <button
          type="button"
          onClick={() => {
            setMobileTimetableMode('calendar');
            setActiveTab('timetable');
          }}
          className="w-full rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>{todayHoliday.type === 'school' ? 'วันหยุดพิเศษโรงเรียน' : 'วันหยุดราชการวันนี้'}</span>
            </p>
            <p className="text-sm font-bold text-[var(--color-text-title)] truncate">{todayHoliday.nameTh}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">งดการเรียนการสอนปกติ · แตะเพื่อดูปฏิทินวันหยุด</p>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-500 shrink-0" />
        </button>
      ) : upcomingHoliday ? (
        <button
          type="button"
          onClick={() => {
            setMobileTimetableMode('calendar');
            setActiveTab('timetable');
          }}
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-left flex items-center justify-between gap-3 cursor-pointer hover:border-rose-300 transition"
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs text-[var(--color-text-body)] truncate tabular-nums">
              วันหยุดถัดไป: <strong className="text-[var(--color-text-title)]">{upcomingHoliday.nameTh}</strong> (
              {upcomingHoliday.date})
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
        </button>
      ) : null}

      {/* 1 Large Primary Action Button */}
      {(canSelfCheckin || canViewTimetable) && (
        <button
          type="button"
          onClick={() => {
            setMobileAttendanceInitialSubTab('selfie_mobile');
            setActiveTab(canSelfCheckin ? 'checkin' : 'timetable');
          }}
          className="w-full min-h-[56px] px-5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-base flex items-center justify-between transition active:scale-[0.99] cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <span className="block">
              {!canSelfCheckin
                ? lang === 'th'
                  ? 'ตารางเรียนวันนี้'
                  : 'Today Timetable'
                : currentRole === 'teacher'
                  ? lang === 'th'
                    ? 'เช็คชื่อเข้าสอน'
                    : 'Class Check-in'
                  : currentRole === 'parent'
                    ? lang === 'th'
                      ? 'ดูเวลาเข้า-ออกบุตรหลาน'
                      : 'Child Attendance'
                    : lang === 'th'
                      ? 'เช็คชื่อเข้า-ออก'
                      : 'Check-in & Out'}
            </span>
            {todayCheckin && currentRole !== 'parent' && (
              <span className="block text-[11px] font-normal text-white/85 tabular-nums">
                {lang === 'th'
                  ? `เช็คชื่อเข้า รร. แล้ว เวลา ${todayCheckin.time} น.`
                  : `Checked in at ${todayCheckin.time}`}
              </span>
            )}
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" />
        </button>
      )}

      {/* Timed Period Check-in/Out Missions + Active Period Red Highlight */}
      {currentRole === 'teacher' &&
        !todayHoliday &&
        !isWeekendDate(todayBangkokStr) &&
        todayMySlots.length > 0 &&
        (() => {
          const activeNowSlot = todayMySlots.find(
            (s) =>
              getTimetableSlotActivityStatus({
                slot: s,
                schoolPeriods,
                now: bangkokClock,
                schoolId: activeSchool.id,
              }).isActive
          );
          const nextUpcomingSlot = todayMySlots.find((s) => {
            const st = getTimetableSlotActivityStatus({
              slot: s,
              schoolPeriods,
              now: bangkokClock,
              schoolId: activeSchool.id,
            });
            return st.endMinutes !== null && st.endMinutes >= bangkokClock.minutes;
          });
          const featuredSlot = activeNowSlot || nextUpcomingSlot || todayMySlots[0];
          const featuredActivity = getTimetableSlotActivityStatus({
            slot: featuredSlot,
            schoolPeriods,
            now: bangkokClock,
            schoolId: activeSchool.id,
          });
          const status = getSlotTodayCheckStatus(featuredSlot, todayBangkokStr);
          const nextCheckType: 'check_in' | 'check_out' =
            status.hasCheckIn && !status.hasCheckOut ? 'check_out' : 'check_in';
          return (
            <div className="space-y-3">
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
                onOpenSchedule={() => {
                  setMobileTimetableMode('day');
                  setActiveTab('timetable');
                }}
                periodAttendance={periodAttendance}
              />

              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  featuredActivity.isActive
                    ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/75 dark:bg-rose-950/35'
                    : 'border-[var(--color-border)] bg-[var(--color-card)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--color-primary-text)] tabular-nums flex items-center gap-1.5 flex-wrap">
                    {featuredActivity.isActive && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                        ถึงคาบเรียน
                        {featuredActivity.remainingMinutes !== null
                          ? ` · เหลือ ${featuredActivity.remainingMinutes} น.`
                          : ''}
                      </span>
                    )}
                    <span>
                      {lang === 'th'
                        ? `คาบ ${featuredSlot.periodNumber} (${featuredActivity.startTime}–${featuredActivity.endTime})`
                        : `Period ${featuredSlot.periodNumber} · ${featuredActivity.startTime}–${featuredActivity.endTime}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileTimetableMode('day');
                      setActiveTab('timetable');
                    }}
                    className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer tabular-nums"
                  >
                    ทั้งหมด {todayMySlots.length} คาบ
                  </button>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                    {featuredSlot.courseCode} · {featuredSlot.courseTitleTh || featuredSlot.courseTitleEn}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                    {featuredSlot.classRoom} {featuredSlot.room ? `· ห้อง ${featuredSlot.room}` : ''} ·{' '}
                    {featuredSlot.teacherName}
                  </p>
                </div>
                {canSelfCheckin && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openPeriodCheckinFromSlot(featuredSlot, todayBangkokStr, nextCheckType)}
                      className={`flex-1 min-h-[44px] rounded-xl px-3 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                        featuredActivity.isActive
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : nextCheckType === 'check_out'
                            ? 'bg-slate-800 hover:bg-slate-900'
                            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                      }`}
                    >
                      {nextCheckType === 'check_out' ? (
                        <LogOut className="w-4 h-4" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>
                        {status.hasCheckIn && status.hasCheckOut
                          ? 'เช็คอิน/เอาท์แล้ว · อัปเดต'
                          : nextCheckType === 'check_out'
                            ? 'เช็คเอาท์คาบนี้'
                            : featuredActivity.isActive
                              ? 'เช็คอินเข้าคาบตอนนี้'
                              : 'เช็คอิน/เอาท์รายคาบ'}
                      </span>
                    </button>
                    {!status.hasCheckIn && (
                      <button
                        type="button"
                        onClick={() => openPeriodCheckinFromSlot(featuredSlot, todayBangkokStr, 'check_out')}
                        className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                          featuredActivity.isActive
                            ? 'border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-200'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>เช็คเอาท์</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Single-line Clean List Rows */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
        {currentRole === 'teacher' && canViewTimetable && (
          <button
            type="button"
            onClick={() => {
              setMobileTimetableMode('day');
              setActiveTab('timetable');
            }}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>{lang === 'th' ? 'ตารางสอนวันนี้' : 'Today Teaching Schedule'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {todayHoliday
                ? lang === 'th'
                  ? 'วันหยุด'
                  : 'Holiday'
                : `${todayMySlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {(currentRole === 'teacher' || currentRole === 'parent') && canViewTimetable && (
          <button
            type="button"
            onClick={() => {
              setMobileTimetableMode('calendar');
              setActiveTab('timetable');
            }}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>{lang === 'th' ? 'ปฏิทินเรียน & วันหยุดราชการ' : 'Calendar & Public Holidays'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-2 shrink-0">
              <span>.ics</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && isModuleEnabled('gradebook') && (
          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'th' ? 'กรอกคะแนน ปพ.5 ด่วน' : 'Quick Gradebook (PP.5)'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {scopedCoursesCount} {lang === 'th' ? 'วิชา' : 'courses'}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && (
          <button
            type="button"
            onClick={() => setActiveTab('executive')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {execMetrics.attendanceRate}%
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && canAccessHomework && (
          <button
            type="button"
            onClick={() => setActiveTab('homework')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>{lang === 'th' ? 'การบ้าน & ตรวจงานนักเรียน' : 'Homework & Grading'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {scopedAssignmentsCount} {lang === 'th' ? 'งาน' : 'tasks'}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && canOpenLms && (
          <button
            type="button"
            onClick={() => setActiveTab('lms')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-sky-600" />
              <span>{lang === 'th' ? 'ห้องเรียน & บทเรียน LMS' : 'LMS Classroom'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {lessonsCount} {lang === 'th' ? 'บทเรียน' : 'lessons'}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && canOpenBehaviorSdq && (
          <button
            type="button"
            onClick={() => setActiveTab('behavior_sdq')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-rose-600" />
              <span>{lang === 'th' ? 'พฤติกรรม & คัดกรอง SDQ' : 'Behavior & SDQ'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {execMetrics.riskCount > 0 ? `เสี่ยง ${execMetrics.riskCount}` : lang === 'th' ? 'บันทึก' : 'Log'}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && canOpenInfirmary && (
          <button
            type="button"
            onClick={() => setActiveTab('infirmary')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              <span>{lang === 'th' ? 'ห้องพยาบาล & ประวัติแพ้ยา' : 'Infirmary & Allergies'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {execMetrics.todayInfirmary > 0 ? `${execMetrics.todayInfirmary} วันนี้` : ''}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'parent' && (
          <button
            type="button"
            onClick={() => setActiveTab('attendance_history')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)]">
              {lang === 'th' ? 'ประวัติมาเรียนบุตรหลาน' : 'Child Attendance Logs'}
            </span>
            <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)] flex items-center gap-2 shrink-0">
              {todayCheckin ? `วันนี้ ${todayCheckin.time} น.` : lang === 'th' ? 'ดูย้อนหลัง' : 'History'}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {canOpenLeave && (
          <button
            type="button"
            onClick={() => setActiveTab('leave')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>{lang === 'th' ? 'ยื่นใบลาออนไลน์' : 'Leave Requests'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {pendingLeavesCount > 0 ? `${pendingLeavesCount}` : ''}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        {currentRole === 'teacher' && canOpenCareerQuest && (
          <button
            type="button"
            onClick={() => setActiveTab('career_quest')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-violet-600" />
              <span>{lang === 'th' ? 'เส้นทางอาชีพ (Career Quest AI)' : 'Career Quest AI'}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          </button>
        )}

        {currentRole === 'teacher' && canPlayGames && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('games');
              setActiveGameView('hub');
            }}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <Gamepad2 className="w-4 h-4 text-purple-600" />
              <span>{lang === 'th' ? 'เกมส์ความรู้ & แล็บจำลอง' : 'Learning Games & Labs'}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          </button>
        )}

        {canOpenAnnouncements && (
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'th' ? 'ประกาศจากโรงเรียน' : 'School Announcements'}</span>
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-2 shrink-0">
              {scopedAnnouncementsCount}
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="w-full min-h-[56px] px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
        >
          <span className="text-sm font-semibold text-[var(--color-text-title)]">
            {canViewDigitalId
              ? lang === 'th'
                ? 'บัตรดิจิทัล & ตั้งค่า'
                : 'Digital ID & Settings'
              : lang === 'th'
                ? 'ตั้งค่าบัญชี'
                : 'Account Settings'}
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
        </button>
      </div>
    </>
  );
};
