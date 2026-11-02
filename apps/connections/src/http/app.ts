import { Hono } from "hono";
import type { Deps } from "../deps.js";
import { oauthRoutes } from "../oauth/routes.js";
import { accountsRoutes } from "./accounts-routes.js";

export type { Deps };

/** The `/v1` API. Callers come from the `user:tenant:exp:hmac` bearer. */
export function createApp(d: Deps): Hono {
  const app = new Hono();
  app.route("/v1/accounts", accountsRoutes(d));
  app.route("/v1/oauth", oauthRoutes(d));
  return app;
}
