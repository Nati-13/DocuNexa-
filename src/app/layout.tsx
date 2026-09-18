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
  title: {
    default: 'DocuNexa — Every PDF tool. One simple workspace.',
    template: '%s | DocuNexa',
  },
  description:
    'Split, merge, convert, edit, secure, and intelligently manage your documents with 100% browser-based privacy. Features the intelligent PDF Unit Cutter to slice textbooks into organized chapters.',
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
    'AI PDF summarizer',
    'client-side PDF editor',
    'private PDF tools',
  ],
  authors: [{ name: 'DocuNexa' }],
  creator: 'DocuNexa',
  openGraph: {
    title: 'DocuNexa — Every PDF tool. One simple workspace.',
    description:
      'The modern, privacy-first PDF productivity platform. Split textbooks into units, merge, convert, compress, edit, and secure your files directly in your browser.',
    siteName: 'DocuNexa',
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
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
