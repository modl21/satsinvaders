import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Copy, Check, Loader2, Wallet } from 'lucide-react';
import { useNostr } from '@nostrify/react';
import qrcode from 'qrcode';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAppContext } from '@/hooks/useAppContext';
import { PAYMENT_AMOUNT_SATS, PAYMENT_RECIPIENT } from '@/lib/gameConstants';
import { getGameInvoice, isWebLNAvailable, payWithWebLN } from '@/lib/lightning';
import type { GameInvoice } from '@/lib/lightning';

interface PaymentGateProps {
  open: boolean;
  onPaid: (lightningAddress: string, invoice: GameInvoice) => void;
  onClose: () => void;
}

const POLL_INTERVAL_MS = 2500;

export function PaymentGate({ open, onPaid, onClose }: PaymentGateProps) {
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const [lightningAddress, setLightningAddress] = useState('');
  const [step, setStep] = useState<'address' | 'invoice'>('address');
  const [invoice, setInvoice] = useState<GameInvoice | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const activeRef = useRef(false);

  const stopVerification = useCallback(() => {
    activeRef.current = false;
    setVerifying(false);
  }, []);

  useEffect(() => {
    if (open) {
      setStep('address');
      setInvoice(null);
      setQrDataUrl('');
      setError('');
      setCopied(false);
      setLoading(false);
      stopVerification();
    } else {
      stopVerification();
    }
  }, [open, stopVerification]);

  useEffect(() => {
    return () => { activeRef.current = false; };
  }, []);

  /**
   * Poll Nostr relays for a kind 9735 zap receipt that matches our zap request.
   *
   * Per NIP-57, the zap receipt:
   *  - has kind 9735
   *  - MUST include a `p` tag with the recipient pubkey
   *  - MUST include a `P` tag with the sender (zap requester) pubkey
   *  - MUST include a `description` tag with the JSON of our zap request
   *  - MUST include a `bolt11` tag with the invoice
   *
   * We filter by #p (recipient) to narrow the search, then match by bolt11 or
   * by the zap request id inside the description tag.
   */
  const startVerification = useCallback((gameInvoice: GameInvoice, address: string) => {
    stopVerification();
    activeRef.current = true;
    setVerifying(true);

    const onSettled = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setVerifying(false);
      onPaid(address, gameInvoice);
    };

    const sinceTimestamp = Math.floor(Date.now() / 1000) - 60;
    const recipientPubkey = gameInvoice.recipientLnurlPubkey!;
    const zapRequestId = gameInvoice.zapRequest!.id;
    const bolt11 = gameInvoice.bolt11;

    // Filter zap receipts by the recipient's p tag — this is indexed by relays
    // so it's efficient and won't return unrelated zap receipts
    const filter = [{
      kinds: [9735],
      '#p': [recipientPubkey],
      since: sinceTimestamp,
      limit: 20,
    }];

    async function poll() {
      if (!activeRef.current) return;

      try {
        const events = await nostr.query(filter, { signal: AbortSignal.timeout(8000) });

        for (const event of events) {
          // Match 1: bolt11 tag matches our invoice exactly
          const bolt11Tag = event.tags.find(([n]) => n === 'bolt11')?.[1];
          if (bolt11Tag === bolt11) {
            onSettled();
            return;
          }

          // Match 2: description tag contains our zap request
          const descTag = event.tags.find(([n]) => n === 'description')?.[1];
          if (descTag) {
            try {
              const embedded = JSON.parse(descTag);
              if (embedded.id === zapRequestId) {
                onSettled();
                return;
              }
            } catch {
              // skip malformed
            }
          }
        }
      } catch {
        // query failed, will retry
      }

      if (activeRef.current) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    // First poll after a short delay to allow payment propagation
    setTimeout(poll, 3000);
  }, [nostr, stopVerification, onPaid]);

  const handleSubmitAddress = useCallback(async () => {
    const trimmed = lightningAddress.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid lightning address (e.g. you@wallet.com)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const relays = config.relayMetadata.relays.map((r) => r.url);
      const gameInvoice = await getGameInvoice(relays);
      setInvoice(gameInvoice);

      const dataUrl = await qrcode.toDataURL(gameInvoice.bolt11.toUpperCase(), {
        width: 280,
        margin: 2,
        color: { dark: '#22c55e', light: '#0a0a0f' },
      });
      setQrDataUrl(dataUrl);

      // Try WebLN auto-pay first
      if (isWebLNAvailable()) {
        const paid = await payWithWebLN(gameInvoice.bolt11);
        if (paid) {
          // WebLN paid — still wait for zap receipt to verify
          startVerification(gameInvoice, trimmed);
          setStep('invoice');
          return;
        }
      }

      setStep('invoice');
      startVerification(gameInvoice, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  }, [lightningAddress, config, onPaid, startVerification]);

  const handleCopyInvoice = useCallback(() => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [invoice]);

  // Only allow closing on the address step — once an invoice is shown, lock the dialog
  const handleOpenChange = useCallback((o: boolean) => {
    if (!o && step === 'invoice') return; // blocked
    if (!o) onClose();
  }, [step, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`bg-[#0a0a0f] border-primary/30 max-w-sm mx-auto ${step === 'invoice' ? '[&>button:last-of-type]:hidden' : ''}`}
        onEscapeKeyDown={(e) => { if (step === 'invoice') e.preventDefault(); }}
        onInteractOutside={(e) => { if (step === 'invoice') e.preventDefault(); }}
      >
        <DialogHeader>
          <div className="space-y-3">
            <DialogTitle className="font-pixel text-sm text-primary text-center tracking-wider">
              INSERT COIN
            </DialogTitle>

            {/* Explicit visible wallet CTA */}
            <a
              href="https://primal.net/downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-pixel tracking-wide text-primary hover:bg-primary/20 transition-colors"
            >
              <Wallet className="size-3.5" />
              NEED A LIGHTNING WALLET? GET PRIMAL
            </a>

            <DialogDescription className="text-center text-muted-foreground text-sm">
              Pay {PAYMENT_AMOUNT_SATS} sats to {PAYMENT_RECIPIENT} for 1 life
            </DialogDescription>
          </div>
        </DialogHeader>

        {step === 'address' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-pixel tracking-wider">
                YOUR LIGHTNING ADDRESS
              </label>
              <Input
                placeholder="you@wallet.com"
                value={lightningAddress}
                onChange={(e) => setLightningAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitAddress()}
                className="bg-secondary/50 border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground/60">
                Your address goes on the leaderboard if you make the top 10
              </p>
            </div>

            {error && (
              <p className="text-destructive text-xs font-pixel">{error}</p>
            )}

            <Button
              onClick={handleSubmitAddress}
              disabled={loading || !lightningAddress.trim()}
              className="w-full bg-primary text-primary-foreground font-pixel text-xs hover:bg-primary/90 h-12"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Zap className="size-4 mr-2" />
              )}
              {loading ? 'GENERATING INVOICE...' : `PAY ${PAYMENT_AMOUNT_SATS} SATS`}
            </Button>
          </div>
        )}

        {step === 'invoice' && invoice && (
          <div className="space-y-4 pt-2">
            {qrDataUrl && (
              <div className="flex justify-center">
                <div className="p-2 rounded-lg border border-primary/20 bg-[#0a0a0f]">
                  <img src={qrDataUrl} alt="Lightning Invoice QR" className="w-[280px] h-[280px]" />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                readOnly
                value={invoice.bolt11.substring(0, 32) + '...'}
                className="bg-secondary/50 border-primary/20 text-foreground text-xs font-mono"
              />
              <Button
                onClick={handleCopyInvoice}
                variant="outline"
                size="icon"
                className="border-primary/20 shrink-0"
              >
                {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
              </Button>
            </div>

            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 py-3 rounded-md bg-secondary/30 border border-primary/10">
                <Loader2 className="size-4 text-primary animate-spin" />
                <span className="font-pixel text-[10px] text-primary tracking-wider">
                  {verifying ? 'WAITING FOR PAYMENT...' : 'PREPARING...'}
                </span>
              </div>
              <p className="text-[10px] text-center text-muted-foreground/50">
                Pay the invoice — the game starts automatically once confirmed
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
