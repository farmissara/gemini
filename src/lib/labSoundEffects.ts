// Web Audio API Synthesized Sound Effects for Lab Simulation
// 100% self-contained, no external mp3 files required, works offline.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Pouring Liquid Sound Effect
export function playPourSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  
  // White noise with bandpass filter
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
  filter.Q.value = 3.0;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.4);
}

// 2. Bubbling / Reaction Fizz Sound Effect
export function playBubbleSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = now + i * 0.08 + Math.random() * 0.03;

    osc.type = 'sine';
    const startFreq = 400 + Math.random() * 300;
    osc.frequency.setValueAtTime(startFreq, delay);
    osc.frequency.exponentialRampToValueAtTime(startFreq + 600, delay + 0.08);

    gain.gain.setValueAtTime(0.15, delay);
    gain.gain.exponentialRampToValueAtTime(0.001, delay + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(delay);
    osc.stop(delay + 0.09);
  }
}

// 3. COMIC LAB EXPLOSION SOUND EFFECT ("💥 BOOM!")
export function playBoomExplosionSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Layer A: Low Sub-bass Thump
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);

  oscGain.gain.setValueAtTime(0.7, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.7);

  // Layer B: Explosive White Noise Blast
  const bufferSize = ctx.sampleRate * 0.8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + 0.8);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.8);
}

// 4. Celebratory Success Chime Sound (Fanfare)
export function playSuccessChimeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Major triad chord: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
  const notes = [523.25, 659.25, 783.99, 1046.50];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.08;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.55);
  });
}

// 5. Short Circuit / Spark Sound Effect
export function playSparkSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = now + i * 0.06;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200 + Math.random() * 800, delay);
    osc.frequency.setValueAtTime(200, delay + 0.04);

    gain.gain.setValueAtTime(0.25, delay);
    gain.gain.exponentialRampToValueAtTime(0.01, delay + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(delay);
    osc.stop(delay + 0.05);
  }
}

// Aliases for compatibility
export const playExplosionSound = playBoomExplosionSound;
export const playSuccessSound = playSuccessChimeSound;
