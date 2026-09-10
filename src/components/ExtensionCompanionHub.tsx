import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Download, Code, Play, Pause, ArrowDown, ArrowUp, Check, X, ExternalLink, Globe, MonitorCheck } from 'lucide-react';
import { BrowserTabRule, BrowserAutomationCommand } from '../types';

interface ExtensionHubProps {
  // Companion hub props
}

export const ExtensionCompanionHub: React.FC<ExtensionHubProps> = () => {
  const [tabRules, setTabRules] = useState<BrowserTabRule[]>([]);
  const [logs, setLogs] = useState<BrowserAutomationCommand[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [selectedFileCode, setSelectedFileCode] = useState<{ filename: string; content: string } | null>(null);

  // In-app Tab Simulator State
  const [simulatedScrollY, setSimulatedScrollY] = useState(0);
  const [simulatedVideoPlaying, setSimulatedVideoPlaying] = useState(false);
  const [simulatedTabDomain, setSimulatedTabDomain] = useState('youtube.com');
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const fetchRulesAndLogs = async () => {
    try {
      const [rulesRes, logsRes] = await Promise.all([
        fetch('/api/tab-rules'),
        fetch('/api/automation-logs')
      ]);
      if (rulesRes.ok) setTabRules(await rulesRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err) {
      console.error('Error fetching tab rules:', err);
    }
  };

  useEffect(() => {
    fetchRulesAndLogs();
  }, []);

  const handleToggleRule = async (id: string) => {
    try {
      const res = await fetch(`/api/tab-rules/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        fetchRulesAndLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      const formatted = newDomain.startsWith('http') ? newDomain : `https://${newDomain}/*`;
      const res = await fetch('/api/tab-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlPattern: formatted, title: newDomain, isAllowed: true })
      });
      if (res.ok) {
        setNewDomain('');
        fetchRulesAndLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateAction = async (action: 'scroll_down' | 'scroll_up' | 'play_video' | 'pause_video') => {
    try {
      const res = await fetch('/api/automation-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          tabUrl: `https://${simulatedTabDomain}/active-page`,
          tabTitle: `${simulatedTabDomain} Active Tab`
        })
      });

      const data = await res.json();
      if (data.success) {
        if (action === 'scroll_down') {
          setSimulatedScrollY(prev => Math.min(prev + 300, 1200));
          setLastActionMessage('✓ Scrolled simulated tab down 300px (Authorized)');
        } else if (action === 'scroll_up') {
          setSimulatedScrollY(prev => Math.max(prev - 300, 0));
          setLastActionMessage('✓ Scrolled simulated tab up 300px (Authorized)');
        } else if (action === 'play_video') {
          setSimulatedVideoPlaying(true);
          setLastActionMessage('✓ HTML5 Video Playing (Authorized)');
        } else if (action === 'pause_video') {
          setSimulatedVideoPlaying(false);
          setLastActionMessage('✓ HTML5 Video Paused (Authorized)');
        }
      } else {
        setLastActionMessage('✕ ACTION REJECTED: Tab domain is NOT in your allowed list. Explicit permission enforced.');
      }
      fetchRulesAndLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadExtension = async () => {
    try {
      const res = await fetch('/api/extension/files');
      const files = await res.json();

      // Download README and manifest directly as easy test
      const readme = files.find((f: any) => f.filename === 'README.md');
      const blob = new Blob([readme?.content || 'Jarvis Extension'], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'JARVIS_EXTENSION_SETUP_GUIDE.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewFile = async (filename: string) => {
    try {
      const res = await fetch('/api/extension/files');
      const files = await res.json();
      const file = files.find((f: any) => f.filename === filename);
      if (file) {
        setSelectedFileCode(file);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Header */}
      <div className="border-b border-cyan-500/20 pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-sm text-cyan-300">
              BROWSER AUTOMATION COMPANION
            </span>
          </div>
          <button
            onClick={handleDownloadExtension}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Extension</span>
          </button>
        </div>
        <p className="text-[11px] font-mono text-cyan-400/90 mt-1">
          ✓ STRICT SAFETY MANDATE: Chrome/Brave Extension acts ONLY on explicitly authorized tabs. Never silent; never unapproved.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Whitelisted Domains Management */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-200 font-bold">EXPLICIT PER-TAB AUTHORIZATION WHITELIST</span>
            <span className="text-slate-400 text-[10px]">User Controlled</span>
          </div>

          <div className="space-y-2">
            {tabRules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div className="space-y-0.5">
                  <div className="text-slate-200 font-semibold">{rule.title}</div>
                  <div className="text-[10px] text-slate-500">{rule.urlPattern}</div>
                </div>
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    rule.isAllowed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {rule.isAllowed ? '✓ Allowed' : '✕ Restricted'}
                </button>
              </div>
            ))}
          </div>

          {/* Add custom domain whitelist */}
          <form onSubmit={handleAddDomain} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. github.com or twitch.tv"
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs rounded"
            >
              Add Domain
            </button>
          </form>
        </div>

        {/* Live Tab Automation Simulator */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <MonitorCheck className="w-4 h-4 text-cyan-400" />
              <span>LIVE TAB AUTOMATION TESTER</span>
            </div>
            <select
              value={simulatedTabDomain}
              onChange={(e) => setSimulatedTabDomain(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
            >
              <option value="youtube.com">youtube.com (Allowed)</option>
              <option value="news.ycombinator.com">news.ycombinator.com (Allowed)</option>
              <option value="twitter.com">twitter.com (Restricted)</option>
            </select>
          </div>

          {/* Mock Browser Viewport */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
            {/* Fake browser URL bar */}
            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="truncate">https://{simulatedTabDomain}/watch?v=demo</span>
              <span className="text-[9px] text-cyan-400">Scroll Offset: {simulatedScrollY}px</span>
            </div>

            {/* Fake tab body with scroll effect */}
            <div className="p-3 h-28 overflow-hidden relative text-[11px] text-slate-400">
              <div
                className="transition-transform duration-300"
                style={{ transform: `translateY(-${simulatedScrollY / 10}px)` }}
              >
                <div className="font-bold text-slate-200 mb-1">
                  Active Page Content ({simulatedTabDomain})
                </div>
                <p className="leading-relaxed">
                  Video Status: {simulatedVideoPlaying ? '▶ PLAYING (HTML5 video active)' : '⏸ PAUSED'}
                </p>
                <p className="text-slate-500 text-[10px] mt-2">
                  Paragraph 1: Testing DOM scroll displacement and media event listeners.
                </p>
                <p className="text-slate-500 text-[10px] mt-2">
                  Paragraph 2: The companion extension content script dispatches smooth scrollBy commands.
                </p>
                <p className="text-slate-500 text-[10px] mt-2">
                  Paragraph 3: Safe execution confirmed: strictly stops if user toggled domain off.
                </p>
              </div>
            </div>
          </div>

          {/* Simulator Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleSimulateAction('scroll_down')}
              className="flex items-center justify-center gap-1 p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px]"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Scroll Down</span>
            </button>
            <button
              onClick={() => handleSimulateAction('scroll_up')}
              className="flex items-center justify-center gap-1 p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px]"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Scroll Up</span>
            </button>
            <button
              onClick={() => handleSimulateAction(simulatedVideoPlaying ? 'pause_video' : 'play_video')}
              className="flex items-center justify-center gap-1 p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px]"
            >
              {simulatedVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{simulatedVideoPlaying ? 'Pause Video' : 'Play Video'}</span>
            </button>
            <button
              onClick={() => {
                setSimulatedScrollY(0);
                setSimulatedVideoPlaying(false);
              }}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px]"
            >
              Reset Tab
            </button>
          </div>

          {/* Feedback banner */}
          {lastActionMessage && (
            <div className={`p-2 rounded text-[11px] font-semibold ${
              lastActionMessage.includes('REJECTED')
                ? 'bg-red-950/60 border border-red-800 text-red-300'
                : 'bg-cyan-950/60 border border-cyan-800 text-cyan-300'
            }`}>
              {lastActionMessage}
            </div>
          )}
        </div>

        {/* Source Code Inspector */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono text-xs">
          <div className="text-slate-200 font-bold flex items-center justify-between">
            <span>INSPECT EXTENSION SOURCE FILES (MANIFEST V3)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['manifest.json', 'content.js', 'popup.html', 'popup.js', 'background.js', 'README.md'].map((fn) => (
              <button
                key={fn}
                onClick={() => handleViewFile(fn)}
                className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-[11px]"
              >
                {fn}
              </button>
            ))}
          </div>

          {selectedFileCode && (
            <div className="mt-3 p-3 rounded bg-slate-950 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
                <span>{selectedFileCode.filename}</span>
                <button onClick={() => setSelectedFileCode(null)} className="text-slate-400 hover:text-slate-200">✕</button>
              </div>
              <pre className="text-[10px] text-slate-300 max-h-48 overflow-y-auto p-2 bg-slate-900/80 rounded">
                {selectedFileCode.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
