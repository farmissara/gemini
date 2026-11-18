import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Flame,
  Hash,
  Play,
  Radio,
  ShieldAlert,
  SkipForward,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react';
import { AppLanguage, AuthUser, PlayerScore, QuizQuestion } from '../types';
import { COMPREHENSIVE_QUESTION_BANK } from '../data/examQuestionBanks';
import {
  connectLiveClassroomChannel,
  formatRoomPin,
  generateRoomPin,
  type LiveClassroomEvent,
  type LiveRoomMode,
  type LiveRoomPlayer,
  type LiveRoomState,
  type LiveTransportHandle,
} from '../lib/liveClassroomRealtime';
import { getProfileFrame, triggerHaptic } from '../lib/arcadeStore';
import {
  playComboStreakSound,
  playGrandVictoryFanfare,
  playHeavyImpactSound,
  playPowerupChimeSound,
} from '../lib/labSoundEffects';

interface LiveClassroomArenaViewProps {
  questions: QuizQuestion[];
  currentUser: AuthUser | null;
  currentPlayerProfile?: PlayerScore;
  lang: AppLanguage;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onBack: () => void;
}

const CHOICE_STYLES = [
  {
    letter: 'A',
    idle: 'bg-zinc-900 border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/30',
    badge: 'bg-cyan-500/20 text-cyan-300',
  },
  {
    letter: 'B',
    idle: 'bg-zinc-900 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/30',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  {
    letter: 'C',
    idle: 'bg-zinc-900 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/30',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    letter: 'D',
    idle: 'bg-zinc-900 border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30',
    badge: 'bg-rose-500/20 text-rose-300',
  },
];

const SUBJECT_OPTIONS = [
  { id: 'all', label: 'ทุกกลุ่มสาระฯ (สุ่มรวม)' },
  { id: 'คณิตศาสตร์', label: 'คณิตศาสตร์' },
  { id: 'วิทยาศาสตร์', label: 'วิทยาศาสตร์และเทคโนโลยี' },
  { id: 'ภาษาอังกฤษ', label: 'ภาษาอังกฤษ' },
  { id: 'ภาษาไทย', label: 'ภาษาไทย' },
  { id: 'สังคมศึกษา', label: 'สังคมศึกษา' },
];

export const LiveClassroomArenaView: React.FC<LiveClassroomArenaViewProps> = ({
  questions,
  currentUser,
  currentPlayerProfile,
  onEarnRewards,
  onBack,
}) => {
  const canHost =
    currentUser?.role === 'teacher' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  const myUserId = currentUser?.id || `guest-${Math.random().toString(36).slice(2, 7)}`;
  const myName = currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้เล่น';
  const myAvatar = currentUser?.avatarUrl || '';
  const myFrameId = currentPlayerProfile?.equippedFrameId || 'frame-default';
  const myTitle = currentPlayerProfile?.equippedTitle;

  const [roleMode, setRoleMode] = useState<'entry' | 'host' | 'player'>('entry');
  const [entryPanel, setEntryPanel] = useState<'join' | 'host'>(canHost ? 'host' : 'join');

  // Host setup state
  const [setupMode, setSetupMode] = useState<LiveRoomMode>('quiz_race');
  const [setupSubject, setSetupSubject] = useState<string>('all');
  const [setupQuestionCount, setSetupQuestionCount] = useState<number>(8);
  const [setupSeconds, setSetupSeconds] = useState<number>(20);
  const [hostSource, setHostSource] = useState<'all' | 'teacher_only'>('all');

  // Player join state
  const [joinPinInput, setJoinPinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isWaitingForHostSync, setIsWaitingForHostSync] = useState(false);

  // Active room state (authoritative on host, mirrored on player)
  const [roomState, setRoomState] = useState<LiveRoomState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedPin, setCopiedPin] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [mySelectedChoice, setMySelectedChoice] = useState<number | null>(null);
  const [rewardClaimedForPin, setRewardClaimedForPin] = useState<string | null>(null);

  const transportRef = useRef<LiveTransportHandle | null>(null);
  const hostQuestionsRef = useRef<QuizQuestion[]>([]);
  const roomStateRef = useRef<LiveRoomState | null>(null);
  const answeredKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  // Combined real school bank + comprehensive curriculum bank
  const combinedQuestionPool = useMemo(() => {
    const seen = new Set<string>();
    const list: QuizQuestion[] = [];
    for (const q of [...questions, ...COMPREHENSIVE_QUESTION_BANK]) {
      if (q && q.id && !seen.has(q.id) && Array.isArray(q.options) && q.options.length >= 2) {
        seen.add(q.id);
        list.push(q);
      }
    }
    return list;
  }, [questions]);

  const pickHostQuestions = (): QuizQuestion[] => {
    const basePool =
      hostSource === 'teacher_only' && questions.length > 0 ? questions : combinedQuestionPool;

    const filtered =
      setupSubject === 'all'
        ? basePool
        : basePool.filter((q) => {
            if (setupSubject === 'คณิตศาสตร์') return q.strand === 'math' || q.subject.includes('คณิต');
            if (setupSubject === 'วิทยาศาสตร์')
              return (
                q.strand === 'science_tech' ||
                q.subject.includes('วิทย์') ||
                q.subject.includes('ฟิสิกส์') ||
                q.subject.includes('เคมี') ||
                q.subject.includes('ชีว') ||
                q.subject.includes('คำนวณ')
              );
            if (setupSubject === 'ภาษาอังกฤษ') return q.strand === 'foreign_lang' || q.subject.includes('อังกฤษ');
            if (setupSubject === 'ภาษาไทย') return q.strand === 'thai' || q.subject.includes('ไทย');
            if (setupSubject === 'สังคมศึกษา') return q.strand === 'social' || q.subject.includes('สังคม');
            return q.subject.includes(setupSubject);
          });

    const source = filtered.length > 0 ? filtered : basePool;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(setupQuestionCount, shuffled.length));
  };

  const cleanupChannel = () => {
    transportRef.current?.disconnect();
    transportRef.current = null;
    answeredKeysRef.current.clear();
  };

  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, []);

  // Broadcast authoritative state from host
  const broadcastHostState = (nextState: LiveRoomState) => {
    roomStateRef.current = nextState;
    setRoomState(nextState);
    transportRef.current?.send({ type: 'room:state', state: nextState });
  };

  // Host: create a real 6-digit PIN room
  const handleCreateRoom = () => {
    const picked = pickHostQuestions();
    if (picked.length === 0) return;

    cleanupChannel();
    hostQuestionsRef.current = picked;
    const pin = generateRoomPin();
    const subjectLabel =
      SUBJECT_OPTIONS.find((s) => s.id === setupSubject)?.label || 'ทุกกลุ่มสาระฯ';
    const bossMaxHp = setupMode === 'boss_raid' ? Math.max(1200, picked.length * 260) : 0;

    const initialState: LiveRoomState = {
      pin,
      mode: setupMode,
      hostId: myUserId,
      hostName: myName,
      subjectLabel,
      phase: 'lobby',
      questionIndex: 0,
      totalQuestions: picked.length,
      secondsPerQuestion: setupSeconds,
      questionStartedAt: Date.now(),
      currentQuestion: null,
      revealCorrectIndex: null,
      revealExplanationTh: '',
      bossName:
        setupMode === 'boss_raid'
          ? `บอสความรู้ · ${subjectLabel.replace(' (สุ่มรวม)', '')}`
          : '',
      bossMaxHp,
      bossCurrentHp: bossMaxHp,
      lastDamageFeed: [],
      players: [],
      updatedAt: Date.now(),
    };

    setRoleMode('host');
    setRoomState(initialState);
    roomStateRef.current = initialState;
    triggerHaptic('success');

    const handle = connectLiveClassroomChannel({
      pin,
      userId: myUserId,
      userName: myName,
      onStatusChange: setConnectionStatus,
      onEvent: (evt: LiveClassroomEvent) => {
        const current = roomStateRef.current;
        if (!current) return;

        if (evt.type === 'room:sync_request') {
          transportRef.current?.send({ type: 'room:state', state: current });
          return;
        }

        if (evt.type === 'player:join') {
          const exists = current.players.some((p) => p.userId === evt.player.userId);
          const nextPlayers: LiveRoomPlayer[] = exists
            ? current.players.map((p) =>
                p.userId === evt.player.userId
                  ? {
                      ...p,
                      name: evt.player.name,
                      avatarUrl: evt.player.avatarUrl,
                      equippedFrameId: evt.player.equippedFrameId,
                      equippedTitle: evt.player.equippedTitle,
                    }
                  : p
              )
            : [
                ...current.players,
                {
                  userId: evt.player.userId,
                  name: evt.player.name,
                  avatarUrl: evt.player.avatarUrl,
                  equippedFrameId: evt.player.equippedFrameId,
                  equippedTitle: evt.player.equippedTitle,
                  score: 0,
                  correctCount: 0,
                  streak: 0,
                  damageDealt: 0,
                  answeredQuestionIndex: null,
                  joinedAt: Date.now(),
                },
              ];

          if (soundEnabled && !exists) playPowerupChimeSound();
          broadcastHostState({
            ...current,
            players: nextPlayers,
            updatedAt: Date.now(),
          });
          return;
        }

        if (evt.type === 'player:answer') {
          if (current.phase !== 'question' || evt.questionIndex !== current.questionIndex) return;
          const answerKey = `${evt.userId}:${evt.questionIndex}`;
          if (answeredKeysRef.current.has(answerKey)) return;
          answeredKeysRef.current.add(answerKey);

          const realQ = hostQuestionsRef.current[current.questionIndex];
          if (!realQ) return;
          const isCorrect = evt.choiceIndex === realQ.correctIndex;
          const speedRatio = Math.max(
            0,
            Math.min(1, 1 - evt.elapsedMs / (current.secondsPerQuestion * 1000))
          );

          let bossHp = current.bossCurrentHp;
          let nextDamageFeed = [...current.lastDamageFeed];

          const nextPlayers = current.players.map((p) => {
            if (p.userId !== evt.userId) return p;
            const nextStreak = isCorrect ? p.streak + 1 : 0;
            const speedBonus = Math.round(speedRatio * 120);
            const streakBonus = isCorrect ? Math.min(80, nextStreak * 20) : 0;
            const gainedPoints = isCorrect ? 100 + speedBonus + streakBonus : 0;
            const isCritical = isCorrect && speedRatio > 0.6;
            const damage =
              isCorrect && current.mode === 'boss_raid'
                ? Math.round((130 + speedBonus * 0.7) * (isCritical ? 1.35 : 1))
                : 0;

            if (damage > 0) {
              bossHp = Math.max(0, bossHp - damage);
              nextDamageFeed = [
                {
                  id: `${evt.userId}-${Date.now()}`,
                  playerName: p.name,
                  damage,
                  critical: isCritical,
                },
                ...nextDamageFeed,
              ].slice(0, 4);
              if (soundEnabled) playHeavyImpactSound();
            }

            return {
              ...p,
              score: p.score + gainedPoints,
              correctCount: isCorrect ? p.correctCount + 1 : p.correctCount,
              streak: nextStreak,
              damageDealt: p.damageDealt + damage,
              answeredQuestionIndex: evt.questionIndex,
              lastAnswerCorrect: isCorrect,
              lastPointsDelta: gainedPoints,
            };
          });

          const bossDefeated = current.mode === 'boss_raid' && bossHp <= 0;
          broadcastHostState({
            ...current,
            bossCurrentHp: bossHp,
            lastDamageFeed: nextDamageFeed,
            players: nextPlayers,
            phase: bossDefeated ? 'finished' : current.phase,
            updatedAt: Date.now(),
          });
        }
      },
    });

    transportRef.current = handle;
  };

  // Host: start or advance question
  const handleHostOpenQuestion = (idx: number) => {
    const current = roomStateRef.current;
    const realQ = hostQuestionsRef.current[idx];
    if (!current || !realQ) return;

    triggerHaptic('light');
    if (soundEnabled) playComboStreakSound(1);
    broadcastHostState({
      ...current,
      phase: 'question',
      questionIndex: idx,
      questionStartedAt: Date.now(),
      currentQuestion: {
        id: realQ.id,
        subject: realQ.subject,
        questionTh: realQ.questionTh,
        options: realQ.options,
      },
      revealCorrectIndex: null,
      revealExplanationTh: '',
      updatedAt: Date.now(),
    });
  };

  const handleHostReveal = () => {
    const current = roomStateRef.current;
    if (!current || current.phase !== 'question') return;
    const realQ = hostQuestionsRef.current[current.questionIndex];
    if (!realQ) return;

    triggerHaptic('light');
    broadcastHostState({
      ...current,
      phase: 'reveal',
      revealCorrectIndex: realQ.correctIndex,
      revealExplanationTh: realQ.explanationTh || '',
      updatedAt: Date.now(),
    });
  };

  const handleHostNextOrFinish = () => {
    const current = roomStateRef.current;
    if (!current) return;
    const nextIdx = current.questionIndex + 1;
    if (nextIdx >= hostQuestionsRef.current.length || (current.mode === 'boss_raid' && current.bossCurrentHp <= 0)) {
      if (soundEnabled) playGrandVictoryFanfare();
      triggerHaptic('success');
      broadcastHostState({
        ...current,
        phase: 'finished',
        updatedAt: Date.now(),
      });
    } else {
      handleHostOpenQuestion(nextIdx);
    }
  };

  // Player: join by 6-digit PIN
  const handleJoinRoom = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanPin = joinPinInput.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setJoinError('กรุณากรอกรหัส PIN 6 หลักให้ครบถ้วน');
      triggerHaptic('error');
      return;
    }

    setJoinError(null);
    cleanupChannel();
    setRoleMode('player');
    setIsWaitingForHostSync(true);
    setMySelectedChoice(null);

    const handle = connectLiveClassroomChannel({
      pin: cleanPin,
      userId: myUserId,
      userName: myName,
      onStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          // Immediately announce presence & request authoritative state snapshot
          handle.send({
            type: 'player:join',
            player: {
              userId: myUserId,
              name: myName,
              avatarUrl: myAvatar,
              equippedFrameId: myFrameId,
              equippedTitle: myTitle,
            },
          });
          handle.send({ type: 'room:sync_request', userId: myUserId });
        }
      },
      onEvent: (evt: LiveClassroomEvent) => {
        if (evt.type === 'room:state') {
          setIsWaitingForHostSync(false);
          setRoomState((prev) => {
            if (!prev || prev.questionIndex !== evt.state.questionIndex || prev.phase !== evt.state.phase) {
              if (evt.state.phase === 'question' && prev?.questionIndex !== evt.state.questionIndex) {
                setMySelectedChoice(null);
              }
            }
            return evt.state;
          });
        } else if (evt.type === 'room:closed') {
          setJoinError('คุณครูได้ปิดห้องแข่งสดนี้แล้ว');
          cleanupChannel();
          setRoomState(null);
          setRoleMode('entry');
        }
      },
    });

    transportRef.current = handle;

    // Retry sync ping once at 1.2s in case WebSocket handshake settled slightly after join
    setTimeout(() => {
      if (!roomStateRef.current && transportRef.current === handle) {
        handle.send({
          type: 'player:join',
          player: {
            userId: myUserId,
            name: myName,
            avatarUrl: myAvatar,
            equippedFrameId: myFrameId,
            equippedTitle: myTitle,
          },
        });
        handle.send({ type: 'room:sync_request', userId: myUserId });
      }
    }, 1200);
  };

  // Player: submit answer
  const handlePlayerSubmitChoice = (choiceIdx: number) => {
    if (!roomState || roomState.phase !== 'question' || mySelectedChoice !== null) return;
    setMySelectedChoice(choiceIdx);
    triggerHaptic('light');
    if (soundEnabled) playPowerupChimeSound();

    const elapsedMs = Math.max(0, Date.now() - roomState.questionStartedAt);
    transportRef.current?.send({
      type: 'player:answer',
      userId: myUserId,
      questionIndex: roomState.questionIndex,
      choiceIndex: choiceIdx,
      elapsedMs,
    });
  };

  // Live countdown timer synced to questionStartedAt (auto-reveals on Host when time hits 0)
  useEffect(() => {
    if (!roomState || roomState.phase !== 'question') return;
    const tick = () => {
      const elapsedSec = Math.floor((Date.now() - roomState.questionStartedAt) / 1000);
      const remaining = Math.max(0, roomState.secondsPerQuestion - elapsedSec);
      setSecondsLeft(remaining);
      if (remaining === 0 && roleMode === 'host') {
        handleHostReveal();
      }
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [roomState?.phase, roomState?.questionIndex, roomState?.questionStartedAt, roleMode]);

  // Auto-grant real EXP & Gems to participating player once match finishes
  useEffect(() => {
    if (
      roleMode !== 'player' ||
      !roomState ||
      roomState.phase !== 'finished' ||
      rewardClaimedForPin === roomState.pin
    ) {
      return;
    }

    const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
    const myRankIdx = sorted.findIndex((p) => p.userId === myUserId);
    const me = sorted[myRankIdx];
    if (!me) return;

    setRewardClaimedForPin(roomState.pin);
    const podiumBonusExp = myRankIdx === 0 ? 150 : myRankIdx === 1 ? 100 : myRankIdx === 2 ? 70 : 40;
    const earnedExp = Math.max(40, Math.round(me.score * 0.25) + podiumBonusExp);
    const earnedGems = Math.max(8, Math.round(me.correctCount * 4) + (myRankIdx < 3 ? 12 : 4));
    const isWin =
      myRankIdx === 0 || (roomState.mode === 'boss_raid' && roomState.bossCurrentHp <= 0);

    if (soundEnabled) playGrandVictoryFanfare();
    triggerHaptic('success');
    onEarnRewards(myUserId, earnedExp, earnedGems, isWin);
  }, [roleMode, roomState?.phase, roomState?.pin]);

  const handleLeaveRoom = () => {
    if (roleMode === 'host') {
      transportRef.current?.send({ type: 'room:closed', reason: 'host_left' });
    }
    cleanupChannel();
    setRoomState(null);
    setRoleMode('entry');
    setIsWaitingForHostSync(false);
    setMySelectedChoice(null);
  };

  const handleCopyPin = () => {
    if (!roomState) return;
    navigator.clipboard?.writeText(roomState.pin).catch(() => {});
    setCopiedPin(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return [...roomState.players].sort((a, b) => b.score - a.score);
  }, [roomState]);

  const answeredCount = useMemo(() => {
    if (!roomState) return 0;
    return roomState.players.filter((p) => p.answeredQuestionIndex === roomState.questionIndex).length;
  }, [roomState]);

  const bossHpPct =
    roomState && roomState.bossMaxHp > 0
      ? Math.max(0, Math.round((roomState.bossCurrentHp / roomState.bossMaxHp) * 100))
      : 0;

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#09090B] text-white select-none overflow-hidden font-sans">
      {/* SINGLE CRISP GEN Z TOP BAR */}
      <header className="shrink-0 h-14 px-3 sm:px-5 bg-[#09090B] border-b border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={roleMode === 'entry' ? onBack : handleLeaveRoom}
            className="min-h-[40px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{roleMode === 'entry' ? 'ออก' : 'ออกจากห้อง'}</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-sm font-black tracking-tight truncate">
              {roomState ? `PIN ${formatRoomPin(roomState.pin)}` : 'Live Classroom Arena'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {roomState && (
            <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5 tabular-nums">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{roomState.players.length}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 cursor-pointer"
            aria-label={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          {/* 1. ENTRY SCREEN: JOIN PIN OR HOST ROOM */}
          {roleMode === 'entry' && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5 max-w-xl mx-auto">
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400">
                  Real-Time Classroom Multiplayer
                </p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  ห้องแข่งสด 6 หลัก (PIN)
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  ครูเปิดห้องขึ้นจอโปรเจกเตอร์ นักเรียนกรอก PIN 6 หลักจากมือถือ แข่งตอบคำถามหรือร่วมพลังตีบอสทั้งห้องแบบเรียลไทม์
                </p>
              </div>

              {canHost && (
                <div className="flex items-center justify-center">
                  <div className="inline-flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800 gap-1">
                    <button
                      type="button"
                      onClick={() => setEntryPanel('host')}
                      className={`min-h-[42px] px-4 rounded-xl text-xs font-black transition cursor-pointer ${
                        entryPanel === 'host'
                          ? 'bg-zinc-100 text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      เปิดห้องแข่งสด (ครู/ผู้ดูแล)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryPanel('join')}
                      className={`min-h-[42px] px-4 rounded-xl text-xs font-black transition cursor-pointer ${
                        entryPanel === 'join'
                          ? 'bg-zinc-100 text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      เข้าร่วมด้วยรหัส PIN
                    </button>
                  </div>
                </div>
              )}

              {/* PLAYER JOIN CARD */}
              {entryPanel === 'join' && (
                <form
                  onSubmit={handleJoinRoom}
                  className="max-w-md mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 space-y-4"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="live-pin-input"
                      className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"
                    >
                      <Hash className="w-4 h-4 text-cyan-400" />
                      <span>กรอกรหัส PIN 6 หลักจากหน้าจอคุณครู</span>
                    </label>
                    <input
                      id="live-pin-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={7}
                      autoFocus
                      placeholder="เช่น 482915"
                      value={joinPinInput}
                      onChange={(e) => {
                        setJoinError(null);
                        setJoinPinInput(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7));
                      }}
                      className="w-full min-h-[60px] px-4 rounded-2xl bg-[#09090B] border border-zinc-700 focus:border-cyan-400 text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.28em] text-white placeholder-zinc-600 focus:outline-none"
                    />
                  </div>

                  {joinError && (
                    <p className="text-xs font-bold text-rose-400 text-center">{joinError}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full min-h-[52px] rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-zinc-950 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>เข้าร่วมห้องแข่งสด</span>
                  </button>
                </form>
              )}

              {/* TEACHER HOST SETUP CARD */}
              {entryPanel === 'host' && canHost && (
                <div className="max-w-xl mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSetupMode('quiz_race')}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer space-y-1.5 ${
                        setupMode === 'quiz_race'
                          ? 'bg-cyan-500/15 border-cyan-400 text-white'
                          : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-sm text-white">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span>Quiz Race แข่งความเร็ว</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        ตอบถูกและเร็วที่สุดรับโบนัสสตรีค ขึ้นโพเดียมอันดับ 1–3 แบบ Kahoot
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSetupMode('boss_raid')}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer space-y-1.5 ${
                        setupMode === 'boss_raid'
                          ? 'bg-orange-500/15 border-orange-400 text-white'
                          : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-sm text-white">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span>Live Boss Raid ตีบอสทั้งห้อง</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        ทุกคำตอบที่ถูกต้องของนักเรียนทั้งห้องจะรวมพลังลดเลือดบอสสดๆ บนจอ!
                      </p>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">
                        กลุ่มสาระวิชา
                      </label>
                      <select
                        value={setupSubject}
                        onChange={(e) => setSetupSubject(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                      >
                        {SUBJECT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">
                        แหล่งชุดข้อสอบ
                      </label>
                      <select
                        value={hostSource}
                        onChange={(e) => setHostSource(e.target.value as 'all' | 'teacher_only')}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="all">
                          ข้อสอบทั้งหมด ({combinedQuestionPool.length} ข้อ)
                        </option>
                        <option value="teacher_only">
                          เฉพาะข้อสอบของโรงเรียน ({questions.length} ข้อ)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">จำนวนข้อ</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[5, 8, 10, 15].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setSetupQuestionCount(cnt)}
                            className={`min-h-[40px] rounded-xl font-mono text-xs font-black transition cursor-pointer ${
                              setupQuestionCount === cnt
                                ? 'bg-amber-400 text-zinc-950'
                                : 'bg-[#09090B] border border-zinc-800 text-zinc-300'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 block">เวลาต่อข้อ (วินาที)</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[15, 20, 30].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setSetupSeconds(sec)}
                            className={`min-h-[40px] rounded-xl font-mono text-xs font-black transition cursor-pointer ${
                              setupSeconds === sec
                                ? 'bg-cyan-400 text-zinc-950'
                                : 'bg-[#09090B] border border-zinc-800 text-zinc-300'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateRoom}
                    className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-zinc-950 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Radio className="w-4 h-4" />
                    <span>สร้างรหัส PIN 6 หลัก และเปิดห้องแข่งสด</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. WAITING FOR HOST SYNC (PLAYER JUST JOINED) */}
          {roleMode === 'player' && !roomState && (
            <div className="max-w-md mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto">
                <Radio className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white">
                  กำลังเชื่อมต่อห้อง PIN {formatRoomPin(joinPinInput)}
                </h2>
                <p className="text-xs text-zinc-400">
                  {connectionStatus === 'error'
                    ? 'ไม่สามารถเชื่อมต่อห้องได้ กรุณาตรวจสอบรหัส PIN กับคุณครู'
                    : isWaitingForHostSync
                      ? 'รอรับสัญญาณจากหน้าจอคุณครู หากยังไม่มีการตอบรับ ให้ตรวจสอบว่าคุณครูเปิดห้อง PIN นี้อยู่'
                      : 'เชื่อมต่อแล้ว กำลังโหลดข้อมูลห้อง...'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="min-h-[44px] px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white cursor-pointer"
              >
                กรอกรหัส PIN ใหม่
              </button>
            </div>
          )}

          {/* 3. LOBBY PHASE (BOTH HOST & PLAYER) */}
          {roomState && roomState.phase === 'lobby' && (
            <div className="space-y-5">
              {/* Big Projector PIN Hero */}
              <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 text-center space-y-4">
                <p className="text-xs font-bold text-zinc-400">
                  {roomState.mode === 'boss_raid' ? 'Live Co-op Boss Raid' : 'Live Quiz Race'} ·{' '}
                  {roomState.subjectLabel} · {roomState.totalQuestions} ข้อ ({roomState.secondsPerQuestion} วิ/ข้อ)
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="px-6 py-3 rounded-2xl bg-[#09090B] border border-amber-400/50 font-mono text-4xl sm:text-5xl font-black tracking-[0.2em] text-amber-400 tabular-nums">
                    {formatRoomPin(roomState.pin)}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="min-h-[48px] px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
                  >
                    {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPin ? 'คัดลอกแล้ว' : 'คัดลอก PIN'}</span>
                  </button>
                </div>

                {roleMode === 'host' ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleHostOpenQuestion(0)}
                      className="min-h-[52px] px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black text-sm flex items-center gap-2 transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>
                        เริ่มการแข่งขันทันที ({roomState.players.length} คนในห้อง)
                      </span>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-emerald-400">
                    คุณเข้าร่วมห้องสำเร็จแล้ว! รอคุณครู ({roomState.hostName}) กดเริ่มเกม...
                  </p>
                )}
              </div>

              {/* Connected Roster */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>ผู้เล่นที่เชื่อมต่ออยู่ในห้อง</span>
                  <span className="font-mono text-cyan-400 tabular-nums">
                    {roomState.players.length} คน
                  </span>
                </div>

                {roomState.players.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    ยังไม่มีนักเรียนเชื่อมต่อ — ให้นักเรียนเปิดเมนูเกมแล้วกรอกรหัส PIN {formatRoomPin(roomState.pin)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {roomState.players.map((p) => {
                      const frame = getProfileFrame(p.equippedFrameId);
                      return (
                        <div
                          key={p.userId}
                          className="p-3 rounded-xl bg-[#09090B] border border-zinc-800 flex items-center gap-2.5"
                        >
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className={`w-9 h-9 rounded-xl object-cover shrink-0 ${frame.ringClass}`}
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-xl bg-zinc-800 text-xs font-black text-white flex items-center justify-center shrink-0 ${frame.ringClass}`}
                            >
                              {p.name.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{p.name}</p>
                            {p.equippedTitle && (
                              <p className={`text-[10px] font-semibold truncate ${frame.badgeTextClass}`}>
                                {p.equippedTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. ACTIVE QUESTION & REVEAL PHASE */}
          {roomState && (roomState.phase === 'question' || roomState.phase === 'reveal') && roomState.currentQuestion && (
            <div className="space-y-4">
              {/* Live Boss HP Bar (Boss Raid Mode) */}
              {roomState.mode === 'boss_raid' && (
                <div className="rounded-2xl bg-zinc-900 border border-orange-500/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0" />
                      <span className="text-sm font-black text-white truncate">
                        {roomState.bossName}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-black text-orange-300 tabular-nums shrink-0">
                      {roomState.bossCurrentHp.toLocaleString()} / {roomState.bossMaxHp.toLocaleString()} HP
                    </span>
                  </div>
                  <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${bossHpPct}%` }}
                    />
                  </div>
                  {roomState.lastDamageFeed.length > 0 && (
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-[11px] font-mono">
                      {roomState.lastDamageFeed.map((evt) => (
                        <span
                          key={evt.id}
                          className={`shrink-0 font-bold ${
                            evt.critical ? 'text-amber-300' : 'text-orange-300'
                          }`}
                        >
                          {evt.playerName} -{evt.damage}
                          {evt.critical ? ' CRIT!' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Question Progress & Timer Strip */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 text-xs font-mono font-bold tabular-nums">
                  <span className="text-zinc-400">
                    ข้อ {roomState.questionIndex + 1} / {roomState.totalQuestions} · {roomState.currentQuestion.subject}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400">
                      ตอบแล้ว {answeredCount}/{roomState.players.length}
                    </span>
                    <span
                      className={`text-base font-black ${
                        secondsLeft <= 5 ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {roomState.phase === 'reveal' ? 'เฉลย' : `${secondsLeft}s`}
                    </span>
                  </div>
                </div>

                {roomState.phase === 'question' && (
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        secondsLeft <= 5 ? 'bg-rose-500' : 'bg-cyan-400'
                      }`}
                      style={{
                        width: `${Math.round((secondsLeft / Math.max(1, roomState.secondsPerQuestion)) * 100)}%`,
                      }}
                    />
                  </div>
                )}

                <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
                  {roomState.currentQuestion.questionTh}
                </h2>

                {/* 4 Tactile Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {roomState.currentQuestion.options.map((opt, idx) => {
                    const style = CHOICE_STYLES[idx % CHOICE_STYLES.length];
                    const isSelected = mySelectedChoice === idx;
                    const isCorrectReveal =
                      roomState.phase === 'reveal' && roomState.revealCorrectIndex === idx;
                    const isWrongSelected =
                      roomState.phase === 'reveal' &&
                      isSelected &&
                      roomState.revealCorrectIndex !== idx;

                    let cardClass = style.idle;
                    if (isCorrectReveal) {
                      cardClass = 'bg-emerald-500/20 border-emerald-400 text-white';
                    } else if (isWrongSelected) {
                      cardClass = 'bg-rose-500/20 border-rose-400 text-rose-100';
                    } else if (isSelected) {
                      cardClass = 'bg-cyan-500/20 border-cyan-400 text-white';
                    } else if (roomState.phase === 'reveal') {
                      cardClass = 'bg-zinc-950/60 border-zinc-800 text-zinc-500';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={
                          roleMode === 'host' ||
                          roomState.phase !== 'question' ||
                          mySelectedChoice !== null
                        }
                        onClick={() => handlePlayerSubmitChoice(idx)}
                        className={`min-h-[60px] p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition active:scale-[0.98] ${cardClass} ${
                          roleMode === 'player' && roomState.phase === 'question' && mySelectedChoice === null
                            ? 'cursor-pointer'
                            : 'cursor-default'
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 ${style.badge}`}
                        >
                          {style.letter}
                        </span>
                        <span className="text-sm sm:text-base font-bold leading-snug flex-1">
                          {opt}
                        </span>
                        {isCorrectReveal && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        {isWrongSelected && (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Player lock-in status */}
                {roleMode === 'player' && roomState.phase === 'question' && mySelectedChoice !== null && (
                  <p className="text-xs font-bold text-cyan-300 text-center pt-1">
                    ส่งคำตอบแล้ว! รอหมดเวลาหรือรอคุณครูกดเฉลย...
                  </p>
                )}

                {/* Explanation on Reveal */}
                {roomState.phase === 'reveal' && roomState.revealExplanationTh && (
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                    <span className="font-black text-emerald-400">เฉลย: </span>
                    {roomState.revealExplanationTh}
                  </div>
                )}

                {/* Host Controls */}
                {roleMode === 'host' && (
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                    {roomState.phase === 'question' ? (
                      <button
                        type="button"
                        onClick={handleHostReveal}
                        className="min-h-[44px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>เฉลยข้อนี้ทันที</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleHostNextOrFinish}
                        className="min-h-[44px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <SkipForward className="w-4 h-4" />
                        <span>
                          {roomState.questionIndex + 1 >= roomState.totalQuestions
                            ? 'สรุปผลและแจกรางวัล'
                            : 'ไปข้อถัดไป'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Compact Live Top 5 Leaderboard during Reveal */}
              {roomState.phase === 'reveal' && sortedPlayers.length > 0 && (
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                    <span>อันดับคะแนนสด</span>
                    <span className="font-mono">{sortedPlayers.length} คน</span>
                  </div>
                  <div className="space-y-1.5">
                    {sortedPlayers.slice(0, 5).map((p, idx) => (
                      <div
                        key={p.userId}
                        className="px-3 py-2 rounded-xl bg-[#09090B] border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 font-mono font-black tabular-nums ${
                              idx === 0 ? 'text-amber-400' : 'text-zinc-400'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white truncate">{p.name}</span>
                          {p.lastAnswerCorrect && (
                            <span className="font-mono text-[11px] font-bold text-emerald-400">
                              +{p.lastPointsDelta || 0}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-amber-400 tabular-nums shrink-0">
                          {p.score.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. FINAL PODIUM & REWARDS */}
          {roomState && roomState.phase === 'finished' && (
            <div className="space-y-5">
              <div className="rounded-3xl bg-zinc-900 border border-amber-400/40 p-6 sm:p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center mx-auto">
                  <Crown className="w-7 h-7" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {roomState.mode === 'boss_raid' && roomState.bossCurrentHp <= 0
                    ? 'พิชิตบอสทั้งห้องสำเร็จ!'
                    : 'สรุปผลการแข่งขันห้องเรียนสด'}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {roleMode === 'player'
                    ? 'ระบบบันทึก EXP และ Gems เข้าบัญชีของคุณเรียบร้อยแล้ว'
                    : `จบรอบการแข่ง PIN ${formatRoomPin(roomState.pin)} · ผู้เข้าร่วม ${sortedPlayers.length} คน`}
                </p>

                {sortedPlayers.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    {sortedPlayers.slice(0, 3).map((p, idx) => {
                      const frame = getProfileFrame(p.equippedFrameId);
                      return (
                        <div
                          key={p.userId}
                          className={`p-4 rounded-2xl border text-center space-y-2 ${
                            idx === 0
                              ? 'bg-[#09090B] border-amber-400'
                              : 'bg-[#09090B] border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-xs font-black">
                            <span className={idx === 0 ? 'text-amber-400' : 'text-zinc-400'}>
                              #{idx + 1}
                            </span>
                            <span className="text-amber-400 tabular-nums">
                              {p.score.toLocaleString()} แต้ม
                            </span>
                          </div>
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className={`w-14 h-14 rounded-2xl object-cover mx-auto ${frame.ringClass}`}
                            />
                          ) : (
                            <div
                              className={`w-14 h-14 rounded-2xl bg-zinc-800 text-base font-black text-white flex items-center justify-center mx-auto ${frame.ringClass}`}
                            >
                              {p.name.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-black text-white truncate">{p.name}</p>
                            <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                              ถูก {p.correctCount}/{roomState.totalQuestions} ข้อ
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="min-h-[46px] px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Swords className="w-4 h-4" />
                    <span>{roleMode === 'host' ? 'เปิดห้องรอบใหม่' : 'กลับหน้าเข้าร่วมห้อง'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleLeaveRoom();
                      onBack();
                    }}
                    className="min-h-[46px] px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>กลับศูนย์เกม</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
