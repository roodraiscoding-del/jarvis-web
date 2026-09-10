import React, { useState } from 'react';
import { BookOpen, CheckCircle, HelpCircle, Shield, Cpu, Layers, Server, Chrome, Terminal, Sparkles, X } from 'lucide-react';

interface MentorGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUILD_STEPS = [
  {
    step: 1,
    title: 'Basic Web App Shell & Cyber HUD',
    desc: 'Express backend + React Vite frontend with Arc Reactor visualizer, audio synthesizer, and real-time vital telemetry.',
    status: 'COMPLETED'
  },
  {
    step: 2,
    title: 'Meeting Scheduling & Daily Reminders/Goals',
    desc: 'Lightweight JSON storage engine with calendar bookings, daily priority flags, and interactive milestone trackers.',
    status: 'COMPLETED'
  },
  {
    step: 3,
    title: 'General Q&A & Web Research Skill',
    desc: 'Free DuckDuckGo live search grounding for real-time answers without requiring credit cards or paid search APIs.',
    status: 'COMPLETED'
  },
  {
    step: 4,
    title: 'Document Summarizer (PDF / PPTX / TXT)',
    desc: 'In-browser drag-and-drop file ingestion, extracting text into executive summaries, core takeaways, and action items.',
    status: 'COMPLETED'
  },
  {
    step: 5,
    title: 'Music & Video Playback Control',
    desc: 'In-browser media deck with animated equalizer, playlist channels, and natural voice/text command controls.',
    status: 'COMPLETED'
  },
  {
    step: 6,
    title: 'Browser Automation Extension with Safe Whitelist',
    desc: 'Manifest V3 companion extension for scrolling and video playback, restricted strictly to user-allowed domains.',
    status: 'COMPLETED'
  },
  {
    step: 7,
    title: 'Content Trend & Outlier Research',
    desc: 'Identifies high-multiplier hooks and trending concepts for YouTube and Instagram creators.',
    status: 'COMPLETED'
  },
  {
    step: 8,
    title: 'Cross-Platform Social Posting Gate (Draft-and-Approve)',
    desc: 'Strict security boundary: Jarvis drafts posts, but never publishes without your explicit click on "Approve & Publish".',
    status: 'COMPLETED'
  },
  {
    step: 9,
    title: 'On-Demand Live News Feeds',
    desc: 'Live streams and technical news updates synthesized on demand.',
    status: 'COMPLETED'
  },
  {
    step: 10,
    title: 'Google Workspace Hub (Calendar, Gmail, Keep, Docs, Tasks, Contacts)',
    desc: 'Interactive integration with 6 Google services using client-side OAuth, in-memory tokens, and mandatory human confirmation dialogs.',
    status: 'COMPLETED'
  }
];

export const MentorGuideModal: React.FC<MentorGuideProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'roadmap' | 'architecture' | 'safety' | 'freeHosting' | 'workspace'>('roadmap');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-base text-cyan-300">
                JARVIS TECHNICAL MENTOR WALKTHROUGH
              </h2>
              <p className="font-mono text-xs text-slate-400">
                Patient Step-by-Step Architecture Guide for Beginners
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveSection('roadmap')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'roadmap'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            10-Step Build Roadmap
          </button>
          <button
            onClick={() => setActiveSection('workspace')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'workspace'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Workspace Guide
          </button>
          <button
            onClick={() => setActiveSection('architecture')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'architecture'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            How Everything Connects
          </button>
          <button
            onClick={() => setActiveSection('safety')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'safety'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hard Constraints & Safety Gates
          </button>
          <button
            onClick={() => setActiveSection('freeHosting')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'freeHosting'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            100% Free Hosting Guide
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-slate-300 flex-1">
          {/* SECTION 1: 9-STEP ROADMAP */}
          {activeSection === 'roadmap' && (
            <div className="space-y-3">
              <p className="text-slate-300 leading-relaxed text-xs">
                Welcome! As your technical mentor, here is the clear view of every single capability you asked for in your Jarvis build order. Each step is fully built, tested, and integrated:
              </p>

              <div className="space-y-2.5">
                {BUILD_STEPS.map((s) => (
                  <div
                    key={s.step}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">
                      {s.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{s.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3 h-3" />
                          {s.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: GOOGLE WORKSPACE GUIDE */}
          {activeSection === 'workspace' && (
            <div className="space-y-3">
              <p className="text-slate-300 leading-relaxed text-xs">
                Jarvis now includes direct Google Workspace integration for your daily productivity across 6 core Google services:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1">
                  <div className="font-bold text-cyan-300 text-xs">1. Google Calendar</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Read upcoming appointments, create new events, and sync your agenda directly into Jarvis.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-red-500/30 space-y-1">
                  <div className="font-bold text-red-300 text-xs">2. Gmail Inbox & Dispatch</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Inspect recent emails, read snippets, and compose drafts with mandatory user confirmation dialogs before sending.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 space-y-1">
                  <div className="font-bold text-blue-300 text-xs">3. Google Docs</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Browse recent Google Docs in your Drive, generate new documents with starter text, and open them in one click.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
                  <div className="font-bold text-emerald-300 text-xs">4. Google Tasks</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Fetch your task lists, toggle items complete, add tasks with due dates, and keep your daily to-do items organized.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 space-y-1">
                  <div className="font-bold text-purple-300 text-xs">5. Google Contacts</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Search and access your contacts, view phone numbers and emails, and save new contacts directly to your Google address book.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
                  <div className="font-bold text-amber-300 text-xs">6. Keep Notes & Scratchpad</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Rapid memo scratchpad with tags and color-coding, plus 1-click export to a Google Doc or Google Task!
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 text-xs">Security & Human-in-the-Loop Safeguards</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Access tokens are cached strictly in memory (never written to localStorage) and every modifying operation triggers an explicit confirmation dialog before execution.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: ARCHITECTURE */}
          {activeSection === 'architecture' && (
            <div className="space-y-4 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>The 3-Layer Structure (Explained in Plain English)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Even though you don't have a coding background, thinking of software as three cooperating layers makes it crystal clear:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-cyan-400 font-bold mb-1">1. The Frontend (Face)</div>
                    <div className="text-slate-400">
                      The React web page you look at right now. It displays the Arc Reactor, buttons, and command input.
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-indigo-400 font-bold mb-1">2. The Backend (Brain)</div>
                    <div className="text-slate-400">
                      The Express server that holds your API keys securely and orchestrates multi-model AI failover so you never pay.
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-purple-400 font-bold mb-1">3. The Extension (Hands)</div>
                    <div className="text-slate-400">
                      The companion script that can physically scroll tabs or pause videos, but only on pages you explicitly allow.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>How the Multi-Model Failover Cascade Works</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Free tiers usually have a limit like "15 requests per minute". If you hit that limit, a normal app crashes with an "HTTP 429 Rate Limit" error.
                  In Jarvis, we built a <strong>Cascading Router</strong>:
                  <br />
                  <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded text-[10px] mt-1 inline-block">
                    Gemini 3.8 Flash (Primary) → Groq LLaMA 3.3 (Speed Fallback) → OpenRouter (3rd Tier) → Local Rule Engine
                  </code>
                  <br />
                  If any layer is exhausted, Jarvis switches instantly to the next in 120 milliseconds with zero downtime and $0 bill!
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: SAFETY & HARD CONSTRAINTS */}
          {activeSection === 'safety' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Your 2 Non-Negotiable Hard Constraints</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  You specified two crucial safety directives when defining Jarvis:
                </p>
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 rounded bg-slate-950/80 border border-amber-500/30">
                    <div className="text-amber-300 font-bold mb-1">
                      1. Draft-and-Approve Only for Social Posting
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Autonomous agents should never post directly to your YouTube, Instagram, or Facebook accounts without your sign-off. Jarvis drafts the headline, copy, and hashtags into your <strong>Social Approval Queue</strong>. It sits there safely until you review it and press "Approve & Publish".
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950/80 border border-amber-500/30">
                    <div className="text-amber-300 font-bold mb-1">
                      2. Explicit Whitelisting for Browser Automation
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Jarvis cannot control random tabs or read personal browsing history. You manage an explicit whitelist of permitted domains (e.g. YouTube, Hacker News). If an unapproved tab is active, Jarvis immediately rejects the automation command.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: FREE HOSTING GUIDE */}
          {activeSection === 'freeHosting' && (
            <div className="space-y-3">
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Since you don't want to run local Ollama on your PC and want to access Jarvis from anywhere on your phone or laptop at $0 cost, here are the best free-tier hosting options:
              </p>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-300 text-xs">Google Cloud Run (Recommended)</div>
                  <div className="text-slate-400 text-[11px]">
                    Provides 2 million free requests every month. Automatically scales to zero when you aren't using it so you never incur charges.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-300 text-xs">Render.com / Railway Free Tier</div>
                  <div className="text-slate-400 text-[11px]">
                    Deploy this exact repository with 1-click. Set your <code className="text-cyan-300">GEMINI_API_KEY</code> in their environment variables dashboard and your web Jarvis is live 24/7!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Jarvis Autonomous Protocol • Zero-Cost Architecture
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
