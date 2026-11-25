import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Swords,
  Flame,
  Users,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Radio,
  Copy,
  Check,
  LogOut,
  Heart,
} from 'lucide-react';
import {
  AppLanguage,
  AuthUser,
  BossRaidConfig,
  PortfolioItem,
  QuizQuestion,
  UserRole,
} from '../types';
import { INITIAL_BOSS_RAID_CONFIG } from '../data/innovativeFeaturesData';
import { COMPREHENSIVE_QUESTION_BANK } from '../data/examQuestionBanks';
import { playHeavyImpactSound, playComboStreakSound, playGrandVictoryFanfare } from '../lib/labSoundEffects';
import {
  connectLiveClassroomChannel,
  formatRoomPin,
  generateRoomPin,
  type LiveBossDamageEvent,
  type LiveClassroomEvent,
  type LiveRoomPlayer,
  type LiveRoomState,
  type LiveTransportHandle,
} from '../lib/liveClassroomRealtime';

interface CoopBossRaidViewProps {
  questions?: QuizQuestion[];
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  schoolId?: string;
  currentUser?: AuthUser | null;
  onEarnRewards?: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onAwardPortfolioItem?: (item: PortfolioItem) => void;
  onExit?: () => void;
}

export const CoopBossRaidView: React.FC<CoopBossRaidViewProps> = ({
  questions = [],
  lang = 'th',
  currentRole = 'student',
  currentUserName = 'นักเรียน',
  schoolId,
  currentUser,
  onEarnRewards,
  onAwardPortfolioItem,
  onExit,
}) => {
  const actorUserId = currentUser?.id || 'local-player';
  const actorDisplayName = currentUser?.fullNameTh || currentUser?.fullNameEn || currentUserName || 'ผู้กล้า';
  const actorAvatarUrl = currentUser?.avatarUrl || '';

  const [savedToPortfolio, setSavedToPortfolio] = useState(false);
  const canManageRaid = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';
  const [bossConfig, setBossConfig] = useState<BossRaidConfig>(() => ({
    ...INITIAL_BOSS_RAID_CONFIG,
    bossCurrentHp: INITIAL_BOSS_RAID_CONFIG.bossMaxHp,
    status: 'in_battle',
  }));
  const [soloDamageDealt, setSoloDamageDealt] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attackAnimation, setAttackAnimation] = useState<boolean>(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [comboCount, setComboCount] = useState<number>(0);
  const [activeHintToast, setActiveHintToast] = useState<string | null>(null);
  const [victoryCelebration, setVictoryCelebration] = useState<boolean>(false);
  const [examFilter, setExamFilter] = useState<'all_bank' | 'teacher_created'>('all_bank');
  const [questionCursor, setQuestionCursor] = useState<number>(0);
  const [isTeacherPanelOpen, setIsTeacherPanelOpen] = useState<boolean>(false);
  const [showSquadDrawer, setShowSquadDrawer] = useState<boolean>(false);

  // Guard to award Arcade XP/Gems strictly once per Boss defeat
  const hasAwardedVictoryRef = useRef<boolean>(false);

  // Realtime Live Party state
  const [liveMode, setLiveMode] = useState<'solo' | 'host' | 'guest'>('solo');
  const [livePinInput, setLivePinInput] = useState<string>('');
  const [liveRoom, setLiveRoom] = useState<LiveRoomState | null>(null);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [livePresenceCount, setLivePresenceCount] = useState<number>(1);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const transportRef = useRef<LiveTransportHandle | null>(null);
  const liveRoomRef = useRef<LiveRoomState | null>(null);
  const bossConfigRef = useRef<BossRaidConfig>(bossConfig);

  useEffect(() => {
    liveRoomRef.current = liveRoom;
  }, [liveRoom]);

  useEffect(() => {
    bossConfigRef.current = bossConfig;
  }, [bossConfig]);

  useEffect(() => {
    return () => {
      transportRef.current?.disconnect();
      transportRef.current = null;
    };
  }, []);

  const triggerVictoryRewardsIfNeeded = (nextHp: number) => {
    if (nextHp === 0) {
      setVictoryCelebration(true);
      playGrandVictoryFanfare();
      if (!hasAwardedVictoryRef.current) {
        hasAwardedVictoryRef.current = true;
        if (onEarnRewards && currentUser?.id) {
          onEarnRewards(currentUser.id, 200, 30, true);
        }
      }
    }
  };

  const teacherCreatedQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.id.startsWith('q-custom-') || q.id.startsWith('csv-') || q.category === 'exam'
      ),
    [questions]
  );

  // Combine real school questions + built-in curriculum bank
  const mergedQuestionBank = useMemo(() => {
    const seen = new Set<string>();
    const combined: QuizQuestion[] = [];
    for (const q of [...questions, ...COMPREHENSIVE_QUESTION_BANK]) {
      if (q && q.id && !seen.has(q.id) && Array.isArray(q.options) && q.options.length >= 2) {
        seen.add(q.id);
        combined.push(q);
      }
    }
    return combined;
  }, [questions]);

  const raidPool = useMemo(() => {
    if (examFilter === 'teacher_created') {
      if (teacherCreatedQuestions.length > 0) return teacherCreatedQuestions;
      if (questions.length > 0) return questions;
    }
    return mergedQuestionBank;
  }, [examFilter, teacherCreatedQuestions, questions, mergedQuestionBank]);

  const showToast = (msg: string) => {
    setActiveHintToast(msg);
    window.setTimeout(() => setActiveHintToast(null), 2600);
  };

  const leaveLiveParty = () => {
    transportRef.current?.disconnect();
    transportRef.current = null;
    setLiveMode('solo');
    setLiveRoom(null);
    setLiveStatus('idle');
    setLivePresenceCount(1);
  };

  const createLivePartyRoom = () => {
    transportRef.current?.disconnect();
    const pin = generateRoomPin();
    const initialHostPlayer: LiveRoomPlayer = {
      userId: actorUserId,
      name: actorDisplayName,
      avatarUrl: actorAvatarUrl,
      score: 0,
      correctCount: 0,
      streak: comboCount,
      damageDealt: soloDamageDealt,
      answeredQuestionIndex: null,
      joinedAt: Date.now(),
    };
    const initialState: LiveRoomState = {
      pin,
      mode: 'boss_raid',
      hostId: actorUserId,
      hostName: actorDisplayName,
      subjectLabel: bossConfig.subject,
      phase: 'question',
      questionIndex: questionCursor,
      totalQuestions: raidPool.length,
      secondsPerQuestion: 45,
      questionStartedAt: Date.now(),
      currentQuestion: {
        id: bossConfig.activeQuestion.id,
        subject: bossConfig.subject,
        questionTh: bossConfig.activeQuestion.questionTh,
        options: bossConfig.activeQuestion.options,
      },
      revealCorrectIndex: null,
      revealExplanationTh: bossConfig.activeQuestion.explanationTh,
      bossName: bossConfig.bossNameTh,
      bossMaxHp: bossConfig.bossMaxHp,
      bossCurrentHp: bossConfig.bossCurrentHp,
      lastDamageFeed: [],
      players: [initialHostPlayer],
      updatedAt: Date.now(),
    };

    setLiveMode('host');
    setLiveRoom(initialState);
    setShowSquadDrawer(true);

    const handle = connectLiveClassroomChannel({
      pin,
      userId: actorUserId,
      userName: actorDisplayName,
      onStatusChange: (status) => setLiveStatus(status),
      onPresenceCountChange: (count) => setLivePresenceCount(Math.max(1, count)),
      onEvent: (evt: LiveClassroomEvent) => {
        const currentRoom = liveRoomRef.current;
        if (!currentRoom) return;

        if (evt.type === 'room:sync_request') {
          transportRef.current?.send({ type: 'room:state', state: currentRoom });
          return;
        }

        if (evt.type === 'player:join') {
          const exists = currentRoom.players.some((p) => p.userId === evt.player.userId);
          const nextPlayers = exists
            ? currentRoom.players
            : [
                ...currentRoom.players,
                {
                  userId: evt.player.userId,
                  name: evt.player.name,
                  avatarUrl: evt.player.avatarUrl,
                  score: 0,
                  correctCount: 0,
                  streak: 0,
                  damageDealt: 0,
                  answeredQuestionIndex: null,
                  joinedAt: Date.now(),
                },
              ];
          const updated: LiveRoomState = {
            ...currentRoom,
            players: nextPlayers,
            updatedAt: Date.now(),
          };
          setLiveRoom(updated);
          transportRef.current?.send({ type: 'room:state', state: updated });
          showToast(`${evt.player.name} เข้าร่วมปาร์ตี้สู้บอสแล้ว`);
          return;
        }

        if (evt.type === 'player:answer') {
          const currentBoss = bossConfigRef.current;
          const isCorrect = evt.choiceIndex === currentBoss.activeQuestion.correctIndex;
          const player = currentRoom.players.find((p) => p.userId === evt.userId);
          if (!player) return;

          const nextPlayerStreak = isCorrect ? player.streak + 1 : 0;
          const mult = 1 + Math.min(1.5, nextPlayerStreak * 0.25);
          const dmg = isCorrect ? Math.round(currentBoss.activeQuestion.baseDamage * mult) : 0;
          const nextHp = Math.max(0, currentBoss.bossCurrentHp - dmg);

          setBossConfig((prev) => ({
            ...prev,
            bossCurrentHp: nextHp,
            status: nextHp === 0 ? 'defeated' : 'in_battle',
          }));
          if (dmg > 0) {
            setLastDamage(dmg);
            setAttackAnimation(true);
            window.setTimeout(() => setAttackAnimation(false), 700);
          }

          const dmgEvent: LiveBossDamageEvent | null =
            dmg > 0
              ? {
                  id: `dmg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  playerName: player.name,
                  damage: dmg,
                  critical: mult >= 1.5,
                }
              : null;

          const updatedState: LiveRoomState = {
            ...currentRoom,
            bossCurrentHp: nextHp,
            phase: nextHp === 0 ? 'finished' : 'question',
            lastDamageFeed: dmgEvent
              ? [dmgEvent, ...currentRoom.lastDamageFeed].slice(0, 6)
              : currentRoom.lastDamageFeed,
            players: currentRoom.players.map((p) =>
              p.userId === evt.userId
                ? {
                    ...p,
                    streak: nextPlayerStreak,
                    damageDealt: p.damageDealt + dmg,
                    correctCount: p.correctCount + (isCorrect ? 1 : 0),
                    score: p.score + dmg,
                    lastAnswerCorrect: isCorrect,
                    lastPointsDelta: dmg,
                  }
                : p
            ),
            updatedAt: Date.now(),
          };
          setLiveRoom(updatedState);
          transportRef.current?.send({ type: 'room:state', state: updatedState });
          triggerVictoryRewardsIfNeeded(nextHp);
        }
      },
    });

    transportRef.current = handle;
    showToast(`สร้างห้องปาร์ตี้ PIN ${formatRoomPin(pin)} แล้ว`);
  };

  const joinLivePartyRoom = () => {
    const cleanPin = livePinInput.replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length !== 6) {
      showToast('กรุณากรอก PIN ห้องปาร์ตี้ให้ครบ 6 หลัก');
      return;
    }

    transportRef.current?.disconnect();
    setLiveMode('guest');
    setShowSquadDrawer(true);

    const handle = connectLiveClassroomChannel({
      pin: cleanPin,
      userId: actorUserId,
      userName: actorDisplayName,
      onStatusChange: (status) => {
        setLiveStatus(status);
        if (status === 'connected') {
          transportRef.current?.send({
            type: 'player:join',
            player: {
              userId: actorUserId,
              name: actorDisplayName,
              avatarUrl: actorAvatarUrl,
            },
          });
          transportRef.current?.send({ type: 'room:sync_request', userId: actorUserId });
        }
      },
      onPresenceCountChange: (count) => setLivePresenceCount(Math.max(1, count)),
      onEvent: (evt: LiveClassroomEvent) => {
        if (evt.type === 'room:state') {
          setLiveRoom(evt.state);
          setBossConfig((prev) => ({
            ...prev,
            bossNameTh: evt.state.bossName || prev.bossNameTh,
            bossMaxHp: evt.state.bossMaxHp || prev.bossMaxHp,
            bossCurrentHp: evt.state.bossCurrentHp,
            subject: evt.state.subjectLabel || prev.subject,
            status: evt.state.bossCurrentHp === 0 ? 'defeated' : 'in_battle',
          }));
          triggerVictoryRewardsIfNeeded(evt.state.bossCurrentHp);
        } else if (evt.type === 'room:closed') {
          showToast(evt.reason || 'หัวหน้าปาร์ตี้ปิดห้องแล้ว');
          leaveLiveParty();
        }
      },
    });
    transportRef.current = handle;
  };

  const broadcastHostBossUpdate = (nextConfig: BossRaidConfig, cursor: number, extraFeed?: LiveBossDamageEvent) => {
    if (liveMode !== 'host' || !liveRoomRef.current) return;
    const updated: LiveRoomState = {
      ...liveRoomRef.current,
      subjectLabel: nextConfig.subject,
      questionIndex: cursor,
      bossName: nextConfig.bossNameTh,
      bossMaxHp: nextConfig.bossMaxHp,
      bossCurrentHp: nextConfig.bossCurrentHp,
      phase: nextConfig.bossCurrentHp === 0 ? 'finished' : 'question',
      currentQuestion: {
        id: nextConfig.activeQuestion.id,
        subject: nextConfig.subject,
        questionTh: nextConfig.activeQuestion.questionTh,
        options: nextConfig.activeQuestion.options,
      },
      revealExplanationTh: nextConfig.activeQuestion.explanationTh,
      lastDamageFeed: extraFeed
        ? [extraFeed, ...liveRoomRef.current.lastDamageFeed].slice(0, 6)
        : liveRoomRef.current.lastDamageFeed,
      updatedAt: Date.now(),
    };
    setLiveRoom(updated);
    transportRef.current?.send({ type: 'room:state', state: updated });
  };

  const applyQuizQuestionToBoss = (q: QuizQuestion, nextCursor = questionCursor) => {
    setSelectedAnswer(null);
    setLastDamage(null);
    const nextConfig: BossRaidConfig = {
      ...bossConfigRef.current,
      subject: q.subject,
      activeQuestion: {
        id: q.id,
        questionTh: q.questionTh,
        options: q.options,
        correctIndex: q.correctIndex,
        explanationTh: q.explanationTh || 'ตรวจสอบคำอธิบายในคลังข้อสอบ',
        baseDamage: Math.max(280, (q.points || 100) * 3),
      },
    };
    setBossConfig(nextConfig);
    broadcastHostBossUpdate(nextConfig, nextCursor);
  };

  const handleAttackBoss = (optionIdx: number) => {
    if (bossConfig.status !== 'in_battle' || selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);

    if (liveMode === 'guest') {
      transportRef.current?.send({
        type: 'player:answer',
        userId: actorUserId,
        questionIndex: questionCursor,
        choiceIndex: optionIdx,
        elapsedMs: 1200,
      });
    }

    const isCorrect = optionIdx === bossConfig.activeQuestion.correctIndex;
    if (isCorrect) {
      const nextCombo = comboCount + 1;
      setComboCount(nextCombo);
      playHeavyImpactSound();
      playComboStreakSound(Math.min(5, nextCombo));
      const multiplier = 1 + Math.min(1.5, nextCombo * 0.25);
      const damage = Math.round(bossConfig.activeQuestion.baseDamage * multiplier);
      setLastDamage(damage);
      setAttackAnimation(true);
      setSoloDamageDealt((prev) => prev + damage);

      if (liveMode !== 'guest') {
        const nextHp = Math.max(0, bossConfig.bossCurrentHp - damage);
        const nextConfig: BossRaidConfig = {
          ...bossConfig,
          bossCurrentHp: nextHp,
          status: nextHp === 0 ? 'defeated' : 'in_battle',
        };
        setBossConfig(nextConfig);

        if (liveMode === 'host' && liveRoom) {
          const nextPlayers = liveRoom.players.map((p) =>
            p.userId === actorUserId
              ? {
                  ...p,
                  streak: nextCombo,
                  damageDealt: p.damageDealt + damage,
                  correctCount: p.correctCount + 1,
                  score: p.score + damage,
                  lastAnswerCorrect: true,
                  lastPointsDelta: damage,
                }
              : p
          );
          const feedItem: LiveBossDamageEvent = {
            id: `dmg-${Date.now()}`,
            playerName: actorDisplayName,
            damage,
            critical: multiplier >= 1.5,
          };
          const updatedRoom: LiveRoomState = {
            ...liveRoom,
            bossCurrentHp: nextHp,
            phase: nextHp === 0 ? 'finished' : 'question',
            players: nextPlayers,
            lastDamageFeed: [feedItem, ...liveRoom.lastDamageFeed].slice(0, 6),
            updatedAt: Date.now(),
          };
          setLiveRoom(updatedRoom);
          transportRef.current?.send({ type: 'room:state', state: updatedRoom });
        }

        triggerVictoryRewardsIfNeeded(nextHp);
      }
    } else {
      setComboCount(0);
      setLastDamage(0);
      setAttackAnimation(false);
    }

    window.setTimeout(() => {
      setAttackAnimation(false);
    }, 900);
  };

  const handleNextRaidQuestion = () => {
    if (raidPool.length > 0) {
      let nextIdx = (questionCursor + 1) % raidPool.length;
      if (raidPool[nextIdx].id === bossConfig.activeQuestion.id && raidPool.length > 1) {
        nextIdx = (nextIdx + 1) % raidPool.length;
      }
      setQuestionCursor(nextIdx);
      applyQuizQuestionToBoss(raidPool[nextIdx], nextIdx);
      return;
    }
    setSelectedAnswer(null);
    setLastDamage(null);
  };

  const handleRestartBoss = () => {
    hasAwardedVictoryRef.current = false;
    const startIdx = Math.floor(Math.random() * Math.max(1, raidPool.length));
    const firstQ = raidPool[startIdx];
    setQuestionCursor(startIdx);
    setComboCount(0);
    setSoloDamageDealt(0);
    setSelectedAnswer(null);
    setLastDamage(null);
    setVictoryCelebration(false);
    setSavedToPortfolio(false);

    const nextConfig: BossRaidConfig = {
      ...INITIAL_BOSS_RAID_CONFIG,
      bossCurrentHp: INITIAL_BOSS_RAID_CONFIG.bossMaxHp,
      status: 'in_battle',
      ...(firstQ
        ? {
            subject: firstQ.subject,
            activeQuestion: {
              id: firstQ.id,
              questionTh: firstQ.questionTh,
              options: firstQ.options,
              correctIndex: firstQ.correctIndex,
              explanationTh: firstQ.explanationTh || 'ตรวจสอบคำอธิบายในคลังข้อสอบ',
              baseDamage: Math.max(280, (firstQ.points || 100) * 3),
            },
          }
        : {}),
    };
    setBossConfig(nextConfig);
    if (liveMode === 'host' && liveRoomRef.current) {
      const resetPlayers = liveRoomRef.current.players.map((p) => ({
        ...p,
        damageDealt: 0,
        streak: 0,
        correctCount: 0,
        score: 0,
      }));
      const nextRoom: LiveRoomState = {
        ...liveRoomRef.current,
        players: resetPlayers,
        lastDamageFeed: [],
      };
      setLiveRoom(nextRoom);
      liveRoomRef.current = nextRoom;
      broadcastHostBossUpdate(nextConfig, startIdx);
    }
  };

  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((bossConfig.bossCurrentHp / Math.max(1, bossConfig.bossMaxHp)) * 100))
  );

  const squadMembers = useMemo(() => {
    if (liveRoom) {
      return [...liveRoom.players].sort((a, b) => b.damageDealt - a.damageDealt);
    }
    return [
      {
        userId: actorUserId,
        name: actorDisplayName,
        avatarUrl: actorAvatarUrl,
        score: soloDamageDealt,
        correctCount: comboCount,
        streak: comboCount,
        damageDealt: soloDamageDealt,
        answeredQuestionIndex: null,
        joinedAt: Date.now(),
      } satisfies LiveRoomPlayer,
    ];
  }, [liveRoom, actorUserId, actorDisplayName, actorAvatarUrl, soloDamageDealt, comboCount]);

  const totalSquadDamage = squadMembers.reduce((sum, m) => sum + m.damageDealt, 0);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-[#09090B] text-white font-sans select-none">
      {/* Subtle Toast */}
      {activeHintToast && (
        <div className="fixed top-16 right-4 z-50 px-3.5 py-2 rounded-xl bg-zinc-900 text-zinc-100 shadow-2xl border border-amber-400/40 flex items-center gap-2 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{activeHintToast}</span>
        </div>
      )}

      {/* Single-Row Gen Z Top Bar (52px) */}
      <header className="h-14 px-3 sm:px-5 border-b border-zinc-800/80 bg-[#09090B] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold cursor-pointer shrink-0 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ออก</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
              Boss Raid
            </h1>
            <p className="text-[11px] text-zinc-400 truncate">
              {bossConfig.bossNameTh}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {liveRoom && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>PIN {formatRoomPin(liveRoom.pin)} · {livePresenceCount} คน</span>
            </span>
          )}

          {comboCount > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-black font-mono tabular-nums flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              <span>x{(1 + Math.min(1.5, comboCount * 0.25)).toFixed(1)}</span>
            </div>
          )}

          {canManageRaid && (
            <button
              type="button"
              onClick={() => setIsTeacherPanelOpen(!isTeacherPanelOpen)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition ${
                isTeacherPanelOpen
                  ? 'bg-amber-400 text-zinc-950 border-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
              title={lang === 'th' ? 'ควบคุมบอส (ครู)' : 'Teacher Controls'}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleRestartBoss}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition"
            title="เริ่มรอบใหม่"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Teacher Control Strip */}
      {canManageRaid && isTeacherPanelOpen && (
        <div className="shrink-0 px-3 sm:px-5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-zinc-400">บอส:</span>
            <button
              type="button"
              onClick={() => {
                const nextConfig = {
                  ...bossConfig,
                  bossNameTh: 'โกเลมสะเทินกรด-เบส',
                  subject: 'เคมี ม.ปลาย',
                  topicTh: 'การคำนวณจุดยุติและอินดิเคเตอร์',
                };
                setBossConfig(nextConfig);
                broadcastHostBossUpdate(nextConfig, questionCursor);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold cursor-pointer"
            >
              เคมี (กรด-เบส)
            </button>
            <button
              type="button"
              onClick={() => {
                const nextConfig = {
                  ...bossConfig,
                  bossNameTh: 'จอมอสูรไวยากรณ์',
                  subject: 'ภาษาอังกฤษ',
                  topicTh: 'Subject-Verb Agreement',
                };
                setBossConfig(nextConfig);
                broadcastHostBossUpdate(nextConfig, questionCursor);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold cursor-pointer"
            >
              อังกฤษ (Grammar)
            </button>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const nextFilter = examFilter === 'all_bank' ? 'teacher_created' : 'all_bank';
                  setExamFilter(nextFilter);
                  setQuestionCursor(0);
                  const nextPool =
                    nextFilter === 'teacher_created'
                      ? teacherCreatedQuestions.length > 0
                        ? teacherCreatedQuestions
                        : questions
                      : mergedQuestionBank;
                  if (nextPool.length > 0) applyQuizQuestionToBoss(nextPool[0], 0);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${
                  examFilter === 'teacher_created'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {examFilter === 'teacher_created' ? 'ใช้ข้อสอบครูอยู่' : 'สลับใช้ข้อสอบครู'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nextConfig = {
                  ...bossConfig,
                  bossCurrentHp: Math.min(bossConfig.bossMaxHp, bossConfig.bossCurrentHp + 500),
                };
                setBossConfig(nextConfig);
                broadcastHostBossUpdate(nextConfig, questionCursor);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-mono font-bold cursor-pointer"
            >
              +500 HP
            </button>
            <button
              type="button"
              onClick={() => {
                const nextHp = Math.max(0, bossConfig.bossCurrentHp - 500);
                const nextConfig: BossRaidConfig = {
                  ...bossConfig,
                  bossCurrentHp: nextHp,
                  status: nextHp === 0 ? 'defeated' : 'in_battle',
                };
                setBossConfig(nextConfig);
                broadcastHostBossUpdate(nextConfig, questionCursor);
                triggerVictoryRewardsIfNeeded(nextHp);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-mono font-bold cursor-pointer"
            >
              -500 HP
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Mobile Compact Live Boss HP Bar */}
          <div className="lg:hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-purple-800 border border-rose-500/60 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    attackAnimation ? 'scale-90' : ''
                  }`}
                >
                  <Swords className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{bossConfig.bossNameTh}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{bossConfig.subject}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {lastDamage !== null && lastDamage > 0 ? (
                  <span className="text-sm font-black text-rose-400 font-mono tabular-nums">
                    -{lastDamage} HP
                  </span>
                ) : (
                  <span className="text-xs font-black font-mono text-rose-400 tabular-nums">
                    {hpPercent}%
                  </span>
                )}
                <p className="text-[10px] font-mono text-zinc-400 tabular-nums">
                  {bossConfig.bossCurrentHp}/{bossConfig.bossMaxHp}
                </p>
              </div>
            </div>

            <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Desktop Boss Visual Stage */}
          <div className="hidden lg:flex lg:col-span-5 rounded-3xl bg-zinc-900 border border-zinc-800 p-4 flex-col justify-between relative overflow-hidden min-h-[320px]">
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2 tabular-nums">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <Heart className="w-4 h-4 fill-current" />
                  <span>BOSS HP</span>
                </span>
                <span className="font-mono text-zinc-300">
                  {bossConfig.bossCurrentHp} / {bossConfig.bossMaxHp} ({hpPercent}%)
                </span>
              </div>

              <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            <div
              className={`my-4 flex flex-col items-center justify-center transition-transform duration-200 ${
                attackAnimation ? 'scale-90' : ''
              }`}
            >
              <div className="relative">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-rose-600 via-purple-800 to-zinc-950 border-2 border-rose-500/70 shadow-xl shadow-rose-600/20 flex items-center justify-center">
                  <Swords className="w-10 h-10 text-amber-300" />
                </div>

                {lastDamage !== null && lastDamage > 0 && (
                  <div className="absolute -top-3 -right-4 px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-sm font-mono shadow-lg tabular-nums">
                    -{lastDamage}
                  </div>
                )}
              </div>

              <h2 className="text-lg font-black text-white mt-4 text-center">
                {bossConfig.bossNameTh}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 text-center">{bossConfig.bossTitleTh}</p>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span className="truncate">{bossConfig.subject}</span>
              <span className="text-amber-400 font-bold font-mono shrink-0">
                คลัง {raidPool.length} ข้อ
              </span>
            </div>
          </div>

          {/* Question & Attack Arena */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-rose-400 truncate">
                  {bossConfig.subject}
                </span>
                <span className="text-xs font-black font-mono text-amber-400 shrink-0 tabular-nums">
                  {bossConfig.activeQuestion.baseDamage} DMG
                </span>
              </div>

              <p className="font-bold text-base sm:text-lg text-white leading-relaxed">
                {bossConfig.activeQuestion.questionTh}
              </p>

              {/* Tactile Answer Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bossConfig.activeQuestion.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswer === optIdx;
                  const isCorrectOpt = optIdx === bossConfig.activeQuestion.correctIndex;
                  const choiceLabel = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);

                  let btnClass =
                    'bg-zinc-950 border-zinc-800 hover:border-rose-500/70 hover:bg-zinc-800/80 text-zinc-100';
                  if (selectedAnswer !== null) {
                    if (isCorrectOpt) {
                      btnClass = 'bg-emerald-600/20 border-emerald-400 text-emerald-200';
                    } else if (isSelected) {
                      btnClass = 'bg-rose-600/25 border-rose-500 text-rose-200';
                    } else {
                      btnClass = 'bg-zinc-950/60 border-zinc-800/60 text-zinc-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={selectedAnswer !== null || bossConfig.status !== 'in_battle'}
                      onClick={() => handleAttackBoss(optIdx)}
                      className={`min-h-[54px] px-3.5 py-3 rounded-2xl border text-left text-sm font-bold transition active:scale-[0.98] cursor-pointer flex items-center gap-3 ${btnClass}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs font-mono font-black flex items-center justify-center shrink-0">
                        {choiceLabel}
                      </span>
                      <span className="flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Instant Next Attack CTA */}
              {selectedAnswer !== null && bossConfig.status === 'in_battle' && (
                <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p
                      className={`text-xs font-black ${
                        selectedAnswer === bossConfig.activeQuestion.correctIndex
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {selectedAnswer === bossConfig.activeQuestion.correctIndex
                        ? `โจมตีสำเร็จ! -${lastDamage || 0} HP`
                        : 'พลาดเป้า! ลองข้อถัดไปเพื่อเก็บคอมโบใหม่'}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {bossConfig.activeQuestion.explanationTh}
                    </p>
                  </div>

                  {liveMode !== 'guest' && (
                    <button
                      type="button"
                      onClick={handleNextRaidQuestion}
                      className="min-h-[44px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black transition active:scale-95 cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
                    >
                      <span>{lang === 'th' ? 'โจมตีข้อถัดไป' : 'Next Attack'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Real-Time Co-op Party Drawer */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSquadDrawer((v) => !v)}
                className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-100">
                    {liveRoom
                      ? `ปาร์ตี้ออนไลน์ PIN ${formatRoomPin(liveRoom.pin)} (${squadMembers.length} คน · ${totalSquadDamage} DMG)`
                      : `ปาร์ตี้ & โหมดเล่นร่วมกับเพื่อน (${totalSquadDamage} DMG)`}
                  </span>
                </div>
                {showSquadDrawer ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showSquadDrawer && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-800 space-y-3">
                  {/* Live Party Controls */}
                  {liveMode === 'solo' ? (
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <button
                        type="button"
                        onClick={createLivePartyRoom}
                        className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black cursor-pointer transition inline-flex items-center gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>สร้างห้องปาร์ตี้ (6-PIN)</span>
                      </button>

                      <div className="flex items-center gap-1.5 flex-1 min-w-[190px]">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={7}
                          value={livePinInput}
                          onChange={(e) => setLivePinInput(e.target.value)}
                          placeholder="กรอก PIN 6 หลัก"
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-white placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={joinLivePartyRoom}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition shrink-0"
                        >
                          เข้าร่วม
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="font-bold text-emerald-200">
                          {liveMode === 'host' ? 'คุณเป็นหัวหน้าห้อง' : 'เข้าร่วมปาร์ตี้แล้ว'} · PIN {liveRoom ? formatRoomPin(liveRoom.pin) : ''}
                        </span>
                        <span className="text-[11px] text-emerald-300/80">
                          ({liveStatus === 'connected' ? `ออนไลน์ ${livePresenceCount} คน` : 'กำลังเชื่อมต่อ...'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {liveRoom && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(liveRoom.pin).catch(() => {});
                              setCopiedPin(true);
                              window.setTimeout(() => setCopiedPin(false), 1800);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedPin ? 'คัดลอกแล้ว' : 'คัดลอก PIN'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={leaveLiveParty}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>ออกห้อง</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Squad Roster */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {squadMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-amber-300 overflow-hidden shrink-0">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.slice(0, 1)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-zinc-200 truncate">{member.name}</p>
                            <p className="text-[10px] text-zinc-500">Combo x{member.streak}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{member.damageDealt} DMG</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Live Damage Feed */}
                  {liveRoom && liveRoom.lastDamageFeed.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">บันทึกการโจมตีล่าสุด</p>
                      <div className="flex flex-wrap gap-1.5">
                        {liveRoom.lastDamageFeed.map((evt) => (
                          <span
                            key={evt.id}
                            className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 font-mono"
                          >
                            {evt.playerName}: <strong className="text-rose-400">-{evt.damage} HP</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Victory Modal */}
      {victoryCelebration && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-400/50 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {lang === 'th' ? 'พิชิตบอสสำเร็จ!' : 'BOSS DEFEATED'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'th'
                  ? `โค่น ${bossConfig.bossNameTh} เรียบร้อย รับโบนัส +200 XP & +30 Gems`
                  : `Defeated ${bossConfig.bossNameTh}. +200 XP & +30 Gems earned.`}
              </p>
            </div>

            {onAwardPortfolioItem && (
              <button
                type="button"
                disabled={savedToPortfolio}
                onClick={() => {
                  onAwardPortfolioItem({
                    id: `port-boss-${Date.now()}`,
                    schoolId,
                    ownerId: currentUser?.studentRecordId || currentUser?.id || 'stu-boss-winner',
                    ownerRole: currentRole === 'teacher' || currentRole === 'admin' ? 'teacher' : 'student',
                    ownerName: actorDisplayName,
                    title: `ผู้พิชิต Co-op Boss Raid: ${bossConfig.bossNameTh}`,
                    category: 'competition',
                    year: String(new Date().getFullYear() + 543),
                    description: `พิชิตโจทย์วิชา ${bossConfig.subject} (${bossConfig.topicTh}) สำเร็จ`,
                    skills: [bossConfig.subject, 'Teamwork', 'Problem Solving'],
                    certifiedBySchool: true,
                    scoreBonus: 15,
                  });
                  setSavedToPortfolio(true);
                }}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs transition cursor-pointer"
              >
                {savedToPortfolio ? 'บันทึกเกียรติบัตรแล้ว' : 'บันทึกเกียรติบัตรลง Portfolio'}
              </button>
            )}

            <div className="flex gap-2">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex-1 min-h-[46px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs cursor-pointer transition"
                >
                  ออก
                </button>
              )}
              <button
                type="button"
                onClick={handleRestartBoss}
                className="flex-1 min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-sm transition cursor-pointer"
              >
                {lang === 'th' ? 'เล่นรอบใหม่' : 'Play Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
