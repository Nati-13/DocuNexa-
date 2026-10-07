import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/admin/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Admin Control Center | DocuNexa',
  description: 'Private administrative management for DocuNexa.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login?redirect=/admin');
  }

  const isAdmin = await isUserAdmin(profile.id);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-16 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">403 — Access Forbidden</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administrator privileges are required to access this portal. Your account is not authorized for administrative access.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-all shadow-sm"
            >
              <ArrowLeft size={14} /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Admin Top Banner */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to Site
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="inline-flex items-center gap-2">
              <div className="p-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <ShieldCheck size={18} />
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                DocuNexa <span className="text-brand-600 dark:text-brand-400">Admin</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-block text-slate-500 dark:text-slate-400">
              Admin: <strong className="text-slate-900 dark:text-white">{profile.email}</strong>
            </span>
            <div className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase tracking-wider">
              Superadmin
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 dark:border-slate-800/60">
          <AdminNav />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
