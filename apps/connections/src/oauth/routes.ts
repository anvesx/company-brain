import { hasLiveRecheck } from "@anvesx/connectors";
import { generateCodeVerifier, generateState, type OAuth2Tokens } from "arctic";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { checkZones } from "../accounts/rules/widen.js";
import type { Deps } from "../deps.js";
import { type Env, requireCaller } from "../http/guard/auth.js";
import { parseStart } from "../http/guard/validate.js";
import { authorizeURL, exchange, saveAccount } from "./flow.js";
import { appOf, manifestFor, providerFor } from "./providers.js";
import { BIND_TTL, bindCookie, bindingHolds, bindValue, isSecure } from "./state/binding.js";
import { createPending } from "./state/pending.js";

/** `/oauth/:provider/start` (bearer) and `/oauth/:provider/callback` (the browser redirect; the caller is the one who started, proved by the `oauth_bind` cookie). */
export function oauthRoutes(d: Deps): Hono<Env> {
  const r = new Hono<Env>();
  const pending = createPending(d.now);
  r.get("/:provider/start", requireCaller(d.secret, d.now, d.session), (c) => {
    const name = c.req.param("provider");
    const caller = c.get("caller");
    const m = manifestFor(d.catalog, name, caller.tenant);
    const p = m && providerFor(d.oauth, m);
    if (!m || !p) return c.json({ error: "unknown provider" }, 404);
    const q = parseStart(c.req.query(), name);
    if ("error" in q) return c.json({ error: q.error }, 400);
    const zones = checkZones({ credential: "oauth", ...q.value, ownerIsAdmin: d.isAdmin(caller), liveRecheck: hasLiveRecheck(m) });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    const state = generateState();
    const verifier = generateCodeVerifier();
    pending.put(state, { provider: name, caller, verifier, ...q.value });
    const secure = isSecure(c.req.url, c.req.header("x-forwarded-proto"));
    setCookie(c, bindCookie(secure), bindValue(d.secret, state, caller), { httpOnly: true, sameSite: "Lax", secure, path: "/", maxAge: BIND_TTL });
    return c.redirect(authorizeURL(p, state, verifier).toString(), 302);
  });
  r.get("/:provider/callback", async (c) => {
    const name = c.req.param("provider");
    const state = c.req.query("state") ?? "";
    const pend = pending.take(state);
    const ckName = bindCookie(isSecure(c.req.url, c.req.header("x-forwarded-proto")));
    const bound = getCookie(c, ckName);
    deleteCookie(c, ckName, { path: "/", secure: ckName.startsWith("__Host-") });
    if (pend && !bindingHolds(d.secret, bound, state, pend.caller)) return c.json({ error: "sign-in was not started in this browser" }, 400);
    const m = pend && manifestFor(d.catalog, pend.provider, pend.caller.tenant);
    const p = m && providerFor(d.oauth, m);
    if (!m || !p || !pend || (pend.provider !== name && appOf(m) !== name)) return c.json({ error: "unknown or expired state" }, 400);
    const code = c.req.query("code");
    if (c.req.query("error") || !code) return c.json({ error: `provider refused: ${c.req.query("error") ?? "no code"}` }, 400);
    const zones = checkZones({
      credential: "oauth",
      access: pend.access,
      dataZone: pend.dataZone,
      ownerIsAdmin: d.isAdmin(pend.caller),
      liveRecheck: hasLiveRecheck(m),
    });
    if (!zones.ok) return c.json({ error: zones.reason }, 403);
    let tokens: OAuth2Tokens;
    try {
      tokens = await exchange(p, code, pend.verifier);
    } catch {
      return c.json({ error: "token exchange failed" }, 502);
    }
    try {
      const saved = await saveAccount(d, pend, p, tokens);
      await d.jobs?.requestSync(saved.account.tenant, saved.account.id, "connect");
      return c.json(saved.account, saved.created ? 201 : 200);
    } catch (e) {
      console.error("oauth callback: could not store the account", e); // the provider answered; our own store failed, which is not a token problem
      return c.json({ error: "could not store the account" }, 500);
    }
  });
  return r;
}
