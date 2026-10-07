import { Metadata } from 'next';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forgot Password | DocuNexa',
  description: 'Recover your DocuNexa account password using a secure 6-character recovery code.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <ForgotPasswordForm />
    </main>
  );
}
