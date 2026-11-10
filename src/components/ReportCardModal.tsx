import React, { useRef, useState } from 'react';
import { Student, Course, GradeRecord, SystemConfig } from '../types';
import { 
  Award, 
  Printer, 
  Download, 
  CheckCircle2, 
  X, 
  GraduationCap,
  Sparkles,
  FileCheck
} from 'lucide-react';

interface ReportCardModalProps {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  onClose: () => void;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  student,
  courses,
  grades,
  systemConfig,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [gradePage, setGradePage] = useState(0);

  // Student grades
  const studentGrades = grades.filter((g) => g.studentId === student.id);

  // Calculate term credits and weighted GPA
  let totalCredits = 0;
  let totalPointsEarned = 0;

  studentGrades.forEach((g) => {
    const course = courses.find((c) => c.id === g.courseId);
    if (course) {
      totalCredits += course.credits;
      totalPointsEarned += course.credits * g.gradePoint;
    }
  });

  const termGPA = totalCredits > 0 ? (totalPointsEarned / totalCredits).toFixed(2) : student.gpa.toFixed(2);
  const gradesPerPage = 5;
  const gradePageCount = Math.max(1, Math.ceil(studentGrades.length / gradesPerPage));
  const visibleGrades = studentGrades.slice(gradePage * gradesPerPage, (gradePage + 1) * gradesPerPage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Action Toolbar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold">
                Official Bilingual Transcript (ใบแสดงผลการเรียน ปพ.1)
              </h3>
              <p className="text-[11px] text-slate-300">
                Student: {student.firstNameEn} {student.lastNameEn} • {student.studentIdNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6 bg-white text-slate-900 font-sans print:p-0 print:m-0" ref={printRef}>
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-indigo-900 text-amber-400 flex items-center justify-center font-bold text-2xl border-2 border-amber-400 shadow">
                  EV
                </div>
                <div>
                  <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-950">
                    {systemConfig.schoolNameEn}
                  </h1>
                  <h2 className="text-sm font-bold text-slate-700 font-thai">
                    {systemConfig.schoolNameTh}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ministry of Education Accreditation No. MOE-BKK-8812 • Bangkok, Thailand
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 font-mono text-xs font-bold rounded">
                  OFFICIAL GRADE TRANSCRIPT
                </span>
                <p className="text-[11px] text-slate-600 mt-1 font-mono">
                  AY: {systemConfig.academicYear} | {systemConfig.currentSemester}
                </p>
                <p className="text-[10px] text-slate-600 font-mono">
                  Ref: TR-{student.studentIdNumber}-2026
                </p>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-bold text-slate-900">{student.firstNameEn} {student.lastNameEn}</span>
                <span className="text-[11px] text-slate-700 block font-thai">{student.firstNameTh} {student.lastNameTh}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Student ID / National ID</span>
                <span className="font-mono font-bold text-indigo-700">{student.studentIdNumber}</span>
                <span className="text-[11px] text-slate-600 block font-mono">{student.nationalId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Grade Level &amp; Room</span>
                <span className="font-semibold text-slate-900">{student.gradeLevel}</span>
                <span className="text-[11px] text-slate-600 block">{student.room}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Date of Birth &amp; Gender</span>
                <span className="font-semibold text-slate-900">{student.dateOfBirth}</span>
                <span className="text-[11px] text-slate-600 block capitalize">{student.gender}</span>
              </div>
            </div>
          </div>

          {/* Academic Table */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-4 border-indigo-700 pl-2">
              Academic Performance Record (ผลการประเมินรายวิชา)
            </h4>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-y border-slate-300">
                  <th className="py-2 px-2.5 font-bold">Course Code</th>
                  <th className="py-2 px-2.5 font-bold">Course Title (รายวิชา)</th>
                  <th className="py-2 px-2.5 text-center font-bold">Credits (หน่วยกิต)</th>
                  <th className="py-2 px-2.5 text-center font-bold">Score (คะแนนรวม)</th>
                  <th className="py-2 px-2.5 text-center font-bold">Grade (เกรด)</th>
                  <th className="py-2 px-2.5 text-center font-bold">Grade Point (แต้ม)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentGrades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-600">
                      No grades recorded for this academic term yet.
                    </td>
                  </tr>
                ) : (
                  visibleGrades.map((grade) => {
                    const course = courses.find((c) => c.id === grade.courseId);
                    if (!course) return null;
                    return (
                      <tr key={grade.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                          {course.code}
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-semibold text-slate-900">{course.titleEn}</div>
                          <div className="text-[11px] text-slate-600 font-thai">{course.titleTh}</div>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-800">
                          {course.credits.toFixed(1)}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-semibold text-slate-900">
                          {grade.totalScore}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold font-mono">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                            grade.letterGrade === 'A' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : grade.letterGrade.startsWith('B')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {grade.letterGrade}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-900">
                          {grade.gradePoint.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {gradePageCount > 1 && (
              <div className="flex items-center justify-between gap-3 text-xs text-slate-700 print:hidden">
                <button type="button" onClick={() => setGradePage(page => Math.max(0, page - 1))} disabled={gradePage === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span className="font-medium">หน้า {gradePage + 1} / {gradePageCount} · {studentGrades.length} รายวิชา</span>
                <button type="button" onClick={() => setGradePage(page => Math.min(gradePageCount - 1, page + 1))} disabled={gradePage >= gradePageCount - 1} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[11px] text-slate-600 block uppercase font-semibold">Total Credits Earned</span>
                <span className="text-xl font-bold font-mono text-slate-900">{totalCredits.toFixed(1)}</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[11px] text-slate-600 block uppercase font-semibold">Term Grade Point Average (GPA)</span>
                <span className="text-xl font-extrabold font-mono text-indigo-700">{termGPA}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-600 block uppercase font-semibold">Cumulative GPA (สะสม)</span>
                <span className="text-xl font-extrabold font-mono text-emerald-700">{student.gpa.toFixed(2)}</span>
              </div>
            </div>

            {/* Official Signatures & Seal */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="h-12 border-b border-dashed border-slate-400 mx-6"></div>
                <p className="font-bold text-slate-800 mt-2">Kru Somkiat Chotipan</p>
                <p className="text-[11px] text-slate-600">Classroom Advisor (ครูที่ปรึกษา)</p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-indigo-900/30 flex items-center justify-center text-[10px] text-indigo-950 font-bold text-center leading-tight uppercase p-1">
                  OFFICIAL SCHOOL SEAL
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Issued: November 4, 2026</p>
              </div>

              <div className="space-y-1">
                <div className="h-12 border-b border-dashed border-slate-400 mx-6"></div>
                <p className="font-bold text-slate-800 mt-2">Dr. Thanaporn Kittisak</p>
                <p className="text-[11px] text-slate-600">School Principal (ผู้อำนวยการโรงเรียน)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
