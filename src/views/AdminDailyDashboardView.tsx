import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileText,
  Laptop,
  MessageSquare,
  Phone,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  LeaveRequest,
  LeaveStatus,
  School,
  Student,
  TuitionInvoice,
} from '../types';
import { getLocalDateString } from '../lib/date';
import {
  approveStudentAccountInSupabase,
  listStudentAccountLinks,
  StudentAccountLink,
  updateStudentAccountStatusInSupabase,
} from '../lib/authDb';
import { MobileBottomSheet } from '../components/layout/MobileRoleWorkspace';
import type { NavTab } from '../components/layout/Sidebar';

interface AdminDailyDashboardViewProps {
  activeSchool: School;
  currentUser: AuthUser | null;
  lang: AppLanguage;
  students: Student[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  invoices: TuitionInvoice[];
  isDemoMode?: boolean;
  coordinationUnreadCount?: number;
  onRecordAttendance: (
    studentId: string,
    status: AttendanceStatus,
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: AttendanceUserType;
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userAvatar?: string;
      userDepartmentOrRoom?: string;
      date?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => void;
  onUpdateLeaveStatus: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onApproveInvoiceSlip?: (invoiceId: string) => void;
  onRejectInvoiceSlip?: (invoiceId: string, reason: string) => void;
  onOpenQuickHub?: () => void;
  onOpenCheckin?: () => void;
  onOpenExecutive?: () => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
}

type DailySection = 'attendance' | 'leaves' | 'approvals';
type AttendanceFilter = 'all' | 'present' | 'late' | 'unchecked';

export const AdminDailyDashboardView: React.FC<AdminDailyDashboardViewProps> = ({
  activeSchool,
  currentUser,
  lang,
  students,
  attendance,
  leaveRequests,
  invoices,
  isDemoMode = false,
  coordinationUnreadCount = 0,
  onRecordAttendance,
  onUpdateLeaveStatus,
  onApproveInvoiceSlip,
  onRejectInvoiceSlip,
  onOpenQuickHub,
  onOpenCheckin,
  onOpenExecutive,
  onJumpToDesktopTab,
}) => {
  const todayStr = getLocalDateString();
  const [section, setSection] = useState<DailySection>('attendance');
  const [attFilter, setAttFilter] = useState<AttendanceFilter>('all');
  const [attQuery, setAttQuery] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewSlipInvoice, setPreviewSlipInvoice] = useState<TuitionInvoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Pending new student account requests (from Supabase when connected)
  const [accountLinks, setAccountLinks] = useState<StudentAccountLink[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadAccountLinks = async () => {
    if (isDemoMode || !activeSchool.id) {
      setAccountLinks([]);
      setAccountError(null);
      return;
    }
    setLoadingAccounts(true);
    setAccountError(null);
    try {
      const rows = await listStudentAccountLinks(activeSchool.id);
      setAccountLinks(rows);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'ไม่สามารถโหลดคำขอบัญชีนักเรียนได้');
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    void loadAccountLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchool.id, isDemoMode]);

  // Map today's latest attendance record per student
  const todayStudentRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of attendance) {
      if (rec.date !== todayStr) continue;
      if (rec.userType === 'teacher') continue;
      const existing = map.get(rec.studentId);
      if (!existing || rec.recordType === 'check_in') {
        map.set(rec.studentId, rec);
      }
    }
    return map;
  }, [attendance, todayStr]);

  // Daily Attendance Summary Metrics
  const attendanceMetrics = useMemo(() => {
    let present = 0;
    let late = 0;
    let leaveOrAbsent = 0;
    let unchecked = 0;

    for (const stu of students) {
      const rec = todayStudentRecordMap.get(stu.id);
      if (!rec) {
        unchecked += 1;
      } else if (rec.status === 'present') {
        present += 1;
      } else if (rec.status === 'late') {
        late += 1;
      } else {
        leaveOrAbsent += 1;
      }
    }

    const total = students.length;
    const rate = total > 0 ? Math.min(100, Math.round(((present + late) / total) * 100)) : 0;
    return { present, late, leaveOrAbsent, unchecked, total, rate };
  }, [students, todayStudentRecordMap]);

  // Filtered Today's Student Attendance Rows
  const filteredAttendanceStudents = useMemo(() => {
    const q = attQuery.trim().toLowerCase();
    return students
      .filter((stu) => {
        const rec = todayStudentRecordMap.get(stu.id);
        if (attFilter === 'present' && rec?.status !== 'present') return false;
        if (attFilter === 'late' && rec?.status !== 'late') return false;
        if (attFilter === 'unchecked' && rec) return false;
        if (!q) return true;
        return (
          `${stu.firstNameTh} ${stu.lastNameTh}`.toLowerCase().includes(q) ||
          `${stu.firstNameEn} ${stu.lastNameEn}`.toLowerCase().includes(q) ||
          stu.studentIdNumber.toLowerCase().includes(q) ||
          `${stu.gradeLevel}/${stu.room}`.toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [students, todayStudentRecordMap, attFilter, attQuery]);

  // Leaves: Pending + Active Today
  const pendingLeaves = useMemo(
    () => leaveRequests.filter((req) => req.status === 'pending'),
    [leaveRequests]
  );

  const activeLeavesToday = useMemo(
    () =>
      leaveRequests.filter(
        (req) =>
          req.status === 'approved' &&
          req.startDate <= todayStr &&
          (req.endDate || req.startDate) >= todayStr
      ),
    [leaveRequests, todayStr]
  );

  // Approvals: Tuition Slips + Pending Student Accounts
  const pendingSlips = useMemo(
    () => invoices.filter((inv) => inv.slipStatus === 'pending_review'),
    [invoices]
  );

  const pendingStudentAccounts = useMemo(
    () => accountLinks.filter((acc) => acc.status === 'pending'),
    [accountLinks]
  );

  const totalPendingApprovals = pendingSlips.length + pendingStudentAccounts.length;

  const handleQuickMarkAttendance = (stu: Student, status: AttendanceStatus) => {
    const statusLabel =
      status === 'present' ? 'มาเรียน' : status === 'late' ? 'มาสาย' : status === 'sick' ? 'ลา' : 'ขาด';
    onRecordAttendance(
      stu.id,
      status,
      `ผู้บริหาร/แอดมินเช็คชื่อด่วนรายวัน (${statusLabel})`,
      'teacher_proxy',
      {
        recordType: 'check_in',
        userType: 'student',
        userName: `${stu.firstNameTh} ${stu.lastNameTh}`,
        userRole: `นักเรียน (${stu.gradeLevel})`,
        userAvatar: stu.avatarUrl,
        userDepartmentOrRoom: stu.room,
        date: todayStr,
        recordedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'Admin',
        recordedByRole: currentUser?.role || 'admin',
      }
    );
    notify(
      lang === 'th'
        ? `บันทึกเช็คชื่อ ${stu.firstNameTh} (${statusLabel}) แล้ว`
        : `Marked ${stu.firstNameEn} as ${status}`
    );
  };

  const handleApproveStudentAccount = async (account: StudentAccountLink) => {
    setBusyAccountId(account.id);
    try {
      await approveStudentAccountInSupabase(activeSchool.id, account.id, account.student_id);
      setAccountLinks((prev) =>
        prev.map((item) => (item.id === account.id ? { ...item, status: 'active' } : item))
      );
      notify(
        lang === 'th'
          ? `อนุมัติบัญชี ${account.full_name_th || account.email || ''} แล้ว`
          : `Approved ${account.full_name_en || account.email || ''}`
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'อนุมัติบัญชีไม่สำเร็จ');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleRejectStudentAccount = async (account: StudentAccountLink) => {
    setBusyAccountId(account.id);
    try {
      await updateStudentAccountStatusInSupabase(activeSchool.id, account.id, 'suspended');
      setAccountLinks((prev) =>
        prev.map((item) => (item.id === account.id ? { ...item, status: 'suspended' } : item))
      );
      notify(
        lang === 'th'
          ? `ระงับคำขอบัญชี ${account.full_name_th || account.email || ''} แล้ว`
          : `Suspended ${account.full_name_en || account.email || ''}`
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusyAccountId(null);
    }
  };

  const formatLeaveTypeLabel = (leaveType: LeaveRequest['leaveType']) => {
    if (leaveType === 'sick') return lang === 'th' ? 'ลาป่วย' : 'Sick';
    if (leaveType === 'personal') return lang === 'th' ? 'ลากิจ' : 'Personal';
    return lang === 'th' ? 'ไปราชการ' : 'Official';
  };

  const formatCheckinMethod = (method?: AttendanceRecord['checkinMethod']) => {
    if (method === 'selfie_geofence' || method === 'mobile_geofence') return 'Selfie GPS';
    if (method === 'qr_scanner') return 'QR/Barcode';
    if (method === 'nfc') return lang === 'th' ? 'แตะบัตร NFC' : 'NFC Tap';
    if (method === 'rfid') return 'RFID Card';
    if (method === 'teacher_proxy') return lang === 'th' ? 'ครู/แอดมิน' : 'Staff';
    if (method === 'manual') return lang === 'th' ? 'กรอกเอง' : 'Manual';
    return lang === 'th' ? 'ระบบ' : 'System';
  };

  const visibleAttendanceStudents = showAllStudents
    ? filteredAttendanceStudents
    : filteredAttendanceStudents.slice(0, 5);

  return (
    <div className="flex flex-col gap-5 py-1 animate-in fade-in duration-150">
      {toast && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. CLEAN APPLE/LINEAR MOBILE HEADER (Title only + 1 Primary CTA) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-title)] truncate">
            {lang === 'th' ? 'งานวันนี้' : "Today's Tasks"}
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenQuickHub && (
              <button
                type="button"
                onClick={onOpenQuickHub}
                aria-label={lang === 'th' ? 'แก้ไขด่วน' : 'Quick Edit'}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-title)] flex items-center justify-center cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {onOpenCheckin && (
          <button
            type="button"
            onClick={onOpenCheckin}
            className="w-full min-h-[54px] px-5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-base font-semibold flex items-center justify-between cursor-pointer transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 shrink-0" />
              <span>{lang === 'th' ? 'เช็คชื่อเข้า-ออก' : 'Check-in'}</span>
            </span>
            <ArrowRight className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/* 2. UNIFIED 3-CELL SECTION SWITCHER */}
        <div
          role="tablist"
          aria-label={lang === 'th' ? 'หมวดงานรายวัน' : 'Daily Sections'}
          className="saas-kpi-strip grid grid-cols-3 divide-x divide-[var(--color-border)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'attendance'}
            data-active={section === 'attendance'}
            onClick={() => setSection('attendance')}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between"
          >
            <span className={`text-[11px] font-semibold truncate ${section === 'attendance' ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`}>
              {lang === 'th' ? 'เช็คชื่อ' : 'Attendance'}
            </span>
            <span className="text-lg font-bold tabular-nums text-[var(--color-text-title)] mt-1">
              {attendanceMetrics.rate}%
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={section === 'leaves'}
            data-active={section === 'leaves'}
            onClick={() => setSection('leaves')}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between"
          >
            <span className={`text-[11px] font-semibold truncate ${section === 'leaves' ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`}>
              {lang === 'th' ? 'ลาวันนี้' : 'Leaves'}
            </span>
            <span className={`text-lg font-bold tabular-nums mt-1 ${pendingLeaves.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-text-title)]'}`}>
              {activeLeavesToday.length + pendingLeaves.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={section === 'approvals'}
            data-active={section === 'approvals'}
            onClick={() => setSection('approvals')}
            className="saas-kpi-cell saas-kpi-cell-interactive flex flex-col justify-between"
          >
            <span className={`text-[11px] font-semibold truncate ${section === 'approvals' ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-muted)]'}`}>
              {lang === 'th' ? 'อนุมัติ' : 'Approvals'}
            </span>
            <span className="text-lg font-bold tabular-nums text-[var(--color-text-title)] mt-1">
              {totalPendingApprovals}
            </span>
          </button>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* TAB 1: TODAY'S ATTENDANCE LIST                                        */}
      {/* ===================================================================== */}
      {section === 'attendance' && (
        <section className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[var(--color-text-title)]">
              {lang === 'th' ? 'เช็คชื่อวันนี้' : "Today's Attendance"}
            </h2>
            {filteredAttendanceStudents.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllStudents((prev) => !prev)}
                className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
              >
                {showAllStudents
                  ? (lang === 'th' ? 'ย่อเหลือ 5' : 'Show 5')
                  : (lang === 'th' ? `ดูทั้งหมด (${filteredAttendanceStudents.length})` : `All (${filteredAttendanceStudents.length})`)}
              </button>
            )}
          </div>

          {/* Search & Status Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={attQuery}
                onChange={(e) => setAttQuery(e.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อ รหัส หรือห้องเรียน...' : 'Search name, ID, or room...'}
                className="w-full min-h-[44px] pl-9 pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {attQuery && (
                <button
                  type="button"
                  onClick={() => setAttQuery('')}
                  aria-label={lang === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {([
                { id: 'all', th: `ทั้งหมด (${attendanceMetrics.total})`, en: `All (${attendanceMetrics.total})` },
                { id: 'unchecked', th: `ยังไม่เช็ค (${attendanceMetrics.unchecked})`, en: `Unchecked (${attendanceMetrics.unchecked})` },
                { id: 'present', th: `มาเรียน (${attendanceMetrics.present})`, en: `Present (${attendanceMetrics.present})` },
                { id: 'late', th: `มาสาย (${attendanceMetrics.late})`, en: `Late (${attendanceMetrics.late})` },
              ] as const).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setAttFilter(chip.id)}
                  className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                    attFilter === chip.id
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lang === 'th' ? chip.th : chip.en}
                </button>
              ))}
            </div>
          </div>

          {/* Student Attendance Rows */}
          {filteredAttendanceStudents.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ไม่พบรายชื่อนักเรียนในเงื่อนไขที่เลือก' : 'No matching students found.'}
              </p>
              {attFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setAttFilter('all');
                    setAttQuery('');
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-primary-text)] cursor-pointer"
                >
                  {lang === 'th' ? 'แสดงทั้งหมด' : 'Show All'}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {visibleAttendanceStudents.map((stu) => {
                const rec = todayStudentRecordMap.get(stu.id);
                const statusText = !rec
                  ? lang === 'th'
                    ? 'ยังไม่เช็ค'
                    : 'Pending'
                  : rec.status === 'present'
                  ? lang === 'th'
                    ? 'มาเรียน'
                    : 'Present'
                  : rec.status === 'late'
                  ? lang === 'th'
                    ? 'มาสาย'
                    : 'Late'
                  : rec.status === 'sick'
                  ? lang === 'th'
                    ? 'ลา'
                    : 'Leave'
                  : lang === 'th'
                  ? 'ขาด'
                  : 'Absent';

                const statusTone = !rec
                  ? 'text-[var(--color-text-muted)]'
                  : rec.status === 'present'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : rec.status === 'late'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-rose-700 dark:text-rose-400';

                return (
                  <div
                    key={stu.id}
                    className="py-3.5 flex items-center justify-between gap-3 min-h-[58px]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(stu)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <img
                        src={stu.avatarUrl}
                        alt={`${stu.firstNameTh} ${stu.lastNameTh}`}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0 bg-[var(--color-card-subtle)]"
                      />
                      <span className="text-sm font-semibold text-[var(--color-text-title)] truncate">
                        {stu.firstNameTh} {stu.lastNameTh}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] truncate shrink-0">
                        {stu.gradeLevel}/{stu.room}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {!rec ? (
                        <button
                          type="button"
                          onClick={() => handleQuickMarkAttendance(stu, 'present')}
                          className="min-h-[40px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>{lang === 'th' ? 'เช็คเข้า' : 'Check in'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(stu)}
                          className="min-h-[40px] px-2 rounded-xl hover:bg-[var(--color-card-subtle)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className={`text-xs font-semibold whitespace-nowrap ${statusTone}`}>
                            {statusText}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LEAVES TODAY & PENDING LEAVE REQUESTS                          */}
      {/* ===================================================================== */}
      {section === 'leaves' && (
        <div className="space-y-3">
          {/* Pending Leave Approvals */}
          <section className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{lang === 'th' ? 'คำขอลาที่รออนุมัติ' : 'Pending Leave Requests'}</span>
              </h2>
              <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">
                {pendingLeaves.length} {lang === 'th' ? 'รายการ' : 'items'}
              </span>
            </div>

            {pendingLeaves.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-5 text-center">
                {lang === 'th' ? 'ไม่มีคำขอลาค้างอนุมัติในขณะนี้' : 'No pending leave requests.'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {pendingLeaves.map((req) => (
                  <div key={req.id} className="py-3 first:pt-0 last:pb-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {req.userName}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                          {formatLeaveTypeLabel(req.leaveType)}
                          <span aria-hidden="true"> · </span>
                          {req.gradeLevelOrDepartment || (req.userRole === 'teacher' ? 'ครู' : 'นักเรียน')}
                          <span aria-hidden="true"> · </span>
                          {req.startDate === req.endDate ? req.startDate : `${req.startDate} – ${req.endDate}`}
                        </p>
                      </div>
                      {req.attachmentUrl && (
                        <a
                          href={req.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[44px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-semibold text-[var(--color-primary-text)] flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'หลักฐาน' : 'File'}</span>
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-[var(--color-text-body)] bg-[var(--color-card-subtle)] px-3 py-2 rounded-xl">
                      {req.reason}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติจากหน้าจอแอดมินรายวัน');
                          notify(
                            lang === 'th'
                              ? `อนุมัติใบลาของ ${req.userName} แล้ว`
                              : `Approved leave for ${req.userName}`
                          );
                        }}
                        className="min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{lang === 'th' ? 'อนุมัติ' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ');
                          notify(
                            lang === 'th'
                              ? `ปฏิเสธใบลาของ ${req.userName} แล้ว`
                              : `Rejected leave for ${req.userName}`
                          );
                        }}
                        className="min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>{lang === 'th' ? 'ไม่อนุมัติ' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Approved Leaves Active Today */}
          <section className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'ผู้ที่ได้รับอนุมัติลาวันนี้' : 'Approved Leaves Today'}</span>
              </h2>
              <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">
                {activeLeavesToday.length} {lang === 'th' ? 'คน' : 'people'}
              </span>
            </div>

            {activeLeavesToday.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                {lang === 'th' ? 'วันนี้ยังไม่มีรายการลาที่อนุมัติไว้' : 'No approved leaves covering today.'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {activeLeavesToday.map((req) => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                        {req.userName}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5 tabular-nums">
                        {formatLeaveTypeLabel(req.leaveType)} · {req.gradeLevelOrDepartment || '-'} · {req.reason}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                      {lang === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: NEW DOCUMENT / SLIP / ACCOUNT APPROVAL REQUESTS                */}
      {/* ===================================================================== */}
      {section === 'approvals' && (
        <div className="space-y-3">
          {/* A. Pending Tuition Slips / Financial Documents */}
          <section className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{lang === 'th' ? 'เอกสารโอนเงิน / สลิปค่าเทอมใหม่' : 'New Payment Slips'}</span>
              </h2>
              <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">
                {pendingSlips.length}
              </span>
            </div>

            {pendingSlips.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                {lang === 'th' ? 'ไม่มีเอกสารสลิปค้างตรวจสอบ' : 'No payment slips awaiting approval.'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {pendingSlips.map((inv) => {
                  const stu = students.find((s) => s.id === inv.studentId);
                  return (
                    <div key={inv.id} className="py-3 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : inv.invoiceNumber}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                            {inv.invoiceNumber}
                            <span aria-hidden="true"> · </span>
                            ฿{inv.totalAmount.toLocaleString()}
                            {inv.slipSubmittedAt ? ` · ${inv.slipSubmittedAt}` : ''}
                          </p>
                        </div>
                        {inv.slipImageUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewSlipInvoice(inv)}
                            className="min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-primary-text)] cursor-pointer shrink-0"
                          >
                            {lang === 'th' ? 'ดูสลิป' : 'View Slip'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {onApproveInvoiceSlip && (
                          <button
                            type="button"
                            onClick={() => {
                              onApproveInvoiceSlip(inv.id);
                              notify(
                                lang === 'th'
                                  ? `อนุมัติเอกสาร ${inv.invoiceNumber} แล้ว`
                                  : `Approved ${inv.invoiceNumber}`
                              );
                            }}
                            className="min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>{lang === 'th' ? 'ยืนยันยอด' : 'Approve'}</span>
                          </button>
                        )}
                        {onRejectInvoiceSlip && (
                          <button
                            type="button"
                            onClick={() => {
                              onRejectInvoiceSlip(inv.id, 'หลักฐานไม่ชัดเจน กรุณาส่งใหม่');
                              notify(
                                lang === 'th'
                                  ? `ส่งกลับสลิป ${inv.invoiceNumber} แล้ว`
                                  : `Rejected ${inv.invoiceNumber}`
                              );
                            }}
                            className="min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>{lang === 'th' ? 'ตีกลับ' : 'Reject'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* B. Pending New Student Account Approvals */}
          <section className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'คำขอเปิดบัญชีนักเรียนใหม่' : 'New Student Account Requests'}</span>
              </h2>
              <button
                type="button"
                onClick={() => void loadAccountLinks()}
                disabled={loadingAccounts}
                aria-label={lang === 'th' ? 'รีเฟรชคำขอบัญชี' : 'Refresh account requests'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAccounts ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isDemoMode ? (
              <p className="text-xs text-[var(--color-text-muted)] py-3">
                {lang === 'th'
                  ? 'โหมดสาธิต: คำขอสมัครบัญชีนักเรียนใหม่จะแสดงอัตโนมัติเมื่อเชื่อมต่อฐานข้อมูลโรงเรียนจริง'
                  : 'Demo mode: live student account requests appear when connected to Supabase.'}
              </p>
            ) : accountError ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{accountError}</span>
              </div>
            ) : loadingAccounts ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                {lang === 'th' ? 'กำลังตรวจสอบคำขอบัญชีใหม่...' : 'Loading account requests...'}
              </p>
            ) : pendingStudentAccounts.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                {lang === 'th' ? 'ไม่มีคำขอเปิดบัญชีนักเรียนที่รอตรวจสอบ' : 'No pending student accounts.'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {pendingStudentAccounts.map((acc) => {
                  const isBusy = busyAccountId === acc.id;
                  return (
                    <div key={acc.id} className="py-3 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {acc.full_name_th || acc.full_name_en || acc.email || acc.id}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5 tabular-nums">
                          {acc.email || '-'}
                          {acc.phone ? ` · ${acc.phone}` : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleApproveStudentAccount(acc)}
                          className="min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{lang === 'th' ? 'อนุมัติบัญชี' : 'Approve'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleRejectStudentAccount(acc)}
                          className="min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 disabled:opacity-50 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>{lang === 'th' ? 'ระงับคำขอ' : 'Suspend'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* C. Coordination & Full ERP Shortcuts */}
          <section className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'เอกสาร & งานประสานงาน' : 'Documents & Coordination'}</span>
              </h2>
              {coordinationUnreadCount > 0 && (
                <span className="text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {lang === 'th' ? `ใหม่ ${coordinationUnreadCount} เรื่อง` : `${coordinationUnreadCount} unread`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {onOpenExecutive && (
                <button
                  type="button"
                  onClick={onOpenExecutive}
                  className="min-h-[46px] p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                    {lang === 'th' ? 'สรุปภาพรวม MIS' : 'MIS Monitor'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                </button>
              )}
              {onJumpToDesktopTab && (
                <button
                  type="button"
                  onClick={() => onJumpToDesktopTab('admin_superadmin_desk')}
                  className="min-h-[46px] p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <MessageSquare className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'ศูนย์ประสานงาน' : 'Coord Desk'}
                    </span>
                  </span>
                  <Laptop className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                </button>
              )}
              {onJumpToDesktopTab && (
                <button
                  type="button"
                  onClick={() => onJumpToDesktopTab('students')}
                  className="min-h-[46px] p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Users className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'ทะเบียน & ปพ.6' : 'Students ERP'}
                    </span>
                  </span>
                  <Laptop className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                </button>
              )}
              {onJumpToDesktopTab && (
                <button
                  type="button"
                  onClick={() => onJumpToDesktopTab('billing')}
                  className="min-h-[46px] p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Receipt className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'การเงิน & ใบเสร็จ' : 'Billing ERP'}
                    </span>
                  </span>
                  <Laptop className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BOTTOM SHEET: QUICK STUDENT ATTENDANCE & GUARDIAN CONTACT             */}
      {/* ===================================================================== */}
      <MobileBottomSheet
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={
          selectedStudent ? `${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}` : ''
        }
        subtitle={
          selectedStudent
            ? `${selectedStudent.studentIdNumber} · ${selectedStudent.gradeLevel}/${selectedStudent.room}`
            : undefined
        }
      >
        {selectedStudent && (
          <div className="space-y-4">
            {(() => {
              const rec = todayStudentRecordMap.get(selectedStudent.id);
              return (
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-1 text-xs">
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'สถานะเช็คชื่อวันนี้' : "Today's Attendance Status"}
                  </p>
                  <p className="font-bold text-[var(--color-text-title)] tabular-nums">
                    {rec
                      ? `${rec.status === 'present' ? 'มาเรียน' : rec.status === 'late' ? 'มาสาย' : rec.status === 'sick' ? 'ลา' : 'ขาด'} · ${rec.time} (${formatCheckinMethod(rec.checkinMethod)})`
                      : lang === 'th'
                      ? 'ยังไม่มีบันทึกเช็คชื่อวันนี้'
                      : 'Not checked in yet today'}
                  </p>
                </div>
              );
            })()}

            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ปรับสถานะเช็คชื่อวันนี้ทันที' : 'Update Today Attendance'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { status: 'present', labelTh: 'มาเรียน', labelEn: 'Present', cls: 'bg-emerald-700 text-white' },
                  { status: 'late', labelTh: 'มาสาย', labelEn: 'Late', cls: 'bg-amber-500 text-slate-950' },
                  { status: 'sick', labelTh: 'ลา', labelEn: 'Leave', cls: 'bg-[var(--color-primary)] text-white' },
                  { status: 'absent', labelTh: 'ขาดเรียน', labelEn: 'Absent', cls: 'bg-rose-700 text-white' },
                ] as const).map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => {
                      handleQuickMarkAttendance(selectedStudent, item.status);
                      setSelectedStudent(null);
                    }}
                    className={`min-h-[46px] rounded-xl text-xs font-bold cursor-pointer transition ${item.cls}`}
                  >
                    {lang === 'th' ? item.labelTh : item.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {selectedStudent.guardianPhone && (
              <a
                href={`tel:${selectedStudent.guardianPhone}`}
                className="w-full min-h-[46px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary-text)] flex items-center justify-center gap-2 tabular-nums"
              >
                <Phone className="w-4 h-4" />
                <span>
                  {lang === 'th' ? 'โทรหาผู้ปกครอง' : 'Call Guardian'}: {selectedStudent.guardianPhone}
                </span>
              </a>
            )}
          </div>
        )}
      </MobileBottomSheet>

      {/* ===================================================================== */}
      {/* BOTTOM SHEET: TUITION SLIP PREVIEW                                    */}
      {/* ===================================================================== */}
      <MobileBottomSheet
        isOpen={Boolean(previewSlipInvoice)}
        onClose={() => setPreviewSlipInvoice(null)}
        title={previewSlipInvoice?.invoiceNumber || (lang === 'th' ? 'หลักฐานการโอนเงิน' : 'Payment Slip')}
        subtitle={
          previewSlipInvoice
            ? `฿${previewSlipInvoice.totalAmount.toLocaleString()} · ${previewSlipInvoice.slipSubmittedAt || ''}`
            : undefined
        }
      >
        {previewSlipInvoice && (
          <div className="space-y-4">
            {previewSlipInvoice.slipImageUrl && (
              <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
                <img
                  src={previewSlipInvoice.slipImageUrl}
                  alt={previewSlipInvoice.invoiceNumber}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[55vh] object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {onApproveInvoiceSlip && (
                <button
                  type="button"
                  onClick={() => {
                    onApproveInvoiceSlip(previewSlipInvoice.id);
                    notify(
                      lang === 'th'
                        ? `อนุมัติเอกสาร ${previewSlipInvoice.invoiceNumber} แล้ว`
                        : `Approved ${previewSlipInvoice.invoiceNumber}`
                    );
                    setPreviewSlipInvoice(null);
                  }}
                  className="min-h-[46px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ยืนยันยอดถูกต้อง' : 'Confirm Payment'}</span>
                </button>
              )}
              {onRejectInvoiceSlip && (
                <button
                  type="button"
                  onClick={() => {
                    onRejectInvoiceSlip(previewSlipInvoice.id, 'หลักฐานไม่ชัดเจน กรุณาส่งใหม่');
                    notify(
                      lang === 'th'
                        ? `ส่งกลับสลิป ${previewSlipInvoice.invoiceNumber} แล้ว`
                        : `Rejected ${previewSlipInvoice.invoiceNumber}`
                    );
                    setPreviewSlipInvoice(null);
                  }}
                  className="min-h-[46px] rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ตีกลับ' : 'Reject'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
};
