'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import {
  AlertCircle,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'verify' | 'new_password'>('verify');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryEmail = searchParams.get('email');
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [searchParams]);

  // Handle Step 1: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid account email.');
      return;
    }

    if (!/^\d{4}[A-Z]{2}$/.test(cleanCode)) {
      setError('Recovery code must be exactly 4 digits followed by 2 letters (e.g. 4827AB).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify recovery code.');
      }

      setResetToken(data.resetToken);
      setStep('new_password');
    } catch (err: any) {
      setError(err.message || 'Error verifying recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Confirm New Password
  const handleConfirmPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!resetToken) {
      setError('Authorization expired. Please re-verify your code.');
      setStep('verify');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      // Requirement 10: Redirect to /login and show success message
      router.push('/login?reset=success');
    } catch (err: any) {
      setError(err.message || 'Error resetting password.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-md p-6 sm:p-8 shadow-subtle space-y-6 text-ink">
      <div className="flex flex-col items-center text-center space-y-2">
        <DocuNexaLogo size="md" />
        <h1 className="text-2xl font-serif font-bold tracking-tight text-ink mt-4">
          {step === 'verify' ? 'Reset Your Password' : 'Create New Password'}
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          {step === 'verify'
            ? 'Enter your email and the 6-character recovery code sent to your inbox.'
            : 'Enter a strong new password for your account.'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 'verify' ? (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label
              htmlFor="reset-email"
              className="block text-xs font-semibold text-ink mb-1.5"
            >
              Account Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Mail size={16} />
              </div>
              <input
                id="reset-email"
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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="reset-code"
                className="block text-xs font-semibold text-ink"
              >
                6-Character Recovery Code
              </label>
              <span className="text-[11px] text-muted">e.g. 4827AB</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <KeyRound size={16} />
              </div>
              <input
                id="reset-code"
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="4827AB"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-md border border-border bg-paper text-base font-mono tracking-widest text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors uppercase"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Format: 4 digits + 2 uppercase letters. Valid for 10 minutes (5 attempts max).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying Code...
              </>
            ) : (
              <>
                Verify Code <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="text-center pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-brand hover:underline"
            >
              Need a new code? Request reset
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleConfirmPassword} className="space-y-4">
          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={16} className="shrink-0" />
            <span>Code verified. Please set your new password.</span>
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold text-ink mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock size={16} />
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-10 py-2.5 rounded-md border border-border bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-semibold text-ink mb-1.5"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Lock size={16} />
              </div>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
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
                <Loader2 size={16} className="animate-spin" /> Updating Password...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Save New Password
              </>
            )}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-border text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
