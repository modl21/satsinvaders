import { useNostr } from '@nostrify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { GAME_SCORE_KIND, GAME_TAG } from '@/lib/gameConstants';
import { getCurrentWeekStart } from '@/lib/weekUtils';

interface PublishScoreParams {
  score: number;
  lightning: string;
  signer: {
    signEvent(event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>): Promise<NostrEvent>;
  };
}

export function usePublishScore() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ score, lightning, signer }: PublishScoreParams) => {
      const sessionId = crypto.randomUUID();

      const event = await signer.signEvent({
        kind: GAME_SCORE_KIND,
        content: '',
        tags: [
          ['d', sessionId],
          ['score', String(score)],
          ['lightning', lightning],
          ['t', GAME_TAG],
          ['alt', 'Sats Invaders game score'],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });

      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      const weekStart = getCurrentWeekStart();
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'current', weekStart] });
    },
    onError: (error) => {
      console.error('Failed to publish score:', error);
    },
  });
}
