import { Track, Side } from '../types';

export class AudioEngine {
  public ctx: AudioContext | null = null;
  private primaryGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Scheduling states
  private timerId: number | null = null;
  private nextNoteTime = 0.0;
  private current16thNote = 0;
  private currentBar = 0;
  private bpm = 120;
  private isRunning = false;
  private lastSpawnSide: Side = 'left';

  // Song meta
  private currentTrack: Track | null = null;

  // Callbacks
  private onBeatCallback: (beatNumber: number, time: number) => void = () => {};
  private onSpawnEnemyCallback: (side: Side, targetTime: number) => void = () => {};

  constructor() {
    // Lazy loaded when interactive to satisfy browser autoplay policies
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.primaryGain = this.ctx.createGain();
    this.primaryGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // moderate master volume

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128; // small FFT for responsive visualizer bars

    // Connect nodes
    this.primaryGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.generateNoiseBuffer();
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public setTrack(track: Track) {
    this.currentTrack = track;
    this.bpm = track.bpm;
  }

  public registerCallbacks(
    onBeat: (beatNumber: number, time: number) => void,
    onSpawnEnemy: (side: Side, targetTime: number) => void
  ) {
    this.onBeatCallback = onBeat;
    this.onSpawnEnemyCallback = onSpawnEnemy;
  }

  public start() {
    // CRITICAL: Safely stop any currently active scheduler loop before starting a new one
    // to prevent duplicate concurrent setTimeout tasks from compounding and freezing the app.
    this.stop();
    
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isRunning = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.current16thNote = 0;
    this.currentBar = 0;

    const lookahead = 25.0; // ms
    const scheduleAheadTime = 0.12; // s

    const scheduler = () => {
      if (!this.ctx || !this.isRunning) return;

      // CRITICAL: Avoid infinite catchup rendering/computing freeze when audio clock drifts 
      // or after tab returns from background state or resume.
      if (this.nextNoteTime < this.ctx.currentTime) {
        this.nextNoteTime = this.ctx.currentTime;
      }

      let safetyCounter = 0;
      while (
        this.nextNoteTime < (this.ctx.currentTime + scheduleAheadTime) && 
        safetyCounter < 100
      ) {
        safetyCounter++;
        this.scheduleNote(this.current16thNote, this.nextNoteTime);
        this.advanceNote();
      }

      if (this.isRunning) {
        this.timerId = window.setTimeout(scheduler, lookahead);
      }
    };

    scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private advanceNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16th = 0.25 * secondsPerBeat;
    this.nextNoteTime += secondsPer16th;

    const prevNote = this.current16thNote;
    this.current16thNote = (this.current16thNote + 1) % 16; // 16-step grid (1 bar loop)
    if (prevNote === 15) {
      this.currentBar++;
    }
  }

  private scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.currentTrack) return;

    const track = this.currentTrack;

    // Trigger visual beat pulse on beat divisions (quarter notes: step 0, 4, 8, 12)
    if (step % 4 === 0) {
      const beatNum = Math.floor(step / 4);
      // Execute micro-task immediately so UI knows ahead of time, or queue for precise synchronization in redraw
      setTimeout(() => {
        if (this.isRunning) this.onBeatCallback(beatNum, time);
      }, 0);
    }

    // --- PROCEDURAL AUDIO DRUMS ---
    
    // Kick Drum: Four-on-the-floor (every 4 steps: 0, 4, 8, 12)
    if (step % 4 === 0) {
      this.synthesizeKick(time);
    }

    // Clap / Snare: beat 2 and 4 (step 4, 12)
    if (step === 4 || step === 12) {
      this.synthesizeSnare(time);
    }

    // Hi-Hats: upbeat 8ths (step 2, 6, 10, 14) and 16th groove variations
    if (step % 4 === 2) {
      this.synthesizeHiHat(time, true); // open upbeat hat
    } else if (step % 2 === 1 && Math.random() > 0.4) {
      this.synthesizeHiHat(time, false); // closed dynamic hat
    }

    // --- PROCEDURAL AUDIO SYNTHESIZERS ---
    
    // Bass sequence (dynamic techno basslines in Eb/C minor depending on track)
    // Plays syncopated rhythmic patterns
    const bassPattern = track.bassPattern ?? [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1];
    if (bassPattern[step] === 1) {
      // Determine musical notes based on track setups
      const currentBarInLoop = this.currentBar % 4;
      const barChordMultiplier = (track.progression && track.progression[currentBarInLoop]) ?? 1.0;
      
      let freq = track.synths.bassFreq * barChordMultiplier;
      
      // Dynamic synth pattern transposition
      const beatIndex = Math.floor(step / 4);
      if (beatIndex === 1) freq *= 1.0;
      else if (beatIndex === 2) freq *= 1.12; // perfect fourth/fifths steps
      else if (beatIndex === 3) freq *= 0.95; // ending resolution
      
      this.synthesizeBass(freq, time);
    }

    // Lead Arpeggiator (plays glowing high riffs to guide visual energy)
    // Only schedule sometimes to keep it musical and avoid cluttering
    if (step % 2 === 0) {
      const scaleMultiplier = track.leadScale ?? [1, 1.2, 1.25, 1.5, 1.8, 2.0];
      const r = (step * 7 + this.currentBar * 3) % scaleMultiplier.length; // Vary arpeggio offset by bar!
      
      const currentBarInLoop = this.currentBar % 4;
      const barChordMultiplier = (track.progression && track.progression[currentBarInLoop]) ?? 1.0;

      const freq = track.synths.bassFreq * 4 * scaleMultiplier[r] * barChordMultiplier; // transpose up 2 octaves

      // Groove probability
      const leadChance = track.bpm > 125 ? 0.65 : 0.45;
      if (step % 8 !== 2 && (step % 4 === 0 || Math.random() < leadChance)) {
        this.synthesizeLead(freq, time, track.synths.leadType);
      }
    }

    // --- GAMEPLAY ENEMY SPAWNING ---
    // Align note timing perfectly to the config-defined rhythm patterns for each track/difficulty.
    // Since track.pattern represents 8th notes (8-step grid across a full bar), we check on every 2nd step (step % 2 === 0).
    if (step % 2 === 0) {
      let patternIndex = Math.floor(step / 2); // Map 16th steps (0-15) to 8th note pattern index
      if (track.pattern.length > 8) {
        const barsCount = Math.floor(track.pattern.length / 8);
        const currentBarInLoop = this.currentBar % barsCount;
        patternIndex = (currentBarInLoop * 8) + Math.floor(step / 2);
      }

      if (track.pattern[patternIndex] === 1) {
        const visualDelay = 2.0; // Reach strike point after exactly 2 seconds of visual movement
        const targetTime = time + visualDelay;

        // Determine node placement gracefully to maximize tactile playing satisfaction
        let chosenSide: 'left' | 'right' | 'both' = 'left';
        
        // Dynamic dual notes density based on song speed (tempo)
        const doubleChance = track.bpm > 130 ? 0.16 : 0.08;
        
        if (Math.random() < doubleChance) {
          chosenSide = 'both';
        } else {
          // Dynamic alternating notes tracker for seamless key-play balance
          chosenSide = this.lastSpawnSide === 'left' ? 'right' : 'left';
          this.lastSpawnSide = chosenSide;
        }

        if (chosenSide === 'left' || chosenSide === 'both') {
          setTimeout(() => {
            if (this.isRunning) this.onSpawnEnemyCallback('left', targetTime);
          }, 0);
        }
        if (chosenSide === 'right' || chosenSide === 'both') {
          setTimeout(() => {
            if (this.isRunning) this.onSpawnEnemyCallback('right', targetTime);
          }, 0);
        }
      }
    }
  }

  // --- AUDIO SYNTHESIS DIRECTIVES ---

  private synthesizeKick(time: number) {
    if (!this.ctx || !this.primaryGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.primaryGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    // Rapid exponential sweep down (standard EDM kick technique)
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gainNode.gain.setValueAtTime(0.7, time);
    gainNode.gain.linearRampToValueAtTime(0.5, time + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.start(time);
    osc.stop(time + 0.23);
  }

  private synthesizeSnare(time: number) {
    if (!this.ctx || !this.primaryGain || !this.noiseBuffer) return;

    // Snare white-noise tail
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(900, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.primaryGain);

    // Snare tonal body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    oscGain.gain.setValueAtTime(0.2, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.primaryGain);

    noiseSource.start(time);
    noiseSource.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private synthesizeHiHat(time: number, isOpen: boolean) {
    if (!this.ctx || !this.primaryGain || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time); // sparkling high frequencies

    const gainNode = this.ctx.createGain();
    // High-pass dynamic hats
    gainNode.gain.setValueAtTime(isOpen ? 0.08 : 0.04, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + (isOpen ? 0.25 : 0.06));

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.primaryGain);

    source.start(time);
    source.stop(time + (isOpen ? 0.28 : 0.08));
  }

  private synthesizeBass(frequency: number, time: number) {
    if (!this.ctx || !this.primaryGain || !this.currentTrack) return;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.primaryGain);

    // High quality sub-octave layering
    osc.type = this.currentTrack.synths.bassType;
    osc.frequency.setValueAtTime(frequency, time);

    subOsc.type = 'sine'; // clean round sub bass
    subOsc.frequency.setValueAtTime(frequency / 2, time);

    // Warm low-pass filter with slight envelope sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.18);
    filter.Q.setValueAtTime(2, time);

    gainNode.gain.setValueAtTime(0.16, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.start(time);
    osc.stop(time + 0.22);
    subOsc.start(time);
    subOsc.stop(time + 0.22);
  }

  private synthesizeLead(frequency: number, time: number, type: OscillatorType) {
    if (!this.ctx || !this.primaryGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const delay = this.ctx.createDelay();
    const feedback = this.ctx.createGain();

    // Wire delay line for cybernetic club echoes!
    osc.connect(gainNode);
    gainNode.connect(this.primaryGain);
    
    // Echo paths
    gainNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    feedback.connect(this.primaryGain);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);

    // Warm high-pitched glides
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.98, time + 0.15);

    gainNode.gain.setValueAtTime(0.035, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    // Setup stereo-like delays
    delay.delayTime.setValueAtTime(0.18, time);
    feedback.gain.setValueAtTime(0.35, time);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  // --- GAMEPLAY ONE-SHOT SOUND EFFECTS ---
  // When hitting/missing, synthesize active game reactions immediately.

  public playHitSound(result: 'perfect' | 'great' | 'good') {
    if (!this.ctx || !this.primaryGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.primaryGain);

    osc.type = 'sawtooth';
    
    // Pitch differs by performance
    if (result === 'perfect') {
      osc.frequency.setValueAtTime(880, now); // high sparkling A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // slide up
      gain.gain.setValueAtTime(0.15, now);
    } else if (result === 'great') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
    } else {
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playMissSound() {
    if (!this.ctx || !this.primaryGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.primaryGain);

    // Discordant, sliding sound for missing beats (record-scratch effect)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playSlashSfx(side: Side) {
    if (!this.ctx || !this.primaryGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.primaryGain);

    // Fast sci-fi laser slash
    osc.type = 'sawtooth';
    const startFreq = side === 'left' ? 400 : 600;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.09);
  }
}
