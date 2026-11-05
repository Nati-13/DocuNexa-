'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ALL_TOOLS, 
  TOOL_CATEGORIES 
} from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ToolCategory } from '@/types';
import { 
  Search, 
  Star, 
  ArrowRight
} from 'lucide-react';
import { AdSlot } from '@/components/ads/AdSlot';

export default function ToolsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ToolCategory>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('docunexa-favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    try {
      localStorage.setItem('docunexa-favorites', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filter tools
  const filteredTools = ALL_TOOLS.filter((tool) => {
    const matchesCat = activeCategory === 'all' || tool.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.keywords.some((k) => k.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-paper text-ink transition-colors py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-surface text-brand border border-border text-xs font-semibold uppercase tracking-wider">
            <span>DocuNexa Toolbox</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-ink">
            All PDF Tools in One Workspace
          </h1>
          <p className="text-muted text-sm sm:text-base leading-relaxed">
            Document processing runs locally in your browser. Split, merge, convert, compress, edit, secure, and understand your documents with zero document uploads to remote servers.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              id="tools-directory-search"
              aria-label="Search all 34 PDF tools"
              placeholder="Search 34 PDF tools... (e.g. split, word, compress, unit, ocr)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-md bg-surface border border-border text-sm text-ink placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand transition-colors"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div role="tablist" aria-label="Tool categories" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center px-1">
          <button
            role="tab"
            aria-selected={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
              activeCategory === 'all'
                ? 'bg-brand text-brand-fg'
                : 'bg-surface border border-border text-ink hover:bg-paper'
            }`}
          >
            All Tools ({ALL_TOOLS.length})
          </button>
          {TOOL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                activeCategory === cat.id
                  ? 'bg-brand text-brand-fg'
                  : 'bg-surface border border-border text-ink hover:bg-paper'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTools.map((tool) => {
              const isFav = favorites.includes(tool.id);
              const isFlagship = tool.id === 'pdf-unit-cutter';

              return (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.slug}`}
                  className={`group relative p-5 rounded-md transition-colors flex flex-col justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                    isFlagship
                      ? 'bg-surface border-2 border-brand'
                      : 'bg-surface border border-border hover:border-brand/60'
                  }`}
                >
                  {/* Top bar with icon & star */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                        isFlagship
                          ? 'bg-brand text-brand-fg'
                          : 'bg-paper text-brand border border-border'
                      }`}
                    >
                      <DynamicIcon name={tool.iconName} size={20} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tool.badge && (
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            tool.badge === 'Featured'
                              ? 'bg-brand/10 border border-brand/20 text-brand'
                              : 'bg-paper border border-border text-muted'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, tool.id)}
                        aria-label={isFav ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
                        className={`p-1.5 rounded cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                          isFav
                            ? 'text-accent hover:opacity-80'
                            : 'text-border hover:text-muted'
                        }`}
                      >
                        <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="mt-4 space-y-1.5">
                    <h3 className="font-semibold text-sm text-ink group-hover:text-brand transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-brand flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      Client-side
                    </span>
                    <span className="font-semibold text-brand flex items-center gap-1">
                      <span>Open tool</span>
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* First-Party House Promotion / Ad Placement */}
          <div className="pt-8 max-w-5xl mx-auto">
            <AdSlot slotId="tools-directory-bottom" format="horizontal" />
          </div>

          {filteredTools.length === 0 && (
            <div className="p-12 text-center rounded-md bg-surface border border-border max-w-md mx-auto space-y-3">
              <p className="text-base font-bold text-ink">No tools found</p>
              <p className="text-xs text-muted">
                No matching PDF tools found for &ldquo;{searchQuery}&rdquo;. Try clearing your search query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 rounded-md bg-brand text-brand-fg text-xs font-semibold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
