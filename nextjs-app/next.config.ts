import type { NextConfig } from "next";

const isGHPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGHPages ? "export" : undefined,
  basePath: isGHPages ? "/ma-baker-recruitment" : "",
  assetPrefix: isGHPages ? "/ma-baker-recruitment/" : "",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'xdtxfpvxoxqaadgyvzap.supabase.co' },
    ],
  },
};

export default nextConfig;
