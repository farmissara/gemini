import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
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
  const [indicatorDrafts, setIndicatorDrafts] = useState<Array<{ code: string; title: string; maxScore: number }>>([
    { code: '', title: '', maxScore: 3 },
  ]);

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
      setIndicatorDrafts([{ code: '', title: '', maxScore: 3 }]);
      setShowSetForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกชุดตัวชี้วัดได้');
    } finally {
      setSaving(false);
    }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          </div>
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
