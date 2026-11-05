'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export function SignupForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!termsAccepted) {
      setError('You must read and agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          termsAccepted: true,
          termsVersion: '2026.11',
          privacyAccepted: true,
          privacyVersion: '2026.11',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      // Refresh session client-side and redirect directly to /choose-plan
      await refreshUser();
      router.push(data.redirect || '/choose-plan');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-md p-6 sm:p-8 shadow-subtle space-y-6 text-ink">
      <div className="flex flex-col items-center text-center space-y-2">
        <DocuNexaLogo size="md" />
        <h1 className="text-2xl font-serif font-bold tracking-tight text-ink mt-4">
          Create Your Account
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Sign up to choose between our free ad-supported plan or $2 ad-free upgrade.
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
            htmlFor="signup-email"
            className="block text-xs font-semibold text-ink mb-1.5"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Mail size={16} />
            </div>
            <input
              id="signup-email"
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
          <label
            htmlFor="signup-password"
            className="block text-xs font-semibold text-ink mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Lock size={16} />
            </div>
            <input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-md border border-border bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
            />
          </div>
          <p className="text-[11px] text-muted mt-1">
            Minimum 8 characters with at least one letter and one number.
          </p>
        </div>

        <div>
          <label
            htmlFor="signup-confirm-password"
            className="block text-xs font-semibold text-ink mb-1.5"
          >
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Lock size={16} />
            </div>
            <input
              id="signup-confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-md border border-border bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
            />
          </div>
        </div>

        {/* Visible, non-preselected legal acceptance checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="accept-terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border text-brand focus:ring-brand cursor-pointer"
          />
          <label htmlFor="accept-terms" className="text-xs text-muted leading-relaxed cursor-pointer select-none">
            I have read and agree to the{' '}
            <Link href="/terms-of-service" target="_blank" className="font-semibold text-brand hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" target="_blank" className="font-semibold text-brand hover:underline">
              Privacy Policy
            </Link>{' '}
            (v2026.11).
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating Account...
            </>
          ) : (
            <>
              Create Account <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 border-t border-border text-center space-y-2">
        <p className="text-xs text-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            Log in
          </Link>
        </p>
        <p className="text-[11px] text-muted">
          Want to use tools without an account?{' '}
          <Link href="/tools" className="hover:underline text-ink">
            Open PDF Tools directly
          </Link>
        </p>
      </div>
    </div>
  );
}
