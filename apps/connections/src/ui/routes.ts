import { type Context, Hono } from "hono";
import type { Deps } from "../deps.js";
import type { Login } from "../login/identity.js";
import { type PageEnv, pageGuard, policy } from "./guard.js";
import { directory, entryFor } from "./model/directory.js";
import { connected, findRow } from "./model/rows.js";
import { AccountPage } from "./pages/account.js";
import { ConnectPage } from "./pages/connect.js";
import { ConnectionsPage } from "./pages/connections.js";
import { codeOf, noteOf } from "./shell/notes.js";

/** Server-rendered pages. Each action posts a form, calls the same `/v1` route an API client would, and redirects back with a note. */
export function uiRoutes(d: Deps, api: Hono, login: Login): Hono<PageEnv> {
  const r = new Hono<PageEnv>();
  for (const path of ["/", "/connect/*", "/accounts/*", "/sign-out"]) r.use(path, pageGuard(login.session));
  const go = (c: Context, path: string, key: "notice" | "error", text: string) => c.redirect(`${path}?${new URLSearchParams({ [key]: text })}`, 303);
  const call = (c: Context, method: string, path: string, body?: object) =>
    api.request(path, {
      method,
      headers: {
        "content-type": "application/json",
        ...Object.fromEntries(["cookie", "origin", "sec-fetch-site"].flatMap((h) => (c.req.header(h) ? [[h, c.req.header(h)]] : []))),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
  const act = (c: Context, res: Response, back: string, ok: string, okPath = back) =>
    res.ok ? go(c, okPath, "notice", ok) : go(c, back, "error", codeOf(res.status));
  const mine = (c: Context) => ({ caller: c.get("caller"), q: c.req.query() });

  r.get("/", (c) => {
    const { caller, q } = mine(c);
    const page = ConnectionsPage({ email: caller.user, rows: connected(d, caller), groups: directory(d, caller.tenant), now: d.now() * 1000, note: noteOf(q) });
    return c.html(page);
  });
  r.get("/connect/:provider", (c) => {
    const { caller } = mine(c);
    const id = c.req.param("provider");
    const entry = entryFor(d, id, caller.tenant);
    if (!entry || entry.reason) return go(c, "/", "error", entry ? "unavailable" : "not-found");
    c.header("content-security-policy", policy(entry.origin));
    return c.html(ConnectPage({ email: caller.user, entry, startUrl: `/v1/oauth/${encodeURIComponent(id)}/start` }));
  });
  r.get("/accounts/:id", (c) => {
    const { caller, q } = mine(c);
    const row = findRow(d, caller, c.req.param("id"));
    if (!row) return go(c, "/", "error", "not-found");
    const needsRepo = d.catalog.get(row.account.provider, row.account.tenant)?.needsRepo === true;
    c.header("content-security-policy", policy(entryFor(d, row.account.provider, caller.tenant)?.origin)); // Reconnect is a form that hops to the provider
    return c.html(AccountPage({ email: caller.user, row, now: d.now() * 1000, needsRepo, note: noteOf(q) }));
  });
  r.post("/accounts/:id/sync", async (c) => {
    const id = c.req.param("id");
    return act(c, await call(c, "POST", `/v1/accounts/${id}/sync`, {}), `/accounts/${id}`, "synced");
  });
  r.post("/accounts/:id/repo", async (c) => {
    const id = c.req.param("id");
    const repo = String((await c.req.parseBody()).repo ?? "").trim() || null; // an empty value clears it
    return act(c, await call(c, "PATCH", `/v1/accounts/${id}`, { repo }), `/accounts/${id}`, repo ? "saved" : "cleared");
  });
  r.post("/accounts/:id/disconnect", async (c) => {
    const id = c.req.param("id");
    return act(c, await call(c, "DELETE", `/v1/accounts/${id}`), `/accounts/${id}`, "disconnected", "/");
  });
  r.post("/sign-out", async (c) => {
    const out = await login.fetch(
      new Request(new URL("/api/auth/sign-out", login.session.origin), {
        method: "POST",
        headers: { cookie: c.req.header("cookie") ?? "", origin: login.session.origin, "content-type": "application/json" },
        body: "{}",
      }),
    );
    const res = c.redirect("/sign-in", 303);
    for (const cookie of out.headers.getSetCookie()) res.headers.append("set-cookie", cookie);
    return res;
  });
  return r;
}
