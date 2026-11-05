import type { Hono } from "hono";
import { IdentityError } from "../../errors.js";
import { activeTenant } from "../../guard/session.js";
import { type Deps, html } from "../actions.js";
import { connectionsView } from "../views/connections.js";
import type { signedInPages } from "./guard.js";

/** `/connections`: the organization, its connections (or the catalog), then the install guide. */
export const mountConnections = (app: Hono, d: Deps, pages: ReturnType<typeof signedInPages>): void => {
  app.get(
    "/connections",
    pages.signedIn(async (_req, view, token) => {
      const db = await pages.adapter();
      const tenant = await activeTenant(db, view);
      if (!tenant) throw new IdentityError("NO_ORGANIZATION", "You do not belong to an organization yet.");
      const org = await db.findOne<{ name: string }>({ model: "organization", where: [{ field: "id", value: tenant }] });
      const connections = (await d.cfg.connections?.(tenant)) ?? [];
      const { resource, serverName, templates, catalog } = d.cfg;
      return html(connectionsView({ organization: org?.name ?? "", csrf: token, resource, serverName, templates, catalog: catalog ?? [], connections }));
    }),
  );
};
