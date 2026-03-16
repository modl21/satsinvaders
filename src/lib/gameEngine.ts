import type { GameState, Enemy, Star, Particle, Bullet } from './gameTypes';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_Y_OFFSET,
  PLAYER_SPEED,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  BULLET_COOLDOWN,
  ENEMY_WIDTH,
  ENEMY_HEIGHT,
  ENEMY_COLS,
  ENEMY_H_SPACING,
  ENEMY_V_SPACING,
  ENEMY_START_Y,
  ENEMY_DROP_AMOUNT,
  ENEMY_BULLET_SPEED,
  WAVE_0_ROWS,
  MAX_ROWS,
  SPEED_BASE,
  SPEED_WAVE_SCALE,
  SPEED_KILL_SCALE,
  SHOOT_BASE,
  SHOOT_WAVE_SCALE,
  SHOOT_KILL_SCALE,
  SCORE_PER_ENEMY,
  SCORE_PER_WAVE_BONUS,
} from './gameConstants';

/** How many rows of enemies for a given wave number */
function getRowsForWave(wave: number): number {
  // Wave 0: 2 rows, wave 1: 2, wave 2: 3, wave 3: 3, wave 4: 4, wave 5: 4, wave 6+: 5
  return Math.min(WAVE_0_ROWS + Math.floor(wave / 2), MAX_ROWS);
}

export function createInitialState(): GameState {
  return {
    player: {
      x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: GAME_HEIGHT - PLAYER_Y_OFFSET,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    },
    playerBullets: [],
    enemyBullets: [],
    enemies: createEnemyWave(0),
    stars: createStarfield(),
    particles: [],
    score: 0,
    wave: 0,
    enemyDirection: 1,
    gameOver: false,
    lastBulletTime: 0,
    screenShake: 0,
  };
}

function createStarfield(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.1,
      brightness: Math.random() * 0.5 + 0.3,
    });
  }
  return stars;
}

function createEnemyWave(wave: number): Enemy[] {
  const rows = getRowsForWave(wave);
  const enemies: Enemy[] = [];
  const offsetX = (GAME_WIDTH - ENEMY_COLS * ENEMY_H_SPACING) / 2 + (ENEMY_H_SPACING - ENEMY_WIDTH) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push({
        x: offsetX + col * ENEMY_H_SPACING,
        y: ENEMY_START_Y + row * ENEMY_V_SPACING,
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        alive: true,
        type: row % 5,
      });
    }
  }
  return enemies;
}

function createExplosion(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = [];
  const count = 8 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color,
      size: Math.random() * 3 + 1,
    });
  }
  return particles;
}

function rectCollision(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function updateGame(
  state: GameState,
  keys: { left: boolean; right: boolean; shoot: boolean },
  now: number,
): GameState {
  if (state.gameOver) return state;

  const newState = { ...state };

  // --- Difficulty scaling ---
  const totalEnemies = state.enemies.length;
  const aliveEnemies = state.enemies.filter((e) => e.alive);
  const aliveCount = aliveEnemies.length;
  // killRatio goes from 0 (all alive) to ~1 (almost all dead)
  const killRatio = totalEnemies > 0 ? 1 - aliveCount / totalEnemies : 0;

  // Enemy movement speed: base + wave bonus, scaled up as enemies die
  const waveSpeed = SPEED_BASE + state.wave * SPEED_WAVE_SCALE;
  const speedMultiplier = 1 + killRatio * (SPEED_KILL_SCALE - 1);
  const speed = waveSpeed * speedMultiplier;

  // Enemy shoot chance: base + wave bonus, scaled up as enemies die
  const waveShoot = SHOOT_BASE + state.wave * SHOOT_WAVE_SCALE;
  const shootMultiplier = 1 + killRatio * (SHOOT_KILL_SCALE - 1);
  const shootChance = waveShoot * shootMultiplier;

  // Update stars (parallax background)
  newState.stars = state.stars.map((star) => ({
    ...star,
    y: (star.y + star.speed) % GAME_HEIGHT,
  }));

  // Move player
  const player = { ...state.player };
  if (keys.left) player.x -= PLAYER_SPEED;
  if (keys.right) player.x += PLAYER_SPEED;
  player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x));
  newState.player = player;

  // Shoot
  if (keys.shoot && now - state.lastBulletTime > BULLET_COOLDOWN) {
    newState.playerBullets = [
      ...state.playerBullets,
      {
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y - BULLET_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        active: true,
      },
    ];
    newState.lastBulletTime = now;
  }

  // Move player bullets
  newState.playerBullets = newState.playerBullets
    .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
    .filter((b) => b.y > -BULLET_HEIGHT);

  // Move enemy bullets
  newState.enemyBullets = state.enemyBullets
    .map((b) => ({ ...b, y: b.y + ENEMY_BULLET_SPEED }))
    .filter((b) => b.y < GAME_HEIGHT);

  // Move enemies
  let shouldDrop = false;
  let newDirection = state.enemyDirection;

  for (const enemy of aliveEnemies) {
    const nextX = enemy.x + speed * state.enemyDirection;
    if (nextX <= 0 || nextX + enemy.width >= GAME_WIDTH) {
      shouldDrop = true;
      newDirection = (state.enemyDirection * -1) as 1 | -1;
      break;
    }
  }

  newState.enemies = state.enemies.map((e) => {
    if (!e.alive) return e;
    return {
      ...e,
      x: e.x + speed * state.enemyDirection,
      y: shouldDrop ? e.y + ENEMY_DROP_AMOUNT : e.y,
    };
  });
  newState.enemyDirection = newDirection;

  // Enemy shooting — uses dynamic shoot chance
  const newEnemyBullets = [...newState.enemyBullets];
  for (const enemy of newState.enemies) {
    if (enemy.alive && Math.random() < shootChance) {
      newEnemyBullets.push({
        x: enemy.x + enemy.width / 2 - BULLET_WIDTH / 2,
        y: enemy.y + enemy.height,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        active: true,
      });
    }
  }
  newState.enemyBullets = newEnemyBullets;

  // Update particles
  newState.particles = state.particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 0.03,
      vy: p.vy + 0.02,
    }))
    .filter((p) => p.life > 0);

  // Reduce screen shake
  newState.screenShake = Math.max(0, (state.screenShake || 0) - 0.5);

  // Collision: player bullets vs enemies
  const survivingBullets: Bullet[] = [];
  let newParticles = [...newState.particles];
  let scoreGain = 0;

  for (const bullet of newState.playerBullets) {
    let hit = false;
    for (let i = 0; i < newState.enemies.length; i++) {
      const enemy = newState.enemies[i];
      if (
        enemy.alive &&
        rectCollision(
          bullet.x, bullet.y, bullet.width, bullet.height,
          enemy.x, enemy.y, enemy.width, enemy.height,
        )
      ) {
        newState.enemies = newState.enemies.map((e, idx) =>
          idx === i ? { ...e, alive: false } : e,
        );
        hit = true;
        scoreGain += SCORE_PER_ENEMY;

        const colors = ['#ef4444', '#f97316', '#fbbf24', '#a855f7', '#ec4899'];
        newParticles = [
          ...newParticles,
          ...createExplosion(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            colors[enemy.type] || '#ef4444',
          ),
        ];
        newState.screenShake = 3;
        break;
      }
    }
    if (!hit) survivingBullets.push(bullet);
  }
  newState.playerBullets = survivingBullets;
  newState.particles = newParticles;
  newState.score = state.score + scoreGain;

  // Collision: enemy bullets vs player
  for (const bullet of newState.enemyBullets) {
    if (
      rectCollision(
        bullet.x, bullet.y, bullet.width, bullet.height,
        player.x, player.y, player.width, player.height,
      )
    ) {
      newState.gameOver = true;
      newState.particles = [
        ...newState.particles,
        ...createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#22c55e'),
        ...createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24'),
      ];
      newState.screenShake = 8;
      return newState;
    }
  }

  // Collision: enemies reaching player level
  for (const enemy of newState.enemies) {
    if (enemy.alive && enemy.y + enemy.height >= player.y) {
      newState.gameOver = true;
      newState.particles = [
        ...newState.particles,
        ...createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#22c55e'),
      ];
      newState.screenShake = 8;
      return newState;
    }
  }

  // Check if all enemies dead -> new wave
  const remainingAlive = newState.enemies.filter((e) => e.alive);
  if (remainingAlive.length === 0) {
    const newWave = state.wave + 1;
    newState.wave = newWave;
    newState.enemies = createEnemyWave(newWave);
    newState.enemyDirection = 1;
    newState.enemyBullets = [];
    newState.score += SCORE_PER_WAVE_BONUS;
  }

  return newState;
}
