import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Lock, ShieldCheck, Cpu, Key, AlertTriangle, CheckCircle2, Server, EyeOff, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security & Vulnerability Disclosure — DocuNexa',
  description:
    'DocuNexa Security Architecture, Responsible Vulnerability Disclosure Policy, Safe Harbor terms for ethical security researchers, and incident response procedures.',
  alternates: {
    canonical: 'https://docunexa.pro.et/security-policy',
  },
};

const TOC = [
  { id: 'architecture', title: '1. Technical Security Architecture' },
  { id: 'in-memory', title: '2. In-Memory Volatile Processing' },
  { id: 'cryptography', title: '3. Cryptographic Standards: PDF AES Encryption vs. Decryption' },
  { id: 'safe-harbor', title: '4. Vulnerability Disclosure Safe Harbor' },
  { id: 'scope', title: '5. In-Scope & Out-of-Scope Targets' },
  { id: 'prohibited-testing', title: '6. Prohibited Security Testing Methods' },
  { id: 'reporting-format', title: '7. How to Submit a Vulnerability Report' },
  { id: 'remediation-sla', title: '8. Target Response & Remediation Timelines' },
  { id: 'account-security', title: '9. User Account Security Responsibilities' },
  { id: 'contact', title: '10. Security Operations Contact' },
];

export default function SecurityPolicyPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Security & Vulnerability Disclosure"
      subtitle="Details our client-side cryptography, in-memory isolation perimeters, and coordinated vulnerability disclosure guidelines."
      badge="Security & Trust"
      badgeIcon={Lock}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/security-policy"
      toc={TOC}
    >
      {/* 1. Architecture */}
      <section id="architecture" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Technical Security Architecture Overview
        </h2>
        <p>
          DocuNexa replaces risky, server-dependent cloud upload architectures with modern client-side execution.
          By compiling battle-tested open-source engines into WebAssembly (Wasm) and executing tools in browser threads,
          we eliminate the primary vulnerability of online document processors: <strong>the centralized document honeypot.</strong>
        </p>
      </section>

      {/* 2. In-Memory */}
      <section id="in-memory" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <Cpu size={20} className="text-brand shrink-0" />
          2. In-Memory Volatile Processing &amp; Data Movement Taxonomy
        </h2>
        <div className="p-5 rounded-md bg-surface border border-border space-y-3 text-xs sm:text-sm text-muted">
          <p>
            When a document is opened in DocuNexa, file bytes are read directly into volatile device RAM using standard Web APIs
            (<code>FileReader</code> and <code>Uint8Array</code> buffers).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>No temporary file scratchpads or caches are created on remote servers.</li>
            <li>Binary magic bytes (<code>%PDF-</code>) are checked prior to parsing to block disguised executables.</li>
            <li>Generated filenames are sanitized against path traversal characters (<code>/</code>, <code>\</code>, <code>:</code>, <code>*</code>, <code>?</code>, <code>&lt;</code>, <code>&gt;</code>, <code>|</code>).</li>
            <li>Allocated memory is reclaimed immediately upon closing the browser tab.</li>
          </ul>

          <div className="pt-2 border-t border-border space-y-2">
            <h4 className="font-bold text-ink">Document Isolation &amp; Data Flow Classification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-md bg-paper border border-border/60 space-y-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Category A: Pure Local Tools (33 of 34)</span>
                <p className="text-muted text-[11px]">
                  PDF Unit Cutter, Merge, Split, Compress, Encrypt, Decrypt, Forms, Conversions, etc. Zero outbound network traffic. 100% in-browser RAM.
                </p>
              </div>
              <div className="p-3 rounded-md bg-paper border border-border/60 space-y-1">
                <span className="font-bold text-blue-600 dark:text-blue-400 block">Category B: Local WebAssembly + Static Model (OCR PDF)</span>
                <p className="text-muted text-[11px]">
                  Tesseract.js WebAssembly downloads static open-source dictionary weights from jsDelivr CDN on first run. Zero document bytes or images leave your browser.
                </p>
              </div>
              <div className="p-3 rounded-md bg-paper border border-border/60 space-y-1">
                <span className="font-bold text-brand block">Category C: Local Heuristic Analysis (Summarizer &amp; Translate)</span>
                <p className="text-muted text-[11px]">
                  Deterministic structural heuristics &amp; local bilingual glossary. Zero text transmitted to third-party LLMs or cloud AI providers (OpenAI, Anthropic, Google).
                </p>
              </div>
              <div className="p-3 rounded-md bg-paper border border-border/60 space-y-1">
                <span className="font-bold text-muted block">Category D: Server File Storage (Zero Tools)</span>
                <p className="text-muted text-[11px]">
                  Zero S3 or cloud storage buckets. No server endpoint receives, inspects, or logs document file streams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cryptography */}
      <section id="cryptography" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <Key size={20} className="text-emerald-500 shrink-0" />
          3. Cryptographic Standards: PDF AES Encryption vs. Decryption
        </h2>
        <div className="p-4 rounded-md bg-paper border border-border/60 text-xs sm:text-sm text-ink space-y-2">
          <p className="font-bold text-ink flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-brand" />
            Precise Cryptographic Scope &amp; Algorithm Distinctions:
          </p>
          <p>
            DocuNexa does <strong>not</strong> encrypt all uploaded or processed PDFs with AES-256. When using standard editing tools (such as PDF Unit Cutter, Merge, Split, Rotate, or Compress), document bytes are processed in their normal unencrypted format within temporary typed array buffers (<code>Uint8Array</code>) in local device RAM and released when you close the tab.
          </p>
          <p>
            Furthermore, DocuNexa distinguishes <strong>PDF-standard ISO 32000 AES encryption</strong> from <strong>Web Crypto AES-GCM</strong>: DocuNexa does <em>not</em> use Web Crypto AES-GCM for document processing, as AES-GCM is an envelope authenticated cipher that is incompatible with standard PDF readers (Adobe Acrobat, Apple Preview, Google Chrome). Cryptographic operations are applied strictly and accurately according to their actual implementation:
          </p>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Protect PDF (ISO 32000-1 AES-256 Encryption):</strong> Applied exclusively when you choose the Protect PDF tool. DocuNexa invokes the <code>@pdfsmaller/pdf-encrypt</code> WebAssembly engine to compile standard ISO 32000 encryption dictionaries using <strong>AES-256 in Cipher Block Chaining (CBC) mode</strong> with SHA-256 / MD5 key derivation. Configurable user passwords (required to open) and owner permissions (restricting printing, extraction, and modification) are embedded client-side. The resulting document requires your password in all standard readers.
          </li>
          <li>
            <strong>Unlock PDF (Client-Side Decryption &amp; Protection Removal):</strong> When opening a password-protected PDF, DocuNexa verifies supplied authorization credentials and removes encryption dictionaries using <code>@pdfsmaller/pdf-decrypt</code> in browser RAM to output an unencrypted PDF. This is local decryption, not encryption. Passwords and decrypted file streams are never transmitted over the network.
          </li>
          <li>
            <strong>Server Hashing &amp; Token Cryptography:</strong> For non-document security functions (API rate-limiting, Bybit HMAC query signing, Telegram webhook validation, and daily analytics salt rotation), DocuNexa uses standard SHA-256 / HMAC-SHA256 digests.
          </li>
        </ul>
      </section>

      {/* 4. Safe Harbor */}
      <section id="safe-harbor" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Vulnerability Disclosure Safe Harbor
        </h2>
        <div className="p-5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 space-y-2">
          <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Safe Harbor for Ethical Security Researchers
          </p>
          <p>
            DocuNexa values the contributions of the global cybersecurity research community. If you conduct vulnerability research
            in good faith and in compliance with this policy, we consider your activities authorized. We will not pursue civil lawsuits
            or initiate criminal complaints against ethical researchers who respect these guidelines.
          </p>
        </div>
      </section>

      {/* 5. Scope */}
      <section id="scope" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. In-Scope &amp; Out-of-Scope Targets
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={15} /> In-Scope Targets
            </span>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>Production web application: <code>https://docunexa.pro.et</code></li>
              <li>Authentication &amp; Profile APIs (<code>/api/auth/*</code>)</li>
              <li>Payment &amp; Order verification logic (<code>/api/payments/*</code>)</li>
              <li>Admin security controls (<code>/api/admin/*</code>)</li>
              <li>Client-side PDF sandbox escapes or DOM injection</li>
            </ul>
          </div>

          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle size={15} /> Out-of-Scope
            </span>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>Third-party networks: Vercel CDN, Supabase cloud, Bybit exchange</li>
              <li>Distributed Denial of Service (DDoS/DoS)</li>
              <li>Social engineering, phishing, or physical attacks</li>
              <li>Third-party advertising scripts (Monetag)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Prohibited Testing */}
      <section id="prohibited-testing" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. Prohibited Security Testing Methods
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Never access, modify, or destroy another user&apos;s data or account.</li>
          <li>Never exploit a vulnerability beyond the minimal proof-of-concept necessary to demonstrate its presence.</li>
          <li>Never execute automated high-volume fuzzers or brute-force scripts against production authentication endpoints.</li>
          <li>Never disclose vulnerability details publicly before a fix has been verified and deployed by our team.</li>
        </ul>
      </section>

      {/* 7. Reporting Format */}
      <section id="reporting-format" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. How to Submit a Vulnerability Report
        </h2>
        <p>
          Submit reports by emailing{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand font-semibold hover:underline">
            docunexa.security@gmail.com
          </a>{' '}
          with the subject: <code>[Security Vulnerability Report] &lt;Title&gt;</code>. Include:
        </p>
        <div className="p-5 rounded-md bg-surface border border-border text-xs sm:text-sm font-mono text-ink space-y-1">
          <p>1. Vulnerability description and impact assessment (e.g. CSRF, IDOR, Auth Bypass, XSS)</p>
          <p>2. Affected endpoint or tool URL</p>
          <p>3. Step-by-step reproduction instructions</p>
          <p>4. Minimal non-destructive proof-of-concept (PoC) code or HTTP request dump</p>
          <p>5. Recommended mitigation or remediation steps</p>
        </div>
      </section>

      {/* 8. Target Remediation Timelines */}
      <section id="remediation-sla" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          8. Target Response &amp; Remediation Timelines (Non-SLA Estimates)
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          The following timeframes represent <strong>operational target estimates</strong> on a best-efforts basis, not guaranteed commercial Service Level Agreements (SLAs):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Target Initial Acknowledgment:</strong> Aimed within 24 to 48 business hours of receipt.</li>
          <li><strong>Target Triage &amp; Severity Assessment:</strong> Typically conducted within 2 to 3 business days.</li>
          <li><strong>Target High/Critical Remediation:</strong> Prioritized for fix deployment within 7 to 14 business days.</li>
          <li><strong>Target Medium/Low Remediation:</strong> Scheduled in routine maintenance releases within 30 business days.</li>
        </ul>
      </section>

      {/* 9. User Responsibilities */}
      <section id="account-security" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          9. User Account Security Responsibilities
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Platform security is a shared responsibility. We strongly encourage all users to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Use unique passwords for your DocuNexa account (never reuse passwords from other services).</li>
          <li>Ensure your registered email account is secured with multi-factor authentication (2FA).</li>
          <li>Never share your credentials with third parties or click unverified links.</li>
        </ul>
      </section>

      {/* 10. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          10. Security Operations Contact
        </h2>
        <div className="p-5 rounded-md bg-surface border border-border text-xs sm:text-sm font-mono text-ink space-y-1">
          <p><strong>Security Operations:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>PGP / Encryption:</strong> Inquiries requiring PGP encryption may request our public key via email.</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

