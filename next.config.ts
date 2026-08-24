import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: {
      // Bank statement PDFs are sent to a Server Action for parsing.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
