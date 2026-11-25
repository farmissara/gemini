import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Printer,
  RotateCw,
  User,
  Sparkles,
  Search,
  Camera,
  AlertCircle,
  GraduationCap,
  CalendarDays,
  HeartPulse,
  QrCode,
  FileText,
} from 'lucide-react';
import {
  Student,
  Teacher,
  School,
  AppLanguage,
  UserRole,
  AuthUser,
  TimetableSlot,
  Course,
  SchoolPeriodTime,
} from '../types';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';
import { PagedList } from '../components/PagedList';
import { BatchIdCardPrintModal } from '../components/modals/BatchIdCardPrintModal';
import { IdCardBackContent } from '../components/id-card/IdCardBackContent';
import { QrCodeMatrix } from '../components/QrCodeMatrix';
import { Barcode128Svg } from '../components/Barcode128Svg';
import { getModuleTone } from '../lib/moduleTheme';
import { resolveLinkedStudentsForUser, resolveOwnStudent, resolveOwnTeacher } from '../lib/attendanceScope';
import {
  ID_CARD_BACK_MODE_OPTIONS,
  getSavedIdCardBackMode,
  saveIdCardBackMode,
  type IdCardBackMode,
} from '../lib/idCardBackLayout';
import { emitAppToast } from '../components/common/ToastProvider';

function formatMaskedNationalId(raw?: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length !== 13) return raw || '-';
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-XXXXX-${digits.slice(10, 12)}-${digits.slice(12)}`;
}

interface DigitalIdCardViewProps {
  students: Student[];
  teachers?: Teacher[];
  school: School;
  lang: AppLanguage;
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  timetableSlots?: TimetableSlot[];
  courses?: Course[];
  schoolPeriods?: SchoolPeriodTime[];
  onUpdateStudent?: (student: Student) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onUpdateOwnAvatar?: (avatarUrl: string) => void;
}

export const DigitalIdCardView: React.FC<DigitalIdCardViewProps> = ({
  students,
  teachers = [],
  school,
  lang,
  currentRole,
  currentUser,
  timetableSlots = [],
  courses = [],
  schoolPeriods = [],
  onUpdateStudent,
  onUpdateTeacher,
  onUpdateOwnAvatar,
}) => {
  const effectiveRole: UserRole = currentUser?.role || currentRole;
  const isStudentViewer = effectiveRole === 'student';
  const isParentViewer = effectiveRole === 'parent';
  const isTeacherViewer = effectiveRole === 'teacher';
  const isAdminViewer = effectiveRole === 'admin' || effectiveRole === 'super_admin';

  // Strictly scope visible cards:
  // - Students ONLY see their own student record.
  // - Parents ONLY see their own linked child(ren).
  // - Teachers ONLY see their own personal Teacher/Staff ID card (never student directory).
  // - Admins / Super Admins can browse and print cards for students & staff in the school.
  const visibleStudents = useMemo<Student[]>(() => {
    if (isStudentViewer) {
      if (currentUser) {
        const own = resolveOwnStudent(currentUser, students);
        return own ? [own] : [];
      }
      return students.length === 1 ? [students[0]] : [];
    }
    if (isParentViewer) {
      return currentUser ? resolveLinkedStudentsForUser(currentUser, students) : [];
    }
    if (isTeacherViewer) {
      return [];
    }
    return students;
  }, [isStudentViewer, isParentViewer, isTeacherViewer, currentUser, students]);

  const ownTeacherProfile = useMemo<Teacher | null>(() => {
    if (!isTeacherViewer && !isAdminViewer) return null;
    const matched = resolveOwnTeacher(currentUser, teachers);
    if (matched) return matched;
    if (!currentUser) return null;
    // Graceful fallback from AuthUser when teacher directory record isn't linked yet
    return {
      id: currentUser.id,
      schoolId: currentUser.schoolId || school.id,
      teacherIdNumber: currentUser.teacherIdNumber || currentUser.id.slice(0, 10).toUpperCase(),
      fullNameTh: currentUser.fullNameTh || currentUser.email || 'ครูผู้สอน',
      fullNameEn: currentUser.fullNameEn || currentUser.email || 'Faculty Staff',
      positionTitle: currentUser.adminPositionTitle || currentUser.academicStanding || 'ครูผู้สอน',
      gender: currentUser.gender || 'other',
      email: currentUser.email || '',
      phone: currentUser.phone || school.phone || '',
      avatarUrl: currentUser.avatarUrl || '',
      academicDegree: currentUser.academicDegree || '',
      major: currentUser.major || '',
      academicStanding: currentUser.academicStanding || 'ครูผู้สอน',
      department: currentUser.department || currentUser.adminDepartment || 'ฝ่ายวิชาการ',
      teacherLicenseNo: currentUser.teacherLicenseNo || '',
      teachingSubjects: currentUser.teachingSubjects || [],
      homeroomClasses: currentUser.homeroomClasses || (currentUser.homeroomClass ? [currentUser.homeroomClass] : []),
      teachingGrades: currentUser.teachingGrades || [],
    };
  }, [isTeacherViewer, isAdminViewer, currentUser, teachers, school.id, school.phone]);

  const visibleTeachers = useMemo<Teacher[]>(() => {
    if (isTeacherViewer) {
      return ownTeacherProfile ? [ownTeacherProfile] : [];
    }
    if (isAdminViewer) {
      if (teachers.length > 0) return teachers;
      return ownTeacherProfile ? [ownTeacherProfile] : [];
    }
    return [];
  }, [isTeacherViewer, isAdminViewer, teachers, ownTeacherProfile]);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(visibleStudents[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(visibleTeachers[0]?.id || '');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [cardType, setCardType] = useState<'student' | 'staff'>(isTeacherViewer ? 'staff' : 'student');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (isTeacherViewer) {
      setCardType('staff');
    } else if (isStudentViewer || isParentViewer) {
      setCardType('student');
    }
  }, [isTeacherViewer, isStudentViewer, isParentViewer]);

  useEffect(() => {
    if (visibleStudents.length === 0) {
      if (selectedStudentId !== '') setSelectedStudentId('');
      return;
    }
    if (!visibleStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(visibleStudents[0].id);
      setIsFlipped(false);
    }
  }, [visibleStudents, selectedStudentId]);

  useEffect(() => {
    if (visibleTeachers.length === 0) {
      if (selectedTeacherId !== '') setSelectedTeacherId('');
      return;
    }
    if (!visibleTeachers.some((t) => t.id === selectedTeacherId)) {
      setSelectedTeacherId(visibleTeachers[0].id);
      setIsFlipped(false);
    }
  }, [visibleTeachers, selectedTeacherId]);

  const activeCardType: 'student' | 'staff' = isTeacherViewer
    ? 'staff'
    : isAdminViewer
      ? cardType
      : 'student';

  const [backMode, setBackMode] = useState<IdCardBackMode>(() =>
    getSavedIdCardBackMode(school.id, activeCardType),
  );

  useEffect(() => {
    setBackMode(getSavedIdCardBackMode(school.id, activeCardType));
  }, [school.id, activeCardType]);

  const handleSelectBackMode = (nextMode: IdCardBackMode) => {
    setBackMode(nextMode);
    saveIdCardBackMode(school.id, activeCardType, nextMode);
    setIsFlipped(true);
  };

  const selectedStudent: Student | null =
    visibleStudents.find((s) => s.id === selectedStudentId) || visibleStudents[0] || null;

  const selectedTeacher: Teacher | null = isTeacherViewer
    ? ownTeacherProfile
    : visibleTeachers.find((t) => t.id === selectedTeacherId) || visibleTeachers[0] || null;

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return visibleStudents;
    return visibleStudents.filter((s) => {
      return (
        (s.firstNameTh || '').toLowerCase().includes(q) ||
        (s.lastNameTh || '').toLowerCase().includes(q) ||
        (s.firstNameEn || '').toLowerCase().includes(q) ||
        (s.lastNameEn || '').toLowerCase().includes(q) ||
        (s.studentIdNumber || '').toLowerCase().includes(q) ||
        (s.room || '').toLowerCase().includes(q)
      );
    });
  }, [visibleStudents, searchTerm]);

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return visibleTeachers;
    return visibleTeachers.filter((t) => {
      return (
        (t.fullNameTh || '').toLowerCase().includes(q) ||
        (t.fullNameEn || '').toLowerCase().includes(q) ||
        (t.teacherIdNumber || '').toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q) ||
        (t.positionTitle || '').toLowerCase().includes(q)
      );
    });
  }, [visibleTeachers, searchTerm]);

  const showSelectorSidebar = isAdminViewer || (isParentViewer && visibleStudents.length > 1);
  const activePerson = activeCardType === 'staff' ? selectedTeacher : selectedStudent;
  const ownStudentRecord = useMemo(
    () => (currentUser ? resolveOwnStudent(currentUser, visibleStudents) : undefined),
    [currentUser, visibleStudents]
  );
  const isOwnStudentCard = Boolean(
    !isParentViewer &&
      selectedStudent &&
      (isStudentViewer || (ownStudentRecord && ownStudentRecord.id === selectedStudent.id))
  );
  const isOwnTeacherCard = Boolean(
    selectedTeacher && ownTeacherProfile && ownTeacherProfile.id === selectedTeacher.id
  );
  const hasTeacherRow = Boolean(selectedTeacher && teachers.some((t) => t.id === selectedTeacher.id));
  const selectedStudentAvatar =
    selectedStudent?.avatarUrl || (isOwnStudentCard ? currentUser?.avatarUrl : '') || '';
  const selectedTeacherAvatar =
    selectedTeacher?.avatarUrl || (isOwnTeacherCard ? currentUser?.avatarUrl : '') || '';
  const activeCardAvatarUrl = activeCardType === 'staff' ? selectedTeacherAvatar : selectedStudentAvatar;
  const canUpdateActivePhoto =
    activeCardType === 'staff'
      ? Boolean(selectedTeacher && ((onUpdateTeacher && hasTeacherRow) || (isOwnTeacherCard && onUpdateOwnAvatar)))
      : Boolean(selectedStudent && (onUpdateStudent || (isOwnStudentCard && onUpdateOwnAvatar)));

  return (
    <div className={`${getModuleTone('student_id_cards')} lg:h-full flex flex-col min-h-0 lg:overflow-hidden space-y-2`}>
      {/* Compact Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 py-2 app-page-header text-[var(--color-text-title)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="tone-chip w-7 h-7 rounded-lg shrink-0">
            <CreditCard className="w-4 h-4" />
          </span>
          <h1 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] flex items-center gap-2 truncate">
            <span className="truncate">
              {isTeacherViewer
                ? (lang === 'th' ? 'บัตรประจำตัวครู / บุคลากรของฉัน' : 'My Staff ID Card')
                : isStudentViewer
                  ? (lang === 'th' ? 'บัตรประจำตัวนักเรียนของฉัน' : 'My Student ID Card')
                  : (lang === 'th' ? 'บัตรประจำตัวดิจิทัล' : 'Virtual ID Card')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full tone-chip shrink-0 font-bold">
              Smart NFC &amp; QR
            </span>
          </h1>
        </div>

        {isAdminViewer && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* Card Type Toggle — Admin Only */}
            <div className="seg-tab-group">
              <button
                type="button"
                data-active={activeCardType === 'student'}
                onClick={() => {
                  setCardType('student');
                  setSearchTerm('');
                  setIsFlipped(false);
                }}
                className="seg-tab-btn"
              >
                {lang === 'th' ? `บัตรนักเรียน (${visibleStudents.length})` : `Students (${visibleStudents.length})`}
              </button>
              <button
                type="button"
                data-active={activeCardType === 'staff'}
                onClick={() => {
                  setCardType('staff');
                  setSearchTerm('');
                  setIsFlipped(false);
                }}
                className="seg-tab-btn"
              >
                {lang === 'th' ? `บัตรครู/บุคลากร (${visibleTeachers.length})` : `Staff (${visibleTeachers.length})`}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="btn-tool-tone px-2.5 py-1.5"
            >
              <Printer className="w-3.5 h-3.5 tone-text" />
              <span>
                {activeCardType === 'staff'
                  ? (lang === 'th' ? 'พิมพ์บัตรครู (A4)' : 'Print Staff Sheet')
                  : (lang === 'th' ? 'พิมพ์บัตรนักเรียน (A4)' : 'Print Student Sheet')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Showcase */}
      <div
        className={`flex-1 min-h-0 grid grid-cols-1 ${
          showSelectorSidebar ? 'lg:grid-cols-3' : ''
        } gap-3 overflow-y-auto lg:overflow-hidden pb-4`}
      >
        {/* Left Column: Student / Staff Selector List (Admin, or Parent with multiple children) */}
        {showSelectorSidebar && (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs p-3 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden text-[var(--color-text-title)]">
            <div className="shrink-0 flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-title)]">
                {activeCardType === 'staff'
                  ? (lang === 'th' ? 'เลือกบัตรครู/บุคลากร' : 'Select Staff')
                  : (lang === 'th' ? 'เลือกบัตรนักเรียน' : 'Select Student')}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
                {activeCardType === 'staff' ? filteredTeachers.length : filteredStudents.length} รายการ
              </span>
            </div>

            {isAdminViewer && (
              <div className="shrink-0 relative my-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeCardType === 'staff'
                      ? (lang === 'th' ? 'ค้นหารหัส / ชื่อครู...' : 'Search staff...')
                      : (lang === 'th' ? 'ค้นหารหัส / ชื่อ...' : 'Search student...')
                  }
                  className="w-full bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-1">
              {activeCardType === 'staff' ? (
                <PagedList
                  items={filteredTeachers}
                  pageSize={5}
                  emptyState={
                    <p className="py-2 text-xs text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ไม่พบบุคลากร' : 'No staff found.'}
                    </p>
                  }
                  renderItem={(t) => {
                    const isSelected = t.id === selectedTeacher?.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeacherId(t.id);
                          setIsFlipped(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-text-title)] shadow-xs'
                            : 'hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border border-transparent'
                        }`}
                      >
                        {t.avatarUrl ? (
                          <img
                            src={t.avatarUrl}
                            alt={t.fullNameTh}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] shrink-0">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {lang === 'th' ? t.fullNameTh : t.fullNameEn || t.fullNameTh}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                            {t.teacherIdNumber} • {t.department || t.positionTitle || '-'}
                          </p>
                        </div>
                      </button>
                    );
                  }}
                />
              ) : (
                <PagedList
                  items={filteredStudents}
                  pageSize={5}
                  emptyState={
                    <p className="py-2 text-xs text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ไม่พบนักเรียน' : 'No students found.'}
                    </p>
                  }
                  renderItem={(stu) => {
                    const isSelected = stu.id === selectedStudent?.id;
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(stu.id);
                          setIsFlipped(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-text-title)] shadow-xs'
                            : 'hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border border-transparent'
                        }`}
                      >
                        {stu.avatarUrl ? (
                          <img
                            src={stu.avatarUrl}
                            alt={stu.firstNameTh}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {lang === 'th' ? `${stu.firstNameTh} ${stu.lastNameTh}` : `${stu.firstNameEn} ${stu.lastNameEn}`}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {stu.studentIdNumber} • {stu.room}
                          </p>
                        </div>
                      </button>
                    );
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Center & Right: 3D Flip Card View */}
        <div
          className={`${
            showSelectorSidebar ? 'lg:col-span-2' : ''
          } flex flex-col items-center justify-center p-3 sm:p-6 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3 overflow-hidden text-[var(--color-text-title)]`}
        >
          {!activePerson ? (
            <div className="max-w-sm text-center py-5 px-4 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {activeCardType === 'staff'
                  ? (lang === 'th' ? 'ไม่พบข้อมูลบัตรประจำตัวบุคลากรของคุณ' : 'No Staff ID Record Found')
                  : (lang === 'th' ? 'ไม่พบข้อมูลบัตรประจำตัวของคุณ' : 'No Student ID Record Found')}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {isStudentViewer
                  ? (lang === 'th'
                      ? 'บัญชีนักเรียนของคุณยังไม่ได้ผูกกับระเบียนนักเรียน กรุณาติดต่อผู้ดูแลระบบโรงเรียน'
                      : 'Your account is not linked to a student record yet. Please contact your school administrator.')
                  : activeCardType === 'staff'
                    ? (lang === 'th'
                        ? 'ยังไม่มีข้อมูลครูหรือบุคลากรสำหรับแสดงบัตรประจำตัวดิจิทัล'
                        : 'No staff records available to display.')
                    : (lang === 'th'
                        ? 'ยังไม่มีข้อมูลนักเรียนสำหรับแสดงบัตรประจำตัวดิจิทัล'
                        : 'No student records available to display.')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between w-full max-w-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-xs text-[var(--color-text-body)] font-semibold">
                    {isFlipped
                      ? (lang === 'th' ? 'ด้านหลังบัตร (Back)' : 'Back Side')
                      : (lang === 'th' ? 'ด้านหน้าบัตร (Front)' : 'Front Side')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs text-[var(--color-primary-text)] font-semibold border border-[var(--color-border)] transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'พลิกดูอีกด้าน' : 'Flip Card'}</span>
                </button>
              </div>

              {/* Selectable Back-Side Mode Bar */}
              <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1.5 space-y-1">
                <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                  <span>{lang === 'th' ? 'รูปแบบด้านหลังบัตร (เลือกได้)' : 'Back-Side Layout'}</span>
                  <span className="text-[var(--color-primary-text)]">
                    {activeCardType === 'staff'
                      ? (lang === 'th' ? 'บัตรครู/บุคลากร' : 'Staff Card')
                      : (lang === 'th' ? 'บัตรนักเรียน' : 'Student Card')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {ID_CARD_BACK_MODE_OPTIONS.map((opt) => {
                    const isSelected = backMode === opt.id;
                    const label =
                      lang === 'th'
                        ? activeCardType === 'staff'
                          ? opt.shortThStaff
                          : opt.shortThStudent
                        : activeCardType === 'staff'
                          ? opt.shortEnStaff
                          : opt.shortEnStudent;
                    const Icon =
                      opt.id === 'timetable'
                        ? CalendarDays
                        : opt.id === 'medical_emergency'
                          ? HeartPulse
                          : opt.id === 'qr_gate_pass'
                            ? QrCode
                            : FileText;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectBackMode(opt.id)}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                            : 'bg-[var(--color-card)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                        title={
                          lang === 'th'
                            ? activeCardType === 'staff'
                              ? opt.labelThStaff
                              : opt.labelThStudent
                            : activeCardType === 'staff'
                              ? opt.labelEnStaff
                              : opt.labelEnStudent
                        }
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Realistic Card Container (ISO/IEC 7810 ID-1 CR80 proportions) */}
              <div className="perspective-1000 w-full max-w-md h-[288px] sm:h-[296px]">
                <div
                  className={`w-full h-full relative duration-500 transform-style-3d cursor-pointer transition-transform ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* FRONT OF CARD */}
                  <div
                    className={`absolute inset-0 backface-hidden rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden border flex flex-col justify-between text-white ${
                      activeCardType === 'staff'
                        ? 'border-emerald-400/50 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950'
                        : 'border-cyan-400/50 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950'
                    }`}
                  >
                    {/* Subtle Ambient Accent */}
                    <div
                      className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-2xl pointer-events-none ${
                        activeCardType === 'staff' ? 'bg-amber-400/10' : 'bg-cyan-500/15'
                      }`}
                    />
                    <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

                    {/* Card Top: School Branding & Clear Role Distinction */}
                    <div className="flex items-center justify-between relative z-10 border-b border-white/15 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {school.logoUrl ? (
                          <img
                            src={school.logoUrl}
                            alt={school.nameTh}
                            className="w-8 h-8 rounded-lg object-cover border border-white/30 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow text-[10px] shrink-0">
                            {school.code.slice(0, 3) || 'SCH'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold tracking-tight text-white line-clamp-1">{school.nameTh}</h4>
                          <p className="text-[9px] text-cyan-200 font-mono tracking-wider uppercase truncate">
                            {school.nameEn || school.code}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${
                          activeCardType === 'staff'
                            ? 'bg-emerald-800/90 text-amber-200 border-amber-300/60'
                            : 'bg-cyan-900/90 text-cyan-100 border-cyan-300/60'
                        }`}
                      >
                        {activeCardType === 'staff' ? 'TEACHER / STAFF ID' : 'STUDENT ID'}
                      </span>
                    </div>

                    {/* Card Middle: Real Photo + Real Metadata */}
                    <div className="flex items-center gap-3.5 relative z-10 my-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canUpdateActivePhoto) setShowPhotoModal(true);
                        }}
                        className={`relative shrink-0 group ${canUpdateActivePhoto ? 'cursor-pointer' : ''}`}
                        title={canUpdateActivePhoto ? 'แตะเพื่อถ่ายรูปสด หรืออัปโหลดรูปภาพใหม่ลงบัตร' : undefined}
                      >
                        {activeCardAvatarUrl ? (
                          <img
                            src={activeCardAvatarUrl}
                            alt={activeCardType === 'staff' ? selectedTeacher?.fullNameTh : selectedStudent?.firstNameTh || 'ID Photo'}
                            className={`w-18 h-22 sm:w-20 sm:h-24 rounded-xl object-cover border-2 shadow-md group-hover:ring-2 transition ${
                              activeCardType === 'staff'
                                ? 'border-amber-300/75 group-hover:ring-amber-300'
                                : 'border-cyan-400/75 group-hover:ring-cyan-300'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-18 h-22 sm:w-20 sm:h-24 rounded-xl border-2 shadow-md bg-slate-800 flex items-center justify-center ${
                              activeCardType === 'staff'
                                ? 'border-amber-300/70 text-amber-200'
                                : 'border-cyan-400/70 text-cyan-200'
                            }`}
                          >
                            {activeCardType === 'staff' ? <GraduationCap className="w-9 h-9" /> : <User className="w-9 h-9" />}
                          </div>
                        )}
                        {canUpdateActivePhoto && (
                          <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md transition">
                            <Camera className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {activeCardType === 'staff' && selectedTeacher ? (
                        <div className="space-y-1 text-xs min-w-0 flex-1">
                          <div>
                            <h3 className="text-sm font-bold text-white truncate">
                              {lang === 'th' ? selectedTeacher.fullNameTh : selectedTeacher.fullNameEn || selectedTeacher.fullNameTh}
                            </h3>
                            <p className="text-[10px] text-amber-200 font-medium truncate">
                              {selectedTeacher.fullNameEn || selectedTeacher.academicStanding || '-'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-200 pt-0.5">
                            <div className="truncate">
                              <span className="text-slate-300">รหัสครู: </span>
                              <strong className="font-mono text-amber-200">{selectedTeacher.teacherIdNumber || '-'}</strong>
                            </div>
                            <div className="truncate">
                              <span className="text-slate-300">ตำแหน่ง: </span>
                              <strong className="text-white">{selectedTeacher.positionTitle || selectedTeacher.academicStanding || 'ครูผู้สอน'}</strong>
                            </div>
                            <div className="col-span-2 truncate">
                              <span className="text-slate-300">กลุ่มสาระ/ฝ่าย: </span>
                              <strong className="text-white">{selectedTeacher.department || '-'}</strong>
                            </div>
                            <div className="col-span-2 truncate">
                              <span className="text-slate-300">ที่ปรึกษา: </span>
                              <strong className="text-emerald-200">
                                {selectedTeacher.homeroomClasses?.length
                                  ? selectedTeacher.homeroomClasses.join(', ')
                                  : '-'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ) : selectedStudent ? (
                        <div className="space-y-1 text-xs min-w-0 flex-1">
                          <div>
                            <h3 className="text-sm font-bold text-white truncate">
                              {lang === 'th'
                                ? `${selectedStudent.firstNameTh || ''} ${selectedStudent.lastNameTh || ''}`.trim() || school.nameTh
                                : `${selectedStudent.firstNameEn || ''} ${selectedStudent.lastNameEn || ''}`.trim() || school.nameEn}
                            </h3>
                            <p className="text-[10px] text-slate-200 font-medium truncate">
                              {`${selectedStudent.firstNameEn || ''} ${selectedStudent.lastNameEn || ''}`.trim() || '-'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-200 pt-0.5">
                            <div className="truncate">
                              <span className="text-slate-300">รหัส: </span>
                              <strong className="font-mono text-cyan-200">{selectedStudent.studentIdNumber || '-'}</strong>
                            </div>
                            <div className="truncate">
                              <span className="text-slate-300">หมู่เลือด: </span>
                              <strong className="font-mono text-rose-200">{selectedStudent.bloodType || '-'}</strong>
                            </div>
                            <div className="col-span-2 truncate">
                              <span className="text-slate-300">ชั้นเรียน: </span>
                              <strong className="text-white">
                                {[selectedStudent.gradeLevel, selectedStudent.room].filter(Boolean).join(' ') || '-'}
                              </strong>
                            </div>
                            <div className="col-span-2 truncate">
                              <span className="text-slate-300">เลขบัตร ปชช.: </span>
                              <strong className="font-mono text-slate-100">
                                {formatMaskedNationalId(selectedStudent.nationalId)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Card Bottom: REAL Scannable Code 128 Barcode + REAL Scannable QR Code Matrix */}
                    <div
                      className="flex items-center justify-between gap-2 pt-2 border-t border-white/15 relative z-10 text-[9px] text-slate-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Barcode128Svg
                          value={
                            activeCardType === 'staff'
                              ? selectedTeacher?.teacherIdNumber || selectedTeacher?.id || 'TCH-0001'
                              : selectedStudent?.studentIdNumber || selectedStudent?.id || 'STU-0001'
                          }
                          height={22}
                          className="max-w-[175px]"
                          label={
                            activeCardType === 'staff'
                              ? `บาร์โค้ดรหัสครู ${selectedTeacher?.teacherIdNumber}`
                              : `บาร์โค้ดรหัสนักเรียน ${selectedStudent?.studentIdNumber}`
                          }
                        />
                        <div className="hidden sm:block text-[8px] text-slate-300 leading-tight tabular-nums">
                          <span>{lang === 'th' ? `ปีการศึกษา ${school.academicYear || '2569'}` : `AY ${school.academicYear || '2569'}`}</span>
                          <span className="block font-mono text-slate-200">{school.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-right text-[8px] leading-tight text-cyan-100 hidden sm:inline">
                          {activeCardType === 'staff' ? 'สแกนลงเวลา' : 'สแกนเช็คชื่อ'}
                          <br />
                          Code 128 / QR
                        </span>
                        <QrCodeMatrix
                          value={
                            activeCardType === 'staff' && selectedTeacher
                              ? `EDUVERSE:STF:${selectedTeacher.teacherIdNumber || selectedTeacher.id}:${school.code}`
                              : `EDUVERSE:STU:${selectedStudent?.studentIdNumber || selectedStudent?.id || ''}:${school.code}`
                          }
                          size={50}
                          label={
                            activeCardType === 'staff'
                              ? `QR บัตรครู ${selectedTeacher?.teacherIdNumber}`
                              : `QR บัตรนักเรียน ${selectedStudent?.studentIdNumber}`
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* BACK OF CARD */}
                  <IdCardBackContent
                    mode={backMode}
                    personType={activeCardType}
                    student={selectedStudent}
                    teacher={selectedTeacher}
                    teachers={teachers}
                    school={school}
                    lang={lang}
                    timetableSlots={timetableSlots}
                    courses={courses}
                    schoolPeriods={schoolPeriods}
                    variant="digital"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {!isAdminViewer && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <span>{lang === 'th' ? 'พิมพ์บัตรประจำตัว' : 'Print ID Card'}</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)] text-center flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                <span>
                  {lang === 'th'
                    ? 'บาร์โค้ด Code 128 และ QR Code เป็นรหัสจริง สแกนเข้า-ออกโรงเรียนได้ทันที · แตะหน้าบัตรเพื่อดูด้านหลัง'
                    : 'Real Code 128 barcode & QR code ready for school gate scanning'}
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Batch ID Card Print Modal (Admin Only — supports BOTH Students & Staff) */}
      {isAdminViewer && (
        <BatchIdCardPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          students={visibleStudents}
          teachers={visibleTeachers}
          initialPersonType={activeCardType}
          initialBackMode={backMode}
          timetableSlots={timetableSlots}
          courses={courses}
          schoolPeriods={schoolPeriods}
          school={school}
          lang={lang}
        />
      )}

      {/* Image Capture & Upload Modal */}
      {activeCardType === 'staff' && selectedTeacher && ((onUpdateTeacher && hasTeacherRow) || (isOwnTeacherCard && onUpdateOwnAvatar)) ? (
        <ImageCaptureUploadModal
          isOpen={showPhotoModal}
          currentImageUrl={selectedTeacherAvatar}
          title={`ถ่ายรูปสดหรือเปลี่ยนรูปบนบัตร: ${selectedTeacher.fullNameTh}`}
          onSelectImage={(newUrl) => {
            if (onUpdateTeacher && hasTeacherRow) {
              onUpdateTeacher({
                ...selectedTeacher,
                avatarUrl: newUrl,
              });
            } else if (isOwnTeacherCard && onUpdateOwnAvatar) {
              onUpdateOwnAvatar(newUrl);
            }
            emitAppToast({
              tone: 'success',
              message: lang === 'th'
                ? 'บันทึกรูปบัตรประจำตัวและซิงค์กับรูปโปรไฟล์เรียบร้อยแล้ว'
                : 'ID card and profile photo saved.',
            });
          }}
          onClose={() => setShowPhotoModal(false)}
        />
      ) : selectedStudent && (onUpdateStudent || (isOwnStudentCard && onUpdateOwnAvatar)) ? (
        <ImageCaptureUploadModal
          isOpen={showPhotoModal}
          currentImageUrl={selectedStudentAvatar}
          title={`ถ่ายรูปสดหรือเปลี่ยนรูปบนบัตร: ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`}
          onSelectImage={(newUrl) => {
            if (onUpdateStudent) {
              onUpdateStudent({
                ...selectedStudent,
                avatarUrl: newUrl,
              });
            } else if (isOwnStudentCard && onUpdateOwnAvatar) {
              onUpdateOwnAvatar(newUrl);
            }
            emitAppToast({
              tone: 'success',
              message: lang === 'th'
                ? 'บันทึกรูปบัตรประจำตัวและซิงค์กับรูปโปรไฟล์เรียบร้อยแล้ว'
                : 'ID card and profile photo saved.',
            });
          }}
          onClose={() => setShowPhotoModal(false)}
        />
      ) : null}
    </div>
  );
};
