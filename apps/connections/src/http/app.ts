import { Hono } from "hono";
import { accountsRoutes, type Deps } from "./accounts-routes.js";

export type { Deps };

/** The `/v1` API. Callers come from the `user:tenant:exp:hmac` bearer. */
export function createApp(d: Deps): Hono {
  const app = new Hono();
  app.route("/v1/accounts", accountsRoutes(d));
  return app;
}
