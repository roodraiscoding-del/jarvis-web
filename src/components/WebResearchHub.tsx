import React, { useState, useEffect } from 'react';
import {
  Compass,
  TrendingUp,
  Newspaper,
  ExternalLink,
  Sparkles,
  Search,
  ArrowRight,
  Share2,
  Cpu,
  Globe,
  Copy,
  Check,
  FileText,
  Layers,
  Database,
  Link as LinkIcon,
  Tag,
  Loader2,
  RefreshCw,
  Zap,
  CheckCircle2,
  Flame
} from 'lucide-react';
import { HermesScrapeResult, HermesResearchResult } from '../types';

interface WebResearchHubProps {
  onDraftFromTrend: (topic: string, platform: 'youtube' | 'instagram') => void;
}

const TRENDING_CONTENT_OUTLIERS = [
  {
    topic: 'How to Build a 100% Free AI Agent Without Subscriptions',
    platform: 'youtube' as const,
    outlierScore: '4.8x avg views',
    hook: '"Stop paying $20/month for AI wrappers. Here is the exact zero-cost architecture..."',
    velocity: 'Breakout',
    targetViews: '35K - 60K'
  },
  {
    topic: 'Why We Enforce Human Approval for Social Media AI',
    platform: 'instagram' as const,
    outlierScore: '3.2x engagement',
    hook: '"One accidental AI post can destroy 5 years of brand trust. Here is our failsafe gate..."',
    velocity: 'High',
    targetViews: '12K - 20K'
  },
  {
    topic: 'Browser Automation with Safe Manifest V3 Extensions',
    platform: 'youtube' as const,
    outlierScore: '2.9x avg views',
    hook: '"How to control your browser with natural voice commands without security risks..."',
    velocity: 'Trending',
    targetViews: '18K - 28K'
  }
];

export const WebResearchHub: React.FC<WebResearchHubProps> = ({ onDraftFromTrend }) => {
  const [activeTab, setActiveTab] = useState<'hermes' | 'trends' | 'search' | 'news'>('hermes');

  // Standard Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [newsFeed, setNewsFeed] = useState<any[]>([]);

  // Hermes AI State
  const [hermesMode, setHermesMode] = useState<'scraper' | 'research'>('scraper');
  const [scrapeUrl, setScrapeUrl] = useState('https://news.ycombinator.com');
  const [scrapeInstruction, setScrapeInstruction] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<HermesScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const [hermesResearchQuery, setHermesResearchQuery] = useState('Nous Research Hermes 3 agent capabilities and web scraping');
  const [hermesDepth, setHermesDepth] = useState<'fast' | 'deep'>('deep');
  const [isHermesResearching, setIsHermesResearching] = useState(false);
  const [hermesResearchResult, setHermesResearchResult] = useState<HermesResearchResult | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/news')
      .then(res => {
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          return res.json();
        }
        return [];
      })
      .then(data => {
        if (Array.isArray(data)) setNewsFeed(data);
      })
      .catch(err => console.error('Failed to load news:', err));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Standard search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      });
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Hermes AI Web Scraping Handler
  const handleHermesScrape = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const target = (customUrl || scrapeUrl).trim();
    if (!target) return;

    setIsScraping(true);
    setScrapeError(null);
    try {
      const res = await fetch('/api/hermes/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          instruction: scrapeInstruction.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to scrape webpage');
      }
      setScrapeResult(data);
    } catch (err: any) {
      setScrapeError(err.message || 'Scraping request failed');
    } finally {
      setIsScraping(false);
    }
  };

  // Hermes AI Deep Research Handler
  const handleHermesResearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery || hermesResearchQuery).trim();
    if (!query) return;

    setIsHermesResearching(true);
    try {
      const res = await fetch('/api/hermes/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          depth: hermesDepth
        })
      });
      const data = await res.json();
      if (res.ok) {
        setHermesResearchResult(data);
      }
    } catch (err) {
      console.error('Hermes research failed:', err);
    } finally {
      setIsHermesResearching(false);
    }
  };

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Main Tab Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800 flex-wrap">
          {/* Hermes AI Tab (Primary Specialist) */}
          <button
            id="tab-hermes-agent"
            onClick={() => setActiveTab('hermes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
              activeTab === 'hermes'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hermes AI (Scraper & Research)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/70 border border-emerald-400/40 text-emerald-300 uppercase tracking-wider">
              NOUS
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'trends'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Outliers</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'search'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Standard Search</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'news'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News Feed</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-xs">
        {/* =================================================================== */}
        {/* HERMES AI SPECIALIST TAB (SCRAPING & DEEP RESEARCH) */}
        {/* =================================================================== */}
        {activeTab === 'hermes' && (
          <div className="space-y-4">
            {/* Header info badge */}
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-emerald-300 font-semibold">Nous Research Hermes-3 Engine</span>
                <span className="text-slate-400 hidden sm:inline">• Autonomous Web Scraping & Deep Multi-Source Synthesis</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 text-[10px]">
                <span>Status: Fully Armed</span>
              </div>
            </div>

            {/* Submode Switcher: Web Scraper vs Deep Research */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setHermesMode('scraper')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                  hermesMode === 'scraper'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live URL Web Scraper</span>
              </button>
              <button
                onClick={() => setHermesMode('research')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                  hermesMode === 'research'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deep Multi-Source Research</span>
              </button>
            </div>

            {/* SUBMODE 1: LIVE URL WEB SCRAPER */}
            {hermesMode === 'scraper' && (
              <div className="space-y-3">
                <form onSubmit={handleHermesScrape} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="url"
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        placeholder="https://news.ycombinator.com or target URL..."
                        className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isScraping}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isScraping ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Scraping...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Scrape with Hermes</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Optional Custom Extraction Instruction */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={scrapeInstruction}
                      onChange={(e) => setScrapeInstruction(e.target.value)}
                      placeholder="Optional directive (e.g. 'Extract pricing, architectural breakthroughs, or key citations')..."
                      className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </form>

                {/* Quick URL Presets */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                  <span className="text-slate-500">Presets:</span>
                  {[
                    { label: 'Hacker News', url: 'https://news.ycombinator.com' },
                    { label: 'Wikipedia: Agents', url: 'https://en.wikipedia.org/wiki/Intelligent_agent' },
                    { label: 'GitHub Trending', url: 'https://github.com/trending' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setScrapeUrl(p.url);
                        handleHermesScrape(undefined, p.url);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {scrapeError && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                    {scrapeError}
                  </div>
                )}

                {/* Scraped Results Display */}
                {scrapeResult && (
                  <div className="space-y-3 pt-2 animate-in fade-in">
                    {/* Header Card */}
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-slate-100 text-xs">{scrapeResult.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            {scrapeResult.wordCount} words
                          </span>
                          <a
                            href={scrapeResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-400"
                            title="Open Target URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-slate-800/80">
                        {scrapeResult.structuredSummary}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => copyToClipboard(scrapeResult.structuredSummary, 'scrape_summary')}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          {copiedKey === 'scrape_summary' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'scrape_summary' ? 'Copied' : 'Copy Summary'}</span>
                        </button>
                        <button
                          onClick={() => onDraftFromTrend(scrapeResult.title, 'youtube')}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Draft Content Post</span>
                        </button>
                      </div>
                    </div>

                    {/* Data Points & Identified Entities */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Telemetry / Data Points */}
                      <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          <span>QUANTITATIVE DATA POINTS</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {scrapeResult.keyDataPoints.map((dp, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-500">•</span>
                              <span>{dp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Identified Entities */}
                      <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-cyan-400 font-bold text-[10px] flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>KEY ENTITIES EXTRACTED</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {scrapeResult.keyEntities.map((ent, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
                            >
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Extracted Headings */}
                    {scrapeResult.headings.length > 0 && (
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 space-y-1.5">
                        <div className="text-slate-400 font-bold text-[10px] flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-500" />
                          <span>DOM HEADINGS HIERARCHY ({scrapeResult.headings.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {scrapeResult.headings.map((h, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-900/60 text-slate-300 border border-slate-800">
                              #{i + 1} {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Outgoing Links */}
                    {scrapeResult.extractedLinks.length > 0 && (
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 space-y-1.5">
                        <div className="text-slate-400 font-bold text-[10px] flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-slate-500" />
                          <span>EXTRACTED OUTBOUND LINKS ({scrapeResult.extractedLinks.length})</span>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {scrapeResult.extractedLinks.map((l, i) => (
                            <a
                              key={i}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900 text-[10px] text-cyan-300 transition-colors"
                            >
                              <span className="truncate">{l.text}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUBMODE 2: DEEP MULTI-SOURCE RESEARCH */}
            {hermesMode === 'research' && (
              <div className="space-y-3">
                <form onSubmit={handleHermesResearch} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hermesResearchQuery}
                      onChange={(e) => setHermesResearchQuery(e.target.value)}
                      placeholder="Enter research inquiry for Hermes AI agent..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <select
                      value={hermesDepth}
                      onChange={(e) => setHermesDepth(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="deep">Deep Investigation</option>
                      <option value="fast">Fast Synthesis</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isHermesResearching}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isHermesResearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Investigating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Run Hermes Research</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Preset Inquiries */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                  <span className="text-slate-500">Presets:</span>
                  {[
                    'Nous Hermes 3 reasoning & tool capabilities',
                    'Autonomous AI agent architectures 2026',
                    'Zero cost LLM cascades and local failovers'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setHermesResearchQuery(preset);
                        handleHermesResearch(undefined, preset);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Research Output Display */}
                {hermesResearchResult && (
                  <div className="space-y-3 pt-2 animate-in fade-in">
                    {/* Executive Brief */}
                    <div className="p-3.5 rounded-lg bg-slate-900/95 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-emerald-300">
                          <Cpu className="w-4 h-4 text-emerald-400" />
                          <span>HERMES-3 SYNTHESIZED EXECUTIVE BRIEF</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{hermesResearchResult.completedAt}</span>
                      </div>
                      <p className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap">
                        {hermesResearchResult.executiveBrief}
                      </p>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => copyToClipboard(hermesResearchResult.executiveBrief, 'research_brief')}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          {copiedKey === 'research_brief' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'research_brief' ? 'Copied' : 'Copy Brief'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Key Findings & Data Points */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-emerald-400 font-bold text-[10px]">CORE FINDINGS</div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {hermesResearchResult.keyFindings.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-500 shrink-0">✓</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-cyan-400 font-bold text-[10px]">DATA POINTS & METRICS</div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {hermesResearchResult.dataPoints.map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-cyan-500 shrink-0">📈</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Recommendations */}
                    {hermesResearchResult.actionableInsights.length > 0 && (
                      <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="text-amber-400 font-bold text-[10px]">STRATEGIC TAKEAWAYS & NEXT ACTIONS</div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {hermesResearchResult.actionableInsights.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-400 shrink-0">→</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Verified Sources */}
                    <div className="space-y-1.5">
                      <div className="text-slate-400 text-[10px] font-bold">
                        VERIFIED SOURCES CRAWLED ({hermesResearchResult.scrapedSources.length})
                      </div>
                      {hermesResearchResult.scrapedSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] transition-colors"
                        >
                          <div className="text-cyan-300 font-medium flex items-center justify-between">
                            <span>{s.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </div>
                          <div className="text-slate-400 mt-0.5 line-clamp-1">{s.snippet}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TRENDS TAB */}
        {/* =================================================================== */}
        {activeTab === 'trends' && (
          <div className="space-y-3">
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>HIGH-PERFORMING OUTLIER CONCEPTS</span>
              <span className="text-cyan-400">Algorithmic Velocity Engine</span>
            </div>

            {TRENDING_CONTENT_OUTLIERS.map((outlier, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {outlier.outlierScore}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="text-emerald-400 font-semibold">{outlier.velocity}</span>
                    <span>• Est. {outlier.targetViews}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-200 text-xs">{outlier.topic}</h4>
                  <p className="text-slate-400 text-[11px] mt-1 italic leading-relaxed">{outlier.hook}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Target: {outlier.platform}</span>
                  <button
                    onClick={() => onDraftFromTrend(outlier.topic, outlier.platform)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] transition-colors"
                  >
                    <span>Send to Draft Engine</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =================================================================== */}
        {/* STANDARD SEARCH TAB */}
        {/* =================================================================== */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real-time facts (e.g., 'Latest breakthroughs in quantum computing')..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            {searchResults && (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-500/30 space-y-2">
                  <div className="text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SYNTHESIZED INTELLIGENCE SUMMARY</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {searchResults.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-slate-400 text-[10px] font-bold">VERIFIED SOURCES ({searchResults.results.length})</div>
                  {searchResults.results.map((r: any, idx: number) => (
                    <a
                      key={idx}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[11px] transition-colors"
                    >
                      <div className="text-cyan-300 font-semibold flex items-center justify-between">
                        <span>{r.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </div>
                      <div className="text-slate-400 text-[10px] mt-1 line-clamp-2">{r.snippet}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* LIVE NEWS FEED TAB */}
        {/* =================================================================== */}
        {activeTab === 'news' && (
          <div className="space-y-2.5">
            {newsFeed.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                    {item.category}
                  </span>
                  <span className="text-slate-500">{item.timeAgo} • {item.source}</span>
                </div>
                <div className="font-semibold text-slate-200 text-xs">{item.title}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
