import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tools', '/tools/'],
        disallow: ['/account', '/choose-plan', '/login', '/signup', '/api/', '/admin', '/admin/'],
      },
    ],
    sitemap: 'https://docunexa.pro.et/sitemap.xml',
  };
}
