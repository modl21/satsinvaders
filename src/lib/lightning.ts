import { PAYMENT_AMOUNT_SATS, PAYMENT_RECIPIENT } from './gameConstants';

const CORS_PROXY = 'https://proxy.shakespeare.diy/?url=';

interface LNURLPayResponse {
  callback: string;
  minSendable: number;
  maxSendable: number;
  tag: string;
}

interface LNURLInvoiceResponse {
  pr: string;
  routes: string[];
}

/**
 * Resolve a lightning address to an LNURL-pay endpoint
 */
export async function resolveLightningAddress(address: string): Promise<LNURLPayResponse> {
  const [name, domain] = address.split('@');
  if (!name || !domain) {
    throw new Error('Invalid lightning address format');
  }

  const url = `https://${domain}/.well-known/lnurlp/${name}`;
  const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to resolve lightning address: ${response.statusText}`);
  }

  const data = await response.json() as LNURLPayResponse;
  
  if (data.tag !== 'payRequest') {
    throw new Error('Invalid LNURL-pay response');
  }

  return data;
}

/**
 * Request an invoice from the LNURL-pay callback
 */
export async function requestInvoice(callback: string, amountMsat: number): Promise<string> {
  const separator = callback.includes('?') ? '&' : '?';
  const url = `${callback}${separator}amount=${amountMsat}`;
  
  const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to request invoice: ${response.statusText}`);
  }

  const data = await response.json() as LNURLInvoiceResponse;
  
  if (!data.pr) {
    throw new Error('No payment request in response');
  }

  return data.pr;
}

/**
 * Get an invoice for the game payment
 */
export async function getGameInvoice(): Promise<string> {
  const lnurlPay = await resolveLightningAddress(PAYMENT_RECIPIENT);
  
  const amountMsat = PAYMENT_AMOUNT_SATS * 1000;
  
  if (amountMsat < lnurlPay.minSendable || amountMsat > lnurlPay.maxSendable) {
    throw new Error(
      `Amount ${PAYMENT_AMOUNT_SATS} sats is outside the allowed range ` +
      `(${lnurlPay.minSendable / 1000}-${lnurlPay.maxSendable / 1000} sats)`
    );
  }

  return requestInvoice(lnurlPay.callback, amountMsat);
}

/**
 * Check if WebLN is available for direct payment
 */
export function isWebLNAvailable(): boolean {
  return typeof window !== 'undefined' && 'webln' in window && window.webln != null;
}

/**
 * Pay an invoice using WebLN
 */
export async function payWithWebLN(invoice: string): Promise<boolean> {
  if (!isWebLNAvailable()) return false;
  
  try {
    await window.webln!.enable();
    await window.webln!.sendPayment(invoice);
    return true;
  } catch {
    return false;
  }
}
