interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_ANALYTICS_PROVIDER?: string;
  readonly PUBLIC_ANALYTICS_DOMAIN?: string;
  readonly PUBLIC_FATHOM_SITE_ID?: string;
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_FORMSPREE_ID?: string;
  readonly PUBLIC_AI_CRAWLERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
