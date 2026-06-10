import React from 'react';
import { Track, GameStats } from '../types';
import { Volume2, Heart, Shield, Music, Star, Award, RotateCcw } from 'lucide-react';

interface GameHUDProps {
  track: Track;
  stats: GameStats;
  onPauseToggle: () => void;
  isPaused: boolean;
  onQuit: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  track,
  stats,
  onPauseToggle,
  isPaused,
  onQuit,
}) => {
  // Format score to 6 padded digits for an authentic retro arcade cabinet feel
  const formatScore = (num: number) => {
    return String(num).padStart(6, '0');
  };

  const isLowHealth = stats.health <= 35;

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex flex-col pointer-events-none p-4 sm:p-6 gap-2">
      {/* Top Main Panel */}
      <div className="w-full flex items-center justify-between gap-4 pointer-events-auto">
        {/* Left Side: Track Title & BPM */}
        <div className="flex items-center gap-3 bg-black/50 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${track.color}22` }}>
            <Music className="w-4.5 h-4.5 animate-pulse" style={{ color: track.color }} />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">PLAYING NOW</div>
            <div className="text-sm font-black tracking-wide text-white font-mono">{track.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] px-1 text-black font-extrabold rounded font-mono" style={{ backgroundColor: track.accentColor }}>
                {track.genre}
              </span>
              <span className="text-[10px] text-gray-300 font-mono">BPM {track.bpm}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Arcade Score */}
        <div className="flex flex-col items-center bg-black/60 border border-white/10 px-5 py-2 rounded-xl backdrop-blur-md">
          <span className="text-[10px] text-gray-400 font-sans tracking-widest uppercase">SCORE</span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-amber-200 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            {formatScore(stats.score)}
          </span>
          {stats.maxCombo > 0 && (
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
              MAX COMBO: <strong className="text-yellow-300 font-bold">{stats.maxCombo}</strong>
            </span>
          )}
        </div>

        {/* Right Side: Pause & Back Panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPauseToggle}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs uppercase cursor-pointer backdrop-blur-md transition-all active:scale-95"
          >
            {isPaused ? '▶ RESUME' : '|| PAUSE'}
          </button>
          <button
            onClick={onQuit}
            className="p-2 ml-1 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-300 transition-all cursor-pointer active:scale-95"
            title="Quit track"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Health Bar (Bottom Section of HUD) */}
      <div className="w-full max-w-sm self-start flex items-center gap-3 bg-black/50 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md pointer-events-auto mt-2">
        <Heart 
          className={`w-4 h-4 fill-current ${isLowHealth ? 'text-red-500 animate-ping' : 'text-emerald-400 animate-pulse'}`} 
        />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[9px] text-gray-300 font-mono uppercase tracking-widest">GROOVE HEALTH</span>
            <span className={`text-[10px] font-mono font-black ${isLowHealth ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.health}%
            </span>
          </div>
          <div className="w-full bg-gray-950 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isLowHealth 
                  ? 'bg-gradient-to-r from-red-600 to-pink-500 animate-pulse shadow-[0_0_8px_#ef4444]' 
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
              }`}
              style={{ width: `${stats.health}%` }}
            />
          </div>
        </div>
      </div>

      {/* Miniature tallies at screen edge for premium arcade aesthetic */}
      <div className="hidden sm:flex self-start items-center gap-3 bg-black/40 px-4 py-1.5 rounded-lg border border-white/5 mt-1 pointer-events-auto text-[10px] font-mono text-gray-400">
        <span className="flex items-center gap-0.5">PERFECT: <strong className="text-yellow-400 font-black">{stats.perfectCount}</strong></span>
        <span className="text-white/10">|</span>
        <span className="flex items-center gap-0.5">GREAT: <strong className="text-emerald-400 font-black">{stats.greatCount}</strong></span>
        <span className="text-white/10">|</span>
        <span className="flex items-center gap-0.5">GOOD: <strong className="text-blue-400 font-black">{stats.goodCount}</strong></span>
        <span className="text-white/10">|</span>
        <span className="flex items-center gap-0.5">MISS: <strong className="text-red-400 font-black">{stats.missCount}</strong></span>
      </div>
    </div>
  );
};
