import type { Metadata } from 'next';

const CANONICAL_URL = 'https://docunexa.pro.et/tools';

export const metadata: Metadata = {
  title: 'All 34 PDF Tools — Free & Private In-Browser Document Workspace | DocuNexa',
  description:
    'Explore all 34 client-side PDF tools in DocuNexa. Split textbooks with PDF Unit Cutter, merge, compress, convert, edit, and secure PDFs with 100% in-browser privacy.',
  alternates: {
    canonical: CANONICAL_URL,
  },
  openGraph: {
    title: 'All 34 PDF Tools — Free & Private In-Browser Document Workspace | DocuNexa',
    description:
      'Explore all 34 client-side PDF tools in DocuNexa. Split textbooks with PDF Unit Cutter, merge, compress, convert, edit, and secure PDFs with 100% in-browser privacy.',
    url: CANONICAL_URL,
    siteName: 'DocuNexa',
    type: 'website',
    images: [
      {
        url: 'https://docunexa.pro.et/icon.svg',
        width: 512,
        height: 512,
        alt: 'DocuNexa PDF Tools Directory',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'All 34 PDF Tools — Free & Private In-Browser Document Workspace | DocuNexa',
    description:
      'Explore all 34 client-side PDF tools in DocuNexa. Split textbooks with PDF Unit Cutter, merge, compress, convert, edit, and secure PDFs with 100% in-browser privacy.',
    images: ['https://docunexa.pro.et/icon.svg'],
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://docunexa.pro.et',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tools',
        item: CANONICAL_URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
