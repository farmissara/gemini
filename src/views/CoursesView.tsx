import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Clock, 
  MapPin, 
  User, 
  Award, 
  Users, 
  CheckCircle, 
  GraduationCap, 
  Edit3, 
  Trash2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  CalendarCheck,
  UserMinus,
  UserPlus,
  ChevronDown,
  Filter,
  X
} from 'lucide-react';
import { AuthUser, Course, CourseType, GradeRecord, GradingSystem, LearningStrandId, Student, Teacher, UserRole } from '../types';
import { PagedList } from '../components/PagedList';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import {
  getCourseDuplicateExtraIds,
  getCourseDuplicateReasons,
} from '../lib/duplicateRecords';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import { calculateStudentAcademicSummary, isPrimaryGradeLevel, shouldShowCourseCredits } from '../lib/moeGrading';
import { getModuleGroupMeta, getModuleTone } from '../lib/moduleTheme';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';
import {
  COURSE_LEARNING_AREA_OPTIONS,
  COURSE_TYPE_OPTIONS,
  getCourseType,
  inferCourseLearningArea,
} from '../lib/courseClassification';
import { EmptyState } from '../components/common/EmptyState';
import { emitAppToast } from '../components/common/ToastProvider';

interface CoursesViewProps {
  courses: Course[];
  students: Student[];
  teachers?: Teacher[];
  grades?: GradeRecord[];
  gradingSystem?: GradingSystem;
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  schoolId?: string;
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse?: (updatedCourse: Course) => void;
  onDeleteCourse?: (courseId: string) => Promise<boolean | void> | boolean | void;
  onDeleteCourses?: (courseIds: string[]) => Promise<boolean | void> | boolean | void;
  onEnrollStudent: (courseId: string, studentId: string) => void;
  onEnrollStudentsBatch?: (courseId: string, studentIds: string[]) => void;
  onUnenrollStudent?: (courseId: string, studentId: string) => Promise<void> | void;
  onUnenrollStudentsBatch?: (courseId: string, studentIds: string[]) => Promise<void> | void;
  onOpenImportExport?: (tab?: 'courses' | 'enrollment' | 'grades') => void;
  semesterOptions?: string[];
  academicYear?: string;
  currentSemester?: string;
  showPrimaryCourseCredits?: boolean;
}

const DEPARTMENTS = [
  'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
  'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
  'กลุ่มสาระการเรียนรู้ภาษาไทย',
  'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
  'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม',
  'กลุ่มสาระการเรียนรู้ศิลปะ',
  'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา',
  'กลุ่มสาระการเรียนรู้การงานอาชีพ',
  'กิจกรรมพัฒนาผู้เรียนและแนะแนว'
];

const CREDIT_PRESET_VALUES = [0, 0.5, 1, 1.5, 2, 3];

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  students,
  teachers = [],
  grades = [],
  gradingSystem = 'thai',
  currentRole = 'admin',
  currentUser,
  schoolId = 'default-school',
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onDeleteCourses,
  onEnrollStudent,
  onEnrollStudentsBatch,
  onUnenrollStudent,
  onUnenrollStudentsBatch,
  onOpenImportExport,
  semesterOptions = ['1', '2', 'Summer'],
  academicYear = '2569',
  currentSemester = '1',
  showPrimaryCourseCredits = false,
}) => {
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const canManageCourses = isAdmin;
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const availableDepartments = Array.from(new Set([...DEPARTMENTS, ...presets.departments]));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType | 'all'>('all');
  const [selectedLearningArea, setSelectedLearningArea] = useState<LearningStrandId | 'all'>('all');
  const [showCourseFilters, setShowCourseFilters] = useState(false);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeptPresetModal, setShowDeptPresetModal] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [enrollRoomInput, setEnrollRoomInput] = useState('');
  const [enrollFeedback, setEnrollFeedback] = useState<string | null>(null);
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [selectedIndividualStudentId, setSelectedIndividualStudentId] = useState('');
  const [enrolledSearchQuery, setEnrolledSearchQuery] = useState('');
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    detailNote?: string;
    confirmLabel: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>(courses[0]?.id || '');
  const [activeCourseDetailTab, setActiveCourseDetailTab] = useState<'overview' | 'students'>('overview');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseDeleteError, setCourseDeleteError] = useState<string | null>(null);
  const [isDeletingCourses, setIsDeletingCourses] = useState(false);

  // Credits selection mode in form: 'preset' or 'custom'
  const [creditMode, setCreditMode] = useState<'preset' | 'custom'>('preset');
  const [customCreditsInput, setCustomCreditsInput] = useState<string>('1.5');

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    titleEn: string;
    titleTh: string;
    courseType: CourseType | '';
    learningArea: LearningStrandId | '';
    credits: number;
    weeklyHours: number;
    totalHours: number;
    minAttendanceHours: number;
    teacherName: string;
    teacherEmail: string;
    department: string;
    schedule: string;
    room: string;
    academicYear: string;
    semester: Course['semester'];
    description: string;
  }>({
    code: '',
    titleEn: '',
    titleTh: '',
    courseType: 'core',
    learningArea: '',
    credits: 1.5,
    weeklyHours: 3,
    totalHours: 60,
    minAttendanceHours: 48,
    teacherName: '',
    teacherEmail: '',
    department: '',
    schedule: '',
    room: '',
    academicYear,
    semester: currentSemester,
    description: '',
  });

  const teacherFilterOptions = buildCourseTeacherOptions(courses, teachers);
  const teacherSelectableNames = Array.from(
    new Set([
      ...teachers.map((t) => (t.fullNameTh || t.fullNameEn || '').trim()).filter(Boolean),
      ...teacherFilterOptions.map((opt) => opt.label),
    ])
  ).sort((a, b) => a.localeCompare(b, 'th'));

  const availableTermKeys = Array.from(
    new Set(
      courses
        .filter((c) => c.academicYear && c.semester)
        .map((c) => `${c.academicYear}::${c.semester}`)
    )
  ).sort((a, b) => b.localeCompare(a));

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  // Filter courses by search, course type, learning area, teacher, and term.
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = !normalizedSearch || [
      c.code,
      c.titleEn,
      c.titleTh,
      c.teacherName,
      c.department,
      c.room,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    const matchesCourseType = selectedCourseType === 'all' || getCourseType(c) === selectedCourseType;
    const matchesLearningArea =
      selectedLearningArea === 'all' || inferCourseLearningArea(c) === selectedLearningArea;
    const matchesTeacher = courseMatchesTeacherFilter(c, selectedTeacherFilter, teacherFilterOptions);
    const matchesTerm =
      selectedTermFilter === 'all' || `${c.academicYear}::${c.semester}` === selectedTermFilter;
    return matchesSearch && matchesCourseType && matchesLearningArea && matchesTeacher && matchesTerm;
  });
  const hasActiveCourseFilters =
    normalizedSearch.length > 0 ||
    selectedCourseType !== 'all' ||
    selectedLearningArea !== 'all' ||
    selectedTeacherFilter !== 'all' ||
    selectedTermFilter !== 'all';
  const activeCourseFilterCount = [
    selectedCourseType !== 'all',
    selectedLearningArea !== 'all',
    selectedTeacherFilter !== 'all',
    selectedTermFilter !== 'all',
  ].filter(Boolean).length;
  const clearCourseFilters = () => {
    setSearchTerm('');
    setSelectedCourseType('all');
    setSelectedLearningArea('all');
    setSelectedTeacherFilter('all');
    setSelectedTermFilter('all');
  };

  const getCourseTypeLabel = (course: Course) => {
    const courseType = getCourseType(course);
    return COURSE_TYPE_OPTIONS.find((option) => option.id === courseType)?.labelTh || 'ยังไม่ระบุประเภท';
  };

  const getCourseTypeBadgeClass = (course: Course) => {
    const courseType = getCourseType(course);
    if (courseType === 'core') return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200';
    if (courseType === 'activities') return 'border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-950 text-cyan-900 dark:text-cyan-200';
    if (courseType === 'elective') return 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-200';
    return 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  };

  const getLearningAreaLabel = (course: Course) => {
    const learningArea = inferCourseLearningArea(course);
    return COURSE_LEARNING_AREA_OPTIONS.find((option) => option.id === learningArea)?.labelTh || 'ยังไม่ระบุกลุ่มสาระ';
  };

  const getLearningAreaLabelById = (learningArea: LearningStrandId | '') =>
    COURSE_LEARNING_AREA_OPTIONS.find((option) => option.id === learningArea)?.labelTh || '';

  // Open modal for creating a new course (RESET all states cleanly)
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setCreditMode('preset');
    setCustomCreditsInput('1.5');
    const currentTeacher = currentRole === 'teacher'
      ? teachers.find((teacher) => teacher.id === currentUser?.teacherRecordId)
      : undefined;
    const defaultTeacherName = currentRole === 'teacher'
      ? currentTeacher?.fullNameTh || (currentUser?.role === 'teacher' ? currentUser.fullNameTh : '')
      : '';
    const defaultTeacherEmail = currentRole === 'teacher'
      ? currentTeacher?.email || (currentUser?.role === 'teacher' ? currentUser.email : '')
      : '';
    
    // Suggest code based on existing count
    const nextCode = `ว${30200 + courses.length + 1}`;
    setFormData({
      code: nextCode,
      titleEn: '',
      titleTh: '',
      courseType: 'core',
      learningArea: '',
      credits: 1.5,
      weeklyHours: 3,
      totalHours: 60,
      minAttendanceHours: 48,
      teacherName: defaultTeacherName,
      teacherEmail: defaultTeacherEmail,
      department: '',
      schedule: '',
      room: '',
      academicYear,
      semester: currentSemester,
      description: '',
    });
    setShowAddModal(true);
  };

  // Open modal for editing an existing course
  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    const calculatedCredits = Number.isFinite(Number(course.credits)) ? Number(course.credits) : 1.5;
    const isPresetCredit = CREDIT_PRESET_VALUES.includes(calculatedCredits);
    setCreditMode(isPresetCredit ? 'preset' : 'custom');
    setCustomCreditsInput(String(calculatedCredits));

    const calculatedWeekly =
      course.weeklyHours ?? (calculatedCredits > 0 ? Math.max(1, Math.round(calculatedCredits * 2)) : 1);
    const calculatedTotal = course.totalHours ?? calculatedWeekly * 20;
    const calculatedMin = course.minAttendanceHours ?? Math.round(calculatedTotal * 0.8);

    setFormData({
      code: course.code,
      titleEn: course.titleEn,
      titleTh: course.titleTh,
      courseType: getCourseType(course) || '',
      learningArea: inferCourseLearningArea(course) || '',
      credits: calculatedCredits,
      weeklyHours: calculatedWeekly,
      totalHours: calculatedTotal,
      minAttendanceHours: calculatedMin,
      teacherName: course.teacherName,
      teacherEmail: course.teacherEmail,
      department: course.department || '',
      schedule: course.schedule,
      room: course.room,
      academicYear: course.academicYear || academicYear,
      semester: course.semester || '1',
      description: course.description,
    });
    setShowAddModal(true);
  };

  // Recalculate hours when credits change
  const handleCreditsChange = (newCredits: number) => {
    const safeCredits = Number.isFinite(newCredits) && newCredits >= 0 ? newCredits : 0;
    const weekly = safeCredits === 0 ? 1 : Math.max(1, Math.round(safeCredits * 2));
    const total = weekly * 20; // 20 weeks per semester
    const minAtt = Math.round(total * 0.8); // 80% attendance rule
    setFormData((prev) => ({
      ...prev,
      credits: safeCredits,
      weeklyHours: weekly,
      totalHours: total,
      minAttendanceHours: minAtt,
    }));
  };

  const handleCreateOrUpdateCourse = (e: React.FormEvent) => {
    e.preventDefault();

    const finalCourseType = formData.courseType || (editingCourse ? getCourseType(editingCourse) : undefined);
    const finalLearningArea = formData.learningArea || (editingCourse ? inferCourseLearningArea(editingCourse) : undefined);
    const department = formData.department.trim() || getLearningAreaLabelById(finalLearningArea || '');

    const resolvedCredits =
      creditMode === 'custom'
        ? Math.max(0, Number.isFinite(Number(customCreditsInput)) ? Number(customCreditsInput) : 0)
        : Number(formData.credits);

    if (editingCourse) {
      const updated: Course = {
        ...editingCourse,
        code: formData.code.trim(),
        titleEn: formData.titleEn.trim(),
        titleTh: formData.titleTh.trim(),
        category: finalCourseType || editingCourse.category,
        courseType: finalCourseType,
        learningArea: finalLearningArea,
        credits: resolvedCredits,
        weeklyHours: Number(formData.weeklyHours),
        totalHours: Number(formData.totalHours),
        minAttendanceHours: Number(formData.minAttendanceHours),
        teacherName: formData.teacherName.trim(),
        teacherEmail: formData.teacherEmail.trim(),
        department: department || editingCourse.department,
        schedule: formData.schedule.trim(),
        room: formData.room.trim(),
        academicYear: formData.academicYear.trim(),
        semester: formData.semester,
        description: formData.description.trim(),
      };
      const duplicateReasons = getCourseDuplicateReasons(
        [updated],
        courses,
        [editingCourse.id]
      );
      const applyCourseUpdate = () => {
        onUpdateCourse?.(updated);
        setEditingCourse(null);
        setShowAddModal(false);
      };
      if (duplicateReasons.length > 0) {
        setPendingConfirm({
          title: 'พบข้อมูลรายวิชาซ้ำซ้อน',
          description: `${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`,
          confirmLabel: 'บันทึกต่อ',
          onConfirm: applyCourseUpdate,
        });
        return;
      }
      applyCourseUpdate();
      return;
    }

    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      code: formData.code.trim(),
      titleEn: formData.titleEn.trim(),
      titleTh: formData.titleTh.trim(),
      category: finalCourseType || 'core',
      courseType: finalCourseType || 'core',
      learningArea: finalLearningArea,
      credits: resolvedCredits,
      weeklyHours: Number(formData.weeklyHours),
      totalHours: Number(formData.totalHours),
      minAttendanceHours: Number(formData.minAttendanceHours),
      teacherName: formData.teacherName.trim(),
      teacherEmail: formData.teacherEmail.trim(),
      department,
      schedule: formData.schedule.trim(),
      room: formData.room.trim(),
      academicYear: formData.academicYear.trim(),
      semester: formData.semester,
      enrolledStudentIds: [],
      description: formData.description.trim(),
    };
    const duplicateReasons = getCourseDuplicateReasons([newCourse], courses);
    const applyAddCourse = () => {
      onAddCourse(newCourse);
      setActiveCourseId(newCourse.id);
      setActiveCourseDetailTab('overview');
      setShowAddModal(false);
      emitAppToast({
        tone: 'success',
        message: `เพิ่มรายวิชา ${newCourse.code} ${newCourse.titleTh} เรียบร้อยแล้ว`,
      });
    };
    if (duplicateReasons.length > 0) {
      setPendingConfirm({
        title: 'พบข้อมูลรายวิชาซ้ำซ้อน',
        description: `${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`,
        confirmLabel: 'บันทึกต่อ',
        onConfirm: applyAddCourse,
      });
      return;
    }
    applyAddCourse();
  };

  const activeCourse =
    filteredCourses.find((c) => c.id === activeCourseId) ||
    filteredCourses[0];
  const availableRoomsForEnroll = Array.from(
    new Set(students.map((s) => s.room).filter(Boolean))
  );
  const selectedEnrollRoom = enrollRoomInput && availableRoomsForEnroll.includes(enrollRoomInput)
    ? enrollRoomInput
    : (availableRoomsForEnroll[0] || '');
  const isDuplicateCourse = (course: Course) =>
    Boolean(course.code.trim()) && courses.filter((item) =>
      item.code.trim().toLowerCase() === course.code.trim().toLowerCase() &&
      item.academicYear === course.academicYear &&
      item.semester === course.semester
    ).length > 1;
  const duplicateExtraCourseIds = getCourseDuplicateExtraIds(courses);
  const executeDeleteSelectedCourses = async () => {
    if (selectedCourseIds.length === 0) return;
    setIsDeletingCourses(true);
    setCourseDeleteError(null);
    try {
      if (onDeleteCourses) {
        const deleted = await onDeleteCourses(selectedCourseIds);
        if (deleted === false) return;
      } else {
        for (const courseId of selectedCourseIds) {
          const deleted = await onDeleteCourse?.(courseId);
          if (deleted === false) return;
        }
      }
      setSelectedCourseIds([]);
    } catch (error) {
      setCourseDeleteError(error instanceof Error ? error.message : 'ลบรายวิชาไม่สำเร็จ');
    } finally {
      setIsDeletingCourses(false);
    }
  };

  const handleDeleteSelectedCourses = () => {
    if (selectedCourseIds.length === 0) return;
    setPendingConfirm({
      title: `ยืนยันลบรายวิชาที่เลือก (${selectedCourseIds.length} รายวิชา)`,
      description: `ต้องการลบรายวิชาที่เลือกทั้ง ${selectedCourseIds.length} รายวิชาออกจากระบบหรือไม่?`,
      detailNote: 'ระบบจะลบข้อมูลรายวิชา ผลการเรียนที่ผูกกับรายวิชา เคลียร์ตารางสอน และล้างข้อมูลแคชกับฐานข้อมูลที่เกี่ยวข้องทั้งหมด',
      confirmLabel: `ยืนยันลบ ${selectedCourseIds.length} วิชา`,
      onConfirm: executeDeleteSelectedCourses,
    });
  };

  const handleDeleteOneCourse = (course: Course) => {
    setPendingConfirm({
      title: `ยืนยันลบรายวิชา ${course.code}`,
      description: `ต้องการลบรายวิชา "${course.titleTh}" (${course.code}) ออกจากระบบหรือไม่?`,
      detailNote: 'ระบบจะลบข้อมูลรายวิชา รายชื่อลงทะเบียน คะแนนเก็บ/เกรดในรายวิชานี้ และล้างข้อมูลในแคชและฐานข้อมูล',
      confirmLabel: 'ยืนยันลบรายวิชา',
      onConfirm: async () => {
        setIsDeletingCourses(true);
        setCourseDeleteError(null);
        try {
          await onDeleteCourse?.(course.id);
        } catch (error) {
          setCourseDeleteError(error instanceof Error ? error.message : 'ลบรายวิชาไม่สำเร็จ');
        } finally {
          setIsDeletingCourses(false);
        }
      },
    });
  };

  const requestUnenrollStudent = (course: Course, student: Student) => {
    setPendingConfirm({
      title: 'ยืนยันยกเลิกการลงทะเบียนรายบุคคล',
      description: `ต้องการยกเลิกการลงทะเบียนของ "${student.firstNameTh} ${student.lastNameTh}" (${student.studentIdNumber}) ออกจากรายวิชา ${course.code} ${course.titleTh} หรือไม่?`,
      detailNote: 'การยกเลิกจะถอนรายชื่อออกจากรายวิชานี้ ล้างคะแนน/การส่งงานที่เกี่ยวข้อง และอัปเดตแคชในเครื่องกับฐานข้อมูลทันที',
      confirmLabel: 'ยืนยันยกเลิกลงทะเบียน',
      onConfirm: async () => {
        await onUnenrollStudent?.(course.id, student.id);
        setEnrollFeedback(`ยกเลิกลงทะเบียน ${student.firstNameTh} ${student.lastNameTh} (${student.studentIdNumber}) แล้ว`);
        emitAppToast({
          tone: 'info',
          message: `ยกเลิกลงทะเบียน ${student.firstNameTh} ${student.lastNameTh} ออกจาก ${course.code} แล้ว`,
        });
        setTimeout(() => setEnrollFeedback(null), 3500);
      },
    });
  };

  const coursesGroup = getModuleGroupMeta('courses');

  return (
    <div className={`${getModuleTone('courses')} h-full flex flex-col min-h-0 overflow-hidden space-y-2.5`}>
      {/* Compact Single-Row Header */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 app-page-header">
        <div className="flex items-center gap-2 min-w-0">
          <span className="tone-chip w-6 h-6 rounded-lg">
            <BookOpen className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-[var(--color-text-title)] leading-tight truncate">
              หลักสูตรและรายวิชา (Curriculum)
              <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)] font-mono tabular-nums">
                · {courses.length} วิชา
              </span>
            </h1>
            <span className="hidden xl:inline module-category-kicker">
              {coursesGroup.labelTh}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          <ModuleTourTrigger moduleId="courses" lang="th" />
          {canManageCourses && (
            <div data-guide-id="courses-header-actions" className="flex items-center gap-1.5 flex-wrap">
              {selectedCourseIds.length > 0 && (onDeleteCourses || onDeleteCourse) && (
                <button
                  type="button"
                  onClick={() => void handleDeleteSelectedCourses()}
                  disabled={isDeletingCourses}
                  className="btn-action-danger px-2.5 py-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingCourses ? 'กำลังลบ...' : `ลบที่เลือก (${selectedCourseIds.length})`}</span>
                </button>
              )}

              <details className="relative">
                <summary className="btn-tool-tone list-none px-2.5 py-1.5">
                  <span>เครื่องมือจัดการ</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </summary>
                <div className="absolute right-0 top-full z-30 mt-1.5 min-w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-lg space-y-0.5">
                  {onOpenImportExport && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        onOpenImportExport('courses');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>นำเข้า/ส่งออกวิชาการ</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        setShowDeptPresetModal(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 tone-text shrink-0" />
                      <span>จัดการกลุ่มสาระ</span>
                    </button>
                  )}

                  {filteredCourses.length > 0 && (onDeleteCourses || onDeleteCourse) && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        const visibleIds = filteredCourses.map((c) => c.id);
                        const allVisibleSelected = visibleIds.every((id) => selectedCourseIds.includes(id));
                        setSelectedCourseIds(allVisibleSelected ? [] : visibleIds);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--color-text-body)] transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 tone-text shrink-0" />
                      <span>
                        {filteredCourses.every((c) => selectedCourseIds.includes(c.id))
                          ? 'ล้างที่เลือก'
                          : `เลือกทุกรายวิชา (${filteredCourses.length})`}
                      </span>
                    </button>
                  )}

                  {duplicateExtraCourseIds.length > 0 && (onDeleteCourses || onDeleteCourse) && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        setSelectedCourseIds(duplicateExtraCourseIds);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-800 dark:text-amber-300 transition hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>เลือกเฉพาะวิชาซ้ำ ({duplicateExtraCourseIds.length})</span>
                    </button>
                  )}
                </div>
              </details>

              <button
                type="button"
                onClick={handleOpenAddCourse}
                className="btn-action-primary px-3 py-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายวิชาใหม่ (Add Course)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {courseDeleteError && (
        <p role="alert" className="shrink-0 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {courseDeleteError}
        </p>
      )}
      <div data-guide-id="courses-search-filter" className="shrink-0 toolbar-filter-zone space-y-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหารหัสวิชา ชื่อวิชา ครู หรือกลุ่มสาระ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--tone)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={showCourseFilters}
              onClick={() => setShowCourseFilters((shown) => !shown)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              ตัวกรอง{activeCourseFilterCount > 0 ? ` (${activeCourseFilterCount})` : ''}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCourseFilters ? 'rotate-180' : ''}`} />
            </button>
            <span className="shrink-0 text-xs text-[var(--color-text-muted)] tabular-nums">
              {filteredCourses.length} / {courses.length} วิชา
            </span>
            {hasActiveCourseFilters && (
              <button
                type="button"
                onClick={clearCourseFilters}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 whitespace-nowrap cursor-pointer"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>
        {showCourseFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 pt-2 border-t border-[var(--color-border)]">
            <select
              aria-label="กรองตามประเภทวิชา"
              value={selectedCourseType}
              onChange={(e) => setSelectedCourseType(e.target.value as CourseType | 'all')}
              className="w-full px-2.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            >
              <option value="all">ทุกประเภทวิชา</option>
              {COURSE_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.labelTh}</option>
              ))}
            </select>
            <select
              aria-label="กรองตามกลุ่มสาระการเรียนรู้"
              value={selectedLearningArea}
              onChange={(e) => setSelectedLearningArea(e.target.value as LearningStrandId | 'all')}
              className="w-full px-2.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            >
              <option value="all">ทุกกลุ่มสาระ</option>
              {COURSE_LEARNING_AREA_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.labelTh}</option>
              ))}
            </select>
            <select
              aria-label="กรองวิชาตามรายชื่อครู"
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            >
              <option value="all">ครูผู้สอนทุกคน ({teacherFilterOptions.length} ท่าน)</option>
              {teacherFilterOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label} ({option.count} วิชา)</option>
              ))}
            </select>
            {availableTermKeys.length > 1 ? (
              <select
                aria-label="กรองตามปีการศึกษาและภาคเรียน"
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
              >
                <option value="all">ทุกปีการศึกษา / ภาคเรียน</option>
                {availableTermKeys.map((key) => {
                  const [year, semester] = key.split('::');
                  return (
                    <option key={key} value={key}>
                      ปี {year} · {formatSemesterLabel(semester)}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="flex items-center px-2.5 py-2 text-xs text-[var(--color-text-muted)]">
                ปี {academicYear} · ภาคเรียน {formatSemesterLabel(currentSemester)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Course Catalog & Active Course Detail */}
      <div data-guide-id="courses-list-grid" className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Course Cards (7 cols) */}
        <div className="lg:col-span-7 h-full min-h-0 overflow-hidden pr-1">
          <PagedList
            items={filteredCourses}
            pageSize={3}
            emptyState={(
              <EmptyState
                icon={BookOpen}
                title={courses.length === 0 ? 'ยังไม่มีรายวิชาในหลักสูตร' : 'ไม่พบรายวิชาที่ตรงกับตัวกรอง'}
                description={courses.length === 0 ? 'เพิ่มรายวิชาใหม่เพื่อเริ่มจัดการหลักสูตรและลงทะเบียนนักเรียน' : 'ลองปรับคำค้นหาหรือล้างตัวกรองเพื่อดูรายวิชาทั้งหมด'}
                action={hasActiveCourseFilters
                  ? { label: 'ล้างตัวกรอง', onClick: clearCourseFilters, variant: 'neutral' }
                  : undefined}
              />
            )}
            renderItem={(course) => {
            const isSelected = activeCourse?.id === course.id;
            const credits = Number.isFinite(Number(course.credits)) ? Number(course.credits) : 1.5;
            const weeklyHours = course.weeklyHours ?? (credits > 0 ? Math.round(credits * 2) : 1);
            const totalHours = course.totalHours ?? (course.weeklyHours ? course.weeklyHours * 20 : (credits > 0 ? credits * 40 : 20));
            const minAtt = course.minAttendanceHours ?? Math.round(totalHours * 0.8);

            return (
              <div
                key={course.id}
                onClick={() => {
                  setActiveCourseId(course.id);
                  setActiveCourseDetailTab('overview');
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {canManageCourses && (
                        <input
                          type="checkbox"
                          aria-label={`เลือกรายวิชา ${course.code}`}
                          checked={selectedCourseIds.includes(course.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => setSelectedCourseIds((current) => (
                            event.target.checked
                              ? [...current, course.id]
                              : current.filter((id) => id !== course.id)
                          ))}
                          className="w-4 h-4 accent-rose-600"
                        />
                      )}
                      <span className="font-mono font-bold text-sm text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-700">
                        {course.code}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getCourseTypeBadgeClass(course)}`}>
                        {getCourseTypeLabel(course)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]">
                        {getLearningAreaLabel(course)}
                      </span>
                      {isDuplicateCourse(course) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                          รหัสซ้ำ
                        </span>
                      )}
                      {shouldShowCourseCredits(course.code, showPrimaryCourseCredits) && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]">
                          {credits === 0 ? 'ไม่มีหน่วยกิต' : `${credits} หน่วยกิต`}
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]">
                        {weeklyHours} ชั่วโมง/สัปดาห์
                      </span>
                    </div>

                    <h3 className="font-bold text-[var(--color-text-title)] text-base mt-2">
                      {course.titleTh}
                    </h3>
                    <p className="text-xs text-[var(--color-text-body)] opacity-85">
                      {course.titleEn}
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] shrink-0 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                    <span>{course.enrolledStudentIds?.length || 0} คน</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-body)]">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                    <span className="truncate">{course.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                    <span className="truncate">{course.schedule}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300 shrink-0" />
                    <span className="truncate">เกณฑ์ 80%: {minAtt}/{totalHours} ชม.</span>
                  </div>
                </div>
              </div>
            );
            }}
          />
        </div>

        {/* Right: Enrolled Students & Syllabus Detail (5 cols) */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-y-auto rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 space-y-4 shadow-xs">
          {activeCourse ? (
            <>
              <div role="tablist" aria-label="รายละเอียดรายวิชา" className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--color-card-subtle)] p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCourseDetailTab === 'overview'}
                  onClick={() => setActiveCourseDetailTab('overview')}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition ${activeCourseDetailTab === 'overview' ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'}`}
                >
                  ข้อมูลรายวิชา
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCourseDetailTab === 'students'}
                  onClick={() => setActiveCourseDetailTab('students')}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition ${activeCourseDetailTab === 'students' ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'}`}
                >
                  นักเรียน ({activeCourse.enrolledStudentIds?.length || 0})
                </button>
              </div>
              {activeCourseDetailTab === 'overview' && (
              <div className="border-b border-[var(--color-border)] pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[var(--color-primary-text)]">
                    {activeCourse.code} • ห้อง {activeCourse.room}
                  </span>
                  {canManageCourses && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCourse(activeCourse)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                        title="แก้ไขข้อมูลหลักสูตรและรายวิชา"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไขวิชา</span>
                      </button>
                      {onDeleteCourse && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteOneCourse(activeCourse)}
                          disabled={isDeletingCourses}
                          className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-xs cursor-pointer transition"
                          title="ลบรายวิชานี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${getCourseTypeBadgeClass(activeCourse)}`}>
                      {getCourseTypeLabel(activeCourse)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]">
                      {getLearningAreaLabel(activeCourse)}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] font-medium">
                      {formatSemesterLabel(activeCourse.semester || '1')} / {activeCourse.academicYear || academicYear}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] leading-snug">
                    {activeCourse.titleTh}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {activeCourse.titleEn}
                  </p>
                </div>

                {/* Academic Hours & 80% Criteria Box */}
                <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-100">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>หลักเกณฑ์ชั่วโมงเรียนและการมีสิทธิ์สอบ (ปพ.5)</span>
                    </span>
                    {shouldShowCourseCredits(activeCourse.code, showPrimaryCourseCredits) && (
                      <span className="font-mono text-blue-800 dark:text-blue-200">
                        {activeCourse.credits === 0 ? 'ไม่มีหน่วยกิต' : `${activeCourse.credits} หน่วยกิต`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]">
                      <div className="text-[10px] text-[var(--color-text-muted)]">ชั่วโมง/สัปดาห์</div>
                      <div className="font-bold text-[var(--color-text-title)]">
                        {activeCourse.weeklyHours ?? (activeCourse.credits > 0 ? Math.round(activeCourse.credits * 2) : 1)} ชั่วโมง
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]">
                      <div className="text-[10px] text-[var(--color-text-muted)]">ชั่วโมงรวม/เทอม</div>
                      <div className="font-bold text-[var(--color-text-title)]">
                        {activeCourse.totalHours ?? (activeCourse.credits > 0 ? activeCourse.credits * 40 : 20)} ชม.
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700">
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-200">เกณฑ์ 80% มีสิทธิ์สอบ</div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-100">
                        {activeCourse.minAttendanceHours ?? Math.round((activeCourse.totalHours ?? (activeCourse.credits > 0 ? activeCourse.credits * 40 : 20)) * 0.8)} ชม.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text-body)] space-y-1">
                  <p><strong className="text-[var(--color-text-title)]">หน่วยงาน/กลุ่มงาน:</strong> {activeCourse.department || 'ไม่ระบุ'}</p>
                  <p><strong className="text-[var(--color-text-title)]">ครูผู้สอน:</strong> {activeCourse.teacherName} ({activeCourse.teacherEmail})</p>
                  <p><strong className="text-[var(--color-text-title)]">เวลาและห้องเรียน:</strong> {activeCourse.schedule} @ {activeCourse.room}</p>
                </div>

                {activeCourse.description && (
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed pt-1 border-t border-[var(--color-border)]">
                    {activeCourse.description}
                  </p>
                )}
              </div>
              )}

              {/* Enrolled Students Roster */}
              {activeCourseDetailTab === 'students' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-title)] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span>นักเรียนที่ลงทะเบียน (<span className="tabular-nums">{activeCourse.enrolledStudentIds?.length || 0}</span> คน)</span>
                  </h3>

                  {canManageCourses && (activeCourse.enrolledStudentIds?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = [...(activeCourse.enrolledStudentIds || [])];
                        setPendingConfirm({
                          title: 'ยืนยันยกเลิกลงทะเบียนทั้งรายวิชา',
                          description: `ต้องการยกเลิกการลงทะเบียนนักเรียนทั้งหมด ${allIds.length} คน ออกจากรายวิชา ${activeCourse.code} ${activeCourse.titleTh} หรือไม่?`,
                          detailNote: 'ระบบจะถอนรายชื่อทั้งหมดออก พร้อมล้างคะแนน/การส่งงานที่เกี่ยวข้องในแคชและฐานข้อมูล',
                          confirmLabel: `ยืนยันยกเลิกทั้ง ${allIds.length} คน`,
                          onConfirm: async () => {
                            if (onUnenrollStudentsBatch) {
                              await onUnenrollStudentsBatch(activeCourse.id, allIds);
                            } else if (onUnenrollStudent) {
                              for (const id of allIds) {
                                await onUnenrollStudent(activeCourse.id, id);
                              }
                            }
                            setEnrollFeedback(`ยกเลิกการลงทะเบียนทั้งหมด (${allIds.length} คน) ออกจากรายวิชา ${activeCourse.code} แล้ว`);
                            setTimeout(() => setEnrollFeedback(null), 3500);
                          },
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>ยกเลิกทั้งหมด</span>
                    </button>
                  )}
                </div>

                {/* Quick Enroll / Unenroll Controls (Staff Only) */}
                {canManageCourses && (
                  <div className="space-y-2.5 pt-1">
                    {availableRoomsForEnroll.length > 0 && (() => {
                      const enrolledSet = new Set(activeCourse.enrolledStudentIds || []);
                      const pendingInSelectedRoom = students.filter(
                        (s) => s.room === selectedEnrollRoom && !enrolledSet.has(s.id)
                      );
                      const enrolledInSelectedRoom = students.filter(
                        (s) => s.room === selectedEnrollRoom && enrolledSet.has(s.id)
                      );
                      return (
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 whitespace-nowrap">
                              จัดการทั้งห้อง:
                            </span>
                            <select
                              value={selectedEnrollRoom}
                              onChange={(e) => setEnrollRoomInput(e.target.value)}
                              className="flex-1 min-w-28 px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] font-semibold"
                            >
                              {availableRoomsForEnroll.map((room) => {
                                const pendingInRoom = students.filter(
                                  (s) => s.room === room && !enrolledSet.has(s.id)
                                ).length;
                                const enrolledInRoom = students.filter(
                                  (s) => s.room === room && enrolledSet.has(s.id)
                                ).length;
                                return (
                                  <option key={room} value={room}>
                                    {room} (ลงแล้ว {enrolledInRoom} • ยังไม่ลง {pendingInRoom} คน)
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={pendingInSelectedRoom.length === 0}
                              onClick={() => {
                                if (!selectedEnrollRoom) return;
                                const idsToEnroll = pendingInSelectedRoom.map((s) => s.id);
                                if (idsToEnroll.length === 0) {
                                  setEnrollFeedback(`นักเรียนห้อง ${selectedEnrollRoom} ลงทะเบียนครบทุกคนแล้ว`);
                                  setTimeout(() => setEnrollFeedback(null), 3000);
                                  return;
                                }
                                if (onEnrollStudentsBatch) {
                                  onEnrollStudentsBatch(activeCourse.id, idsToEnroll);
                                } else {
                                  idsToEnroll.forEach((id) => onEnrollStudent(activeCourse.id, id));
                                }
                                setEnrollFeedback(`ลงทะเบียนนักเรียนห้อง ${selectedEnrollRoom} เพิ่ม ${idsToEnroll.length} คนเรียบร้อย`);
                                setTimeout(() => setEnrollFeedback(null), 3500);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>ลงทะเบียนทั้งห้อง ({pendingInSelectedRoom.length})</span>
                            </button>
                            <button
                              type="button"
                              disabled={enrolledInSelectedRoom.length === 0}
                              onClick={() => {
                                if (!selectedEnrollRoom) return;
                                const idsToUnenroll = enrolledInSelectedRoom.map((s) => s.id);
                                if (idsToUnenroll.length === 0) return;
                                const targetRoom = selectedEnrollRoom;
                                setPendingConfirm({
                                  title: `ยืนยันยกเลิกลงทะเบียนทั้งห้อง (${targetRoom})`,
                                  description: `ต้องการยกเลิกการลงทะเบียนนักเรียนห้อง ${targetRoom} จำนวน ${idsToUnenroll.length} คน ออกจากรายวิชา ${activeCourse.code} หรือไม่?`,
                                  detailNote: 'ระบบจะถอนรายชื่อนักเรียนทั้งห้องออกจากรายวิชา ล้างคะแนน/การส่งงานที่เกี่ยวข้อง และอัปเดตแคชกับฐานข้อมูล',
                                  confirmLabel: `ยืนยันยกเลิก ${idsToUnenroll.length} คน`,
                                  onConfirm: async () => {
                                    if (onUnenrollStudentsBatch) {
                                      await onUnenrollStudentsBatch(activeCourse.id, idsToUnenroll);
                                    } else if (onUnenrollStudent) {
                                      for (const id of idsToUnenroll) {
                                        await onUnenrollStudent(activeCourse.id, id);
                                      }
                                    }
                                    setEnrollFeedback(`ยกเลิกลงทะเบียนนักเรียนห้อง ${targetRoom} จำนวน ${idsToUnenroll.length} คนเรียบร้อย`);
                                    setTimeout(() => setEnrollFeedback(null), 3500);
                                  },
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[var(--color-card)] hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 disabled:opacity-45 disabled:cursor-not-allowed text-rose-700 dark:text-rose-200 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>ยกเลิกทั้งห้อง ({enrolledInSelectedRoom.length})</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {enrollFeedback && (
                      <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        {enrollFeedback}
                      </div>
                    )}

                    {/* Searchable Individual Enrollment Picker */}
                    {(() => {
                      const enrolledSet = new Set(activeCourse.enrolledStudentIds || []);
                      const normalizedQuery = individualSearchQuery.trim().toLowerCase();
                      const unenrolledStudents = students.filter((s) => !enrolledSet.has(s.id));
                      const matchingStudents = normalizedQuery
                        ? students.filter((s) => {
                            const fullNameTh = `${s.firstNameTh} ${s.lastNameTh}`.toLowerCase();
                            const fullNameEn = `${s.firstNameEn} ${s.lastNameEn}`.toLowerCase();
                            return (
                              (s.studentIdNumber || '').toLowerCase().includes(normalizedQuery) ||
                              fullNameTh.includes(normalizedQuery) ||
                              fullNameEn.includes(normalizedQuery) ||
                              (s.room || '').toLowerCase().includes(normalizedQuery)
                            );
                          })
                        : [];

                      return (
                        <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-[var(--color-text-title)]">
                              เพิ่ม / ค้นหาลงทะเบียนรายบุคคล
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                              ยังไม่ลง {unenrolledStudents.length} คน
                            </span>
                          </div>

                          {/* Name / Student ID Search Bar */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={individualSearchQuery}
                              onChange={(e) => setIndividualSearchQuery(e.target.value)}
                              placeholder="ค้นหาชื่อ-สกุล หรือรหัสนักเรียน เพื่อเพิ่มรายคน..."
                              className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                            />
                            {individualSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setIndividualSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                                title="ล้างคำค้นหา"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Live Search Matches with Instant 1-Click Enroll/Unenroll */}
                          {normalizedQuery ? (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                              {matchingStudents.length === 0 ? (
                                <p className="text-[11px] text-[var(--color-text-muted)] text-center py-2">
                                  ไม่พบนักเรียนที่ตรงกับ "{individualSearchQuery}"
                                </p>
                              ) : (
                                matchingStudents.slice(0, 20).map((stu) => {
                                  const isAlreadyEnrolled = enrolledSet.has(stu.id);
                                  return (
                                    <div
                                      key={stu.id}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                                          {stu.firstNameTh} {stu.lastNameTh}
                                        </p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-mono tabular-nums">
                                          {stu.studentIdNumber} • {stu.room}
                                        </p>
                                      </div>
                                      {isAlreadyEnrolled ? (
                                        <button
                                          type="button"
                                          onClick={() => requestUnenrollStudent(activeCourse, stu)}
                                          className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                                        >
                                          <UserMinus className="w-3 h-3" />
                                          <span>ยกเลิก</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onEnrollStudent(activeCourse.id, stu.id);
                                            setEnrollFeedback(`ลงทะเบียน ${stu.firstNameTh} ${stu.lastNameTh} (${stu.studentIdNumber}) เรียบร้อย`);
                                            setTimeout(() => setEnrollFeedback(null), 3000);
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                                        >
                                          <UserPlus className="w-3 h-3" />
                                          <span>เพิ่มรายคน</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedIndividualStudentId}
                                onChange={(e) => setSelectedIndividualStudentId(e.target.value)}
                                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                              >
                                <option value="">หรือเลือกจากรายชื่อทั้งหมด ({unenrolledStudents.length} คน)...</option>
                                {unenrolledStudents.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.studentIdNumber} - {s.firstNameTh} {s.lastNameTh} ({s.room})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!selectedIndividualStudentId}
                                onClick={() => {
                                  if (!selectedIndividualStudentId) return;
                                  const stu = students.find((s) => s.id === selectedIndividualStudentId);
                                  onEnrollStudent(activeCourse.id, selectedIndividualStudentId);
                                  setSelectedIndividualStudentId('');
                                  if (stu) {
                                    setEnrollFeedback(`ลงทะเบียน ${stu.firstNameTh} ${stu.lastNameTh} เรียบร้อย`);
                                    setTimeout(() => setEnrollFeedback(null), 3000);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>เพิ่มรายคน</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Enrolled Student Search & Paginated List */}
                <div className="space-y-2 pr-1 pt-1">
                  {(activeCourse.enrolledStudentIds || []).length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] py-4 text-center border border-dashed border-[var(--color-border)] rounded-xl">
                      ยังไม่มีนักเรียนลงทะเบียนในรายวิชานี้
                    </p>
                  ) : (() => {
                    const q = enrolledSearchQuery.trim().toLowerCase();
                    const filteredEnrolledIds = (activeCourse.enrolledStudentIds || []).filter((studentId) => {
                      if (!q) return true;
                      const stu = students.find((s) => s.id === studentId);
                      if (!stu) return false;
                      return (
                        stu.studentIdNumber.toLowerCase().includes(q) ||
                        `${stu.firstNameTh} ${stu.lastNameTh}`.toLowerCase().includes(q) ||
                        `${stu.firstNameEn} ${stu.lastNameEn}`.toLowerCase().includes(q) ||
                        (stu.room || '').toLowerCase().includes(q)
                      );
                    });
                    return (
                      <>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={enrolledSearchQuery}
                            onChange={(e) => setEnrolledSearchQuery(e.target.value)}
                            placeholder="กรองรายชื่อนักเรียนที่ลงทะเบียนแล้ว (ชื่อ / รหัส / ห้อง)..."
                            className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                          />
                          {enrolledSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setEnrolledSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                              title="ล้างคำค้นหา"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {filteredEnrolledIds.length === 0 ? (
                          <p className="text-xs text-[var(--color-text-muted)] py-4 text-center border border-dashed border-[var(--color-border)] rounded-xl">
                            ไม่พบนักเรียนที่ตรงกับ "{enrolledSearchQuery}"
                          </p>
                        ) : (
                          <PagedList items={filteredEnrolledIds} pageSize={5} renderItem={(studentId: string) => {
                            const student = students.find((s) => s.id === studentId);
                            if (!student) return null;
                            return (
                              <div
                                key={student.id}
                                className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                                    alt={student.firstNameEn}
                                    className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[var(--color-text-title)] truncate">
                                      {student.firstNameTh} {student.lastNameTh}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono tabular-nums truncate">
                                      {student.studentIdNumber} • {student.room}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {(() => {
                                    const studentSummary = calculateStudentAcademicSummary({
                                      student,
                                      courses,
                                      grades,
                                      gradingSystem,
                                      currentAcademicYear: academicYear,
                                      currentSemester,
                                    });
                                    return (
                                      <span className="text-[11px] font-mono tabular-nums text-[var(--color-primary-text)] font-bold">
                                        {isPrimaryGradeLevel(student.gradeLevel)
                                          ? 'ประเมินรายปี'
                                          : studentSummary.hasRecordedGrades && studentSummary.gpax !== null
                                          ? `GPA ${studentSummary.gpax.toFixed(2)}`
                                          : 'ยังไม่ตัดเกรด'}
                                      </span>
                                    );
                                  })()}
                                  {canManageCourses && (
                                    <button
                                      type="button"
                                      onClick={() => requestUnenrollStudent(activeCourse, student)}
                                      title="ยกเลิกลงทะเบียนรายวิชานี้"
                                      className="px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                                    >
                                      <UserMinus className="w-3 h-3" />
                                      <span>ยกเลิก</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          }} />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              )}
            </>
          ) : (
            <EmptyState
              compact
              icon={BookOpen}
              title={
                courses.length === 0
                  ? 'ยังไม่มีรายวิชาในหลักสูตร'
                  : filteredCourses.length === 0
                    ? 'ไม่พบรายวิชาที่ตรงกับตัวกรอง'
                    : 'เลือกรายวิชาเพื่อดูรายละเอียดหลักสูตร'
              }
              action={filteredCourses.length === 0 && hasActiveCourseFilters
                ? { label: 'ล้างตัวกรอง', onClick: clearCourseFilters, variant: 'neutral' }
                : undefined}
            />
          )}
        </div>
      </div>

      {/* Add / Edit Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="modal-enter bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--color-primary-text)]" />
                <span>{editingCourse ? 'แก้ไขข้อมูลหลักสูตรและรายวิชา (Edit Course)' : 'เพิ่มรายวิชาใหม่ลงหลักสูตร (Add New Course to Syllabus)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] text-lg font-bold cursor-pointer px-2 py-0.5 rounded-lg hover:bg-[var(--color-card-subtle)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateCourse} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-primary-light)] text-[10px] font-bold text-[var(--color-primary-text)]">1</span>
                <h4 className="font-bold text-[var(--color-text-title)]">ข้อมูลรายวิชา</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">
                    รหัสวิชา (Course Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ว30201, CS302, ค31101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-primary-text)] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">
                    ประเภทวิชา {editingCourse ? '' : <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    required={!editingCourse}
                    value={formData.courseType}
                    onChange={(e) => setFormData({ ...formData, courseType: e.target.value as CourseType | '' })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                  >
                    {editingCourse && <option value="">ไม่ระบุ (คงข้อมูลเดิม)</option>}
                    {COURSE_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.labelTh}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">
                    ชื่อวิชาภาษาไทย (Thai Title) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วิทยาการคำนวณและปัญญาประดิษฐ์"
                    value={formData.titleTh}
                    onChange={(e) => setFormData({ ...formData, titleTh: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">
                    Course Title (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computing Science &amp; AI"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] font-medium mb-1">
                  กลุ่มสาระการเรียนรู้ {editingCourse ? '' : <span className="text-rose-500">*</span>}
                </label>
                <select
                  required={!editingCourse && formData.courseType !== 'activities'}
                  value={formData.learningArea}
                  onChange={(e) => setFormData({ ...formData, learningArea: e.target.value as LearningStrandId | '' })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                >
                  <option value="">
                    {editingCourse ? 'ไม่ระบุ (คงข้อมูลเดิม)' : formData.courseType === 'activities' ? 'ไม่ใช้กับกิจกรรม' : 'เลือกกลุ่มสาระการเรียนรู้'}
                  </option>
                  {COURSE_LEARNING_AREA_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.labelTh}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  ใช้จัดกลุ่มหลักสูตรและเชื่อมโยงมาตรฐานการเรียนรู้
                </p>
              </div>

              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 pt-1">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-primary-light)] text-[10px] font-bold text-[var(--color-primary-text)]">2</span>
                <h4 className="font-bold text-[var(--color-text-title)]">หน่วยกิตและเกณฑ์การเรียน</h4>
              </div>
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-100">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>หน่วยกิต และการคำนวณเกณฑ์ชั่วโมงเรียนตลอดภาคเรียน (สพฐ.)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[var(--color-text-body)] font-medium mb-1">หน่วยกิต (Credits)</label>
                    <select
                      aria-label="หน่วยกิต (Credits)"
                      value={creditMode === 'custom' ? 'custom' : String(formData.credits)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setCreditMode('custom');
                          setCustomCreditsInput(String(formData.credits));
                          return;
                        }
                        const numeric = Number(val);
                        setCreditMode('preset');
                        setCustomCreditsInput(String(numeric));
                        handleCreditsChange(numeric);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] font-bold text-[var(--color-primary-text)]"
                    >
                      <option value="0">ไม่มีหน่วยกิต</option>
                      <option value="0.5">0.5 หน่วยกิต (20 ชม.)</option>
                      <option value="1">1.0 หน่วยกิต (40 ชม.)</option>
                      <option value="1.5">1.5 หน่วยกิต (60 ชม.)</option>
                      <option value="2">2.0 หน่วยกิต (80 ชม.)</option>
                      <option value="3">3.0 หน่วยกิต (120 ชม.)</option>
                      <option value="custom">ใส่หน่วยกิตเอง...</option>
                    </select>
                    {creditMode === 'custom' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          type="number"
                          required
                          min={0}
                          max={20}
                          step="0.1"
                          placeholder="ระบุหน่วยกิต เช่น 2.5"
                          aria-label="ระบุหน่วยกิตเอง"
                          value={customCreditsInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setCustomCreditsInput(raw);
                            if (raw.trim() === '') return;
                            const parsed = Number(raw);
                            if (Number.isFinite(parsed) && parsed >= 0) {
                              handleCreditsChange(parsed);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-primary)] font-bold text-[var(--color-primary-text)]"
                        />
                        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap">
                          หน่วยกิต
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-body)] font-medium mb-1">ชั่วโมง/สัปดาห์</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.weeklyHours}
                      onChange={(e) => {
                        const w = Number(e.target.value);
                        setFormData({
                          ...formData,
                          weeklyHours: w,
                          totalHours: w * 20,
                          minAttendanceHours: Math.round(w * 20 * 0.8),
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--color-text-body)] font-medium mb-1">ชั่วโมงรวม/เทอม</label>
                    <input
                      type="number"
                      value={formData.totalHours}
                      onChange={(e) => setFormData({ ...formData, totalHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)]"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-800 dark:text-emerald-300 font-medium mb-1">เกณฑ์ 80% (สิทธิ์สอบ)</label>
                    <input
                      type="number"
                      value={formData.minAttendanceHours}
                      onChange={(e) => setFormData({ ...formData, minAttendanceHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 pt-1">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-primary-light)] text-[10px] font-bold text-[var(--color-primary-text)]">3</span>
                <h4 className="font-bold text-[var(--color-text-title)]">ผู้สอนและการจัดการเรียน</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">สังกัด / หน่วยงานเพิ่มเติม</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    <option value="">ไม่ระบุหน่วยงานเพิ่มเติม</option>
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">ครูผู้สอน (Teacher / Instructor)</label>
                  <input
                    type="text"
                    required
                    list="courses-teacher-datalist"
                    placeholder="เช่น อ.ดร.ประเสริฐ ถาวร"
                    value={formData.teacherName}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      const matchedTeacher = teachers.find(
                        (t) =>
                          t.fullNameTh.trim().toLowerCase() === nextName.trim().toLowerCase() ||
                          t.fullNameEn.trim().toLowerCase() === nextName.trim().toLowerCase()
                      );
                      setFormData({
                        ...formData,
                        teacherName: nextName,
                        teacherEmail: matchedTeacher?.email || formData.teacherEmail,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                  <datalist id="courses-teacher-datalist">
                    {teacherSelectableNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">วันและเวลาเรียน (Schedule)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น จันทร์, พุธ 09:00 - 10:30"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">ห้องเรียน / ห้องแล็บ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ห้อง 401, Lab 3"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">ภาคเรียน / ปีการศึกษา</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-1/2 px-2 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    >
                      {[...new Set([...semesterOptions, formData.semester])].map((semester) => (
                        <option key={semester} value={semester}>{formatSemesterLabel(semester)}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder={academicYear}
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-1/2 px-2 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text-title)]">
                  คำอธิบายรายวิชาและจุดประสงค์ (ไม่บังคับ)
                </summary>
                <div className="pt-3">
                  <textarea
                    rows={3}
                    aria-label="คำอธิบายรายวิชาและจุดประสงค์"
                    placeholder="ระบุจุดประสงค์การเรียนรู้ สาระสำคัญ และขอบเขตการวัดและประเมินผล..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </details>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold cursor-pointer shadow-sm"
                >
                  {editingCourse ? 'บันทึกการแก้ไขวิชา' : 'บันทึกรายวิชาใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Department Preset Manager Modal */}
      {showDeptPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                จัดการรายชื่อกลุ่มสาระ / แผนกวิชา (สำหรับผู้ดูแลระบบ)
              </h3>
              <button
                type="button"
                onClick={() => setShowDeptPresetModal(false)}
                className="text-lg font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeptInput}
                onChange={(e) => setNewDeptInput(e.target.value)}
                placeholder="เพิ่มชื่อกลุ่มสาระ/ฝ่ายใหม่ เช่น กลุ่มสาระเทคโนโลยีและหุ่นยนต์"
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
              />
              <button
                type="button"
                onClick={() => {
                  const val = newDeptInput.trim();
                  if (!val) return;
                  updatePresets({ departments: [...availableDepartments, val] });
                  setNewDeptInput('');
                }}
                className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold cursor-pointer"
              >
                + เพิ่ม
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs">
              {presets.departments.map((dept) => (
                <div key={dept} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-title)] font-medium">{dept}</span>
                  {presets.departments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => updatePresets({ departments: presets.departments.filter((d) => d !== dept) })}
                      className="text-rose-600 hover:text-rose-700 font-bold text-xs cursor-pointer"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ConfirmActionModal
        isOpen={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || ''}
        description={pendingConfirm?.description || ''}
        detailNote={pendingConfirm?.detailNote}
        confirmLabel={pendingConfirm?.confirmLabel || 'ยืนยัน'}
        isBusy={isConfirmingAction}
        onCancel={() => {
          if (!isConfirmingAction) setPendingConfirm(null);
        }}
        onConfirm={async () => {
          if (!pendingConfirm) return;
          setIsConfirmingAction(true);
          try {
            await pendingConfirm.onConfirm();
            setPendingConfirm(null);
          } catch (error) {
            setCourseDeleteError(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
            setPendingConfirm(null);
          } finally {
            setIsConfirmingAction(false);
          }
        }}
      />
    </div>
  );
};
