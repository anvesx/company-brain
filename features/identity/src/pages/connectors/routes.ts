import type { AuthContext } from "better-auth";
import type { Hono } from "hono";
import { catalogTiles } from "../../connectors/catalog.js";
import { IdentityError } from "../../errors.js";
import { readSession } from "../../guard/session.js";
import { api, csrfOk, type Deps, oops, readForm, redirect } from "../actions.js";
import { guardedPost } from "../forms.js";
import type { LinkedAccount, Tile } from "./view.js";

/** The tiles, and the accounts this person linked to a provider in the catalog (never the password or Google sign-in rows). */
export const connectorData = async (d: Deps, db: AuthContext["adapter"], userId: string): Promise<{ tiles: Tile[]; accounts: LinkedAccount[] }> => {
  const tiles = catalogTiles(d.cfg.providers ?? [], d.cfg.env);
  const rows = await db.findMany<LinkedAccount>({
    model: "account",
    where: [{ field: "userId", value: userId }],
    sortBy: { field: "createdAt", direction: "asc" },
  });
  return { tiles, accounts: rows.filter((row) => tiles.some((t) => t.id === row.providerId)) };
};

const notFound = (what: string): Response => oops(new IdentityError("BAD_INPUT", `${what} was not found.`), 404);

/** `POST /connections/link/:id` starts the OAuth flow, `POST /connections/unlink/:accountId` removes an account. Both need a csrf field. */
export const mountConnectorRoutes = (app: Hono, d: Deps, db: () => Promise<AuthContext["adapter"]>): void => {
  app.post("/connections/link/:id", async (c) => {
    const req = c.req.raw;
    if (!(await readSession(d.auth, req.headers))) return redirect("/sign-in");
    const form = await readForm(d, req);
    if (form instanceof Response) return form;
    if (!(await csrfOk(d, req, form))) return oops(new IdentityError("BAD_INPUT", "This form has expired. Go back and try again."), 403);
    const tile = catalogTiles(d.cfg.providers ?? [], d.cfg.env).find((t) => t.id === c.req.param("id"));
    if (!tile?.configured) return notFound("That connector");
    const res = await api(d, req, "link-social", { provider: tile.id, callbackURL: "/connections", errorCallbackURL: "/connections" });
    const { url } = (await res.json().catch(() => ({}))) as { url?: string };
    return res.ok && url ? redirect(url, res) : oops(new IdentityError("BAD_INPUT", "The connector could not be reached. Try again."), 502);
  });

  guardedPost(app, d)("/connections/unlink/:accountId", async (req) => {
    const view = await readSession(d.auth, req.headers);
    const id = new URL(req.url).pathname.split("/").pop() ?? "";
    const { accounts } = await connectorData(d, await db(), view?.userId ?? "");
    const row = accounts.find((a) => a.id === id);
    if (!row) return notFound("That account");
    const res = await api(d, req, "unlink-account", { accountId: row.id });
    return res.ok
      ? new Response(null, { status: 303, headers: { location: "/connections" } })
      : oops(new IdentityError("BAD_INPUT", "The account could not be removed."), 400);
  });
};
