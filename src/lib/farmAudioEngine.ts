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

// Joyful Celebratory Harvest Festival Progression in Bright G Major
// 64 eighth-note steps (8 bars of 4/4 at ~136 BPM, 220ms/step)
// Features 8+ layered instruments: Banjo, Upright Bass, Strummed Acoustic Guitar,
// Country Fiddle Double-Stops, Sparkling Marimba/Bells, Reedy Accordion/Harmonica,
// Tin-Whistle Trills, Kick Drum, Tambourine Shakes, and Woodblock/Clap accents.
interface FestivalStep {
  banjo?: number;
  slideFrom?: number;
  rollFreq?: number; // crisp 16th-note bluegrass pickup/roll inside the step
  bass?: number;
  chord?: [number, number, number]; // bright strummed acoustic guitar chord
  fiddle?: number;
  fiddleHarmony?: number; // celebratory 3rd/5th double-stop harmony
  marimba?: number; // bright wooden bell / xylophone sparkle
  marimbaRoll?: number; // 16th-note upbeat marimba sparkle
  harmonica?: [number, number, number]; // warm joyful accordion/harmonica swell
  whistle?: number; // breezy high tin-whistle ornamental note
  kick?: boolean;
  tambourine?: 'accent' | 'shake' | 'double';
  woodblock?: boolean;
}

const G_CHORD: [number, number, number] = [196.0, 246.94, 293.66];
const D_CHORD: [number, number, number] = [293.66, 369.99, 440.0];
const D7_CHORD: [number, number, number] = [261.63, 369.99, 440.0];
const C_CHORD: [number, number, number] = [261.63, 329.63, 392.0];
const EM_CHORD: [number, number, number] = [164.81, 246.94, 329.63];
const G_HIGH_CHORD: [number, number, number] = [392.0, 493.88, 587.33];

const FESTIVAL_FARM_SEQUENCE: FestivalStep[] = [
  // === BAR 1 (G Major): Sunny Morning Harvest Groove ===
  { banjo: 392.0, bass: 98.0, marimba: 783.99, kick: true, harmonica: G_HIGH_CHORD },
  { banjo: 440.0, chord: G_CHORD, tambourine: 'shake' },
  { banjo: 493.88, slideFrom: 466.16, bass: 123.47, tambourine: 'accent', marimba: 987.77 },
  { banjo: 587.33, rollFreq: 493.88, chord: G_CHORD, woodblock: true },
  { banjo: 659.25, bass: 146.83, kick: true, fiddle: 587.33 },
  { banjo: 587.33, chord: G_CHORD, tambourine: 'shake', marimba: 1174.66 },
  { banjo: 493.88, bass: 164.81, tambourine: 'accent' },
  { banjo: 392.0, rollFreq: 440.0, chord: G_CHORD, woodblock: true },

  // === BAR 2 (C Major -> G Major): Bouncy Garden Celebration ===
  { banjo: 523.25, bass: 130.81, fiddle: 659.25, marimba: 1046.5, kick: true, harmonica: C_CHORD },
  { banjo: 587.33, chord: C_CHORD, tambourine: 'shake' },
  { banjo: 659.25, bass: 164.81, tambourine: 'accent', marimbaRoll: 1318.5 },
  { banjo: 783.99, rollFreq: 659.25, chord: C_CHORD, woodblock: true },
  { banjo: 587.33, bass: 98.0, fiddle: 493.88, fiddleHarmony: 587.33, kick: true },
  { banjo: 493.88, chord: G_CHORD, tambourine: 'shake', marimba: 987.77 },
  { banjo: 440.0, bass: 146.83, tambourine: 'accent' },
  { banjo: 392.0, rollFreq: 493.88, chord: G_CHORD, tambourine: 'double' },

  // === BAR 3 (G Major -> D Major): Lively Tractor & Wagon Bounce ===
  { banjo: 587.33, bass: 98.0, marimba: 783.99, kick: true },
  { banjo: 493.88, chord: G_CHORD, tambourine: 'shake' },
  { banjo: 587.33, bass: 123.47, tambourine: 'accent', whistle: 1174.66 },
  { banjo: 783.99, rollFreq: 659.25, chord: G_CHORD, woodblock: true },
  { banjo: 739.99, bass: 146.83, fiddle: 587.33, fiddleHarmony: 739.99, kick: true, harmonica: D_CHORD },
  { banjo: 659.25, chord: D_CHORD, tambourine: 'shake', marimba: 1174.66 },
  { banjo: 587.33, bass: 110.0, tambourine: 'accent' },
  { banjo: 493.88, rollFreq: 587.33, chord: D7_CHORD, woodblock: true },

  // === BAR 4 (D7 -> G Major): Joyful Fanfare Turnaround ===
  { banjo: 440.0, bass: 146.83, marimba: 880.0, kick: true },
  { banjo: 493.88, chord: D7_CHORD, tambourine: 'shake', marimbaRoll: 1046.5 },
  { banjo: 587.33, bass: 110.0, tambourine: 'accent', fiddle: 739.99 },
  { banjo: 659.25, rollFreq: 739.99, chord: D7_CHORD, woodblock: true },
  { banjo: 783.99, slideFrom: 739.99, bass: 98.0, fiddle: 783.99, fiddleHarmony: 987.77, marimba: 1567.98, kick: true, harmonica: G_HIGH_CHORD },
  { chord: G_CHORD, tambourine: 'double', marimba: 1174.66 },
  { banjo: 587.33, bass: 146.83, tambourine: 'accent', whistle: 1567.98 },
  { rollFreq: 493.88, chord: G_CHORD, woodblock: true, tambourine: 'shake' },

  // === BAR 5 (G Major Chorus): Bright Festival Ensemble Peak ===
  { banjo: 783.99, bass: 98.0, fiddle: 783.99, fiddleHarmony: 987.77, marimba: 1567.98, kick: true, harmonica: G_HIGH_CHORD },
  { banjo: 659.25, chord: G_CHORD, tambourine: 'shake', marimbaRoll: 1318.5 },
  { banjo: 587.33, bass: 123.47, tambourine: 'accent', marimba: 1174.66 },
  { banjo: 659.25, rollFreq: 783.99, chord: G_CHORD, woodblock: true },
  { banjo: 783.99, bass: 146.83, fiddle: 659.25, fiddleHarmony: 783.99, kick: true },
  { banjo: 587.33, chord: G_CHORD, tambourine: 'shake', whistle: 1975.53 },
  { banjo: 493.88, bass: 164.81, tambourine: 'accent', marimba: 987.77 },
  { banjo: 587.33, rollFreq: 659.25, chord: G_CHORD, tambourine: 'double' },

  // === BAR 6 (E Minor -> C Major): Uplifting Market Square Dance ===
  { banjo: 659.25, bass: 164.81, fiddle: 659.25, fiddleHarmony: 783.99, marimba: 1318.5, kick: true, harmonica: EM_CHORD },
  { banjo: 587.33, chord: EM_CHORD, tambourine: 'shake' },
  { banjo: 493.88, bass: 196.0, tambourine: 'accent', marimba: 987.77 },
  { banjo: 587.33, rollFreq: 659.25, chord: EM_CHORD, woodblock: true },
  { banjo: 523.25, bass: 130.81, fiddle: 523.25, fiddleHarmony: 659.25, marimba: 1046.5, kick: true, harmonica: C_CHORD },
  { banjo: 659.25, chord: C_CHORD, tambourine: 'shake', marimbaRoll: 1318.5 },
  { banjo: 783.99, bass: 164.81, tambourine: 'accent', whistle: 1567.98 },
  { banjo: 659.25, rollFreq: 523.25, chord: C_CHORD, woodblock: true },

  // === BAR 7 (C Major -> D7): Cheerful Harvest Parade ===
  { banjo: 523.25, bass: 130.81, marimba: 1046.5, kick: true },
  { banjo: 587.33, chord: C_CHORD, tambourine: 'shake', marimbaRoll: 1174.66 },
  { banjo: 659.25, bass: 164.81, tambourine: 'accent', fiddle: 659.25 },
  { banjo: 783.99, rollFreq: 659.25, chord: C_CHORD, woodblock: true },
  { banjo: 739.99, bass: 146.83, fiddle: 587.33, fiddleHarmony: 880.0, marimba: 1479.98, kick: true, harmonica: D7_CHORD },
  { banjo: 659.25, chord: D7_CHORD, tambourine: 'shake' },
  { banjo: 587.33, bass: 110.0, tambourine: 'accent', marimba: 1174.66 },
  { banjo: 659.25, rollFreq: 739.99, chord: D7_CHORD, tambourine: 'double', woodblock: true },

  // === BAR 8 (G Major Grand Finale): Triumphant Cheerful Resolution ===
  { banjo: 783.99, slideFrom: 739.99, bass: 98.0, fiddle: 783.99, fiddleHarmony: 987.77, marimba: 1567.98, kick: true, harmonica: G_HIGH_CHORD },
  { banjo: 587.33, chord: G_CHORD, tambourine: 'shake', marimbaRoll: 1174.66 },
  { banjo: 493.88, bass: 123.47, tambourine: 'accent', whistle: 1567.98 },
  { banjo: 587.33, rollFreq: 783.99, chord: G_CHORD, woodblock: true, whistle: 1975.53 },
  { banjo: 392.0, bass: 146.83, marimba: 783.99, kick: true },
  { banjo: 493.88, chord: G_CHORD, tambourine: 'double', marimbaRoll: 987.77 },
  { banjo: 587.33, bass: 196.0, tambourine: 'accent', marimba: 1174.66 },
  { rollFreq: 392.0, chord: G_CHORD, woodblock: true, tambourine: 'shake' },
];

class FarmAudioEngine {
  private ctx: AudioContext | null = null;
  private masterMusicBus: GainNode | null = null;
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
      this.masterMusicBus = null;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private getMusicBus(ctx: AudioContext): AudioNode {
    if (this.masterMusicBus) return this.masterMusicBus;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.88, ctx.currentTime);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(3.2, ctx.currentTime);
    compressor.attack.setValueAtTime(0.006, ctx.currentTime);
    compressor.release.setValueAtTime(0.14, ctx.currentTime);

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
    this.masterMusicBus = masterGain;
    return masterGain;
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
    endFreq?: number,
    destination?: AudioNode
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
    gain.connect(destination ?? ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // 1. Bright Plucky Banjo / Ukulele lead & bluegrass 16th-note rolls
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
      oscSaw.frequency.exponentialRampToValueAtTime(freq, startTime + 0.042);
      oscTri.frequency.setValueAtTime(slideFromFreq, startTime);
      oscTri.frequency.exponentialRampToValueAtTime(freq, startTime + 0.042);
    } else {
      oscSaw.frequency.setValueAtTime(freq, startTime);
      oscTri.frequency.setValueAtTime(freq, startTime);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.0, startTime);
    filter.frequency.setValueAtTime(Math.min(5400, freq * 5.6), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.65), startTime + Math.min(0.15, duration));

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscSaw.connect(filter);
    oscTri.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMusicBus(ctx));

    oscSaw.start(startTime);
    oscTri.start(startTime);
    oscSaw.stop(startTime + duration + 0.02);
    oscTri.stop(startTime + duration + 0.02);
  }

  // 2. Bouncy Walking Upright Country Bass
  private playCountryBass(ctx: AudioContext, freq: number, startTime: number) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.03, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.032);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.068, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.21);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMusicBus(ctx));
    osc.start(startTime);
    osc.stop(startTime + 0.23);
  }

  // 3. Bright Acoustic Guitar Strum & Brisk Pick Brush
  private playGuitarStrum(ctx: AudioContext, chord: [number, number, number], startTime: number) {
    const bus = this.getMusicBus(ctx);
    this.playFilteredNoise(ctx, startTime, 0.048, 'bandpass', 2800, 1900, 0.015, bus);
    chord.forEach((f, idx) => {
      this.playTone(ctx, f, startTime + idx * 0.007, 0.11, 'triangle', 0.013, undefined, bus);
    });
  }

  // 4. Expressive Celebratory Country Fiddle (+ optional 3rd/5th double-stop harmony)
  private playFiddleHarmony(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    harmonyFreq?: number
  ) {
    const bus = this.getMusicBus(ctx);
    const playVoice = (voiceFreq: number, peak: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(voiceFreq * 0.992, startTime);
      osc.frequency.linearRampToValueAtTime(voiceFreq, startTime + 0.055);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(1.4, startTime);
      filter.frequency.setValueAtTime(Math.min(3600, voiceFreq * 2.4), startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bus);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    };

    playVoice(freq, 0.02);
    if (harmonyFreq) {
      playVoice(harmonyFreq, 0.014);
    }
  }

  // 5. Sparkling Marimba / Festival Xylophone Bells
  private playFestivalMarimba(ctx: AudioContext, freq: number, startTime: number, peakGain = 0.022) {
    const bus = this.getMusicBus(ctx);
    this.playTone(ctx, freq, startTime, 0.18, 'sine', peakGain, undefined, bus);
    this.playTone(ctx, freq * 2, startTime, 0.075, 'sine', peakGain * 0.42, undefined, bus);
  }

  // 6. Joyful Reedy Accordion / Harmonica Swell
  private playHarmonicaLift(ctx: AudioContext, chord: [number, number, number], startTime: number) {
    const bus = this.getMusicBus(ctx);
    chord.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1650, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.0085, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.44);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bus);
      osc.start(startTime);
      osc.stop(startTime + 0.46);
    });
  }

  // 7. Breezy Tin-Whistle / Flute Festival Ornament
  private playWhistleNote(ctx: AudioContext, freq: number, startTime: number) {
    const bus = this.getMusicBus(ctx);
    this.playTone(ctx, freq * 0.94, startTime, 0.14, 'sine', 0.013, freq, bus);
  }

  // 8. Festive Percussion Trio: Kick, Tambourine/Sleigh-Bells, & Woodblock/Clap
  private playKickDrum(ctx: AudioContext, startTime: number) {
    const bus = this.getMusicBus(ctx);
    this.playTone(ctx, 115, startTime, 0.11, 'sine', 0.085, 48, bus);
  }

  private playTambourine(ctx: AudioContext, startTime: number, mode: 'accent' | 'shake' | 'double') {
    const bus = this.getMusicBus(ctx);
    const hit = (t: number, level: number, dur: number) => {
      this.playFilteredNoise(ctx, t, dur, 'highpass', 5800, 4200, level, bus);
      this.playTone(ctx, 6400, t, dur * 0.7, 'sine', level * 0.16, undefined, bus);
    };

    if (mode === 'accent') {
      hit(startTime, 0.022, 0.075);
    } else if (mode === 'shake') {
      hit(startTime, 0.011, 0.04);
    } else {
      hit(startTime, 0.017, 0.045);
      hit(startTime + 0.11, 0.019, 0.055);
    }
  }

  private playWoodblockClap(ctx: AudioContext, startTime: number) {
    const bus = this.getMusicBus(ctx);
    this.playTone(ctx, 980, startTime, 0.045, 'triangle', 0.022, 760, bus);
    this.playFilteredNoise(ctx, startTime, 0.04, 'bandpass', 2200, 1400, 0.014, bus);
  }

  private playFilteredNoise(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    peakGain: number,
    destination?: AudioNode
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
    gain.connect(destination ?? ctx.destination);
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

    const stepMs = 220; // ~136 BPM bright, upbeat festival harvest groove
    const tick = () => {
      if (!this.musicRunning || this.musicMuted) return;
      const audio = this.ensureContext();
      if (!audio || audio.state !== 'running') return;

      const idx = this.stepIndex % FESTIVAL_FARM_SEQUENCE.length;
      const step = FESTIVAL_FARM_SEQUENCE[idx];
      const now = audio.currentTime + 0.02;

      if (step.kick) {
        this.playKickDrum(audio, now);
      }

      if (step.tambourine) {
        this.playTambourine(audio, now, step.tambourine);
      }

      if (step.woodblock) {
        this.playWoodblockClap(audio, now);
      }

      if (step.bass) {
        this.playCountryBass(audio, step.bass, now);
      }

      if (step.chord) {
        this.playGuitarStrum(audio, step.chord, now);
      }

      if (step.harmonica) {
        this.playHarmonicaLift(audio, step.harmonica, now);
      }

      if (step.banjo) {
        this.playBanjoPluck(audio, step.banjo, now, 0.19, 0.026, step.slideFrom);
      }

      if (step.rollFreq) {
        this.playBanjoPluck(audio, step.rollFreq, now + 0.11, 0.14, 0.02);
      }

      if (step.fiddle) {
        this.playFiddleHarmony(audio, step.fiddle, now, 0.42, step.fiddleHarmony);
      }

      if (step.marimba) {
        this.playFestivalMarimba(audio, step.marimba, now, 0.02);
      }

      if (step.marimbaRoll) {
        this.playFestivalMarimba(audio, step.marimbaRoll, now + 0.11, 0.016);
      }

      if (step.whistle) {
        this.playWhistleNote(audio, step.whistle, now);
      }

      // Cheerful morning songbird chirp on bar 4 & bar 8 turnarounds
      if (idx === 31 || idx === 63) {
        const bus = this.getMusicBus(audio);
        this.playTone(audio, 1760, now + 0.04, 0.055, 'sine', 0.008, 2240, bus);
        this.playTone(audio, 2093, now + 0.11, 0.065, 'sine', 0.007, 2637, bus);
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
