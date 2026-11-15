import sentry from "@sentry/astro/integration";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const sentryDsn = env.PUBLIC_SENTRY_DSN ?? "";
const sentryAuthToken = env.SENTRY_AUTH_TOKEN ?? "";
const sentryEnabled = sentryDsn.length > 0;

export default defineConfig({
  site: env.PUBLIC_SITE_URL || "https://example.com",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sentry({
      enabled: sentryEnabled ? { client: true, server: false } : false,
      org: env.SENTRY_ORG || undefined,
      project: env.SENTRY_PROJECT || undefined,
      authToken: sentryAuthToken || undefined,
      sourcemaps: {
        disable: !sentryAuthToken,
      },
      telemetry: false,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
