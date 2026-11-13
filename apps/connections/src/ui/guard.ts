import { createHash } from "node:crypto";
import { styles } from "@anvesx/design-system";
import type { MiddlewareHandler } from "hono";
import type { Caller } from "../accounts/types.js";
import { cookieAllowed, type Session } from "../http/guard/auth.js";

const STYLE_HASH = `'sha256-${createHash("sha256").update(styles).digest("base64")}'`;
const FONTS = "https://fonts.googleapis.com";

/** The page policy: own origin only, the design-system style block by hash, its web fonts, and forms that may hop to one provider. */
export const policy = (providerOrigin = ""): string =>
  [
    "default-src 'self'",
    `style-src 'self' ${STYLE_HASH} ${FONTS}`,
    "font-src https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    `form-action 'self' ${providerOrigin}`.trim(),
  ].join("; ");

export type PageEnv = { Variables: { caller: Caller } };

/** Pages are for a signed-in browser: others go to /sign-in, cross-site posts are refused, nothing is cached. */
export const pageGuard =
  (session: Session): MiddlewareHandler<PageEnv> =>
  async (c, next) => {
    const caller = await session.caller(c.req.raw.headers);
    if (!caller) return c.redirect("/sign-in", 302);
    if (!cookieAllowed(c.req.raw, session.origin)) return c.text("cross-site request refused", 403);
    c.set("caller", caller);
    c.header("cache-control", "no-store");
    c.header("content-security-policy", policy());
    await next();
  };
