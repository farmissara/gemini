import React, { useState } from 'react';
import AttendancePhoto from '../components/AttendancePhoto';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Student, 
  AttendanceRecord, 
  GradeRecord, 
  Course, 
  AppLanguage, 
  SystemConfig,
  LeaveRequest,
  LeaveType,
  PeriodAttendanceRecord,
  HomeworkSubmission,
  InfirmaryVisit,
  ConsentForm,
  ConsentResponse
} from '../types';
import { 
  UserCheck, 
  Clock, 
  Award, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  Phone,
  Download,
  Camera,
  MapPin,
  Eye,
  X,
  FileText,
  Send,
  Upload,
  Check,
  ChevronRight,
  LogIn,
  LogOut,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { PagedList } from '../components/PagedList';
import {
  CAMPUS_DATA_UPDATED_EVENT,
  getConsentForms,
  getConsentResponses,
  upsertConsentResponse,
} from '../lib/campusDataStore';
import { calculateStudentAcademicSummary, getRawScoreFeedback } from '../lib/moeGrading';
import { getStoredGradeAlerts } from '../lib/gradeNotifications';
import { getModuleTone } from '../lib/moduleTheme';
import { isSchoolPolicyEnabled, SchoolPolicyId } from '../lib/schoolPermissions';
import { getSharedCareerSnapshotForStudent, loadSchoolSharedCareerQuests } from '../lib/careerQuestStore';
import { POPULAR_CAREERS } from '../data/careerQuestData';
import type { StudentCareerQuestState } from '../types';

interface ParentPortalViewProps {
  schoolId?: string;
  students: Student[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  courses: Course[];
  systemConfig: SystemConfig;
  leaveRequests?: LeaveRequest[];
  periodAttendance?: PeriodAttendanceRecord[];
  homeworkSubmissions?: HomeworkSubmission[];
  infirmaryVisits?: InfirmaryVisit[];
  lang: AppLanguage;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  onOpenReportCard: (student: Student) => void;
  onAddLeaveRequest?: (req: LeaveRequest) => void;
  onLoadAttendanceRange?: (startDate?: string | null, endDate?: string | null, studentId?: string) => Promise<void> | void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  schoolId = 'default-school',
  students,
  attendance,
  grades,
  courses: _courses,
  systemConfig,
  leaveRequests = [],
  periodAttendance = [],
  homeworkSubmissions = [],
  infirmaryVisits = [],
  lang,
  schoolPermissions,
  onOpenReportCard,
  onAddLeaveRequest,
  onLoadAttendanceRange,
}) => {
  const canSeeRealtimeAttendance = isSchoolPolicyEnabled(schoolPermissions, 'parent_realtime_attendance');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [activePortalTab, setActivePortalTab] = useState<'overview' | 'selfie_album' | 'leave_submission' | 'consent_slips'>('overview');
  const [childCareerSnapshot, setChildCareerSnapshot] = useState<StudentCareerQuestState | null>(null);
  const [consentForms, setConsentForms] = useState<ConsentForm[]>(() => getConsentForms(schoolId));
  const [consentResponses, setConsentResponses] = useState<ConsentResponse[]>(() => getConsentResponses(schoolId));

  React.useEffect(() => {
    setConsentForms(getConsentForms(schoolId));
    setConsentResponses(getConsentResponses(schoolId));
    const onUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent<{ schoolId?: string }>).detail;
      if (!detail?.schoolId || detail.schoolId === schoolId) {
        setConsentForms(getConsentForms(schoolId));
        setConsentResponses(getConsentResponses(schoolId));
      }
    };
    window.addEventListener(CAMPUS_DATA_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CAMPUS_DATA_UPDATED_EVENT, onUpdated);
  }, [schoolId]);

  // Date selection for child's selfie album
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 2 * 86400000));
  const [albumSelectedDate, setAlbumSelectedDate] = useState<string>(todayStr);
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<AttendanceRecord | null>(null);

  // Leave submission state
  const [leaveType, setLeaveType] = useState<LeaveType>('sick');
  const [leaveStartDate, setLeaveStartDate] = useState(getLocalDateString());
  const [leaveEndDate, setLeaveEndDate] = useState(getLocalDateString());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachmentUrl, setLeaveAttachmentUrl] = useState('');
  const [leaveSuccessNotice, setLeaveSuccessNotice] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  React.useEffect(() => {
    if (onLoadAttendanceRange && albumSelectedDate) {
      void onLoadAttendanceRange(albumSelectedDate, albumSelectedDate, student?.id);
    }
  }, [albumSelectedDate, onLoadAttendanceRange, student?.id]);
  const studentAttendance = attendance.filter((a) => a.studentId === student?.id);
  const studentGrades = grades.filter((g) => g.studentId === student?.id);
  const studentLeaveRequests = leaveRequests.filter((r) => r.userId === student?.id);
  const studentPeriodAttendance = periodAttendance.filter((p) => p.studentId === student?.id);
  const studentHomework = homeworkSubmissions.filter((h) => h.studentId === student?.id);
  const studentInfirmary = infirmaryVisits.filter((v) => v.studentId === student?.id);

  const todayRecord = studentAttendance.find((a) => a.date === todayStr);

  // Build chronological Daily Pulse timeline events for selected child
  const dailyPulseEvents = React.useMemo(() => {
    const events: { id: string; timeLabel: string; title: string; detail: string; category: 'gate' | 'class' | 'homework' | 'health'; onClick?: () => void }[] = [];
    studentAttendance.slice(0, 4).forEach((rec) => {
      events.push({
        id: `att-${rec.id}`,
        timeLabel: `${rec.date} ${rec.time}`,
        title: rec.recordType === 'check_out' ? 'สแกนออกประตูโรงเรียน' : 'เข้าประตูโรงเรียน',
        detail: `${rec.status === 'present' ? 'ตรงเวลา' : rec.status === 'late' ? 'มาสาย' : rec.status} • ${rec.location?.geofenceZoneName || 'ประตูโรงเรียน'}`,
        category: 'gate',
        onClick: rec.photoUrl ? () => setSelectedZoomPhoto(rec) : undefined,
      });
    });
    studentPeriodAttendance.slice(0, 4).forEach((p) => {
      events.push({
        id: `per-${p.id}`,
        timeLabel: `${p.date} คาบ ${p.periodNumber}`,
        title: `เข้าเรียนวิชา ${p.courseCode}`,
        detail: `สถานะ: ${p.status} • บันทึกโดย ${p.verifiedByTeacherName}`,
        category: 'class',
      });
    });
    studentHomework.slice(0, 3).forEach((hw) => {
      events.push({
        id: `hw-${hw.id}`,
        timeLabel: hw.submittedAt || hw.dueDate,
        title: `การบ้าน: ${hw.assignmentTitle}`,
        detail: hw.status === 'graded' ? `ตรวจแล้ว (${hw.score ?? '-'}/${hw.maxScore})` : `สถานะ: ${hw.status}`,
        category: 'homework',
      });
    });
    studentInfirmary.slice(0, 3).forEach((v) => {
      events.push({
        id: `inf-${v.id}`,
        timeLabel: `${v.visitDate} ${v.visitTime}`,
        title: `เข้าห้องพยาบาล: ${v.symptoms}`,
        detail: `${v.treatment} (อุณหภูมิ ${v.temperature}°C)`,
        category: 'health',
      });
    });
    const storedGradeAlerts = getStoredGradeAlerts(schoolId, student?.id);
    storedGradeAlerts.slice(0, 4).forEach((alert) => {
      events.push({
        id: alert.id,
        timeLabel: alert.timestamp.slice(0, 16).replace('T', ' '),
        title: alert.title.replace(/^📊\s*/, ''),
        detail: alert.body,
        category: 'homework',
      });
    });
    return events.sort((a, b) => b.timeLabel.localeCompare(a.timeLabel)).slice(0, 8);
  }, [schoolId, student?.id, studentAttendance, studentPeriodAttendance, studentHomework, studentInfirmary]);

  // Filter attendance for the selected date in child's selfie album
  const dateRecords = studentAttendance.filter((a) => a.date === albumSelectedDate);

  React.useEffect(() => {
    if (!selectedStudentId) {
      setChildCareerSnapshot(null);
      return;
    }
    const localSnap = getSharedCareerSnapshotForStudent(schoolId, selectedStudentId);
    if (localSnap) {
      setChildCareerSnapshot(localSnap);
      return;
    }
    let active = true;
    loadSchoolSharedCareerQuests(schoolId)
      .then((rows) => {
        if (!active) return;
        const found = rows.find((r) => r.studentId === selectedStudentId || r.userId === selectedStudentId) || null;
        setChildCareerSnapshot(found);
      })
      .catch((err) => {
        console.warn('[ParentPortal] Could not load child CareerQuest snapshot:', err);
      });
    return () => {
      active = false;
    };
  }, [schoolId, selectedStudentId]);

  // Overall attendance statistics for child
  const totalAttended = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const lateCount = studentAttendance.filter(a => a.status === 'late').length;
  const attRate = totalAttended > 0 ? Math.round((presentCount / totalAttended) * 100) : 100;

  // Handle parent submitting leave for child
  const handleParentSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !leaveReason.trim()) {
      setLeaveError('กรุณาระบุเหตุผลการลาให้ครบถ้วน');
      return;
    }
    setLeaveError(null);

    const newLeave: LeaveRequest = {
      id: `leave-parent-${Date.now()}`,
      userId: student.id,
      userName: `${student.firstNameTh} ${student.lastNameTh}`,
      userRole: 'student',
      gradeLevelOrDepartment: `${student.gradeLevel} ${student.room}`,
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: `(ผู้ปกครองแจ้งลา: ${student.guardianName}) ${leaveReason}`,
      attachmentUrl: leaveAttachmentUrl || undefined,
      status: 'pending',
      createdAt: `${getLocalDateString()} ${new Date().toLocaleTimeString('th-TH')}`
    };

    if (onAddLeaveRequest) {
      onAddLeaveRequest(newLeave);
    }

    setLeaveSuccessNotice(`ส่งใบ${leaveType === 'sick' ? 'ลาป่วย' : 'ลากิจ'}ให้ ${student.firstNameTh} เรียบร้อยแล้ว`);
    setLeaveReason('');
    setLeaveAttachmentUrl('');
    setTimeout(() => setLeaveSuccessNotice(null), 5000);
  };

  if (students.length === 0 || !student) {
    return (
      <div className={`${getModuleTone('students')} max-w-2xl mx-auto w-full py-10`}>
        <div className="app-page-header p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl tone-chip mx-auto flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text-title)]">
            {lang === 'th'
              ? 'ยังไม่มีข้อมูลนักเรียนที่ผูกกับบัญชีผู้ปกครองนี้'
              : 'No student record is linked to this parent account yet'}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-md mx-auto">
            {lang === 'th'
              ? 'เพื่อความเป็นส่วนตัวของข้อมูลนักเรียน ระบบจะแสดงผลเฉพาะบุตรหลานที่ผูกอีเมลผู้ปกครองไว้ในทะเบียนนักเรียนเท่านั้น กรุณาติดต่อฝ่ายทะเบียนโรงเรียนเพื่อเชื่อมโยงข้อมูล'
              : 'For student privacy, only students linked to your guardian email are displayed. Please contact the school registrar.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getModuleTone('students')} space-y-4 max-w-5xl mx-auto w-full`}>
      {/* Student Switcher & Guardian Profile Card */}
      <div className="app-page-header shrink-0 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={student?.avatarUrl}
            alt={student?.firstNameEn}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-[var(--color-border)] ring-1 ring-indigo-500/15 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-title)] truncate">
                {lang === 'th'
                  ? `${student?.firstNameTh} ${student?.lastNameTh}`
                  : `${student?.firstNameEn} ${student?.lastNameEn}`}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-indigo-700 dark:text-indigo-300 font-semibold tabular-nums shrink-0">
                {student?.studentIdNumber}
              </span>
            </div>
            <p className="text-xs font-medium text-[var(--color-text-body)] mt-0.5">
              {student?.gradeLevel} · {student?.room}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate tabular-nums">
              {lang === 'th' ? 'ผู้ปกครอง:' : 'Guardian:'} {student?.guardianName} ({student?.guardianRelation}) · {student?.guardianPhone}
            </p>
          </div>
        </div>

        {/* Student selector */}
        <div data-guide-id="parent-student-switcher" className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
          <ModuleTourTrigger moduleId="parent_portal" lang={lang} />
          <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
            {lang === 'th' ? 'เลือกลูก/นักเรียนในการดูแล:' : 'Select Student:'}
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstNameTh} ({s.studentIdNumber}) - {s.gradeLevel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs in Parent Portal */}
      <div data-guide-id="parent-portal-tabs" className="seg-tab-group shrink-0 overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setActivePortalTab('overview')}
          data-active={activePortalTab === 'overview'}
          className="seg-tab-btn px-3.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>ภาพรวม &amp; บัตรนักเรียน</span>
        </button>

        {canSeeRealtimeAttendance && (
          <button
            type="button"
            onClick={() => setActivePortalTab('selfie_album')}
            data-active={activePortalTab === 'selfie_album'}
            className="seg-tab-btn px-3.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>อัลบั้มภาพถ่ายเข้า-ออก ({studentAttendance.filter(a => !!a.photoUrl).length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActivePortalTab('leave_submission')}
          data-active={activePortalTab === 'leave_submission'}
          className="seg-tab-btn px-3.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>ยื่นใบลาให้ลูก{studentLeaveRequests.length > 0 ? ` (${studentLeaveRequests.length})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePortalTab('consent_slips')}
          data-active={activePortalTab === 'consent_slips'}
          className="seg-tab-btn px-3.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>หนังสือขออนุญาต ({consentForms.length})</span>
        </button>
      </div>

      {/* Scrollable Tab Body */}
      <div className="space-y-3">
      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TODAY'S GATE STATUS */}
      {/* ========================================================================= */}
      {activePortalTab === 'overview' && (
        <div className="space-y-4">
          {/* Today's Gate Status Banner (LINE Connected - Executive Bento Strip) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-text-title)] tabular-nums">
                    สถานะการเดินทางถึงโรงเรียนวันนี้ ({todayStr})
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                    todayRecord ? 'text-teal-700 dark:text-teal-400' : 'text-[var(--color-text-muted)]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${todayRecord ? 'bg-teal-500' : 'bg-slate-400'}`} />
                    <span>{todayRecord ? 'เช็คชื่อแล้ว' : 'รอการเช็คชื่อ'}</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-body)] mt-1 tabular-nums">
                  {!canSeeRealtimeAttendance ? (
                    'โรงเรียนปิดการแจ้งเตือนเวลาเข้า-ออกประตูแบบเรียลไทม์ชั่วคราว'
                  ) : todayRecord ? (
                    <>
                      เข้าประตูเวลา <strong className="text-[var(--color-text-title)] font-mono font-semibold">{todayRecord.time} น.</strong> · สถานะ:{' '}
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">{todayRecord.status === 'present' ? 'ตรงเวลา' : 'มาสาย'}</span>
                      {todayRecord.location?.distanceMeters && ` · ในเขต ${todayRecord.location.distanceMeters} ม.`}
                    </>
                  ) : (
                    'ยังไม่มีข้อมูลการสแกนผ่านประตูหรือถ่ายรูปเช็คชื่อในเช้าวันนี้'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Grid: Digital Student ID & Tuition / Academic Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Digital Student Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/25 space-y-4 text-white relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                    {systemConfig.schoolNameEn}
                  </p>
                  <h3 className="text-xs font-semibold text-slate-200 font-thai">
                    {systemConfig.schoolNameTh}
                  </h3>
                </div>
                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/15">
                  STUDENT PASS
                </span>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={student?.avatarUrl}
                  alt={student?.firstNameEn}
                  className="w-20 h-24 rounded-xl object-cover border border-white/20"
                />
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white">
                    {student?.firstNameTh} {student?.lastNameTh}
                  </h4>
                  <p className="text-xs text-indigo-200">
                    {student?.firstNameEn} {student?.lastNameEn}
                  </p>
                  <p className="text-[11px] font-mono text-slate-300 tabular-nums">
                    ID: {student?.studentIdNumber}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    ชั้น: {student?.gradeLevel} {student?.room}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300 font-mono tabular-nums">
                <span>อัตราการมาเรียน: {attRate}%</span>
                <span>ปีการศึกษา {systemConfig.academicYear}</span>
              </div>
            </div>

            {/* Academic Overview & GPA Card */}
            <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-4 flex flex-col justify-between text-[var(--color-text-title)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>สรุปผลการเรียน &amp; ประเมินผล</span>
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>ภาคเรียนที่ {systemConfig.currentSemester}/{systemConfig.academicYear}</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  มีบันทึกผลการประเมินแล้ว {studentGrades.length} รายวิชา · บันทึกเข้าห้องเรียน {studentPeriodAttendance.length} คาบ
                </p>
              </div>

              {/* GPA / Primary Percentage & Report Card Button */}
              {(() => {
                const summary = student
                  ? calculateStudentAcademicSummary({
                      student,
                      courses: _courses,
                      grades,
                      gradingSystem: systemConfig.gradingSystem,
                      currentAcademicYear: systemConfig.academicYear,
                      currentSemester: systemConfig.currentSemester,
                    })
                  : null;
                const primaryFeedback = getRawScoreFeedback(summary?.averageRawScore);
                return (
                  <div className="pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    {summary?.hideGpaCalculations ? (
                      <div>
                        <span className="text-[11px] text-[var(--color-text-muted)] block">
                          คะแนนดิบเฉลี่ยรายปี (เต็ม 100)
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-400 tabular-nums">
                            {summary.averageRawScore !== null ? `${summary.averageRawScore}%` : 'รอประเมิน'}
                          </span>
                          {summary.averageRawScore !== null && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${primaryFeedback.badgeClass}`}>
                              {primaryFeedback.labelTh}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[11px] text-[var(--color-text-muted)] block">เกรดเฉลี่ยสะสม (GPAX)</span>
                        <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-400 tabular-nums">
                          {summary?.hasRecordedGrades && summary?.gpax !== null ? summary.gpax.toFixed(2) : '—'}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenReportCard(student)}
                      className="px-3.5 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-indigo-500/10 border border-[var(--color-border)] hover:border-indigo-500/40 text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 transition"
                    >
                      <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{summary?.hideGpaCalculations ? 'ดูผลประเมินรายปี' : 'ดูใบเกรด ปพ.1'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Child Career Quest AI Shared Goal */}
          {childCareerSnapshot && childCareerSnapshot.activeCareerId && (() => {
            const careerProfile =
              childCareerSnapshot.pinnedCareers.find((c) => c.id === childCareerSnapshot.activeCareerId) ||
              POPULAR_CAREERS.find((c) => c.id === childCareerSnapshot.activeCareerId);
            if (!careerProfile) return null;
            return (
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>อาชีพในฝันของ {student?.firstNameTh} (Career Quest AI)</span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                      {careerProfile.titleTh} ({careerProfile.titleEn})
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                      ระดับความพร้อม {childCareerSnapshot.lastReadinessLevel || 'Lv.1 นักสำรวจ'} · ภารกิจสำเร็จ {childCareerSnapshot.completedQuestIds.length} ภารกิจ
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 tabular-nums">
                  <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {childCareerSnapshot.lastReadinessPercent ?? 0}%
                  </span>
                  <span className="block text-[11px] text-[var(--color-text-muted)]">
                    ความพร้อมสู่อาชีพ
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Daily Pulse Timeline */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-title)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>ไทม์ไลน์ชีวิตประจำวันของ {student?.firstNameTh} (Daily Pulse)</span>
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)]">อัปเดตล่าสุดจากประตู คาบเรียน การบ้าน และห้องพยาบาล</span>
            </div>
            {dailyPulseEvents.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-5 text-center">ยังไม่มีความเคลื่อนไหวล่าสุดสำหรับนักเรียนคนนี้</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] text-xs">
                {dailyPulseEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={ev.onClick}
                    className={`py-2.5 flex items-center justify-between gap-3 ${ev.onClick ? 'cursor-pointer hover:bg-[var(--color-card-subtle)] rounded-lg px-2 -mx-2 transition' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--color-text-title)]">{ev.title}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{ev.detail}</div>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0 tabular-nums">{ev.timeLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHILD'S SELFIE ALBUM & DAILY CHECK-IN HISTORY */}
      {/* ========================================================================= */}
      {activePortalTab === 'selfie_album' && (
        <div className="p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-5 text-[var(--color-text-title)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Camera className="w-5 h-5 text-[var(--color-primary-text)]" />
                <span>อัลบั้มภาพถ่ายเช็คชื่อเข้า-ออกของบุตรหลาน ({student?.firstNameTh})</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                รูปถ่ายยืนยันตัวตนตอนผ่านประตูโรงเรียน พร้อมบันทึกวัน-เวลาและพิกัด GPS
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="seg-tab-group">
                <button
                  type="button"
                  onClick={() => setAlbumSelectedDate(todayStr)}
                  data-active={albumSelectedDate === todayStr}
                  className="seg-tab-btn px-3 py-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => setAlbumSelectedDate(yesterdayStr)}
                  data-active={albumSelectedDate === yesterdayStr}
                  className="seg-tab-btn px-3 py-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  เมื่อวาน
                </button>
                <button
                  type="button"
                  onClick={() => setAlbumSelectedDate(twoDaysAgoStr)}
                  data-active={albumSelectedDate === twoDaysAgoStr}
                  className="seg-tab-btn px-3 py-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  2 วันก่อน
                </button>
              </div>
              <input
                type="date"
                value={albumSelectedDate}
                onChange={(e) => e.target.value && setAlbumSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--color-border)] text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
              />
            </div>
          </div>

          {/* Date Record Cards */}
          {dateRecords.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2">
              <Camera className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--color-text-title)]">ไม่พบบันทึกภาพถ่ายในวันที่ {albumSelectedDate}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                ลองเลือกดูวันที่อื่น เช่น วันนี้ หรือเมื่อวาน
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PagedList items={dateRecords} pageSize={2} renderItem={(rec) => {
                const isCheckOut = rec.recordType === 'check_out';
                const photoSrc = rec.photoUrl || rec.userAvatar || student?.avatarUrl;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedZoomPhoto(rec)}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)]/50 transition cursor-pointer space-y-3 shadow-2xs hover:border-[var(--color-primary)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        isCheckOut ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                      }`}>
                        {isCheckOut ? 'เช็คชื่อออกโรงเรียน (Check-out)' : 'เช็คชื่อเข้าโรงเรียน (Check-in)'}
                      </span>
                      <span className="font-mono font-bold text-xs text-[var(--color-text-title)]">
                        {rec.time} น.
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-[var(--color-border)] shrink-0">
                        <AttendancePhoto src={photoSrc} fallbackSrc={student?.avatarUrl} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 hover:opacity-100 flex items-center justify-center text-white">
                          <Eye className="w-5 h-5 drop-shadow" />
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[var(--color-text-title)]">{student?.firstNameTh} {student?.lastNameTh}</p>
                        <p className="text-[11px] text-[var(--color-text-body)]">
                          จุดบันทึก: {rec.location?.geofenceZoneName || 'ประตูโรงเรียน'}
                        </p>
                        {typeof rec.location?.distanceMeters === 'number' && (
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                            GPS: {rec.location.inGeofence === false ? 'นอกรัศมี' : 'ในรัศมี'} ({rec.location.distanceMeters} เมตร)
                          </p>
                        )}
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3 shrink-0" />
                          <span>กดเพื่อดูภาพใหญ่พร้อมตราประทับ</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }} />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PARENT ONLINE LEAVE SUBMISSION */}
      {/* ========================================================================= */}
      {activePortalTab === 'leave_submission' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Leave Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-title)]">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>ผู้ปกครองส่งใบลาออนไลน์ให้บุตรหลาน</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                ส่งตรงถึงครูประจำชั้น {student?.room} พร้อมแนบใบรับรองแพทย์หรือหลักฐาน
              </p>
            </div>

            {leaveError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{leaveError}</span>
              </div>
            )}

            {leaveSuccessNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span>{leaveSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleParentSubmitLeave} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <span className="text-[11px] text-[var(--color-text-muted)]">นักเรียนที่ลา:</span>
                <p className="font-bold text-[var(--color-text-title)]">{student?.firstNameTh} {student?.lastNameTh} ({student?.room})</p>
                <span className="text-[10px] text-[var(--color-text-body)]">ผู้ปกครองผู้ยื่น: {student?.guardianName}</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--color-text-title)]">ประเภทการลา:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('sick')}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                      leaveType === 'sick' ? 'bg-rose-500/10 dark:bg-rose-950/60 border-rose-500/50 text-rose-800 dark:text-rose-200' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)] hover:border-indigo-400/50'
                    }`}
                  >
                    ลาป่วย (Sick Leave)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('personal')}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                      leaveType === 'personal' ? 'bg-indigo-500/10 dark:bg-indigo-950/60 border-indigo-500/50 text-indigo-800 dark:text-indigo-200' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)] hover:border-indigo-400/50'
                    }`}
                  >
                    ลากิจ (Personal Leave)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-title)]">ตั้งแต่วันที่:</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-title)]">ถึงวันที่:</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-title)]">เหตุผลประกอบการลา:</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="เช่น ป่วยเป็นไข้หวัด แพทย์สั่งให้พักรักษาตัว หรือ มีธุระจำเป็นกับครอบครัว..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[var(--color-text-title)]">แนบรูปใบรับรองแพทย์ / รูปถ่ายหลักฐาน:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveAttachmentUrl('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500')}
                    className="px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แนบรูปใบรับรองแพทย์ตัวอย่าง</span>
                  </button>
                  {leaveAttachmentUrl && (
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>แนบเรียบร้อย</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn-action-primary w-full py-3 text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>ส่งใบลาให้ครูประจำชั้น</span>
              </button>
            </form>
          </div>

          {/* Leave History for this child */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4 text-[var(--color-text-title)]">
            <h4 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>ประวัติการลาของ {student?.firstNameTh}</span>
            </h4>

            {studentLeaveRequests.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">ไม่มีประวัติการขอยื่นใบลาในภาคเรียนนี้</p>
            ) : (
              <div className="space-y-3">
                {studentLeaveRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-text-title)]">
                        {req.leaveType === 'sick' ? 'ลาป่วย (Sick Leave)' : 'ลากิจ (Personal Leave)'}
                      </span>
                      <StatusBadge
                        size="xs"
                        status={req.status === 'approved' ? 'complete' : req.status === 'pending' ? 'pending' : 'delayed'}
                        label={req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'pending' ? 'รอครูอนุมัติ' : 'ไม่อนุมัติ'}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-body)]">
                      ช่วงวันที่: {req.startDate} ถึง {req.endDate}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-body)] bg-[var(--color-card)] p-2 rounded-lg border border-[var(--color-border)]">
                      "{req.reason}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIGITAL PERMISSION SLIPS (CONSENT) */}
      {activePortalTab === 'consent_slips' && student && (
        <div className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-4 text-[var(--color-text-title)]">
          <div>
            <h3 className="text-base font-bold">หนังสือขออนุญาตผู้ปกครอง (Digital Permission Slips)</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              ยืนยันการอนุญาตเข้าร่วมกิจกรรม/ทัศนศึกษา/ฉีดวัคซีน สำหรับ {student.firstNameTh} {student.lastNameTh} ({student.room})
            </p>
          </div>
          <div className="space-y-3">
            {consentForms
              .filter((f) => f.targetRoom === 'all' || f.targetRoom === student.room)
              .map((form) => {
                const existingResp = consentResponses.find(
                  (r) => r.formId === form.id && r.studentId === student.id
                );
                return (
                  <div key={form.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-[var(--color-text-title)]">{form.titleTh}</h4>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        วันกิจกรรม: {form.eventDate} • ตอบกลับภายใน: {form.dueDate}
                      </span>
                    </div>
                    <p className="text-[var(--color-text-body)] leading-relaxed">{form.descriptionTh}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        ผู้ประกาศ: {form.createdBy}
                      </span>
                      {existingResp ? (
                        <StatusBadge
                          size="xs"
                          status={existingResp.decision === 'approved' ? 'complete' : 'delayed'}
                          label={`${existingResp.decision === 'approved' ? 'ยินยอมแล้ว' : 'ไม่ยินยอม'} โดย ${existingResp.parentName} (${new Date(existingResp.respondedAt).toLocaleDateString('th-TH')})`}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = upsertConsentResponse(schoolId, {
                                formId: form.id,
                                studentId: student.id,
                                studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                decision: 'declined',
                                parentName: student.guardianName,
                              });
                              setConsentResponses(next);
                            }}
                            className="btn-action-danger px-3 py-1.5 text-xs whitespace-nowrap cursor-pointer"
                          >
                            ไม่ยินยอม
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = upsertConsentResponse(schoolId, {
                                formId: form.id,
                                studentId: student.id,
                                studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                decision: 'approved',
                                parentName: student.guardianName,
                              });
                              setConsentResponses(next);
                            }}
                            className="btn-action-success px-3.5 py-1.5 text-xs whitespace-nowrap cursor-pointer"
                          >
                            ลงชื่อยินยอม
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      </div>

      {/* Lightbox Modal for Zooming Child's Selfie Photo */}
      {selectedZoomPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-[var(--color-text-title)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--color-text-title)]">รูปถ่ายเช็คชื่อตอนผ่านประตู</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedZoomPhoto.date} • {selectedZoomPhoto.time} น.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoomPhoto(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-4/3 max-h-72 mx-auto border border-[var(--color-border)] bg-slate-950 flex items-center justify-center">
              <AttendancePhoto
                src={selectedZoomPhoto.photoUrl || selectedZoomPhoto.userAvatar || student?.avatarUrl}
                alt="Selfie Zoom"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/80 backdrop-blur-md text-white text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>{student?.firstNameTh} {student?.lastNameTh}</span>
                  <span>{selectedZoomPhoto.time} น.</span>
                </div>
                <div className="text-slate-200 text-[9px]">
                  {selectedZoomPhoto.location?.geofenceZoneName || 'ประตูโรงเรียน'}
                  {typeof selectedZoomPhoto.location?.distanceMeters === 'number'
                    ? ` • ระยะห่าง ${selectedZoomPhoto.location.distanceMeters} ม.`
                    : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedZoomPhoto(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
