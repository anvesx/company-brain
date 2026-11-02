import { Hono } from "hono";
import type { Env } from "../http/guard/auth.js";

/**
 * Two additions for a browser around the bearer-only OAuth routes:
 * `GET /:provider/start-url` answers `{url}` where `start` would redirect, because a page cannot send the bearer on a navigation, and passes on the `oauth_bind` cookie `start` set;
 * with `redirect` set, `callback` sends the browser back to the page instead of answering json.
 */
export function oauthUi(oauth: Hono<Env>, redirect?: string): Hono<Env> {
  const r = new Hono<Env>();
  r.get("/:provider/start-url", async (c) => {
    const auth = c.req.header("authorization");
    const search = new URL(c.req.url).search;
    const res = await oauth.request(`/${c.req.param("provider")}/start${search}`, { headers: auth ? { authorization: auth } : {} });
    const url = res.headers.get("location");
    if (res.status !== 302 || !url) return new Response(res.body, res);
    for (const cookie of res.headers.getSetCookie()) c.header("set-cookie", cookie, { append: true });
    return c.json({ url });
  });
  if (redirect !== undefined) {
    r.use("/:provider/callback", async (c, next) => {
      await next();
      const body = (await c.res.clone().json()) as { id?: string; error?: string };
      const q = c.res.status === 201 && body.id ? { connected: body.id } : { oauth_error: body.error ?? "sign-in failed" };
      c.res = c.redirect(`${redirect}?${new URLSearchParams(q)}`, 302);
    });
  }
  return r.route("/", oauth);
}
