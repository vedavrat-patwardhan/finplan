import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // pdfjs-dist uses Node-specific features for server-side PDF text extraction.
  serverExternalPackages: ["pdfjs-dist"],
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
