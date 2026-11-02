import { generateCodeVerifier, generateState } from "arctic";
import { Hono } from "hono";
import { checkZones } from "../accounts/widen.js";
import type { Deps } from "../deps.js";
import { type Env, requireCaller } from "../http/auth.js";
import { parseStart } from "../http/validate.js";
import { authorizeURL, credentialOf, exchange } from "./flow.js";
import { createPending } from "./pending.js";

/** `/oauth/:provider/start` (bearer) and `/oauth/:provider/callback` (the browser redirect; the caller is the one who started). */
export function oauthRoutes(d: Deps): Hono<Env> {
  const r = new Hono<Env>();
  const pending = createPending(d.now);
  r.get("/:provider/start", requireCaller(d.secret, d.now), (c) => {
    const name = c.req.param("provider");
    const p = d.oauth?.[name];
    if (!p) return c.json({ error: "unknown provider" }, 404);
    const q = parseStart(c.req.query(), name);
    if ("error" in q) return c.json({ error: q.error }, 400);
    const caller = c.get("caller");
    const zones = checkZones({ credential: "oauth", ...q.value, ownerIsAdmin: d.isAdmin(caller) });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    const state = generateState();
    const verifier = generateCodeVerifier();
    pending.put(state, { provider: name, caller, verifier, ...q.value });
    return c.redirect(authorizeURL(p, state, verifier).toString(), 302);
  });
  r.get("/:provider/callback", async (c) => {
    const name = c.req.param("provider");
    const p = d.oauth?.[name];
    const pend = pending.take(c.req.query("state") ?? "");
    if (!p || !pend || pend.provider !== name) return c.json({ error: "unknown or expired state" }, 400);
    const code = c.req.query("code");
    if (c.req.query("error") || !code) return c.json({ error: `provider refused: ${c.req.query("error") ?? "no code"}` }, 400);
    const zones = checkZones({ credential: "oauth", access: pend.access, dataZone: pend.dataZone, ownerIsAdmin: d.isAdmin(pend.caller) });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    try {
      const secret = credentialOf(await exchange(p, code, pend.verifier));
      const a = d.store.create({
        tenant: pend.caller.tenant,
        owner: pend.caller.user,
        provider: p.source,
        label: pend.label,
        kind: "oauth",
        access: pend.access,
        dataZone: pend.dataZone,
        secret,
      });
      return c.json(a, 201);
    } catch {
      return c.json({ error: "token exchange failed" }, 502);
    }
  });
  return r;
}
