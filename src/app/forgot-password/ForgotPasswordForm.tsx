'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import {
  AlertCircle,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit password reset request.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Error requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md bg-surface border border-border rounded-md p-6 sm:p-8 shadow-subtle space-y-6 text-center text-ink">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-ink mt-2">
            Reset Code Sent
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-sm">
            If an account exists for <strong className="text-ink">{email}</strong>, we&apos;ve sent a password reset code.
          </p>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          The code consists of <strong>4 digits and 2 uppercase letters</strong> (e.g. <code>4827AB</code>) and expires in 10 minutes.
        </p>

        <div className="space-y-3 pt-2 border-t border-border">
          <button
            onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
            className="w-full py-3 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Enter Recovery Code <ArrowRight size={14} />
          </button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors pt-1"
          >
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-md p-6 sm:p-8 shadow-subtle space-y-6 text-ink">
      <div className="flex flex-col items-center text-center space-y-2">
        <DocuNexaLogo size="md" />
        <h1 className="text-2xl font-serif font-bold tracking-tight text-ink mt-4">
          Forgot Password
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Enter your account email address and we&apos;ll send a 6-character recovery code.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-xs font-semibold text-ink mb-1.5"
          >
            Account Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Mail size={16} />
            </div>
            <input
              id="forgot-email"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Sending Code...
            </>
          ) : (
            <>
              Send Password Reset Code <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

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
