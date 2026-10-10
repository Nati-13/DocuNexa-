'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LifeBuoy,
  X,
  Send,
  MessageSquare,
  ExternalLink,
  ChevronUp,
} from 'lucide-react';
import { TELEGRAM_BOT_HANDLE, TELEGRAM_BOT_URL } from '@/lib/telegram/constants';

export const FloatingSupportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Hide on admin portal to keep admin space distraction-free
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 print:hidden">
      {/* Expanded Quick Help Popup */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Support options"
          className="mb-3 w-72 sm:w-80 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                <LifeBuoy size={16} />
              </div>
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                DocuNexa Support
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close support popup"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Telegram Support Button */}
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/60 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors text-sky-900 dark:text-sky-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Send size={15} className="rotate-45" />
                </div>
                <div>
                  <div className="font-bold text-[11px] flex items-center gap-1">
                    Telegram Support <ExternalLink size={10} className="text-sky-500" />
                  </div>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                    {TELEGRAM_BOT_HANDLE}
                  </span>
                </div>
              </div>
            </a>

            {/* Website Support Form Button */}
            <Link
              href="/support"
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare size={15} />
                </div>
                <div>
                  <div className="font-bold text-[11px]">Web Support Form</div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Open a support ticket
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 pt-1">
            Fast assistance for PDF tools & accounts
          </p>
        </div>
      )}

      {/* Floating Action Toggle Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Support & Help"
        className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-xl shadow-brand-500/30 hover:shadow-brand-500/40 transition-all hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
      >
        <span className="flex items-center justify-center">
          {isOpen ? <ChevronUp size={18} /> : <LifeBuoy size={18} className="animate-pulse" />}
        </span>
        <span className="text-xs font-bold tracking-wide hidden sm:inline">
          {isOpen ? 'Close' : 'Support'}
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 ring-2 ring-brand-600" />
      </button>
    </div>
  );
};
