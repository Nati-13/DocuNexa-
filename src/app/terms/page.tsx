import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Scale,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — DocuNexa',
  description:
    'Read the DocuNexa Terms of Service governing the use of our free, client-side PDF and document processing tools.',
  alternates: {
    canonical: 'https://docunexa.pro.et/terms',
  },
};

export default function TermsPage() {
  const lastUpdated = 'September 30, 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <Scale size={14} />
            <span>Usage Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            DocuNexa Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated} • Canonical Domain:{' '}
            <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
              https://docunexa.pro.et
            </a>
          </p>
        </div>

        {/* Introduction Notice */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-brand-500" />
            Terms Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Please read these Terms of Service (&quot;Terms&quot;) carefully before using DocuNexa (
            <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
              https://docunexa.pro.et
            </a>
            ). By accessing or using our website and browser-based tools, you agree to be bound by these Terms. DocuNexa is operated as an independent, free software productivity project.
          </p>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-10 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              1. Description of the Service
            </h2>
            <p>
              DocuNexa provides a collection of 34 client-side PDF and document processing tools, including PDF Unit Cutter, page merging, splitting, compression, conversion, page numbering, watermarking, password encryption, and local document analysis.
            </p>
            <p>
              DocuNexa is offered as a <strong>free service</strong>. No payment, credit card, subscription, or user registration is required to use any of the available tools.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              2. Permitted Use & Fair Access
            </h2>
            <p>
              You may use DocuNexa for lawful personal, academic, non-commercial, and commercial purposes, including organizing study materials, preparing reports, formatting publications, and securing document workflows.
            </p>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>Use the service to distribute malware, viruses, malicious scripts, or corrupted files.</li>
              <li>Attempt to reverse-engineer, disrupt, or launch denial-of-service attacks against DocuNexa hosting infrastructure.</li>
              <li>Use automated scripts or scrapers in an abusive manner that degrades website availability for other visitors.</li>
              <li>Misrepresent DocuNexa output as certified legal, forensic, or notary documents where technical limitations apply.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              3. User Content & Intellectual Property Responsibility
            </h2>
            <p>
              You retain all ownership, intellectual property rights, and copyright to the documents and files you load into DocuNexa. Because DocuNexa processes your files locally inside your browser, we do not claim any copyright, license, or ownership over your uploaded or generated documents.
            </p>
            <p>
              You are solely responsible for ensuring that you possess the necessary rights, permissions, or fair-use authorizations to modify, split, merge, convert, or extract pages from the documents you process.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              4. Technical Limitations & Output Verification
            </h2>
            <p>
              While DocuNexa tools are engineered for precision and fidelity, document rendering, conversion, and parsing depend on file structures, font embeddings, and browser capabilities:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>
                <strong>Verification:</strong> You should verify the completeness and accuracy of generated files before relying on them for critical academic, legal, financial, or archiving purposes.
              </li>
              <li>
                <strong>Signatures:</strong> The Sign PDF tool places a visual appearance stamp on a document. It does not provide cryptographic digital certificates (X.509 PKI) or document tampering verification.
              </li>
              <li>
                <strong>Redactions:</strong> The Redact PDF tool draws visual blackout vector rectangles. It is designed for visual censorship and does not scrub low-level underlying font stream binaries.
              </li>
              <li>
                <strong>Local Summaries:</strong> The Document Summarizer uses rule-based heuristic extraction to identify key sections. It does not replace comprehensive human review of technical documents.
              </li>
              <li>
                <strong>Device Memory:</strong> Because processing runs in-browser, file sizes and performance are bounded by your device&apos;s available RAM.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              5. Advertising & Third-Party Links
            </h2>
            <p>
              DocuNexa may display third-party advertisements (such as Google AdSense) in the future to help fund infrastructure and ongoing maintenance. DocuNexa does not endorse or assume responsibility for products, content, or services advertised by third parties. Your interactions with third-party advertisers are governed solely by their respective terms and privacy policies.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              6. Disclaimer of Warranties
            </h2>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <p>
                DOCUNEXA IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, LOSS OF DATA, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, BUG-FREE, OR FULLY COMPATIBLE WITH EVERY CORRUPTED OR CUSTOM PDF FORMAT.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              7. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law, DocuNexa and its maintainer shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of or in connection with your use of or inability to use the service.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              8. Modifications to Service & Terms
            </h2>
            <p>
              We reserve the right to modify, improve, or temporarily suspend any tool or feature at any time without prior notice. These Terms may also be updated periodically. Your continued use of DocuNexa following any modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              9. Contact & Inquiries
            </h2>
            <p>
              For any questions regarding these Terms of Service or tool usage, please reach out to the project maintainer:
            </p>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs sm:text-sm">
              <p>
                <strong>Email Contact:</strong>{' '}
                <a href="mailto:natanemyalew10@gmail.com" className="text-brand-600 dark:text-brand-400 hover:underline">
                  natanemyalew10@gmail.com
                </a>
              </p>
              <p>
                <strong>GitHub Repository:</strong>{' '}
                <a
                  href="https://github.com/Nati-13/DocuNexa-"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 dark:text-brand-400 hover:underline"
                >
                  https://github.com/Nati-13/DocuNexa-
                </a>
              </p>
              <p>
                <strong>Contact Page:</strong>{' '}
                <Link href="/contact" className="text-brand-600 dark:text-brand-400 hover:underline">
                  Visit /contact
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
