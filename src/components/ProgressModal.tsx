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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Preparing Lossless PDFs...</h3>
              <p className="text-xs text-slate-500">
                {progressState.completedCount} of {progressState.total} files completed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Cancel
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>Overall Progress</span>
            <span className="font-mono text-indigo-600">{overallPercentage}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
          {progressState.items.map((item, idx) => (
            <div key={item.id} className="pt-2 first:pt-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-800 truncate max-w-[260px]">
                  {item.filename}
                </span>

                <div className="flex items-center space-x-1.5">
                  {item.status === 'done' && (
                    <span className="text-emerald-600 flex items-center font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="text-indigo-600 font-mono font-semibold text-[11px]">
                      {item.progress}%
                    </span>
                  )}
                  {item.status === 'waiting' && (
                    <span className="text-slate-400 flex items-center text-[11px]">
                      <Clock className="w-3 h-3 mr-1" /> waiting...
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-red-600 flex items-center text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" /> Error
                    </span>
                  )}
                </div>
              </div>

              {/* Individual Bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    item.status === 'done'
                      ? 'bg-emerald-500'
                      : item.status === 'processing'
                      ? 'bg-indigo-500 animate-pulse'
                      : item.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Extracting raw page vectors and media directly. No rasterization or quality reduction.
        </p>
      </div>
    </div>
  );
};
