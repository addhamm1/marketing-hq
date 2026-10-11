import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Every route is per-user (session cookie), so Cache Components stays off.
const nextConfig: NextConfig = {
  // Dev logs would otherwise print server action arguments (passwords included).
  logging: { serverFunctions: false },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Source maps upload only when a token is configured (Vercel).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
