import { useState, useCallback, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Zap, Gamepad2, Smartphone, Keyboard, Play } from 'lucide-react';
import type { NSecSigner } from '@nostrify/nostrify';

import { Button } from '@/components/ui/button';
import { GameCanvas } from '@/components/GameCanvas';
import { TouchControls } from '@/components/TouchControls';
import { PaymentGate } from '@/components/PaymentGate';
import { Leaderboard } from '@/components/Leaderboard';
import { WeeklyWinnerBanner } from '@/components/WeeklyWinnerBanner';
import { GameOverOverlay } from '@/components/GameOverOverlay';
import { usePublishScore } from '@/hooks/usePublishScore';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { GamePhase } from '@/lib/gameTypes';
import type { GameInvoice } from '@/lib/lightning';

const Index = () => {
  useSeoMeta({
    title: 'Sats Invaders - Pay Sats. Blast Aliens. Top the Leaderboard.',
    description: 'A retro arcade shooter powered by Bitcoin Lightning. Pay 100 sats for one life, compete for the weekly high score, and claim glory on the Nostr-powered leaderboard.',
    ogTitle: 'Sats Invaders',
    ogDescription: 'Pay 100 sats. Get one life. Blast aliens. Top the weekly leaderboard. Powered by Lightning & Nostr.',
    ogImage: 'https://satsinvaders.com/satsinvaders.jpg',
    ogType: 'website',
    ogSiteName: 'Sats Invaders',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Sats Invaders',
    twitterDescription: 'Pay 100 sats. Get one life. Blast aliens. Top the weekly leaderboard.',
    twitterImage: 'https://satsinvaders.com/satsinvaders.jpg',
  });

  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [showPayment, setShowPayment] = useState(false);
  const [lightningAddress, setLightningAddress] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const signerRef = useRef<NSecSigner | null>(null);
  const keysRef = useRef({ left: false, right: false, shoot: false });
  const { mutateAsync: publishScore, isPending: isPublishing } = usePublishScore();

  const handleStartGame = useCallback(() => {
    setShowPayment(true);
  }, []);

  const handlePaid = useCallback((address: string, gameInvoice: GameInvoice) => {
    setLightningAddress(address);
    setShowPayment(false);
    setPhase('ready');
    signerRef.current = gameInvoice.signer;
  }, []);

  const handleLaunchGame = useCallback(() => {
    setPhase('playing');
  }, []);

  const handleGameOver = useCallback(async (score: number) => {
    setFinalScore(score);
    setPhase('gameOver');

    if (signerRef.current && lightningAddress) {
      try {
        await publishScore({
          score,
          lightning: lightningAddress,
          signer: signerRef.current,
        });
      } catch (error) {
        console.error('Failed to publish score:', error);
      }
    }
  }, [lightningAddress, publishScore]);

  const handlePlayAgain = useCallback(() => {
    setPhase('idle');
    setFinalScore(0);
    setShowPayment(true);
  }, []);

  return (
    <div className="min-h-full bg-[#0a0a0f] text-foreground overflow-y-auto">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]">
        <div className="w-full h-[200%] bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)] animate-scanline" />
      </div>

      <div className="relative z-10 flex flex-col items-center min-h-full px-4 py-6 gap-5">
        {/* Weekly Winner Banner */}
        <WeeklyWinnerBanner />

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="font-pixel text-xl md:text-2xl text-primary tracking-wider animate-float">
            SATS INVADERS
          </h1>
          <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
            Pay sats. Blast aliens. Top the leaderboard.
          </p>
        </div>

        {/* Game Area */}
        <div className="relative">
          <GameCanvas
            onGameOver={handleGameOver}
            isPlaying={phase === 'playing'}
            keysRef={keysRef}
          />

          {/* Idle overlay */}
          {phase === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 backdrop-blur-[2px] rounded-lg">
              <div className="text-center space-y-5 p-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Gamepad2 className="size-12 text-primary animate-float" />
                    <div className="absolute -top-1 -right-1 size-4 bg-accent rounded-full flex items-center justify-center">
                      <Zap className="size-2.5 text-accent-foreground fill-accent-foreground" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-pixel text-xs text-foreground tracking-wider">
                    100 SATS = 1 LIFE
                  </p>
                  <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">
                    One life. One chance. Make it count.
                  </p>
                </div>

                <Button
                  onClick={handleStartGame}
                  className="bg-primary text-primary-foreground font-pixel text-xs hover:bg-primary/90 h-12 px-8 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-shadow"
                >
                  <Zap className="size-4 mr-2" />
                  INSERT COIN
                </Button>

                {/* Controls hint */}
                <div className="flex items-center justify-center gap-4 text-muted-foreground/50">
                  <div className="flex items-center gap-1">
                    <Keyboard className="size-3" />
                    <span className="text-[8px] font-pixel">ARROWS + SPACE</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Smartphone className="size-3" />
                    <span className="text-[8px] font-pixel">ON-SCREEN BUTTONS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ready overlay — payment received, waiting to start */}
          {phase === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-[2px] rounded-lg">
              <div className="text-center space-y-6 p-6">
                <div className="space-y-2">
                  <p className="font-pixel text-[10px] text-primary/70 tracking-wider">
                    PAYMENT RECEIVED
                  </p>
                  <p className="font-pixel text-sm text-foreground tracking-wider">
                    GET READY
                  </p>
                </div>

                <Button
                  onClick={handleLaunchGame}
                  className="bg-primary text-primary-foreground font-pixel text-sm hover:bg-primary/90 h-14 px-10 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] transition-shadow animate-pulse-glow"
                >
                  <Play className="size-5 mr-2 fill-current" />
                  START
                </Button>

                {isMobile ? (
                  <p className="text-[9px] text-muted-foreground/50 font-pixel">
                    USE ON-SCREEN BUTTONS TO PLAY
                  </p>
                ) : (
                  <p className="text-[9px] text-muted-foreground/50 font-pixel">
                    ARROWS TO MOVE &middot; SPACE TO FIRE
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Game Over overlay */}
          {phase === 'gameOver' && (
            <GameOverOverlay
              score={finalScore}
              isPublishing={isPublishing}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </div>

        {/* Touch controls — visible on mobile while playing */}
        {isMobile && phase === 'playing' && (
          <TouchControls keysRef={keysRef} />
        )}

        {/* Leaderboard */}
        <Leaderboard />

        {/* Footer */}
        <footer className="text-center text-[10px] text-muted-foreground/40 pb-4 space-y-1">
          <p>
            Scores stored on{' '}
            <span className="text-primary/50">Nostr</span>
            {' '}&middot;{' '}
            Payments via{' '}
            <span className="text-accent/50">Lightning</span>
          </p>
          <p>
            Vibed with{' '}
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/50 hover:text-primary/80 transition-colors"
            >
              Shakespeare
            </a>
          </p>
        </footer>
      </div>

      {/* Payment Dialog */}
      <PaymentGate
        open={showPayment}
        onPaid={handlePaid}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
};

export default Index;
