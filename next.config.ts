import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The old first-time setup page was replaced by ADMIN_EMAIL / ADMIN_PASSWORD.
  async redirects() {
    return [{ source: "/setup", destination: "/login", permanent: false }];
  },
  // lib/db.ts reads the schema at runtime; make sure it ships with every server function.
  outputFileTracingIncludes: {
    "/**": ["./lib/schema.sql"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
