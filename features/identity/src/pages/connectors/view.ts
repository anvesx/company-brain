import { esc, hidden } from "../layout.js";

export interface Tile {
  id: string;
  name: string;
  description: string;
  configured: boolean;
}

export interface LinkedAccount {
  /** The account row id, the one the unlink post names. */
  id: string;
  providerId: string;
  label: string | null;
  createdAt: Date | number | string;
  status: string;
}

const button = (action: string, csrf: string, text: string): string =>
  `<form method="post" action="${esc(action)}">${hidden({ csrf })}<button type="submit">${text}</button></form>`;

/** A provider that is not set up is greyed out, says so, and has no form to post. */
const tileItem = (t: Tile, csrf: string): string =>
  `<li data-provider="${esc(t.id)}"${t.configured ? "" : ' aria-disabled="true"'}><strong>${esc(t.name)}</strong> ${esc(t.description)} ${
    t.configured ? button(`/connections/link/${esc(t.id)}`, csrf, "Connect") : "<em>not configured</em>"
  }</li>`;

/** One linked account: who, since when, how it stands. A stale one offers a new sign-in on the same account. */
const accountItem = (a: LinkedAccount, name: string, csrf: string): string =>
  `<li data-account="${esc(a.id)}"><strong>${esc(name)}</strong> ${esc(a.label ?? "")} <time datetime="${new Date(a.createdAt).toISOString()}">${new Date(a.createdAt).toISOString().slice(0, 10)}</time> ${esc(a.status)}
${a.status === "needs-auth" ? button(`/connections/link/${esc(a.providerId)}`, csrf, "Sign in again") : ""}${button(`/connections/unlink/${esc(a.id)}`, csrf, "Disconnect")}</li>`;

/** The connector tiles, then the accounts this person has linked (only theirs). Empty when no connector is set up. */
export const connectorsView = (tiles: Tile[], accounts: LinkedAccount[], csrf: string): string => {
  if (!tiles.length) return "";
  const named = (id: string) => tiles.find((t) => t.id === id)?.name ?? id;
  const linked = accounts.length ? `<h3>Linked accounts</h3><ul>${accounts.map((a) => accountItem(a, named(a.providerId), csrf)).join("")}</ul>` : "";
  return `<section aria-label="Connectors"><h2>Connectors</h2><ul>${tiles.map((t) => tileItem(t, csrf)).join("")}</ul>${linked}</section>`;
};
