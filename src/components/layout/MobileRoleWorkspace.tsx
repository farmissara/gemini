import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit3,
  FileCheck2,
  FileText,
  GraduationCap,
  Laptop,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Monitor,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import type {
  Announcement,
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  Course,
  GradeRecord,
  HomeworkSubmission,
  LeaveRequest,
  LeaveStatus,
  School,
  SchoolFeatureFlags,
  SchoolTier,
  Student,
  Teacher,
  TuitionInvoice,
} from '../../types';
import type { NavTab } from './Sidebar';
import {
  approvePendingSchoolRegistration,
  cancelPendingSchoolRegistrationInSupabase,
  listPendingSchoolRegistrations,
  PendingSchoolRegistration,
} from '../../lib/authDb';
import { getSchoolFeatureFlags, saveSchoolFeatureFlags, TIER_PRESETS } from '../../lib/schoolFeatureFlags';
import { getLocalDateString } from '../../lib/date';

// Reusable Mobile Bottom Sheet (Thumb-zone friendly)
interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-[var(--color-border)]" />
        </div>
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 1. SCHOOL ADMIN MOBILE QUICK HUB (ปรับข้อมูลด่วน · อนุมัติ · ประกาศ · ทางลัดคอม)
// ============================================================================
interface MobileAdminQuickHubProps {
  activeSchool: School;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  leaveRequests: LeaveRequest[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  lang: AppLanguage;
  onUpdateStudent?: (student: Student) => void;
  onUpdateSchool?: (updates: Partial<School>) => Promise<void>;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onUpdateLeaveStatus: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onApproveInvoiceSlip?: (invoiceId: string) => void;
  onRejectInvoiceSlip?: (invoiceId: string, reason: string) => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
  onOpenCheckin?: () => void;
  currentUser: AuthUser | null;
}

export const MobileAdminQuickHub: React.FC<MobileAdminQuickHubProps> = ({
  activeSchool,
  students,
  teachers,
  courses,
  leaveRequests,
  invoices,
  lang,
  onUpdateStudent,
  onUpdateSchool,
  onAddAnnouncement,
  onUpdateLeaveStatus,
  onApproveInvoiceSlip,
  onRejectInvoiceSlip,
  onJumpToDesktopTab,
  onOpenCheckin,
  currentUser,
}) => {
  const [section, setSection] = useState<'triage' | 'students' | 'school'>('triage');
  const [studentQuery, setStudentQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [stuGrade, setStuGrade] = useState('');
  const [stuRoom, setStuRoom] = useState('');
  const [stuStatus, setStuStatus] = useState<Student['status']>('active');
  const [stuPhone, setStuPhone] = useState('');

  const [showAnnouncementSheet, setShowAnnouncementSheet] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAudience, setAnnAudience] = useState<Announcement['targetAudience']>('all');
  const [annCategory, setAnnCategory] = useState<Announcement['category']>('general');

  const [showSchoolEditSheet, setShowSchoolEditSheet] = useState(false);
  const [schoolYearInput, setSchoolYearInput] = useState(activeSchool.academicYear || '');
  const [schoolSemesterInput, setSchoolSemesterInput] = useState(activeSchool.currentSemester || '');
  const [schoolPhoneInput, setSchoolPhoneInput] = useState(activeSchool.phone || '');
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const pendingLeaves = useMemo(
    () => leaveRequests.filter((l) => l.status === 'pending'),
    [leaveRequests]
  );

  const pendingSlips = useMemo(
    () => invoices.filter((inv) => inv.slipStatus === 'pending_review'),
    [invoices]
  );

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const list = q
      ? students.filter(
          (s) =>
            `${s.firstNameTh} ${s.lastNameTh}`.toLowerCase().includes(q) ||
            `${s.firstNameEn} ${s.lastNameEn}`.toLowerCase().includes(q) ||
            s.studentIdNumber.toLowerCase().includes(q) ||
            `${s.gradeLevel}/${s.room}`.toLowerCase().includes(q)
        )
      : students;
    return list.slice(0, 20);
  }, [students, studentQuery]);

  const openStudentEditor = (stu: Student) => {
    setEditingStudent(stu);
    setStuGrade(stu.gradeLevel || '');
    setStuRoom(stu.room || '');
    setStuStatus(stu.status);
    setStuPhone(stu.guardianPhone || '');
  };

  const handleSaveStudentQuick = () => {
    if (!editingStudent || !onUpdateStudent) return;
    onUpdateStudent({
      ...editingStudent,
      gradeLevel: stuGrade.trim(),
      room: stuRoom.trim(),
      status: stuStatus,
      guardianPhone: stuPhone.trim(),
    });
    setEditingStudent(null);
    notify(
      lang === 'th'
        ? `อัปเดตข้อมูล ${editingStudent.firstNameTh} เรียบร้อย`
        : `Updated ${editingStudent.firstNameEn}`
    );
  };

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAnnouncement || !annTitle.trim() || !annContent.trim()) return;
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      schoolId: activeSchool.id,
      title: annTitle.trim(),
      content: annContent.trim(),
      category: annCategory,
      targetAudience: annAudience,
      publishedAt: getLocalDateString(),
      author: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้บริหารโรงเรียน',
      authorRole: lang === 'th' ? 'ผู้บริหารโรงเรียน' : 'School Admin',
      pinned: false,
      lineBroadcastSent: false,
      resendEmailSent: false,
    };
    onAddAnnouncement(newAnn);
    setAnnTitle('');
    setAnnContent('');
    setShowAnnouncementSheet(false);
    notify(lang === 'th' ? 'เผยแพร่ประกาศเรียบร้อย' : 'Announcement published');
  };

  const handleSaveSchoolQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSchool) return;
    setIsSavingSchool(true);
    try {
      await onUpdateSchool({
        academicYear: schoolYearInput.trim(),
        currentSemester: schoolSemesterInput.trim(),
        phone: schoolPhoneInput.trim(),
      });
      setShowSchoolEditSheet(false);
      notify(lang === 'th' ? 'บันทึกข้อมูลโรงเรียนเรียบร้อย' : 'School settings updated');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSavingSchool(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 py-1 animate-in fade-in duration-200">
      {toast && (
        <div
          role="status"
          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Summary */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--color-text-title)]">
              {lang === 'th' ? 'ศูนย์ปรับข้อมูลด่วน (แอดมิน)' : 'Admin Quick Workspace'}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
              {activeSchool.nameTh} · {lang === 'th' ? 'ปีการศึกษา' : 'Year'} {activeSchool.academicYear || '-'} / {activeSchool.currentSemester || '-'}
            </p>
          </div>
          {onAddAnnouncement && (
            <button
              type="button"
              onClick={() => setShowAnnouncementSheet(true)}
              className="min-h-[44px] px-3.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>{lang === 'th' ? 'ประกาศด่วน' : 'Announce'}</span>
            </button>
          )}
        </div>

        {/* Segmented Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setSection('triage')}
            className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              section === 'triage'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? `งานรอตรวจ (${pendingLeaves.length + pendingSlips.length})` : `Inbox (${pendingLeaves.length + pendingSlips.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSection('students')}
            className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              section === 'students'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? `แก้นักเรียน (${students.length})` : `Students (${students.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSection('school')}
            className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              section === 'school'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? 'โรงเรียน & คอม' : 'School & PC'}
          </button>
        </div>
      </div>

      {/* SECTION 1: URGENT APPROVAL TRIAGE */}
      {section === 'triage' && (
        <div className="space-y-3">
          {/* Pending Leaves */}
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{lang === 'th' ? 'คำขอลาที่รออนุมัติ' : 'Pending Leave Requests'}</span>
              </h3>
              <span className="text-xs font-bold tabular-nums text-[var(--color-text-muted)]">
                {pendingLeaves.length} {lang === 'th' ? 'รายการ' : 'items'}
              </span>
            </div>

            {pendingLeaves.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">
                {lang === 'th' ? 'ไม่มีคำขอลาค้างอนุมัติ' : 'All leave requests reviewed.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {pendingLeaves.slice(0, 6).map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {req.userName}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {req.userRole === 'teacher' ? 'ครู' : 'นักเรียน'} · {req.leaveType} · {req.startDate}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-body)] line-clamp-2">{req.reason}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติด่วนจากมือถือ');
                          notify(`อนุมัติใบลาของ ${req.userName} แล้ว`);
                        }}
                        className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{lang === 'th' ? 'อนุมัติ' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ');
                          notify(`ปฏิเสธใบลาของ ${req.userName} แล้ว`);
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
          </div>

          {/* Pending Tuition Slips */}
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'th' ? 'สลิปค่าเทอมรอตรวจ' : 'Tuition Slips Pending Review'}</span>
              </h3>
              <span className="text-xs font-bold tabular-nums text-[var(--color-text-muted)]">
                {pendingSlips.length}
              </span>
            </div>

            {pendingSlips.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">
                {lang === 'th' ? 'ไม่มีสลิปโอนเงินรอตรวจสอบ' : 'No slips awaiting review.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {pendingSlips.slice(0, 5).map((inv) => {
                  const stu = students.find((s) => s.id === inv.studentId);
                  return (
                    <div
                      key={inv.id}
                      className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {stu ? `${stu.firstNameTh} ${stu.lastNameTh}` : inv.invoiceNumber}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                            {inv.invoiceNumber} · ฿{inv.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {onApproveInvoiceSlip && (
                          <button
                            type="button"
                            onClick={() => {
                              onApproveInvoiceSlip(inv.id);
                              notify(`อนุมัติใบเสร็จ ${inv.invoiceNumber} แล้ว`);
                            }}
                            className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>{lang === 'th' ? 'ยืนยันยอด' : 'Confirm'}</span>
                          </button>
                        )}
                        {onRejectInvoiceSlip && (
                          <button
                            type="button"
                            onClick={() => {
                              onRejectInvoiceSlip(inv.id, 'ยอด/หลักฐานไม่ตรง กรุณาส่งใหม่');
                              notify(`ส่งกลับสลิป ${inv.invoiceNumber} แล้ว`);
                            }}
                            className="min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
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
          </div>
        </div>
      )}

      {/* SECTION 2: QUICK STUDENT SEARCH & EDIT */}
      {section === 'students' && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อ, รหัสนักเรียน, หรือห้อง (เช่น 6/1)...' : 'Search name, ID, or room...'}
              className="w-full min-h-[44px] pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {studentQuery && (
              <button
                type="button"
                onClick={() => setStudentQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
                {lang === 'th' ? 'ไม่พบข้อมูลนักเรียน' : 'No matching students'}
              </p>
            ) : (
              filteredStudents.map((stu) => (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => openStudentEditor(stu)}
                  className="w-full min-h-[56px] py-2.5 px-1 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-xl transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                      {stu.firstNameTh} {stu.lastNameTh}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5 truncate">
                      {stu.studentIdNumber} · {stu.gradeLevel}/{stu.room} · GPA {stu.gpa.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-[var(--color-primary-text)]">
                      {lang === 'th' ? 'แก้ไข' : 'Edit'}
                    </span>
                    <Edit3 className="w-4 h-4 text-[var(--color-primary-text)]" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: SCHOOL QUICK SETTINGS & JUMP TO DESKTOP */}
      {section === 'school' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ข้อมูลปีการศึกษา & โรงเรียน' : 'Academic Period & School Info'}
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  {lang === 'th'
                    ? `ปีการศึกษา ${activeSchool.academicYear || '-'} · เทอม ${activeSchool.currentSemester || '-'} · โทร ${activeSchool.phone || '-'}`
                    : `Year ${activeSchool.academicYear || '-'} · Term ${activeSchool.currentSemester || '-'}`}
                </p>
              </div>
              {onUpdateSchool && (
                <button
                  type="button"
                  onClick={() => {
                    setSchoolYearInput(activeSchool.academicYear || '');
                    setSchoolSemesterInput(activeSchool.currentSemester || '');
                    setSchoolPhoneInput(activeSchool.phone || '');
                    setShowSchoolEditSheet(true);
                  }}
                  className="min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary-text)] shrink-0 cursor-pointer"
                >
                  {lang === 'th' ? 'แก้ไขด่วน' : 'Edit'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-text-muted)]">{lang === 'th' ? 'นักเรียน' : 'Students'}</div>
                <div className="text-sm font-bold tabular-nums text-[var(--color-text-title)]">{students.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-text-muted)]">{lang === 'th' ? 'ครู/บุคลากร' : 'Staff'}</div>
                <div className="text-sm font-bold tabular-nums text-[var(--color-text-title)]">{teachers.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <div className="text-[10px] text-[var(--color-text-muted)]">{lang === 'th' ? 'รายวิชา' : 'Courses'}</div>
                <div className="text-sm font-bold tabular-nums text-[var(--color-text-title)]">{courses.length}</div>
              </div>
            </div>
          </div>

          {onJumpToDesktopTab && (
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span>{lang === 'th' ? 'งานละเอียด (เปิดมุมมองคอม)' : 'Heavy Modules (Desktop View)'}</span>
                </h3>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'งานตารางใหญ่ ปพ.5/6 หรือนำเข้า Excel จะเปิดข้ามไปมุมมองคอมให้อัตโนมัติ'
                  : 'Complex tables, transcripts, and batch imports switch directly to Desktop mode.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { tab: 'students' as NavTab, th: 'ทะเบียนนักเรียน', en: 'Students', icon: Users },
                  { tab: 'teachers' as NavTab, th: 'บุคลากร & ครู', en: 'Staff', icon: GraduationCap },
                  { tab: 'gradebook' as NavTab, th: 'คะแนน & ปพ.5/6', en: 'Gradebook', icon: Award },
                  { tab: 'timetable' as NavTab, th: 'ตารางสอน', en: 'Timetable', icon: Calendar },
                  { tab: 'school_gps' as NavTab, th: 'พิกัด GPS ประตู', en: 'Campus GPS', icon: MapPin },
                  { tab: 'system_settings' as NavTab, th: 'ตั้งค่าระบบ & LINE', en: 'Settings', icon: Settings },
                  { tab: 'school_permissions' as NavTab, th: 'สิทธิ์ในโรงเรียน', en: 'Permissions', icon: SlidersHorizontal },
                  { tab: 'billing' as NavTab, th: 'การเงิน & ใบเสร็จ', en: 'Billing', icon: Receipt },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => onJumpToDesktopTab(item.tab)}
                      className="min-h-[46px] p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                        <span className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                          {lang === 'th' ? item.th : item.en}
                        </span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                    </button>
                  );
                })}
              </div>
              {onOpenCheckin && (
                <button
                  type="button"
                  onClick={onOpenCheckin}
                  className="w-full min-h-[44px] mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-primary-text)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ไปหน้าสแกนเช็คชื่อมือถือ' : 'Open Mobile Check-in'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM SHEET: QUICK EDIT STUDENT */}
      <MobileBottomSheet
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        title={
          editingStudent
            ? `${editingStudent.firstNameTh} ${editingStudent.lastNameTh}`
            : ''
        }
        subtitle={editingStudent ? `${lang === 'th' ? 'รหัส' : 'ID'}: ${editingStudent.studentIdNumber}` : undefined}
      >
        {editingStudent && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  {lang === 'th' ? 'ระดับชั้น' : 'Grade Level'}
                </label>
                <input
                  type="text"
                  value={stuGrade}
                  onChange={(e) => setStuGrade(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  {lang === 'th' ? 'ห้องเรียน' : 'Room'}
                </label>
                <input
                  type="text"
                  value={stuRoom}
                  onChange={(e) => setStuRoom(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'สถานะนักเรียน' : 'Student Status'}
              </label>
              <select
                value={stuStatus}
                onChange={(e) => setStuStatus(e.target.value as Student['status'])}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)]"
              >
                <option value="active">{lang === 'th' ? 'กำลังศึกษา (Active)' : 'Active'}</option>
                <option value="leave">{lang === 'th' ? 'พักการเรียน (On Leave)' : 'On Leave'}</option>
                <option value="graduated">{lang === 'th' ? 'สำเร็จการศึกษา (Graduated)' : 'Graduated'}</option>
                <option value="transferred">{lang === 'th' ? 'ย้ายสถานศึกษา (Transferred)' : 'Transferred'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'เบอร์โทรผู้ปกครอง' : 'Guardian Phone'}
              </label>
              <input
                type="tel"
                value={stuPhone}
                onChange={(e) => setStuPhone(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)] tabular-nums"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="flex-1 min-h-[46px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] cursor-pointer"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveStudentQuick}
                className="flex-1 min-h-[46px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* BOTTOM SHEET: QUICK ANNOUNCEMENT */}
      <MobileBottomSheet
        isOpen={showAnnouncementSheet}
        onClose={() => setShowAnnouncementSheet(false)}
        title={lang === 'th' ? 'สร้างประกาศโรงเรียนด่วน' : 'Quick School Announcement'}
        subtitle={activeSchool.nameTh}
      >
        <form onSubmit={handlePublishAnnouncement} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
              {lang === 'th' ? 'หัวข้อประกาศ' : 'Title'}
            </label>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder={lang === 'th' ? 'เช่น แจ้งหยุดเรียนกรณีพิเศษ / นัดประชุมผู้ปกครอง' : 'Announcement headline...'}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'หมวดหมู่' : 'Category'}
              </label>
              <select
                value={annCategory}
                onChange={(e) => setAnnCategory(e.target.value as Announcement['category'])}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
              >
                <option value="general">{lang === 'th' ? 'ทั่วไป' : 'General'}</option>
                <option value="academic">{lang === 'th' ? 'วิชาการ' : 'Academic'}</option>
                <option value="urgent">{lang === 'th' ? 'ด่วน' : 'Urgent'}</option>
                <option value="event">{lang === 'th' ? 'กิจกรรม' : 'Event'}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'กลุ่มเป้าหมาย' : 'Audience'}
              </label>
              <select
                value={annAudience}
                onChange={(e) => setAnnAudience(e.target.value as Announcement['targetAudience'])}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
              >
                <option value="all">{lang === 'th' ? 'ทุกคนในโรงเรียน' : 'Everyone'}</option>
                <option value="teachers">{lang === 'th' ? 'เฉพาะคุณครู' : 'Teachers'}</option>
                <option value="students">{lang === 'th' ? 'เฉพาะนักเรียน' : 'Students'}</option>
                <option value="parents">{lang === 'th' ? 'เฉพาะผู้ปกครอง' : 'Parents'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
              {lang === 'th' ? 'รายละเอียด' : 'Details'}
            </label>
            <textarea
              required
              rows={4}
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              placeholder={lang === 'th' ? 'พิมพ์ข้อความประกาศ...' : 'Write announcement details...'}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)]"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-bold cursor-pointer"
          >
            {lang === 'th' ? 'เผยแพร่ประกาศทันที' : 'Publish Announcement'}
          </button>
        </form>
      </MobileBottomSheet>

      {/* BOTTOM SHEET: QUICK SCHOOL EDIT */}
      <MobileBottomSheet
        isOpen={showSchoolEditSheet}
        onClose={() => setShowSchoolEditSheet(false)}
        title={lang === 'th' ? 'แก้ไขข้อมูลโรงเรียนด่วน' : 'Quick Edit School Info'}
        subtitle={activeSchool.nameTh}
      >
        <form onSubmit={handleSaveSchoolQuick} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'ปีการศึกษา' : 'Academic Year'}
              </label>
              <input
                type="text"
                value={schoolYearInput}
                onChange={(e) => setSchoolYearInput(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                {lang === 'th' ? 'ภาคเรียนปัจจุบัน' : 'Current Term'}
              </label>
              <input
                type="text"
                value={schoolSemesterInput}
                onChange={(e) => setSchoolSemesterInput(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
              {lang === 'th' ? 'เบอร์โทรศัพท์โรงเรียน' : 'School Phone'}
            </label>
            <input
              type="tel"
              value={schoolPhoneInput}
              onChange={(e) => setSchoolPhoneInput(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-sm text-[var(--color-text-title)] tabular-nums"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingSchool}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
          >
            {isSavingSchool
              ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
              : (lang === 'th' ? 'บันทึกข้อมูลโรงเรียน' : 'Save School Settings')}
          </button>
        </form>
      </MobileBottomSheet>
    </div>
  );
};

// ============================================================================
// 2. SUPER ADMIN MOBILE CONTROL CENTER (ภาพรวมระบบทั้งหมด + อนุมัติ/ระงับ/แพ็กเกจโรงเรียน)
// ============================================================================
interface MobileSuperAdminHubProps {
  schools: School[];
  activeSchool: School;
  isDemoMode: boolean;
  lang: AppLanguage;
  coordinationUnreadCount?: number;
  onViewSchool?: (school: School) => void;
  onToggleSchoolStatus?: (schoolId: string, status: School['status']) => Promise<void>;
  onUpdateSchoolFeatureFlags?: (schoolId: string, flags: SchoolFeatureFlags) => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
}

export const MobileSuperAdminHub: React.FC<MobileSuperAdminHubProps> = ({
  schools,
  activeSchool,
  isDemoMode,
  lang,
  coordinationUnreadCount = 0,
  onViewSchool,
  onToggleSchoolStatus,
  onUpdateSchoolFeatureFlags,
  onJumpToDesktopTab,
}) => {
  const [tab, setTab] = useState<'overview' | 'approvals' | 'schools'>('overview');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [pendingRegs, setPendingRegs] = useState<PendingSchoolRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedSchoolSheet, setSelectedSchoolSheet] = useState<School | null>(null);
  const [flagDraft, setFlagDraft] = useState<SchoolFeatureFlags | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadPending = () => {
    if (isDemoMode) return;
    setLoadingRegs(true);
    setRegError(null);
    listPendingSchoolRegistrations()
      .then((rows) => setPendingRegs(rows))
      .catch((err: unknown) => setRegError(err instanceof Error ? err.message : 'โหลดรายการไม่สำเร็จ'))
      .finally(() => setLoadingRegs(false));
  };

  useEffect(() => {
    loadPending();
  }, [isDemoMode]);

  const metrics = useMemo(() => {
    const activeCount = schools.filter((s) => s.status === 'active').length;
    const suspendedCount = schools.filter((s) => s.status === 'suspended').length;
    const pendingCount = pendingRegs.length + schools.filter((s) => s.status === 'pending').length;
    const totalStudents = schools.reduce((sum, s) => sum + (s.studentsCount || 0), 0);
    const totalTeachers = schools.reduce((sum, s) => sum + (s.teachersCount || 0), 0);
    return { activeCount, suspendedCount, pendingCount, totalStudents, totalTeachers };
  }, [schools, pendingRegs]);

  const filteredSchools = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.nameTh.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q)
    );
  }, [schools, schoolSearch]);

  const handleApprovePending = async (reg: PendingSchoolRegistration) => {
    setBusyId(reg.user_id);
    try {
      await approvePendingSchoolRegistration(reg.user_id);
      setPendingRegs((prev) => prev.filter((item) => item.user_id !== reg.user_id));
      notify(`อนุมัติโรงเรียน ${reg.school_name_th} สำเร็จ`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'อนุมัติไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelPending = async (reg: PendingSchoolRegistration) => {
    setBusyId(reg.user_id);
    try {
      await cancelPendingSchoolRegistrationInSupabase(reg.user_id, reg.school_id);
      setPendingRegs((prev) => prev.filter((item) => item.user_id !== reg.user_id));
      notify(`ยกเลิกคำขอ ${reg.school_name_th} แล้ว`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ยกเลิกไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  const openSchoolManageSheet = (school: School) => {
    setSelectedSchoolSheet(school);
    setFlagDraft(getSchoolFeatureFlags(school.id));
  };

  const handleApplyTier = (tier: SchoolTier) => {
    if (!selectedSchoolSheet) return;
    const nextFlags = { ...TIER_PRESETS[tier] };
    setFlagDraft(nextFlags);
    saveSchoolFeatureFlags(selectedSchoolSheet.id, nextFlags);
    onUpdateSchoolFeatureFlags?.(selectedSchoolSheet.id, nextFlags);
    notify(`อัปเดตแพ็กเกจ ${selectedSchoolSheet.nameTh} เป็น ${tier.toUpperCase()}`);
  };

  return (
    <div className="flex flex-col gap-3.5 py-1 animate-in fade-in duration-200">
      {toast && (
        <div
          role="status"
          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Super Admin Header Card */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <h2 className="text-base font-bold text-[var(--color-text-title)] truncate">
                {lang === 'th' ? 'ศูนย์ควบคุมแม่ข่าย (Super Admin)' : 'Master Control Center'}
              </h2>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? `กำกับดูแล ${schools.length} โรงเรียน · รออนุมัติ ${metrics.pendingCount} รายการ`
                : `Managing ${schools.length} schools · ${metrics.pendingCount} pending`}
            </p>
          </div>
          {onJumpToDesktopTab && (
            <button
              type="button"
              onClick={() => onJumpToDesktopTab('admin_superadmin_desk')}
              className="relative min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-primary-text)] flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>{lang === 'th' ? 'ประสานงาน' : 'Desk'}</span>
              {coordinationUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold tabular-nums">
                  {coordinationUnreadCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Sub-navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'overview'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? 'ภาพรวมระบบ' : 'Overview'}
          </button>
          <button
            type="button"
            onClick={() => setTab('approvals')}
            className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'approvals'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? `รออนุมัติ (${metrics.pendingCount})` : `Queue (${metrics.pendingCount})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('schools')}
            className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'schools'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            {lang === 'th' ? `โรงเรียน (${schools.length})` : `Schools (${schools.length})`}
          </button>
        </div>
      </div>

      {/* TAB 1: GLOBAL OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'โรงเรียนที่เปิดใช้งาน' : 'Active Schools'}
              </p>
              <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                {metrics.activeCount}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                {lang === 'th' ? `ระงับ ${metrics.suspendedCount} แห่ง` : `${metrics.suspendedCount} suspended`}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'คำขอสมัครใหม่' : 'Pending Approvals'}
              </p>
              <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-1">
                {metrics.pendingCount}
              </p>
              <button
                type="button"
                onClick={() => setTab('approvals')}
                className="text-[11px] font-semibold text-[var(--color-primary-text)] mt-0.5 cursor-pointer hover:underline"
              >
                {lang === 'th' ? 'เปิดคิวอนุมัติ →' : 'Review queue →'}
              </button>
            </div>
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'นักเรียนรวมทั้งระบบ' : 'Total Students'}
              </p>
              <p className="text-xl font-bold tabular-nums text-[var(--color-text-title)] mt-1">
                {metrics.totalStudents.toLocaleString()}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ครูและบุคลากรรวม' : 'Total Staff'}
              </p>
              <p className="text-xl font-bold tabular-nums text-[var(--color-text-title)] mt-1">
                {metrics.totalTeachers.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Active School Focus Card */}
          {activeSchool.id && (
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'โรงเรียนที่กำลังตรวจสอบ' : 'Currently Inspecting'}
                  </p>
                  <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                    {activeSchool.nameTh}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openSchoolManageSheet(activeSchool)}
                  className="min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-primary-text)] cursor-pointer shrink-0"
                >
                  {lang === 'th' ? 'จัดการสิทธิ์/สถานะ' : 'Manage'}
                </button>
              </div>
            </div>
          )}

          {/* Jump to Full Desktop Console */}
          {onJumpToDesktopTab && (
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'เครื่องมือ Super Admin แบบเต็มจอ' : 'Full Desktop Admin Tools'}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onJumpToDesktopTab('super_admin_console')}
                  className="min-h-[46px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
                >
                  <span>{lang === 'th' ? 'ศูนย์ควบคุมแม่ข่าย' : 'Master Console'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToDesktopTab('admin_superadmin_desk')}
                  className="min-h-[46px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
                >
                  <span>{lang === 'th' ? 'แชตประสานงาน' : 'Urgent Desk'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING APPROVALS QUEUE */}
      {tab === 'approvals' && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--color-text-title)]">
              {lang === 'th' ? 'คำขอเปิดใช้งานโรงเรียนใหม่' : 'Pending School Registrations'}
            </h3>
            <button
              type="button"
              onClick={loadPending}
              className="min-h-[40px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRegs ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
            </button>
          </div>

          {regError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{regError}</p>
          )}

          {pendingRegs.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
              {loadingRegs
                ? (lang === 'th' ? 'กำลังโหลดรายการ...' : 'Loading...')
                : (lang === 'th' ? 'ไม่มีคำขอสมัครโรงเรียนรออนุมัติ' : 'No pending school registrations.')}
            </p>
          ) : (
            <div className="space-y-2.5">
              {pendingRegs.map((reg) => (
                <div
                  key={reg.user_id}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-2"
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-title)]">{reg.school_name_th}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {reg.full_name_th} · {reg.email} · {reg.province}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busyId === reg.user_id}
                      onClick={() => void handleApprovePending(reg)}
                      className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{lang === 'th' ? 'อนุมัติเปิดระบบ' : 'Approve'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === reg.user_id}
                      onClick={() => void handleCancelPending(reg)}
                      className="min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 disabled:opacity-50 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ยกเลิกคำขอ' : 'Cancel'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL SCHOOLS DIRECTORY & QUICK CONTROLS */}
      {tab === 'schools' && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อโรงเรียน รหัส หรือจังหวัด...' : 'Search school, code, province...'}
              className="w-full min-h-[44px] pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
            />
            {schoolSearch && (
              <button
                type="button"
                onClick={() => setSchoolSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {filteredSchools.map((sch) => (
              <button
                key={sch.id}
                type="button"
                onClick={() => openSchoolManageSheet(sch)}
                className="w-full min-h-[60px] py-2.5 px-1 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] rounded-xl transition cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                    {sch.nameTh}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums truncate">
                    {sch.code} · {sch.province} ·{' '}
                    <span
                      className={
                        sch.status === 'active'
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-rose-700 dark:text-rose-400 font-semibold'
                      }
                    >
                      {sch.status === 'active'
                        ? (lang === 'th' ? 'เปิดใช้งาน' : 'Active')
                        : sch.status === 'suspended'
                        ? (lang === 'th' ? 'ระงับชั่วคราว' : 'Suspended')
                        : sch.status}
                    </span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM SHEET: MANAGE SCHOOL (STATUS, TIER, ENTER SCHOOL) */}
      <MobileBottomSheet
        isOpen={Boolean(selectedSchoolSheet)}
        onClose={() => setSelectedSchoolSheet(null)}
        title={selectedSchoolSheet?.nameTh || ''}
        subtitle={
          selectedSchoolSheet
            ? `${selectedSchoolSheet.code} · ${selectedSchoolSheet.province}`
            : undefined
        }
      >
        {selectedSchoolSheet && (
          <div className="space-y-4">
            {/* Enter School */}
            {onViewSchool && (
              <button
                type="button"
                onClick={() => {
                  onViewSchool(selectedSchoolSheet);
                  setSelectedSchoolSheet(null);
                  notify(`สลับเข้าดูโรงเรียน ${selectedSchoolSheet.nameTh}`);
                }}
                className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>{lang === 'th' ? 'เข้าตรวจสอบข้อมูลโรงเรียนนี้' : 'Inspect This School'}</span>
              </button>
            )}

            {/* Toggle Status */}
            {onToggleSchoolStatus && selectedSchoolSheet.status !== 'pending' && (
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'สถานะการใช้งานระบบ' : 'System Access Status'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {selectedSchoolSheet.status === 'active'
                      ? (lang === 'th' ? 'กำลังเปิดใช้งานปกติ' : 'Currently Active')
                      : (lang === 'th' ? 'ถูกระงับการใช้งานชั่วคราว' : 'Currently Suspended')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextStatus = selectedSchoolSheet.status === 'active' ? 'suspended' : 'active';
                    try {
                      await onToggleSchoolStatus(selectedSchoolSheet.id, nextStatus);
                      setSelectedSchoolSheet({ ...selectedSchoolSheet, status: nextStatus });
                      notify(
                        nextStatus === 'active'
                          ? `เปิดใช้งาน ${selectedSchoolSheet.nameTh} แล้ว`
                          : `ระงับ ${selectedSchoolSheet.nameTh} ชั่วคราวแล้ว`
                      );
                    } catch (err) {
                      notify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
                    }
                  }}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    selectedSchoolSheet.status === 'active'
                      ? 'border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedSchoolSheet.status === 'active' ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ระงับชั่วคราว' : 'Suspend'}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>{lang === 'th' ? 'เปิดใช้งาน' : 'Activate'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tier Presets */}
            {flagDraft && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'แพ็กเกจโมดูลโรงเรียน (Tier)' : 'School Feature Tier'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'standard', 'enterprise'] as SchoolTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleApplyTier(tier)}
                      className={`min-h-[44px] rounded-xl border text-xs font-bold uppercase cursor-pointer transition ${
                        flagDraft.tier === tier
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
};
