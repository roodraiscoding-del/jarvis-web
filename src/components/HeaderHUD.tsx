import React, { useState, useEffect } from 'react';
import { Shield, Radio, CloudSun, BookOpen, RefreshCw, Cpu } from 'lucide-react';
import { SystemStatusData, ModelProviderInfo } from '../types';

interface HeaderHUDProps {
  statusData: SystemStatusData | null;
  onOpenMentorGuide: () => void;
  onRefreshStatus: () => void;
  onToggleSimulatedRateLimit: () => void;
  voiceMode?: boolean;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  statusData,
  onOpenMentorGuide,
  onRefreshStatus,
  onToggleSimulatedRateLimit,
  voiceMode = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeProvider = statusData?.providers.find((p) => p.isCurrentPrimary) || statusData?.providers[0];

  return (
    <header
      className={`border-b backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 transition-colors duration-500 ${
        voiceMode
          ? 'border-red-500/40 bg-slate-950/90 shadow-[0_4px_25px_rgba(239,68,68,0.15)]'
          : 'border-cyan-500/20 bg-slate-950/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Identity */}
        <div className="flex items-center gap-3">
          <div
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              voiceMode
                ? 'bg-red-950/80 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-cyan-950/60 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                voiceMode
                  ? 'bg-red-400 shadow-[0_0_12px_#ef4444]'
                  : 'bg-cyan-400 shadow-[0_0_12px_#06b6d4]'
              }`}
            />
            <div
              className={`absolute inset-0 rounded-lg border animate-spin ${
                voiceMode ? 'border-red-400/30' : 'border-cyan-400/20'
              }`}
              style={{ animationDuration: '8s' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-display font-bold text-lg tracking-wider transition-colors ${
                  voiceMode ? 'text-red-300' : 'text-cyan-300'
                }`}
              >
                JARVIS
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border transition-colors ${
                  voiceMode
                    ? 'bg-red-950/90 border-red-500/50 text-red-300'
                    : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400'
                }`}
              >
                {voiceMode ? 'VOICE LIVE' : 'WEB HUD'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Free-Tier Autonomous Agent Architecture
            </p>
          </div>
        </div>

        {/* System Vitals: Clock, Weather, Active Model */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs font-mono">
          {/* Real-time Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-cyan-400 font-semibold">{currentTime || '00:00:00'}</span>
          </div>

          {/* Weather Widget */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            <CloudSun className="w-3.5 h-3.5 text-amber-400" />
            <span>{statusData?.weather.city || 'Local'}: {statusData?.weather.tempC || 19}°C</span>
            <span className="text-slate-500">({statusData?.weather.condition || 'Clear'})</span>
          </div>

          {/* Active Model & Failover Status */}
          <div
            id="provider-status-badge"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
              activeProvider?.status === 'rate_limited'
                ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                : activeProvider?.provider === 'gemini'
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-semibold">{activeProvider?.name || 'Gemini Flash'}</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-950/60 border border-current text-current">
              {activeProvider?.tier || 'Free'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Test Simulated Rate Limit (Demonstrates the hard constraint failover) */}
          <button
            id="toggle-rate-limit-btn"
            onClick={onToggleSimulatedRateLimit}
            title="Simulate primary Gemini 429 quota exhaustion to verify auto-failover to Groq / Edge Fallback"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 transition-colors"
          >
            <Radio className="w-3 h-3" />
            <span className="hidden sm:inline">Simulate 429 Failover</span>
            <span className="sm:hidden">429 Test</span>
          </button>

          {/* Refresh system metrics */}
          <button
            id="refresh-status-btn"
            onClick={onRefreshStatus}
            title="Refresh System Vitals"
            className="p-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Technical Mentor Walkthrough Guide */}
          <button
            id="open-mentor-guide-btn"
            onClick={onOpenMentorGuide}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mentor Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
};
