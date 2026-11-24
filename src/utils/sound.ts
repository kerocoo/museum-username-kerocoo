export type CuteSoundKind = 'pop' | 'back' | 'chime';

const SOUND_STORAGE_KEY = 'kerocoo_sound_enabled';

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioCtx) return sharedAudioCtx;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    sharedAudioCtx = new AudioCtx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage restriction in private browsing
  }
}

export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function playBubbleTone(
  ctx: AudioContext,
  startTime: number,
  startFreq: number,
  endFreq: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType = 'sine'
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(40, endFreq),
    startTime + durationSec
  );

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationSec + 0.01);
}

export function playCuteSound(kind: CuteSoundKind = 'pop'): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  try {
    if (kind === 'back') {
      // Soft descending bubble pop for Back / Close
      playBubbleTone(ctx, now, 660, 410, 0.065, 0.11, 'sine');
    } else if (kind === 'chime') {
      // Cute two-note pop-up sparkle for primary CTAs (start, beli, slide, save)
      playBubbleTone(ctx, now, 560, 880, 0.06, 0.12, 'sine');
      playBubbleTone(ctx, now + 0.05, 780, 1180, 0.08, 0.11, 'triangle');
    } else {
      // Signature bouncy pop-up bubble sound
      playBubbleTone(ctx, now, 480, 940, 0.06, 0.13, 'sine');
      playBubbleTone(ctx, now + 0.018, 960, 1220, 0.045, 0.05, 'triangle');
    }
  } catch {
    // Fail silently if audio playback is blocked
  }
}
