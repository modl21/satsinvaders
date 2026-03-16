import type { GameState } from './gameTypes';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COLOR_PLAYER,
  COLOR_BULLET,
  COLOR_ENEMY_1,
  COLOR_ENEMY_2,
  COLOR_ENEMY_3,
  COLOR_ENEMY_4,
  COLOR_ENEMY_5,
  COLOR_ENEMY_BULLET,
  COLOR_BG,
} from './gameConstants';

const ENEMY_COLORS = [COLOR_ENEMY_1, COLOR_ENEMY_2, COLOR_ENEMY_3, COLOR_ENEMY_4, COLOR_ENEMY_5];

function drawPixelShip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  // Main body
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w * 0.75, y + h * 0.8);
  ctx.lineTo(x + w * 0.5, y + h);
  ctx.lineTo(x + w * 0.25, y + h * 0.8);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.fillRect(cx - 2, y + 4, 4, h * 0.3);
  ctx.shadowBlur = 0;

  // Cockpit
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx - 2, y + h * 0.35, 4, 4);
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: number, frame: number) {
  const color = ENEMY_COLORS[type] || COLOR_ENEMY_1;
  ctx.fillStyle = color;
  
  const pulse = Math.sin(frame * 0.05 + type) * 2;
  
  switch (type) {
    case 0: // Octopus-like
      ctx.fillRect(x + 4, y + 2, w - 8, h - 8);
      ctx.fillRect(x + 2, y + 4, w - 4, h - 10);
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 8, y + 6, 4, 4);
      ctx.fillRect(x + w - 12, y + 6, 4, 4);
      // Tentacles
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, y + h - 8 + pulse, 4, 6);
      ctx.fillRect(x + w - 6, y + h - 8 - pulse, 4, 6);
      ctx.fillRect(x + w / 2 - 2, y + h - 6, 4, 4);
      break;
    case 1: // Crab-like
      ctx.fillRect(x + 6, y + 2, w - 12, h - 6);
      ctx.fillRect(x + 2, y + 6, w - 4, h - 12);
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 8, y + 8, 3, 3);
      ctx.fillRect(x + w - 11, y + 8, 3, 3);
      // Claws
      ctx.fillStyle = color;
      ctx.fillRect(x - 2 + pulse, y + 8, 4, 6);
      ctx.fillRect(x + w - 2 - pulse, y + 8, 4, 6);
      break;
    case 2: // Skull-like
      ctx.fillRect(x + 4, y, w - 8, h - 4);
      ctx.fillRect(x + 2, y + 4, w - 4, h - 10);
      // Eyes (larger)
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 6, y + 6, 6, 6);
      ctx.fillRect(x + w - 12, y + 6, 6, 6);
      // Mouth
      ctx.fillRect(x + 10, y + h - 8, w - 20, 3);
      break;
    case 3: // Diamond-like
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      ctx.fill();
      // Core
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + w / 2 - 3, y + h / 2 - 3, 6, 6);
      ctx.globalAlpha = 1;
      break;
  }

  // Glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  const shake = state.screenShake || 0;
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Background
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(-10, -10, GAME_WIDTH + 20, GAME_HEIGHT + 20);

  // Stars
  for (const star of state.stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Enemies
  for (const enemy of state.enemies) {
    if (enemy.alive) {
      drawEnemy(ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.type, frame);
    }
  }

  // Player (if not game over)
  if (!state.gameOver) {
    drawPixelShip(ctx, state.player.x, state.player.y, state.player.width, state.player.height, COLOR_PLAYER);

    // Engine glow
    const engineFlicker = Math.random() * 4;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.fillRect(
      state.player.x + state.player.width / 2 - 3,
      state.player.y + state.player.height - 2,
      6,
      4 + engineFlicker,
    );
    ctx.shadowBlur = 0;
  }

  // Player bullets
  for (const bullet of state.playerBullets) {
    ctx.fillStyle = COLOR_BULLET;
    ctx.shadowColor = COLOR_BULLET;
    ctx.shadowBlur = 6;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    // Trail
    ctx.globalAlpha = 0.3;
    ctx.fillRect(bullet.x, bullet.y + bullet.height, bullet.width, 6);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Enemy bullets
  for (const bullet of state.enemyBullets) {
    ctx.fillStyle = COLOR_ENEMY_BULLET;
    ctx.shadowColor = COLOR_ENEMY_BULLET;
    ctx.shadowBlur = 6;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // HUD - Score (always visible during game)
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${state.score}`, 10, 22);

  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${state.wave + 1}`, GAME_WIDTH - 10, 22);
}
