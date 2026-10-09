'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Key,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export function AdminSetupForm() {
  const router = useRouter();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [requiresSetupKey, setRequiresSetupKey] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/admin/bootstrap');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Administrator setup service is currently unavailable.');
          return;
        }
        setIsSetup(!!data.isSetup);
        setRequiresSetupKey(!!data.requiresSetupKey);
      } catch {
        setError('Failed to reach administrator setup service.');
      } finally {
        setLoadingStatus(false);
      }
    }
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid administrator email address.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (requiresSetupKey && !setupKey) {
      setError('Administrator setup key is required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          setupKey: setupKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Administrator setup failed.');
      }

      setSuccess(
        data.message ||
          'First administrator initialized successfully! You can now sign in with the credentials you supplied.'
      );
      setIsSetup(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during setup.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4">
        <Loader2 size={28} className="animate-spin text-brand-600 mx-auto" />
        <p className="text-xs text-slate-500">Checking administrator setup status...</p>
      </div>
    );
  }

  // If already setup and no success message from this current session
  if (isSetup && !success) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Setup Locked</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            An administrator account has already been initialized for this DocuNexa instance. First-time setup is permanently locked for security.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <Link
            href="/login?redirect=/admin"
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            Sign In with Admin Credentials <ArrowRight size={14} />
          </Link>
          <Link
            href="/"
            className="inline-block text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors pt-2"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Initialized</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {success}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5">
          <div className="text-slate-500">Sign in with:</div>
          <div className="font-semibold text-slate-900 dark:text-white">Email: {email}</div>
          <div className="text-slate-500 text-[11px]">Password: The password you provided during setup</div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/login?redirect=/admin"
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            Go to Admin Sign In <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <DocuNexaLogo size="md" />
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-[10px] font-bold uppercase tracking-wider mt-3">
          <ShieldCheck size={12} /> Initial Setup
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Initialize Administrator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Create the first administrator account for DocuNexa. This interface will permanently lock once complete.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="admin-email"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Admin Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={16} />
            </div>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Admin Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={16} />
            </div>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-confirm-password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Confirm Admin Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={16} />
            </div>
            <input
              id="admin-confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>
        </div>

        {requiresSetupKey && (
          <div>
            <label
              htmlFor="admin-setup-key"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Setup Master Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key size={16} />
              </div>
              <input
                id="admin-setup-key"
                type="password"
                required
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                placeholder="ADMIN_SETUP_KEY"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>Security Note:</strong> Passwords are never stored in plaintext and are securely handled exclusively by Supabase Auth.
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold text-sm transition-all shadow-md shadow-brand-500/20 hover:shadow-brand-500/35 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Initializing...
            </>
          ) : (
            <>
              Initialize First Administrator <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
