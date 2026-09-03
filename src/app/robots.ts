import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/playground"],
      disallow: [
        "/api/",
        "/dashboard",
        "/transactions",
        "/accounts",
        "/documents",
        "/income",
        "/expenses",
        "/investments",
        "/insurance",
        "/goals",
        "/calculators",
        "/cashflow",
        "/automations",
        "/settings",
        "/assistant",
        "/onboarding",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
