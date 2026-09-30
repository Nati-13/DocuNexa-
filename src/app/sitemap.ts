import { MetadataRoute } from 'next';
import { ALL_TOOLS } from '@/config/tools';

const CANONICAL_BASE = 'https://docunexa.pro.et';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const corePages: MetadataRoute.Sitemap = [
    {
      url: CANONICAL_BASE,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${CANONICAL_BASE}/tools`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${CANONICAL_BASE}/how-it-works`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${CANONICAL_BASE}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${CANONICAL_BASE}/security`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${CANONICAL_BASE}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${CANONICAL_BASE}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${CANONICAL_BASE}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  const toolPages: MetadataRoute.Sitemap = ALL_TOOLS.map((tool) => ({
    url: `${CANONICAL_BASE}/tools/${tool.slug}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: tool.slug === 'pdf-unit-cutter' ? 0.95 : 0.8,
  }));

  return [...corePages, ...toolPages];
}
