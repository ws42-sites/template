interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_ANALYTICS_PROVIDER?: string;
  readonly PUBLIC_ANALYTICS_DOMAIN?: string;
  readonly PUBLIC_FATHOM_SITE_ID?: string;
  readonly PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?: string;
  readonly PUBLIC_OG_IMAGE?: string;
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_FORMSPREE_ID?: string;
  readonly CF_PAGES?: string;
  readonly CF_PAGES_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
