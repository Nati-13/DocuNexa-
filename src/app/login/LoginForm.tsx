'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Send,
  KeyRound,
} from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unconfirmed email resend state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Success message (e.g. from password reset or confirmation)
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 5-Attempt Account Lockout State
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutData, setLockoutData] = useState<{
    supportEmail?: string;
    telegramBotUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessNotice('Your password has been reset successfully. You can now sign in.');
    } else if (searchParams.get('confirmed') === 'true') {
      setSuccessNotice('Email address confirmed successfully! Please sign in to continue.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    setResendStatus(null);

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ACCOUNT_LOCKED' || data.isLocked) {
          setIsLocked(true);
          setLockoutData({
            supportEmail: data.supportEmail || 'docunexa.security@gmail.com',
            telegramBotUrl: data.telegramBotUrl || 'https://t.me/docunexa_bot',
          });
          setLoading(false);
          return;
        }
        if (data.needsEmailConfirmation || (data.error && data.error.includes('confirm your email'))) {
          setNeedsConfirmation(true);
        }
        throw new Error(data.error || 'Invalid email or password.');
      }

      await refreshUser();
      const redirectTarget = data.needsConsent
        ? '/accept-terms'
        : (data.redirect || searchParams.get('redirect') || '/account');
      router.push(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please provide your email address to resend confirmation.');
      return;
    }
    setResending(true);
    setResendStatus(null);
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to resend confirmation email. Please wait a moment and try again.');
      }
      setResendStatus({
        type: 'success',
        message: data.message || 'If an unconfirmed account exists for this email, a confirmation link has been sent.',
      });
    } catch (err: any) {
      setResendStatus({
        type: 'error',
        message: err.message || 'Unable to resend confirmation email. Please wait a moment and try again.',
      });
    } finally {
      setResending(false);
    }
  };

  if (isLocked) {
    return (
      <div className="w-full max-w-md w-full max-w-md bg-surface border border-border rounded-md p-6 sm:p-8 shadow-subtle space-y-6 text-center text-ink">
        <div className="w-14 h-14 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-ink">
            Account Locked for Security
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            For your security, access for <strong className="text-ink">{email}</strong> has been temporarily suspended after 5 consecutive unsuccessful login attempts.
          </p>
        </div>

        <div className="p-4 rounded-md bg-paper border border-border text-left space-y-3 text-xs">
          <div className="font-semibold text-ink flex items-center gap-1.5">
            <Lock size={14} className="text-amber-600 dark:text-amber-400" />
            Administrator-Assisted Recovery
          </div>
          <p className="text-muted text-[11px] leading-relaxed">
            DocuNexa protects your private documents from unauthorized brute-force attempts. To regain access, you may request a secure reset or contact our security team:
          </p>
          <div className="space-y-2 pt-1">
            <a
              href={`mailto:${lockoutData?.supportEmail || 'docunexa.security@gmail.com'}?subject=Account%20Recovery%20Request%20-%20DocuNexa&body=Hello%20DocuNexa%20Security,%0A%0AMy%20account%20(${encodeURIComponent(email)})%20was%20locked%20due%20to%20failed%20login%20attempts.%20Please%20assist%20me%20in%20verifying%20and%20recovering%20access.`}
              className="flex items-center justify-between p-2.5 rounded-md bg-surface border border-border hover:border-brand text-ink font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <Mail size={14} className="text-brand" />
                <span>Email Security Team</span>
              </span>
              <span className="text-[10px] text-muted font-mono">{lockoutData?.supportEmail || 'docunexa.security@gmail.com'}</span>
            </a>

            <a
              href={lockoutData?.telegramBotUrl || 'https://t.me/docunexa_bot'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-md bg-surface border border-border hover:border-brand text-ink font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <Send size={14} className="text-brand" />
                <span>Telegram Support Bot</span>
              </span>
              <span className="text-[10px] text-muted font-mono">@docunexa_bot</span>
            </a>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href={`/forgot-password?email=${encodeURIComponent(email)}`}
            className="w-full py-2.5 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={14} />
            <span>Request Password Reset</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsLocked(false);
              setPassword('');
              setError(null);
            }}
            className="w-full py-2 px-4 rounded-md border border-border text-muted hover:text-ink hover:bg-paper font-medium text-xs transition-colors cursor-pointer"
          >
            Try another email address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-md p-6 sm:p-8 shadow-subtle space-y-6 text-ink">
      <div className="flex flex-col items-center text-center space-y-2">
        <DocuNexaLogo size="md" />
        <h1 className="text-2xl font-serif font-bold tracking-tight text-ink mt-4">
          Welcome Back
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Sign in to your DocuNexa account to view your entitlement and tools.
        </p>
      </div>

      {successNotice && (
        <div
          role="status"
          className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs text-rose-700 dark:text-rose-300"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>

          {needsConfirmation && (
            <div className="pt-2 border-t border-rose-500/20">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="w-full py-1.5 px-3 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 dark:text-rose-200 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} /> Resend confirmation email
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {resendStatus && (
        <div
          role={resendStatus.type === 'error' ? 'alert' : 'status'}
          className={`p-3.5 rounded-md flex items-start gap-2.5 text-xs ${
            resendStatus.type === 'error'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {resendStatus.type === 'error' ? (
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          )}
          <span>{resendStatus.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-ink mb-1.5"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Mail size={16} />
            </div>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-md border border-border bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-ink"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Lock size={16} />
            </div>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-md border border-border bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Signing In...
            </>
          ) : (
            <>
              Sign In <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 border-t border-border text-center space-y-2">
        <p className="text-xs text-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand hover:underline"
          >
            Create an account
          </Link>
        </p>
        <p className="text-[11px] text-muted">
          Want to use tools without signing in?{' '}
          <Link href="/tools" className="hover:underline text-ink">
            Open PDF Tools directly
          </Link>
        </p>
      </div>
    </div>
  );
}
