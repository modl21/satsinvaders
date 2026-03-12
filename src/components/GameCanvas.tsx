import { useRef, useEffect, useCallback, useState } from 'react';

import { createInitialState, updateGame } from '@/lib/gameEngine';
import { renderGame } from '@/lib/gameRenderer';
import { GAME_WIDTH, GAME_HEIGHT } from '@/lib/gameConstants';
import type { GameState } from '@/lib/gameTypes';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  isPlaying: boolean;
}

export function GameCanvas({ onGameOver, isPlaying }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const keysRef = useRef({ left: false, right: false, shoot: false });
  const frameRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const gameOverCalledRef = useRef(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const touchStartRef = useRef<{ x: number; time: number } | null>(null);
  const touchMoveRef = useRef<'left' | 'right' | null>(null);

  // Calculate scale to fit screen
  useEffect(() => {
    function handleResize() {
      const maxW = Math.min(window.innerWidth - 16, 500);
      const maxH = window.innerHeight - 200;
      const scaleW = maxW / GAME_WIDTH;
      const scaleH = maxH / GAME_HEIGHT;
      setCanvasScale(Math.min(scaleW, scaleH, 1.5));
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset game when isPlaying changes to true
  useEffect(() => {
    if (isPlaying) {
      gameStateRef.current = createInitialState();
      gameOverCalledRef.current = false;
      keysRef.current = { left: false, right: false, shoot: false };
    }
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    if (!isPlaying) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        keysRef.current.shoot = true;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp') keysRef.current.shoot = false;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  // Touch controls
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleTouchStart(e: TouchEvent) {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, time: Date.now() };
      touchMoveRef.current = null;
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const threshold = 10;

      if (dx < -threshold) {
        keysRef.current.left = true;
        keysRef.current.right = false;
        touchMoveRef.current = 'left';
      } else if (dx > threshold) {
        keysRef.current.right = true;
        keysRef.current.left = false;
        touchMoveRef.current = 'right';
      } else {
        keysRef.current.left = false;
        keysRef.current.right = false;
        touchMoveRef.current = null;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      e.preventDefault();
      keysRef.current.left = false;
      keysRef.current.right = false;

      // If it was a quick tap (not a swipe), fire a bullet
      if (touchStartRef.current) {
        const duration = Date.now() - touchStartRef.current.time;
        if (duration < 250 && !touchMoveRef.current) {
          keysRef.current.shoot = true;
          setTimeout(() => {
            keysRef.current.shoot = false;
          }, 100);
        }
      }

      touchStartRef.current = null;
      touchMoveRef.current = null;
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPlaying]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const state = gameStateRef.current;

    if (!state.gameOver) {
      gameStateRef.current = updateGame(state, keysRef.current, now);
    } else if (!gameOverCalledRef.current) {
      gameOverCalledRef.current = true;
      onGameOver(state.score);
    }

    frameRef.current++;
    renderGame(ctx, gameStateRef.current, frameRef.current);

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, onGameOver]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, gameLoop]);

  // Render idle animation when not playing
  useEffect(() => {
    if (isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let idleState = createInitialState();
    let idleAnimFrame: number;

    function animateIdle() {
      frame++;
      // Just animate stars
      idleState = {
        ...idleState,
        stars: idleState.stars.map((star) => ({
          ...star,
          y: (star.y + star.speed) % GAME_HEIGHT,
        })),
      };
      renderGame(ctx!, idleState, frame);
      idleAnimFrame = requestAnimationFrame(animateIdle);
    }

    idleAnimFrame = requestAnimationFrame(animateIdle);
    return () => cancelAnimationFrame(idleAnimFrame);
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      className="game-canvas rounded-lg border border-primary/20 shadow-[0_0_30px_rgba(34,197,94,0.15)]"
      style={{
        width: GAME_WIDTH * canvasScale,
        height: GAME_HEIGHT * canvasScale,
      }}
    />
  );
}
