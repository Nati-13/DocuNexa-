'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Runtime Error]:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-surface p-8 rounded-md border border-border shadow-subtle text-ink">
        <div className="w-14 h-14 mx-auto rounded-md bg-paper text-accent flex items-center justify-center">
          <AlertCircle size={30} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="text-sm text-muted leading-relaxed">
            An unexpected client-side error occurred. Your documents and data remain private and secure on your device.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg text-sm font-semibold shadow-subtle transition-colors cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-surface hover:bg-paper border border-border text-ink text-sm font-medium transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
