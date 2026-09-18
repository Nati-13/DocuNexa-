'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ALL_TOOLS, 
  TOOL_CATEGORIES 
} from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ToolCategory, ToolItem } from '@/types';
import { 
  Search, 
  Star, 
  ArrowRight, 
  Sparkles, 
  Scissors, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <span>DocuNexa Toolbox</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            All PDF Tools in One Workspace
          </h1>
          <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
            Every tool runs 100% locally in your browser. Split, merge, convert, compress, edit, secure, and understand your documents with absolute zero server exposure.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search 34 PDF tools... (e.g. split, word, compress, unit, ocr)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-sm focus:outline-brand-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeCategory === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Tools ({ALL_TOOLS.length})
          </button>
          {TOOL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  className={`group relative p-6 rounded-3xl transition-all duration-200 flex flex-col justify-between ${
                    isFlagship
                      ? 'bg-gradient-to-b from-brand-50/90 via-white to-white dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-brand-500 shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-xl shadow-xs'
                  }`}
                >
                  {/* Top bar with icon & star */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${
                        isFlagship
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60'
                      }`}
                    >
                      <DynamicIcon name={tool.iconName} size={22} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tool.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            tool.badge === 'Featured'
                              ? 'bg-brand-600 text-white'
                              : tool.badge === 'AI'
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, tool.id)}
                        aria-label="Star favorite"
                        className={`p-1.5 rounded-lg transition-colors ${
                          isFav
                            ? 'text-amber-400 hover:text-amber-500'
                            : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                        }`}
                      >
                        <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="mt-5 space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Client-side
                    </span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Open tool</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-3">
              <p className="text-base font-bold text-slate-900 dark:text-white">No tools found</p>
              <p className="text-xs text-slate-500">
                No matching PDF tools found for &ldquo;{searchQuery}&rdquo;. Try clearing your search query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
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
