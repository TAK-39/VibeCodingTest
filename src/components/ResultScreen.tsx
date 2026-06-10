import React, { useEffect, useState } from 'react';
import { Track, GameStats } from '../types';
import { Trophy, RotateCcw, Home, Sparkles, Award, Star, Flame, Eye } from 'lucide-react';

interface ResultScreenProps {
  track: Track;
  stats: GameStats;
  isCleared: boolean;
  onRestart: () => void;
  onLobby: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  track,
  stats,
  isCleared,
  onRestart,
  onLobby,
}) => {
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Math totals
  const totalHits = stats.perfectCount + stats.greatCount + stats.goodCount;
  const totalNotes = totalHits + stats.missCount;

  // Calculate Arcade Grade
  let grade = 'D';
  let gradeColor = 'text-gray-400';
  let gradeShadow = 'shadow-gray-500/20';

  if (isCleared) {
    const perfectRatio = totalNotes > 0 ? stats.perfectCount / totalNotes : 0;
    const accuracyRatio = totalNotes > 0 ? totalHits / totalNotes : 0;

    if (perfectRatio >= 0.85 && stats.missCount === 0) {
      grade = 'S';
      gradeColor = 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-300';
      gradeShadow = 'shadow-pink-500/40';
    } else if (perfectRatio >= 0.65 || accuracyRatio >= 0.85) {
      grade = 'A';
      gradeColor = 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400';
      gradeShadow = 'shadow-amber-500/30';
    } else if (accuracyRatio >= 0.70) {
      grade = 'B';
      gradeColor = 'text-emerald-400';
      gradeShadow = 'shadow-emerald-500/20';
    } else if (accuracyRatio >= 0.50) {
      grade = 'C';
      gradeColor = 'text-cyan-400';
      gradeShadow = 'shadow-cyan-500/20';
    }
  } else {
    grade = 'F';
    gradeColor = 'text-red-500';
    gradeShadow = 'shadow-red-500/20';
  }

  // 1. Persistence Scoreboard Logic on load
  useEffect(() => {
    if (!isCleared) return;

    const savedHighScoreKey = `rhythm-high-score-${track.id}`;
    const savedMaxComboKey = `rhythm-max-combo-${track.id}`;

    const currentHighScore = localStorage.getItem(savedHighScoreKey);
    const currentMaxCombo = localStorage.getItem(savedMaxComboKey);

    const prevScore = currentHighScore ? parseInt(currentHighScore, 10) : 0;
    const prevCombo = currentMaxCombo ? parseInt(currentMaxCombo, 10) : 0;

    let updated = false;

    if (stats.score > prevScore) {
      localStorage.setItem(savedHighScoreKey, stats.score.toString());
      updated = true;
    }
    if (stats.combo > prevCombo) {
      localStorage.setItem(savedMaxComboKey, stats.combo.toString());
    }

    if (updated) {
      setIsNewRecord(true);
    }
  }, [track.id, stats.score, stats.combo, isCleared]);

  return (
    <div className="relative w-full min-h-screen bg-[#03010a] text-white flex flex-col justify-center items-center p-4">
      
      {/* Background neon glows */}
      <div 
        className="absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-15 pointer-events-none"
        style={{ backgroundColor: track.color }}
      />

      <div className="w-full max-w-xl bg-gradient-to-b from-gray-950/80 to-black/90 border border-white/10 p-6 sm:p-8 rounded-3xl backdrop-blur-md text-center shadow-2xl relative">
        {/* Glowing track outline header decoration */}
        <div 
          className="absolute top-0 inset-x-0 h-1 rounded-t-3xl"
          style={{ backgroundColor: track.color }}
        />

        {/* Header Title */}
        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div 
            className="px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase border border-white/15"
            style={{ color: track.color, backgroundColor: `${track.color}15`, borderColor: `${track.color}40` }}
          >
            {track.genre}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-wide font-mono mt-1 uppercase text-gray-300">
            {track.name}
          </h2>
          <p className="text-xs text-gray-400">
            BPM {track.bpm} &bull; COMPLETED SUMMARY
          </p>
        </div>

        {/* CLEAR STATUS OR MATCH LOSS ALERT */}
        <div className="mb-6 flex flex-col items-center">
          {isCleared ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-yellow-400 font-extrabold text-sm tracking-widest uppercase animate-pulse">
                <Sparkles className="w-4 h-4" /> PERFORMANCE STAGE CLEARED!
              </div>
              {isNewRecord && (
                <div className="inline-block px-3 py-0.5 bg-yellow-400 text-black text-[10px] font-black font-mono tracking-widest rounded animate-bounce">
                  NEW RECORD HIGH SCORE!
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-500 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-1.5 animate-pulse">
              <Award className="w-4.5 h-4.5" /> GROOVE FAILURE (HP LEVEL 0)
            </div>
          )}
        </div>

        {/* GRADE PANEL */}
        <div className="flex justify-center items-center gap-12 my-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-400 tracking-widest font-mono uppercase mb-2">SCORE GRADE</span>
            <div className={`w-28 h-28 rounded-full border-2 border-white/10 flex items-center justify-center bg-white/[0.02] shadow-2xl ${gradeShadow}`}>
              <span className={`text-6xl font-black font-mono leading-none tracking-tighter ${gradeColor}`}>
                {grade}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">GROOVE PERFORMANCE</span>
            <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              {String(stats.score).padStart(6, '0')}
            </div>
            {stats.maxCombo > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-yellow-300 font-mono">
                <Flame className="w-3.5 h-3.5 fill-current text-orange-400" /> MAX Combo: {stats.maxCombo}
              </div>
            )}
          </div>
        </div>

        {/* DETAILED STAT CARD GRID */}
        <div className="grid grid-cols-2 gap-3.5 my-6 text-left">
          
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[9px] text-yellow-400/80 uppercase font-bold tracking-widest block font-mono">PERFECT</span>
              <span className="text-xs text-gray-400 mt-0.5 font-sans">Strict Accurate Hit</span>
            </div>
            <span className="text-lg font-black font-mono text-yellow-400">{stats.perfectCount}</span>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[9px] text-emerald-400/80 uppercase font-bold tracking-widest block font-mono">GREAT</span>
              <span className="text-xs text-gray-400 mt-0.5 font-sans">Slight Timing Offset</span>
            </div>
            <span className="text-lg font-black font-mono text-emerald-400">{stats.greatCount}</span>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[9px] text-blue-400/80 uppercase font-bold tracking-widest block font-mono">GOOD</span>
              <span className="text-xs text-gray-400 mt-0.5 font-sans">Loose Target Hit</span>
            </div>
            <span className="text-lg font-black font-mono text-blue-400">{stats.goodCount}</span>
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[9px] text-red-500/80 uppercase font-bold tracking-widest block font-mono">MISS</span>
              <span className="text-xs text-gray-400 mt-0.5 font-sans">Past Hit-Gate Zone</span>
            </div>
            <span className="text-lg font-black font-mono text-red-500">{stats.missCount}</span>
          </div>

        </div>

        {/* BOTTOM ACTION NAVIGATION LINKS */}
        <div className="flex flex-col sm:flex-row gap-3.5 mt-8 border-t border-white/10 pt-6">
          <button
            onClick={onRestart}
            className="flex-1 py-3.5 px-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs uppercase rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> RETRY TRACK
          </button>
          
          <button
            onClick={onLobby}
            style={{ backgroundColor: track.color }}
            className="flex-1 py-3.5 px-4 text-black hover:brightness-110 font-bold text-xs uppercase rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 fill-current" /> SELECT SONG
          </button>
        </div>

      </div>
    </div>
  );
};
