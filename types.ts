
export interface Vector {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Ball {
  pos: Vector;
  vel: Vector;
  radius: number;
  speed: number;
  active: boolean;
  isSuper: boolean; // blasting power
}

export interface Paddle {
  pos: Vector;
  width: number;
  height: number;
  speed: number;
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: number; // 1 = active, 0 = broken
  hp: number;     // Hit points
  maxHp: number;  // For color determination
  color: string;
}

export enum PowerUpType {
  WIDER = 'WIDER',        // Blue: Makes paddle wider
  SHRINK = 'SHRINK',      // Red: Makes paddle smaller (bad!)
  EXTRA_LIFE = 'LIFE',    // Green: Adds a life
  SLOW = 'SLOW',          // Yellow: Slows ball down
  SUPER = 'SUPER'         // Purple: Ball blasts through bricks
}

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  type: PowerUpType;
  active: boolean;
}

export enum GameState {
  MENU = 'MENU',
  IDLE = 'IDLE', // Ball attached to paddle
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

// --- Theming ---

export type ThemeType = 'NEON' | 'TOXIC' | 'VOLCANIC' | 'GLACIAL' | 'MATRIX' | 'VOID';

export interface AudioConfig {
  musicWave: OscillatorType;
  bassWave: OscillatorType;
  tempo: number;
  scale: number[]; // Frequencies for the bassline/arpeggio
  filterFreq: number;
  sfxDetune: number; // Shift pitch for SFX
}

export interface ThemeConfig {
  type: ThemeType;
  name: string;
  bgGradient: string[]; // [Start Color, End Color]
  paddleColor: string;
  ballGlow: string;
  particleColor: string; // For background effects
  audio: AudioConfig;
}
