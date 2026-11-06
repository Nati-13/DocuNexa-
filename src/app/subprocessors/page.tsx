import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Server, ShieldCheck, CheckCircle2, ExternalLink, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subprocessors & Infrastructure — DocuNexa',
  description:
    'Official directory of third-party cloud service providers and subprocessors supporting DocuNexa hosting, authentication, and payment verification.',
  alternates: {
    canonical: 'https://docunexa.pro.et/subprocessors',
  },
};

const TOC = [
  { id: 'overview', title: '1. Subprocessor Policy Overview' },
  { id: 'zero-document-transfer', title: '2. Zero Document Transfer Guarantee' },
  { id: 'active-subprocessors', title: '3. List of Active Subprocessors' },
  { id: 'data-transfers', title: '4. International Data Transfers & Safeguards' },
  { id: 'updates', title: '5. Subprocessor Notification & Changes' },
  { id: 'contact', title: '6. Privacy & Vendor Inquiries' },
];

interface SubprocessorEntry {
  name: string;
  role: string;
  dataProcessed: string;
  location: string;
  website: string;
}

const SUBPROCESSORS: SubprocessorEntry[] = [
  {
    name: 'Vercel Inc.',
    role: 'Cloud Hosting & Edge Distribution',
    dataProcessed: 'HTTP request headers, transient routing logs, and coarse 2-letter country codes.',
    location: 'United States & Global Edge Network',
    website: 'https://vercel.com',
  },
  {
    name: 'Supabase Inc.',
    role: 'Managed Database & Authentication',
    dataProcessed: 'Optional user emails, encrypted password hashes, plan status, and payment order records.',
    location: 'United States / AWS Data Centers',
    website: 'https://supabase.com',
  },
  {
    name: 'Bybit Fintech Ltd',
    role: 'Cryptocurrency Deposit Verification API',
    dataProcessed: 'Public on-chain transaction hashes and Polygon PoS USDT deposit records.',
    location: 'International / Distributed',
    website: 'https://www.bybit.com',
  },
  {
    name: 'Aptos Labs',
    role: 'Decentralized Blockchain RPC & Indexer',
    dataProcessed: 'Public Aptos Mainnet fungible asset transfer records (on-chain public ledger).',
    location: 'International / Distributed',
    website: 'https://aptoslabs.com',
  },
  {
    name: 'Google LLC / Resend',
    role: 'Transactional Email Delivery',
    dataProcessed: 'Recipient email addresses for password reset verification tokens.',
    location: 'United States & Global',
    website: 'https://workspace.google.com',
  },
  {
    name: 'Monetag (Adsterra Network)',
    role: 'Third-Party Advertising (Free Plan Only)',
    dataProcessed: 'Advertising impression telemetry, anti-fraud cookies, and browser user-agent. (Completely disabled for Ad-Free users).',
    location: 'European Union / International',
    website: 'https://monetag.com',
  },
  {
    name: 'jsDelivr (ProspectOne SP. Z O.O.)',
    role: 'Open-Source Public CDN (OCR Model Weights)',
    dataProcessed: 'Public client-side download of compressed Tesseract OCR language traineddata dictionary files. Zero user documents or personal data transmitted.',
    location: 'Global CDN Network (EU / Cloudflare / Fastly)',
    website: 'https://www.jsdelivr.com',
  },
  {
    name: 'Google Fonts (Google LLC)',
    role: 'Web Font Delivery',
    dataProcessed: 'Standard browser font asset requests (Inter / JetBrains Mono) and user-agent string. Zero user documents or personal data transmitted.',
    location: 'United States & Global Edge Network',
    website: 'https://fonts.google.com',
  },
];

export default function SubprocessorsPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Subprocessors & Infrastructure"
      subtitle="Complete, transparent directory of third-party cloud infrastructure partners supporting the DocuNexa platform."
      badge="Cloud Infrastructure"
      badgeIcon={Server}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/subprocessors"
      toc={TOC}
    >
      {/* 1. Overview */}
      <section id="overview" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Subprocessor Policy Overview
        </h2>
        <p>
          To deliver reliable, high-performance, and secure services to users worldwide, DocuNexa engages third-party infrastructure
          and service providers (&quot;Subprocessors&quot;).
        </p>
        <p>
          We hold all vendors to stringent security, privacy, and compliance standards. This page provides a transparent list of all
          entities that process data on behalf of DocuNexa.
        </p>
      </section>

      {/* 2. Zero Document Transfer Guarantee */}
      <section id="zero-document-transfer" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. Zero Document Transfer Guarantee &amp; Data Classification
        </h2>
        <div className="p-5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 space-y-3">
          <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <ShieldCheck size={16} />
            No Subprocessor Receives Your Document Files, Extracted Text, or Page Images
          </p>
          <p className="leading-relaxed">
            Because DocuNexa executes all 34 PDF utilities locally in your web browser memory (via WebAssembly and PDF.js),
            <strong> NO third-party subprocessor or cloud vendor receives, processes, or stores your uploaded documents.</strong>
          </p>
          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              Technical Data Movement Breakdown:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-emerald-950 dark:text-emerald-100 text-xs">
              <li><strong>Original PDF Files:</strong> 0 bytes transmitted. Kept in volatile browser memory (<code>ArrayBuffer</code>).</li>
              <li><strong>Extracted Text &amp; Summaries:</strong> 0 bytes transmitted. Analyzed locally via deterministic heuristics (Document Summarizer) and local glossary (Translate PDF).</li>
              <li><strong>Canvas &amp; Page Previews:</strong> 0 bytes transmitted. Rendered on local HTML5 canvas elements.</li>
              <li><strong>Static Model Downloads (OCR):</strong> Tesseract.js fetches public language dictionary weights (<code>.traineddata.gz</code>) from jsDelivr CDN on first run. Zero document data is sent in return.</li>
              <li><strong>Zero External AI Subprocessors:</strong> DocuNexa does not engage OpenAI, Anthropic, Google Cloud Vertex AI, or any cloud LLM provider.</li>
            </ul>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            Subprocessors handle only serverless web hosting, optional account authentication, and cryptographic payment verification.
          </p>
        </div>
      </section>

      {/* 3. List */}
      <section id="active-subprocessors" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. List of Active Subprocessors
        </h2>
        <div className="space-y-4">
          {SUBPROCESSORS.map((sub, idx) => (
            <div
              key={idx}
              className="p-5 rounded-md bg-surface border border-border space-y-2 text-xs sm:text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <span className="font-bold text-ink text-base">
                  {sub.name}
                </span>
                <a
                  href={sub.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  <span>Visit Provider</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p><strong>Service Role:</strong> {sub.role}</p>
              <p className="text-muted">
                <strong>Data Categories:</strong> {sub.dataProcessed}
              </p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">
                <strong>Data Processing Location:</strong> {sub.location}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Data Transfers */}
      <section id="data-transfers" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. International Data Transfers &amp; Safeguards
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Where personal account metadata or technical telemetry crosses international borders, transfers are governed by
          Standard Contractual Clauses (SCCs), robust Data Processing Addenda (DPAs), and encryption in transit (TLS 1.3)
          and at rest (AES-256).
        </p>
      </section>

      {/* 5. Updates */}
      <section id="updates" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Subprocessor Notification &amp; Updates
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          DocuNexa periodically evaluates its vendor relationships to guarantee maximum performance and security.
          Material additions or replacements to this subprocessor directory will be published here with an updated effective date.
        </p>
      </section>

      {/* 6. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. Privacy &amp; Vendor Inquiries
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          For questions regarding our vendors or data processing addenda, contact:{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand font-semibold hover:underline">
            docunexa.security@gmail.com
          </a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

