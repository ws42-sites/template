// npm run rollback -- [--to <deployment-id> --yes]
// Cloudflare Pages has no wrangler rollback command, so this calls the Pages API.
// Without --to it only lists recent production deployments (read-only).
// Needs CLOUDFLARE_API_TOKEN (Pages:Edit) and CLOUDFLARE_ACCOUNT_ID in the environment; never printed.
const project =
  process.env.PAGES_PROJECT || process.argv.find((a, i, all) => all[i - 1] === "--project");
const to = process.argv.find((a, i, all) => all[i - 1] === "--to");
const yes = process.argv.includes("--yes");
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
if (!project || !token || !account) {
  console.error(
    "rollback: needs --project <name> (or PAGES_PROJECT), CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID",
  );
  process.exit(2);
}
const api = (path, init = {}) =>
  fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}${path}`,
    {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    },
  ).then(async (r) => {
    const body = await r.json();
    if (!body.success) throw new Error(`${r.status} ${JSON.stringify(body.errors)}`);
    return body.result;
  });

if (!to) {
  const deps = await api("/deployments?env=production&per_page=10");
  for (const d of deps)
    console.log(
      `${d.id}  ${d.created_on}  ${d.deployment_trigger?.metadata?.commit_hash?.slice(0, 7) ?? "-"}  ${d.latest_stage?.status}  ${d.url}`,
    );
  console.log("\nRoll back with: npm run rollback -- --to <id> --yes   (then npm run smoke)");
} else if (!yes) {
  console.error(
    `rollback: re-run with --yes to make ${to} the live production deployment of ${project}`,
  );
  process.exit(2);
} else {
  const d = await api(`/deployments/${to}/rollback`, { method: "POST" });
  console.log(`rolled back ${project} to ${d.id} (${d.url}). Now run: npm run smoke`);
}
