import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Camera,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Gamepad2,
  HeartHandshake,
  HeartPulse,
  LayoutGrid,
  User,
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

type TeacherParentHomeTab = 'today' | 'tools';

interface DirectoryRowProps {
  icon: React.ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
}

const DirectoryRow: React.FC<DirectoryRowProps> = ({ icon, label, meta, onClick }) => (
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

export const MobileTeacherParentHome: React.FC<MobileTeacherParentHomeProps> = ({
  currentUser,
  activeSchool,
  currentRole,
  lang,
  linkedStudents,
  todayHoliday,
  canSelfCheckin,
  canOpenLeave,
  canOpenCareerQuest,
  canPlayGames,
  canAccessHomework = false,
  canOpenLms = false,
  canOpenBehaviorSdq = false,
  canOpenInfirmary = false,
  todayCheckin,
  todayCheckout,
  todayBangkokStr,
  bangkokClock,
  todayMySlots,
  schoolPeriods,
  periodAttendance,
  pendingLeavesCount,
  scopedAssignmentsCount = 0,
  lessonsCount = 0,
  execMetrics,
  getSlotTodayCheckStatus,
  openPeriodCheckinFromSlot,
  setMobileAttendanceInitialSubTab,
  setActiveTab,
  setActiveGameView,
}) => {
  const [homeTab, setHomeTab] = useState<TeacherParentHomeTab>('today');
  const isTeacher = currentRole === 'teacher';
  const isParent = currentRole === 'parent';
  const isWeekend = isWeekendDate(todayBangkokStr);

  const displayName =
    (lang === 'th' ? currentUser?.fullNameTh : currentUser?.fullNameEn) ||
    currentUser?.fullNameTh ||
    currentUser?.fullNameEn ||
    currentUser?.email ||
    (isTeacher ? (lang === 'th' ? 'ครูผู้สอน' : 'Teacher') : lang === 'th' ? 'ผู้ปกครอง' : 'Parent');
  const displayInitials = displayName.trim().slice(0, 2).toUpperCase();
  const schoolName = lang === 'th' ? activeSchool.nameTh : activeSchool.nameEn;

  const tabs: Array<{ id: TeacherParentHomeTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'today',
      label: isTeacher ? (lang === 'th' ? 'วันนี้' : 'Today') : lang === 'th' ? 'วันนี้' : 'Today',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'tools',
      label: lang === 'th' ? 'บริการอื่นๆ' : 'Services',
      icon: <LayoutGrid className="w-3.5 h-3.5 shrink-0" />,
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
      {/* 1. COMPACT PROFILE IDENTITY STRIP (Tap to open Profile/Digital ID/Settings) */}
      <button
        type="button"
        onClick={() => setActiveTab('profile')}
        className="w-full p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] flex items-center justify-between gap-3 text-left transition cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover border border-[var(--color-border)] shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold text-xs flex items-center justify-center shrink-0">
              {displayInitials || <User className="w-4 h-4" />}
            </div>
          )}
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-[var(--color-text-muted)] tabular-nums truncate">
              {isTeacher
                ? `${lang === 'th' ? 'ครูผู้สอน' : 'Teacher'} · ${
                    todayCheckin
                      ? lang === 'th'
                        ? `เข้า รร. ${todayCheckin.time.slice(0, 5)} น.`
                        : `In ${todayCheckin.time.slice(0, 5)}`
                      : lang === 'th'
                        ? 'ยังไม่ลงเวลาเข้าโรงเรียน'
                        : 'Not checked in'
                  }`
                : isParent && linkedStudents.length > 0
                  ? `${lang === 'th' ? 'ผู้ปกครอง' : 'Parent'} · ${linkedStudents[0].firstNameTh} (${linkedStudents[0].gradeLevel} ${linkedStudents[0].room})`
                  : lang === 'th'
                    ? 'ผู้ปกครอง / บุคลากร'
                    : 'Parent / Staff'}
            </p>
            <p className="text-sm font-bold text-[var(--color-text-title)] truncate">{displayName}</p>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">{schoolName}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
      </button>

      {/* 2. NON-OVERLAPPING 2-TAB BAR */}
      <div
        role="tablist"
        aria-label={lang === 'th' ? 'หมวดหน้าหลัก' : 'Home sections'}
        className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]"
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
              className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
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
              periodAttendance={periodAttendance}
            />
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
                className="w-full min-h-[64px] p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left flex items-center justify-between gap-3 cursor-pointer transition"
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
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-text)] whitespace-nowrap shrink-0">
                  <span>{lang === 'th' ? 'ลงเวลา / ประวัติ' : 'Clock / History'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
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
      )}

      {/* 4. TAB PANEL: SERVICES (Zero duplicates of Today/Header/BottomNav) */}
      {homeTab === 'tools' && (
        <div role="tabpanel" className="space-y-3 animate-in fade-in duration-150">
          {isTeacher && (
            <>
              {(canAccessHomework || canOpenLms) && (
                <div className="space-y-1.5">
                  <h3 className="px-1 text-xs font-bold text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'งานสอนและวิชาการ' : 'Academics'}
                  </h3>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                    {canAccessHomework && (
                      <DirectoryRow
                        icon={<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                        label={lang === 'th' ? 'การบ้าน / ตรวจงาน' : 'Homework'}
                        meta={`${scopedAssignmentsCount} ${lang === 'th' ? 'งาน' : 'tasks'}`}
                        onClick={() => setActiveTab('homework')}
                      />
                    )}
                    {canOpenLms && (
                      <DirectoryRow
                        icon={<BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                        label={lang === 'th' ? 'ห้องเรียน LMS' : 'LMS Classroom'}
                        meta={`${lessonsCount} ${lang === 'th' ? 'บทเรียน' : 'lessons'}`}
                        onClick={() => setActiveTab('lms')}
                      />
                    )}
                  </div>
                </div>
              )}

              {(canOpenBehaviorSdq || canOpenInfirmary || canOpenLeave) && (
                <div className="space-y-1.5">
                  <h3 className="px-1 text-xs font-bold text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ดูแลนักเรียนและคำขอ' : 'Student Care & Leave'}
                  </h3>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                    {canOpenLeave && (
                      <DirectoryRow
                        icon={<FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                        label={lang === 'th' ? 'ยื่นใบลา / อนุมัติลา' : 'Leave Requests'}
                        meta={pendingLeavesCount > 0 ? `${pendingLeavesCount}` : undefined}
                        onClick={() => setActiveTab('leave')}
                      />
                    )}
                    {canOpenBehaviorSdq && (
                      <DirectoryRow
                        icon={<HeartHandshake className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                        label={lang === 'th' ? 'พฤติกรรม SDQ' : 'Behavior & SDQ'}
                        meta={execMetrics.riskCount > 0 ? `${lang === 'th' ? 'เสี่ยง' : 'Risk'} ${execMetrics.riskCount}` : undefined}
                        onClick={() => setActiveTab('behavior_sdq')}
                      />
                    )}
                    {canOpenInfirmary && (
                      <DirectoryRow
                        icon={<HeartPulse className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                        label={lang === 'th' ? 'ห้องพยาบาล' : 'Infirmary'}
                        meta={execMetrics.todayInfirmary > 0 ? `${execMetrics.todayInfirmary}` : undefined}
                        onClick={() => setActiveTab('infirmary')}
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <h3 className="px-1 text-xs font-bold text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'ภาพรวมและกิจกรรม' : 'Overview & Activities'}
                </h3>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                  <DirectoryRow
                    icon={<BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    label={lang === 'th' ? 'ภาพรวมโรงเรียน' : 'School Overview'}
                    meta={`${execMetrics.attendanceRate}%`}
                    onClick={() => setActiveTab('executive')}
                  />
                  {canPlayGames && (
                    <DirectoryRow
                      icon={<Gamepad2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                      label={lang === 'th' ? 'เกม & แล็บ 8 สาระ' : 'Games & Labs'}
                      onClick={() => {
                        setActiveTab('games');
                        setActiveGameView('hub');
                      }}
                    />
                  )}
                  {canOpenCareerQuest && (
                    <DirectoryRow
                      icon={<Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                      label="Career Quest AI"
                      onClick={() => setActiveTab('career_quest')}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {isParent && (
            <div className="space-y-1.5">
              <h3 className="px-1 text-xs font-bold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'บริการผู้ปกครอง' : 'Parent Services'}
              </h3>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
                <DirectoryRow
                  icon={<Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  label={lang === 'th' ? 'ประวัติมาเรียนย้อนหลัง' : 'Attendance History'}
                  meta={todayCheckin ? `${todayCheckin.time.slice(0, 5)} น.` : undefined}
                  onClick={() => setActiveTab('attendance_history')}
                />
                {canOpenLeave && (
                  <DirectoryRow
                    icon={<FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    label={lang === 'th' ? 'ยื่นใบลา' : 'Leave Requests'}
                    meta={pendingLeavesCount > 0 ? `${pendingLeavesCount}` : undefined}
                    onClick={() => setActiveTab('leave')}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
