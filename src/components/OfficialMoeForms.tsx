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
import { formatSemesterLabel } from '../lib/schoolSettings';
import { calculateStudentCourseEligibility } from '../lib/examEligibility';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  detectCourseEducationStage,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
  isActivityCourse,
  isPrimaryStage,
  resolveEffectiveGrade,
} from '../lib/moeGrading';
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
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
  searchQuery?: string;
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
  searchQuery = '',
  renderPageControls,
}) => {
  const [affiliationOffice, setAffiliationOffice] = useState('สำนักงานเขตพื้นที่การศึกษา (สพฐ.)');
  const [headOfDeptName, setHeadOfDeptName] = useState('');
  const [measurementHeadName, setMeasurementHeadName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [docSetNo, setDocSetNo] = useState(`๑ / ${systemConfig.academicYear || '๒๕๖๙'}`);
  const [qualityOverrides, setQualityOverrides] = useState<
    Record<string, { attr?: number; reading?: number; competency?: number }>
  >({});

  const totalHours = selectedCourse.totalHours || Math.max(20, Math.round(selectedCourse.credits * 40));
  const minAttendanceHours = selectedCourse.minAttendanceHours || Math.round(totalHours * 0.8);

  // Merge enrolled students and any student with a grade record in this course
  const rosterStudents = useMemo(() => {
    const enrolledIds = new Set(selectedCourse.enrolledStudentIds || []);
    const gradedIds = new Set(courseGrades.map((g) => g.studentId));
    const combinedIds = new Set([...enrolledIds, ...gradedIds]);
    const list = students.filter((s) => combinedIds.has(s.id));
    if (list.length > 0) return list;
    return [];
  }, [students, selectedCourse.enrolledStudentIds, courseGrades]);

  const courseStage = useMemo(
    () => detectCourseEducationStage(selectedCourse, rosterStudents),
    [selectedCourse, rosterStudents]
  );
  const isPrimaryCourse = isPrimaryStage(courseStage);
  const isEarlyPrimaryCourse = courseStage === 'primary_early';
  const courseIsActivity = isActivityCourse(selectedCourse);

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
      const resolved = resolveEffectiveGrade(grade, selectedCourse, systemConfig.gradingSystem, isMs);
      const baseQuality = deriveQualityRating(grade ? grade.totalScore : null, isMs || resolved.letter === 'ร');
      const overrides = qualityOverrides[student.id] || {};
      const attrNum = overrides.attr ?? baseQuality.num;
      const readingNum = overrides.reading ?? baseQuality.num;
      const competencyNum = overrides.competency ?? baseQuality.num;
      const courseworkSubtotal = grade
        ? grade.assignmentScore + grade.quizScore + grade.midtermScore
        : null;

      return {
        index,
        student,
        grade,
        eligibility,
        isMs: isMs || resolved.letter === 'มส.',
        resolved,
        finalLetter: resolved.letter,
        baseQuality,
        attrNum,
        readingNum,
        competencyNum,
        courseworkSubtotal,
      };
    });
  }, [
    rosterStudents,
    courseGrades,
    selectedCourse,
    timetableSlots,
    attendance,
    periodAttendance,
    systemConfig.gradingSystem,
    qualityOverrides,
  ]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ student }) =>
      [
        student.studentIdNumber,
        student.nationalId,
        `${student.firstNameTh} ${student.lastNameTh}`,
        `${student.firstNameEn} ${student.lastNameEn}`,
        student.room,
        student.gradeLevel,
      ].some((val) => (val || '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  // Live statistics for Part 1
  const stats = useMemo(() => {
    const total = rows.length;
    const isThai = systemConfig.gradingSystem === 'thai';
    const gradeKeys = courseIsActivity
      ? ['ผ', 'มผ', 'ร', 'มส.']
      : isThai
      ? ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส.']
      : ['A', 'B', 'C', 'D', 'F', 'ร', 'มส.'];

    const counts: Record<string, number> = {};
    gradeKeys.forEach((k) => {
      counts[k] = 0;
    });

    const scores: number[] = [];
    let passedCount = 0;
    let level3OrAboveCount = 0;
    const attrCounts: Record<'3' | '2' | '1' | '0', number> = { '3': 0, '2': 0, '1': 0, '0': 0 };
    const readingCounts: Record<'3' | '2' | '1' | '0', number> = { '3': 0, '2': 0, '1': 0, '0': 0 };
    const competencyCounts: Record<'3' | '2' | '1' | '0', number> = { '3': 0, '2': 0, '1': 0, '0': 0 };

    rows.forEach((row) => {
      if (row.finalLetter in counts) {
        counts[row.finalLetter] += 1;
      } else if (row.finalLetter === 'มส.') {
        counts['มส.'] = (counts['มส.'] || 0) + 1;
      } else if ('ร' in counts) {
        counts['ร'] += 1;
      }

      if (row.grade && !row.resolved.isSpecial) {
        scores.push(row.grade.totalScore);
        if (row.resolved.point >= 1) passedCount += 1;
        if (row.resolved.point >= 3) level3OrAboveCount += 1;
      } else if (courseIsActivity && row.finalLetter === 'ผ') {
        if (row.grade) scores.push(row.grade.totalScore);
        passedCount += 1;
      } else if (row.grade && row.finalLetter === 'มผ') {
        scores.push(row.grade.totalScore);
      }

      if (row.attrNum >= 0) attrCounts[String(row.attrNum) as '3' | '2' | '1' | '0'] += 1;
      if (row.readingNum >= 0) readingCounts[String(row.readingNum) as '3' | '2' | '1' | '0'] += 1;
      if (row.competencyNum >= 0) competencyCounts[String(row.competencyNum) as '3' | '2' | '1' | '0'] += 1;
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
      readingCounts,
      competencyCounts,
      pct,
      mean,
      max,
      min,
    };
  }, [rows, systemConfig.gradingSystem, courseIsActivity]);

  return (
    <div className="space-y-3">
      {/* Screen-only Collapsible Official Metadata Editor Bar */}
      <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 print:hidden group">
        <summary className="list-none flex flex-wrap items-center justify-between gap-2 cursor-pointer text-xs font-bold text-[var(--color-text-title)]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
            <span>ตั้งค่าข้อมูลหัวกระดาษและผู้ลงนาม ปพ.๕ (คลิกเพื่อแก้ไขก่อนพิมพ์)</span>
          </div>
          <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
            {affiliationOffice} · ชุดที่ {docSetNo}
          </span>
        </summary>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs pt-2.5 mt-2 border-t border-[var(--color-border)]">
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
      </details>

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
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">
                  {isPrimaryCourse ? 'รอบการประเมิน / ปีการศึกษา' : 'ภาคเรียน / ปีการศึกษา'}
                </td>
                <td className="border border-slate-500 px-3 py-1.5">
                  {isPrimaryCourse
                    ? `ประเมินผลรายปี • ปีการศึกษา ${selectedCourse.academicYear || systemConfig.academicYear}`
                    : `${formatSemesterLabel(selectedCourse.semester)} ปีการศึกษา ${selectedCourse.academicYear || systemConfig.academicYear}`}
                  <span className="ml-1.5 text-[10px] text-slate-600">
                    ({getEducationStageLabelTh(courseStage)})
                  </span>
                </td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ระดับชั้น / ห้องเรียน</td>
                <td className="border border-slate-500 px-3 py-1.5">{distinctRooms}</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">น้ำหนัก / เวลาเรียน</td>
                <td className="border border-slate-500 px-3 py-1.5 tabular-nums">
                  {courseIsActivity
                    ? `กิจกรรมพัฒนาผู้เรียน (ประเมิน ผ/มผ • ${totalHours} ชม.)`
                    : selectedCourse.credits === 0
                    ? `ไม่มีหน่วยกิต (${totalHours} ชม. • เกณฑ์ 80% = ${minAttendanceHours} ชม.)`
                    : isPrimaryCourse
                    ? `${selectedCourse.credits.toFixed(1)} น้ำหนักวิชา (${totalHours} ชม./ปี • เกณฑ์ 80% = ${minAttendanceHours} ชม.)`
                    : `${selectedCourse.credits.toFixed(1)} หน่วยกิต (${totalHours} ชม./ภาค • เกณฑ์ 80% = ${minAttendanceHours} ชม.)`}
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
                  { label: 'คุณลักษณะอันพึงประสงค์ ๘ ประการ', counts: stats.attrCounts },
                  { label: 'การอ่าน คิดวิเคราะห์ และเขียน', counts: stats.readingCounts },
                  { label: 'สมรรถนะสำคัญของผู้เรียน ๕ ประการ', counts: stats.competencyCounts },
                ].map(({ label, counts }) => {
                  const goodOrAbove = counts['3'] + counts['2'];
                  return (
                    <tr key={label}>
                      <td className="border border-slate-600 px-2.5 py-1.5 text-left font-medium">{label}</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['3']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['2']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['1']} คน</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['0']} คน</td>
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="border border-slate-500 py-6 text-slate-500">
                      {rows.length === 0
                        ? 'ยังไม่มีนักเรียนลงทะเบียนหรือบันทึกคะแนนในรายวิชานี้'
                        : 'ไม่พบนักเรียนที่ตรงกับคำค้นหา'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isVisible =
                      idx >= currentPp5Page * pp5PageSize &&
                      idx < (currentPp5Page + 1) * pp5PageSize;
                    const renderQualityText = (val: number) =>
                      val === 3 ? 'ดีเยี่ยม (๓)' : val === 2 ? 'ดี (๒)' : val === 1 ? 'ผ่าน (๑)' : val === 0 ? 'ไม่ผ่าน (๐)' : '-';
                    return (
                      <tr
                        key={row.student.id}
                        className={`${isVisible ? '' : 'hidden print:table-row'} hover:bg-slate-50`}
                      >
                        <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                        <td className="border border-slate-400 py-1.5 px-2 text-left">
                          <span className="font-semibold text-slate-900">
                            {getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}
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
                          {row.grade ? (
                            <span>
                              {isPrimaryCourse ? `${row.grade.totalScore}%` : row.grade.totalScore}
                              {isPrimaryCourse ? <span className="block text-[9px] font-normal text-slate-600">({row.grade.totalScore}/100)</span> : null}
                            </span>
                          ) : '-'}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-mono font-extrabold text-sm ${
                            row.isMs || row.finalLetter === '0' || row.finalLetter === 'F' || row.finalLetter === 'มผ'
                              ? 'bg-rose-50 text-rose-800'
                              : row.finalLetter === 'ร'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-950'
                          }`}
                        >
                          {row.finalLetter}
                        </td>
                        {(['attr', 'reading', 'competency'] as const).map((metricKey) => {
                          const currentVal =
                            metricKey === 'attr'
                              ? row.attrNum
                              : metricKey === 'reading'
                              ? row.readingNum
                              : row.competencyNum;
                          return (
                            <td key={metricKey} className="border border-slate-400 py-1 px-1 text-[11px] font-medium">
                              <span className="hidden print:inline">{renderQualityText(currentVal)}</span>
                              <select
                                value={currentVal}
                                onChange={(e) =>
                                  setQualityOverrides((prev) => ({
                                    ...prev,
                                    [row.student.id]: {
                                      ...(prev[row.student.id] || {}),
                                      [metricKey]: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="print:hidden w-full bg-transparent text-center text-[11px] font-medium focus:outline-none cursor-pointer"
                              >
                                <option value={-1}>-</option>
                                <option value={3}>ดีเยี่ยม (๓)</option>
                                <option value={2}>ดี (๒)</option>
                                <option value={1}>ผ่าน (๑)</option>
                                <option value={0}>ไม่ผ่าน (๐)</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {renderPageControls(currentPp5Page, filteredRows.length, pp5PageSize, setPp5Page, 'PP5 pages', true)}
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
  const [commentCopied, setCommentCopied] = useState(false);
  const [attributeRatings, setAttributeRatings] = useState<Record<number, string>>({});
  const [readingRating, setReadingRating] = useState('ดีเยี่ยม (๓)');
  const [competencyRating, setCompetencyRating] = useState('ดีเยี่ยม (๓)');
  const [activityRatings, setActivityRatings] = useState<Record<number, string>>({});

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [
        s.studentIdNumber,
        s.nationalId,
        `${s.firstNameTh} ${s.lastNameTh}`,
        `${s.firstNameEn} ${s.lastNameEn}`,
        s.room,
        s.gradeLevel,
      ].some((val) => (val || '').toLowerCase().includes(q))
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

  // Credit-weighted & Primary vs Secondary MOE Summary
  const academicSummary = useMemo(() => {
    if (!selectedStudent) {
      return {
        isPrimary: false,
        isEarlyPrimary: false,
        hideGpaCalculations: false,
        gradedSubjectCount: 0,
        registeredCredits: 0,
        earnedCredits: 0,
        termGpa: '0.00',
        gpax: '0.00',
        averageRawScore: null as number | null,
        stageLabel: 'การศึกษาขั้นพื้นฐาน',
      };
    }
    const summary = calculateStudentAcademicSummary({
      student: selectedStudent,
      courses: studentCourses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: systemConfig.academicYear,
      currentSemester: systemConfig.currentSemester,
    });
    const emptyGpa = '0.00';
    return {
      isPrimary: summary.isPrimary,
      isEarlyPrimary: summary.isEarlyPrimary,
      hideGpaCalculations: summary.hideGpaCalculations,
      gradedSubjectCount: summary.gradedSubjectCount,
      registeredCredits: summary.registeredCredits,
      earnedCredits: summary.earnedCredits,
      termGpa: summary.hasRecordedGrades && summary.termGpa !== null ? summary.termGpa.toFixed(2) : emptyGpa,
      gpax: summary.hasRecordedGrades && summary.gpax !== null ? summary.gpax.toFixed(2) : emptyGpa,
      averageRawScore: summary.averageRawScore,
      stageLabel: getEducationStageLabelTh(summary.stage),
    };
  }, [studentCourses, grades, selectedStudent, systemConfig.gradingSystem, systemConfig.academicYear, systemConfig.currentSemester]);

  const pp6CycleEntries = useMemo(() => {
    if (!selectedStudent) return [];
    return aggregateGradesByAssessmentCycle({
      student: selectedStudent,
      courses: studentCourses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: systemConfig.academicYear,
      currentSemester: systemConfig.currentSemester,
    });
  }, [selectedStudent, studentCourses, grades, systemConfig.gradingSystem, systemConfig.academicYear, systemConfig.currentSemester]);

  const pp6GradeByCourseId = useMemo(
    () => new Map(pp6CycleEntries.map((entry) => [entry.grade.courseId, entry])),
    [pp6CycleEntries]
  );

  const pp6OverallFeedback = getRawScoreFeedback(academicSummary.averageRawScore);

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

  const generateSmartHomeroomComment = (tone: 'auto' | 'praise' | 'supportive') => {
    if (!selectedStudent) return;
    const fullName = `${getStudentShortPrefixTh(selectedStudent)} ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`.trim();
    const pctNum = parseFloat(attendanceStats.pct) || 100;
    const gpaxNum = parseFloat(academicSummary.gpax) || 0;
    const avgRaw = academicSummary.averageRawScore;

    const scoredEntries = pp6CycleEntries
      .map((entry) => {
        const crs = studentCourses.find((c) => c.id === entry.grade.courseId);
        return {
          title: crs?.titleTh || crs?.code || '',
          score: entry.grade.totalScore,
          passed: entry.resolved.passed,
        };
      })
      .filter((e) => e.title);
    const bestSubjects = scoredEntries
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((e) => e.title);
    const weakSubjects = scoredEntries
      .filter((e) => e.score < 60 || e.passed === false)
      .slice(0, 2)
      .map((e) => e.title);

    const attendanceNote =
      pctNum >= 95
        ? `มีเวลาเรียนสม่ำเสมอและตรงเวลาเป็นอย่างดี (${attendanceStats.pct})`
        : pctNum >= 85
          ? `มาเรียนสม่ำเสมอ (${attendanceStats.pct}) ปฏิบัติตามกฎระเบียบได้ดี`
          : `ควรเพิ่มความสม่ำเสมอในการมาเรียนให้เกินเกณฑ์ 80% (ปัจจุบัน ${attendanceStats.pct})`;

    const academicPhrase = academicSummary.hideGpaCalculations
      ? (avgRaw !== null ? `มีคะแนนประเมินเฉลี่ยรวม ${avgRaw}% (${pp6OverallFeedback.labelTh})` : 'อยู่ในระหว่างรวบรวมผลการประเมินรายปี')
      : (gpaxNum >= 3.5
          ? `มีผลสัมฤทธิ์ทางการเรียนดีเยี่ยม (GPA ${academicSummary.termGpa} / GPAX ${academicSummary.gpax})`
          : gpaxNum >= 2.5
            ? `มีผลสัมฤทธิ์ทางการเรียนอยู่ในเกณฑ์ดี (GPA ${academicSummary.termGpa})`
            : `ควรเสริมการทบทวนบทเรียนและส่งงานให้ครบถ้วนต่อเนื่อง (GPA ${academicSummary.termGpa})`);

    const resolvedTone =
      tone === 'auto'
        ? (weakSubjects.length > 0 || pctNum < 85 || (!academicSummary.hideGpaCalculations && gpaxNum > 0 && gpaxNum < 2.2)
            ? 'supportive'
            : 'praise')
        : tone;

    if (resolvedTone === 'praise') {
      const strengthText = bestSubjects.length > 0 ? ` โดดเด่นเป็นพิเศษในรายวิชา${bestSubjects.join(' และ')}` : '';
      setHomeroomComment(
        `${fullName} ${academicPhrase}${strengthText} อีกทั้ง${attendanceNote} มีความรับผิดชอบและอยู่ร่วมกับเพื่อนได้อย่างเหมาะสม ขอชื่นชมและส่งเสริมให้พัฒนาศักยภาพอย่างต่อเนื่อง`
      );
      return;
    }

    const supportText = weakSubjects.length > 0 ? ` แนะนำให้ทบทวนเพิ่มเติมในรายวิชา${weakSubjects.join(' และ')} รวมถึงติดตามงานที่ค้างส่ง` : ' แนะนำให้จัดตารางทบทวนบทเรียนอย่างสม่ำเสมอ';
    setHomeroomComment(
      `${fullName} ${academicPhrase} และ${attendanceNote}${supportText} ทั้งนี้ครูประจำชั้นยินดีร่วมมือกับผู้ปกครองในการดูแลช่วยเหลือและให้กำลังใจผู้เรียนอย่างใกล้ชิด`
    );
  };

  return (
    <div className="space-y-3">
      {/* Searchable Student Selector Bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 print:hidden flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="ค้นหาชื่อ-สกุล รหัสนักเรียน เลข ปชช. หรือห้อง..."
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
                  สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน •{' '}
                  {academicSummary.isPrimary
                    ? `รายงานผลการประเมินรายปี ปีการศึกษา ${systemConfig.academicYear}`
                    : `${formatSemesterLabel(systemConfig.currentSemester)} ปีการศึกษา ${systemConfig.academicYear}`}{' '}
                  ({academicSummary.stageLabel})
                </p>
              </div>
              <div className="border-2 border-slate-900 px-3 py-1.5 text-center shrink-0">
                <div className="text-sm font-extrabold">ปพ.๖</div>
                <div className="text-[10px] font-mono">{academicSummary.isPrimary ? 'รายปี' : 'รายภาค'}</div>
              </div>
            </div>

            {/* Student Identity Grid */}
            <table className="w-full text-xs border-collapse border border-slate-700">
              <tbody>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-32">ชื่อ - สกุล ผู้เรียน</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-bold text-slate-950">
                    {getStudentShortPrefixTh(selectedStudent)}{' '}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wide border-l-4 border-slate-900 pl-2">
                ตอนที่ ๑ ผลการพัฒนาคุณภาพผู้เรียนรายวิชา ({academicSummary.isPrimary ? 'ประเมินผลรายปี' : 'ประเมินผลรายภาคเรียน'})
              </h3>
              {academicSummary.isPrimary && (
                <span className="text-[11px] font-semibold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                  {academicSummary.isEarlyPrimary
                    ? 'ป.1–ป.3: สื่อสารด้วยคะแนนดิบ (เต็ม 100) / ร้อยละ (%) และสรุปเกรด 0–4 รายปี'
                    : 'ประถมศึกษา: ประเมินรายปี เกรด 0–4 ควบคู่คะแนนดิบ (เต็ม 100) / ร้อยละ (%)'}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-2 w-10">ที่</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">รหัสวิชา</th>
                    <th className="border border-slate-600 py-2 px-2 text-left">รายวิชา</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">ประเภท</th>
                    <th className="border border-slate-600 py-2 px-2 w-16">{academicSummary.isPrimary ? 'น้ำหนัก' : 'หน่วยกิต'}</th>
                    <th className="border border-slate-600 py-2 px-2 w-16">คะแนนเต็ม</th>
                    <th className="border border-slate-600 py-2 px-2 w-24 bg-amber-50">คะแนนที่ได้ (%)</th>
                    <th className="border border-slate-600 py-2 px-2 w-20 bg-slate-200">ระดับผลการเรียน</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">ผลการตัดสิน</th>
                  </tr>
                </thead>
                <tbody>
                  {studentCourses.map((course, index) => {
                    const cycleEntry = pp6GradeByCourseId.get(course.id);
                    const grade =
                      cycleEntry?.grade ||
                      grades.find((g) => g.courseId === course.id && g.studentId === selectedStudent.id);
                    const resolved =
                      cycleEntry?.resolved ||
                      resolveEffectiveGrade(grade, course, systemConfig.gradingSystem, false);
                    const rawFeedback = grade ? getRawScoreFeedback(grade.totalScore) : null;
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
                          {getCategoryTypeLabel(course.category)}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {resolved.isActivity || course.credits <= 0 ? '-' : course.credits.toFixed(1)}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">100</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                          {grade ? `${grade.totalScore}% (${grade.totalScore}/100)` : '-'}
                        </td>
                        <td className={`border border-slate-400 py-1.5 font-mono font-extrabold ${
                          resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ'
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-slate-100 text-slate-950'
                        }`}>
                          {resolved.letter}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-semibold text-[11px] ${
                            resolved.passed === true
                              ? 'text-emerald-800'
                              : resolved.passed === false
                                ? 'text-rose-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {academicSummary.isPrimary && rawFeedback && !resolved.isSpecial
                            ? rawFeedback.labelTh
                            : resolved.passed === true
                            ? 'ผ่านเกณฑ์'
                            : resolved.passed === false
                            ? (resolved.isSpecial ? resolved.letter : 'ไม่ผ่านเกณฑ์')
                            : 'รอประเมิน'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-700">
                    {academicSummary.hideGpaCalculations ? (
                      <>
                        <td colSpan={4} className="border border-slate-600 py-2 px-3 text-left">
                          สรุปผลการประเมินรายปี (ป.1–ป.6 • {academicSummary.gradedSubjectCount} รายวิชา)
                        </td>
                        <td colSpan={3} className="border border-slate-600 py-2 px-3 text-right font-mono text-sm">
                          คะแนนดิบเฉลี่ย: {academicSummary.averageRawScore !== null ? `${academicSummary.averageRawScore}% (เต็ม 100)` : '-'}
                        </td>
                        <td colSpan={2} className="border border-slate-600 py-2 px-3 text-right font-semibold text-sm text-emerald-900">
                          พัฒนาการภาพรวม: {pp6OverallFeedback.labelTh}
                        </td>
                      </>
                    ) : (
                      <>
                        <td colSpan={4} className="border border-slate-600 py-2 px-3 text-left">
                          สรุปผลการเรียนประจำภาคเรียน (ม.1–ม.6)
                        </td>
                        <td className="border border-slate-600 py-2 font-mono">
                          {academicSummary.registeredCredits.toFixed(1)}
                        </td>
                        <td colSpan={2} className="border border-slate-600 py-2 px-2 text-right font-mono">
                          หน่วยกิตที่ได้: {academicSummary.earnedCredits.toFixed(1)}
                        </td>
                        <td colSpan={2} className="border border-slate-600 py-2 px-3 text-right font-mono text-sm">
                          GPA: {academicSummary.termGpa} | GPAX: {academicSummary.gpax}
                        </td>
                      </>
                    )}
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
                    <th className="border border-slate-600 px-2 py-1.5 text-center w-28">ผลการประเมิน</th>
                  </tr>
                </thead>
                <tbody>
                  {MOE_ATTRIBUTES.map((attr, idx) => {
                    const val = attributeRatings[idx] || 'ดีเยี่ยม (๓)';
                    return (
                      <tr key={attr}>
                        <td className="border border-slate-400 px-2.5 py-1">{attr}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center font-semibold text-emerald-800">
                          <span className="hidden print:inline">{val}</span>
                          <select
                            value={val}
                            onChange={(e) => setAttributeRatings((prev) => ({ ...prev, [idx]: e.target.value }))}
                            className="print:hidden w-full bg-transparent text-center font-semibold text-emerald-800 focus:outline-none cursor-pointer"
                          >
                            <option value="ดีเยี่ยม (๓)">ดีเยี่ยม (๓)</option>
                            <option value="ดี (๒)">ดี (๒)</option>
                            <option value="ผ่าน (๑)">ผ่าน (๑)</option>
                            <option value="ไม่ผ่าน (๐)">ไม่ผ่าน (๐)</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-600 px-2.5 py-1.5">สรุปผลการประเมินคุณลักษณะอันพึงประสงค์</td>
                    <td className="border border-slate-600 px-2 py-1.5 text-center text-emerald-900">
                      {Object.values(attributeRatings).some((v) => v === 'ไม่ผ่าน (๐)')
                        ? 'ไม่ผ่าน (๐)'
                        : Object.values(attributeRatings).some((v) => v === 'ผ่าน (๑)')
                        ? 'ผ่าน (๑)'
                        : Object.values(attributeRatings).some((v) => v === 'ดี (๒)')
                        ? 'ดี (๒)'
                        : 'ดีเยี่ยม (๓)'}
                    </td>
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
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-24">ผลการเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOE_ACTIVITIES.map((act, idx) => {
                      const val = activityRatings[idx] || act.result;
                      return (
                        <tr key={act.name}>
                          <td className="border border-slate-400 px-2.5 py-1.5">{act.name}</td>
                          <td className="border border-slate-400 px-2 py-1.5 text-center font-mono">{act.hours}</td>
                          <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">
                            <span className="hidden print:inline">{val}</span>
                            <select
                              value={val}
                              onChange={(e) => setActivityRatings((prev) => ({ ...prev, [idx]: e.target.value }))}
                              className="print:hidden w-full bg-transparent text-center font-bold text-emerald-800 focus:outline-none cursor-pointer"
                            >
                              <option value="ผ (ผ่าน)">ผ (ผ่าน)</option>
                              <option value="มผ (ไม่ผ่าน)">มผ (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <table className="w-full text-xs border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-600 px-2.5 py-1.5 text-left">การประเมินสมรรถนะและการอ่านคิดวิเคราะห์</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-28">ระดับคุณภาพ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 px-2.5 py-1.5">การอ่าน คิดวิเคราะห์ และเขียน</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">
                        <span className="hidden print:inline">{readingRating}</span>
                        <select
                          value={readingRating}
                          onChange={(e) => setReadingRating(e.target.value)}
                          className="print:hidden w-full bg-transparent text-center font-bold text-emerald-800 focus:outline-none cursor-pointer"
                        >
                          <option value="ดีเยี่ยม (๓)">ดีเยี่ยม (๓)</option>
                          <option value="ดี (๒)">ดี (๒)</option>
                          <option value="ผ่าน (๑)">ผ่าน (๑)</option>
                          <option value="ไม่ผ่าน (๐)">ไม่ผ่าน (๐)</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 px-2.5 py-1.5">สมรรถนะสำคัญของผู้เรียน ๕ ประการ</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">
                        <span className="hidden print:inline">{competencyRating}</span>
                        <select
                          value={competencyRating}
                          onChange={(e) => setCompetencyRating(e.target.value)}
                          className="print:hidden w-full bg-transparent text-center font-bold text-emerald-800 focus:outline-none cursor-pointer"
                        >
                          <option value="ดีเยี่ยม (๓)">ดีเยี่ยม (๓)</option>
                          <option value="ดี (๒)">ดี (๒)</option>
                          <option value="ผ่าน (๑)">ผ่าน (๑)</option>
                          <option value="ไม่ผ่าน (๐)">ไม่ผ่าน (๐)</option>
                        </select>
                      </td>
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

            <div className="border border-slate-600 p-3 rounded space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-slate-900 block">ความคิดเห็นและข้อเสนอแนะของครูประจำชั้น:</label>
                <div className="print:hidden flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => generateSmartHomeroomComment('auto')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold cursor-pointer transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>ร่างอัตโนมัติจากข้อมูลจริง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => generateSmartHomeroomComment('praise')}
                    className="px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-semibold cursor-pointer transition"
                  >
                    ชมเชย/ส่งเสริม
                  </button>
                  <button
                    type="button"
                    onClick={() => generateSmartHomeroomComment('supportive')}
                    className="px-2 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold cursor-pointer transition"
                  >
                    ให้กำลังใจ/เฝ้าระวัง
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        void navigator.clipboard.writeText(homeroomComment);
                        setCommentCopied(true);
                        setTimeout(() => setCommentCopied(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer transition"
                  >
                    {commentCopied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{commentCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
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
