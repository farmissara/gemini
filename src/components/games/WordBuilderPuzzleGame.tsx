import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
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
  const [slots, setSlots] = useState<(string | null)[]>([]); // stores tileId
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

  const handleTapTile = (tileId: string) => {
    if (phase !== 'PLAYING' || !currentPuzzle) return;
    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx === -1) return;
    playCardFlipSound();

    const nextSlots = [...slots];
    nextSlots[emptyIdx] = tileId;
    setSlots(nextSlots);
    setTiles((prev) =>
      prev.map((t) => (t.tileId === tileId ? { ...t, usedInSlotIndex: emptyIdx } : t))
    );
    setFeedback(null);

    if (nextSlots.every((s) => s !== null)) {
      checkWord(nextSlots);
    }
  };

  const handleClearSlot = (slotIdx: number) => {
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
  };

  const checkWord = (candidateSlots: (string | null)[]) => {
    if (!currentPuzzle) return;
    const built = candidateSlots
      .map((tid) => tiles.find((t) => t.tileId === tid)?.char || '')
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
      setFeedback('ตัวอักษรยังไม่ถูกต้อง แตะที่ช่องคำตอบเพื่อนำตัวอักษรออกและลองใหม่ได้');
      playErrorBuzzSound();
    }
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
    setSlots(nextSlots);
    setTiles((prev) =>
      prev.map((t) => {
        if (t.tileId === prevTileInSlot) return { ...t, usedInSlotIndex: null };
        if (t.tileId === candidateTile.tileId) return { ...t, usedInSlotIndex: emptyIdx };
        return t;
      })
    );
    if (nextSlots.every((s) => s !== null)) {
      checkWord(nextSlots);
    }
  };

  const handleShuffleRack = () => {
    playCardFlipSound();
    setTiles((prev) => shuffleArr(prev));
  };

  const handleNextWord = () => {
    const nextIdx = wordIndex + 1;
    if (nextIdx >= deck.length) {
      const exp = 60 + solvedCount * 35 + score / 20;
      const gems = 8 + solvedCount * 5;
      const roundedExp = Math.round(exp);
      setRewarded({ exp: roundedExp, gems });
      setPhase('GAME_OVER');
      onEarnRewards(userId, roundedExp, gems, solvedCount >= 3);
      if (solvedCount > 0) onMissionProgress(solvedCount);
      playGrandVictoryFanfare();
    } else {
      setWordIndex(nextIdx);
      setupWord(deck[nextIdx]);
    }
  };

  // Keyboard typing support for A-Z & Backspace
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
  }, [phase, slots, tiles]);

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
          <span className="text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
            <SpellCheck2 className="w-4 h-4" />
            <span>Bilingual Word Builder</span>
          </span>
        </div>

        {(phase === 'PLAYING' || phase === 'ROUND_SOLVED') && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-slate-200 tabular-nums">
              คำที่ {wordIndex + 1}/{deck.length}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-amber-300 tabular-nums">
              {score.toLocaleString()} pts
            </span>
            {streak >= 2 && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black tabular-nums">
                STREAK x{streak}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">เรียงตัวอักษรคำศัพท์วิชาการ 8 สาระฯ</h2>
              <p className="text-xs text-slate-300">
                อ่านคำอธิบายภาษาไทยแล้วต่อตัวอักษรคำศัพท์ภาษาอังกฤษให้ถูกต้อง (คลิกตัวอักษรหรือพิมพ์จากคีย์บอร์ดได้เลย)
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">เลือกหมวดหมู่สาระวิชา:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStrandFilter('all')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    strandFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  รวมทั้ง 8 สาระฯ ({WORD_BUILDER_PUZZLES.length} คำ)
                </button>
                {LEARNING_STRANDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStrandFilter(s.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      strandFilter === s.id
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    {s.code} · {s.nameTh}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={startSession}
                className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>เริ่มภารกิจต่อคำศัพท์ (5 คำ)</span>
              </button>
            </div>
          </div>
        )}

        {(phase === 'PLAYING' || phase === 'ROUND_SOLVED') && currentPuzzle && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 font-bold">
                  {getStrandMeta(currentPuzzle.strand).code} · {getStrandMeta(currentPuzzle.strand).nameTh}
                </span>
                <span className="text-slate-300 tabular-nums font-semibold">
                  {currentPuzzle.answer.length} ตัวอักษร
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white leading-relaxed">
                {currentPuzzle.clueTh}
              </h3>

              {showHint && (
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
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
                    className={`w-11 h-12 sm:w-12 sm:h-14 rounded-xl border-2 text-lg font-black font-mono flex items-center justify-center transition ${
                      phase === 'ROUND_SOLVED'
                        ? 'bg-emerald-600 border-emerald-300 text-white'
                        : tile
                        ? 'bg-indigo-700 border-cyan-300 text-white cursor-pointer hover:bg-indigo-600'
                        : 'bg-slate-900 border-slate-700 border-dashed text-slate-500'
                    }`}
                  >
                    {tile ? tile.char : ''}
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 text-center font-semibold">
                {feedback}
              </div>
            )}

            {phase === 'PLAYING' ? (
              <>
                {/* Letter Rack */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 text-center">
                    แตะตัวอักษรเพื่อนำไปเรียง (หรือพิมพ์คีย์บอร์ด A-Z):
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {tiles.map((t) => {
                      const isUsed = t.usedInSlotIndex !== null;
                      return (
                        <button
                          key={t.tileId}
                          type="button"
                          disabled={isUsed}
                          onClick={() => handleTapTile(t.tileId)}
                          className={`w-11 h-12 rounded-xl border font-mono font-black text-base transition ${
                            isUsed
                              ? 'bg-slate-950 border-slate-800 text-slate-700 opacity-30'
                              : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border-slate-600 text-white cursor-pointer active:scale-95'
                          }`}
                        >
                          {t.char}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lifelines */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>ดูคำใบ้บริบท</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRevealOneLetter}
                    disabled={revealCount <= 0}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>เปิด 1 ตัวอักษร ({revealCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShuffleRack}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>สลับตำแหน่งตัวอักษร</span>
                  </button>
                </div>
              </>
            ) : (
              /* Word Solved Educational Card */
              <div className="p-5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ถูกต้อง! {currentPuzzle.answer}</span>
                </div>
                <div className="text-sm font-bold text-white">{currentPuzzle.meaningTh}</div>
                <div className="text-xs text-slate-200 italic">
                  ตัวอย่างประโยค: &ldquo;{currentPuzzle.exampleSentence}&rdquo;
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextWord}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                  >
                    {wordIndex + 1 >= deck.length ? 'ดูสรุปผลคะแนน' : 'คำถัดไป →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">เก่งมาก! ต่อคำศัพท์ครบทั้ง 5 คำ</h3>
              <p className="text-xs text-slate-300 mt-1">คะแนนรวม {score.toLocaleString()} แต้ม</p>
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
                เปลี่ยนสาระวิชา
              </button>
              <button
                type="button"
                onClick={startSession}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เล่นชุดใหม่</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
