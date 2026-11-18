import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Eraser,
  Flame,
  Lightbulb,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  SpellCheck2,
  Trophy,
} from 'lucide-react';
import { WORD_BUILDER_PUZZLES, WordBuilderPuzzle } from '../../data/arcadeGamesData';
import { LEARNING_STRANDS } from '../../data/examQuestionBanks';
import { getStrandMeta } from '../../lib/centralExamBank';
import {
  playCardFlipSound,
  playComboStreakSound,
  playErrorBuzzSound,
  playGrandVictoryFanfare,
  playPowerupChimeSound,
} from '../../lib/labSoundEffects';
import { LearningStrandId } from '../../types';

interface WordBuilderPuzzleGameProps {
  userId: string;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onMissionProgress: (solvedCount: number) => void;
  onBack: () => void;
}

interface TileItem {
  tileId: string;
  char: string;
  usedInSlotIndex: number | null;
}

function shuffleArr<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const WordBuilderPuzzleGame: React.FC<WordBuilderPuzzleGameProps> = ({
  userId,
  onEarnRewards,
  onMissionProgress,
  onBack,
}) => {
  const [phase, setPhase] = useState<'TITLE_MENU' | 'PLAYING' | 'ROUND_SOLVED' | 'GAME_OVER'>('TITLE_MENU');
  const [strandFilter, setStrandFilter] = useState<LearningStrandId | 'all'>('all');
  const [deck, setDeck] = useState<WordBuilderPuzzle[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [tiles, setTiles] = useState<TileItem[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [revealCount, setRevealCount] = useState(2);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState<{ exp: number; gems: number } | null>(null);

  const currentPuzzle = deck[wordIndex] || null;

  const filteredPool = useMemo(() => {
    if (strandFilter === 'all') return WORD_BUILDER_PUZZLES;
    const sub = WORD_BUILDER_PUZZLES.filter((w) => w.strand === strandFilter);
    return sub.length > 0 ? sub : WORD_BUILDER_PUZZLES;
  }, [strandFilter]);

  const setupWord = (puzzle: WordBuilderPuzzle) => {
    const chars = puzzle.answer.split('');
    const decoyChars = 'EARSTLNIO'.split('').filter((c) => !chars.includes(c)).slice(0, 2);
    const combined = shuffleArr([...chars, ...decoyChars]).map((char, idx) => ({
      tileId: `tile-${puzzle.id}-${idx}`,
      char,
      usedInSlotIndex: null,
    }));
    setTiles(combined);
    setSlots(Array(chars.length).fill(null));
    setShowHint(false);
    setFeedback(null);
    setPhase('PLAYING');
  };

  const startSession = () => {
    const picked = shuffleArr(filteredPool).slice(0, 5);
    setDeck(picked);
    setWordIndex(0);
    setScore(0);
    setStreak(0);
    setSolvedCount(0);
    setRevealCount(2);
    setRewarded(null);
    if (picked[0]) setupWord(picked[0]);
  };

  const checkWord = useCallback(
    (candidateSlots: (string | null)[], currentTiles: TileItem[]) => {
      if (!currentPuzzle) return;
      const built = candidateSlots
        .map((tid) => currentTiles.find((t) => t.tileId === tid)?.char || '')
        .join('');

      if (built === currentPuzzle.answer) {
        const nextStreak = streak + 1;
        const gained = 120 + (nextStreak - 1) * 35 + (showHint ? 0 : 30);
        setScore((s) => s + gained);
        setStreak(nextStreak);
        setSolvedCount((c) => c + 1);
        setPhase('ROUND_SOLVED');
        playComboStreakSound(nextStreak);
      } else {
        setStreak(0);
        setFeedback('ยังไม่ถูก แตะที่ช่องคำตอบเพื่อเอาออกหรือกดล้างคำได้');
        playErrorBuzzSound();
      }
    },
    [currentPuzzle, showHint, streak]
  );

  const handleTapTile = useCallback(
    (tileId: string) => {
      if (phase !== 'PLAYING' || !currentPuzzle) return;
      const emptyIdx = slots.findIndex((s) => s === null);
      if (emptyIdx === -1) return;
      playCardFlipSound();

      const nextSlots = [...slots];
      nextSlots[emptyIdx] = tileId;
      const nextTiles = tiles.map((t) => (t.tileId === tileId ? { ...t, usedInSlotIndex: emptyIdx } : t));
      setSlots(nextSlots);
      setTiles(nextTiles);
      setFeedback(null);

      if (nextSlots.every((s) => s !== null)) {
        checkWord(nextSlots, nextTiles);
      }
    },
    [phase, currentPuzzle, slots, tiles, checkWord]
  );

  const handleClearSlot = useCallback(
    (slotIdx: number) => {
      if (phase !== 'PLAYING') return;
      const tileId = slots[slotIdx];
      if (!tileId) return;
      playCardFlipSound();
      const nextSlots = [...slots];
      nextSlots[slotIdx] = null;
      setSlots(nextSlots);
      setTiles((prev) =>
        prev.map((t) => (t.tileId === tileId ? { ...t, usedInSlotIndex: null } : t))
      );
      setFeedback(null);
    },
    [phase, slots]
  );

  const handleClearAllSlots = () => {
    if (phase !== 'PLAYING') return;
    playCardFlipSound();
    setSlots(Array(slots.length).fill(null));
    setTiles((prev) => prev.map((t) => ({ ...t, usedInSlotIndex: null })));
    setFeedback(null);
  };

  const handleRevealOneLetter = () => {
    if (phase !== 'PLAYING' || !currentPuzzle || revealCount <= 0) return;
    const emptyIdx = slots.findIndex((s, i) => {
      if (!s) return true;
      const ch = tiles.find((t) => t.tileId === s)?.char;
      return ch !== currentPuzzle.answer[i];
    });
    if (emptyIdx === -1) return;

    const neededChar = currentPuzzle.answer[emptyIdx];
    const candidateTile = tiles.find((t) => t.usedInSlotIndex === null && t.char === neededChar);
    if (!candidateTile) return;

    setRevealCount((c) => c - 1);
    playPowerupChimeSound();

    const prevTileInSlot = slots[emptyIdx];
    const nextSlots = [...slots];
    nextSlots[emptyIdx] = candidateTile.tileId;
    const nextTiles = tiles.map((t) => {
      if (t.tileId === prevTileInSlot) return { ...t, usedInSlotIndex: null };
      if (t.tileId === candidateTile.tileId) return { ...t, usedInSlotIndex: emptyIdx };
      return t;
    });
    setSlots(nextSlots);
    setTiles(nextTiles);
    if (nextSlots.every((s) => s !== null)) {
      checkWord(nextSlots, nextTiles);
    }
  };

  const handleShuffleRack = () => {
    playCardFlipSound();
    setTiles((prev) => shuffleArr(prev));
  };

  const handleNextWord = () => {
    const nextIdx = wordIndex + 1;
    if (nextIdx >= deck.length) {
      const exp = Math.round(60 + solvedCount * 35 + score / 20);
      const gems = 8 + solvedCount * 5;
      setRewarded({ exp, gems });
      setPhase('GAME_OVER');
      onEarnRewards(userId, exp, gems, solvedCount >= 3);
      if (solvedCount > 0) onMissionProgress(solvedCount);
      playGrandVictoryFanfare();
    } else {
      setWordIndex(nextIdx);
      setupWord(deck[nextIdx]);
    }
  };

  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const lastFilled = [...slots].reverse().findIndex((s) => s !== null);
        if (lastFilled !== -1) {
          handleClearSlot(slots.length - 1 - lastFilled);
        }
        return;
      }
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch)) {
        const matchTile = tiles.find((t) => t.usedInSlotIndex === null && t.char === ch);
        if (matchTile) handleTapTile(matchTile.tileId);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, slots, tiles, handleClearSlot, handleTapTile]);

  const progressPct = deck.length > 0 ? Math.round(((wordIndex + (phase === 'ROUND_SOLVED' ? 1 : 0)) / deck.length) * 100) : 0;

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
            <SpellCheck2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-extrabold tracking-tight text-white truncate">
              Word Builder
            </span>
          </div>
        </div>

        {(phase === 'PLAYING' || phase === 'ROUND_SOLVED') && (
          <div className="flex items-center gap-3 text-xs shrink-0 tabular-nums">
            <span className="text-zinc-400 font-bold">
              {wordIndex + 1}/{deck.length}
            </span>
            <span className="font-extrabold text-amber-300">{score.toLocaleString()}</span>
            {streak >= 2 && <span className="font-black text-rose-400">x{streak}</span>}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-xl mx-auto rounded-3xl bg-zinc-900/90 border border-white/10 p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
                <SpellCheck2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ต่อคำศัพท์สองภาษา
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                อ่านความหมายแล้วแตะเรียงตัวอักษรภาษาอังกฤษให้ถูกต้อง (รองรับคีย์บอร์ด A-Z)
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-300">เลือกหมวดหมู่</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStrandFilter('all')}
                  className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                    strandFilter === 'all'
                      ? 'bg-amber-400 text-zinc-950 border-amber-300'
                      : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  รวมทั้ง 8 สาระ ({WORD_BUILDER_PUZZLES.length} คำ)
                </button>
                {LEARNING_STRANDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStrandFilter(s.id)}
                    className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      strandFilter === s.id
                        ? 'bg-amber-400 text-zinc-950 border-amber-300'
                        : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    {s.nameTh}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startSession}
              className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-base flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>เริ่มเล่น (5 คำ)</span>
            </button>
          </div>
        )}

        {(phase === 'PLAYING' || phase === 'ROUND_SOLVED') && currentPuzzle && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Clue Card */}
            <div className="p-5 rounded-3xl bg-zinc-900 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold text-amber-300">
                  {getStrandMeta(currentPuzzle.strand).nameTh}
                </span>
                <span className="tabular-nums font-semibold">
                  {currentPuzzle.answer.length} ตัวอักษร
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-relaxed">
                {currentPuzzle.clueTh}
              </h3>
              {showHint && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 text-xs text-amber-200">
                  คำใบ้: {currentPuzzle.hintTh}
                </div>
              )}
            </div>

            {/* Answer Sockets */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {slots.map((tileId, idx) => {
                const tile = tiles.find((t) => t.tileId === tileId);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!tile || phase !== 'PLAYING'}
                    onClick={() => handleClearSlot(idx)}
                    className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 text-lg font-black font-mono flex items-center justify-center transition ${
                      phase === 'ROUND_SOLVED'
                        ? 'bg-emerald-500 border-emerald-300 text-zinc-950'
                        : tile
                          ? 'bg-indigo-500 border-indigo-300 text-white cursor-pointer hover:bg-indigo-400'
                          : 'bg-zinc-900 border-white/15 border-dashed text-zinc-600'
                    }`}
                  >
                    {tile ? tile.char : ''}
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/35 text-xs text-rose-200 text-center font-semibold">
                {feedback}
              </div>
            )}

            {phase === 'PLAYING' ? (
              <>
                <div className="p-4 rounded-3xl bg-zinc-900 border border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {tiles.map((t) => {
                      const isUsed = t.usedInSlotIndex !== null;
                      return (
                        <button
                          key={t.tileId}
                          type="button"
                          disabled={isUsed}
                          onClick={() => handleTapTile(t.tileId)}
                          className={`min-w-[46px] min-h-[48px] px-2 rounded-2xl border font-mono font-black text-base transition ${
                            isUsed
                              ? 'bg-zinc-950 border-white/5 text-zinc-700 opacity-25'
                              : 'bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 border-white/15 text-white cursor-pointer active:scale-95'
                          }`}
                        >
                          {t.char}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Lifelines */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                    className="min-h-[44px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 border border-white/10 font-bold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>คำใบ้</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRevealOneLetter}
                    disabled={revealCount <= 0}
                    className="min-h-[44px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 border border-white/10 font-bold text-cyan-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>เปิด ({revealCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShuffleRack}
                    className="min-h-[44px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 font-bold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>สลับ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllSlots}
                    className="min-h-[44px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 font-bold text-rose-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>ล้างคำ</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-5 rounded-3xl bg-emerald-950/40 border border-emerald-500/35 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-base">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{currentPuzzle.answer}</span>
                </div>
                <div className="text-sm font-bold text-white">{currentPuzzle.meaningTh}</div>
                <div className="text-xs text-zinc-300 italic">
                  &ldquo;{currentPuzzle.exampleSentence}&rdquo;
                </div>
                <button
                  type="button"
                  onClick={handleNextWord}
                  className="w-full min-h-[48px] rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-sm font-black cursor-pointer transition active:scale-[0.98]"
                >
                  {wordIndex + 1 >= deck.length ? 'ดูสรุปคะแนน' : 'คำถัดไป'}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-md mx-auto my-auto rounded-3xl bg-zinc-900 border border-white/10 p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white tabular-nums">
                {score.toLocaleString()} คะแนน
              </h3>
              <p className="text-xs text-zinc-400">ต่อคำศัพท์สำเร็จ {solvedCount} คำ</p>
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
                เปลี่ยนหมวด
              </button>
              <button
                type="button"
                onClick={startSession}
                className="min-h-[48px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นชุดใหม่</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
