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

  // Shared stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rewarded, setRewarded] = useState<{ exp: number; gems: number } | null>(null);

  // Lightning Link State
  const [activePairs, setActivePairs] = useState<MatchPairItem[]>([]);
  const [rightShuffled, setRightShuffled] = useState<MatchPairItem[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [latestNote, setLatestNote] = useState<string | null>(null);

  // Memory Flip State
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
      setLatestNote(`${rightItem.left} ↔ ${rightItem.right} : ${rightItem.noteTh}`);
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
            setLatestNote(`${pairInfo.left} ↔ ${pairInfo.right} : ${pairInfo.noteTh}`);
          }
          playComboStreakSound(nextCombo);
          if (updated.every((c) => c.matched)) {
            completeRound(nextScore, mistakes);
          }
        }, 320);
      } else {
        window.setTimeout(() => {
          setFlippedUids([]);
          setLockFlip(false);
          setCombo(0);
          setMistakes((m) => m + 1);
          playErrorBuzzSound();
        }, 720);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white rounded-2xl border border-slate-800 overflow-hidden">
      {/* HUD Header */}
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
          <span className="text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
            <Grid2x2 className="w-4 h-4" />
            <span>8-Strand Match & Memory</span>
          </span>
        </div>

        {phase === 'PLAYING' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-amber-300 tabular-nums">
              {score.toLocaleString()} pts
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-slate-200 tabular-nums">
              {elapsedSec}s
            </span>
            {combo >= 2 && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black tabular-nums">
                COMBO x{combo}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-black text-white">จับคู่คำศัพท์ สูตร และแนวคิด 8 กลุ่มสาระฯ</h2>
              <p className="text-xs text-slate-300">
                เลือกโหมดการเล่น (จับคู่สายฟ้า หรือ เปิดป้ายความจำ) และเลือกหมวดหมู่ที่อยากฝึกจากครบทั้ง 8 สาระการเรียนรู้
              </p>
            </div>

            {/* Game Variant Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameVariant('lightning_link')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  gameVariant === 'lightning_link'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Lightning Pair Link (จับคู่สายฟ้า)</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  แตะคำถามด้านซ้ายแล้วจับคู่ความหมายด้านขวาให้ไวที่สุดเพื่อทำคอมโบ
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGameVariant('memory_flip')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  gameVariant === 'memory_flip'
                    ? 'bg-indigo-500/20 border-indigo-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <Grid2x2 className="w-4 h-4 text-cyan-300" />
                  <span>Memory Flip 12 Cards (เปิดป้ายความจำ)</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  พลิกแผ่นป้ายจำตำแหน่งแล้วจับคู่แนวคิดที่ตรงกันให้ครบทุกใบ
                </div>
              </button>
            </div>

            {/* 8-Strand Selector */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">เลือกกลุ่มสาระวิชา (ครบทั้ง 8 สาระ):</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LEARNING_STRANDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStrand(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedStrand === s.id
                        ? 'bg-emerald-600/25 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-[11px] font-mono text-emerald-300 font-bold">สาระ {s.code}</div>
                    <div className="text-xs font-bold mt-0.5 line-clamp-1">{s.nameTh}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-bold text-white">{activeDeck.titleTh}</div>
                <div className="text-slate-300">{activeDeck.subtitleTh}</div>
              </div>
              <button
                type="button"
                onClick={startRound}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>เริ่มเล่นเลย</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'PLAYING' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold text-white">{activeDeck.titleTh}</span>
              <span>
                จับคู่แล้ว:{' '}
                <strong className="text-emerald-300 tabular-nums">
                  {gameVariant === 'lightning_link'
                    ? matchedIds.size
                    : memoryCards.filter((c) => c.matched).length / 2}
                  /{activePairs.length}
                </strong>{' '}
                · พลาด {mistakes} ครั้ง
              </span>
            </div>

            {latestNote && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-xs text-emerald-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{latestNote}</span>
              </div>
            )}

            {gameVariant === 'lightning_link' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-cyan-300 uppercase">1. เลือกหัวข้อ / คำศัพท์</div>
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
                        className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                          isMatched
                            ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300 opacity-60'
                            : isSelected
                            ? 'bg-cyan-600 border-cyan-300 text-white shadow-md'
                            : 'bg-slate-900 border-slate-700 hover:border-cyan-400 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{pair.left}</span>
                          {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 uppercase">2. จับคู่ความหมายที่ตรงกัน</div>
                  {rightShuffled.map((pair) => {
                    const isMatched = matchedIds.has(pair.id);
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        disabled={isMatched || !selectedLeftId}
                        onClick={() => handleRightTap(pair)}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                          isMatched
                            ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300 opacity-60'
                            : selectedLeftId
                            ? 'bg-slate-900 border-amber-500/40 hover:bg-amber-600 hover:border-amber-300 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {pair.right}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {memoryCards.map((card, index) => {
                  const isFlipped = card.matched || flippedUids.includes(card.uid);
                  return (
                    <button
                      key={card.uid}
                      type="button"
                      disabled={card.matched}
                      onClick={() => handleFlipCard(card)}
                      className={`min-h-[96px] p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        card.matched
                          ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                          : isFlipped
                          ? 'bg-indigo-700 border-cyan-300 text-white shadow-lg'
                          : 'bg-slate-900 border-slate-700 hover:border-indigo-400 text-slate-300'
                      }`}
                    >
                      {isFlipped ? (
                        <span className="text-xs font-bold leading-snug">{card.text}</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-base font-black text-indigo-300">#{index + 1}</div>
                          <div className="text-[10px] text-slate-400">แตะเพื่อเปิด</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">จับคู่ครบสมบูรณ์! ({score.toLocaleString()} แต้ม)</h3>
                  <p className="text-xs text-slate-300">
                    ใช้เวลา {elapsedSec} วินาที · พลาด {mistakes} ครั้ง
                  </p>
                </div>
              </div>
              {rewarded && (
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> +{rewarded.exp} EXP
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> +{rewarded.gems} Gems
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-emerald-300">คลังความรู้ที่ทบทวนได้จากรอบนี้:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePairs.map((pair) => (
                  <div key={pair.id} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                    <div className="font-bold text-white">
                      {pair.left} ↔ <span className="text-emerald-300">{pair.right}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{pair.noteTh}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                เปลี่ยนสาระวิชา
              </button>
              <button
                type="button"
                onClick={startRound}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
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
