import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverMinification: true,
  },
  // Fix for Netlify deployment
  distDir: '.next',
};

export default nextConfig;