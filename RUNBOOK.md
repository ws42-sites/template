# Runbook

Every step is a command. Standard scripts (same names in every ws42 repo): `deploy`, `deploy:preview`, `rollback`, `smoke`, `secrets:check`.
Steps that do not apply are in `guardrails.config.json` → `runbook.na` with the reason. Checked by guardrails RUN-1..4.
A client site made from this template keeps these scripts and swaps `ws42-template` for its own Pages project and URL.

## Deploy

n/a: Cloudflare Pages Git integration (project `ws42-template`, production branch `main`) builds `npm run build` and deploys every push to `main`. Every other branch and PR gets a preview deployment. Merging the PR is the deploy; then run `npm run smoke`.

## Rollback

Lists recent production deployments, then makes a previous one live through the Pages API (Pages has no wrangler rollback). Needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment.

```sh
npm run rollback                       # list (read-only)
npm run rollback -- --to <id> --yes    # make <id> live
npm run smoke
```

The next push to `main` deploys again, so fix forward or revert the bad commit before merging anything else.

## Smoke

Read-only GETs of the home page, privacy page, robots.txt, sitemap and the Decap admin on https://ws42-template.pages.dev. For a preview: `SMOKE_URL=<preview url> npm run smoke`.

```sh
npm run smoke
```

## Secrets rotation

Decap sign-in needs `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (GitHub OAuth app) on the Pages project; Sentry and analytics values are build variables (see `.env.example`). Rotate the secret in the GitHub OAuth app, set it, then check:

```sh
npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name ws42-template
npm run secrets:check
```

## Incident first steps

1. Confirm what is broken: `npm run smoke`
2. If the last deploy caused it: `npm run rollback`, then `npm run rollback -- --to <previous id> --yes`, then `npm run smoke`
3. If Decap sign-in fails: `npm run secrets:check`
