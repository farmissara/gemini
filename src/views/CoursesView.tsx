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
  X
} from 'lucide-react';
import { Course, Student, UserRole } from '../types';
import { PagedList } from '../components/PagedList';
import {
  getCourseDuplicateExtraIds,
  getCourseDuplicateReasons,
} from '../lib/duplicateRecords';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';

interface CoursesViewProps {
  courses: Course[];
  students: Student[];
  currentRole?: UserRole;
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
}

export const STANDARD_CATEGORIES: { key: string; th: string; en: string; defaultColor: string }[] = [
  { key: 'core', th: 'รายวิชาพื้นฐาน', en: 'Core Requirement', defaultColor: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200' },
  { key: 'elective', th: 'รายวิชาเพิ่มเติม', en: 'Elective Requirement', defaultColor: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-200' },
  { key: 'stem', th: 'วิทยาศาสตร์และเทคโนโลยี (STEM)', en: 'Science & Technology (STEM)', defaultColor: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200' },
  { key: 'language', th: 'ภาษาต่างประเทศและภาษาไทย', en: 'Foreign & Thai Languages', defaultColor: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200' },
  { key: 'arts', th: 'ศิลปะ ดนตรี และนาฏศิลป์', en: 'Arts & Humanities', defaultColor: 'border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-950 text-pink-900 dark:text-pink-200' },
  { key: 'social', th: 'สังคมศึกษา ศาสนา และวัฒนธรรม', en: 'Social Studies', defaultColor: 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-200' },
  { key: 'pe', th: 'สุขศึกษาและพลศึกษา', en: 'Health & Physical Education', defaultColor: 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 text-rose-900 dark:text-rose-200' },
  { key: 'career', th: 'การงานอาชีพและเทคโนโลยี', en: 'Career & Vocational', defaultColor: 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950 text-teal-900 dark:text-teal-200' },
  { key: 'activities', th: 'กิจกรรมพัฒนาผู้เรียน / แนะแนว', en: 'Student Development Activities', defaultColor: 'border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-950 text-cyan-900 dark:text-cyan-200' },
];

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

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  students,
  currentRole = 'admin',
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
}) => {
  const canManageCourses = currentRole !== 'student' && currentRole !== 'parent';
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const availableDepartments = Array.from(new Set([...DEPARTMENTS, ...presets.departments]));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseDeleteError, setCourseDeleteError] = useState<string | null>(null);
  const [isDeletingCourses, setIsDeletingCourses] = useState(false);

  // Category selection mode in form: 'preset' or 'custom'
  const [categoryMode, setCategoryMode] = useState<'preset' | 'custom'>('preset');
  const [customCategoryText, setCustomCategoryText] = useState('');

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    titleEn: string;
    titleTh: string;
    category: string;
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
    category: 'core',
    credits: 1.5,
    weeklyHours: 3,
    totalHours: 60,
    minAttendanceHours: 48,
    teacherName: '',
    teacherEmail: '',
    department: DEPARTMENTS[0],
    schedule: 'จันทร์, พุธ 09:00 - 10:30',
    room: 'ห้อง 401',
    academicYear,
    semester: currentSemester,
    description: '',
  });

  // Filter courses by search and category
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titleTh.includes(searchTerm) ||
      c.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Helper to get category Thai label
  const getCategoryLabel = (catKey: string) => {
    const found = STANDARD_CATEGORIES.find((sc) => sc.key === catKey);
    return found ? `${found.th} (${found.en})` : catKey;
  };

  const getCategoryBadgeClass = (catKey: string) => {
    const found = STANDARD_CATEGORIES.find((sc) => sc.key === catKey);
    return found ? found.defaultColor : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  };

  // Open modal for creating a new course (RESET all states cleanly)
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setCategoryMode('preset');
    setCustomCategoryText('');
    
    // Suggest code based on existing count
    const nextCode = `ว${30200 + courses.length + 1}`;
    setFormData({
      code: nextCode,
      titleEn: '',
      titleTh: '',
      category: 'core',
      credits: 1.5,
      weeklyHours: 3,
      totalHours: 60,
      minAttendanceHours: 48,
      teacherName: 'อ.ดร.ประเสริฐ ถาวร',
      teacherEmail: 'prasert.t@eduverse.ac.th',
      department: DEPARTMENTS[0],
      schedule: 'จันทร์, พุธ 09:00 - 10:30',
      room: 'ห้องปฏิบัติการ 401',
      academicYear,
      semester: currentSemester,
      description: 'คำอธิบายรายวิชาและจุดประสงค์การเรียนรู้ตามหลักสูตรแกนกลาง',
    });
    setShowAddModal(true);
  };

  // Open modal for editing an existing course
  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    const isStandard = STANDARD_CATEGORIES.some((sc) => sc.key === course.category);
    if (isStandard) {
      setCategoryMode('preset');
      setCustomCategoryText('');
    } else {
      setCategoryMode('custom');
      setCustomCategoryText(course.category);
    }

    const calculatedCredits = course.credits || 1.5;
    const calculatedWeekly = course.weeklyHours || Math.round(calculatedCredits * 2);
    const calculatedTotal = course.totalHours || calculatedWeekly * 20;
    const calculatedMin = course.minAttendanceHours || Math.round(calculatedTotal * 0.8);

    setFormData({
      code: course.code,
      titleEn: course.titleEn,
      titleTh: course.titleTh,
      category: course.category,
      credits: calculatedCredits,
      weeklyHours: calculatedWeekly,
      totalHours: calculatedTotal,
      minAttendanceHours: calculatedMin,
      teacherName: course.teacherName,
      teacherEmail: course.teacherEmail,
      department: course.department || DEPARTMENTS[0],
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
    const weekly = Math.max(1, Math.round(newCredits * 2));
    const total = weekly * 20; // 20 weeks per semester
    const minAtt = Math.round(total * 0.8); // 80% attendance rule
    setFormData((prev) => ({
      ...prev,
      credits: newCredits,
      weeklyHours: weekly,
      totalHours: total,
      minAttendanceHours: minAtt,
    }));
  };

  const handleCreateOrUpdateCourse = (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = categoryMode === 'custom' && customCategoryText.trim()
      ? customCategoryText.trim()
      : formData.category || 'core';

    if (editingCourse) {
      const updated: Course = {
        ...editingCourse,
        code: formData.code.trim(),
        titleEn: formData.titleEn.trim(),
        titleTh: formData.titleTh.trim(),
        category: finalCategory,
        credits: Number(formData.credits),
        weeklyHours: Number(formData.weeklyHours),
        totalHours: Number(formData.totalHours),
        minAttendanceHours: Number(formData.minAttendanceHours),
        teacherName: formData.teacherName.trim(),
        teacherEmail: formData.teacherEmail.trim(),
        department: formData.department.trim(),
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
      if (duplicateReasons.length > 0 && !confirm(`${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`)) return;
      onUpdateCourse?.(updated);
      setEditingCourse(null);
      setShowAddModal(false);
      return;
    }

    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      code: formData.code.trim(),
      titleEn: formData.titleEn.trim(),
      titleTh: formData.titleTh.trim(),
      category: finalCategory,
      credits: Number(formData.credits),
      weeklyHours: Number(formData.weeklyHours),
      totalHours: Number(formData.totalHours),
      minAttendanceHours: Number(formData.minAttendanceHours),
      teacherName: formData.teacherName.trim(),
      teacherEmail: formData.teacherEmail.trim(),
      department: formData.department.trim(),
      schedule: formData.schedule.trim(),
      room: formData.room.trim(),
      academicYear: formData.academicYear.trim(),
      semester: formData.semester,
      enrolledStudentIds: [],
      description: formData.description.trim(),
    };
    const duplicateReasons = getCourseDuplicateReasons([newCourse], courses);
    if (duplicateReasons.length > 0 && !confirm(`${duplicateReasons.join(' และ ')} ต้องการบันทึกต่อหรือไม่?`)) return;
    onAddCourse(newCourse);
    setActiveCourseId(newCourse.id);
    setShowAddModal(false);
  };

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];
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
        setTimeout(() => setEnrollFeedback(null), 3500);
      },
    });
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Top Header */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-3 app-page-header">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            หลักสูตรและรายวิชา (Curriculum)
          </h1>
          <span className="text-xs text-[var(--color-text-muted)] font-mono tabular-nums whitespace-nowrap">
            · {courses.length} วิชา
          </span>
        </div>

        {canManageCourses && (
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Quick Academic Import / Export Button */}
            {onOpenImportExport && (
              <button
                type="button"
                onClick={() => onOpenImportExport('courses')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>นำเข้า/ส่งออกวิชาการ</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowDeptPresetModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>จัดการกลุ่มสาระ</span>
              </button>
            )}

            {filteredCourses.length > 0 && (onDeleteCourses || onDeleteCourse) && (
              <button
                type="button"
                onClick={() => {
                  const visibleIds = filteredCourses.map((c) => c.id);
                  const allVisibleSelected = visibleIds.every((id) => selectedCourseIds.includes(id));
                  setSelectedCourseIds(allVisibleSelected ? [] : visibleIds);
                }}
                className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-semibold hover:bg-[var(--color-primary-light)] cursor-pointer"
              >
                {filteredCourses.every((c) => selectedCourseIds.includes(c.id)) ? 'ล้างที่เลือก' : `เลือกทั้งหมด (${filteredCourses.length})`}
              </button>
            )}

            {selectedCourseIds.length > 0 && (onDeleteCourses || onDeleteCourse) && (
              <button
                type="button"
                onClick={() => void handleDeleteSelectedCourses()}
                disabled={isDeletingCourses}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-xs font-bold hover:bg-rose-100 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingCourses ? 'กำลังลบ...' : `ลบที่เลือก (${selectedCourseIds.length})`}</span>
              </button>
            )}

            {duplicateExtraCourseIds.length > 0 && (onDeleteCourses || onDeleteCourse) && (
              <button
                type="button"
                onClick={() => setSelectedCourseIds(duplicateExtraCourseIds)}
                className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                title="เลือกเฉพาะรายการซ้ำโดยเก็บต้นฉบับไว้ 1 รายการต่อรหัสวิชา"
              >
                เลือกเฉพาะวิชาซ้ำ ({duplicateExtraCourseIds.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddCourse}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายวิชาใหม่ (Add Course)</span>
            </button>
          </div>
        )}
      </div>

      {courseDeleteError && (
        <p role="alert" className="shrink-0 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {courseDeleteError}
        </p>
      )}
      <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาตามรหัสวิชา, ชื่อวิชา หรืออาจารย์ผู้สอน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
            }`}
          >
            ทุกหมวดวิชา ({courses.length})
          </button>
          {STANDARD_CATEGORIES.map((cat) => {
            const count = courses.filter((c) => c.category === cat.key).length;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)]'
                }`}
              >
                {cat.th} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Course Catalog & Active Course Detail */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Course Cards (7 cols) */}
        <div className="lg:col-span-7 h-full min-h-0 overflow-hidden pr-1">
          <PagedList items={filteredCourses} pageSize={3} renderItem={(course) => {
            const isSelected = activeCourse?.id === course.id;
            const credits = course.credits || 1.5;
            const weeklyHours = course.weeklyHours ?? Math.round(credits * 2);
            const totalHours = course.totalHours || (course.weeklyHours ? course.weeklyHours * 20 : credits * 40);
            const minAtt = course.minAttendanceHours || Math.round(totalHours * 0.8);

            return (
              <div
                key={course.id}
                onClick={() => setActiveCourseId(course.id)}
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
                      {isDuplicateCourse(course) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                          รหัสซ้ำ
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]">
                        {credits} หน่วยกิต
                      </span>
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
          }} />
        </div>

        {/* Right: Enrolled Students & Syllabus Detail (5 cols) */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-y-auto rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 space-y-4 shadow-xs">
          {activeCourse ? (
            <>
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
                    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${getCategoryBadgeClass(activeCourse.category)}`}>
                      {getCategoryLabel(activeCourse.category)}
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
                    <span className="font-mono text-blue-800 dark:text-blue-200">{activeCourse.credits} หน่วยกิต</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]">
                      <div className="text-[10px] text-[var(--color-text-muted)]">ชั่วโมง/สัปดาห์</div>
                      <div className="font-bold text-[var(--color-text-title)]">{activeCourse.weeklyHours ?? Math.round(activeCourse.credits * 2)} ชั่วโมง</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)]">
                      <div className="text-[10px] text-[var(--color-text-muted)]">ชั่วโมงรวม/เทอม</div>
                      <div className="font-bold text-[var(--color-text-title)]">{activeCourse.totalHours || (activeCourse.credits * 40)} ชม.</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700">
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-200">เกณฑ์ 80% มีสิทธิ์สอบ</div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-100">{activeCourse.minAttendanceHours || Math.round((activeCourse.credits * 40) * 0.8)} ชม.</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text-body)] space-y-1">
                  <p><strong className="text-[var(--color-text-title)]">กลุ่มสาระการเรียนรู้:</strong> {activeCourse.department || 'ไม่ระบุ'}</p>
                  <p><strong className="text-[var(--color-text-title)]">ครูผู้สอน:</strong> {activeCourse.teacherName} ({activeCourse.teacherEmail})</p>
                  <p><strong className="text-[var(--color-text-title)]">เวลาและห้องเรียน:</strong> {activeCourse.schedule} @ {activeCourse.room}</p>
                </div>

                {activeCourse.description && (
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed pt-1 border-t border-[var(--color-border)]">
                    {activeCourse.description}
                  </p>
                )}
              </div>

              {/* Enrolled Students Roster */}
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
                              s.studentIdNumber.toLowerCase().includes(normalizedQuery) ||
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
                                  <span className="text-[11px] font-mono tabular-nums text-[var(--color-primary-text)] font-bold">
                                    GPA {student.gpa}
                                  </span>
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
            </>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-10">เลือกรายวิชาเพื่อดูรายละเอียดหลักสูตร</p>
          )}
        </div>
      </div>

      {/* Add / Edit Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
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
              {/* Row 1: Code and Category */}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[var(--color-text-body)] font-medium">
                      หมวดหมู่วิชา (Category) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (categoryMode === 'preset') {
                          setCategoryMode('custom');
                          setCustomCategoryText(formData.category);
                        } else {
                          setCategoryMode('preset');
                        }
                      }}
                      className="text-[11px] text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer"
                    >
                      {categoryMode === 'preset' ? '✎ พิมพ์หมวดหมู่อื่นเอง' : 'เลือกจากรายการมาตรฐาน'}
                    </button>
                  </div>

                  {categoryMode === 'preset' ? (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                    >
                      {STANDARD_CATEGORIES.map((cat) => (
                        <option key={cat.key} value={cat.key}>
                          {cat.th} ({cat.en})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="เช่น วิชาชีพเฉพาะ, วิชาเลือกเสรี, กิจกรรมจิตอาสา"
                      value={customCategoryText}
                      onChange={(e) => {
                        setCustomCategoryText(e.target.value);
                        setFormData({ ...formData, category: e.target.value });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Row 2: Titles */}
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

              {/* Row 3: Credits and Academic Hours Criteria */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-100">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>หน่วยกิต และการคำนวณเกณฑ์ชั่วโมงเรียนตลอดภาคเรียน (สพฐ.)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[var(--color-text-body)] font-medium mb-1">หน่วยกิต (Credits)</label>
                    <select
                      value={formData.credits}
                      onChange={(e) => handleCreditsChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] font-bold text-[var(--color-primary-text)]"
                    >
                      <option value={0.5}>0.5 หน่วยกิต (20 ชม.)</option>
                      <option value={1.0}>1.0 หน่วยกิต (40 ชม.)</option>
                      <option value={1.5}>1.5 หน่วยกิต (60 ชม.)</option>
                      <option value={2.0}>2.0 หน่วยกิต (80 ชม.)</option>
                      <option value={3.0}>3.0 หน่วยกิต (120 ชม.)</option>
                    </select>
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

              {/* Row 4: Department and Instructor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-medium mb-1">กลุ่มสาระการเรียนรู้</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
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
                    placeholder="เช่น อ.ดร.ประเสริฐ ถาวร"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              {/* Row 5: Schedule, Room, Academic Year, Semester */}
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

              {/* Row 6: Description */}
              <div>
                <label className="block text-[var(--color-text-body)] font-medium mb-1">คำอธิบายรายวิชา (Syllabus Description &amp; Objectives)</label>
                <textarea
                  rows={3}
                  placeholder="ระบุจุดประสงค์การเรียนรู้ สาระสำคัญ และขอบเขตการวัดและประเมินผล..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

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
