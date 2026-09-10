/**
 * Web Speech API service for Jarvis Voice Assistant.
 * Uses native browser SpeechRecognition and SpeechSynthesis.
 * 100% free and native, no paid external speech APIs required.
 */

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
  private isListeningActive = false;
  private voicesCache: SpeechSynthesisVoice[] = [];
  private resumeWatchdog: any = null;
  private primed = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.refreshVoices();
      };
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
   * Prime the speech synthesis and audio engines on direct user interaction (click/tap/spacebar).
   * Unlocks browser audio playback policy for asynchronous speech.
   */
  public primeVoiceEngine(greeting?: string, onDone?: () => void) {
    this.primed = true;

    // 1. Prime SpeechSynthesis if available
    if (this.isSynthesisSupported()) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Speak a silent micro-utterance to unlock synthesis thread
        const silentUtterance = new SpeechSynthesisUtterance(' ');
        silentUtterance.volume = 0.01;
        window.speechSynthesis.speak(silentUtterance);
      } catch (_) {}
    }

    // 2. Prime HTML Audio element to unlock autoplay in iframe
    try {
      const dummyAudio = new Audio();
      dummyAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      dummyAudio.play().catch(() => {});
    } catch (_) {}

    if (greeting) {
      this.speak(greeting, undefined, onDone, onDone);
    } else {
      onDone?.();
    }
  }

  /**
   * Fallback audio playback using server-side TTS proxy
   */
  private playFallbackAudio(
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

      audio.onerror = (e) => {
        console.warn('Audio fallback error:', e);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        onError?.(e);
        onEnd?.();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio playback prevented by policy:', err);
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          onError?.(err);
          onEnd?.();
        });
      }
    } catch (err) {
      console.warn('Audio fallback failed to initiate:', err);
      onError?.(err);
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
          // Stop listening immediately upon final spoken phrase to avoid mic contention
          this.stopListening();
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          this.isListeningActive = false;
          onStatusChange?.('idle');
          onError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          // Soft timeout waiting for speech, ignore without dropping listener
        } else if (event.error !== 'aborted') {
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
      console.error('Failed to start speech recognition:', err);
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

      const cleanupUtterance = () => {
        finished = true;
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
        onStart?.();
      };

      utterance.onend = () => {
        cleanupUtterance();
        onEnd?.();
      };

      utterance.onerror = (e: any) => {
        cleanupUtterance();
        console.warn('Native speech synthesis error, switching to audio fallback:', e);
        // Fallback to audio element if native synthesis failed or was interrupted/not-allowed
        this.playFallbackAudio(cleaned, onStart, onEnd, onError);
      };

      // Watchdog 1: Chrome sometimes pauses long utterances (>15s); resume periodically
      this.resumeWatchdog = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } else {
          clearInterval(this.resumeWatchdog);
          this.resumeWatchdog = null;
        }
      }, 2000);

      // Watchdog 2: If browser silently ignored speak() (never fired onstart within 1.2s)
      setTimeout(() => {
        if (!started && !finished && this.currentUtterance === utterance) {
          console.warn('Native synthesis failed to start within timeout, activating fallback audio');
          cleanupUtterance();
          this.playFallbackAudio(cleaned, onStart, onEnd, onError);
        }
      }, 1200);

      // Speak utterance with brief setTimeout to avoid Chromium cancel() race condition
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.resume();
        } catch (err) {
          cleanupUtterance();
          this.playFallbackAudio(cleaned, onStart, onEnd, onError);
        }
      }, 35);
    } catch (err) {
      console.warn('Speech synthesis threw, activating fallback audio:', err);
      this.playFallbackAudio(cleaned, onStart, onEnd, onError);
    }
  }

  /**
   * Immediately cancel any ongoing speech synthesis or audio playback.
   */
  public cancelSpeaking() {
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
}

export const speechManager = new SpeechManager();

