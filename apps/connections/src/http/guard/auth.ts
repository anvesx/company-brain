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

export const requireCaller =
  (secret: string, now: () => number): MiddlewareHandler<Env> =>
  async (c, next) => {
    const caller = verify(c.req.header("authorization"), secret, now());
    if (!caller) return c.json({ error: "unauthenticated" }, 401);
    c.set("caller", caller);
    await next();
  };
