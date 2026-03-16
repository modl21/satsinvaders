// Game constants
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;

// Player
export const PLAYER_WIDTH = 36;
export const PLAYER_HEIGHT = 28;
export const PLAYER_SPEED = 5;
export const PLAYER_Y_OFFSET = 50; // from bottom

// Bullets
export const BULLET_WIDTH = 3;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 8;
export const BULLET_COOLDOWN = 250; // ms between shots

// Enemies
export const ENEMY_WIDTH = 30;
export const ENEMY_HEIGHT = 24;
export const ENEMY_COLS = 8;
export const ENEMY_H_SPACING = 44;
export const ENEMY_V_SPACING = 38;
export const ENEMY_START_Y = 40;
export const ENEMY_DROP_AMOUNT = 16;
export const ENEMY_BULLET_SPEED = 3.5;

// Difficulty curve
export const WAVE_0_ROWS = 2;         // start with just 2 rows
export const MAX_ROWS = 5;            // grow to 5 rows by wave 6+
export const SPEED_BASE = 0.25;       // very slow at start
export const SPEED_WAVE_SCALE = 0.06; // small bump per wave
export const SPEED_KILL_SCALE = 1.8;  // speed multiplier when few enemies left
export const SHOOT_BASE = 0.0005;     // very rare shooting at start
export const SHOOT_WAVE_SCALE = 0.0003; // more shooting per wave
export const SHOOT_KILL_SCALE = 1.5;  // shoot more when fewer enemies remain

// Scoring
export const SCORE_PER_ENEMY = 10;
export const SCORE_PER_WAVE_BONUS = 50;

// Colors
export const COLOR_PLAYER = '#22c55e';
export const COLOR_BULLET = '#fbbf24';
export const COLOR_ENEMY_1 = '#ef4444';
export const COLOR_ENEMY_2 = '#f97316';
export const COLOR_ENEMY_3 = '#a855f7';
export const COLOR_ENEMY_4 = '#06b6d4';
export const COLOR_ENEMY_5 = '#ec4899';
export const COLOR_ENEMY_BULLET = '#ef4444';
export const COLOR_STARS = '#ffffff';
export const COLOR_BG = '#0a0a0f';

// Payment
export const PAYMENT_AMOUNT_SATS = 100;
export const PAYMENT_RECIPIENT = 'claw@primal.net';

// Nostr
export const GAME_SCORE_KIND = 1447;
export const GAME_TAG = 'sats-invaders';
