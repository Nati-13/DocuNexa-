import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Fraunces, Public_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth';
import { isUserAdFree } from '@/lib/planCatalog';
import { AuthProvider } from '@/context/AuthContext';
import { MonetagServiceWorkerCleanup } from '@/components/ads/MonetagController';
import { MonetagZone, MonetagMainZone } from '@/components/ads/MonetagZone';
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';
import { FloatingSupportButton } from '@/components/layout/FloatingSupportButton';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { BackToTop } from '@/components/ui/BackToTop';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif-display',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://docunexa.pro.et'),
  title: {
    default: 'DocuNexa — Every PDF tool. One simple workspace.',
    template: '%s | DocuNexa',
  },
  description:
    'Free, private client-side PDF tools in one clean workspace. Split textbooks into chapters with PDF Unit Cutter, merge, compress, convert, edit, and organize documents directly in your browser.',
  alternates: {
    canonical: 'https://docunexa.pro.et/',
  },
  keywords: [
    'DocuNexa',
    'PDF tools',
    'PDF Unit Cutter',
    'split PDF',
    'merge PDF',
    'textbook chapter splitter',
    'compress PDF',
    'PDF to Word',
    'convert PDF',
    'client-side PDF editor',
    'private PDF tools',
  ],
  authors: [{ name: 'DocuNexa' }],
  creator: 'DocuNexa',
  openGraph: {
    title: 'DocuNexa — Every PDF tool. One simple workspace.',
    description:
      'Free, private client-side PDF tools in one clean workspace. Split textbooks into chapters with PDF Unit Cutter, merge, compress, convert, edit, and organize documents directly in your browser.',
    url: 'https://docunexa.pro.et/',
    siteName: 'DocuNexa',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://docunexa.pro.et/icon.svg',
        width: 512,
        height: 512,
        alt: 'DocuNexa — Every PDF tool. One simple workspace.',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'DocuNexa — Every PDF tool. One simple workspace.',
    description:
      'Free, private client-side PDF tools in one clean workspace. Split textbooks into chapters with PDF Unit Cutter, merge, compress, convert, edit, and organize documents directly in your browser.',
    images: ['https://docunexa.pro.et/icon.svg'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const isAdFree = isUserAdFree(user?.plan, (user as any)?.subscription_expires_at);

  const rootJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://docunexa.pro.et/#website',
        url: 'https://docunexa.pro.et/',
        name: 'DocuNexa',
        alternateName: 'DocuNexa PDF Tools',
        description: 'DocuNexa — Every PDF tool. One simple workspace.',
        publisher: {
          '@id': 'https://docunexa.pro.et/#organization',
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://docunexa.pro.et/#organization',
        name: 'DocuNexa',
        url: 'https://docunexa.pro.et/',
        logo: 'https://docunexa.pro.et/icon.svg',
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`h-full ${fraunces.variable} ${publicSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Zero-flash blocking theme initialization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-paper text-ink font-sans antialiased flex flex-col transition-colors selection:bg-brand/15 selection:text-ink">
        <AnalyticsTracker />
        <AuthProvider initialUser={user ? { 
          id: user.id, 
          email: user.email, 
          plan: user.plan, 
          subscription_expires_at: (user as any)?.subscription_expires_at || null,
          subscription_started_at: (user as any)?.subscription_started_at || null,
          created_at: user.created_at 
        } : null}>
          <Navbar />
          <ScrollProgress />
          <div className="flex-1">
            {children}
          </div>
          <BackToTop />
          <FloatingSupportButton />
          <Footer />
          <MonetagZone zoneId="12217455" />
          <MonetagMainZone
            src="https://quge5.com/88/tag.min.js"
            data-zone="289364"
            data-cfasync="false"
            strategy="afterInteractive"
          />
          <MonetagServiceWorkerCleanup />
        </AuthProvider>
      </body>
    </html>
  );
}
