'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  QrCode as QrIcon,
  Tag,
} from 'lucide-react';
import { QrCode } from './QrCode';
import { formatPaymentAmount } from '@/lib/payments/format';
import { CRYPTO_SELECTOR_OPTIONS, OFFICIAL_CONTRACTS } from '@/lib/payments/cryptoConfig';

export interface PaymentOrderData {
  orderId: string;
  amount: string; // e.g. "2.004821" or "1.504821"
  basePriceUsd: string; // "2.00"
  originalPriceUsd?: string;
  finalPriceUsdt?: string;
  discountAmountUsdt?: string;
  couponCode?: string | null;
  formattedDiscount?: string | null;
  currency: 'USDT' | 'USDC' | string; // "USDT" | "USDC"
  network: 'Polygon' | 'Aptos' | 'TRON' | string; // "Polygon" | "Aptos" | "TRON"
  destinationAddress: string;
  expiresAt: string; // ISO string
  expiresInSeconds: number;
}

interface BybitPaymentModalProps {
  order: PaymentOrderData;
  onClose: () => void;
  onConfirmed: () => void;
  onNewOrder: (couponCode?: string, methodOrNetwork?: string) => void;
}

export function BybitPaymentModal({
  order,
  onClose,
  onConfirmed,
  onNewOrder,
}: BybitPaymentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [status, setStatus] = useState<
    'pending' | 'detected' | 'confirmed' | 'expired' | 'amount_mismatch' | 'late_payment'
  >('pending');
  const [statusMessage, setStatusMessage] = useState(
    order.network === 'Aptos'
      ? 'Waiting for transfer on Aptos mainnet...'
      : 'Waiting for transfer on Polygon network...'
  );
  const [txId, setTxId] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<string | null>(null);

  // Client-side portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scroll while modal is active & handle ESC key
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.paddingRight = origPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Countdown timer in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const expiresMs = new Date(order.expiresAt).getTime();
    return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
  });

  // Copy address helper
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(order.destinationAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {}
  };

  const displayAmount = formatPaymentAmount(order.amount);

  // Copy exact amount helper
  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(displayAmount);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {}
  };

  // Countdown tick
  useEffect(() => {
    if (status === 'confirmed' || status === 'expired' || status === 'late_payment') {
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('expired');
          setStatusMessage('Payment window expired (20:00). Please generate a new order.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Polling server for Bybit deposit updates every 6 seconds
  const pollStatus = useCallback(async () => {
    if (status === 'confirmed' || status === 'expired' || status === 'late_payment') {
      return;
    }

    try {
      const res = await fetch(`/api/payments/bybit/check?orderId=${encodeURIComponent(order.orderId)}`);
      const data = await res.json();

      if (!res.ok) return;

      if (data.status === 'confirmed') {
        setStatus('confirmed');
        setStatusMessage('Payment confirmed! Ad-Free status activated.');
        if (data.txId) setTxId(data.txId);
        setTimeout(() => {
          onConfirmed();
        }, 1800);
      } else if (data.status === 'detected') {
        setStatus('detected');
        setStatusMessage(data.message || 'Deposit detected on Polygon! Waiting for Bybit confirmation...');
        if (data.txId) setTxId(data.txId);
        if (data.confirmations) setConfirmations(data.confirmations);
      } else if (data.status === 'late_payment') {
        setStatus('late_payment');
        setStatusMessage(data.message || 'Payment received after order expired. Please contact support.');
        if (data.txId) setTxId(data.txId);
      } else if (data.status === 'amount_mismatch') {
        setStatus('amount_mismatch');
        setStatusMessage(data.message || 'Incorrect amount detected. Please contact support.');
      } else if (data.status === 'expired') {
        setStatus('expired');
        setStatusMessage('Order has expired.');
      }
    } catch {
      // Ignore transient network errors during poll
    }
  }, [order.orderId, status, onConfirmed]);

  useEffect(() => {
    const pollInterval = setInterval(pollStatus, 6000);
    return () => clearInterval(pollInterval);
  }, [pollStatus]);

  // Format MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-ink/40  animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-surface border border-border rounded-md sm:rounded-md shadow-subtle flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Top Bar with Close Control */}
        <div className="sticky top-0 z-20 px-3.5 sm:px-6 pt-3.5 pb-2.5 sm:pt-4 sm:pb-3 bg-white/95 dark:bg-slate-900/95  border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand text-xs font-bold tracking-wider shrink-0">
              <div className="flex items-center gap-1 shrink-0">
                <img
                  src={order.currency === 'USDC' ? '/images/crypto/usdc.png' : '/images/crypto/usdt.png'}
                  alt={order.currency === 'USDC' ? 'Circle USDC logo' : 'Tether USDT logo'}
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5 rounded-full object-contain"
                />
                <img
                  src={
                    order.network === 'Aptos'
                      ? '/images/crypto/aptos.png'
                      : order.network === 'TRON'
                      ? '/images/crypto/tron.png'
                      : '/images/crypto/polygon.png'
                  }
                  alt={`${order.network} network logo`}
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5 rounded-full object-contain"
                />
              </div>
              <span>{order.currency || 'USDT'} ({order.network})</span>
            </div>
            <span className="text-xs text-muted font-mono hidden sm:inline">
              #{order.orderId.slice(0, 8)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close payment modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain">
          {/* Header Title */}
          <div className="text-center space-y-1">
            <h2 id="payment-modal-title" className="text-xl sm:text-2xl font-black text-ink">
              Remove DocuNexa Ads
            </h2>
            <p className="text-xs text-muted">
              Order <span className="font-mono text-ink font-semibold">{order.orderId}</span>
            </p>
          </div>

          {/* Confirmed State */}
          {status === 'confirmed' ? (
            <div className="p-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <CheckCircle2 size={44} className="mx-auto text-emerald-500 animate-bounce" />
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                Payment Confirmed!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Your Ad-Free entitlement has been activated. Advertising is now disabled for your DocuNexa account.
              </p>
              {txId && (
                <a
                  href={
                    order.network === 'Aptos'
                      ? `https://explorer.aptoslabs.com/txn/${txId}?network=mainnet`
                      : `https://polygonscan.com/tx/${txId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono hover:underline pt-1"
                >
                  View on {order.network === 'Aptos' ? 'Aptos Explorer' : 'PolygonScan'} <ExternalLink size={12} />
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Payment Method / Network Selection Control (4 Options) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    Payment Method ({CRYPTO_SELECTOR_OPTIONS.length} Options)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Choose payment rail
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 sm:p-1.5 rounded-md bg-paper border border-border/80">
                  {CRYPTO_SELECTOR_OPTIONS.map((method) => {
                    const isSelected =
                      (method.id === 'polygon_usdt' && order.network === 'Polygon' && (order.currency === 'USDT' || !order.currency)) ||
                      (method.id === 'aptos_usdt' && order.network === 'Aptos') ||
                      (method.id === 'tron_usdt' && order.network === 'TRON') ||
                      (method.id === 'polygon_usdc' && order.network === 'Polygon' && order.currency === 'USDC');

                    if (method.isEnabled) {
                      return (
                        <button
                          key={method.id}
                          type="button"
                          disabled={networkSwitching}
                          onClick={async () => {
                            if (isSelected) return;
                            setNetworkSwitching(true);
                            await onNewOrder(order.couponCode || undefined, method.id);
                            setNetworkSwitching(false);
                          }}
                          className={`py-2.5 px-2.5 sm:px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 min-w-0 ${
                            isSelected
                              ? 'bg-surface text-ink shadow-sm border border-purple-300 dark:border-purple-700 ring-1 ring-purple-400/30'
                              : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Dual Official Brand Logos: Token + Network */}
                            <div className="flex items-center gap-1 shrink-0" aria-label={`${method.tokenLogoAlt} and ${method.networkLogoAlt}`}>
                              <img
                                src={method.tokenLogoSrc}
                                alt={method.tokenLogoAlt}
                                width={22}
                                height={22}
                                className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full shrink-0 shadow-xs object-contain"
                                loading="eager"
                              />
                              <img
                                src={method.networkLogoSrc}
                                alt={method.networkLogoAlt}
                                width={22}
                                height={22}
                                className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full shrink-0 shadow-xs object-contain"
                                loading="eager"
                              />
                            </div>
                            <div className="flex flex-col text-left min-w-0">
                              <span className="text-xs font-bold text-ink truncate leading-tight">
                                {method.shortLabel}
                              </span>
                              <span className="text-[10px] text-muted font-medium truncate leading-tight">
                                {method.networkName}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-tight sm:tracking-normal px-1.5 py-0.5 rounded ${method.badgeColor} shrink-0`}>
                            {method.badgeText}
                          </span>
                        </button>
                      );
                    }

                    // Disabled / Coming Soon methods
                    return (
                      <button
                        key={method.id}
                        type="button"
                        disabled={true}
                        aria-disabled="true"
                        title={method.tooltip}
                        className="py-2.5 px-2.5 sm:px-3 rounded-md text-xs font-semibold bg-slate-100/50 dark:bg-slate-800/30 text-muted border border-dashed border-border/60 flex items-center justify-between gap-2 cursor-not-allowed opacity-75 select-none min-w-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Dual Official Brand Logos: Token + Network */}
                          <div className="flex items-center gap-1 shrink-0 opacity-70" aria-label={`${method.tokenLogoAlt} and ${method.networkLogoAlt}`}>
                            <img
                              src={method.tokenLogoSrc}
                              alt={method.tokenLogoAlt}
                              width={22}
                              height={22}
                              className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full shrink-0 shadow-xs object-contain"
                              loading="eager"
                            />
                            <img
                              src={method.networkLogoSrc}
                              alt={method.networkLogoAlt}
                              width={22}
                              height={22}
                              className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full shrink-0 shadow-xs object-contain"
                              loading="eager"
                            />
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <span className="text-xs font-semibold text-muted truncate leading-tight">
                              {method.shortLabel}
                            </span>
                            <span className="text-[10px] text-muted font-mono truncate leading-tight">
                              {method.id === 'polygon_usdc' ? 'Native (0x3c49...)' : method.networkName}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-tight sm:tracking-normal px-1.5 py-0.5 rounded ${method.badgeColor} shrink-0`}>
                          {method.badgeText}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted leading-normal px-0.5">
                  All four payment methods are active. Select your preferred network and token to proceed.
                </p>
              </div>

              {/* Pricing Breakdown & Coupon Entry */}
              <div className="p-4 rounded-md bg-paper border border-border space-y-3">
                {order.couponCode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
                        <Tag size={12} /> {order.couponCode} {order.formattedDiscount ? `(${order.formattedDiscount})` : 'Applied'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNewOrder('', order.network)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-1 text-xs text-muted pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between">
                        <span>Original Price</span>
                        <span className="line-through text-slate-400">${formatPaymentAmount(order.originalPriceUsd || order.basePriceUsd || '2.00')}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>Coupon Discount</span>
                        <span>-{formatPaymentAmount(order.discountAmountUsdt || '0.0000')} {order.currency || 'USDT'}</span>
                      </div>
                      <div className="flex justify-between font-bold text-ink pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-sm">
                        <span>You Pay</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">${formatPaymentAmount(order.finalPriceUsdt || order.amount)} USD</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted font-medium">Have a coupon code?</span>
                      <span className="font-bold text-ink">Normal Price: $2.00</span>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const trimmed = couponInput.trim();
                        if (!trimmed) return;
                        setCouponLoading(true);
                        setCouponError(null);
                        try {
                          const vRes = await fetch('/api/coupons/validate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: trimmed }),
                          });
                          const vData = await vRes.json();
                          if (!vRes.ok) throw new Error(vData.error || 'Invalid coupon');
                          onNewOrder(trimmed.toUpperCase(), order.network);
                        } catch (err: any) {
                          setCouponError(err.message || 'Invalid coupon code');
                        } finally {
                          setCouponLoading(false);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        placeholder="e.g. SAVE25"
                        className="flex-1 px-3 py-1.5 rounded-md text-xs font-mono font-medium uppercase tracking-wider bg-surface border border-border text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-3.5 py-1.5 rounded-md text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center min-w-[60px]"
                      >
                        {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                      </button>
                    </form>
                    {couponError && (
                      <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Amount & Timer Highlight Box */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-md bg-paper border border-slate-200/80 dark:border-slate-700/60">
                {/* Pay Amount */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Exact Amount to Pay
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-brand font-mono">
                      {displayAmount}
                    </span>
                    <span className="text-xs font-bold text-ink font-mono">
                      {order.currency || 'USDT'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyAmount}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline cursor-pointer"
                  >
                    {copiedAmount ? (
                      <>
                        <Check size={12} className="text-emerald-500" /> Copied amount
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy exact amount
                      </>
                    )}
                  </button>
                </div>

                {/* Countdown Timer */}
                <div className="space-y-1 text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center justify-end gap-1">
                    <Clock size={12} /> Time remaining
                  </span>
                  <div
                    className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                      secondsRemaining < 120
                        ? 'text-rose-500 animate-pulse'
                        : secondsRemaining < 300
                        ? 'text-amber-500'
                        : 'text-ink'
                    }`}
                  >
                    {timeFormatted}
                  </div>
                  <span className="text-[10px] text-muted block">
                    20-minute validity
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar: Copy Amount, Copy Address, Show/Hide QR */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="min-w-0 py-2 sm:py-2.5 px-1 sm:px-3 rounded-md border border-border bg-paper text-[10px] sm:text-xs font-semibold text-ink hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedAmount ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Copy size={14} className="shrink-0" />}
                  <span className="truncate">{copiedAmount ? 'Copied!' : 'Copy Amount'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="min-w-0 py-2 sm:py-2.5 px-1 sm:px-3 rounded-md border border-border bg-paper text-[10px] sm:text-xs font-semibold text-ink hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedAddress ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Copy size={14} className="shrink-0" />}
                  <span className="truncate">{copiedAddress ? 'Copied!' : 'Copy Address'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="min-w-0 py-2 sm:py-2.5 px-1 sm:px-3 rounded-md border border-border bg-paper text-[10px] sm:text-xs font-semibold text-ink hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
                >
                  <QrIcon size={14} className="shrink-0" />
                  <span className="truncate">{showQr ? 'Hide QR' : 'Show QR'}</span>
                </button>
              </div>

              {/* Prominent Network Warning Banner */}
              <div className={`p-4 rounded-md border text-xs space-y-1.5 ${
                order.network === 'Aptos'
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800/70 text-teal-950 dark:text-teal-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle size={16} className={order.network === 'Aptos' ? 'text-teal-600 dark:text-teal-400 shrink-0' : 'text-amber-600 dark:text-amber-400 shrink-0'} />
                  <span>Important {order.network} Payment Warning</span>
                </div>
                <p className="leading-relaxed">
                  Send <strong>EXACTLY {displayAmount} {order.currency || 'USDT'}</strong> using the <strong>
                    {order.network === 'Aptos'
                      ? 'Aptos Mainnet'
                      : order.network === 'TRON'
                      ? 'TRON (TRC20)'
                      : order.currency === 'USDC'
                      ? 'Polygon PoS (Native USDC)'
                      : 'Polygon PoS'}
                  </strong> network.
                </p>
                <p className="leading-relaxed text-[11px] font-medium opacity-90">
                  <strong>CRITICAL:</strong> The selected network ({order.network}) and token ({order.currency || 'USDT'}) must match what you send from your wallet or exchange.
                </p>
                {order.network === 'Aptos' ? (
                  <p className="text-[10px] font-mono text-teal-800 dark:text-teal-300 pt-0.5 break-all">
                    Official Tether USDt Fungible Asset Metadata ID: {OFFICIAL_CONTRACTS.APTOS_USDT_METADATA}
                  </p>
                ) : order.network === 'TRON' ? (
                  <p className="text-[10px] font-mono text-red-800 dark:text-red-300 pt-0.5 break-all">
                    Official Tether USDt (TRC20) Contract: {OFFICIAL_CONTRACTS.TRON_USDT_TRC20}
                  </p>
                ) : order.currency === 'USDC' ? (
                  <p className="text-[10px] font-mono text-blue-800 dark:text-blue-300 pt-0.5 break-all">
                    Official Native Circle USDC Contract: {OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE}
                    <br />
                    <span className="font-semibold text-rose-500">Notice: Legacy bridged USDC.e (0x2791...) is strictly incompatible.</span>
                  </p>
                ) : (
                  <p className="text-[10px] font-mono text-amber-800 dark:text-amber-300 pt-0.5 break-all">
                    Official Tether USDt (Polygon PoS) Contract: {OFFICIAL_CONTRACTS.POLYGON_USDT}
                  </p>
                )}
              </div>

              {/* Destination Address & QR Code */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={
                        order.network === 'Aptos'
                          ? '/images/crypto/aptos.png'
                          : order.network === 'TRON'
                          ? '/images/crypto/tron.png'
                          : '/images/crypto/polygon.png'
                      }
                      alt={`${order.network} network logo`}
                      width={16}
                      height={16}
                      className="w-4 h-4 rounded-full object-contain shrink-0"
                    />
                    <span className="text-xs font-bold text-ink">
                      {order.network === 'Aptos'
                        ? 'Aptos Receiving Address'
                        : order.network === 'TRON'
                        ? 'TRON (TRC20) Receiving Address'
                        : order.currency === 'USDC'
                        ? 'Polygon PoS (Native USDC) Receiving Address'
                        : 'Bybit Deposit Address (Polygon PoS)'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-paper text-muted">
                    Network: {order.network}
                  </span>
                </div>

                {/* Address Display Bar */}
                <div
                  onClick={handleCopyAddress}
                  className="p-3 rounded-md bg-paper border border-border font-mono text-xs sm:text-sm text-ink break-all select-all cursor-pointer hover:border-brand-500 transition-colors"
                  title="Click to copy address"
                >
                  {order.destinationAddress}
                </div>

                {/* QR Code Container */}
                {showQr && (
                  <div className="flex justify-center pt-1 animate-in fade-in duration-150">
                    <QrCode value={order.destinationAddress} size={150} />
                  </div>
                )}
              </div>

              {/* Live Status Tracker */}
              <div className="p-3.5 rounded-md bg-paper border border-border space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted flex items-center gap-1.5">
                    {status === 'detected' ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-amber-500" /> Detection Status:
                      </>
                    ) : status === 'expired' || status === 'late_payment' || status === 'amount_mismatch' ? (
                      <>
                        <AlertCircle size={13} className="text-rose-500" /> Status:
                      </>
                    ) : (
                      <>
                        <Loader2 size={13} className="animate-spin text-brand" /> Status:
                      </>
                    )}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Auto-checking every 6s
                  </span>
                </div>
                <p className="text-xs text-ink font-medium leading-relaxed">
                  {statusMessage}
                </p>
                {confirmations && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Block Confirmations: {confirmations}
                  </p>
                )}
              </div>

              {/* Expired / Mismatch Action */}
              {(status === 'expired' || status === 'late_payment' || status === 'amount_mismatch') && (
                <div className="pt-2">
                  <button
                    onClick={() => onNewOrder(order.couponCode || undefined, order.network)}
                    className="w-full py-3 px-4 rounded-md bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={16} /> Generate New Payment Order
                  </button>
                </div>
              )}

              {/* Honest Disclosure Caveat */}
              <p className="text-[11px] text-center text-muted leading-relaxed">
                Waiting for {order.network} blockchain confirmation. Deposits are credited automatically once verified by the server.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

