import { Metadata } from 'next';
import { AdminSetupForm } from '../admin/setup/AdminSetupForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administrator Setup | DocuNexa',
  description: 'First-time administrative configuration for DocuNexa.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSetupPage() {
  return (
    <main className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <AdminSetupForm />
    </main>
  );
}
