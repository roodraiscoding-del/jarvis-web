import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, MessageSquare, Volume2, Sparkles, AlertCircle, Radio, Activity, ShieldCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { SpeechDiagnostics } from '../types';

interface CentralJarvisControlProps {
  voiceMode: boolean;
  onToggleVoiceMode: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  speechTranscript: string;
  speechError: string | null;
  onDismissError?: () => void;
  isSpeechSupported: boolean;
  onTestVoice?: () => void;
  diagnostics?: SpeechDiagnostics | null;
}

export const CentralJarvisControl: React.FC<CentralJarvisControlProps> = ({
  voiceMode,
  onToggleVoiceMode,
  isListening,
  isSpeaking,
  isProcessing,
  speechTranscript,
  speechError,
  onDismissError,
  isSpeechSupported,
  onTestVoice,
  diagnostics,
}) => {
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(false);
  return (
    <div
      id="central-jarvis-control-panel"
      className={`relative w-full rounded-2xl p-4 sm:p-6 transition-all duration-500 overflow-hidden border ${
        voiceMode
          ? 'bg-gradient-to-b from-red-950/70 via-slate-950/90 to-red-950/60 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.25)]'
          : 'bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-900/80 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)]'
      }`}
    >
      {/* Background ambient grid pattern */}
      <div
        className={`absolute inset-0 opacity-15 pointer-events-none transition-opacity duration-500 ${
          voiceMode
            ? 'bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:18px_18px]'
            : 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:18px_18px]'
        }`}
      />

      {/* Decorative top corner technical accents */}
      <div className="absolute top-2 left-3 font-mono text-[9px] text-slate-500 flex items-center gap-2 select-none">
        <span
          className={`w-1.5 h-1.5 rounded-full animate-ping ${
            voiceMode ? 'bg-red-500' : 'bg-cyan-400'
          }`}
        />
        <span>CORE INTERACTION MATRIX • REV 3.8</span>
      </div>

      <div className="absolute top-2 right-3 font-mono text-[9px] text-slate-500 hidden sm:flex items-center gap-1.5 select-none">
        <span>PC TRIGGER:</span>
        <kbd
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
            voiceMode
              ? 'bg-red-950/80 text-red-300 border-red-500/50'
              : 'bg-slate-800 text-cyan-300 border-slate-700'
          }`}
        >
          SPACEBAR
        </kbd>
      </div>

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pt-2">
        {/* Mode Status Pill & Diagnostics Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-2 border transition-all duration-300 ${
              voiceMode
                ? 'bg-red-950/90 text-red-300 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-slate-900/90 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
            }`}
          >
            {voiceMode ? (
              <>
                <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>VOICE ASSISTANT MODE ACTIVE</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>CHAT MODE ACTIVE</span>
              </>
            )}
          </div>

          {onTestVoice && (
            <button
              id="test-voice-synthesis-btn"
              onClick={onTestVoice}
              type="button"
              className="px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 hover:text-cyan-100 border border-cyan-500/30 transition-all shadow-sm"
              title="Test speech synthesis and log explicit browser permissions in console"
            >
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <span>Test Voice & Permissions</span>
            </button>
          )}

          {diagnostics && (
            <button
              id="toggle-speech-diagnostics-btn"
              onClick={() => setShowDiagnosticsPanel((prev) => !prev)}
              type="button"
              className="px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700 transition-all"
              title="Inspect browser permission status and speech engine telemetry"
            >
              <Activity className="w-3 h-3 text-amber-400" />
              <span>Diagnostics</span>
              {showDiagnosticsPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Circular Jarvis Logo Button */}
        <div className="relative my-2">
          {/* Animated concentric acoustic shockwaves when listening or speaking */}
          {voiceMode && (
            <>
              <motion.div
                animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full border-2 border-red-500/50 pointer-events-none -m-3"
              />
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full border border-red-500/30 pointer-events-none -m-6"
              />
            </>
          )}

          {/* Main Button */}
          <button
            id="jarvis-central-logo-button"
            onClick={onToggleVoiceMode}
            type="button"
            aria-label={voiceMode ? 'Switch to Chat Mode' : 'Switch to Voice Assistant Mode'}
            title={
              voiceMode
                ? 'Tap or press Spacebar to return to Chat Mode'
                : 'Tap or press Spacebar to activate Voice Assistant'
            }
            className={`group relative w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 focus:outline-none focus:ring-4 ${
              voiceMode
                ? 'bg-gradient-to-b from-red-950 via-slate-950 to-red-950 border-2 border-red-500 shadow-[0_0_55px_rgba(239,68,68,0.7)] focus:ring-red-500/40 hover:scale-105'
                : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-500/70 shadow-[0_0_35px_rgba(6,182,212,0.4)] focus:ring-cyan-500/40 hover:scale-105'
            }`}
          >
            {/* Outer Orbiting Track 1 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: voiceMode ? 6 : 18,
                ease: 'linear',
              }}
              className={`absolute inset-0 m-1 rounded-full border border-dashed pointer-events-none ${
                voiceMode ? 'border-red-400/60' : 'border-cyan-400/40'
              }`}
            />

            {/* Counter Orbiting Track 2 */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                repeat: Infinity,
                duration: voiceMode ? 4 : 12,
                ease: 'linear',
              }}
              className={`absolute inset-0 m-3 rounded-full border pointer-events-none ${
                voiceMode ? 'border-red-500/50' : 'border-cyan-500/30'
              }`}
            >
              {/* Satellite nodes */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                  voiceMode
                    ? 'bg-red-400 shadow-[0_0_10px_#ef4444]'
                    : 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]'
                }`}
              />
              <div
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full ${
                  voiceMode
                    ? 'bg-red-400 shadow-[0_0_10px_#ef4444]'
                    : 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]'
                }`}
              />
            </motion.div>

            {/* Center Core Graphic */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {voiceMode ? (
                isSpeaking ? (
                  <Volume2 className="w-10 h-10 text-red-400 animate-bounce" />
                ) : isListening ? (
                  <Mic className="w-10 h-10 text-red-400 animate-pulse" />
                ) : isProcessing ? (
                  <Sparkles className="w-10 h-10 text-red-400 animate-spin" />
                ) : (
                  <Mic className="w-10 h-10 text-red-400" />
                )
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-cyan-400/80 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-transform">
                    <span className="font-mono font-bold text-base text-cyan-300 tracking-wider">
                      J
                    </span>
                  </div>
                </div>
              )}

              {/* Core Label */}
              <span
                className={`mt-1.5 font-mono font-bold text-[10px] tracking-widest uppercase transition-colors ${
                  voiceMode ? 'text-red-300' : 'text-cyan-300'
                }`}
              >
                {voiceMode
                  ? isSpeaking
                    ? 'SPEAKING'
                    : isListening
                    ? 'LISTENING'
                    : isProcessing
                    ? 'THINKING'
                    : 'VOICE ON'
                  : 'JARVIS CORE'}
              </span>

              {/* Sub-label action hint */}
              <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                {voiceMode ? 'TAP TO CHAT' : 'TAP FOR VOICE'}
              </span>
            </div>
          </button>
        </div>

        {/* Dynamic Status & Guidance */}
        <div className="mt-3 max-w-lg w-full px-2">
          {voiceMode ? (
            <div className="space-y-2">
              {/* Spoken Transcript Live Bar */}
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-xs font-mono text-slate-200 min-h-[42px] flex items-center justify-center">
                {speechTranscript ? (
                  <span className="italic text-red-200 animate-pulse">
                    "{speechTranscript}"
                  </span>
                ) : isSpeaking ? (
                  <span className="flex items-center gap-2 text-red-300">
                    <Volume2 className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                    Jarvis is responding out loud...
                  </span>
                ) : isProcessing ? (
                  <span className="flex items-center gap-2 text-red-300">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    Executing command & synthesizing speech...
                  </span>
                ) : (
                  <span className="text-red-300/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Speak now: e.g., "Schedule a meeting tomorrow at 2 PM" or "Check my calendar"
                  </span>
                )}
              </div>

              {/* Voice mode interactive equalizer animation */}
              <div className="flex items-center justify-center gap-1 h-3">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isListening || isSpeaking ? [4, 14, 6, 12, 4] : [4, 4, 4],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      delay: i * 0.08,
                      ease: 'easeInOut',
                    }}
                    className={`w-1 rounded-full ${
                      voiceMode ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-cyan-500'
                    }`}
                  />
                ))}
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Tap button or press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-red-300 border border-red-500/40">Spacebar</kbd> to return to Chat Mode
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-mono text-slate-300">
                Ready for commands. Type in the terminal below or toggle Voice Assistant.
              </p>
              <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">Spacebar</kbd>
                  <span>for Voice Mode</span>
                </span>
                <span>•</span>
                <span>Mobile: Tap Center Logo</span>
              </div>
            </div>
          )}

          {/* Graceful Fallback Notice if Web Speech not supported */}
          {!isSpeechSupported && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs font-mono flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Web Speech API is unavailable in this browser environment. Jarvis has fallen back to Chat Mode.
              </span>
            </div>
          )}

          {/* Transient Speech Error Toast */}
          <AnimatePresence>
            {speechError && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-2 p-2.5 rounded bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{speechError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowDiagnosticsPanel(true)}
                    className="text-cyan-400 hover:text-cyan-200 text-[11px] underline"
                  >
                    View Diagnostics
                  </button>
                  {onDismissError && (
                    <button
                      onClick={onDismissError}
                      className="text-red-400 hover:text-red-200 text-[11px] underline"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Diagnostic Telemetry Panel */}
          <AnimatePresence>
            {showDiagnosticsPanel && diagnostics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 w-full rounded-xl bg-slate-950/90 border border-slate-700/80 p-3.5 text-left text-xs font-mono space-y-2.5 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>AUDIO & SPEECH SUBSYSTEM TELEMETRY</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Updated: {diagnostics.lastEventTimestamp}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Microphone</span>
                    </span>
                    <span
                      className={`font-semibold capitalize ${
                        diagnostics.permissions.microphone === 'granted'
                          ? 'text-emerald-400'
                          : diagnostics.permissions.microphone === 'denied'
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {diagnostics.permissions.microphone}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Synthesis Voices</span>
                    </span>
                    <span className="text-slate-200 font-semibold">
                      {diagnostics.isSynthesisSupported
                        ? `${diagnostics.speechSynthesisState.voicesCount} loaded (${diagnostics.speechSynthesisState.defaultVoice || 'Default'})`
                        : 'Not Supported'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Web Audio Context</span>
                    </span>
                    <span
                      className={`font-semibold capitalize ${
                        diagnostics.isAudioContextReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {diagnostics.audioContextState}
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-300">
                  <div className="text-slate-400 font-semibold mb-0.5">Status & Recommendation:</div>
                  <div className="text-cyan-200">{diagnostics.recommendation || 'All audio policies nominal.'}</div>
                  {diagnostics.lastFailureReason && (
                    <div className="mt-1 text-red-300 text-[10px]">
                      Last incident: {diagnostics.lastFailureReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Console command: logs explicit table on each speech action
                  </span>
                  {onTestVoice && (
                    <button
                      onClick={onTestVoice}
                      className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Run Voice Test & Re-prime</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
