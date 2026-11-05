'use client';

import React from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { CutProgressState } from '@/types';

interface ProgressModalProps {
  progressState: CutProgressState;
  onCancel: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  progressState,
  onCancel,
}) => {
  if (!progressState.isCutting) return null;

  const total = progressState.total || 1;
  const overallPercentage = Math.round((progressState.completedCount / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-in fade-in duration-150">
      <div className="bg-surface rounded-md border border-border text-ink max-w-lg w-full p-6 space-y-6 shadow-subtle">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-paper border border-border flex items-center justify-center text-brand">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-ink text-base">Preparing Lossless PDFs...</h3>
              <p className="text-xs text-muted">
                {progressState.completedCount} of {progressState.total} files completed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-accent hover:bg-paper border border-border transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Cancel
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-ink">
            <span>Overall Progress</span>
            <span className="font-mono text-brand">{overallPercentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-paper rounded-full overflow-hidden p-0.5 border border-border">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-border">
          {progressState.items.map((item) => (
            <div key={item.id} className="pt-2 first:pt-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-ink truncate max-w-[260px]">
                  {item.filename}
                </span>

                <div className="flex items-center space-x-1.5">
                  {item.status === 'done' && (
                    <span className="text-brand flex items-center font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="text-brand font-mono font-semibold text-[11px]">
                      {item.progress}%
                    </span>
                  )}
                  {item.status === 'waiting' && (
                    <span className="text-muted flex items-center text-[11px]">
                      <Clock className="w-3 h-3 mr-1" /> waiting...
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-accent flex items-center text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" /> Error
                    </span>
                  )}
                </div>
              </div>

              {/* Individual Bar */}
              <div className="w-full h-1.5 bg-paper rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full transition-all duration-200 ${
                    item.status === 'done'
                      ? 'bg-brand'
                      : item.status === 'processing'
                      ? 'bg-brand animate-pulse'
                      : item.status === 'error'
                      ? 'bg-accent'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted text-center">
          Extracting raw page vectors and media directly. No rasterization or quality reduction.
        </p>
      </div>
    </div>
  );
};
