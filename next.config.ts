import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['playwright'],
  outputFileTracingIncludes: {
    '/api/mirror': ['./bin/wget'],
  },
};

export default nextConfig;
