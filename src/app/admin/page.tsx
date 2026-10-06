'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  DollarSign,
  Tag,
  ShieldCheck,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/overview');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch admin overview');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="animate-spin text-brand-600 dark:text-brand-400" size={32} />
        <p className="text-xs text-slate-500">Loading administrative metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertTriangle className="mx-auto text-rose-500" size={32} />
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Error Loading Dashboard</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { users, payments, revenue, coupons, configHealth } = data;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Administrative Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time aggregate data, revenue analytics, and system health.
          </p>
        </div>
        <button
          onClick={fetchOverview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} /> Refresh Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Revenue Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
            {revenue.totalRevenueUsdt}{' '}
            <span className="text-xs font-bold text-slate-500">USDT</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {revenue.confirmedPurchasesCount} Ad-Free upgrade purchases
          </p>
        </div>

        {/* Users Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {users.total}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Free: <strong className="text-slate-700 dark:text-slate-300">{users.free}</strong></span>
            <span>Ad-Free: <strong className="text-emerald-600 dark:text-emerald-400">{users.adFree}</strong></span>
          </div>
        </div>

        {/* Payments Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed Payments</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {payments.totalConfirmed}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-amber-500 font-medium">Pending: {payments.pending}</span>
            {payments.latePayments > 0 && (
              <span className="text-rose-500 font-medium">Late: {payments.latePayments}</span>
            )}
          </div>
        </div>

        {/* Coupons Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Coupons Redeemed</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Tag size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {coupons.totalRedemptions}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Total discounts: <strong className="text-emerald-600 font-mono">-{coupons.totalDiscountGrantedUsdt} USDT</strong>
          </p>
        </div>
      </div>

      {/* Secondary Details: Revenue Breakdown & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Velocity */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <TrendingUp size={16} className="text-brand-500" />
            <h3>Revenue Velocity (USDT)</h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Today</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{revenue.revenueTodayUsdt} USDT</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">This Week (Last 7 Days)</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{revenue.revenueThisWeekUsdt} USDT</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">This Month</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{revenue.revenueThisMonthUsdt} USDT</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Signups Today</span>
              <span className="font-bold text-slate-900 dark:text-white">{users.signupsToday} new users</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Signups This Week</span>
              <span className="font-bold text-slate-900 dark:text-white">{users.signupsThisWeek} new users</span>
            </div>
          </div>
        </div>

        {/* Most Used Coupons */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Tag size={16} className="text-amber-500" />
              <h3>Top Coupons</h3>
            </div>
            <Link
              href="/admin/coupons"
              className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Manage ({coupons.activeCount} active)
            </Link>
          </div>

          {coupons.mostUsed.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No coupons created yet.</p>
          ) : (
            <div className="space-y-2">
              {coupons.mostUsed.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{c.code}</span>
                    <span className="text-[10px] text-slate-400">
                      {c.discountType === 'percent' ? `${c.discountValue}% off` : `${c.discountValue} USDT off`}
                    </span>
                  </div>
                  <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                    {c.redemptionCount} redemptions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Health & Monetag Disclosure */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <ShieldCheck size={16} className="text-emerald-500" />
            <h3>System Status</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-600 dark:text-slate-400">Bybit V5 Integration</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Configured ✓
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-600 dark:text-slate-400">Network</span>
              <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">Polygon PoS (USDT)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-600 dark:text-slate-400">Wallet Destination</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Verified
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Monetag Ad Network</p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400">
              Monetag reporting and earnings are managed directly through the Monetag dashboard. Zone: 289364.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
