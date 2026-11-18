import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Briefcase,
  CheckCircle2,
  Compass,
  Crown,
  Eye,
  EyeOff,
  Flame,
  FolderGit2,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  Layers,
  Loader2,
  MessageSquare,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  CareerCoachMessage,
  CareerEducationStage,
  CareerProfile,
  CareerQuestTask,
  CareerRoleplayTurn,
  CareerVibeMatch,
  CareerVibeQuizAnswer,
  Course,
  GradeRecord,
  GradingSystem,
  PlayerScore,
  PortfolioItem,
  School,
  Student,
  StudentCareerQuestState,
} from '../types';
import type { NavTab } from '../components/layout/Sidebar';
import {
  CAREER_VIBE_QUIZ_QUESTIONS,
  POPULAR_CAREERS,
  getOfflineStarterRoleplayTurn,
} from '../data/careerQuestData';
import {
  calculateCareerReadiness,
  detectEducationStage,
} from '../lib/careerQuestEngine';
import {
  analyzeCareerWithGemini,
  askCareerCoachWithGemini,
  createEmptyCareerQuestState,
  generateQuestsWithGemini,
  loadSchoolSharedCareerQuests,
  loadStudentCareerQuest,
  nextRoleplayTurnWithGemini,
  runVibeQuizWithGemini,
  saveStudentCareerQuest,
  type StudentAiContextPayload,
} from '../lib/careerQuestStore';
import { resolveOwnStudent } from '../lib/attendanceScope';
import { calculateGrade } from '../lib/schoolSettings';
import { triggerHaptic } from '../lib/arcadeStore';

interface CareerQuestViewProps {
  currentUser: AuthUser | null;
  school: School;
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  portfolioItems: PortfolioItem[];
  playerScores: PlayerScore[];
  gradingSystem?: GradingSystem;
  lang: AppLanguage;
  onNavigate?: (tab: NavTab) => void;
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onEquipCosmetic?: (payload: { frameId?: string; title?: string }) => void;
  onAddPortfolioItem?: (item: PortfolioItem) => void;
}

const STAGE_LABEL_OPTIONS: { id: CareerEducationStage; labelTh: string; labelEn: string }[] = [
  { id: 'primary', labelTh: 'ประถม (ป.1–ป.6)', labelEn: 'Primary' },
  { id: 'middle', labelTh: 'ม.ต้น (ม.1–ม.3)', labelEn: 'Middle' },
  { id: 'high', labelTh: 'ม.ปลาย (ม.4–ม.6)', labelEn: 'High School' },
];

const QUICK_COACH_PROMPTS_TH = [
  'เทอมนี้เกรดบางวิชายังไม่ถึงเป้า ยังมีสิทธิ์ไหม ต้องเริ่มแก้ตรงไหน?',
  'ควรเก็บผลงาน Portfolio ชิ้นแรกแบบไหนดีที่ใช้ได้จริง?',
  'ช่วยวางแผนฝึกสัปดาห์นี้ 3 ขั้นตอนสั้นๆ ให้หน่อย',
];

export const CareerQuestView: React.FC<CareerQuestViewProps> = ({
  currentUser,
  school,
  students,
  courses,
  grades,
  attendance,
  portfolioItems,
  playerScores,
  gradingSystem = 'thai',
  lang,
  onNavigate,
  onEarnRewards,
  onEquipCosmetic,
  onAddPortfolioItem,
}) => {
  const isStaffTester =
    currentUser?.role === 'teacher' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  // Own student if logged in as student
  const ownStudent = useMemo(
    () => (currentUser ? resolveOwnStudent(currentUser, students) : undefined),
    [currentUser, students]
  );

  // Teacher Sandbox Controls
  const [teacherPanelTab, setTeacherPanelTab] = useState<'sandbox' | 'student_insights'>('sandbox');
  const [sandboxStudentId, setSandboxStudentId] = useState<string>('');
  const [sandboxStageOverride, setSandboxStageOverride] = useState<CareerEducationStage>('high');
  const [sharedStudentStates, setSharedStudentStates] = useState<StudentCareerQuestState[]>([]);
  const [loadingSharedStates, setLoadingSharedStates] = useState(false);

  const inspectedStudent = useMemo(() => {
    if (!isStaffTester) return ownStudent;
    if (sandboxStudentId) return students.find((s) => s.id === sandboxStudentId);
    return undefined;
  }, [isStaffTester, ownStudent, sandboxStudentId, students]);

  // Scoped records for readiness calculation
  const targetStudentId = inspectedStudent?.id || currentUser?.studentRecordId || currentUser?.id || 'sandbox';
  const scopedGrades = useMemo(() => {
    if (inspectedStudent) return grades.filter((g) => g.studentId === inspectedStudent.id);
    if (!isStaffTester && currentUser?.studentRecordId) {
      return grades.filter((g) => g.studentId === currentUser.studentRecordId);
    }
    return [];
  }, [grades, inspectedStudent, isStaffTester, currentUser?.studentRecordId]);

  const scopedAttendance = useMemo(() => {
    if (inspectedStudent) return attendance.filter((a) => a.studentId === inspectedStudent.id);
    if (!isStaffTester && currentUser?.studentRecordId) {
      return attendance.filter((a) => a.studentId === currentUser.studentRecordId);
    }
    return [];
  }, [attendance, inspectedStudent, isStaffTester, currentUser?.studentRecordId]);

  const scopedPortfolio = useMemo(() => {
    const ownerIds = new Set(
      [inspectedStudent?.id, currentUser?.id, currentUser?.studentRecordId].filter(Boolean) as string[]
    );
    return portfolioItems.filter((p) => ownerIds.has(p.ownerId));
  }, [portfolioItems, inspectedStudent?.id, currentUser?.id, currentUser?.studentRecordId]);

  // Core Career Quest State
  const effectiveUserId = currentUser?.id || 'guest';
  const [questState, setQuestState] = useState<StudentCareerQuestState>(() =>
    createEmptyCareerQuestState({
      schoolId: school.id,
      userId: effectiveUserId,
      studentId: ownStudent?.id,
      studentName: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เรียน',
      gradeLevel: ownStudent?.gradeLevel || currentUser?.gradeLevel,
    })
  );
  const [stateLoaded, setStateLoaded] = useState(false);

  // UI Navigation States
  const [showPickerMode, setShowPickerMode] = useState(false);
  const [entryMode, setEntryMode] = useState<'direct' | 'vibe_quiz'>('direct');
  const [middleSubTab, setMiddleSubTab] = useState<'quests' | 'roleplay'>('quests');

  // Custom career AI query
  const [customCareerInput, setCustomCareerInput] = useState('');
  const [analyzingCareer, setAnalyzingCareer] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Vibe Quiz state
  const [quizStep, setQuizStep] = useState(0);
  const [quizDraftAnswers, setQuizDraftAnswers] = useState<CareerVibeQuizAnswer[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);

  // Quest refresh state
  const [refreshingQuests, setRefreshingQuests] = useState(false);

  // Portfolio quick-submit modal inside Career Quest
  const [portfolioQuestModal, setPortfolioQuestModal] = useState<CareerQuestTask | null>(null);
  const [pfTitle, setPfTitle] = useState('');
  const [pfDesc, setPfDesc] = useState('');
  const [pfCategory, setPfCategory] = useState<PortfolioItem['category']>('academic');

  // Role-Play Mission state
  const [roleplayTurns, setRoleplayTurns] = useState<CareerRoleplayTurn[]>([]);
  const [roleplayLoading, setRoleplayLoading] = useState(false);
  const [roleplayMode, setRoleplayMode] = useState<'ai' | 'offline'>('ai');
  const [roleplayRewardClaimed, setRoleplayRewardClaimed] = useState(false);

  // AI Coach state
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  // Load persisted Career Quest state from Supabase / localStorage
  useEffect(() => {
    let active = true;
    setStateLoaded(false);
    loadStudentCareerQuest({
      schoolId: school.id,
      userId: effectiveUserId,
      studentId: ownStudent?.id,
      studentName: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เรียน',
      gradeLevel: ownStudent?.gradeLevel || currentUser?.gradeLevel,
    }).then((loaded) => {
      if (!active) return;
      setQuestState(loaded);
      setShowPickerMode(!loaded.activeCareerId);
      setStateLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [school.id, effectiveUserId, ownStudent?.id, ownStudent?.gradeLevel, currentUser?.fullNameTh, currentUser?.fullNameEn, currentUser?.gradeLevel]);

  // Load shared student insights for Teachers / Admins
  useEffect(() => {
    if (!isStaffTester || teacherPanelTab !== 'student_insights') return;
    let active = true;
    setLoadingSharedStates(true);
    loadSchoolSharedCareerQuests(school.id)
      .then((rows) => {
        if (active) setSharedStudentStates(rows);
      })
      .finally(() => {
        if (active) setLoadingSharedStates(false);
      });
    return () => {
      active = false;
    };
  }, [isStaffTester, teacherPanelTab, school.id]);

  // Active Career resolution
  const activeCareer = useMemo<CareerProfile | null>(() => {
    if (!questState.activeCareerId) return null;
    return (
      questState.pinnedCareers.find((c) => c.id === questState.activeCareerId) ||
      POPULAR_CAREERS.find((c) => c.id === questState.activeCareerId) ||
      null
    );
  }, [questState.activeCareerId, questState.pinnedCareers]);

  // Effective grade stage (uses teacher sandbox override when teacher hasn't picked a specific student)
  const effectiveGradeLevel =
    inspectedStudent?.gradeLevel ||
    ownStudent?.gradeLevel ||
    (sandboxStageOverride === 'primary' ? 'ป.5' : sandboxStageOverride === 'middle' ? 'ม.2' : 'ม.5');

  // Real-time readiness report
  const readinessReport = useMemo(() => {
    if (!activeCareer) return null;
    return calculateCareerReadiness({
      career: activeCareer,
      student: inspectedStudent,
      gradeLevelFallback: effectiveGradeLevel,
      courses,
      grades: scopedGrades,
      attendance: scopedAttendance,
      portfolioItems: scopedPortfolio,
      completedQuestIds: questState.completedQuestIds,
      roleplayRunsCount: questState.roleplayRunsCount,
      gradingSystem,
    });
  }, [
    activeCareer,
    inspectedStudent,
    effectiveGradeLevel,
    courses,
    scopedGrades,
    scopedAttendance,
    scopedPortfolio,
    questState.completedQuestIds,
    questState.roleplayRunsCount,
    gradingSystem,
  ]);

  // Payload for Gemini AI APIs
  const studentAiContext = useMemo<StudentAiContextPayload>(() => {
    const stage = readinessReport?.stage || detectEducationStage(effectiveGradeLevel);
    const subjectGrades = scopedGrades.map((g) => {
      const course = courses.find((c) => c.id === g.courseId);
      const score = Math.round(g.totalScore || 0);
      return {
        title: course?.titleTh || course?.titleEn || g.courseId,
        score,
        letter: g.letterGrade || calculateGrade(score, gradingSystem).letter,
      };
    });
    const totalAtt = scopedAttendance.length;
    const attended = scopedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    return {
      gradeLevel: effectiveGradeLevel,
      stage,
      gpax: readinessReport?.currentGpax ?? (inspectedStudent?.gpa || null),
      attendanceRate: totalAtt > 0 ? Math.round((attended / totalAtt) * 100) : null,
      portfolioCount: scopedPortfolio.length,
      subjectGrades,
      lang,
    };
  }, [
    readinessReport?.stage,
    readinessReport?.currentGpax,
    effectiveGradeLevel,
    scopedGrades,
    courses,
    gradingSystem,
    scopedAttendance,
    inspectedStudent?.gpa,
    scopedPortfolio.length,
    lang,
  ]);

  // Persist helper (keeps readiness summary synced for teacher/parent sharing)
  const commitQuestState = (updater: (prev: StudentCareerQuestState) => StudentCareerQuestState) => {
    setQuestState((prev) => {
      const next = updater(prev);
      const enriched: StudentCareerQuestState = {
        ...next,
        studentName: currentUser?.fullNameTh || currentUser?.fullNameEn || next.studentName,
        gradeLevel: ownStudent?.gradeLevel || next.gradeLevel,
        lastReadinessPercent: readinessReport?.readinessPercent ?? next.lastReadinessPercent,
        lastReadinessLevel: readinessReport?.rpgLevelTitleTh ?? next.lastReadinessLevel,
      };
      void saveStudentCareerQuest(enriched);
      return enriched;
    });
  };

  // Update stored readiness snapshot whenever it shifts after load
  useEffect(() => {
    if (!stateLoaded || !readinessReport || !activeCareer) return;
    if (
      questState.lastReadinessPercent !== readinessReport.readinessPercent ||
      questState.lastReadinessLevel !== readinessReport.rpgLevelTitleTh
    ) {
      const next: StudentCareerQuestState = {
        ...questState,
        lastReadinessPercent: readinessReport.readinessPercent,
        lastReadinessLevel: readinessReport.rpgLevelTitleTh,
      };
      void saveStudentCareerQuest(next);
    }
  }, [stateLoaded, readinessReport, activeCareer]);

  const showNotice = (msg: string) => {
    setToastNotice(msg);
    window.setTimeout(() => setToastNotice(null), 4000);
  };

  // Pin & Activate a career (max 3 pinned without losing EXP)
  const handleSelectCareer = (career: CareerProfile) => {
    setAiError(null);
    triggerHaptic('success');
    commitQuestState((prev) => {
      const exists = prev.pinnedCareers.some((c) => c.id === career.id);
      let nextPinned = prev.pinnedCareers;
      if (!exists) {
        nextPinned = [career, ...prev.pinnedCareers].slice(0, 3);
      } else {
        nextPinned = prev.pinnedCareers.map((c) => (c.id === career.id ? career : c));
      }
      const nextTitles = Array.from(new Set([...prev.unlockedTitles, career.unlockableTitleTh]));
      return {
        ...prev,
        activeCareerId: career.id,
        pinnedCareers: nextPinned,
        unlockedTitles: nextTitles,
      };
    });
    setRoleplayTurns([]);
    setRoleplayRewardClaimed(false);
    setShowPickerMode(false);
    showNotice(`ตั้งเป้าหมายเป็น "${career.titleTh}" แล้ว! (EXP ที่สะสมไว้ยังอยู่ครบ)`);
  };

  // Analyze custom career via Gemini AI
  const handleAnalyzeCustomCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = customCareerInput.trim();
    if (!query) return;
    setAiError(null);
    setAnalyzingCareer(true);
    try {
      const aiCareer = await analyzeCareerWithGemini(query, studentAiContext);
      handleSelectCareer(aiCareer);
      setCustomCareerInput('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถวิเคราะห์อาชีพด้วย Gemini AI ได้');
    } finally {
      setAnalyzingCareer(false);
    }
  };

  // Vibe Quiz step handler
  const handleSelectQuizOption = async (option: (typeof CAREER_VIBE_QUIZ_QUESTIONS)[number]['options'][number]) => {
    const q = CAREER_VIBE_QUIZ_QUESTIONS[quizStep];
    const answer: CareerVibeQuizAnswer = {
      questionId: q.id,
      questionTh: q.questionTh,
      selectedOptionId: option.id,
      selectedLabelTh: option.labelTh,
      traitTag: option.traitTag,
    };
    const nextAnswers = [...quizDraftAnswers.filter((a) => a.questionId !== q.id), answer];
    setQuizDraftAnswers(nextAnswers);
    triggerHaptic('light');

    if (quizStep < CAREER_VIBE_QUIZ_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1);
      return;
    }

    // Completed all 5 questions -> call Gemini AI
    setQuizLoading(true);
    setAiError(null);
    try {
      const matches = await runVibeQuizWithGemini(nextAnswers, studentAiContext);
      commitQuestState((prev) => ({
        ...prev,
        vibeQuizAnswers: nextAnswers,
        vibeMatches: matches,
      }));
      triggerHaptic('success');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถวิเคราะห์ Vibe Quiz ด้วย Gemini AI ได้');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleComputeOfflineQuizMatches = () => {
    // Transparent local matcher when user clicks offline starter fallback
    const categoryScore = new Map<CareerProfile['category'], number>();
    quizDraftAnswers.forEach((ans) => {
      const q = CAREER_VIBE_QUIZ_QUESTIONS.find((item) => item.id === ans.questionId);
      const opt = q?.options.find((o) => o.id === ans.selectedOptionId);
      opt?.recommendedCategories.forEach((cat, idx) => {
        categoryScore.set(cat, (categoryScore.get(cat) || 0) + (idx === 0 ? 3 : 2));
      });
    });

    const ranked: CareerVibeMatch[] = [...POPULAR_CAREERS]
      .map((career) => {
        const base = (categoryScore.get(career.category) || 1) * 11;
        const readiness = calculateCareerReadiness({
          career,
          student: inspectedStudent,
          gradeLevelFallback: effectiveGradeLevel,
          courses,
          grades: scopedGrades,
          attendance: scopedAttendance,
          portfolioItems: scopedPortfolio,
          completedQuestIds: questState.completedQuestIds,
          roleplayRunsCount: questState.roleplayRunsCount,
          gradingSystem,
        });
        const score = Math.min(96, Math.max(68, Math.round(58 + base * 0.65 + readiness.readinessPercent * 0.22)));
        return {
          career,
          matchPercent: score,
          reasonTh: `สอดคล้องกับบุคลิกภาพจาก Vibe Quiz และคะแนนความพร้อมพื้นฐาน (${readiness.readinessPercent}%) ในวิชาหลักของคุณ`,
        };
      })
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, 3);

    setAiError(null);
    commitQuestState((prev) => ({
      ...prev,
      vibeQuizAnswers: quizDraftAnswers,
      vibeMatches: ranked,
    }));
  };

  // Generate fresh AI quests for active career
  const handleRefreshQuestsWithAi = async () => {
    if (!activeCareer) return;
    setAiError(null);
    setRefreshingQuests(true);
    try {
      const freshQuests = await generateQuestsWithGemini(activeCareer.titleTh, studentAiContext);
      if (freshQuests.length > 0) {
        const updatedCareer: CareerProfile = {
          ...activeCareer,
          quests: freshQuests,
        };
        commitQuestState((prev) => ({
          ...prev,
          pinnedCareers: prev.pinnedCareers.some((c) => c.id === updatedCareer.id)
            ? prev.pinnedCareers.map((c) => (c.id === updatedCareer.id ? updatedCareer : c))
            : [updatedCareer, ...prev.pinnedCareers].slice(0, 3),
        }));
        triggerHaptic('success');
        showNotice('อัปเดตภารกิจชุดใหม่จาก Gemini AI เรียบร้อยแล้ว!');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถสร้างภารกิจใหม่ด้วย Gemini AI ได้');
    } finally {
      setRefreshingQuests(false);
    }
  };

  // Complete quest & award EXP + Gems
  const handleCompleteQuest = (quest: CareerQuestTask) => {
    if (questState.completedQuestIds.includes(quest.id)) return;
    triggerHaptic('success');
    commitQuestState((prev) => ({
      ...prev,
      completedQuestIds: [...prev.completedQuestIds, quest.id],
      careerExp: prev.careerExp + quest.expReward,
    }));
    if (currentUser && onEarnRewards) {
      onEarnRewards(currentUser.id, quest.expReward, quest.gemsReward, true);
    }
    showNotice(`สำเร็จภารกิจ "${quest.titleTh}"! +${quest.expReward} EXP · +${quest.gemsReward} Gems`);
  };

  // Quick submit portfolio evidence directly from Portfolio Quest
  const handleSubmitPortfolioFromQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioQuestModal || !pfTitle.trim()) return;
    const item: PortfolioItem = {
      id: `pf-cq-${Date.now()}`,
      schoolId: school.id,
      ownerId: currentUser?.id || targetStudentId,
      ownerRole: currentUser?.role === 'student' ? 'student' : 'student',
      ownerName: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เรียน',
      title: pfTitle.trim(),
      category: pfCategory,
      year: school.academicYear || '2569',
      description: pfDesc.trim() || portfolioQuestModal.descriptionTh,
      skills: [activeCareer?.titleTh || 'Career Quest', portfolioQuestModal.skillTag || 'Portfolio'],
      certifiedBySchool: false,
    };
    onAddPortfolioItem?.(item);
    handleCompleteQuest(portfolioQuestModal);
    setPortfolioQuestModal(null);
    setPfTitle('');
    setPfDesc('');
  };

  // Equip Career Title onto Player Profile & Dashboard
  const handleEquipCareerTitle = (title: string) => {
    triggerHaptic('success');
    commitQuestState((prev) => ({
      ...prev,
      equippedCareerTitle: title,
      unlockedTitles: Array.from(new Set([...prev.unlockedTitles, title])),
    }));
    onEquipCosmetic?.({ title });
    showNotice(`ติดฉายา "${title}" บนหน้าหลักและกระดานอันดับเรียบร้อย!`);
  };

  // Role-Play Mission handlers
  const handleStartRoleplay = async (mode: 'ai' | 'offline' = 'ai') => {
    if (!activeCareer) return;
    setAiError(null);
    setRoleplayMode(mode);
    setRoleplayTurns([]);
    setRoleplayRewardClaimed(false);

    if (mode === 'offline') {
      const turn1 = getOfflineStarterRoleplayTurn(activeCareer, 1);
      setRoleplayTurns([turn1]);
      return;
    }

    setRoleplayLoading(true);
    try {
      const turn1 = await nextRoleplayTurnWithGemini({
        careerTitleTh: activeCareer.titleTh,
        stage: readinessReport?.stage || 'high',
        turnNumber: 1,
        maxTurns: 4,
        history: [],
      });
      setRoleplayTurns([turn1]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถเริ่มภารกิจจำลองด้วย Gemini AI ได้');
    } finally {
      setRoleplayLoading(false);
    }
  };

  const handleChooseRoleplayOption = async (optionLabel: string) => {
    if (!activeCareer || roleplayTurns.length === 0) return;
    const lastTurn = roleplayTurns[roleplayTurns.length - 1];
    if (lastTurn.isCompleted) return;

    const nextTurnNumber = lastTurn.turnNumber + 1;
    triggerHaptic('light');

    if (roleplayMode === 'offline') {
      const nextTurn = getOfflineStarterRoleplayTurn(activeCareer, nextTurnNumber, optionLabel);
      const updated = [...roleplayTurns];
      updated[updated.length - 1] = { ...lastTurn, chosenLabelTh: optionLabel };
      updated.push(nextTurn);
      setRoleplayTurns(updated);
      if (nextTurn.isCompleted && !roleplayRewardClaimed) {
        finalizeRoleplayRewards(nextTurn);
      }
      return;
    }

    setRoleplayLoading(true);
    setAiError(null);
    try {
      const history = roleplayTurns.flatMap((t) => [
        { role: 'GameMaster', text: `${t.sceneTitleTh}: ${t.situationTh}` },
        ...(t.chosenLabelTh ? [{ role: 'Player', text: t.chosenLabelTh }] : []),
      ]);
      const nextTurn = await nextRoleplayTurnWithGemini({
        careerTitleTh: activeCareer.titleTh,
        stage: readinessReport?.stage || 'high',
        turnNumber: nextTurnNumber,
        maxTurns: 4,
        history,
        chosenOptionText: optionLabel,
      });
      const updated = [...roleplayTurns];
      updated[updated.length - 1] = { ...lastTurn, chosenLabelTh: optionLabel };
      updated.push(nextTurn);
      setRoleplayTurns(updated);
      if (nextTurn.isCompleted && !roleplayRewardClaimed) {
        finalizeRoleplayRewards(nextTurn);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถดำเนินด่าน Role-Play ด้วย Gemini AI ได้');
    } finally {
      setRoleplayLoading(false);
    }
  };

  const finalizeRoleplayRewards = (finalTurn: CareerRoleplayTurn) => {
    setRoleplayRewardClaimed(true);
    triggerHaptic('success');
    const expGain = 120;
    const gemsGain = 35;
    commitQuestState((prev) => ({
      ...prev,
      roleplayRunsCount: prev.roleplayRunsCount + 1,
      latestRoleplaySkills: finalTurn.skillScores || prev.latestRoleplaySkills,
      careerExp: prev.careerExp + expGain,
    }));
    if (currentUser && onEarnRewards) {
      onEarnRewards(currentUser.id, expGain, gemsGain, true);
    }
    showNotice(`จบด่าน Role-Play "${activeCareer?.titleTh}"! +${expGain} EXP · +${gemsGain} Gems`);
  };

  // AI Career Coach Chat
  const handleSendCoachMessage = async (customText?: string) => {
    const text = (customText ?? coachInput).trim();
    if (!text) return;
    setAiError(null);
    const studentMsg: CareerCoachMessage = {
      id: `cm-u-${Date.now()}`,
      sender: 'student',
      textTh: text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };
    const nextHistory = [...questState.coachMessages, studentMsg];
    commitQuestState((prev) => ({ ...prev, coachMessages: nextHistory }));
    if (!customText) setCoachInput('');
    setCoachLoading(true);
    try {
      const reply = await askCareerCoachWithGemini({
        message: text,
        careerTitleTh: activeCareer?.titleTh || 'กำลังค้นหาอาชีพที่ใช่',
        targetGpax: activeCareer?.targetGpax || 3.0,
        studentContext: studentAiContext,
        chatHistory: nextHistory,
      });
      const coachMsg: CareerCoachMessage = {
        id: `cm-a-${Date.now()}`,
        sender: 'coach',
        textTh: reply.replyTh,
        actionStepsTh: reply.actionStepsTh,
        encouragedTab: reply.encouragedTab,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: true,
      };
      commitQuestState((prev) => ({
        ...prev,
        coachMessages: [...prev.coachMessages, coachMsg],
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถติดต่อ AI พี่เลี้ยงอาชีพได้');
    } finally {
      setCoachLoading(false);
    }
  };

  const myPlayerScore = useMemo(
    () => playerScores.find((p) => p.userId === currentUser?.id),
    [playerScores, currentUser?.id]
  );

  const dailyQuests = activeCareer?.quests.filter((q) => q.tier === 'daily_weekly') || [];
  const portfolioQuests = activeCareer?.quests.filter((q) => q.tier === 'portfolio') || [];
  const currentRoleplayTurn = roleplayTurns[roleplayTurns.length - 1] || null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ==================================================================== */}
      {/* TEACHER / ADMIN SANDBOX BAR & STUDENT INSIGHTS SWITCHER              */}
      {/* ==================================================================== */}
      {isStaffTester && (
        <section
          aria-label={lang === 'th' ? 'โหมดสำหรับครูผู้สอนและแนะแนว' : 'Teacher Sandbox & Insights'}
          className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{lang === 'th' ? 'โหมดครูผู้สอน · ทดลองเล่น & ติดตามเส้นทางอาชีพนักเรียน' : 'Teacher Sandbox & Student Career Insights'}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'คุณครูสามารถทดลองเล่น Career Quest AI ในมุมมองนักเรียนทุกช่วงชั้น หรือดูเป้าหมายอาชีพที่นักเรียนแชร์ได้'
                  : 'Test Career Quest AI as a student across grade bands or inspect shared student career goals.'}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0">
              <button
                type="button"
                onClick={() => setTeacherPanelTab('sandbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  teacherPanelTab === 'sandbox'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {lang === 'th' ? 'ทดลองเล่นมุมมองนักเรียน' : 'Try Student Sandbox'}
              </button>
              <button
                type="button"
                onClick={() => setTeacherPanelTab('student_insights')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  teacherPanelTab === 'student_insights'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {lang === 'th' ? 'ดูเป้าหมายอาชีพนักเรียน' : 'Shared Student Goals'}
              </button>
            </div>
          </div>

          {teacherPanelTab === 'sandbox' && (
            <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                  {lang === 'th' ? 'จำลองจากข้อมูลนักเรียน:' : 'Simulate student:'}
                </span>
                <select
                  value={sandboxStudentId}
                  onChange={(e) => setSandboxStudentId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                >
                  <option value="">{lang === 'th' ? 'โหมดทดลองอิสระ (เลือกช่วงชั้นเอง)' : 'Free Sandbox (Pick Stage)'}</option>
                  {students.slice(0, 60).map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.firstNameTh} {stu.lastNameTh} ({stu.gradeLevel} · GPA {Number(stu.gpa || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {!sandboxStudentId && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ช่วงชั้น:' : 'Stage:'}
                  </span>
                  {STAGE_LABEL_OPTIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSandboxStageOverride(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
                        sandboxStageOverride === st.id
                          ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                      }`}
                    >
                      {lang === 'th' ? st.labelTh : st.labelEn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* TEACHER STUDENT INSIGHTS TAB                                         */}
      {/* ==================================================================== */}
      {isStaffTester && teacherPanelTab === 'student_insights' ? (
        <section className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ภาพรวมเส้นทางอาชีพที่นักเรียนแชร์กับครูแนะแนว' : 'Shared Student Career Quests'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'แสดงเฉพาะนักเรียนที่เปิดแชร์เป้าหมายอาชีพ เพื่อให้ครูประจำชั้นและครูแนะแนวให้คำปรึกษาได้ตรงจุด'
                  : 'Only students who opted in to share appear here to guide advisory conversations.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadingSharedStates(true);
                loadSchoolSharedCareerQuests(school.id)
                  .then(setSharedStudentStates)
                  .finally(() => setLoadingSharedStates(false));
              }}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium text-[var(--color-text-title)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSharedStates ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
            </button>
          </div>

          {loadingSharedStates ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{lang === 'th' ? 'กำลังโหลดข้อมูลนักเรียน...' : 'Loading student career data...'}</span>
            </div>
          ) : sharedStudentStates.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-[var(--color-border)] rounded-xl">
              <Users className="w-8 h-8 mx-auto text-[var(--color-text-muted)] opacity-50" />
              <p className="text-sm font-semibold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ยังไม่มีนักเรียนบันทึกเป้าหมายอาชีพในโรงเรียนนี้' : 'No shared student career quests yet'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? 'เมื่อนักเรียนเลือกอาชีพและเปิดแชร์ในระบบ ข้อมูลความพร้อมจะปรากฏที่นี่อัตโนมัติ'
                  : 'Once students pick a dream career and enable sharing, their readiness progress will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sharedStudentStates.map((st) => {
                const career =
                  st.pinnedCareers.find((c) => c.id === st.activeCareerId) ||
                  POPULAR_CAREERS.find((c) => c.id === st.activeCareerId);
                return (
                  <article
                    key={st.userId}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                          {st.studentName}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {st.gradeLevel || 'นักเรียน'} · {st.lastReadinessLevel || 'Lv.1 นักสำรวจ'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[var(--color-primary-text)] tabular-nums shrink-0">
                        {st.lastReadinessPercent ?? 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-card)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.min(100, st.lastReadinessPercent ?? 0)}%` }}
                      />
                    </div>
                    <div className="text-xs space-y-1 text-[var(--color-text-body)]">
                      <p>
                        <span className="text-[var(--color-text-muted)]">อาชีพเป้าหมาย:</span>{' '}
                        <strong className="text-[var(--color-text-title)]">{career?.titleTh || 'กำลังค้นหา'}</strong>
                      </p>
                      <p className="tabular-nums text-[var(--color-text-muted)]">
                        ภารกิจสำเร็จ {st.completedQuestIds.length} · Role-Play {st.roleplayRunsCount} ครั้ง · {st.careerExp} EXP
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Notifications / Errors */}
          {toastNotice && (
            <div
              role="status"
              className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{toastNotice}</span>
              </span>
              <button type="button" onClick={() => setToastNotice(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {aiError && (
            <div
              role="alert"
              className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{aiError}</span>
                <button type="button" onClick={() => setAiError(null)} className="cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] opacity-85">
                คุณยังสามารถเลือกอาชีพจากแค็ตตาล็อกด้านล่าง คำนวณความพร้อมจากเกรดจริง ส่งผลงานเข้า Portfolio และทดลอง Role-Play ในโหมดออฟไลน์ได้ตามปกติ
              </p>
            </div>
          )}

          {/* ==================================================================== */}
          {/* MODE 1: ENTRY / CAREER PICKER OR 5-QUESTION VIBE QUIZ                */}
          {/* ==================================================================== */}
          {(showPickerMode || !activeCareer) && (
            <section className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                    <Compass className="w-4 h-4" />
                    <span>Career Quest AI · เส้นทางสู่อาชีพในฝัน</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-title)] text-balance">
                    {lang === 'th' ? 'เลือกเส้นทางเริ่มต้นที่เหมาะกับตัวคุณ' : 'Choose how you want to discover your career path'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'เลือกอาชีพที่ชอบได้ทันที หรือทำแบบประเมินสนุกๆ 5 ข้อให้ AI จับคู่กับเกรดจริงของคุณ'
                      : 'Pick a dream career directly or take a 5-card Vibe Quiz matched with your real grades.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeCareer && (
                    <button
                      type="button"
                      onClick={() => setShowPickerMode(false)}
                      className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                    >
                      {lang === 'th' ? 'กลับหน้าการ์ดอาชีพ' : 'Back to Career Card'}
                    </button>
                  )}
                </div>
              </div>

              {/* 2-Mode Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEntryMode('direct')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    entryMode === 'direct'
                      ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-text-title)]'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-title)]">
                      1. เลือกอาชีพในฝันตรงๆ (หรือพิมพ์เอง)
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      เลือกจากอาชีพยอดฮิต หรือพิมพ์อาชีพยุคใหม่ เช่น Game Developer, UX Designer ให้ Gemini AI วิเคราะห์
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMode('vibe_quiz')}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    entryMode === 'vibe_quiz'
                      ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-500 text-[var(--color-text-title)]'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-violet-400'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-title)]">
                      2. ยังไม่รู้ว่าอยากเป็นอะไร (Career Vibe Quiz 5 ข้อ)
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      ตอบคำถามการ์ด 5 ข้อไม่เกิน 1 นาที ผสมผลเกรดจริงในระบบ แนะนำ 3 อาชีพที่ใช่ที่สุด
                    </p>
                  </div>
                </button>
              </div>

              {entryMode === 'direct' ? (
                <div className="space-y-5">
                  {/* Custom Career AI Input */}
                  <form onSubmit={handleAnalyzeCustomCareer} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Wand2 className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={customCareerInput}
                        onChange={(e) => setCustomCareerInput(e.target.value)}
                        placeholder={
                          lang === 'th'
                            ? 'พิมพ์อาชีพอะไรก็ได้ที่อยากเป็น เช่น Game Developer, UX Designer, นักวิทยาศาสตร์ข้อมูล...'
                            : 'Type any dream career e.g. Game Developer, UX Designer, Data Scientist...'
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={analyzingCareer || !customCareerInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {analyzingCareer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{analyzingCareer ? 'กำลังวิเคราะห์ด้วย AI...' : 'วิเคราะห์อาชีพด้วย Gemini AI'}</span>
                    </button>
                  </form>

                  {/* Popular Career Grid */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'การ์ดอาชีพยอดฮิตสำหรับ Gen Z (เลือกได้ทันที หรือปักหมุดเทียบสูงสุด 3 อาชีพ)' : 'Popular Gen Z Career Cards'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {POPULAR_CAREERS.map((career) => {
                        const isPinned = questState.pinnedCareers.some((c) => c.id === career.id);
                        const isCurrent = questState.activeCareerId === career.id;
                        return (
                          <button
                            key={career.id}
                            type="button"
                            onClick={() => handleSelectCareer(career)}
                            className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                              isCurrent
                                ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)]'
                                : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                                  {career.titleTh}
                                </h3>
                                <span className="text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums shrink-0">
                                  GPA {career.targetGpax.toFixed(2)}+
                                </span>
                              </div>
                              <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                                {career.taglineTh}
                              </p>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">
                              <span>ฉายา: {career.unlockableTitleTh}</span>
                              <span className="font-semibold text-[var(--color-primary-text)]">
                                {isCurrent ? 'กำลังใช้งาน' : isPinned ? 'ปักหมุดอยู่' : 'เลือกอาชีพนี้ →'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE B: 5-Question Career Vibe Quiz */
                <div className="space-y-5">
                  {questState.vibeMatches.length > 0 && quizDraftAnswers.length === 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                          3 อาชีพที่เข้ากับสไตล์และเกรดจริงของคุณมากที่สุด
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizStep(0);
                            setQuizDraftAnswers([]);
                            commitQuestState((prev) => ({ ...prev, vibeMatches: [] }));
                          }}
                          className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>ทำแบบประเมินใหม่</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {questState.vibeMatches.map((m, idx) => (
                          <article
                            key={m.career.id}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 flex flex-col justify-between gap-4"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-violet-700 dark:text-violet-300">
                                  อันดับ #{idx + 1}
                                </span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                  เข้ากัน {m.matchPercent}%
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-[var(--color-text-title)]">
                                {m.career.titleTh}
                              </h4>
                              <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                                {m.reasonTh}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectCareer(m.career)}
                              className="w-full py-2 px-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold cursor-pointer transition"
                            >
                              เลือกเส้นทาง {m.career.titleTh}
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : quizLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                      <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
                      <p className="text-sm font-semibold text-[var(--color-text-title)]">
                        Gemini AI กำลังจับคู่ Vibe ของคุณกับเกรดจริงในระบบ...
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        วิเคราะห์ความถนัดและคำนวณ Top 3 อาชีพที่เหมาะที่สุด
                      </p>
                    </div>
                  ) : questState.vibeMatches.length > 0 && quizDraftAnswers.length === CAREER_VIBE_QUIZ_QUESTIONS.length ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                          ผลวิเคราะห์ 3 อาชีพที่ใช่สำหรับคุณ
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizStep(0);
                            setQuizDraftAnswers([]);
                            commitQuestState((prev) => ({ ...prev, vibeMatches: [] }));
                          }}
                          className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>ทำใหม่</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {questState.vibeMatches.map((m, idx) => (
                          <article
                            key={m.career.id}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 flex flex-col justify-between gap-4"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-violet-700 dark:text-violet-300">อันดับ #{idx + 1}</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                  เข้ากัน {m.matchPercent}%
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-[var(--color-text-title)]">{m.career.titleTh}</h4>
                              <p className="text-xs text-[var(--color-text-body)] leading-relaxed">{m.reasonTh}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectCareer(m.career)}
                              className="w-full py-2 px-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold cursor-pointer transition"
                            >
                              เลือกเส้นทางนี้
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)] tabular-nums">
                        <span className="font-semibold text-violet-700 dark:text-violet-300">
                          คำถามข้อที่ {quizStep + 1} / {CAREER_VIBE_QUIZ_QUESTIONS.length}
                        </span>
                        {quizStep > 0 && (
                          <button
                            type="button"
                            onClick={() => setQuizStep((s) => Math.max(0, s - 1))}
                            className="hover:underline cursor-pointer"
                          >
                            ← ย้อนกลับ
                          </button>
                        )}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--color-card)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-600 transition-all duration-200"
                          style={{ width: `${((quizStep + 1) / CAREER_VIBE_QUIZ_QUESTIONS.length) * 100}%` }}
                        />
                      </div>

                      <h3 className="text-base font-bold text-[var(--color-text-title)]">
                        {CAREER_VIBE_QUIZ_QUESTIONS[quizStep].questionTh}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {CAREER_VIBE_QUIZ_QUESTIONS[quizStep].options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => void handleSelectQuizOption(opt)}
                            className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-violet-500 text-left text-xs sm:text-sm font-medium text-[var(--color-text-title)] transition cursor-pointer flex items-center justify-between gap-2"
                          >
                            <span>{opt.labelTh}</span>
                            <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                          </button>
                        ))}
                      </div>

                      {quizDraftAnswers.length === CAREER_VIBE_QUIZ_QUESTIONS.length && aiError && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleComputeOfflineQuizMatches}
                            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                          >
                            คำนวณผลจับคู่ 3 อาชีพแบบออฟไลน์
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ==================================================================== */}
          {/* ACTIVE CAREER RPG DASHBOARD                                          */}
          {/* ==================================================================== */}
          {activeCareer && readinessReport && (
            <>
              {/* 1. TOP: CAREER RPG CARD & REAL-TIME READINESS */}
              <section
                aria-label="การ์ดตัวละครสายอาชีพ"
                className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-6"
              >
                {/* Pinned Careers Switcher (Compare up to 3 careers without losing EXP) */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-text-muted)] inline-flex items-center gap-1">
                      <Pin className="w-3.5 h-3.5" />
                      <span>อาชีพที่ปักหมุด ({questState.pinnedCareers.length}/3):</span>
                    </span>
                    {questState.pinnedCareers.map((c) => {
                      const isCurrent = c.id === activeCareer.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCareer(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                            isCurrent
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                          }`}
                        >
                          {c.titleTh}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode('direct');
                        setShowPickerMode(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-dashed border-[var(--color-border)] text-xs font-medium text-[var(--color-primary-text)] hover:bg-[var(--color-card-subtle)] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>สลับอาชีพ / ค้นหาตัวตน 5 ข้อ</span>
                    </button>
                  </div>

                  {/* Share Toggle for Advisor & Parent */}
                  <button
                    type="button"
                    onClick={() => {
                      commitQuestState((prev) => ({
                        ...prev,
                        shareWithTeachersAndParents: !prev.shareWithTeachersAndParents,
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                      questState.shareWithTeachersAndParents
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {questState.shareWithTeachersAndParents ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {questState.shareWithTeachersAndParents
                        ? 'แชร์ให้ครูแนะแนว & ผู้ปกครองแล้ว'
                        : 'ซ่อนจากครู & ผู้ปกครอง'}
                    </span>
                  </button>
                </div>

                {/* Main RPG Hero Split */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left: Career Identity + Readiness Gauge */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)] tabular-nums">
                        <span className="font-semibold text-[var(--color-primary-text)]">
                          {readinessReport.rpgLevelTitleTh}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{readinessReport.stageLabelTh}</span>
                        <span aria-hidden="true">·</span>
                        <span>Career EXP {questState.careerExp}</span>
                        {myPlayerScore && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Gems {myPlayerScore.gems}</span>
                          </>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-title)] text-balance">
                        {activeCareer.titleTh}
                        <span className="ml-2 text-base font-medium text-[var(--color-text-muted)]">
                          ({activeCareer.titleEn})
                        </span>
                      </h2>

                      <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                        {activeCareer.taglineTh}
                      </p>
                    </div>

                    {/* Readiness Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                          พลังความพร้อมสู่อาชีพ (Real-Time Readiness)
                        </span>
                        <span className="text-3xl font-extrabold text-[var(--color-text-title)] tabular-nums">
                          {readinessReport.readinessPercent}%
                        </span>
                      </div>
                      <div
                        className="h-3.5 w-full rounded-full bg-[var(--color-card-subtle)] overflow-hidden"
                        role="progressbar"
                        aria-valuenow={readinessReport.readinessPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            readinessReport.readinessPercent >= 78
                              ? 'bg-emerald-600'
                              : readinessReport.readinessPercent >= 52
                                ? 'bg-[var(--color-primary)]'
                                : 'bg-amber-500'
                          }`}
                          style={{ width: `${readinessReport.readinessPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                        <span>Lv.1 นักสำรวจ</span>
                        <span>Lv.2 ผู้ฝึกหัด (52%+)</span>
                        <span>Lv.3 ตัวจริงสายอาชีพ (78%+)</span>
                      </div>
                    </div>

                    {/* Grade-Band Roadmap Box */}
                    <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1.5">
                      <p className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                        <span>แผนเตรียมตัวสำหรับ{readinessReport.stageLabelTh}</span>
                      </p>
                      <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                        {activeCareer.roadmaps[readinessReport.stage]}
                      </p>
                      {readinessReport.stage === 'high' && activeCareer.examFocusHighTh && (
                        <p className="text-[11px] font-medium text-[var(--color-primary-text)] pt-1">
                          เกณฑ์สอบ TCAS/A-Level ที่เกี่ยวข้อง: {activeCareer.examFocusHighTh}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Real GPAX vs Target + Key Subjects Checklist + Career Title */}
                  <div className="lg:col-span-5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                        <div>
                          <p className="text-xs text-[var(--color-text-muted)]">เป้าหมาย GPAX สายอาชีพนี้</p>
                          <p className="text-xl font-bold text-[var(--color-text-title)] tabular-nums">
                            {readinessReport.targetGpax.toFixed(2)}+
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-muted)]">GPAX จริงของคุณ</p>
                          <p
                            className={`text-xl font-bold tabular-nums ${
                              readinessReport.currentGpax === null
                                ? 'text-[var(--color-text-muted)]'
                                : readinessReport.gpaxMet
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {readinessReport.currentGpax !== null ? readinessReport.currentGpax.toFixed(2) : '—'}
                          </p>
                        </div>
                      </div>

                      {readinessReport.currentGpax !== null && (
                        <p
                          className={`text-xs font-semibold tabular-nums ${
                            readinessReport.gpaxMet
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {readinessReport.gpaxMet
                            ? `ถึงเกณฑ์เป้าหมายแล้ว (+${Math.abs(readinessReport.gpaxDelta || 0).toFixed(2)})`
                            : `ขาดอีก ${Math.abs(readinessReport.gpaxDelta || 0).toFixed(2)} เพื่อถึงเป้า ${readinessReport.targetGpax.toFixed(2)}`}
                        </p>
                      )}

                      {/* Key Subjects Matrix */}
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-[var(--color-text-title)]">
                          วิชาหลักที่ต้องปั้น (เทียบเกรดจริง)
                        </p>
                        {readinessReport.subjectItems.map((item) => (
                          <div
                            key={item.req.labelTh}
                            className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[var(--color-border)] last:border-b-0"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--color-text-title)] truncate">
                                {item.req.labelTh}
                              </p>
                              <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                                เป้าหมาย {item.req.targetScore}%+
                                {item.currentScore !== null ? ` · ของคุณ ${item.currentScore}%` : ' · ยังไม่มีผลคะแนน'}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${
                                item.status === 'met'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : item.status === 'needs_boost'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-[var(--color-text-muted)]'
                              }`}
                            >
                              {item.status === 'met'
                                ? '✓ ถึงเกณฑ์แล้ว'
                                : item.status === 'needs_boost'
                                  ? `▲ ต้องอัป +${Math.abs(item.delta)}%`
                                  : 'รอผลคะแนน'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unlockable Career Title */}
                    <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-[var(--color-text-muted)]">ฉายาประจำสายอาชีพ</p>
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{activeCareer.unlockableTitleTh}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEquipCareerTitle(activeCareer.unlockableTitleTh)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition ${
                          questState.equippedCareerTitle === activeCareer.unlockableTitleTh
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                        }`}
                      >
                        {questState.equippedCareerTitle === activeCareer.unlockableTitleTh
                          ? 'กำลังติดฉายานี้'
                          : 'ติดฉายาอวดเพื่อน'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. MIDDLE SECTION: 2 SUB-TABS (QUEST MAP & ROLE-PLAY LAB) */}
              <section className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] w-fit">
                    <button
                      type="button"
                      onClick={() => setMiddleSubTab('quests')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                        middleSubTab === 'quests'
                          ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>แผนที่ภารกิจ (Quests)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMiddleSubTab('roleplay')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                        middleSubTab === 'roleplay'
                          ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>จำลองอาชีพ (Role-Play Lab)</span>
                    </button>
                  </div>

                  {middleSubTab === 'quests' && (
                    <button
                      type="button"
                      onClick={() => void handleRefreshQuestsWithAi()}
                      disabled={refreshingQuests}
                      className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-xs font-semibold text-[var(--color-text-title)] inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {refreshingQuests ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      )}
                      <span>{refreshingQuests ? 'AI กำลังจัดภารกิจ...' : 'อัปเดตภารกิจใหม่ด้วย AI'}</span>
                    </button>
                  )}
                </div>

                {middleSubTab === 'quests' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Group 1: Daily / Weekly Quests */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                          1. ภารกิจประจำวัน / สัปดาห์ (ทำในแอปได้ EXP & Gems)
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          ลงมือทำผ่านฟีเจอร์จริงใน BaanPakKru แล้วกดรับรางวัลได้ทันที
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {dailyQuests.map((q) => {
                          const done = questState.completedQuestIds.includes(q.id);
                          return (
                            <article
                              key={q.id}
                              className={`p-4 rounded-xl border transition space-y-2.5 ${
                                done
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--color-text-title)]">
                                    {q.titleTh}
                                  </p>
                                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    {q.descriptionTh}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-[var(--color-primary-text)] tabular-nums shrink-0">
                                  +{q.expReward} EXP · +{q.gemsReward} Gems
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                  ทักษะ: {q.skillTag || activeCareer.titleTh}
                                </span>
                                <div className="flex items-center gap-2">
                                  {q.targetAppTab && onNavigate && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigate(q.targetAppTab as NavTab)}
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-medium text-[var(--color-text-title)] hover:border-[var(--color-primary)] cursor-pointer whitespace-nowrap"
                                    >
                                      ไปทำภารกิจนี้ →
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={done}
                                    onClick={() => handleCompleteQuest(q)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition ${
                                      done
                                        ? 'bg-emerald-600 text-white opacity-90 cursor-default'
                                        : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                                    }`}
                                  >
                                    {done ? '✓ รับรางวัลแล้ว' : 'ติ๊กผ่าน & รับ EXP'}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group 2: Portfolio Quests */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                          2. ภารกิจสะสมผลงานจริง (เชื่อมเข้า Portfolio อัตโนมัติ)
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          ส่งชิ้นงานเพื่อเก็บลงแฟ้มผลงานใช้ยื่นเรียนต่อได้จริง และผ่านภารกิจทันที
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {portfolioQuests.map((q) => {
                          const done = questState.completedQuestIds.includes(q.id);
                          return (
                            <article
                              key={q.id}
                              className={`p-4 rounded-xl border transition space-y-2.5 ${
                                done
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--color-text-title)]">
                                    {q.titleTh}
                                  </p>
                                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    {q.descriptionTh}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                                  +{q.expReward} EXP · +{q.gemsReward} Gems
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                  ผลงานสะสมปัจจุบัน: {scopedPortfolio.length} ชิ้น
                                </span>
                                <div className="flex items-center gap-2">
                                  {onNavigate && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigate('portfolio')}
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-medium text-[var(--color-text-title)] hover:border-[var(--color-primary)] cursor-pointer whitespace-nowrap"
                                    >
                                      ดูแฟ้มผลงาน
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={done}
                                    onClick={() => {
                                      setPortfolioQuestModal(q);
                                      setPfTitle(q.titleTh);
                                      setPfDesc('');
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                                      done
                                        ? 'bg-emerald-600 text-white cursor-default'
                                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                                    }`}
                                  >
                                    <FolderGit2 className="w-3.5 h-3.5" />
                                    <span>{done ? '✓ ส่งเข้า Portfolio แล้ว' : 'ส่งผลงาน & ผ่านภารกิจ'}</span>
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SUB-TAB 2: AI ROLE-PLAY MISSION */
                  <div className="space-y-5">
                    {roleplayTurns.length === 0 ? (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center mx-auto">
                          <Rocket className="w-6 h-6" />
                        </div>
                        <div className="max-w-xl mx-auto space-y-1.5">
                          <h3 className="text-lg font-bold text-[var(--color-text-title)]">
                            ลองสวมบทบาทเป็น "{activeCareer.titleTh}" ในสถานการณ์จำลอง 4 ตา
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                            Gemini AI จะสร้างสถานการณ์เสมือนจริงให้คุณตัดสินใจ แก้ปัญหา และสื่อสาร จบด่านรับคะแนนทักษะ 4 ด้านพร้อม +120 EXP และ +35 Gems
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            disabled={roleplayLoading}
                            onClick={() => void handleStartRoleplay('ai')}
                            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                          >
                            {roleplayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            <span>{roleplayLoading ? 'กำลังสร้างด่านจำลอง...' : 'เริ่มด่านจำลองด้วย Gemini AI'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStartRoleplay('offline')}
                            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] hover:border-[var(--color-primary)] cursor-pointer transition"
                          >
                            เล่นด่านตัวอย่าง (โหมดออฟไลน์)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Turn History Summary */}
                        <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                          <span className="font-semibold text-violet-700 dark:text-violet-300 tabular-nums">
                            {roleplayMode === 'ai' ? 'Gemini AI Role-Play' : 'ด่านตัวอย่างออฟไลน์'} · ตาที่{' '}
                            {currentRoleplayTurn?.turnNumber || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRoleplayTurns([])}
                            className="hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>เริ่มด่านใหม่</span>
                          </button>
                        </div>

                        {currentRoleplayTurn && (
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-5 space-y-4">
                            {currentRoleplayTurn.turnFeedbackTh && (
                              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                                <strong>ผลจากการตัดสินใจล่าสุด:</strong> {currentRoleplayTurn.turnFeedbackTh}
                              </div>
                            )}

                            <div className="space-y-2">
                              <h4 className="text-base font-bold text-[var(--color-text-title)]">
                                {currentRoleplayTurn.sceneTitleTh}
                              </h4>
                              <p className="text-sm text-[var(--color-text-body)] leading-relaxed">
                                {currentRoleplayTurn.situationTh}
                              </p>
                              {currentRoleplayTurn.npcDialogueTh && (
                                <div className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-title)]">
                                  {currentRoleplayTurn.npcDialogueTh}
                                </div>
                              )}
                            </div>

                            {roleplayLoading ? (
                              <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>AI กำลังประมวลผลสถานการณ์ถัดไป...</span>
                              </div>
                            ) : currentRoleplayTurn.isCompleted ? (
                              <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
                                {currentRoleplayTurn.skillScores && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                      { label: 'การคิดวิเคราะห์', val: currentRoleplayTurn.skillScores.analytical },
                                      { label: 'การสื่อสาร', val: currentRoleplayTurn.skillScores.communication },
                                      { label: 'ความเห็นอกเห็นใจ', val: currentRoleplayTurn.skillScores.empathy },
                                      { label: 'การแก้ปัญหา', val: currentRoleplayTurn.skillScores.problemSolving },
                                    ].map((sk) => (
                                      <div
                                        key={sk.label}
                                        className="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-1"
                                      >
                                        <p className="text-[11px] text-[var(--color-text-muted)]">{sk.label}</p>
                                        <p className="text-xl font-bold text-[var(--color-primary-text)] tabular-nums">
                                          {sk.val}%
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed">
                                  {currentRoleplayTurn.summaryFeedbackTh}
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => void handleStartRoleplay('ai')}
                                    className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold cursor-pointer"
                                  >
                                    เล่นสถานการณ์ใหม่ด้วย Gemini AI
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                                  เลือกการตัดสินใจของคุณ:
                                </p>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {currentRoleplayTurn.choices.map((ch) => (
                                    <button
                                      key={ch.id}
                                      type="button"
                                      onClick={() => void handleChooseRoleplayOption(ch.labelTh)}
                                      className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-left transition cursor-pointer flex items-center justify-between gap-3"
                                    >
                                      <span className="text-xs sm:text-sm font-medium text-[var(--color-text-title)]">
                                        {ch.labelTh}
                                      </span>
                                      {ch.skillHint && (
                                        <span className="text-[11px] text-[var(--color-primary-text)] shrink-0">
                                          {ch.skillHint}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* 3. BOTTOM SECTION: STRENGTHS / GAPS & AI CAREER COACH */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left: Real-Grade Strengths & Gaps */}
                <section className="lg:col-span-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[var(--color-primary-text)]" />
                      <span>วิเคราะห์จุดแข็ง–จุดที่ต้องเติม (จากข้อมูลจริง)</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">จุดแข็งที่มีอยู่แล้ว</p>
                      {readinessReport.strengthsTh.length > 0 ? (
                        <ul className="space-y-1 text-xs text-[var(--color-text-body)]">
                          {readinessReport.strengthsTh.map((s) => (
                            <li key={s}>• {s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          เริ่มทำภารกิจหรือรอผลคะแนนภาคเรียนเพื่อปลดล็อกจุดแข็งของคุณ
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">จุดที่ควรเสริมเพิ่ม</p>
                      {readinessReport.gapsTh.length > 0 ? (
                        <ul className="space-y-1 text-xs text-[var(--color-text-body)]">
                          {readinessReport.gapsTh.map((g) => (
                            <li key={g}>• {g}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          ยอดเยี่ยม! ข้อมูลพื้นฐานทั้งหมดของคุณผ่านเกณฑ์เป้าหมายแล้ว
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Right: AI Career Coach Chat */}
                <section className="lg:col-span-7 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                          AI พี่เลี้ยงอาชีพส่วนตัว (Career Coach)
                        </h3>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)]">ตอบอ้างอิงจากเกรดจริงของคุณ</span>
                    </div>

                    {/* Quick Starter Prompts */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_COACH_PROMPTS_TH.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          disabled={coachLoading}
                          onClick={() => void handleSendCoachMessage(prompt)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[11px] font-medium text-[var(--color-text-body)] cursor-pointer transition text-left"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages */}
                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                      {questState.coachMessages.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                          ทักทายพี่เลี้ยง AI ได้เลย! เช่น "เทอมนี้ได้เกรดคณิต 2.5 ยังมีสิทธิ์เป็น {activeCareer.titleTh} ไหมครับ ต้องเริ่มแก้ตรงไหน?"
                        </div>
                      ) : (
                        questState.coachMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-xl text-xs space-y-2 ${
                              msg.sender === 'student'
                                ? 'bg-[var(--color-primary-light)] text-[var(--color-text-title)] ml-6'
                                : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                              <span className="font-semibold">
                                {msg.sender === 'student' ? 'คุณ' : 'AI พี่เลี้ยงอาชีพ'}
                              </span>
                              <span className="tabular-nums">{msg.timestamp}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-line">{msg.textTh}</p>
                            {msg.actionStepsTh && msg.actionStepsTh.length > 0 && (
                              <ul className="space-y-1 pt-1 border-t border-[var(--color-border)]">
                                {msg.actionStepsTh.map((step, i) => (
                                  <li key={i} className="font-medium text-[var(--color-text-title)]">
                                    {i + 1}. {step}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {msg.encouragedTab && onNavigate && (
                              <button
                                type="button"
                                onClick={() => onNavigate(msg.encouragedTab as NavTab)}
                                className="text-[11px] font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                              >
                                ไปฝึกต่อในโมดูลที่แนะนำ →
                              </button>
                            )}
                          </div>
                        ))
                      )}
                      {coachLoading && (
                        <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] inline-flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>พี่เลี้ยง AI กำลังวิเคราะห์แผนให้คุณ...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSendCoachMessage();
                    }}
                    className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]"
                  >
                    <input
                      type="text"
                      value={coachInput}
                      onChange={(e) => setCoachInput(e.target.value)}
                      placeholder="พิมพ์คำถามถึง AI พี่เลี้ยงอาชีพ..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <button
                      type="submit"
                      disabled={coachLoading || !coachInput.trim()}
                      className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ถาม AI</span>
                    </button>
                  </form>
                </section>
              </div>
            </>
          )}
        </>
      )}

      {/* Quick Portfolio Evidence Submit Modal */}
      {portfolioQuestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                ส่งผลงานเข้า Digital Portfolio
              </h3>
              <button
                type="button"
                onClick={() => setPortfolioQuestModal(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              ภารกิจ: {portfolioQuestModal.titleTh}
            </p>
            <form onSubmit={handleSubmitPortfolioFromQuest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-title)] mb-1">
                  ชื่อผลงาน / กิจกรรม
                </label>
                <input
                  type="text"
                  required
                  value={pfTitle}
                  onChange={(e) => setPfTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-title)] mb-1">
                  หมวดหมู่ในแฟ้มผลงาน
                </label>
                <select
                  value={pfCategory}
                  onChange={(e) => setPfCategory(e.target.value as PortfolioItem['category'])}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                >
                  <option value="academic">วิชาการและโครงงาน</option>
                  <option value="activity">กิจกรรมและจิตอาสา</option>
                  <option value="competition">การแข่งขันและรางวัล</option>
                  <option value="certificate">เกียรติบัตรและการอบรม</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-title)] mb-1">
                  สรุปสิ่งที่ได้เรียนรู้ / รายละเอียดผลงาน
                </label>
                <textarea
                  rows={3}
                  value={pfDesc}
                  onChange={(e) => setPfDesc(e.target.value)}
                  placeholder="เล่าสั้นๆ ว่าทำอะไร เรียนรู้อะไร หรือแนบลิงก์ผลงาน..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-sm text-[var(--color-text-title)]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPortfolioQuestModal(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-body)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                >
                  บันทึกเข้า Portfolio & รับ {portfolioQuestModal.expReward} EXP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
