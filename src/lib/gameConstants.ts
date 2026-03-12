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
export const ENEMY_ROWS = 4;
export const ENEMY_COLS = 8;
export const ENEMY_H_SPACING = 44;
export const ENEMY_V_SPACING = 38;
export const ENEMY_START_Y = 40;
export const ENEMY_SPEED_BASE = 0.6;
export const ENEMY_SPEED_INCREMENT = 0.1; // per wave
export const ENEMY_DROP_AMOUNT = 20;
export const ENEMY_BULLET_SPEED = 4;
export const ENEMY_SHOOT_CHANCE = 0.003; // per enemy per frame

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
export const COLOR_ENEMY_BULLET = '#ef4444';
export const COLOR_STARS = '#ffffff';
export const COLOR_BG = '#0a0a0f';

// Payment
export const PAYMENT_AMOUNT_SATS = 100;
export const PAYMENT_RECIPIENT = 'odell@cake.cash';

// Nostr
export const GAME_SCORE_KIND = 1447;
export const GAME_TAG = 'sats-invaders';
