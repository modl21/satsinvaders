import { Crown, Zap } from 'lucide-react';

import { usePreviousWeekWinner } from '@/hooks/useLeaderboard';

export function WeeklyWinnerBanner() {
  const { data: winner } = usePreviousWeekWinner();

  if (!winner) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 px-4 py-3">
        {/* Animated shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent animate-pulse-glow pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-accent/20">
            <Crown className="size-4 text-accent" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-pixel text-[8px] text-accent/80 tracking-wider">
              LAST WEEK&apos;S CHAMPION
            </p>
            <p className="text-sm text-foreground truncate mt-0.5">
              {winner.lightning}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Zap className="size-3.5 text-accent fill-accent" />
            <span className="font-pixel text-[10px] text-accent tabular-nums">
              {winner.score.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
