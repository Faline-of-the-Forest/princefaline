// Serves the built static site, plus a tiny GitHub OAuth relay for the /admin CMS.
// The relay never stores your GitHub token; it just brokers the one-time exchange
// so the browser-based admin dashboard can commit changes on your behalf.

function html(body) {
  return new Response(body, { headers: { "content-type": "text/html;charset=utf-8" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/oauth/auth") {
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", url.origin + "/oauth/callback");
      authorizeUrl.searchParams.set("scope", "repo");
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === "/oauth/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) return new Response("OAuth error: " + tokenJson.error_description, { status: 400 });

      const token = tokenJson.access_token;
      return html(`<!DOCTYPE html><html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:success:' + JSON.stringify({ token: ${JSON.stringify(token)}, provider: 'github' }),
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`);
    }

    // Everything else: serve the static site build.
    return env.ASSETS.fetch(request);
  },
};
