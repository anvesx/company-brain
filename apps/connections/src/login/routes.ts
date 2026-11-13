import { Hono } from "hono";
import type { Deps } from "../deps.js";
import { type Env, requireCaller } from "../http/guard/auth.js";
import type { Login } from "./identity.js";

/** The sign-in pages and routes (served by the identity app, with its own security headers), and `GET /v1/me` for the page. */
export function loginRoutes(login: Login, d: Deps): Hono<Env> {
  const r = new Hono<Env>();
  for (const path of ["/sign-in", "/sign-in/google", "/api/auth/*"]) r.all(path, (c) => login.fetch(c.req.raw));
  r.get("/v1/me", requireCaller(d.secret, d.now, login.session), (c) => c.json(c.get("caller")));
  return r;
}
