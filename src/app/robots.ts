import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tools', '/tools/'],
      },
    ],
    sitemap: 'https://docunexa.pro.et/sitemap.xml',
  };
}
