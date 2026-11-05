import React from 'react';
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
  FileText
} from 'lucide-react';

interface StudentDetailModalProps {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  onClose: () => void;
  onOpenReportCard: (student: Student) => void;
  onToggleLineSync: (studentId: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  courses,
  grades,
  attendance,
  onClose,
  onOpenReportCard,
  onToggleLineSync,
}) => {
  const studentGrades = grades.filter((g) => g.studentId === student.id);
  const studentAttendance = attendance.filter((a) => a.studentId === student.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={student.avatarUrl}
              alt={student.firstNameEn}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg"
            />
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
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
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
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold"
              >
                {student.lineLinked ? 'Disconnect LINE' : 'Link LINE OA'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenReportCard(student);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Award className="w-4 h-4" />
                <span>View Full Transcript</span>
              </button>
            </div>
          </div>

          {/* Guardian Info Box */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Guardian &amp; Emergency Contact
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px]">Guardian Name</span>
                <span className="font-semibold text-slate-200">{student.guardianName} ({student.guardianRelation})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Phone Number</span>
                <span className="font-mono text-slate-200">{student.guardianPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Email Address</span>
                <span className="text-slate-200">{student.guardianEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">LINE User Key</span>
                <span className="font-mono text-slate-400">{student.lineUserId || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Health & Behavior Profile */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              ข้อมูลสุขภาพ &amp; คะแนนความประพฤติ
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 grid grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px]">หมู่โลหิต (Blood)</span>
                <span className="font-mono font-bold text-rose-400 text-sm">{student.bloodType || 'O'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">คะแนนความประพฤติ</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{student.behaviorScore ?? 100} / 100</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">เบอร์ติดต่อฉุกเฉิน</span>
                <span className="font-mono text-slate-200">{student.emergencyPhone || student.guardianPhone}</span>
              </div>
              <div className="col-span-3 pt-1 border-t border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">ประวัติการแพ้ยาและอาหาร (Allergies)</span>
                {student.allergies && student.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {student.allergies.map((allergy, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                        ⚠️ {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-emerald-400 text-[11px] font-medium">ไม่มีประวัติการแพ้ยาหรืออาหาร</span>
                )}
              </div>
            </div>
          </div>

          {/* Academic Courses Record */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Active Enrolled Courses &amp; Term Grades
            </h4>
            <div className="space-y-1.5">
              {studentGrades.length === 0 ? (
                <p className="text-slate-400 py-2">No courses recorded yet.</p>
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
    </div>
  );
};
