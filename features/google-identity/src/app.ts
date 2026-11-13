import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import type { buildAuth } from "./auth.js";
import type { IdentityConfig } from "./config.js";

/** The sign-in page: one button, no input of any kind. */
const signInPage = (): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sign in</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<main><h1>Company Brain</h1>
<form method="post" action="/sign-in/google"><button type="submit">Continue with Google</button></form>
</main></body></html>`;

/** The only better-auth routes that are reachable. Anything else is a 404. */
export const OPEN_ROUTES = new Set(["POST /api/auth/sign-in/social", "GET /api/auth/callback/google", "GET /api/auth/get-session", "POST /api/auth/sign-out"]);

/** The web app: the Continue with Google page, the Google redirect, and the allow-listed better-auth routes. */
export const buildApp = (auth: ReturnType<typeof buildAuth>, { baseUrl, issuer }: Pick<IdentityConfig, "baseUrl" | "issuer">): Hono => {
  const app = new Hono();
  app.use(
    secureHeaders({
      strictTransportSecurity: "max-age=63072000; includeSubDomains",
      referrerPolicy: "no-referrer",
      // form-action must name the issuer: the button posts here and is redirected to Google.
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        styleSrc: ["'self'"],
        formAction: ["'self'", new URL(issuer).origin],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
      },
    }),
  );
  app.get("/sign-in", (c) => c.html(signInPage()));
  app.post("/sign-in/google", csrf({ origin: new URL(baseUrl).origin }), async (c) => {
    const start = new Request(`${baseUrl}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(baseUrl).origin, "x-forwarded-for": c.req.header("x-forwarded-for") ?? "" },
      body: JSON.stringify({ provider: "google", callbackURL: `${baseUrl}/`, errorCallbackURL: `${baseUrl}/sign-in` }),
    });
    const res = await auth.handler(start);
    const { url } = (await res.json().catch(() => ({}))) as { url?: string };
    if (!res.ok || !url)
      return new Response(res.status === 429 ? "Too many sign-in attempts." : "Sign-in is unavailable.", { status: res.status === 429 ? 429 : 502 });
    const headers = new Headers({ location: url });
    for (const cookie of res.headers.getSetCookie()) headers.append("set-cookie", cookie);
    return new Response(null, { status: 302, headers });
  });
  app.all("/api/auth/*", (c) => {
    const path = new URL(c.req.url).pathname;
    return OPEN_ROUTES.has(`${c.req.method} ${path}`) ? auth.handler(c.req.raw) : c.notFound();
  });
  return app;
};
