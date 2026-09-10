/**
 * Audio service strictly for the Jarvis Voice Assistance button.
 * All other website sound effects have been removed per user request.
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch (e) {
        console.warn('[AudioSynth] Failed to instantiate AudioContext:', e);
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Dedicated sound effect solely for the Jarvis Voice Assistance button activation.
 */
export function playVoiceButtonSound(mode: 'activate' | 'deactivate') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (mode === 'activate') {
      // Ascending futuristic chime on voice button activation
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      // Descending soft tone on voice button deactivation
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1); // A4
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (_) {
    // Audio policies might prevent playback before user interaction; ignore silently
  }
}

/**
 * Deprecated/No-op: All other website sound effects are deleted.
 * Preserved as a safe empty function so existing components compile without errors during cleanup.
 */
export function playJarvisSound(_type?: any) {
  // Intentionally empty: all other sound effects across the website have been deleted.
}

