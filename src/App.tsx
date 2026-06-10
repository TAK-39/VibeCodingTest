/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Track, GameStats, SceneState } from './types';
import { TRACKS } from './data/tracks';
import { Lobby } from './components/Lobby';
import { ClubStage } from './components/ClubStage';
import { GameHUD } from './components/GameHUD';
import { ResultScreen } from './components/ResultScreen';
import { AudioEngine } from './components/AudioEngine';
import { Sparkles, CircleAlert, Gamepad2 } from 'lucide-react';

const INITIAL_STATS: GameStats = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  greatCount: 0,
  goodCount: 0,
  missCount: 0,
  health: 100,
};

export default function App() {
  const [scene, setScene] = useState<SceneState>('lobby');
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isPaused, setIsPaused] = useState(false);

  // High quality Web Audio context lifecycle
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // Lazy instantiate AudioEngine singleton
  const getAudioEngine = (): AudioEngine => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine();
    }
    return audioEngineRef.current;
  };

  // Clean stop when unmounting or leaving scenes
  useEffect(() => {
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    };
  }, []);

  const handleStartTrack = (track: Track) => {
    setSelectedTrack(track);
    setStats({ ...INITIAL_STATS });
    setIsPaused(false);
    
    const engine = getAudioEngine();
    engine.init();
    engine.setTrack(track);
    // engine.start() is now handled safely by ClubStage inside its useEffect mount phase

    setScene('playing');
  };

  const handlePauseToggle = () => {
    const engine = getAudioEngine();
    setIsPaused((prev) => {
      const nextPaused = !prev;
      if (nextPaused) {
        engine.stop();
      } else {
        engine.start();
      }
      return nextPaused;
    });
  };

  const handleQuitGame = () => {
    const engine = getAudioEngine();
    engine.stop();
    setScene('lobby');
  };

  const handleGameOver = () => {
    const engine = getAudioEngine();
    engine.stop();
    setScene('gameover');
  };

  const handleGameClear = () => {
    const engine = getAudioEngine();
    engine.stop();
    setScene('results');
  };

  const handleRestart = () => {
    handleStartTrack(selectedTrack);
  };

  const handleLobby = () => {
    setScene('lobby');
  };

  return (
    <div id="app-root" className="relative w-full h-screen max-h-screen bg-[#050510] text-gray-50 flex flex-col font-sans overflow-hidden">
      
      {/* 1. LOBBY / SELECTION SCENE */}
      {scene === 'lobby' && (
        <Lobby onStartTrack={handleStartTrack} />
      )}

      {/* 2. PLAYING SCENE AND LIVE GRID */}
      {scene === 'playing' && (
        <div id="stage-wrapper" className="relative flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col">
          {/* Main Equalizer HUD Layer */}
          <GameHUD
            track={selectedTrack}
            stats={stats}
            onPauseToggle={handlePauseToggle}
            isPaused={isPaused}
            onQuit={handleQuitGame}
          />

          {/* Active 3D Render Canvas */}
          <ClubStage
            track={selectedTrack}
            audioEngine={getAudioEngine()}
            stats={stats}
            setStats={setStats}
            isPaused={isPaused}
            onGameOver={handleGameOver}
            onGameClear={handleGameClear}
          />

          {/* Pause overlay */}
          {isPaused && (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center gap-5 text-center px-4 animate-fade-in">
              <CircleAlert className="w-12 h-12 text-pink-400 animate-pulse" />
              <div>
                <h3 className="text-3xl font-black font-mono text-white tracking-widest uppercase mb-1">SESSION PAUSED</h3>
                <p className="text-xs text-gray-400 max-w-sm">
                  ビートの流れが一時的に停止されました。再度ボタンを押すとDJブースを再開します。
                </p>
              </div>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={handlePauseToggle}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 font-bold text-xs uppercase rounded-xl tracking-widest text-black cursor-pointer active:scale-95 transition-all"
                >
                  ▶ RESUME BEAT
                </button>
                <button
                  onClick={handleQuitGame}
                  className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-xs uppercase rounded-xl tracking-widest text-white cursor-pointer active:scale-95 transition-all"
                >
                  ABORT SESSION
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SONG CLEARED SUMMARY SCENE */}
      {scene === 'results' && (
        <ResultScreen
          track={selectedTrack}
          stats={stats}
          isCleared={true}
          onRestart={handleRestart}
          onLobby={handleLobby}
        />
      )}

      {/* 4. GAME OVER SCENE */}
      {scene === 'gameover' && (
        <ResultScreen
          track={selectedTrack}
          stats={stats}
          isCleared={false}
          onRestart={handleRestart}
          onLobby={handleLobby}
        />
      )}

    </div>
  );
}
