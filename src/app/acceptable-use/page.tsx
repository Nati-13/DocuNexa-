import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { AlertTriangle, ShieldAlert, Ban, FileWarning, Eye, UserX } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — DocuNexa',
  description:
    'Rules of conduct, prohibited uses of PDF tools, security boundaries, and enforcement procedures governing the international DocuNexa platform.',
  alternates: {
    canonical: 'https://docunexa.pro.et/acceptable-use',
  },
};

const TOC = [
  { id: 'purpose', title: '1. Purpose & Global Application' },
  { id: 'malicious-content', title: '2. Malware, Exploits & Weaponized Files' },
  { id: 'illegal-content', title: '3. Unlawful & Harmful Content' },
  { id: 'intellectual-property', title: '4. Copyright & IP Infringement' },
  { id: 'system-abuse', title: '5. Platform Integrity, Probing & Automated Abuse' },
  { id: 'payment-fraud', title: '6. Payment Fraud & Coupon Exploitation' },
  { id: 'privacy-violations', title: '7. Privacy Violations & Harassment' },
  { id: 'enforcement', title: '8. Investigation & Enforcement Procedures' },
  { id: 'reporting', title: '9. How to Report Abuse or Violations' },
  { id: 'contact', title: '10. Abuse Response Contact' },
];

export default function AcceptableUsePage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Acceptable Use Policy"
      subtitle="Defines prohibited behaviors, platform integrity requirements, and security enforcement standards across all DocuNexa services."
      badge="Conduct & Security"
      badgeIcon={AlertTriangle}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/acceptable-use"
      toc={TOC}
    >
      {/* 1. Purpose */}
      <section id="purpose" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Purpose &amp; Global Application
        </h2>
        <p>
          This Acceptable Use Policy (&quot;AUP&quot;) outlines prohibited uses of DocuNexa (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
          available at{' '}
          <a href="https://docunexa.pro.et" className="text-brand hover:underline">
            https://docunexa.pro.et
          </a>.
        </p>
        <p>
          DocuNexa is built to empower students, educators, researchers, developers, and professionals worldwide with fast,
          private, client-side document processing. To protect our community and guarantee service availability, all visitors,
          account holders, and automated clients must comply strictly with this policy.
        </p>
      </section>

      {/* 2. Malicious Content */}
      <section id="malicious-content" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <FileWarning size={20} className="text-rose-500 shrink-0" />
          2. Malware, Exploits &amp; Weaponized Files
        </h2>
        <p>You may not load, convert, host, or disseminate through DocuNexa:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>PDFs containing weaponized JavaScript streams, buffer overflow payloads, or known Adobe Acrobat / PDF reader vulnerabilities (CVE exploits).</li>
          <li>Polyglot files (files disguised as legitimate PDFs that execute binary code or shell scripts in alternative contexts).</li>
          <li>Viruses, worms, spyware, trojans, ransomware, keyloggers, or other malicious payloads.</li>
          <li>Corrupted files intentionally engineered to induce browser memory exhaustion, denial-of-service, or unhandled crashes.</li>
        </ul>
        <p className="text-xs text-muted">
          DocuNexa tools inspect binary magic bytes (<code>%PDF-</code>) and sanitize output filenames to protect users against path traversal.
          Any intentional attempt to bypass these filters is a severe violation.
        </p>
      </section>

      {/* 3. Unlawful Content */}
      <section id="illegal-content" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <Ban size={20} className="text-rose-500 shrink-0" />
          3. Unlawful &amp; Harmful Content
        </h2>
        <p>You agree not to use DocuNexa to process, alter, or generate:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Child Sexual Abuse Material (CSAM):</strong> Child sexual exploitation or abuse imagery of any kind. Such activity is strictly prohibited and will be reported to international law enforcement (including NCMEC).</li>
          <li><strong>Violent Extremism &amp; Terrorism:</strong> Materials promoting terrorist groups, violent extremism, weapons of mass destruction, or instructional guides for mass harm.</li>
          <li><strong>Fraudulent &amp; Forged Credentials:</strong> Forged government identity cards, counterfeit passports, fabricated financial audits, fake academic degrees, or fraudulent medical records intended to deceive third parties.</li>
          <li><strong>Non-Consensual Imagery &amp; Doxxing:</strong> Private intimate media, non-consensual personal records, or targeted harassment campaigns.</li>
        </ul>
      </section>

      {/* 4. Intellectual Property */}
      <section id="intellectual-property" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Copyright &amp; Intellectual Property Infringement
        </h2>
        <p>
          While you retain 100% ownership of your original materials, you must possess the necessary rights, licenses, or fair-use
          authorizations to process documents through DocuNexa:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>You may not use DocuNexa to strip watermarks, remove copyright notices, or unlock encrypted documents without authorization from the legitimate copyright holder.</li>
          <li>Commercial piracy or unauthorized distribution of proprietary textbooks, commercial software manuals, or copyrighted books is strictly prohibited.</li>
        </ul>
      </section>

      {/* 5. System Abuse */}
      <section id="system-abuse" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Platform Integrity, Probing &amp; Automated Abuse
        </h2>
        <p>You may not interfere with the proper operation of DocuNexa or attempt to bypass security boundaries:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Denial of Service (DoS/DDoS):</strong> Flooding HTTP endpoints, launching distributed traffic attacks, or orchestrating synthetic query storms designed to degrade performance for other visitors.</li>
          <li><strong>Aggressive Scraping:</strong> Automated scraping, spiders, or crawlers that disregard <code>robots.txt</code> or exceed reasonable human browsing thresholds.</li>
          <li><strong>Probing &amp; Exploitation:</strong> Port scanning, vulnerability fuzzing, brute-forcing login endpoints, or unauthorized security testing against production infrastructure outside of our <Link href="/security-policy" className="text-brand hover:underline">Vulnerability Disclosure Safe Harbor</Link>.</li>
          <li><strong>Circumvention:</strong> Manipulating client-side headers, altering IP origin headers, or bypassing API rate-limit throttles.</li>
        </ul>
      </section>

      {/* 6. Payment Fraud */}
      <section id="payment-fraud" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. Payment Fraud &amp; Coupon Exploitation
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Falsifying blockchain transaction hashes, broadcasting double-spend attempts, or submitting fraudulent payment claims.</li>
          <li>Automated harvesting, brute-forcing, or unauthorized exploitation of promotional coupon codes.</li>
          <li>Creating multiple throwaway accounts solely to circumvent single-use promotional coupon limits.</li>
        </ul>
      </section>

      {/* 7. Privacy Violations */}
      <section id="privacy-violations" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. Privacy Violations &amp; Harassment
        </h2>
        <p>
          You may not use DocuNexa communication channels (including support forms, feedback tools, or community channels) to transmit
          unsolicited advertising, spam, threatening messages, or hate speech targeting individuals based on race, religion, gender, sexual orientation, disability, or national origin.
        </p>
      </section>

      {/* 8. Enforcement */}
      <section id="enforcement" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <UserX size={20} className="text-rose-500 shrink-0" />
          8. Investigation &amp; Enforcement Procedures
        </h2>
        <p>DocuNexa actively protects its platform and community:</p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Automated Rate Limiting:</strong> Abuse detection algorithms automatically throttle IP addresses that exceed safe request thresholds or trigger repeated 4xx/5xx security errors.
          </li>
          <li>
            <strong>Account Suspension:</strong> We reserve the right to suspend or terminate accounts found in violation of this AUP immediately and without prior notice.
          </li>
          <li>
            <strong>Legal Escalation:</strong> Severe security attacks, CSAM distribution, or criminal extortion will be referred to relevant international law enforcement agencies alongside technical log evidence.
          </li>
        </ul>
      </section>

      {/* 9. Reporting */}
      <section id="reporting" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          9. How to Report Abuse or Violations
        </h2>
        <p>
          If you discover content, activity, or an account on DocuNexa that violates this Acceptable Use Policy, please report it immediately:
        </p>
        <div className="p-4 rounded-md bg-surface border border-border text-xs sm:text-sm font-mono text-ink space-y-1">
          <p><strong>Abuse Email:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Subject Line:</strong> [AUP Violation Report] &lt;Brief Description&gt;</p>
          <p><strong>Required Details:</strong> URL of the affected tool, description of the incident, timestamps, and supporting logs or screenshots.</p>
        </div>
      </section>

      {/* 10. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          10. Abuse Response Contact
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          Our abuse response team aims to investigate legitimate reports within an estimated target window of 24 to 48 business hours.
          Contact: <a href="mailto:docunexa.security@gmail.com" className="text-brand font-semibold hover:underline">docunexa.security@gmail.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

