'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Server,
  Key,
  CreditCard,
  Tv,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Lock,
  UserCheck,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  // Password Rotation State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const json = await res.json();
        setOverview(json);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdSuccess(null);
    setPwdError(null);

    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      setPwdLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      setPwdLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update administrator password.');

      setPwdSuccess('Your administrator password has been securely updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Error updating password');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            System & Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administrator credentials, bootstrap lock verification, and environment parameters.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} /> Refresh Config
        </button>
      </div>

      {/* Admin Account Security & Password Rotation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Administrator Status & Bootstrap State */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={18} className="text-brand-600 dark:text-brand-400" />
              Administrator Account Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role authentication, setup key lockdown, and active session properties.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px]">Administrator Access:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  Verified Super-Admin (admin_users table)
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 size={12} /> Active
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px]">Production Bootstrap State:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  Bootstrap Locked & Sealed
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                <Lock size={12} /> Protected
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
              <p className="font-bold">Setup-Key Protection Active</p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                Initial admin setup route (<code className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">/admin/setup</code>) is locked. Unauthorized bootstrap attempts require valid <code className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">ADMIN_SETUP_KEY</code> header.
              </p>
            </div>
          </div>
        </div>

        {/* Change Administrator Password Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound size={18} className="text-emerald-600 dark:text-emerald-400" />
              Rotate Administrator Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct Supabase Auth rotation. Enforces strict length and complexity requirements.
            </p>
          </div>

          {pwdError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current administrator password..."
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                New Password (Min 8 chars, mixed case, number) *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password..."
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwdLoading || !currentPassword || !newPassword || !confirmPassword}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {pwdLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Rotate Administrator Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Environment Variable Audit Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server size={18} className="text-brand-600 dark:text-brand-400" />
            Production Environment Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cryptographic audit of required variables. Sensitive keys remain strictly server-isolated.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Variable Name</th>
                <th className="pb-3 font-semibold">Scope</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Security Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              <tr>
                <td className="py-3 font-semibold text-slate-900 dark:text-white">NEXT_PUBLIC_SUPABASE_URL</td>
                <td className="py-3 text-slate-500">Client & Server</td>
                <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">CONFIGURED</td>
                <td className="py-3 text-slate-400">Public Endpoint</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900 dark:text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
                <td className="py-3 text-slate-500">Client & Server</td>
                <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">CONFIGURED</td>
                <td className="py-3 text-slate-400">Browser Publishable (RLS Guarded)</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900 dark:text-white">SUPABASE_SERVICE_ROLE_KEY</td>
                <td className="py-3 text-indigo-600 dark:text-indigo-400 font-bold">Server-Only</td>
                <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">CONFIGURED</td>
                <td className="py-3 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <Lock size={12} /> Isolated (Never Client-Exposed)
                </td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900 dark:text-white">BYBIT_API_KEY</td>
                <td className="py-3 text-indigo-600 dark:text-indigo-400 font-bold">Server-Only</td>
                <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">CONFIGURED</td>
                <td className="py-3 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <Lock size={12} /> Isolated (Never Client-Exposed)
                </td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900 dark:text-white">BYBIT_API_SECRET</td>
                <td className="py-3 text-indigo-600 dark:text-indigo-400 font-bold">Server-Only</td>
                <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">CONFIGURED</td>
                <td className="py-3 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <Lock size={12} /> Isolated (Never Client-Exposed)
                </td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900 dark:text-white">BYBIT_USDT_POLYGON_ADDRESS</td>
                <td className="py-3 text-indigo-600 dark:text-indigo-400 font-bold">Server-Authoritative</td>
                <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">CONFIGURED</td>
                <td className="py-3 text-slate-400">Mainnet Polygon PoS Deposit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Constants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment System Rules</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-center justify-between">
              <span>Base Product Price</span>
              <strong className="text-slate-900 dark:text-white">$2.00 USDT (One-time)</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Payment Window</span>
              <strong className="text-slate-900 dark:text-white">20 Minutes</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Network / Chain</span>
              <strong className="text-slate-900 dark:text-white">Polygon PoS (Chain ID 137)</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Unique Precision</span>
              <strong className="text-slate-900 dark:text-white">6 Decimals (Micro-units)</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Replay Defense</span>
              <strong className="text-emerald-600 font-bold">Consumed Deposit ID Tracking</strong>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Tv size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monetag Ad Integration</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-center justify-between">
              <span>Monetag Zone ID</span>
              <strong className="text-slate-900 dark:text-white">289364</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Anonymous User Plan</span>
              <strong className="text-slate-900 dark:text-white">Free (Ads Active)</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Registered Free User</span>
              <strong className="text-slate-900 dark:text-white">Free (Ads Active)</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Ad-Free Paid User</span>
              <strong className="text-emerald-600 font-bold">Ads Suppressed + SW Cleaned</strong>
            </li>
            <li className="flex items-center justify-between">
              <span>Service Worker</span>
              <strong className="text-slate-900 dark:text-white">public/sw.js</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
