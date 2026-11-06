'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';

interface ProcessingProgressProps {
  isProcessing?: boolean;
  progress: number; // 0 - 100
  title?: string;
  subtitle?: string;
  statusText?: string;
  onCancel?: () => void;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  isProcessing = true,
  progress,
  title = 'Processing your document...',
  subtitle = 'Applying high-precision in-browser modifications...',
  statusText,
  onCancel,
}) => {
  if (!isProcessing) return null;

  const displayTitle = statusText || title;

  return (
    <div className="w-full p-6 rounded-md bg-surface border border-border shadow-subtle space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand flex items-center justify-center">
            <Loader2 size={20} className="animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">{displayTitle}</h4>
            <p className="text-xs text-ink">{subtitle}</p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-surface transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 rounded-full bg-paper overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-muted">
          <span>Processing client-side</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};
