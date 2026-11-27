import React, { useEffect, useMemo, useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Loader2,
  ChevronRight, 
  Award,
  Zap,
  TrendingUp,
  User
} from 'lucide-react';
import { 
  AdaptivePracticeTopic,
  CompetencyDimension, 
  StudentWeaknessDiagnostic, 
  AppLanguage, 
  UserRole,
  AuthUser,
  Student,
  Course,
  GradeRecord,
  HomeworkSubmission,
  AttendanceRecord
} from '../types';
import { 
  INITIAL_COMPETENCY_DIMENSIONS, 
  INITIAL_WEAKNESS_DIAGNOSTICS 
} from '../data/innovativeFeaturesData';
import { PagedList } from '../components/PagedList';
import { getModuleTone } from '../lib/moduleTheme';
import { postLearningAi } from '../lib/learningAiClient';
import { resolveOwnStudent } from '../lib/attendanceScope';
import { FutureNavIcon } from '../components/common/FutureIcon';
import { BaseModal } from '../components/common/BaseModal';
import { PageHeader } from '../components/common/PageShell';

interface AiDiagnosticLearningViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  currentUser?: AuthUser | null;
  students?: Student[];
  courses?: Course[];
  grades?: GradeRecord[];
  homeworkSubmissions?: HomeworkSubmission[];
  attendance?: AttendanceRecord[];
  initialFocusTopic?: AdaptivePracticeTopic | null;
  onPracticeInSocraticTutor?: (topic: AdaptivePracticeTopic) => void;
}

function deriveLiveDimensions(
  scopedGrades: GradeRecord[],
  coursesById: Map<string, Course>,
  scopedAttendance: AttendanceRecord[],
  scopedHomework: HomeworkSubmission[]
): CompetencyDimension[] {
  if (scopedGrades.length === 0 && scopedAttendance.length === 0 && scopedHomework.length === 0) {
    return INITIAL_COMPETENCY_DIMENSIONS;
  }

  const avgByKeywords = (keywords: string[], fallback: number): number => {
    const matches = scopedGrades.filter((g) => {
      const c = coursesById.get(g.courseId);
      const text = `${c?.department || ''} ${c?.titleTh || ''} ${c?.titleEn || ''} ${c?.code || ''}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });
    if (matches.length === 0) return fallback;
    return Math.round(matches.reduce((s, g) => s + (Number(g.totalScore) || 0), 0) / matches.length);
  };

  const overallAvg =
    scopedGrades.length > 0
      ? Math.round(scopedGrades.reduce((s, g) => s + (Number(g.totalScore) || 0), 0) / scopedGrades.length)
      : 75;

  const attendancePct =
    scopedAttendance.length > 0
      ? Math.round(
          (scopedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length /
            scopedAttendance.length) *
            100
        )
      : 88;

  const hwSubmitted =
    scopedHomework.length > 0
      ? Math.round(
          (scopedHomework.filter((h) => h.status !== 'pending').length / scopedHomework.length) * 100
        )
      : 82;

  const toStatus = (score: number): CompetencyDimension['status'] =>
    score >= 85 ? 'mastered' : score >= 70 ? 'proficient' : score >= 55 ? 'developing' : 'needs_support';

  const specs: Array<{ id: string; nameTh: string; nameEn: string; benchmark: number; score: number; color: string }> = [
    {
      id: 'dim-1',
      nameTh: 'การคำนวณและคณิตศาสตร์',
      nameEn: 'Math & Quantitative Logic',
      benchmark: 75,
      score: avgByKeywords(['คณิต', 'math', 'คำนวณ', 'algebra', 'geometry'], overallAvg),
      color: '#3b82f6',
    },
    {
      id: 'dim-2',
      nameTh: 'ความเข้าใจด้านภาษาไทย',
      nameEn: 'Thai Literacy & Communication',
      benchmark: 75,
      score: avgByKeywords(['ไทย', 'thai', 'ภาษาไทย'], overallAvg),
      color: '#ec4899',
    },
    {
      id: 'dim-3',
      nameTh: 'ทักษะภาษาต่างประเทศ',
      nameEn: 'Foreign Languages',
      benchmark: 72,
      score: avgByKeywords(['อังกฤษ', 'english', 'ภาษาต่างประเทศ', 'จีน', 'ญี่ปุ่น'], overallAvg),
      color: '#f59e0b',
    },
    {
      id: 'dim-4',
      nameTh: 'กระบวนการทางวิทยาศาสตร์',
      nameEn: 'Scientific Inquiry & Lab',
      benchmark: 75,
      score: avgByKeywords(['วิทย', 'science', 'ฟิสิกส์', 'เคมี', 'ชีว'], overallAvg),
      color: '#10b981',
    },
    {
      id: 'dim-5',
      nameTh: 'ดิจิทัลและวิทยาการคำนวณ',
      nameEn: 'Computing & Digital Skills',
      benchmark: 75,
      score: avgByKeywords(['คอม', 'เทคโนโลยี', 'คำนวณ', 'computer', 'coding', 'การงาน'], overallAvg),
      color: '#8b5cf6',
    },
    {
      id: 'dim-6',
      nameTh: 'สังคมศึกษาและพลเมือง',
      nameEn: 'Social Studies & Civics',
      benchmark: 75,
      score: avgByKeywords(['สังคม', 'ประวัติ', 'social', 'history'], overallAvg),
      color: '#06b6d4',
    },
    {
      id: 'dim-7',
      nameTh: 'ความรับผิดชอบและส่งงาน',
      nameEn: 'Task Consistency & Homework',
      benchmark: 80,
      score: hwSubmitted,
      color: '#6366f1',
    },
    {
      id: 'dim-8',
      nameTh: 'วินัยและการมาเรียนสม่ำเสมอ',
      nameEn: 'Attendance & Self-Regulation',
      benchmark: 85,
      score: attendancePct,
      color: '#14b8a6',
    },
  ];

  return specs.map((s) => {
    const clampedScore = Math.max(0, Math.min(100, s.score));
    return {
      ...s,
      score: clampedScore,
      status: toStatus(clampedScore),
    };
  });
}

export const AiDiagnosticLearningView: React.FC<AiDiagnosticLearningViewProps> = ({
  lang = 'th',
  currentRole = 'teacher',
  currentUserName = 'อาจารย์ผู้สอน',
  currentUser = null,
  students = [],
  courses = [],
  grades = [],
  homeworkSubmissions = [],
  attendance = [],
  initialFocusTopic = null,
  onPracticeInSocraticTutor,
}) => {
  const isStaff = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';
  const ownStudent = useMemo(
    () => (currentUser && students.length > 0 ? resolveOwnStudent(currentUser, students) : undefined),
    [currentUser, students]
  );

  const visibleStudents = useMemo(() => {
    if (isStaff) return students;
    if (ownStudent) return [ownStudent];
    return students.filter((s) => s.id === currentUser?.studentRecordId);
  }, [currentUser?.studentRecordId, isStaff, ownStudent, students]);

  const coursesById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  // Filter student
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(() =>
    !isStaff && ownStudent ? ownStudent.id : 'all'
  );
  const [activePanel, setActivePanel] = useState<'competencies' | 'diagnostics'>(
    initialFocusTopic ? 'diagnostics' : 'competencies'
  );

  const selectedStudentObj = useMemo(() => {
    if (selectedStudentFilter !== 'all') {
      return visibleStudents.find((s) => s.id === selectedStudentFilter || `${s.firstNameTh} ${s.lastNameTh}` === selectedStudentFilter);
    }
    return !isStaff ? visibleStudents[0] : visibleStudents[0];
  }, [isStaff, selectedStudentFilter, visibleStudents]);

  const scopedGrades = useMemo(() => {
    const allowedIds = new Set(visibleStudents.map((s) => s.id));
    if (selectedStudentFilter !== 'all' && selectedStudentObj) {
      return grades.filter((g) => g.studentId === selectedStudentObj.id);
    }
    if (!isStaff) {
      return grades.filter((g) => allowedIds.has(g.studentId));
    }
    return grades;
  }, [grades, isStaff, selectedStudentFilter, selectedStudentObj, visibleStudents]);

  const scopedAttendance = useMemo(() => {
    const allowedIds = new Set(visibleStudents.map((s) => s.id));
    if (selectedStudentFilter !== 'all' && selectedStudentObj) {
      return attendance.filter((a) => a.studentId === selectedStudentObj.id);
    }
    if (!isStaff) {
      return attendance.filter((a) => allowedIds.has(a.studentId));
    }
    return attendance;
  }, [attendance, isStaff, selectedStudentFilter, selectedStudentObj, visibleStudents]);

  const scopedHomework = useMemo(() => {
    const allowedIds = new Set(visibleStudents.map((s) => s.id));
    if (selectedStudentFilter !== 'all' && selectedStudentObj) {
      return homeworkSubmissions.filter((h) => h.studentId === selectedStudentObj.id);
    }
    if (!isStaff) {
      return homeworkSubmissions.filter((h) => allowedIds.has(h.studentId));
    }
    return homeworkSubmissions;
  }, [homeworkSubmissions, isStaff, selectedStudentFilter, selectedStudentObj, visibleStudents]);

  const computedDimensions = useMemo(
    () => deriveLiveDimensions(scopedGrades, coursesById, scopedAttendance, scopedHomework),
    [coursesById, scopedAttendance, scopedGrades, scopedHomework]
  );

  const [dimensions, setDimensions] = useState<CompetencyDimension[]>(computedDimensions);
  useEffect(() => {
    setDimensions(computedDimensions);
  }, [computedDimensions]);

  const derivedInitialDiagnostics = useMemo<StudentWeaknessDiagnostic[]>(() => {
    if (scopedGrades.length === 0) {
      return INITIAL_WEAKNESS_DIAGNOSTICS;
    }
    const lowGrades = [...scopedGrades]
      .filter((g) => Number(g.totalScore) < 75)
      .sort((a, b) => Number(a.totalScore) - Number(b.totalScore))
      .slice(0, 6);

    if (lowGrades.length === 0) {
      return INITIAL_WEAKNESS_DIAGNOSTICS;
    }

    const studentsById = new Map(visibleStudents.map((s) => [s.id, s]));
    return lowGrades.map((g, idx) => {
      const st = studentsById.get(g.studentId);
      const course = coursesById.get(g.courseId);
      const studentLabel = st ? `${st.firstNameTh} ${st.lastNameTh}` : currentUserName;
      const subjectLabel = course?.titleTh || course?.titleEn || g.courseId;
      const templateQuest =
        INITIAL_WEAKNESS_DIAGNOSTICS[idx % INITIAL_WEAKNESS_DIAGNOSTICS.length].microQuests;

      return {
        id: `live-diag-${g.id}`,
        studentId: g.studentId,
        studentName: studentLabel,
        subject: subjectLabel,
        topicTh: `ซ่อมเสริมผลสัมฤทธิ์วิชา ${subjectLabel} (${g.totalScore}/100)`,
        accuracyRate: Math.round(Number(g.totalScore) || 0),
        rootCauseTh: `คะแนนรวมปัจจุบันอยู่ที่ ${g.totalScore}/100 (เกรด ${g.letterGrade || '-'}) ควรวิเคราะห์หัวข้อย่อยที่ทำคะแนนตกหล่นด้วย AI`,
        recommendedActionTh: 'กดปุ่ม "วิเคราะห์ด้วย Gemini AI" ด้านบนเพื่อสร้างแบบฝึกหัดซ่อมเสริมตรงจุด หรือส่งไปติวกับพี่รหัส AI',
        microQuests: templateQuest,
        isResolved: false,
      };
    });
  }, [coursesById, currentUserName, scopedGrades, visibleStudents]);

  const [diagnostics, setDiagnostics] = useState<StudentWeaknessDiagnostic[]>(derivedInitialDiagnostics);
  const [aiGeneratedFlag, setAiGeneratedFlag] = useState(false);

  useEffect(() => {
    if (!aiGeneratedFlag) {
      setDiagnostics(derivedInitialDiagnostics);
    }
  }, [aiGeneratedFlag, derivedInitialDiagnostics]);

  // Gemini diagnostic plan generation state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummaryTh, setAiSummaryTh] = useState<string | null>(null);

  // Micro-quest modal state
  const [activeQuestDiag, setActiveQuestDiag] = useState<StudentWeaknessDiagnostic | null>(null);
  const [questStep, setQuestStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showQuestResult, setShowQuestResult] = useState(false);
  const [questFeedback, setQuestFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialFocusTopic) {
      setActivePanel('diagnostics');
    }
  }, [initialFocusTopic]);

  const studentFilterOptions = useMemo(() => {
    if (visibleStudents.length > 0) {
      return visibleStudents.map((s) => ({
        value: s.id,
        label: `${s.firstNameTh} ${s.lastNameTh} (${s.room || s.gradeLevel})`,
      }));
    }
    return Array.from(new Set(diagnostics.map((d) => d.studentName))).map((name) => ({
      value: name,
      label: name,
    }));
  }, [diagnostics, visibleStudents]);

  const filteredDiagnostics =
    selectedStudentFilter === 'all'
      ? diagnostics
      : diagnostics.filter(
          (d) =>
            d.studentId === selectedStudentFilter ||
            d.studentName === selectedStudentFilter ||
            (selectedStudentObj && d.studentId === selectedStudentObj.id)
        );

  const handleGenerateAiDiagnostics = async () => {
    if (isGeneratingAi) return;
    setIsGeneratingAi(true);
    setAiError(null);

    const targetStudent = selectedStudentObj;
    const studentGrades = targetStudent
      ? grades.filter((g) => g.studentId === targetStudent.id)
      : scopedGrades;
    const weakCourses = [...studentGrades]
      .sort((a, b) => Number(a.totalScore) - Number(b.totalScore))
      .slice(0, 6)
      .map((g) => {
        const c = coursesById.get(g.courseId);
        return {
          code: c?.code,
          title: c?.titleTh || c?.titleEn || g.courseId,
          score: Number(g.totalScore) || 0,
          letter: g.letterGrade,
        };
      });

    const avgScoreVal =
      studentGrades.length > 0
        ? studentGrades.reduce((s, g) => s + (Number(g.totalScore) || 0), 0) / studentGrades.length
        : avgScore;

    const attDim = dimensions.find((d) => d.id === 'dim-8')?.score ?? 90;

    try {
      const result = await postLearningAi<{
        plan: {
          summaryTh: string;
          diagnostics: Array<{
            subject: string;
            topicTh: string;
            accuracyRate: number;
            rootCauseTh: string;
            recommendedActionTh: string;
            microQuests: Array<{
              id: string;
              questionTh: string;
              options: string[];
              correctIndex: number;
              explanationTh: string;
            }>;
          }>;
        };
      }>('/api/learning-ai/diagnostic-plan', {
        studentName: targetStudent
          ? `${targetStudent.firstNameTh} ${targetStudent.lastNameTh}`
          : currentUserName,
        gradeLevel: targetStudent?.gradeLevel || currentUser?.gradeLevel,
        averageScore: Math.round(avgScoreVal * 10) / 10,
        attendanceRate: attDim,
        weakCourses,
        lang,
      });

      const targetName = targetStudent
        ? `${targetStudent.firstNameTh} ${targetStudent.lastNameTh}`
        : currentUserName;
      const targetId = targetStudent?.id || currentUser?.studentRecordId || 'stu-ai';

      const mapped: StudentWeaknessDiagnostic[] = (result.plan.diagnostics || []).map((item, idx) => ({
        id: `ai-diag-${Date.now()}-${idx}`,
        studentId: targetId,
        studentName: targetName,
        subject: item.subject,
        topicTh: item.topicTh,
        accuracyRate: Math.max(0, Math.min(100, Math.round(Number(item.accuracyRate) || 60))),
        rootCauseTh: item.rootCauseTh,
        recommendedActionTh: item.recommendedActionTh,
        microQuests: (item.microQuests || []).map((q, qIdx) => ({
          id: q.id || `q-${idx}-${qIdx}`,
          questionTh: q.questionTh,
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['ก', 'ข', 'ค', 'ง'],
          correctIndex: Math.max(0, Math.min((q.options?.length || 1) - 1, Number(q.correctIndex) || 0)),
          explanationTh: q.explanationTh || '',
        })),
        isResolved: false,
      }));

      setAiSummaryTh(result.plan.summaryTh || null);
      if (mapped.length > 0) {
        setAiGeneratedFlag(true);
        setDiagnostics(mapped);
        setActivePanel('diagnostics');
      }
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : lang === 'th'
          ? 'ไม่สามารถวิเคราะห์จุดอ่อนด้วย AI ได้'
          : 'Failed to generate AI diagnostic plan.'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

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
    <div className={`space-y-6 pb-12 ${getModuleTone('ai_diagnostic')}`}>
      {/* Top Banner / Header */}
      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ระบบ AI วิเคราะห์สมรรถนะรายบุคคล & ภารกิจซ่อมเสริม' : 'AI Adaptive Competency & Remedial Engine'}</span>
          </span>
        }
        title={lang === 'th' ? 'AI Diagnostic & Adaptive Learning 8 มิติ' : '8-Dimension AI Competency Radar'}
        description={
          lang === 'th'
            ? 'ระบบประเมินสมรรถนะผู้เรียนรอบด้าน ตรวจจับจุดอ่อนที่ทำคะแนนตกต่ำ วิเคราะห์สาเหตุความเข้าใจคลาดเคลื่อน (Misconceptions) พร้อมจ่ายแบบฝึกหัดซ่อมเสริมอัตโนมัติรายบุคคล'
            : 'Comprehensive competency assessment across 8 dimensions. Detects learning weaknesses, identifies cognitive misconceptions, and dispenses adaptive remedial quests.'
        }
        icon={<FutureNavIcon tab="ai_diagnostic" size={22} active />}
        actions={
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 shrink-0">
            <div className="text-right">
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                {lang === 'th' ? 'คะแนนสมรรถนะเฉลี่ย' : 'Average Competency'}
              </p>
              <div className="flex items-baseline gap-1 justify-end tabular-nums">
                <span className="text-2xl font-black text-[var(--tone)]">{avgScore}</span>
                <span className="text-xs text-[var(--color-text-muted)]">/ 100</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-end gap-1 mt-0.5 tabular-nums">
                <TrendingUp className="w-3 h-3" />
                {lang === 'th' ? `สูงกว่าเกณฑ์ +${avgScore - avgBenchmark} คะแนน` : `+${avgScore - avgBenchmark} above benchmark`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl tone-chip-solid shrink-0">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        }
      />

      {initialFocusTopic && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-200">
              โฟกัสซ่อมเสริมจากสมุดคะแนน: {initialFocusTopic.subjectName || initialFocusTopic.subject}
              {typeof initialFocusTopic.score === 'number' ? ` (${initialFocusTopic.score}/100 คะแนน)` : ''}
            </p>
            {initialFocusTopic.studentName && (
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                นักเรียน: {initialFocusTopic.studentName}
              </p>
            )}
          </div>
          {onPracticeInSocraticTutor && (
            <button
              type="button"
              onClick={() => onPracticeInSocraticTutor(initialFocusTopic)}
              className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"
            >
              ติวตัวต่อตัวใน AI Socratic Tutor
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setActivePanel('competencies')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${activePanel === 'competencies' ? 'bg-indigo-700 border-indigo-700 text-white' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'}`}>
            {lang === 'th' ? 'สมรรถนะ 8 มิติ' : 'Competency Radar'}
          </button>
          <button type="button" onClick={() => setActivePanel('diagnostics')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${activePanel === 'diagnostics' ? 'bg-indigo-700 border-indigo-700 text-white' : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'}`}>
            {lang === 'th' ? `จุดอ่อน (${filteredDiagnostics.length})` : `Diagnostics (${filteredDiagnostics.length})`}
          </button>
        </div>

        <button
          type="button"
          disabled={isGeneratingAi}
          onClick={() => void handleGenerateAiDiagnostics()}
          className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          {isGeneratingAi ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-yellow-300" />
          )}
          <span>
            {isGeneratingAi
              ? lang === 'th'
                ? 'Gemini กำลังวิเคราะห์ข้อมูลจริง...'
                : 'Analyzing records...'
              : lang === 'th'
              ? 'วิเคราะห์จุดอ่อน & สร้างเควสต์ซ่อมเสริมด้วย AI'
              : 'Analyze & Generate Remedial Quests (Gemini)'}
          </span>
        </button>
      </div>

      {aiError && (
        <div role="alert" className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
          <span>{aiError}</span>
        </div>
      )}

      {aiSummaryTh && (
        <div className="rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 p-3.5 text-xs text-indigo-950 dark:text-indigo-100">
          <p className="font-bold flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'สรุปผลการวิเคราะห์เฉพาะบุคคลโดย Gemini AI' : 'Gemini AI Personal Diagnostic Summary'}</span>
          </p>
          <p>{aiSummaryTh}</p>
        </div>
      )}

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
                  onChange={(e) => {
                    setSelectedStudentFilter(e.target.value);
                    setAiGeneratedFlag(false);
                    setAiSummaryTh(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {isStaff && (
                    <option value="all">{lang === 'th' ? 'ทุกคน (ทั้งหมด)' : 'All Students'}</option>
                  )}
                  {studentFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                      {lang === 'th' ? `แบบทดสอบซ่อมเสริม: ${diag.microQuests.length} ข้อ` : `${diag.microQuests.length} Micro-quest questions`}
                    </span>

                    <div className="flex items-center gap-2">
                      {onPracticeInSocraticTutor && (
                        <button
                          type="button"
                          onClick={() =>
                            onPracticeInSocraticTutor({
                              subject: diag.subject,
                              subjectName: diag.subject,
                              topicTh: diag.topicTh,
                              score: diag.accuracyRate,
                              studentName: diag.studentName,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer"
                        >
                          {lang === 'th' ? 'ติวต่อกับพี่รหัส AI' : 'Tutor Chat'}
                        </button>
                      )}
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
                </div>
              )} />
            </div>
          </div>
        </div>}
      </div>

      {/* Adaptive Micro-Quest Modal */}
      <BaseModal
        isOpen={Boolean(activeQuestDiag)}
        onClose={() => setActiveQuestDiag(null)}
        title={lang === 'th' ? 'ภารกิจซ่อมเสริมเฉพาะจุด (Remedial Micro-Quest)' : 'Remedial Micro-Quest'}
        subtitle={activeQuestDiag?.subject}
        icon={<Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />}
        maxWidthClass="max-w-lg"
        heightClass="max-h-[92vh]"
        zIndexClass="z-50"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6"
      >
        {activeQuestDiag && (
          <div>
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
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                  <Award className="w-6 h-6" />
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
        )}
      </BaseModal>
    </div>
  );
};
