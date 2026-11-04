import React, { useState } from 'react';
import { Student, Course, GradeRecord, SystemConfig } from '../types';
import { 
  Award, 
  FileText, 
  Printer, 
  Download, 
  CheckCircle, 
  Sparkles, 
  Search,
  Filter,
  Sliders,
  ChevronRight
} from 'lucide-react';

interface GradebookViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  onUpdateGrade: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onOpenReportCard: (student: Student) => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  students,
  courses,
  grades,
  systemConfig,
  onUpdateGrade,
  onOpenReportCard,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Helper to recompute letter grade and points
  const calculateGrade = (total: number): { letter: GradeRecord['letterGrade']; point: number } => {
    if (total >= 80) return { letter: 'A', point: 4.0 };
    if (total >= 75) return { letter: 'B+', point: 3.5 };
    if (total >= 70) return { letter: 'B', point: 3.0 };
    if (total >= 65) return { letter: 'C+', point: 2.5 };
    if (total >= 60) return { letter: 'C', point: 2.0 };
    if (total >= 55) return { letter: 'D+', point: 1.5 };
    if (total >= 50) return { letter: 'D', point: 1.0 };
    return { letter: 'F', point: 0.0 };
  };

  const handleScoreChange = (
    grade: GradeRecord,
    field: 'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore',
    val: number
  ) => {
    const updated = { ...grade, [field]: val };
    const total =
      (field === 'midtermScore' ? val : updated.midtermScore) +
      (field === 'finalScore' ? val : updated.finalScore) +
      (field === 'assignmentScore' ? val : updated.assignmentScore) +
      (field === 'quizScore' ? val : updated.quizScore);

    const { letter, point } = calculateGrade(total);
    onUpdateGrade(grade.id, {
      [field]: val,
      totalScore: total,
      letterGrade: letter,
      gradePoint: point,
    });
  };

  const courseGrades = grades.filter((g) => g.courseId === selectedCourseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            Academic Gradebook &amp; Thai Transcripts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate student coursework, compute GPAs according to Thai MOE standards, and produce bilingual PDF report cards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono">
            {systemConfig.thaiPdfFontEnabled ? 'TH Sarabun PSK PDF Ready' : 'Standard PDF'}
          </span>
        </div>
      </div>

      {/* Course selector tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => setSelectedCourseId(course.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCourseId === course.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span className="font-mono">{course.code}</span>
            <span>{course.titleEn}</span>
          </button>
        ))}
      </div>

      {/* Grade Table for active course */}
      {selectedCourse && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-400">{selectedCourse.code}</span>
                <span className="text-white font-bold text-base">{selectedCourse.titleEn}</span>
                <span className="text-xs text-slate-400 font-thai">({selectedCourse.titleTh})</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instructor: {selectedCourse.teacherName} • Credits: {selectedCourse.credits} • Academic Year {selectedCourse.academicYear}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Grading Scale: A (80+), B+ (75), B (70), C+ (65), C (60), D+ (55), D (50), F (&lt;50)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Room</th>
                  <th className="py-3 px-3 text-center">Midterm (30)</th>
                  <th className="py-3 px-3 text-center">Final (40)</th>
                  <th className="py-3 px-3 text-center">Homework (20)</th>
                  <th className="py-3 px-3 text-center">Quiz (10)</th>
                  <th className="py-3 px-3 text-center font-bold text-white">Total (100)</th>
                  <th className="py-3 px-3 text-center font-bold text-indigo-300">Grade</th>
                  <th className="py-3 px-3 text-right">Transcript</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {courseGrades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No grades entered for this course yet.
                    </td>
                  </tr>
                ) : (
                  courseGrades.map((grade) => {
                    const student = students.find((s) => s.id === grade.studentId);
                    if (!student) return null;
                    return (
                      <tr key={grade.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.avatarUrl}
                              alt={student.firstNameEn}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-semibold text-white">
                                {student.firstNameEn} {student.lastNameEn}
                              </div>
                              <div className="text-[10px] text-slate-400 font-thai">
                                {student.firstNameTh} ({student.studentIdNumber})
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-300">
                          {student.room}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={grade.midtermScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'midtermScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="40"
                            value={grade.finalScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'finalScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={grade.assignmentScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'assignmentScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={grade.quizScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'quizScore', Number(e.target.value))
                            }
                            className="w-14 px-1.5 py-1 text-center rounded bg-slate-800 border border-slate-700 text-slate-100 font-mono font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-sm text-white">
                          {grade.totalScore}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                              grade.letterGrade === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : grade.letterGrade.startsWith('B')
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {grade.letterGrade} ({grade.gradePoint.toFixed(1)})
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onOpenReportCard(student)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Transcript</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
