import React from 'react';
import Link from 'next/link';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { ShieldCheck, Scale } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface text-muted border-t border-border transition-colors">
      {/* Top Banner: Privacy Promise */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-b border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-md bg-paper border border-border">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-base font-semibold text-ink">Privacy-First Architecture</h4>
              <p className="text-xs text-muted mt-0.5">
                Document operations for supported client-side tools run directly in your browser. Your files are not uploaded to or stored on remote servers.
              </p>
            </div>
          </div>
          <Link
            href="/security-policy"
            className="px-4 py-2 rounded-md bg-brand hover:bg-brand/90 text-brand-fg text-xs font-semibold shrink-0 transition-colors"
          >
            Learn About Our Architecture
          </Link>
        </div>
      </div>

      {/* Main Directory Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <DocuNexaLogo size="md" showTagline={false} />
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              Every PDF tool. One simple workspace. Split textbooks into units, merge, convert, edit, compress, and secure your documents with client-side browser processing.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5 text-brand font-medium">
                <span className="w-2 h-2 rounded-full bg-brand" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-ink">
              Platform & Trust
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools" className="hover:text-ink transition-colors">
                  All 34 PDF Tools
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-unit-cutter" className="text-brand hover:underline font-semibold transition-colors">
                  PDF Unit Cutter
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-ink transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-ink transition-colors">
                  About DocuNexa
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-ink transition-colors">
                  Security & Architecture
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-brand hover:underline font-semibold transition-colors">
                  Support Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-ink transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="https://t.me/docunexa_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline font-semibold transition-colors"
                >
                  Telegram (@docunexa_bot)
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Scale size={14} className="text-brand" />
              Legal & Policy
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/legal" className="text-brand hover:underline font-semibold transition-colors">
                  Legal Policy Center
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-ink transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-ink transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-ink transition-colors">
                  Refund & Cancellation
                </Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-ink transition-colors">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link href="/payment-policy" className="hover:text-ink transition-colors">
                  Payment & Crypto Policy
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-ink transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/copyright-policy" className="hover:text-ink transition-colors">
                  Copyright & IP
                </Link>
              </li>
              <li>
                <Link href="/security-policy" className="hover:text-ink transition-colors">
                  Security & Vulnerability
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-ink transition-colors">
                  Accessibility
                </Link>
              </li>
              <li>
                <Link href="/subprocessors" className="hover:text-ink transition-colors">
                  Subprocessors
                </Link>
              </li>
            </ul>
          </div>

          {/* Edit & Security */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-ink">
              Edit & Secure
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/rotate-pdf" className="hover:text-ink transition-colors">
                  Rotate PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/add-watermark" className="hover:text-ink transition-colors">
                  Add Watermark
                </Link>
              </li>
              <li>
                <Link href="/tools/add-page-numbers" className="hover:text-ink transition-colors">
                  Add Page Numbers
                </Link>
              </li>
              <li>
                <Link href="/tools/protect-pdf" className="hover:text-ink transition-colors">
                  Protect PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/unlock-pdf" className="hover:text-ink transition-colors">
                  Unlock PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/sign-pdf" className="hover:text-ink transition-colors">
                  Sign PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/compress-pdf" className="hover:text-ink transition-colors">
                  Compress PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Organize & Convert */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-ink">
              Organize & Convert
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/merge-pdf" className="hover:text-ink transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/split-pdf" className="hover:text-ink transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-to-word" className="hover:text-ink transition-colors">
                  PDF to Word
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-to-excel" className="hover:text-ink transition-colors">
                  PDF to Excel
                </Link>
              </li>
              <li>
                <Link href="/tools/pdf-to-jpg" className="hover:text-ink transition-colors">
                  PDF to JPG
                </Link>
              </li>
              <li>
                <Link href="/tools/jpg-to-pdf" className="hover:text-ink transition-colors">
                  JPG to PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-summarizer" className="hover:text-ink transition-colors">
                  Document Summarizer
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-border text-xs text-muted flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} DocuNexa International. All rights reserved. Your documents remain 100% your property.</p>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link href="/legal" className="text-brand hover:underline font-medium transition-colors">
            Legal Center
          </Link>
          <Link href="/terms-of-service" className="hover:text-ink transition-colors">
            Terms
          </Link>
          <Link href="/privacy-policy" className="hover:text-ink transition-colors">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-ink transition-colors">
            Refunds
          </Link>
          <Link href="/payment-policy" className="hover:text-ink transition-colors">
            Payment Terms
          </Link>
          <Link href="/security-policy" className="hover:text-ink transition-colors">
            Security
          </Link>
          <Link href="/accessibility" className="hover:text-ink transition-colors">
            Accessibility
          </Link>
          <Link href="/terms" className="hidden" aria-hidden="true">
            Terms
          </Link>
          <Link href="/privacy" className="hidden" aria-hidden="true">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
};
