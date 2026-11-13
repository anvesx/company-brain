import { Hono } from "hono";
import type { Env } from "../http/guard/auth.js";

/** The fixed page code for what the callback answered; the provider's own words never reach the page. */
const codeOf = (status: number, error = ""): string => {
  if (error.startsWith("provider refused")) return "denied";
  if (error === "token exchange failed") return "exchange";
  if (status === 403) return "zones";
  if (status === 500) return "store";
  return status === 400 ? "state" : "failed";
};

/** With `redirect` set, the OAuth callback sends the browser back to the page with `?connected=<id>` or `?oauth_error=<code>` instead of answering json. */
export function oauthRedirect(oauth: Hono<Env>, redirect?: string): Hono<Env> {
  if (redirect === undefined) return oauth;
  const r = new Hono<Env>();
  r.use("/:provider/callback", async (c, next) => {
    await next();
    const body = (await c.res.clone().json()) as { id?: string; error?: string };
    const q = c.res.ok && body.id ? { connected: body.id } : { oauth_error: codeOf(c.res.status, body.error) };
    c.res = c.redirect(`${redirect}?${new URLSearchParams(q)}`, 302);
  });
  return r.route("/", oauth);
}
