import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Flame,
  Grid2x2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { MATCH_CONCEPT_DECKS, MatchPairItem } from '../../data/arcadeGamesData';
import { LEARNING_STRANDS } from '../../data/examQuestionBanks';
import {
  playCardFlipSound,
  playComboStreakSound,
  playErrorBuzzSound,
  playGrandVictoryFanfare,
} from '../../lib/labSoundEffects';
import { LearningStrandId } from '../../types';

interface ConceptMatchBlitzGameProps {
  userId: string;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onMissionProgress: () => void;
  onBack: () => void;
}

interface MemoryCardTile {
  uid: string;
  pairId: string;
  text: string;
  side: 'left' | 'right';
  matched: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const ConceptMatchBlitzGame: React.FC<ConceptMatchBlitzGameProps> = ({
  userId,
  onEarnRewards,
  onMissionProgress,
  onBack,
}) => {
  const [phase, setPhase] = useState<'TITLE_MENU' | 'PLAYING' | 'GAME_OVER'>('TITLE_MENU');
  const [selectedStrand, setSelectedStrand] = useState<LearningStrandId>('foreign_lang');
  const [gameVariant, setGameVariant] = useState<'lightning_link' | 'memory_flip'>('lightning_link');

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rewarded, setRewarded] = useState<{ exp: number; gems: number } | null>(null);

  const [activePairs, setActivePairs] = useState<MatchPairItem[]>([]);
  const [rightShuffled, setRightShuffled] = useState<MatchPairItem[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [latestNote, setLatestNote] = useState<string | null>(null);

  const [memoryCards, setMemoryCards] = useState<MemoryCardTile[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [lockFlip, setLockFlip] = useState(false);

  const activeDeck = useMemo(
    () => MATCH_CONCEPT_DECKS.find((d) => d.strand === selectedStrand) || MATCH_CONCEPT_DECKS[0],
    [selectedStrand]
  );

  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const completeRound = (finalScore: number, totalMistakes: number) => {
    setPhase('GAME_OVER');
    const speedBonus = Math.max(0, 60 - elapsedSec);
    const exp = Math.min(220, 75 + Math.floor(finalScore / 15) + speedBonus);
    const gems = Math.max(10, 26 - totalMistakes * 2);
    setRewarded({ exp, gems });
    onEarnRewards(userId, exp, gems, true);
    onMissionProgress();
    playGrandVictoryFanfare();
  };

  const startRound = () => {
    const pickedPairs = shuffleArray(activeDeck.pairs).slice(0, 6);
    setActivePairs(pickedPairs);
    setScore(0);
    setCombo(0);
    setMistakes(0);
    setElapsedSec(0);
    setRewarded(null);
    setLatestNote(null);

    if (gameVariant === 'lightning_link') {
      setRightShuffled(shuffleArray(pickedPairs));
      setSelectedLeftId(null);
      setMatchedIds(new Set());
    } else {
      const tiles: MemoryCardTile[] = [];
      pickedPairs.forEach((p) => {
        tiles.push({ uid: `${p.id}-L`, pairId: p.id, text: p.left, side: 'left', matched: false });
        tiles.push({ uid: `${p.id}-R`, pairId: p.id, text: p.right, side: 'right', matched: false });
      });
      setMemoryCards(shuffleArray(tiles));
      setFlippedUids([]);
      setLockFlip(false);
    }

    setPhase('PLAYING');
  };

  const handleRightTap = (rightItem: MatchPairItem) => {
    if (!selectedLeftId || matchedIds.has(rightItem.id)) return;
    if (selectedLeftId === rightItem.id) {
      const nextCombo = combo + 1;
      const gained = 100 + (nextCombo - 1) * 30;
      const nextScore = score + gained;
      const nextMatched = new Set(matchedIds);
      nextMatched.add(rightItem.id);

      setMatchedIds(nextMatched);
      setSelectedLeftId(null);
      setCombo(nextCombo);
      setScore(nextScore);
      setLatestNote(`${rightItem.left} = ${rightItem.right} · ${rightItem.noteTh}`);
      playComboStreakSound(nextCombo);

      if (nextMatched.size >= activePairs.length) {
        completeRound(nextScore, mistakes);
      }
    } else {
      setCombo(0);
      setMistakes((m) => m + 1);
      setSelectedLeftId(null);
      playErrorBuzzSound();
    }
  };

  const handleFlipCard = (card: MemoryCardTile) => {
    if (lockFlip || card.matched || flippedUids.includes(card.uid)) return;
    playCardFlipSound();
    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      setLockFlip(true);
      const first = memoryCards.find((c) => c.uid === nextFlipped[0]);
      const second = memoryCards.find((c) => c.uid === nextFlipped[1]);
      if (first && second && first.pairId === second.pairId) {
        const nextCombo = combo + 1;
        const gained = 140 + (nextCombo - 1) * 35;
        const nextScore = score + gained;
        const pairInfo = activePairs.find((p) => p.id === first.pairId);
        window.setTimeout(() => {
          const updated = memoryCards.map((c) =>
            c.pairId === first.pairId ? { ...c, matched: true } : c
          );
          setMemoryCards(updated);
          setFlippedUids([]);
          setLockFlip(false);
          setCombo(nextCombo);
          setScore(nextScore);
          if (pairInfo) {
            setLatestNote(`${pairInfo.left} = ${pairInfo.right} · ${pairInfo.noteTh}`);
          }
          playComboStreakSound(nextCombo);
          if (updated.every((c) => c.matched)) {
            completeRound(nextScore, mistakes);
          }
        }, 280);
      } else {
        window.setTimeout(() => {
          setFlippedUids([]);
          setLockFlip(false);
          setCombo(0);
          setMistakes((m) => m + 1);
          playErrorBuzzSound();
        }, 650);
      }
    }
  };

  const matchedCount =
    gameVariant === 'lightning_link'
      ? matchedIds.size
      : Math.floor(memoryCards.filter((c) => c.matched).length / 2);
  const progressPct = activePairs.length > 0 ? Math.round((matchedCount / activePairs.length) * 100) : 0;

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
            <Grid2x2 className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-sm font-extrabold tracking-tight text-white truncate">
              Match & Memory
            </span>
          </div>
        </div>

        {phase === 'PLAYING' && (
          <div className="flex items-center gap-3 text-xs shrink-0 tabular-nums">
            <span className="font-extrabold text-amber-300">{score.toLocaleString()}</span>
            <span className="text-zinc-400 font-mono">{elapsedSec}s</span>
            {combo >= 2 && <span className="font-black text-emerald-400">x{combo}</span>}
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-2xl mx-auto rounded-3xl bg-zinc-900/90 border border-white/10 p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                จับคู่คำศัพท์ & ความจำ 8 สาระ
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                เลือกโหมดและกลุ่มสาระที่อยากฝึก แล้วทำคอมโบให้ไวที่สุด
              </p>
            </div>

            {/* Clean Mode Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGameVariant('lightning_link')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                  gameVariant === 'lightning_link'
                    ? 'bg-violet-500/15 border-violet-400 text-white'
                    : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>จับคู่สายฟ้า</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">แตะซ้ายเชื่อมขวาให้ไว</div>
              </button>

              <button
                type="button"
                onClick={() => setGameVariant('memory_flip')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                  gameVariant === 'memory_flip'
                    ? 'bg-violet-500/15 border-violet-400 text-white'
                    : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <Grid2x2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>เปิดการ์ดความจำ</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">พลิกการ์ด 12 ใบจับคู่</div>
              </button>
            </div>

            {/* 8-Strand Selector */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-300">เลือกวิชา</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LEARNING_STRANDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStrand(s.id)}
                    className={`min-h-[52px] p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedStrand === s.id
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-emerald-400 font-bold">{s.code}</div>
                    <div className="text-xs font-bold mt-0.5 line-clamp-1">{s.nameTh}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 space-y-3">
              <div className="text-xs text-zinc-400 text-center">
                ชุดที่เลือก: <strong className="text-white">{activeDeck.titleTh}</strong>
              </div>
              <button
                type="button"
                onClick={startRound}
                className="w-full min-h-[52px] rounded-2xl bg-violet-500 hover:bg-violet-400 text-white font-black text-base flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>เริ่มเล่นเลย</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'PLAYING' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Progress Strip */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200 truncate">{activeDeck.titleTh}</span>
                <span className="text-zinc-400 tabular-nums shrink-0">
                  {matchedCount}/{activePairs.length} คู่ · พลาด {mistakes}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-violet-400 rounded-full transition-all duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {latestNote && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="leading-snug">{latestNote}</span>
              </div>
            )}

            {gameVariant === 'lightning_link' ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-cyan-400">1. เลือกคำหลัก</div>
                  {activePairs.map((pair) => {
                    const isMatched = matchedIds.has(pair.id);
                    const isSelected = selectedLeftId === pair.id;
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => {
                          playCardFlipSound();
                          setSelectedLeftId(pair.id);
                        }}
                        className={`w-full min-h-[54px] p-3 rounded-2xl border text-left text-xs sm:text-sm font-bold transition cursor-pointer active:scale-[0.98] ${
                          isMatched
                            ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-400/70 opacity-50'
                            : isSelected
                              ? 'bg-cyan-500 border-cyan-300 text-zinc-950 shadow-md'
                              : 'bg-zinc-900 border-white/10 hover:border-cyan-400/60 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="leading-snug">{pair.left}</span>
                          {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-amber-400">2. แตะคู่ที่ตรงกัน</div>
                  {rightShuffled.map((pair) => {
                    const isMatched = matchedIds.has(pair.id);
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        disabled={isMatched || !selectedLeftId}
                        onClick={() => handleRightTap(pair)}
                        className={`w-full min-h-[54px] p-3 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-[0.98] ${
                          isMatched
                            ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-400/70 opacity-50'
                            : selectedLeftId
                              ? 'bg-zinc-900 border-amber-400/45 hover:bg-amber-400 hover:text-zinc-950 text-white'
                              : 'bg-zinc-900/60 border-white/10 text-zinc-400'
                        }`}
                      >
                        <span className="leading-snug">{pair.right}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {memoryCards.map((card, index) => {
                  const isFlipped = card.matched || flippedUids.includes(card.uid);
                  return (
                    <button
                      key={card.uid}
                      type="button"
                      disabled={card.matched}
                      onClick={() => handleFlipCard(card)}
                      className={`min-h-[96px] p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                        card.matched
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : isFlipped
                            ? 'bg-violet-600 border-violet-300 text-white shadow-lg'
                            : 'bg-zinc-900 border-white/10 hover:border-violet-400/60 text-zinc-300'
                      }`}
                    >
                      {isFlipped ? (
                        <span className="text-xs font-bold leading-snug break-words">{card.text}</span>
                      ) : (
                        <span className="text-base font-black text-violet-300/80 tabular-nums">
                          {index + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-xl mx-auto rounded-3xl bg-zinc-900 border border-white/10 p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-white tabular-nums">
                {score.toLocaleString()} คะแนน
              </h3>
              <p className="text-xs text-zinc-400 tabular-nums">
                ใช้เวลา {elapsedSec} วินาที · พลาด {mistakes} ครั้ง
              </p>
              {rewarded && (
                <div className="flex items-center justify-center gap-4 pt-2 text-xs font-extrabold tabular-nums">
                  <span className="text-amber-300 flex items-center gap-1">
                    <Flame className="w-4 h-4" /> +{rewarded.exp} EXP
                  </span>
                  <span className="text-cyan-300 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> +{rewarded.gems} Gems
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="text-xs font-bold text-zinc-300">สรุปคู่ความรู้รอบนี้</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePairs.map((pair) => (
                  <div key={pair.id} className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/10 text-xs">
                    <div className="font-bold text-white">
                      {pair.left} ↔ <span className="text-emerald-300">{pair.right}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{pair.noteTh}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="min-h-[48px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
              >
                เปลี่ยนวิชา
              </button>
              <button
                type="button"
                onClick={startRound}
                className="min-h-[48px] rounded-2xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
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
