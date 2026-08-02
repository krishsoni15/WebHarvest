import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    '/api/mirror': ['./bin/wget'],
  },
};

export default nextConfig;
