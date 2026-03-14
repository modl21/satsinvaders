import { Trophy, Clock, Zap, ExternalLink } from 'lucide-react';

import { useCurrentWeekLeaderboard } from '@/hooks/useLeaderboard';
import { useNip05 } from '@/hooks/useNip05';
import { getTimeUntilReset } from '@/lib/weekUtils';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeaderboardEntry } from '@/lib/gameTypes';

export function Leaderboard() {
  const { data: entries, isLoading } = useCurrentWeekLeaderboard();

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="border border-primary/20 rounded-lg bg-secondary/20 backdrop-blur overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-accent" />
            <h2 className="font-pixel text-[10px] text-primary tracking-wider">TOP 10</h2>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3" />
            <span className="text-[10px] font-pixel tracking-wider">
              {getTimeUntilReset()}
            </span>
          </div>
        </div>

        {/* Entries */}
        <div className="divide-y divide-primary/5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <Skeleton className="w-5 h-4" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
            ))
          ) : entries && entries.length > 0 ? (
            entries.map((entry, i) => (
              <LeaderboardRow key={entry.eventId} entry={entry} rank={i} />
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-xs font-pixel">NO SCORES YET</p>
              <p className="text-muted-foreground/60 text-[10px] mt-1">Be the first to play!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const { data: nip05 } = useNip05(entry.lightning);

  const rankColor =
    rank === 0 ? 'text-accent' :
    rank === 1 ? 'text-gray-300' :
    rank === 2 ? 'text-orange-400' :
    'text-muted-foreground';

  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${rank === 0 ? 'bg-accent/5' : 'hover:bg-secondary/30'}`}>
      <span className={`font-pixel text-[10px] w-5 text-center shrink-0 ${rankColor}`}>
        {rank + 1}
      </span>

      <div className="flex-1 min-w-0">
        {nip05 ? (
          <a
            href={`https://primal.net/p/${nip05.npub}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 group min-w-0"
          >
            <span className="text-sm text-primary truncate group-hover:underline underline-offset-2">
              {entry.lightning}
            </span>
            <ExternalLink className="size-3 text-primary/50 shrink-0 group-hover:text-primary transition-colors" />
          </a>
        ) : (
          <span className="text-sm text-foreground truncate block">
            {entry.lightning}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Zap className="size-3 text-accent" />
        <span className="font-pixel text-[10px] text-accent tabular-nums">
          {entry.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
