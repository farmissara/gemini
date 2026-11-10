import React, { useState } from 'react';
import { 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  Upload, 
  Leaf, 
  Calculator, 
  Compass, 
  BookOpen, 
  Globe, 
  Award, 
  Plus, 
  X, 
  ChevronRight, 
  ArrowRight,
  Eye,
  RotateCw,
  Coins
} from 'lucide-react';
import { PagedList } from './PagedList';
import { RealWorldSnapQuest, AppLanguage, UserRole } from '../types';
import { INITIAL_REAL_WORLD_QUESTS } from '../data/innovativeFeaturesData';

interface RealWorldSnapQuestViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
}

export const RealWorldSnapQuestView: React.FC<RealWorldSnapQuestViewProps> = ({
  lang = 'th',
  currentRole = 'student'
}) => {
  const [quests, setQuests] = useState<RealWorldSnapQuest[]>(INITIAL_REAL_WORLD_QUESTS);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [activeQuestForUpload, setActiveQuestForUpload] = useState<RealWorldSnapQuest | null>(null);

  // Simulated Camera / Upload State
  const [selectedSamplePhoto, setSelectedSamplePhoto] = useState<string>('');
  const [studentNote, setStudentNote] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

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

  // Sample photos for instant testing
  const samplePhotos = [
    {
      label: lang === 'th' ? 'ใบกล้วย (เส้นใบขนาน)' : 'Banana Leaf (Parallel Veins)',
      url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=500&auto=format&fit=crop&q=80',
      detected: 'ใบกล้วย (Banana Leaf) - เส้นใบเรียงขนานกันอย่างชัดเจน',
      confidence: 96.8,
      feedback: 'ตัวอย่าง: เส้นใบขนานของพืชใบเลี้ยงเดี่ยว (Monocotyledon) สอดคล้องกับบทเรียน',
    },
    {
      label: lang === 'th' ? 'ใบเสร็จสินค้า (คำนวณ VAT 7%)' : 'Store Receipt (VAT 7%)',
      url: 'https://images.unsplash.com/photo-1554415707-9e4966668836?w=500&auto=format&fit=crop&q=80',
      detected: 'ใบเสร็จชำระเงิน - ยอดรวม 214 บาท (ราคาสินค้า 200 + VAT 7% 14 บาท)',
      confidence: 98.2,
      feedback: 'ตัวอย่าง: สินค้า 200 บาท และ VAT 7% เท่ากับ 14 บาท',
    },
    {
      label: lang === 'th' ? 'กรรไกรตัดเล็บ (คานงัดอันดับ 3)' : 'Nail Clipper (Class 3 Lever)',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
      detected: 'กรรไกรตัดเล็บ - กลไกคานงัดผสม (Compound Lever Mechanism)',
      confidence: 94.5,
      feedback: 'ตัวอย่าง: กรรไกรตัดเล็บใช้กลไกคานผสม',
    },
    {
      label: lang === 'th' ? 'ฉลากขนมภาษาอังกฤษ' : 'English Food Label',
      url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500&auto=format&fit=crop&q=80',
      detected: 'ฉลากโภชนาการ Nutrition Facts & Ingredients',
      confidence: 97.1,
      feedback: 'ตัวอย่าง: ฉลากมีคำศัพท์ Sodium, Carbohydrates และ Dietary Fiber',
    },
  ];

  const handleStartUpload = (quest: RealWorldSnapQuest) => {
    setActiveQuestForUpload(quest);
    setSelectedSamplePhoto(samplePhotos[0].url);
    setStudentNote('');
  };

  const handleSimulateAiVerification = () => {
    if (!activeQuestForUpload) return;
    setIsAiAnalyzing(true);

    setTimeout(() => {
      setIsAiAnalyzing(false);
      const matchedSample = samplePhotos.find(s => s.url === selectedSamplePhoto) || samplePhotos[0];

      const updatedQuest: RealWorldSnapQuest = {
        ...activeQuestForUpload,
        status: 'submitted',
        submittedPhotoUrl: selectedSamplePhoto,
        aiVerificationResult: {
          identifiedObject: matchedSample.detected,
          confidencePercent: matchedSample.confidence,
          feedbackTh: matchedSample.feedback,
          isPass: true,
        }
      };

      setQuests(prev => prev.map(q => q.id === activeQuestForUpload.id ? updatedQuest : q));
      setActiveQuestForUpload(null);
    }, 1500);
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
      case 'biology': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">ชีววิทยา</span>;
      case 'math': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">คณิตศาสตร์</span>;
      case 'physics': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">ฟิสิกส์</span>;
      case 'english': return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">ภาษาอังกฤษ</span>;
      default: return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">ทั่วไป</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-emerald-600/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'th' ? 'เควสต์สำรวจชีวิตจริง • โหมดตัวอย่าง' : 'Real-World Quest Demo'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{lang === 'th' ? 'ภารกิจแปลงบทเรียนสู่ชีวิตจริง' : 'Real-World Missions'}</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              {lang === 'th' 
                ? 'ลองเชื่อมบทเรียนกับสิ่งรอบตัวด้วยภาพตัวอย่าง ผลที่แสดงเป็นข้อมูลจำลอง ยังไม่มี AI ตรวจภาพจริงและไม่มีการยืนยันคะแนน'
                : 'Try sample images to connect lessons to daily life. Results are simulated; no real AI verification or rewards are issued.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Teacher Add Quest Button */}
            {(currentRole === 'teacher' || currentRole === 'admin') && (
              <button
                type="button"
                onClick={() => setShowTeacherAddQuest(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? '+ ครูสั่งเควสต์ใหม่' : '+ Teacher Add Quest'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {lang === 'th' ? 'หมวดหมู่วิชา:' : 'Category:'}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
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
                onClick={() => setSelectedSubjectFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedSubjectFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {quests.filter(q => q.status === 'verified').length} {lang === 'th' ? 'ภารกิจยืนยันโดยครู' : 'teacher-verified quests'} • {quests.filter(q => q.status === 'submitted').length} {lang === 'th' ? 'ผลตัวอย่าง' : 'demo results'}
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
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 shadow-xs' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 shadow-xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getSubjectBadge(quest.subject)}
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    <span>{lang === 'th' ? `รางวัลเมื่อครูยืนยัน: ${quest.rewardXp} XP` : `After teacher review: ${quest.rewardXp} XP`}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {quest.titleTh}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {quest.scenarioTh}
                </p>

                {/* Example Objects Pill */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'th' ? 'ตัวอย่างสิ่งของที่ใช้ส่งได้:' : 'Examples:'}
                  </span>{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    {quest.exampleObjectTh}
                  </span>
                </div>

                {/* If verified, show result summary */}
                {quest.aiVerificationResult && (
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-100 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{quest.aiVerificationResult.identifiedObject}</span>
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
                      {quest.aiVerificationResult.feedbackTh}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  {isVerified
                    ? (lang === 'th' ? 'ครูยืนยันแล้ว' : 'Teacher verified')
                    : hasDemoResult
                    ? (lang === 'th' ? 'ผลจำลอง • รอยืนยันจากครู' : 'Demo result • awaiting teacher')
                    : (lang === 'th' ? 'รอส่งรูปถ่าย' : 'Ready for photo upload')}
                </span>

                <button
                  type="button"
                  onClick={() => handleStartUpload(quest)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    hasDemoResult
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>{hasDemoResult ? (lang === 'th' ? 'ลองตัวอย่างอีกครั้ง' : 'Try demo again') : (lang === 'th' ? 'ดูตัวอย่าง' : 'View demo')}</span>
                </button>
              </div>
            </div>
          );
        }} />
      </div>

      {/* Simulated Camera & AI Upload Modal */}
      {activeQuestForUpload && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-500" />
                  <span>{lang === 'th' ? 'ทดลองผลตรวจจากภาพตัวอย่าง' : 'Sample image demo'}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs">
                  {activeQuestForUpload.titleTh}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuestForUpload(null)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Viewport Simulation */}
            <div className="w-full h-56 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center">
              {selectedSamplePhoto ? (
                <img
                  src={selectedSamplePhoto}
                  alt="Snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <p>{lang === 'th' ? 'เลือกภาพตัวอย่างด้านล่างเพื่อจำลองถ่ายภาพ' : 'Select sample below'}</p>
                </div>
              )}

              {isAiAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-fade-in">
                  <RotateCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs font-bold text-emerald-300">
                    {lang === 'th' ? 'กำลังจำลองผลตรวจจากภาพตัวอย่าง...' : 'Simulating a sample result...'}
                  </p>
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-md bg-amber-400 px-2 py-1 text-[10px] font-bold text-slate-950">
                {lang === 'th' ? 'ภาพตัวอย่าง • ไม่ได้ส่งภาพจริง' : 'SAMPLE • no real upload'}
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                {lang === 'th' ? 'เลือกภาพจำลองการถ่ายส่งตรวจ:' : 'Select sample photograph:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {samplePhotos.map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setSelectedSamplePhoto(sample.url)}
                    className={`p-2 rounded-xl border text-left truncate text-xs transition cursor-pointer ${
                      selectedSamplePhoto === sample.url
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Input */}
            <div className="text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                {lang === 'th' ? 'คำอธิบายเพิ่มเติมหรือการคำนวณของนักเรียน:' : 'Student notes & calculations:'}
              </label>
              <input
                type="text"
                placeholder={lang === 'th' ? 'เช่น พบใบกล้วยหน้าอาคาร 3 มีเส้นใบขนาน' : 'e.g. Found banana leaf with parallel venation'}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveQuestForUpload(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isAiAnalyzing}
                onClick={handleSimulateAiVerification}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>{lang === 'th' ? 'แสดงผลตัวอย่าง' : 'Show demo result'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Custom Quest Modal */}
      {showTeacherAddQuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'th' ? 'ครูสร้างเควสต์สำรวจชีวิตจริงใหม่' : 'Create Real-World Quest'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTeacherAddQuest(false)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestByTeacher} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'th' ? 'วิชา' : 'Subject'}
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="biology">ชีววิทยา</option>
                  <option value="math">คณิตศาสตร์</option>
                  <option value="physics">ฟิสิกส์</option>
                  <option value="english">ภาษาอังกฤษ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'th' ? 'ชื่อภารกิจ' : 'Quest Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'th' ? 'เช่น ถ่ายรูปทรงเรขาคณิต 3 มิติรอบตัว' : 'Title...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'th' ? 'โจทย์และสถานการณ์' : 'Scenario & Instructions'}
                </label>
                <textarea
                  rows={3}
                  placeholder={lang === 'th' ? 'ให้นักเรียนมองหาอะไร และคำนวณอย่างไร...' : 'Instructions...'}
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'th' ? 'ตัวอย่างสิ่งของที่ส่งได้' : 'Example Objects'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'th' ? 'เช่น กล่องกระดาษ, กระป๋องน้ำอัดลม' : 'Examples...'}
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherAddQuest(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
