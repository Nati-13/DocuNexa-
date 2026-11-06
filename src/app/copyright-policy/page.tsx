import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Copyright, ShieldCheck, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Copyright & IP Policy — DocuNexa',
  description:
    'DocuNexa Copyright & Intellectual Property Policy. User document ownership guarantees, platform branding rights, and formal copyright infringement notification procedures.',
  alternates: {
    canonical: 'https://docunexa.pro.et/copyright-policy',
  },
};

const TOC = [
  { id: 'ownership-guarantee', title: '1. User Document Ownership Guarantee' },
  { id: 'platform-ip', title: '2. DocuNexa Intellectual Property' },
  { id: 'user-responsibilities', title: '3. User Responsibility for Third-Party Content' },
  { id: 'infringement-reporting', title: '4. Copyright Infringement Complaint Process' },
  { id: 'counter-notice', title: '5. Counter-Notification Procedure' },
  { id: 'repeat-infringers', title: '6. Repeat Infringer Policy' },
  { id: 'contact', title: '7. Copyright Complaint Contact Process' },
];

export default function CopyrightPolicyPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Copyright & IP Policy"
      subtitle="Ensuring user document ownership, protecting platform assets, and providing international intellectual property notice procedures."
      badge="Intellectual Property"
      badgeIcon={Copyright}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/copyright-policy"
      toc={TOC}
    >
      {/* 1. User Document Ownership Guarantee */}
      <section id="ownership-guarantee" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. User Document Ownership Guarantee
        </h2>
        <div className="p-5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 space-y-2">
          <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            You Own 100% of Your Documents
          </p>
          <p>
            DocuNexa asserts <strong>ZERO ownership, copyright, licensing, or commercial claims</strong> over any documents,
            text, images, chapters, or files loaded into, edited by, or downloaded from our platform.
          </p>
          <p>
            Because all document rendering, splitting, compression, and conversion processes occur locally inside your device&apos;s browser memory,
            your files are never acquired, published, or stored by DocuNexa. You remain the sole and exclusive copyright owner of your materials.
          </p>
        </div>
      </section>

      {/* 2. Platform IP */}
      <section id="platform-ip" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. DocuNexa Intellectual Property &amp; Branding
        </h2>
        <p>
          The DocuNexa name, logo, graphic designs, UI components, styling, documentation, domain names, and underlying software codebase
          are the exclusive intellectual property of DocuNexa and its contributors, protected by international copyright, trademark,
          and trade secret treaties.
        </p>
        <p>
          You may not copy, mirror, frame, reverse-engineer, decompile, or create derivative works from the DocuNexa website infrastructure
          without express prior written consent.
        </p>
      </section>

      {/* 3. User Responsibility */}
      <section id="user-responsibilities" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. User Responsibility for Third-Party Content
        </h2>
        <p>
          You are solely responsible for ensuring that you possess the appropriate legal rights, licenses, or fair-use authorizations
          to process, split, convert, or excerpt the documents you load into DocuNexa.
        </p>
        <p>
          You agree not to use DocuNexa utilities to circumvent digital rights management (DRM), strip legitimate copyright notices,
          or facilitate the unauthorized commercial distribution of copyrighted academic textbooks, commercial publications, or proprietary works.
        </p>
      </section>

      {/* 4. Infringement Reporting */}
      <section id="infringement-reporting" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Copyright Infringement Complaint Process
        </h2>
        <p>
          DocuNexa operates entirely via client-side in-browser WebAssembly and Web Worker pipelines; our infrastructure maintains zero public file-hosting, file-sharing, or document-storage repositories. All files opened in DocuNexa exist exclusively in the temporary RAM of the individual user&apos;s device and are never hosted, published, or stored on DocuNexa servers.
        </p>
        <p>
          DocuNexa does not claim a formally designated DMCA agent registered with the U.S. Copyright Office under 17 U.S.C. § 512(c)(2), as we do not host user-uploaded files or operate a public content storage service. However, we strictly respect intellectual property rights. If you believe that any platform tutorial, graphic asset, documentation, or content hosted directly on{' '}
          <a href="https://docunexa.pro.et" className="text-brand hover:underline">
            https://docunexa.pro.et
          </a>{' '}
          infringes upon your copyright, please submit a written infringement notice containing:
        </p>
        <div className="p-5 rounded-md bg-surface border border-border text-xs sm:text-sm font-mono text-ink space-y-2">
          <p>1. Identification of the copyrighted work claimed to have been infringed.</p>
          <p>2. Identification of the specific URL on docunexa.pro.et claimed to be infringing.</p>
          <p>3. Your full legal name, physical address, telephone number, and official email address.</p>
          <p>4. A statement: &quot;I have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.&quot;</p>
          <p>5. A statement: &quot;I declare under penalty of perjury that the information in this notification is accurate, and that I am the copyright owner or authorized to act on their behalf.&quot;</p>
          <p>6. Your physical or electronic signature.</p>
        </div>
        <p className="text-xs text-muted">
          Send formal notices via email to <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a>.
        </p>
      </section>

      {/* 5. Counter-Notice */}
      <section id="counter-notice" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Counter-Notification Procedure
        </h2>
        <p>
          If material you posted on our platform is removed or disabled as a result of an infringement notice and you believe this was due to
          mistake or misidentification, you may submit a formal counter-notification to{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">
            docunexa.security@gmail.com
          </a>{' '}
          satisfying statutory requirements.
        </p>
      </section>

      {/* 6. Repeat Infringers */}
      <section id="repeat-infringers" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. Repeat Infringer Policy
        </h2>
        <p>
          In accordance with international intellectual property treaties, DocuNexa reserves the right to terminate accounts
          of users who repeatedly or egregiously infringe upon intellectual property rights.
        </p>
      </section>

      {/* 7. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. Copyright Complaint Contact Process
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          Direct all copyright and intellectual property correspondence to our dedicated operational email:
        </p>
        <div className="p-4 rounded-md bg-surface border border-border font-mono text-xs text-ink space-y-1">
          <p><strong>Copyright Review Desk:</strong> DocuNexa Intellectual Property Review</p>
          <p><strong>Email:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Subject Line:</strong> [Copyright Complaint] &lt;Affected URL or Asset&gt;</p>
          <p><strong>Target Response:</strong> We aim to review and investigate legitimate notices within 24 to 48 business hours.</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

