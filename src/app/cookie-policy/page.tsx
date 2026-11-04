import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Cookie, ShieldCheck, CheckCircle2, Lock, Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy — DocuNexa',
  description:
    'Transparent disclosure of essential session cookies, local storage preferences, and third-party advertising scripts used on DocuNexa.',
  alternates: {
    canonical: 'https://docunexa.pro.et/cookie-policy',
  },
};

const TOC = [
  { id: 'overview', title: '1. What Are Cookies?' },
  { id: 'strictly-necessary', title: '2. Essential & Authentication Cookies' },
  { id: 'local-storage', title: '3. Local Browser Storage (HTML5)' },
  { id: 'analytics-cookies', title: '4. First-Party Cookieless Analytics' },
  { id: 'advertising-cookies', title: '5. Third-Party Advertising Cookies (Monetag)' },
  { id: 'duration', title: '6. Storage Durations' },
  { id: 'browser-management', title: '7. How to Manage Cookies in Your Browser' },
  { id: 'updates', title: '8. Updates to this Cookie Policy' },
  { id: 'contact', title: '9. Cookie & Privacy Inquiries' },
];

export default function CookiePolicyPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="Clear, honest disclosure of our minimal cookie usage, essential session storage, and third-party advertising script management."
      badge="Cookies & Tracking"
      badgeIcon={Cookie}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/cookie-policy"
      toc={TOC}
    >
      {/* 1. What Are Cookies? */}
      <section id="overview" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          1. What Are Cookies &amp; Local Storage?
        </h2>
        <p>
          Cookies are small text files stored on your computer or mobile device when you load websites. Local storage (such as HTML5 <code>localStorage</code>)
          allows web applications to preserve settings and preferences across browser sessions without transmitting data with every HTTP request.
        </p>
        <p>
          DocuNexa uses cookies and local storage strictly to provide secure authenticated sessions, remember your visual interface preferences,
          and serve advertising to fund free server infrastructure for non-upgraded accounts.
        </p>
      </section>

      {/* 2. Strictly Necessary */}
      <section id="strictly-necessary" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock size={20} className="text-emerald-500 shrink-0" />
          2. Essential &amp; Authentication Cookies
        </h2>
        <p>
          These cookies are technically indispensable for the website to function. They cannot be turned off in our systems:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="p-3">Cookie / Identifier</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <td className="p-3 font-mono">sb-*-auth-token</td>
                <td className="p-3">Supabase Auth</td>
                <td className="p-3">Stores encrypted JWT session credentials for logged-in users.</td>
                <td className="p-3">Session / 1 Year</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">_vercel_jwt</td>
                <td className="p-3">Vercel Edge</td>
                <td className="p-3">Security validation and edge routing protection.</td>
                <td className="p-3">Session</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Local Storage */}
      <section id="local-storage" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          3. Local Browser Storage (HTML5 localStorage)
        </h2>
        <p>
          We use client-side <code>localStorage</code> exclusively to enhance your editing workspace:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <li><code>theme</code>: Remembers your dark mode / light mode interface preference.</li>
          <li><code>tool-preferences</code>: Preserves non-sensitive settings (e.g. selected page rotation angle or default export format).</li>
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Document contents, PDF binaries, and password strings are <strong>NEVER</strong> written to <code>localStorage</code>.
        </p>
      </section>

      {/* 4. Analytics */}
      <section id="analytics-cookies" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          4. Analytics &amp; Tracking Practices (First-Party Cookieless Telemetry)
        </h2>
        <p>
          DocuNexa does <strong>not</strong> install first-party tracking cookies or employ third-party commercial marketing suites like Google Analytics or Meta Pixel.
        </p>
        <p>
          Our internal aggregate traffic telemetry operates on a cookieless model:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Zero First-Party Tracking Cookies:</strong> The telemetry endpoint (<code>/api/analytics/track</code>) does not write persistent tracking cookies or user identification tokens to your browser.</li>
          <li><strong>Cryptographic Daily Hashing:</strong> Aggregate unique visitor counts are estimated server-side using a rotating daily salt (<code>ANALYTICS_SALT</code>) hashed with coarse IP and user-agent data. Hashes are discarded daily and cannot be linked across calendar days.</li>
        </ul>
      </section>

      {/* 5. Advertising Scripts */}
      <section id="advertising-cookies" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone size={20} className="text-amber-500 shrink-0" />
          5. Third-Party Advertising &amp; Tracking Cookies (Free Plan Only)
        </h2>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-2">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck size={16} />
            Important Tracking Disclosure for Free Users:
          </p>
          <p>
            DocuNexa does <strong>not</strong> claim zero tracking cookies for visitors using the free tier. To finance free server infrastructure, DocuNexa integrates third-party advertising networks (Monetag) for anonymous visitors and Free plan accounts.
          </p>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          When accessing DocuNexa without an Ad-Free upgrade, third-party advertising scripts (served via domains such as <code>quge5.com</code>, <code>al5sm.com</code>, and the service worker <code>/sw.js</code>) are active:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Third-Party Ad Cookies &amp; Storage:</strong> Monetag and its advertising demand partners may place or read third-party cookies, local storage keys, and device identifiers to measure impressions, perform ad fraud verification, and control frequency capping (e.g. limiting popunder and banner repeats).</li>
          <li><strong>Sandbox Isolation:</strong> Even with advertising active, advertising scripts operate in standard browser sandbox isolation and have <strong>strictly zero access</strong> to your PDF files, in-memory buffers, or document text.</li>
          <li>
            <strong>Complete Ad &amp; Ad-Tracker Suppression:</strong> Upgrading to <Link href="/choose-plan" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Ad-Free ($2.00 USD one-time)</Link> completely suppresses all Monetag script tags at the server render level and unregisters any active advertising service workers, ensuring zero third-party advertising cookies are loaded for your account.
          </li>
        </ul>
      </section>

      {/* 6. Duration */}
      <section id="duration" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          6. Storage Durations
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Session Cookies:</strong> Erased automatically when you close your browser application.</li>
          <li><strong>Persistent Auth Cookies:</strong> Maintained for up to 1 year unless you click &quot;Log Out&quot;.</li>
          <li><strong>Local Storage:</strong> Persists until cleared manually in your browser settings.</li>
        </ul>
      </section>

      {/* 7. Browser Management */}
      <section id="browser-management" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          7. How to Manage or Block Cookies in Your Browser
        </h2>
        <p>
          You have full control over cookie storage in all modern web browsers. You can block or delete cookies through your browser preferences:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Google Chrome:</strong> Settings &gt; Privacy and security &gt; Cookies and other site data.</li>
          <li><strong>Mozilla Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data.</li>
          <li><strong>Apple Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data.</li>
          <li><strong>Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies.</li>
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Note: Blocking essential session cookies will prevent login and account management features from operating, but anonymous client-side PDF tools will remain functional.
        </p>
      </section>

      {/* 8. Updates */}
      <section id="updates" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          8. Updates to this Cookie Policy
        </h2>
        <p>
          We may update this policy if our technical cookie usage evolves. Significant revisions will be reflected with an updated effective date.
        </p>
      </section>

      {/* 9. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          9. Cookie &amp; Privacy Inquiries
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          For questions regarding our cookie practices, reach our privacy desk at{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
            docunexa.security@gmail.com
          </a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

