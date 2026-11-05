'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Lock,
  Unlock,
  KeyRound,
  Mail,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { LockedAccountRecord } from '@/lib/auth/loginSecurity';

export function LockedAccountsConsole() {
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLockedAccounts = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/security/locked-accounts');
      if (!res.ok) throw new Error('Failed to fetch locked accounts');
      const data = await res.json();
      setLockedAccounts(data.lockedAccounts || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error loading locked accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockedAccounts();
  }, []);

  const handleAction = async (action: 'unlock' | 'trigger_reset', email: string) => {
    setActionLoadingEmail(email);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/security/locked-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          email,
          reason: action === 'trigger_reset'
            ? 'Administrator assisted recovery: dispatched secure password reset'
            : 'Administrator verified customer identity: manual account unlock',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setFeedback({ type: 'success', text: data.message || 'Action executed successfully.' });
      await fetchLockedAccounts();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to execute recovery action.' });
    } finally {
      setActionLoadingEmail(null);
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-amber-500" size={20} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Account Lockout &amp; Recovery Console
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              5-Attempt Shield
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accounts locked after 5 consecutive failed login attempts. Verify customer identity before initiating recovery.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLockedAccounts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center space-y-2">
          <Loader2 className="animate-spin text-brand-500 mx-auto" size={20} />
          <p className="text-xs text-slate-400">Inspecting locked account records...</p>
        </div>
      ) : lockedAccounts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
          <ShieldCheck className="text-emerald-500 mx-auto" size={24} />
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Zero Locked Accounts
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 max-w-md mx-auto">
            All user accounts are in good standing. No accounts currently require administrator-assisted lockout recovery.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Customer Email</th>
                <th className="py-2.5 px-3 text-center">Failed Attempts</th>
                <th className="py-2.5 px-3">Lockout Timestamp</th>
                <th className="py-2.5 px-3">Originating IP</th>
                <th className="py-2.5 px-3 text-right">Recovery Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lockedAccounts.map((account) => {
                const isOperating = actionLoadingEmail === account.email;

                return (
                  <tr key={account.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Lock size={12} className="text-amber-500" />
                        <span>{account.email}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{account.lockedReason || 'Locked'}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                        {account.failedAttempts} / 5
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {account.lockedAt ? new Date(account.lockedAt).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                      {account.lastIp || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAction('trigger_reset', account.email)}
                        disabled={isOperating}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                        title="Dispatches secure password reset instructions directly to customer email"
                      >
                        {isOperating ? <Loader2 size={10} className="animate-spin" /> : <KeyRound size={10} />}
                        <span>Send Reset Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction('unlock', account.email)}
                        disabled={isOperating}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                        title="Unlocks account and clears consecutive failure counter"
                      >
                        <Unlock size={10} />
                        <span>Unlock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

