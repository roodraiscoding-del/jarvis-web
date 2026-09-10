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
    // Remove bold/italic markers
    .replace(/[*_#~]/g, '')
    // Remove bullet point symbols
    .replace(/^[\s-•*]+/gm, '')
    // Clean multiple whitespaces
    .replace(/\s+/g, ' ')
    .trim();
}

class SpeechManager {
  private recognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isListeningActive = false;

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
      // Cancel any ongoing speech so Jarvis doesn't listen to himself
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
          onResult(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResult(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          onError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          // Normal timeout waiting for speech, don't show noisy error
        } else if (event.error !== 'aborted') {
          onError(`Speech recognition notice: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        // If still marked as active, restart unless aborted
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
   * Speak a string using Web Speech Synthesis.
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    if (!this.isSynthesisSupported()) {
      onEnd?.();
      return;
    }

    try {
      this.cancelSpeaking();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) {
        onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'en-US';
      utterance.rate = 1.05; // Slightly brisk, clear assistant pace
      utterance.pitch = 1.0;

      // Select natural sounding voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Daniel') ||
            v.name.includes('Samantha') ||
            v.name.includes('Alex')) &&
          v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        console.warn('Speech synthesis error:', e);
        onError?.(e);
        onEnd?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis threw:', err);
      onEnd?.();
    }
  }

  /**
   * Immediately cancel any ongoing speech synthesis.
   */
  public cancelSpeaking() {
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      this.currentUtterance = null;
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
