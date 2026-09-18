'use client';

import React from 'react';
import Link from 'next/link';
import { TOOL_CATEGORIES, ALL_TOOLS } from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { Sparkles, ArrowRight, Scissors } from 'lucide-react';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Flagship Banner inside Mega Menu */}
        <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-brand-50 via-indigo-50 to-rose-50 dark:from-brand-950/40 dark:via-indigo-950/40 dark:to-rose-950/40 border border-brand-200/70 dark:border-brand-800/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-600/30">
              <Scissors size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Flagship: PDF Unit Cutter
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-brand-600 text-white">
                  Featured
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200">
                Automatically detect textbook units, chapters, and table of contents to slice into organized PDFs.
              </p>
            </div>
          </div>
          <Link
            href="/tools/pdf-unit-cutter"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Launch Unit Cutter
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* 7 Categorized Columns / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          {TOOL_CATEGORIES.map((cat) => {
            const categoryTools = ALL_TOOLS.filter((t) => t.category === cat.id);

            return (
              <div key={cat.id} className="flex flex-col space-y-3">
                {/* Category Header */}
                <div className="pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {cat.name}
                  </h3>
                </div>

                {/* Tool List */}
                <ul className="space-y-1">
                  {categoryTools.map((tool) => {
                    const isUnitCutter = tool.id === 'pdf-unit-cutter';
                    const isSplit = tool.id === 'split-pdf';

                    return (
                      <li key={tool.id}>
                        <Link
                          href={`/tools/${tool.slug}`}
                          onClick={onClose}
                          className={`group flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                            isUnitCutter
                              ? 'bg-brand-50/70 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/50'
                              : isSplit
                              ? 'bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`shrink-0 transition-transform group-hover:scale-110 ${
                                isUnitCutter
                                  ? 'text-brand-600 dark:text-brand-400'
                                  : isSplit
                                  ? 'text-rose-500'
                                  : 'text-slate-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400'
                              }`}
                            >
                              <DynamicIcon name={tool.iconName} size={15} />
                            </span>
                            <span className="truncate">{tool.name}</span>
                          </div>

                          {tool.badge && (
                            <span
                              className={`ml-1.5 shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${
                                tool.badge === 'Featured'
                                  ? 'bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                                  : tool.badge === 'AI'
                                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {tool.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom Fast Links */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Client-Side Privacy: Your files never leave this device
            </span>
          </div>
          <Link
            href="/tools"
            onClick={onClose}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
          >
            Explore All 34 PDF Tools
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};
