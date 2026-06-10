import React, { useEffect, useRef, useState } from 'react';
import { Track, Enemy, Side, HitEffect, GameStats } from '../types';
import { AudioEngine } from './AudioEngine';
import { Sparkles, Activity, Zap, Play, RotateCcw } from 'lucide-react';

// Highly compatible fallback rounded rectangle drawer to prevent browser crash
const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

interface ClubStageProps {
  track: Track;
  audioEngine: AudioEngine;
  stats: GameStats;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  isPaused: boolean;
  onGameOver: () => void;
  onGameClear: () => void;
}

export const ClubStage: React.FC<ClubStageProps> = ({
  track,
  audioEngine,
  stats,
  setStats,
  isPaused,
  onGameOver,
  onGameClear,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Gameplay Refs to prevent state delay in high-speed frames
  const enemiesRef = useRef<Enemy[]>([]);
  const hitEffectsRef = useRef<HitEffect[]>([]);
  const particlesRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    maxLife: number;
  }[]>([]);

  // Track the beat spikes for visual flashing
  const lastBeatTimeRef = useRef<number>(0);
  const pulseFactorRef = useRef<number>(0);

  // Strike states for key highlights
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);
  const leftActiveRef = useRef(false);
  const rightActiveRef = useRef(false);

  // Player animation state
  const playerStateRef = useRef<'idle' | 'strike-left' | 'strike-right' | 'hit'>('idle');
  const playerActionTimerRef = useRef<number>(0);

  // Track progress and finish state
  const gameDuration = 45; // game duration in seconds per stage
  const elapsedSecondsRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const gameFinishedRef = useRef<boolean>(false);

  // Timing helper
  const getCurrentAudioTime = () => {
    return audioEngine.ctx ? audioEngine.ctx.currentTime : 0;
  };

  // 1. ResizeObserver for fluid responsive dimensions
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = width * window.devicePixelRatio;
          canvas.height = height * window.devicePixelRatio;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Keep unstable callbacks in refs to prevent useEffect teardown loops
  const onGameClearRef = useRef(onGameClear);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onGameClearRef.current = onGameClear;
  }, [onGameClear]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // 2. Sound scheduler callbacks
  useEffect(() => {
    gameFinishedRef.current = false;
    audioEngine.setTrack(track);

    // Register timing callbacks
    audioEngine.registerCallbacks(
      // On Musical Beat
      (beatNumber, time) => {
        lastBeatTimeRef.current = time;
        pulseFactorRef.current = 1.0; // trigger strobe flash / ring pulse
      },
      // On Enemy Spawn
      (side, targetTime) => {
        if (gameFinishedRef.current) return;
        const id = `${side}-${Math.random()}`;
        const iconType = Math.random() < 0.25 ? 'speed' : Math.random() < 0.15 ? 'ghost' : 'basic';
        const newEnemy: Enemy = {
          id,
          side,
          spawnTime: getCurrentAudioTime(),
          targetTime,
          hit: false,
          result: null,
          notified: false,
          iconType,
        };
        enemiesRef.current.push(newEnemy);
      }
    );

    // Dynamic start to ensure safe callback registration and initialization timing after mount
    if (!isPaused) {
      audioEngine.start();
    }

    // Track active gameplay duration
    startTimeRef.current = getCurrentAudioTime();
    const tickInterval = setInterval(() => {
      if (isPaused) return;
      const audioTime = getCurrentAudioTime();
      const elapsed = audioTime - startTimeRef.current;
      elapsedSecondsRef.current = elapsed;

      // When the song is finished playing fully:
      if (elapsed >= gameDuration && !gameFinishedRef.current) {
        gameFinishedRef.current = true;
        clearInterval(tickInterval);
        audioEngine.stop();
        setTimeout(() => {
          onGameClearRef.current();
        }, 1500);
      }
    }, 100);

    return () => {
      clearInterval(tickInterval);
      audioEngine.stop();
    };
  }, [track, audioEngine, isPaused]);

  // 3. Game play hit evaluation
  const handleStrike = (side: Side) => {
    if (isPaused || gameFinishedRef.current) return;

    audioEngine.init();
    audioEngine.playSlashSfx(side);

    // Trigger player strike animation
    playerStateRef.current = side === 'left' ? 'strike-left' : 'strike-right';
    playerActionTimerRef.current = 10; // active for 10 frames

    const now = getCurrentAudioTime();
    const accuracyThreshold = 0.22; // max window allowed for any hit type (seconds)

    // Filter candidate enemies on this track
    const targets = enemiesRef.current.filter((e) => e.side === side && !e.hit && e.result === null);

    if (targets.length === 0) {
      // blank swing - visual slice only
      return;
    }

    // Find the one closest to target landing time
    let minDiff = Infinity;
    let closestEnemy: Enemy | null = null;

    for (const enemy of targets) {
      const diff = Math.abs(now - enemy.targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestEnemy = enemy;
      }
    }

    if (closestEnemy && minDiff <= accuracyThreshold) {
      closestEnemy.hit = true;

      let resultText: 'perfect' | 'great' | 'good' = 'good';
      let scoreAdd = 40;
      let healthRestore = 2;

      if (minDiff <= 0.05) {
        resultText = 'perfect';
        scoreAdd = 100;
        healthRestore = 6;
      } else if (minDiff <= 0.11) {
        resultText = 'great';
        scoreAdd = 70;
        healthRestore = 4;
      }

      closestEnemy.result = resultText;
      audioEngine.playHitSound(resultText);

      // Add cool spark particles at the Hit gate
      const canvas = canvasRef.current;
      if (canvas) {
        const dScale = window.devicePixelRatio;
        const gateX = side === 'left' ? canvas.width * 0.35 : canvas.width * 0.65;
        const gateY = canvas.height * 0.65;
        
        // Explode colorful star particles
        const color = resultText === 'perfect' ? '#f59e0b' : resultText === 'great' ? '#10b981' : '#3b82f6';
        for (let i = 0; i < 24; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (Math.random() * 8 + 4) * dScale;
          particlesRef.current.push({
            x: gateX,
            y: gateY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (Math.random() * 3 * dScale), // slight upward bias
            color,
            size: (Math.random() * 4 + 2) * dScale,
            life: 0,
            maxLife: Math.random() * 25 + 15,
          });
        }

        // Calculate exact deviation from perfect timing (0.00)
        const timeDiffVal = now - closestEnemy.targetTime;
        const formattedDiff = (timeDiffVal >= 0 ? "+" : "") + timeDiffVal.toFixed(2) + "s";

        // Add Floating Hit Judgement Text
        hitEffectsRef.current.push({
          id: Math.random().toString(),
          x: gateX,
          y: gateY - 50 * dScale,
          text: resultText.toUpperCase(),
          color: resultText === 'perfect' ? '#f59e0b' : resultText === 'great' ? '#10b981' : '#60a5fa',
          scale: 1.2,
          side,
          timeDiff: formattedDiff,
        });
      }

      // Update React game states
      setStats((prev) => {
        const newCombo = prev.combo + 1;
        return {
          ...prev,
          score: prev.score + scoreAdd + Math.floor(newCombo / 10) * 10,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          perfectCount: prev.perfectCount + (resultText === 'perfect' ? 1 : 0),
          greatCount: prev.greatCount + (resultText === 'great' ? 1 : 0),
          goodCount: prev.goodCount + (resultText === 'good' ? 1 : 0),
          health: Math.min(100, prev.health + healthRestore),
        };
      });
    }
  };

  // Keyboard Handler for high responsive gameplay input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // ignore holding down key
      
      const key = e.key.toLowerCase();
      if (key === 'd' || key === 'left' || key === 'a') {
        setLeftActive(true);
        leftActiveRef.current = true;
        handleStrike('left');
      } else if (key === 'k' || key === 'right' || key === 'l') {
        setRightActive(true);
        rightActiveRef.current = true;
        handleStrike('right');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'd' || key === 'left' || key === 'a') {
        setLeftActive(false);
        leftActiveRef.current = false;
      } else if (key === 'k' || key === 'right' || key === 'l') {
        setRightActive(false);
        rightActiveRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused]);

  // 4. Main 60FPS High Performance Drawing Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Laser properties (dynamic angle offsets for dancing lasers)
    let laserPatternTime = 0;
    
    // Web Audio Analyzer data array
    const freqData = new Uint8Array(audioEngine.analyser ? audioEngine.analyser.frequencyBinCount : 0);

    const render = () => {
      const dScale = window.devicePixelRatio;
      
      // Clear canvas with a very soft alpha decay for beautiful glowing vector light trail effects!
      ctx.fillStyle = 'rgba(10, 10, 18, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Read real-time sound levels
      if (audioEngine.analyser) {
        audioEngine.analyser.getByteFrequencyData(freqData);
      }

      const now = getCurrentAudioTime();

      // Decrease beat-pulse factor
      if (pulseFactorRef.current > 0) {
        pulseFactorRef.current -= 0.05;
        if (pulseFactorRef.current < 0) pulseFactorRef.current = 0;
      }

      // Check player damage / action timings
      if (playerActionTimerRef.current > 0) {
        playerActionTimerRef.current--;
        if (playerActionTimerRef.current === 0) {
          playerStateRef.current = 'idle';
        }
      }

      // ----------------- DRAW DRUM-BEAT EQUALIZERS -----------------
      // Draw energetic EQ columns on the left and right mirrors
      const barCount = 16;
      const barWidth = canvas.width * 0.12 / barCount;
      const maxEqualizerHeight = canvas.height * 0.35;

      ctx.save();
      for (let i = 0; i < barCount; i++) {
        const amplitude = freqData[i] || 0;
        const barHeight = (amplitude / 255) * maxEqualizerHeight;
        
        ctx.fillStyle = `${track.color}44`; // subtle transparent glow
        ctx.strokeStyle = track.accentColor;
        ctx.lineWidth = 1.5 * dScale;

        // Left EQ Deck
        const leftX = 15 * dScale + (i * barWidth);
        const yBase = canvas.height * 0.8;
        
        ctx.fillRect(leftX, yBase - barHeight, barWidth - (2 * dScale), barHeight);
        ctx.strokeRect(leftX, yBase - barHeight, barWidth - (2 * dScale), barHeight);

        // Right EQ Deck (Mirrored)
        const rightX = canvas.width - (15 * dScale) - ((i + 1) * barWidth);
        ctx.fillRect(rightX, yBase - barHeight, barWidth - (2 * dScale), barHeight);
        ctx.strokeRect(rightX, yBase - barHeight, barWidth - (2 * dScale), barHeight);
      }
      ctx.restore();

      // ----------------- 3D DANCE FLOOR GRID -----------------
      // Symmetrical club perspective lines merging to the horizon center
      ctx.save();
      const horizonY = canvas.height * 0.45;
      const centerY = canvas.height * 0.65;
      const centerX = canvas.width / 2;

      // Pulse color matching track
      ctx.strokeStyle = pulseFactorRef.current > 0.5 ? track.color : `${track.color}77`;
      ctx.lineWidth = (2 + pulseFactorRef.current * 3) * dScale;

      // Draw bottom glowing border lines
      ctx.beginPath();
      // Left track tube
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width * 0.35, centerY);
      // Right track tube
      ctx.moveTo(canvas.width, centerY);
      ctx.lineTo(canvas.width * 0.65, centerY);
      ctx.stroke();

      // Draw moving grid lines indicating beat flow
      ctx.strokeStyle = `${track.accentColor}33`;
      ctx.lineWidth = 1 * dScale;
      const gridCount = 12;
      laserPatternTime += 0.01 + (pulseFactorRef.current * 0.02); // speed up on beat!

      for (let i = 0; i < gridCount; i++) {
        const offset = ((i / gridCount) + (laserPatternTime * 0.15)) % 1.0;
        const lineY = centerY + (canvas.height - centerY) * offset;
        
        ctx.beginPath();
        // Left floor steps
        ctx.moveTo(canvas.width * 0.35 * (1 - offset), lineY);
        ctx.lineTo(canvas.width * 0.35 + (canvas.width * 0.15 * offset), lineY);
        // Right floor steps
        ctx.moveTo(canvas.width - (canvas.width * 0.35 * (1 - offset)), lineY);
        ctx.lineTo(canvas.width * 0.65 - (canvas.width * 0.15 * offset), lineY);
        ctx.stroke();
      }
      ctx.restore();

      // ----------------- CLUB LASERS -----------------
      // Dynamic moving spotlights dancing in a dark club vibe
      ctx.save();
      const laserCount = 5;
      const anchorPoints = [
        { x: canvas.width * 0.1, y: 0 },
        { x: canvas.width * 0.3, y: 0 },
        { x: canvas.width * 0.5, y: 0 },
        { x: canvas.width * 0.7, y: 0 },
        { x: canvas.width * 0.9, y: 0 },
      ];

      anchorPoints.forEach((anchor, idx) => {
        const sweepAngle = Math.sin(laserPatternTime * 0.7 + idx) * (Math.PI / 4) + (Math.PI / 2);
        const endX = anchor.x + Math.cos(sweepAngle) * canvas.height * 1.5;
        const endY = anchor.y + Math.sin(sweepAngle) * canvas.height * 1.5;

        // Pulse width matched to music amplitude
        const avgFreq = freqData[idx * 2] || 100;
        const laserWidth = (1 + (avgFreq / 255) * 4) * dScale;

        // Gradient laser beams
        const grad = ctx.createLinearGradient(anchor.x, anchor.y, endX, endY);
        grad.addColorStop(0, idx % 2 === 0 ? track.color : track.accentColor);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = laserWidth;
        ctx.shadowBlur = 10 * dScale;
        ctx.shadowColor = idx % 2 === 0 ? track.color : track.accentColor;

        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      });
      ctx.restore();

      // ----------------- DISCO BALL -----------------
      // Glowing sphere at the center-top casting sparkles
      ctx.save();
      const ballX = canvas.width / 2;
      const ballY = canvas.height * 0.15;
      const ballRadius = 35 * dScale;

      // Draw disco ball wire
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1.5 * dScale;
      ctx.beginPath();
      ctx.moveTo(ballX, 0);
      ctx.lineTo(ballX, ballY - ballRadius);
      ctx.stroke();

      // Draw disco ball outer aura
      const ballGlow = ctx.createRadialGradient(ballX, ballY, ballRadius - 10, ballX, ballY, ballRadius + 30 * dScale);
      ballGlow.addColorStop(0, '#ffffff');
      ballGlow.addColorStop(0.3, track.color);
      ballGlow.addColorStop(1, 'rgba(10, 10, 18, 0)');
      ctx.fillStyle = ballGlow;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius + 35 * dScale, 0, Math.PI * 2);
      ctx.fill();

      // Inner segmented disco ball panels
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 0.5 * dScale;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Horizontal / vertical segment cuts that rotate
      const rotationOffset = (laserPatternTime * 0.4) % (Math.PI / 3);
      for (let r = 0; r < Math.PI * 2; r += Math.PI / 6) {
        const sweep = r + rotationOffset;
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        ctx.lineTo(ballX + Math.cos(sweep) * ballRadius, ballY + Math.sin(sweep) * ballRadius);
        ctx.stroke();
      }

      // Slices arcs
      for (let h = -3; h <= 3; h++) {
        const arcY = ballY + (h * ballRadius * 0.28);
        const w = Math.sqrt(Math.max(0, ballRadius * ballRadius - (h * ballRadius * 0.28) * (h * ballRadius * 0.28)));
        ctx.beginPath();
        ctx.ellipse(ballX, arcY, w, w * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // Disco ball float sparkles generator
      if (Math.random() < 0.15) {
        particlesRef.current.push({
          x: ballX + (Math.random() * 80 - 40) * dScale,
          y: ballY + 40 * dScale,
          vx: (Math.random() * 1.6 - 0.8) * dScale,
          vy: (Math.random() * 2 + 1) * dScale,
          color: Math.random() < 0.5 ? '#ffffff' : track.color,
          size: (Math.random() * 3 + 1) * dScale,
          life: 0,
          maxLife: 80 + Math.random() * 40,
        });
      }

      // ----------------- INTERACTING STRIKE GATES -----------------
      // Glowing gates where enemies MUST overlap for a high rating
      ctx.save();
      const leftGateX = canvas.width * 0.35;
      const rightGateX = canvas.width * 0.65;
      const playerY = canvas.height * 0.65;
      const gateRadius = 22 * dScale;

      // Draw Gate Rings
      // Left Gate Ring
      ctx.lineWidth = (3 + (leftActiveRef.current ? 4 : 0)) * dScale;
      ctx.strokeStyle = leftActiveRef.current ? '#ffffff' : `${track.color}dd`;
      ctx.shadowBlur = (leftActiveRef.current ? 15 : 4) * dScale;
      ctx.shadowColor = track.color;
      ctx.beginPath();
      ctx.arc(leftGateX, playerY, gateRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Right Gate Ring
      ctx.lineWidth = (3 + (rightActiveRef.current ? 4 : 0)) * dScale;
      ctx.strokeStyle = rightActiveRef.current ? '#ffffff' : `${track.accentColor}dd`;
      ctx.shadowBlur = (rightActiveRef.current ? 15 : 4) * dScale;
      ctx.shadowColor = track.accentColor;
      ctx.beginPath();
      ctx.arc(rightGateX, playerY, gateRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0; // reset
      ctx.restore();

      // ----------------- DRUM-BEAT RING PULSES -----------------
      // Cool retro ripples extending outward from the gates on the beat
      ctx.save();
      if (pulseFactorRef.current > 0.01) {
        const ringAlpha = Math.max(0, pulseFactorRef.current);
        const ringRad = gateRadius + (35 * dScale) * (1 - pulseFactorRef.current);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha * 0.5})`;
        ctx.lineWidth = 1.5 * dScale;
        
        ctx.beginPath();
        ctx.arc(leftGateX, playerY, ringRad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(rightGateX, playerY, ringRad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // ----------------- PROCESS ENEMIES / SLIDES -----------------
      // Compute linear position from target time delta to ensure perfect timing synchronization
      const enemies = enemiesRef.current;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        // Travel duration is exactly 2.0s. Compute progress based precisely on targetTime so that
        // progress is 1.0 when now === targetTime.
        const totalDuration = 2.0;
        const progress = 1.0 - (e.targetTime - now) / totalDuration;

        // Evaluate PAST MISS threshold (if player let it slide past and missed completely)
        // Miss threshold is 0.18 seconds late
        if (now - e.targetTime > 0.18) {
          if (!e.hit && e.result === null && !e.notified) {
            e.result = 'miss';
            e.notified = true;
            
            playerStateRef.current = 'hit';
            playerActionTimerRef.current = 12; // visual damage bounce

            audioEngine.playMissSound();

            // Display floating MISS
            const hitX = e.side === 'left' ? leftGateX : rightGateX;
            hitEffectsRef.current.push({
              id: Math.random().toString(),
              x: hitX,
              y: playerY - 30 * dScale,
              text: 'MISS',
              color: '#ef4444',
              scale: 1.0,
              side: e.side,
            });

            // Spark particles on missing
            const sparkColor = '#ef4444';
            for (let p = 0; p < 8; p++) {
              particlesRef.current.push({
                x: hitX,
                y: playerY,
                vx: (Math.random() * 4 - 2) * dScale,
                vy: (Math.random() * 4 - 2) * dScale,
                color: sparkColor,
                size: (Math.random() * 2 + 1.5) * dScale,
                life: 0,
                maxLife: 20,
              });
            }

            // Deduct stats safely outside the requestAnimationFrame call stack and keep the state updater pure
            setTimeout(() => {
              let isDead = false;
              setStats((prev) => {
                const nextHealth = Math.max(0, prev.health - 10);
                if (nextHealth <= 0) {
                  isDead = true;
                }
                return {
                  ...prev,
                  combo: 0,
                  missCount: prev.missCount + 1,
                  health: nextHealth,
                };
              });

              if (isDead && !gameFinishedRef.current) {
                gameFinishedRef.current = true;
                audioEngine.stop();
                setTimeout(() => onGameOverRef.current(), 800);
              }
            }, 0);
          }
        }

        // Remove old off-screen or hit enemies
        // Keep them slightly after hit for slice effects, or clean up
        if (progress > 1.25 || e.hit) {
          enemies.splice(i, 1);
          continue;
        }

        // Draw active floating enemy
        ctx.save();
        
        // Match line slide
        let enemyX = 0;
        if (e.side === 'left') {
          // Slide from left edge (0) to hitGate (leftGateX)
          enemyX = progress * leftGateX;
        } else {
          // Slide from right edge (canvas.width) to hitGate (rightGateX)
          enemyX = canvas.width - progress * (canvas.width - rightGateX);
        }

        const size = (e.iconType === 'speed' ? 14 : e.iconType === 'ghost' ? 12 : 16) * dScale;
        const pulseSize = size + Math.sin(laserPatternTime * 8) * 1.5 * dScale;

        // Customize drawings depending on enemy variants
        const color = e.side === 'left' ? track.color : track.accentColor;
        ctx.shadowBlur = 12 * dScale;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * dScale;

        if (e.iconType === 'speed') {
          // Star polygon
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const angle = (s * Math.PI * 2 / 5) - Math.PI / 2 + (laserPatternTime * 4);
            ctx.lineTo(enemyX + Math.cos(angle) * pulseSize, playerY + Math.sin(angle) * pulseSize);
            const innerAngle = angle + Math.PI / 5;
            ctx.lineTo(enemyX + Math.cos(innerAngle) * (pulseSize * 0.5), playerY + Math.sin(innerAngle) * (pulseSize * 0.5));
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.iconType === 'ghost') {
          // Ghost diamond core
          ctx.beginPath();
          ctx.moveTo(enemyX, playerY - pulseSize);
          ctx.lineTo(enemyX + pulseSize * 0.8, playerY);
          ctx.lineTo(enemyX, playerY + pulseSize);
          ctx.lineTo(enemyX - pulseSize * 0.8, playerY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Cool futuristic CD Disc / Ring beat core
          ctx.beginPath();
          ctx.arc(enemyX, playerY, pulseSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Center design
          ctx.fillStyle = '#0a0a12';
          ctx.beginPath();
          ctx.arc(enemyX, playerY, pulseSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }

        ctx.restore();
      }

      // ----------------- DRAW PLAYER DJ CHARACTER -----------------
      // Center avatar that bobs on counts and strikes!
      ctx.save();
      const playerX = centerX;
      const basePlayerY = playerY;
      
      // Hip bob calculation
      const bobY = basePlayerY + Math.sin(laserPatternTime * 4) * 4 * dScale;

      ctx.shadowBlur = 15 * dScale;
      ctx.shadowColor = track.accentColor;
      
      // Draw neon floor deck
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 * dScale;
      ctx.beginPath();
      ctx.ellipse(playerX, basePlayerY + 35 * dScale, 45 * dScale, 15 * dScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Check player pose
      if (playerStateRef.current === 'idle') {
        // Draw cute headphone/helmet wearing DJ avatar
        ctx.fillStyle = '#1e1b4b'; // deep indigo
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 2.5 * dScale;

        // Head/Body
        ctx.beginPath();
        ctx.arc(playerX, bobY, 18 * dScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Neon Visor Eyes
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8 * dScale;
        ctx.shadowColor = '#ffffff';
        drawRoundRect(ctx, playerX - 10 * dScale, bobY - 4 * dScale, 20 * dScale, 6 * dScale, 3 * dScale);
        ctx.fill();

        // Headphones band
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 2 * dScale;
        ctx.beginPath();
        ctx.arc(playerX, bobY, 21 * dScale, Math.PI, 0);
        ctx.stroke();

        // Ears
        ctx.fillStyle = track.accentColor;
        ctx.beginPath();
        ctx.arc(playerX - 20 * dScale, bobY, 6 * dScale, 0, Math.PI * 2);
        ctx.arc(playerX + 20 * dScale, bobY, 6 * dScale, 0, Math.PI * 2);
        ctx.fill();
      } else if (playerStateRef.current === 'strike-left') {
        // Swipe stance left
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * dScale;

        // Leaning action head
        ctx.beginPath();
        ctx.arc(playerX - 8 * dScale, bobY, 18 * dScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Sweeping light katana trail leftwards
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 5 * dScale;
        ctx.shadowBlur = 20 * dScale;
        ctx.shadowColor = track.color;
        ctx.beginPath();
        ctx.moveTo(playerX, bobY);
        ctx.quadraticCurveTo(playerX - 25 * dScale, bobY - 25 * dScale, leftGateX + 10 * dScale, playerY);
        ctx.stroke();

        // Visor glow
        ctx.fillStyle = track.color;
        ctx.shadowBlur = 10 * dScale;
        ctx.shadowColor = track.color;
        drawRoundRect(ctx, playerX - 18 * dScale, bobY - 4 * dScale, 14 * dScale, 6 * dScale, 3 * dScale);
        ctx.fill();
      } else if (playerStateRef.current === 'strike-right') {
        // Swipe stance right
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * dScale;

        // Leaning action head right
        ctx.beginPath();
        ctx.arc(playerX + 8 * dScale, bobY, 18 * dScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Sweeping light katana trail rightwards
        ctx.strokeStyle = track.accentColor;
        ctx.lineWidth = 5 * dScale;
        ctx.shadowBlur = 20 * dScale;
        ctx.shadowColor = track.accentColor;
        ctx.beginPath();
        ctx.moveTo(playerX, bobY);
        ctx.quadraticCurveTo(playerX + 25 * dScale, bobY - 25 * dScale, rightGateX - 10 * dScale, playerY);
        ctx.stroke();

        // Visor glow
        ctx.fillStyle = track.accentColor;
        ctx.shadowBlur = 10 * dScale;
        ctx.shadowColor = track.accentColor;
        drawRoundRect(ctx, playerX + 4 * dScale, bobY - 4 * dScale, 14 * dScale, 6 * dScale, 3 * dScale);
        ctx.fill();
      } else if (playerStateRef.current === 'hit') {
        // Flickering damage shock
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3 * dScale;
        ctx.shadowBlur = 20 * dScale;
        ctx.shadowColor = '#ef4444';

        ctx.beginPath();
        // Shake coordinate slightly
        const shakeX = (Math.random() * 8 - 4) * dScale;
        const shakeY = (Math.random() * 8 - 4) * dScale;
        ctx.arc(playerX + shakeX, bobY + shakeY, 18 * dScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Red visor eyes
        ctx.fillStyle = '#ffffff';
        drawRoundRect(ctx, playerX + shakeX - 10 * dScale, bobY + shakeY - 4 * dScale, 20 * dScale, 6 * dScale, 3 * dScale);
        ctx.fill();
      }

      ctx.restore();

      // ----------------- EVALUATING FLOATING JUDGEMENT TEXTS -----------------
      const hitEffects = hitEffectsRef.current;
      ctx.save();
      for (let i = hitEffects.length - 1; i >= 0; i--) {
        const effect = hitEffects[i];
        
        effect.y -= 1.0 * dScale; // rise slowly
        effect.scale -= 0.015;     // shrink

        const fontSize = Math.max(1, Math.floor(22 * effect.scale * dScale));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = effect.color;
        ctx.shadowBlur = 12 * dScale;
        ctx.shadowColor = effect.color;

        ctx.fillText(effect.text, effect.x, effect.y);

        if (effect.timeDiff) {
          ctx.font = `bold ${Math.max(1, Math.floor(12 * effect.scale * dScale))}px system-ui, sans-serif`;
          
          // Draw time diff centered dynamically over the circular DJ character
          const initialY = playerY - 50 * dScale;
          const riseOffset = initialY - effect.y;
          const timeDiffX = centerX;
          const timeDiffY = bobY - 38 * dScale - riseOffset;

          // Highly readable stroke + fill pairing
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2 * dScale;
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 6 * dScale;
          ctx.shadowColor = '#000000';
          
          ctx.strokeText(effect.timeDiff, timeDiffX, timeDiffY);
          ctx.fillText(effect.timeDiff, timeDiffX, timeDiffY);
        }

        if (effect.scale <= 0.5) {
          hitEffects.splice(i, 1);
        }
      }
      ctx.restore();

      // ----------------- DRAW PARTICLE SPARK SYSTEM -----------------
      const sparks = particlesRef.current;
      ctx.save();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        
        // Physics variables translation
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05 * dScale; // downward gravity pull
        p.life++;

        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4 * dScale;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        const radius = Math.max(0, p.size * (1 - p.life / p.maxLife));
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) {
          sparks.splice(i, 1);
        }
      }
      ctx.restore();

      // Request next game frame if active
      if (!isPaused) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Begin looping
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [track, audioEngine, isPaused]);

  // UI Progress Bar Calculations
  const progressRatio = Math.min(100, (elapsedSecondsRef.current / gameDuration) * 100);

  return (
    <div className="relative w-full h-full flex flex-col select-none" ref={containerRef}>
      {/* Target Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block bg-[#05050d]" />

      {/* Overlaid UI Hud */}
      <div className="absolute inset-x-0 bottom-4 flex flex-col justify-end items-center px-6 pointer-events-none gap-6 z-10">
        
        {/* Combo Multiplier Alert (Big center text) */}
        {stats.combo > 0 && (
          <div className="text-center font-bold tracking-indigo animate-bounce">
            <span className="block text-4xl sm:text-5xl font-mono text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 drop-shadow-lg drop-shadow-pink-500">
              {stats.combo}
            </span>
            <span className="block text-xs uppercase text-gray-300 font-sans tracking-widest mt-1">
              COMBO BREAKSTRIKE
            </span>
          </div>
        )}

        {/* Progress Timeline on the dancefloor */}
        <div className="w-full max-w-lg bg-gray-900/60 border border-purple-500/30 rounded-full h-3 overflow-hidden backdrop-blur-md">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-100 shadow-[0_0_10px_#ec4899]"
            style={{ width: `${progressRatio}%` }}
          />
        </div>

        {/* Tactile Strike Panels (Excellent on mobile & layout visual aid) */}
        <div className="w-full max-w-xl flex justify-between gap-8 pointer-events-auto select-none mt-2">
          
          {/* Left Pad (Tap / D-key) */}
          <button
            onMouseDown={() => { setLeftActive(true); leftActiveRef.current = true; handleStrike('left'); }}
            onMouseUp={() => { setLeftActive(false); leftActiveRef.current = false; }}
            onMouseLeave={() => { setLeftActive(false); leftActiveRef.current = false; }}
            onTouchStart={(e) => { e.preventDefault(); setLeftActive(true); leftActiveRef.current = true; handleStrike('left'); }}
            onTouchEnd={(e) => { e.preventDefault(); setLeftActive(false); leftActiveRef.current = false; }}
            className={`flex-1 flex flex-col items-center justify-center py-4 bg-gradient-to-b from-pink-950/40 to-pink-900/10 border-2 rounded-2xl cursor-pointer transition-all active:scale-[0.96] select-none ${
              leftActive 
                ? 'border-pink-400 shadow-[0_0_15px_#db2777]'
                : 'border-pink-500/20 text-pink-400 hover:border-pink-500/40'
            }`}
          >
            <span className="text-xs uppercase tracking-wider text-pink-400/70 font-sans">LEFT STRIKE</span>
            <span className="text-3xl font-mono font-bold text-pink-300">D</span>
            <span className="text-[10px] text-pink-400/50 mt-1">Keyboard [D] or Left Arrow</span>
          </button>

          {/* Right Pad (Tap / K-key) */}
          <button
            onMouseDown={() => { setRightActive(true); rightActiveRef.current = true; handleStrike('right'); }}
            onMouseUp={() => { setRightActive(false); rightActiveRef.current = false; }}
            onMouseLeave={() => { setRightActive(false); rightActiveRef.current = false; }}
            onTouchStart={(e) => { e.preventDefault(); setRightActive(true); rightActiveRef.current = true; handleStrike('right'); }}
            onTouchEnd={(e) => { e.preventDefault(); setRightActive(false); rightActiveRef.current = false; }}
            className={`flex-1 flex flex-col items-center justify-center py-4 bg-gradient-to-b from-cyan-950/40 to-cyan-900/10 border-2 rounded-2xl cursor-pointer transition-all active:scale-[0.96] select-none ${
              rightActive 
                ? 'border-cyan-400 shadow-[0_0_15px_#06b6d4]'
                : 'border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40'
            }`}
          >
            <span className="text-xs uppercase tracking-wider text-cyan-400/70 font-sans">RIGHT STRIKE</span>
            <span className="text-3xl font-mono font-bold text-cyan-300">K</span>
            <span className="text-[10px] text-cyan-400/50 mt-1">Keyboard [K] or Right Arrow</span>
          </button>

        </div>
      </div>
    </div>
  );
};
