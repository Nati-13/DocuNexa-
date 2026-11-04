import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, hasUserAcceptedCurrentTerms } from '@/lib/supabase/server';
import { AcceptTermsForm } from './AcceptTermsForm';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Accept Updated Terms & Privacy Policy | DocuNexa',
  description: 'Review and accept DocuNexa updated international terms of service and privacy policy to continue.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AcceptTermsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // If unauthenticated, redirect to login
  if (userError || !user) {
    redirect('/login?redirect=/accept-terms');
  }

  // Reject administratively blocked accounts (server-managed app_metadata)
  const appMeta = user.app_metadata || {};
  if (appMeta.consent_persistence_failed === true || appMeta.registration_failed === true) {
    redirect('/login');
  }

  // If user has already accepted the current terms in public.legal_acceptances, proceed to account
  const hasConsent = await hasUserAcceptedCurrentTerms(user.id);
  if (hasConsent) {
    redirect('/account');
  }

  return (
    <main className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Updated Legal Agreements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Please review and accept our updated Terms of Service and Privacy Policy (Version 2026.11) to continue
            accessing your DocuNexa account and features.
          </p>
        </div>

        <AcceptTermsForm userEmail={user.email || ''} />
      </div>
    </main>
  );
}

