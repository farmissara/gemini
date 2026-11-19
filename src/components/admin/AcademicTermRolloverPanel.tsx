import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  History,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  AttendanceRecord,
  Course,
  GradeRecord,
  School,
  Student,
  SystemConfig,
  TimetableSlot,
  UserRole,
} from '../../types';
import {
  AcademicAutoPrefs,
  AcademicRolloverOptions,
  AcademicTermArchive,
  buildAcademicRolloverPayload,
  createAcademicTermArchive,
  deleteAcademicArchive,
  exportArchiveGradesCsv,
  exportArchiveJson,
  getRecommendedCurrentBuddhistYear,
  hydrateAcademicArchivesFromSupabase,
  loadAcademicArchives,
  loadAcademicAutoPrefs,
  saveAcademicAutoPrefs,
  suggestNextAcademicPeriod,
} from '../../lib/academicYearArchiveStore';
import { formatSemesterLabel, getSchoolSemesterOptions } from '../../lib/schoolSettings';

interface AcademicTermRolloverPanelProps {
  activeSchool: School;
  systemConfig: SystemConfig;
  currentRole: UserRole;
  actorName: string;
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  timetableSlots: TimetableSlot[];
  onApplyRollover: (payload: {
    academicYear: string;
    currentSemester: string;
    newCourses: Course[];
    newTimetableSlots: TimetableSlot[];
    promotedStudents?: Student[];
  }) => Promise<void>;
  onCopyCoursesFromArchive?: (coursesToAdd: Course[]) => void;
}

export const AcademicTermRolloverPanel: React.FC<AcademicTermRolloverPanelProps> = ({
  activeSchool,
  systemConfig,
  currentRole,
  actorName,
  students,
  courses,
  grades,
  attendance,
  timetableSlots,
  onApplyRollover,
  onCopyCoursesFromArchive,
}) => {
  const schoolId = activeSchool.id;
  const currentYear = activeSchool.academicYear || systemConfig.academicYear || '2569';
  const currentSemester = activeSchool.currentSemester || systemConfig.currentSemester || '1';
  const semesterOptions = useMemo(() => getSchoolSemesterOptions(activeSchool), [activeSchool]);
  const canManage = ['admin', 'super_admin'].includes(currentRole);

  const [archives, setArchives] = useState<AcademicTermArchive[]>(() => loadAcademicArchives(schoolId));
  const [autoPrefs, setAutoPrefs] = useState<AcademicAutoPrefs>(() => loadAcademicAutoPrefs(schoolId));
  const [archiveNote, setArchiveNote] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Rollover Wizard state
  const [showRolloverWizard, setShowRolloverWizard] = useState(false);
  const suggestions = useMemo(
    () => suggestNextAcademicPeriod(currentYear, currentSemester, semesterOptions),
    [currentYear, currentSemester, semesterOptions]
  );
  const recommendedBuddhistYear = useMemo(() => getRecommendedCurrentBuddhistYear(), []);
  const yearBehindCalendar =
    Number.isFinite(Number(currentYear)) &&
    Number.isFinite(Number(recommendedBuddhistYear)) &&
    Number(recommendedBuddhistYear) > Number(currentYear);

  const [rolloverMode, setRolloverMode] = useState<'next_term' | 'next_year' | 'custom'>('next_term');
  const [targetYear, setTargetYear] = useState(suggestions.nextTerm.academicYear);
  const [targetSemester, setTargetSemester] = useState(suggestions.nextTerm.semester);
  const [archiveCurrentFirst, setArchiveCurrentFirst] = useState(autoPrefs.autoArchiveBeforeRollover);
  const [copyCourses, setCopyCourses] = useState(true);
  const [copyCourseEnrollments, setCopyCourseEnrollments] = useState(true);
  const [copyIndicators, setCopyIndicators] = useState(true);
  const [copyTimetable, setCopyTimetable] = useState(true);
  const [promoteStudents, setPromoteStudents] = useState(false);

  // Archive Inspector & Delete Confirm
  const [inspectArchive, setInspectArchive] = useState<AcademicTermArchive | null>(null);
  const [inspectTab, setInspectTab] = useState<'courses' | 'grades' | 'students'>('courses');
  const [inspectSearch, setInspectSearch] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setArchives(loadAcademicArchives(schoolId));
    setAutoPrefs(loadAcademicAutoPrefs(schoolId));
    void hydrateAcademicArchivesFromSupabase(schoolId).then((loaded) => {
      setArchives(loaded);
    });
  }, [schoolId]);

  useEffect(() => {
    if (rolloverMode === 'next_term') {
      setTargetYear(suggestions.nextTerm.academicYear);
      setTargetSemester(suggestions.nextTerm.semester);
      setPromoteStudents(suggestions.nextTerm.isNewYear);
    } else if (rolloverMode === 'next_year') {
      setTargetYear(suggestions.nextYear.academicYear);
      setTargetSemester(suggestions.nextYear.semester);
      setPromoteStudents(true);
    }
  }, [rolloverMode, suggestions]);

  const currentTermCourses = useMemo(() => {
    const matches = courses.filter(
      (c) =>
        (!c.schoolId || c.schoolId === schoolId) &&
        (!c.academicYear || c.academicYear === currentYear) &&
        (!c.semester || c.semester === currentSemester)
    );
    return matches.length > 0 ? matches : courses.filter((c) => !c.schoolId || c.schoolId === schoolId);
  }, [courses, schoolId, currentYear, currentSemester]);

  const currentTermGradesCount = useMemo(() => {
    const courseIds = new Set(currentTermCourses.map((c) => c.id));
    return grades.filter(
      (g) =>
        (!g.schoolId || g.schoolId === schoolId) &&
        (courseIds.has(g.courseId) ||
          (g.academicYear === currentYear && g.semester === currentSemester))
    ).length;
  }, [grades, currentTermCourses, schoolId, currentYear, currentSemester]);

  const handleToggleAutoPref = (field: keyof Pick<AcademicAutoPrefs, 'autoRemindNewAcademicYear' | 'autoArchiveBeforeRollover'>) => {
    const next: AcademicAutoPrefs = {
      ...autoPrefs,
      [field]: !autoPrefs[field],
    };
    setAutoPrefs(next);
    saveAcademicAutoPrefs(schoolId, next);
    if (field === 'autoArchiveBeforeRollover') {
      setArchiveCurrentFirst(next.autoArchiveBeforeRollover);
    }
  };

  const handleSaveSnapshotNow = async () => {
    if (!canManage) return;
    setIsWorking(true);
    setStatusNotice(null);
    try {
      const { archive, syncedToSupabase } = await createAcademicTermArchive({
        schoolId,
        academicYear: currentYear,
        semester: currentSemester,
        archivedBy: actorName || 'ผู้ดูแลระบบ',
        note: archiveNote || `บันทึกย้อนหลัง ปีการศึกษา ${currentYear} ${formatSemesterLabel(currentSemester)}`,
        students,
        courses,
        grades,
        attendance,
        timetableSlots,
      });
      setArchives((prev) => [archive, ...prev.filter((a) => a.id !== archive.id)]);
      setArchiveNote('');
      setStatusNotice({
        type: 'success',
        message: `บันทึกคลังข้อมูลย้อนหลัง ปีการศึกษา ${currentYear} ${formatSemesterLabel(currentSemester)} เรียบร้อยแล้ว (${
          syncedToSupabase ? 'ซิงค์ขึ้น Cloud แล้ว' : 'เก็บในระบบพร้อมดูย้อนหลัง'
        })`,
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลย้อนหลังได้',
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleExecuteRollover = async () => {
    if (!canManage) return;
    const cleanToYear = targetYear.trim();
    const cleanToSem = targetSemester.trim();
    if (!cleanToYear || !cleanToSem) {
      setStatusNotice({ type: 'error', message: 'กรุณาระบุปีการศึกษาและภาคเรียนใหม่ให้ครบถ้วน' });
      return;
    }
    if (cleanToYear === currentYear && cleanToSem === currentSemester) {
      setStatusNotice({
        type: 'error',
        message: 'ปีการศึกษาและภาคเรียนใหม่ตรงกับภาคเรียนปัจจุบัน กรุณาเลือกภาคเรียนหรือปีถัดไป',
      });
      return;
    }

    setIsWorking(true);
    setStatusNotice(null);
    try {
      if (archiveCurrentFirst) {
        const { archive } = await createAcademicTermArchive({
          schoolId,
          academicYear: currentYear,
          semester: currentSemester,
          archivedBy: actorName || 'ผู้ดูแลระบบ',
          note:
            archiveNote.trim() ||
            `บันทึกอัตโนมัติก่อนปรับสู่ ปีการศึกษา ${cleanToYear} ${formatSemesterLabel(cleanToSem)}`,
          students,
          courses,
          grades,
          attendance,
          timetableSlots,
        });
        setArchives((prev) => [archive, ...prev.filter((a) => a.id !== archive.id)]);
      }

      const options: AcademicRolloverOptions = {
        fromYear: currentYear,
        fromSemester: currentSemester,
        toYear: cleanToYear,
        toSemester: cleanToSem,
        archiveCurrentFirst,
        archiveNote: archiveNote.trim(),
        copyCourses,
        copyCourseEnrollments,
        copyIndicators,
        copyTimetable,
        promoteStudents,
      };

      const built = await buildAcademicRolloverPayload({
        schoolId,
        options,
        courses,
        timetableSlots,
        students,
      });

      await onApplyRollover({
        academicYear: cleanToYear,
        currentSemester: cleanToSem,
        newCourses: built.newCourses,
        newTimetableSlots: built.newTimetableSlots,
        promotedStudents: built.promotedStudents,
      });

      setShowRolloverWizard(false);
      setArchiveNote('');
      setStatusNotice({
        type: 'success',
        message: `เริ่ม ${formatSemesterLabel(cleanToSem)} ปีการศึกษา ${cleanToYear} สำเร็จ! (คัดลอกรายวิชา ${
          built.newCourses.length
        } วิชา · ตัวชี้วัด ${built.copiedIndicatorsCount} ชุด · ตารางสอน ${
          built.newTimetableSlots.length
        } คาบ${built.promotedStudents ? ' · เลื่อนชั้นเรียนนักเรียนแล้ว' : ''})`,
      });
    } catch (err) {
      setStatusNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'ไม่สามารถเริ่มภาคเรียน/ปีการศึกษาใหม่ได้',
      });
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopyArchiveCoursesToCurrent = (archive: AcademicTermArchive) => {
    if (!onCopyCoursesFromArchive || archive.coursesSnapshot.length === 0) return;
    const stamp = Date.now().toString(36);
    const existingKeys = new Set(
      currentTermCourses.map((c) => `${c.code.trim().toLowerCase()}::${c.room.trim().toLowerCase()}`)
    );
    const toAdd: Course[] = archive.coursesSnapshot
      .filter((c) => !existingKeys.has(`${c.code.trim().toLowerCase()}::${c.room.trim().toLowerCase()}`))
      .map((c, idx) => ({
        ...c,
        id: `crs-${currentYear}-${currentSemester}-${stamp}-${idx + 1}`,
        schoolId,
        academicYear: currentYear,
        semester: currentSemester,
      }));
    if (toAdd.length === 0) {
      setStatusNotice({
        type: 'error',
        message: 'รายวิชาจากคลังปีนี้มีอยู่ครบแล้วในภาคเรียนปัจจุบัน',
      });
      return;
    }
    onCopyCoursesFromArchive(toAdd);
    setStatusNotice({
      type: 'success',
      message: `คัดลอกรายวิชา ${toAdd.length} วิชา จากปี ${archive.academicYear}/${archive.semester} มาใช้ในเทอมปัจจุบัน (${currentYear}/${currentSemester}) แล้ว`,
    });
  };

  const handleConfirmDeleteArchive = async () => {
    if (!pendingDeleteId) return;
    const updated = await deleteAcademicArchive(schoolId, pendingDeleteId);
    setArchives(updated);
    if (inspectArchive?.id === pendingDeleteId) setInspectArchive(null);
    setPendingDeleteId(null);
    setStatusNotice({ type: 'success', message: 'ลบข้อมูลคลังประวัติที่เลือกเรียบร้อยแล้ว' });
  };

  return (
    <section className="bg-[var(--color-card)] rounded-2xl p-5 sm:p-6 border border-[var(--color-border)] shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-title)]">
              บันทึกข้อมูลปีการศึกษาเก่า &amp; เริ่มภาคเรียน / ปีการศึกษาใหม่อัตโนมัติ
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              สถานะปัจจุบัน: ปีการศึกษา <strong className="font-mono text-[var(--color-text-title)]">{currentYear}</strong> ·{' '}
              <strong className="text-[var(--color-text-title)]">{formatSemesterLabel(currentSemester)}</strong> ·{' '}
              <span className="tabular-nums">
                {currentTermCourses.length} รายวิชา · {currentTermGradesCount} คะแนน · {students.length} นักเรียน
              </span>
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSnapshotNow}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>บันทึกเทอม/ปีนี้เก็บไว้ย้อนหลัง</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRolloverMode('next_term');
                setShowRolloverWizard((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>เริ่มเทอมใหม่ / ปีการศึกษาใหม่ (Auto Copy)</span>
            </button>
          </div>
        )}
      </div>

      {/* Auto-detect New Buddhist Academic Year Reminder */}
      {autoPrefs.autoRemindNewAcademicYear &&
        yearBehindCalendar &&
        autoPrefs.lastDismissedSuggestedYear !== recommendedBuddhistYear &&
        canManage && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-amber-950 dark:text-amber-100">
                ตรวจพบปฏิทินเข้าสู่ปีการศึกษา {recommendedBuddhistYear} แล้ว (ระบบยังอยู่ที่ปี {currentYear})
              </div>
              <div className="text-amber-800 dark:text-amber-300">
                สามารถกดเพื่อบันทึกปี {currentYear} เก็บเข้าคลังย้อนหลังและปรับขึ้นปีการศึกษา {recommendedBuddhistYear} พร้อมคัดลอกรายวิชา/ตัวชี้วัดอัตโนมัติได้ทันที
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRolloverMode('custom');
                  setTargetYear(recommendedBuddhistYear);
                  setTargetSemester(semesterOptions[0] || '1');
                  setPromoteStudents(true);
                  setShowRolloverWizard(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold cursor-pointer"
              >
                ปรับขึ้นปี {recommendedBuddhistYear} อัตโนมัติ
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...autoPrefs, lastDismissedSuggestedYear: recommendedBuddhistYear };
                  setAutoPrefs(next);
                  saveAcademicAutoPrefs(schoolId, next);
                }}
                className="p-1.5 rounded-lg text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
                title="ซ่อนคำแนะนำปีนี้"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* Feedback Banner */}
      {statusNotice && (
        <div
          className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 ${
            statusNotice.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {statusNotice.message}
          </span>
          <button type="button" onClick={() => setStatusNotice(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Automation Settings Strip */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-body)] bg-[var(--color-card-subtle)] rounded-xl px-3.5 py-2.5 border border-[var(--color-border)]">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPrefs.autoArchiveBeforeRollover}
            onChange={() => handleToggleAutoPref('autoArchiveBeforeRollover')}
            className="rounded"
          />
          <span>บันทึกข้อมูลปี/เทอมเก่าเก็บย้อนหลังอัตโนมัติทุกครั้งก่อนปรับปีการศึกษาใหม่</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPrefs.autoRemindNewAcademicYear}
            onChange={() => handleToggleAutoPref('autoRemindNewAcademicYear')}
            className="rounded"
          />
          <span>ตรวจจับและแนะนำการขึ้นปีการศึกษา พ.ศ. ใหม่อัตโนมัติตามปฏิทิน</span>
        </label>
      </div>

      {/* Rollover & Auto-Copy Wizard */}
      {showRolloverWizard && canManage && (
        <div className="rounded-2xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/25 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-sm text-[var(--color-text-title)] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>ตัวช่วยเริ่มภาคเรียนใหม่ / ปีการศึกษาใหม่ พร้อมคัดลอกโครงสร้างข้อมูล</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRolloverWizard(false)}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setRolloverMode('next_term')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rolloverMode === 'next_term'
                  ? 'border-indigo-600 bg-[var(--color-card)] shadow-xs ring-1 ring-indigo-500/30'
                  : 'border-[var(--color-border)] bg-[var(--color-card)]/70 hover:bg-[var(--color-card)]'
              }`}
            >
              <div className="font-bold text-[var(--color-text-title)]">1. ขึ้นภาคเรียนถัดไปอัตโนมัติ</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{suggestions.nextTerm.label}</div>
            </button>
            <button
              type="button"
              onClick={() => setRolloverMode('next_year')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rolloverMode === 'next_year'
                  ? 'border-indigo-600 bg-[var(--color-card)] shadow-xs ring-1 ring-indigo-500/30'
                  : 'border-[var(--color-border)] bg-[var(--color-card)]/70 hover:bg-[var(--color-card)]'
              }`}
            >
              <div className="font-bold text-[var(--color-text-title)]">2. ขึ้นปีการศึกษาใหม่ (+1 ปี พ.ศ.)</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{suggestions.nextYear.label}</div>
            </button>
            <button
              type="button"
              onClick={() => setRolloverMode('custom')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                rolloverMode === 'custom'
                  ? 'border-indigo-600 bg-[var(--color-card)] shadow-xs ring-1 ring-indigo-500/30'
                  : 'border-[var(--color-border)] bg-[var(--color-card)]/70 hover:bg-[var(--color-card)]'
              }`}
            >
              <div className="font-bold text-[var(--color-text-title)]">3. กำหนดปี/เทอมปลายทางเอง</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">เลือกปี พ.ศ. และภาคเรียนตามต้องการ</div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)] block">ปีการศึกษาใหม่</span>
              <input
                type="text"
                value={targetYear}
                onChange={(e) => {
                  setRolloverMode('custom');
                  setTargetYear(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] font-mono font-bold"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)] block">ภาคเรียนใหม่</span>
              <select
                value={targetSemester}
                onChange={(e) => {
                  setRolloverMode('custom');
                  setTargetSemester(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] font-semibold"
              >
                {[...new Set([...semesterOptions, targetSemester])].map((sem) => (
                  <option key={sem} value={sem}>
                    {formatSemesterLabel(sem)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-[var(--color-text-body)] block">หมายเหตุการปิดเทอมเก่า (ถ้ามี)</span>
              <input
                type="text"
                value={archiveNote}
                onChange={(e) => setArchiveNote(e.target.value)}
                placeholder="เช่น ปิดภาคเรียน 1/2569 ครบถ้วน"
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
              />
            </label>
          </div>

          {/* Copy Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-[var(--color-card)] rounded-xl p-3.5 border border-[var(--color-border)]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={archiveCurrentFirst}
                onChange={(e) => setArchiveCurrentFirst(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                <strong className="block text-[var(--color-text-title)]">บันทึกข้อมูล {currentYear}/{currentSemester} เข้าคลังย้อนหลังก่อนเปลี่ยน</strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">เก็บเกรด วิชา รายชื่อเด็ก และตัวชี้วัดไว้ตรวจสอบ/ส่งออกได้ตลอด</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copyCourses}
                onChange={(e) => setCopyCourses(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                <strong className="block text-[var(--color-text-title)]">Copy รายวิชาจากเทอมเดิมมาเทอมใหม่ ({currentTermCourses.length} วิชา)</strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">สร้างรายวิชาชุดใหม่ให้ปี/เทอมใหม่โดยไม่ทับเกรดปีเก่า</span>
              </span>
            </label>
            <label className={`flex items-start gap-2 ${copyCourses ? 'cursor-pointer' : 'opacity-50'}`}>
              <input
                type="checkbox"
                checked={copyCourseEnrollments}
                disabled={!copyCourses}
                onChange={(e) => setCopyCourseEnrollments(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                <strong className="block text-[var(--color-text-title)]">Copy รายชื่อนักเรียนที่ลงทะเบียนในแต่ละวิชา</strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">พร้อมเริ่มกรอกคะแนนในเทอมใหม่ได้ทันที</span>
              </span>
            </label>
            <label className={`flex items-start gap-2 ${copyCourses ? 'cursor-pointer' : 'opacity-50'}`}>
              <input
                type="checkbox"
                checked={copyIndicators}
                disabled={!copyCourses}
                onChange={(e) => setCopyIndicators(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                <strong className="block text-[var(--color-text-title)]">Copy ชุดตัวชี้วัดมาตรฐาน สพฐ. ของทุกรายวิชา</strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">นำเกณฑ์ตัวชี้วัดระหว่างทาง–ปลายทางมาใช้ต่อทันที</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copyTimetable}
                onChange={(e) => setCopyTimetable(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                <strong className="block text-[var(--color-text-title)]">Copy ตารางสอนไปยังภาคเรียน/ปีใหม่</strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">เชื่อมคาบสอนเข้ากับรายวิชาชุดใหม่ให้อัตโนมัติ</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={promoteStudents}
                onChange={(e) => setPromoteStudents(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                <strong className="block text-[var(--color-text-title)]">เลื่อนระดับชั้นนักเรียนอัตโนมัติ (+1 ชั้นปี / จบ ป.6, ม.3, ม.6)</strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">แนะนำเปิดเฉพาะเมื่อขึ้นปีการศึกษาใหม่</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-xs text-[var(--color-text-muted)]">
              จาก <strong>{currentYear}/{currentSemester}</strong> <ArrowRight className="inline w-3.5 h-3.5 mx-1" />{' '}
              <strong className="text-indigo-700 dark:text-indigo-300">
                {targetYear}/{targetSemester}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRolloverWizard(false)}
                className="px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteRollover}
                disabled={isWorking}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{isWorking ? 'กำลังประมวลผล...' : 'ยืนยันบันทึกและเริ่มเทอม/ปีการศึกษาใหม่'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Archive Delete Confirmation */}
      {pendingDeleteId && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-rose-900 dark:text-rose-100">
            ยืนยันลบคลังประวัติปีการศึกษานี้? (ข้อมูลภาคเรียนปัจจุบันไม่ได้รับผลกระทบ)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteArchive}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              ยืนยันลบ
            </button>
          </div>
        </div>
      )}

      {/* Historical Archives List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            <span>คลังบันทึกปีการศึกษา / ภาคเรียนย้อนหลัง ({archives.length} รายการ)</span>
          </h4>
        </div>

        {archives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
            ยังไม่มีบันทึกย้อนหลัง กดปุ่ม &quot;บันทึกเทอม/ปีนี้เก็บไว้ย้อนหลัง&quot; ด้านบนเพื่อสร้างจุดบันทึกแรกได้ทันที
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] overflow-hidden">
            {archives.map((arch) => (
              <div
                key={arch.id}
                className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-[var(--color-card)] transition"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[var(--color-text-title)] tabular-nums">
                      ปีการศึกษา {arch.academicYear} · {formatSemesterLabel(arch.semester)}
                    </span>
                    <span className="text-[var(--color-text-muted)]">·</span>
                    <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      บันทึกเมื่อ {new Date(arch.archivedAt).toLocaleString('th-TH')} โดย {arch.archivedBy}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--color-text-body)] tabular-nums">
                    นักเรียน {arch.summary.studentCount} คน · รายวิชา {arch.summary.courseCount} วิชา · คะแนน/เกรด{' '}
                    {arch.summary.gradeCount} รายการ · เกรดเฉลี่ยรวม {arch.summary.avgGpa.toFixed(2)} · เวลาเรียน{' '}
                    {arch.summary.attendanceRatePct}%
                    {arch.note ? ` · หมายเหตุ: ${arch.note}` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectArchive(arch);
                      setInspectTab('courses');
                      setInspectSearch('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูย้อนหลัง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportArchiveGradesCsv(arch)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold cursor-pointer"
                    title="ส่งออกคะแนนย้อนหลังเป็น CSV (Excel)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportArchiveJson(arch)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-sky-50 dark:hover:bg-sky-950/30 font-semibold cursor-pointer"
                    title="ดาวน์โหลดไฟล์สำรองข้อมูลเต็มรูปแบบ JSON"
                  >
                    <FileJson className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                    <span>JSON</span>
                  </button>
                  {canManage && onCopyCoursesFromArchive && (
                    <button
                      type="button"
                      onClick={() => handleCopyArchiveCoursesToCurrent(arch)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold cursor-pointer"
                      title="คัดลอกรายวิชาจากปีนี้มาใช้ในภาคเรียนปัจจุบัน"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                      <span>Copy วิชา</span>
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(arch.id)}
                      className="p-1.5 rounded-lg border border-[var(--color-border)] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="ลบประวัติชุดนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Archive Inspector Modal */}
      {inspectArchive && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-5xl max-h-[90vh] bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-title)]">
                  ข้อมูลย้อนหลัง: ปีการศึกษา {inspectArchive.academicYear} · {formatSemesterLabel(inspectArchive.semester)}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  บันทึกเมื่อ {new Date(inspectArchive.archivedAt).toLocaleString('th-TH')} ·{' '}
                  {inspectArchive.summary.studentCount} นักเรียน · {inspectArchive.summary.courseCount} รายวิชา ·{' '}
                  {inspectArchive.summary.gradeCount} ผลการเรียน
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportArchiveGradesCsv(inspectArchive)}
                  className="btn-action-success px-3 py-1.5 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> ส่งออก Excel CSV
                </button>
                <button
                  type="button"
                  onClick={() => setInspectArchive(null)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-card)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="seg-tab-group">
                <button
                  type="button"
                  data-active={inspectTab === 'courses'}
                  onClick={() => setInspectTab('courses')}
                  className="seg-tab-btn px-3 py-1"
                >
                  <BookOpen className="w-3.5 h-3.5" /> รายวิชา ({inspectArchive.coursesSnapshot.length})
                </button>
                <button
                  type="button"
                  data-active={inspectTab === 'grades'}
                  onClick={() => setInspectTab('grades')}
                  className="seg-tab-btn px-3 py-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> ผลการเรียน ({inspectArchive.gradesSnapshot.length})
                </button>
                <button
                  type="button"
                  data-active={inspectTab === 'students'}
                  onClick={() => setInspectTab('students')}
                  className="seg-tab-btn px-3 py-1"
                >
                  <Users className="w-3.5 h-3.5" /> นักเรียน ({inspectArchive.studentsSnapshot.length})
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inspectSearch}
                  onChange={(e) => setInspectSearch(e.target.value)}
                  placeholder="ค้นหาชื่อเด็ก รหัส หรือรายวิชา..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] w-60"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-4 text-xs tabular-nums">
              {inspectTab === 'courses' && (
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-left font-bold">
                    <tr>
                      <th className="p-2.5">รหัสวิชา</th>
                      <th className="p-2.5">ชื่อรายวิชา</th>
                      <th className="p-2.5 text-center">หน่วยกิต</th>
                      <th className="p-2.5">ผู้สอน</th>
                      <th className="p-2.5">ห้อง</th>
                      <th className="p-2.5 text-center">นักเรียนที่ลงทะเบียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {inspectArchive.coursesSnapshot
                      .filter((c) => {
                        const q = inspectSearch.trim().toLowerCase();
                        return (
                          !q ||
                          c.code.toLowerCase().includes(q) ||
                          c.titleTh.toLowerCase().includes(q) ||
                          c.teacherName.toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-[var(--color-card-subtle)]">
                          <td className="p-2.5 font-mono font-bold">{c.code}</td>
                          <td className="p-2.5 font-semibold">{c.titleTh}</td>
                          <td className="p-2.5 text-center font-mono">{c.credits}</td>
                          <td className="p-2.5">{c.teacherName}</td>
                          <td className="p-2.5">{c.room}</td>
                          <td className="p-2.5 text-center font-mono">{(c.enrolledStudentIds || []).length} คน</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {inspectTab === 'grades' && (
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-left font-bold">
                    <tr>
                      <th className="p-2.5">นักเรียน</th>
                      <th className="p-2.5">รายวิชา</th>
                      <th className="p-2.5 text-center">เก็บ/งาน</th>
                      <th className="p-2.5 text-center">กลางภาค</th>
                      <th className="p-2.5 text-center">ปลายภาค</th>
                      <th className="p-2.5 text-center">รวม</th>
                      <th className="p-2.5 text-center">เกรด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {inspectArchive.gradesSnapshot
                      .filter((g) => {
                        const q = inspectSearch.trim().toLowerCase();
                        if (!q) return true;
                        const stu = inspectArchive.studentsSnapshot.find((s) => s.id === g.studentId);
                        const crs = inspectArchive.coursesSnapshot.find((c) => c.id === g.courseId);
                        return (
                          (stu && `${stu.studentIdNumber} ${stu.firstNameTh} ${stu.lastNameTh}`.toLowerCase().includes(q)) ||
                          (crs && `${crs.code} ${crs.titleTh}`.toLowerCase().includes(q))
                        );
                      })
                      .slice(0, 250)
                      .map((g) => {
                        const stu = inspectArchive.studentsSnapshot.find((s) => s.id === g.studentId);
                        const crs = inspectArchive.coursesSnapshot.find((c) => c.id === g.courseId);
                        return (
                          <tr key={g.id} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="p-2.5 font-semibold">
                              {stu ? `${stu.studentIdNumber} · ${stu.firstNameTh} ${stu.lastNameTh}` : g.studentId}
                            </td>
                            <td className="p-2.5">{crs ? `${crs.code} ${crs.titleTh}` : g.courseId}</td>
                            <td className="p-2.5 text-center font-mono">{(g.assignmentScore || 0) + (g.quizScore || 0)}</td>
                            <td className="p-2.5 text-center font-mono">{g.midtermScore}</td>
                            <td className="p-2.5 text-center font-mono">{g.finalScore}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{g.totalScore}</td>
                            <td className="p-2.5 text-center font-bold text-[var(--color-primary-text)]">{g.letterGrade}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {inspectTab === 'students' && (
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-left font-bold">
                    <tr>
                      <th className="p-2.5">รหัสนักเรียน</th>
                      <th className="p-2.5">ชื่อ-นามสกุล</th>
                      <th className="p-2.5">ระดับชั้น</th>
                      <th className="p-2.5">ห้อง</th>
                      <th className="p-2.5 text-center">GPA</th>
                      <th className="p-2.5 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {inspectArchive.studentsSnapshot
                      .filter((s) => {
                        const q = inspectSearch.trim().toLowerCase();
                        return (
                          !q ||
                          s.studentIdNumber.toLowerCase().includes(q) ||
                          `${s.firstNameTh} ${s.lastNameTh}`.toLowerCase().includes(q) ||
                          s.room.toLowerCase().includes(q)
                        );
                      })
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-[var(--color-card-subtle)]">
                          <td className="p-2.5 font-mono font-bold">{s.studentIdNumber}</td>
                          <td className="p-2.5 font-semibold">
                            {s.firstNameTh} {s.lastNameTh}
                          </td>
                          <td className="p-2.5">{s.gradeLevel}</td>
                          <td className="p-2.5">{s.room}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{Number(s.gpa || 0).toFixed(2)}</td>
                          <td className="p-2.5 text-center">{s.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
