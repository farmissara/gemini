import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  RotateCw,
  User,
  Search,
  AlertCircle,
  GraduationCap,
  CalendarDays,
  HeartPulse,
  QrCode,
  FileText,
  Columns2,
  Layers,
  Scissors,
  CheckSquare,
  Square,
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
import { IdCardFrontContent } from '../components/id-card/IdCardFrontContent';
import { IdCardBackContent } from '../components/id-card/IdCardBackContent';
import { getModuleTone } from '../lib/moduleTheme';
import { resolveLinkedStudentsForUser, resolveOwnStudent, resolveOwnTeacher } from '../lib/attendanceScope';
import {
  ID_CARD_BACK_MODE_OPTIONS,
  getSavedIdCardBackMode,
  saveIdCardBackMode,
  type IdCardBackMode,
} from '../lib/idCardBackLayout';
import { emitAppToast } from '../components/common/ToastProvider';
import { FutureNavIcon } from '../components/common/FutureIcon';

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
  const effectiveRole: UserRole = currentRole || currentUser?.role || 'student';
  const isStudentViewer = effectiveRole === 'student';
  const isParentViewer = effectiveRole === 'parent';
  const isTeacherViewer = effectiveRole === 'teacher';
  const isAdminViewer = effectiveRole === 'admin' || effectiveRole === 'super_admin';

  // Strictly scope visible cards:
  // - Students ONLY see their own student record.
  // - Parents ONLY see their own linked child(ren).
  // - Teachers ONLY see their own personal Teacher/Staff ID card.
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

  const canBatchPrint =
    isAdminViewer ||
    (isTeacherViewer && Boolean(currentUser?.isSchoolAdmin)) ||
    (isParentViewer && visibleStudents.length > 1);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(visibleStudents[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(visibleTeachers[0]?.id || '');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'flip' | 'side_by_side'>('side_by_side');
  const [cardType, setCardType] = useState<'student' | 'staff'>(isTeacherViewer ? 'staff' : 'student');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBatchStudentIds, setSelectedBatchStudentIds] = useState<Set<string>>(
    () => new Set(visibleStudents.map((s) => s.id)),
  );
  const [selectedBatchTeacherIds, setSelectedBatchTeacherIds] = useState<Set<string>>(
    () => new Set(visibleTeachers.map((t) => t.id)),
  );
  const [batchStudentSelectionTouched, setBatchStudentSelectionTouched] = useState(false);
  const [batchTeacherSelectionTouched, setBatchTeacherSelectionTouched] = useState(false);

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

  useEffect(() => {
    if (!batchStudentSelectionTouched) {
      setSelectedBatchStudentIds(new Set(visibleStudents.map((s) => s.id)));
      return;
    }
    const valid = new Set(visibleStudents.map((s) => s.id));
    setSelectedBatchStudentIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [visibleStudents, batchStudentSelectionTouched]);

  useEffect(() => {
    if (!batchTeacherSelectionTouched) {
      setSelectedBatchTeacherIds(new Set(visibleTeachers.map((t) => t.id)));
      return;
    }
    const valid = new Set(visibleTeachers.map((t) => t.id));
    setSelectedBatchTeacherIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [visibleTeachers, batchTeacherSelectionTouched]);

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
    if (displayMode === 'flip') {
      setIsFlipped(true);
    }
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
    [currentUser, visibleStudents],
  );
  const isOwnStudentCard = Boolean(
    !isParentViewer &&
      selectedStudent &&
      (isStudentViewer || (ownStudentRecord && ownStudentRecord.id === selectedStudent.id)),
  );
  const isOwnTeacherCard = Boolean(
    selectedTeacher && ownTeacherProfile && ownTeacherProfile.id === selectedTeacher.id,
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

  const numericAcademicYear = Number(school.academicYear || '2569') || 2569;
  const issueTermLabel = `05/${numericAcademicYear}`;
  const expiryTermLabel = `03/${numericAcademicYear + 3}`;

  const handlePrintSingleCard = () => {
    if (!activePerson) return;
    window.print();
  };

  return (
    <div className={`${getModuleTone('student_id_cards')} lg:h-full flex flex-col min-h-0 lg:overflow-hidden space-y-2`}>
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 py-2 app-page-header text-[var(--color-text-title)] no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="tone-chip w-9 h-9 rounded-xl shrink-0">
            <FutureNavIcon tab="student_id_cards" size={19} active />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
              {isTeacherViewer
                ? (lang === 'th' ? 'บัตรประจำตัวครู / บุคลากรของฉัน' : 'My Staff ID Card')
                : isStudentViewer
                  ? (lang === 'th' ? 'บัตรประจำตัวนักเรียนของฉัน' : 'My Student ID Card')
                  : (lang === 'th' ? 'บัตรประจำตัวดิจิทัล' : 'Virtual ID Card')}
            </h1>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              {lang === 'th'
                ? 'มาตรฐาน CR80 · Code 128 และ QR Code สแกนจริง'
                : 'CR80 Standard · Scannable Code 128 & QR'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {isAdminViewer && (
            <>
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

              {activePerson && (
                <button
                  type="button"
                  onClick={handlePrintSingleCard}
                  className="btn-tool-neutral px-2.5 py-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'พิมพ์บัตรนี้' : 'Print This Card'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                disabled={
                  activeCardType === 'staff'
                    ? selectedBatchTeacherIds.size === 0
                    : selectedBatchStudentIds.size === 0
                }
                className="btn-action-primary px-3 py-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {activeCardType === 'staff'
                    ? (lang === 'th'
                        ? `พิมพ์บัตรที่เลือกทั้งหมด (${selectedBatchTeacherIds.size} ใบ)`
                        : `Print All Selected (${selectedBatchTeacherIds.size})`)
                    : (lang === 'th'
                        ? `พิมพ์บัตรที่เลือกทั้งหมด (${selectedBatchStudentIds.size} ใบ)`
                        : `Print All Selected (${selectedBatchStudentIds.size})`)}
                </span>
              </button>
            </>
          )}

          {!isAdminViewer && activePerson && (
            <>
              <button
                type="button"
                onClick={handlePrintSingleCard}
                className="btn-action-primary px-3 py-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'พิมพ์บัตรหน้า-หลัง (A4)' : 'Print Front & Back'}</span>
              </button>
              {canBatchPrint && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="btn-tool-neutral px-3 py-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'th'
                      ? `พิมพ์บัตรที่เลือกทั้งหมด (${isParentViewer ? selectedBatchStudentIds.size : students.length} ใบ)`
                      : `Print All Selected (${isParentViewer ? selectedBatchStudentIds.size : students.length})`}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Interactive Showcase */}
      <div
        className={`flex-1 min-h-0 grid grid-cols-1 ${
          showSelectorSidebar ? 'lg:grid-cols-3' : ''
        } gap-3 overflow-y-auto lg:overflow-hidden pb-4 no-print`}
      >
        {/* Left Column: Student / Staff Selector List */}
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
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
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

            {canBatchPrint && (isAdminViewer || isParentViewer) && (
              <div className="shrink-0 flex items-center justify-between gap-2 pb-2 mb-1 border-b border-[var(--color-border)] text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (activeCardType === 'staff') {
                      setBatchTeacherSelectionTouched(true);
                      setSelectedBatchTeacherIds((prev) => {
                        const next = new Set(prev);
                        filteredTeachers.forEach((t) => next.add(t.id));
                        return next;
                      });
                    } else {
                      setBatchStudentSelectionTouched(true);
                      setSelectedBatchStudentIds((prev) => {
                        const next = new Set(prev);
                        filteredStudents.forEach((s) => next.add(s.id));
                        return next;
                      });
                    }
                  }}
                  className="inline-flex items-center gap-1 font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'th'
                      ? `เลือกทั้งหมด (${activeCardType === 'staff' ? filteredTeachers.length : filteredStudents.length})`
                      : `Select All (${activeCardType === 'staff' ? filteredTeachers.length : filteredStudents.length})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeCardType === 'staff') {
                      setBatchTeacherSelectionTouched(true);
                      setSelectedBatchTeacherIds((prev) => {
                        const next = new Set(prev);
                        filteredTeachers.forEach((t) => next.delete(t.id));
                        return next;
                      });
                    } else {
                      setBatchStudentSelectionTouched(true);
                      setSelectedBatchStudentIds((prev) => {
                        const next = new Set(prev);
                        filteredStudents.forEach((s) => next.delete(s.id));
                        return next;
                      });
                    }
                  }}
                  className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                >
                  {lang === 'th' ? 'ล้างที่เลือก' : 'Clear'}
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-1">
              {activeCardType === 'staff' ? (
                <PagedList
                  items={filteredTeachers}
                  pageSize={6}
                  emptyState={
                    <p className="py-2 text-xs text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ไม่พบบุคลากร' : 'No staff found.'}
                    </p>
                  }
                  renderItem={(t) => {
                    const isSelected = t.id === selectedTeacher?.id;
                    const isBatchChecked = selectedBatchTeacherIds.has(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`w-full flex items-center gap-2 p-2 rounded-xl transition border ${
                          isSelected
                            ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-text-title)] shadow-xs'
                            : 'hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-transparent'
                        }`}
                      >
                        {canBatchPrint && isAdminViewer && (
                          <button
                            type="button"
                            onClick={() => {
                              setBatchTeacherSelectionTouched(true);
                              setSelectedBatchTeacherIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(t.id)) next.delete(t.id);
                                else next.add(t.id);
                                return next;
                              });
                            }}
                            aria-label={`เลือกพิมพ์บัตร ${t.fullNameTh}`}
                            className="p-0.5 rounded text-[var(--color-primary)] hover:bg-[var(--color-card)] cursor-pointer shrink-0"
                          >
                            {isBatchChecked ? (
                              <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--color-text-muted)]" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherId(t.id);
                            setIsFlipped(false);
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
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
                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono truncate tabular-nums">
                              {t.teacherIdNumber} · {t.department || t.positionTitle || '-'}
                            </p>
                          </div>
                        </button>
                      </div>
                    );
                  }}
                />
              ) : (
                <PagedList
                  items={filteredStudents}
                  pageSize={6}
                  emptyState={
                    <p className="py-2 text-xs text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ไม่พบนักเรียน' : 'No students found.'}
                    </p>
                  }
                  renderItem={(stu) => {
                    const isSelected = stu.id === selectedStudent?.id;
                    const isBatchChecked = selectedBatchStudentIds.has(stu.id);
                    return (
                      <div
                        key={stu.id}
                        className={`w-full flex items-center gap-2 p-2 rounded-xl transition border ${
                          isSelected
                            ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-text-title)] shadow-xs'
                            : 'hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-transparent'
                        }`}
                      >
                        {canBatchPrint && (isAdminViewer || isParentViewer) && (
                          <button
                            type="button"
                            onClick={() => {
                              setBatchStudentSelectionTouched(true);
                              setSelectedBatchStudentIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(stu.id)) next.delete(stu.id);
                                else next.add(stu.id);
                                return next;
                              });
                            }}
                            aria-label={`เลือกพิมพ์บัตร ${stu.firstNameTh} ${stu.lastNameTh}`}
                            className="p-0.5 rounded text-[var(--color-primary)] hover:bg-[var(--color-card)] cursor-pointer shrink-0"
                          >
                            {isBatchChecked ? (
                              <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--color-text-muted)]" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(stu.id);
                            setIsFlipped(false);
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2.5 text-left cursor-pointer"
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
                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono tabular-nums">
                              {stu.studentIdNumber} · {stu.room}
                            </p>
                          </div>
                        </button>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Center & Right: Card Display Stage */}
        <div
          className={`${
            showSelectorSidebar ? 'lg:col-span-2' : ''
          } flex flex-col items-center justify-start p-3 sm:p-5 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-y-auto text-[var(--color-text-title)]`}
        >
          {!activePerson ? (
            <div className="max-w-sm text-center py-8 px-4 space-y-2 my-auto">
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
            <div className="w-full flex flex-col items-center space-y-3 my-auto">
              {/* Top Stage Controls: Display Mode (Flip vs Side-by-Side) + Flip Button */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 w-full ${
                  displayMode === 'side_by_side' ? 'max-w-4xl' : 'max-w-[460px]'
                }`}
              >
                <div className="seg-tab-group">
                  <button
                    type="button"
                    data-active={displayMode === 'side_by_side'}
                    onClick={() => setDisplayMode('side_by_side')}
                    className="seg-tab-btn !min-h-[28px] !px-2.5 !py-1 !text-[11px]"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'แสดงคู่หน้า-หลัง' : 'Front & Back Grid'}</span>
                  </button>
                  <button
                    type="button"
                    data-active={displayMode === 'flip'}
                    onClick={() => setDisplayMode('flip')}
                    className="seg-tab-btn !min-h-[28px] !px-2.5 !py-1 !text-[11px]"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'พลิกหน้า-หลัง (3D)' : '3D Flip'}</span>
                  </button>
                </div>

                {displayMode === 'flip' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">
                      {isFlipped
                        ? (lang === 'th' ? 'ด้านหลังบัตร' : 'Back Side')
                        : (lang === 'th' ? 'ด้านหน้าบัตร' : 'Front Side')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFlipped((prev) => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs text-[var(--color-primary-text)] font-semibold border border-[var(--color-border)] transition cursor-pointer whitespace-nowrap"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'พลิกดูอีกด้าน' : 'Flip Card'}</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'แสดงด้านหน้าและด้านหลังพร้อมกัน' : 'Front & back shown side by side'}
                  </span>
                )}
              </div>

              {/* Selectable Back-Side Mode Bar */}
              <div
                className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1.5 space-y-1 ${
                  displayMode === 'side_by_side' ? 'max-w-4xl' : 'max-w-[460px]'
                }`}
              >
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
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer border whitespace-nowrap ${
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

              {/* Card Display: Non-mirroring Flip OR Side-by-Side */}
              {displayMode === 'flip' ? (
                <div className="id-card-scene w-full max-w-[460px] h-[300px] sm:h-[306px]">
                  <div
                    className={`id-card-flipper cursor-pointer ${isFlipped ? 'is-flipped' : ''}`}
                    onClick={() => setIsFlipped((prev) => !prev)}
                  >
                    <div className="id-card-face id-card-face-front" aria-hidden={isFlipped}>
                      <IdCardFrontContent
                        personType={activeCardType}
                        student={selectedStudent}
                        teacher={selectedTeacher}
                        school={school}
                        lang={lang}
                        variant="digital"
                        avatarUrl={activeCardAvatarUrl}
                        canUpdatePhoto={canUpdateActivePhoto}
                        onRequestPhotoUpdate={() => setShowPhotoModal(true)}
                      />
                    </div>

                    <div className="id-card-face id-card-face-back" aria-hidden={!isFlipped}>
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
                </div>
              ) : (
                <div
                  className={`w-full max-w-4xl grid grid-cols-1 ${
                    showSelectorSidebar ? 'xl:grid-cols-2' : 'md:grid-cols-2'
                  } gap-4 items-start`}
                >
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] text-center">
                      {lang === 'th' ? 'ด้านหน้าบัตร (Front)' : 'Front Side'}
                    </p>
                    <div className="w-full max-w-[440px] mx-auto h-[296px] sm:h-[302px]">
                      <IdCardFrontContent
                        personType={activeCardType}
                        student={selectedStudent}
                        teacher={selectedTeacher}
                        school={school}
                        lang={lang}
                        variant="digital"
                        avatarUrl={activeCardAvatarUrl}
                        canUpdatePhoto={canUpdateActivePhoto}
                        onRequestPhotoUpdate={() => setShowPhotoModal(true)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] text-center">
                      {lang === 'th' ? 'ด้านหลังบัตร (Back)' : 'Back Side'}
                    </p>
                    <div className="w-full max-w-[440px] mx-auto h-[296px] sm:h-[302px]">
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
                </div>
              )}

              <p className="text-[11px] text-[var(--color-text-muted)] text-center max-w-md">
                {lang === 'th'
                  ? 'บาร์โค้ด Code 128 และ QR Code เป็นรหัสจริง สแกนเข้า-ออกโรงเรียนได้ทันที · แตะที่บัตรเพื่อพลิกดูอีกด้าน'
                  : 'Real Code 128 barcode & QR code ready for school gate scanning · Click card to flip'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Single-Card CR80 A4 Print Sheet (Active when Batch Print Modal is closed) */}
      {!showPrintModal && activePerson && (
        <div className="hidden print:block id-card-print-area" data-printable="true">
          <div className="id-card-print-page">
            <div className="pb-2 mb-3 border-b border-slate-300 flex items-center justify-between text-xs text-slate-700">
              <div>
                <p className="font-bold text-sm text-slate-900">{school.nameTh}</p>
                <p className="text-[10px] text-slate-500">
                  {activeCardType === 'staff'
                    ? 'บัตรประจำตัวครูและบุคลากรทางการศึกษา (มาตรฐาน CR80: 85.60 × 53.98 มม.)'
                    : 'บัตรประจำตัวนักเรียน (มาตรฐาน CR80: 85.60 × 53.98 มม.)'}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-600">
                ปีการศึกษา {school.academicYear || '2569'}
              </span>
            </div>

            <div className="id-card-print-pair-grid">
              <div className="id-card-print-pair-row">
                <IdCardFrontContent
                  personType={activeCardType}
                  student={selectedStudent}
                  teacher={selectedTeacher}
                  school={school}
                  lang={lang}
                  variant="print"
                  avatarUrl={activeCardAvatarUrl}
                  issueTermLabel={issueTermLabel}
                  expiryTermLabel={expiryTermLabel}
                />
                <div className="h-[53.98mm] flex flex-col items-center justify-center">
                  <div className="flex-1 border-l border-dashed border-slate-400" />
                  <Scissors className="w-3 h-3 text-slate-400 my-0.5 rotate-90" />
                  <div className="flex-1 border-l border-dashed border-slate-400" />
                </div>
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
                  variant="print"
                  issueTermLabel={issueTermLabel}
                  expiryTermLabel={expiryTermLabel}
                />
              </div>
            </div>

            <p className="mt-4 text-[10px] text-slate-500 text-center">
              คำแนะนำ: ตัดตามขอบนอก พับครึ่งตามรอยประตรงกลาง แล้วเคลือบบัตรแข็งเพื่อใช้งานจริง
            </p>
          </div>
        </div>
      )}

      {/* Batch ID Card Print Modal (Admin, Dual-Role School Admin & Multi-Child Parent) */}
      {canBatchPrint && (
        <BatchIdCardPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          students={isAdminViewer || isParentViewer ? visibleStudents : students}
          teachers={isAdminViewer ? visibleTeachers : isParentViewer ? [] : teachers}
          initialPersonType={activeCardType}
          initialBackMode={backMode}
          initialSelectedStudentIds={
            isAdminViewer || isParentViewer ? Array.from(selectedBatchStudentIds) : undefined
          }
          initialSelectedTeacherIds={
            isAdminViewer ? Array.from(selectedBatchTeacherIds) : undefined
          }
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
