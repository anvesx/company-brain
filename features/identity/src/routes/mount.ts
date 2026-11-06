import { Hono } from "hono";
import type { Auth } from "../auth/options.js";
import type { ResolvedConfig } from "../config.js";
import type { Limits } from "../guard/limits.js";
import { checkOrigin } from "../guard/origin.js";
import { buildPages } from "../pages/serve.js";
import { mapRejection, toConsentPage, toRedirect } from "./errors.js";
import { checkRedirect, labelNativeClient } from "./register.js";
import { addressOf, bodyOf, checkSetActive, checkSignUp, tooMany } from "./validate.js";

const SIGN_IN = "/api/auth/sign-in/email";
const SIGN_UP = "/api/auth/sign-up/email";
const REGISTER = "/api/auth/oauth2/register";
const SET_ACTIVE = "/api/auth/organization/set-active";

/** The HTTP surface: better-auth under /api/auth, the discovery documents at the root, and our guards around both. */
export const buildRoutes = (auth: Auth, cfg: ResolvedConfig, limits: Limits): Hono => {
  const app = new Hono();

  // Discovery documents live at the root as well as under /api/auth, so clients find them from the resource URL.
  app.all("/.well-known/*", (c) => {
    const url = new URL(c.req.url);
    const server = url.pathname.startsWith("/.well-known/oauth-authorization-server");
    if (server) url.pathname = "/api/auth/.well-known/oauth-authorization-server";
    // Copy method and headers, not the Request itself: `c.req.raw` is a lazy Request from @hono/node-server, and
    // undici in Node 26.13+ reads `duplex` off an init dictionary through its getter, which throws on that object.
    // Discovery documents are read-only, so no body is forwarded.
    return auth.handler(new Request(url, { method: c.req.raw.method, headers: c.req.raw.headers }));
  });

  app.all("/api/auth/*", async (c) => {
    const req = c.req.raw;
    const path = new URL(req.url).pathname;
    const refused = checkOrigin(req, cfg.baseUrl);
    if (refused) return refused;
    if (req.method !== "POST") {
      if (!path.endsWith("/oauth2/authorize")) return mapRejection(await auth.handler(req));
      const badRedirect = await checkRedirect(req, (await auth.$context).adapter as Parameters<typeof checkRedirect>[1]);
      return badRedirect ?? toConsentPage(await mapRejection(await toRedirect(await auth.handler(req))), req.url);
    }

    let email = "";
    if (path === SIGN_UP) {
      const bad = await checkSignUp(req);
      if (bad) return bad;
    }
    if (path === SET_ACTIVE) {
      const bad = await checkSetActive(req, auth);
      if (bad) return bad;
    }
    if (path === SIGN_IN) {
      email = String((await bodyOf(req))?.["email"] ?? "").toLowerCase();
      const wait = await limits.wait("signin", email);
      if (wait !== null) return tooMany(wait);
    }
    if (path === REGISTER) {
      const wait = await limits.wait("register", addressOf(c, cfg.trustProxy));
      if (wait !== null) return tooMany(wait);
      await limits.record("register", addressOf(c, cfg.trustProxy));
    }

    const res = await auth.handler(path === REGISTER ? await labelNativeClient(req) : req);
    if (path === SIGN_IN && res.status === 401) await limits.record("signin", email);
    return mapRejection(res);
  });

  // The pages call the routes above, so they are mounted last and handed this app to call.
  app.route("/", buildPages({ auth, cfg, call: (req) => Promise.resolve(app.fetch(req)) }));
  return app;
};
