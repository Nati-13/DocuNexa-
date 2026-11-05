'use client';

import React from 'react';
import Link from 'next/link';
import { TOOL_CATEGORIES, ALL_TOOLS } from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ArrowRight, Scissors } from 'lucide-react';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full left-0 w-full bg-surface border-b border-border shadow-md z-50 animate-in fade-in duration-150"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Flagship Banner inside Mega Menu */}
        <div className="mb-6 p-4 rounded-md bg-paper border border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand text-brand-fg flex items-center justify-center shrink-0">
              <Scissors size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink text-sm">
                  Flagship: PDF Unit Cutter
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-brand/10 border border-brand/20 text-brand">
                  Featured
                </span>
              </div>
              <p className="text-xs text-muted">
                Automatically detect textbook units, chapters, and table of contents to slice into organized PDFs.
              </p>
            </div>
          </div>
          <Link
            href="/tools/pdf-unit-cutter"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg text-xs font-semibold transition-colors"
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
                <div className="pb-1.5 border-b border-border">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {cat.name}
                  </h3>
                </div>

                {/* Tool List */}
                <ul className="space-y-1">
                  {categoryTools.map((tool) => {
                    const isUnitCutter = tool.id === 'pdf-unit-cutter';

                    return (
                      <li key={tool.id}>
                        <Link
                          href={`/tools/${tool.slug}`}
                          onClick={onClose}
                          className={`group flex items-center justify-between p-2 rounded-md text-xs font-medium transition-colors ${
                            isUnitCutter
                              ? 'bg-paper text-brand font-semibold border border-border'
                              : 'text-ink hover:bg-paper hover:text-brand'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 text-brand">
                              <DynamicIcon name={tool.iconName} size={15} />
                            </span>
                            <span className="truncate">{tool.name}</span>
                          </div>

                          {tool.badge && (
                            <span className="ml-1.5 shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight bg-surface border border-border text-muted">
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
        <div className="mt-8 pt-4 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-brand">
              <span className="w-2 h-2 rounded-full bg-brand" />
              Client-Side Document Privacy: Your files are processed locally in your browser
            </span>
          </div>
          <Link
            href="/tools"
            onClick={onClose}
            className="font-semibold text-brand hover:underline inline-flex items-center gap-1"
          >
            Explore All 34 PDF Tools
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};
