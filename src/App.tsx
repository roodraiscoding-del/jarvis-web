import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { ArcReactorVisualizer } from './components/ArcReactorVisualizer';
import { CentralJarvisControl } from './components/CentralJarvisControl';
import { CommandTerminal } from './components/CommandTerminal';
import { SchedulePanel } from './components/SchedulePanel';
import { SocialApprovalQueue } from './components/SocialApprovalQueue';
import { MediaPlayerHUD } from './components/MediaPlayerHUD';
import { DocumentSummarizer } from './components/DocumentSummarizer';
import { ExtensionCompanionHub } from './components/ExtensionCompanionHub';
import { WebResearchHub } from './components/WebResearchHub';
import { MentorGuideModal } from './components/MentorGuideModal';
import { GoogleWorkspaceHub } from './components/GoogleWorkspaceHub';
import {
  ChatMessage,
  Meeting,
  Reminder,
  DailyGoal,
  SocialDraft,
  SystemStatusData,
} from './types';
import { Calendar, Share2, Shield, Music, FileText, Compass, Info, CheckCircle2, Sparkles, Mic, Radio } from 'lucide-react';
import { playVoiceButtonSound } from './utils/audioSynth';
import { speechManager } from './utils/speechService';

export default function App() {
  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'workspace' | 'social_approval' | 'browser_companion' | 'summarizer' | 'research' | 'media'
  >('schedule');
  const [isMentorGuideOpen, setIsMentorGuideOpen] = useState(false);

  // Central Jarvis Mode & Voice Assistant State (Single Source of Truth)
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const voiceModeRef = useRef<boolean>(false);

  // Synchronize ref with state to prevent stale closures in speech and keyboard listeners
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  // System & Processing State
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastFallbackTriggered, setLastFallbackTriggered] = useState(false);
  const [externalMediaCommand, setExternalMediaCommand] = useState<{
    action: 'play' | 'pause' | 'next';
    timestamp: number;
  } | null>(null);

  // Core Data Collections
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg-1',
      role: 'assistant',
      text: 'Good day, Operator. I am Jarvis, your autonomous personal AI agent web terminal.\n\nAll 9 core modules are online: Meeting scheduling, daily reminders/goals, DuckDuckGo grounded research, document summarization, voice-controlled media, companion browser automation with strict tab whitelisting, and our draft-and-approve social posting gateway.\n\nHow may I assist your workflow today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: 'Google Gemini 3.8 Flash (Free Tier)',
      modelUsed: 'gemini-2.5-flash'
    }
  ]);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [socialDrafts, setSocialDrafts] = useState<SocialDraft[]>([]);

  // Fetch all live state from server
  const loadSystemState = useCallback(async () => {
    try {
      const [statusRes, meetingsRes, remindersRes, goalsRes, draftsRes] = await Promise.all([
        fetch('/api/system-status'),
        fetch('/api/meetings'),
        fetch('/api/reminders'),
        fetch('/api/goals'),
        fetch('/api/social-drafts')
      ]);

      const isJson = (res: Response) => res.ok && (res.headers.get('content-type')?.includes('application/json') ?? false);

      if (isJson(statusRes)) setStatusData(await statusRes.json());
      if (isJson(meetingsRes)) setMeetings(await meetingsRes.json());
      if (isJson(remindersRes)) setReminders(await remindersRes.json());
      if (isJson(goalsRes)) setGoals(await goalsRes.json());
      if (isJson(draftsRes)) setSocialDrafts(await draftsRes.json());
    } catch (err) {
      console.error('Error refreshing Jarvis system state:', err);
    }
  }, []);

  useEffect(() => {
    loadSystemState();
  }, [loadSystemState]);

  // Voice Assistant Lifecycle Controls
  const stopVoiceAssistant = useCallback(() => {
    speechManager.stopAll();
    setIsListening(false);
    setIsSpeaking(false);
    setSpeechTranscript('');
  }, []);

  // Command Execution Pipeline
  const handleSendCommand = useCallback(
    async (commandText: string, options?: { speakResponse?: boolean }) => {
      if (!commandText.trim() || isProcessing) return;

      const shouldSpeak = options?.speakResponse ?? voiceModeRef.current;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        text: commandText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsProcessing(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: commandText }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const rawData = await res.json();
        const replyText = rawData.text || rawData.reply || '';
        const replyData: ChatMessage = {
          ...rawData,
          id: rawData.id || `msg-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: rawData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, replyData]);

        if (replyData.fallbackTriggered) {
          setLastFallbackTriggered(true);
        }

        // If in Voice Assistant Mode (or requested), speak response out loud using Speech Engine
        if (shouldSpeak && replyText) {
          setIsSpeaking(true);
          speechManager.speak(
            replyText,
            () => setIsSpeaking(true),
            () => {
              setIsSpeaking(false);
              // If user is still in voice mode, resume listening for next query
              if (voiceModeRef.current) {
                startListeningLoop();
              }
            },
            () => {
              setIsSpeaking(false);
              if (voiceModeRef.current) {
                startListeningLoop();
              }
            }
          );
        }

        // Automatically switch tab or sync if action requires user attention
        if (replyData.actionTaken) {
          const actionType = replyData.actionTaken.type;

          if (actionType === 'google_workspace') {
            setActiveTab('workspace');
          } else if (actionType === 'draft_social_post') {
            setActiveTab('social_approval');
            await loadSystemState();
          } else if (
            actionType === 'schedule_meeting' ||
            actionType === 'delete_meeting' ||
            actionType === 'view_schedule' ||
            actionType === 'set_reminder' ||
            actionType === 'delete_reminder' ||
            actionType === 'complete_reminder' ||
            actionType === 'view_reminders' ||
            actionType === 'manage_goal'
          ) {
            setActiveTab('schedule');
            await loadSystemState();
          } else if (actionType === 'media_control') {
            setActiveTab('media');
            const intent = replyData.actionTaken.details?.command || replyData.actionTaken.details?.intent || 'play';
            setExternalMediaCommand({ action: intent, timestamp: Date.now() });
          } else if (actionType === 'browse_tab' || actionType === 'browser_automation') {
            setActiveTab('browser_companion');
          } else if (actionType === 'web_research') {
            setActiveTab('research');
          }
        }

        // Refresh system vitals
        await loadSystemState();
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: 'I encountered an unexpected network interruption. Please verify connectivity or retry your command.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            providerUsed: 'Local Failover Core',
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    // Note: startListeningLoop is referenced inside callback closure
    [isProcessing, loadSystemState]
  );

  const startListeningLoop = useCallback(() => {
    if (!speechManager.isRecognitionSupported()) {
      setSpeechError('Web Speech API is not supported in this browser. Chat Mode remains active.');
      setVoiceMode(false);
      return;
    }

    const started = speechManager.startListening(
      (transcript, isFinal) => {
        setSpeechTranscript(transcript);
        if (isFinal && transcript.trim()) {
          handleSendCommand(transcript, { speakResponse: true });
        }
      },
      (err) => {
        console.warn('Speech recognition notice:', err);
        setSpeechError(err);
        if (err.toLowerCase().includes('denied') || err.toLowerCase().includes('not supported')) {
          setVoiceMode(false);
          stopVoiceAssistant();
        }
      },
      (status) => {
        setIsListening(status === 'listening');
      }
    );

    if (!started) {
      setVoiceMode(false);
    }
  }, [handleSendCommand, stopVoiceAssistant]);

  const startVoiceAssistant = useCallback(() => {
    if (!speechManager.isRecognitionSupported()) {
      setSpeechError('Web Speech API is not supported on this browser. Jarvis has fallen back to Chat Mode.');
      setVoiceMode(false);
      return;
    }

    setSpeechError(null);
    setSpeechTranscript('');
    playVoiceButtonSound('activate');
    speechManager.primeVoiceEngine();

    startListeningLoop();
  }, [startListeningLoop]);

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode((prev) => {
      const next = !prev;
      voiceModeRef.current = next;
      if (next) {
        startVoiceAssistant();
      } else {
        stopVoiceAssistant();
        setFocusTrigger((c) => c + 1);
        playVoiceButtonSound('deactivate');
      }
      return next;
    });
  }, [startVoiceAssistant, stopVoiceAssistant]);

  // Keyboard shortcut listener: Spacebar toggles voice mode
  // Only triggers when no text input/textarea/select is focused so it doesn't interfere with typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT';

        if (!isInput) {
          e.preventDefault();
          toggleVoiceMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVoiceMode]);

  // Clean up any ongoing speech synthesis or speech recognition on unmount
  useEffect(() => {
    return () => {
      speechManager.stopAll();
    };
  }, []);

  // Toggle simulated rate limit to show the user how multi-model failover works in real time
  const handleToggleSimulatedRateLimit = async () => {
    try {
      const res = await fetch('/api/simulate-fallback', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLastFallbackTriggered(Boolean(data.simulatedRateLimitActive ?? data.simulateRateLimitActive));
        await loadSystemState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Meeting Handlers
  const handleAddMeeting = async (meetingData: Omit<Meeting, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      });
      if (res.ok) {
        const created = await res.json();
        setMeetings((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reminder Handlers
  const handleToggleReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReminder = async (remData: Omit<Reminder, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remData)
      });
      if (res.ok) {
        const created = await res.json();
        setReminders((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Goal handler
  const handleToggleGoal = (id: string, completed: boolean) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, completed, progressPercent: completed ? 100 : Math.max(g.progressPercent - 30, 20) }
          : g
      )
    );
  };

  // Social Draft Handlers (Draft and Approve Gateway)
  const handleApproveDraft = async (id: string) => {
    try {
      const res = await fetch(`/api/social-drafts/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setSocialDrafts((prev) => prev.map((d) => (d.id === id ? updated : d)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectDraft = async (id: string) => {
    try {
      const res = await fetch(`/api/social-drafts/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setSocialDrafts((prev) => prev.map((d) => (d.id === id ? updated : d)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDraft = async (draftData: Omit<SocialDraft, 'id' | 'createdAt' | 'status'>) => {
    try {
      const res = await fetch('/api/social-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
      if (res.ok) {
        const created = await res.json();
        setSocialDrafts((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDraftFromTrend = (topic: string, platform: 'youtube' | 'instagram') => {
    handleCreateDraft({
      platform,
      title: `Breakout Content: ${topic}`,
      content: `🔥 Breakthrough concept: ${topic}\n\nKey Insight: Autonomous AI agents are shifting to deterministic local fallbacks and human-in-the-loop signoff.\n\nWatch full breakdown on YouTube!`,
      tags: ['#AIAgent', '#TechBreakthrough', '#FutureOfTech', '#DeveloperTips'],
      estimatedReach: '15K - 30K Views'
    });
    setActiveTab('social_approval');
  };

  const pendingDraftsCount = socialDrafts.filter((d) => d.status === 'pending_approval').length;
  const activeModelName = statusData?.providers.find((p) => p.isCurrentPrimary)?.name || 'Gemini 3.8 Flash';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${
        voiceMode
          ? 'theme-voice-active bg-[#060204] text-slate-100 selection:bg-red-500/30 selection:text-red-200'
          : 'bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200'
      }`}
    >
      {/* Dynamic Voice Mode Status Banner */}
      {voiceMode && (
        <div className="bg-red-950/95 border-b border-red-500/60 py-1.5 px-4 text-center text-xs font-mono text-red-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.35)]">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
          <span className="font-bold tracking-wider">VOICE ASSISTANT MODE LIVE</span>
          <span className="text-red-400 hidden sm:inline">• LISTENING FOR COMMANDS • SPEECH-TO-SPEECH ACTIVE</span>
          <span className="text-slate-400 text-[11px] hidden md:inline">• PRESS SPACEBAR OR TAP LOGO TO REVERT TO CHAT</span>
        </div>
      )}

      {/* Top Sci-Fi Navigation HUD */}
      <HeaderHUD
        statusData={statusData}
        onOpenMentorGuide={() => setIsMentorGuideOpen(true)}
        onRefreshStatus={loadSystemState}
        onToggleSimulatedRateLimit={handleToggleSimulatedRateLimit}
        voiceMode={voiceMode}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Top Arc Reactor & Quick Status Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Arc Reactor Core Visualizer */}
          <div className="lg:col-span-4 flex flex-col">
            <ArcReactorVisualizer
              isProcessing={isProcessing}
              activeModelName={activeModelName}
              fallbackTriggered={lastFallbackTriggered}
              voiceMode={voiceMode}
              onToggleVoiceMode={toggleVoiceMode}
            />
          </div>

          {/* Right Column: Mission Control & Capability Modules Navigation Bar */}
          <div className="lg:col-span-8 hud-card rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      voiceMode
                        ? 'bg-red-400 shadow-[0_0_8px_#ef4444]'
                        : 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                    }`}
                  />
                  <h1
                    className={`font-mono font-bold text-sm sm:text-base transition-colors ${
                      voiceMode ? 'text-red-300' : 'text-cyan-300'
                    }`}
                  >
                    JARVIS AUTONOMOUS AGENT CONSOLE
                  </h1>
                </div>
                <button
                  onClick={() => setIsMentorGuideOpen(true)}
                  className={`text-xs font-mono flex items-center gap-1 underline underline-offset-4 transition-colors ${
                    voiceMode
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Architecture & Zero-Cost Guide</span>
                </button>
              </div>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                Free-tier cloud agent designed for browser access. Includes multi-model failover (Gemini → Groq → Edge), human-in-the-loop social approval gate, and companion browser extension controls.
              </p>
            </div>

            {/* Navigation Buttons for the 7 Core Capability Workspaces */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-4 pt-3 border-t border-slate-800/80 font-mono text-xs">
              <button
                onClick={() => setActiveTab('workspace')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center relative ${
                  activeTab === 'workspace'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-cyan-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="font-semibold text-[11px]">Workspace</span>
                <span className="text-[9px] text-cyan-400/90 font-mono">6 Google APIs</span>
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'schedule'
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-[11px]">Schedule</span>
                <span className="text-[9px] text-slate-500">{meetings.length} Events</span>
              </button>

              <button
                onClick={() => setActiveTab('social_approval')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center relative ${
                  activeTab === 'social_approval'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {pendingDraftsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-bounce">
                    {pendingDraftsCount}
                  </span>
                )}
                <Share2 className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-[11px]">Approval Gate</span>
                <span className="text-[9px] text-slate-500">Draft & Sign</span>
              </button>

              <button
                onClick={() => setActiveTab('browser_companion')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'browser_companion'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-[11px]">Browser Hub</span>
                <span className="text-[9px] text-slate-500">Extension Safe</span>
              </button>

              <button
                onClick={() => setActiveTab('summarizer')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'summarizer'
                    ? 'bg-pink-500/20 border-pink-500/60 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 text-pink-400" />
                <span className="font-semibold text-[11px]">Summarizer</span>
                <span className="text-[9px] text-slate-500">PDF / PPTX</span>
              </button>

              <button
                onClick={() => setActiveTab('research')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'research'
                    ? 'bg-blue-500/20 border-blue-500/60 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-[11px]">Research</span>
                <span className="text-[9px] text-slate-500">Trends & Web</span>
              </button>

              <button
                onClick={() => setActiveTab('media')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'media'
                    ? 'bg-purple-500/20 border-purple-500/60 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Music className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-[11px]">Media Deck</span>
                <span className="text-[9px] text-slate-500">Voice Control</span>
              </button>
            </div>
          </div>
        </div>

        {/* Central Jarvis Dual-Mode Interaction Matrix (Single Tap/Spacebar Toggle) */}
        <CentralJarvisControl
          voiceMode={voiceMode}
          onToggleVoiceMode={toggleVoiceMode}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          speechTranscript={speechTranscript}
          speechError={speechError}
          onDismissError={() => setSpeechError(null)}
          isSpeechSupported={speechManager.isRecognitionSupported()}
        />

        {/* Dual Panel Layout: Command Terminal on Left, Active Workspace Panel on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Command Terminal (Chat, Speech, Failover logs) */}
          <div className="lg:col-span-6 w-full">
            <CommandTerminal
              messages={messages}
              isProcessing={isProcessing}
              onSendCommand={handleSendCommand}
              voiceMode={voiceMode}
              focusTrigger={focusTrigger}
              onSpeakMessage={(text) => {
                setIsSpeaking(true);
                speechManager.speak(
                  text,
                  () => setIsSpeaking(true),
                  () => setIsSpeaking(false),
                  () => setIsSpeaking(false)
                );
              }}
            />
          </div>

          {/* Active Workspace Deck */}
          <div className="lg:col-span-6 w-full">
            {activeTab === 'workspace' && (
              <GoogleWorkspaceHub />
            )}

            {activeTab === 'schedule' && (
              <SchedulePanel
                meetings={meetings}
                reminders={reminders}
                goals={goals}
                onAddMeeting={handleAddMeeting}
                onDeleteMeeting={handleDeleteMeeting}
                onToggleReminder={handleToggleReminder}
                onAddReminder={handleAddReminder}
                onDeleteReminder={handleDeleteReminder}
                onToggleGoal={handleToggleGoal}
              />
            )}

            {activeTab === 'social_approval' && (
              <SocialApprovalQueue
                drafts={socialDrafts}
                onApproveDraft={handleApproveDraft}
                onRejectDraft={handleRejectDraft}
                onPublishDraft={handleApproveDraft}
                onCreateDraft={handleCreateDraft}
              />
            )}

            {activeTab === 'browser_companion' && (
              <ExtensionCompanionHub />
            )}

            {activeTab === 'summarizer' && (
              <DocumentSummarizer />
            )}

            {activeTab === 'research' && (
              <WebResearchHub
                onDraftFromTrend={handleDraftFromTrend}
              />
            )}

            {activeTab === 'media' && (
              <MediaPlayerHUD
                externalCommand={externalMediaCommand}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer Vitals Bar */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-2 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>JARVIS NEURAL CORE • PORT 3000 • 100% FREE-TIER CLOUD INFRASTRUCTURE</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Active Provider: <span className="text-cyan-400">{activeModelName}</span></span>
          <span>•</span>
          <span>Draft-and-Approve: <span className="text-emerald-400 font-semibold">ENFORCED</span></span>
        </div>
      </footer>

      {/* Technical Mentor Architecture Guide Modal */}
      <MentorGuideModal
        isOpen={isMentorGuideOpen}
        onClose={() => setIsMentorGuideOpen(false)}
      />
    </div>
  );
}
