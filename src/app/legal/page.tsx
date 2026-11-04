import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Scale,
  ShieldCheck,
  FileText,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Cookie,
  Copyright,
  Lock,
  Accessibility,
  Server,
  ArrowRight,
  Globe,
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Legal & Policy Center — DocuNexa',
  description:
    'Comprehensive legal policies, terms of service, international privacy standards, refund terms, and security disclosures for DocuNexa.',
  alternates: {
    canonical: 'https://docunexa.pro.et/legal',
  },
};

interface PolicyCard {
  href: string;
  title: string;
  category: 'Governance' | 'Privacy & Security' | 'Payments & Consumer' | 'Compliance';
  description: string;
  icon: React.ElementType;
  version: string;
  badge?: string;
}

const POLICIES: PolicyCard[] = [
  {
    href: '/terms-of-service',
    title: 'Terms of Service',
    category: 'Governance',
    description:
      'The comprehensive international agreement governing tool usage, user rights, document ownership, intellectual property, and platform limitations.',
    icon: FileText,
    version: 'v2026.11',
    badge: 'Core Agreement',
  },
  {
    href: '/privacy-policy',
    title: 'Privacy Policy',
    category: 'Privacy & Security',
    description:
      'Detailed explanation of client-side in-memory processing, zero server document uploads, Supabase authentication, privacy-preserving analytics, and international GDPR/CCPA rights.',
    icon: ShieldCheck,
    version: 'v2026.11',
    badge: 'Zero Uploads',
  },
  {
    href: '/refund-policy',
    title: 'Refund & Cancellation Policy',
    category: 'Payments & Consumer',
    description:
      'Clear consumer terms covering the $2 one-time Ad-Free upgrade, blockchain payment exception resolutions (wrong amounts, duplicate transfers), and non-waivable statutory rights.',
    icon: RotateCcw,
    version: 'v2026.11',
  },
  {
    href: '/acceptable-use',
    title: 'Acceptable Use Policy',
    category: 'Governance',
    description:
      'Defines prohibited behaviors including malware distribution, automated abuse, denial of service, copyright infringement, and account suspension procedures.',
    icon: AlertTriangle,
    version: 'v2026.11',
  },
  {
    href: '/payment-policy',
    title: 'Payment & Crypto Policy',
    category: 'Payments & Consumer',
    description:
      'Technical rules for accepted payment networks (Polygon USDT, Aptos USDT) and explicit documentation of planned but disabled methods (TRON TRC20, Polygon native USDC).',
    icon: CreditCard,
    version: 'v2026.11',
    badge: 'Payment Rails',
  },
  {
    href: '/cookie-policy',
    title: 'Cookie Policy',
    category: 'Privacy & Security',
    description:
      'Transparent documentation of session authentication cookies, local preferences storage, and third-party advertising scripts for non-upgraded workspaces.',
    icon: Cookie,
    version: 'v2026.11',
  },
  {
    href: '/copyright-policy',
    title: 'Copyright & Intellectual Property',
    category: 'Compliance',
    description:
      'Confirms 100% user copyright retention on all uploaded documents, platform copyright notices, and formal international DMCA/IP notice submission channels.',
    icon: Copyright,
    version: 'v2026.11',
  },
  {
    href: '/security-policy',
    title: 'Security & Vulnerability Disclosure',
    category: 'Privacy & Security',
    description:
      'Our vulnerability reporting guidelines, safe harbor rules for ethical researchers, incident response workflows, and technical encryption boundaries.',
    icon: Lock,
    version: 'v2026.11',
    badge: 'Safe Harbor',
  },
  {
    href: '/accessibility',
    title: 'Accessibility Statement',
    category: 'Compliance',
    description:
      'Our ongoing commitment to WCAG 2.1 AA usability, keyboard navigation, screen reader accessibility, semantic markup, and barrier reporting mechanisms.',
    icon: Accessibility,
    version: 'v2026.11',
  },
  {
    href: '/subprocessors',
    title: 'Subprocessors & Infrastructure',
    category: 'Compliance',
    description:
      'Official list of third-party cloud infrastructure partners (Vercel, Supabase, Bybit API, Aptos RPC) used to deliver hosting, database, and payment verification services.',
    icon: Server,
    version: 'v2026.11',
  },
];

export default function LegalHubPage() {
  const lastUpdated = 'November 1, 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <Scale size={14} />
            <span>International Trust & Compliance Center</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            DocuNexa Legal & Policies
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Transparent, accessible, and comprehensive legal agreements governing our client-side PDF workspace,
            protecting international customer privacy, and clarifying technical platform boundaries.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Current Revision: v2026.11 • Effective: {lastUpdated} • Canonical Domain:{' '}
            <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
              https://docunexa.pro.et
            </a>
          </p>
        </div>

        {/* Global Principles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              100% Client-Side Privacy
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Files loaded into DocuNexa are processed in your personal device RAM using WebAssembly and PDF.js.
              Your files never upload to our servers, ensuring absolute confidentiality.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Globe size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              International Audience
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              DocuNexa serves users worldwide. Our policies respect mandatory international consumer rights,
              GDPR/CCPA privacy standards, and universal fair access principles across borders.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <HeartHandshake size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              User Document Ownership
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You retain full, exclusive copyright and ownership of every document processed. DocuNexa never claims
              licenses, ownership, or training rights over your PDFs or their textual contents.
            </p>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Policy & Legal Directory
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Browse our complete suite of 10 official legal, privacy, and compliance documents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {POLICIES.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-950/50 transition-colors">
                          <Icon size={18} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-[10px] font-bold border border-brand-200 dark:border-brand-800">
                            {p.badge}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400">
                          {p.version}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {p.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
                    <span>Read Policy</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Legal Disclaimer & Review Note */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Legal Business Notice & Professional Review Marker
          </h4>
          <p>
            DocuNexa is operated as an independent international software productivity project (DocuNexa Operations). The documents
            provided in this Legal Center reflect the genuine technical architecture and operational practices of the platform.
            All legal notices, regulatory compliance inquiries, and service requests are administered directly through our central operations desk.
          </p>
          <p>
            For legal service of process, regulatory compliance inquiries, or certified translation requests, contact our legal team at{' '}
            <a href="mailto:docunexa.security@gmail.com" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              docunexa.security@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}

