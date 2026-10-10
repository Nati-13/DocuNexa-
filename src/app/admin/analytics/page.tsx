'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Users,
  Eye,
  Activity,
  UserCheck,
  UserPlus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  TrendingUp,
  MapPin,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch analytics');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="animate-spin text-brand-600 dark:text-brand-400" size={32} />
        <p className="text-xs text-slate-500">Aggregating privacy-preserving analytics...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertTriangle className="mx-auto text-rose-500" size={32} />
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Error Loading Analytics</h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    totalPageViews = 0,
    uniqueVisitors = 0,
    activeVisitorsLast15m = 0,
    successfulLogins = 0,
    signups = 0,
    countries = [],
    popularPages = [],
    dailyTrends = [],
  } = data || {};

  const maxViewsInTrend = Math.max(1, ...dailyTrends.map((t: any) => t.pageViews));

  return (
    <div className="space-y-8">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Country-Level Analytics & Traffic
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Privacy-preserving geolocation metrics, unique visitors, page views, and conversion activity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Date Range Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  range === r
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === '7d' && '7 Days'}
                {r === '30d' && '30 Days'}
                {r === '90d' && '90 Days'}
                {r === 'all' && 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Page Views</span>
            <Eye size={14} className="text-brand-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {totalPageViews}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Unique Visitors</span>
            <Users size={14} className="text-cyan-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {uniqueVisitors}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Now</span>
            <Activity size={14} className="text-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {activeVisitorsLast15m}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Countries</span>
            <Globe size={14} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {countries.length}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Logins</span>
            <UserCheck size={14} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {successfulLogins}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Signups</span>
            <UserPlus size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {signups}
          </div>
        </div>
      </div>

      {/* Visual Top Country Cards Grid */}
      {countries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Primary Regional Origins
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {countries.slice(0, 4).map((c: any) => (
              <div
                key={c.countryCode}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{c.flag}</span>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {c.countryName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        ISO: {c.countryCode}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-[10px]">
                    {c.percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400">Visitors:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {c.uniqueVisitors}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Page Views:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {c.pageViews}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Ranking Table & Traffic Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Ranking Table (2 cols on lg) */}
        <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Country Traffic Ranking
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Sorted by Page Views
            </span>
          </div>

          {countries.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              No country traffic events recorded for this time range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="pb-3 px-2 w-10">#</th>
                    <th className="pb-3 px-2">Country / Region</th>
                    <th className="pb-3 px-2">Unique Visitors</th>
                    <th className="pb-3 px-2">Page Views</th>
                    <th className="pb-3 px-2 w-36">Traffic Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                  {countries.map((c: any, idx: number) => (
                    <tr key={c.countryCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-2 font-mono text-slate-400 text-[11px] font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {c.countryName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 ml-1.5 uppercase">
                              [{c.countryCode}]
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono font-semibold text-slate-900 dark:text-white">
                        {c.uniqueVisitors}
                      </td>
                      <td className="py-3 px-2 font-mono font-semibold text-slate-900 dark:text-white">
                        {c.pageViews}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${Math.max(2, c.percentage)}%` }}
                              className="h-full rounded-full bg-brand-500"
                            />
                          </div>
                          <span className="font-mono font-bold text-[10px] text-slate-500 w-8 text-right">
                            {c.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Popular Pages & Conversion Activity */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-cyan-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Popular Site Paths
              </h3>
            </div>

            {popularPages.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No page traffic recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {popularPages.map((p: any) => (
                  <div key={p.path} className="py-2.5 flex items-center justify-between">
                    <span className="font-mono text-slate-900 dark:text-white truncate max-w-[170px]">
                      {p.path}
                    </span>
                    <div className="text-right font-mono text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-white">{p.views} views</span>
                      <span className="text-slate-400 ml-1.5">({p.uniqueVisitors} users)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Guarantee Card */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck size={16} />
              <h4>Privacy-Preserving Telemetry</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              DocuNexa strictly avoids retaining raw client IP addresses. Geolocation is resolved via trusted edge headers (<code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">x-vercel-ip-country</code>). Visitor identifiers are pseudonymized with daily rotating cryptographic salt hashes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
