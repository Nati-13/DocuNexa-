import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.resolve.alias["pdf-lib"] = path.resolve(__dirname, "node_modules/pdf-lib/dist/pdf-lib.esm.js");
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.ts",
      "pdf-lib": "./node_modules/pdf-lib/dist/pdf-lib.esm.js",
    },
  },
};

export default nextConfig;
