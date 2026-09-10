import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music, Radio, Disc3, ExternalLink } from 'lucide-react';
import { MediaTrack } from '../types';
import { playJarvisSound } from '../utils/audioSynth';

interface MediaPlayerHUDProps {
  soundEnabled: boolean;
  externalCommand?: { action: 'play' | 'pause' | 'next'; timestamp: number } | null;
}

const DEFAULT_PLAYLIST: MediaTrack[] = [
  {
    id: 'track-1',
    title: 'Cyberpunk Synthwave - Neon Horizon',
    artist: 'Jarvis Audio Core',
    category: 'synthwave',
    embedVideoId: '4xDzrJKXOOY', // Lofi synthwave stream
    duration: '3:45'
  },
  {
    id: 'track-2',
    title: 'Lofi Deep Work & Coding Radio',
    artist: 'ChillHop Free Feed',
    category: 'lofi',
    embedVideoId: 'jfKfPfyJRdk', // Lofi girl stream
    duration: 'Live Stream'
  },
  {
    id: 'track-3',
    title: 'Space Ambient Focus - 432Hz Resonance',
    artist: 'Deep Space Soundlab',
    category: 'ambient',
    embedVideoId: 'DWcJFNfaw9c',
    duration: '4:20'
  }
];

export const MediaPlayerHUD: React.FC<MediaPlayerHUDProps> = ({
  soundEnabled,
  externalCommand,
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [equalizerBars, setEqualizerBars] = useState<number[]>([40, 65, 85, 30, 70, 95, 50, 60, 80, 45, 90, 35]);

  const currentTrack = DEFAULT_PLAYLIST[currentTrackIndex];

  // Handle external voice/chat command to play/pause/next
  useEffect(() => {
    if (!externalCommand) return;
    if (externalCommand.action === 'play') {
      setIsPlaying(true);
    } else if (externalCommand.action === 'pause') {
      setIsPlaying(false);
    } else if (externalCommand.action === 'next') {
      handleNextTrack();
    }
  }, [externalCommand]);

  // Animated equalizer spectrum when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setEqualizerBars(prev => prev.map(() => Math.floor(Math.random() * 80) + 20));
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    if (soundEnabled) playJarvisSound('command_ack');
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % DEFAULT_PLAYLIST.length);
    setIsPlaying(true);
    if (soundEnabled) playJarvisSound('command_ack');
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + DEFAULT_PLAYLIST.length) % DEFAULT_PLAYLIST.length);
    setIsPlaying(true);
    if (soundEnabled) playJarvisSound('command_ack');
  };

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-purple-400" />
          <span className="font-mono font-bold text-sm text-cyan-300">
            JARVIS MEDIA STREAM DECK
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300">
          <Radio className="w-3 h-3 animate-pulse text-purple-400" />
          <span>VOICE CONTROLLED</span>
        </div>
      </div>

      {/* Main Track Visualizer & Player Box */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Track Title & Artist */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {currentTrack.category}
            </span>
            <div className="font-mono font-semibold text-slate-100 text-sm mt-1 truncate max-w-[280px]">
              {currentTrack.title}
            </div>
            <div className="font-mono text-xs text-slate-400">{currentTrack.artist}</div>
          </div>
          <Disc3 className={`w-8 h-8 text-cyan-400 shrink-0 ${isPlaying ? 'animate-spin' : 'opacity-40'}`} style={{ animationDuration: '4s' }} />
        </div>

        {/* Dynamic Equalizer Waveform */}
        <div className="h-16 flex items-end justify-between gap-1 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800/80">
          {equalizerBars.map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-t transition-all duration-100"
              style={{ height: isPlaying ? `${height}%` : '8%' }}
            />
          ))}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTrack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button
              onClick={handleNextTrack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="w-7 text-right">{volume}%</span>
          </div>
        </div>
      </div>

      {/* Embedded Live Video / Audio Frame (Optional Free Widget) */}
      <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex flex-col">
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>EMBEDDED MEDIA STREAM</span>
          <a
            href={`https://www.youtube.com/watch?v=${currentTrack.embedVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            <span>Open on YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex-1 w-full bg-black relative">
          <iframe
            className="w-full h-full border-0"
            src={`https://www.youtube-nocookie.com/embed/${currentTrack.embedVideoId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1`}
            title={currentTrack.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Voice commands hint */}
      <div className="mt-3 text-center text-[11px] font-mono text-slate-500">
        💡 Voice hint: say <span className="text-cyan-400 font-semibold">"Play synthwave"</span> or <span className="text-cyan-400 font-semibold">"Pause music"</span> in the terminal.
      </div>
    </div>
  );
};
