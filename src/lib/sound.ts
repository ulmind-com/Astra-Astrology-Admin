/**
 * Ultra-Soft Luxury Haptic & Audio Feedback System for Astra Navigation
 * Generates an ethereal, warm, velvety UI acoustic tap using Web Audio API
 * and triggers subtle device haptic feedback.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a delicate, warm, luxurious acoustic navigation chime
 * reminiscent of premium iOS / Linear haptic feedback.
 */
export function playNavFeedback() {
  // 1. Device Haptic Vibration (for supported touchscreens & mobile devices)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(12); // subtle 12ms tick
    } catch {
      // ignore
    }
  }

  // 2. Web Audio Synthesis (zero network latency, pure smooth tone)
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Master gentle gain (super soft and elegant)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.045, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    // Warm Low-pass filter to eliminate any harsh digital click
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.08);

    // Primary fundamental tone (gentle sine wave)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5 note - elegant & celestial
    osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.07); // gliding down softly to C5

    // Harmonic sparkle (subtle upper overtone)
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1318.5, now); // E6 sparkle
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.05);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.015, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.09);
    osc2.stop(now + 0.09);
  } catch {
    // AudioContext blocked or not allowed yet
  }
}
