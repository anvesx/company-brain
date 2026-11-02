import { Hono } from "hono";
import { checkZones } from "../accounts/widen.js";
import type { Deps } from "../deps.js";
import { type Env, requireCaller } from "./auth.js";
import { parseNew, parsePatch } from "./validate.js";

const json = async (req: Request): Promise<unknown> => req.json().catch(() => undefined);

/** `/accounts` routes. The credential goes in on POST and is never returned. */
export function accountsRoutes(d: Deps): Hono<Env> {
  const r = new Hono<Env>();
  r.use("*", requireCaller(d.secret, d.now));
  r.get("/", (c) => c.json({ accounts: d.store.listVisible(c.get("caller")) }));
  r.post("/", async (c) => {
    const caller = c.get("caller");
    const p = parseNew(await json(c.req.raw));
    if ("error" in p) return c.json({ error: p.error }, 400);
    const { token, ...a } = p.value;
    const zones = checkZones({ credential: a.kind, access: a.access, dataZone: a.dataZone, ownerIsAdmin: d.isAdmin(caller) });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    return c.json(d.store.create({ ...a, tenant: caller.tenant, owner: caller.user, secret: token }), 201);
  });
  r.patch("/:id", async (c) => {
    const caller = c.get("caller");
    const cur = d.store.listVisible(caller).find((a) => a.id === c.req.param("id"));
    if (!cur) return c.json({ error: "not found" }, 404);
    if (cur.owner !== caller.user) return c.json({ error: "only the owner can change this account" }, 403);
    const p = parsePatch(await json(c.req.raw));
    if ("error" in p) return c.json({ error: p.error }, 400);
    const next = { access: p.value.access ?? cur.access, dataZone: p.value.dataZone ?? cur.dataZone };
    const zones = checkZones({ credential: cur.kind, ...next, ownerIsAdmin: d.isAdmin(caller) });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    return c.json(d.store.update(cur.id, p.value));
  });
  r.delete("/:id", (c) => {
    const caller = c.get("caller");
    const cur = d.store.listVisible(caller).find((a) => a.id === c.req.param("id"));
    if (!cur) return c.json({ error: "not found" }, 404);
    if (cur.owner !== caller.user) return c.json({ error: "only the owner can disconnect this account" }, 403);
    d.store.remove(cur.id);
    return c.body(null, 204);
  });
  return r;
}
