import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Maximize2,
  QrCode,
  ScanLine,
  Search,
  Smartphone,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  ClassroomGpsConfig,
  Course,
  PeriodAttendanceRecord,
  Student,
} from '../../types';
import type { CourseTeacherOption } from '../../lib/courseTeacherFilter';
import { courseMatchesTeacherFilter } from '../../lib/courseTeacherFilter';
import { checkDistanceToClassroomGps } from '../../lib/classroomGps';
import type { PeriodFlexConfig } from '../../lib/attendanceCorrections';
import { QrCodeMatrix } from '../../components/QrCodeMatrix';
import { PagedList } from '../../components/PagedList';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TableActionMenu } from '../../components/common/TableActionMenu';
import type { PeriodRosterFilter } from './types';

interface PeriodCheckinTabProps {
  embeddedMobile: boolean;
  isRestrictedViewer: boolean;
  isStaffUser: boolean;
  isTeacher: boolean;
  students: Student[];
  courses: Course[];
  fallbackCourse: Course;
  courseTeacherOptions: CourseTeacherOption[];
  periodTeacherFilter: string;
  setPeriodTeacherFilter: (val: string) => void;
  periodFilteredCourses: Course[];
  selectedCourse: Course;
  selectedCourseId: string;
  setSelectedCourseId: (id: string) => void;
  selectedPeriod: number;
  setSelectedPeriod: (period: number) => void;
  periodsList: Array<{ period: number; time: string; label: string }>;
  periodDate: string;
  setPeriodDate: (date: string) => void;
  periodStudentIds: string[];
  runWithBiometricGuard: (action: () => void) => void;
  handleSavePeriodAttendance: () => void;
  periodSavedNotification: string | null;
  classroomGps: ClassroomGpsConfig | null;
  roomLatInput: string;
  setRoomLatInput: (val: string) => void;
  roomLngInput: string;
  setRoomLngInput: (val: string) => void;
  roomRadiusInput: number;
  setRoomRadiusInput: (val: number) => void;
  isLocatingRoom: boolean;
  handleDetectRoomGps: () => void;
  handleSaveManualRoomGps: () => void;
  roomGpsNotice: { type: 'ok' | 'err'; text: string } | null;
  periodCheckinUrl: string;
  expectedPeriodCode: string;
  setShowPeriodQrModal: (show: boolean) => void;
  showPeriodQrModal: boolean;
  handleCopyPeriodLink: () => Promise<void>;
  periodQrCopied: boolean;
  periodAttendance: PeriodAttendanceRecord[];
  scopedPeriodAttendance: PeriodAttendanceRecord[];
  selectedStudent: Student | undefined;
  periodCheckType: 'check_in' | 'check_out';
  setPeriodCheckType: (type: 'check_in' | 'check_out') => void;
  selectedPeriodTimeActivity: { isActive: boolean; remainingMinutes: number | null };
  selectedPeriodMeta: { period: number; time: string; label: string } | undefined;
  realGpsCoords: { lat: number; lng: number } | null;
  setRealGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  isGpsLoading: boolean;
  setIsGpsLoading: (loading: boolean) => void;
  handleStudentSelfPeriodCheckin: (overrideCode?: string) => void;
  studentPeriodCodeInput: string;
  setStudentPeriodCodeInput: (val: string) => void;
  studentPeriodCheckinMsg: string | null;
  studentPeriodCheckinError: string | null;
  periodRosterFilter: PeriodRosterFilter;
  setPeriodRosterFilter: (filter: PeriodRosterFilter) => void;
  periodRosterSearch: string;
  setPeriodRosterSearch: (q: string) => void;
  periodRosterRoomFilter: string;
  setPeriodRosterRoomFilter: (room: string) => void;
  periodStatuses: Record<string, 'present' | 'late' | 'absent' | 'excused'>;
  handleTeacherProxyPeriodCheckin: (
    student: Student,
    status?: 'present' | 'late' | 'absent' | 'excused',
    isNoPhoneProxy?: boolean
  ) => void;
  periodFlexConfig: PeriodFlexConfig;
  onUpdatePeriodFlexConfig: (next: PeriodFlexConfig) => void;
  periodCustomTimes: Record<string, { checkIn?: string; checkOut?: string; reason?: string }>;
  onSetStudentPeriodCustomTime: (
    studentId: string,
    patch: { checkIn?: string; checkOut?: string; reason?: string }
  ) => void;
  onOpenPeriodCorrection?: (params: {
    targetScope: 'period_checkin' | 'period_checkout';
    issueType: 'forgot_checkin' | 'forgot_checkout' | 'late_arrival' | 'time_mismatch';
    originalTime?: string;
  }) => void;
}

export const PeriodCheckinTab: React.FC<PeriodCheckinTabProps> = ({
  embeddedMobile,
  isRestrictedViewer,
  isStaffUser,
  isTeacher,
  students,
  courses,
  fallbackCourse,
  courseTeacherOptions,
  periodTeacherFilter,
  setPeriodTeacherFilter,
  periodFilteredCourses,
  selectedCourse,
  selectedCourseId,
  setSelectedCourseId,
  selectedPeriod,
  setSelectedPeriod,
  periodsList,
  periodDate,
  setPeriodDate,
  periodStudentIds,
  runWithBiometricGuard,
  handleSavePeriodAttendance,
  periodSavedNotification,
  classroomGps,
  roomLatInput,
  setRoomLatInput,
  roomLngInput,
  setRoomLngInput,
  roomRadiusInput,
  setRoomRadiusInput,
  isLocatingRoom,
  handleDetectRoomGps,
  handleSaveManualRoomGps,
  roomGpsNotice,
  periodCheckinUrl,
  expectedPeriodCode,
  setShowPeriodQrModal,
  showPeriodQrModal,
  handleCopyPeriodLink,
  periodQrCopied,
  periodAttendance,
  scopedPeriodAttendance,
  selectedStudent,
  periodCheckType,
  setPeriodCheckType,
  selectedPeriodTimeActivity,
  selectedPeriodMeta,
  realGpsCoords,
  setRealGpsCoords,
  isGpsLoading,
  setIsGpsLoading,
  handleStudentSelfPeriodCheckin,
  studentPeriodCodeInput,
  setStudentPeriodCodeInput,
  studentPeriodCheckinMsg,
  studentPeriodCheckinError,
  periodRosterFilter,
  setPeriodRosterFilter,
  periodRosterSearch,
  setPeriodRosterSearch,
  periodRosterRoomFilter,
  setPeriodRosterRoomFilter,
  periodStatuses,
  handleTeacherProxyPeriodCheckin,
  periodFlexConfig,
  onUpdatePeriodFlexConfig,
  periodCustomTimes,
  onSetStudentPeriodCustomTime,
  onOpenPeriodCorrection,
}) => {
  const [editingTimeStudentId, setEditingTimeStudentId] = React.useState<string | null>(null);
  const [showGpsConfigPanel, setShowGpsConfigPanel] = React.useState(false);
  const [showFlexConfigPanel, setShowFlexConfigPanel] = React.useState(false);
  const periodRoomOptions = Array.from(
    new Set(
      periodStudentIds
        .map((studentId) => students.find((student) => student.id === studentId))
        .filter((student): student is Student => Boolean(student))
        .map((student) => `${student.gradeLevel} ${student.room}`.trim())
    )
  ).sort((a, b) => a.localeCompare(b, 'th'));
  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto space-y-3 p-0.5 pb-24' : 'space-y-4 pb-12'}`}
    >
      <div className="saas-card">
        <div className="saas-card-header">
          <div>
            <h3 className="type-section-title flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <span>เช็คชื่อรายคาบ</span>
            </h3>
            <p className="type-meta mt-0.5">
              {isRestrictedViewer
                ? 'สแกน QR Code หรือเปิดลิงก์เพื่อเช็คชื่อเข้าคาบเรียน'
                : `${selectedCourse.code} · คาบที่ ${selectedPeriod} · ${periodStudentIds.length} คน`}
            </p>
          </div>
          {isStaffUser && (
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => runWithBiometricGuard(() => handleSavePeriodAttendance())}
                className="btn-action-primary px-3.5 py-1.5"
              >
                บันทึกรายชื่อทั้งคาบ
              </button>
              <TableActionMenu
                ariaLabel="ตั้งค่าเพิ่มเติมสำหรับการเช็คชื่อรายคาบ"
                size="md"
                menuWidth={260}
                items={[
                  {
                    id: 'toggle_gps_panel',
                    label: classroomGps
                      ? `พิกัด GPS ห้อง (${classroomGps.radiusMeters} ม.)`
                      : 'ตั้งค่าพิกัด GPS ห้องเรียน',
                    icon: <MapPin className="w-3.5 h-3.5" />,
                    variant: classroomGps ? 'success' : 'warning',
                    onClick: () => setShowGpsConfigPanel((v) => !v),
                  },
                  {
                    id: 'toggle_flex_panel',
                    label:
                      periodFlexConfig.graceMinutes >= 999
                        ? 'เวลายืดหยุ่น (ตลอดคาบ)'
                        : `เวลายืดหยุ่น (ผ่อนผัน ${periodFlexConfig.graceMinutes} น.)`,
                    icon: <Clock className="w-3.5 h-3.5" />,
                    onClick: () => setShowFlexConfigPanel((v) => !v),
                  },
                  {
                    id: 'fullscreen_qr',
                    label: 'ขยาย QR เต็มจอ (โปรเจกเตอร์)',
                    icon: <Maximize2 className="w-3.5 h-3.5" />,
                    variant: 'primary',
                    dividerBefore: true,
                    onClick: () => setShowPeriodQrModal(true),
                  },
                  {
                    id: 'copy_qr_link',
                    label: periodQrCopied ? 'คัดลอกลิงก์เช็คชื่อแล้ว ✓' : 'คัดลอกลิงก์เช็คชื่อรายคาบ',
                    icon: periodQrCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />,
                    onClick: () => void handleCopyPeriodLink(),
                  },
                ]}
              />
            </div>
          )}
        </div>

        <div className="saas-card-body space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {!isRestrictedViewer && !isTeacher && courseTeacherOptions.length > 0 && (
              <div>
                <label className="type-meta font-semibold">ครูผู้สอน</label>
                <select
                  aria-label="กรองวิชาตามรายชื่อครู"
                  value={periodTeacherFilter}
                  onChange={(e) => {
                    const nextTeacher = e.target.value;
                    setPeriodTeacherFilter(nextTeacher);
                    const matching = (courses.length > 0 ? courses : [fallbackCourse]).filter((c) =>
                      courseMatchesTeacherFilter(c, nextTeacher, courseTeacherOptions)
                    );
                    if (matching.length > 0 && !matching.some((c) => c.id === selectedCourseId)) {
                      setSelectedCourseId(matching[0].id);
                    }
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
                >
                  <option value="all">ทุกคน ({courseTeacherOptions.length})</option>
                  {courseTeacherOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} ({opt.count} วิชา)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={!isRestrictedViewer && !isTeacher && courseTeacherOptions.length > 0 ? '' : 'sm:col-span-2 lg:col-span-2'}>
              <label className="type-meta font-semibold">รายวิชา</label>
              <select
                value={selectedCourse.id}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
              >
                {periodFilteredCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} {c.titleTh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="type-meta font-semibold">คาบเรียน (ตามตารางโรงเรียน)</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs"
              >
                {periodsList.map((p) => (
                  <option key={p.period} value={p.period}>
                    {p.label} ({p.time})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="type-meta font-semibold">วันที่</label>
              {isRestrictedViewer ? (
                <div className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs tabular-nums font-medium">
                  {periodDate} (วันนี้)
                </div>
              ) : (
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs tabular-nums"
                />
              )}
            </div>
          </div>

          {periodSavedNotification && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
              <span>{periodSavedNotification}</span>
            </div>
          )}

          {/* Classroom GPS Setup Card (Opened via 3-Dot Menu) */}
          {!isRestrictedViewer && showGpsConfigPanel && (
            <div
              className={`p-3 rounded-xl border space-y-2.5 ${
                classroomGps
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className={`w-4 h-4 shrink-0 ${classroomGps ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span className="text-xs font-bold text-[var(--color-text-title)]">
                    พิกัด GPS ห้องเรียน ({selectedCourse.room || selectedCourse.code})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold ${
                      classroomGps ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {classroomGps
                      ? `ตั้งค่าแล้ว · รัศมี ${classroomGps.radiusMeters} ม.`
                      : 'ยังไม่ได้ตั้งพิกัด'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGpsConfigPanel(false)}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                    aria-label="ซ่อนแผงตั้งค่าพิกัด GPS"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">ละติจูด (Lat)</label>
                  <input
                    type="text"
                    value={roomLatInput}
                    onChange={(e) => setRoomLatInput(e.target.value)}
                    placeholder="เช่น 13.756331"
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">ลองจิจูด (Lng)</label>
                  <input
                    type="text"
                    value={roomLngInput}
                    onChange={(e) => setRoomLngInput(e.target.value)}
                    placeholder="เช่น 100.501762"
                    className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">รัศมีห้อง (ม.)</label>
                  <select
                    value={roomRadiusInput}
                    onChange={(e) => setRoomRadiusInput(Number(e.target.value))}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                  >
                    <option value={20}>20 ม.</option>
                    <option value={30}>30 ม.</option>
                    <option value={40}>40 ม.</option>
                    <option value={50}>50 ม.</option>
                    <option value={80}>80 ม.</option>
                    <option value={100}>100 ม.</option>
                  </select>
                </div>
                <div className="sm:col-span-4 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDetectRoomGps}
                    disabled={isLocatingRoom}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isLocatingRoom ? 'animate-spin' : ''}`} />
                    <span>{isLocatingRoom ? 'กำลังดึง...' : 'ดึงพิกัดห้องเรียนนี้'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveManualRoomGps}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                  >
                    บันทึก
                  </button>
                </div>
              </div>

              {roomGpsNotice && (
                <p
                  className={`text-[11px] font-semibold ${
                    roomGpsNotice.type === 'ok'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {roomGpsNotice.text}
                </p>
              )}
            </div>
          )}

          {/* Teacher Flexible Class-Period Window Controls (Opened via 3-Dot Menu) */}
          {!isRestrictedViewer && showFlexConfigPanel && (
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span className="text-xs font-bold text-[var(--color-text-title)]">
                    เวลายืดหยุ่นเข้า-ออกคาบเรียน ({selectedCourse.code})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[var(--color-primary-text)]">
                    {periodFlexConfig.graceMinutes >= 999
                      ? 'เปิดเช็คชื่อยืดหยุ่นตลอดคาบ'
                      : `ผ่อนผันเข้าสายได้ ${periodFlexConfig.graceMinutes} นาที`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFlexConfigPanel(false)}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                    aria-label="ซ่อนแผงตั้งค่าเวลายืดหยุ่น"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    [0, 'ตรงเวลา (0 น.)'],
                    [10, 'ผ่อนผัน 10 น.'],
                    [15, 'ผ่อนผัน 15 น.'],
                    [30, 'ผ่อนผัน 30 น.'],
                    [999, 'เปิดยืดหยุ่นตลอดคาบ'],
                  ] as const
                ).map(([mins, label]) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      onUpdatePeriodFlexConfig({
                        ...periodFlexConfig,
                        graceMinutes: mins,
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      periodFlexConfig.graceMinutes === mins
                        ? 'bg-[var(--color-primary)] text-white border-transparent'
                        : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-title)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={periodFlexConfig.allowFlexibleCheckout}
                    onChange={(e) =>
                      onUpdatePeriodFlexConfig({
                        ...periodFlexConfig,
                        allowFlexibleCheckout: e.target.checked,
                      })
                    }
                    className="rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                  />
                  <span>อนุญาตเช็คออกก่อน/หลังคาบแบบยืดหยุ่น</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR CODE & SHAREABLE CHECK-IN LINK CARD */}
      {!isRestrictedViewer && (
        <div className="saas-card bg-[var(--color-primary-light)]">
          <div className="saas-card-body flex flex-col sm:flex-row items-center gap-4">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <QrCodeMatrix
                value={periodCheckinUrl}
                size={embeddedMobile ? 132 : 148}
                label={`QR Code เช็คชื่อคาบเรียน ${selectedCourse.code} คาบที่ ${selectedPeriod}`}
              />
              <span className="type-meta font-mono font-bold text-[var(--color-primary-text)]">
                {expectedPeriodCode}
              </span>
            </div>

            <div className="flex-1 min-w-0 w-full space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="type-section-title flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <span>QR &amp; ลิงก์เช็คชื่อรายคาบ</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPeriodQrModal(true)}
                  className="btn-icon-tool"
                  title="ขยาย QR เต็มจอสำหรับฉายขึ้นโปรเจกเตอร์"
                  aria-label="ขยาย QR เต็มจอ"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                </button>
              </div>

              <p className="type-meta text-[var(--color-text-body)]">
                <strong className="text-[var(--color-text-title)]">
                  {selectedCourse.code} {selectedCourse.titleTh}
                </strong>{' '}
                · คาบที่ {selectedPeriod} · {periodDate}
              </p>

              <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={periodCheckinUrl}
                  aria-label="ลิงก์เช็คชื่อรายคาบ"
                  className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-[var(--color-text-title)] focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyPeriodLink}
                  className="btn-icon-tool bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white border-transparent"
                  title={periodQrCopied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์เช็คชื่อ'}
                  aria-label={periodQrCopied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์เช็คชื่อ'}
                >
                  {periodQrCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-0.5">
                <a
                  href={periodCheckinUrl}
                  className="font-bold text-[var(--color-primary-text)] underline underline-offset-4 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดลิงก์เช็คชื่อ</span>
                </a>
                {isStaffUser && (
                  <span className="type-meta text-emerald-700 dark:text-emerald-300 font-semibold">
                    เช็คแล้ว:{' '}
                    {
                      periodAttendance.filter(
                        (p) =>
                          p.courseId === selectedCourse.id &&
                          p.periodNumber === selectedPeriod &&
                          p.date === periodDate &&
                          (p.status === 'present' || p.status === 'late')
                      ).length
                    }{' '}
                    / {periodStudentIds.length} คน
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT VIEW vs STAFF VIEW */}
      {isRestrictedViewer ? (
        <div className="space-y-4">
          <div
            className={`saas-card transition ${
              selectedPeriodTimeActivity.isActive
                ? 'border-rose-500 ring-2 ring-rose-500/35 bg-rose-50/40 dark:bg-rose-950/25'
                : ''
            }`}
          >
            <div className="saas-card-header">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={selectedStudent?.avatarUrl}
                  alt={selectedStudent?.firstNameTh}
                  className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0">
                  <p className="type-card-title truncate">
                    {selectedStudent?.firstNameTh} {selectedStudent?.lastNameTh}
                  </p>
                  <p className="type-meta font-mono">
                    {selectedStudent?.studentIdNumber} · {selectedStudent?.room}
                  </p>
                </div>
              </div>
              <div className="seg-tab-group">
                <button
                  type="button"
                  data-active={periodCheckType === 'check_in'}
                  onClick={() => setPeriodCheckType('check_in')}
                  className="seg-tab-btn flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าเรียน</span>
                </button>
                <button
                  type="button"
                  data-active={periodCheckType === 'check_out'}
                  onClick={() => setPeriodCheckType('check_out')}
                  className="seg-tab-btn flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกคาบ</span>
                </button>
              </div>
            </div>

            <div className="saas-card-body space-y-3">
              {selectedPeriodTimeActivity.isActive && (
                <div className="p-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-between gap-2 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      ถึงเวลาคาบเรียนที่ {selectedPeriod} ({selectedPeriodMeta?.time})
                    </span>
                  </span>
                  {selectedPeriodTimeActivity.remainingMinutes !== null && (
                    <span>เหลือ {selectedPeriodTimeActivity.remainingMinutes} น.</span>
                  )}
                </div>
              )}

              {/* Student Classroom GPS Status Strip */}
              {(() => {
                const roomCheck =
                  classroomGps && realGpsCoords ? checkDistanceToClassroomGps(realGpsCoords, classroomGps) : null;
                return (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                      !classroomGps
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : roomCheck?.inRange
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">
                        {!classroomGps
                          ? `ยังไม่ได้ตั้งพิกัดห้องเรียน (${selectedCourse.room || selectedCourse.code}) กรุณาแจ้งครูผู้สอน`
                          : !realGpsCoords
                            ? `ห้อง ${classroomGps.roomLabel} (รัศมี ${classroomGps.radiusMeters} ม.) · รออ่านพิกัด GPS ของคุณ`
                            : roomCheck?.inRange
                              ? `อยู่ในพิกัดห้อง ${classroomGps.roomLabel} (ห่าง ${roomCheck.distanceMeters ?? 0} ม. / รัศมี ${roomCheck.radiusMeters} ม.)`
                              : `อยู่นอกพิกัดห้อง ${classroomGps.roomLabel} (ห่าง ${(roomCheck?.distanceMeters ?? 0).toLocaleString()} ม. / รัศมี ${roomCheck?.radiusMeters} ม.)`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        setIsGpsLoading(true);
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setRealGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setIsGpsLoading(false);
                          },
                          () => setIsGpsLoading(false),
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                      }}
                      className="px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-current/20 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <LocateFixed className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
                      <span>อัปเดต GPS</span>
                    </button>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleStudentSelfPeriodCheckin()}
                  className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                    selectedPeriodTimeActivity.isActive
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : periodCheckType === 'check_in'
                        ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
                        : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {periodCheckType === 'check_in' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  <span>
                    {periodCheckType === 'check_in'
                      ? `ยืนยันเข้าคาบ ${selectedCourse.code} (คาบ ${selectedPeriod})`
                      : `ยืนยันออกคาบ ${selectedCourse.code} (คาบ ${selectedPeriod})`}
                  </span>
                </button>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
                <label className="type-label block">หรือกรอกลิงก์/รหัส QR จากครูผู้สอน (ไม่บังคับ)</label>
                <div className="relative flex-1">
                  <ScanLine className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={studentPeriodCodeInput}
                    onChange={(e) => setStudentPeriodCodeInput(e.target.value)}
                    placeholder={`วางลิงก์หรือรหัสคาบ เช่น ${expectedPeriodCode}`}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border)] text-[11px]">
                <span className="text-[var(--color-text-muted)] font-medium">
                  {periodFlexConfig.graceMinutes >= 999
                    ? 'วิชานี้เปิดเช็คชื่อเข้า-ออกแบบยืดหยุ่นตลอดคาบ'
                    : `เกณฑ์ยืดหยุ่นวิชานี้: ผ่อนผันเข้าเรียน ${periodFlexConfig.graceMinutes} นาที`}
                </span>
                {onOpenPeriodCorrection && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPeriodCorrection({
                        targetScope: periodCheckType === 'check_out' ? 'period_checkout' : 'period_checkin',
                        issueType: periodCheckType === 'check_out' ? 'forgot_checkout' : 'late_arrival',
                      })
                    }
                    className="font-bold text-[var(--color-primary-text)] hover:underline underline-offset-4 cursor-pointer"
                  >
                    เข้าช้า / ลืมสแกน? ขอแก้ไขเวลาคาบนี้ →
                  </button>
                )}
              </div>

              {studentPeriodCheckinMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                  <span>{studentPeriodCheckinMsg}</span>
                </div>
              )}

              {studentPeriodCheckinError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 type-meta font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0" />
                  <span>{studentPeriodCheckinError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Only this student's own period check-in history */}
          <div className="saas-card">
            <div className="saas-card-header">
              <h4 className="type-card-title">ประวัติเช็คชื่อรายคาบ ({scopedPeriodAttendance.length})</h4>
            </div>
            <div className="saas-card-body">
              {scopedPeriodAttendance.length === 0 ? (
                <p className="type-meta text-center py-4">ยังไม่มีบันทึกเช็คชื่อรายคาบของคุณ</p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  <PagedList
                    items={scopedPeriodAttendance}
                    pageSize={4}
                    renderItem={(rec) => (
                      <div key={rec.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="type-card-title truncate">
                            {rec.courseCode} · คาบที่ {rec.periodNumber}
                          </p>
                          <p className="type-meta truncate">
                            {rec.date} ({rec.timeSlot}) · {rec.checkMethod === 'qr_code' ? 'QR/ลิงก์' : 'อาจารย์เช็คชื่อ'}
                          </p>
                        </div>
                        <StatusBadge
                          size="xs"
                          status={
                            rec.status === 'present'
                              ? 'complete'
                              : rec.status === 'late'
                                ? 'pending'
                                : rec.status === 'excused'
                                  ? 'info'
                                  : 'delayed'
                          }
                          label={
                            rec.status === 'present'
                              ? 'เข้าเรียน'
                              : rec.status === 'late'
                                ? 'สาย'
                                : rec.status === 'excused'
                                  ? 'ลา'
                                  : 'ขาด'
                          }
                        />
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : periodStudentIds.length === 0 ? (
        <div className="saas-card p-6 text-center type-meta">
          {isTeacher ? 'ไม่พบรายชื่อนักเรียนในวิชาที่คุณสอน' : 'ยังไม่มีรายชื่อนักเรียนในโรงเรียนนี้'}
        </div>
      ) : (
        <div className="saas-card overflow-hidden">
          {(() => {
            const recordByStudent = new Map<string, PeriodAttendanceRecord>();
            for (const p of periodAttendance) {
              if (
                p.courseId === selectedCourse.id &&
                p.date === periodDate &&
                p.periodNumber === selectedPeriod &&
                (p.recordType || 'check_in') === periodCheckType
              ) {
                recordByStudent.set(p.studentId, p);
              }
            }
            const uncheckedCount = periodStudentIds.filter((id) => !recordByStudent.has(id)).length;
            const proxyCount = periodStudentIds.filter((id) => recordByStudent.get(id)?.checkMethod === 'teacher_proxy').length;
            const mobileCount = periodStudentIds.filter((id) => recordByStudent.get(id)?.checkMethod === 'qr_code').length;
            const q = periodRosterSearch.trim().toLowerCase();
            const filteredIds = periodStudentIds.filter((stuId) => {
              const st = students.find((s) => s.id === stuId);
              if (!st) return false;
              const rec = recordByStudent.get(stuId);
              if (periodRosterFilter === 'unchecked' && rec) return false;
              if (periodRosterFilter === 'proxy' && rec?.checkMethod !== 'teacher_proxy') return false;
              if (periodRosterFilter === 'mobile' && rec?.checkMethod !== 'qr_code') return false;
              if (periodRosterRoomFilter !== 'all' && `${st.gradeLevel} ${st.room}`.trim() !== periodRosterRoomFilter) return false;
              if (!q) return true;
              return (
                `${st.firstNameTh} ${st.lastNameTh}`.toLowerCase().includes(q) ||
                (st.studentIdNumber || '').toLowerCase().includes(q) ||
                (st.room || '').toLowerCase().includes(q)
              );
            });

            return (
              <>
                <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold tabular-nums">
                      <span className="font-bold text-[var(--color-text-title)]">
                        รายชื่อในคาบ ({periodStudentIds.length})
                      </span>
                      <span className="text-[var(--color-text-muted)]">รอเช็ค {uncheckedCount}</span>
                      <span className="text-[var(--color-primary-text)]">รับแทน {proxyCount}</span>
                      <span className="text-emerald-700 dark:text-emerald-300">สแกน QR {mobileCount}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-2.5" />
                      <input
                        type="search"
                        value={periodRosterSearch}
                        onChange={(e) => setPeriodRosterSearch(e.target.value)}
                        placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                        aria-label="ค้นหานักเรียนในรายวิชา"
                        className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                      />
                    </div>
                    <select
                      aria-label="กรองตามสถานะเช็คชื่อ"
                      value={periodRosterFilter}
                      onChange={(e) => setPeriodRosterFilter(e.target.value as PeriodRosterFilter)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกสถานะ ({periodStudentIds.length})</option>
                      <option value="unchecked">ยังไม่เช็ค ({uncheckedCount})</option>
                      <option value="proxy">ครูรับแทน ({proxyCount})</option>
                      <option value="mobile">สแกนมือถือ ({mobileCount})</option>
                    </select>
                    <select
                      aria-label="กรองตามห้องเรียนในรายวิชา"
                      value={periodRosterRoomFilter}
                      onChange={(e) => setPeriodRosterRoomFilter(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกห้องในรายวิชา</option>
                      {periodRoomOptions.map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-[var(--color-border)]">
                  <PagedList
                    items={filteredIds}
                    pageSize={10}
                    navClassName="px-3 pb-3 pt-2.5"
                    emptyState={<p className="type-meta text-center py-4">ไม่พบรายชื่อนักเรียนตามตัวกรอง</p>}
                    renderItem={(stuId) => {
                      const st = students.find((s) => s.id === stuId);
                      if (!st) return null;
                      const savedRecord = recordByStudent.get(stuId);
                      const status = periodStatuses[st.id] || savedRecord?.status || 'present';
                      const recordedStatus = periodStatuses[st.id] || savedRecord?.status;
                      const customTime = periodCustomTimes[st.id] || {};
                      const isEditingTime = editingTimeStudentId === st.id;
                      const displayIn = customTime.checkIn || savedRecord?.actualCheckInTime;
                      const displayOut = customTime.checkOut || savedRecord?.actualCheckOutTime;

                      return (
                        <div key={st.id} className="px-3 py-3 space-y-2 hover:bg-[var(--color-card-subtle)]/50 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <img
                                src={st.avatarUrl}
                                alt={`${st.firstNameTh} ${st.lastNameTh}`}
                                className="w-10 h-10 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="text-sm sm:text-[15px] font-bold text-[var(--color-text-title)] leading-snug break-words">
                                    {st.firstNameTh} {st.lastNameTh}
                                  </span>
                                  <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0">
                                    {st.studentIdNumber} · {st.gradeLevel} {st.room}
                                  </span>
                                </div>

                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px]">
                                  {savedRecord?.checkMethod === 'qr_code' && (
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                                      <Smartphone className="w-3 h-3 shrink-0" />
                                      <span>สแกนมือถือ</span>
                                    </span>
                                  )}
                                  {savedRecord?.checkMethod === 'teacher_proxy' && (
                                    <span className="font-semibold text-[var(--color-primary-text)]">
                                      ครูรับแทน
                                    </span>
                                  )}
                                  {!recordedStatus && (
                                    <span className="text-[var(--color-text-muted)]">รอเช็คชื่อ</span>
                                  )}
                                  {(displayIn || displayOut) && (
                                    <span className="font-mono font-semibold text-[var(--color-primary-text)] tabular-nums">
                                      {displayIn ? `เข้า ${displayIn}` : ''}
                                      {displayIn && displayOut ? ' · ' : ''}
                                      {displayOut ? `ออก ${displayOut}` : ''}
                                    </span>
                                  )}
                                  {savedRecord?.flexReason && (
                                    <span className="text-[var(--color-text-muted)]">· {savedRecord.flexReason}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 shrink-0 pl-12 sm:pl-0">
                              <div
                                role="group"
                                aria-label={`สถานะคาบ ${st.firstNameTh} ${st.lastNameTh}`}
                                className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 gap-0.5"
                              >
                                {(
                                  [
                                    { id: 'present', label: 'มา', fullLabel: 'มาเรียน' },
                                    { id: 'late', label: 'สาย', fullLabel: 'มาสาย' },
                                    { id: 'excused', label: 'ลา', fullLabel: 'ลา / มีเหตุผล' },
                                    { id: 'absent', label: 'ขาด', fullLabel: 'ขาดเรียน' },
                                  ] as const
                                ).map((opt) => {
                                  const isActive = recordedStatus === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleTeacherProxyPeriodCheckin(st, opt.id, false)}
                                      aria-pressed={isActive}
                                      title={opt.fullLabel}
                                      className={`min-h-[34px] min-w-[44px] sm:min-w-[50px] px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                                        isActive
                                          ? opt.id === 'present'
                                            ? 'bg-emerald-700 text-white shadow-xs'
                                            : opt.id === 'late'
                                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                                              : opt.id === 'excused'
                                                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                                                : 'bg-rose-700 text-white shadow-xs'
                                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)]'
                                      }`}
                                    >
                                      {isActive && <Check className="w-3 h-3 shrink-0" />}
                                      <span>{opt.label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <TableActionMenu
                                size="md"
                                menuWidth={230}
                                ariaLabel={`ตัวเลือกเพิ่มเติม ${st.firstNameTh} ${st.lastNameTh}`}
                                items={[
                                  ...(!savedRecord || savedRecord.checkMethod !== 'qr_code'
                                    ? [
                                        {
                                          id: 'no-phone-proxy',
                                          label: 'กดเช็คแทน (ไม่มีมือถือ)',
                                          icon: <UserCheck className="w-3.5 h-3.5" />,
                                          variant: 'primary' as const,
                                          onClick: () => handleTeacherProxyPeriodCheckin(st, 'present', true),
                                        },
                                      ]
                                    : []),
                                  {
                                    id: 'edit-time',
                                    label: isEditingTime ? 'ปิดการปรับเวลาเข้า–ออก' : 'ปรับเวลาเข้า–ออก',
                                    icon: <Clock className="w-3.5 h-3.5" />,
                                    dividerBefore: Boolean(!savedRecord || savedRecord.checkMethod !== 'qr_code'),
                                    onClick: () => setEditingTimeStudentId(isEditingTime ? null : st.id),
                                  },
                                ]}
                              />
                            </div>
                          </div>

                          {isEditingTime && (
                            <div className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-end">
                              <div>
                                <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">เวลาเข้าจริง</label>
                                <input
                                  type="time"
                                  value={displayIn || ''}
                                  onChange={(e) =>
                                    onSetStudentPeriodCustomTime(st.id, { checkIn: e.target.value })
                                  }
                                  className="w-full mt-0.5 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono tabular-nums"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">เวลาออกจริง</label>
                                <input
                                  type="time"
                                  value={displayOut || ''}
                                  onChange={(e) =>
                                    onSetStudentPeriodCustomTime(st.id, { checkOut: e.target.value })
                                  }
                                  className="w-full mt-0.5 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono tabular-nums"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">หมายเหตุเวลา</label>
                                <input
                                  type="text"
                                  placeholder="เช่น เข้าช้าทำกิจกรรม / ออกไปห้องพยาบาล"
                                  value={customTime.reason ?? savedRecord?.flexReason ?? ''}
                                  onChange={(e) =>
                                    onSetStudentPeriodCustomTime(st.id, { reason: e.target.value })
                                  }
                                  className="w-full mt-0.5 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleTeacherProxyPeriodCheckin(st, status, false);
                                  setEditingTimeStudentId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] cursor-pointer"
                              >
                                บันทึกเวลาคนนี้
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Fullscreen QR Code Modal for classroom display */}
      {!isRestrictedViewer && showPeriodQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 border border-[var(--color-border)] shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-primary-text)]">QR Code เช็คชื่อเข้าคาบเรียน</span>
              <button
                type="button"
                onClick={() => setShowPeriodQrModal(false)}
                className="p-1.5 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] cursor-pointer"
                aria-label="ปิดหน้าต่าง QR"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <QrCodeMatrix
                value={periodCheckinUrl}
                size={240}
                label={`QR Code ${selectedCourse.code} คาบที่ ${selectedPeriod}`}
              />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-[var(--color-text-title)] text-sm">
                {selectedCourse.code} {selectedCourse.titleTh}
              </p>
              <p className="text-[var(--color-text-muted)]">
                คาบที่ {selectedPeriod} • วันที่ {periodDate}
              </p>
              <p className="font-mono font-bold text-[var(--color-primary-text)]">รหัสคาบ: {expectedPeriodCode}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyPeriodLink}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {periodQrCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{periodQrCopied ? 'คัดลอกลิงก์เช็คชื่อแล้ว ✓' : 'คัดลอกลิงก์ส่งให้นักเรียน'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
