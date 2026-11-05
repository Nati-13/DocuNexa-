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
    <div className="min-h-screen flex flex-col bg-paper text-ink transition-colors">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-muted mb-6">
          <Link href="/" className="hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded px-1">
            Home
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href="/tools" className="hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded px-1">
            Tools
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          {categoryInfo && (
            <>
              <span className="text-muted px-1">{categoryInfo.name}</span>
              <ChevronRight size={13} aria-hidden="true" />
            </>
          )}
          <span className="font-semibold text-ink px-1" aria-current="page">{tool.name}</span>
        </nav>

        {/* Tool Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          {/* Tool Icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-surface text-brand border border-border mb-1">
            <DynamicIcon name={tool.iconName} size={24} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-ink">
            {tool.name}
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            {tool.description}
          </p>

          {/* Privacy & Guarantee Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border text-muted text-xs font-medium">
            <ShieldCheck size={14} className="text-brand shrink-0" />
            <span>Client-Side Processing: Zero document uploads, processed locally in your browser memory.</span>
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
          <div className="pt-10 border-t border-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-ink">
                More {categoryInfo?.name || 'Related'} Tools
              </h3>
              <Link
                href="/tools"
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-brand rounded px-1"
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
                  className="group p-5 rounded-md bg-surface border border-border hover:border-brand/60 transition-colors flex flex-col justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
                >
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-md bg-paper text-brand flex items-center justify-center transition-colors border border-border">
                      <DynamicIcon name={rel.iconName} size={18} />
                    </div>
                    <h4 className="font-semibold text-sm text-ink group-hover:text-brand transition-colors">
                      {rel.name}
                    </h4>
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {rel.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-semibold text-brand">
                    <span>Open tool</span>
                    <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
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
