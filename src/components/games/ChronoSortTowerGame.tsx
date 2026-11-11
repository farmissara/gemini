import React, { useEffect, useState } from 'react';
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

  // Conveyor State
  const [selectedConveyorDeckId, setSelectedConveyorDeckId] = useState<string>(CONVEYOR_SORT_DECKS[0].id);
  const [conveyorCards, setConveyorCards] = useState<ConveyorSortCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [conveyorFeedback, setConveyorFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Sequence State
  const [sequenceDeck, setSequenceDeck] = useState<SequenceChallenge[]>([]);
  const [seqIndex, setSeqIndex] = useState(0);
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [seqResult, setSeqResult] = useState<{ ok: boolean; explanationTh: string } | null>(null);

  // Shared Scoring
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [rewarded, setRewarded] = useState<{ exp: number; gems: number } | null>(null);

  const activeConveyorDeck: ConveyorSortDeck =
    CONVEYOR_SORT_DECKS.find((d) => d.id === selectedConveyorDeckId) || CONVEYOR_SORT_DECKS[0];

  const activeSequenceChallenge: SequenceChallenge | null = sequenceDeck[seqIndex] || null;

  const finishSession = (finalScore: number, finalCorrect: number, totalCount: number) => {
    setPhase('GAME_OVER');
    const exp = 60 + finalCorrect * 22 + Math.floor(finalScore / 25);
    const gems = 8 + finalCorrect * 3;
    setRewarded({ exp, gems });
    onEarnRewards(userId, exp, gems, finalCorrect >= Math.ceil(totalCount / 2));
    onMissionProgress();
    playGrandVictoryFanfare();
  };

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
        // Ensure shuffled order differs from exact answer
        let shuffled = shuffleList(picked[0].items);
        if (shuffled.every((v, i) => v === picked[0].items[i])) {
          shuffled = [...shuffled.slice(1), shuffled[0]];
        }
        setOrderedItems(shuffled);
      }
    }

    setPhase('PLAYING');
  };

  const handleConveyorGate = (chosenSide: 'left' | 'right') => {
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
      }, 650);
    } else {
      setCardIndex(nextIdx);
    }
  };

  // ArrowLeft / ArrowRight support in Conveyor mode
  useEffect(() => {
    if (phase !== 'PLAYING' || mode !== 'conveyor') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleConveyorGate('left');
      if (e.key === 'ArrowRight') handleConveyorGate('right');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, mode, cardIndex, conveyorCards, score, streak, correctCount]);

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

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Arcade Hub</span>
          </button>
          <span className="text-sm font-extrabold text-purple-300 flex items-center gap-1.5">
            <GitBranch className="w-4 h-4" />
            <span>ChronoSort & Conveyor Logic</span>
          </span>
        </div>

        {phase === 'PLAYING' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-amber-300 tabular-nums">
              {score.toLocaleString()} pts
            </span>
            {streak >= 2 && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-black tabular-nums">
                COMBO x{streak}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">แยกหมวดสายพานด่วน & เรียงลำดับเหตุการณ์ 8 สาระ</h2>
              <p className="text-xs text-slate-300">
                ฝึกทักษะการคิดวิเคราะห์ การจัดหมวดหมู่ และการจัดลำดับขั้นตอนทางวิทยาศาสตร์ ประวัติศาสตร์ ภาษาไทย และคณิตศาสตร์
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('conveyor')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'conveyor'
                    ? 'bg-purple-500/20 border-purple-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-300" />
                  <span>Conveyor Rush (แยกหมวดซ้าย/ขวา)</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  คัดแยกคำ/สาร/แนวคิดลงช่องซ้าย-ขวาให้ไว (รองรับปุ่มลูกศร ← →)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('sequence')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  mode === 'sequence'
                    ? 'bg-cyan-500/20 border-cyan-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-cyan-300" />
                  <span>Sequence Master (เรียงลำดับขั้น 4 ข้อ)</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  เรียงลำดับเหตุการณ์ประวัติศาสตร์ วัฏจักรวิทย์ หรือขั้นตอนวิศวกรรม
                </div>
              </button>
            </div>

            {mode === 'conveyor' && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200">เลือกชุดแยกหมวดหมู่:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONVEYOR_SORT_DECKS.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => setSelectedConveyorDeckId(deck.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selectedConveyorDeckId === deck.id
                          ? 'bg-purple-600/25 border-purple-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-purple-300">
                        {getStrandMeta(deck.strand).nameTh}
                      </div>
                      <div className="text-xs font-extrabold mt-0.5">{deck.titleTh}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={startGame}
                className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>เริ่มเล่นทันที</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'PLAYING' && mode === 'conveyor' && conveyorCards[cardIndex] && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold text-white">{activeConveyorDeck.titleTh}</span>
              <span className="tabular-nums">
                ใบที่ {cardIndex + 1} / {conveyorCards.length}
              </span>
            </div>

            {/* Active Item on Belt */}
            <div className="p-8 rounded-2xl bg-slate-900 border-2 border-purple-500/40 text-center space-y-2">
              <div className="text-[11px] font-bold text-purple-300 uppercase">รายการบนสายพาน</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {conveyorCards[cardIndex].label}
              </div>
              <div className="text-[11px] text-slate-400">
                กดปุ่มด้านล่าง หรือใช้ปุ่มลูกศร ← / → บนคีย์บอร์ด
              </div>
            </div>

            {/* Left / Right Gate Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleConveyorGate('left')}
                className="p-4 rounded-2xl bg-cyan-700 hover:bg-cyan-600 border border-cyan-400/50 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{activeConveyorDeck.leftGateLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleConveyorGate('right')}
                className="p-4 rounded-2xl bg-amber-600 hover:bg-amber-500 border border-amber-300/50 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <span>{activeConveyorDeck.rightGateLabel}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {conveyorFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  conveyorFeedback.ok
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{conveyorFeedback.text}</span>
              </div>
            )}
          </div>
        )}

        {phase === 'PLAYING' && mode === 'sequence' && activeSequenceChallenge && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-bold">
                  {getStrandMeta(activeSequenceChallenge.strand).nameTh}
                </span>
                <span className="text-slate-300 tabular-nums">
                  ด่าน {seqIndex + 1} / {sequenceDeck.length}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white">{activeSequenceChallenge.titleTh}</h3>
              <p className="text-xs text-slate-300">{activeSequenceChallenge.instructionTh}</p>
            </div>

            <div className="space-y-2">
              {orderedItems.map((item, idx) => {
                const isExactSpot = seqResult && activeSequenceChallenge.items[idx] === item;
                return (
                  <div
                    key={item}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      seqResult
                        ? isExactSpot
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-100'
                          : 'bg-rose-950/50 border-rose-500 text-rose-100'
                        : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center font-black shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-sm">{item}</span>
                    </div>

                    {!seqResult && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSequenceItem(idx, -1)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedItems.length - 1}
                          onClick={() => moveSequenceItem(idx, 1)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="เลื่อนลง"
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
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                <div className={`text-sm font-black flex items-center gap-1.5 ${seqResult.ok ? 'text-emerald-400' : 'text-amber-300'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{seqResult.ok ? 'เรียงลำดับถูกต้องสมบูรณ์!' : 'เฉลยลำดับที่ถูกต้อง:'}</span>
                </div>
                <div className="text-xs text-slate-200">{seqResult.explanationTh}</div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextSequence}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold cursor-pointer"
                  >
                    {seqIndex + 1 >= sequenceDeck.length ? 'ดูสรุปผลคะแนน' : 'ด่านถัดไป →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCheckSequence}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black cursor-pointer"
                >
                  ตรวจคำตอบลำดับ
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">จบด่านสำเร็จ! ({score.toLocaleString()} แต้ม)</h3>
              <p className="text-xs text-slate-300 mt-1">ตอบถูกทั้งหมด {correctCount} ข้อ</p>
            </div>
            {rewarded && (
              <div className="flex items-center justify-center gap-3 text-xs font-extrabold">
                <span className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> +{rewarded.exp} EXP
                </span>
                <span className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                  <Coins className="w-4 h-4" /> +{rewarded.gems} Gems
                </span>
              </div>
            )}
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                เลือกชุดอื่น
              </button>
              <button
                type="button"
                onClick={startGame}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เล่นอีกรอบ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
