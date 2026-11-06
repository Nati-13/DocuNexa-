'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Scissors, 
  Files, 
  Split, 
  FileArchive, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Search, 
  Star, 
  ShieldCheck, 
  UploadCloud, 
  CheckCircle2, 
  BookOpen, 
  RotateCw, 
  FolderDown, 
  Check, 
  GraduationCap, 
  Gift, 
  Plus, 
  Zap 
} from 'lucide-react';
import { 
  ALL_TOOLS, 
  TOOL_CATEGORIES, 
  getPopularTools 
} from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ToolCategory } from '@/types';
import { createSampleTextbookPdf } from '@/lib/sampleGenerator';
import { AdSlot } from '@/components/ads/AdSlot';
import { Reveal } from '@/components/ui/Reveal';

export default function HomePage() {
  const router = useRouter();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ToolCategory>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Quick Dropzone File State
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [droppedFileInfo, setDroppedFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Load favorites
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

  // Handle file drop on Quick Upload
  const handleFileDrop = (file: File) => {
    setDroppedFile(file);
    setDroppedFileInfo({
      name: file.name,
      size: file.size,
    });
  };

  const handleLoadSample = async () => {
    try {
      const sample = await createSampleTextbookPdf();
      handleFileDrop(sample);
    } catch (err) {
      console.error(err);
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

  const popularTools = getPopularTools();

  const faqs = [
    {
      q: 'Are my uploaded files and PDFs kept private?',
      a: 'Yes. Core PDF tools run entirely client-side using JavaScript WebAssembly in your browser memory. Your files are not uploaded, cached, or saved on remote servers.',
    },
    {
      q: 'Is DocuNexa really 100% free?',
      a: 'Yes. Every core tool is completely free with zero subscription requirements or daily page limits. Users who wish to remove advertising can choose a one-time $2 Ad-Free upgrade.',
    },
    {
      q: 'What is the PDF Unit Cutter tool?',
      a: 'PDF Unit Cutter is our flagship tool built for educators and students. It automatically scans textbooks for unit, chapter, or module headings and splits the book into organized, labeled PDF files.',
    },
    {
      q: 'What file size limits apply to DocuNexa tools?',
      a: 'Client-side processing supports documents up to 250 MB depending on available device memory. Because processing happens locally, operations are fast and bandwidth-free.',
    },
    {
      q: 'Does DocuNexa work offline?',
      a: 'Once the application is loaded in your browser, client-side tools like PDF Unit Cutter, Split, Merge, Rotate, and Protect continue to function even without an active internet connection.',
    },
  ];

  return (
    <div className="space-y-20 md:space-y-28 pb-24 overflow-hidden bg-paper text-ink transition-colors">
      {/* ============================================================ */}
      {/* 1. HERO SECTION */}
      {/* ============================================================ */}
      <Reveal as="section" className="relative pt-12 md:pt-20 lg:pt-24 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-7">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-surface border border-border text-brand text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-brand" />
          <span>All-In-One PDF Workspace</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-ink leading-[1.12]">
          Everything you need to <br className="hidden sm:inline" />
          work with <span className="text-brand">PDFs.</span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed font-normal">
          Split, merge, convert, edit, compress, secure, and understand your documents from one simple, private workspace.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <a
            href="#quick-upload"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors cursor-pointer"
          >
            <span>Start Using DocuNexa</span>
            <ArrowRight size={15} />
          </a>

          <a
            href="#all-tools"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-surface hover:bg-paper border border-border text-ink font-semibold text-sm transition-colors cursor-pointer"
          >
            <span>Explore All 34 Tools</span>
          </a>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-muted">
          <span className="flex items-center gap-1.5 text-brand font-semibold">
            <ShieldCheck size={15} className="text-brand" />
            Client-Side Document Privacy
          </span>
          <span>•</span>
          <span>Zero Document Uploads</span>
          <span>•</span>
          <span>Lossless Vector Quality</span>
          <span>•</span>
          <span>Completely Free</span>
        </div>
      </Reveal>

      {/* ============================================================ */}
      {/* 2. QUICK PDF UPLOAD ZONE */}
      {/* ============================================================ */}
      <Reveal as="section" delay={50} id="quick-upload" className="max-w-4xl mx-auto px-4 sm:px-6 scroll-mt-24">
        {!droppedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileDrop(e.dataTransfer.files[0]);
              }
            }}
            className={`relative p-8 md:p-12 rounded-md border-2 border-dashed text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-brand bg-paper'
                : 'border-border bg-surface hover:border-brand/60'
            }`}
          >
            <input
              type="file"
              accept=".pdf,application/pdf,.docx,.xlsx,.pptx,.jpg,.png"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileDrop(e.target.files[0]);
              }}
              className="hidden"
              id="hero-file-picker"
            />

            <label htmlFor="hero-file-picker" className="cursor-pointer space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-md bg-paper border border-border text-brand flex items-center justify-center">
                <UploadCloud size={26} />
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-serif font-bold text-ink">
                  Drop your PDF here
                </h3>
                <p className="text-xs md:text-sm text-muted mt-1">
                  or click to choose a file from your device
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand text-brand-fg font-semibold text-xs md:text-sm transition-colors">
                <Plus size={15} />
                <span>Choose a file</span>
              </div>

              <div className="pt-2 text-xs text-muted flex flex-wrap items-center justify-center gap-2">
                <span>Supported: PDF, JPG, PNG, DOCX, XLSX, PPTX up to 250 MB</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLoadSample();
                  }}
                  className="font-semibold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen size={13} />
                  <span>Try Sample Textbook</span>
                </button>
              </div>
            </label>
          </div>
        ) : (
          /* When a file is dropped in Hero: Smart Recommended Actions */
          <div className="p-6 md:p-8 rounded-md bg-surface border border-border space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-paper border border-border text-brand flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-base text-ink">{droppedFileInfo?.name}</h4>
                  <p className="text-xs text-muted">
                    {((droppedFileInfo?.size || 0) / (1024 * 1024)).toFixed(2)} MB • Ready to process
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDroppedFile(null)}
                className="text-xs font-semibold text-muted hover:text-ink px-3 py-1.5 rounded-md border border-border hover:bg-paper transition-colors cursor-pointer"
              >
                Change Document
              </button>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                What would you like to do with this document?
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Link
                  href="/tools/pdf-unit-cutter"
                  className="p-4 rounded-md bg-paper border border-border hover:border-brand/60 transition-colors flex items-start gap-3 text-left"
                >
                  <Scissors size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-xs text-ink block">
                      Detect Textbook Units
                    </span>
                    <span className="text-[11px] text-muted">
                      Auto-split into chapters & units
                    </span>
                  </div>
                </Link>

                <Link
                  href="/tools/compress-pdf"
                  className="p-4 rounded-md bg-surface border border-border hover:border-brand/60 transition-colors flex items-start gap-3 text-left"
                >
                  <FileArchive size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-xs text-ink block">Compress File</span>
                    <span className="text-[11px] text-muted">Reduce size for easy sharing</span>
                  </div>
                </Link>

                <Link
                  href="/tools/ai-summarizer"
                  className="p-4 rounded-md bg-surface border border-border hover:border-brand/60 transition-colors flex items-start gap-3 text-left"
                >
                  <Sparkles size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-xs text-ink block">Document Summarizer</span>
                    <span className="text-[11px] text-muted">Extract key terms & questions</span>
                  </div>
                </Link>

                <Link
                  href="/tools/split-pdf"
                  className="p-4 rounded-md bg-surface border border-border hover:border-brand/60 transition-colors flex items-start gap-3 text-left"
                >
                  <Split size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-xs text-ink block">Split by Ranges</span>
                    <span className="text-[11px] text-muted">Extract custom page sets</span>
                  </div>
                </Link>

                <Link
                  href="/tools/merge-pdf"
                  className="p-4 rounded-md bg-surface border border-border hover:border-brand/60 transition-colors flex items-start gap-3 text-left"
                >
                  <Files size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-xs text-ink block">Merge with Others</span>
                    <span className="text-[11px] text-muted">Combine into one document</span>
                  </div>
                </Link>

                <Link
                  href="/tools/rotate-pdf"
                  className="p-4 rounded-md bg-surface border border-border hover:border-brand/60 transition-colors flex items-start gap-3 text-left"
                >
                  <RotateCw size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-xs text-ink block">Rotate Pages</span>
                    <span className="text-[11px] text-muted">Flip portrait & landscape</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </Reveal>

      {/* ============================================================ */}
      {/* 3. POPULAR TOOLS */}
      {/* ============================================================ */}
      <Reveal as="section" delay={50} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Frequently Used
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink mt-0.5">
              Popular PDF Tools
            </h2>
          </div>
          <a
            href="#all-tools"
            className="text-xs sm:text-sm font-semibold text-brand hover:underline inline-flex items-center gap-1"
          >
            <span>Explore all 34 tools</span>
            <ArrowRight size={13} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularTools.map((tool) => {
            const isFlagship = tool.id === 'pdf-unit-cutter';
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`group p-5 rounded-md transition-colors flex flex-col justify-between ${
                  isFlagship
                    ? 'bg-surface border-2 border-brand'
                    : 'bg-surface border border-border hover:border-brand/60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                        isFlagship
                          ? 'bg-brand text-brand-fg'
                          : 'bg-paper text-brand border border-border'
                      }`}
                    >
                      <DynamicIcon name={tool.iconName} size={18} />
                    </div>
                    {tool.badge && (
                      <span
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          tool.badge === 'Featured'
                            ? 'bg-brand/10 border border-brand/20 text-brand'
                            : 'bg-paper border border-border text-muted'
                        }`}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-ink group-hover:text-brand transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-brand">
                  <span>Open Tool</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </Reveal>

      {/* ============================================================ */}
      {/* 4. FEATURED TOOL: PDF UNIT CUTTER */}
      {/* ============================================================ */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-md bg-brand text-brand-fg p-8 sm:p-12 lg:p-14 border border-brand shadow-subtle overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-fg/10 border border-brand-fg/20 text-brand-fg text-xs font-semibold uppercase tracking-wider">
              <Scissors size={14} />
              <span>Flagship Innovation</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight leading-tight">
              Turn one textbook into <br className="hidden sm:inline" />
              organized unit PDFs.
            </h2>

            <p className="text-sm sm:text-base text-brand-fg/90 leading-relaxed max-w-2xl font-normal">
              Upload one textbook, automatically detect its units, review page ranges, customize filenames, and create separate, clean PDFs.
            </p>

            {/* Visual Workflow Steps */}
            <div className="pt-2 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs font-medium">
                {[
                  '1. Upload PDF',
                  '2. Analyze',
                  '3. Detect Units',
                  '4. Review & Edit',
                  '5. Custom Names',
                  '6. Split',
                  '7. Download',
                ].map((st, i) => (
                  <div
                    key={i}
                    className="px-2 py-2 rounded-md bg-brand-fg/10 border border-brand-fg/15 text-[11px]"
                  >
                    {st}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link
                href="/tools/pdf-unit-cutter"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-surface text-ink hover:bg-paper font-semibold text-sm transition-colors"
              >
                <span>Open PDF Unit Cutter</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/how-it-works"
                className="text-xs font-medium text-brand-fg/90 hover:text-brand-fg underline underline-offset-4"
              >
                See how detection works →
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Advertisement Banner - Pre-Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slotId="home-mid-banner" format="horizontal" />
      </div>

      {/* ============================================================ */}
      {/* 5. ALL PDF TOOLS (Searchable & Filterable) */}
      {/* ============================================================ */}
      <Reveal as="section" id="all-tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Complete Toolbox
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink">
            All 34 PDF Tools
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Find the exact tool you need by keyword, category, or workflow.
          </p>

          {/* Search Input */}
          <div className="relative max-w-md mx-auto pt-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              id="search-tools-input"
              aria-label="Search all 34 PDF tools"
              placeholder="Search PDF tools... (e.g. split, word, unit, compress)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-md bg-surface border border-border text-sm text-ink placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand transition-colors"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div role="tablist" aria-label="Tool categories" className="flex items-center gap-2 overflow-x-auto pb-2 justify-start sm:justify-center scrollbar-none px-1">
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
          {TOOL_CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                activeCategory === c.id
                  ? 'bg-brand text-brand-fg'
                  : 'bg-surface border border-border text-ink hover:bg-paper'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                        isFlagship
                          ? 'bg-brand text-brand-fg'
                          : 'bg-paper text-brand border border-border'
                      }`}
                    >
                      <DynamicIcon name={tool.iconName} size={18} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tool.badge && (
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
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
                          isFav ? 'text-accent hover:opacity-80' : 'text-border hover:text-muted'
                        }`}
                      >
                        <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm text-ink group-hover:text-brand transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-brand">
                  <span className="text-[11px] font-medium text-brand flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                    Client-Side
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Open</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Reveal>

      {/* ============================================================ */}
      {/* 6. AI PDF TOOLS SECTION */}
      {/* ============================================================ */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-md p-8 md:p-12 bg-surface border border-border space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-border">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-paper border border-border text-brand text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={14} />
                <span>Document Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
                Understand your documents locally
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Extract structured outlines, generate study guides, translate text locally, and export clean Markdown.
              </p>
            </div>

            <Link
              href="/tools/ai-summarizer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs transition-colors self-start md:self-auto shrink-0"
            >
              <span>Launch Document Summarizer</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Document Summarizer',
                desc: 'Synthesize 50-page reports into executive summaries, key terms, and active recall study questions.',
                slug: 'ai-summarizer',
                icon: Sparkles,
              },
              {
                title: 'Multilingual Translator',
                desc: 'Translate educational chapters and documents between English, Amharic, and other languages.',
                slug: 'translate-pdf',
                icon: Sparkles,
              },
              {
                title: 'PDF to Markdown',
                desc: 'Convert formatted PDF text hierarchy into clean Markdown for Obsidian, Notion, or personal notes.',
                slug: 'pdf-to-markdown',
                icon: Sparkles,
              },
            ].map((ai, idx) => (
              <Link
                key={idx}
                href={`/tools/${ai.slug}`}
                className="p-5 rounded-md bg-paper border border-border hover:border-brand/60 transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-md bg-surface border border-border text-brand flex items-center justify-center">
                    <ai.icon size={18} />
                  </div>
                  <h4 className="font-semibold text-sm text-ink">{ai.title}</h4>
                  <p className="text-xs text-muted leading-relaxed">{ai.desc}</p>
                </div>
                <span className="text-xs font-semibold text-brand flex items-center gap-1">
                  <span>Try Tool</span>
                  <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Advertisement Banner - Section Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slotId="home-footer-banner" format="horizontal" />
      </div>

      {/* ============================================================ */}
      {/* 7. WHY DOCUNEXA (Privacy & Architecture) */}
      {/* ============================================================ */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Privacy First
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink">
            Why Choose DocuNexa?
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Engineered from the ground up for privacy, speed, and precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'In-Browser Processing',
              desc: 'Your files are parsed and manipulated in your device memory. Zero uploads to external servers.',
              icon: ShieldCheck,
            },
            {
              title: 'Lossless Vector Quality',
              desc: 'No rasterization to low-resolution JPGs. Vectors, text, formulas, and fonts remain crisp and vector-precise.',
              icon: Zap,
            },
            {
              title: 'Direct Folder Saving',
              desc: 'Save sliced units directly into your computer directory using the modern File System Access API.',
              icon: FolderDown,
            },
            {
              title: 'Free & Uncapped',
              desc: 'No arbitrary limits on daily files, page counts, or export sizes. Built for teachers and students.',
              icon: CheckCircle2,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-md bg-surface border border-border space-y-3"
            >
              <div className="w-10 h-10 rounded-md bg-paper border border-border text-brand flex items-center justify-center">
                <item.icon size={20} />
              </div>
              <h3 className="font-semibold text-sm text-ink">{item.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ============================================================ */}
      {/* 8. HOW IT WORKS (3 Simple Steps) */}
      {/* ============================================================ */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink">
            Three Steps. Zero Hassle.
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Work with your documents in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              num: '1',
              title: 'Choose a Tool',
              desc: 'Select from 34 specialized tools or use the search bar to find what you need.',
            },
            {
              num: '2',
              title: 'Add Your Document',
              desc: 'Drag and drop your file into the workspace. It loads locally in milliseconds.',
            },
            {
              num: '3',
              title: 'Process & Download',
              desc: 'Configure ranges or settings, click process, and download as PDF, ZIP, or to folder.',
            },
          ].map((st, i) => (
            <div
              key={i}
              className="p-6 rounded-md bg-surface border border-border space-y-3"
            >
              <div className="w-9 h-9 rounded-md bg-brand text-brand-fg font-bold text-sm flex items-center justify-center">
                {st.num}
              </div>
              <h3 className="font-semibold text-base text-ink">{st.title}</h3>
              <p className="text-xs text-muted leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ============================================================ */}
      {/* 9. 100% FREE PUBLIC RESOURCE */}
      {/* ============================================================ */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-paper border border-border text-brand text-xs font-semibold uppercase tracking-wider">
            <Check size={14} /> 100% Free Document Toolkit
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink">
            DocuNexa is a free PDF toolkit built to make document work easier for everyone.
          </h2>
          <p className="text-sm text-muted">
            No subscription required. All core PDF tools are free with zero paywalls. An optional one-time Ad-Free upgrade is available for users who prefer an ad-free workspace. Built for students, teachers, researchers, and professionals worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Pillar 1: Students & Teachers */}
          <div className="p-6 rounded-md bg-surface border border-border flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-md bg-paper border border-border text-brand flex items-center justify-center">
                <GraduationCap size={20} />
              </div>
              <h3 className="font-semibold text-base text-ink">For Students & Education</h3>
              <p className="text-xs text-muted leading-relaxed">
                Split textbooks with PDF Unit Cutter, merge class notes, extract exam chapters, and convert study materials without hidden fees or daily quotas.
              </p>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Unlimited chapters & parts
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  No sign-up or student email required
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Zero watermarks added
                </li>
              </ul>
            </div>
            <Link
              href="/tools/pdf-unit-cutter"
              className="w-full py-2.5 rounded-md bg-paper border border-border hover:bg-surface text-ink font-semibold text-xs text-center transition-colors"
            >
              Open PDF Unit Cutter
            </Link>
          </div>

          {/* Pillar 2: 100% Free Forever */}
          <div className="p-6 rounded-md bg-surface border-2 border-brand flex flex-col justify-between space-y-5 relative">
            <div className="absolute -top-3 right-4">
              <span className="px-2.5 py-0.5 rounded bg-brand text-brand-fg font-bold text-[10px] uppercase tracking-wider">
                Always $0
              </span>
            </div>
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-md bg-paper border border-border text-brand flex items-center justify-center">
                <Gift size={20} />
              </div>
              <h3 className="font-semibold text-base text-ink">Completely Free Workspace</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold text-ink">$0</span>
                <span className="text-xs text-muted">/ forever free</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                DocuNexa is a completely free document toolkit. Every tool is unlocked for everyone without paywalls or subscriptions.
              </p>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  All 34 PDF & Document Tools
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Standard AES-256 PDF Security
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Fast ZIP & batch downloads
                </li>
              </ul>
            </div>
            <Link
              href="/tools"
              className="w-full py-2.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs text-center transition-colors"
            >
              Explore All 34 Tools
            </Link>
          </div>

          {/* Pillar 3: Privacy & Security */}
          <div className="p-6 rounded-md bg-surface border border-border flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              <div className="w-10 h-10 rounded-md bg-paper border border-border text-brand flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-semibold text-base text-ink">Privacy First</h3>
              <p className="text-xs text-muted leading-relaxed">
                Your files never touch an external server for core operations. Everything is parsed, encrypted, decrypted, and sliced locally in your browser.
              </p>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Zero server file retention
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Passwords never stored or transmitted
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand" />
                  Works offline once loaded
                </li>
              </ul>
            </div>
            <Link
              href="/about"
              className="w-full py-2.5 rounded-md bg-paper border border-border hover:bg-surface text-ink font-semibold text-xs text-center transition-colors"
            >
              Read Privacy Architecture
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ============================================================ */}
      {/* 10. FAQ SECTION */}
      {/* ============================================================ */}
      <Reveal as="section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Answers & Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-ink">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Clear, transparent answers about how DocuNexa works.
          </p>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-md bg-surface border border-border overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  id={`faq-trigger-${idx}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-ink hover:text-brand transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
                >
                  <span>{faq.q}</span>
                  <span className="text-muted shrink-0 text-base font-mono leading-none" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${idx}`}
                    className="px-4 pb-4 text-xs text-muted leading-relaxed border-t border-border pt-3 animate-in fade-in duration-150"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
