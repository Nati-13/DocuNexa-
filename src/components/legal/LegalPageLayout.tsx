import React from 'react';
import Link from 'next/link';
import {
  Scale,
  ShieldCheck,
  FileText,
  Lock,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Cookie,
  Copyright,
  Accessibility,
  Server,
  ArrowLeft,
  Calendar,
  Mail,
} from 'lucide-react';
import { CopyPageLinkButton } from './CopyPageLinkButton';

export interface TocItem {
  id: string;
  title: string;
}

export interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  badge: string;
  badgeIcon?: React.ElementType;
  lastUpdated: string;
  version?: string;
  canonicalPath: string;
  toc: TocItem[];
  children: React.ReactNode;
}

export const ALL_LEGAL_LINKS = [
  { href: '/legal', title: 'Legal & Policies Hub', icon: Scale },
  { href: '/terms-of-service', title: 'Terms of Service', icon: FileText },
  { href: '/privacy-policy', title: 'Privacy Policy', icon: ShieldCheck },
  { href: '/refund-policy', title: 'Refund & Cancellation', icon: RotateCcw },
  { href: '/acceptable-use', title: 'Acceptable Use Policy', icon: AlertTriangle },
  { href: '/payment-policy', title: 'Payment & Crypto Policy', icon: CreditCard },
  { href: '/cookie-policy', title: 'Cookie Policy', icon: Cookie },
  { href: '/copyright-policy', title: 'Copyright & IP Policy', icon: Copyright },
  { href: '/security-policy', title: 'Security & Disclosure', icon: Lock },
  { href: '/accessibility', title: 'Accessibility Statement', icon: Accessibility },
  { href: '/subprocessors', title: 'Subprocessors & Infrastructure', icon: Server },
];

export function LegalPageLayout({
  title,
  subtitle,
  badge,
  badgeIcon: BadgeIcon = Scale,
  lastUpdated,
  version = '2026.11',
  canonicalPath,
  toc,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 md:py-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/legal" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Legal Center
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/legal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-all"
            >
              <ArrowLeft size={13} />
              <span>All Policies</span>
            </Link>
            <CopyPageLinkButton />
          </div>
        </div>

        {/* Page Header */}
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <BadgeIcon size={14} />
            <span>{badge}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Effective Date: {lastUpdated}
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Version {version}
            </span>
            <span>•</span>
            <span>Audience: International (Multinational)</span>
          </div>
        </div>

        {/* International Scope & Document Ownership Highlight Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-brand-500/10 to-indigo-500/10 border border-brand-200/80 dark:border-brand-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 font-bold">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
            <span>Core International Commitment & Document Ownership Guarantee</span>
          </div>
          <p className="leading-relaxed">
            DocuNexa is an international, browser-based document productivity platform designed for users worldwide.
            <strong> You retain 100% exclusive copyright and ownership of all documents loaded into DocuNexa.</strong>{' '}
            Our client-side architecture executes file processing in your personal browser memory. We never own, inspect,
            sell, or store your documents on our servers.
          </p>
        </div>

        {/* Main Content Layout with Sticky Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Body Column */}
          <main className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm leading-relaxed text-sm sm:text-base space-y-8">
              {children}
            </div>

            {/* Inquiries & Legal Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail size={18} className="text-brand-500" />
                Legal, Privacy & Compliance Contact
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                For formal inquiries regarding these terms, data protection requests (GDPR/CCPA/UK GDPR),
                copyright notices, security disclosures, or enterprise agreements, please contact:
              </p>
              <div className="pt-1 space-y-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:docunexa.security@gmail.com" className="text-brand-600 dark:text-brand-400 hover:underline">
                    docunexa.security@gmail.com
                  </a>
                </p>
                <p>
                  <strong>Project:</strong> DocuNexa (Independent Software Project)
                </p>
                <p>
                  <strong>Operator:</strong> DocuNexa Project Maintainers &amp; Contributors
                </p>
                <p>
                  <strong>Website:</strong>{' '}
                  <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
                    https://docunexa.pro.et
                  </a>
                </p>
              </div>
            </div>
          </main>

          {/* Sticky Table of Contents & Policy Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Table of Contents for Current Document */}
            {toc && toc.length > 0 && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  On This Page
                </h4>
                <nav className="space-y-1 text-xs">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block py-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all truncate"
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Directory of All Policies */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Legal & Policy Directory
              </h4>
              <ul className="space-y-1 text-xs">
                {ALL_LEGAL_LINKS.map((link) => {
                  const Icon = link.icon;
                  const isCurrent = link.href === canonicalPath;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg transition-all ${
                          isCurrent
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold border border-brand-200/60 dark:border-brand-800/50'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon size={14} className={isCurrent ? 'text-brand-500' : 'text-slate-400'} />
                        <span className="truncate">{link.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
