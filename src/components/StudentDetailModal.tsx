import React, { useState } from 'react';
import { Student, Course, GradeRecord, AttendanceRecord } from '../types';
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
  Camera
} from 'lucide-react';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';

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
  const studentGrades = grades.filter((g) => g.studentId === student.id);
  const studentAttendance = attendance.filter((a) => a.studentId === student.id);

  const handlePhotoUpdated = (newUrl: string) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        avatarUrl: newUrl,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="relative group cursor-pointer"
              title="แตะเพื่อถ่ายรูป หรือเปลี่ยนรูปนักเรียน"
            >
              <img
                src={student.avatarUrl}
                alt={student.firstNameEn}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg group-hover:ring-2 group-hover:ring-indigo-400 transition"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 group-hover:bg-indigo-500 rounded-full text-white shadow transition">
                <Camera className="w-3 h-3" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {student.firstNameEn} {student.lastNameEn}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {student.studentIdNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-thai">
                {student.firstNameTh} {student.lastNameTh} • เลขประจำตัวประชาชน: {student.nationalId || 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {student.gradeLevel} • {student.room}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall GPA</span>
                <span className="text-xl font-mono font-extrabold text-amber-400">{student.gpa.toFixed(2)}</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">LINE OA Sync</span>
                <span className="text-xs text-[#06C755] font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 fill-current" />
                  {student.lineLinked ? 'Active' : 'Unlinked'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleLineSync(student.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
              >
                {student.lineLinked ? 'Disconnect LINE' : 'Link LINE OA'}
              </button>
              <button
                onClick={() => onOpenReportCard(student)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Transcript</span>
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guardian Info */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                ข้อมูลผู้ปกครอง
              </span>
              <div className="space-y-1">
                <p className="font-semibold text-slate-200 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {student.guardianName} ({student.guardianRelation})
                </p>
                <p className="text-slate-400 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {student.guardianPhone}
                </p>
                <p className="text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {student.guardianEmail}
                </p>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                สถิติการมาเรียนล่าสุด
              </span>
              <div className="space-y-1">
                <p className="text-slate-300 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  บันทึกการเข้าเรียนทั้งหมด: <span className="font-mono font-bold text-white">{studentAttendance.length}</span> ครั้ง
                </p>
                <p className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  มาเรียนตรงเวลา: {studentAttendance.filter((a) => a.status === 'present').length} ครั้ง
                </p>
              </div>
            </div>
          </div>

          {/* Enrolled Courses & Grades */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
              ผลการเรียนประจำภาคเรียน
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {studentGrades.length === 0 ? (
                <p className="text-slate-500 py-3 text-center">ยังไม่มีข้อมูลเกรดในระบบ</p>
              ) : (
                studentGrades.map((g) => {
                  const course = courses.find((c) => c.id === g.courseId);
                  return (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-indigo-400 font-bold mr-2">{course?.code}</span>
                        <span className="text-slate-200 font-medium">{course?.titleEn}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400">{g.totalScore} pts</span>
                        <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                          {g.letterGrade}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
