export type Side = 'left' | 'right';

export interface Track {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  color: string; // The primary color of the lasers and stage during this track
  accentColor: string;
  synths: {
    bassFreq: number;
    leadType: OscillatorType;
    bassType: OscillatorType;
  };
  pattern: number[]; // Rhythm notes sequence (0 = rest, 1 = play)
  description: string;
  progression?: number[]; // Chord progression multipliers per bar
  leadScale?: number[];   // Custom scale factors for lead arpeggiator
  bassPattern?: number[]; // Custom 16-step bassline pattern
}

export interface Enemy {
  id: string;
  side: Side;
  spawnTime: number;  // audioContext.currentTime when spawned
  targetTime: number; // exact audioContext.currentTime when it should hit the strike point
  hit: boolean;       // whether hit successfully
  result: 'perfect' | 'great' | 'good' | 'miss' | null;
  notified: boolean;  // to prevent double misses
  iconType: 'basic' | 'speed' | 'ghost'; // custom enemy designs
}

export interface HitEffect {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  side: Side;
  timeDiff?: string;
}

export interface SoundEffect {
  name: string;
  play: () => void;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  health: number; // 0 to 100
}

export type SceneState = 'lobby' | 'playing' | 'results' | 'gameover';
