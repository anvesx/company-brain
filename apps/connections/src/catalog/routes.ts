import { customManifest, hasLiveRecheck, type Listed } from "@brain/connectors";
import { Hono } from "hono";
import type { Deps } from "../deps.js";
import { type Env, requireCaller } from "../http/auth.js";
import { kindsOf } from "./kinds.js";
import { parseCustom } from "./parse.js";

/** One catalog row as the page and API see it. Sign-in URLs and scopes stay server side. */
export const view = ({ manifest: m, tenant }: Listed) => ({
  id: m.id,
  name: m.name,
  auth: m.auth.kind,
  kinds: kindsOf(m),
  defaultZone: m.defaultZone,
  custom: tenant !== undefined,
  liveRecheck: hasLiveRecheck(m),
  needsRepo: m.needsRepo === true,
});

/** `GET /catalog` lists what the caller's tenant can connect; `POST /catalog` (tenant admin) adds a custom connector for that tenant only. */
export function catalogRoutes(d: Deps): Hono<Env> {
  const r = new Hono<Env>();
  r.use("*", requireCaller(d.secret, d.now));
  r.get("/", (c) => c.json({ providers: d.catalog.list(c.get("caller").tenant).map(view) }));
  r.post("/", async (c) => {
    const caller = c.get("caller");
    if (!d.isAdmin(caller)) return c.json({ error: "only a tenant admin can add a connector" }, 403);
    const p = parseCustom(await c.req.json().catch(() => undefined));
    if ("error" in p) return c.json({ error: p.error }, 400);
    const manifest = customManifest(p.value);
    try {
      d.catalog.register(manifest, caller.tenant);
    } catch (e) {
      return c.json({ error: (e as Error).message }, 409);
    }
    return c.json(view({ manifest, tenant: caller.tenant }), 201);
  });
  return r;
}
