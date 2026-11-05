import { hasLiveRecheck } from "@anvesx/connectors";
import { Hono } from "hono";
import { narrows } from "../accounts/rules/narrow.js";
import { checkZones } from "../accounts/rules/widen.js";
import { kindsOf } from "../catalog/kinds.js";
import type { Deps } from "../deps.js";
import { closeAccountEdges, disconnect } from "../sync/data/disconnect.js";
import { syncRoute } from "../sync/route.js";
import { rewriteTokens } from "../tokens/rewrite.js";
import { type Env, requireCaller } from "./guard/auth.js";
import { parseNew, parsePatch } from "./guard/validate.js";

const json = async (req: Request): Promise<unknown> => req.json().catch(() => undefined);

/** `/accounts` routes. The credential goes in on POST and is never returned. */
export function accountsRoutes(d: Deps): Hono<Env> {
  const r = new Hono<Env>();
  r.use("*", requireCaller(d.secret, d.now));
  r.get("/", (c) => c.json({ accounts: d.store.listVisible(c.get("caller")) }));
  r.post("/", async (c) => {
    const caller = c.get("caller");
    const apps = d.catalog.list(caller.tenant).map(({ manifest: m }) => ({ id: m.id, kinds: kindsOf(m), needsRepo: m.needsRepo === true }));
    const p = parseNew(await json(c.req.raw), apps);
    if ("error" in p) return c.json({ error: p.error }, 400);
    const { token, ...a } = p.value;
    const manifest = d.catalog.get(a.provider, caller.tenant);
    const liveRecheck = manifest ? hasLiveRecheck(manifest) : false; // no manifest: fail closed
    const zones = checkZones({ credential: a.kind, access: a.access, dataZone: a.dataZone, ownerIsAdmin: d.isAdmin(caller), liveRecheck });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    const made = d.store.create({ ...a, tenant: caller.tenant, owner: caller.user, secret: token });
    rewriteTokens(d);
    return c.json(made, 201);
  });
  r.patch("/:id", async (c) => {
    const caller = c.get("caller");
    const cur = d.store.listVisible(caller).find((a) => a.id === c.req.param("id"));
    if (!cur) return c.json({ error: "not found" }, 404);
    if (cur.owner !== caller.user) return c.json({ error: "only the owner can change this account" }, 403);
    const p = parsePatch(await json(c.req.raw));
    if ("error" in p) return c.json({ error: p.error }, 400);
    const manifest = d.catalog.get(cur.provider, cur.tenant);
    if (p.value.repo && !manifest?.needsRepo) return c.json({ error: "only a github account has a repo" }, 400);
    const next = { access: p.value.access ?? cur.access, dataZone: p.value.dataZone ?? cur.dataZone };
    const liveRecheck = manifest ? hasLiveRecheck(manifest) : false; // no manifest: fail closed
    const zones = checkZones({ credential: cur.kind, ...next, ownerIsAdmin: d.isAdmin(caller), liveRecheck });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    // Edges written at the wider zone must not outlive it; the next sync rewrites them at the new zone.
    if (d.sync && narrows(cur.dataZone, next.dataZone)) closeAccountEdges(d.sync.graph, cur, d.now() * 1000);
    const changed = d.store.update(cur.tenant, cur.id, p.value);
    rewriteTokens(d);
    return c.json(changed);
  });
  r.delete("/:id", (c) => {
    const caller = c.get("caller");
    const cur = d.store.listVisible(caller).find((a) => a.id === c.req.param("id"));
    if (!cur) return c.json({ error: "not found" }, 404);
    if (cur.owner !== caller.user) return c.json({ error: "only the owner can disconnect this account" }, 403);
    disconnect(d, cur);
    return c.body(null, 204);
  });
  syncRoute(r, d);
  return r;
}
