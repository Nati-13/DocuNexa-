'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react';
import { ToolItem } from '@/types';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ALL_TOOLS, TOOL_CATEGORIES } from '@/config/tools';
import { ToolSeoSection } from './ToolSeoSection';

interface ToolLayoutProps {
  tool: ToolItem;
  children: React.ReactNode;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({ tool, children }) => {
  const categoryInfo = TOOL_CATEGORIES.find((c) => c.id === tool.category);

  // Find 3 other tools in same or adjacent categories
  const relatedTools = ALL_TOOLS.filter((t) => t.id !== tool.id && t.category === tool.category).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mb-6">
          <Link href="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            Home
          </Link>
          <ChevronRight size={13} />
          <Link href="/tools" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            Tools
          </Link>
          <ChevronRight size={13} />
          {categoryInfo && (
            <>
              <span className="text-slate-600 dark:text-slate-300">{categoryInfo.name}</span>
              <ChevronRight size={13} />
            </>
          )}
          <span className="font-semibold text-slate-900 dark:text-white">{tool.name}</span>
        </nav>

        {/* Tool Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          {/* Tool Icon & Badge */}
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 shadow-md shadow-brand-500/10 mb-1">
            <DynamicIcon name={tool.iconName} size={30} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {tool.name}
          </h1>

          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            {tool.description}
          </p>

          {/* Privacy & Guarantee Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>100% Client-Side: Zero server uploads, processed privately in your browser.</span>
          </div>
        </div>

        {/* Primary Interactive Workspace Area */}
        <div className="w-full mb-16">
          {children}
        </div>

        {/* Informative Server-Rendered Documentation & Specifications */}
        <ToolSeoSection tool={tool} />

        {/* Related Tools Section */}
        {relatedTools.length > 0 && (
          <div className="pt-10 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                More {categoryInfo?.name || 'Related'} Tools
              </h3>
              <Link
                href="/tools"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>View all 34 tools</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedTools.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/tools/${rel.slug}`}
                  className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 group-hover:text-brand-600 dark:group-hover:text-brand-400 flex items-center justify-center transition-colors">
                      <DynamicIcon name={rel.iconName} size={18} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {rel.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {rel.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Open tool</span>
                    <ArrowRight size={12} className="ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
