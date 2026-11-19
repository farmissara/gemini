import React, { useEffect, useRef, useState } from 'react';
import { Student, Course, GradeRecord, SystemConfig, School } from '../../types';
import { formatSemesterLabel } from '../../lib/schoolSettings';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
} from '../../lib/moeGrading';
import {
  Award,
  CheckCircle2,
  Download,
  FileCheck2,
  Printer,
  RefreshCw,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  downloadMoeGradeSummaryPdf,
  printHtmlElementInIsolatedFrame,
} from '../../lib/moeReportPdf';
import { resolveMoeLearningArea } from '../../data/moeCurriculumStandards';
import {
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  summarizeStudentQualitative,
} from '../../lib/moeQualitativeStore';
import {
  getStudentRegistryRecord,
  loadSchoolRegistryMap,
  loadSchoolRegistrySigners,
  saveSchoolRegistrySigners,
  saveStudentRegistryAndQualitativeToDb,
} from '../../lib/studentRegistryStore';

interface ReportCardModalProps {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  school?: School;
  onClose: () => void;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  student,
  courses,
  grades,
  systemConfig,
  school,
  onClose,
}) => {
  const schoolId = school?.id || student.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';

  const getSyncedQualitativeDefaults = () => {
    const map = loadQualitativeAssessments(schoolId, academicYear, semester);
    const rec = getStudentQualitativeRecord(map, student.id);
    const sum = summarizeStudentQualitative(rec);
    return {
      readingRating: sum.readingLabel,
      attributeRating: sum.attrLabel,
      competencyRating: sum.compLabel,
      activityResult: sum.activityResult,
      homeroomRemark: rec.homeroomComment || '',
    };
  };

  const getSyncedRegistryDefaults = () => {
    const signers = loadSchoolRegistrySigners(schoolId);
    const registryMap = loadSchoolRegistryMap(schoolId);
    return getStudentRegistryRecord(registryMap, student, signers);
  };

  const initialQual = getSyncedQualitativeDefaults();
  const initialReg = getSyncedRegistryDefaults();
  const printRef = useRef<HTMLDivElement>(null);
  const [gradePage, setGradePage] = useState(0);
  const [advisorName, setAdvisorName] = useState(initialReg.advisorName || '');
  const [registrarName, setRegistrarName] = useState(initialReg.registrarName || '');
  const [principalName, setPrincipalName] = useState(initialReg.principalName || '');
  const [readingRating, setReadingRating] = useState(initialQual.readingRating);
  const [attributeRating, setAttributeRating] = useState(initialQual.attributeRating);
  const [competencyRating, setCompetencyRating] = useState(initialQual.competencyRating);
  const [activityResult, setActivityResult] = useState(initialQual.activityResult);
  const [homeroomRemark, setHomeroomRemark] = useState(initialQual.homeroomRemark);
  const [showMoeConfig, setShowMoeConfig] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingSigners, setIsSavingSigners] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const synced = getSyncedQualitativeDefaults();
    const syncedReg = getSyncedRegistryDefaults();
    setReadingRating(synced.readingRating);
    setAttributeRating(synced.attributeRating);
    setCompetencyRating(synced.competencyRating);
    setActivityResult(synced.activityResult);
    setHomeroomRemark(synced.homeroomRemark);
    setAdvisorName(syncedReg.advisorName || '');
    setRegistrarName(syncedReg.registrarName || '');
    setPrincipalName(syncedReg.principalName || '');
    setGradePage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, schoolId, academicYear, semester]);

  const handleSaveRegistrySignersAndComment = async () => {
    setIsSavingSigners(true);
    try {
      const currentSigners = loadSchoolRegistrySigners(schoolId);
      const nextSigners = {
        ...currentSigners,
        registrarName: registrarName.trim() || currentSigners.registrarName,
        principalName: principalName.trim() || currentSigners.principalName,
        updatedAt: new Date().toISOString(),
      };
      saveSchoolRegistrySigners(schoolId, nextSigners);

      const baseRecord = getSyncedRegistryDefaults();
      const qualMap = loadQualitativeAssessments(schoolId, academicYear, semester);
      const baseQual = getStudentQualitativeRecord(qualMap, student.id);

      await saveStudentRegistryAndQualitativeToDb({
        schoolId,
        studentId: student.id,
        academicYear,
        semester,
        registry: {
          ...baseRecord,
          advisorName: advisorName.trim(),
          registrarName: registrarName.trim(),
          principalName: principalName.trim(),
        },
        qualitative: {
          ...baseQual,
          homeroomComment: homeroomRemark.trim(),
        },
      });
      setPdfNotice({
        type: 'success',
        message: 'บันทึกรายชื่อผู้ลงนามและความเห็นครูที่ปรึกษาลงฐานข้อมูลทะเบียนนักเรียนแล้ว',
      });
    } catch {
      setPdfNotice({
        type: 'error',
        message: 'ไม่สามารถบันทึกข้อมูลผู้ลงนามได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSavingSigners(false);
    }
  };

  const handleResyncFromPp5Pp6 = () => {
    const synced = getSyncedQualitativeDefaults();
    setReadingRating(synced.readingRating);
    setAttributeRating(synced.attributeRating);
    setCompetencyRating(synced.competencyRating);
    setActivityResult(synced.activityResult);
    setHomeroomRemark(synced.homeroomRemark);
    setPdfNotice({
      type: 'success',
      message: 'ซิงค์ผลประเมินคุณลักษณะฯ การอ่านคิดวิเคราะห์เขียน สมรรถนะ และกิจกรรมจาก ปพ.๕/ปพ.๖ แล้ว',
    });
  };

  const summary = calculateStudentAcademicSummary({
    student,
    courses,
    grades,
    gradingSystem: systemConfig.gradingSystem,
    currentAcademicYear: systemConfig.academicYear,
    currentSemester: systemConfig.currentSemester,
  });

  const cycleGradeEntries = aggregateGradesByAssessmentCycle({
    student,
    courses,
    grades,
    gradingSystem: systemConfig.gradingSystem,
    currentAcademicYear: systemConfig.academicYear,
    currentSemester: systemConfig.currentSemester,
  });

  const hideGpa = summary.hideGpaCalculations;
  const termGPA = summary.hasRecordedGrades && summary.termGpa !== null ? summary.termGpa.toFixed(2) : '0.00';
  const cumulativeGPAX = summary.hasRecordedGrades && summary.gpax !== null ? summary.gpax.toFixed(2) : '0.00';
  const overallPrimaryFeedback = getRawScoreFeedback(summary.averageRawScore);
  const gradesPerPage = 8;
  const gradePageCount = Math.max(1, Math.ceil(cycleGradeEntries.length / gradesPerPage));
  const visibleEntries = cycleGradeEntries.slice(gradePage * gradesPerPage, (gradePage + 1) * gradesPerPage);
  const schoolNameEn = school?.nameEn || systemConfig.schoolNameEn || 'School';
  const schoolNameTh = school?.nameTh || systemConfig.schoolNameTh || 'สถานศึกษา';
  const issuedDateTh = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentYear = new Date().getFullYear();

  const handlePrint = () => {
    const html = printRef.current?.innerHTML || '';
    const title = summary.isPrimary
      ? `MOE_Primary_Report_${student.studentIdNumber}`
      : `MOE_Transcript_${student.studentIdNumber}`;
    printHtmlElementInIsolatedFrame(html, title);
  };

  const handleDownloadMoePdf = () => {
    setIsGeneratingPdf(true);
    setPdfNotice(null);
    try {
      const { fileName } = downloadMoeGradeSummaryPdf({
        student,
        courses,
        grades,
        systemConfig,
        school,
        advisorName,
        principalName,
        registrarName,
        readingRating,
        attributeRating,
        competencyRating,
        activityResult,
        homeroomRemark,
      });
      setPdfNotice({
        type: 'success',
        message: `สร้างและดาวน์โหลดไฟล์ PDF มาตรฐาน ศธ. เรียบร้อยแล้ว (${fileName})`,
      });
    } catch (err) {
      setPdfNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const moeRatingOptions = ['ดีเยี่ยม (๓)', 'ดี (๒)', 'ผ่าน (๑)', 'ไม่ผ่าน (๐)'];
  const moeActivityOptions = ['ผ (ผ่าน)', 'มผ (ไม่ผ่าน)'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Action Toolbar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">
                {summary.isPrimary
                  ? 'แบบรายงานผลการพัฒนาคุณภาพผู้เรียน (รายปี ป.1–ป.6)'
                  : 'Official Bilingual Transcript (ใบแสดงผลการเรียน ปพ.1)'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {getStudentShortPrefixTh(student)} {student.firstNameTh} {student.lastNameTh} • {student.studentIdNumber}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMoeConfig((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showMoeConfig
                  ? 'bg-sky-900/60 border-sky-500 text-sky-100'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>เกณฑ์ ศธ. &amp; ลงนาม</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMoePdf}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF (ศธ.)'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-700/30 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Status Notice & MOE Criteria Editor */}
        {pdfNotice && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 border-b print:hidden ${
              pdfNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {pdfNotice.message}
            </span>
            <button
              type="button"
              onClick={() => setPdfNotice(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showMoeConfig && (
          <div className="p-4 bg-slate-900 text-slate-100 border-b border-slate-800 space-y-3 text-xs print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5 text-sky-300">
                <FileCheck2 className="w-4 h-4" />
                กำหนดผลประเมินองค์ประกอบหลักสูตรแกนกลางฯ (ศธ.) และผู้ลงนาม (ดึงค่าจาก ปพ.๕ / ปพ.๖ อัตโนมัติ)
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveRegistrySignersAndComment}
                  disabled={isSavingSigners}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-[11px] font-semibold text-white whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3 h-3" />
                  <span>{isSavingSigners ? 'กำลังบันทึก...' : 'บันทึกลงฐานข้อมูลเด็ก'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResyncFromPp5Pp6}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ซิงค์จาก ปพ.๕/ปพ.๖</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoeConfig(false)}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  ซ่อนแผงตั้งค่า
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-300">การอ่าน คิดวิเคราะห์ และเขียน</span>
                <select
                  value={readingRating}
                  onChange={(e) => setReadingRating(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                >
                  {moeRatingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-300">คุณลักษณะอันพึงประสงค์ ๘ ประการ</span>
                <select
                  value={attributeRating}
                  onChange={(e) => setAttributeRating(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                >
                  {moeRatingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-300">สมรรถนะสำคัญของผู้เรียน ๕ ประการ</span>
                <select
                  value={competencyRating}
                  onChange={(e) => setCompetencyRating(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                >
                  {moeRatingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-300">กิจกรรมพัฒนาผู้เรียน</span>
                <select
                  value={activityResult}
                  onChange={(e) => setActivityResult(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                >
                  {moeActivityOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-300">ชื่อนายทะเบียน / งานวัดผล (ไม่บังคับ)</span>
                <input
                  type="text"
                  value={registrarName}
                  onChange={(e) => setRegistrarName(e.target.value)}
                  placeholder="เช่น นางสาวสุชาดา งานวัดผลและทะเบียน"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-300">ความเห็น / ข้อเสนอแนะครูที่ปรึกษา</span>
                <input
                  type="text"
                  value={homeroomRemark}
                  onChange={(e) => setHomeroomRemark(e.target.value)}
                  placeholder="เช่น มีความตั้งใจเรียนและรับผิดชอบงานดีเยี่ยม"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* Printable Document Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-white text-slate-900 font-sans print:p-0 print:m-0" ref={printRef}>
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {school?.logoUrl ? (
                  <img
                    src={school.logoUrl}
                    alt={schoolNameTh}
                    className="w-16 h-16 rounded-xl object-contain border border-slate-300 bg-white p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-indigo-900 text-amber-300 flex items-center justify-center font-bold text-lg border-2 border-amber-400 shadow">
                    {schoolNameEn.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-950">
                    {schoolNameEn}
                  </h1>
                  <h2 className="text-sm font-bold text-slate-700 font-thai">
                    {schoolNameTh}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {school?.province ? `${school.province} • ` : ''}
                    {school?.code ? `รหัสสถานศึกษา ${school.code} • ` : ''}
                    หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ฉบับปรับปรุง 2560)
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 font-mono text-xs font-bold rounded">
                  {summary.isPrimary ? 'ปพ.1 (ประเมินรายปี)' : 'ปพ.1 / TRANSCRIPT'}
                </span>
                <p className="text-[11px] text-slate-600 mt-1 font-mono">
                  {summary.isPrimary
                    ? `ปีการศึกษา ${systemConfig.academicYear} (รายปี)`
                    : `AY ${systemConfig.academicYear} | ${formatSemesterLabel(systemConfig.currentSemester)}`}
                </p>
                <p className="text-[10px] text-slate-600 font-mono">
                  Ref: TR-{student.studentIdNumber}-{currentYear}
                </p>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-bold text-slate-900">
                  {getStudentShortPrefixTh(student)} {student.firstNameTh} {student.lastNameTh}
                </span>
                <span className="text-[11px] text-slate-700 block">
                  {student.firstNameEn} {student.lastNameEn}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Student ID / National ID</span>
                <span className="font-mono font-bold text-indigo-700">{student.studentIdNumber}</span>
                <span className="text-[11px] text-slate-600 block font-mono">{student.nationalId || '-'}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Grade Level &amp; Room</span>
                <span className="font-semibold text-slate-900">{student.gradeLevel}</span>
                <span className="text-[11px] text-slate-600 block">
                  {student.room} • {getEducationStageLabelTh(summary.stage)}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-bold">Date of Birth &amp; Gender</span>
                <span className="font-semibold text-slate-900">{student.dateOfBirth || '-'}</span>
                <span className="text-[11px] text-slate-600 block capitalize">{student.gender}</span>
              </div>
            </div>
          </div>

          {/* Academic Table */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-4 border-indigo-700 pl-2">
                {summary.isPrimary
                  ? 'ผลการประเมินพัฒนาการและรายวิชา (รอบการประเมินรายปี • คะแนนดิบและร้อยละ)'
                  : 'Academic Performance Record (ผลการเรียนรายภาคเรียน)'}
              </h4>
              {summary.isPrimary && (
                <span className="text-[11px] font-semibold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                  {summary.isEarlyPrimary
                    ? 'ป.1–ป.3: รายงานผลด้วยคะแนนดิบ (เต็ม 100) / ร้อยละ (%) และระดับพัฒนาการรายปี (ไม่คำนวณ GPA)'
                    : 'ป.1–ป.6: ประเมินผลรายปีด้วยคะแนนดิบ (เต็ม 100) / ร้อยละ (%) (ไม่เน้น GPA)'}
                </span>
              )}
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-y border-slate-300">
                  <th className="py-2 px-2.5 font-bold">Course Code</th>
                  <th className="py-2 px-2.5 font-bold">Course Title (รายวิชา)</th>
                  <th className="py-2 px-2.5 text-center font-bold">{summary.isPrimary ? 'รอบประเมิน' : 'Credits'}</th>
                  <th className={`py-2 px-2.5 text-center font-bold ${summary.isPrimary ? 'bg-sky-50 text-sky-950' : ''}`}>
                    {summary.isPrimary ? 'คะแนนดิบ / 100 (%)' : 'Score (เต็ม 100 / %)'}
                  </th>
                  <th className="py-2 px-2.5 text-center font-bold">
                    {summary.isPrimary ? 'ระดับพัฒนาการ (Feedback)' : 'Grade (เกรด)'}
                  </th>
                  {!hideGpa && (
                    <th className="py-2 px-2.5 text-center font-bold">Grade Point</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cycleGradeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={hideGpa ? 5 : 6} className="py-6 text-center text-slate-600">
                      ยังไม่มีบันทึกผลการเรียนในรอบการประเมินนี้
                    </td>
                  </tr>
                ) : (
                  visibleEntries.map(({ grade, course, cycleLabelTh, resolved }) => {
                    if (!course) return null;
                    const rawFeedback = getRawScoreFeedback(grade.totalScore);
                    return (
                      <tr key={grade.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                          {course.code}
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-semibold text-slate-900">{course.titleTh}</div>
                          <div className="text-[11px] text-slate-600">
                            {course.titleEn}
                            <span className="ml-1.5 text-[10px] text-slate-500">
                              • {resolveMoeLearningArea(course).shortTh}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-800">
                          {summary.isPrimary
                            ? (resolved.isActivity ? 'กิจกรรม (รายปี)' : cycleLabelTh)
                            : (resolved.isActivity ? 'กิจกรรม' : course.credits <= 0 ? '-' : course.credits.toFixed(1))}
                        </td>
                        <td className={`py-2 px-2.5 text-center font-mono ${summary.isPrimary ? 'bg-sky-50/50' : ''}`}>
                          {summary.isPrimary ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-sm font-extrabold text-sky-900">
                                {grade.totalScore}% <span className="text-[11px] font-semibold text-slate-600">({grade.totalScore}/100)</span>
                              </span>
                              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${
                                    grade.totalScore >= 80
                                      ? 'bg-emerald-600'
                                      : grade.totalScore >= 60
                                      ? 'bg-sky-600'
                                      : grade.totalScore >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, grade.totalScore))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {grade.totalScore} ({grade.totalScore}%)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold">
                          {summary.isPrimary ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              {resolved.isSpecial ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${
                                  resolved.letter === 'ผ'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}>
                                  {resolved.letter}
                                </span>
                              ) : (
                                <>
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] border ${rawFeedback.badgeClass}`}>
                                    {rawFeedback.labelTh} ({rawFeedback.labelEn})
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    ผลรายปี ศธ.: {resolved.letter}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                              resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ'
                                ? 'bg-rose-100 text-rose-800'
                                : resolved.point >= 3.5 || resolved.letter === 'ผ'
                                ? 'bg-emerald-100 text-emerald-800'
                                : resolved.point >= 2.5
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {resolved.letter}
                            </span>
                          )}
                        </td>
                        {!hideGpa && (
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-900">
                            {resolved.isSpecial ? '-' : resolved.point.toFixed(1)}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {gradePageCount > 1 && (
              <div className="flex items-center justify-between gap-3 text-xs text-slate-700 print:hidden">
                <button type="button" onClick={() => setGradePage(page => Math.max(0, page - 1))} disabled={gradePage === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span className="font-medium">หน้า {gradePage + 1} / {gradePageCount} · {cycleGradeEntries.length} รายวิชา</span>
                <button type="button" onClick={() => setGradePage(page => Math.min(gradePageCount - 1, page + 1))} disabled={gradePage >= gradePageCount - 1} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-3 gap-4 text-center">
              {hideGpa ? (
                <>
                  <div>
                    <span className="text-[11px] text-slate-600 block uppercase font-semibold">
                      รอบประเมินรายปี (ป.1–ป.6)
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {summary.gradedSubjectCount} รายวิชา
                    </span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[11px] text-slate-600 block uppercase font-semibold">
                      คะแนนดิบเฉลี่ย (เต็ม 100 / %)
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-700">
                      {summary.averageRawScore !== null ? `${summary.averageRawScore}%` : '-'}
                    </span>
                    {summary.averageRawScore !== null && (
                      <span className="block text-[10px] text-slate-500 font-mono">
                        ({summary.averageRawScore} / 100 คะแนน)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-600 block uppercase font-semibold">
                      พัฒนาการภาพรวม (Feedback)
                    </span>
                    <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-sm font-bold border ${overallPrimaryFeedback.badgeClass}`}>
                      {overallPrimaryFeedback.labelTh} ({overallPrimaryFeedback.labelEn})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[11px] text-slate-600 block uppercase font-semibold">Total Credits Earned</span>
                    <span className="text-xl font-bold font-mono text-slate-900">{summary.earnedCredits.toFixed(1)}</span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[11px] text-slate-600 block uppercase font-semibold">Term Grade Point Average (GPA)</span>
                    <span className="text-xl font-extrabold font-mono text-indigo-700">{termGPA}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-600 block uppercase font-semibold">Cumulative GPAX (สะสม)</span>
                    <span className="text-xl font-extrabold font-mono text-emerald-700">{cumulativeGPAX}</span>
                  </div>
                </>
              )}
            </div>

            {/* Section 2: MOE Core Curriculum Qualitative Assessment */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-4 border-emerald-700 pl-2">
                ๒. สรุปผลการประเมินตามเกณฑ์มาตรฐานหลักสูตรแกนกลางฯ (ศธ.)
              </h4>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <tbody>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800">1. การอ่าน คิดวิเคราะห์ และเขียน</td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 w-36">{readingRating}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800">2. คุณลักษณะอันพึงประสงค์ ๘ ประการ</td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 w-36">{attributeRating}</td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800">3. สมรรถนะสำคัญของผู้เรียน ๕ ประการ</td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 w-36">{competencyRating}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800">4. กิจกรรมพัฒนาผู้เรียน (แนะแนว / ลูกเสือ-เนตรนารี / ชุมนุม / เพื่อสังคม)</td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 w-36">{activityResult}</td>
                  </tr>
                </tbody>
              </table>
              {homeroomRemark.trim() && (
                <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="font-bold">ความเห็นครูที่ปรึกษา:</span> {homeroomRemark.trim()}
                </p>
              )}
            </div>

            {/* Official Signatures & Seal */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="h-12 border-b border-dashed border-slate-400 mx-4"></div>
                <input
                  type="text"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  placeholder="(ระบุชื่อครูที่ปรึกษา...)"
                  className="print:hidden w-full text-center font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:outline-none focus:border-indigo-500 mt-1 text-xs"
                />
                <p className="hidden print:block font-bold text-slate-800 mt-2">
                  ({advisorName.trim() || '........................................'})
                </p>
                <p className="text-[11px] text-slate-600">ครูประจำชั้น / ครูที่ปรึกษา</p>
              </div>

              <div className="space-y-1">
                <div className="h-12 border-b border-dashed border-slate-400 mx-4"></div>
                <input
                  type="text"
                  value={registrarName}
                  onChange={(e) => setRegistrarName(e.target.value)}
                  placeholder="(งานวัดผลและทะเบียน...)"
                  className="print:hidden w-full text-center font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:outline-none focus:border-indigo-500 mt-1 text-xs"
                />
                <p className="hidden print:block font-bold text-slate-800 mt-2">
                  ({registrarName.trim() || 'งานวัดผลและทะเบียน'})
                </p>
                <p className="text-[11px] text-slate-600">นายทะเบียน • {issuedDateTh}</p>
              </div>

              <div className="space-y-1">
                <div className="h-12 border-b border-dashed border-slate-400 mx-4"></div>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="(ระบุชื่อผู้อำนวยการ...)"
                  className="print:hidden w-full text-center font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:outline-none focus:border-indigo-500 mt-1 text-xs"
                />
                <p className="hidden print:block font-bold text-slate-800 mt-2">
                  ({principalName.trim() || '........................................'})
                </p>
                <p className="text-[11px] text-slate-600">ผู้อำนวยการสถานศึกษา</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
