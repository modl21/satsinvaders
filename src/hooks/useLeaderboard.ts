import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { GAME_SCORE_KIND, GAME_TAG } from '@/lib/gameConstants';
import { getCurrentWeekStart, getCurrentWeekEnd, getPreviousWeekStart, getPreviousWeekEnd } from '@/lib/weekUtils';
import type { LeaderboardEntry, WeeklyWinner } from '@/lib/gameTypes';

function eventToEntry(event: NostrEvent): LeaderboardEntry | null {
  const scoreTag = event.tags.find(([name]) => name === 'score')?.[1];
  const lightningTag = event.tags.find(([name]) => name === 'lightning')?.[1];
  const gameTag = event.tags.find(([name, value]) => name === 't' && value === GAME_TAG);

  if (!scoreTag || !lightningTag || !gameTag) return null;

  const score = parseInt(scoreTag, 10);
  if (isNaN(score) || score < 0) return null;

  return {
    lightning: lightningTag,
    score,
    timestamp: event.created_at,
    eventId: event.id,
  };
}

export function useCurrentWeekLeaderboard() {
  const { nostr } = useNostr();
  const weekStart = getCurrentWeekStart();
  const weekEnd = getCurrentWeekEnd();

  return useQuery({
    queryKey: ['leaderboard', 'current', weekStart],
    queryFn: async () => {
      const events = await nostr.query([{
        kinds: [GAME_SCORE_KIND],
        '#t': [GAME_TAG],
        since: weekStart,
        until: weekEnd,
        limit: 200,
      }]);

      const entries = events
        .map(eventToEntry)
        .filter((e): e is LeaderboardEntry => e !== null)
        .sort((a, b) => b.score - a.score);

      // Top 10 unique lightning addresses (highest score per player)
      const seen = new Set<string>();
      const top10: LeaderboardEntry[] = [];
      for (const entry of entries) {
        if (!seen.has(entry.lightning)) {
          seen.add(entry.lightning);
          top10.push(entry);
          if (top10.length >= 10) break;
        }
      }

      return top10;
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

export function usePreviousWeekWinner() {
  const { nostr } = useNostr();
  const prevStart = getPreviousWeekStart();
  const prevEnd = getPreviousWeekEnd();

  return useQuery({
    queryKey: ['leaderboard', 'winner', prevStart],
    queryFn: async () => {
      const events = await nostr.query([{
        kinds: [GAME_SCORE_KIND],
        '#t': [GAME_TAG],
        since: prevStart,
        until: prevEnd,
        limit: 200,
      }]);

      const entries = events
        .map(eventToEntry)
        .filter((e): e is LeaderboardEntry => e !== null)
        .sort((a, b) => b.score - a.score);

      if (entries.length === 0) return null;

      // Deduplicate by lightning address, take highest score
      const seen = new Set<string>();
      for (const entry of entries) {
        if (!seen.has(entry.lightning)) {
          const winner: WeeklyWinner = {
            lightning: entry.lightning,
            score: entry.score,
            weekStart: prevStart,
            weekEnd: prevEnd,
          };
          return winner;
        }
        seen.add(entry.lightning);
      }

      return null;
    },
    staleTime: 60000 * 5, // 5 minutes
  });
}
