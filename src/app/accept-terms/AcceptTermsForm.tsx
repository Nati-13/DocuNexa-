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
          className="p-3.5 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">Action Required</p>
            <p className="text-xs mt-0.5 text-rose-600/90 dark:text-rose-400/90">{error}</p>
          </div>
        </div>
      )}

      <div className="p-4 rounded-md bg-paper border border-border text-xs text-muted space-y-1.5">
        <p className="font-medium text-ink">
          Signed in as: <span className="font-mono text-ink">{userEmail}</span>
        </p>
        <p>
          DocuNexa has updated its international legal policies to version <strong>2026.11</strong> to provide
          comprehensive zero-upload document protections, GDPR/CCPA disclosures, and transparent service terms.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        {/* Terms of Service Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-md border border-border hover:bg-paper/80 cursor-pointer transition-colors">
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-border text-brand focus:ring-brand cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs text-ink leading-relaxed">
            I have read, understood, and agree to the{' '}
            <Link
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline font-medium hover:underline"
            >
              DocuNexa Terms of Service
            </Link>{' '}
            (Version 2026.11), including client-side processing terms and user document ownership guarantees.
          </span>
        </label>

        {/* Privacy Policy Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-md border border-border hover:bg-paper/80 cursor-pointer transition-colors">
          <input
            type="checkbox"
            id="privacy-checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-border text-brand focus:ring-brand cursor-pointer disabled:opacity-50"
          />
          <span className="text-xs text-ink leading-relaxed">
            I have read and agree to the{' '}
            <Link
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline font-medium hover:underline"
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
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md text-xs font-semibold text-brand-fg bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

