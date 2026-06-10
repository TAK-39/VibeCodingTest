import { Track } from '../types';

export const TRACKS: Track[] = [
  {
    id: 'neon-heartbeat',
    name: 'NEON HEARTBEAT',
    genre: 'Club Progressive House',
    bpm: 124,
    color: '#ec4899', // Pink
    accentColor: '#a855f7', // Purple
    synths: {
      bassFreq: 65.41, // C2
      leadType: 'sawtooth',
      bassType: 'triangle',
    },
    // 32-step 4-bar pattern (8 steps per bar) to make spawns evolve beautifully
    pattern: [
      1, 0, 1, 0, 1, 0, 1, 0, // Bar 1: standard house build
      1, 1, 0, 1, 0, 1, 0, 1, // Bar 2: slightly more syncopated
      1, 0, 1, 0, 1, 0, 1, 1, // Bar 3: syncopation at the end
      1, 1, 1, 0, 1, 1, 0, 1  // Bar 4: rich triple note ending
    ],
    progression: [1.0, 1.2, 1.5, 0.9], // C minor -> Ab -> G -> Bb progression
    leadScale: [1.0, 1.2, 1.34, 1.5, 1.8, 2.0], // Minor Pentatonic
    bassPattern: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1], // Classic house bass groove
    description: 'BPM 124. ネオンきらめくプログレッシブ・ハウス。4小節単位で変化するコード展開と、心地よく響くシンセのグルーヴが楽しめる定番ステージ。'
  },
  {
    id: 'cyber-slasher',
    name: 'CYBER SLASHER',
    genre: 'Neuropunk Drum & Bass',
    bpm: 140,
    color: '#06b6d4', // Cyan
    accentColor: '#3b82f6', // Blue
    synths: {
      bassFreq: 58.27, // A#1
      leadType: 'sawtooth',
      bassType: 'sawtooth', // Aggressive saw bass
    },
    // Intense syncopated drum n bass layout
    pattern: [
      1, 1, 0, 1, 1, 0, 1, 1, // Bar 1: Fast slashing triplets
      1, 0, 1, 1, 0, 1, 1, 0, // Bar 2: Shifting timing
      1, 1, 1, 0, 1, 1, 1, 0, // Bar 3: Continuous rolling beats
      1, 1, 1, 1, 1, 0, 1, 1  // Bar 4: Maximum aggressive slash climax
    ],
    progression: [1.0, 0.89, 1.19, 1.0], // Dark drifting chord sequence
    leadScale: [1.0, 1.13, 1.2, 1.34, 1.5, 1.78, 2.0], // Dark industrial scale
    bassPattern: [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], // Ragged jungle-style D&B bass
    description: 'BPM 140. 急かすようなドラムンベースとインダストリアルな重低音。変則的な32拍構成の高速スラッシュノーツ群を華麗に切り裂け！'
  },
  {
    id: 'hyper-retro',
    name: 'HYPER RETRO FUTURE',
    genre: 'Outrun Synthwave',
    bpm: 115,
    color: '#f97316', // Orange
    accentColor: '#db2777', // Magenta-Pink
    synths: {
      bassFreq: 73.42, // D2
      leadType: 'triangle',
      bassType: 'square', // Classic fat retro square bass
    },
    pattern: [
      1, 0, 0, 1, 1, 0, 0, 1, // Bar 1: Outrun groove
      0, 1, 0, 1, 1, 0, 1, 0, // Bar 2: Offbeat echoes
      1, 0, 1, 0, 1, 1, 0, 1, // Bar 3: Continuous neon sliding notes
      0, 0, 1, 1, 1, 1, 0, 1  // Bar 4: Epic rhythm block
    ],
    progression: [1.0, 1.5, 1.33, 1.2], // Classic D minor -> A -> G -> F chord sequence
    leadScale: [1.0, 1.125, 1.25, 1.5, 1.667, 1.875, 2.0], // Melodic major/minor mix
    bassPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // Octave-pumping retro baseline
    description: 'BPM 115. レトロフューチャーでチルなシンセポップ。ゆったりとした4つ打ちとエモーショナルな和音進行に包まれ、ノスタルジーな旅を楽しもう。'
  },
  {
    id: 'cosmic-odyssey',
    name: 'COSMIC ODYSSEY',
    genre: 'Uplifting Cosmic Trance',
    bpm: 128,
    color: '#3b82f6', // Bright Blue
    accentColor: '#10b981', // Neon Emerald
    synths: {
      bassFreq: 65.41, // C2
      leadType: 'sawtooth',
      bassType: 'triangle',
    },
    pattern: [
      1, 0, 1, 1, 0, 1, 0, 1, // Bar 1: Euphoric opening syncopes
      1, 1, 0, 1, 1, 0, 1, 0, // Bar 2: Rolling delays
      1, 0, 1, 1, 0, 1, 0, 1, // Bar 3: Starry build-up
      1, 1, 1, 1, 1, 0, 1, 1  // Bar 4: Epic climax drop
    ],
    progression: [1.0, 1.25, 1.5, 1.68], // C major -> E min -> G maj -> A min (extremely euphoric rising)
    leadScale: [1.0, 1.125, 1.25, 1.5, 1.667, 1.875, 2.0], // Celestial major scale
    bassPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Continuous high-energy rolling trance sub-bass
    description: 'BPM 128. 壮大で高揚感溢れるアップリフティング・トランス。徐々に上昇していくコード展開とエモーショナルに輝くメロディが、果てしない宇宙への旅を描きます。'
  },
  {
    id: 'neo-tokyo-shadows',
    name: 'NEO TOKYO SHADOWS',
    genre: 'Industrial Cyberpunk Hardcore',
    bpm: 156,
    color: '#ef4444', // Hot Red
    accentColor: '#eab308', // Cyber Gold
    synths: {
      bassFreq: 55.0, // A1
      leadType: 'sawtooth',
      bassType: 'sawtooth',
    },
    pattern: [
      1, 1, 1, 0, 1, 1, 0, 1, // Bar 1: Aggressive rapid bursts
      1, 0, 1, 1, 0, 1, 1, 0, // Bar 2: Complex offbeat slashes
      1, 1, 1, 1, 0, 1, 1, 1, // Bar 3: Extreme hyper velocity section
      1, 1, 1, 1, 1, 1, 0, 1  // Bar 4: Dark cyberpunk drop chaos
    ],
    progression: [1.0, 1.06, 1.2, 0.89], // A Phrygian dark metallic progression (A -> Bb -> C -> G)
    leadScale: [1.0, 1.06, 1.26, 1.33, 1.5, 1.59, 1.8, 2.0], // Dark industrial metallic scale
    bassPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1], // Distorted heavy offbeat hardcore bassline
    description: 'BPM 156. 超高速インダストリアル・ハードコア。歪んだ重低音、ダークな不協和音リフ、圧倒的ノーツ密度が五感を支配する極限のステージ。'
  }
];
