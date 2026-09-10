import React, { useState, useEffect } from 'react';
import { Compass, TrendingUp, Newspaper, ExternalLink, Sparkles, Search, ArrowRight, Share2, Eye, Flame } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'trends' | 'news' | 'search'>('trends');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [newsFeed, setNewsFeed] = useState<any[]>([]);

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

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'trends'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Content Trends (YouTube/IG)</span>
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
            <span>Web Research</span>
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
            <span>Live News Feeds</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-xs">
        {/* TRENDS TAB */}
        {activeTab === 'trends' && (
          <div className="space-y-3">
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>HIGH-PERFORMING OUTLIER CONCEPTS</span>
              <span className="text-cyan-400">Algorithmic Velocity Engine</span>
            </div>

            {TRENDING_CONTENT_OUTLIERS.map((trend, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/30 transition-all space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] uppercase text-cyan-400 font-bold">
                      {trend.platform}
                    </span>
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                      <Flame className="w-3 h-3 text-amber-400" />
                      {trend.outlierScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {trend.velocity}
                  </span>
                </div>

                <div className="font-semibold text-slate-100 text-sm">{trend.topic}</div>

                <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80 text-slate-300 text-[11px] italic">
                  Hook: {trend.hook}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Target Reach: {trend.targetViews}
                  </span>
                  <button
                    onClick={() => {
                      onDraftFromTrend(trend.topic, trend.platform);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 text-[11px] transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Draft for Approval</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WEB RESEARCH TAB */}
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

        {/* NEWS FEED TAB */}
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
