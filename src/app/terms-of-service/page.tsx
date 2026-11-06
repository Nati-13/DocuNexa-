import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Scale, FileText, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — DocuNexa',
  description:
    'Comprehensive international Terms of Service governing the use of DocuNexa client-side PDF tools, user document ownership, payment rules, and platform limitations.',
  alternates: {
    canonical: 'https://docunexa.pro.et/terms-of-service',
  },
};

const TOC = [
  { id: 'acceptance', title: '1. Introduction & Acceptance' },
  { id: 'services', title: '2. Definition & Scope of Services' },
  { id: 'eligibility', title: '3. Eligibility & Age Requirements' },
  { id: 'accounts', title: '4. Account Registration & Security' },
  { id: 'user-responsibilities', title: '5. User Responsibilities & Acceptable Use' },
  { id: 'document-ownership', title: '6. Document Ownership & Intellectual Property' },
  { id: 'processing-authorization', title: '7. Authorization to Process Local Files' },
  { id: 'technical-limitations', title: '8. Technical Limitations & Output Verification' },
  { id: 'pricing-and-plans', title: '9. Free Plan, Ad-Free Upgrade & Pricing' },
  { id: 'payment-terms', title: '10. Payment Terms & Cryptocurrency Rails' },
  { id: 'taxes-and-fees', title: '11. International Taxes, Currencies & Gas Fees' },
  { id: 'termination', title: '12. Cancellation, Account Deletion & Termination' },
  { id: 'suspension', title: '13. Suspension for Abuse or Harm' },
  { id: 'availability', title: '14. Service Availability & Maintenance' },
  { id: 'third-parties', title: '15. Third-Party Integrations & Advertising' },
  { id: 'warranty-disclaimer', title: '16. Disclaimer of Warranties' },
  { id: 'liability-limitation', title: '17. Limitation of Liability' },
  { id: 'indemnification', title: '18. Indemnification' },
  { id: 'dispute-resolution', title: '19. Dispute Resolution & Informal Resolution' },
  { id: 'governing-law', title: '20. International Jurisdiction & Mandatory Consumer Rights' },
  { id: 'modifications', title: '21. Modifications to Terms' },
  { id: 'contact', title: '22. Contact & Notices' },
];

export default function TermsOfServicePage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="International user agreement setting out your rights, platform boundaries, client-side data protections, and payment rules."
      badge="User Agreement"
      badgeIcon={Scale}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/terms-of-service"
      toc={TOC}
    >
      {/* 1. Introduction & Acceptance */}
      <section id="acceptance" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Introduction & Acceptance of Terms
        </h2>
        <p>
          Welcome to DocuNexa (&quot;DocuNexa&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), an international
          browser-based document productivity platform available at{' '}
          <a href="https://docunexa.pro.et" className="text-brand hover:underline">
            https://docunexa.pro.et
          </a>{' '}
          and related domains.
        </p>
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or
          &quot;your&quot;) and DocuNexa. By visiting our website, accessing our tools, creating an account, or purchasing an Ad-Free upgrade,
          you acknowledge that you have read, understood, and agreed to be bound by these Terms and our companion{' '}
          <Link href="/privacy-policy" className="text-brand hover:underline">
            Privacy Policy
          </Link>.
        </p>
        <p className="text-xs text-muted italic">
          If you do not agree to all terms and conditions set forth herein, you must immediately cease accessing or using DocuNexa.
        </p>
      </section>

      {/* 2. Definition & Scope of Services */}
      <section id="services" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. Definition & Scope of Services
        </h2>
        <p>
          DocuNexa operates a specialized suite of 34 browser-executed PDF utilities grouped into 7 functional categories:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Organize PDF:</strong> PDF Unit Cutter (flagship textbook splitter), Merge, Split, Remove Pages, Extract Pages, Organize Pages, and Scan to PDF.</li>
          <li><strong>Optimize PDF:</strong> Compress PDF, Repair PDF, and Optical Character Recognition (OCR).</li>
          <li><strong>Convert to PDF:</strong> JPG/PNG to PDF, Word (.docx) to PDF, PowerPoint (.pptx) to PDF, Excel (.xlsx) to PDF, and HTML to PDF.</li>
          <li><strong>Convert from PDF:</strong> PDF to JPG/PNG, PDF to Word (.docx), PDF to PowerPoint (.pptx), PDF to Excel (.xlsx), and PDF to PDF/A.</li>
          <li><strong>Edit PDF:</strong> Rotate, Add Page Numbers, Add Watermark, Crop Margins, Visual Edit, and Interactive AcroForm filling.</li>
          <li><strong>PDF Security:</strong> Protect with AES-256 password encryption, Unlock/Decrypt, Sign with visual signature stamps, Redact with visual blackout vector boxes, and Document Comparison diffing.</li>
          <li><strong>PDF Intelligence:</strong> Heuristic Document Summarizer, Multilingual Translation, and PDF to Markdown.</li>
        </ul>
        <p>
          Unlike legacy cloud converters, DocuNexa prioritizes client-side architecture: core document parsing, rendering, and synthesis
          run locally inside your web browser via WebAssembly (Wasm) and JavaScript without transmitting your file bytes to our servers.
        </p>
      </section>

      {/* 3. Eligibility & Age Requirements */}
      <section id="eligibility" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. Eligibility & Minimum Age Requirements
        </h2>
        <p>
          DocuNexa is offered to users globally. To use the platform or register an account, you represent and warrant that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>You are at least 13 years of age (or the minimum legal age required in your country of residence to consent to digital services, such as 16 in certain European Union member states).</li>
          <li>If you are under the legal age of majority in your jurisdiction, you represent that you have obtained verifiable consent from a parent or legal guardian to access the service.</li>
          <li>You have the legal capacity to enter into a binding contract and are not barred from receiving digital services under applicable international sanctions or trade restrictions.</li>
        </ul>
      </section>

      {/* 4. Account Registration & Security */}
      <section id="accounts" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Account Registration & Account Security
        </h2>
        <p>
          <strong>No Mandatory Account:</strong> All standard PDF tools are accessible free of charge without requiring account registration, identity submission, or credit card entry.
        </p>
        <p>
          <strong>Optional Accounts:</strong> Users who desire to purchase an Ad-Free upgrade, track payment orders, or manage persistent preferences may register an account. When creating an account:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>You must provide an authentic, valid email address that you control.</li>
          <li>You must establish a strong password meeting our minimum security parameters (at least 8 characters, containing both letters and numbers).</li>
          <li>You are solely responsible for safeguarding your login credentials and for all activities that occur under your account.</li>
          <li>You must notify us immediately at <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a> if you discover or suspect unauthorized access to your account.</li>
        </ul>
      </section>

      {/* 5. User Responsibilities & Acceptable Use */}
      <section id="user-responsibilities" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. User Responsibilities & Acceptable Use
        </h2>
        <p>
          You agree to use DocuNexa strictly for lawful, educational, research, personal, and legitimate commercial productivity purposes.
          You agree to abide by our detailed <Link href="/acceptable-use" className="text-brand hover:underline">Acceptable Use Policy</Link>. Prohibited conduct includes, without limitation:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Distributing malware, spyware, trojans, ransomware, or weaponized PDF exploit payloads.</li>
          <li>Attempting to probe, scan, or breach our server infrastructure, API rate limits, or network security perimeters.</li>
          <li>Using automated scrapers, bots, or crawling software to impose unreasonable load on our website.</li>
          <li>Processing materials that promote child sexual abuse, violent extremism, illegal weapons manufacturing, or unlawful harassment.</li>
          <li>Infringing upon third-party copyrights, patents, trademarks, or proprietary trade secrets.</li>
        </ul>
      </section>

      {/* 6. Document Ownership & Intellectual Property */}
      <section id="document-ownership" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. Document Ownership & Intellectual Property
        </h2>
        <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 space-y-2">
          <p className="font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            DocuNexa Ownership Guarantee
          </p>
          <p>
            You retain 100% exclusive copyright, ownership, title, and all intellectual property rights to every document,
            image, text, and PDF file you load into or process through DocuNexa.
          </p>
          <p>
            DocuNexa does NOT claim any copyright, license, transfer of title, ownership, or commercialization rights over your uploaded,
            processed, or downloaded documents. We do not use your documents to train machine learning models or sell data to third parties.
          </p>
        </div>
        <p>
          <strong>DocuNexa Intellectual Property:</strong> All website designs, software source code, graphics, branding, logos, trademarks,
          and documentation associated with DocuNexa are the exclusive intellectual property of DocuNexa and its licensors.
        </p>
      </section>

      {/* 7. Authorization to Process Local Files */}
      <section id="processing-authorization" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. User Authorization to Process Local Files
        </h2>
        <p>
          By dropping, selecting, or uploading a file into a DocuNexa tool, you grant DocuNexa a strictly limited, temporary,
          non-exclusive technical permission to read the file into your local web browser session memory (via Web APIs such as
          <code>FileReader</code>, <code>ArrayBuffer</code>, and <code>Uint8Array</code>) solely to execute the specific tool operation
          you initiated (e.g. splitting units, compressing pages, converting formats).
        </p>
        <p>
          Because operations execute locally, this authorization terminates the moment you close the browser tab, refresh the page, or clear the file selection.
        </p>
      </section>

      {/* 8. Technical Limitations & Output Verification */}
      <section id="technical-limitations" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          8. Technical Limitations & Output Verification
        </h2>
        <p>
          DocuNexa tools are engineered for high precision, but file structures, non-standard font embeddings, OCR resolution,
          and client hardware impose inherent technical boundaries:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Pre-Submission Verification:</strong> You must inspect and verify the completeness, accuracy, and formatting of all output files before relying on them for critical academic, legal, financial, or archiving purposes.
          </li>
          <li>
            <strong>PDF Unit Cutter Boundaries:</strong> Textbook unit detection employs heading heuristic analysis and printed-to-physical page offset calibration. When Table of Contents calibration is ambiguous, DocuNexa marks boundaries as uncertain and requires explicit user review. Users must review and approve detected ranges before cutting.
          </li>
          <li>
            <strong>Digital Signatures:</strong> The Sign PDF tool applies visual appearance stamps (canvas raster drawings) onto PDF pages. It does NOT generate cryptographic PKI digital certificates (X.509) or verify signature revocation status.
          </li>
          <li>
            <strong>Redaction Limitations:</strong> The Redact PDF tool draws opaque blackout vector rectangles over coordinates specified by the user. It is a visual censorship tool and does not guarantee binary stream sanitization of deeply embedded font streams.
          </li>
          <li>
            <strong>Device Memory & Hardware:</strong> Document processing runs inside your local browser memory. Processing speed and maximum document page counts are bounded by your device&apos;s available RAM and CPU.
          </li>
        </ul>
      </section>

      {/* 9. Free Plan, Ad-Free Upgrade & Pricing */}
      <section id="pricing-and-plans" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          9. Free Plan, Ad-Free Upgrade & Pricing
        </h2>
        <p>
          DocuNexa operates an open model:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-ink text-base">FREE Plan ($0)</span>
            <p className="text-muted">
              Access to all 34 PDF utilities. No credit card or registration required. Supported by non-intrusive third-party advertisements (such as Monetag).
            </p>
          </div>
          <div className="p-5 rounded-md bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 space-y-2">
            <span className="font-bold text-brand-700 dark:text-brand-300 text-base">AD-FREE Upgrade ($2.00 USD)</span>
            <p className="text-muted">
              One-time payment for permanent ad removal across your account. No recurring subscription fees or surprise annual renewals.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          When valid promotional coupon codes are applied at checkout, discounts are deducted directly from the base price (e.g. 25% off reduces the payable price to $1.50).
        </p>
      </section>

      {/* 10. Payment Terms & Cryptocurrency Rails */}
      <section id="payment-terms" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          10. Payment Terms & Supported Cryptocurrency Rails
        </h2>
        <p>
          To provide frictionless international access without requiring personal bank cards, DocuNexa supports peer-to-peer cryptocurrency payments. Full payment terms are detailed in our companion <Link href="/payment-policy" className="text-brand hover:underline">Payment & Crypto Policy</Link>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Supported Rails:</strong> USDT on Polygon PoS (verified via Bybit V5 deposit API) and USDT on Aptos Mainnet (verified via Aptos GraphQL indexer).</li>
          <li><strong>Planned Rails (Disabled):</strong> USDT TRC20 and USDC Polygon remain planned and disabled until regulatory verification is finalized.</li>
          <li><strong>Exact Fractional Amount:</strong> Orders generate a unique fractional amount (e.g. 2.004821 USDT) with a 20-minute validity window to identify your deposit. Customers must transfer the exact requested amount.</li>
          <li><strong>Server-to-Server Verification:</strong> Entitlement unlocks only upon confirmed on-chain settlement. Screenshots or manual transaction receipts are not accepted for automated checkout.</li>
        </ul>
      </section>

      {/* 11. International Taxes, Currencies & Gas Fees */}
      <section id="taxes-and-fees" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          11. International Taxes, Currencies & Network Gas Fees
        </h2>
        <p>
          DocuNexa prices are denominated in USD-pegged stablecoins (USDT). You are solely responsible for:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>All blockchain network transaction fees (&quot;gas fees&quot;) required to broadcast and finalize your transaction on the applicable blockchain. Gas fees must be paid in addition to the exact transfer amount.</li>
          <li>Any applicable sales tax, value-added tax (VAT), goods and services tax (GST), withholding tax, or duties levied by your local tax authority in connection with your purchase.</li>
        </ul>
      </section>

      {/* 12. Cancellation, Account Deletion & Termination */}
      <section id="termination" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          12. Cancellation, Account Deletion & Termination
        </h2>
        <p>
          You may delete your account at any time via your account settings or by submitting a written request to{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">
            docunexa.security@gmail.com
          </a>.
        </p>
        <p>
          Upon account deletion, your profile record in Supabase is permanently purged. Because the Ad-Free upgrade is a one-time non-recurring purchase, deleting your account forfeits existing ad-free privileges without generating a cash refund.
        </p>
      </section>

      {/* 13. Suspension for Abuse or Harm */}
      <section id="suspension" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          13. Suspension for Abuse or Unlawful Activity
        </h2>
        <p>
          DocuNexa reserves the right, in its sole discretion and without liability, to suspend, terminate, or block access to accounts or IP ranges that violate these Terms, breach our Acceptable Use Policy, engage in payment manipulation, or endanger platform stability.
        </p>
      </section>

      {/* 14. Service Availability & Maintenance */}
      <section id="availability" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          14. Service Availability & Maintenance
        </h2>
        <p>
          While we strive for continuous 99.9% uptime, DocuNexa does not guarantee uninterrupted, error-free operation.
          Maintenance windows, third-party hosting outages (e.g. Vercel, Supabase), network anomalies, and force majeure events
          may temporarily disrupt website accessibility without liability.
        </p>
      </section>

      {/* 15. Third-Party Integrations & Advertising */}
      <section id="third-parties" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          15. Third-Party Integrations & Advertising
        </h2>
        <p>
          DocuNexa integrates third-party service providers (Vercel, Supabase, Bybit API, Monetag advertising, Resend/SMTP email delivery).
          DocuNexa does not control, endorse, or accept responsibility for third-party advertisements or external links.
          Interactions with third-party advertising are governed strictly by the respective third party&apos;s terms and privacy policies.
        </p>
      </section>

      {/* 16. Disclaimer of Warranties */}
      <section id="warranty-disclaimer" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          16. Disclaimer of Warranties
        </h2>
        <div className="p-5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          <p className="uppercase font-bold tracking-wide">
            IMPORTANT LEGAL DISCLAIMER:
          </p>
          <p className="mt-1">
            DOCUNEXA IS PROVIDED STRICTLY ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW,
            DOCUNEXA EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            TITLE, DATA INTEGRITY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT DOCUMENT EXTRACTIONS OR REPAIRS WILL BE 100% ERROR-FREE
            OR SUITABLE FOR OFFICIAL OR JUDICIAL SUBMISSION.
          </p>
        </div>
      </section>

      {/* 17. Limitation of Liability */}
      <section id="liability-limitation" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          17. Limitation of Liability
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          To the maximum extent permitted by applicable law, DocuNexa, its maintainers, contributors, and infrastructure providers
          shall not be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including loss of profits,
          goodwill, use, data, or other intangible losses arising out of or relating to the use of or inability to use the service.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed">
          In jurisdictions that do not permit the exclusion of certain warranties or limitation of liability, DocuNexa&apos;s aggregate liability
          shall be strictly limited to the greater of (a) the total amount actually paid by you to DocuNexa in the twelve (12) months preceding the incident, or (b) $10.00 USD.
        </p>
      </section>

      {/* 18. Indemnification */}
      <section id="indemnification" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          18. Indemnification
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          Where legally permitted by applicable law, you agree to defend, indemnify, and hold harmless DocuNexa and its operators
          from and against any claims, liabilities, damages, losses, and reasonable legal expenses arising out of or connected with
          your breach of these Terms, your misuse of the platform, or your infringement of third-party intellectual property rights.
        </p>
      </section>

      {/* 19. Dispute Resolution & Informal Resolution */}
      <section id="dispute-resolution" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          19. Dispute Resolution & Informal Resolution
        </h2>
        <p>
          Before initiating formal legal proceedings, you and DocuNexa agree to attempt to resolve any dispute, claim, or controversy
          informally and amicably. You agree to submit a detailed written statement describing the dispute to{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline font-semibold">
            docunexa.security@gmail.com
          </a>. Both parties agree to negotiate in good faith for at least thirty (30) calendar days before pursuing formal dispute avenues.
        </p>
      </section>

      {/* 20. International Jurisdiction & Mandatory Consumer Rights */}
      <section id="governing-law" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          20. International Jurisdiction & Mandatory Consumer Rights
        </h2>
        <p>
          DocuNexa serves users worldwide. These Terms are drafted as a universal international baseline:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>
            <strong>Mandatory Consumer Rights Preserved:</strong> Nothing in these Terms shall deprive consumers residing in the European Union, United Kingdom, United States, Canada, Australia, or other jurisdictions of their mandatory, non-waivable statutory rights under local consumer protection laws.
          </li>
          <li>
            <strong>Operator Designation:</strong> DocuNexa is operated as an independent international software productivity project (DocuNexa Operations). Any formal judicial proceedings shall be conducted before courts of competent jurisdiction.
          </li>
        </ul>
      </section>

      {/* 21. Modifications to Terms */}
      <section id="modifications" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          21. Modifications to Terms
        </h2>
        <p>
          We reserve the right to revise these Terms periodically to reflect changes in our PDF features, technical capabilities,
          regulatory standards, or payment arrangements. Material changes will be indicated with an updated &quot;Effective Date&quot; and version tag.
          Your continued use of DocuNexa following the publication of revised Terms constitutes acceptance of the changes.
        </p>
      </section>

      {/* 22. Contact & Notices */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          22. Contact Information & Legal Notices
        </h2>
        <p>
          For questions, formal notices, or legal inquiries concerning these Terms of Service, please reach out to:
        </p>
        <div className="p-5 rounded-md bg-surface border border-border space-y-1.5 text-xs sm:text-sm font-mono text-ink">
          <p><strong>Legal & Security Inquiries:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Platform:</strong> DocuNexa (https://docunexa.pro.et)</p>
          <p><strong>Support Center:</strong> <Link href="/support" className="text-brand hover:underline">/support</Link></p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

