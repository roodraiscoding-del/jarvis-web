import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, ExternalLink, Calendar, Bell, Share2, Compass, Play, FileText } from 'lucide-react';
import { ChatMessage } from '../types';
import { playJarvisSound } from '../utils/audioSynth';

interface CommandTerminalProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  soundEnabled: boolean;
  onSendCommand: (cmd: string) => void;
  voiceMode?: boolean;
  focusTrigger?: number;
}

const QUICK_PROMPTS = [
  { label: '📅 Schedule Meeting', text: 'Schedule a strategy meeting with the engineering team tomorrow at 2:00 PM' },
  { label: '⏰ Set Daily Reminder', text: 'Remind me to check Groq & Gemini free-tier rate limits at 6:00 PM' },
  { label: '✍️ Draft Social Post', text: 'Draft a YouTube post announcing our free-tier autonomous Jarvis agent' },
  { label: '🎵 Play Synthwave', text: 'Play synthwave cyber focus music' },
  { label: '🌐 Web Research', text: 'Search what are the latest breakthroughs in open-source AI agent models' },
  { label: '📜 Scroll Allowed Tab', text: 'Scroll down 500px on the active permitted browser tab' },
];

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  messages,
  isProcessing,
  soundEnabled,
  onSendCommand,
  voiceMode = false,
  focusTrigger = 0,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  // When switching to Chat mode (focusTrigger updates), auto-focus the text input box
  useEffect(() => {
    if (focusTrigger > 0 && !voiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusTrigger, voiceMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isProcessing) return;
    const text = inputVal.trim();
    setInputVal('');
    if (soundEnabled) playJarvisSound('command_ack');
    onSendCommand(text);
  };

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Voice fallback for browsers or iframes without permission
      setInputVal('Schedule meeting with product team tomorrow at 10 AM');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputVal(transcript);
        }
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'schedule_meeting': return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'set_reminder': return <Bell className="w-4 h-4 text-amber-400" />;
      case 'draft_social_post': return <Share2 className="w-4 h-4 text-emerald-400" />;
      case 'web_research': return <Compass className="w-4 h-4 text-blue-400" />;
      case 'media_control': return <Play className="w-4 h-4 text-purple-400" />;
      case 'summarize_doc': return <FileText className="w-4 h-4 text-pink-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="hud-card rounded-xl flex flex-col h-[580px] overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-500/20 bg-slate-950/70 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-cyan-400 font-semibold ml-2">JARVIS COMMAND TERMINAL</span>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          STATUS: <span className="text-emerald-400">READY FOR VOICE OR TEXT</span>
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-sm">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[95%] sm:max-w-[85%] ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              {/* Sender & Timestamp */}
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1 px-1">
                <span>{isUser ? 'YOU (OPERATOR)' : 'JARVIS AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>

                {/* Model badge if assistant */}
                {!isUser && msg.providerUsed && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] border ${
                      msg.fallbackTriggered
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                        : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {msg.providerUsed}
                  </span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-cyan-600/20 border border-cyan-500/40 text-slate-100 rounded-tr-none'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.text}

                {/* Fallback Notice Banner */}
                {!isUser && msg.fallbackTriggered && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-300">Free-Tier Fallback Cascade Engaged</div>
                      <div className="text-amber-200/80 text-[10px] mt-0.5">
                        {msg.fallbackReason || 'Primary provider hit free quota limit; seamlessly rerouted to maintain uninterrupted service.'}
                      </div>
                      {msg.fallbackChain && msg.fallbackChain.length > 0 && (
                        <div className="text-[10px] text-amber-300/70 mt-1 font-mono">
                          Cascade Path: {msg.fallbackChain.join(' → ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Taken Badge & Summary Card */}
                {!isUser && msg.actionTaken && (
                  <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs">
                    <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-1">
                      {getActionIcon(msg.actionTaken.type)}
                      <span>ACTION EXECUTED: {msg.actionTaken.type.toUpperCase().replace('_', ' ')}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      {msg.actionTaken.description}
                    </div>
                  </div>
                )}

                {/* Web Research Sources */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                      <Compass className="w-3 h-3 text-blue-400" />
                      <span>GROUNDED SOURCES ({msg.sources.length})</span>
                    </div>
                    <div className="space-y-1">
                      {msg.sources.slice(0, 3).map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 text-cyan-300 hover:text-cyan-200 transition-colors"
                        >
                          <span className="truncate pr-2">{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono p-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Jarvis is routing command through free-tier model network...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendCommand(qp.text)}
            className="whitespace-nowrap px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition-colors font-mono text-[11px]"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-cyan-500/20 bg-slate-950 flex items-center gap-2">
        <button
          type="button"
          onClick={handleVoiceInput}
          title="Voice command input"
          className={`p-2.5 rounded-lg border transition-colors ${
            isListening
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          id="jarvis-command-input"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            voiceMode
              ? "Voice Mode Active: Speak or tap spacebar to switch to typing..."
              : "Command Jarvis (e.g., 'Schedule meeting tomorrow at 3pm', 'Draft post', 'Play music')..."
          }
          disabled={isProcessing}
          className={`flex-1 bg-slate-900/90 border rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 font-mono transition-colors focus:outline-none focus:ring-1 ${
            voiceMode
              ? 'border-red-500/40 focus:border-red-500 focus:ring-red-500/50'
              : 'border-slate-800 focus:border-cyan-500/60 focus:ring-cyan-500/50'
          }`}
        />

        <button
          id="jarvis-command-send-btn"
          type="submit"
          disabled={!inputVal.trim() || isProcessing}
          className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-slate-950 font-semibold text-sm flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
