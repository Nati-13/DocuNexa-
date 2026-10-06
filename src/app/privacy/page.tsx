import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  ServerOff,
  Cpu,
  Cookie,
  Megaphone,
  HelpCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — DocuNexa',
  description:
    'Read the DocuNexa Privacy Policy. Understand how client-side in-browser PDF processing protects your documents with zero server uploads and transparent data practices.',
  alternates: {
    canonical: 'https://docunexa.pro.et/privacy',
  },
};

export default function PrivacyPage() {
  const lastUpdated = 'September 30, 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Transparency & Trust</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            DocuNexa Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated} • Canonical Domain:{' '}
            <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
              https://docunexa.pro.et
            </a>
          </p>
        </div>

        {/* Executive Summary Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock size={18} className="text-emerald-500" />
            Privacy Summary at a Glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Document Uploads:</strong> Document processing for all 34 tools runs locally in your browser memory.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>No Server Storage:</strong> Your documents are never stored, logged, or inspected on DocuNexa servers.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>No Mandatory Accounts:</strong> All tools are free to use without creating an account or providing an email.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Transparent Advertising:</strong> Monetag advertising technology is integrated to fund free hosting; document processing remains client-side.
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-10 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Section 1: Overview */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              1. Introduction & Scope
            </h2>
            <p>
              DocuNexa (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website{' '}
              <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
                https://docunexa.pro.et
              </a>. This Privacy Policy describes how we handle information when you access our website and use our client-side document utilities.
            </p>
            <p>
              We believe your documents belong exclusively to you. Our architecture is designed from the ground up to minimize data collection and execute document processing directly on your personal device.
            </p>
          </section>

          {/* Section 2: Document Processing */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu size={20} className="text-brand-600 dark:text-brand-400" />
              2. How Your Documents Are Processed (Client-Side Architecture)
            </h2>
            <p>
              DocuNexa features 34 specialized tools across PDF organization, optimization, conversion, editing, security, and intelligence.
            </p>
            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm">
              <p className="font-semibold text-slate-900 dark:text-white">
                Technical Data Flow for Supported Tools:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>
                  <strong>In-Memory Loading:</strong> When you drag or select a PDF, image, or document, the file is read into your browser&apos;s volatile RAM using standard browser APIs (<code>FileReader</code>, <code>ArrayBuffer</code>, and <code>Uint8Array</code>).
                </li>
                <li>
                  <strong>Local Execution:</strong> PDF manipulation (merging, splitting, chapter cutting, vector watermarking, password encryption/decryption, rotation, and reordering) is executed locally using client-side JavaScript, WebAssembly, and Web Worker threads.
                </li>
                <li>
                  <strong>Zero Transmission:</strong> The contents of your uploaded documents are <em>never transmitted</em> over the network to DocuNexa servers.
                </li>
                <li>
                  <strong>Immediate Disposal:</strong> Document data exists only during your active browsing session. When you navigate away, reload, or close your browser tab, the memory allocated for your document is reclaimed by your operating system.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Tool-Specific Behaviors */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              3. Tool-Specific Disclosures & Technical Limitations
            </h2>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">OCR PDF (Optical Character Recognition)</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  OCR is powered by Tesseract.js running in a local WebAssembly Web Worker. To recognize characters, the engine downloads public language trained data files (such as English or Amharic <code>.traineddata.gz</code>) from standard public open-source CDN repositories (jsdelivr) on-demand into your local browser cache/IndexedDB upon first use. The actual image rendering, canvas analysis, and text recognition occur entirely on your device; your document pages and images are never uploaded or transmitted to external servers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Document Summarizer & Translation</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Our Document Summarizer and Translation tools run local rule-based heuristic algorithms directly in your browser. They extract headings, overview paragraphs, and glossary matches locally. They do NOT transmit your document contents to cloud Large Language Models (LLMs) or external generative AI APIs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Sign PDF & Redact PDF</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Sign PDF stamps a visual signature appearance onto PDF pages and does not generate cryptographic X.509 digital certificates. Redact PDF applies visual blackout vector overlays to visually obscure content; for forensic low-level binary stream removal, specialized desktop tools should be used.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Cookies & Local Storage */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cookie size={20} className="text-amber-500" />
              4. Cookies & Browser Local Storage
            </h2>
            <p>
              <strong>First-Party Cookies:</strong> DocuNexa does not currently set tracking or profiling cookies.
            </p>
            <p>
              <strong>Local Storage:</strong> We use your browser&apos;s <code>localStorage</code> solely for functional interface preferences:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>
                <code>docunexa-theme</code>: Stores your theme preference (<code>light</code> or <code>dark</code>) so the website displays correctly when you return.
              </li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can clear this storage at any time through your browser settings without affecting the core functionality of the tools.
            </p>
          </section>

          {/* Section 5: External Services & Hosting Logs */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              5. Third-Party Services, External Resources & Server Logs
            </h2>
            <p>
              DocuNexa strictly distinguishes local document processing from external resource downloads:
            </p>
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">A. Document Processing (Local Only):</p>
                <p className="mt-0.5">
                  Document bytes, extracted text, and generated files are processed entirely in browser memory. No document content is transmitted to third parties or remote servers.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">B. On-Demand OCR Language Data Retrieval:</p>
                <p className="mt-0.5">
                  When you initiate OCR recognition, the client-side Tesseract.js engine downloads public language model weights (e.g. <code>.traineddata.gz</code>) from the public jsDelivr CDN into your browser cache. This is an incoming download of optical recognition dictionary weights; your documents are never uploaded.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">C. Typography & Fonts:</p>
                <p className="mt-0.5">
                  DocuNexa loads font stylesheets and font binaries (Inter and JetBrains Mono) from Google Fonts CDN (<code>fonts.googleapis.com</code> and <code>fonts.gstatic.com</code>).
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">D. Web Hosting Infrastructure Logs:</p>
                <p className="mt-0.5">
                  Like virtually all web applications, our edge serverless hosting provider records standard HTTP connection metadata (IP address, browser user-agent, operating system, and request timestamps) strictly for technical network routing, DDoS mitigation, and system performance. DocuNexa does not harvest or sell personal usage telemetry.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">E. Advertising Delivery (Monetag & Plan Distinctions):</p>
                <p className="mt-0.5">
                  DocuNexa integrates Monetag (via <code>tag.min.js</code> and service worker) to display advertisements that support operating costs for free users. For anonymous visitors and registered Free plan users, Monetag advertising technology is used to deliver, measure, and optimize advertising impressions. For authenticated Ad-Free users, DocuNexa does not intentionally initialize Monetag advertising scripts or service workers for their account. In all cases, advertising scripts run in standard web isolation and have strictly zero access to your document files or local document processing memory.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">F. Cryptocurrency Payment Processing & Bybit Verification:</p>
                <p className="mt-0.5">
                  When you choose to upgrade to the $2 USD Ad-Free plan, payments are made directly in cryptocurrency (USDT on the Polygon PoS network) to a Bybit-hosted deposit address. DocuNexa queries Bybit&apos;s read-only deposit record API (<code>GET /v5/asset/deposit/query-record</code>) to match and verify your on-chain payment. Public blockchain transaction information (including transaction hash, recipient address, block timestamp, confirmations, and amount) is retrieved and processed to confirm payment. Our database (Supabase) stores the minimum payment/order metadata (order ID, user ID, status, transaction ID, and timestamp) necessary to activate and maintain your Ad-Free entitlement. We do not process or store private keys, fund passwords, or personal financial account credentials. We do not claim 100% anonymity, zero data processing, or zero third-party requests; network operations and payment verifications require strictly disclosed server communications.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Advertising & Monetization Disclosures */}
          <section className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-4 shadow-lg border border-slate-800">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Megaphone size={20} className="text-brand-400" />
              6. Advertising and Monetization Disclosures
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              DocuNexa offers free PDF tools supported by advertisements, alongside an optional $2 USD one-time Ad-Free plan.
            </p>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-white">
                Advertising Technologies & Plan Safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                <li>
                  <strong>Free Users:</strong> For anonymous visitors and registered Free plan accounts, DocuNexa uses Monetag advertising technology. Monetag and its advertising partners may use cookies, device identifiers, IP addresses, and browsing telemetry to deliver, measure, and optimize advertisements.
                </li>
                <li>
                  <strong>Ad-Free Users:</strong> For authenticated accounts that have purchased the Ad-Free upgrade, DocuNexa does not intentionally initialize Monetag advertising for their account. The Monetag script tag is excluded from server-rendered pages and any previously active Monetag service worker registration is safely unregistered.
                </li>
                <li>
                  <strong>Document Isolation Guarantee:</strong> Third-party advertising tags run with standard web client permissions and have strictly zero access to your document bytes, in-memory PDF structures, or local file processing pipelines.
                </li>
                <li>
                  <strong>Google AdSense Status:</strong> Google AdSense is not currently active on DocuNexa. If AdSense or other providers are enabled in the future, this policy will be updated accordingly.
                </li>
                <li>
                  <strong>Ad Placement Boundaries:</strong> Advertisements are strictly separated from tool workspaces and will never disguise themselves as fake download buttons, deceive visitors, or overlay file upload and document manipulation controls.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7: Optional Accounts, Coupon Codes & Payment Processing */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              7. Optional Accounts, Coupon Codes & Cryptocurrency Payments
            </h2>
            <p>
              While public PDF tools remain completely anonymous and account-free, users who voluntarily register an account or upgrade to Ad-Free provide limited information necessary to deliver and verify the service:
            </p>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs sm:text-sm">
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>
                  <strong>Account Identification:</strong> When creating an optional account, we store your email address and chosen plan status (Free or Ad-Free) managed securely through Supabase Authentication and PostgreSQL database.
                </li>
                <li>
                  <strong>Payment & Order Metadata:</strong> When initiating an Ad-Free upgrade, we record order identifiers, the required payment amount (USDT), expiration timestamps, and public blockchain deposit transaction hashes (txID) to confirm payment. We do not store or collect personal banking credentials, credit card numbers, or crypto private keys.
                </li>
                <li>
                  <strong>Coupon Code Redemptions:</strong> If you apply a promotional coupon code, we store the normalized code, the discount amount granted, and redemption timestamps associated with your payment order to enforce per-user redemption limits and prevent abuse.
                </li>
                <li>
                  <strong>Data Minimization:</strong> Payment and account records are used solely to verify entitlements, provide administrative support, and enforce usage policies. They are never sold or shared with marketing third parties.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 8: User Inquiries & Communications */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              8. Inquiries, Bug Reports & Communications
            </h2>
            <p>
              If you contact us via email or submit an issue on our public GitHub repository, we receive the information you provide (such as your email address, name or GitHub handle, and message details). This information is used exclusively to respond to your inquiry, troubleshoot bug reports, or consider feature recommendations. We do not sell, rent, or use contact information for unsolicited marketing.
            </p>
          </section>

          {/* Section 9: User Rights */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              9. User Rights & Data Retention
            </h2>
            <p>
              Because DocuNexa does not require accounts or store document contents, you retain complete sovereignty over your documents. If you have created an optional account, you may request deletion of your account and associated profile data by contacting us.
            </p>
          </section>

          {/* Section 10: Updates to this Policy */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              10. Changes to this Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy periodically to reflect technological adjustments, new tool features, or future advertising configurations. Any revisions will be published on this page with an updated &quot;Last Updated&quot; date.
            </p>
          </section>

          {/* Section 11: Contact Information */}
          <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              11. Contact Us
            </h2>
            <p>
              If you have any questions, suggestions, or concerns regarding this Privacy Policy or our client-side architecture, please contact the maintainer:
            </p>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs sm:text-sm">
              <p>
                <strong>Maintainer Contact:</strong>{' '}
                <a href="mailto:natanemyalew10@gmail.com" className="text-brand-600 dark:text-brand-400 hover:underline">
                  natanemyalew10@gmail.com
                </a>
              </p>
              <p>
                <strong>Issue Tracker & Repository:</strong>{' '}
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
                <strong>Dedicated Contact Page:</strong>{' '}
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
