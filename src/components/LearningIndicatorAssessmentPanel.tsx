import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  Course,
  LearningIndicator,
  LearningIndicatorScore,
  LearningIndicatorSet,
  MoeStandardCatalogItem,
  School,
  Student,
  SystemConfig,
  UserRole,
} from '../types';
import {
  loadLearningIndicatorScores,
  loadLearningIndicatorSets,
  saveLearningIndicatorScores,
  saveLearningIndicatorSet,
} from '../lib/learningIndicatorStore';
import { loadMoeStandardCatalog } from '../lib/moeStandardCatalogStore';
import { createMoeScienceM3IndicatorSets } from '../data/moeScienceM3Indicators';
import {
  createObcUnitSetsForCourse,
  resolveMoeLearningArea,
} from '../data/moeCurriculumStandards';
import { getRawScoreFeedback, getStudentShortPrefixTh } from '../lib/moeGrading';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';

interface Props {
  course: Course;
  students: Student[];
  school?: School;
  systemConfig: SystemConfig;
  currentRole: UserRole;
  currentUserName?: string;
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const LearningIndicatorAssessmentPanel: React.FC<Props> = ({
  course,
  students,
  school,
  systemConfig,
  currentRole,
  currentUserName,
}) => {
  const schoolId = school?.id || course.schoolId || '';
  const learningArea = useMemo(() => resolveMoeLearningArea(course), [course]);
  const courseTypeLabel =
    course.category === 'core'
      ? 'รายวิชาพื้นฐาน'
      : course.category === 'activities'
      ? 'กิจกรรมพัฒนาผู้เรียน'
      : 'รายวิชาเพิ่มเติม';

  const [sets, setSets] = useState<LearningIndicatorSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [viewMode, setViewMode] = useState<'score_entry' | 'unit_summary'>('score_entry');
  const [scoresBySet, setScoresBySet] = useState<Record<string, LearningIndicatorScore[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [error, setError] = useState('');
  const [showSetForm, setShowSetForm] = useState(false);
  const [setTitle, setSetTitle] = useState('');
  const [standardCode, setStandardCode] = useState('');
  const [subjectArea, setSubjectArea] = useState(learningArea.nameTh);
  const [gradeLevel, setGradeLevel] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [indicatorDrafts, setIndicatorDrafts] = useState<Array<{ code: string; title: string; maxScore: number }>>([
    { code: '', title: '', maxScore: 5 },
  ]);
  const [catalogItems, setCatalogItems] = useState<MoeStandardCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const canEdit = ['super_admin', 'admin', 'teacher'].includes(currentRole);

  useEffect(() => {
    setSubjectArea(learningArea.nameTh);
  }, [learningArea.nameTh]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void loadLearningIndicatorSets({
      schoolId,
      courseId: course.id,
      academicYear: course.academicYear || systemConfig.academicYear,
      semester: course.semester || systemConfig.currentSemester,
    }).then(async (loaded) => {
      if (!mounted) return;
      setSets(loaded);
      setSelectedSetId((current) => (current && loaded.some((set) => set.id === current) ? current : loaded[0]?.id || ''));

      const scoreEntries = await Promise.all(
        loaded.map(async (s) => [s.id, await loadLearningIndicatorScores({ schoolId, setId: s.id })] as const)
      );
      if (mounted) {
        const nextMap: Record<string, LearningIndicatorScore[]> = {};
        scoreEntries.forEach(([id, list]) => {
          nextMap[id] = list;
        });
        setScoresBySet(nextMap);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [schoolId, course.id, course.academicYear, course.semester, systemConfig.academicYear, systemConfig.currentSemester]);

  useEffect(() => {
    let mounted = true;
    setCatalogLoading(true);
    const combined = `${course.titleTh} ${course.description} ${course.room} ${course.academicYear}`;
    const gradeMatch = combined.match(/(ป\.?([1-6]|[๑-๖])|ม\.?([1-6]|[๑-๖]))/);
    const matchedLevel = gradeMatch ? gradeMatch[0] : undefined;
    void loadMoeStandardCatalog({
      subjectArea: course.titleTh,
      gradeLevel: matchedLevel,
    }).then((items) => {
      if (mounted) setCatalogItems(items);
      setCatalogLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [course.titleTh, course.description, course.room, course.academicYear]);

  const selectedSet = useMemo(
    () => sets.find((set) => set.id === selectedSetId) || null,
    [sets, selectedSetId]
  );

  const scores = useMemo(
    () => (selectedSetId ? scoresBySet[selectedSetId] || [] : []),
    [scoresBySet, selectedSetId]
  );

  const roster = useMemo(() => {
    const enrolled = new Set(course.enrolledStudentIds || []);
    return students.filter((student) => enrolled.has(student.id));
  }, [students, course.enrolledStudentIds]);

  const createSet = async () => {
    const cleanTitle = setTitle.trim();
    const cleanIndicators = indicatorDrafts
      .map((item, index) => ({
        code: item.code.trim(),
        title: item.title.trim(),
        maxScore: Number(item.maxScore),
        sortOrder: index + 1,
      }))
      .filter((item) => item.title);
    if (!cleanTitle || cleanIndicators.length === 0) {
      setError('กรุณากรอกชื่อชุดตัวชี้วัดและตัวชี้วัดอย่างน้อย 1 รายการ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const setId = makeId('set');
      const indicators: LearningIndicator[] = cleanIndicators.map((item) => ({
        id: makeId('indicator'),
        schoolId,
        courseId: course.id,
        setId,
        code: item.code,
        title: item.title,
        maxScore: item.maxScore > 0 ? item.maxScore : 1,
        sortOrder: item.sortOrder,
        academicYear: course.academicYear || systemConfig.academicYear,
        semester: course.semester || systemConfig.currentSemester,
      }));
      const nextSet: LearningIndicatorSet = {
        id: setId,
        schoolId,
        courseId: course.id,
        title: cleanTitle,
        standardCode: standardCode.trim() || undefined,
        subjectArea: subjectArea.trim() || learningArea.nameTh,
        gradeLevel: gradeLevel.trim() || undefined,
        unitTitle: unitTitle.trim() || undefined,
        isTemplate,
        source: 'manual',
        academicYear: course.academicYear || systemConfig.academicYear,
        semester: course.semester || systemConfig.currentSemester,
        indicators,
        createdAt: now,
        updatedAt: now,
      };
      await saveLearningIndicatorSet(nextSet);
      setSets((current) => [...current, nextSet]);
      setSelectedSetId(setId);
      setSetTitle('');
      setStandardCode('');
      setGradeLevel('');
      setUnitTitle('');
      setIsTemplate(false);
      setIndicatorDrafts([{ code: '', title: '', maxScore: 5 }]);
      setShowSetForm(false);
      setSaveSuccess('สร้างหน่วยการเรียนรู้และชุดตัวชี้วัดเรียบร้อยแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกชุดตัวชี้วัดได้');
    } finally {
      setSaving(false);
    }
  };

  const importObecUnits1To3 = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess('');
    try {
      const year = course.academicYear || systemConfig.academicYear;
      const semester = course.semester || systemConfig.currentSemester;
      const unitSets = createObcUnitSetsForCourse({
        schoolId,
        course,
        academicYear: year,
        semester,
      });

      for (const nextSet of unitSets) {
        await saveLearningIndicatorSet(nextSet);
      }
      setSets((current) => {
        const existingIds = new Set(current.map((s) => s.id));
        return [...current, ...unitSets.filter((s) => !existingIds.has(s.id))];
      });
      setSelectedSetId(unitSets[0]?.id || '');
      setSaveSuccess(`นำเข้ามาตรฐานตัวชี้วัด หน่วยที่ 1–3 (${learningArea.shortTh}) ตามเกณฑ์ สพฐ. สำเร็จ`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าตัวชี้วัดหน่วยที่ 1–3 ได้');
    } finally {
      setSaving(false);
    }
  };

  const importMoeScienceM3Sets = async () => {
    setSaving(true);
    setError('');
    try {
      const year = course.academicYear || systemConfig.academicYear;
      const semester = course.semester || systemConfig.currentSemester;
      const standardSets = createMoeScienceM3IndicatorSets({
        schoolId,
        courseId: course.id,
        academicYear: year,
        semester,
      });

      for (const standardSet of standardSets) {
        await saveLearningIndicatorSet(standardSet);
      }

      setSets((current) => {
        const existingIds = new Set(current.map((set) => set.id));
        return [...current, ...standardSets.filter((set) => !existingIds.has(set.id))];
      });
      setSelectedSetId(standardSets[0]?.id || '');
      setSaveSuccess('นำเข้าตัวชี้วัดวิทยาศาสตร์ ม.3 (ว 1.3, ว 2.3, ว 3.1) เรียบร้อยแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าตัวชี้วัดมาตรฐาน สพฐ. ได้');
    } finally {
      setSaving(false);
    }
  };

  const applyMoeCatalogSet = async () => {
    if (catalogItems.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const year = course.academicYear || systemConfig.academicYear;
      const semester = course.semester || systemConfig.currentSemester;
      const grouped = new Map<string, MoeStandardCatalogItem[]>();
      catalogItems.forEach((item) => {
        const key = item.standardCode;
        grouped.set(key, [...(grouped.get(key) || []), item]);
      });

      const nextSets: LearningIndicatorSet[] = Array.from(grouped.entries()).map(([stdCode, items], groupIndex) => {
        const setId = `moe-${year}-${semester}-${stdCode.replace(/[^a-zA-Z0-9ก-๙]+/g, '-')}-${groupIndex + 1}`;
        const indicators: LearningIndicator[] = items.map((item, index) => ({
          id: `${setId}-${index + 1}`,
          schoolId,
          courseId: course.id,
          setId,
          code: item.indicatorCode,
          title: item.indicatorTitle,
          description: item.unitTitle || item.standardTitle,
          maxScore: item.maxScore,
          sortOrder: index + 1,
          academicYear: year,
          semester,
        }));
        return {
          id: setId,
          schoolId,
          courseId: course.id,
          title: `${items[0].standardTitle || items[0].subjectArea} (${stdCode})`,
          standardCode: stdCode,
          subjectArea: items[0].subjectArea,
          gradeLevel: items[0].gradeLevel,
          unitTitle: items[0].unitTitle,
          isTemplate: true,
          source: 'moe',
          academicYear: year,
          semester,
          indicators,
          createdAt: now,
          updatedAt: now,
        };
      });

      for (const nextSet of nextSets) {
        await saveLearningIndicatorSet(nextSet);
      }
      setSets((current) => {
        const ids = new Set(current.map((set) => set.id));
        return [...current, ...nextSets.filter((set) => !ids.has(set.id))];
      });
      setSelectedSetId(nextSets[0]?.id || '');
      setSaveSuccess('นำเข้าชุดตัวชี้วัดจากคลัง สพฐ. เรียบร้อยแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถใช้คลังตัวชี้วัด สพฐ. ได้');
    } finally {
      setSaving(false);
    }
  };

  const importIndicatorTemplateFromFile = async (file: File) => {
    setSaving(true);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const rows: unknown[][] = workbook.SheetNames.length
        ? (XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
            header: 1,
            defval: '',
            raw: false,
          }) as unknown[][])
        : [];

      const parsed = rows
        .slice(1)
        .map((row) => ({
          code: String(row[0] ?? '').trim(),
          title: String(row[2] ?? row[1] ?? '').trim(),
          maxScore: Number(row[3] ?? 5),
        }))
        .filter((item) => item.title);

      if (parsed.length === 0) {
        throw new Error('ไม่พบตัวชี้วัดในไฟล์ ต้องมีคอลัมน์ รหัสตัวชี้วัด / รหัสมาตรฐาน / ชื่อตัวชี้วัด / คะแนนเต็ม');
      }

      const now = new Date().toISOString();
      const setId = makeId('set');
      const year = course.academicYear || systemConfig.academicYear;
      const semester = course.semester || systemConfig.currentSemester;
      const indicators: LearningIndicator[] = parsed.map((item, index) => ({
        id: `${setId}-indicator-${index + 1}`,
        schoolId,
        courseId: course.id,
        setId,
        code: item.code,
        title: item.title,
        maxScore: Number.isFinite(item.maxScore) && item.maxScore > 0 ? item.maxScore : 5,
        sortOrder: index + 1,
        academicYear: year,
        semester,
      }));
      const nextSet: LearningIndicatorSet = {
        id: setId,
        schoolId,
        courseId: course.id,
        title: setTitle.trim() || `ชุดตัวชี้วัด ${course.titleTh}`,
        standardCode: standardCode.trim() || undefined,
        subjectArea: subjectArea.trim() || learningArea.nameTh,
        gradeLevel: gradeLevel.trim() || undefined,
        unitTitle: unitTitle.trim() || undefined,
        isTemplate,
        source: 'manual',
        academicYear: year,
        semester,
        indicators,
        createdAt: now,
        updatedAt: now,
      };

      await saveLearningIndicatorSet(nextSet);
      setSets((current) => [...current, nextSet]);
      setSelectedSetId(setId);
      setSetTitle('');
      setStandardCode('');
      setGradeLevel('');
      setUnitTitle('');
      setIsTemplate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าตัวชี้วัดจากไฟล์ได้');
    } finally {
      setSaving(false);
    }
  };

  const downloadIndicatorTemplate = () => {
    const rows = [
      ['รหัสตัวชี้วัด', 'รหัสมาตรฐาน', 'ชื่อตัวชี้วัด', 'คะแนนเต็ม'],
      ['ว 1.1 (1)', standardCode || 'ว 1.1', 'ตัวอย่างตัวชี้วัดมาตรฐาน สพฐ.', 5],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ตัวชี้วัด');
    XLSX.writeFile(workbook, `indicator_template_${course.code}.xlsx`);
  };

  const getScore = (studentId: string, indicatorId: string, setId = selectedSetId) =>
    (scoresBySet[setId] || []).find((item) => item.studentId === studentId && item.indicatorId === indicatorId);

  const updateScore = (studentId: string, indicator: LearningIndicator, rawValue: string) => {
    if (!selectedSet) return;
    if (rawValue === '') return;
    const score = Math.max(0, Math.min(indicator.maxScore, Number(rawValue)));
    if (!Number.isFinite(score)) return;
    setSaveSuccess('');
    setScoresBySet((prev) => {
      const current = prev[selectedSet.id] || [];
      const existing = current.find((item) => item.studentId === studentId && item.indicatorId === indicator.id);
      const now = new Date().toISOString();
      const next: LearningIndicatorScore = {
        id: existing?.id || makeId('score'),
        schoolId,
        setId: selectedSet.id,
        indicatorId: indicator.id,
        studentId,
        score,
        result: score >= indicator.maxScore * 0.5 ? 'pass' : 'not_pass',
        evidence: existing?.evidence,
        assessedBy: currentUserName,
        assessedAt: existing?.assessedAt || now,
        updatedAt: now,
      };
      return {
        ...prev,
        [selectedSet.id]: existing
          ? current.map((item) => (item.id === existing.id ? next : item))
          : [...current, next],
      };
    });
  };

  const fillFullScoresForSet = () => {
    if (!selectedSet || !canEdit || roster.length === 0) return;
    const now = new Date().toISOString();
    const nextList: LearningIndicatorScore[] = [];
    roster.forEach((student) => {
      selectedSet.indicators.forEach((ind) => {
        const existing = getScore(student.id, ind.id, selectedSet.id);
        nextList.push({
          id: existing?.id || makeId('score'),
          schoolId,
          setId: selectedSet.id,
          indicatorId: ind.id,
          studentId: student.id,
          score: existing ? existing.score : ind.maxScore,
          result: (existing ? existing.score : ind.maxScore) >= ind.maxScore * 0.5 ? 'pass' : 'not_pass',
          evidence: existing?.evidence,
          assessedBy: currentUserName,
          assessedAt: existing?.assessedAt || now,
          updatedAt: now,
        });
      });
    });
    setScoresBySet((prev) => ({ ...prev, [selectedSet.id]: nextList }));
    setSaveSuccess('เติมคะแนนเต็มในช่องที่ยังว่างเรียบร้อย (กด "บันทึกคะแนน" เพื่อยืนยัน)');
  };

  const saveScores = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess('');
    try {
      await saveLearningIndicatorScores(scores);
      setSaveSuccess(`บันทึกคะแนนตัวชี้วัด "${selectedSet?.title || ''}" สำเร็จ (${scores.length} รายการ)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกคะแนนตัวชี้วัดได้');
    } finally {
      setSaving(false);
    }
  };

  // Consolidated unit summary across all sets of this course
  const unitSummaryRows = useMemo(() => {
    return roster.map((student) => {
      let grandEarned = 0;
      let grandMax = 0;
      let passedIndicators = 0;
      let totalIndicators = 0;

      const perUnit = sets.map((set) => {
        const unitMax = set.indicators.reduce((sum, ind) => sum + ind.maxScore, 0);
        let unitEarned = 0;
        let unitPassed = 0;
        let hasAnyScore = false;

        set.indicators.forEach((ind) => {
          totalIndicators += 1;
          const sc = getScore(student.id, ind.id, set.id);
          if (sc) {
            hasAnyScore = true;
            unitEarned += sc.score;
            if (sc.score >= ind.maxScore * 0.5) {
              unitPassed += 1;
              passedIndicators += 1;
            }
          }
        });

        grandEarned += unitEarned;
        grandMax += unitMax;
        const unitPct = unitMax > 0 ? Math.round((unitEarned / unitMax) * 100) : 0;

        return {
          setId: set.id,
          earned: unitEarned,
          max: unitMax,
          pct: unitPct,
          hasAnyScore,
          passedCount: unitPassed,
          totalCount: set.indicators.length,
          passed: hasAnyScore && unitPct >= 50,
        };
      });

      const grandPct = grandMax > 0 ? Math.round((grandEarned / grandMax) * 100) : 0;
      const feedback = getRawScoreFeedback(grandMax > 0 ? grandPct : null);

      return {
        student,
        perUnit,
        grandEarned,
        grandMax,
        grandPct,
        passedIndicators,
        totalIndicators,
        feedback,
      };
    });
  }, [roster, sets, scoresBySet]);

  const exportUnitIndicatorsExcel = () => {
    if (sets.length === 0) return;
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ห้องเรียน',
      ...sets.map((s) => `${s.unitTitle || s.title} (เต็ม ${s.indicators.reduce((a, b) => a + b.maxScore, 0)})`),
      'คะแนนรวมตัวชี้วัด',
      'คะแนนเต็มรวม',
      'ร้อยละ (%)',
      'ตัวชี้วัดที่ผ่าน',
      'ผลการประเมินหน่วย',
    ];
    const rows = unitSummaryRows.map((row) => [
      row.student.studentIdNumber,
      `${getStudentShortPrefixTh(row.student)} ${row.student.firstNameTh} ${row.student.lastNameTh}`,
      row.student.room,
      ...row.perUnit.map((u) => (u.hasAnyScore ? u.earned : '-')),
      row.grandEarned,
      row.grandMax,
      `${row.grandPct}%`,
      `${row.passedIndicators}/${row.totalIndicators}`,
      row.feedback.labelTh,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ประเมินตัวชี้วัดรายหน่วย');
    XLSX.writeFile(wb, `คะแนนตามตัวชี้วัด_${course.code}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintPanel = () => {
    if (!printAreaRef.current) return;
    printHtmlElementInIsolatedFrame(
      printAreaRef.current.innerHTML,
      `รายงานคะแนนตามตัวชี้วัด_${course.code}`
    );
  };

  if (loading) return <div className="p-6 text-sm text-[var(--color-text-muted)]">กำลังโหลดตัวชี้วัดและหน่วยการเรียนรู้...</div>;

  return (
    <div className="space-y-3">
      {/* OBEC Learning Area & Unit Overview Header */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs text-[var(--color-text-muted)]">
            {learningArea.nameTh} · {courseTypeLabel} · รหัสวิชา <span className="font-mono font-semibold">{course.code}</span>
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-title)]">
            มาตรฐานตัวชี้วัด หน่วยการเรียนรู้ 1–3 และการประเมินหน่วยการเรียนรู้ ({course.titleTh})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="seg-tab-group text-xs">
            <button
              type="button"
              data-active={viewMode === 'score_entry'}
              onClick={() => setViewMode('score_entry')}
              className="seg-tab-btn px-3 py-1 text-xs"
            >
              บันทึกคะแนนรายตัวชี้วัด ({sets.length} หน่วย)
            </button>
            <button
              type="button"
              data-active={viewMode === 'unit_summary'}
              onClick={() => setViewMode('unit_summary')}
              className="seg-tab-btn px-3 py-1 text-xs"
            >
              ประเมินหน่วยการเรียนรู้ (หน่วย 1–{Math.max(3, sets.length)})
            </button>
          </div>

          {sets.length > 0 && (
            <>
              <button type="button" onClick={exportUnitIndicatorsExcel} className="btn-tool-tone px-2.5 py-1.5 text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ส่งออก Excel</span>
              </button>
              <button type="button" onClick={handlePrintPanel} className="btn-tool-tone px-2.5 py-1.5 text-xs">
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์รายงาน A4</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar: Unit Tabs, Quick OBEC Import & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {sets.map((set, index) => (
            <button
              key={set.id}
              type="button"
              onClick={() => {
                setSelectedSetId(set.id);
                setViewMode('score_entry');
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                selectedSetId === set.id && viewMode === 'score_entry'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
              }`}
            >
              {set.standardCode ? `${set.standardCode} · ` : `หน่วยที่ ${index + 1} · `}
              {set.title}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={importObecUnits1To3}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer transition disabled:opacity-60"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>นำเข้ามาตรฐานตัวชี้วัด หน่วย 1–3 ({learningArea.shortTh})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSetForm((prev) => !prev)}
                className="seg-tab-btn px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>สร้างหน่วย/ตัวชี้วัดเอง</span>
              </button>
            </>
          )}
          {selectedSet && viewMode === 'score_entry' && canEdit && (
            <>
              <button
                type="button"
                onClick={fillFullScoresForSet}
                className="seg-tab-btn px-2.5 text-xs"
                title="กรอกคะแนนเต็มให้ช่องที่ยังไม่ได้กรอก"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>เติมคะแนนเต็มช่องว่าง</span>
              </button>
              <button
                type="button"
                onClick={saveScores}
                disabled={saving}
                className="btn-action-primary px-3 py-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {showSetForm && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            <input
              value={setTitle}
              onChange={(event) => setSetTitle(event.target.value)}
              placeholder="ชื่อหน่วย/ชุดตัวชี้วัด เช่น หน่วยที่ 1..."
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={standardCode}
              onChange={(event) => setStandardCode(event.target.value)}
              placeholder="รหัสมาตรฐาน เช่น ว 1.1 / ค 1.3"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={subjectArea}
              onChange={(event) => setSubjectArea(event.target.value)}
              placeholder="กลุ่มสาระการเรียนรู้"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              placeholder="ระดับชั้น เช่น ป.6 / ม.3"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={unitTitle}
              onChange={(event) => setUnitTitle(event.target.value)}
              placeholder="ชื่อหน่วยการเรียนรู้ (เช่น หน่วยที่ 1 ...)"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs">
              <input
                type="checkbox"
                checked={isTemplate}
                onChange={(event) => setIsTemplate(event.target.checked)}
              />
              บันทึกเป็นชุดมาตรฐานที่ใช้ซ้ำได้
            </label>
          </div>
          {indicatorDrafts.map((draft, index) => (
            <div key={index} className="grid grid-cols-[100px_1fr_90px_36px] gap-2 text-xs">
              <input
                value={draft.code}
                onChange={(event) =>
                  setIndicatorDrafts((current) =>
                    current.map((item, i) => (i === index ? { ...item, code: event.target.value } : item))
                  )
                }
                placeholder="รหัสตัวชี้วัด"
                className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
              />
              <input
                value={draft.title}
                onChange={(event) =>
                  setIndicatorDrafts((current) =>
                    current.map((item, i) => (i === index ? { ...item, title: event.target.value } : item))
                  )
                }
                placeholder="คำอธิบายตัวชี้วัดตามหลักสูตรแกนกลางฯ"
                className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
              />
              <input
                type="number"
                min={1}
                value={draft.maxScore}
                onChange={(event) =>
                  setIndicatorDrafts((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, maxScore: Number(event.target.value) } : item
                    )
                  )
                }
                className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
              />
              <button
                type="button"
                aria-label="ลบตัวชี้วัด"
                onClick={() => setIndicatorDrafts((current) => current.filter((_, i) => i !== index))}
                className="p-2 text-rose-500 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIndicatorDrafts((current) => [...current, { code: '', title: '', maxScore: 5 }])}
              className="seg-tab-btn px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มตัวชี้วัด
            </button>
            <button type="button" onClick={createSet} disabled={saving} className="btn-action-primary px-3 text-xs">
              <Save className="w-3.5 h-3.5" /> บันทึกชุดตัวชี้วัด
            </button>
            <button type="button" onClick={downloadIndicatorTemplate} className="seg-tab-btn px-3 text-xs">
              <Download className="w-3.5 h-3.5" /> แม่แบบ Excel
            </button>
            <label className="seg-tab-btn px-3 text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5" /> นำเข้า Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importIndicatorTemplateFromFile(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Optional catalog quick import when empty or from Supabase catalog */}
      {canEdit && (sets.length === 0 || catalogItems.length > 0) && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-semibold text-[var(--color-text-title)]">
              คลังมาตรฐานตัวชี้วัด สพฐ. ({learningArea.nameTh})
            </div>
            <div className="text-[var(--color-text-muted)]">
              {catalogLoading
                ? 'กำลังตรวจสอบคลังตัวชี้วัดกลาง...'
                : catalogItems.length > 0
                ? `พบตัวชี้วัดกลางในระบบ ${catalogItems.length} รายการ`
                : 'สามารถกด "นำเข้ามาตรฐานตัวชี้วัด หน่วย 1–3" ด้านบน หรือนำเข้าชุด ว 1.3 / ว 2.3 / ว 3.1 สำหรับวิทยาศาสตร์ ม.3'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {catalogItems.length > 0 && (
              <button type="button" onClick={applyMoeCatalogSet} disabled={saving} className="seg-tab-btn px-3 text-xs">
                <Plus className="w-3.5 h-3.5" /> ใช้ตัวชี้วัดจากคลัง สพฐ.
              </button>
            )}
            {learningArea.id === 'science_tech' && (
              <button type="button" onClick={importMoeScienceM3Sets} disabled={saving} className="seg-tab-btn px-3 text-xs">
                <Plus className="w-3.5 h-3.5" /> ชุด ว 1.3 / ว 2.3 / ว 3.1 (ม.3)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Printable Body */}
      <div ref={printAreaRef} className="space-y-3">
        {/* Print-only formal header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-3 text-center">
          <p className="text-xs font-bold">แบบบันทึกคะแนนตามตัวชี้วัดและการประเมินหน่วยการเรียนรู้ (สพฐ.)</p>
          <h2 className="text-lg font-extrabold">โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}</h2>
          <p className="text-xs">
            รายวิชา {course.code} {course.titleTh} ({courseTypeLabel}) · {learningArea.nameTh} · ปีการศึกษา {systemConfig.academicYear}
          </p>
        </div>

        {viewMode === 'unit_summary' ? (
          sets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
              ยังไม่มีหน่วยการเรียนรู้ กรุณากดปุ่ม &quot;นำเข้ามาตรฐานตัวชี้วัด หน่วย 1–3&quot; ด้านบนเพื่อเริ่มต้น
            </div>
          ) : (
            <div className="space-y-3">
              {/* Unit cards overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {sets.map((s, idx) => {
                  const maxUnitScore = s.indicators.reduce((sum, ind) => sum + ind.maxScore, 0);
                  const formativeCount = s.indicators.filter((i) => (i.description || '').includes('ระหว่างทาง')).length;
                  const summativeCount = s.indicators.length - formativeCount;
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[var(--color-primary-text)]">
                          {s.standardCode || `หน่วยที่ ${idx + 1}`}
                        </span>
                        <span className="font-mono font-semibold text-[var(--color-text-muted)] tabular-nums">
                          เต็ม {maxUnitScore} คะแนน
                        </span>
                      </div>
                      <div className="font-semibold text-[var(--color-text-title)]">{s.unitTitle || s.title}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        {s.indicators.length} ตัวชี้วัด (ระหว่างทาง {formativeCount} · ปลายทาง {summativeCount})
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Per-Student Unit Evaluation Matrix */}
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                <table className="min-w-full text-xs border-collapse tabular-nums">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">ที่</th>
                      <th className="px-3 py-2.5 text-left min-w-[200px]">รหัส / ชื่อ-สกุล</th>
                      <th className="px-2 py-2.5 text-center">ห้อง</th>
                      {sets.map((s, idx) => {
                        const unitMax = s.indicators.reduce((sum, i) => sum + i.maxScore, 0);
                        return (
                          <th key={s.id} className="px-2.5 py-2 text-center min-w-[120px]">
                            <div>หน่วยที่ {idx + 1}</div>
                            <div className="text-[10px] font-normal text-[var(--color-text-muted)]">
                              {s.standardCode || ''} (เต็ม {unitMax})
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-2.5 py-2.5 text-center bg-amber-50/70 dark:bg-amber-950/30">รวมตัวชี้วัด</th>
                      <th className="px-2.5 py-2.5 text-center">ร้อยละ</th>
                      <th className="px-2.5 py-2.5 text-center">ผ่านตัวชี้วัด</th>
                      <th className="px-2.5 py-2.5 text-center">ผลการประเมินหน่วย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {unitSummaryRows.length === 0 ? (
                      <tr>
                        <td colSpan={sets.length + 7} className="py-6 text-center text-[var(--color-text-muted)]">
                          ไม่พบรายชื่อนักเรียนที่ลงทะเบียนในรายวิชานี้
                        </td>
                      </tr>
                    ) : (
                      unitSummaryRows.map((row, idx) => (
                        <tr key={row.student.id} className="hover:bg-[var(--color-card-subtle)]">
                          <td className="px-3 py-2 text-center font-mono text-[var(--color-text-muted)]">{idx + 1}</td>
                          <td className="px-3 py-2 text-left">
                            <span className="font-semibold text-[var(--color-text-title)]">
                              {getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}
                            </span>
                            <span className="block text-[10px] font-mono text-[var(--color-text-muted)]">
                              {row.student.studentIdNumber}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">{row.student.room}</td>
                          {row.perUnit.map((unit) => (
                            <td key={unit.setId} className="px-2.5 py-2 text-center font-mono">
                              {unit.hasAnyScore ? (
                                <div>
                                  <span className="font-bold text-[var(--color-text-title)]">
                                    {unit.earned}/{unit.max}
                                  </span>
                                  <span
                                    className={`block text-[10px] ${
                                      unit.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'
                                    }`}
                                  >
                                    {unit.passed ? 'ผ่านหน่วย' : 'ซ่อมเสริม'} ({unit.passedCount}/{unit.totalCount})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[var(--color-text-muted)]">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2.5 py-2 text-center font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20">
                            {row.grandEarned}/{row.grandMax}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold">{row.grandPct}%</td>
                          <td className="px-2.5 py-2 text-center font-mono">
                            {row.passedIndicators}/{row.totalIndicators}
                          </td>
                          <td className="px-2.5 py-2 text-center font-semibold">
                            <span
                              className={
                                row.grandPct >= 50
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-rose-700 dark:text-rose-300'
                              }
                            >
                              {row.feedback.labelTh}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : selectedSet ? (
          <div className="space-y-2">
            {/* Unit standard header */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-[var(--color-text-title)]">
                  {selectedSet.unitTitle || selectedSet.title}
                </span>
                {selectedSet.standardCode && (
                  <span className="ml-2 text-[var(--color-text-muted)]">
                    · มาตรฐาน {selectedSet.standardCode}
                  </span>
                )}
              </div>
              <div className="font-mono text-[var(--color-text-muted)] tabular-nums">
                {selectedSet.indicators.length} ตัวชี้วัด · คะแนนเต็มหน่วย{' '}
                {selectedSet.indicators.reduce((sum, item) => sum + item.maxScore, 0)} คะแนน
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-[var(--color-border)]">
              <table className="min-w-full text-xs tabular-nums">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-3 py-2 text-left sticky left-0 bg-[var(--color-card-subtle)] min-w-[210px]">
                      นักเรียน
                    </th>
                    {selectedSet.indicators.map((indicator) => {
                      const isFormative = (indicator.description || '').includes('ระหว่างทาง');
                      return (
                        <th key={indicator.id} className="px-2.5 py-2 text-center min-w-[160px] align-top">
                          <div className="font-bold text-[var(--color-text-title)]">
                            {indicator.code || 'ตัวชี้วัด'}
                            <span className="ml-1 text-[10px] font-medium text-[var(--color-text-muted)]">
                              ({isFormative ? 'ระหว่างทาง' : 'ปลายทาง'})
                            </span>
                          </div>
                          <div className="text-[11px] font-normal text-[var(--color-text-body)] line-clamp-2 mt-0.5">
                            {indicator.title}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--color-primary-text)] mt-0.5">
                            เต็ม {indicator.maxScore}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-2 text-center min-w-[90px] bg-amber-50/70 dark:bg-amber-950/30">
                      รวมหน่วย
                    </th>
                    <th className="px-3 py-2 text-center min-w-[90px]">ผลประเมิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {roster.map((student) => {
                    const unitMax = selectedSet.indicators.reduce((sum, i) => sum + i.maxScore, 0);
                    const unitSum = selectedSet.indicators.reduce(
                      (sum, i) => sum + (getScore(student.id, i.id)?.score ?? 0),
                      0
                    );
                    const hasAny = selectedSet.indicators.some((i) => getScore(student.id, i.id) !== undefined);
                    const pct = unitMax > 0 ? Math.round((unitSum / unitMax) * 100) : 0;

                    return (
                      <tr key={student.id} className="hover:bg-[var(--color-card-subtle)]">
                        <td className="px-3 py-2 sticky left-0 bg-[var(--color-card)] whitespace-nowrap font-medium text-[var(--color-text-title)]">
                          {student.studentIdNumber} · {getStudentShortPrefixTh(student)} {student.firstNameTh} {student.lastNameTh}
                        </td>
                        {selectedSet.indicators.map((indicator) => {
                          const entry = getScore(student.id, indicator.id);
                          return (
                            <td key={indicator.id} className="px-2 py-2 text-center">
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={indicator.maxScore}
                                  step={0.5}
                                  value={entry?.score ?? ''}
                                  onChange={(event) => updateScore(student.id, indicator, event.target.value)}
                                  className="w-16 px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-center font-mono print:border-none"
                                />
                              ) : (
                                <span className="font-mono">{entry?.score ?? '-'}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-mono font-bold bg-amber-50/40 dark:bg-amber-950/20">
                          {hasAny ? `${unitSum}/${unitMax}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">
                          {!hasAny ? (
                            <span className="text-[var(--color-text-muted)]">รอประเมิน</span>
                          ) : pct >= 50 ? (
                            <span className="text-emerald-700 dark:text-emerald-300">ผ่าน ({pct}%)</span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-300">ไม่ผ่าน ({pct}%)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {roster.length === 0 && (
                <div className="p-4 text-sm text-[var(--color-text-muted)]">ไม่พบนักเรียนในรายวิชานี้</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            ยังไม่มีชุดตัวชี้วัดสำหรับรายวิชาและภาคเรียนนี้ กดปุ่ม &quot;นำเข้ามาตรฐานตัวชี้วัด หน่วย 1–3&quot; เพื่อสร้างชุดตัวชี้วัดมาตรฐาน สพฐ. ได้ทันที
          </div>
        )}
      </div>
    </div>
  );
};
