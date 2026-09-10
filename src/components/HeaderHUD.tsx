import React, { useState, useEffect, useRef } from 'react';
import { Shield, Radio, CloudSun, BookOpen, RefreshCw, Cpu, MapPin, Navigation, Loader2, Search, X, CheckCircle2, Wind, Droplets } from 'lucide-react';
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
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchCity, setSearchCity] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowLocationModal(false);
      }
    };
    if (showLocationModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLocationModal]);

  const activeProvider = statusData?.providers.find((p) => p.isCurrentPrimary) || statusData?.providers[0];

  const handleSyncCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationFeedback('Browser geolocation is not supported in this environment.');
      return;
    }

    setIsLocating(true);
    setLocationFeedback('Acquiring high-precision GPS positioning...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/weather/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            })
          });
          const data = await res.json();
          if (res.ok) {
            setLocationFeedback(`Location locked: ${data.weather?.city || 'Local Area'} (${data.weather?.tempC}°C, ${data.weather?.condition})`);
            onRefreshStatus();
            setTimeout(() => {
              setShowLocationModal(false);
              setLocationFeedback(null);
            }, 1800);
          } else {
            setLocationFeedback(`Sync error: ${data.error || 'Failed to update location'}`);
          }
        } catch (err: any) {
          setLocationFeedback(`Network error: ${err.message}`);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationFeedback(`GPS permission issue: ${err.message}. You can manually specify a city below.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearchCity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchCity.trim()) return;

    setIsSearching(true);
    setLocationFeedback(`Geolocating "${searchCity.trim()}"...`);

    try {
      const res = await fetch('/api/weather/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: searchCity.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setLocationFeedback(`Telemetry linked to ${data.weather?.city} (${data.weather?.tempC}°C)`);
        setSearchCity('');
        onRefreshStatus();
        setTimeout(() => {
          setShowLocationModal(false);
          setLocationFeedback(null);
        }, 1800);
      } else {
        setLocationFeedback(`City lookup error: ${data.error || 'Location not found'}`);
      }
    } catch (err: any) {
      setLocationFeedback(`Lookup error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header
      className={`border-b backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 transition-colors duration-500 ${
        voiceMode
          ? 'border-red-500/40 bg-slate-950/90 shadow-[0_4px_25px_rgba(239,68,68,0.15)]'
          : 'border-cyan-500/20 bg-slate-950/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Branding & Status Core */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                voiceMode
                  ? 'bg-red-950/70 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'bg-cyan-950/70 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
              }`}
            >
              <Shield className={`w-5 h-5 ${voiceMode ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                activeProvider?.status === 'rate_limited'
                  ? 'bg-amber-400 animate-pulse'
                  : voiceMode
                  ? 'bg-red-400 animate-pulse'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider font-mono text-cyan-400 uppercase">
                Jarvis OS
              </h1>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                  voiceMode
                    ? 'border-red-500/60 bg-red-950/50 text-red-300 animate-pulse'
                    : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
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
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs font-mono relative">
          {/* Real-time Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-cyan-400 font-semibold">{currentTime || '00:00:00'}</span>
          </div>

          {/* Interactive Weather & Location Trigger */}
          <button
            id="weather-location-trigger-btn"
            onClick={() => setShowLocationModal(!showLocationModal)}
            title="Click to sync or change location & atmospheric telemetry"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-all cursor-pointer group"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-200">
              {statusData?.weather.city || 'Local Area'}: {statusData?.weather.tempC ?? 19}°C
            </span>
            <span className="text-slate-500">({statusData?.weather.condition || 'Clear'})</span>
            {statusData?.weather.isLiveLocation && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="GPS Position Locked" />
            )}
          </button>

          {/* Location & Atmospheric Telemetry Dropdown / Modal */}
          {showLocationModal && (
            <div
              ref={modalRef}
              className="absolute top-10 right-0 sm:left-auto sm:right-10 w-80 bg-slate-950 border border-cyan-500/30 rounded-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>Atmospheric Telemetry</span>
                </div>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Vitals Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    <span>{statusData?.weather.city || 'Local Coordinates'}</span>
                    {statusData?.weather.isLiveLocation && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono">
                        GPS Active
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-cyan-400">{statusData?.weather.tempC ?? 19}°C</span>
                    <span className="text-xs text-slate-400 ml-1">/ {statusData?.weather.tempF ?? 66}°F</span>
                  </div>
                </div>

                <p className="text-xs text-amber-300/90 font-medium mb-2">
                  {statusData?.weather.condition || 'Clear Atmosphere'}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Humidity: <strong className="text-slate-200">{statusData?.weather.humidity ?? 50}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Wind: <strong className="text-slate-200">{statusData?.weather.windSpeed || '9 mph'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action 1: GPS Positioning */}
              <button
                id="sync-gps-location-btn"
                onClick={handleSyncCurrentLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Locking GPS Telemetry...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sync Current GPS Location</span>
                  </>
                )}
              </button>

              {/* Action 2: Manual City Search */}
              <form onSubmit={handleSearchCity} className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder="Or enter city name (e.g. Tokyo)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchCity.trim()}
                  className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-colors disabled:opacity-40"
                >
                  {isSearching ? 'Querying Satellite...' : 'Update City Weather'}
                </button>
              </form>

              {/* Feedback Alert */}
              {locationFeedback && (
                <div className="mt-3 p-2 rounded bg-slate-900 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-start gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{locationFeedback}</span>
                </div>
              )}
            </div>
          )}

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
