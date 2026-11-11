import React, { useEffect, useRef, useState } from 'react';
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
  xRatio: number; // 0.14 .. 0.86
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
  { id: 'high_46', label: 'ม.4 – ม.6', sub: 'ลำดับ log แคลคูลัส !' },
  { id: 'science_formula', label: 'วิทย์-ฟิสิกส์', sub: 'F=ma · V=IR · Ek · v=fλ' },
];

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
    spawnCooldown: 0.4,
    nextId: 1,
    tier: 'primary_46' as MeteorDifficultyTier,
    muted: false,
    studyLog: [] as SolvedLogItem[],
  });

  useEffect(() => {
    stateRef.current.tier = tier;
    stateRef.current.muted = muted;
  }, [tier, muted]);

  const syncTarget = () => {
    const sorted = [...meteorsRef.current].sort((a, b) => b.y - a.y);
    setActiveTarget(sorted[0] || null);
  };

  const spawnBurst = (x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 60 + Math.random() * 170;
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
  };

  const finishGame = () => {
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
  };

  const startGame = () => {
    meteorsRef.current = [];
    particlesRef.current = [];
    beamsRef.current = [];
    floatsRef.current = [];
    stateRef.current = {
      phase: 'PLAYING',
      score: 0,
      shieldHp: 100,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      wave: 1,
      freezeSec: 0,
      spawnCooldown: 0.2,
      nextId: 1,
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
    setActiveTarget(null);
    setPhase('PLAYING');
  };

  const fireAnswer = (val: number) => {
    if (stateRef.current.phase !== 'PLAYING' || meteorsRef.current.length === 0) return;

    const canvas = canvasRef.current;
    const width = canvas?.width || 720;
    const height = canvas?.height || 380;

    // Look for lowest meteor matching val first
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
        life: 0.22,
        color: '#22d3ee',
      });
      spawnBurst(targetX, targetY, `hsl(${hitMeteor.hue}, 90%, 62%)`, 20);

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

      floatsRef.current.push({
        x: targetX,
        y: targetY - 12,
        text: `+${gained}${nextCombo >= 3 ? ` (x${nextCombo}!)` : ''}`,
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
        text: 'ยิงพลาด! คอมโบรีเซ็ต',
        color: '#fb7185',
        life: 0.75,
      });
      if (!stateRef.current.muted) {
        playErrorBuzzSound();
      }
    }
  };

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
      spawnBurst(m.xRatio * width, m.y, '#fbbf24', 14);
      stateRef.current.studyLog.unshift({
        prompt: m.challenge.prompt,
        answer: m.challenge.answer,
        explanationTh: m.challenge.explanationTh,
        correct: true,
      });
    });

    meteorsRef.current = [];
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
  }, [phase, typedInput]);

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 55 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.8 + Math.random() * 1.8,
        speed: 0.02 + Math.random() * 0.06,
      }));
    }

    let rafId = 0;
    let lastTime = performance.now();

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(320, parent.clientWidth);
      const h = Math.max(260, Math.min(390, parent.clientHeight || 360));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      resizeCanvas();

      const w = canvas.width;
      const h = canvas.height;
      const shieldY = h - 38;
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
          const baseSpeed = 30 + st.wave * 6 + Math.random() * 12;
          meteorsRef.current.push({
            id: st.nextId++,
            xRatio: 0.14 + Math.random() * 0.72,
            y: -26,
            speed: baseSpeed,
            radius: 30,
            hue: 195 + Math.floor(Math.random() * 140),
            challenge,
          });
          st.spawnCooldown = Math.max(1.25, 2.7 - st.wave * 0.16);
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
              x: m.xRatio * w,
              y: shieldY - 16,
              text: `เกราะโดนชน -20 HP (ตอบ ${m.challenge.answer})`,
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
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      starsRef.current.forEach((star) => {
        ctx.fillStyle = st.freezeSec > 0 ? 'rgba(125, 211, 252, 0.7)' : 'rgba(226, 232, 240, 0.65)';
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
      ctx.moveTo(w / 2, shieldY - 14);
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

        // Equation Pill above/center of meteor
        const txt = m.challenge.prompt;
        ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
        const pillW = Math.max(92, ctx.measureText(txt).width + 20);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
        ctx.strokeStyle = isLocked ? '#fde047' : 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - pillW / 2, cy - 13, pillW, 26, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, cx, cy);
      }

      // Laser Beams
      for (const b of beamsRef.current) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 4 * (b.life / 0.25);
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
        ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

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
    <div className="h-full flex flex-col bg-slate-950 text-white rounded-2xl border border-slate-800 overflow-hidden">
      {/* Compact Top Arcade HUD */}
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
          <span className="text-sm font-extrabold text-cyan-300 flex items-center gap-1.5">
            <Rocket className="w-4 h-4" />
            <span>Meteor Equation Blaster</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold tabular-nums">
            HP: <span className={shieldHp > 40 ? 'text-emerald-400' : 'text-rose-400'}>{shieldHp}/100</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-amber-300 tabular-nums">
            Wave {wave} · {score.toLocaleString()} pts
          </div>
          {combo >= 2 && (
            <div className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black tabular-nums">
              COMBO x{combo}
            </div>
          )}
          {phase === 'PLAYING' || phase === 'PAUSED' ? (
            <button
              type="button"
              onClick={togglePause}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="พักเกม"
            >
              {phase === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 min-h-0 flex flex-col justify-between p-3 sm:p-4 gap-3 overflow-y-auto">
        {phase === 'TITLE_MENU' && (
          <div className="max-w-2xl mx-auto w-full my-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center mx-auto">
              <Rocket className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">ยิงอุกกาบาตสมการปกป้องโรงเรียน</h2>
              <p className="text-xs text-slate-300">
                อุกกาบาตโจทย์คณิต-ฟิสิกส์กำลังพุ่งลงมา! กดยิงคำตอบจากปุ่มเลเซอร์ด้านล่าง หรือพิมพ์ตัวเลขแล้วกด Enter ก่อนถึงโล่พลังงาน
              </p>
            </div>

            <div className="space-y-2 text-left">
              <div className="text-xs font-bold text-slate-200">เลือกระดับความท้าทาย:</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      tier === t.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{t.label}</div>
                    <div className="text-[10px] text-slate-300 mt-0.5">{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>เริ่มภารกิจยิงอุกกาบาต</span>
            </button>
          </div>
        )}

        {(phase === 'PLAYING' || phase === 'PAUSED') && (
          <>
            <div className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <canvas ref={canvasRef} className="w-full h-full block" />
              {freezeTimer > 0 && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-sky-600/90 text-white text-xs font-bold flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5" />
                  <span className="tabular-nums">Freeze Active: {freezeTimer}s</span>
                </div>
              )}
              {phase === 'PAUSED' && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                  <div className="text-lg font-extrabold text-white">พักการยิงชั่วคราว</div>
                  <button
                    type="button"
                    onClick={togglePause}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>เล่นต่อ</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Weapon Target Bar */}
            <div className="shrink-0 p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">เป้าหมายล็อกอัตโนมัติ:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-amber-400/50 text-amber-300 font-extrabold">
                    {activeTarget ? activeTarget.challenge.prompt : 'รออุกกาบาต...'}
                  </span>
                  {typedInput && (
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-400 text-cyan-200 font-mono font-bold">
                      พิมพ์: {typedInput} ↵
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={freezeCharge <= 0}
                    onClick={handleUseFreeze}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>แช่แข็ง ({freezeCharge})</span>
                  </button>
                  <button
                    type="button"
                    disabled={novaCharge <= 0}
                    onClick={handleUseNova}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Nova ล้างจอ ({novaCharge})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(activeTarget ? activeTarget.challenge.choices : [0, 0, 0, 0]).map((choice, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!activeTarget || phase !== 'PLAYING'}
                    onClick={() => fireAnswer(choice)}
                    className="py-3 rounded-xl bg-slate-800 hover:bg-cyan-600 border border-slate-600 hover:border-cyan-300 disabled:opacity-40 text-white font-black text-base tabular-nums transition active:scale-95 cursor-pointer"
                  >
                    {activeTarget ? choice : '—'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {phase === 'GAME_OVER' && (
          <div className="max-w-2xl mx-auto w-full rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs font-bold text-cyan-300">จบภารกิจป้องกันฐาน</div>
                <h3 className="text-xl font-black text-white">
                  คะแนนรวม {score.toLocaleString()} แต้ม · ยิงแม่น {hitsCount} ลูก
                </h3>
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

            {studyLog.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>สรุปวิธีคิดสมการรอบนี้ (ทบทวนความรู้)</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {studyLog.slice(0, 8).map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                        item.correct
                          ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-100'
                          : 'bg-rose-950/40 border-rose-700/40 text-rose-100'
                      }`}
                    >
                      <div>
                        <span className="font-bold">{item.prompt}</span>{' '}
                        <span className="text-amber-300 font-bold">→ ตอบ {item.answer}</span>
                        <div className="text-[11px] opacity-85 mt-0.5">{item.explanationTh}</div>
                      </div>
                      <span className="text-[10px] font-bold shrink-0">
                        {item.correct ? 'ยิงถูก' : 'พลาด'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                กลับ Arcade Hub
              </button>
              <button
                type="button"
                onClick={startGame}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เล่นอีกครั้ง</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
