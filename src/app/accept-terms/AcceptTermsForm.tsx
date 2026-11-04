'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface AcceptTermsFormProps {
  userEmail: string;
}

export function AcceptTermsForm({ userEmail }: AcceptTermsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/account';

  // Explicitly unchecked by default (fail-closed)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted || !privacyAccepted) {
      setError('Please review and check both boxes to agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          termsAccepted: true,
          privacyAccepted: true,
          termsVersion: '2026.11',
          privacyVersion: '2026.11',
          redirect: redirectTarget,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to record your acceptance. Please try again.');
      }

      // Success: grant normal access and redirect
      router.push(data.redirect || redirectTarget);
      router.refresh();
    } catch (err: any) {
      // Recoverable error: keep restricted access, display message, allow user to retry
      setError(err.message || 'An error occurred while recording your acceptance. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm animate-in fade-in"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">Action Required</p>
            <p className="text-xs mt-0.5 text-rose-600/90 dark:text-rose-400/90">{error}</p>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
        <p className="font-medium text-slate-800 dark:text-slate-200">
          Signed in as: <span className="font-mono text-slate-900 dark:text-white">{userEmail}</span>
        </p>
        <p>
          DocuNexa has updated its international legal policies to version <strong>2026.11</strong> to provide
          comprehensive zero-upload document protections, GDPR/CCPA disclosures, and transparent service terms.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        {/* Terms of Service Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors">
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            I have read, understood, and agree to the{' '}
            <Link
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 dark:text-brand-400 underline font-medium hover:text-brand-700 dark:hover:text-brand-300"
            >
              DocuNexa Terms of Service
            </Link>{' '}
            (Version 2026.11), including client-side processing terms and user document ownership guarantees.
          </span>
        </label>

        {/* Privacy Policy Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors">
          <input
            type="checkbox"
            id="privacy-checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            I have read and agree to the{' '}
            <Link
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 dark:text-brand-400 underline font-medium hover:text-brand-700 dark:hover:text-brand-300"
            >
              DocuNexa Privacy Policy
            </Link>{' '}
            (Version 2026.11), including in-browser data isolation and international compliance rights.
          </span>
        </label>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || !termsAccepted || !privacyAccepted}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Recording Acceptance...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Accept and Continue
              <ArrowRight size={14} className="ml-1" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

