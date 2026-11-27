import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { StatusBadge } from './common/StatusBadge';
import { PaginatedTableRows } from './common/PaginatedTableRows';
import { BaseModal } from './common/BaseModal';
import type {
  GradeRecord,
  GradingSystem,
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
  deleteLearningIndicatorSet,
  extractPassingPercent,
  inferIndicatorNature,
  loadLearningIndicatorScores,
  loadLearningIndicatorSets,
  saveLearningIndicatorScores,
  saveLearningIndicatorSet,
} from '../lib/learningIndicatorStore';
import {
  deleteSchoolEditableStandardItem,
  loadMoeStandardCatalog,
  loadSchoolEditableStandardCatalog,
  resetSchoolEditableStandardCatalog,
  SchoolStandardIndicatorItem,
  upsertSchoolEditableStandardItem,
} from '../lib/moeStandardCatalogStore';
import { createMoeScienceM3IndicatorSets } from '../data/moeScienceM3Indicators';
import {
  createObcUnitSetsForCourse,
  MOE_LEARNING_AREAS,
  resolveMoeLearningArea,
} from '../data/moeCurriculumStandards';
import { getCourseType } from '../lib/courseClassification';
import { calculateGrade } from '../lib/schoolSettings';
import { getRawScoreFeedback, getStudentShortPrefixTh, isSpecialMoeGrade } from '../lib/moeGrading';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';

interface Props {
  course: Course;
  students: Student[];
  school?: School;
  systemConfig: SystemConfig;
  currentRole: UserRole;
  currentUserName?: string;
  grades?: GradeRecord[];
  gradingSystem?: GradingSystem;
  onUpdateGrade?: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade?: (newGrade: GradeRecord, options?: { notify?: boolean }) => void;
}

interface IndicatorDraftRow {
  id?: string;
  code: string;
  title: string;
  nature: 'formative' | 'summative';
  maxScore: number;
  passingPercent: number;
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const LearningIndicatorAssessmentPanel: React.FC<Props> = ({
  course,
  students,
  school,
  systemConfig,
  currentRole,
  currentUserName,
  grades = [],
  gradingSystem = 'thai',
  onUpdateGrade,
  onAddGrade,
}) => {
  const schoolId = school?.id || course.schoolId || '';
  const learningArea = useMemo(() => resolveMoeLearningArea(course), [course]);
  const courseType = getCourseType(course);
  const courseTypeLabel =
    courseType === 'core'
      ? 'รายวิชาพื้นฐาน'
      : courseType === 'activities'
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

  // Create or Edit Unit & Indicator Set Form
  const [showSetForm, setShowSetForm] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setTitle, setSetTitle] = useState('');
  const [standardCode, setStandardCode] = useState('');
  const [subjectArea, setSubjectArea] = useState(learningArea.nameTh);
  const [gradeLevel, setGradeLevel] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [indicatorDrafts, setIndicatorDrafts] = useState<IndicatorDraftRow[]>([
    { code: '', title: '', nature: 'formative', maxScore: 5, passingPercent: 50 },
  ]);

  // Inline Delete Confirmation for Set
  const [pendingDeleteSetId, setPendingDeleteSetId] = useState<string | null>(null);

  // OBEC Catalog & School Editable Standard Library Modal
  const [catalogItems, setCatalogItems] = useState<MoeStandardCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [schoolCatalog, setSchoolCatalog] = useState<SchoolStandardIndicatorItem[]>([]);
  const [catalogAreaFilter, setCatalogAreaFilter] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [editingCatalogItem, setEditingCatalogItem] = useState<SchoolStandardIndicatorItem | null>(null);
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [catalogForm, setCatalogForm] = useState<{
    subjectArea: string;
    gradeLevel: string;
    standardCode: string;
    standardTitle: string;
    unitTitle: string;
    indicatorCode: string;
    indicatorTitle: string;
    nature: 'formative' | 'summative';
    maxScore: number;
    passingPercent: number;
  }>({
    subjectArea: learningArea.nameTh,
    gradeLevel: course.room || 'ทุกระดับชั้น (ป.1–ม.6)',
    standardCode: '',
    standardTitle: '',
    unitTitle: '',
    indicatorCode: '',
    indicatorTitle: '',
    nature: 'formative',
    maxScore: 5,
    passingPercent: 50,
  });

  // Gradebook Ratio Sync (OBEC Formative : Summative -> GradeRecord)
  const [showRatioSyncBox, setShowRatioSyncBox] = useState(false);
  const [obecRatioPreset, setObecRatioPreset] = useState<'70_30' | '80_20' | '60_40'>('70_30');

  const printAreaRef = useRef<HTMLDivElement>(null);

  const canEdit = ['super_admin', 'admin', 'teacher'].includes(currentRole);

  useEffect(() => {
    setSubjectArea(learningArea.nameTh);
  }, [learningArea.nameTh]);

  useEffect(() => {
    setSchoolCatalog(loadSchoolEditableStandardCatalog(schoolId));
  }, [schoolId]);

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

  const resetSetForm = () => {
    setEditingSetId(null);
    setSetTitle('');
    setStandardCode('');
    setSubjectArea(learningArea.nameTh);
    setGradeLevel(course.room || '');
    setUnitTitle('');
    setIsTemplate(false);
    setIndicatorDrafts([{ code: '', title: '', nature: 'formative', maxScore: 5, passingPercent: 50 }]);
  };

  const openCreateSetForm = () => {
    resetSetForm();
    setShowSetForm(true);
  };

  const openEditSetForm = (targetSet: LearningIndicatorSet) => {
    setEditingSetId(targetSet.id);
    setSetTitle(targetSet.title);
    setStandardCode(targetSet.standardCode || '');
    setSubjectArea(targetSet.subjectArea || learningArea.nameTh);
    setGradeLevel(targetSet.gradeLevel || '');
    setUnitTitle(targetSet.unitTitle || '');
    setIsTemplate(Boolean(targetSet.isTemplate));
    setIndicatorDrafts(
      targetSet.indicators.length > 0
        ? targetSet.indicators.map((ind) => ({
            id: ind.id,
            code: ind.code,
            title: ind.title,
            nature: inferIndicatorNature(ind),
            maxScore: ind.maxScore,
            passingPercent: extractPassingPercent(ind),
          }))
        : [{ code: '', title: '', nature: 'formative', maxScore: 5, passingPercent: 50 }]
    );
    setShowSetForm(true);
  };

  const saveSetForm = async () => {
    const cleanTitle = setTitle.trim();
    const cleanIndicators = indicatorDrafts
      .map((item, index) => ({
        id: item.id,
        code: item.code.trim(),
        title: item.title.trim(),
        nature: item.nature,
        maxScore: Number(item.maxScore),
        passingPercent: Math.max(0, Math.min(100, Number(item.passingPercent) || 50)),
        sortOrder: index + 1,
      }))
      .filter((item) => item.title);
    if (!cleanTitle || cleanIndicators.length === 0) {
      setError('กรุณากรอกชื่อชุดตัวชี้วัดและตัวชี้วัดอย่างน้อย 1 รายการ');
      return;
    }
    setSaving(true);
    setError('');
    setSaveSuccess('');
    try {
      const now = new Date().toISOString();
      const existing = editingSetId ? sets.find((s) => s.id === editingSetId) : undefined;
      const setId = existing?.id || makeId('set');
      const year = existing?.academicYear || course.academicYear || systemConfig.academicYear;
      const semester = existing?.semester || course.semester || systemConfig.currentSemester;

      const indicators: LearningIndicator[] = cleanIndicators.map((item) => ({
        id: item.id || makeId('indicator'),
        schoolId,
        courseId: course.id,
        setId,
        code: item.code,
        title: item.title,
        description: `${unitTitle.trim() || cleanTitle} · ${standardCode.trim() || 'สพฐ.'} (${
          item.nature === 'formative' ? 'ตัวชี้วัดระหว่างทาง' : 'ตัวชี้วัดปลายทาง'
        })`,
        nature: item.nature,
        passingPercent: item.passingPercent,
        maxScore: item.maxScore > 0 ? item.maxScore : 1,
        sortOrder: item.sortOrder,
        academicYear: year,
        semester,
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
        source: existing?.source || 'manual',
        academicYear: year,
        semester,
        indicators,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await saveLearningIndicatorSet(nextSet);

      // Clean orphan scores if an indicator was removed during editing
      if (existing) {
        const validIndIds = new Set(indicators.map((i) => i.id));
        setScoresBySet((prev) => ({
          ...prev,
          [setId]: (prev[setId] || []).filter((sc) => validIndIds.has(sc.indicatorId)),
        }));
      }

      setSets((current) =>
        existing
          ? current.map((item) => (item.id === setId ? nextSet : item))
          : [...current, nextSet]
      );
      setSelectedSetId(setId);
      resetSetForm();
      setShowSetForm(false);
      setSaveSuccess(
        existing
          ? `บันทึกการแก้ไขหน่วย "${nextSet.title}" และตัวชี้วัด (${indicators.length} ข้อ) เรียบร้อยแล้ว`
          : `สร้างหน่วยการเรียนรู้ "${nextSet.title}" (${indicators.length} ตัวชี้วัด) เรียบร้อยแล้ว`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกชุดตัวชี้วัดได้');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSet = async () => {
    if (!pendingDeleteSetId) return;
    const target = sets.find((s) => s.id === pendingDeleteSetId);
    setSaving(true);
    setError('');
    try {
      await deleteLearningIndicatorSet(schoolId, course.id, pendingDeleteSetId);
      const remaining = sets.filter((s) => s.id !== pendingDeleteSetId);
      setSets(remaining);
      setScoresBySet((prev) => {
        const next = { ...prev };
        delete next[pendingDeleteSetId];
        return next;
      });
      if (selectedSetId === pendingDeleteSetId) {
        setSelectedSetId(remaining[0]?.id || '');
      }
      setPendingDeleteSetId(null);
      setSaveSuccess(`ลบหน่วย "${target?.title || ''}" ออกจากรายวิชาแล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถลบชุดตัวชี้วัดได้');
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
          nature: 'formative',
          passingPercent: 50,
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

  // School Editable Standard Catalog Handlers
  const filteredSchoolCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return schoolCatalog.filter((item) => {
      const matchArea = catalogAreaFilter === 'all' || item.subjectArea === catalogAreaFilter;
      const matchSearch =
        !q ||
        item.indicatorCode.toLowerCase().includes(q) ||
        item.indicatorTitle.toLowerCase().includes(q) ||
        item.standardCode.toLowerCase().includes(q) ||
        (item.unitTitle || '').toLowerCase().includes(q);
      return matchArea && matchSearch;
    });
  }, [schoolCatalog, catalogAreaFilter, catalogSearch]);

  const handleOpenAddCatalogItem = () => {
    setEditingCatalogItem(null);
    setCatalogForm({
      subjectArea: catalogAreaFilter === 'all' ? learningArea.nameTh : catalogAreaFilter,
      gradeLevel: course.room || 'ทุกระดับชั้น (ป.1–ม.6)',
      standardCode: '',
      standardTitle: '',
      unitTitle: '',
      indicatorCode: '',
      indicatorTitle: '',
      nature: 'formative',
      maxScore: 5,
      passingPercent: 50,
    });
    setShowCatalogForm(true);
  };

  const handleOpenEditCatalogItem = (item: SchoolStandardIndicatorItem) => {
    setEditingCatalogItem(item);
    setCatalogForm({
      subjectArea: item.subjectArea,
      gradeLevel: item.gradeLevel,
      standardCode: item.standardCode,
      standardTitle: item.standardTitle,
      unitTitle: item.unitTitle || '',
      indicatorCode: item.indicatorCode,
      indicatorTitle: item.indicatorTitle,
      nature: item.nature,
      maxScore: item.maxScore,
      passingPercent: item.passingPercent,
    });
    setShowCatalogForm(true);
  };

  const handleSaveCatalogItem = () => {
    if (!catalogForm.indicatorTitle.trim() || !catalogForm.standardCode.trim()) {
      setError('กรุณากรอกรหัสมาตรฐานและคำอธิบายตัวชี้วัดในคลัง');
      return;
    }
    const item: SchoolStandardIndicatorItem = {
      id: editingCatalogItem?.id || makeId('std-item'),
      curriculumVersion: 'หลักสูตรสถานศึกษา / สพฐ.',
      subjectArea: catalogForm.subjectArea.trim() || learningArea.nameTh,
      gradeLevel: catalogForm.gradeLevel.trim() || 'ทุกระดับชั้น',
      standardCode: catalogForm.standardCode.trim(),
      standardTitle: catalogForm.standardTitle.trim() || catalogForm.standardCode.trim(),
      unitTitle: catalogForm.unitTitle.trim() || undefined,
      indicatorCode: catalogForm.indicatorCode.trim() || catalogForm.standardCode.trim(),
      indicatorTitle: catalogForm.indicatorTitle.trim(),
      maxScore: Math.max(1, Number(catalogForm.maxScore) || 5),
      passingPercent: Math.max(0, Math.min(100, Number(catalogForm.passingPercent) || 50)),
      nature: catalogForm.nature,
      sourceName: editingCatalogItem?.isCustom === false ? 'สพฐ. (ปรับแก้โดยสถานศึกษา)' : 'กำหนดโดยครู/ผู้ดูแลระบบ',
      active: true,
      isCustom: true,
    };
    const next = upsertSchoolEditableStandardItem(schoolId, item);
    setSchoolCatalog(next);
    setShowCatalogForm(false);
    setEditingCatalogItem(null);
    setError('');
    setSaveSuccess(`บันทึกตัวชี้วัด "${item.indicatorCode}" เข้าคลังมาตรฐานโรงเรียนแล้ว`);
  };

  const handleDeleteCatalogItem = (itemId: string) => {
    const next = deleteSchoolEditableStandardItem(schoolId, itemId);
    setSchoolCatalog(next);
  };

  const handleResetCatalogDefaults = () => {
    const next = resetSchoolEditableStandardCatalog(schoolId);
    setSchoolCatalog(next);
    setSaveSuccess('คืนค่าคลังมาตรฐาน สพฐ. ต้นฉบับเรียบร้อยแล้ว');
  };

  const handleAddCatalogItemToCourse = async (item: SchoolStandardIndicatorItem) => {
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const year = course.academicYear || systemConfig.academicYear;
      const semester = course.semester || systemConfig.currentSemester;

      if (selectedSet) {
        const newIndicator: LearningIndicator = {
          id: makeId('indicator'),
          schoolId,
          courseId: course.id,
          setId: selectedSet.id,
          code: item.indicatorCode,
          title: item.indicatorTitle,
          description: `${item.unitTitle || selectedSet.title} · ${item.standardCode} (${
            item.nature === 'formative' ? 'ตัวชี้วัดระหว่างทาง' : 'ตัวชี้วัดปลายทาง'
          })`,
          nature: item.nature,
          passingPercent: item.passingPercent,
          maxScore: item.maxScore,
          sortOrder: selectedSet.indicators.length + 1,
          academicYear: year,
          semester,
        };
        const updatedSet: LearningIndicatorSet = {
          ...selectedSet,
          indicators: [...selectedSet.indicators, newIndicator],
          updatedAt: now,
        };
        await saveLearningIndicatorSet(updatedSet);
        setSets((prev) => prev.map((s) => (s.id === selectedSet.id ? updatedSet : s)));
        setSaveSuccess(`เพิ่มตัวชี้วัด "${item.indicatorCode}" ลงใน "${selectedSet.title}" แล้ว`);
      } else {
        const setId = makeId('set');
        const newIndicator: LearningIndicator = {
          id: makeId('indicator'),
          schoolId,
          courseId: course.id,
          setId,
          code: item.indicatorCode,
          title: item.indicatorTitle,
          description: `${item.unitTitle || item.standardTitle} · ${item.standardCode}`,
          nature: item.nature,
          passingPercent: item.passingPercent,
          maxScore: item.maxScore,
          sortOrder: 1,
          academicYear: year,
          semester,
        };
        const createdSet: LearningIndicatorSet = {
          id: setId,
          schoolId,
          courseId: course.id,
          title: item.unitTitle || `${item.standardCode} · ${item.subjectArea}`,
          standardCode: item.standardCode,
          subjectArea: item.subjectArea,
          gradeLevel: item.gradeLevel,
          unitTitle: item.unitTitle,
          isTemplate: false,
          source: 'school',
          academicYear: year,
          semester,
          indicators: [newIndicator],
          createdAt: now,
          updatedAt: now,
        };
        await saveLearningIndicatorSet(createdSet);
        setSets((prev) => [...prev, createdSet]);
        setSelectedSetId(setId);
        setSaveSuccess(`สร้างหน่วยใหม่พร้อมตัวชี้วัด "${item.indicatorCode}" เรียบร้อยแล้ว`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเพิ่มตัวชี้วัดจากคลังได้');
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
          nature: String(row[4] ?? '').includes('ปลายทาง') ? ('summative' as const) : ('formative' as const),
          passingPercent: Number(row[5] ?? 50),
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
        nature: item.nature,
        passingPercent: Number.isFinite(item.passingPercent) && item.passingPercent > 0 ? item.passingPercent : 50,
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
      resetSetForm();
      setShowSetForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถนำเข้าตัวชี้วัดจากไฟล์ได้');
    } finally {
      setSaving(false);
    }
  };

  const downloadIndicatorTemplate = () => {
    const rows = [
      ['รหัสตัวชี้วัด', 'รหัสมาตรฐาน', 'ชื่อตัวชี้วัด', 'คะแนนเต็ม', 'ประเภท (ระหว่างทาง/ปลายทาง)', 'เกณฑ์ผ่าน (%)'],
      ['ว 1.1 (1)', standardCode || 'ว 1.1', 'ตัวอย่างตัวชี้วัดมาตรฐาน สพฐ.', 5, 'ระหว่างทาง', 50],
      ['ว 1.1 (2)', standardCode || 'ว 1.1', 'ตัวอย่างตัวชี้วัดปลายทาง สพฐ.', 10, 'ปลายทาง', 50],
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
    const passPct = extractPassingPercent(indicator);
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
        result: score >= indicator.maxScore * (passPct / 100) ? 'pass' : 'not_pass',
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
        const finalScore = existing ? existing.score : ind.maxScore;
        const passPct = extractPassingPercent(ind);
        nextList.push({
          id: existing?.id || makeId('score'),
          schoolId,
          setId: selectedSet.id,
          indicatorId: ind.id,
          studentId: student.id,
          score: finalScore,
          result: finalScore >= ind.maxScore * (passPct / 100) ? 'pass' : 'not_pass',
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

  // OBEC standard calculation: separate formative (ระหว่างทาง) and summative (ปลายทาง)
  const unitSummaryRows = useMemo(() => {
    return roster.map((student) => {
      let grandEarned = 0;
      let grandMax = 0;
      let formativeEarned = 0;
      let formativeMax = 0;
      let summativeEarned = 0;
      let summativeMax = 0;
      let passedIndicators = 0;
      let totalIndicators = 0;
      let failedSummativeCount = 0;
      let missingSummativeCount = 0;

      const perUnit = sets.map((set) => {
        const unitMax = set.indicators.reduce((sum, ind) => sum + ind.maxScore, 0);
        let unitEarned = 0;
        let unitPassed = 0;
        let hasAnyScore = false;

        set.indicators.forEach((ind) => {
          totalIndicators += 1;
          const nature = inferIndicatorNature(ind);
          const passPct = extractPassingPercent(ind);
          if (nature === 'formative') formativeMax += ind.maxScore;
          else summativeMax += ind.maxScore;

          const sc = getScore(student.id, ind.id, set.id);
          if (sc) {
            hasAnyScore = true;
            unitEarned += sc.score;
            if (nature === 'formative') formativeEarned += sc.score;
            else summativeEarned += sc.score;

            if (sc.score >= ind.maxScore * (passPct / 100)) {
              unitPassed += 1;
              passedIndicators += 1;
            } else if (nature === 'summative') {
              failedSummativeCount += 1;
            }
          } else if (nature === 'summative') {
            missingSummativeCount += 1;
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
      const formativePct = formativeMax > 0 ? formativeEarned / formativeMax : grandMax > 0 ? grandEarned / grandMax : 0;
      const summativePct = summativeMax > 0 ? summativeEarned / summativeMax : formativePct;
      const meetsObecSummativeRule = failedSummativeCount === 0 && missingSummativeCount === 0 && grandPct >= 50;
      const feedback = getRawScoreFeedback(grandMax > 0 ? grandPct : null);

      return {
        student,
        perUnit,
        grandEarned,
        grandMax,
        grandPct,
        formativeEarned,
        formativeMax,
        formativePct,
        summativeEarned,
        summativeMax,
        summativePct,
        passedIndicators,
        totalIndicators,
        failedSummativeCount,
        missingSummativeCount,
        meetsObecSummativeRule,
        feedback,
      };
    });
  }, [roster, sets, scoresBySet]);

  const handleSyncIndicatorsToGradebook = () => {
    if (!onUpdateGrade && !onAddGrade) return;
    if (sets.length === 0 || unitSummaryRows.length === 0) return;

    const formativeWeight = obecRatioPreset === '80_20' ? 80 : obecRatioPreset === '60_40' ? 60 : 70;
    const summativeWeight = 100 - formativeWeight;

    let updatedCount = 0;
    const year = course.academicYear || systemConfig.academicYear || '2569';
    const semester = course.semester || systemConfig.currentSemester || '1';

    unitSummaryRows.forEach((row) => {
      if (row.grandMax === 0) return;
      const hasAnyScored = row.perUnit.some((u) => u.hasAnyScore);
      if (!hasAnyScored) return;

      const courseworkScaled = Math.round(row.formativePct * formativeWeight);
      const finalScaled = Math.round(row.summativePct * summativeWeight);
      const totalScore = Math.max(0, Math.min(100, courseworkScaled + finalScaled));

      // Distribute coursework into assignment (20 max), quiz (10 max), midterm (rest) cleanly
      const assignmentScore = Math.min(20, Math.round(courseworkScaled * 0.3));
      const quizScore = Math.min(10, Math.round(courseworkScaled * 0.15));
      const midtermScore = Math.max(0, courseworkScaled - assignmentScore - quizScore);
      const finalScore = Math.max(0, Math.min(100 - courseworkScaled, finalScaled));

      const existing = grades.find(
        (g) => g.studentId === row.student.id && g.courseId === course.id
      );
      const preserveSpecial = existing && isSpecialMoeGrade(existing.letterGrade);
      const graded = calculateGrade(totalScore, gradingSystem);

      if (existing && onUpdateGrade) {
        onUpdateGrade(existing.id, {
          assignmentScore,
          quizScore,
          midtermScore,
          finalScore,
          totalScore,
          letterGrade: preserveSpecial ? existing.letterGrade : graded.letter,
          gradePoint: preserveSpecial ? 0 : graded.point,
        });
        updatedCount += 1;
      } else if (!existing && onAddGrade) {
        onAddGrade(
          {
            id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            schoolId,
            studentId: row.student.id,
            courseId: course.id,
            academicYear: year,
            semester,
            assignmentScore,
            quizScore,
            midtermScore,
            finalScore,
            totalScore,
            letterGrade: graded.letter,
            gradePoint: graded.point,
          },
          { notify: false }
        );
        updatedCount += 1;
      }
    });

    setShowRatioSyncBox(false);
    setSaveSuccess(
      `ซิงค์คะแนนตัวชี้วัด (สัดส่วน ${formativeWeight}:${summativeWeight}) เข้าสมุดพกคะแนน ปพ.5 สำเร็จ ${updatedCount} คน`
    );
  };

  const exportUnitIndicatorsExcel = () => {
    if (sets.length === 0) return;
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ห้องเรียน',
      ...sets.map((s) => `${s.unitTitle || s.title} (เต็ม ${s.indicators.reduce((a, b) => a + b.maxScore, 0)})`),
      'ระหว่างทาง',
      'ปลายทาง',
      'คะแนนรวมตัวชี้วัด',
      'คะแนนเต็มรวม',
      'ร้อยละ (%)',
      'ตัวชี้วัดที่ผ่าน',
      'สถานะเกณฑ์ สพฐ.',
    ];
    const rows = unitSummaryRows.map((row) => [
      row.student.studentIdNumber,
      `${getStudentShortPrefixTh(row.student)} ${row.student.firstNameTh} ${row.student.lastNameTh}`,
      row.student.room,
      ...row.perUnit.map((u) => (u.hasAnyScore ? u.earned : '-')),
      `${row.formativeEarned}/${row.formativeMax}`,
      `${row.summativeEarned}/${row.summativeMax}`,
      row.grandEarned,
      row.grandMax,
      `${row.grandPct}%`,
      `${row.passedIndicators}/${row.totalIndicators}`,
      row.meetsObecSummativeRule ? `ผ่านเกณฑ์ (${row.feedback.labelTh})` : 'รอซ่อมเสริม/ปลายทางไม่ครบ',
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

  const selectedSetStats = useMemo(() => {
    if (!selectedSet) return null;
    const formativeList = selectedSet.indicators.filter((i) => inferIndicatorNature(i) === 'formative');
    const summativeList = selectedSet.indicators.filter((i) => inferIndicatorNature(i) === 'summative');
    const formativeMax = formativeList.reduce((sum, i) => sum + i.maxScore, 0);
    const summativeMax = summativeList.reduce((sum, i) => sum + i.maxScore, 0);
    return {
      formativeCount: formativeList.length,
      summativeCount: summativeList.length,
      formativeMax,
      summativeMax,
      totalMax: formativeMax + summativeMax,
    };
  }, [selectedSet]);

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
            คะแนนตัวชี้วัดรายวิชามาตรฐาน สพฐ./ศธ. (ระหว่างทาง–ปลายทาง) · {course.titleTh}
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
              ประเมินผล &amp; เกณฑ์ สพฐ. ({Math.max(1, sets.length)} หน่วย)
            </button>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCatalogManager(true)}
              className="btn-tool-tone px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>จัดการคลังมาตรฐาน สพฐ./โรงเรียน</span>
            </button>
          )}

          {sets.length > 0 && (
            <>
              {canEdit && (onUpdateGrade || onAddGrade) && (
                <button
                  type="button"
                  onClick={() => setShowRatioSyncBox((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ส่งคะแนนเข้า ปพ.5</span>
                </button>
              )}
              <button type="button" onClick={exportUnitIndicatorsExcel} className="btn-tool-tone px-2.5 py-1.5 text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ส่งออก Excel</span>
              </button>
              <button type="button" onClick={handlePrintPanel} className="btn-tool-tone px-2.5 py-1.5 text-xs">
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ A4</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sync to Course Gradebook Drawer */}
      {showRatioSyncBox && canEdit && (
        <div className="rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-indigo-950 dark:text-indigo-100">
              คำนวณคะแนนตัวชี้วัดเข้าสมุดพกคะแนน / ปพ.5 ตามสัดส่วน สพฐ.
            </div>
            <div className="text-[11px] text-indigo-800 dark:text-indigo-300">
              ระบบจะคิดร้อยละจากตัวชี้วัด<strong>ระหว่างทาง</strong>เป็นคะแนนเก็บ/กลางภาค และตัวชี้วัด<strong>ปลายทาง</strong>เป็นคะแนนสอบปลายภาคให้อัตโนมัติ
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={obecRatioPreset}
              onChange={(e) => setObecRatioPreset(e.target.value as '70_30' | '80_20' | '60_40')}
              className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-semibold"
            >
              <option value="70_30">สัดส่วน 70 : 30 (ระหว่างทาง 70 / ปลายทาง 30)</option>
              <option value="80_20">สัดส่วน 80 : 20 (ระหว่างทาง 80 / ปลายทาง 20)</option>
              <option value="60_40">สัดส่วน 60 : 40 (ระหว่างทาง 60 / ปลายทาง 40)</option>
            </select>
            <button
              type="button"
              onClick={handleSyncIndicatorsToGradebook}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ยืนยันส่งเข้าเกรดรายวิชา</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRatioSyncBox(false)}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-card)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
                <span>นำเข้ามาตรฐาน หน่วย 1–3 ({learningArea.shortTh})</span>
              </button>
              <button
                type="button"
                onClick={openCreateSetForm}
                className="seg-tab-btn px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มหน่วย/ตัวชี้วัดใหม่</span>
              </button>
            </>
          )}
          {selectedSet && viewMode === 'score_entry' && canEdit && (
            <>
              <button
                type="button"
                onClick={() => openEditSetForm(selectedSet)}
                className="seg-tab-btn px-2.5 text-xs"
                title="แก้ไข ลบ หรือเพิ่มตัวชี้วัดในหน่วยนี้"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไข/ลบตัวชี้วัดหน่วยนี้</span>
              </button>
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

      {/* Inline Delete Unit Confirmation */}
      {pendingDeleteSetId && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="font-semibold text-rose-900 dark:text-rose-100">
            ยืนยันการลบหน่วย &quot;{sets.find((s) => s.id === pendingDeleteSetId)?.title}&quot; และคะแนนตัวชี้วัดภายในหน่วยนี้ทั้งหมด?
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteSetId(null)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={confirmDeleteSet}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
            >
              ยืนยันลบหน่วยนี้
            </button>
          </div>
        </div>
      )}

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

      {/* Create / Edit Unit & Standard Indicators Form */}
      {showSetForm && (
        <div className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-card-subtle)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-primary)]" />
              <span>
                {editingSetId
                  ? 'แก้ไขหน่วยการเรียนรู้และตัวชี้วัดมาตรฐาน (เพิ่ม / แก้ไข / ลบ / ตั้งเกณฑ์ผ่าน สพฐ.)'
                  : 'สร้างหน่วยการเรียนรู้และตัวชี้วัดมาตรฐานใหม่'}
              </span>
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowSetForm(false);
                resetSetForm();
              }}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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

          <div className="space-y-2">
            <div className="hidden md:grid md:grid-cols-[110px_1fr_135px_85px_95px_36px] gap-2 px-1 text-[11px] font-bold text-[var(--color-text-muted)]">
              <span>รหัสตัวชี้วัด</span>
              <span>คำอธิบายตัวชี้วัด (ตามมาตรฐาน สพฐ. / สถานศึกษา)</span>
              <span>ประเภทตามเกณฑ์ สพฐ.</span>
              <span>คะแนนเต็ม</span>
              <span>เกณฑ์ผ่าน (%)</span>
              <span />
            </div>
            {indicatorDrafts.map((draft, index) => (
              <div
                key={draft.id || index}
                className="grid grid-cols-1 md:grid-cols-[110px_1fr_135px_85px_95px_36px] gap-2 text-xs items-center"
              >
                <input
                  value={draft.code}
                  onChange={(event) =>
                    setIndicatorDrafts((current) =>
                      current.map((item, i) => (i === index ? { ...item, code: event.target.value } : item))
                    )
                  }
                  placeholder="เช่น ว 1.1 (1)"
                  className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono"
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
                <select
                  value={draft.nature}
                  onChange={(event) =>
                    setIndicatorDrafts((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, nature: event.target.value as 'formative' | 'summative' } : item
                      )
                    )
                  }
                  className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold"
                >
                  <option value="formative">ระหว่างทาง</option>
                  <option value="summative">ปลายทาง</option>
                </select>
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
                  title="คะแนนเต็ม"
                  className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.passingPercent}
                  onChange={(event) =>
                    setIndicatorDrafts((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, passingPercent: Number(event.target.value) } : item
                      )
                    )
                  }
                  title="เกณฑ์ผ่านขั้นต่ำ (%)"
                  className="px-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono"
                />
                <button
                  type="button"
                  aria-label="ลบตัวชี้วัด"
                  disabled={indicatorDrafts.length <= 1}
                  onClick={() => setIndicatorDrafts((current) => current.filter((_, i) => i !== index))}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setIndicatorDrafts((current) => [
                    ...current,
                    { code: '', title: '', nature: 'formative', maxScore: 5, passingPercent: 50 },
                  ])
                }
                className="seg-tab-btn px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มตัวชี้วัด
              </button>
              <button type="button" onClick={saveSetForm} disabled={saving} className="btn-action-primary px-3 text-xs">
                <Save className="w-3.5 h-3.5" /> {editingSetId ? 'บันทึกการแก้ไขหน่วย' : 'บันทึกชุดตัวชี้วัด'}
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
            {editingSetId && (
              <button
                type="button"
                onClick={() => {
                  setPendingDeleteSetId(editingSetId);
                  setShowSetForm(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> ลบหน่วยนี้
              </button>
            )}
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
                : 'สามารถกด "นำเข้ามาตรฐาน หน่วย 1–3" หรือจัดการ/เพิ่มมาตรฐานเองใน "คลังมาตรฐาน สพฐ./โรงเรียน"'}
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

      {/* School / OBEC Standard Catalog Manager Modal */}
      <BaseModal
        isOpen={showCatalogManager}
        onClose={() => setShowCatalogManager(false)}
        title="คลังมาตรฐานตัวชี้วัด สพฐ. / หลักสูตรสถานศึกษา (ครู & Admin เพิ่ม ลบ แก้ไข ได้)"
        subtitle="กำหนดตัวชี้วัดระหว่างทาง–ปลายทาง คะแนนเต็ม และเกณฑ์ผ่านขั้นต่ำ (%) แล้วดึงใช้กับรายวิชาได้ทันที"
        icon={<BookOpen className="w-4 h-4 text-[var(--color-primary-text)]" />}
        maxWidthClass="max-w-4xl"
        bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden p-0"
      >

            <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="ค้นหารหัสมาตรฐาน / ตัวชี้วัด..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] w-52"
                  />
                </div>
                <select
                  value={catalogAreaFilter}
                  onChange={(e) => setCatalogAreaFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-semibold"
                >
                  <option value="all">ทุกกลุ่มสาระการเรียนรู้ ({schoolCatalog.length})</option>
                  {MOE_LEARNING_AREAS.filter((a) => a.id !== 'activities').map((area) => (
                    <option key={area.id} value={area.nameTh}>
                      {area.nameTh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCatalogDefaults}
                  className="seg-tab-btn px-2.5 py-1.5 text-xs"
                >
                  คืนค่ามาตรฐาน สพฐ. เดิม
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddCatalogItem}
                  className="btn-action-primary px-3 py-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มมาตรฐานตัวชี้วัดใหม่
                </button>
              </div>
            </div>

            {showCatalogForm && (
              <div className="p-4 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] space-y-2.5 text-xs">
                <div className="font-bold text-[var(--color-text-title)]">
                  {editingCatalogItem ? 'แก้ไขมาตรฐานตัวชี้วัดในคลัง' : 'เพิ่มมาตรฐานตัวชี้วัดใหม่เข้าคลังโรงเรียน'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <select
                    value={catalogForm.subjectArea}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, subjectArea: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    {MOE_LEARNING_AREAS.filter((a) => a.id !== 'activities').map((area) => (
                      <option key={area.id} value={area.nameTh}>
                        {area.nameTh}
                      </option>
                    ))}
                  </select>
                  <input
                    value={catalogForm.gradeLevel}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, gradeLevel: e.target.value }))}
                    placeholder="ระดับชั้น เช่น ม.3 / ป.6"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
                  />
                  <input
                    value={catalogForm.standardCode}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, standardCode: e.target.value }))}
                    placeholder="รหัสมาตรฐาน เช่น ว 1.1"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
                  />
                  <input
                    value={catalogForm.indicatorCode}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, indicatorCode: e.target.value }))}
                    placeholder="รหัสตัวชี้วัด เช่น ว 1.1 ม.3/1"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_100px_100px] gap-2">
                  <input
                    value={catalogForm.indicatorTitle}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, indicatorTitle: e.target.value }))}
                    placeholder="คำอธิบายตัวชี้วัดมาตรฐาน สพฐ. / สถานศึกษา"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
                  />
                  <select
                    value={catalogForm.nature}
                    onChange={(e) =>
                      setCatalogForm((p) => ({ ...p, nature: e.target.value as 'formative' | 'summative' }))
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold"
                  >
                    <option value="formative">ระหว่างทาง</option>
                    <option value="summative">ปลายทาง</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={catalogForm.maxScore}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, maxScore: Number(e.target.value) }))}
                    placeholder="คะแนนเต็ม"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={catalogForm.passingPercent}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, passingPercent: Number(e.target.value) }))}
                    placeholder="ผ่าน %"
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCatalogForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCatalogItem}
                    className="btn-action-primary px-3 py-1.5 text-xs"
                  >
                    <Save className="w-3.5 h-3.5" /> บันทึกลงคลัง
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-4 divide-y divide-[var(--color-border)]">
              {filteredSchoolCatalog.map((item) => (
                <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-[var(--color-primary-text)]">
                        {item.indicatorCode}
                      </span>
                      <span className="text-[var(--color-text-muted)]">·</span>
                      <span className="font-semibold text-[var(--color-text-title)]">
                        {item.nature === 'summative' ? 'ตัวชี้วัดปลายทาง' : 'ตัวชี้วัดระหว่างทาง'}
                      </span>
                      <span className="text-[var(--color-text-muted)]">·</span>
                      <span className="font-mono text-[var(--color-text-muted)] tabular-nums">
                        เต็ม {item.maxScore} · ผ่าน ≥ {item.passingPercent}%
                      </span>
                      <span className="text-[var(--color-text-muted)]">·</span>
                      <span className="text-[var(--color-text-muted)] truncate">{item.subjectArea}</span>
                    </div>
                    <div className="text-[var(--color-text-body)]">{item.indicatorTitle}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddCatalogItemToCourse(item)}
                      disabled={saving}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer whitespace-nowrap"
                    >
                      + ดึงเข้าหน่วย{selectedSet ? 'นี้' : 'ใหม่'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCatalogItem(item)}
                      className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                      title="แก้ไขตัวชี้วัดในคลัง"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCatalogItem(item.id)}
                      className="p-1.5 rounded-lg border border-[var(--color-border)] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="ลบตัวชี้วัดออกจากคลัง"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredSchoolCatalog.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                  ไม่พบตัวชี้วัดตามคำค้นหา ลองกด &quot;เพิ่มมาตรฐานตัวชี้วัดใหม่&quot; ด้านบน
                </div>
              )}
            </div>
      </BaseModal>

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
              ยังไม่มีหน่วยการเรียนรู้ กรุณากดปุ่ม &quot;นำเข้ามาตรฐาน หน่วย 1–3&quot; ด้านบนเพื่อเริ่มต้น
            </div>
          ) : (
            <div className="space-y-3">
              {/* Unit cards overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {sets.map((s, idx) => {
                  const maxUnitScore = s.indicators.reduce((sum, ind) => sum + ind.maxScore, 0);
                  const formativeCount = s.indicators.filter((i) => inferIndicatorNature(i) === 'formative').length;
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
                      <th className="px-3 py-2.5 text-center w-12 sticky left-0 z-10 bg-[var(--color-card-subtle)] print:static">ที่</th>
                      <th className="px-3 py-2.5 text-left min-w-[200px] sticky left-12 z-10 bg-[var(--color-card-subtle)] print:static">รหัส / ชื่อ-สกุล</th>
                      <th className="px-2 py-2.5 text-center">ห้อง</th>
                      {sets.map((s, idx) => {
                        const unitMax = s.indicators.reduce((sum, i) => sum + i.maxScore, 0);
                        return (
                          <th key={s.id} className="px-2.5 py-2 text-center min-w-[115px]">
                            <div>หน่วยที่ {idx + 1}</div>
                            <div className="text-[10px] font-normal text-[var(--color-text-muted)]">
                              {s.standardCode || ''} (เต็ม {unitMax})
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-2.5 py-2.5 text-center">ระหว่างทาง</th>
                      <th className="px-2.5 py-2.5 text-center">ปลายทาง</th>
                      <th className="px-2.5 py-2.5 text-center bg-amber-50/70 dark:bg-amber-950/30">รวมทั้งหมด</th>
                      <th className="px-2.5 py-2.5 text-center">ผ่านตัวชี้วัด</th>
                      <th className="px-2.5 py-2.5 text-center">เกณฑ์ สพฐ.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    <PaginatedTableRows
                      items={unitSummaryRows}
                      colSpan={sets.length + 8}
                      pageSize={15}
                      keepAllInDomForPrint
                      emptyState={
                        <p className="py-2 text-center text-[var(--color-text-muted)]">
                          ไม่พบรายชื่อนักเรียนที่ลงทะเบียนในรายวิชานี้
                        </p>
                      }
                      renderRow={(row, idx, hiddenClass) => (
                        <tr key={row.student.id} className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)]`}>
                          <td className="px-3 py-2 text-center font-mono text-[var(--color-text-muted)] sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] print:static">{idx + 1}</td>
                          <td className="px-3 py-2 text-left sticky left-12 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] whitespace-nowrap print:static">
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
                                    {unit.passed ? 'ผ่าน' : 'ซ่อม'} ({unit.passedCount}/{unit.totalCount})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[var(--color-text-muted)]">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2.5 py-2 text-center font-mono">
                            {row.formativeMax > 0 ? `${row.formativeEarned}/${row.formativeMax}` : '—'}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono">
                            {row.summativeMax > 0 ? `${row.summativeEarned}/${row.summativeMax}` : '—'}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20">
                            {row.grandEarned}/{row.grandMax} ({row.grandPct}%)
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono">
                            {row.passedIndicators}/{row.totalIndicators}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            {row.meetsObecSummativeRule ? (
                              <StatusBadge
                                size="xs"
                                status="complete"
                                label={`ผ่าน (${row.feedback.labelTh})`}
                              />
                            ) : (
                              <StatusBadge
                                size="xs"
                                status={row.missingSummativeCount > 0 ? 'pending' : 'delayed'}
                                label={row.missingSummativeCount > 0 ? 'รอผลปลายทาง' : 'ซ่อมเสริม'}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : selectedSet ? (
          <div className="space-y-2">
            {/* Unit standard header with OBEC rules summary */}
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
              {selectedSetStats && (
                <div className="font-mono text-[var(--color-text-muted)] tabular-nums">
                  ระหว่างทาง {selectedSetStats.formativeCount} ข้อ ({selectedSetStats.formativeMax} คะแนน) · ปลายทาง{' '}
                  {selectedSetStats.summativeCount} ข้อ ({selectedSetStats.summativeMax} คะแนน) · รวมเต็ม{' '}
                  <strong className="text-[var(--color-text-title)]">{selectedSetStats.totalMax}</strong>
                </div>
              )}
            </div>

            <div className="overflow-auto rounded-xl border border-[var(--color-border)]">
              <table className="min-w-full text-xs tabular-nums">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-3 py-2 text-left sticky left-0 z-10 bg-[var(--color-card-subtle)] min-w-[210px] print:static">
                      นักเรียน
                    </th>
                    {selectedSet.indicators.map((indicator) => {
                      const nature = inferIndicatorNature(indicator);
                      const passPct = extractPassingPercent(indicator);
                      return (
                        <th key={indicator.id} className="px-2.5 py-2 text-center min-w-[165px] align-top">
                          <div className="font-bold text-[var(--color-text-title)]">
                            {indicator.code || 'ตัวชี้วัด'}{' '}
                            <span
                              className={`text-[10px] font-semibold ${
                                nature === 'summative'
                                  ? 'text-indigo-700 dark:text-indigo-300'
                                  : 'text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              ({nature === 'summative' ? 'ปลายทาง' : 'ระหว่างทาง'})
                            </span>
                          </div>
                          <div className="text-[11px] font-normal text-[var(--color-text-body)] line-clamp-2 mt-0.5">
                            {indicator.title}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--color-primary-text)] mt-0.5">
                            เต็ม {indicator.maxScore} · ผ่าน ≥ {passPct}%
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-2 text-center min-w-[90px] bg-amber-50/70 dark:bg-amber-950/30">
                      รวมหน่วย
                    </th>
                    <th className="px-3 py-2 text-center min-w-[100px]">ผลเกณฑ์ สพฐ.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <PaginatedTableRows
                    items={roster}
                    colSpan={selectedSet.indicators.length + 3}
                    pageSize={15}
                    keepAllInDomForPrint
                    renderRow={(student, _idx, hiddenClass) => {
                    const unitMax = selectedSet.indicators.reduce((sum, i) => sum + i.maxScore, 0);
                    const unitSum = selectedSet.indicators.reduce(
                      (sum, i) => sum + (getScore(student.id, i.id)?.score ?? 0),
                      0
                    );
                    const hasAny = selectedSet.indicators.some((i) => getScore(student.id, i.id) !== undefined);
                    const pct = unitMax > 0 ? Math.round((unitSum / unitMax) * 100) : 0;
                    const failedAnySummative = selectedSet.indicators.some((ind) => {
                      if (inferIndicatorNature(ind) !== 'summative') return false;
                      const sc = getScore(student.id, ind.id);
                      if (!sc) return true;
                      return sc.score < ind.maxScore * (extractPassingPercent(ind) / 100);
                    });

                    return (
                      <tr key={student.id} className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)]`}>
                        <td className="px-3 py-2 sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] whitespace-nowrap font-medium text-[var(--color-text-title)] print:static">
                          {student.studentIdNumber} · {getStudentShortPrefixTh(student)} {student.firstNameTh} {student.lastNameTh}
                        </td>
                        {selectedSet.indicators.map((indicator) => {
                          const entry = getScore(student.id, indicator.id);
                          const passPct = extractPassingPercent(indicator);
                          const isPassing = entry ? entry.score >= indicator.maxScore * (passPct / 100) : null;
                          return (
                            <td key={indicator.id} className="px-2 py-2 text-center">
                              {canEdit ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={indicator.maxScore}
                                    step={0.5}
                                    value={entry?.score ?? ''}
                                    onChange={(event) => updateScore(student.id, indicator, event.target.value)}
                                    className={`w-16 px-2 py-1 rounded-md border text-center font-mono print:border-none ${
                                      isPassing === false
                                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                                        : 'border-[var(--color-border)] bg-[var(--color-card)]'
                                    }`}
                                  />
                                </div>
                              ) : (
                                <span className="font-mono">{entry?.score ?? '-'}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-mono font-bold bg-amber-50/40 dark:bg-amber-950/20">
                          {hasAny ? `${unitSum}/${unitMax}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!hasAny ? (
                            <StatusBadge size="xs" status="pending" label="รอประเมิน" />
                          ) : !failedAnySummative && pct >= 50 ? (
                            <StatusBadge size="xs" status="complete" label={`ผ่าน (${pct}%)`} />
                          ) : (
                            <StatusBadge
                              size="xs"
                              status="delayed"
                              label={failedAnySummative ? `ซ่อมปลายทาง (${pct}%)` : `ไม่ผ่าน (${pct}%)`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  }} />
                </tbody>
              </table>
              {roster.length === 0 && (
                <div className="p-4 text-sm text-[var(--color-text-muted)]">ไม่พบนักเรียนในรายวิชานี้</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            ยังไม่มีชุดตัวชี้วัดสำหรับรายวิชาและภาคเรียนนี้ กดปุ่ม &quot;นำเข้ามาตรฐาน หน่วย 1–3&quot; หรือ &quot;เพิ่มหน่วย/ตัวชี้วัดใหม่&quot; เพื่อเริ่มต้น
          </div>
        )}
      </div>
    </div>
  );
};
