function page(status, content) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><html><body><script>
(function () {
  function receive(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener("message", receive, false);
  }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers.get("Cookie") || "";
  const expected = cookie.match(/(?:^|;\s*)decap_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || state !== expected) {
    return page("error", { message: "Invalid OAuth state" });
  }
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const data = await response.json();
  if (!data.access_token) {
    return page("error", { message: data.error_description || "No access token" });
  }
  return page("success", { token: data.access_token, provider: "github" });
}
