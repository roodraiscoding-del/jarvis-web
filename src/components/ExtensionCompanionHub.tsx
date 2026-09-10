import React, { useState, useEffect } from 'react';
import { Shield, Download, Play, Pause, ArrowDown, ArrowUp, ExternalLink, Globe, MonitorCheck, Search, MousePointer, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { BrowserTabRule, BrowserAutomationCommand } from '../types';

interface ExtensionHubProps {
  // Companion hub props
}

export const ExtensionCompanionHub: React.FC<ExtensionHubProps> = () => {
  const [tabRules, setTabRules] = useState<BrowserTabRule[]>([]);
  const [logs, setLogs] = useState<BrowserAutomationCommand[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [selectedFileCode, setSelectedFileCode] = useState<{ filename: string; content: string } | null>(null);

  // Tab Launcher State
  const [targetEngine, setTargetEngine] = useState<'ddg' | 'google' | 'youtube' | 'wiki'>('ddg');
  const [searchQuery, setSearchQuery] = useState('Autonomous AI Agent Architecture');
  const [clickTargetText, setClickTargetText] = useState('First Search Result');

  // In-app Tab Simulator State
  const [simulatedScrollY, setSimulatedScrollY] = useState(0);
  const [simulatedVideoPlaying, setSimulatedVideoPlaying] = useState(false);
  const [simulatedTabDomain, setSimulatedTabDomain] = useState('duckduckgo.com');
  const [simulatedSearchText, setSimulatedSearchText] = useState('Autonomous AI Agent Architecture');
  const [clickedElement, setClickedElement] = useState<string | null>(null);
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

  const constructSearchUrl = (engine: string, query: string) => {
    if (engine === 'google') return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    if (engine === 'youtube') return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (engine === 'wiki') return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
    return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  };

  const handleOpenLiveTabAndSearch = async () => {
    const url = constructSearchUrl(targetEngine, searchQuery);
    const engineName = targetEngine === 'google' ? 'Google' : targetEngine === 'youtube' ? 'YouTube' : targetEngine === 'wiki' ? 'Wikipedia' : 'DuckDuckGo';

    // 1. Record command on server
    try {
      await fetch('/api/automation-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open_tab',
          tabUrl: url,
          tabTitle: `${engineName} Search: "${searchQuery}"`,
          searchQuery,
          scrollAmount: 500,
          targetText: clickTargetText
        })
      });
      fetchRulesAndLogs();
    } catch (e) {
      console.error(e);
    }

    // 2. Open tab in real browser window
    window.open(url, '_blank', 'noopener,noreferrer');
    setLastActionMessage(`✓ Opened new ${engineName} tab with query "${searchQuery}"!`);
  };

  const handleSimulateAction = async (
    action: 'scroll_down' | 'scroll_up' | 'scroll_top' | 'scroll_bottom' | 'play_video' | 'pause_video' | 'search' | 'click_element'
  ) => {
    try {
      const res = await fetch('/api/automation-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          tabUrl: `https://${simulatedTabDomain}`,
          tabTitle: `${simulatedTabDomain} Active Tab`,
          searchQuery: simulatedSearchText,
          targetText: clickTargetText,
          scrollAmount: action === 'scroll_down' ? 400 : action === 'scroll_up' ? -400 : 0
        })
      });

      const data = await res.json();
      if (data.success) {
        if (action === 'scroll_down') {
          setSimulatedScrollY(prev => Math.min(prev + 300, 1500));
          setLastActionMessage('✓ Scrolled simulated tab down 300px (Authorized)');
        } else if (action === 'scroll_up') {
          setSimulatedScrollY(prev => Math.max(prev - 300, 0));
          setLastActionMessage('✓ Scrolled simulated tab up 300px (Authorized)');
        } else if (action === 'scroll_top') {
          setSimulatedScrollY(0);
          setLastActionMessage('✓ Scrolled simulated tab to top (Authorized)');
        } else if (action === 'scroll_bottom') {
          setSimulatedScrollY(1500);
          setLastActionMessage('✓ Scrolled simulated tab to bottom (Authorized)');
        } else if (action === 'search') {
          setSimulatedScrollY(0);
          setLastActionMessage(`✓ Dispatched search for "${simulatedSearchText}" on ${simulatedTabDomain}`);
        } else if (action === 'click_element') {
          setClickedElement(clickTargetText);
          setLastActionMessage(`✓ Targeted and clicked element "${clickTargetText}" with glowing reticle focus`);
          setTimeout(() => setClickedElement(null), 2500);
        } else if (action === 'play_video') {
          setSimulatedVideoPlaying(true);
          setLastActionMessage('✓ HTML5 Video Playing (Authorized)');
        } else if (action === 'pause_video') {
          setSimulatedVideoPlaying(false);
          setLastActionMessage('✓ HTML5 Video Paused (Authorized)');
        }
      } else {
        setLastActionMessage('✕ ACTION REJECTED: Tab domain is NOT in your whitelist. Explicit permission enforced.');
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

      const readme = files.find((f: any) => f.filename === 'README.md');
      const blob = new Blob([readme?.content || 'Jarvis Extension Guide'], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'JARVIS_COMPANION_SETUP_GUIDE.md';
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
    <div className="hud-card rounded-xl p-4 flex flex-col h-[650px]">
      {/* Header */}
      <div className="border-b border-cyan-500/20 pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-sm text-cyan-300">
              AUTONOMOUS BROWSER AUTOMATION COMPANION
            </span>
          </div>
          <button
            onClick={handleDownloadExtension}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Guide & Extension</span>
          </button>
        </div>
        <p className="text-[11px] font-mono text-cyan-400/90 mt-1">
          ✓ PERMISSION PROTOCOL: Jarvis is authorized to open tabs, execute searches, scroll DOM offsets, and click targeted elements on user-approved domains.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Module 1: Autonomous Tab Opener & Search Launcher */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>LAUNCH NEW TAB & EXECUTE SEARCH</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              LIVE AUTOMATION READY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Search Engine</label>
              <select
                value={targetEngine}
                onChange={(e) => setTargetEngine(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="ddg">DuckDuckGo (Safe & Fast)</option>
                <option value="google">Google Search</option>
                <option value="youtube">YouTube Videos</option>
                <option value="wiki">Wikipedia Articles</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 block mb-1">Search Query</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. AI Agent workflows, autonomous browsing..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                />
                <button
                  onClick={handleOpenLiveTabAndSearch}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tab Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Interactive Browser Viewport Simulator */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <MonitorCheck className="w-4 h-4 text-cyan-400" />
              <span>ACTIVE TAB VIEWPORT & DOM CONTROLLER</span>
            </div>
            <select
              value={simulatedTabDomain}
              onChange={(e) => setSimulatedTabDomain(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
            >
              <option value="duckduckgo.com">duckduckgo.com (Allowed)</option>
              <option value="google.com">google.com (Allowed)</option>
              <option value="youtube.com">youtube.com (Allowed)</option>
              <option value="en.wikipedia.org">en.wikipedia.org (Allowed)</option>
              <option value="twitter.com">twitter.com (Restricted)</option>
            </select>
          </div>

          {/* Fake browser UI */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
            {/* Fake browser URL bar with search */}
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 flex-1">
                <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-cyan-300 font-mono truncate">https://{simulatedTabDomain}/?q={encodeURIComponent(simulatedSearchText)}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">Scroll: {simulatedScrollY}px</span>
            </div>

            {/* Fake tab body with scroll & click effects */}
            <div className="p-4 h-40 overflow-hidden relative text-[11px] text-slate-400">
              <div
                className="transition-transform duration-300 space-y-3"
                style={{ transform: `translateY(-${simulatedScrollY / 5}px)` }}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">
                    Results for: <span className="text-cyan-400">"{simulatedSearchText}"</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Page 1 of 5</span>
                </div>

                {/* Result 1 */}
                <div
                  className={`p-2.5 rounded-lg border transition-all ${
                    clickedElement === 'First Search Result' || clickedElement === 'Result 1'
                      ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>1. Autonomous AI Agent Architecture & Automation</span>
                    {clickedElement === 'First Search Result' && (
                      <span className="text-[10px] bg-cyan-600 text-slate-950 font-bold px-1.5 py-0.5 rounded animate-pulse">
                        CLICKED & FOCUSED
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Comprehensive study on multi-model routing, web navigation, and zero-coding companion extension integration.
                  </p>
                </div>

                {/* Result 2 */}
                <div
                  className={`p-2.5 rounded-lg border transition-all ${
                    clickedElement === 'Second Search Result' || clickedElement === 'Result 2'
                      ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>2. Deep-Dive: Browser Automation Security & Consent</span>
                    {clickedElement === 'Second Search Result' && (
                      <span className="text-[10px] bg-cyan-600 text-slate-950 font-bold px-1.5 py-0.5 rounded animate-pulse">
                        CLICKED & FOCUSED
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Safe DOM scrolling, per-tab explicit permission gates, and secure media controls.
                  </p>
                </div>

                {/* Video / Media control box */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span>Embedded HTML5 Media Player:</span>
                  <span className="font-bold text-cyan-300">
                    {simulatedVideoPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Controller Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleSimulateAction('scroll_down')}
                className="flex items-center justify-center gap-1.5 p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px]"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Scroll Down (300px)</span>
              </button>
              <button
                onClick={() => handleSimulateAction('scroll_up')}
                className="flex items-center justify-center gap-1.5 p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px]"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Scroll Up (300px)</span>
              </button>
              <button
                onClick={() => handleSimulateAction('scroll_top')}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Scroll to Top
              </button>
              <button
                onClick={() => handleSimulateAction('scroll_bottom')}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Scroll to Bottom
              </button>
            </div>

            {/* Click target element bar */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={clickTargetText}
                onChange={(e) => setClickTargetText(e.target.value)}
                placeholder="Element name (e.g. First Search Result, Result 2)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200"
              />
              <button
                onClick={() => handleSimulateAction('click_element')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Click Target</span>
              </button>
              <button
                onClick={() => handleSimulateAction(simulatedVideoPlaying ? 'pause_video' : 'play_video')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs"
              >
                {simulatedVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{simulatedVideoPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>
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

        {/* Module 3: Explicit Authorization Whitelist */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-200 font-bold">EXPLICIT PER-TAB AUTHORIZATION WHITELIST</span>
            <span className="text-slate-400 text-[10px]">Security Policy Gate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tabRules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="text-slate-200 font-semibold truncate">{rule.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{rule.urlPattern}</div>
                </div>
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors shrink-0 ${
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
              placeholder="e.g. reddit.com or stackoverflow.com"
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

        {/* Module 4: Automation Command Audit Log */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-200 font-bold">
            <span>AUTOMATION AUDIT TRAIL ({logs.length})</span>
            <button onClick={fetchRulesAndLogs} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {logs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[11px]"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 uppercase">{log.action.replace('_', ' ')}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      log.status === 'executed' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{log.details || log.tabTitle}</div>
                </div>
                {log.tabUrl && (
                  <a
                    href={log.tabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 shrink-0"
                    title="Open Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Module 5: Extension Source Code Inspector */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono text-xs">
          <div className="text-slate-200 font-bold flex items-center justify-between">
            <span>INSPECT EXTENSION SOURCE (MANIFEST V3)</span>
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
              <pre className="text-[10px] text-slate-300 max-h-48 overflow-y-auto p-2 bg-slate-900/80 rounded font-mono">
                {selectedFileCode.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
