import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Plus, Save, Trash2 } from 'lucide-react';
import type {
  Course,
  LearningIndicator,
  LearningIndicatorScore,
  LearningIndicatorSet,
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
import type { MoeStandardCatalogItem } from '../types';

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
  const [sets, setSets] = useState<LearningIndicatorSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [scores, setScores] = useState<LearningIndicatorScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSetForm, setShowSetForm] = useState(false);
  const [setTitle, setSetTitle] = useState('');
  const [standardCode, setStandardCode] = useState('');
  const [subjectArea, setSubjectArea] = useState(course.titleTh);
  const [gradeLevel, setGradeLevel] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [indicatorDrafts, setIndicatorDrafts] = useState<Array<{ code: string; title: string; maxScore: number }>>([
    { code: '', title: '', maxScore: 3 },
  ]);
  const [catalogItems, setCatalogItems] = useState<MoeStandardCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const canEdit = ['super_admin', 'admin', 'teacher'].includes(currentRole);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void loadLearningIndicatorSets({
      schoolId,
      courseId: course.id,
      academicYear: course.academicYear || systemConfig.academicYear,
      semester: course.semester || systemConfig.currentSemester,
    }).then((loaded) => {
      if (!mounted) return;
      setSets(loaded);
      setSelectedSetId((current) => current && loaded.some((set) => set.id === current) ? current : loaded[0]?.id || '');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [schoolId, course.id, course.academicYear, course.semester, systemConfig.academicYear, systemConfig.currentSemester]);

  useEffect(() => {
    let mounted = true;
    setCatalogLoading(true);
    const combined = `${course.titleTh} ${course.description} ${course.room} ${course.academicYear}`;
    const gradeMatch = combined.match(/(ป\.?([1-6]|[๑-๖])|ม\.?([1-6]|[๑-๖]))/);
    const gradeLevel = gradeMatch ? gradeMatch[0].replace('.', '.') : undefined;
    void loadMoeStandardCatalog({
      subjectArea: course.titleTh,
      gradeLevel,
    }).then((items) => {
      if (mounted) setCatalogItems(items);
      setCatalogLoading(false);
    });
    return () => { mounted = false; };
  }, [course.titleTh, course.description, course.room, course.academicYear]);

  useEffect(() => {
    if (!selectedSetId) {
      setScores([]);
      return;
    }
    let mounted = true;
    void loadLearningIndicatorScores({ schoolId, setId: selectedSetId }).then((loaded) => {
      if (mounted) setScores(loaded);
    });
    return () => { mounted = false; };
  }, [schoolId, selectedSetId]);

  const selectedSet = useMemo(
    () => sets.find((set) => set.id === selectedSetId) || null,
    [sets, selectedSetId]
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
        subjectArea: subjectArea.trim() || course.titleTh,
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
      setIndicatorDrafts([{ code: '', title: '', maxScore: 3 }]);
      setShowSetForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกชุดตัวชี้วัดได้');
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

      const nextSets: LearningIndicatorSet[] = Array.from(grouped.entries()).map(([standardCode, items], groupIndex) => {
        const setId = `moe-${year}-${semester}-${standardCode.replace(/[^a-zA-Z0-9ก-๙]+/g, '-')}-${groupIndex + 1}`;
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
          title: `${items[0].standardTitle || items[0].subjectArea} (${standardCode})`,
          standardCode,
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
          maxScore: Number(row[3] ?? 3),
        }))
        .filter((item) => item.title);

      if (parsed.length === 0) {
        throw new Error('ไม่พบตัวชี้วัดในไฟล์ ต้องมีคอลัมน์ รหัสตัวชี้วัด / ตัวชี้วัด / คะแนนเต็ม');
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
        maxScore: Number.isFinite(item.maxScore) && item.maxScore > 0 ? item.maxScore : 3,
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
        subjectArea: subjectArea.trim() || course.titleTh,
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
      ['ม.3/1', standardCode || 'ว 1.3', 'ตัวอย่างตัวชี้วัดมาตรฐาน', 3],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ตัวชี้วัด');
    XLSX.writeFile(workbook, 'indicator_template.xlsx');
  };

  const getScore = (studentId: string, indicatorId: string) =>
    scores.find((item) => item.studentId === studentId && item.indicatorId === indicatorId);

  const updateScore = (studentId: string, indicator: LearningIndicator, rawValue: string) => {
    if (!selectedSet) return;
    const score = Math.max(0, Math.min(indicator.maxScore, Number(rawValue)));
    if (!Number.isFinite(score)) return;
    setScores((current) => {
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
      return existing
        ? current.map((item) => item.id === existing.id ? next : item)
        : [...current, next];
    });
  };

  const saveScores = async () => {
    setSaving(true);
    setError('');
    try {
      await saveLearningIndicatorScores(scores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกคะแนนตัวชี้วัดได้');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-[var(--color-text-muted)]">กำลังโหลดตัวชี้วัด...</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedSetId}
          onChange={(event) => setSelectedSetId(event.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm min-w-[220px]"
        >
          <option value="">เลือกชุดตัวชี้วัด</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.standardCode ? `${set.standardCode} · ` : ''}{set.title}
            </option>
          ))}
        </select>
        {canEdit && (
          <button type="button" onClick={() => setShowSetForm(true)} className="seg-tab-btn px-3">
            <Plus className="w-4 h-4" /> สร้างชุดตัวชี้วัด
          </button>
        )}
        {selectedSet && canEdit && (
          <button type="button" onClick={saveScores} disabled={saving} className="seg-tab-btn px-3">
            <Save className="w-4 h-4" /> {saving ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showSetForm && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <input
              value={setTitle}
              onChange={(event) => setSetTitle(event.target.value)}
              placeholder="ชื่อหน่วย/ชุดตัวชี้วัด"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={standardCode}
              onChange={(event) => setStandardCode(event.target.value)}
              placeholder="รหัสมาตรฐาน เช่น ว 1.3"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={subjectArea}
              onChange={(event) => setSubjectArea(event.target.value)}
              placeholder="วิชา / กลุ่มสาระ"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              placeholder="ระดับชั้น เช่น ม.3"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <input
              value={unitTitle}
              onChange={(event) => setUnitTitle(event.target.value)}
              placeholder="หน่วยการเรียนรู้"
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            />
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm">
              <input
                type="checkbox"
                checked={isTemplate}
                onChange={(event) => setIsTemplate(event.target.checked)}
              />
              บันทึกเป็นชุดมาตรฐานที่ใช้ซ้ำได้
            </label>
          </div>
          {indicatorDrafts.map((draft, index) => (
            <div key={index} className="grid grid-cols-[90px_1fr_90px_36px] gap-2">
              <input
                value={draft.code}
                onChange={(event) => setIndicatorDrafts((current) => current.map((item, i) => i === index ? { ...item, code: event.target.value } : item))}
                placeholder="รหัส"
                className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
              />
              <input
                value={draft.title}
                onChange={(event) => setIndicatorDrafts((current) => current.map((item, i) => i === index ? { ...item, title: event.target.value } : item))}
                placeholder="ตัวชี้วัด"
                className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
              />
              <input
                type="number"
                min={1}
                value={draft.maxScore}
                onChange={(event) => setIndicatorDrafts((current) => current.map((item, i) => i === index ? { ...item, maxScore: Number(event.target.value) } : item))}
                className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
              />
              <button type="button" aria-label="ลบตัวชี้วัด" onClick={() => setIndicatorDrafts((current) => current.filter((_, i) => i !== index))} className="p-2 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={() => setIndicatorDrafts((current) => [...current, { code: '', title: '', maxScore: 3 }])} className="seg-tab-btn px-3">
              <Plus className="w-4 h-4" /> เพิ่มตัวชี้วัด
            </button>
            <button type="button" onClick={createSet} disabled={saving} className="seg-tab-btn px-3">
              <Save className="w-4 h-4" /> บันทึกชุด
            </button>
            <button type="button" onClick={downloadIndicatorTemplate} className="seg-tab-btn px-3">
              <Download className="w-4 h-4" /> ดาวน์โหลดแม่แบบ Excel
            </button>
            <label className="seg-tab-btn px-3 cursor-pointer">
              <Download className="w-4 h-4" /> นำเข้า Excel
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

      {sets.length === 0 && canEdit && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">ชุดตัวชี้วัดวิทยาศาสตร์ มัธยมศึกษาปีที่ 3</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              นำเข้าชุด ว 1.3 ว 2.3 และ ว 3.1 จากเอกสาร ปพ.5
            </div>
          </div>
          <button type="button" onClick={importMoeScienceM3Sets} disabled={saving} className="seg-tab-btn px-3">
            <Plus className="w-4 h-4" /> นำเข้าตัวชี้วัดมาตรฐาน สพฐ.
          </button>
        </div>
      )}

      {canEdit && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">คลังตัวชี้วัดมาตรฐาน สพฐ.</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {catalogLoading
                ? 'กำลังค้นหาตามวิชาและระดับชั้น'
                : catalogItems.length > 0
                  ? `พบตัวชี้วัด ${catalogItems.length} รายการ`
                  : 'ยังไม่มีข้อมูลมาตรฐานสำหรับวิชาและระดับชั้นนี้ในคลังระบบ'}
            </div>
          </div>
          {catalogItems.length > 0 && (
            <button type="button" onClick={applyMoeCatalogSet} disabled={saving} className="seg-tab-btn px-3">
              <Plus className="w-4 h-4" /> ใช้ตัวชี้วัดจากคลัง สพฐ.
            </button>
          )}
        </div>
      )}

      {selectedSet ? (
        <div className="overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--color-card-subtle)]">
              <tr>
                <th className="px-3 py-2 text-left sticky left-0 bg-[var(--color-card-subtle)]">นักเรียน</th>
                {selectedSet.indicators.map((indicator) => (
                  <th key={indicator.id} className="px-2 py-2 text-center min-w-[140px]">
                    <div className="font-semibold">{indicator.code || 'ตัวชี้วัด'}</div>
                    <div className="text-xs font-normal text-[var(--color-text-muted)]">{indicator.title}</div>
                    <div className="text-[10px]">เต็ม {indicator.maxScore}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => (
                <tr key={student.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 sticky left-0 bg-[var(--color-card)] whitespace-nowrap">
                    {student.studentIdNumber} · {student.firstNameTh} {student.lastNameTh}
                  </td>
                  {selectedSet.indicators.map((indicator) => (
                    <td key={indicator.id} className="px-2 py-2 text-center">
                      {canEdit ? (
                        <input
                          type="number"
                          min={0}
                          max={indicator.maxScore}
                          step={0.5}
                          value={getScore(student.id, indicator.id)?.score ?? ''}
                          onChange={(event) => updateScore(student.id, indicator, event.target.value)}
                          className="w-16 px-2 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-center"
                        />
                      ) : (
                        <span>{getScore(student.id, indicator.id)?.score ?? '-'}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {roster.length === 0 && (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">ไม่พบนักเรียนในรายวิชานี้</div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          ยังไม่มีชุดตัวชี้วัดสำหรับรายวิชาและภาคเรียนนี้
        </div>
      )}
    </div>
  );
};
