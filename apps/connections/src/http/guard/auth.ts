import { createHmac, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { Caller } from "../../accounts/types.js";

const BEARER = /^Bearer ([^:\s]+):([^:\s]+):(\d{1,12}):([0-9a-f]{64})$/;
export type Env = { Variables: { caller: Caller } };

/** The brain app's token shape, `user:tenant:exp:hmac`. Undefined for anything invalid or expired. */
export function verify(header: string | undefined, secret: string, nowSeconds: number): Caller | undefined {
  const m = BEARER.exec(header ?? "");
  if (!m) return undefined;
  const [, user, tenant, exp, sig] = m as unknown as [string, string, string, string, string];
  const want = createHmac("sha256", secret).update(`${user}:${tenant}:${exp}`).digest();
  const got = Buffer.from(sig, "hex");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return undefined;
  return Number(exp) > nowSeconds ? { user, tenant } : undefined;
}

/** The session cookie path: who the cookie is, and the one origin that may use it. */
export type Session = { caller: (headers: Headers) => Promise<Caller | undefined>; origin: string };

/** Whether a browser request may carry the cookie: never cross-site; state changes also only from the app's own origin. */
export function cookieAllowed(req: Request, origin: string): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  if (req.method === "GET" || req.method === "HEAD") return true;
  const from = req.headers.get("origin");
  return (site === null || site === "same-origin") && (from === null || from === origin);
}

/** The bearer first (service callers, unchanged), then the session cookie (people in a browser) when `session` is given. */
export const requireCaller =
  (secret: string, now: () => number, session?: Session): MiddlewareHandler<Env> =>
  async (c, next) => {
    let caller = verify(c.req.header("authorization"), secret, now());
    if (!caller && session) {
      caller = await session.caller(c.req.raw.headers);
      if (caller && !cookieAllowed(c.req.raw, session.origin)) return c.json({ error: "cross-site request refused" }, 403);
    }
    if (!caller) return c.json({ error: "unauthenticated" }, 401);
    c.set("caller", caller);
    await next();
  };
