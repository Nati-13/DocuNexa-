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
  Image, 
  FileSearch, 
  Sparkles, 
  ArrowRight, 
  Search, 
  Star, 
  ShieldCheck, 
  UploadCloud, 
  CheckCircle2, 
  BookOpen, 
  ChevronRight, 
  Layers, 
  Lock, 
  Zap, 
  HelpCircle,
  Plus,
  RotateCw,
  FolderDown,
  Check
} from 'lucide-react';
import { 
  ALL_TOOLS, 
  TOOL_CATEGORIES, 
  getPopularTools, 
  getToolBySlug 
} from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ToolCategory, ToolItem } from '@/types';
import { createSampleTextbookPdf } from '@/lib/sampleGenerator';
import { AdSlot } from '@/components/ads/AdSlot';

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

  // Filter tools for All Tools section
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
      q: 'Are my PDF documents uploaded to a remote server?',
      a: 'No. DocuNexa is built on a 100% client-side, privacy-first architecture. All parsing, unit detection, splitting, merging, and transformations execute directly in your browser memory using WebAssembly and Web Workers. Your files never leave your computer.',
    },
    {
      q: 'How does the PDF Unit Cutter automatically detect units in a textbook?',
      a: 'The engine scans page baselines, font sizes, heading prefixes (e.g., UNIT 1, Chapter 2, Module 3, Roman numerals, spelled-out words), and correlates them with the document Table of Contents (TOC). It filters out casual conversational references like "In Unit 2 we learned" to avoid false positives.',
    },
    {
      q: 'Is there a limit on how many units or pages I can split?',
      a: 'No artificial limits! You can create 2, 10, 25, 50, or unlimited custom parts. It easily processes 300+ page textbooks and course materials without degradation or freezing.',
    },
    {
      q: 'Does splitting reduce the quality of text or images?',
      a: 'Never. Unlike simplistic tools that convert pages to low-resolution JPEG screenshots, DocuNexa uses native PDF object copying. Vector graphics, searchable text layers, mathematical formulas, and font definitions are 100% losslessly preserved.',
    },
    {
      q: 'Can I save the sliced PDFs directly into a folder on my computer?',
      a: 'Yes! In supported modern browsers (Chrome, Edge, Opera), you can click "Save Directly to Folder" using the File System Access API. On all other browsers, you can download all files individually or as a single neatly organized ZIP archive.',
    },
    {
      q: 'Is DocuNexa completely free to use?',
      a: 'Yes! All 34 core PDF tools and the flagship PDF Unit Cutter are completely free to use on your device with zero account requirements, zero subscription paywalls, and zero watermarks added to your files.',
    },
  ];

  return (
    <div className="space-y-24 md:space-y-32 pb-24 overflow-hidden">
      {/* ============================================================ */}
      {/* 1. HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative pt-12 md:pt-20 lg:pt-28 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-500/15 via-indigo-500/10 to-rose-500/15 blur-3xl -z-10 pointer-events-none rounded-full" />

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/80 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wider shadow-xs">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
          <span>ALL-IN-ONE PDF WORKSPACE</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          Everything you need to <br className="hidden sm:inline" />
          work with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-rose-500">PDFs.</span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-xl text-slate-700 dark:text-slate-200 max-w-2xl mx-auto leading-relaxed font-normal">
          Split, merge, convert, edit, compress, secure, and understand your documents from one simple workspace.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="#quick-upload"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02] hover:shadow-brand-500/40"
          >
            <span>Start Using DocuNexa</span>
            <ArrowRight size={16} />
          </a>

          <a
            href="#all-tools"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-bold text-sm shadow-sm transition-all"
          >
            <span>Explore All 34 Tools</span>
          </a>
        </div>

        {/* Trust & Guarantee stats */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
            <ShieldCheck size={16} className="text-emerald-500" />
            100% In-Browser Privacy
          </span>
          <span>•</span>
          <span>Zero Server Storage</span>
          <span>•</span>
          <span>Lossless Vector Quality</span>
          <span>•</span>
          <span>Free Forever</span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. QUICK PDF UPLOAD ZONE */}
      {/* ============================================================ */}
      <section id="quick-upload" className="max-w-4xl mx-auto px-4 sm:px-6 scroll-mt-24">
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
            className={`relative p-8 md:p-14 rounded-3xl border-2 border-dashed text-center transition-all duration-200 cursor-pointer shadow-lg ${
              isDragOver
                ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/50 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:border-brand-400 dark:hover:border-brand-500'
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
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner">
                <UploadCloud size={32} />
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Drop your PDF here
                </h3>
                <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 mt-1">
                  or click to choose a file from your device
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs md:text-sm shadow-md transition-colors">
                <Plus size={16} />
                <span>Choose a file</span>
              </div>

              <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-center gap-2">
                <span>Supported: PDF, JPG, PNG, DOCX, XLSX, PPTX up to 250 MB</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLoadSample();
                  }}
                  className="font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <BookOpen size={13} />
                  <span>Try Sample Textbook</span>
                </button>
              </div>
            </label>
          </div>
        ) : (
          /* When a file is dropped in Hero: Smart Recommended Actions */
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">{droppedFileInfo?.name}</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    {((droppedFileInfo?.size || 0) / (1024 * 1024)).toFixed(2)} MB • Ready to process
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDroppedFile(null)}
                className="text-xs font-semibold text-slate-500 hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Change Document
              </button>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                What would you like to do with this document?
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Link
                  href="/tools/pdf-unit-cutter"
                  className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 text-left"
                >
                  <Scissors size={20} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Detect Textbook Units
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">
                      Auto-split into chapters & units
                    </span>
                  </div>
                </Link>

                <Link
                  href="/tools/compress-pdf"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 text-left"
                >
                  <FileArchive size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Compress File</span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">Reduce size for easy sharing</span>
                  </div>
                </Link>

                <Link
                  href="/tools/ai-summarizer"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 text-left"
                >
                  <Sparkles size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">AI Summarizer</span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">Extract takeaways & study questions</span>
                  </div>
                </Link>

                <Link
                  href="/tools/split-pdf"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 text-left"
                >
                  <Split size={20} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Split by Ranges</span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">Extract custom page sets</span>
                  </div>
                </Link>

                <Link
                  href="/tools/merge-pdf"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 text-left"
                >
                  <Files size={20} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Merge with Others</span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">Combine into one document</span>
                  </div>
                </Link>

                <Link
                  href="/tools/rotate-pdf"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-md transition-all flex items-start gap-3 text-left"
                >
                  <RotateCw size={20} className="text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Rotate Pages</span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">Flip portrait & landscape</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 3. POPULAR TOOLS */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Frequently Used
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Popular PDF Tools
            </h2>
          </div>
          <a
            href="#all-tools"
            className="text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Explore all 34 tools</span>
            <ArrowRight size={14} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popularTools.map((tool) => {
            const isFlagship = tool.id === 'pdf-unit-cutter';
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`group p-6 rounded-3xl transition-all duration-200 flex flex-col justify-between ${
                  isFlagship
                    ? 'bg-gradient-to-b from-brand-50/90 to-white dark:from-brand-950/40 dark:to-slate-900 border-2 border-brand-500 shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:shadow-lg'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${
                        isFlagship
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400'
                      }`}
                    >
                      <DynamicIcon name={tool.iconName} size={20} />
                    </div>
                    {tool.badge && (
                      <span
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
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
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <span>Open Tool</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. FEATURED TOOL: PDF UNIT CUTTER */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-700 to-slate-900 text-white p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden">
          {/* Subtle background circuit pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
              <Scissors size={14} />
              <span>Flagship Innovation</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Turn one textbook into <br className="hidden sm:inline" />
              organized unit PDFs.
            </h2>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-normal">
              Upload one textbook, automatically detect its units, review the page ranges, customize the filenames, and create separate PDFs.
            </p>

            {/* Visual Workflow Steps */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs font-semibold">
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
                    className="px-2.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-[11px]"
                  >
                    {st}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/tools/pdf-unit-cutter"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-brand-700 hover:bg-slate-100 font-extrabold text-sm shadow-xl transition-all hover:scale-[1.02]"
              >
                <span>Open PDF Unit Cutter</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/how-it-works"
                className="text-xs font-semibold text-slate-200 hover:text-white underline underline-offset-4"
              >
                See how detection works →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Advertisement Banner - Pre-Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slotId="home-mid-banner" format="horizontal" />
      </div>

      {/* ============================================================ */}
      {/* 5. ALL PDF TOOLS (Searchable & Filterable) */}
      {/* ============================================================ */}
      <section id="all-tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Complete Toolbox
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            All 34 PDF Tools
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            Find the exact tool you need by keyword, category, or workflow.
          </p>

          {/* Search Input */}
          <div className="relative max-w-md mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search PDF tools... (e.g. split, word, unit, compress)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-sm focus:outline-brand-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-start sm:justify-center scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              activeCategory === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            All Tools ({ALL_TOOLS.length})
          </button>
          {TOOL_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeCategory === c.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
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
                    ? 'bg-gradient-to-b from-brand-50/90 to-white dark:from-brand-950/40 dark:to-slate-900 border-2 border-brand-500 shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-400 hover:shadow-xl shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${
                        isFlagship
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400'
                      }`}
                    >
                      <DynamicIcon name={tool.iconName} size={20} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tool.badge && (
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
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
                        className={`p-1 rounded-md ${
                          isFav ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                        }`}
                      >
                        <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Client-Side
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. AI PDF TOOLS SECTION */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-indigo-50/90 via-white to-brand-50/90 dark:from-indigo-950/40 dark:via-slate-900 dark:to-brand-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} />
                <span>Document Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Understand your documents locally
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                Extract structured outlines, generate study guides, translate text locally, and export clean Markdown.
              </p>
            </div>

            <Link
              href="/tools/ai-summarizer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all self-start md:self-auto shrink-0"
            >
              <span>Launch Document Summarizer</span>
              <ArrowRight size={15} />
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
                className="p-6 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ai.icon size={20} />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ai.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ai.desc}</p>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <span>Try Tool</span>
                  <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Advertisement Banner - Section Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slotId="home-footer-banner" format="horizontal" />
      </div>

      {/* ============================================================ */}
      {/* 7. WHY DOCUNEXA (Privacy & Architecture) */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Privacy First
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Why Choose DocuNexa?
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            Engineered from the ground up for privacy, speed, and precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: '100% In-Browser Safe',
              desc: 'Your files are parsed and manipulated in your device memory. Zero uploads to external servers.',
              icon: ShieldCheck,
            },
            {
              title: 'Lossless Vector Quality',
              desc: 'No rasterization to low-resolution JPGs. Vectors, text, formulas, and fonts remain 100% sharp.',
              icon: Zap,
            },
            {
              title: 'Direct Folder Saving',
              desc: 'Save 20 sliced units directly into your computer directory using the File System Access API.',
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
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <item.icon size={22} />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. HOW IT WORKS (3 Simple Steps) */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Three Steps. Zero Hassle.
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            Work with your documents in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden space-y-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-brand-500/20">
                {st.num}
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">{st.title}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. 100% FREE PUBLIC RESOURCE */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-800/50">
            <Check size={14} /> 100% Free Document Toolkit
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            DocuNexa is a free PDF toolkit built to make document work easier for everyone.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            No subscription required. No paid plans, no premium tier, and no paywalls. Built for students, teachers, researchers, and professionals worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Pillar 1: Students & Teachers */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl">
                🎓
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">For Students & Education</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Split textbooks with PDF Unit Cutter, merge class notes, extract exam chapters, and convert study materials without hidden fees or daily quotas.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Unlimited chapters & parts
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  No sign-up or student email required
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Zero watermarks added
                </li>
              </ul>
            </div>
            <Link
              href="/tools/pdf-unit-cutter"
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs text-center transition-colors"
            >
              Open PDF Unit Cutter
            </Link>
          </div>

          {/* Pillar 2: 100% Free Forever */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-50/70 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500 shadow-xl flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 right-6">
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-md">
                Always $0
              </span>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl">
                🎁
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Completely Free Workspace</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$0</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ forever free</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                DocuNexa is a non-monetized public resource. Every tool is unlocked for everyone.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  All 34 PDF & Document Tools
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Standard AES-256 PDF Security
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Fast ZIP & batch downloads
                </li>
              </ul>
            </div>
            <Link
              href="/tools"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center shadow-md shadow-emerald-500/25 transition-colors"
            >
              Explore All 34 Tools
            </Link>
          </div>

          {/* Pillar 3: Privacy & Security */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-xl">
                🔒
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Privacy First</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your files never touch an external server for core operations. Everything is parsed, encrypted, decrypted, and sliced locally in your browser.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Zero server file retention
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Passwords never stored or transmitted
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  Works offline once loaded
                </li>
              </ul>
            </div>
            <Link
              href="/about"
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs text-center transition-colors"
            >
              Read Privacy Architecture
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 10. FAQ SECTION */}
      {/* ============================================================ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Answers & Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            Clear, transparent answers about how DocuNexa works.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 shrink-0 text-lg">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
