import React, { useState, useEffect } from 'react';
import { Track } from '../types';
import { TRACKS } from '../data/tracks';
import { 
  Sparkles, 
  Music, 
  Gamepad2, 
  Volume2, 
  Square, 
  Trophy, 
  ChevronRight, 
  Flame,
  Music4
} from 'lucide-react';

interface LobbyProps {
  onStartTrack: (track: Track) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartTrack }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [maxCombos, setMaxCombos] = useState<Record<string, number>>({});

  // 1. Load persisted local scores
  useEffect(() => {
    const scores: Record<string, number> = {};
    const combos: Record<string, number> = {};
    
    TRACKS.forEach((track) => {
      const savedScore = localStorage.getItem(`rhythm-high-score-${track.id}`);
      const savedCombo = localStorage.getItem(`rhythm-max-combo-${track.id}`);
      if (savedScore) scores[track.id] = parseInt(savedScore, 10);
      if (savedCombo) combos[track.id] = parseInt(savedCombo, 10);
    });

    setHighScores(scores);
    setMaxCombos(combos);
  }, []);

  return (
    <div className="relative w-full h-full max-h-screen bg-[#03020a] text-white flex flex-col justify-between overflow-hidden">
      
      {/* GLOWING ABSTRACT VECTOR DECORATIONS (The club vibe) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* HEADER SECTION --- */}
      <header className="w-full text-center py-4 px-4 flex flex-col items-center gap-1 border-b border-white/5 bg-black/20 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] text-pink-300 font-mono tracking-widest uppercase animate-pulse">
          <Sparkles className="w-3 h-3" /> Stage: Neon Cyber Club
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mt-1 bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(236,72,153,0.3)] select-none">
          RHYTHM CLUB ACTION
        </h1>
        <p className="max-w-lg text-[11px] sm:text-xs text-gray-400 font-sans tracking-wide mt-1 leading-snug">
          ネオン煌めくDJブースで電子ビートを刻み、迫りくるビートコアをタイミングよく叩き斬るリズムアクション！
        </p>
      </header>

      {/* MAIN LAYOUT GRID --- */}
      <main className="w-full max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch z-10 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: SONG SELECTION LIST (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-3 min-h-0">
          <h2 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2 shrink-0">
            <Music className="w-3.5 h-3.5" /> SELECT YOUR ELECTRONIC BEAT
          </h2>

          <div className="flex-1 overflow-y-auto pr-1.5 space-y-2.5 custom-scrollbar">
            {TRACKS.map((track) => {
              const score = highScores[track.id] || 0;
              const combo = maxCombos[track.id] || 0;
              const isSelected = selectedTrack.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  style={{
                    boxShadow: isSelected ? `0 0 15px ${track.color}15` : 'none',
                    borderColor: isSelected ? track.color : 'rgba(255, 255, 255, 0.05)',
                  }}
                  className={`w-full text-left p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                    isSelected 
                      ? 'bg-white/[0.04]' 
                      : 'bg-black/40 hover:bg-white/[0.01]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Song details */}
                    <div className="flex items-start gap-3 shrink-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                        style={{ backgroundColor: `${track.color}15`, color: track.color }}
                      >
                        <Music4 className="w-5 h-5" />
                      </div>
                      
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 font-mono">
                          {track.genre}
                        </span>
                        <h3 className="text-base font-extrabold text-white leading-tight font-mono">
                          {track.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span 
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: track.color }}
                          >
                            BPM {track.bpm}
                          </span>
                          <span className="text-[9px] text-gray-400 font-sans">
                            APPROACH: MEDIUM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Best Records Display */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-1.5 sm:pt-0 border-t sm:border-t-0 border-white/5 font-mono gap-1">
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase tracking-widest block text-left sm:text-right">BEST SCORE</span>
                        <span className="text-xs font-bold text-yellow-300">
                          {score > 0 ? String(score).padStart(6, '0') : '------'}
                        </span>
                      </div>
                      {combo > 0 && (
                        <div className="flex items-center gap-1 py-0.5 px-1.5 rounded bg-amber-950/20 border border-amber-500/15 text-[8px] text-amber-300">
                          <Flame className="w-2 h-2 text-orange-400" /> Max C. {combo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Underlay small descriptions */}
                  {isSelected && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.05] text-[11px] text-slate-300 leading-relaxed font-sans">
                      {track.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW PANEL & INSTRUCTIONS (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pr-0.5">
          
          {/* TRACK PREVIEW LAUNCHER WINDOW */}
          <div 
            style={{ borderColor: `${selectedTrack.color}33`, boxShadow: `0 0 20px ${selectedTrack.color}0a` }}
            className="p-5 bg-gradient-to-b from-gray-950/80 to-black border rounded-3xl flex flex-col gap-4 text-center relative overflow-hidden shrink-0"
          >
            {/* Glossy top lights */}
            <div 
              className="absolute top-0 inset-x-0 h-[2px] transition-all duration-300"
              style={{ backgroundColor: selectedTrack.color }}
            />

            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-rose-400">READY TO STRIKE</span>
              <h3 className="text-xl font-black tracking-tight mt-0.5" style={{ color: selectedTrack.color }}>
                {selectedTrack.name}
              </h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">GENRE: {selectedTrack.genre}</p>
            </div>

            <div className="flex flex-col items-center py-3 bg-white/[0.02] border border-white/5 rounded-2xl relative">
              <div className="text-[10px] text-gray-400 mb-0.5">STAGE COMPLEXITY</div>
              <div className="text-base font-bold font-mono text-cyan-300">MEDIUM</div>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    className="w-4.5 h-1 rounded-full"
                    style={{
                      backgroundColor: lvl <= (selectedTrack.bpm > 130 ? 4 : 3) 
                        ? selectedTrack.color 
                        : 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Launch Game Button */}
            <button
              onClick={() => onStartTrack(selectedTrack)}
              style={{
                backgroundColor: selectedTrack.color,
                boxShadow: `0 4px 15px ${selectedTrack.color}40`
              }}
              className="w-full py-3.5 text-xs font-black uppercase text-black font-sans rounded-2xl cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 tracking-widest z-10"
            >
              <Gamepad2 className="w-4.5 h-4.5 fill-current" /> ENTER TARGET RHYTHM
            </button>
          </div>

          {/* PLAY INSTRUCTIONS CARD */}
          <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-3 shrink-0">
            <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-[#06b6d4] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> HOW TO ACTION & CONTROLS
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              
              <div className="flex flex-col p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[8px] text-gray-400 uppercase tracking-wider">LEFT TRACK</span>
                <span className="text-xl font-bold font-mono text-pink-400 mt-0.5">D Key</span>
                <span className="text-[9px] text-gray-500 mt-0.5">or LEFT Arrow</span>
              </div>

              <div className="flex flex-col p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[8px] text-gray-400 uppercase tracking-wider">RIGHT TRACK</span>
                <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5">K Key</span>
                <span className="text-[9px] text-gray-500 mt-0.5">or RIGHT Arrow</span>
              </div>

            </div>

            <div className="text-[11px] text-gray-400 leading-relaxed font-sans space-y-1.5 border-t border-white/5 pt-2.5">
              <p>
                1. 左右のビートコアが、<strong>リングゲート</strong>と重なるタイミングでボタンを叩きます。
              </p>
              <p>
                2. 判定は <strong>PERFECT → GREAT → GOOD</strong>。逃すと <strong>MISS</strong> となりライフが減衰。
              </p>
              <p>
                3. マウス・スマホの方は、下部の<strong>D / Kボタン</strong>タップで快適プレイ可能！
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER CREDITS */}
      <footer className="w-full text-center py-2.5 border-t border-white/5 bg-black/40 z-10 text-[9px] text-gray-500 font-mono tracking-wider shrink-0">
        RHYTHM CLUB ACTION &copy; 2026 CODESYNTH | POWERED BY WEB AUDIO API
      </footer>

    </div>
  );
};
