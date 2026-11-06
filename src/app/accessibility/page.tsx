import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Accessibility, CheckCircle2, AlertTriangle, Eye, Monitor, Keyboard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accessibility Statement — DocuNexa',
  description:
    'DocuNexa Accessibility Statement. Our commitment to digital inclusion, WCAG 2.1 AA objectives, supported accessibility features, known limitations, and feedback channels.',
  alternates: {
    canonical: 'https://docunexa.pro.et/accessibility',
  },
};

const TOC = [
  { id: 'commitment', title: '1. Our Commitment to Accessibility' },
  { id: 'standards', title: '2. Standards & Guidelines (WCAG 2.1 AA Objectives)' },
  { id: 'features', title: '3. Implemented Accessibility Features' },
  { id: 'known-limitations', title: '4. Known Limitations & Technical Constraints' },
  { id: 'assistive-technologies', title: '5. Compatibility with Browsers & Assistive Tech' },
  { id: 'feedback-mechanism', title: '6. Reporting Accessibility Barriers' },
  { id: 'contact', title: '7. Accessibility Support Contact' },
];

export default function AccessibilityPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Accessibility Statement"
      subtitle="Ensuring our browser-based document productivity workspace remains accessible, readable, and usable for individuals of all abilities."
      badge="Digital Inclusion"
      badgeIcon={Accessibility}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/accessibility"
      toc={TOC}
    >
      {/* 1. Commitment */}
      <section id="commitment" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Our Commitment to Accessibility
        </h2>
        <p>
          DocuNexa is committed to digital inclusion and ensuring that our website, document utilities, and educational tools
          are accessible to the broadest possible audience, regardless of ability, hardware, or assistive technology.
        </p>
        <p>
          We design our interfaces to be clean, legible, and intuitive, eliminating unnecessary friction so that students,
          professionals, and researchers worldwide can work with their documents effectively.
        </p>
      </section>

      {/* 2. Standards */}
      <section id="standards" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. Standards &amp; Guidelines (WCAG 2.1 AA Objectives)
        </h2>
        <p>
          To guide our engineering efforts, we aim to align DocuNexa with the <strong>Web Content Accessibility Guidelines (WCAG) 2.1</strong>{' '}
          at Level AA, established by the World Wide Web Consortium (W3C). These guidelines outline best practices to make web content:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Perceivable:</strong> Information and user interface components must be presentable to users in ways they can perceive.</li>
          <li><strong>Operable:</strong> Interface components and navigation must be operable via keyboard and assistive devices.</li>
          <li><strong>Understandable:</strong> Information and the operation of the user interface must be clear, predictable, and logical.</li>
          <li><strong>Robust:</strong> Content must be robust enough to be interpreted reliably by a wide variety of user agents, including screen readers.</li>
        </ul>
        <p className="text-xs text-muted italic">
          Disclaimer: While we continuously work toward Level AA conformance, we do not claim formal third-party certification.
          Certain specialized document canvas operations remain subject to inherent technical constraints.
        </p>
      </section>

      {/* 3. Features */}
      <section id="features" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. Implemented Accessibility Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <Keyboard size={16} className="text-brand" /> Keyboard Navigation
            </span>
            <p className="text-muted">
              Interactive buttons, navigation links, file dropzones, and modals feature visible focus rings (<code>focus:ring-2</code>)
              and can be operated using standard keyboard keys (<code>Tab</code>, <code>Enter</code>, <code>Space</code>, and <code>Esc</code>).
            </p>
          </div>

          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <Eye size={16} className="text-emerald-500" /> Contrast &amp; Theming
            </span>
            <p className="text-muted">
              High-contrast text color palettes in both dark mode and light mode exceed standard contrast ratios (4.5:1 for normal text).
            </p>
          </div>

          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <Monitor size={16} className="text-brand" /> Semantic HTML5
            </span>
            <p className="text-muted">
              Pages are structured using standard semantic landmarks (<code>header</code>, <code>nav</code>, <code>main</code>, <code>section</code>, <code>footer</code>)
              and descriptive heading hierarchies (H1 to H4).
            </p>
          </div>

          <div className="p-5 rounded-md bg-surface border border-border space-y-2">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-sky-500" /> ARIA Attributes
            </span>
            <p className="text-muted">
              Form fields, alert callouts, and progress bars utilize <code>role=&quot;alert&quot;</code>, <code>aria-label</code>,
              and <code>aria-live</code> attributes to announce status updates to screen readers.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Known Limitations */}
      <section id="known-limitations" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          4. Known Limitations &amp; Technical Constraints
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          Due to the nature of client-side document processing, some features present accessibility challenges:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Canvas-Based Visual Drawing:</strong> Tools such as Sign PDF (drawing handwritten signatures) and Redact PDF (drawing visual blackout boxes) rely on HTML5 Canvas coordinates. These visual drawing workflows may be difficult to operate solely via screen reader or keyboard. We are exploring coordinate-based text input alternatives.
          </li>
          <li>
            <strong>Scanned Bitmap PDFs:</strong> Scanned PDF documents that contain raster images without embedded text streams are unreadable by screen readers by default. Users are encouraged to run our <Link href="/tools/ocr-pdf" className="text-brand font-semibold hover:underline">OCR PDF</Link> tool to extract and embed machine-readable text into the file.
          </li>
          <li>
            <strong>Third-Party Advertisements:</strong> Third-party advertising iframes served on the Free plan (via Monetag) are generated externally and may not consistently conform to our internal accessibility standards. Upgrading to Ad-Free unloads all third-party advertising scripts.
          </li>
        </ul>
      </section>

      {/* 5. Compatibility */}
      <section id="assistive-technologies" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Compatibility with Browsers &amp; Assistive Technologies
        </h2>
        <p>
          DocuNexa is optimized for modern web standards and tested across:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Browsers:</strong> Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge.</li>
          <li><strong>Screen Readers:</strong> NVDA, JAWS, and Apple VoiceOver.</li>
          <li><strong>Zoom &amp; Magnification:</strong> Interfaces support browser zoom up to 200% without loss of content or breaking mobile responsiveness.</li>
        </ul>
      </section>

      {/* 6. Reporting Barriers */}
      <section id="feedback-mechanism" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. How to Report Accessibility Barriers
        </h2>
        <p>
          We welcome your feedback on the accessibility of DocuNexa. If you encounter an accessibility barrier or require content
          in an alternate accessible format, please contact us:
        </p>
        <div className="p-5 rounded-md bg-surface border border-border text-xs sm:text-sm font-mono text-ink space-y-1">
          <p><strong>Accessibility Inquiries:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Subject Tag:</strong> [Accessibility Issue Report]</p>
          <p><strong>Please Include:</strong> The specific URL or tool, the assistive technology you are using (e.g. VoiceOver, NVDA), and a brief description of the obstacle encountered.</p>
        </div>
      </section>

      {/* 7. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. Accessibility Support Contact
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          Our accessibility team aims to respond to barrier reports within 3 business days.
          Email: <a href="mailto:docunexa.security@gmail.com" className="text-brand font-semibold hover:underline">docunexa.security@gmail.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

