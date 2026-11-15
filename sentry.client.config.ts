import * as Sentry from "@sentry/astro";

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  integrations: dsn ? [Sentry.browserTracingIntegration()] : [],
  tracesSampleRate: 0.2,
});
