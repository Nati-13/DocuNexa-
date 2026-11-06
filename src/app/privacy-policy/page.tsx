import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { ShieldCheck, Lock, CheckCircle2, EyeOff, ServerOff, Cookie, Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — DocuNexa',
  description:
    'Comprehensive international Privacy Policy for DocuNexa. Learn how client-side in-browser PDF processing ensures zero document uploads and how your personal data is protected.',
  alternates: {
    canonical: 'https://docunexa.pro.et/privacy-policy',
  },
};

const TOC = [
  { id: 'introduction', title: '1. Introduction & Philosophy' },
  { id: 'zero-uploads', title: '2. Client-Side Processing Guarantee' },
  { id: 'data-collected', title: '3. Information We Collect' },
  { id: 'uploaded-files', title: '4. Handling of Uploaded PDF Files' },
  { id: 'analytics', title: '5. Privacy-Preserving Analytics' },
  { id: 'cookies', title: '6. Cookies & Local Browser Storage' },
  { id: 'payments', title: '7. Payment Data & Transaction Records' },
  { id: 'email-support', title: '8. Email & Support Communications' },
  { id: 'third-parties', title: '9. Third-Party Service Providers' },
  { id: 'retention-deletion', title: '10. Data Retention & Account Deletion' },
  { id: 'security-measures', title: '11. Technical & Organizational Security' },
  { id: 'international-transfers', title: '12. International Data Transfers' },
  { id: 'gdpr-rights', title: '13. European GDPR & UK GDPR Rights' },
  { id: 'california-rights', title: '14. California Privacy Rights (CCPA / CPRA)' },
  { id: 'children', title: '15. Children’s Privacy (COPPA & Global Standards)' },
  { id: 'breach-notification', title: '16. Security Incidents & Breach Notification' },
  { id: 'updates', title: '17. Changes to this Privacy Policy' },
  { id: 'contact', title: '18. Data Protection Officer & Contact' },
];

export default function PrivacyPolicyPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Complete disclosure of our zero-document-upload architecture, minimal data collection, privacy-preserving analytics, and international rights."
      badge="Privacy & Trust"
      badgeIcon={ShieldCheck}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/privacy-policy"
      toc={TOC}
    >
      {/* 1. Introduction & Philosophy */}
      <section id="introduction" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Introduction & Privacy Philosophy
        </h2>
        <p>
          DocuNexa (&quot;DocuNexa&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides an international suite of client-side PDF productivity tools.
          We believe that privacy is a fundamental human right. Our fundamental engineering principle is simple:
          <strong> the most secure data is the data we never collect.</strong>
        </p>
        <p>
          This Privacy Policy explains the specific types of data collected when you visit{' '}
          <a href="https://docunexa.pro.et" className="text-brand hover:underline">
            https://docunexa.pro.et
          </a>, how optional account information is stored, and how your privacy is protected under global frameworks including the EU General Data Protection Regulation (GDPR), the UK GDPR, and the California Consumer Privacy Act (CCPA/CPRA).
        </p>
      </section>

      {/* 2. Client-Side Processing Guarantee */}
      <section id="zero-uploads" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. The Client-Side In-Memory Processing Guarantee &amp; Data Movement Taxonomy
        </h2>
        <div className="p-5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 space-y-3">
          <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
            <ServerOff size={18} className="shrink-0" />
            <span>Zero Document Uploads to Cloud Servers</span>
          </div>
          <p className="leading-relaxed">
            When you use DocuNexa&apos;s PDF utilities (including PDF Unit Cutter, Merge, Split, Compress, Protect, Unlock, Sign, Redact, OCR, and Conversions),
            <strong> your PDF documents and file contents are processed entirely inside your local device RAM</strong> via modern WebAssembly (Wasm) and JavaScript.
          </p>
          <p className="leading-relaxed">
            DocuNexa does NOT upload, transfer, cache, inspect, or retain your document files on our cloud servers or database.
            No remote server ever reads or stores your confidential documents.
          </p>
        </div>
      </section>

      {/* 3. Information We Collect */}
      <section id="data-collected" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. Information We Collect
        </h2>
        <p>
          Because our tools run client-side, we collect only the minimal data strictly necessary to operate the website, manage optional user accounts, and prevent fraud:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Optional Account Credentials:</strong> If you register an account (e.g. to purchase the Ad-Free upgrade), we collect your email address and an encrypted password hash managed securely via Supabase Auth. We never see or store plaintext passwords.
          </li>
          <li>
            <strong>Account Profile:</strong> Your account identifier (UUID), plan status (<code>free</code> or <code>ad_free</code>), creation timestamp, and policy acceptance records (terms version and timestamp).
          </li>
          <li>
            <strong>Payment Records:</strong> Unique order identifiers, designated USDT amount, target blockchain network (Polygon or Aptos), transaction hash, and on-chain confirmation timestamps. We do NOT collect credit card numbers, bank account numbers, or wallet private keys.
          </li>
          <li>
            <strong>Support Communications:</strong> Inquiries submitted via our contact form or support center, including your name, email address, category, and message text.
          </li>
          <li>
            <strong>Technical Log Data:</strong> Ephemeral HTTP server logs generated by our hosting provider (Vercel) containing standard request headers, browser user-agent, and coarse IP routing details used solely for DDoS prevention and network security.
          </li>
        </ul>
      </section>

      {/* 4. Handling of Uploaded PDF Files & Data Movement Taxonomy */}
      <section id="uploaded-files" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Handling of Uploaded PDF Files &amp; Technical Data Movement Taxonomy
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          To ensure complete technical transparency, DocuNexa strictly classifies all 34 tools into distinct data movement tiers:
        </p>
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-md bg-surface border border-border space-y-1.5">
            <h4 className="font-bold text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Category A: 100% Pure Local In-Memory Tools (33 of 34 Tools)
            </h4>
            <p className="text-muted leading-relaxed">
              PDF Unit Cutter, Merge, Split, Remove Pages, Extract Pages, Rotate, Add Page Numbers, Watermark, Compress, Protect, Unlock, Sign, Redact, Compare, Crop, Flatten, Repair, Reorder, Grayscale, Invert, N-Up, Resize, Extract Images, Images to PDF, PDF to Images, PDF Forms, PDF to Word, PDF to Excel, PDF to PowerPoint, PDF to Markdown, Office to PDF, and Extract Text execute 100% inside your local device RAM. <strong>Zero bytes of original files, extracted text, or rendered images are ever transmitted over the network.</strong>
            </p>
          </div>

          <div className="p-4 rounded-md bg-surface border border-border space-y-1.5">
            <h4 className="font-bold text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Category B: Local WebAssembly with Public Static Model Download (1 Tool: OCR PDF)
            </h4>
            <p className="text-muted leading-relaxed">
              Optical Character Recognition runs locally in a browser Web Worker via Tesseract.js WebAssembly. On first use, the engine downloads public, open-source language dictionary weights (<code>.traineddata.gz</code>) from the public jsDelivr CDN repository into local browser cache. <strong>Crucial Distinction:</strong> This is an inbound download of public static model files. <strong>ZERO user document bytes, canvas pixels, or recognized transcript text are transmitted to jsDelivr or any third-party server.</strong>
            </p>
          </div>

          <div className="p-4 rounded-md bg-surface border border-border space-y-1.5">
            <h4 className="font-bold text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand text-brand-fg" />
              Category C: Local Heuristic Intelligence Tools (Document Summarizer &amp; Translate PDF)
            </h4>
            <p className="text-muted leading-relaxed">
              Our Document Summarizer and Translate PDF tools operate using 100% deterministic, rule-based heuristics and local dictionary lookup directly in browser memory. <strong>They do NOT transmit document files, extracted text, or prompts to external Large Language Models (LLMs) or third-party cloud AI APIs (such as OpenAI, Anthropic, or Google Gemini).</strong>
            </p>
          </div>

          <div className="p-4 rounded-md bg-surface border border-border space-y-1.5">
            <h4 className="font-bold text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Category D: Server-Side File Storage &amp; Transmission (Zero Tools)
            </h4>
            <p className="text-muted leading-relaxed">
              DocuNexa maintains <strong>zero cloud storage buckets</strong> for user documents (no Amazon S3, Google Cloud Storage, or Supabase Storage). No server endpoint accepts or logs document file streams. When your browser session terminates, all volatile buffers are permanently reclaimed by your operating system.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Privacy-Preserving Analytics */}
      <section id="analytics" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Privacy-Preserving Analytics Architecture
        </h2>
        <p>
          DocuNexa operates a first-party, privacy-preserving analytics tracker designed to monitor page views and tool popularity without profiling individuals:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Cryptographic Visitor Salt:</strong> Visitor hashes are generated using HMAC-SHA256 combining a server-only salt (<code>ANALYTICS_SALT</code>), the daily date, the user-agent, and the client IP address.
          </li>
          <li>
            <strong>No Raw IP Storage:</strong> Raw IP addresses are NEVER written to our database. Hashes rotate automatically every 24 hours, preventing cross-day behavioral tracking or user profiling.
          </li>
          <li>
            <strong>Coarse Country Code:</strong> We record a high-level 2-letter country code (derived from Vercel edge headers) to gauge global tool traffic without identifying physical cities or coordinates.
          </li>
        </ul>
      </section>

      {/* 6. Cookies & Local Browser Storage */}
      <section id="cookies" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. Cookies & Local Browser Storage
        </h2>
        <p>
          Our use of cookies is detailed in our companion <Link href="/cookie-policy" className="text-brand hover:underline">Cookie Policy</Link>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Essential Authentication Cookies:</strong> <code>sb-*-auth-token</code> cookies issued by Supabase Auth to maintain secure authenticated sessions for logged-in users.</li>
          <li><strong>Local Browser Storage:</strong> HTML5 <code>localStorage</code> is used to persist your dark/light theme preference and UI workspace states. No personal trackers are placed in local storage.</li>
          <li><strong>Advertising Cookies (Free Plan Only):</strong> For non-upgraded users, third-party advertising scripts (Monetag) may place cookies to prevent ad fraud and serve relevant ad impressions. Upgrading to Ad-Free ($2 one-time) completely disables all advertising scripts.</li>
        </ul>
      </section>

      {/* 7. Payment Data & Transaction Records */}
      <section id="payments" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. Payment Data & Transaction Records
        </h2>
        <p>
          When you purchase the Ad-Free upgrade, payment verification occurs on public decentralized blockchains (Polygon PoS or Aptos Mainnet):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Public blockchain transactions are immutable and publicly auditable by design. When you send funds, your originating wallet address and transaction hash become part of the public ledger.</li>
          <li>DocuNexa records the order metadata in our secure database to verify payment receipt and grant permanent ad-free status to your account.</li>
          <li>We never request or store your seed phrases, private keys, or personal banking details.</li>
        </ul>
      </section>

      {/* 8. Email & Support Communications */}
      <section id="email-support" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          8. Email & Support Communications
        </h2>
        <p>
          If you request a password reset or submit a support ticket:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Password reset verification tokens are delivered to your registered email address via secure SMTP. Tokens expire automatically after 15 minutes.</li>
          <li>Support tickets and Telegram support interactions are retained strictly to assist in resolving technical problems or payment discrepancies. We do not send marketing newsletters or spam.</li>
        </ul>
      </section>

      {/* 9. Third-Party Service Providers */}
      <section id="third-parties" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          9. Third-Party Service Providers (Subprocessors)
        </h2>
        <p>
          To maintain high availability and security worldwide, DocuNexa relies on trusted cloud infrastructure partners listed in our{' '}
          <Link href="/subprocessors" className="text-brand hover:underline">
            Subprocessors Directory
          </Link>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Vercel Inc. (USA / Global CDN):</strong> Serverless application hosting, edge SSL termination, and static asset distribution.</li>
          <li><strong>Supabase Inc. (USA / AWS EU/US):</strong> Managed PostgreSQL database, authentication, and Row Level Security (RLS).</li>
          <li><strong>Bybit Fintech Ltd:</strong> Read-only server-to-server V5 API queries to verify Polygon PoS USDT deposits.</li>
          <li><strong>Aptos Labs:</strong> Public decentralized indexer GraphQL queries to verify Aptos Mainnet USDT transfers.</li>
          <li><strong>Google Workspace / SMTP:</strong> Transactional password recovery and security notification dispatch.</li>
          <li><strong>jsDelivr CDN (ProspectOne SP. Z O.O.):</strong> Open-source public CDN utilized solely for client-side download of static OCR dictionary model weights. Zero document data transmitted.</li>
          <li><strong>Google Fonts (Google LLC):</strong> Static web typography asset delivery. Zero document data transmitted.</li>
          <li><strong>Zero Third-Party AI Subprocessors:</strong> DocuNexa does NOT engage OpenAI, Anthropic, Google Gemini API, or any external generative AI subprocessor to analyze or process user documents.</li>
        </ul>
      </section>

      {/* 10. Data Retention & Account Deletion */}
      <section id="retention-deletion" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          10. Data Retention & Account Deletion
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Document Files:</strong> 0 seconds. Files are purged immediately from volatile memory when the browser session terminates.</li>
          <li><strong>Analytics Events:</strong> Visitor hashes are unrecoverable after 24 hours due to rotating daily salt hashing. Aggregated anonymous counts are retained for historical traffic graphs.</li>
          <li><strong>Account Data:</strong> Retained until you request account deletion. Upon deletion, your profile row and linked support tickets are permanently erased.</li>
          <li><strong>Financial Audit Logs:</strong> Payment order records and on-chain transaction hashes are retained for tax, accounting, and anti-fraud compliance for up to 7 years.</li>
        </ul>
      </section>

      {/* 11. Technical & Organizational Security */}
      <section id="security-measures" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          11. Technical & Organizational Security Measures
        </h2>
        <p>
          We employ multi-layered security controls documented in our{' '}
          <Link href="/security-policy" className="text-brand hover:underline">
            Security Policy
          </Link>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>HTTPS enforcement with TLS 1.3 encryption across all public web traffic.</li>
          <li>Strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Frame-Options: DENY, and X-Content-Type-Options: nosniff headers.</li>
          <li>Row Level Security (RLS) on all database tables ensuring users can only read their own profile and order data.</li>
          <li>Standard AES-256 and AES-128 client-side PDF encryption engines executing in WebAssembly.</li>
          <li>Filtration of dangerous binary magic bytes and automatic sanitization of output filenames to protect against path traversal attacks.</li>
        </ul>
      </section>

      {/* 12. International Data Transfers */}
      <section id="international-transfers" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          12. International Data Transfers
        </h2>
        <p>
          DocuNexa operates globally. Where optional account information or technical logs are processed by our cloud infrastructure providers
          in the United States or other jurisdictions, transfers are safeguarded under Standard Contractual Clauses (SCCs) and robust data processing agreements.
        </p>
      </section>

      {/* 13. European GDPR & UK GDPR Rights */}
      <section id="gdpr-rights" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          13. European Union (GDPR) & United Kingdom Privacy Rights
        </h2>
        <p>
          If you reside in the European Economic Area (EEA) or the United Kingdom, you have comprehensive statutory rights under the GDPR:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Right of Access (Art. 15 GDPR):</strong> Request a copy of your personal data stored in our systems.</li>
          <li><strong>Right to Rectification (Art. 16 GDPR):</strong> Request correction of inaccurate or incomplete personal records.</li>
          <li><strong>Right to Erasure / &quot;Right to be Forgotten&quot; (Art. 17 GDPR):</strong> Request permanent deletion of your account and personal data.</li>
          <li><strong>Right to Restriction of Processing (Art. 18 GDPR):</strong> Request restriction of processing under certain legal conditions.</li>
          <li><strong>Right to Data Portability (Art. 20 GDPR):</strong> Receive your personal data in a structured, machine-readable JSON format.</li>
          <li><strong>Right to Object (Art. 21 GDPR):</strong> Object to processing based on legitimate interests.</li>
          <li><strong>Right to Lodge a Complaint:</strong> File a grievance with your national data protection supervisory authority.</li>
        </ul>
        <p className="text-xs text-muted">
          To exercise any of these rights, email your request to <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a>. We respond to all verified requests within thirty (30) days without charge.
        </p>
      </section>

      {/* 14. California Privacy Rights (CCPA / CPRA) */}
      <section id="california-rights" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          14. California Privacy Rights (CCPA / CPRA)
        </h2>
        <p>
          For residents of California under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>We Do Not Sell Personal Information:</strong> DocuNexa does not sell, rent, or trade your personal information or document contents to third parties for monetary or commercial consideration.</li>
          <li><strong>Right to Know & Delete:</strong> You have the right to request disclosure of categories of personal information collected and to request deletion of personal information.</li>
          <li><strong>Non-Discrimination:</strong> We will never discriminate against you (by denying services, charging different rates, or altering quality) for exercising your California privacy rights.</li>
        </ul>
      </section>

      {/* 15. Children’s Privacy */}
      <section id="children" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          15. Children&apos;s Privacy (COPPA & Global Safeguards)
        </h2>
        <p>
          DocuNexa is not directed to children under 13 years of age (or under 16 in certain jurisdictions).
          We do not knowingly collect personal information from children. If we discover that an account has been registered by a child
          without verified parental consent, we will promptly delete the associated records.
        </p>
      </section>

      {/* 16. Security Incidents & Breach Notification */}
      <section id="breach-notification" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          16. Security Incidents & Breach Notification
        </h2>
        <p>
          Because DocuNexa processes documents client-side without storing user files, a cloud server breach cannot expose user documents.
          In the event of an incident affecting account credentials or payment metadata, DocuNexa will notify affected users and relevant regulatory authorities within 72 hours of verification, in full accordance with applicable law.
        </p>
      </section>

      {/* 17. Changes to this Privacy Policy */}
      <section id="updates" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          17. Changes to this Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy periodically to reflect enhancements to our tool suite, regulatory evolutions, or operational adjustments.
          The current version and effective date are clearly posted at the top of this document. Continued use of DocuNexa constitutes acknowledgment of the updated policy.
        </p>
      </section>

      {/* 18. Contact & Privacy Inquiries */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          18. Data Protection Officer & Privacy Inquiries
        </h2>
        <p>
          For privacy inquiries, data subject access requests (DSARs), or compliance questions, please contact our designated privacy team:
        </p>
        <div className="p-5 rounded-md bg-surface border border-border space-y-1.5 text-xs sm:text-sm font-mono text-ink">
          <p><strong>Privacy Office:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Subject Tag:</strong> [Privacy Request / GDPR / CCPA]</p>
          <p><strong>Project:</strong> DocuNexa (Independent Software Project)</p>
          <p><strong>Operator:</strong> DocuNexa Project Maintainers &amp; Contributors</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

