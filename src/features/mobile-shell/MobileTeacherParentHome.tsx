import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Compass,
  CreditCard,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  LayoutGrid,
  LogIn,
  Megaphone,
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
    subTab: 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin'
  ) => void;
  setMobileTimetableMode: (mode: 'day' | 'calendar') => void;
  setActiveTab: (tab: MobileTab) => void;
  setActiveGameView: (view: ActiveGameView) => void;
}

type TeacherParentHomeTab = 'today' | 'tools' | 'more';

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
  scopedAnnouncementsCount,
  pendingLeavesCount,
  scopedAssignmentsCount = 0,
  lessonsCount = 0,
  execMetrics,
  getSlotTodayCheckStatus,
  onOpenStudentAttendance,
  openPeriodCheckinFromSlot,
  setMobileAttendanceInitialSubTab,
  setMobileTimetableMode,
  setActiveTab,
  setActiveGameView,
}) => {
  const [homeTab, setHomeTab] = useState<TeacherParentHomeTab>('today');
  const isTeacher = currentRole === 'teacher';
  const isParent = currentRole === 'parent';
  const isWeekend = isWeekendDate(todayBangkokStr);

  const tabs: Array<{ id: TeacherParentHomeTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'today',
      label: isTeacher ? (lang === 'th' ? 'สอนวันนี้' : 'Today') : lang === 'th' ? 'วันนี้' : 'Today',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'tools',
      label: isTeacher ? (lang === 'th' ? 'งานครู' : 'Tools') : lang === 'th' ? 'เมนู' : 'Menus',
      icon: <LayoutGrid className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'more',
      label: isTeacher
        ? lang === 'th'
          ? 'ประกาศ/อื่นๆ'
          : 'News/More'
        : lang === 'th'
          ? 'ประกาศ'
          : 'News',
      icon: <Megaphone className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

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
    <div className="flex flex-col gap-2.5 pb-2 animate-in fade-in duration-150">
      {/* 1. COMPACT PRIMARY ACTION BUTTON */}
      {(canSelfCheckin || canViewTimetable) && (
        <button
          type="button"
          onClick={() => {
            setMobileAttendanceInitialSubTab('selfie_mobile');
            setActiveTab(canSelfCheckin ? 'checkin' : 'timetable');
          }}
          className="w-full min-h-[40px] h-10 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs flex items-center justify-between gap-2 transition active:scale-[0.99] cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {!canSelfCheckin
                ? lang === 'th'
                  ? 'ตารางเรียนวันนี้'
                  : 'Today Timetable'
                : isTeacher
                  ? lang === 'th'
                    ? 'เช็คชื่อเข้าสอน'
                    : 'Class Check-in'
                  : isParent
                    ? lang === 'th'
                      ? 'ดูเวลาเข้า-ออกบุตรหลาน'
                      : 'Child Attendance'
                    : lang === 'th'
                      ? 'เช็คชื่อเข้า-ออก'
                      : 'Check-in & Out'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {todayCheckin && !isParent && (
              <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-medium text-white tabular-nums whitespace-nowrap">
                {lang === 'th' ? `เข้า ${todayCheckin.time}` : todayCheckin.time}
              </span>
            )}
            <ChevronRight className="w-4 h-4 shrink-0" />
          </div>
        </button>
      )}

      {/* 2. SEGMENTED 3-TAB BAR */}
      <div
        role="tablist"
        aria-label={lang === 'th' ? 'หมวดเมนูหลัก' : 'Home sections'}
        className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]"
      >
        {tabs.map((tab) => {
          const isSelected = homeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setHomeTab(tab.id)}
              className={`min-h-[38px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] border border-transparent'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB PANEL: TODAY */}
      {homeTab === 'today' && (
        <div role="tabpanel" className="flex flex-col gap-2.5 animate-in fade-in duration-150">
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
              onOpenSchedule={() => {
                setMobileTimetableMode('day');
                setActiveTab('timetable');
              }}
              periodAttendance={periodAttendance}
            />
          )}

          {isTeacher && !featuredSlot && (
            <div className="grid grid-cols-2 gap-2">
              {canViewTimetable && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileTimetableMode('day');
                    setActiveTab('timetable');
                  }}
                  className="min-h-[68px] p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex flex-col justify-between cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ตารางสอนวันนี้' : 'Today Schedule'}
                  </span>
                  <span className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                    {todayHoliday || isWeekend
                      ? lang === 'th'
                        ? 'วันหยุด'
                        : 'Day off'
                      : `${todayMySlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`}
                  </span>
                </button>
              )}
              {canSelfCheckin && (
                <button
                  type="button"
                  onClick={onOpenStudentAttendance}
                  className="min-h-[68px] p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex flex-col justify-between cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'เช็คชื่อนักเรียน' : 'Student attendance'}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'เข้า-ออกโรงเรียน · รายคาบ' : 'School entry/exit · Periods'}
                  </span>
                </button>
              )}
            </div>
          )}

          {isParent && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('attendance_history')}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'เวลาเข้า-ออกโรงเรียนวันนี้' : "Child's Attendance Today"}
                  </p>
                  <p className="text-base font-bold text-[var(--color-text-title)] tabular-nums">
                    {todayCheckin
                      ? lang === 'th'
                        ? `เช็คชื่อแล้ว · ${todayCheckin.time} น.`
                        : `Checked in · ${todayCheckin.time}`
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
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                {canViewTimetable && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileTimetableMode('day');
                      setActiveTab('timetable');
                    }}
                    className="min-h-[60px] px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-left flex items-center gap-2.5 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'ตารางเรียน' : 'Timetable'}
                    </span>
                  </button>
                )}
                {canOpenLeave && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('leave')}
                    className="min-h-[60px] px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-left flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                        {lang === 'th' ? 'ยื่นใบลา' : 'Leave'}
                      </p>
                      {pendingLeavesCount > 0 && (
                        <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                          {pendingLeavesCount} {lang === 'th' ? 'รออนุมัติ' : 'pending'}
                        </p>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB PANEL: ALL TOOLS / MENUS IN A COMPACT 2-COL GRID */}
      {homeTab === 'tools' && (
        <div role="tabpanel" className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in duration-150">
          {isTeacher && canViewTimetable && (
            <button
              type="button"
              onClick={() => {
                setMobileTimetableMode('day');
                setActiveTab('timetable');
              }}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ตารางสอนวันนี้' : 'Schedule'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {todayHoliday
                    ? lang === 'th'
                      ? 'วันหยุด'
                      : 'Holiday'
                    : `${todayMySlots.length} ${lang === 'th' ? 'คาบ' : 'slots'}`}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canSelfCheckin && (
            <button
              type="button"
              onClick={onOpenStudentAttendance}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-emerald-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'เช็คชื่อนักเรียน' : 'Student attendance'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {lang === 'th' ? 'เข้า-ออกโรงเรียน · รายคาบ' : 'School entry/exit · Periods'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canAccessHomework && (
            <button
              type="button"
              onClick={() => setActiveTab('homework')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-blue-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'การบ้าน/ตรวจงาน' : 'Homework'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {scopedAssignmentsCount} {lang === 'th' ? 'งาน' : 'tasks'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canOpenLms && (
            <button
              type="button"
              onClick={() => setActiveTab('lms')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-sky-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <GraduationCap className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ห้องเรียน LMS' : 'LMS'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {lessonsCount} {lang === 'th' ? 'บทเรียน' : 'lessons'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canOpenBehaviorSdq && (
            <button
              type="button"
              onClick={() => setActiveTab('behavior_sdq')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-rose-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <HeartHandshake className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'พฤติกรรม SDQ' : 'Behavior'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {execMetrics.riskCount > 0 ? `เสี่ยง ${execMetrics.riskCount}` : lang === 'th' ? 'บันทึก' : 'Log'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canOpenInfirmary && (
            <button
              type="button"
              onClick={() => setActiveTab('infirmary')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-teal-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <HeartPulse className="w-4 h-4 text-teal-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ห้องพยาบาล' : 'Infirmary'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {execMetrics.todayInfirmary > 0
                    ? `${execMetrics.todayInfirmary} วันนี้`
                    : lang === 'th'
                      ? 'ประวัติแพ้ยา'
                      : 'Records'}
                </p>
              </div>
            </button>
          )}

          {isParent && (
            <button
              type="button"
              onClick={() => setActiveTab('attendance_history')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ประวัติมาเรียน' : 'Attendance'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {todayCheckin ? `วันนี้ ${todayCheckin.time} น.` : lang === 'th' ? 'ดูย้อนหลัง' : 'Logs'}
                </p>
              </div>
            </button>
          )}

          {isParent && canViewTimetable && (
            <button
              type="button"
              onClick={() => {
                setMobileTimetableMode('day');
                setActiveTab('timetable');
              }}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-blue-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ตารางเรียน' : 'Timetable'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {lang === 'th' ? 'รายวัน/สัปดาห์' : 'Daily view'}
                </p>
              </div>
            </button>
          )}

          {canOpenLeave && (
            <button
              type="button"
              onClick={() => setActiveTab('leave')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-amber-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ยื่นใบลา' : 'Leave'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {pendingLeavesCount > 0 ? `${pendingLeavesCount} รอตรวจ` : lang === 'th' ? 'ออนไลน์' : 'Request'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && (
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-indigo-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'ภาพรวม รร.' : 'Overview'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                  {execMetrics.attendanceRate}% {lang === 'th' ? 'มาเรียน' : 'rate'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canPlayGames && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('games');
                setActiveGameView('hub');
              }}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-purple-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <Gamepad2 className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'เกม & แล็บ' : 'Games & Labs'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {lang === 'th' ? 'ฝึกฝน 8 สาระ' : 'Play & learn'}
                </p>
              </div>
            </button>
          )}

          {isTeacher && canOpenCareerQuest && (
            <button
              type="button"
              onClick={() => setActiveTab('career_quest')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-violet-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <Compass className="w-4 h-4 text-violet-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  Career Quest
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {lang === 'th' ? 'เส้นทางอาชีพ' : 'Career AI'}
                </p>
              </div>
            </button>
          )}

          {isParent && (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="min-h-[60px] px-3 py-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-cyan-400 text-left flex items-center gap-2.5 cursor-pointer transition"
            >
              <CreditCard className="w-4 h-4 text-cyan-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {canViewDigitalId
                    ? lang === 'th'
                      ? 'บัตรดิจิทัล'
                      : 'Digital ID'
                    : lang === 'th'
                      ? 'ตั้งค่าบัญชี'
                      : 'Settings'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {lang === 'th' ? 'ข้อมูล & รหัสผ่าน' : 'Account'}
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* 6. TAB PANEL: ANNOUNCEMENTS / CALENDAR / ACCOUNT */}
      {homeTab === 'more' && (
        <div
          role="tabpanel"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden animate-in fade-in duration-150"
        >
          {canOpenAnnouncements && (
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
            >
              <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === 'th' ? 'ประกาศจากโรงเรียน' : 'School Announcements'}</span>
              </span>
              <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-1.5 shrink-0">
                {scopedAnnouncementsCount}
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          {canViewTimetable && (
            <button
              type="button"
              onClick={() => {
                setMobileTimetableMode('calendar');
                setActiveTab('timetable');
              }}
              className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
            >
              <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{lang === 'th' ? 'ปฏิทินเรียน & วันหยุดราชการ' : 'Calendar & Public Holidays'}</span>
              </span>
              <span className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1.5 shrink-0">
                <span>.ics</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          {canOpenLeave && (
            <button
              type="button"
              onClick={() => setActiveTab('leave')}
              className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
            >
              <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{lang === 'th' ? 'ยื่นใบลาออนไลน์' : 'Leave Requests'}</span>
              </span>
              <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums flex items-center gap-1.5 shrink-0">
                {pendingLeavesCount > 0 ? `${pendingLeavesCount}` : ''}
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
          >
            <span className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>
                {canViewDigitalId
                  ? lang === 'th'
                    ? 'บัตรดิจิทัล & ตั้งค่าบัญชี'
                    : 'Digital ID & Settings'
                  : lang === 'th'
                    ? 'ตั้งค่าบัญชี'
                    : 'Account Settings'}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
};

