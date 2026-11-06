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
  Globe,
  Activity,
  Eye,
  FileText,
  UserCheck,
  UserX,
  Layers,
  ChevronRight,
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
        <Loader2 className="animate-spin text-brand" size={32} />
        <p className="text-xs text-slate-500">Loading administrative metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertTriangle className="mx-auto text-rose-500" size={32} />
        <h3 className="font-bold text-ink text-base">Error Loading Dashboard</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 rounded-md bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { users, payments, revenue, coupons, analytics, configHealth } = data;

  // Compute maximums for SVG sparkline scaling
  const maxRegCount = Math.max(1, ...(users?.registrationTrends || []).map((t: any) => t.count));
  const maxRevAmount = Math.max(0.1, ...(revenue?.dailyRevenueTrends || []).map((t: any) => parseFloat(t.amountUsdt || '0')));

  return (
    <div className="space-y-8">
      {/* Top Header & Live Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Administrator Control Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Authoritative aggregate database records, verified revenue, and real-time visitor analytics.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-ink hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Live Visitors & Activity Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-md bg-slate-900 text-white border border-slate-800 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30">
            <Activity size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Current Visitors</div>
            <div className="text-xl font-bold font-mono text-brand-300">
              {analytics?.currentVisitors ?? 0}
              <span className="text-[10px] ml-1 font-normal text-slate-400">(last 15m)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Eye size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Unique Visitors (30d)</div>
            <div className="text-xl font-bold font-mono text-white">
              {analytics?.uniqueVisitors ?? 0}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-brand/10 text-brand border border-brand/20">
            <UserCheck size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Active Users (DAU/MAU)</div>
            <div className="text-xl font-bold font-mono text-brand">
              {users?.dau ?? 0} <span className="text-xs text-slate-400 font-normal">/ {users?.mau ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-brand/10 text-brand border border-brand/20">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Successful Logins</div>
            <div className="text-xl font-bold font-mono text-brand">
              {users?.successfulLogins ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Verified Revenue Card */}
        <div className="p-5 rounded-md bg-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Revenue</span>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-ink">
              {revenue.totalRevenueUsdt}{' '}
              <span className="text-xs font-bold text-slate-500">USDT</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {revenue.confirmedPurchasesCount} verified Ad-Free upgrades
            </p>
          </div>
          <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Today: <strong className="font-mono text-ink">{revenue.revenueTodayUsdt}</strong></span>
            <span className="text-slate-500">7 Days: <strong className="font-mono text-ink">{revenue.revenueThisWeekUsdt}</strong></span>
          </div>
        </div>

        {/* Registered Users Card */}
        <div className="p-5 rounded-md bg-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            <div className="p-2 rounded-md bg-brand-500/10 text-brand">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-ink">
              {users.total}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
              <span>Today: <strong className="text-brand-600">+{users.signupsToday}</strong></span>
              <span>•</span>
              <span>This week: <strong className="text-brand-600">+{users.signupsThisWeek}</strong></span>
            </div>
          </div>
          <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Free: <strong className="text-ink">{users.free}</strong></span>
            <span className="text-slate-500">Ad-Free: <strong className="text-emerald-600 dark:text-emerald-400">{users.adFree}</strong></span>
            {users.suspended > 0 && (
              <span className="text-rose-500 font-semibold">Suspended: {users.suspended}</span>
            )}
          </div>
        </div>

        {/* Payments Status Card */}
        <div className="p-5 rounded-md bg-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Payments Breakdown</span>
            <div className="p-2 rounded-md bg-brand/10 text-brand">
              <CreditCard size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-ink">
              {payments.totalConfirmed}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              ✓ Server-verified on Polygon
            </p>
          </div>
          <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px]">
            <span className="text-amber-500 font-medium">Pending: {payments.pending}</span>
            <span className="text-slate-400">Expired: {payments.expired}</span>
            {payments.manuallyReviewed > 0 && (
              <span className="text-brand">Reviewed: {payments.manuallyReviewed}</span>
            )}
          </div>
        </div>

        {/* Web Traffic Card */}
        <div className="p-5 rounded-md bg-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Page Views (30d)</span>
            <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Globe size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-ink">
              {analytics?.totalPageViews ?? 0}
            </div>
            <p className="text-[11px] text-muted mt-1">
              From {analytics?.countriesCount ?? 0} tracked countries
            </p>
          </div>
          <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">WAU: <strong className="text-ink">{users.wau}</strong></span>
            <Link href="/admin/analytics" className="text-brand font-semibold hover:underline">
              View Analytics →
            </Link>
          </div>
        </div>
      </div>

      {/* Visual Trends Section: Registrations & Revenue (14 Days) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registration Trend */}
        <div className="p-6 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand" />
              <h3 className="text-sm font-bold text-ink">
                New Registrations Trend (Past 14 Days)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Daily signups</span>
          </div>

          {users?.registrationTrends?.length > 0 ? (
            <div className="space-y-2">
              {/* Responsive Bar Chart */}
              <div className="h-32 flex items-end gap-1.5 pt-4 pb-2 px-1">
                {users.registrationTrends.map((t: any) => {
                  const heightPercent = Math.max(6, Math.round((t.count / maxRegCount) * 100));
                  return (
                    <div
                      key={t.date}
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    >
                      <div className="w-full bg-paper rounded-t-md h-full flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-md bg-brand-500 group-hover:bg-brand-400 transition-all"
                        />
                      </div>
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 hidden group-hover:flex flex-col items-center z-10">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white whitespace-nowrap shadow-sm">
                          {t.date.slice(5)}: {t.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                <span>{users.registrationTrends[0]?.date?.slice(5)}</span>
                <span>{users.registrationTrends[users.registrationTrends.length - 1]?.date?.slice(5)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">No registration data recorded in range.</p>
          )}
        </div>

        {/* Verified Revenue Trend */}
        <div className="p-6 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-ink">
                Verified Revenue Trend (Past 14 Days)
              </h3>
            </div>
            <span className="text-[11px] text-emerald-500 font-mono font-bold">USDT (Polygon)</span>
          </div>

          {revenue?.dailyRevenueTrends?.length > 0 ? (
            <div className="space-y-2">
              {/* Responsive Bar Chart */}
              <div className="h-32 flex items-end gap-1.5 pt-4 pb-2 px-1">
                {revenue.dailyRevenueTrends.map((t: any) => {
                  const amt = parseFloat(t.amountUsdt || '0');
                  const heightPercent = maxRevAmount > 0 ? Math.max(6, Math.round((amt / maxRevAmount) * 100)) : 6;
                  return (
                    <div
                      key={t.date}
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    >
                      <div className="w-full bg-paper rounded-t-md h-full flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all ${
                            amt > 0 ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                      </div>
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 hidden group-hover:flex flex-col items-center z-10">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white whitespace-nowrap shadow-sm">
                          {t.date.slice(5)}: {t.amountUsdt} USDT
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                <span>{revenue.dailyRevenueTrends[0]?.date?.slice(5)}</span>
                <span>{revenue.dailyRevenueTrends[revenue.dailyRevenueTrends.length - 1]?.date?.slice(5)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">No revenue recorded in range.</p>
          )}
        </div>
      </div>

      {/* Traffic & Geographic Distribution Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Countries Preview */}
        <div className="p-6 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <Globe size={16} className="text-cyan-500" />
              <h3>Top Geographic Regions</h3>
            </div>
            <Link
              href="/admin/analytics"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Full Map →
            </Link>
          </div>

          {analytics?.topCountries?.length > 0 ? (
            <div className="space-y-2.5">
              {analytics.topCountries.map((c: any) => (
                <div
                  key={c.countryCode}
                  className="flex items-center justify-between p-2.5 rounded-md bg-paper text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{c.flag}</span>
                    <span className="font-medium text-ink">{c.countryName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-ink">
                      {c.uniqueVisitors} visitors
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">({c.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              No country geolocation events recorded yet.
            </p>
          )}
        </div>

        {/* Popular Pages */}
        <div className="p-6 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <FileText size={16} className="text-brand" />
              <h3>Popular Pages</h3>
            </div>
            <Link
              href="/admin/analytics"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              All Pages →
            </Link>
          </div>

          {analytics?.popularPages?.length > 0 ? (
            <div className="space-y-2.5">
              {analytics.popularPages.map((p: any) => (
                <div
                  key={p.path}
                  className="flex items-center justify-between p-2.5 rounded-md bg-paper text-xs"
                >
                  <span className="font-mono text-ink truncate max-w-[180px]">
                    {p.path}
                  </span>
                  <span className="font-mono text-muted font-semibold">
                    {p.views} views
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              No pageview records recorded yet.
            </p>
          )}
        </div>

        {/* Entitlements & Plans Status */}
        <div className="p-6 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <Layers size={16} className="text-brand" />
              <h3>Entitlement Status</h3>
            </div>
            <Link
              href="/admin/plans"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Manage Plans →
            </Link>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-md bg-paper flex items-center justify-between">
              <div>
                <div className="font-bold text-ink">Free Plan</div>
                <div className="text-[11px] text-slate-400">Ad-supported (Monetag zone 289364)</div>
              </div>
              <span className="font-mono text-base font-bold text-ink">
                {users.free}
              </span>
            </div>

            <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400">Ad-Free Entitlement</div>
                <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">Lifetime Ad-Suppression</div>
              </div>
              <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                {users.adFree}
              </span>
            </div>

            <div className="p-3 rounded-md bg-paper flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">Expired Entitlements</div>
                <div className="text-[11px] text-slate-400">Lifetime access model</div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400">
                0 Expired
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
