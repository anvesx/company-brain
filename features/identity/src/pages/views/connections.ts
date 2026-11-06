import type { IdentityConfig } from "../../config.js";
import { connectorsView, type LinkedAccount, type Tile } from "../connectors/view.js";
import { esc, hidden, page } from "../layout.js";
import { COPY_SCRIPT, guide } from "./guide.js";

export interface ConnectionsData {
  organization: string;
  csrf: string;
  resource: string;
  /** Name each client files the server under, and the install templates (from config). */
  serverName: string;
  templates: Parameters<typeof guide>[2];
  catalog: NonNullable<IdentityConfig["catalog"]>;
  connections: Awaited<ReturnType<NonNullable<IdentityConfig["connections"]>>>;
  /** Linkable connectors and this person's linked accounts. Empty when none are configured. */
  tiles?: Tile[];
  accounts?: LinkedAccount[];
}

const section = (label: string, inner: string): string => `<section aria-label="${label}"><h2>${label}</h2>${inner}</section>`;

const items = (rows: { name: string; text: string }[]): string =>
  `<ul>${rows.map((r) => `<li><strong>${esc(r.name)}</strong> ${esc(r.text)}</li>`).join("")}</ul>`;

/** The signed-in home: the organization, its connections (or the catalog when there are none), then the install guide. */
export const connectionsView = (d: ConnectionsData): string => {
  const tiles = d.catalog.length ? items(d.catalog.map((c) => ({ name: c.name, text: c.description }))) : "<p>No connectors are available yet.</p>";
  const first = d.connections.length ? section("Connections", items(d.connections.map((c) => ({ name: c.name, text: c.detail })))) : section("Catalog", tiles);
  const found = connectorsView(d.tiles ?? [], d.accounts ?? [], d.csrf);
  const connectors = found ? `${found}\n` : "";
  return page(
    "Connections",
    `<p>Organization: <strong>${esc(d.organization)}</strong> <a href="/picker">Switch</a> <a href="/account">Account</a></p>
<form method="post" action="/sign-out">${hidden({ csrf: d.csrf })}<button type="submit">Sign out</button></form>
${first}
${connectors}${guide(d.resource, d.serverName, d.templates)}`,
    COPY_SCRIPT,
  );
};
