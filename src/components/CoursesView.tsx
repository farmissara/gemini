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
  Trash2
} from 'lucide-react';
import { Course, Student } from '../types';

interface CoursesViewProps {
  courses: Course[];
  students: Student[];
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse?: (updatedCourse: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onEnrollStudent: (courseId: string, studentId: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  students,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onEnrollStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string>(courses[0]?.id || '');

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    titleEn: string;
    titleTh: string;
    category: Course['category'];
    credits: number;
    teacherName: string;
    teacherEmail: string;
    department: string;
    schedule: string;
    room: string;
    academicYear: string;
    semester: Course['semester'];
    description: string;
  }>({
    code: 'SC302',
    titleEn: 'Chemistry: Organic & Molecular Dynamics',
    titleTh: 'เคมี: สารอินทรีย์และจลนพลศาสตร์โมเลกุล',
    category: 'stem',
    credits: 3.0,
    teacherName: 'Dr. Narongdej Suwan',
    teacherEmail: 'narongdej.s@eduverse.ac.th',
    department: 'Science & Laboratory',
    schedule: 'Tue, Thu 13:00 - 14:30',
    room: 'Science Lab 3',
    academicYear: '2026',
    semester: '1',
    description: 'Structure, properties, and reactions of carbon-based compounds with wet lab syntheses.',
  });

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.titleTh.includes(searchTerm) ||
      c.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      titleEn: course.titleEn,
      titleTh: course.titleTh,
      category: course.category,
      credits: course.credits,
      teacherName: course.teacherName,
      teacherEmail: course.teacherEmail,
      department: course.department,
      schedule: course.schedule,
      room: course.room,
      academicYear: course.academicYear,
      semester: course.semester,
      description: course.description,
    });
    setShowAddModal(true);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCourse) {
      const updated: Course = {
        ...editingCourse,
        code: formData.code,
        titleEn: formData.titleEn,
        titleTh: formData.titleTh,
        category: formData.category,
        credits: Number(formData.credits),
        teacherName: formData.teacherName,
        teacherEmail: formData.teacherEmail,
        department: formData.department,
        schedule: formData.schedule,
        room: formData.room,
        academicYear: formData.academicYear,
        semester: formData.semester,
        description: formData.description,
      };
      onUpdateCourse?.(updated);
      setEditingCourse(null);
      setShowAddModal(false);
      return;
    }

    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      code: formData.code,
      titleEn: formData.titleEn,
      titleTh: formData.titleTh,
      category: formData.category,
      credits: Number(formData.credits),
      teacherName: formData.teacherName,
      teacherEmail: formData.teacherEmail,
      department: formData.department,
      schedule: formData.schedule,
      room: formData.room,
      academicYear: formData.academicYear,
      semester: formData.semester,
      enrolledStudentIds: [],
      description: formData.description,
    };
    onAddCourse(newCourse);
    setShowAddModal(false);
  };

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Curriculum &amp; Course Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage course catalog, Thai/English syllabi, credit allocations, and enrolled students.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Course</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by code, title, or instructor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['all', 'stem', 'core', 'language', 'arts'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Course List & Active Course Roster Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Course Cards */}
        <div className="lg:col-span-7 space-y-3">
          {filteredCourses.map((course) => {
            const isSelected = activeCourse?.id === course.id;
            return (
              <div
                key={course.id}
                onClick={() => setActiveCourseId(course.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {course.code}
                      </span>
                      <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-semibold">
                        {course.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {course.credits} Credits
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base mt-2">
                      {course.titleEn}
                    </h3>
                    <p className="text-xs text-slate-400 font-thai">
                      {course.titleTh}
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 shrink-0 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    {course.enrolledStudentIds.length} Enrolled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{course.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{course.schedule}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Enrolled Students & Syllabus Detail */}
        <div className="lg:col-span-5 rounded-xl bg-slate-800/50 border border-slate-700/60 p-5 space-y-4">
          {activeCourse ? (
            <>
              <div className="border-b border-slate-700/60 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {activeCourse.code} • Room: {activeCourse.room}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCourse(activeCourse)}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 text-xs flex items-center gap-1"
                      title="Edit Course"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>
                    {onDeleteCourse && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`ต้องการลบรายวิชา ${activeCourse.code} (${activeCourse.titleTh}) หรือไม่?`)) {
                            onDeleteCourse(activeCourse.id);
                          }
                        }}
                        className="p-1 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 text-xs"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {activeCourse.titleEn}
                </h2>
                <p className="text-xs text-slate-300 font-thai mt-0.5">
                  {activeCourse.titleTh}
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {activeCourse.description}
                </p>
              </div>

              {/* Enrolled Students Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Enrolled Class Roster ({activeCourse.enrolledStudentIds.length})
                  </h3>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {activeCourse.enrolledStudentIds.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No students enrolled yet.
                    </p>
                  ) : (
                    activeCourse.enrolledStudentIds.map((studentId: string) => {
                      const student = students.find((s) => s.id === studentId);
                      if (!student) return null;
                      return (
                        <div
                          key={student.id}
                          className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.avatarUrl}
                              alt={student.firstNameEn}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <p className="text-xs font-semibold text-white">
                                {student.firstNameEn} {student.lastNameEn}
                              </p>
                              <p className="text-[10px] text-slate-400 font-thai">
                                {student.firstNameTh} • {student.room}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-indigo-400 font-bold">
                            {student.studentIdNumber}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick enroll student */}
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-300 mb-1.5">
                    Quick Enroll Student into {activeCourse.code}:
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      id="enrollSelect"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                    >
                      {students
                        .filter((s) => !activeCourse.enrolledStudentIds.includes(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.studentIdNumber} - {s.firstNameEn} ({s.room})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('enrollSelect') as HTMLSelectElement;
                        if (sel && sel.value) {
                          onEnrollStudent(activeCourse.id, sel.value);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">Select a course to view details</p>
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                {editingCourse ? 'Edit Course (แก้ไขข้อมูลรายวิชา)' : 'Add New Course to Syllabus (เพิ่มรายวิชาใหม่)'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-indigo-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    <option value="stem">STEM / Science</option>
                    <option value="core">Core Requirement</option>
                    <option value="language">Foreign Language</option>
                    <option value="arts">Arts &amp; Humanities</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Course Title (English)</label>
                <input
                  type="text"
                  required
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ชื่อวิชา (ภาษาไทย)</label>
                <input
                  type="text"
                  required
                  value={formData.titleTh}
                  onChange={(e) => setFormData({ ...formData, titleTh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teacher / Instructor</label>
                  <input
                    type="text"
                    required
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Room / Lab</label>
                  <input
                    type="text"
                    required
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {editingCourse ? 'บันทึกการแก้ไข (Save Changes)' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
