export interface Position {
  x: number;
  y: number;
}

export interface Player extends Position {
  width: number;
  height: number;
}

export interface Bullet extends Position {
  width: number;
  height: number;
  active: boolean;
}

export interface Enemy extends Position {
  width: number;
  height: number;
  alive: boolean;
  type: number; // 0-3 for different visual types
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  player: Player;
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  enemies: Enemy[];
  stars: Star[];
  particles: Particle[];
  score: number;
  wave: number;
  enemyDirection: 1 | -1;
  gameOver: boolean;
  lastBulletTime: number;
  screenShake: number;
}

export type GamePhase = 'idle' | 'paying' | 'ready' | 'playing' | 'gameOver';

export interface LeaderboardEntry {
  lightning: string;
  score: number;
  timestamp: number;
  eventId: string;
}

export interface WeeklyWinner {
  lightning: string;
  score: number;
  weekStart: number;
  weekEnd: number;
}
