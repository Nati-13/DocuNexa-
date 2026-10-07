import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentProfile, createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountView } from './AccountView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Your Account',
  description: 'Manage your DocuNexa account, plan entitlement, and preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();
  const { data: orders } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-[calc(100vh-140px)] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <AccountView user={profile} payments={orders || []} />
    </main>
  );
}
