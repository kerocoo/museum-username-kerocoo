import { getAudioContext } from './sound';

export type MusicTrackId = 'lake' | 'rainforest' | 'twilight' | 'meadow';

export interface MusicTrackInfo {
  id: MusicTrackId;
  title: string;
  subtitle: string;
}

export const MUSIC_TRACKS: MusicTrackInfo[] = [
  {
    id: 'lake',
    title: 'Danau Pagi',
    subtitle: 'Kalimba lembut, angin & burung',
  },
  {
    id: 'meadow',
    title: 'Padang Rumput',
    subtitle: 'Seruling kayu, petikan & burung',
  },
  {
    id: 'rainforest',
    title: 'Gerimis Hutan',
    subtitle: 'Celesta halus, rintik hujan & alam',
  },
  {
    id: 'twilight',
    title: 'Senja Tenang',
    subtitle: 'Piano hangat, angin sore & jangkrik',
  },
];

const MUSIC_ENABLED_KEY = 'kerocoo_music_enabled';
const MUSIC_VOLUME_KEY = 'kerocoo_music_volume';
const MUSIC_TRACK_KEY = 'kerocoo_music_track';
const DEFAULT_MUSIC_VOLUME = 0.55;

interface ChordDef {
  pad: number[];
  arp: number[];
}

const TRACK_CONFIGS: Record<
  MusicTrackId,
  {
    barMs: number;
    chords: ChordDef[];
    steps: Array<{ stepOffset: number; arpIdx: number; dur: number; gain: number }>;
    toneType: 'kalimba' | 'flute' | 'celesta' | 'piano';
    natureType: 'breeze' | 'rain' | 'twilight' | 'meadow';
  }
> = {
  lake: {
    barMs: 3800,
    toneType: 'kalimba',
    natureType: 'breeze',
    chords: [
      { pad: [174.61, 261.63, 329.63], arp: [349.23, 440.0, 523.25, 659.25, 587.33] },
      { pad: [146.83, 220.0, 329.63], arp: [293.66, 349.23, 440.0, 523.25, 659.25] },
      { pad: [116.54, 233.08, 349.23], arp: [349.23, 440.0, 466.16, 587.33, 698.46] },
      { pad: [130.81, 261.63, 329.63], arp: [392.0, 440.0, 523.25, 659.25, 783.99] },
    ],
    steps: [
      { stepOffset: 0.0, arpIdx: 0, dur: 2.8, gain: 0.13 },
      { stepOffset: 0.7, arpIdx: 2, dur: 2.4, gain: 0.1 },
      { stepOffset: 1.45, arpIdx: 3, dur: 2.6, gain: 0.11 },
      { stepOffset: 2.25, arpIdx: 4, dur: 2.9, gain: 0.09 },
      { stepOffset: 3.1, arpIdx: 1, dur: 2.4, gain: 0.085 },
    ],
  },
  meadow: {
    barMs: 3600,
    toneType: 'flute',
    natureType: 'meadow',
    chords: [
      { pad: [196.0, 293.66, 369.99], arp: [392.0, 493.88, 587.33, 739.99, 659.25] },
      { pad: [164.81, 246.94, 369.99], arp: [329.63, 392.0, 493.88, 587.33, 739.99] },
      { pad: [130.81, 261.63, 329.63], arp: [329.63, 392.0, 493.88, 523.25, 659.25] },
      { pad: [146.83, 220.0, 293.66], arp: [369.99, 440.0, 587.33, 659.25, 783.99] },
    ],
    steps: [
      { stepOffset: 0.0, arpIdx: 2, dur: 2.3, gain: 0.11 },
      { stepOffset: 0.9, arpIdx: 3, dur: 2.0, gain: 0.1 },
      { stepOffset: 1.85, arpIdx: 4, dur: 2.4, gain: 0.105 },
      { stepOffset: 2.75, arpIdx: 1, dur: 2.0, gain: 0.09 },
    ],
  },
  rainforest: {
    barMs: 4100,
    toneType: 'celesta',
    natureType: 'rain',
    chords: [
      { pad: [146.83, 220.0, 277.18], arp: [440.0, 554.37, 659.25, 739.99, 880.0] },
      { pad: [123.47, 246.94, 329.63], arp: [369.99, 440.0, 587.33, 659.25, 739.99] },
      { pad: [98.0, 196.0, 293.66], arp: [392.0, 493.88, 587.33, 659.25, 783.99] },
      { pad: [110.0, 220.0, 277.18], arp: [329.63, 440.0, 554.37, 659.25, 739.99] },
    ],
    steps: [
      { stepOffset: 0.0, arpIdx: 0, dur: 3.1, gain: 0.09 },
      { stepOffset: 0.85, arpIdx: 2, dur: 2.8, gain: 0.085 },
      { stepOffset: 1.65, arpIdx: 4, dur: 3.0, gain: 0.075 },
      { stepOffset: 2.5, arpIdx: 3, dur: 2.7, gain: 0.08 },
      { stepOffset: 3.3, arpIdx: 1, dur: 2.5, gain: 0.07 },
    ],
  },
  twilight: {
    barMs: 4400,
    toneType: 'piano',
    natureType: 'twilight',
    chords: [
      { pad: [130.81, 196.0, 246.94], arp: [261.63, 329.63, 392.0, 493.88, 587.33] },
      { pad: [110.0, 220.0, 261.63], arp: [293.66, 329.63, 440.0, 523.25, 587.33] },
      { pad: [87.31, 174.61, 261.63], arp: [261.63, 349.23, 440.0, 523.25, 659.25] },
      { pad: [98.0, 196.0, 246.94], arp: [293.66, 392.0, 440.0, 493.88, 587.33] },
    ],
    steps: [
      { stepOffset: 0.0, arpIdx: 0, dur: 3.4, gain: 0.14 },
      { stepOffset: 1.15, arpIdx: 2, dur: 3.0, gain: 0.11 },
      { stepOffset: 2.2, arpIdx: 3, dur: 3.2, gain: 0.105 },
      { stepOffset: 3.35, arpIdx: 1, dur: 2.8, gain: 0.09 },
    ],
  },
};

let masterGain: GainNode | null = null;
let echoInput: GainNode | null = null;
let natureGainNode: GainNode | null = null;
let natureSource: AudioBufferSourceNode | null = null;
let natureFilter: BiquadFilterNode | null = null;
let natureLfo: OscillatorNode | null = null;
let musicTimer: number | null = null;
let animalTimer: number | null = null;
let isRunning = false;
let chordIndex = 0;

export function isMusicEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(MUSIC_ENABLED_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function getMusicVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_MUSIC_VOLUME;
  try {
    const saved = window.localStorage.getItem(MUSIC_VOLUME_KEY);
    if (saved === null) return DEFAULT_MUSIC_VOLUME;
    const num = Number(saved);
    if (!Number.isFinite(num)) return DEFAULT_MUSIC_VOLUME;
    return Math.min(1, Math.max(0, num));
  } catch {
    return DEFAULT_MUSIC_VOLUME;
  }
}

export function getMusicTrack(): MusicTrackId {
  if (typeof window === 'undefined') return 'lake';
  try {
    const saved = window.localStorage.getItem(MUSIC_TRACK_KEY);
    if (
      saved === 'lake' ||
      saved === 'meadow' ||
      saved === 'rainforest' ||
      saved === 'twilight'
    ) {
      return saved;
    }
    return 'lake';
  } catch {
    return 'lake';
  }
}

function getEffectiveGainValue(): number {
  if (!isMusicEnabled()) return 0;
  const v = getMusicVolume();
  return Math.pow(v, 1.35) * 0.65;
}

function ensureAudioBus(ctx: AudioContext): { master: GainNode; echo: GainNode } {
  if (masterGain && echoInput) {
    return { master: masterGain, echo: echoInput };
  }

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.connect(ctx.destination);

  const echo = ctx.createGain();
  echo.gain.setValueAtTime(1.0, ctx.currentTime);

  const delayL = ctx.createDelay(1.0);
  delayL.delayTime.setValueAtTime(0.38, ctx.currentTime);
  const feedbackL = ctx.createGain();
  feedbackL.gain.setValueAtTime(0.32, ctx.currentTime);
  const echoFilter = ctx.createBiquadFilter();
  echoFilter.type = 'lowpass';
  echoFilter.frequency.setValueAtTime(1150, ctx.currentTime);

  echo.connect(master);
  echo.connect(delayL);
  delayL.connect(echoFilter);
  echoFilter.connect(feedbackL);
  feedbackL.connect(delayL);
  echoFilter.connect(master);

  masterGain = master;
  echoInput = echo;
  return { master, echo };
}

function ensureNatureBed(ctx: AudioContext, master: GainNode, track: MusicTrackId): void {
  const mode = TRACK_CONFIGS[track].natureType;

  if (!natureSource) {
    const durationSec = 5;
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.028 * white) / 1.028;
      data[i] = lastOut * 2.5;
    }

    const fadeSamples = Math.min(4000, Math.floor(frameCount * 0.1));
    for (let i = 0; i < fadeSamples; i++) {
      const t = i / fadeSamples;
      data[i] = data[i] * t + data[frameCount - fadeSamples + i] * (1 - t);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(360, ctx.currentTime);
    filter.Q.setValueAtTime(0.65, ctx.currentTime);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.08, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.085, ctx.currentTime);

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.setValueAtTime(140, ctx.currentTime);
    lfo.connect(lfoFilterGain);
    lfoFilterGain.connect(filter.frequency);

    const lfoVolGain = ctx.createGain();
    lfoVolGain.gain.setValueAtTime(0.03, ctx.currentTime);
    lfo.connect(lfoVolGain);
    lfoVolGain.connect(nGain.gain);

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(master);

    src.start();
    lfo.start();
    natureSource = src;
    natureFilter = filter;
    natureGainNode = nGain;
    natureLfo = lfo;
  }

  if (natureFilter && natureGainNode && natureLfo) {
    const now = ctx.currentTime;
    if (mode === 'rain') {
      natureFilter.type = 'bandpass';
      natureFilter.frequency.setTargetAtTime(920, now, 0.4);
      natureFilter.Q.setTargetAtTime(0.45, now, 0.4);
      natureGainNode.gain.setTargetAtTime(0.095, now, 0.4);
      natureLfo.frequency.setTargetAtTime(0.14, now, 0.4);
    } else if (mode === 'twilight') {
      natureFilter.type = 'bandpass';
      natureFilter.frequency.setTargetAtTime(280, now, 0.4);
      natureFilter.Q.setTargetAtTime(0.8, now, 0.4);
      natureGainNode.gain.setTargetAtTime(0.065, now, 0.4);
      natureLfo.frequency.setTargetAtTime(0.06, now, 0.4);
    } else if (mode === 'meadow') {
      natureFilter.type = 'bandpass';
      natureFilter.frequency.setTargetAtTime(460, now, 0.4);
      natureFilter.Q.setTargetAtTime(0.6, now, 0.4);
      natureGainNode.gain.setTargetAtTime(0.08, now, 0.4);
      natureLfo.frequency.setTargetAtTime(0.1, now, 0.4);
    } else {
      natureFilter.type = 'bandpass';
      natureFilter.frequency.setTargetAtTime(360, now, 0.4);
      natureFilter.Q.setTargetAtTime(0.65, now, 0.4);
      natureGainNode.gain.setTargetAtTime(0.085, now, 0.4);
      natureLfo.frequency.setTargetAtTime(0.085, now, 0.4);
    }
  }
}

function playTrackNote(
  ctx: AudioContext,
  echo: GainNode,
  freq: number,
  startTime: number,
  durationSec: number,
  peakGain: number,
  toneType: 'kalimba' | 'flute' | 'celesta' | 'piano'
): void {
  const oscMain = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const harmonicGain = ctx.createGain();

  if (toneType === 'flute') {
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq * 0.992, startTime);
    oscMain.frequency.linearRampToValueAtTime(freq, startTime + 0.14);

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);
    harmonicGain.gain.setValueAtTime(0.08, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
  } else if (toneType === 'celesta') {
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, startTime);

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 3, startTime);
    harmonicGain.gain.setValueAtTime(0.09, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);
    filter.frequency.exponentialRampToValueAtTime(850, startTime + durationSec);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
  } else if (toneType === 'piano') {
    oscMain.type = 'triangle';
    oscMain.frequency.setValueAtTime(freq, startTime);

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 0.5, startTime);
    harmonicGain.gain.setValueAtTime(0.28, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, startTime);
    filter.frequency.exponentialRampToValueAtTime(420, startTime + durationSec);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
  } else {
    // kalimba
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, startTime);

    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);
    harmonicGain.gain.setValueAtTime(0.14, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, startTime);
    filter.frequency.exponentialRampToValueAtTime(650, startTime + durationSec);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
  }

  oscMain.connect(filter);
  oscHarmonic.connect(harmonicGain);
  harmonicGain.connect(filter);
  filter.connect(gain);
  gain.connect(echo);

  oscMain.start(startTime);
  oscHarmonic.start(startTime);
  oscMain.stop(startTime + durationSec + 0.05);
  oscHarmonic.stop(startTime + durationSec + 0.05);
}

function playWarmPadChord(
  ctx: AudioContext,
  master: GainNode,
  freqs: number[],
  startTime: number,
  durationSec: number
): void {
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.setValueAtTime(520, startTime);

  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.0001, startTime);
  padGain.gain.linearRampToValueAtTime(0.055, startTime + 1.1);
  padGain.gain.setValueAtTime(0.055, startTime + durationSec - 1.3);
  padGain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  padFilter.connect(padGain);
  padGain.connect(master);

  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, startTime);
    osc.connect(padFilter);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.05);
  }
}

function playNatureAnimalCall(
  ctx: AudioContext,
  echo: GainNode,
  natureType: 'breeze' | 'rain' | 'twilight' | 'meadow'
): void {
  if (!isRunning || !isMusicEnabled()) return;
  const now = ctx.currentTime + 0.05;

  if (natureType === 'twilight') {
    // Gentle evening cricket trill / soft nightingale bell
    if (Math.random() < 0.55) {
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(3400, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.012, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.connect(gain);
        gain.connect(echo);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1650, now);
      osc.frequency.exponentialRampToValueAtTime(2080, now + 0.25);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(echo);
      osc.start(now);
      osc.stop(now + 0.34);
    }
    return;
  }

  // Melodious morning/meadow/forest songbird phrases
  const motif = Math.floor(Math.random() * 3);
  const shift = natureType === 'meadow' ? 1.12 : natureType === 'rain' ? 0.92 : 1;

  const notes: Array<{ t: number; f1: number; f2: number; d: number; g: number }> =
    motif === 0
      ? [
          { t: 0, f1: 2150 * shift, f2: 2680 * shift, d: 0.11, g: 0.025 },
          { t: 0.16, f1: 2480 * shift, f2: 2950 * shift, d: 0.13, g: 0.027 },
          { t: 0.36, f1: 2700 * shift, f2: 2320 * shift, d: 0.18, g: 0.021 },
        ]
      : motif === 1
        ? [
            { t: 0, f1: 1980 * shift, f2: 2450 * shift, d: 0.14, g: 0.023 },
            { t: 0.22, f1: 2620 * shift, f2: 2620 * shift, d: 0.09, g: 0.019 },
            { t: 0.36, f1: 2550 * shift, f2: 3120 * shift, d: 0.16, g: 0.024 },
          ]
        : [
            { t: 0, f1: 2420 * shift, f2: 2880 * shift, d: 0.1, g: 0.021 },
            { t: 0.14, f1: 2650 * shift, f2: 2240 * shift, d: 0.15, g: 0.019 },
          ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.f1, now + n.t);
    osc.frequency.exponentialRampToValueAtTime(n.f2, now + n.t + n.d);

    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.linearRampToValueAtTime(n.g, now + n.t + 0.022);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

    osc.connect(gain);
    gain.connect(echo);

    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.03);
  }
}

function scheduleBar(): void {
  if (!isRunning) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain || !echoInput) return;

  const track = getMusicTrack();
  const cfg = TRACK_CONFIGS[track];
  const chord = cfg.chords[chordIndex % cfg.chords.length];
  chordIndex += 1;

  const barStart = ctx.currentTime + 0.06;
  const barDuration = cfg.barMs / 1000;

  playWarmPadChord(ctx, masterGain, chord.pad, barStart, barDuration + 0.25);

  for (const step of cfg.steps) {
    if (step.stepOffset > 2.5 && Math.random() < 0.22) continue;
    const freq = chord.arp[step.arpIdx % chord.arp.length];
    playTrackNote(
      ctx,
      echoInput,
      freq,
      barStart + step.stepOffset,
      step.dur,
      step.gain,
      cfg.toneType
    );
  }

  musicTimer = window.setTimeout(scheduleBar, cfg.barMs - 50);
}

function scheduleNextAnimalCall(): void {
  if (!isRunning) return;
  const ctx = getAudioContext();
  const track = getMusicTrack();
  const cfg = TRACK_CONFIGS[track];

  if (ctx && echoInput && ctx.state === 'running') {
    playNatureAnimalCall(ctx, echoInput, cfg.natureType);
  }
  const nextDelayMs = 4200 + Math.random() * 6200;
  animalTimer = window.setTimeout(scheduleNextAnimalCall, nextDelayMs);
}

function clearTimers(): void {
  if (musicTimer !== null) {
    window.clearTimeout(musicTimer);
    musicTimer = null;
  }
  if (animalTimer !== null) {
    window.clearTimeout(animalTimer);
    animalTimer = null;
  }
}

export function startAmbientMusic(): void {
  if (!isMusicEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  if (isRunning) return;

  const track = getMusicTrack();
  const { master } = ensureAudioBus(ctx);
  ensureNatureBed(ctx, master, track);

  const targetGain = getEffectiveGainValue();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
  master.gain.linearRampToValueAtTime(
    Math.max(0.0001, targetGain),
    ctx.currentTime + 1.1
  );

  isRunning = true;
  scheduleBar();
  animalTimer = window.setTimeout(scheduleNextAnimalCall, 1500);
}

export function setMusicTrack(trackId: MusicTrackId): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUSIC_TRACK_KEY, trackId);
    } catch {
      // Ignore storage error
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  chordIndex = 0;

  if (!isMusicEnabled()) {
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const { master } = ensureAudioBus(ctx);
  ensureNatureBed(ctx, master, trackId);

  clearTimers();
  isRunning = true;
  const targetGain = getEffectiveGainValue();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(Math.max(0.0001, targetGain), ctx.currentTime, 0.25);

  scheduleBar();
  animalTimer = window.setTimeout(scheduleNextAnimalCall, 1400);
}

export function setMusicEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUSIC_ENABLED_KEY, String(enabled));
    } catch {
      // Ignore storage error
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  if (enabled) {
    startAmbientMusic();
  } else if (masterGain) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    clearTimers();
    isRunning = false;
  }
}

export function setMusicVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUSIC_VOLUME_KEY, String(clamped));
    } catch {
      // Ignore storage error
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  if (clamped > 0 && isMusicEnabled() && !isRunning) {
    startAmbientMusic();
    return;
  }

  if (masterGain) {
    const target = isMusicEnabled() ? Math.pow(clamped, 1.35) * 0.65 : 0;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setTargetAtTime(Math.max(0.0001, target), ctx.currentTime, 0.08);
  }
}
