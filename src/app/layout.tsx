import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/next/react";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const libreFranklin = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const APP_NAME = "FinPlan";
const APP_DEFAULT_TITLE = "FinPlan — Personal Finance Planner";
const APP_TITLE_TEMPLATE = "%s — FinPlan";
const APP_DESCRIPTION =
  "Plan your life goals with clarity. Track income, expenses, SIPs, insurance, and milestones in INR.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a4d45" },
    { media: "(prefers-color-scheme: dark)", color: "#0f2e2a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === "development"}>
          {children}
          <Toaster richColors position="top-right" />
        </SerwistProvider>
      </body>
    </html>
  );
}
