import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, Activity } from 'lucide-react';

interface ArcReactorProps {
  isProcessing: boolean;
  activeModelName?: string;
  fallbackTriggered?: boolean;
  voiceMode?: boolean;
  onToggleVoiceMode?: () => void;
}

export const ArcReactorVisualizer: React.FC<ArcReactorProps> = ({
  isProcessing,
  activeModelName = 'Gemini 3.8 Flash',
  fallbackTriggered = false,
  voiceMode = false,
  onToggleVoiceMode,
}) => {
  const handleClickCore = () => {
    if (onToggleVoiceMode) {
      onToggleVoiceMode();
    }
  };

  const ringColor = voiceMode
    ? 'border-red-500 text-red-400'
    : fallbackTriggered
    ? 'border-amber-400 text-amber-400'
    : 'border-cyan-400 text-cyan-400';

  const glowShadow = voiceMode
    ? 'shadow-[0_0_40px_rgba(239,68,68,0.7)]'
    : fallbackTriggered
    ? 'shadow-[0_0_35px_rgba(245,158,11,0.5)]'
    : 'shadow-[0_0_35px_rgba(6,182,212,0.5)]';

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      {/* Header status bar inside card */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono border-b border-cyan-500/20 pb-2 mb-4 text-slate-400">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>NEURAL CORE REACTOR</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            isProcessing ? 'bg-cyan-500/20 text-cyan-300 animate-pulse' : 'bg-slate-800 text-slate-400'
          }`}>
            {isProcessing ? 'THINKING & EXECUTING...' : 'ONLINE & LISTENING'}
          </span>
        </div>
      </div>

      {/* The Arc Reactor Graphic */}
      <div
        id="arc-reactor-interactive"
        onClick={handleClickCore}
        className="relative flex items-center justify-center w-36 h-36 my-2 cursor-pointer group"
        title="Click to ping Jarvis Neural Core"
      >
        {/* Outer Ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: isProcessing ? 6 : 22, ease: 'linear' }}
          className={`absolute w-36 h-36 rounded-full border border-dashed ${ringColor} opacity-40`}
        />

        {/* Outer Ring 2 (Counter rotating) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: isProcessing ? 4 : 14, ease: 'linear' }}
          className={`absolute w-28 h-28 rounded-full border border-cyan-500/50 opacity-60`}
        >
          {/* Accent nodes on ring */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
        </motion.div>

        {/* Pulsing Core Energy Orb */}
        <motion.div
          animate={isProcessing ? { scale: [1, 1.15, 1] } : { scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: isProcessing ? 0.9 : 2.5, ease: 'easeInOut' }}
          className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all bg-slate-950 border-2 ${ringColor} ${glowShadow} group-hover:scale-105`}
        >
          <Zap className={`w-6 h-6 ${voiceMode ? 'text-red-400' : fallbackTriggered ? 'text-amber-400' : 'text-cyan-400'} animate-pulse`} />
          <span className={`text-[9px] font-mono tracking-tighter mt-0.5 ${voiceMode ? 'text-red-200 font-bold' : 'text-cyan-200'}`}>
            {voiceMode ? 'VOICE ON' : fallbackTriggered ? 'FAILOVER' : 'JARVIS'}
          </span>
        </motion.div>

        {/* Radiating concentric pulse wave when processing */}
        {isProcessing && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
            className={`absolute w-20 h-20 rounded-full border ${ringColor} pointer-events-none`}
          />
        )}
      </div>

      {/* Telemetry info under reactor */}
      <div className="grid grid-cols-3 gap-2 w-full mt-3 text-center font-mono text-[10px]">
        <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[9px]">ENGINE</div>
          <div className="text-cyan-300 font-semibold truncate">{activeModelName}</div>
        </div>
        <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[9px]">FAILOVER</div>
          <div className={fallbackTriggered ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
            {fallbackTriggered ? 'TRIGGERED' : 'ARMED (4x)'}
          </div>
        </div>
        <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[9px]">SAFETY</div>
          <div className="text-cyan-300 font-semibold">APPROVAL ON</div>
        </div>
      </div>
    </div>
  );
};
