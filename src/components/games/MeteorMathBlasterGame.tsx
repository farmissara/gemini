import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Flame,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  Shield,
  Snowflake,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  generateMeteorChallenge,
  MeteorChallenge,
  MeteorDifficultyTier,
} from '../../data/arcadeGamesData';
import {
  playComboStreakSound,
  playErrorBuzzSound,
  playGrandVictoryFanfare,
  playLaserShotSound,
  playPowerupChimeSound,
} from '../../lib/labSoundEffects';

interface MeteorEntity {
  id: number;
  xRatio: number; // 0.16 .. 0.84
  y: number; // px
  speed: number; // px/s
  radius: number;
  hue: number;
  challenge: MeteorChallenge;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface LaserBeam {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface SolvedLogItem {
  prompt: string;
  answer: number;
  explanationTh: string;
  correct: boolean;
}

interface MeteorMathBlasterGameProps {
  userId: string;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onMissionProgress: (count: number) => void;
  onBack: () => void;
}

const TIERS: { id: MeteorDifficultyTier; label: string; sub: string }[] = [
  { id: 'primary_13', label: 'ป.1 – ป.3', sub: 'บวก ลบ คูณพื้นฐาน' },
  { id: 'primary_46', label: 'ป.4 – ป.6', sub: 'คูณ หาร ร้อยละ พื้นที่' },
  { id: 'middle_13', label: 'ม.1 – ม.3', sub: 'สมการ รากที่ 2 ยกกำลัง' },
  { id: 'high_46', label: 'ม.4 – ม.6', sub: 'ลำดับ log แคลคูลัส' },
  { id: 'science_formula', label: 'วิทย์-ฟิสิกส์', sub: 'F=ma · V=IR · Ek · v=fλ' },
];

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export const MeteorMathBlasterGame: React.FC<MeteorMathBlasterGameProps> = ({
  userId,
  onEarnRewards,
  onMissionProgress,
  onBack,
}) => {
  const [phase, setPhase] = useState<'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('TITLE_MENU');
  const [tier, setTier] = useState<MeteorDifficultyTier>('primary_46');
  const [muted, setMuted] = useState(false);

  const [score, setScore] = useState(0);
  const [shieldHp, setShieldHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitsCount, setHitsCount] = useState(0);
  const [wave, setWave] = useState(1);
  const [freezeCharge, setFreezeCharge] = useState(1);
  const [novaCharge, setNovaCharge] = useState(1);
  const [freezeTimer, setFreezeTimer] = useState(0);
  const [typedInput, setTypedInput] = useState('');
  const [activeTarget, setActiveTarget] = useState<MeteorEntity | null>(null);
  const [studyLog, setStudyLog] = useState<SolvedLogItem[]>([]);
  const [rewarded, setRewarded] = useState<{ exp: number; gems: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meteorsRef = useRef<MeteorEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const beamsRef = useRef<LaserBeam[]>([]);
  const floatsRef = useRef<FloatingText[]>([]);
  const starsRef = useRef<{ x: number; y: number; r: number; speed: number }[]>([]);
  const stateRef = useRef({
    phase: 'TITLE_MENU' as 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER',
    score: 0,
    shieldHp: 100,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    wave: 1,
    freezeSec: 0,
    spawnCooldown: 0.05,
    nextId: 1,
    tier: 'primary_46' as MeteorDifficultyTier,
    muted: false,
    studyLog: [] as SolvedLogItem[],
  });

  useEffect(() => {
    stateRef.current.tier = tier;
    stateRef.current.muted = muted;
  }, [tier, muted]);

  const syncTarget = useCallback(() => {
    const sorted = [...meteorsRef.current].sort((a, b) => b.y - a.y);
    setActiveTarget(sorted[0] || null);
  }, []);

  const spawnBurst = useCallback((x: number, y: number, color: string, count = 18) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 70 + Math.random() * 190;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.55,
        maxLife: 0.55,
        color,
        size: 2.5 + Math.random() * 3.5,
      });
    }
  }, []);

  const finishGame = useCallback(() => {
    stateRef.current.phase = 'GAME_OVER';
    setPhase('GAME_OVER');
    const finalHits = stateRef.current.hits;
    const exp = Math.min(260, 40 + finalHits * 16 + stateRef.current.maxCombo * 6);
    const gems = Math.min(45, 5 + Math.floor(finalHits * 1.5));
    setRewarded({ exp, gems });
    setStudyLog([...stateRef.current.studyLog]);
    onEarnRewards(userId, exp, gems, finalHits >= 5);
    if (finalHits > 0) {
      onMissionProgress(finalHits);
    }
    if (!stateRef.current.muted && finalHits >= 5) {
      playGrandVictoryFanfare();
    }
  }, [onEarnRewards, onMissionProgress, userId]);

  const startGame = () => {
    meteorsRef.current = [];
    particlesRef.current = [];
    beamsRef.current = [];
    floatsRef.current = [];

    // Immediately pre-spawn the first meteor so the player has an instant target on frame 1
    const firstChallenge = generateMeteorChallenge(tier, 1);
    const firstMeteor: MeteorEntity = {
      id: 1,
      xRatio: 0.5,
      y: 36,
      speed: 32,
      radius: 30,
      hue: 198,
      challenge: firstChallenge,
    };
    meteorsRef.current = [firstMeteor];

    stateRef.current = {
      phase: 'PLAYING',
      score: 0,
      shieldHp: 100,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      wave: 1,
      freezeSec: 0,
      spawnCooldown: 1.7,
      nextId: 2,
      tier,
      muted,
      studyLog: [],
    };
    setScore(0);
    setShieldHp(100);
    setCombo(0);
    setMaxCombo(0);
    setHitsCount(0);
    setWave(1);
    setFreezeCharge(1);
    setNovaCharge(1);
    setFreezeTimer(0);
    setTypedInput('');
    setRewarded(null);
    setStudyLog([]);
    setActiveTarget(firstMeteor);
    setPhase('PLAYING');
  };

  const fireAnswer = useCallback(
    (val: number) => {
      if (stateRef.current.phase !== 'PLAYING' || meteorsRef.current.length === 0) return;

      const canvas = canvasRef.current;
      const width = canvas?.width || 720;
      const height = canvas?.height || 380;

      const sorted = [...meteorsRef.current].sort((a, b) => b.y - a.y);
      const hitMeteor = sorted.find((m) => m.challenge.answer === val);

      if (hitMeteor) {
        const targetX = hitMeteor.xRatio * width;
        const targetY = hitMeteor.y;
        beamsRef.current.push({
          fromX: width / 2,
          fromY: height - 26,
          toX: targetX,
          toY: targetY,
          life: 0.24,
          color: '#22d3ee',
        });
        spawnBurst(targetX, targetY, `hsl(${hitMeteor.hue}, 90%, 62%)`, 22);

        meteorsRef.current = meteorsRef.current.filter((m) => m.id !== hitMeteor.id);
        const nextCombo = stateRef.current.combo + 1;
        stateRef.current.combo = nextCombo;
        stateRef.current.maxCombo = Math.max(stateRef.current.maxCombo, nextCombo);
        stateRef.current.hits += 1;
        const gained = 100 + Math.min(150, (nextCombo - 1) * 25) + (stateRef.current.wave - 1) * 15;
        stateRef.current.score += gained;
        stateRef.current.wave = 1 + Math.floor(stateRef.current.hits / 6);
        stateRef.current.studyLog.unshift({
          prompt: hitMeteor.challenge.prompt,
          answer: hitMeteor.challenge.answer,
          explanationTh: hitMeteor.challenge.explanationTh,
          correct: true,
        });

        // If player cleared the screen, spawn next meteor quickly so gameplay never stalls
        if (meteorsRef.current.length === 0) {
          stateRef.current.spawnCooldown = Math.min(stateRef.current.spawnCooldown, 0.25);
        }

        floatsRef.current.push({
          x: Math.max(64, Math.min(width - 64, targetX)),
          y: Math.max(28, targetY - 12),
          text: `+${gained}${nextCombo >= 3 ? ` · x${nextCombo}` : ''}`,
          color: '#fde047',
          life: 0.9,
        });

        if (!stateRef.current.muted) {
          playLaserShotSound();
          if (nextCombo >= 2) playComboStreakSound(nextCombo);
        }

        if (stateRef.current.hits % 10 === 0) {
          setFreezeCharge((c) => Math.min(2, c + 1));
        }

        setScore(stateRef.current.score);
        setCombo(nextCombo);
        setMaxCombo(stateRef.current.maxCombo);
        setHitsCount(stateRef.current.hits);
        setWave(stateRef.current.wave);
        setTypedInput('');
        syncTarget();
      } else {
        stateRef.current.combo = 0;
        setCombo(0);
        setTypedInput('');
        floatsRef.current.push({
          x: width / 2,
          y: height - 56,
          text: 'พลาด! คอมโบรีเซ็ต',
          color: '#fb7185',
          life: 0.75,
        });
        if (!stateRef.current.muted) {
          playErrorBuzzSound();
        }
      }
    },
    [spawnBurst, syncTarget]
  );

  const handleUseFreeze = () => {
    if (freezeCharge <= 0 || stateRef.current.phase !== 'PLAYING') return;
    setFreezeCharge((c) => c - 1);
    stateRef.current.freezeSec = 5.5;
    setFreezeTimer(5.5);
    if (!stateRef.current.muted) playPowerupChimeSound();
  };

  const handleUseNova = () => {
    if (novaCharge <= 0 || stateRef.current.phase !== 'PLAYING' || meteorsRef.current.length === 0) return;
    const canvas = canvasRef.current;
    const width = canvas?.width || 720;
    const height = canvas?.height || 380;
    setNovaCharge((c) => c - 1);

    const destroyed = [...meteorsRef.current];
    destroyed.forEach((m) => {
      beamsRef.current.push({
        fromX: width / 2,
        fromY: height - 26,
        toX: m.xRatio * width,
        toY: m.y,
        life: 0.3,
        color: '#f59e0b',
      });
      spawnBurst(m.xRatio * width, m.y, '#fbbf24', 16);
      stateRef.current.studyLog.unshift({
        prompt: m.challenge.prompt,
        answer: m.challenge.answer,
        explanationTh: m.challenge.explanationTh,
        correct: true,
      });
    });

    meteorsRef.current = [];
    stateRef.current.spawnCooldown = 0.35;
    stateRef.current.hits += destroyed.length;
    stateRef.current.score += destroyed.length * 120;
    setScore(stateRef.current.score);
    setHitsCount(stateRef.current.hits);
    syncTarget();
    if (!stateRef.current.muted) playPowerupChimeSound();
  };

  // Keyboard support for typing numeric answers + Enter
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setTypedInput((prev) => (prev.length < 6 ? prev + e.key : prev));
      } else if (e.key === '-') {
        setTypedInput((prev) => (prev === '' ? '-' : prev));
      } else if (e.key === 'Backspace') {
        setTypedInput((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && typedInput !== '' && typedInput !== '-') {
        const parsed = Number(typedInput);
        if (Number.isFinite(parsed)) {
          fireAnswer(parsed);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, typedInput, fireAnswer]);

  // Main Canvas Animation Loop — bound to active play phases so <canvas> is guaranteed mounted!
  useEffect(() => {
    if (phase !== 'PLAYING' && phase !== 'PAUSED') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 65 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.7 + Math.random() * 1.8,
        speed: 0.02 + Math.random() * 0.06,
      }));
    }

    let rafId = 0;
    let lastTime = performance.now();

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(300, Math.floor(parent.clientWidth));
      const h = Math.max(230, Math.floor(parent.clientHeight || 340));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resizeCanvas();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && canvas.parentElement
        ? new ResizeObserver(resizeCanvas)
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener('resize', resizeCanvas);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      resizeCanvas();

      const w = canvas.width;
      const h = canvas.height;
      const shieldY = h - 34;
      const st = stateRef.current;

      // 1. Update Simulation when PLAYING
      if (st.phase === 'PLAYING') {
        if (st.freezeSec > 0) {
          st.freezeSec = Math.max(0, st.freezeSec - dt);
          setFreezeTimer(Number(st.freezeSec.toFixed(1)));
        }

        st.spawnCooldown -= dt;
        const maxConcurrent = Math.min(4, 2 + Math.floor(st.wave / 2));
        if (st.spawnCooldown <= 0 && meteorsRef.current.length < maxConcurrent) {
          const challenge = generateMeteorChallenge(st.tier, st.wave);
          const baseSpeed = 28 + st.wave * 5.5 + Math.random() * 10;
          meteorsRef.current.push({
            id: st.nextId++,
            xRatio: 0.16 + Math.random() * 0.68,
            y: 20,
            speed: baseSpeed,
            radius: 28,
            hue: 192 + Math.floor(Math.random() * 135),
            challenge,
          });
          st.spawnCooldown = Math.max(1.3, 2.6 - st.wave * 0.14);
          syncTarget();
        }

        const speedScale = st.freezeSec > 0 ? 0.25 : 1;
        let shieldHit = false;
        const surviving: MeteorEntity[] = [];

        for (const m of meteorsRef.current) {
          m.y += m.speed * speedScale * dt;
          if (m.y + m.radius >= shieldY) {
            shieldHit = true;
            st.shieldHp = Math.max(0, st.shieldHp - 20);
            st.combo = 0;
            st.studyLog.unshift({
              prompt: m.challenge.prompt,
              answer: m.challenge.answer,
              explanationTh: m.challenge.explanationTh,
              correct: false,
            });
            spawnBurst(m.xRatio * w, shieldY, '#f43f5e', 18);
            floatsRef.current.push({
              x: Math.max(80, Math.min(w - 80, m.xRatio * w)),
              y: shieldY - 18,
              text: `-20 HP (ตอบ ${m.challenge.answer})`,
              color: '#fda4af',
              life: 1.2,
            });
          } else {
            surviving.push(m);
          }
        }

        if (shieldHit) {
          meteorsRef.current = surviving;
          setShieldHp(st.shieldHp);
          setCombo(0);
          syncTarget();
          if (!st.muted) playErrorBuzzSound();
          if (st.shieldHp <= 0) {
            finishGame();
          }
        }
      }

      // Update Particles, Beams, Floats, Stars
      starsRef.current.forEach((star) => {
        star.y = (star.y + star.speed * dt) % 1;
      });
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });
      beamsRef.current = beamsRef.current.filter((b) => {
        b.life -= dt;
        return b.life > 0;
      });
      floatsRef.current = floatsRef.current.filter((f) => {
        f.y -= 28 * dt;
        f.life -= dt;
        return f.life > 0;
      });

      // 2. Render Space Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#09090b');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle horizon grid lines for arcade depth
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < w; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, shieldY);
        ctx.stroke();
      }

      // Stars
      starsRef.current.forEach((star) => {
        ctx.fillStyle = st.freezeSec > 0 ? 'rgba(125, 211, 252, 0.78)' : 'rgba(226, 232, 240, 0.65)';
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Energy Shield Line
      ctx.strokeStyle = st.shieldHp > 40 ? '#22d3ee' : '#f43f5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, shieldY);
      ctx.lineTo(w, shieldY);
      ctx.stroke();

      // Turret Base
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(w / 2, shieldY - 15);
      ctx.lineTo(w / 2 - 18, shieldY + 12);
      ctx.lineTo(w / 2 + 18, shieldY + 12);
      ctx.closePath();
      ctx.fill();

      // Identify lowest target
      const lowestId = [...meteorsRef.current].sort((a, b) => b.y - a.y)[0]?.id;

      // Meteors
      for (const m of meteorsRef.current) {
        const cx = m.xRatio * w;
        const cy = m.y;
        const isLocked = m.id === lowestId;

        if (isLocked) {
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, m.radius + 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const orbGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, m.radius);
        orbGrad.addColorStop(0, `hsl(${m.hue}, 95%, 70%)`);
        orbGrad.addColorStop(1, `hsl(${m.hue}, 80%, 30%)`);
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, m.radius, 0, Math.PI * 2);
        ctx.fill();

        // Equation Label Box (safe across all browsers)
        const txt = m.challenge.prompt;
        ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
        const pillW = Math.max(96, ctx.measureText(txt).width + 22);
        const boxX = Math.max(6, Math.min(w - pillW - 6, cx - pillW / 2));
        ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
        ctx.strokeStyle = isLocked ? '#fde047' : 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = isLocked ? 2 : 1.5;
        drawRoundedBox(ctx, boxX, cy - 14, pillW, 28, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, boxX + pillW / 2, cy);
      }

      // Laser Beams
      for (const b of beamsRef.current) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = Math.max(1.5, 4.5 * (b.life / 0.25));
        ctx.beginPath();
        ctx.moveTo(b.fromX, b.fromY);
        ctx.lineTo(b.toX, b.toY);
        ctx.stroke();
      }

      // Explosion Particles
      for (const p of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floating Score Text
      for (const f of floatsRef.current) {
        ctx.font = 'bold 13px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [phase, finishGame, spawnBurst, syncTarget]);

  const togglePause = () => {
    if (phase === 'PLAYING') {
      stateRef.current.phase = 'PAUSED';
      setPhase('PAUSED');
    } else if (phase === 'PAUSED') {
      stateRef.current.phase = 'PLAYING';
      setPhase('PLAYING');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#09090B] text-white overflow-hidden select-none">
      {/* Minimal Single-Row Top HUD */}
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
            <Rocket className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-sm font-extrabold tracking-tight text-white truncate">
              Meteor Blaster
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
          {(phase === 'PLAYING' || phase === 'PAUSED') && (
            <>
              <div className="flex items-center gap-1.5 font-bold tabular-nums">
                <Shield className={`w-3.5 h-3.5 ${shieldHp > 40 ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className={shieldHp > 40 ? 'text-emerald-300' : 'text-rose-300'}>{shieldHp}</span>
              </div>
              <div className="h-3.5 w-px bg-white/15" />
              <div className="font-extrabold text-amber-300 tabular-nums">
                {score.toLocaleString()}
              </div>
              {combo >= 2 && (
                <span className="font-black text-cyan-300 tabular-nums">x{combo}</span>
              )}
              <button
                type="button"
                onClick={togglePause}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 flex items-center justify-center cursor-pointer"
                aria-label={phase === 'PAUSED' ? 'เล่นต่อ' : 'พักเกม'}
              >
                {phase === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 flex items-center justify-center cursor-pointer"
            aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
          </button>
        </div>
      </header>

      {/* Main Play Stage */}
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 gap-3 overflow-y-auto">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-xl mx-auto w-full my-auto rounded-3xl bg-zinc-900/90 border border-white/10 p-5 sm:p-7 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center mx-auto">
                <Rocket className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                ยิงอุกกาบาตสมการ
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                เลือกคำตอบให้ตรงกับอุกกาบาตที่ล็อกเป้าก่อนพุ่งชนเกราะป้องกัน
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-bold text-zinc-300">เลือกระดับความยาก</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIERS.map((t) => {
                  const active = tier === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTier(t.id)}
                      className={`min-h-[58px] p-3 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-400 text-white'
                          : 'bg-zinc-950/70 border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-extrabold">{t.label}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{t.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="w-full min-h-[52px] rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-black text-base flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>เริ่มยิงเลย</span>
            </button>
          </div>
        )}

        {(phase === 'PLAYING' || phase === 'PAUSED') && (
          <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-4xl w-full mx-auto">
            {/* Live Canvas Viewport */}
            <div className="relative flex-1 min-h-[240px] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
              <canvas ref={canvasRef} className="w-full h-full block" />
              <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-bold text-zinc-300 pointer-events-none tabular-nums">
                <span>Wave {wave}</span>
                {freezeTimer > 0 && (
                  <span className="text-sky-300 flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5" /> {freezeTimer}s
                  </span>
                )}
              </div>
              {phase === 'PAUSED' && (
                <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-4">
                  <div className="text-lg font-black text-white">พักเกมชั่วคราว</div>
                  <button
                    type="button"
                    onClick={togglePause}
                    className="min-h-[48px] px-7 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 text-sm font-black flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>เล่นต่อ</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Weapon Control Deck */}
            <div className="shrink-0 p-3 sm:p-4 rounded-2xl bg-zinc-900/95 border border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-400 shrink-0">เป้าล็อก:</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 truncate tabular-nums">
                    {activeTarget ? activeTarget.challenge.prompt : 'กำลังมา...'}
                  </span>
                  {typedInput && (
                    <span className="text-cyan-300 font-mono font-bold shrink-0">
                      [{typedInput}↵]
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={freezeCharge <= 0}
                    onClick={handleUseFreeze}
                    className="min-h-[38px] px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 disabled:opacity-35 text-sky-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>{freezeCharge}</span>
                  </button>
                  <button
                    type="button"
                    disabled={novaCharge <= 0}
                    onClick={handleUseNova}
                    className="min-h-[38px] px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 disabled:opacity-35 text-amber-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{novaCharge}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(activeTarget ? activeTarget.challenge.choices : [0, 0, 0, 0]).map((choice, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!activeTarget || phase !== 'PLAYING'}
                    onClick={() => fireAnswer(choice)}
                    className="min-h-[54px] rounded-2xl bg-zinc-800 hover:bg-cyan-400 hover:text-zinc-950 border border-white/10 hover:border-cyan-300 disabled:opacity-35 text-white font-black text-lg tabular-nums transition active:scale-95 cursor-pointer"
                  >
                    {activeTarget ? choice : '—'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-xl mx-auto w-full my-auto rounded-3xl bg-zinc-900 border border-white/10 p-5 sm:p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <p className="text-xs font-bold text-cyan-400">จบภารกิจป้องกันฐาน</p>
              <h3 className="text-2xl font-black text-white tabular-nums">
                {score.toLocaleString()} คะแนน
              </h3>
              <p className="text-xs text-zinc-400 tabular-nums">
                ยิงแม่น {hitsCount} ลูก · คอมโบสูงสุด x{maxCombo}
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

            {studyLog.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>ทบทวนโจทย์รอบนี้</span>
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {studyLog.slice(0, 8).map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                        item.correct
                          ? 'bg-emerald-950/35 border-emerald-500/25 text-emerald-100'
                          : 'bg-rose-950/35 border-rose-500/25 text-rose-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold">{item.prompt}</span>{' '}
                        <span className="text-amber-300 font-bold">= {item.answer}</span>
                        <div className="text-[11px] text-zinc-300 mt-0.5">{item.explanationTh}</div>
                      </div>
                      <span className="text-[11px] font-bold shrink-0">
                        {item.correct ? 'ถูก' : 'พลาด'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onBack}
                className="min-h-[48px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
              >
                กลับศูนย์เกม
              </button>
              <button
                type="button"
                onClick={startGame}
                className="min-h-[48px] rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เล่นอีกครั้ง</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
