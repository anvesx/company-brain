import { Hono } from "hono";
import type { Env } from "../http/guard/auth.js";

/** With `redirect` set, the OAuth callback sends the browser back to the page with `?connected=<id>` or `?oauth_error=<reason>` instead of answering json. */
export function oauthRedirect(oauth: Hono<Env>, redirect?: string): Hono<Env> {
  if (redirect === undefined) return oauth;
  const r = new Hono<Env>();
  r.use("/:provider/callback", async (c, next) => {
    await next();
    const body = (await c.res.clone().json()) as { id?: string; error?: string };
    const q = c.res.status === 201 && body.id ? { connected: body.id } : { oauth_error: body.error ?? "sign-in failed" };
    c.res = c.redirect(`${redirect}?${new URLSearchParams(q)}`, 302);
  });
  return r.route("/", oauth);
}
