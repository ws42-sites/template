# WS42 site template

Starter for WS42 client websites. Click **Use this template** to create a client repo.

## Stack

- Astro 7, Tailwind CSS 4, TypeScript 6, Biome 2
- Decap CMS at `/admin` (pages stored as YAML in `src/content/pages`)
- Formspree contact form with honeypot, timing check, and cooldown
- Sentry (browser) and Plausible or Fathom analytics, both off until configured
- Privacy and terms page starters (not legal advice)
- Netlify hosting with deploy previews (`netlify.toml`, `public/_headers`, `public/_redirects`)
- `invoice/invoice.html`: printable one-page invoice for WS42 use; delete it from client repos

## Setup

1. Node 24 (`.nvmrc`), then `npm install`
2. `cp .env.example .env` and fill in what the client needs
3. Edit `src/site.config.ts` with the business name, contact email, and jurisdiction
4. Fill the `{{placeholders}}` in `src/pages/privacy.astro` and `src/pages/terms.astro`
5. In `public/admin/config.yml`, set `backend.repo` to `ws42-sites/<client-repo>`

## Local development

- `npm run dev` starts the site at http://localhost:4321
- `npm run cms` starts the local Decap backend; then open http://localhost:4321/admin/
- `npm run lint`, `npm run check`, `npm run build` must all pass before review

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_URL` | Production URL |
| `PUBLIC_ANALYTICS_PROVIDER` | `plausible`, `fathom`, or empty |
| `PUBLIC_ANALYTICS_DOMAIN` | Plausible domain |
| `PUBLIC_FATHOM_SITE_ID` | Fathom site ID |
| `PUBLIC_SENTRY_DSN` | Sentry DSN; Sentry is off when empty |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Source map upload |
| `PUBLIC_FORMSPREE_ID` | Formspree form ID |
| `PUBLIC_AI_CRAWLERS` | `allow` (default) or `block-training`; overrides `siteConfig.aiCrawlers` in robots.txt |
| `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | Cloudflare Web Analytics site token for the production host. Set by the ops factory on the Pages **production** env only (with `PUBLIC_ANALYTICS_PROVIDER=cloudflare`); never on previews |
| `CF_PAGES_BRANCH` | Set by Cloudflare Pages; any branch other than `main` builds a disallow-all robots.txt |

### Crawlers and AI discovery

- `robots.txt` allows `/`, disallows `/admin` and `/api`, and links the sitemap. `aiCrawlers: "block-training"` adds `Disallow: /` for GPTBot, ClaudeBot, PerplexityBot and Google-Extended (Googlebot stays allowed).
- `functions/_middleware.js` treats `*.pages.dev`, localhost and any host other than `PUBLIC_SITE_URL` as preview: every response gets `X-Robots-Tag: noindex` and `/robots.txt` disallows everything.
- `llms.txt` is a business card (type, area served, services, hours, phone, email, address, website) plus the page index; `llms-full.txt` adds a short summary per page. Fill `siteConfig.business`; blank or `{{placeholder}}` values are left out.
- A CMS page can set `updated: YYYY-MM-DD` to get `<lastmod>` in `sitemap.xml`.
- `npm test` runs the crawler tests (`node --test`).

## Going live on Netlify

1. Import the client repo in Netlify; build settings come from `netlify.toml`
2. Add the environment variables in the Netlify site settings
3. For Decap login, create a GitHub OAuth app with callback `https://api.netlify.com/auth/done` and add it under the site's OAuth provider settings
4. In Formspree, turn on Restrict to Domain and a CAPTCHA (reCAPTCHA or Turnstile)
5. A human reviews the deploy preview before merging to `main`

Decisions are tracked in GitHub Issues and progress on the org's GitHub Projects board.
