import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Coins,
  Download,
  Eye,
  FileSpreadsheet,
  Gift,
  Globe,
  Layers,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { LEARNING_STRANDS } from '../data/examQuestionBanks';
import {
  buildCentralExamCsvTemplate,
  CENTRAL_EXAMS_UPDATED_EVENT,
  deleteCentralExamPack,
  fetchCentralExamPacks,
  getStrandMeta,
  parseExamQuestionsCsvOrJson,
  upsertCentralExamPack,
} from '../lib/centralExamBank';
import { CentralExamPack, LearningStrandId, QuizQuestion } from '../types';

interface SuperAdminCentralExamManagerProps {
  isDemoMode: boolean;
  adminDisplayName?: string;
}

export const SuperAdminCentralExamManager: React.FC<SuperAdminCentralExamManagerProps> = ({
  isDemoMode,
  adminDisplayName = 'Super Admin',
}) => {
  const [packs, setPacks] = useState<CentralExamPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [strandFilter, setStrandFilter] = useState<LearningStrandId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inspectPackId, setInspectPackId] = useState<string | null>(null);

  // Create Pack Modal
  const [showCreatePackModal, setShowCreatePackModal] = useState(false);
  const [newPackForm, setNewPackForm] = useState<{
    titleTh: string;
    titleEn: string;
    strand: LearningStrandId;
    gradeLevel: string;
    descriptionTh: string;
    pricingType: 'free' | 'paid';
    priceThb: number;
    publishNow: boolean;
  }>({
    titleTh: '',
    titleEn: '',
    strand: 'thai',
    gradeLevel: 'ป.1 - ม.6',
    descriptionTh: '',
    pricingType: 'free',
    priceThb: 390,
    publishNow: false,
  });

  // Add Single Question Modal
  const [addQuestionTargetPackId, setAddQuestionTargetPackId] = useState<string | null>(null);
  const [newQForm, setNewQForm] = useState({
    subject: 'ภาษาไทย',
    gradeLevel: 'ม.3',
    questionTh: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctIndex: 0,
    explanationTh: '',
    points: 100,
  });

  // Import CSV / JSON Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetMode, setImportTargetMode] = useState<'existing' | 'new'>('new');
  const [importExistingPackId, setImportExistingPackId] = useState<string>('');
  const [importNewPackTitle, setImportNewPackTitle] = useState('');
  const [importStrand, setImportStrand] = useState<LearningStrandId>('arts');
  const [importGradeLevel, setImportGradeLevel] = useState('ป.1 - ม.6');
  const [importPricingType, setImportPricingType] = useState<'free' | 'paid'>('free');
  const [importPriceThb, setImportPriceThb] = useState(490);
  const [importPublishNow, setImportPublishNow] = useState(true);
  const [importRawText, setImportRawText] = useState('');

  const loadPacks = async () => {
    setLoading(true);
    const list = await fetchCentralExamPacks(isDemoMode);
    setPacks(list);
    if (!importExistingPackId && list.length > 0) {
      setImportExistingPackId(list[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadPacks();
    const handleUpdate = () => {
      void fetchCentralExamPacks(isDemoMode).then(setPacks);
    };
    window.addEventListener(CENTRAL_EXAMS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CENTRAL_EXAMS_UPDATED_EVENT, handleUpdate);
  }, [isDemoMode]);

  const strandSummary = useMemo(() => {
    return LEARNING_STRANDS.map((strand) => {
      const strandPacks = packs.filter((p) => p.strand === strand.id);
      const publishedCount = strandPacks.filter((p) => p.status === 'published').length;
      const questionCount = strandPacks.reduce((sum, p) => sum + p.questions.length, 0);
      return {
        ...strand,
        packCount: strandPacks.length,
        publishedCount,
        questionCount,
      };
    });
  }, [packs]);

  const totalQuestionsCount = useMemo(
    () => packs.reduce((sum, p) => sum + p.questions.length, 0),
    [packs]
  );

  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      if (strandFilter !== 'all' && p.strand !== strandFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.titleTh.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.descriptionTh.toLowerCase().includes(q) ||
          p.gradeLevel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [packs, strandFilter, statusFilter, searchQuery]);

  const parsedImportPreview = useMemo(() => {
    if (!importRawText.trim()) return [];
    try {
      return parseExamQuestionsCsvOrJson(importRawText, importStrand, importGradeLevel);
    } catch {
      return [];
    }
  }, [importRawText, importStrand, importGradeLevel]);

  const inspectedPack = useMemo(
    () => packs.find((p) => p.id === inspectPackId) || null,
    [packs, inspectPackId]
  );

  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackForm.titleTh.trim()) return;
    const strandMeta = getStrandMeta(newPackForm.strand);
    const now = new Date().toISOString();
    const pack: CentralExamPack = {
      id: `pack-${newPackForm.strand}-${Date.now()}`,
      titleTh: newPackForm.titleTh.trim(),
      titleEn: newPackForm.titleEn.trim() || `${strandMeta.nameEn} Pack`,
      strand: newPackForm.strand,
      gradeLevel: newPackForm.gradeLevel.trim() || 'ป.1 - ม.6',
      descriptionTh:
        newPackForm.descriptionTh.trim() ||
        `ชุดข้อสอบกลางกลุ่มสาระฯ ${strandMeta.nameTh} จัดทำและเผยแพร่โดยส่วนกลาง`,
      pricingType: newPackForm.pricingType,
      priceThb: newPackForm.pricingType === 'free' ? 0 : Math.max(0, Number(newPackForm.priceThb) || 0),
      status: newPackForm.publishNow ? 'published' : 'draft',
      questions: [],
      createdBy: adminDisplayName,
      publishedAt: newPackForm.publishNow ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const res = await upsertCentralExamPack(pack, isDemoMode);
    setPacks(res.packs);
    setShowCreatePackModal(false);
    setInspectPackId(pack.id);
    setNewPackForm({
      titleTh: '',
      titleEn: '',
      strand: 'thai',
      gradeLevel: 'ป.1 - ม.6',
      descriptionTh: '',
      pricingType: 'free',
      priceThb: 390,
      publishNow: false,
    });
    setFeedbackMessage({
      type: 'success',
      text: pack.status === 'published'
        ? `สร้างและเผยแพร่ชุดข้อสอบ "${pack.titleTh}" เรียบร้อยแล้ว แอดมินโรงเรียนจะเห็น Pop-up แจ้งเตือนทันที`
        : `บันทึกชุดข้อสอบ "${pack.titleTh}" เป็นฉบับร่างแล้ว คุณสามารถเพิ่มข้อสอบและตั้งราคา ฟรี/แบบซื้อ ก่อนเผยแพร่ได้`,
    });
  };

  const handleTogglePricing = async (pack: CentralExamPack, pricingType: 'free' | 'paid', priceThb?: number) => {
    const updated: CentralExamPack = {
      ...pack,
      pricingType,
      priceThb: pricingType === 'free' ? 0 : Math.max(0, Number(priceThb ?? (pack.priceThb || 390))),
      updatedAt: new Date().toISOString(),
    };
    const res = await upsertCentralExamPack(updated, isDemoMode);
    setPacks(res.packs);
    setFeedbackMessage({
      type: 'success',
      text:
        pricingType === 'free'
          ? `ตั้งค่า "${pack.titleTh}" เป็น แจกฟรี (Free)`
          : `ตั้งราคา "${pack.titleTh}" เป็น ฿${updated.priceThb.toLocaleString()} / โรงเรียน`,
    });
  };

  const handleTogglePublish = async (pack: CentralExamPack) => {
    const nextStatus = pack.status === 'published' ? 'draft' : 'published';
    if (nextStatus === 'published' && pack.questions.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'กรุณาเพิ่มหรือนำเข้าข้อสอบอย่างน้อย 1 ข้อก่อนกดเผยแพร่ไปยังโรงเรียน',
      });
      return;
    }
    const updated: CentralExamPack = {
      ...pack,
      status: nextStatus,
      publishedAt: nextStatus === 'published' ? new Date().toISOString() : pack.publishedAt,
      updatedAt: new Date().toISOString(),
    };
    const res = await upsertCentralExamPack(updated, isDemoMode);
    setPacks(res.packs);
    setFeedbackMessage({
      type: 'success',
      text:
        nextStatus === 'published'
          ? `เผยแพร่ "${pack.titleTh}" (${pack.pricingType === 'free' ? 'ฟรี' : `฿${pack.priceThb}`}) สำเร็จ! Pop-up แจ้งเตือนข้อสอบใหม่จะแสดงให้แอดมินโรงเรียนรับหรือซื้อทันที`
          : `เปลี่ยนสถานะ "${pack.titleTh}" กลับเป็นฉบับร่าง (Draft) แล้ว`,
    });
  };

  const handleDeletePack = async (pack: CentralExamPack) => {
    const res = await deleteCentralExamPack(pack.id, isDemoMode);
    setPacks(res.packs);
    if (inspectPackId === pack.id) setInspectPackId(null);
    setFeedbackMessage({
      type: 'success',
      text: `ลบชุดข้อสอบ "${pack.titleTh}" เรียบร้อยแล้ว`,
    });
  };

  const openAddQuestionForPack = (pack: CentralExamPack) => {
    const strandMeta = getStrandMeta(pack.strand);
    setAddQuestionTargetPackId(pack.id);
    setNewQForm({
      subject: strandMeta.nameTh,
      gradeLevel: pack.gradeLevel || 'ม.3',
      questionTh: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctIndex: 0,
      explanationTh: '',
      points: 100,
    });
  };

  const handleSaveQuestionToPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuestionTargetPackId) return;
    const targetPack = packs.find((p) => p.id === addQuestionTargetPackId);
    if (!targetPack) return;

    const createdQ: QuizQuestion = {
      id: `cen-q-${Date.now()}`,
      packId: targetPack.id,
      strand: targetPack.strand,
      subject: newQForm.subject.trim() || getStrandMeta(targetPack.strand).nameTh,
      gradeLevel: newQForm.gradeLevel.trim() || targetPack.gradeLevel,
      category: 'standard_exam',
      questionTh: newQForm.questionTh.trim(),
      questionEn: '',
      options: [
        newQForm.optionA.trim(),
        newQForm.optionB.trim(),
        newQForm.optionC.trim(),
        newQForm.optionD.trim(),
      ],
      correctIndex: newQForm.correctIndex,
      explanationTh: newQForm.explanationTh.trim() || 'เฉลยตามมาตรฐานหลักสูตร 8 กลุ่มสาระการเรียนรู้',
      points: Number(newQForm.points) || 100,
    };

    const updatedPack: CentralExamPack = {
      ...targetPack,
      questions: [createdQ, ...targetPack.questions],
      updatedAt: new Date().toISOString(),
    };
    const res = await upsertCentralExamPack(updatedPack, isDemoMode);
    setPacks(res.packs);
    setAddQuestionTargetPackId(null);
    setInspectPackId(targetPack.id);
    setFeedbackMessage({
      type: 'success',
      text: `เพิ่มข้อสอบใหม่เข้าชุด "${targetPack.titleTh}" แล้ว (รวม ${updatedPack.questions.length} ข้อ)`,
    });
  };

  const handleRemoveQuestionFromPack = async (pack: CentralExamPack, questionId: string) => {
    const updatedPack: CentralExamPack = {
      ...pack,
      questions: pack.questions.filter((q) => q.id !== questionId),
      updatedAt: new Date().toISOString(),
    };
    const res = await upsertCentralExamPack(updatedPack, isDemoMode);
    setPacks(res.packs);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = buildCentralExamCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EduVerse_Central_Exam_Template_8Strands.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setImportRawText(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedImportPreview.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'ไม่พบข้อสอบที่อ่านได้จากไฟล์ CSV/JSON กรุณาตรวจสอบรูปแบบคอลัมน์หรือดาวน์โหลดเทมเพลตตัวอย่าง',
      });
      return;
    }

    const now = new Date().toISOString();

    if (importTargetMode === 'existing' && importExistingPackId) {
      const targetPack = packs.find((p) => p.id === importExistingPackId);
      if (!targetPack) return;
      const tagged = parsedImportPreview.map((q) => ({
        ...q,
        packId: targetPack.id,
        strand: targetPack.strand,
      }));
      const updatedPack: CentralExamPack = {
        ...targetPack,
        questions: [...tagged, ...targetPack.questions],
        updatedAt: now,
      };
      const res = await upsertCentralExamPack(updatedPack, isDemoMode);
      setPacks(res.packs);
      setInspectPackId(targetPack.id);
      setShowImportModal(false);
      setImportRawText('');
      setFeedbackMessage({
        type: 'success',
        text: `นำเข้าข้อสอบ ${tagged.length} ข้อเข้าชุด "${targetPack.titleTh}" เรียบร้อยแล้ว`,
      });
      return;
    }

    const strandMeta = getStrandMeta(importStrand);
    const packId = `pack-${importStrand}-${Date.now()}`;
    const tagged = parsedImportPreview.map((q) => ({
      ...q,
      packId,
      strand: importStrand,
    }));
    const newPack: CentralExamPack = {
      id: packId,
      titleTh: importNewPackTitle.trim() || `ชุดข้อสอบนำเข้า: ${strandMeta.nameTh} (${tagged.length} ข้อ)`,
      titleEn: `Imported ${strandMeta.nameEn} Pack`,
      strand: importStrand,
      gradeLevel: importGradeLevel.trim() || 'ป.1 - ม.6',
      descriptionTh: `ชุดข้อสอบกลางนำเข้าโดย Super Admin กลุ่มสาระฯ ${strandMeta.nameTh} จำนวน ${tagged.length} ข้อ`,
      pricingType: importPricingType,
      priceThb: importPricingType === 'free' ? 0 : Math.max(0, Number(importPriceThb) || 0),
      status: importPublishNow ? 'published' : 'draft',
      questions: tagged,
      createdBy: adminDisplayName,
      publishedAt: importPublishNow ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const res = await upsertCentralExamPack(newPack, isDemoMode);
    setPacks(res.packs);
    setInspectPackId(newPack.id);
    setShowImportModal(false);
    setImportRawText('');
    setImportNewPackTitle('');
    setFeedbackMessage({
      type: 'success',
      text: importPublishNow
        ? `นำเข้าและเผยแพร่ชุดข้อสอบ "${newPack.titleTh}" (${tagged.length} ข้อ • ${newPack.pricingType === 'free' ? 'ฟรี' : `฿${newPack.priceThb}`}) ไปยังโรงเรียนทั้งหมดแล้ว`
        : `นำเข้าข้อสอบ ${tagged.length} ข้อเป็นฉบับร่างสำเร็จ สามารถปรับราคา ฟรี/แบบซื้อ ก่อนกดเผยแพร่ได้`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Action Buttons */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--color-primary-text)]">
            <BookOpen className="w-4 h-4" />
            <span>คลังข้อสอบกลาง 8 กลุ่มสาระการเรียนรู้ (Central Exam Distribution)</span>
            <span className="text-[var(--color-text-muted)] font-normal">
              · {packs.length} ชุด · {totalQuestionsCount} ข้อ
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[var(--color-text-title)]">
            สร้าง นำเข้า ตั้งราคา (ฟรี / แบบซื้อ) และเผยแพร่ข้อสอบกลางสู่ทุกโรงเรียน
          </h3>
          <p className="text-xs text-[var(--color-text-body)]">
            เมื่อ Super Admin กดเผยแพร่ชุดข้อสอบ ระบบจะส่ง Pop-up แจ้งเตือนข้อสอบใหม่ไปที่หน้าแอดมินโรงเรียนเพื่อกดรับฟรีหรือสั่งซื้อเข้าคลังโรงเรียนทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>เทมเพลต CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>นำเข้า CSV / JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreatePackModal(true)}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างชุดข้อสอบกลางใหม่</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
          }`}
        >
          <span className="font-semibold">{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 rounded hover:bg-black/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 8-Strand Coverage Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {strandSummary.map((s) => {
          const isSelected = strandFilter === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStrandFilter(isSelected ? 'all' : s.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                  : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono">
                  {s.code}
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">{s.publishedCount}/{s.packCount}</span>
              </div>
              <div className="text-xs font-bold text-[var(--color-text-title)] mt-1.5 line-clamp-1">
                {s.nameTh}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                {s.questionCount} ข้อ
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อชุดข้อสอบ ระดับชั้น หรือคำอธิบาย..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={strandFilter}
            onChange={(e) => setStrandFilter(e.target.value as LearningStrandId | 'all')}
            className="px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-medium"
          >
            <option value="all">ทุกกลุ่มสาระฯ (8 สาระ)</option>
            {LEARNING_STRANDS.map((s) => (
              <option key={s.id} value={s.id}>
                ({s.code}) {s.nameTh}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-medium"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="published">เผยแพร่แล้ว (Published)</option>
            <option value="draft">ฉบับร่าง (Draft)</option>
          </select>
        </div>
      </div>

      {/* Pack List */}
      {loading ? (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-8 text-center text-xs text-[var(--color-text-muted)]">
          กำลังโหลดคลังข้อสอบกลาง 8 สาระการเรียนรู้...
        </div>
      ) : filteredPacks.length === 0 ? (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-8 text-center space-y-2">
          <p className="text-sm font-bold text-[var(--color-text-title)]">ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            ลองเปลี่ยนตัวกรองสาระวิชา หรือกด "สร้างชุดข้อสอบกลางใหม่" เพื่อเริ่มต้น
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPacks.map((pack) => {
            const strandMeta = getStrandMeta(pack.strand);
            const isInspecting = inspectPackId === pack.id;
            return (
              <div
                key={pack.id}
                className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)]">
                          {strandMeta.code} · {strandMeta.nameTh}
                        </span>
                        <span className="text-[var(--color-text-muted)]">· {pack.gradeLevel}</span>
                        <span className="text-[var(--color-text-muted)] tabular-nums">· {pack.questions.length} ข้อ</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-[var(--color-text-title)] leading-snug">
                        {pack.titleTh}
                      </h4>
                      <p className="text-xs text-[var(--color-text-body)] line-clamp-2">
                        {pack.descriptionTh}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                        pack.status === 'published'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {pack.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                    </span>
                  </div>

                  {/* Pre-Publish Pricing Selector (Free vs Paid) */}
                  <div className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-title)]">รูปแบบการเผยแพร่:</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePricing(pack, 'free', 0)}
                        className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition ${
                          pack.pricingType === 'free'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <Gift className="w-3 h-3" />
                        <span>ฟรี</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePricing(pack, 'paid', pack.priceThb > 0 ? pack.priceThb : 390)}
                        className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer transition ${
                          pack.pricingType === 'paid'
                            ? 'bg-amber-600 text-white'
                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>แบบซื้อ</span>
                      </button>
                    </div>

                    {pack.pricingType === 'paid' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--color-text-muted)]">ราคา (฿):</span>
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={pack.priceThb}
                          onChange={(e) => handleTogglePricing(pack, 'paid', Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-title)] tabular-nums"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        โรงเรียนกดรับใช้ฟรี
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectPackId(isInspecting ? null : pack.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isInspecting ? 'ซ่อนข้อสอบ' : `ดูข้อสอบ (${pack.questions.length})`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddQuestionForPack(pack)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มข้อสอบ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportTargetMode('existing');
                        setImportExistingPackId(pack.id);
                        setImportStrand(pack.strand);
                        setShowImportModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>นำเข้าเพิ่ม</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(pack)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        pack.status === 'published'
                          ? 'border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-amber-50'
                          : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{pack.status === 'published' ? 'ย้ายเป็นฉบับร่าง' : 'กดเผยแพร่'}</span>
                    </button>
                    {!pack.id.startsWith('pack-cen-') && (
                      <button
                        type="button"
                        onClick={() => handleDeletePack(pack)}
                        className="p-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 cursor-pointer"
                        title="ลบชุดข้อสอบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspected Pack Question List Drawer */}
      {inspectedPack && (
        <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div>
              <div className="text-xs font-bold text-[var(--color-primary-text)]">
                รายการข้อสอบในชุด: {inspectedPack.titleTh}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                ทั้งหมด {inspectedPack.questions.length} ข้อ ·{' '}
                {inspectedPack.pricingType === 'free' ? 'เผยแพร่ฟรี' : `แบบซื้อ ฿${inspectedPack.priceThb.toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAddQuestionForPack(inspectedPack)}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มข้อสอบรายข้อ</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectPackId(null)}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
              >
                ปิดรายการ
              </button>
            </div>
          </div>

          {inspectedPack.questions.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
              ยังไม่มีข้อสอบในชุดนี้ กด "เพิ่มข้อสอบรายข้อ" หรือ "นำเข้าเพิ่ม" เพื่อเติมข้อสอบ
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {inspectedPack.questions.map((q, index) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-bold text-[var(--color-text-title)]">
                      {index + 1}. {q.questionTh}
                      <span className="ml-2 text-[11px] font-normal text-[var(--color-text-muted)]">
                        ({q.subject} · {q.gradeLevel})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestionFromPack(inspectedPack, q.id)}
                      className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                      title="ลบข้อนี้ออก"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`px-2.5 py-1.5 rounded border ${
                          oIdx === q.correctIndex
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    เฉลย: {q.explanationTh}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE PACK MODAL */}
      {showCreatePackModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>สร้างชุดข้อสอบกลางใหม่</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatePackModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePack} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  ชื่อชุดข้อสอบกลาง (ภาษาไทย) *
                </label>
                <input
                  type="text"
                  required
                  value={newPackForm.titleTh}
                  onChange={(e) => setNewPackForm({ ...newPackForm, titleTh: e.target.value })}
                  placeholder="เช่น คลังข้อสอบกลาง สาระศิลปะ & นาฏศิลป์ ระดับ ป.4-ม.3"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--color-text-title)] mb-1">กลุ่มสาระการเรียนรู้ *</label>
                  <select
                    value={newPackForm.strand}
                    onChange={(e) => setNewPackForm({ ...newPackForm, strand: e.target.value as LearningStrandId })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    {LEARNING_STRANDS.map((s) => (
                      <option key={s.id} value={s.id}>
                        ({s.code}) {s.nameTh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[var(--color-text-title)] mb-1">ระดับชั้นเป้าหมาย</label>
                  <input
                    type="text"
                    value={newPackForm.gradeLevel}
                    onChange={(e) => setNewPackForm({ ...newPackForm, gradeLevel: e.target.value })}
                    placeholder="เช่น ป.1 - ป.6 หรือ ม.4 - ม.6"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">คำอธิบายชุดข้อสอบ</label>
                <textarea
                  rows={2}
                  value={newPackForm.descriptionTh}
                  onChange={(e) => setNewPackForm({ ...newPackForm, descriptionTh: e.target.value })}
                  placeholder="ระบุขอบเขตเนื้อหาหรือจุดประสงค์การใช้ข้อสอบชุดนี้..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              {/* Free vs Paid Selection BEFORE Publishing */}
              <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2.5">
                <div className="font-bold text-[var(--color-text-title)]">
                  เลือกเงื่อนไขการให้บริการแก่โรงเรียน (กำหนดก่อนเผยแพร่)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPackForm({ ...newPackForm, pricingType: 'free', priceThb: 0 })}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      newPackForm.pricingType === 'free'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-4 h-4" />
                      <span>เผยแพร่ฟรี (Free)</span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">แอดมินโรงเรียนกดรับเข้าโรงเรียนได้ทันที</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewPackForm({
                        ...newPackForm,
                        pricingType: 'paid',
                        priceThb: newPackForm.priceThb > 0 ? newPackForm.priceThb : 390,
                      })
                    }
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      newPackForm.pricingType === 'paid'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                        : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4" />
                      <span>แบบซื้อ (Paid License)</span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">โรงเรียนสั่งซื้อสิทธิ์รายปี/รายชุด</div>
                  </button>
                </div>

                {newPackForm.pricingType === 'paid' && (
                  <div>
                    <label className="block font-bold text-[var(--color-text-title)] mb-1">
                      ราคาจำหน่ายต่อโรงเรียน (บาท)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newPackForm.priceThb}
                      onChange={(e) => setNewPackForm({ ...newPackForm, priceThb: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePackModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold cursor-pointer"
                >
                  บันทึกชุดข้อสอบ (ฉบับร่าง)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SINGLE QUESTION MODAL */}
      {addQuestionTargetPackId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>เพิ่มข้อสอบรายข้อเข้าชุดกลาง</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddQuestionTargetPackId(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionToPack} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--color-text-title)] mb-1">รายวิชา / สาระ</label>
                  <input
                    type="text"
                    required
                    value={newQForm.subject}
                    onChange={(e) => setNewQForm({ ...newQForm, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--color-text-title)] mb-1">ระดับชั้น</label>
                  <input
                    type="text"
                    required
                    value={newQForm.gradeLevel}
                    onChange={(e) => setNewQForm({ ...newQForm, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">คำถาม (ภาษาไทย) *</label>
                <textarea
                  rows={2}
                  required
                  value={newQForm.questionTh}
                  onChange={(e) => setNewQForm({ ...newQForm, questionTh: e.target.value })}
                  placeholder="พิมพ์โจทย์คำถาม..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-[var(--color-text-title)]">ตัวเลือก 4 ข้อ (เลือกข้อที่ถูกต้อง)</label>
                {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((field, idx) => (
                  <div key={field} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="centralCorrect"
                      checked={newQForm.correctIndex === idx}
                      onChange={() => setNewQForm({ ...newQForm, correctIndex: idx })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="w-5 font-bold text-[var(--color-text-title)]">{String.fromCharCode(65 + idx)}.</span>
                    <input
                      type="text"
                      required
                      value={newQForm[field]}
                      onChange={(e) => setNewQForm({ ...newQForm, [field]: e.target.value })}
                      placeholder={`ตัวเลือก ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">คำอธิบายเฉลย</label>
                <textarea
                  rows={2}
                  value={newQForm.explanationTh}
                  onChange={(e) => setNewQForm({ ...newQForm, explanationTh: e.target.value })}
                  placeholder="อธิบายวิธีคิดและเหตุผลของคำตอบ..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddQuestionTargetPackId(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold cursor-pointer"
                >
                  บันทึกข้อสอบเข้าชุดกลาง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT CSV / JSON MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-extrabold text-[var(--color-text-title)] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>นำเข้าข้อสอบกลางจำนวนมาก (CSV / JSON)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmImport} className="space-y-3.5 text-xs">
              {/* Target mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportTargetMode('new')}
                  className={`p-2.5 rounded-lg border font-bold text-left cursor-pointer ${
                    importTargetMode === 'new'
                      ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                  }`}
                >
                  สร้างเป็นชุดข้อสอบกลางใหม่
                </button>
                <button
                  type="button"
                  onClick={() => setImportTargetMode('existing')}
                  className={`p-2.5 rounded-lg border font-bold text-left cursor-pointer ${
                    importTargetMode === 'existing'
                      ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                  }`}
                >
                  เพิ่มเข้าชุดข้อสอบที่มีอยู่
                </button>
              </div>

              {importTargetMode === 'existing' ? (
                <div>
                  <label className="block font-bold text-[var(--color-text-title)] mb-1">เลือกชุดข้อสอบปลายทาง</label>
                  <select
                    value={importExistingPackId}
                    onChange={(e) => setImportExistingPackId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    {packs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titleTh} ({p.questions.length} ข้อ)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <div>
                    <label className="block font-bold text-[var(--color-text-title)] mb-1">ชื่อชุดข้อสอบใหม่</label>
                    <input
                      type="text"
                      value={importNewPackTitle}
                      onChange={(e) => setImportNewPackTitle(e.target.value)}
                      placeholder="เช่น ชุดข้อสอบกลางภาค 2569 - ศิลปะ & ดนตรี"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[var(--color-text-title)] mb-1">กลุ่มสาระวิชา</label>
                      <select
                        value={importStrand}
                        onChange={(e) => setImportStrand(e.target.value as LearningStrandId)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                      >
                        {LEARNING_STRANDS.map((s) => (
                          <option key={s.id} value={s.id}>
                            ({s.code}) {s.nameTh}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-[var(--color-text-title)] mb-1">ระดับชั้น</label>
                      <input
                        type="text"
                        value={importGradeLevel}
                        onChange={(e) => setImportGradeLevel(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                      />
                    </div>
                  </div>

                  {/* Pre-publish pricing selection inside Import */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-title)]">เลือกประเภทก่อนเผยแพร่:</span>
                      <button
                        type="button"
                        onClick={() => setImportPricingType('free')}
                        className={`px-3 py-1 rounded-md font-bold cursor-pointer ${
                          importPricingType === 'free'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        ฟรี (Free)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportPricingType('paid')}
                        className={`px-3 py-1 rounded-md font-bold cursor-pointer ${
                          importPricingType === 'paid'
                            ? 'bg-amber-600 text-white'
                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        แบบซื้อ (Paid)
                      </button>
                    </div>

                    {importPricingType === 'paid' && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--color-text-title)]">ราคา ฿</span>
                        <input
                          type="number"
                          min={1}
                          value={importPriceThb}
                          onChange={(e) => setImportPriceThb(Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold tabular-nums"
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 font-semibold text-[var(--color-text-title)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importPublishNow}
                      onChange={(e) => setImportPublishNow(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span>เผยแพร่ไปยังโรงเรียนทันที (ส่ง Pop-up แจ้งเตือนแอดมินโรงเรียนอัตโนมัติ)</span>
                  </label>
                </div>
              )}

              {/* Upload / Paste Area */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-[var(--color-text-title)]">เลือกไฟล์ .CSV / .JSON หรือวางข้อมูลด้านล่าง</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="text-[11px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                    >
                      ดาวน์โหลดไฟล์เทมเพลต CSV
                    </button>
                    <label className="px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>เลือกไฟล์</span>
                      <input type="file" accept=".csv,.json" onChange={handleImportFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder="subject,gradeLevel,questionTh,optionA,optionB,optionC,optionD,correctIndex,explanationTh,points,strand"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-text-title)]"
                />
              </div>

              {/* Preview */}
              <div className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-bold text-[var(--color-text-title)]">
                  ผลการวิเคราะห์ไฟล์: พบข้อสอบพร้อมนำเข้า {parsedImportPreview.length} ข้อ
                </span>
                {parsedImportPreview.length > 0 && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    รูปแบบถูกต้อง
                  </span>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={parsedImportPreview.length === 0}
                  className="px-5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold cursor-pointer"
                >
                  ยืนยันนำเข้า ({parsedImportPreview.length} ข้อ)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
