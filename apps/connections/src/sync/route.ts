import type { Hono } from "hono";
import type { Deps } from "../deps.js";
import type { Env } from "../http/guard/auth.js";
import { providerFor } from "../oauth/providers.js";
import { refreshAccount } from "../oauth/state/refresh.js";
import { accessTokenOf } from "../tokens/access-token.js";
import { rewriteTokens } from "../tokens/rewrite.js";
import { runAccountSync } from "./run.js";

/** Adds `POST /:id/sync` to the accounts router. Owner only; an oauth account is refreshed first. */
export function syncRoute(r: Hono<Env>, d: Deps): void {
  r.post("/:id/sync", async (c) => {
    const caller = c.get("caller");
    if (!d.sync) return c.json({ error: "sync is not configured" }, 501);
    const cur = d.store.listVisible(caller).find((a) => a.id === c.req.param("id"));
    if (!cur) return c.json({ error: "not found" }, 404);
    if (cur.owner !== caller.user) return c.json({ error: "only the owner can sync this account" }, 403);
    const body = (await c.req.json().catch(() => undefined)) as { repo?: unknown } | undefined;
    const repo = typeof body?.repo === "string" ? body.repo : (cur.repo ?? undefined);
    if (cur.status !== "active") return c.json({ error: "account needs re-authorisation" }, 409);
    const manifest = d.catalog.get(cur.provider, cur.tenant);
    const idp = manifest && providerFor(d.oauth, manifest);
    if (cur.kind === "oauth" && idp && (await refreshAccount(d.store, idp, cur.id)) !== "unsupported") {
      rewriteTokens(d);
      if (d.store.get(cur.id)?.status !== "active") return c.json({ error: "account needs re-authorisation" }, 409);
    }
    const token = accessTokenOf(cur.kind, d.store.credential(cur.id) ?? "");
    if (token === undefined) return c.json({ error: "account has no usable credential" }, 409);
    try {
      const r = await runAccountSync(d.sync, cur, token, repo, d.now() * 1000, d.catalog);
      if ("error" in r) return c.json(r, 400);
      d.store.setLastSync(cur.id, d.now() * 1000);
      return c.json(r);
    } catch (e) {
      return c.json({ error: "source sync failed", code: (e as { code?: string }).code ?? "UNKNOWN" }, 502);
    }
  });
}
