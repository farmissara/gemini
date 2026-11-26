import React, { useRef, useState } from 'react';
import { 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  Upload, 
  Plus, 
  X, 
  RotateCw,
  AlertTriangle
} from 'lucide-react';
import { PagedList } from '../components/PagedList';
import { RealWorldSnapQuest, AppLanguage, UserRole, AuthUser, PortfolioItem } from '../types';
import { INITIAL_REAL_WORLD_QUESTS } from '../data/innovativeFeaturesData';
import { getModuleTone } from '../lib/moduleTheme';
import { compressImageFileToDataUrl } from '../lib/imageCompression';
import { postLearningAi } from '../lib/learningAiClient';
import { FutureNavIcon } from '../components/common/FutureIcon';

interface RealWorldSnapQuestViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  schoolId?: string;
  currentUser?: AuthUser | null;
  onAwardPortfolioItem?: (item: PortfolioItem) => void;
}

export const RealWorldSnapQuestView: React.FC<RealWorldSnapQuestViewProps> = ({
  lang = 'th',
  currentRole = 'student',
  schoolId,
  currentUser,
  onAwardPortfolioItem,
}) => {
  const [quests, setQuests] = useState<RealWorldSnapQuest[]>(INITIAL_REAL_WORLD_QUESTS);
  const [savedPortfolioQuestIds, setSavedPortfolioQuestIds] = useState<string[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [activeQuestForUpload, setActiveQuestForUpload] = useState<RealWorldSnapQuest | null>(null);

  // Real Camera / Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<string>('');
  const [studentNote, setStudentNote] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Teacher custom quest creation modal
  const [showTeacherAddQuest, setShowTeacherAddQuest] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<'biology' | 'math' | 'physics' | 'english'>('biology');
  const [newScenario, setNewScenario] = useState('');
  const [newExample, setNewExample] = useState('');

  const filteredQuests = quests.filter(q => {
    if (selectedSubjectFilter !== 'all' && q.subject !== selectedSubjectFilter) return false;
    return true;
  });

  const handleStartUpload = (quest: RealWorldSnapQuest) => {
    setActiveQuestForUpload(quest);
    setUploadedPhotoDataUrl('');
    setStudentNote('');
    setVerifyError(null);
  };

  const handlePhotoFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setVerifyError(lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG / PNG / WebP)' : 'Please choose an image file.');
      return;
    }

    setVerifyError(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, {
        maxDimension: 960,
        quality: 0.78,
        maxDataUrlLength: 450_000,
        mimeType: 'image/jpeg',
      });
      if (!compressed.startsWith('data:image/')) {
        throw new Error('Invalid image payload');
      }
      setUploadedPhotoDataUrl(compressed);
    } catch {
      setVerifyError(lang === 'th' ? 'ไม่สามารถอ่านหรือย่อขนาดภาพได้ กรุณาลองใหม่อีกครั้ง' : 'Could not process the selected image.');
    }
  };

  const handleVerifyWithGemini = async () => {
    if (!activeQuestForUpload || isAiAnalyzing) return;
    if (!uploadedPhotoDataUrl) {
      setVerifyError(lang === 'th' ? 'กรุณาถ่ายภาพหรือเลือกไฟล์ภาพก่อนส่งตรวจ' : 'Please capture or upload a photo first.');
      return;
    }

    setIsAiAnalyzing(true);
    setVerifyError(null);

    try {
      const data = await postLearningAi<{
        verification: {
          identifiedObject: string;
          confidencePercent: number;
          feedbackTh: string;
          isPass: boolean;
        };
      }>('/api/learning-ai/snap-quest-verify', {
        questTitle: activeQuestForUpload.titleTh,
        subject: activeQuestForUpload.subject,
        scenario: activeQuestForUpload.scenarioTh,
        instruction: activeQuestForUpload.instructionTh,
        studentNote: studentNote.trim() || undefined,
        imageDataUrl: uploadedPhotoDataUrl,
        lang,
      });

      const updatedQuest: RealWorldSnapQuest = {
        ...activeQuestForUpload,
        status: 'submitted',
        submittedPhotoUrl: uploadedPhotoDataUrl,
        aiVerificationResult: {
          identifiedObject: data.verification.identifiedObject,
          confidencePercent: Math.round(Number(data.verification.confidencePercent) || 0),
          feedbackTh: data.verification.feedbackTh,
          isPass: Boolean(data.verification.isPass),
        },
      };

      setQuests(prev => prev.map(q => q.id === activeQuestForUpload.id ? updatedQuest : q));
      setActiveQuestForUpload(null);
    } catch (error) {
      setVerifyError(
        error instanceof Error
          ? error.message
          : lang === 'th'
          ? 'ไม่สามารถส่งภาพตรวจผ่าน AI ได้ในขณะนี้'
          : 'Failed to verify photo with AI.'
      );
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleCreateQuestByTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: RealWorldSnapQuest = {
      id: `rwq-${Date.now()}`,
      subject: newSubject,
      titleTh: newTitle,
      titleEn: newTitle,
      scenarioTh: newScenario || 'ออกไปถ่ายรูปสิ่งของจริงที่สะท้อนบทเรียนในชีวิตประจำวัน',
      instructionTh: 'ถ่ายรูป 1 รูปให้เห็นสิ่งของชัดเจน พร้อมระบุชื่อ',
      exampleObjectTh: newExample || 'สิ่งของรอบตัว',
      rewardXp: 150,
      rewardTokens: 50,
      status: 'available',
    };

    setQuests(prev => [created, ...prev]);
    setShowTeacherAddQuest(false);
    setNewTitle('');
    setNewScenario('');
    setNewExample('');
  };

  const getSubjectBadge = (subj: string) => {
    switch (subj) {
      case 'biology': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">ชีววิทยา</span>;
      case 'math': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700">คณิตศาสตร์</span>;
      case 'physics': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700">ฟิสิกส์</span>;
      case 'english': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">ภาษาอังกฤษ</span>;
      default: return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border border-[var(--color-border)]">ทั่วไป</span>;
    }
  };

  return (
    <div className={`space-y-5 pb-12 ${getModuleTone('realworld_quests')}`}>
      {/* Top Banner Header */}
      <div className="app-page-header p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 max-w-2xl">
            <div className="w-11 h-11 rounded-xl tone-chip shrink-0 mt-0.5">
              <FutureNavIcon tab="realworld_quests" size={22} active />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--tone-soft)] border border-[var(--color-border)] text-[var(--tone)] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เควสต์สำรวจชีวิตจริง • ตรวจภาพด้วย Gemini Vision' : 'Real-World Vision Quest'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-text-title)]">
                {lang === 'th' ? 'ภารกิจแปลงบทเรียนสู่ชีวิตจริง' : 'Real-World Missions'}
              </h1>
              <p className="text-[var(--color-text-body)] text-xs sm:text-sm leading-relaxed">
                {lang === 'th'
                  ? 'ถ่ายภาพสิ่งของรอบตัวที่เชื่อมโยงกับบทเรียน แล้วให้ Gemini Vision ช่วยประเมินความสอดคล้องเบื้องต้นก่อนส่งครูยืนยันผล'
                  : 'Capture real-world examples around you and let Gemini Vision provide initial academic feedback before teacher review.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Teacher Add Quest Button */}
            {(currentRole === 'teacher' || currentRole === 'admin') && (
              <button
                type="button"
                onClick={() => setShowTeacherAddQuest(true)}
                className="btn-action-primary"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'ครูสั่งเควสต์ใหม่' : 'Teacher Add Quest'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="toolbar-filter-zone flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold text-[var(--color-text-title)]">
            {lang === 'th' ? 'หมวดหมู่วิชา:' : 'Category:'}
          </span>
          <div className="seg-tab-group">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'biology', label: 'ชีววิทยา' },
              { id: 'math', label: 'คณิตศาสตร์' },
              { id: 'physics', label: 'ฟิสิกส์' },
              { id: 'english', label: 'ภาษาอังกฤษ' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                data-active={selectedSubjectFilter === tab.id}
                onClick={() => setSelectedSubjectFilter(tab.id)}
                className="seg-tab-btn"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-[var(--color-text-muted)] font-medium">
          {quests.filter(q => q.status === 'verified').length} {lang === 'th' ? 'ภารกิจยืนยันโดยครู' : 'teacher-verified quests'} • {quests.filter(q => q.status === 'submitted').length} {lang === 'th' ? 'รอครูยืนยันผล' : 'submitted for review'}
        </span>
      </div>

      {/* Quests Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PagedList items={filteredQuests} pageSize={2} renderItem={(quest) => {
          const isVerified = quest.status === 'verified';
          const hasDemoResult = Boolean(quest.aiVerificationResult);
          return (
            <div
              key={quest.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                isVerified 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 shadow-xs' 
                  : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-emerald-500 shadow-xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getSubjectBadge(quest.subject)}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                    <span>{lang === 'th' ? `รางวัลเมื่อครูยืนยัน: ${quest.rewardXp} XP` : `After teacher review: ${quest.rewardXp} XP`}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[var(--color-text-title)]">
                  {quest.titleTh}
                </h3>
                <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                  {quest.scenarioTh}
                </p>

                {/* Example Objects Pill */}
                <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs">
                  <span className="font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ตัวอย่างสิ่งของที่ใช้ส่งได้:' : 'Examples:'}
                  </span>{' '}
                  <span className="text-[var(--color-text-body)]">
                    {quest.exampleObjectTh}
                  </span>
                </div>

                {/* If verified, show result summary */}
                {quest.aiVerificationResult && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    quest.aiVerificationResult.isPass
                      ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                  }`}>
                    <p className="font-bold flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{quest.aiVerificationResult.identifiedObject}</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80">
                        {quest.aiVerificationResult.confidencePercent}%
                      </span>
                    </p>
                    <p className="text-[11px] opacity-90">
                      {quest.aiVerificationResult.feedbackTh}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                  {isVerified
                    ? (lang === 'th' ? 'ครูยืนยันแล้ว' : 'Teacher verified')
                    : hasDemoResult
                    ? (lang === 'th' ? 'AI ตรวจแล้ว • รอยืนยันจากครู' : 'AI checked • awaiting teacher')
                    : (lang === 'th' ? 'รอส่งรูปถ่าย' : 'Ready for photo upload')}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {hasDemoResult && onAwardPortfolioItem && (
                    <button
                      type="button"
                      disabled={savedPortfolioQuestIds.includes(quest.id)}
                      onClick={() => {
                        onAwardPortfolioItem({
                          id: `port-quest-${quest.id}-${Date.now()}`,
                          schoolId,
                          ownerId: currentUser?.studentRecordId || currentUser?.id || 'stu-quest',
                          ownerRole: currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin' ? 'teacher' : 'student',
                          ownerName: currentUser?.fullNameTh || 'ผู้เรียน BaanPakKru',
                          title: `ภารกิจสำรวจจริง: ${quest.titleTh}`,
                          category: 'activity',
                          year: String(new Date().getFullYear() + 543),
                          description:
                            quest.aiVerificationResult?.identifiedObject || quest.scenarioTh,
                          imageUrl: quest.submittedPhotoUrl,
                          skills: [quest.subject, 'Real-World Application'],
                          certifiedBySchool: isVerified,
                          scoreBonus: 10,
                        });
                        setSavedPortfolioQuestIds((prev) => [...prev, quest.id]);
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                    >
                      {savedPortfolioQuestIds.includes(quest.id) ? '✓ ลง Portfolio แล้ว' : 'เพิ่มลง Portfolio'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartUpload(quest)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      hasDemoResult
                        ? 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] hover:opacity-90' 
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{hasDemoResult ? (lang === 'th' ? 'ส่งภาพใหม่' : 'Retake / Re-upload') : (lang === 'th' ? 'ถ่ายภาพส่งตรวจ' : 'Capture / Upload')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        }} />
      </div>

      {/* Real Camera & Gemini Vision Upload Modal */}
      {activeQuestForUpload && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  <span>{lang === 'th' ? 'ถ่ายภาพ / อัปโหลดส่งตรวจด้วย AI' : 'Capture / Upload for Gemini Check'}</span>
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] truncate max-w-xs">
                  {activeQuestForUpload.titleTh}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuestForUpload(null)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => void handlePhotoFileSelected(e)}
              className="hidden"
            />

            {/* Photo Viewport */}
            <div className="w-full h-56 rounded-2xl bg-slate-900 border border-slate-700 relative overflow-hidden flex items-center justify-center">
              {uploadedPhotoDataUrl ? (
                <img
                  src={uploadedPhotoDataUrl}
                  alt="Uploaded snap quest"
                  className="w-full h-full object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center text-slate-300 hover:text-white text-xs space-y-2 p-6 cursor-pointer"
                >
                  <Camera className="w-8 h-8 mx-auto opacity-80" />
                  <p className="font-semibold">
                    {lang === 'th' ? 'แตะเพื่อเปิดกล้องหรือเลือกภาพถ่ายจากเครื่อง' : 'Tap to capture or choose an image'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {activeQuestForUpload.instructionTh}
                  </p>
                </button>
              )}

              {isAiAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-fade-in">
                  <RotateCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs font-bold text-emerald-300">
                    {lang === 'th' ? 'Gemini Vision กำลังวิเคราะห์ภาพถ่ายของคุณ...' : 'Gemini Vision is analyzing your photo...'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isAiAnalyzing}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-emerald-500 text-xs font-bold text-[var(--color-text-title)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {uploadedPhotoDataUrl
                    ? lang === 'th'
                      ? 'เปลี่ยน / ถ่ายภาพใหม่'
                      : 'Choose Another Photo'
                    : lang === 'th'
                    ? 'ถ่ายภาพ / เลือกไฟล์ภาพ'
                    : 'Capture / Upload Image'}
                </span>
              </button>
            </div>

            {/* Note Input */}
            <div className="text-xs">
              <label className="font-bold text-[var(--color-text-title)] mb-1 block">
                {lang === 'th' ? 'คำอธิบายเพิ่มเติมหรือการคำนวณของนักเรียน:' : 'Student notes & calculations:'}
              </label>
              <input
                type="text"
                placeholder={lang === 'th' ? 'เช่น พบใบกล้วยหน้าอาคาร 3 มีเส้นใบขนาน' : 'e.g. Found banana leaf with parallel venation'}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
              />
            </div>

            {verifyError && (
              <div role="alert" className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isAiAnalyzing}
                onClick={() => setActiveQuestForUpload(null)}
                className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isAiAnalyzing || !uploadedPhotoDataUrl}
                onClick={() => void handleVerifyWithGemini()}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>{lang === 'th' ? 'ส่งตรวจด้วย Gemini AI' : 'Verify with Gemini AI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Custom Quest Modal */}
      {showTeacherAddQuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ครูสร้างเควสต์สำรวจชีวิตจริงใหม่' : 'Create Real-World Quest'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTeacherAddQuest(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestByTeacher} className="space-y-3">
              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'วิชา' : 'Subject'}
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)]"
                >
                  <option value="biology">ชีววิทยา</option>
                  <option value="math">คณิตศาสตร์</option>
                  <option value="physics">ฟิสิกส์</option>
                  <option value="english">ภาษาอังกฤษ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'ชื่อภารกิจ' : 'Quest Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'th' ? 'เช่น ถ่ายรูปทรงเรขาคณิต 3 มิติรอบตัว' : 'Title...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'โจทย์และสถานการณ์' : 'Scenario & Instructions'}
                </label>
                <textarea
                  rows={3}
                  placeholder={lang === 'th' ? 'ให้นักเรียนมองหาอะไร และคำนวณอย่างไร...' : 'Instructions...'}
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-title)] mb-1">
                  {lang === 'th' ? 'ตัวอย่างสิ่งของที่ส่งได้' : 'Example Objects'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'th' ? 'เช่น กล่องกระดาษ, กระป๋องน้ำอัดลม' : 'Examples...'}
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherAddQuest(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] font-bold cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                >
                  {lang === 'th' ? 'ปล่อยภารกิจทันที' : 'Publish Quest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
