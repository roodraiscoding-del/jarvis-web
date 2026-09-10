/**
 * Web Speech API service for Jarvis Voice Assistant.
 * Uses native browser SpeechRecognition and SpeechSynthesis with resilient Web Audio fallback.
 * 100% free and native, no paid external speech APIs required.
 */

import { SpeechDiagnostics } from '../types';
import { getAudioContext } from './audioSynth';

export interface SpeechServiceState {
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
}

// Clean markdown, symbols, and formatting for clean natural text-to-speech output
export function cleanTextForSpeech(rawText: string): string {
  return rawText
    // Remove markdown links [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    // Remove inline code `code` -> code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown bold/italic/header markers
    .replace(/[*_#~]/g, '')
    // Remove bullet point symbols
    .replace(/^[\s-•*]+/gm, '')
    // Clean JSON/object blobs if any
    .replace(/\{[^{}]*\}/g, '')
    // Clean multiple whitespaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Active utterances set to prevent Chromium V8 garbage collection mid-speech
const activeUtterances = new Set<SpeechSynthesisUtterance>();

class SpeechManager {
  private recognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private isListeningActive = false;
  private voicesCache: SpeechSynthesisVoice[] = [];
  private resumeWatchdog: any = null;
  private primed = false;
  private lastDiagnostics: SpeechDiagnostics | null = null;
  private diagnosticListeners: Set<(diag: SpeechDiagnostics) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.refreshVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.refreshVoices();
        };
        try {
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            this.refreshVoices();
          });
        } catch (_) {}
      }

      // Automatically inspect initial permissions and state in background
      this.checkBrowserPermissions().catch(() => {});
    }
  }

  private refreshVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.voicesCache = v;
      }
    } catch (_) {}
    return this.voicesCache;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voicesCache.length === 0) {
      this.refreshVoices();
    }
    return this.voicesCache;
  }

  public isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  /**
   * Subscribe to speech diagnostic updates for UI telemetry
   */
  public subscribeDiagnostics(listener: (diag: SpeechDiagnostics) => void): () => void {
    this.diagnosticListeners.add(listener);
    if (this.lastDiagnostics) {
      listener(this.lastDiagnostics);
    }
    return () => {
      this.diagnosticListeners.delete(listener);
    };
  }

  private notifyDiagnosticListeners(diag: SpeechDiagnostics) {
    this.lastDiagnostics = diag;
    this.diagnosticListeners.forEach((listener) => {
      try {
        listener(diag);
      } catch (e) {
        console.error('[Jarvis Voice] Error in diagnostic listener:', e);
      }
    });
  }

  /**
   * Explicitly check browser permissions (Microphone, Autoplay)
   */
  public async checkBrowserPermissions(): Promise<{ microphone: string }> {
    const result = { microphone: 'unknown' };
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const queryResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        result.microphone = queryResult.state;
      } catch (err: any) {
        result.microphone = `restricted (${err.message || 'not allowed'})`;
      }
    } else {
      result.microphone = 'permissions_api_unavailable';
    }
    return result;
  }

  /**
   * Build complete diagnostic payload of speech engine and browser permissions
   */
  public async getDiagnostics(failureReason?: string): Promise<SpeechDiagnostics> {
    const permissions = await this.checkBrowserPermissions();
    const voices = this.getVoices();
    const audioCtx = getAudioContext();

    const isUserActive =
      typeof navigator !== 'undefined' && 'userActivation' in navigator
        ? {
            hasBeenActive: Boolean((navigator as any).userActivation?.hasBeenActive),
            isActive: Boolean((navigator as any).userActivation?.isActive),
          }
        : { hasBeenActive: this.primed, isActive: this.primed };

    let recommendation = 'Speech synthesis and recognition systems nominal.';
    if (permissions.microphone === 'denied') {
      recommendation = 'Microphone access is blocked in browser settings. Please permit microphone in site settings.';
    } else if (failureReason && (failureReason.toLowerCase().includes('not-allowed') || failureReason.toLowerCase().includes('autoplay') || failureReason.toLowerCase().includes('gesture'))) {
      recommendation = 'Browser autoplay policy blocked audio. Click anywhere in the app or press the Jarvis button to unlock audio.';
    } else if (voices.length === 0 && this.isSynthesisSupported()) {
      recommendation = 'Native speech voices are still loading into browser memory. Resilient fallback TTS is active.';
    } else if (failureReason && failureReason.toLowerCase().includes('silent')) {
      recommendation = 'Native speech was delayed or silenced by browser. Seamless fallback TTS activated.';
    }

    const diag: SpeechDiagnostics = {
      isSynthesisSupported: this.isSynthesisSupported(),
      isRecognitionSupported: this.isRecognitionSupported(),
      isAudioContextReady: Boolean(audioCtx && audioCtx.state === 'running'),
      audioContextState: audioCtx ? audioCtx.state : 'uninitialized',
      speechSynthesisState: {
        speaking: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.speaking : false,
        pending: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.pending : false,
        paused: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.paused : false,
        voicesCount: voices.length,
        defaultVoice: voices[0]?.name,
      },
      userActivation: isUserActive,
      permissions,
      isInIframe: typeof window !== 'undefined' ? window.self !== window.top : false,
      lastEventTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      lastFailureReason: failureReason,
      recommendation,
    };

    this.notifyDiagnosticListeners(diag);
    return diag;
  }

  /**
   * Explicitly logs a formatted, cybernetic diagnostic table in the browser console.
   * Ensures browser permissions and root causes are never silent.
   */
  public async logExplicitDiagnostics(context: string, details?: any): Promise<SpeechDiagnostics> {
    const diag = await this.getDiagnostics(
      typeof details === 'string'
        ? details
        : details?.error || details?.message || context
    );

    console.group(`%c[JARVIS SPEECH ENGINE DIAGNOSTIC] ${context}`, 'color: #06b6d4; font-weight: bold; font-size: 11px;');
    console.log(`%cTimestamp: ${diag.lastEventTimestamp}`, 'color: #94a3b8; font-family: monospace;');
    if (details) {
      console.warn('Triggering Exception/Event:', details);
    }
    console.table({
      'Speech Synthesis Supported': diag.isSynthesisSupported ? 'YES' : 'NO',
      'Speech Recognition Supported': diag.isRecognitionSupported ? 'YES' : 'NO',
      'WebAudio Context State': diag.audioContextState,
      'WebAudio Context Ready': diag.isAudioContextReady ? 'YES' : 'NO',
      'SpeechSynthesis Speaking': diag.speechSynthesisState.speaking ? 'YES' : 'NO',
      'SpeechSynthesis Paused': diag.speechSynthesisState.paused ? 'YES (Chromium stuck)' : 'NO',
      'SpeechSynthesis Pending': diag.speechSynthesisState.pending ? 'YES' : 'NO',
      'Voices Cached': diag.speechSynthesisState.voicesCount,
      'Microphone Permission': diag.permissions.microphone,
      'User Activation (hasBeenActive)': diag.userActivation.hasBeenActive ? 'YES' : 'NO',
      'User Activation (isActive)': diag.userActivation.isActive ? 'YES' : 'NO',
      'Running in iFrame': diag.isInIframe ? 'YES (Strict autoplay policy)' : 'NO',
    });
    console.info(`%cRecommendation: ${diag.recommendation}`, 'color: #38bdf8; font-style: italic;');
    console.groupEnd();

    return diag;
  }

  /**
   * Initializer and primer: called synchronously on user button interaction (click/tap/spacebar).
   * Unlocks browser audio playback policies for both Web Audio and Native SpeechSynthesis.
   */
  public initialize(context = 'button_interaction'): void {
    this.primed = true;

    // 1. Prime and resume shared Web Audio context
    try {
      const audioCtx = getAudioContext();
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch((e) => {
            console.warn('[Jarvis Voice] AudioContext resume notice:', e);
          });
        }
        // Play an inaudible 1-sample silent buffer to unlock the audio rendering pipeline
        if (audioCtx.state === 'running') {
          const silentBuffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioCtx.destination);
          source.start(0);
        }
      }
    } catch (_) {}

    // 2. Prime native SpeechSynthesis if supported
    if (this.isSynthesisSupported()) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        this.refreshVoices();
      } catch (_) {}
    }

    // 3. Log diagnostic verification of successful initialization
    this.getDiagnostics().then((diag) => {
      console.log(
        `%c[Jarvis SpeechManager] Initialized successfully via ${context}. WebAudio: ${diag.audioContextState}, Voices: ${diag.speechSynthesisState.voicesCount}, Mic: ${diag.permissions.microphone}`,
        'color: #10b981; font-family: monospace; font-size: 11px;'
      );
    });
  }

  /**
   * Legacy alias for initialize, with optional greeting speech.
   */
  public primeVoiceEngine(greeting?: string, onDone?: () => void) {
    this.initialize('primeVoiceEngine');

    if (greeting) {
      this.speak(greeting, undefined, onDone, onDone);
    } else {
      onDone?.();
    }
  }

  /**
   * Fallback audio playback using server-side TTS proxy and Web Audio API.
   * Completely bypasses HTML5 audio element autoplay blocking because it leverages
   * the pre-resumed Web Audio context.
   */
  private async playFallbackAudio(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    try {
      this.cancelSpeaking();
      const cleaned = cleanTextForSpeech(text).slice(0, 300);
      if (!cleaned) {
        onEnd?.();
        return;
      }

      // Method A: Play via pre-unlocked Web Audio API context
      const audioCtx = getAudioContext();
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          try {
            await audioCtx.resume();
          } catch (_) {}
        }

        if (audioCtx.state === 'running') {
          try {
            const res = await fetch(`/api/tts?text=${encodeURIComponent(cleaned)}`);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioCtx.destination);

              this.activeSourceNode = source;
              source.onended = () => {
                if (this.activeSourceNode === source) {
                  this.activeSourceNode = null;
                }
                onEnd?.();
              };

              source.start(0);
              onStart?.();
              return;
            }
          } catch (webAudioErr) {
            console.warn('[Jarvis Voice] WebAudio decode failed, attempting HTMLAudioElement:', webAudioErr);
          }
        }
      }

      // Method B: Fallback to HTMLAudioElement
      const audio = new Audio(`/api/tts?text=${encodeURIComponent(cleaned)}`);
      this.currentAudio = audio;

      audio.onplay = () => {
        onStart?.();
      };

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        onEnd?.();
      };

      audio.onerror = async (e) => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        const diag = await this.logExplicitDiagnostics('HTMLAudioElement media error', e);
        onError?.(diag);
        onEnd?.();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(async (err) => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          const diag = await this.logExplicitDiagnostics('Audio playback prevented by browser autoplay policy', err);
          onError?.(diag);
          onEnd?.();
        });
      }
    } catch (err) {
      const diag = await this.logExplicitDiagnostics('Fallback audio exception', err);
      onError?.(diag);
      onEnd?.();
    }
  }

  /**
   * Start speech recognition.
   */
  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (errorMsg: string) => void,
    onStatusChange?: (status: 'listening' | 'idle') => void
  ): boolean {
    if (!this.isRecognitionSupported()) {
      this.logExplicitDiagnostics('Speech Recognition is not supported by current browser');
      onError('Speech Recognition is not supported by your current browser.');
      return false;
    }

    try {
      // Cancel any ongoing speech so Jarvis doesn't talk while listening
      this.cancelSpeaking();

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (_) {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        onStatusChange?.('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript.trim()) {
          this.stopListening();
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = async (event: any) => {
        if (event.error === 'not-allowed') {
          this.isListeningActive = false;
          onStatusChange?.('idle');
          await this.logExplicitDiagnostics('Microphone permission denied by user or browser setting', event);
          onError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          // Soft timeout waiting for user speech
        } else if (event.error !== 'aborted') {
          await this.logExplicitDiagnostics(`Speech recognition notice: ${event.error}`, event);
          onError(`Speech recognition notice: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        if (this.isListeningActive) {
          try {
            this.recognition.start();
          } catch (_) {
            this.isListeningActive = false;
            onStatusChange?.('idle');
          }
        } else {
          onStatusChange?.('idle');
        }
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.logExplicitDiagnostics('Failed to start speech recognition', err);
      onError(err.message || 'Failed to start microphone listener');
      return false;
    }
  }

  /**
   * Stop listening for speech.
   */
  public stopListening() {
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
      this.recognition = null;
    }
  }

  /**
   * Speak a string out loud using Web Speech Synthesis with automatic audio fallback.
   * Completely stops listening while speaking to prevent microphone ducking and audio echo.
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) {
      onEnd?.();
      return;
    }

    // 1. Crucial: Stop microphone listening so it doesn't mute audio or hear the speaker
    this.stopListening();

    // 2. If SpeechSynthesis is completely unsupported, use audio fallback directly
    if (!this.isSynthesisSupported()) {
      this.logExplicitDiagnostics('Native SpeechSynthesis is not supported; engaging Web Audio fallback');
      this.playFallbackAudio(cleaned, onStart, onEnd, onError);
      return;
    }

    try {
      // Clear any prior speech
      this.cancelSpeaking();

      // Resume speech synthesis queue if paused (Chromium bugfix)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select natural voice
      const voices = this.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find((v) => (v.name.includes('Natural') || v.name.includes('Neural')) && v.lang.startsWith('en')) ||
          voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find((v) => (v.name.includes('Daniel') || v.name.includes('Samantha') || v.name.includes('Alex')) && v.lang.startsWith('en')) ||
          voices.find((v) => v.lang === 'en-US') ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (preferred) {
          utterance.voice = preferred;
        }
      }

      // Prevent garbage collection by storing in global Set
      activeUtterances.add(utterance);
      this.currentUtterance = utterance;

      let started = false;
      let finished = false;
      let watchdogTimer: any = null;

      const cleanupUtterance = () => {
        finished = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        activeUtterances.delete(utterance);
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        if (this.resumeWatchdog) {
          clearInterval(this.resumeWatchdog);
          this.resumeWatchdog = null;
        }
      };

      utterance.onstart = () => {
        started = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        onStart?.();
      };

      utterance.onend = () => {
        cleanupUtterance();
        onEnd?.();
      };

      utterance.onerror = async (event: any) => {
        // Normal intentional cancellation
        if (event.error === 'canceled' || event.error === 'interrupted') {
          cleanupUtterance();
          onEnd?.();
          return;
        }

        cleanupUtterance();
        const diag = await this.logExplicitDiagnostics(
          `Native SpeechSynthesis error [event.error="${event.error}"]`,
          event
        );
        onError?.(diag);

        // Fallback to Web Audio element if native synthesis failed or was interrupted/not-allowed
        this.playFallbackAudio(cleaned, onStart, onEnd, onError);
      };

      // Watchdog 1: Chrome sometimes pauses long utterances (>15s); resume periodically
      this.resumeWatchdog = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } else if (!started) {
          // Still waiting for start
        } else {
          clearInterval(this.resumeWatchdog);
          this.resumeWatchdog = null;
        }
      }, 1500);

      // Watchdog 2: SILENT FAILURE DETECTOR
      // If browser silently ignored speak() (never fired onstart within 1300ms)
      watchdogTimer = setTimeout(async () => {
        if (!started && !finished && this.currentUtterance === utterance) {
          const reason = window.speechSynthesis.paused
            ? 'SpeechSynthesis stuck in paused state (Chromium bug)'
            : 'SpeechSynthesis failed silently (no onstart event fired within 1300ms)';

          cleanupUtterance();
          const diag = await this.logExplicitDiagnostics(reason);
          onError?.(diag);

          // Engage primed Web Audio fallback
          this.playFallbackAudio(cleaned, onStart, onEnd, onError);
        }
      }, 1300);

      // Dispatch speak synchronously to preserve user activation gesture
      try {
        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        cleanupUtterance();
        this.logExplicitDiagnostics('Exception during window.speechSynthesis.speak()', err);
        this.playFallbackAudio(cleaned, onStart, onEnd, onError);
      }
    } catch (err) {
      this.logExplicitDiagnostics('Critical exception setting up utterance', err);
      this.playFallbackAudio(cleaned, onStart, onEnd, onError);
    }
  }

  /**
   * Immediately cancel any ongoing speech synthesis or audio playback.
   */
  public cancelSpeaking() {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (_) {}
      this.activeSourceNode = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }

    if (this.isSynthesisSupported()) {
      try {
        if (this.resumeWatchdog) {
          clearInterval(this.resumeWatchdog);
          this.resumeWatchdog = null;
        }
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch (_) {}
      this.currentUtterance = null;
      activeUtterances.clear();
    }
  }

  /**
   * Stop everything (both listening and speaking).
   */
  public stopAll() {
    this.stopListening();
    this.cancelSpeaking();
  }

  /**
   * Manual Diagnostic Test: Triggered by user to test synthesis and print explicit diagnostics.
   */
  public async testVoiceEngine(): Promise<SpeechDiagnostics> {
    this.initialize('manual_diagnostic_test');
    const diag = await this.logExplicitDiagnostics('Manual Voice Synthesis & Permission Test Triggered');
    this.speak('Jarvis voice synthesis online and fully operational, Sir.');
    return diag;
  }
}

export const speechManager = new SpeechManager();
