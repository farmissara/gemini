import React, { useState } from 'react';
import { Student, Course, GradeRecord, AttendanceRecord, StudentStatus } from '../types';
import { 
  X, 
  Award, 
  BookOpen, 
  Clock, 
  MessageSquare, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Camera,
  Edit3,
  Check,
  GraduationCap
} from 'lucide-react';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';
import { PagedList } from './PagedList';
import { STUDENT_STATUS_DETAILS, ALL_GRADE_LEVELS } from '../data/studentAcademicData';

interface StudentDetailModalProps {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  onClose: () => void;
  onOpenReportCard: (student: Student) => void;
  onToggleLineSync: (studentId: string) => void;
  onUpdateStudent?: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  courses,
  grades,
  attendance,
  onClose,
  onOpenReportCard,
  onToggleLineSync,
  onUpdateStudent,
}) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'grades'>('overview');
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editGradeLevel, setEditGradeLevel] = useState(student.gradeLevel);
  const [editRoom, setEditRoom] = useState(student.room);
  const [editStatus, setEditStatus] = useState<StudentStatus>(student.status || 'active');
  const [editGpa, setEditGpa] = useState<number>(Number(student.gpa) || 0.0);

  const studentGrades = grades.filter((g) => g.studentId === student.id);
  const studentAttendance = attendance.filter((a) => a.studentId === student.id);
  const currentStatusConfig = STUDENT_STATUS_DETAILS[student.status || 'active'] || STUDENT_STATUS_DETAILS.active;

  const handlePhotoUpdated = (newUrl: string) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        avatarUrl: newUrl,
      });
    }
  };

  const handleCalculateGpaFromGrades = () => {
    if (studentGrades.length === 0) return;
    const totalPoints = studentGrades.reduce((sum, g) => sum + (g.gradePoint || 0), 0);
    const calculated = Number((totalPoints / studentGrades.length).toFixed(2));
    setEditGpa(calculated);
  };

  const handleSaveClassEdit = () => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        gradeLevel: editGradeLevel.trim() || student.gradeLevel,
        room: editRoom.trim() || student.room,
        status: editStatus,
        gpa: Math.min(4.0, Math.max(0, Number(editGpa) || 0)),
      });
    }
    setIsEditingClass(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--color-text-body)]">
        {/* Header (Intentional Dark High-Contrast Student Card Banner) */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="relative group cursor-pointer"
              title="แตะเพื่อถ่ายรูป หรือเปลี่ยนรูปนักเรียน"
            >
              <img
                src={student.avatarUrl}
                alt={student.firstNameEn}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400/60 shadow-lg group-hover:ring-2 group-hover:ring-indigo-300 transition"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-indigo-700 group-hover:bg-indigo-600 rounded-full text-white shadow transition">
                <Camera className="w-3 h-3" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">
                  {student.firstNameEn} {student.lastNameEn}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-100 border border-indigo-500/50 font-mono">
                  {student.studentIdNumber}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-bold ${currentStatusConfig.badgeClasses}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentStatusConfig.dotColor}`} />
                  {currentStatusConfig.labelTh}
                </span>
              </div>
              <p className="text-xs text-slate-200 font-thai">
                {student.firstNameTh} {student.lastNameTh} • เลขประจำตัวประชาชน: {student.nationalId || 'N/A'}
              </p>
              <p className="text-xs text-slate-200 mt-1 flex items-center gap-2">
                <span>{student.gradeLevel} • {student.room}</span>
                {onUpdateStudent && (
                  <button
                    type="button"
                    onClick={() => setIsEditingClass(!isEditingClass)}
                    className="text-[11px] text-blue-300 hover:text-blue-100 underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขชั้น/ห้อง/สถานะ</span>
                  </button>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Quick Editor for Grade Level, Room & Status */}
        {isEditingClass && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/70 border-b border-indigo-200 dark:border-indigo-800 shrink-0 space-y-2 text-xs">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              แก้ไขระดับชั้น ห้องเรียน เกรดเฉลี่ยสะสม (GPA) และสถานะนักเรียน
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  ระดับชั้น (Grade Level)
                </label>
                <input
                  list="quick-grade-levels"
                  value={editGradeLevel}
                  onChange={(e) => setEditGradeLevel(e.target.value)}
                  placeholder="พิมพ์หรือเลือกระดับชั้น"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                />
                <datalist id="quick-grade-levels">
                  {ALL_GRADE_LEVELS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.labelTh}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  ห้องเรียน (Room)
                </label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder="เช่น Room 401 หรือ ม.4/1"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  เกรดเฉลี่ยสะสม (GPA: 0-4.00)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.00"
                    value={editGpa}
                    onChange={(e) => setEditGpa(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold tabular-nums"
                  />
                  {studentGrades.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCalculateGpaFromGrades}
                      className="px-2 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] whitespace-nowrap cursor-pointer"
                      title="คำนวณเฉลี่ยจากรายวิชาที่มีในระบบ"
                    >
                      ออโต้
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  สถานะนักเรียน (Status)
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as StudentStatus)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                >
                  {Object.values(STUDENT_STATUS_DETAILS).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.labelTh} ({s.labelEn})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingClass(false)}
                className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveClassEdit}
                className="px-4 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">GPA สะสม</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    Grade Point Average
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-mono font-extrabold text-amber-700 dark:text-amber-300">
                    {student.gpa.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingClass(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    [ปรับแก้เกรดเฉลี่ย]
                  </button>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  เกรดเฉลี่ยสะสมระดับ 0.00 - 4.00 คำนวณจากทุกรายวิชา หรือครูสามารถคลิกปรับแก้ได้โดยตรง
                </p>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-[var(--color-border)] pt-2 sm:pt-0 sm:pl-3">
                <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">LINE OA Sync</span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 fill-current" />
                  {student.lineLinked ? 'Active' : 'Unlinked'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleLineSync(student.id)}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold cursor-pointer"
              >
                {student.lineLinked ? 'Disconnect LINE' : 'Link LINE OA'}
              </button>
              <button
                onClick={() => onOpenReportCard(student)}
                className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold flex items-center gap-1 shadow-md shadow-indigo-700/30 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Transcript</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setActiveSection('overview')} className={`px-3 py-1.5 rounded-lg font-semibold border transition cursor-pointer ${activeSection === 'overview' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
              ข้อมูลทั่วไป
            </button>
            <button type="button" onClick={() => setActiveSection('grades')} className={`px-3 py-1.5 rounded-lg font-semibold border transition cursor-pointer ${activeSection === 'grades' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
              ผลการเรียน ({studentGrades.length})
            </button>
          </div>

          {activeSection === 'overview' ? (
          /* Details Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guardian Info */}
            <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--color-primary-text)] uppercase tracking-wider block">
                ข้อมูลผู้ปกครอง {student.guardians && student.guardians.length > 1 ? `(${student.guardians.length} คน)` : ''}
              </span>
              {student.guardians && student.guardians.length > 0 ? (
                <div className="space-y-3">
                  {student.guardians.map((g, i) => (
                    <div key={g.id || i} className="p-2.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[var(--color-text-title)] flex items-center gap-1.5 text-xs">
                          <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          <span>{g.name || 'ไม่ระบุชื่อ'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200">
                            {g.relation}
                          </span>
                        </p>
                        {g.isPrimary && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            ★ ผู้ปกครองหลัก
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-body)] flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        <span>{g.phone || '-'}</span>
                      </p>
                      {g.email && (
                        <p className="text-[11px] text-[var(--color-text-body)] flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          <span>{g.email}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--color-text-title)] flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {student.guardianName} ({student.guardianRelation})
                  </p>
                  <p className="text-[var(--color-text-body)] flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {student.guardianPhone}
                  </p>
                  <p className="text-[var(--color-text-body)] flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {student.guardianEmail}
                  </p>
                </div>
              )}
            </div>

            {/* Attendance Summary */}
            <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--color-primary-text)] uppercase tracking-wider block">
                สถิติการมาเรียนล่าสุด
              </span>
              <div className="space-y-1">
                <p className="text-[var(--color-text-body)] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  บันทึกการเข้าเรียนทั้งหมด: <span className="font-mono font-bold text-[var(--color-text-title)]">{studentAttendance.length}</span> ครั้ง
                </p>
                <p className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  มาเรียนตรงเวลา: {studentAttendance.filter((a) => a.status === 'present').length} ครั้ง
                </p>
              </div>
            </div>
          </div>
          ) : (
          /* Enrolled Courses & Grades */
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-[var(--color-primary-text)] uppercase tracking-wider block">
              ผลการเรียนประจำภาคเรียน
            </span>
            <div className="space-y-2 pr-1">
              {studentGrades.length === 0 ? (
                <p className="text-[var(--color-text-muted)] py-3 text-center">ยังไม่มีข้อมูลเกรดในระบบ</p>
              ) : (
                <PagedList items={studentGrades} pageSize={4} renderItem={(g) => {
                  const course = courses.find((c) => c.id === g.courseId);
                  return (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-[var(--color-primary-text)] font-bold mr-2">{course?.code}</span>
                        <span className="text-[var(--color-text-title)] font-medium">{course?.titleEn}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[var(--color-text-body)]">{g.totalScore} pts</span>
                        <span className="font-mono font-bold text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700">
                          {g.letterGrade}
                        </span>
                      </div>
                    </div>
                  );
                }} />
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Image Capture & Upload Modal */}
      <ImageCaptureUploadModal
        isOpen={showPhotoModal}
        currentImageUrl={student.avatarUrl}
        title={`ถ่ายรูปสดหรือเปลี่ยนรูปนักเรียน: ${student.firstNameTh} ${student.lastNameTh}`}
        onSelectImage={handlePhotoUpdated}
        onClose={() => setShowPhotoModal(false)}
      />
    </div>
  );
};
