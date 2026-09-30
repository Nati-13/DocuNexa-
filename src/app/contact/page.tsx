import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  Github,
  Bug,
  MessageSquare,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact DocuNexa — Support, Feedback & Bug Reports',
  description:
    'Get in touch with the DocuNexa maintainer for bug reports, tool feedback, feature suggestions, or general project inquiries.',
  alternates: {
    canonical: 'https://docunexa.pro.et/contact',
  },
};

export default function ContactPage() {
  const contactChannels = [
    {
      title: 'GitHub Issues & Bug Reports',
      desc: 'Encountered a bug with a specific PDF format, tool error, or visual workspace glitch? Open an issue on GitHub for transparent tracking and swift resolution.',
      icon: Bug,
      actionText: 'Open GitHub Issue',
      href: 'https://github.com/Nati-13/DocuNexa-/issues',
      isExternal: true,
      badge: 'Recommended for Bugs',
    },
    {
      title: 'Direct Email Support',
      desc: 'For general inquiries, project partnerships, feedback on textbook slicing, or private questions, reach out directly to the maintainer via email.',
      icon: Mail,
      actionText: 'Send Email to natanemyalew10@gmail.com',
      href: 'mailto:natanemyalew10@gmail.com',
      isExternal: false,
      badge: 'Direct Contact',
    },
    {
      title: 'Feature Requests & Ideas',
      desc: 'Have an idea for a new PDF tool, unit detection algorithm improvement, or educational workflow? Submit a feature suggestion on GitHub.',
      icon: Sparkles,
      actionText: 'View Project Repository',
      href: 'https://github.com/Nati-13/DocuNexa-',
      isExternal: true,
      badge: 'Community',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <Mail size={14} />
            <span>Get in Touch</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Contact DocuNexa
          </h1>
          <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
            Have a question, feedback, or a bug to report? We welcome your input to make DocuNexa even better.
          </p>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 gap-6">
          {contactChannels.map((channel, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <channel.icon size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {channel.title}
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {channel.badge}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {channel.desc}
                </p>
              </div>

              <a
                href={channel.href}
                target={channel.isExternal ? '_blank' : undefined}
                rel={channel.isExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] shrink-0"
              >
                <span>{channel.actionText}</span>
                {channel.isExternal ? <ExternalLink size={14} /> : <Mail size={14} />}
              </a>
            </div>
          ))}
        </div>

        {/* What to Include in Bug Reports */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bug size={20} className="text-rose-400" />
            Reporting a Tool Issue or Processing Glitch
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Because DocuNexa runs client-side, errors usually correlate with specific PDF structure variations (e.g. encrypted streams, non-standard embedded font encodings, or scanned image sizes). When reporting an issue, please include:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>The name of the tool used (e.g., PDF Unit Cutter, Compress PDF, PDF to Word).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Your web browser name and version (e.g., Chrome 128, Firefox 130, Safari 18).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Any error message displayed in the application interface or browser developer console.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Note:</strong> Never share sensitive or confidential document files publicly on GitHub.
              </span>
            </li>
          </ul>
        </div>

        {/* Project Maintainer Note */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <p>
            DocuNexa is developed and maintained independently by Natnael Yalew (Nati-13).
          </p>
          <p className="text-xs text-slate-500">
            Canonical Production Website:{' '}
            <a href="https://docunexa.pro.et" className="text-brand-600 dark:text-brand-400 hover:underline">
              https://docunexa.pro.et
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
