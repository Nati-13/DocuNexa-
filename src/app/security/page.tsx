import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Key,
  EyeOff,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security & Privacy Architecture — DocuNexa',
  description:
    'Explore DocuNexa browser-based security architecture, in-memory PDF processing, AES-256 encryption, and verifiable technical boundaries.',
  alternates: {
    canonical: 'https://docunexa.pro.et/security',
  },
};

export default function SecurityPage() {
  const securityPillars = [
    {
      title: 'In-Memory Volatile Processing',
      desc: 'Files are read into local browser RAM (ArrayBuffer/Uint8Array) via standard Web APIs. No temporary files or caches are created on remote servers.',
      icon: Cpu,
    },
    {
      title: 'Standard AES-256 PDF Encryption',
      desc: 'Password protection implements standard AES-256 and AES-128 algorithms via WebAssembly (@pdfsmaller/pdf-encrypt). Passwords are never sent over the network.',
      icon: Key,
    },
    {
      title: 'MIME & Header Byte Validation',
      desc: 'All file drops undergo strict binary header inspection (e.g. verifying "%PDF-" magic bytes) to prevent corrupt files or disguised executables from loading.',
      icon: ShieldCheck,
    },
    {
      title: 'Automatic Filename Sanitization',
      desc: 'Output filenames automatically strip illegal filesystem characters (such as "/", "\\", ":", "*", "?", "<", ">", "|") to protect against path traversal.',
      icon: HardDrive,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Architecture & Standards</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Security & Privacy Architecture
          </h1>
          <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
            DocuNexa replaces risky cloud-upload workflows with client-side cryptography and in-browser WebAssembly execution.
          </p>
        </div>

        {/* Security Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {securityPillars.map((p, i) => (
            <div
              key={i}
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <p.icon size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{p.title}</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Deep Dive: How Encryption & Decryption Work */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock size={22} className="text-brand-600 dark:text-brand-400" />
            PDF Password Protection & Cryptography
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              When protecting a PDF document using our <strong>Protect PDF</strong> tool, DocuNexa applies the standard PDF encryption specification (ISO 32000) using client-side WebAssembly engines compiled from audited open-source libraries (<code>@pdfsmaller/pdf-encrypt</code>).
            </p>
            <p>
              Both user passwords (required to open and view the document) and owner passwords (used to manage modification permissions) are processed in local memory. The password string and the resulting encrypted document never traverse the network.
            </p>
            <p>
              Similarly, our <strong>Unlock PDF</strong> tool uses <code>@pdfsmaller/pdf-decrypt</code> to verify the provided password and remove standard encryption dictionaries directly inside the browser session.
            </p>
          </div>
        </div>

        {/* Honest Security Boundaries & Disclosures */}
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white space-y-6 shadow-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={22} className="text-amber-400" />
            <h2 className="text-2xl font-bold">Verifiable Technical Boundaries</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            We believe transparent engineering builds true trust. We explicitly document where client-side browser tools differ from enterprise desktop forensic software:
          </p>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h3 className="font-bold text-amber-300">
                1. Sign PDF: Visual Appearance Stamping
              </h3>
              <p className="text-slate-300 leading-relaxed">
                The Sign PDF tool allows users to draw, type, or upload a visual signature image and stamp it onto document pages. It is an appearance-placement utility and does <em>not</em> provide cryptographic digital signatures backed by X.509 PKI certificate authorities or cryptographic tamper-evident hashes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h3 className="font-bold text-amber-300">
                2. Redact PDF: Visual Blackout Rectangles
              </h3>
              <p className="text-slate-300 leading-relaxed">
                The Redact PDF tool draws opaque, permanent vector blackout rectangles directly into the PDF content stream over user-selected coordinates. While this completely obscures the text visually from screen rendering and printing, it does not strip low-level binary text streams embedded in raw font dictionaries. For classified government or medical redaction, specialized forensic sanitizers should be used.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h3 className="font-bold text-amber-300">
                3. PDF/A Metadata Preparation
              </h3>
              <p className="text-slate-300 leading-relaxed">
                The PDF to PDF/A tool injects ISO 19005-1 (PDF/A-1b) metadata markers and color profiles. It is marked as experimental because full pre-press compliance validation requires desktop preflight verification software.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h3 className="font-bold text-amber-300">
                4. Local Document Summarization
              </h3>
              <p className="text-slate-300 leading-relaxed">
                The Document Summarizer uses deterministic rule-based algorithms to analyze headings, paragraph boundaries, and key sentences directly in your browser. It does not send your document data to external cloud LLM providers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h3 className="font-bold text-amber-300">
                5. OCR Language Data Retrieval vs. Document Processing
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Optical character recognition (OCR PDF) analyzes document pages locally in your browser using a Tesseract.js WebAssembly worker. To execute recognition, the engine retrieves required public language model files (such as English or Amharic <code>.traineddata.gz</code>) on-demand from the public jsDelivr CDN repository into local browser cache/IndexedDB. Document pages, rendered canvas pixels, and extracted text never leave your device.
              </p>
            </div>
          </div>
        </div>

        {/* External Resources & Technical Boundaries */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            External Network Resources & Boundaries
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

        {/* Security Best Practices */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Recommended Security Practices for Users
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Always verify the SSL lock in your address bar: <code>https://docunexa.pro.et</code>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Use strong, unique passwords when protecting sensitive documents.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Close your browser tab when finished to immediately free document buffers from device RAM.</span>
            </li>
          </ul>
        </div>

        {/* Navigation Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-brand-600 dark:text-brand-400 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-brand-600 dark:text-brand-400 hover:underline">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-brand-600 dark:text-brand-400 hover:underline">
              Contact Maintainer
            </Link>
          </div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-brand-600 dark:text-brand-400 hover:underline"
          >
            <span>Explore All 34 PDF Tools</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
