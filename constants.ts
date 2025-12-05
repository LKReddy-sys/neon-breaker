
import { ThemeConfig, ThemeType } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PADDLE_WIDTH = 100;
export const PADDLE_HEIGHT = 16;
export const PADDLE_SPEED = 8;
export const PADDLE_Y_OFFSET = 30; // Distance from bottom

export const BALL_RADIUS = 8;
export const BALL_START_SPEED = 5;
export const BALL_MAX_SPEED = 10; // Reduced from 14 for better control

export const MAX_LEVELS = 24;

export const POWERUP_WIDTH = 40;
export const POWERUP_HEIGHT = 16;
export const POWERUP_SPEED = 3;
export const POWERUP_CHANCE = 0.15; // 15% chance to drop

export const BRICK_ROW_COUNT = 6;
export const BRICK_COLUMN_COUNT = 9;
export const BRICK_PADDING = 10;
export const BRICK_OFFSET_TOP = 60;
export const BRICK_OFFSET_LEFT = 35;
export const BRICK_HEIGHT = 24;

// Calculated Brick Width
export const BRICK_WIDTH = (CANVAS_WIDTH - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;

// Standard Row Colors
export const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
];

// Special Brick Colors (Cement Style)
export const COLOR_CEMENT_4 = '#4b5563'; // gray-600 (Dark Cement) - 4 Hits
export const COLOR_CEMENT_3 = '#6b7280'; // gray-500 (Med Cement) - 3 Hits
export const COLOR_CEMENT_2 = '#9ca3af'; // gray-400 (Light Cement) - 2 Hits

// --- Themes ---

// Musical Scales (Freqs in Hz approx for Bass)
const SCALE_MINOR = [110, 110, 130.8, 130.8, 98, 98, 110, 110]; // A Minorish
const SCALE_PHRYGIAN = [82.4, 87.3, 110, 87.3, 82.4, 73.4, 82.4, 82.4]; // E Phrygian (Toxic/Dark)
const SCALE_AGGRESSIVE = [73.4, 73.4, 73.4, 110, 65.4, 65.4, 98, 73.4]; // Drop D-ish
const SCALE_MAJOR_ARP = [130.8, 164.8, 196, 261.6, 196, 164.8, 130.8, 130.8]; // C Major Arp
const SCALE_PENTATONIC = [110, 130.8, 146.8, 164.8, 146.8, 130.8, 110, 98]; // Digital feel
const SCALE_VOID = [65.4, 65.4, 77.7, 77.7, 55, 55, 65.4, 65.4]; // Deep drone

export const THEMES: ThemeConfig[] = [
  {
    type: 'NEON',
    name: 'Neon City',
    bgGradient: ['#111827', '#1e1b4b'], // Dark Gray to Dark Blue
    paddleColor: '#3b82f6', // Blue
    ballGlow: '#60a5fa',
    particleColor: 'rgba(59, 130, 246, 0.2)',
    audio: {
      musicWave: 'triangle',
      bassWave: 'triangle',
      tempo: 120,
      scale: SCALE_MINOR,
      filterFreq: 800,
      sfxDetune: 0
    }
  },
  {
    type: 'TOXIC',
    name: 'Toxic Sewer',
    bgGradient: ['#022c22', '#052e16'], // Dark Green
    paddleColor: '#22c55e', // Green
    ballGlow: '#4ade80',
    particleColor: 'rgba(34, 197, 94, 0.2)', // Bubbles
    audio: {
      musicWave: 'sawtooth',
      bassWave: 'sawtooth',
      tempo: 105,
      scale: SCALE_PHRYGIAN,
      filterFreq: 400, // Muffled
      sfxDetune: -200
    }
  },
  {
    type: 'VOLCANIC',
    name: 'Magma Core',
    bgGradient: ['#450a0a', '#7f1d1d'], // Dark Red
    paddleColor: '#ef4444', // Red
    ballGlow: '#f87171',
    particleColor: 'rgba(239, 68, 68, 0.3)', // Sparks
    audio: {
      musicWave: 'square',
      bassWave: 'square',
      tempo: 140,
      scale: SCALE_AGGRESSIVE,
      filterFreq: 2000, // Sharp
      sfxDetune: -100
    }
  },
  {
    type: 'GLACIAL',
    name: 'Ice Cavern',
    bgGradient: ['#083344', '#164e63'], // Cyan/Dark Blue
    paddleColor: '#06b6d4', // Cyan
    ballGlow: '#67e8f9',
    particleColor: 'rgba(103, 232, 249, 0.3)', // Snow
    audio: {
      musicWave: 'sine',
      bassWave: 'triangle',
      tempo: 95,
      scale: SCALE_MAJOR_ARP,
      filterFreq: 1200,
      sfxDetune: 300 // Tinkly
    }
  },
  {
    type: 'MATRIX',
    name: 'Mainframe',
    bgGradient: ['#000000', '#020617'], // Almost black
    paddleColor: '#10b981', // Emerald
    ballGlow: '#34d399',
    particleColor: 'rgba(16, 185, 129, 0.2)', // Code rain
    audio: {
      musicWave: 'square',
      bassWave: 'sawtooth',
      tempo: 128,
      scale: SCALE_PENTATONIC,
      filterFreq: 1500, // Digital
      sfxDetune: 100
    }
  },
  {
    type: 'VOID',
    name: 'Cosmic Void',
    bgGradient: ['#0f0720', '#2e1065'], // Deep Purple
    paddleColor: '#a855f7', // Purple
    ballGlow: '#c084fc',
    particleColor: 'rgba(255, 255, 255, 0.5)', // Stars
    audio: {
      musicWave: 'sine',
      bassWave: 'sine',
      tempo: 80,
      scale: SCALE_VOID,
      filterFreq: 300, // Deep
      sfxDetune: -400
    }
  }
];