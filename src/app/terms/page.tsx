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
    <div className="min-h-screen bg-paper text-ink py-16 md:py-24 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <Scale size={14} />
            <span>Usage Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            DocuNexa Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Last updated: {lastUpdated} • Canonical Domain:{' '}
            <a href="https://docunexa.pro.et" className="text-brand hover:underline">
              https://docunexa.pro.et
            </a>
          </p>
        </div>

        {/* Introduction Notice */}
        <div className="p-6 sm:p-8 rounded-md bg-surface border border-border shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <FileText size={18} className="text-brand" />
            Terms Overview
          </h2>
          <p className="text-xs sm:text-sm text-ink leading-relaxed">
            Please read these Terms of Service (&quot;Terms&quot;) carefully before using DocuNexa (
            <a href="https://docunexa.pro.et" className="text-brand hover:underline">
              https://docunexa.pro.et
            </a>
            ). By accessing or using our website and browser-based tools, you agree to be bound by these Terms. DocuNexa is operated as an independent, free software productivity project.
          </p>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-10 text-sm sm:text-base text-ink leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
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
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              2. Permitted Use & Fair Access
            </h2>
            <p>
              You may use DocuNexa for lawful personal, academic, non-commercial, and commercial purposes, including organizing study materials, preparing reports, formatting publications, and securing document workflows.
            </p>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted space-y-1.5">
              <li>Use the service to distribute malware, viruses, malicious scripts, or corrupted files.</li>
              <li>Attempt to reverse-engineer, disrupt, or launch denial-of-service attacks against DocuNexa hosting infrastructure.</li>
              <li>Use automated scripts or scrapers in an abusive manner that degrades website availability for other visitors.</li>
              <li>Misrepresent DocuNexa output as certified legal, forensic, or notary documents where technical limitations apply.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
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
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              4. Technical Limitations & Output Verification
            </h2>
            <p>
              While DocuNexa tools are engineered for precision and fidelity, document rendering, conversion, and parsing depend on file structures, font embeddings, and browser capabilities:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted space-y-1.5">
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
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              5. Advertising & Third-Party Links
            </h2>
            <p>
              DocuNexa displays third-party advertisements (such as Monetag) to help fund free hosting and infrastructure maintenance. DocuNexa does not endorse or assume responsibility for products, content, or services advertised by third parties. Your interactions with third-party advertisers are governed solely by their respective terms and privacy policies.
            </p>
          </section>

          {/* Section 6: Ad-Free Upgrade & Cryptocurrency Payments */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              6. Ad-Free Upgrade & Cryptocurrency Payments
            </h2>
            <p>
              DocuNexa offers an optional paid upgrade for users who prefer an advertising-free workspace:
            </p>
            <div className="p-5 rounded-md bg-surface border border-border space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-border text-ink">
                <div>
                  <span className="block text-[11px] font-bold uppercase text-muted">Price</span>
                  <span className="font-bold text-ink">$2.00 USD</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-muted">Currency</span>
                  <span className="font-bold text-ink">USDT</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-muted">Network</span>
                  <span className="font-bold text-ink">Polygon (PoS)</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-muted">Type</span>
                  <span className="font-bold text-ink">One-time payment</span>
                </div>
              </div>

              <ul className="list-disc pl-5 space-y-2 text-muted">
                <li>
                  <strong>Pricing &amp; Plans Catalog:</strong> DocuNexa offers flexible subscription tiers alongside its baseline $2.00 USD rate, including Weekly ($1/wk), Weekly Pro ($2/wk), Monthly ($3/mo, Save 25%), Monthly Pro ($6/mo, Save 25%), Yearly ($27/yr, 25% off monthly), and Yearly Pro ($54/yr, 25% off monthly). Grandfathered one-time payment purchasers retain permanent Lifetime Ad-Free access without additional fees. When a valid promotional coupon is applied, the final payable amount is discounted accordingly.
                </li>
                <li>
                  <strong>Unique Payment Amount:</strong> Each order generates a unique payment amount based on the final price (e.g. 2.004821 USDT for normal orders or 1.504821 USDT when discounted) with 6 decimal places to uniquely identify your deposit on the Polygon blockchain without requiring personal banking information.
                </li>
                <li>
                  <strong>Exact Amount Requirement:</strong> Customers must send <strong>EXACTLY</strong> the displayed amount. Any discrepancy (even $0.000001) will prevent automatic activation and will require manual administrative review.
                </li>
                <li>
                  <strong>20-Minute Payment Window:</strong> Payment orders and their assigned unique amounts remain active for exactly 20 minutes from creation. Deposits must be confirmed within this window.
                </li>
                <li>
                  <strong>Verification & Confirmation Timing:</strong> Payments are verified server-to-server using Bybit&apos;s official on-chain deposit record API. Account upgrade occurs ONLY after the deposit is fully confirmed by the Polygon blockchain and credited by Bybit. We do not promise instant confirmation; verification typically completes within a few minutes depending on network conditions.
                </li>
                <li>
                  <strong>Scope of Ad-Free:</strong> Ad-Free removes Monetag advertising scripts, banners, and service workers across DocuNexa web properties only.
                </li>
              </ul>
            </div>

            {/* Promotional Coupon Terms */}
            <div className="p-5 rounded-md bg-surface border border-border space-y-3 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-ink">
                Promotional Coupon Codes
              </h3>
              <p className="text-muted leading-relaxed">
                DocuNexa may issue promotional coupon codes granting percentage or fixed USDT discounts toward the Ad-Free upgrade:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted">
                <li>
                  <strong>Eligibility:</strong> Coupon codes apply exclusively to the DocuNexa Ad-Free upgrade and do not apply to other products or third-party services.
                </li>
                <li>
                  <strong>Non-Cash Value:</strong> Coupons have no independent cash value, cannot be redeemed or exchanged for legal tender or cryptocurrency, and cannot be refunded.
                </li>
                <li>
                  <strong>Server-Side Authority:</strong> Validity, eligible discount percentage or value, and expiration are strictly determined by our server-side database. Client-side modifications or unauthorized alterations are automatically rejected.
                </li>
                <li>
                  <strong>Usage Limits:</strong> Coupons may have specific start dates, expiration dates, total maximum redemption caps, and per-user limits (defaulting to one redemption per registered account).
                </li>
                <li>
                  <strong>Redemption Timing:</strong> A coupon is officially redeemed only upon successful on-chain confirmation of the associated payment order. Creating a checkout without completing payment does not consume a limited redemption.
                </li>
              </ul>
            </div>

            {/* Refund & Payment Resolution Policy */}
            <div className="p-5 rounded-md bg-slate-100 dark:bg-ink/40 border border-border space-y-3 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-ink">
                Refund & Payment Exception Policy
              </h3>
              <p className="text-muted leading-relaxed">
                Cryptocurrency transfers on public blockchains are irreversible. DocuNexa does not operate automatic refund smart contracts or automatic reversal payout bots. Our policy regarding payment exceptions is as follows:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted">
                <li>
                  <strong>Duplicate Payments:</strong> If multiple payments are sent for the same order, automatic entitlement is granted only once. Duplicate funds cannot be refunded automatically. Customers should contact support with the transaction hashes for manual review.
                </li>
                <li>
                  <strong>Wrong Amount:</strong> If a deposit arrives with an amount differing from the exact order amount, the order enters an <code>amount_mismatch</code> state. Ad-Free status will not activate automatically. Contact support with your transaction hash to verify and resolve the order manually.
                </li>
                <li>
                  <strong>Late Payments:</strong> If a payment is detected after the 20-minute order window expires, the order is marked as <code>late_payment</code>. Ad-Free status is not automatically enabled. Contact support with your order ID and transaction hash for manual entitlement credit.
                </li>
                <li>
                  <strong>Wrong Network:</strong> If USDT is sent using an unsupported network (such as Ethereum, Binance Smart Chain, or Tron) instead of the required Polygon PoS network, DocuNexa&apos;s Polygon deposit checker will not detect the payment. DocuNexa cannot retrieve or refund funds sent to incorrect networks or incompatible addresses.
                </li>
                <li>
                  <strong>Technical Payment Failure:</strong> If a confirmed on-chain deposit is verified by Bybit but fails to credit your DocuNexa account due to a server-side synchronization error, our support team will manually verify the deposit and activate your Ad-Free status upon receiving your order ID and transaction hash.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              7. Disclaimer of Warranties
            </h2>
            <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <p>
                DOCUNEXA IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, LOSS OF DATA, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, BUG-FREE, OR FULLY COMPATIBLE WITH EVERY CORRUPTED OR CUSTOM PDF FORMAT.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              8. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law, DocuNexa and its maintainer shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of or in connection with your use of or inability to use the service.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              9. Modifications to Service & Terms
            </h2>
            <p>
              We reserve the right to modify, improve, or temporarily suspend any tool or feature at any time without prior notice. These Terms may also be updated periodically. Your continued use of DocuNexa following any modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              10. Contact & Inquiries
            </h2>
            <p>
              For any questions regarding these Terms of Service or tool usage, please reach out to the project maintainer:
            </p>
            <div className="p-4 rounded-md bg-surface border border-border space-y-1.5 text-xs sm:text-sm">
              <p>
                <strong>Email Contact:</strong>{' '}
                <a href="mailto:natanemyalew10@gmail.com" className="text-brand hover:underline">
                  natanemyalew10@gmail.com
                </a>
              </p>
              <p>
                <strong>GitHub Repository:</strong>{' '}
                <a
                  href="https://github.com/Nati-13/DocuNexa-"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  https://github.com/Nati-13/DocuNexa-
                </a>
              </p>
              <p>
                <strong>Contact Page:</strong>{' '}
                <Link href="/contact" className="text-brand hover:underline">
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
