'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  Download,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Review Modal State
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewTxId, setReviewTxId] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (networkFilter !== 'all') params.set('network', networkFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load payments');
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, networkFilter, startDate, endDate]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (networkFilter !== 'all') params.set('network', networkFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    window.open(`/api/admin/payments/export?${params.toString()}`, '_blank');
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleOpenReview = (order: any) => {
    setReviewOrder(order);
    setReviewAction('approve');
    setReviewReason('');
    setReviewTxId(order.txId || '');
    setReviewConfirmed(false);
    setReviewError(null);
    setReviewSuccess(null);
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder || !reviewConfirmed || reviewReason.trim().length < 5) return;

    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/admin/payments/${reviewOrder.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          reason: reviewReason.trim(),
          txId: reviewTxId.trim(),
          confirm: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review payment');

      setReviewSuccess(data.message || 'Payment review successfully submitted.');
      setTimeout(() => {
        setReviewOrder(null);
        fetchPayments();
      }, 1200);
    } catch (err: any) {
      setReviewError(err.message || 'Error processing review');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Payment Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time direct Bybit USDT Polygon orders, blockchain confirmations, and review cases.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Total orders: <strong className="text-slate-900 dark:text-white">{totalCount}</strong>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order ID or Polygon transaction hash..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Filter from date"
              className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="Filter to date"
              className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="detected">Detected</option>
              <option value="late_payment">Late Payment</option>
              <option value="amount_mismatch">Amount Mismatch</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={networkFilter}
              onChange={(e) => {
                setNetworkFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Networks</option>
              <option value="Polygon">Polygon (PoS)</option>
              <option value="Aptos">Aptos (Mainnet)</option>
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Download safe RFC 4180 CSV export"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="animate-spin text-brand-500 mx-auto" size={24} />
            <p className="text-xs text-slate-400">Loading payment orders...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No payment orders found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">User Email</th>
                  <th className="py-3 px-3">Original</th>
                  <th className="py-3 px-3">Coupon</th>
                  <th className="py-3 px-3">Required USDT</th>
                  <th className="py-3 px-3">Received USDT</th>
                  <th className="py-3 px-3">Network</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Tx Hash</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payments.map((p) => {
                  const isConfirmed = p.status === 'confirmed';
                  const isPending = p.status === 'pending';
                  const isDetected = p.status === 'detected';
                  const isLate = p.status === 'late_payment';
                  const isMismatch = p.status === 'amount_mismatch';
                  const isExpired = p.status === 'expired';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {p.orderId}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {p.userEmail}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        ${Number(p.originalAmountUsd || 2.00).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        {p.couponCode ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-mono font-bold text-[10px]">
                              {p.couponCode}
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-mono">
                              -{Number(p.discountAmountUsdt || 0).toFixed(2)} USDT
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-brand-600 dark:text-brand-400">
                        {p.paymentAmountUsdt}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {p.receivedAmount ? (
                          <span className={isMismatch ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                            {p.receivedAmount}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.network === 'Aptos' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-[10px]">
                            Aptos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold text-[10px]">
                            Polygon
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 size={10} /> Confirmed
                          </span>
                        ) : isDetected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                            <RefreshCw size={10} className="animate-spin" /> Detected
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                            <Clock size={10} /> Pending
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                            <AlertTriangle size={10} /> Late Payment
                          </span>
                        ) : isMismatch ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                            <AlertTriangle size={10} /> Mismatch
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-[10px]">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {p.txId ? (
                          <a
                            href={
                              p.network === 'Aptos'
                                ? `https://explorer.aptoslabs.com/txn/${p.txId}?network=mainnet`
                                : `https://polygonscan.com/tx/${p.txId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-600 dark:text-brand-400 hover:underline"
                            title={p.txId}
                          >
                            {p.txId.slice(0, 8)}... <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {(isLate || isMismatch || isPending) && (
                          <button
                            onClick={() => handleOpenReview(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-[11px] font-semibold hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Manual Payment Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setReviewOrder(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Payment Order Investigation
                </h3>
                <p className="text-xs text-slate-500">
                  Order <span className="font-mono font-bold">{reviewOrder.orderId}</span> ({reviewOrder.status})
                </p>
              </div>
            </div>

            {/* Diagnostic Snapshot */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Network:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{reviewOrder.network || 'Polygon'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected USDT:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{reviewOrder.paymentAmountUsdt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Received USDT:</span>
                <span className="font-mono font-bold text-brand-600">{reviewOrder.receivedAmount || 'Not detected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Address:</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[260px]">
                  {reviewOrder.destinationAddress}
                </span>
              </div>
              {reviewOrder.failureReason && (
                <div className="pt-1 text-[11px] text-rose-500 font-medium">
                  Reported issue: {reviewOrder.failureReason}
                </div>
              )}
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Decision Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('approve')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-colors cursor-pointer ${
                      reviewAction === 'approve'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Approve & Upgrade
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('reject')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-colors cursor-pointer ${
                      reviewAction === 'reject'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Reject Order
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  {reviewOrder.network || 'Polygon'} Tx Hash / Verification Evidence
                </label>
                <input
                  type="text"
                  value={reviewTxId}
                  onChange={(e) => setReviewTxId(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Documented Reason (Required)
                </label>
                <textarea
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Explain why this decision is being made for the permanent audit log..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="confirmReview"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="confirmReview"
                  className="text-slate-600 dark:text-slate-300 text-[11px] leading-tight cursor-pointer"
                >
                  I confirm that I have verified the blockchain transfer details and authorize this decision.
                </label>
              </div>

              {reviewError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
                  {reviewError}
                </div>
              )}

              {reviewSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  ✓ {reviewSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewOrder(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading || !reviewConfirmed || reviewReason.trim().length < 5}
                  className={`px-4 py-2 rounded-xl text-white font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {reviewLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
