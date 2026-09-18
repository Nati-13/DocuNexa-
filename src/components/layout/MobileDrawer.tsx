'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronRight, Scissors, Sparkles } from 'lucide-react';
import { TOOL_CATEGORIES, ALL_TOOLS } from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { ToolCategory } from '@/types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const [expandedCategory, setExpandedCategory] = useState<ToolCategory | null>('organize');

  if (!isOpen) return null;

  const toggleCategory = (cat: ToolCategory) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <DocuNexaLogo size="sm" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Flagship Direct Button */}
          <Link
            href="/tools/pdf-unit-cutter"
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 font-semibold text-sm shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Scissors size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span>PDF Unit Cutter</span>
                <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold rounded bg-brand-600 text-white">
                  Flagship
                </span>
              </div>
              <p className="text-[11px] font-normal text-slate-700 dark:text-slate-200">
                Split textbooks into units
              </p>
            </div>
          </Link>

          {/* Direct Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/tools"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              All 34 PDF Tools
            </Link>
            <Link
              href="/how-it-works"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              How It Works
            </Link>
            <Link
              href="/about"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              About & Privacy
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Categories
            </h4>
            <div className="space-y-1">
              {TOOL_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategory === cat.id;
                const categoryTools = ALL_TOOLS.filter((t) => t.category === cat.id);

                return (
                  <div key={cat.id} className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span>{cat.name}</span>
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    {isExpanded && (
                      <div className="p-2 pt-0 space-y-0.5 bg-slate-50/50 dark:bg-slate-900/40">
                        {categoryTools.map((tool) => (
                          <Link
                            key={tool.id}
                            href={`/tools/${tool.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
                          >
                            <DynamicIcon name={tool.iconName} size={14} className="text-slate-500 shrink-0" />
                            <span className="truncate">{tool.name}</span>
                            {tool.badge && (
                              <span className="ml-auto px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {tool.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">✓ 100% Client-Side Privacy</p>
          <p className="mt-0.5">Files never leave your device.</p>
        </div>
      </div>
    </div>
  );
};
