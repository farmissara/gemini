import React, { useMemo, useState } from 'react';
import {
  AttendanceRecord,
  Course,
  GradeRecord,
  PeriodAttendanceRecord,
  Student,
  SystemConfig,
  TimetableSlot,
} from '../types';
import { calculateGrade, formatSemesterLabel } from '../lib/schoolSettings';
import { calculateStudentCourseEligibility } from '../lib/examEligibility';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Search,
  X,
} from 'lucide-react';

interface Pp5OfficialFormProps {
  selectedCourse: Course;
  students: Student[];
  courseGrades: GradeRecord[];
  systemConfig: SystemConfig;
  timetableSlots: TimetableSlot[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  currentPp5Page: number;
  pp5PageSize: number;
  setPp5Page: (page: number) => void;
  renderPageControls: (
    page: number,
    totalItems: number,
    pageSize: number,
    setPage: (page: number) => void,
    label: string,
    isLight?: boolean
  ) => React.ReactNode;
}

const getCategoryTypeLabel = (category: string) => {
  if (category === 'core') return 'รายวิชาพื้นฐาน';
  if (category === 'elective') return 'รายวิชาเพิ่มเติม';
  if (category === 'activities') return 'กิจกรรมพัฒนาผู้เรียน';
  return `รายวิชาเพิ่มเติม (${category})`;
};

const deriveQualityRating = (totalScore: number | null, isMs: boolean) => {
  if (isMs || totalScore === null) return { level: '-', code: '-', pass: false, num: -1 };
  if (totalScore >= 75) return { level: 'ดีเยี่ยม', code: '๓', pass: true, num: 3 };
  if (totalScore >= 60) return { level: 'ดี', code: '๒', pass: true, num: 2 };
  if (totalScore >= 50) return { level: 'ผ่าน', code: '๑', pass: true, num: 1 };
  return { level: 'ไม่ผ่าน', code: '๐', pass: false, num: 0 };
};

export const Pp5OfficialForm: React.FC<Pp5OfficialFormProps> = ({
  selectedCourse,
  students,
  courseGrades,
  systemConfig,
  timetableSlots,
  attendance,
  periodAttendance,
  currentPp5Page,
  pp5PageSize,
  setPp5Page,
  renderPageControls,
}) => {
  const [affiliationOffice, setAffiliationOffice] = useState('สำนักงานเขตพื้นที่การศึกษา (สพฐ.)');
  const [headOfDeptName, setHeadOfDeptName] = useState('');
  const [measurementHeadName, setMeasurementHeadName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [docSetNo, setDocSetNo] = useState('๑ / ๒๕๖๙');

  const totalHours = selectedCourse.totalHours || Math.max(20, Math.round(selectedCourse.credits * 40));
  const minAttendanceHours = selectedCourse.minAttendanceHours || Math.round(totalHours * 0.8);

  // Merge enrolled students and any student with a grade record in this course
  const rosterStudents = useMemo(() => {
    const enrolledIds = new Set(selectedCourse.enrolledStudentIds || []);
    const gradedIds = new Set(courseGrades.map((g) => g.studentId));
    const combinedIds = new Set([...enrolledIds, ...gradedIds]);
    const list = students.filter((s) => combinedIds.has(s.id));
    if (list.length > 0) return list;
    // Fallback: match courseGrades order if students list didn't match
    return [];
  }, [students, selectedCourse.enrolledStudentIds, courseGrades]);

  const distinctRooms = useMemo(() => {
    const rooms = Array.from(new Set(rosterStudents.map((s) => s.room).filter(Boolean)));
    return rooms.length > 0 ? rooms.join(', ') : selectedCourse.room || '-';
  }, [rosterStudents, selectedCourse.room]);

  const rows = useMemo(() => {
    return rosterStudents.map((student, index) => {
      const grade = courseGrades.find((g) => g.studentId === student.id);
      const eligibility = calculateStudentCourseEligibility({
        student,
        course: selectedCourse,
        timetableSlots,
        attendance,
        periodAttendance,
      });
      const isMs = eligibility.isAtRiskMs;
      const gradeResult = grade
        ? calculateGrade(grade.totalScore, systemConfig.gradingSystem)
        : null;
      const finalLetter = isMs
        ? 'มส.'
        : gradeResult
          ? gradeResult.letter
          : 'ร';
      const quality = deriveQualityRating(grade ? grade.totalScore : null, isMs);
      const courseworkSubtotal = grade
        ? grade.assignmentScore + grade.quizScore + grade.midtermScore
        : null;

      return {
        index,
        student,
        grade,
        eligibility,
        isMs,
        gradeResult,
        finalLetter,
        quality,
        courseworkSubtotal,
      };
    });
  }, [rosterStudents, courseGrades, selectedCourse, timetableSlots, attendance, periodAttendance, systemConfig.gradingSystem]);

  // Live statistics for Part 1
  const stats = useMemo(() => {
    const total = rows.length;
    const isThai = systemConfig.gradingSystem === 'thai';
    const gradeKeys = isThai
      ? ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส.']
      : ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'ร', 'มส.'];

    const counts: Record<string, number> = {};
    gradeKeys.forEach((k) => {
      counts[k] = 0;
    });

    const scores: number[] = [];
    let passedCount = 0;
    let level3OrAboveCount = 0;
    const attrCounts = { '3': 0, '2': 0, '1': 0, '0': 0 };

    rows.forEach((row) => {
      if (row.finalLetter in counts) {
        counts[row.finalLetter] += 1;
      } else if (row.finalLetter === 'มส.') {
        counts['มส.'] += 1;
      } else {
        counts['ร'] += 1;
      }

      if (row.grade && !row.isMs) {
        scores.push(row.grade.totalScore);
        if ((row.gradeResult?.point ?? 0) >= 1) passedCount += 1;
        if ((row.gradeResult?.point ?? 0) >= 3) level3OrAboveCount += 1;
      }
      if (row.quality.num >= 0) {
        attrCounts[String(row.quality.num) as keyof typeof attrCounts] += 1;
      }
    });

    const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');
    const mean = scores.length > 0
      ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1)
      : '-';
    const max = scores.length > 0 ? Math.max(...scores) : '-';
    const min = scores.length > 0 ? Math.min(...scores) : '-';

    return {
      total,
      gradeKeys,
      counts,
      passedCount,
      level3OrAboveCount,
      failedOrIncompleteCount: total - passedCount,
      attrCounts,
      pct,
      mean,
      max,
      min,
    };
  }, [rows, systemConfig.gradingSystem]);

  return (
    <div className="space-y-4">
      {/* Screen-only Official Metadata Editor Bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 print:hidden space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-title)]">
            <FileText className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span>ตั้งค่าข้อมูลหัวกระดาษและผู้ลงนามเอกสาร ปพ.๕ (ก่อนพิมพ์)</span>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            แสดงแบบฟอร์มครบทั้ง ๔ ส่วน (หัวเอกสาร • สรุปผล • บัญชีคะแนน • ลงนามอนุมัติ)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              สังกัด / สำนักงานเขตพื้นที่
            </label>
            <input
              type="text"
              value={affiliationOffice}
              onChange={(e) => setAffiliationOffice(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              ชุดที่ / ปีการศึกษา (บน ปพ.๕)
            </label>
            <input
              type="text"
              value={docSetNo}
              onChange={(e) => setDocSetNo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              หัวหน้ากลุ่มสาระการเรียนรู้
            </label>
            <input
              type="text"
              value={headOfDeptName}
              onChange={(e) => setHeadOfDeptName(e.target.value)}
              placeholder="เว้นว่างเพื่อพิมพ์เส้นประ..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              หัวหน้างานวัดและประเมินผล
            </label>
            <input
              type="text"
              value={measurementHeadName}
              onChange={(e) => setMeasurementHeadName(e.target.value)}
              placeholder="เว้นว่างเพื่อพิมพ์เส้นประ..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              ผู้อำนวยการสถานศึกษา
            </label>
            <input
              type="text"
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              placeholder="เว้นว่างเพื่อพิมพ์เส้นประ..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
        </div>
      </div>

      {/* Official White A4-Ready Paper Sheet */}
      <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-300 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Official Government Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center text-center shrink-0">
              <GraduationCap className="w-7 h-7 text-slate-900" />
              <span className="text-[8px] font-bold tracking-wider">สพฐ.</span>
            </div>

            <div className="text-center flex-1 space-y-0.5">
              <p className="text-xs font-bold text-slate-700">
                แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.๕)
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-950">
                โรงเรียน{systemConfig.schoolNameTh}
              </h2>
              <p className="text-xs font-medium text-slate-700">
                สังกัด {affiliationOffice}
              </p>
              <p className="text-[11px] text-slate-600">
                ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง พุทธศักราช ๒๕๖๐)
              </p>
            </div>

            <div className="border-2 border-slate-900 px-3 py-1.5 text-center shrink-0">
              <div className="text-sm font-extrabold text-slate-950">ปพ.๕</div>
              <div className="text-[10px] font-mono text-slate-700">ชุดที่ {docSetNo}</div>
            </div>
          </div>

          {/* Course & Curriculum Specification Box */}
          <table className="w-full text-xs border-collapse border border-slate-700">
            <tbody>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-36">รหัสวิชา / ชื่อรายวิชา</td>
                <td className="border border-slate-500 px-3 py-1.5 font-semibold" colSpan={3}>
                  <span className="font-mono font-bold">{selectedCourse.code}</span> — {selectedCourse.titleTh}
                  {selectedCourse.titleEn ? <span className="text-slate-600 ml-1.5">({selectedCourse.titleEn})</span> : null}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ประเภทวิชา</td>
                <td className="border border-slate-500 px-3 py-1.5">{getCategoryTypeLabel(selectedCourse.category)}</td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-36">กลุ่มสาระการเรียนรู้</td>
                <td className="border border-slate-500 px-3 py-1.5">{selectedCourse.department || '-'}</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ภาคเรียน / ปีการศึกษา</td>
                <td className="border border-slate-500 px-3 py-1.5">
                  {formatSemesterLabel(selectedCourse.semester)} ปีการศึกษา {selectedCourse.academicYear}
                </td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ระดับชั้น / ห้องเรียน</td>
                <td className="border border-slate-500 px-3 py-1.5">{distinctRooms}</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">น้ำหนัก / เวลาเรียน</td>
                <td className="border border-slate-500 px-3 py-1.5 tabular-nums">
                  {selectedCourse.credits.toFixed(1)} หน่วยกิต ({totalHours} ชม./ภาค • เกณฑ์ 80% = {minAttendanceHours} ชม.)
                </td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ครูผู้สอน</td>
                <td className="border border-slate-500 px-3 py-1.5 font-semibold">{selectedCourse.teacherName || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Part 1: Summary Result Tables */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
              ส่วนที่ ๑ แบบสรุปผลการพัฒนาคุณภาพผู้เรียนประจำรายวิชา
            </h3>
            <div className="text-[11px] font-mono tabular-nums text-slate-700">
              คะแนนเฉลี่ย (Mean): <strong>{stats.mean}</strong> | สูงสุด: <strong>{stats.max}</strong> | ต่ำสุด: <strong>{stats.min}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 text-left w-28">
                    รายการสรุปผลสัมฤทธิ์
                  </th>
                  <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 w-14">
                    ทั้งหมด<br />(คน)
                  </th>
                  <th colSpan={stats.gradeKeys.length} className="border border-slate-600 px-2 py-1">
                    จำนวนผู้เรียนที่ได้ระดับผลการเรียน ({systemConfig.gradingSystem === 'thai' ? 'ระบบ 0–4' : 'ระบบ A–F'})
                  </th>
                  <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 bg-emerald-50">
                    ผ่านเกณฑ์<br />(ระดับ 1–4)
                  </th>
                  <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 bg-blue-50">
                    ระดับดีขึ้นไป<br />(3–4)
                  </th>
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-800">
                  {stats.gradeKeys.map((key) => (
                    <th key={key} className="border border-slate-600 px-1.5 py-1 min-w-8 font-mono">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-600 px-2 py-1.5 text-left font-bold bg-slate-50">จำนวน (คน)</td>
                  <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold">{stats.total}</td>
                  {stats.gradeKeys.map((key) => (
                    <td key={key} className="border border-slate-600 px-1.5 py-1.5 font-mono">
                      {stats.counts[key]}
                    </td>
                  ))}
                  <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-emerald-50/70 text-emerald-900">
                    {stats.passedCount}
                  </td>
                  <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-blue-50/70 text-blue-900">
                    {stats.level3OrAboveCount}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-600 px-2 py-1.5 text-left font-bold bg-slate-50">ร้อยละ (%)</td>
                  <td className="border border-slate-600 px-2 py-1.5 font-mono">100.0</td>
                  {stats.gradeKeys.map((key) => (
                    <td key={key} className="border border-slate-600 px-1.5 py-1.5 font-mono text-slate-600">
                      {stats.pct(stats.counts[key])}
                    </td>
                  ))}
                  <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-emerald-50/70 text-emerald-900">
                    {stats.pct(stats.passedCount)}%
                  </td>
                  <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-blue-50/70 text-blue-900">
                    {stats.pct(stats.level3OrAboveCount)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1.2 Desirable Attributes / Analytical Reading / Key Competencies Summary */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <th className="border border-slate-600 px-2.5 py-1.5 text-left">
                    ๑.๒ สรุปผลการประเมินตามหลักสูตรแกนกลางฯ
                  </th>
                  <th className="border border-slate-600 px-2 py-1.5">ดีเยี่ยม (๓)</th>
                  <th className="border border-slate-600 px-2 py-1.5">ดี (๒)</th>
                  <th className="border border-slate-600 px-2 py-1.5">ผ่าน (๑)</th>
                  <th className="border border-slate-600 px-2 py-1.5">ไม่ผ่าน (๐)</th>
                  <th className="border border-slate-600 px-2 py-1.5">ร้อยละระดับดีขึ้นไป</th>
                </tr>
              </thead>
              <tbody>
                {[
                  'คุณลักษณะอันพึงประสงค์ ๘ ประการ',
                  'การอ่าน คิดวิเคราะห์ และเขียน',
                  'สมรรถนะสำคัญของผู้เรียน ๕ ประการ',
                ].map((label) => {
                  const goodOrAbove = stats.attrCounts['3'] + stats.attrCounts['2'];
                  return (
                    <tr key={label}>
                      <td className="border border-slate-600 px-2.5 py-1.5 text-left font-medium">{label}</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{stats.attrCounts['3']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{stats.attrCounts['2']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{stats.attrCounts['1']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{stats.attrCounts['0']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold">
                        {stats.pct(goodOrAbove)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Part 2: Complete Student Score, Attendance & Evaluation Roster */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
              ส่วนที่ ๒ บัญชีรายชื่อ เวลาเรียน คะแนนเก็บ และผลการประเมินรายบุคคล
            </h3>
            <span className="text-[11px] text-slate-600 font-medium">
              อัตราส่วนคะแนน: ระหว่างภาค ๖๐ (ชิ้นงาน ๒๐ + ย่อย ๑๐ + กลางภาค ๓๐) : ปลายภาค ๔๐ = ๑๐๐ คะแนน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1.5 w-10">ที่</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-2 text-left min-w-44">เลขประจำตัว / ชื่อ-สกุล</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1.5 w-14">ห้อง</th>
                  <th colSpan={2} className="border border-slate-600 py-1 px-1">เวลาเรียน ({totalHours} ชม.)</th>
                  <th colSpan={4} className="border border-slate-600 py-1 px-1">คะแนนระหว่างภาค (๖๐)</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-14">ปลายภาค<br />(๔๐)</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-14 bg-amber-50">รวม<br />(๑๐๐)</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-14 bg-slate-200">ระดับผล<br />การเรียน</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-16">คุณลักษณะ<br />(๓)</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-16">อ่านคิดฯ<br />(๓)</th>
                  <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-16">สมรรถนะ<br />(๓)</th>
                </tr>
                <tr className="bg-slate-50 text-[10px] font-semibold text-slate-800">
                  <th className="border border-slate-600 py-1 px-1 w-14">มา/ทั้งหมด</th>
                  <th className="border border-slate-600 py-1 px-1 w-14">ร้อยละ</th>
                  <th className="border border-slate-600 py-1 px-1 w-12">ชิ้นงาน<br />(๒๐)</th>
                  <th className="border border-slate-600 py-1 px-1 w-12">ย่อย<br />(๑๐)</th>
                  <th className="border border-slate-600 py-1 px-1 w-12">กลางภาค<br />(๓๐)</th>
                  <th className="border border-slate-600 py-1 px-1 w-12 bg-slate-100">รวม<br />(๖๐)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="border border-slate-500 py-6 text-slate-500">
                      ยังไม่มีนักเรียนลงทะเบียนหรือบันทึกคะแนนในรายวิชานี้
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const isVisible =
                      idx >= currentPp5Page * pp5PageSize &&
                      idx < (currentPp5Page + 1) * pp5PageSize;
                    return (
                      <tr
                        key={row.student.id}
                        className={`${isVisible ? '' : 'hidden print:table-row'} hover:bg-slate-50`}
                      >
                        <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                        <td className="border border-slate-400 py-1.5 px-2 text-left">
                          <span className="font-semibold text-slate-900">
                            {row.student.firstNameTh} {row.student.lastNameTh}
                          </span>
                          <span className="block text-[10px] text-slate-600 font-mono">
                            {row.student.studentIdNumber}
                          </span>
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px]">{row.student.room}</td>
                        <td className="border border-slate-400 py-1.5 font-mono text-[11px]">
                          {row.eligibility.attendedHours}/{row.eligibility.totalScheduledHours}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-mono font-bold text-[11px] ${
                            row.isMs ? 'text-rose-700 bg-rose-50' : 'text-emerald-800'
                          }`}
                        >
                          {row.eligibility.attendancePercent}%{row.isMs ? ' (มส.)' : ''}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.grade ? row.grade.assignmentScore : '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.grade ? row.grade.quizScore : '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.grade ? row.grade.midtermScore : '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono font-semibold bg-slate-50">
                          {row.courseworkSubtotal ?? '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.grade ? row.grade.finalScore : '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                          {row.grade ? row.grade.totalScore : '-'}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-mono font-extrabold text-sm ${
                            row.isMs || row.finalLetter === '0' || row.finalLetter === 'F'
                              ? 'bg-rose-50 text-rose-800'
                              : row.finalLetter === 'ร'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-950'
                          }`}
                        >
                          {row.finalLetter}
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px] font-medium">
                          {row.quality.pass ? `${row.quality.level} (${row.quality.code})` : row.quality.level}
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px] font-medium">
                          {row.quality.pass ? `${row.quality.level} (${row.quality.code})` : row.quality.level}
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px] font-medium">
                          {row.quality.pass ? `${row.quality.level} (${row.quality.code})` : row.quality.level}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {renderPageControls(currentPp5Page, rows.length, pp5PageSize, setPp5Page, 'PP5 pages', true)}
        </div>

        {/* Part 3: Official Grading Criteria Reference */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
            ส่วนที่ ๓ เกณฑ์การวัดและประเมินผลตามระเบียบกระทรวงศึกษาธิการ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] bg-slate-50 p-3.5 rounded-lg border border-slate-400">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">๑. เกณฑ์ตัดสินระดับผลการเรียน ๘ ระดับ</span>
              <span className="text-slate-700 leading-relaxed">
                ๔ (๘๐–๑๐๐) • ๓.๕ (๗๕–๗๙) • ๓ (๗๐–๗๔) • ๒.๕ (๖๕–๖๙) • ๒ (๖๐–๖๔) • ๑.๕ (๕๕–๕๙) • ๑ (๕๐–๕๔) • ๐ (๐–๔๙)
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">๒. เกณฑ์เวลาเรียนและอักษรแสดงผลการเรียน</span>
              <span className="text-slate-700 leading-relaxed">
                เวลาเรียนต้องไม่น้อยกว่าร้อยละ ๘๐ ({minAttendanceHours} จาก {totalHours} ชม.) หากไม่ถึงเกณฑ์ให้ระดับ มส. • ขาดส่งงาน/สอบสำคัญให้ ร
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">๓. ระดับผลการประเมินด้านอื่นๆ (๐–๓)</span>
              <span className="text-slate-700 leading-relaxed">
                ระดับ ๓ = ดีเยี่ยม • ระดับ ๒ = ดี • ระดับ ๑ = ผ่านเกณฑ์ขั้นต่ำ • ระดับ ๐ = ไม่ผ่านเกณฑ์
              </span>
            </div>
          </div>
        </div>

        {/* Part 4: 4-Tier Official MOE Approval Block */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
            ส่วนที่ ๔ การเสนอและการพิจารณาอนุมัติผลการเรียน
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-700 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 text-xs">
            <div className="p-3.5 flex flex-col justify-between min-h-36">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">๑. ครูผู้สอน</p>
                <p className="text-[11px] text-slate-600">ได้ดำเนินการวัดและประเมินผลถูกต้องตามระเบียบฯ แล้ว</p>
              </div>
              <div className="pt-8 text-center space-y-1">
                <div className="border-b border-dotted border-slate-500 mx-4"></div>
                <p className="font-semibold">({selectedCourse.teacherName || '............................................'})</p>
                <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between min-h-36">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">๒. หัวหน้ากลุ่มสาระการเรียนรู้</p>
                <p className="text-[11px] text-slate-700">[  ] เห็นควรอนุมัติ   [  ] ปรับปรุงแก้ไข</p>
              </div>
              <div className="pt-8 text-center space-y-1">
                <div className="border-b border-dotted border-slate-500 mx-4"></div>
                <p className="font-semibold">({headOfDeptName.trim() || '............................................'})</p>
                <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between min-h-36">
              <div className="space-y-1">
                <p className="font-bold text-slate-900">๓. หัวหน้างานวัดและประเมินผล</p>
                <p className="text-[11px] text-slate-700">[  ] ตรวจทานคะแนนและสถิติถูกต้อง</p>
              </div>
              <div className="pt-8 text-center space-y-1">
                <div className="border-b border-dotted border-slate-500 mx-4"></div>
                <p className="font-semibold">({measurementHeadName.trim() || '............................................'})</p>
                <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between min-h-36 bg-slate-50/70">
              <div className="space-y-1">
                <p className="font-bold text-slate-950">๔. ผู้อำนวยการสถานศึกษา</p>
                <p className="text-[11px] font-semibold text-slate-800">[  ] อนุมัติ   [  ] ไม่อนุมัติ</p>
              </div>
              <div className="pt-8 text-center space-y-1">
                <div className="border-b border-dotted border-slate-500 mx-4"></div>
                <p className="font-semibold">({directorName.trim() || '............................................'})</p>
                <p className="text-[11px] text-slate-600">วันที่อนุมัติ ....... / ............ / ...........</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Pp6OfficialFormProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  systemConfig: SystemConfig;
  selectedStudentIdForPp6: string;
  setSelectedStudentIdForPp6: (id: string) => void;
  currentPp6CoursePage: number;
  pp6CoursePageSize: number;
  setPp6CoursePage: (page: number) => void;
  renderPageControls: (
    page: number,
    totalItems: number,
    pageSize: number,
    setPage: (page: number) => void,
    label: string,
    isLight?: boolean
  ) => React.ReactNode;
}

const MOE_ATTRIBUTES = [
  '๑. รักชาติ ศาสน์ กษัตริย์',
  '๒. ซื่อสัตย์สุจริต',
  '๓. มีวินัย',
  '๔. ใฝ่เรียนรู้',
  '๕. อยู่อย่างพอเพียง',
  '๖. มุ่งมั่นในการทำงาน',
  '๗. รักความเป็นไทย',
  '๘. มีจิตสาธารณะ',
];

const MOE_ACTIVITIES = [
  { name: '๑. กิจกรรมแนะแนว', hours: '๒๐ ชม.', result: 'ผ (ผ่าน)' },
  { name: '๒. กิจกรรมนักเรียน (ลูกเสือ / เนตรนารี / ยุวกาชาด)', hours: '๒๐ ชม.', result: 'ผ (ผ่าน)' },
  { name: '๓. กิจกรรมชมรม / ชุมนุม', hours: '๒๐ ชม.', result: 'ผ (ผ่าน)' },
  { name: '๔. กิจกรรมเพื่อสังคมและสาธารณประโยชน์', hours: '๑๕ ชม.', result: 'ผ (ผ่าน)' },
];

export const Pp6OfficialForm: React.FC<Pp6OfficialFormProps> = ({
  students,
  courses,
  grades,
  attendance,
  systemConfig,
  selectedStudentIdForPp6,
  setSelectedStudentIdForPp6,
  currentPp6CoursePage,
  pp6CoursePageSize,
  setPp6CoursePage,
  renderPageControls,
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [homeroomComment, setHomeroomComment] = useState(
    'นักเรียนมีความตั้งใจในการเรียน สนใจใฝ่รู้ รับผิดชอบงานที่ได้รับมอบหมายสม่ำเสมอ อยู่ร่วมกับเพื่อนและปฏิบัติตามระเบียบของสถานศึกษาได้เป็นอย่างดี'
  );

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      s.studentIdNumber.toLowerCase().includes(q) ||
      `${s.firstNameTh} ${s.lastNameTh}`.toLowerCase().includes(q) ||
      `${s.firstNameEn} ${s.lastNameEn}`.toLowerCase().includes(q) ||
      (s.room || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentIdForPp6) ||
    filteredStudents[0] ||
    students[0];

  const currentIdx = selectedStudent ? students.findIndex((s) => s.id === selectedStudent.id) : -1;

  // Courses relevant to this student (enrolled or has grade record)
  const studentCourses = useMemo(() => {
    if (!selectedStudent) return [];
    const matched = courses.filter(
      (c) =>
        (c.enrolledStudentIds || []).includes(selectedStudent.id) ||
        grades.some((g) => g.courseId === c.id && g.studentId === selectedStudent.id)
    );
    return matched.length > 0 ? matched : courses;
  }, [courses, grades, selectedStudent]);

  // Real Term GPA calculation
  const academicSummary = useMemo(() => {
    if (!selectedStudent) return { registeredCredits: 0, earnedCredits: 0, termGpa: '0.00' };
    let registeredCredits = 0;
    let earnedCredits = 0;
    let gradedCredits = 0;
    let weightedPoints = 0;

    studentCourses.forEach((course) => {
      registeredCredits += course.credits;
      const grade = grades.find((g) => g.courseId === course.id && g.studentId === selectedStudent.id);
      if (grade) {
        const res = calculateGrade(grade.totalScore, systemConfig.gradingSystem);
        gradedCredits += course.credits;
        weightedPoints += course.credits * res.point;
        if (res.point >= 1) earnedCredits += course.credits;
      }
    });

    const termGpa = gradedCredits > 0
      ? (weightedPoints / gradedCredits).toFixed(2)
      : selectedStudent.gpa.toFixed(2);

    return { registeredCredits, earnedCredits, termGpa };
  }, [studentCourses, grades, selectedStudent, systemConfig.gradingSystem]);

  // Student Attendance Summary
  const attendanceStats = useMemo(() => {
    if (!selectedStudent) return { total: 0, present: 0, late: 0, leaveOrSick: 0, absent: 0, pct: '-' };
    const recs = attendance.filter((a) => a.studentId === selectedStudent.id);
    if (recs.length === 0) return { total: 0, present: 0, late: 0, leaveOrSick: 0, absent: 0, pct: '100.0%' };
    const present = recs.filter((r) => r.status === 'present').length;
    const late = recs.filter((r) => r.status === 'late').length;
    const leaveOrSick = recs.filter((r) => r.status === 'sick' || r.status === 'leave').length;
    const absent = recs.filter((r) => r.status === 'absent').length;
    const pct = (((present + late) / recs.length) * 100).toFixed(1) + '%';
    return { total: recs.length, present, late, leaveOrSick, absent, pct };
  }, [attendance, selectedStudent]);

  return (
    <div className="space-y-4">
      {/* Searchable Student Selector Bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 print:hidden flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="ค้นหาชื่อ-สกุล รหัสนักเรียน หรือห้อง..."
            className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          {studentSearch && (
            <button
              type="button"
              onClick={() => setStudentSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={selectedStudent?.id || ''}
          onChange={(e) => {
            setSelectedStudentIdForPp6(e.target.value);
            setPp6CoursePage(0);
          }}
          className="flex-1 min-w-56 px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)]"
        >
          {filteredStudents.length === 0 ? (
            <option value="">ไม่พบนักเรียนที่ค้นหา</option>
          ) : (
            filteredStudents.map((stu) => (
              <option key={stu.id} value={stu.id}>
                {stu.studentIdNumber} - {stu.firstNameTh} {stu.lastNameTh} ({stu.room})
              </option>
            ))
          )}
        </select>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={currentIdx <= 0}
            onClick={() => {
              if (currentIdx > 0) {
                setSelectedStudentIdForPp6(students[currentIdx - 1].id);
                setPp6CoursePage(0);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>ก่อนหน้า</span>
          </button>
          <button
            type="button"
            disabled={currentIdx < 0 || currentIdx >= students.length - 1}
            onClick={() => {
              if (currentIdx >= 0 && currentIdx < students.length - 1) {
                setSelectedStudentIdForPp6(students[currentIdx + 1].id);
                setPp6CoursePage(0);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {selectedStudent && (
        <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-300 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
          {/* Official P.P.6 Header */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-slate-900" />
                <span className="text-[8px] font-bold">สพฐ.</span>
              </div>
              <div className="text-center flex-1 space-y-0.5">
                <p className="text-xs font-bold text-slate-700">
                  แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.๖)
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-950">
                  โรงเรียน{systemConfig.schoolNameTh}
                </h2>
                <p className="text-[11px] text-slate-600">
                  สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน • {formatSemesterLabel(systemConfig.currentSemester)} ปีการศึกษา {systemConfig.academicYear}
                </p>
              </div>
              <div className="border-2 border-slate-900 px-3 py-1.5 text-center shrink-0">
                <div className="text-sm font-extrabold">ปพ.๖</div>
                <div className="text-[10px] font-mono">รายบุคคล</div>
              </div>
            </div>

            {/* Student Identity Grid */}
            <table className="w-full text-xs border-collapse border border-slate-700">
              <tbody>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-32">ชื่อ - สกุล ผู้เรียน</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-bold text-slate-950">
                    {selectedStudent.gender === 'female' ? 'ด.ญ./น.ส. ' : 'ด.ช./นาย '}
                    {selectedStudent.firstNameTh} {selectedStudent.lastNameTh}
                    <span className="ml-2 text-slate-600 font-normal">({selectedStudent.firstNameEn} {selectedStudent.lastNameEn})</span>
                  </td>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-32">เลขประจำตัว</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-mono font-bold tabular-nums">
                    {selectedStudent.studentIdNumber}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">เลขประชาชน (13 หลัก)</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-mono tabular-nums">
                    {selectedStudent.nationalId || '-'}
                  </td>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ระดับชั้น / ห้อง</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-semibold">
                    {selectedStudent.gradeLevel} ({selectedStudent.room})
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">วัน/เดือน/ปีเกิด</td>
                  <td className="border border-slate-500 px-3 py-1.5 tabular-nums">{selectedStudent.dateOfBirth || '-'}</td>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ผู้ปกครอง</td>
                  <td className="border border-slate-500 px-3 py-1.5">
                    {selectedStudent.guardianName} ({selectedStudent.guardianRelation})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 1: Subject Grades Table */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
              ตอนที่ ๑ ผลการพัฒนาคุณภาพผู้เรียนรายวิชา
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-2 w-10">ที่</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">รหัสวิชา</th>
                    <th className="border border-slate-600 py-2 px-2 text-left">รายวิชา</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">ประเภท</th>
                    <th className="border border-slate-600 py-2 px-2 w-16">หน่วยกิต</th>
                    <th className="border border-slate-600 py-2 px-2 w-16">คะแนนเต็ม</th>
                    <th className="border border-slate-600 py-2 px-2 w-20 bg-amber-50">คะแนนที่ได้</th>
                    <th className="border border-slate-600 py-2 px-2 w-20 bg-slate-200">ระดับผลการเรียน</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">ผลการตัดสิน</th>
                  </tr>
                </thead>
                <tbody>
                  {studentCourses.map((course, index) => {
                    const grade = grades.find(
                      (g) => g.courseId === course.id && g.studentId === selectedStudent.id
                    );
                    const gradeDisplay = grade
                      ? calculateGrade(grade.totalScore, systemConfig.gradingSystem)
                      : null;
                    const isPass = gradeDisplay ? gradeDisplay.point >= 1 : null;
                    const isVisible =
                      index >= currentPp6CoursePage * pp6CoursePageSize &&
                      index < (currentPp6CoursePage + 1) * pp6CoursePageSize;

                    return (
                      <tr
                        key={course.id}
                        className={`${isVisible ? '' : 'hidden print:table-row'} hover:bg-slate-50`}
                      >
                        <td className="border border-slate-400 py-1.5 font-mono">{index + 1}</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold">{course.code}</td>
                        <td className="border border-slate-400 py-1.5 px-2.5 text-left font-medium">
                          {course.titleTh}
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px] text-slate-600">
                          {course.category === 'core' ? 'พื้นฐาน' : 'เพิ่มเติม'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">{course.credits.toFixed(1)}</td>
                        <td className="border border-slate-400 py-1.5 font-mono">100</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                          {grade ? grade.totalScore : '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono font-extrabold bg-slate-100 text-slate-950">
                          {gradeDisplay ? gradeDisplay.letter : 'รอผล'}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-semibold text-[11px] ${
                            isPass === true
                              ? 'text-emerald-800'
                              : isPass === false
                                ? 'text-rose-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {isPass === true ? 'ผ่านเกณฑ์' : isPass === false ? 'ไม่ผ่านเกณฑ์' : 'รอประเมิน'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-700">
                    <td colSpan={4} className="border border-slate-600 py-2 px-3 text-left">
                      สรุปผลการเรียนประจำภาคเรียน
                    </td>
                    <td className="border border-slate-600 py-2 font-mono">
                      {academicSummary.registeredCredits.toFixed(1)}
                    </td>
                    <td colSpan={2} className="border border-slate-600 py-2 px-2 text-right font-mono">
                      หน่วยกิตที่ได้: {academicSummary.earnedCredits.toFixed(1)}
                    </td>
                    <td colSpan={2} className="border border-slate-600 py-2 px-3 text-right font-mono text-sm">
                      GPA: {academicSummary.termGpa} | GPAX: {selectedStudent.gpa.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {renderPageControls(
              currentPp6CoursePage,
              studentCourses.length,
              pp6CoursePageSize,
              setPp6CoursePage,
              'PP6 course pages',
              true
            )}
          </div>

          {/* Section 2: 8 Desirable Attributes, Analytical Reading, Competencies & Student Activities */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
              ตอนที่ ๒ การประเมินคุณลักษณะอันพึงประสงค์ การอ่านคิดวิเคราะห์ สมรรถนะ และกิจกรรมพัฒนาผู้เรียน
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 8 MOE Desirable Attributes Table */}
              <table className="w-full text-xs border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 px-2.5 py-1.5 text-left">คุณลักษณะอันพึงประสงค์ ๘ ประการ</th>
                    <th className="border border-slate-600 px-2 py-1.5 text-center w-24">ผลการประเมิน</th>
                  </tr>
                </thead>
                <tbody>
                  {MOE_ATTRIBUTES.map((attr) => (
                    <tr key={attr}>
                      <td className="border border-slate-400 px-2.5 py-1">{attr}</td>
                      <td className="border border-slate-400 px-2 py-1 text-center font-semibold text-emerald-800">
                        ดีเยี่ยม (๓)
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-600 px-2.5 py-1.5">สรุปผลการประเมินคุณลักษณะอันพึงประสงค์</td>
                    <td className="border border-slate-600 px-2 py-1.5 text-center text-emerald-900">ดีเยี่ยม (๓)</td>
                  </tr>
                </tbody>
              </table>

              {/* Student Development Activities & Reading/Competencies */}
              <div className="space-y-3">
                <table className="w-full text-xs border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-600 px-2.5 py-1.5 text-left">กิจกรรมพัฒนาผู้เรียน</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-16">เวลา</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-20">ผลการเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOE_ACTIVITIES.map((act) => (
                      <tr key={act.name}>
                        <td className="border border-slate-400 px-2.5 py-1.5">{act.name}</td>
                        <td className="border border-slate-400 px-2 py-1.5 text-center font-mono">{act.hours}</td>
                        <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">{act.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="w-full text-xs border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-600 px-2.5 py-1.5 text-left">การประเมินสมรรถนะและการอ่านคิดวิเคราะห์</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-24">ระดับคุณภาพ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 px-2.5 py-1.5">การอ่าน คิดวิเคราะห์ และเขียน</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">ดีเยี่ยม (๓)</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 px-2.5 py-1.5">สมรรถนะสำคัญของผู้เรียน ๕ ประการ</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">ดีเยี่ยม (๓)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Attendance, Advisor Opinion & Parent Acknowledgment */}
          <div className="space-y-3 break-inside-avoid">
            <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
              ตอนที่ ๓ สถิติเวลาเรียน ความคิดเห็นครูประจำชั้น และการรับทราบของผู้ปกครอง
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center tabular-nums">
              <div className="p-2 rounded border border-slate-400 bg-slate-50">
                <span className="text-[10px] text-slate-600 block font-semibold">บันทึกเวลาทั้งหมด</span>
                <span className="font-mono font-bold text-sm">{attendanceStats.total} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-emerald-50/60">
                <span className="text-[10px] text-emerald-800 block font-semibold">มาเรียน</span>
                <span className="font-mono font-bold text-sm text-emerald-900">{attendanceStats.present} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-amber-50/60">
                <span className="text-[10px] text-amber-800 block font-semibold">มาสาย</span>
                <span className="font-mono font-bold text-sm text-amber-900">{attendanceStats.late} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-slate-50">
                <span className="text-[10px] text-slate-700 block font-semibold">ลาป่วย / ลากิจ / ขาด</span>
                <span className="font-mono font-bold text-sm">{attendanceStats.leaveOrSick} / {attendanceStats.absent} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-slate-100">
                <span className="text-[10px] text-slate-700 block font-semibold">ร้อยละการมาเรียน</span>
                <span className="font-mono font-extrabold text-sm text-slate-950">{attendanceStats.pct}</span>
              </div>
            </div>

            <div className="border border-slate-600 p-3 rounded space-y-1.5 text-xs">
              <label className="font-bold text-slate-900 block">ความคิดเห็นและข้อเสนอแนะของครูประจำชั้น:</label>
              <textarea
                rows={2}
                value={homeroomComment}
                onChange={(e) => setHomeroomComment(e.target.value)}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded p-2 print:border-none print:bg-transparent print:p-0 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-700 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 text-xs text-center">
              <div className="p-3.5 flex flex-col justify-between min-h-32">
                <p className="font-bold text-slate-900">ครูประจำชั้น / ครูที่ปรึกษา</p>
                <div className="pt-8 space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-6"></div>
                  <p>(.....................................................)</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>
              <div className="p-3.5 flex flex-col justify-between min-h-32">
                <p className="font-bold text-slate-900">ผู้ปกครองรับทราบผลการเรียน</p>
                <p className="text-[11px] text-slate-700 mt-1">[  ] รับทราบผลการพัฒนาคุณภาพผู้เรียนแล้ว</p>
                <div className="pt-6 space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-6"></div>
                  <p>({selectedStudent.guardianName || '.....................................................'})</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>
              <div className="p-3.5 flex flex-col justify-between min-h-32 bg-slate-50/70">
                <p className="font-bold text-slate-950">ผู้อำนวยการสถานศึกษา</p>
                <div className="pt-8 space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-6"></div>
                  <p>(.....................................................)</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
