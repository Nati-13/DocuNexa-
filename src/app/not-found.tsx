import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | DocuNexa',
  description: 'The requested tool or page does not exist in DocuNexa.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
          <FileQuestion size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Page or Tool Not Found</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The page or tool URL you requested does not exist in the DocuNexa registry.
          </p>
        </div>
        <div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Browse All 34 Tools</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
