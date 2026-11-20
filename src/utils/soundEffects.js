/**
 * StockLine Enterprise Audio Feedback Engine
 * Ultra-low latency audio synthesized via native Web Audio API.
 * Zero external audio files, works 100% offline.
 */

let audioCtx = null;
let soundEnabled = true;

// Initialize or resume AudioContext safely on first user gesture
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const isSoundEnabled = () => soundEnabled;
export const setSoundEnabled = (enabled) => {
  soundEnabled = !!enabled;
  try {
    localStorage.setItem('stockline_sound_enabled', soundEnabled ? '1' : '0');
  } catch (e) {
    // LocalStorage fallback
  }
};

// Initialize sound preference from localStorage
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('stockline_sound_enabled');
    if (saved !== null) {
      soundEnabled = saved === '1';
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * 1. Barcode Scanner Beep
 * Authentic retail / warehouse high-frequency dual-harmonic beep (1850Hz / 70ms).
 */
export const playBarcodeBeep = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (err) {
    // Audio context may be restricted by autoplay policy
  }
};

/**
 * 2. Success Action Chime
 * Smooth two-tone ascending chime for invoice creation or completed intake (880Hz -> 1320Hz).
 */
export const playSuccessChime = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (err) {
    // Ignore
  }
};

/**
 * 3. Error / Warning Tone
 * Low double-pulse warning tone for out-of-stock or invalid scan (240Hz).
 */
export const playErrorTone = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.setValueAtTime(210, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (err) {
    // Ignore
  }
};
