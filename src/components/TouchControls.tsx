import { useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  keysRef: React.MutableRefObject<{ left: boolean; right: boolean; shoot: boolean }>;
}

export function TouchControls({ keysRef }: TouchControlsProps) {
  const shootTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLeft = useCallback(() => {
    keysRef.current.left = true;
    keysRef.current.right = false;
  }, [keysRef]);

  const stopLeft = useCallback(() => {
    keysRef.current.left = false;
  }, [keysRef]);

  const startRight = useCallback(() => {
    keysRef.current.right = true;
    keysRef.current.left = false;
  }, [keysRef]);

  const stopRight = useCallback(() => {
    keysRef.current.right = false;
  }, [keysRef]);

  const startShoot = useCallback(() => {
    keysRef.current.shoot = true;
    shootTimerRef.current = setInterval(() => {
      keysRef.current.shoot = true;
      setTimeout(() => { keysRef.current.shoot = false; }, 50);
    }, 200);
  }, [keysRef]);

  const stopShoot = useCallback(() => {
    keysRef.current.shoot = false;
    if (shootTimerRef.current) {
      clearInterval(shootTimerRef.current);
      shootTimerRef.current = null;
    }
  }, [keysRef]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-5 pb-6 pt-3 select-none bg-gradient-to-t from-black/80 to-transparent"
      style={{ touchAction: 'none' }}
    >
      {/* Left side: directional buttons */}
      <div className="flex items-center gap-4">
        <button
          onTouchStart={(e) => { e.preventDefault(); startLeft(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopLeft(); }}
          onTouchCancel={stopLeft}
          className="size-[72px] rounded-2xl bg-white/10 border border-white/20 active:bg-primary/30 active:border-primary/50 flex items-center justify-center"
          aria-label="Move left"
        >
          <ChevronLeft className="size-10 text-white/70" />
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); startRight(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopRight(); }}
          onTouchCancel={stopRight}
          className="size-[72px] rounded-2xl bg-white/10 border border-white/20 active:bg-primary/30 active:border-primary/50 flex items-center justify-center"
          aria-label="Move right"
        >
          <ChevronRight className="size-10 text-white/70" />
        </button>
      </div>

      {/* Right side: fire button */}
      <button
        onTouchStart={(e) => { e.preventDefault(); startShoot(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopShoot(); }}
        onTouchCancel={stopShoot}
        className="size-[88px] rounded-full bg-destructive/20 border-2 border-destructive/40 active:bg-destructive/40 active:border-destructive/70 flex items-center justify-center"
        aria-label="Fire"
      >
        <Crosshair className="size-11 text-destructive" />
      </button>
    </div>
  );
}
