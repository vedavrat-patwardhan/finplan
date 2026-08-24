import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Keep PDF.js as a native server dependency. Its main module loads the fake
  // worker beside itself when extracting text in Node.
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/documents": [
      "./node_modules/pdfjs-dist/package.json",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
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
