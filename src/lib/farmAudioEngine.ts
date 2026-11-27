export type FarmSfxType =
  | 'tap'
  | 'open'
  | 'close'
  | 'till'
  | 'plant'
  | 'water'
  | 'fertilize'
  | 'golden'
  | 'harvest'
  | 'coin'
  | 'gem'
  | 'build'
  | 'weed'
  | 'truck'
  | 'levelUp'
  | 'chicken'
  | 'cow'
  | 'sheep'
  | 'duck'
  | 'wheelTick'
  | 'gift';

// Cheerful G-major acoustic country-farm melody (frequencies in Hz, null = rest)
// 16th-note / 8th-note steps at ~112 BPM (268ms per 8th note)
const MELODY_NOTES: Array<number | null> = [
  392.0, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88,
  523.25, 659.25, 783.99, 659.25, 587.33, null, 493.88, 392.0,
  440.0, 523.25, 659.25, 587.33, 523.25, 493.88, 440.0, 392.0,
  329.63, 392.0, 493.88, 587.33, 659.25, 587.33, 493.88, null,
];

const BASS_NOTES: Array<number | null> = [
  196.0, null, 146.83, null, 196.0, null, 146.83, null, // G - D
  130.81, null, 196.0, null, 196.0, null, 146.83, null, // C - G
  220.0, null, 164.81, null, 146.83, null, 196.0, null, // Am - D - G
  164.81, null, 196.0, null, 146.83, null, 196.0, null, // Em - D - G
];

class FarmAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxMuted = false;
  private musicMuted = false;
  private musicRunning = false;
  private stepIndex = 0;
  private timerId: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
      this.noiseBuffer = null;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const len = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    endFreq?: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.015, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playFilteredNoise(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    peakGain: number
  ) {
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freqStart, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  public unlockAndStartMusic(sfxMuted: boolean, musicMuted: boolean) {
    this.sfxMuted = sfxMuted;
    this.musicMuted = musicMuted;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.musicMuted && !this.musicRunning) {
      this.startMusicLoop();
    }
  }

  public setMutedState(sfxMuted: boolean, musicMuted: boolean) {
    this.sfxMuted = sfxMuted;
    this.musicMuted = musicMuted;
    if (musicMuted) {
      this.stopMusic();
    } else {
      const ctx = this.ensureContext();
      if (ctx && !this.musicRunning) {
        this.startMusicLoop();
      }
    }
  }

  public startMusicLoop() {
    if (typeof window === 'undefined' || this.musicMuted || this.musicRunning) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.musicRunning = true;

    const stepMs = 265;
    const tick = () => {
      if (!this.musicRunning || this.musicMuted) return;
      const audio = this.ensureContext();
      if (!audio || audio.state !== 'running') return;

      const idx = this.stepIndex % MELODY_NOTES.length;
      const now = audio.currentTime + 0.02;
      const mel = MELODY_NOTES[idx];
      const bass = BASS_NOTES[idx];

      // Acoustic plucked banjo/guitar melody
      if (mel) {
        this.playTone(audio, mel, now, 0.22, 'triangle', 0.032);
        this.playTone(audio, mel * 2, now, 0.09, 'sine', 0.009);
      }

      // Warm upright bass bounce
      if (bass) {
        this.playTone(audio, bass, now, 0.28, 'sine', 0.035);
      }

      // Soft chord strum on beat 0 & 4 of each bar
      if (idx % 4 === 0) {
        const root = idx < 8 ? 392 : idx < 16 ? 329.63 : idx < 24 ? 349.23 : 392;
        this.playTone(audio, root, now, 0.24, 'sine', 0.011);
      }

      // Gentle country bird chirp accent occasionally
      if (idx === 15 || idx === 31) {
        this.playTone(audio, 1760, now + 0.04, 0.06, 'sine', 0.008, 2240);
        this.playTone(audio, 1980, now + 0.12, 0.07, 'sine', 0.007, 2420);
      }

      this.stepIndex += 1;
    };

    tick();
    this.timerId = window.setInterval(tick, stepMs);
  }

  public stopMusic() {
    this.musicRunning = false;
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public playSfx(type: FarmSfxType) {
    if (this.sfxMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      switch (type) {
        case 'tap':
          this.playTone(ctx, 540, now, 0.06, 'triangle', 0.05, 680);
          break;
        case 'open':
          this.playTone(ctx, 420, now, 0.08, 'triangle', 0.055, 640);
          this.playTone(ctx, 640, now + 0.05, 0.09, 'sine', 0.045, 780);
          break;
        case 'close':
          this.playTone(ctx, 520, now, 0.08, 'triangle', 0.045, 340);
          break;
        case 'till':
          this.playFilteredNoise(ctx, now, 0.13, 'lowpass', 650, 180, 0.09);
          this.playTone(ctx, 180, now, 0.11, 'triangle', 0.07, 95);
          break;
        case 'plant':
          this.playTone(ctx, 392, now, 0.07, 'sine', 0.06, 520);
          this.playTone(ctx, 523, now + 0.06, 0.08, 'sine', 0.06, 659);
          this.playTone(ctx, 659, now + 0.12, 0.09, 'sine', 0.05, 784);
          break;
        case 'water':
          this.playFilteredNoise(ctx, now, 0.24, 'bandpass', 900, 1800, 0.07);
          this.playTone(ctx, 480, now + 0.03, 0.1, 'sine', 0.05, 860);
          this.playTone(ctx, 620, now + 0.11, 0.11, 'sine', 0.05, 1080);
          break;
        case 'fertilize':
          this.playTone(ctx, 523, now, 0.09, 'triangle', 0.06);
          this.playTone(ctx, 659, now + 0.06, 0.09, 'triangle', 0.06);
          this.playTone(ctx, 784, now + 0.12, 0.12, 'sine', 0.06);
          break;
        case 'golden':
          [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => {
            this.playTone(ctx, f, now + i * 0.045, 0.2, 'sine', 0.055);
          });
          break;
        case 'harvest':
          this.playFilteredNoise(ctx, now, 0.09, 'highpass', 1800, 3200, 0.05);
          this.playTone(ctx, 587.33, now + 0.02, 0.09, 'triangle', 0.07);
          this.playTone(ctx, 783.99, now + 0.08, 0.11, 'triangle', 0.07);
          this.playTone(ctx, 987.77, now + 0.14, 0.14, 'sine', 0.06);
          break;
        case 'coin':
          this.playTone(ctx, 1318.5, now, 0.12, 'sine', 0.07);
          this.playTone(ctx, 1760, now + 0.06, 0.24, 'sine', 0.075);
          this.playTone(ctx, 2637, now + 0.06, 0.18, 'sine', 0.025);
          break;
        case 'gem':
          [987.77, 1318.5, 1567.98, 1975.5].forEach((f, i) => {
            this.playTone(ctx, f, now + i * 0.04, 0.22, 'sine', 0.05);
          });
          break;
        case 'build':
          this.playTone(ctx, 220, now, 0.06, 'square', 0.04, 140);
          this.playTone(ctx, 260, now + 0.09, 0.06, 'square', 0.04, 160);
          this.playTone(ctx, 523.25, now + 0.17, 0.12, 'triangle', 0.065);
          this.playTone(ctx, 783.99, now + 0.25, 0.18, 'triangle', 0.07);
          break;
        case 'weed':
          this.playFilteredNoise(ctx, now, 0.12, 'bandpass', 1400, 500, 0.07);
          this.playTone(ctx, 440, now + 0.06, 0.1, 'sine', 0.05, 660);
          break;
        case 'truck':
          // Playful delivery truck horn beep-beep + engine purr
          this.playTone(ctx, 110, now, 0.35, 'sawtooth', 0.028, 145);
          this.playTone(ctx, 493.88, now + 0.08, 0.1, 'triangle', 0.07);
          this.playTone(ctx, 587.33, now + 0.21, 0.16, 'triangle', 0.075);
          break;
        case 'levelUp':
        case 'gift':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            this.playTone(ctx, f, now + i * 0.075, 0.28, 'triangle', 0.07);
          });
          break;
        case 'chicken':
          this.playTone(ctx, 880, now, 0.06, 'triangle', 0.05, 1180);
          this.playTone(ctx, 920, now + 0.08, 0.06, 'triangle', 0.05, 1240);
          this.playTone(ctx, 820, now + 0.16, 0.09, 'triangle', 0.045, 620);
          break;
        case 'cow':
          this.playTone(ctx, 155, now, 0.38, 'sawtooth', 0.04, 125);
          this.playTone(ctx, 310, now, 0.38, 'triangle', 0.025, 250);
          break;
        case 'sheep':
          for (let i = 0; i < 4; i += 1) {
            this.playTone(ctx, i % 2 === 0 ? 440 : 415, now + i * 0.065, 0.06, 'triangle', 0.045);
          }
          break;
        case 'duck':
          this.playTone(ctx, 640, now, 0.08, 'sawtooth', 0.04, 480);
          this.playTone(ctx, 620, now + 0.11, 0.09, 'sawtooth', 0.04, 460);
          break;
        case 'wheelTick':
          this.playTone(ctx, 960, now, 0.035, 'triangle', 0.055, 720);
          break;
      }
    } catch {
      // Ignore autoplay errors gracefully
    }
  }
}

export const farmAudio = new FarmAudioEngine();
