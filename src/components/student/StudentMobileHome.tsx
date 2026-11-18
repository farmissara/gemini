import React from 'react';
import {
  Award,
  BellRing,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Gamepad2,
  GraduationCap,
  LogIn,
  LogOut,
  Megaphone,
  TrendingUp,
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
  School,
  SchoolPeriodTime,
  Student,
  TimetableSlot,
} from '../../types';
import { calculateStudentAcademicSummary } from '../../lib/moeGrading';
import {
  getTimetableSlotActivityStatus,
  type BangkokClockSnapshot,
} from '../../lib/timetableCalendar';
import { isWeekendDate, type ThaiHoliday } from '../../lib/thaiHolidays';

interface StudentMobileHomeProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  ownStudent?: Student;
  lang: AppLanguage;
  todayCheckin?: AttendanceRecord;
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
  pendingLeavesCount: number;
  myPortfolioCount: number;
  scopedAnnouncements: Announcement[];
  canSelfCheckin: boolean;
  canAccessHomework: boolean;
  canPlayGames: boolean;
  canViewGrades: boolean;
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
}

const ProgressRing: React.FC<{ percent: number; size?: number; stroke?: number }> = ({
  percent,
  size = 44,
  stroke = 4,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-slate-200 dark:text-slate-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-emerald-600 dark:text-emerald-400 transition-all duration-500"
      />
    </svg>
  );
};

export const StudentMobileHome: React.FC<StudentMobileHomeProps> = ({
  currentUser,
  activeSchool,
  ownStudent,
  lang,
  todayCheckin,
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
  pendingLeavesCount,
  myPortfolioCount,
  scopedAnnouncements,
  canSelfCheckin,
  canAccessHomework,
  canPlayGames,
  canViewGrades,
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
}) => {
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

  // Real attendance rate
  const attendancePresentOrLate = scopedAttendance.filter(
    (r) => r.status === 'present' || r.status === 'late'
  ).length;
  const attendanceRate =
    scopedAttendance.length > 0
      ? Math.round((attendancePresentOrLate / scopedAttendance.length) * 100)
      : null;

  // Real GPAX
  const academicSummary = ownStudent
    ? calculateStudentAcademicSummary({
        student: ownStudent,
        courses: scopedCourses,
        grades: grades.filter((g) => g.studentId === ownStudent.id),
        gradingSystem,
      })
    : null;
  const realGpax =
    academicSummary?.gpax != null && academicSummary.gpax > 0
      ? academicSummary.gpax
      : ownStudent && ownStudent.gpa > 0
        ? ownStudent.gpa
        : null;

  // Determine single focus period (active now or next upcoming today)
  const isWeekend = isWeekendDate(todayBangkokStr);
  const activeNowSlot = !todayHoliday && !isWeekend
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
  const nextUpcomingSlot = !todayHoliday && !isWeekend
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
  const featuredSlot = activeNowSlot || nextUpcomingSlot || (!todayHoliday && !isWeekend ? todayMySlots[0] : undefined);
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

  const latestAnnouncement =
    scopedAnnouncements.find((a) => a.pinned) || scopedAnnouncements[0] || null;

  const formattedDate = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex flex-col gap-5 pb-4 animate-in fade-in duration-200">
      {/* 1. VISUAL HERO BANNER — Student Identity + 1 Dominant Primary CTA */}
      <section className="relative rounded-3xl overflow-hidden shadow-md bg-slate-900 min-h-[218px] flex flex-col justify-between">
        <img
          src={heroCampusImg}
          alt={lang === 'th' ? 'ภาพบรรยากาศโรงเรียน' : 'Campus atmosphere'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/55 to-slate-950/25"
        />

        {/* Top Identity Strip */}
        <div className="relative z-10 p-5 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-sky-200/95 tabular-nums">
              {greetingText} · {formattedDate}
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug truncate">
              {displayName}
            </h1>
            <p className="text-xs text-slate-200/90 tabular-nums truncate">
              {ownStudent
                ? `${ownStudent.gradeLevel} ${ownStudent.room} · รหัส ${ownStudent.studentIdNumber}`
                : lang === 'th'
                  ? activeSchool.nameTh
                  : activeSchool.nameEn}
            </p>
          </div>

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/50 shadow-md shrink-0 bg-slate-800"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 text-white font-bold text-base flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
        </div>

        {/* Bottom Primary Action Inside Hero */}
        <div className="relative z-10 px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={() => (canSelfCheckin ? onOpenCheckin() : onOpenTimetable('day'))}
            className="w-full min-h-[52px] px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-bold text-sm flex items-center justify-between gap-3 shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  todayCheckin
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {todayCheckin ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : canSelfCheckin ? (
                  <Camera className="w-4 h-4" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
              </div>
              <div className="text-left min-w-0">
                <span className="block truncate">
                  {!canSelfCheckin
                    ? lang === 'th'
                      ? 'ดูตารางเรียนวันนี้'
                      : 'Today Timetable'
                    : todayCheckin
                      ? lang === 'th'
                        ? 'เช็คชื่อเข้าเรียนแล้ว · เช็คชื่อออก'
                        : 'Checked in · Check out'
                      : lang === 'th'
                        ? 'เช็คชื่อเข้า-ออกโรงเรียน'
                        : 'School Check-in & Out'}
                </span>
                <span className="block text-[11px] font-medium text-slate-500 truncate tabular-nums">
                  {todayCheckin
                    ? lang === 'th'
                      ? `บันทึกล่าสุดเวลา ${todayCheckin.time} น.`
                      : `Last recorded at ${todayCheckin.time}`
                    : canSelfCheckin
                      ? lang === 'th'
                        ? 'ถ่ายเซลฟี่พร้อมพิกัด GPS หรือแตะบัตร NFC'
                        : 'Selfie with GPS geofence or NFC tap'
                      : lang === 'th'
                        ? `${todayMySlots.length} คาบเรียนวันนี้`
                        : `${todayMySlots.length} classes today`}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </button>
        </div>
      </section>

      {/* 2. COMPACT 3-METRIC PROGRESS STRIP (Real Data Only, Tabular Numerals) */}
      <section
        aria-label={lang === 'th' ? 'สรุปสถิติการเรียน' : 'Academic summary'}
        className="grid grid-cols-3 gap-2.5"
      >
        <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-3.5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">
              {lang === 'th' ? 'มาเรียน' : 'Attend'}
            </span>
            <ProgressRing percent={attendanceRate ?? 0} size={28} stroke={3.5} />
          </div>
          <div className="text-lg font-extrabold text-[var(--color-text-title)] tabular-nums leading-none">
            {attendanceRate !== null ? `${attendanceRate}%` : '—'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => (canViewGrades ? onOpenGrades() : undefined)}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-3.5 text-left flex flex-col justify-between gap-2 hover:border-[var(--color-primary)] transition cursor-pointer"
        >
          <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">
            {lang === 'th' ? 'เกรดเฉลี่ย' : 'GPAX'}
          </span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg font-extrabold text-[var(--color-text-title)] tabular-nums leading-none">
              {realGpax !== null ? realGpax.toFixed(2) : '—'}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => (canAccessHomework ? onOpenHomework() : undefined)}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-3.5 text-left flex flex-col justify-between gap-2 hover:border-[var(--color-primary)] transition cursor-pointer"
        >
          <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">
            {lang === 'th' ? 'การบ้าน' : 'Tasks'}
          </span>
          <div className="flex items-baseline justify-between gap-1">
            <span
              className={`text-lg font-extrabold tabular-nums leading-none ${
                pendingHomeworkCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {pendingHomeworkCount > 0
                ? pendingHomeworkCount
                : lang === 'th'
                  ? 'ครบ'
                  : 'Done'}
            </span>
            <BookOpen className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
          </div>
        </button>
      </section>

      {/* 3. SINGLE UNIFIED NOW / NEXT CLASS OR HOLIDAY FOCUS CARD */}
      {todayHoliday ? (
        <button
          type="button"
          onClick={() => onOpenTimetable('calendar')}
          className="w-full rounded-2xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/70 dark:bg-rose-950/35 p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              {todayHoliday.type === 'school'
                ? lang === 'th'
                  ? 'วันหยุดพิเศษโรงเรียน'
                  : 'School Holiday'
                : lang === 'th'
                  ? 'วันหยุดราชการวันนี้'
                  : 'Public Holiday'}
            </p>
            <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
              {todayHoliday.nameTh}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {lang === 'th' ? 'งดการเรียนการสอนปกติ · แตะดูปฏิทิน' : 'No regular classes · View calendar'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-500 shrink-0" />
        </button>
      ) : featuredSlot && featuredActivity ? (
        <section
          aria-label={lang === 'th' ? 'คาบเรียนปัจจุบัน' : 'Current class'}
          className={`rounded-2xl border p-4 space-y-3 transition ${
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

          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-[var(--color-text-title)] truncate">
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
                    ? 'เช็คชื่อคาบนี้เรียบร้อย · ดูรายละเอียด'
                    : 'Period checked · View details'
                  : featuredNextCheckType === 'check_out'
                    ? lang === 'th'
                      ? 'เช็คเอาท์ออกจากคาบนี้'
                      : 'Check out of period'
                    : lang === 'th'
                      ? 'เช็คชื่อเข้าคาบนี้'
                      : 'Check in to period'}
              </span>
            </button>
          )}
        </section>
      ) : upcomingHoliday ? (
        <button
          type="button"
          onClick={() => onOpenTimetable('calendar')}
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:border-[var(--color-primary)] transition cursor-pointer"
        >
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                {upcomingHoliday.nameTh}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                {lang === 'th' ? `วันหยุดถัดไป · ${upcomingHoliday.date}` : `Next holiday · ${upcomingHoliday.date}`}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
        </button>
      ) : null}

      {/* 4. CLEAN 2x3 VISUAL MENU GRID (Spacious, Uncluttered, Thumb-Friendly) */}
      <section aria-label={lang === 'th' ? 'เมนูลัดสำหรับนักเรียน' : 'Student shortcuts'} className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)]">
            {lang === 'th' ? 'เมนูการเรียนของฉัน' : 'My Learning'}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Tile 1: Timetable */}
          <button
            type="button"
            onClick={() => onOpenTimetable('day')}
            className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-blue-400 dark:hover:border-blue-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ตารางเรียน' : 'Timetable'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                {todayHoliday || isWeekend
                  ? lang === 'th'
                    ? 'วันหยุด · ดูปฏิทิน'
                    : 'Day off'
                  : lang === 'th'
                    ? `${todayMySlots.length} คาบวันนี้`
                    : `${todayMySlots.length} classes`}
              </p>
            </div>
          </button>

          {/* Tile 2: Grades */}
          {canViewGrades && (
            <button
              type="button"
              onClick={onOpenGrades}
              className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-emerald-400 dark:hover:border-emerald-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ผลการเรียน' : 'Grades'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {realGpax !== null ? `GPAX ${realGpax.toFixed(2)}` : `${scopedCourses.length} วิชา`}
                </p>
              </div>
            </button>
          )}

          {/* Tile 3: Portfolio (Real Data) */}
          <button
            type="button"
            onClick={onOpenPortfolio}
            className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-amber-400 dark:hover:border-amber-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ผลงานของฉัน' : 'Portfolio'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                {myPortfolioCount > 0
                  ? lang === 'th'
                    ? `${myPortfolioCount} รายการ`
                    : `${myPortfolioCount} items`
                  : lang === 'th'
                    ? 'เพิ่มเกียรติบัตร'
                    : 'Add work'}
              </p>
            </div>
          </button>

          {/* Tile 4: Homework */}
          {canAccessHomework && (
            <button
              type="button"
              onClick={onOpenHomework}
              className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-indigo-400 dark:hover:border-indigo-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'การบ้าน' : 'Homework'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {pendingHomeworkCount > 0
                    ? lang === 'th'
                      ? `รอส่ง ${pendingHomeworkCount} งาน`
                      : `${pendingHomeworkCount} due`
                    : lang === 'th'
                      ? 'ส่งครบทุกงาน'
                      : 'All caught up'}
                </p>
              </div>
            </button>
          )}

          {/* Tile 5: Leave Request */}
          <button
            type="button"
            onClick={onOpenLeave}
            className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-rose-400 dark:hover:border-rose-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ยื่นใบลา' : 'Leave'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                {pendingLeavesCount > 0
                  ? lang === 'th'
                    ? `รออนุมัติ ${pendingLeavesCount}`
                    : `${pendingLeavesCount} pending`
                  : lang === 'th'
                    ? 'ลาป่วย · ลากิจ'
                    : 'Sick & personal'}
              </p>
            </div>
          </button>

          {/* Tile 6: Games or Announcements */}
          {canPlayGames ? (
            <button
              type="button"
              onClick={onOpenGames}
              className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-violet-400 dark:hover:border-violet-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'เกม & แล็บ' : 'Games & Labs'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  {lang === 'th' ? 'ฝึกฝน 8 สาระ' : 'Play & learn'}
                </p>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAnnouncements()}
              className="min-h-[96px] p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-teal-400 dark:hover:border-teal-500 text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ประกาศ' : 'News'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {scopedAnnouncements.length} {lang === 'th' ? 'ข่าวสาร' : 'posts'}
                </p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 5. LATEST SCHOOL ANNOUNCEMENT HIGHLIGHT (Single Clean Editorial Card) */}
      {latestAnnouncement && (
        <section aria-label={lang === 'th' ? 'ประกาศล่าสุด' : 'Latest announcement'} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)]">
              {lang === 'th' ? 'ประกาศจากโรงเรียน' : 'School Announcements'}
            </h2>
            <button
              type="button"
              onClick={() => onOpenAnnouncements()}
              className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
            >
              {lang === 'th' ? `ดูทั้งหมด (${scopedAnnouncements.length})` : `View all (${scopedAnnouncements.length})`}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenAnnouncements(latestAnnouncement)}
            className="w-full rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] p-4 text-left space-y-1.5 transition cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">
              <span className="font-semibold text-[var(--color-primary-text)] flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5" />
                <span>{latestAnnouncement.category}</span>
              </span>
              <span>{latestAnnouncement.publishedAt}</span>
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)] line-clamp-1">
              {latestAnnouncement.title}
            </h3>
            <p className="text-xs text-[var(--color-text-body)] line-clamp-2 leading-relaxed">
              {latestAnnouncement.content}
            </p>
          </button>
        </section>
      )}
    </div>
  );
};
