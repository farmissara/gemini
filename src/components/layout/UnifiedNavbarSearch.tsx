import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  GraduationCap,
  Users,
  BookOpen,
  Award,
  Mail,
  Phone,
  Clock,
  MapPin,
  Briefcase,
  ArrowUpRight,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import {
  AppLanguage,
  Course,
  GradeRecord,
  GradingSystem,
  School,
  Student,
  Teacher,
  UserRole,
} from '../../types';
import { calculateStudentAcademicSummary, shouldShowCourseCredits } from '../../lib/moeGrading';
import {
  buildCourseTeacherOptions,
  courseMatchesTeacherFilter,
  teacherMatchesCourse,
} from '../../lib/courseTeacherFilter';
import { OPEN_GLOBAL_SEARCH_EVENT } from '../../lib/quickActionEvents';

export type UnifiedSearchScope = 'all' | 'students' | 'teachers' | 'courses';

interface UnifiedNavbarSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  activeSchool: School;
  gradingSystem?: GradingSystem;
  currentRole: UserRole;
  currentStudentRecordId?: string;
  lang: AppLanguage;
  onOpenStudentProfile?: (student: Student) => void;
  onOpenReportCard?: (student: Student) => void;
  onNavigateTab?: (tab: 'students' | 'teachers' | 'courses' | 'gradebook') => void;
}

export const UnifiedNavbarSearch: React.FC<UnifiedNavbarSearchProps> = ({
  searchQuery,
  setSearchQuery,
  students,
  teachers,
  courses,
  grades,
  activeSchool,
  gradingSystem = 'thai',
  currentRole,
  currentStudentRecordId,
  lang,
  onOpenStudentProfile,
  onOpenReportCard,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<UnifiedSearchScope>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [courseTeacherFilter, setCourseTeacherFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [inspectedTeacher, setInspectedTeacher] = useState<Teacher | null>(null);
  const [inspectedCourse, setInspectedCourse] = useState<Course | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Scoped students list (student/parent roles only see their linked record if restricted, staff see full roster)
  const visibleStudents = useMemo(() => {
    if (currentRole === 'student' && currentStudentRecordId) {
      return students.filter((s) => s.id === currentStudentRecordId);
    }
    return students;
  }, [students, currentRole, currentStudentRecordId]);

  const roomOptions = useMemo(() => {
    return Array.from(new Set(visibleStudents.map((s) => s.room).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [visibleStudents]);

  const departmentOptions = useMemo(() => {
    const depts = new Set<string>();
    teachers.forEach((t) => {
      if (t.department) depts.add(t.department);
    });
    courses.forEach((c) => {
      if (c.department) depts.add(c.department);
    });
    return Array.from(depts).sort((a, b) => a.localeCompare(b, 'th'));
  }, [teachers, courses]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchedStudents = useMemo(() => {
    return visibleStudents.filter((s) => {
      if (roomFilter !== 'all' && s.room !== roomFilter) return false;
      if (!normalizedQuery) return true;
      return [
        s.studentIdNumber,
        s.nationalId,
        `${s.firstNameTh} ${s.lastNameTh}`,
        `${s.firstNameEn} ${s.lastNameEn}`,
        s.room,
        s.gradeLevel,
        s.guardianName,
      ].some((v) => (v || '').toLowerCase().includes(normalizedQuery));
    });
  }, [visibleStudents, roomFilter, normalizedQuery]);

  const matchedTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (deptFilter !== 'all' && t.department !== deptFilter) return false;
      if (!normalizedQuery) return true;
      return [
        t.teacherIdNumber,
        t.fullNameTh,
        t.fullNameEn,
        t.department,
        t.major,
        t.minor,
        t.positionTitle,
        t.academicStanding,
        t.email,
      ].some((v) => (v || '').toLowerCase().includes(normalizedQuery));
    });
  }, [teachers, deptFilter, normalizedQuery]);

  const courseTeacherOptions = useMemo(
    () => buildCourseTeacherOptions(courses, teachers),
    [courses, teachers]
  );

  const matchedCourses = useMemo(() => {
    return courses.filter((c) => {
      if (deptFilter !== 'all' && c.department !== deptFilter) return false;
      if (!courseMatchesTeacherFilter(c, courseTeacherFilter, courseTeacherOptions)) return false;
      if (!normalizedQuery) return true;
      return [
        c.code,
        c.titleTh,
        c.titleEn,
        c.teacherName,
        c.department,
        c.room,
        c.schedule,
      ].some((v) => (v || '').toLowerCase().includes(normalizedQuery));
    });
  }, [courses, deptFilter, courseTeacherFilter, courseTeacherOptions, normalizedQuery]);

  const totalMatches =
    (scope === 'all' || scope === 'students' ? matchedStudents.length : 0) +
    (scope === 'all' || scope === 'teachers' ? matchedTeachers.length : 0) +
    (scope === 'all' || scope === 'courses' ? matchedCourses.length : 0);

  const hasActiveFilter =
    Boolean(normalizedQuery) ||
    scope !== 'all' ||
    roomFilter !== 'all' ||
    deptFilter !== 'all' ||
    courseTeacherFilter !== 'all';

  // Close popover on click outside & support Ctrl/Cmd+K shortcut
  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    const handleOpenSearchEvent = () => {
      setIsOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, handleOpenSearchEvent);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, handleOpenSearchEvent);
    };
  }, [isOpen]);

  const maxPerGroup = scope === 'all' ? 4 : 12;

  const getStudentGpaxLabel = (student: Student) => {
    const summary = calculateStudentAcademicSummary({
      student,
      courses,
      grades,
      gradingSystem,
      currentAcademicYear: activeSchool.academicYear,
      currentSemester: activeSchool.currentSemester,
    });
    if (summary.hideGpaCalculations) {
      return summary.averageRawScore !== null ? `${summary.averageRawScore}%` : '—';
    }
    return summary.hasRecordedGrades && summary.gpax !== null ? summary.gpax.toFixed(2) : '—';
  };

  return (
    <div ref={containerRef} className="relative flex items-center min-w-0 max-w-full" data-guide-id="nav-quick-search">
      {/* Compact Trigger Button on Small-Medium Viewports */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setTimeout(() => inputRef.current?.focus(), 40);
        }}
        className="xl:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] text-[11px] font-semibold cursor-pointer shrink-0"
        title={lang === 'th' ? 'ค้นหาข้ามโมดูล (นักเรียน, ครู, รายวิชา)' : 'Search students, teachers, courses'}
      >
        <Search className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
        <span className="hidden lg:inline">{lang === 'th' ? 'ค้นหา' : 'Search'}</span>
      </button>

      {/* Inline Search Input on Wide Desktop (xl+) */}
      <div className="hidden xl:flex items-center relative min-w-0">
        <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={
            lang === 'th'
              ? 'ค้นหานักเรียน / ครู / รายวิชา...'
              : 'Search students, teachers, courses...'
          }
          className="w-44 2xl:w-60 pl-8 pr-14 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:bg-[var(--color-card)] transition-all"
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setScope('all');
                setRoomFilter('all');
                setDeptFilter('all');
              }}
              className="p-0.5 rounded hover:bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              title={lang === 'th' ? 'ล้างตัวกรอง' : 'Clear search & filters'}
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="hidden xl:inline-block px-1 py-0.2 text-[9px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)]">
              ⌘K
            </kbd>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setShowFilters((prev) => !prev);
            }}
            className={`p-0.5 rounded cursor-pointer transition ${
              showFilters || roomFilter !== 'all' || deptFilter !== 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
            title={lang === 'th' ? 'ตัวกรองข้ามโมดูล' : 'Module filters'}
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Unified Cross-Module Search & Filter Popover */}
      {isOpen && (
        <div className="fixed lg:absolute left-2 right-2 lg:left-auto lg:right-0 top-12 lg:top-full mt-1.5 z-50 lg:w-[520px] max-w-[96vw] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden flex flex-col max-h-[78vh]">
          {/* Popover input bar when inline xl bar is hidden */}
          <div className="xl:hidden p-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'th' ? 'พิมพ์ชื่อ รหัส วิชา หรือห้องเรียน...' : 'Search name, ID, course...'}
              className="flex-1 bg-transparent text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters((p) => !p)}
              className="p-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scope Tabs (Unified Filter Bar) */}
          <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              {[
                {
                  id: 'all' as const,
                  label: lang === 'th' ? 'ทั้งหมด' : 'All',
                  count: matchedStudents.length + matchedTeachers.length + matchedCourses.length,
                },
                {
                  id: 'students' as const,
                  label: lang === 'th' ? 'นักเรียน' : 'Students',
                  count: matchedStudents.length,
                },
                {
                  id: 'teachers' as const,
                  label: lang === 'th' ? 'ครู' : 'Teachers',
                  count: matchedTeachers.length,
                },
                {
                  id: 'courses' as const,
                  label: lang === 'th' ? 'รายวิชา' : 'Courses',
                  count: matchedCourses.length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScope(tab.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1 whitespace-nowrap ${
                    scope === tab.id
                      ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                      : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1 rounded text-[10px] font-mono tabular-nums ${
                      scope === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card)] cursor-pointer"
              title="ปิด"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Secondary Inline Filters */}
          {(showFilters || roomFilter !== 'all' || deptFilter !== 'all' || courseTeacherFilter !== 'all') && (
            <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center gap-2 text-xs">
              {(scope === 'all' || scope === 'students') && roomOptions.length > 0 && (
                <select
                  aria-label="กรองห้องเรียน"
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-title)]"
                >
                  <option value="all">ทุกห้องเรียน ({roomOptions.length})</option>
                  {roomOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}

              {(scope === 'all' || scope === 'teachers' || scope === 'courses') &&
                departmentOptions.length > 0 && (
                  <select
                    aria-label="กรองกลุ่มสาระ"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-title)] max-w-[210px]"
                  >
                    <option value="all">ทุกกลุ่มสาระฯ</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>
                        {d.replace('กลุ่มสาระการเรียนรู้', '')}
                      </option>
                    ))}
                  </select>
                )}

              {(scope === 'all' || scope === 'courses') &&
                courseTeacherOptions.length > 0 && (
                  <select
                    aria-label="กรองวิชาตามรายชื่อครู"
                    value={courseTeacherFilter}
                    onChange={(e) => setCourseTeacherFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-title)] max-w-[220px]"
                  >
                    <option value="all">ครูผู้สอนทุกคน ({courseTeacherOptions.length})</option>
                    {courseTeacherOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count} วิชา)
                      </option>
                    ))}
                  </select>
                )}

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setScope('all');
                    setRoomFilter('all');
                    setDeptFilter('all');
                    setCourseTeacherFilter('all');
                  }}
                  className="ml-auto text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>
          )}

          {/* Results Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2.5 text-xs">
            {totalMatches === 0 ? (
              <div className="py-8 text-center text-[var(--color-text-muted)]">
                ไม่พบข้อมูลที่ตรงกับคำค้นหา "{searchQuery}"
              </div>
            ) : (
              <>
                {/* Students Group */}
                {(scope === 'all' || scope === 'students') && matchedStudents.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                        นักเรียน ({matchedStudents.length})
                      </span>
                      {onNavigateTab && matchedStudents.length > maxPerGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateTab('students');
                          }}
                          className="text-[var(--color-primary-text)] hover:underline cursor-pointer"
                        >
                          ดูทั้งหมด →
                        </button>
                      )}
                    </div>
                    {matchedStudents.slice(0, maxPerGroup).map((stu) => (
                      <div
                        key={stu.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-card-subtle)] border border-transparent hover:border-[var(--color-border)] transition"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onOpenStudentProfile?.(stu);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <img
                            src={stu.avatarUrl}
                            alt={stu.firstNameTh}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--color-text-title)] truncate">
                              {stu.firstNameTh} {stu.lastNameTh}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                              {stu.studentIdNumber} · {stu.gradeLevel} ({stu.room})
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono text-[10px] font-bold text-[var(--color-primary-text)] tabular-nums">
                            GPA {getStudentGpaxLabel(stu)}
                          </span>
                          {onOpenReportCard && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                onOpenReportCard(stu);
                              }}
                              className="p-1.5 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary-text)] hover:opacity-85 cursor-pointer"
                              title="ดู ปพ.1 / ใบรายงานผลทันที"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Teachers Group */}
                {(scope === 'all' || scope === 'teachers') && matchedTeachers.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                        ครูและบุคลากร ({matchedTeachers.length})
                      </span>
                      {onNavigateTab && matchedTeachers.length > maxPerGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateTab('teachers');
                          }}
                          className="text-[var(--color-primary-text)] hover:underline cursor-pointer"
                        >
                          ดูทั้งหมด →
                        </button>
                      )}
                    </div>
                    {matchedTeachers.slice(0, maxPerGroup).map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setInspectedTeacher(teacher);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-card-subtle)] border border-transparent hover:border-[var(--color-border)] transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={teacher.avatarUrl}
                            alt={teacher.fullNameTh}
                            className="w-8 h-8 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--color-text-title)] truncate">
                              {teacher.fullNameTh}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                              {teacher.teacherIdNumber} · {teacher.department.replace('กลุ่มสาระการเรียนรู้', '')} · {teacher.major}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold shrink-0">
                          {teacher.academicStanding}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Courses Group */}
                {(scope === 'all' || scope === 'courses') && matchedCourses.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-300" />
                        รายวิชา ({matchedCourses.length})
                      </span>
                      {onNavigateTab && matchedCourses.length > maxPerGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateTab('courses');
                          }}
                          className="text-[var(--color-primary-text)] hover:underline cursor-pointer"
                        >
                          ดูทั้งหมด →
                        </button>
                      )}
                    </div>
                    {matchedCourses.slice(0, maxPerGroup).map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          setInspectedCourse(course);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-card-subtle)] border border-transparent hover:border-[var(--color-border)] transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 font-mono font-bold text-[10px] shrink-0">
                            {course.code}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--color-text-title)] truncate">
                              {course.titleTh}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                              {course.teacherName} · {course.room}
                              {shouldShowCourseCredits(course.code, activeSchool.showPrimaryCourseCredits ?? false) && ` · ${course.credits} นก.`}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-[var(--color-text-muted)] shrink-0">
                          {course.enrolledStudentIds?.length || 0} คน
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[10px] text-[var(--color-text-muted)] flex items-center justify-between">
            <span>คลิกรายการเพื่อดูข้อมูลทันทีโดยไม่เปลี่ยนหน้า</span>
            <span>ESC ปิด</span>
          </div>
        </div>
      )}

      {/* Quick-Inspect Modal for Teacher (In-Place Overlay Without Leaving Current Page) */}
      {inspectedTeacher &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInspectedTeacher(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 bg-[var(--color-primary)] text-white flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={inspectedTeacher.avatarUrl}
                    alt={inspectedTeacher.fullNameTh}
                    className="w-11 h-11 rounded-xl object-cover border-2 border-white/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate">{inspectedTeacher.fullNameTh}</h3>
                    <p className="text-[11px] opacity-90 truncate">
                      {inspectedTeacher.teacherIdNumber} · {inspectedTeacher.academicStanding}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedTeacher(null)}
                  className="p-1.5 rounded-lg hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-text-muted)]">กลุ่มสาระ / ตำแหน่ง</div>
                    <div className="font-bold text-[var(--color-text-title)] mt-0.5">
                      {inspectedTeacher.department}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-body)]">
                      {inspectedTeacher.positionTitle || 'ครูผู้สอน'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-text-muted)]">วุฒิการศึกษา & วิชาเอก</div>
                    <div className="font-bold text-[var(--color-text-title)] mt-0.5">
                      {inspectedTeacher.major}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-body)] truncate">
                      {inspectedTeacher.academicDegree}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] text-[var(--color-text-body)] px-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    {inspectedTeacher.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                    {inspectedTeacher.phone}
                  </span>
                  {inspectedTeacher.homeroomClasses?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                      ที่ปรึกษา: {inspectedTeacher.homeroomClasses.join(', ')}
                    </span>
                  )}
                </div>

                {/* Courses taught */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[var(--color-text-title)]">
                    รายวิชาที่รับผิดชอบในโรงเรียน
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {courses.filter((c) => teacherMatchesCourse(inspectedTeacher, c)).length === 0 ? (
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {inspectedTeacher.teachingSubjects?.join(', ') || 'ยังไม่มีรายวิชาผูกในภาคเรียนนี้'}
                      </p>
                    ) : (
                      courses
                        .filter((c) => teacherMatchesCourse(inspectedTeacher, c))
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]"
                          >
                            <div>
                              <span className="font-mono font-bold text-[var(--color-primary-text)] mr-1.5">
                                {c.code}
                              </span>
                              <span className="font-semibold text-[var(--color-text-title)]">{c.titleTh}</span>
                            </div>
                            <span className="text-[10px] text-[var(--color-text-muted)]">
                              {c.room} · {c.enrolledStudentIds?.length || 0} คน
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between">
                {onNavigateTab ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectedTeacher(null);
                      onNavigateTab('teachers');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                  >
                    <span>ไปที่โมดูลทะเบียนครู</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setInspectedTeacher(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Quick-Inspect Modal for Course (In-Place Overlay Without Leaving Current Page) */}
      {inspectedCourse &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInspectedCourse(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 bg-indigo-700 text-white flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-[11px]">
                      {inspectedCourse.code}
                    </span>
                    {shouldShowCourseCredits(inspectedCourse.code, activeSchool.showPrimaryCourseCredits ?? false) && (
                      <span className="text-[11px] opacity-90">{inspectedCourse.credits} หน่วยกิต</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold mt-1 truncate">{inspectedCourse.titleTh}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedCourse(null)}
                  className="p-1.5 rounded-lg hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-text-muted)]">ผู้ลงทะเบียน</div>
                    <div className="font-bold text-sm text-[var(--color-text-title)] tabular-nums">
                      {inspectedCourse.enrolledStudentIds?.length || 0} คน
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-text-muted)]">ชม./สัปดาห์</div>
                    <div className="font-bold text-sm text-[var(--color-text-title)] tabular-nums">
                      {inspectedCourse.weeklyHours ?? Math.round(inspectedCourse.credits * 2)} ชม.
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] text-emerald-800 dark:text-emerald-200">เกณฑ์ 80%</div>
                    <div className="font-bold text-sm text-emerald-900 dark:text-emerald-100 tabular-nums">
                      {inspectedCourse.minAttendanceHours || Math.round(inspectedCourse.credits * 40 * 0.8)} ชม.
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-[var(--color-text-body)]">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <strong>ครูผู้สอน:</strong> {inspectedCourse.teacherName} ({inspectedCourse.teacherEmail})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                    <strong>เวลาเรียน:</strong> {inspectedCourse.schedule}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                    <strong>ห้องเรียน / กลุ่มสาระ:</strong> {inspectedCourse.room} · {inspectedCourse.department}
                  </div>
                </div>

                {inspectedCourse.description && (
                  <p className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-body)] leading-relaxed">
                    {inspectedCourse.description}
                  </p>
                )}

                {/* Enrolled Students Preview */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[var(--color-text-title)]">
                    รายชื่อนักเรียนในวิชา (ตัวอย่าง)
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {(inspectedCourse.enrolledStudentIds || []).length === 0 ? (
                      <p className="text-[11px] text-[var(--color-text-muted)]">ยังไม่มีนักเรียนลงทะเบียน</p>
                    ) : (
                      (inspectedCourse.enrolledStudentIds || []).slice(0, 10).map((sid) => {
                        const stu = students.find((s) => s.id === sid);
                        if (!stu) return null;
                        return (
                          <button
                            key={sid}
                            type="button"
                            onClick={() => {
                              setInspectedCourse(null);
                              onOpenStudentProfile?.(stu);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-left cursor-pointer"
                          >
                            <span className="font-semibold text-[var(--color-text-title)]">
                              {stu.firstNameTh} {stu.lastNameTh}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                              {stu.studentIdNumber} · {stu.room}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2">
                {onNavigateTab ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedCourse(null);
                        onNavigateTab('courses');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      <span>ไปที่รายวิชา</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedCourse(null);
                        onNavigateTab('gradebook');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                    >
                      <span>เปิด ปพ.5 วิชานี้</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setInspectedCourse(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
