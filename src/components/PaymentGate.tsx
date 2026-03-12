import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Copy, Check, Loader2 } from 'lucide-react';
import qrcode from 'qrcode';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PAYMENT_AMOUNT_SATS, PAYMENT_RECIPIENT } from '@/lib/gameConstants';
import { getGameInvoice, isWebLNAvailable, payWithWebLN, checkPaymentSettled } from '@/lib/lightning';
import type { GameInvoice } from '@/lib/lightning';

interface PaymentGateProps {
  open: boolean;
  onPaid: (lightningAddress: string) => void;
  onClose: () => void;
}

const POLL_INTERVAL_MS = 2500;

export function PaymentGate({ open, onPaid, onClose }: PaymentGateProps) {
  const [lightningAddress, setLightningAddress] = useState('');
  const [step, setStep] = useState<'address' | 'invoice'>('address');
  const [invoice, setInvoice] = useState<GameInvoice | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paidRef = useRef(false);

  // Clean up polling on unmount or close
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPolling(false);
  }, []);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep('address');
      setInvoice(null);
      setQrDataUrl('');
      setError('');
      setCopied(false);
      setLoading(false);
      setPolling(false);
      paidRef.current = false;
      stopPolling();
    } else {
      stopPolling();
    }
  }, [open, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Start polling for payment verification
  const startPolling = useCallback((verifyUrl: string, address: string) => {
    stopPolling();
    setPolling(true);

    pollTimerRef.current = setInterval(async () => {
      if (paidRef.current) return;

      const settled = await checkPaymentSettled(verifyUrl);
      if (settled) {
        paidRef.current = true;
        stopPolling();
        onPaid(address);
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, onPaid]);

  const handleSubmitAddress = useCallback(async () => {
    const trimmed = lightningAddress.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid lightning address (e.g. you@wallet.com)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const gameInvoice = await getGameInvoice();
      setInvoice(gameInvoice);

      // Generate QR code
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
          onPaid(trimmed);
          return;
        }
      }

      setStep('invoice');

      // Start polling the verify URL if available
      if (gameInvoice.verifyUrl) {
        startPolling(gameInvoice.verifyUrl, trimmed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  }, [lightningAddress, onPaid, startPolling]);

  const handleCopyInvoice = useCallback(() => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [invoice]);

  const hasVerify = invoice?.verifyUrl != null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0a0a0f] border-primary/30 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-primary text-center tracking-wider">
            INSERT COIN
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm">
            Pay {PAYMENT_AMOUNT_SATS} sats to {PAYMENT_RECIPIENT} for 1 life
          </DialogDescription>
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

            {hasVerify ? (
              /* Payment verification is active — auto-detect when paid */
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 py-3 rounded-md bg-secondary/30 border border-primary/10">
                  <Loader2 className="size-4 text-primary animate-spin" />
                  <span className="font-pixel text-[10px] text-primary tracking-wider">
                    {polling ? 'WAITING FOR PAYMENT...' : 'VERIFYING...'}
                  </span>
                </div>
                <p className="text-[10px] text-center text-muted-foreground/50">
                  Pay the invoice &mdash; the game starts automatically once confirmed
                </p>
              </div>
            ) : (
              /* No verify URL — fallback to manual confirmation */
              <>
                <Button
                  onClick={() => onPaid(lightningAddress.trim())}
                  className="w-full bg-primary text-primary-foreground font-pixel text-xs hover:bg-primary/90 h-12"
                >
                  I PAID &mdash; START GAME
                </Button>
                <p className="text-[10px] text-center text-muted-foreground/50">
                  Scan with any Lightning wallet, then confirm above
                </p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
