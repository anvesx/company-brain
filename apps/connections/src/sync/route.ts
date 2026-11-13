import type { Hono } from "hono";
import type { Deps } from "../deps.js";
import type { Env } from "../http/guard/auth.js";
import { syncAccount } from "./account.js";

/** Adds `POST /:id/sync` (Sync now) to the accounts router. Owner only. The background jobs run the same `syncAccount`. */
export function syncRoute(r: Hono<Env>, d: Deps): void {
  r.post("/:id/sync", async (c) => {
    const caller = c.get("caller");
    if (!d.sync) return c.json({ error: "sync is not configured" }, 501);
    const cur = d.store.listVisible(caller).find((a) => a.id === c.req.param("id"));
    if (!cur) return c.json({ error: "not found" }, 404);
    if (cur.owner !== caller.user) return c.json({ error: "only the owner can sync this account" }, 403);
    const body = (await c.req.json().catch(() => undefined)) as { repo?: unknown } | undefined;
    const out = await syncAccount(d, cur.tenant, cur.id, typeof body?.repo === "string" ? body.repo : undefined);
    if (out.kind === "done") return c.json(out.report);
    if (out.kind === "bad") return c.json({ error: out.error }, 400);
    if (out.kind === "failed") return c.json({ error: "source sync failed", code: out.code }, 502);
    return c.json({ error: "account needs re-authorisation" }, 409);
  });
}
