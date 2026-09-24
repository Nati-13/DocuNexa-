import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ALL_TOOLS, TOOL_CATEGORIES, getToolBySlug } from '@/config/tools';
import { getToolSeoData } from '@/config/seoInventory';

export const dynamicParams = false;

export async function generateStaticParams() {
  return ALL_TOOLS
    .filter((t) => t.slug !== 'pdf-unit-cutter')
    .map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: 'Tool Not Found | DocuNexa',
      description: 'The requested PDF tool was not found in the DocuNexa registry.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const seo = getToolSeoData(slug);
  return {
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
          alt: `${tool.name} — DocuNexa`,
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
}

export default async function ToolSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const seo = getToolSeoData(slug);
  const categoryInfo = TOOL_CATEGORIES.find((c) => c.id === tool.category);

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
          name: categoryInfo?.name || 'Category',
          item: `https://docunexa.pro.et/tools#${tool.category}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: tool.name,
          item: seo.canonicalUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
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
