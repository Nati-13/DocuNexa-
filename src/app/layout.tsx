import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

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
    canonical: 'https://docunexa.pro.et',
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
    url: 'https://docunexa.pro.et',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://docunexa.pro.et/#website',
        url: 'https://docunexa.pro.et',
        name: 'DocuNexa',
        description: 'DocuNexa — Every PDF tool. One simple workspace.',
        publisher: {
          '@id': 'https://docunexa.pro.et/#organization',
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://docunexa.pro.et/#organization',
        name: 'DocuNexa',
        url: 'https://docunexa.pro.et',
        logo: 'https://docunexa.pro.et/icon.svg',
      },
    ],
  };
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col transition-colors">
        <Navbar />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
