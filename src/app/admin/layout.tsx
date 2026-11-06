import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile, hasUserAcceptedCurrentTerms } from '@/lib/supabase/server';
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
  const headersList = await headers();
  const reqUrl = headersList.get('x-pathname') || headersList.get('next-url') || '';
  if (reqUrl.includes('/admin/setup')) {
    return <>{children}</>;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login?redirect=/admin');
  }

  const hasConsent = await hasUserAcceptedCurrentTerms(profile.id);
  if (!hasConsent) {
    redirect('/accept-terms?redirect=/admin');
  }

  const isAdmin = await isUserAdmin(profile.id);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-paper flex flex-col justify-center items-center px-4 py-16 text-center">
        <div className="max-w-md w-full p-8 rounded-md bg-surface border border-border shadow-subtle space-y-4">
          <div className="w-12 h-12 mx-auto rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-xl font-bold text-ink">403 — Access Forbidden</h1>
          <p className="text-xs text-muted">
            Administrator privileges are required to access this portal. Your account is not authorized for administrative access.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-all shadow-sm"
            >
              <ArrowLeft size={14} /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Admin Top Banner */}
      <header className="sticky top-0 z-40 bg-surface  border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to Site
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="inline-flex items-center gap-2">
              <div className="p-1 rounded-lg bg-brand-500/10 text-brand">
                <ShieldCheck size={18} />
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-ink">
                DocuNexa <span className="text-brand">Admin</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-block text-muted">
              Admin: <strong className="text-ink">{profile.email}</strong>
            </span>
            <div className="px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-[10px] uppercase tracking-wider">
              Superadmin
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border/60">
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
