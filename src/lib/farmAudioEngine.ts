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

// Rustic Country Barn Progression in G Major (G - C - G - D7 - G)
// 32 eighth-note steps (~118 BPM, 254ms/step) with authentic country banjo rolls & blue-note slides
interface CountryStep {
  banjo?: number;
  slideFrom?: number;
  rollFreq?: number; // crisp 16th-note bluegrass pickup/roll inside the step
  bass?: number;
  chord?: [number, number, number]; // off-beat acoustic guitar "chick"
  fiddle?: number;
}

const G_CHORD: [number, number, number] = [196.0, 246.94, 293.66];
const C_CHORD: [number, number, number] = [261.63, 329.63, 392.0];
const D7_CHORD: [number, number, number] = [293.66, 369.99, 440.0];

const COUNTRY_BARN_SEQUENCE: CountryStep[] = [
  // Bar 1: G Major — Porch-picking banjo theme + G-D alternating bass
  { banjo: 392.0, bass: 98.0 }, // G2 bass + G4 banjo
  { banjo: 440.0, chord: G_CHORD }, // off-beat guitar chick
  { banjo: 493.88, slideFrom: 466.16, bass: 146.83 }, // Bb4 -> B4 country slide + D3 fifth
  { banjo: 587.33, rollFreq: 493.88, chord: G_CHORD }, // D5 -> B4 roll
  { banjo: 493.88, bass: 98.0 },
  { banjo: 392.0, chord: G_CHORD },
  { banjo: 329.63, bass: 146.83 }, // E4
  { banjo: 293.66, rollFreq: 392.0, chord: G_CHORD }, // D4 -> G4 pickup

  // Bar 2: C Major -> G Major — Bright country fiddle lift
  { banjo: 329.63, bass: 130.81, fiddle: 523.25 }, // C3 bass + C5 fiddle
  { banjo: 392.0, chord: C_CHORD },
  { banjo: 523.25, bass: 196.0 }, // G3 fifth
  { banjo: 659.25, rollFreq: 587.33, chord: C_CHORD }, // E5 -> D5 roll
  { banjo: 587.33, bass: 98.0, fiddle: 493.88 }, // back to G
  { banjo: 493.88, chord: G_CHORD },
  { banjo: 392.0, bass: 146.83 },
  { rollFreq: 440.0, chord: G_CHORD },

  // Bar 3: G Major walk-up -> A minor rustic bounce
  { banjo: 392.0, bass: 98.0 },
  { banjo: 493.88, chord: G_CHORD },
  { banjo: 587.33, bass: 146.83 },
  { banjo: 659.25, rollFreq: 587.33, chord: G_CHORD },
  { banjo: 493.88, slideFrom: 466.16, bass: 110.0 }, // Am bass + country slide
  { banjo: 440.0, chord: G_CHORD },
  { banjo: 392.0, bass: 164.81 },
  { banjo: 329.63, rollFreq: 392.0, chord: G_CHORD },

  // Bar 4: D7 Country Turnaround -> Home to G
  { banjo: 369.99, bass: 146.83, fiddle: 587.33 }, // F#4 over D3 + D5 fiddle
  { banjo: 440.0, chord: D7_CHORD },
  { banjo: 587.33, bass: 110.0 }, // A2 fifth
  { banjo: 523.25, rollFreq: 440.0, chord: D7_CHORD }, // C5 -> A4
  { banjo: 493.88, slideFrom: 466.16, bass: 98.0, fiddle: 392.0 }, // resolve G!
  { banjo: 440.0, chord: G_CHORD },
  { banjo: 392.0, bass: 146.83 },
  { rollFreq: 293.66, chord: G_CHORD },
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

  // Twangy plucked acoustic banjo / steel-string country pick with resonant lowpass sweep
  private playBanjoPluck(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    slideFromFreq?: number
  ) {
    const oscSaw = ctx.createOscillator();
    const oscTri = ctx.createOscillator();
    oscSaw.type = 'sawtooth';
    oscTri.type = 'triangle';

    if (slideFromFreq && slideFromFreq > 0) {
      oscSaw.frequency.setValueAtTime(slideFromFreq, startTime);
      oscSaw.frequency.exponentialRampToValueAtTime(freq, startTime + 0.048);
      oscTri.frequency.setValueAtTime(slideFromFreq, startTime);
      oscTri.frequency.exponentialRampToValueAtTime(freq, startTime + 0.048);
    } else {
      oscSaw.frequency.setValueAtTime(freq, startTime);
      oscTri.frequency.setValueAtTime(freq, startTime);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.8, startTime);
    filter.frequency.setValueAtTime(Math.min(4800, freq * 5.2), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.45), startTime + Math.min(0.16, duration));

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscSaw.connect(filter);
    oscTri.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscSaw.start(startTime);
    oscTri.start(startTime);
    oscSaw.stop(startTime + duration + 0.02);
    oscTri.stop(startTime + duration + 0.02);
  }

  // Warm plucked upright country bass (Root-Fifth boom)
  private playCountryBass(ctx: AudioContext, freq: number, startTime: number) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.02, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.035);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.05, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.23);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.25);
  }

  // Rustic acoustic guitar off-beat "chick" + soft washboard brush
  private playCountryChick(ctx: AudioContext, chord: [number, number, number], startTime: number) {
    this.playFilteredNoise(ctx, startTime, 0.055, 'bandpass', 2400, 1700, 0.016);
    chord.forEach((f, idx) => {
      this.playTone(ctx, f, startTime + idx * 0.008, 0.09, 'triangle', 0.009);
    });
  }

  // Cozy country fiddle sustained phrase note
  private playFiddleNote(ctx: AudioContext, freq: number, startTime: number, duration: number) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.014, startTime + 0.07);
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

    const stepMs = 250; // ~120 BPM rustic country boom-chick eighth-note pulse
    const tick = () => {
      if (!this.musicRunning || this.musicMuted) return;
      const audio = this.ensureContext();
      if (!audio || audio.state !== 'running') return;

      const idx = this.stepIndex % COUNTRY_BARN_SEQUENCE.length;
      const step = COUNTRY_BARN_SEQUENCE[idx];
      const now = audio.currentTime + 0.02;

      if (step.bass) {
        this.playCountryBass(audio, step.bass, now);
      }

      if (step.chord) {
        this.playCountryChick(audio, step.chord, now);
      }

      if (step.banjo) {
        this.playBanjoPluck(audio, step.banjo, now, 0.21, 0.024, step.slideFrom);
      }

      if (step.rollFreq) {
        // Syncopated 16th-note country banjo roll
        this.playBanjoPluck(audio, step.rollFreq, now + 0.125, 0.15, 0.018);
      }

      if (step.fiddle) {
        this.playFiddleNote(audio, step.fiddle, now, 0.44);
      }

      // Gentle country farm bird chirp at end of 4-bar turnaround
      if (idx === 31) {
        this.playTone(audio, 1680, now + 0.05, 0.055, 'sine', 0.006, 2120);
        this.playTone(audio, 1920, now + 0.12, 0.06, 'sine', 0.005, 2320);
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
