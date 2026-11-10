import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  HelpCircle, 
  BookOpen, 
  ChevronRight, 
  Award,
  Zap,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import { 
  CompetencyDimension, 
  StudentWeaknessDiagnostic, 
  AppLanguage, 
  UserRole 
} from '../types';
import { 
  INITIAL_COMPETENCY_DIMENSIONS, 
  INITIAL_WEAKNESS_DIAGNOSTICS 
} from '../data/innovativeFeaturesData';
import { PagedList } from './PagedList';

interface AiDiagnosticLearningViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
}

export const AiDiagnosticLearningView: React.FC<AiDiagnosticLearningViewProps> = ({
  lang = 'th',
  currentRole = 'teacher',
  currentUserName = 'อาจารย์ผู้สอน'
}) => {
  const [dimensions, setDimensions] = useState<CompetencyDimension[]>(INITIAL_COMPETENCY_DIMENSIONS);
  const [diagnostics, setDiagnostics] = useState<StudentWeaknessDiagnostic[]>(INITIAL_WEAKNESS_DIAGNOSTICS);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<StudentWeaknessDiagnostic | null>(null);
  
  // Micro-quest modal state
  const [activeQuestDiag, setActiveQuestDiag] = useState<StudentWeaknessDiagnostic | null>(null);
  const [questStep, setQuestStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showQuestResult, setShowQuestResult] = useState(false);
  const [questFeedback, setQuestFeedback] = useState<string | null>(null);

  // Filter student
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<'all' | string>('all');
  const [activePanel, setActivePanel] = useState<'competencies' | 'diagnostics'>('competencies');

  const studentNames = Array.from(new Set(diagnostics.map(d => d.studentName)));

  const filteredDiagnostics = selectedStudentFilter === 'all' 
    ? diagnostics 
    : diagnostics.filter(d => d.studentName === selectedStudentFilter);

  // SVG Radar Chart Math
  const radarRadius = 130;
  const centerX = 190;
  const centerY = 190;
  const numAxes = dimensions.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Compute vertices for polygon
  const studentPoints = dimensions.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (dim.score / 100) * radarRadius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const benchmarkPoints = dimensions.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (dim.benchmark / 100) * radarRadius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // Average score
  const avgScore = Math.round(dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length);
  const avgBenchmark = Math.round(dimensions.reduce((acc, d) => acc + d.benchmark, 0) / dimensions.length);

  // Handle start micro-quest
  const handleStartQuest = (diag: StudentWeaknessDiagnostic) => {
    setActiveQuestDiag(diag);
    setQuestStep(0);
    setSelectedAnswers([]);
    setShowQuestResult(false);
    setQuestFeedback(null);
  };

  // Submit answer for current question
  const handleSelectAnswer = (optionIdx: number) => {
    if (!activeQuestDiag) return;
    const nextAnswers = [...selectedAnswers, optionIdx];
    setSelectedAnswers(nextAnswers);

    if (questStep < activeQuestDiag.microQuests.length - 1) {
      setQuestStep(prev => prev + 1);
    } else {
      // Completed all questions in the quest
      let correctCount = 0;
      activeQuestDiag.microQuests.forEach((q, idx) => {
        if (nextAnswers[idx] === q.correctIndex) {
          correctCount++;
        }
      });

      const pass = correctCount >= Math.ceil(activeQuestDiag.microQuests.length * 0.6);
      setShowQuestResult(true);
      if (pass) {
        setQuestFeedback(
          lang === 'th' 
            ? `ยอดเยี่ยมมาก! คุณตอบถูก ${correctCount}/${activeQuestDiag.microQuests.length} ข้อ แก้ไขความเข้าใจคลาดเคลื่อนสำเร็จ สมรรถนะเพิ่มขึ้น +15 คะแนน`
            : `Outstanding! Correct ${correctCount}/${activeQuestDiag.microQuests.length}. Competency score boosted by +15!`
        );
        // Mark diagnostic as resolved and boost score
        setDiagnostics(prev => prev.map(d => d.id === activeQuestDiag.id ? { ...d, isResolved: true, accuracyRate: Math.min(100, d.accuracyRate + 25) } : d));
        // Boost corresponding dimension
        setDimensions(prev => prev.map(dim => {
          if (activeQuestDiag.subject.includes('เคมี') && dim.id === 'dim-4') {
            return { ...dim, score: Math.min(100, dim.score + 10), status: 'mastered' };
          }
          if (activeQuestDiag.subject.includes('อังกฤษ') && dim.id === 'dim-3') {
            return { ...dim, score: Math.min(100, dim.score + 15), status: 'proficient' };
          }
          return dim;
        }));
      } else {
        setQuestFeedback(
          lang === 'th'
            ? `คุณตอบถูก ${correctCount}/${activeQuestDiag.microQuests.length} ข้อ ยังไม่ผ่านเกณฑ์ 60% สามารถกดเริ่มทำซ่อมเสริมใหม่อีกครั้งเพื่อทบทวนคำอธิบาย`
            : `Score: ${correctCount}/${activeQuestDiag.microQuests.length}. Retry to strengthen your understanding!`
        );
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-indigo-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-400/40 text-indigo-100 text-xs font-semibold">
              <BrainCircuit className="w-4 h-4 text-cyan-300" />
              <span>{lang === 'th' ? 'ระบบ AI วิเคราะห์สมรรถนะรายบุคคล & ภารกิจซ่อมเสริม' : 'AI Adaptive Competency & Remedial Engine'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {lang === 'th' ? 'AI Diagnostic & Adaptive Learning 8 มิติ' : '8-Dimension AI Competency Radar'}
            </h1>
            <p className="text-slate-200 text-sm leading-relaxed">
              {lang === 'th' 
                ? 'ระบบประเมินสมรรถนะผู้เรียนรอบด้าน ตรวจจับจุดอ่อนที่ทำคะแนนตกต่ำ วิเคราะห์สาเหตุความเข้าใจคลาดเคลื่อน (Misconceptions) พร้อมจ่ายแบบฝึกหัดซ่อมเสริมอัตโนมัติรายบุคคล'
                : 'Comprehensive competency assessment across 8 dimensions. Detects learning weaknesses, identifies cognitive misconceptions, and dispenses adaptive remedial quests.'}
            </p>
          </div>

          <div className="bg-slate-950/45 backdrop-blur-md border border-white/25 p-4 rounded-xl flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-xs text-indigo-100 font-medium">
                {lang === 'th' ? 'คะแนนสมรรถนะเฉลี่ย' : 'Average Competency'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-cyan-300">{avgScore}</span>
                <span className="text-xs text-slate-200">/ 100</span>
              </div>
              <p className="text-[11px] text-emerald-300 font-semibold flex items-center justify-end gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                {lang === 'th' ? `สูงกว่าเกณฑ์ +${avgScore - avgBenchmark} คะแนน` : `+${avgScore - avgBenchmark} above benchmark`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-900/60 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setActivePanel('competencies')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${activePanel === 'competencies' ? 'bg-indigo-700 border-indigo-700 text-white' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'}`}>
          {lang === 'th' ? 'สมรรถนะ 8 มิติ' : 'Competency Radar'}
        </button>
        <button type="button" onClick={() => setActivePanel('diagnostics')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${activePanel === 'diagnostics' ? 'bg-indigo-700 border-indigo-700 text-white' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'}`}>
          {lang === 'th' ? `จุดอ่อน (${filteredDiagnostics.length})` : `Diagnostics (${filteredDiagnostics.length})`}
        </button>
      </div>

      {/* Main panel: competency radar or paged diagnostic records */}
      <div className="grid grid-cols-1 gap-6">
        {/* Left Column: 8-Dimension SVG Radar Chart */}
        {activePanel === 'competencies' && <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  {lang === 'th' ? 'เรดาร์สมรรถนะ 8 มิติ (Competency Radar)' : '8-Dimension Competency Radar'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'เปรียบเทียบคะแนนผู้เรียนกับเกณฑ์มาตรฐานโรงเรียน' : 'Comparing student performance with institutional benchmark'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                  <span>{lang === 'th' ? 'ผู้เรียน' : 'Student'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--color-text-body)]">
                  <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500 inline-block border border-dashed border-slate-600 dark:border-slate-300" />
                  <span>{lang === 'th' ? 'เกณฑ์' : 'Benchmark'}</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Canvas */}
            <div className="flex justify-center items-center py-2">
              <svg 
                viewBox="0 0 380 380" 
                className="w-full max-w-[340px] sm:max-w-[380px] h-auto overflow-visible"
              >
                {/* Background Circles (Levels: 20%, 40%, 60%, 80%, 100%) */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => (
                  <circle
                    key={ratio}
                    cx={centerX}
                    cy={centerY}
                    r={radarRadius * ratio}
                    fill="none"
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-700"
                    strokeWidth="1"
                    strokeDasharray={ratio === 1 ? undefined : '3,3'}
                  />
                ))}

                {/* Radar Spokes / Axes */}
                {dimensions.map((_, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const x = centerX + radarRadius * Math.cos(angle);
                  const y = centerY + radarRadius * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={centerX}
                      y1={centerY}
                      x2={x}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-300 dark:text-slate-700"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Benchmark Area Polygon */}
                <polygon
                  points={benchmarkPoints}
                  fill="rgba(148, 163, 184, 0.15)"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />

                {/* Student Score Area Polygon */}
                <polygon
                  points={studentPoints}
                  fill="rgba(99, 102, 241, 0.25)"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />

                {/* Student Vertex Points with tooltips */}
                {dimensions.map((dim, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const r = (dim.score / 100) * radarRadius;
                  const x = centerX + r * Math.cos(angle);
                  const y = centerY + r * Math.sin(angle);
                  return (
                    <circle
                      key={dim.id}
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill="#6366f1"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-6 transition-all"
                    />
                  );
                })}

                {/* Outer Labels */}
                {dimensions.map((dim, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const labelRadius = radarRadius + 28;
                  const x = centerX + labelRadius * Math.cos(angle);
                  const y = centerY + labelRadius * Math.sin(angle);
                  const isRight = Math.cos(angle) > 0.1;
                  const isLeft = Math.cos(angle) < -0.1;
                  const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle';

                  return (
                    <text
                      key={`label-${dim.id}`}
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      dominantBaseline="central"
                      className="text-[10px] font-bold fill-[var(--color-text-title)]"
                    >
                      {lang === 'th' ? dim.nameTh.split('&')[0].trim() : dim.nameEn.split('&')[0].trim()}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Dimension Details Strip */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-2 text-xs">
            {dimensions.map((dim) => {
              const diff = dim.score - dim.benchmark;
              return (
                <div 
                  key={dim.id} 
                  className="p-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between"
                >
                  <div className="truncate pr-1">
                    <p className="font-semibold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? dim.nameTh : dim.nameEn}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'เกณฑ์:' : 'Goal:'} {dim.benchmark}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-[var(--color-text-title)]">
                      {dim.score}%
                    </span>
                    <span className={`block text-[10px] font-bold ${diff >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {diff >= 0 ? `+${diff}` : `${diff}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Right Column: AI Weakness Diagnostic & Adaptive Micro-Quests */}
        {activePanel === 'diagnostics' && <div className="space-y-6">
          {/* Filter Bar & Header */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  {lang === 'th' ? 'การวินิจฉัยจุดอ่อน & ภารกิจซ่อมเสริมเฉพาะจุด' : 'Weakness Diagnostics & Micro-Quests'}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {lang === 'th' 
                    ? 'AI เจาะลึกหัวข้อที่นักเรียนทำคะแนนผิดบ่อย พร้อมแบบทดสอบแก้จุดบกพร่อง' 
                    : 'Pinpoints specific misconceptions with instant adaptive remediation tasks'}
                </p>
              </div>

              {/* Student Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-body)] font-medium">
                  {lang === 'th' ? 'เลือกนักเรียน:' : 'Student:'}
                </span>
                <select
                  value={selectedStudentFilter}
                  onChange={(e) => setSelectedStudentFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">{lang === 'th' ? 'ทุกคน (ทั้งหมด)' : 'All Students'}</option>
                  {studentNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diagnostic List */}
            <div className="mt-4 space-y-4">
              <PagedList items={filteredDiagnostics} pageSize={1} renderItem={(diag) => (
                <div 
                  key={diag.id}
                  className={`p-4 rounded-xl border transition-all ${
                    diag.isResolved 
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                          {diag.subject}
                        </span>
                        <span className="text-xs text-[var(--color-text-body)] flex items-center gap-1 font-medium">
                          <User className="w-3.5 h-3.5" />
                          {diag.studentName}
                        </span>
                        {diag.isResolved && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {lang === 'th' ? 'ซ่อมเสริมผ่านแล้ว' : 'Remediated'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-[var(--color-text-title)] pt-1">
                        {diag.topicTh}
                      </h4>
                    </div>

                    {/* Accuracy rate pill */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                        {lang === 'th' ? 'ความแม่นยำเดิม' : 'Original Accuracy'}
                      </div>
                      <div className={`text-xl font-black ${diag.accuracyRate < 60 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {diag.accuracyRate}%
                      </div>
                    </div>
                  </div>

                  {/* Root cause and recommendation */}
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-xs space-y-2">
                    <div className="flex items-start gap-2 text-[var(--color-text-body)]">
                      <span className="font-bold text-amber-800 dark:text-amber-300 shrink-0">
                        {lang === 'th' ? 'สาเหตุที่เข้าใจผิด:' : 'Root Cause:'}
                      </span>
                      <span>{diag.rootCauseTh}</span>
                    </div>

                    <div className="flex items-start gap-2 text-[var(--color-text-body)]">
                      <span className="font-bold text-indigo-800 dark:text-indigo-300 shrink-0">
                        {lang === 'th' ? 'แผนแก้จุดอ่อน:' : 'Action Plan:'}
                      </span>
                      <span>{diag.recommendedActionTh}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                      {lang === 'th' ? `แบบทดสอบ 3 มิติ: ${diag.microQuests.length} ข้อ` : `${diag.microQuests.length} Micro-quest questions`}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStartQuest(diag)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        diag.isResolved
                          ? 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] hover:opacity-90'
                          : 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>
                        {diag.isResolved 
                          ? (lang === 'th' ? 'ทำซ่อมเสริมอีกครั้ง' : 'Retry Quest')
                          : (lang === 'th' ? 'เริ่มทำเควสต์ซ่อมเสริม' : 'Start Micro-Quest')}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )} />
            </div>
          </div>
        </div>}
      </div>

      {/* Adaptive Micro-Quest Modal */}
      {activeQuestDiag && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                  {activeQuestDiag.subject}
                </span>
                <h3 className="text-base font-bold text-[var(--color-text-title)] mt-1">
                  {lang === 'th' ? 'ภารกิจซ่อมเสริมเฉพาะจุด (Remedial Micro-Quest)' : 'Remedial Micro-Quest'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuestDiag(null)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4">
              {!showQuestResult ? (
                <div>
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-2 font-medium">
                    <span>
                      {lang === 'th' ? `คำถามข้อที่ ${questStep + 1} จาก ${activeQuestDiag.microQuests.length}` : `Question ${questStep + 1} of ${activeQuestDiag.microQuests.length}`}
                    </span>
                    <span>
                      {lang === 'th' ? 'หัวข้อ:' : 'Topic:'} {activeQuestDiag.topicTh.slice(0, 25)}...
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[var(--color-card-subtle)] rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-indigo-700 transition-all duration-300"
                      style={{ width: `${((questStep + 1) / activeQuestDiag.microQuests.length) * 100}%` }}
                    />
                  </div>

                  {/* Question Box */}
                  <div className="p-4 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-text-title)] font-bold text-sm leading-relaxed mb-4">
                    {activeQuestDiag.microQuests[questStep].questionTh}
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {activeQuestDiag.microQuests[questStep].options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(optIdx)}
                        className="w-full text-left p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-xs sm:text-sm font-medium text-[var(--color-text-title)] transition flex items-center justify-between cursor-pointer"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Result Screen */
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-black text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ผลการทำภารกิจซ่อมเสริม' : 'Remedial Quest Result'}
                  </h4>
                  <p className="text-sm text-[var(--color-text-body)] max-w-sm mx-auto">
                    {questFeedback}
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveQuestDiag(null)}
                      className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      {lang === 'th' ? 'ปิดและบันทึกคะแนน' : 'Save & Close'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
