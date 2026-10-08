import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config: any, { webpack }: any) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.resolve.alias["pdf-lib"] = path.resolve(__dirname, "node_modules/pdf-lib/dist/pdf-lib.esm.js");
    config.resolve.alias["pptxgenjs"] = path.resolve(__dirname, "node_modules/pptxgenjs/dist/pptxgen.es.js");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      https: false,
      http: false,
      path: false,
      stream: false,
      crypto: false,
      os: false,
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.ts",
      "pdf-lib": "./node_modules/pdf-lib/dist/pdf-lib.esm.js",
      pptxgenjs: "./node_modules/pptxgenjs/dist/pptxgen.es.js",
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://quge5.com https://*.quge5.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://sztdcptdaxsqbazfbvhh.supabase.co wss://sztdcptdaxsqbazfbvhh.supabase.co https://quge5.com https://*.quge5.com https://cdn.jsdelivr.net",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/admin/setup',
        destination: '/admin-setup',
      },
    ];
  },
};

export default nextConfig;
