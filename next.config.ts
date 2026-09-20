import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
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
};

export default nextConfig;
