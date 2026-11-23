import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FolderGit2,
  GraduationCap,
  Image as ImageIcon,
  Plus,
  Printer,
  Trash2,
  User,
  X,
} from 'lucide-react';
import portfolioBannerImg from '../assets/images/student_portfolio_banner_1794996857956.jpg';
import {
  AppLanguage,
  AuthUser,
  Course,
  GradeRecord,
  GradingSystem,
  PlayerScore,
  PortfolioItem,
  School,
  Student,
  Teacher,
} from '../types';
import { resolveOwnStudent, resolveOwnTeacher } from '../lib/attendanceScope';
import { calculateStudentAcademicSummary } from '../lib/moeGrading';
import { getModuleTone } from '../lib/moduleTheme';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';

interface PortfolioViewProps {
  portfolioItems: PortfolioItem[];
  students: Student[];
  teachers?: Teacher[];
  courses?: Course[];
  grades?: GradeRecord[];
  playerScores?: PlayerScore[];
  school?: School;
  gradingSystem?: GradingSystem;
  currentUser: AuthUser | null;
  lang: AppLanguage;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onDeletePortfolioItem?: (itemId: string) => void;
  onOpenProfile?: () => void;
  academicYear?: string;
}

const CATEGORY_LABELS_TH: Record<PortfolioItem['category'], string> = {
  competition: 'การแข่งขันและรางวัล',
  academic: 'วิชาการและโครงงาน',
  activity: 'กิจกรรมและจิตอาสา',
  pa_research: 'วิจัยในชั้นเรียน (ว.PA)',
  teaching_media: 'สื่อนวัตกรรมการสอน',
  certificate: 'เกียรติบัตรและการอบรม',
};

const CATEGORY_LABELS_EN: Record<PortfolioItem['category'], string> = {
  competition: 'Competition & Awards',
  academic: 'Academic & Projects',
  activity: 'Activities & Service',
  pa_research: 'Classroom Research (PA)',
  teaching_media: 'Teaching Innovation',
  certificate: 'Certificates & Training',
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolioItems,
  students,
  teachers = [],
  courses = [],
  grades = [],
  playerScores = [],
  school,
  gradingSystem = 'thai',
  currentUser,
  lang,
  onAddPortfolioItem,
  onDeletePortfolioItem,
  onOpenProfile,
  academicYear = '2569',
}) => {
  const isStudentUser = currentUser?.role === 'student';
  const isTeacherOrStaff =
    currentUser?.role === 'teacher' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'teacher'>(
    currentUser?.role === 'teacher' ? 'teacher' : 'student'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Clean, empty New Item Form State (zero mock defaults)
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PortfolioItem['category']>(
    currentUser?.role === 'teacher' ? 'pa_research' : 'competition'
  );
  const [newYear, setNewYear] = useState(school?.academicYear || academicYear);
  const [newDescription, setNewDescription] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const effectiveRoleTab: 'student' | 'teacher' = isStudentUser ? 'student' : activeRoleTab;

  // Resolve real student profile
  const ownStudent = useMemo(
    () => resolveOwnStudent(currentUser, students),
    [currentUser, students]
  );

  const activeStudent = useMemo(() => {
    if (isStudentUser) return ownStudent;
    if (selectedStudentId) {
      return students.find((s) => s.id === selectedStudentId) || students[0];
    }
    return ownStudent || students[0];
  }, [isStudentUser, ownStudent, selectedStudentId, students]);

  // Resolve real teacher profile
  const ownTeacher = useMemo(
    () => resolveOwnTeacher(currentUser, teachers),
    [currentUser, teachers]
  );

  // Real student GPAX
  const studentGpax = useMemo(() => {
    if (!activeStudent) return null;
    const summary = calculateStudentAcademicSummary({
      student: activeStudent,
      courses,
      grades: grades.filter((g) => g.studentId === activeStudent.id),
      gradingSystem,
    });
    if (summary.gpax != null && summary.gpax > 0) return summary.gpax;
    return activeStudent.gpa > 0 ? activeStudent.gpa : null;
  }, [activeStudent, courses, grades, gradingSystem]);

  // Real player score
  const realScore = useMemo(() => {
    if (!currentUser) return null;
    return playerScores.find((p) => p.userId === currentUser.id) || null;
  }, [playerScores, currentUser]);

  // Filter real portfolio items (scoped properly)
  const filteredItems = useMemo(() => {
    return portfolioItems.filter((item) => {
      if (item.ownerRole !== effectiveRoleTab) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (isStudentUser && currentUser) {
        const matchesUserId = item.ownerId === currentUser.id;
        const matchesStudentId = ownStudent && item.ownerId === ownStudent.id;
        if (!matchesUserId && !matchesStudentId) return false;
      } else if (effectiveRoleTab === 'student' && selectedStudentId && activeStudent) {
        if (item.ownerId !== activeStudent.id && item.ownerName !== `${activeStudent.firstNameTh} ${activeStudent.lastNameTh}`) {
          return false;
        }
      }
      return true;
    });
  }, [portfolioItems, effectiveRoleTab, selectedCategory, isStudentUser, currentUser, ownStudent, selectedStudentId, activeStudent]);

  const studentDisplayName = isStudentUser
    ? currentUser?.fullNameTh ||
      (ownStudent ? `${ownStudent.firstNameTh} ${ownStudent.lastNameTh}`.trim() : currentUser?.email || '')
    : activeStudent
      ? `${activeStudent.firstNameTh} ${activeStudent.lastNameTh}`.trim()
      : '';

  const teacherDisplayName =
    ownTeacher?.fullNameTh ||
    (currentUser?.role !== 'student' ? currentUser?.fullNameTh || currentUser?.fullNameEn : '') ||
    '';

  const schoolDisplayName =
    (lang === 'th' ? school?.nameTh : school?.nameEn) || school?.nameTh || '';

  const handleOpenAddModal = () => {
    setNewCategory(effectiveRoleTab === 'teacher' ? 'pa_research' : 'competition');
    setNewYear(school?.academicYear || academicYear);
    setNewTitle('');
    setNewDescription('');
    setNewSkills('');
    setNewImageUrl('');
    setShowAddModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;

    const ownerId =
      effectiveRoleTab === 'student' && activeStudent && !isStudentUser
        ? activeStudent.id
        : currentUser.id;
    const ownerName =
      effectiveRoleTab === 'student'
        ? studentDisplayName || currentUser.fullNameTh || currentUser.email
        : teacherDisplayName || currentUser.fullNameTh || currentUser.email;

    const newItem: PortfolioItem = {
      id: `port-${Date.now()}`,
      schoolId: school?.id || currentUser.schoolId,
      ownerId,
      ownerRole: effectiveRoleTab,
      ownerName,
      title: newTitle.trim(),
      category: newCategory,
      year: newYear.trim() || school?.academicYear || academicYear,
      description: newDescription.trim(),
      imageUrl: newImageUrl.trim() || undefined,
      skills: newSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      certifiedBySchool: isTeacherOrStaff,
      scoreBonus: 100,
    };

    onAddPortfolioItem(newItem);
    setShowAddModal(false);
  };

  const categoryOptions =
    effectiveRoleTab === 'student'
      ? [
          { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All' },
          { id: 'competition', label: lang === 'th' ? 'การแข่งขันและรางวัล' : 'Awards' },
          { id: 'academic', label: lang === 'th' ? 'วิชาการและโครงงาน' : 'Academic' },
          { id: 'activity', label: lang === 'th' ? 'กิจกรรมและจิตอาสา' : 'Activities' },
        ]
      : [
          { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All' },
          { id: 'pa_research', label: lang === 'th' ? 'วิจัยในชั้นเรียน' : 'PA Research' },
          { id: 'teaching_media', label: lang === 'th' ? 'สื่อนวัตกรรม' : 'Teaching Media' },
          { id: 'certificate', label: lang === 'th' ? 'การอบรมและเกียรติบัตร' : 'Certificates' },
        ];

  const getCategoryLabel = (cat: PortfolioItem['category']) =>
    lang === 'th' ? CATEGORY_LABELS_TH[cat] || cat : CATEGORY_LABELS_EN[cat] || cat;

  const activeAvatar =
    effectiveRoleTab === 'student'
      ? (isStudentUser ? currentUser?.avatarUrl : activeStudent?.avatarUrl) || activeStudent?.avatarUrl || ''
      : currentUser?.avatarUrl || '';

  const activeNameForAvatar =
    effectiveRoleTab === 'student' ? studentDisplayName : teacherDisplayName;

  return (
    <div className={`h-full flex flex-col min-h-0 overflow-hidden gap-4 ${getModuleTone('portfolio')}`}>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-0.5 pb-6">
        {/* 1. EDITORIAL HERO HEADER WITH REAL PROFILE DATA */}
        <section className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-sm">
          <img
            src={portfolioBannerImg}
            alt={lang === 'th' ? 'แฟ้มสะสมผลงานดิจิทัล' : 'Digital Portfolio'}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/78 to-slate-950/45"
          />

          <div className="relative z-10 p-5 sm:p-6 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              {activeAvatar ? (
                <img
                  src={activeAvatar}
                  alt={activeNameForAvatar || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/40 shadow-md shrink-0 bg-slate-800"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white font-extrabold text-xl flex items-center justify-center shrink-0">
                  {(activeNameForAvatar || 'P').slice(0, 2)}
                </div>
              )}

              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium text-sky-200/95">
                  {effectiveRoleTab === 'student'
                    ? lang === 'th'
                      ? 'แฟ้มสะสมผลงานนักเรียน'
                      : 'Student Digital Portfolio'
                    : lang === 'th'
                      ? 'แฟ้มผลงานและวิทยฐานะครู (ว.PA)'
                      : 'Teacher Portfolio (PA)'}
                </p>

                <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate">
                  {effectiveRoleTab === 'student'
                    ? studentDisplayName || (lang === 'th' ? 'ยังไม่มีข้อมูลนักเรียน' : 'No student selected')
                    : teacherDisplayName || (lang === 'th' ? 'ข้อมูลบุคลากร' : 'Staff Portfolio')}
                </h1>

                {/* Clean unboxed real metadata with dot separators */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-200/90 tabular-nums">
                  {schoolDisplayName && <span>{schoolDisplayName}</span>}

                  {effectiveRoleTab === 'student' && activeStudent && (
                    <>
                      {schoolDisplayName && <span aria-hidden="true">·</span>}
                      <span>
                        {activeStudent.gradeLevel} {activeStudent.room}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>รหัส {activeStudent.studentIdNumber}</span>
                      {studentGpax !== null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-300 font-semibold">
                            GPAX {studentGpax.toFixed(2)}
                          </span>
                        </>
                      )}
                    </>
                  )}

                  {effectiveRoleTab === 'teacher' && (ownTeacher || currentUser) && (
                    <>
                      {schoolDisplayName && <span aria-hidden="true">·</span>}
                      <span>
                        {ownTeacher?.academicStanding ||
                          currentUser?.academicStanding ||
                          (lang === 'th' ? 'ครูผู้สอน' : 'Teacher')}
                      </span>
                      {(ownTeacher?.department || currentUser?.department) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{ownTeacher?.department || currentUser?.department}</span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Real Target Goal or PA Focus if user entered one */}
                {effectiveRoleTab === 'student' &&
                  (currentUser?.targetUniversity || currentUser?.targetFaculty) && (
                    <p className="text-xs text-amber-200/95 pt-0.5 truncate">
                      {lang === 'th' ? 'เป้าหมายศึกษาต่อ: ' : 'Target: '}
                      {[currentUser.targetFaculty, currentUser.targetUniversity]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300 pt-1 tabular-nums">
                  <span>
                    {lang === 'th'
                      ? `ผลงานที่บันทึก ${filteredItems.length} รายการ`
                      : `${filteredItems.length} recorded items`}
                  </span>
                  {effectiveRoleTab === 'student' && realScore && realScore.exp > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-300 font-semibold">
                        {realScore.exp.toLocaleString()} EXP ({realScore.rankTitle})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Clean Primary & Utility Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="min-h-[42px] px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'เพิ่มผลงานใหม่' : 'Add Work'}</span>
              </button>

              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="min-h-[42px] px-3.5 rounded-xl bg-white/12 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs inline-flex items-center gap-1.5 backdrop-blur-sm transition cursor-pointer whitespace-nowrap"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[42px] px-3.5 rounded-xl bg-white/12 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs inline-flex items-center gap-1.5 backdrop-blur-sm transition cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'พิมพ์ PDF' : 'Print'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. ROLE & CATEGORY FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Only show Student/Teacher role switch to staff/teachers */}
            {!isStudentUser && (
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoleTab('student');
                    setSelectedCategory('all');
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    effectiveRoleTab === 'student'
                      ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'ผลงานนักเรียน' : 'Students'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoleTab('teacher');
                    setSelectedCategory('all');
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    effectiveRoleTab === 'teacher'
                      ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'ผลงานครู (ว.PA)' : 'Teachers'}</span>
                </button>
              </div>
            )}

            {/* Staff can filter by real student */}
            {!isStudentUser && effectiveRoleTab === 'student' && students.length > 0 && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                aria-label={lang === 'th' ? 'เลือกนักเรียน' : 'Select student'}
                className="min-h-[40px] px-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-title)]"
              >
                <option value="">{lang === 'th' ? `นักเรียนทุกคน (${students.length})` : `All students (${students.length})`}</option>
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.firstNameTh} {stu.lastNameTh} ({stu.gradeLevel} {stu.room})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Interactive Category Segmented Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categoryOptions.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. REAL PORTFOLIO ITEMS GRID OR CLEAN EMPTY STATE */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6 text-center space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-center mx-auto">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ยังไม่มีผลงานที่บันทึกในแฟ้ม' : 'No portfolio items recorded yet'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {lang === 'th'
                  ? 'เริ่มบันทึกเกียรติบัตร รางวัลการแข่งขัน โครงงาน หรือกิจกรรมจิตอาสาของคุณ เพื่อสะสมเป็นแฟ้มผลงานจริงที่พร้อมพิมพ์เป็น PDF ได้ทุกเมื่อ'
                  : 'Start recording your real certificates, competition awards, academic projects, or activities to build your printable portfolio.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="min-h-[44px] px-5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'เพิ่มผลงานแรกของคุณ' : 'Add Your First Item'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const canDelete =
                Boolean(onDeletePortfolioItem) &&
                (isTeacherOrStaff ||
                  item.ownerId === currentUser?.id ||
                  (ownStudent && item.ownerId === ownStudent.id));

              return (
                <article
                  key={item.id}
                  className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between transition hover:border-[var(--color-primary)]"
                >
                  {item.imageUrl ? (
                    <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-gradient-to-br from-slate-100 to-slate-200/70 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-[var(--color-text-muted)]">
                      <Award className="w-8 h-8 opacity-40" />
                    </div>
                  )}

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Clean unboxed metadata row */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span className="font-semibold text-[var(--color-primary-text)]">
                            {getCategoryLabel(item.category)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>ปี {item.year}</span>
                          {item.certifiedBySchool && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                รับรองแล้ว
                              </span>
                            </>
                          )}
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDeletePortfolioItem?.(item.id)}
                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
                            aria-label={lang === 'th' ? 'ลบผลงาน' : 'Delete item'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[var(--color-text-title)] leading-snug">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-[var(--color-text-body)] leading-relaxed line-clamp-3">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <span className="truncate">
                        {item.skills.length > 0
                          ? item.skills.join(' · ')
                          : item.ownerName}
                      </span>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer shrink-0"
                      >
                        {lang === 'th' ? 'พิมพ์เอกสาร' : 'Print'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD NEW REAL PORTFOLIO ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>
                  {effectiveRoleTab === 'student'
                    ? lang === 'th'
                      ? 'เพิ่มผลงานลงแฟ้มสะสมผลงาน'
                      : 'Add Student Portfolio Item'
                    : lang === 'th'
                      ? 'เพิ่มผลงานแฟ้ม ว.PA'
                      : 'Add Teacher Portfolio Item'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-xl bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-title)] block mb-1.5">
                  {lang === 'th' ? 'ชื่อผลงาน / เกียรติบัตร / โครงงาน *' : 'Title *'}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={lang === 'th' ? 'ระบุชื่อผลงานหรือรางวัลที่ได้รับจริง' : 'Enter your achievement title'}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-title)] block mb-1.5">
                    {lang === 'th' ? 'หมวดหมู่' : 'Category'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as PortfolioItem['category'])}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                  >
                    {effectiveRoleTab === 'student' ? (
                      <>
                        <option value="competition">การแข่งขันและรางวัล</option>
                        <option value="academic">วิชาการและโครงงาน</option>
                        <option value="activity">กิจกรรมและจิตอาสา</option>
                      </>
                    ) : (
                      <>
                        <option value="pa_research">งานวิจัยในชั้นเรียน (ว.PA)</option>
                        <option value="teaching_media">สื่อนวัตกรรมการสอน</option>
                        <option value="certificate">เกียรติบัตรและการอบรม</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-title)] block mb-1.5">
                    {lang === 'th' ? 'ปีการศึกษา' : 'Academic Year'}
                  </label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)] tabular-nums"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-title)] block mb-1.5">
                  {lang === 'th' ? 'รายละเอียดผลงานและบทบาทของคุณ' : 'Description'}
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder={lang === 'th' ? 'อธิบายรายละเอียดผลงาน บทบาทหน้าที่ และสิ่งที่ได้เรียนรู้' : 'Describe your work and key takeaways'}
                  className="w-full p-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-title)] block mb-1.5">
                  {lang === 'th' ? 'ทักษะที่เกี่ยวข้อง (คั่นด้วยจุลภาค ไม่บังคับ)' : 'Skills (comma-separated, optional)'}
                </label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder={lang === 'th' ? 'เช่น การนำเสนอ, โครงงานวิทยาศาสตร์, ภาษาอังกฤษ' : 'e.g. Research, Teamwork, Design'}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-title)] block">
                  {lang === 'th' ? 'รูปภาพผลงาน / เกียรติบัตร (ไม่บังคับ)' : 'Photo / Certificate Image (Optional)'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    className="min-h-[42px] px-3.5 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ImageIcon className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span>{lang === 'th' ? 'อัปโหลด / ถ่ายรูป' : 'Upload / Camera'}</span>
                  </button>
                  <input
                    type="url"
                    value={newImageUrl.startsWith('data:') ? '' : newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder={
                      newImageUrl.startsWith('data:')
                        ? lang === 'th'
                          ? 'แนบรูปภาพเรียบร้อยแล้ว'
                          : 'Image attached'
                        : lang === 'th'
                          ? 'หรือวางลิงก์รูปภาพ'
                          : 'Or paste image URL'
                    }
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                  />
                </div>
                {newImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-[var(--color-border)] h-32 bg-slate-900">
                    <img
                      src={newImageUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 text-white flex items-center justify-center cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] px-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {lang === 'th' ? 'บันทึกผลงาน' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageCaptureUploadModal
        isOpen={showImagePicker}
        currentImageUrl={newImageUrl}
        title={lang === 'th' ? 'ถ่ายรูปหรือเลือกรูปผลงาน / เกียรติบัตร' : 'Capture or Upload Portfolio Photo'}
        onSelectImage={(url) => setNewImageUrl(url)}
        onClose={() => setShowImagePicker(false)}
      />
    </div>
  );
};
