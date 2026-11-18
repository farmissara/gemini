import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Coins,
  Flame,
  GitBranch,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  CHRONO_SEQUENCE_CHALLENGES,
  CONVEYOR_SORT_DECKS,
  ConveyorSortCard,
  ConveyorSortDeck,
  SequenceChallenge,
} from '../../data/arcadeGamesData';
import { getStrandMeta } from '../../lib/centralExamBank';
import {
  playCardFlipSound,
  playComboStreakSound,
  playErrorBuzzSound,
  playGrandVictoryFanfare,
} from '../../lib/labSoundEffects';

interface ChronoSortTowerGameProps {
  userId: string;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onMissionProgress: () => void;
  onBack: () => void;
}

function shuffleList<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const ChronoSortTowerGame: React.FC<ChronoSortTowerGameProps> = ({
  userId,
  onEarnRewards,
  onMissionProgress,
  onBack,
}) => {
  const [phase, setPhase] = useState<'TITLE_MENU' | 'PLAYING' | 'GAME_OVER'>('TITLE_MENU');
  const [mode, setMode] = useState<'conveyor' | 'sequence'>('conveyor');

  const [selectedConveyorDeckId, setSelectedConveyorDeckId] = useState<string>(CONVEYOR_SORT_DECKS[0].id);
  const [conveyorCards, setConveyorCards] = useState<ConveyorSortCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [conveyorFeedback, setConveyorFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [sequenceDeck, setSequenceDeck] = useState<SequenceChallenge[]>([]);
  const [seqIndex, setSeqIndex] = useState(0);
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [seqResult, setSeqResult] = useState<{ ok: boolean; explanationTh: string } | null>(null);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [rewarded, setRewarded] = useState<{ exp: number; gems: number } | null>(null);

  const activeConveyorDeck: ConveyorSortDeck =
    CONVEYOR_SORT_DECKS.find((d) => d.id === selectedConveyorDeckId) || CONVEYOR_SORT_DECKS[0];

  const activeSequenceChallenge: SequenceChallenge | null = sequenceDeck[seqIndex] || null;

  const finishSession = useCallback(
    (finalScore: number, finalCorrect: number, totalCount: number) => {
      setPhase('GAME_OVER');
      const exp = 60 + finalCorrect * 22 + Math.floor(finalScore / 25);
      const gems = 8 + finalCorrect * 3;
      setRewarded({ exp, gems });
      onEarnRewards(userId, exp, gems, finalCorrect >= Math.ceil(totalCount / 2));
      onMissionProgress();
      playGrandVictoryFanfare();
    },
    [onEarnRewards, onMissionProgress, userId]
  );

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setRewarded(null);
    setConveyorFeedback(null);
    setSeqResult(null);

    if (mode === 'conveyor') {
      const cards = shuffleList(activeConveyorDeck.cards);
      setConveyorCards(cards);
      setCardIndex(0);
    } else {
      const picked = shuffleList(CHRONO_SEQUENCE_CHALLENGES).slice(0, 4);
      setSequenceDeck(picked);
      setSeqIndex(0);
      if (picked[0]) {
        let shuffled = shuffleList(picked[0].items);
        if (shuffled.every((v, i) => v === picked[0].items[i])) {
          shuffled = [...shuffled.slice(1), shuffled[0]];
        }
        setOrderedItems(shuffled);
      }
    }

    setPhase('PLAYING');
  };

  const handleConveyorGate = useCallback(
    (chosenSide: 'left' | 'right') => {
      if (phase !== 'PLAYING' || mode !== 'conveyor') return;
      const card = conveyorCards[cardIndex];
      if (!card) return;

      const isOk = card.side === chosenSide;
      const nextStreak = isOk ? streak + 1 : 0;
      const gained = isOk ? 100 + (nextStreak - 1) * 25 : 0;
      const nextScore = score + gained;
      const nextCorrect = correctCount + (isOk ? 1 : 0);

      setScore(nextScore);
      setStreak(nextStreak);
      setCorrectCount(nextCorrect);
      setConveyorFeedback({
        ok: isOk,
        text: isOk ? `ถูกต้อง! ${card.noteTh}` : `ยังไม่ถูก! ${card.noteTh}`,
      });

      if (isOk) {
        playComboStreakSound(nextStreak);
      } else {
        playErrorBuzzSound();
      }

      const nextIdx = cardIndex + 1;
      if (nextIdx >= conveyorCards.length) {
        window.setTimeout(() => {
          finishSession(nextScore, nextCorrect, conveyorCards.length);
        }, 600);
      } else {
        setCardIndex(nextIdx);
      }
    },
    [phase, mode, conveyorCards, cardIndex, streak, score, correctCount, finishSession]
  );

  useEffect(() => {
    if (phase !== 'PLAYING' || mode !== 'conveyor') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleConveyorGate('left');
      if (e.key === 'ArrowRight') handleConveyorGate('right');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, mode, handleConveyorGate]);

  const moveSequenceItem = (idx: number, dir: -1 | 1) => {
    if (seqResult) return;
    const target = idx + dir;
    if (target < 0 || target >= orderedItems.length) return;
    playCardFlipSound();
    const copy = [...orderedItems];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setOrderedItems(copy);
  };

  const handleCheckSequence = () => {
    if (!activeSequenceChallenge || seqResult) return;
    const isOk = activeSequenceChallenge.items.every((val, i) => val === orderedItems[i]);
    if (isOk) {
      const nextStreak = streak + 1;
      setScore((s) => s + 180 + (nextStreak - 1) * 40);
      setStreak(nextStreak);
      setCorrectCount((c) => c + 1);
      playComboStreakSound(nextStreak);
    } else {
      setStreak(0);
      playErrorBuzzSound();
    }
    setSeqResult({ ok: isOk, explanationTh: activeSequenceChallenge.explanationTh });
  };

  const handleNextSequence = () => {
    const nextIdx = seqIndex + 1;
    if (nextIdx >= sequenceDeck.length) {
      finishSession(score, correctCount, sequenceDeck.length);
    } else {
      setSeqIndex(nextIdx);
      let shuffled = shuffleList(sequenceDeck[nextIdx].items);
      if (shuffled.every((v, i) => v === sequenceDeck[nextIdx].items[i])) {
        shuffled = [...shuffled.slice(1), shuffled[0]];
      }
      setOrderedItems(shuffled);
      setSeqResult(null);
    }
  };

  const conveyorProgress =
    conveyorCards.length > 0 ? Math.round((cardIndex / conveyorCards.length) * 100) : 0;
  const sequenceProgress =
    sequenceDeck.length > 0 ? Math.round(((seqIndex + (seqResult ? 1 : 0)) / sequenceDeck.length) * 100) : 0;

  return (
    <div className="h-full w-full flex flex-col bg-[#09090B] text-white overflow-hidden select-none">
      {/* Minimal Single-Row Top Bar */}
      <header className="shrink-0 h-13 px-3 sm:px-4 bg-zinc-950/95 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
            aria-label="กลับศูนย์เกม"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">ออก</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-extrabold tracking-tight text-white truncate">
              ChronoSort
            </span>
          </div>
        </div>

        {phase === 'PLAYING' && (
          <div className="flex items-center gap-3 text-xs shrink-0 tabular-nums">
            <span className="font-extrabold text-amber-300">{score.toLocaleString()}</span>
            {streak >= 2 && <span className="font-black text-emerald-400">x{streak}</span>}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-xl mx-auto rounded-3xl bg-zinc-900/90 border border-white/10 p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mx-auto">
                <GitBranch className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                แยกหมวดด่วน & เรียงลำดับขั้น
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                ฝึกคิดไวแยกหมวดหมู่ซ้าย-ขวา หรือเรียงลำดับไทม์ไลน์และอัลกอริทึม
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('conveyor')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                  mode === 'conveyor'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white'
                    : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>สายพานแยกหมวด</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">ปัดซ้าย-ขวาให้ถูกฝั่ง</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('sequence')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                  mode === 'sequence'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white'
                    : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>เรียงลำดับ 4 ด่าน</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">จัดลำดับเหตุการณ์/ขั้นตอน</div>
              </button>
            </div>

            {mode === 'conveyor' && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-300">เลือกชุดโจทย์</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONVEYOR_SORT_DECKS.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => setSelectedConveyorDeckId(deck.id)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        selectedConveyorDeckId === deck.id
                          ? 'bg-emerald-500/15 border-emerald-400 text-white'
                          : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-emerald-400">
                        {getStrandMeta(deck.strand).nameTh}
                      </div>
                      <div className="text-xs font-extrabold mt-0.5">{deck.titleTh}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={startGame}
              className="w-full min-h-[52px] rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-base flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>เริ่มเล่นเลย</span>
            </button>
          </div>
        )}

        {phase === 'PLAYING' && mode === 'conveyor' && conveyorCards[cardIndex] && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200">{activeConveyorDeck.titleTh}</span>
                <span className="text-zinc-400 tabular-nums">
                  {cardIndex + 1}/{conveyorCards.length}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${conveyorProgress}%` }}
                />
              </div>
            </div>

            {/* Active Item Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-zinc-900 border border-white/10 text-center space-y-2">
              <div className="text-[11px] font-bold text-emerald-400">รายการบนสายพาน</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {conveyorCards[cardIndex].label}
              </div>
              <div className="text-[11px] text-zinc-500">แตะเลือกฝั่ง หรือกดลูกศร ← / →</div>
            </div>

            {/* Large Tactile Gate Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleConveyorGate('left')}
                className="min-h-[64px] p-4 rounded-2xl bg-cyan-500/20 hover:bg-cyan-400 hover:text-zinc-950 border border-cyan-400/40 text-cyan-100 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 shrink-0" />
                <span>{activeConveyorDeck.leftGateLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleConveyorGate('right')}
                className="min-h-[64px] p-4 rounded-2xl bg-amber-500/20 hover:bg-amber-400 hover:text-zinc-950 border border-amber-400/40 text-amber-100 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <span>{activeConveyorDeck.rightGateLabel}</span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </button>
            </div>

            {conveyorFeedback && (
              <div
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                  conveyorFeedback.ok
                    ? 'bg-emerald-950/45 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/45 border-rose-500/40 text-rose-200'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{conveyorFeedback.text}</span>
              </div>
            )}
          </div>
        )}

        {phase === 'PLAYING' && mode === 'sequence' && activeSequenceChallenge && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-200"
                style={{ width: `${sequenceProgress}%` }}
              />
            </div>

            <div className="p-4 rounded-3xl bg-zinc-900 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-400 font-bold">
                  {getStrandMeta(activeSequenceChallenge.strand).nameTh}
                </span>
                <span className="text-zinc-400 tabular-nums">
                  ด่าน {seqIndex + 1}/{sequenceDeck.length}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white">{activeSequenceChallenge.titleTh}</h3>
              <p className="text-xs text-zinc-400">{activeSequenceChallenge.instructionTh}</p>
            </div>

            <div className="space-y-2">
              {orderedItems.map((item, idx) => {
                const isExactSpot = seqResult && activeSequenceChallenge.items[idx] === item;
                return (
                  <div
                    key={item}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      seqResult
                        ? isExactSpot
                          ? 'bg-emerald-950/45 border-emerald-500/50 text-emerald-100'
                          : 'bg-rose-950/45 border-rose-500/50 text-rose-100'
                        : 'bg-zinc-900 border-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-xs shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-sm leading-snug">{item}</span>
                    </div>

                    {!seqResult && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSequenceItem(idx, -1)}
                          className="min-w-[40px] min-h-[40px] rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 flex items-center justify-center cursor-pointer"
                          aria-label="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedItems.length - 1}
                          onClick={() => moveSequenceItem(idx, 1)}
                          className="min-w-[40px] min-h-[40px] rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 flex items-center justify-center cursor-pointer"
                          aria-label="เลื่อนลง"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {seqResult ? (
              <div className="p-4 rounded-3xl bg-zinc-900 border border-white/10 space-y-3">
                <div className={`text-sm font-black flex items-center gap-1.5 ${seqResult.ok ? 'text-emerald-400' : 'text-amber-300'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{seqResult.ok ? 'เรียงลำดับถูกต้องสมบูรณ์!' : 'เฉลยลำดับที่ถูกต้อง'}</span>
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed">{seqResult.explanationTh}</div>
                <button
                  type="button"
                  onClick={handleNextSequence}
                  className="w-full min-h-[48px] rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 text-sm font-black cursor-pointer"
                >
                  {seqIndex + 1 >= sequenceDeck.length ? 'ดูสรุปผลคะแนน' : 'ด่านถัดไป'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCheckSequence}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-sm font-black cursor-pointer active:scale-[0.98] transition"
              >
                ตรวจลำดับคำตอบ
              </button>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-md mx-auto my-auto rounded-3xl bg-zinc-900 border border-white/10 p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white tabular-nums">
                {score.toLocaleString()} คะแนน
              </h3>
              <p className="text-xs text-zinc-400">ตอบถูกทั้งหมด {correctCount} ข้อ</p>
            </div>
            {rewarded && (
              <div className="flex items-center justify-center gap-4 text-xs font-extrabold tabular-nums">
                <span className="text-amber-300 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> +{rewarded.exp} EXP
                </span>
                <span className="text-cyan-300 flex items-center gap-1">
                  <Coins className="w-4 h-4" /> +{rewarded.gems} Gems
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="min-h-[48px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
              >
                เปลี่ยนชุด
              </button>
              <button
                type="button"
                onClick={startGame}
                className="min-h-[48px] rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นอีกรอบ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
