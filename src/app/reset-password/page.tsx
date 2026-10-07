import { Suspense } from 'react';
import { Metadata } from 'next';
import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reset Password | DocuNexa',
  description: 'Enter your 6-character recovery code to reset your DocuNexa account password.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading recovery form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
