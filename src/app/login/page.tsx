import { Suspense } from 'react';
import { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your DocuNexa account to view your plan and settings.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
