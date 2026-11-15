# WS42 Client Site Launch Pipeline

Run these stages in order. Each stage ends with a handoff artifact that the next stage reads. Legend: AUTO = an LLM agent can do it end to end; ASSIST = the agent drafts it and Josh approves; MANUAL = Josh does it (logins, payments, verification, legal).

Every new site gets a working folder `clients/<slug>/` in the private WS42 ops repo (`ws42-sites/ops`) with `brief.json`, `content.json`, `assets/`, `socials.json`, and `onboarding.json`. These are the contract between stages, so any agent can pick up mid-pipeline.

**Note**: Client folders, reference images, and onboarding data live in the private `ws42-sites/ops` repository (to be created). No client data or reference images are stored in the public template repository.

## 0. Intake (MANUAL)

- Josh confirms the client, scope, budget, and the person who signs off on the work. The domain is not decided here; it's chosen at Launch (stage 6).
- Artifact: the client slug, plus an intake ticket on the WS42 New Site Checklist board.
- An agent needs: nothing yet. Josh starts the run.

## 0b. Onboarding Import (AUTO)

**New step**: Import the client's onboarding export into their folder in the private ops repo.

- Parse the onboarding export (HTML file with embedded `<script type="application/json" id="ws42-onboarding">` containing schema `ws42.onboarding`, `version: 1`)
- Validate the v1 schema and extract all fields
- Write `clients/<slug>/onboarding.json` in the private ops repo
- Extract and save reference images to `clients/<slug>/assets/references/` in the ops repo
- Merge empty keys into `brief.json` (contact name, current website, hosting, domain hints, social networks, etc.)
- Artifact: `onboarding.json`, reference images in the ops repo, and updated `brief.json`
- An agent needs: the HTML export file from the onboarding page, access to the private ops repo

## 1. Search: Find the Business (AUTO, Josh verifies)

- The agent finds the legal name, trade name, address, phone, hours, service area, categories, existing website, existing social profiles, Google Business Profile, reviews and competitors.
- Artifact: `brief.json` with a source URL for every fact and a confidence for each field.
- An agent needs: web search and fetch, the business name and town, and a rule that every fact must cite a source, with no guessing.

## 2. Content: Draft the Copy (ASSIST)

- The agent replaces every template placeholder (~~site.config.ts~~ **site.yml**, the home and about pages, privacy and terms {{placeholders}}, the meta description, llms.txt summary text) with copy written from `brief.json`.
- **Updated**: Write identity copy (business name, legal name, tagline) directly into `src/content/settings/site.yml` instead of site.config.ts.
- Josh and the client approve the copy. Privacy and terms get a human read-through (legal).
- Artifact: `content.json` mapping each placeholder key to its approved text, plus updated `site.yml`.
- An agent needs: `brief.json`, the template's placeholder list (from SITE-CHECKLIST.txt), the WS42 tone guide, and the no-comments policy.

## 3. Find: Assets (ASSIST)

- The agent collects the logo (vector if possible), brand colours, favicon, a 1200x630 OG image, and photos, either from the client or free-licensed with the license recorded. It vectorizes or upscales where needed.
- Josh confirms the client has rights to everything they supply.
- Artifact: `assets/` plus `assets/licenses.json`.
- An agent needs: image tools (vtracer, Pillow, resvg), a place to receive client uploads, and the license rule: client-owned, Unsplash or Pexels, or original SVG only, and never hotlinked.

## 4. Package: Build from the Template (AUTO, with one MANUAL gate)

- **AUTO**:
  - Create the repo `ws42-sites/<slug>` from `ws42-sites/template`
  - Apply `content.json` and `assets/`
  - **Seed CMS (first step)**: Run `npm run seed -- clients/<slug>/onboarding.json` to fill `site.yml` with business name, phone, contactEmail (the desired email from onboarding), and colours (primary→brand, secondary→accent, tertiary→background). The seed script is idempotent and only fills empty or placeholder values. It writes a seed log to the ops folder and never sets `siteUrl`.
  - Set the Decap repo and base_url (siteUrl stays a placeholder until Launch)
  - Create the Cloudflare Pages project
  - Set the env vars that need no secret (PUBLIC_FORMSPREE_ID, PUBLIC_SENTRY_DSN on Production and Preview, the analytics vars)
  - Open a PR
  - Walk SITE-CHECKLIST.txt and copy the board's starter tickets into a per-client board
- **MANUAL**: Create the Formspree form, the Sentry project and the GitHub OAuth app (or reuse shared ones), and enter GITHUB_CLIENT_SECRET in Cloudflare. Agents must not handle secret values.
- **AUTO verify**: CI green (check:arch, lint, check, build). On the preview: llms.txt, robots.txt and the sitemap return 200; a missing path returns 404; the JSON-LD validates; the OG tags are present; Lighthouse is acceptable.
- Artifact: the repo, the PR, the preview URL, and the checklist with every box ticked or marked N/A.
- An agent needs: gh as ws42-admin (repo, workflow, project scopes), Cloudflare API access (Pages), a Cursor cloud agent with Cursor's GitHub app able to open PRs on ws42-sites, SITE-CHECKLIST.txt, and access to the ops repo for the onboarding.json file.

## 4b. Email: Basic Client Mailbox (ASSIST, with MANUAL gates)

- **Goal**: Every client can at least receive contact messages at their own domain, like hello@clientdomain.
- **Important**: The contactEmail from onboarding has already been set in `site.yml` by the seed script. This stage creates the mailbox for that email address.
- Choose a provider per client, and record the cost on the quote. Prices are approximate, so check current pricing before quoting:
  - **Cloudflare Email Routing**: free, forward-only. hello@domain forwards to the client's existing inbox. It can't send as the domain. This is the default for budget clients.
  - **Zoho Mail**: the free tier (small teams, web only), or Mail Lite at roughly US$1 per user per month. A real mailbox with sending.
  - **Google Workspace Business Starter**: roughly US$7 per user per month. Full Gmail, Calendar and Drive.
  - **Pass-through or markup**: decide whether WS42 bills email monthly or the client pays the provider directly. The client should own the account either way.
- **AUTO**, once the domain is on Cloudflare: add MX, SPF (TXT), DKIM and DMARC records through the Cloudflare DNS API for the chosen provider. Email Routing needs only a toggle plus a verified destination address.
- **MANUAL**: create the provider account and mailbox, verify domain ownership, set the mailbox password and 2FA, and verify the Email Routing destination address (the client clicks the confirmation email).
- **AUTO wiring**: contactEmail is already in site.yml; point the Formspree form's notification email at that address, and send one test message after Josh says okay.
- **Launch gate**: If the client changes the desired email address, update `site.yml`. **Launch cannot proceed until the mailbox receives the test message**, because the address is public from the first preview.
- **Verify**: MX, SPF, DKIM and DMARC all resolve (dig), a mail-tester score of at least 9 if the mailbox sends, the contact form arrives in the inbox, and the mailto opens the right address.
- Artifact: email.json with the provider, mailbox addresses, monthly cost, the billing owner and the DNS records added.
- An agent needs: Cloudflare DNS edit access for the zone, the provider's DNS record values (from its setup screen), the client's forwarding address, and Josh's provider choice.

## 5. Socials: Set Up and Link (MANUAL accounts, AUTO wiring)

- **MANUAL**: Josh or the client creates or claims Instagram, a Facebook Page, X, LinkedIn Company, Google Business Profile, and any extras (TikTok, YouTube, Yelp, Nextdoor). These need phone and email verification, 2FA and Meta Business ownership, so agents shouldn't sign up on the client's behalf. Record which account owns each one.
- **ASSIST**: the agent drafts each profile's bio, categories, links and hours from `brief.json` and `content.json`, and preps the profile and banner images from `assets/`.
- **AUTO**: write `socials.json` (platform to URL), then wire it into the site: JSON-LD `sameAs`, footer social links, `twitter:site`, and og:see_also where it applies. Check that the Google Business Profile name, address and phone exactly match the site's JSON-LD.
- Artifact: `socials.json`, plus a PR that adds the links.
- An agent needs: the final profile URLs from Josh, `socials.json`, and the template's sameAs and footer hook (not built yet; add it to the template once).
- **Buffer**: ONE FREE BUFFER ACCOUNT PER CLIENT, never a shared WS42 account. A Buffer API key reaches every channel in its account with no per-client scoping, so separate accounts are the only real isolation.
  - **ASSIST, account**: create the client's own Buffer account on the Free plan, ideally under the client's email (or a WS42 per-client alias such as clients+<slug>@). Turn on 2FA. Record the login in the WS42 password manager, never in the repo.
  - **ASSIST, channels (needs a person)**: the agent guides each OAuth connect in Buffer, but the client or Josh signs in to Facebook page, Instagram business, Google Business Profile and LinkedIn page and approves access. The agent can't hold or type social passwords.
  - **AUTO, API key**: create one API key in that account (Settings, then API). Store it as the client's own secret, for example `BUFFER_API_KEY_<SLUG>` in the client's secret store, never in a repo or chat. The agent only ever uses that client's key.
  - **AUTO, launch drafts**: the agent reads `content.json` and the live pages, writes 3 to 5 launch and intro posts per channel, and saves them as drafts (`createPost` with `saveToDraft: true` through https://api.buffer.com, or the Buffer MCP server at https://mcp.buffer.com/mcp). Instagram and TikTok need an image or a video, taken from `assets/`. Nothing publishes until the client or Josh approves it in Buffer.
  - **Free tier limits** (https://buffer.com/pricing, last updated November 2025): 3 channels, 10 queued posts per channel (slots refill once posts publish), 1 user, 1 API key, and 1,000 API requests per channel each month. That covers a typical Facebook, Instagram and Google Business Profile launch.
  - **Upgrade path**, per client and only when needed: Essentials at $5 per channel per month paid yearly ($6 monthly) for unlimited queued posts and more channels. Team at $10 per channel per month is only for clients who need multiple users or approval workflows. Pass the cost through to the client.
- Artifact: `socials.json` with `buffer_account` (the login email, no password) and a `buffer_channel_id` per platform, plus the drafted launch posts waiting in the client's Buffer.

## 6. Launch (MANUAL go, AUTO checks)

- **MANUAL**: client sign-off, merge to main, invoice (Stripe payment link).
- **Domain setup** (runs once per launch, for THIS client's domain, not a one-time global task): Josh confirms which domain this client launches on. It is often unknown until now and varies per client (one client may be buying a new domain, another taking over an existing one). Record it as `domain` in `clients/<slug>/brief.json`. Then, using that value: **set `siteUrl` in site.yml** (not site.config.ts) to `https://<client domain>` so canonicals, sitemap and OG URLs stop saying example.com, add `<client domain>` (and www) as a custom domain on the client's Pages project, and point its DNS to Cloudflare Pages (automation B below, run against `<client domain>`). Nothing here uses a shared WS42 domain.
- **AUTO**: SSL active, www and apex redirect, analytics firing, Sentry receiving events, Formspree test submission (with Josh's okay), sitemap submitted to Google Search Console and Bing (the ownership verification is MANUAL).
- Artifact: the live URL and a closed checklist board.

## 7. After Launch (AUTO, scheduled)

- A weekly routine checks uptime, broken links, the Lighthouse score, form delivery and Sentry errors, and alerts Josh only when something changes.

## Automations that Remove Pause Points

### A. Config and Secrets Written Straight into Cloudflare Pages

(removes most of the "secrets" pause)

- **Who runs it**: the Cursor coding agent in stage 4, or Mr Bot, through the Cloudflare API: PATCH /accounts/{account}/pages/projects/{project} with deployment_configs.production.env_vars and deployment_configs.preview.env_vars set together, so Preview never gets missed.
- **Non-secret values (plain_text)**: the agent generates or fetches them and writes them directly. These are PUBLIC_FORMSPREE_ID (from the Formspree API if a key is held, otherwise from Josh once), PUBLIC_SENTRY_DSN (create the Sentry project through the Sentry API or connector and read its DSN), PUBLIC_ANALYTICS_PROVIDER, PUBLIC_ANALYTICS_DOMAIN and PUBLIC_FATHOM_SITE_ID, NODE_VERSION, and siteUrl. Cloudflare Web Analytics is enabled through the API (rum site_info) instead.
- **True secrets (secret_text)**, such as GITHUB_CLIENT_SECRET: the value must flow from the source API into Cloudflare inside one script, without ever being printed, logged, committed or shown in chat. GitHub has no API for creating OAuth apps, so the better fix is one shared WS42 Decap OAuth app or GitHub App for all client sites, created once by Josh. Its secret is stored once as a bot secret and copied server-side into each new Pages project.
- **Credentials the automation holds**, created once by Josh and stored as bot or cloud-agent secrets (never in the repo): a Cloudflare API token scoped to Pages Edit, DNS Edit, Email Routing Edit and Zone Read on the WS42 account only; a Sentry token scoped to project:write in the WS42 org; and optionally a Formspree API key.
- **Verify**: read the variables back and compare names and types (never values), redeploy, then check the built JS and the page for the expected public IDs.
- **Still manual**: the one-time token creation, and any secret whose source has no API.

### B. DNS Automation, Per Launch

(skips the DNS pause when the client's zone is already on the WS42 Cloudflare account)

- Runs once for each client launch. `{domain}` is the client's domain from `clients/<slug>/brief.json`, never a global value.
- **Check**: GET /zones?name={domain} on the WS42 account. If it's found and active, run the automation. If not, or it's pending nameserver change, the DNS card still appears, asking the client to point their nameservers at Cloudflare or add the zone. That step is manual.
- **Site records**: add the custom domain to the Pages project (POST /accounts/{account}/pages/projects/{project}/domains). Cloudflare then creates the proxied CNAME for the apex (with CNAME flattening) and for www. Add a redirect rule from www to the apex, or the reverse, per the client's choice. Don't hand-write A or AAAA records for Pages.
- **Email records**, from stage 4b's provider choice: for Cloudflare Email Routing, enable it on the zone (which adds its MX and SPF automatically) and create the hello@ rule to the verified destination. For Zoho or Google, add their MX set, the SPF include, the DKIM TXT (its value comes from the provider admin after the mailbox exists) and a DMARC TXT starting at p=none with a rua address, tightened to quarantine after two clean weeks.
- **Safety**: never delete or overwrite an existing record. Diff first, and if a record with the same name and type already exists with a different value, stop and show Josh. Log every record created into email.json and dns.json for rollback.
- **Verify**: the domain status in Pages is active, SSL is issued, dig shows the MX, SPF, DKIM and DMARC records, and curl -I on the apex and www gives the expected redirect.
- **Still manual**: nameserver changes at the registrar, the provider's domain-ownership TXT if it can't be fetched through the API, and DKIM if the provider only shows it in its admin console.

## Template Implementation Status

The following features have been implemented in the template:

- ✅ **Settings collection + site.yml as source of truth**: Site details (name, email, phone, colors, etc.) are stored in `src/content/settings/site.yml` and editable in Decap CMS. The `site.config.ts` file reads from site.yml via `getSiteConfig()`.
- ✅ **Seed script**: `scripts/seed-from-onboarding.mjs` fills empty or placeholder values in site.yml from onboarding exports. It is idempotent, supports `--dry-run`, validates input, and writes seed logs.
- ⚠️ A `sameAs`/socials field in site.config.ts, and footer social icons (planned)
- ⚠️ A PNG OG image slot (the SVG doesn't preview on most platforms) (planned)
- ⚠️ Cursor's GitHub app needs PR write access on ws42-sites (PR creation currently fails) (external)
- ⚠️ A scoped Cloudflare API token and a Sentry token stored as bot secrets, plus one shared WS42 Decap OAuth app (automations A and B) (external)
- ⚠️ An email provider choice and price on every quote (stage 4b) (external)
- ⚠️ A repeatable script for "repo + Pages project + env vars" so stage 4 is one command (planned)
