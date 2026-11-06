'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export function CopyPageLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopyLink}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-slate-300 dark:hover:border-slate-700 text-ink font-medium transition-all cursor-pointer"
      title="Copy page link"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
      <span>{copied ? 'Link Copied' : 'Share'}</span>
    </button>
  );
}

