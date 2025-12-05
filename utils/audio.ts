
import { AudioConfig } from '../types';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicTimerID: number | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;

  // Music State
  private currentConfig: AudioConfig | null = null;
  private nextNoteTime: number = 0;
  private currentNoteIndex = 0;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s

  constructor() {}

  private getCtx(): AudioContext {
    if (!this.ctx) {
      // @ts-ignore
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Default volume
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public init() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  public setTheme(config: AudioConfig) {
    this.currentConfig = config;
    // If music is playing, the next scheduled note will pick up the new scale/tempo
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 0.3, 
        this.getCtx().currentTime, 
        0.1
      );
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- Sound Effects ---

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, detune: number = 0) {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    osc.detune.value = detune; // Detune for theme effect
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  }

  public playHitPaddle() {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const detune = this.currentConfig?.sfxDetune || 0;
    const type = this.currentConfig?.musicWave || 'triangle';

    osc.type = type;
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.1);
    osc.detune.value = detune;
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  public playHitWall() {
    const detune = this.currentConfig?.sfxDetune || 0;
    this.playTone(150, 'sine', 0.05, 0, detune);
  }

  public playHitBrick() {
    const detune = this.currentConfig?.sfxDetune || 0;
    const type = this.currentConfig?.musicWave === 'square' ? 'square' : 'square'; // Keep brick hit punchy
    // Crunchier square wave
    this.playTone(400 + Math.random() * 100, type, 0.08, 0, detune);
  }

  public playHitSteel() {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    osc.detune.value = -200 + (Math.random() * 100);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  public playPowerUp() {
    if (this.isMuted) return;
    const detune = this.currentConfig?.sfxDetune || 0;
    // Arpeggio
    this.playTone(523.25, 'sine', 0.1, 0, detune);      // C5
    this.playTone(659.25, 'sine', 0.1, 0.1, detune);    // E5
    this.playTone(783.99, 'sine', 0.2, 0.2, detune);    // G5
    this.playTone(1046.50, 'sine', 0.4, 0.3, detune);   // C6
  }

  public playLevelClear() {
    if (this.isMuted) return;
    // Victory fanfare snippet
    [0, 0.15, 0.3, 0.6].forEach((t, i) => {
        this.playTone(440 * (1 + i * 0.25), 'square', 0.3, t, 0);
    });
  }

  public playGameOver() {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
    this.stopMusic();
  }

  // --- Background Music Scheduler ---

  private nextNote() {
    if (!this.currentConfig) return;
    const secondsPerBeat = 60.0 / this.currentConfig.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentNoteIndex++;
    
    // Safety wrap around based on scale length provided
    if (this.currentNoteIndex >= this.currentConfig.scale.length) {
      this.currentNoteIndex = 0;
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (this.isMuted || !this.currentConfig) return;
    
    // Play on 8th notes (every other 16th)
    if (beatNumber % 2 === 0) {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Wrap index just in case
        const noteIndex = Math.floor(beatNumber / 2) % this.currentConfig.scale.length;
        const freq = this.currentConfig.scale[noteIndex];

        osc.type = this.currentConfig.bassWave;
        osc.frequency.value = freq;
        
        // Low pass filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = this.currentConfig.filterFreq;

        // Envelope
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time);
        osc.stop(time + 0.25);
    }
  }

  private scheduler() {
    while (this.nextNoteTime < this.getCtx().currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentNoteIndex, this.nextNoteTime);
      this.nextNote();
    }
    
    if (this.isMusicPlaying) {
        this.musicTimerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  public startMusic() {
    if (this.isMusicPlaying) return;
    
    const ctx = this.getCtx();
    this.init();
    
    this.isMusicPlaying = true;
    this.currentNoteIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.scheduler();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimerID) {
        window.clearTimeout(this.musicTimerID);
        this.musicTimerID = null;
    }
  }
}

export const soundManager = new SoundManager();
