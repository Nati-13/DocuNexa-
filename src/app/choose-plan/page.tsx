import { Metadata } from 'next';
import { PlanSelection } from './PlanSelection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Choose Your DocuNexa Plan',
  description: 'Select between our Free ad-supported plan or $2 one-time Ad-Free upgrade.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChoosePlanPage() {
  return (
    <main className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <PlanSelection />
    </main>
  );
}
