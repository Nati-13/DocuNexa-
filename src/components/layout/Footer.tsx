import React from 'react';
import Link from 'next/link';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { TOOL_CATEGORIES, ALL_TOOLS } from '@/config/tools';
import { ShieldCheck, Heart, Github, Twitter, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors">
      {/* Top Banner: Privacy Promise */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-b border-slate-800/80">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-slate-700/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Privacy-First Guarantee</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                All core PDF processing is done directly in your browser. Your documents are never uploaded to, stored on, or analyzed by third-party servers.
              </p>
            </div>
          </div>
          <Link
            href="/about"
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            Learn About Our Architecture
          </Link>
        </div>
      </div>

      {/* Main Directory Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <DocuNexaLogo size="md" showTagline={false} className="text-white" />
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Every PDF tool. One simple workspace. Split textbooks into units, merge, convert, edit, compress, and secure your documents with 100% browser-based privacy.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Platform
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools" className="hover:text-white transition-colors">
                  All 34 PDF Tools
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-unit-cutter" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                  PDF Unit Cutter
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-summarizer" className="hover:text-white transition-colors">
                  AI PDF Intelligence
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About & 100% Free Mission
                </Link>
              </li>
            </ul>
          </div>

          {/* Organize PDF */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Organize
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/merge-pdf" className="hover:text-white transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/split-pdf" className="hover:text-white transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/remove-pages" className="hover:text-white transition-colors">
                  Remove Pages
                </Link>
              </li>
              <li>
                <Link href="/tools/extract-pages" className="hover:text-white transition-colors">
                  Extract Pages
                </Link>
              </li>
              <li>
                <Link href="/tools/organize-pdf" className="hover:text-white transition-colors">
                  Organize PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/scan-to-pdf" className="hover:text-white transition-colors">
                  Scan to PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Edit & Security */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Edit & Secure
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/rotate-pdf" className="hover:text-white transition-colors">
                  Rotate PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/add-watermark" className="hover:text-white transition-colors">
                  Add Watermark
                </Link>
              </li>
              <li>
                <Link href="/tools/add-page-numbers" className="hover:text-white transition-colors">
                  Add Page Numbers
                </Link>
              </li>
              <li>
                <Link href="/tools/protect-pdf" className="hover:text-white transition-colors">
                  Protect PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/unlock-pdf" className="hover:text-white transition-colors">
                  Unlock PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/sign-pdf" className="hover:text-white transition-colors">
                  Sign PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Convert & AI */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Convert & AI
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/pdf-to-jpg" className="hover:text-white transition-colors">
                  PDF to JPG
                </Link>
              </li>
              <li>
                <Link href="/tools/jpg-to-pdf" className="hover:text-white transition-colors">
                  JPG to PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-to-word" className="hover:text-white transition-colors">
                  PDF to Word
                </Link>
              </li>
              <li>
                <Link href="/tools/compress-pdf" className="hover:text-white transition-colors">
                  Compress PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-summarizer" className="hover:text-white transition-colors">
                  AI Summarizer
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-to-markdown" className="hover:text-white transition-colors">
                  PDF to Markdown
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} DocuNexa Inc. Every PDF tool. One simple workspace.</p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            Security Overview
          </Link>
        </div>
      </div>
    </footer>
  );
};
