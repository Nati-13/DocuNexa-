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
  ];

  const toolPages: MetadataRoute.Sitemap = ALL_TOOLS.map((tool) => ({
    url: `${CANONICAL_BASE}/tools/${tool.slug}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: tool.slug === 'pdf-unit-cutter' ? 0.95 : 0.8,
  }));

  return [...corePages, ...toolPages];
}
