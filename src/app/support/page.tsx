import React from 'react';
import type { Metadata } from 'next';
import { SupportClient } from './SupportClient';
import { LifeBuoy } from 'lucide-react';

export const metadata: Metadata = {
  title: 'DocuNexa Support — Help Center, Telegram & Website Ticket',
  description:
    'Need help with PDF Unit Cutter, coupons, or plan upgrades? Contact DocuNexa support via Telegram @docunexa_bot or submit a support ticket.',
  alternates: {
    canonical: 'https://docunexa.pro.et/support',
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 md:py-20 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Page Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <LifeBuoy size={14} />
            <span>Support & Help Desk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            How Can We Help You?
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            Reach our support team via Telegram for instant messaging, or submit an official website ticket below.
          </p>
        </div>

        {/* Client Interactive Section */}
        <SupportClient />
      </div>
    </div>
  );
}
