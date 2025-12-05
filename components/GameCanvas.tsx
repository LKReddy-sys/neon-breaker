import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_SPEED, 
  PADDLE_Y_OFFSET,
  BALL_RADIUS,
  BALL_START_SPEED,
  BALL_MAX_SPEED,
  BRICK_COLUMN_COUNT,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_OFFSET_TOP,
  BRICK_OFFSET_LEFT,
  COLORS,
  COLOR_CEMENT_4,
  COLOR_CEMENT_3,
  COLOR_CEMENT_2,
  POWERUP_WIDTH,
  POWERUP_HEIGHT,
  POWERUP_SPEED,
  POWERUP_CHANCE,
  MAX_LEVELS,
  THEMES
} from '../constants';
import { Ball, Paddle, Brick, GameState, PowerUp, PowerUpType, ThemeConfig } from '../types';
import { RefreshCw, Play, Trophy, AlertTriangle, Heart, Zap, Volume2, VolumeX, Smartphone, Pause as PauseIcon } from 'lucide-react';
import { soundManager } from '../utils/audio';

// Particle system for background effects
interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  alpha: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs
  const gameStateRef = useRef<GameState>(GameState.MENU);
  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(3);
  const levelRef = useRef<number>(1);
  const superTimerRef = useRef<number>(0); // Frames remaining for super ball
  
  // Theme State
  const currentThemeRef = useRef<ThemeConfig>(THEMES[0]);
  const backgroundParticlesRef = useRef<Particle[]>([]);
  
  const paddleRef = useRef<Paddle>({
    pos: { x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2, y: CANVAS_HEIGHT - PADDLE_Y_OFFSET },
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: PADDLE_SPEED
  });
  
  const ballRef = useRef<Ball>({
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 40 },
    vel: { x: 0, y: 0 },
    radius: BALL_RADIUS,
    speed: BALL_START_SPEED,
    active: false,
    isSuper: false
  });

  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Mobile Tilt State
  const orientationPermissionRef = useRef<PermissionState | 'unknown'>('unknown');

  const [uiState, setUiState] = useState({
    score: 0,
    lives: 3,
    level: 1,
    state: GameState.MENU,
    isSuper: false,
    isMuted: false,
    themeName: THEMES[0].name,
    showTiltButton: false
  });

  // --- Background Particles Init ---
  const initParticles = (theme: ThemeConfig) => {
    const particles: Particle[] = [];
    let count = 0;
    let speed = 0;
    
    switch(theme.type) {
        case 'NEON': count = 25; speed = 0.5; break; // Added particles for Neon
        case 'TOXIC': count = 15; speed = 1; break;
        case 'VOLCANIC': count = 30; speed = 2; break;
        case 'GLACIAL': count = 40; speed = 0.5; break;
        case 'MATRIX': count = 0; break; // Handled differently (grid)
        case 'VOID': count = 100; speed = 0.2; break;
        default: count = 20; speed = 0.5;
    }

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 3 + 1,
            speedY: (Math.random() * speed) + 0.5,
            alpha: Math.random()
        });
    }
    backgroundParticlesRef.current = particles;
  };

  // --- Level Generation ---

  const generateLevel = (level: number): Brick[] => {
    const newBricks: Brick[] = [];
    const rows = Math.min(4 + Math.floor(level / 3), 14); 
    
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      for (let r = 0; r < rows; r++) {
        let shouldPlace = false;
        let hp = 1;

        const patternIndex = (level - 1);
        
        switch (patternIndex) {
          // --- Levels 1-12 (Basic to Intermediate) ---
          case 0: shouldPlace = r < 4; break; // Solid
          case 1: shouldPlace = (r + c) % 2 === 0 && r < 5; break; // Checker
          case 2: shouldPlace = r % 2 === 0; break; // Stripes
          case 3: shouldPlace = c % 2 === 0 && r < 6; break; // Columns
          case 4: shouldPlace = r >= Math.abs(c - 4); break; // Pyramid
          case 5: shouldPlace = r <= Math.abs(c - 4) && r < 5; break; // Inv Pyramid
          case 6: // Frame with center
             shouldPlace = (r === 0 || r === 5 || c === 0 || c === 8) || (r === 3 && c === 4); 
             if (r === 3 && c === 4) hp = 2;
             break;
          case 7: shouldPlace = c >= r; break; // Steps
          case 8: shouldPlace = Math.abs(c - 4) + Math.abs(r - 3) <= 3; break; // Diamond
          case 9: shouldPlace = (c < 2 || c > 6); break; // Towers
          case 10: shouldPlace = Math.random() > 0.4; break; // Scatter
          case 11: // The Wall 
             shouldPlace = true; 
             if (r < 2) hp = 2;
             break;
          
          // --- Levels 13-24 (Advanced / Hard) ---
          case 12: shouldPlace = (r + c) % 2 === 1; if (r < 2) hp = 2; break; // Checker Hard
          case 13: shouldPlace = Math.abs(c - 4) <= r; if (c === 4) hp = 3; break; // Arrow Head
          case 14: shouldPlace = r > 1 || (c > 2 && c < 6); if (r === 0 && c > 2 && c < 6) hp = 4; break; // Bunker
          case 15: shouldPlace = (c + r) % 4 === 0 || (c - r) % 4 === 0; hp = 2; break; // DNA
          case 16: shouldPlace = c === r || c === 8 - r; hp = 3; break; // X Shape
          case 17: shouldPlace = r % 2 === 1; hp = (r === 1) ? 3 : 2; break; // Stripes Hard
          case 18: shouldPlace = true; hp = (c * r) % 3 + 1; break; // Mosaic
          case 19: shouldPlace = r < 8; if (r === 0 || r === 7 || c === 0 || c === 8) hp = 4; break; // Fortress
          case 20: shouldPlace = (c % 2 === 0 && r % 2 === 0); hp = 4; break; // The Cage
          case 21: shouldPlace = Math.random() > 0.3; hp = Math.floor(Math.random() * 3) + 1; break; // Rain
          case 22: shouldPlace = (r !== 2) && (c !== 1 && c !== 7); if (r === 0) hp = 3; break; // Invaders
          case 23: shouldPlace = true; hp = 4 - Math.floor(r / 2); if (hp < 1) hp = 1; break; // The Boss
          default: shouldPlace = r < 4;
        }

        // Difficulty Modifier
        if (shouldPlace && hp === 1) {
            const rand = Math.random();
            if (level >= 5) {
                if (rand < 0.05 + ((level - 5) * 0.01)) hp = 4; 
                else if (rand < 0.15 + ((level - 5) * 0.01)) hp = 3;
                else if (rand < 0.30) hp = 2;
            } 
            else if (level >= 2) {
                if (rand < 0.15) hp = 2;
            }
        }
        
        if (shouldPlace) {
          const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
          const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
          
          let color = COLORS[(r + level) % COLORS.length];
          if (hp === 4) color = COLOR_CEMENT_4;
          else if (hp === 3) color = COLOR_CEMENT_3;
          else if (hp === 2) color = COLOR_CEMENT_2;

          newBricks.push({
            x: brickX,
            y: brickY,
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            status: 1,
            hp: hp,
            maxHp: hp,
            color: color
          });
        }
      }
    }
    return newBricks;
  };

  // --- Initialization ---

  const initLevel = (level: number) => {
    // 1. Select Theme based on level index (cycle through 6 themes)
    const themeIndex = (level - 1) % THEMES.length;
    currentThemeRef.current = THEMES[themeIndex];
    
    // 2. Init Audio for Theme
    soundManager.setTheme(currentThemeRef.current.audio);
    
    // 3. Init Particles
    initParticles(currentThemeRef.current);
    
    bricksRef.current = generateLevel(level);
    powerUpsRef.current = [];
    resetBall();
    ballRef.current.speed = Math.min(BALL_START_SPEED + (level * 0.2), 9);
    syncUi();
  };

  const resetBall = () => {
    paddleRef.current.width = PADDLE_WIDTH; 
    superTimerRef.current = 0;

    ballRef.current = {
      pos: { 
        x: paddleRef.current.pos.x + paddleRef.current.width / 2, 
        y: paddleRef.current.pos.y - BALL_RADIUS - 1 
      },
      vel: { x: 0, y: 0 },
      radius: BALL_RADIUS,
      speed: Math.min(BALL_START_SPEED + (levelRef.current * 0.2), 9),
      active: false,
      isSuper: false
    };
    gameStateRef.current = GameState.IDLE;
    powerUpsRef.current = []; 
    syncUi();
  };

  const launchBall = () => {
    gameStateRef.current = GameState.PLAYING;
    ballRef.current.active = true;
    const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2);
    ballRef.current.vel.x = Math.cos(angle) * ballRef.current.speed;
    ballRef.current.vel.y = Math.sin(angle) * ballRef.current.speed;
    syncUi();
  };

  const startGame = () => {
    soundManager.init();
    soundManager.startMusic();
    
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    initLevel(1);
    gameStateRef.current = GameState.IDLE;
    syncUi();
  };

  const togglePause = () => {
    if (gameStateRef.current === GameState.PLAYING) {
      gameStateRef.current = GameState.PAUSED;
      syncUi();
    } else if (gameStateRef.current === GameState.PAUSED) {
      gameStateRef.current = GameState.PLAYING;
      syncUi();
    }
  };

  const toggleMute = () => {
    const isMuted = soundManager.toggleMute();
    setUiState(prev => ({ ...prev, isMuted }));
  };

  const syncUi = () => {
    setUiState(prev => ({
      ...prev,
      score: scoreRef.current,
      lives: livesRef.current,
      level: levelRef.current,
      state: gameStateRef.current,
      isSuper: ballRef.current.isSuper,
      themeName: currentThemeRef.current.name
    }));
  };

  // --- Device Orientation Logic ---
  
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Gamma is the left-to-right tilt in degrees, where right is positive
    const tilt = event.gamma; 
    
    if (tilt !== null && gameStateRef.current !== GameState.MENU && gameStateRef.current !== GameState.PAUSED) {
      // Map tilt (-30 to 30 degrees usually comfortable) to paddle position
      // We'll clamp between -45 and 45 for fuller range
      const clampTilt = Math.max(-45, Math.min(45, tilt));
      
      // Normalize to 0-1 range (0 = left, 1 = right)
      // -45deg -> 0, +45deg -> 1
      const normalizedTilt = (clampTilt + 45) / 90;
      
      // Map to canvas width
      const maxPaddleX = CANVAS_WIDTH - paddleRef.current.width;
      const targetX = normalizedTilt * maxPaddleX;
      
      // Apply with some smoothing if needed, but direct mapping feels responsive
      paddleRef.current.pos.x = paddleRef.current.pos.x + (targetX - paddleRef.current.pos.x) * 0.2;
    }
  }, []);

  const requestTiltPermission = async () => {
     // @ts-ignore
     if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            // @ts-ignore
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                setUiState(prev => ({...prev, showTiltButton: false}));
            } else {
                alert("Permission denied for tilt controls.");
            }
        } catch (e) {
            console.error(e);
        }
     } else {
         // Non-iOS 13+ devices handling
         window.addEventListener('deviceorientation', handleOrientation);
         setUiState(prev => ({...prev, showTiltButton: false}));
     }
  };

  // --- Game Loop Logic ---

  const spawnPowerUp = (x: number, y: number) => {
    if (Math.random() < POWERUP_CHANCE) {
      const rand = Math.random();
      let type = PowerUpType.WIDER;
      
      if (rand < 0.20) type = PowerUpType.WIDER;
      else if (rand < 0.40) type = PowerUpType.SLOW;
      else if (rand < 0.50) type = PowerUpType.EXTRA_LIFE;
      else if (rand < 0.70) type = PowerUpType.SHRINK; 
      else type = PowerUpType.SUPER;

      powerUpsRef.current.push({
        x: x + BRICK_WIDTH / 2 - POWERUP_WIDTH / 2,
        y: y,
        width: POWERUP_WIDTH,
        height: POWERUP_HEIGHT,
        dy: POWERUP_SPEED,
        type: type,
        active: true
      });
    }
  };

  const applyPowerUp = (type: PowerUpType) => {
    const paddle = paddleRef.current;
    const ball = ballRef.current;
    soundManager.playPowerUp();
    
    switch (type) {
      case PowerUpType.WIDER:
        paddle.width = Math.min(paddle.width + 40, 250);
        break;
      case PowerUpType.SHRINK:
        paddle.width = Math.max(paddle.width - 30, 40);
        break;
      case PowerUpType.EXTRA_LIFE:
        livesRef.current += 1;
        break;
      case PowerUpType.SLOW:
        ball.speed = Math.max(ball.speed * 0.7, 4);
        const angle = Math.atan2(ball.vel.y, ball.vel.x);
        ball.vel.x = Math.cos(angle) * ball.speed;
        ball.vel.y = Math.sin(angle) * ball.speed;
        break;
      case PowerUpType.SUPER:
        ball.isSuper = true;
        superTimerRef.current = 900; 
        ball.speed = BALL_MAX_SPEED; 
        const angleS = Math.atan2(ball.vel.y, ball.vel.x);
        ball.vel.x = Math.cos(angleS) * ball.speed;
        ball.vel.y = Math.sin(angleS) * ball.speed;
        break;
    }
    syncUi();
  };

  const update = () => {
    const paddle = paddleRef.current;
    const ball = ballRef.current;
    const theme = currentThemeRef.current;

    // Background Particles
    if (theme.type !== 'MATRIX') {
        backgroundParticlesRef.current.forEach(p => {
            p.y -= p.speedY; // Rise up (Bubbles/Embers)
            if (p.y < 0) {
                p.y = CANVAS_HEIGHT;
                p.x = Math.random() * CANVAS_WIDTH;
            }
            if (theme.type === 'GLACIAL' || theme.type === 'VOID') {
                 // Blink
                 p.alpha += (Math.random() - 0.5) * 0.1;
                 if (p.alpha < 0.2) p.alpha = 0.2;
                 if (p.alpha > 0.8) p.alpha = 0.8;
            }
        });
    }

    // Super Ball Timer
    if (ball.isSuper) {
        superTimerRef.current--;
        if (superTimerRef.current <= 0) {
            ball.isSuper = false;
            ball.speed = Math.max(ball.speed * 0.8, 6); 
            setUiState(prev => ({ ...prev, isSuper: false }));
        }
    }

    // Paddle Movement
    if (keysPressed.current['ArrowLeft']) paddle.pos.x -= paddle.speed;
    if (keysPressed.current['ArrowRight']) paddle.pos.x += paddle.speed;
    if (paddle.pos.x < 0) paddle.pos.x = 0;
    if (paddle.pos.x + paddle.width > CANVAS_WIDTH) paddle.pos.x = CANVAS_WIDTH - paddle.width;

    // Ball Logic
    if (gameStateRef.current === GameState.IDLE) {
      ball.pos.x = paddle.pos.x + paddle.width / 2;
      ball.pos.y = paddle.pos.y - ball.radius - 1;
      
    } else if (gameStateRef.current === GameState.PLAYING) {
      ball.pos.x += ball.vel.x;
      ball.pos.y += ball.vel.y;

      // Wall Collisions
      if (ball.pos.x + ball.radius > CANVAS_WIDTH) {
        ball.pos.x = CANVAS_WIDTH - ball.radius;
        ball.vel.x *= -1;
        soundManager.playHitWall();
      } else if (ball.pos.x - ball.radius < 0) {
        ball.pos.x = ball.radius;
        ball.vel.x *= -1;
        soundManager.playHitWall();
      }
      
      if (ball.pos.y - ball.radius < 0) {
        ball.pos.y = ball.radius;
        ball.vel.y *= -1;
        soundManager.playHitWall();
      } else if (ball.pos.y + ball.radius > CANVAS_HEIGHT) {
        livesRef.current -= 1;
        soundManager.playGameOver(); 
        if (livesRef.current <= 0) {
          gameStateRef.current = GameState.GAME_OVER;
        } else {
          resetBall();
        }
        syncUi();
        return;
      }

      // Paddle Collision
      if (
        ball.pos.x > paddle.pos.x &&
        ball.pos.x < paddle.pos.x + paddle.width &&
        ball.pos.y + ball.radius > paddle.pos.y &&
        ball.pos.y - ball.radius < paddle.pos.y + paddle.height
      ) {
         soundManager.playHitPaddle();
         let collidePoint = ball.pos.x - (paddle.pos.x + paddle.width / 2);
         collidePoint = collidePoint / (paddle.width / 2);
         const angle = collidePoint * (Math.PI / 3);
         ball.vel.x = ball.speed * Math.sin(angle);
         ball.vel.y = -ball.speed * Math.cos(angle);
         ball.pos.y = paddle.pos.y - ball.radius - 1;
      }

      // Brick Collision
      for (let i = 0; i < bricksRef.current.length; i++) {
        const b = bricksRef.current[i];
        if (b.status === 1) {
          if (
            ball.pos.x + ball.radius > b.x &&
            ball.pos.x - ball.radius < b.x + b.width &&
            ball.pos.y + ball.radius > b.y &&
            ball.pos.y - ball.radius < b.y + b.height
          ) {
            if (ball.isSuper) {
                b.hp = 0; 
                b.status = 0;
                scoreRef.current += (10 * b.maxHp);
                spawnPowerUp(b.x, b.y);
                soundManager.playHitBrick();
            } 
            else {
                b.hp--;
                if (b.hp > 0) soundManager.playHitSteel();
                else soundManager.playHitBrick();
                
                if (b.hp === 3) b.color = COLOR_CEMENT_3;
                else if (b.hp === 2) b.color = COLOR_CEMENT_2;
                else if (b.hp === 1) b.color = COLORS[0]; 

                if (b.hp <= 0) {
                    b.status = 0;
                    scoreRef.current += (10 * b.maxHp);
                    spawnPowerUp(b.x, b.y);
                }

                const overlapX = (ball.pos.x < b.x + b.width / 2) 
                   ? (ball.pos.x + ball.radius) - b.x 
                   : (b.x + b.width) - (ball.pos.x - ball.radius);
                const overlapY = (ball.pos.y < b.y + b.height / 2)
                   ? (ball.pos.y + ball.radius) - b.y
                   : (b.y + b.height) - (ball.pos.y - ball.radius);

                if (overlapX < overlapY) ball.vel.x *= -1;
                else ball.vel.y *= -1;
            }
          }
        }
      }

      if (bricksRef.current.every(b => b.status === 0)) {
        soundManager.playLevelClear();
        if (levelRef.current >= MAX_LEVELS) {
            gameStateRef.current = GameState.VICTORY;
        } else {
            levelRef.current++;
            initLevel(levelRef.current);
        }
        syncUi();
      }
    }

    // PowerUp Logic
    for (let i = 0; i < powerUpsRef.current.length; i++) {
        const p = powerUpsRef.current[i];
        if (p.active) {
            p.y += p.dy;
            if (
                p.x < paddle.pos.x + paddle.width &&
                p.x + p.width > paddle.pos.x &&
                p.y < paddle.pos.y + paddle.height &&
                p.y + p.height > paddle.pos.y
            ) {
                p.active = false;
                applyPowerUp(p.type);
                scoreRef.current += 50;
                setUiState(prev => ({ ...prev, score: scoreRef.current }));
            }
            if (p.y > CANVAS_HEIGHT) p.active = false;
        }
    }
  };

  // --- Drawing Helpers ---

  const drawBackground = (ctx: CanvasRenderingContext2D, theme: ThemeConfig) => {
    // 1. Base Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, theme.bgGradient[0]);
    gradient.addColorStop(1, theme.bgGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Matrix Grid Special Effect
    if (theme.type === 'MATRIX') {
        ctx.strokeStyle = theme.particleColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
            ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT);
        }
        // Horizontal scanline
        const scanY = (Date.now() / 10) % CANVAS_HEIGHT;
        ctx.moveTo(0, scanY); ctx.lineTo(CANVAS_WIDTH, scanY);
        ctx.stroke();
        return;
    }

    // 3. Particles (Bubbles, Snow, Stars, Embers)
    ctx.fillStyle = theme.particleColor;
    backgroundParticlesRef.current.forEach(p => {
        ctx.beginPath();
        ctx.globalAlpha = p.alpha;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  };

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
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
    ctx.fill();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const theme = currentThemeRef.current;
    
    // Background
    drawBackground(ctx, theme);

    // Draw Paddle
    ctx.fillStyle = ballRef.current.isSuper ? '#d8b4fe' : theme.paddleColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = ballRef.current.isSuper ? '#a855f7' : theme.paddleColor;
    drawRoundedRect(ctx, paddleRef.current.pos.x, paddleRef.current.pos.y, paddleRef.current.width, paddleRef.current.height, 10);
    ctx.shadowBlur = 0;

    // Draw Ball
    ctx.beginPath();
    ctx.arc(ballRef.current.pos.x, ballRef.current.pos.y, ballRef.current.radius, 0, Math.PI * 2);
    if (ballRef.current.isSuper) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#d8b4fe'; 
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.ballGlow;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();

    // Draw Bricks
    bricksRef.current.forEach(brick => {
      if (brick.status === 1) {
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height * 0.4);
      }
    });

    // Draw PowerUps
    powerUpsRef.current.forEach(p => {
        if (p.active) {
            ctx.fillStyle = p.type === PowerUpType.SHRINK ? '#ef4444' : 
                            p.type === PowerUpType.WIDER ? '#3b82f6' : 
                            p.type === PowerUpType.EXTRA_LIFE ? '#22c55e' : 
                            p.type === PowerUpType.SUPER ? '#a855f7' : '#eab308';
            drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 6);

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();

            const iconCx = p.x + 10;
            const iconCy = p.y + p.height / 2;
            let label = "";

            switch (p.type) {
                case PowerUpType.WIDER:
                    label = "WIDE";
                    ctx.moveTo(iconCx - 3, iconCy); ctx.lineTo(iconCx + 3, iconCy);
                    ctx.moveTo(iconCx - 3, iconCy); ctx.lineTo(iconCx - 1, iconCy - 2);
                    ctx.moveTo(iconCx - 3, iconCy); ctx.lineTo(iconCx - 1, iconCy + 2);
                    ctx.moveTo(iconCx + 3, iconCy); ctx.lineTo(iconCx + 1, iconCy - 2);
                    ctx.moveTo(iconCx + 3, iconCy); ctx.lineTo(iconCx + 1, iconCy + 2);
                    ctx.stroke();
                    break;
                case PowerUpType.SHRINK:
                    label = "TINY";
                    ctx.moveTo(iconCx - 4, iconCy - 2); ctx.lineTo(iconCx - 2, iconCy); ctx.lineTo(iconCx - 4, iconCy + 2);
                    ctx.moveTo(iconCx + 4, iconCy - 2); ctx.lineTo(iconCx + 2, iconCy); ctx.lineTo(iconCx + 4, iconCy + 2);
                    ctx.stroke();
                    break;
                case PowerUpType.EXTRA_LIFE:
                    label = "LIFE";
                    ctx.moveTo(iconCx, iconCy + 2);
                    ctx.bezierCurveTo(iconCx, iconCy + 2, iconCx - 4, iconCy, iconCx - 4, iconCy - 2);
                    ctx.bezierCurveTo(iconCx - 4, iconCy - 4, iconCx, iconCy - 4, iconCx, iconCy - 2);
                    ctx.bezierCurveTo(iconCx, iconCy - 4, iconCx + 4, iconCy - 4, iconCx + 4, iconCy - 2);
                    ctx.bezierCurveTo(iconCx + 4, iconCy, iconCx, iconCy + 2, iconCx, iconCy + 2);
                    ctx.fill();
                    break;
                case PowerUpType.SLOW:
                    label = "SLOW";
                    ctx.moveTo(iconCx - 2.5, iconCy - 3); ctx.lineTo(iconCx + 2.5, iconCy - 3);
                    ctx.lineTo(iconCx - 2.5, iconCy + 3); ctx.lineTo(iconCx + 2.5, iconCy + 3);
                    ctx.lineTo(iconCx - 2.5, iconCy - 3);
                    ctx.stroke();
                    break;
                case PowerUpType.SUPER:
                    label = "SPER";
                    ctx.moveTo(iconCx + 1, iconCy - 4); ctx.lineTo(iconCx - 2, iconCy);
                    ctx.lineTo(iconCx + 1, iconCy); ctx.lineTo(iconCx - 1, iconCy + 4);
                    ctx.lineTo(iconCx + 2, iconCy); ctx.lineTo(iconCx - 1, iconCy);
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px sans-serif'; 
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, p.x + 18, p.y + p.height / 2 + 1); 
        }
    });

    // Pause Overlay
    if (gameStateRef.current === GameState.PAUSED) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        ctx.font = '16px "Inter", sans-serif';
        ctx.fillText('Press SPACE to Resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        ctx.shadowBlur = 0;
    }
  };

  const tick = useCallback(() => {
    // Only update physics if not paused
    if (gameStateRef.current === GameState.PLAYING || gameStateRef.current === GameState.IDLE) {
      update();
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  }, []);

  // Main action used by both keyboard (SPACE) and mobile tap
  const handlePrimaryAction = () => {
    if (gameStateRef.current === GameState.MENU) {
      // From main menu -> start game
      startGame();
    } else if (gameStateRef.current === GameState.IDLE) {
      // Ball is sitting on the paddle -> launch
      launchBall();
    } else if (gameStateRef.current === GameState.PLAYING) {
      // Pause game
      togglePause();
    } else if (gameStateRef.current === GameState.PAUSED) {
      // Resume game
      togglePause();
    } else if (
      gameStateRef.current === GameState.GAME_OVER ||
      gameStateRef.current === GameState.VICTORY
    ) {
      // Restart after game over / victory
      startGame();
    }
  };

  // For mobile: tap on the canvas triggers the same action as SPACE
  const handleCanvasTap = () => {
    handlePrimaryAction();
  };


  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);

    // One place for the main action (start / launch / pause / resume)
    const handlePrimaryAction = () => {
      if (gameStateRef.current === GameState.MENU) {
        startGame();
      } else if (gameStateRef.current === GameState.IDLE) {
        // ball waiting on paddle
        launchBall();
      } else if (gameStateRef.current === GameState.PLAYING) {
        // pause the game
        togglePause();
      } else if (gameStateRef.current === GameState.PAUSED) {
        // resume the game
        togglePause();
      } else if (
        gameStateRef.current === GameState.GAME_OVER ||
        gameStateRef.current === GameState.VICTORY
      ) {
        // restart from beginning
        startGame();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'Space') {
        handlePrimaryAction();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    // For mobile: tap on the canvas should do the same as SPACE
    const handleCanvasTap = () => {
      handlePrimaryAction();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Note: deviceorientation listener is added via requestTiltPermission or button
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [tick, handleOrientation]);

  return (
    <div className="relative w-full max-w-[800px] aspect-[4/3]">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block bg-black rounded-lg shadow-2xl cursor-none"
        onClick={handleCanvasTap}
        onTouchStart={handleCanvasTap}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none font-retro text-xs sm:text-sm text-white">
        <div className="flex gap-4">
           <div className="flex flex-col">
             <span className="text-gray-400">SCORE</span>
             <span>{uiState.score.toString().padStart(6, '0')}</span>
           </div>
           <div className="flex flex-col">
             <span className="text-gray-400">LEVEL</span>
             <span>{uiState.level} / {MAX_LEVELS}</span>
           </div>
           <div className="flex flex-col">
             <span className="text-gray-400">THEME</span>
             <span className="text-yellow-400">{uiState.themeName}</span>
           </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {uiState.isSuper && (
            <div className="flex items-center gap-1 text-purple-400 animate-pulse font-bold mr-4">
               <Zap size={16} fill="currentColor" />
               <span>SUPER</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
             <Heart size={16} className="text-red-500 fill-red-500" />
             <span>{uiState.lives}</span>
          </div>

          <button onClick={toggleMute} className="ml-4 p-1 hover:bg-white/10 rounded">
             {uiState.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <button onClick={togglePause} className="ml-2 p-1 hover:bg-white/10 rounded sm:hidden">
            <PauseIcon size={20} />
          </button>
        </div>
      </div>

      {/* Start Screen */}
      {uiState.state === GameState.MENU && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-blue-500/50 animate-bounce">
              <Zap className="h-12 w-12 sm:h-16 sm:w-16 text-white fill-white" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-center animate-pulse">
              NEON BREAKER
            </h1>
          </div>
          <button 
            onClick={startGame}
            className="group relative px-8 py-4 bg-white text-black font-bold text-xl rounded hover:bg-blue-50 transition-all transform hover:scale-105"
          >
            <div className="flex items-center gap-2">
               <Play className="fill-black" /> START GAME
            </div>
          </button>
          <div className="mt-8 text-gray-400 text-sm flex flex-col items-center gap-2">
            <p>Use Left/Right Arrows to Move</p>
            <p>Space to Launch / Pause</p>
          </div>
          
          {/* Mobile Tilt Button */}
          {uiState.showTiltButton !== false && (
             <button 
                onClick={requestTiltPermission}
                className="mt-6 flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-full hover:bg-white/10 transition-colors text-sm"
             >
                <Smartphone size={16} /> Enable Tilt Controls
             </button>
          )}
        </div>
      )}

      {/* Game Over Screen */}
      {uiState.state === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <AlertTriangle size={64} className="mb-4 text-red-500" />
          <h2 className="text-5xl font-retro mb-4">GAME OVER</h2>
          <p className="text-xl mb-8">Final Score: {uiState.score}</p>
          <button 
            onClick={startGame}
            className="px-6 py-3 bg-white text-red-900 font-bold rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={20} /> TRY AGAIN
          </button>
        </div>
      )}

      {/* Victory Screen */}
      {uiState.state === GameState.VICTORY && (
        <div className="absolute inset-0 bg-yellow-900/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Trophy size={64} className="mb-4 text-yellow-400" />
          <h2 className="text-5xl font-retro mb-4 text-center">VICTORY!</h2>
          <p className="text-xl mb-8">You Conquered All 24 Levels!</p>
          <p className="text-2xl font-bold mb-8 text-yellow-300">Score: {uiState.score}</p>
          <button 
            onClick={startGame}
            className="px-6 py-3 bg-white text-yellow-900 font-bold rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={20} /> PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;