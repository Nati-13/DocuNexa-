'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

export interface PaymentOrderData {
  orderId: string;
  amount: string; // e.g. "2.004821" or "1.504821"
  basePriceUsd: string; // "2.00"
  originalPriceUsd?: string;
  finalPriceUsdt?: string;
  discountAmountUsdt?: string;
  couponCode?: string | null;
  formattedDiscount?: string | null;
  currency: string; // "USDT"
  network: string; // "Polygon"
  destinationAddress: string; // "0x..."
  expiresAt: string; // ISO string
  expiresInSeconds: number;
}

interface BybitPaymentModalProps {
  order: PaymentOrderData;
  onClose: () => void;
  onConfirmed: () => void;
  onNewOrder: (couponCode?: string) => void;
}

export function BybitPaymentModal({
  order,
  onClose,
  onConfirmed,
  onNewOrder,
}: BybitPaymentModalProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    'pending' | 'detected' | 'confirmed' | 'expired' | 'amount_mismatch' | 'late_payment'
  >('pending');
  const [statusMessage, setStatusMessage] = useState('Waiting for transfer on Polygon network...');
  const [txId, setTxId] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<string | null>(null);

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

  // Copy exact amount helper
  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(order.amount);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} /> Direct Bybit USDT Payment
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Remove DocuNexa Ads
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Order <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{order.orderId}</span>
          </p>
        </div>

        {/* Confirmed State */}
        {status === 'confirmed' ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
            <CheckCircle2 size={44} className="mx-auto text-emerald-500 animate-bounce" />
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
              Payment Confirmed!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Your Ad-Free entitlement has been activated. Advertising is now disabled for your DocuNexa account.
            </p>
            {txId && (
              <a
                href={`https://polygonscan.com/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono hover:underline pt-1"
              >
                View on PolygonScan <ExternalLink size={12} />
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Pricing Breakdown & Coupon Entry */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              {order.couponCode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
                      <Tag size={12} /> {order.couponCode} {order.formattedDiscount ? `(${order.formattedDiscount})` : 'Applied'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNewOrder('')}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex justify-between">
                      <span>Original Price</span>
                      <span className="line-through text-slate-400">${order.originalPriceUsd || order.basePriceUsd || '2.00'}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Coupon Discount</span>
                      <span>-{order.discountAmountUsdt} USDT</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-sm">
                      <span>You Pay</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">${order.finalPriceUsdt} USD</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Have a coupon code?</span>
                    <span className="font-bold text-slate-900 dark:text-white">Normal Price: $2.00</span>
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
                        onNewOrder(trimmed.toUpperCase());
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
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs font-mono font-medium uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center min-w-[60px]"
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
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              {/* Pay Amount */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Exact Amount to Pay
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 font-mono">
                    {order.amount}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                    USDT
                  </span>
                </div>
                <button
                  onClick={handleCopyAmount}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
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
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                  <Clock size={12} /> Time remaining
                </span>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                    secondsRemaining < 120
                      ? 'text-rose-500 animate-pulse'
                      : secondsRemaining < 300
                      ? 'text-amber-500'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {timeFormatted}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  20-minute validity
                </span>
              </div>
            </div>

            {/* Quick Actions Bar: Copy Amount, Copy Address, Show/Hide QR */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCopyAmount}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedAmount ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedAmount ? 'Copied!' : 'Copy Amount'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAddress}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedAddress ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedAddress ? 'Copied!' : 'Copy Address'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <QrIcon size={14} />
                <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
              </button>
            </div>

            {/* Verbatim Customer Warning Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Important Payment Warning</span>
              </div>
              <p className="leading-relaxed">
                Send <strong>EXACTLY {order.amount} USDT</strong> using the <strong>Polygon</strong> network.
              </p>
              <p className="leading-relaxed text-amber-800 dark:text-amber-300 text-[11px]">
                Sending another amount or another network may cause the payment to require manual review.
              </p>
            </div>

            {/* Destination Address & QR Code */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bybit Deposit Address (Polygon PoS)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Network: Polygon
                </span>
              </div>

              {/* Address Display Bar */}
              <div
                onClick={handleCopyAddress}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-all select-all cursor-pointer hover:border-brand-500 transition-colors"
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
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
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
                      <Loader2 size={13} className="animate-spin text-brand-500" /> Status:
                    </>
                  )}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Auto-checking every 6s
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
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
                  onClick={() => onNewOrder()}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={16} /> Generate New Payment Order
                </button>
              </div>
            )}

            {/* Honest Disclosure Caveat */}
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 leading-relaxed">
              Waiting for blockchain and Bybit confirmation. Deposits are credited automatically once confirmed by the Bybit on-chain deposit processor.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
