import { createBuiltinRegistry, type Registry } from "@anvesx/connectors";
import { Hono } from "hono";
import { catalogRoutes } from "../catalog/routes.js";
import type { Deps } from "../deps.js";
import type { Login } from "../login/identity.js";
import { loginRoutes } from "../login/routes.js";
import { oauthRoutes } from "../oauth/routes.js";
import { oauthUi } from "../ui/oauth-ui.js";
import { uiRoutes } from "../ui/routes.js";
import { accountsRoutes } from "./accounts-routes.js";

export type { Deps };
/** `Deps` with the catalog optional: absent means the built-in apps only. */
export type AppDeps = Omit<Deps, "catalog"> & { catalog?: Registry };
/**
 * `uiRedirect`: where the OAuth callback sends the browser (`/` for the bundled page). Unset keeps the json 201.
 * `login`: Google sign-in. With it the page is served to a signed-in browser and `/` sends everyone else to `/sign-in`. Without it there is no page, only the bearer API.
 */
export type AppOptions = { uiRedirect?: string | undefined; login?: Login | undefined };

/** The `/v1` API and the page at `/`. Callers come from the `user:tenant:exp:hmac` bearer or, with `login`, the Google session cookie. */
export function createApp(given: AppDeps, opts: AppOptions = {}): Hono {
  const { login } = opts;
  const d: Deps = { ...given, catalog: given.catalog ?? createBuiltinRegistry(), ...(login && { session: login.session }) };
  const app = new Hono();
  app.use("/", async (c, next) => {
    if (!login) return c.json({ error: "not found" }, 404);
    return (await login.session(c.req.raw.headers)) ? next() : c.redirect("/sign-in", 302);
  });
  if (login) app.route("/", loginRoutes(login, d));
  app.route("/", uiRoutes());
  app.route("/v1/accounts", accountsRoutes(d));
  app.route("/v1/catalog", catalogRoutes(d));
  app.route("/v1/oauth", oauthUi(oauthRoutes(d), opts.uiRedirect));
  return app;
}
