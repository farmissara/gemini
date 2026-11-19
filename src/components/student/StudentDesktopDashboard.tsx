import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  GraduationCap,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import {
  Announcement,
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  Course,
  GradeRecord,
  HomeworkSubmission,
  School,
  SchoolPeriodTime,
  Student,
  SystemConfig,
  TimetableSlot,
} from '../../types';
import { NavTab } from '../layout/Sidebar';
import { calculateStudentAcademicSummary } from '../../lib/moeGrading';
import { calculateGrade, formatSemesterLabel } from '../../lib/schoolSettings';
import { getBangkokClockSnapshot, getTimetableSlotActivityStatus } from '../../lib/timetableCalendar';
import { type ThaiHoliday } from '../../lib/thaiHolidays';
import { readLocalCareerQuestState } from '../../lib/careerQuestStore';
import { POPULAR_CAREERS } from '../../data/careerQuestData';

interface StudentDesktopDashboardProps {
  currentUser?: AuthUser | null;
  student?: Student;
  school?: School;
  systemConfig: SystemConfig;
  lang: AppLanguage;
  timeGreeting: string;
  userDisplayName: string;
  formattedTodayDate: string;
  todayStr: string;
  todayHoliday: ThaiHoliday | null;
  upcomingHoliday: ThaiHoliday | null;
  isTodayWeekend: boolean;
  scopedAttendance: AttendanceRecord[];
  scopedCourses: Course[];
  scopedGrades: GradeRecord[];
  scopedAssignments: Assignment[];
  scopedHomework: HomeworkSubmission[];
  todayScheduledSlots: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  scopedAnnouncements: Announcement[];
  studentCanSelfCheckin: boolean;
  studentCanViewGrades: boolean;
  studentCanUploadPortfolio?: boolean;
  canOpenCareerQuest?: boolean;
  canViewTimetable?: boolean;
  canAccessHomework?: boolean;
  canViewDigitalId?: boolean;
  onNavigate: (tab: NavTab) => void;
  onOpenAnnouncementsTab: () => void;
  onOpenPhotoRecord: (record: AttendanceRecord) => void;
}

const getProgressBarTone = (percent: number): string => {
  if (percent >= 80) return 'bg-emerald-600 dark:bg-emerald-500';
  if (percent >= 65) return 'bg-[var(--color-primary)]';
  if (percent >= 50) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-rose-600 dark:bg-rose-500';
};

export const StudentDesktopDashboard: React.FC<StudentDesktopDashboardProps> = ({
  currentUser,
  student,
  school,
  systemConfig,
  lang,
  timeGreeting,
  userDisplayName,
  formattedTodayDate,
  todayStr,
  todayHoliday,
  upcomingHoliday,
  isTodayWeekend,
  scopedAttendance,
  scopedCourses,
  scopedGrades,
  scopedAssignments,
  scopedHomework,
  todayScheduledSlots,
  schoolPeriods,
  scopedAnnouncements,
  studentCanSelfCheckin,
  studentCanViewGrades,
  studentCanUploadPortfolio = true,
  canOpenCareerQuest = true,
  canViewTimetable = true,
  canAccessHomework = true,
  canViewDigitalId = true,
  onNavigate,
  onOpenAnnouncementsTab,
  onOpenPhotoRecord,
}) => {
  const bangkokClock = useMemo(() => getBangkokClockSnapshot(), []);

  // --- Attendance Analytics (Real Data Only) ---
  const attendanceStats = useMemo(() => {
    const total = scopedAttendance.length;
    const onTime = scopedAttendance.filter((a) => a.status === 'present').length;
    const late = scopedAttendance.filter((a) => a.status === 'late').length;
    const absentOrLeave = Math.max(0, total - onTime - late);
    const attended = onTime + late;
    const rate = total > 0 ? Math.round((attended / total) * 100) : null;
    const onTimePct = total > 0 ? Math.round((onTime / total) * 100) : 0;
    const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
    const todayRecord =
      scopedAttendance.find((a) => a.date === todayStr && a.recordType !== 'check_out') ||
      scopedAttendance.find((a) => a.date === todayStr) ||
      null;

    return {
      total,
      onTime,
      late,
      absentOrLeave,
      rate,
      onTimePct,
      latePct,
      todayRecord,
    };
  }, [scopedAttendance, todayStr]);

  // --- Grades & Subject Progress (Real Data Only) ---
  const academicSummary = useMemo(() => {
    if (!student) return null;
    return calculateStudentAcademicSummary({
      student,
      courses: scopedCourses,
      grades: scopedGrades,
      gradingSystem: systemConfig.gradingSystem,
    });
  }, [student, scopedCourses, scopedGrades, systemConfig.gradingSystem]);

  const subjectGradeRows = useMemo(() => {
    return scopedGrades
      .map((g) => {
        const course = scopedCourses.find((c) => c.id === g.courseId);
        const score = Math.max(0, Math.min(100, Math.round(g.totalScore || 0)));
        const letter = g.letterGrade || calculateGrade(score, systemConfig.gradingSystem).letter;
        return {
          id: g.id,
          code: course?.code || g.courseId,
          title:
            lang === 'th'
              ? course?.titleTh || course?.titleEn || g.courseId
              : course?.titleEn || course?.titleTh || g.courseId,
          score,
          letter,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [scopedGrades, scopedCourses, systemConfig.gradingSystem, lang]);

  const gpaxDisplay = useMemo(() => {
    if (academicSummary?.hideGpaCalculations) {
      const avg = academicSummary.averageRawScore;
      return {
        primaryValue: avg !== null ? `${avg}%` : '—',
        scaleSuffix: avg !== null ? '/ 100%' : '',
        barPercent: avg !== null ? Math.max(0, Math.min(100, avg)) : 0,
        standingLabel:
          avg === null
            ? lang === 'th'
              ? 'รอผลคะแนน'
              : 'No scores yet'
            : avg >= 80
              ? lang === 'th'
                ? 'ดีเยี่ยม'
                : 'Excellent'
              : avg >= 65
                ? lang === 'th'
                  ? 'ดี'
                  : 'Good'
                : lang === 'th'
                  ? 'กำลังพัฒนา'
                  : 'Developing',
        isRawScore: true,
      };
    }

    const gpax =
      academicSummary?.hasRecordedGrades && academicSummary.gpax !== null
        ? academicSummary.gpax
        : student && student.gpa > 0
          ? student.gpa
          : null;

    return {
      primaryValue: gpax !== null ? gpax.toFixed(2) : '—',
      scaleSuffix: gpax !== null ? '/ 4.00' : '',
      barPercent: gpax !== null ? Math.max(0, Math.min(100, Math.round((gpax / 4) * 100))) : 0,
      standingLabel:
        gpax === null
          ? lang === 'th'
            ? 'รอผลคะแนน'
            : 'No grades yet'
          : gpax >= 3.5
            ? lang === 'th'
              ? 'ผลการเรียนดีเยี่ยม'
              : 'Honor Standing'
            : gpax >= 2.5
              ? lang === 'th'
                ? 'อยู่ในเกณฑ์ดี'
                : 'Good Standing'
              : lang === 'th'
                ? 'ควรเพิ่มคะแนน'
                : 'Needs Focus',
      isRawScore: false,
    };
  }, [academicSummary, student, lang]);

  // --- Homework Completion Progress (Real Data Only) ---
  const homeworkStats = useMemo(() => {
    const completedIds = new Set(
      scopedHomework
        .filter((h) => h.status === 'submitted' || h.status === 'graded' || h.status === 'late')
        .map((h) => h.assignmentId)
    );
    const total = scopedAssignments.length;
    const completed = scopedAssignments.filter(
      (a) =>
        completedIds.has(a.id) ||
        Boolean(student?.id && a.submittedStudentIds?.includes(student.id)) ||
        Boolean(currentUser?.id && a.submittedStudentIds?.includes(currentUser.id))
    ).length;
    const pendingList = scopedAssignments
      .filter(
        (a) =>
          !completedIds.has(a.id) &&
          !(student?.id && a.submittedStudentIds?.includes(student.id)) &&
          !(currentUser?.id && a.submittedStudentIds?.includes(currentUser.id))
      )
      .slice(0, 3);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 100;
    return {
      total,
      completed,
      pendingCount: Math.max(0, total - completed),
      pendingList,
      percent,
    };
  }, [scopedAssignments, scopedHomework, student?.id, currentUser?.id]);

  // --- Latest Announcement ---
  const latestAnnouncement = useMemo(() => {
    if (scopedAnnouncements.length === 0) return null;
    const pinned = scopedAnnouncements.find((a) => a.pinned);
    return pinned || scopedAnnouncements[0];
  }, [scopedAnnouncements]);

  // --- Attendance Status Label ---
  const attendanceStanding = useMemo(() => {
    if (attendanceStats.rate === null) {
      return {
        label: lang === 'th' ? 'ยังไม่มีบันทึก' : 'No records yet',
        tone: 'text-[var(--color-text-muted)]',
      };
    }
    if (attendanceStats.rate >= 90) {
      return {
        label: lang === 'th' ? 'สม่ำเสมอดีเยี่ยม' : 'On Track',
        tone: 'text-emerald-700 dark:text-emerald-400',
      };
    }
    if (attendanceStats.rate >= 80) {
      return {
        label: lang === 'th' ? 'ผ่านเกณฑ์มีสิทธิ์สอบ' : 'Meets 80% Requirement',
        tone: 'text-[var(--color-primary-text)]',
      };
    }
    return {
      label: lang === 'th' ? 'ต่ำกว่าเกณฑ์ 80%' : 'Below 80% Target',
      tone: 'text-rose-700 dark:text-rose-400',
    };
  }, [attendanceStats.rate, lang]);

  const careerQuestSnapshot = useMemo(() => {
    const uid = currentUser?.id || student?.id || '';
    const sid = school?.id || '';
    if (!uid || !sid) return null;
    const saved = readLocalCareerQuestState(sid, uid);
    if (!saved || !saved.activeCareerId) return null;
    const career =
      saved.pinnedCareers.find((c) => c.id === saved.activeCareerId) ||
      POPULAR_CAREERS.find((c) => c.id === saved.activeCareerId) ||
      null;
    return {
      saved,
      career,
    };
  }, [currentUser?.id, student?.id, school?.id]);

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-150">
      {/* ==================================================================== */}
      {/* 1. CLEAN EDITORIAL WELCOME HEADER (60-30-10: Neutral Surface + 1 CTA) */}
      {/* ==================================================================== */}
      <section
        aria-label={lang === 'th' ? 'ภาพรวมประจำวันของนักเรียน' : 'Student daily summary'}
        className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-card)] to-[var(--color-card)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6"
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)] tabular-nums">
            <span className="font-medium text-[var(--color-primary-text)]">{timeGreeting}</span>
            <span aria-hidden="true">·</span>
            <span>{formattedTodayDate}</span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'th'
                ? `ปีการศึกษา ${systemConfig.academicYear} (${formatSemesterLabel(systemConfig.currentSemester)})`
                : `AY ${systemConfig.academicYear} · ${systemConfig.currentSemester}`}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-title)] text-balance truncate">
            {userDisplayName}
          </h2>

          <p className="text-sm sm:text-[15px] text-[var(--color-text-muted)] tabular-nums truncate">
            {student
              ? `${student.gradeLevel} ${student.room} · ${lang === 'th' ? 'รหัส' : 'ID'} ${student.studentIdNumber}`
              : lang === 'th'
                ? systemConfig.schoolNameTh
                : systemConfig.schoolNameEn}
            <span aria-hidden="true"> · </span>
            {todayHoliday
              ? lang === 'th'
                ? `วันหยุดวันนี้: ${todayHoliday.nameTh}`
                : `Holiday: ${todayHoliday.nameEn}`
              : isTodayWeekend
                ? lang === 'th'
                  ? 'วันหยุดสุดสัปดาห์'
                  : 'Weekend'
                : lang === 'th'
                  ? `วันนี้มีเรียน ${todayScheduledSlots.length} คาบ`
                  : `${todayScheduledSlots.length} classes today`}
          </p>
        </div>

        {/* 1 Dominant Primary CTA + 1 Quiet Secondary Action */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {studentCanSelfCheckin ? (
            <button
              type="button"
              onClick={() => onNavigate('mobile_checkin')}
              className="min-h-12 w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 shadow-sm hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary)]/25"
            >
              {attendanceStats.todayRecord ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <Camera className="w-4 h-4 shrink-0" />
              )}
              <span>
                {attendanceStats.todayRecord
                  ? lang === 'th'
                    ? 'เช็คชื่อเข้าแล้ว · เช็คชื่อออก'
                    : 'Checked In · Check Out'
                  : lang === 'th'
                    ? 'เช็คชื่อเข้า-ออกโรงเรียน'
                    : 'School Check-in'}
              </span>
            </button>
          ) : canViewTimetable ? (
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="min-h-12 w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 shadow-sm hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary)]/25"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{lang === 'th' ? 'ดูตารางเรียนวันนี้' : 'View Today’s Schedule'}</span>
            </button>
          ) : null}

          {canViewTimetable && (
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="min-h-12 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 shadow-xs text-[var(--color-text-title)] text-sm font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{lang === 'th' ? 'ตารางเรียน' : 'Timetable'}</span>
              <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. PRIMARY VISUAL PROGRESS CARDS: ATTENDANCE & GRADES                */}
      {/* ==================================================================== */}
      <div
        data-guide-id="dashboard-kpis"
        className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch"
      >
        {/* CARD A: ATTENDANCE VISUAL PROGRESS */}
        <section
          aria-label={lang === 'th' ? 'ความสม่ำเสมอในการมาเรียน' : 'Attendance progress'}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md p-5 sm:p-6 flex flex-col justify-between gap-6"
        >
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'การมาเรียนของคุณ' : 'Attendance'}
                </h3>
                <p className={`text-xs font-medium ${attendanceStanding.tone}`}>
                  {attendanceStanding.label}
                </p>
              </div>
              {(studentCanSelfCheckin || canViewTimetable) && (
                <button
                  type="button"
                  onClick={() => onNavigate(studentCanSelfCheckin ? 'mobile_checkin' : 'timetable')}
                  className="text-[13px] font-medium text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{lang === 'th' ? 'รายละเอียด' : 'Details'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Big Tabular Metric */}
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-title)] tabular-nums">
                  {attendanceStats.rate !== null ? `${attendanceStats.rate}%` : '—'}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  {attendanceStats.total > 0
                    ? lang === 'th'
                      ? `จาก ${attendanceStats.total} ครั้งที่บันทึก`
                      : `across ${attendanceStats.total} records`
                    : lang === 'th'
                      ? 'ยังไม่มีข้อมูลการเช็คชื่อ'
                      : 'No attendance logged'}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] tabular-nums shrink-0">
                {lang === 'th' ? 'เกณฑ์ 80%' : '80% min'}
              </span>
            </div>

            {/* Segmented Visual Progress Bar with 80% MOE Benchmark */}
            <div className="space-y-2">
              <div
                className="relative h-3 w-full rounded-full bg-[var(--color-card-subtle)] ring-1 ring-inset ring-black/5 overflow-hidden"
                role="progressbar"
                aria-valuenow={attendanceStats.rate ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lang === 'th' ? 'เปอร์เซ็นต์การมาเรียน' : 'Attendance rate'}
              >
                {attendanceStats.total > 0 && (
                  <div className="h-full w-full flex">
                    {attendanceStats.onTimePct > 0 && (
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                        style={{ width: `${attendanceStats.onTimePct}%` }}
                      />
                    )}
                    {attendanceStats.latePct > 0 && (
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-300"
                        style={{ width: `${attendanceStats.latePct}%` }}
                      />
                    )}
                  </div>
                )}
                {/* 80% threshold marker */}
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-text-title)]/35"
                  style={{ left: '80%' }}
                />
              </div>

              {/* Clean Unboxed Breakdown Row */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'มาตรงเวลา' : 'On time'}
                  </p>
                  <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                    {attendanceStats.onTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'มาสาย' : 'Late'}
                  </p>
                  <p className="text-base font-semibold text-amber-700 dark:text-amber-400 tabular-nums mt-0.5">
                    {attendanceStats.late}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ลา / ขาด' : 'Leave / Absent'}
                  </p>
                  <p className="text-base font-semibold text-[var(--color-text-body)] tabular-nums mt-0.5">
                    {attendanceStats.absentOrLeave}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hairline Footer: Today's Check-in Status */}
          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            {attendanceStats.todayRecord ? (
              <>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-title)] truncate tabular-nums">
                    {lang === 'th'
                      ? `เช็คชื่อวันนี้แล้ว เวลา ${attendanceStats.todayRecord.time} น.`
                      : `Checked in today at ${attendanceStats.todayRecord.time}`}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {attendanceStats.todayRecord.location?.geofenceZoneName ||
                      (lang === 'th' ? 'บันทึกเรียบร้อย' : 'Verified')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPhotoRecord(attendanceStats.todayRecord!)}
                  className="text-[13px] font-medium text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  {lang === 'th' ? 'ดูหลักฐาน' : 'View proof'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {todayHoliday || isTodayWeekend
                    ? lang === 'th'
                      ? 'วันนี้ไม่มีการเช็คชื่อเข้าเรียน'
                      : 'No check-in required today'
                    : lang === 'th'
                      ? 'ยังไม่ได้เช็คชื่อเข้าเรียนวันนี้'
                      : 'Not checked in yet today'}
                </p>
                {studentCanSelfCheckin && !todayHoliday && !isTodayWeekend && (
                  <button
                    type="button"
                    onClick={() => onNavigate('mobile_checkin')}
                    className="text-[13px] font-semibold text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {lang === 'th' ? 'เช็คชื่อเลย →' : 'Check in →'}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* CARD B: GRADES & SUBJECT MASTERY VISUAL PROGRESS */}
        <section
          aria-label={lang === 'th' ? 'ผลการเรียนและความก้าวหน้ารายวิชา' : 'Grades and subject progress'}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md p-5 sm:p-6 flex flex-col justify-between gap-6"
        >
          {studentCanViewGrades ? (
            <>
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold text-[var(--color-text-title)]">
                      {gpaxDisplay.isRawScore
                        ? lang === 'th'
                          ? 'คะแนนเฉลี่ยสะสม'
                          : 'Average Score'
                        : lang === 'th'
                          ? 'ผลการเรียนเฉลี่ย (GPAX)'
                          : 'Academic Standing (GPAX)'}
                    </h3>
                    <p className="text-xs font-medium text-[var(--color-primary-text)]">
                      {gpaxDisplay.standingLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('gradebook')}
                    className="text-[13px] font-medium text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{lang === 'th' ? 'เปิดสมุดพก' : 'Report card'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Tabular GPAX + Overall Progress Bar */}
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-title)] tabular-nums">
                        {gpaxDisplay.primaryValue}
                      </span>
                      {gpaxDisplay.scaleSuffix && (
                        <span className="text-sm font-medium text-[var(--color-text-muted)] tabular-nums">
                          {gpaxDisplay.scaleSuffix}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                      {lang === 'th'
                        ? `${scopedGrades.length} รายวิชาที่มีผลคะแนน`
                        : `${scopedGrades.length} graded courses`}
                    </span>
                  </div>

                  <div
                    className="h-3 w-full rounded-full bg-[var(--color-card-subtle)] ring-1 ring-inset ring-black/5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={gpaxDisplay.barPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={lang === 'th' ? 'ความก้าวหน้าผลการเรียน' : 'Grade progress'}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getProgressBarTone(gpaxDisplay.barPercent)}`}
                      style={{ width: `${gpaxDisplay.barPercent}%` }}
                    />
                  </div>
                </div>

                {/* Subject-by-Subject Slim Visual Progress Bars */}
                {subjectGradeRows.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {subjectGradeRows.map((row) => (
                      <div key={row.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-[var(--color-text-title)] truncate">
                            {row.title}
                          </span>
                          <span className="text-[var(--color-text-muted)] tabular-nums shrink-0">
                            <strong className="font-semibold text-[var(--color-text-title)]">
                              {row.letter}
                            </strong>{' '}
                            · {row.score}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--color-card-subtle)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressBarTone(row.score)}`}
                            style={{ width: `${row.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center space-y-1">
                    <GraduationCap className="w-6 h-6 text-[var(--color-text-muted)] mx-auto opacity-50" />
                    <p className="text-xs font-medium text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ยังไม่มีผลคะแนนรายวิชาในภาคเรียนนี้' : 'No course grades recorded yet'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {lang === 'th'
                        ? 'แถบความก้าวหน้ารายวิชาจะแสดงอัตโนมัติเมื่อครูบันทึกคะแนน'
                        : 'Subject progress bars will appear once teachers enter scores.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)] tabular-nums">
                <span>
                  {lang === 'th'
                    ? `ลงทะเบียนทั้งหมด ${scopedCourses.length} รายวิชา`
                    : `${scopedCourses.length} enrolled courses`}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('gradebook')}
                  className="font-medium text-[var(--color-primary-text)] hover:underline cursor-pointer"
                >
                  {lang === 'th' ? 'ดูครบทุกวิชา →' : 'All subjects →'}
                </button>
              </div>
            </>
          ) : (
            /* Fallback when school hides grades: Homework Completion Focus */
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ความคืบหน้าการส่งงาน' : 'Assignment Progress'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'สรุปภาระงานและแบบฝึกหัดทั้งหมด' : 'Overview of assigned work'}
                  </p>
                </div>
                {canAccessHomework && (
                  <button
                    type="button"
                    onClick={() => onNavigate('homework')}
                    className="text-[13px] font-medium text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition cursor-pointer"
                  >
                    {lang === 'th' ? 'เปิดหน้าการบ้าน →' : 'Open tasks →'}
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-title)] tabular-nums">
                  {homeworkStats.percent}%
                </span>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  {lang === 'th'
                    ? `ส่งแล้ว ${homeworkStats.completed} / ${homeworkStats.total} งาน`
                    : `${homeworkStats.completed} of ${homeworkStats.total} completed`}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--color-card-subtle)] ring-1 ring-inset ring-black/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getProgressBarTone(homeworkStats.percent)}`}
                  style={{ width: `${homeworkStats.percent}%` }}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ==================================================================== */}
      {/* 3. SECONDARY WORKSPACE: TODAY'S SCHEDULE + TASKS & SCHOOL UPDATES    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
        {/* CARD C: TODAY'S SCHEDULE */}
        <section
          data-guide-id="dashboard-today-desk"
          aria-label={lang === 'th' ? 'ตารางเรียนวันนี้' : 'Today’s schedule'}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md p-5 sm:p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ตารางเรียนวันนี้' : 'Today’s Schedule'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {todayHoliday
                    ? todayHoliday.nameTh
                    : isTodayWeekend
                      ? lang === 'th'
                        ? 'วันหยุดสุดสัปดาห์'
                        : 'Weekend'
                      : lang === 'th'
                        ? `${todayScheduledSlots.length} คาบเรียน`
                        : `${todayScheduledSlots.length} periods scheduled`}
                </p>
              </div>
              {canViewTimetable && (
                <button
                  type="button"
                  onClick={() => onNavigate('timetable')}
                  className="text-[13px] font-medium text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{lang === 'th' ? 'ดูตารางทั้งหมด' : 'Full timetable'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {todayHoliday || isTodayWeekend ? (
              <div className="py-8 text-center space-y-2">
                <Calendar className="w-7 h-7 text-[var(--color-text-muted)] mx-auto opacity-50" />
                <p className="text-base font-semibold text-[var(--color-text-title)]">
                  {todayHoliday
                    ? todayHoliday.nameTh
                    : lang === 'th'
                      ? 'ไม่มีคาบเรียนในวันหยุดสุดสัปดาห์'
                      : 'No regular classes on weekends'}
                </p>
                {upcomingHoliday && !todayHoliday && (
                  <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                    {lang === 'th'
                      ? `วันหยุดถัดไป: ${upcomingHoliday.nameTh} (${upcomingHoliday.date})`
                      : `Next holiday: ${upcomingHoliday.nameEn} (${upcomingHoliday.date})`}
                  </p>
                )}
              </div>
            ) : todayScheduledSlots.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <Clock className="w-7 h-7 text-[var(--color-text-muted)] mx-auto opacity-50" />
                <p className="text-sm font-medium text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ยังไม่มีตารางเรียนสำหรับวันนี้' : 'No classes scheduled today'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th'
                    ? 'ตรวจสอบตารางเรียนรายสัปดาห์ได้ที่เมนูตารางเรียน'
                    : 'Check your weekly schedule in the Timetable view.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {todayScheduledSlots.slice(0, 5).map((slot) => {
                  const activity = getTimetableSlotActivityStatus({
                    slot,
                    schoolPeriods,
                    now: bangkokClock,
                    schoolId: school?.id,
                  });
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onNavigate('timetable')}
                      className="w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-xl px-3 -mx-3 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-20 shrink-0 text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                          {activity.startTime || `P${slot.periodNumber}`}
                          {activity.endTime ? `–${activity.endTime}` : ''}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-title)] truncate">
                            {slot.courseTitleTh || slot.courseTitleEn || slot.courseCode}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {lang === 'th' ? `คาบ ${slot.periodNumber}` : `Period ${slot.periodNumber}`}
                            {slot.room ? ` · ${lang === 'th' ? 'ห้อง' : 'Room'} ${slot.room}` : ''}
                            {slot.teacherName ? ` · ${slot.teacherName}` : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap shrink-0 tabular-nums ${
                          activity.isActive
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        {activity.isActive
                          ? lang === 'th'
                            ? 'กำลังเรียน'
                            : 'In class'
                          : slot.courseCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CARD D: HOMEWORK PROGRESS & LATEST UPDATES */}
        <section
          aria-label={lang === 'th' ? 'การบ้านและประกาศโรงเรียน' : 'Homework and updates'}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md p-5 sm:p-6 flex flex-col justify-between gap-5"
        >
          {/* Homework Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'การบ้านและงานที่ได้รับมอบหมาย' : 'Homework & Tasks'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {homeworkStats.total > 0
                    ? lang === 'th'
                      ? `ส่งแล้ว ${homeworkStats.completed} จาก ${homeworkStats.total} งาน (${homeworkStats.percent}%)`
                      : `${homeworkStats.completed} of ${homeworkStats.total} submitted (${homeworkStats.percent}%)`
                    : lang === 'th'
                      ? 'ยังไม่มีงานค้างในระบบ'
                      : 'No assignments yet'}
                </p>
              </div>
              {canAccessHomework && (
                <button
                  type="button"
                  onClick={() => onNavigate('homework')}
                  className="text-[13px] font-medium text-[var(--color-primary-text)] rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-[var(--color-primary-light)] transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{lang === 'th' ? 'เปิดหน้าการบ้าน' : 'All tasks'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {homeworkStats.total > 0 && (
              <div
                className="h-2 w-full rounded-full bg-[var(--color-card-subtle)] overflow-hidden"
                role="progressbar"
                aria-valuenow={homeworkStats.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lang === 'th' ? 'ความคืบหน้าการบ้าน' : 'Homework completion'}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressBarTone(homeworkStats.percent)}`}
                  style={{ width: `${homeworkStats.percent}%` }}
                />
              </div>
            )}

            {homeworkStats.pendingList.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]">
                {homeworkStats.pendingList.map((asg) => {
                  const course = scopedCourses.find((c) => c.id === asg.courseId);
                  return (
                    <button
                      key={asg.id}
                      type="button"
                      onClick={() => onNavigate('homework')}
                      className="w-full py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-xl px-3 -mx-3 transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-title)] truncate">
                          {lang === 'th' ? asg.titleTh || asg.titleEn : asg.titleEn || asg.titleTh}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate tabular-nums">
                          {course?.code || (lang === 'th' ? 'รายวิชา' : 'Course')} · {lang === 'th' ? 'ส่ง' : 'Due'} {asg.dueDate}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
                        {lang === 'th' ? 'รอส่ง' : 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-3 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="font-medium">
                  {homeworkStats.total > 0
                    ? lang === 'th'
                      ? 'ส่งงานครบทุกรายการแล้ว ยอดเยี่ยมมาก'
                      : 'All assigned tasks completed'
                    : lang === 'th'
                      ? 'ไม่มีการบ้านค้างส่งในขณะนี้'
                      : 'No pending homework right now'}
                </span>
              </div>
            )}
          </div>

          {/* Hairline Footer: Latest Announcement + Quick Student Links */}
          <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
            {latestAnnouncement && (
              <button
                type="button"
                onClick={onOpenAnnouncementsTab}
                className="w-full flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-xl p-3 -mx-3 transition cursor-pointer"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Megaphone className="w-4 h-4 text-[var(--color-primary-text)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                      {latestAnnouncement.title}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate tabular-nums">
                      {lang === 'th' ? 'ประกาศโรงเรียน' : 'Announcement'} · {latestAnnouncement.publishedAt}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </button>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--color-text-body)]">
              {studentCanUploadPortfolio && (
                <button
                  type="button"
                  onClick={() => onNavigate('portfolio')}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--color-primary-text)] transition cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'แฟ้มผลงานของฉัน' : 'My Portfolio'}</span>
                </button>
              )}
              {canViewDigitalId && (
                <button
                  type="button"
                  onClick={() => onNavigate('student_id_cards')}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--color-primary-text)] transition cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span>{lang === 'th' ? 'บัตรนักเรียนดิจิทัล' : 'Digital Student ID'}</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ==================================================================== */}
      {/* 4. CAREER QUEST AI LAUNCH & READINESS STRIP                          */}
      {/* ==================================================================== */}
      {canOpenCareerQuest && (
      <section
        aria-label={lang === 'th' ? 'เส้นทางสู่อาชีพในฝัน Career Quest AI' : 'Career Quest AI'}
        className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'Career Quest AI · เส้นทางสู่อาชีพในฝัน' : 'Career Quest AI'}
              </h3>
              {careerQuestSnapshot?.career && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300 tabular-nums">
                  <span>
                    {lang === 'th'
                      ? careerQuestSnapshot.career.titleTh
                      : careerQuestSnapshot.career.titleEn}
                  </span>
                  <span>·</span>
                  <span>{careerQuestSnapshot.saved.lastReadinessPercent ?? 0}%</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {careerQuestSnapshot?.career
                ? lang === 'th'
                  ? `${careerQuestSnapshot.saved.lastReadinessLevel || 'Lv.1 นักสำรวจ'} · สะสม ${careerQuestSnapshot.saved.careerExp} Career EXP · ทำภารกิจ & คุยกับ AI Career Coach`
                  : `${careerQuestSnapshot.saved.lastReadinessLevel || 'Lv.1'} · ${careerQuestSnapshot.saved.careerExp} Career EXP`
                : lang === 'th'
                  ? 'เลือกอาชีพในฝัน หรือทำ Vibe Quiz 5 ข้อ เทียบความพร้อมจากเกรดจริงและฝึก Role-Play กับ AI'
                  : 'Pick your dream career or take the 5-question Vibe Quiz matched to your real grades'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('career_quest')}
          className="min-h-11 w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md active:scale-[0.99] transition cursor-pointer whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {careerQuestSnapshot?.career
              ? lang === 'th'
                ? 'เปิดการ์ดอาชีพของฉัน'
                : 'Open My Career Card'
              : lang === 'th'
                ? 'ค้นหาอาชีพในฝัน'
                : 'Start Career Quest'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>
      )}
    </div>
  );
};
