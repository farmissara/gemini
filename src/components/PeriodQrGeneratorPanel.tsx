import React, { useState, useEffect, useMemo } from 'react';
import {
  Ban,
  Check,
  Clock,
  Copy,
  Maximize2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  Users,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceCheckType,
  Course,
  PeriodAttendanceRecord,
  SchoolPeriodTime,
  Student,
  TimetableSlot,
} from '../types';
import { DEFAULT_SCHOOL_PERIODS } from '../lib/schoolPeriods';
import { getLocalDateString } from '../lib/date';
import { QrCodeMatrix } from './QrCodeMatrix';
import {
  buildExpiringPeriodQrSession,
  ExpiringPeriodQrSession,
  formatCountdownMmSs,
  loadSavedPeriodQrSessions,
  revokePeriodQrToken,
  savePeriodQrSessions,
} from '../lib/periodQrTokens';

interface PeriodQrGeneratorPanelProps {
  schoolId: string;
  courses: Course[];
  students: Student[];
  schoolPeriods?: SchoolPeriodTime[];
  timetableSlots?: TimetableSlot[];
  periodAttendance?: PeriodAttendanceRecord[];
  lang: AppLanguage;
}

const TTL_OPTIONS = [2, 5, 10, 15, 30] as const;

export const PeriodQrGeneratorPanel: React.FC<PeriodQrGeneratorPanelProps> = ({
  schoolId,
  courses,
  students,
  schoolPeriods = [],
  timetableSlots = [],
  periodAttendance = [],
  lang,
}) => {
  const todayStr = getLocalDateString();

  const availableCourses = useMemo<Course[]>(() => {
    if (courses.length > 0) return courses;
    return [
      {
        id: 'course-general-homeroom',
        schoolId,
        code: 'GEN-101',
        titleEn: 'General Classroom Session',
        titleTh: 'คาบเรียนรวม / โฮมรูม',
        category: 'core',
        credits: 1,
        teacherName: 'ฝ่ายวิชาการ',
        teacherEmail: '',
        department: 'วิชาการ',
        schedule: 'ทุกวัน',
        room: 'ทุกห้อง',
        academicYear: '2569',
        semester: '1',
        enrolledStudentIds: students.map((s) => s.id),
        description: '',
      },
    ];
  }, [courses, schoolId, students]);

  const teachablePeriods = useMemo(() => {
    const source = schoolPeriods.length > 0 ? schoolPeriods : DEFAULT_SCHOOL_PERIODS;
    const filtered = source.filter((p) => !p.isBreak && p.periodNumber > 0);
    return filtered.length > 0 ? filtered : DEFAULT_SCHOOL_PERIODS.filter((p) => !p.isBreak);
  }, [schoolPeriods]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(availableCourses[0]?.id || '');
  const [selectedPeriodNum, setSelectedPeriodNum] = useState<number>(
    teachablePeriods[0]?.periodNumber || 1
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [checkType, setCheckType] = useState<AttendanceCheckType>('check_in');
  const [ttlMinutes, setTtlMinutes] = useState<number>(5);

  const [sessions, setSessions] = useState<ExpiringPeriodQrSession[]>(() =>
    loadSavedPeriodQrSessions(schoolId)
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const loaded = loadSavedPeriodQrSessions(schoolId);
    return loaded[0]?.id || null;
  });

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedField, setCopiedField] = useState<'url' | 'code' | null>(null);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  // Keep selectedCourseId valid if school changes
  useEffect(() => {
    if (!availableCourses.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(availableCourses[0]?.id || '');
    }
  }, [availableCourses, selectedCourseId]);

  useEffect(() => {
    const loaded = loadSavedPeriodQrSessions(schoolId);
    setSessions(loaded);
    setActiveSessionId(loaded[0]?.id || null);
  }, [schoolId]);

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedCourse =
    availableCourses.find((c) => c.id === selectedCourseId) || availableCourses[0];
  const selectedPeriodInfo =
    teachablePeriods.find((p) => p.periodNumber === selectedPeriodNum) || teachablePeriods[0];

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0] || null,
    [sessions, activeSessionId]
  );

  const enrolledCountForSelectedCourse = useMemo(() => {
    if (!selectedCourse) return students.length;
    if (selectedCourse.enrolledStudentIds && selectedCourse.enrolledStudentIds.length > 0) {
      return selectedCourse.enrolledStudentIds.length;
    }
    if (selectedCourse.room) {
      const matched = students.filter(
        (s) => s.room?.trim().toLowerCase() === selectedCourse.room.trim().toLowerCase()
      );
      if (matched.length > 0) return matched.length;
    }
    return students.length;
  }, [selectedCourse, students]);

  const checkedInCountForSession = useMemo(() => {
    if (!activeSession) return 0;
    return periodAttendance.filter(
      (p) =>
        p.courseId === activeSession.courseId &&
        p.periodNumber === activeSession.periodNumber &&
        p.date === activeSession.date &&
        (p.status === 'present' || p.status === 'late')
    ).length;
  }, [activeSession, periodAttendance]);

  const handleGenerateQr = (overrideConfig?: {
    courseId?: string;
    periodNumber?: number;
    ttlMinutes?: number;
  }) => {
    const courseObj =
      availableCourses.find((c) => c.id === (overrideConfig?.courseId || selectedCourse?.id)) ||
      selectedCourse;
    const pNum = overrideConfig?.periodNumber ?? selectedPeriodNum;
    const periodObj =
      teachablePeriods.find((p) => p.periodNumber === pNum) || selectedPeriodInfo;
    const ttl = overrideConfig?.ttlMinutes ?? ttlMinutes;

    const newSession = buildExpiringPeriodQrSession({
      schoolId,
      courseId: courseObj.id,
      courseCode: courseObj.code,
      courseTitle: lang === 'th' ? courseObj.titleTh : courseObj.titleEn || courseObj.titleTh,
      periodNumber: pNum,
      timeSlot: periodObj ? `${periodObj.startTime} - ${periodObj.endTime}` : '08:30 - 09:20',
      date: selectedDate,
      checkType,
      ttlMinutes: ttl,
    });

    setSessions((prev) => {
      const updated = [newSession, ...prev].slice(0, 10);
      savePeriodQrSessions(schoolId, updated);
      return updated;
    });
    setActiveSessionId(newSession.id);
    setNowMs(Date.now());
  };

  const handleRevokeSession = (session: ExpiringPeriodQrSession) => {
    revokePeriodQrToken(schoolId, session.token);
    revokePeriodQrToken(schoolId, session.shortCode);
    const revokedAt = Date.now();
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === session.id ? { ...s, revokedAt } : s));
      savePeriodQrSessions(schoolId, updated);
      return updated;
    });
  };

  const handleCopy = async (text: string, type: 'url' | 'code') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(type);
      window.setTimeout(() => setCopiedField(null), 2500);
    } catch {
      setCopiedField(type);
      window.setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const remainingMs = activeSession
    ? activeSession.revokedAt
      ? 0
      : Math.max(0, activeSession.expiresAt - nowMs)
    : 0;
  const totalDurationMs = activeSession
    ? Math.max(1, activeSession.expiresAt - activeSession.issuedAt)
    : 1;
  const remainingPct = activeSession
    ? Math.min(100, Math.max(0, Math.round((remainingMs / totalDurationMs) * 100)))
    : 0;
  const isExpired = Boolean(activeSession && (activeSession.revokedAt || remainingMs <= 0));
  const isRevoked = Boolean(activeSession?.revokedAt);

  // Quick presets from today's timetable
  const todayDayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[
    new Date().getDay()
  ];
  const todaySlots = useMemo(
    () =>
      timetableSlots
        .filter((s) => s.dayOfWeek === todayDayKey)
        .slice()
        .sort((a, b) => a.periodNumber - b.periodNumber),
    [timetableSlots, todayDayKey]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Generator Form */}
        <div className="lg:col-span-5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>
                  {lang === 'th'
                    ? 'สร้าง QR Code เช็คชื่อรายคาบแบบจำกัดเวลา'
                    : 'Expiring Class-Period QR Generator'}
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {lang === 'th'
                  ? 'กำหนดรายวิชา คาบเรียน และอายุการใช้งานเพื่อให้นักเรียนสแกนเข้าเรียนได้รวดเร็วและป้องกันการใช้รหัสซ้ำ'
                  : 'Generate a temporary QR code scoped to a class period that automatically expires after the countdown.'}
              </p>
            </div>
          </div>

          {todaySlots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                {lang === 'th' ? 'เลือกด่วนจากตารางสอนวันนี้:' : "Quick select from today's timetable:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {todaySlots.slice(0, 6).map((slot) => {
                  const matchedCourse = availableCourses.find(
                    (c) => c.id === slot.courseId || c.code === slot.courseCode
                  );
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        if (matchedCourse) setSelectedCourseId(matchedCourse.id);
                        setSelectedPeriodNum(slot.periodNumber);
                        setSelectedDate(todayStr);
                      }}
                      className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[11px] font-semibold text-[var(--color-text-title)] cursor-pointer tabular-nums whitespace-nowrap"
                    >
                      {lang === 'th' ? `คาบ ${slot.periodNumber}` : `P${slot.periodNumber}`} ·{' '}
                      {slot.courseCode}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'รายวิชา / ห้องเรียน' : 'Course / Subject'}
              </label>
              <select
                value={selectedCourse?.id || ''}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {lang === 'th' ? course.titleTh : course.titleEn}{' '}
                    {course.room ? `(${course.room})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  {lang === 'th' ? 'คาบเรียน' : 'Class Period'}
                </label>
                <select
                  value={selectedPeriodNum}
                  onChange={(e) => setSelectedPeriodNum(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs tabular-nums focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  {teachablePeriods.map((p) => (
                    <option key={p.periodNumber} value={p.periodNumber}>
                      {lang === 'th'
                        ? `คาบที่ ${p.periodNumber} (${p.startTime} - ${p.endTime})`
                        : `Period ${p.periodNumber} (${p.startTime} - ${p.endTime})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  {lang === 'th' ? 'วันที่เช็คชื่อ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || todayStr)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs tabular-nums focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'ประเภทการเช็คชื่อ' : 'Check-in Direction'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckType('check_in')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
                    checkType === 'check_in'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'เช็คชื่อเข้าคาบ (Check-in)' : 'Period Check-in'}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckType('check_out')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition whitespace-nowrap ${
                    checkType === 'check_out'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? 'เช็คชื่อออกคาบ (Check-out)' : 'Period Check-out'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'อายุการใช้งาน QR Code (หมดอายุอัตโนมัติ)' : 'QR Expiration Window'}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {TTL_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTtlMinutes(mins)}
                    className={`py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition tabular-nums whitespace-nowrap ${
                      ttlMinutes === mins
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {mins} {lang === 'th' ? 'น.' : 'm'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleGenerateQr()}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <QrCode className="w-4 h-4" />
                <span>
                  {lang === 'th'
                    ? `สร้าง QR Code ชั่วคราว (${ttlMinutes} นาที)`
                    : `Generate ${ttlMinutes}-Min Expiring QR`}
                </span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {lang === 'th'
                    ? `นักเรียนในรายวิชา: ${enrolledCountForSelectedCourse} คน`
                    : `Enrolled students: ${enrolledCountForSelectedCourse}`}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'th' ? 'ตรวจสอบเวลาหมดอายุอัตโนมัติ' : 'Expiry enforced'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Active Expiring QR Card & Live Countdown */}
        <div className="lg:col-span-7 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col justify-between space-y-4">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Timer className="w-10 h-10 text-[var(--color-text-muted)]" />
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th'
                    ? 'ยังไม่มี QR Code รายคาบที่ใช้งานอยู่'
                    : 'No Active Expiring QR Session'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th'
                    ? 'เลือกรายวิชา คาบเรียน และระยะเวลาที่ต้องการทางด้านซ้าย แล้วกดสร้าง QR Code เพื่อให้นักเรียนสแกนเช็คชื่อ'
                    : 'Select a course, class period, and validity window on the left to generate a temporary QR code.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateQr()}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'th' ? 'สร้าง QR ทันที' : 'Generate Now'}
              </button>
            </div>
          ) : (
            <>
              {/* Session Header + Countdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                      {activeSession.courseCode} · {activeSession.courseTitle}
                    </h3>
                    <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">
                      {lang === 'th'
                        ? `คาบที่ ${activeSession.periodNumber} (${activeSession.timeSlot})`
                        : `Period ${activeSession.periodNumber} (${activeSession.timeSlot})`}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                    {activeSession.date} ·{' '}
                    {activeSession.checkType === 'check_in'
                      ? lang === 'th'
                        ? 'เช็คชื่อเข้าคาบ'
                        : 'Check-in'
                      : lang === 'th'
                        ? 'เช็คชื่อออกคาบ'
                        : 'Check-out'}{' '}
                    ·{' '}
                    {lang === 'th'
                      ? `เช็คชื่อแล้ว ${checkedInCountForSession} คน`
                      : `${checkedInCountForSession} checked in`}
                  </p>
                </div>

                {/* Live Countdown Readout */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xl font-mono font-bold tabular-nums leading-none ${
                        isExpired
                          ? 'text-rose-600 dark:text-rose-400'
                          : remainingPct <= 25
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpired ? '00:00' : formatCountdownMmSs(remainingMs)}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                      {isRevoked
                        ? lang === 'th'
                          ? 'ยกเลิกการใช้งานแล้ว'
                          : 'Revoked'
                        : isExpired
                          ? lang === 'th'
                            ? 'หมดอายุแล้ว'
                            : 'Expired'
                          : lang === 'th'
                            ? `หมดอายุ ${new Date(activeSession.expiresAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })} น.`
                            : `Expires ${new Date(activeSession.expiresAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiration Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isExpired
                      ? 'bg-rose-600'
                      : remainingPct <= 25
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${isExpired ? 0 : remainingPct}%` }}
                />
              </div>

              {/* QR Code Display + Details */}
              <div className="flex flex-col sm:flex-row items-center gap-5 py-1">
                <div className="relative shrink-0">
                  <div className={isExpired ? 'opacity-25 blur-[1px] transition' : 'transition'}>
                    <QrCodeMatrix
                      value={activeSession.url}
                      size={208}
                      label={`Expiring QR for ${activeSession.courseCode} Period ${activeSession.periodNumber}`}
                    />
                  </div>
                  {isExpired && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-[var(--color-card)] px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 shadow-xs">
                        {isRevoked
                          ? lang === 'th'
                            ? 'QR ถูกยกเลิกแล้ว'
                            : 'QR Revoked'
                          : lang === 'th'
                            ? 'QR หมดอายุแล้ว'
                            : 'QR Expired'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleGenerateQr({
                            courseId: activeSession.courseId,
                            periodNumber: activeSession.periodNumber,
                            ttlMinutes: activeSession.ttlMinutes,
                          })
                        }
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'สร้างรอบใหม่' : 'Regenerate'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 w-full space-y-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                      {lang === 'th'
                        ? 'รหัสเช็คชื่อสำรอง (กรณีนักเรียนพิมพ์กรอกเอง):'
                        : 'Manual Passcode Fallback:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono font-bold text-sm text-[var(--color-text-title)] tracking-wide tabular-nums">
                        {activeSession.shortCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeSession.shortCode, 'code')}
                        disabled={isExpired}
                        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      >
                        {copiedField === 'code' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'code' ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : lang === 'th' ? 'คัดลอกรหัส' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                      {lang === 'th' ? 'ลิงก์เช็คชื่อรายคาบ (มี Timestamp หมดอายุ):' : 'Expiring Check-in URL:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeSession.url}
                        aria-label="Expiring period check-in URL"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono text-[11px] text-[var(--color-text-body)] focus:outline-hidden truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(activeSession.url, 'url')}
                        disabled={isExpired}
                        className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      >
                        {copiedField === 'url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'url' ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : lang === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Session Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFullscreenModal(true)}
                      disabled={isExpired}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:opacity-95 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'แสดงเต็มจอห้องเรียน' : 'Projector Mode'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleGenerateQr({
                          courseId: activeSession.courseId,
                          periodNumber: activeSession.periodNumber,
                          ttlMinutes: activeSession.ttlMinutes,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'รีเฟรช QR ใหม่' : 'Regenerate'}</span>
                    </button>

                    {!isExpired && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(activeSession)}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'ยกเลิก QR ทันที' : 'Revoke Now'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Generated Period QR Sessions */}
      {sessions.length > 0 && (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              <span>
                {lang === 'th'
                  ? 'ประวัติ QR รายคาบที่สร้างล่าสุด'
                  : 'Recent Generated Period QR Sessions'}
              </span>
            </h3>
            <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              {sessions.length} {lang === 'th' ? 'รายการ' : 'sessions'}
            </span>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {sessions.slice(0, 5).map((session) => {
              const sRemaining = session.revokedAt ? 0 : Math.max(0, session.expiresAt - nowMs);
              const sExpired = Boolean(session.revokedAt) || sRemaining <= 0;
              const isSelected = activeSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-[var(--color-primary-light)]'
                      : 'hover:bg-[var(--color-card-subtle)]'
                  }`}
                >
                  <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-bold text-[var(--color-text-title)] tabular-nums">
                      {session.courseCode} ·{' '}
                      {lang === 'th' ? `คาบที่ ${session.periodNumber}` : `Period ${session.periodNumber}`}
                    </span>
                    <span className="text-[var(--color-text-muted)] truncate max-w-xs">
                      {session.courseTitle}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      · {session.shortCode} · {session.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span
                      className={`font-mono font-bold text-xs ${
                        sExpired
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {session.revokedAt
                        ? lang === 'th'
                          ? 'ถูกยกเลิก'
                          : 'Revoked'
                        : sExpired
                          ? lang === 'th'
                            ? 'หมดอายุ'
                            : 'Expired'
                          : `${lang === 'th' ? 'เหลือ' : 'Left'} ${formatCountdownMmSs(sRemaining)}`}
                    </span>

                    {!sExpired && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevokeSession(session);
                        }}
                        className="text-rose-700 dark:text-rose-300 hover:underline font-semibold text-xs cursor-pointer"
                      >
                        {lang === 'th' ? 'ยกเลิก' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Projector Modal */}
      {showFullscreenModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-5 text-center shadow-2xl">
            <div className="flex items-start justify-between gap-2 text-left">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-title)]">
                  {activeSession.courseCode} · {activeSession.courseTitle}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {lang === 'th'
                    ? `คาบที่ ${activeSession.periodNumber} (${activeSession.timeSlot}) · วันที่ ${activeSession.date}`
                    : `Period ${activeSession.periodNumber} (${activeSession.timeSlot}) · ${activeSession.date}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullscreenModal(false)}
                aria-label="Close fullscreen QR"
                className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className={`text-3xl font-mono font-bold tabular-nums ${
                  isExpired
                    ? 'text-rose-600 dark:text-rose-400'
                    : remainingPct <= 25
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isExpired
                  ? lang === 'th'
                    ? 'หมดอายุแล้ว'
                    : 'EXPIRED'
                  : formatCountdownMmSs(remainingMs)}
              </div>

              <div className="relative">
                <div className={isExpired ? 'opacity-20 blur-[1px]' : ''}>
                  <QrCodeMatrix
                    value={activeSession.url}
                    size={288}
                    label={`Fullscreen QR ${activeSession.courseCode} Period ${activeSession.periodNumber}`}
                  />
                </div>
                {isExpired && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        handleGenerateQr({
                          courseId: activeSession.courseId,
                          periodNumber: activeSession.periodNumber,
                          ttlMinutes: activeSession.ttlMinutes,
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>{lang === 'th' ? 'สร้าง QR รอบใหม่ทันที' : 'Regenerate QR'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="font-mono text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                {activeSession.shortCode}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'ให้นักเรียนสแกน QR Code นี้ผ่านมือถือเพื่อเช็คชื่อเข้าคาบเรียนก่อนหมดเวลา'
                  : 'Students can scan this QR code on mobile to check in before the countdown ends.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => handleCopy(activeSession.url, 'url')}
                disabled={isExpired}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {copiedField === 'url' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedField === 'url' ? (lang === 'th' ? 'คัดลอกลิงก์แล้ว' : 'Link Copied') : lang === 'th' ? 'คัดลอกลิงก์เช็คชื่อ' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFullscreenModal(false)}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'th' ? 'ปิดหน้าจอขยาย' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
