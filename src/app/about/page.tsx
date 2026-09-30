import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Zap,
  BookOpen,
  Heart,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  FileText,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About DocuNexa — Free Client-Side PDF Tools',
  description:
    'Learn about the DocuNexa mission, client-side browser architecture, educational textbook tools, and our commitment to accessible, free document utilities.',
  alternates: {
    canonical: 'https://docunexa.pro.et/about',
  },
};

export default function AboutPage() {
  const values = [
    {
      title: 'Client-Side Processing',
      desc: 'All 34 document tools execute directly in your browser memory using WebAssembly and Web Workers. Your files are not uploaded to remote servers for processing.',
      icon: Lock,
    },
    {
      title: 'Built for Education & Students',
      desc: 'Created with students, teachers, and researchers in mind, making massive multi-chapter textbooks manageable as modular unit PDFs through PDF Unit Cutter.',
      icon: BookOpen,
    },
    {
      title: 'Lossless Vector Precision',
      desc: 'Our slicing and PDF manipulation engines preserve embedded fonts, vector illustrations, and print resolutions without rasterizing to degraded images.',
      icon: Zap,
    },
    {
      title: '100% Free & Open Access',
      desc: 'Essential document productivity tools should be universally accessible to everyone worldwide without paywalls, subscriptions, or artificial daily quotas.',
      icon: Heart,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <span>Our Mission & Technology</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Every PDF tool. One simple, private workspace.
          </h1>
          <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
            DocuNexa is a completely free online document workspace designed to deliver fast, private, and reliable PDF utilities directly inside modern web browsers.
          </p>
        </div>

        {/* What DocuNexa Is */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            What is DocuNexa?
          </h2>
          <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              DocuNexa provides a comprehensive suite of 34 PDF and document tools categorized into Organize, Optimize, Convert to PDF, Convert from PDF, Edit PDF, PDF Security, and Document Intelligence. Its flagship feature, <strong>PDF Unit Cutter</strong>, solves a common academic frustration by automatically analyzing educational textbook structures (including outlines and Tables of Contents) to slice multi-hundred-page textbooks into neatly structured chapter units.
            </p>
            <p>
              Unlike traditional online PDF services that upload your files to remote cloud servers for conversion, DocuNexa was architected to run document transformations locally in client-side browser memory.
            </p>
          </div>
        </div>

        {/* Core Values Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <div
              key={i}
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <v.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{v.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* What Client-Side Means & Technical Reality */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Cpu size={24} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Understanding Client-Side Document Processing
            </h2>
          </div>
          <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              When you use a tool on DocuNexa, your PDF or document is loaded into your web browser&apos;s local memory using standardized JavaScript APIs (such as <code>ArrayBuffer</code> and <code>Uint8Array</code>). Operations like page merging, splitting, watermarking, password encryption, and rotation are executed locally on your device using WebAssembly and Web Worker threads.
            </p>
            <p>
              Because processing occurs locally, your documents are never uploaded to a DocuNexa server. Once you close your browser tab or clear the workspace, the loaded document data is cleared from memory.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Technical Limitations & Honest Boundaries
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Device Memory Limits:</strong> Extremely large documents (e.g. multi-gigabyte files) depend on your device&apos;s available RAM. Modern desktop browsers handle 500MB+ documents with ease, but mobile devices with limited RAM may experience memory constraints.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Visual Signatures vs. Cryptographic Certificates:</strong> The Sign PDF tool stamps a visual signature appearance (drawn, typed, or uploaded) onto document pages. It does not issue or sign with X.509 cryptographic digital certificates.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Visual Blackouts vs. Low-Level Sanitization:</strong> The Redact PDF tool draws permanent opaque blackout vector overlays over chosen areas. For high-security redaction where underlying text streams must be scrubbed, desktop sanitization tools should be used.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Heuristic Summarization:</strong> The Document Summarizer uses local rule-based heuristics to extract key structural sections, overview sentences, and study prompts without sending document text to external AI or cloud LLM APIs.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* External Resources & Data Handling */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            External Resources & Technical Network Behavior
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            DocuNexa strictly separates user document processing from external resource downloads:
          </p>
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">A. Document Processing (Local Only):</p>
              <p>
                Document bytes remain entirely in browser memory (ArrayBuffer/Uint8Array). All operations—including parsing, unit detection, page extraction, password encryption, and optical character analysis—execute locally inside your browser or Web Worker. Your documents are never uploaded to remote servers for processing.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">B. On-Demand OCR Language Data Retrieval:</p>
              <p>
                When using OCR PDF, Tesseract.js may retrieve required public language trained data models (such as English or Amharic <code>.traineddata.gz</code>) from standard open-source CDN repositories (jsdelivr) on-demand when a language is first selected. The downloaded language file is cached locally in your browser so it is not re-downloaded repeatedly. This download is strictly a retrieval of public optical character recognition model weights; your PDF pages or images are NEVER transmitted externally.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">C. Other External Resources:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Google Fonts:</strong> Typography stylesheets and font files (Inter and JetBrains Mono) loaded from Google&apos;s font CDN (<code>fonts.googleapis.com</code> and <code>fonts.gstatic.com</code>).
                </li>
                <li>
                  <strong>Static Website Delivery:</strong> Standard web hosting delivery (e.g. edge CDN) to serve the static HTML, JavaScript, and CSS bundle of DocuNexa.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Free Model & Future Advertising */}
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl">
          <h2 className="text-xl font-bold">
            Why DocuNexa is Free & How It Is Maintained
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            DocuNexa is maintained as a free public utility. There are no paid plans, subscriptions, paywalls, or feature limits. To sustain hosting and development costs, DocuNexa may display non-intrusive advertisements in the future through reputable third-party advertising partners such as Google AdSense. Any future advertising integration will be deployed transparently without compromising the client-side document processing model.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold">
            <Link href="/privacy" className="text-brand-400 hover:text-brand-300 underline underline-offset-4">
              Read Our Privacy Policy
            </Link>
            <Link href="/terms" className="text-brand-400 hover:text-brand-300 underline underline-offset-4">
              Review Terms of Service
            </Link>
            <Link href="/security" className="text-brand-400 hover:text-brand-300 underline underline-offset-4">
              Explore Security Architecture
            </Link>
            <Link href="/contact" className="text-brand-400 hover:text-brand-300 underline underline-offset-4">
              Contact Maintainer
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 pt-4">
          <h3 className="text-xl font-bold">Ready to explore our tools?</h3>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
          >
            <span>Explore All 34 PDF Tools</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
