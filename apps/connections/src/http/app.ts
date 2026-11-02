import { Hono } from "hono";
import type { Deps } from "../deps.js";
import { oauthRoutes } from "../oauth/routes.js";
import { oauthUi } from "../ui/oauth-ui.js";
import { uiRoutes } from "../ui/routes.js";
import { accountsRoutes } from "./accounts-routes.js";

export type { Deps };
/** `uiRedirect`: where the OAuth callback sends the browser (`/` for the bundled page). Unset keeps the json 201. */
export type AppOptions = { uiRedirect?: string | undefined };

/** The `/v1` API and the page at `/`. Callers come from the `user:tenant:exp:hmac` bearer. */
export function createApp(d: Deps, opts: AppOptions = {}): Hono {
  const app = new Hono();
  app.route("/", uiRoutes());
  app.route("/v1/accounts", accountsRoutes(d));
  app.route("/v1/oauth", oauthUi(oauthRoutes(d), opts.uiRedirect));
  return app;
}
