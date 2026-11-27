import React, { useState } from 'react';
import {
  Award,
  BellRing,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  FileText,
  Gamepad2,
  GraduationCap,
  LayoutGrid,
  Library,
  LogIn,
  LogOut,
} from 'lucide-react';
import heroCampusImg from '../../assets/images/student_hero_campus_1794996856983.jpg';
import {
  Announcement,
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  Course,
  GradeRecord,
  GradingSystem,
  PlayerScore,
  School,
  SchoolPeriodTime,
  Student,
  TimetableSlot,
} from '../../types';
import { getProfileFrame } from '../../lib/arcadeStore';
import { calculateStudentAcademicSummary } from '../../lib/moeGrading';
import { calculateGrade } from '../../lib/schoolSettings';
import {
  getTimetableSlotActivityStatus,
  type BangkokClockSnapshot,
} from '../../lib/timetableCalendar';
import { isWeekendDate, type ThaiHoliday } from '../../lib/thaiHolidays';
import { AttendancePhoto } from '../AttendancePhoto';
import {
  formatShortAttendanceTime,
  resolveRecordPhotoSource,
} from '../../lib/personalAttendanceHistory';
import { FutureIconBadge, FutureNavIcon } from '../common/FutureIcon';

interface StudentMobileHomeProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  ownStudent?: Student;
  playerProfile?: PlayerScore;
  lang: AppLanguage;
  todayCheckin?: AttendanceRecord;
  todayCheckout?: AttendanceRecord;
  scopedAttendance: AttendanceRecord[];
  scopedCourses: Course[];
  grades: GradeRecord[];
  gradingSystem: GradingSystem;
  todayMySlots: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  bangkokClock: BangkokClockSnapshot;
  todayBangkokStr: string;
  todayHoliday: ThaiHoliday | null;
  upcomingHoliday: ThaiHoliday | null;
  pendingHomeworkCount: number;
  totalHomeworkCount?: number;
  pendingLeavesCount: number;
  myPortfolioCount: number;
  scopedAnnouncements: Announcement[];
  canSelfCheckin: boolean;
  canAccessHomework: boolean;
  canPlayGames: boolean;
  canViewGrades: boolean;
  canViewTimetable?: boolean;
  canOpenPortfolio?: boolean;
  canOpenLeave?: boolean;
  canOpenAnnouncements?: boolean;
  canViewDigitalId?: boolean;
  canOpenLms?: boolean;
  lessonsCount?: number;
  getSlotTodayCheckStatus: (
    slot: TimetableSlot,
    dateValue: string
  ) => { hasCheckIn: boolean; hasCheckOut: boolean };
  onOpenCheckin: () => void;
  onTriggerPeriodCheckin: (
    slot: TimetableSlot,
    dateValue: string,
    checkType: 'check_in' | 'check_out'
  ) => void;
  onOpenTimetable: (mode: 'day' | 'calendar') => void;
  onOpenHomework: () => void;
  onOpenGrades: () => void;
  onOpenPortfolio: () => void;
  onOpenLeave: () => void;
  onOpenAnnouncements: (announcement?: Announcement) => void;
  onOpenGames: () => void;
  onOpenCareerQuest?: () => void;
  onOpenAttendanceHistory?: () => void;
  onOpenDigitalId?: () => void;
  onOpenLms?: () => void;
}

type StudentHomeTab = 'today' | 'academics' | 'menu';

const getBarTone = (percent: number): string => {
  if (percent >= 80) return 'bg-emerald-600 dark:bg-emerald-500';
  if (percent >= 65) return 'bg-[var(--color-primary)]';
  if (percent >= 50) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-rose-600 dark:bg-rose-500';
};

interface StudentDirectoryRowProps {
  icon: React.ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
}

const StudentDirectoryRow: React.FC<StudentDirectoryRowProps> = ({ icon, label, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full min-h-[48px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] active:bg-[var(--color-card-subtle)] cursor-pointer transition"
  >
    <span className="flex items-center gap-3 min-w-0">
      <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-sm font-medium text-[var(--color-text-title)] truncate">{label}</span>
    </span>
    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] tabular-nums shrink-0">
      {meta && <span>{meta}</span>}
      <ChevronRight className="w-4 h-4 shrink-0" />
    </span>
  </button>
);

export const StudentMobileHome: React.FC<StudentMobileHomeProps> = ({
  currentUser,
  activeSchool,
  ownStudent,
  playerProfile,
  lang,
  todayCheckin,
  todayCheckout,
  scopedAttendance,
  scopedCourses,
  grades,
  gradingSystem,
  todayMySlots,
  schoolPeriods,
  bangkokClock,
  todayBangkokStr,
  todayHoliday,
  upcomingHoliday,
  pendingHomeworkCount,
  totalHomeworkCount = 0,
  pendingLeavesCount,
  myPortfolioCount,
  scopedAnnouncements,
  canSelfCheckin,
  canAccessHomework,
  canPlayGames,
  canViewGrades,
  canViewTimetable = true,
  canOpenPortfolio = true,
  canOpenLeave = true,
  canOpenAnnouncements = true,
  canViewDigitalId = false,
  canOpenLms = false,
  lessonsCount = 0,
  getSlotTodayCheckStatus,
  onOpenCheckin,
  onTriggerPeriodCheckin,
  onOpenTimetable,
  onOpenHomework,
  onOpenGrades,
  onOpenPortfolio,
  onOpenLeave,
  onOpenAnnouncements,
  onOpenGames,
  onOpenCareerQuest,
  onOpenAttendanceHistory,
  onOpenDigitalId,
  onOpenLms,
}) => {
  const [activeHomeTab, setActiveHomeTab] = useState<StudentHomeTab>('today');

  const currentHour = Math.floor(bangkokClock.minutes / 60);
  const greetingText =
    lang === 'th'
      ? currentHour < 12
        ? 'สวัสดีตอนเช้า'
        : currentHour < 17
          ? 'สวัสดีตอนบ่าย'
          : 'สวัสดีตอนเย็น'
      : currentHour < 12
        ? 'Good morning'
        : currentHour < 17
          ? 'Good afternoon'
          : 'Good evening';

  const displayName =
    (lang === 'th'
      ? currentUser?.fullNameTh || (ownStudent ? `${ownStudent.firstNameTh} ${ownStudent.lastNameTh}` : '')
      : currentUser?.fullNameEn || (ownStudent ? `${ownStudent.firstNameEn} ${ownStudent.lastNameEn}` : '')) ||
    currentUser?.fullNameTh ||
    currentUser?.email ||
    (lang === 'th' ? 'นักเรียน' : 'Student');

  const avatarUrl = currentUser?.avatarUrl || ownStudent?.avatarUrl || '';
  const initials = displayName.trim().slice(0, 2);

  // Real attendance rate & breakdown
  const attendanceOnTime = scopedAttendance.filter((r) => r.status === 'present').length;
  const attendanceLate = scopedAttendance.filter((r) => r.status === 'late').length;
  const attendanceAbsent = Math.max(0, scopedAttendance.length - attendanceOnTime - attendanceLate);
  const attendancePresentOrLate = attendanceOnTime + attendanceLate;
  const attendanceRate =
    scopedAttendance.length > 0
      ? Math.round((attendancePresentOrLate / scopedAttendance.length) * 100)
      : null;
  const attendanceOnTimePct =
    scopedAttendance.length > 0 ? Math.round((attendanceOnTime / scopedAttendance.length) * 100) : 0;
  const attendanceLatePct =
    scopedAttendance.length > 0
      ? Math.min(100 - attendanceOnTimePct, Math.round((attendanceLate / scopedAttendance.length) * 100))
      : 0;
  const attendanceStatusLabel =
    attendanceRate === null
      ? lang === 'th'
        ? 'ยังไม่มีบันทึก'
        : 'No logs'
      : attendanceRate >= 90
        ? lang === 'th'
          ? 'ดีเยี่ยม'
          : 'Excellent'
        : attendanceRate >= 80
          ? lang === 'th'
            ? 'ผ่านเกณฑ์'
            : 'On track'
          : lang === 'th'
            ? 'ต่ำกว่า 80%'
            : 'Below 80%';
  const attendanceStatusTone =
    attendanceRate === null
      ? 'text-[var(--color-text-muted)]'
      : attendanceRate >= 80
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-rose-700 dark:text-rose-400';

  // Real GPAX & per-subject score progress
  const ownGrades = ownStudent ? grades.filter((g) => g.studentId === ownStudent.id) : [];
  const academicSummary = ownStudent
    ? calculateStudentAcademicSummary({
        student: ownStudent,
        courses: scopedCourses,
        grades: ownGrades,
        gradingSystem,
      })
    : null;
  const realGpax =
    academicSummary?.gpax != null && academicSummary.gpax > 0
      ? academicSummary.gpax
      : ownStudent && ownStudent.gpa > 0
        ? ownStudent.gpa
        : null;
  const gpaxPercent = realGpax !== null ? Math.max(0, Math.min(100, Math.round((realGpax / 4) * 100))) : 0;

  const subjectBars = ownGrades
    .filter((g) => typeof g.totalScore === 'number' && !Number.isNaN(g.totalScore))
    .map((g) => {
      const course = scopedCourses.find((c) => c.id === g.courseId);
      const pct = Math.max(0, Math.min(100, Math.round(g.totalScore)));
      const gradeLabel = g.letterGrade || calculateGrade(g.totalScore, gradingSystem).letter;
      return {
        id: g.id,
        title: course ? (lang === 'th' ? course.titleTh : course.titleEn || course.titleTh) : g.courseId,
        percent: pct,
        gradeLabel,
      };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);

  const completedHomeworkCount = Math.max(0, totalHomeworkCount - pendingHomeworkCount);
  const homeworkProgressPercent =
    totalHomeworkCount > 0
      ? Math.round((completedHomeworkCount / totalHomeworkCount) * 100)
      : pendingHomeworkCount === 0
        ? 100
        : 0;

  // Determine single focus period (active now or next upcoming today)
  const isWeekend = isWeekendDate(todayBangkokStr);
  const activeNowSlot =
    !todayHoliday && !isWeekend
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
    !todayHoliday && !isWeekend
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
    activeNowSlot || nextUpcomingSlot || (!todayHoliday && !isWeekend ? todayMySlots[0] : undefined);
  const featuredActivity = featuredSlot
    ? getTimetableSlotActivityStatus({
        slot: featuredSlot,
        schoolPeriods,
        now: bangkokClock,
        schoolId: activeSchool.id,
      })
    : null;
  const featuredCheckStatus = featuredSlot
    ? getSlotTodayCheckStatus(featuredSlot, todayBangkokStr)
    : null;
  const featuredNextCheckType: 'check_in' | 'check_out' =
    featuredCheckStatus?.hasCheckIn && !featuredCheckStatus?.hasCheckOut ? 'check_out' : 'check_in';

  const formattedDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const equippedFrame = getProfileFrame(playerProfile?.equippedFrameId);
  const hasCustomFrame =
    playerProfile?.equippedFrameId && playerProfile.equippedFrameId !== 'frame-default';
  const dailyStreak = playerProfile?.dailyStreak || 0;

  const tabs: Array<{ id: StudentHomeTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'today',
      label: lang === 'th' ? 'วันนี้' : 'Today',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'academics',
      label: lang === 'th' ? 'ผลการเรียน' : 'Progress',
      icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'menu',
      label: lang === 'th' ? 'บริการอื่นๆ' : 'Services',
      icon: <LayoutGrid className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const effectiveTab: StudentHomeTab = activeHomeTab;

  return (
    <div className="flex flex-col gap-3 pb-2 animate-in fade-in duration-150">
      {/* 1. COMPACT VISUAL HERO HEADER + PRIMARY CTA */}
      <section className="relative rounded-2xl overflow-hidden shadow-md shadow-slate-900/15 bg-slate-900 flex flex-col justify-between">
        <img
          src={heroCampusImg}
          alt={lang === 'th' ? 'ภาพบรรยากาศโรงเรียน' : 'Campus atmosphere'}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/60 to-slate-950/35"
        />

        <div className="relative z-10 px-3.5 pt-3 pb-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-sky-200/95 tabular-nums truncate">
              {greetingText} · {formattedDate}
              {dailyStreak > 0 ? ` · ${dailyStreak} วันติด` : ''}
            </p>
            <h1 className="text-lg font-extrabold text-white tracking-tight leading-tight truncate mt-0.5">
              {displayName}
            </h1>
            <p className="text-[11px] text-slate-200/90 tabular-nums truncate">
              {ownStudent
                ? `${ownStudent.gradeLevel} ${ownStudent.room} · รหัส ${ownStudent.studentIdNumber}`
                : lang === 'th'
                  ? activeSchool.nameTh
                  : activeSchool.nameEn}
              {playerProfile?.equippedTitle ? ` · ${playerProfile.equippedTitle}` : ''}
            </p>
          </div>

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className={`w-10 h-10 rounded-xl object-cover shadow-md shrink-0 bg-slate-800 ${
                hasCustomFrame ? equippedFrame.ringClass : 'ring-2 ring-white/50'
              }`}
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md text-white font-bold text-sm flex items-center justify-center shrink-0 ${
                hasCustomFrame ? equippedFrame.ringClass : 'ring-1 ring-white/30'
              }`}
            >
              {initials}
            </div>
          )}
        </div>

        {(canSelfCheckin || canViewTimetable) && (
          <div className="relative z-10 px-3.5 pb-3 pt-0.5">
            <button
              type="button"
              onClick={() => (canSelfCheckin ? onOpenCheckin() : onOpenTimetable('day'))}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-bold text-sm flex items-center justify-between gap-2.5 shadow ring-1 ring-black/5 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FutureIconBadge
                  tone={todayCheckin ? 'tone-2' : 'tone-1'}
                  size="sm"
                  variant="solid"
                >
                  {todayCheckin ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : canSelfCheckin ? (
                    <FutureNavIcon tab="attendance" size={16} active />
                  ) : (
                    <FutureNavIcon tab="timetable" size={16} active />
                  )}
                </FutureIconBadge>
                <div className="text-left min-w-0">
                  <span className="block truncate leading-tight">
                    {!canSelfCheckin
                      ? lang === 'th'
                        ? 'ดูตารางเรียนวันนี้'
                        : 'Today Timetable'
                      : todayCheckin
                        ? lang === 'th'
                          ? 'เช็คชื่อแล้ว · เช็คชื่อออก'
                          : 'Checked in · Check out'
                        : lang === 'th'
                          ? 'เช็คชื่อเข้า-ออกโรงเรียน'
                          : 'School Check-in & Out'}
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500 truncate tabular-nums">
                    {todayCheckin
                      ? lang === 'th'
                        ? `ล่าสุด ${todayCheckin.time} น.`
                        : `Last at ${todayCheckin.time}`
                      : canSelfCheckin
                        ? lang === 'th'
                          ? 'เซลฟี่ GPS หรือแตะบัตร NFC'
                          : 'Selfie GPS or NFC tap'
                        : lang === 'th'
                          ? `${todayMySlots.length} คาบเรียนวันนี้`
                          : `${todayMySlots.length} classes today`}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        )}
      </section>

      {/* 2. COMPACT SEGMENTED 3-TAB NAVIGATION */}
      <div
        role="tablist"
        aria-label={lang === 'th' ? 'เมนูหน้านักเรียน' : 'Student sections'}
        className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]"
      >
        {tabs.map((tab) => {
          const isSelected = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveHomeTab(tab.id)}
              className={`min-h-[44px] px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
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
      {effectiveTab === 'today' && (
        <div role="tabpanel" className="flex flex-col gap-2.5 animate-in fade-in duration-150">
          {/* Active/Next Class Card */}
          {featuredSlot && featuredActivity ? (
            <section
              aria-label={lang === 'th' ? 'คาบเรียนปัจจุบัน' : 'Current class'}
              className={`rounded-2xl border p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition ${
                featuredActivity.isActive
                  ? 'border-rose-400 dark:border-rose-600 bg-rose-50/60 dark:bg-rose-950/25'
                  : 'border-[var(--color-border)] bg-[var(--color-card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 text-[var(--color-text-muted)] tabular-nums">
                  <Clock
                    className={`w-3.5 h-3.5 shrink-0 ${
                      featuredActivity.isActive ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--color-primary-text)]'
                    }`}
                  />
                  <span
                    className={`font-semibold truncate ${
                      featuredActivity.isActive
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-[var(--color-primary-text)]'
                    }`}
                  >
                    {featuredActivity.isActive
                      ? lang === 'th'
                        ? `กำลังเรียน · คาบ ${featuredSlot.periodNumber}`
                        : `In class · Period ${featuredSlot.periodNumber}`
                      : lang === 'th'
                        ? `คาบ ${featuredSlot.periodNumber} · ${featuredActivity.startTime}–${featuredActivity.endTime}`
                        : `Period ${featuredSlot.periodNumber} · ${featuredActivity.startTime}–${featuredActivity.endTime}`}
                  </span>
                  {featuredActivity.isActive && featuredActivity.remainingMinutes !== null && (
                    <span className="text-rose-600 dark:text-rose-300 shrink-0">
                      · เหลือ {featuredActivity.remainingMinutes} น.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenTimetable('day')}
                  className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary-text)] whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                >
                  {lang === 'th' ? `ทั้งวัน ${todayMySlots.length} คาบ` : `All ${todayMySlots.length}`}
                </button>
              </div>

              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                  {featuredSlot.courseTitleTh || featuredSlot.courseTitleEn || featuredSlot.courseCode}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {featuredSlot.courseCode}
                  {featuredSlot.room ? ` · ห้อง ${featuredSlot.room}` : ''}
                  {featuredSlot.teacherName ? ` · ${featuredSlot.teacherName}` : ''}
                </p>
              </div>

              {canSelfCheckin && (
                <button
                  type="button"
                  onClick={() =>
                    onTriggerPeriodCheckin(featuredSlot, todayBangkokStr, featuredNextCheckType)
                  }
                  className={`w-full min-h-[44px] rounded-xl px-4 text-xs font-bold text-white flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer ${
                    featuredActivity.isActive
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : featuredNextCheckType === 'check_out'
                        ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700'
                        : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                  }`}
                >
                  {featuredNextCheckType === 'check_out' ? (
                    <LogOut className="w-4 h-4" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {featuredCheckStatus?.hasCheckIn && featuredCheckStatus?.hasCheckOut
                      ? lang === 'th'
                        ? 'เช็คชื่อเข้า/ออกคาบแล้ว · ดูรายละเอียด'
                        : 'Period checked · View details'
                      : featuredNextCheckType === 'check_out'
                        ? lang === 'th'
                          ? 'เช็คชื่อออกคาบเรียน'
                          : 'Check out of period'
                        : lang === 'th'
                          ? 'เช็คชื่อเข้าคาบเรียน'
                          : 'Check in to period'}
                  </span>
                </button>
              )}
            </section>
          ) : (
            <button
              type="button"
              onClick={() => onOpenTimetable('day')}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 text-left flex items-center justify-between gap-3 hover:border-[var(--color-primary)] transition cursor-pointer"
            >
              <div className="min-w-0 flex items-center gap-3">
                <FutureIconBadge tone="tone-4" size="sm" variant="glass">
                  <FutureNavIcon tab="timetable" size={16} active />
                </FutureIconBadge>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                    {isWeekend
                      ? lang === 'th'
                        ? 'วันหยุดสุดสัปดาห์'
                        : 'Weekend'
                      : lang === 'th'
                        ? 'ไม่มีคาบเรียนวันนี้'
                        : 'No classes today'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {lang === 'th' ? 'แตะเพื่อดูตารางเรียนหรือปฏิทิน' : 'Tap to view schedule or calendar'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>
          )}

          {/* Today's School Check-in/Out Photo + Timestamp Strip & Homework Summary */}
          <div className="space-y-2">
            {(() => {
              const checkInTimeText = formatShortAttendanceTime(todayCheckin?.time);
              const checkOutTimeText = formatShortAttendanceTime(
                todayCheckout?.time || todayCheckin?.checkOutTime
              );
              const checkInPhoto = todayCheckin ? resolveRecordPhotoSource(todayCheckin) : undefined;
              const checkOutPhoto = todayCheckout ? resolveRecordPhotoSource(todayCheckout) : undefined;
              return (
                <button
                  type="button"
                  onClick={() => (onOpenAttendanceHistory ? onOpenAttendanceHistory() : onOpenCheckin())}
                  className="w-full min-h-[64px] p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-3 transition active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
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
                      <div className="w-11 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-primary-text)] flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                        {lang === 'th' ? 'เวลาเข้า-ออกโรงเรียนวันนี้' : "Today's School Check-in"}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate mt-0.5">
                        {checkInTimeText
                          ? lang === 'th'
                            ? `เข้า ${checkInTimeText} น.${checkOutTimeText ? ` · ออก ${checkOutTimeText} น.` : ' · ยังไม่ลงเวลาออก'}`
                            : `In ${checkInTimeText}${checkOutTimeText ? ` · Out ${checkOutTimeText}` : ''}`
                          : lang === 'th'
                            ? 'ยังไม่มีบันทึกวันนี้ · ดูประวัติย้อนหลัง'
                            : 'No record today · View history'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-text)] whitespace-nowrap shrink-0">
                    <span>{lang === 'th' ? 'ประวัติ / แก้เวลา' : 'History'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })()}

            {canAccessHomework ? (
              <button
                type="button"
                onClick={onOpenHomework}
                className="w-full min-h-[54px] px-3.5 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <span className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'การบ้านและงานที่มอบหมาย' : 'Homework'}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      pendingHomeworkCount > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {pendingHomeworkCount > 0
                      ? lang === 'th'
                        ? `ค้าง ${pendingHomeworkCount} ชิ้น`
                        : `${pendingHomeworkCount} due`
                      : lang === 'th'
                        ? 'ส่งครบแล้ว'
                        : 'All caught up'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                </span>
              </button>
            ) : canViewGrades ? (
              <button
                type="button"
                onClick={onOpenGrades}
                className="w-full min-h-[54px] px-3.5 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <span className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  GPAX
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-base font-bold text-[var(--color-text-title)] tabular-nums leading-none">
                    {realGpax !== null ? realGpax.toFixed(2) : '—'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                </span>
              </button>
            ) : null}
          </div>

        </div>
      )}

      {/* 4. TAB PANEL: ACADEMICS & PROGRESS */}
      {effectiveTab === 'academics' && (
        <div role="tabpanel" className="flex flex-col gap-2.5 animate-in fade-in duration-150">
          {/* Attendance Visual Progress Card */}
          <button
            type="button"
            onClick={() => onOpenAttendanceHistory?.()}
            disabled={!onOpenAttendanceHistory}
            className="w-full rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-[var(--color-primary)] p-3.5 text-left space-y-2 transition active:scale-[0.99] cursor-pointer disabled:cursor-default"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'สถิติการมาเรียน' : 'Attendance'}
                </p>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[var(--color-text-title)] tabular-nums tracking-tight leading-none">
                    {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                  </span>
                  <span className={`text-xs font-semibold ${attendanceStatusTone}`}>
                    {attendanceStatusLabel}
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-text)] tabular-nums">
                <span>{lang === 'th' ? 'ดูประวัติ' : 'History'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="relative">
              <div
                className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden flex"
                role="progressbar"
                aria-valuenow={attendanceRate ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lang === 'th' ? 'ร้อยละการมาเรียน' : 'Attendance percentage'}
              >
                {attendanceOnTimePct > 0 && (
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
                    style={{ width: `${attendanceOnTimePct}%` }}
                  />
                )}
                {attendanceLatePct > 0 && (
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                    style={{ width: `${attendanceLatePct}%` }}
                  />
                )}
              </div>
              <div
                aria-hidden="true"
                className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-slate-500/70 dark:bg-slate-400/70 rounded-full"
                style={{ left: '80%' }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] tabular-nums">
              <span>{lang === 'th' ? `ตรงเวลา ${attendanceOnTime}` : `On time ${attendanceOnTime}`}</span>
              <span>{lang === 'th' ? `สาย ${attendanceLate}` : `Late ${attendanceLate}`}</span>
              <span>{lang === 'th' ? `ลา/ขาด ${attendanceAbsent}` : `Absent ${attendanceAbsent}`}</span>
            </div>
          </button>

          {/* Grades & Subject Progress Card */}
          {canViewGrades && (
            <button
              type="button"
              onClick={onOpenGrades}
              className="w-full rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-[var(--color-primary)] p-3.5 text-left space-y-2 transition active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ผลการเรียนเฉลี่ย (GPAX)' : 'Academic Standing (GPAX)'}
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[var(--color-text-title)] tabular-nums tracking-tight leading-none">
                      {realGpax !== null ? realGpax.toFixed(2) : '—'}
                    </span>
                    <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums">
                      / 4.00
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-text)]">
                  <span>{lang === 'th' ? 'ดูทั้งหมด' : 'Details'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={gpaxPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lang === 'th' ? 'ระดับเกรดเฉลี่ย' : 'GPAX progress'}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    realGpax !== null ? getBarTone(gpaxPercent) : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  style={{ width: `${realGpax !== null ? gpaxPercent : 0}%` }}
                />
              </div>

              {subjectBars.length > 0 ? (
                <div className="space-y-1.5 pt-1.5 border-t border-[var(--color-border)]">
                  {subjectBars.map((subj) => (
                    <div key={subj.id} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[var(--color-text-body)] truncate">
                          {subj.title}
                        </span>
                        <span className="font-semibold text-[var(--color-text-title)] tabular-nums shrink-0">
                          {subj.gradeLabel} · {subj.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getBarTone(subj.percent)}`}
                          style={{ width: `${subj.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th'
                    ? 'ยังไม่มีคะแนนรายวิชาที่ประกาศในภาคเรียนนี้'
                    : 'No subject scores published for this semester yet'}
                </p>
              )}
            </button>
          )}

          {/* Homework Completion Progress Card */}
          {canAccessHomework && (
            <button
              type="button"
              onClick={onOpenHomework}
              className="w-full rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-[var(--color-primary)] px-3.5 py-3 text-left space-y-1.5 transition active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? 'ความคืบหน้าการบ้าน' : 'Homework Progress'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      pendingHomeworkCount > 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {pendingHomeworkCount > 0
                      ? lang === 'th'
                        ? `ค้างส่ง ${pendingHomeworkCount} ชิ้น`
                        : `${pendingHomeworkCount} pending`
                      : lang === 'th'
                        ? 'ส่งครบทุกชิ้น'
                        : 'All caught up'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className="h-2 flex-1 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={homeworkProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={lang === 'th' ? 'ความคืบหน้าการส่งการบ้าน' : 'Homework completion'}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pendingHomeworkCount === 0
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'bg-[var(--color-primary)]'
                    }`}
                    style={{ width: `${homeworkProgressPercent}%` }}
                  />
                </div>
                {totalHomeworkCount > 0 && (
                  <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums shrink-0">
                    {completedHomeworkCount}/{totalHomeworkCount}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      )}

      {/* 5. TAB PANEL: OTHER SERVICES (Zero duplicates of Today/Progress/BottomNav) */}
      {effectiveTab === 'menu' && (
        <div role="tabpanel" className="space-y-3 animate-in fade-in duration-150">
          {((canOpenLms && Boolean(onOpenLms)) || canViewTimetable) && (
            <section className="space-y-1.5">
              <h3 className="px-1 text-xs font-bold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'บทเรียนและปฏิทิน' : 'Lessons & Calendar'}
              </h3>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                {canOpenLms && onOpenLms && (
                  <StudentDirectoryRow
                    icon={<Library className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                    label={lang === 'th' ? 'ห้องเรียน LMS' : 'LMS Lessons'}
                    meta={
                      lessonsCount > 0
                        ? `${lessonsCount} ${lang === 'th' ? 'บทเรียน' : 'lessons'}`
                        : `${scopedCourses.length} ${lang === 'th' ? 'รายวิชา' : 'courses'}`
                    }
                    onClick={onOpenLms}
                  />
                )}
                {canViewTimetable && (
                  <StudentDirectoryRow
                    icon={<Calendar className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                    label={lang === 'th' ? 'ปฏิทินเรียน & วันหยุดราชการ' : 'Calendar & Public Holidays'}
                    meta=".ics"
                    onClick={() => onOpenTimetable('calendar')}
                  />
                )}
              </div>
            </section>
          )}

          {(canOpenPortfolio ||
            canOpenLeave ||
            canPlayGames ||
            (canViewDigitalId && Boolean(onOpenDigitalId)) ||
            Boolean(onOpenCareerQuest)) && (
            <section className="space-y-1.5">
              <h3 className="px-1 text-xs font-bold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'กิจกรรมและเอกสาร' : 'Activities & Records'}
              </h3>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                {canOpenPortfolio && (
                  <StudentDirectoryRow
                    icon={<Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    label={lang === 'th' ? 'ผลงานของฉัน' : 'Portfolio'}
                    meta={
                      myPortfolioCount > 0
                        ? lang === 'th'
                          ? `${myPortfolioCount} รายการ`
                          : `${myPortfolioCount} items`
                        : lang === 'th'
                          ? 'เกียรติบัตร'
                          : 'Certificates'
                    }
                    onClick={onOpenPortfolio}
                  />
                )}
                {canOpenLeave && (
                  <StudentDirectoryRow
                    icon={<FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                    label={lang === 'th' ? 'ยื่นใบลา' : 'Leave Request'}
                    meta={
                      pendingLeavesCount > 0
                        ? lang === 'th'
                          ? `รออนุมัติ ${pendingLeavesCount}`
                          : `${pendingLeavesCount} pending`
                        : lang === 'th'
                          ? 'ลาป่วย · ลากิจ'
                          : 'Sick · Personal'
                    }
                    onClick={onOpenLeave}
                  />
                )}
                {canPlayGames && (
                  <StudentDirectoryRow
                    icon={<Gamepad2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                    label={lang === 'th' ? 'เกม & แล็บ' : 'Games & Labs'}
                    meta={lang === 'th' ? 'ฝึกฝน 8 สาระ' : 'Play & learn'}
                    onClick={onOpenGames}
                  />
                )}
                {canViewDigitalId && onOpenDigitalId && (
                  <StudentDirectoryRow
                    icon={<CreditCard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                    label={lang === 'th' ? 'บัตรนักเรียนดิจิทัล' : 'Digital ID'}
                    meta={lang === 'th' ? 'QR · บาร์โค้ด' : 'QR & Barcode'}
                    onClick={onOpenDigitalId}
                  />
                )}
                {onOpenCareerQuest && (
                  <StudentDirectoryRow
                    icon={<Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                    label={lang === 'th' ? 'เส้นทางสู่อาชีพในฝัน' : 'Career Quest AI'}
                    meta={lang === 'th' ? 'Quiz 5 ข้อ' : 'Vibe quiz'}
                    onClick={onOpenCareerQuest}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

