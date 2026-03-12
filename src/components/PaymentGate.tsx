import { useState, useEffect, useCallback } from 'react';
import { Zap, Copy, Check, Loader2 } from 'lucide-react';
import qrcode from 'qrcode';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PAYMENT_AMOUNT_SATS, PAYMENT_RECIPIENT } from '@/lib/gameConstants';
import { getGameInvoice, isWebLNAvailable, payWithWebLN } from '@/lib/lightning';

interface PaymentGateProps {
  open: boolean;
  onPaid: (lightningAddress: string) => void;
  onClose: () => void;
}

export function PaymentGate({ open, onPaid, onClose }: PaymentGateProps) {
  const [lightningAddress, setLightningAddress] = useState('');
  const [step, setStep] = useState<'address' | 'invoice'>('address');
  const [invoice, setInvoice] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [webLNAttempted, setWebLNAttempted] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep('address');
      setInvoice('');
      setQrDataUrl('');
      setError('');
      setCopied(false);
      setWebLNAttempted(false);
      setLoading(false);
    }
  }, [open]);

  const handleSubmitAddress = useCallback(async () => {
    const trimmed = lightningAddress.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid lightning address (e.g. you@wallet.com)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const bolt11 = await getGameInvoice();
      setInvoice(bolt11);

      // Generate QR code
      const dataUrl = await qrcode.toDataURL(bolt11.toUpperCase(), {
        width: 280,
        margin: 2,
        color: { dark: '#22c55e', light: '#0a0a0f' },
      });
      setQrDataUrl(dataUrl);

      // Try WebLN auto-pay
      if (isWebLNAvailable() && !webLNAttempted) {
        setWebLNAttempted(true);
        const paid = await payWithWebLN(bolt11);
        if (paid) {
          onPaid(trimmed);
          return;
        }
      }

      setStep('invoice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  }, [lightningAddress, webLNAttempted, onPaid]);

  const handleCopyInvoice = useCallback(() => {
    navigator.clipboard.writeText(invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [invoice]);

  const handlePaidConfirm = useCallback(() => {
    const trimmed = lightningAddress.trim();
    if (trimmed) {
      onPaid(trimmed);
    }
  }, [lightningAddress, onPaid]);

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

        {step === 'invoice' && (
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
                value={invoice.substring(0, 32) + '...'}
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

            <Button
              onClick={handlePaidConfirm}
              className="w-full bg-primary text-primary-foreground font-pixel text-xs hover:bg-primary/90 h-12"
            >
              I PAID - START GAME
            </Button>

            <p className="text-[10px] text-center text-muted-foreground/50">
              Scan with any Lightning wallet or copy the invoice
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
