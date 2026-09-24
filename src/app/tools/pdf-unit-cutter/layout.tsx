import type { Metadata } from 'next';
import { getToolSeoData } from '@/config/seoInventory';

const seo = getToolSeoData('pdf-unit-cutter');

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: seo.canonicalUrl,
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: seo.canonicalUrl,
    type: 'website',
    siteName: 'DocuNexa',
    images: [
      {
        url: 'https://docunexa.pro.et/icon.svg',
        width: 512,
        height: 512,
        alt: 'PDF Unit Cutter — DocuNexa Flagship Tool',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: seo.title,
    description: seo.description,
    images: ['https://docunexa.pro.et/icon.svg'],
  },
};

export default function PdfUnitCutterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = [
    {
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
          item: 'https://docunexa.pro.et/tools',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Organize PDF',
          item: 'https://docunexa.pro.et/tools#organize',
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'PDF Unit Cutter',
          item: seo.canonicalUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'PDF Unit Cutter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (Modern Web Browser)',
      url: seo.canonicalUrl,
      description: seo.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
