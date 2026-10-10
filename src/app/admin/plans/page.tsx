'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Users,
  ShieldCheck,
  CheckCircle2,
  Tv,
  DollarSign,
  Zap,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

export default function AdminPlansPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/overview');
      if (!res.ok) throw new Error('Failed to load plan metrics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching plan overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="animate-spin text-brand-600 dark:text-brand-400" size={32} />
        <p className="text-xs text-slate-500">Loading plan architectures...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertTriangle className="mx-auto text-rose-500" size={32} />
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Error Loading Plans</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button
          onClick={fetchPlanStats}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const freeCount = data?.users?.free ?? 0;
  const adFreeCount = data?.users?.adFree ?? 0;
  const totalCount = data?.users?.total ?? 0;
  const adFreePct = totalCount > 0 ? Math.round((adFreeCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plan Architecture & Entitlements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative breakdown of active user tiers, ad-suppression rules, and entitlement policies.
          </p>
        </div>

        <button
          onClick={fetchPlanStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Default Tier
              </span>
              <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Users size={20} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Free Plan</h2>
              <div className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {freeCount}{' '}
                <span className="text-xs font-normal text-slate-400">registered users</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ad-supported access for anonymous visitors and standard registered users.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Tv size={14} className="text-amber-500" />
                <span>Monetag In-Page Push & Banner Ads (Zone 289364)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Full access to 5-Step PDF Unit & Section Cutter</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Client-side WebAssembly PDF processing (Private & local)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Zero recurring costs ($0.00)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/admin/users?plan=free"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white transition-colors"
            >
              Filter Free Users in Management <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Ad-Free Plan Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent dark:from-emerald-500/10 bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Premium Entitlement ({adFreePct}% of users)
              </span>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Zap size={20} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ad-Free Plan</h2>
              <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {adFreeCount}{' '}
                <span className="text-xs font-normal text-slate-400">upgraded users</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verified lifetime entitlement: zero ads, full privacy, and priority operations.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={14} />
                <span>100% Ad Suppression (Monetag completely neutralized)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Service worker ad script unregistration & cache purge</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>One-time payment: $2.00 USDT on Polygon PoS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Lifetime entitlement validity (Never expires)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/admin/users?plan=ad_free"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              Filter Ad-Free Users in Management <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Entitlement Architecture Comparison Matrix */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck size={18} className="text-brand-500" />
          Plan Entitlement Matrix & Enforcement
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="pb-3 px-3">Feature / Entitlement</th>
                <th className="pb-3 px-3">Free Tier</th>
                <th className="pb-3 px-3">Ad-Free Tier</th>
                <th className="pb-3 px-3">Server Enforcement Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Monetag Ads</td>
                <td className="py-3 px-3 text-amber-500 font-bold">Active (Zone 289364)</td>
                <td className="py-3 px-3 text-emerald-500 font-bold">Suppressed ✓</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">Guarded by user session plan state</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Service Worker Cache</td>
                <td className="py-3 px-3">Retains ad worker</td>
                <td className="py-3 px-3 text-emerald-500 font-bold">Auto-Purged on Login</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">public/sw.js unregistration trigger</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">PDF Processing Speed</td>
                <td className="py-3 px-3">Standard Wasm</td>
                <td className="py-3 px-3 text-indigo-500 font-semibold">Max Client Wasm Speed</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">Client-side pdf-lib execution</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Entitlement Duration</td>
                <td className="py-3 px-3">Indefinite Free</td>
                <td className="py-3 px-3 text-emerald-500 font-bold">Lifetime (0 Expired)</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">Permanent profile plan attribution</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Manual Admin Control</td>
                <td className="py-3 px-3">Default</td>
                <td className="py-3 px-3">Grant / Revoke with Audit</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">Requires documented audit justification</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
