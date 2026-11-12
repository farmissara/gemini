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
  CalendarCheck
} from 'lucide-react';
import { Course, Student, UserRole } from '../types';
import { PagedList } from '../components/PagedList';

interface CoursesViewProps {
  courses: Course[];
  students: Student[];
  currentRole?: UserRole;
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse?: (updatedCourse: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onEnrollStudent: (courseId: string, studentId: string) => void;
  onOpenImportExport?: (tab?: 'courses' | 'enrollment' | 'grades') => void;
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
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onEnrollStudent,
  onOpenImportExport,
}) => {
  const canManageCourses = currentRole !== 'student' && currentRole !== 'parent';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>(courses[0]?.id || '');

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
    academicYear: '2569',
    semester: '1',
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
      academicYear: '2569',
      semester: '1',
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
      academicYear: course.academicYear || '2569',
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
    onAddCourse(newCourse);
    setActiveCourseId(newCourse.id);
    setShowAddModal(false);
  };

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Top Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 app-page-header">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2 flex-wrap">
            <BookOpen className="w-5 h-5 text-[var(--color-primary-text)]" />
            <span>หลักสูตรและการจัดการรายวิชา (School MIS / Curriculum)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-bold">
              School MIS
            </span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            จัดการสาระการเรียนรู้, หมวดวิชา, หน่วยกิต, เกณฑ์เวลาเรียน 80% (สิทธิ์สอบ ปพ.5) และรายชื่อนักเรียนที่ลงทะเบียน
          </p>
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

      {/* Search & Category Filter Pills */}
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
                      <span className="font-mono font-bold text-sm text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-300 dark:border-indigo-700">
                        {course.code}
                      </span>
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
                          onClick={() => {
                            if (confirm(`ต้องการลบรายวิชา ${activeCourse.code} (${activeCourse.titleTh}) หรือไม่?`)) {
                              onDeleteCourse(activeCourse.id);
                            }
                          }}
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
                      ภาคเรียนที่ {activeCourse.semester || '1'} / {activeCourse.academicYear || '2569'}
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
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-title)] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <span>นักเรียนที่ลงทะเบียน ({activeCourse.enrolledStudentIds?.length || 0} คน)</span>
                  </h3>
                </div>

                {/* Quick Enroll Student Selector (Staff Only) */}
                {canManageCourses && (
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      id={`enroll-select-${activeCourse.id}`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                      defaultValue=""
                    >
                      <option value="" disabled>เลือกนักเรียนเพื่อลงทะเบียนเพิ่ม...</option>
                      {students
                        .filter((s) => !(activeCourse.enrolledStudentIds || []).includes(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.studentIdNumber} - {s.firstNameTh} {s.lastNameTh} ({s.room})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const sel = document.getElementById(`enroll-select-${activeCourse.id}`) as HTMLSelectElement;
                        if (sel && sel.value) {
                          onEnrollStudent(activeCourse.id, sel.value);
                          sel.value = '';
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold cursor-pointer shrink-0"
                    >
                      ลงทะเบียน
                    </button>
                  </div>
                )}

                <div className="space-y-2 pr-1 pt-2">
                  {(activeCourse.enrolledStudentIds || []).length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] py-4 text-center border border-dashed border-[var(--color-border)] rounded-xl">
                      ยังไม่มีนักเรียนลงทะเบียนในรายวิชานี้
                    </p>
                  ) : (
                    <PagedList items={activeCourse.enrolledStudentIds} pageSize={5} renderItem={(studentId: string) => {
                      const student = students.find((s) => s.id === studentId);
                      if (!student) return null;
                      return (
                        <div
                          key={student.id}
                          className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                              alt={student.firstNameEn}
                              className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)]"
                            />
                            <div>
                              <p className="text-xs font-semibold text-[var(--color-text-title)]">
                                {student.firstNameTh} {student.lastNameTh}
                              </p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {student.studentIdNumber} • {student.room}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--color-primary-text)] font-bold">
                            GPA {student.gpa}
                          </span>
                        </div>
                      );
                    }} />
                  )}
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
                    {DEPARTMENTS.map((d) => (
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
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value as any })}
                      className="w-1/2 px-2 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    >
                      <option value="1">เทอม 1</option>
                      <option value="2">เทอม 2</option>
                      <option value="Summer">ฤดูร้อน</option>
                    </select>
                    <input
                      type="text"
                      placeholder="2569"
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
    </div>
  );
};
