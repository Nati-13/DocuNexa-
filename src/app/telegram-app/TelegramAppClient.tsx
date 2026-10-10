'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import {
  Scissors,
  Search,
  Sparkles,
  LifeBuoy,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  Layers,
  ArrowRight,
  Split,
  Minimize2,
  FileCode,
  Tag,
  RefreshCw,
  X,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { ALL_TOOLS, TOOL_CATEGORIES } from '@/config/tools';
import { TELEGRAM_BOT_HANDLE, TELEGRAM_BOT_URL, DOCUNEXA_SITE_URL } from '@/lib/telegram/constants';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export function TelegramAppClient() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState<boolean>(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Support ticket form state
  const [isTicketFormOpen, setIsTicketFormOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('PDF Tools');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formMessage, setFormMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessTicket, setSubmitSuccessTicket] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Initialize Telegram WebApp SDK
  const handleScriptLoad = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const wa = (window as any).Telegram.WebApp;
      wa.ready();
      try {
        wa.expand();
      } catch {
        // expand is optional
      }

      setIsTelegramEnvironment(true);

      if (wa.initDataUnsafe?.user) {
        const u = wa.initDataUnsafe.user;
        setTgUser(u);
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
        if (fullName) setFormName(fullName);
      }

      if (wa.colorScheme) {
        setColorScheme(wa.colorScheme);
        if (wa.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  };

  useEffect(() => {
    handleScriptLoad();
  }, []);

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.keywords.some((k) => k.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handle support ticket submit
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMessage.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: formName.trim() || (tgUser ? `${tgUser.first_name || 'Telegram User'}` : 'Guest Visitor'),
        email: formEmail.trim() || (tgUser?.username ? `${tgUser.username}@telegram.user` : 'support-request@docunexa.pro.et'),
        category: formCategory,
        subject: formSubject.trim() || `Inquiry from Telegram Mini App (${formCategory})`,
        message: formMessage.trim(),
      };

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit support ticket.');
      }

      setSubmitSuccessTicket(data.ticketId || 'SUBMITTED');
      setFormSubject('');
      setFormMessage('');
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'What is the PDF Unit Cutter and how does it detect chapters?',
      a: 'DocuNexa PDF Unit Cutter uses client-side pattern recognition to detect textbook chapters and syllabus units directly from the Table of Contents or internal headers. You can preview, calibrate page offsets, and download individual chapter PDFs in seconds.',
    },
    {
      q: 'How do I redeem the 100% discount coupon?',
      a: 'Go to the Upgrade Plan page and enter code DOCUNEXA100well during checkout. It provides 100% complimentary Ad-Free access without requiring credit card information.',
    },
    {
      q: 'Are my uploaded PDF files safe and confidential?',
      a: 'Yes, 100%! All PDF manipulation runs entirely within your device browser using WebAssembly. Your documents are never uploaded, stored, or processed on remote servers.',
    },
    {
      q: 'How do I contact human support and how fast is the reply?',
      a: 'You can chat directly with @docunexa_bot on Telegram or submit a ticket using the form above. Our human support team monitors inquiries around the clock and normally replies within 24 hours.',
    },
  ];

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
        {/* Top Header / Brand Bar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <DocuNexaLogo size="sm" />
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                <Sparkles size={12} className="animate-pulse" />
                <span>Mini App</span>
              </span>
              <a
                href={DOCUNEXA_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1"
                title="Open DocuNexa Full Site"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-4 space-y-6">
          {/* Welcome Greeting & Environment Card */}
          <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-brand-500/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-brand-200">
                  {isTelegramEnvironment ? '⚡ Connected to Telegram' : '🌐 DocuNexa Mobile Workspace'}
                </p>
                <h1 className="text-xl sm:text-2xl font-black mt-1">
                  {tgUser ? `Welcome, ${tgUser.first_name || 'Friend'}!` : 'Welcome to DocuNexa'}
                </h1>
                <p className="text-xs sm:text-sm text-brand-100 mt-1 leading-relaxed">
                  Fast, client-side PDF tools in your pocket. Split textbooks, merge documents, and reach human support anytime.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-brand-100">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-300" />
                <span>100% Client-Side Privacy</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Tag size={13} className="text-amber-300" />
                <span>34+ PDF Utilities</span>
              </span>
            </div>
          </div>

          {/* Prominent PDF Unit Cutter Card (Flagship) */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-500/40 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <Scissors size={12} />
                <span>Flagship Tool</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                v2.0 Structure Engine
              </span>
            </div>

            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                PDF Unit Cutter
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Automatically detect textbook units, chapters, and syllabus outlines to split massive PDFs into modular study files.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold block text-slate-900 dark:text-slate-100">Automatic TOC</span>
                Roman & arabic detection
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold block text-slate-900 dark:text-slate-100">Zero Uploads</span>
                Sliced locally in browser
              </div>
            </div>

            <Link
              href="/tools/pdf-unit-cutter"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Scissors size={16} />
              <span>Launch PDF Unit Cutter</span>
              <ArrowRight size={14} />
            </Link>
          </section>

          {/* Quick Actions (Merge, Split, Compress, Convert) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ⚡ Quick PDF Actions
              </h3>
              <span className="text-xs text-slate-500">Popular shortcuts</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/tools/merge-pdf"
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Layers size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Merge PDF</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Combine multiple files
                </p>
              </Link>

              <Link
                href="/tools/split-pdf"
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Split size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Split PDF</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Custom page ranges
                </p>
              </Link>

              <Link
                href="/tools/compress-pdf"
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Minimize2 size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Compress PDF</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Reduce document size
                </p>
              </Link>

              <Link
                href="/tools/pdf-to-word"
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileCode size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Convert PDF</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  Export Word, Excel, JPG
                </p>
              </Link>
            </div>
          </section>

          {/* Search & Browse PDF Tools */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                🛠️ Browse All Tools ({ALL_TOOLS.length})
              </h3>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools (e.g. merge, compress, word, ocr)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All Tools
              </button>
              {TOOL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Tools List */}
            {filteredTools.length > 0 ? (
              <div className="space-y-2">
                {filteredTools.slice(0, 8).map((tool) => (
                  <Link
                    key={tool.id}
                    href={`/tools/${tool.slug}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <DynamicIcon name={tool.iconName} size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {tool.name}
                          </h4>
                          {tool.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                              {tool.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                    />
                  </Link>
                ))}

                {filteredTools.length > 8 && (
                  <Link
                    href="/tools"
                    className="block text-center py-2.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View all {filteredTools.length} tools on website →
                  </Link>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
                <Search size={24} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No tools found matching &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}
          </section>

          {/* Customer Support Hub */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <LifeBuoy size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Customer Support Hub
                </h3>
                <p className="text-xs text-slate-500">Fast human assistance & inquiries</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
              >
                <MessageSquare size={14} />
                <span>Chat @docunexa_bot</span>
              </a>

              <button
                type="button"
                onClick={() => setIsTicketFormOpen(!isTicketFormOpen)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold transition-all"
              >
                <FileText size={14} />
                <span>{isTicketFormOpen ? 'Close Ticket Form' : 'Submit Ticket'}</span>
              </button>
            </div>

            {/* Embedded Support Ticket Form */}
            {isTicketFormOpen && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {submitSuccessTicket ? (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-center">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Ticket Submitted Successfully!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Your ticket reference is{' '}
                      <code className="font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-300">
                        #{submitSuccessTicket}
                      </code>
                      . Our support team has received your request and will reply within 24 hours.
                    </p>
                    <button
                      onClick={() => setSubmitSuccessTicket(null)}
                      className="text-xs font-bold text-emerald-800 dark:text-emerald-200 underline mt-2"
                    >
                      Submit another ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTicket} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="PDF Tools">PDF Tools (Unit Cutter, Merge, Split)</option>
                        <option value="Coupon">Coupon Code &amp; Plans</option>
                        <option value="Payments">Payments &amp; USDT</option>
                        <option value="Bug Report">Bug Report &amp; Feedback</option>
                        <option value="Account">Account &amp; Auth</option>
                        <option value="Other">Other Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="Brief summary of your inquiry"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Message Details
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder="Describe your issue or question in detail..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Submitting Ticket...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Submit Support Ticket</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* Help & FAQ Section */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <HelpCircle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Help & Frequently Asked Questions
                </h3>
                <p className="text-xs text-slate-500">Common questions about tools and coupons</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {faqs.map((faq, idx) => (
                <div key={idx} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-2 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <span>{faq.q}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp size={14} className="shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="shrink-0 text-slate-400" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-1">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Footer & Website Link */}
          <footer className="text-center pt-2 pb-6 space-y-3 text-xs text-slate-500">
            <div>
              <a
                href={DOCUNEXA_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <span>Open Full DocuNexa Website</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center justify-center gap-4 text-[11px]">
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:underline">Terms of Service</Link>
              <span>•</span>
              <Link href="/security" className="hover:underline">Security</Link>
            </div>

            <p className="text-[10px] text-slate-400">
              DocuNexa — High-Performance Client-Side PDF Workspace.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
